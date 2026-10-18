from app.services import storage_service as storage


def test_r2_object_key_is_accepted_only_for_configured_bucket(monkeypatch):
    monkeypatch.setenv("R2_ACCOUNT_ID", "account-123")
    monkeypatch.setenv("R2_BUCKET_NAME", "gsn-media")

    assert storage.r2_object_key_from_public_url(
        "https://account-123.r2.cloudflarestorage.com/gsn-media/marketplace/images/item%20one.jpg"
    ) == "marketplace/images/item one.jpg"
    assert (
        storage.r2_object_key_from_public_url(
            "https://another-account.r2.cloudflarestorage.com/gsn-media/marketplace/images/item.jpg"
        )
        is None
    )
    assert (
        storage.r2_object_key_from_public_url(
            "https://account-123.r2.cloudflarestorage.com/another-bucket/marketplace/images/item.jpg"
        )
        is None
    )
    assert (
        storage.r2_object_key_from_public_url(
            "https://account-123.r2.cloudflarestorage.com/gsn-media/"
        )
        is None
    )


def test_delete_r2_object_uses_configured_bucket(monkeypatch):
    monkeypatch.setenv("R2_BUCKET_NAME", "gsn-media")

    class FakeClient:
        def __init__(self):
            self.calls = []

        def delete_object(self, **kwargs):
            self.calls.append(kwargs)

    client = FakeClient()
    monkeypatch.setattr(storage, "_r2_client", lambda: client)

    storage.delete_r2_object(object_key="/marketplace/images/item.jpg")

    assert client.calls == [
        {"Bucket": "gsn-media", "Key": "marketplace/images/item.jpg"}
    ]
