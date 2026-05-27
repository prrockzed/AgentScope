'use client'

// ─── tiny local helpers ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold tracking-wide uppercase" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ border: '1px solid var(--border-custom)', backgroundColor: 'var(--bg-surface)' }}
    >
      {children}
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-block rounded-md px-2 py-0.5 text-[11px] font-mono font-medium"
      style={{ backgroundColor: 'rgba(139, 92, 246, 0.12)', color: 'var(--purple-600)' }}
    >
      {children}
    </span>
  )
}

// ─── data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    title: 'Live Trace Viewer',
    desc: 'Submit a task and watch every agent step appear in real time — event type, tool name, latency, token count, and full prompt/response.',
  },
  {
    title: 'Run History',
    desc: 'Searchable, filterable table of all runs with status, latency, token count, model, and agent columns.',
  },
  {
    title: 'Run Cancellation',
    desc: 'Click Stop while a run is in progress. The status flips to CANCELLED immediately; the Python runtime halts at the next trace checkpoint.',
  },
  {
    title: 'Run Replay & Comparison',
    desc: 'Re-execute any past run and get a side-by-side diff view that highlights every step that changed.',
  },
  {
    title: 'Automatic Failure Detection',
    desc: 'Every failed run is tagged with a specific reason code — INVALID_API_KEY, RATE_LIMIT_EXCEEDED, EMPTY_RESPONSE, and more.',
  },
  {
    title: 'Accuracy Evaluation',
    desc: 'Score any completed run 0–100. The LLM returns a score, reasoning, task-fit label, and action recommendation.',
  },
  {
    title: 'Agent Improvement Patches',
    desc: 'Generate a concrete instruction patch from evaluation findings. Activate it and it is prepended to every future run of that agent type.',
  },
  {
    title: 'Optimization Advisor',
    desc: 'Rule-based heuristics fire after every run. On demand, trigger AI-powered analysis via Groq for deeper suggestions.',
  },
  {
    title: 'Operational Knowledge Base',
    desc: 'Successful and failed workflow patterns accumulate automatically. Before each run, the backend injects relevant prior context into the prompt.',
  },
  {
    title: 'Regression Scoring',
    desc: 'Every replay is automatically scored against its baseline — latency, token, and retry deltas combined into a weighted regression score.',
  },
  {
    title: 'Saved Runs',
    desc: 'Bookmark any completed run. Saved runs appear in a dedicated page with links back to the original trace.',
  },
  {
    title: 'Prometheus + Grafana',
    desc: 'Runs, latency, tokens, and failure reasons are emitted as metrics. A pre-built Grafana dashboard shows 8 live panels.',
  },
]

const AGENTS = [
  { id: 'tool_agent',        name: 'Tool Agent',               desc: 'Default. Plans a tool call, executes it, summarises, validates. Retries up to 3×.' },
  { id: 'direct_answer',     name: 'Direct Answer',            desc: 'Fastest. Sends task directly to the LLM — no tools, no retries.' },
  { id: 'chain_of_thought',  name: 'Chain of Thought',         desc: 'Forces step-by-step reasoning before answering. Good for logic and maths.' },
  { id: 'summariser',        name: 'Summariser',               desc: 'Pass a URL or raw content. Returns a structured summary with key points.' },
  { id: 'critic_agent',      name: 'Critic Agent',             desc: 'Generates a draft, critiques it, then rewrites for accuracy.' },
  { id: 'research_analyst',  name: 'Research Analyst',         desc: 'Fetches 4–6 web sources, cross-references them, and produces a report with citations.' },
  { id: 'competitive_intel', name: 'Competitive Intelligence', desc: 'Identifies competitors, extracts pricing and features, produces a landscape report.' },
  { id: 'data_analyst',      name: 'Data Analyst',             desc: 'Reads a CSV or JSON file, computes statistics, detects outliers and correlations.' },
  { id: 'debug_assistant',   name: 'Debug Assistant',          desc: 'Parses an error/stack trace, diagnoses root cause, proposes 3 ranked fixes.' },
  { id: 'codebase_explainer',name: 'Codebase Explainer',       desc: 'Accepts a GitHub URL or local path. Reads README + key source files → architectural brief.' },
]

const OLLAMA_MODELS = [
  { id: 'tinyllama:latest', name: 'TinyLlama',    desc: 'Ultra-light, quick prototyping' },
  { id: 'qwen3:4b',         name: 'Qwen3 4B',     desc: 'Fast, balanced — good default' },
  { id: 'qwen3:8b',         name: 'Qwen3 8B',     desc: 'Better reasoning, slower' },
  { id: 'llama3.2:3b',      name: 'Llama 3.2 3B', desc: 'Very fast compact model' },
  { id: 'llama3.1:8b',      name: 'Llama 3.1 8B', desc: 'Capable 8B Llama' },
  { id: 'mistral:7b',       name: 'Mistral 7B',   desc: 'Strong general-purpose' },
]

const CLOUD_MODELS = [
  { id: 'groq/llama-3.3-70b-versatile',          name: 'Llama 3.3 70B',    key: 'GROQ_API_KEY' },
  { id: 'groq/llama-3.1-8b-instant',             name: 'Llama 3.1 8B',     key: 'GROQ_API_KEY' },
  { id: 'groq/mixtral-8x7b-32768',               name: 'Mixtral 8x7B',     key: 'GROQ_API_KEY' },
  { id: 'openai/gpt-4o',                          name: 'GPT-4o',           key: 'OPENAI_API_KEY' },
  { id: 'openai/gpt-4o-mini',                     name: 'GPT-4o Mini',      key: 'OPENAI_API_KEY' },
  { id: 'anthropic/claude-3-5-sonnet-20241022',   name: 'Claude 3.5 Sonnet',key: 'ANTHROPIC_API_KEY' },
  { id: 'anthropic/claude-3-haiku-20240307',      name: 'Claude 3 Haiku',   key: 'ANTHROPIC_API_KEY' },
  { id: 'gemini/gemini-2.5-flash',                name: 'Gemini 2.5 Flash', key: 'GEMINI_API_KEY' },
  { id: 'gemini/gemini-2.5-flash-lite',           name: 'Gemini 2.5 Flash Lite', key: 'GEMINI_API_KEY' },
]

const TECH_STACK = [
  { layer: 'Frontend',      tech: 'Next.js, TypeScript, Tailwind CSS v4, TanStack Query, Zustand, Recharts' },
  { layer: 'Backend',       tech: 'Java 21, Spring Boot 3.5, JPA, Flyway, WebSocket' },
  { layer: 'Database',      tech: 'PostgreSQL 16' },
  { layer: 'AI Runtime',    tech: 'Python 3.11, FastAPI, LangGraph, LiteLLM' },
  { layer: 'LLM',           tech: 'Ollama (local) + Groq, OpenAI, Anthropic, Gemini (cloud)' },
  { layer: 'Monitoring',    tech: 'Prometheus 2.54, Grafana 11.2, Micrometer' },
  { layer: 'Infrastructure',tech: 'Docker Compose' },
]

const CUSTOM_AGENT_CODE = `# runtime/app/agents/builtin/my_agent.py
from app.agents.registry import AgentDefinition, register
from app.tracing.tracer import Tracer
from app.llm import LiteLLMChat
import time

def _run(task, run_id, tracer, llm):
    t0 = time.time()
    response = llm.invoke([{"role": "user", "content": task}])
    latency = int((time.time() - t0) * 1000)
    tokens = response.usage_metadata.get("total_tokens", 0)

    tracer.emit(event_type="LLM_RESPONSE", status="SUCCESS",
                latency=latency, token_usage=tokens,
                prompt=task, response=response.content)
    tracer.emit(event_type="RUN_COMPLETED", status="SUCCESS",
                token_usage=tokens, response=response.content)

    return {"status": "SUCCESS", "final_output": response.content,
            "total_tokens": tokens, "error": None}

register(AgentDefinition(
    id="my_agent",
    name="My Agent",
    description="Does something useful with the task.",
    run_fn=_run,
))`

const REGISTER_CODE = `# runtime/app/agents/builtin/__init__.py
from app.agents.builtin import my_agent  # noqa: F401  ← add this line`

// ─── page ──────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-10 pb-10">

      {/* Hero */}
      <div
        className="rounded-2xl p-7"
        style={{ border: '1px solid var(--border-custom)', backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white text-base font-bold flex-shrink-0"
            style={{ background: 'var(--purple-600)' }}
          >
            A
          </div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>AgentScope</h1>
        </div>
        <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-primary)' }}>
          Local-first observability and debugging platform for AI agents.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          When an AI agent runs, every decision it makes — which tool to call, what the LLM responded,
          when it retried, why it failed — happens invisibly. AgentScope makes all of it visible. Every
          step is traced, persisted, and displayed in a live UI that updates as the agent runs.
          Think of it as Chrome DevTools + Datadog, but for LangGraph agents.
        </p>
      </div>

      {/* Features */}
      <Section title="Features">
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>{f.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* Built-in Agents */}
      <Section title="Built-in Agents">
        <Card>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Select a default in <strong style={{ color: 'var(--text-primary)' }}>Settings</strong>, or pick per-run using the <strong style={{ color: 'var(--text-primary)' }}>Run as…</strong> button.
          </p>
          <div className="flex flex-col gap-0.5">
            {AGENTS.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 rounded-xl px-3 py-2.5"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <Badge>{a.id}</Badge>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.name}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* Models */}
      <Section title="Supported Models">
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Card>
            <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Ollama (local)</p>
            <div className="flex flex-col gap-1.5">
              {OLLAMA_MODELS.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{m.id}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.desc}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Cloud (requires API key)</p>
            <div className="flex flex-col gap-1.5">
              {CLOUD_MODELS.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono truncate" style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                  <span
                    className="text-[10px] font-mono rounded px-1.5 py-0.5 flex-shrink-0"
                    style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                  >
                    {m.key}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Section>

      {/* Architecture */}
      <Section title="Architecture">
        <Card>
          <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
            Three services, each with one job.
          </p>
          <pre
            className="text-xs leading-relaxed rounded-xl p-4 overflow-x-auto"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
          >{`Browser (Next.js)
     │
     │  REST + WebSocket
     ▼
Spring Boot Backend ──────────────────┐
     │                                │
     │  POST /execute                 │
     ▼                                │
FastAPI Runtime                       │
     │  runs agent, emits trace       │
     ▼                                │
Ollama / Cloud LLM                    │
                                      │
PostgreSQL ◄──────────────────────────┘
           stores runs, traces, evals`}</pre>
          <p className="text-xs leading-relaxed mt-4" style={{ color: 'var(--text-muted)' }}>
            The frontend submits a task → Spring Boot creates a run record and calls the FastAPI runtime →
            the agent executes and emits trace events step-by-step → each event is persisted to PostgreSQL
            and broadcast over WebSocket → the UI receives events live and renders them in the trace timeline.
          </p>
        </Card>
      </Section>

      {/* Tech Stack */}
      <Section title="Tech Stack">
        <Card>
          <div className="flex flex-col gap-2">
            {TECH_STACK.map((t) => (
              <div key={t.layer} className="flex items-start gap-3">
                <span
                  className="text-xs font-semibold w-28 flex-shrink-0 pt-0.5"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t.layer}
                </span>
                <span className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{t.tech}</span>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* Creating a Custom Agent */}
      <Section title="Creating a Custom Agent">
        <Card>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Step 1 — Create the agent file</p>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Add a new file under <code className="font-mono" style={{ color: 'var(--purple-600)' }}>runtime/app/agents/builtin/</code>.
            Implement a <code className="font-mono" style={{ color: 'var(--purple-600)' }}>_run</code> function and call{' '}
            <code className="font-mono" style={{ color: 'var(--purple-600)' }}>register()</code> at module level.
          </p>
          <pre
            className="text-xs rounded-xl p-4 overflow-x-auto mb-6"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'monospace', lineHeight: 1.6 }}
          >{CUSTOM_AGENT_CODE}</pre>

          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Step 2 — Register it</p>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Add one import line to <code className="font-mono" style={{ color: 'var(--purple-600)' }}>builtin/__init__.py</code>.
            That's it — the agent appears in the Settings page and the Run as… dropdown immediately.
          </p>
          <pre
            className="text-xs rounded-xl p-4 overflow-x-auto"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'monospace', lineHeight: 1.6 }}
          >{REGISTER_CODE}</pre>
        </Card>
      </Section>

      {/* Service Ports */}
      <Section title="Service Ports">
        <Card>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {[
              { name: 'Frontend (Next.js)',    port: '3000' },
              { name: 'Backend (Spring Boot)', port: '8080' },
              { name: 'Runtime (FastAPI)',      port: '8000' },
              { name: 'Database (PostgreSQL)', port: '5432' },
              { name: 'Ollama',                port: '11434' },
              { name: 'Prometheus',            port: '9090' },
              { name: 'Grafana',               port: '3001' },
            ].map(({ name, port }) => (
              <div key={name} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{name}</span>
                <Badge>{port}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </Section>

    </div>
  )
}
