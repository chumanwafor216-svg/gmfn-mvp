import sqlite3

conn = sqlite3.connect("gmfn.db")
cur = conn.cursor()

cur.execute(
    """
    INSERT INTO loan_guarantors
    (loan_id, clan_id, guarantor_user_id, pledge_amount, status, is_locked, locked_amount, released_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """,
    (4, 1, 3, 75000, "pending", 0, 0, 0),
)

conn.commit()

rows = cur.execute(
    "SELECT id, loan_id, guarantor_user_id, pledge_amount, status FROM loan_guarantors WHERE loan_id=4"
).fetchall()

print("Inserted:", rows)

conn.close()
