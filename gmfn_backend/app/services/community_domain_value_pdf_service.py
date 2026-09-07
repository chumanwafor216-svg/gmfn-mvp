from __future__ import annotations

from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from app.services.institutional_pdf import (
    GSN_BLUE,
    GSN_BORDER,
    GSN_GOLD,
    GSN_MUTED,
    GSN_NAVY,
    draw_institutional_footer,
    draw_institutional_header,
    safe_pdf_text,
    utc_generated_label,
    wrap_pdf_text_lines,
)


def _record(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []




def _period_label(payload: dict[str, Any]) -> str:
    period = _record(payload.get("period"))
    label = period.get("label") or period.get("period_label")
    if label:
        return safe_pdf_text(label)
    start = safe_pdf_text(period.get("start"), fallback="")
    end = safe_pdf_text(period.get("end"), fallback="")
    if start and end:
        return f"{start} to {end}"
    return "Current selected period"




def build_community_domain_value_report_pdf(
    *,
    community_domain_id: int,
    domain_name: str,
    audience: str,
    period_summary: dict[str, Any] | None = None,
    sponsor_summary: dict[str, Any] | None = None,
    church_memory_summary: dict[str, Any] | None = None,
) -> bytes:
    """Build a controlled Community Domain value PDF from existing summaries."""

    is_sponsor = audience == "sponsor_safe"
    is_church_memory = audience == "church_memory"
    if is_church_memory:
        payload = _record(church_memory_summary)
    else:
        payload = _record(sponsor_summary if is_sponsor else period_summary)
    period_label = _period_label(payload)
    generated_at = utc_generated_label()
    reference = f"GSN-CD-{int(community_domain_id)}-VALUE"

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    left = 22 * mm
    right = width - 22 * mm
    bottom = 24 * mm
    line_width = right - left

    title = "GSN Church Summary Report" if is_church_memory else "GSN Community Value Report"
    subtitle = (
        "Sermon/message and programme summary for church leadership review."
        if is_church_memory
        else (
            "Sponsor-safe aggregate evidence from recorded Community Domain facts."
            if is_sponsor
            else "Internal governance summary from recorded Community Domain facts."
        )
    )
    footer = (
        "GSN Church Summary Report - generated from recorded notices and church workflow records only. "
        "It does not judge doctrine, prove payment, or replace church leadership."
        if is_church_memory
        else (
            "GSN Community Value Report - generated from recorded Community Domain facts only. "
            "It does not certify unrecorded activity or replace association judgement."
        )
    )

    y = draw_institutional_header(
        pdf,
        width,
        height,
        title=title,
        subtitle=subtitle,
        generated_at=generated_at,
        reference=reference,
        classification="Controlled GSN report",
    )

    def new_page() -> None:
        nonlocal y
        draw_institutional_footer(pdf, width, footer)
        pdf.showPage()
        y = draw_institutional_header(
            pdf,
            width,
            height,
            title=title,
            subtitle=subtitle,
            generated_at=generated_at,
            reference=reference,
            classification="Controlled GSN report",
        )

    def ensure(space: float) -> None:
        if y - space < bottom:
            new_page()

    def heading(text: str) -> None:
        nonlocal y
        ensure(16 * mm)
        pdf.setFillColor(GSN_NAVY)
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(left, y, safe_pdf_text(text))
        y -= 6 * mm
        pdf.setStrokeColor(GSN_GOLD)
        pdf.setLineWidth(0.8)
        pdf.line(left, y + 2.2 * mm, right, y + 2.2 * mm)

    def paragraph(text: Any, *, font_name: str = "Helvetica", font_size: float = 9) -> None:
        nonlocal y
        lines = wrap_pdf_text_lines(text, font_name, font_size, line_width, fallback="")
        for line in lines:
            ensure(5 * mm)
            pdf.setFillColor(GSN_MUTED if font_name == "Helvetica" else GSN_NAVY)
            pdf.setFont(font_name, font_size)
            pdf.drawString(left, y, safe_pdf_text(line))
            y -= 4.4 * mm
        y -= 1.5 * mm

    def bullet(text: Any) -> None:
        nonlocal y
        lines = wrap_pdf_text_lines(text, "Helvetica", 8.7, line_width - 5 * mm, fallback="")
        for index, line in enumerate(lines):
            ensure(5 * mm)
            pdf.setFillColor(GSN_NAVY)
            pdf.setFont("Helvetica", 8.7)
            prefix = "- " if index == 0 else "  "
            pdf.drawString(left + 3 * mm, y, f"{prefix}{safe_pdf_text(line)}")
            y -= 4.1 * mm

    def metric_box(rows: list[tuple[str, Any]]) -> None:
        nonlocal y
        filtered = [(label, value) for label, value in rows if label]
        if not filtered:
            return
        cols = 2
        col_gap = 5 * mm
        col_width = (line_width - col_gap) / cols
        row_height = 13 * mm
        for row_index in range(0, len(filtered), cols):
            ensure(row_height + 3 * mm)
            row = filtered[row_index : row_index + cols]
            for col_index, (label, value) in enumerate(row):
                x = left + col_index * (col_width + col_gap)
                pdf.setStrokeColor(GSN_BORDER)
                pdf.setFillColor(colors.white)
                pdf.roundRect(x, y - row_height + 3 * mm, col_width, row_height, 2 * mm, stroke=1, fill=1)
                pdf.setFillColor(GSN_MUTED)
                pdf.setFont("Helvetica-Bold", 7.2)
                pdf.drawString(x + 3 * mm, y - 2 * mm, safe_pdf_text(label)[:38])
                pdf.setFillColor(GSN_BLUE)
                pdf.setFont("Helvetica-Bold", 11)
                pdf.drawString(x + 3 * mm, y - 8 * mm, safe_pdf_text(value, fallback="0")[:32])
            y -= row_height + 2 * mm

    heading("Report Identity")
    metric_box(
        [
            ("Community Domain", domain_name),
            ("Audience", "Church summary" if is_church_memory else ("Sponsor-safe" if is_sponsor else "Director/admin")),
            ("Period", period_label),
            ("Report status", payload.get("report_status") or payload.get("sponsor_readiness") or "prepared"),
        ]
    )

    heading("Truth Boundary")
    truth_lines = (
        (
            "This PDF is generated only from official notices, church workflow records, and live QR attendance check-ins already captured inside GSN.",
            "It can support leadership review of message and programme patterns, but it does not judge doctrine or replace pastoral authority.",
            "It does not expose private pastoral notes, member lists, bank details, payment proof, safeguarding details, or unrecorded activity.",
        )
        if is_church_memory
        else (
            "This PDF is generated only from records already captured inside GSN.",
            "It does not prove unrecorded activity, certify impact, send external messages, or replace the judgement of the association leadership.",
            "Sponsor-safe mode omits beneficiary names, user IDs, private notes, baseline text, after-value text, evidence references, and source record IDs.",
        )
    )
    for line in truth_lines:
        bullet(line)
    y -= 2 * mm

    if is_church_memory:
        messages = _record(payload.get("message_summary"))
        programmes = _record(payload.get("programme_summary"))
        responses = _record(payload.get("response_summary"))
        recent_messages = [
            _record(item)
            for item in _list(messages.get("recent_messages"))
            if _record(item).get("body")
        ]
        recent_programmes = [
            _record(item)
            for item in _list(programmes.get("recent_programme_records"))
        ]
        recent_live_attendance = [
            _record(item)
            for item in _list(programmes.get("recent_live_attendance_sessions"))
        ]
        recent_response_channels = [
            _record(item)
            for item in _list(responses.get("recent_response_channels"))
        ]
        recent_responses = [
            _record(item)
            for item in _list(responses.get("recent_responses"))
        ]
        prompts = [safe_pdf_text(item, fallback="") for item in _list(payload.get("review_prompts")) if safe_pdf_text(item, fallback="")]

        heading("Sermon And Programme Summary")
        metric_box(
            [
                ("Official messages", messages.get("total", 0)),
                ("Public QR messages", messages.get("public_qr_total", 0)),
                ("Church workflow records", programmes.get("total", 0)),
                ("Programme attendance", programmes.get("programme_attendance_total", 0)),
                ("Live QR windows", programmes.get("live_attendance_session_total", 0)),
                ("Live QR check-ins", programmes.get("live_attendance_checkin_total", 0)),
                ("Response QR windows", responses.get("response_channel_total", 0)),
                ("Responses received", responses.get("response_total", 0)),
                ("Questions raised", responses.get("question_total", 0)),
                ("Needs / requests", responses.get("need_request_total", 0)),
                ("Private follow-up", responses.get("private_follow_up_total", 0)),
                ("Pastoral follow-up", programmes.get("pastoral_follow_up_total", 0)),
                ("Department service", programmes.get("department_service_total", 0)),
                ("Contribution memory", programmes.get("contribution_memory_total", 0)),
            ]
        )
        if recent_messages:
            heading("Recent Recorded Messages")
            for item in recent_messages[:12]:
                marker = "QR" if item.get("public_qr_enabled") else "member"
                bullet(f"{safe_pdf_text(item.get('posted_at'), fallback='Recorded')}: [{marker}] {safe_pdf_text(item.get('body'), fallback='Recorded message')}")
            y -= 2 * mm
        if recent_programmes:
            heading("Recent Programme Records")
            for item in recent_programmes[:12]:
                label = safe_pdf_text(item.get("activity_label"), fallback=safe_pdf_text(item.get("activity_type"), fallback="Activity"))
                quantity = safe_pdf_text(item.get("quantity"), fallback="")
                unit = safe_pdf_text(item.get("measurement_unit"), fallback="")
                suffix = f" - {quantity} {unit}".rstrip() if quantity or unit else ""
                bullet(f"{safe_pdf_text(item.get('occurred_at'), fallback='Recorded')}: {label}{suffix}")
            y -= 2 * mm
        if recent_live_attendance:
            heading("Recent Live Attendance QR Windows")
            for item in recent_live_attendance[:12]:
                label = safe_pdf_text(item.get("programme_label"), fallback="Live attendance")
                count = safe_pdf_text(item.get("checkin_count"), fallback="0")
                method = safe_pdf_text(item.get("method"), fallback="qr")
                bullet(f"{safe_pdf_text(item.get('opened_at'), fallback='Opened')}: {label} - {count} check-in(s) by {method}")
            y -= 2 * mm
        if recent_response_channels:
            heading("Recent Response QR Windows")
            for item in recent_response_channels[:8]:
                label = safe_pdf_text(item.get("title"), fallback="Response Box")
                count = safe_pdf_text(item.get("response_count"), fallback="0")
                bullet(f"{safe_pdf_text(item.get('opened_at'), fallback='Opened')}: {label} - {count} response(s)")
            y -= 2 * mm
        if recent_responses:
            heading("Recent Questions And Follow-Up Signals")
            for item in recent_responses[:10]:
                label = safe_pdf_text(item.get("response_type_label"), fallback="Response")
                preview = safe_pdf_text(item.get("body_preview"), fallback="Recorded response")
                bullet(f"{safe_pdf_text(item.get('responded_at'), fallback='Recorded')}: {label} - {preview}")
            y -= 2 * mm
        if prompts:
            heading("Leadership Review Prompts")
            for prompt in prompts[:6]:
                bullet(prompt)
            y -= 2 * mm
    elif is_sponsor:
        activity = _record(payload.get("activity_summary"))
        outcomes = _record(payload.get("beneficiary_outcome_summary"))
        evidence = _record(payload.get("evidence_summary"))
        export_pack = _record(payload.get("sponsor_export_pack"))
        facts = [safe_pdf_text(item, fallback="") for item in _list(export_pack.get("facts")) if safe_pdf_text(item, fallback="")]

        heading("Sponsor-Safe Aggregate Value")
        metric_box(
            [
                ("Activity records", activity.get("total", 0)),
                ("People reached", outcomes.get("subject_count", 0)),
                ("Outcome records", outcomes.get("total", 0)),
                ("Confirmation responses", outcomes.get("confirmation_responses_total", 0)),
                ("Delivery packs", outcomes.get("confirmation_delivery_prepared_total", 0)),
                ("Manual receipts", outcomes.get("confirmation_delivery_receipts_total", 0)),
            ]
        )
        if facts:
            heading("Copy-Ready Facts")
            for fact in facts[:10]:
                bullet(fact)
            y -= 2 * mm
        heading("Evidence Quality")
        metric_box(
            [
                ("Beneficiary confirmed", evidence.get("beneficiary_confirmed_outcomes", 0)),
                ("Admin recorded", evidence.get("admin_recorded_or_unconfirmed_outcomes", 0)),
                ("Challenged/under review", evidence.get("challenged_or_under_review_outcomes", 0)),
                ("Provider blocked checks", evidence.get("confirmation_provider_send_blocked_checks", 0)),
            ]
        )
    else:
        membership = _record(payload.get("membership_snapshot"))
        movement = _record(payload.get("member_movement"))
        governance = _record(payload.get("governance_summary"))
        evidence = _record(payload.get("evidence_summary"))
        confirmations = _record(payload.get("confirmation_summary"))
        trust = _record(payload.get("trust_event_summary"))
        activity = _record(payload.get("activity_summary"))
        outcomes = _record(payload.get("beneficiary_outcome_summary"))

        heading("Director/Admin Governance Value")
        metric_box(
            [
                ("Active members", membership.get("active_member_count", 0)),
                ("Members added", movement.get("added_count", 0)),
                ("Members removed", movement.get("removed_count", 0)),
                ("Governance actions", governance.get("total", 0)),
                ("Evidence records", evidence.get("total", 0)),
                ("Trust events", trust.get("total", 0)),
            ]
        )
        heading("Recorded Service And Confirmation")
        metric_box(
            [
                ("Activity records", activity.get("total", 0)),
                ("Outcome records", outcomes.get("total", 0)),
                ("Confirmation requests", confirmations.get("requests_total", 0)),
                ("Confirmation responses", confirmations.get("responses_total", 0)),
                ("Positive confirmations", confirmations.get("positive_responses_total", 0)),
                ("Attendance/meeting signals", evidence.get("attendance_signal_count", 0) or evidence.get("meeting_signal_count", 0)),
            ]
        )

    heading("Four Value Lines This Can Support")
    for line in (
        "Administrative pain: meeting notices, minutes evidence, attendance signals, decisions, owners, and follow-up actions can be gathered into a governance record.",
        "Verification pain: membership status, references, beneficiary confirmations, corrections, and admin reviews can be separated instead of being buried in chat messages.",
        "Economic opportunity pain: activity records, outcomes, shops, Spotlight, requests, referrals, grants, jobs, contracts, and internal demand can be summarized when recorded.",
        "Cultural continuity and community memory: recorded service, events, leadership handover notes, and selected evidence can survive beyond one officer's phone.",
    ):
        bullet(line)
    y -= 2 * mm

    heading("What This Does Not Count")
    for line in (
        "WhatsApp messages, paper notes, pictures, videos, or verbal activity that were never recorded in GSN.",
        "Private media archives or large video storage; GSN can reference and store limited evidence, but this report is an aggregate record, not a media vault.",
        "Bank reconciliation, provider-sent messages, or external council/sponsor delivery unless those integrations are separately configured and recorded.",
    ):
        bullet(line)

    draw_institutional_footer(pdf, width, footer)
    pdf.save()
    return buffer.getvalue()
