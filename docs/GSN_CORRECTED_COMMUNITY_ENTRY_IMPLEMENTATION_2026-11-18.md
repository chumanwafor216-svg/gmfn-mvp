# GSN corrected community entry implementation

Date: 2026-11-18

## Status

Implemented and locally verified. Not deployed by this work session. The new Alembic migration has not been applied to production by this session.

## Confirmed product behavior

GSN now has two separate ways to enter an existing community:

1. Invitation entry remains on the existing invite routes and still uses invite policy snapshots.
2. Search-based entry is a dedicated, opt-in community capability. It does not create or consume an invite and it targets the stable community ID.

New admission configurations expose only:

- instant admission; or
- community voting, with an optional admin override action.

The historical standalone `admin_approval` value remains readable and executable for communities already storing it. A legacy community may keep that value unchanged. New transitions into standalone admin approval are rejected; owners should migrate to community voting with admin override when ready. No existing legacy row is silently reinterpreted.

## Backend routes

- `GET /clans/join-search`
  - public-safe lookup;
  - only returns active communities with explicit `search_join_enabled=true`;
  - returns community ID, public community code, name, short description, and admission explanation;
  - does not return owner contact or private membership data.
- `GET /clans/join-search/{community_id}`
  - public-safe stable-ID continuation for an opted-in community.
- `POST /clans/search-join-requests`
  - dedicated search-source request;
  - requires an authenticated active GSN identity or a current verified-phone session;
  - records `request_source=search` plus immutable admission-mode and override snapshots;
  - uses the existing `ClanJoinRequest`, vote, approval, activation, membership, notification, and status machinery.
- `GET/PATCH /clans/{community_id}/search-join-settings`
  - separate opt-in and policy from invitation admission.
- `POST /entry/identity/establish`
  - establishes the personal GSN identity and GSN ID before community creation;
  - uses a client-held identity request key for safe activation-token rotation on retry.
- `POST /entry/identity/community`
  - requires an active signed-in identity;
  - creates the complete community and founder membership together;
  - uses a unique creation request key for idempotent retries.

## Frontend routes

- `/join` uses the new find-select-verify-ask journey.
- `/join/community/:clanId` resolves the opted-in community by stable ID.
- `/join/:code`, `/start/join/:code`, `/start/invite/:code`, `/invite/:code`, and `/get-invite/:code` still use the existing invitation journey.
- `/create` uses identity first, secure account activation second, and community setup third.
- The pre-creation community step contains only the community name and short
  description. Invitation and search-admission settings are not shown in the
  Create Community journey; creation uses the safe defaults of instant valid
  invitation entry, search discovery off, and community vote as the stored
  search policy for later opt-in.
- `/activate-membership` accepts a protected `next_path` state value and returns identity-first founders to `/create?stage=community` after activation.

## Data migration

Migration: `20261118_corrected_community_entry`

New community fields:

- `search_join_enabled` defaults to false, preserving privacy for every existing community;
- `search_join_admission_mode` defaults to `community_vote`;
- `search_join_admin_override` defaults to false;
- `creation_request_key` is nullable and unique for retry-safe new creation.

New join-request fields:

- `request_source` defaults to `invite` so historical rows preserve their origin safely;
- `admission_mode_snapshot` is nullable for historical rows;
- `admin_override_snapshot` defaults to false.

New phone-session field:

- `identity_request_key` is nullable and unique, so only the browser holding the key can rotate an unfinished identity-first activation handoff.

Historical join requests with no snapshot continue through the existing invite/community fallback logic. New invitation and search requests always write snapshots.

## Security and concurrency

- Public search is explicit opt-in and active-community only.
- Search-based new applicants must prove phone ownership; an unverified or consumed phone session is rejected before identity or request writes.
- Existing phone identities are not disclosed through public search entry and must sign in.
- Search request rate limits are keyed by client IP and community.
- Community creation is protected by a database-unique request key and a unique community name.
- Identity establishment rotates unfinished activation grants only when the same verified session and private request key are presented.
- GSN IDs are not assigned to pending search applicants until approval through the shared approval service.
- Approval and rejection now lock and re-read the join request before mutation. A stale vote or admin override cannot replace an already-final outcome; database uniqueness still prevents duplicate identities, active memberships, votes, activation grants, and community creation keys.

Devil's-advocate limitation: the current rate limiter is in-memory and per process. It is suitable for the present pilot but is not a distributed production control. A multi-instance rollout should move these public buckets to Redis or another shared store before claiming strong global rate limiting.

## Verification completed

- `29 passed` across corrected-entry, legacy entry, instant and reviewed invites, invalid-invite rejection, identity reuse, activation security, vote, and admin-override focused backend tests.
- Search-entry acceptance coverage directly verifies disabled-community direct submission, instant admission, standard vote approval, rejection, stable-ID selection between similar community names, authorized and unauthorized overrides, final-decision idempotency, and override audit evidence containing actor, decision, reason, and timestamp.
- Identity-first coverage verifies identity persistence before any community exists, wrong resume-key rejection, stale-token revocation, GSN-ID binding, activation replay rejection, identity survival after a failed community save, and idempotent community creation.
- Existing-identity coverage verifies the same GSN ID is reused for search admission and later community creation.
- `npm run build` passed.
- `npm run audit:membership-admission-policy` passed.
- `npm run audit:entry-flow-polish` passed.
- `npm run smoke:invitation-journey-review` passed, confirming invitation compatibility.
- `npm run smoke:corrected-community-entry-pixel` passed both new journeys in Chromium using the Pixel 5 profile.
- Pixel evidence is in `frontend/screenshots/corrected-community-entry-pixel/`.
- The production build passed with 328 transformed modules.

The three baseline screenshots were manually reviewed through exported review copies. They clearly prove the selected-community form, pending-review explanation, and GSN ID before community setup. Because they did not show the search result list itself, the smoke added only 00-find-community-results.png; that additional state was also manually reviewed.

Release-preparation evidence, current Render topology, PostgreSQL execution blocker, migration rehearsal, and recovery distinctions are recorded in docs/GSN_CORRECTED_COMMUNITY_ENTRY_RELEASE_CANDIDATE_2026-11-18.md.

## Rollout order

1. Revoke any exposed pilot/browser credentials before deployment.
2. Back up the production database.
3. Apply `20261118_corrected_community_entry` while the old frontend is still compatible.
4. Deploy backend routes.
5. Verify invite preview, invite submission, pending status, approval, and activation on the deployed backend.
6. Deploy frontend routes.
7. Enable search entry on one pilot community with community voting and no override.
8. Verify search privacy, request notification, voting, approval, activation, and duplicate-request handling.
9. Enable additional communities deliberately; do not bulk opt in.
10. Migrate legacy `admin_approval` communities only with owner agreement to `community_vote` plus override.

## Rollback

The frontend can be rolled back independently because invitation endpoints and legacy `/entry/create` remain available. If backend rollback is required, first disable search opt-in for pilot communities, then roll back application code. Avoid dropping the new columns until all new request and creation rows have been exported or confirmed disposable; column removal would discard source/snapshot and idempotency evidence.
