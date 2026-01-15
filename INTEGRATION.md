# Backend-Frontend Integration Guide

This guide documents the API integration between the Django backend and React frontend.

## Setup

### Backend

1. **Create a virtual environment:**
   ```bash
   cd backend
   python -m venv venv
   source venv/Scripts/activate  # Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database credentials (PostgreSQL).

4. **Initialize database:**
   ```bash
   python manage.py migrate
   python manage.py createsuperuser  # Create admin user
   ```

5. **Start development server:**
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```

   Admin panel: http://localhost:8000/admin

### Frontend

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   Ensure `VITE_API_URL` matches your backend (default: `http://localhost:8000/api`).

3. **Start development server:**
   ```bash
   npm run dev
   ```

   Frontend: http://localhost:5173 (or configured Vite port)

---

## API Architecture

### Base URL
- **Development:** `http://localhost:8000/api`
- **Production:** Configure in frontend `.env` via `VITE_API_URL`

### API Client
Location: `frontend/src/lib/api.ts`

The `apiClient` is a centralized service that wraps all backend endpoints:

```typescript
import { apiClient } from './lib/api'

// Examples:
await apiClient.createModule('My Module', 'Description')
await apiClient.createStep(moduleId, 'Step Title', 'Step Content')
await apiClient.uploadAsset(file, 'gltf')
await apiClient.publishModule(moduleId)
```

---

## Endpoint Mapping

### Module Management

| Action | Endpoint | Method | Implementation |
|--------|----------|--------|-----------------|
| Create Module | `/api/modules` | POST | `homedevelop.tsx` → `handleCreateModule` |
| Get Module | `/api/modules/{id}` | GET | `createmodule.tsx` → `loadModule` |
| Update Module | `/api/modules/{id}` | PUT | Not yet implemented |
| Delete Module | `/api/modules/{id}` | DELETE | Not yet implemented |

### Step Management

| Action | Endpoint | Method | Implementation |
|--------|----------|--------|-----------------|
| Create Step | `/api/modules/{moduleId}/steps` | POST | `createmodule.tsx` → `addStep` |
| Update Step | `/api/steps/{stepId}` | PUT | `createmodule.tsx` → `updateStep` |
| Delete Step | `/api/steps/{stepId}` | DELETE | `createmodule.tsx` → `removeStep` |
| Reorder Steps | `/api/modules/{moduleId}/steps/reorder` | POST | Not yet implemented |

### Asset Management

| Action | Endpoint | Method | Implementation |
|--------|----------|--------|-----------------|
| Upload Asset | `/api/assets/upload` | POST (multipart) | `homedevelop.tsx` → `handleAssetUpload` |
| Delete Asset | `/api/assets/{id}` | DELETE | Backend not yet implemented |
| List Assets | N/A | N/A | Backend endpoint needed |

### Asset Assignment

| Action | Endpoint | Method | Implementation |
|--------|----------|--------|-----------------|
| Assign Asset to Step | `/api/steps/{stepId}/assets` | POST | `createmodule.tsx` → `assignModelToStep` |
| Delete Assignment | `/api/step-assets/{id}` | DELETE | Not yet implemented |

### Publishing

| Action | Endpoint | Method | Implementation |
|--------|----------|--------|-----------------|
| Publish Module | `/api/modules/{moduleId}/publish` | POST | `createmodule.tsx` → `handlePublish` |
| Get Runtime Payload | `/api/modules/{moduleId}/runtime` | GET | Not yet implemented (for Operate mode) |

---

## Data Flow Examples

### Creating a Module and Adding Steps

```
Frontend                          Backend                    Database
┌─────────────┐                  ┌──────────┐               ┌────────┐
│ HomeDevelop │                  │ Django   │               │ PostgreSQL
└─────────────┘                  └──────────┘               └────────┘
      │                                │                         │
      ├─ POST /api/modules ────────────>│                         │
      │  {title, description}          │── INSERT MODULE ────────>│
      │                                │<──────────────────────── (UUID)
      │<────── {id, title, ...} ───────┤                         │
      │                                │                         │
      ├─ POST /api/modules/:id/steps ─>│                         │
      │  {title, body, required}       │── INSERT STEP ─────────>│
      │                                │<──────────────────────── (UUID)
      │<────── {id, title, ...} ───────┤                         │
```

### Uploading and Assigning Assets

```
Frontend                          Backend                    Filesystem
┌─────────────┐                  ┌──────────┐               ┌────────┐
│ HomeDevelop │                  │ Django   │               │ /media
└─────────────┘                  └──────────┘               └────────┘
      │                                │                         │
      ├─ POST /api/assets/upload ─────>│                         │
      │  (multipart: file, type)       │── SAVE FILE ───────────>│
      │                                │  /media/assets/gltf/   │
      │                                │   {uuid}/original.glb  │
      │                                │── INSERT ASSET ───────>│
      │<────── {id, url, type} ────────┤<──────────────────────── 
      │                                │                         │
      ├─ POST /api/steps/:id/assets ──>│                         │
      │  {assetId, priority}           │── INSERT STEP_ASSET ──>│
      │                                │<──────────────────────── 
      │<────── {id, priority} ─────────┤                         │
```

### Publishing a Module

```
Frontend                          Backend                    Database
┌────────────┐                   ┌──────────┐               ┌────────┐
│CreateModule│                   │ Django   │               │PostgreSQL
└────────────┘                   └──────────┘               └────────┘
      │                                │                         │
      ├─ POST /api/modules/:id/publish>│                         │
      │                                │── COMPILE PAYLOAD ─────>│
      │                                │  (fetch steps, assets)  │
      │                                │<──────────────────────── 
      │                                │── INSERT PUBLISHED     │
      │                                │   MODULE ──────────────>│
      │                                │<──────────────────────── 
      │<── {id, version, ...} ─────────┤                         │
      │ (redirect to /develop)         │                         │
```

---

## Error Handling

All API calls wrap errors in try-catch and display user feedback:

```typescript
try {
  const result = await apiClient.createStep(...)
} catch (error) {
  const msg = error instanceof Error ? error.message : 'Unknown error'
  setError(`Failed to create step: ${msg}`)
  console.error(error)
}
```

Errors are displayed in red notification boxes in the UI.

---

## Key Files

### Backend
- `backend/settings.py` - CORS config, media settings, API base URL
- `authoring/urls.py` - Endpoint routing
- `authoring/views/` - Request handlers
- `authoring/serializers/` - Request/response serialization
- `authoring/services/publish_service.py` - Publishing logic

### Frontend
- `src/lib/api.ts` - Centralized API client (main integration point)
- `src/lib/config.ts` - Environment configuration
- `src/pages/develop/homedevelop.tsx` - Module list & asset upload
- `src/pages/develop/createmodule.tsx` - Module editor with steps
- `src/components/pagecomponents/asset-sidebar.tsx` - Asset management UI
- `src/components/pagecomponents/step-configuration.tsx` - Step editor UI

---

## Future Enhancements

1. **Missing Backend Endpoints:**
   - `GET /api/assets` - List uploaded assets
   - `DELETE /api/assets/{id}` - Delete asset
   - `GET /api/modules` - List modules
   - Update & delete module endpoints usage

2. **Missing Frontend Integration:**
   - Module list view with load/delete
   - Step reordering UI
   - Operate mode runtime payload fetching
   - Asset metadata storage (thumbnail, dimensions)

3. **Production Considerations:**
   - Implement token-based authentication (JWT or session)
   - Add request rate limiting
   - Implement proper CORS allowlist
   - Use CloudFront/CDN for media assets (not local filesystem)
   - Add API versioning (/api/v1/)
   - Implement request logging & monitoring

---

## Troubleshooting

### CORS Error
- **Symptom:** "Access to XMLHttpRequest blocked by CORS policy"
- **Solution:** Backend `CORS_ALLOW_ALL_ORIGINS = True` is enabled in dev. For production, set `CORS_ALLOWED_ORIGINS` to specific frontend URLs.

### Backend not responding
- **Check:**
  - Backend running on `http://localhost:8000`
  - `VITE_API_URL` in frontend `.env` matches backend address
  - Firewall/network allows cross-origin requests

### Assets not uploading
- **Check:**
  - File is `.glb` or `.gltf`
  - File size < `ASSET_MAX_UPLOAD_BYTES` (default 100MB)
  - Backend media directory exists and is writable (`media/`)

### Module not saving
- **Check:**
  - Database connection working (run `python manage.py dbshell`)
  - Migrations applied (`python manage.py migrate`)
  - No validation errors in backend response (check browser DevTools Network)
