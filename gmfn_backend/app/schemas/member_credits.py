from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class MemberCreditLedgerEntryOut(BaseModel):
    id: int
    units_delta: int
    balance_after: int
    entry_type: str
    reference_type: str
    reference_id: str
    created_at: datetime


class MemberCreditSelfOut(BaseModel):
    member_user_id: int
    account_status: str
    balance_units: int
    entries: list[MemberCreditLedgerEntryOut] = Field(default_factory=list)


class PurchaseQuoteCreateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pack_version_id: int = Field(ge=1)
    idempotency_key: str = Field(min_length=1, max_length=128)


class PurchaseQuoteOut(BaseModel):
    quote_key: str
    pack_code: str
    catalog_version: int
    credit_units: int
    amount_minor: int
    currency: str
    terms_json: Optional[str] = None
    status: str
    expires_at: datetime
    created_at: datetime


class ServiceQuoteOut(BaseModel):
    quote_key: str
    commercial_status: str
    member_user_id: int
    service_version_id: int
    service_code: str
    catalog_version: int
    credit_cost: int
    duration_seconds: int
    terms_json: Optional[str] = None
    quoted_at: datetime
    valid_until: datetime
    funding_source_required: bool
    selected_funding_source: Optional[str] = None
    activation_performed: bool
    service_name: str
    scope: str
    workflow_url: str
    balance_units: int
    resulting_balance_units: int
    permission_enabled: bool
    spending_enabled: bool
    has_sufficient_balance: bool


class PurchaseConfirmIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    quote_key: str = Field(min_length=1, max_length=96)
    idempotency_key: str = Field(min_length=1, max_length=128)


class PaymentReceiptOut(BaseModel):
    provider_transaction_id: str
    amount_minor: int
    currency: str
    verification_status: str
    exception_code: Optional[str] = None
    received_at: datetime
    settled_at: Optional[datetime] = None


class PurchaseStatusOut(BaseModel):
    order_key: str
    status: str
    amount_minor: int
    currency: str
    credit_units: int
    funded_minor: int
    collection_reference: Optional[str] = None
    provider_session_id: Optional[str] = None
    collection_action_url: Optional[str] = None
    award_error: Optional[str] = None
    balance_units: int
    receipts: list[PaymentReceiptOut] = Field(default_factory=list)


class MemberCreditPackCatalogueItemOut(BaseModel):
    pack_version_id: int
    pack_code: str
    catalog_version: int
    credit_units: int
    amount_minor: int
    currency: str
    terms_json: Optional[str] = None


class MemberCreditServiceCatalogueItemOut(BaseModel):
    service_version_id: int
    service_code: str
    catalog_version: int
    service_name: str
    scope: str
    workflow_url: str
    credit_cost: int
    duration_seconds: int
    permission_enabled: bool
    spending_enabled: bool
    balance_units: int
    resulting_balance_units: int
    has_sufficient_balance: bool


class MemberCreditCatalogueOut(BaseModel):
    member_user_id: int
    balance_units: int
    purchase_operations_enabled: bool
    spending_operations_enabled: bool
    catalogue_mode: str
    packs: list[MemberCreditPackCatalogueItemOut] = Field(default_factory=list)
    services: list[MemberCreditServiceCatalogueItemOut] = Field(default_factory=list)


class MemberCreditServicePermissionIn(BaseModel):
    model_config = ConfigDict(extra='forbid')
    enabled: bool


class MemberCreditServicePermissionOut(BaseModel):
    service_code: str
    enabled: bool
