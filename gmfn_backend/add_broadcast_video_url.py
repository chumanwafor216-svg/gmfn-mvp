import sqlite3

conn = sqlite3.connect("gmfn.db")
cur = conn.cursor()

try:
    cur.execute("ALTER TABLE marketplace_broadcasts ADD COLUMN video_url TEXT")
    conn.commit()
    print("video_url column added to marketplace_broadcasts.")
except Exception as e:
    print("ALTER failed:", e)

conn.close()
