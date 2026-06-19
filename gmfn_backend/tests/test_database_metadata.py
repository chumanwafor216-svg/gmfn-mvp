from app.db.base import Base as CoreBase
from app.db.database import Base as DatabaseBase

# Import model modules so the assertion checks the complete metadata registry.
import app.db.bank_models  # noqa: F401
import app.db.identity_models  # noqa: F401
import app.db.models  # noqa: F401
import app.db.notification_models  # noqa: F401
import app.db.verification_models  # noqa: F401


def test_database_base_uses_canonical_metadata_for_dev_schema_creation():
    assert DatabaseBase is CoreBase

    tables = DatabaseBase.metadata.tables
    assert "clan_memberships" in tables
    assert "community_member_verification_requests" in tables
    assert "bank_events" in tables
    assert "identity_risk_signals" in tables
