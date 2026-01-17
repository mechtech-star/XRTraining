from __future__ import annotations
import os
from typing import Set
from django.conf import settings
from django.utils.text import slugify


def prune_published_modules(keep_latest: int = 3, dry_run: bool = False) -> int:
    """Prune published module records, keeping only the most recent N per module.

    Deletes database rows for older PublishedModule entries and removes any
    UI JSON files they authored under MEDIA_ROOT/published_modules that are
    not referenced by the kept publishes.

    Returns number of PublishedModule rows deleted.
    """
    from authoring.models import Module, PublishedModule

    out_dir = os.path.join(settings.MEDIA_ROOT, "published_modules")
    deleted_count = 0

    for module in Module.objects.all():
        pubs = list(PublishedModule.objects.filter(module=module).order_by("-version"))
        if len(pubs) <= keep_latest:
            continue

        kept = pubs[:keep_latest]
        to_delete = pubs[keep_latest:]

        # Build set of filenames referenced by kept publishes
        referenced: Set[str] = set()
        for p in kept:
            payload = getattr(p, "payload", {}) or {}
            for step in payload.get("steps", []):
                ui_url = step.get("uiUrl")
                if ui_url:
                    referenced.add(os.path.basename(ui_url))
            # Also include predicted module filename for safety
            slug = slugify(module.title) or "module"
            predicted = f"{slug}-{module.id}.json"
            referenced.add(predicted)

        # Collect filenames from to-delete payloads, then delete DB rows
        files_to_consider = set()
        for p in to_delete:
            payload = getattr(p, "payload", {}) or {}
            for step in payload.get("steps", []):
                ui_url = step.get("uiUrl")
                if ui_url:
                    files_to_consider.add(os.path.basename(ui_url))
            # module-level filename (best-effort)
            slug = slugify(module.title) or "module"
            files_to_consider.add(f"{slug}-{module.id}.json")

        # Delete DB rows first (or simulate)
        for p in to_delete:
            if not dry_run:
                p.delete()
                deleted_count += 1

        # Remove files on disk that are not referenced by kept publishes
        if os.path.isdir(out_dir):
            for fname in files_to_consider:
                if fname in referenced:
                    continue
                fpath = os.path.join(out_dir, fname)
                try:
                    if os.path.exists(fpath):
                        if not dry_run:
                            os.remove(fpath)
                except Exception:
                    # best-effort cleanup
                    pass

    return deleted_count
