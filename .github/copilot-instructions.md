# Copilot instructions — XR Training

Purpose
- Help coding agents become productive quickly in this monorepo (backend, frontend, engine, external SDK).

Quick architecture summary
- Backend: Django REST API (see `backend/`), authoring models in `backend/authoring/models/`, serializers in `backend/authoring/serializers/`, views in `backend/authoring/views/`, publishing logic in `backend/authoring/services/publish_service.py`.
- Frontend: React + TypeScript (see `frontend/`), centralized API client at `frontend/src/lib/api.ts` — all backend calls must use this client.
- Engine: XR runtime (see `engine/`), bootstrap in `engine/src/index.ts`, UI sources in `ui/*.uikitml`. Build outputs live under `engine/public/` and must not be edited directly.
- External SDK: `external/immersive-web-sdk/` is an upstream dependency; treat as read-only unless explicitly modifying SDK and publishing `.tgz` artifacts.

Developer workflows / commands
- Backend (Windows dev):
  - Create venv, install and run:
    - `cd backend`
    - `python -m venv venv`
    - `venv\\Scripts\\activate` (Windows)
    - `pip install -r requirements.txt`
    - `python manage.py migrate`
    - `python manage.py runserver 0.0.0.0:8000`
- Frontend:
  - `cd frontend`
  - `npm install`
  - `npm run dev` (uses `VITE_API_URL` — default points to backend at `http://localhost:8000/api`)
- Engine (requires Node >= 20.19.0):
  - `cd engine`
  - `npm install`
  - `npm run dev` (serves on TLS; mkcert is used during dev)

Critical repo conventions (project-specific)
- Models use UUID primary keys across backend — expect `id` fields as UUIDs.
- Publishing is immutable: `PublishedModule` objects are created (incremented versions), do not modify existing published payloads.
- Asset storage path convention: `media/assets/{type}/{uuid}/original.{ext}`.
- Steps use `order_index` for sequencing; reordering should be atomic server-side.
- Frontend MUST use `frontend/src/lib/api.ts` for all server interactions (no raw `fetch` calls in pages/components).
- Engine `public/` directory contains generated/optimized assets — edit sources only (`ui/*.uikitml`, `src/` code, engine asset manifests).

Integration points & data flow (common tasks)
- Authoring flow (frontend → backend): create module → add steps → upload GLTF assets → assign assets to steps → `POST /api/modules/{moduleId}/publish`. Check `frontend/src/lib/api.ts` for exact endpoints.
- Runtime flow (engine ← backend): engine fetches published payload via `GET /api/modules/{moduleId}/runtime`; payload contains ordered steps and asset URLs the engine loads.
- Publishing logic: `backend/authoring/services/publish_service.py` compiles immutable runtime payloads; inspect it when changing publish output shape.

Files to inspect first (fast onboarding)
- `backend/authoring/models/` — domain models (Module, Step, Asset, PublishedModule).
- `backend/authoring/services/publish_service.py` — runtime payload generation.
- `frontend/src/lib/api.ts` — central API client; reference for all endpoints and request shapes.
- `engine/src/index.ts` — engine bootstrap and asset manifest; `ui/*.uikitml` for UI sources.

Debugging notes / gotchas
- Do not edit generated assets under `engine/public/` or `engine/public/ui/*.json` — changes will be overwritten by the build pipeline.
- If engine dev server fails, confirm Node version >= 20.19 and that `mkcert` certificates exist for TLS.
- Backend errors often stem from missing migrations; run `python manage.py migrate` and inspect `backend/backend/settings.py` for DB and CORS settings.
- Frontend expects backend URLs via `VITE_API_URL`; missing/incorrect value leads to CORS or 404s.

Examples (common change paths)
- Add API field for module publish: update serializer in `backend/authoring/serializers/`, adjust `publish_service.py` output, then add client mapping in `frontend/src/lib/api.ts`.
- Add an engine system: create `engine/src/mySystem.ts`, export it, then register in `engine/src/index.ts` and add any assets to the engine manifest.

What agents should not change
- Never modify `external/immersive-web-sdk/` without an explicit plan and `.tgz` rebuild.
- Do not edit the `engine/public/` build artifacts; change sources under `engine/ui/` and `engine/src/` instead.

If anything is unclear or you want this shortened or expanded, tell me which sections to focus on and I'll iterate.
## Purpose

Actionable guidance for AI agents working in this XR training platform—a full-stack system for authoring and delivering immersive training modules.

## System Architecture (3 main components)

**Three independent services that run concurrently:**

1. **`backend/`** — Django REST API + PostgreSQL (port 8000)
   - Authoring pipeline: modules, steps, assets (GLTF uploads), publishing
   - Immutable versioned payloads for runtime consumption
   - Media storage: `media/assets/{type}/{uuid}/original.{ext}`

2. **`frontend/`** — React + TypeScript authoring UI (port 5173)
   - Module editor, step management, asset upload/assignment
   - Real-time persistence via centralized `apiClient` (`src/lib/api.ts`)
   - Communicates with backend at `http://localhost:8000/api`

3. **`engine/`** — XR runtime using Immersive Web SDK (port 8081)
   - WebXR application with ECS architecture (`@iwsdk/core`)
   - Vite plugins: emulator injection (`injectIWER`), UIKitML compilation, GLTF optimization
   - Consumes published module payloads from backend for runtime delivery

4. **`external/immersive-web-sdk/`** — SDK submodule (upstream dependency)
   - Treat as read-only unless explicitly modifying SDK code
   - Build `.tgz` packages with `pnpm install && npm run build:tgz` when SDK changes needed

## Quick Start (run all 3 services)

**Terminal 1 — Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows (use source venv/bin/activate on Unix)
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev  # Opens http://localhost:5173
```

**Terminal 3 — Engine (XR Runtime):**
```bash
cd engine
npm install
npm run dev  # Opens https://localhost:8081 with TLS (mkcert)
```

## Key Files & Patterns

**Backend (Django + DRF):**
- [`backend/backend/settings.py`](backend/backend/settings.py) — PostgreSQL config, CORS, media settings, REST framework
- [`backend/authoring/models/`](backend/authoring/models/) — `Module`, `Step`, `Asset`, `StepAsset`, `PublishedModule` (UUID primary keys)
- [`backend/authoring/views/`](backend/authoring/views/) — DRF views: CRUD + publish/runtime endpoints
- [`backend/authoring/services/publish_service.py`](backend/authoring/services/publish_service.py) — Compiles immutable runtime payloads with versioning
- API patterns: UUID-based resources, atomic transactions, multipart uploads for assets

**Frontend (React):**
- [`frontend/src/lib/api.ts`](frontend/src/lib/api.ts) — Centralized `apiClient` wrapping all backend endpoints (modules, steps, assets, publish)
- [`frontend/src/pages/homedevelop.tsx`](frontend/src/pages/homedevelop.tsx) — Module creation flow
- [`frontend/src/pages/createmodule.tsx`](frontend/src/pages/createmodule.tsx) — Step editor with auto-save on every change
- [`frontend/src/components/asset-sidebar.tsx`](frontend/src/components/asset-sidebar.tsx) — Drag-drop GLTF upload + asset assignment
- UI stack: Radix UI primitives, Tailwind 4.x, React Router, TypeScript strict mode

**Engine (XR Runtime):**
- [`engine/src/index.ts`](engine/src/index.ts) — App bootstrap: `World.create({ assets, xr, features })` then `world.registerSystem(...)`
- [`engine/vite.config.ts`](engine/vite.config.ts) — Plugin chain: `mkcert()` (TLS), `injectIWER` (emulator), `compileUIKit`, `optimizeGLTF`
- [`engine/ui/*.uikitml`](engine/ui/) — UI sources compiled to `public/ui/*.json` by Vite plugin (edit `.uikitml`, not JSON)
- ECS architecture: systems extend base classes, register via `world.registerSystem(YourSystem)`
- Asset manifests: typed objects with `{ url, type: AssetType.GLTF, priority: "critical" }`
- Engine requires Node >= 20.19.0, uses `super-three` (pinned Three.js fork)

## Project-Specific Conventions

**Backend:**
- All models use UUID primary keys (`id = models.UUIDField(primary_key=True, default=uuid.uuid4)`)
- Publishing is immutable: creates `PublishedModule` with incremented version, never modifies existing publishes
- Steps use `order_index` for sequencing; reordering is atomic per module
- Asset validation: size limits (100MB default), extension checks per type (GLTF: `.glb`/`.gltf`)
- CORS is wide-open in dev (`CORS_ALLOW_ALL_ORIGINS=True`); tighten for production

**Frontend:**
- All backend communication goes through `apiClient` (no direct `fetch` outside `api.ts`)
- Auto-save on step edits: debounced calls to `apiClient.updateStep()`
- Error handling: catch API errors, display red notification boxes to user
- Drag-drop uploads: `<input type="file" accept=".glb,.gltf">` → `apiClient.uploadAsset()`
- Environment: `VITE_API_URL` points to backend (default `http://localhost:8000/api`)

**Engine:**
- **Never edit generated artifacts:** `public/glxf`, `public/ui/*.json`, optimized `public/gltf` are build outputs
- Edit sources instead: `ui/*.uikitml` for UI, metaspatial sources for scenes (if present)
- ECS pattern: create systems in `src/`, register via `world.registerSystem(YourSystem)` in `index.ts`
- Asset manifests are defined at app bootstrap; add entries to `assets` object with proper types
- UIKitML uses custom declarative syntax compiled at build time—refer to SDK docs for syntax

## Integration Points & Data Flow

**Authoring Flow (Frontend → Backend):**
1. User creates module in frontend → `POST /api/modules`
2. User adds steps → `POST /api/modules/{moduleId}/steps`
3. User uploads GLTF → `POST /api/assets/upload` (multipart/form-data)
4. User assigns asset to step → `POST /api/steps/{stepId}/assets`
5. User clicks "Publish" → `POST /api/modules/{moduleId}/publish` (service compiles immutable payload)

**Runtime Consumption (Engine ← Backend):**
1. Engine fetches published module → `GET /api/modules/{moduleId}/runtime`
2. Response includes: module metadata, ordered steps, associated asset URLs
3. Engine loads assets via Asset Manager, creates ECS entities, registers systems
4. XR session begins with `World.create()`, presenting training content

**Cross-service communication:**
- Frontend ↔ Backend: REST JSON over HTTP (CORS enabled)
- Engine ↔ Backend: Fetches runtime payloads (GET requests, no auth in current impl)
- Engine ↔ SDK: Local `@iwsdk/*` package imports from `external/immersive-web-sdk`

## Common Tasks

**Add a backend endpoint:**
1. Define model in `backend/authoring/models/`
2. Create serializer in `backend/authoring/serializers/`
3. Implement view in `backend/authoring/views/`
4. Register route in `backend/authoring/urls.py`
5. Add corresponding method to `frontend/src/lib/api.ts`

**Add a frontend feature:**
1. Implement UI in `frontend/src/pages/` or `frontend/src/components/`
2. Call `apiClient.{method}()` for backend communication
3. Handle loading/error states with try-catch and user notifications
4. Update routing in `frontend/src/App.tsx` if adding new pages

**Add an XR runtime system:**
1. Create system file in `engine/src/{feature}.ts`
2. Export system class extending ECS base
3. Register via `world.registerSystem(YourSystem)` in `engine/src/index.ts`
4. Add required assets to `assets` manifest if needed

**Modify SDK (rare):**
1. Work in `external/immersive-web-sdk/packages/{package}/`
2. Build artifacts: `cd external/immersive-web-sdk && pnpm install && npm run build:tgz`
3. Consume `.tgz` in engine: update `engine/package.json` to point to local `.tgz` file
4. Test changes, commit SDK changes separately from app changes

## Environment Requirements

- **Backend:** Python 3.11+, PostgreSQL 12+
- **Frontend:** Node.js 18+
- **Engine:** Node.js >= 20.19.0 (strict requirement in `package.json`)
- **Dev tools:** `venv` (Python), `npm`/`pnpm`, PostgreSQL client

## Reference Docs

- Architecture: [`ARCHITECTURE.md`](ARCHITECTURE.md) — Detailed component diagrams, endpoint mapping
- Integration: [`INTEGRATION.md`](INTEGRATION.md) — API contracts, data flow, environment setup
- Quick Start: [`QUICKSTART.md`](QUICKSTART.md) — Step-by-step dev environment setup
- README: [`README.md`](README.md) — Feature checklist, file structure overview
