"""
AgentScope agent package — entry point.

Importing this package does two things automatically:
  1. Exposes the public registry API (AgentDefinition, register, list_agents, REGISTRY).
  2. Imports app.agents.builtin, which triggers registration of every built-in agent.

Usage in main.py
----------------
    from app.agents import REGISTRY, list_agents
    # All built-in agents are now registered — no individual imports needed.

Usage elsewhere / external projects
------------------------------------
    from app.agents import AgentDefinition, register
    from app.tracing.tracer import Tracer

    def _run(task, run_id, tracer, model, base_url):
        ...
        return {"status": "SUCCESS", "final_output": "...",
                "total_tokens": 0, "error": None}

    register(AgentDefinition(
        id="my_agent", name="My Agent",
        description="Does something useful.",
        run_fn=_run,
    ))

See README.md → "Creating a Custom Agent" for a full walkthrough.
"""

from app.agents.registry import REGISTRY, AgentDefinition, list_agents, register
import app.agents.builtin  # noqa: F401 — registers all built-in agents as a side-effect

__all__ = ["AgentDefinition", "REGISTRY", "list_agents", "register"]
