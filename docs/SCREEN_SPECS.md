# Screen Specs

## CoverPage

Purpose:
Create emotional trust and entry.

Must show:
- GSN mark
- Shield / star emblem
- Global Support Network
- Trust made visible for stronger communities.
- Trust Infrastructure Protocol card
- Continue button
- About GSN & I button
- Secure / Verified / Global badges

Must not show:
- bottom navigation
- sign-in fields
- registration form
- dashboard content

Primary action:

```text
Continue
```

## WelcomeGuidePage

Purpose:
Explain what the user will find.

Must show:
- GSN
- What you will find
- Simple steps. Strong foundation.
- Identity First
- Community Home
- Marketplace Access
- Shop Control
- Trust Events
- Insights
- You are in good hands card
- Continue button
- Already a member? Sign in

Must not show:
- bottom navigation
- community form
- marketplace feed
- dashboard blocks

Primary action:

```text
Continue
```

## PWA Home-Screen Install

Purpose:
Let people who receive GSN links in WhatsApp or another conversation keep GSN
reachable from the phone home screen.

Must show:
- Keep GSN on this phone
- one clear install/setup action
- simple emoji-assisted phone steps when the browser cannot show a native
  install prompt

Rules:
- The app may request browser-supported install only after the user taps the
  install action.
- Do not claim GSN can silently place itself on the phone screen.
- Pilot safety note: because Android Play Protect can block browser-generated
  WebAPK installs outside this repo with an old-target-SDK warning, the current
  web build must not actively trigger the native Android app-install prompt.
  Use browser home-screen/bookmark steps until a verified Android package or
  WebAPK-safe path exists.
- The phone-screen shortcut should open the public entry at
  `/cover?source=pwa` first. Cover then continues to Welcome. If a valid signed-in
  session is already present, the normal public-entry guard may carry the member
  onward to the authenticated app instead of trapping them on entry screens.
- Cover and Welcome must remain free to view for ordinary public browsing, but
  they must not trap signed-in PWA users away from the real app shell.
- The prompt must not show competing install buttons. Use one clear button that
  opens three short manual steps.
- Do not cache private API responses or uploaded user data in the service
  worker.
- The prompt may appear on Welcome, Sign In, Public Shop, invite/public access,
  and other entry surfaces where people commonly arrive from shared links.
- The prompt must stay compact, must not replace the main page action, and must
  disappear when GSN is already running from a home-screen install.
- On iPhone/iPad, do not promise the Android native install prompt. If the user
  may be inside WhatsApp, explain the Safari path: open in Safari, tap Share,
  then Add to Home Screen.
- Public My GSN and I should use a one-column iPhone layout so capability cards
  read one-by-one instead of compressing text into two narrow columns. This
  iPhone correction must not change the existing Android compact grid.
- The phone-screen icon should use the balanced shield/star emblem without tiny
  internal top lettering and without an oversized bottom wordmark inside the
  icon. The visible phone label below the icon may remain `GSN`.
- iPhone home-screen installs must use a dedicated `180x180` Apple touch icon
  with a quiet navy safe zone around the gold border and shield/star emblem.
  Do not point `apple-touch-icon` at a cropped or edge-to-edge manifest icon.
- Android and other phone home-screen shortcuts should use the same navy tile,
  outer gold ring, and shield/star composition as the Apple touch icon. Do not
  give Android a separate manifest SVG or maskable icon that can drop the outer
  ring or make the shortcut look like a different GSN logo.
- If an existing iPhone home-screen shortcut still shows an old cropped or
  blank icon, the prompt may explain that iOS caches icons and the user should
  remove the old shortcut and add GSN again. When this recurs after a verified
  artwork fix, mint a fresh Apple touch icon filename instead of relying on
  iOS to re-fetch the same URL.

## DashboardPage

Purpose:
Personal landing page across trust, attention, commitments, events, and next actions.

Must show:
- Identity Passport hero
- dashboard profile picture frame
- Picture frame control
- picture tools: Upload, Change, Remove
- Trust / CCI / TrustSlip status row
- GSN Global ID card with shield mark, centered permanent identity copy, and visible ID
- Market Wisdom presentation

Frozen:
- Market Wisdom presentation and interaction model

Rules:
- Passport picture frame tools must sit under one visible Frame tools button.
- Frame tools must tap open and tap closed, then reveal Upload, Change, and Remove.
- Upload and Change must open the active file picker from the visible passport block.
- Opening/closing picture frame tools must not add/remove layout height; the tool rail opens as an anchored overlay near its trigger and must not leave a blank reserved gap when closed.
- The dashboard passport frame and large picture frame must use separate open states; tapping one frame button must not open or resize the other frame rail.
- Frame buttons must sit in fixed-height slots with no transition-driven movement.
- Frame button slots and picture-tool buttons must opt out of shrink, wrapping, and transition movement.
- Picture tool rails must be anchored to their own frame button wrapper, not to the whole card.
- Remove must clear the saved account profile picture, not only hide it locally.
- Dashboard must stay a reflector / command centre, not a content dump.

## Mobile Task Page Rule

All authenticated mobile task pages must follow
`docs/GSN_MOBILE_UI_PROTOCOL.md`.

Rules:
- one phone screen should present one decision;
- the current state and next action should be visible without scrolling
  whenever possible;
- short facts should use chips or two-column mini cards;
- raw URLs, logs, policy text, repeated explanation, and admin-only controls
  should be collapsed by default;
- long processes should show only the current step expanded.

## AuthGatewayPage

Purpose:
Choose existing member or new member.

Must show:
- GSN
- Welcome
- Choose how you want to continue.
- Existing member card
- Sign in button
- New member card
- Sign up button
- note: After registration or approval, you will return here and sign in as an existing member.

Primary actions:
- Sign in
- Sign up

Rules:
- Existing users go to SignInPage.
- New users go to SignUpChoicePage.

## SignInPage

Purpose:
Existing member login.

Must show:
- GSN
- Welcome back
- Sign in to continue where you left off.
- Phone number or email field
- Verification code field
- Send code action
- Continue button
- Open sign-in help
- Start a new community link
- Request to join a community link
- privacy note

Must not show:
- bottom navigation
- dashboard content

Primary action:

```text
Continue
```

## SignUpChoicePage

Purpose:
New member chooses starting path.

Must show:
- GSN
- New member sign up
- Choose your starting path.
- Create community card
- Join request membership card
- Purchase Community Domain card
- information note: Once your setup or join request is completed, you will sign in from the Existing Member page.

Primary actions:
- Start community
- Request to join
- Purchase Community Domain

Rules:
- Create community goes to StartCommunityPage.
- Request to join goes to JoinRequestMembershipPage.
- Purchase Community Domain goes to CommunityDomainPurchasePage.
- Purchase Community Domain is a separate institutional path and must not be
  merged into ordinary Create Community.
- After successful completion, user returns to SignInPage.

## CommunityDomainPurchasePage

Purpose:
Let an organization owner start the paid institutional Community Domain path
without confusing it with ordinary free community creation.

Must show:
- GSN / Community Domain identity
- short difference between `Create Community` and `Purchase Community Domain`
- organization name
- requested domain name
- society type/template choice such as school, church, union, market,
  cooperative, town union, NGO, health body, or generic association
- domain name availability result
- package or quote state
- payment-instruction state when that rail exists
- pending activation state after payment instruction is generated
- clear path back to `Create Community` for users who only need a lightweight
  social community
- clear sign-in or existing-member recovery when purchase requires an
  authenticated owner
- clear path for a signed-in returning owner/member to open their Community
  Domain dashboard selector

Rules:
- This screen is an entry/provisioning screen, not the operating dashboard.
- It must not show bottom navigation before authentication is complete.
- `Purchase Community Domain` must not create a live verified institution by
  itself. A draft, quote, or payment instruction is not activation.
- Do not call the object `Community Package`. The owned institutional object is
  `Community Domain`; the paid bundle may be called a package only when talking
  about pricing, allowance, or renewal.
- Do not say `Verified Community Domain` unless backend status proves the
  stronger verification state.
- Domain availability checks must use the domain name/code, not display-name
  similarity.
- Payment instruction generation must be separated from payment confirmation
  and domain activation.
- If the payment or activation rail is not available yet, the action must say
  what is missing instead of pretending the owner can finish purchase.
- Keep the first screen calm: one main action, compact facts, and deeper package
  details behind a chooser or collapsed section.

Primary action:

```text
Check domain name
```

## StartCommunityPage

Purpose:
Create a new community as founder/starter.

Must show:
- 3-step wizard
- Step 1: Your details
- Step 2: Community setup
- Step 3: Founder trust level / optional verification choices

Rules:
- Only one step expanded at a time.
- Future steps collapsed or clearly marked optional.
- User completes Step 1 before Step 2.
- User may create the community after Step 2 once phone registration or phone
  verification is attached to the entry.
- Step 3 is optional at the front door and should explain that stronger checks
  such as bank/wallet, driver licence, passport/selfie, NIN, or other regional
  IDs can raise founder assurance later without blocking basic community setup.
- Passport/selfie evidence may be recorded as photo identity-continuity
  evidence before a live provider is connected. The UI must not claim provider
  verification until an actual provider or review decision exists.
- After Step 3, show CommunityCreatedPage.
- Then return to SignInPage or allow Open Community Home after sign-in.

## JoinRequestMembershipPage

Purpose:
Request membership in an existing community.

Must show:
- invite code or community code input
- requester details
- reason / short note
- submit request button
- privacy and approval note

After submission:
- show JoinRequestSubmittedPage
- tell user they must sign in as existing member after approval or completion

## CommunityHomePage

Purpose:
Overview of selected community.

Must show:
- Community identity hero
- Holder count
- GSN ID status
- Marketplace communities count
- Money across communities
- What do you want to do next?
- Choose marketplace community
- Enter marketplace
- Create marketplace community
- Join marketplace community
- Grow circle
- Your Community Marketplaces compact row
  - row title
  - marketplace count
  - opens to a simple marketplace-community list
  - each opened community item shows community name, marketplace workspace context, and Open Marketplace
- Community Domains summary row
  - clearly separated from community marketplaces
  - opens the institutional Community Domain dashboard
- compact rows:
  - Owner Actions
  - Owner Shop Control
  - Marketplace Capacity
  - Vault Control
  - Free Spotlight
  - Spotlight Subscription
  - Grow Trusted Circle
  - Owner Spotlight Status

Rules:
- Community Home is an overview page, not a full content dump.
- Do not expose all owner tools on this page.
- Create marketplace community must appear here as one compact action only.
- The full create-community process belongs in the StartCommunityPage 3-step wizard.
- Owner Shop Control must stay a separate page, not an expanded panel inside Community Home.
- Owner Spotlight Status on Community Home must be current-member scoped. It may show the signed-in member's own live spotlight status/preview for the selected community, but it must not render another member's spotlight media on the member's personal Community Home.
- Community/public spotlight reflection belongs on public/reflection surfaces such as Dashboard, Public Shop, and Marketplace-facing spotlight areas, not inside another member's Owner Spotlight Status panel.
- If the signed-in member has no active spotlight, show a compact owner status/shortcut.
- Secondary sections must be collapsed, grouped, or represented as compact rows.
- Do not show numerical strength, interaction density, community finance standing, or trust-in-community metric boxes on Community Home. Move those readings to a deeper community readings surface.
- Do not expose long owner, spotlight, trusted-circle, or shop-control manuals inside Community Home.

Role states to support:
- Holder / Owner
- Member
- Visitor
- Pending identity user
- Verified identity user
- Community admin
- Shop owner
- Marketplace participant

Owner-only rows:
- Owner Actions
- Owner Shop Control
- Vault Control
- Free Spotlight
- Spotlight Subscription
- Grow Trusted Circle
- Owner Spotlight Status

Empty states to support:
- no community yet
- one community selected
- multiple communities
- GSN ID pending
- GSN ID verified
- shop not created
- shop active
- spotlight inactive
- spotlight live
- paid spotlight expired
- no trusted circle yet

Deferred deeper surfaces:
- Owner Command Centre / Community Regiment page for deeper owner-side structure.
- Trust Calendar / Event Timeline placement under Trust Events, What Matters Now, Notifications, or Focus Commitments.

## CommunityDomainDashboardPage

Purpose:
Operate a purchased or provisioned institutional Community Domain after the
domain exists.

Must show:
- Community Domain identity hero
- domain name/code, display name, owner, status, verification state, and renewal
  state as compact facts
- one primary next action based on current state, such as complete activation,
  add structure, invite members, review pending action, or renew package
- compact structure preview showing root node and first branches/departments
- compact member and role summary
- compact governance/action-review summary
- compact module status rows for Shops, Spotlight, Vault, Verification,
  Trust Centre, Analytics, Billing, and Settings
- clear route back to Dashboard or Community Home
- empty states for draft, pending activation, active, expired, suspended, and
  closed domains

Rules:
- This page is the institutional operating surface. It must not replace
  CommunityHomePage, which remains the lightweight selected-community home.
- The first screen must not expose every lane at once. Follow the guided
  work-surface rule: one identity hero, one main action, compact status rows,
  and one opened lane at a time.
- A branch, campus, parish, line, class, committee, ROSCA circle, or welfare
  group should normally be represented as a `CommunityNode` or activity group,
  not a separate domain, unless it needs separate billing, public identity, or
  high autonomy.
- Marketplace is optional for non-market institutions, but economic activity
  must remain possible where real life needs it: approved vendors, member shops,
  ROSCA, welfare, fundraising, jobs, services, and trusted procurement.
- Governance actions must use scoped roles and policies. A node admin should
  see only the work their role can handle.
- `needs_changes` reviews are requester follow-up, not pending reviewer work.
- Payment, package quote, and renewal status must not be shown as verification.
- Expired or suspended domains may keep readable history for authorized users,
  but paid operating actions should explain the renewal or suspension blocker.
- Public-safe information must stay separate from private member lists, node
  membership, finance records, evidence attachments, and action-review details.
- Do not label the domain verified unless backend verification status proves it.
- Do not expose legal, payment, loan, or transaction authority beyond what the
  backend route and policy state actually allow.

Primary action:

```text
Continue setup
```

## MarketplacePage

Purpose:
Operate one selected community/marketplace.

Must show:
- selected community / marketplace identity
- current member context inside that marketplace
- compact community trust front desk before the work lanes, using existing
  safe facts such as Community ID, local trust, trust evidence count, visible
  members, visible shops, and active support records
- no more than four primary work lanes first:
  - Money Pool
  - ROSCA
  - Support Request
  - Trade Evidence
- compact trust/status signal for this marketplace
- a clear way to return to Community Home or Dashboard

Rules:
- Marketplace is the operational nucleus for one selected community, not a
  dumping ground for every finance, trust, shop, support, demand, and link tool
  at once.
- The first screen must act as a guided front desk.
- Trust context must appear before operational choices so the page reads as
  community trust infrastructure, not generic commerce.
- The trust front desk should use safe wording such as `recorded community
  context`, not `verified community context`, unless the selected community has
  an explicit protected-domain verification state.
- Open only one major lane as the main visible work area at a time.
- When a lane opens, unrelated lanes must visually step back until the user
  finishes, pauses, or returns to the lane chooser.
- Money Pool, ROSCA, Support Request, and Trade Evidence must be stabilized
  lane-by-lane, with outside launcher, target section/hash/open state, inner
  buttons, fields, copy, and pictograms audited before moving to the next lane.
- ROSCA cycles must be named and member-scoped. Do not assume every community
  member belongs to every ROSCA cycle. A marketplace may contain multiple ROSCA
  cycles with different contribution amounts, currencies, and frequencies.
- ROSCA cycle membership must be selected from the current community membership
  list. Cycle alerts and reminders should target selected cycle members, not the
  whole community by default.
- Cumulative Finance belongs to Finance. Full Trust Passport evidence belongs
  to Trust Passport. Shop editing belongs to Shop Control. Marketplace may link
  or summarize those areas but should not expose their full internal workload.
- Use stable real-life pictograms or deterministic SVG marks. Do not use weak
  emoji-style marks for core marketplace lanes.

## FinancePage

Purpose:
Show the member's cumulative money story and permitted finance records across
communities.

Must show:
- plain finance summary first
- major finance lanes such as Money Summary, Money In, Money Out, Banking
  Rails, Records / Events, and Signals / Readiness
- Secondary route tools such as Payout Details and Trust Passport may remain
  visible only as compact linked tools, not as competing major Finance lanes.
- clear route back to the originating marketplace or Dashboard

Rules:
- Finance must guide the user through one money lane at a time.
- Do not expose every route, event table, signal, and payment tool as equal
  first-screen choices.
- Marketplace-local finance may be summarized when the user arrived from a
  selected marketplace, but the full one-community operating lane remains
  Marketplace-owned.
- Deep finance records and secondary tools should appear only after the user
  opens the relevant lane.

## TrustPassportPage

Purpose:
Show the member's fuller trust/evidence story across communities.

Must show:
- current trust standing first
- major trust lanes such as Evidence Story, Community Confirmation, Finance
  Discipline, Documents / TrustSlip, and Repair or Next Step
- clear route back to the originating marketplace, Community Home, or Dashboard

Rules:
- Trust Passport must guide one trust lane at a time.
- Do not expose the whole evidence universe, every document route, every trust
  event, and every explanation layer at once.
- TrustSlip is the portable current-evidence layer. Trust Passport is the fuller story.
  Keep those responsibilities distinct.
- Trust Passport may summarize community-scoped activity evidence from the
  TrustSlip community context inside the Community Confirmation lane: count,
  broad category labels, and latest activity date only.
- When Trust Passport has both a usable Community ID/key and member GSN ID/key,
  the Community Confirmation lane may link to `CommunityMemberVerifyPage` as
  `Open member credential`.
- Copied Trust Passport snapshots may include the member credential link only
  when that link can be built from usable keys.
- The member credential link is supporting public evidence only. It must not
  replace the full Trust Passport story, TrustSlip verification, or live
  community confirmation.
- Community activity evidence is context for judgement. It must not be
  presented as a guarantee, credit approval, universal trust score, or evidence
  that every claim is true.
- Trust Passport Finance Discipline must label visible trust amounts as
  `trust limit signal` or equivalent evidence language, not as an approved
  limit.
- Marketplace-local trust may be summarized when the user arrived from one
  marketplace, but the full carried trust story belongs here.
- Identity Overview is the first One-Screen Snapshot Protocol application. It
  must fit its title, four identity facts, six compact status signals, and the
  public community record action inside one 390x844 phone snapshot without
  tall warning cards or decorative height.
- Identity Overview must keep the member photo unobstructed, dock any trust
  seal away from the face/evidence image, and include a direct `Complete ID
  checks` path when the snapshot is showing unfinished identity requirements.
- `Complete ID checks` must open real completion paths or a compact chooser
  that says which missing evidence can be completed now. It must not route to a
  general identity-explanation page while implying phone, community, bank, or
  official-ID checks can be finished there.
- Identity Overview should behave as a portable official package: screenshot,
  print, or PDF framing must not require visible pieces of the previous or next
  Trust Passport section to make sense.

Current pre-redesign Trust Passport section mapping:
- Current Trust Standing: Identity Overview, Current trust verdict, and What
  this reading says.
- Evidence Story: Why this reading looks like this, Why did my trust change?,
  and Evidence & institutional context.
- Community Confirmation: public community record and confirmation readiness.
- Finance Discipline: finance-discipline question, trust limit signal, guarantee
  capacity, locked guarantees, overexposure ratio, and risk context.
- Documents / TrustSlip: TrustSlip status, open TrustSlip, verify, copy,
  export, and document readiness controls.
- Repair or Next Step: next-step guidance, Action Inbox route, and pressure-note
  review.

This mapping is a source-cage before visual redesign. It does not permit Trust
Passport to remain a long stacked document once the lane replacement work
begins.

## IdentityIntegrityPage

Purpose:
Guide a signed-in member through identity status, missing evidence, and continuity
repair without turning the page into a long explanation document.

Must show:
- compact identity header with unobstructed photo/initials
- GSN ID, selected community, continuity state, and TrustSlip state as short
  SVG-led facts
- evidence tasks for Phone, Community, Bank / Wallet, Passport / ID, and Recovery
- one active evidence task with a clear action or explicit route-pending response
- deeper readings, recovery form, reasons, timeline, and trust-document family
  material below the front package or behind collapses

Rules:
- Use the mobile task protocol: short state first, next action first, details
  later.
- Use SVG pictograms from the app icon system for core identity tasks.
- Do not use a large photo hero or long paragraph before the user sees current
  status and next action.
- Do not send a completion task to an explanation-only page while implying the
  missing evidence can be completed there.
- If a signed-in completion route does not exist yet, say so plainly in the
  active task response.

## CommunityConfirmationPolicyPage

Purpose:
Let community admins decide who may answer live community confirmation requests
and manage parent-domain affiliation acknowledgement for the selected community.
It also supports limited member-witness records for active members.

Must show:
- selected community identity
- policy switches for controlled confirmation requests
- compact Community ID Domain affiliation lane
- compact domain-affiliation meaning strip that separates Community ID anchor,
  pending request, and acknowledged affiliate meaning
- compact external-registration evidence panel for admin-side supporting
  records
- compact Member witness records lane
- parent Community ID input for affiliate requests
- CAC/company-registration type, issuing body, reference, registered name, and
  note inputs for recording supporting evidence
- safe external-registration evidence history showing fingerprint/presence
  only, not raw reference or raw registered-name text
- incoming affiliate requests for this parent domain
- acknowledge, reject, and revoke actions only where the request status allows them
- active member selector for checking witness strength
- compact member-witness meaning strip that separates pending request, witness
  response, and public credential evidence
- clear action for the signed-in verifier to stand for a selected active member
- clear action for the signed-in member to ask a selected active member to stand for them
- witness-request response lane when the page is opened with a member witness request token
- one-time witness code input for recording a response or decline
- QR response package after a request is created
- share response package action, with copy response link and one-time code actions
- copy public member credential link action when the selected member has a GSN ID
- witness strength count, label, renewal status, validity date, and withdraw action where
  backend permissions allow it
- eligible response pool
- privacy rule

Rules:
- Community ID Domain affiliation must use Community ID/code, not display name,
  as the record anchor.
- A pending affiliation request must not be shown as public evidence.
- Acknowledged affiliation means the parent community has accepted the group as
  an affiliate under that parent domain. It does not verify every person, shop,
  line, or subgroup inside the affiliate.
- Domain-affiliation copy must not imply that display-name similarity proves
  parent-community authority. Community ID/code is the record anchor.
- External registration evidence is supporting review context only. It must
  not be described as GSN verification, current leadership evidence, community
  consent, shop ownership, member belonging, or public Community ID ownership.
- External registration history must show safe record facts such as evidence
  fingerprint, date, type, and presence flags. It must not expose raw CAC
  reference text or raw registered-name text in the generic admin policy panel.
- Member witness record means an active signed-in member stands for
  another active member inside this community. It does not prove parent-domain
  affiliation and it does not prove paid protected-domain ownership.
- A member witness request lets a member nominate one active member as verifier.
  The assigned verifier must open the request link and enter the one-time code
  before GSN records the witness.
- Creating a member witness request is not itself evidence. It is only a
  pending ask until the assigned verifier responds.
- Witness response is one member-backed evidence event. It must not be framed
  as evidence of every shop, payment, loan, parent-domain affiliation, or legal
  responsibility claim.
- The QR response package opens the signed-in response lane only. It is not a
  public credential, public evidence, or reusable verifier code.
- Member witness renewal status is derived from the witness validity clock. An
  expired witness confirmation must not keep making a member look currently
  established.
- The member witness lane may show aggregate strength and private admin-side
  witness records, but public evidence surfaces must not expose verifier names.
- This page must not add payment, domain-purchase, personal identity,
  assisted field-agent capture, annual renewal prompts, weighted verifier
  scoring, or dispute logic until those contracts exist in backend and tests.
- Keep Community Home free from this deeper admin workload.

## CommunityConfirmationOutcomePage

Purpose:
Public result paper for a live or completed community confirmation request.

Must show:
- community being asked
- Community ID/code when available
- member public GSN reference when available
- request reason and risk level
- aggregate community response counts
- simple reading
- reader decision note
- public reading that separates the community response, unconfirmed private or
  transaction claims, and the next safe action
- public result link return channel
- QR that reopens the same public outcome link
- link to the public member credential when both Community ID/key and public
  GSN member reference are available
- refresh outcome action
- copy public link action
- print / save PDF action
- clear limitations

Rules:
- This is a public verification screen and must not show bottom navigation.
- The route must be anchored by the public confirmation token.
- The QR must reopen the same public outcome page. It must not create a new
  verification state or imply that the request is complete.
- The member credential link is supporting evidence only. It must not replace the
  live/community confirmation outcome.
- This page shows aggregate response evidence only. It must not expose private
  responder contacts, verifier names, internal subject database IDs, phone
  numbers, email addresses, shop details, payment records, or credit approval.
- The public reading must not convert response evidence into a payment
  instruction, credit approval, bank guarantee, or private investigation report.
- The result is evidence for judgement, not a bank guarantee, automatic
  lending approval, legal promise, or instruction to release money.

## CommunityVerifyPage

Purpose:
Public record check showing that a GSN Community ID/key resolves to a recorded
community domain record.

Must show:
- community name
- Community ID/code
- public status
- domain stage
- affiliate-claim status
- relay availability
- public reading that separates the shown record, unconfirmed claims, and next
  safe action
- privacy and limitation note
- copy public community record link action
- QR that reopens the same public community record
- controlled confirmation request action when backend says it is available

Rules:
- This is a public verification screen and must not show bottom navigation.
- The route must be anchored by Community ID/key: `/verify/community/:communityKey`.
- The QR must reopen the same public Community ID Domain record page.
- It shows the community domain record only. It must not automatically verify
  every person, shop, line, subgroup, affiliate, payment, or credit decision
  under the community name.
- The public record fallback should say `Recorded in GSN`, not `Verified in
  GSN`, unless a future protected-domain status explicitly proves official
  domain verification.
- Copied/shareable community record packages must say the link opens or checks
  a public GSN community record. They must not say the package itself verifies
  the record or proves protected-domain approval.
- CAC or external company-registration details, when present, are recorded
  supporting evidence only. They must not be presented as GSN verification,
  current leadership evidence, community consent, member belonging, or the public
  Community ID formula.
- The public reading must explain what this Community ID record shows, what it
  does not confirm, and when to ask for member credential, TrustSlip, or live
  community confirmation.
- It must not expose private member lists, verifier names, phone numbers, email
  addresses, shop details, CAC/company-registration numbers, payment records,
  or credit approval.

## CommunityMemberVerifyPage

Purpose:
Public credential evidence that one GSN member ID is an active member of one GSN Community ID.

Must show:
- GSN member credential title
- member GSN ID
- community name
- community ID
- membership status
- membership role
- member-witness strength label
- member-witness count
- community activity count
- broad community activity categories
- latest community activity date when available
- renewal status
- valid-until date when available
- public reading that separates confirmed membership evidence, unconfirmed
  private/transaction claims, and next safe action
- QR that reopens the same public credential link
- privacy note
- limitation note
- copy credential link action
- open community record action

Rules:
- This is a public verification screen and must not show bottom navigation.
- The route must be anchored by Community ID/key and member GSN ID/key:
  `/verify/community/:communityKey/member/:memberKey`.
- It records active membership plus aggregate member-witness strength only.
- It may show broad aggregate activity evidence for this member inside this
  Community ID, such as activity count, latest date, and category labels.
- It must not expose verifier names, verifier GSN IDs, private witness notes,
  raw trust event types, private event notes, phone numbers, email addresses,
  payment records, shop details, loan details, or credit approval.
- It must not imply that a member with weak or expired witness strength is
  strongly verified.
- It must explain that the credential is evidence for judgement, not a
  guarantee or automatic transaction approval.
- The public reading must keep the credential scoped to one Community ID and explain
  that witness strength, renewal, activity evidence, TrustSlip, and community
  record should be read together before a serious decision.

## TrustSlipVerifyPage

Purpose:
Public TrustSlip evidence paper for checking a current TrustSlip code, visible
trust reading, community context, and careful next action.

Must show:
- public reading that separates TrustSlip validity, supporting scoped community
  evidence, and next safe reader action

Rules:
- When the TrustSlip carries both a Community ID/key and member GSN ID/key, the
  public evidence paper may link to `CommunityMemberVerifyPage` as `Open member
  credential`.
- The member credential link is supporting evidence only. It must not replace the
  TrustSlip validity check, community record, or live community confirmation.
- TrustSlip may show aggregate community activity evidence scoped to the
  TrustSlip holder and Community ID: count, broad category labels, and latest
  activity date.
- Activity evidence must be framed as evidence depth for judgement, not as a
  guarantee, credit approval, universal trust score, or evidence that every claim
  is true.
- Frontend TrustSlip screens should label the visible amount as a trust-limit
  signal, not as a bare approved limit.
- The TrustSlip evidence paper must not expose verifier names, verifier GSN IDs, private
  witness notes, raw trust event types, private event notes, phone numbers,
  email addresses, payment records, shop details, loan details, or credit
  approval.
- If either Community ID/key or member GSN ID/key is missing or placeholder
  text, do not show the member credential link.
- Copied TrustSlip snapshots may include the member credential link only when
  that link can be built from usable keys. The link is supporting scoped evidence;
  it must not replace the TrustSlip validity check or imply wider approval.
- Copied/exported TrustSlip snapshots must carry the same reader boundary as
  the on-screen evidence paper: TrustSlip is evidence for judgement, not a payment
  instruction, credit approval, legal promise, or reason to release goods
  without checking current context.
- Authenticated TrustSlip share bundles may include the same member credential
  link in WhatsApp/SMS text and structured JSON, but only as supporting scoped
  evidence beside the TrustSlip verify page.
- Backend-rendered TrustSlip verification papers, including the Lite paper, may
  include the same member credential row/action when the backend can safely
  resolve Community ID/key and member GSN ID/key. This includes current public
  member references using `GMFN/GSN/GMFM-P-*` or `GMFN/GSN/GMFM-U-*`.
- Backend-rendered TrustSlip papers and authenticated WhatsApp/SMS share
  bundles must call the trust amount a signal or shown limit, not a release
  instruction, and must say the evidence is not credit approval or permission to
  release goods, credit, or money.
- Public TrustSlip share-text may include the same member credential link as
  supporting scoped evidence when the TrustSlip community and holder member
  reference can be safely resolved.
- Public TrustSlip JSON verification may return the same member credential link
  at top level and inside `merchant_view`, so direct API consumers do not need
  to reconstruct the scoped credential URL.
- The React public verifier must normalize the backend `member_credential_page`
  when present and use it before deriving a fallback path from Community ID and
  member GSN ID.

## OwnerShopControlPage

Purpose:
Owner-side shop tools.

Must show:
- GSN ID status
- selected community
- shop trust
- Open Public Shop Face
- Copy Public Shop Link
- Open Community Marketplace
- Pictures & Products
- Owner Spotlight
- Paid Spotlight
- Private Vault Access
- Grow Trusted Circle
- Owner Spotlight Status

Rules:
- Ordinary public shop link surfaces must show and copy the complete canonical public shop root URL, including the public domain and `/shop/{GSN_ID}`. Do not add `#shop-diaries`, product, block, focus, or community query hints to ordinary public share links.
- Explicit legacy/deep-link handling may still reveal a shelf or product after the full public shop loads, but it must be separate from default ordinary public sharing. Vault/private access links remain exact private targets such as `/vault/{token}`.
- Join invite link surfaces must show and copy only canonical `/start/join/{code}` invite URLs. They must not fall back to unrelated app routes such as Finance, Dashboard, Trust, or Marketplace.
- Marketplace link action buttons must keep fixed-height rows and avoid transition-driven layout movement.
- Marketplace `Open Shop Face` must not await a fresh public-shop-link request
  and then call a new-tab/window open action. Mobile and in-app browsers can
  blank or block that flow. It should use an already-ready public shop link and
  navigate in the same tab, or ask the user to refresh the link first.
- Public Shop signboard identity must be shop/member scoped: shop name,
  description, picture, WhatsApp, and Telegram come from the individual shop
  record. Marketplace/community name may appear only as the shared community
  context, not as a replacement for the shop name.
- Public Shop may expose an on-demand Verify Shop panel with the shop owner ID,
  shop name, marketplace/community context, community ID when available, and a
  QR that reopens the public shop link. Do not present that QR as TrustSlip
  evidence unless the backend provides a live TrustSlip code for that shop.
- Public Shop status strips should use safe community wording such as
  `Community Record` when only a community ID/context exists. Do not label the
  shop's community as `Verified Community` from community ID presence alone.
- Public Shop may show a compact signed-in member navigation strip while a
  member is authenticated, even when the member is viewing another member's
  shop. It should link to the main member domains: Dashboard, Community Home,
  Marketplace, Public Shop, Finance, Loans, and Trust. It must not render for
  ordinary public visitors.
- Public Shop signboard identity must not expose phone-number or internal
  `.local` identity fallbacks as the shop/owner name. If the member has not
  saved a public shop name or display name yet, use a neutral public fallback
  such as `Public GSN Shop` or `GSN member`.
- Marketplace member rows must follow the same public identity rule. If a
  member has a real visible shop name, represent that member by the shop name
  first. Do not use phone numbers, emails, internal `.local` names, or generated
  GSN/GMFN ID labels as a public member/shop name.
- Public Shop repost is an in-network placement action, not an outside share.
  The member must enter or choose the target marketplace/community ID, and a
  successful repost should create a target marketplace spotlight/feed item
  subject to the same membership and spotlight-capacity rules as other live
  spotlight placements.
- Public gallery block control must be slot-aware. When a member posts into a
  numbered public block, that block should remain visibly occupied after save,
  refresh, and return navigation. Occupied blocks should show the current
  picture/video preview and item name; empty blocks should be visibly empty so
  the member can tell what is free.
- Free Spotlight must not make the member fill shop identity/details every time
  they publish. The member has one shop attached to the global GSN ID; Spotlight
  should use that saved shop identity, quietly prepare the backend shop row if
  it is missing, and ask only for the product/update details, price note, media,
  and short instruction that belong to the current spotlight.
