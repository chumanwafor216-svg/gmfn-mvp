import re
from pathlib import Path

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
    assert "protected_trade_records" in tables
    assert "protected_trade_events" in tables
    assert "community_followers" in tables
    assert "community_domains" in tables
    assert "community_nodes" in tables
    assert "community_domain_memberships" in tables
    assert "community_node_memberships" in tables
    assert "community_domain_policies" in tables
    assert "community_domain_action_reviews" in tables
    assert "community_domain_action_review_decisions" in tables
    assert "community_domain_action_review_comments" in tables
    assert "community_domain_action_review_evidence" in tables


def test_member_witness_schema_identifiers_fit_postgres_limit():
    backend_root = Path(__file__).resolve().parents[1]
    files = [
        backend_root
        / "alembic"
        / "versions"
        / "20260618_add_community_domain_affiliations.py",
        backend_root
        / "alembic"
        / "versions"
        / "20260618_add_community_member_verifications.py",
        backend_root
        / "alembic"
        / "versions"
        / "20260619_add_community_member_verification_requests.py",
        backend_root
        / "alembic"
        / "versions"
        / "20260619_add_member_witness_pending_pair_guard.py",
        backend_root
        / "alembic"
        / "versions"
        / "20260627_add_protected_trade_records.py",
        backend_root
        / "alembic"
        / "versions"
        / "20260627_add_community_followers.py",
        backend_root
        / "alembic"
        / "versions"
        / "20260628_add_community_domain_skeleton.py",
        backend_root
        / "alembic"
        / "versions"
        / "20260628_add_community_domain_memberships.py",
        backend_root
        / "alembic"
        / "versions"
        / "20260628_add_community_domain_policy_reviews.py",
        backend_root
        / "alembic"
        / "versions"
        / "20260628_add_community_domain_review_decisions.py",
        backend_root
        / "alembic"
        / "versions"
        / "20260628_add_community_domain_review_revisions.py",
        backend_root
        / "alembic"
        / "versions"
        / "20260628_add_community_domain_review_comments.py",
        backend_root
        / "alembic"
        / "versions"
        / "20260628_add_community_domain_review_evidence.py",
        backend_root / "app" / "db" / "models.py",
    ]
    explicit_identifier = re.compile(r'"((?:ix|uq|fk)_[^"]+)"')
    too_long = []

    for path in files:
        for match in explicit_identifier.finditer(path.read_text()):
            identifier = match.group(1)
            if len(identifier) > 63:
                too_long.append(f"{path.name}: {len(identifier)} {identifier}")

    assert too_long == []
