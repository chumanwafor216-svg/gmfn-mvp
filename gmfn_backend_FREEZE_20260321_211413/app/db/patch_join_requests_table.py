import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[2] / "app.db"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.execute("PRAGMA table_info(clan_join_requests)")
cols = [r[1] for r in cur.fetchall()]
print("Existing columns:", cols)

def add(col: str, sql: str) -> None:
    if col not in cols:
        print("Adding:", col)
        cur.execute(sql)
    else:
        print("Already exists:", col)

add("activation_link", "ALTER TABLE clan_join_requests ADD COLUMN activation_link TEXT")
add("activation_message", "ALTER TABLE clan_join_requests ADD COLUMN activation_message TEXT")
add("activation_generated_at", "ALTER TABLE clan_join_requests ADD COLUMN activation_generated_at TEXT")
add("activation_delivery_status", "ALTER TABLE clan_join_requests ADD COLUMN activation_delivery_status TEXT")
add("activation_delivered_at", "ALTER TABLE clan_join_requests ADD COLUMN activation_delivered_at TEXT")

conn.commit()
conn.close()

print("✅ clan_join_requests table fixed successfully")