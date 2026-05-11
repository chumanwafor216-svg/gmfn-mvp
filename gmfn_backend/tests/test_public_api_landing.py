from fastapi.testclient import TestClient


def test_api_root_is_a_helpful_landing(client: TestClient):
    res = client.get("/")

    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert body["service"] == "GMFN API"
    assert body["health"] == "/health"
    assert body["frontend"] == "https://gmfn-frontend.onrender.com"


def test_api_shop_alias_redirects_to_public_frontend(client: TestClient):
    res = client.get("/shop/GSN-U-9867079C", follow_redirects=False)

    assert res.status_code == 307
    assert res.headers["location"] == (
        "https://gmfn-frontend.onrender.com/shop/GSN-U-9867079C"
    )


def test_api_shop_alias_respects_public_frontend_env(
    client: TestClient, monkeypatch
):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example/")

    res = client.get("/open-shop/GMFN-U-123", follow_redirects=False)

    assert res.status_code == 307
    assert res.headers["location"] == "https://pilot.gsn.example/shop/GMFN-U-123"
