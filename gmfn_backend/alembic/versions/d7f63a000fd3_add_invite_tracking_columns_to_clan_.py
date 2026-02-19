"""add invite tracking columns to clan_memberships

Revision ID: d7f63a000fd3
Revises: ab472f0cdb57
Create Date: 2026-02-08

IMPORTANT:
This revision previously (incorrectly) created the trust_slips table.
trust_slips is now owned by revision 375c4be49afa_add_trust_slips.py.

To preserve migration history and stop duplicate table creation conflicts,
this migration is intentionally a NO-OP.
"""

from __future__ import annotations

from alembic import op  # noqa: F401


# revision identifiers, used by Alembic.
revision = "d7f63a000fd3"
down_revision = "ab472f0cdb57"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # NO-OP (see module docstring)
    return


def downgrade() -> None:
    # NO-OP (see module docstring)
    return