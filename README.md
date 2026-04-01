# AI Digital Classroom (Starter Codebase)

Production-oriented starter for an AI-enabled classroom platform with role-based login, assignment workflow, RAG doubt solving, analytics, and leaderboard generation.

## Services
- `client` - React + Vite web app (`http://localhost:5173`)
- `server` - Node.js + Express API (`http://localhost:5000`)
- `microservices/ai-service` - FastAPI AI service (`http://localhost:8000`)
- `mongo` - MongoDB (`mongodb://localhost:27017`)
- `chroma` - Chroma vector DB (`http://localhost:8001`)

## Quick Start (Docker)

1. Copy env files (already included by default in this scaffold):
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
cp microservices/ai-service/.env.example microservices/ai-service/.env
```

2. Start full stack:
Install Docker App first. Then:
```bash
docker compose up --build
```

3. Open:
- Web: `http://localhost:5173`
- API health: `http://localhost:5000/api/health`
- AI health: `http://localhost:8000/health`

## Local Run (without Docker)

### Backend API
```bash
cd server
npm install
npm run dev
```

### AI Service
```bash
cd microservices/ai-service
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd client
npm install
npm run dev
```

## Implemented Core Features (v1)
- Role inference on login/register via email (`prof/faculty/...` => professor, `student/ug/pg/...` => student)
- JWT auth and role-based route protection
- Professor material upload and AI vector ingestion
- Assignment creation
- Student assignment submission (PDF/DOCX upload)
- AI evaluation pipeline (marks, feedback, mistakes, suggestions)
- RAG doubt solving constrained to course materials
- Doubt quality scoring
- Announcements
- Leaderboard recomputation and retrieval
- Course analytics endpoint (weak students, struggling topics, teaching suggestions)

## Key API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Materials and Assignments
- `POST /api/materials` (professor)
- `GET /api/materials/course/:courseId`
- `POST /api/assignments` (professor)
- `GET /api/assignments/course/:courseId`

### Student Learning Flow
- `POST /api/submissions/:assignmentId/upload` (student)
- `POST /api/doubts/ask` (student)

### Classroom Management
- `POST /api/announcements` (professor)
- `GET /api/announcements/course/:courseId`
- `POST /api/leaderboard/:courseId/recompute` (professor)
- `GET /api/leaderboard/:courseId`
- `GET /api/analytics/:courseId` (professor)

## Sample cURL

### Register Professor
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Dr Rao","email":"faculty.dbms@college.edu","password":"pass123"}'
```

### Register Student
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Aman","email":"student.ug23@college.edu","password":"pass123"}'
```

## Notes
- File storage is local in this starter (`server/uploads`). Replace `utils/storage.js` with S3/Firebase adapter for production.
- Assignment evaluation currently uses rubric-coverage heuristics in AI service; replace with full document parsing + LLM scoring for production.
- RAG indexing currently accepts `materialText`; add PDF/PPT parser in material ingestion workflow for full automation.

## Documentation
- `docs/SYSTEM_ARCHITECTURE.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/FOLDER_STRUCTURE.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/AI_WORKFLOW.md`
- `docs/TECH_STACK.md`
