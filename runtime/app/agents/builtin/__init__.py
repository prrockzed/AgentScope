"""
Built-in agent catalogue.

To add a new agent
------------------
1. Create  app/agents/builtin/my_agent.py  (implement _run, call register())
2. Add one import line below — that's the only file outside your new module
   you ever need to touch.

To remove an agent
------------------
Delete or comment-out the corresponding import line below.
"""

from app.agents.builtin import chain_of_thought  # noqa: F401
from app.agents.builtin import critic_agent       # noqa: F401
from app.agents.builtin import direct_answer      # noqa: F401
from app.agents.builtin import summariser         # noqa: F401
from app.agents.builtin import tool_agent         # noqa: F401
