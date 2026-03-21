import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[2] / "gmfn.db"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.execute("PRAGMA table_info(clans)")
cols = [r[1] for r in cur.fetchall()]
print("Existing columns:", cols)

def add(col: str, sql: str) -> None:
    if col not in cols:
        print("Adding:", col)
        cur.execute(sql)
    else:
        print("Already exists:", col)

add("community_code", "ALTER TABLE clans ADD COLUMN community_code TEXT")
add("created_by_user_id", "ALTER TABLE clans ADD COLUMN created_by_user_id INTEGER")
add("status", "ALTER TABLE clans ADD COLUMN status TEXT DEFAULT 'active'")
add("closed_at", "ALTER TABLE clans ADD COLUMN closed_at TEXT")
add("closed_reason", "ALTER TABLE clans ADD COLUMN closed_reason TEXT")

cur.execute("UPDATE clans SET status = 'active' WHERE status IS NULL OR TRIM(status) = ''")

cur.execute("""
UPDATE clans
SET community_code = 'GMFN-C-' || printf('%06d', id)
WHERE community_code IS NULL OR TRIM(community_code) = ''
""")

conn.commit()
conn.close()

print("✅ Clan table fixed successfully")