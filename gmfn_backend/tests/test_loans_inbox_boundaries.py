from __future__ import annotations

from fastapi.testclient import TestClient

from app.api.routes import loans_inbox
from app.main import app


class Obj:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def test_guarantor_inbox_rejects_non_positive_clan_header_before_query(
    client: TestClient,
):
    app.dependency_overrides[loans_inbox.get_current_user] = lambda: Obj(
        id=1,
        email="pytest@example.com",
        role="user",
    )
    try:
        response = client.get(
            "/loans/guarantors/inbox",
            headers={"X_Clan_Id": "0"},
        )
    finally:
        app.dependency_overrides.pop(loans_inbox.get_current_user, None)

    assert response.status_code == 422, response.text
    assert "X_Clan_Id" in response.text
