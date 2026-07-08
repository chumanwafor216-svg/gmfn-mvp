from __future__ import annotations

import base64

from cryptography.hazmat.primitives.asymmetric import ec


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def main() -> None:
    private_key = ec.generate_private_key(ec.SECP256R1())
    private_number = private_key.private_numbers().private_value
    public_numbers = private_key.public_key().public_numbers()

    private_raw = private_number.to_bytes(32, "big")
    public_raw = (
        b"\x04"
        + public_numbers.x.to_bytes(32, "big")
        + public_numbers.y.to_bytes(32, "big")
    )

    print("GSN_WEB_PUSH_PUBLIC_KEY=" + _b64url(public_raw))
    print("GSN_WEB_PUSH_PRIVATE_KEY=" + _b64url(private_raw))
    print("GSN_WEB_PUSH_SUBJECT=mailto:support@globalmutualfundsnetwork.com")


if __name__ == "__main__":
    main()
