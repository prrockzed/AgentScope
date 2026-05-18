# AgentScope

**Local-first observability and debugging platform for AI agents.**

When an AI agent runs, every decision it makes — which tool to call, what the LLM responded, when it retried, why it failed — happens invisibly. AgentScope makes all of it visible. Every step is traced, persisted, and displayed in a live UI that updates as the agent runs.

Think of it as Chrome DevTools + Datadog, but for LangGraph agents running on your machine.

---

## Features

- **Multi-agent support** — choose from 5 built-in agents (Tool Agent, Direct Answer, Chain of Thought, Summariser, Critic Agent); set a default in Settings or pick a different one per run with the "Run as…" button; each run records which agent executed it
- **Model selection** — choose which Ollama model to use per run from a curated list (6 models); set a default in Settings or override it per run with the "Model ▾" button in the New Run dialog; models not yet pulled from Ollama are shown with a "not pulled" badge; the model used is stored with every run
- **Live trace viewer** — submit a task and watch every step appear in real time; each step shows event type, tool name, latency, token count, and full prompt/response
- **Step inspection** — expand any trace step to read the exact prompt sent to the LLM and the exact response received
- **Run history** — searchable, filterable table of all runs with status, latency, token count, model, and agent columns; filter by status, date range, latency, or token count
- **Analytics dashboard** — latency trends, token usage over time, and success/failure breakdown — all derived from real run data
- **Run replay** — re-execute any past run with the same task; navigates live to the new run's trace
- **Side-by-side run comparison** — diff view aligns steps by number and highlights where status, event type, or tool name changed; a summary banner shows how many steps differ
- **Automatic failure detection** — every failed run is tagged with a reason code (`EMPTY_RESPONSE`, `MALFORMED_JSON`, `TIMEOUT`); surfaced via a red banner, highlighted timeline steps, and graph node outlines
- **Autonomous eval generation** — failed runs automatically create a regression test and a failing evaluation; when the same task later passes, the evaluation flips to passing; the Evaluations page tracks all regression tests with live `PASSING` / `FAILING` / `UNTESTED` status
- **Baseline comparison & regression scoring** — every replay run is automatically scored against its original: latency delta, token delta, and retry delta are computed and combined into a regression score (0.0 = improvement, 1.0 = severe regression); the `/evaluations` Comparisons tab shows colour-coded delta cells (red = regressed, green = improved) and a score badge per comparison; comparisons are idempotent — replaying twice never creates a duplicate row
- **Saved Runs** — bookmark any completed run; saved runs appear in a dedicated page with links back to the original trace; saving is a lightweight pointer — no data is duplicated
- **Optimization Advisor** — after every run, rule-based heuristics automatically fire and write actionable suggestions (latency, retries, token usage, failure type); on demand, click "Analyse with AI" in the trace viewer to call the Groq API (`llama-3.3-70b-versatile`) for deeper AI-powered suggestions; all suggestions live on the `/optimizations` page with severity badges, category labels, and per-run filtering; once AI analysis is done the button turns green and links directly to the AI Analysis tab
- **Operational Knowledge Base** — every completed run feeds a growing intelligence layer visible on the `/knowledge` page: successful and failed workflow patterns are recorded with rolling-average latency and token stats; per-model aggregate stats (total runs, success rate, avg latency, avg tokens) show objectively which models perform best with colour-coded badges; optimization suggestions are aggregated by category so recurring problem types surface immediately; before each run the backend assembles a context string from prior patterns for that exact task and injects it into the agent's prompt so agents are guided by what the system already knows — on a fresh database nothing is injected and the system learns progressively; all four data sets are backfilled automatically from existing run history on first start
- **Prometheus + Grafana monitoring** — runs, latency, tokens, and failure reasons are emitted as metrics; a pre-built Grafana dashboard at `http://localhost:3001` shows 8 live panels across Summary stats, Throughput & Latency, and Token Usage & Failure Reasons

---

## Architecture

Three services talk to each other. Each has one job.

```
Browser (Next.js)
     │
     │  REST (runs, traces)       WebSocket (live trace stream)
     ▼
Spring Boot Backend   ───────────────────────────────────────────────┐
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
7. Spring Boot runs failure detection — if the run failed, it tags the run with a reason code
8. Spring Boot runs eval generation — if the run failed, a regression test and a failing evaluation are created automatically; if the run succeeded and a regression test already exists for that task, a passing evaluation is recorded
9. Spring Boot runs the Optimization Advisor — rule-based heuristics fire automatically and write 0–N suggestions to `optimization_suggestions`; on demand the user can also trigger AI analysis via Groq
10. If the run is a replay, Spring Boot computes a regression score against the baseline run — latency/token/retry deltas are stored in `regression_results` alongside a weighted score from 0.0 to 1.0
11. Spring Boot records the run into the knowledge base — successful runs upsert into `successful_patterns` (rolling avg latency + tokens); failed runs upsert into `failure_patterns` (keyed by failure reason); model stats are upserted into `model_insights` (rolling avg latency + tokens, success/failure counts); all four sections are visible on the `/knowledge` page
12. Before the next run on the same task, the backend queries the knowledge base and prepends a context block to the agent's prompt — so agents improve over time without any code changes

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query, Zustand, Recharts |
| **Backend** | Java 21, Spring Boot 3.5, JPA, Flyway, WebSocket |
| **Database** | PostgreSQL 16 |
| **AI Runtime** | Python 3.11, FastAPI, LangGraph, LangChain-Ollama |
| **LLM** | Ollama (local) — model chosen per run from a curated list; default persisted in browser localStorage |
| **AI Analysis** | Groq API (`llama-3.3-70b-versatile`) — on-demand optimization suggestions; key loaded from `.env` |
| **Infrastructure** | Docker Compose (all services containerised) |
| **Monitoring** | Prometheus 2.54, Grafana 11.2, Micrometer (Spring Boot), prometheus-fastapi-instrumentator (FastAPI) |

---

## Prerequisites

**Required on your machine:**

| Tool | Install |
|---|---|
| Docker + Docker Compose | [docs.docker.com/get-docker](https://docs.docker.com/get-docker) |
| Ollama | See below |

**Ollama install (one-time):**

| OS | Command |
|---|---|
| Linux | `curl -fsSL https://ollama.com/install.sh \| sh` |
| macOS | Download from [ollama.com](https://ollama.com) or `brew install ollama` |
| Windows | Download installer from [ollama.com](https://ollama.com) |

**Pull at least one model and start Ollama (one-time):**
```bash
# Pull any model(s) from the supported list — qwen3:4b is a good starting point
ollama pull qwen3:4b

# Linux: bind to all interfaces so Docker containers can reach it
OLLAMA_HOST=0.0.0.0 ollama serve

# macOS / Windows: Docker Desktop handles host routing automatically
ollama serve
```

Java, Python, and Node.js are **not required** to run the project — everything runs inside Docker.

---

## Running the Project

**Optional — Groq API key (for AI-powered optimization suggestions):**

Get a free key at [console.groq.com](https://console.groq.com), then create a `.env` file at the project root (already in `.gitignore`):
```bash
echo "GROQ_API_KEY=gsk_..." > .env
```
Without this key, rule-based suggestions still work — only the "Analyse with AI" button has no effect.

A single command builds all images and starts all services:

```bash
docker compose up --build
```

Open **http://localhost:3000** — you'll land on the Runs page.

Prometheus scrapes metrics at **http://localhost:9090** and Grafana serves the live dashboard at **http://localhost:3001** (login: `admin` / `admin` → Dashboards → AgentScope).

On subsequent runs (no code changes), skip the rebuild:
```bash
docker compose up
```

### Stopping and taking down

```bash
# Stop all containers — frees all ports, data is preserved
docker compose stop

# Restart stopped containers (no rebuild)
docker compose start

# Remove containers entirely — data is still preserved
docker compose down

# Remove containers AND wipe all data (PostgreSQL volume deleted)
docker compose down -v
```

PostgreSQL data lives in the `postgres_data` named Docker volume. It survives `stop`, `start`, and `down`. Only `down -v` deletes it.

### Supported models

The model is chosen in the UI — no env vars or restarts needed. Six models are available out of the box:

| ID | Name | Description |
|---|---|---|
| `tinyllama:latest` | TinyLlama | Ultra-light model for quick prototyping |
| `qwen3:4b` | Qwen3 4B | Fast, balanced — good default for most tasks |
| `qwen3:8b` | Qwen3 8B | Larger Qwen3; better reasoning, slower |
| `llama3.2:3b` | Llama 3.2 3B | Meta's compact Llama — very fast |
| `llama3.1:8b` | Llama 3.1 8B | Meta's capable 8B Llama |
| `mistral:7b` | Mistral 7B | Strong general-purpose model |

**How model selection works:**

- **Default:** go to `/settings` → Default Model section → click a model → "Set as Default". The choice is saved in browser localStorage.
- **Per run:** open the New Run dialog → click **Model ▾** → pick any model. This overrides the default for that run only.
- **Availability:** `GET /api/models` queries Ollama in real time. Models that have not been pulled yet show a `not pulled` badge in the dropdown and the Settings page and cannot be selected.
- **To add a model:** pull it with `ollama pull <id>` and add an entry to `runtime/app/models.py`. No service restart is needed for availability to update (the check runs on every request).
- **To add it permanently to the list:** edit `SUPPORTED_MODELS` in `runtime/app/models.py` — that is the only file to change.

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
| `agent_runs` | One row per agent execution — id, task, status, latency, tokens, failure reason, model |
| `trace_steps` | One row per step within a run — event type, tool name, prompt, response, latency |
| `evaluations` | Pass/fail scores per run — score `1.0` = passing, `0.0` = failing |
| `regression_tests` | Auto-generated test cases from failures — input, expected failure reason, type (`AUTO`/`MANUAL`) |
| `saved_runs` | Bookmarked run references — pointer to `agent_runs`, timestamp of when it was saved |
| `optimization_suggestions` | Rule-based and AI-generated suggestions per run — category, severity, suggestion text, source (`RULE`\|`AI`) |
| `regression_results` | One row per replay run — latency/token/retry deltas against baseline, weighted regression score 0.0–1.0 |
| `successful_patterns` | Aggregated successful run patterns — rolling avg latency and tokens per `(task, agent_type, model)` combo with occurrence count |
| `failure_patterns` | Aggregated failure patterns — occurrence count per `(task, agent_type, model, failure_reason)` combo |
| `model_insights` | Per-model aggregate stats — total runs, success/failure counts, rolling avg latency and tokens; UNIQUE on `model`; backfilled from existing runs on first start |

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
| `GET` | `/api/agents` | List all registered agents (id, name, description) |
| `GET` | `/api/models` | List all supported models with live `available` flag (proxied from runtime → Ollama) |
| `GET` | `/api/runs` | List all agent runs |
| `GET` | `/api/runs/{id}` | Get a single run |
| `POST` | `/api/runs` | Submit a new task — triggers execution |
| `POST` | `/api/runs/{id}/replay` | Re-run a past task; returns new run linked to original |
| `GET` | `/api/runs/{id}/traces` | Get all trace steps for a run |
| `GET` | `/api/runs/{id}/saved` | Check whether a run is saved — returns `{"saved": true/false}` |
| `POST` | `/api/runs/{id}/save` | Save a run — idempotent; returns `SavedRunDto` (201) |
| `DELETE` | `/api/runs/{id}/save` | Unsave a run (204) |
| `GET` | `/api/saved-runs` | List all saved runs ordered newest-first |
| `GET` | `/api/regression-tests` | List all regression tests with derived `latestStatus` |
| `POST` | `/api/runs/{id}/eval` | Manually trigger eval generation for a failed run |
| `GET` | `/api/optimizations` | List all optimization suggestions newest-first |
| `GET` | `/api/runs/{id}/optimizations` | List optimization suggestions for a single run |
| `POST` | `/api/runs/{id}/optimizations/ai` | Trigger on-demand Groq AI analysis for a run (idempotent) |
| `GET` | `/api/regression-results` | List all regression comparison results newest-first (denormalised: includes task, models, agent types) |
| `GET` | `/api/memory/patterns` | Returns `{ successfulPatterns, failurePatterns }` — both lists sorted by occurrence count descending |
| `GET` | `/api/knowledge/summary` | Returns `{ successfulPatterns, failurePatterns, modelInsights, optimizationLearnings }` — the full knowledge base in one call |
| `GET` | `/api/knowledge/context` | Returns the knowledge context string for a given `?task=` (and optional `&model=`); empty string if no prior history exists for that task |

WebSocket: `ws://localhost:8080/ws/traces` — streams trace events to connected clients as they are emitted.

**POST /api/runs request body:**
```json
{ "task": "Summarize https://example.com", "agentType": "summariser", "model": "qwen3:4b" }
```
`agentType` is optional and defaults to `"tool_agent"`. `model` is required — the frontend always sends it from the user's selection.

**AgentRun response shape:**
```json
{
  "id": "uuid",
  "task": "Summarize https://example.com",
  "status": "SUCCESS",
  "createdAt": "2025-05-16T10:00:00Z",
  "totalLatency": 4200,
  "totalTokens": 831,
  "replayOf": null,
  "failureReason": null,
  "model": "qwen3:4b",
  "agentType": "summariser"
}
```
Replay runs have `"replayOf": "<original-run-uuid>"`. Normal runs have `"replayOf": null`. Failed runs have `"failureReason"` set to one of `EMPTY_RESPONSE`, `MALFORMED_JSON`, `TIMEOUT`, or `RUNTIME_ERROR`.

---

## Project Structure

```
AgentScope/
├── docker-compose.yml           All services (postgres, backend, runtime, frontend, prometheus, grafana)
├── infra/
│   ├── prometheus/
│   │   └── prometheus.yml       Scrape config — targets backend + runtime
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/     Auto-provision Prometheus datasource
│       │   └── dashboards/      Dashboard provider config
│       └── dashboards/
│           └── agentscope.json  Pre-built dashboard (8 panels, 3 rows)
├── frontend/                    Next.js dashboard
│   └── src/
│       ├── app/                 Pages: /runs, /runs/[id], /saved-runs, /analytics, /evaluations (tabs: Regression Tests + Comparisons), /optimizations, /knowledge, /memory
│       ├── components/          UI components (runs, traces, analytics, evaluations/RegressionResultsTable, memory/SuccessfulPatternsTable, memory/FailurePatternsTable, knowledge/ModelInsightsTable, knowledge/OptimizationLearningsTable, layout)
│       ├── hooks/               TanStack Query hooks (useAgents, useModels, useOptimizations, useAnalyzeWithAI, useRegressionResults, useMemoryPatterns, useKnowledgeSummary, ...)
│       ├── store/               Zustand store for live trace state
│       ├── lib/                 API client, query client, utilities
│       └── types/               TypeScript types mirroring backend DTOs
├── backend/                     Spring Boot API + WebSocket server
│   └── src/main/java/com/agentscope/
│       ├── controller/          REST endpoints (RunController, TraceController, AgentController, ModelController, OptimizationController, RegressionComparisonController, MemoryController, KnowledgeController)
│       ├── service/             Business logic (AgentRunService, EvaluationService, FailureDetectionService, OptimizationService, SavedRunService, RegressionComparisonService, MemoryService, KnowledgeService)
│       ├── model/               JPA entities (AgentRun, TraceStep, Evaluation, RegressionTest, SavedRun, OptimizationSuggestion, RegressionResult, SuccessfulPattern, FailurePattern, ModelInsight)
│       ├── dto/                 Data transfer objects (AgentRunDto, ModelDto, AgentDefinitionDto, OptimizationSuggestionDto, RegressionResultDto, SuccessfulPatternDto, FailurePatternDto, ModelInsightDto, OptimizationLearningDto, ...)
│       ├── repository/          Database queries (AgentRunRepository, EvaluationRepository, OptimizationSuggestionRepository, RegressionResultRepository, SuccessfulPatternRepository, FailurePatternRepository, ModelInsightRepository, ...)
│       ├── config/              CORS, beans, WebSocket config
│       └── websocket/           WebSocket broadcast handler
│   └── src/main/resources/
│       └── db/migration/        V1–V17 Flyway SQL migrations
└── runtime/                     FastAPI agent execution engine
    └── app/
        ├── main.py              POST /execute, GET /agents, GET /models endpoints
        ├── models.py            SUPPORTED_MODELS catalogue — the only file to edit when adding/removing models
        ├── agents/              Agent package
        │   ├── __init__.py      Entry point — public API + triggers all registrations
        │   ├── registry.py      AgentDefinition dataclass + REGISTRY dict
        │   └── builtin/         All named agent implementations
        │       ├── __init__.py  Agent catalogue — edit this to add/remove agents
        │       ├── tool_agent.py    LangGraph tool+retry workflow (default)
        │       ├── direct_answer.py Single LLM call, no tools
        │       ├── chain_of_thought.py Step-by-step reasoning prompt
        │       ├── summariser.py    URL fetch or content → structured summary
        │       └── critic_agent.py  Generator → critic → revisor (3 LLM calls)
        ├── tools/               fetch_website, calculator, file_reader
        ├── tracing/             Trace event emission
        ├── validators/          Output validation
        └── schemas/             Pydantic request/response models
```

---

## Built-in Agents

Five agents ship out of the box. Select one in the **Settings** page to set it as your default, or use **Run as…** in the New Run dialog to pick per-run.

| ID | Name | When to use |
|---|---|---|
| `tool_agent` | Tool Agent | Default. Plans a tool call, executes it, summarises, validates. Retries up to 3×. |
| `direct_answer` | Direct Answer | Fastest. Sends task directly to the LLM — no tools, no retries. |
| `chain_of_thought` | Chain of Thought | Logic, maths, multi-part questions. Forces step-by-step reasoning before answering. |
| `summariser` | Summariser | Pass a URL or raw content. Returns a structured summary with key points and takeaways. |
| `critic_agent` | Critic Agent | Quality-sensitive tasks. Generates a draft, critiques it, then rewrites for accuracy. |

The Tool Agent uses three tools internally:

| Tool | What it does |
|---|---|
| `fetch_website` | Downloads a webpage and returns cleaned text (via BeautifulSoup) |
| `calculator` | Evaluates a math expression |
| `file_reader` | Reads `.txt`, `.md`, or `.pdf` files |

---

## Creating a Custom Agent

All agents live in `runtime/app/agents/`. Each file is self-contained: it implements a `_run` function and calls `register()` at module level. `main.py` imports the file once to trigger registration.

### Step 1 — Create the file

```python
# runtime/app/agents/builtin/my_agent.py
"""My Agent — one-line description of what it does."""

import time
from typing import Any

from langchain_ollama import ChatOllama

from app.agents.registry import AgentDefinition, register
from app.tracing.tracer import Tracer


def _run(
    task: str,
    run_id: str,
    tracer: Tracer,
    model: str,
    base_url: str,
) -> dict[str, Any]:
    """
    All agents share this exact signature.

    Parameters
    ----------
    task     : the user's task string
    run_id   : UUID string for this run (already created by the backend)
    tracer   : emits trace events; pass backend_url=None to collect locally only
    model    : Ollama model name, e.g. "qwen3:4b"
    base_url : Ollama base URL, e.g. "http://localhost:11434"

    Returns
    -------
    dict with keys:
      status       – "SUCCESS" or "FAILED"
      final_output – string shown in the UI, or None
      total_tokens – int token count across all LLM calls
      error        – error message string, or None
    """
    llm = ChatOllama(model=model, base_url=base_url)

    t0 = time.time()
    response = llm.invoke([{"role": "user", "content": task}])
    latency = int((time.time() - t0) * 1000)

    content = response.content
    tokens = getattr(response, "usage_metadata", None)
    token_count = tokens.get("total_tokens", 0) if tokens else 0

    # Every LLM call or tool use should emit a trace event so it appears
    # in the trace viewer.
    tracer.emit(
        event_type="LLM_RESPONSE",   # one of: LLM_RESPONSE, TOOL_CALL,
        status="SUCCESS",            #   VALIDATION_FAILURE, RETRY_TRIGGERED,
        latency=latency,             #   RUN_COMPLETED
        token_usage=token_count,
        prompt=task,
        response=content,
    )
    # Always emit RUN_COMPLETED as the final event.
    tracer.emit(
        event_type="RUN_COMPLETED",
        status="SUCCESS",
        token_usage=token_count,
        response=content,
    )

    return {
        "status": "SUCCESS",
        "final_output": content,
        "total_tokens": token_count,
        "error": None,
    }


register(AgentDefinition(
    id="my_agent",          # unique snake_case ID — used in API requests
    name="My Agent",        # display name shown in the UI
    description="Does something useful with the task.",
    run_fn=_run,
))
```

### Step 2 — Add one line to `builtin/__init__.py`

```python
# runtime/app/agents/builtin/__init__.py
from app.agents.builtin import my_agent  # noqa: F401  ← add this line
```

That's it. `main.py` never needs to change. The agent now appears in `GET /api/agents`, in the Settings page, and in the **Run as…** dropdown.

### Tips

**Using tools** — import any tool from `app.tools` and call `tool.run(**kwargs)`:
```python
from app.tools.fetch_website import FetchWebsiteTool
fetcher = FetchWebsiteTool()
content = fetcher.run(url="https://example.com")
```

**Multi-step agents** — call the LLM multiple times and emit a trace event for each call. See `critic_agent.py` for a three-step (generator → critic → revisor) example.

**LangGraph agents** — build a `StateGraph`, compile it, and invoke it from `_run`. See `tool_agent.py` for a full graph example including conditional retry edges.

**Using outside this project** — create a `Tracer` with `backend_url=None` to collect steps locally without a backend:
```python
from app.tracing.tracer import Tracer
tracer = Tracer(run_id="local-test-1")         # no backend_url → offline mode
result = my_agent_run("2 + 2", "local-test-1", tracer, "qwen3:4b", "http://localhost:11434")
print(result["final_output"])
print(tracer.steps)                            # list of all emitted trace events
```

---

## Service Ports

| Service | Port |
|---|---|
| Frontend (Next.js) | 3000 |
| Backend (Spring Boot) | 8080 |
| Runtime (FastAPI) | 8000 |
| Database (PostgreSQL) | 5432 |
| Ollama | 11434 |
| Prometheus | 9090 |
| Grafana | 3001 |

---

Built to make AI agent debugging feel as natural as debugging any other software — one `docker compose up --build` away.
