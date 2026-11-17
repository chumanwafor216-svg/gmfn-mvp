from sqlalchemy import text

from app.db.database import engine


def test_notification_read_and_read_all_clear_only_current_users_badge(
    client,
    override_current_user,
    seed_clan_admin_membership,
    seed_user2_non_member,
):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO notifications (
                    user_id, kind, title, message, is_read, created_at
                )
                VALUES
                    (1, 'account.update', 'First', 'First unread item.', 0, CURRENT_TIMESTAMP),
                    (1, 'account.update', 'Second', 'Second unread item.', 0, CURRENT_TIMESTAMP),
                    (2, 'account.update', 'Other user', 'Must remain unread.', 0, CURRENT_TIMESTAMP)
                """
            )
        )
        first_id = int(
            conn.execute(
                text(
                    """
                    SELECT MIN(id)
                    FROM notifications
                    WHERE user_id = 1
                    """
                )
            ).scalar_one()
        )

    initial = client.get("/notifications/me/unread-count")
    assert initial.status_code == 200
    assert initial.json()["unread_count"] == 2

    one_read = client.post(f"/notifications/me/{first_id}/read")
    assert one_read.status_code == 200
    assert one_read.json()["is_read"] is True

    after_one = client.get("/notifications/me/unread-count")
    assert after_one.status_code == 200
    assert after_one.json()["unread_count"] == 1

    cleared = client.post("/notifications/me/read-all")
    assert cleared.status_code == 200
    assert cleared.json() == {
        "user_id": 1,
        "marked_read_count": 1,
        "unread_count": 0,
    }

    final = client.get("/notifications/me/unread-count")
    assert final.status_code == 200
    assert final.json()["unread_count"] == 0

    with engine.begin() as conn:
        other_user_unread = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM notifications
                WHERE user_id = 2 AND is_read = 0
                """
            )
        ).scalar_one()
        current_user_read_at = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM notifications
                WHERE user_id = 1 AND is_read = 1 AND read_at IS NOT NULL
                """
            )
        ).scalar_one()

    assert other_user_unread == 1
    assert current_user_read_at == 2
