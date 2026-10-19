# GSN Phone Verification Provider Decision

Date: 2026-10-19
Status: Implemented locally; live provider activation deliberately disabled

## Decision

GSN uses one shared provider-neutral phone-verification service with Twilio
Verify as the first adapter. Public entry and signed-in identity completion use
the same service, audit fields, Pipeline Credit gate, resend limit, check limit,
and fail-closed error contract.

Live delivery is not inferred from configuration or from creating a local
verification row. The API may say a code was accepted for SMS delivery only
after Twilio returns a verification receipt. The API may record phone ownership
only after Twilio returns an approved verification check.

## Safety boundaries

- Live delivery is disabled unless `GSN_PHONE_VERIFICATION_ENABLED=1`.
- Every provider start, including resend, must pass and debit the
  `phone.sms_or_verify.delivery` Pipeline Credit gate before the outbound call.
- Provider failure after debit remains an audited paid attempt; it is not
  rewritten as a successful send and is not silently refunded.
- Live OTP values are never generated or stored by GSN.
- New preview codes are stored only as an HMAC digest. Legacy plaintext preview
  rows remain confirmable until they expire.
- Preview codes are controlled-testing evidence, not proof of SMS delivery.
- A signed-in start stores the candidate number only on its verification row.
  It does not overwrite the member's existing phone or verified timestamp.
- Signed-in rows bind to `owner_user_id`; legacy rows fall back to the existing
  email ownership check.
- Provider responses are reduced to non-secret receipt/status fields. Phone
  numbers, credentials, account identifiers, and raw provider error messages
  are not stored in the response snapshot.
- Resend is limited by cooldown, per-session sends, and a per-phone time window.
  Code checks are limited per session.

## Data and audit record

`entry_phone_verifications` records:

- keyed preview-code digest where applicable;
- provider adapter key and verification receipt ID;
- provider status and sanitized response snapshot;
- safe provider error code;
- send/check attempt counters and timestamps;
- the Pipeline Credit ledger-entry ID for the latest paid send;
- the signed-in owner user ID.

This is an audit extension of the existing verification session, not a second
identity engine.

## Activation sequence

1. Configure Twilio credentials and Verify Service SID in Render.
2. Configure the Pipeline Credit account and per-send cost.
3. Enable payment operations and the phone-provider kill switch.
4. Confirm `/system/diagnostics/api-readiness` reports
   `phone.sms_or_verify: live_ready`.
5. Use a controlled phone number to test start, wrong code, resend cooldown,
   correct code, provider outage, and insufficient-credit behavior.
6. Only then change `GMFN_ENTRY_PHONE_DELIVERY` from
   `registration-only` to `sms`.

## Rejected alternatives

- Local OTP plus an SMS transport was rejected for the first live rail because
  it would retain verification secrets and duplicate provider attempt controls.
- Reporting `pending-sms` without a provider receipt was rejected because it
  makes the interface lie about delivery.
- Attaching a candidate number at start was rejected because a previously
  verified member could appear verified on a number they had not proved.
- Enabling production preview mode was rejected as the default because visible
  preview codes cannot prove phone possession.

## Remaining operational truth

The implementation is provider-capable, but production is not live until real
Twilio credentials, a Verify Service, Pipeline Credits, payment-operations
permission, and a controlled-number test are all present. Repository tests mock
the provider; they do not prove Twilio account approval, sender reachability,
country coverage, billing, or live handset delivery.
