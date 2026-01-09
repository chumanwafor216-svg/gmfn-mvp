from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.db.models import ClanMembership


def require_clan_member(db: Session, clan_id: int, user_id: int) -> None:
    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan_id,
            ClanMembership.user_id == user_id,
        )
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=400,
            detail="Guarantor must be a clan member",
        )
