from typing import Generic, List, TypeVar
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")

class PageOut(BaseModel, Generic[T]):
    items: List[T]
    total: int
    model_config = ConfigDict(from_attributes=True)
