from sqlalchemy.orm import Session
from app.db.models import User, Clan, ClanMembership

DEFAULT_CLAN_NAME = "GMFN Default Clan"
ADMIN_EMAIL = "admin1@example.com"

def ensure_dev_seed(db: Session):
    # ensure clan
    clan = db.query(Clan).filter(Clan.name == DEFAULT_CLAN_NAME).first()
    if not clan:
        clan = Clan(name=DEFAULT_CLAN_NAME)
        db.add(clan)
        db.commit()
        db.refresh(clan)

    # ensure admin exists
    admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if not admin:
        return  # if your dev-create-user flow makes it, that's fine

    # ensure membership
    m = db.query(ClanMembership).filter(
        ClanMembership.user_id == admin.id,
        ClanMembership.clan_id == clan.id,
    ).first()
    if not m:
        m = ClanMembership(user_id=admin.id, clan_id=clan.id, role="admin")
        db.add(m)
        db.commit()
