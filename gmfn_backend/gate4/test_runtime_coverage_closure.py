from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys

import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url

from gate3.test_deployment_rehearsal import (
    _create_roles,
    _driver_url,
    _engine,
    _insert_taxonomy_draft,
    _run_isolated as _run_gate3_isolated,
    _seed_synthetic_application_data,
    _verify_runtime_cannot_escalate,
)
from gate4.test_runtime_privilege_coverage import (
    _apply_runtime_contract,
    _load_contract,
    _seed_gate4_member,
    _run_gate4_isolated,
    _verify_runtime_ddl_and_authority_denials,
)


DATABASE_PREFIX = "gsn_gate4b_coverage_"


def _seed_gate4b_financial_data(migrator_url: str) -> None:
    engine = _engine(migrator_url)
    try:
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO loans (
                        id, borrower_user_id, clan_id, amount, currency, status,
                        guarantors_required, remaining_amount, due_at
                    ) VALUES (
                        1, '1', 1, 100, 'NGN', 'approved', 0, 100,
                        now() + interval '30 days'
                    )
                    """
                )
            )
            connection.execute(text("SELECT setval('loans_id_seq', 1, true)"))
    finally:
        engine.dispose()


def _child_env(
    runtime_url: str,
    *,
    artifact_dir: Path,
    contract_path: Path,
    report_path: Path,
) -> dict[str, str]:
    keep = {
        "ALLUSERSPROFILE", "APPDATA", "COMSPEC", "HOMEDRIVE", "HOMEPATH",
        "LOCALAPPDATA", "NUMBER_OF_PROCESSORS", "OS", "PATH", "PATHEXT",
        "PROCESSOR_ARCHITECTURE", "PROGRAMDATA", "PROGRAMFILES",
        "PROGRAMFILES(X86)", "SYSTEMDRIVE", "SYSTEMROOT", "TEMP", "TMP",
        "USERDOMAIN", "USERNAME", "USERPROFILE", "WINDIR",
    }
    environment = {key: value for key, value in os.environ.items() if key.upper() in keep}
    environment.update(
        {
            "DATABASE_URL": runtime_url,
            "SECRET_KEY": "gate4b-disposable-synthetic-secret",
            "GMFN_DEV_MODE": "false",
            "GMFN_AUTO_CREATE_SCHEMA": "false",
            "GMFN_ENABLE_RECONCILIATION_LOOP": "false",
            "GSN_ENABLE_SPOTLIGHT_RETENTION_LOOP": "false",
            "GSN_RUNTIME_MEMORY_LOGGING": "false",
            "GSN_SHOP_PRIVACY_AUTHORITY_V1_ENABLED": "false",
            "GSN_COMMERCE_TAXONOMY_OWNER_API_ENABLED": "false",
            "GSN_COMMERCE_TAXONOMY_ADMIN_API_ENABLED": "false",
            "GSN_COMMERCE_TAXONOMY_PUBLICATION_ENABLED": "false",
            "GSN_TRUSTSLIP_V1_SNAPSHOT_WRITES_ENABLED": "false",
            "GMFN_UPLOADS_DIR": str(artifact_dir / "uploads"),
            "GSN_GATE4_CONTRACT_PATH": str(contract_path),
            "GSN_GATE4B_ROUTE_REPORT_PATH": str(report_path),
            "PYTHONIOENCODING": "utf-8",
        }
    )
    return environment


def _run_probe(
    runtime_url: str,
    *,
    artifact_dir: Path,
    contract_path: Path,
    report_path: Path,
) -> subprocess.CompletedProcess[str]:
    backend_root = Path(__file__).resolve().parents[1]
    completed = subprocess.run(
        [
            sys.executable,
            str(backend_root / "tools" / "gate4b_isolated_process.py"),
            "probe",
        ],
        cwd=backend_root,
        env=_child_env(
            runtime_url,
            artifact_dir=artifact_dir,
            contract_path=contract_path,
            report_path=report_path,
        ),
        text=True,
        capture_output=True,
        check=False,
        timeout=600,
    )
    print(completed.stdout)
    if completed.stderr:
        print(completed.stderr)
    return completed


def test_gate4b_runtime_route_coverage_closure() -> None:
    raw_admin_url = str(os.getenv("GSN_GATE4B_ADMIN_URL", "") or "").strip()
    if not raw_admin_url:
        pytest.skip("GSN_GATE4B_ADMIN_URL is required")
    admin_url = make_url(raw_admin_url)
    if admin_url.get_backend_name() != "postgresql":
        raise RuntimeError("Gate 4B requires PostgreSQL")
    if str(admin_url.host or "").lower() not in {"127.0.0.1", "localhost"}:
        raise RuntimeError("Gate 4B refuses non-local PostgreSQL")
    database_name = str(admin_url.database or "")
    if not database_name.startswith(DATABASE_PREFIX):
        raise RuntimeError("Gate 4B refuses a database without its disposable prefix")

    artifact_dir = Path(os.environ["GSN_GATE4B_ARTIFACT_DIR"]).resolve()
    contract_path = Path(os.environ["GSN_GATE4B_CONTRACT_PATH"]).resolve()
    report_path = artifact_dir / "gate4b-route-coverage.json"
    contract = _load_contract()
    assert contract["contract_version"] == "gate4a-observed-v1"

    passwords = _create_roles(admin_url, database_name)
    migrator_url = _driver_url(
        admin_url, username="gsn_migrator", password=passwords["gsn_migrator"]
    )
    runtime_url = _driver_url(
        admin_url, username="gsn_runtime", password=passwords["gsn_runtime"]
    )

    migration = _run_gate3_isolated(
        migrator_url, mode="migrate", artifact_dir=artifact_dir
    )
    assert migration.returncode == 0, migration.stderr
    _apply_runtime_contract(migrator_url, contract)
    _seed_synthetic_application_data(migrator_url)
    _seed_gate4_member(migrator_url)
    _seed_gate4b_financial_data(migrator_url)
    assert _insert_taxonomy_draft(runtime_url) == "GSN-TAX-R-GATE3"

    runtime_seed = _run_gate3_isolated(
        runtime_url, mode="runtime", artifact_dir=artifact_dir
    )
    assert runtime_seed.returncode == 0, runtime_seed.stderr

    probe = _run_probe(
        runtime_url,
        artifact_dir=artifact_dir,
        contract_path=contract_path,
        report_path=report_path,
    )
    assert probe.returncode == 0, probe.stderr
    report = json.loads(report_path.read_text(encoding="utf-8"))
    assert report["target_route_count"] == 149
    assert report["runtime_role"] == "gsn_runtime"
    assert all(value == "false" for value in report["feature_flags"].values())

    permission_failures = [
        row
        for row in report["routes"]
        if row["classification"] == "database_privilege_blocked"
    ]
    assert not permission_failures, json.dumps(permission_failures, indent=2)

    security = _run_gate4_isolated(
        runtime_url, mode="security", artifact_dir=artifact_dir
    )
    assert security.returncode == 0, security.stderr
    _verify_runtime_cannot_escalate(runtime_url)
    _verify_runtime_ddl_and_authority_denials(runtime_url)
    print(
        "GATE4B_COVERAGE_COMPLETE "
        f"routes={report['target_route_count']} "
        f"summary={json.dumps(report['summary'], sort_keys=True)}"
    )
