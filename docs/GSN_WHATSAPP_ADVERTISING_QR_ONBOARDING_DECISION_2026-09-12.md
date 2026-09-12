# GSN WhatsApp Advertising and QR Onboarding Decision - 2026-09-12

## Current Decision

The current product direction is to separate WhatsApp and GSN clearly.

WhatsApp should remain the informal conversation and promotion channel. GSN should be the official place for community value: announcements, dues records, shops, assistance requests, membership identity, verification, meeting records, grant-ready summaries, Spotlight, and other structured community work.

This supersedes the broad WhatsApp Bridge mental model as the primary adoption strategy. WhatsApp can still advertise GSN, but it should not become a workflow bridge that makes GSN feel like a WhatsApp add-on.

## Operating Line

Use this sentence as the working doctrine:

```text
Keep conversation in WhatsApp. Keep community value in GSN.
```

Practical rule:

- WhatsApp may announce that official community work is now in GSN.
- WhatsApp may carry a community QR code or simple join link.
- WhatsApp should not carry the full official workflow when that workflow is supposed to build GSN adoption.
- Replies, dues, shops, assistance requests, official records, verification, and member value should live in GSN.

## Why This Direction Was Chosen

The owner prefers slower early adoption if it creates a stronger long-term platform identity. The risk of the bridge-first model is that members compare GSN to WhatsApp and treat GSN as inferior, optional, or only useful when a WhatsApp link sends them there.

The stronger long-term model is to make GSN a distinct official system. Executives adopt it because it makes administration easier. Members adopt it because their practical community benefits are inside it.

## Two-Sided Adoption Message

For executives and community owners, GSN should emphasize:

- simpler official announcements;
- cleaner member management;
- dues/payment tracking or records;
- meeting summaries and evidence trails;
- grant-readiness and structured reports;
- membership ID and verification support;
- orderly assistance requests;
- marketplace/shop visibility under community governance;
- reduced loss of important information inside chat.

For ordinary members, GSN should emphasize:

- official notices that do not disappear in chat;
- personal shop/product/service visibility;
- assistance requests through a proper channel;
- dues and participation records;
- membership identity;
- access to opportunities and community value;
- being recognized as an active member, not only a phone number in WhatsApp.

## QR Onboarding Concept

Every community should be able to generate its own GSN QR code.

When a person scans the QR code, GSN should already know which community they are trying to enter. The user should not need to search for the organization or start from a generic signup page.

The intended first experience:

1. Scan the community QR code.
2. Land on a community-branded GSN entry page, for example `Join Pillar of Hope on GSN`.
3. Enter phone number.
4. Verify with OTP or another simple code.
5. Confirm name and minimal profile details.
6. Request membership or accept invitation.
7. Enter GSN with a progressive profile-completion journey.

For people with older phones or difficulty scanning QR codes, provide a short community join link with the same behavior.

The QR policy selected by the executive should be recorded on the invite itself, included in generated invite/share text, and shown again when the executive reviews join requests. The URL can carry a readable policy hint, but the backend-owned invite record is the safer source once the scan is loaded.

## Technical Truth Boundary

A QR code cannot silently install a normal native app on a user's phone. iOS and Android require user consent for installing apps or adding web apps to the home screen.

The honest target is:

```text
Scan QR -> open GSN web/PWA or installed app -> enter the correct community onboarding flow immediately.
```

Native app install, Add to Home Screen, or deeper app setup can come after the user has already seen value.

## Approval Versus Verification

Approval and verification must remain separate.

Approval means the community allows the person into the GSN community space or accepts a membership request. For an NGO or open organization, the executive may approve many people because the organization wants reach and participation.

Verification means the community confirms that the person is truly a known, recognized, or evidence-backed member. Verification may require records, membership history, dues history, identity checks, sponsorship, or executive confirmation.

Important distinction:

- A person may have the GSN app without being a member.
- A person may request to join without being approved.
- A person may be approved into a community without being fully verified.
- A verified member has stronger community-backed standing than a merely approved member.

This is especially important for community QR codes, because QR codes can be shared beyond the intended audience.

## Suggested QR Access Levels

Public community QR:

- good for NGOs, posters, meetings, WhatsApp adverts, and open recruitment;
- creates a join request or light community entry;
- does not automatically prove membership.

Known-member invite QR:

- good for existing member lists;
- can use phone-number matching or invite token checks;
- may allow faster approval if the number is already recognized.

Private/event QR:

- good for meeting attendance, check-in, or event-specific action;
- should not grant broad community authority.

Admin QR:

- high risk;
- should not be used casually for privileged access.

## Implementation Ideas To Revisit

When this discussion resumes, explore:

- community owner screen for `Invite Members`;
- generate QR code per community;
- copy short join link;
- download/print QR poster;
- copy WhatsApp announcement text that advertises GSN without making WhatsApp the workflow;
- scan/join analytics: scanned, started, joined, pending, approved, verified, profile completed;
- fast phone/OTP entry for invited or QR-origin users;
- progressive profile completion after entry;
- approval queue separate from verification queue;
- public/community/private QR types;
- old-phone fallback link.


## WhatsApp Bridge Repurposing

The old broad WhatsApp Bridge idea is not the main adoption model for existing
community membership. Its better use is public promotion and creation entry.

Allowed broad WhatsApp/advertising uses:

- invite someone to create their own GSN community;
- invite an executive to set up a Community Domain;
- share a public shop link or shop QR code;
- share a public Spotlight/shop/notice/public-record link where the source GSN
  feature intentionally created that public link;
- advertise that a community now uses GSN without letting WhatsApp carry the
  full official workflow.

Existing community joining remains controlled:

- join by community QR code;
- join by short community invite link;
- join by pre-approved list or admin approval where configured;
- no generic WhatsApp bridge page should grant existing-community membership.

This gives GSN two separate adoption doors:

1. Create/adopt GSN: public advertising may route a new owner or executive to
   create a community or Community Domain.
2. Join an existing community: QR/invite/member approval routes the person into
   that specific community's onboarding policy.

Individual shops and public items can also have their own QR/link. A shop QR
should land on that shop, not on a broad bridge page. A notice QR should land on
that notice. A public verification QR should land on that public record.

## Current Product Boundary

This is a strategy and product-decision note only. It does not by itself change backend routes, frontend screens, QR generation, invite tokens, verification rules, app install behavior, or the existing deployed WhatsApp Bridge route.

Future implementation should inspect the existing invite, join existing community, Community Domain, Community Home, approval, verification, and member activation flows before changing code.

## Devil Truth

The clean separation strategy may start slower. It will only win if GSN owns real value that WhatsApp does not own. If executives continue to place the full official value inside WhatsApp, members will stay in WhatsApp and GSN will feel optional.

The adoption work is therefore not only technical. Executives must be given an easy way to bring members in, and members must immediately see what they gain by being inside GSN.

## QR policy presets added to community QR packaging

The first implementation now lets an executive choose the language policy attached to a community QR pack before sharing it:

- `Open NGO / church growth` - broad access request first, later verification when benefits or trust decisions require it.
- `Reviewed community access` - ordinary association path where an executive reviews before activation.
- `Strict school / professional body` - stricter evidence-before-entry positioning.
- `Marketplace dues / permit access` - market/trade positioning where dues, stall, shop, permit, or organiser checks may apply.

The first version was display-only policy packaging. The current implementation now persists the selected policy on the invite record, but pre-approved lists, auto-approval, dues gates, and template-specific enforcement remain future work.

## QR policy travels in scan links

The QR generator now appends a harmless `qr_policy` query parameter to community QR links. The join landing page reads recognized policy values and shows the matching policy card to the person scanning:

- `open_growth`
- `reviewed_access`
- `strict_entry`
- `market_access`

This makes the executive-facing QR pack and scanner-facing landing page tell the same story. Unknown or missing policy values are ignored, so existing invite links keep the normal generic access boundary.

The selected policy is now persisted on the invite record when the QR pack is generated, but it still does not change approval thresholds, pre-approved lists, dues checks, marketplace permits, or verification requirements.

## QR policy persisted on invite records

The implementation has now moved one step beyond display-only query strings. A community QR pack can ask the backend to stamp the selected QR policy onto the `clan_invites` record as `qr_policy_key`.

The scan landing page still accepts the visible `qr_policy` query value as a fallback for old links, but when invite preview data is available it should prefer the server-owned `qr_policy_key`. That matters because a query parameter can be edited by anyone, while the invite row is created by an authenticated community member.

Current persisted policy keys:

- `open_growth`
- `reviewed_access`
- `strict_entry`
- `market_access`

This is still not full enforcement. The policy key records and displays the intended access model. It does not yet create automatic approval, pre-approved member matching, dues gates, permit checks, or evidence-before-entry rules by itself.
