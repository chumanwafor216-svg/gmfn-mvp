# Screen Specs

## Global Decision-First Screen Rule

Every screen must make the supported decision clear before it explains the
system. A first-time user should not need to read more than 20 visible words to
understand the main state and next step.

Default hierarchy:
- one big answer;
- four quick facts;
- expandable details;
- full report last.

Use `Decision first. Evidence second. Explanation last.` for Trust Passport,
TrustSlip, Decision Packs, verification, marketplace, finance, support, and
admin surfaces.

Trust-first real-life guidance:
- important status and decision surfaces should translate system state into
  real-life meaning;
- use the reusable Real-life meaning pattern where possible: Meaning, Why it
  matters, First step, and If skipped;
- this guidance must especially protect unbanked and underbanked users by
  explaining how community evidence helps without pretending GSN is a bank,
  lender, credit bureau, or government verifier;
- do not scatter one-off trust paragraphs across pages when a shared guidance
  rule can carry the same meaning.

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

## Cover About GSN & I guide (`/guide`)

Purpose:
Explain what GSN helps people do without turning the public introduction into
a feature catalogue.

Must show:
- one simple Back control;
- the title `About GSN & I`;
- the short promise `Buy, sell, grow, and build trusted records with your communities.`;
- three compact outcome cards, in this order: `Buy and sell`, `Grow your shop`,
  and `Keep community trust visible`;
- one closed disclosure labelled `See everything GSN can help with`;
- all 12 shared GSN capabilities inside that disclosure, each with a plain title
  and one short explanation;
- iPhone home-screen guidance when the existing device rule requires it;
- one primary Continue action at the bottom.

Must not show:
- bottom navigation;
- a capability carousel;
- Previous or Next capability controls;
- technical category or tone chips;
- duplicate primary actions above and below the content;
- authenticated My GSN controls.

Behavior:
- Back and Continue return through the route state supplied by the Cover flow,
  falling back to `/cover`;
- the full capability list is closed on first load;
- no capability is deleted from the shared registry;
- the signed-in My GSN guide remains separate and unchanged.

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
- The prompt may appear on Welcome, Sign In, invite/public access, and other
  entry surfaces where installation does not compete with the page's main job.
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
- Focus Commitments is the lightweight promise-to-evidence layer for personal and community-facing follow-through. It may track what was promised, who promised, review cadence, progress, privacy level, and an outside-tool link.
- Focus Commitments may support community promise categories such as volunteer, payment, delivery, follow-up, project, and attendance, because those are the common chaotic commitments that move through WhatsApp groups, paper notes, secretaries, and meetings.
- Focus Commitments must keep lightweight due-date intelligence: urgent items due tomorrow, due today, overdue, or review-due rise first and show red/yellow/green traffic-light labels with plain-language follow-up guidance.
- Focus Commitments must not become a full CRM, payment processor, loan ledger, WhatsApp scraper, or verified legal evidence system without a separate backend/governance review.
- Outside-tool links may point to WhatsApp, spreadsheets, or a CRM already used by the community. GSN remains the commitment organiser and trust reflection layer, not the owner of every external conversation.
- Market Wisdom may use Focus Commitment pressure as a `Now` reading so the user sees execution risk before acting, but the actual commitment work must remain inside Focus Commitments and the Action Inbox; do not create a second task manager from Market Wisdom.
- Dashboard may show a compact `My Pulse` strip inside `What needs your attention`. My Pulse reads server-owned Attention Spine signals from `/attention-spine/me` first, then local Focus Commitments and Market Wisdom context where those engines are not yet server-persisted. It must reveal the current signal list in place when tapped, while any deeper action routes back to the existing owner screen. It must not become a separate dashboard card, inbox, posting area, approval queue, or commitment manager.
- The Attention Guide popup must stay compact at every width: show the urgency, issue title, one short consequence, dismissal, and actions. Do not restore cadence/source metadata or repeated explanation cards.
- On phones, Notifications must open with one current item and one primary action. Hide the four-stat summary, duplicate `Open page`, `Not now` / `Mark as read`, Dashboard return, current-item collapse control, decorative trust message, history, and label glossary from the first surface. Keep one closed `Other items` row; opening it reveals compact label-and-count rows without explanatory sentences. Dashboard remains available through the fixed authenticated bottom navigation.


## MyGMFNAndIPage / Profile

Status: CLOSED/FROZEN as of 2026-10-15 after the approved novice-first phone simplification.

Purpose:
Member home for `me across the whole GSN network`.

Route contract:
- `/app/my-gmfn-and-i` is the canonical My GSN member home.
- `/app/profile` redirects to the same member home for compatibility.
- `/app/my-gmfn-and-i?tab=guide` is the explicit Guide / Help branch.
- `/app/my-gmfn-and-i?tab=settings` is the Settings branch.

First-screen order:
- identity first;
- community portfolio from `listMyClans`, including community name, stable/global id, role/status, selected indicator, and Community Home handoff;
- compact attention summary only when there is a real attention signal, source failure, or loading state, with Notifications/DemandBox handoffs for full queues;
- one closed `My Pipeline Credits` disclosure showing the authenticated member's personal balance in its summary; opening it reveals only server-catalogued packs and supported services, one explicit purchase confirmation, saved future-use permissions, and personal purchase/activity status;
- compact selected-community shop/business handoff only, with Shop Control owning products, diary, Spotlight, Vault, and analytics;
- compact trust/evidence handoff only, with Trust Passport and TrustSlip owning detail;
- settings/account entry, with current frontend settings labelled as device preferences unless they are intentionally connected to backend `/settings/me`;
- guide/help and setup capability material lower on the page or behind explicit guide mode.

Rules:
- My GSN must not become Dashboard, Community Home, Marketplace, Shop Control, Trust Passport, or TrustSlip.
- Dashboard owns immediate operational overview. My GSN owns durable identity, memberships, footprint, and orientation.
- Community Home owns one selected community. My GSN owns the cross-community personal portfolio.
- Visible My GSN guidance must speak to the member directly. Use plain actions such as `Open`, `Use`, `Create`, and `Join`; keep internal ownership, handoff, orientation, footprint, source-page, and queue language out of member-facing explanations when a direct instruction is available.
- Profile tab must open the canonical member home, not the historical guide-first branch.
- Do not revive the old standalone `ProfilePage.tsx`; treat it as deprecated/unmounted source until a later deletion audit.
- The approved Pipeline Credit disclosure must stay in-place and collapsed by default. It must not become a page, navigation item, community/provider-cost balance, automatic renewal surface, or substitute for Shop Control. Service names may hand off only to server-authorised existing workflows with selected-community context.
- Service ON/OFF means permission for a future personal-credit-funded purchase only. New permissions default OFF; toggling has no financial effect; the server rechecks the saved choice when a debit commits; and global payment suspension overrides ON without restricting an existing free action.
- Pack identifiers, service identifiers, prices, scope, duration, cost, balance, projected balance, purchase state, and Checkout destination are server-owned. A Checkout return or client action must never claim payment or award completion.
- On phones, keep the default member home factual and compact: show identity facts in a two-column grid, the selected community, one primary `Open community` action, and conditional attention only when there is a real signal or loading/source failure.
- On phones, the default identity grid shows only `GSN ID` and `Phone`; the duplicate `Handle` fact and `Copy handle` utility live under `More` -> `Account`. Desktop keeps all three identity facts and the visible copy utility.
- On phones, keep those two identity fact cards text-first and no taller than needed for two value lines; do not spend their narrow width on repeated decorative fact icons. Desktop keeps the richer icon treatment.
- On the default phone member-home, render the `My identity` heading as text only; do not spend a separate 44px row on a decorative identity-card badge. Desktop retains the richer badge treatment, and the explicit Identity Guide remains unchanged.
- On authenticated phones, the shared app shell owns the `My GSN` page name. Do not repeat that route heading inside the default member-home card; desktop and the explicit Identity Guide branch keep their fuller heading context.
- On the default phone member-home, do not wrap the navy orientation surface in a second decorative white frame or reserve space for the omitted route heading. Keep that fuller frame on desktop and in the explicit Identity Guide branch.
- Keep Shop/Trust, Settings, Help, official links, and quiet activity behind one closed `More` row on the default phone surface. Do not duplicate those actions in a second phone action rail. Guide mode may retain its explanatory copy.
- On the default phone member-home, do not render the full device-preferences/account-name editor below the closed `More` row. Keep one `Settings` handoff inside `More`; that handoff opens the explicit `?tab=settings` surface where the existing fields and save actions remain. Desktop may retain the editor below the member-home.
- On the explicit phone `?tab=settings` surface, keep the editable display-name and reading-preference controls as the source of truth; do not repeat their selected values in a separate `Current reading` card stack. Desktop may retain that at-a-glance summary.
- On the explicit phone Settings surface, keep Companion Mode closed by default as one compact row showing its current mode and one `Open` action. Expanding it must preserve intensity, sound, voice, system-notification, quiet-hours, daily-limit, and repeat-reminder controls. Desktop keeps Companion Mode expanded.
- On the explicit phone Settings surface, start directly with `Profile display name`: omit the repeated page introduction, reduce the display-name explanation to one sentence, omit explanatory copy where the control label is sufficient, and use the concise checkbox labels `Show unread items first` and `Open the destination directly`. Keep every field and action. Desktop retains the fuller guidance.
- When Companion Mode is expanded on a phone, start with the first usable control instead of repeating a headline, behavior paragraph, and passive browser-permission chip. Use the phone labels `Reminder level`, `Sound`, `Spoken reminders`, `Daily reminder limit`, and `Repeat after (minutes)`, with the short helpers `Spoken reminders for important alerts.` and `Get reminders when GSN is not open.` Keep every control and use status text when a save or permission event actually occurs. Desktop retains the fuller introduction and technical labels.
- Inside expanded phone Companion Mode, keep `Reminder level` immediately visible and place the six secondary settings behind two value-bearing rows: `Sound & notifications` and `Timing & limits`. Opening one row must close the other. The rows must summarize the current saved choices before a tap, every original control must remain reachable, status feedback must stay visible, and desktop must retain the fully expanded presentation.
- When a phone member has multiple communities, keep the full portfolio reachable from one compact `Switch community (N)` row; opening it must not replace the selected-community primary action. When the member has exactly one community, place its name, role, and stable ID directly in the `My communities` section: omit the nested selected-community card, duplicate `Selected community` label, repeated `1 active` heading, and duplicate switch/list control. Keep the section-level community icon for wayfinding. Desktop retains the fuller count, selected-card label, and icon treatment.
## Mobile Task Page Rule
## CommitmentsPage

Purpose:
Let a member choose between personal follow-through and a shared ROSCA without exposing both workspaces at once.

Phone first surface:
- one Personal row with the real active count and one handoff to Focus commitments;
- one Shared ROSCA row with its real invitation/active/draft state and one open action;
- no repeated route heading beneath the authenticated app shell.

Rules:
- opening Shared ROSCA replaces the two-lane chooser and exposes one Back action plus one Start new action;
- the creation form, run list, selected run, contribution record, participant invitation, past runs, and terms remain available inside the Shared workspace;
- Shared form/action grids use one phone column while desktop retains the wider two-lane/workspace layout;
- GSN must continue to state that it records the arrangement but does not hold the money, and a self-recorded contribution must not be described as independent payment confirmation;
- a direct `rosca_run_id` link must open the Shared workspace and selected record.

All authenticated mobile task pages must follow
`docs/GSN_MOBILE_UI_PROTOCOL.md`.

Rules:
- one phone screen should present one decision;
- the current state and next action should be visible without scrolling
  whenever possible;
- the authenticated app shell owns the phone page name; route-level
  `PageTopNav` must not repeat its title, section label, or subtitle in another
  large card;
- required back, next, and utility routes may remain in one compact horizontal
  row, while redundant Dashboard/Home links should rely on the shared shell;
- short facts should use chips or two-column mini cards;
- raw URLs, logs, policy text, repeated explanation, and admin-only controls
  should be collapsed by default;
- long processes should show only the current step expanded.
- Shared Companion notices on authenticated phones must default to one compact bar no taller than 60px, positioned above the bottom navigation. The bar must show urgency, one-line title, `View`, and dismiss without covering the page primary action or navigation.
- Show only the newest waiting Companion notice on phone; older notices remain in the existing queue while their current auto-close window is live. `View` may expand the complete detail plus Open and Dismiss actions. Desktop retains the existing full toast cards.

## Loan Support Page

Route: `/app/loans`

Phone first surface:
- selected community;
- Active and Waiting counts;
- one `Request support` primary action;
- one compact Summary disclosure;
- one compact More tools disclosure.

Rules:
- do not repeat the Loan Support title or its general explanation under the
  authenticated app-shell header;
- hide the Current support focus card when nothing needs attention;
- when a real support item needs attention, show its short state and next step;
- keep support summary, route tools, and email help collapsed or compact until
  the user asks for them;
- do not change support, finance, repayment, approval, or route contracts while
  simplifying the surface.

## Loan Support Summary Page

Route: `/app/loan-summary/:loanId`

Phone first surface:
- selected community and support record identity;
- amount and one plain-language next step;
- four compact facts: State, Remaining, Support recorded, and Waiting;
- one primary action derived from the real record state;
- one compact More details disclosure.

Rules:
- do not repeat the route title beneath the authenticated app-shell header;
- translate backend states before display. The phone card uses plain readings such as `Waiting for supporters`, `More support needed`, `Support recorded`, `Money sent`, `Repayment active`, `Repaid`, or `Needs review`; it must not expose raw status codes.
- keep the next-step sentence short and name onward phone tasks by what the member will do: continue support, find supporters, check readiness, open the money record/breakdown, make repayment, or return to all support requests.
- keep the GSN evidence boundary on the first surface: GSN records support
  evidence but does not approve the whole request, move money, or promise
  repayment;
- the primary action must be Review supporters, Continue support, Continue
  repayment, or View record according to the loaded state;
- opening Supporters, Record and evidence, or Other tools must replace the
  phone front door with that one lane and expose Back to summary;
- preserve individual supporter record/decline actions, repayment evidence,
  audit evidence, and destination routes;
- do not add bulk supporter decisions or imply that support evidence is a
  lending approval.

## Support Repayment Page

Route: `/app/payment/loans/:loanId`

Phone process:
- choose the full outstanding amount by default, with part payment available
  through one quiet disclosure;
- show four compact facts: Outstanding, Selected, Paid already, and Due;
- use one primary Get payment details action;
- replace amount choice with exact payment instructions after generation;
- use one I have paid declaration action only after the member sends money;
- replace payment instructions with Sent for checking after declaration.

Rules:
- translate payment stages and backend statuses before display. Use direct
  readings such as `Get the payment details`, `Send the selected amount`,
  `Sent for checking`, `Waiting for payment`, or `Payment confirmed`; do not
  require a member to decode instruction, declaration, reconciliation, event,
  or exposure terminology;
- keep the GSN money boundary on the first surface: GSN records instructions
  and declarations but does not hold money or confirm receipt before
  reconciliation;
- I have paid records a declaration only; it must not claim settlement,
  reconciliation, closure, or release of supporter exposure;
- after declaration, say that the support item remains open and supporter
  exposure remains in place until reconciliation;
- keep payment evidence upload under a compact payment-status disclosure;
- opening payment status or other pages must not recreate a stack of competing
  tasks;
- do not change payment-instruction, repayment-claim, evidence, permission, or
  reconciliation contracts while simplifying the surface.
## AuthGatewayPage

Purpose:
Choose existing member or new member.

Must show:
- GSN
- Welcome
- Existing member card with the primary Sign in button
- one compact `New to GSN? Sign up` secondary row
- note: After registration or approval, you will return here and sign in as an existing member.

Primary action:
- Sign in

Rules:
- Existing users go to SignInPage.
- New users go to SignUpChoicePage from the compact secondary Sign up action.
- Sign up must not use a second large card or compete visually with Sign in.

## SignInPage

Purpose:
Existing member login.

Must show:
- GSN
- Welcome back
- Phone number or email field
- Verification code field
- Send code action
- Continue button
- one compact `Help` disclosure containing sign-in support,
  password recovery, membership activation, and starting a new community
- privacy note
- blocked password recovery must expose an owner/support review packet without revealing or requesting any password
- owner/admin recovery review must route to Identity Risk with the typed phone and GSN ID so the admin can confirm ownership before issuing a temporary password

Must not show:
- bottom navigation
- dashboard content

Rules:
- Sign in stays the only primary action in the default view.
- Sign in appears immediately after the identity and password fields.
- `Help` remains a small, borderless, text-level disclosure
  after Sign in; all secondary actions stay hidden until it is opened.
- Membership activation and new-community setup stay secondary inside the
  compact disclosure instead of competing with the sign-in form.

Primary action:

```text
Continue
```

## SignUpChoicePage

Purpose:
New member chooses starting path.

Must show:
- GSN
- New member
- one primary Join community card
- one compact `Starting your own? Start community` secondary row
- Compact Institutional setup option for Purchase Community Domain
- information note: Once your setup or join request is completed, you will sign in from the Existing Member page.

Primary action:
- Request to join

Rules:
- Create community goes to StartCommunityPage.
- Request to join goes to JoinRequestMembershipPage.
- Join stays visually primary for the ordinary new-member path; Start community stays visible but compact.
- Purchase Community Domain goes to CommunityDomainPurchasePage from the compact Institutional setup option.
- Purchase Community Domain is a separate institutional provisioning path and must not be
  merged into ordinary Create Community or shown as a competing ordinary-member path.
- After successful completion, user returns to SignInPage.

## CommunityDomainPurchasePage

Purpose:
Let an organization owner start institution setup without confusing it with ordinary free community creation. During early pilot/customer discovery, Community Domain payment is suspended while name checking and reservation remain active.

Must show:
- GSN / Community Domain identity
- short difference between ordinary `Create Community` and institutional Community Domain setup
- normal GSN community / local marketplace anchor first when the owner does not already have one
- organization name
- requested domain name
- society type/template choice such as school, church, union, market,
  cooperative, town union, NGO, health body, or generic association
- domain name availability result
- package or quote state
- pilot payment state: payment is suspended for now; no Community Domain payment instruction should be created during pilot
- pending paid-continuation / verification state after pilot reservation
- clear path back to `Create Community` for users who only need a lightweight
  social community
- clear sign-in or existing-member recovery when purchase requires an
  authenticated owner
- clear path for a signed-in returning owner/member to open their Community
  Domain dashboard selector

Rules:
- This screen is an entry/provisioning screen, not the operating dashboard.
- A first-time organization owner must create the normal GSN community/local marketplace first so the organization has a local community record and GSN number before Domain filling begins.
- After that local community exists, Domain setup may protect the wider institutional name, governance, package, and rights.
- It must not show bottom navigation before authentication is complete.
- The provisioning route must not create a live verified institution by itself. A pilot reservation, draft, quote, or suspended payment rail is not verification, paid continuation, or final public evidence.
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
- Community type choice
- Governance weight choice
- Recommended governance preset
- Requirements summary
- Limited setup controls before advanced settings
- Step 3: Founder trust level / optional verification choices

Rules:
- The first phone surface asks only whether the founder is new to GSN. `Continue as new founder` is primary; `I have a GSN ID` is secondary and routes to sign in.
- Do not expose the long duplicate-identity explanation before the founder makes that first choice.
- Only one step expanded at a time.
- Future steps collapsed or clearly marked optional.
- User completes Step 1 before Step 2.
- User may create the community after Step 2 once phone registration or phone
  verification is attached to the entry.
- Live phone mode must show a code-entry state only after the provider returns
  a delivery receipt. It must not expose a preview code, claim an SMS was sent
  after a provider/gate failure, or continue as verified before provider
  approval. Preview mode must remain visibly labelled controlled testing and
  must require an explicit confirm action rather than auto-confirming itself.
- Live phone code-entry states provide one rate-limited resend action. A resend
  failure must explain whether the wait limit, Pipeline Credit gate, or provider
  blocked delivery; it must never imply a new code was sent.
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
Accept an invitation to an existing community using that community's saved
admission rule.

Must show:
- invite code or community code input
- requester details
- reason / short note
- recorded community setup/governance note when the invite preview provides one
- rules/admin-review acknowledgement before submit only when the selected
  reviewed mode requires it
- a mode-aware primary action: Accept invite for instant admission or
  Request access for reviewed admission
- privacy, membership, and verification boundary

Phone-first rule:
- Show community, inviter, expiry where known, the saved joining rule, one
  short membership/verification boundary, and the next action.
- A fresh invite must show Sign in and the mode-aware action before the
  requester fields. Tapping it must visibly open and move to the Full name,
  Phone number, and Country fields; it must not appear to do nothing while the
  form sits off-screen.
- Resume the form automatically only when the phone holds real requester input, not merely because the invite link was opened before.
- Keep the full invite note collapsed. Hide promotional invite artwork, repeated evidence chips, and the official footer from the first phone surface.

After submission:
- instant_invite: create active membership immediately. Existing identities
  enter Community Home; new identities receive a GSN ID, set a password on
  Activate Membership, are signed in, and enter Community Home.
- admin_approval: keep the request pending until an admin accepts or rejects it.
- community_vote: keep the request pending until the required member vote;
  admin override is available only when the saved community setting allows it.
- Membership confirms belonging only. It must not be presented as identity
  verification, financial approval, endorsement, or a trust decision.
- Each newly generated invite snapshots the joining rule. Changing the
  community rule retires active links so recipients cannot receive a silently
  changed contract.

## CommunityHomePage

Purpose:
Member view inside one selected community.

Status: CLOSED/FROZEN as of 2026-10-15 after the approved novice-first phone simplification.

Canonical rule:
- Community Home answers `which community am I inside right now?`
- My GSN / Profile answers `who am I across GSN?`
- Marketplace answers `what can I do/find inside this selected community marketplace?`
- Shop Control answers `how do I manage my shop and Spotlight?`
- Community Domain answers `how do authorised operators administer the domain?`

Must show, in phone-first order:
- selected community identity hero
  - community name
  - a compact two-column fact grid directly after the name
  - real active-member count from the membership record; missing count data must say `Count unavailable` and must never be converted into zero
  - stable community reference / global ID labelled `Community ID`
  - signed-in member role labelled `Your role` and active membership labelled `Membership`
  - selected-community `Available now` balance only when the connected effective balance is greater than zero
  - one small `Invite` action inside the hero
- tapping `Invite` opens one recipient-name field and one `Send invite` action
  - the signed-in member is attached automatically as inviter
  - the recipient name is required and attached to the personalised join link
  - sending opens the device share sheet; clipboard fallback copies the full personalised message
- Community Bulletin immediately after the identity hero
  - one compact live announcement presentation
  - on phone, use one short `Bulletin` header without a repeated `Community` prefix or notice-kind pill
  - on phone, show the notice source, a two-line preview, and one `Open notice` action; opening it reveals the full notice and acknowledgement/contact/availability/attachment/QR actions together
  - on phone, keep one compact red/amber/green timing strip showing `Now`, `72h`, and `Clear` counts inside Bulletin; keep the larger Community Pulse explanation/actions and calendar tile off the default phone surface
  - keep up to the last 10 expired items reachable through one closed `Previous announcements` disclosure; do not expose the history by default and do not silently discard it from the member surface
  - no Ask Community / market-need records in the Bulletin by default
- Needs your attention only when a real selected-community action exists
  - notice response required
  - notice acknowledgement required
  - officer bulletin review waiting
- compact destination handoff group
  - Marketplace
  - Manage shop -> Shop Control
  - Finance
  - Support
  - Trust
  - on phone, keep all five destinations behind one `Community actions` disclosure; after opening, show only the destination labels and keep explanatory destination sentences off the surface
- compact community switcher
  - collapsed by default
  - hide the switcher when the member has only one accessible community; show it for multiple communities or inaccessible route recovery
  - ordinary member communities only dominate the opened switcher
  - route changes/select changes must reconcile against `listMyClans`
- one collapsed Admin area only for verified authority
  - Bulletin posting/settings/review
  - join requests
  - Community Domain controls only when `/community-domains/my` reports `viewer.can_admin` or equivalent for the selected community/domain

Rules:
- `/app/community/:clanId` must not silently render a different stored selected community. It must verify the route param against `listMyClans`, select/reconcile when accessible, and show a truthful inaccessible-community state otherwise.
- Community Home must not fetch, rotate, synthesize, or render live Spotlight media/feed.
- Community Home must not expose Free Spotlight, Subscription Spotlight, Paid Repost, Vault controls, Merchant Release, Shop Gallery Tools, guided Spotlight chooser, or shop-readiness routing as first-screen controls. Use `Manage shop` as the Shop Control handoff.
- Community Home must not fetch `getPoolMeSummary` or present cumulative finance in the identity/status area. It may fetch `/pool/me` for the selected community and show one conditional `Available now` fact when that effective balance is greater than zero. Finance remains the owner of the full money record.
- Community Home must not expose a full cross-community portfolio; My GSN owns cross-GSN/community identity orientation later.
- Community Home must keep admin/officer controls collapsed and separated from ordinary member flow.
- Secondary details stay collapsed, grouped, or represented as compact rows.
- Visible guidance must describe the user's next action in ordinary language. Do not expose internal terms such as `lane`, `record`, `officer review`, or `verification/work evidence` when `form`, `announcement`, `admin approval`, or a direct action sentence is accurate.
- The no-community state must plainly say that the member has not created or joined a community yet, while keeping Create Community, Join Community guidance, First Circle, Community Domain, and Dashboard recovery reachable.
- Every selected community must expose one compact hero invite action. The inviter is automatic; only the recipient name is entered before sending.
- On phone, the selected-community identity must rely on the community name and status badges instead of repeating a context paragraph.
- On phone, the authenticated app shell owns the page title/navigation; Community Home must not add another route-level Back/title strip or repeat the `Community Home` label inside the identity hero.
- On phone, destination, switcher, and Admin disclosures use their action row as the card; do not wrap each row in another visible card.
- Do not show numerical strength, interaction density, community finance standing, or trust-in-community metric boxes on Community Home. The signed-in member's own selected-community `Available now` amount is the only approved conditional money fact in the hero.
- Do not expose long owner, spotlight, trusted-circle, or shop-control manuals inside Community Home.

Role states to support:
- Member
- Shop owner
- Officer/admin
- Community Domain admin
- Pending/verified identity user

Empty states to support:
- no community yet
- inaccessible route-param community
- one community selected
- multiple selectable communities
- missing display name
- no live Bulletin item
- Bulletin attention / no attention

Deferred deeper surfaces:
- My GSN / Profile for cross-GSN identity and full community portfolio.
- Community Domain / Command Center for deeper authorised operator workload.
- Shop Control for shop, Spotlight, Vault, merchant release, and shop readiness.
- Marketplace for one-community needs, directory, provider connections, and action handoff.
## CommunityDomainDashboardPage

Purpose:
Operate a purchased or provisioned institutional Community Domain after the
domain exists.

Must show:
- Community Domain identity hero
- domain name/code, display name, owner, status, verification state, and renewal
  state as compact facts
- for an owner with no linked domain, a Community Domain dashboard start that first shows a guided setup path; name reservation, local community anchor, payment, and verification must wait inside that guided sequence or the quieter More setup tools drawer, not before it
- inside the guided setup card, place the one current-step primary action before the six progress tiles so the required next action remains inside the first phone viewport
- identity setup starts with the responsible signed-in GSN identity/personal page, then a domain-code availability check and Save checked name action, then a plain category package choice such as School, Church, Charity / NGO, Association, or Other
- category packages stay gated until the GSN identity and available domain name are ready; once selected, the package collapses to a summary with an Edit package action instead of exposing every category permanently
- prepared categories hide raw type/template fields, and only Other asks for manual description or support help
- after category selection, setup step titles, notes, and examples should speak in that package language, such as campuses/classes for School, branches/ministries for Church, programmes/beneficiaries for Charity / NGO, and committees/members for Association
- inside the setup workbench, the page must recommend continuing the active setup step first and keep Access as a secondary exception for locked editing or setup-editor authority
- inside the secondary setup overview, Next setup must be recommended before reference views, with stages and views kept behind closed selectors
- inside Structure focus, the Structure map must be recommended first before Readiness or Rollout selectors
- inside Services focus, Readiness must be recommended first before Local rules or Trust selectors
- inside Members focus, Member readiness must be recommended first before Roster control
- inside Roster control, Summary must be recommended before individual member status changes
- inside Setup access, Summary must be recommended before changing setup editor authority
- inside Billing jobs, Code & evidence must be recommended before account setup, steps, or readiness diagnostics
- inside Billing pay-in account, Summary must be recommended before account setup
- inside Billing Code & evidence, Reference must be recommended before code generation, settlement checks, or evidence upload
- inside Operating summary, Do next must be recommended before status, allowance, or permissions
- inside Activity recording, Record must be recommended before catalogue or recent activity views
- inside Beneficiary outcomes, Record must be recommended before recent outcome views
- inside Director report summaries, Overview must be recommended before membership, evidence, or delivery
- inside Sponsor summaries, Overview must be recommended before evidence, delivery, or export
- inside Official Board notices, Recent notices must be recommended before posting a new notice
- inside Structure planning, Rollout must be recommended before activity or group readiness
- inside Trust/Evidence readiness, Records must be recommended before release, relay, notification, or mobility
- inside Service readiness, Services must be recommended before settings, economy, or presence
- inside Service boundary rules, Exchange must be recommended before privacy, setup, compliance, or appeals
- inside Billing readiness, Lifecycle must be recommended before capacity
- inside Identity readiness, Domain identity must be recommended before profile, bridge, or affiliation
- inside Governance readiness, Review pulse must be recommended before delegation or coverage
- after the launch/setup checkpoint is saved, the page must visibly mark the setup checkpoint as completed and show one state-aware next task, such as connect Community Home, turn on Member Invites, or build the first circle, instead of exposing all governance surfaces
- one command surface that first shows the guided setup path
- after the owner opens `More setup tools`, the drawer must first restate the current guided setup step and one action back to that step, then show four secondary governance stages: Set up the institution,
  Organise people, Run the community, and Advanced governance
- each governance stage exposes six inner actions only after that stage is
  selected
- blocked stage actions, such as First Circle before Community Home link or owner/admin-only actions for ordinary members, must explain the blocker in place instead of becoming silent disabled buttons
- Set up the institution actions for domain name reservation, community linking,
  identities/profiles, owner authority evidence, subscription/package status,
  and launch readiness
- Organise people actions for first circle, roster, departments/units,
  placement readiness, access requests, and delegated setup editor authority
- Run the community actions for marketplace, official notices, attendance,
  response QR, collection QR, and real-life activity records
- Advanced governance actions for readiness, feature policy, director summary,
  sponsor report, all operating areas, and save/lock package handoff
- inside Governance jobs, a numbered work path must come before deeper selectors:
  check readiness, handle access, record evidence, then review reports
- inside Director summary and Sponsor report, report output controls must follow
  a guided report path: read boundary, review facts, check delivery, then
  prepare PDF or sponsor-safe copy last
- inside Operating summary, a direct active-domain path must appear before
  secondary selectors: do next, check status, check allowance, then review
  permissions
- inside Record evidence / Real-life record, activity and beneficiary outcome
  records must show their staged path before secondary step changers
- inside Beneficiary outcome recent records, Summary must be recommended before
  confirmation, contact, delivery, or receipt
- school-specific Real-life record tools must expose one selected work area at a
  time: readiness, notices, fees, contacts, or attendance
- where Community Finance collections are enabled, a compact governed QR or
  payment-instruction row for offerings, donations, levies, registrations, or
  support appeals
- for church/religious-body domains, a compact real-life record workflow packet
  for programme attendance, live QR attendance, after-meeting response QR,
  pastoral/welfare follow-up, member belonging, department service/handover,
  and contribution memory
- where Announcement Board is enabled, an explicit public message QR option
  for public-safe sermon topics, message of the day, programme themes, or
  short preaching notes
- where Demand Box is enabled, a governed Response QR option for questions,
  feedback, needs, suggestions, concerns, testimony/benefit notes, and
  private follow-up requests after meetings, church services, programmes,
  workshops, or announcements
- for church/religious-body domains, a governed Church Summary PDF option that
  summarizes recorded official messages and programme workflow records for a
  month, year, or selected period
- for church/religious-body domains, a compact dismissible Service guide nudge
  that can prompt the next step after message QR, live attendance QR, offering
  QR, response QR, and month-end summary activity without exposing every tool
  at once
- clear route back to Dashboard or Community Home
- empty states for draft, pending activation, active, expired, suspended, and
  closed domains

Rules:
- This page is the institutional operating surface. It must not replace
  CommunityHomePage, which remains the lightweight selected-community home.
- The first screen must not expose every operating area at once. For no-domain entry, do not show a separate path selector before the dashboard start. Follow the
  guided governance-folder rule: one identity hero, one guided setup path, one secondary tools drawer, four
  stages after More setup tools opens, one selected stage, and one opened work area
  at a time.
- Before launch, the guided setup path is primary and Set up the institution is a secondary tools stage. Billing,
  verification, and final activation remain separate even when they are reached
  from that stage.
- After launch, Run the community may lead to the linked Marketplace while Set
  up the institution, Organise people, and Advanced governance remain available
  as quiet stage choices behind More setup tools.
- Save/checkpoint actions may preserve draft progress, but a real governance
  lock or unlock must depend on backend owner/admin/delegated-authority checks
  and recorded history, not only frontend hiding.
- Save / lock package must save a setup checkpoint before launch-readiness
  handoff, then owner/admin must create a server-side governance package version
  with a package hash from the active `domain.feature_policy` and current domain
  setup snapshot. If setup editing is locked, it must route the user to owner/admin
  authority request instead of implying a local password or self-unlock. Later
  authorised changes create a new package version; the previous package is not
  silently mutated.
- Governance handover must be owner-locked and delegation-last. The owner must
  confirm the governance package, service switches, and delegation package before
  handover. Delegation powers are owner choices recorded inside governance; GSN
  must not hard-code a blanket refusal where an owner deliberately delegates
  membership, notices, billing administration, collections administration, or
  operating work. Later edits to locked governance must use owner-signed action
  review approval and package version history, not cloned accounts, hidden
  passwords, or silent local unlocks.
- A branch, campus, parish, line, class, committee, ROSCA circle, or welfare
  group should normally be represented as a `CommunityNode` or activity group,
  not a separate domain, unless it needs separate billing, public identity, or
  high autonomy.
- Marketplace is optional for non-market institutions, but economic activity
  must remain possible where real life needs it: approved vendors, member shops,
  ROSCA, welfare, fundraising, jobs, services, and trusted procurement.
- Governance actions must use scoped roles and policies. A node admin should
  see only the work their role can handle.
- Governance jobs must remain step-first: use the numbered governance work path
  for normal work, and keep deeper stage/job selectors secondary.
- Real-life record capture must remain staged: activity uses Person, Activity,
  Evidence; beneficiary outcome uses Person, Change, Evidence. The visible path is
  primary, while Change step is a correction tool.
- School governance packet details must not appear as a full dashboard dump.
  Use the selected school work area first, then reveal only the matching details.
- Access request UI must explain approval and apply as two separate actions:
  approve records the governance decision; apply membership actually adds the
  person only after the approved review is ready.
- `needs_changes` reviews are requester follow-up, not pending reviewer work.
- Payment, package quote, and renewal status must not be shown as verification.
- Offering, donation, levy, or registration QR codes must be shown as governed
  collection instructions only. They must not imply GSN custody, payment
  confirmation, bank approval, or impact evidence.
- Church real-life records may preserve pastoral care, welfare follow-up,
  member belonging, programme attendance, department service, and contribution
  memory, but must remain workflow/evidence records. They must not replace
  pastoral counselling, safeguarding duties, spiritual authority, payment evidence,
  or beneficiary outcome confirmation.
- Message QR pages must not expose member lists, open public comments,
  collect money, prove attendance, or replace the pastor/domain leader as
  the authority over the message.
- Response QR pages must require signed-in GSN identity, must not expose the
  responder list publicly, and must treat WhatsApp as a share/follow-up
  preference only. GSN remains the official response record.
- Response QR is governed by the Demand Box feature policy. If Demand Box is
  off for the domain, response QR creation and public response access must be
  blocked.
- Church Summary PDFs may summarize recorded sermon-topic/message notices,
  public QR message counts, programme attendance, live QR attendance,
  after-meeting response/question/need/follow-up counts, pastoral follow-up,
  department service, and contribution-memory records. They must not judge
  doctrine, expose private pastoral notes, prove attendance, prove payment,
  or certify unrecorded activity.
- Expired or suspended domains may keep readable history for authorized users,
  but paid operating actions should explain the renewal or suspension blocker.
- Public-safe information must stay separate from private member lists, node
  membership, finance records, evidence attachments, and action-review details.
- Public/member QR surfaces should avoid exposing raw receiving account details
  where a scannable instruction can carry the payment route safely.

Sermon/message attachment guardrail:
- Current public message QR supports short public-safe text, not durable sermon
  file upload/download.
- Future sermon attachment QR may support PDF/DOCX/TXT or image attachments,
  but each attachment must have a hard size cap, recommended default `10 MB`,
  and the UI must show the cap before upload.
- GSN must not silently cache sermon files into permanent phone storage. A
  member may download/open the file on their device and delete it later; the
  app should avoid offline auto-save unless the member explicitly chooses it.
- Large audio/video sermons should be external links or a separately governed
  media/storage product, not hidden inside the notice QR feature.
- Do not label the domain verified unless backend verification status proves it.
- Do not expose legal, payment, loan, or transaction authority beyond what the
  backend route and policy state actually allow.

Primary action:

```text
Follow the guided setup path first; use More setup tools only when you need one governance stage and one inner action.
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
- compact shop review status when a community governance profile marks listings for review
- member shops/products that require admin approval submit to a Marketplace listing review queue instead of going live immediately
- community officers review pending Marketplace listings from the Official Board lane and can approve or reject each submission
- Marketplace listing review prompts/results create Action Inbox rows and are Web Push eligible only when Web Push is configured and the user has an active subscription
- a clear way to return to Community Home or Dashboard

Rules:
- Marketplace is the operational nucleus for one selected community, not a
  dumping ground for every finance, trust, shop, support, demand, and link tool
  at once.
- The first screen must act as a guided front desk.
- If no community is active, the blocked state must explain the real-life
  meaning of choosing a community before listings, shops, demand, money, and
  trust work can safely continue.
- Money rail, support-request, trade-evidence, and public-link or repost
  blockers must use shared real-life meaning guidance before a member moves
  money, asks supporters, records trade evidence, or shares outward links.
- Trust context must appear before operational choices so the page reads as
  community trust infrastructure, not generic commerce.
- The trust front desk should use safe wording such as `recorded community
  context`, not `verified community context`, unless the selected community has
  an explicit protected-domain verification state.
- Open only one major lane as the main visible work area at a time.
- Every selected-community Marketplace must show one direct `Invite someone` action without requiring search or opening `More things you can do`. It opens the shared compact Copy/Share card; receiver and relationship personalization remain optional and collapsed.
- On phone, the Marketplace identity uses the selected community name and status without a repeated instruction sentence. The first market cards use one short heading (`Needs`, `Shops & services`), one clear action, and compact counts; explanatory paragraphs and decorative category tags stay off the first surface.
- Marketplace first-surface wording must explain member tasks rather than the
  implementation. Use `open requests`, `may be able to help`, `possible
  matches`, `shops`, `your recorded money here`, and direct verbs such as
  `links to share`, `promote a shop`, and `record a trade`. Do not expose
  `request lifecycle`, `provider connections`, `shop faces`, `local net
  position`, or `scoped` language to members. These wording changes do not
  alter DemandBox ownership, provider-match order, neutral discovery, finance
  calculations, permissions, or route handoffs.
- The Needs heading may expose one compact 48px `Add request` plus only when the authenticated member's community list contains the selected community and community policy permits DemandBox. A route parameter alone is not authorization. It opens and focuses the existing DemandBox request form with the selected community and an explicit origin/back path. Opening the shortcut creates nothing and must not enable relay consent, cross-community reach, paid capacity, or any other governed option.
- Promote in another community remains the existing paid Network Repost
  workflow, not a new advertising route. Shop Control must open it with an
  explicit trusted source; a naked hash still must not expose the
  finance-adjacent panel. On phone, the focused task uses one state-aware
  What to do next path: choose one public shop item, choose a permitted
  community and duration, get or refresh the exact payment code only when
  credit is missing, then Publish promotion. Other marketing routes and
  technical credit detail stay secondary. Product identity, target
  suggestions, paid credits, proof review, pricing and placement permissions
  remain unchanged.
- Shop Control `Trade records` must open the existing Marketplace Trade
  Evidence task with an explicit trusted source. A naked hash must not expose
  the protected task. On phone, the task uses the member-facing `Trade
  records` name, leads with one state-aware `What to do next`, and keeps the
  current record's three truthful outcome choices in the first viewport.
  Record creation/refresh, history, event update, private evidence paper and
  event trail remain available behind one closed `Records, updates & evidence`
  disclosure. Desktop retains the complete open workbench. Parties, terms,
  evidence events, derived outcome truth, permissions, privacy, APIs and the
  non-custodial GSN boundary remain unchanged.
- When a stage or lane opens, unrelated stages and lanes must visually step back until the user
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

## DemandBoxPage

Purpose:
Let one member publish and manage a personal need inside a selected community,
then deliberately ask GSN to check another authorised community when current
same-community supply has no plausible match.

Must show:
- the selected community context;
- one clear `Post a need` action and one secondary `Ask a question` action;
- governed queue lanes and the member's own open requests;
- current same-community supply matches when available;
- on the requester's own open community-visible request, one compact
  `Expand search` card only after the supply check succeeds with zero current
  matches;
- a clear fulfilled/cancel path;
- relay policy controls only for authorised community owners/admins.

Rules:
- On phone, the first surface asks only `What do you need?`, then shows
  `Post a need`, `Ask a question`, the `Yours` and `For you` counts, and the
  selected community. Do not repeat route buttons, state cards, technical
  relay explanations, or implementation status on that first surface.
- The queue exposes only `All`, `For you`, and `Yours` first. `Tagged`,
  `Questions`, `Urgent`, and `Need types` remain reachable behind one
  `More filters` disclosure. All direct `?queue=` routes remain supported.
- Phone request cards start closed with title, urgent status when applicable,
  requester/owner context, area, and one `Open` action. Opening another card
  closes the previous card. The open state must retain supply matches,
  contact/copy actions, fulfil/cancel controls, privacy and evidence details,
  and governed expanded search.
- The create form shows only need, type, area, and Community/One person
  visibility first. The matched-person chooser appears only for One person.
  Explanation, WhatsApp override, urgency, payment, requested proof, expiry,
  trust-credit preference, and one-hop search consent remain behind one
  `More options` disclosure.
- A demand remains owned by the personal requester GSN ID. Community or
  Community Domain context does not become the requester.
- `Expand search` must reuse the existing explicit per-request one-hop relay
  consent and community inbound/outbound policy. It must not create a second
  discovery engine.
- The action itself may grant consent only when its nearby copy plainly says
  that GSN is being authorised to check another permitted community for this
  request. Consent must remain withdrawable.
- Do not show the no-match card when the supply check failed or is still
  loading. Failure is not evidence that no supply exists.
- Do not offer expanded search for private Ask Person requests.
- Do not describe one-hop relay as public, network-wide, radius-based, nearby,
  guaranteed, recommended, approved, or paid search.
- Do not expose candidate communities, providers, private identities, or
  supply details before a legitimate bridge accepts.
- Exact location, GPS, postcode-distance matching, 10/20-mile radius, pricing,
  refunds, and no-match charging remain outside this screen until backend
  contracts and provider consent exist.
- Hide community relay policy administration from ordinary members. Keep it
  collapsed as `Community search settings` for authorised owners/admins, and
  keep expanded search attached to the relevant personal request rather than
  exposing it as a competing page-level tool.

## FinancePage

Purpose:
Show the member's cumulative money story and permitted finance records across
communities.

Must show:
- plain finance summary first
- major finance lanes such as Money Summary, Money In, Money Out, Banking
  Rails, Records / Events, Signals / Readiness, and Pipeline Credits
- Secondary route tools such as Payout Details, Pipeline Credits, and Trust Passport
  may remain visible only as compact linked tools, not as competing major Finance lanes.
- clear route back to the originating marketplace or Dashboard

Rules:
- Finance must guide the user through one money lane at a time.
- The Finance front desk must explain that GSN Finance is evidence and
  coordination infrastructure, not a bank, lender, wallet custodian, payment
  processor, or promise that money will move.
- Do not expose every route, event table, signal, and payment tool as equal
  first-screen choices.
- Marketplace-local finance may be summarized when the user arrived from a
  selected marketplace, but the full one-community operating lane remains
  Marketplace-owned.
- Deep finance records and secondary tools should appear only after the user
  opens the relevant lane.
- On phone, the default front door shows the current finance state, four compact
  money facts, one primary `Review money` action, and one collapsed
  `Choose another task` disclosure. The richer quick snapshot is desktop-only.
- Canonical Finance lane ownership remains Money Summary, Money In, Money Out,
  Banking Rails, Records / Events, Signals / Readiness and Pipeline Credits,
  but the member-facing chooser must use direct words: `Money in`, `Money
  out`, `Payment setup`, `Money history`, `Payment status`, `Support money`,
  `Support readiness` and `Service credits`. The visible label may change; the
  existing route, stable action ID and financial meaning must not.
- Opening a phone detail lane replaces the front door until the member uses the
  visible `Back to tasks` control; closed deep panels must not form a card stack.
- Pipeline Credits is a pricing/planning lane for base access plus prepaid usage value.
  It must not imply GSN lends money, holds customer funds, approves credit, or
  exposes a real spendable wallet balance before backend entitlement accounting is
  intentionally designed.

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
- On phones, the lane chooser uses short labels and no repeated active-lane explanation. The cross-community portfolio stays behind one compact `Communities` disclosure so the selected trust lane reaches the surface sooner.
- The first read must use direct member language: `Your trust evidence`,
  `Overall evidence`, `Main community`, `Communities included`, and `Next
  step`. Internal aggregate/primary-anchor contracts remain valid, but those
  implementation terms must not be required reading. The page and copied
  snapshot must still distinguish evidence combined across recorded
  communities from the separately shown main community; simpler words must
  not turn one community into the whole judgement.
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
  marketplace, but the full carried evidence story belongs here.
- Identity & Community Overview is the first One-Screen Snapshot Protocol application. It
  must fit its title, four identity facts, six compact status signals, and the
  public community record action inside one 390x844 phone snapshot without
  tall warning cards or decorative height.
- Identity & Community Overview must keep the member photo unobstructed, dock any trust
  seal away from the face/evidence image, and include a direct `Complete ID
  checks` path when the snapshot is showing unfinished identity requirements.
- `Complete ID checks` must open real completion paths or a compact chooser
  that says which missing evidence can be completed now. It must not route to a
  general identity-explanation page while implying phone, community, bank, or
  official-ID checks can be finished there.
- Identity & Community Overview should behave as a portable official package: screenshot,
  print, or PDF framing must not require visible pieces of the previous or next
  Trust Passport section to make sense.

Current pre-redesign Trust Passport section mapping:
- Identity & Evidence Reading: Identity & Community Overview, Current evidence reading, and what this evidence helps the recipient decide.
- Evidence Story: Why the evidence reads this way, What changed in the evidence, and Evidence & institutional context.
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
- Starting a signed-in phone check must not overwrite the member's current
  phone or verified-phone timestamp. Attach the new number only after the
  provider (or explicit controlled-preview check) approves the code, and keep
  resend behind the same ownership, rate-limit, provider, and Pipeline Credit
  boundaries.

## CommunityConfirmationInboxPage

Route: `/app/community-confirmations`.

Purpose:
Give a signed-in eligible responder one calm place to answer live community
confirmation requests from personal knowledge, while keeping reviewer work and
contact preferences available without turning the first surface into an
operations dashboard.

Must show:
- one compact `What needs your answer?` summary
- pending, instant-pulse, and relay-request counts
- one state-aware first action: `Review first request`,
  `Answer this request` for a focused notification, or
  `Refresh inbox` when nothing is waiting
- the existing request identity, purpose guide, aggregate response reading,
  private-note field, TrustSlip route, and full response-choice inventory
- refresh and protected copy-summary controls inside a closed
  `Inbox tools` disclosure
- reviewer queue, assignment, evidence, SLA-marker, and resolution controls
  inside a closed `Review cases` disclosure
- relay opt-in, instant-pulse preference, and policy route inside a closed
  `Relay settings` disclosure
- clear empty and expired-or-completed focused-request states

Rules:
- Preserve `request_id` notification focus and `case_id` reviewer focus.
  A focused review case may open its reviewer disclosure automatically; an
  ordinary queue count must not.
- The first action may reveal and scroll to an existing request. It must not
  answer, approve, certify, resolve, or otherwise mutate a request.
- Every response remains the signed-in responder's personal evidence, not a
  whole-community vote, parent-community certification, identity guarantee,
  payment confirmation, credit approval, or release authority.
- Keep private contact information, private response notes, and protected
  witness details out of copied or public output.
- Preserve the existing authenticated inbox, self-service relay-setting,
  response, reviewer-assignment, evidence, resolution, and policy contracts.
  Backend permission checks remain authoritative.
- Keep all existing response choices visible once a request is deliberately
  reviewed. Do not hide caution or objection behind a positive action.
- Do not restore the exposed explanation panel, reviewer controls, relay
  settings, or copy tools above the request task.

Primary action:

```text
Review first request
```

Focused notification:

```text
Answer this request
```

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
- On phones, show the Community ID before the display name, reduce the public reading to one plain summary, and expose only one primary Ask community action when controlled confirmation is available.
- Keep Copy record link inside the Verification snapshot drawer so it does not compete with the first safe action. Hide repeated masthead-brand and authority-strip layers on the phone first surface.
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
- On phones, keep the compact credential answer and four primary facts first,
  place Copy credential link and Open community record immediately after that
  answer, and keep community evidence, audit detail, secondary facts, privacy
  notes, and QR sharing behind disclosures.
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


## TrustSlipPage

Purpose:
Let a signed-in holder generate and share a public TrustSlip for one chosen purpose and one chosen community context.

Must show:
- a short setup-first panel before the full paper
- Decision Pack/purpose choice
- community/scope choice
- one generate/refresh action immediately after those choices
- the full TrustSlip paper only after generation or an explicit open-current action
- copy/share and public-code verification controls inside the revealed paper

Rules:
- The default first view must not expose the full TrustSlip document.
- Use the sequence: choose purpose, choose community, generate or refresh TrustSlip, then copy/share.
- On phones, hide repeated selected-purpose/helper sentences. Keep Generate as the only dominant setup action; when a usable paper already exists, show one small `Open current` secondary action and keep sharing inside the opened paper.
- Do not expose private Trust Passport evidence on the public TrustSlip flow.
- Opening the current paper is allowed when a TrustSlip code already exists, but generating after changing purpose/community remains the clean path.
- Once the paper opens, show the official summary plus one active pack; do not expose holder, community, evidence, confirmation, limits, and action panels as one long stack.

## TrustSlipVerifyPage

Purpose:
Public TrustSlip evidence paper for checking a current TrustSlip code, visible
trust reading, community context, and careful next action.

Must show:
- public reading that separates TrustSlip validity, supporting scoped community
  evidence, and next safe reader action

Rules:
- On phones, lead with one decision answer, no more than two short reasons, and one recommended next action. Hide the duplicate evidence snapshot and behaviour-pattern stack inside Full evidence and record details.
- The public first read must use direct reader language: `Public TrustSlip`, `Check this TrustSlip`, `What this record says`, `Why this answer`, `What to do next`, and `Limits of this check`. `Decision Pack` and evidence-profile terminology may remain in internal contracts, but must not be required to understand the public result.
- Visible disclosure wording may change without changing its stable action/debug identity. The `full-evidence-and-record-details` and `audit-details` identifiers remain compatibility contracts even when their reader-facing labels are simplified.
- Public links that already contain a code must open directly into the paper. The code-entry route must expose one code field and one primary check action without unrelated welcome/guide buttons.
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

Shop Diary status:
CLOSED/FROZEN as of 2026-10-08, with the owner-approved outward sharing bridge completed and re-frozen on 2026-10-15.

Shop Diary contract:
- Shop Control owns owner-side Shop Diary creation as short text updates, latest activity, safe same-shop confirmed Trade Evidence selection, and the optional `Promote this update` handoff to the canonical Spotlight publisher. Diary pictures/videos are disabled for now; product media belongs in Products & Services until a governed preset media workflow exists.
- Public Shop owns visitor-facing Shop Update presentation: one current live text message only, automatically cleared from the public shop face after 24 hours, then distinct Products & Services. Historical diary/audit records remain preserved in owner/evidence trails, not replayed on the public shop face.
- Every owner-created update that is still public and inside the 24-hour live window may expose one `Share update` action. It must share that exact diary entry, open WhatsApp/phone/social handoffs for owner review, preserve the chosen channel in attribution, and never auto-post or claim delivery. Private, inactive, expired, and `GSN insight` entries must not expose this public share action.
- Diary entries are chronological shop activity history, not products/services, paid placement, Spotlight ranking, TrustSlip evidence, analytics inference, or formal transaction workflow.
- Ordinary owner-created entries default to `Owner update`; owner-requested `system_recorded` must not self-assert system truth; stronger confirmation requires a same-shop confirmed Protected Trade.
- Unscoped, cross-shop, unauthorized, unconfirmed, malformed, and missing evidence links must fail server-side, not only in the frontend.
- Promotion from a diary entry may prefill the Spotlight publisher for owner review, but must not auto-publish, bypass quota/payment rules, change evidence class, change chronology, or alter Spotlight ranking.
- Entries are create-only in the frozen contract. Edit, hide/archive, delete, and downstream Spotlight mutation after a diary entry changes remain explicit future lifecycle debt.
- On Public Shop, the exact authenticated owner may see one compact 48px `Add diary entry` plus beside the Shop Diary/Shop Update heading. It opens the existing Shop Assets Diary form with the current community and origin/back path, performs no write on open, and replaces the redundant empty-state add action. Visitors and non-owners do not see it. Delegated editor exposure remains unavailable until a shop-scoped editor authorization contract exists.
- Products & Services remain separate from Shop Diary. Each product/service card keeps its internal open `+` that becomes `×` when opened. Only the exact signed-in shop owner may see one separate 48px media-management `+` inside the expanded action dock after Close, Share, and Repost. It opens the existing Shop Gallery Tools lane on that exact product/block, where Change media or details and Delete permanently are the first decisions. Permanent deletion requires owner confirmation, removes the product row and reposts, retires its Vault payload/access and linked Spotlight delivery, queues only canonically unreferenced GSN-managed media for bounded retry, preserves minimal immutable trust/commercial/exposure evidence with the deleted catalog link detached, and offers no restore path; the owner uploads a new item if it is needed again. The same exact-owner permanent-delete contract applies in Vault Control. It performs no write on open, stays hidden on closed cards, never opens/plays media, and never appears to visitors or non-owners. Do not place it as a floating media overlay.
- When Shop Gallery Tools is opened through that exact product-management `+`, it is a focused task: open the requested block immediately, show only Change media or details and Delete permanently as the first decisions, and hide the generic Shop Gallery introduction/shortcuts, numbered-block chooser, quick Add, Copy, and Repost controls. The top return action goes to that exact Public Shop product/block. Choosing Change opens the existing editor with plain `Save changes` / `Close form` actions; the unrelated Copy shop link action stays hidden in this focused editor. After a successful save, show `View updated product` beside the result. After permanent deletion, keep the emptied block and deletion result visible and offer `Back to public shop`; re-upload remains available in the same block.
- Ordinary Shop Gallery entry retains a short introduction and three plain-language shortcuts, then exposes only the Products & Services task. User-facing copy says `shop items` and `shop spaces`; `block` and `numbered block` remain internal contract terms and must not lead the ordinary owner experience. Choosing `Write shop update` opens only the existing Shop Diary task; `Change shop picture` opens only the existing picture editor as a focused task; `Add more selling space` retains the existing paid-capacity contract but presents it as `More shop & community space`, with plain choices, prices, payment-reference guidance, ROSCA support, and meeting support. The standalone Pictures & Products route retains its complete multi-section owner workbench but labels it in owner language: manage the shop, see items at a glance, follow the simple starting order, add a shop or Vault item, and review saved items. Marketplace Shops policy alone controls product Add/Edit/Save; disabling Shop Diary must not disable product management. On phones, an Add/Save/Delete result or blocked quick-add must reopen the affected numbered block and return focus to its visible result; a successful operation must not appear inert because its disclosure closed during refresh. A successful ordinary public-product save exposes one `View product in public shop` continuation to that exact saved product/block; it stays absent for failed saves, permanent deletions, and submissions still awaiting review.
- New product, Vault, Community Notice, and Spotlight video publishing uses the shared GSN Media Quality Gate v1. The browser should reject obviously unreadable or technically unusable files early, but the backend is authoritative and must inspect the real file rather than trust the filename, declared MIME type, or client-supplied duration. Members are not required to know or manually meet the public clip duration: a supported phone browser prepares the clip locally when possible, and otherwise sends a bounded source of up to 100 MB to the authenticated server. The practical hard-rejection floor is a playable source at least one second long, at least 360 pixels on its short edge, at least 15 frames per second, and no wider/taller than a 2.4:1 ratio. A usable 576x1296 downloaded social portrait is accepted; GSN must not require 720p merely because a clear source falls below HD. The backend physically keeps only the opening 10 seconds, produces an output no larger than 15 MB in MP4/H.264 with web-safe pixel format and fast-start metadata, caps the long edge at 1280 without upscaling, and applies modest AAC loudness normalisation when audio exists. Preparation improves compatibility and consistency but cannot recreate missing visual detail, invent content, or become an AI/video-editing tool. Silent product video remains valid.
- Every verified video receives `GSN Clear Finish` automatically through conservative denoise, brightness/contrast/saturation and mild sharpening before publication. This shared preparation is non-generative: it must not recreate missing detail, hide condition, or materially change product colour, shape or identity. The optional branded `GSN Natural Finish` remains a separate seller choice.
- Every current product-photo upload must use the authenticated GSN image route and receive `GSN Clear Finish`: EXIF orientation correction, no upscaling, a 1920-pixel maximum long edge, a conservative brightness/contrast/colour/sharpness adjustment, metadata removal, and web-ready JPEG or transparency-preserving WebP output under 4 MB. The finish must not generate or invent detail, hide product condition, materially change colour/shape/identity, or imply GSN endorsement. The response must identify the source/output dimensions, formats and bytes. Legacy direct R2 presigns are not part of this verified contract until a post-upload worker can inspect their stored objects.
- New publishing must use a GSN-verified managed video created by that upload route. Pasted/external video URLs, direct local PUT, and direct R2 PUT must not bypass inspection. Existing legacy video may remain readable and may survive an unchanged edit, but changing or newly publishing video requires a verified upload. Owners must be able to remove an existing video without replacing it.
- Every existing GSN video-selection surface uses one shared optional `Add sound` editor. A member may choose a supported audio file or record up to ten seconds, preview and remove that sound, then choose `Add over video` or `Replace video sound`. Upload remains blocked until the member confirms they created the sound or have permission to use it. The authenticated media service physically mixes or replaces the audio, applies bounded loudness normalisation, and verifies the prepared MP4 contains audio. This first version must not expose a built-in popular-music catalogue; music licensing and rights management remain a prerequisite.
- Video guidance should tell members how to prepare before recording: clean the lens, use good light, hold the phone steady, keep the product centred, and choose a quiet place. Rejection messages must say what failed and the first corrective action. The gate guarantees measurable technical minimums; it does not claim to understand whether lighting, composition, speech, or the product demonstration is subjectively good.
- Shop Control Free Spotlight and Subscription Spotlight may offer the optional `GSN Natural Finish` on a selected video. It must use the existing authenticated server media route, require the seller's own shop, offer only five or ten seconds, show the finished output for review before publish, and let the seller turn it off. The finish may apply conservative denoise, brightness/contrast/saturation, mild sharpening, lower bitrate, and a GSN-labelled lower third derived from the saved shop name, public WhatsApp contact and managed shop logo. It must remain under 4 MB, say `Presented through GSN`, and must not alter product identity/colour/shape/condition, invent detail, imply endorsement, or change Spotlight serving, pacing, payment or entitlement rules. Ordinary video upload behaviour remains unchanged when the option is off.
- A live owner-inspection Spotlight card on Public Shop shows the live label and content title without repeating start/expiry timestamps or the owner-exposure disclaimer. Shop Control remains the truthful timing and lifecycle-management surface; serving and exposure rules do not change.
- Keep the Public Shop Vault card concise: `Private Vault`, `Owner invitation only.`, `Request access`, and `Copy request`. The request and copy handlers remain distinct and unchanged.

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
- Exact `Share update` links are the explicit exception to the ordinary public-shop-root rule: they must include `diary_entry_id`, open `#shop-diaries`, and resolve only while that same entry remains public and live. An expired or hidden entry must not leak its text through the public API or social-preview card.
- Private Vault Access
- Grow Trusted Circle
- Owner Spotlight Status

Owner-approved 2026-10-26 first-view correction:
- On phone, show the shop name and one state-aware `Your next step` before all
  secondary routes. Do not repeat the same state as hero badges, an action
  title, and large cards.
- Keep the five required first-level routes, but present them as compact action
  rows using member language: `Your public shop`, `Shop items`, `Shop
  activity`, `Shop promotion`, and `Shop update`.
- Shop Update must not display the number of public products as a Diary/update
  status. When no authoritative Diary count is loaded, invite the owner to
  `Write a short message` instead of inventing a count.
- Keep private offers, paid promotion, cross-community promotion, extra space,
  and trade records behind the closed `More shop tools` disclosure. This
  correction changes no route, action inventory, permission, backend data,
  Spotlight lifecycle, payment, quota, serving, or pacing behavior.
- Shop Details (`#shop-control-details`) must use the state-aware heading `Set
  up your shop` or `Change what customers see`. Show shop name, WhatsApp number
  and the optional description first. Keep Telegram reachable behind one
  closed `More contact options (optional)` disclosure.
- A new owner must see one primary `Save shop` action before product
  management. Once the shop exists, use `Save changes` and expose `Manage shop
  items` as the secondary continuation. Do not call these details a billboard
  or system record in member-facing save feedback. Stored fields, API payload,
  review behavior, routes, permissions and field inventory do not change.
- Shop Activity (`#shop-control-counts`) must not expose the complete report
  before an owner can understand the current reading. On phone, lead with one
  plain-language reading, last-seven-day `Visitors`, `Item opens`, and `Contact
  taps`, one state-derived `Your next step`, and the boundary that these GSN
  activities do not prove a sale or payment.
- Keep the picture-led Shop Health summary, six analytics sections and seven
  Opportunity Engine sections intact behind one closed `See activity details`
  disclosure on phone. Desktop may keep that report open. Do not delete or
  change calculations, source data, panel routes, Attention Spine behavior or
  Dashboard Market Wisdom while simplifying the first surface.
- Shop items (`#shop-control-gallery-tools`) must lead with the actual item
  task on phone: the `Shop items` heading, current filled-space count, and one
  `+ Add item` primary action. Keep the numbered `Your shop items` shelf closed
  until the owner requests it.
- Move the shop-picture, shop-update, and extra-selling-space shortcuts after
  the item task and keep them behind one closed `Other shop tasks` disclosure
  on phone. Desktop may keep that disclosure open. Preserve all numbered
  spaces, add/edit/delete/copy/repost actions, exact-product focus, media
  preparation, Diary separation, routes, permissions and backend contracts.
- Shop picture (`#shop-assets-picture`) must be a focused reuse of the
  existing picture editor. On phone, show the current preview, `Choose a
  picture`, the existing file field and one primary `Save picture` action.
  Keep the pasted public-image URL behind closed `Use a picture link instead
  (optional)`; retain reset and remove-picture actions and return to Shop
  items. Do not expose the wider shop-details form, Shop items, Shop Update,
  Vault or the standalone workbench beside this focused task.
- The focused picture hash corrects the prior broken handoff to Shop Details,
  which has no picture control. Preserve the existing shop-image
  save/remove payload, stored shop information, upload preparation, policy
  gates, permissions and backend contracts. The standalone
  `/app/shop-assets` workbench remains complete and unchanged.
- More selling space (`#shop-control-community-packages`) must be a focused
  task rather than the whole paid-tools page. Lead with `More shop & community
  space`, the unchanged GBP 60/year ROSCA price and GBP 1 other-choice
  boundary, the four existing purchase choices, and any current payment
  reference/proof action. Do not place Vault, visitor verification, or
  Subscription Spotlight cards before or beside this focused task.
- Keep current entitlements behind phone-closed `What you already have`.
  Keep the complete ROSCA cycle/payout and meeting reminder/interest/
  attendance/summary tools behind phone-closed `Use purchased services`.
  Desktop may keep both disclosures open. Preserve package codes, prices,
  bank-reference/proof flow, confirmation, entitlements, Presence Evidence,
  permissions, API calls and backend contracts.
- Private offers (`/app/vault-control`) must use `Private offers` as the phone
  task name and derive one `What to do next` reading from authoritative paid
  space, private-product and private-link state. No paid space leads to
  activation; paid but empty space leads to adding an offer; a saved offer
  leads to creating its link or managing an existing active link.
- On phone, order that relevant panel directly after the compact shop identity
  and start only that panel open. Keep activation, payment, private-space,
  exact-offer link and short process-reminder panels reachable. Desktop keeps
  the complete workbench. A missing link must never be classified as active.
- Preserve quote-agreement/payment-confirmation separation, GBP 5 pricing,
  two-space maximum, bank reference and transfer-receipt upload, product media quality gate,
  permanent deletion, exact private-link scope, copy/share/open/extend/revoke,
  identity and Community Domain gates, action/field inventory, API calls and
  backend contracts.
- Paid promotion (`/app/shop-control/subscription-spotlight`) must use
  `Paid promotion` as the phone task name and derive one `What to do next`
  reading from authoritative live-promotion, ready-credit, open-payment or
  activation state. A live promotion leads with its wait state; a ready credit
  leads with creation; an open payment leads with bank transfer/receipt; all
  other usable states lead with plan choice.
- On phone, order only that relevant stage directly after the compact identity
  and keep the complete other stages reachable behind closed disclosures.
  Desktop retains the complete Subscription Spotlight workbench. The required
  composer asks `What are you promoting?`, then asks for a picture or short
  video, and keeps optional sound and automatic finishing inside closed
  `Video options`.
- The main composer action must remain visible and truthful: for a video with
  automatic finishing enabled it says `Prepare video preview`, preserves the
  mandatory review, then becomes `Publish paid promotion`. Preserve all
  pricing, quote agreement, bank instructions, receipt upload, confirmation,
  paid-credit, identity/domain, one-live-run, media, authoritative persistence,
  serving, pacing and exposure contracts.
- Shop update (`#shop-assets-diary`) must use the member-facing `Shop
  update` name and lead with one direct question, `What should visitors
  know?`. Keep the text box and `Publish update` action in the first task
  view. Put activity type, date, related item and confirmed Trade Evidence
  behind `More details (optional)`; keep `Recent updates` closed on phone
  and open on desktop.
- Do not expose the internal `Shop Diary` name in this focused owner task.
  Preserve the text-only update rule, 24-hour public visibility, sharing,
  history, confirmed-evidence safeguards, review-before-Spotlight handoff,
  product/update separation, routes, permissions and backend contracts.

Rules:
- Identity-lock and protected-shop-action blockers must explain why Shop
  Control waits for GSN identity confidence before public shop, Vault,
  Spotlight, merchant-verification, or outward sharing actions can run.
- Ordinary public shop link surfaces must show and copy the complete canonical public shop root URL, including the public domain and `/shop/{GSN_ID}`. Do not add `#shop-diaries`, product, block, focus, or community query hints to ordinary public share links.
- Explicit legacy/deep-link handling may still reveal a shelf or product after the full public shop loads, but it must be separate from default ordinary public sharing. Vault/private access links remain exact private targets such as `/vault/{token}`.
- Join invite link surfaces must show and copy only canonical `/start/join/{code}` invite URLs. They must not fall back to unrelated app routes such as Finance, Dashboard, Trust, or Marketplace.
- Recipient, inviter, community, marketplace, note, and duplicate invite metadata belong in the human-readable share message or the server-resolved invite record, never in the copied URL query string. The invite code remains the only public URL credential; Join Entry must resolve authoritative context from the backend preview.
- Ordinary outbound invite copy must contain only one personal invitation line, one accurate next-step line, and the canonical link. Native share payloads must send the text and URL separately so the receiving app does not get a duplicated URL.
- Preserve the recipient, inviter, and community names when known. A genuine personal note may add one short line; default instructions must not be repeated as a note.
- Keep identity disclaimers, community IDs, marketplace IDs, QR-policy labels, admission explanations, and promotional GSN paragraphs on the authoritative Join Entry surface rather than in the forwarded message.
- Plain WhatsApp messages cannot hide a URL behind custom anchor text. A branded hostname requires a separately configured GSN custom domain; until then, the canonical host remains visible even though the path is short.
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
- On phone, Public Shop shows shop identity, category, GSN ID, community, Share,
  Verify, WhatsApp, and Products & Services first. The brand bar and repeated
  status strip, and installation prompt stay off the first surface. Share and
  Verify are secondary; WhatsApp is the single primary contact action.
- Public-facing product counts, focused-product labels, and shared-product
  messages say `shop item` or `shop items`; `block` remains an internal route
  and data-contract term. Owner Spotlight states explain what happened in
  direct language such as `All showings used`, `Needs correction`, `Expired`,
  or `Not showing`, without exposing delivery-counter, presentation, placement,
  or cache terminology.
- Products & Services cards keep their media unobstructed: the `+` open control
  lives in the lower action dock, changes to a literal `×` when the card is
  open, and must not use a globe or commerce object as a close metaphor. Video
  sound may remain over the media only as a compact speaker control without a
  large white capsule. For the exact signed-in owner only, the expanded dock
  also ends with one separate media-management `+`; it routes the exact
  product/block to Shop Gallery Tools and must not replace the open/close
  control or appear over the media.
- Keep follow/owner controls behind one closed `Shop options` row. Keep Spotlight,
  Private Vault, and Shop Update behind `More from this shop` after Products &
  Services. When a live Spotlight is returned, that row opens automatically and
  identifies the live Spotlight so the paid/network placement cannot look
  disconnected. When there is no live Spotlight, it stays closed. Explicit deep
  links must still reveal their target.
- Inside that existing owner-only secondary surface, one compact 48px `Add Spotlight` plus may sit beside Spotlight. Authoritative state `none` hands off to the existing creation workflow; every existing campaign state hands off to the existing manage/correction workflow. Community and origin/back context must survive. Opening it cannot publish, replace, pause, debit, reset expiry, consume allowance, issue a promotional opportunity, or count exposure.
- On an ordinary authenticated visit to the member's own Public Shop, keep the owner's exact live inspection outside exposure accounting but also rotate eligible Spotlights from other members in the viewer's shared communities through the canonical presentation contract. Never replace the whole community feed with only the owner's item. Explicit owner Preview stays pinned to the owner's item and must issue no community delivery request.
- Give a small ordinary Public Shop Spotlight queue (up to 24 unique items) a five-second readable dwell. From 25 items, shorten the dwell gradually against a two-minute cycle target, but never below two seconds; 60 items therefore receive two seconds each. The server remains responsible for relevance, eligibility, diversity, frequency, and pacing: it issues at most one fresh canonical presentation at a time and returns only a bounded replay set, so a larger raw inventory must not be dumped into the browser. After a canonical member presentation qualifies visibly and the server accepts that qualification, request at most one next canonical presentation and append it while its lease is current. Do not prefetch a multi-item delivery batch, do not use legacy broadcast rows after an authoritative v2 response, and do not erase still-current canonical rows merely because a periodic refresh is empty.
- Treat each bounded Public Shop queue as a one-pass window: after one complete eligible dwell, remove that queue occurrence instead of wrapping immediately to its beginning. Advance adjacent server visibility windows deterministically and use recent qualified replays only for unfilled slots, so a larger live inventory reaches the phone before early items repeat. Do not begin a canonical row that has less than one standard readable dwell remaining on its server deadline; reduced-motion presentation may remain longer but must still obey the server deadline.
- Issuing a canonical Spotlight presentation creates one bounded 30-second reservation; it does not spend one of the campaign's ten delivery rounds. Only one current reservation for that campaign version may exist globally. The server consumes the delivery round, records the qualifying exposure, and marks the lease qualified in one transaction only after accepting the one-second, 60%-visible, active-tab contract. An expired unqualified reservation spends no round, and that same viewer must not repeatedly reacquire the abandoned campaign version; another eligible viewer may receive a later reservation. Commit failure, withdrawal, replacement, expiry, replay, and owner preview must not create partial accounting.
- Issuing a canonical Spotlight presentation creates one bounded 30-second reservation; it does not spend one of the campaign's ten delivery rounds. Only one current reservation for that campaign version may exist globally. The server consumes the delivery round, records the qualifying exposure, and marks the lease qualified in one transaction only after accepting the one-second, 60%-visible, active-tab contract. An expired unqualified reservation spends no round, and that same viewer must not repeatedly reacquire the abandoned campaign version; another eligible viewer may receive a later reservation. Commit failure, withdrawal, replacement, expiry, replay, and owner preview must not create partial accounting.
- Once that presentation has already qualified, the server may return it to the same authenticated viewer as a bounded canonical replay while its campaign is waiting for the next persistent pacing window, after its fresh-delivery budget is exhausted, or when no fresh presentation was selected and that exact still-live campaign is suppressed only by this viewer's normal frequency cap or exhausted DemandBox override. A due frequency-capped replay must not accompany a successfully selected fresh presentation. The replay is tokenless and must still pass exact placement/community-route, membership, self-exclusion, availability, lifecycle, content-version, and pacing-state checks. Each response receives only a short replay lease and ends at the earliest applicable replay, future-pacing, or lifecycle deadline; periodic renewal must re-run those checks. Replay must create no delivery round, presentation lease, qualifying exposure, or owner-facing Spotlight impression. This continuity rule cannot manufacture additional unique eligible campaigns.
- Counted delivery and live visibility are separate. When no fresh counted lease or qualified same-viewer replay fills the bounded Public Shop response, an otherwise live, media-ready, community-eligible campaign may appear as a short-lived tokenless canonical visibility row even while pacing or the viewer's counted frequency cap blocks another counted showing. It must revalidate exact route/membership, self-exclusion, availability, lifecycle, placement, and content version on every renewal, and it must create no delivery round, presentation lease, qualifying exposure, or Marketplace attention event. Backend candidate scanning remains memory-bounded and rotates across larger inventory. A failed refresh keeps only still-current content and uses a bounded retry; only an authoritative successful empty response may establish the ordinary empty cooldown. No legacy broadcast fallback, self-delivery, or cross-silo discovery is allowed.
- Public Shop `Product opens` analytics use the same visible-attention threshold without creating a Spotlight-style allowance or reservation system. Expanding or fetching a product card alone does not count. The expanded product media must remain at least 60% visible in an active browser tab for one continuous second; the analytics endpoint rejects `product_open` events without that evidence and keeps its existing daily viewer/product dedupe. This remains weak attention evidence, not proof of a buyer, sale, payment, delivery, endorsement, or trust.
- Public Shop `Product opens` analytics use the same visible-attention threshold without creating a Spotlight-style allowance or reservation system. Expanding or fetching a product card alone does not count. The expanded product media must remain at least 60% visible in an active browser tab for one continuous second; the analytics endpoint rejects `product_open` events without that evidence and keeps its existing daily viewer/product dedupe. This remains weak attention evidence, not proof of a buyer, sale, payment, delivery, endorsement, or trust.
- Ordinary Public Shop visits must not automatically jump past identity and products to Shop Update.
- An exact shared-update link with `diary_entry_id` is a focused visitor task:
  reveal that Shop Update before Products & Services and suppress unrelated
  Spotlight and Private Vault presentation. Ordinary visits remain products-first.
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
- Owner-approved 2026-10-26 phone correction: Shop Control Free Spotlight uses
  member language: `Promote your shop`, `What are you selling?`, `Add a picture
  or short video`, and `How should customers contact you?`. It must not show a
  persistent internal shop-record readiness message. `Check and publish` stays
  immediately after the required composer and remains visible on phone.
  Optional sound and automatic `GSN Natural Finish` controls stay inside one
  closed `Video options` disclosure. There is no separate prepare-finish
  decision: when automatic improvement is on, `Check and publish` prepares the
  video before opening the required review. Recoverable blockers explain the
  first fix on tap, and review retains one explicit final `Publish now` action.
  This changes no media, quota, permission, payment, serving or pacing contract.


Additional Community Domain lifecycle responsibility:
- Same Command Centre page may preview and record Community Domain lifecycle decisions for pilot administration.
- Allowed lifecycle outcomes are `active`, `suspended`, and `closed`.
- Closing or suspending a Community Domain blocks normal operation and public lookup while preserving history and keeping the name reserved.
- This is not a global user ban. Banning/removing a person from GSN identity should remain a separate high-risk account-governance workflow.
- No Community Domain billing/payment instruction should be created by this lifecycle action.

## TrustCommandCentrePage

Purpose:
Give an authorised operator one calm place to see the strongest live operational need and open the matching admin tool without turning the first phone surface into a dashboard dump.

Route:
- `/app/command-center`

Must show on first load:
- existing Command Centre navigation and operator identity
- one always-visible `What needs attention now` recommendation driven by existing live readings
- one primary action for that recommendation
- three compact signal rows: `System and readiness`, `Trust and identity`, and `Money and support`
- three closed disclosures, ordered as `See all command tools`, `Readiness and validation`, and `More operator details`

Disclosure responsibilities:
- `See all command tools` preserves every existing role-authorised Command Centre route and its stable action identity.
- `Readiness and validation` preserves the local validation worksheet, readiness checks, evidence summaries, and existing follow-on actions.
- `More operator details` preserves the deeper live summaries, operator work-path guidance, member/admin layer explanation, and public GSN site action.

Rules:
- Platform-admin and community-admin visibility must continue to come from existing role and route-guard rules; the compact layout must not widen access.
- Existing API calls, recommendation priority, community context, readiness worksheet persistence, and all route destinations remain unchanged.
- Do not restore a duplicate `Where next` action list, a separate exposed command-rule card, or separate work-path/layer sections.
- Do not hide the live recommendation behind a disclosure.
- Do not add backend mutations, change authentication or permissions, or alter the frozen Dashboard Market Wisdom area as part of this surface cleanup.
- On phone, signal rows remain one column and deeper content appears only after the operator opens the relevant disclosure.

## BankConsolePage

Purpose:
Give an authorised finance operator one calm view of the most important bank-record action while preserving protected reconciliation, manual intake, record review, and Community Domain payment-proof workflows.

Route:
- `/app/command-center/bank-console`

Must show on first load:
- existing Bank Console navigation
- one deep-navy `What needs attention now` card
- the selected community and concise counts for recent, unmatched, credit, and expected-payment records
- one primary action that matches the current evidence
- one compact refresh action
- three closed disclosures: `Record a missing bank event`, `Review bank records`, and `Expected payments and proof`

Primary-action priority:
- If no community is selected, open Community Home so the operator can establish the correct context.
- If submitted Community Domain subscription proof is eligible for finance review, reveal the expected-payment proof section before softer reconciliation work.
- If bank events remain unmatched, run the existing reconciliation handler; do not link back to the same Bank Console route while labelling the action `Match records`.
- When no current finance-review pressure is visible, return to Loan Support.

Disclosure responsibilities:
- `Record a missing bank event` preserves the existing amount, currency, direction, reference, description, record-event, and secondary reconciliation controls.
- `Review bank records` preserves the recent-event, unmatched-event, and credit record lists plus their bounded copied review papers.
- `Expected payments and proof` preserves expected-payment visibility, Community Domain subscription metadata, finance-review approve/reject actions, and protected settings review paper.

Rules:
- Reconciliation is recorded matching and review evidence. It is not settlement, proof that money moved, payout approval, or authority to release goods or credit.
- Submitted proof remains evidence for manual finance review and must not become automatic confirmation.
- Community Domain proof approval remains limited to eligible submitted, unconfirmed Community Domain subscription rows and must not approve donations, registrations, event fees, ROSCA, Spotlight, Shop Diary, or ordinary marketplace payments.
- Existing API payloads, finance-review restrictions, stale-context guards, authentication, permissions, route targets, stable action identities, and copied evidence boundaries remain unchanged.
- Do not restore the exposed explanatory blocks, duplicate statistic grid, or repetitive Today/Tomorrow cards.
- On phone, manual inputs and record/proof detail must not appear until the corresponding disclosure is opened.

## AdminCommunityOwnershipPage

Purpose:
Platform-admin Command Centre tool for resolving a blocked community name by assigning a verified canonical owner/admin to the existing community record.

Must show:
- one compact decision summary for the currently selected case lane
- community lookup by name
- owner lookup by member identity signal
- exact community and owner selection
- compact case chooser separating owner repair, steward setup, pilot cleanup, and lifecycle close/suspend decisions
- steward setup preview/record controls for preparing a hidden organisation/community shell before owner acceptance
- pilot data cleanup preview/record controls for cleaning public-facing setup/test data while preserving audit history
- ordinary community lifecycle preview/record controls for active, dormant, or closed status
- preview before mutation
- evidence confirmation checkbox
- lifecycle confirmation checkbox where status is being changed
- reviewer note
- final record action
- history-preserved boundary language

Rules:
- Route is `/app/command-center/community-ownership` and must remain platform-admin only.
- The first surface must present four stable case lanes only: `Owner repair`, `Steward setup`, `Pilot cleanup`, and `Lifecycle close`.
- Show only the selected case lane's work area. Do not expose steward setup, pilot cleanup, both lifecycle forms, both ownership forms, and ordinary owner repair together in one long operator page.
- Inside `Owner repair`, require an explicit `Community` or `Community Domain` scope before showing the corresponding workflow. Inside `Lifecycle close`, use the same two-scope boundary.
- Switching lanes or record scope may hide unfinished fields but must not submit, clear, or mutate them. Existing preview and confirmation rules remain authoritative.
- The case chooser must map each real-life case to the existing engine: owner repair for transfer/release, steward setup for prepared shells, pilot cleanup for public setup/test traces, and lifecycle close/suspend for organisation exit.
- The tool must not delete the existing community, erase prior admins, or remove historical evidence.
- Steward setup can reserve and prepare a hidden ordinary community shell from a supplied brief. It must keep status `steward_setup`, stay hidden from normal member lists, and avoid claiming verified ownership until evidence-checked owner repair releases it.
- Steward setup must not overwrite an active community name, publish the community, delete evidence, remove members, or transfer ownership.
- Pilot data cleanup can close an ordinary community, clear public community/marketplace text, and archive related shops, products, and spotlights when real/test details were used during setup. It must preserve the community record, users, memberships, identity records, trust events, and name reservation; it must not be treated as legal erasure, hard delete, duplicate-name freeing, or evidence that the organisation accepted GSN.
- Ordinary community lifecycle can mark an example/setup community `active`, `dormant`, or `closed`; dormant/closed communities must stop appearing in normal member community lists while the community name, memberships, and trust-event history stay preserved.
- Ordinary community lifecycle must not transfer ownership, remove members, create a Community Domain/payment, or globally ban an identity.
- Preview must be read-only.
- Execute must require evidence confirmation and a reviewer note.
- Successful owner-repair execution records the selected user as `created_by_user_id`, ensures an active admin membership, and logs a trust event for audit.
- If owner repair is executed against a `steward_setup` community, evidence confirmation releases that community to `active`; dormant/closed communities are not automatically reactivated by ordinary transfer.
- If the rightful owner has a recorded onboarding intake but no GSN identity because the duplicate community name blocked account creation, lookup may show that intake as a repair source. Preview must remain read-only; execute must create the missing GSN identity from recorded intake evidence before assigning ownership.
- Redirect aliases may preserve `community_name` and `owner_query` query parameters so Command Centre can open directly to a named pilot case.
- Ordinary visits must not preload a real organisation, member ID, email address, or phone number into owner repair, pilot cleanup, or lifecycle controls. A deliberate query-parameter handoff may prefill the named case.
## SupportPage

Route: `/app/help` (`/app/support-desk` redirects here; `/app/support` remains Loans & Support).

Purpose:
Let a signed-in user ask GSN or their governed admin for help when the app is difficult, blocked, or confusing.

Must show:
- one clear state such as `Help desk`
- Ask for help as the primary action
- compact facts for open cases, waiting admin, waiting user, and resolved cases
- issue type chooser
- short message field
- optional screenshot or picture attachment
- user's recent support cases
- selected case thread with user/admin messages
- clear status and next action

Rules:
- This is app/user support, not Loans & Support, Community Notice Board, or Community Domain governance.
- Do not expose policy, node, reviewer, lineage, or advanced governance language.
- First version is async chat-style support, not live websocket chat.
- Picture attachment is evidence for support review only; it must not become a public record, Trust Passport evidence, payment evidence, or identity verification.
- Keep WhatsApp/email support as a fallback only.
- Action Inbox may notify users about replies or resolution, but the case thread remains the source of support conversation truth.
- On phone, show one short Help desk question, the four case facts in one compact two-column block, and then the Ask for help form. Keep the longer scope explanation off the first phone surface and do not repeat `Ask for help` plus `New support request` as two competing headings.

Primary action:

```text
Ask for help
```

## AdminTrustEventsPage

Route: `/app/command-center/trust-events`.

Purpose:
Give admins a compact review queue for recent Trust Event evidence before they open deeper analytics, graph, or identity-risk tools.

Must show:
- Command Centre navigation
- one compact `What needs review?` summary
- total event count, last-24-hours count, and negative-delta count
- plain warning that a negative delta is a review signal, not proof of wrongdoing
- event type, recorded time, delta, event reference, actor and subject references
- short recorded reason or note
- copyable bounded event snapshot
- source-event details available only after the admin opens them
- deeper analysis destinations inside one compact disclosure

Rules:
- Keep the route admin-only and preserve the append-only Trust Event record boundary.
- On phone, do not repeat the page purpose in a second explanation block or expose all deeper-analysis links before the event list.
- A negative delta must not be presented as guilt, fraud, misconduct, or a final identity decision.
- Copying an event snapshot must retain the existing privacy and authority limitations.
- Raw source details stay closed by default and must use the existing stable per-event action.
- Analytics, Trust Graph, Identity Risk, and Command Centre destinations remain available without becoming competing first-surface actions.

Primary action:

```text
Open source details
```

## AdminIncompleteLoansPage

Route: `/app/command-center/incomplete-loans`.

Purpose:
Give admins a compact selected-community queue for incomplete support items that need a decision, coverage, or time review.

Must show:
- Command Centre navigation
- selected community context
- one compact `What needs attention?` summary
- incomplete-item, ending-soon, and missing-decision counts
- total coverage gap and locked support coverage in one compact block
- a plain warning that locked support coverage is a recorded support position, not proof of cash received or payment made
- each support item's amount, requester reference, status, support decisions, coverage gap, and time remaining
- copyable bounded queue and per-item snapshots
- Support Summary as the primary per-item action
- Copy queue, Operations, Bank Console, and Command Centre inside one compact `Queue tools` disclosure

Rules:
- Keep the route admin-only and scoped to one selected community at a time.
- Do not change the existing incomplete-support endpoint, permission check, or support-record fields for this presentation cleanup.
- This queue does not approve a whole support request, confirm payment or cash receipt, settle exposure, or authorize release of goods or money.
- On phone, do not repeat the page purpose in a second explanation block or expose all queue tools before the support list.
- Keep support and queue snapshots bounded by their existing privacy, evidence, and authority limitations.
- Present one support item at a time as a compact three-fact review: support decisions, coverage gap, and time remaining.

Primary action:

```text
Support Summary
```

## AdminIdentityRiskPage

Route: `/app/command-center/identity-risk`.

Purpose:
Give platform admins a compact identity-evidence queue while keeping phone recovery and duplicate reconciliation available only when the operator deliberately opens those protected tools.

Must show:
- Command Centre navigation
- one compact `What needs review?` summary
- intervention-account, monitor-account, and total-signal counts
- a plain warning that an identity signal is a review prompt, not proof of fraud, wrongdoing, or duplicate identity
- the identity signal queue with user reference, signal count, risk reading, signal type, description, severity, and recorded time
- full per-user signal records available only after the admin opens them
- a compact `How to read identity risk` disclosure
- a `Phone recovery review` disclosure that opens automatically when the sign-in recovery handoff includes a phone or GSN ID
- a closed `Reconcile duplicate identities` disclosure

Rules:
- Keep the route and all identity-risk, phone-lineage, manual-recovery, and reconciliation endpoints platform-admin only.
- An identity-risk signal must not be presented as guilt, fraud, misconduct, or a final identity decision.
- Phone-lineage lookup remains read-only and must not merge, release, verify, or move a phone number.
- Manual recovery reset must retain owner-proof confirmation, reviewer note, stale-phone review where required, activation checks, and one-time temporary-password handling.
- Duplicate reconciliation must remain preview-first. Execute remains disabled until the owner-confirmation control is checked.
- On an ordinary visit, recovery guidance and reconciliation controls stay closed so the identity evidence queue remains the core page responsibility.
- A sign-in recovery handoff carrying `phone_e164`/`phone` or `gmfn_id`/`gsn_id` must surface the recovery tool immediately without weakening its checks.
- Preserve all full-record disclosures and existing evidence/audit history.

Primary action:

```text
Open signal record
```

## SystemOperationsPage

Route: `/app/command-center/system-operations`.

Purpose:
Give a platform admin one live reading of entry-support, bank, incomplete-support,
pool, expected-payment, identity, and system-readiness pressure before opening
the queue or page that owns the work.

Must show:
- Command Centre navigation
- one compact `What needs attention?` summary
- selected community, entry-needing-help count, immediate-queue count, and
  high identity-case count
- one visible state-aware action that opens the matching local disclosure or
  owning admin page
- a plain boundary that queue readings are not proof of wrongdoing, payment,
  settlement, or authority to release money, goods, or credit
- overview, entry support, live signals, operational queues, and next pages in
  closed disclosures

Rules:
- Keep the route platform-admin-only.
- Preserve the existing endpoint scopes, row limits, signal ordering, identity
  photo review controls, correction reason, audit messages, and private photo
  evidence handling.
- Entry records needing help take first priority, followed by missing community
  context, unmatched bank events, incomplete support close to auto-cancel,
  pending pool review, high identity signals, open expected-payment records,
  unhealthy diagnostics, and calm-state review.
- The first action may reveal the existing overview, entry-support, or signal
  disclosure, or navigate to the existing page that owns the intervention. It
  must not itself approve, reject, reconcile, settle, release, or mutate a
  record.
- Do not expose the signed-in operator name or role as operational facts.
- Do not restore repeated explanation panels, an exposed six-tile overview,
  open applicant records, open live signals, or exposed next-page actions.
- Reset the disclosure-storage version when introducing this compact default so
  returning pilot users do not inherit the superseded exposed layout.

Primary action:

```text
Review entry support
```

## AdminTrustGraphPage

Route: `/app/command-center/trust-graph`.

Purpose:
Give a platform admin an honest selected-community relationship-evidence
reading while the product does not yet have a correctly scoped community graph
endpoint.

Must show:
- Command Centre navigation
- one compact `What does the relationship record show?` summary
- selected community, graph-feed status, available evidence-signal count, and
  watch/flagged count
- `Graph feed: Not connected` while no community graph contract exists
- one visible next action: `Review evidence signals` when selected-community
  Trust Events produce fallback signals, or `Read structure limits` when no
  fallback signal is visible
- a plain boundary that relationship evidence is not proof of wrongdoing, a
  complete network map, a final identity decision, or release authority
- structure limitations inside a closed disclosure
- the existing bounded selected-community Trust Event fallback signals inside
  a closed disclosure
- Trust Analytics, System Operations, Exposure, and Command Centre inside a
  closed next-pages disclosure

Rules:
- Keep the route platform-admin-only.
- The active backend `/admin/trust-graph/{user_id}` contract is user-rooted,
  not community-rooted. Never pass the selected community ID as `user_id`.
- Until a separately approved community graph endpoint and payload contract
  exist, do not claim node, relationship, cluster, or centrality totals for the
  selected community.
- Preserve the selected-community Trust Events request, 60-record limit,
  fallback signal classification, ordering, and ten-row visible bound.
- The visible next action may reveal and scroll to the existing signal or
  structure-limit disclosure. It must not write, approve, recompute,
  reconcile, or change a Trust Event.
- Do not expose the signed-in operator name or role as graph facts.
- Do not restore repeated explanation panels, a duplicate five-tile overview,
  or treat zero graph rows as proof that no relationships exist.

Primary action:

```text
Review evidence signals
```

## TrustAnalyticsPage

Route: `/app/command-center/trust-analytics`.

Purpose:
Give a platform admin one selected-community reading of recorded Trust Event
movement before the operator chooses a deeper review page.

Must show:
- Command Centre navigation
- one compact `What does the record show?` summary
- selected community, recorded-event count, built/protected count, and
  weakened/repair count
- one visible next action: `Review recent timeline` when records exist, or
  `Read the guide` when the selected community has no visible record
- a plain boundary that the reading is not proof of wrongdoing, a final
  identity decision, or authority to release money, goods, or credit
- the existing strongest positive and weakened/repair event mix inside a
  closed disclosure
- the existing bounded recent timeline inside a closed disclosure
- reading guidance and System Operations, Exposure, Trust Graph, and Command
  Centre destinations inside one closed disclosure

Rules:
- Keep the route platform-admin-only.
- Preserve the existing Trust Events endpoint, selected-community scope,
  120-record request limit, category classification, date sorting, trend
  comparison, and bounded event lists.
- The visible next action may reveal and scroll to the existing timeline or
  reading guide. It must not write, approve, recompute, reconcile, or change a
  Trust Event.
- Do not expose the signed-in operator name or role as analytics facts.
- Do not restore repeated explanation panels, a duplicate six-tile overview,
  or exposed next-page actions.
- A weakened or repair classification is a review reading from event wording;
  it is not proof of fraud, guilt, misconduct, or a final identity decision.

Primary action:

```text
Review recent timeline
```

## ExposureAdminPage

Route: `/app/command-center/exposure`.

Purpose:
Give a platform admin one selected-community reading of supporter exposure,
stale demand, incomplete support, pending pool review, and unmatched bank-event
pressure before opening the page that owns an intervention.

Must show:
- Command Centre navigation
- one compact `What needs attention?` summary
- selected community, at-risk member count, bounded action-queue count, and
  total exposure reading
- one visible next action: `Review action queue` when queue items exist, or
  `Review pressure details` when the queue is calm
- a plain boundary that exposure is a risk reading, not settlement, release
  authority, evidence of wrongdoing, or evidence that money moved
- concentration and queue pressure inside a closed disclosure
- the existing bounded combined queue inside a closed disclosure
- System Operations, Trust Analytics, Trust Graph, and Bank Console inside a
  closed next-pages disclosure

Rules:
- Preserve the existing exposure formula, pressure thresholds, queue ordering,
  bounded queue size, API payloads, and owning-page destinations.
- The visible next action may reveal and scroll to the existing queue or
  pressure disclosure. It must not approve, reconcile, settle, release, or
  mutate any record.
- Do not expose the signed-in operator name or role as first-surface risk facts.
- The active backend exposure-summary endpoint is platform-admin-only. The
  shared frontend Command Centre parent currently admits `adminOrClanAdmin`;
  until that route/auth mismatch receives an explicit product decision, show
  an honest unavailable state to a caller rejected by the backend and do not
  invent exposure totals.
- Keep intervention controls in the page that owns each queue item.

Primary action:

```text
Review action queue
```

## RevenueAllocationPage

Route: `/app/command-center/revenue-allocation`.

Purpose:
Give an authorised community or platform admin one read-only allocation
breakdown for a selected support item without presenting the record as proof of
payment, settlement, disbursement, or release authority.

Must show:
- Command Centre navigation
- one compact `What needs review?` summary
- current community, selected support ID, review state, and read-only boundary
- one visible support-ID lookup action
- Copy summary only after an allocation has loaded
- the returned amount, service fee, platform revenue, supporter pool, net
  disbursed preview, pool used, support gap, and remaining amount
- field-level returned evidence inside a closed disclosure
- Support Summary, Support Workbench, Finance, Loan Support, Marketplace, and
  Money Out destinations inside a closed next-steps disclosure

Rules:
- Keep the route limited to `adminOrClanAdmin` and preserve the backend
  community-membership/admin check.
- Keep the existing revenue-allocation endpoint and returned-field
  normalisation unchanged.
- The ordinary phone visit must show one lookup action, not duplicate Load and
  Copy controls above and inside the same card.
- Do not expose signed-in member identity or GSN ID as first-surface allocation
  facts; those values may remain in the bounded copied internal summary.
- Open the allocation summary after a successful lookup. Keep field-level
  evidence and next-page destinations closed until deliberately opened.
- Never describe a returned allocation as a receipt, payment instruction,
  settlement confirmation, payout approval, proof that money moved, or
  authority to release goods, credit, or money.

Primary action:

```text
Load allocation
```

## AdminSupportPage

Route: `/app/command-center/support`.

Purpose:
Give platform admins a simple queue for user support cases and replies.

Must show:
- open support queue
- selected case details
- requester reference, community context when available, issue type, status, and last update
- message thread
- attachment metadata and safe links where available
- reply field
- status controls: waiting admin, waiting user, resolved

Rules:
- This is a practical support queue, not a governance decision engine.
- Do not use Community Domain action-review policy/node machinery for ordinary support.
- Admin replies should notify the requester through Action Inbox.
- Resolution should not delete the case or message history.
- On phone, keep the queue and selected case as one-at-a-time task states. Choosing a case opens its thread; Choose another case returns to the queue. Show one short queue question and compact counts before the active state, while the longer governance boundary remains desktop-only.
- Admin can see all support cases; normal users can see only their own cases.

Primary action:

```text
Reply
```

## AdminGsnHouseCampaignPage

Route: `/app/command-center/gsn-campaigns`.

Purpose:
Give platform admins one controlled place to publish an official GSN Spotlight campaign into selected active communities while respecting Community Domain advertising exclusions.

Must show:
- Command Centre header and back navigation
- official `GSN` system-publisher identity, separate from the signed-in admin
- compact active-inventory status with expiry and a manual refresh
- campaign history with status plus separate issued-for-delivery, seen, and unique-viewer counts
- current distinct addressable active member accounts for eligible destinations, explicitly separated from `connected now`, which is not recorded
- a quotation-only paid-repost equivalence using the existing matrix: promotion count x eligible destinations x chargeable days; it must state that no credit or payment moves
- a guarded emergency stop requiring an audit reason and explicit permanent-withdrawal confirmation
- compact per-campaign destination status with a guarded one-community stop requiring an audit reason and explicit confirmation
- searchable community destination chooser using visible community names and codes
- eligible and blocked destination rows, with a plain-language reason for every blocked row
- selected and excluded destination summaries before publication
- one short campaign message shared by the prepared batch
- one public advertiser contact phone shared by the prepared batch
- one required advert-group expiry date and time shared by the prepared batch
- one optional timed delivery mode with an absolute start/end window, named time basis, and interval shared by the prepared batch
- a compact queue of one to ten prepared pictures and/or verified short videos
- read-only campaign preview before publication
- explicit final confirmation that the campaign is official GSN communication and does not endorse a member, shop, or Community Domain
- publication result with published and excluded destination counts
- explicit unpublished-review discard with reference-safe uploaded-media cleanup
- compact governance details explaining the selected group expiry, 24-hour starting default, destination exclusion recheck, audit record, payment-evidence boundary, and non-endorsement boundary

Rules:
- The route and every related API action must remain platform-admin only.
- GSN house promotions form a central inventory and may overlap. This exception applies only to the reserved `GSN-HOUSE` system publisher; ordinary member/shop campaigns retain the one-active-owner rule.
- Publication identity is the reserved non-login system publisher `GSN-HOUSE`; the signed-in admin remains the audit actor.
- On phone, keep the first surface compact: show one draft summary plus the current campaign state and expiry. Keep the live message, delivery figures, destination controls, and emergency stop inside one clearly named delivery-report disclosure. Refresh status must remain immediately available, and the disclosure label must make the campaign controls discoverable.
- Destination discovery and selection must use human-readable community names/codes; raw internal ids must not be the primary operator-facing label.
- An explicitly selected active free community is eligible by default. It does not need a Community Domain record before GSN advertising can enter available Spotlight space.
- A linked Community Domain may block GSN house campaigns by recording `domain.central_advertising.allow_gsn_house_campaigns: false`. An inactive community/domain or a Domain Spotlight mode of `off` also blocks delivery.
- Blocked or explicitly excluded destinations must be visible but not selectable.
- Eligibility must be rechecked by the backend when each destination is served. A later advertising exclusion must stop delivery.
- Preview must be read-only and must happen before the final publish action becomes available.
- Preview audience uses the distinct union of active membership accounts across currently eligible selected communities, not a sum that double-counts a member in two communities. It is an addressable-account fact, not a guaranteed view or online-presence claim.
- Repost equivalence is planning/reporting only. It must reuse the existing Subscription Spotlight credit pricing function and must not create a MarketplaceProductRepost, payer, shop, payment instruction, debit, or beneficiary record for a GSN-HOUSE campaign.
- Normal rotation remains the default and must preserve the existing Spotlight pacing and selection behavior. Timed delivery is an additive, GSN-HOUSE-only choice for one campaign; it must not change ordinary member/shop rotation.
- A timed interval means one network-wide eligible qualifying-presentation opportunity at each anchored slot while the selected window is open. It is not a guaranteed clock-time playback, audience-wide broadcast, handset receipt, unique reach, sale, or delivery to every selected community. If no eligible viewer has Spotlight open, the board must report the due opportunity as unfilled instead of shifting the entire schedule or claiming delivery.
- Timed windows must end on or before the reviewed advert-group expiry. The backend must anchor later slots to the original start time, cap the interval to 5-1,440 minutes, persist the schedule in the existing campaign pacing authority, and expose requested, due, qualified, and unfilled-due counts without adding a second serving engine.
- Repost-equivalent timed quotation uses promotion count x eligible destinations x scheduled opportunities. The additional peak-time surcharge rate remains policy-undecided, must be labelled unquoted, and must not move money or credits.
- The phone may select up to ten media files in one action. Preparation and upload must run sequentially, show progress, and keep the page responsive. Before read-only review the prepared queue exists only in the current browser session, so the screen must tell the operator to keep the page open.
- Read-only review uploads each prepared file to managed GSN storage without publishing it. Every queued media item becomes one independent GSN house campaign using the shared message and selected destinations.
- The operator must select one expiry date and time before read-only review. The exact reviewed timestamp applies to every independent campaign created from that media group, is sent with every sequential publication request, and appears in review and campaign history. Twenty-four hours is the editable starting default, not a maximum; an admin may select a later future date for an approved multi-day or multi-month campaign. The backend rejects expired timestamps. Older trusted callers that omit expiry retain the authoritative server-assigned 24-hour default so no house campaign becomes unbounded. Expiry is a serving boundary and must not be represented as proof of payment, payer authority, or settlement.
- The review action must remain tappable before the draft is ready and explain every missing requirement in the same action area. It must never appear silently disabled merely because destination, message, or media is missing.
- On phone, the review action must appear immediately after the media picker and preparation status, before the first-media preview and prepared-media list. Its label must make the complete path obvious (`Review and publish`) while still stating that the first tap opens a final check and does not publish immediately.
- The message field may retain the backend's 2,000-character maximum, but the screen must explain that this is only an allowance and that one short sentence is sufficient; it must not present a bare counter that looks like a writing requirement.
- Every new GSN house promotion must store an admin-supplied public advertiser phone in international `+country-code` format. The same phone applies to every media item in the reviewed batch, appears in read-only review and campaign history, and becomes the live `Call advertiser` action. Older records without the field remain readable but do not manufacture a contact route.
- The final batch publish action must require one explicit confirmation and a distinct idempotency key for every media item. Publication runs sequentially, shows progress, preserves already-published results after a later failure, and resumes without duplicating successful campaigns.
- Discarding an entirely unpublished batch must attempt reference-safe cleanup for every uploaded media item. Once any item has published, the page must not discard or delete media that may already be referenced.
- Emergency stop must permanently withdraw the canonical campaign and placements, invalidate pending presentation leases, preserve history, record the signed-in admin as actor, and remain idempotent on retry.
- Destination management must stay inside the selected campaign's operations details. It must show each community by visible name/code, distinguish current policy permission from actual delivery status, and preserve a withdrawn destination plus its reason in the campaign record.
- Stopping one destination must require a reason and confirmation, stop only that community's future delivery, preserve prior evidence, and keep other permitted destinations live. The final serving destination must direct the operator to the whole-campaign emergency stop instead of disguising full closure as a partial change.
- Only one destination-stop task may be open at a time. Use one serving-community selector and one review action instead of placing a destructive button on every destination row. Its success or blocker must appear in the same campaign area, and the action must not create advertising consent, payment, member credit, entrepreneur rights, or endorsement.
- Operator-facing reporting must describe issued presentation leases as `issued by GSN` and qualifying visibility events as `seen`. Issuance does not prove handset receipt. Delivery-round counters remain technical pacing data and must not be presented as personal impressions. None of these counts may be relabelled as video playback, completion, sales, or verified-human reach.
- Discarding an unpublished review may delete only a GSN-managed Marketplace upload that has no surviving database reference. Referenced media must be retained.
- An official campaign expires at its persisted admin-selected advert-group timestamp. For normal rotation, quotation-only chargeable days are the rounded-up calendar-day span from campaign start to expiry; timed campaigns continue to quote their explicit scheduled opportunities. Actual payment remains outside this publisher and must not be inferred from the expiry. Its explicit advertiser phone is a public contact route only; it must not create a member shop, seller trust claim, member endorsement, or Community Domain endorsement.
- The pilot rail rotates automatically every five seconds without adding manual next, previous, pause, or fast-forward controls. Existing qualification, hidden-tab, reduced-motion, Dashboard Market Wisdom, Marketplace, Public Shop, Community Home, and Owner Shop Control boundaries otherwise remain unchanged.

Primary action:

```text
Review and publish
```

After a valid read-only review and explicit confirmation:

```text
Publish GSN campaign
```

## Support And Simplification Direction

Underused systems to surface carefully:
- Sign-in WhatsApp/email support remains a pilot fallback, but support cases are the in-app source of truth after sign-in.
- Community Notice Board should become the visible communication hub for announcements and meeting interest summaries, while meeting RSVP counts remain structured meeting data.
- Action Inbox should stay the alert surface for support replies and resolution, not the place where support cases are authored.

Overbuilt systems to simplify on the first surface:
- Community Domain Action Reviews remain detailed governance infrastructure, but ordinary users should see simple labels: My requests, Waiting for admin, Needs changes, Resolved.
- Policy, node, lineage, evidence metadata, and apply mechanics belong behind admin/advanced controls.
- Do not delete heavy governance tools until route references, backend tests, and domain contracts prove they are unused.

## WhatsAppBridgePage

Route: `/app/whatsapp-bridge` (`/whatsapp-bridge` redirects here).

Purpose:
Let a signed-in community owner, admin, or member broadcast already-published
Community Domain bulletin outputs to approved external channels. The bridge is
not a general signpost, not a join route, not a creation route, and not a
directory of GSN internal features.

Must show:
- Community Domain Bulletin Bridge title
- clear statement that it broadcasts approved public bulletins only
- latest selected-community public bulletin link when one exists
- Copy Bulletin Message action, enabled only when a public bulletin link exists
- Share to WhatsApp action, enabled only when a public bulletin link exists
- a no-bulletin-ready state when no public bulletin output exists
- channel-governance framing for WhatsApp, social pages, and email groups
- decision boundary that GSN records only actions completed inside GSN

Rules:
- Do not scrape, read, or import WhatsApp group conversation.
- Do not claim WhatsApp delivery, read receipt, vote evidence, or member consent.
- Do not expose GSN internal feature pointers, source tools, admin tools,
  creation screens, membership gates, Community Domain setup, Demand Box,
  Ask Community, shop management, Spotlight management, reports, approval, or
  verification functions inside the bridge.
- The bridge must not expose a broad public menu for Demand Box or Ask Community.
- The bridge must not share itself as a fallback public doorway.
- The bridge must skip Ask Community / market-need-pulse records even if legacy data still exposes a public notice path; Demand Box owns those requests.
- The only outward link from this page should be an already-created public
  bulletin/output link such as `/community-notices/:publicCode`.
- Automatic multi-channel forwarding requires governed channel connections,
  account authorization, consent/privacy review, and a delivery audit trail; do
  not present that as live until those integrations exist.
- Replies, acknowledgements, interest, approval, and verification must happen
  inside the owning GSN screen.
- WhatsApp Status may be a reminder only because it disappears.

Primary action:

```text
Copy Bulletin Message
```
