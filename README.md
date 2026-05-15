# AgentScope

> Local-first AI Agent Observability, Debugging, and Evaluation Platform

AgentScope is infrastructure for AI agents — not another chatbot wrapper.
When an agent runs, every step is traced, stored, and made inspectable through a visual UI.
Think Chrome DevTools + Datadog, but for AI agents running locally.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js, React, Tailwind, shadcn/ui, React Flow, Zustand, TanStack Query |
| Backend | Java Spring Boot, PostgreSQL, Flyway, Redis (optional) |
| AI Runtime | Python FastAPI, LangGraph, Ollama |
| Infra | Docker Compose, Prometheus, Grafana |

---

## Quick Start

```bash
# Start infrastructure
docker compose up -d

# Backend (Terminal 1)
cd backend && ./gradlew bootRun

# Runtime (Terminal 2)
cd runtime && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000

# Frontend (Terminal 3)
cd frontend && npm run dev
```

Open `http://localhost:3000`.
