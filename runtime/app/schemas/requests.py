from typing import Optional

from pydantic import BaseModel


class ExecuteRequest(BaseModel):
    task: str
    run_id: Optional[str] = None
    agent_type: Optional[str] = "tool_agent"
