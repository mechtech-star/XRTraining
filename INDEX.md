# 📚 Backend-Frontend Integration Index

## Start Here 👈

Read these in order:

1. **[README.md](README.md)** ⭐ - Overview & quick start (5 min read)
2. **[QUICKSTART.md](QUICKSTART.md)** - Terminal commands to run everything (follow exactly)
3. **[VERIFICATION_CHECKLIST.md](VERIFICATION_CHECKLIST.md)** - Verify integration works
4. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Understand data flow & system design
5. **[INTEGRATION.md](INTEGRATION.md)** - Deep dive API documentation
6. **[INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md)** - What's implemented vs. what's left

---

## 📂 Project Structure

```
XR Training/
├── backend/                ← Django + DRF + PostgreSQL
│   ├── authoring/         (Main app with all models/views/serializers)
│   ├── backend/           (Django project settings)
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env               (Database credentials)
│   └── README.md
│
├── frontend/              ← React + TypeScript + Vite
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.ts     ← **KEY FILE: API client**
│   │   │   └── config.ts
│   │   ├── pages/develop/
│   │   │   ├── homedevelop.tsx
│   │   │   └── createmodule.tsx
│   │   └── components/
│   ├── .env               (API URLs)
│   ├── package.json
│   └── vite.config.ts
│
├── README.md              ← Overview (start here)
├── QUICKSTART.md          ← Terminal setup
├── ARCHITECTURE.md        ← Diagrams & data flow
├── INTEGRATION.md         ← API reference
├── INTEGRATION_SUMMARY.md ← Features list
└── VERIFICATION_CHECKLIST.md ← Testing guide
```

---

## 🚀 Quick Setup (5 minutes)

### Backend (Terminal 1)
```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```

**Then open:** `http://localhost:5173`

---

## 📖 Documentation Guide

### For Developers Implementing Features
→ Read **[INTEGRATION.md](INTEGRATION.md)**
- API endpoint specifications
- Request/response examples
- Error handling patterns

### For Understanding Architecture
→ Read **[ARCHITECTURE.md](ARCHITECTURE.md)**
- System diagrams
- Data flow examples
- Component hierarchy
- Type transformations

### For Testing the System
→ Read **[VERIFICATION_CHECKLIST.md](VERIFICATION_CHECKLIST.md)**
- Step-by-step test cases
- Expected results for each feature
- Troubleshooting guide

### For High-Level Overview
→ Read **[INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md)**
- What was implemented
- What's working
- What's still needed
- Key files changed

---

## 🎯 API at a Glance

| Feature | Endpoint | Method | Frontend Handler |
|---------|----------|--------|------------------|
| Create Module | `/api/modules` | POST | `homedevelop.tsx` |
| Add Step | `/api/modules/{id}/steps` | POST | `createmodule.tsx` |
| Update Step | `/api/steps/{id}` | PUT | `createmodule.tsx` |
| Delete Step | `/api/steps/{id}` | DELETE | `createmodule.tsx` |
| Upload Asset | `/api/assets/upload` | POST | `homedevelop.tsx` |
| Assign Model | `/api/steps/{id}/assets` | POST | `createmodule.tsx` |
| Publish Module | `/api/modules/{id}/publish` | POST | `createmodule.tsx` |
| Get Runtime | `/api/modules/{id}/runtime` | GET | (Operate mode) |

---

## 💾 Data Persistence

Every user action immediately writes to PostgreSQL:

```
User clicks button
    ↓
Frontend calls apiClient.method()
    ↓
HTTP request to backend
    ↓
Django validates & saves to DB
    ↓
Response returned to frontend
    ↓
UI updates
    ↓
✅ Data persisted
```

---

## 📁 Key Files to Know

### **Backend**
| File | Purpose |
|------|---------|
| `backend/settings.py` | Django config, CORS, media paths, DB connection |
| `authoring/models/*.py` | Data models (Module, Step, Asset, etc.) |
| `authoring/views/*.py` | Request handlers (CRUD operations) |
| `authoring/serializers/*.py` | JSON serialization (request validation, response formatting) |
| `authoring/services/publish_service.py` | Publishing logic (compile payloads, version control) |
| `authoring/urls.py` | API endpoint routing |

### **Frontend**
| File | Purpose |
|------|---------|
| `src/lib/api.ts` | **Centralized API client** - all backend calls go here |
| `src/lib/config.ts` | Environment configuration (API URLs) |
| `src/pages/develop/homedevelop.tsx` | Home page (module list, asset upload) |
| `src/pages/develop/createmodule.tsx` | Module editor (steps, assets, publish) |
| `src/components/pagecomponents/*.tsx` | Reusable UI components |

---

## 🔧 Environment Configuration

### Backend `.env`
```env
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=1                          # 0 for production
DJANGO_ALLOWED_HOSTS=*
POSTGRES_HOST=localhost
POSTGRES_USER=authoring
POSTGRES_PASSWORD=your_password
POSTGRES_DB=authoring
POSTGRES_PORT=5432
ASSET_MAX_UPLOAD_BYTES=104857600        # 100MB
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:8000/api
VITE_API_MEDIA_URL=http://localhost:8000/media
```

---

## ✅ Integration Status

### Implemented ✅
- Module CRUD (create, read, update)
- Step CRUD (create, read, update, delete)
- Asset upload with validation
- Asset assignment to steps
- Module publishing (immutable versioning)
- Error handling & user feedback
- Loading states
- Real-time persistence

### Not Yet Implemented ❌
- Module deletion
- Module list endpoint
- Asset deletion endpoint
- Step reordering UI integration
- Operate mode (runtime consumption)
- User authentication
- Asset metadata (thumbnails, dimensions)

---

## 🧪 Testing Workflow

1. **Setup:** Follow QUICKSTART.md
2. **Verify:** Use VERIFICATION_CHECKLIST.md
3. **End-to-End Test:**
   - Create module
   - Add 2 steps with content
   - Upload a `.glb` file
   - Assign model to a step
   - Publish
   - Check Django admin

---

## 🐛 Troubleshooting

### Backend won't start
- Is PostgreSQL running? Check: `psql --version`
- Are dependencies installed? Run: `pip install -r requirements.txt`
- Did you run migrations? Run: `python manage.py migrate`

### Frontend showing errors
- Check browser DevTools Network tab for failed requests
- Verify `VITE_API_URL` in `.env` matches backend address
- Is backend running? Check: `curl http://localhost:8000/api/modules`

### Assets not uploading
- Only `.glb` and `.gltf` files are supported
- File size must be < 100MB (configurable in backend `.env`)
- Check `/backend/media/` directory exists and is writable

### Data not persisting
- Check database connection in backend `.env`
- Run: `python manage.py migrate`
- Check Django admin shows created records

See **[INTEGRATION.md](INTEGRATION.md)** for more troubleshooting.

---

## 🎓 Learning Path

### Beginner
1. Read README.md
2. Follow QUICKSTART.md
3. Create your first module via UI
4. Check Django admin to see saved data

### Intermediate
1. Read ARCHITECTURE.md diagrams
2. Open browser DevTools to watch API calls
3. Modify a step and watch it save
4. Study the data flow in INTEGRATION.md

### Advanced
1. Review `src/lib/api.ts` - understand API client
2. Review `authoring/views/*.py` - understand request handling
3. Review `authoring/services/publish_service.py` - understand publishing
4. Add a new feature following the same pattern

---

## 📞 API Integration Example

```typescript
// From src/lib/api.ts
import { apiClient } from './lib/api'

// Create a module
const newModule = await apiClient.createModule('My Module', 'Description')
console.log(newModule.id)  // UUID

// Create a step in that module
const newStep = await apiClient.createStep(
    newModule.id,
    'Step 1',
    'This is the step content',
    false
)
console.log(newStep.id)  // UUID

// Upload a 3D model
const file = new File(['...'], 'model.glb', { type: 'model/gltf-binary' })
const asset = await apiClient.uploadAsset(file, 'gltf')
console.log(asset.url)  // /media/assets/gltf/{uuid}/original.glb

// Assign model to step
await apiClient.assignAssetToStep(newStep.id, asset.id, 0)

// Publish the module
const published = await apiClient.publishModule(newModule.id)
console.log(published.version)  // 2
```

---

## 🌟 Next Steps

1. **Run the system** - Follow QUICKSTART.md
2. **Verify it works** - Follow VERIFICATION_CHECKLIST.md
3. **Understand it** - Read ARCHITECTURE.md
4. **Extend it** - Implement missing features from INTEGRATION_SUMMARY.md
5. **Deploy it** - Move to production (see INTEGRATION.md)

---

## 📊 Feature Matrix

| Feature | Backend | Frontend | Integrated | Tested |
|---------|---------|----------|-----------|--------|
| Create Module | ✅ | ✅ | ✅ | ✅ |
| Get Module | ✅ | ✅ | ✅ | ✅ |
| Update Module | ✅ | ❌ | ❌ | ❌ |
| Delete Module | ✅ | ❌ | ❌ | ❌ |
| Add Step | ✅ | ✅ | ✅ | ✅ |
| Update Step | ✅ | ✅ | ✅ | ✅ |
| Delete Step | ✅ | ✅ | ✅ | ✅ |
| Upload Asset | ✅ | ✅ | ✅ | ✅ |
| Assign Asset | ✅ | ✅ | ✅ | ✅ |
| Publish Module | ✅ | ✅ | ✅ | ✅ |
| Get Runtime | ✅ | ❌ | ❌ | ❌ |

---

**Happy integrating! 🚀 Questions? Check the relevant doc above.**
