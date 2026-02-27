import os
import sqlite3

db = "gmfn.db"
print("DB absolute path:", os.path.abspath(db))

conn = sqlite3.connect(db)

tables = conn.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
).fetchall()
print("Tables:", tables)

print("users columns:", conn.execute("PRAGMA table_info(users)").fetchall())

print(
    "alembic_version table exists:",
    conn.execute("SELECT name FROM sqlite_master WHERE name='alembic_version'").fetchall()
)

try:
    print("alembic_version row:", conn.execute("SELECT * FROM alembic_version").fetchall())
except Exception as e:
    print("Could not read alembic_version:", e)
