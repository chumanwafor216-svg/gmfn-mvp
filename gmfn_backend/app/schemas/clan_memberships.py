from pydantic import BaseModel, ConfigDict
from typing import Optional


class ClanMemberCreate(BaseModel):
    user_id: int
    role: Optional[str] = "user"


class ClanMemberOut(BaseModel):
    id: int
    clan_id: int
    user_id: int
    role: str
    personal_pool_balance: float

    model_config = ConfigDict(from_attributes=True)
