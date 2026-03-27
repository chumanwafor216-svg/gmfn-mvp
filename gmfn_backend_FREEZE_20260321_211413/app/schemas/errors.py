from pydantic import BaseModel, ConfigDict

class ErrorOut(BaseModel):
    detail: str
    model_config = ConfigDict(from_attributes=True)
