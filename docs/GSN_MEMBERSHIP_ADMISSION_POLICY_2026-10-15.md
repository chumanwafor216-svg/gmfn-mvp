# GSN Membership Admission Policy

Date: 2026-10-15

## Decision

Membership admission is a system-level community rule, not a Sachimo-only
exception.

Every community has one admission mode:

1. instant_invite
   - the recipient opens a valid invitation, supplies the minimum identity
     details, accepts it, and becomes a member immediately;
   - a new person receives a GSN ID and sets a password before entering the
     community;
   - an existing GSN identity enters with the same identity;
   - each generated instant invitation is single-use.
2. admin_approval
   - the recipient submits the same short join form;
   - one authorised community admin accepts or rejects the request.
3. community_vote
   - the recipient submits the short join form;
   - eligible activated members vote using the existing approval threshold;
   - an admin may bypass the remaining votes only when
     voting_admin_override was explicitly enabled.

## Defaults and compatibility

- Newly created ordinary communities default to instant_invite.
- A founder may choose admin approval during community creation.
- Existing communities with no saved admission mode remain on the legacy
  reviewed/community-vote behaviour.
- Existing invite rows with no admission snapshot remain legacy reviewed links.
- New invite rows snapshot the community mode and override setting.
- Changing the saved community policy retires all active links. A fresh link is
  required after the change.

## Truth boundary

Admission creates community membership only.

It does not:

- verify government identity documents;
- approve or verify money, dues, balances, permits, or credit;
- endorse conduct;
- create a trust score or trusted status;
- grant unrelated Community Domain permissions.

Accepted members count in the community membership total immediately, including
new members who still need to set their password. Member payloads distinguish
password_setup_needed from completed account setup.

## Routes

- GET /clans/{clan_id}/admission-policy
- PATCH /clans/{clan_id}/admission-policy
- POST /clans/{clan_id}/invite
- GET /clans/{clan_id}/invite-link
- POST /clans/join-requests
- POST /clans/{clan_id}/join-requests/{request_id}/admin-approve
- legacy pilot-approve remains as a compatibility alias
- POST /auth/activate-membership

## UI

The existing Membership Joining / Join Requests page contains one compact
How people join control with the three modes. Only Community Vote reveals the
optional admin-override checkbox.

The public invite page uses:

- Accept invite for instant admission;
- Request access for admin approval or community vote.

After password activation, the member is signed in and taken directly to the
joined Community Home.
