# 🎓 CampusAI

CampusAI is a **production-ready, multi-tenant RAG chatbot platform** designed for universities. Each institution gets its own AI assistant that answers questions based solely on their official website content and documents — no hallucinations from outside data.

## ✨ Key Highlights

| Feature | Details |
|---|---|
| 🕷️ **Auto-scraping** | Crawls university websites and PDFs on demand or schedule |
| 🧠 **RAG Pipeline** | Semantic search with Qdrant vector DB — answers grounded in real documents |
| 🏫 **Multi-university** | Onboard any university via config; fully isolated data per tenant |
| 🔐 **Role-based access** | Super Admin / University Admin / Student |
| ⚡ **Async jobs** | Celery + Redis for non-blocking scrape tasks |
| 📊 **Admin dashboards** | Manage universities, users, documents, and scrape jobs |
| 🔌 **Swappable backends** | OpenAI, Claude (Anthropic), or Ollama for LLM + embeddings |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CampusAI                             │
│                                                             │
│  ┌─────────────┐     ┌──────────────┐     ┌─────────────┐  │
│  │  Next.js    │────▶│  FastAPI     │────▶│  Qdrant     │  │
│  │  Frontend   │     │  Backend     │     │  Vector DB  │  │
│  └─────────────┘     └──────┬───────┘     └─────────────┘  │
│                             │                               │
│                      ┌──────▼───────┐     ┌─────────────┐  │
│                      │  PostgreSQL  │     │  Redis      │  │
│                      │  (metadata)  │     │  (broker)   │  │
│                      └─────────────┘     └──────┬──────┘  │
│                                                  │          │
│                                          ┌───────▼──────┐  │
│                                          │  Celery      │  │
│                                          │  Worker      │  │
│                                          └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend API | FastAPI (Python 3.12) |
| Database | PostgreSQL (SQLAlchemy ORM) |
| Vector Store | Qdrant |
| Cache / Broker | Redis |
| Task Queue | Celery |
| LLM | OpenAI GPT / Anthropic Claude / Ollama (configurable) |
| Embeddings | OpenAI `text-embedding-3-small` / Sentence-Transformers |

---

## 🗂️ Project Structure

```
CampusAI/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py             # App entrypoint
│   │   ├── config.py           # Settings (pydantic-settings)
│   │   ├── database.py         # SQLAlchemy engine + session
│   │   ├── models/             # ORM models
│   │   │   ├── university.py
│   │   │   ├── user.py
│   │   │   ├── document.py
│   │   │   └── scrape_job.py
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── routers/            # FastAPI route handlers
│   │   │   ├── auth.py         # /auth/login, /auth/register, /auth/me
│   │   │   ├── universities.py # CRUD for universities
│   │   │   ├── users.py        # CRUD for users
│   │   │   ├── documents.py    # Document listing + deletion
│   │   │   ├── scraping.py     # Trigger + monitor scrape jobs
│   │   │   └── chat.py         # RAG chat endpoint
│   │   ├── services/
│   │   │   ├── auth.py         # JWT helpers, password hashing
│   │   │   ├── rag.py          # RAG pipeline (retrieve + generate)
│   │   │   ├── scraper.py      # Web + PDF scraper
│   │   │   ├── vector_store.py # Qdrant operations
│   │   │   ├── embeddings.py   # Embedding backend abstraction
│   │   │   └── llm.py          # LLM backend abstraction
│   │   └── tasks/
│   │       ├── celery_app.py   # Celery configuration
│   │       └── scraping.py     # Async scrape task
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                   # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # Landing page
│   │   │   ├── auth/login/         # Login page
│   │   │   ├── auth/register/      # Registration page
│   │   │   ├── chat/               # Student chat interface
│   │   │   ├── admin/              # Super Admin dashboard
│   │   │   └── university-admin/   # University Admin dashboard
│   │   ├── lib/api.ts          # Axios API client
│   │   └── types/index.ts      # TypeScript interfaces
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml          # Full stack deployment
├── .env.example                # Environment variable template
└── README.md
```

---

## 🚀 Quick Start

### 1. Clone & configure

```bash
git clone https://github.com/Dhruti832/CampusAI.git
cd CampusAI
cp .env.example .env
# Edit .env — at minimum, set your OPENAI_API_KEY
```

### 2. Launch with Docker Compose

```bash
docker compose up --build
```

Services started:

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Qdrant Dashboard | http://localhost:6333/dashboard |

### 3. Seed a Super Admin (first-time only)

```bash
# POST /api/v1/auth/register with role=super_admin
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"changeme","full_name":"Super Admin","role":"super_admin"}'
```

> **Note:** After the first super admin is created you should remove the ability to self-register with `role=super_admin` in production.

---

## 🏫 Onboarding a University

1. **Log in** as Super Admin → go to `/admin`
2. Click **Add University** → enter name, URL-safe slug, and website URL
3. Click **🕷️ Scrape** — CampusAI will crawl the site and index all content into Qdrant
4. Create a **University Admin** account and assign it to the new university
5. Students can **register** and select their university

---

## 🔐 Role Matrix

| Action | Super Admin | University Admin | Student |
|---|---|---|---|
| Manage universities (CRUD) | ✅ | ❌ | ❌ |
| Trigger scrape jobs | ✅ | ✅ (own uni) | ❌ |
| Manage university users | ✅ | ✅ (own uni) | ❌ |
| View documents | ✅ | ✅ (own uni) | ✅ (own uni) |
| Chat with AI | ✅ | ✅ | ✅ |

---

## 🔌 Swapping LLM / Embedding Backends

Set in `.env`:

```bash
# OpenAI (default)
LLM_BACKEND=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Anthropic Claude
LLM_BACKEND=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-haiku-20240307

# Ollama (local)
LLM_BACKEND=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# Sentence-Transformers embeddings (no API key needed)
EMBEDDING_BACKEND=sentence-transformers
EMBEDDING_MODEL=all-MiniLM-L6-v2
EMBEDDING_DIM=384
```

---

## 🛠️ Local Development (without Docker)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Celery worker (separate terminal)
celery -A app.tasks.celery_app.celery_app worker --loglevel=info

# Frontend
cd frontend
npm install
npm run dev
```

Make sure PostgreSQL, Redis, and Qdrant are running locally or via Docker:

```bash
docker compose up postgres redis qdrant -d
```

---

## 📡 API Reference

Interactive docs available at **http://localhost:8000/docs** (Swagger UI).

Key endpoints:

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register a user |
| `POST` | `/api/v1/auth/login` | Login → JWT token |
| `GET` | `/api/v1/auth/me` | Current user profile |
| `GET` | `/api/v1/universities/` | List universities |
| `POST` | `/api/v1/universities/` | Create university (Super Admin) |
| `POST` | `/api/v1/scrape-jobs/` | Trigger scrape job |
| `GET` | `/api/v1/scrape-jobs/` | List scrape jobs |
| `POST` | `/api/v1/chat/` | Send a chat message |
| `GET` | `/api/v1/documents/` | List indexed documents |

