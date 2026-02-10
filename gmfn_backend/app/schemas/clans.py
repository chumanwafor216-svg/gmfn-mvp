# app/schemas/clans.py
from pydantic import BaseModel, Field
from typing import Optional, List


class ClanCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    description: Optional[str] = Field(default=None, max_length=500)


class ClanOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class ClanMembershipOut(BaseModel):
    clan_id: int
    user_id: int
    role: str  # "admin" or "member"

    class Config:
        from_attributes = True


class MyClansResponse(BaseModel):
    items: List[ClanOut]
