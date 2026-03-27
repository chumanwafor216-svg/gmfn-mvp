import sqlite3

conn = sqlite3.connect("gmfn.db")
cur = conn.cursor()

cur.execute("PRAGMA table_info(marketplace_products)")
rows = cur.fetchall()

for row in rows:
    print(row)

conn.close()
