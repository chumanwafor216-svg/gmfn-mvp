# app/api/routes/reports.py
from __future__ import annotations

from io import BytesIO, StringIO
import csv
import json
import zipfile
from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.auth import get_current_user
from app.db.models import (
    User,
    Loan,
    Clan,
    ClanMembership,
    LoanGuarantor,
    Repayment,
    TrustEvent,
    TrustSlip,
)

from app.services.exposure_service import get_clan_exposure_rows
from app.services.trust_score_service import compute_trust_score_explained
from app.services.reports_service import build_loan_trust_report_pdf, build_clan_exposure_report_pdf

router = APIRouter(prefix="/reports", tags=["reports"])


def _csv_bytes(rows: List[List[Any]]) -> bytes:
    sio = StringIO()
    w = csv.writer(sio)
    for r in rows:
        w.writerow(r)
    return sio.getvalue().encode("utf-8")


def _ensure_clan_admin_or_platform_admin(db: Session, *, current_user: User, clan_id: int) -> None:
    is_platform_admin = (getattr(current_user, "role", "") or "").lower() == "admin"

    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == int(current_user.id),
            ClanMembership.clan_id == int(clan_id),
        )
        .first()
    )
    is_clan_admin = bool(m) and (getattr(m, "role", "") or "").lower() == "admin"

    if not (is_platform_admin or is_clan_admin):
        raise HTTPException(status_code=403, detail="Clan admin or platform admin only")


def _ensure_can_view_loan_report(db: Session, *, current_user: User, loan: Loan) -> None:
    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == int(current_user.id),
            ClanMembership.clan_id == loan.clan_id,
        )
        .first()
    )
    if not m:
        raise HTTPException(status_code=403, detail="Not allowed")

    is_owner = int(loan.borrower_user_id) == int(current_user.id)
    is_admin = (m.role == "admin")
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Not allowed")


def _user_email_map(
    db: Session,
    *,
    borrower: User | None,
    guarantors: List[LoanGuarantor],
    repayments: List[Repayment],
    trust_events: List[TrustEvent],
) -> Dict[int, str]:
    user_ids = set()
    if borrower:
        user_ids.add(int(borrower.id))
    for g in guarantors:
        user_ids.add(int(g.guarantor_user_id))
    for r in repayments:
        user_ids.add(int(r.payer_user_id))
    for e in trust_events:
        user_ids.add(int(e.actor_user_id))
        user_ids.add(int(e.subject_user_id))

    users = db.query(User).filter(User.id.in_(list(user_ids))).all() if user_ids else []
    return {int(u.id): u.email for u in users}


def _trust_scores_for_report(
    db: Session,
    *,
    borrower: User | None,
    guarantors: List[LoanGuarantor],
) -> tuple[Dict[str, Any] | None, Dict[int, Dict[str, Any]]]:
    borrower_score = None
    if borrower:
        borrower_score = compute_trust_score_explained(db, int(borrower.id))

    guarantor_scores: Dict[int, Dict[str, Any]] = {}
    for g in guarantors:
        uid = int(g.guarantor_user_id)
        guarantor_scores[uid] = compute_trust_score_explained(db, uid)

    return borrower_score, guarantor_scores


def _gather_report_data(db: Session, *, loan_id: int) -> Dict[str, Any]:
    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    borrower = db.get(User, int(loan.borrower_user_id))
    clan = db.get(Clan, int(loan.clan_id))

    guarantors = (
        db.query(LoanGuarantor)
        .filter(LoanGuarantor.loan_id == loan.id)
        .order_by(LoanGuarantor.id.asc())
        .all()
    )
    repayments = (
        db.query(Repayment)
        .filter(Repayment.loan_id == loan.id)
        .order_by(Repayment.id.asc())
        .all()
    )
    trust_events = (
        db.query(TrustEvent)
        .filter(TrustEvent.loan_id == loan.id)
        .order_by(TrustEvent.id.asc())
        .all()
    )

    user_email_by_id = _user_email_map(
        db,
        borrower=borrower,
        guarantors=guarantors,
        repayments=repayments,
        trust_events=trust_events,
    )

    clan_exposure_rows = get_clan_exposure_rows(db, clan_id=int(loan.clan_id))

    borrower_score, guarantor_scores = _trust_scores_for_report(
        db,
        borrower=borrower,
        guarantors=guarantors,
    )

    trust_slip = (
        db.query(TrustSlip)
        .filter(TrustSlip.holder_user_id == int(loan.borrower_user_id))
        .order_by(TrustSlip.id.desc())
        .first()
    )

    return {
        "loan": loan,
        "borrower": borrower,
        "clan": clan,
        "guarantors": guarantors,
        "repayments": repayments,
        "trust_events": trust_events,
        "user_email_by_id": user_email_by_id,
        "clan_exposure_rows": clan_exposure_rows,
        "borrower_trust_score": borrower_score,
        "guarantor_trust_scores": guarantor_scores,
        "trust_slip": trust_slip,
    }


def _build_clan_members_csv(db: Session, *, clan_id: int) -> bytes:
    q = (
        db.query(
            ClanMembership.user_id,
            User.email,
            ClanMembership.role,
            ClanMembership.personal_pool_balance,
            ClanMembership.created_at,
        )
        .join(User, User.id == ClanMembership.user_id)
        .filter(ClanMembership.clan_id == int(clan_id))
        .order_by(User.id.asc())
    )

    rows: List[List[Any]] = []
    rows.append(["user_id", "email", "role", "personal_pool_balance", "joined_at"])
    for user_id, email, role, pool, created_at in q.all():
        rows.append([int(user_id), email, role, str(pool or 0), created_at])

    return _csv_bytes(rows)


def _build_clan_loans_csv(db: Session, *, clan_id: int) -> bytes:
    q = (
        db.query(
            Loan.id,
            Loan.borrower_user_id,
            User.email,
            Loan.status,
            Loan.amount,
            Loan.currency,
            Loan.service_fee,
            Loan.net_disbursed_amount,
            Loan.paid_total,
            Loan.remaining_amount,
            Loan.created_at,
            Loan.decision_at,
            Loan.repaid_at,
        )
        .join(User, User.id == Loan.borrower_user_id)
        .filter(Loan.clan_id == int(clan_id))
        .order_by(Loan.id.asc())
    )

    rows: List[List[Any]] = []
    rows.append([
        "loan_id",
        "borrower_user_id",
        "borrower_email",
        "status",
        "amount",
        "currency",
        "service_fee",
        "net_disbursed_amount",
        "paid_total",
        "remaining_amount",
        "created_at",
        "decision_at",
        "repaid_at",
    ])

    for (
        loan_id,
        borrower_user_id,
        email,
        status,
        amount,
        currency,
        service_fee,
        net_disbursed_amount,
        paid_total,
        remaining_amount,
        created_at,
        decision_at,
        repaid_at,
    ) in q.all():
        rows.append([
            int(loan_id),
            int(borrower_user_id),
            email,
            status,
            str(amount or 0),
            currency,
            str(service_fee or 0),
            str(net_disbursed_amount or 0),
            str(paid_total or 0),
            str(remaining_amount or 0),
            created_at,
            decision_at,
            repaid_at,
        ])

    return _csv_bytes(rows)


@router.get("/clans/{clan_id}/exposure.csv")
def download_clan_exposure_csv(
    clan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_clan_admin_or_platform_admin(db, current_user=current_user, clan_id=int(clan_id))

    rows = get_clan_exposure_rows(db, clan_id=int(clan_id))
    out: List[List[Any]] = []
    out.append(["user_id", "email", "pool_balance", "exposure", "available"])
    for r in rows:
        out.append([r.get("user_id"), r.get("email"), r.get("pool_balance"), r.get("exposure"), r.get("available")])

    data_bytes = _csv_bytes(out)
    filename = f"gmfn-clan-{clan_id}-exposure.csv"
    return StreamingResponse(
        BytesIO(data_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/clans/{clan_id}/exposure.pdf")
def download_clan_exposure_pdf(
    clan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_clan_admin_or_platform_admin(db, current_user=current_user, clan_id=int(clan_id))

    clan = db.get(Clan, int(clan_id))
    clan_name = getattr(clan, "name", None) if clan else None

    rows = get_clan_exposure_rows(db, clan_id=int(clan_id))
    pdf_bytes = build_clan_exposure_report_pdf(
        clan_id=int(clan_id),
        clan_name=clan_name,
        clan_exposure_rows=rows,
    )

    filename = f"gmfn-clan-{clan_id}-exposure.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/clans/{clan_id}/governance-pack.zip")
def download_clan_governance_pack(
    clan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_clan_admin_or_platform_admin(db, current_user=current_user, clan_id=int(clan_id))

    clan = db.get(Clan, int(clan_id))
    clan_name = getattr(clan, "name", None) if clan else None

    exposure_rows = get_clan_exposure_rows(db, clan_id=int(clan_id))

    exposure_csv = _csv_bytes(
        [["user_id", "email", "pool_balance", "exposure", "available"]]
        + [
            [r.get("user_id"), r.get("email"), r.get("pool_balance"), r.get("exposure"), r.get("available")]
            for r in exposure_rows
        ]
    )

    members_csv = _build_clan_members_csv(db, clan_id=int(clan_id))
    loans_csv = _build_clan_loans_csv(db, clan_id=int(clan_id))

    exposure_pdf = build_clan_exposure_report_pdf(
        clan_id=int(clan_id),
        clan_name=clan_name,
        clan_exposure_rows=exposure_rows,
    )

    ts = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    zip_buf = BytesIO()
    with zipfile.ZipFile(zip_buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr(f"clan-{clan_id}-exposure.csv", exposure_csv)
        z.writestr(f"clan-{clan_id}-members.csv", members_csv)
        z.writestr(f"clan-{clan_id}-loans.csv", loans_csv)
        z.writestr(f"clan-{clan_id}-exposure.pdf", exposure_pdf)
        z.writestr(
            "README.txt",
            f"GMFN Clan Governance Pack\n"
            f"Clan ID: {clan_id}\n"
            f"Clan Name: {clan_name or '—'}\n"
            f"Generated: {ts} UTC\n",
        )

    filename = f"gmfn-clan-{clan_id}-governance-pack-{ts}.zip"
    return StreamingResponse(
        BytesIO(zip_buf.getvalue()),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/loans/{loan_id}/trust-report.csv")
def download_loan_trust_report_csv(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = _gather_report_data(db, loan_id=loan_id)
    loan: Loan = data["loan"]
    _ensure_can_view_loan_report(db, current_user=current_user, loan=loan)

    clan: Clan | None = data["clan"]
    guarantors: List[LoanGuarantor] = data["guarantors"]
    repayments: List[Repayment] = data["repayments"]
    trust_events: List[TrustEvent] = data["trust_events"]
    user_email_by_id: Dict[int, str] = data["user_email_by_id"]
    clan_exposure_rows: List[Dict[str, Any]] = data["clan_exposure_rows"]
    borrower_score: Dict[str, Any] | None = data["borrower_trust_score"]
    guarantor_scores: Dict[int, Dict[str, Any]] = data["guarantor_trust_scores"]

    rows: List[List[Any]] = []

    rows.append(["SECTION", "LOAN_SUMMARY"])
    rows.append(["loan_id", loan.id])
    rows.append(["clan_id", loan.clan_id])
    rows.append(["clan_name", getattr(clan, "name", None)])
    rows.append(["borrower_user_id", loan.borrower_user_id])
    rows.append(["borrower_email", user_email_by_id.get(int(loan.borrower_user_id))])
    rows.append(["status", getattr(loan, "status", None)])
    rows.append(["amount", str(getattr(loan, "amount", 0))])
    rows.append(["currency", getattr(loan, "currency", None)])
    rows.append(["service_fee", str(getattr(loan, "service_fee", 0))])
    rows.append(["net_disbursed_amount", str(getattr(loan, "net_disbursed_amount", 0))])
    rows.append(["paid_total", str(getattr(loan, "paid_total", 0))])
    rows.append(["remaining_amount", str(getattr(loan, "remaining_amount", 0))])
    rows.append(["created_at", getattr(loan, "created_at", None)])
    rows.append(["decision_at", getattr(loan, "decision_at", None)])
    rows.append(["repaid_at", getattr(loan, "repaid_at", None)])
    rows.append([])

    rows.append(["SECTION", "TRUST_SCORES"])
    if borrower_score:
        rows.append(["standing_score", borrower_score.get("standing_score")])
        rows.append(["band", borrower_score.get("band")])
        rows.append(["level_label", borrower_score.get("level_label")])
        rows.append(["lifetime_trust", borrower_score.get("lifetime_trust")])
        rows.append(["recency_factor", borrower_score.get("recency_factor")])
        rows.append(["counts", borrower_score.get("counts")])
        rows.append(["gains", borrower_score.get("gains")])
        rows.append(["penalties", borrower_score.get("penalties")])
    else:
        rows.append(["standing_score", None])
    rows.append([])

    rows.append(["SECTION", "CLAN_EXPOSURE"])
    rows.append(["user_id", "email", "pool_balance", "exposure", "available"])
    for r in clan_exposure_rows:
        rows.append([r.get("user_id"), r.get("email"), r.get("pool_balance"), r.get("exposure"), r.get("available")])
    rows.append([])

    rows.append(["SECTION", "GUARANTORS"])
    rows.append(["guarantor_row_id", "guarantor_user_id", "email", "status", "pledge_amount", "locked_amount", "released_amount", "responded_at", "created_at", "standing_score", "band"])
    for g in guarantors:
        uid = int(g.guarantor_user_id)
        score = guarantor_scores.get(uid, {}) or {}
        rows.append([
            int(g.id),
            uid,
            user_email_by_id.get(uid),
            getattr(g, "status", None),
            str(getattr(g, "pledge_amount", 0)),
            str(getattr(g, "locked_amount", 0)),
            str(getattr(g, "released_amount", 0)),
            getattr(g, "responded_at", None),
            getattr(g, "created_at", None),
            score.get("standing_score"),
            score.get("band"),
        ])
    rows.append([])

    rows.append(["SECTION", "REPAYMENTS"])
    rows.append(["repayment_id", "payer_user_id", "email", "amount", "created_at"])
    for r in repayments:
        uid = int(r.payer_user_id)
        rows.append([int(r.id), uid, user_email_by_id.get(uid), str(getattr(r, "amount", 0)), getattr(r, "created_at", None)])
    rows.append([])

    rows.append(["SECTION", "TRUST_EVENTS"])
    rows.append(["event_id", "created_at", "event_type", "actor_user_id", "actor_email", "subject_user_id", "subject_email", "guarantor_id", "meta"])
    for te in trust_events:
        rows.append([
            int(te.id),
            getattr(te, "created_at", None),
            te.event_type,
            int(te.actor_user_id),
            user_email_by_id.get(int(te.actor_user_id)),
            int(te.subject_user_id),
            user_email_by_id.get(int(te.subject_user_id)),
            te.guarantor_id,
            getattr(te, "meta", None),
        ])

    data_bytes = _csv_bytes(rows)
    filename = f"gmfn-loan-{loan.id}-trust-report.csv"
    return StreamingResponse(
        BytesIO(data_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/loans/{loan_id}/trust-report.pdf")
def download_loan_trust_report_pdf(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = _gather_report_data(db, loan_id=loan_id)
    loan: Loan = data["loan"]
    _ensure_can_view_loan_report(db, current_user=current_user, loan=loan)

    pdf_bytes = build_loan_trust_report_pdf(
        loan=data["loan"],
        clan=data["clan"],
        borrower=data["borrower"],
        guarantors=data["guarantors"],
        repayments=data["repayments"],
        trust_events=data["trust_events"],
        user_email_by_id=data["user_email_by_id"],
        clan_exposure_rows=data["clan_exposure_rows"],
        borrower_trust_score=data["borrower_trust_score"],
        guarantor_trust_scores=data["guarantor_trust_scores"],
    )

    filename = f"gmfn-loan-{loan.id}-trust-report.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/loans/{loan_id}/evidence-pack.zip")
def download_loan_evidence_pack_zip(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = _gather_report_data(db, loan_id=loan_id)
    loan: Loan = data["loan"]
    _ensure_can_view_loan_report(db, current_user=current_user, loan=loan)

    trust_slip = data.get("trust_slip")
    pdf_bytes = build_loan_trust_report_pdf(
        loan=data["loan"],
        clan=data["clan"],
        borrower=data["borrower"],
        guarantors=data["guarantors"],
        repayments=data["repayments"],
        trust_events=data["trust_events"],
        user_email_by_id=data["user_email_by_id"],
        clan_exposure_rows=data["clan_exposure_rows"],
        borrower_trust_score=data["borrower_trust_score"],
        guarantor_trust_scores=data["guarantor_trust_scores"],
    )

    snapshot = None
    if trust_slip and getattr(trust_slip, "snapshot_json", None):
        try:
            snapshot = json.loads(trust_slip.snapshot_json)
        except Exception:
            snapshot = {"raw_snapshot_json": trust_slip.snapshot_json}

    manifest = {
        "artifact": "gmfn_loan_evidence_pack",
        "loan_id": int(loan.id),
        "clan_id": int(loan.clan_id),
        "borrower_user_id": int(loan.borrower_user_id),
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "files": [
            "manifest.json",
            "trustslip_snapshot.json",
            "trust_timeline.pdf",
            "checksums.json",
            "README.txt",
        ],
    }

    trustslip_snapshot = snapshot or {
        "trust_slip_id": int(getattr(trust_slip, "id", 0) or 0) if trust_slip else None,
        "code": getattr(trust_slip, "code", None) if trust_slip else None,
        "snapshot_version": getattr(trust_slip, "snapshot_version", None) if trust_slip else None,
        "snapshot_checksum": getattr(trust_slip, "snapshot_checksum", None) if trust_slip else None,
        "status": getattr(trust_slip, "status", None) if trust_slip else None,
    }

    checksums = {
        "trust_timeline_pdf_bytes": len(pdf_bytes),
        "trustslip_snapshot_checksum": getattr(trust_slip, "snapshot_checksum", None) if trust_slip else None,
    }

    readme = (
        "GMFN Loan Evidence Pack\n"
        f"Loan ID: {loan.id}\n"
        f"Clan ID: {loan.clan_id}\n"
        "Contents:\n"
        "- manifest.json\n"
        "- trustslip_snapshot.json\n"
        "- trust_timeline.pdf\n"
        "- checksums.json\n"
        "- README.txt\n"
    )

    ts = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    zip_buf = BytesIO()
    with zipfile.ZipFile(zip_buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("manifest.json", json.dumps(manifest, indent=2, default=str))
        z.writestr("trustslip_snapshot.json", json.dumps(trustslip_snapshot, indent=2, default=str))
        z.writestr("trust_timeline.pdf", pdf_bytes)
        z.writestr("checksums.json", json.dumps(checksums, indent=2, default=str))
        z.writestr("README.txt", readme)

    filename = f"gmfn-loan-{loan.id}-evidence-pack-{ts}.zip"
    return StreamingResponse(
        BytesIO(zip_buf.getvalue()),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )