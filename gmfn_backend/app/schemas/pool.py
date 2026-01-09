# app/schemas/pool.py

from pydantic import BaseModel, Field, ConfigDict, model_validator


class PoolBalanceUpdate(BaseModel):
    """
    Canonical request schema for updating a member's pool balance.

    Accepts legacy keys for backward compatibility:
    - pool_balance (canonical)
    - personal_pool_balance (legacy)
    - balance (legacy)
    """

    pool_balance: float = Field(...)

    @model_validator(mode="before")
    @classmethod
    def accept_legacy_keys(cls, values):
        if isinstance(values, dict):
            if "pool_balance" not in values:
                if "personal_pool_balance" in values:
                    values["pool_balance"] = values["personal_pool_balance"]
                elif "balance" in values:
                    values["pool_balance"] = values["balance"]
        return values

    model_config = ConfigDict(
        validate_by_name=True,
        populate_by_name=True,
    )


class PoolBalanceOut(BaseModel):
    pool_balance: float
