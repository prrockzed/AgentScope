from datetime import datetime, timezone
from typing import Any, Optional


class Tracer:
    def __init__(self, run_id: str) -> None:
        self.run_id = run_id
        self.steps: list[dict[str, Any]] = []
        self._counter = 0

    def _next_step(self) -> int:
        self._counter += 1
        return self._counter

    def emit(
        self,
        event_type: str,
        status: str,
        latency: int = 0,
        token_usage: int = 0,
        tool_name: Optional[str] = None,
        prompt: Optional[str] = None,
        response: Optional[str] = None,
    ) -> dict[str, Any]:
        step_number = self._next_step()
        event: dict[str, Any] = {
            "run_id": self.run_id,
            "step": step_number,
            "event_type": event_type,
            "tool_name": tool_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latency": latency,
            "token_usage": token_usage,
            "status": status,
            "prompt": prompt,
            "response": response,
        }
        self.steps.append(event)
        return event
