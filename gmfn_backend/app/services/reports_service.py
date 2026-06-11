from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from app.db.models import Loan, Clan, User, LoanGuarantor, Repayment, TrustEvent
from app.services.institutional_pdf import (
    draw_institutional_footer,
    draw_institutional_header,
    safe_pdf_text,
    utc_generated_label,
)


def _d(x: Any) -> Decimal:
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


def _timeline_note(te: TrustEvent) -> str:
    meta = _safe_meta(te)
    event_type = str(getattr(te, "event_type", "") or "").lower()

    parts: List[str] = []

    if event_type == "guarantee_given":
        if meta.get("pledge_amount") is not None:
            parts.append(f"pledge={meta.get('pledge_amount')}")
        if meta.get("guarantee_gap") is not None:
            parts.append(f"gap={meta.get('guarantee_gap')}")
        if meta.get("reason"):
            parts.append(f"reason={meta.get('reason')}")

    elif event_type == "guarantee_released":
        if meta.get("released_amount") is not None:
            parts.append(f"released={meta.get('released_amount')}")
        if meta.get("release_reason"):
            parts.append(f"release_reason={meta.get('release_reason')}")
        if meta.get("note"):
            parts.append(f"note={meta.get('note')}")

    elif event_type == "loan_repaid":
        if meta.get("amount") is not None:
            parts.append(f"amount={meta.get('amount')}")
        if meta.get("payment_reference"):
            parts.append(f"payment_ref={meta.get('payment_reference')}")
        if meta.get("reason"):
            parts.append(f"reason={meta.get('reason')}")

    elif event_type == "loan_defaulted":
        if meta.get("default_amount") is not None:
            parts.append(f"default_amount={meta.get('default_amount')}")
        if meta.get("days_past_due") is not None:
            parts.append(f"days_past_due={meta.get('days_past_due')}")
        if meta.get("trigger_mode"):
            parts.append(f"trigger={meta.get('trigger_mode')}")
        if meta.get("reason"):
            parts.append(f"reason={meta.get('reason')}")

    elif event_type in {"guarantor.approved", "guarantor_approved"}:
        if meta.get("pledge_amount") is not None:
            parts.append(f"pledge={meta.get('pledge_amount')}")
        if meta.get("locked_amount") is not None:
            parts.append(f"locked={meta.get('locked_amount')}")
        if meta.get("reason"):
            parts.append(f"reason={meta.get('reason')}")

    elif event_type in {"guarantor.declined", "guarantor_declined"}:
        if meta.get("released_amount") is not None:
            parts.append(f"released={meta.get('released_amount')}")
        if meta.get("reason"):
            parts.append(f"reason={meta.get('reason')}")

    elif event_type == "repayment.created":
        if meta.get("amount") is not None:
            parts.append(f"amount={meta.get('amount')}")
        if meta.get("remaining_after") is not None:
            parts.append(f"remaining_after={meta.get('remaining_after')}")

    else:
        for key in ("reason", "note", "amount", "status", "payment_reference"):
            value = meta.get(key)
            if value not in (None, ""):
                parts.append(f"{key}={value}")

    return " | ".join(parts)


def _trust_score_label(score: Optional[Dict[str, Any]]) -> str:
    if not score:
        return "Not available"
    band = score.get("band")
    standing = score.get("standing_score")
    level = score.get("level_label")
    pieces = []
    if standing is not None:
        pieces.append(str(standing))
    if band:
        pieces.append(f"Band {band}")
    if level:
        pieces.append(str(level))
    return " | ".join(pieces) if pieces else "Not available"


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
    generated_at = utc_generated_label()
    y = draw_institutional_header(
        c,
        width,
        height,
        title="GSN Loan Trust Report",
        subtitle="Loan decision, repayment, guarantor, exposure, and trust timeline evidence.",
        generated_at=generated_at,
        reference=f"Loan {getattr(loan, 'id', '-')}",
    )

    def ensure_space(min_y: float = 30 * mm) -> None:
        nonlocal y
        if y < min_y:
            draw_institutional_footer(c, width, "GSN loan trust report - controlled community trust record.")
            c.showPage()
            y = draw_institutional_header(
                c,
                width,
                height,
                title="GSN Loan Trust Report",
                subtitle="Loan decision, repayment, guarantor, exposure, and trust timeline evidence.",
                generated_at=generated_at,
                reference=f"Loan {getattr(loan, 'id', '-')}",
            )

    def h1(text: str) -> None:
        nonlocal y
        c.setFont("Helvetica-Bold", 16)
        c.drawString(left, y, safe_pdf_text(text))
        y -= 10 * mm

    def h2(text: str) -> None:
        nonlocal y
        c.setFont("Helvetica-Bold", 12)
        c.drawString(left, y, safe_pdf_text(text))
        y -= 7 * mm

    def p(label: str, value: str) -> None:
        nonlocal y
        c.setFont("Helvetica", 10)
        c.drawString(left, y, safe_pdf_text(f"{label}: {value}"))
        y -= 5 * mm

    def line() -> None:
        nonlocal y
        c.setLineWidth(0.5)
        c.line(left, y, right, y)
        y -= 6 * mm

    h1("Official evidence summary")
    line()

    h2("Loan Summary")
    borrower_email = user_email_by_id.get(
        int(getattr(loan, "borrower_user_id", 0)),
        getattr(borrower, "email", "—"),
    )

    amount = _d(getattr(loan, "amount", 0))
    pool_used = _d(getattr(loan, "pool_used", 0))
    guarantee_gap = _d(getattr(loan, "guarantee_gap", 0))
    guarantors_required = int(getattr(loan, "guarantors_required", 0) or 0)

    p("Loan ID", str(getattr(loan, "id", "-")))
    p("Clan", f"{getattr(clan, 'name', None) or '—'} (ID: {getattr(loan, 'clan_id', '-')})")
    p("Borrower", borrower_email)
    p("Status", str(getattr(loan, "status", "—")))
    p("Amount", f"{_fmt_money(amount)} {getattr(loan, 'currency', '')}")
    p("Pool Used", _fmt_money(pool_used))
    p("Guarantee Gap", _fmt_money(guarantee_gap))
    p("Guarantors Required", str(guarantors_required))
    p("Created At", _fmt_dt(getattr(loan, "created_at", None)))
    p("Decision At", _fmt_dt(getattr(loan, "decision_at", None)))
    p("Repaid At", _fmt_dt(getattr(loan, "repaid_at", None)))
    line()

    ensure_space()
    h2("Explainability Snapshot")

    approved_guarantors = len([g for g in guarantors if str(getattr(g, "status", "")).lower() == "approved"])
    total_locked = sum((_d(getattr(g, "locked_amount", 0)) for g in guarantors), Decimal("0"))
    capacity_ratio = Decimal("0.00")
    if guarantee_gap > Decimal("0"):
        try:
            capacity_ratio = total_locked / guarantee_gap
        except Exception:
            capacity_ratio = Decimal("0.00")

    recommendation = "proceed"
    if total_locked <= Decimal("0"):
        recommendation = "block"
    elif guarantee_gap > Decimal("0") and total_locked < guarantee_gap:
        recommendation = "reduce_amount"

    p("Approved Guarantors", str(approved_guarantors))
    p("Approved Locked Coverage", _fmt_money(total_locked))
    p("Coverage Ratio", f"{capacity_ratio:.2f}")
    p("Evidence Recommendation", recommendation)
    line()

    ensure_space()
    h2("Trust Score Summary")
    if borrower_trust_score:
        counts = borrower_trust_score.get("counts", {}) or {}
        gains = borrower_trust_score.get("gains", {}) or {}
        penalties = borrower_trust_score.get("penalties", {}) or {}

        p("Borrower Trust Snapshot", _trust_score_label(borrower_trust_score))
        p("Lifetime Trust", str(borrower_trust_score.get("lifetime_trust", "0")))
        p("Standing Score", str(borrower_trust_score.get("standing_score", "0")))
        p("Recency Factor", str(borrower_trust_score.get("recency_factor", "0")))
        p("Full Repayments", str(counts.get("full_repayments", 0)))
        p("Guarantor Success", str(counts.get("guarantor_success", 0)))
        p("Missed Payments", str(counts.get("missed_payments", 0)))
        p("Defaults", str(counts.get("defaults", 0)))
        p("Fraud Flags", str(counts.get("fraud_flags", 0)))
        p("Total Gains", str(gains.get("total", "0")))
        p("Total Penalties", str(penalties.get("total", "0")))
    else:
        p("Borrower Trust Snapshot", "Not available")
    line()

    ensure_space()
    h2("Guarantor Trust Scores")
    c.setFont("Helvetica-Bold", 9)
    c.drawString(left, y, "Guarantor")
    c.drawRightString(right - 55 * mm, y, "Band")
    c.drawRightString(right, y, "Standing Score")
    y -= 5 * mm
    c.setFont("Helvetica", 9)

    if not guarantors:
        c.drawString(left, y, "No guarantors.")
        y -= 6 * mm
    else:
        for g in guarantors:
            ensure_space()
            uid = int(getattr(g, "guarantor_user_id", 0) or 0)
            email = user_email_by_id.get(uid, f"user:{uid}")
            s = guarantor_trust_scores.get(uid, {}) or {}
            band = s.get("band", "-")
            standing = s.get("standing_score", "0")

            c.drawString(left, y, email[:45])
            c.drawRightString(right - 55 * mm, y, str(band))
            c.drawRightString(right, y, str(standing))
            y -= 5 * mm

    line()

    ensure_space()
    h2("Loan Statement")

    service_fee = _d(getattr(loan, "service_fee", 0))
    net_disbursed = _d(getattr(loan, "net_disbursed_amount", 0))
    guarantor_pool = _d(getattr(loan, "guarantor_pool", 0))
    platform_revenue = _d(getattr(loan, "platform_revenue", 0))
    paid_total = _d(getattr(loan, "paid_total", 0))
    remaining_amount = _d(getattr(loan, "remaining_amount", 0))

    if net_disbursed <= 0 and amount > 0:
        net_disbursed = amount - service_fee
        if net_disbursed < 0:
            net_disbursed = Decimal("0")

    p("Principal", _fmt_money(amount))
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
            bal = amount - running_paid
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

    ensure_space()
    h2("Guarantor Exposure Snapshot")
    total_released = sum((_d(getattr(g, "released_amount", 0)) for g in guarantors), Decimal("0"))
    total_pledged = sum((_d(getattr(g, "pledge_amount", 0)) for g in guarantors), Decimal("0"))
    p("Total Pledged", _fmt_money(total_pledged))
    p("Total Locked", _fmt_money(total_locked))
    p("Total Released", _fmt_money(total_released))
    line()

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

            actor_email = user_email_by_id.get(int(getattr(te, "actor_user_id", 0)), f"user:{getattr(te, 'actor_user_id', 0)}")
            subject_email = user_email_by_id.get(int(getattr(te, "subject_user_id", 0)), f"user:{getattr(te, 'subject_user_id', 0)}")
            note = _timeline_note(te)

            c.drawString(left, y, _fmt_dt(getattr(te, "created_at", None))[:16])
            c.drawString(left + 30 * mm, y, str(getattr(te, "event_type", ""))[:22])
            c.drawString(left + 75 * mm, y, actor_email[:25])
            c.drawString(left + 120 * mm, y, subject_email[:25])
            y -= 4.2 * mm

            if note:
                ensure_space()
                c.setFont("Helvetica-Oblique", 7)
                c.drawString(left + 30 * mm, y, note[:120])
                y -= 4.2 * mm
                c.setFont("Helvetica", 8)

    draw_institutional_footer(c, width, "GSN loan trust report - controlled community trust record.")
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
    generated_at = utc_generated_label()
    y = draw_institutional_header(
        c,
        width,
        height,
        title="GSN Clan Exposure Report",
        subtitle="Community pool, exposure, and available support capacity evidence.",
        generated_at=generated_at,
        reference=f"Clan {clan_id}",
    )

    def ensure_space(min_y: float = 30 * mm) -> None:
        nonlocal y
        if y < min_y:
            draw_institutional_footer(c, width, "GSN clan exposure report - controlled community trust record.")
            c.showPage()
            y = draw_institutional_header(
                c,
                width,
                height,
                title="GSN Clan Exposure Report",
                subtitle="Community pool, exposure, and available support capacity evidence.",
                generated_at=generated_at,
                reference=f"Clan {clan_id}",
            )

    def h1(text: str) -> None:
        nonlocal y
        c.setFont("Helvetica-Bold", 16)
        c.drawString(left, y, safe_pdf_text(text))
        y -= 10 * mm

    def h2(text: str) -> None:
        nonlocal y
        c.setFont("Helvetica-Bold", 12)
        c.drawString(left, y, safe_pdf_text(text))
        y -= 7 * mm

    def line() -> None:
        nonlocal y
        c.setLineWidth(0.5)
        c.line(left, y, right, y)
        y -= 6 * mm

    h1("Official exposure summary")
    line()

    h2("Clan")
    c.setFont("Helvetica", 10)
    c.drawString(left, y, f"Clan ID: {clan_id}")
    y -= 5 * mm
    c.drawString(left, y, f"Clan Name: {clan_name or '—'}")
    y -= 7 * mm
    line()

    c.setFont("Helvetica-Bold", 9)
    c.drawString(left, y, "Member")
    c.drawRightString(right - 60 * mm, y, "Pool")
    c.drawRightString(right - 30 * mm, y, "Exposure")
    c.drawRightString(right, y, "Available")
    y -= 5 * mm
    c.setFont("Helvetica", 9)

    total_pool = Decimal("0")
    total_exposure = Decimal("0")
    total_available = Decimal("0")

    if not clan_exposure_rows:
        c.drawString(left, y, "No exposure rows.")
        y -= 6 * mm
    else:
        for row in clan_exposure_rows:
            ensure_space()
            email = str(row.get("email", "—"))[:45]
            pool_v = _d(row.get("pool_balance", 0))
            exposure_v = _d(row.get("exposure", 0))
            available_v = _d(row.get("available", 0))

            total_pool += pool_v
            total_exposure += exposure_v
            total_available += available_v

            c.drawString(left, y, email)
            c.drawRightString(right - 60 * mm, y, _fmt_money(pool_v))
            c.drawRightString(right - 30 * mm, y, _fmt_money(exposure_v))
            c.drawRightString(right, y, _fmt_money(available_v))
            y -= 5 * mm

    line()

    ensure_space()
    h2("Clan Exposure Summary")
    c.setFont("Helvetica", 10)
    c.drawString(left, y, f"Total Pool: {_fmt_money(total_pool)}")
    y -= 5 * mm
    c.drawString(left, y, f"Total Exposure: {_fmt_money(total_exposure)}")
    y -= 5 * mm
    c.drawString(left, y, f"Total Available Capacity: {_fmt_money(total_available)}")
    y -= 7 * mm

    exposure_ratio = Decimal("0.00")
    if total_pool > Decimal("0"):
        try:
            exposure_ratio = total_exposure / total_pool
        except Exception:
            exposure_ratio = Decimal("0.00")

    c.drawString(left, y, f"Clan Exposure Ratio: {exposure_ratio:.2f}")
    y -= 7 * mm
    line()

    ensure_space()
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(left, y, "Exposure = approved/locked guarantor pressure visible across the clan evidence surface.")
    y -= 5 * mm
    c.drawString(left, y, "Available = current remaining support capacity after existing exposure.")
    y -= 5 * mm

    draw_institutional_footer(c, width, "GSN clan exposure report - controlled community trust record.")
    c.showPage()
    c.save()
    return bio.getvalue()
