from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import String, cast
from sqlalchemy.orm import Session

from app.core.auth import PENDING_APPROVAL_SENTINEL
from app.db.bank_models import BankCredit, ExpectedPayment
from app.db.identity_models import (
    DeviceFingerprint,
    IdentityRecoveryProfile,
    IdentityRiskSignal,
)
from app.db.models import (
    Clan,
    ClanJoinRequest,
    ClanJoinVote,
    ClanMembership,
    CommunityConfirmationContact,
    FeatureEntitlement,
    Loan,
    LoanGuarantor,
    MarketplaceBroadcast,
    MarketplaceProduct,
    MarketplaceShop,
    PoolEvent,
    Repayment,
    TrustEvent,
    TrustSlip,
    User,
    UserPayoutDestination,
    VaultAccessLink,
    VaultOrder,
)
from app.db.notification_models import Notification
from app.db.verification_models import IdentityVerificationCheck
from app.services.trust_events_services import build_trust_meta, log_trust_event


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _safe_str(value: object, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text or fallback


def _user_snapshot(user: User) -> dict[str, Any]:
    return {
        "user_id": int(user.id),
        "gmfn_id": getattr(user, "gmfn_id", None),
        "email": getattr(user, "email", None),
        "display_name": getattr(user, "display_name", None),
        "phone_e164": getattr(user, "phone_e164", None),
        "phone_verified": bool(
            getattr(user, "phone_e164", None)
            and getattr(user, "phone_verified_at", None)
        ),
    }


def _operation(
    operations: list[dict[str, Any]],
    *,
    table: str,
    column: str,
    count: int,
    action: str,
    note: str = "",
) -> None:
    operations.append(
        {
            "table": table,
            "column": column,
            "count": int(count),
            "action": action,
            "note": note,
        }
    )


def _bulk_update(
    db: Session,
    *,
    model: Any,
    column_name: str,
    canonical_user_id: int,
    duplicate_user_id: int,
    execute: bool,
    operations: list[dict[str, Any]],
) -> int:
    column = getattr(model, column_name)
    query = db.query(model).filter(column == int(duplicate_user_id))
    count = query.count()
    if count and execute:
        query.update({column_name: int(canonical_user_id)}, synchronize_session=False)
    _operation(
        operations,
        table=model.__tablename__,
        column=column_name,
        count=count,
        action="updated" if execute else "would_update",
    )
    return int(count)


def _bulk_update_text_user_ref(
    db: Session,
    *,
    model: Any,
    column_name: str,
    canonical_user_id: int,
    duplicate_user_id: int,
    execute: bool,
    operations: list[dict[str, Any]],
) -> int:
    column = getattr(model, column_name)
    query = db.query(model).filter(cast(column, String) == str(int(duplicate_user_id)))
    count = query.count()
    if count and execute:
        # Some live pilot columns were created as text while the model is int.
        # Only the no-match/count path is expected for current identity repair.
        query.update({column_name: str(int(canonical_user_id))}, synchronize_session=False)
    _operation(
        operations,
        table=model.__tablename__,
        column=column_name,
        count=count,
        action="updated" if execute else "would_update",
        note="Matched user reference by text-cast for live pilot schema compatibility.",
    )
    return int(count)


def _merge_clan_memberships(
    db: Session,
    *,
    canonical_user_id: int,
    duplicate_user_id: int,
    execute: bool,
    operations: list[dict[str, Any]],
) -> None:
    rows = (
        db.query(ClanMembership)
        .filter(ClanMembership.user_id == int(duplicate_user_id))
        .order_by(ClanMembership.id.asc())
        .all()
    )
    moved = 0
    retired = 0
    for row in rows:
        existing = (
            db.query(ClanMembership)
            .filter(
                ClanMembership.clan_id == int(row.clan_id),
                ClanMembership.user_id == int(canonical_user_id),
            )
            .first()
        )
        if existing is None:
            moved += 1
            if execute:
                row.user_id = int(canonical_user_id)
                db.add(row)
            continue

        retired += 1
        if execute:
            if _safe_str(row.role).lower() == "admin" and _safe_str(existing.role).lower() != "admin":
                existing.role = "admin"
                db.add(existing)
            if row.left_at is None:
                row.left_at = _now()
                db.add(row)

    _operation(
        operations,
        table=ClanMembership.__tablename__,
        column="user_id",
        count=moved,
        action="updated" if execute else "would_update",
        note="Memberships moved where canonical user did not already belong to the community.",
    )
    _operation(
        operations,
        table=ClanMembership.__tablename__,
        column="user_id",
        count=retired,
        action="retired_conflict" if execute else "would_retire_conflict",
        note="Duplicate memberships were closed where canonical user already belonged.",
    )


def _merge_join_requests(
    db: Session,
    *,
    canonical_user_id: int,
    duplicate_user_id: int,
    execute: bool,
    operations: list[dict[str, Any]],
) -> None:
    rows = (
        db.query(ClanJoinRequest)
        .filter(ClanJoinRequest.applicant_user_id == int(duplicate_user_id))
        .order_by(ClanJoinRequest.id.asc())
        .all()
    )
    moved = 0
    skipped = 0
    for row in rows:
        pending_conflict = (
            db.query(ClanJoinRequest)
            .filter(
                ClanJoinRequest.clan_id == int(row.clan_id),
                ClanJoinRequest.applicant_user_id == int(canonical_user_id),
                ClanJoinRequest.status == "pending",
            )
            .first()
            if _safe_str(row.status).lower() == "pending"
            else None
        )
        if pending_conflict is not None:
            skipped += 1
            continue

        moved += 1
        if execute:
            row.applicant_user_id = int(canonical_user_id)
            db.add(row)

    _operation(
        operations,
        table=ClanJoinRequest.__tablename__,
        column="applicant_user_id",
        count=moved,
        action="updated" if execute else "would_update",
    )
    _operation(
        operations,
        table=ClanJoinRequest.__tablename__,
        column="applicant_user_id",
        count=skipped,
        action="skipped_conflict",
        note="Skipped pending join requests where canonical user already has a pending request for that community.",
    )


def _merge_single_owner(
    db: Session,
    *,
    model: Any,
    column_name: str,
    canonical_user_id: int,
    duplicate_user_id: int,
    execute: bool,
    operations: list[dict[str, Any]],
    deactivate_on_conflict: bool = False,
) -> None:
    duplicate_rows = db.query(model).filter(getattr(model, column_name) == int(duplicate_user_id)).all()
    canonical_exists = (
        db.query(model).filter(getattr(model, column_name) == int(canonical_user_id)).first()
        is not None
    )
    if not duplicate_rows:
        _operation(
            operations,
            table=model.__tablename__,
            column=column_name,
            count=0,
            action="no_match",
        )
        return

    if canonical_exists:
        if deactivate_on_conflict and execute:
            for row in duplicate_rows:
                if hasattr(row, "is_active"):
                    row.is_active = False
                    db.add(row)
        _operation(
            operations,
            table=model.__tablename__,
            column=column_name,
            count=len(duplicate_rows),
            action="deactivated_conflict" if deactivate_on_conflict and execute else "skipped_conflict",
            note="Canonical user already has a unique record for this table.",
        )
        return

    if execute:
        for row in duplicate_rows:
            setattr(row, column_name, int(canonical_user_id))
            db.add(row)
    _operation(
        operations,
        table=model.__tablename__,
        column=column_name,
        count=len(duplicate_rows),
        action="updated" if execute else "would_update",
    )


def _merge_join_votes(
    db: Session,
    *,
    canonical_user_id: int,
    duplicate_user_id: int,
    execute: bool,
    operations: list[dict[str, Any]],
) -> None:
    rows = db.query(ClanJoinVote).filter(ClanJoinVote.voter_user_id == int(duplicate_user_id)).all()
    moved = 0
    skipped = 0
    for row in rows:
        existing = (
            db.query(ClanJoinVote)
            .filter(
                ClanJoinVote.join_request_id == int(row.join_request_id),
                ClanJoinVote.voter_user_id == int(canonical_user_id),
            )
            .first()
        )
        if existing is not None:
            skipped += 1
            continue
        moved += 1
        if execute:
            row.voter_user_id = int(canonical_user_id)
            db.add(row)

    _operation(
        operations,
        table=ClanJoinVote.__tablename__,
        column="voter_user_id",
        count=moved,
        action="updated" if execute else "would_update",
    )
    _operation(
        operations,
        table=ClanJoinVote.__tablename__,
        column="voter_user_id",
        count=skipped,
        action="skipped_conflict",
    )


def _merge_loan_guarantors(
    db: Session,
    *,
    canonical_user_id: int,
    duplicate_user_id: int,
    execute: bool,
    operations: list[dict[str, Any]],
) -> None:
    rows = db.query(LoanGuarantor).filter(LoanGuarantor.guarantor_user_id == int(duplicate_user_id)).all()
    moved = 0
    skipped = 0
    for row in rows:
        existing = (
            db.query(LoanGuarantor)
            .filter(
                LoanGuarantor.loan_id == int(row.loan_id),
                LoanGuarantor.guarantor_user_id == int(canonical_user_id),
            )
            .first()
        )
        if existing is not None:
            skipped += 1
            continue
        moved += 1
        if execute:
            row.guarantor_user_id = int(canonical_user_id)
            db.add(row)

    _operation(
        operations,
        table=LoanGuarantor.__tablename__,
        column="guarantor_user_id",
        count=moved,
        action="updated" if execute else "would_update",
    )
    _operation(
        operations,
        table=LoanGuarantor.__tablename__,
        column="guarantor_user_id",
        count=skipped,
        action="skipped_conflict",
    )


def _merge_confirmation_contacts(
    db: Session,
    *,
    canonical_user_id: int,
    duplicate_user_id: int,
    execute: bool,
    operations: list[dict[str, Any]],
) -> None:
    rows = (
        db.query(CommunityConfirmationContact)
        .filter(CommunityConfirmationContact.user_id == int(duplicate_user_id))
        .all()
    )
    moved = 0
    skipped = 0
    for row in rows:
        existing = (
            db.query(CommunityConfirmationContact)
            .filter(
                CommunityConfirmationContact.community_id == int(row.community_id),
                CommunityConfirmationContact.user_id == int(canonical_user_id),
            )
            .first()
        )
        if existing is not None:
            skipped += 1
            continue
        moved += 1
        if execute:
            row.user_id = int(canonical_user_id)
            db.add(row)

    _operation(
        operations,
        table=CommunityConfirmationContact.__tablename__,
        column="user_id",
        count=moved,
        action="updated" if execute else "would_update",
    )
    _operation(
        operations,
        table=CommunityConfirmationContact.__tablename__,
        column="user_id",
        count=skipped,
        action="skipped_conflict",
    )


SIMPLE_REFERENCES: tuple[tuple[Any, str], ...] = (
    (Clan, "created_by_user_id"),
    (Loan, "borrower_user_id"),
    (Loan, "decision_by_user_id"),
    (ClanJoinRequest, "invited_by_user_id"),
    (TrustEvent, "actor_user_id"),
    (TrustEvent, "subject_user_id"),
    (TrustSlip, "holder_user_id"),
    (Repayment, "payer_user_id"),
    (PoolEvent, "user_id"),
    (IdentityVerificationCheck, "user_id"),
    (DeviceFingerprint, "user_id"),
    (IdentityRiskSignal, "user_id"),
    (Notification, "user_id"),
    (ExpectedPayment, "user_id"),
    (BankCredit, "user_id"),
    (MarketplaceProduct, "seller_user_id"),
    (MarketplaceBroadcast, "author_user_id"),
    (FeatureEntitlement, "owner_user_id"),
    (VaultOrder, "owner_user_id"),
    (VaultAccessLink, "owner_user_id"),
)


def _retire_duplicate_user(
    duplicate: User,
    *,
    canonical: User,
    owner_confirmed: bool,
    reviewer_note: str,
) -> dict[str, Any]:
    before = _user_snapshot(duplicate)
    old_email = _safe_str(duplicate.email)
    duplicate.email = f"merged-user-{int(duplicate.id)}@merged.gmfn.local"
    duplicate.hashed_password = PENDING_APPROVAL_SENTINEL
    duplicate.gmfn_id = f"MERGED-U-{int(duplicate.id):06d}"
    duplicate.phone_e164 = None
    duplicate.phone_verified_at = None
    duplicate.display_name = duplicate.display_name or f"Merged into {canonical.gmfn_id or canonical.id}"
    return {
        "before": before,
        "after": _user_snapshot(duplicate),
        "old_email": old_email,
        "owner_confirmed": bool(owner_confirmed),
        "reviewer_note": reviewer_note,
    }


def reconcile_duplicate_identity(
    db: Session,
    *,
    canonical_user: User,
    duplicate_user: User,
    actor_user_id: int,
    owner_confirmed: bool,
    execute: bool,
    reviewer_note: str = "",
) -> dict[str, Any]:
    canonical_user_id = int(canonical_user.id)
    duplicate_user_id = int(duplicate_user.id)
    if canonical_user_id == duplicate_user_id:
        raise ValueError("Canonical and duplicate users must be different.")
    if execute and not owner_confirmed:
        raise PermissionError("Owner confirmation is required before executing an identity merge.")

    operations: list[dict[str, Any]] = []

    _merge_clan_memberships(
        db,
        canonical_user_id=canonical_user_id,
        duplicate_user_id=duplicate_user_id,
        execute=execute,
        operations=operations,
    )
    _merge_join_requests(
        db,
        canonical_user_id=canonical_user_id,
        duplicate_user_id=duplicate_user_id,
        execute=execute,
        operations=operations,
    )
    _merge_join_votes(
        db,
        canonical_user_id=canonical_user_id,
        duplicate_user_id=duplicate_user_id,
        execute=execute,
        operations=operations,
    )
    _merge_loan_guarantors(
        db,
        canonical_user_id=canonical_user_id,
        duplicate_user_id=duplicate_user_id,
        execute=execute,
        operations=operations,
    )
    _merge_confirmation_contacts(
        db,
        canonical_user_id=canonical_user_id,
        duplicate_user_id=duplicate_user_id,
        execute=execute,
        operations=operations,
    )

    _merge_single_owner(
        db,
        model=UserPayoutDestination,
        column_name="user_id",
        canonical_user_id=canonical_user_id,
        duplicate_user_id=duplicate_user_id,
        execute=execute,
        operations=operations,
    )
    _merge_single_owner(
        db,
        model=IdentityRecoveryProfile,
        column_name="user_id",
        canonical_user_id=canonical_user_id,
        duplicate_user_id=duplicate_user_id,
        execute=execute,
        operations=operations,
    )
    _merge_single_owner(
        db,
        model=MarketplaceShop,
        column_name="owner_user_id",
        canonical_user_id=canonical_user_id,
        duplicate_user_id=duplicate_user_id,
        execute=execute,
        operations=operations,
        deactivate_on_conflict=True,
    )

    for model, column_name in SIMPLE_REFERENCES:
        if model is Loan and column_name in {"borrower_user_id", "decision_by_user_id"}:
            _bulk_update_text_user_ref(
                db,
                model=model,
                column_name=column_name,
                canonical_user_id=canonical_user_id,
                duplicate_user_id=duplicate_user_id,
                execute=execute,
                operations=operations,
            )
        else:
            _bulk_update(
                db,
                model=model,
                column_name=column_name,
                canonical_user_id=canonical_user_id,
                duplicate_user_id=duplicate_user_id,
                execute=execute,
                operations=operations,
            )

    retire_payload: Optional[dict[str, Any]] = None
    audit_event_id: Optional[int] = None
    if execute:
        retire_payload = _retire_duplicate_user(
            duplicate_user,
            canonical=canonical_user,
            owner_confirmed=owner_confirmed,
            reviewer_note=reviewer_note,
        )
        db.add(duplicate_user)
        meta = build_trust_meta(
            reason="identity_duplicate_reconciled",
            note=(
                reviewer_note
                or "Admin reconciled an owner-confirmed duplicate GSN identity."
            ),
            system=True,
            extra={
                "canonical_user": _user_snapshot(canonical_user),
                "duplicate_user": retire_payload,
                "operations": operations,
            },
        )
        event = log_trust_event(
            db,
            event_type="identity.duplicate_reconciled",
            clan_id=None,
            actor_user_id=int(actor_user_id),
            subject_user_id=canonical_user_id,
            meta=meta,
            dedupe_key=f"identity-reconcile:{canonical_user_id}:{duplicate_user_id}",
            commit=False,
            refresh=False,
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        db.refresh(canonical_user)
        db.refresh(duplicate_user)
        audit_event_id = int(event.id)

    return {
        "ok": True,
        "mode": "execute" if execute else "dry_run",
        "owner_confirmed": bool(owner_confirmed),
        "canonical_user": _user_snapshot(canonical_user),
        "duplicate_user": _user_snapshot(duplicate_user),
        "operations": operations,
        "audit_event_id": audit_event_id,
        "warning": (
            "Dry run only; no records were changed."
            if not execute
            else "Duplicate identity was retired after owner-confirmed reconciliation. Review skipped_conflict rows before declaring all evidence fully merged."
        ),
    }
