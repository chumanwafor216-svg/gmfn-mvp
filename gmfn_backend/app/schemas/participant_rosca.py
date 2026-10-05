from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


def _reject_bool_float_integer(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if isinstance(value, bool):
        raise ValueError(f"{field_name} must be an integer, not a boolean.")
    if isinstance(value, float):
        raise ValueError(f"{field_name} must be an integer, not a float.")
    return value


def _reject_non_text_value(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be text.")
    return value


def _reject_non_decimal_string(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a decimal string.")
    return value


class RoscaRunDraftIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="NGN", min_length=1, max_length=8)
    frequency_unit: str = Field(default="monthly", pattern="^(daily|weekly|monthly|custom_days)$")
    frequency_interval: int = Field(default=1, ge=1, le=366)
    participant_count_required: int = Field(..., ge=2, le=200)
    round_count: int = Field(..., ge=2, le=200)
    start_rule: str = Field(
        default="on_all_acceptance",
        pattern="^(on_all_acceptance|on_date_after_all_acceptance|manual_activate_after_all_acceptance)$",
    )
    start_at: Optional[datetime] = None
    rotation_method: str = Field(default="explicit_order", pattern="^explicit_order$")
    origin_clan_id: Optional[int] = Field(default=None, ge=1)
    note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("amount", mode="before")
    @classmethod
    def _reject_amount_boundary_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_decimal_string(value, info.field_name)

    @field_validator("participant_count_required", "round_count", "frequency_interval", "origin_clan_id", mode="before")
    @classmethod
    def _reject_malformed_integer_controls(cls, value: Any, info: Any) -> Any:
        return _reject_bool_float_integer(value, info.field_name)

    @field_validator("name", "currency", "frequency_unit", "start_rule", "rotation_method", "note", mode="before")
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)


class RoscaRunTermsUpdateIn(RoscaRunDraftIn):
    pass


class RoscaParticipantInviteIn(BaseModel):
    invitee_gsn_id: str = Field(..., min_length=1, max_length=64)
    rotation_position: int = Field(..., ge=1, le=200)
    role: str = Field(default="participant", pattern="^(participant|coordinator)$")
    idempotency_key: Optional[str] = Field(default=None, max_length=96)

    @field_validator("rotation_position", mode="before")
    @classmethod
    def _reject_malformed_integer_controls(cls, value: Any, info: Any) -> Any:
        return _reject_bool_float_integer(value, info.field_name)

    @field_validator("invitee_gsn_id", "role", "idempotency_key", mode="before")
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)


class RoscaParticipantAcceptIn(BaseModel):
    terms_version: int = Field(..., ge=1)
    terms_hash: str = Field(..., min_length=16, max_length=96)
    acceptance_source: str = Field(default="app", min_length=1, max_length=40)
    idempotency_key: Optional[str] = Field(default=None, max_length=96)

    @field_validator("terms_version", mode="before")
    @classmethod
    def _reject_malformed_integer_controls(cls, value: Any, info: Any) -> Any:
        return _reject_bool_float_integer(value, info.field_name)

    @field_validator("terms_hash", "acceptance_source", "idempotency_key", mode="before")
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)


class RoscaParticipantDeclineIn(BaseModel):
    idempotency_key: Optional[str] = Field(default=None, max_length=96)
    reason: Optional[str] = Field(default=None, max_length=160)

    @field_validator("idempotency_key", "reason", mode="before")
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)


class RoscaContributionRecordIn(BaseModel):
    amount_recorded: Decimal = Field(..., gt=0)
    external_reference: Optional[str] = Field(default=None, max_length=128)
    note: Optional[str] = Field(default=None, max_length=500)
    idempotency_key: Optional[str] = Field(default=None, max_length=96)

    @field_validator("amount_recorded", mode="before")
    @classmethod
    def _reject_amount_boundary_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_decimal_string(value, info.field_name)

    @field_validator("external_reference", "note", "idempotency_key", mode="before")
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)


class RoscaParticipantOut(BaseModel):
    id: int
    user_id: int
    role: str
    status: str
    rotation_position: Optional[int] = None
    accepted_terms_version: Optional[int] = None
    accepted_terms_hash: Optional[str] = None
    accepted_at: Optional[datetime] = None
    acceptance_source: Optional[str] = None
    invited_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None


class RoscaObligationOut(BaseModel):
    id: int
    rosca_run_id: int
    participant_id: int
    user_id: int
    round_number: int
    obligation_type: str
    amount: Decimal
    currency: str
    amount_recorded: Decimal
    amount_outstanding: Decimal
    due_at: Optional[datetime] = None
    state: str
    external_reference: Optional[str] = None
    reported_by_user_id: Optional[int] = None
    reported_at: Optional[datetime] = None
    confirmed_by_user_id: Optional[int] = None
    confirmed_at: Optional[datetime] = None


class RoscaRunOut(BaseModel):
    id: int
    public_id: str
    status: str
    name: str
    amount: Decimal
    currency: str
    frequency_unit: str
    frequency_interval: int
    participant_count_required: int
    round_count: int
    start_rule: str
    start_at: Optional[datetime] = None
    rotation_method: str
    terms_version: int
    terms_hash: str
    origin_clan_id: Optional[int] = None
    created_by_user_id: int
    coordinator_user_id: int
    external_money_moved_by_gsn: bool = False
    activated_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    participants: List[RoscaParticipantOut] = Field(default_factory=list)
    obligations: List[RoscaObligationOut] = Field(default_factory=list)
    boundary_note: str = (
        "This ROSCA records agreement and evidence only. GSN does not hold, move, escrow, or guarantee funds."
    )


class RoscaRunListOut(BaseModel):
    count: int
    runs: List[RoscaRunOut] = Field(default_factory=list)
