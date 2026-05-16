# AgentScope

**Local-first observability and debugging platform for AI agents.**

When an AI agent runs, every decision it makes — which tool to call, what the LLM responded, when it retried, why it failed — happens invisibly. AgentScope makes all of it visible. Every step is traced, persisted, and displayed in a live UI that updates as the agent runs.

Think of it as Chrome DevTools + Datadog, but for LangGraph agents running on your machine.

---

## What It Does (Today)

- **Submit a task** to an AI agent from the browser
- **Watch the trace live** — each step appears in real time as the agent works through it
- **Inspect any step** — expand it to see the exact prompt sent and response received
- **Browse past runs** — table of all runs with status, latency, and token count
- **View analytics** — latency trends, token usage, success/failure breakdown — all from real data

---

## Architecture

Three services talk to each other. Each has one job.

```
Browser (Next.js)
     │
     │  REST (runs, traces)       WebSocket (live trace stream)
     ▼
Spring Boot Backend   ──────────────────────────────────────────────┐
     │                                                               │
     │  REST (POST /execute)                                         │
     ▼                                                               │
FastAPI Runtime                                                      │
     │  runs LangGraph agent, calls tools, emits trace events        │
     ▼                                                               │
Ollama (local LLM)                                                   │
                                                                     │
PostgreSQL  ◄────────────────────────────────────────────────────────┘
            stores runs, trace steps, evaluations
```

**How a single run flows:**

1. You type a task in the UI and click "New Run"
2. Frontend `POST /api/runs` → Spring Boot creates a run record (status: `RUNNING`) and calls the FastAPI runtime
3. FastAPI executes a LangGraph workflow: Planner → Tool Selection → Tool Execution → Summarization → Validation
4. After each step, FastAPI calls `POST /api/runs/{id}/traces` — Spring Boot persists it and broadcasts it over WebSocket
5. The frontend receives those WebSocket events and adds each step to the trace timeline in real time
6. When the agent finishes, Spring Boot marks the run `SUCCESS` or `FAILED` with total latency and token count

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query, Zustand, Recharts |
| **Backend** | Java 21, Spring Boot 3.5, JPA, Flyway, WebSocket |
| **Database** | PostgreSQL 16 |
| **AI Runtime** | Python 3.11, FastAPI, LangGraph, Ollama (llama3) |
| **Infrastructure** | Docker Compose |

---

## Prerequisites

Install these once:

| Tool | Version | Notes |
|---|---|---|
| Docker | latest | For running PostgreSQL |
| Java | 21+ | `sdk install java 21-tem` via SDKMAN, or distro package |
| Python | 3.11+ | `pyenv install 3.11` or distro package |
| Node.js | 20+ | `nvm install 20` or from nodejs.org |
| Ollama | latest | `curl -fsSL https://ollama.com/install.sh \| sh` (Linux) |

After installing Ollama, pull the model (one-time, ~4 GB):
```bash
ollama pull llama3
```

---

## First-Time Setup

### 1. Install backend dependencies
The Gradle wrapper handles Java dependencies automatically — nothing to install manually.

### 2. Install Python dependencies
```bash
cd runtime
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
```

### 3. Install frontend dependencies
```bash
cd frontend
npm install
cd ..
```

That's it. The database is handled by Docker and migrations run automatically.

---

## Running the Project

You need 4 terminals (or a terminal multiplexer like tmux).

**Terminal 1 — Database**
```bash
docker compose up -d
```
PostgreSQL starts on port 5432. Check it with `docker compose ps` — wait until status is `healthy`.

**Terminal 2 — Spring Boot Backend**
```bash
cd backend
./gradlew bootRun
```
On first start, Flyway creates all database tables automatically. Ready when you see `Started AgentScopeApplication`.

**Terminal 3 — Python Runtime**
```bash
cd runtime
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```
Ready when you see `Application startup complete`.

**Terminal 4 — Ollama** (skip if Ollama is already running as a system service)
```bash
ollama serve
```

**Terminal 5 — Frontend**
```bash
cd frontend
npm run dev
```

Open **http://localhost:3000** — you'll land on the Runs page.

---

## Database

The database is PostgreSQL, managed entirely by Flyway migrations in `backend/src/main/resources/db/migration/`. You never edit the schema by hand.

**Connection details (defaults, no setup needed):**

| | |
|---|---|
| Host | `localhost:5432` |
| Database | `agentscope` |
| Username | `agentscope` |
| Password | `agentscope` |

These defaults come from `backend/src/main/resources/application.properties` and are matched by the Docker Compose config.

**Tables created by migrations:**

| Table | What it stores |
|---|---|
| `agent_runs` | One row per agent execution — id, task, status, latency, tokens |
| `trace_steps` | One row per step within a run — event type, tool name, prompt, response, latency |
| `evaluations` | Pass/fail scores for runs (used in later phases) |
| `regression_tests` | Auto-generated test cases from failures (used in later phases) |

**Inspect the database directly:**
```bash
# Open a psql shell inside the Docker container (no separate psql install needed)
docker exec -it agentscope-postgres psql -U agentscope -d agentscope

# Useful commands once inside:
\dt                         -- list all tables
\d agent_runs               -- show columns for a table
SELECT * FROM agent_runs;   -- see all runs
\q                          -- exit
```

Or connect with a GUI tool (pgAdmin, TablePlus, DBeaver) using the connection details above.

---

## API Reference

All REST endpoints are served by the Spring Boot backend on port 8080.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/runs` | List all agent runs |
| `GET` | `/api/runs/{id}` | Get a single run |
| `POST` | `/api/runs` | Submit a new task — triggers execution |
| `GET` | `/api/runs/{id}/traces` | Get all trace steps for a run |

WebSocket: `ws://localhost:8080/ws/traces` — streams trace events to connected clients as they are emitted.

**POST /api/runs request body:**
```json
{ "task": "Summarize https://example.com" }
```

**AgentRun response shape:**
```json
{
  "id": "uuid",
  "task": "Summarize https://example.com",
  "status": "SUCCESS",
  "createdAt": "2025-05-16T10:00:00Z",
  "totalLatency": 4200,
  "totalTokens": 831
}
```

---

## Project Structure

```
AgentScope/
├── docker-compose.yml           PostgreSQL container
├── frontend/                    Next.js dashboard
│   └── src/
│       ├── app/                 Pages: /runs, /runs/[id], /analytics
│       ├── components/          UI components (runs, traces, analytics, layout)
│       ├── hooks/               TanStack Query hooks + WebSocket hook
│       ├── store/               Zustand store for live trace state
│       ├── lib/                 API client, query client, utilities
│       └── types/               TypeScript types mirroring backend DTOs
├── backend/                     Spring Boot API + WebSocket server
│   └── src/main/java/com/agentscope/
│       ├── controller/          REST endpoints
│       ├── service/             Business logic
│       ├── model/               JPA entities
│       ├── dto/                 Data transfer objects
│       ├── repository/          Database queries
│       ├── config/              CORS, beans, WebSocket config
│       └── websocket/           WebSocket broadcast handler
│   └── src/main/resources/
│       └── db/migration/        V1–V5 Flyway SQL migrations
└── runtime/                     FastAPI agent execution engine
    └── app/
        ├── main.py              POST /execute endpoint
        ├── workflows/           LangGraph agent graph
        ├── tools/               fetch_website, calculator, file_reader
        ├── tracing/             Trace event emission
        ├── validators/          Output validation
        └── schemas/             Pydantic request/response models
```

---

## Agent Capabilities

The agent has three tools it can invoke:

| Tool | What it does |
|---|---|
| `fetch_website` | Downloads a webpage and returns cleaned text (via BeautifulSoup) |
| `calculator` | Evaluates a math expression |
| `file_reader` | Reads `.txt`, `.md`, or `.pdf` files |

The LangGraph workflow runs these in sequence: Planner → Tool Selection → Tool Execution → Summarization → Validation. If a step fails, it retries up to 3 times — each retry appears as a separate `RETRY_TRIGGERED` trace event.

---

## Service Ports

| Service | Port |
|---|---|
| Frontend (Next.js) | 3000 |
| Backend (Spring Boot) | 8080 |
| Runtime (FastAPI) | 8000 |
| Database (PostgreSQL) | 5432 |
| Ollama | 11434 |

---

## Roadmap

| Phase | What | Status |
|---|---|---|
| 1 | FastAPI runtime — LangGraph agent, tools, trace emission | Done |
| 2 | Spring Boot backend — REST API, PostgreSQL persistence, WebSocket | Done |
| 3 | Next.js frontend — runs table, trace viewer, analytics dashboard | Done |
| 4 | Visual debugger — React Flow execution graph | Planned |
| 5 | Replay system — re-run any past task, diff the outputs | Planned |
| 6 | Failure detection — auto-tag and surface failure reasons | Planned |
| 7 | Autonomous eval generation — auto-create regression tests from failures | Planned |
