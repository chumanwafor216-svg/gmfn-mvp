from __future__ import annotations

import os
from typing import Any

from sqlalchemy.orm import Session

from app.db.member_credit_models import (
    MemberCreditPackVersion,
    MemberCreditServiceVersion,
)
from app.services.member_credit_permissions import (
    MEMBER_CREDIT_SERVICE_CONTRACTS,
    get_member_credit_service_permissions,
)
from app.services.member_credit_service import get_member_credit_self
from app.services.member_credit_spotlight_service import (
    SPOTLIGHT_SERVICE_CODE,
    member_credit_spotlight_writers_enabled,
)
from app.services.payment_operations_policy import payment_operations_enabled


def _test_catalogue_enabled() -> bool:
    return (
        str(os.getenv("PYTEST_RUNNING", "0")) == "1"
        and str(os.getenv("GSN_MEMBER_CREDIT_TEST_QUOTES_ENABLED", "0"))
        .strip()
        .lower()
        in {"1", "true", "yes", "on"}
    )


def _service_action_available(service_code: str) -> bool:
    if service_code == SPOTLIGHT_SERVICE_CODE:
        return member_credit_spotlight_writers_enabled()
    return False


def get_member_credit_catalogue(
    db: Session,
    *,
    member_user_id: int,
) -> dict[str, Any]:
    account = get_member_credit_self(db, member_user_id=int(member_user_id), limit=1)
    balance = int(account["balance_units"])
    test_catalogue = _test_catalogue_enabled()
    payments_open = payment_operations_enabled()

    packs: list[dict[str, Any]] = []
    services: list[dict[str, Any]] = []
    if test_catalogue:
        pack_rows = (
            db.query(MemberCreditPackVersion)
            .filter(MemberCreditPackVersion.status == "test_active")
            .order_by(MemberCreditPackVersion.version.desc(), MemberCreditPackVersion.id.asc())
            .all()
        )
        packs = [
            {
                "pack_version_id": int(row.id),
                "pack_code": str(row.pack_code),
                "catalog_version": int(row.version),
                "credit_units": int(row.credit_units),
                "amount_minor": int(row.quoted_amount_minor),
                "currency": str(row.currency),
                "terms_json": row.terms_json,
            }
            for row in pack_rows
        ]

        service_rows = (
            db.query(MemberCreditServiceVersion)
            .filter(MemberCreditServiceVersion.status == "test_active")
            .order_by(
                MemberCreditServiceVersion.service_code.asc(),
                MemberCreditServiceVersion.version.desc(),
                MemberCreditServiceVersion.id.asc(),
            )
            .all()
        )
        newest_by_code: dict[str, MemberCreditServiceVersion] = {}
        for row in service_rows:
            code = str(row.service_code)
            if code in MEMBER_CREDIT_SERVICE_CONTRACTS and code not in newest_by_code:
                newest_by_code[code] = row
        permissions = get_member_credit_service_permissions(
            db,
            member_user_id=int(member_user_id),
            service_codes=newest_by_code.keys(),
        )
        for code, row in newest_by_code.items():
            contract = MEMBER_CREDIT_SERVICE_CONTRACTS[code]
            action_available = _service_action_available(code)
            if not action_available:
                continue
            cost = int(row.credit_cost)
            services.append(
                {
                    "service_version_id": int(row.id),
                    "service_code": code,
                    "catalog_version": int(row.version),
                    "service_name": str(contract["service_name"]),
                    "scope": str(contract["scope"]),
                    "workflow_url": str(contract["workflow_url"]),
                    "credit_cost": cost,
                    "duration_seconds": int(row.duration_seconds),
                    "permission_enabled": bool(permissions.get(code, False)),
                    "spending_enabled": bool(payments_open and action_available),
                    "balance_units": balance,
                    "resulting_balance_units": max(0, balance - cost),
                    "has_sufficient_balance": balance >= cost,
                }
            )

    return {
        "member_user_id": int(member_user_id),
        "balance_units": balance,
        "purchase_operations_enabled": bool(payments_open and test_catalogue),
        "spending_operations_enabled": bool(payments_open and any(services)),
        "catalogue_mode": "isolated_test" if test_catalogue else "inactive",
        "packs": packs,
        "services": services,
    }
