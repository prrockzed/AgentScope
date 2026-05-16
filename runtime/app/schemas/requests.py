from typing import Optional

from pydantic import BaseModel


class ExecuteRequest(BaseModel):
    task: str
    run_id: Optional[str] = None
