# GSN Account Lifecycle Capability Audit - 2026-10-27

Status: repository evidence audit only. No user, membership, community, shop,
authentication, permission, schema or deletion behavior was changed.

## Unabated conclusion

GSN cannot currently suspend, close or delete a platform user account.

The repository has several narrower lifecycle operations, but they are not
equivalent to platform-account control:

- an ordinary Community can be made active, dormant or closed;
- a Community Domain can be made active, suspended or closed;
- an ordinary Community membership can be soft-removed with `left_at`;
- a Community Domain membership can be active, inactive, suspended or
  archived;
- products can be hidden/restored or permanently deleted through their own
  product contract;
- a shop can be deactivated only as a side effect of platform-admin pilot-data
  cleanup; there is no normal shop lifecycle endpoint or owner control.

Calling any one of those actions "account suspension" would be false. A person
removed from one community can still authenticate and use other GSN contexts.

## Confirmed capability map

| Subject | Existing state/action | Authority | Reversible? | Evidence preserved? | Important gap |
|---|---|---|---|---|---|
| Platform user / GSN identity | No lifecycle field, route or UI | None | Not applicable | Existing records remain because no operation exists | Authentication cannot enforce suspension or closure |
| Ordinary Community | `active`, `dormant`, `closed` through `POST /admin/community-lifecycle` | Platform admin only | Yes, back to `active` | Name, memberships and Trust Events are preserved | No member notice or appeal workflow is attached |
| Community Domain | `active`, `suspended`, `closed` through `POST /admin/community-domain-lifecycle` | Platform admin only | Yes, back to `active` | Name and history are preserved | This is explicitly not a global user ban; no notice/appeal workflow is attached |
| Ordinary Community membership | `DELETE /clans/{clan_id}/members/{user_id}` sets `left_at` | Active community admin | Yes through shared membership reactivation logic | Membership row remains | Route records no reason, Trust Event or notification; direct admin re-add does not use the reactivation helper |
| Community Domain membership | PATCH status or DELETE-to-`inactive` | Domain admin or directly delegated member-approval authority | Yes through PATCH to `active` | Membership row and prior Trust Events remain | Note text is not stored in the lifecycle event; no subject notification or appeal |
| Shop | No normal suspend/close/delete lifecycle route | None for lifecycle; platform-admin pilot cleanup can set `is_active=false` | No normal restore contract found | Shop row remains during pilot cleanup | Owner cannot intentionally pause/reactivate a shop through a defined lifecycle |
| Product | Soft hide/restore and a separate permanent-delete workflow | Shop owner within existing product rules | Soft hide is reversible; permanent delete is not | Depends on action | Product deletion must not be reused as account closure |

## Platform-user account truth

### Data model

`gmfn_backend/app/db/models.py::User` has identity, role, phone, profile,
merchant-visibility, pool and trust fields. It has no:

- account status;
- suspension or closure timestamp;
- lifecycle reason code;
- lifecycle actor;
- reactivation state;
- deletion/anonymisation state;
- token/session version.

The pending-activation password sentinel is onboarding state, not an account
lifecycle contract, and must not be repurposed as suspension.

### Authentication

`gmfn_backend/app/core/auth.py::get_current_user` decodes the JWT, looks up the
user by email or GSN ID, and returns the row. It checks no lifecycle state.
Login and password-recovery reset can issue access tokens without an account
lifecycle check because no such state exists.

Tokens are signed JWTs with a default 60-minute expiry. There is no token
blacklist or session-revocation table. However, protected requests already load
the user from the database, so a future lifecycle check in `get_current_user`
could block an already-issued token immediately without first building a new
session engine.

### Frontend

The profile/settings surface provides settings and official GSN links, but no
close, suspend, delete or closure-request control. Frontend `logout()` clears
local credentials only; it is not server-side account closure or token
revocation.

## Existing narrower operations

### Ordinary Community lifecycle

`POST /admin/community-lifecycle`:

- is platform-admin only;
- supports preview before execution;
- requires explicit confirmation and a reviewer note of at least 12
  characters;
- records `community.lifecycle_changed` as a zero-delta Trust Event;
- blocks normal operation/member-home visibility for dormant/closed states;
- preserves name, memberships and history;
- explicitly does not remove members, transfer ownership or globally ban the
  owner;
- can restore the Community to `active`.

This is a sound organisation-lifecycle boundary, not a user-account boundary.

### Community Domain lifecycle

`POST /admin/community-domain-lifecycle`:

- is platform-admin only;
- supports preview before execution;
- requires explicit confirmation and a reviewer note;
- records `community_domain.lifecycle_changed` as a zero-delta Trust Event;
- supports `active`, `suspended` and `closed`;
- keeps the domain name reserved and preserves history;
- explicitly does not delete the domain or globally ban the owner;
- creates no payment instruction;
- can restore the domain to `active`.

### Ordinary Community membership removal

`DELETE /clans/{clan_id}/members/{user_id}`:

- requires an active Community admin;
- refuses to remove the final admin;
- sets `ClanMembership.left_at` instead of deleting the row;
- removes the membership from active-member queries.

The shared `ensure_membership()` helper can reactivate an archived membership
by clearing `left_at`. Join approval uses that helper. The direct admin
`POST /clans/{clan_id}/members` route does not: it checks only for an active
row and then attempts to insert a new row even though `(clan_id, user_id)` is
unique. That is a confirmed re-add consistency risk.

This removal route records no reason, Trust Event, member notification, appeal
route or explicit recovery instructions.

### Community Domain membership lifecycle

`PATCH /community-domains/{domain_id}/members/{user_id}/status` supports
`active`, `inactive`, `suspended` and `archived`.
`DELETE /community-domains/{domain_id}/members/{user_id}` is a compatibility
action that sets the same record to `inactive`; it does not delete it.

The operation:

- requires domain-admin scope or a direct member-approval delegation;
- protects the recorded owner from deactivation;
- protects the final owner/admin authority;
- records a zero-delta `community_domain_member_status_changed` Trust Event;
- stops public active-member verification when the status is not active;
- retains the user, ordinary Community membership, historic Trust Events and
  governance history;
- can reactivate the same membership.

The frontend owner/admin roster already exposes Deactivate/Reactivate and uses
the existing status APIs. The supplied status note is reduced to
`status_note_present: true/false` in the Trust Event; the actual reason text is
not retained. No notification or appeal is created for the affected member.

### Shop lifecycle

`PATCH /marketplace/shops/{shop_id}` updates shop identity/contact/media but
does not accept an active/suspended/closed lifecycle value. Public reads filter
on `MarketplaceShop.is_active`, but there is no owner-facing pause/reactivate
contract. Platform-admin pilot-data cleanup can set shops and products
inactive, scrub public fields and expire broadcasts while preserving audit
history. That specialised cleanup must not be presented as normal shop or user
closure.

## Notice, appeal and recovery truth

The authenticated Support Desk and notification infrastructure exist, but none
of the lifecycle operations above creates an appeal case or lifecycle notice.
The Support Desk itself is under `/app` and its backend routes require
`get_current_user`. If platform suspension begins rejecting authenticated
requests, the suspended person cannot rely on that authenticated surface to
appeal. A narrow pre-auth recovery/appeal path, or another explicitly governed
contact route, must be designed before suspension is shipped.

## Evidence and retention boundaries

The repository already contains TrustSlip, Trust Events, transactions,
protected trade, lending/support, payment, Spotlight, shop, notification and
support-case records tied to user identity. No reviewed cascade/anonymisation
policy was found for closing or deleting a platform user.

Therefore:

- suspension should block use, not erase records;
- closure must not be implemented as deletion;
- account closure must define public visibility and future activity for Shop,
  Spotlight, TrustSlip and merchant status;
- financial, trust, moderation, support and audit evidence must not be
  hard-deleted merely because a member asks to leave;
- legal erasure/anonymisation and mandatory retention require a separate
  reviewed policy before any irreversible implementation.

## Smallest safe next implementation proposal

Do not build closure or deletion first. The smallest defensible first slice is
platform-admin suspension/reactivation only:

1. Add an explicit user lifecycle state with `active` and `suspended`; reserve
   `closed` until closure policy is approved. Keep onboarding-pending separate.
2. Store suspension time, reason code, restricted operator note, acting admin,
   and reactivation time/actor. Do not expose the private operator note on
   public trust surfaces.
3. Add a platform-admin preview/execute endpoint with explicit confirmation,
   minimum reason, impact snapshot and idempotent reactivation.
4. Enforce status in `get_current_user` so existing tokens stop authorising
   requests, and enforce it at login, password recovery, activation and every
   other token-issuing path.
5. Keep identity, memberships, Trust Events, transactions, support history and
   audit evidence. Define separately whether public Shop, Spotlight, TrustSlip
   and merchant surfaces are hidden, labelled or frozen during suspension.
6. Create a notice that states what happened, why in safe language, duration
   if known, and the first recovery step.
7. Provide an appeal/recovery route that remains usable without an active app
   session.
8. Test current-token rejection, login rejection, password-reset rejection,
   reactivation, platform-admin-only authority, non-disclosure of private
   notes, public-surface behavior and preserved evidence.

Only after that slice is proven should GSN design:

- voluntary user closure/request-to-close;
- administrative closure distinct from suspension;
- cooling-off and cancellation rules;
- ownership transfer for communities/domains/shops;
- public-identity and TrustSlip consequences;
- retention, export, anonymisation and legal-erasure handling;
- irreversible deletion, if any defensible case remains.

## Decision required before implementation

The product owner must confirm that the immediate target is **platform-user
suspension/reactivation**, not ordinary membership removal, Community closure,
Community Domain closure or Shop pause. Those are different subjects with
different authorities and consequences.
