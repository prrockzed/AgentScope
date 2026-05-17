from dataclasses import dataclass
from typing import Any, Callable

from app.tracing.tracer import Tracer


@dataclass
class AgentDefinition:
    id: str
    name: str
    description: str
    run_fn: Callable[[str, str, Tracer, str, str], dict[str, Any]]


REGISTRY: dict[str, AgentDefinition] = {}


def register(defn: AgentDefinition) -> None:
    REGISTRY[defn.id] = defn


def list_agents() -> list[dict]:
    return [
        {"id": d.id, "name": d.name, "description": d.description}
        for d in REGISTRY.values()
    ]
