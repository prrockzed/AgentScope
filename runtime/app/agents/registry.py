from dataclasses import dataclass, field
from typing import Any, Callable, Optional

from app.tracing.tracer import Tracer


@dataclass
class AgentDefinition:
    id: str
    name: str
    description: str
    run_fn: Callable[..., dict[str, Any]]
    details: Optional[dict] = field(default=None)


REGISTRY: dict[str, AgentDefinition] = {}


def register(defn: AgentDefinition) -> None:
    REGISTRY[defn.id] = defn


def list_agents() -> list[dict]:
    return [
        {"id": d.id, "name": d.name, "description": d.description}
        for d in REGISTRY.values()
    ]


def get_agent(agent_id: str) -> Optional[dict]:
    defn = REGISTRY.get(agent_id)
    if defn is None:
        return None
    result: dict = {"id": defn.id, "name": defn.name, "description": defn.description}
    if defn.details:
        result.update(defn.details)
    return result
