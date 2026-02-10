from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.deps import get_db
from app.db.models import User

from app.schemas.analytics import (
    InviteAnalyticsOut,
    RecentInviteJoinRowOut,
    TrustEventRowOut,
)
from app.services.invite_analytics_service import (
    get_invite_analytics,
    get_recent_invite_joins,
    get_trust_events_timeline,
    csv_for_recent_invite_joins,
    csv_for_trust_events,
)
from app.services.evidence_pack_pdf_service import build_clan_evidence_pack_pdf
from app.services.loan_evidence_pack_pdf_service import build_loan_evidence_pack_pdf

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/clans/{clan_id}/invites", response_model=InviteAnalyticsOut)
def clan_invite_analytics(
    clan_id: int,
    from_dt: Optional[datetime] = None,
    to_dt: Optional[datetime] = None,
    top_n: int = 10,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return get_invite_analytics(db, clan_id=clan_id, from_dt=from_dt, to_dt=to_dt, top_n=top_n)


@router.get("/clans/{clan_id}/invites/recent-joins", response_model=list[RecentInviteJoinRowOut])
def clan_recent_invite_joins(
    clan_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    limit = max(1, min(int(limit), 500))
    return get_recent_invite_joins(db, clan_id=clan_id, limit=limit)


@router.get("/clans/{clan_id}/trust-events", response_model=list[TrustEventRowOut])
def clan_trust_events(
    clan_id: int,
    limit: int = 100,
    event_type: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    limit = max(1, min(int(limit), 1000))
    return get_trust_events_timeline(db, clan_id=clan_id, limit=limit, event_type=event_type)


@router.get("/clans/{clan_id}/invites/recent-joins.csv")
def export_recent_invite_joins_csv(
    clan_id: int,
    limit: int = 200,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    limit = max(1, min(int(limit), 2000))
    rows = get_recent_invite_joins(db, clan_id=clan_id, limit=limit)
    csv_text = csv_for_recent_invite_joins(rows)
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="clan_{clan_id}_recent_invite_joins.csv"'},
    )


@router.get("/clans/{clan_id}/trust-events.csv")
def export_trust_events_csv(
    clan_id: int,
    limit: int = 500,
    event_type: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    limit = max(1, min(int(limit), 5000))
    rows = get_trust_events_timeline(db, clan_id=clan_id, limit=limit, event_type=event_type)
    csv_text = csv_for_trust_events(rows)
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="clan_{clan_id}_trust_events.csv"'},
    )


@router.get("/clans/{clan_id}/evidence-pack.pdf")
def evidence_pack_pdf(
    clan_id: int,
    redact: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pdf_bytes = build_clan_evidence_pack_pdf(db, clan_id=clan_id, redact=redact)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="GMFN_clan_{clan_id}_evidence_pack.pdf"'},
    )


# ✅ NEW: Per-loan evidence pack PDF
@router.get("/loans/{loan_id}/evidence-pack.pdf")
def loan_evidence_pack_pdf(
    loan_id: int,
    redact: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pdf_bytes = build_loan_evidence_pack_pdf(db, loan_id=loan_id, redact=redact)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="GMFN_loan_{loan_id}_evidence_pack.pdf"'},
    )
