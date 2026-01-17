# Published Modules Retention & Pruning — Maintenance Guide

This document describes how we retain and prune `PublishedModule` payloads, how to run pruning safely, and recommended operational practices.

Files & code references
- Prune helper: [backend/authoring/services/prune_service.py](backend/authoring/services/prune_service.py#L1)
- Publish flow (optional prune hook): [backend/authoring/services/publish_service.py](backend/authoring/services/publish_service.py#L1)
- Management command: [backend/authoring/management/commands/prune_published_modules.py](backend/authoring/management/commands/prune_published_modules.py#L1)
- Retention setting: [backend/backend/settings.py](backend/backend/settings.py#L1)

Summary
- Default behavior: we keep published versions forever unless explicitly pruned.
- Default config added: `PUBLISHED_MODULE_RETENTION.keep_latest = 3`, `auto_prune = false`.
- Rationale: automatic deletion is opt-in to avoid breaking runtime clients, losing audit data, or accidental data loss.

Quick operational tasks

- Dry-run (see what would be removed):
```bash
cd backend
python manage.py prune_published_modules --keep-latest 3 --dry-run
```

- Run pruning now (permanently deletes older rows and best-effort UI JSON files):
```bash
cd backend
python manage.py prune_published_modules --keep-latest 3
```

- Enable automatic pruning after publish (opt-in):
  - Set environment variable `PUBLISHED_MODULE_AUTO_PRUNE=1` or edit `PUBLISHED_MODULE_RETENTION` in settings.
  - Note: enabling will cause `publish_module()` to call the prune helper after each publish. Use with caution.

Scheduling recommendations
- Preferred: run pruning from a scheduled maintenance job (cron or Windows Task Scheduler) during a maintenance window.

- Example cron (runs at 03:00 daily):
```cron
0 3 * * * cd /path/to/repo/backend && /path/to/venv/bin/python manage.py prune_published_modules --keep-latest 3
```

- Example Windows Task Scheduler action (PowerShell):
```powershell
powershell -NoProfile -Command "Set-Location 'D:\XR Training\backend'; .\venv\Scripts\Activate.ps1; python manage.py prune_published_modules --keep-latest 3"
```

Safety & best practices
- Always run with `--dry-run` first. Inspect output and media folder (`MEDIA_ROOT/published_modules/`).
- Backup: optionally copy `media/published_modules/` to object storage or a backup location before first prune.
- Client safety: confirm no active runtime clients still load older JSON URLs. If clients cache by URL, coordinate rollout.
- Audit trail: if you must retain an audit trail, instead implement soft-delete flags or copy published payloads to an archive bucket before deletion.

Testing & validation
- Test on staging with a copy of `media/published_modules/` and a staging DB before running in production.
- After pruning, verify the engine/runtime can fetch the latest payloads for a sample of modules.

Restoration guidance
- If you accidentally delete needed payloads, restore from your media backup or source control snapshot of the `media/published_modules` folder.

Logging & monitoring suggestions
- Add a simple wrapper to call the management command and log stdout/stderr to a retention log (e.g., `logs/prune/YYYY-mm-dd.log`).
- Monitor media folder size and PublishedModule counts to drive retention adjustments.

When to change the defaults
- If you need aggressive storage savings and can tolerate losing older versions, lower `keep_latest` to `1` or enable `auto_prune` after validation.
- If you require long-term auditability, set `keep_latest` very high or leave pruning manual.

Contact
- If you're unsure, contact the authoring/ops owner before enabling `auto_prune`.

Cleanup orphaned UI files
- Purpose: when steps are removed or modules are republished, per-step UI JSON files can become orphaned in `media/published_modules/`. The publish flow now removes orphaned per-step JSONs for the module being published. Use the cleanup command below to detect and remove orphaned files across all modules.

- Dry-run (report candidates):
```bash
cd backend
python manage.py cleanup_published_ui_files --dry-run
```

- Delete orphaned files:
```bash
cd backend
python manage.py cleanup_published_ui_files
```

- Notes:
  - The cleanup command uses `PublishedModule.payload` references to decide which UI files are still in use. It is best-effort; inspect the list before deleting.
  - Always run `--dry-run` first and keep a backup of `media/published_modules/` if you need the ability to restore files.
