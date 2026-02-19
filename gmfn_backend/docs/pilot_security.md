# GMFN Pilot Security Notes (MVP)

## Scope
These controls cover the MVP pilot where GMFN is:
- Non-custodial (GMFN does not hold funds)
- Deterministic trust (trust derived from TrustEvent ledger)
- TrustSlip used as trust-backed authorization to release goods

## Key Security Principles
1) **Fail closed for public verification**
- Public verify endpoints must not leak identity or loan history.
- If a dependency (e.g., signing secret) is missing, do not issue public tokens.

2) **Minimal disclosure**
Public merchant verification returns:
- code
- status / effective_status
- trust_limit (string)
- currency
- expires_at
- verified_at
No:
- emails (except masked if required)
- loan IDs
- TrustEvents list
- internal trust score breakdown

3) **Rate limiting**
Public endpoints are throttled to reduce:
- brute force code guessing
- accidental hammering from poor network retry loops
- bot abuse

MVP implementation:
- in-memory per-IP per-route sliding window
- default 30 requests per 60 seconds

## TrustSlip Lifecycle Controls
Admin-only actions:
- revoke
- freeze
- unfreeze
- extend expiry
- release logging (pilot)

Each action logs a TrustEvent with meta fields for auditability.

## Threat Model (MVP)
### 1) Guessing TrustSlip codes
Mitigation:
- codes should be long/unpredictable (token-like)
- rate limiting on public verify endpoints

### 2) Replay / stale screenshots
Mitigation:
- verify responses include verified_at
- merchant can re-check quickly via lite page or code
- status and expiry enforced at verify time

### 3) Unauthorized “release” logging
Mitigation:
- admin-only in MVP
- later: merchant tokens / signed authorization

## What is NOT in MVP
- Custody or payment processing
- Auto-debiting guarantors
- Strong cryptographic signing for third parties (optional future)
- Production-grade distributed rate limiting (Redis)

## Operational Checklist (Pilot)
- Confirm public verify endpoints are rate limited
- Confirm /trust-slips/verify/{code} is minimal disclosure
- Confirm admin actions emit TrustEvents with meta.reason/meta.note where available
- Confirm evidence pack meta includes pack_id, based_on_event_at, checksum