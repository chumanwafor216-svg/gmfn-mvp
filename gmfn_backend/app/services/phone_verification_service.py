'''Shared, fail-closed phone verification delivery and confirmation service.'''

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from sqlalchemy.orm import Session

from app.db.models import EntryPhoneVerification
from app.services.pipeline_credit_spend_gate import debit_provider_spend


PIPELINE_PROVIDER_KEY = 'phone.sms_or_verify'
PIPELINE_WORKFLOW_KEY = 'phone.sms_or_verify.delivery'
TWILIO_PROVIDER_KEY = 'phone.twilio_verify.v2'
TWILIO_VERIFY_BASE_URL = 'https://verify.twilio.com/v2'


@dataclass(frozen=True)
class PhoneProviderReadiness:
    ready: bool
    status: str
    provider_key: str
    missing: tuple[str, ...]


class PhoneVerificationServiceError(RuntimeError):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        status_code: int = 503,
        retry_after_seconds: Optional[int] = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.retry_after_seconds = retry_after_seconds

    def detail(self) -> dict[str, Any]:
        detail: dict[str, Any] = {
            'code': self.code,
            'message': self.message,
        }
        if self.retry_after_seconds is not None:
            detail['retry_after_seconds'] = self.retry_after_seconds
        return detail


class TwilioVerifyError(RuntimeError):
    def __init__(self, code: str, *, http_status: int = 502) -> None:
        super().__init__(code)
        self.code = code
        self.http_status = http_status


def _clean(value: object) -> str:
    return str(value or '').strip()


def _truthy_env(name: str) -> bool:
    return _clean(os.getenv(name)).lower() in {'1', 'true', 'yes', 'on'}


def _bounded_int(name: str, default: int, minimum: int, maximum: int) -> int:
    try:
        value = int(_clean(os.getenv(name)) or default)
    except ValueError:
        value = default
    return max(minimum, min(value, maximum))


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _utc_aware(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _credential_pair() -> tuple[str, str]:
    api_key = _clean(os.getenv('TWILIO_API_KEY'))
    api_secret = _clean(os.getenv('TWILIO_API_SECRET'))
    if api_key and api_secret:
        return api_key, api_secret
    return (
        _clean(os.getenv('TWILIO_ACCOUNT_SID') or os.getenv('GSN_SMS_ACCOUNT_SID')),
        _clean(os.getenv('TWILIO_AUTH_TOKEN') or os.getenv('GSN_SMS_AUTH_TOKEN')),
    )


def _service_sid() -> str:
    return _clean(
        os.getenv('TWILIO_VERIFY_SERVICE_SID')
        or os.getenv('GSN_TWILIO_VERIFY_SERVICE_SID')
    )


def phone_provider_readiness() -> PhoneProviderReadiness:
    selected = _clean(os.getenv('GSN_PHONE_VERIFICATION_PROVIDER')).lower()
    provider = selected or 'twilio_verify'
    missing: list[str] = []
    if provider not in {'twilio', 'twilio_verify'}:
        return PhoneProviderReadiness(False, 'unsupported_provider', provider, ())
    if not _truthy_env('GSN_PHONE_VERIFICATION_ENABLED'):
        missing.append('GSN_PHONE_VERIFICATION_ENABLED')
    username, password = _credential_pair()
    if not username:
        missing.append('TWILIO_API_KEY_or_TWILIO_ACCOUNT_SID')
    if not password:
        missing.append('TWILIO_API_SECRET_or_TWILIO_AUTH_TOKEN')
    service_sid = _service_sid()
    if not service_sid:
        missing.append('TWILIO_VERIFY_SERVICE_SID')
    elif not service_sid.startswith('VA'):
        return PhoneProviderReadiness(False, 'invalid_service_sid', TWILIO_PROVIDER_KEY, ())
    return PhoneProviderReadiness(
        not missing,
        'ready' if not missing else 'disabled_or_incomplete',
        TWILIO_PROVIDER_KEY,
        tuple(missing),
    )


def phone_provider_readiness_payload() -> dict[str, Any]:
    readiness = phone_provider_readiness()
    return {
        'ready': readiness.ready,
        'status': readiness.status,
        'provider_key': readiness.provider_key,
        'missing': list(readiness.missing),
    }


def _code_secret() -> bytes:
    secret = _clean(os.getenv('GMFN_SECRET_KEY') or os.getenv('SECRET_KEY'))
    if not secret and (_truthy_env('GMFN_DEV_MODE') or os.getenv('PYTEST_CURRENT_TEST')):
        secret = 'gsn-local-phone-preview-only'
    if not secret:
        raise PhoneVerificationServiceError(
            'phone_code_secret_missing',
            'Phone verification is unavailable because the server secret is not configured.',
        )
    return secret.encode('utf-8')


def _code_digest(verification_id: int, code: str) -> str:
    message = f'{int(verification_id)}:{_clean(code)}'.encode('utf-8')
    return hmac.new(_code_secret(), message, hashlib.sha256).hexdigest()


def prepare_preview_code(
    db: Session,
    row: EntryPhoneVerification,
    *,
    commit: bool = True,
) -> str:
    code = f'{secrets.randbelow(1000000):06d}'
    row.code = None
    row.code_digest = _code_digest(int(row.id), code)
    row.provider_key = None
    row.provider_verification_id = None
    row.provider_status = 'preview_created'
    row.provider_error_code = None
    db.add(row)
    if commit:
        db.commit()
        db.refresh(row)
    return code


def confirm_preview_code(
    db: Session,
    row: EntryPhoneVerification,
    code: str,
) -> bool:
    _reserve_check_attempt(db, row)
    supplied = _clean(code)
    if row.code_digest:
        return hmac.compare_digest(
            _clean(row.code_digest),
            _code_digest(int(row.id), supplied),
        )
    return bool(row.code and hmac.compare_digest(_clean(row.code), supplied))


def _safe_provider_response(
    payload: dict[str, Any],
    *,
    ledger_entry_id: Optional[int] = None,
) -> str:
    allowed = {
        'sid': _clean(payload.get('sid')) or None,
        'status': _clean(payload.get('status')) or None,
        'channel': _clean(payload.get('channel')) or None,
        'valid': payload.get('valid') if isinstance(payload.get('valid'), bool) else None,
        'date_created': _clean(payload.get('date_created')) or None,
        'date_updated': _clean(payload.get('date_updated')) or None,
        'pipeline_credit_ledger_entry_id': ledger_entry_id,
    }
    return json.dumps({key: value for key, value in allowed.items() if value is not None})


def provider_delivery_context(row: EntryPhoneVerification) -> dict[str, Any]:
    return {
        'provider_key': row.provider_key or PIPELINE_PROVIDER_KEY,
        'workflow_key': PIPELINE_WORKFLOW_KEY,
        'provider_delivery_status': row.provider_status or 'not_started',
        'provider_delivery_boundary': (
            'GSN accepted live delivery only after the verification provider returned a receipt. '
            'Code approval is still required before phone ownership is recorded.'
        ),
    }


def _reserve_send_attempt(db: Session, row: EntryPhoneVerification) -> int:
    now = _now()
    attempts = int(row.provider_send_attempts or 0)
    max_session = _bounded_int('GSN_PHONE_MAX_SENDS_PER_SESSION', 3, 1, 10)
    if attempts >= max_session:
        raise PhoneVerificationServiceError(
            'phone_send_limit_reached',
            'This phone verification session has reached its send limit. Start a new session later.',
            status_code=429,
        )
    cooldown = _bounded_int('GSN_PHONE_RESEND_COOLDOWN_SECONDS', 60, 30, 600)
    last_attempt = _utc_aware(row.last_provider_send_attempt_at)
    if last_attempt:
        seconds = int((now - last_attempt).total_seconds())
        if seconds < cooldown:
            raise PhoneVerificationServiceError(
                'phone_resend_too_soon',
                'Please wait before asking GSN to send another code.',
                status_code=429,
                retry_after_seconds=max(1, cooldown - seconds),
            )

    window_minutes = _bounded_int('GSN_PHONE_SEND_WINDOW_MINUTES', 60, 10, 1440)
    max_phone = _bounded_int('GSN_PHONE_MAX_SENDS_PER_PHONE_WINDOW', 5, 1, 20)
    since = now - timedelta(minutes=window_minutes)
    rows = (
        db.query(EntryPhoneVerification)
        .filter(
            EntryPhoneVerification.phone_e164 == row.phone_e164,
            EntryPhoneVerification.last_provider_send_attempt_at >= since,
        )
        .all()
    )
    phone_attempts = sum(int(item.provider_send_attempts or 0) for item in rows)
    if phone_attempts >= max_phone:
        raise PhoneVerificationServiceError(
            'phone_send_window_limit_reached',
            'Too many codes were requested for this phone number. Try again later.',
            status_code=429,
            retry_after_seconds=window_minutes * 60,
        )

    row.provider_send_attempts = attempts + 1
    row.last_provider_send_attempt_at = now
    row.provider_status = 'send_reserved'
    row.provider_error_code = None
    db.add(row)
    db.commit()
    db.refresh(row)
    return int(row.provider_send_attempts)


def _reserve_check_attempt(db: Session, row: EntryPhoneVerification) -> None:
    attempts = int(row.provider_check_attempts or 0)
    maximum = _bounded_int('GSN_PHONE_MAX_CHECKS_PER_SESSION', 5, 1, 10)
    if attempts >= maximum:
        raise PhoneVerificationServiceError(
            'phone_check_limit_reached',
            'This verification session has reached its code-check limit. Start again.',
            status_code=429,
        )
    row.provider_check_attempts = attempts + 1
    row.last_provider_check_attempt_at = _now()
    db.add(row)
    db.commit()
    db.refresh(row)


def _twilio_post(path: str, form: dict[str, str]) -> dict[str, Any]:
    username, password = _credential_pair()
    token = base64.b64encode(f'{username}:{password}'.encode('utf-8')).decode('ascii')
    request = Request(
        f'{TWILIO_VERIFY_BASE_URL}{path}',
        data=urlencode(form).encode('utf-8'),
        headers={
            'Authorization': f'Basic {token}',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'GSN-PhoneVerification/1.0',
        },
        method='POST',
    )
    timeout = _bounded_int('GSN_PHONE_PROVIDER_TIMEOUT_SECONDS', 8, 3, 30)
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read().decode('utf-8')
    except HTTPError as exc:
        try:
            error_payload = json.loads(exc.read().decode('utf-8'))
        except Exception:
            error_payload = {}
        provider_code = _clean(error_payload.get('code')) or 'unknown'
        raise TwilioVerifyError(
            f'twilio_http_{int(exc.code)}_{provider_code}',
            http_status=int(exc.code),
        ) from exc
    except (URLError, TimeoutError, OSError) as exc:
        raise TwilioVerifyError('twilio_unreachable') from exc
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise TwilioVerifyError('twilio_invalid_response') from exc
    if not isinstance(payload, dict):
        raise TwilioVerifyError('twilio_invalid_response')
    return payload


def _twilio_start(phone_e164: str) -> dict[str, Any]:
    service_sid = _service_sid()
    payload = _twilio_post(
        f'/Services/{service_sid}/Verifications',
        {'To': phone_e164, 'Channel': 'sms'},
    )
    sid = _clean(payload.get('sid'))
    provider_status = _clean(payload.get('status')).lower()
    if not sid.startswith('VE') or provider_status != 'pending':
        raise TwilioVerifyError('twilio_start_not_accepted')
    return payload


def _twilio_check(verification_sid: str, code: str) -> dict[str, Any]:
    service_sid = _service_sid()
    return _twilio_post(
        f'/Services/{service_sid}/VerificationCheck',
        {'VerificationSid': verification_sid, 'Code': _clean(code)},
    )


def begin_live_phone_verification(
    db: Session,
    row: EntryPhoneVerification,
    *,
    user_id: Optional[int] = None,
    clan_id: Optional[int] = None,
) -> dict[str, Any]:
    readiness = phone_provider_readiness()
    if not readiness.ready:
        row.provider_key = readiness.provider_key
        row.provider_status = readiness.status
        row.provider_error_code = 'provider_not_ready'
        db.add(row)
        db.commit()
        raise PhoneVerificationServiceError(
            'phone_provider_not_ready',
            'Live phone verification is disabled or incompletely configured. No SMS was sent.',
        )

    attempt = _reserve_send_attempt(db, row)
    gate_result = debit_provider_spend(
        db,
        provider_key=PIPELINE_PROVIDER_KEY,
        workflow_key=PIPELINE_WORKFLOW_KEY,
        idempotency_key=f'provider-spend:phone:{int(row.id)}:send:{attempt}',
        reference_type='entry_phone_verification',
        reference_id=str(int(row.id)),
        note='Phone verification provider delivery',
        clan_id=clan_id,
        user_id=user_id,
        meta={
            'verification_id': int(row.id),
            'send_attempt': attempt,
            'provider_adapter': TWILIO_PROVIDER_KEY,
        },
    )
    if not gate_result.ok:
        row.provider_key = TWILIO_PROVIDER_KEY
        row.provider_status = gate_result.status
        row.provider_error_code = gate_result.status
        db.add(row)
        db.commit()
        raise PhoneVerificationServiceError(
            'phone_pipeline_credit_blocked',
            f'No SMS was sent. {gate_result.explanation}',
            status_code=402,
        )

    ledger_id = int((gate_result.ledger_entry or {}).get('id') or 0) or None
    row.pipeline_credit_ledger_entry_id = ledger_id
    row.provider_key = TWILIO_PROVIDER_KEY
    row.code = None
    row.code_digest = None
    try:
        response = _twilio_start(row.phone_e164)
    except TwilioVerifyError as exc:
        row.provider_status = 'provider_error'
        row.provider_error_code = exc.code[:64]
        row.provider_response_json = json.dumps(
            {'pipeline_credit_ledger_entry_id': ledger_id, 'provider_error_code': exc.code[:64]}
        )
        db.add(row)
        db.commit()
        raise PhoneVerificationServiceError(
            'phone_provider_delivery_failed',
            'The phone provider did not accept delivery. Pipeline Credits may already have been charged for this attempt.',
            status_code=502,
        ) from exc

    row.provider_verification_id = _clean(response.get('sid'))
    row.provider_status = _clean(response.get('status')).lower() or 'pending'
    row.provider_error_code = None
    row.provider_response_json = _safe_provider_response(
        response,
        ledger_entry_id=ledger_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return provider_delivery_context(row)


def confirm_live_phone_verification(
    db: Session,
    row: EntryPhoneVerification,
    code: str,
) -> bool:
    readiness = phone_provider_readiness()
    if not readiness.ready:
        raise PhoneVerificationServiceError(
            'phone_provider_not_ready',
            'Live phone confirmation is unavailable because the provider is disabled or incomplete.',
        )
    verification_sid = _clean(row.provider_verification_id)
    if not verification_sid.startswith('VE'):
        raise PhoneVerificationServiceError(
            'phone_provider_receipt_missing',
            'This session has no valid provider delivery receipt. Ask GSN to send a new code.',
            status_code=409,
        )
    _reserve_check_attempt(db, row)
    try:
        response = _twilio_check(verification_sid, code)
    except TwilioVerifyError as exc:
        row.provider_status = 'check_error'
        row.provider_error_code = exc.code[:64]
        db.add(row)
        db.commit()
        if exc.http_status in {404, 400}:
            raise PhoneVerificationServiceError(
                'phone_code_invalid_or_expired',
                'The verification code is incorrect, expired, or no longer available.',
                status_code=400,
            ) from exc
        raise PhoneVerificationServiceError(
            'phone_provider_check_failed',
            'The phone provider could not check this code. Try again shortly.',
            status_code=502,
        ) from exc

    approved = (
        _clean(response.get('status')).lower() == 'approved'
        and response.get('valid') is True
    )
    row.provider_status = _clean(response.get('status')).lower() or 'unknown'
    row.provider_error_code = None if approved else 'code_not_approved'
    row.provider_response_json = _safe_provider_response(
        response,
        ledger_entry_id=row.pipeline_credit_ledger_entry_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return approved
