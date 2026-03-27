from pydantic import BaseModel


class UserPublicOut(BaseModel):
    id: int
    email: str
    role: str

    model_config = {"from_attributes": True}


class ClanOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}
