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
- Public Shop signboard identity must be shop/member scoped: shop name,
  description, picture, WhatsApp, and Telegram come from the individual shop
  record. Marketplace/community name may appear only as the shared community
  context, not as a replacement for the shop name.
- Public Shop may expose an on-demand Verify Shop panel with the shop owner ID,
  shop name, marketplace/community context, community ID when available, and a
  QR that reopens the public shop link. Do not present that QR as TrustSlip
  proof unless the backend provides a live TrustSlip code for that shop.
- Public Shop may show a compact owner navigation strip for the signed-in shop
  owner only. It may link to Dashboard, Community Home, and Marketplace, but it
  must not render for ordinary public visitors or signed-in non-owners.
