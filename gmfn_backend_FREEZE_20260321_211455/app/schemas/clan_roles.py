from pydantic import BaseModel
from typing import Literal


class ClanRoleUpdate(BaseModel):
    role: Literal["admin", "member"] 
