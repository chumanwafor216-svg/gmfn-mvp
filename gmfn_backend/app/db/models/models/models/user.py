from __future__ import annotations

"""
Compatibility wrapper for User model.

Canonical location in this repo is likely app.db.models (or app.db.models.user).
We try the most likely imports and expose User.
"""

User = None  # type: ignore

_last_err = None
for path in (
    "app.db.models",
    "app.db.models.user",
    "app.db.models.models",
):
    try:
        mod = __import__(path, fromlist=["User"])
        if hasattr(mod, "User"):
            User = getattr(mod, "User")
            break
    except Exception as e:
        _last_err = e

if User is None:  # pragma: no cover
    raise ImportError(f"Could not import User from canonical locations. Last error: {_last_err}")