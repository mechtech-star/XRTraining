# Architecture Diagram: Backend-Frontend Integration

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       FRONTEND (React + TypeScript)                 │
│                     http://localhost:5173                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────┐  ┌─────────────────┐  ┌──────────────────┐ │
│  │   Home Develop       │  │  Create Module  │  │  Asset Sidebar   │ │
│  │  (homedevelop.tsx)   │  │(createmodule.tsx)│  │(asset-sidebar.tsx)
│  │                      │  │                 │  │                  │ │
│  │ • Create module      │  │ • Add step      │  │ • Upload .glb    │ │
│  │ • Upload .glb/.gltf  │  │ • Edit step     │  │ • Search assets  │ │
│  │ • List assets        │  │ • Delete step   │  │ • Assign model   │ │
│  │                      │  │ • Assign model  │  │                  │ │
│  │                      │  │ • Publish       │  │                  │ │
│  └──────────┬───────────┘  └────────┬────────┘  └────────┬─────────┘ │
│             │                       │                     │           │
│             │ apiClient calls       │ apiClient calls     │           │
│             │                       │                     │           │
│             └───────────┬───────────┴─────────────────────┘           │
│                         │                                             │
│              ┌──────────▼──────────┐                                  │
│              │  API Client         │                                  │
│              │  (src/lib/api.ts)   │                                  │
│              │                     │                                  │
│              │ • createModule()    │                                  │
│              │ • createStep()      │                                  │
│              │ • updateStep()      │                                  │
│              │ • uploadAsset()     │                                  │
│              │ • assignAssetTo...()│                                  │
│              │ • publishModule()   │                                  │
│              └──────────┬──────────┘                                  │
│                         │                                             │
└─────────────────────────┼─────────────────────────────────────────────┘
                          │
                   HTTP Fetch Requests
                   (Content-Type: application/json)
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   BACKEND (Django + DRF)                            │
│                  http://localhost:8000                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  API Endpoints (authoring/urls.py)                            │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │                                                                  │ │
│  │  POST   /api/modules                 → ModuleCreateView        │ │
│  │  GET    /api/modules/{id}            → ModuleDetailView        │ │
│  │  PUT    /api/modules/{id}            → ModuleDetailView        │ │
│  │  DELETE /api/modules/{id}            → ModuleDetailView        │ │
│  │                                                                  │ │
│  │  POST   /api/modules/{moduleId}/steps         → StepCreateView │ │
│  │  PUT    /api/steps/{stepId}                  → StepUpdateView  │ │
│  │  DELETE /api/steps/{stepId}                  → StepDeleteView  │ │
│  │  POST   /api/modules/{moduleId}/steps/reorder→ StepReorderView │ │
│  │                                                                  │ │
│  │  POST   /api/assets/upload            → AssetUploadView        │ │
│  │  POST   /api/steps/{stepId}/assets    → StepAssetAssignView    │ │
│  │  DELETE /api/step-assets/{id}         → StepAssetDeleteView    │ │
│  │                                                                  │ │
│  │  POST   /api/modules/{moduleId}/publish   → ModulePublishView  │ │
│  │  GET    /api/modules/{moduleId}/runtime   → ModuleRuntimeView  │ │
│  │                                                                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                         │                                             │
│                         ▼                                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Views & Serializers (authoring/views/*.py)                   │ │
│  │                                                                  │ │
│  │ • Parse request data                                            │ │
│  │ • Call database models                                          │ │
│  │ • Serialize response                                            │ │
│  │ • Return JSON                                                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                         │                                             │
│                         ▼                                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  ORM Models (authoring/models/*.py)                            │ │
│  │                                                                  │ │
│  │ • Module          (title, description, cover_asset, status)    │ │
│  │ • Step            (module_id, order_index, title, body)        │ │
│  │ • Asset           (file, type, mime_type, size_bytes)          │ │
│  │ • StepAsset       (step_id, asset_id, priority)                │ │
│  │ • PublishedModule (module_id, version, payload)                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                         │                                             │
│                         ▼                                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Services (authoring/services/*.py)                            │ │
│  │                                                                  │ │
│  │ • publish_service.py:                                           │ │
│  │   - Compile runtime payload                                     │ │
│  │   - Normalize step ordering                                     │ │
│  │   - Create immutable PublishedModule                            │ │
│  │   - Increment version                                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                         │                                             │
└─────────────────────────┼─────────────────────────────────────────────┘
                          │
                   SQL Queries (ORM)
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                            │
│                     localhost:5432                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Tables:                                                              │
│  • authoring_module           (id, title, description, status, v.) │
│  • authoring_step             (id, module_id, order_index, title...) │
│  • authoring_asset            (id, file, type, mime_type, size...)  │
│  • authoring_stepasset        (id, step_id, asset_id, priority)     │
│  • authoring_publishedmodule  (id, module_id, version, payload...)  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                          │
                   Filesystem Operations
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│              FILESYSTEM STORAGE (Media)                             │
│                    ./media/                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  /media/assets/gltf/{uuid}/original.glb                             │
│  /media/assets/gltf/{uuid}/original.gltf                            │
│  /media/assets/image/{uuid}/original.png                            │
│  /media/assets/image/{uuid}/original.jpg                            │
│  /media/assets/audio/{uuid}/original.mp3                            │
│  /media/assets/video/{uuid}/original.mp4                            │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Request-Response Flow Example: Create Module

```
User clicks "Create Module" button
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Frontend Dialog                                                 │
│ User enters: "My Training Module"                               │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ onClick: handleCreateModule("My Training Module")
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ apiClient.createModule("My Training Module")                    │
│                                                                  │
│ Prepares request:                                               │
│ • URL: http://localhost:8000/api/modules                        │
│ • Method: POST                                                  │
│ • Body: {"title": "My Training Module", "description": null}    │
│ • Headers: {"Content-Type": "application/json"}                 │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ fetch()
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend Request                                                 │
│ POST /api/modules                                               │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ Django Router → ModuleCreateView
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ ModuleSerializer.create()                                       │
│ • Validates input data                                          │
│ • Creates Module instance                                       │
│ • Saves to database                                             │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ INSERT INTO authoring_module (id, title, ...)
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ PostgreSQL                                                      │
│ INSERT returns: id=550e8400-e29b-41d4-a716-446655440000         │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ Response object
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend Response                                                │
│ HTTP 201 Created                                                │
│ Body:                                                           │
│ {                                                               │
│   "id": "550e8400-e29b-41d4-a716-446655440000",                │
│   "title": "My Training Module",                                │
│   "description": null,                                          │
│   "status": "draft",                                            │
│   "version": 1,                                                 │
│   "created_at": "2026-01-15T10:30:45Z",                         │
│   "updated_at": "2026-01-15T10:30:45Z"                          │
│ }                                                               │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ response.json()
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ Frontend                                                        │
│ apiClient returns newModule object                              │
│ Extract moduleId from newModule.id                              │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ navigate(`/develop/createmodule/...?id=UUID`)
                   ▼
         Module Editor Loaded
         (useEffect calls loadModule())
```

---

## Component Hierarchy

```
App
├── /develop/*
│   └── Develop (indexdevelop.tsx)
│       ├── / → HomeDevelop
│       │   ├── Header
│       │   ├── [Main Content Area]
│       │   └── AssetSidebar
│       │       └── Upload UI
│       │           └── Asset List
│       │               └── onUpload → POST /api/assets/upload
│       │
│       └── /createmodule/:moduleName
│           └── CreateModule
│               ├── Header
│               ├── [Module Editor]
│               │   └── StepConfiguration
│               │       ├── Step Cards (grid)
│               │       ├── onAdd → POST /api/modules/{id}/steps
│               │       ├── onUpdate → PUT /api/steps/{id}
│               │       ├── onRemove → DELETE /api/steps/{id}
│               │       └── Publish Button
│               │           └── onPublish → POST /api/modules/{id}/publish
│               │
│               └── AssetSidebar
│                   ├── Upload UI
│                   └── onAssignModel → POST /api/steps/{id}/assets
│
└── /homeoperate
    └── HomeOperate (Future: Runtime Payload Consumer)
```

---

## Data Types & Transformations

### Module (Frontend ↔ Backend)
```
Frontend (homedevelop.tsx):
{
  id: string
  name: string        // ← backend returns "title"
  uploadedAt?: string // ← backend returns "created_at"
}

Backend Response:
{
  id: UUID
  title: string
  description: string | null
  cover_asset: UUID | null
  status: "draft" | "published"
  version: int
  created_at: ISO8601
  updated_at: ISO8601
  steps: Step[]
}
```

### Step (Frontend ↔ Backend)
```
Frontend (createmodule.tsx):
{
  id: string
  title: string
  content: string     // ← backend field is "body"
  model?: string      // ← asset UUID
}

Backend Request/Response:
{
  id: UUID
  module: UUID
  order_index: int
  title: string
  body: string
  required: bool
  created_at: ISO8601
  updated_at: ISO8601
  step_assets: StepAsset[]
}
```

### Asset (Frontend ↔ Backend)
```
Frontend (asset-sidebar.tsx):
{
  id: string
  name: string        // ← backend has no name; use original_filename
  uploadedAt?: string // ← backend returns "created_at"
  type: string
  url: string         // ← backend returns "file.url"
}

Backend Upload Response:
{
  id: UUID
  url: /media/assets/gltf/{uuid}/original.glb
  type: "gltf" | "image" | "audio" | "video" | "model" | "other"
  mimeType: string
  sizeBytes: int
  originalFilename: string
  created_at: ISO8601
}
```

---

## Error Handling Flow

```
Frontend API Call
       │
       ├─ Request fails (no network, timeout, etc.)
       │  └─ throw Error
       │
       └─ Response not OK (4xx, 5xx)
          ├─ Parse error response
          │  └─ {detail: "error message"}
          │
          └─ throw Error(errorData.detail)

catch (error)
   │
   ├─ error instanceof Error
   │  └─ msg = error.message
   │
   └─ msg = "Unknown error"

Display Error
   │
   └─ setError(`Failed to ...: ${msg}`)
      └─ UI shows red error box to user
```

---

## Environment Variables

### Backend (.env)
```env
DJANGO_SECRET_KEY=secure-random-key
DJANGO_DEBUG=1 (dev only; 0 for prod)
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
POSTGRES_HOST=localhost
POSTGRES_USER=authoring
POSTGRES_PASSWORD=secure-password
POSTGRES_DB=authoring
POSTGRES_PORT=5432
ASSET_MAX_UPLOAD_BYTES=104857600 (100MB)
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api
VITE_API_MEDIA_URL=http://localhost:8000/media
```
