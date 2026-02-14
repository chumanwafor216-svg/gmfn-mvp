import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "gmfn.db"  # adjust if needed

COLUMNS = [
    ("personal_pool_at_request", "NUMERIC(12,2) NOT NULL DEFAULT 0"),
    ("pool_used", "NUMERIC(12,2) NOT NULL DEFAULT 0"),
    ("guarantee_gap", "NUMERIC(12,2) NOT NULL DEFAULT 0"),
]

def main():
    if not DB_PATH.exists():
        raise SystemExit(f"DB not found: {DB_PATH}")

    con = sqlite3.connect(str(DB_PATH))
    cur = con.cursor()

    cur.execute("PRAGMA table_info(loans);")
    existing = {row[1] for row in cur.fetchall()}  # row[1] = column name

    for name, ddl in COLUMNS:
        if name in existing:
            print(f"✓ loans.{name} already exists")
            continue
        sql = f"ALTER TABLE loans ADD COLUMN {name} {ddl};"
        print(f"Adding: {sql}")
        cur.execute(sql)

    con.commit()
    con.close()
    print("✅ Done. Restart backend and rerun freeze_run.py")

if __name__ == "__main__":
    main()
    