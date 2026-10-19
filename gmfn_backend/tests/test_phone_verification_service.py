from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.db.database import SessionLocal
from app.db.models import EntryPhoneVerification
from app.services import phone_verification_service as service
from app.services.pipeline_credit_spend_gate import ProviderSpendGateResult


def _new_row() -> int:
    with SessionLocal() as db:
        row = EntryPhoneVerification(
            display_name='Phone Tester',
            phone_e164='+447700900900',
            email='phone-tester@example.com',
            code=None,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return int(row.id)


def _enable_twilio(monkeypatch) -> None:
    monkeypatch.setenv('GSN_PHONE_VERIFICATION_ENABLED', '1')
    monkeypatch.setenv('GSN_PHONE_VERIFICATION_PROVIDER', 'twilio_verify')
    monkeypatch.setenv('TWILIO_ACCOUNT_SID', 'AC-test-account')
    monkeypatch.setenv('TWILIO_AUTH_TOKEN', 'test-token')
    monkeypatch.setenv('TWILIO_VERIFY_SERVICE_SID', 'VA-test-service')
    monkeypatch.setenv('GMFN_SECRET_KEY', 'test-phone-secret')


def test_service_error_exposes_retry_after_without_losing_structured_detail():
    error = service.PhoneVerificationServiceError(
        'phone_resend_too_soon',
        'Wait before requesting another code.',
        status_code=429,
        retry_after_seconds=47,
    )

    assert error.detail() == {
        'code': 'phone_resend_too_soon',
        'message': 'Wait before requesting another code.',
        'retry_after_seconds': 47,
    }
    assert error.response_headers() == {'Retry-After': '47'}


def test_preview_code_is_hashed_and_legacy_plaintext_is_not_needed(monkeypatch):
    monkeypatch.setenv('GMFN_SECRET_KEY', 'test-phone-secret')
    row_id = _new_row()

    with SessionLocal() as db:
        row = db.get(EntryPhoneVerification, row_id)
        code = service.prepare_preview_code(db, row)
        assert row.code is None
        assert row.code_digest
        assert code not in row.code_digest
        assert service.confirm_preview_code(db, row, code) is True
        assert service.confirm_preview_code(db, row, '000000') is False
        assert service.confirm_preview_code(db, row, '000001') is False
        assert service.confirm_preview_code(db, row, '000002') is False
        assert service.confirm_preview_code(db, row, '000003') is False
        with pytest.raises(service.PhoneVerificationServiceError) as exc_info:
            service.confirm_preview_code(db, row, '000004')
        assert exc_info.value.code == 'phone_check_limit_reached'


def test_live_provider_starts_only_after_pipeline_credit_debit(monkeypatch):
    _enable_twilio(monkeypatch)
    calls: list[str] = []

    def fake_debit(*args, **kwargs):
        calls.append('debit')
        return ProviderSpendGateResult(
            ok=True,
            status='debited',
            provider_key=service.PIPELINE_PROVIDER_KEY,
            workflow_key=service.PIPELINE_WORKFLOW_KEY,
            explanation='debited',
            ledger_entry={'id': 77},
        )

    def fake_start(phone_e164):
        assert calls == ['debit']
        calls.append('provider')
        return {
            'sid': 'VE-test-verification',
            'status': 'pending',
            'channel': 'sms',
        }

    monkeypatch.setattr(service, 'debit_provider_spend', fake_debit)
    monkeypatch.setattr(service, '_twilio_start', fake_start)
    row_id = _new_row()

    with SessionLocal() as db:
        row = db.get(EntryPhoneVerification, row_id)
        context = service.begin_live_phone_verification(db, row, user_id=5, clan_id=8)
        assert calls == ['debit', 'provider']
        assert context['provider_delivery_status'] == 'pending'
        assert row.provider_verification_id == 'VE-test-verification'
        assert row.pipeline_credit_ledger_entry_id == 77
        assert row.code is None
        assert row.code_digest is None
        assert '+447700900900' not in (row.provider_response_json or '')
        with pytest.raises(service.PhoneVerificationServiceError) as exc_info:
            service.begin_live_phone_verification(db, row, user_id=5, clan_id=8)
        assert exc_info.value.code == 'phone_resend_too_soon'
        assert calls == ['debit', 'provider']


def test_live_confirmation_requires_provider_approval(monkeypatch):
    _enable_twilio(monkeypatch)
    row_id = _new_row()
    with SessionLocal() as db:
        row = db.get(EntryPhoneVerification, row_id)
        row.provider_key = service.TWILIO_PROVIDER_KEY
        row.provider_verification_id = 'VE-test-verification'
        row.provider_status = 'pending'
        db.add(row)
        db.commit()

        monkeypatch.setattr(
            service,
            '_twilio_check',
            lambda verification_sid, code: {
                'sid': verification_sid,
                'status': 'pending',
                'valid': False,
            },
        )
        assert service.confirm_live_phone_verification(db, row, '111111') is False

        monkeypatch.setattr(
            service,
            '_twilio_check',
            lambda verification_sid, code: {
                'sid': verification_sid,
                'status': 'approved',
            },
        )
        assert service.confirm_live_phone_verification(db, row, '111112') is False

        monkeypatch.setattr(
            service,
            '_twilio_check',
            lambda verification_sid, code: {
                'sid': verification_sid,
                'status': 'approved',
                'valid': True,
            },
        )
        assert service.confirm_live_phone_verification(db, row, '222222') is True


def test_live_provider_is_not_called_when_pipeline_credit_gate_blocks(monkeypatch):
    _enable_twilio(monkeypatch)
    monkeypatch.setattr(
        service,
        'debit_provider_spend',
        lambda *args, **kwargs: ProviderSpendGateResult(
            ok=False,
            status='blocked_insufficient_pipeline_credits',
            provider_key=service.PIPELINE_PROVIDER_KEY,
            workflow_key=service.PIPELINE_WORKFLOW_KEY,
            explanation='insufficient credits',
        ),
    )
    monkeypatch.setattr(
        service,
        '_twilio_start',
        lambda phone_e164: pytest.fail('provider must not be called'),
    )
    row_id = _new_row()

    with SessionLocal() as db:
        row = db.get(EntryPhoneVerification, row_id)
        with pytest.raises(service.PhoneVerificationServiceError) as exc_info:
            service.begin_live_phone_verification(db, row)
        assert exc_info.value.code == 'phone_pipeline_credit_blocked'
        assert row.provider_status == 'blocked_insufficient_pipeline_credits'
