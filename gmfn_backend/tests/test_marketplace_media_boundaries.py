from __future__ import annotations

import os
import shutil
from pathlib import Path


def _upload_root() -> Path:
    root = Path("test_uploads") / f"marketplace_media_boundaries_{os.getpid()}"
    shutil.rmtree(root, ignore_errors=True)
    return root


def test_marketplace_upload_url_rejects_malformed_text_controls(
    client,
    monkeypatch,
):
    upload_root = _upload_root()
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(upload_root))

    base_payload = {
        "filename": "cover.jpg",
        "content_type": "image/jpeg",
        "media_type": "image",
    }

    for field_name in base_payload:
        payload = dict(base_payload)
        payload[field_name] = False

        response = client.post("/marketplace/media/upload-url", json=payload)

        assert response.status_code == 422, response.text
        assert f"{field_name} must be text" in response.text
        assert not (upload_root / "marketplace").exists()

        payload[field_name] = 1.5

        response = client.post("/marketplace/media/upload-url", json=payload)

        assert response.status_code == 422, response.text
        assert f"{field_name} must be text" in response.text
        assert not (upload_root / "marketplace").exists()

    shutil.rmtree(upload_root, ignore_errors=True)


def test_marketplace_upload_url_valid_image_still_returns_direct_upload_contract(
    client,
    monkeypatch,
):
    upload_root = _upload_root()
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(upload_root))

    response = client.post(
        "/marketplace/media/upload-url",
        json={
            "filename": "cover.jpg",
            "content_type": "image/jpeg",
            "media_type": "image",
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["ok"] is True
    assert body["media_type"] == "image"
    assert body["object_key"].startswith("marketplace/images/")
    assert body["upload_url"].startswith("http://testserver/marketplace/media/upload-direct/images/")
    assert body["public_url"].startswith("/uploads/marketplace/images/")
    assert body["max_bytes"] > 0
    assert (upload_root / "marketplace" / "images").is_dir()
    assert (upload_root / "marketplace" / "videos").is_dir()

    shutil.rmtree(upload_root, ignore_errors=True)
