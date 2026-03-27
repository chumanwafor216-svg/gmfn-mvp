import sqlite3

db_path = r"C:\Users\chukwuma pc\gmfn_mvp\gmfn_backend\gmfn.db"
email = "admin1@example.com"

conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("UPDATE users SET role='admin' WHERE email=?", (email,))
conn.commit()

cur.execute("SELECT id, email, role FROM users")
print(cur.fetchall())

conn.close()
