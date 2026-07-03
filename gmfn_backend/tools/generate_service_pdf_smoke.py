from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db.base import Base  # noqa: E402
from app.db.models import Clan, Loan, TrustEvent, User  # noqa: E402
from app.services.evidence_pack_pdf_service import build_clan_evidence_pack_pdf  # noqa: E402
from app.services.loan_evidence_pack_pdf_service import build_loan_evidence_pack_pdf  # noqa: E402
from app.services.trust_slip_evidence_pdf_service import build_trust_slip_pdf  # noqa: E402
from app.services.user_evidence_pack_pdf_service import build_user_evidence_pack_pdf  # noqa: E402
from tools.render_pdf_to_png import render_first_page, render_page  # noqa: E402


def _session():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(bind=engine)
    session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    return engine, session_local()


def build_member_evidence_smoke(
    pdf_path: Path,
    png_path: Path | None = None,
    *,
    render_png: bool = True,
) -> dict[str, Path]:
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    if png_path:
        png_path.parent.mkdir(parents=True, exist_ok=True)

    engine, db = _session()
    try:
        user = User(
            id=9101,
            email="member-evidence-smoke@example.com",
            hashed_password="smoke-only",
            role="user",
            gmfn_id="GSN-U-SERVICE-SMOKE",
            trust_score=74,
            trust_band="B",
        )
        db.add(user)
        db.commit()

        pdf_bytes = build_user_evidence_pack_pdf(db, user_id=int(user.id), redact=True)
        pdf_path.write_bytes(pdf_bytes)
    finally:
        db.close()
        engine.dispose()

    result: dict[str, Path] = {"pdf": pdf_path}
    if render_png:
        if png_path is None:
            png_path = pdf_path.with_suffix(".png")
        result["png"] = render_first_page(pdf_path, png_path)
    return result


def _base_smoke_users() -> list[User]:
    return [
        User(
            id=9301,
            email="community-owner-smoke@example.com",
            hashed_password="smoke-only",
            role="user",
            gmfn_id="GSN-U-COMMUNITY-OWNER",
            trust_score=78,
            trust_band="B",
        ),
        User(
            id=9302,
            email="community-member-smoke@example.com",
            hashed_password="smoke-only",
            role="user",
            gmfn_id="GSN-U-COMMUNITY-MEMBER",
            trust_score=68,
            trust_band="C",
        ),
    ]


def build_community_evidence_smoke(
    pdf_path: Path,
    png_path: Path | None = None,
    *,
    render_png: bool = True,
) -> dict[str, Path]:
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    if png_path:
        png_path.parent.mkdir(parents=True, exist_ok=True)

    engine, db = _session()
    try:
        owner, member = _base_smoke_users()
        clan = Clan(
            id=9301,
            name="GSN Community Evidence Smoke",
            community_code="GSN-C-EVIDENCE-SMOKE",
            created_by_user_id=int(owner.id),
        )
        now = datetime(2026, 7, 3, 7, 0, tzinfo=timezone.utc)
        db.add_all([owner, member, clan])
        db.commit()
        db.add_all(
            [
                TrustEvent(
                    id=930101,
                    event_type="invite_created",
                    clan_id=int(clan.id),
                    actor_user_id=int(owner.id),
                    subject_user_id=int(owner.id),
                    meta_json='{"source":"smoke"}',
                    dedupe_key="smoke-community-invite-created",
                    created_at=now,
                ),
                TrustEvent(
                    id=930102,
                    event_type="clan_join_via_invite",
                    clan_id=int(clan.id),
                    actor_user_id=int(member.id),
                    subject_user_id=int(member.id),
                    meta_json='{"invite_code":"SMOKE-CODE-12345","invited_by_user_id":9301}',
                    dedupe_key="smoke-community-join",
                    created_at=now,
                ),
            ]
        )
        db.commit()

        pdf_bytes = build_clan_evidence_pack_pdf(db, clan_id=int(clan.id), redact=True)
        pdf_path.write_bytes(pdf_bytes)
    finally:
        db.close()
        engine.dispose()

    result: dict[str, Path] = {"pdf": pdf_path}
    if render_png:
        if png_path is None:
            png_path = pdf_path.with_suffix(".png")
        result["png"] = render_first_page(pdf_path, png_path)
    return result


def build_loan_evidence_smoke(
    pdf_path: Path,
    png_path: Path | None = None,
    *,
    render_png: bool = True,
) -> dict[str, Path]:
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    if png_path:
        png_path.parent.mkdir(parents=True, exist_ok=True)

    engine, db = _session()
    try:
        borrower = User(
            id=9401,
            email="support-borrower-smoke@example.com",
            hashed_password="smoke-only",
            role="user",
            gmfn_id="GSN-U-SUPPORT-SMOKE",
            trust_score=72,
            trust_band="B",
        )
        clan = Clan(
            id=9401,
            name="GSN Support Evidence Smoke Community",
            community_code="GSN-C-SUPPORT-SMOKE",
            created_by_user_id=int(borrower.id),
        )
        loan = Loan(
            id=9401,
            borrower_user_id=int(borrower.id),
            clan_id=int(clan.id),
            amount=Decimal("40000.00"),
            currency="NGN",
            status="pending",
            pool_used=Decimal("5000.00"),
            guarantee_gap=Decimal("35000.00"),
            guarantors_required=2,
        )
        db.add_all([borrower, clan, loan])
        db.commit()

        pdf_bytes = build_loan_evidence_pack_pdf(db, loan_id=int(loan.id), redact=True)
        pdf_path.write_bytes(pdf_bytes)
    finally:
        db.close()
        engine.dispose()

    result: dict[str, Path] = {"pdf": pdf_path}
    if render_png:
        if png_path is None:
            png_path = pdf_path.with_suffix(".png")
        result["png"] = render_first_page(pdf_path, png_path)
    return result


def _trust_slip_summary() -> dict[str, Any]:
    return {
        "user_id": 9201,
        "gmfn_id": "GSN-U-TRUSTSLIP-SMOKE",
        "lifetime_trust": "1200.00",
        "standing_score": "81",
        "trust_slip_limit": "50000.00",
        "cci_score": "78",
        "cci_band": "B",
        "sponsor_count": 3,
        "last_full_repayment_at": "2026-07-01T09:00:00+00:00",
        "days_since_last_full_repayment": 2,
        "evidence_summary": {
            "capacity_context": {
                "available_guarantee_capacity": "100000.00",
                "current_locked_guarantees": "20000.00",
                "overexposure_ratio": "0.20",
                "risk_level": "controlled",
            },
            "readiness_context": {
                "recommendation": "review current context",
                "readiness_score": "76",
                "estimated_guarantee_gap": "10000.00",
                "capacity_ratio": "0.90",
            },
        },
        "counts": {
            "full_repayments": 4,
            "guarantor_success": 2,
            "missed_payments": 0,
            "defaults": 0,
            "fraud_flags": 0,
        },
        "risk_flags": [],
    }


def build_trustslip_evidence_smoke(
    pdf_path: Path,
    png_path: Path | None = None,
    page2_png_path: Path | None = None,
    *,
    render_png: bool = True,
) -> dict[str, Path]:
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    if png_path:
        png_path.parent.mkdir(parents=True, exist_ok=True)
    if page2_png_path:
        page2_png_path.parent.mkdir(parents=True, exist_ok=True)

    engine, db = _session()
    try:
        user = User(
            id=9201,
            email="trustslip-smoke@example.com",
            hashed_password="smoke-only",
            role="user",
            gmfn_id="GSN-U-TRUSTSLIP-SMOKE",
            trust_score=81,
            trust_band="A",
        )
        db.add(user)
        db.commit()

        pdf_bytes = build_trust_slip_pdf(
            db,
            _trust_slip_summary(),
            pack_meta={
                "pack_id": "GSN-PACK-TRUSTSLIP-SMOKE",
                "merchant_verify_ui_url": "https://gmfn-frontend.onrender.com/t/GSN-SMOKE",
            },
        )
        pdf_path.write_bytes(pdf_bytes)
    finally:
        db.close()
        engine.dispose()

    result: dict[str, Path] = {"pdf": pdf_path}
    if render_png:
        if png_path is None:
            png_path = pdf_path.with_suffix(".png")
        result["png"] = render_first_page(pdf_path, png_path)
        if page2_png_path is None:
            page2_png_path = pdf_path.with_name(f"{pdf_path.stem}-page2.png")
        result["page2_png"] = render_page(pdf_path, page2_png_path, page_number=2)
    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate service-built evidence PDFs and PNGs for local visual QA."
    )
    parser.add_argument(
        "--pdf",
        default=str(REPO_ROOT / "screenshots" / "pdf-smoke" / "member-evidence-pack-smoke.pdf"),
        help="Path for the generated service PDF.",
    )
    parser.add_argument(
        "--png",
        default=str(REPO_ROOT / "screenshots" / "pdf-smoke" / "member-evidence-pack-smoke.png"),
        help="Path for the rendered PNG.",
    )
    parser.add_argument(
        "--trustslip-pdf",
        default=str(REPO_ROOT / "screenshots" / "pdf-smoke" / "trustslip-evidence-smoke.pdf"),
        help="Path for the generated TrustSlip evidence PDF.",
    )
    parser.add_argument(
        "--trustslip-png",
        default=str(REPO_ROOT / "screenshots" / "pdf-smoke" / "trustslip-evidence-smoke.png"),
        help="Path for the rendered TrustSlip evidence PNG.",
    )
    parser.add_argument(
        "--trustslip-page2-png",
        default=str(REPO_ROOT / "screenshots" / "pdf-smoke" / "trustslip-evidence-smoke-page2.png"),
        help="Path for the rendered second page of the TrustSlip evidence PNG.",
    )
    parser.add_argument(
        "--community-pdf",
        default=str(REPO_ROOT / "screenshots" / "pdf-smoke" / "community-evidence-pack-smoke.pdf"),
        help="Path for the generated community evidence PDF.",
    )
    parser.add_argument(
        "--community-png",
        default=str(REPO_ROOT / "screenshots" / "pdf-smoke" / "community-evidence-pack-smoke.png"),
        help="Path for the rendered community evidence PNG.",
    )
    parser.add_argument(
        "--loan-pdf",
        default=str(REPO_ROOT / "screenshots" / "pdf-smoke" / "loan-evidence-pack-smoke.pdf"),
        help="Path for the generated loan evidence PDF.",
    )
    parser.add_argument(
        "--loan-png",
        default=str(REPO_ROOT / "screenshots" / "pdf-smoke" / "loan-evidence-pack-smoke.png"),
        help="Path for the rendered loan evidence PNG.",
    )
    parser.add_argument(
        "--no-render",
        action="store_true",
        help="Only write PDFs; skip PNG rendering.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    result = build_member_evidence_smoke(
        Path(args.pdf),
        Path(args.png),
        render_png=not args.no_render,
    )
    trustslip_result = build_trustslip_evidence_smoke(
        Path(args.trustslip_pdf),
        Path(args.trustslip_png),
        Path(args.trustslip_page2_png),
        render_png=not args.no_render,
    )
    community_result = build_community_evidence_smoke(
        Path(args.community_pdf),
        Path(args.community_png),
        render_png=not args.no_render,
    )
    loan_result = build_loan_evidence_smoke(
        Path(args.loan_pdf),
        Path(args.loan_png),
        render_png=not args.no_render,
    )
    for kind, path in result.items():
        print(f"member_{kind}: {path.resolve()}")
    for kind, path in trustslip_result.items():
        print(f"trustslip_{kind}: {path.resolve()}")
    for kind, path in community_result.items():
        print(f"community_{kind}: {path.resolve()}")
    for kind, path in loan_result.items():
        print(f"loan_{kind}: {path.resolve()}")


if __name__ == "__main__":
    main()
