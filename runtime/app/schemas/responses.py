from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


class TraceStepResponse(BaseModel):
    step: int
    event_type: str
    tool_name: Optional[str]
    timestamp: str
    latency: int
    token_usage: int
    status: str
    prompt: Optional[str]
    response: Optional[str]


class ExecuteResponse(BaseModel):
    run_id: str
    status: str
    final_output: Optional[str]
    total_latency: int
    total_tokens: int
    steps: list[TraceStepResponse]
