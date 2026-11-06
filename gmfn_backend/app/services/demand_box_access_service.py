from __future__ import annotations

import re

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.models import ClanMembership, MarketplaceRequest, User


VISIBILITY_SCOPE_COMMUNITY = "community_visible"
VISIBILITY_SCOPE_PROTECTED_TARGET = "protected_target"
PROTECTED_TARGET_MARKER = "[GSN_VISIBILITY_SCOPE:protected_target]"

_HANDLE_PATTERN = re.compile(r"@([A-Za-z0-9][A-Za-z0-9_.-]{2,63})")


def _safe_text(value: object) -> str:
    return str(value or "").strip()


def normalize_visibility_scope(value: str | None) -> str:
    raw = _safe_text(value).lower().replace("-", "_").replace(" ", "_")
    if raw in {
        "protected_target",
        "private_target",
        "targeted_private",
        "ask_person",
        "ask_leader",
        "ask_pastor",
        "person_only",
    }:
        return VISIBILITY_SCOPE_PROTECTED_TARGET
    return VISIBILITY_SCOPE_COMMUNITY


def stored_description(description: str | None, visibility_scope: str) -> str | None:
    body = _safe_text(description)
    if visibility_scope != VISIBILITY_SCOPE_PROTECTED_TARGET:
        return body or None
    parts = [PROTECTED_TARGET_MARKER]
    if body:
        parts.append(body)
    return "\n\n".join(parts)


def public_description(row: MarketplaceRequest) -> str | None:
    description = _safe_text(getattr(row, "description", None))
    if not description:
        return None
    cleaned = "\n".join(
        line
        for line in description.splitlines()
        if line.strip() != PROTECTED_TARGET_MARKER
    ).strip()
    return cleaned or None


def request_visibility_scope(row: MarketplaceRequest) -> str:
    description = _safe_text(getattr(row, "description", None))
    if PROTECTED_TARGET_MARKER in description:
        return VISIBILITY_SCOPE_PROTECTED_TARGET
    return VISIBILITY_SCOPE_COMMUNITY


def is_protected_target_request(row: MarketplaceRequest) -> bool:
    return request_visibility_scope(row) == VISIBILITY_SCOPE_PROTECTED_TARGET


def request_text(row: MarketplaceRequest) -> str:
    return " ".join(
        part
        for part in [
            _safe_text(getattr(row, "title", None)),
            _safe_text(public_description(row)),
            _safe_text(getattr(row, "category", None)),
            _safe_text(getattr(row, "area", None)),
        ]
        if part
    )


def mentioned_handles(row: MarketplaceRequest) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()
    for match in _HANDLE_PATTERN.finditer(request_text(row)):
        token = match.group(1).strip(".,;:!?)]}")
        if not token:
            continue
        handle = f"@{token}"
        key = handle.lower()
        if key in seen:
            continue
        seen.add(key)
        found.append(handle)
        if len(found) >= 8:
            break
    return found


def _handle_key(value: str) -> str:
    return _safe_text(value).lstrip("@").lower()


def mentioned_member_ids(db: Session, row: MarketplaceRequest) -> set[int]:
    handle_keys = {_handle_key(handle) for handle in mentioned_handles(row)}
    handle_keys.discard("")
    clan_id = getattr(row, "clan_id", None)
    if not handle_keys or not clan_id:
        return set()

    rows = (
        db.query(User.id, User.gmfn_id)
        .join(ClanMembership, ClanMembership.user_id == User.id)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
            User.gmfn_id.isnot(None),
        )
        .all()
    )
    return {
        int(user_id)
        for user_id, gmfn_id in rows
        if _handle_key(str(gmfn_id)) in handle_keys
    }


def request_visible_to_user(
    db: Session,
    row: MarketplaceRequest,
    *,
    current_user_id: int,
) -> bool:
    if int(row.user_id) == int(current_user_id):
        return True
    if not is_protected_target_request(row):
        return True
    return int(current_user_id) in mentioned_member_ids(db, row)


def request_visibility_query_clause(*, current_user: User):
    user_id = int(getattr(current_user, "id", 0) or 0)
    gmfn_id = _safe_text(getattr(current_user, "gmfn_id", None))
    filters = [
        MarketplaceRequest.user_id == user_id,
        MarketplaceRequest.description.is_(None),
        ~MarketplaceRequest.description.contains(PROTECTED_TARGET_MARKER),
    ]
    if gmfn_id:
        handle_pattern = f"%@{gmfn_id}%"
        filters.extend(
            [
                MarketplaceRequest.title.ilike(handle_pattern),
                MarketplaceRequest.description.ilike(handle_pattern),
                MarketplaceRequest.category.ilike(handle_pattern),
                MarketplaceRequest.area.ilike(handle_pattern),
            ]
        )
    return or_(*filters)
