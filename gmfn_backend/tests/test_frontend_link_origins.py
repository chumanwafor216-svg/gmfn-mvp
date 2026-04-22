from starlette.requests import Request

from app.api.routes import clans as clans_route
from app.services import invites_service


def _request_with_origin(origin: str) -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/clans/1/invite-link",
            "headers": [(b"origin", origin.encode("utf-8"))],
        }
    )


def test_frontend_origin_does_not_leak_localhost_into_public_invites(monkeypatch):
    monkeypatch.delenv("FRONTEND_BASE_URL", raising=False)
    monkeypatch.delenv("GMFN_FRONTEND_BASE_URL", raising=False)
    monkeypatch.delenv("PUBLIC_FRONTEND_URL", raising=False)

    request = _request_with_origin("http://localhost:5174")

    assert clans_route._frontend_origin(request) == "https://gmfn-frontend.onrender.com"


def test_frontend_origin_does_not_leak_private_lan_into_public_invites(monkeypatch):
    monkeypatch.delenv("FRONTEND_BASE_URL", raising=False)
    monkeypatch.delenv("GMFN_FRONTEND_BASE_URL", raising=False)
    monkeypatch.delenv("PUBLIC_FRONTEND_URL", raising=False)

    request = _request_with_origin("http://192.168.1.38:5173")

    assert clans_route._frontend_origin(request) == "https://gmfn-frontend.onrender.com"


def test_frontend_origin_uses_configured_public_url_even_from_local_request(monkeypatch):
    monkeypatch.setenv("FRONTEND_BASE_URL", "https://pilot.gsn.example/")

    request = _request_with_origin("http://localhost:5174")

    assert clans_route._frontend_origin(request) == "https://pilot.gsn.example"


def test_frontend_origin_can_use_public_request_origin_when_unconfigured(monkeypatch):
    monkeypatch.delenv("FRONTEND_BASE_URL", raising=False)
    monkeypatch.delenv("GMFN_FRONTEND_BASE_URL", raising=False)
    monkeypatch.delenv("PUBLIC_FRONTEND_URL", raising=False)

    request = _request_with_origin("https://preview.gsn.example")

    assert clans_route._frontend_origin(request) == "https://preview.gsn.example"


def test_invites_service_join_link_ignores_private_configured_frontend(monkeypatch):
    monkeypatch.setenv("FRONTEND_BASE_URL", "http://localhost:5174")
    monkeypatch.delenv("GMFN_FRONTEND_BASE_URL", raising=False)
    monkeypatch.delenv("PUBLIC_FRONTEND_URL", raising=False)

    link = invites_service.frontend_join_link("abc 123")

    assert link == "https://gmfn-frontend.onrender.com/start/join/abc%20123"


def test_invites_service_join_link_uses_public_configured_frontend(monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example/")
    monkeypatch.delenv("FRONTEND_BASE_URL", raising=False)
    monkeypatch.delenv("GMFN_FRONTEND_BASE_URL", raising=False)

    link = invites_service.frontend_join_link("abc")

    assert link == "https://pilot.gsn.example/start/join/abc"
