import os
import time
import uuid

import requests
from fastapi import FastAPI, HTTPException
from prometheus_fastapi_instrumentator import Instrumentator

from app.cancellation import CancellationError, cancel_run, clear_run
from app.config import settings
from app.llm import LiteLLMChat, LLMError
from app.models import SUPPORTED_MODELS
from app.schemas.requests import ExecuteRequest
from app.schemas.responses import ExecuteResponse, TraceStepResponse
from app.tracing.tracer import Tracer
from app.agents import REGISTRY, get_agent, list_agents  # noqa: importing this package registers all built-in agents

app = FastAPI(title="AgentScope Runtime", version="1.0.0")
Instrumentator().instrument(app).expose(app)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/agents")
def get_agents():
    return list_agents()


@app.get("/agents/{agent_id}")
def get_agent_detail(agent_id: str):
    detail = get_agent(agent_id)
    if detail is None:
        raise HTTPException(status_code=404, detail=f"Unknown agent: {agent_id}")
    return detail


@app.get("/models")
def get_models():
    # Determine which Ollama models are locally pulled
    try:
        resp = requests.get(f"{settings.ollama_base_url}/api/tags", timeout=5)
        pulled_ollama = {m["name"] for m in resp.json().get("models", [])} if resp.status_code == 200 else set()
    except Exception:
        pulled_ollama = set()

    # Determine which cloud providers have API keys set
    provider_available = {
        "ollama": True,  # resolved per-model via pulled_ollama
        "groq": bool(os.environ.get("GROQ_API_KEY")),
        "openai": bool(os.environ.get("OPENAI_API_KEY")),
        "anthropic": bool(os.environ.get("ANTHROPIC_API_KEY")),
        "gemini": bool(os.environ.get("GEMINI_API_KEY")),
    }

    result = []
    for model in SUPPORTED_MODELS:
        provider = model["provider"]
        if provider == "ollama":
            available = model["id"] in pulled_ollama
            unavailable_reason = "not pulled" if not available else None
        else:
            available = provider_available.get(provider, False)
            unavailable_reason = "no API key" if not available else None
        result.append({**model, "available": available, "unavailableReason": unavailable_reason})

    return result


@app.post("/execute", response_model=ExecuteResponse)
def execute(request: ExecuteRequest):
    if not request.task or not request.task.strip():
        raise HTTPException(status_code=422, detail="task must not be empty")

    agent_type = request.agent_type or "tool_agent"
    if agent_type not in REGISTRY:
        raise HTTPException(status_code=400, detail=f"Unknown agent_type: {agent_type}")

    run_id = request.run_id or str(uuid.uuid4())
    tracer = Tracer(run_id=run_id, backend_url=settings.backend_url)
    start = time.time()

    model = request.model
    if not model:
        raise HTTPException(status_code=422, detail="model must be specified")

    effective_task = request.task
    if request.knowledge_context:
        effective_task = (
            f"[Context from previous runs on this task]\n"
            f"{request.knowledge_context}\n\n"
            f"[Task]\n{request.task}"
        )

    llm = LiteLLMChat(model=model, ollama_base_url=settings.ollama_base_url)

    try:
        result = REGISTRY[agent_type].run_fn(
            task=effective_task,
            run_id=run_id,
            tracer=tracer,
            llm=llm,
        )
    except CancellationError:
        result = {"status": "CANCELLED", "final_output": None, "total_tokens": 0, "error": None}
    except LLMError as e:
        tracer.emit(
            event_type="RUN_COMPLETED",
            status="FAILED",
            token_usage=0,
            response=e.message,
        )
        result = {"status": "FAILED", "final_output": None, "total_tokens": 0, "error": e.code}
    finally:
        clear_run(run_id)

    total_latency = int((time.time() - start) * 1000)

    steps = [
        TraceStepResponse(
            step=s["step"],
            event_type=s["event_type"],
            tool_name=s.get("tool_name"),
            timestamp=s["timestamp"],
            latency=s["latency"],
            token_usage=s["token_usage"],
            status=s["status"],
            prompt=s.get("prompt"),
            response=s.get("response"),
        )
        for s in tracer.steps
    ]

    return ExecuteResponse(
        run_id=run_id,
        status=result["status"],
        final_output=result.get("final_output"),
        total_latency=total_latency,
        total_tokens=result.get("total_tokens", 0),
        steps=steps,
        error=result.get("error"),
    )


@app.post("/cancel/{run_id}", status_code=200)
def cancel_run_endpoint(run_id: str):
    cancel_run(run_id)
    return {"cancelled": run_id}
