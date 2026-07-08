# GSN Web Push Production Runbook

## Purpose

GSN Web Push is an additive delivery rail for important GSN notifications.
It does not replace GSN notification records, Community Governance, Trust
Events, WhatsApp contact actions, or any Trust Infrastructure logic.

Current first batch:

- `community.notice.posted`
- `community_domain.notice.posted`

These are official board notice notifications only.

## Generate VAPID Keys

Generate keys outside source control:

```powershell
python gmfn_backend\tools\generate_vapid_keys.py
```

The command prints:

- `GSN_WEB_PUSH_PUBLIC_KEY`
- `GSN_WEB_PUSH_PRIVATE_KEY`
- `GSN_WEB_PUSH_SUBJECT`

Do not commit the generated values.

## Configure Backend Environment

Set these in Render or the backend runtime secret store:

```text
GSN_WEB_PUSH_PUBLIC_KEY=...
GSN_WEB_PUSH_PRIVATE_KEY=...
GSN_WEB_PUSH_SUBJECT=mailto:support@globalmutualfundsnetwork.com
```

Aliases are also supported:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

The backend also needs the updated dependency:

```text
pywebpush
```

## Deploy Requirements

Before calling Web Push live:

1. Backend deploy must succeed.
2. Database migration `20260708_add_web_push_subscriptions` must apply.
3. Frontend deploy must include the updated service worker.
4. `/web-push/status` must return `configured: true`.
5. A signed-in member must enable GSN system notifications and grant browser permission.

Local readiness audit:

```powershell
npm --prefix frontend run audit:web-push-production-readiness
```

## Verify Status

Authenticated check:

```text
GET /web-push/status
```

Expected configured response after secrets are present:

```json
{
  "ok": true,
  "supported": true,
  "configured": true,
  "public_key": "...",
  "sender_available": true,
  "allowed_kinds": [
    "community.notice.posted",
    "community_domain.notice.posted"
  ]
}
```

If `configured` is `false`, do not claim live phone push.

## User Opt-In Flow

Users must enable system notifications from the Companion settings surface.
The frontend then:

1. requests browser notification permission;
2. waits for the active service worker;
3. subscribes through `PushManager`;
4. registers the subscription with GSN.

If the user disables system notifications, the current device subscription is
unregistered best-effort.

## Truth Boundary

Web Push can wake supported browsers/PWAs after permission is granted.
It is still controlled by browser, operating-system, battery/background rules,
PWA install state, and device settings.

GSN preserves the notification meaning.
Web Push carries the alert.
WhatsApp carries the conversation.

## Do Not Expand Casually

Do not add more notification kinds to Web Push without an explicit product
decision and test/audit update. More push does not automatically mean better
trust; noisy push can reduce user confidence.
