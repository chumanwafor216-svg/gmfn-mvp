from app import main


def test_production_cors_includes_known_public_frontend_origins(monkeypatch):
    monkeypatch.delenv("GMFN_CORS_ORIGINS", raising=False)
    monkeypatch.setenv("GMFN_DEV_MODE", "0")

    origins, origin_regex = main._cors_settings()

    assert origin_regex is None
    assert "https://gmfn-frontend.onrender.com" in origins
    assert "https://frontend.onrender.com" in origins


def test_configured_cors_keeps_public_frontend_fallbacks(monkeypatch):
    monkeypatch.setenv("GMFN_CORS_ORIGINS", "https://pilot.gsn.example")
    monkeypatch.setenv("GMFN_DEV_MODE", "0")

    origins, origin_regex = main._cors_settings()

    assert origin_regex is None
    assert "https://pilot.gsn.example" in origins
    assert "https://gmfn-frontend.onrender.com" in origins
    assert "https://frontend.onrender.com" in origins
