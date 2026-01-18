from __future__ import annotations
from typing import Dict, List
from django.db import transaction
from django.utils import timezone
from authoring.models import Module, Step, StepAsset, PublishedModule
from django.conf import settings
from django.utils.text import slugify
import json
import os

# Optional pruning helper will be invoked if configured in settings
try:
    from authoring.services.prune_service import prune_published_modules
except Exception:
    prune_published_modules = None

SCHEMA_VERSION = 1


def compile_runtime_payload(module: Module) -> Dict:
    steps_qs = module.steps.order_by("order_index").prefetch_related("step_assets__asset")
    steps_payload: List[Dict] = []
    asset_refs = {}
    if not steps_qs.exists():
        raise ValueError("Module must have at least one step before publishing")

    # Normalize ordering to be contiguous starting at 1
    for idx, step in enumerate(steps_qs):
        if step.order_index != idx + 1:
            Step.objects.filter(pk=step.pk).update(order_index=idx + 1)
            step.order_index = idx + 1

    for step in steps_qs:
        assets = []
        for sa in step.step_assets.order_by("priority", "id"):
            asset = sa.asset
            assets.append({
                "id": str(asset.id),
                "type": asset.type,
                "mimeType": asset.mime_type,
                "url": asset.file.url if asset.file else None,
                "originalFilename": asset.original_filename,
                "priority": sa.priority,
                "metadata": sa.metadata,
            })
            asset_refs[str(asset.id)] = {
                "id": str(asset.id),
                "type": asset.type,
                "mimeType": asset.mime_type,
                "url": asset.file.url if asset.file else None,
                "originalFilename": asset.original_filename,
                "metadata": sa.metadata,
            }
        
        # Build data-only runtime payload for this step
        step_data = {
            "id": str(step.id),
            "orderIndex": step.order_index,
            "ui": {
                "template": getattr(step, "ui_template", "content"),
                "data": {
                    "title": step.title,
                    "description": step.body,
                },
                "actions": [],  # Placeholder for future button/interaction actions
            },
            "meta": {
                "required": step.required,
            },
        }
        
        # Add media block if image/video assets with role='side-media' are assigned
        media_assets = [a for a in assets if a.get("type") in ("image", "video") and a.get("metadata", {}).get("role") == "side-media"]
        if media_assets:
            # Use the first side-media asset
            media_asset = media_assets[0]
            media_meta = media_asset.get("metadata", {})
            step_data["media"] = {
                "assetId": media_asset["id"],
                "type": media_asset["type"],
                "url": media_asset.get("url"),
                "poster": media_meta.get("poster"),
                "autoplay": media_meta.get("autoplay", False),
                "loop": media_meta.get("loop", False),
                "caption": media_meta.get("caption"),
            }
        
        # Add models[] for this step (support multiple assets per step)
        # Filter out side-media assets (they go in media block, not models)
        model_assets = [a for a in assets if not (a.get("type") in ("image", "video") and a.get("metadata", {}).get("role") == "side-media")]
        if model_assets:
            models = []
            for a in model_assets:
                model_entry = {
                    "assetId": str(a["id"]),
                    "assetType": a["type"],
                    "url": a.get("url"),
                    "originalFilename": a.get("originalFilename") if a.get("originalFilename") else None,
                }
                # Extract animation from asset metadata if present
                if a.get("metadata") and isinstance(a.get("metadata"), dict):
                    animation = a.get("metadata", {}).get("animation")
                    if animation:
                        model_entry["animation"] = animation
                models.append(model_entry)
            step_data["models"] = models
            # Legacy single-model field for backward compatibility (first asset)
            first_model = {
                "assetId": str(model_assets[0]["id"]),
                "assetType": model_assets[0]["type"],
            }
            if model_assets[0].get("metadata") and isinstance(model_assets[0].get("metadata"), dict):
                animation = model_assets[0].get("metadata", {}).get("animation")
                if animation:
                    first_model["animation"] = animation
            step_data["model"] = first_model

        # Add animation if specified on the step; include as step-level animation
        if step.animation:
            step_data["animation"] = {
                "clip": step.animation,
            }
        
        steps_payload.append(step_data)

    payload = {
        "schemaVersion": SCHEMA_VERSION,
        "moduleId": str(module.id),
        "title": module.title,
        "version": module.version + 1,  # incremented upon publish
        "publishedAt": timezone.now().isoformat(),
        "steps": steps_payload,
        "assets": list(asset_refs.values()),
    }
    return payload


def publish_module(module: Module) -> PublishedModule:
    with transaction.atomic():
        payload = compile_runtime_payload(module)
        next_version = module.version + 1
        published = PublishedModule.objects.create(
            module=module,
            version=next_version,
            schema_version=SCHEMA_VERSION,
            payload=payload,
        )
        module.status = "published"
        module.version = next_version
        module.save(update_fields=["status", "version", "updated_at"])
        # Also persist the payload as a JSON file under MEDIA_ROOT/published_modules
        try:
            out_dir = os.path.join(settings.MEDIA_ROOT, "published_modules")
            os.makedirs(out_dir, exist_ok=True)
            # Use a readable, unique filename: slugified title + module id
            slug = slugify(module.title) or "module"
            # First write per-step UI JSON files and add uiUrl into each step entry
            media_url = getattr(settings, "MEDIA_URL", "/media/")
            media_url = media_url.rstrip("/")
            for step in payload.get("steps", []):
                # Build a UI JSON payload resembling the engine/public/ui/step-N.json format
                ui_json = {
                    "element": {
                        "type": "container",
                        "sourceTag": "div",
                        "children": [
                            {
                                "type": "container",
                                "sourceTag": "div",
                                "children": [
                                    {
                                        "sourceTag": "span",
                                        "type": "custom",
                                        "children": [step.get("ui", {}).get("data", {}).get("title", "")],
                                        "properties": {"class": "heading"},
                                    },
                                    {
                                        "sourceTag": "span",
                                        "type": "custom",
                                        "children": [step.get("ui", {}).get("data", {}).get("description", "")],
                                        "properties": {"class": "sub-heading"},
                                    }
                                ],
                                "properties": {"class": "top-content"},
                            },
                            {
                                "type": "container",
                                "sourceTag": "div",
                                "children": [],
                                "properties": {"style": {"flexGrow": "1", "minHeight": "0"}, "class": "spacer"}
                            },
                            {
                                "type": "container",
                                "sourceTag": "div",
                                "children": [
                                    {
                                        "sourceTag": "button",
                                        "type": "custom",
                                        "children": ["Back"],
                                        "properties": {"id": "back-button"},
                                    },
                                    {
                                        "sourceTag": "button",
                                        "type": "custom",
                                        "children": ["Next"],
                                        "properties": {"id": "next-button"},
                                    }
                                ],
                                "properties": {
                                    "class": "button-row",
                                    "style": {
                                        "width": "100%",
                                        "display": "flex",
                                        "justifyContent": "space-between",
                                        "marginTop": "2"
                                    }
                                },
                            }
                        ],
                        "properties": {"class": "panel-container"},
                    },
                        "classes": {
    "panel-container": {
        "content": {
        "display": "flex",
        "flexDirection": "column",
        "alignItems": "flex-start",
        "justifyContent": "flex-start",

            "gap": "1.5",
            "padding": "1.5",

            "width": "48",
            "minHeight": "32",

            "backgroundColor": "#09090b",
            "borderColor": "#27272a",
            "borderWidth": "0",
            "borderRadius": "2",
            "overflow": "hidden"
        }
    },
    "top-content": {
        "content": {
            "display": "flex",
            "flexDirection": "column",
            "alignItems": "flex-start",
            "justifyContent": "flex-start",
            "gap": "1",
        }
    },

  "heading": {
    "content": {
      "fontSize": "2.5",
      "fontWeight": "medium",
      "color": "#fafafa",
      "textAlign": "left"
    }
  },

  "sub-heading": {
    "content": {
      "fontSize": "1.4",
      "color": "#a1a1aa",
      "textAlign": "left"
    }
  },

  "button-row": {
    "content": {
      "display": "flex",
      "justifyContent": "space-between",
      "alignItems": "center",
      "gap": "1"
    },
    "style": {
      "width": "100%"
    }
  },
    "spacer": {
        "content": {
            "flexGrow": "1",
            "minHeight": "0"
        }
    },

  "__id__back-button": {
    "content": {
      "width": "11",
      "padding": "1.25",

      "backgroundColor": "#fafafa",
      "color": "#09090b",

      "borderRadius": "1.25",
      "borderWidth": "0",
      "borderColor": "#e4e4e7",

      "fontSize": "2.25",
      "fontWeight": "medium",
      "textAlign": "center",
      "cursor": "pointer"
    }
  },

  "__id__next-button": {
    "content": {
      "width": "11",
      "padding": "1.25",

      "backgroundColor": "#fafafa",
      "color": "#09090b",

      "borderRadius": "1.25",
      "borderWidth": "0",
      "borderColor": "#e4e4e7",

      "fontSize": "2.25",
      "fontWeight": "medium",
      "textAlign": "center",
      "cursor": "pointer"
    }
  }
}

                }
                step_filename = f"{slug}-{module.id}-step-{step.get('orderIndex')}.json"
                step_path = os.path.join(out_dir, step_filename)
                with open(step_path, "w", encoding="utf-8") as sf:
                    json.dump(ui_json, sf, ensure_ascii=False, indent=2)

                # Attach a URL consumers can use to fetch the UI JSON directly
                step["uiUrl"] = f"{media_url}/published_modules/{step_filename}"

            # Then write the full module payload as before
            filename = f"{slug}-{module.id}.json"
            file_path = os.path.join(out_dir, filename)
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
            # Expose a URL path on the published object for callers to use (non-persistent attribute)
            published.json_url = f"{media_url}/published_modules/{filename}"
            # Save the updated payload (with uiUrl fields) back to the published object
            published.payload = payload
            published.save(update_fields=["payload"])
            # Clean up orphaned per-step UI JSON files for this module.
            try:
                # Build set of filenames referenced by the new payload
                referenced_fnames = set()
                for step in payload.get("steps", []):
                    ui_url = step.get("uiUrl")
                    if ui_url:
                        referenced_fnames.add(os.path.basename(ui_url))

                # Remove any step files matching the module pattern that are not referenced
                pattern = f"{slug}-{module.id}-step-"
                for fname in os.listdir(out_dir):
                    if not fname.startswith(pattern):
                        continue
                    if fname in referenced_fnames:
                        continue
                    try:
                        os.remove(os.path.join(out_dir, fname))
                    except Exception:
                        # best-effort cleanup; don't break publish
                        pass
            except Exception:
                pass
        except Exception:
            # Fail-safe: publishing itself shouldn't fail because of filesystem issues.
            # Errors are logged at higher levels; swallow here to avoid breaking transaction.
            pass
        # Optionally trigger pruning according to retention policy
        try:
            retention = getattr(settings, "PUBLISHED_MODULE_RETENTION", {}) or {}
            if retention.get("auto_prune") and prune_published_modules:
                keep = int(retention.get("keep_latest", 3))
                # Run pruning in best-effort mode; don't let it break publish
                prune_published_modules(keep_latest=keep)
        except Exception:
            pass
        return published
