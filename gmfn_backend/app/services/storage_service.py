from __future__ import annotations

import hashlib
import os
import uuid
from typing import Any, Dict, Optional

import boto3
from botocore.client import Config
from sqlalchemy.orm import Session

from app.services.pipeline_credit_spend_gate import debit_provider_spend


class StorageServiceError(RuntimeError):
    pass


def _safe_text(value: object) -> str:
    return str(value or "").strip()


def _r2_account_id() -> str:
    return _safe_text(os.getenv("R2_ACCOUNT_ID"))


def _r2_access_key_id() -> str:
    return _safe_text(os.getenv("R2_ACCESS_KEY_ID"))


def _r2_secret_access_key() -> str:
    return _safe_text(os.getenv("R2_SECRET_ACCESS_KEY"))


def _r2_bucket_name() -> str:
    return _safe_text(os.getenv("R2_BUCKET_NAME"))


def r2_endpoint() -> str:
    account_id = _r2_account_id()
    return f"https://{account_id}.r2.cloudflarestorage.com" if account_id else ""


def r2_configured() -> bool:
    return bool(
        _r2_account_id()
        and _r2_access_key_id()
        and _r2_secret_access_key()
        and _r2_bucket_name()
    )


def _r2_client():
    if not r2_configured():
        raise StorageServiceError("Cloudflare R2 storage is not configured.")
    return boto3.client(
        "s3",
        endpoint_url=r2_endpoint(),
        aws_access_key_id=_r2_access_key_id(),
        aws_secret_access_key=_r2_secret_access_key(),
        config=Config(signature_version="s3v4"),
    )


def generate_object_key(prefix: str, filename: str) -> str:
    clean_prefix = _safe_text(prefix).strip("/") or "uploads"
    raw_filename = _safe_text(filename) or "file.bin"
    ext = raw_filename.rsplit(".", 1)[-1].strip().lower() if "." in raw_filename else "bin"
    return f"{clean_prefix}/{uuid.uuid4().hex}.{ext}"


def _presign_idempotency_key(*, object_key: str, content_type: str) -> str:
    raw = f"{_safe_text(object_key)}|{_safe_text(content_type)}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]
    return f"provider-spend:storage.cloudflare_r2:presigned-upload:{digest}"


def _debit_r2_presign_spend(
    db: Optional[Session],
    *,
    object_key: str,
    content_type: str,
    reference_type: str,
    reference_id: str,
    clan_id: Optional[int] = None,
    user_id: Optional[int] = None,
    pipeline_credit_account_id: Optional[int] = None,
    pipeline_credit_owner_type: Optional[str] = None,
    pipeline_credit_owner_user_id: Optional[int] = None,
    pipeline_credit_sponsor_ref: Optional[str] = None,
    meta: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    if db is None:
        raise StorageServiceError(
            "R2 presigned upload creation requires a database session so pipeline credits can be debited before storage write access is issued."
        )

    gate_result = debit_provider_spend(
        db,
        provider_key="storage.cloudflare_r2",
        workflow_key="storage.cloudflare_r2.presigned_upload",
        idempotency_key=_presign_idempotency_key(object_key=object_key, content_type=content_type),
        reference_type=reference_type,
        reference_id=reference_id or object_key,
        note="Cloudflare R2 presigned upload provider access",
        clan_id=clan_id,
        user_id=user_id,
        account_id=pipeline_credit_account_id,
        owner_type=pipeline_credit_owner_type,
        owner_user_id=pipeline_credit_owner_user_id,
        sponsor_ref=pipeline_credit_sponsor_ref,
        meta={
            "object_key": object_key,
            "content_type": content_type,
            **(meta or {}),
        },
    )
    if not gate_result.ok:
        raise StorageServiceError(
            f"R2 presigned upload blocked by the Pipeline Credit gate. {gate_result.explanation}"
        )
    return {
        "ok": True,
        "status": gate_result.status,
        "provider_key": gate_result.provider_key,
        "workflow_key": gate_result.workflow_key,
        "ledger_entry": gate_result.ledger_entry,
    }


def create_presigned_upload(
    *,
    object_key: str,
    content_type: str,
    expires: int = 600,
    db: Optional[Session] = None,
    reference_type: str = "r2_presigned_upload",
    reference_id: Optional[str] = None,
    clan_id: Optional[int] = None,
    user_id: Optional[int] = None,
    pipeline_credit_account_id: Optional[int] = None,
    pipeline_credit_owner_type: Optional[str] = None,
    pipeline_credit_owner_user_id: Optional[int] = None,
    pipeline_credit_sponsor_ref: Optional[str] = None,
    meta: Optional[dict[str, Any]] = None,
) -> Dict[str, Any]:
    clean_key = _safe_text(object_key)
    clean_content_type = _safe_text(content_type) or "application/octet-stream"
    if not clean_key:
        raise StorageServiceError("object_key is required for R2 presigned upload creation.")

    pipeline_credit_gate = _debit_r2_presign_spend(
        db,
        object_key=clean_key,
        content_type=clean_content_type,
        reference_type=_safe_text(reference_type) or "r2_presigned_upload",
        reference_id=_safe_text(reference_id) or clean_key,
        clan_id=clan_id,
        user_id=user_id,
        pipeline_credit_account_id=pipeline_credit_account_id,
        pipeline_credit_owner_type=pipeline_credit_owner_type,
        pipeline_credit_owner_user_id=pipeline_credit_owner_user_id,
        pipeline_credit_sponsor_ref=pipeline_credit_sponsor_ref,
        meta=meta,
    )

    url = _r2_client().generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": _r2_bucket_name(),
            "Key": clean_key,
            "ContentType": clean_content_type,
        },
        ExpiresIn=max(60, min(int(expires or 600), 3600)),
    )

    return {
        "upload_url": url,
        "object_key": clean_key,
        "public_url": build_public_url(clean_key),
        "pipeline_credit_gate": pipeline_credit_gate,
    }


def build_public_url(object_key: str) -> str:
    endpoint = r2_endpoint()
    bucket = _r2_bucket_name()
    key = _safe_text(object_key).lstrip("/")
    if not endpoint or not bucket or not key:
        return ""
    return f"{endpoint}/{bucket}/{key}"
