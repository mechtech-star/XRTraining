# Integration Verification Checklist

Use this checklist to verify the backend-frontend integration is working correctly.

---

## ✅ Prerequisites

- [ ] Python 3.11+ installed
- [ ] Node.js 18+ installed
- [ ] PostgreSQL running locally (or remote connection available)
- [ ] Both backend and frontend folders present

---

## ✅ Backend Setup

### Installation
- [ ] `cd backend`
- [ ] Created virtual environment: `python -m venv venv`
- [ ] Activated venv: `source venv/Scripts/activate` (Windows: `venv\Scripts\activate`)
- [ ] Installed dependencies: `pip install -r requirements.txt`
- [ ] `.env` file configured with PostgreSQL credentials

### Database
- [ ] PostgreSQL running and accessible
- [ ] Ran migrations: `python manage.py migrate`
- [ ] No migration errors
- [ ] Created superuser: `python manage.py createsuperuser`

### Server
- [ ] Backend running: `python manage.py runserver 0.0.0.0:8000`
- [ ] No errors on startup
- [ ] Can access `http://localhost:8000/admin/` (404 is OK, 500 is not)
- [ ] Can access `http://localhost:8000/api/modules` (empty list is OK)

---

## ✅ Frontend Setup

### Installation
- [ ] `cd frontend`
- [ ] Installed dependencies: `npm install`
- [ ] No installation errors

### Configuration
- [ ] `.env` file exists in frontend root
- [ ] `VITE_API_URL=http://localhost:8000/api` set correctly
- [ ] `VITE_API_MEDIA_URL=http://localhost:8000/media` set correctly

### Server
- [ ] Frontend running: `npm run dev`
- [ ] No errors on startup
- [ ] Can access frontend URL (shown in terminal, usually `http://localhost:5173`)

---

## ✅ API Integration Tests

### Module Creation
- [ ] Go to frontend home → click "Development"
- [ ] Click "Create Module" button
- [ ] Enter module name (e.g., "Test Module")
- [ ] Press Enter or click Create
- [ ] ✅ Should redirect to module editor page
- [ ] ✅ Check Django admin: new Module record created

### Step Management
- [ ] In module editor, click "Add Step"
- [ ] ✅ Step should appear in the grid
- [ ] Edit step title: clear and type "Step 1 Title"
- [ ] Edit step content: type some text
- [ ] ✅ Auto-saves to backend
- [ ] ✅ Check Django admin: Step record created with correct content
- [ ] Click delete (trash icon) on step
- [ ] ✅ Step should disappear from UI
- [ ] ✅ Check Django admin: Step record deleted

### Asset Upload
- [ ] Click "Upload" button in Asset sidebar
- [ ] Select a `.glb` or `.gltf` file (or use one from `training-2/public/gltf/`)
- [ ] ✅ File uploads without errors
- [ ] ✅ Check Django admin: Asset record created
- [ ] ✅ Check filesystem: File exists at `/backend/media/assets/gltf/{uuid}/original.glb`

### Model Assignment
- [ ] After uploading, asset should appear in sidebar
- [ ] Click "Assign" button on an asset
- [ ] ✅ Model should appear in selected step's "3D Model" box
- [ ] ✅ Check Django admin: StepAsset record created

### Publishing
- [ ] Add at least one step with content
- [ ] Optionally assign a model to it
- [ ] Click "Publish" button
- [ ] ✅ Should show success message
- [ ] ✅ Check Django admin: PublishedModule record created with `payload` JSON
- [ ] ✅ Should redirect to develop home

---

## ✅ Database Verification (Django Admin)

Open `http://localhost:8000/admin/` with superuser credentials

### Authoring Module
- [ ] Can see list of created modules
- [ ] Each module shows: title, status, version, created_at
- [ ] Click on a module → see details and related steps

### Authoring Step
- [ ] Can see list of all steps
- [ ] Each step shows: title, module, order_index
- [ ] Steps are ordered by order_index within each module

### Authoring Asset
- [ ] Can see list of uploaded assets
- [ ] Each asset shows: type, mime_type, size_bytes, file path
- [ ] File path follows pattern: `/media/assets/{type}/{uuid}/original.{ext}`

### Authoring Step Asset
- [ ] Can see assignments of assets to steps
- [ ] Each record shows: step, asset, priority

### Authoring Published Module
- [ ] Can see published versions of modules
- [ ] Each record shows: module, version, schema_version, published_at
- [ ] Payload field contains full JSON runtime data

---

## ✅ Error Handling

### Network Error
- [ ] Stop backend server
- [ ] Try to create module in frontend
- [ ] ✅ Should show error message (red box)
- [ ] Restart backend
- [ ] Try again
- [ ] ✅ Should work after backend is back up

### Validation Error
- [ ] Try to upload a non-GLTF file (e.g., .txt)
- [ ] ✅ Should show error: "Only .glb and .gltf files are supported"
- [ ] Upload a valid `.glb` file
- [ ] ✅ Should upload successfully

### Publishing Empty Module
- [ ] Create a new module
- [ ] Try to publish without adding steps
- [ ] ✅ Should show error or disabled button

---

## ✅ Browser DevTools Verification

### Network Tab
- [ ] Module create: `POST /api/modules` → 201 Created
- [ ] Step create: `POST /api/modules/{id}/steps` → 201 Created
- [ ] Asset upload: `POST /api/assets/upload` → 201 Created
- [ ] Step update: `PUT /api/steps/{id}` → 200 OK
- [ ] Module publish: `POST /api/modules/{id}/publish` → 201 Created
- [ ] No 500 errors (internal server errors)
- [ ] No CORS errors

### Console Tab
- [ ] No JavaScript errors (red X icon)
- [ ] No unhandled promise rejections
- [ ] API errors are caught and logged with context

---

## ✅ File System Verification

Check backend media directory:

```
backend/media/
├── assets/
│   ├── gltf/
│   │   ├── {uuid-1}/
│   │   │   └── original.glb
│   │   └── {uuid-2}/
│   │       └── original.gltf
│   └── image/
│       └── ... (if any uploaded)
```

- [ ] Files exist where expected
- [ ] File names are preserved as `original.{ext}`
- [ ] Directory structure follows pattern: `/assets/{type}/{uuid}/`
- [ ] No random renaming

---

## ✅ Complete User Journey

Perform this end-to-end flow:

```
1. Create Module
2. Add Step 1 (with title and content)
3. Add Step 2 (with different title and content)
4. Upload a .glb file
5. Assign the model to Step 1
6. Publish module
7. Verify in Django admin
```

- [ ] Step 1: Module created successfully
- [ ] Step 2: Steps appear in editor
- [ ] Step 3: Steps show different content
- [ ] Step 4: Asset uploads and appears in sidebar
- [ ] Step 5: Model shows in Step 1's 3D Model box
- [ ] Step 6: Publish succeeds, redirect to home
- [ ] Step 7: All records visible in Django admin with correct relationships

---

## ✅ Documentation Verification

- [ ] `QUICKSTART.md` - instructions clear and working
- [ ] `INTEGRATION.md` - API documented with examples
- [ ] `ARCHITECTURE.md` - data flow diagrams make sense
- [ ] `INTEGRATION_SUMMARY.md` - high-level overview complete

---

## ✅ Code Quality

### Backend
- [ ] No Python syntax errors
- [ ] All imports resolve correctly
- [ ] Models have proper relationships (ForeignKey, related_name)
- [ ] Serializers handle response transformation

### Frontend
- [ ] No TypeScript errors (run `npm run build`)
- [ ] API client methods match backend endpoints
- [ ] Error handling in place (try-catch, setError)
- [ ] Loading states update UI
- [ ] Component props properly typed

---

## ✅ Production Readiness (Future)

- [ ] Add authentication (JWT or session tokens)
- [ ] Set `DJANGO_DEBUG=0` for production
- [ ] Configure production database credentials
- [ ] Use environment-specific CORS settings
- [ ] Move media storage to CDN (S3, CloudFront)
- [ ] Add request logging and monitoring
- [ ] Implement rate limiting
- [ ] Add API versioning (/api/v1/)

---

## 🎉 Integration Complete!

If all checkboxes pass, the backend-frontend integration is fully functional and ready for development.

### Next Steps:
1. Review architecture in `ARCHITECTURE.md`
2. Implement missing features (listed in `INTEGRATION_SUMMARY.md`)
3. Set up authentication
4. Deploy to production environment
