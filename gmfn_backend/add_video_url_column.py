import sqlite3

conn = sqlite3.connect("gmfn.db")
cur = conn.cursor()

try:
    cur.execute("ALTER TABLE marketplace_products ADD COLUMN video_url TEXT")
    conn.commit()
    print("video_url column added successfully.")
except Exception as e:
    print("ALTER failed:", e)

conn.close()
