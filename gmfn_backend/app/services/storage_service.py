from __future__ import annotations

import os
import uuid
from typing import Dict

import boto3
from botocore.client import Config


R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")

R2_ENDPOINT = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

s3 = boto3.client(
    "s3",
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    config=Config(signature_version="s3v4"),
)


def generate_object_key(prefix: str, filename: str) -> str:
    ext = filename.split(".")[-1]
    return f"{prefix}/{uuid.uuid4().hex}.{ext}"


def create_presigned_upload(
    *,
    object_key: str,
    content_type: str,
    expires: int = 600,
) -> Dict:
    url = s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": R2_BUCKET_NAME,
            "Key": object_key,
            "ContentType": content_type,
        },
        ExpiresIn=expires,
    )

    return {
        "upload_url": url,
        "object_key": object_key,
    }


def build_public_url(object_key: str) -> str:
    return f"{R2_ENDPOINT}/{R2_BUCKET_NAME}/{object_key}"