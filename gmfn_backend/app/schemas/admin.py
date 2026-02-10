from pydantic import BaseModel
from decimal import Decimal

class PoolTopUp(BaseModel):
    amount: Decimal
