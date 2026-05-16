import logging
from datetime import datetime, timezone
from typing import Any, Optional

import requests

logger = logging.getLogger(__name__)


class Tracer:
    def __init__(self, run_id: str, backend_url: Optional[str] = None) -> None:
        self.run_id = run_id
        self.backend_url = backend_url
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
        self._post_to_backend(event)
        return event

    def _post_to_backend(self, event: dict[str, Any]) -> None:
        if not self.backend_url:
            return
        url = f"{self.backend_url}/api/runs/{self.run_id}/traces"
        payload = {
            "stepNumber": event["step"],
            "toolName": event.get("tool_name"),
            "eventType": event["event_type"],
            "prompt": event.get("prompt"),
            "response": event.get("response"),
            "latency": event["latency"],
            "tokenUsage": event["token_usage"],
            "status": event["status"],
        }
        try:
            requests.post(url, json=payload, timeout=5)
        except Exception as exc:
            logger.warning("Failed to post trace step to backend: %s", exc)
