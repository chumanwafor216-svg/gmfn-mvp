from app.api.routes.auth import _cci_requires_attention


def test_thin_network_alone_is_not_an_adverse_cci_warning():
    assert _cci_requires_attention(["low_network_breadth"]) is False


def test_default_or_volatility_pressure_requires_attention():
    assert _cci_requires_attention(["default_history"]) is True
    assert _cci_requires_attention(["high_trust_volatility"]) is True


def test_auth_me_exposes_cci_attention_semantics(client, override_current_user):
    response = client.get("/auth/me")

    assert response.status_code == 200, response.text
    body = response.json()
    assert isinstance(body["cci_risk_flags"], list)
    assert isinstance(body["cci_requires_attention"], bool)
