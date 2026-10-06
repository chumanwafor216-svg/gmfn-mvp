from __future__ import annotations

from typing import Any, Iterable

from sqlalchemy import String, cast, false


def validate_user_id_for_legacy_text_match(value: Any) -> int:
    """Validate an application user id before matching legacy text columns."""

    if isinstance(value, bool):
        raise ValueError("user id must be an integer")
    if isinstance(value, int):
        user_id = value
    elif isinstance(value, str) and value.isdecimal():
        user_id = int(value)
    else:
        raise ValueError("user id must be an integer")
    if user_id <= 0:
        raise ValueError("user id must be a positive integer")
    return user_id


def legacy_user_id_text_match(column: Any, user_id: Any):
    """Compare legacy varchar user-id columns to a validated application user id."""

    validated_user_id = validate_user_id_for_legacy_text_match(user_id)
    return cast(column, String) == str(validated_user_id)


def legacy_user_id_text_in(column: Any, user_ids: Iterable[Any]):
    validated_user_ids = [
        str(validate_user_id_for_legacy_text_match(user_id))
        for user_id in user_ids
    ]
    return cast(column, String).in_(validated_user_ids) if validated_user_ids else false()
