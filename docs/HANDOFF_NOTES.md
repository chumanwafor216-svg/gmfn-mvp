# HANDOFF_NOTES.md

## Purpose
This file is the repo's lightweight continuity log.

Use it to recover work after a chat reset, a new session, or a branch handoff.
It is not the product source of truth. When this file and the code disagree,
trust the code, `README.md`, `docs/PROJECT_PROTOCOL.md`, and
`docs/FREEZE_POLICY.md`.

## How to use it
- Read this file after the core project docs and before editing code.
- Keep entries concrete: exact files, exact routes, exact backend endpoints.
- Separate confirmed facts from inference.
- After substantial work, add or refresh the latest checkpoint instead of
  leaving the next session to reconstruct intent from git history alone.
- For the current canonical product skeleton, also read
  `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`.
- For innovation-case, investor, policy, TrustSlip, merchant-verification, and
  development-finance logic, also read
  `docs/INNOVATION_POLICY_LOGIC_2026-04-20.md`.
- For the current senior-engineer recovery brief, also read
  `docs/SENIOR_ENGINEERING_HANDOVER_2026-04-19.md`.
- For the proposed production route and page ownership model, also read
  `docs/PRODUCTION_INFORMATION_ARCHITECTURE_BLUEPRINT_2026-04-19.md`.
- For the proposed execution sequence from current state to that target model,
  also read `docs/PRODUCTION_IA_IMPLEMENTATION_PLAN_2026-04-19.md`.
- For the plain-English one-page view of that same model, also read
  `docs/ONE_PAGE_ROUTE_MAP_2026-04-19.md`.

## Recommended checkpoint format
- Date
- Workstream
- Routes/screens affected
- Backend routes/endpoints involved
- Files in play
- Confirmed facts
- Open risks or unknowns
- Next recommended step

## Current checkpoint

### Latest update

#### Date
2026-04-21

#### Workstream
Local pilot data cleanup: keep only Aberdeen as the active test community.

#### Routes/screens affected
- `/app/community`
- `/app/marketplace`
- `/app/shop`
- `/app/finance`
- `/app/trust`

#### Backend routes/endpoints involved
- no backend contract changed
- local SQLite data only: `gmfn_backend/gmfn.db`

#### Files in play
- `gmfn_backend/gmfn.db` local ignored database, not tracked by git
- `gmfn_backend/gmfn_backup_before_keep_aberdeen_20260421_122755.db`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Local dev mode is enabled through `GMFN_DEV_MODE=1`, so the active local
  backend database is `gmfn_backend/gmfn.db`.
- Before cleanup, the local database had three active communities:
  `Golden boys`, `Default Clan`, and `Aberdeen city ICA`.
- The requested surviving community is `Aberdeen city ICA`, with marketplace
  name `Aberdeen city marketplace` and community code `GMFN-C-000003`.
- A timestamped backup was created before mutation:
  `gmfn_backend/gmfn_backup_before_keep_aberdeen_20260421_122755.db`.
- The first transaction attempted to null old invite codes and safely rolled
  back because the local schema requires `clans.invite_code`.
- The successful cleanup moved the one local shop row,
  `CHUMA INTERNATIONAL SHOP`, from `Golden boys` to `Aberdeen city ICA`.
- The shop's marketplace products, active feature entitlement/subscription row,
  and current TrustSlip were moved to `Aberdeen city ICA`.
- `Golden boys` and `Default Clan` were marked `closed`, their active
  memberships were ended with `left_at`, and disabled placeholder invite codes
  were set so the schema remains valid.
- After cleanup, active memberships exist only for `Aberdeen city ICA`; this
  should make Community Home show one active community in local testing.
- No code, schema, migration, Render database, production configuration, auth,
  or payment logic changed.

#### Verification
- Read-only post-cleanup query showed:
  `Aberdeen city ICA` active with 3 active members, 1 shop, 14 products, 1
  feature entitlement, and 1 TrustSlip.
- Read-only post-cleanup query showed `Golden boys` and `Default Clan` closed
  with 0 active members, 0 shops, 0 products, 0 entitlements, and 0 TrustSlips.

#### Open risks or unknowns
- Browser/phone localStorage may still contain an old selected community id
  from before cleanup. If pages act confused, select Aberdeen once from
  Community Home or clear the selected community storage.
- Historical audit records such as trust events, expected payments, bank
  events, and loans were preserved under their original closed community IDs
  rather than deleted or merged. This was intentional to avoid destroying
  finance/trust audit history.
- This cleanup was local only and is not automatically reflected in Render
  production/staging databases.

#### Next recommended step
- Restart/refresh the local backend and phone browser, open `/app/community`,
  select Aberdeen once if needed, then verify Marketplace, Shop, Finance, and
  Trust surfaces now behave as a single-community pilot.

### Previous update

#### Date
2026-04-21

#### Workstream
Install reusable "What do you want to do next?" guide on Loans & Support.

#### Routes/screens affected
- `/app/loans`

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/pages/LoansPage.tsx`
- `frontend/src/components/NextActionGuide.tsx` through existing shared usage only
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Canonical route skeleton treats Borrow / Lend / Support as a core
  marketplace-owned capability, with `/app/loans` acting as the calmer deeper
  Loans & Support workspace.
- Added the shared `NextActionGuide` to `/app/loans` so a member can choose
  plain language actions such as borrow/start support request, guarantee for
  someone, check summary, show what needs attention, readiness, suggestions,
  workbench, pay in, withdraw, guarantor earnings, Finance, Marketplace, and
  notifications.
- On-page guide actions expand and scroll to the existing Loans & Support
  sections: support summary, current support focus, borrower-side flow, and
  guarantor-side queue.
- Cross-page guide actions use `navigateWithOrigin` so route origin context is
  preserved.
- Did not touch Dashboard Market Wisdom, backend, auth, schema, payment,
  deployment configuration, or route contracts.

#### Verification
- `npm exec -- eslint src/components/NextActionGuide.tsx src/pages/LoansPage.tsx` passed.
- `git diff --check -- frontend/src/pages/LoansPage.tsx` passed with only normal Windows line-ending warnings.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Phone review is needed after deploy to confirm `/app/loans` guide buttons
  remain steady on center and edge taps.
- The guide currently points repayment-like users toward the existing money
  routes and support workbench because this page does not expose a specific
  active loan repayment URL without a loan id.

#### Next recommended step
- Deploy and phone-test `/app/loans`. Open/collapse the new guide, search for
  words like borrow, guarantee, withdraw, ready, and inbox, then confirm the
  selected action opens the correct section or route.

### Previous update

#### Date
2026-04-21

#### Workstream
Install reusable "What do you want to do next?" guide on Finance and Trust
Passport.

#### Routes/screens affected
- `/app/finance`
- `/app/trust`

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/pages/FinancePage.tsx`
- `frontend/src/pages/TrustScorePage.tsx`
- `frontend/src/components/NextActionGuide.tsx` through existing shared usage only
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Canonical route skeleton maps Finance to `frontend/src/pages/FinancePage.tsx`
  and Trust Passport to `frontend/src/pages/TrustScorePage.tsx`.
- Added the shared `NextActionGuide` to Finance so a member can choose plain
  language actions such as add money, take money out, borrow/lend/support,
  payment route, payout details, expected payments, loan readiness,
  Marketplace, notifications, and focus commitments.
- Added the shared `NextActionGuide` to Trust Passport so a member can choose
  plain language actions such as trust score, repair, why changed, evidence,
  TrustSlip, verify TrustSlip, identity reading, refresh trust, notifications,
  Marketplace, focus commitments, and the GSN guide.
- On-page guide actions expand and scroll to existing page sections where
  appropriate instead of creating new routes.
- Cross-page guide actions use `navigateWithOrigin` so route origin context is
  preserved.
- Did not touch Dashboard Market Wisdom, backend, auth, schema, payment,
  deployment configuration, or route contracts.

#### Verification
- `npm exec -- eslint src/components/NextActionGuide.tsx src/pages/FinancePage.tsx src/pages/TrustScorePage.tsx` passed with one pre-existing `TrustScorePage.tsx` hook dependency warning for `loadAll`.
- `git diff --check -- frontend/src/pages/FinancePage.tsx frontend/src/pages/TrustScorePage.tsx` passed with only normal Windows line-ending warnings.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Phone review is still needed after deploy to confirm Finance and Trust
  Passport guide buttons feel steady on edge taps and do not inherit any mobile
  tap leakage.
- The existing `TrustScorePage.tsx` hook dependency warning remains unchanged
  and should be handled in a separate safe pass if needed.

#### Next recommended step
- Deploy and phone-test `/app/finance` and `/app/trust`. Open/collapse the new
  guide, try center and edge taps, and confirm the on-page actions scroll to
  the correct sections before carrying the same pattern into more domains.

### Previous update

#### Date
2026-04-21

#### Workstream
Dashboard attention surface and shared next-action guide tap containment.

#### Routes/screens affected
- `/app/dashboard`
- `/app/community` through the shared `NextActionGuide`

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/components/NextActionGuide.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Product owner reported the Dashboard `Attention Guide` button appears
  frequently and may be involved in the same mobile button-jumping problem.
- Confirmed in code that the Dashboard attention popup and minimized fixed
  `Attention Guide` pill are frontend notification/focus surfaces, not backend
  route changes.
- Tightened the Dashboard attention popup shell so pointer, mouse, touch, and
  click events stop at the fixed attention surface instead of bubbling into the
  Dashboard content behind it.
- Tightened the minimized Dashboard `Attention Guide` pill with the same mobile
  tap-safe handling, transparent tap highlight, isolated stacking, and native
  appearance reset.
- Strengthened the shared `NextActionGuide` card so the entire card is a
  protected tap island, not only the visible buttons. This protects the new
  `What do you want to do next?` guide on Dashboard and Community Home.
- Did not disable the attention system or change its notification/focus
  decision logic. This pass only prevents tap leakage and native mobile
  highlight/ghost-click behavior.
- No Dashboard Market Wisdom, backend, auth, schema, payment, deployment
  configuration, or route contracts changed.

#### Verification
- `npm exec -- eslint src/components/NextActionGuide.tsx src/pages/DashboardPage.tsx` passed.
- `git diff --check -- frontend/src/components/NextActionGuide.tsx frontend/src/pages/DashboardPage.tsx` passed with only normal Windows line-ending warnings.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Phone review is needed after deploy to confirm the Dashboard attention pill
  and shared guide buttons no longer flash/jump on edge taps.
- If the `Attention Guide` still feels too frequent after tap leakage is fixed,
  the next pass should tune `frontend/src/lib/dashboardAttentionEngine.ts`
  separately as a product-behavior decision.

#### Next recommended step
- Build, deploy, then phone-test `/app/dashboard` and `/app/community`. On
  Dashboard, tap the minimized `Attention Guide`, close/dismiss the popup, and
  test the `What do you want to do next?` open/collapse buttons from center and
  edge taps.

### Previous update

#### Date
2026-04-21

#### Workstream
Install reusable “What do you want to do next?” guide on Community Home and
Dashboard.

#### Routes/screens affected
- `/app/community`
- `/app/dashboard`

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/components/NextActionGuide.tsx`
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Product owner asked to bring the Marketplace-style “What do you want to do
  next?” helper into Community Home and Dashboard.
- Added a shared route-neutral `NextActionGuide` component with collapsed/open
  state, simple keyword matching, search input, quick choices, and tap-event
  containment.
- Installed the guide on Community Home in both the normal state and the
  no-community state. Community actions reuse existing Community Home handlers
  for choosing communities, opening Marketplace, creating/joining communities,
  growing the trusted circle, shop control, spotlight, finance, loans/support,
  trust, and notifications.
- Installed the guide on Dashboard immediately after the hero/identity block
  and before Spotlight, so the frozen Market Wisdom section remains untouched.
- Dashboard guide uses the existing Dashboard priority-route intelligence plus
  stable core routes for Community Home, Marketplace, Money In, Money Out,
  Loans/Support, Finance, Trust Passport, CCI, TrustSlip, Demand Box,
  Notifications, and Shop.
- Tightened Dashboard's route-local pointer guard from a no-op to
  `stopPropagation()` so Dashboard buttons are less likely to leak edge taps.
- No backend, auth, schema, payment, deployment configuration, Marketplace
  business logic, or Dashboard Market Wisdom behavior changed.

#### Verification
- `npm exec -- eslint src/components/NextActionGuide.tsx src/pages/CommunityHomePage.tsx src/pages/DashboardPage.tsx` passed.
- `git diff --check -- frontend/src/components/NextActionGuide.tsx frontend/src/pages/CommunityHomePage.tsx frontend/src/pages/DashboardPage.tsx` passed with only normal Windows line-ending warnings.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Phone review is needed after deploy to confirm the guide placement feels
  helpful without crowding the top of Community Home or Dashboard.
- The guide currently uses simple keyword matching, not AI language
  understanding; this is intentional for stability at this stage.

#### Next recommended step
- Deploy/retest `/app/community` and `/app/dashboard` on phone. Open/collapse
  the guide, try terms like `loan`, `deposit`, `withdraw`, `shop`, `invite`,
  `trust`, `community`, and `marketplace`, and confirm buttons do not jump.

### Previous update

#### Date
2026-04-21

#### Workstream
Marketplace block-surface polish and tap-stability hardening.

#### Routes/screens affected
- `/app/marketplace`

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Phone review confirmed the Marketplace landmark/aura background returned, but
  several blocks still read too white/plain against that background.
- Phone review also showed Marketplace buttons could feel unstable again,
  especially open/collapse and member/action buttons.
- Confirmed in code that `consumeMarketplacePointerEvent` was still a no-op
  while many Marketplace controls depended on it to stop tap leakage.
- Added a route-local Marketplace surface resolver so `pageCard`, `softCard`,
  and `innerCard` now render as soft blue/gold institutional surfaces instead
  of mostly flat white panels.
- Strengthened the shared Marketplace `actionBtn` styles with firmer borders,
  subtle 3D inset/shadow treatment, stable `translateZ(0)`, and hidden tap
  overflow without changing route behavior.
- Changed the Marketplace pointer guard to stop propagation and routed the
  remaining direct click buttons through the same button event guard, including
  picture removal, link actions, member/support selection, and support-draft
  controls.
- No Dashboard, Dashboard Market Wisdom, Community Home, backend, auth, schema,
  payment, or deployment configuration was changed.

#### Verification
- `npm exec -- eslint src/pages/MarketplacePage.tsx` passed with no errors.
  Existing warnings remain for hook dependencies already present in
  `MarketplacePage.tsx`.
- `git diff --check -- frontend/src/pages/MarketplacePage.tsx` passed with only
  normal Windows line-ending warnings.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Phone review is needed after deploy to confirm the block surfaces have enough
  depth without becoming flashy and that Marketplace buttons no longer jump on
  edge taps.

#### Next recommended step
- Deploy/retest `/app/marketplace` on phone from top to bottom, focusing first
  on `What do you want to do next?`, `Members and shops`, picture tools,
  Marketplace-owned links, and support/guarantor controls.

### Previous update

#### Date
2026-04-21

#### Workstream
Marketplace full-height landmark/aura coverage.

#### Routes/screens affected
- `/app/marketplace`

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Phone review showed the restored Marketplace landmark/aura appeared mainly
  in the upper part of the page and did not feel uniform down the lower blocks.
- Confirmed in code that the Marketplace aura layer still had `auto` on the
  bottom and a fixed `76%` compact height, so it could stop before the end of a
  tall phone page.
- Changed the aura from a top-only layer into a full-shell layer by using full
  vertical inset coverage instead of a fixed height.
- Added softer mid-page and lower-page blue/pink/gold radial patches to the
  Marketplace shell background so the same brand wash continues down the page
  without making every card flashy.
- No Marketplace business logic, section order, collapse state, backend, auth,
  schema, payment, deployment config, Dashboard, or Dashboard Market Wisdom
  behavior changed.

#### Verification
- `npm exec -- eslint src/pages/MarketplacePage.tsx` passed with no errors.
  Existing warnings remain for hook dependencies already present in
  `MarketplacePage.tsx`.
- `git diff --check -- frontend/src/pages/MarketplacePage.tsx` passed with only
  normal Windows line-ending warnings.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Phone review is needed after deploy to confirm the background now reaches the
  bottom evenly without becoming too colourful.

#### Next recommended step
- Deploy/retest `/app/marketplace` on phone from top to bottom, especially the
  lower Marketplace-owned links, Demand Box, and Borrow / Lend / Support areas.

### Previous update

#### Date
2026-04-21

#### Workstream
Marketplace landmark/aura restoration.

#### Routes/screens affected
- `/app/marketplace`

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Phone review after the mobile block containment pass showed Marketplace had
  become too white/plain and had lost the blue landmark/aura depth that had
  been transported from the accepted Community Home direction.
- Confirmed in code that Community Home still used the stronger blue/pink/gold
  aura layer while Marketplace had been reduced to one low-opacity navy radial.
- Restored the Marketplace route-local shell to the Community Home family:
  blue primary wash, soft pink/gold accents, stronger institutional shadow, and
  a subtle moving aura layer.
- Restored a matching blue/pink/gold tint to the Marketplace identity/profile
  card background so the first block does not read as plain white.
- The aura remains decorative only, `pointer-events: none`, and respects
  `prefers-reduced-motion`.
- No Marketplace business logic, section order, section collapse behavior,
  backend, auth, schema, payment, deployment config, Dashboard, or Dashboard
  Market Wisdom behavior changed.

#### Verification
- `npm exec -- eslint src/pages/MarketplacePage.tsx` passed with no errors.
  Existing warnings remain for hook dependencies already present in
  `MarketplacePage.tsx`.
- `git diff --check -- frontend/src/pages/MarketplacePage.tsx` passed with only
  normal Windows line-ending warnings.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Phone review is needed after deploy to confirm the restored aura is visible
  enough without becoming flashy.

#### Next recommended step
- Deploy/retest `/app/marketplace` on phone and compare the page background
  against the accepted Community Home look.

### Previous update

#### Date
2026-04-21

#### Workstream
Marketplace mobile block containment and overflow cleanup.

#### Routes/screens affected
- `/app/marketplace`

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Phone screenshots showed Marketplace blocks were still reading as oversized
  documents on mobile: one block could end while the next began half-visible,
  long member identifiers overflowed horizontally, and raw outward URLs made
  link cards stretch too far.
- Marketplace heavy sections now default closed on fresh load: `Members and
  shops`, `Marketplace-owned links`, `Money route detail`, and `Borrow / Lend /
  Support` all start folded unless a guided action, hash handoff, or active
  loan draft intentionally opens the needed section.
- The Marketplace section-state local-storage key was moved from
  `gmfn.marketplace.sections.v2.*` to `gmfn.marketplace.sections.v3.*` so older
  phone sessions do not keep reopening the previously oversized sections.
- The first Marketplace billboard is shorter on compact screens: the picture
  frame, fallback initials, marketplace title, and description clamp were
  reduced so the identity block is less likely to force the next block into a
  half-visible state.
- Raw invite/marketplace/shop URLs are no longer printed inside the mobile link
  cards. Users now see compact `link ready` / `not ready yet` pills and still
  use the existing `Copy Link` and `Open Link` actions.
- Member rows now contain long names, emails, GSN IDs, and shop names inside the
  card by using explicit overflow wrapping and compact status pills.
- The always-visible explanation toggles for Marketplace-owned links and
  Borrow / Lend / Support now appear only when their parent section is open, so
  collapsed blocks stay compact.
- No Dashboard, Dashboard Market Wisdom, auth, backend, schema, payment, or
  deployment configuration was changed.

#### Verification
- `npm exec -- eslint src/pages/MarketplacePage.tsx` passed with no errors.
  Existing warnings remain for hook dependencies already present in
  `MarketplacePage.tsx`.
- `git diff --check -- frontend/src/pages/MarketplacePage.tsx` passed with only
  normal Windows line-ending warnings.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Phone review is still needed after deploy to confirm each folded block now
  feels self-contained, especially the first billboard, member rows, and
  Marketplace-owned links.

#### Next recommended step
- Deploy/retest `/app/marketplace` on phone. Start from a normal refresh so the
  new `v3` section-state key clears the previously expanded phone layout, then
  open `Members and shops` and `Marketplace-owned links` one at a time.

### Previous update

#### Date
2026-04-21

#### Workstream
Marketplace visual quieting and authority pass.

#### Routes/screens affected
- `/app/marketplace`

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Marketplace was not considered visually complete after phone review because
  the page still felt too busy/fretted.
- The Marketplace shell was quieted by reducing layered borders, shadows,
  card padding, and competing accent gradients.
- The animated multi-colour aura layer behind Marketplace was removed and
  replaced with one static low-opacity navy wash.
- Pink/yellow accent patches were removed from the route-local Marketplace
  shell/profile background so the page reads more institutional.
- Marketplace cards, soft cards, inner cards, section labels, and badges now
  use softer borders and calmer navy/slate tones.
- Marketplace route-local controls were tightened for a calmer institutional
  feel without changing any backend contract or navigation target.
- The billboard `Picture` pill is smaller, less glossy, and uses a firmer
  navy/slate treatment.
- The picture tool panel and its `Add picture` / `Change picture`, `Remove
  picture`, and `Close` controls were tightened so the control area feels less
  visually loose on phone.
- The billboard `Open details` / `Close details` controls were narrowed and
  restyled to match the picture control.
- The route-local `actionBtn` helper now gives Marketplace buttons a more
  muted bank-standard surface, with lower shine, smaller height, centered text,
  border-box sizing, and transparent tap highlight.
- The intent guide and intent action cards now inherit the calmer button
  treatment while preserving the previously accepted `What do you want to do
  next?` open/collapse behavior.
- The second Marketplace block was changed from a route-name shortcut deck into
  a plain-language `What do you want to do next?` intent guide.
- The guide is now collapsed by default so the Marketplace page stays short on
  phone; the collapsed state shows only the title and one `Open` button.
- Opening the guide reveals the simple-word input, explanatory sentence, and
  everyday action cards; the same button changes to `Collapse` and hides the
  guide again.
- The guide accepts typed everyday words such as `loan`, `deposit`,
  `withdraw`, `shop`, `invite`, `trust`, or `group` and maps them to the
  closest Marketplace route or local section.
- Visible action cards now lead with ordinary goals such as `Add money`,
  `Take money out`, `Ask for support`, `Show my shop`, and `Invite people`,
  while still showing the technical/product label underneath.
- Technical users can still type hidden route language such as `CCI` or
  `TrustSlip` and be sent to the matching route.
- `Ask for support` opens the local Borrow / Lend / Support section, while
  `Invite people` opens the Marketplace-owned links section.
- The guide remains scoped to the selected marketplace and does not change
  Menu, Tools, bottom navigation, Dashboard, Dashboard Market Wisdom, backend,
  auth, schema, payment, or deployment configuration.

#### Verification
- `npm exec -- eslint src/pages/MarketplacePage.tsx` passed with no errors.
  Existing warnings remain for hook dependencies already present in
  `MarketplacePage.tsx`.
- `git diff --check -- frontend/src/pages/MarketplacePage.tsx` passed.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Phone visual review is needed to confirm the quieter Marketplace now feels
  authoritative rather than fretted, and that the lower-motion background does
  not feel too plain.

#### Next recommended step
- Deploy/retest `/app/marketplace` on phone from top to bottom, checking the
  overall calmness first, then `Picture`, the picture tool panel, `Open
  details`, the compact intent guide, and the main action buttons.

### Previous update

#### Date
2026-04-21

#### Workstream
Marketplace member/shop row cleanup.

#### Routes/screens affected
- `/app/marketplace`

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The third Marketplace block now reads `Members and shops` instead of
  `Members & shop galleries`.
- The long technical explainer for member rows was removed from this block.
- Each visible member row is now a compact human line with row number, member
  name, GSN ID, and shop name in one disciplined row/card.
- The visible shop action now says `Open shop` instead of `Open Shop Gallery`.
- The disabled `No Shop Yet` button was removed; when no shop is visible, the
  row simply says `Shop not visible yet`.
- The `Open shop` action is now shown only when the member has a visible shop
  record in the current marketplace, avoiding fake shop visibility from a GSN
  ID alone.
- Support-request fit language was softened to `Choose supporter` / `Chosen`.
- No Dashboard, Dashboard Market Wisdom, auth, backend, schema, payment, or
  deployment configuration was changed.

#### Verification
- `npm exec -- eslint src/pages/MarketplacePage.tsx` passed with no errors.
  Existing warnings remain for hook dependencies already present in
  `MarketplacePage.tsx`.
- `git diff --check -- frontend/src/pages/MarketplacePage.tsx` passed.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Phone visual review is still needed after deploy to confirm long member
  names, long GSN IDs, and shop names wrap cleanly without making rows feel
  crowded.

#### Next recommended step
- Deploy/retest the Marketplace `Members and shops` block on phone.

### Previous update

#### Date
2026-04-21

#### Workstream
Marketplace billboard picture-control simplification.

#### Routes/screens affected
- `/app/marketplace`

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The Marketplace billboard now exposes one visible `Picture` control instead
  of separate always-visible add/change/remove picture buttons.
- Tapping `Picture` opens a compact in-frame tool panel with `Add picture` or
  `Change picture`, optional `Remove picture`, and `Close`.
- Successful picture upload or removal closes the picture tool panel so the
  billboard returns to the clean identity view.
- The visible billboard identity chips were reduced to the marketplace ID only;
  repeated `Trust` and `Money In` status copy was removed from the billboard
  face.
- Deeper trust, CCI, finance, Money In, Money Out, local pool, and role facts
  remain available in the existing `Open details` drawer.
- No Dashboard, Dashboard Market Wisdom, auth, backend, schema, payment, or
  deployment configuration was changed.

#### Verification
- `npm exec -- eslint src/pages/MarketplacePage.tsx` passed with no errors.
  Existing warnings remain for hook dependencies already present in
  `MarketplacePage.tsx`.
- `git diff --check -- frontend/src/pages/MarketplacePage.tsx docs/HANDOFF_NOTES.md`
  passed.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Phone visual review is still needed after deploy to confirm the single
  `Picture` control feels obvious without creating extra mental load.

#### Next recommended step
- Deploy/retest `/app/marketplace` on phone, especially the single `Picture`
  control, picture tool panel, and details drawer.

### Previous update

#### Date
2026-04-21

#### Workstream
Marketplace billboard identity compression.

#### Routes/screens affected
- `/app/marketplace`

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The Marketplace first block now uses one billboard/picture-frame surface
  instead of a side-by-side picture block plus separate identity block.
- Uploaded marketplace/community pictures now sit under the marketplace name,
  ID, trust, and rail summary overlay, so the frame acts as both picture frame
  and official marketplace billboard.
- When no picture is uploaded, the same billboard uses the GSN system frame and
  community initials as the default backdrop.
- Upload/change/remove handles remain attached to the billboard frame.
- Extra backend-derived details are now hidden by default in a compact
  `Open details` drawer and can be folded away with `Close details`.
- The `Marketplace shortcuts` block remains second, preserving the canonical
  Marketplace order.
- No Dashboard, Dashboard Market Wisdom, auth, backend, schema, payment, or
  deployment configuration was changed.

#### Verification
- `npm exec -- eslint src/pages/MarketplacePage.tsx` passed with no errors.
  Existing warnings remain for hook dependencies already present in
  `MarketplacePage.tsx`.
- `git diff --check -- frontend/src/pages/MarketplacePage.tsx` passed.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Phone visual review is still needed after deploy, especially to confirm the
  overlay name stays readable on uploaded photos and the compact details drawer
  feels small enough on phone.

#### Next recommended step
- Deploy/retest `/app/marketplace` on phone once this visual checkpoint is
  accepted locally.

### Previous update

#### Date
2026-04-21

#### Workstream
Marketplace first-block identity frame.

#### Routes/screens affected
- `/app/marketplace`

#### Backend routes/endpoints involved
- no backend contract changed
- frontend still composes the first Marketplace block from existing selected
  community, member, community-money, and picture-upload truth

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The Marketplace top block is now one joined identity surface rather than a
  faded full-card backdrop.
- The left partition is a real system picture frame using
  `SystemPictureFrame`, with existing upload/change/remove handlers for the
  selected community picture.
- If no community picture exists, the frame shows a GSN default picture-frame
  placeholder using the marketplace/community initials.
- The right partition carries the selected marketplace/community identity:
  marketplace name, marketplace ID, group trust, group CCI slot, group finance
  slot, local pool, and Money In / Money Out rail readiness.
- The top identity block avoids making the community profile look like a
  personal DP. Personal/member actions remain lower on the page.
- `Group CCI` and `Group finance` prefer community/marketplace/clan fields when
  the backend provides them and otherwise display an honest preparing state.
- The second block remains `Marketplace shortcuts`, preserving the canonical
  Marketplace page order.
- No Dashboard, Dashboard Market Wisdom, auth, backend, schema, payment, or
  deployment configuration was changed.

#### Verification
- `npm exec -- eslint src/pages/MarketplacePage.tsx` passed with no errors.
  Existing warnings remain for hook dependencies already present in
  `MarketplacePage.tsx`.
- `git diff --check -- frontend/src/pages/MarketplacePage.tsx` passed.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Phone visual review is needed after deploy to confirm the frame height, upload
  handles, and identity partitions feel balanced on the target phone.
- Current backend `/clans/me` does not reliably expose finished group CCI or
  group finance fields in the Marketplace payload on this branch, so those slots
  may show preparing until backend truth is expanded again.

#### Next recommended step
- Deploy/retest `/app/marketplace` on phone. If accepted, reuse this same
  marketplace identity-frame method for other community-owned identity surfaces.

### Previous update

#### Date
2026-04-21

#### Workstream
Marketplace page re-engineering pass after Community Home visual freeze.

#### Routes/screens affected
- `/app/marketplace`

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Marketplace remains scoped to one selected community, following
  `docs/MARKETPLACE_PAGE_BLUEPRINT_2026-04-20.md`.
- The core Marketplace order is preserved visually: Marketplace profile/member
  standing, shortcuts, members and shop galleries, marketplace-owned links,
  Demand Box, then Borrow / Lend / Support.
- The old dark navy Marketplace billboard treatment was removed from loading,
  empty, and active states.
- Marketplace now uses a calmer light institutional profile surface aligned
  with the accepted Community Home background family.
- Marketplace action buttons were softened into raised light/blue controls
  instead of deep solid-blue controls.
- Visible helper copy was shortened so the page speaks less like a builder note
  and more like a user-facing operating screen.
- User-visible member identity copy now says `GSN ID` while internal technical
  model names remain unchanged.

#### Verification
- `npm exec -- eslint src/pages/MarketplacePage.tsx` passed with no errors.
  Existing warnings remain for hook dependencies already present in
  `MarketplacePage.tsx`.
- `git diff --check -- frontend/src/pages/MarketplacePage.tsx` passed.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Phone visual review is needed after deploy. Check that the calmer Marketplace
  profile block still shows enough of any uploaded community picture while
  remaining readable.

#### Next recommended step
- Deploy/retest `/app/marketplace` on phone, then decide whether the same
  Marketplace card/button language should be carried into Finance and Trust
  Passport next.

### Previous update

#### Date
2026-04-21

#### Workstream
Community Home visual freeze and Marketplace background alignment.

#### Routes/screens affected
- `/app/community`
- `/app/marketplace`

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The accepted Community Home mobile arrangement was committed as
  `5584678 style: freeze community home aura`.
- Community Home now acts as the frozen visual reference for this stage: calm
  blue/white institutional background, subtle pink/gold wash, GSN watermark,
  reduced-motion-safe aura, and route-local styling.
- Marketplace was updated only at the outer page/shell background layer to use
  the same Community Home shell, aura, and watermark treatment.
- Marketplace route purpose, business logic, action buttons, section order,
  backend calls, selected-community context, and Marketplace profile card were
  not intentionally changed.

#### Verification
- `npm exec -- eslint src/pages/MarketplacePage.tsx` passed with no errors.
  Existing warnings remain for hook dependencies already present in
  `MarketplacePage.tsx`.
- `git diff --check -- frontend/src/pages/MarketplacePage.tsx` passed.

#### Open risks or unknowns
- Phone visual testing is still required after the next frontend deploy to
  confirm Marketplace now feels aligned with Community Home and that the
  background motion is comfortable on the device.

#### Next recommended step
- Run the frontend build, commit the Marketplace background alignment, deploy,
  then phone-test `/app/community` and `/app/marketplace` side by side.

### Previous update

#### Date
2026-04-21

#### Workstream
Safe recovery branch for Community Home / Shop Control mobile tap recovery.

#### Branches and checkpoints
- Full preserved checkpoint: `checkpoint/mobile-tap-recovery-2026-04-21`
- Safer deploy candidate branch: `recovery/mobile-tap-safe-frontend-2026-04-21`
- External backup patch already created before this recovery work:
  `C:\Users\chukwuma pc\mobile-tap-recovery-2026-04-21.patch`

#### Routes/screens affected
- `/app/community`
- embedded Shop Control panel on `/app/community`
- `/app/shop-control`
- `/app/dashboard`
- `/app/marketplace`

#### Backend routes/endpoints involved
- no backend contract is intended to change on the recovery branch

#### Files in play
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/components/CommunityShopControlPanel.tsx`
- `frontend/src/layout/AppLayout.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/MarketplacePage.tsx`
- `frontend/src/pages/ShopControlPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The full mobile tap recovery work remains preserved on
  `checkpoint/mobile-tap-recovery-2026-04-21`.
- A safer recovery branch was created from that checkpoint so risky work could
  be isolated without destroying the checkpoint.
- On the recovery branch, the backend aggregation changes in
  `gmfn_backend/app/api/routes/clans.py` and
  `gmfn_backend/app/api/routes/pool.py` were restored to the
  `feature/vault-shops` branch-point content.
- On the recovery branch, `frontend/src/components/RequireAuth.tsx` was also
  restored to the `feature/vault-shops` branch-point content. This avoids
  mixing auth/continuity guard changes into the mobile tap recovery.
- `git diff feature/vault-shops -- frontend/src/components/RequireAuth.tsx
  gmfn_backend/app/api/routes/clans.py gmfn_backend/app/api/routes/pool.py`
  is empty in the recovery working tree.
- `/app/shop-control` hash scrolling was tightened. A hash target such as
  `#shop-control-paid-spotlight` or `#shop-control-vault-subscription` now
  auto-scrolls once for that hash instead of re-scrolling after each background
  refresh/focus reload.
- `/app/shop-control` now also tracks and clears hash-scroll retry timers, so
  stale retry timers do not survive route changes.
- Independent assistant review found no high or medium remaining findings in
  the Community Home embedded Shop Control buttons, Dashboard/Marketplace
  pointer helpers, or `/app/shop-control` hash-scroll behavior after this pass.
- The recovery branch was pushed to GitHub and then used to fast-forward the
  Render-connected branch `feature/vault-shops`.
- Before updating `feature/vault-shops`, the previous remote branch was saved
  as `backup/feature-vault-shops-before-safe-recovery-2026-04-21`.
- Live frontend deploy changed from the old asset `index-C5P6PzFZ.js` to
  `index-BsH5i7JA.js`, and the live bundle references the updated chunks:
  `CommunityHomePage-D7Imuuh3.js`, `DashboardPage-DKa0caQY.js`,
  `MarketplacePage-DUcwiOcn.js`, and `ShopControlPage-CH1TIFxS.js`.
- Live API health is available at `https://gmfn-api.onrender.com/health` and
  returns `{"ok":true,"dev_mode":false}`.
- Live static deep links currently return 404 for `/app/community`,
  `/app/dashboard`, `/app/marketplace`, `/app/shop-control`, and `/app/login`.
  Root `/` works. This is a Render static-site rewrite configuration issue,
  not a React build failure.
- The repo has the correct Blueprint rule in `render.yaml`:
  `routes: [{ type: rewrite, source: /*, destination: /index.html }]`, but the
  live manually created Render static site appears not to be applying Blueprint
  routes. Add the same rule in the Render dashboard:
  Source `/*`, Destination `/index.html`, Action `Rewrite`.

#### Verification
- `git diff --check` passed.
- `npx eslint src/pages/CommunityHomePage.tsx src/components/CommunityShopControlPanel.tsx src/layout/AppLayout.tsx src/pages/DashboardPage.tsx src/pages/MarketplacePage.tsx src/pages/ShopControlPage.tsx`
  passed with no errors. Existing hook dependency warnings remain in
  `MarketplacePage.tsx` and `ShopControlPage.tsx`.
- `npm run build` passed in `frontend`.
- `python -m pytest -q tests/test_smoke.py` passed in `gmfn_backend`.

#### Open risks or unknowns
- Phone redeploy testing is still required. The key smoke path is:
  `/app/community` open/collapse main actions, open/collapse Shop Control,
  tap each Shop Control lane, then test `/app/shop-control` anchors directly.
- The recovery branch is intentionally frontend-focused. Backend cumulative
  standing/finance aggregation ideas should remain separate until load-tested.
- Marketplace still intentionally contains Money In and Money Out shortcuts
  because the Marketplace blueprint says those are required marketplace
  shortcuts. If phone testing shows those buttons still steal taps, address
  layout/tap-target spacing there rather than silently removing the routes.
- Phone users should open `https://gmfn-frontend.onrender.com` until the Render
  rewrite rule is added. Direct links such as
  `https://gmfn-frontend.onrender.com/app/community` will keep failing with 404
  until that dashboard rewrite exists.

#### Next recommended step
- Add the Render Static Site rewrite rule in the Render dashboard:
  Source `/*`, Destination `/index.html`, Action `Rewrite`. Then retest direct
  URLs and start the phone smoke test from `https://gmfn-frontend.onrender.com`.

### Previous update

#### Date
2026-04-21

#### Workstream
Community Home mobile tap recovery at system/shell level.

#### Routes/screens affected
- `/app/community`
- embedded Shop Control panel on `/app/community`
- app shell layout around `/app/community`
- `/app/dashboard`
- `/app/marketplace`

#### Backend routes/endpoints involved
- no backend contract changed in this pass

#### Files in play
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/components/CommunityShopControlPanel.tsx`
- `frontend/src/layout/AppLayout.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Product-owner phone test reported that opening a Community Home block worked,
  but collapsing it could still send the user to Payment Instructions.
- A follow-up test then reported that Main Action and Shop Control buttons no
- longer worked.
- An independent audit found a full-screen mobile post-click shield in
  `AppLayout.tsx`. The shell armed that shield from `<main>` click capture, then
  rendered a fixed transparent overlay with `pointerEvents: auto` for 420ms.
- That broad shell shield was removed. The narrower bottom-nav route guard was
  preserved because it only disables the bottom navigation briefly.
- Community Home and the embedded Shop Control panel no longer attach
  `onPointerDown` propagation blockers to action buttons. Route/collapse buttons
  now rely on normal click handling with `preventDefault` and React
  `stopPropagation`.
- The Community Home `Shop Control` main action now forces the embedded Shop
  Control panel open before scrolling to it, so localStorage cannot leave the
  target panel closed and make the tap appear dead.
- Community Home shell page actions no longer include direct `Money In` and
  `Money Out` shortcuts. `Finance` remains the safer finance doorway; this
  reduces accidental `/app/payment/pool` jumps while the Community Home screen is
  being collapsed and tapped.
- Unused helper functions left behind by the Community Home cleanup were removed
  from `CommunityHomePage.tsx`.
- Follow-up product-owner phone test reported the issue still appeared and that
  Dashboard buttons also felt broken. Inspection confirmed Dashboard had the same
  family of mobile tap blockers: many `onPointerDown` handlers plus a local
  transparent `dashboardInteractionShield` overlay.
- The remaining app-shell route guard was removed from `<main>` capture handlers
  in `AppLayout.tsx`; the shell no longer changes page-actions or bottom-nav
  pointer events because of ordinary main-area taps.
- Dashboard's local transparent interaction shield was removed. Dashboard's
  pointer-down helper is now harmless, while click handlers still do deliberate
  `preventDefault` / `stopPropagation` where needed.
- Marketplace's pointer-down helper is also now harmless, because Marketplace
  used the same pattern across many route/action buttons.
- Removed an unused Marketplace helper (`copyCommunityId`) that became visible
  during targeted lint of the touched route.

#### Verification
- `npm run build` passed in `frontend`.
- `npx eslint src/pages/CommunityHomePage.tsx src/components/CommunityShopControlPanel.tsx src/layout/AppLayout.tsx`
  passed.
- `npx eslint src/pages/CommunityHomePage.tsx src/components/CommunityShopControlPanel.tsx src/layout/AppLayout.tsx src/pages/DashboardPage.tsx src/pages/MarketplacePage.tsx`
  passed with no errors; two pre-existing Marketplace hook dependency warnings
  remain.
- Full `npm run lint` still fails because the repo currently lints generated
  `frontend/dist` assets and older unrelated source errors. This is not caused
  by the Community Home tap fix.

#### Open risks or unknowns
- Phone redeploy testing is still required. Expected behavior: Main Actions open
  normally, collapse/open toggles can be tapped repeatedly, Shop Control opens
  and stays in its own lane, and no Community Home action lands on Payment
  Instructions unless the user intentionally navigates through Finance. Dashboard
  and Marketplace buttons should also respond normally after this follow-up.

#### Next recommended step
- Redeploy frontend, then phone-test `/app/community`: open/collapse Main
  Actions, open/collapse Shop Control, tap every Shop Control button, then tap
  the community Select/Open Marketplace row buttons. Also smoke-test
  `/app/dashboard` and `/app/marketplace` primary buttons before deeper mobile
  layout work.

### Previous update

#### Date
2026-04-21

#### Workstream
Community Home Shop Control button root-cause fix after phone taps opened wrong
destinations.

#### Routes/screens affected
- `/app/community`
- `/app/shop-control`
- `/app/shop-assets`
- `/app/marketplace`
- public shop route `/shop/:gmfnId`

#### Backend routes/endpoints involved
- no backend contract changed in this pass

#### Files in play
- `frontend/src/components/CommunityShopControlPanel.tsx`
- `frontend/src/pages/ShopControlPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Product-owner phone test reported that multiple Shop Control buttons on
  Community Home either did not open or opened the wrong place.
- The embedded Shop Control panel was using `OriginLink` for route changes while
  also passing custom tap handlers to stop the collapsible parent panel from
  reacting.
- That made the tap contract fragile on phone: the same tap was responsible for
  stopping parent-panel bubbling and for link navigation.
- The embedded Shop Control panel now uses explicit `button` elements for its
  internal route actions. Each button stops panel bubbling and then calls
  `navigateWithOrigin` to the exact destination.
- The top buttons now route deliberately:
  - `Open Shop Tools` -> `/app/shop-control#shop-control-summary`
  - `Open Public Shop` -> `/shop/:gmfnId`
  - `Marketplace` -> `/app/marketplace`
- The four owner lanes now route deliberately:
  - `Open Gallery Tools` -> `/app/shop-control#shop-control-picture-gallery`
  - `Manage Products` -> `/app/shop-assets`
  - `Open Ordinary Spotlight` -> `/app/shop-control#shop-control-spotlight`
  - `Open Paid Spotlight` -> `/app/shop-control#shop-control-paid-spotlight`
  - `Open Vault Subscription` -> `/app/shop-control#shop-control-vault-subscription`
  - `Open Vault Gallery` -> `/app/shop-control#shop-control-vault`
- `/app/shop-control` hash scrolling now waits until the page is no longer
  loading and retries until the target exists. This matters especially for
  ordinary spotlight because that section is mounted only after
  `spotlightOpen` becomes true.
- `openSpotlightTools` on `/app/shop-control` now uses the same retrying scroll
  helper instead of a one-shot scroll.

#### Verification
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- This fixes the route/tap wiring and destination scroll timing. The product
  owner still needs to test the live phone build to confirm no lower-page tap
  target is visually overlapping another button.

#### Next recommended step
- Redeploy/retest `/app/community` on phone. If any specific button still lands
  wrong, inspect its exact rendered route and bounding box before doing another
  layout pass.

### Previous update

#### Date
2026-04-21

#### Workstream
Community Home phone button routing and duplicate-control cleanup after
product-owner phone review.

#### Routes/screens affected
- `/app/community`
- `/app/shop-control` as the destination for owner shop tools

#### Backend routes/endpoints involved
- no backend contract changed in this pass

#### Files in play
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/components/CommunityShopControlPanel.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Product-owner phone review reported several Community Home controls jumping
  to the wrong destination, especially controls landing in Guided Withdrawal or
  payment instructions when the user expected owner shop / spotlight / Vault
  tools.
- Owner Controls no longer includes `Money In` or `Money Out`. Those finance
  routes do not belong in the Community Home owner-control button grid and were
  removed to reduce wrong-route taps.
- Owner Controls now sorts before the Shop Control panel in the Community Home
  visual order, so collapsing Owner Controls should no longer visually fall
  into Shop Control.
- Community Home collapse and owner-control buttons now consume click events,
  not only pointer-down events, before they toggle, scroll, or navigate.
- Repeated local scroll helpers for Grow Trusted Circle, Spotlight management,
  and Shop Control were replaced with one `openCommunityHomeSection` helper.
- Community Home and the embedded Shop Control panel now make action labels
  wrap safely on mobile, reducing the risk that a long button overlaps a
  neighboring button and steals the tap.
- The `Your communities` header now keeps its collapse button in a dedicated
  right-side column, with the community count badge moved under the title, so
  the button no longer falls into the badge row on phone.
- The duplicate `Community-facing picture` / Marketplace billboard card was
  removed from the embedded Community Shop Control panel because it pointed to
  the same picture tools as the shop-picture card and was confusing on phone.
- The embedded `Shop control tools` area now presents four separate lanes:
  `Public shop gallery`, `Ordinary spotlight`, `Paid spotlight subscription`,
  and `Vault and private gallery`.
- Public gallery tools now own public picture/products only; ordinary
  spotlight opens the free spotlight publisher; paid spotlight opens its own
  subscription card; Vault opens Vault subscription and Vault gallery controls.
- `/app/shop-control` now has direct anchors for
  `#shop-control-paid-spotlight` and `#shop-control-vault-subscription`, so
  Community Home buttons no longer land in a vague paid-access area.
- The duplicate always-visible `Spotlight` toggle in the `/app/shop-control`
  summary was removed. The summary only shows the recommended next action, and
  spotlight publishing is opened through the ordinary spotlight path.
- Root cause for the repeated `Open` / `Collapse` button misplacement was
  ad-hoc section headers: each collapsible block hand-built its own title/button
  layout, and mobile wrapping made buttons share unstable rows with text and
  badges.
- Community Home and the embedded Shop Control panel now use shared collapse
  header helpers. On compact screens, the collapse button becomes a stable
  full-width row below the title; on wider screens, it stays in the right-side
  button column.

#### Verification
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Product owner still needs to test `/app/community` on a phone and confirm
  whether any remaining tap target jumps happen lower on the page.

#### Next recommended step
- Continue phone testing on `/app/community`, especially the embedded Shop
  Control gear cards and the community row actions.

### Previous update

#### Date
2026-04-20

#### Workstream
Community Home phone-first presentation pass started from product-owner
screenshot review.

#### Routes/screens affected
- `/app/community`

#### Backend routes/endpoints involved
- no backend contract changed in this pass

#### Files in play
- `frontend/src/pages/CommunityHomePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The phone screenshot showed that the first fold spent too much height on
  explanation and oversized cards.
- The top normal-flow `About Community Home` guide was removed from the active
  Community Home first fold so the page itself leads the user.
- The hero copy now speaks directly to the user in one short sentence:
  choose a community, open its Marketplace, and keep trust, finance, shop, and
  spotlight under one GSN ID.
- Mobile hero stat cards, page cards, badges, and community-row cards were
  tightened to reduce vacant space while preserving the existing GSN branded
  deep-blue / light-blue / white / gold language.
- Community Home action buttons and collapse buttons now use the gold embossed
  button treatment on this route.
- Community rows now use a compact phone layout: community identity spans the
  row, finance/trust bottom lines sit side by side, and actions stay underneath.
- A follow-up phone pass tightened the community-row signal pills so Numerical,
  Interaction, Spotlight, and Vault no longer occupy several large rows on
  mobile.
- The community row was then restructured as a single phone-first card:
  community identity first, a compact 2-by-2 signal panel for People,
  Interaction, Finance, and Trust, then aligned full-width actions. This reduces
  the previous white gaps caused by scattered chips, finance boxes, trust boxes,
  and uneven buttons.
- The row metric tiles were then polished with centered text, stronger borders,
  subtle 3D/embossed shadows, and alternating blue/white/gold brand-tinted
  backgrounds so the mini-cards no longer look flat or misaligned.
- The hero `Cumulative standing` card now shows only `Positive` or `Negative`.
  It no longer displays a money amount because this surface is intended to show
  directional standing, not the detailed finance value.
- Collapsed cards for Shop Control, Owner Controls, Trusted Circle, and
  Spotlight now use a compact two-column header/button layout with shorter
  language so the phone view is less likely to cut a card halfway between
  screenfuls.
- Shop Control, Owner Controls, and Grow Trusted Circle collapsed-surface copy
  was shortened so those blocks speak to the user without reading like builder
  notes.
- The extra trusted-circle explanation toggle was removed from the collapsed
  surface to reduce phone-height waste.
- The visible community-row wording remains bottom-line only. Deeper finance and
  deeper trust details still belong in Finance and Trust Passport.

#### Verification
- `npm run build` passed in `frontend`.

### Follow-up adjustment

- Removed the visible `Review needed before changes` card from
  `/app/shop-control`.
- Shop Control remains viewable as a clean owner tools page.
- Sensitive save/payment/publish buttons may still show `Review Identity First`
  until the proper Identity/Settings review flow is handled.
- `npm run build` passed in `frontend`.
- `/app/shop-control` then received a GSN branded visual pass:
  - the page background now uses the same deep-blue side-rail / light-blue /
    white / gold language as the branded GSN summary surfaces
  - Shop Control cards, paid-access cards, picture/gallery, slot usage,
    spotlight, and Vault/private-access sections now share stronger embossed
    borders, blue-gold gradients, and institutional card shadows
  - primary, secondary, and soft action buttons now use the raised gold 3D
    treatment instead of flat white/blue controls
- `npm run build` passed after the Shop Control branded visual pass.
- `/app/shop-control` then received a control-intelligence pass:
  - the summary card now reads current shop readiness signals for shop picture,
    products, public link, and spotlight
  - the summary card recommends the next best move, such as adding a picture,
    adding products, opening Spotlight, or monitoring the live shop
  - main action rows, paid access actions, gallery actions, shop-details
    actions, and spotlight actions now use stable button grids so controls stay
    aligned and deliberate on phone and desktop
- `npm run build` passed after the Shop Control control-intelligence pass.

#### Open risks or unknowns
- The product owner still needs to review the updated `/app/community` page on a
  phone and send the next screenshot for final spacing/polish decisions.

#### Next recommended step
- Continue screenshot-led phone polishing on `/app/community`, starting from the
  community rows and then moving down through Owner controls, Shop Control,
  First Circle, and Spotlight management.

### Previous update

#### Date
2026-04-20

#### Workstream
Community Home decongested so Finance and Trust Passport details remain in
their own domains.

#### Routes/screens affected
- `/app/community`
- `/app/finance` as the detailed finance destination
- Trust Passport / trust pages as the detailed trust destination

#### Backend routes/endpoints involved
- `GET /clans/me`
- `GET /pool/me/summary`

#### Files in play
- `frontend/src/pages/CommunityHomePage.tsx`
- `gmfn_backend/app/api/routes/clans.py`
- `gmfn_backend/app/api/routes/pool.py`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Community Home is a cross-community index, not the full Finance file and not
  the full Trust Passport.
- Community Home's Shop Control owner-gear buttons now use contained tap events
  and route into anchored sections of `/app/shop-control`, reducing the mobile
  jump/collapse problem while the product owner reviews the Shop Control page.
- `/app/shop-control` now exposes anchors for summary, commercial unlocks,
  picture/gallery controls, spotlight, and Vault/private access.
- `/app/shop-control` received a first structural presentation pass:
  - removed builder-facing copy such as "restore missing controls"
  - changed visible `GMFN ID` to `GSN ID`
  - converted blue primary buttons to the shared gold/embossed direction
  - simplified payment wording to user-facing confirmation language
  - tightened the flow around shop room, paid access, picture/gallery, spotlight,
    shop details, slot usage, and Vault/private access
- `/app/shop-control` is no longer blocked at route-entry by the continuity
  guard, so the product owner can review the page layout on phone.
- Sensitive Shop Control actions still pause locally when identity continuity
  needs review. Payment creation, saving shop details, image upload/removal,
  paid spotlight selection, and spotlight publishing show `Review Identity
  First` or disabled controls until continuity is restored.
- The large `Cumulative finance summary` block was removed from Community Home.
- The large `Cumulative trust summary` block was removed from Community Home.
- Community Home keeps the compact community row with global community number,
  community strength, interaction density, finance bottom line, and trust/CCI
  bottom line.
- Community Home rows now also show active paid Spotlight subscriber count and
  active Vault subscriber count, because those are community-level health
  signals rather than private finance/trust detail.
- Deeper finance details such as borrowed money, support given, locked
  guarantee exposure, and guarantor earnings belong in Finance.
- Deeper trust details such as guarantees, Trust Passport accumulation, and
  TrustSlip proof belong in Trust / Trust Passport.
- Backend `/clans/me` still returns `community_standing` so the frontend is not
  inventing these bottom-line labels from nothing.
- Backend `/clans/me` now derives Spotlight/Vault subscriber counts from active
  `FeatureEntitlement` rows, so the numbers follow subscription activation,
  expiry, and revocation automatically.

#### Verification
- `npm run build` passed in `frontend`.
- `python -m py_compile gmfn_backend/app/api/routes/clans.py gmfn_backend/app/api/routes/pool.py` passed.
- `python -m py_compile gmfn_backend/app/api/routes/clans.py` passed after adding
  the subscription counts.
- `npm run build` passed after the Shop Control presentation pass.
- `npm run build` passed after allowing Shop Control review while keeping
  sensitive shop actions locally locked under identity-continuity review.

#### Open risks or unknowns
- The next pass should be visual phone polishing only unless the product owner
  asks for another Community Home business metric.

#### Next recommended step
- Review `/app/community` on phone and tighten spacing/wording around the
  compact community rows.

### Previous update

#### Date
2026-04-20

#### Workstream
Community Home demand ownership corrected after product-owner review confirmed
Demand Box work should originate from the selected Marketplace.

#### Routes/screens affected
- `/app/community`
- `/app/marketplace`
- `/app/demand-box`

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/pages/CommunityHomePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Canonical docs say demand originates in marketplaces, while broader demand
  can aggregate upward.
- Marketplace already has a Demand Box shortcut and a Marketplace-level Demand
  Box block.
- Community Home no longer fetches marketplace demand rows.
- Community Home no longer shows the `Demand Control Box`, `Create Demand`,
  `Open Demand Box`, live demand summary, or Demand Box owner-tool shortcut.
- Community Home guide text now says demand work starts inside the selected
  Marketplace.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- A future aggregate demand reflection may still be added to Community Home,
  but it should be read-only/summary-level and must not become the working
  Demand Box.

#### Next recommended step
- Live-review `/app/community` on phone and continue removing blocks that
  belong to Marketplace rather than the cross-community Community Home index.

### Previous update

#### Date
2026-04-20

#### Workstream
Community Home finance logic tightened so the route shows cumulative member
standing instead of reopening the detailed finance file inside Community Home.

#### Routes/screens affected
- `/app/community`
- `/app/finance` as the deeper destination for the full finance file

#### Backend routes/endpoints involved
- `GET /pool/me/summary`

#### Files in play
- `gmfn_backend/app/api/routes/pool.py`
- `frontend/src/pages/CommunityHomePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- `/pool/me/summary` already totaled pool balances across all active
  communities attached to the current member.
- The endpoint now also returns active borrower outstanding total, active
  borrower file count, guarantor earned total, and guarantor earning record
  count.
- Community Home no longer fetches the selected community money surface,
  expected payments, payment rails, payout details, or reconciliation preview
  just to render them on this page.
- Community Home now shows one compact cumulative finance reading with:
  available balance, settling money, locked guarantee exposure, money owed,
  guarantee earned, and reserved pool.
- The full community-by-community finance file remains behind `Open Finance`.
- `npm run build` passed in `frontend`.
- `python -m py_compile gmfn_backend/app/api/routes/pool.py` passed.

#### Open risks or unknowns
- The borrower outstanding total currently counts active loan statuses
  `approved`, `active`, and `overdue`; if the backend later introduces another
  live-debt status, this summary should include it.
- Guarantor earnings use the existing guarantor earnings service; mixed
  currency handling remains future work if the product supports multiple live
  currencies beyond NGN.

#### Next recommended step
- Live-review `/app/community` on mobile and confirm the cumulative finance
  block now reads as the quick Community Home signal instead of a detailed
  Finance page.

### Previous update

#### Date
2026-04-20

#### Workstream
Domain intro button interaction tightened after live Community Home review
showed the guide control was jumpy and not clearly opening.

#### Routes/screens affected
- `/app/dashboard`
- `/app/community`
- `/app/marketplace`
- `/app/finance`
- `/app/trust`
- shop gallery / public shop surface

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/components/DomainIntroToggle.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The shared domain intro button now uses stable `Open` / `Close` wording
  instead of replacing the button label with the full domain title.
- The button has a stable minimum width to reduce visual jumping on mobile.
- The button now stops pointer and click propagation before toggling, reducing
  the chance that surrounding route controls or shell layers steal the tap.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- This was build-verified after the product-owner report, but still needs live
  mobile re-test on Community Home.

#### Next recommended step
- Re-test `About Community Home` on mobile. If it still fails to open, inspect
  the app shell/touch layer rather than the route-local guide component.

### Previous update

#### Date
2026-04-20

#### Workstream
Finance and Trust Passport now have the same one-per-domain intro guide pattern
as Dashboard, Community Home, Marketplace, and Shop Gallery.

#### Routes/screens affected
- `/app/finance`
- `/app/trust`

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/pages/FinancePage.tsx`
- `frontend/src/pages/TrustScorePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Finance now has `About Finance`, explaining that Finance is the fuller
  personal money record across marketplaces tied to one member ID.
- The Finance guide explicitly separates local Marketplace finance from the
  broader cumulative Finance domain.
- Trust Passport now has `About Trust Passport`, explaining that it is the
  fuller personal trust record across communities and marketplaces.
- The Trust Passport guide explicitly separates Marketplace trust, Trust
  Passport, and TrustSlip.
- Existing scattered `ExplainToggle` surfaces remain globally disabled and were
  not re-enabled.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- A live mobile review is still needed to confirm all domain-guide buttons feel
  compact and do not crowd the first screen.
- Trust Passport print output should be checked later; the domain guide is
  placed inside the print-nav wrapper, which is already hidden in print CSS.

#### Next recommended step
- Live-review the domain intro buttons across Dashboard, Community Home,
  Marketplace, Finance, Trust Passport, and Shop Gallery on mobile.

### Previous update

#### Date
2026-04-20

#### Workstream
One-per-domain intro guide added to key user-facing domains so explanatory
help is available without returning to scattered `What this does` blocks.

#### Routes/screens affected
- `/app/dashboard`
- `/app/community`
- `/app/marketplace`
- shop gallery / public shop surface

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/components/DomainIntroToggle.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/pages/MarketplacePage.tsx`
- `frontend/src/pages/ShopGalleryPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Added a new compact `DomainIntroToggle` component that is closed by default
  and intended for one top-level guide per domain.
- Dashboard now has `About Dashboard`, explaining that Dashboard is a reflector
  and next-step surface, not the deep work owner.
- Community Home now has `About Community Home`, explaining the combined
  community/marketplace-group index and the split from private Finance and
  Trust Passport records.
- Marketplace now has `About Marketplace`, explaining that Marketplace is one
  selected community in action.
- Shop Gallery now has `About Shop Gallery`, explaining the shop as the
  storefront/reception door with community-governed exposure and locked Vault
  access.
- Existing scattered `ExplainToggle` surfaces remain globally disabled and were
  not re-enabled.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Finance and Trust Passport have not yet received the same domain intro in
  this checkpoint; they should be handled in a follow-up pass with careful
  wording around personal cumulative records versus group rollups.
- A live mobile review is still needed to confirm the button placement feels
  small, helpful, and not noisy.

#### Next recommended step
- Add the same one-per-domain intro to Finance and Trust Passport, then live
  review all domain-guide buttons on mobile.

### Previous update

#### Date
2026-04-20

#### Workstream
Community Home route visually aligned with the canonical marketplace-group
rollup model.

#### Routes/screens affected
- `/app/community`
- movement from `/app/community` to:
  - `/app/marketplace`
  - `/app/finance`
  - `/app/demand-box`
  - `/app/notifications`
  - `/app/payment/pool`
  - `/app/withdrawal-instructions`
  - `/app/payment-rails`
  - `/app/payout-details`

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/pages/CommunityHomePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The Community Home top language now presents the page as the combined index
  of all communities/marketplace groups tied to one member.
- The selected community block now reads as the active Marketplace entry, not
  the full working surface itself.
- The selected block shows community ID, member ID, trust, finance, CCI,
  member count, role, and local pool context.
- The marketplace-group rollup list is open by default under a new localStorage
  collapse key so stale saved state does not hide the primary rollup.
- Each community row now shows group-level finance, trust, CCI, member count,
  role, and an explicit `Open Marketplace` action.
- Community Home tools now describe themselves as doorway actions into deeper
  domains rather than as the owner of all work.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Group finance and CCI labels depend on fields already present or later added
  to community payloads. Until then they safely show `Preparing`.
- The visual order is route-local and does not change backend route ownership.
- A live mobile review is still needed to confirm the rollup list, current
  selection buttons, and Open Marketplace action feel right by touch.

#### Next recommended step
- Live-review `/app/community` on mobile, then decide whether the lower
  Community Home tools, finance signal, demand signal, shop control, circle,
  and spotlight panels should be collapsed or trimmed further.

### Previous update

#### Date
2026-04-20

#### Workstream
Canonical architecture clarified for Community Home marketplace rollups,
group-dynamics readings, and Spotlight visibility boundaries.

#### Routes/screens affected
- architecture guidance for:
  - `/app/community`
  - `/app/marketplace`
  - `/app/finance`
  - `/app/trust`
  - `/app/dashboard`
  - `/shop/:gmfnId`

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`
- `docs/INNOVATION_POLICY_LOGIC_2026-04-20.md`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Community Home is now explicitly documented as the cross-community layer
  where each marketplace/community can appear as one group-level line, card, or
  command entry.
- Community Home may show marketplace/group finance, trust, and CCI summaries,
  but those summaries must not expose private member-level finance or trust
  records.
- Finance now has a documented distinction between personal cumulative finance
  and marketplace/group finance rollups.
- Trust Passport now has a documented distinction between personal cumulative
  trust evidence and marketplace/group trust rollups.
- Spotlight is now documented as bounded by the Community Home circle in normal
  visibility, with outward movement only through approved repost/link/invite
  paths such as shop or vault links.
- The innovation/policy logic now records the value of separating individual
  behaviour, group behaviour, and future community-type analysis.

#### Open risks or unknowns
- This is documentation alignment only; no frontend or backend behaviour was
  changed in this checkpoint.
- Future UI changes must still inspect live code before applying the model to
  Community Home, Finance, Trust Passport, Dashboard, or public shop surfaces.
- Community-type policy analysis remains future/pilot work until enough
  responsibly collected data and classification exist.

#### Next recommended step
- Use this clarified model before changing Community Home: Community Home should
  show all marketplaces as group-level entries, while Marketplace remains the
  working surface for one selected community.

### Previous update

#### Date
2026-04-20

#### Workstream
Marketplace consolidated to one official billboard/backdrop so the selected
marketplace no longer has two competing profile boards.

#### Routes/screens affected
- `/app/marketplace`

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The top Marketplace block is now the official marketplace billboard.
- The billboard uses the selected community/marketplace picture as an optional
  backdrop and keeps the GSN default visual treatment when no picture is set.
- The board carries the selected marketplace name, community ID, current
  member, personal ID, role in that marketplace, trust record, CCI record,
  local pool, Money In rail readiness, and Money Out rail readiness.
- Community picture upload/remove controls now live in the same billboard
  instead of requiring a second visible profile block.
- The duplicate lower Marketplace detail/profile board was removed from the
  visible page.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- This pass did not change backend data contracts; CCI may still show
  `Preparing` until the relevant score or band fields are available in `me`.
- Backdrop upload/remove and mobile tap behaviour still need live browser
  review.
- Collapsible controls were intentionally not added yet; product owner wants
  the page arranged first, then collapses added later.

#### Next recommended step
- Live-review `/app/marketplace` on mobile, especially the backdrop controls,
  shortcuts, member shop links, Demand Box, and Money In/Out context.

### Previous update

#### Date
2026-04-20

#### Workstream
Marketplace runtime order now visually follows the canonical Marketplace
blueprint before optional detail sections.

#### Routes/screens affected
- `/app/marketplace`

#### Backend routes/endpoints involved
- no backend contract changed

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The Marketplace page now visually orders its major blocks as:
  1. Marketplace Profile and Member Standing
  2. Marketplace Shortcuts
  3. Member Roles and Shops
  4. Marketplace-Owned Links
  5. Demand Box
  6. Loans & Support
- Optional Marketplace detail and optional money-route detail are demoted below
  the core marketplace flow.
- The hidden screen-level guide has an explicit low priority order so it does
  not jump above the profile block if guides are re-enabled later.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- This pass changes visual order through route-local styling, not backend
  behaviour.
- A live browser/mobile click sweep is still needed to confirm touch behaviour
  and destination context.

#### Next recommended step
- Live-review `/app/marketplace` at mobile width, especially the shortcut row,
  member shop links, Demand Box, and Money In/Out movement.

### Previous update

#### Date
2026-04-20

#### Workstream
Innovation and policy logic documented so the architecture can be explained as
community-anchored economic infrastructure, not just app screens.

#### Routes/screens affected
- architecture guidance for:
  - `/app/community`
  - `/app/marketplace`
  - `/app/finance`
  - `/app/trust`
  - `/app/trust-slip`
  - `/app/trust-slip/verify`
  - merchant verification redirects

#### Backend routes/endpoints involved
- confirmed supporting code references only:
  - `gmfn_backend/app/services/liquidity_engine_service.py`
  - `gmfn_backend/app/services/loan_readiness_service.py`
  - `gmfn_backend/app/services/loan_decision_intelligence_service.py`
  - `gmfn_backend/app/services/trust_slips_services.py`
  - `gmfn_backend/app/api/routes/merchant_verify.py`
  - `gmfn_backend/app/services/merchant_verify_service.py`

#### Files in play
- `docs/INNOVATION_POLICY_LOGIC_2026-04-20.md`
- `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`
- `docs/PROJECT_PROTOCOL.md`
- `docs/HANDOFF_NOTES.md`
- `README.md`

#### Confirmed facts
- A new innovation/policy logic document now explains:
  - Finance as both local marketplace finance and cumulative
    cross-community financial reading.
  - Trust Passport as the full accumulated trust story.
  - TrustSlip as portable current proof, not the full trust story.
  - Merchant verification as the process of checking TrustSlip outside the
    immediate community circle before goods/trade/confidence decisions.
  - The policy/investor value of comparing behaviour across community contexts
    only after responsible data collection.
- Backend code already has partial support for liquidity, exposure, loan
  readiness, CCI/trust graph, TrustSlip payloads, merchant verification links,
  Pack IDs, and append-only merchant verification events.

#### Open risks or unknowns
- Community type classification is not yet fully modeled, so claims about
  religious, age-grade, professional, school, or market communities remain
  future/pilot-analysis claims, not confirmed measured outcomes.
- Any policy or investor presentation must separate confirmed capability from
  measured evidence and future inference.
- Privacy, consent, bias prevention, and plain-language explanation remain
  required guardrails before the policy layer is production-grade.

#### Next recommended step
- Use the new policy logic document when shaping Finance, Trust Passport,
  TrustSlip, Merchant Verification, and investor/innovation-case presentation
  material.

### Previous update

#### Date
2026-04-20

#### Workstream
Marketplace runtime page composition now begins with the selected marketplace
profile and current member standing instead of opening as a generic launcher.

#### Routes/screens affected
- `/app/marketplace`
- launcher movement from Marketplace to:
  - `/app/finance`
  - `/app/payment/pool`
  - `/app/withdrawal-instructions`
  - `/app/trust`
  - `/app/identity`
  - `/app/trust-slip`
  - `/app/demand-box`
  - `/app/notifications`
  - `/app/community`
  - `/app/dashboard`

#### Backend routes/endpoints involved
- no backend contract changed
- frontend still composes the first Marketplace block from existing:
  - selected community data
  - current member data
  - community-money surface
  - marketplace invite/link state

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Marketplace now starts with a dark institutional profile block showing:
  - active marketplace/community picture or fallback
  - community ID
  - marketplace trust label
  - current member
  - member ID
  - role in the selected marketplace
  - local pool position
  - Money In rail readiness
  - Money Out rail readiness
- Marketplace shortcuts are now a separate second block.
- Marketplace-owned outward links are no longer mixed with the shortcut deck.
- Member rows and outward links now open by default under a new localStorage
  section-state key so stale saved Marketplace toggles do not hide the new
  composition.
- A dedicated Demand Box block now appears before Loans & Support.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- This was build-verified, not browser-click verified in a live mobile viewport.
- The live order still keeps the optional Marketplace detail and Money routes
  blocks before the member/link/demand/support surfaces; a later cleanup pass
  may tighten the final visual order further if product review says it is still
  too long.
- Shortcut destination pages still need separate audits to ensure they display
  the incoming marketplace context clearly.

#### Next recommended step
- Live-review `/app/marketplace` on mobile and confirm that the first view now
  reads as one selected marketplace in action before doing another broader page
  or navigation pass.

### Previous update

#### Date
2026-04-20

#### Workstream
Canonical architecture refined so shop exposure is community-governed and the
stronger combined truth for Finance and Trust Passport is anchored from the
cross-community layer rather than treated as only a loose marketplace sum.

#### Routes/screens affected
- architecture guidance for:
  - `/app/community`
  - `/app/marketplace`
  - `/app/finance`
  - `/app/trust`
  - `/app/shop/*`
  - `/app/dashboard`

#### Backend routes/endpoints involved
- supporting truth rechecked only:
  - community code / marketplace name fields from clan/community responses
  - current community-money surface built from `clanId + gmfnId`
  - marketplace/community invite route

#### Files in play
- `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`
- `docs/MARKETPLACE_PAGE_BLUEPRINT_2026-04-20.md`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The canonical skeleton now states more clearly that:
  - one global member ID belongs to the cross-community layer
  - shop identity is member-global
  - shop exposure is governed by community membership boundaries
  - Finance gathers local marketplace units but its stronger combined reading is
    anchored from the cross-community layer
  - Trust Passport gathers local marketplace trust pieces but its stronger
    combined meaning is anchored from the cross-community layer
- The Marketplace blueprint now reflects that same logic for page-composition
  work.
- Dashboard remains recorded as a reflector, not a domain owner.
- Admin remains recorded as an oversight surface, not an ordinary live actor.

#### Open risks or unknowns
- This was a documentation checkpoint only; no runtime route behavior changed.
- A later implementation pass is still needed to make live page composition
  match the refined anchor logic more explicitly.

#### Next recommended step
- Use this refined cross-community anchor rule when touching Marketplace top
  block, Shop exposure behavior, Finance framing, and Trust Passport framing.

### Previous update

#### Date
2026-04-20

#### Workstream
Marketplace page composition is now documented as a concrete block-order
blueprint rather than only a high-level architecture statement.

#### Routes/screens affected
- architecture guidance for:
  - `/app/marketplace`
  - marketplace-launched routes that must carry current marketplace context

#### Backend routes/endpoints involved
- checked current supporting truth only:
  - `GET /clans/{clan_id}/invite-link`
  - community code / marketplace name fields from clan/community responses
  - current community-money surface inputs built from `clanId + gmfnId`

#### Files in play
- `docs/MARKETPLACE_PAGE_BLUEPRINT_2026-04-20.md`
- `docs/PROJECT_PROTOCOL.md`
- `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`
- `docs/HANDOFF_NOTES.md`
- inspected current implementation references:
  - `frontend/src/pages/MarketplacePage.tsx`
  - `frontend/src/lib/communityMoney.ts`
  - `gmfn_backend/app/api/routes/clans.py`

#### Confirmed facts
- The repo now has a dedicated Marketplace page blueprint.
- The protocol now tells future assistants to read that blueprint for
  Marketplace page-composition work.
- The blueprint locks the intended Marketplace page order as:
  1. Marketplace Profile and Member Standing
  2. Marketplace Shortcuts
  3. Member Roles and Shops
  4. Marketplace-Owned Links
  5. Demand Box
  6. Borrow / Lend / Support
- The blueprint also locks the rule that Marketplace remains one selected
  community in action, while Finance and Trust Passport remain cumulative
  domains above that local truth.

#### Open risks or unknowns
- This is a documentation checkpoint only; no runtime page layout changed in
  this step.
- The current live Marketplace page still needs later implementation alignment
  to match the new block-order blueprint more closely.

#### Next recommended step
- Use the new Marketplace page blueprint as the implementation reference before
  the next Marketplace layout pass.

### Previous update

#### Date
2026-04-19

#### Workstream
Marketplace now exposes a real marketplace-owned outward-links surface instead
of only a hidden invite-ready status chip.

#### Routes/screens affected
- `/app/marketplace`
- outward link handling tied to:
  - `/join`
  - `/community/:clanId`
  - `/shop/:gmfnId`
  - controlled Vault/shop-control flows

#### Backend routes/endpoints involved
- existing marketplace/community invite route:
  - `GET /clans/{clan_id}/invite-link`
- existing vault-access-link infrastructure already used for controlled outward
  links

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Marketplace now has a `Marketplace links & shortcuts` section.
- That section now surfaces the marketplace-owned outward link families that are
  already safe to show from current implementation:
  - join this community
  - view this marketplace
  - view this shop
- The section also now explains controlled outward links more honestly:
  Vault and vote-style links remain marketplace-owned but are issued as
  conditional live links rather than one fixed public URL.
- The join link uses the existing invite-link contract and keeps the current
  create/refresh behavior.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- This pass was build-verified only; it was not followed by a fresh live mobile
  sweep of the new Marketplace link section.
- The exact final user-facing names for all four marketplace link families are
  still not fully stabilized in product copy.
- The current section still reuses the existing collapsed `tools` state, so
  users with an already-saved collapsed state may not see the new links until
  they open the section.

#### Next recommended step
- Live-review `/app/marketplace` on mobile-sized viewport and decide whether the
  marketplace links section should stay toggle-based or become open-by-default
  in a later pass.

### Previous update

#### Date
2026-04-19

#### Workstream
Canonical marketplace-owned invite-link rule added so future route and IA work
keeps invite ownership localized to each marketplace/community unit.

#### Routes/screens affected
- architecture guidance for:
  - `/app/marketplace`
  - `/app/community`
  - `/app/dashboard`
  - `/app/shop/*`
  - invite-return flows tied to one community/marketplace

#### Backend routes/endpoints involved
- confirmed existing marketplace/community invite route:
  - `GET /clans/{clan_id}/invite-link`
- confirmed existing vault-access-link infrastructure:
  - marketplace/vault-access-link and vault-link routes used by frontend API

#### Files in play
- `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`
- `docs/HANDOFF_NOTES.md`
- inspected implementation references:
  - `frontend/src/pages/MarketplacePage.tsx`
  - `frontend/src/pages/MarketplaceWorkspacePage.tsx`
  - `frontend/src/lib/api.ts`
  - `gmfn_backend/app/api/routes/clans.py`
  - `gmfn_backend/app/services/vault_access_service.py`

#### Confirmed facts
- The canonical skeleton now states that invite links live in Marketplace, not
  in Dashboard and not in the aggregate Community Home layer.
- The skeleton now records that each marketplace should inherit a
  marketplace-owned invite-link set by default.
- Current code confirms:
  - a marketplace/community join invite route
  - a sketched shop-view link in Marketplace workspace references
  - real vault-access-link infrastructure
- The fourth outward marketplace link family was not renamed from code alone;
  the skeleton keeps that part generic as additional marketplace-specific
  outward viewing/access links so future implementation does not invent the
  wrong label.

#### Open risks or unknowns
- This was a documentation checkpoint only; no runtime route behavior changed.
- The exact final user-facing labels for all four marketplace invite-link
  families still need to be stabilized in product copy and implementation.

#### Next recommended step
- When marketplace IA work resumes, build the marketplace invite-link surface
  from this canonical rule and map each outward link family explicitly in the
  Marketplace UI and APIs.

### Previous update

#### Date
2026-04-19

#### Workstream
Marketplace crossover shortcuts reduced so Community Home keeps first-circle
ownership and Marketplace stays closer to commerce/support work.

#### Routes/screens affected
- `/app/marketplace`
- related launch movement back to:
  - `/app/community`

#### Backend routes/endpoints involved
- none

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- `Build First Circle` was removed from the Marketplace community-shortcuts
  block.
- Marketplace shortcut guidance now states more clearly that first-circle work
  belongs back in Community Home.
- `npm run build` passed in `frontend` after the reduction.

#### Open risks or unknowns
- This was build-verified, but not followed by a fresh live mobile sweep of the
  reduced Marketplace shortcut block.
- Broader marketplace/community ownership still needs more structural
  tightening later, especially around Spotlight, Demand Box, and deeper
  marketplace-local versus aggregate signals.

#### Next recommended step
- Review `/app/marketplace` live, then continue reducing any remaining
  Marketplace controls that still imply wider community command ownership.

### Previous update

#### Date
2026-04-19

#### Workstream
Community Home finance controls reduced so Community Home stops owning deep
money routes and points into the Finance workspace instead.

#### Routes/screens affected
- `/app/community`
  - `/app/finance`

#### Backend routes/endpoints involved
- none

#### Files in play
- `frontend/src/pages/CommunityHomePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Community Home finance guidance now explicitly says deeper money routes belong
  inside `Finance`.
- The Community Home finance next-action card now keeps only `Open Finance` as
  its direct launcher.
- Direct `Money In`, `Money Out`, `Payment Rails`, and `Payout Details` buttons
  were removed from the Community Home finance block.
- A short helper note now explains that those deeper money routes live in the
  fuller Finance workspace instead of on Community Home.
- `npm run build` passed in `frontend` after the reduction.

#### Open risks or unknowns
- This was build-verified, but not followed by a fresh live mobile sweep of the
  reduced Community Home finance block.
- Broader marketplace/community ownership still needs more structural
  tightening later, especially around Spotlight, Demand Box, and the remaining
  finance signal depth.

#### Next recommended step
- Review `/app/community` live, then continue reducing any remaining Community
  Home controls that still look like deep domain ownership instead of index and
  aggregate-signal behavior.

### Previous update

#### Date
2026-04-19

#### Workstream
Community Home and Marketplace copy/launcher alignment updated to match the
corrected marketplace-versus-cross-community model.

#### Routes/screens affected
- `/app/community`
- `/app/marketplace`
- related launches into:
  - `/app/shop/*`
  - `/app/finance`

#### Backend routes/endpoints involved
- none

#### Files in play
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- `Community Home` now describes itself more clearly as the combined index of
  all communities, where the selected community is confirmed before opening it
  as a marketplace.
- The Community Home finance area now talks about a current-community finance
  signal instead of claiming to own the full finance record.
- Community Home finance guidance now points users toward the broader combined
  `Finance` workspace when they need the fuller money record across
  marketplaces.
- `Marketplace` hero copy now describes the page as one community in action.
- `Marketplace` hero actions now surface `Shop` directly when the current
  member has a GSN ID, instead of leaving shop access only to later sections or
  the shell.
- `npm run build` passed in `frontend` after the page-level alignment.

#### Open risks or unknowns
- This was build-verified, but not followed by a fresh live mobile sweep of the
  new Marketplace `Shop` hero button.
- Broader marketplace/community ownership still needs more structural
  tightening later, especially around Spotlight, Demand Box, and finance depth.

#### Next recommended step
- Review `/app/community` and `/app/marketplace` live, then continue reducing
  any remaining route text or controls that still imply the older ownership
  model.

#### Date
2026-04-19

#### Workstream
Shared shell movement updated so Shop regains main-domain visibility while
Shop Control remains a supporting shop tool.

#### Routes/screens affected
- Shared `/app/*` shell movement and page tools, especially:
  - `/app/dashboard`
  - `/app/community`
  - `/app/marketplace`
  - `/app/finance`
  - `/app/trust`
  - `/app/shop/*`

#### Date
2026-04-19

#### Workstream
Canonical architecture skeleton refined with cumulative Finance/Trust Passport
meaning and aggregate Spotlight/Demand Box ownership.

#### Routes/screens affected
- Documentation and future route/architecture work across:
  - `/app/dashboard`
  - `/app/community`
  - `/app/marketplace`
  - `/app/finance`
  - `/app/trust`
  - `/app/shop/*`
  - admin/oversight interpretation

#### Backend routes/endpoints involved
- none

#### Files in play
- `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The product owner clarified that:
  - Community Home is the combined index/list of all communities a member
    belongs to
  - Marketplace is the operational nucleus of one selected community
  - each community has its own global community ID
  - each individual has one global member ID across all communities
  - one global member ID maps to one shop only
  - one shop maps to six vaults
  - the same shop appears across all marketplaces the member belongs to
  - each marketplace has its own peculiar/local finance and trust unit
  - the `Finance` domain should combine finance activity across the
    marketplaces the member belongs to
  - `Trust Passport` should combine trust activity across the communities and
    marketplaces the member belongs to
  - `Spotlight` is an aggregate feed sourced from multiple marketplaces rather
    than a purely one-marketplace domain
  - `Demand Box` is the opposite-side aggregate counterpart to Spotlight, even
    though members originate demand inside marketplaces
  - CCI belongs to the cross-community layer more than the single-marketplace
    layer
  - Dashboard is a reflector/launcher, not the command centre
- The canonical architecture basis is now written in
  `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`.
- The canonical skeleton now distinguishes:
  - marketplace-specific activity
  - cumulative cross-marketplace domains
  - aggregate community-home-level feeds

#### Open risks or unknowns
- The production blueprint, implementation plan, one-page route map, and shell
  movement still need a deeper future rewrite to fully align with this refined
  skeleton.
- No runtime code changed in this step.

#### Next recommended step
- Review the refined canonical skeleton before further route or navigation
  changes, then revise the architecture docs and shell movement from that
  corrected basis.

#### Date
2026-04-19

#### Workstream
Canonical architecture skeleton recorded from product-owner clarification and
placed in the required reading path.

#### Routes/screens affected
- Documentation and future route/architecture work across:
  - `/app/dashboard`
  - `/app/community`
  - `/app/marketplace`
  - `/app/finance`
  - `/app/trust`
  - `/app/shop/*`
  - admin/oversight interpretation

#### Backend routes/endpoints involved
- none

#### Files in play
- `README.md`
- `docs/PROJECT_PROTOCOL.md`
- `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`
- `docs/PRODUCTION_INFORMATION_ARCHITECTURE_BLUEPRINT_2026-04-19.md`
- `docs/PRODUCTION_IA_IMPLEMENTATION_PLAN_2026-04-19.md`
- `docs/ONE_PAGE_ROUTE_MAP_2026-04-19.md`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The product owner clarified that:
  - Community Home is the combined index/list of all communities a member
    belongs to
  - Marketplace is the operational nucleus of one selected community
  - each community has its own global community ID
  - each individual has one global member ID across all communities
  - one global member ID maps to one shop only
  - one shop maps to six vaults
  - the same shop appears across all marketplaces the member belongs to
  - per-marketplace finance and trust are distinct from broader cumulative
    finance/trust readings
  - CCI belongs to the cross-community layer more than the single-marketplace
    layer
  - Dashboard is a reflector/launcher, not the command centre
- The canonical architecture basis is now written in
  `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`.
- `README.md` and `docs/PROJECT_PROTOCOL.md` now point future route/IA work to
  that canonical skeleton before further architecture changes.
- The older provisional architecture docs now explicitly defer to the canonical
  skeleton where conflicts remain.

#### Open risks or unknowns
- The production blueprint, implementation plan, and one-page route map still
  need a deeper future rewrite to fully align with the new skeleton, even though
  they now carry conflict warnings.
- No runtime code changed in this step.

#### Next recommended step
- Review the canonical skeleton with the next assistant/engineer before making
  further route or navigation changes, then revise the architecture docs and
  shell movement from that corrected basis.

#### Date
2026-04-19

#### Workstream
Phase 2 dashboard reduction: top identity/photo lane reduced from picture-frame
studio behavior to a compact member-photo card with direct actions.

#### Routes/screens affected
- `/app/dashboard`

#### Backend routes/endpoints involved
- none

#### Files in play
- `frontend/src/pages/DashboardPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The large picture-frame overlay control was removed from the top dashboard
  identity card.
- The member photo card is now shorter and lighter on the dashboard face.
- Photo actions are now direct:
  - `Upload photo` / `Change photo`
  - `Remove` only when a photo exists
- The dashboard no longer uses a separate picture-options toggle state for that
  lane.
- `npm run build` passed in `frontend` after the reduction.

#### Open risks or unknowns
- This pass was build-verified, but not followed by a fresh live mobile sweep
  of the updated photo actions.
- The top hero area is lighter now, but still remains visually prominent by
  design.

#### Next recommended step
- Review the dashboard top identity/trust lane live and then continue Phase 2
  only if another surface still clearly reads as domain-heavy.

#### Date
2026-04-19

#### Workstream
Phase 2 dashboard reduction: top trust/identity area reduced to a compact trust
signal and launcher block.

#### Routes/screens affected
- `/app/dashboard`

#### Backend routes/endpoints involved
- none

#### Files in play
- `frontend/src/pages/DashboardPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The top dashboard trust/verification block no longer expands into a deep
  trust-control surface with QR, merchant verify, and multi-panel verification
  detail on the dashboard face.
- The visible dashboard face now keeps:
  - `Open Trust` status
  - `CCI` status
  - `TrustSlip` status
  - launcher buttons for `Trust Passport`, `Identity & Integrity`, and
    `TrustSlip` when available
- The dashboard copy now explicitly says deeper trust, TrustSlip, QR, and
  verification detail belongs in Trust Passport and related trust routes.
- Unused dashboard-local QR and merchant-verify helpers were removed after the
  compaction.
- `npm run build` passed in `frontend` after the reduction.

#### Open risks or unknowns
- This pass was build-verified, but not followed by a fresh live mobile sweep
  of the updated trust/identity launcher buttons.
- The trust signal still remains on the dashboard by design; this pass reduced
  depth and control weight, not presence.

#### Next recommended step
- Review the dashboard top trust/identity lane live and then continue Phase 2 by
  reducing the next heaviest member-facing surface only if the launcher pattern
  feels stable.

#### Date
2026-04-19

#### Workstream
Phase 2 dashboard reduction: Market Wisdom simplified from expandable selector
behavior to one rotating summary signal.

#### Routes/screens affected
- `/app/dashboard`

#### Backend routes/endpoints involved
- none

#### Files in play
- `frontend/src/pages/DashboardPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The dashboard Market Wisdom block no longer opens into a multi-signal selector
  grid on the visible face.
- The visible dashboard face now keeps Market Wisdom as:
  - one active rotating signal
  - signal count context
  - one short supporting explanation
- This removes another expandable dashboard control surface while preserving the
  live reading itself.
- `npm run build` passed in `frontend` after the reduction.

#### Open risks or unknowns
- This pass was build-verified, but not followed by a fresh full live mobile
  route sweep.
- The block still remains on the dashboard; this pass only reduced its control
  weight, not its presence.

#### Next recommended step
- Review the top trust/identity area next and decide whether it now carries too
  much visual weight for a member workspace.

#### Date
2026-04-19

#### Workstream
Phase 2 dashboard reduction: Notifications simplified from source-panel
workspace behavior to compact summary-and-launcher behavior.

#### Routes/screens affected
- `/app/dashboard`

#### Backend routes/endpoints involved
- none

#### Files in play
- `frontend/src/pages/DashboardPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The dashboard Notifications block no longer uses the source-chip toggle and
  selected-panel pattern on the visible face.
- The visible dashboard face now keeps Notifications as:
  - one summary line
  - one lead notification preview
  - summary badges
  - launch buttons into the lead route and the notifications page
- This keeps notification awareness on the dashboard while removing the
  mini-workspace behavior that belonged more naturally to the notifications
  screen itself.
- `npm run build` passed in `frontend` after the reduction.

#### Open risks or unknowns
- This pass was build-verified, but not fully re-run through a fresh manual
  mobile route sweep yet.
- The underlying source-group logic still exists in `DashboardPage.tsx` and can
  be cleaned later if the compact face remains stable.

#### Next recommended step
- Continue Phase 2 by reviewing whether `Market Wisdom` should stay on the
  dashboard face at its current weight, or whether the next reduction target
  should be the top trust/identity area instead.

### Previous update

#### Date
2026-04-19

#### Workstream
Phase 2 dashboard reduction: Demand Box simplified from mini-workspace behavior
to compact summary-and-launcher behavior.

#### Routes/screens affected
- `/app/dashboard`

#### Backend routes/endpoints involved
- none

#### Files in play
- `frontend/src/pages/DashboardPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The dashboard Demand Box no longer uses the chip-toggle and selected-panel
  pattern.
- The visible dashboard face now keeps Demand Box as:
  - a summary line
  - current demand preview when one exists
  - urgent/open status badges
  - one clear launcher button into Demand Box
- This removes the dashboard's mini-workspace behavior for demand while keeping
  the route easy to open.
- Unused demand detail panel types/state were removed from
  `DashboardPage.tsx`.
- `npm run build` passed in `frontend` after the reduction.

#### Open risks or unknowns
- This pass was build-verified, but not fully re-run through a fresh manual
  mobile route sweep yet.
- Demand Box route contracts and backend behavior were not changed.

#### Next recommended step
- Continue Phase 2 by compacting the dashboard Notifications block so it also
  behaves more like a summary/launcher than a mini workspace.

### Previous update

#### Date
2026-04-19

#### Workstream
Phase 2 dashboard reduction: Spotlight downgraded from oversized hero surface
to compact summary/launcher behavior.

#### Routes/screens affected
- `/app/dashboard`

#### Backend routes/endpoints involved
- none

#### Files in play
- `frontend/src/pages/DashboardPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Dashboard Spotlight no longer leads with the large media-and-seller-dock
  treatment on the visible face.
- The live dashboard face now presents Spotlight as:
  - a compact summary card
  - trust/status chips
  - a smaller media thumb when available on desktop
  - launcher actions into Marketplace and Shop
  - a minimize control
- This keeps Spotlight available on the dashboard but reduces its domain-owner
  feel, matching the production IA goal that Dashboard should behave like a
  member workspace rather than a second command centre.
- The previous oversized spotlight renderer is still parked in the file behind
  a dormant false branch for reversibility during this recovery phase.
- `npm run build` passed in `frontend` after the reduction.

#### Open risks or unknowns
- The dormant legacy spotlight block should be removed in a later cleanup pass
  once this compact form is confirmed stable.
- This pass did not change backend behavior or route contracts.
- This pass was build-verified, but not yet followed by a fresh live mobile
  click sweep.

#### Next recommended step
- Do a quick live dashboard check for:
  - Spotlight open/minimize behavior
  - Marketplace / Shop launch buttons
- If stable, continue Phase 2 by trimming the next heaviest dashboard-owned
  surface instead of reopening shared-shell work.

### Previous update

#### Date
2026-04-19

#### Workstream
Primary shell navigation realignment to the production workspace spine.

#### Routes/screens affected
- shared authenticated `/app/*` shell
- especially:
  - `/app/dashboard`
  - `/app/community`
  - `/app/marketplace`
  - `/app/finance`
  - `/app/trust`
  - `/app/my-gmfn-and-i?tab=settings`
  - `/app/shop/*`
  - `/app/shop-control`

#### Backend routes/endpoints involved
- none

#### Files in play
- `frontend/src/layout/AppLayout.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The shell previously treated the primary movement spine as:
  - Dashboard
  - Community Home
  - Marketplace
  - Shop Gallery
  - Settings
- `frontend/src/layout/AppLayout.tsx` now aligns the shell more closely with
  the production blueprint:
  - primary movement now presents:
    - Dashboard
    - Community Home
    - Marketplace
    - Finance
    - Trust Passport
  - `Shop Gallery` and `Shop Control` now live under a secondary
    `Shop & storefront` group
  - `Money In`, `Money Out`, `Payment Rails`, and `Payout Details` now live
    under a secondary `Finance tools` group
  - `Settings` now stays under the secondary `Identity & settings` group
  - `TrustSlip` now stays under a secondary `Trust detail` group while
    `Trust Passport` itself remains primary
- The shell copy was updated to reflect the new movement order so the route
  guidance no longer describes Shop Gallery and Settings as primary movement.
- `Finance` now has a first-class shell item with active-route matching that
  also covers:
  - `/app/payment/pool`
  - `/app/payment-rails`
  - `/app/payout-details`
  - `/app/withdrawal-instructions`
  - `/app/payment/loans/*`
- Authenticated mobile-sized headless checks then confirmed:
  - dashboard `Finance` -> `/app/finance`
  - dashboard `Trust Passport` -> `/app/trust`
  - dashboard `Community` -> `/app/community`
- `npm run build` passed in `frontend` after the shell change.

#### Open risks or unknowns
- This is a shell-level expression of the new architecture, not yet the deeper
  page-content reduction pass on Dashboard, Community Home, or Marketplace.
- The current route content still needs to keep converging toward the same
  ownership model so the shell and the page surfaces fully agree.

#### Next recommended step
- Start the next planned structural pass: Dashboard reduction, now that the
  shell expresses the intended primary workspace model.

### Earlier update

#### Date
2026-04-19

#### Workstream
Authenticated mobile-sized route sweep after the Community Home and Marketplace
CTA stabilization pass.

#### Routes/screens affected
- `/app/dashboard`
- `/app/community`
- `/app/marketplace`
- `/app/demand-box`
- `/app/my-gmfn-and-i?tab=settings`

#### Backend routes/endpoints involved
- `POST /auth/login`

#### Files in play
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- A real authenticated headless Chrome session was created against the running
  local frontend (`127.0.0.1:5174`) and backend (`127.0.0.1:8012`) using the
  local test account `admin@test.com` / `pass1234`.
- The target mobile-sized route sweep passed route-load checks for:
  - `/app/dashboard`
  - `/app/community`
  - `/app/marketplace`
  - `/app/demand-box`
  - `/app/my-gmfn-and-i?tab=settings`
- The following in-app click checks also passed in that authenticated session:
  - dashboard `Community Home` -> `/app/community`
  - dashboard `Marketplace` -> `/app/marketplace`
  - dashboard `Open notifications` -> `/app/notifications`
  - community `Demand Box` -> `/app/demand-box`
  - community `Money In` -> `/app/payment/pool`
  - community `Notifications` -> `/app/notifications`
  - marketplace `Finance` -> `/app/finance`
  - marketplace `Money Out` -> `/app/withdrawal-instructions`
  - marketplace `Community Home` -> `/app/community`
  - settings `Dashboard` -> `/app/dashboard`
  - settings `Trust Passport` -> `/app/trust`
- No wrong-route jumps were reproduced in this sweep for the checked buttons.

#### Open risks or unknowns
- This was a strong targeted runtime sweep, not an exhaustive click-through of
  every single route and every single CTA in the app.
- Dynamic shop-row links and lower-priority surfaces outside the tested set
  should only be chased if new live reports show instability.

#### Next recommended step
- Treat the current recovery state as a valid freeze-and-commit point before
  starting more structural or visual changes.

### Earlier update

#### Date
2026-04-19

#### Workstream
Community Home and Marketplace CTA interaction-stability pass.

#### Routes/screens affected
- `/app/community`
- `/app/marketplace`

#### Backend routes/endpoints involved
- none

#### Files in play
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- `CommunityHomePage.tsx` was using `navigateWithOrigin(navigate, ..., location)`
  without importing or initializing `useLocation`, so the page did not have the
  same grounded route-helper setup as the dashboard or marketplace.
- `CommunityHomePage.tsx` now has a local guarded route pattern:
  - `consumeCommunityPointerEvent()`
  - `consumeCommunityButtonEvent()`
  - `openCommunityRoute()`
- The busiest Community Home CTA clusters were converted from plain app-route
  `OriginLink` buttons into explicit guarded buttons:
  - no-community action row
  - `Community command tools`
  - `Finance File & Record`
  - finance preview CTA rows
  - demand summary CTA rows
  - first-circle launch button
- `MarketplacePage.tsx` now has the matching local guarded route pattern:
  - `consumeMarketplacePointerEvent()`
  - `consumeMarketplaceButtonEvent()`
  - `openMarketplaceRoute()`
- `openFinance()` in marketplace now consumes the click event before routing,
  instead of routing as an unguarded button action.
- The busiest Marketplace CTA clusters were converted from plain app-route
  `OriginLink` buttons into explicit guarded buttons:
  - top hero route row
  - top money / trust row
  - visible trust row
  - `Money routes` launch buttons
  - `Community shortcuts`
  - loan workspace shortcut row
- After this pass, the only remaining `OriginLink` in `MarketplacePage.tsx` is
  the dynamic `row.shopTo` shop link, which was not part of the current mobile
  misrouting pattern.
- `npm run build` passed in `frontend` after the pass.

#### Open risks or unknowns
- This pass stabilizes the two heaviest non-dashboard CTA surfaces, but it does
  not prove every lower-risk page in the app is now fully steady.
- The dynamic shop-row `OriginLink` in marketplace and any similar dynamic link
  surfaces elsewhere should be reviewed only if live QA still shows wrong-route
  behavior after this pass.

#### Next recommended step
- Do a focused mobile-sized live QA sweep across:
  - `/app/dashboard`
  - `/app/community`
  - `/app/marketplace`
  - `/app/demand-box`
  - `/app/my-gmfn-and-i?tab=settings`
- If those routes now behave steadily, freeze and commit this recovery state
  before starting any more architecture or UI reshaping.

### Earlier update

#### Date
2026-04-19

#### Workstream
Dashboard spotlight missing-media hardening after confirming the live broadcast
record points to a file that no longer exists on disk.

#### Routes/screens affected
- `/app/dashboard`

#### Backend routes/endpoints involved
- `/marketplace/broadcasts`
- `/uploads/marketplace/images/*`
- `/uploads/marketplace/videos/*`

#### Files in play
- `frontend/src/pages/DashboardPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The current live broadcast row in `marketplace_broadcasts` points to
  `/uploads/marketplace/images/20260419094959_7740ce86046a82c6.jpg`, but that
  file is missing locally and the backend returns `404` for it.
- `DashboardPage.tsx` now resolves spotlight image and video asset URLs through
  the same simpler `resolveSpotlightAssetUrl()` pattern used by the community
  spotlight.
- `frontend/src/components/SpotlightMediaFrame.tsx` now stops rendering a broken
  image after all image candidates fail and falls back cleanly instead.
- The dashboard spotlight now passes a branded fallback surface so a missing
  media file shows a useful message instead of a broken-image icon.

#### Open risks or unknowns
- The current spotlight picture itself is not restored by this code change; the
  record is still live, but the actual media file needs to be republished or
  re-uploaded to show the real image again.

#### Next recommended step
- Build and refresh `/app/dashboard`, confirm the broken icon is gone, then
  republish the spotlight media from Community Home or Shop Control if the real
  picture needs to appear again.

### Earlier update

#### Date
2026-04-19

#### Workstream
Dashboard spotlight interaction stabilization: defer UI-collapse mutations until
the shield is active.

#### Routes/screens affected
- `/app/dashboard`

#### Backend routes/endpoints involved
- none

#### Files in play
- `frontend/src/pages/DashboardPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The dashboard spotlight `Minimize` and seller-panel `Close` controls both use
  the shared `runDashboardUiMutation()` helper.
- That helper was arming the route-local interaction shield and mutating the
  layout in the same click cycle, which still left room for taps to fall into
  another route target as the layout changed.
- `runDashboardUiMutation()` now defers the layout mutation to the next
  animation frame after the shield is armed, so the shield is already mounted
  before the spotlight collapses or closes.

#### Open risks or unknowns
- This improves the shared dashboard layout-toggle path, but any remaining
  wrong-route behavior should now be traced as a separate control-specific bug
  rather than the same spotlight collapse timing issue.

#### Next recommended step
- Build and live-check the spotlight `Minimize` and seller-panel `Close`
  controls again on `/app/dashboard`.

### Earlier update

#### Date
2026-04-19

#### Workstream
Dashboard spotlight restore: reopen spotlight by default instead of restoring a closed state.

#### Routes/screens affected
- `/app/dashboard`

#### Backend routes/endpoints involved
- none

#### Files in play
- `frontend/src/pages/DashboardPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- The dashboard UI state default had `spotlightMinimized: true`, so Spotlight
  started closed by default.
- The dashboard UI storage key has been advanced from `gmfn.dashboard.ui.v3`
  to `gmfn.dashboard.ui.v4`, which clears the old stored minimized state and
  lets Spotlight reopen with the new default.
- The new default is `spotlightMinimized: false`, so Spotlight is visible on
  the dashboard unless the user minimizes it again.

#### Open risks or unknowns
- Advancing the dashboard UI storage key also resets the saved open/closed
  state for the other dashboard UI toggles stored in that same object.

#### Next recommended step
- Build and refresh `/app/dashboard` to confirm Spotlight now appears open
  again, then continue with the next live dashboard check.

### Earlier update

#### Date
2026-04-19

#### Workstream
Dashboard Demand Box routing correction for the `Needs attention` chip.

#### Routes/screens affected
- `/app/dashboard`
- `/app/demand-box`

#### Backend routes/endpoints involved
- none

#### Files in play
- `frontend/src/pages/DashboardPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- In `frontend/src/pages/DashboardPage.tsx`, the Demand Box chip row treated
  `Needs attention` as a preview toggle instead of a direct route action.
- The `Needs attention` chip now routes straight to `/app/demand-box` through
  the existing dashboard-local navigation helper, while the other demand chips
  keep their current preview-toggle behavior.

#### Open risks or unknowns
- Other Demand Box chips such as `Open requests` and `Urgent` still keep the
  older preview-first behavior. If the product owner wants those to route
  directly as well, they should be converted deliberately rather than assumed.

#### Next recommended step
- Build and live-check the dashboard Demand Box block, then keep reviewing
  whether any other dashboard chips should behave as direct route actions.

### Earlier update

#### Date
2026-04-19

#### Workstream
Repo-foundation cleanup: stop tracking generated marketplace upload artifacts.

#### Routes/screens affected
- none directly

#### Backend routes/endpoints involved
- `/marketplace/media/upload-url`
- `/marketplace/media/upload-direct/{kind}/{filename}`
- `/marketplace/media/image`
- `/marketplace/media/video`

#### Files in play
- `.gitignore`
- `gmfn_backend/app/api/routes/marketplace_media.py`
- `gmfn_backend/app/main.py`
- `docs/HANDOFF_NOTES.md`
- tracked generated files under `gmfn_backend/uploads/`

#### Confirmed facts
- `gmfn_backend/uploads/` is now ignored in `.gitignore`.
- The backend recreates required upload directories at runtime:
  `gmfn_backend/app/api/routes/marketplace_media.py` calls `_ensure_dirs()`,
  and `gmfn_backend/app/main.py` also creates the root uploads directory before
  mounting static files.
- A repo-wide reference check did not find source code depending on specific
- checked-in upload filenames outside the generated upload tree itself.
- The pending git change set removes old tracked marketplace upload artifacts
  from version control so runtime-generated media no longer pollutes the repo.

#### Open risks or unknowns
- If any outside process was informally depending on historical uploaded sample
  files living in the repo, those files are now removed from git tracking.
- Runtime uploads will still be created locally during normal use, but they are
  now treated as generated artifacts rather than source files.

#### Next recommended step
- Commit the staged upload-artifact removal and treat that commit as the new
  repo-foundation freeze point before more feature work.

### Date
2026-04-19

### Workstream
Dashboard branding pass corrected to the real visual benchmark:
`GSN summary` inside `WelcomePage`.

### Routes/screens affected
- `/app/dashboard`
- `WelcomePage` as design reference only
- supporting brand docs and continuity notes

### Backend routes/endpoints involved
- none

### Files in play
- `AGENTS.md`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/MyGMFNAndIPage.tsx`
- `frontend/src/lib/gmfnCapabilities.ts`
- `frontend/src/lib/marketWisdom.ts`
- `frontend/src/pages/WelcomePage.tsx`
- `docs/BRAND_STANDARD.md`
- `docs/HANDOFF_NOTES.md`

### Confirmed facts
- Product-owner clarification: the intended premium institutional reference is
  the lighter `GSN summary` treatment inside `frontend/src/pages/WelcomePage.tsx`,
  not the whole `MyGMFNAndIPage`.
- `frontend/src/pages/DashboardPage.tsx` was updated route-locally to move
  toward that Welcome summary language without changing dashboard logic,
  routes, or data contracts.
- The dashboard now uses a lighter blue-white page wash instead of a full-screen
  dark blue field, which makes the route calmer and less intimidating for the
  underbanked audience the product is targeting.
- Dashboard helper styles were retuned toward a more institutional visual
  system: cards, inner cards, route tiles, badges, inputs, and buttons now use
  lighter blue-white panels, calmer borders, and blue-led actions rather than
  relying so heavily on dark/gold treatment.
- The dashboard hero still keeps a premium blue outer field, but its top
  orientation panel now uses the Welcome-summary-style lighter information card
  with dark text, restrained blue emphasis, and gold used as a supporting
  accent rather than the dominant reading color.
- Several main dashboard sections now use the softer branded panel treatment,
  including Spotlight, Demand Control, and Operational Focus.
- The live spotlight block on `/app/dashboard` was then structurally tightened
  again so it behaves more like a dashboard module and less like a full-page
  hero. In `frontend/src/pages/DashboardPage.tsx`, the live spotlight now uses
  a desktop side-by-side composition, a shorter media height, and a useful
  right-hand seller/action preview even when the full seller dock is collapsed.
- The collapsed seller identity dock in the dashboard spotlight was then
  trimmed again because it had become too similar to the expanded dock. The
  collapsed state no longer carries teaser copy or extra seller actions, and
  the spotlight-level `Open shop` actions were removed from both the minimized
  strip and the expanded seller dock so the dashboard spotlight stays quieter
  and relies on marketplace/community navigation instead.
- The seller-dock toggle was then moved off the white side panel and onto the
  spotlight media itself as a premium glass/3D `Open` button. When the dock is
  closed, the extra seller-detail panel no longer renders at all, so the live
  spotlight stays visually cleaner and the control now feels attached to the
  media it governs.
- The first overlay placement still read too much like part of the top badge
  cluster, so the `Open` control was then moved again into its own floating
  layer on the spotlight media. It now sits as a dedicated right-side button
  with stronger depth, separate from the badges, so it stays visible on both
  desktop and compact layouts.
- Spotlight wording was then trimmed again for test readiness. The dashboard
  spotlight no longer carries the maker-facing intro sentence about visibility,
  no longer shows placeholder body copy when no extra detail exists, and the
  expanded seller-action panel now keeps only user-useful status and actions
  instead of long explanatory branding text.
- Spotlight controls were then consolidated further to reduce wasted space.
  `Minimize` was moved onto the spotlight media itself as a second floating
  overlay button under `Open`, and the duplicate minimize controls were removed
  from the section header and expanded seller-action panel. The live spotlight
  now keeps its main controls on-screen instead of spending extra layout space
  around the card.
- The floating `Minimize` control was then softened into the same silver visual
  family as the quieter overlay button treatment so it stays visible without
  pulling too much attention away from the spotlight media.
- The old two-panel Demand Control block was then replaced with one compact
  `Demand Box` surface on `/app/dashboard`. The heavier `Current request` and
  `What you can do now` panels were removed. The demand area now starts with one
  summary line showing open demand pressure, then uses small stable chips inside
  the same box for `Open requests`, `Urgent`, `Current request`, or `Create
  demand`. Pressing any one of those chips opens only one demand detail panel
  underneath inside the same block, so the route keeps the live demand signal
  without the extra wording and split-panel clutter.
- The `What Matters Now` notification block was then reorganised so it reads
  more intelligently on the dashboard. The large explainer, big count boxes,
  separate `What matters now` card, and separate `Next step` card were removed.
  The section now behaves as one compact `Notifications` surface. In collapsed
  state it only tells the user how many notifications are waiting and which
  screens they are coming from. The summary strip also keeps active chips inside
  the same box for `Act now`, `Due soon`, `Unread`, and each live source screen
  such as Demand Box, Open Finance, Join Links, Trust Events, General, or
  Spotlight. Pressing any one of those chips opens only that one detail panel
  underneath inside the same notification box. This keeps the dashboard
  notification area as one common screen instead of several tall mini-blocks or
  a separate open/close inbox section.
- The dashboard `Market Wisdom` block was then restored to a fuller multi-line
  reading. The old maker-facing helper sentence and `What Market Wisdom does`
  explain toggle were removed, because they were taking space while hiding the
  real signal.
- A later system-level correction then removed the remaining capability drift
  between `My GSN and I` and Market Wisdom. The shared capability truth now
  lives in `frontend/src/lib/gmfnCapabilities.ts`, and both
  `frontend/src/pages/MyGMFNAndIPage.tsx` and
  `frontend/src/lib/marketWisdom.ts` now read from that same 22-capability
  source instead of keeping separate hardcoded copies.
- The dashboard no longer shows raw labels such as `Capability 21` in the
  Market Wisdom chip row. It now shows a shared `22 core guide` chip and uses
  the actual capability title and explanation inside the `Guide` row, so the
  user sees a real line from the guide instead of a bare numeric reference.
- Market Wisdom now keeps three main rows in the card:
  `Market`, `GSN`, and `Guide`. The live context line still exists, but it was
  demoted into a smaller `Now` pulse strip under those rows so the dashboard
  stops treating a temporary context signal like a fourth permanent headline.
- `frontend/src/pages/MyGMFNAndIPage.tsx` also now uses the shared capability
  count instead of hardcoded `22` strings and falls back to proverb / GMFN
  explanation text when a capability does not yet have bespoke long-form copy.
- The spotlight `Close` state was then tightened because it felt too heavy
  against the quieter overlay controls. On `/app/dashboard`, the close-state
  button now uses a smaller footprint, lighter silver finish, and softer shadow
  so it lands more cleanly beside the `Minimize` control.
- A readability issue in the Market Wisdom section was corrected during the same
  pass so light panels no longer carry washed-out supporting text and pale
  low-contrast badges.
- `docs/BRAND_STANDARD.md` was corrected to reflect the real reference screen:
  `WelcomePage` summary treatment first, `MyGMFNAndIPage` as a secondary
  structure reference.
- Product-owner clarification for future assistants: `GMFN` is the wider
  corporate / owner context, but `GSN` (`Global Support Network`) is the
  default user-facing brand on visible product surfaces. New frontend wording
  and branded UX surfaces should default to `GSN` unless the product owner
  explicitly asks otherwise.
- The dashboard `Market Wisdom` surface was then reshaped again to feel more
  like a live intelligence module and less like a stacked written memo. The
  backend-driven logic was kept intact: the active reading still rotates from
  spotlight, demand, notifications, trust tone, capability context, and the
  shared market-wisdom deck. The UI now presents that logic through a smaller
  rotating attention stage, clickable signal selectors, a live activity badge,
  and a compressed commitment action when capability `22` is active.
- The user-facing line labels in that Market Wisdom module now default to
  `Market`, `GSN`, `Guide`, and `Now`, so the dashboard surface follows the GSN
  branding rule instead of surfacing `GMFN` as the user-facing label there.
- The four Market Wisdom selector lanes were then collapsed by default. The
  user now sees only the active rotating signal unless they press the
  in-screen `Open all` control inside the live Market Wisdom card. Pressing it
  reveals the four selector lanes in place; pressing `Hide all` collapses them
  again. This keeps the intelligence view visible without leaving the four
  lower selectors permanently open.
- The owner then explicitly froze the `/app/dashboard` Market Wisdom
  presentation and interaction model in this state. Future assistants should
  not restyle or restructure it unless the owner asks directly.
- A last wording cleanup then removed the extra small status chips around that
  section, including the temporary top-right live badge and the category / tone
  mini badges such as `Community`, `Calm`, or `Spotlight live`, so the
  intelligence card stays cleaner and less busy for the target audience.
- After that, the owner asked for the underlying Market Wisdom choice itself to
  rotate faster as well, not only the visible four-face signal layer. The
  dashboard now refreshes the selected Market Wisdom reading every 60 seconds
  instead of every 10 minutes, while keeping the frozen presentation and the
  7-second face rotation intact.
- The route-access card inside the dashboard `Operational Focus` section was
  then tightened into a GSN-style executive `Regular Apps` surface. It now
  keeps the four most-used dashboard routes on the face of the card and hides
  the rest under one `Open all` / `Collapse` control inside the same block,
  rather than leaving the full route list visible all the time.
- That route-access logic still remains usage-aware, but its fallback pool was
  expanded so `Money In` and `Money Out` can also surface alongside Community,
  Marketplace, Finance, and the other main dashboard routes before strong
  usage history has been established. This change is route-local to
  `/app/dashboard` and does not change backend contracts or navigation targets.
- A duplicate route-access layer inside `Operational Focus` was then removed
  after review. The overlap was not across the whole dashboard; it was inside
  the left `Priority Routes` block itself, where an extra `Other core routes`
  grid was repeating the same route-access job already handled by the right
  `Regular Apps` surface. The left block now behaves as a true `Next Route`
  surface with one primary route and optional support routes, while the right
  block remains the stable usage-based app launcher.
- That left route surface was then tightened again for user usefulness, not
  just wording. The logic was kept intact, but the visible block now behaves as
  a plain-language `Do This Now` helper for the target audience: simpler badge,
  simpler title, plain route names such as `Trust`, `Demand Box`, or
  `What Matters Now`, a short reason line explaining why the step helps, and a
  quieter `More help` reveal for the support pages around the current next
  move. This keeps it distinct from the right-side `Regular Apps` launcher.
- The `Do This Now` block was then tightened again so it explains the issue on
  the dashboard itself instead of pushing the user into technical reading
  first. It now uses the existing Open Trust / CCI / verification state to show
  two direct layman-language parts inside the block: what is wrong and what to
  do next. The route names shown inside that block were also softened into
  plainer labels such as `Trust Status`, `Identity Check`, `Verification`,
  `Queue`, `Requests`, and `Demand`. The support pages still exist under
  `More help`, but the main explanation now happens before the user opens them.
- That plain-language guidance was then moved out of the page into the shared
  frontend module `frontend/src/lib/dashboardUserGuidance.ts`. The dashboard
  now reads both the `Do This Now` helper copy and the trust-event notification
  copy from that shared module, so the explanation layer is no longer trapped
  in `DashboardPage.tsx`. This is a system-level frontend correction for the
  dashboard guidance lane rather than another page-only wording patch.
- That shared guidance module was then tightened again so the dashboard helper
  does not merely say `open Trust Status` or `open Verification` and send the
  user away to decode the problem. It now also reads the existing trust
  explainer signals (`weakens` and `next`) and uses them to say, on the
  dashboard itself, what is wrong and the first action to take in simple
  language before the user opens the follow-through page.
- The shared guidance module was then tightened one step further to follow the
  owner’s exact pattern for low-literacy / low-time users: `Problem`, `Why it
  matters`, and `Do this`. The dashboard helper now shows those three parts on
  the card itself, and the shared translator also softens some technical words
  from trust/identity guidance into simpler language before the user sees them.
- That same shared guidance module was then tightened again so the `Problem`
  and `Do this` lines try to name the exact issue more directly instead of
  stopping at general trust wording. In
  `frontend/src/lib/dashboardUserGuidance.ts`, the repair helper now checks the
  live trust/CCI explanation text for clearer issue types such as waiting
  requests, delayed replies, notifications/messages, demand/support pressure,
  unfinished follow-through, or identity/verification gaps, and then rewrites
  the dashboard copy in a more direct low-literacy form. The same shared repair
  interpretation also now feeds the dashboard trust-notice surface, so both the
  helper card and the trust notice use the same system-level explanation layer.
- The dashboard notifications surface was then linked more directly to that
  shared helper logic. Inside `frontend/src/pages/DashboardPage.tsx`, the
  Notifications block now carries its own attached `Notification Guide`
  companion card whenever notifications are present. That companion uses the
  same shared `Problem / Why it matters / Do this` copy as the wider `Do This
  Now` block, adds a direct route button to the current next action, and uses a
  subtle pulse when unread or act-now notification pressure is present. This
  keeps the explanation physically closer to the notification surface without
  changing the shared logic source or the backend contracts.
- A separate shared attention-escalation layer was then added in
  `frontend/src/lib/dashboardAttentionEngine.ts`. This new engine tracks the
  active issue signature in local storage, shows the first popup immediately,
  then escalates reminder timing while the same issue remains unresolved: every
  4 hours at first, then every 2 hours after roughly 2 days, then every 1 hour
  after roughly 4 days while the app is open. The wording also changes with the
  escalation stage instead of repeating the same sentence forever.
- That attention engine is now wired into `/app/dashboard` through a fixed
  slide-down `Attention Guide` popup plus a smaller collapsed reminder pill in
  `frontend/src/pages/DashboardPage.tsx`. The popup uses the same shared
  `Problem / Why it matters / Do this` structure, but adds time-based
  escalation, direct route buttons, and a hide-for-now action.
- Overdue focus commitments now feed that same attention engine directly. When
  a commitment is behind, the popup no longer speaks only in general trust
  language; it now says that the commitment is behind schedule, explains that
  delayed follow-through can weaken trust, and sends the user straight to Focus
  Commitments to check in, replan honestly, or complete the overdue target.
- The repo instructions were also updated in `AGENTS.md` so future assistants
  default user-visible explanation layers and layman-language translations to
  shared/system-level frontend logic unless the owner explicitly asks for a
  page-local exception and that exception is recorded.
- `AGENTS.md` now also records a second guidance rule: helper blocks,
  notification surfaces, and decision cards should explain what is wrong, why
  it matters, and the first action to take before sending the user to another
  page to continue.

### Open risks or unknowns
- This is a dashboard-first pass, not a full-app visual migration.
- Other high-visibility pages such as `/app/community`, `/app/marketplace`, and
  `/app/shop-control` still carry their own older route-local styling systems.
- The dashboard still contains a few intentionally premium dark surfaces,
  especially around the profile/trust block and spotlight media frame. If they
  still feel too heavy in review, soften them in a second dashboard-only pass.
- The spotlight is now less vertically heavy, but the exact ideal height may
  still need visual tuning after browser review on the target screen sizes.
- The new issue/action personalization is only as specific as the live
  trust/CCI explanation signals it receives. If the upstream guidance source is
  itself vague in a given case, the dashboard helper will still become plainer
  than before, but it may not always name a perfectly exact real-world cause.
- The new attention popup/escalation layer is browser-session based. It works
  while the dashboard/web app is open, but it is not yet a true background
  phone/browser-notification system with vibration, service-worker delivery, or
  operating-system-level alerts while the app is closed.

### Next recommended step
- Continue the same Welcome-summary-led branding language into
  `/app/community`, then `/app/marketplace`, then `/app/shop-control`.
- Review the updated `/app/dashboard` `Do This Now` helper against real trust
  and identity states. If any live case still reads too much like translated
  system language, improve the shared detectors in
  `frontend/src/lib/dashboardUserGuidance.ts` instead of patching the page.
- Review the new `Attention Guide` popup live on `/app/dashboard` and decide
  whether the next step should be:
  1. a stronger popup/slide-down behavior,
  2. a true browser/service-worker notification layer for closed-app alerts, or
  3. a trust-summary cleanup so `Trust Journey` becomes quieter when the new
     attention engine is already carrying the immediate warning.
- If the dashboard still feels too dark in the trust/profile block after visual
  review, do a second dashboard-only refinement there rather than reopening the
  whole route.
- If the spotlight still feels oversized after live review, reduce only the
  dashboard spotlight media height again rather than changing other spotlight
  surfaces.

## Previous checkpoint

### Date
2026-04-19

### Workstream
Dashboard spotlight visibility fallback and expired-spotlight diagnosis.

### Routes/screens affected
- `/app/dashboard`
- `/app/community`

### Backend routes/endpoints involved
- `GET /marketplace/broadcasts`
- `POST /marketplace/broadcasts`

### Files in play
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/lib/api.ts`
- `gmfn_backend/app/api/routes/marketplace.py`
- `gmfn_backend/gmfn.db`

### Confirmed facts
- The dashboard spotlight section only loads `active_only` marketplace
  broadcasts by default.
- Backend logs showed successful dashboard requests to
  `GET /marketplace/broadcasts?clan_id=3&active_only=true&limit=20`.
- Local database inspection showed marketplace broadcast records do exist for
  clan `3`, but the latest stored rows are expired.
- Example confirmed row: broadcast `id 56`, created `2026-04-17`, with
  `expires_at` `2026-04-17 23:59:59`, so it is not returned by the dashboard's
  active-only query on `2026-04-19`.
- The issue was therefore not a missing route or broken serializer. It was that
  the dashboard empty state gave no explanation when the latest spotlight had
  already ended.
- `frontend/src/pages/DashboardPage.tsx` was updated so that when no active
  spotlight exists, it also loads the latest recent spotlight snapshot and shows
  an explanatory expired/not-live card instead of only saying
  `No active spotlight is available yet.`
- A later publish attempt with an image failed before spotlight creation because
  backend route `POST /marketplace/media/image` returned `500 Internal Server Error`.
- Root cause: `gmfn_backend/app/api/routes/marketplace_media.py` referenced
  undefined names `IMAGE_UPLOAD_DIR` and `VIDEO_UPLOAD_DIR` inside the image and
  video upload handlers.
- Fix applied: those handlers now write to `_image_upload_dir()` and
  `_video_upload_dir()` respectively.
- Backend process serving `127.0.0.1:8012` was restarted so the media-route fix
  is active in the running app.
- Verified live through the frontend proxy:
  `POST /api/marketplace/media/image` now returns `200 OK` instead of `500`.
- The next failed browser attempt no longer crashed the backend, but still
  stopped before `POST /marketplace/broadcasts`; backend logs showed
  `POST /marketplace/media/image` returning `400 Bad Request`.
- `frontend/src/pages/CommunityHomePage.tsx` was updated so the Spotlight
  panel now validates selected images before upload, only accepts backend-
  supported image types (`JPG`, `PNG`, `WebP`), enforces the same 5MB limit in
  the UI, and shows an inline status/error notice directly beside the publish
  controls instead of relying only on the page-wide notice banner.
- The spotlight image upload limit was then increased from `5 MB` to `10 MB`
  in both backend route `gmfn_backend/app/api/routes/marketplace_media.py` and
  frontend screen `frontend/src/pages/CommunityHomePage.tsx` so heavier local
  photos are less likely to be rejected.
- The backend process on `127.0.0.1:8012` was restarted after the limit change,
  and a live upload check with a `6 MB` test image returned `200 OK` through
  `POST /api/marketplace/media/image`, confirming the higher limit is active.
- The media validator was then tightened for real-world local uploads:
  `gmfn_backend/app/api/routes/marketplace_media.py` now normalizes common image
  MIME aliases such as `image/jpg`, strips MIME parameters, and accepts generic
  `application/octet-stream` uploads when the file extension is still a
  supported image type.
- `frontend/src/pages/CommunityHomePage.tsx` now mirrors that loosened image
  recognition by accepting common MIME aliases and valid `.jpg`, `.jpeg`,
  `.png`, and `.webp` extensions even when the browser reports a generic file
  type.
- After restart, live checks through `/api/marketplace/media/image` succeeded
  for both `image/jpg` and `application/octet-stream` `.jpg` uploads.
- Spotlight rendering was then upgraded so images no longer rely on hard
  `cover` cropping in Community Home and Dashboard. A new frontend component,
  `frontend/src/components/SpotlightMediaFrame.tsx`, now shows the full image
  inside a bounded frame with a softened backdrop, so portrait and uneven local
  photos stay visible without forcing awkward scrolling or random cut-offs.
- Community Home spotlight publishing now accepts either an image or a short
  video, with preview support for both. The spotlight form in
  `frontend/src/pages/CommunityHomePage.tsx` now exposes a separate short-video
  input, uses a smarter media preview, and sends optional `video_url` when a
  spotlight video is uploaded.
- Dashboard spotlight display in
  `frontend/src/pages/DashboardPage.tsx` now uses the same smarter media frame
  and can autoplay a published spotlight video in the live spotlight hero while
  still falling back to an image when needed.
- Backend spotlight broadcasts were extended with `video_url` support in
  `gmfn_backend/app/api/routes/marketplace.py` and
  `gmfn_backend/app/db/models.py`. A local SQLite schema update added
  `marketplace_broadcasts.video_url`, and helper script
  `gmfn_backend/add_broadcast_video_url.py` was added for repeatable local setup.
- Marketplace video upload size was increased to `10 MB`, and a live upload
  check through `POST /api/marketplace/media/video` succeeded with a `9 MB`
  test `.mp4` file after restart.
- To reduce user friction further, Community Home now auto-prepares oversized
  spotlight media before upload. New frontend helper
  `frontend/src/lib/spotlightMediaPrep.ts` can:
  - compress oversized photos into a lighter `.jpg` automatically
  - create a shorter spotlight-ready video clip automatically when the selected
    file is too heavy or too long for the spotlight lane
- `frontend/src/pages/CommunityHomePage.tsx` now uses that helper so users do
  not need to know file sizes in advance. The screen shows when media is being
  prepared and explains when the app has created a lighter picture or kept the
  opening seconds of a spotlight-ready video automatically.
- The spotlight media model was then aligned across the remaining older
  spotlight surfaces. `frontend/src/pages/ShopControlPage.tsx` now supports the
  same `image_url + video_url` publish shape as Community Home, including short
  video upload, optional image fallback, automatic media preparation, and live
  preview through `frontend/src/components/SpotlightMediaFrame.tsx`.
- Read-only spotlight consumers were also aligned to the same media shape:
  `frontend/src/components/CommunityMarketplaceSpotlight.tsx` and
  `frontend/src/pages/ShopGalleryPage.tsx` now read and display spotlight
  `video_url` as well as `image_url`, instead of remaining image-only.
- The mini spotlight card on `frontend/src/pages/ShopGalleryPage.tsx` then got
  its own sizing correction. Its media lane had been limited to about `108px`
  tall, which made some images look overly compressed compared with the
  dashboard spotlight. The card now gives the media a taller frame and a wider
  desktop column so the same spotlight asset remains legible on the shop
  gallery screen even though the surface is still smaller than the dashboard.
- The mini spotlight card was then tightened again so the media itself occupies
  most of the teaser frame. `frontend/src/components/SpotlightMediaFrame.tsx`
  now accepts route-level content padding overrides, and the mini spotlight in
  `frontend/src/pages/ShopGalleryPage.tsx` uses a denser thumbnail-style fill
  with smaller inner padding. This keeps the shop gallery spotlight visually
  fuller than before while leaving the dashboard spotlight on the more
  full-picture presentation.
- The mini spotlight card was then rebalanced again so more of the fixed card
  goes to the image itself instead of the info stack below it. The media lane
  in `frontend/src/pages/ShopGalleryPage.tsx` was increased again, while the
  lower badges, trust/date line, and action buttons were compressed into a
  tighter layout so the card can devote more of its surface to the picture
  without enlarging the overall block.
- The mini spotlight card was then tightened one more time around the same
  principle: keep the overall card size stable, but move more of that fixed
  surface into the media lane. The community/video chips were moved onto the
  image as overlays, the title/detail and trust/date rows were flattened into a
  more compact layout, and the action buttons were reduced slightly so the
  picture can expand further inside the same block instead of growing the block
  itself.
- The mini spotlight action buttons were then redesigned again to stop
  competing with the card layout. The old bottom button row was removed from
  `frontend/src/pages/ShopGalleryPage.tsx`, those actions now appear as much
  smaller silver overlay buttons on the spotlight media itself, and the freed
  space was handed back to the image lane so the picture can grow inside the
  same card footprint.
- The text band under the mini spotlight was then flattened again to remove
  leftover white space. Instead of keeping the title/detail and trust/date as
  stacked blocks, `frontend/src/pages/ShopGalleryPage.tsx` now uses a more
  linear single-row info ribbon with ellipsis handling, and the saved height
  was handed back to the media lane so the spotlight image can expand a bit
  more inside the same outer card.
- The mini spotlight footer was then refined again so the spotlight tag can
  sit with the date on the same side instead of competing with the shop title.
  `frontend/src/pages/ShopGalleryPage.tsx` now splits `Tag: ...` out of the
  spotlight message, places that tag beside the timestamp in the right-side
  meta cluster, keeps the shop name as the dominant lower label, and gives the
  media lane a little more of the fixed card height.
- The mini spotlight action logic was then tightened so the overlay buttons
  follow the currently displayed spotlight item exactly. On
  `frontend/src/pages/ShopGalleryPage.tsx`, `Shop` now links only to the active
  spotlight owner's public shop route and `Community` only to that active
  spotlight's linked community route. Those buttons no longer fall back to a
  generic marketplace page when the current spotlight item does not expose that
  specific target.
- The dashboard fix is route-local and built successfully with
  `npm run build` in `frontend/`.

### Open risks or unknowns
- The dashboard now explains expired spotlight state, but it does not change the
  underlying publishing rules or expiry choices.
- If the running backend process does not auto-reload route changes, the server
  may need a restart before the fixed media upload handlers take effect.
- If spotlight publishing still feels too short-lived in practice, the next
  review should inspect the default expiry experience in
  `frontend/src/pages/CommunityHomePage.tsx`.
- If the browser still appears unresponsive after this UI validation change,
  capture the exact inline Spotlight notice text shown in Community Home and
  compare it against the corresponding backend log entry.
- The supported image formats are still limited to `JPG`, `PNG`, and `WebP`.
  This checkpoint only raised the size limit; it did not broaden format
  support.
- This change makes validation more forgiving, but it still does not add
  browser-safe support for `HEIC/HEIF`; that would require a separate format
  strategy rather than only validator changes.
- Spotlight video support required a schema extension on the local SQLite DB.
  Any other environment using an older `marketplace_broadcasts` table will need
  the same `video_url` column added before the new spotlight code can run there.
- Auto video preparation is frontend/browser-dependent. It currently relies on
  browser support for `MediaRecorder` plus `captureStream()`. Where those APIs
  are unavailable, the app can still explain the problem clearly but may not be
  able to auto-create the shortened clip.
- Shop Control now shares the same spotlight media behavior, but it still uses
  its own route-local validation copy rather than a single shared validator
  module. If future spotlight rules change again, check both
  `frontend/src/pages/CommunityHomePage.tsx` and
  `frontend/src/pages/ShopControlPage.tsx` together.
- The current handoff file now contains both invite-flow and spotlight-flow
  context; if it grows too large, split older entries into an archive section.

### Next recommended step
- Re-test the dashboard spotlight route in the browser after publishing a fresh
  spotlight from Community Home.
- Re-test the compact spotlight composer in `/app/shop-control`, plus the
  community spotlight reader in `CommunityMarketplaceSpotlight` and the mini
  spotlight on `/shop/:gmfnId`, to confirm video-backed spotlights behave the
  same way as image-backed ones across those older surfaces.
- Re-test image-backed spotlight publish specifically, since that path was
  first blocked by the media upload crash and then by frontend/backend file
  validation mismatch.
- If the newly published spotlight still does not appear live, compare the new
  `POST /marketplace/broadcasts` row and its `expires_at` value against the
  dashboard's active-only fetch immediately after publish.

## Auth follow-up

### Date
2026-04-19

### Workstream
Backend login `500` trace and runtime-safe auth fix.

### Routes/screens affected
- `/login`
- `/api/auth/login`

### Backend routes/endpoints involved
- `POST /auth/login`

### Files in play
- `gmfn_backend/app/core/security.py`
- `gmfn_backend/app/api/routes/auth.py`
- `frontend/src/lib/api.ts`
- `frontend/src/pages/LoginPage.tsx`

### Confirmed facts
- The reported login failure was real: `POST /auth/login` could return `500`
  in the current local runtime.
- The root cause was not the login page itself. It was password verification in
  `gmfn_backend/app/core/security.py`, where Passlib's bcrypt backend could
  crash during verification on the current Python/bcrypt runtime with:
  `ValueError: password cannot be longer than 72 bytes...`.
- The failure happened even with a normal short password (`pass1234`), so this
  was a runtime compatibility problem rather than user input length alone.
- A minimal backend fix was added in `gmfn_backend/app/core/security.py`:
  password hash/verify now try Passlib first, then fall back to direct
  `bcrypt.hashpw()` / `bcrypt.checkpw()` if the Passlib bcrypt backend fails.
- Verified after the fix with the local account `admin@test.com`:
  direct backend login at `http://127.0.0.1:8012/auth/login` returned `200`,
  and the frontend proxy path `http://127.0.0.1:5174/api/auth/login` also
  returned `200`.
- The local backend had to be relaunched with dev env values so it could boot
  against `gmfn_backend/gmfn.db`:
  `GMFN_DEV_MODE=1` and
  `GMFN_SECRET_KEY=gmfn-dev-secret-please-change-later`.

### Open risks or unknowns
- The runtime still emits Passlib bcrypt warnings (`error reading bcrypt
  version`) on startup. Login now works, but the environment still has a
  passlib/bcrypt compatibility mismatch worth cleaning up later.
- Passwords longer than bcrypt's 72-byte limit are still a separate product
  concern. This fix stops the crash and falls back safely, but it does not add
  a user-facing password-length policy yet.

### Next recommended step
- Keep the auth fix in `gmfn_backend/app/core/security.py` as the system-level
  protection for the current runtime.
- If auth work continues, decide whether to add an explicit frontend/backend
  password max-length rule so overly long passwords fail clearly instead of
  relying on bcrypt behavior.

## Dashboard cleanup follow-up

### Date
2026-04-19

### Workstream
Dashboard attention-guide cleanup after popup rollout.

### Routes/screens affected
- `/app/dashboard`

### Backend routes/endpoints involved
- none

### Files in play
- `frontend/src/pages/DashboardPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Confirmed facts
- After the attention escalation popup was introduced, the permanently attached
  `Notification Guide` card inside the Notifications block became redundant and
  too heavy for the dashboard surface.
- That attached guide card has now been removed from
  `frontend/src/pages/DashboardPage.tsx`.
- The dashboard now keeps only the popup `Attention Guide` plus the small fixed
  collapsed reminder pill/button when the popup is hidden.
- The Notifications block still shows the notification summary and the
  notification-source panels, but it no longer carries a second permanent
  explanation surface under it.

### Open risks or unknowns
- The owner may still want the collapsed reminder pill/button restyled later,
  but the clutter reduction rule is now clear: no permanently attached
  notification guide card.

### Next recommended step
- Keep the dashboard attention behavior as popup-plus-pill unless the owner
  explicitly asks for a different reminder surface.

## Dashboard layout follow-up

### Date
2026-04-19

### Workstream
Dashboard row cleanup after Market Wisdom.

### Routes/screens affected
- `/app/dashboard`

### Backend routes/endpoints involved
- none

### Files in play
- `frontend/src/pages/DashboardPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Confirmed facts
- The owner confirmed that the left helper card still sitting beside
  `Regular Apps` after Market Wisdom was adding duplication and clutter.
- The `Do This Now` / `priority-routes` dashboard surface has now been removed
  from that row in `frontend/src/pages/DashboardPage.tsx`.
- `Regular Apps` now stands on its own in that area instead of being paired
  with the left helper block.
- The shared next-route / attention logic still remains in code for the popup
  reminder and attention engine; only the permanent dashboard surface was
  removed.
- The outer `Operational Focus` section now speaks more quietly about regular
  apps and commitments instead of surfacing the removed helper card.

### Open risks or unknowns
- `routesExpanded` still exists in the stored dashboard UI state for backwards
  compatibility, but it no longer drives a visible surface after this cleanup.

### Next recommended step
- Keep `Regular Apps` as the only surface in that row unless the owner asks for
  a new dedicated companion there.

### 2026-04-19 addendum

#### Workstream
System-level `Regular Apps` tracking for the dashboard.

#### Routes/screens affected
- `/app/dashboard`
- shared `/app/*` shell through `AppLayout`

#### Backend routes/endpoints involved
- none

#### Files in play
- `frontend/src/layout/AppLayout.tsx`
- `frontend/src/lib/dashboardAppUsage.ts`
- `frontend/src/pages/DashboardPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- `Regular Apps` was previously learning mostly from dashboard-local clicks in
  `frontend/src/pages/DashboardPage.tsx`, not from wider app usage.
- System-level frontend tracking now lives in
  `frontend/src/lib/dashboardAppUsage.ts`.
- `frontend/src/layout/AppLayout.tsx` now records actual route visits for the
  tracked `/app/*` screens, so usage is collected from normal app movement
  rather than only dashboard buttons.
- That shared usage module now writes to
  `gmfn.dashboard.app-usage.v2`, which intentionally replaces the older
  dashboard-local storage version so stale click history does not distort the
  new ranking.
- The shared tracker also includes a short immediate-duplicate guard so React
  development double-effects do not inflate counts on the same route.
- On `/app/dashboard`, the `Regular Apps` face now shows only the true top four
  regularly used apps when real usage history exists.
- If there is not enough real usage history yet, the dashboard still falls back
  to a small safe starter set so the block does not appear empty.
- `Loans & Support` is now part of the same usage/fallback model instead of
  being left out of the regular-app ranking lane.
- Dashboard buttons no longer increment usage locally before navigation; the
  count now comes from arriving on the destination route through the shared app
  shell.
- The `Regular Apps` surface was then visually tightened again for the target
  audience. The extra helper sentence, count badges, and `Open all` / hidden
  routes layer were removed. The block now shows only the `Regular Apps` title
  and the four surface buttons in one compact row, while keeping the same
  system-level usage logic behind it.
- The `Regular Apps` buttons were then compressed again so they no longer read
  like oversized route tiles. On desktop they now behave as smaller direct app
  pills in one straight line, while compact layouts can still wrap cleanly.
- The wider `Operational Focus` header was also cleaned up again so it no
  longer shows maker-facing helper text, and the visible `No review scheduled`
  wording was removed from the dashboard face. Focus review text now appears
  only when there is a real next review to show.
- The dashboard structure was then split one step further: `Regular Apps` now
  lives in its own separate page-level block instead of sharing the old
  `Operational Focus` wrapper with `Focus Commitments`. This keeps the four-app
  row visually independent from the commitment area and reduces congestion on
  the dashboard face.
- The top face of `Focus Commitments` was then compressed with the same rule:
  remove builder-style wording, reduce empty space, and keep the business
  signal. The large headline and helper paragraph were removed, the next-review
  reading moved into a compact header badge when present, and the `On track`,
  `Watch`, and `Behind` counts now sit in one compact summary line instead of
  three tall stat cards.
- That focus-summary lane was then tightened again so the three readings stay
  on one shared row with smaller inline counts, and the empty-state starter
  actions (`Start savings target`, `Start business target`, `Start repayment
  target`) now also sit on one straight row instead of wrapping into extra
  height.
- `Focus Commitments` was then split into its own independent page-level block
  instead of sharing the same outer dashboard wrapper with `Trust Journey`.
  The empty-state copy there was also shortened again so the block stays
  tighter while keeping the same commitment business meaning.

#### Open risks or unknowns
- The usage model is frontend-local storage for now. It is system-level within
  the web app, but it is not yet a backend-synced cross-device history.
- The current tracker covers the main `/app/*` routes that matter for the
  dashboard. If a new route should influence `Regular Apps`, add it in
  `frontend/src/lib/dashboardAppUsage.ts` instead of patching the dashboard
  page directly.

#### Next recommended step
- Live-test the dashboard by opening several different `/app/*` routes in a
  normal session, then return to `/app/dashboard` and confirm the top four on
  the `Regular Apps` face match actual usage order.
- If the owner wants usage to survive across devices or accounts, the next
  escalation is a backend-backed usage history instead of more local-page work.

## Previous checkpoint

### Date
2026-04-19

### Workstream
GSN-branded invite composer and invite-entry continuity.

### Routes/screens affected
- `/invite-composer-preview`
- `/app/clans`
- `/join`
- `/invite/:code`
- `/get-invite/:code`

### Backend routes/endpoints involved
- `POST /clans/{clan_id}/invite`
- `GET /clans/{clan_id}/invite-link`
- `GET /invites/preview/{code}`
- `POST /clans/join-requests`

### Files in play
- `frontend/src/pages/InviteComposerPreviewPage.tsx`
- `frontend/src/pages/ClansPage.tsx`
- `frontend/src/pages/JoinEntryPage.tsx`
- `frontend/src/pages/InviteLandingPage.tsx`
- `frontend/src/App.tsx`
- `frontend/src/lib/api.ts`
- `gmfn_backend/app/api/routes/clans.py`
- `gmfn_backend/app/api/routes/invites.py`

### Confirmed facts
- `frontend/src/pages/InviteComposerPreviewPage.tsx` is a temporary standalone
  branded preview page added in commit `884bd6b` (`Add temporary branded invite
  composer preview`).
- The standalone preview is routed only at `/invite-composer-preview`.
- The live create-invite flow currently lives inside
  `frontend/src/pages/ClansPage.tsx` on authenticated route `/app/clans`.
- The live invite form in `ClansPage` opens as a modal, collects sender,
  receiver, and note, then creates an invite package.
- Frontend create-invite uses `createClanInvite()` in
  `frontend/src/lib/api.ts`, which calls `POST /clans/{clan_id}/invite`.
- Backend create-invite is enforced through
  `gmfn_backend/app/api/routes/clans.py`, where invite creation is tied to the
  clan/community route and admin membership checks.
- Invite consumption remains a distinct flow from invite creation.
- Public invite preview is exposed through `GET /invites/preview/{code}` in
  `gmfn_backend/app/api/routes/invites.py`.
- Join submission reads invite-derived params in
  `frontend/src/pages/JoinEntryPage.tsx` and submits through
  `POST /clans/join-requests`.
- In the current router, `/invite/:code` and `/get-invite/:code` redirect into
  the invite entry path through `/cover` query params.
- `frontend/src/pages/InviteLandingPage.tsx` exists, but it does not appear to
  be the active public route in the current `frontend/src/App.tsx`.
- At the time of this checkpoint, local uncommitted work existed in:
  `frontend/src/pages/ActivateMembershipPage.tsx`,
  `frontend/src/pages/ClansPage.tsx`,
  `frontend/src/pages/InviteComposerPreviewPage.tsx`, and
  `frontend/src/pages/MarketplacePage.tsx`.

### Open risks or unknowns
- The standalone preview and the live modal can drift visually if one is
  polished without updating the other.
- `InviteLandingPage.tsx` may represent an older or alternate invite-entry
  surface; confirm whether it should be restored, retired, or kept as a backup.
- Desktop/web parity against the original phone invite flow still needs a
  deliberate check before broader invite changes.

### Next recommended step
- Continue invite-product work from `frontend/src/pages/ClansPage.tsx`, because
  that is the live create-invite flow.
- Treat `frontend/src/pages/InviteComposerPreviewPage.tsx` as a visual reference
  or sandbox unless it is explicitly promoted into the real route flow.
- If invite-entry behavior changes next, trace the full path across
  `frontend/src/App.tsx`, `frontend/src/pages/JoinEntryPage.tsx`,
  `frontend/src/lib/api.ts`, `gmfn_backend/app/api/routes/clans.py`, and
  `gmfn_backend/app/api/routes/invites.py` before editing.

## 2026-04-19 Dashboard trust journey compression

- Route affected: `/app/dashboard`
- File changed: `frontend/src/pages/DashboardPage.tsx`
- Verification: `npm run build` passed in `frontend`

### What changed

- `Trust Journey` was compressed into a tighter user-facing block instead of a
  large repeated trust report.
- The exact `Helping` and `Needs care` wording is now driven by shared
  frontend logic in `frontend/src/lib/dashboardUserGuidance.ts`, not only by
  page-local wording inside `DashboardPage.tsx`.
- `Trust Journey` and the popup `Attention Guide` now share one trust-attention
  interpreter in `frontend/src/lib/dashboardUserGuidance.ts` through
  `buildDashboardTrustAttentionCore(...)`.
- The posture wording was simplified into more direct language:
  - `Finish your trust record first`
  - `Fix this trust issue now`
  - `Trust is starting to slip`
  - `Trust is working well`
  - `Trust is steady`
- The old large stat-card row and separate `Built / Protected / Weakened /
  Repair` badge row were removed from the default face.
- The visible face now uses:
  - one compact header
  - one row of small trust status pills (`Trust`, `CCI`, `Slip`, `Focus`)
  - three smaller panels: `Helping`, `Needs care`, and `Do this now`
- Expanded trust detail still exists, but it is now lighter:
  - `What is helping`
  - `What needs care`
  - one smaller lower strip for commitment/count summary and the secondary route
- The shared trust-journey explainer now tries to name the exact user-visible
  issue more directly:
  - behind focus commitments
  - waiting join requests
  - unread or act-now notifications
  - missing TrustSlip
  - broader trust/CCI warning text only when the above are not the main issue
- The shared trust-journey explainer also now says more plainly how that issue
  affects trust, CCI, and the user-visible trust record.
- The dashboard popup still keeps its own timing/escalation engine in
  `frontend/src/lib/dashboardAttentionEngine.ts`, but its visible
  `Problem / Why it matters / Do this` text now reads from the same shared
  trust-attention interpreter that feeds `Trust Journey`.
- `Trust Journey` now becomes quieter whenever the popup attention engine is
  active:
  - it keeps the broader trust summary
  - it hides the duplicate `Do this now` panel
  - it shows a smaller note that the urgent next step is already being handled
    by `Attention Guide`
- Expanded `Trust Journey` now includes a shared layman-language explainer block
  that brings these together in one place:
  - `Trust`
  - `CCI`
  - `TrustSlip`
  - `Focus`
  - `Trust Passport`
- That explainer is driven from shared frontend logic in
  `frontend/src/lib/dashboardUserGuidance.ts` so it stays system-level instead
  of becoming page-only wording.
- The explainer now also gives one plain summary of how those parts connect in
  the current live case, for example:
  - missed focus target affecting trust/CCI/TrustSlip
  - waiting request affecting trust and wider identity
  - unread notifications affecting trust and response habit
- That same connected summary is now visible on the main face too:
  - inside `Attention Guide` as `How it connects`
  - inside the visible `Trust Journey` face as `How they connect`
- The intention is that users should not have to expand the block before they
  can see how `Focus`, `Trust`, `CCI`, and `TrustSlip` are linked in the
  current live case.
- The connected summary is system-level frontend logic, not page-only static
  wording:
  - a stable base sentence explains the role of `Focus`, `Trust`, `CCI`, and
    `TrustSlip`
  - a live case sentence is then generated from the current active issue
    (`behind focus`, `waiting request`, `unread reply`, `missing TrustSlip`,
    `CCI/Trust warning`, etc.)
- Shared plain-language translation in
  `frontend/src/lib/dashboardUserGuidance.ts` was also tightened to avoid
  awkward phrases like `clear to people participation`; use simpler phrases
  like `activity people can see` instead.
- `Attention Guide` now has a third action-row button, `Trust Journey`, beside
  the existing route buttons.
- That button closes the popup, marks the attention item as acted for the
  current cycle, and now routes straight to `/app/trust#trust-journey`.
- The full `Trust Journey` block no longer remains on `/app/dashboard`.
- The fuller `Trust Journey` explainer now lives inside
  `frontend/src/pages/TrustScorePage.tsx` on `/app/trust`, where it keeps the
  same main trust-attention teaching model:
  - `Trust`
  - `CCI`
  - `TrustSlip`
  - `Focus`
  - `How they connect`
- Trust Passport now opens that moved block automatically when the route hash is
  `#trust-journey`.
- The Trust Passport copy still reads from shared trust-attention wording in
  `frontend/src/lib/dashboardUserGuidance.ts`, while the route-local block now
  uses current Trust Passport readings plus stored focus-commitment signals.
- `/app/dashboard` `Attention Guide` now has an institutional polish pass in
  `frontend/src/pages/DashboardPage.tsx`:
  - branded executive popup shell using the dashboard blue system
  - stronger hero/header hierarchy
  - cleaner `Problem / Why it matters / Do this now` card layout
  - more polished action-row buttons
  - quieter but more branded collapsed reminder pill
- The popup was then tightened further:
  - narrower shell
  - denser spacing
  - slimmer reminder pill
  - more compact action dock
  - calmer, less airy header/body balance
- This pass changed presentation only; the attention timing, trust-attention
  logic, routes, and button targets were not changed.
- The dashboard spotlight was then tightened again with mobile phones in mind.
  This was kept route-local inside `frontend/src/pages/DashboardPage.tsx` so
  other spotlight readers were not affected.
  - the spotlight media block on `/app/dashboard` now uses a shorter fixed
    presentation height
  - mobile was reduced more aggressively than desktop
  - overlay spacing, title size, and body rhythm were tightened to match the
    shorter frame
  - the full-image `contain` behavior was kept, so this pass normalizes height
    without reintroducing hard crop behavior
- The dashboard spotlight was then shortened one step further after live review
  so it lands closer to a compact mobile hero instead of a tall banner.
  - mobile height was reduced again
  - desktop height was reduced again
  - overlay insets and text rhythm were tightened again to fit the smaller
    frame cleanly
- The dashboard spotlight was then reduced one more step to behave more like a
  dashboard module than a hero.
  - mobile height was reduced again
  - overlay action buttons were shrunk on compact screens
  - the created-at chip was removed from the default mobile face
  - the long spotlight body text was removed from the default mobile face
  - the spotlight title now clamps instead of expanding freely
- A dashboard-wide button tightening pass was then applied in
  `frontend/src/pages/DashboardPage.tsx`.
  - primary, secondary, and subtle dashboard buttons were reduced in default
    height, padding, radius, and font size
  - route-local button styles now force safer wrapping instead of spilling or
    pushing layouts awkwardly
  - the busiest button rows were converted from loose flex-wrap layouts into
    tighter grid-based action rows where needed
  - this was applied to the `Attention Guide`, expired spotlight actions,
    focus composer helper buttons, focus composer save/cancel actions, focus
    item action rows, and empty focus-commitment starter actions
  - `Regular Apps` buttons were also tightened so the dashboard face feels less
    bulky
- The top dashboard trust header was then cleaned again in
  `frontend/src/pages/DashboardPage.tsx`.
  - the pale back control was replaced with a blue route-local back button
  - the `Navigator` badge was removed
  - the extra explanatory sentence under `Trust is the first currency.` was
    removed
  - `GSN` was centered directly under the trust heading
- The explanatory sentence under `Trust is the first currency.` was then
  restored by owner request, while keeping the blue back control, removed
  `Navigator` badge, and centered `GSN`.
- The full top dashboard trust surface was then harmonized in
  `frontend/src/pages/DashboardPage.tsx` so the first section reads as one
  institutional composition instead of stacked unrelated cards.
  - the outer hero shell, inner glass shell, and top trust header were re-tuned
    to share a closer visual language
  - the profile picture lane now sits inside a matching blended panel
  - the trust and verification lane now uses the same more mature shell
    treatment
  - picture actions in that top block were also tightened into a cleaner
    three-column row
- The dashboard spotlight seller-detail close action was then corrected in
  `frontend/src/pages/DashboardPage.tsx`.
  - the risky top overlay `Close` state was removed from the spotlight media
  - the media now keeps only `Open` when closed, plus `Minimize`
  - `Close` now lives at the lower-right of the seller-detail/actions area
  - explicit event blocking was added to the spotlight open/close handlers so
    the close action does not fall through into marketplace navigation
- The dashboard spotlight was then tightened again in
  `frontend/src/pages/DashboardPage.tsx`.
  - spotlight height was reduced again by a stronger step on both mobile and
    desktop so the block behaves less like a hero
  - spotlight radius, top inset, bottom inset, title size, and body font size
    were reduced with it
  - the spotlight `Open`, `Minimize`, and seller-detail `Close` buttons were
    all compressed again so they stop dominating the surface
- The dashboard spotlight interaction routing was then tightened again in
  `frontend/src/pages/DashboardPage.tsx`.
  - spotlight action buttons now use explicit event-consuming handlers instead
    of relying on raw inline clicks
  - `Previous`, `Next`, `Open spotlight`, media-surface `Open`, `Minimize`,
    seller-detail `Open marketplace`, and seller-detail `Close` now all block
    pointer/click fall-through before acting
  - spotlight controls keep a tighter visual look but now use safer mobile
    touch targets so they stop misfiring into nearby routes
- The dashboard spotlight interaction guard was then strengthened in
  `frontend/src/pages/DashboardPage.tsx`.
  - spotlight open/minimize/close/previous/next actions now arm a short
    route-local dashboard interaction shield
  - the transparent fixed shield briefly absorbs leftover taps while the
    spotlight layout changes, so a disappearing spotlight button cannot hand
    the same tap to Community Home, Marketplace, Trust Passport, or another
    control underneath it
- A shared mobile shell route guard was then added in
  `frontend/src/layout/AppLayout.tsx` after tracing the more fundamental cause
  of the wrong-route jumps.
  - the app shell uses fixed mobile navigation and fixed mobile page-action
    surfaces above route content
  - when a page-level tap causes fast layout change, those shell routes can
    catch the tail of the same mobile tap
  - `AppLayout` now arms a short shared route guard when the user starts a main
    content interaction
  - while that guard is active, the fixed mobile bottom nav and fixed mobile
    page-actions panel temporarily stop accepting pointer events
  - this is the shared app-level stability fix intended to reduce wrong-route
    jumps across dashboard interactions, not just inside one button cluster
- The dashboard `Demand Box` block was then cleaned up again in
  `frontend/src/pages/DashboardPage.tsx`.
  - the header now says `Demand Box` once instead of repeating the name in
    multiple badges
  - the top-right header badges were reduced to the essential count only
  - the summary wording was shortened so it no longer repeats `Demand Box`
  - the demand chip logic now avoids showing the same single urgent request as
    `open requests`, `current request`, and `urgent` all at once
- The dashboard `Demand Box` surface was then polished visually in
  `frontend/src/pages/DashboardPage.tsx`.
  - the block now uses a stronger branded shell instead of a flatter white card
  - a top accent bar, denser lead panel, and calmer institutional blue surface
    were added
  - the chip row now uses a tighter grid instead of loose paper-like wrapping
  - the selected detail panel and inner demand cards now use softer tinted
    surfaces instead of plain white blocks
  - spacing and borders were reduced so the module feels more mature and less
    like stacked paper
- The dashboard `Demand Box` CTA and shared mobile shell bottom clearance were
  then tightened before freeze.
  - the demand detail CTA on `/app/dashboard` now uses an explicit route-local
    button with `navigateWithOrigin` instead of the lower-lying `OriginLink`
    surface
  - the CTA now consumes pointer interaction directly before routing
  - `frontend/src/layout/AppLayout.tsx` now gives mobile main content more
    bottom clearance above the fixed bottom nav, so low-on-screen page CTAs do
    not sit too close to the shell routes
- The dashboard then got a stricter route-button stability pass in
  `frontend/src/pages/DashboardPage.tsx`.
  - the remaining dashboard `OriginLink` surfaces were removed from the route
    and replaced with explicit route-local `<button>` navigation using
    `navigateWithOrigin`
  - this now covers the dashboard back control, notification CTAs, trust/CCI
    action buttons, TrustSlip actions, the focus-builder shortcut, and the
    expired-spotlight CTAs
  - the route now uses one local `openDashboardRoute()` helper instead of a
    mixed pattern of `OriginLink`, raw `navigateWithOrigin`, and implicit link
    surfaces
  - the dashboard pointer contract was also corrected:
    - `pointerdown` handlers now stop propagation without cancelling the event
    - `click` handlers do the actual prevent-default/route action work
  - this matters because the earlier pattern was cancelling too early on some
    dashboard controls, which is a likely contributor to touch instability
  - regular-app buttons and TrustSlip/merchant-verify buttons were also brought
    into the safer pointer pattern so the dashboard uses a more consistent
    interaction layer before freeze
- The dashboard then got a matching layout-toggle stability pass in
  `frontend/src/pages/DashboardPage.tsx`.
  - the attention reminder pill, attention action row, trust expand/collapse,
    profile picture options toggle, notification chips, demand chips, and focus
    commitment composer/touch controls now also use the safer pointer pattern
  - layout-changing controls now use the route-local interaction shield more
    deliberately when opening or collapsing UI
  - this means the stability pass is no longer limited to route buttons only;
    fast-open / fast-collapse controls on the dashboard now also resist the
    same tap fall-through problem that was shaking the screen before freeze
- The dashboard then got a final leftover-button audit before freeze.
  - remaining dashboard utility controls were checked against the same
    stability rule
  - `Hide for now`, avatar upload/change/remove, Market Wisdom open/select
    controls, and the notification-group header toggle were brought into the
    same safer pointer pattern
  - after this pass, the dashboard no longer has a mixed population of old
    touch handlers and new touch handlers on the main user-facing controls
- The dashboard attention engine was then calmed at the shared frontend logic
  level in `frontend/src/lib/dashboardAttentionEngine.ts` and
  `frontend/src/pages/DashboardPage.tsx`.
  - the popup signature no longer depends on raw counts and changing message
    text, which were making small dashboard state changes look like a brand-new
    issue
  - the attention cooldown now keys off the latest real touch time
    (`shown` / `dismissed` / `acted`) instead of only the first show time
  - the dashboard attention storage key was advanced to
    `gmfn.dashboard.attention.v2` so older noisy attention state does not keep
    forcing unstable popup behavior
  - the auto-popup also now respects document visibility, so it does not try to
    reopen while the page is not visibly active
- The live spotlight was then restored at the backend data level after the
  dashboard investigation confirmed the real issue was a missing media file,
  not a closed spotlight.
  - the old active spotlight trio was still pointing at the deleted file
    `/uploads/marketplace/images/20260419094959_7740ce86046a82c6.jpg`
  - a newer uploaded replacement image already existed locally at
    `/uploads/marketplace/images/20260419185829_6fba5ebff5f080ff.jpg`
  - the broken active spotlight set was deleted through the real
    `/marketplace/broadcasts/{id}` route and recreated immediately through
    `/marketplace/broadcasts` with the same message (`mkt / Tag: 11`), same
    shop source (`shop_id=1`), and the working replacement image path
  - direct verification then confirmed:
    - `/marketplace/broadcasts?limit=3` now returns the restored image path for
      ids `59, 58, 57`
    - `GET /uploads/marketplace/images/20260419185829_6fba5ebff5f080ff.jpg`
      returns `200 OK`
- The dashboard spotlight was then reduced again in
  `frontend/src/pages/DashboardPage.tsx`.
  - the live spotlight frame now uses a much smaller dashboard-sized height:
    `80px` on compact/mobile and `106px` on desktop
  - border radius, top/bottom insets, title size, and body text size were
    reduced with it so the shorter frame still reads cleanly
  - this was kept route-local to `/app/dashboard`; no other spotlight surface
    was changed in this pass
- A route recovery pass then started across `Community Home` and `Marketplace`
  after confirming the bigger disruption was domain overlap, not one missing
  route contract.
  - `frontend/src/pages/CommunityHomePage.tsx` now restores the selected
    community role on the main hero face and names the tools block as
    `Community command tools`
  - the main hero now reads more like a real command-centre surface:
    - the selected community role is visible again when available
    - the extra `Current step` noise was removed
    - the top action now says `Open Marketplace` instead of the less precise
      `Enter Community`
  - `frontend/src/pages/MarketplacePage.tsx` now treats the overlapping tools
    block as a lighter `Community shortcuts` surface instead of a second full
    command centre
  - marketplace tool overlap was reduced on purpose:
    - the heavy admin-style picture/invite/community-link deck was removed from
      the visible marketplace tools surface
    - the tools section now defaults closed
    - the visible shortcuts now point back to the routes that matter most from
      marketplace context: `Community Home`, `Demand Box`, `Notifications`, and
      `Build First Circle`
  - intent going forward:
    - `Community Home` = community command centre / tool anchor
    - `Marketplace` = commerce, money-readiness, member rows, and support flow
- The settings split was then collapsed to one live settings surface.
  - `frontend/src/layout/AppLayout.tsx`, `frontend/src/App.tsx`,
    `frontend/src/pages/MyGMFNAndIPage.tsx`, and route helpers already treat
    settings as `/app/my-gmfn-and-i?tab=settings`
  - `frontend/src/pages/ThemeSettingsPage.tsx` was confirmed to be a stale
    standalone surface with no active references
  - that page is now a thin redirect to the real settings tab instead of a
    second competing settings UI
  - intent going forward:
    - `My GSN and I` settings tab = authoritative settings surface
    - `ThemeSettingsPage` = legacy-safe redirect only
- The shared explain-helper layer was then rolled back globally through
  `frontend/src/components/ExplainToggle.tsx`.
  - the repeated `What this does` / `What this screen does` helper surfaces had
    spread across many pages and were adding noise while route stability was
    still under review
  - instead of deleting them page by page, the shared component is now switched
    off behind one global constant so the UI can be stabilized first
  - this keeps the rollback reversible while ruling out the helper layer as a
    contributor to perceived clutter and fragility
- A stronger shared interaction recovery then targeted the likely cross-route
  source of button instability in `frontend/src/layout/AppLayout.tsx` and
  `frontend/src/lib/dashboardAttentionEngine.ts`.
  - the mobile bottom nav no longer behaves like a fixed overlay sitting above
    route content
  - the mobile shell now treats the nav as part of layout flow, with the main
    content carrying normal bottom padding instead of living under a floating
    nav layer
  - intent: reduce taps landing on shell navigation when users meant to press
    route content buttons near the bottom of the screen
  - the dashboard Attention Guide was also calmed again at the shared engine
    level
  - it now auto-pops only the first time for a given issue signature, and then
    stays quiet unless that same issue becomes long-persistent
  - intent: keep the guidance value while removing repeated popup disruption
- A compact domain-intro guide pass then replaced scattered help text with one
  small `Your guide` explainer near the top of the main domains.
  - updated routes/screens: `/app/dashboard`, `/app/community`,
    `/app/marketplace`, `/app/shop-gallery`, `/app/finance`, and
    `/app/trust`
  - the wording is intentionally everyday language for ordinary users:
    `Dashboard` is the quick first look, `Community Home` gathers groups,
    `Marketplace` opens one group for live work, `Shop Gallery` is the shop
    door, `Finance` gathers money records, and `Trust Passport` tells the trust
    story
  - the guide voice was then tightened again to speak directly to the app user,
    using `you` / `your` instructions such as `Use Finance`, `Choose your
    group`, and `Use Trust Passport`, instead of sounding like an architecture
    note for the builders
  - this was a language/clarity pass only; it did not change backend rules,
    route contracts, or data ownership
  - known remaining issue: on mobile, some guide/open buttons can still jump to
    the wrong route, especially around `Community Home`; the next recovery pass
    should audit the shared touch/navigation layer before adding more styling
- A first shared mobile tap-stability fix was then added in
  `frontend/src/layout/AppLayout.tsx` and
  `frontend/src/components/DomainIntroToggle.tsx`.
  - confirmed from code: the mobile shell already guarded the bottom navigation
    and page-actions panel during route-content taps, but route content itself
    could still move underneath a finger after an open/collapse click
  - likely contributing cause: after a layout-changing click, a delayed/tail
    mobile tap can land on the route button that moved into the old tap
    position, which explains why a guide/open control could appear to jump into
    `Demand Box`, `Marketplace`, or another nearby route
  - change made: after a mobile click inside the route content, the app shell
    now shows a transparent post-click shield for a very short window so the
    same tap cannot fall through into newly shifted controls
  - change made: the domain guide button now uses `touch-action: manipulation`
    to reduce double-tap/compatibility-click behaviour on mobile
  - this is intentionally a small shared interaction fix, not a page redesign
    and not a route-contract change
- A second narrow-phone shell pass then tightened the shared mobile navigation
  surfaces after phone testing showed the wide/tablet layout was acceptable but
  narrow phone still felt bulky and jumpy.
  - updated files:
    - `frontend/src/layout/AppLayout.tsx`
    - `frontend/src/components/PageTopNav.tsx`
    - `frontend/src/components/OriginLink.tsx`
  - the mobile top bar now uses clear `Menu` and `Tools` labels instead of
    icon-like placeholders
  - the shared page top navigation becomes a compact horizontal chip rail on
    very narrow screens instead of wrapping into tall button blocks
  - the mobile bottom route strip is now static instead of sticky, so it no
    longer behaves like a bottom overlay near route content
  - drawer and page-tool links now close their panels after navigation
  - all shared route links touched in this pass use `touch-action:
    manipulation` to reduce delayed/duplicate mobile tap behavior
  - intent: make narrow-phone navigation feel deliberately mobile-first while
    preserving the existing desktop/tablet route structure

### Intent

- Keep the trust meaning and next action.
- Reduce duplication with other dashboard trust/notification guidance.
- Remove empty space and reduce technical trust-report styling.
- Make the block speak more directly to the user.

## Community Home Shop Control gear pass - 2026-04-20

### Confirmed product/backend truth

- Community Home owns the owner-side shop control entry because one global member
  ID owns one shop across communities.
- Marketplace remains the selected-community working context.
- Vault is real backend entitlement logic, not a mock surface:
  - backend feature code: `vault_slot`
  - product visibility mode: `vault_private`
  - payment instruction type: `vault_subscription`
- Paid spotlight is real backend entitlement logic:
  - backend feature code: `spotlight_priority`
  - payment instruction type: `spotlight_subscription`
- Demand control should not be reintroduced into Community Home as a working
  control. Demand work belongs in Marketplace / Demand Box.

### Work completed

- Updated `frontend/src/components/CommunityShopControlPanel.tsx`.
- The Community Home Shop Control block now explains that one GSN ID owns one
  shop and that the public shop gallery must stay visitor-clean.
- Added compact owner gears inside the block:
  - `Shop gallery` -> opens `/app/shop-assets` and `/app/shop-control`
  - `Shop DP / billboard` -> opens `/app/shop-control`
  - `Vault` -> opens `/app/shop-control`
  - `Free spotlight` -> opens `/app/shop-control`
  - `Paid spotlight` -> opens `/app/shop-control`
  - `Marketplace billboard` -> opens `/app/marketplace` because marketplace
    pictures belong to the selected community context
- Tightened the open/collapse button so it stays button-sized and stops the tap
  from bubbling upward, reducing the mobile flip/jump problem around this panel.
- Changed visible `GMFN ID` label in this panel to `GSN ID` to match the current
  user-facing brand rule.

### Verification

- `npm run build` passed in `frontend`.

## Identity continuity route-guard adjustment - 2026-04-20

### Routes/screens affected

- All routes wrapped by `frontend/src/components/RequireAuth.tsx`
- Especially finance/payment/shop-management links such as `/app/finance`

### Work completed

- Updated `frontend/src/components/RequireAuth.tsx`.
- `reverify_required` no longer blocks normal route navigation. This prevents
  ordinary buttons from opening the full `Reverification needed` route-block
  page when the user is only trying to inspect a page.
- The shared guard still hard-blocks `protected_lock` on protected route
  prefixes.
- Page-local locks, such as Shop Control's `Review Identity First` disabled
  actions, remain in place for sensitive save/payment/publish actions.

### Verification

- `npm run build` passed in `frontend`.

### Next suggested step

- Review `/app/community` on the phone at the Shop Control block. If the gear
  arrangement is accepted, the next implementation pass should add anchors or
  section-specific route state inside `/app/shop-control` so `Open Vault Tools`,
  `Open Spotlight`, and `Open Picture Tools` can scroll directly to the exact
  sub-section instead of only opening the top of Shop Control.

## Community Home community-row summary pass - 2026-04-20

### Product rule clarified

- Community Home should not carry the full Finance body or full Trust Passport
  body.
- The community list should work as a cross-community index for one GSN ID:
  - row number
  - community name
  - global community number
  - final finance standing for that community
  - final trust / CCI standing for that community
- Detailed finance files remain in Finance.
- Detailed trust records remain in Trust Passport / trust routes.

### Work completed

- Updated `frontend/src/pages/CommunityHomePage.tsx`.
- The `Your communities` block now presents each community as a system-level
  summary row instead of a plain picker.
- Each row now shows:
  - community number and name
  - `Global community no`
  - `Finance standing`
  - `Trust / CCI standing`
  - select/open-marketplace actions
- Added `community_code` into the frontend community global-ID resolver, matching
  the current `/clans/me` backend response.
- Prepared the backend for detailed standing while keeping Community Home
  bottom-line only:
  - backend `/clans/me` still returns `community_standing` for Finance or a
    future drill-down
  - Community Home does not display those deeper metrics in the row
  - the visible row shows only `Finance bottom line` and `Trust bottom line`
- Decongested the same row before phone UI polishing:
  - removed role/status clutter from each row
  - removed builder-style explanatory text inside the finance/trust metric cards
  - shortened the section helper sentence so it speaks to the user
  - removed metric chips from Community Home because those details belong in
    Finance / Trust, not the community index
- Added backend-backed context needed for fair judgement:
  - `/clans/me` now returns `member_count` / `members_count`
  - `/clans/me` now returns `community_strength`
  - `/clans/me` now returns `interaction_count` and `interaction_density`
  - interaction density is calculated from the current member's trust events in
    that community, compared against active community size
  - Community Home shows compact `Strength` and `Interaction` chips beside each
    community identity, so finance/trust bottom lines are not judged without the
    size of the group

### Backend completion added

- Updated `gmfn_backend/app/api/routes/clans.py` so `/clans/me` now returns
  backend-backed community standing fields for each community row.
- The route now uses the existing liquidity engine snapshot for each community
  to derive:
  - `community_finance_health`
  - `finance_health`
  - `finance_band`
  - `community_trust_band`
  - `trust_band`
  - `community_cci_score`
  - `community_cci_band`
  - `community_standing`
- `community_standing` carries the underlying compact truth, including member
  count, total personal pool, locked guarantees, available guarantee capacity,
  exposure ratio, risk counts, and risk flags.
- If the liquidity engine cannot produce a snapshot, the route returns
  `Preparing` plus a `sync_issue` instead of letting the frontend infer from
  nothing.

### Verification

- `npm run build` passed in `frontend`.
- `python -m py_compile gmfn_backend/app/api/routes/clans.py` passed.

### Follow-up wording correction

- Updated `frontend/src/pages/CommunityHomePage.tsx` so compressed mobile row
  labels keep their business meaning:
  - `People` now reads as `Numerical strength`
  - `Interaction` now reads as `Interaction density`
  - `Finance` now reads as `Community finance standing`
  - `Trust` now reads as `Cumulative trust standing`
  - `Spotlight` now reads as `Paid spotlight`, matching the backend
    `spotlight_priority` subscription entitlement instead of implying ordinary
    free spotlight exposure
- The visible `Vault` count remains backend-backed by `vault_slot`; no separate
  vote/average-usage metric has been invented in the frontend.
- Placeholder backend states that previously displayed as `Preparing` in these
  compact row signals now display as `Pending` when shown through the summary UI.
- `npm run build` passed in `frontend` after the wording correction.

### Next suggested step

- Review `/app/community` on phone and confirm the row language/spacing. If the
  logic is accepted, the next refinement should be visual only unless the
  product owner asks for additional standing metrics.

## Shop Control owner-facing polish pass - 2026-04-20

### Routes/screens affected

- `/app/community`
- `/app/shop-control`

### Work completed

- Updated `frontend/src/pages/ShopControlPage.tsx`.
- Updated `frontend/src/components/CommunityShopControlPanel.tsx`.
- Shop Control now uses the same GSN deep-blue / light-blue / white / gold
  branded background direction and more embossed card/button surfaces.
- Reworded the page so it speaks to the shop owner/user instead of the builder:
  - `Open Shop Assets` -> `Manage Products`
  - `Open Shop Gallery` -> `View Public Shop`
  - `Copy Gallery Link` -> `Copy Shop Link`
  - `Merchant Verify` language now reads as `Verify Shop` /
    `Shop verification`
  - `Visible blocks` now reads as `Visible items`
- Kept the route behavior unchanged:
  - Community Home still opens `/app/shop-control#shop-control-summary`
  - sensitive shop actions remain locally locked when identity continuity needs
    review
  - no backend contracts, auth rules, or payment rules were changed

### Verification

- `npm run build` passed in `frontend`.
## Community Home Closing Language Tidy - 2026-04-21
- Removed remaining builder-facing wording from Community Home and Shop Control copy so those surfaces speak directly to users.
- Reworded technical cumulative labels toward plain GSN language: money across communities, trust across communities, and main user actions.
- No route, backend, auth, schema, payment, or frozen Dashboard Market Wisdom behavior changed.
- Verification: `git diff --check` passed. Build was not run for this text-only close-out.

## Mobile tap-safety recovery pass - 2026-04-21

### Routes/screens affected

- Protected app shell routes through `RequireAuth`
- `/app/community`
- `/app/marketplace`
- `/app/shop-control`
- `/app/dashboard`

### Work completed

- Hardened route-local button surfaces after phone testing showed edge taps could
  fall onto nearby/underlying controls.
- Community Home collapse controls now consume pointer/click events consistently
  and delay their toggle slightly so layout changes do not steal the same tap.
- The `Your communities` collapse control received an extra full-width,
  taller, isolated tap slab because it was the remaining weak button during
  phone testing.
- After continued phone testing, the whole `Your communities` header row was
  promoted to a controlled tap target with a higher stacking layer. This is meant
  to catch imperfect edge taps on the first Community control instead of letting
  them fall through to other layers.
- A follow-up audit found the emergency Communities header patch had introduced
  a nested interactive structure: a `role="button"` header containing a real
  `<button>`. That was corrected by keeping the header as the single controlled
  tap target and changing the yellow visual control into a non-interactive
  `<span>`.
- Added app-level tap-safety CSS in `frontend/src/index.css` for anchors,
  buttons, role-buttons, summaries, and form controls:
  native mobile tap highlight is suppressed, touch behavior is set to
  manipulation, and keyboard focus remains visible through `:focus-visible`.
- Updated shared `OriginLink` so route links inherit the same tap-safe defaults.
- Shop Control, Marketplace, and Dashboard route-local button styles now suppress
  native mobile tap highlights and use explicit manipulation touch behavior.
- Temporarily disabled the frontend identity-continuity route-block screen in
  `frontend/src/components/RequireAuth.tsx` while mobile tap behavior is being
  audited. The backend identity logic was not deleted. Re-enable
  `IDENTITY_CONTINUITY_ROUTE_BLOCK_ENABLED` and
  `IDENTITY_CONTINUITY_OBSERVATION_ENABLED` after the pilot UI is stable.
- No backend, schema, payment, environment, or Dashboard Market Wisdom behavior
  was changed.

### Verification

- `npx eslint src/pages/CommunityHomePage.tsx src/pages/DashboardPage.tsx src/pages/MarketplacePage.tsx src/pages/ShopControlPage.tsx src/components/CommunityShopControlPanel.tsx src/components/OriginLink.tsx` passed with only existing Marketplace/ShopControl hook dependency warnings.
- `npx eslint src/components/RequireAuth.tsx` passed.
- `npm run build` passed in `frontend`.
- `git diff --check` passed.
- Local phone test URL remains reachable at `http://192.168.1.38:5173`.

### Next suggested step

- Phone-test `/app/community` again, starting with `Your communities`.
- If the first collapse button no longer flashes a misaligned blue rectangle and
  edge taps behave like center taps, commit and push the tap-safety recovery.

## Community Home institutional visual calming pass - 2026-04-21

### Routes/screens affected

- `/app/community`

### Work completed

- Updated `frontend/src/pages/CommunityHomePage.tsx` only.
- Removed the hard navy-to-light background split that made the dark blue frame
  stop partway down the phone screen.
- Replaced the large yellow Open/Collapse controls with calmer white and soft
  blue controls.
- Aligned the Community Home palette more closely with Dashboard:
  pale blue page wash, soft radial blue glow, dashboard-style summary panels,
  dashboard-style raised white-blue buttons, and controlled navy primary
  actions.
- Extended the Dashboard-style surface rhythm across the Community Home blocks:
  main actions now use a soft blue surface, trusted circle uses a gold-soft
  surface, spotlight management uses the dashboard summary surface, communities
  uses a raised white-blue surface, and the embedded Shop Control panel now
  follows the same blue/white/gold-soft button and card language.
- Removed the dark institutional navy outer trail after phone review showed it
  was too heavy. The Community Home outer background is back to the lighter
  Dashboard-style wash, with only soft blue, pink, and gold radial accents so
  the flashes harmonise without darkening the page.
- Kept GSN institutional blue for primary actions and selected-state emphasis.
- Reduced gold/yellow usage to avoid the page feeling flashy while keeping the
  existing structure, route behavior, and tap-safety work intact.
- No backend, auth, schema, payment, route contracts, or Dashboard Market
  Wisdom behavior changed.

### Verification

- `npx eslint src/pages/CommunityHomePage.tsx` passed.
- `git diff --check` passed.
- `npm run build` passed in `frontend`.

### Final polish addendum

- Finished the accepted Community Home visual direction without changing the
  background method.
- Community Home and embedded Shop Control buttons now share the same raised
  3D button language:
  - stable tap-safe controls with no active movement
  - centered wrapped button text
  - softened top highlights so they do not read as harsh white lines
  - deeper bottom shadows for a controlled institutional raised effect
- This background/button method is the current accepted candidate to reuse on
  later domain surfaces after Community Home is signed off.
- No route, backend, auth, schema, payment, or Dashboard Market Wisdom behavior
  changed in this finishing pass.

### Verification after final polish

- `npx eslint src/pages/CommunityHomePage.tsx src/components/CommunityShopControlPanel.tsx` passed.
- `git diff --check -- frontend/src/pages/CommunityHomePage.tsx frontend/src/components/CommunityShopControlPanel.tsx` passed with only normal Windows line-ending warnings.
- `npm run build` passed in `frontend`.

### Centering close-out

- Centered the visible Community Home summary headings after phone review:
  `Your communities`, `Your main actions`, `Shop control`,
  `Grow your trusted circle`, and `Spotlight management`.
- Centered the Community Home hero stat tiles so `Holder`, `Communities`, and
  the visible values such as `admin` and `3` sit in the middle of their cards.
- Centered the communities count badge row under `Your communities`.
- Kept form/task labels inside expanded tools left-aligned where that remains
  more usable.
- No route behavior, backend, schema, payment, auth, or Dashboard Market Wisdom
  behavior changed.

### Verification after centering close-out

- `npx eslint src/pages/CommunityHomePage.tsx src/components/CommunityShopControlPanel.tsx` passed.
- `git diff --check -- frontend/src/pages/CommunityHomePage.tsx frontend/src/components/CommunityShopControlPanel.tsx` passed with only normal Windows line-ending warnings.
- `npm run build` passed in `frontend`.

### Motion/aura freeze

- Added a subtle Community Home aura layer behind all content to create the
  gentle blue/pink/gold patch movement requested after phone review.
- The aura is route-local, decorative only, `pointer-events: none`, below the
  content layer, and respects `prefers-reduced-motion`.
- No button/card position, tap target, route behavior, backend, auth, schema,
  payment, or Dashboard Market Wisdom behavior changed.

### Verification after motion/aura freeze

- `npx eslint src/pages/CommunityHomePage.tsx` passed.
- `git diff --check -- frontend/src/pages/CommunityHomePage.tsx` passed with only normal Windows line-ending warnings.
- `npm run build` passed in `frontend`.

## Shop Assets restore path and local gallery media restore - 2026-04-21

### Routes/screens affected

- `/app/shop-assets`
- `/app/shop/:gmfnId`
- Backend marketplace product update route:
  `PATCH /api/marketplace/products/{product_id}`

### Work completed

- Added backend support for restoring a soft-removed product block by sending
  `is_active: true` or an active/restore status to the existing product update
  endpoint.
- Kept existing slot protection intact: restored community-visible products
  still respect the 12 public product slot limit, and restored Vault products
  still respect active Vault entitlement capacity.
- Updated Shop Assets to fetch owner-managed shop products with
  `only_active=false`, so hidden/soft-removed blocks no longer disappear from
  the owner management screen.
- Added hidden-block counts and a Restore action to Shop Assets. Hidden blocks
  are visually marked as restorable and their public copy-link action is
  disabled until they are live again.
- Added asset URL resolution in Shop Assets so `/uploads/...` images resolve
  correctly in local Vite and production API-backed environments.
- Restored 11 referenced marketplace upload images from
  `gmfn_backend_FREEZE_20260321_211455/uploads` into
  `gmfn_backend/uploads` without deleting or overwriting existing files.
- Confirmed two active newer product records still reference image files that
  do not exist anywhere in this repo:
  `/uploads/marketplace/images/20260326220342_6364908345ab88a4.jpg` and
  `/uploads/marketplace/images/20260412163112_b3deb91a22a05cbf.jpg`.
  Those product records were left intact; the gallery fallback image state will
  handle them until the original media is re-uploaded or replaced.
- No auth, schema, payment, environment config, or Dashboard Market Wisdom
  behavior changed.

### Verification

- `python -m py_compile app/api/routes/marketplace.py` passed in
  `gmfn_backend`.
- `npm run build` passed in `frontend`.

### Shop frame product visibility addendum

- Updated `frontend/src/pages/ShopGalleryPage.tsx` so the public shop frame no
  longer accepts an empty product response caused by stale phone
  `gmfn_selected_clan_id` localStorage.
- The shop gallery now retries product loading in this order:
  current selected community, the shop record's own community id, then an
  explicit no-header fallback that avoids silently sending stale selected-clan
  context.
- This is intended to recover Aberdeen shop products into the shop frame even
  if the phone still remembers a deleted/closed community.

### Verification after shop frame addendum

- `npm run build` passed in `frontend`.
