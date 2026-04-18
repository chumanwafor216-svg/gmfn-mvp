from __future__ import annotations

import os
import hashlib
import json
from datetime import timedelta
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.identity_models import (
    DeviceFingerprint,
    IdentityCluster,
    IdentityRecoveryProfile,
    IdentityRiskSignal,
)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _utc_aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _meta_json(data: Optional[Dict[str, Any]]) -> Optional[str]:
    if not data:
        return None
    return json.dumps(data, ensure_ascii=False, sort_keys=True)


def _secret_salt() -> str:
    return str(os.getenv("GMFN_SECRET_KEY") or "gmfn-dev-secret").strip()


def _normalize_recovery_text(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _hash_recovery_answer(*, prompt: str, answer: str) -> str:
    normalized = f"{_normalize_recovery_text(prompt)}|{_normalize_recovery_text(answer)}|{_secret_salt()}"
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def compute_device_fingerprint(
    *,
    user_agent: str | None,
    ip_address: str | None,
    client_hint: str | None = None,
) -> str:
    raw = " | ".join(
        [
            str(user_agent or "").strip(),
            str(ip_address or "").strip(),
            str(client_hint or "").strip(),
        ]
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def record_device_fingerprint(
    db: Session,
    *,
    user_id: int,
    fingerprint_hash: str,
    user_agent: str | None,
    ip_address: str | None,
) -> DeviceFingerprint:
    existing = (
        db.query(DeviceFingerprint)
        .filter(DeviceFingerprint.user_id == int(user_id))
        .filter(DeviceFingerprint.fingerprint_hash == str(fingerprint_hash))
        .first()
    )

    if existing:
        existing.last_seen_at = _now_utc()
        if user_agent:
            existing.user_agent = user_agent
        if ip_address:
            existing.ip_address = ip_address
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    row = DeviceFingerprint(
        user_id=int(user_id),
        fingerprint_hash=str(fingerprint_hash),
        user_agent=user_agent,
        ip_address=ip_address,
        first_seen_at=_now_utc(),
        last_seen_at=_now_utc(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _create_risk_signal(
    db: Session,
    *,
    user_id: int,
    signal_type: str,
    severity: int,
    description: str,
    meta: Optional[Dict[str, Any]] = None,
) -> IdentityRiskSignal:
    row = IdentityRiskSignal(
        user_id=int(user_id),
        signal_type=str(signal_type),
        severity=int(severity),
        description=str(description),
        meta_json=_meta_json(meta),
        created_at=_now_utc(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _continuity_from_counts(
    *,
    device_count: int,
    signal_count: int,
    cluster_count: int,
    latest_signal_type: str | None = None,
    last_reverified_at: datetime | None = None,
    recovery_locked_until: datetime | None = None,
) -> Dict[str, Any]:
    latest = str(latest_signal_type or "").strip().lower()
    now = _now_utc()
    locked_until = _utc_aware(recovery_locked_until)
    recently_reverified = False

    if locked_until and locked_until > now:
        return {
            "status": "protected_lock",
            "score": 15,
            "reason": "Recovery challenge attempts failed too many times, so sensitive actions are paused for now.",
            "action": "Wait for the recovery lock to clear, then answer the private recovery prompts correctly before sensitive actions continue.",
        }

    verified_at = _utc_aware(last_reverified_at)
    if verified_at and verified_at >= now - timedelta(hours=24):
        recently_reverified = True

    if recently_reverified:
        if cluster_count >= 2:
            return {
                "status": "watch",
                "score": 68,
                "reason": "The owner passed the private recovery challenge recently, but the account still has multiple overlap signals that should remain under review.",
                "action": "Sensitive actions can continue carefully while the app keeps watching identity continuity.",
            }

        if cluster_count >= 1 or signal_count >= 2 or device_count >= 4:
            return {
                "status": "watch",
                "score": 78,
                "reason": "The owner passed the private recovery challenge recently, so continuity can continue while new signals remain under observation.",
                "action": "Use the app normally, but keep monitoring continuity until the device pattern settles again.",
            }

        return {
            "status": "trusted",
            "score": 100,
            "reason": "The owner passed the private recovery challenge recently and identity continuity is stable enough to continue.",
            "action": "Normal account use can continue.",
        }

    if cluster_count >= 2 or (cluster_count >= 1 and signal_count >= 3):
        return {
            "status": "protected_lock",
            "score": 20,
            "reason": "Multiple identity-overlap signals suggest this account may no longer be under stable owner control.",
            "action": "Sensitive actions should be paused until the owner re-verifies identity continuity.",
        }

    if cluster_count >= 1 or signal_count >= 2 or device_count >= 4:
        return {
            "status": "reverify_required",
            "score": 45,
            "reason": "Identity continuity has shifted enough that the app should ask the owner to confirm it is still them.",
            "action": "Require step-up verification before high-trust actions continue.",
        }

    if device_count >= 2 or latest in {"device_pattern_changed", "device_pattern_unstable"}:
        return {
            "status": "watch",
            "score": 70,
            "reason": "A new device pattern has appeared, but there is not yet enough evidence to block the account.",
            "action": "Keep monitoring identity continuity and be ready to ask for re-verification if changes continue.",
        }

    return {
        "status": "trusted",
        "score": 100,
        "reason": "Identity continuity currently looks stable from observed device use.",
        "action": "Normal account use can continue.",
    }


def _ensure_identity_cluster(
    db: Session,
    *,
    root_user_id: int,
    linked_user_id: int,
    reason: str,
    confidence: int,
) -> Optional[IdentityCluster]:
    if int(root_user_id) == int(linked_user_id):
        return None

    existing = (
        db.query(IdentityCluster)
        .filter(IdentityCluster.root_user_id == int(root_user_id))
        .filter(IdentityCluster.linked_user_id == int(linked_user_id))
        .first()
    )
    if existing:
        return existing

    row = IdentityCluster(
        root_user_id=int(root_user_id),
        linked_user_id=int(linked_user_id),
        reason=str(reason),
        confidence=int(confidence),
        created_at=_now_utc(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def detect_identity_overlap(
    db: Session,
    *,
    user_id: int,
    fingerprint_hash: str,
) -> Dict[str, Any]:
    others = (
        db.query(DeviceFingerprint)
        .filter(DeviceFingerprint.fingerprint_hash == str(fingerprint_hash))
        .filter(DeviceFingerprint.user_id != int(user_id))
        .order_by(DeviceFingerprint.user_id.asc())
        .all()
    )

    if not others:
        return {
            "matched": False,
            "matched_user_ids": [],
            "signals_created": 0,
            "clusters_created": 0,
        }

    matched_user_ids = sorted({int(x.user_id) for x in others})
    signals_created = 0
    clusters_created = 0

    for other_user_id in matched_user_ids:
        _create_risk_signal(
            db,
            user_id=int(user_id),
            signal_type="device_fingerprint_overlap",
            severity=6,
            description="Device fingerprint overlaps with another GMFN account.",
            meta={
                "matched_user_id": int(other_user_id),
                "fingerprint_hash": str(fingerprint_hash),
            },
        )
        signals_created += 1

        created = _ensure_identity_cluster(
            db,
            root_user_id=min(int(user_id), int(other_user_id)),
            linked_user_id=max(int(user_id), int(other_user_id)),
            reason="device_fingerprint_overlap",
            confidence=6,
        )
        if created:
            clusters_created += 1

    return {
        "matched": True,
        "matched_user_ids": matched_user_ids,
        "signals_created": signals_created,
        "clusters_created": clusters_created,
    }


def register_identity_observation(
    db: Session,
    *,
    user_id: int,
    user_agent: str | None,
    ip_address: str | None,
    client_hint: str | None = None,
) -> Dict[str, Any]:
    already_seen = (
        db.query(DeviceFingerprint)
        .filter(DeviceFingerprint.user_id == int(user_id))
        .filter(DeviceFingerprint.fingerprint_hash == compute_device_fingerprint(
            user_agent=user_agent,
            ip_address=ip_address,
            client_hint=client_hint,
        ))
        .first()
    )

    fingerprint_hash = compute_device_fingerprint(
        user_agent=user_agent,
        ip_address=ip_address,
        client_hint=client_hint,
    )

    record = record_device_fingerprint(
        db,
        user_id=int(user_id),
        fingerprint_hash=fingerprint_hash,
        user_agent=user_agent,
        ip_address=ip_address,
    )

    overlap = detect_identity_overlap(
        db,
        user_id=int(user_id),
        fingerprint_hash=fingerprint_hash,
    )

    device_count = (
        db.query(DeviceFingerprint)
        .filter(DeviceFingerprint.user_id == int(user_id))
        .count()
    )

    if not already_seen and device_count >= 2:
        _create_risk_signal(
            db,
            user_id=int(user_id),
            signal_type="device_pattern_changed",
            severity=3 if device_count == 2 else 5,
            description=(
                "A new device pattern started using this account. The owner may need to confirm identity continuity if changes continue."
            ),
            meta={
                "fingerprint_hash": fingerprint_hash,
                "device_count": device_count,
            },
        )

    signal_rows = (
        db.query(IdentityRiskSignal)
        .filter(IdentityRiskSignal.user_id == int(user_id))
        .order_by(IdentityRiskSignal.id.desc())
        .all()
    )
    cluster_rows = (
        db.query(IdentityCluster)
        .filter(
            (IdentityCluster.root_user_id == int(user_id))
            | (IdentityCluster.linked_user_id == int(user_id))
        )
        .order_by(IdentityCluster.id.desc())
        .all()
    )
    recovery_profile = (
        db.query(IdentityRecoveryProfile)
        .filter(IdentityRecoveryProfile.user_id == int(user_id))
        .first()
    )

    latest_signal_type = signal_rows[0].signal_type if signal_rows else None
    continuity = _continuity_from_counts(
        device_count=device_count,
        signal_count=len(signal_rows),
        cluster_count=len(cluster_rows),
        latest_signal_type=latest_signal_type,
        last_reverified_at=getattr(recovery_profile, "last_verified_at", None),
        recovery_locked_until=getattr(recovery_profile, "locked_until", None),
    )

    return {
        "ok": True,
        "user_id": int(user_id),
        "fingerprint_hash": fingerprint_hash,
        "device_record_id": int(record.id),
        "overlap": overlap,
        "continuity": continuity,
    }


def get_identity_risk_summary(
    db: Session,
    *,
    user_id: int,
) -> Dict[str, Any]:
    device_rows = (
        db.query(DeviceFingerprint)
        .filter(DeviceFingerprint.user_id == int(user_id))
        .order_by(DeviceFingerprint.id.desc())
        .all()
    )

    signal_rows = (
        db.query(IdentityRiskSignal)
        .filter(IdentityRiskSignal.user_id == int(user_id))
        .order_by(IdentityRiskSignal.id.desc())
        .all()
    )

    cluster_rows = (
        db.query(IdentityCluster)
        .filter(
            (IdentityCluster.root_user_id == int(user_id))
            | (IdentityCluster.linked_user_id == int(user_id))
        )
        .order_by(IdentityCluster.id.desc())
        .all()
    )
    recovery_profile = (
        db.query(IdentityRecoveryProfile)
        .filter(IdentityRecoveryProfile.user_id == int(user_id))
        .first()
    )

    latest_signal_type = signal_rows[0].signal_type if signal_rows else None
    continuity = _continuity_from_counts(
        device_count=len(device_rows),
        signal_count=len(signal_rows),
        cluster_count=len(cluster_rows),
        latest_signal_type=latest_signal_type,
        last_reverified_at=getattr(recovery_profile, "last_verified_at", None),
        recovery_locked_until=getattr(recovery_profile, "locked_until", None),
    )

    return {
        "user_id": int(user_id),
        "device_count": len(device_rows),
        "signal_count": len(signal_rows),
        "cluster_count": len(cluster_rows),
        "continuity": continuity,
        "recovery": {
            "configured": recovery_profile is not None,
            "last_verified_at": recovery_profile.last_verified_at.isoformat()
            if recovery_profile and recovery_profile.last_verified_at
            else None,
            "failed_attempts": int(recovery_profile.failed_attempts or 0)
            if recovery_profile
            else 0,
            "locked_until": recovery_profile.locked_until.isoformat()
            if recovery_profile and recovery_profile.locked_until
            else None,
            "prompts": [
                recovery_profile.prompt_one,
                recovery_profile.prompt_two,
                recovery_profile.prompt_three,
            ]
            if recovery_profile
            else [],
        },
        "devices": [
            {
                "id": int(r.id),
                "fingerprint_hash": str(r.fingerprint_hash),
                "ip_address": r.ip_address,
                "first_seen_at": r.first_seen_at.isoformat() if r.first_seen_at else None,
                "last_seen_at": r.last_seen_at.isoformat() if r.last_seen_at else None,
            }
            for r in device_rows
        ],
        "signals": [
            {
                "id": int(r.id),
                "signal_type": str(r.signal_type),
                "severity": int(r.severity),
                "description": str(r.description),
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "meta_json": r.meta_json,
            }
            for r in signal_rows
        ],
        "clusters": [
            {
                "id": int(r.id),
                "root_user_id": int(r.root_user_id),
                "linked_user_id": int(r.linked_user_id),
                "reason": str(r.reason),
                "confidence": int(r.confidence),
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in cluster_rows
        ],
    }


def list_identity_risks(
    db: Session,
    *,
    limit: int = 100,
) -> Dict[str, Any]:
    rows = (
        db.query(IdentityRiskSignal)
        .order_by(IdentityRiskSignal.id.desc())
        .limit(int(max(1, min(limit, 500))))
        .all()
    )

    return {
        "items": [
            {
                "id": int(r.id),
                "user_id": int(r.user_id),
                "signal_type": str(r.signal_type),
                "severity": int(r.severity),
                "description": str(r.description),
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "meta_json": r.meta_json,
            }
            for r in rows
        ],
        "total": len(rows),
    }


def get_identity_recovery_summary(db: Session, *, user_id: int) -> Dict[str, Any]:
    profile = (
        db.query(IdentityRecoveryProfile)
        .filter(IdentityRecoveryProfile.user_id == int(user_id))
        .first()
    )
    now = _now_utc()
    locked_until = _utc_aware(profile.locked_until) if profile else None

    return {
        "configured": profile is not None,
        "prompts": [
            profile.prompt_one,
            profile.prompt_two,
            profile.prompt_three,
        ]
        if profile
        else [],
        "last_verified_at": profile.last_verified_at.isoformat()
        if profile and profile.last_verified_at
        else None,
        "failed_attempts": int(profile.failed_attempts or 0) if profile else 0,
        "locked_until": locked_until.isoformat() if locked_until else None,
        "locked": bool(locked_until and locked_until > now),
    }


def upsert_identity_recovery_profile(
    db: Session,
    *,
    user_id: int,
    prompts_and_answers: List[Dict[str, str]],
) -> Dict[str, Any]:
    if len(prompts_and_answers) != 3:
        raise ValueError("Exactly three recovery prompts are required.")

    cleaned: List[Dict[str, str]] = []
    for item in prompts_and_answers:
        prompt = str(item.get("prompt") or "").strip()
        answer = str(item.get("answer") or "").strip()
        if len(prompt) < 4 or len(answer) < 2:
            raise ValueError("Each recovery prompt and answer must be filled.")
        cleaned.append(
            {
                "prompt": prompt,
                "hash": _hash_recovery_answer(prompt=prompt, answer=answer),
            }
        )

    profile = (
        db.query(IdentityRecoveryProfile)
        .filter(IdentityRecoveryProfile.user_id == int(user_id))
        .first()
    )
    now = _now_utc()

    if profile is None:
        profile = IdentityRecoveryProfile(
            user_id=int(user_id),
            prompt_one=cleaned[0]["prompt"],
            answer_hash_one=cleaned[0]["hash"],
            prompt_two=cleaned[1]["prompt"],
            answer_hash_two=cleaned[1]["hash"],
            prompt_three=cleaned[2]["prompt"],
            answer_hash_three=cleaned[2]["hash"],
            configured_at=now,
            updated_at=now,
            failed_attempts=0,
            locked_until=None,
        )
        db.add(profile)
    else:
        profile.prompt_one = cleaned[0]["prompt"]
        profile.answer_hash_one = cleaned[0]["hash"]
        profile.prompt_two = cleaned[1]["prompt"]
        profile.answer_hash_two = cleaned[1]["hash"]
        profile.prompt_three = cleaned[2]["prompt"]
        profile.answer_hash_three = cleaned[2]["hash"]
        profile.updated_at = now
        profile.failed_attempts = 0
        profile.locked_until = None
        db.add(profile)

    db.commit()
    db.refresh(profile)

    _create_risk_signal(
        db,
        user_id=int(user_id),
        signal_type="recovery_challenge_configured",
        severity=1,
        description="Private recovery challenge prompts were configured for account protection.",
        meta={"configured_at": profile.configured_at.isoformat() if profile.configured_at else None},
    )

    return get_identity_recovery_summary(db, user_id=int(user_id))


def verify_identity_recovery_profile(
    db: Session,
    *,
    user_id: int,
    answers: List[str],
) -> Dict[str, Any]:
    if len(answers) != 3:
        raise ValueError("Exactly three recovery answers are required.")

    profile = (
        db.query(IdentityRecoveryProfile)
        .filter(IdentityRecoveryProfile.user_id == int(user_id))
        .first()
    )
    if profile is None:
        raise LookupError("Recovery challenge is not configured yet.")

    now = _now_utc()
    locked_until = _utc_aware(profile.locked_until)
    if locked_until and locked_until > now:
        raise PermissionError("Recovery challenge is temporarily locked. Try again after the lock clears.")

    expected = [
        _hash_recovery_answer(prompt=profile.prompt_one, answer=answers[0]),
        _hash_recovery_answer(prompt=profile.prompt_two, answer=answers[1]),
        _hash_recovery_answer(prompt=profile.prompt_three, answer=answers[2]),
    ]

    matches = (
        expected[0] == profile.answer_hash_one
        and expected[1] == profile.answer_hash_two
        and expected[2] == profile.answer_hash_three
    )

    if matches:
        profile.last_verified_at = now
        profile.failed_attempts = 0
        profile.locked_until = None
        profile.updated_at = now
        db.add(profile)
        db.commit()
        db.refresh(profile)

        _create_risk_signal(
            db,
            user_id=int(user_id),
            signal_type="recovery_challenge_passed",
            severity=1,
            description="The owner passed the private recovery challenge and restored identity continuity review.",
            meta={"verified_at": now.isoformat()},
        )

        return {
            "ok": True,
            "verified": True,
            "summary": get_identity_risk_summary(db, user_id=int(user_id)),
            "recovery": get_identity_recovery_summary(db, user_id=int(user_id)),
        }

    profile.failed_attempts = int(profile.failed_attempts or 0) + 1
    profile.updated_at = now
    if profile.failed_attempts >= 3:
        profile.locked_until = now + timedelta(minutes=30)
    db.add(profile)
    db.commit()
    db.refresh(profile)

    _create_risk_signal(
        db,
        user_id=int(user_id),
        signal_type="recovery_challenge_failed",
        severity=6 if profile.locked_until else 4,
        description="Private recovery challenge answers did not match the configured protection prompts.",
        meta={
            "failed_attempts": int(profile.failed_attempts or 0),
            "locked_until": profile.locked_until.isoformat() if profile.locked_until else None,
        },
    )

    return {
        "ok": False,
        "verified": False,
        "summary": get_identity_risk_summary(db, user_id=int(user_id)),
        "recovery": get_identity_recovery_summary(db, user_id=int(user_id)),
    }
