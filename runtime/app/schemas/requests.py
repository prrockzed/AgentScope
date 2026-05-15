from pydantic import BaseModel


class ExecuteRequest(BaseModel):
    task: str
