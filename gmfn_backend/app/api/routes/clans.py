# app/api/routes/clans.py
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.clan_auth import (
    ensure_membership,
    get_current_clan_membership,
    get_or_create_default_clan,  # kept (used elsewhere), but NOT used by dev bootstrap anymore
)
from app.core.dev_guard import require_dev_mode  # ✅ DEV MODE GUARD
from app.db.database import get_db
from app.db.models import Clan, ClanMembership, User
from app.services.invites_service import (
    api_join_link,
    create_clan_invite,
    frontend_join_link,
    join_clan_by_invite_code,
)

router = APIRouter(prefix="/clans", tags=["clans"])


@router.post(
    "/dev/bootstrap",
    response_model=dict[str, Any],
    dependencies=[Depends(require_dev_mode)],
)
def dev_bootstrap_clan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    DEV bootstrap MUST be deterministic for testing:
    - Always creates a NEW clan (avoid polluted clan_id reuse)
    - Ensures current user is clan admin
    """
    now = datetime.now(timezone.utc)
    suffix = secrets.token_hex(3)
    name = f"Dev Clan {now.strftime('%Y%m%d-%H%M%S')}-{suffix}"

    clan = Clan(
        name=name,
        description="DEV bootstrap clan (fresh)",
        invite_code=secrets.token_urlsafe(16),
        invite_created_at=now,
        invite_expires_at=now + timedelta(days=7),
        invite_max_uses=None,
        invite_uses=0,
    )
    db.add(clan)
    db.commit()
    db.refresh(clan)

    membership = ensure_membership(db=db, clan=clan, user=current_user, role="admin")

    return {
        "ok": True,
        "clan_id": int(clan.id),
        "membership_id": int(membership.id),
        "membership_role": membership.role,
        "user_id": int(current_user.id),
        "email": current_user.email,
        "clan_name": clan.name,
    }


class ClanCreateIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    description: Optional[str] = Field(default=None, max_length=500)


class ClanOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MyClansOut(BaseModel):
    items: List[ClanOut]
    total: int


class AddMemberIn(BaseModel):
    user_id: int
    role: str = Field(default="user")  # "user" | "admin"


class SetMemberPoolIn(BaseModel):
    """
    Backward compatible:
    - accepts {"balance": "..."} (old)
    - accepts {"amount": "..."}  (frontend/scripts)
    """
    model_config = ConfigDict(populate_by_name=True)

    user_id: int
    balance: Decimal = Field(
        default=Decimal("0"),
        validation_alias=AliasChoices("balance", "amount"),
    )


class JoinByInviteIn(BaseModel):
    invite_code: str


class PatchMemberPoolIn(BaseModel):
    """
    Backward compatible:
    - accepts {"pool_balance": "..."} (old)
    - accepts {"amount": "..."}       (frontend/scripts)
    - accepts {"balance": "..."}      (alt)
    """
    model_config = ConfigDict(populate_by_name=True)

    pool_balance: Decimal = Field(
        default=Decimal("0"),
        validation_alias=AliasChoices("pool_balance", "amount", "balance"),
    )


def _require_clan_admin(clan_ctx: tuple) -> tuple:
    clan, membership, current_user = clan_ctx
    if (membership.role or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Clan admin only")
    return clan, membership, current_user


def _member_row(db: Session, m: ClanMembership) -> dict[str, Any]:
    u = db.get(User, m.user_id)
    return {
        "id": m.id,
        "clan_id": m.clan_id,
        "user_id": m.user_id,
        "email": (u.email if u else None),
        "role": m.role,
        "personal_pool_balance": str(m.personal_pool_balance or Decimal("0")),
        "created_at": m.created_at,
    }


def _is_last_admin(db: Session, *, clan_id: int) -> bool:
    admins_count = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == clan_id, ClanMembership.role == "admin")
        .count()
    )
    return admins_count <= 1


def _normalize_invite_days(days: Optional[int]) -> int:
    if days is None:
        return 7
    if days < 1:
        return 1
    if days > 30:
        return 30
    return days


def _normalize_invite_max_uses(max_uses: Optional[int]) -> Optional[int]:
    if max_uses is None:
        return None
    if max_uses < 1:
        return 1
    if max_uses > 100:
        return 100
    return max_uses


def _ensure_invite_expiry(db: Session, clan: Clan, *, days: Optional[int] = None) -> Clan:
    now = datetime.now(timezone.utc)
    days = _normalize_invite_days(days)
    changed = False

    if not getattr(clan, "invite_code", None):
        clan.invite_code = secrets.token_urlsafe(16)
        changed = True

    if getattr(clan, "invite_created_at", None) is None:
        clan.invite_created_at = now
        changed = True

    if getattr(clan, "invite_expires_at", None) is None:
        clan.invite_expires_at = now + timedelta(days=days)
        changed = True

    if getattr(clan, "invite_uses", None) is None:
        clan.invite_uses = 0
        changed = True

    if changed:
        db.commit()
        db.refresh(clan)

    return clan


def _utc_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _is_invite_expired(clan: Clan) -> bool:
    expires_at = _utc_aware(getattr(clan, "invite_expires_at", None))
    if expires_at is None:
        return False
    return expires_at < datetime.now(timezone.utc)


@router.get("/current", response_model=dict[str, Any])
def get_current_clan(
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, _current_user = clan_ctx
    return {
        "ok": True,
        "clan": {
            "id": clan.id,
            "name": clan.name,
            "description": getattr(clan, "description", None),
        },
        "membership": {
            "id": membership.id,
            "role": membership.role,
            "personal_pool_balance": str(membership.personal_pool_balance or Decimal("0")),
        },
        "how_to_set_header": {"X-Clan-Id": clan.id},
    }


@router.post("/{clan_id}/select", response_model=dict[str, Any])
def select_clan(
    clan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan = db.get(Clan, clan_id)
    if not clan:
        raise HTTPException(status_code=404, detail="Clan not found")

    # ✅ critical fix: do NOT promote everyone to admin
    role = "admin" if (current_user.role or "").lower() == "admin" else "user"
    membership = ensure_membership(db=db, clan=clan, user=current_user, role=role)

    return {
        "ok": True,
        "selected_clan_id": clan.id,
        "membership_id": membership.id,
        "membership_role": membership.role,
        "use_this_header": {"X-Clan-Id": clan.id},
    }


@router.post("/{clan_id}/invite", response_model=dict[str, Any])
def create_invite(
    clan_id: int,
    request: Request,
    days: Optional[int] = None,
    max_uses: Optional[int] = None,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, current_user = _require_clan_admin(clan_ctx)
    if int(clan.id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    days_n = _normalize_invite_days(days)
    max_uses_n = _normalize_invite_max_uses(max_uses)

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=days_n)

    inv = create_clan_invite(
        db,
        clan_id=int(clan_id),
        created_by_user=current_user,
        expires_at=expires_at,
        max_uses=max_uses_n,
    )

    return {
        "clan_id": int(clan_id),
        "code": inv.code,
        "created_at": inv.created_at,
        "expires_at": inv.expires_at,
        "is_active": bool(inv.is_active),
        "uses": int(inv.uses or 0),
        "max_uses": inv.max_uses,
        "share_link": frontend_join_link(inv.code),
        "api_link": api_join_link(request, inv.code),
        "invite_text": f"Join my GMFN clan '{clan.name}' using invite code: {inv.code}",
    }


@router.get("/{clan_id}/invite-link", response_model=dict[str, Any])
def get_invite_link(
    clan_id: int,
    request: Request,
    days: Optional[int] = None,
    max_uses: Optional[int] = None,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = _require_clan_admin(clan_ctx)
    if int(clan.id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    clan = _ensure_invite_expiry(db, clan, days=days)

    max_uses_norm = _normalize_invite_max_uses(max_uses)
    if max_uses is not None:
        clan.invite_max_uses = max_uses_norm
        if clan.invite_uses is None:
            clan.invite_uses = 0
        db.commit()
        db.refresh(clan)

    base = str(request.base_url).rstrip("/")
    link = f"{base}/join?code={clan.invite_code}"

    return {
        "clan_id": int(clan.id),
        "invite_code": clan.invite_code,
        "invite_created_at": clan.invite_created_at,
        "invite_expires_at": clan.invite_expires_at,
        "invite_max_uses": clan.invite_max_uses,
        "invite_uses": int(getattr(clan, "invite_uses", 0) or 0),
        "invite_link": link,
        "invite_text": f"Join my GMFN clan '{clan.name}': {link}",
    }


@router.get("/join", response_class=HTMLResponse)
def join_landing_page(
    code: str,
    db: Session = Depends(get_db),
):
    safe_code = (code or "").strip()
    json_body = f'{{ "invite_code": "{safe_code}" }}'

    clan = db.query(Clan).filter(Clan.invite_code == safe_code).first()

    clan_name = "—"
    expires_text = "—"
    usage_text = "—"
    remaining_text = "—"
    status_text = ""
    status_color = "#666"

    now = datetime.now(timezone.utc)

    if not clan:
        status_text = "Invalid invite code ❌"
        status_color = "#b00"
    else:
        clan_name = getattr(clan, "name", "—")

        expires_at = _utc_aware(getattr(clan, "invite_expires_at", None))
        if expires_at is None:
            expires_text = "No expiry"
        else:
            expires_text = expires_at.strftime("%Y-%m-%d %H:%M UTC")

        uses = int(getattr(clan, "invite_uses", 0) or 0)
        max_uses = getattr(clan, "invite_max_uses", None)

        if max_uses is None:
            usage_text = f"{uses} / unlimited"
            remaining_text = "Unlimited"
        else:
            max_u = int(max_uses)
            remaining = max(0, max_u - uses)
            usage_text = f"{uses} / {max_u}"
            remaining_text = str(remaining)

        expired = False
        if expires_at is not None and expires_at < now:
            expired = True

        used_up = False
        if max_uses is not None and uses >= int(max_uses):
            used_up = True

        if expired:
            status_text = "Invite expired ❌"
            status_color = "#b00"
        elif used_up:
            status_text = "Invite used up (limit reached) ❌"
            status_color = "#b00"
        else:
            status_text = "Invite valid ✅"
            status_color = "#0a7"

    return f"""
<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>Join GMFN Clan</title>
    <style>
      body {{ font-family: Arial, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 16px; }}
      code {{ background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }}
      .box {{ border: 1px solid #ddd; border-radius: 10px; padding: 16px; }}
      .row {{ display:flex; gap:10px; flex-wrap:wrap; }}
      .btn {{ display:inline-block; padding:10px 14px; border-radius:8px; background:#111; color:#fff; text-decoration:none; border:0; cursor:pointer; }}
      .btn.secondary {{ background:#444; }}
      .muted {{ color:#666; font-size: 14px; }}
      textarea {{ width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; min-height: 54px; }}
      .toast {{ margin-top: 10px; color: #0a7; font-size: 14px; display:none; }}
      .kv {{ display:grid; grid-template-columns: 160px 1fr; gap: 6px 12px; margin-top: 10px; }}
      .badge {{ display:inline-block; padding: 6px 10px; border-radius: 999px; font-size: 13px; color: #fff; }}
    </style>
  </head>
  <body>
    <h2>Join a GMFN Clan</h2>

    <div class="box">
      <div class="row" style="justify-content: space-between; align-items: center;">
        <div>
          <div class="muted">Invite code</div>
          <div><code id="code">{safe_code}</code></div>
        </div>
        <div>
          <span class="badge" style="background:{status_color};">{status_text}</span>
        </div>
      </div>

      <div class="kv">
        <div class="muted">Clan</div><div>{clan_name}</div>
        <div class="muted">Expires</div><div>{expires_text}</div>
        <div class="muted">Usage</div><div>{usage_text}</div>
        <div class="muted">Remaining</div><div>{remaining_text}</div>
      </div>

      <div class="row" style="margin: 14px 0 6px 0;">
        <button class="btn secondary" onclick="copyText('{safe_code}', 'Copied invite code ✅')">Copy invite code</button>
        <button class="btn secondary" onclick="copyText(document.getElementById('jsonBody').value, 'Copied JSON body ✅')">Copy JSON body</button>
        <a class="btn" href="/docs">Open Swagger</a>
      </div>

      <div id="toast" class="toast">Copied ✅</div>

      <p class="muted" style="margin-top:12px;">
        To join, you must be logged in. For now, use Swagger:
      </p>

      <ol>
        <li>Open Swagger: <a href="/docs" target="_blank">/docs</a></li>
        <li>Login and click <b>Authorize</b></li>
        <li>Run <b>POST /clans/join-by-invite</b> with body:</li>
      </ol>

      <textarea id="jsonBody" readonly>{json_body}</textarea>

      <p class="muted" style="margin-top:14px;">
        Later, the frontend app will handle this automatically.
      </p>
    </div>

    <script>
      function copyText(text, message) {{
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {{
          const t = document.getElementById('toast');
          t.textContent = message || 'Copied ✅';
          t.style.display = 'block';
          setTimeout(() => t.style.display = 'none', 1800);
        }}).catch(() => {{
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          const t = document.getElementById('toast');
          t.textContent = message || 'Copied ✅';
          t.style.display = 'block';
          setTimeout(() => t.style.display = 'none', 1800);
        }});
      }}
    </script>
  </body>
</html>
"""


@router.get("/{clan_id}/invite/settings", response_model=dict[str, Any])
def get_invite_settings(
    clan_id: int,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = _require_clan_admin(clan_ctx)
    if int(clan.id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    clan = _ensure_invite_expiry(db, clan, days=None)

    return {
        "clan_id": int(clan.id),
        "invite_code": clan.invite_code,
        "invite_created_at": clan.invite_created_at,
        "invite_expires_at": clan.invite_expires_at,
        "invite_max_uses": getattr(clan, "invite_max_uses", None),
        "invite_uses": int(getattr(clan, "invite_uses", 0) or 0),
        "is_expired": _is_invite_expired(clan),
    }


class InviteSettingsUpdateIn(BaseModel):
    days: Optional[int] = None
    max_uses: Optional[int] = None
    rotate: bool = False


@router.patch("/{clan_id}/invite/settings", response_model=dict[str, Any])
def update_invite_settings(
    clan_id: int,
    payload: InviteSettingsUpdateIn,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = _require_clan_admin(clan_ctx)
    if int(clan.id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    days_n = _normalize_invite_days(payload.days)
    max_uses_n = _normalize_invite_max_uses(payload.max_uses)

    now = datetime.now(timezone.utc)

    clan = _ensure_invite_expiry(db, clan, days=days_n)

    clan.invite_max_uses = max_uses_n
    clan.invite_created_at = now
    clan.invite_expires_at = now + timedelta(days=days_n)

    if payload.rotate:
        clan.invite_code = secrets.token_urlsafe(16)
        clan.invite_uses = 0

    db.commit()
    db.refresh(clan)

    return {
        "ok": True,
        "clan_id": int(clan.id),
        "invite_code": clan.invite_code,
        "invite_created_at": clan.invite_created_at,
        "invite_expires_at": clan.invite_expires_at,
        "invite_max_uses": getattr(clan, "invite_max_uses", None),
        "invite_uses": int(getattr(clan, "invite_uses", 0) or 0),
    }


@router.post("/join-by-invite", status_code=201, response_model=dict[str, Any])
def join_by_invite(
    payload: JoinByInviteIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    code = (payload.invite_code or "").strip()
    out = join_clan_by_invite_code(db, code=code, user=current_user)
    return {"ok": True, **out}


@router.post("/", status_code=201, response_model=ClanOut)
def create_clan(
    payload: ClanCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(Clan).filter(Clan.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Clan name already exists")

    now = datetime.now(timezone.utc)
    clan = Clan(
        name=payload.name,
        description=payload.description,
        invite_code=secrets.token_urlsafe(16),
        invite_created_at=now,
        invite_expires_at=now + timedelta(days=7),
        invite_max_uses=None,
        invite_uses=0,
    )
    db.add(clan)
    db.commit()
    db.refresh(clan)

    m = ClanMembership(
        clan_id=clan.id,
        user_id=current_user.id,
        role="admin",
        personal_pool_balance=Decimal("0"),
    )
    db.add(m)
    db.commit()

    return clan


@router.get("/me", response_model=MyClansOut)
def list_my_clans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clans = (
        db.query(Clan)
        .join(ClanMembership, ClanMembership.clan_id == Clan.id)
        .filter(ClanMembership.user_id == current_user.id)
        .order_by(Clan.id.desc())
        .all()
    )
    return {"items": clans, "total": len(clans)}


@router.post("/{clan_id}/join", status_code=201, response_model=dict[str, Any])
def join_clan(
    clan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan = db.get(Clan, clan_id)
    if not clan:
        raise HTTPException(status_code=404, detail="Clan not found")

    exists = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == clan_id, ClanMembership.user_id == current_user.id)
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="Already a member of this clan")

    m = ClanMembership(
        clan_id=clan_id,
        user_id=current_user.id,
        role="user",
        personal_pool_balance=Decimal("0"),
    )
    db.add(m)
    db.commit()
    db.refresh(m)

    return {"ok": True, "membership": _member_row(db, m)}


@router.delete("/{clan_id}/leave", response_model=dict[str, Any])
def leave_clan(
    clan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == clan_id, ClanMembership.user_id == current_user.id)
        .first()
    )
    if not m:
        raise HTTPException(status_code=404, detail="You are not a member of this clan")

    if (m.role or "").lower() == "admin" and _is_last_admin(db, clan_id=clan_id):
        raise HTTPException(status_code=400, detail="Cannot leave: you are the last admin")

    db.delete(m)
    db.commit()
    return {"ok": True}


@router.get("/{clan_id}/members", response_model=dict[str, Any])
def list_members(
    clan_id: int,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = clan_ctx
    if clan.id != clan_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    members = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == clan_id)
        .order_by(ClanMembership.id.asc())
        .all()
    )

    items = [_member_row(db, m) for m in members]
    return {"items": items, "total": len(items)}


@router.post("/{clan_id}/members", status_code=201, response_model=dict[str, Any])
def add_member(
    clan_id: int,
    payload: AddMemberIn,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = _require_clan_admin(clan_ctx)
    if clan.id != clan_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    u = db.get(User, payload.user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    exists = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan_id,
            ClanMembership.user_id == payload.user_id,
        )
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="User already in clan")

    role = payload.role if payload.role in ("user", "admin") else "user"

    m = ClanMembership(
        clan_id=clan_id,
        user_id=payload.user_id,
        role=role,
        personal_pool_balance=Decimal("0"),
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return _member_row(db, m)


@router.delete("/{clan_id}/members/{user_id}", response_model=dict[str, Any])
def remove_member(
    clan_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = _require_clan_admin(clan_ctx)
    if clan.id != clan_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan_id,
            ClanMembership.user_id == user_id,
        )
        .first()
    )
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")

    if (m.role or "").lower() == "admin" and _is_last_admin(db, clan_id=clan_id):
        raise HTTPException(status_code=400, detail="Cannot remove the last admin")

    db.delete(m)
    db.commit()
    return {"ok": True}


@router.post("/{clan_id}/members/{user_id}/toggle-role", response_model=dict[str, Any])
def toggle_member_role(
    clan_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = _require_clan_admin(clan_ctx)
    if clan.id != clan_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan_id,
            ClanMembership.user_id == user_id,
        )
        .first()
    )
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")

    if (m.role or "").lower() == "admin" and _is_last_admin(db, clan_id=clan_id):
        raise HTTPException(status_code=400, detail="Cannot demote the last admin")

    m.role = "admin" if (m.role or "").lower() != "admin" else "user"
    db.commit()
    db.refresh(m)
    return _member_row(db, m)


@router.patch("/{clan_id}/members/{user_id}/pool", response_model=dict[str, Any])
def patch_member_pool_balance_compat(
    clan_id: int,
    user_id: int,
    payload: PatchMemberPoolIn,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = _require_clan_admin(clan_ctx)
    if clan.id != clan_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    if payload.pool_balance < 0:
        raise HTTPException(status_code=400, detail="pool_balance must be >= 0")

    m = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == clan_id, ClanMembership.user_id == user_id)
        .first()
    )
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")

    m.personal_pool_balance = payload.pool_balance
    db.commit()
    db.refresh(m)

    return {"pool_balance": float(m.personal_pool_balance or Decimal("0"))}


@router.post("/{clan_id}/members/pool/set", response_model=dict[str, Any])
def set_member_pool_balance(
    clan_id: int,
    payload: SetMemberPoolIn,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = _require_clan_admin(clan_ctx)
    if clan.id != clan_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    if payload.balance < 0:
        raise HTTPException(status_code=400, detail="balance must be >= 0")

    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan_id,
            ClanMembership.user_id == payload.user_id,
        )
        .first()
    )
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")

    m.personal_pool_balance = payload.balance
    db.commit()
    db.refresh(m)
    return {
        "user_id": payload.user_id,
        "clan_id": clan_id,
        "personal_pool_balance": str(m.personal_pool_balance or Decimal("0")),
    }