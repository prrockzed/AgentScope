import time
import uuid

from fastapi import FastAPI, HTTPException

from app.config import settings
from app.schemas.requests import ExecuteRequest
from app.schemas.responses import ExecuteResponse, TraceStepResponse
from app.tracing.tracer import Tracer
from app.workflows.agent_workflow import run_agent

app = FastAPI(title="AgentScope Runtime", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/execute", response_model=ExecuteResponse)
def execute(request: ExecuteRequest):
    if not request.task or not request.task.strip():
        raise HTTPException(status_code=422, detail="task must not be empty")

    run_id = request.run_id or str(uuid.uuid4())
    tracer = Tracer(run_id=run_id, backend_url=settings.backend_url)
    start = time.time()

    result = run_agent(
        task=request.task,
        run_id=run_id,
        tracer=tracer,
        model=settings.ollama_model,
        base_url=settings.ollama_base_url,
    )

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
    )
