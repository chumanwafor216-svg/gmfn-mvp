# GSN SMS / GSM Fallback Decision Note

Date: 2026-07-09  
Purpose: Decide whether GSN should add paid SMS fallback alongside browser Web
Push.

## Unabated truth

GSN already has the free Web Push path live:

- settings surface: `/app/my-gmfn-and-i?tab=settings`;
- user action: `Test phone notification`;
- backend route: `POST /web-push/test`;
- deployed app commit: `f9099772 Add phone notification self test`.

That is not GSM/SMS. It depends on browser permission, phone operating-system
notification settings, and a successful push subscription.

SMS/GSM fallback would be a separate paid provider integration. It cannot be
fully switched on without a provider account, credentials, sender setup, and
phone-number consent rules.

## Current SMS price reference

Source checked: Twilio official pricing pages on 2026-07-09.

United Kingdom:

- outbound SMS to mobile numbers: about USD 0.056 per segment;
- inbound SMS: about USD 0.0075 per segment;
- clean local number: about USD 1.15 per month;
- clean mobile number: about USD 2.50 per month;
- alphanumeric sender ID: listed as free where supported.

Source:

`https://www.twilio.com/en-us/sms/pricing/gb`

Nigeria:

- outbound SMS using international numbers: about USD 0.3868 per segment;
- outbound SMS using alphanumeric sender ID: about USD 0.3868 per segment;
- international prefix number: starting at about USD 1.15 per month;
- alphanumeric sender ID: listed as free, with domestic/alphanumeric discounts
  requiring sales contact.

Source:

`https://www.twilio.com/en-us/sms/pricing/ng`

Important pricing cautions:

- SMS is charged per segment, not always per visible message.
- Long messages, emojis, some punctuation, and Unicode characters can increase
  segment count.
- Provider prices can change without notice.
- Carrier fees, failed-message processing fees, VAT/tax, sender registration,
  and compliance costs may apply.
- These figures are not a quote. They are a planning reference.

## Practical monthly examples

These are rough examples using outbound SMS only and assuming one segment per
message.

### UK-heavy pilot

| Monthly SMS messages | Rough SMS cost |
| --- | ---: |
| 100 | USD 5.60 |
| 500 | USD 28.00 |
| 1,000 | USD 56.00 |
| 5,000 | USD 280.00 |

Add the monthly sender/number cost where needed.

### Nigeria-heavy pilot

| Monthly SMS messages | Rough SMS cost |
| --- | ---: |
| 100 | USD 38.68 |
| 500 | USD 193.40 |
| 1,000 | USD 386.80 |
| 5,000 | USD 1,934.00 |

This is the hard truth: Nigeria SMS fallback is too expensive for casual
high-volume notifications unless there is a cheaper domestic route or a strict
critical-alert-only policy.

## Recommendation

Do not replace Web Push with SMS.

Use this ladder:

1. Web Push first.
2. In-app notification centre second.
3. Email for slower non-urgent summaries.
4. SMS only for critical alerts or failed Web Push cases.

## What SMS should be allowed to send

Start narrow.

Allowed first use cases:

- sign-in or account-security verification;
- urgent community approval or rejection outcome;
- urgent money/security warning;
- critical owner/admin action where delay creates real harm;
- fallback for users who explicitly opt in after Web Push fails.

Not allowed at first:

- every chat message;
- marketplace browsing updates;
- general promotional messages;
- repeated nudges;
- non-critical social activity;
- investor/customer-discovery updates.

## Consent and safety rules

SMS must be opt-in.

Before sending SMS, GSN should store:

- phone number;
- country code;
- consent timestamp;
- consent source;
- message category consented to;
- opt-out status;
- last successful delivery;
- failed-delivery count.

Every non-authentication SMS should support opt-out language where legally
required.

GSN must not send financial, private, or sensitive community details by SMS.
SMS should point the user back into the app.

Example:

`GSN: You have an urgent community update. Open GSN to review it.`

Avoid:

`Your loan was rejected by [person/community] because...`

## Implementation shape

Add this only after the provider account is ready.

Backend:

- create a provider-neutral `sms_service`;
- start with Twilio behind the interface;
- store provider message id, status, cost estimate, destination country, and
  failure reason;
- rate-limit per user, per phone number, and per event type;
- log SMS events without storing sensitive message bodies where avoidable;
- add admin kill switch:
  `GSN_SMS_ENABLED=false`;
- add category allowlist:
  `GSN_SMS_ALLOWED_KINDS=security,critical_notice`;
- add spending guard:
  `GSN_SMS_DAILY_LIMIT_USD`.

Frontend:

- add phone consent management in protected settings;
- show Web Push as the recommended free option;
- show SMS fallback only as optional paid/critical fallback;
- explain that SMS can cost the service money and should be reserved for
  important alerts.

Environment variables:

- `GSN_SMS_ENABLED`;
- `GSN_SMS_PROVIDER`;
- `GSN_SMS_ACCOUNT_SID`;
- `GSN_SMS_AUTH_TOKEN`;
- `GSN_SMS_FROM_NUMBER`;
- `GSN_SMS_ALLOWED_KINDS`;
- `GSN_SMS_DAILY_LIMIT_USD`.

Never commit these credentials.

## First build milestone

The first SMS implementation should not send production SMS automatically.

Milestone 1 should be:

- provider-neutral SMS service;
- dry-run mode;
- one admin/test endpoint;
- one signed-in-user consent record;
- one test SMS button visible only when SMS is configured;
- audit that blocks broad notification kinds;
- unit tests proving SMS cannot send without opt-in and allowlisted event type.

Milestone 2 can add critical production use cases.

## Devil's advocate

SMS makes the app feel more reliable, but it also introduces cost, compliance,
spam risk, support burden, and privacy risk.

The worst version of this is sending every ordinary notification by SMS. That
would burn money, annoy users, and make GSN look less trusted.

The best version is quiet:

- Web Push handles normal alerts;
- the notification centre remains the source of truth;
- SMS is reserved for critical moments where missing the message genuinely
  matters.

Do not add SMS until the first real pilot proves which alerts are critical
enough to justify paying for them.
