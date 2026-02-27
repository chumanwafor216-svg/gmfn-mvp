import sqlite3

DB = "gmfn.db"
DEFAULT_CLAN = "GMFN Default Clan"
ADMIN_EMAIL = "test@example.com"

con = sqlite3.connect(DB)
cur = con.cursor()

# 1) Ensure default clan exists
cur.execute("INSERT OR IGNORE INTO clans (name) VALUES (?)", (DEFAULT_CLAN,))
cur.execute("SELECT id FROM clans WHERE name=?", (DEFAULT_CLAN,))
clan_id = cur.fetchone()[0]
print("default clan_id:", clan_id)

# 2) Ensure memberships exist for all users
cur.execute("SELECT id, email FROM users")
users = cur.fetchall()

for uid, email in users:
    cur.execute(
        "INSERT OR IGNORE INTO clan_memberships (clan_id, user_id, role, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
        (clan_id, uid, "user"),
    )

# 3) Promote admin membership for ADMIN_EMAIL
cur.execute("SELECT id FROM users WHERE email=?", (ADMIN_EMAIL,))
row = cur.fetchone()
if row:
    admin_id = row[0]
    cur.execute(
        "UPDATE clan_memberships SET role='admin' WHERE clan_id=? AND user_id=?",
        (clan_id, admin_id),
    )
    print("admin promoted:", ADMIN_EMAIL)
else:
    print("admin user not found:", ADMIN_EMAIL)

# 4) Backfill existing loans to default clan
cur.execute("UPDATE loans SET clan_id=? WHERE clan_id IS NULL", (clan_id,))
print("loans updated:", cur.rowcount)

con.commit()
con.close()
print("done")
