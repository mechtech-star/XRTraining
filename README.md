# 🚀 Backend-Frontend Integration Complete

## What Was Connected

The Django backend and React frontend are now fully integrated with **real-time persistence** to PostgreSQL. Every authoring action immediately writes to the database.

---

## Quick Start (5 minutes)

### Terminal 1: Backend
```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### Terminal 2: Frontend
```bash
cd frontend
npm install
npm run dev
```

**Then open** `http://localhost:5173` and start creating modules!

---

## Features Implemented

### ✅ Module Management
- Create modules (persists to DB)
- Edit module details
- Load module state on page load
- Delete modules

### ✅ Step Management
- Add steps to modules
- Edit step content (title, body)
- Delete steps
- Auto-save on every change
- Steps ordered by index
 
### Engine (XR Runtime)
```bash
cd engine
npm install
# Node >= 20.19.0 is required. Dev server uses mkcert for TLS — ensure mkcert certificates exist.
npm run dev
```
Then open `https://localhost:8081` (TLS) to view the runtime.

### ✅ Asset Upload & Assignment
- Upload `.glb` and `.gltf` files via drag-drop
- Files stored safely: `/media/assets/gltf/{uuid}/original.glb`
- Assign models to steps
- Priority ordering
 - Runtime includes `models[]` per step for multi-model support

### ✅ Publishing Pipeline
- Compile immutable runtime payloads
- Version control (increment on publish)
- Atomic transactions
- All steps + assets included in payload

### ✅ Multiple Models Per Step
- Assign multiple models to a single step; each assignment stores `metadata` (used for `animation`).
- Frontend UI shows multiple model containers per step with animation dropdowns.
- Backend publishes `models[]` and engine plays per-model animations on step activation.

### ✅ Error Handling
- User-friendly error messages
- Red notification boxes
- API errors caught and logged
- Loading states during operations

### 🔔 What's New — Multiple Models Per Step
- Support for assigning multiple GLTF/GLB models to a single step, each with its own selected animation clip.
- Backend: `StepAsset.metadata` stores per-assignment metadata (e.g., `{ "animation": "Idle" }`). The publish pipeline includes a `models[]` array in the runtime payload containing `{ assetId, assetType, url, originalFilename, animation? }` for each assigned model.
- API: Added `POST /api/steps/{stepId}/assets` (assign with optional `metadata`) and `PUT /api/step-assets/{id}` to update per-assignment metadata (used to set the selected animation).
- Frontend: Step editor supports multiple model "containers" (repeat of the model card UI). Each container shows filename and an animation dropdown; choosing an animation updates the `StepAsset.metadata` via the API.
- Engine: The runtime maps published assets into distinct manifest keys (e.g., `model_{assetId}`), loads each GLTF as its own entity, creates one `AnimationMixer` per model instance, and when a step is activated plays the selected animation for each model instance.
- Backward compatibility: If a module only has a single model assigned, the engine falls back to the legacy `model` field so existing published modules continue to work.

The minimal scope of this feature is intentionally focused: multiple model containers with a single selected animation per model. No per-model transforms or additional per-model behaviours were added in this iteration.

---

## File Structure

```
XR Training/
├── backend/                       ← Django backend
│   ├── backend/
│   │   ├── settings.py           (CORS, media config, DB settings)
│   │   ├── urls.py               (API routing)
│   │   └── wsgi.py / asgi.py
│   ├── authoring/                ← Main app
│   │   ├── models/
│   │   │   ├── module.py
│   │   │   ├── step.py
│   │   │   ├── asset.py
│   │   │   ├── step_asset.py
│   │   │   └── published_module.py
│   │   ├── serializers/
│   │   │   ├── module_serializers.py
│   │   │   ├── asset_serializers.py
│   │   │   └── published_serializers.py
│   │   ├── views/
│   │   │   ├── module_views.py   (CRUD + publish)
│   │   │   └── asset_views.py    (upload + assign)
│   │   ├── services/
│   │   │   └── publish_service.py (payload compilation)
│   │   ├── urls.py               (endpoint routing)
│   │   ├── admin.py              (Django admin)
│   │   └── migrations/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── .env
│   └── README.md
│
├── frontend/                      ← React frontend
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.ts            ← **API CLIENT** (main integration)
│   │   │   ├── config.ts         (env config)
│   │   │   └── utils.ts
│   │   ├── pages/develop/
│   │   │   ├── homedevelop.tsx   (module list + asset upload)
│   │   │   ├── createmodule.tsx  (module editor)
│   │   │   └── indexdevelop.tsx  (router)
│   │   ├── components/pagecomponents/
│   │   │   ├── asset-sidebar.tsx (asset UI)
│   │   │   └── step-configuration.tsx (step UI)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env                      (API URLs)
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── QUICKSTART.md                 ← Read this first!
├── INTEGRATION.md                ← Detailed integration guide
├── ARCHITECTURE.md               ← System diagrams & data flow
├── INTEGRATION_SUMMARY.md        ← High-level overview
└── VERIFICATION_CHECKLIST.md     ← Step-by-step verification
```

---

## Key API Endpoints

All endpoints return JSON and support proper HTTP methods:

```
MODULE MANAGEMENT
POST   /api/modules                 Create module
GET    /api/modules/{id}            Get module + steps
PUT    /api/modules/{id}            Update module
DELETE /api/modules/{id}            Delete module

STEP MANAGEMENT
POST   /api/modules/{moduleId}/steps           Create step
PUT    /api/steps/{stepId}                     Update step
DELETE /api/steps/{stepId}                     Delete step
POST   /api/modules/{moduleId}/steps/reorder   Reorder steps

ASSET MANAGEMENT
POST   /api/assets/upload           Upload 3D model (multipart)
POST   /api/steps/{stepId}/assets   Assign asset to step
DELETE /api/step-assets/{id}        Remove assignment
PUT    /api/step-assets/{id}        Update assignment metadata (e.g., selected animation)

PUBLISHING
POST   /api/modules/{moduleId}/publish   Compile & publish
GET    /api/modules/{moduleId}/runtime   Get runtime payload
```

---

## Data Persistence Flow

```
Frontend UI Action
        ↓
apiClient.method() [src/lib/api.ts]
        ↓
HTTP Request (JSON)
        ↓
Backend View (DRF)
        ↓
Serializer Validation
        ↓
ORM Model.save()
        ↓
PostgreSQL Write ✅
        ↓
Response JSON
        ↓
Frontend UI Update
```

**Every action is immediately persisted to the database.**

---

## Environment Configuration

### Backend `.env`
```env
DJANGO_SECRET_KEY=secure-key
DJANGO_DEBUG=1
POSTGRES_HOST=localhost
POSTGRES_USER=authoring
POSTGRES_PASSWORD=password
POSTGRES_DB=authoring
ASSET_MAX_UPLOAD_BYTES=104857600
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:8000/api
VITE_API_MEDIA_URL=http://localhost:8000/media
```

---

## Database Schema

```
┌─ Module ─────────────────────┐
│ • id (UUID, PK)              │
│ • title                       │
│ • description                 │
│ • cover_asset (FK → Asset)    │
│ • status (draft/published)    │
│ • version (int)               │
│ • created_at / updated_at     │
└──────────────────────────────┘
            ↓ (1:N)
┌─ Step ──────────────────────┐
│ • id (UUID, PK)             │
│ • module (FK)               │
│ • order_index (unique pair) │
│ • title                     │
│ • body                      │
│ • required (bool)           │
│ • created_at / updated_at   │
└─────────────────────────────┘
            ↓ (M:M)
        ┌────────────┐
        │ StepAsset  │
        │ • id (UUID)│
        │ • priority │
        └────────────┘
            ↓ (M:1)
┌─ Asset ──────────────────────┐
│ • id (UUID, PK)              │
│ • file (FileField)           │
│ • type (gltf/image/...)      │
│ • mime_type                  │
│ • size_bytes                 │
│ • metadata (JSON, optional)  │
│ • created_at                 │
└──────────────────────────────┘

┌─ PublishedModule ────────────┐
│ • id (UUID, PK)              │
│ • module (FK)                │
│ • version (int, unique pair) │
│ • schema_version             │
│ • payload (JSON)             │ ← Immutable runtime data
│ • published_at               │
└──────────────────────────────┘
```

---

## Asset Storage

Files are stored safely with predictable paths:

```
/media/assets/{type}/{uuid}/original.{ext}

Examples:
/media/assets/gltf/550e8400-e29b-41d4-a716-446655440000/original.glb
/media/assets/gltf/5c9d1234-f567-890a-bcde-f01234567890/original.gltf
/media/assets/image/7a3b5678-90ab-cdef-1234-567890abcdef/original.png
```

File validation:
- ✅ Extension matches type (e.g., `.glb` for `gltf` type)
- ✅ File size checked against `ASSET_MAX_UPLOAD_BYTES` (100MB default)
- ✅ MIME type stored for serving correct headers
- ✅ Original filename preserved in DB

---

## Next Steps

### Short Term (Complete Integration)
1. Run quick start commands above
2. Follow `VERIFICATION_CHECKLIST.md`
3. Create a test module end-to-end
4. Verify data in Django admin

### Medium Term (Enhance Features)
- [ ] Implement module list endpoint (`GET /api/modules`)
- [ ] Add module/step delete endpoint usage
- [ ] Implement step reordering in frontend
- [ ] Build Operate mode (runtime payload consumption)
- [ ] Add asset deletion endpoint

### Long Term (Production Ready)
- [ ] Add JWT authentication
- [ ] Implement CORS allowlist (production domains)
- [ ] Move assets to S3/CDN
- [ ] Add request logging & monitoring
- [ ] API versioning (/api/v1/)
- [ ] Rate limiting
- [ ] Unit/integration tests

---

## Key Files to Review

1. **`src/lib/api.ts`** - The API client (all backend calls go through here)
2. **`src/pages/develop/homedevelop.tsx`** - Module creation & asset upload
3. **`src/pages/develop/createmodule.tsx`** - Module editor with steps
4. **`authoring/views/module_views.py`** - Backend request handlers
5. **`authoring/services/publish_service.py`** - Publishing logic
6. **`backend/settings.py`** - CORS, media, database config

---

## Documentation

- **QUICKSTART.md** - Get running in 5 minutes ⭐
- **INTEGRATION.md** - Detailed API & data flow documentation
- **ARCHITECTURE.md** - System diagrams, request/response examples
- **INTEGRATION_SUMMARY.md** - What was connected & what's left
- **VERIFICATION_CHECKLIST.md** - Step-by-step testing guide

---

## Support

If something doesn't work:

1. Check browser DevTools Network tab for failed requests
2. Check backend console for Django errors
3. Verify PostgreSQL is running and accessible
4. Ensure `.env` files are configured correctly
5. Review the troubleshooting section in `INTEGRATION.md`

---

## 🎉 Success Indicators

You know integration is working when:
- ✅ Creating module redirects to editor
- ✅ Adding steps appears immediately in UI
- ✅ Uploading `.glb` file succeeds
- ✅ Assigning model to step works
- ✅ Publishing shows success message
- ✅ Django admin shows all created records
- ✅ Files exist at `/backend/media/assets/gltf/{uuid}/original.glb`

---

**Happy Authoring! 🚀**
