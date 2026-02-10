# app/services/reports_service.py
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from app.db.models import Loan, Clan, User, LoanGuarantor, Repayment, TrustEvent


def _d(x) -> Decimal:
    return Decimal("0") if x is None else Decimal(str(x))


def _fmt_money(x: Any) -> str:
    try:
        return f"{_d(x):.2f}"
    except Exception:
        return str(x)


def _fmt_dt(x: Any) -> str:
    if not x:
        return "-"
    if isinstance(x, datetime):
        return x.strftime("%Y-%m-%d %H:%M")
    return str(x)


def _safe_meta(te: TrustEvent) -> Dict[str, Any]:
    try:
        m = getattr(te, "meta", None)
        return m if isinstance(m, dict) else {}
    except Exception:
        return {}


def build_loan_trust_report_pdf(
    *,
    loan: Loan,
    clan: Optional[Clan],
    borrower: Optional[User],
    guarantors: List[LoanGuarantor],
    repayments: List[Repayment],
    trust_events: List[TrustEvent],
    user_email_by_id: Dict[int, str],
    clan_exposure_rows: List[Dict[str, Any]],
    borrower_trust_score: Optional[Dict[str, Any]],
    guarantor_trust_scores: Dict[int, Dict[str, Any]],
) -> bytes:
    from io import BytesIO

    bio = BytesIO()
    c = canvas.Canvas(bio, pagesize=A4)
    width, height = A4

    left = 18 * mm
    right = width - 18 * mm
    y = height - 18 * mm

    def ensure_space(min_y: float = 30 * mm) -> None:
        nonlocal y
        if y < min_y:
            c.showPage()
            y = height - 18 * mm

    def h1(text: str) -> None:
        nonlocal y
        c.setFont("Helvetica-Bold", 16)
        c.drawString(left, y, text)
        y -= 10 * mm

    def h2(text: str) -> None:
        nonlocal y
        c.setFont("Helvetica-Bold", 12)
        c.drawString(left, y, text)
        y -= 7 * mm

    def p(label: str, value: str) -> None:
        nonlocal y
        c.setFont("Helvetica", 10)
        c.drawString(left, y, f"{label}: {value}")
        y -= 5 * mm

    def line() -> None:
        nonlocal y
        c.setLineWidth(0.5)
        c.line(left, y, right, y)
        y -= 6 * mm

    # -------------------------
    # Header
    # -------------------------
    h1("GMFN Loan Trust Report")
    c.setFont("Helvetica", 9)
    c.drawRightString(
        right,
        height - 18 * mm,
        f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
    )
    line()

    # -------------------------
    # Summary
    # -------------------------
    h2("Loan Summary")
    borrower_email = user_email_by_id.get(
        int(getattr(loan, "borrower_user_id", 0)),
        getattr(borrower, "email", "—"),
    )
    p("Loan ID", str(getattr(loan, "id", "-")))
    p("Clan", f"{getattr(clan, 'name', None) or '—'} (ID: {getattr(loan, 'clan_id', '-')})")
    p("Borrower", borrower_email)
    p("Status", str(getattr(loan, "status", "—")))
    p("Amount", f"{_fmt_money(getattr(loan, 'amount', 0))} {getattr(loan, 'currency', '')}")
    p("Guarantors Required", str(int(getattr(loan, "guarantors_required", 0) or 0)))
    p("Created At", _fmt_dt(getattr(loan, "created_at", None)))
    p("Decision At", _fmt_dt(getattr(loan, "decision_at", None)))
    p("Repaid At", _fmt_dt(getattr(loan, "repaid_at", None)))
    line()

    # -------------------------
    # Trust Score Summary (NEW)
    # -------------------------
    ensure_space()
    h2("Trust Score Summary (Clan)")
    if borrower_trust_score:
        counts = borrower_trust_score.get("counts", {}) or {}
        p("Borrower Trust Score (0–100)", str(borrower_trust_score.get("score", 0)))
        p("Positive Signals", str(borrower_trust_score.get("positives", 0)))
        p("Negative Signals", str(borrower_trust_score.get("negatives", 0)))
        p("Guarantor Approvals", str(counts.get("guarantor_approved", 0)))
        p("Guarantor Declines", str(counts.get("guarantor_declined", 0)))
        p("Repayments Made", str(counts.get("repayment_made", 0)))
        p("Loan Repaid", str(counts.get("loan_repaid", 0)))
    else:
        p("Borrower Trust Score", "Not available")
    line()

    # -------------------------
    # Guarantor Trust Scores (NEW)
    # -------------------------
    ensure_space()
    h2("Guarantor Trust Scores (Clan)")
    c.setFont("Helvetica-Bold", 9)
    c.drawString(left, y, "Guarantor")
    c.drawRightString(right - 45 * mm, y, "Score")
    c.drawRightString(right, y, "Approvals/Declines")
    y -= 5 * mm
    c.setFont("Helvetica", 9)

    if not guarantors:
        c.drawString(left, y, "No guarantors.")
        y -= 6 * mm
    else:
        for g in guarantors:
            ensure_space()
            uid = int(g.guarantor_user_id)
            email = user_email_by_id.get(uid, f"user:{uid}")
            s = guarantor_trust_scores.get(uid, {}) or {}
            score = s.get("score", 0)
            counts = s.get("counts", {}) or {}
            approvals = counts.get("guarantor_approved", 0)
            declines = counts.get("guarantor_declined", 0)

            c.drawString(left, y, email[:45])
            c.drawRightString(right - 45 * mm, y, str(score))
            c.drawRightString(right, y, f"{approvals}/{declines}")
            y -= 5 * mm

    line()

    # -------------------------
    # Loan Statement
    # -------------------------
    ensure_space()
    h2("Loan Statement")

    loan_amount = _d(getattr(loan, "amount", 0))
    service_fee = _d(getattr(loan, "service_fee", 0))
    net_disbursed = _d(getattr(loan, "net_disbursed_amount", 0))
    guarantor_pool = _d(getattr(loan, "guarantor_pool", 0))
    platform_revenue = _d(getattr(loan, "platform_revenue", 0))
    paid_total = _d(getattr(loan, "paid_total", 0))
    remaining_amount = _d(getattr(loan, "remaining_amount", 0))

    if net_disbursed <= 0 and loan_amount > 0:
        net_disbursed = loan_amount - service_fee
        if net_disbursed < 0:
            net_disbursed = Decimal("0")

    p("Principal", _fmt_money(loan_amount))
    p("Service Fee", _fmt_money(service_fee))
    p("Net Disbursed", _fmt_money(net_disbursed))
    p("Guarantor Pool", _fmt_money(guarantor_pool))
    p("Platform Revenue", _fmt_money(platform_revenue))
    p("Paid Total", _fmt_money(paid_total))
    p("Remaining", _fmt_money(remaining_amount))
    line()

    ensure_space()
    c.setFont("Helvetica-Bold", 9)
    c.drawString(left, y, "Date")
    c.drawString(left + 40 * mm, y, "Payer")
    c.drawRightString(right - 35 * mm, y, "Paid")
    c.drawRightString(right, y, "Balance")
    y -= 5 * mm
    c.setFont("Helvetica", 9)

    running_paid = Decimal("0")
    if not repayments:
        c.drawString(left, y, "No repayments recorded.")
        y -= 6 * mm
    else:
        reps = sorted(repayments, key=lambda r: getattr(r, "created_at", None) or datetime.min)
        for r in reps:
            ensure_space()
            amt = _d(getattr(r, "amount", 0))
            running_paid += amt
            bal = loan_amount - running_paid
            if bal < 0:
                bal = Decimal("0")

            payer_email = user_email_by_id.get(
                int(getattr(r, "payer_user_id", 0)),
                f"user:{getattr(r, 'payer_user_id', 0)}",
            )
            c.drawString(left, y, _fmt_dt(getattr(r, "created_at", None)))
            c.drawString(left + 40 * mm, y, payer_email[:40])
            c.drawRightString(right - 35 * mm, y, _fmt_money(amt))
            c.drawRightString(right, y, _fmt_money(bal))
            y -= 5 * mm

    line()

    # -------------------------
    # Exposure / locks snapshot
    # -------------------------
    ensure_space()
    h2("Guarantor Exposure Snapshot")
    total_locked = sum((_d(getattr(g, "locked_amount", 0)) for g in guarantors), Decimal("0"))
    total_released = sum((_d(getattr(g, "released_amount", 0)) for g in guarantors), Decimal("0"))
    total_pledged = sum((_d(getattr(g, "pledge_amount", 0)) for g in guarantors), Decimal("0"))
    p("Total Pledged", _fmt_money(total_pledged))
    p("Total Locked", _fmt_money(total_locked))
    p("Total Released", _fmt_money(total_released))
    line()

    # -------------------------
    # Clan exposure table (printable)
    # -------------------------
    ensure_space()
    h2("Clan Exposure Table (Pool vs Exposure)")

    c.setFont("Helvetica-Bold", 9)
    c.drawString(left, y, "Member")
    c.drawRightString(right - 60 * mm, y, "Pool")
    c.drawRightString(right - 30 * mm, y, "Exposure")
    c.drawRightString(right, y, "Available")
    y -= 5 * mm
    c.setFont("Helvetica", 9)

    if not clan_exposure_rows:
        c.drawString(left, y, "No exposure rows.")
        y -= 6 * mm
    else:
        for row in clan_exposure_rows:
            ensure_space()
            email = str(row.get("email", "—"))[:45]
            pool_v = row.get("pool_balance", 0)
            exposure_v = row.get("exposure", 0)
            available_v = row.get("available", 0)

            c.drawString(left, y, email)
            c.drawRightString(right - 60 * mm, y, _fmt_money(pool_v))
            c.drawRightString(right - 30 * mm, y, _fmt_money(exposure_v))
            c.drawRightString(right, y, _fmt_money(available_v))
            y -= 5 * mm

    line()

    # -------------------------
    # Trust timeline
    # -------------------------
    ensure_space()
    h2("Trust Timeline")

    c.setFont("Helvetica-Bold", 8)
    c.drawString(left, y, "Time")
    c.drawString(left + 30 * mm, y, "Event")
    c.drawString(left + 75 * mm, y, "Actor")
    c.drawString(left + 120 * mm, y, "Subject")
    y -= 5 * mm

    c.setFont("Helvetica", 8)
    if not trust_events:
        c.drawString(left, y, "No trust events.")
        y -= 6 * mm
    else:
        for te in trust_events:
            ensure_space()

            actor_email = user_email_by_id.get(int(te.actor_user_id), f"user:{te.actor_user_id}")
            subject_email = user_email_by_id.get(int(te.subject_user_id), f"user:{te.subject_user_id}")

            meta = _safe_meta(te)
            note = ""
            et = str(getattr(te, "event_type", "")).upper()

            if et == "GUARANTOR_APPROVED":
                pledge = meta.get("pledge_amount")
                available = meta.get("available_before")
                pool = meta.get("pool_balance")
                exposure = meta.get("exposure_before")

                parts: List[str] = []
                if pledge is not None:
                    parts.append(f"pledge={pledge}")
                if available is not None:
                    parts.append(f"available={available}")
                if pool is not None:
                    parts.append(f"pool={pool}")
                if exposure is not None:
                    parts.append(f"exposure={exposure}")
                if parts:
                    note = " | " + ", ".join(parts)

            c.drawString(left, y, _fmt_dt(getattr(te, "created_at", None))[:16])
            c.drawString(left + 30 * mm, y, str(getattr(te, "event_type", ""))[:22])
            c.drawString(left + 75 * mm, y, actor_email[:25])
            c.drawString(left + 120 * mm, y, subject_email[:25])
            y -= 4.2 * mm

            if note:
                ensure_space()
                c.setFont("Helvetica-Oblique", 7)
                c.drawString(left + 30 * mm, y, note[:110])
                y -= 4.2 * mm
                c.setFont("Helvetica", 8)

    c.showPage()
    c.save()
    return bio.getvalue()
def build_clan_exposure_report_pdf(
    *,
    clan_id: int,
    clan_name: str | None,
    clan_exposure_rows: List[Dict[str, Any]],
) -> bytes:
    from io import BytesIO

    bio = BytesIO()
    c = canvas.Canvas(bio, pagesize=A4)
    width, height = A4

    left = 18 * mm
    right = width - 18 * mm
    y = height - 18 * mm

    def ensure_space(min_y: float = 30 * mm) -> None:
        nonlocal y
        if y < min_y:
            c.showPage()
            y = height - 18 * mm

    def h1(text: str) -> None:
        nonlocal y
        c.setFont("Helvetica-Bold", 16)
        c.drawString(left, y, text)
        y -= 10 * mm

    def h2(text: str) -> None:
        nonlocal y
        c.setFont("Helvetica-Bold", 12)
        c.drawString(left, y, text)
        y -= 7 * mm

    def line() -> None:
        nonlocal y
        c.setLineWidth(0.5)
        c.line(left, y, right, y)
        y -= 6 * mm

    # Header
    h1("GMFN Clan Exposure Report")
    c.setFont("Helvetica", 9)
    c.drawRightString(
        right,
        height - 18 * mm,
        f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
    )
    line()

    h2("Clan")
    c.setFont("Helvetica", 10)
    c.drawString(left, y, f"Clan ID: {clan_id}")
    y -= 5 * mm
    c.drawString(left, y, f"Clan Name: {clan_name or '—'}")
    y -= 7 * mm
    line()

    # Table header
    c.setFont("Helvetica-Bold", 9)
    c.drawString(left, y, "Member")
    c.drawRightString(right - 60 * mm, y, "Pool")
    c.drawRightString(right - 30 * mm, y, "Exposure")
    c.drawRightString(right, y, "Available")
    y -= 5 * mm
    c.setFont("Helvetica", 9)

    if not clan_exposure_rows:
        c.drawString(left, y, "No exposure rows.")
        y -= 6 * mm
    else:
        for row in clan_exposure_rows:
            ensure_space()
            email = str(row.get("email", "—"))[:45]
            pool_v = row.get("pool_balance", 0)
            exposure_v = row.get("exposure", 0)
            available_v = row.get("available", 0)

            c.drawString(left, y, email)
            c.drawRightString(right - 60 * mm, y, _fmt_money(pool_v))
            c.drawRightString(right - 30 * mm, y, _fmt_money(exposure_v))
            c.drawRightString(right, y, _fmt_money(available_v))
            y -= 5 * mm

    line()

    # Footer note
    ensure_space()
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(left, y, "Exposure = sum(locked_amount - released_amount) for approved guarantees in this clan.")
    y -= 5 * mm

    c.showPage()
    c.save()
    return bio.getvalue()
