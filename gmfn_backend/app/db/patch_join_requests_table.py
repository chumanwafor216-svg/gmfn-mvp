from __future__ import annotations

import sqlite3
from pathlib import Path

from app.db.base import Base
from app.db.engine import engine
import app.db.models  # noqa: F401  # register models

DB_PATH = Path(__file__).resolve().parents[2] / "gmfn.db"


def table_exists(conn: sqlite3.Connection, table_name: str) -> bool:
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (table_name,),
    ).fetchone()
    return row is not None


def get_columns(conn: sqlite3.Connection, table_name: str) -> list[str]:
    rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    return [str(r[1]) for r in rows]


def add_column_if_missing(
    conn: sqlite3.Connection,
    table_name: str,
    column_name: str,
    sql_type: str,
) -> None:
    cols = get_columns(conn, table_name)
    if column_name in cols:
        print(f"Already exists: {table_name}.{column_name}")
        return

    sql = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {sql_type}"
    print(f"Adding: {table_name}.{column_name} {sql_type}")
    conn.execute(sql)


def create_index_if_missing(
    conn: sqlite3.Connection,
    index_name: str,
    table_name: str,
    column_name: str,
) -> None:
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='index' AND name=?",
        (index_name,),
    ).fetchone()
    if row is not None:
        print(f"Index already exists: {index_name}")
        return

    sql = f"CREATE INDEX {index_name} ON {table_name} ({column_name})"
    print(f"Creating index: {index_name}")
    conn.execute(sql)


def backfill_community_codes(conn: sqlite3.Connection) -> None:
    if not table_exists(conn, "clans"):
        return

    cols = get_columns(conn, "clans")
    if "community_code" not in cols:
        return

    rows = conn.execute(
        "SELECT id FROM clans WHERE community_code IS NULL OR TRIM(community_code) = ''"
    ).fetchall()

    for (clan_id,) in rows:
        code = f"GMFN-C-{int(clan_id):06d}"
        conn.execute(
            "UPDATE clans SET community_code = ? WHERE id = ?",
            (code, int(clan_id)),
        )

    if rows:
        print(f"Backfilled community_code for {len(rows)} clan row(s).")


def main() -> None:
    print(f"Using DB: {DB_PATH}")

    # 1) Create all tables from current SQLAlchemy models first
    Base.metadata.create_all(bind=engine)
    print("Base.metadata.create_all completed.")

    # 2) Patch sqlite schema for older restored DBs
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("PRAGMA foreign_keys=ON")

        if not table_exists(conn, "clan_join_requests"):
            raise RuntimeError(
                "clan_join_requests table still does not exist after create_all. "
                "Check app/db/engine.py DB path or Base/engine wiring."
            )

        print("Existing clan_join_requests columns:", get_columns(conn, "clan_join_requests"))

        add_column_if_missing(conn, "clan_join_requests", "activation_link", "TEXT")
        add_column_if_missing(conn, "clan_join_requests", "activation_message", "TEXT")
        add_column_if_missing(conn, "clan_join_requests", "activation_generated_at", "DATETIME")
        add_column_if_missing(conn, "clan_join_requests", "activation_delivery_status", "VARCHAR(20)")
        add_column_if_missing(conn, "clan_join_requests", "activation_delivered_at", "DATETIME")

        if table_exists(conn, "clans"):
            add_column_if_missing(conn, "clans", "community_code", "VARCHAR(32)")
            add_column_if_missing(conn, "clans", "created_by_user_id", "INTEGER")
            add_column_if_missing(conn, "clans", "status", "VARCHAR(20) DEFAULT 'active'")
            add_column_if_missing(conn, "clans", "closed_at", "DATETIME")
            add_column_if_missing(conn, "clans", "closed_reason", "TEXT")

        create_index_if_missing(
            conn,
            "ix_clan_join_requests_activation_delivery_status",
            "clan_join_requests",
            "activation_delivery_status",
        )
        create_index_if_missing(
            conn,
            "ix_clans_community_code",
            "clans",
            "community_code",
        )

        backfill_community_codes(conn)

        conn.commit()

        print("Final clan_join_requests columns:", get_columns(conn, "clan_join_requests"))
        if table_exists(conn, "clans"):
            print("Final clans columns:", get_columns(conn, "clans"))

        print("Schema repair completed successfully.")

    finally:
        conn.close()


if __name__ == "__main__":
    main()