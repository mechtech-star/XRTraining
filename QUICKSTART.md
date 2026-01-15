# Quick Start: Running Backend + Frontend

## Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 12+ (running locally or remote connection)

---

## Backend Startup (Terminal 1)

```bash
cd backend

# Create virtual environment (first time only)
python -m venv venv

# Activate it
source venv/Scripts/activate  # or: venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Set up database connection in .env
# Edit .env with your PostgreSQL credentials:
# POSTGRES_HOST=localhost
# POSTGRES_USER=authoring
# POSTGRES_PASSWORD=your_password
# POSTGRES_DB=authoring

# Run migrations
python manage.py migrate

# Create admin user (optional, for Django admin at /admin)
python manage.py createsuperuser

# Start development server
python manage.py runserver 0.0.0.0:8000
```

**Backend is now running at:** `http://localhost:8000`
- Admin panel: `http://localhost:8000/admin`
- API base: `http://localhost:8000/api`

---

## Frontend Startup (Terminal 2)

```bash
cd frontend

# Install dependencies
npm install

# Ensure .env is configured (already provided)
# VITE_API_URL should be: http://localhost:8000/api

# Start dev server
npm run dev
```

**Frontend is now running at:** `http://localhost:5173` (or displayed in terminal)

---

## Test the Integration

1. Open frontend: `http://localhost:5173`
2. Click **"Development"** mode
3. Click **"Create Module"** button
4. Enter a module name → should create and redirect to module editor
5. Click **"Add Step"** → should add a step to the module
6. Edit step content → should auto-save to backend
7. Try uploading a `.glb` or `.gltf` file → should upload to backend
8. Click **"Publish"** → should create immutable published version

---

## Verify Backend Database

Open Django admin to see created data:
```
http://localhost:8000/admin/
```

Login with superuser credentials created earlier. You'll see:
- **Modules** - Your created modules
- **Steps** - Steps added to each module
- **Assets** - Uploaded 3D models
- **Published Modules** - Published versions (immutable)

---

## Troubleshooting

### Backend: "ModuleNotFoundError: No module named 'django'"
- Did you activate the venv? Check: `python -m pip list | grep Django`
- If not installed: `pip install -r requirements.txt`

### Backend: "psycopg2 connection refused"
- Is PostgreSQL running? 
  - Windows: `sc query postgresql` or check Services
  - macOS: `brew services list | grep postgres`
  - Linux: `systemctl status postgresql`
- Check credentials in `.env` match your DB setup

### Frontend: Blank page or stuck loading
- Check browser DevTools Network tab for failed requests
- Verify `VITE_API_URL` in `.env` is reachable: `curl http://localhost:8000/api/modules`
- Restart frontend dev server: `Ctrl+C` then `npm run dev`

### Module creation fails
- Check backend console for errors
- Open browser DevTools → Network tab → check POST /api/modules response
- Ensure database migrations ran: `python manage.py migrate`

---

## Environment Files

### Backend (`.env`)
```
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=1
POSTGRES_HOST=localhost
POSTGRES_USER=authoring
POSTGRES_PASSWORD=your_password
POSTGRES_DB=authoring
```

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:8000/api
VITE_API_MEDIA_URL=http://localhost:8000/media
```

---

## Key API Endpoints

| Purpose | Method | URL |
|---------|--------|-----|
| Create module | POST | /api/modules |
| Get module details | GET | /api/modules/{id} |
| Create step | POST | /api/modules/{moduleId}/steps |
| Update step | PUT | /api/steps/{stepId} |
| Delete step | DELETE | /api/steps/{stepId} |
| Upload asset | POST | /api/assets/upload |
| Assign asset to step | POST | /api/steps/{stepId}/assets |
| Publish module | POST | /api/modules/{moduleId}/publish |
| Get runtime payload | GET | /api/modules/{moduleId}/runtime |

---

## Production Deployment

See [INTEGRATION.md](./INTEGRATION.md) for production considerations and upcoming enhancements.
