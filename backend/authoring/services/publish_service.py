from __future__ import annotations
from typing import Dict, List
from django.db import transaction
from django.utils import timezone
from authoring.models import Module, Step, StepAsset, PublishedModule
from django.conf import settings
from django.utils.text import slugify
import json
import os

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
                "priority": sa.priority,
            })
            asset_refs[str(asset.id)] = {
                "id": str(asset.id),
                "type": asset.type,
                "mimeType": asset.mime_type,
                "url": asset.file.url if asset.file else None,
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
        
        # Add model reference if step has assets
        if assets:
            step_data["model"] = {
                "assetId": str(assets[0]["id"]),
                "assetType": assets[0]["type"],
            }
        
        # Add animation if specified
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
                                "alignItems": "flex-start",
                                "padding": "2",
                                "width": "50",
                                "display": "flex",
                                "flexDirection": "column",
                                "backgroundColor": "#09090b",
                                "borderColor": "#27272a",
                                "borderWidth": "0.15",
                                "borderRadius": 3
                            }
                        },
                        "heading": {
                            "content": {
                                "fontSize": "4",
                                "fontWeight": "medium",
                                "color": "#fafafa",
                                "textAlign": "left"
                            }
                        },
                        "sub-heading": {
                            "content": {
                                "fontSize": "2",
                                "color": "#a1a1aa",
                                "textAlign": "left",
                                "marginTop": "0.3"
                            }
                        },
                        "button-row": {
                            "content": {"gap": "2"}
                        },
                        "__id__back-button": {
                            "content": {
                                "width": "100%",
                                "padding": "1.5",
                                "marginTop": "2",
                                "backgroundColor": "#fafafa",
                                "color": "#09090b",
                                "borderRadius": 1.5,
                                "borderWidth": "0.1",
                                "borderColor": "#e4e4e7",
                                "fontSize": "2.5",
                                "fontWeight": "medium",
                                "textAlign": "center",
                                "cursor": "pointer"
                            }
                        },
                        "__id__next-button": {
                            "content": {
                                "width": "100%",
                                "padding": "1.5",
                                "marginTop": "2",
                                "backgroundColor": "#fafafa",
                                "color": "#09090b",
                                "borderRadius": 1.5,
                                "borderWidth": "0.1",
                                "borderColor": "#e4e4e7",
                                "fontSize": "2.5",
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
        except Exception:
            # Fail-safe: publishing itself shouldn't fail because of filesystem issues.
            # Errors are logged at higher levels; swallow here to avoid breaking transaction.
            pass
        return published
