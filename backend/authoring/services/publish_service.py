from __future__ import annotations
from typing import Dict, List
from django.db import transaction
from django.utils import timezone
from authoring.models import Module, Step, StepAsset, PublishedModule

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
        steps_payload.append({
            "id": str(step.id),
            "title": step.title,
            "body": step.body,
            "required": step.required,
            "orderIndex": step.order_index,
            "assets": assets,
        })

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
        return published
