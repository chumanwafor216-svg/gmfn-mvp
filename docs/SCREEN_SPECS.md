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
- The installed phone icon should open the authenticated app entry at
  `/app/dashboard?source=pwa`. If no valid session exists, the normal auth guard
  sends the user to Sign In.
- Cover and Welcome must remain free to view for ordinary public browsing, but
  they must not trap signed-in PWA users away from the real app shell.
- The prompt must not show competing install buttons. Use one clear button:
  try the native install prompt when available, otherwise open three short
  manual steps.
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
- information note: Once your setup or join request is completed, you will sign in from the Existing Member page.

Primary actions:
- Start community
- Request to join

Rules:
- Create community goes to StartCommunityPage.
- Request to join goes to JoinRequestMembershipPage.
- After successful completion, user returns to SignInPage.

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
- Communities count
- Money across communities
- What do you want to do next?
- Choose community
- Enter marketplace
- Create community
- Join community
- Grow circle
- Your Communities compact row
  - row title
  - community count
  - opens to a simple community list
  - each opened community item shows community name and Open Marketplace
- compact rows:
  - Owner Actions
  - Owner Shop Control
  - Vault Control
  - Free Spotlight
  - Spotlight Subscription
  - Grow Trusted Circle
  - Owner Spotlight Status

Rules:
- Community Home is an overview page, not a full content dump.
- Do not expose all owner tools on this page.
- Create community must appear here as one compact action only.
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

## MarketplacePage

Purpose:
Operate one selected community/marketplace.

Must show:
- selected community / marketplace identity
- current member context inside that marketplace
- no more than four primary work lanes first:
  - Money Pool
  - ROSCA
  - Support Request
  - Trusted Trade
- compact trust/status signal for this marketplace
- a clear way to return to Community Home or Dashboard

Rules:
- Marketplace is the operational nucleus for one selected community, not a
  dumping ground for every finance, trust, shop, support, demand, and link tool
  at once.
- The first screen must act as a guided front desk.
- Open only one major lane as the main visible work area at a time.
- When a lane opens, unrelated lanes must visually step back until the user
  finishes, pauses, or returns to the lane chooser.
- Money Pool, ROSCA, Support Request, and Trusted Trade must be stabilized
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
- TrustSlip is the portable proof layer. Trust Passport is the fuller story.
  Keep those responsibilities distinct.
- Marketplace-local trust may be summarized when the user arrived from one
  marketplace, but the full carried trust story belongs here.
- Identity Overview is the first One-Screen Snapshot Protocol application. It
  must fit its title, four identity facts, six compact status signals, and the
  public community record action inside one 390x844 phone snapshot without
  tall warning cards or decorative height.
- Identity Overview must keep the member photo unobstructed, dock any trust
  seal away from the face/proof image, and include a direct `Complete ID
  checks` path when the snapshot is showing unfinished identity requirements.
- Identity Overview should behave as a portable official package: screenshot,
  print, or PDF framing must not require visible pieces of the previous or next
  Trust Passport section to make sense.

Current pre-redesign Trust Passport section mapping:
- Current Trust Standing: Identity Overview, Current trust verdict, and What
  this reading says.
- Evidence Story: Why this reading looks like this, Why did my trust change?,
  and Evidence & institutional context.
- Community Confirmation: public community record and confirmation readiness.
- Finance Discipline: finance-discipline question, trust limit, guarantee
  capacity, locked guarantees, overexposure ratio, and risk context.
- Documents / TrustSlip: TrustSlip status, open TrustSlip, verify, copy,
  export, and document readiness controls.
- Repair or Next Step: next-step guidance, Action Inbox route, and pressure-note
  review.

This mapping is a source-cage before visual redesign. It does not permit Trust
Passport to remain a long stacked document once the lane replacement work
begins.

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
  proof unless the backend provides a live TrustSlip code for that shop.
- Public Shop may show a compact signed-in member navigation strip while a
  member is authenticated, even when the member is viewing another member's
  shop. It may link to Dashboard, Community Home, Marketplace, and My Shop.
  It must not render for ordinary public visitors.
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
