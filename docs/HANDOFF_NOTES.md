### Public guide narrowed to institutional 22-capabilities-only page (2026-05-03)

- Froze the current `/cover` visual direction by request and did not touch `frontend/src/pages/CoverPage.tsx` in this change.
- Corrected the public `Read the full guide first` destination rendered by `/guide` in `frontend/src/pages/MyGMFNAndIPage.tsx`.
- Public `/guide` now renders a dedicated institutional capabilities reading page instead of lifting the broader `My GSN and I` member/settings surface into the public route.
- Public `/guide` now contains only:
  - a compact institutional capability-map header
  - the 22 core GSN capabilities from `frontend/src/lib/gmfnCapabilities.ts`
  - one practical emoji/sign badge per capability for low-literacy scanning
  - one short plain-language line per capability
  - visual key chips for capability category and tone
- Replaced the earlier long `What it is` / `How it works` / `Why it matters` public guide structure because it repeated the same source idea too many times and made the page too heavy to scan.
- Updated the public `/guide` visual direction from a mostly dark navy reading page into a lighter civic/institutional capability map with white cards, dark ink, category accent rails, and a calmer blue-steel background.
- Removed from the public `/guide` experience by route-local branching:
  - public next-step chooser
  - trust-document family map
  - trust use-case chooser
  - member identity/community badges
  - settings tabs and signed-in member framing
- Preserved `/app/my-gmfn-and-i` behavior for the signed-in member guide/settings route.
- Shared logic impact:
  - no backend rule changed
  - no auth, route contract, schema, or dashboard frozen area changed
  - the 22-capability source remains shared in `frontend/src/lib/gmfnCapabilities.ts`
- Verification:
  - `npm exec -- eslint src/pages/MyGMFNAndIPage.tsx` passed
  - `npm run build` passed

### Approval and activation family received a darker polished surface pass (2026-04-29 22:38)

- Continued the GMFN-only pilot-readiness workstream by taking the strongest remaining active public decision/activation surfaces through a darker institutional polish pass instead of leaving them as lighter holdouts beside the already-upgraded entry family.
- Applied a route-local darker surface pass to `frontend/src/pages/JoinApprovalPage.tsx`:
  - converted the default page cards and soft detail cards to darker navy institutional surfaces
  - retuned badges, labels, helper text, and loading state to the same calmer dark-family language
  - kept the semantic approval/pending/rejection status card behavior intact while making the surrounding details and next-step panels feel more polished and less bright
- Applied a route-local darker surface pass to `frontend/src/pages/JoinRequestPendingPage.tsx`:
  - converted the main page cards, soft process cards, tracking cards, pending notices, and stat tiles to darker institutional surfaces
  - retuned labels, helper text, badges, and value text for dark-surface readability
  - cleaned the broken reviewer separator glyph in the activated-reviewers section to a plain ASCII `-`
- Applied a route-local darker surface pass to `frontend/src/pages/MemberActivationPage.tsx`:
  - converted the outer activation card and main inner activation panel to darker institutional surfaces
  - retuned helper text and key heading colors so the active route still reads clearly on phone while feeling closer to the stronger institutional entry family
- Verification:
  - `npm exec -- eslint src/pages/JoinApprovalPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/MemberActivationPage.tsx`
    -> passed
  - `npm run build`
    -> passed
- Routes impacted:
  - `/join-approval/:requestId`
  - `/pending-approval`
  - `/join-request/pending`
  - `/activate-membership`
- Shared logic impact:
  - no backend rule changed
  - no auth or route contract changed
  - no frozen dashboard surface changed
  - this was a route-local visual/polish pass for active approval and activation pages only

### Public pilot-readiness button sweep removed misleading protected jump-ins (2026-04-29 22:06)

- Started the GMFN-only pilot-readiness workstream by auditing the public entry and jump-in chain for buttons that could send a not-yet-entered user into the wrong protected place.
- Confirmed the strongest mismatch was on public invite / approval / pending surfaces: several buttons were pointing straight to `/app/dashboard#focus-commitments` even though Commitment Builder is a protected post-entry workspace surface.
- Applied a route-local correction batch so those public screens now keep people in public-safe guide routes instead of bouncing them into a protected dashboard target:
  - `frontend/src/pages/JoinByInvitePage.tsx`
    - changed `Open My GSN and I` to `Open full GSN guide`
    - replaced `Open Commitment Builder` with `Read about Commitment Builder first`
    - tightened the helper copy so it now explains Commitment Builder opens after workspace entry
  - `frontend/src/pages/InviteLandingPage.tsx`
    - replaced the direct Commitment Builder jump with the same public-safe guide action
    - tightened the surrounding helper copy to explain Commitment Builder opens after workspace entry
  - `frontend/src/pages/JoinApprovalPage.tsx`
    - changed the guide action to `Open full GSN guide`
    - replaced the direct Commitment Builder jump with the same public-safe guide action
    - tightened the support copy to explain the builder belongs after workspace entry
  - `frontend/src/pages/JoinRequestPendingPage.tsx`
    - changed the guide action to `Open full GSN guide`
    - replaced the direct Commitment Builder jump with the same public-safe guide action
- Applied one signed-in continuation cleanup to `frontend/src/pages/MemberActivationPage.tsx`:
  - after activation, the vague `Continue` action now reads `Build first circle`
  - reordered the activated-state actions so the clearest forward route comes first, followed by Trust and Notifications
- Verification:
  - `npm exec -- eslint src/pages/JoinByInvitePage.tsx src/pages/InviteLandingPage.tsx src/pages/JoinApprovalPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/MemberActivationPage.tsx`
    -> passed
  - `npm run build`
    -> passed
- Routes impacted:
  - `/join-by-invite/:code`
  - founder invitation landing rendered by `frontend/src/pages/InviteLandingPage.tsx`
  - `/join-approval/:requestId`
  - `/pending-approval`
  - `/join-request/pending`
  - `/activate-membership`
- Shared logic impact:
  - no auth core changed
  - no route contract changed
  - no backend rule changed
  - this was a route-local pilot-readiness correction to stop public buttons from promising protected workspace tools too early

### Public guide route was fully wired back into the entry journey (2026-04-29 20:04)

- Continued the same outward-facing/public institutionalization workstream by closing the next real gap after the `/guide` split: the public guide existed, but the main public entry surfaces still did too little to send people there intentionally.
- Extended the route-local public guide correction in `frontend/src/pages/MyGMFNAndIPage.tsx`:
  - kept the signed-in `/app/my-gmfn-and-i` behavior intact
  - kept `/guide` forced to the guide context
  - added a public `NextActionGuide` chooser so the public guide now points cleanly into:
    - `Cover`
    - `Welcome`
    - `Login`
- Applied a route-local entry integration pass to `frontend/src/pages/CoverPage.tsx`:
  - added a new secondary CTA in the cover button dock:
    - `Read the full guide first`
  - this lets public users choose orientation before they step into the next route
- Applied a route-local entry integration pass to `frontend/src/pages/WelcomePage.tsx`:
  - added a new secondary CTA in the `One Clear Next Step` panel:
    - `Open full GSN guide`
  - this makes the public guide part of the same controlled entry journey rather than a hidden side route
- Tightened route language in `frontend/src/pages/InviteLandingPage.tsx`:
  - relabeled the existing `/guide` continuation to:
    - `Open full GSN guide`
  - this keeps the public guide naming consistent across founder/public invitation entry too
- Verification:
  - `npm exec -- eslint src/pages/MyGMFNAndIPage.tsx src/pages/CoverPage.tsx src/pages/WelcomePage.tsx src/pages/InviteLandingPage.tsx`
    -> passed
  - `npm run build`
    -> passed
- Routes impacted:
  - `/guide` rendered by `frontend/src/pages/MyGMFNAndIPage.tsx`
  - `/app/my-gmfn-and-i` rendered by the same page with signed-in behavior preserved
  - `/cover` rendered by `frontend/src/pages/CoverPage.tsx`
  - `/welcome` rendered by `frontend/src/pages/WelcomePage.tsx`
  - founder invitation landing rendered by `frontend/src/pages/InviteLandingPage.tsx`
- Shared logic impact:
  - no backend contract changed
  - no auth or entry-flow contract changed
  - this was a route-local public-guide integration and naming pass only

### Public guide route was separated cleanly from the signed-in member guide flow (2026-04-29 19:46)

- Continued the same outward-facing/public institutionalization workstream by fixing the strongest remaining public holdout: `frontend/src/pages/MyGMFNAndIPage.tsx` was still behaving too much like the signed-in member route even when opened through `/guide`.
- Applied a route-local context pass to `frontend/src/pages/MyGMFNAndIPage.tsx`:
  - added shared `NextActionGuide` support for the public `/guide` route
  - made the route context-aware so `/guide` now:
    - uses `GSN Guide` and `Cover` navigation instead of dashboard framing
    - forces the public guide tab instead of exposing member settings on the public route
    - swaps the hero copy from member-specific `Welcome` language into public guide language
    - replaces the signed-in dashboard/community route grid with a public next-step chooser into:
      - `Cover`
      - `Welcome`
      - `Login`
  - preserved the existing signed-in `/app/my-gmfn-and-i` member/settings behavior for the app route
- Verification:
  - `npm exec -- eslint src/pages/MyGMFNAndIPage.tsx`
    -> passed
  - `npm run build`
    -> passed
- Routes impacted:
  - `/guide` rendered by `frontend/src/pages/MyGMFNAndIPage.tsx`
  - `/app/my-gmfn-and-i` rendered by the same page with signed-in behavior preserved
- Shared logic impact:
  - no backend contract changed
  - no trust rule changed
  - this was a route-local public-vs-app context correction only

### Open Trust and public shop face received a shared outward-facing coherence pass (2026-04-29 19:28)

- Continued the same public-facing institutionalization workstream by tightening the next-step guidance on the outward-facing trust/shop surfaces instead of jumping into a different family.
- Applied a route-local pass to `frontend/src/pages/OpenTrustPage.tsx`:
  - normalized the broken fallback score glyph to plain ASCII `-`
  - strengthened the primary next-step action so `Open Trust Passport` reads as the main fuller-trust path
  - added a new `What to do next` section explaining the difference between:
    - staying with the narrow community reading
    - moving into the fuller Trust Passport story
    - returning to Community when the next step is group activity
- Applied a route-local pass to `frontend/src/pages/ShopGalleryPage.tsx`:
  - added a new `What to do next` section clarifying the difference between:
    - the public shelf
    - the private Vault path
    - returning into protected GSN tools
  - kept this route-local so the public shop face becomes easier to read without touching marketplace contracts or shared shop infrastructure
- Verification:
  - `npm exec -- eslint src/pages/OpenTrustPage.tsx src/pages/ShopGalleryPage.tsx`
    -> passed
  - `npm run build`
    -> passed
- Routes impacted:
  - `/app/open-trust-reading` rendered by `frontend/src/pages/OpenTrustPage.tsx`
  - `/shop/:gmfnId` rendered by `frontend/src/pages/ShopGalleryPage.tsx`
- Shared logic impact:
  - no backend rule, shop visibility rule, or trust contract changed
  - this was a route-local explanation/continuation pass only

## 2026-04-29 19:08

### Workstream
Public vault-access route institutionalization continuation.

### What changed
- Took the remaining public-facing vault access surface through the same calmer institutional pass used across the upgraded entry family, while keeping the access logic and token flow intact.
- `ShopAccessPage.tsx`
  - added a shared darker institutional shell for loading, inactive-link, and active-access states
  - strengthened the main page-card and inner-card chrome so the route feels closer to the upgraded welcome / login / join / activation family
  - upgraded the pill/badge treatment to the same calmer institutional rhythm
  - added shared route-local continuation buttons for:
    - `Back to Welcome`
    - `Open public shop face` when the owner GMFN id is available
  - added a dedicated `What to do next` section so the route explains when to stay in private Vault access and when to leave for the public shop face or a new entry path

### Why
- After the login/create continuation pass, `ShopAccessPage.tsx` was the strongest remaining public-facing transition route still visually and behaviorally sitting outside the calmer institutional family.
- It is not part of the main join/create/account activation flow, but it is still a public-facing controlled-access entry surface and needed the same seriousness and next-step clarity.

### Files touched
- `frontend/src/pages/ShopAccessPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- public private-vault access route rendered by `ShopAccessPage.tsx`
- alias routes that resolve into the same surface:
  - `/shop-access/:token`
  - `/vault-shop-access/:token`

### Verification
- `npm exec -- eslint src/pages/ShopAccessPage.tsx`
- `npm run build`

## 2026-04-29 18:52

### Workstream
Public access and return-entry institutionalization continuation.

### What changed
- Continued the same institutional public-entry pass across the remaining access / return surfaces that still felt brighter and less settled than the upgraded welcome / join / invite / activation routes.
- `LoginPage.tsx`
  - cooled the shell and deepened the hero-card chrome
  - moved the main sign-in action into the same calmer institutional blue treatment now used across the stronger public family
  - tightened the secondary action chrome to the same white / steel rhythm as the upgraded entry routes
- `CreateEntryPage.tsx`
  - cooled the shell and strengthened the main page-card / support-card chrome
  - moved the main create-entry action into the calmer institutional blue treatment
  - tightened the secondary and stage-toggle action language into the same white / steel and blue institutional family
  - replaced the warmer highlighted existing-member card tint with a cooler institutional emphasis so the route stays in-family while preserving the same meaning

### Why
- After the activation-family continuation, the strongest remaining public-entry holdouts were the return-access and create-entry routes.
- They still carried the older brighter white / warmer emphasis more than the newer institutional entry family.
- This pass keeps all route purpose and create/login behavior intact while bringing those routes much closer to the same governed public-entry system.

### Files touched
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/CreateEntryPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- public sign-in / returning-account route rendered by `LoginPage.tsx`
- public create-community / create-entry route rendered by `CreateEntryPage.tsx`

### Verification
- `npm exec -- eslint src/pages/LoginPage.tsx src/pages/CreateEntryPage.tsx`
- `npm run build`

## 2026-04-29 18:38

### Workstream
Public activation and welcome family institutionalization continuation.

### What changed
- Continued the same public-entry institutional tone pass, but this time across the activation family that still sat slightly apart from the calmer cover / login / join / invite surfaces.
- `ActivateMembershipPage.tsx`
  - cooled the outer shell and reduced the lingering warmer wash
  - strengthened the main activation card chrome
  - moved the main activation CTA into the steadier institutional blue action treatment
  - tightened the secondary pill treatment to match the calmer white / steel rhythm already used across the stronger public entry routes
- `MemberActivationPage.tsx`
  - cooled the outer shell and deepened the activation rail
  - replaced the warmer gold guide / activation actions with the same calmer institutional blue and white / steel treatment used across the upgraded public family
  - strengthened the white-card surface so the route feels more aligned with the calmer join / approval / pending screens
- `WelcomePage.tsx`
  - subtly cooled the welcome shell and deepened the hero / route-card chrome
  - kept the route structure and mode logic intact, but brought the activation-launch surface closer to the same institutional family as the rest of the upgraded public entry routes

### Why
- After the join / invite continuation pass, the activation family still felt slightly more visually mixed than the rest of the public entry system.
- This pass keeps all activation and welcome behavior intact while making the routes feel more like one governed entry journey instead of separate visual branches.

### Files touched
- `frontend/src/pages/ActivateMembershipPage.tsx`
- `frontend/src/pages/MemberActivationPage.tsx`
- `frontend/src/pages/WelcomePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- public membership activation route rendered by `ActivateMembershipPage.tsx`
- approved member activation route rendered by `MemberActivationPage.tsx`
- public welcome / route-choice entry screen rendered by `WelcomePage.tsx`

### Verification
- `npm exec -- eslint src/pages/ActivateMembershipPage.tsx src/pages/MemberActivationPage.tsx src/pages/WelcomePage.tsx`
- `npm run build`

## 2026-04-29 18:05

### Workstream
Public join and invite family institutionalization continuation.

### What changed
- Continued the same institutional public-entry direction, but this time across the remaining join / invite review surfaces that still felt warmer or less settled than the upgraded cover / welcome / login / create-entry family.
- `JoinEntryPage.tsx`
  - reduced the warmer gold wash in the outer shell
  - cooled the main container chrome
  - replaced the older gold primary action with the calmer blue institutional action style
  - tightened the secondary route action into the same cooler white / steel action rhythm
- `InviteLandingPage.tsx`
  - darkened the outer shell into the same navy-led institutional family
  - strengthened card borders and shadows
  - cooled the support cards
  - replaced the simpler flat CTA styling with the calmer institutional action treatment
  - corrected the hero helper copy color so it reads clearly against the dark hero panel
- `JoinByInvitePage.tsx`
  - darkened the page shell into the same institutional family
  - upgraded the main surface chrome and support cards
  - moved the main actions into the steadier institutional button treatment
- `JoinApprovalPage.tsx`
  - strengthened the approval route shell with a darker institutional background
  - deepened the hero approval card to match the calmer cover / entry family
  - cooled page and support cards so the route feels more aligned with the newer public entry surfaces
- `JoinRequestPendingPage.tsx`
  - applied the same darker shell treatment
  - deepened the pending-state hero panel
  - cooled the remaining support cards so the route reads more like a serious waiting / review surface than a generic light workflow page

### Why
- The product owner had already pushed the public cover / welcome / login / create-entry family toward a calmer institutional tone.
- The join and invite continuation routes were still more visually mixed, especially the founder invitation and invitation-preview surfaces.
- This pass keeps the route structure and business behavior intact, but makes the wider public join / invitation family feel much more like one governed system.

### Files touched
- `frontend/src/pages/JoinEntryPage.tsx`
- `frontend/src/pages/InviteLandingPage.tsx`
- `frontend/src/pages/JoinByInvitePage.tsx`
- `frontend/src/pages/JoinApprovalPage.tsx`
- `frontend/src/pages/JoinRequestPendingPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- public join-existing-community onboarding route rendered by `JoinEntryPage.tsx`
- public founder invitation preview rendered by `InviteLandingPage.tsx`
- public invite preview rendered by `JoinByInvitePage.tsx`
- public join approval route rendered by `JoinApprovalPage.tsx`
- public pending review route rendered by `JoinRequestPendingPage.tsx`

### Verification
- `npm exec -- eslint src/pages/InviteLandingPage.tsx src/pages/JoinByInvitePage.tsx src/pages/JoinEntryPage.tsx src/pages/JoinApprovalPage.tsx src/pages/JoinRequestPendingPage.tsx`
- `npm run build`

## 2026-04-29 14:53

### Workstream
Cover page institutional calm-down pass.

### What changed
- Reworked `frontend/src/pages/CoverPage.tsx` to keep the exact same page structure while making the visual tone quieter, more mature, and more institution-facing.
- Toned down the top-level page wash so the cover no longer opens with a bright, warm blue cast.
- Shifted the main artwork panel toward deeper navy and steel-blue gradients with only a restrained gold accent.
- Softened the shell border and shadow so the artwork feels more deliberate and less glossy.
- Rebalanced the primary `Continue` button chrome to match the calmer institutional palette already used across the stronger shared system surfaces.
- Muted the decorative wave lines, footer dots, and lower trust-protocol plaque so the page reads as serious and trustworthy rather than warm or demo-like.
- Cleaned duplicate SVG `fill` and `stroke` leftovers that had been introduced during the first cover-page tuning pass.

### Why
- The product owner called out the public cover page as too warm and not serious enough for first trust.
- The page needed to feel closer to a calm financial/institutional entry surface without changing its content model or route structure.
- This pass keeps the same cover-page flow and composition while improving the tone of first impression.

### Files touched
- `frontend/src/pages/CoverPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- public cover page rendered by `CoverPage.tsx`

### Verification
- `npm exec -- eslint src/pages/CoverPage.tsx`
- `npm run build`

## 2026-04-29 15:24

### Workstream
Cover page premium polish pass.

### What changed
- Kept the same public cover-page structure and entry flow, but added a second refinement pass so the page feels more finished and institution-facing.
- Strengthened the artwork shell with:
  - a cleaner outer frame
  - a quieter internal polish layer
  - a deeper lower veil so the CTA area feels anchored instead of floating
- Reworked the CTA area into a more deliberate dock so `Continue` now sits on a stable premium stage rather than directly on the artwork.
- Tuned the `Continue` button to feel more authoritative:
  - slightly larger body
  - calmer shadowing
  - better letter spacing
  - stronger visual weight without becoming loud
- Further muted decorative waves and bottom dots so the page reads less warm/decorative and more calm/credible.
- Refined the trust-protocol plaque typography and contrast so the lower institutional message feels more official and less glossy.

### Why
- After the first calm-down pass, the page was already less warm, but it still needed one more level of finish to feel truly premium and trustworthy.
- The goal of this pass was not to redesign the page, but to make the same structure feel more deliberate, polished, and serious.

### Files touched
- `frontend/src/pages/CoverPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- public cover page rendered by `CoverPage.tsx`

### Verification
- `npm exec -- eslint src/pages/CoverPage.tsx`
- `npm run build`

## 2026-04-29 15:41

### Workstream
Cover page shield-star simplification.

### What changed
- Removed the background carrier/glow shape behind the shield star in `frontend/src/pages/CoverPage.tsx`.
- Kept the star itself, the shield, the `GSN` text, and the rest of the page artwork unchanged.
- This makes the central shield mark read more cleanly and less boxed-in.

### Why
- The product owner specifically called out the star carrier inside the shield as unnecessary and wanted it removed without disturbing the rest of the cover-page composition.
- This pass applies the smallest possible visual change to honor that request.

### Files touched
- `frontend/src/pages/CoverPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- public cover page rendered by `CoverPage.tsx`

### Verification
- `npm exec -- eslint src/pages/CoverPage.tsx`
- `npm run build`

## 2026-04-29 16:22

### Workstream
Public entry family institutionalization pass.

### What changed
- Audited the weaker public entry pages after the cover-page uplift and brought the most visibly warmer screens into the same darker institutional family.
- `WelcomePage.tsx`
  - darkened the main shell and hero surface
  - cooled the guide panel and summary tiles
  - muted leftover bright-gold next-step accents
- `LoginPage.tsx`
  - darkened the page shell and hero card
  - replaced the warmer gold primary button with the calmer white/steel institutional action style
  - cooled the sign-in guide card, saved-details card, and supporting step blocks
- `CreateEntryPage.tsx`
  - darkened the page shell
  - cooled page cards, soft cards, inputs, stage cards, and existing-member surfaces
  - replaced the warmer primary/stage action buttons with the calmer institutional action style
  - cooled the founder guide panel and its helper messaging
- `ActivateMembershipPage.tsx`
  - darkened the page shell
  - cooled the main activation card and inner form panel
  - moved the main activation action into the calmer institutional action style

### Why
- The product owner asked for the weaker inner entry pages, especially the email/sign-in/onboarding pages, to stop feeling warm or demo-like and instead match the more serious, trustworthy institutional direction now established on the cover page.
- This pass keeps the same page structures and flows but makes the public entry family feel much more coherent visually.

### Files touched
- `frontend/src/pages/WelcomePage.tsx`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/CreateEntryPage.tsx`
- `frontend/src/pages/ActivateMembershipPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/welcome`
- `/login`
- public create-community onboarding route rendered by `CreateEntryPage.tsx`
- public approved-member activation route rendered by `ActivateMembershipPage.tsx`

### Verification
- `npm exec -- eslint src/pages/WelcomePage.tsx src/pages/LoginPage.tsx src/pages/CreateEntryPage.tsx src/pages/ActivateMembershipPage.tsx`
- `npm run build`

## 2026-04-29 15:58

### Workstream
Cover page shield-carrier removal correction.

### What changed
- Corrected the earlier interpretation of the cover-page shield request in `frontend/src/pages/CoverPage.tsx`.
- Removed the actual inner geometric carrier beneath `GSN`:
  - the dark five-sided/diamond body
  - the connecting line network
  - the four node dots
- Kept the star itself in place.
- Slightly tightened the shadowed `GSN` text offset so the lettering and star read more centrally after the carrier removal.

### Why
- The product owner clarified that the element to remove was not the star backdrop alone, but the full inner support structure carrying the star inside the shield.
- This pass applies that exact correction while leaving the rest of the cover-page artwork untouched.

### Files touched
- `frontend/src/pages/CoverPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- public cover page rendered by `CoverPage.tsx`

### Verification
- `npm exec -- eslint src/pages/CoverPage.tsx`
- `npm run build`

## 2026-04-28 17:18

### Workstream
Trust-document family symmetry and question-routing completion pass.

### What changed
- Added `frontend/src/lib/trustDocumentUseCases.ts` as a shared trust-surface question router.
  - It now explains, in one governed frontend layer, which trust question belongs to:
    - `CCI`
    - `Identity & Integrity`
    - `Trust Passport`
    - `TrustSlip`
    - `TrustSlip Verify`
- Added `frontend/src/components/TrustDocumentUseCases.tsx` as the reusable UI surface for that chooser.
  - It makes the difference between:
    - the narrower cross-community read
    - the stable identity anchor
    - the fuller trust story
    - the portable proof
    - the public validity check
    visible in one place.
- `TrustScorePage.tsx`
  - now renders the shared trust-document family map
  - now renders the shared trust-surface question chooser
  - this closes a previous asymmetry where Trust Passport had action guidance but not the fuller trust-family map and question-routing layer.
- `TrustSlipPage.tsx`
  - now renders the shared trust-document family map
  - now renders the shared trust-surface question chooser
  - this makes TrustSlip much clearer about when to stay with portable proof and when to move back inward to Trust Passport or Identity.
- `TrustSlipVerifyPage.tsx`
  - now renders the shared trust-surface question chooser after the family map
  - this strengthens the public-verification explanation layer by making the public-vs-private trust boundary even more explicit.
- `IdentityIntegrityPage.tsx`
  - now renders the shared trust-document family map
  - now renders the shared trust-surface question chooser
  - this makes the identity anchor participate much more fully in the same trust-document family language as the other trust screens.
- `CCIReadingPage.tsx`
  - now renders the shared trust-surface question chooser beneath the existing trust-family map
  - this makes the route clearer about when the user should stay with the narrow integrity read versus move out to identity, fuller trust, portable proof, or public verification.
- `MyGMFNAndIPage.tsx`
  - now renders the shared trust-surface question chooser inside the guide tab
  - this improves `/guide` and `/app/my-gmfn-and-i` by giving the wider member guide the same governed trust-question language as the signed-in trust routes.

### Why
- The trust-document family had already gained:
  - shared continuation
  - shared action guidance
  - shared copy/export snapshots
  - a shared trust-family map
- But the full family still was not symmetrical.
- `Trust Passport` and `TrustSlip` especially still lacked the same explicit question-routing layer that would help a user decide which trust surface to open based on the human question in front of them.
- This pass completes much more of that family symmetry and keeps the explanation in shared frontend logic instead of trapping it inside one page.

### Files touched
- `frontend/src/lib/trustDocumentUseCases.ts`
- `frontend/src/components/TrustDocumentUseCases.tsx`
- `frontend/src/pages/TrustScorePage.tsx`
- `frontend/src/pages/TrustSlipPage.tsx`
- `frontend/src/pages/TrustSlipVerifyPage.tsx`
- `frontend/src/pages/IdentityIntegrityPage.tsx`
- `frontend/src/pages/CCIReadingPage.tsx`
- `frontend/src/pages/MyGMFNAndIPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/trust`
- `/app/trust-slip`
- `/app/trust-slip/verify`
- `/app/identity`
- `/app/cci-reading`
- `/guide`
- `/app/my-gmfn-and-i`

### Verification
- `npm exec -- eslint src/pages/TrustScorePage.tsx src/pages/TrustSlipPage.tsx src/pages/TrustSlipVerifyPage.tsx src/pages/IdentityIntegrityPage.tsx src/pages/CCIReadingPage.tsx src/pages/MyGMFNAndIPage.tsx src/components/TrustDocumentFamilyMap.tsx src/components/TrustDocumentUseCases.tsx src/lib/trustDocumentFamilyMap.ts src/lib/trustDocumentUseCases.ts src/lib/trustDocumentActionGuide.ts src/lib/trustDocumentGuide.ts`
- `npm run build`
- ESLint result: touched files passed with the same two pre-existing `react-hooks/exhaustive-deps` warnings still present in `TrustScorePage.tsx` around `revealTrustSection` and `loadAll`.

## 2026-04-28 16:29

### Workstream
Trust-document family map and public-guide alignment pass.

### What changed
- Added `frontend/src/lib/trustDocumentFamilyMap.ts` as a shared source of truth for the trust-document family structure.
  - It now defines the difference between:
    - `Identity & Integrity`
    - `CCI`
    - `Trust Passport`
    - `TrustSlip`
    - `TrustSlip Verify`
  - It also handles signed-in vs public-route availability so the same trust-family explanation can be reused both inside the app and on the wider public/member guide path.
- Added `frontend/src/components/TrustDocumentFamilyMap.tsx` as a reusable explanatory surface.
  - It gives users a clear map of:
    - stable identity
    - cross-community reading
    - personal trust story
    - portable proof
    - public validity check
- `CCIReadingPage.tsx`
  - now renders the shared trust-document family map
  - this makes the CCI surface much clearer about where it sits inside the wider trust-document ecosystem instead of leaving it as an isolated narrow reading
- `MyGMFNAndIPage.tsx`
  - now renders the same shared trust-document family map inside the guide tab
  - on `/guide`, signed-in trust surfaces are explained honestly as app-only where necessary
  - on `/app/my-gmfn-and-i`, the same map becomes a navigable route family
- `TrustSlipVerifyPage.tsx`
  - now renders the trust-document family map as well
  - this is especially useful on the public verification path because it explains what belongs to:
    - public validity
    - portable proof
    - the fuller signed-in trust record

### Why
- The trust-document family had gotten much stronger inside the signed-in app, but the wider explanation layer was still not whole enough.
- `CCIReadingPage.tsx` still needed a clearer explanation of how it differs from the fuller Trust Passport and the portable TrustSlip surfaces.
- `MyGMFNAndIPage.tsx` is the wider user-facing guide route and needed a better trust-document explanation spine so the product can explain the movement from personal trust meaning into outward proof more clearly.
- `TrustSlipVerifyPage.tsx` is the public verification end of the chain, so it now explains that it is one governed part of the wider trust-document family rather than a standalone proof page.

### Files touched
- `frontend/src/lib/trustDocumentFamilyMap.ts`
- `frontend/src/components/TrustDocumentFamilyMap.tsx`
- `frontend/src/pages/CCIReadingPage.tsx`
- `frontend/src/pages/MyGMFNAndIPage.tsx`
- `frontend/src/pages/TrustSlipVerifyPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/cci-reading`
- `/guide`
- `/app/my-gmfn-and-i`
- `/app/trust-slip/verify`
- public TrustSlip verify path rendered by `TrustSlipVerifyPage.tsx`

### Verification
- `npm exec -- eslint src/pages/CCIReadingPage.tsx src/pages/MyGMFNAndIPage.tsx src/pages/TrustSlipVerifyPage.tsx src/components/TrustDocumentFamilyMap.tsx src/lib/trustDocumentFamilyMap.ts src/components/TrustDocumentActionGuide.tsx src/lib/trustDocumentActionGuide.ts`
- `npm run build`

## 2026-04-28 16:08

### Workstream
Trust-document action-guidance consolidation pass.

### What changed
- Added `frontend/src/lib/trustDocumentActionGuide.ts` as a shared source for action-usage guidance across the trust-document family.
  - It now defines shared action guidance for:
    - `Identity & Integrity`
    - `Trust Passport`
    - `TrustSlip`
    - `TrustSlip Verify`
- Added `frontend/src/components/TrustDocumentActionGuide.tsx` as a reusable surface for that guidance.
  - The component explains, in simple language, what each quick-action cluster is for, why it matters, and when to use copy vs print vs verify vs continue.
- `IdentityIntegrityPage.tsx`
  - now renders the shared trust-document action guide after the shared next-action guide
  - this keeps the identity route from feeling like a separate island once the user reaches its copy and trust-forward actions
- `TrustScorePage.tsx`
  - now renders the shared action guide for the Trust Passport action row
  - this gives the route a clearer explanation of:
    - refresh
    - copy trust snapshot
    - print
    - TrustSlip verification handoff
- `TrustSlipPage.tsx`
  - now renders the shared action guide for the portable-document actions
  - this clarifies the difference between:
    - copying the code
    - copying the verify link
    - copying the portable snapshot
    - printing the document
- `TrustSlipVerifyPage.tsx`
  - now renders the shared action guide for the verification actions
  - this clarifies the difference between:
    - carrying the public verification result
    - reopening the verify route
    - returning to Trust Passport for the fuller explanation

### Why
- The previous pass made the trust-document family better at continuation and better at copying/exporting, but it still assumed the user would naturally understand which action to use when.
- That was still too implicit for a trust-heavy product.
- This pass makes the action rows themselves more governed:
  - what to copy
  - what to print
  - what public verification is for
  - when to step back into the fuller trust explanation
- It also keeps this explanation in a shared/system-level frontend layer instead of trapping the action meaning inside one route.

### Files touched
- `frontend/src/lib/trustDocumentActionGuide.ts`
- `frontend/src/components/TrustDocumentActionGuide.tsx`
- `frontend/src/pages/IdentityIntegrityPage.tsx`
- `frontend/src/pages/TrustScorePage.tsx`
- `frontend/src/pages/TrustSlipPage.tsx`
- `frontend/src/pages/TrustSlipVerifyPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/identity`
- `/app/trust`
- `/app/trust-slip`
- `/app/trust-slip/verify`

### Verification
- `npm exec -- eslint src/pages/IdentityIntegrityPage.tsx src/pages/TrustScorePage.tsx src/pages/TrustSlipPage.tsx src/pages/TrustSlipVerifyPage.tsx src/components/TrustDocumentActionGuide.tsx src/lib/trustDocumentActionGuide.ts src/lib/trustDocumentGuide.ts src/lib/trustDocumentSnapshots.ts`
- `npm run build`
- ESLint result: touched files passed with the same two pre-existing `react-hooks/exhaustive-deps` warnings still present in `TrustScorePage.tsx` around `revealTrustSection` and `loadAll`.

## 2026-04-28 15:33

### Workstream
Trust-document snapshot and identity-route alignment pass.

### What changed
- Added `frontend/src/lib/trustDocumentSnapshots.ts` as a shared plain-text snapshot builder for the active trust-document family so the user can copy a coherent reading from multiple trust surfaces without each page inventing its own wording.
- Expanded `frontend/src/lib/trustDocumentGuide.ts` with `buildIdentityIntegrityGuideItems()` so `Identity & Integrity` now participates in the same trust-document continuation family as `CCI`, `TrustSlip`, `TrustSlip Verify`, and `Trust Passport`.
- `IdentityIntegrityPage.tsx`
  - Added a `Copy identity snapshot` action in the top hero actions.
  - Added shared `NextActionGuide` continuation into:
    - `Trust Passport`
    - `CCI`
    - `TrustSlip`
  - Routed that guide through the shared origin-aware navigation helper.
- `CCIReadingPage.tsx`
  - Added a `Copy CCI snapshot` action beside the current identity/trust continuation actions.
- `TrustSlipPage.tsx`
  - Added a shared `Copy TrustSlip snapshot` action to the main quick-action rail.
- `TrustSlipVerifyPage.tsx`
  - Added a shared `Copy verification snapshot` action to the verification quick-action rail.
- `TrustScorePage.tsx`
  - Added a shared `Copy trust snapshot` action to the Trust Passport hero action row.

### Why
- The trust-document family had a better continuation rhythm after the previous pass, but it still lacked one shared copy/export layer.
- `Identity & Integrity` also still sat slightly outside that trust-document family even though it is one of the most important trust-adjacent pages in the app.
- This pass keeps the work route-local and reversible while improving two practical things at once:
  - users can carry a clean summary out of the trust-facing routes more easily
  - the identity route now points forward into the same trust-document system instead of standing alone

### Files touched
- `frontend/src/lib/trustDocumentGuide.ts`
- `frontend/src/lib/trustDocumentSnapshots.ts`
- `frontend/src/pages/IdentityIntegrityPage.tsx`
- `frontend/src/pages/CCIReadingPage.tsx`
- `frontend/src/pages/TrustSlipPage.tsx`
- `frontend/src/pages/TrustSlipVerifyPage.tsx`
- `frontend/src/pages/TrustScorePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/identity`
- `/app/cci-reading`
- `/app/trust-slip`
- `/app/trust-slip/verify`
- `/app/trust`

### Verification
- `npm exec -- eslint src/pages/IdentityIntegrityPage.tsx src/pages/CCIReadingPage.tsx src/pages/TrustSlipPage.tsx src/pages/TrustSlipVerifyPage.tsx src/pages/TrustScorePage.tsx src/lib/trustDocumentGuide.ts src/lib/trustDocumentSnapshots.ts`
- `npm run build`
- ESLint result: touched files passed with the same two pre-existing warnings still present in `TrustScorePage.tsx` for `react-hooks/exhaustive-deps` around `revealTrustSection` and `loadAll`.

## 2026-04-28 14:54

### Workstream
Trust-document continuity and text-quality finishing pass.

### What changed
- Added a shared trust-document next-step helper in `frontend/src/lib/trustDocumentGuide.ts` so the active trust document routes now point users toward the right adjacent trust surfaces with the same system-level guidance language.
- `CCIReadingPage.tsx`
  - Added a shared `NextActionGuide` that can route the user into `Identity & Integrity`, `Trust Passport`, or `TrustSlip`.
  - Added a small route-local `What to do with this reading` section so the page explains both what CCI is good for and what it cannot prove by itself.
  - Replaced the broken non-ASCII fallback dash with a plain safe `-` fallback.
- `TrustSlipPage.tsx`
  - Added the same shared `NextActionGuide` pattern so the portable-trust document can now carry the user cleanly into `TrustSlip Verify`, `Trust Passport`, or `Identity & Integrity`.
- `TrustSlipVerifyPage.tsx`
  - Added the shared `NextActionGuide` so a verification result can now continue into `TrustSlip`, `Trust Passport`, or `Identity & Integrity` instead of stopping at copy/print actions.
  - Replaced the broken non-ASCII fallback dash in the visible-score / issued-date readout with a plain safe `-` fallback.
- `TrustScorePage.tsx`
  - Cleaned the remaining non-ASCII fallback dashes in the trust-passport route so the route no longer leaks broken punctuation into the visible trust and recompute surfaces.
- `TrustTimelinePage.tsx`
  - Cleaned the summary header separator text from bullet punctuation into plain ASCII separators.

### Why
- The active trust-document routes were still too fragmented.
- `CCIReadingPage.tsx` especially felt like a small side-reading instead of a governed part of the trust-document family.
- `TrustSlipPage.tsx` and `TrustSlipVerifyPage.tsx` already had the right document data, but they still relied mostly on local buttons rather than a clearer shared guidance layer to explain the next move.
- Several trust-facing routes were also still leaking broken non-ASCII fallback punctuation into live text.
- This pass keeps the changes route-local and reversible while making the trust document family easier to understand and continue through on phone.

### Files touched
- `frontend/src/lib/trustDocumentGuide.ts`
- `frontend/src/pages/CCIReadingPage.tsx`
- `frontend/src/pages/TrustSlipPage.tsx`
- `frontend/src/pages/TrustSlipVerifyPage.tsx`
- `frontend/src/pages/TrustScorePage.tsx`
- `frontend/src/pages/TrustTimelinePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/cci-reading`
- `/app/trust-slip`
- `/app/trust-slip/verify`
- `/app/trust`
- trust timeline page file `TrustTimelinePage.tsx` (confirmed cleaned, but no active route registration was found in `frontend/src/App.tsx` during this pass)

### Verification
- `npm exec -- eslint src/pages/CCIReadingPage.tsx src/pages/TrustSlipPage.tsx src/pages/TrustSlipVerifyPage.tsx src/pages/TrustScorePage.tsx src/pages/TrustTimelinePage.tsx src/lib/trustDocumentGuide.ts`
- `npm run build`
- ESLint result: the touched files passed; existing warnings remain in `TrustScorePage.tsx` for two pre-existing `react-hooks/exhaustive-deps` findings around `revealTrustSection` and `loadAll`.

## 2026-04-28 14:05

### Workstream
Remaining admin oversight route finishing pass.

### What changed
- Tightened `AdminTrustEventsPage.tsx` and `AdminIncompleteLoansPage.tsx` without changing their route purpose.
- `AdminTrustEventsPage.tsx`
  - Added local touch-safe button styling plus guarded tap handling for the live route-local controls.
  - Added a clearer event overview with tracked/recent/positive/negative/noted counts.
  - Added route-local next-step actions into:
    - `Trust Analytics`
    - `Trust Graph`
    - `Identity Risk`
    - `Command Center`
  - Replaced the always-open raw JSON dump with per-event `Open raw event` / `Collapse raw event` controls.
  - Added `Copy event snapshot` for the current trust-event record.
  - Cleaned the visible timestamp / event-id fallback text so the page no longer shows broken encoded punctuation there.
- `AdminIncompleteLoansPage.tsx`
  - Added local touch-safe action styling plus guarded tap handling for copy actions.
  - Added queue overview tiles for:
    - total coverage gap
    - locked coverage
    - next operational read
  - Added top-level admin continuation actions into:
    - `System Operations`
    - `Bank Console`
    - `Command Center`
  - Added `Copy queue snapshot` for the current incomplete-loan queue.
  - Added per-loan `Copy loan snapshot` alongside `Open Loan Summary`.
  - Cleaned the borrower fallback text so the page no longer shows broken encoded punctuation there.

### Why
- These were the last two admin trust/operations oversight routes still feeling rougher than the rest of the recently tightened command-centre family.
- `AdminTrustEventsPage.tsx` was still dumping raw event JSON by default with no phone-safe drill-down pattern and no clean route handoff into the adjacent admin reading surfaces.
- `AdminIncompleteLoansPage.tsx` already exposed the right queue, but it still lacked the steadier action rhythm and quick operational carry-forward already present in nearby admin pages.
- This keeps both routes route-local and reversible while making the remaining admin oversight surfaces easier to inspect, copy from, and continue from on phone.

### Files touched
- `frontend/src/pages/AdminTrustEventsPage.tsx`
- `frontend/src/pages/AdminIncompleteLoansPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- admin trust events route rendered by `AdminTrustEventsPage.tsx`
- admin incomplete loans route rendered by `AdminIncompleteLoansPage.tsx`

### Verification
- `npm exec -- eslint src/pages/AdminTrustEventsPage.tsx src/pages/AdminIncompleteLoansPage.tsx`
- `npm run build`
## 2026-04-28 13:06

### Workstream
Admin identity-risk drill-down finishing pass.

### What changed
- Tightened `AdminIdentityRiskPage.tsx` without changing its structure.
- Added a small local tap guard helper plus touch-safe stable tap styling for the route's only drill-down control.
- Applied the tightening to the `Detailed identity signals` summary toggle.
- Cleaned the visible timestamp separator text in the signal rows so the page no longer shows broken encoded punctuation there.

### Why
- `AdminIdentityRiskPage.tsx` is mostly read-only, but its one live drill-down path was still a raw `<summary>` control while nearby admin trust/control routes had already been brought onto the steadier phone-safe interaction pattern.
- This keeps the route structure intact while removing one more rough phone interaction point and one more small text-quality defect from the admin review layer.

### Files touched
- `frontend/src/pages/AdminIdentityRiskPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- admin identity risk route rendered by `AdminIdentityRiskPage.tsx`

### Verification
- `npm exec -- eslint src/pages/AdminIdentityRiskPage.tsx`
- `npm run build`

## 2026-04-28 12:39

### Workstream
Bank-console phone-tap tightening pass.

### What changed
- Tightened `BankConsolePage.tsx` without changing its structure.
- Added a small local bank-button guard helper.
- Applied the guard to the direct phone-heavy actions:
  - recent/unmatched/credit list `Copy summary`
  - top summary `Refresh`
  - manual-ingest `Ingest Event`
  - manual-ingest `Run Reconciliation`
  - expected-payments/config `Copy config snapshot`

### Why
- `BankConsolePage.tsx` already had stronger visual button styling, but its most-used live actions were still missing the same tap isolation already used on the steadier trust, join, marketplace, and shop-control routes.
- It is a tester-facing money-control route where refresh, ingest, reconcile, and copy actions need to feel reliable on phone.
- This keeps the current structure intact while bringing the bank-console route into the same phone-safe interaction family.

### Files touched
- `frontend/src/pages/BankConsolePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- bank console route rendered by `BankConsolePage.tsx`

### Verification
- `npm exec -- eslint src/pages/BankConsolePage.tsx`
- `npm run build`

## 2026-04-28 12:28

### Workstream
Admin trust-graph phone-tap tightening pass.

### What changed
- Tightened `AdminTrustGraphPage.tsx` without changing its structure.
- Added a small local shared graph-button guard helper.
- Added touch-safe stable tap styling to the shared route and collapse button surfaces.
- Applied the guard to:
  - graph overview `Open/Collapse`
  - relationship structure `Open/Collapse`
  - visible signals `Open/Collapse`
  - next routes `Open/Collapse`

### Why
- `AdminTrustGraphPage.tsx` was the remaining trust/control admin route still carrying the older raw collapse-button path after the command-centre, exposure, and identity pages had been tightened.
- It is a tester-facing admin reading surface where the main live controls are the section toggles and route cards.
- This keeps the current structure intact while bringing the graph/admin route into the same phone-safe interaction family as the rest of the cleaned trust, join, marketplace, and shop-control surfaces.

### Files touched
- `frontend/src/pages/AdminTrustGraphPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- admin trust graph route rendered by `AdminTrustGraphPage.tsx`

### Verification
- `npm exec -- eslint src/pages/ExposureAdminPage.tsx src/pages/IdentityIntegrityPage.tsx src/pages/AdminTrustGraphPage.tsx`
- `npm run build`

## 2026-04-28 12:19

### Workstream
Admin exposure / identity phone-tap tightening pass.

### What changed
- Tightened `ExposureAdminPage.tsx` and `IdentityIntegrityPage.tsx` without changing their structure.
- `ExposureAdminPage.tsx`
  - Added a small local shared tap guard helper.
  - Added touch-safe stable tap styling to the shared route/action/collapse button surfaces.
  - Applied the guard to:
    - exposure summary `Open/Collapse`
    - pressure reading `Open/Collapse`
    - visible queues `Open/Collapse`
    - next routes `Open/Collapse`
- `IdentityIntegrityPage.tsx`
  - Added a small local shared tap guard helper.
  - Added touch-safe stable tap styling to the shared action/collapse button surfaces.
  - Applied the guard to:
    - `Copy GMFN ID`
    - `Copy TrustSlip Code`
    - identity readings `Open/Collapse`
    - private recovery submit actions
    - why identity and trust changed `Open/Collapse`
    - identity and trust timeline `Open/Collapse`
    - next clean step `Open/Collapse`

### Why
- These two admin trust/control routes were still carrying the older raw phone-button path while the rest of the trust, join, marketplace, and shop-control family had already been tightened.
- They are high-friction tester-facing admin pages where collapse, copy, and recovery actions need to feel steady on phone.
- This keeps the current structure intact while bringing the remaining exposure/identity surfaces into the same interaction family.

### Files touched
- `frontend/src/pages/ExposureAdminPage.tsx`
- `frontend/src/pages/IdentityIntegrityPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- exposure admin route rendered by `ExposureAdminPage.tsx`
- identity integrity route rendered by `IdentityIntegrityPage.tsx`

### Verification
- `npm exec -- eslint src/pages/ExposureAdminPage.tsx src/pages/IdentityIntegrityPage.tsx`
- `npm run build`

## 2026-04-28 12:05

### Workstream
Admin trust/control phone-tap tightening pass.

### What changed
- Tightened `SystemOperationsPage.tsx` and `TrustCommandCentrePage.tsx` without changing their structure.
- Added small shared local button-guard helpers and applied them to these section toggles:
  - `SystemOperationsPage.tsx`
    - operational overview `Open/Collapse`
    - pilot intake monitor `Open/Collapse`
    - live signals `Open/Collapse`
    - operational queues `Open/Collapse`
    - route cards `Open/Collapse`
  - `TrustCommandCentrePage.tsx`
    - executive reading `Open/Collapse`
    - pilot worksheet `Open/Collapse`
    - command summary `Open/Collapse`
    - command routes `Open/Collapse`
    - workflows `Open/Collapse`
    - notes `Open/Collapse`

### Why
- These admin trust/control routes already had steadier route cards, but their section toggles were still using the older raw button path.
- They are tester-facing admin surfaces that can still feel jumpy on phone if the collapse controls are left behind.
- This keeps the current structure intact while bringing the command-center layer into the same interaction family as the cleaned trust, join, marketplace, and shop routes.

### Files touched
- `frontend/src/pages/SystemOperationsPage.tsx`
- `frontend/src/pages/TrustCommandCentrePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- system operations route rendered by `SystemOperationsPage.tsx`
- trust command centre route rendered by `TrustCommandCentrePage.tsx`

### Verification
- `npm exec -- eslint src/pages/SystemOperationsPage.tsx src/pages/TrustCommandCentrePage.tsx src/pages/OpenTrustPage.tsx src/pages/TrustLeaderboardPage.tsx src/pages/TrustAnalyticsPage.tsx src/pages/TrustTimelinePage.tsx src/pages/TrustScorePage.tsx src/pages/TrustSlipVerifyPage.tsx src/pages/TrustSlipPage.tsx src/pages/ShopAssetsPage.tsx src/pages/ShopControlPage.tsx src/components/CommunityShopControlPanel.tsx src/pages/CommunityHomePage.tsx src/pages/MarketplacePage.tsx src/pages/ShopGalleryPage.tsx src/pages/MarketplaceWorkspacePage.tsx src/pages/JoinByInvitePage.tsx src/pages/MyGMFNAndIPage.tsx src/pages/CoverPage.tsx src/pages/LoginPage.tsx src/pages/CreateEntryPage.tsx src/pages/WelcomePage.tsx src/pages/ActivateMembershipPage.tsx src/pages/MemberActivationPage.tsx src/pages/JoinEntryPage.tsx src/pages/NotificationsPage.tsx src/pages/JoinApprovalPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/CommunityJoinRequestsPage.tsx`
- `npm run build`

## 2026-04-28 11:52

### Workstream
Open-trust / trust-leaderboard route action tightening pass.

### What changed
- Tightened `OpenTrustPage.tsx` and `TrustLeaderboardPage.tsx` without changing their structure.
- Added touch-safe stable tap styling to the shared action-button surfaces used by:
  - `Open Trust Passport`
  - `Open Community`
  - `Open Trust`
  - `Open TrustSlip`
  - `Open Open Trust`

### Why
- These trust-facing routes are lighter than the main trust pages, but they still expose real route-jump actions that testers can hit on phone.
- Their action-button surfaces were still missing the same touch-safe button baseline already used on the steadier trust, join, marketplace, and shop routes.
- This keeps the page structure intact while bringing the remaining trust landing/fallback routes into the same interaction family.

### Files touched
- `frontend/src/pages/OpenTrustPage.tsx`
- `frontend/src/pages/TrustLeaderboardPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- open-trust route rendered by `OpenTrustPage.tsx`
- trust-leaderboard route rendered by `TrustLeaderboardPage.tsx`

### Verification
- `npm exec -- eslint src/pages/OpenTrustPage.tsx src/pages/TrustLeaderboardPage.tsx src/pages/TrustAnalyticsPage.tsx src/pages/TrustTimelinePage.tsx src/pages/TrustScorePage.tsx src/pages/TrustSlipVerifyPage.tsx src/pages/TrustSlipPage.tsx src/pages/ShopAssetsPage.tsx src/pages/ShopControlPage.tsx src/components/CommunityShopControlPanel.tsx src/pages/CommunityHomePage.tsx src/pages/MarketplacePage.tsx src/pages/ShopGalleryPage.tsx src/pages/MarketplaceWorkspacePage.tsx src/pages/JoinByInvitePage.tsx src/pages/MyGMFNAndIPage.tsx src/pages/CoverPage.tsx src/pages/LoginPage.tsx src/pages/CreateEntryPage.tsx src/pages/WelcomePage.tsx src/pages/ActivateMembershipPage.tsx src/pages/MemberActivationPage.tsx src/pages/JoinEntryPage.tsx src/pages/NotificationsPage.tsx src/pages/JoinApprovalPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/CommunityJoinRequestsPage.tsx`
- `npm run build`

## 2026-04-28 11:43

### Workstream
Trust-analytics phone-tap tightening pass.

### What changed
- Tightened `TrustAnalyticsPage.tsx` without changing its structure.
- Added a small shared local analytics-button guard helper and applied it to:
  - signal overview `Open/Collapse`
  - signal mix `Open/Collapse`
  - recent trust timeline `Open/Collapse`
  - reading notes `Open/Collapse`

### Why
- `TrustAnalyticsPage` is a tester-facing trust reading route where the main live controls are the section toggles.
- Those toggles were still using the older raw button path compared with the steadier trust, join, marketplace, and shop-control routes.
- This keeps the current structure intact while making the analytics reading surface behave more consistently on phone.

### Files touched
- `frontend/src/pages/TrustAnalyticsPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- trust analytics route rendered by `TrustAnalyticsPage.tsx`

### Verification
- `npm exec -- eslint src/pages/TrustAnalyticsPage.tsx src/pages/TrustTimelinePage.tsx src/pages/TrustScorePage.tsx src/pages/TrustSlipVerifyPage.tsx src/pages/TrustSlipPage.tsx src/pages/ShopAssetsPage.tsx src/pages/ShopControlPage.tsx src/components/CommunityShopControlPanel.tsx src/pages/CommunityHomePage.tsx src/pages/MarketplacePage.tsx src/pages/ShopGalleryPage.tsx src/pages/MarketplaceWorkspacePage.tsx src/pages/JoinByInvitePage.tsx src/pages/MyGMFNAndIPage.tsx src/pages/CoverPage.tsx src/pages/LoginPage.tsx src/pages/CreateEntryPage.tsx src/pages/WelcomePage.tsx src/pages/ActivateMembershipPage.tsx src/pages/MemberActivationPage.tsx src/pages/JoinEntryPage.tsx src/pages/NotificationsPage.tsx src/pages/JoinApprovalPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/CommunityJoinRequestsPage.tsx`
- `npm run build`

## 2026-04-28 11:33

### Workstream
Trust-timeline phone-tap tightening pass.

### What changed
- Tightened `TrustTimelinePage.tsx` without changing its structure.
- Added a small shared local timeline-button guard helper and applied it to:
  - `Back to TrustSlip`
  - `Refresh`
  - `Download Timeline PDF`
  - `Copy Pack ID`
  - `Download Evidence Pack (ZIP)`

### Why
- `TrustTimelinePage` is a public-facing trust review/export route with several high-traffic direct actions.
- Its refresh and export controls were still using the older raw button path compared with the steadier trust, join, marketplace, and shop-control routes.
- This keeps the page structure intact while making the trust timeline/export lane behave more consistently on phone.

### Files touched
- `frontend/src/pages/TrustTimelinePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- trust timeline / evidence export route rendered by `TrustTimelinePage.tsx`

### Verification
- `npm exec -- eslint src/pages/TrustTimelinePage.tsx src/pages/TrustScorePage.tsx src/pages/TrustSlipVerifyPage.tsx src/pages/TrustSlipPage.tsx src/pages/ShopAssetsPage.tsx src/pages/ShopControlPage.tsx src/components/CommunityShopControlPanel.tsx src/pages/CommunityHomePage.tsx src/pages/MarketplacePage.tsx src/pages/ShopGalleryPage.tsx src/pages/MarketplaceWorkspacePage.tsx src/pages/JoinByInvitePage.tsx src/pages/MyGMFNAndIPage.tsx src/pages/CoverPage.tsx src/pages/LoginPage.tsx src/pages/CreateEntryPage.tsx src/pages/WelcomePage.tsx src/pages/ActivateMembershipPage.tsx src/pages/MemberActivationPage.tsx src/pages/JoinEntryPage.tsx src/pages/NotificationsPage.tsx src/pages/JoinApprovalPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/CommunityJoinRequestsPage.tsx`
- `npm run build`

## 2026-04-28 11:24

### Workstream
Trust-score phone-tap tightening pass.

### What changed
- Tightened `TrustScorePage.tsx` without changing its structure.
- Added a small shared local trust-button guard helper and applied it to:
  - `Refresh Trust Reading`
  - `Copy GMFN ID`
  - `Print Trust Passport`
  - `Open TrustSlip Verify`
  - trust journey `Open/Collapse`
  - trust journey route actions
  - trust summary / explainability / breakdown / evidence `Open/Collapse`

### Why
- `TrustScorePage` still had the older repeated raw stop-propagation pattern on its highest-traffic buttons.
- The trust family was already partly cleaned in `TrustSlipPage.tsx` and `TrustSlipVerifyPage.tsx`, so this closes the next visible gap without changing route purpose or layout.
- This keeps the current structure intact while making the fuller trust-review route behave more like the steadier join, marketplace, and shop-control surfaces on phone.

### Files touched
- `frontend/src/pages/TrustScorePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- trust score / trust passport route rendered by `TrustScorePage.tsx`

### Verification
- `npm exec -- eslint src/pages/TrustScorePage.tsx src/pages/TrustSlipVerifyPage.tsx src/pages/TrustSlipPage.tsx src/pages/ShopAssetsPage.tsx src/pages/ShopControlPage.tsx src/components/CommunityShopControlPanel.tsx src/pages/CommunityHomePage.tsx src/pages/MarketplacePage.tsx src/pages/ShopGalleryPage.tsx src/pages/MarketplaceWorkspacePage.tsx src/pages/JoinByInvitePage.tsx src/pages/MyGMFNAndIPage.tsx src/pages/CoverPage.tsx src/pages/LoginPage.tsx src/pages/CreateEntryPage.tsx src/pages/WelcomePage.tsx src/pages/ActivateMembershipPage.tsx src/pages/MemberActivationPage.tsx src/pages/JoinEntryPage.tsx src/pages/NotificationsPage.tsx src/pages/JoinApprovalPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/CommunityJoinRequestsPage.tsx`
- `npm run build`

## 2026-04-27 08:46

### Workstream
Login page phone-tap tightening pass.

### What changed
- Tightened the public sign-in screen in `LoginPage.tsx`.
- Added touch-safe input treatment to the login form.
- Added the shared tap guard to:
  - guide `Collapse`
  - `Sign in`

### Why
- The login screen is the final public handoff in the same welcome/create/join/activate route family.
- It was still using the older raw button treatment on its main sign-in action and guide-close control.
- This keeps the current structure intact while making the existing-member route feel more consistent on phone.

### Files touched
- `frontend/src/pages/LoginPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/login`

### Verification
- `npm exec -- eslint src/pages/LoginPage.tsx src/pages/CreateEntryPage.tsx src/pages/WelcomePage.tsx src/pages/ActivateMembershipPage.tsx src/pages/MemberActivationPage.tsx src/pages/JoinEntryPage.tsx src/pages/NotificationsPage.tsx src/pages/JoinApprovalPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/CommunityJoinRequestsPage.tsx`
- `npm run build`

## 2026-04-27 08:35

### Workstream
Create-entry existing-member route action tightening pass.

### What changed
- Tightened the real route-jump action inside the `Already a member?` helper in `CreateEntryPage.tsx`.
- Added the shared tap guard to:
  - `I am already a member`

### Why
- This button launches the existing-member sign-in route and is a true route action, not a passive helper toggle.
- It was still looser than the newer join and activation route actions on phone.
- The passive helper structure was left intact.

### Files touched
- `frontend/src/pages/CreateEntryPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- public create-community onboarding route rendered by `CreateEntryPage.tsx`

### Verification
- `npm exec -- eslint src/pages/CreateEntryPage.tsx src/pages/WelcomePage.tsx src/pages/ActivateMembershipPage.tsx src/pages/MemberActivationPage.tsx src/pages/JoinEntryPage.tsx src/pages/NotificationsPage.tsx src/pages/JoinApprovalPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/CommunityJoinRequestsPage.tsx`
- `npm run build`

## 2026-04-27 08:26

### Workstream
Welcome entry guide-close phone-tap tightening pass.

### What changed
- Tightened the public welcome/entry guide-close control in `WelcomePage.tsx`.
- Added the same touch-safe tap treatment used on the steadier join and activation screens to:
  - the guide `Collapse` button inside the public GSN summary panel

### Why
- The welcome screen is the first touchpoint in the same join/create/activate route family.
- Its guide-close button was still using the older bare button treatment and could feel less steady on phone than the newer join and activation surfaces.
- This keeps the current structure intact while making the public entry surface more consistent.

### Files touched
- `frontend/src/pages/WelcomePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/welcome`

### Verification
- `npm exec -- eslint src/pages/WelcomePage.tsx src/pages/ActivateMembershipPage.tsx src/pages/MemberActivationPage.tsx src/pages/JoinEntryPage.tsx src/pages/NotificationsPage.tsx src/pages/JoinApprovalPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/CommunityJoinRequestsPage.tsx`
- `npm run build`

## 2026-04-27 08:17

### Workstream
Public activation screen phone-tap tightening pass.

### What changed
- Tightened the public approved-member activation screen in `ActivateMembershipPage.tsx`.
- Added steadier mobile tap treatment to:
  - activation submit button
  - clear-password-fields button
- Added the same touch-safe treatment to activation inputs and shared button chrome on that page.

### Why
- This page sits in the same join/approval/activation route family as the recently tightened join and member-activation screens.
- It still felt lighter and more prone to tap drift on phone than the newer activation surfaces.
- The change keeps the current structure intact while making the final approved-member step steadier.

### Files touched
- `frontend/src/pages/ActivateMembershipPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- public approved-member activation route rendered by `ActivateMembershipPage.tsx`

### Verification
- `npm exec -- eslint src/pages/ActivateMembershipPage.tsx src/pages/MemberActivationPage.tsx src/pages/JoinEntryPage.tsx src/pages/NotificationsPage.tsx src/pages/JoinApprovalPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/CommunityJoinRequestsPage.tsx`
- `npm run build`

## 2026-04-27 08:05

### Workstream
Member activation phone-tap tightening pass.

### What changed
- Tightened `MemberActivationPage.tsx` without changing its structure.
- Added shared mobile tap guards and steadier tap chrome to:
  - `About`
  - `Activation Guide`
  - `Activate Membership`
- Added touch-safe input treatment to the activation form.
- Removed two stale local leftovers while doing the pass:
  - unused `useNavigate`
  - unused `darkGuidePanel()` helper

### Why
- This page is part of the same approved-member completion line and needed to match the steadier join/review screens on phone.
- The cleanup also removed small stale artifacts exposed by lint while keeping the route behavior intact.

### Files touched
- `frontend/src/pages/MemberActivationPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/activate-member`
- member-activation route rendered by `MemberActivationPage.tsx`

### Verification
- `npm exec -- eslint src/pages/MemberActivationPage.tsx src/pages/JoinEntryPage.tsx src/pages/NotificationsPage.tsx src/pages/JoinApprovalPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/CommunityJoinRequestsPage.tsx`
- `npm run build`

## 2026-04-27 07:41

### Workstream
Payout details local-clear guard cleanup.

### What changed
- Removed the action-level `buttonGuardProps()` layer from the local-only `Clear Local Details` button in `PayoutDetailsPage.tsx`.

### Why
- This button only clears the page-local payout draft and does not launch a route or change payout business state.
- It did not need the same action-level guard as `Save Payout Details`.
- This keeps Payout Details lighter without changing save behavior, route targets, or payout logic.

### Files touched
- `frontend/src/pages/PayoutDetailsPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/payout-details`

### Verification
- `npm exec -- eslint src/pages/PayoutDetailsPage.tsx`
- `npm run build`

## 2026-04-27 07:27

### Workstream
Community Home passive section-toggle guard cleanup pass.

### What changed
- Removed the action-level `communityButtonGuardProps()` layer from passive section open/collapse controls in `CommunityHomePage.tsx`.
- Cleaned these controls:
  - `Open owner actions` / `Collapse owner actions`
  - trusted-circle `Open` / `Collapse`
  - spotlight-status `Open spotlight status` / `Collapse spotlight status`
  - `Open communities` / `Collapse communities`

### Why
- These buttons only reveal or hide local Community Home sections and do not launch routes or change business state.
- They did not need the same action-level guard as the real route, owner, or spotlight actions nearby.
- This keeps Community Home lighter without changing community selection, spotlight routing, or owner workflow logic.

### Files touched
- `frontend/src/pages/CommunityHomePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/community`

### Verification
- `npm exec -- eslint src/pages/CommunityHomePage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other passive open/collapse controls on first-touch pages may still carry the same unnecessary action-level guard and can be cleaned in later passes.

## 2026-04-27 07:18

### Workstream
Create-entry guide-close guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from the passive guide-close control in `CreateEntryPage.tsx`.
- Cleaned this control:
  - `Read Again` / guide done button driven by `handleGuideDone`

### Why
- This button only dismisses the procedure overlay and returns the user to the staged create flow.
- It did not need the same action-level guard as the real verification, bank-details, or create-community actions nearby.
- This keeps the create-entry onboarding flow lighter without changing verification logic, bank-details logic, or community-submit behavior.

### Files touched
- `frontend/src/pages/CreateEntryPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- public create-community onboarding route rendered by `CreateEntryPage.tsx`

### Verification
- `npm exec -- eslint src/pages/CreateEntryPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small guide-close or panel-dismiss controls on onboarding pages may still carry the same unnecessary action-level guard and can be cleaned in later passes.

## 2026-04-27 07:08

### Workstream
Demand Box create-launcher guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from the passive create-demand launcher in `DemandBoxPage.tsx`.
- Cleaned this control:
  - `Create demand`

### Why
- This button only reveals the create-demand surface and does not itself submit a demand, launch a route, or change demand business state.
- It did not need the same action-level guard as the real community-selection, create-demand, or demand-status actions nearby.
- This keeps Demand Box lighter without changing create flow logic, community choice, or demand posting behavior.

### Files touched
- `frontend/src/pages/DemandBoxPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/demand-box`

### Verification
- `npm exec -- eslint src/pages/DemandBoxPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small reveal-only launcher buttons on workflow pages may still carry the same unnecessary action-level guard and can be cleaned in later passes.

## 2026-04-27 07:00

### Workstream
Create-entry helper close guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from the passive existing-member helper close control in `CreateEntryPage.tsx`.
- Cleaned this control:
  - `Stay here`

### Why
- This button only collapses the existing-member helper and does not launch a route or change onboarding business state.
- It did not need the same action-level guard as the real verification, bank-details, or create-community actions nearby.
- This keeps the create-entry flow lighter without changing sign-in routing, verification logic, or community-submit behavior.

### Files touched
- `frontend/src/pages/CreateEntryPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- public create-community onboarding route rendered by `CreateEntryPage.tsx`

### Verification
- `npm exec -- eslint src/pages/CreateEntryPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small passive helper close/reveal controls on onboarding pages may still carry the same unnecessary action-level guard and can be cleaned in later passes.

## 2026-04-27 06:49

### Workstream
Community Home copy action guard cleanup pass.

### What changed
- Removed the action-level `communityButtonGuardProps()` layer from the copy-only helper action in `CommunityHomePage.tsx`.
- Cleaned this control:
  - `Copy Invite Bundle`

### Why
- This button only copies the prepared first-circle invite bundle and does not launch a route or change community business state.
- It did not need the same action-level guard as the real community, owner, or spotlight actions nearby.
- This keeps Community Home lighter without changing community selection, spotlight behavior, or owner workflow logic.

### Files touched
- `frontend/src/pages/CommunityHomePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/community`

### Verification
- `npm exec -- eslint src/pages/CommunityHomePage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small copy-only helpers on first-touch pages may still carry the same unnecessary action-level guard and can be cleaned in later passes.

## 2026-04-27 06:34

### Workstream
Community owner-panel copy action guard cleanup pass.

### What changed
- Removed the action-level `panelButtonGuardProps()` layer from the copy-only helper action in `CommunityShopControlPanel.tsx`.
- Cleaned this control:
  - `Copy Public Shop Link`

### Why
- This button only copies the public shop link and does not launch a route or change owner-panel business state.
- It did not need the same action-level guard as the real owner route-open buttons nearby.
- This keeps the embedded owner panel lighter without changing route targets, panel content, or shop access behavior.

### Files touched
- `frontend/src/components/CommunityShopControlPanel.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/community`
- embedded owner shop panel inside Community Home

### Verification
- `npm exec -- eslint src/components/CommunityShopControlPanel.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small copy-only helpers on owner/control surfaces may still carry the same unnecessary action-level guard and can be cleaned in later passes.
## 2026-04-27 06:28

### Workstream
Withdrawal copy action guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from copy-only helper actions in `WithdrawalInstructionsPage.tsx`.
- Cleaned these controls:
  - `Copy Payout Account`
  - `Copy Community Rail`

### Why
- These buttons only copy payout/rail details and do not launch routes or change withdrawal business state.
- They did not need the same action-level guard as the real withdrawal, support-path, save-destination, load-route, or refresh actions nearby.
- This keeps the withdrawal page lighter without changing payout setup, money-out routing, or finance logic.

### Files touched
- `frontend/src/pages/WithdrawalInstructionsPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/withdrawal-instructions`

### Verification
- `npm exec -- eslint src/pages/WithdrawalInstructionsPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small copy-only helpers on finance and payout pages may still carry the same unnecessary action-level guard and can be cleaned in later passes.
## 2026-04-27 06:21

### Workstream
Marketplace copy action guard cleanup pass.

### What changed
- Removed the action-level `marketplaceButtonGuardProps()` layer from copy-only helper actions in `MarketplacePage.tsx`.
- Cleaned these controls:
  - `Copy WhatsApp Message`
  - `Copy Create Message`
  - `Copy Marketplace Link`
  - `Copy Shop Link`

### Why
- These buttons only copy local share text/links and do not launch routes or change marketplace business state.
- They did not need the same action-level guard as the real create-invite, open-link, supporter, or loan-draft actions nearby.
- This keeps Marketplace lighter without changing invite generation, support-draft behavior, or marketplace routing logic.

### Files touched
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/marketplace`

### Verification
- `npm exec -- eslint src/pages/MarketplacePage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small copy-only helpers on marketplace-facing share surfaces may still carry the same unnecessary action-level guard and can be cleaned in later passes.
## 2026-04-27 06:14

### Workstream
Shop assets copy action guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from copy-only helper actions in `ShopAssetsPage.tsx`.
- Cleaned these controls:
  - top `Copy Shop Link`
  - product form `Copy Shop Link`
  - product row `Copy Link`

### Why
- These buttons only copy local shop/product links and do not launch routes or change shop asset business state.
- They did not need the same action-level guard as the real open, save, clear, edit, restore, or delete actions nearby.
- This keeps Shop Assets lighter without changing asset saving, product editing, or gallery routing logic.

### Files touched
- `frontend/src/pages/ShopAssetsPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/shop-assets`

### Verification
- `npm exec -- eslint src/pages/ShopAssetsPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small copy-only helpers on dense shop pages may still carry the same unnecessary action-level guard and can be cleaned in later passes.
## 2026-04-27 06:08

### Workstream
Marketplace workspace copy action guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from copy-only helper actions in `MarketplaceWorkspacePage.tsx`.
- Cleaned these controls:
  - `Copy Join Link`
  - `Copy Join Message`
  - `Copy Public Shop Link`
  - `Copy Public Shop Message`

### Why
- These buttons only copy local share text/links and do not launch routes or change workspace business state.
- They did not need the same action-level guard as the real route handoff, WhatsApp, or member-shop actions nearby.
- This keeps Marketplace Workspace lighter without changing invite generation, member mapping, or shop routing logic.

### Files touched
- `frontend/src/pages/MarketplaceWorkspacePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/community-marketplace`

### Verification
- `npm exec -- eslint src/pages/MarketplaceWorkspacePage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small copy-only helpers on workspace or share-prep pages may still carry the same unnecessary action-level guard and can be cleaned in later passes.
## 2026-04-27 06:00

### Workstream
Join review activation-pack copy action cleanup pass.

### What changed
- Removed the action-level pointer/touch blocker layer from copy-only controls in `CommunityJoinRequestsPage.tsx`.
- Cleaned these controls:
  - `Copy Activation Message`
  - `Copy Activation Link`

### Why
- These buttons only copy activation text/link details and do not launch routes or change approval business state.
- They did not need the same action-level pointer blocker as the real approve/reject/pilot-approve actions nearby.
- This keeps the join-review page lighter without changing community approval logic or activation routing.

### Files touched
- `frontend/src/pages/CommunityJoinRequestsPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/community/:clanId/join-requests`

### Verification
- `npm exec -- eslint src/pages/CommunityJoinRequestsPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small copy-only helpers on review/approval pages may still carry the same unnecessary action-level blocker layer and can be cleaned in later passes.
## 2026-04-27 05:54

### Workstream
Repayment copy action guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from copy-only helper actions in `RepaymentPage.tsx`.
- Cleaned these controls:
  - `Copy Reference`
  - `Copy Full Instruction`

### Why
- These buttons only copy repayment details and do not launch routes or change repayment business state.
- They did not need the same action-level guard as the real generate-instruction or confirm-payment actions nearby.
- This keeps the repayment page lighter without changing route targets, payment confirmation, or repayment logic.

### Files touched
- `frontend/src/pages/RepaymentPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/repayment/:loanId`

### Verification
- `npm exec -- eslint src/pages/RepaymentPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small copy-only helpers on money or borrowing detail pages may still carry the same unnecessary action-level guard and can be cleaned in later passes.
## 2026-04-27 05:48

### Workstream
First circle copy action guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from the copy-only helper action in `BuildFirstCirclePage.tsx`.
- Cleaned this control:
  - `Copy Invite Bundle`

### Why
- This button only copies the prepared invite bundle and does not launch a route or change first-circle business state.
- It did not need the same action-level guard as the real add, remove, select, or reset workflow buttons nearby.
- This keeps the first-circle page lighter without changing contact handling or invite-bundle logic.

### Files touched
- `frontend/src/pages/BuildFirstCirclePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/build-first-circle`

### Verification
- `npm exec -- eslint src/pages/BuildFirstCirclePage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small copy-only helpers on onboarding or operations pages may still carry the same unnecessary action-level guard and can be cleaned in later passes.
## 2026-04-27 05:41

### Workstream
Borrowing copy action guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from copy-only actions in the borrowing detail pages.
- Cleaned these controls:
  - `LoanSummaryPage.tsx`
    - `Copy loan summary`
    - `Copy audit link`
  - `LoanWorkbenchPage.tsx`
    - `Copy Loan ID`

### Why
- These buttons only copy local text or a local route id and do not launch routes or change borrowing business state.
- They did not need the same action-level guard as the real approval, refresh, selection, or route-opening buttons nearby.
- This keeps the borrowing detail pages lighter without changing supporter decisions, workbench routing, or loan-state logic.

### Files touched
- `frontend/src/pages/LoanSummaryPage.tsx`
- `frontend/src/pages/LoanWorkbenchPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/loan-summary/:loanId`
- `/app/loan-workbench`

### Verification
- `npm exec -- eslint src/pages/LoanSummaryPage.tsx src/pages/LoanWorkbenchPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small copy-only buttons on dense borrowing pages may still carry the same unnecessary action-level guard and can be cleaned in later passes.
## 2026-04-27 05:26

### Workstream
Shop gallery copy action guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from copy-only actions in `ShopGalleryPage.tsx`.
- Cleaned these controls:
  - `Copy public link`
  - `Copy public shop link`

### Why
- These buttons only copy the public shop URL and do not launch routes or change shop/public-view business state.
- They did not need the same action-level guard as the real back, share, seller-contact, or product-open actions nearby.
- This keeps the public shop/gallery page lighter without changing route targets, shelf logic, or sharing behavior.

### Files touched
- `frontend/src/pages/ShopGalleryPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- public shop/gallery route rendered by `/app/shop/:gmfnId`

### Verification
- `npm exec -- eslint src/pages/ShopGalleryPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small copy-only buttons on public-facing pages may still carry the same unnecessary action-level guard and can be cleaned in later passes.
## 2026-04-27 05:15

### Workstream
Shop Control copy action guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from copy-only actions in `ShopControlPage.tsx`.
- Cleaned these controls:
  - top `Copy Public Link`
  - owner-backstage `Copy Public Link`
  - spotlight-status `Copy public shop link`
  - Vault per-link `Copy link`

### Why
- These buttons only copy local/public URLs and do not launch routes or change shop business state.
- They did not need the same action-level guard as the real open, pay, create, publish, or revoke actions nearby.
- This keeps Shop Control lighter without changing route targets, spotlight logic, Vault logic, or shop-save behavior.

### Files touched
- `frontend/src/pages/ShopControlPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/shop-control`

### Verification
- `npm exec -- eslint src/pages/ShopControlPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small copy-only buttons on dense owner pages may still carry the same unnecessary action-level guard and can be cleaned in later passes.
## 2026-04-27 05:08

### Workstream
Payment instructions copy action guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from the local copy actions in `PaymentInstructionsPage.tsx`.
- Cleaned these controls:
  - `Copy Reference`
  - `Copy Instruction`

### Why
- These buttons only copy local payment details and do not launch routes or change payment business state.
- They did not need the same action-level guard as the real generate, refresh, confirm, or reset actions.
- This keeps the payment-instructions page lighter without changing route targets or money-in logic.

### Files touched
- `frontend/src/pages/PaymentInstructionsPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/payment-instructions`

### Verification
- `npm exec -- eslint src/pages/PaymentInstructionsPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small local copy-only buttons on money routes may still carry the same unnecessary action-level guard and can be cleaned in later passes.
## 2026-04-27 04:59

### Workstream
Withdrawal instructions copy action guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from the local copy action in `WithdrawalInstructionsPage.tsx`.
- Cleaned this control:
  - `Copy Withdrawal Summary`

### Why
- This button only copies a local withdrawal summary and does not launch a route or change withdrawal business state.
- It did not need the same action-level guard as the real withdrawal, support-path, destination-save, or refresh actions.
- This keeps the withdrawal-instructions page lighter without changing route targets or money-out logic.

### Files touched
- `frontend/src/pages/WithdrawalInstructionsPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/withdrawal-instructions`

### Verification
- `npm exec -- eslint src/pages/WithdrawalInstructionsPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small local copy-only buttons on money routes may still carry the same unnecessary action-level guard and can be cleaned in later passes.
## 2026-04-27 04:49

### Workstream
Guarantor inbox copy action guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from the local copy action in `GuarantorInboxPage.tsx`.
- Cleaned this control:
  - `Copy Queue Summary`

### Why
- This button only copies a local queue summary and does not launch a route or change approval business state.
- It did not need the same action-level guard as the real approval/decline buttons.
- This keeps the guarantor inbox lighter without changing queue logic, route targets, or decision flow.

### Files touched
- `frontend/src/pages/GuarantorInboxPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/guarantor-inbox`

### Verification
- `npm exec -- eslint src/pages/GuarantorInboxPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small local copy-only buttons on operational pages may still carry the same unnecessary action-level guard and can be cleaned in later passes.
## 2026-04-27 04:43

### Workstream
Revenue allocation copy action guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from the local copy action in `RevenueAllocationPage.tsx`.
- Cleaned this control:
  - `Copy Summary`

### Why
- This button only copies a local allocation summary and does not launch a route or change allocation business state.
- It did not need the same action-level guard as the real `Load Allocation` action.
- This keeps the revenue-allocation page lighter without changing load behavior, route targets, or breakdown logic.

### Files touched
- `frontend/src/pages/RevenueAllocationPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/revenue-allocation`

### Verification
- `npm exec -- eslint src/pages/RevenueAllocationPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small local copy-only buttons on operational pages may still carry the same unnecessary action-level guard and can be cleaned in later passes.
## 2026-04-27 04:38

### Workstream
Payout details copy action guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from the local copy action in `PayoutDetailsPage.tsx`.
- Cleaned this control:
  - `Copy Summary`

### Why
- This button only copies a local payout summary and does not launch a route or change payout business state.
- It did not need the same action-level guard as the real payout save action.
- This keeps the payout-details page lighter without changing save behavior, route targets, or payout logic.

### Files touched
- `frontend/src/pages/PayoutDetailsPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/payout-details`

### Verification
- `npm exec -- eslint src/pages/PayoutDetailsPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small local copy-only buttons on operational pages may still carry the same unnecessary action-level guard and can be cleaned in later passes.
## 2026-04-27 04:31

### Workstream
Guarantor earnings copy action guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from the local copy action in `GuarantorEarningsPage.tsx`.
- Removed the now-dead page-local `guardButtonPress(...)` and `buttonGuardProps()` helpers from that page.
- Cleaned this control:
  - `Copy Earnings Summary`

### Why
- This button only copies a local text summary and does not launch a route or change business state.
- It did not need the same action-level guard as higher-risk workflow buttons.
- This keeps the guarantor earnings page lighter without changing totals, route targets, or earnings logic.

### Files touched
- `frontend/src/pages/GuarantorEarningsPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/guarantor-earnings`

### Verification
- `npm exec -- eslint src/pages/GuarantorEarningsPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small local copy-only buttons on operational pages may still carry the same unnecessary action-level guard and can be cleaned in later passes.
## 2026-04-27 04:25

### Workstream
Community owner panel passive launcher guard cleanup pass.

### What changed
- Removed the action-level `panelButtonGuardProps()` layer from the passive owner-panel open/collapse control in `CommunityShopControlPanel.tsx`.
- Cleaned this control:
  - `Open owner shop control` / `Collapse owner shop control`

### Why
- This button only reveals or hides the embedded owner panel from Community Home.
- It did not need the same action-level guard as the real route-opening buttons inside the panel.
- This keeps the owner launcher lighter without changing route targets or panel content.

### Files touched
- `frontend/src/components/CommunityShopControlPanel.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/community`
- embedded owner shop panel inside Community Home

### Verification
- `npm exec -- eslint src/components/CommunityShopControlPanel.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small panel launcher buttons on embedded surfaces may still carry the same unnecessary action-level guard and can be cleaned in later passes.
## 2026-04-27 04:14

### Workstream
Community Home guided-family collapse button passive guard cleanup pass.

### What changed
- Removed the extra click-time `consumeCommunityButtonEvent(...)` call from the passive guided-family `Collapse` button in `CommunityHomePage.tsx`.
- Cleaned this control:
  - `Collapse`

### Why
- This button only exits the temporary guided-family spotlight focus surface, so it did not need the same click-time tap stop as real route or owner-action buttons.
- This keeps Community Home lighter without changing spotlight routing, community selection, or owner workflow logic.

### Files touched
- `frontend/src/pages/CommunityHomePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/community`

### Verification
- `npm exec -- eslint src/pages/CommunityHomePage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small focus-exit controls on guided-family surfaces may still carry the same unnecessary click-time barrier and can be cleaned in later passes.
## 2026-04-27 04:03

### Workstream
Community Home guided-family back button passive guard cleanup pass.

### What changed
- Removed the action-level `communityButtonGuardProps()` layer and extra click-time `consumeCommunityButtonEvent(...)` call from the passive guided-family back button in `CommunityHomePage.tsx`.
- Cleaned this control:
  - `Back to Community Home`

### Why
- This button only exits the temporary guided-family focus surface, so it did not need the same action-level guard as real route or owner-action buttons.
- This keeps Community Home lighter without changing spotlight routing, community selection, or owner workflow logic.

### Files touched
- `frontend/src/pages/CommunityHomePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/community`

### Verification
- `npm exec -- eslint src/pages/CommunityHomePage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small focus-exit controls on guided-family surfaces may still carry the same unnecessary guard layer and can be cleaned in later passes.

## 2026-04-27 03:53

### Workstream
Marketplace workspace member-row passive guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from the passive member-row detail button in `MarketplaceWorkspacePage.tsx`.
- Cleaned this control:
  - `View Row`

### Why
- This button only changes which member detail is being shown in the reading panel, so it did not need the same action-level guard as the real `Shop Gallery` launcher.
- This keeps Marketplace Workspace lighter without changing member-shop routing or member mapping logic.

### Files touched
- `frontend/src/pages/MarketplaceWorkspacePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/community-marketplace`

### Verification
- `npm exec -- eslint src/pages/MarketplaceWorkspacePage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small row-detail selectors on operational pages may still carry the same unnecessary action-level guard and can be cleaned in later passes.

## 2026-04-27 03:44

### Workstream
Public shop gallery shelf-toggle passive guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from the passive shelf/view toggle in `ShopGalleryPage.tsx`.
- Cleaned this control:
  - `Show all loaded items` / `Return to 12-slot shelf`

### Why
- This button only switches the visible shelf view, so it did not need the same action-level guard as real share/open/contact buttons.
- This keeps the public shop page lighter without changing product-open, share, or seller-contact logic.

### Files touched
- `frontend/src/pages/ShopGalleryPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- public shop/gallery route rendered by `/app/shop/:gmfnId`

### Verification
- `npm exec -- eslint src/pages/ShopGalleryPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small view-mode toggles on public-facing pages may still carry the same unnecessary guard layer and can be cleaned in later passes.

## 2026-04-27 03:36

### Workstream
Guarantor inbox filter-strip passive guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from the passive queue-filter buttons in `GuarantorInboxPage.tsx`.
- Cleaned these controls:
  - `Pending`
  - `Approved`
  - `Declined`
  - `All`

### Why
- These buttons only change which queue rows are being read, so they did not need the same action-level guard as real approval or route-opening buttons.
- This keeps the guarantor queue lighter without changing approve/decline actions, route targets, or queue logic.

### Files touched
- `frontend/src/pages/GuarantorInboxPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/guarantor-inbox`

### Verification
- `npm exec -- eslint src/pages/GuarantorInboxPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small filter-strip controls on operational pages may still carry the same unnecessary guard layer and can be cleaned in later passes.

## 2026-04-27 03:28

### Workstream
Notifications review-dismiss passive guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from the passive review-dismiss button in `NotificationsPage.tsx`.
- Cleaned this control:
  - `Close review`

### Why
- This button only dismisses the current reading panel, so it did not need the same action-level guard as real notice actions like mark-as-read or route opening.
- This keeps the Action Inbox lighter without changing notice routing or operational focus logic.

### Files touched
- `frontend/src/pages/NotificationsPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/notifications`

### Verification
- `npm exec -- eslint src/pages/NotificationsPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small dismiss/close controls on first-touch pages may still carry the same unnecessary guard layer and can be cleaned in later passes.

## 2026-04-27 03:18

### Workstream
Marketplace workspace section-launcher passive guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from the passive section-launcher buttons in `MarketplaceWorkspacePage.tsx`.
- Cleaned these controls:
  - `Open Alerts`
  - `Open Members`

### Why
- These buttons only reveal and scroll to workspace sections, so they did not need the same action-level guard as real route-launch or member-action buttons.
- This keeps Marketplace Workspace lighter without changing invite, member mapping, or route-handoff logic.

### Files touched
- `frontend/src/pages/MarketplaceWorkspacePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/community-marketplace`

### Verification
- `npm exec -- eslint src/pages/MarketplaceWorkspacePage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other workspace launcher buttons on dense operational pages may still carry the same unnecessary action-level guard and can be cleaned in later passes.

## 2026-04-27 03:09

### Workstream
Community owner panel route-open and collapse duplicate tap-stop cleanup pass.

### What changed
- Removed the extra click-time `stopPanelTap(...)` call from the embedded owner panel route-open and collapse helpers in `CommunityShopControlPanel.tsx`.
- Cleaned these owner-panel controls:
  - `Open owner shop control`
  - `Open Public Shop Face`
  - `Open Community Marketplace`
  - owner shortcut launchers
  - owner panel open/collapse button

### Why
- These buttons already use `panelButtonGuardProps()` on pointer/touch start, so they did not need to stop the same tap again inside the shared click helpers.
- This keeps the owner panel lighter without changing route targets or panel behavior.

### Files touched
- `frontend/src/components/CommunityShopControlPanel.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/community`
- embedded owner shop panel inside Community Home

### Verification
- `npm exec -- eslint src/components/CommunityShopControlPanel.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other dense owner/direct-button surfaces may still carry the same duplicate click-time tap stop and can be cleaned in later passes.

## 2026-04-27 03:01

### Workstream
Community owner panel copy-button duplicate tap-stop cleanup pass.

### What changed
- Removed the extra click-time `stopPanelTap(...)` call from the embedded owner panel public-link copy button in `CommunityShopControlPanel.tsx`.
- Cleaned this control:
  - `Copy Public Shop Link`

### Why
- This button already uses `panelButtonGuardProps()` on pointer/touch start, so it did not need to stop the same tap again inside `onClick`.
- This keeps the owner panel lighter without changing the copy action, route targets, or panel behavior.

### Files touched
- `frontend/src/components/CommunityShopControlPanel.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/community`
- embedded owner shop panel inside Community Home

### Verification
- `npm exec -- eslint src/components/CommunityShopControlPanel.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other direct-copy or direct-open buttons on dense owner surfaces may still carry the same duplicate click-time tap stop and can be cleaned in later passes.

## 2026-04-27 02:52

### Workstream
Community Home spotlight-family collapse cleanup pass.

### What changed
- Removed the action-level `communityButtonGuardProps()` layer from the passive spotlight-family close control in `CommunityHomePage.tsx`.
- Cleaned this control:
  - guided spotlight surface `Collapse`

### Why
- This control only exits the temporary spotlight-family focus mode, so it did not need the same action-level guard as real route-launch or owner-action buttons.
- This keeps Community Home lighter without changing spotlight routing, owner controls, or guided-family logic.

### Files touched
- `frontend/src/pages/CommunityHomePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/community`

### Verification
- `npm exec -- eslint src/pages/CommunityHomePage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small guided-family close/open controls may still carry the same unnecessary guard layer and can be cleaned in later passes.

## 2026-04-27 02:45

### Workstream
Notifications passive reveal-button cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from the passive reveal button in `NotificationsPage.tsx`.
- Cleaned this control:
  - `Show urgent items`

### Why
- This button only opens the reading sections for urgent items, so it did not need the same action-level guard as real notice actions like mark-as-read or page-opening.
- This keeps the Action Inbox lighter without changing notice routing or operational focus logic.

### Files touched
- `frontend/src/pages/NotificationsPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/notifications`

### Verification
- `npm exec -- eslint src/pages/NotificationsPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small reveal buttons on first-touch pages may still carry the same unnecessary guard layer and can be cleaned in later passes.

## 2026-04-27 02:37

### Workstream
Create entry existing-member helper toggle cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from the passive close control in `CreateEntryPage.tsx`.
- Cleaned this toggle:
  - existing-member helper `Stay here`

### Why
- This control only collapses the existing-member helper panel, so it did not need the same action-level guard as the actual sign-in action.
- This keeps the create-community onboarding lane lighter without changing sign-in, verification, bank-details, or community-submit logic.

### Files touched
- `frontend/src/pages/CreateEntryPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- public create-community onboarding route rendered by `CreateEntryPage.tsx`

### Verification
- `npm exec -- eslint src/pages/CreateEntryPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small helper close/open controls may still carry the same unnecessary guard layer and can be cleaned in later passes.

## 2026-04-27 02:31

### Workstream
Marketplace passive section-toggle guard cleanup pass.

### What changed
- Removed the action-level `marketplaceButtonGuardProps()` layer from passive section open/collapse controls in `MarketplacePage.tsx`.
- Cleaned these toggles:
  - `money`
  - `tools`
  - `members`
  - `support`

### Why
- These controls only reveal or hide Marketplace sections, so they did not need the same action-level guard as real route-opening, link-copy, or support-draft buttons.
- This keeps Marketplace lighter without changing finance, owned links, member mapping, or support-route logic.

### Files touched
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/marketplace`

### Verification
- `npm exec -- eslint src/pages/MarketplacePage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other passive surface toggles may still carry the same unnecessary action-level guard and can be cleaned in later passes.

## 2026-04-27 02:24

### Workstream
Marketplace workspace passive toggle guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from passive section open/hide controls in `MarketplaceWorkspacePage.tsx`.
- Cleaned these toggles:
  - `Access & sharing`
  - `Money & support handoff`
  - `Community alerts`
  - `Members to shop mapping`

### Why
- These controls only reveal or hide workspace sections, so they did not need the same guard layer as real route-opening or link-copy actions.
- This keeps the workspace lighter without changing invite, member mapping, or route-handoff logic.

### Files touched
- `frontend/src/pages/MarketplaceWorkspacePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/community-marketplace`

### Verification
- `npm exec -- eslint src/pages/MarketplaceWorkspacePage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other nested workspace surfaces may still carry the same unnecessary guard layer on passive open/hide controls and can be cleaned in later passes.

## 2026-04-27 02:18

### Workstream
Shop Assets passive collapse-toggle guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from passive section-collapse controls in `ShopAssetsPage.tsx`.
- Cleaned these toggles:
  - `guidance`
  - `signboard`
  - `products`
  - `posted`

### Why
- These controls only reveal or hide shop-asset sections, so they did not need the same guard layer as real asset-save, product-post, or route-opening actions.
- This keeps the Shop Assets page lighter without changing shop signboard logic, product logic, or gallery route behavior.

### Files touched
- `frontend/src/pages/ShopAssetsPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/shop-assets`

### Verification
- `npm exec -- eslint src/pages/ShopAssetsPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other dense operational pages may still carry the same unnecessary guard layer on passive collapse controls and can be cleaned in later passes.

## 2026-04-27 02:05

### Workstream
Notifications passive collapse-toggle guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from passive section-collapse controls in `NotificationsPage.tsx`.
- Cleaned these toggles:
  - `focus`
  - `buckets`
  - `rawFeed`
  - `reading`

### Why
- These controls only reveal or hide notification-reading sections, so they did not need the same guard layer as real review, mark-as-read, or route-opening actions.
- This keeps the Action Inbox lighter without changing notice routing, mark-as-read behavior, or guidance logic.

### Files touched
- `frontend/src/pages/NotificationsPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/notifications`

### Verification
- `npm exec -- eslint src/pages/NotificationsPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other dense operational pages may still carry the same unnecessary guard layer on passive collapse controls and can be cleaned in later passes.

## 2026-04-27 01:56

### Workstream
Loan Workbench passive collapse-toggle guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from passive section-collapse controls in `LoanWorkbenchPage.tsx`.
- Cleaned these toggles:
  - `selection`
  - `summary`
  - `supporters`
  - `routes`

### Why
- These controls only reveal or hide reading/workbench sections, so they did not need the same guard layer as real loan-selection or route-opening actions.
- This keeps the workbench lighter without changing selected-loan behavior, supporter queue content, or route targets.

### Files touched
- `frontend/src/pages/LoanWorkbenchPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/loan-workbench`

### Verification
- `npm exec -- eslint src/pages/LoanWorkbenchPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other dense detail pages may still carry the same unnecessary guard layer on passive collapse controls and can be cleaned in later passes.

## 2026-04-27 01:48

### Workstream
Loan Suggestions passive collapse-toggle guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from passive section-collapse controls in `LoanSuggestionsPage.tsx`.
- Cleaned these toggles:
  - `overview`
  - `reading`
  - `supporters`
  - `routes`

### Why
- These controls only reveal or hide reading sections and route lists, so they did not need the same guard layer as real route-opening or support-issue actions.
- This keeps the loan-suggestions surface lighter without changing fit reading, supporter suggestion content, or route targets.

### Files touched
- `frontend/src/pages/LoanSuggestionsPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/loan-suggestions`

### Verification
- `npm exec -- eslint src/pages/LoanSuggestionsPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other borrowing-family detail pages may still carry the same unnecessary guard layer on passive collapse controls and can be cleaned in later passes.

## 2026-04-27 01:40

### Workstream
Loan Summary passive collapse-toggle guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from passive section-collapse controls in `LoanSummaryPage.tsx`.
- Cleaned these toggles:
  - `overview`
  - `guarantors`
  - `repayment`
  - `evidence`
  - `routes`

### Why
- These controls only reveal or hide reading sections and route lists, so they did not need the same guard layer as real guarantor decisions or route-opening actions.
- This keeps the loan-summary surface lighter without changing support-state logic, evidence reading, or guarantor decision behavior.

### Files touched
- `frontend/src/pages/LoanSummaryPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/loan-summary/:loanId`

### Verification
- `npm exec -- eslint src/pages/LoanSummaryPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other borrowing-family detail pages may still carry the same unnecessary guard layer on passive collapse controls and can be cleaned in later passes.

## 2026-04-27 01:32

### Workstream
Join Entry passive launcher guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from the passive request-form launcher in `JoinEntryPage.tsx`.
- Cleaned this toggle:
  - request-form `Open / Collapse`

### Why
- This control only reveals or hides the join-request form, so it did not need the same guard layer as the real submit action.
- This keeps the join-existing-community onboarding path lighter without changing invite validation or request submission behavior.

### Files touched
- `frontend/src/pages/JoinEntryPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- public join-existing-community onboarding route rendered by `JoinEntryPage.tsx`

### Verification
- `npm exec -- eslint src/pages/JoinEntryPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other onboarding pages may still carry the same unnecessary guard layer on passive launchers and can be cleaned in later passes.

## 2026-04-27 01:24

### Workstream
Create Entry passive toggle guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from passive open/collapse controls in `CreateEntryPage.tsx`.
- Cleaned these toggles:
  - existing-member helper `Open / Collapse`
  - procedure overlay `Collapse`
  - first block `Read First / Open / Collapse`
  - second block `Open / Collapse`
  - third block `Open / Collapse`

### Why
- These controls only reveal or hide guidance and stage panels, so they did not need the same guard layer as real submit, save, or sign-in actions.
- This keeps the create-community onboarding flow lighter without changing the real block-submission behavior.

### Files touched
- `frontend/src/pages/CreateEntryPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- public create-community onboarding route rendered by `CreateEntryPage.tsx`

### Verification
- `npm exec -- eslint src/pages/CreateEntryPage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other onboarding pages may still carry the same unnecessary guard layer on passive open/collapse controls and can be cleaned in later passes.

## 2026-04-27 01:16

### Workstream
Build First Circle passive collapse-toggle guard cleanup pass.

### What changed
- Removed the action-level `buttonGuardProps()` layer from the passive section-collapse controls in `BuildFirstCirclePage.tsx`.
- Cleaned these toggles:
  - `contacts`
  - `invite`

### Why
- These controls only open and collapse reading/workflow sections, so they did not need the same guard layer as route-launch or business-action buttons.
- This keeps the first-circle flow lighter for first-time users while preserving the actual add/select/remove/copy actions.

### Files touched
- `frontend/src/pages/BuildFirstCirclePage.tsx`
- `docs/HANDOFF_NOTES.md`

### Routes / screens affected
- `/app/build-first-circle`

### Verification
- `npm exec -- eslint src/pages/BuildFirstCirclePage.tsx`
- `npm run build`

### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other onboarding pages may still carry the same unnecessary guard layer on passive open/collapse controls and can be cleaned in later passes.

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
2026-04-27 01:06

#### Workstream
Guarantor earnings and repayment passive collapse-toggle cleanup pass.

#### Routes/screens affected
- `/app/guarantor-earnings`
- `/app/repayment/:loanId`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/GuarantorEarningsPage.tsx`
- `frontend/src/pages/RepaymentPage.tsx`

#### Confirmed facts
- `GuarantorEarningsPage.tsx` still used `buttonGuardProps()` on passive section-collapse controls.
- `RepaymentPage.tsx` still used `buttonGuardProps()` on some passive section-collapse controls, while its `instruction` toggle was already lighter.
- These controls only open and collapse reading/task sections and do not launch routes or trigger business actions.
- This pass removed the shared pointer/touch guard layer from these passive toggles:
  - `GuarantorEarningsPage.tsx`
    - `overview`
    - `meaning`
    - `recent`
    - `routes`
  - `RepaymentPage.tsx`
    - `overview`
    - `result`
    - `routes`
- Earnings summaries, repayment instruction generation, payment declaration, and route targets did not change.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other overview pages may still carry the same unnecessary guard layer on passive collapse controls and can be cleaned in later passes.

#### Next recommended step
- Continue targeting passive section toggles and non-route detail controls that still use action-level pointer/touch guard props even though they do not launch routes or trigger business actions.

---

#### Date
2026-04-27 00:56

#### Workstream
Guarantor Inbox passive collapse-toggle guard cleanup pass.

#### Routes/screens affected
- `/app/guarantor-inbox`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/GuarantorInboxPage.tsx`

#### Confirmed facts
- `GuarantorInboxPage.tsx` still used `buttonGuardProps()` on passive section-collapse controls.
- Those controls only open and collapse reading/task sections and do not launch routes or trigger business actions.
- This pass removed the shared pointer/touch guard layer from these passive toggles:
  - `overview`
  - `queue`
  - `guidance`
  - `routes`
- Queue filtering, approve/decline actions, and route targets did not change.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other overview pages may still carry the same unnecessary guard layer on passive collapse controls and can be cleaned in later passes.

#### Next recommended step
- Continue targeting passive section toggles and non-route detail controls that still use action-level pointer/touch guard props even though they do not launch routes or trigger business actions.

---

#### Date
2026-04-27 00:48

#### Workstream
Borrowing overview passive collapse-toggle guard cleanup pass.

#### Routes/screens affected
- `/app/loans`
- `/app/loan-readiness`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/LoansPage.tsx`
- `frontend/src/pages/LoanReadinessPage.tsx`

#### Confirmed facts
- `LoansPage.tsx` and `LoanReadinessPage.tsx` still used `buttonGuardProps()` on passive section-collapse controls.
- Those controls only open and collapse reading/task sections and do not launch routes or trigger business actions.
- This pass removed the shared pointer/touch guard layer from these passive toggles:
  - `LoansPage.tsx`
    - `overview`
    - `focus`
    - `borrower`
    - `guarantor`
    - `routes`
  - `LoanReadinessPage.tsx`
    - `overview`
    - `reading`
    - `blockers`
    - `routes`
- After the toggle cleanup, both pages no longer used their page-local `guardButtonPress(...)` / `buttonGuardProps()` helpers, so those dead helpers were removed.
- Borrowing route targets, readiness reading logic, and support-state logic did not change.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other overview pages may still carry the same unnecessary guard layer on passive collapse controls and can be cleaned in later passes.

#### Next recommended step
- Continue targeting passive section toggles and non-route detail controls that still use action-level pointer/touch guard props even though they do not launch routes or trigger business actions.

---

#### Date
2026-04-27 00:39

#### Workstream
Revenue Allocation passive section-toggle follow-up cleanup pass.

#### Routes/screens affected
- `/app/revenue-allocation`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/RevenueAllocationPage.tsx`

#### Confirmed facts
- `RevenueAllocationPage.tsx` still used `buttonGuardProps()` on additional passive section-collapse controls after the earlier `Meaning` cleanup.
- Those controls only open and collapse reading sections and do not launch routes or trigger business actions.
- This pass removed the shared pointer/touch guard layer from these passive toggles:
  - `summary`
  - `context`
  - `routes`
- Revenue allocation loading, copy action, breakdown math, and route guidance did not change.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other overview pages may still carry the same unnecessary guard layer on passive collapse controls and can be cleaned in later passes.

#### Next recommended step
- Continue targeting passive section toggles and non-route detail controls that still use action-level pointer/touch guard props even though they do not launch routes or trigger business actions.

---

#### Date
2026-04-27 00:30

#### Workstream
Payment Instructions passive collapse-toggle guard cleanup pass.

#### Routes/screens affected
- `/app/payment-instructions`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/PaymentInstructionsPage.tsx`

#### Confirmed facts
- `PaymentInstructionsPage.tsx` still used `buttonGuardProps()` on its passive section-collapse controls.
- Those controls only open and collapse reading/task sections and do not launch routes or trigger business actions.
- This pass removed the shared pointer/touch guard layer from these passive toggles:
  - `overview`
  - `warning`
  - `amount`
  - `instruction`
  - `result`
  - `routes`
- Money In generation, confirmation, reconciliation, and route targets did not change.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other overview pages may still carry the same unnecessary guard layer on passive collapse controls and can be cleaned in later passes.

#### Next recommended step
- Continue targeting passive section toggles and non-route detail controls that still use action-level pointer/touch guard props even though they do not launch routes or trigger business actions.

---

#### Date
2026-04-27 00:21

#### Workstream
Withdrawal Instructions passive collapse-toggle guard cleanup pass.

#### Routes/screens affected
- `/app/withdrawal-instructions`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/WithdrawalInstructionsPage.tsx`

#### Confirmed facts
- `WithdrawalInstructionsPage.tsx` still used `buttonGuardProps()` on its passive section-collapse controls.
- Those controls only open and collapse reading/task sections and do not launch routes or trigger business actions.
- This pass removed the shared pointer/touch guard layer from these passive toggles:
  - `overview`
  - `request`
  - `destination`
  - `rail`
  - `result`
  - `routes`
- Withdrawal execution logic, refresh logic, and payout/finance route targets did not change.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other overview pages may still carry the same unnecessary guard layer on passive collapse controls and can be cleaned in later passes.

#### Next recommended step
- Continue targeting passive section toggles and non-route detail controls that still use action-level pointer/touch guard props even though they do not launch routes or trigger business actions.

---

#### Date
2026-04-27 00:13

#### Workstream
Revenue Allocation passive meaning-toggle guard cleanup pass.

#### Routes/screens affected
- `/app/revenue-allocation`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/RevenueAllocationPage.tsx`

#### Confirmed facts
- `RevenueAllocationPage.tsx` still used `buttonGuardProps()` on the passive `Meaning` collapse control.
- That control only opens and collapses the explanatory reading section and does not launch routes or trigger business actions.
- This pass removed the shared pointer/touch guard layer from that passive toggle.
- Revenue allocation loading, breakdown math, and route guidance did not change.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other passive reading toggles on operational pages may still carry the same unnecessary action-level guard layer and can be cleaned in later passes.

#### Next recommended step
- Continue targeting passive reading toggles and non-route detail controls that still use action-level pointer/touch guard props even though they do not launch routes or trigger business actions.

---

#### Date
2026-04-26 23:55

#### Workstream
Payment Rails passive raw-toggle guard cleanup pass.

#### Routes/screens affected
- `/app/payment-rails`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/PaymentRailsPage.tsx`

#### Confirmed facts
- `PaymentRailsPage.tsx` used a shared page-local `buttonGuardProps()` layer on the passive `Show raw response` / `Hide raw response` toggle.
- That control is only a reading toggle for the raw rails payload, not a route-launch or business-action button.
- This pass removed the guard layer from that passive toggle.
- After that removal, the page-local `guardButtonPress(...)` and `buttonGuardProps()` helper became unused and were removed as dead code.
- Rail loading, grouped rail reading, and money-route guidance did not change.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other passive reading toggles on operational pages may still carry the same unnecessary button-guard layer and can be cleaned in later passes.

#### Next recommended step
- Continue targeting passive reading toggles and non-route detail controls that still use action-level pointer/touch guard props even though they do not launch routes or trigger business actions.

---

#### Date
2026-04-26 23:46

#### Workstream
Demand Box passive details-summary guard cleanup pass.

#### Routes/screens affected
- `/app/demand-box`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/DemandBoxPage.tsx`

#### Confirmed facts
- `DemandBoxPage.tsx` still used `buttonGuardProps()` on the passive `More detail` summary inside the create-demand surface.
- That summary is a reading toggle, not a route-launch or destructive action button.
- This pass removed the shared pointer/touch button-guard layer from that passive `summary`.
- Demand Box create behavior, category/expiry inputs, and submission logic did not change.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other passive `details/summary` reading surfaces elsewhere may still carry the same unnecessary button-guard layer and can be cleaned in later passes.

#### Next recommended step
- Continue targeting passive `details/summary` reading toggles that still use action-level pointer/touch guard props even though they do not open routes or trigger business actions.

---

#### Date
2026-04-26 23:38

#### Workstream
Shop spotlight collapse-button click-barrier cleanup pass.

#### Routes/screens affected
- `/app/shop-control`
- Spotlight Portal inside Shop Control

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/ShopControlPage.tsx`

#### Confirmed facts
- The Spotlight Portal `Collapse Spotlight` direct button still used `collapseSpotlightTools(...)`, and that helper still forced `event.preventDefault()` on click.
- That button already uses the shared `buttonGuardProps()` pointer/touch guard layer, so the extra click-time default blocking was unnecessary heaviness.
- This pass removed only the `preventDefault()` call from `collapseSpotlightTools(...)` and kept `stopPropagation()`.
- Spotlight open/collapse behavior, route targets, and publish flow did not change.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other dense Shop Control direct-button helpers may still carry small leftover click-time barriers and can be cleaned in later passes.

#### Next recommended step
- Continue targeting remaining direct-button helpers on high-touch owner surfaces where a shared pointer/touch guard already exists but click-time default blocking is still layered underneath.

---

#### Date
2026-04-26 23:28

#### Workstream
Dashboard passive summary click-barrier cleanup pass.

#### Routes/screens affected
- `/app/dashboard`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/DashboardPage.tsx`

#### Confirmed facts
- `DashboardPage.tsx` still had two nested passive `details/summary` controls carrying their own `onPointerDown={(event) => event.stopPropagation()}` barriers.
- These summaries are part of passive reading surfaces:
  - `First look`
  - `More trust detail`
- They are not route-launch buttons and did not need their own extra pointer barrier.
- This pass removed those two local `onPointerDown` propagation stops.
- The dashboard reading surfaces, trust content, and route behavior did not change.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other passive summary/details surfaces elsewhere in the app may still carry the same small extra pointer barrier pattern and can be cleaned in later passes.

#### Next recommended step
- Continue targeting small passive summary/details controls where extra local pointer barriers are still layered on top of otherwise passive reading surfaces.

---

#### Date
2026-04-26 23:14

#### Workstream
Marketplace picture-tools click-barrier cleanup pass.

#### Routes/screens affected
- `/app/marketplace`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`

#### Confirmed facts
- `MarketplacePage.tsx` still had extra click-time propagation stops on the community picture-tools bubble.
- That surface already uses `marketplacePointerGuardProps()` on the panel and its label, so the added `onClick={(event) => event.stopPropagation()}` barriers were redundant.
- This pass removed those extra click-time propagation stops from:
  - the picture-tools panel wrapper
  - the picture-tools label wrapper
- The picture open/upload/change behavior itself did not change.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other small tool bubbles or nested action surfaces may still carry the same “pointer guard plus extra click stop” pattern and can be cleaned in later passes.

#### Next recommended step
- Continue targeting nested tool surfaces where pointer/touch guards already exist but extra click-time propagation stops are still layered on top.

---

#### Date
2026-04-26 23:07

#### Workstream
Community Home shared button-helper cleanup pass.

#### Routes/screens affected
- `/app/community`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/CommunityHomePage.tsx`

#### Confirmed facts
- `CommunityHomePage.tsx` still used a page-local shared button helper that forced `preventDefault()` for normal click/submit events before many direct route and section buttons.
- These controls already use pointer/touch isolation through `communityButtonGuardProps()`, and most are plain `type="button"` actions, so that extra click-time default blocking was unnecessary heaviness.
- This pass removed the click-time `preventDefault()` behavior from `consumeCommunityButtonEvent(...)` while keeping `stopPropagation()`.
- Route targets, guided spotlight behavior, community opens, and owner/action flows themselves did not change.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other route-local helpers on first-touch pages may still carry the same pattern and should continue to be cleaned case by case.

#### Next recommended step
- Continue following route-local shared button helpers on high-touch pages where pointer/touch guards already exist but click-time default blocking is still layered underneath.

---

#### Date
2026-04-26 23:00

#### Workstream
Community join-review action-button cleanup pass.

#### Routes/screens affected
- `/app/community/:clanId/join-requests`

#### Backend routes/endpoints involved
- `getCommunityJoinRequests`
- `voteOnJoinRequest`
- `pilotApproveJoinRequest`
- `selectClan`

#### Files in play
- `frontend/src/pages/CommunityJoinRequestsPage.tsx`

#### Confirmed facts
- `CommunityJoinRequestsPage.tsx` still used a shared pointer/touch action helper that forced `preventDefault()` before hot button actions in the join-review lane.
- Those controls are plain action buttons and a route-opening anchor, so the extra default-blocking layer was unnecessary heaviness.
- This pass removed the `preventDefault()` call from `consumeActionEvent(...)` while keeping `stopPropagation()`.
- The page still protects tap propagation, and the approve/reject/pilot-approve/copy/open actions themselves did not change.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other review or approval pages may still carry the same older helper pattern and can be cleaned in later passes.

#### Next recommended step
- Continue targeting dense review or approval lanes where pointer/touch helpers still force click default-blocking on normal action controls.

---

#### Date
2026-04-26 22:54

#### Workstream
Finance collapse-control direct-button cleanup pass.

#### Routes/screens affected
- `/app/finance`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/FinancePage.tsx`

#### Confirmed facts
- `FinancePage.tsx` still treated collapse buttons as if they needed click-time `preventDefault()` and `stopPropagation()`, even though those buttons already use `stopFinanceTap` on pointer/touch start.
- This pass removed the extra click-time barrier from the shared `handleCollapseTap(...)` helper and switched the section buttons to call it directly.
- Cleaned collapse controls:
  - `overview`
  - `reconciliation`
  - `borrower`
  - `events`
- The finance sections, reveal logic, and money behavior did not change.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other overview pages may still carry the same collapse-button pattern and can be cleaned in later passes.

#### Next recommended step
- Continue following high-touch overview pages where section toggles already have pointer/touch guards but still keep extra click-time barriers underneath.

---

#### Date
2026-04-26 22:48

#### Workstream
Community Home embedded owner panel direct-button cleanup pass.

#### Routes/screens affected
- `/app/community`
- embedded owner shop panel inside Community Home

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/components/CommunityShopControlPanel.tsx`

#### Confirmed facts
- The embedded owner shop panel in Community Home still used a helper that treated normal button clicks like form submits by forcing `preventDefault()` before route opens and panel toggles.
- These controls are plain `type="button"` actions and already use pointer/touch-level isolation through `panelButtonGuardProps()`, so that extra click-time default blocking was unnecessary heaviness.
- This pass removed the click-time `preventDefault()` behavior from:
  - the shared `stopPanelTap(...)` helper
  - `openPanelRoute(...)`
  - `togglePanelFromButton(...)`
- The routes, panel open/collapse behavior, and copy/open actions themselves did not change.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other dense owner-side or trust-side action surfaces may still carry similar click-time default barriers and should continue to be cleaned case by case.

#### Next recommended step
- Continue targeting embedded owner panels and other high-touch direct-button surfaces where pointer/touch guards already exist but click-time `preventDefault()` is still layered underneath.

---

#### Date
2026-04-26 22:42

#### Workstream
Trust Passport direct-button `preventDefault()` cleanup pass.

#### Routes/screens affected
- `/app/trust`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/TrustScorePage.tsx`

#### Confirmed facts
- `TrustScorePage.tsx` still had several direct `type="button"` controls that already used `stopTrustTap` on pointer/touch start but still forced `event.preventDefault()` on click.
- These controls are not submit buttons and do not need that extra default-blocking layer.
- This pass removed the click-time `preventDefault()` from:
  - `handleCollapseTap`
  - `handleTrustJourneyTap`
  - `Refresh Trust Reading`
  - `Copy GMFN ID`
  - `Print Trust Passport`
  - `Open TrustSlip Verify`
  - Trust Journey route-open buttons for the primary and secondary trust journey routes
- The trust logic, printing, copy behavior, route opens, and collapse behavior themselves did not change.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other dense action bands across the app may still carry similar click-time default barriers and should continue to be cleaned case by case.

#### Next recommended step
- Continue targeting isolated direct-button surfaces that still stack pointer/touch guards with extra click-time `preventDefault()` or similar barrier logic.

---

#### Date
2026-04-26 22:27

#### Workstream
Shop spotlight portal direct-button cleanup pass.

#### Routes/screens affected
- `/app/shop-control`
- in-page spotlight portal inside Shop Control

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/ShopControlPage.tsx`

#### Confirmed facts
- The dedicated spotlight portal inside `ShopControlPage.tsx` still wrapped several direct `type=\"button\"` actions in extra `event.preventDefault()` and `event.stopPropagation()` logic.
- These controls are not submit buttons and the spotlight portal is already an isolated task surface, so that extra click-time barrier was unnecessary heaviness.
- This pass removed the extra click barriers from:
  - `Continue to shop spotlight`
  - `Free spotlight`
  - `Paid spotlight`
  - `Picture only`
  - `Video only`
  - `Picture and video`
  - `Continue to preview`
  - `Back to upload`
  - `Publish spotlight`
- The spotlight step changes and publish behavior themselves did not change.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other dense Shop Control action areas may still carry similar direct-button click barriers and can be cleaned in later passes.

#### Next recommended step
- Continue targeting dense direct-button task surfaces where click handlers still carry unnecessary `preventDefault()` / `stopPropagation()` layers on top of already-isolated button actions.

---

#### Date
2026-04-26 22:18

#### Workstream
Trust Passport journey and collapse handler duplicate tap-guard cleanup pass.

#### Routes/screens affected
- `/app/trust`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/TrustScorePage.tsx`

#### Confirmed facts
- Trust Passport still had a deeper shared duplicate tap layer in its Trust Journey and collapse controls.
- The page already protects these buttons on pointer/touch start with `stopTrustTap`, but the shared click handlers still called `event.stopPropagation()` again.
- This pass removed that redundant click-time propagation stop from:
  - `handleCollapseTap`
  - `handleTrustJourneyTap`
  - the Trust Journey route-open buttons that call `openTrustJourneyRoute(...)`
- The buttons still keep their existing pointer/touch protection and their route/expand behavior did not change.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other dense action bands in Trust Passport and elsewhere may still carry similar layered tap handling and should continue to be cleaned case by case.

#### Next recommended step
- Continue following shared click handlers and route-open buttons where pointer/touch guards already exist but click-time propagation stops are still layered underneath.

---

#### Date
2026-04-26 22:11

#### Workstream
Trust Passport toolbar duplicate tap-guard cleanup pass.

#### Routes/screens affected
- `/app/trust`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/TrustScorePage.tsx`

#### Confirmed facts
- The main Trust Passport toolbar buttons already used `stopTrustTap` on pointer/touch start but still called `event.stopPropagation()` again inside the click handlers.
- This pass removed that redundant click-time propagation stop from:
  - `Refresh Trust Reading`
  - `Copy GMFN ID`
  - `Print Trust Passport`
  - `Open TrustSlip Verify`
- The buttons still keep their existing pointer/touch protection and their core actions did not change.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other Trust Passport action bands deeper in the page may still carry similar layered tap handling and can be cleaned in later passes.

#### Next recommended step
- Continue following remaining high-traffic action bands where controls still stack pointer/touch guards with extra click-time propagation stops.

---

#### Date
2026-04-26 22:01

#### Workstream
Demand Box duplicate tap-guard cleanup pass.

#### Routes/screens affected
- `/app/demand-box`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/DemandBoxPage.tsx`

#### Confirmed facts
- `DemandBoxPage.tsx` still had one explicit duplicate tap-guard layer on the `More detail` summary control.
- That control already used shared `buttonGuardProps()` but also added `onClick={guardButtonPress}` on top of it.
- This pass removed the redundant click-time guard so that summary control now uses only the shared guard layer.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other dense action areas may still have similar old stacked local guard patterns and should continue to be cleaned case by case.

#### Next recommended step
- Keep following remaining dense local action areas where a control still uses more than one guard layer for the same tap.

---

#### Date
2026-04-26 21:52

#### Workstream
Community Home loading and empty-state top-route simplification pass.

#### Routes/screens affected
- `/app/community`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/CommunityHomePage.tsx`

#### Confirmed facts
- `CommunityHomePage.tsx` still exposed extra top-nav route links in two first-touch states:
  - loading the current community
  - no communities available yet
- Those states already kept home/back, and the empty state already carried its own in-page guide, so the extra top route links were another competing route band at the first touch point.
- This pass removed those top-nav `nextLinks` from the loading and empty states so first-touch Community Home stays calmer and route movement remains owned by the page body or by home/back.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- `TrustPage.tsx` and `BankConsolePage.tsx` still expose top-nav route links and were left unchanged because they do not yet show the same clearly confirmed replacement route lane in the page body.

#### Next recommended step
- Continue the cleanup in remaining dense local action areas and only remove top-route bands where the page body already provides a stable replacement path.

---

#### Date
2026-04-26 21:40

#### Workstream
Payout details and loan workbench top-route simplification pass.

#### Routes/screens affected
- `/app/payout-details`
- `/app/loan-workbench`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/PayoutDetailsPage.tsx`
- `frontend/src/pages/LoanWorkbenchPage.tsx`

#### Confirmed facts
- `PayoutDetailsPage.tsx` still exposed top-nav route links even though the route already told the user to use the single lower `What happens next` section after confirming payout details.
- `LoanWorkbenchPage.tsx` live state had already been simplified earlier, but its loading state still exposed top-nav route links even though the page body already owns route movement once the workbench opens.
- This pass removed the duplicated top-nav `nextLinks` and `utilityLinks` from those remaining places so route movement stays in the page body instead of two competing route bands.
- Home and back behavior remain intact in the page top navigation for both routes.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- `TrustPage.tsx` and `BankConsolePage.tsx` still expose top-nav route links, but they were left unchanged in this sweep because a full replacement route band in the page body was not yet confirmed there.

#### Next recommended step
- Continue the cleanup only where a route already has a real page-body movement lane or where stacked local guard behavior still makes taps feel physically heavy.

---

#### Date
2026-04-26 21:28

#### Workstream
Payment rails top-route simplification pass.

#### Routes/screens affected
- `/app/payment-rails`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/PaymentRailsPage.tsx`

#### Confirmed facts
- `PaymentRailsPage.tsx` still exposed top-nav route links while the page already carried its own lower `Next routes` section and explicitly instructed users to use that single route section after reading the rail picture.
- This pass removed the top-nav `nextLinks` and `utilityLinks` so movement stays in the page body instead of two competing route bands.
- Home and back behavior remain intact in the page top navigation.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Any remaining heaviness on this route is now more likely to come from dense in-page route tiles or shared button guard behavior than duplicated route bands.

#### Next recommended step
- Continue the operational cleanup in the remaining pages where stacked local action bands still make taps feel physically heavy.

---

#### Date
2026-04-26 21:18

#### Workstream
Shop control top-route simplification pass.

#### Routes/screens affected
- `/app/shop-control`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/ShopControlPage.tsx`

#### Confirmed facts
- `ShopControlPage.tsx` still exposed top-nav route links while the owner page already carried its own dense in-page workflow and route movement through body actions.
- This pass removed the top-nav `nextLinks` and `utilityLinks` so movement stays in the page body instead of two competing route bands.
- Home and back behavior remain intact in the page top navigation.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- The page still has many local action buttons and paid-tool controls, so any remaining heaviness here is more likely to come from dense action grouping or shared guard behavior than duplicated route bands.

#### Next recommended step
- Continue the shop-family cleanup in the remaining heavy routes where dense local action rows still make taps feel physically heavy.

---

#### Date
2026-04-26 21:10

#### Workstream
Shop assets top-route simplification pass.

#### Routes/screens affected
- `/app/shop-assets`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/ShopAssetsPage.tsx`

#### Confirmed facts
- `ShopAssetsPage.tsx` still exposed top-nav route links while the page already carried its own dense in-page asset workflow and route movement through body actions.
- This pass removed the top-nav `nextLinks` and `utilityLinks` so movement stays in the page body instead of two competing route bands.
- Home and back behavior remain intact in the page top navigation.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- The page still has many local action buttons, so any remaining heaviness here is more likely to come from stacked guard behavior or dense action grouping than duplicated route bands.

#### Next recommended step
- Continue the shop-family cleanup in the remaining heavy routes where dense local action rows still make taps feel physically heavy.

---

#### Date
2026-04-26 21:01

#### Workstream
Loan summary and loan suggestions top-route simplification pass.

#### Routes/screens affected
- `/app/loan-summary/:loanId`
- `/app/loan-suggestions`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/LoanSummaryPage.tsx`
- `frontend/src/pages/LoanSuggestionsPage.tsx`

#### Confirmed facts
- `LoanSummaryPage.tsx` still exposed top-nav route links in loading and live states even after lower route movement had already been simplified into page-body route sections.
- `LoanSuggestionsPage.tsx` still exposed top-nav route links in loading and live states even after lower route movement had already been simplified into page-body route sections.
- This pass removed the top-nav `nextLinks` and `utilityLinks` from both routes so movement stays in the page body instead of two competing route bands.
- Home and back behavior remain intact in the page top navigation for both routes.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Any remaining heaviness on these routes is now more likely to come from dense local action rows or shared button guard behavior rather than duplicated top route bands.

#### Next recommended step
- Continue the borrowing-family cleanup in remaining routes where local action density still makes taps feel physically heavy.

---

#### Date
2026-04-26 20:53

#### Workstream
Money In / Money Out top-route simplification pass.

#### Routes/screens affected
- `/app/payment-instructions`
- `/app/withdrawal-instructions`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/PaymentInstructionsPage.tsx`
- `frontend/src/pages/WithdrawalInstructionsPage.tsx`

#### Confirmed facts
- `PaymentInstructionsPage.tsx` still exposed top-nav route links in both loading and live states even after lower route movement had already been simplified into in-page route sections.
- `WithdrawalInstructionsPage.tsx` still exposed top-nav route links in both loading and live states even after lower route movement had already been simplified into in-page route sections.
- This pass removed the top-nav `nextLinks` and `utilityLinks` from both routes so movement stays in the page body instead of two competing route bands.
- Home and back behavior remain intact in the page top navigation for both routes.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Any remaining heaviness on these pages is now more likely to come from dense local action bands or shared button guard behavior rather than duplicated route bands.

#### Next recommended step
- Continue the app-wide cleanup in the remaining operational pages where local action density still makes taps feel physically heavy.

---

#### Date
2026-04-26 20:46

#### Workstream
Lock management top-route simplification pass.

#### Routes/screens affected
- `/app/lock-management`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/LockManagementPage.tsx`

#### Confirmed facts
- `LockManagementPage.tsx` still exposed top-nav route links while also carrying a lower in-page action band under `Use these pages instead`.
- This pass removed the top-nav `nextLinks` and `utilityLinks` so route movement stays in the page body instead of two competing route bands.
- Home and back behavior remain intact in the page top navigation.
- The page remains intentionally read-only because the backend does not expose a guarantee lock-release endpoint yet.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Any remaining heaviness on this route is now more likely to come from page-level styling or general shared button behavior, not duplicated route bands.

#### Next recommended step
- Continue the app-wide cleanup in remaining operational routes where stacked local button guards or overlapping launcher behavior still make taps feel physically heavy.

---

#### Date
2026-04-26 20:39

#### Workstream
First Circle top-route simplification pass.

#### Routes/screens affected
- `/app/build-first-circle`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/BuildFirstCirclePage.tsx`

#### Confirmed facts
- `BuildFirstCirclePage.tsx` still exposed top-nav route links in both loading and live states while the page already carried its own focused first-circle task flow underneath.
- This pass removed the top-nav `nextLinks` and `utilityLinks` from both states so movement stays inside the page body instead of two competing route bands.
- Home and back behavior remain intact in the page top navigation.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- The page still has many local action buttons, so any remaining heaviness there is more likely to come from stacked local guard behavior than route-band duplication.

#### Next recommended step
- Continue the app-wide cleanup in the remaining first-touch and operational routes that still carry stacked local button guards or competing launcher layers.

---

#### Date
2026-04-26 20:24

#### Workstream
Notifications top-route simplification pass.

#### Routes/screens affected
- `/app/notifications`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/NotificationsPage.tsx`

#### Confirmed facts
- `NotificationsPage.tsx` still exposed top-nav route links while also carrying in-body action cards and route buttons for Trust, Dashboard, and other destination pages.
- This pass removed the top-nav `nextLinks` and `utilityLinks` so route movement stays in the page body instead of two competing route bands.
- Home and back behavior remain intact in the page top navigation.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- The page still has several dense action rows, so live testing may still expose stacked local guard heaviness even after the route-band cleanup.

#### Next recommended step
- Continue the app-wide cleanup in the remaining first-touch inner pages where top route bands still compete with page-body action lanes.

---

#### Date
2026-04-26 20:02

#### Workstream
Borrower preflight and loan decision top-route simplification pass.

#### Routes/screens affected
- `/app/borrower-preflight`
- `/app/loan-decision`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/BorrowerPreflightPage.tsx`
- `frontend/src/pages/LoanDecisionPage.tsx`

#### Confirmed facts
- `BorrowerPreflightPage.tsx` still exposed top-nav route links while also carrying in-body route actions for Loans & Support and Loan Readiness.
- `LoanDecisionPage.tsx` still exposed top-nav route links while also carrying in-body route actions for Loan Workbench, Loans & Support, and Finance.
- This pass removed the top-nav `nextLinks` and `utilityLinks` from both pages so route movement stays in the page body instead of two competing route bands.
- Home and back behavior remain intact in the page top navigation for both routes.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other borrowing/member pages may still carry stacked local guard layers even after the route-band cleanup.

#### Next recommended step
- Continue the app-wide cleanup by following live heaviness into the remaining pages where stacked button guards still make taps feel physically heavy.

---

#### Date
2026-04-26 19:52

#### Workstream
Finance top-route simplification pass.

#### Routes/screens affected
- `/app/finance`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/FinancePage.tsx`

#### Confirmed facts
- `FinancePage.tsx` still exposed top-nav route links in both loading and live states while also carrying guide-driven route movement and deeper in-page route actions for Trust Passport, Loan Readiness, and Loans & Support.
- This pass removed the top-nav `nextLinks` and `utilityLinks`, leaving route movement inside the page body instead of a second route band at the top.
- Home and back behavior remain intact in the page top navigation.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- `FinancePage.tsx` does not have one single lower route-tile band like Loans, so this cleanup relies on the existing guide-driven and in-body route actions remaining clear enough during live testing.

#### Next recommended step
- Continue the app-wide cleanup by following live heaviness into the remaining overview or operational pages still carrying stacked button guards or overlapping launcher behavior.

---

#### Date
2026-04-26 19:43

#### Workstream
Loans overview top-route simplification pass.

#### Routes/screens affected
- `/app/loans`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/LoansPage.tsx`

#### Confirmed facts
- `LoansPage.tsx` still exposed top-nav route links in both loading and live states while also carrying a full lower `Next routes` / `Next support routes` band with the real operational destinations.
- This pass removed the top-nav `nextLinks` and `utilityLinks`, leaving route movement in one place only: the lower route band.
- Home and back behavior remain intact in the page top navigation.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other money-side overview pages such as `FinancePage.tsx` may still need the same cleanup if live testing shows similar heaviness.

#### Next recommended step
- Continue the app-wide cleanup by following live heaviness into the remaining overview pages still carrying stacked route bands or dense local guard layers.

---

#### Date
2026-04-26 19:34

#### Workstream
CCI and My GSN and I top-route simplification pass.

#### Routes/screens affected
- `/app/cci`
- `/app/my-gmfn-and-i`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/CCIReadingPage.tsx`
- `frontend/src/pages/MyGMFNAndIPage.tsx`

#### Confirmed facts
- `CCIReadingPage.tsx` still exposed top-nav route links while also carrying its own in-body route actions for Identity & Integrity and Trust Passport.
- `MyGMFNAndIPage.tsx` still exposed top-nav route links in both its loading and live states while also carrying a full lower route-tile surface for Dashboard, Community, Marketplace, Loans, Trust, Demand Box, and related member routes.
- This pass removed the top-nav `nextLinks` and `utilityLinks` from both pages so route movement stays in the page body instead of two competing route bands.
- Home and back behavior remain intact in the page top navigation for both routes.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- A few remaining operational pages may still carry stacked button guards or duplicated route movement even after the route-band cleanup.

#### Next recommended step
- Continue the app-wide cleanup by following live heaviness into the remaining operational or member pages still showing stacked button guards or overlapping launcher behavior.

---

#### Date
2026-04-26 19:26

#### Workstream
Revenue allocation top-route simplification pass.

#### Routes/screens affected
- `/app/revenue-allocation`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/RevenueAllocationPage.tsx`

#### Confirmed facts
- `RevenueAllocationPage.tsx` still exposed top-nav route links while also carrying a full lower `Next support routes` band with the same family of destinations.
- This pass removed the top-nav `nextLinks` and `utilityLinks`, leaving route movement in one place only: the lower `Next support routes` section.
- Home and back behavior remain intact in the page top navigation.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- `BankConsolePage.tsx` was inspected in the same sweep but was left unchanged because it does not yet show the same clear duplicated lower route band; its top CTA still looks more like a single task action than a second route band.

#### Next recommended step
- Continue the app-wide cleanup by following live heaviness reports into remaining operational pages with stacked button guards or duplicated route movement.

---

#### Date
2026-04-26 19:18

#### Workstream
Open Trust and identity integrity top-route simplification pass.

#### Routes/screens affected
- `/app/open-trust`
- `/app/identity-integrity`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/OpenTrustPage.tsx`
- `frontend/src/pages/IdentityIntegrityPage.tsx`

#### Confirmed facts
- `OpenTrustPage.tsx` still exposed top-nav route links while also carrying its own in-body route actions for Trust Passport and Community.
- `IdentityIntegrityPage.tsx` still exposed top-nav route links in both its loading and live states while also carrying deeper route actions for Trust Passport, TrustSlip, notifications, and the next repair step.
- This pass removed the top-nav `nextLinks` and `utilityLinks` from both pages so route movement stays in the page body instead of two competing route bands.
- Home and back behavior remain intact in the page top navigation for both routes.

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- A few remaining trust/admin operational pages may still carry stacked button guards or duplicated action bands even after the top-route cleanup.

#### Next recommended step
- Continue the app-wide cleanup by following live heaviness reports into any remaining trust/admin or operational pages that still feel physically heavy on first tap.

---

#### Date
2026-04-26 18:58

#### Workstream
Trust passport top-route simplification pass.

#### Routes/screens affected
- `/app/trust`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/TrustScorePage.tsx`

#### Confirmed facts
- `TrustScorePage.tsx` still exposed top-nav route links while also carrying deeper route actions inside the trust journey and related trust sections.
- This pass removed the top-nav `nextLinks` and `utilityLinks`, leaving route movement in the page body instead of two competing route bands.
- Home and back behavior remain intact in the page top navigation.
- Verification after this pass:
  - `npm exec -- eslint src/pages/TrustScorePage.tsx`
  - `npm run build`
  - build passed
  - eslint only showed the same pre-existing hook warnings for `revealTrustSection` and `loadAll`

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- A few remaining trust/admin pages may still need similar cleanup, but the main trust-facing family now has much less duplicated route movement.

#### Next recommended step
- Continue the app-wide cleanup by returning to any remaining heavy operational routes still showing duplicated route bands or stacked button guards during live testing.

---

#### Date
2026-04-26 18:48

#### Workstream
TrustSlip route-band simplification pass.

#### Routes/screens affected
- `/app/trust-slip`
- `/app/trust-slip/verify`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/TrustSlipPage.tsx`
- `frontend/src/pages/TrustSlipVerifyPage.tsx`

#### Confirmed facts
- Both TrustSlip pages were still exposing top-nav route links while also carrying their own route actions deeper in the page body.
- This pass removed the top-nav `nextLinks` and `utilityLinks` from both pages.
- TrustSlip keeps route movement inside the page body through the TrustSlip verify and related action area.
- TrustSlip Verify keeps route movement inside the page body through its lower trust/passport guidance actions.
- Home and back behavior remain intact in the page top navigation for both routes.
- Verification after this pass:
  - `npm exec -- eslint src/pages/TrustSlipPage.tsx src/pages/TrustSlipVerifyPage.tsx`
  - `npm run build`
  - both passed

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- `TrustScorePage.tsx` still appears to carry top-nav route links and may need a more careful decision because its lower route contract is less explicit than the other trust pages.

#### Next recommended step
- Continue the trust-family audit by deciding whether `TrustScorePage.tsx` should gain a clearer lower route band before top-nav route links are removed, or whether another heavy trust/admin page should be cleaned first.

---

#### Date
2026-04-26 18:38

#### Workstream
Trust command-centre top-route simplification pass.

#### Routes/screens affected
- `/app/command-center`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/TrustCommandCentrePage.tsx`

#### Confirmed facts
- `TrustCommandCentrePage.tsx` still carried duplicated route movement:
  - top navigation `nextLinks` / `utilityLinks`
  - lower `Where next`
- This pass removed the top-nav `nextLinks` and `utilityLinks`, leaving route movement in one place only: the lower `Where next` section.
- Home and back behavior remain intact in the page top navigation.
- Dead route-link arrays left behind by that removal were also deleted so the checkpoint stays lint-clean.
- Verification after this pass:
  - `npm exec -- eslint src/pages/TrustCommandCentrePage.tsx`
  - `npm run build`
  - both passed

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Remaining trust-facing pages with both top-nav route links and lower route sections may still need the same cleanup.

#### Next recommended step
- Continue the same audit into the remaining trust pages still carrying duplicated route bands, especially Trust Score / Trust Slip surfaces where top-nav route links still coexist with lower route movement.

---

#### Date
2026-04-26 18:28

#### Workstream
Trust analytics and trust graph top-route simplification pass.

#### Routes/screens affected
- `/app/command-center/trust-analytics`
- `/app/command-center/trust-graph`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/TrustAnalyticsPage.tsx`
- `frontend/src/pages/AdminTrustGraphPage.tsx`

#### Confirmed facts
- Both trust-admin pages were still carrying duplicated route movement:
  - top navigation `nextLinks` / `utilityLinks`
  - lower route bands (`Where next` / `Next routes`)
- This pass removed the top-nav `nextLinks` and `utilityLinks` from both pages, leaving route movement in one place only: the lower route section.
- Home and back behavior remain intact in the page top navigation for both routes.
- Verification after this pass:
  - `npm exec -- eslint src/pages/TrustAnalyticsPage.tsx src/pages/AdminTrustGraphPage.tsx`
  - `npm run build`
  - both passed

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Remaining trust/admin pages with both top-nav route links and lower route sections may still need the same cleanup.

#### Next recommended step
- Continue the same top-route simplification audit into the remaining trust/admin operational surfaces, especially `TrustCommandCentrePage` and related trust pages still carrying duplicated route bands.

---

#### Date
2026-04-26 18:16

#### Workstream
Command-centre top-route simplification pass.

#### Routes/screens affected
- `/app/command-center/system-operations`
- `/app/command-center/exposure`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/SystemOperationsPage.tsx`
- `frontend/src/pages/ExposureAdminPage.tsx`

#### Confirmed facts
- Both command-centre pages were still carrying duplicated route movement:
  - top navigation `nextLinks` / `utilityLinks`
  - lower `Next routes`
- This pass removed the top-nav `nextLinks` and `utilityLinks` from both pages, leaving route movement in one place only: the lower `Next routes` section.
- Home and back behavior remain intact in the page top navigation for both routes.
- Verification after this pass:
  - `npm exec -- eslint src/pages/SystemOperationsPage.tsx src/pages/ExposureAdminPage.tsx`
  - `npm run build`
  - both passed

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- Other trust/admin pages still using both top-nav route links and lower route sections may need the same cleanup.

#### Next recommended step
- Continue the same audit into the remaining trust/admin operational pages, especially Trust Analytics, Trust Graph, and related command-centre screens.

---

#### Date
2026-04-26 18:01

#### Workstream
Loan workbench top-route simplification pass.

#### Routes/screens affected
- `/app/loan-workbench`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/LoanWorkbenchPage.tsx`

#### Confirmed facts
- `LoanWorkbenchPage.tsx` still exposed route movement in two places:
  - top navigation `nextLinks` / `utilityLinks`
  - lower `Next support routes` / `Next routes`
- This pass removed the top-nav `nextLinks` and `utilityLinks`, leaving route movement in one place only: the lower routes section.
- Home and back behavior remain intact in the page top navigation.
- Verification after this pass:
  - `npm exec -- eslint src/pages/LoanWorkbenchPage.tsx`
  - `npm run build`
  - both passed

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- The next likely remaining duplicated route bands are in other trust/admin operational pages still using `PageTopNav` plus lower route sections.

#### Next recommended step
- Continue the same top-route simplification audit on the next dense operational route that still carries both `PageTopNav` route links and lower `Next routes`.

---

#### Date
2026-04-26 17:53

#### Workstream
Guarantor earnings top-route simplification pass.

#### Routes/screens affected
- `/app/guarantor-earnings`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/GuarantorEarningsPage.tsx`

#### Confirmed facts
- `GuarantorEarningsPage.tsx` still carried a second route-movement band in `PageTopNav`.
- The page already had a lower `Next routes` section, so route movement was duplicated:
  - top navigation route links
  - lower `Next routes`
- This pass removed the top-nav `nextLinks` and `utilityLinks`, leaving route movement in one place only: the lower `Next routes` section.
- Home and back behavior remain intact in the page top navigation.
- Verification after this pass:
  - `npm exec -- eslint src/pages/GuarantorEarningsPage.tsx`
  - `npm run build`
  - both passed

#### Open risks or unknowns
- This is another safe checkpoint, not a final freeze.
- The next likely remaining duplicated route bands are in pages like `LoanWorkbenchPage.tsx` and trust/admin operational surfaces with both `PageTopNav` links and lower route sections.

#### Next recommended step
- Continue the same top-route simplification audit on the next dense operational route carrying both top-nav route links and lower route tiles.

---

#### Date
2026-04-26 17:45

#### Workstream
Guarantor inbox top-route simplification pass.

#### Routes/screens affected
- `/app/guarantor-inbox`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/GuarantorInboxPage.tsx`

#### Confirmed facts
- Earlier work had already simplified route duplication inside the queue and lower `Next routes`, but `GuarantorInboxPage.tsx` was still carrying a second route-movement band in `PageTopNav`.
- That meant the queue still exposed leave-page options in two places:
  - top navigation route links
  - lower `Next routes`
- This pass removed the top-nav `nextLinks` and `utilityLinks`, leaving route movement in one place only: the lower `Next routes` section.
- Home and back behavior remain intact in the page top navigation.
- Verification after this pass:
  - `npm exec -- eslint src/pages/GuarantorInboxPage.tsx`
  - `npm run build`
  - build passed
  - eslint still shows the same pre-existing `loadInbox` hook warning on that page, with no new errors

#### Open risks or unknowns
- The broader app still remains in safe-checkpoint mode rather than final freeze mode.
- Other dense operational routes may still keep duplicated action bands or heavier local guard layering.

#### Next recommended step
- Deploy `gmfn-frontend`.
- Phone-test `/app/guarantor-inbox`, especially:
  - top page entry
  - queue reading
  - row decisions
  - lower `Next routes`
- If `Guarantor Inbox` now feels materially calmer, continue the deeper audit in the next route that still feels physically heavy in live testing.

#### Date
2026-04-26 17:36

#### Workstream
Repayment top-route simplification pass.

#### Routes/screens affected
- `/app/repayment/:loanId`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/RepaymentPage.tsx`

#### Confirmed facts
- Earlier work had already removed duplicated route actions from `Result and reconciliation`, but `RepaymentPage.tsx` was still carrying a second route-movement band in `PageTopNav`.
- That meant the route still exposed leave-page options in two places:
  - top navigation route links
  - lower `Route focus` / `Next routes`
- This pass removed the top-nav `nextLinks` and `utilityLinks`, leaving route movement in one place only: the lower route section.
- Home and back behavior remain intact in the page top navigation.
- Verification after this pass:
  - `npm exec -- eslint src/pages/RepaymentPage.tsx`
  - `npm run build`
  - both passed

#### Open risks or unknowns
- The broader app still remains in safe-checkpoint mode rather than final freeze mode.
- Other dense operational routes may still keep duplicated action bands or heavier local guard layering.

#### Next recommended step
- Deploy `gmfn-frontend`.
- Phone-test `/app/repayment/:loanId`, especially:
  - top page entry
  - repayment overview
  - amount/reference actions
  - lower `Route focus` / `Next routes`
- If `Repayment` now feels materially calmer, continue the deeper audit in the next route that still feels physically heavy in live testing.

#### Date
2026-04-26 17:27

#### Workstream
Loans overview route-band simplification pass.

#### Routes/screens affected
- `/app/loans`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/LoansPage.tsx`

#### Confirmed facts
- Deeper inspection showed `LoansPage.tsx` was still repeating support-route movement in multiple places:
  - the upper `Current support focus` card exposed support movement directly
  - each borrower-side support row also exposed `Open Support Path`
  - the lower `Next routes` section already owned the main support-route movement for the page
- That meant the page was still mixing route exits into the reading surfaces instead of keeping route movement together.
- This pass removed the upper route buttons and the per-row `Open Support Path` buttons.
- The upper focus card and borrower rows now explain in plain language that the user should continue through the lower `Next routes` section when ready.
- The now-dead `actionBtn` helper was removed too, so the page no longer carries stale styling residue from the deleted upper action bands.
- Verification after this pass:
  - `npm exec -- eslint src/pages/LoansPage.tsx`
  - `npm run build`
  - both passed

#### Open risks or unknowns
- The broader app still remains in safe-checkpoint mode rather than final freeze mode.
- Other dense operational routes may still keep duplicated action bands or heavier local guard layering.

#### Next recommended step
- Deploy `gmfn-frontend`.
- Phone-test `/app/loans`, especially:
  - current support focus reading
  - borrower-side support rows
  - guarantor-side queue reading
  - lower `Next routes`
- If `Loans` now feels materially calmer, continue the deeper audit in the next route that still feels physically heavy in live testing.

#### Date
2026-04-26 17:18

#### Workstream
Loan readiness top-route simplification pass.

#### Routes/screens affected
- `/app/loan-readiness`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/LoanReadinessPage.tsx`

#### Confirmed facts
- Deeper inspection showed `LoanReadinessPage.tsx` was still presenting route movement in two separate bands:
  - `PageTopNav` exposed `nextLinks` and `utilityLinks` at the top of the page
  - the lower `Next routes` section already owned the route-by-route movement choices for the same support flow
- That meant the page was still letting users leave the route from two different route bands before they even reached the main readiness reading.
- This pass removed the top-nav route bands and left route movement in one place only: the lower `Next routes` section.
- Home and back behavior remain intact in the page top navigation.
- Verification after this pass:
  - `npm exec -- eslint src/pages/LoanReadinessPage.tsx`
  - `npm run build`
  - both passed

#### Open risks or unknowns
- The broader app still remains in safe-checkpoint mode rather than final freeze mode.
- Other dense operational routes may still keep duplicated action bands or heavier local guard layering.

#### Next recommended step
- Deploy `gmfn-frontend`.
- Phone-test `/app/loan-readiness`, especially:
  - top page entry
  - readiness reading
  - collapse/open controls
  - lower `Next routes`
- If `Loan Readiness` now feels materially calmer, continue the deeper audit in the next route that still feels physically heavy in live testing.

#### Date
2026-04-26 17:09

#### Workstream
Loan suggestions route-action simplification pass.

#### Routes/screens affected
- `/app/loan-suggestions`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/LoanSuggestionsPage.tsx`

#### Confirmed facts
- Deeper inspection showed `LoanSuggestionsPage.tsx` still had a repeated route-exit pattern inside the suggestion cards:
  - each suggestion card offered `Open Loan Workbench`
  - the lower `Next routes` section already owned `Loan Workbench` as part of the broader support movement
- That meant the page was still mixing suggestion reading with route navigation inside each card.
- This pass removed the per-card `Open Loan Workbench` button and left the suggestion cards focused on fit reading and evidence.
- The cards now explain plainly that the user should continue through the lower `Next routes` section if the fit looks strong enough.
- Verification after this pass:
  - `npm exec -- eslint src/pages/LoanSuggestionsPage.tsx`
  - `npm run build`
  - build passed
  - eslint still shows the same pre-existing `loadSuggestionsForLoan` hook warning on that page, with no new errors

#### Open risks or unknowns
- The broader app still remains in safe-checkpoint mode rather than final freeze mode.
- Other dense operational routes may still keep duplicated action bands or heavier local guard layering.

#### Next recommended step
- Deploy `gmfn-frontend`.
- Phone-test `/app/loan-suggestions`, especially:
  - suggestion-card reading
  - copy actions
  - collapse/open controls
  - lower `Next routes`
- If `Loan Suggestions` now feels materially calmer, continue the deeper audit in the next route that still feels physically heavy in live testing.

#### Date
2026-04-26 17:02

#### Workstream
Loan summary repayment-route simplification pass.

#### Routes/screens affected
- `/app/loan-summary/:loanId`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/LoanSummaryPage.tsx`

#### Confirmed facts
- Deeper inspection showed `LoanSummaryPage.tsx` still had one remaining duplicated route-movement band:
  - the `Repayment evidence` section offered `Loan Payment Instructions` and `See this in Finance`
  - the lower `Next routes` section already offered the same route movement choices in the broader loan context
- That meant the page was still mixing evidence reading with route navigation inside the repayment section.
- This pass removed the repayment-section route buttons and left repayment focused on evidence, expectation state, and plain-language next-step explanation.
- Route movement now stays together in the lower `Next routes` section only.
- Verification after this pass:
  - `npm exec -- eslint src/pages/LoanSummaryPage.tsx`
  - `npm run build`
  - build passed
  - eslint still shows the same pre-existing `refreshAll` hook warning on that page, with no new errors

#### Open risks or unknowns
- The broader app still remains in safe-checkpoint mode rather than final freeze mode.
- Other dense operational routes may still keep duplicated action bands or heavier local guard layering.

#### Next recommended step
- Deploy `gmfn-frontend`.
- Phone-test `/app/loan-summary/:loanId`, especially:
  - repayment evidence reading
  - guarantor decision controls
  - copy actions
  - lower `Next routes`
- If `Loan Summary` now feels materially calmer, continue the deeper audit in the next route that still feels physically heavy in live testing.

#### Date
2026-04-26 16:48

#### Workstream
Guarantor earnings route-action simplification pass.

#### Routes/screens affected
- `/app/guarantor-earnings`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/GuarantorEarningsPage.tsx`

#### Confirmed facts
- Deeper inspection showed `GuarantorEarningsPage.tsx` still had the same older route-action duplication pattern already removed from several other money and borrowing pages:
  - the main deeper-route CTA was shown once in the upper summary area
  - and again in the lower `Next routes` section
- That meant the page was still making the user choose between two route-advance bands for the same next step.
- This pass removed the upper duplicate CTA and left route movement in one place only: the lower `Next routes` section.
- The upper summary area now stays focused on reading and copying the earnings summary.
- The now-dead `primaryBtn` helper was removed too, so the page no longer carries styling residue from the duplicate action band.
- Verification after this pass:
  - `npm exec -- eslint src/pages/GuarantorEarningsPage.tsx`
  - `npm run build`
  - both passed

#### Open risks or unknowns
- The broader app still remains in safe-checkpoint mode rather than final freeze mode.
- Other dense operational routes may still keep duplicated action bands or heavier local guard layering.

#### Next recommended step
- Deploy `gmfn-frontend`.
- Phone-test `/app/guarantor-earnings`, especially:
  - upper summary reading
  - `Copy Earnings Summary`
  - collapse/open controls
  - lower `Next routes`
- If `Guarantor Earnings` now feels materially calmer, continue the deeper audit in the next route that still feels physically heavy in live testing.

#### Date
2026-04-26 16:41

#### Workstream
Shop Control duplicate guard-helper removal pass.

#### Routes/screens affected
- `/app/shop-control`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/ShopControlPage.tsx`

#### Confirmed facts
- Deeper inspection showed `ShopControlPage.tsx` was still carrying the same older interaction pattern already removed from other routes:
  - shared `buttonGuardProps()` on many hot owner-side buttons
  - plus an extra inner `runGuardedButtonAction(...)` wrapper on those same buttons
- That helper no longer added any real guarding behavior, so the page was still paying for a duplicate tap-control layer on its busiest actions.
- This pass removed the dead inner helper layer while keeping the shared guard props in place.
- Cleaned actions include:
  - `Open Public Shop`
  - `Copy Public Link`
  - `Open Picture Tools`
  - `Open Public Shop Face`
  - Vault pay/create-link buttons
  - verification pay/open-public-verification buttons
  - paid spotlight pay/open buttons
  - picture save/remove
  - `Save Shop Details`
  - spotlight priority mode switching
  - `Publish Spotlight`
  - Vault per-link `Copy link`, `Open link`, `Extend 7 days`, `Revoke`
- Verification after this pass:
  - `npm exec -- eslint src/pages/ShopControlPage.tsx`
  - `npm run build`
  - both passed

#### Open risks or unknowns
- The broader app still remains in safe-checkpoint mode rather than final freeze mode.
- Other major domains may still keep older local guard layering outside the shop family.

#### Next recommended step
- Deploy `gmfn-frontend`.
- Phone-test `/app/shop-control`, especially:
  - top public/open/copy actions
  - Vault pay and create-link actions
  - verification actions
  - paid spotlight entry
  - picture save/remove
  - spotlight publish path
  - Vault per-link controls
- If `Shop Control` now feels materially calmer, continue the deeper audit in the next domain that still feels physically heavy in live testing.

#### Date
2026-04-26 16:31

#### Workstream
Public shop gallery duplicate guard-helper cleanup pass.

#### Routes/screens affected
- public shop/gallery route rendered by `/app/shop/:gmfnId`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/ShopGalleryPage.tsx`

#### Confirmed facts
- Deeper inspection showed `ShopGalleryPage.tsx` still had the same older interaction pattern already removed from other routes:
  - shared `buttonGuardProps()` on hot public-facing buttons
  - plus an extra inner `runGuardedButtonAction(...)` wrapper on those same buttons
- That meant the public shop path still carried a duplicate tap-control layer even though the helper no longer added real behavior.
- This pass removed the dead inner helper layer while keeping the shared guard props in place.
- Cleaned actions include:
  - `Back`
  - `Ask seller privately`
  - `Share public shop`
  - `Copy public link`
  - `Ask for Private Vault view`
  - `Copy public shop link`
  - `Show all loaded items` / `Return to 12-slot shelf`
  - product `Open item` / `Close`
  - product `Share`
- Verification after this pass:
  - `npm exec -- eslint src/pages/ShopGalleryPage.tsx`
  - `npm run build`
  - both passed

#### Open risks or unknowns
- The broader app still remains in safe-checkpoint mode rather than final freeze mode.
- Other dense local action bands may still keep older guard layering outside the public shop lane.

#### Next recommended step
- Deploy `gmfn-frontend`.
- Phone-test the public shop/gallery route, especially:
  - `Back`
  - `Ask seller privately`
  - `Share public shop`
  - `Copy public link`
  - shelf overflow toggle
  - product `Open item`
  - product `Share`
- If the public shop path now feels materially calmer, continue the deeper audit in the next route that still feels physically heavy in live testing.

#### Date
2026-04-26 16:20

#### Workstream
Shop Assets duplicate guard-helper cleanup pass.

#### Routes/screens affected
- `/app/shop-assets`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/ShopAssetsPage.tsx`

#### Confirmed facts
- Deeper inspection showed `ShopAssetsPage.tsx` still had the same older interaction pattern already removed from other parts of the shop family:
  - shared `buttonGuardProps()` on many hot buttons
  - plus an extra inner `runGuardedButtonAction(...)` wrapper on those same buttons
- That meant several `Shop Assets` actions were still carrying two tap-control layers even after earlier shop-family cleanup.
- This pass removed the duplicate inner helper layer while keeping the shared guard props in place.
- Cleaned actions include:
  - `Copy Shop Link`
  - `Open / Collapse` for `Guidance`
  - `Open / Collapse` for `Signboard`
  - `Save Signboard`
  - `Remove Signboard`
  - `Open / Collapse` for `Products`
  - `Post Product` / `Update Product`
  - `Clear Form`
  - product-lane `Copy Shop Link`
  - `Open / Collapse` for `Posted`
  - item-level `Edit`
  - `Restore`
  - `Delete`
  - item-level `Copy Link`
- Verification after this pass:
  - `npm exec -- eslint src/pages/ShopAssetsPage.tsx`
  - `npm run build`
  - both passed

#### Open risks or unknowns
- The broader app still remains in safe-checkpoint mode rather than final freeze mode.
- Other dense local action bands may still keep older guard layering outside the shop-assets route.

#### Next recommended step
- Deploy `gmfn-frontend`.
- Phone-test `/app/shop-assets`, especially:
  - top `Open Shop Gallery`
  - `Copy Shop Link`
  - section open/collapse controls
  - signboard save/remove
  - product create/update/reset
  - posted product item actions
- If `Shop Assets` now feels materially calmer, continue the deeper audit in the next route that still feels physically heavy in live testing.

#### Date
2026-04-26 16:16

#### Workstream
Money-route action-band simplification pass for `PaymentRailsPage` and `PayoutDetailsPage`.

#### Routes/screens affected
- `/app/payment-rails`
- `/app/payout-details`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/PaymentRailsPage.tsx`
- `frontend/src/pages/PayoutDetailsPage.tsx`

#### Confirmed facts
- Deeper inspection confirmed another repeated route-action pattern in the money-support inner pages:
  - `PaymentRailsPage.tsx` was still presenting route exits in multiple places:
    - the dark hero card
    - the `How to use this page` helper card
    - and again in the lower `Next routes` section
  - `PayoutDetailsPage.tsx` was doing the same thing:
    - route-movement controls in the top hero card
    - and again in the lower `What happens next` section
- This pass reduced both pages to one clear route-movement band:
  - `PaymentRailsPage.tsx`
    - removed the hero route buttons
    - removed the duplicate `Money In task` / `Money Out task` links from the helper card
    - kept only the raw-response toggle in the helper card
    - left route-navigation in the lower `Next routes` section
  - `PayoutDetailsPage.tsx`
    - removed the duplicate upper CTA buttons from the hero area
    - left route-navigation in the lower `What happens next` section
    - kept the hero focused on current payout reading and route status
- Verification after this pass:
  - `npm exec -- eslint src/pages/PaymentRailsPage.tsx src/pages/PayoutDetailsPage.tsx`
  - `npm run build`
  - both passed

#### Open risks or unknowns
- The broader app-wide button-heaviness cleanup is still in safe-checkpoint mode rather than final freeze mode.
- The next likely underlayers are now less about duplicated route bands in the money family and more about any remaining dense local action bands elsewhere in the operational pages.

#### Next recommended step
- Deploy `gmfn-frontend`.
- Phone-test:
  - `/app/payment-rails`
    - current reading
    - structured rail listing
    - raw response toggle
    - lower `Next routes` only
  - `/app/payout-details`
    - payout form
    - save / copy / clear
    - lower `What happens next` route band
- If these now feel calmer, continue the deeper audit into the next dense operational route that still feels physically heavy in live testing.

#### Date
2026-04-26 16:08

#### Workstream
Borrowing-family route-action simplification pass for `RepaymentPage` and `GuarantorInboxPage`.

#### Routes/screens affected
- `/app/repayment/:loanId`
- `/app/guarantor-inbox`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/RepaymentPage.tsx`
- `frontend/src/pages/GuarantorInboxPage.tsx`

#### Confirmed facts
- Deeper inspection confirmed another route-level duplication pattern in the borrowing family:
  - `RepaymentPage.tsx` was presenting route-movement controls twice:
    - inside `Result and reconciliation`
    - again in the lower `Next routes` section
  - `GuarantorInboxPage.tsx` was also presenting the primary deeper-route CTA twice:
    - once in the top summary area
    - again in the lower `Next routes` section
- This pass removed that duplication in the least risky way:
  - `RepaymentPage.tsx`
    - keeps `I Have Paid Using This Reference` in the result panel
    - removes repeated route-navigation links from that same panel
    - replaces them with a route-status explanation:
      - keep the route focused while active
      - use the next-routes section once the task has a visible conclusion
  - `GuarantorInboxPage.tsx`
    - removes the duplicated top primary route CTA
    - keeps `Copy Queue Summary`
    - adds a short explanation that the top card is for queue reading and the lower `Next routes` section is where the deeper support page should be opened
- Verification after this pass:
  - `npm exec -- eslint src/pages/RepaymentPage.tsx src/pages/GuarantorInboxPage.tsx`
  - `npm run build`
  - eslint reports the same pre-existing hook-dependency warning in `GuarantorInboxPage.tsx` around `loadInbox`
  - no new lint errors were introduced
  - build passed

#### Open risks or unknowns
- The borrowing family is calmer now, but other dense operational pages may still keep route-local action duplication even when no duplicate guard helper remains.
- The app should still be treated as being at safe checkpoints rather than final freeze states until the broader phone-testing round confirms that repeated presses are no longer common.

#### Next recommended step
- Deploy `gmfn-frontend`.
- Phone-test:
  - `/app/repayment/:loanId`
    - generate repayment instruction
    - copy reference
    - payment declaration
    - result section
    - next-routes section
  - `/app/guarantor-inbox`
    - queue reading
    - top summary area
    - row-level approve / decline / workbench actions
    - lower next-routes section
- If these now feel materially calmer, continue the deeper audit by targeting whichever remaining dense operational route still feels physically heavy in live testing.

#### Date
2026-04-26 15:55

#### Workstream
Money-in route-action simplification pass for `PaymentInstructionsPage`.

#### Routes/screens affected
- `/app/payment-instructions`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/PaymentInstructionsPage.tsx`

#### Confirmed facts
- Deeper inspection showed `PaymentInstructionsPage.tsx` did not have the same shop-style duplicate guard helper stack, but it did have a route-level duplication pattern similar to the one removed from Money Out:
  - a route-action band inside `Result and reconciliation`
  - another route-action band again in `Next routes`
- That meant the page was presenting two different places to move away from the route while the result state was still being read.
- This pass removed the duplicate middle route-action band in the least risky way:
  - the result panel now keeps the result reading and a simple route-status explanation
  - the actual route-navigation choices stay together in the lower `Next routes` section
  - `Reset Money In` remains available in the result panel because it is task-local rather than route-navigation
- The result area therefore stays focused on:
  - what happened
  - whether the pay-in is still active
  - where the route navigation belongs next
- Verification after this pass:
  - `npm exec -- eslint src/pages/PaymentInstructionsPage.tsx`
  - `npm run build`
  - both passed

#### Open risks or unknowns
- The money-side pages are calmer now, but other domains may still hold route-local button heaviness from dense action bands even if no duplicate guard helper remains.
- The app should still be treated as being at safe checkpoints rather than final freeze states until the broader phone testing round confirms that repeated presses are no longer common.
- The next likely remaining underlayers are in dense route-local decision/action bands elsewhere rather than in the same shop-family duplicate helper pattern.

#### Next recommended step
- Deploy `gmfn-frontend`.
- Phone-test `/app/payment-instructions`, especially:
  - amount entry
  - instruction generation
  - copy reference
  - payment confirmation
  - result section
  - next-routes section
- If Money In now feels materially calmer, continue the app-wide audit by targeting the next dense operational route bands that still feel physically heavy in live testing.

#### Date
2026-04-26 15:42

#### Workstream
Money-out decision-lane simplification pass for `WithdrawalInstructionsPage`.

#### Routes/screens affected
- `/app/withdrawal-instructions`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/WithdrawalInstructionsPage.tsx`

#### Confirmed facts
- Deeper inspection showed `WithdrawalInstructionsPage.tsx` no longer had the old shop-style duplicate guard helper stack, but it still had a different kind of underlayer:
  - the same primary route action was exposed twice on the same page
  - once in `Withdrawal decision lane`
  - again in `Execution actions`
- That meant the route was presenting two competing places to do the same thing:
  - `Continue Direct Withdrawal`
  - or `Continue To Loan Readiness`
- This pass removed that duplication in the least risky way:
  - the actual submit/continue action now stays in the `Withdrawal decision lane`
  - the lower `Execution actions` panel no longer repeats the same primary action
  - that panel now explains the current state instead:
    - awaiting pool reading
    - use the decision lane above
    - support path already chosen
- The result area therefore stays focused on post-decision execution and next routes instead of competing with the decision section.
- Verification after this pass:
  - `npm exec -- eslint src/pages/WithdrawalInstructionsPage.tsx`
  - `npm run build`
  - eslint reports the same pre-existing hook-dependency warning around `loadPage`
  - no new lint errors were introduced
  - build passed

#### Open risks or unknowns
- `PaymentInstructionsPage.tsx` still has dense action bands and may need the same style of “one clear decision point” simplification if live testing says Money In still feels physically heavy.
- Other routes may still keep older local button-guard patterns, but this pass was specifically about removing a duplicate route-action band rather than guard stacking.
- Marketplace, Dashboard, Community Home, Shop-family routes, and the money-side routes should still be treated as safe checkpoints rather than final freeze states until the broader live phone testing round is complete.

#### Next recommended step
- Deploy `gmfn-frontend`.
- Phone-test `/app/withdrawal-instructions`, especially:
  - amount entry
  - direct withdrawal decision
  - support-backed continuation decision
  - result section after the decision
- If Money Out now feels materially calmer, inspect `PaymentInstructionsPage.tsx` for the same “too many action bands for one task” pattern.

#### Date
2026-04-26 15:05

#### Workstream
Shop-family duplicate guard cleanup pass across `Shop Control`, `Shop Assets`, and the public `Shop Gallery`.

#### Routes/screens affected
- `/app/shop-control`
- `/app/shop-assets`
- public shop/gallery route handled by `ShopGalleryPage`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/ShopControlPage.tsx`
- `frontend/src/pages/ShopAssetsPage.tsx`
- `frontend/src/pages/ShopGalleryPage.tsx`

#### Confirmed facts
- A deeper grep confirmed one of the old button-jump patterns was still active in the shop family:
  - several high-traffic buttons already used shared `buttonGuardProps()`
  - those same buttons were then calling `runGuardedButtonAction(...)`
  - `runGuardedButtonAction(...)` was still calling `guardButtonPress(...)` internally
- That meant one tap was still being guarded twice in three major shop surfaces:
  - `ShopControlPage.tsx`
  - `ShopAssetsPage.tsx`
  - `ShopGalleryPage.tsx`
- This pass removed that inner duplicate layer in the least risky way:
  - `runGuardedButtonAction(...)` now just runs the supplied action
  - the shared `buttonGuardProps()` layer remains in place on the buttons themselves
- Impacted hot paths include:
  - Shop Control public/open/copy actions
  - Vault pay/create/open flows
  - paid spotlight/verification actions
  - Shop Assets gallery/signboard/product buttons
  - public Shop Gallery back/share/open-item/copy-link paths
- Verification after this pass:
  - `npm exec -- eslint src/pages/ShopControlPage.tsx src/pages/ShopAssetsPage.tsx src/pages/ShopGalleryPage.tsx`
  - `npm run build`
  - both passed

#### Open risks or unknowns
- This removes a real duplicate-guard underlayer from the shop family, but other domains may still keep their own page-local helper stacks.
- The money-in and withdrawal instruction pages look cleaner than earlier hotspot routes, but they still contain many dense local action bands and may need a later pass if live testing shows they remain physically heavy.
- Marketplace, Dashboard, Community Home, and Shop-family routes are all calmer than before, but they should still be treated as safe checkpoints rather than final freeze states until the broader live testing round is complete.

#### Next recommended step
- Deploy `gmfn-frontend`.
- Phone-test the shop-family buttons again, especially:
  - Shop Control public/open/copy actions
  - Vault pay/create/open actions
  - Paid spotlight and verification buttons
  - Shop Assets signboard/product buttons
  - public Shop Gallery back/share/copy/open-item buttons
- If the shop family now feels materially steadier, continue the same duplicate-guard audit pattern in the next dense money-side action bands only where live testing still reports hesitation.

#### Date
2026-04-26 14:20

#### Workstream
Shop-family interaction cleanup pass for `Shop Control`, the embedded Community Home owner panel, and the public shop/gallery route.

#### Routes/screens affected
- `/app/shop-control`
- embedded owner shop panel inside `/app/community`
- public shop/gallery route handled by `ShopGalleryPage`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/ShopControlPage.tsx`
- `frontend/src/components/CommunityShopControlPanel.tsx`
- `frontend/src/pages/ShopGalleryPage.tsx`

#### Confirmed facts
- Audit confirmed the shop family still had one of the older underlayers that has been causing jumpy behavior:
  - `ShopControlPage.tsx` was still using delayed hash timers and retry timers to wake up inner sections after a tap
  - `CommunityShopControlPanel.tsx` was still sending several owner shortcuts into `Shop Control` using older `#shop-control-*` hash contracts
  - `ShopGalleryPage.tsx` was still using a delayed `setTimeout(..., 80)` hash scroll on the public page
- `ShopControlPage.tsx` has now been moved onto one calmer cancelable reveal path:
  - removed the delayed `hashScrollTimerRef`
  - removed the old retry-timer array
  - removed the dead `spotlightCollapseTimerRef`
  - replaced them with one cancelable `requestAnimationFrame` reveal helper
- `ShopControlPage.tsx` now also understands section-query entry in addition to legacy hashes:
  - `?section=summary`
  - `?section=picture-gallery`
  - `?section=spotlight`
  - `?section=paid-spotlight`
  - `?section=vault`
- `CommunityShopControlPanel.tsx` owner shortcuts were moved to that calmer section-query contract instead of the older hash-only contract.
- `ShopGalleryPage.tsx` now uses the same cancelable frame-based reveal style instead of the older delayed hash scroll timer.
- A follow-up pass then removed some of the remaining duplicate guard stacking on the highest-traffic shop buttons:
  - `ShopControlPage.tsx` public shop openers now use one guarded click path instead of combining pointer guards with extra click-time `guardButtonPress(...)`
  - the recommended `Open Picture Tools` action no longer uses an old same-page hash anchor; it now reveals the picture section directly through the calmer in-page reveal path
  - `ShopGalleryPage.tsx` back navigation no longer adds an extra local `guardButtonPress()` on top of the already guarded button action
- A deeper Shop Control pass then removed the same duplicate pattern from more of the paid-tools side:
  - the `Public shop links` block now opens the public shop through the same single guarded path as the top summary controls
  - Vault link opening now uses one shared external-link opener instead of layering another direct `guardButtonPress(...)` call onto the click
- Another paid-tools stabilization pass then tightened the remaining shape-shifting controls:
  - `Open Paid Spotlight Publisher` now follows the same guarded action path as the rest of the paid-tools controls instead of using the last direct click-time guard path
  - `Open public verification` now uses the same guarded external-open pattern as the rest of the shop page, instead of behaving like a raw anchor beside the internal TrustSlip control
  - shortened several busy/locked labels in the paid-tools area so buttons stop changing size as much while working:
    - `Pay 1 slot`
    - `Pay 6 slots`
    - `Pay verification`
    - `Pay spotlight`
    - `Identity first`
    - `Working...`
- Verification after this pass:
  - `npm exec -- eslint src/pages/ShopControlPage.tsx src/components/CommunityShopControlPanel.tsx src/pages/ShopGalleryPage.tsx`
  - `npm run build`
  - both passed

#### Open risks or unknowns
- `ShopControlPage.tsx` still contains many page-local button guards layered across many individual buttons. The reveal engine is calmer now, but if shop buttons still feel heavy in live testing, the next step should be a second Shop-family pass focused specifically on duplicate guard stacking rather than on hash/scroll behavior.
- That next duplicate-guard pass has now started, but it is not complete yet. The busiest public/open actions are calmer; some create/pay/revoke actions still keep the older local guard style.
- The create/pay/revoke family is calmer now, but the vault row still has dense per-link controls (`Copy Vault link`, `Open Vault link`, `Extend 7 days`, `Revoke`) that may still need one more simplification pass if live phone testing says they remain visually or physically heavy.
- Other routes may still link into `Shop Control` using legacy `#shop-control-*` hashes. Those remain supported for compatibility, but the newer calmer contract now exists through `?section=...`.

#### Next recommended step
- Deploy `gmfn-frontend`.
- Phone-test:
  - embedded owner shortcuts from Community Home into Shop Control
  - Shop Control spotlight section open
  - Shop Control paid spotlight section open
  - Shop Control vault section open
  - public shop/gallery deep links
- If the page now feels materially calmer, continue the next deeper audit on route-local button-guard stacking rather than on more route-contract changes.

#### Date
2026-04-26 12:35

#### Workstream
Marketplace button-stability audit and first Marketplace interaction cleanup pass.

#### Routes/screens affected
- `/app/marketplace`
- Marketplace-guided in-page sections:
  - Marketplace actions
  - Money section
  - Owned links section
  - Members section
  - Borrow / Lend / Support section

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`

#### Confirmed facts
- Audit confirmed Marketplace had the same class of instability as Dashboard/Community/Shop:
  - duplicated local guard lanes
  - delayed section-toggle timers
  - delayed scroll timers
  - multiple open paths for the same support/tools sections
- `toggleSectionFromButton(...)` was still wrapping section expand/collapse in a `setTimeout(..., 12)`, which meant the visible toggle could fire after the user had already moved on to another action.
- `scrollToMarketplaceSection(...)` was still using a `setTimeout(..., 120)` delayed scroll path.
- `consumeMarketplaceButtonEvent(...)` was still calling `preventDefault()` on regular button flows, even though these actions are normal page buttons rather than native navigation controls.
- The `#marketplace-loans-support` hash effect was depending on `loanAmount` and `loanPurpose`, so while the page stayed on that hash, editing the support form could re-trigger the effect and scroll the user again.
- The Marketplace member-row `OriginLink` to public shop still had an extra Marketplace pointer guard layered on top of the shared `OriginLink` guard.
- This pass stabilized Marketplace by:
  - making section toggles act immediately
  - replacing the delayed section scroll timer with a retry-based `requestAnimationFrame` scroll helper
  - removing `preventDefault()` from the regular Marketplace button-consume path
  - stopping the support hash effect from re-triggering just because the user typed inside the support form
  - removing the redundant Marketplace pointer guard from the member-row `OriginLink`
- Verification after this pass:
  - `npm exec -- eslint src/pages/MarketplacePage.tsx src/pages/MarketplaceWorkspacePage.tsx`
  - `npm run build`
- Lint completed with two pre-existing warnings in `MarketplacePage.tsx`:
  - missing dependency warning around `props.candidates`
  - missing dependency warning around `loadPage`
  - no new lint errors were introduced

#### Open risks or unknowns
- `MarketplaceWorkspacePage.tsx` still has its own local button guard style and some duplicate section toggles, but this first pass focused on the main `/app/marketplace` route where the hidden jump behavior was strongest.
- Marketplace still receives hash-based deep links from Community Home and several Loans routes. Those launcher paths are now calmer on the Marketplace side, but they remain part of the wider guided-flow system and may need a second pass if live testing still shows cross-route drift.

#### Next recommended step
- Deploy `gmfn-frontend`.
- Phone-test:
  - Marketplace `Find action`
  - Marketplace `invite`
  - Marketplace `loan / support`
  - Members collapse/open
  - Money collapse/open
  - Owned links collapse/open
  - Borrow / Lend / Support form while typing on the page after arriving through a support hash
- If this pass materially calms Marketplace, continue with a second stabilization sweep for `MarketplaceWorkspacePage.tsx` and the remaining cross-route hash launchers.

#### Date
2026-04-26 12:46

#### Workstream
Marketplace second stabilization pass for workspace-side remote section controls.

#### Routes/screens affected
- `/app/community-marketplace`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/MarketplaceWorkspacePage.tsx`

#### Confirmed facts
- Follow-up audit confirmed `MarketplaceWorkspacePage.tsx` still had a confusing interaction pattern even after the first Marketplace cleanup:
  - the top trust summary card had `Open Alerts` and `Open Members` controls
  - lower down the page, separate `Community alerts` and `Members to shop mapping` sections also had their own `Open/Hide` controls
- This meant one top-level button could silently toggle a distant section without clearly taking the user there, which contributed to the feeling that buttons were affecting something elsewhere on the page.
- This pass changed the top trust-summary buttons so they now:
  - deliberately open the target section
  - scroll the user to that section
  - stop behaving like a second hidden toggle for the same state
- Added dedicated refs for:
  - the alerts section
  - the members section
- Added a retry-based `requestAnimationFrame` section scroll helper in `MarketplaceWorkspacePage.tsx` so reveal behavior is direct and visible rather than feeling remote or delayed.
- Verification after this pass:
  - `npm exec -- eslint src/pages/MarketplacePage.tsx src/pages/MarketplaceWorkspacePage.tsx`
  - `npm run build`
- Lint still reports the same two pre-existing MarketplacePage hook-dependency warnings and no new errors.

#### Open risks or unknowns
- `MarketplaceWorkspacePage.tsx` still keeps its own local button-guard style, but the most confusing duplicate section-control behavior has now been reduced.
- Wider cross-route Marketplace handoffs from Loans and Community Home still deserve future cleanup if live testing still shows context drift.

#### Next recommended step
- Deploy `gmfn-frontend`.
- Phone-test `/app/community-marketplace` specifically:
  - top `Open Alerts`
  - top `Open Members`
  - lower alerts section toggle
  - lower members section toggle
- If both Marketplace routes now feel calm enough, freeze Marketplace and move to the next guided family instead of layering more route-local button fixes.

#### Freeze note
- Marketplace stabilization is now owner-approved for freeze at this stage.
- Treat these routes as frozen unless a later task explicitly reopens them:
  - `/app/marketplace`
  - `/app/community-marketplace`
- The current expectation is stability first: do not restyle or rewire these launcher/toggle behaviors casually while other routes are being improved.

#### Date
2026-04-26 12:20

#### Workstream
Shared button-stability audit and first interaction cleanup pass for the highest-traffic guided routes.

#### Routes/screens affected
- `/app/dashboard`
- `/app/community`
- `/app/shop-control`
- public shop/gallery route handled by `ShopGalleryPage`
- all pages using `NextActionGuide`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/components/NextActionGuide.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/components/CommunityShopControlPanel.tsx`
- `frontend/src/pages/ShopControlPage.tsx`
- `frontend/src/pages/ShopGalleryPage.tsx`

#### Confirmed facts
- Parallel audit confirmed the button instability was not one broken button. It was a shared interaction problem caused by overlapping tap-guard systems, duplicated spotlight launch paths, and route-local delayed scroll/open behavior competing with newer guided behavior.
- `NextActionGuide.tsx` had two activation paths for the main typed submit:
  - the form submit
  - the submit button's own guarded click path
- `NextActionGuide.tsx` also had a root-level click stopper that could compete with page-local handlers.
- `DashboardPage.tsx` still had its own page-local guard layer (`consumeDashboardButtonEvent`, `runDashboardUiMutation`) on top of the shared guide layer.
- `CommunityHomePage.tsx` still launched guided spotlight in more than one way:
  - `?guide=spotlight`
  - typed/quick guide spotlight action
  - separate direct spotlight route patterns elsewhere
- `CommunityShopControlPanel.tsx` and `ShopGalleryPage.tsx` were still using heavier `onClickCapture` button guards, while newer screens had already been moved to lighter down-event-only guards.
- `ShopControlPage.tsx` still had conflicting spotlight motion paths:
  - hash-driven spotlight open/scroll
  - direct `openSpotlightTools(...)` timeout scroll
  - delayed collapse timer
- `ShopControlPage.tsx` also had a paid spotlight hash mismatch path in the audit, where paid spotlight intent could target a different id from the actual portal behavior.
- This pass stabilized the interaction layer by:
  - making `NextActionGuide` typed submit go through one guarded activation path only
  - removing the guide root click-swallow layer
  - simplifying Dashboard local button guards so they stop propagation without extra click cancellation and without extra animation-frame delay
  - unifying Community Home guided spotlight entry through one shared helper
  - removing `onClickCapture` from Community Shop Control and Shop Gallery button guards
  - making Shop Control paid spotlight hash handling, open path, and collapse path follow one calmer route without the older conflicting delay pattern
- Verification after this pass:
  - `npm exec -- eslint src/components/NextActionGuide.tsx src/pages/DashboardPage.tsx src/pages/CommunityHomePage.tsx src/components/CommunityShopControlPanel.tsx src/pages/ShopControlPage.tsx src/pages/ShopGalleryPage.tsx`
  - `npm run build`

#### Open risks or unknowns
- This is the first shared stabilization pass, not the final universal cleanup. Other pages still contain older route-local `buttonGuardProps()` or local launcher patterns outside these audited hotspots.
- The bottom-nav route transitions in the global layout were not reworked in this pass.
- Marketplace and other inner guided families still need the same cleanup pattern once the owner confirms this pass reduces the jumpiness enough in Dashboard, Community Home, Shop Control, and Shop Gallery.

#### Next recommended step
- Deploy `gmfn-frontend`.
- Phone-test the highest-traffic actions again:
  - Dashboard `Find action`
  - Dashboard guided spotlight handoff
  - Community Home guided spotlight handoff
  - Community Home owner spotlight buttons
  - Shop Control spotlight open/collapse/paid spotlight entry
  - public shop/gallery action buttons
- If this pass materially calms the app, continue with a second cleanup wave for Marketplace and the remaining process-led guided families instead of adding new layered button rules.

#### Date
2026-04-26 12:08

#### Workstream
Shared inner-page institutional shell for shop inner pages.

#### Routes/screens affected
- `/app/shop-control`
- public shop gallery / shop face route handled by `ShopGalleryPage`
- spotlight portal inside Shop Control

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/lib/institutionalSurface.ts`
- `frontend/src/pages/ShopControlPage.tsx`
- `frontend/src/pages/ShopGalleryPage.tsx`

#### Confirmed facts
- The product owner wanted the deep-blue side rails and pale-center institutional arrangement from the phone screenshot applied across inner shop pages, not left as page-local one-off gradients.
- Audit confirmed both `ShopControlPage.tsx` and `ShopGalleryPage.tsx` still carried separate local outer-shell background definitions even after earlier style passes.
- A new shared helper `institutionalBlueRailShell(...)` now lives in `frontend/src/lib/institutionalSurface.ts`.
- `ShopControlPage.tsx` now uses that shared shell for:
  - loading state
  - spotlight portal mode
  - normal owner shop-control mode
- `ShopGalleryPage.tsx` now uses that same shared shell for its top-level public shop/gallery wrapper.
- This keeps the outer frame aligned across these two high-traffic inner pages while leaving their route-specific blocks and business logic untouched.
- Verification after this pass:
  - `npm exec -- eslint src/lib/institutionalSurface.ts src/pages/ShopControlPage.tsx src/pages/ShopGalleryPage.tsx`
  - `npm run build`

#### Open risks or unknowns
- This pass standardizes the outer institutional shell first. Other inner pages like Shop Assets and other major inner workspaces still need to adopt the same shared shell if the owner wants full system-wide parity.
- Shop Gallery still contains many local inner gradients for feature-level blocks; only the page shell was standardized here.

#### Next recommended step
- Deploy `gmfn-frontend`.
- Phone-test:
  - `/app/shop-control`
  - public shop/gallery
- If the owner approves this shell, extend `institutionalBlueRailShell(...)` to the next inner pages instead of introducing new page-local backgrounds.

#### Date
2026-04-25 16:52

#### Workstream
Community Home spotlight-button hardening and dashboard picture persistence compatibility.

#### Routes/screens affected
- `/app/community`
- `/app/dashboard`
- cross-page dashboard picture reuse where other pages still read the legacy avatar key

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/pages/DashboardPage.tsx`

#### Confirmed facts
- The product owner reported that Community Home spotlight buttons could still drift into the wrong route, including Finance, instead of staying on the spotlight path.
- Audit confirmed that the dedicated spotlight publisher in `ShopControlPage.tsx` was still the correct working engine and should remain unchanged.
- The weak point was still the Community Home launcher layer:
  - the `spotlight` quick action in `handleCommunityNextAction(...)` still routed directly to `/app/shop-control#shop-control-spotlight`
  - the embedded shop-control launcher relied on one short delayed scroll, which could miss on phone if the embedded panel had not rendered yet
- `CommunityHomePage.tsx` now hardens the launcher layer by:
  - adding retry-based scroll targeting in `openCommunityShopControl(...)`
  - routing the Community Home `spotlight` quick action into the embedded owner spotlight workspace instead of sending it straight away into another route
  - making `Open Owner Spotlight Here` use that same unified helper path
- This means the main Community Home spotlight entry now behaves as:
  - keep the user on Community Home
  - open the embedded owner panel
  - scroll repeatedly until the owner-shortcuts spotlight target is actually present
- The product owner also reported that the dashboard picture was still not steady enough.
- Audit confirmed the dashboard picture had already been widened to multiple scoped storage keys, but some other pages still read only the legacy base key `gmfn.member.avatar`.
- `DashboardPage.tsx` now writes and reads the avatar through:
  - the legacy base key `gmfn.member.avatar`
  - the current scoped key
  - the wider identity-derived scoped keys
- This keeps the dashboard picture more stable across page moves while still preserving the newer scoped storage model.

#### Open risks or unknowns
- The dashboard picture is still device-level persistence, not a backend-synced profile photo.
- Phone retest is still needed on Community Home to confirm the spotlight launcher no longer drifts into Finance or another route.

#### Next recommended step
- Deploy this batch and phone-test:
  - the Community Home spotlight quick action
  - `Open Owner Spotlight Here`
  - dashboard picture upload -> leave dashboard -> return -> open another identity-facing page

#### Date
2026-04-25 16:18

#### Workstream
Community Home spotlight launcher stabilization.

#### Routes/screens affected
- `/app/community`
- embedded Community Home shop-control panel
- launcher path into `/app/shop-control#shop-control-spotlight`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/components/CommunityShopControlPanel.tsx`

#### Confirmed facts
- The product owner reported that Community Home spotlight buttons were still feeling jumpy on phone, even though spotlight behavior itself was already working correctly on the dedicated shop-control side.
- Audit confirmed the spotlight engine and hash-handling in `ShopControlPage.tsx` were already present and should not be changed:
  - `#shop-control-spotlight` already auto-opens the spotlight publisher
  - hash scroll logic already retries until the target appears
- The weak point was the Community Home launcher layer, not spotlight publish logic.
- Community Home spotlight actions now split into clearer, steadier paths:
  - `Open Owner Spotlight Here`
    - opens the embedded `CommunityShopControlPanel`
    - scrolls directly to the owner-shortcuts area inside that panel
    - keeps the person on Community Home instead of jumping away immediately
  - `Open Full Spotlight Publisher`
    - opens `/app/shop-control#shop-control-spotlight`
  - `Open Paid Spotlight`
    - opens `/app/shop-control#shop-control-paid-spotlight`
- `CommunityShopControlPanel.tsx` now exposes `id="community-shop-control-owner-shortcuts"` so Community Home can scroll reliably into the correct owner area before the user chooses the next spotlight action.
- This pass keeps spotlight publishing logic untouched and focuses only on launcher stability and route completeness.
- Verification after this pass:
  - `npm run build`

#### Open risks or unknowns
- Phone retest is still needed on the Community Home spotlight block itself.
- If the owner wants the embedded Community Home panel to open the full spotlight publisher inline rather than route into `/app/shop-control`, that would be a separate design change. This pass deliberately avoided changing spotlight business logic.

#### Next recommended step
- Deploy the current branch, then phone-test the three Community Home spotlight actions:
  - `Open Owner Spotlight Here`
  - `Open Full Spotlight Publisher`
  - `Open Paid Spotlight`
- If those behave steadily, freeze the Community Home spotlight launcher layer.

#### Date
2026-04-25 15:54

#### Workstream
Default community cleanup widened to cover legacy seeded names and stale local data.

#### Routes/screens affected
- `/app/community`
- `/app/clans`
- any frontend route using `listMyClans()` or selected-clan visibility

#### Backend routes/endpoints involved
- `GET /clans/me`
- `POST /clans/{clan_id}/join`
- `POST /clans/{clan_id}/select`

#### Files in play
- `gmfn_backend/app/core/clan_auth.py`
- `gmfn_backend/app/services/clans_service.py`
- `gmfn_backend/app/api/routes/clans.py`
- `gmfn_backend/app/db/seed_dev.py`
- `frontend/src/lib/api.ts`
- `gmfn_backend/tests/test_default_clan_removal.py`
- local dev DB: `gmfn_backend/gmfn.db`

#### Confirmed facts
- The earlier default-community removal had blocked the exact backend/frontend name `Default Clan`, but an older dev seed still used `GMFN Default Clan`.
- System-level default-community detection now blocks both legacy names:
  - `Default Clan`
  - `GMFN Default Clan`
- `seed_dev.py` is now a no-op for default-community creation. Dev startup no longer creates or assigns any default community.
- Frontend clan normalization now filters out both default-community name variants.
- Backend join/select guards now reject both default-community name variants.
- Local database inspection found one stale `Default Clan` row in `gmfn_backend/gmfn.db` with:
  - `0` active memberships
  - `2` total archived memberships
- That stale row and its archived memberships were removed locally so the current render does not keep picking it up from old local data.
- Verification after this pass:
  - `npm run build`
  - `.\.venv\Scripts\python -m pytest tests/test_default_clan_removal.py`

#### Open risks or unknowns
- This local DB cleanup fixes the current machine. If another environment already has legacy default-community rows, the broadened code guards will hide them, but those rows would still need cleanup there too if the owner wants them fully deleted.

#### Next recommended step
- Refresh the running frontend/backend and retest the community lists. If default community is gone from the visible routes, continue with the next frozen-lane audit.

#### Date
2026-04-25 15:22

#### Workstream
Create-community lane audit and deterministic handoff tightening.

#### Routes/screens affected
- `/create`
- `/app/clans`
- `/app/build-first-circle`
- `/activate-membership`

#### Backend routes/endpoints involved
- `POST /entry/phone/start`
- `POST /entry/phone/confirm`
- `POST /entry/bank-details`
- `POST /entry/create`
- `POST /clans`

#### Files in play
- `frontend/src/pages/CreateEntryPage.tsx`
- `frontend/src/pages/ClansPage.tsx`
- `gmfn_backend/app/api/routes/entry.py`
- `gmfn_backend/tests/test_entry_create.py`

#### Confirmed facts
- The product owner wanted the create-community lane audited from backend truth, not only from page polish, for both:
  - the public founder path (`Create your own community`)
  - the already-inside member path (create a new community after entering the system)
- Backend truth from `POST /entry/create` is already stronger than the old frontend behavior suggested:
  - phone verification is required first
  - bank details are required before create can finish
  - backend returns `next_step: "build-first-circle"` only when an access token has already been issued
  - backend returns `next_step: "activate-membership"` when the person must still complete activation
- `frontend/src/pages/ClansPage.tsx` no longer leaves the already-inside member on a passive "community created" message:
  - after successful `POST /clans`
  - the new community is selected
  - the app now moves straight into `/app/build-first-circle`
  - location state carries:
    - `created_clan_id`
    - `created_clan_name`
    - `next_action: "invite-trusted-people"`
- `frontend/src/pages/CreateEntryPage.tsx` was tightened so the public founder path now trusts backend route truth more directly:
  - if backend says `build-first-circle` and auth is live, the app opens `/app/build-first-circle`
  - if backend says `activate-membership`, the app now requires a real activation reference and moves into `/activate-membership`
  - the old passive success fallback was removed for unresolved create completion; the page now raises an explicit error instead of silently leaving the user stranded
- This means the create lane is now app-led in both main create scenarios:
  - public founder create -> verify phone -> record bank -> create -> activate or enter workspace
  - existing member create -> create community -> auto-open first-circle/invite next step
- Verification after this create-lane pass:
  - `npm run build`
  - `.\.venv\Scripts\python -m pytest tests/test_entry_create.py`

#### Open risks or unknowns
- This pass is local only until deployed.
- `BuildFirstCirclePage.tsx` is now the next active handoff for newly created communities. If the owner wants even stronger guided language there, that is now the next route-local polish target.
- No backend business rule was changed in this pass for founder create itself; this was mainly a route-handoff and determinism correction on the frontend.

#### Next recommended step
- Deploy this batch, then phone-test both create routes:
  - public `Create your own community`
  - already-inside member creates a new community from `/app/clans`
- If both are steady, freeze the create lane and move next to existing-member sign-in lane audit.

#### Date
2026-04-25 13:22

#### Workstream
Dashboard avatar persistence hardening and Community Home spotlight-button guard cleanup.

#### Routes/screens affected
- `/app/dashboard`
- `/app/community`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/CommunityHomePage.tsx`

#### Confirmed facts
- The product owner reported two linked phone issues:
  - dashboard profile pictures could disappear after upload once the user moved away and came back
  - the spotlight button inside `Community Home` could drift into the wrong route such as Finance or Demand Box
- Re-confirmed from code before changes:
  - the dashboard avatar had no backend persistence route; it was still saved only in local storage
  - the dashboard avatar storage key was scoped only to one current identity string, which made it vulnerable to identity-key drift when the same person later resolved as `gmfn_id`, `id`, email, or phone
  - `CommunityHomePage.tsx` still used the heavier button-guard pattern with `onClickCapture`, which matched the same class of tap-interference already seen earlier on Marketplace
- `DashboardPage.tsx` now:
  - computes a fuller set of dashboard-avatar storage keys for the same user from:
    - `gmfn_id`
    - `id`
    - email
    - phone variants
    - fallback `visitor`
  - reads the first stored avatar found across those keys
  - backfills the current scoped key when an older identity key already holds the picture
  - writes the uploaded avatar across the known identity keys instead of one key only
  - surfaces a success/error note directly under the profile block after upload attempts
- Important scope for dashboard avatar:
  - there is still **no confirmed backend user-profile image save path** in the current auth/user flow
  - this means the dashboard picture remains a device-level persistence feature for now, not a cross-device backend-synced profile picture
- `CommunityHomePage.tsx` now has the lighter shared button guard:
  - `onClickCapture` was removed from `communityButtonGuardProps()`
  - only the earlier pointer/touch/mouse down propagation shield remains
  - this mirrors the safer Marketplace button fix that reduced route drift on phone
- Verification passed after this pass:
  - `npm exec -- eslint src/pages/DashboardPage.tsx src/pages/CommunityHomePage.tsx`
  - `npm run build`

#### Open risks or unknowns
- This pass is local only until deployed.
- The dashboard picture should now hold more reliably for the same person on the same device even if identity storage keys shift, but it will still not follow the user across devices until a true backend profile-image route exists.
- The Community Home spotlight button should now interfere less with parent route surfaces, but phone retest is still needed on the exact spotlight launcher inside `/app/community`.

#### Next recommended step
- Deploy this batch, then retest:
  - dashboard picture upload -> leave dashboard -> return
  - Community Home spotlight launcher -> confirm it lands in the intended spotlight/shop-control path instead of drifting into Finance or Demand Box

#### Date
2026-04-24 23:36

#### Workstream
Join review surface cleanup and approval-threshold explanation pass.

#### Routes/screens affected
- `/app/community/:id/join-requests`
- `/join-request/pending`
- `/join-approval/:requestId`

#### Backend routes/endpoints involved
- None changed in this pass. This was frontend-only.

#### Files in play
- `frontend/src/pages/CommunityJoinRequestsPage.tsx`
- `frontend/src/pages/JoinRequestPendingPage.tsx`
- `frontend/src/pages/JoinApprovalPage.tsx`

#### Confirmed facts
- The join-review path still used lighter older card surfaces than the newer money / trust / marketplace pages, and it did not explain the approval threshold strongly enough for users who had already approved once and expected immediate entry.
- `CommunityJoinRequestsPage.tsx` now uses richer institutional page/soft/stat surfaces, stronger button chrome, route-local press shielding on the live action buttons, and a new `Approval rule` explanation block.
- Pending request cards on `CommunityJoinRequestsPage.tsx` now explicitly state that a request remains pending until the approval count reaches the community threshold.
- `JoinRequestPendingPage.tsx` now uses richer institutional surfaces and stronger buttons, and its `What happens next` flow now explains that more than one approval may still be required if multiple active members count in the community.
- `JoinApprovalPage.tsx` now uses richer institutional surfaces and stronger buttons, and its pending-state helper text now explains that a request can remain pending until the remaining approval decision arrives.
- Verification after this pass:
  - `npm exec -- eslint src/pages/CommunityJoinRequestsPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/JoinApprovalPage.tsx`
  - `npm run build`
- Current lint state from that targeted run:
  - 1 pre-existing hook-dependency warning in `CommunityJoinRequestsPage.tsx`
  - 4 pre-existing `useMemo` dependency warnings in `JoinRequestPendingPage.tsx`
  - no errors

#### Open risks or unknowns
- This pass is local only until deployed.
- The approval-threshold explanation is now clearer, but the backend rule itself was not changed. If the product owner wants approved-but-not-activated placeholder memberships excluded from threshold counts, that is still a separate backend/business-rule task.
- Phone retest is still needed on the Approve / Reject action buttons inside `CommunityJoinRequestsPage.tsx`.

#### Next recommended step
- Deploy the current local batch, then retest the join-review path on phone. If tester confusion shifts from visibility to threshold policy, audit `_current_join_status(...)` next.

#### Date
2026-04-24 23:18

#### Workstream
Marketplace / community join-path clan-header correction and approval-threshold audit.

#### Routes/screens affected
- `/app/marketplace`
- `/app/marketplace-workspace`
- `/app/community/:id/join-requests`

#### Backend routes/endpoints involved
- `GET /clans/{clan_id}/members`
- `GET /clans/{clan_id}/join-requests`
- `POST /clans/{clan_id}/join-requests/{join_request_id}/vote`
- `POST /clans/{clan_id}/invite`

#### Files in play
- `frontend/src/lib/api.ts`

#### Confirmed facts
- The user reported that Marketplace still showed `No members are visible in this marketplace yet.` even though Aberdeen city ICA / marketplace should at least show the admin member.
- The user also reported a join request remaining pending after their own approval and expected that, if they were the only active member, one approval should have been enough.
- Clan-scoped Marketplace and join-request calls were still relying on whichever clan happened to be selected globally inside the shared API client. This created a timing / wrong-context risk on first load when a route had already resolved a specific community id but the shared selected-clan state was still stale or unset.
- `frontend/src/lib/api.ts` was tightened so these clan-scoped calls now always send the explicit `header_clan_id` for the target community:
  - `listClanMembers(clanId)`
  - `listJoinRequests(clanId)`
  - `voteJoinRequest(clanId, ...)`
  - `getCommunityJoinRequests(clanId)`
  - `voteOnJoinRequest(...)`
- Local database inspection confirmed that clan `3` currently has **three** active `ClanMembership` rows:
  - admin user `GMFN-U-9867079C`
  - `447903165266@pending.gmfn.local`
  - `447881119883@pending.gmfn.local`
- Because `_current_join_status(...)` in `gmfn_backend/app/api/routes/clans.py` calculates required approvals from active memberships, `Approvals: 1` and `Required approvals: 2` is currently expected behavior for that clan. The visible-member bug and the approval-threshold number are related in user perception but are not the same backend rule.
- Verification after the header-correction pass:
  - `npm run build` passed
- File-targeted lint on `frontend/src/lib/api.ts` is currently blocked by pre-existing file-wide eslint errors unrelated to this pass (`no-empty`, one unused variable).

#### Open risks or unknowns
- This pass is local only until deployed.
- Phone retest is still needed on:
  - Marketplace member row
  - Marketplace Workspace member row
  - community join-request review after refresh / vote
- The approved-but-not-activated placeholder memberships in clan `3` are still being counted as active members by the backend approval rule. That is now a confirmed business-rule behavior, not just a UI glitch, and may need a separate product decision if the owner wants only fully activated members to count.

#### Next recommended step
- Deploy the current local batch, then retest Marketplace member visibility and join-request review on phone first. If the owner wants one-member communities to auto-approve with a single vote even when placeholder approved users exist, audit `_current_join_status(...)` and the approval / activation lifecycle next.

#### Date
2026-04-24 22:24

#### Workstream
Marketplace live-button repair and shared mobile bottom-domain rail restoration.

#### Routes/screens affected
- `/app/marketplace`
- Shared app shell mobile bottom-domain rail on loan/support task routes

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`
- `frontend/src/layout/AppLayout.tsx`

#### Confirmed facts
- The user reported that Marketplace invite controls such as `Create / Refresh` were still misfiring or feeling stiff on phone, which made it hard to know whether a fresh invite was actually created or copied.
- The user also reported that the true app-base domain rail was missing on the loan/support task routes; this turned out to be a shared-shell issue, not a Loans-page issue.
- `AppLayout.tsx` was tightened so the real shared mobile bottom-domain rail stays visible on the focused loan/support routes and auto-centers the active item on mobile. The rail still keeps `Admin` permission-controlled via the existing access logic.
- `MarketplacePage.tsx` button handling was hardened:
  - invite / refresh / copy / send / outward-link actions now route through a shared `runMarketplaceAction(...)` helper
  - the shared Marketplace click consumer now stops propagation and prevents the browser's default click behavior on those real action buttons
  - this was done to reduce button drift into nearby routes or parent surfaces on phone
- Verification passed after the Marketplace/AppLayout pass:
  - `npm exec -- eslint src/pages/MarketplacePage.tsx`
  - `npm run build`
- Current lint state from that targeted run:
  - only the same two pre-existing hook-dependency warnings remain in `MarketplacePage.tsx`

#### Open risks or unknowns
- This pass is local only until deployed.
- Phone retest is still needed specifically on:
  - `Create / Refresh`
  - `Copy WhatsApp Message`
  - `Open Join Link`
  - `Send WhatsApp`
  - public marketplace/shop open-copy buttons
- A join request that shows `Approvals: 1` and `Required approvals: 2` is still expected to remain pending until the second approval arrives; that part is business-rule behavior, not a button bug.

#### Next recommended step
- Retest Marketplace on phone first, then continue route-local button hardening only where testers still report instability.

#### Date
2026-04-24 21:06

#### Workstream
Withdrawal Instructions route-local hardening and button stabilization.

#### Routes/screens affected
- `/app/withdrawal-instructions`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/WithdrawalInstructionsPage.tsx`

#### Confirmed facts
- The withdrawal-instructions route now uses stronger route-local page, soft, inner, and stat-card surfaces; darker section labels and helper text; richer badges; stronger buttons; and stronger inputs so it matches the rest of the money-route family more closely.
- A route-local press guard was added to the main collapse, decision, save, copy, refresh, and route-switch buttons so taps should feel steadier on phone.
- No withdrawal backend contracts, payout rules, or support-branch business logic changed.
- `npm exec -- eslint src/pages/WithdrawalInstructionsPage.tsx` passed with the same single pre-existing hook-dependency warning for `loadPage`.
- `npm run build` passed.

#### Open risks or unknowns
- This pass is local only until deployed.
- Phone review is still needed to confirm the many live buttons on this route now feel stable enough during testing.

#### Next recommended step
- Continue deep cleaning in the next tester-facing inner route that still feels faded or soft outside the money-route family, or return to the most stubborn live button surface if testers surface one again.

#### Date
2026-04-24 20:53

#### Workstream
Payout Details inner-page hardening and button stabilization.

#### Routes/screens affected
- `/app/payout-details`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/PayoutDetailsPage.tsx`

#### Confirmed facts
- The payout-details route now uses stronger route-local surfaces, darker section labels, richer badges, stronger input styling, and firmer primary/secondary buttons so it better matches the rest of the money-route family.
- A local press guard was added to the real save/copy/clear buttons so taps should feel steadier on phone.
- No payout backend contracts, payment logic, or withdrawal rules changed.
- `npm exec -- eslint src/pages/PayoutDetailsPage.tsx` passed.
- `npm run build` passed.

#### Open risks or unknowns
- This pass is local only until deployed.
- Phone review is still needed to confirm the payout route now feels fully aligned with `Money In` and `Payment Rails`.

#### Next recommended step
- Continue with the next remaining money-out inner page that still feels lighter or softer than the rest of the route family.

#### Date
2026-04-24 20:40

#### Workstream
Payment Rails inner-page hardening and button stabilization.

#### Routes/screens affected
- `/app/payment-rails`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/PaymentRailsPage.tsx`

#### Confirmed facts
- `PaymentRailsPage.tsx` was still using the older lighter card/button helper set after the recent money-route strengthening on Finance, Revenue Allocation, and Money In.
- The page now has stronger page/soft/inner surfaces, darker section labels and helper text, richer badges, stronger primary/secondary/soft button chrome, and stronger route tiles.
- The page's local raw-response toggle button now also uses the same light press guard on pointer/touch/mouse down to reduce parent-surface interference on phone.
- `npm exec -- eslint src/pages/PaymentRailsPage.tsx` passed.
- `npm run build` passed.

#### Open risks or unknowns
- This is local only until deployed.
- No backend rail visibility logic or route contracts changed.
- Phone review is still needed to confirm the strengthened rail actions now feel consistent with the rest of the money-route family.

#### Next recommended step
- Continue down the same money-route family and harden `Payout Details` next, then reassess whether `Money Out` still needs another route-local pass.

#### Date
2026-04-24 20:31

#### Workstream
Money In / Payment Instructions inner-page hardening and button stabilization.

#### Routes/screens affected
- `/app/payment/pool`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/PaymentInstructionsPage.tsx`

#### Confirmed facts
- `PaymentInstructionsPage.tsx` still used its own lighter card/button helpers instead of the richer money-route styling now present on Finance and Revenue Allocation.
- The page now has stronger page/soft/inner/stat surfaces, darker section labels and helper text, stronger badges, richer button gradients, and firmer input styling.
- Local page buttons now also use a light press guard on pointer/touch/mouse down to reduce parent-surface interference on phone.
- `npm exec -- eslint src/pages/PaymentInstructionsPage.tsx` passed.
- `npm run build` passed.

#### Open risks or unknowns
- This is local only until deployed.
- No backend payment route, settlement logic, or reconciliation logic changed.
- Phone review is still needed to confirm the Money In buttons now feel as steady as the stronger finance/support pages.

#### Next recommended step
- Continue down the same money-route family and harden the next inner route that still feels visually lighter than Finance/Revenue Allocation, or switch back to the most tester-reported jumpy inner page if new live feedback arrives first.

#### Date
2026-04-24 20:14

#### Workstream
Revenue Allocation inner-page hardening after Finance surface strengthening.

#### Routes/screens affected
- `/app/revenue-allocation`
- Indirect visual enrichment on routes already using shared institutional surfaces

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/RevenueAllocationPage.tsx`

#### Confirmed facts
- `RevenueAllocationPage.tsx` was still reading slightly softer than the newly-strengthened Finance main surface even after the shared institutional surface deepening.
- Route-local hardening completed on `RevenueAllocationPage.tsx`:
  - page / soft / inner / stat cards now use firmer borders and stronger shadows
  - route tiles now use stronger gradients and slightly deeper emphasis
  - primary / secondary / collapse buttons now use stronger gradients, borders, and shadows
  - the allocation input field now uses a stronger staged surface and firmer border/shadow
  - section labels and helper text were darkened slightly
  - badges were given a slight inner highlight so they read less flat
- Verification passed:
  - `npm exec -- eslint src/pages/RevenueAllocationPage.tsx src/lib/institutionalSurface.ts`
  - `npm run build`

#### Open risks or unknowns
- This pass is local only until deployed.
- Phone review is still needed to confirm the Revenue Allocation route now feels fully aligned with Finance and the stronger inner money pages.
- Some other route-local pages with their own custom button helpers may still need the same hardening later.

#### Next recommended step
- Continue the same route-local tightening on the next still-soft tester-facing money/support page, or switch back to button-stability tightening on the most frequently touched shaky route if testers surface another hotspot.

#### Date
2026-04-24 20:02

#### Workstream
Shared institutional-surface color enrichment and Finance main-surface button hardening.

#### Routes/screens affected
- Shared institutional surfaces used across multiple inner pages
- `/app/finance`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/lib/institutionalSurface.ts`
- `frontend/src/pages/FinancePage.tsx`

#### Confirmed facts
- Many of the already-cleaned inner routes were now relying on the shared `institutionalSurface.ts` helpers, so a small shared visual deepening could enrich multiple pages consistently without route-by-route rewrites.
- `institutionalSurface.ts` was deepened carefully:
  - page / soft / inner / stat gradients now use richer blue-gold institutional blends
  - surface borders were darkened slightly
  - card shadows were strengthened slightly
- This affects routes that consume those helpers, including Finance, Loans, Trust-linked pages, and several support/payment routes that already spread those shared styles.
- `FinancePage.tsx` was hardened locally on top of the shared surface pass:
  - darker section labels and helper text
  - richer pill/badge backgrounds
  - stronger tap-safe button base
  - deeper primary / secondary / soft button gradients, borders, and shadows
  - stronger collapse-toggle chrome
- Verification passed:
  - `npm exec -- eslint src/lib/institutionalSurface.ts src/pages/FinancePage.tsx`
  - `npm run build`

#### Open risks or unknowns
- This pass is local only until deployed.
- Because `institutionalSurface.ts` is shared, the enrichment reaches multiple pages at once; phone review is still needed to confirm the deepened surfaces feel richer without becoming too heavy.
- Button strengthening in this pass was only applied directly to `FinancePage.tsx`; other pages with local button helpers may still need route-local tightening later.

#### Next recommended step
- Review Finance and one or two shared-surface inner pages on phone, then continue the same route-local button hardening on the next still-soft money/trust/support page that testers touch most.

#### Date
2026-04-24 19:08

#### Workstream
Trust inner-surface institutional cleanup and Timeline warning removal.

#### Routes/screens affected
- `/app/open-trust-reading`
- `/app/trust-slip/verify`
- `/app/trust-score`
- `/app/trust-timeline`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/OpenTrustPage.tsx`
- `frontend/src/pages/TrustSlipVerifyPage.tsx`
- `frontend/src/pages/TrustScorePage.tsx`
- `frontend/src/pages/TrustTimelinePage.tsx`

#### Confirmed facts
- `OpenTrustPage.tsx` and `TrustSlipVerifyPage.tsx` were still using older thin helper surfaces after the main Trust page had already been strengthened.
- `OpenTrustPage.tsx` now uses richer institutional `pageCard` and `innerCard` wrappers, stronger section labels, darker helper text, stronger badges, and firmer action-button chrome.
- `TrustSlipVerifyPage.tsx` now uses institutional page/soft/inner/stat surfaces, darker section labels, darker helper text, stronger badges, and richer action-button styling.
- `TrustScorePage.tsx` already used institutional surfaces in parts of the route, but its section labels and helper text were still lighter than the stronger Trust family; they were darkened and aligned.
- `TrustTimelinePage.tsx` no longer suppresses the old `react-hooks/exhaustive-deps` warning with an unused eslint-disable comment:
  - `loadAll` is now wrapped in `useCallback`
  - the effect now depends on `loadAll`
- Dead helper cleanup completed during verification:
  - removed unused `positiveNumber` from `OpenTrustPage.tsx`
  - removed unused `apiOrigin`, `apiBase`, and `browserOrigin` leftovers from `TrustSlipVerifyPage.tsx`
- Verification passed:
  - `npm exec -- eslint src/pages/OpenTrustPage.tsx src/pages/TrustSlipVerifyPage.tsx src/pages/TrustScorePage.tsx src/pages/TrustTimelinePage.tsx`
  - `npm run build`
- Current lint status from that targeted run:
  - only one remaining warning in `TrustScorePage.tsx` for a pre-existing `loadAll` dependency in another effect

#### Open risks or unknowns
- This pass is local only until deployed.
- `TrustScorePage.tsx` still has one older hook-dependency warning that was not refactored in this pass.
- Phone review is still needed to confirm the richer Trust inner pages now feel consistent with `/app/trust`.

#### Next recommended step
- Continue the same deep-cleaning pass into the next still-faded inner route outside Trust, or return to targeted phone-button tightening on any route testers still call jumpy.

#### Date
2026-04-24 18:34

#### Workstream
Shared mobile bottom-rail tightening and Trust page institutional cleanup.

#### Routes/screens affected
- Shared mobile app shell on task routes that keep the bottom rail
- `/app/trust`
- Existing trust routes already cleaned earlier in this branch:
  - `/app/trust-slip`
  - `/app/trust-timeline`
  - `/app/trust-leaderboard`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/layout/AppLayout.tsx`
- `frontend/src/pages/TrustPage.tsx`
- `frontend/src/pages/TrustTimelinePage.tsx`
- `frontend/src/pages/TrustLeaderboardPage.tsx`

#### Confirmed facts
- The real mobile bottom-domain rail already contained the correct app-wide domains, including conditional `Admin`, but it was behaving too much like trailing page content on phone.
- `AppLayout.tsx` was tightened so the shared mobile bottom rail now behaves more like a true app-base rail:
  - `bottomNav()` now uses fixed positioning at the phone base
  - `mainContent()` now reserves larger bottom padding for that rail
  - bottom rail item chrome was made slightly more compact so more of the major-domain row is visible at once
- `TrustPage.tsx` was still materially plainer than the newer trust routes, so it was upgraded route-locally:
  - added `PageTopNav`
  - added richer `pageCard`, `innerCard`, `sectionLabel`, `helperText`, `actionBtn`, and `fieldInput` helpers
  - restyled the hero, trust score surface, explainability area, filters, and event ledger to match the stronger institutional trust family
- `TrustTimelinePage.tsx` and `TrustLeaderboardPage.tsx` were corrected to use `PageTopNav`'s `subtitle` prop instead of the invalid `description` prop.
- `TrustPage.tsx` now imports `TrustEventsQuery` as a type-only import to satisfy eslint.
- Verification passed:
  - `npm exec -- eslint src/layout/AppLayout.tsx src/pages/TrustPage.tsx src/pages/TrustTimelinePage.tsx src/pages/TrustLeaderboardPage.tsx`
  - `npm run build`
- Current lint status from that targeted run:
  - only one remaining warning in `TrustTimelinePage.tsx` for an unused `eslint-disable` directive

#### Open risks or unknowns
- The bottom rail now stays available at the phone base, but `Admin` still remains permission-controlled; it will not appear for users who do not qualify for admin tools.
- Because the major-domain row is long, some phones may still require a horizontal swipe to reach the far-right items even after compaction.
- This pass is local only until deployed.

#### Next recommended step
- Carry the same institutional cleanup into the next plain trust-linked inner surface or continue the phone button-stability pass on any route testers still call jumpy.

#### Date
2026-04-24

#### Workstream
Demand Box and Marketplace Workspace inner-surface enrichment.

#### Routes/screens affected
- `/app/demand-box`
- `/app/marketplace-workspace`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/DemandBoxPage.tsx`
- `frontend/src/pages/MarketplaceWorkspacePage.tsx`

#### Confirmed facts
- After Marketplace shell strengthening, the next visible mismatch was that the linked inner pages still carried older, paler card and button helpers.
- `DemandBoxPage.tsx` was deepened route-locally:
  - `pageCard`, `softCard`, `innerCard`, `detailsShell`, `statTile`, and `recordCard` now use stronger blue-framed borders, richer gradients, and firmer shadows
  - `primaryBtn`, `secondaryBtn`, and `subtleBtn` now use slightly taller button bodies, richer gradients, and stronger shadows
  - inputs, badges, helper text, and section labels were darkened so the page reads less like faded paper
- `MarketplaceWorkspacePage.tsx` was deepened route-locally:
  - `pageCard` and `softCard` now use richer gradients, stronger borders, and firmer shadows
  - shared `btn` and `badge` styles now have stronger chrome and contrast
  - muted/body support text and section labels were darkened to match the Marketplace page more closely
- No business logic, backend invite logic, permissions, or route ownership changed.
- Verification passed:
  - `npm exec -- eslint src/pages/DemandBoxPage.tsx src/pages/MarketplaceWorkspacePage.tsx`
  - `npm run build`

#### Open risks or unknowns
- These visual enrichments are local until deployed.
- Phone review is still needed to confirm whether the stronger gradients and button chrome are sufficient, especially on Demand Box action clusters.
- `ShopControlPage.tsx` already has a stronger shell than these two pages, but it may still need one later consistency pass if it looks lighter than Marketplace after fresh phone review.

#### Next recommended step
- Continue the same deep-cleaning pattern into the next inner route that still feels pale on phone, likely `ShopControlPage.tsx` or the next Marketplace-linked operating page that testers touch most often.

### Previous update

#### Date
2026-04-24

#### Workstream
Marketplace inner-surface color enrichment and button strengthening.
- If Marketplace now looks sufficiently rich, the next likely visual weak point is no longer the card palette but individual image staging/cropping or other route-local pages outside Marketplace.

#### Next recommended step
- Recheck `/app/marketplace` on phone, especially the lower inner sections and repeated action buttons.
- If this looks good, continue the same color/button strengthening pattern into the next most faded inner route only, instead of broad global restyling.

#### Date
2026-04-24

#### Workstream
Marketplace mobile link-deck cleanup.

#### Routes/screens affected
- `/app/marketplace`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`

#### Confirmed facts
- The newer local Marketplace build already replaced the old raw-link display from the older Render version, but phone review still showed two mobile issues:
  - on-screen message preview still displayed the full raw URL, which made the preview feel technical even though copied/sent WhatsApp text was being humanized
  - Marketplace link-deck action rows could still feel cramped or cut off on phone widths
- Marketplace now has separate route-local preview builders for join/create:
  - copied and sent WhatsApp messages still include the full real live link
  - on-screen `Message preview` now shows the human note plus the masked label instead of the full raw URL
- The main Marketplace link-deck action rows now switch to a single-column mobile stack on compact screens, so join/create/public-shop/public-marketplace/private-access buttons read more cleanly on phone.
- This pass stayed frontend-only and did not change invite generation, copied message payloads, backend routes, or link contracts.
- Verification passed:
  - `npm exec -- eslint src/pages/MarketplacePage.tsx`
  - `npm run build`
- ESLint still reports only the same two pre-existing `MarketplacePage.tsx` hook-dependency warnings and no new errors.

#### Open risks or unknowns
- This is still local until deployed.
- The old Render screenshot with `Copy WhatsApp Link` / `Open Link` is still from the earlier live build and should not be used as the current reference once the newer Marketplace page is deployed.
- If the user still sees raw computer-language output inside WhatsApp after this pass, the next check should be whether they are copying from the browser/address bar instead of using the Marketplace copy/send controls.

#### Next recommended step
- Review the local Marketplace link deck on phone again and confirm:
  - preview cards no longer show raw URLs on-screen
  - action buttons stack cleanly on compact screens
  - copied/sent WhatsApp output still contains the real live link
- If that is confirmed, the next pass can focus on remaining Marketplace image staging and residual faint separators only.

#### Date
2026-04-24

#### Workstream
Marketplace visual-deepening and profile-surface polish.

#### Routes/screens affected
- `/app/marketplace`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`

#### Confirmed facts
- Marketplace route-local chrome was deepened again to reduce the washed-out, paper-like feel without changing page ownership or backend behavior.
- The following Marketplace-specific surfaces were strengthened:
  - outer shell gradients and border/shadow depth
  - page card, soft card, and inner card borders/shadows
  - Marketplace identity / DP block background and scrim
  - market picture frame outer/inner chrome
  - Marketplace identity stats panel
  - picture handle / picture tools overlay chrome
  - details toggle chrome
  - Marketplace action button gradients
  - section labels and the main outgoing-links deck wrapper
- This pass stayed frontend-only and route-local. No invite generation, join preview, auth, permissions, shared contracts, or backend routes changed.
- Verification passed:
  - `npm exec -- eslint src/pages/MarketplacePage.tsx`
  - `npm run build`
- ESLint still reports only the same two pre-existing `MarketplacePage.tsx` hook-dependency warnings and no new errors.

#### Open risks or unknowns
- This polish is still local until deployed.
- Phone visual confirmation is still needed, especially on the Marketplace identity/DP block and the link-deck surfaces.
- If the market DP image itself still feels unprofessional after this chrome pass, the next likely issue is image staging/cropping rather than page-surface color.

#### Next recommended step
- Review `/app/marketplace` on phone and compare the Marketplace identity/DP block against the dashboard-quality reference.
- If needed, do one focused follow-up on market-image staging/cropping and the remaining faint separators only, without touching Marketplace logic.

#### Date
2026-04-24

#### Workstream
Marketplace button-stiffness relief.

#### Routes/screens affected
- `/app/marketplace`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`

#### Confirmed facts
- The Marketplace page had an aggressive button/link guard pattern that attached `onClickCapture` handlers directly on the same button/link elements.
- That guard has been reduced so Marketplace button and link helpers now stop propagation on pointer/touch/mouse down only, without intercepting click capture on the same control.
- This change was applied to the shared Marketplace guard helpers, so it affects the repeated Marketplace controls consistently instead of patching one button at a time.
- This pass did not alter route targets, invite logic, card ownership, or page architecture.

#### Open risks or unknowns
- This is still local until deployed.
- It should reduce stiff/dead taps, but live phone confirmation is still needed on the Marketplace link desk and the main Marketplace action blocks.
- The same kind of stiff-button pattern may still exist on other pages outside Marketplace.

#### Next recommended step
- Retest the Marketplace `Create / Refresh`, `Copy`, `Open`, and other main action buttons on phone.
- If this improves the link desk, continue the same lighter guard cleanup on the next most troublesome inner pages.

#### Date
2026-04-24

#### Workstream
Marketplace invite refresh hardening and surface polish.

#### Routes/screens affected
- `/app/marketplace`
- `POST /clans/{clan_id}/invite`

#### Backend routes/endpoints involved
- `POST /clans/{clan_id}/invite`

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`
- `gmfn_backend/app/api/routes/clans.py`
- `gmfn_backend/tests/test_join_requests.py`

#### Confirmed facts
- The Marketplace `Create / Refresh` button already used `POST /clans/{clan_id}/invite`, but that backend route previously behaved more like `create another active invite` than a true refresh.
- `POST /clans/{clan_id}/invite` now retires older live `ClanInvite` rows for that same community before issuing the next one, so the button now behaves like a real refresh.
- The route now returns `retired_live_invites` so the frontend can show clearer feedback about whether an older live invite was replaced.
- `MarketplacePage` now reports:
  - `Fresh join invite created and copied.` when there was no older live invite
  - `Fresh join invite created, copied, and older live link retired.` when refresh replaced a previous live invite
- `MarketplacePage` also received a light visual polish only on its own surfaces:
  - stronger card borders and shadows
  - darker section labels
  - firmer button borders, height, and contrast
  - no route logic or page ownership changed in this polish pass
- New backend coverage confirms refresh semantics:
  - two consecutive `POST /clans/1/invite` calls now produce different invite codes
  - the first invite becomes inactive with `revoked_at`
  - the second invite remains active

#### Open risks or unknowns
- This improves refresh semantics for Marketplace/Clans invite creation, but already-shared stale live links on Render still need retesting after deployment.
- This does not yet finish the wider jumpy-button cleanup outside Marketplace.
- This does not yet address the remaining user concern that some Marketplace surfaces still look less institutional than the dashboard profile block.

#### Next recommended step
- Deploy this refresh hardening, generate one new Marketplace join link on Render, and retest that exact fresh link on phone/WhatsApp.
- After that, continue the Marketplace-only button-stability pass so outside testing can proceed without tap friction.

#### Date
2026-04-24

#### Workstream
Community Home versus Marketplace outward-link wording separation.

#### Routes/screens affected
- `/app/community`
- `/app/marketplace`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/pages/MarketplacePage.tsx`

#### Confirmed facts
- `CommunityHomePage` now hands off more clearly into Marketplace without sounding like it owns Marketplace internals:
  - the owner-action helper now says Marketplace keeps one community's live operating lanes together while the marketplace link desk carries outward links
  - `Open Marketplace Links` now reads `Open Marketplace Link Desk`
  - community summary pills now say `Private Vault` instead of the shorter ambiguous `Vault`
- `MarketplacePage` now uses the same language family as the newer shop and workspace pages:
  - the outward-link explainer now distinguishes `public marketplace face`, `public shop face`, and `private Vault-style access`
  - the main helper copy now says `marketplace face`, `public shop face`, and `private-Vault route` instead of older mixed wording like `show this marketplace` / `show your shop`
  - the marketplace link card now reads `Public marketplace face`, with `Public marketplace link ready`, `Copy Marketplace Link`, and `Open Marketplace Face`
  - the shop link card now reads `Public shop face`, with `Public shop link ready`, `Copy Shop Link`, and `Open Shop Face`
  - the controlled-link card now reads `Private and controlled outward links`, with `Private Vault access is conditional` and `Open Public Shop Face`
  - the shared controlled-link note now says `Private Vault access and other controlled outward links`

#### Open risks or unknowns
- This pass was frontend-only; it does not change invite generation, preview, or backend link validity.
- This does not yet resolve the live Render reports about stale/expired join links.
- Jumpy-button cleanup remains a separate ongoing pass.

#### Next recommended step
- Continue low-risk deep cleaning on the remaining launcher/descriptive surfaces that still blur Marketplace and Community Home, then return to the larger button-stability pass once wording ownership is fully consistent.

#### Date
2026-04-24

#### Workstream
Shop/vault/public-surface deep cleaning.

#### Routes/screens affected
- `/app/shop-control`
- `/shop/:gmfnId`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/ShopControlPage.tsx`
- `frontend/src/pages/ShopGalleryPage.tsx`
- `frontend/src/components/CommunityShopControlPanel.tsx`
- `frontend/src/pages/MarketplaceWorkspacePage.tsx`

#### Confirmed facts
- `ShopControlPage` now speaks more clearly as owner backstage:
  - repeated `Open Public Shop` actions were renamed to `Open Public Shop Face`
  - repeated generic public-link copy was renamed to `Copy Public Shop Face Link` / `Copy Public Shop Link`
  - the ordinary spotlight launcher now reads `Open Spotlight Publisher`
  - the Vault purchase/setup card now reads more clearly as selective private access instead of a second public gallery
  - `Verify shop` now reads `TrustSlip verification`, with `Visitor verification` and `Open public verification`
  - the picture/gallery section now reads as the public shop face rather than a generic gallery
  - the lower Vault area now reads `Private Vault access`, with `Public shelf products`, `Private Vault offers`, `Copy Vault link`, and `Open Vault link`
- `ShopGalleryPage` now speaks more clearly as the public shop face:
  - fallback copy now says the public shop face is public while private Vault offers need a trust link
  - confidence and helper text now consistently distinguish `public shelf` from `private Vault`
  - public-share/copy notices now explicitly say `Public shop`
  - the Vault request path now asks for a `private Vault access link`
  - signed-in helper text now describes protected routes as returns back into GSN rather than internal shop controls
  - the Vault explainer and empty-state copy now more clearly tell the visitor that private items require a separate access link from the owner
- `CommunityShopControlPanel` and `MarketplaceWorkspacePage` were also brought onto the same language:
  - Community Home's owner launcher now says `Open Public Shop Face` and `Private Vault Access`
  - Marketplace Workspace now says `public shop` instead of older `shop-view` wording in its copy and copy/share actions
- This pass stayed frontend-only and wording-only. No backend rules, auth, schemas, or route contracts were changed.
- Verification passed:
  - `npm exec -- eslint src/pages/ShopControlPage.tsx src/pages/ShopGalleryPage.tsx`
  - `npm run build`

#### Open risks or unknowns
- This pass improves clarity, but it does not itself fix the broader jumpy-button reports on other pages.
- This pass does not fix live Render invite-link failures or already-issued stale links.
- Some internal success/error notices still use the older phrase `Vault viewing link`; those are operational notices rather than surface ownership language and can be normalized later if needed.

#### Next recommended step
- Continue the same low-risk deep-cleaning pass on the remaining outward-link surfaces so Marketplace remains the community link desk, Shop Control remains owner backstage, and public-facing links remain clearly separated from Vault/private access.
- Keep the next verification focused on phone tap behavior and public/share/back buttons while outside testing continues.

#### Date
2026-04-24

#### Workstream
Dashboard friction cleanup plus Marketplace link-lane separation and button tightening.

#### Routes/screens affected
- `/app/dashboard`
- `/app/marketplace`
- `/app/marketplace-workspace`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/MarketplacePage.tsx`
- `frontend/src/pages/MarketplaceWorkspacePage.tsx`

#### Confirmed facts
- Dashboard avatar upload was using raw `FileReader` storage only, which made large phone photos vulnerable to silent local-storage failure. The dashboard now prepares a lighter image before saving, keeps the current-session preview even if storage fails, resets the input cleanly, and shows a visible success/error note under the profile block.
- Dashboard attention-guide behavior now respects a quiet window after dismissal or action. That quiet window is route-local in the dashboard and reduces repeated interruption during testing without changing backend logic or touching the frozen Market Wisdom section.
- The phone presentation of the `Trust is the first currency` block was tightened so `Visible. Portable. Usable.` sits on its own centered line with more width, making it less likely to disappear on narrow phones.
- Marketplace action buttons were tightened further by reducing the section-toggle delay from `24ms` to `12ms`, extending pointer capture guards to click-capture on pointer-only controls, and hardening the shared Marketplace button style with stronger mobile button traits (`touchAction`, `WebkitAppearance`, isolation, z-index, and pointerEvents).
- Marketplace now separates link lanes more clearly for testing:
  - WhatsApp join link = enter this exact community
  - GSN create link = start a new community
  - Marketplace view link = public marketplace face
  - Shop view link = public storefront
  - controlled links = vault/private outward access
- Marketplace labels and helper copy now explain that create and join are different actions and should not be treated as the same link.
- `MarketplaceWorkspacePage` also received a smaller button-style tightening pass so its access-desk buttons behave more like the hardened Marketplace controls.
- Frontend verification passed:
  - `npm exec -- eslint src/pages/DashboardPage.tsx src/pages/MarketplacePage.tsx src/pages/MarketplaceWorkspacePage.tsx`
  - `npm run build`
- ESLint still reports only the same 2 existing `MarketplacePage.tsx` hook-dependency warnings and no new errors.

#### Open risks or unknowns
- This pass improves local/frontend behavior but does not itself fix already-issued stale join links on live Render. Fresh links still need to be generated after the invite-link backend fix is live.
- The broader request to make other domains visually match the more institutional dashboard profile block is still open.
- Wider shop/vault/view link auditing across every outward path is still incomplete; this pass focused on Marketplace’s public/tester-facing link desk first.

#### Next recommended step
- Retest Marketplace on phone first: section toggles, join/create/public-marketplace/public-shop buttons, and WhatsApp send buttons.
- If that feels materially steadier, deploy this frontend pass so testers can continue, then audit the remaining outward links (`vault`, `shop gallery`, and other controlled-access links) from the same one-place testing mindset.

#### Date
2026-04-24

#### Workstream
Community and shop button-stability pass.

#### Routes/screens affected
- `/app/community`
- `/app/marketplace`
- Community shop-control panel surfaces launched from Community Home
- `/app/shop-control`
- `/shop/:gmfnId`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/pages/MarketplacePage.tsx`
- `frontend/src/components/CommunityShopControlPanel.tsx`
- `frontend/src/pages/ShopControlPage.tsx`
- `frontend/src/pages/ShopGalleryPage.tsx`

#### Confirmed facts
- The main button instability pattern on these surfaces was not button size alone; the pages were mixing pointer-down guards with click-time actions, which left room for taps to bubble into parent cards and feel jumpy on mobile.
- The shared guard props on Community Home, Marketplace, Shop Control, Shop Gallery, and the Community Shop Control panel now also stop propagation during `onClickCapture`, so button taps are intercepted earlier before parent surfaces can react.
- The open/collapse controls on Community Home, Marketplace, Shop Control Spotlight, and the Community Shop Control panel no longer wait the old ~90ms delay; those waits were reduced to 24ms so taps feel more immediate while still giving React time to settle state changes.
- This pass stayed route-local and did not change backend contracts, permissions, schemas, or global navigation.
- Frontend verification passed:
  - `npm exec -- eslint src/pages/CommunityHomePage.tsx src/pages/MarketplacePage.tsx src/pages/ShopControlPage.tsx src/pages/ShopGalleryPage.tsx src/components/CommunityShopControlPanel.tsx`
  - `npm run build`
- ESLint still reports only the same 2 existing `MarketplacePage.tsx` hook-dependency warnings and no new errors.

#### Open risks or unknowns
- This pass should reduce misfires and bubbling-based jumps, but it does not yet address every dashboard complaint the user listed, including the profile-picture save issue, the repeating attention guide, or the missing `Visible. Portable. Usable.` line.
- This pass does not fix the remaining live invite-link failure reports on Render.
- Additional jumpy-button cleanup may still be needed on pages outside this community/shop cluster after the next live test round.

#### Next recommended step
- Re-test the main community/shop flow on phone first:
  - Community Home open/collapse buttons
  - Marketplace section toggles and action buttons
  - Shop Control spotlight and vault buttons
  - Shop Gallery back/share/private-access buttons
- After that, tackle the next highest-friction live issues in order: invite-link reliability on Render, dashboard profile-picture persistence, and the attention-guide noise.

### Previous update

#### Date
2026-04-24

#### Workstream
Spotlight and shop-surface route-purpose cleanup.

#### Routes/screens affected
- `/app/marketplace`
- `/app/shop-control`
- `/shop/:gmfnId`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/MarketplacePage.tsx`
- `frontend/src/pages/ShopControlPage.tsx`
- `frontend/src/pages/ShopGalleryPage.tsx`

#### Confirmed facts
- Marketplace, Shop Control, and Shop Gallery were already functionally distinct, but Spotlight and shop-facing copy still leaked backstage language into the public shop and blurred owner-vs-live-community responsibility.
- Marketplace outward-link copy now reads more plainly:
  - controlled-link note now says links are issued as `approved live links`
  - outward-link explainer now says `public shop view` and `controlled private-access links`
  - Marketplace button now says `Open Owner Shop Control`
- Shop Control now speaks more clearly as the owner-side Spotlight publisher:
  - paid spotlight helper now says this is about priority in `community-facing visibility`
  - button now says `Open Spotlight Backstage`
  - spotlight section label now says `Spotlight publisher`
  - live state copy now says `Current live spotlight`
  - live-route buttons now say `Open public shop face` and `Copy public shop link`
  - mode buttons now say `Free community spotlight` and `Paid priority spotlight`
- Shop Gallery now speaks more clearly as the public-facing live-promo surface:
  - fallback title now says `Live Spotlight`
  - top card label now says `Community Spotlight`
  - badge now says `Live community promo`
  - helper line now says `Open the shop behind the current live spotlight item`
  - no-image fallback now says `Live community promo is active here...`
- Frontend verification passed:
  - `npm exec -- eslint src/pages/MarketplacePage.tsx src/pages/ShopControlPage.tsx src/pages/ShopGalleryPage.tsx`
  - `npm run build`
- ESLint still reports only the same 2 existing `MarketplacePage.tsx` hook-dependency warnings and no new errors.

#### Open risks or unknowns
- This pass still does not address the broader jumpy-button complaints.
- This pass does not change live Render deployment or the remaining live invite-link failure reports.
- More overlap may still remain in dashboard-to-marketplace guidance and in some community-home launch language around shop/spotlight work.

#### Next recommended step
- Return to the button-stability pass on the main and inner community/shop surfaces, then continue any remaining wording cleanup only where user testing still shows route-purpose confusion.

### Previous update

#### Date
2026-04-24

#### Workstream
Marketplace owner-tool alignment cleanup.

#### Routes/screens affected
- `/app/marketplace-workspace`
- shop control panel surfaces launched from Community Home / Marketplace
- `/app/shop-control`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/MarketplaceWorkspacePage.tsx`
- `frontend/src/components/CommunityShopControlPanel.tsx`
- `frontend/src/pages/ShopControlPage.tsx`

#### Confirmed facts
- Marketplace Workspace, the Community Shop Control panel, and Shop Control were already separate screens, but some wording still made them sound like partial duplicates of Marketplace.
- Marketplace Workspace now speaks more clearly as the one-community access desk:
  - top subtitle now says `Owner-side links, visibility, and member-to-shop mapping for one community`
  - helper copy now says Marketplace is the one-community `operating surface`
  - fallback copy now refers to `owner-side invite, alert, member, and shop-facing visibility tasks`
  - launcher buttons now say `Open Marketplace` and `Community List`
- Community Shop Control panel now speaks more clearly as the owner launcher / owner desk:
  - loading fallback now says Community Home launches the `owner shop desk`
  - default helper line now says `Use this owner desk to prepare the one shop here, then let Marketplace carry the live community-facing side`
  - badge now says `Owner launcher`
  - handoff button now says `Open Community Marketplace`
  - owner-shortcuts helper now points to Marketplace as the live community-facing activity and outward-link surface
- Shop Control now speaks more clearly as owner backstage:
  - top subtitle now says `Owner backstage for your one GSN shop`
  - top nav label now says `Public Shop Face`
  - nav return label now says `Community Marketplace`
  - action buttons now say `Open Public Shop` and `Open TrustSlip`
  - fallback control-status button now also says `Open Public Shop`
- Frontend verification passed:
  - `npm exec -- eslint src/pages/MarketplaceWorkspacePage.tsx src/components/CommunityShopControlPanel.tsx src/pages/ShopControlPage.tsx`
  - `npm run build`

#### Open risks or unknowns
- This pass improves route-purpose clarity only. It does not address the broader jumpy-button complaints yet.
- This pass does not resolve the live join-link / expired-link problem on Render.
- More overlap may still remain in Spotlight and other shop-operating copy deeper inside Marketplace and Shop Control.

#### Next recommended step
- Continue the same low-risk cleanup through Spotlight and the remaining shop-operating surfaces so Marketplace owns live community/shop activity, while Community Home and Shop Control stay owner-launcher / backstage only.

### Previous update

#### Date
2026-04-24

#### Workstream
Community Home vs Marketplace route-purpose cleanup.

#### Routes/screens affected
- `/app/community`
- `/app/marketplace`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/pages/MarketplacePage.tsx`

#### Confirmed facts
- Community Home and Marketplace were already functionally separate, but some owner-launcher and intro copy still blurred page ownership.
- Community Home was still using phrases like `live work` and `Go To Marketplace Links`, which made it sound like it partly owned Marketplace internals.
- Marketplace still needed stronger wording that it is the one-community operating surface, not the combined group index.
- This pass tightened only route-purpose wording and launcher labels:
  - Community Home now speaks more clearly as the cross-community chooser and owner surface.
  - Marketplace now speaks more clearly as the one-community operating surface.
  - Community Home owner launchers now say `Owner actions from Community Home`, `Open Marketplace Links`, and `Open Selected Marketplace`.
  - Marketplace empty state now says no community is active yet and points users back to Community Home first.
  - Marketplace route wording now favors `Marketplace actions` and `See this in Finance` rather than making Finance look like a local sub-widget.
- Frontend verification passed:
  - `npm exec -- eslint src/pages/CommunityHomePage.tsx src/pages/MarketplacePage.tsx`
  - `npm run build`
- ESLint still reports the same 2 existing `MarketplacePage.tsx` hook-dependency warnings and no new errors.

#### Open risks or unknowns
- This pass does not resolve the broader jumpy-button complaints yet.
- This pass does not change the live Render deployment or the remaining invite-link deployment gap.
- More overlap may still remain in deeper owner-tool surfaces such as Shop Control, workspace, and spotlight controls.

#### Next recommended step
- Continue the same low-risk cleanup pattern through the remaining owner-tool surfaces that sit between Community Home and Marketplace.
- After that, return to the broader button-stability pass so outside testing is less blocked by tap instability.

#### Date
2026-04-24

#### Workstream
Join invite recovery + dashboard testing blocker stabilization.

#### Routes/screens affected
- `/start/join/:code`
- `/app/dashboard`

#### Backend routes/endpoints involved
- `GET /clans/join-invite/preview`

#### Files in play
- `gmfn_backend/app/api/routes/clans.py`
- `gmfn_backend/tests/test_join_requests.py`
- `frontend/src/pages/DashboardPage.tsx`

#### Confirmed facts
- Join preview previously accepted only `ClanInvite.code` as a live outward link. Older shared links that still carried legacy `Clan.invite_code` could reach the join page but be blocked at preview with the red `Fresh invite link needed` state before the user could continue.
- `preview_join_invite` now recovers from a legacy `Clan.invite_code`:
  - if a newer usable `ClanInvite` exists for that community, preview returns that live invite
  - if no live `ClanInvite` exists but the legacy clan invite is still valid, preview returns a ready state instead of a hard failure
- Backend verification passed:
  - `python -m pytest gmfn_backend/tests/test_join_requests.py -q` -> `11 passed`
  - `python -m py_compile gmfn_backend/app/api/routes/clans.py`
- Dashboard avatar persistence issue was confirmed to be a storage-key transition problem:
  - uploads were stored under a visitor-scoped local-storage key before `me` finished loading
  - once the signed-in identity resolved, the dashboard read from a user-scoped key and the just-uploaded picture appeared to disappear
  - dashboard now migrates the visitor avatar into the signed-in scoped key on first identity resolution
- Dashboard attention interference was reduced:
  - the floating `Attention Guide` reminder pill now stays hidden after dismissal until the guide is actually due to show again
- The phone version of the `Visible. Portable. Usable.` slogan in the `Trust is the first currency` profile header was tightened so it can wrap instead of disappearing on narrow screens.
- Frontend verification passed:
  - `npm exec -- eslint src/pages/DashboardPage.tsx`
  - `npm run build`

#### Open risks or unknowns
- These fixes are local until explicitly deployed.
- Already-shared stale links may still keep failing until a fresh join link is generated from the updated live app.
- General jumpy-button complaints across deeper pages are not fully resolved in this pass. This pass only removed one likely dashboard interference source.

#### Next recommended step
- Deploy this safe blocker-fix set, then generate one fresh join link and retest on phone/WhatsApp.
- After that, continue the broader button-stability pass on the inner pages where testing is still being blocked.

#### Date
2026-04-24

#### Workstream
Marketplace workspace / Shop Control / Shop Gallery strategic separation continuation.

#### Routes/screens affected
- `/app/marketplace-workspace`
- `/app/shop-control`
- `/app/shop/:gmfnId`

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/MarketplaceWorkspacePage.tsx`
- `frontend/src/pages/ShopControlPage.tsx`
- `frontend/src/pages/ShopGalleryPage.tsx`

#### Confirmed facts
- Marketplace workspace now reads more clearly as a one-community access desk rather than a second Marketplace:
  - `Community Access` -> `Community Access Desk`
  - route-handoff copy now says this desk does not replace Marketplace
  - handoff buttons now favor `Return to Marketplace` / `Open Community Home`
- Shop Control now reads more clearly as owner backstage rather than a public or mixed workspace:
  - `Shop Control` -> `Owner Shop Control` / `Shop Owner Control`
  - top subtitle now explicitly says the public Shop Gallery stays visitor-facing
  - the top launcher now says `Public Shop`, and it is disabled when no public link exists yet
  - top helper copy now says `Use this owner page...`
- Shop Gallery now reads more clearly as the outward public shop face:
  - protected return paths now say `Community Home`, `Community Marketplace`, and `Owner Shop Control`
  - the viewer guidance now explains that this page remains the public shop face even when a member is signed in
  - buyer-facing action labels now say `Ask seller privately`, `Share public shop`, and `Copy public link`
  - the confidence headline now says `Public shop front`

#### Open risks or unknowns
- This was a copy/ownership pass only. It does not solve the separate invite-link deployment/retest problem by itself.
- `ShopControlPage.tsx` and `ShopGalleryPage.tsx` still contain broader local visual/tap-target work from earlier sessions; this checkpoint only records the route-boundary refinements added in this pass.
- Further visual harmonization may still be needed if the product owner wants these pages to inherit more of the dashboard profile-block institutional color mood.

#### Verification
- `npm exec -- eslint src/pages/MarketplaceWorkspacePage.tsx src/pages/ShopControlPage.tsx src/pages/ShopGalleryPage.tsx` passed.
- `npm run build` in `frontend/` passed.

#### Next recommended step
- Continue with a deeper route-boundary cleanup of any remaining duplicate or blurred CTA language between:
  - Marketplace
  - Marketplace workspace
  - Shop Control
  - Shop Gallery
- After that, do a phone-first pass specifically on the public join-link retest and the public shop navigation/tap behavior.

#### Date
2026-04-24

#### Workstream
Community Home vs Marketplace strategic separation pass, with read-only parallel audits to confirm remaining wording overlap.

#### Routes/screens affected
- `/app/community`
- `/app/marketplace`
- Community Home embedded owner shop-control launcher panel

#### Backend routes/endpoints involved
- None changed in this pass.

#### Files in play
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/pages/MarketplacePage.tsx`
- `frontend/src/components/CommunityShopControlPanel.tsx`

#### Confirmed facts
- Community Home is now phrased more clearly as the cross-community owner/index surface:
  - launcher wording now leans toward handoff language such as entering Marketplace rather than sounding like Home owns live marketplace work
  - finance/trust wording now reads as wider cross-community records
  - spotlight wording now reads as owner spotlight status on Home, with preparation in Shop Control and live visibility meeting the selected community in Marketplace
- The embedded shop panel on Community Home now reads more clearly as one-shop owner work:
  - `Owner shop control`
  - `Community Home launcher`
  - `One-shop owner work`
  - `Open Selected Community Marketplace`
- Marketplace copy was tightened to reinforce that Community Home chooses the group first and Marketplace runs one-community work after that.
- Marketplace’s no-community-selected state was reduced to the correct handoff surface instead of acting like a generic app launcher. It now mainly sends the user back to Community Home or Dashboard rather than offering multiple unrelated domain jumps before a community is chosen.
- Two read-only parallel audits agreed that the main remaining blur is wording/launcher overlap, not backend business logic confusion.

#### Open risks or unknowns
- Community Home still contains many launchers by design, so further tightening may still be needed if the product owner wants an even stricter owner/index feel.
- `MarketplacePage.tsx` still has two pre-existing React hook dependency warnings unrelated to this pass.
- Broader duplication/button-tightening work across other domains is still outstanding.

#### Verification
- `npm exec -- eslint src/pages/CommunityHomePage.tsx src/pages/MarketplacePage.tsx src/components/CommunityShopControlPanel.tsx`
  passed with only 2 pre-existing warnings in `MarketplacePage.tsx`.
- `npm run build` in `frontend/` passed.

#### Next recommended step
- Continue the same strategic-alignment pass on the next highest-overlap surfaces:
  - `frontend/src/pages/MarketplaceWorkspacePage.tsx`
  - `frontend/src/pages/ShopControlPage.tsx`
  - `frontend/src/pages/ShopGalleryPage.tsx`
- Keep the same rule: Community Home = owner/index across communities, Marketplace = one-community operating surface, Shop Control = one-shop owner preparation, Shop Gallery = outward visitor-facing surface.

#### Date
2026-04-23

#### Workstream
Join-link stabilization for phone/WhatsApp sharing, plus institutional surface alignment across Finance/Trust/Loans inner pages.

#### Routes/screens affected
- `/start/join/:code`
- `/app/clans`
- Shared join-link generation used by Community Home / Marketplace / Workspace invite surfaces
- `/app/finance`
- `/app/trust-score`
- `/app/loans`
- `/app/loan-readiness`
- `/app/loan-suggestions`
- `/app/loan-workbench`
- `/app/loan-summary`
- `/app/repayment`
- `/app/revenue-allocation`
- `/app/borrower-preflight`
- `/app/loan-decision`
- `/app/guarantor-inbox`
- `/app/guarantor-earnings`

#### Backend routes/endpoints involved
- `POST /clans/{clan_id}/invite`
- `GET /clans/{clan_id}/invite-link`
- `GET /clans/join-invite/preview`
- `POST /clans/join-requests`

#### Files in play
- `frontend/src/lib/joinLinks.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/pages/JoinEntryPage.tsx`
- `frontend/src/pages/ClansPage.tsx`
- `frontend/src/lib/institutionalSurface.ts`
- `frontend/src/pages/FinancePage.tsx`
- `frontend/src/pages/TrustScorePage.tsx`
- `frontend/src/pages/LoansPage.tsx`
- `frontend/src/pages/LoanReadinessPage.tsx`
- `frontend/src/pages/LoanSuggestionsPage.tsx`
- `frontend/src/pages/LoanWorkbenchPage.tsx`
- `frontend/src/pages/LoanSummaryPage.tsx`
- `frontend/src/pages/RepaymentPage.tsx`
- `frontend/src/pages/RevenueAllocationPage.tsx`
- `frontend/src/pages/BorrowerPreflightPage.tsx`
- `frontend/src/pages/LoanDecisionPage.tsx`
- `frontend/src/pages/GuarantorInboxPage.tsx`
- `frontend/src/pages/GuarantorEarningsPage.tsx`
- `gmfn_backend/app/api/routes/clans.py`

#### Confirmed facts
- The join-entry red failure state is shown when `GET /clans/join-invite/preview` returns `valid: false`.
- Generated join links now carry the invite code in both places:
  - path: `/start/join/:code`
  - query: `?invite=:code`
  This makes phone/chat copying more resilient.
- Generated join links now also carry `community_code`, `community_name`, `marketplace_name`, and `inviter_name` so the join screen keeps context when phones open the link.
- `ClansPage` no longer falls back to stale selected-community data if fresh invite creation fails. It now fails safe instead of packaging an old-looking link.
- `GET /clans/{clan_id}/invite-link` now creates a live `ClanInvite` whenever no usable live invite exists, instead of drifting back to legacy outward invite sharing.
- `GET /clans/join-invite/preview` now self-heals a known stale invite when the code resolves to the same community but the specific invite is inactive, expired, or usage-limited and a newer live invite already exists for that community.
- The preview route does **not** auto-recover a completely unknown code just from `community_code`. This is intentional because `community_code` is predictable and should not become a substitute secret for invite access.
- Finance/Trust/Loans inner pages now use a shared institutional surface helper instead of the older faded-paper styling. The goal is visual parity with the stronger dashboard profile-block quality without touching the frozen Market Wisdom area.

#### Open risks or unknowns
- Already-shared dead links that contain a completely unknown code may still need to be resent after deploy. The new logic heals stale known invites, but it does not guess a community from `community_code` alone.
- `frontend/src/lib/api.ts` still has unrelated pre-existing ESLint `no-empty` and unused-variable issues elsewhere in the file. The build still passes, but a full-file lint clean-up was not part of this invite fix.
- Community Home / Marketplace / Workspace pages still need their broader duplication/button tightening audit, but the invite-generation foundation is now safer.

#### Verification
- `python -m py_compile gmfn_backend/app/api/routes/clans.py` passed.
- `npm run build` in `frontend/` passed after the invite-link changes.
- `npm exec -- eslint ...` on the touched frontend invite/institutional files passed with warnings only on existing hook-dependency issues in:
  - `GuarantorInboxPage.tsx`
  - `LoanSuggestionsPage.tsx`
  - `LoanSummaryPage.tsx`
  - `LoanWorkbenchPage.tsx`
  - `TrustScorePage.tsx`
- A separate lint run that included `src/lib/api.ts` still reported pre-existing file-wide issues not introduced by this patch:
  - empty block statements
  - one unused `_payload` variable

#### Next recommended step
- Deploy both backend and frontend so the repaired invite format and recovery logic reach Render.
- After deploy, open GSN and send one newly generated join link from the current app state, then retest on phone/WhatsApp.
- If the link still fails after a fresh resend, capture the exact shared URL so the next session can tell whether the failure is path loss, query loss, host mismatch, or stale frontend cache.

#### Date
2026-04-23

#### Workstream
Spotlight pilot freeze and shared control points.

#### Routes/screens affected
- `/app/community-home`
- `/app/dashboard`
- `/app/marketplace`
- `/app/shop-control`
- `/shop/:gmfnId`

#### Backend routes/endpoints involved
- `POST /marketplace/broadcasts`
- `GET /marketplace/broadcasts`
- `POST /marketplace/media/video`
- `POST /marketplace/media/image`

#### Files in play
- `frontend/src/lib/spotlightPilot.ts`
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/ShopControlPage.tsx`
- `frontend/src/pages/ShopGalleryPage.tsx`
- `frontend/src/components/CommunityMarketplaceSpotlight.tsx`
- `frontend/src/components/SpotlightMediaFrame.tsx`
- `frontend/src/lib/spotlightMediaPrep.ts`
- `gmfn_backend/app/api/routes/marketplace.py`
- `gmfn_backend/app/api/routes/marketplace_media.py`

#### Confirmed facts
- The live pilot spotlight process is intentionally open for testing so the
  product owner can load many spotlights and watch image/video rotation.
- A shared frontend pilot control file now owns the test values:
  `SPOTLIGHT_PILOT_REFRESH_MS`, `SPOTLIGHT_PILOT_ROTATION_MS`,
  `SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS`, `SPOTLIGHT_MAX_IMAGE_BYTES`, and
  `SPOTLIGHT_MAX_VIDEO_BYTES`.
- Community Home, Dashboard, Shop Gallery, Shop Control, and the marketplace
  spotlight component now read the rotation/video cap from that shared file
  instead of carrying scattered hard-coded values.
- The backend quota bypass remains deliberately isolated in
  `gmfn_backend/app/api/routes/marketplace.py` through
  `SPOTLIGHT_CAPACITY_PILOT_OVERRIDE_ENABLED`.
- The backend video media ceiling remains 15 MB in
  `gmfn_backend/app/api/routes/marketplace_media.py`, with a 10-second
  duration rule when the frontend supplies a duration.
- The Dashboard Market Wisdom frozen area was not changed.

#### Open risks or unknowns
- The pilot quota override should be restored after testing by switching the
  backend quota flag back to normal enforcement.
- The 30-second rotation/refresh cadence is for pilot visibility. If production
  needs slower spotlight movement, change it in `frontend/src/lib/spotlightPilot.ts`.
- Existing local SQLite spotlight row revival was a local pilot-data action
  only; Render needs its own live data state.

#### Verification
- `npm exec -- eslint src/lib/spotlightPilot.ts src/pages/CommunityHomePage.tsx src/pages/ShopControlPage.tsx src/pages/DashboardPage.tsx src/pages/ShopGalleryPage.tsx src/components/CommunityMarketplaceSpotlight.tsx src/components/SpotlightMediaFrame.tsx`
  passed with only two pre-existing Shop Control hook dependency warnings.
- `python -m compileall gmfn_backend\app\api\routes\marketplace.py gmfn_backend\app\api\routes\marketplace_media.py`
  passed.
- `npm run build` in `frontend/` passed.

#### Next recommended step
- Continue testing spotlight uploads and rotation. If the owner confirms it is
  stable, move next to Vault testing and paid subscription testing while
  leaving the spotlight pilot controls frozen.

#### Date
2026-04-22

#### Workstream
Dashboard phone portrait frame and Community Home tool direction.

#### Routes/screens affected
- `/app/dashboard`

#### Backend routes/endpoints involved
- None changed. This is frontend-only dashboard presentation and guidance.

#### Files in play
- `frontend/src/pages/DashboardPage.tsx`

#### Confirmed facts
- Testers reported that dashboard profile/DP photos crop poorly on shorter
  phones, especially heads and necks in portrait-style images.
- The dashboard phone DP frame height was increased from `146px` to `188px`
  while keeping the existing frame design and upload behavior.
- Dashboard guidance now states that Community Home is where the working tools
  live: invite people, choose a community, manage shop, prepare spotlight, and
  enter the marketplace from the right context.
- The Dashboard "Community Home" next-action item now uses the same tool-focused
  language and keywords.
- `npm run build` in `frontend/` passed after this change.

#### Open risks or unknowns
- Market Wisdom presentation and interaction model were not touched.
- More phone-photo tuning may still be needed if a tester uploads extreme
  close-crop photos; this change gives the frame more vertical room but does
  not introduce a crop editor.

#### Next recommended step
- Retest `/app/dashboard` on a short phone with a portrait photo and confirm
  that the first-look guide clearly sends users to Community Home for tools.

#### Date
2026-04-22

#### Workstream
Inner-page mobile tap tightening during live pilot testing.

#### Routes/screens affected
- Entry/public routes:
  `/create`, `/join`, `/start/join/:code`
- Main domain surfaces:
  `/app/community-home`, `/app/marketplace`
- Commerce inner pages:
  `/app/demand-box`, `/app/shop-gallery`, `/app/shop-assets`,
  `/app/shop-control`

#### Backend routes/endpoints involved
- None changed. This is frontend-only tap containment and tap-layer
  stabilization.

#### Files in play
- `frontend/src/pages/CreateEntryPage.tsx`
- `frontend/src/pages/JoinEntryPage.tsx`
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/pages/MarketplacePage.tsx`
- `frontend/src/pages/DemandBoxPage.tsx`
- `frontend/src/pages/ShopGalleryPage.tsx`
- `frontend/src/pages/ShopAssetsPage.tsx`
- `frontend/src/pages/ShopControlPage.tsx`

#### Confirmed facts
- Live testers continued to report buttons that felt jumpy on phone,
  especially inside commerce/community pages.
- Each affected page now has local button guard props that stop
  `pointerdown`, `touchstart`, and `mousedown` from leaking into nearby
  wrappers, cards, links, or overlays.
- Commerce button styles now keep their own stable tap layer where needed:
  isolated z-index, transparent mobile tap highlight, manipulation touch
  action, and no text selection.
- A guard-coverage check confirmed every local `type="button"` in the listed
  pages has a guard marker.
- `npm run build` in `frontend/` passed after this change.

#### Open risks or unknowns
- This does not change invite expiry, WhatsApp link generation, OTP/SMS,
  bank rails, loan lifecycle, trust-event generation, auth, or backend data.
- If testers still see jumps on a specific screen after deployment, inspect
  that screen for oversized clickable wrappers, fixed overlays, or browser
  chrome interference around the exact tap location.

#### Next recommended step
- Deploy this frontend batch, then retest phone taps on `/create`,
  `/start/join/:code`, `/app/community-home`, `/app/marketplace`,
  `/app/shop-control`, `/app/shop-assets`, `/shop/:gmfnId`, and
  `/app/demand-box`.

#### Date
2026-04-22

#### Workstream
System-level mobile tap stabilization during live pilot testing.

#### Routes/screens affected
- App shell controls on authenticated routes:
  `/app/*`
- Entry and public onboarding controls:
  `/create`, `/join`, `/start/join/:code`
- First-circle pilot route:
  `/app/build-first-circle`
- Notifications and money/borrowing/admin surfaces already under live test.

#### Backend routes/endpoints involved
- None changed. This is frontend-only tap containment and tap-highlight
  stabilization.

#### Files in play
- `frontend/src/layout/AppLayout.tsx`
- `frontend/src/components/OriginLink.tsx`
- `frontend/src/components/EntryControls.tsx`
- `frontend/src/pages/BuildFirstCirclePage.tsx`
- `frontend/src/pages/NotificationsPage.tsx`
- Borrowing route pages:
  `LoansPage.tsx`, `LoanReadinessPage.tsx`, `LoanSuggestionsPage.tsx`,
  `LoanWorkbenchPage.tsx`, `LoanSummaryPage.tsx`, `GuarantorInboxPage.tsx`,
  `GuarantorEarningsPage.tsx`, `RepaymentPage.tsx`
- Admin/money pages from the previous checkpoint.

#### Confirmed facts
- Live testers reported buttons opening the wrong places or showing a blue
  mobile tap rectangle that did not align with the visible button.
- Shared internal links now stop pointer/touch/mouse down propagation and carry
  stable mobile tap styling through `OriginLink`.
- App shell controls now also guard pointer/touch/mouse down: mobile Menu,
  Tools, drawer links, page-tool links, desktop side navigation, logout
  buttons, and bottom navigation.
- Entry action buttons now guard touch and mouse down in addition to pointer
  down.
- `npm run build` in `frontend/` passed after these changes.
- `git diff --check` only reports expected Windows LF-to-CRLF warnings.

#### Open risks or unknowns
- This does not change invite expiry, bank rails, OTP/SMS, auth, schemas,
  loan lifecycle rules, or trust-event rules.
- If testers still see jumps after deployment, the next suspect is a
  page-local overlay or an oversized clickable wrapper on the specific page.

#### Next recommended step
- Deploy this batch, then retest on phone: `/create`, `/start/join/:code`,
  `/app/build-first-circle`, mobile Menu/Tools, bottom nav, notifications, and
  the money/borrowing action buttons.

#### Date
2026-04-22

#### Workstream
Admin and money-route mobile tap stability during live pilot testing.

#### Routes/screens affected
- `/app/command-center/system-operations`
- `/app/command-center/bank-console`
- `/app/command-center/incomplete-loans`
- `/app/command-center/trust-analytics`
- `/app/community/:clanId/join-requests`
- `/app/payment-rails`
- `/app/payment/pool`
- `/app/withdrawal-instructions`

#### Backend routes/endpoints involved
- None changed. This is frontend-only tap stability on admin and money-route surfaces.

#### Files in play
- `frontend/src/pages/SystemOperationsPage.tsx`
- `frontend/src/pages/BankConsolePage.tsx`
- `frontend/src/pages/AdminIncompleteLoansPage.tsx`
- `frontend/src/pages/TrustAnalyticsPage.tsx`
- `frontend/src/pages/CommunityJoinRequestsPage.tsx`
- `frontend/src/pages/PaymentRailsPage.tsx`
- `frontend/src/pages/PaymentInstructionsPage.tsx`
- `frontend/src/pages/WithdrawalInstructionsPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- While external testers are active, the safest useful work is route-local
  tap stabilization and clarity support rather than changing bank, invite, or
  trust-event rules.
- Admin operations, Bank Console, join-request review, incomplete-loans,
  trust-analytics, and Money In/Money Out/payment-rails pages had polished
  button styles but did not yet carry the same mobile tap containment added to
  entry surfaces.
- Local action/link helpers now include stable mobile tap behavior:
  `touchAction: manipulation`, transparent tap highlight, stable z-index,
  isolated button layers, and no accidental text selection.
- `npm run build` in `frontend/` passed after this change.

#### Open risks or unknowns
- This does not certify bank rails, SMS/OTP, invite expiry, loan guarantees, or
  reconciliation logic. It only reduces mobile tap instability on these pages.
- If testers still report jumps on these pages, inspect page-level overlays and
  browser UI interference next.

#### Next recommended step
- Continue live testing. When ready to deploy this batch, retest the admin
  pilot monitor, Payment Rails, Money In, and Money Out buttons on phone.

#### Date
2026-04-22

#### Workstream
Entry and join lead-through tap stability during live pilot testing.

#### Routes/screens affected
- `/create`
- `/join`
- `/start/join/:code`
- Entry guide launcher surfaces used before public onboarding

#### Backend routes/endpoints involved
- None changed. This is frontend-only tap stability and interaction containment.

#### Files in play
- `frontend/src/components/EntryControls.tsx`
- `frontend/src/pages/CreateEntryPage.tsx`
- `frontend/src/pages/JoinEntryPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Live testers are opening GSN from WhatsApp/Render links on phones, where
  button taps have been reported as jumpy or landing outside the intended
  visible control.
- Entry and join surfaces now use stronger mobile tap controls:
  `touchAction: manipulation`, transparent tap highlight, stable z-index,
  isolated button layers, and pointer-down propagation guards on key action
  buttons.
- The shared entry guide launcher now guards pointer-down events so the guide
  button does not leak taps to surrounding surfaces.
- `npm run build` in `frontend/` passed after this change.

#### Open risks or unknowns
- This does not change invite expiry, create-entry backend behavior, phone
  verification rules, or bank/wallet verification rules.
- If testers still see page jumps after this deploy, inspect page-level fixed
  overlays and mobile browser UI behavior next.

#### Next recommended step
- Deploy this frontend change when ready, then retest `/create` Block 1/2/3
  buttons and `/start/join/:code` Request Form / Submit buttons on phone.

### Previous update

#### Date
2026-04-22

#### Workstream
Build First Circle mobile simplification and button stability.

#### Routes/screens affected
- `/app/build-first-circle`

#### Backend routes/endpoints involved
- None changed. This is route-local frontend UX cleanup only.

#### Files in play
- `frontend/src/pages/BuildFirstCirclePage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Tester screenshots showed repeated step guidance and unstable/jumpy tap
  behavior on the First Circle page.
- The duplicate `Simple path` block was removed because the hero progress card
  and Step 1/2/3 sections already explain the same sequence.
- Mobile Step 1 now uses one native role dropdown instead of a long field of
  role buttons. Desktop still keeps direct role buttons.
- First Circle button styles now include stable mobile tap behavior and guarded
  pointer propagation so taps stay attached to the visible button.
- `npm run build` in `frontend/` passed after this cleanup.

#### Open risks or unknowns
- This does not redesign the full First Circle workflow. It only removes
  repetition and tightens the current page.
- If testers still see jumps after deploy, inspect global layout overlays or
  browser back/forward UI interference next.

#### Next recommended step
- Deploy the latest frontend commit, open `/app/build-first-circle` on phone,
  and test role selection, add-person, collapse, include/remove, copy bundle,
  and reset buttons.

### Previous update

#### Date
2026-04-22

#### Workstream
WhatsApp-first public link audit and origin hardening.

#### Routes/screens affected
- Marketplace outward links: `/app/marketplace`, `/community/:clanId`
- Public shop/gallery links: `/shop/:gmfnId`
- Shop control Vault/public shop links: `/app/shop/*`, `/vault/:token`
- Community invite composer links
- TrustSlip public verification links: `/t/:code` and backend verify pages

#### Backend routes/endpoints involved
- Confirmed backend invite responses mostly expose public `share_link` values.
- Backend still also exposes `api_link` values for API use; frontend should not
  use those for WhatsApp/user-facing join links.

#### Files in play
- `frontend/src/lib/publicLinks.ts`
- `frontend/src/lib/share.ts`
- `frontend/src/pages/MarketplacePage.tsx`
- `frontend/src/pages/MarketplaceWorkspacePage.tsx`
- `frontend/src/pages/ClansPage.tsx`
- `frontend/src/pages/ShopControlPage.tsx`
- `frontend/src/pages/ShopGalleryPage.tsx`
- `frontend/src/pages/ShopAssetsPage.tsx`
- `frontend/src/pages/TrustSlipPage.tsx`
- `frontend/src/pages/TrustSlipVerifyPage.tsx`
- `frontend/src/pages/TrustScorePage.tsx`
- `frontend/src/components/CommunityShopControlPanel.tsx`

#### Confirmed facts
- Public/share links must not be built from the current browser origin during
  pilot testing. That leaks `localhost`, LAN addresses, or stale private
  origins into WhatsApp links.
- A shared public link helper now normalizes frontend links to the configured
  public frontend origin, falling back to `https://gmfn-frontend.onrender.com`.
- TrustSlip verification/QR links now normalize through the configured public
  API origin, falling back to `https://gmfn-api.onrender.com`.
- Marketplace, shop gallery, shop control, community invite composer,
  marketplace workspace, TrustSlip, and shared share helpers were moved to the
  public-link helper for outward links.
- Community invite packaging now synthesizes a public `/start/join/:code`
  fallback when a backend response has an invite code but no usable link.
- `npm run build` in `frontend/` passed after the link changes.

#### Open risks or unknowns
- Existing broken or already-expired invite codes still need a fresh invite;
  this patch prevents newly copied WhatsApp/public links from using the wrong
  origin, but it cannot revive a stale code.
- Some `window.location.origin` usages remain intentionally for API/media
  fetching and internal navigation. They are not public WhatsApp link builders.
- Backend `api_link` remains present for API consumers. Do not surface it as a
  human WhatsApp invite unless it is explicitly converted to a frontend share
  route first.

#### Next recommended step
- After deploy, regenerate the Aberdeen WhatsApp join link from Marketplace
  using `Create / Refresh`, then test it on a phone from WhatsApp. If it still
  fails, inspect the exact URL copied from the button and compare the invite
  code against backend invite preview.

### Previous update

#### Date
2026-04-22

#### Workstream
Join-entry invite precheck for live tester links.

#### Routes/screens affected
- `/start/join/:inviteCode`
- Join request form

#### Backend routes/endpoints involved
- `GET /clans/join-invite/preview`
- `POST /clans/join-requests`

#### Files in play
- `gmfn_backend/app/api/routes/clans.py`
- `gmfn_backend/tests/test_join_requests.py`
- `frontend/src/lib/api.ts`
- `frontend/src/pages/JoinEntryPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- A live tester reached the join request form, filled details, and only then
  saw that the invite link was no longer valid or had not copied fully.
- The join page now checks the invite code before the tester fills the form.
- If the invite is missing, expired, inactive, over-used, or not found, the
  form is blocked and the user is told to ask for a fresh GSN invite link.
- Valid invite links still allow the normal join-request submission flow.
- Backend tests now cover both a ready invite preview and an invalid invite
  preview without forcing a failed form submission first.

#### Open risks or unknowns
- This does not bypass invite security or recover a broken invite. It only
  prevents wasted form filling and explains the recovery action earlier.
- If a tester already has an old/broken link, they still need the latest join
  link from the inviter.

#### Next recommended step
After deploy, ask testers with failed join links to refresh or request the
latest GSN join link, then confirm the page shows the invite status before the
form is completed.

#### Date
2026-04-22

#### Workstream
Admin pilot intake monitor for live onboarding tests.

#### Routes/screens affected
- `/app/command-center/system-operations`
- Admin-only operational oversight surfaces

#### Backend routes/endpoints involved
- `GET /admin/pilot-intake`

#### Files in play
- `gmfn_backend/app/api/routes/admin.py`
- `gmfn_backend/tests/test_entry_create.py`
- `frontend/src/lib/api.ts`
- `frontend/src/pages/SystemOperationsPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Live testers are using the create-entry and join-entry flows from shared
  WhatsApp/Render links, so admin needs a simple way to see where people are
  getting stuck without manually querying the database.
- `GET /admin/pilot-intake` is admin-only and read-only. It summarizes recent
  create-entry phone verification records and recent community join requests.
- Create-entry rows are grouped into practical stages such as completed,
  ready-for-community, awaiting-bank-details, expired, or account-exists.
- Join-request rows are grouped by request status and activation readiness.
- The System Operations page now shows a Pilot intake monitor section with
  counts, next actions, recent create-entry tester cards, and recent join
  request cards.
- Backend coverage was added in `test_admin_pilot_intake_reports_completed_create_entry`.

#### Open risks or unknowns
- The monitor is intentionally a pilot surface, not a final analytics dashboard.
  It uses small recent samples and per-row summaries suitable for controlled
  testing.
- It does not change business rules, create new approvals, or mutate tester
  records.

#### Next recommended step
Use the monitor during live testing to identify whether a tester is blocked at
phone proof, bank/wallet details, community setup, join review, or activation.

#### Date
2026-04-22

#### Workstream
Create-entry recovery after Block 2 bank/wallet failure.

#### Routes/screens affected
- `/create`
- `/cover?entry=create` when it routes into create entry

#### Backend routes/endpoints involved
- `POST /entry/phone/start`
- `POST /entry/bank-details`
- `POST /entry/bank/verify`

#### Files in play
- `gmfn_backend/app/api/routes/entry.py`
- `gmfn_backend/app/api/routes/entry_verification.py`
- `gmfn_backend/tests/test_entry_create.py`
- `frontend/src/pages/CreateEntryPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- A live tester could complete the phone proof, hit trouble around Block 2
  bank/wallet details, then get stuck on retry with `Phone number already
  registered`.
- A second live tester could complete phone proof and community setup but not
  visibly progress into the app; a later retry showed the same registered-phone
  dead end.
- The safest intended behavior is not to let an unfinished founder entry become
  a dead end.
- `/entry/phone/start` now reopens an unconsumed, unexpired entry-phone session
  for the same phone and matching email/name instead of forcing the tester to
  start from zero.
- If the resumed session already has phone proof, the frontend moves directly
  back to Bank and wallet details.
- If the resumed session already has bank/wallet details, the frontend moves
  directly to Community setup.
- If the phone truly belongs to a completed `User`, the frontend now opens the
  existing-member guidance and tells the tester to sign in instead of creating
  another entry.
- Scotland, England, Wales, and Northern Ireland are normalized as GB for
  onboarding region checks, and the frontend bank-country helper now tells UK
  testers to use `United Kingdom` or `GB`.
- After a successful `/entry/create`, the frontend now stores the returned
  `clan_id` as the selected community before routing into
  `/app/build-first-circle`.
- If a mobile browser misses that first redirect and a retry reports
  `Phone number already registered`, `Email already registered`, or a used
  phone-verification session, the frontend now attempts to sign the tester in
  with the email and password they already entered, selects their created
  community, clears public entry state, and opens `/app/build-first-circle`.
- If recovery sign-in fails, the tester is guided to use `Already a member`
  and the helper can check the pilot intake monitor.
- This is a working-tree-only update. It has not been committed and has not
  been deployed to Render.

#### Verification
- `python -m compileall app\api\routes\entry.py app\api\routes\entry_verification.py` passed.
- `python -m pytest tests\test_entry_create.py -q` passed: 12 tests.
- `npm run build` passed in `frontend` after the completion-recovery patch.

#### Next recommended step
- Phone-test both failed create-entry paths: after a Block 2 issue it should
  resume to Bank and wallet details or Community setup; after a completed create
  retry it should recover into the app instead of trapping the tester on
  `Phone number already registered`.

### Previous update

#### Date
2026-04-22

#### Workstream
Public join form thinking-load reduction for controlled WhatsApp testing.

#### Routes/screens affected
- `/join`
- `/start/join/:code` when it lands in the public join form

#### Backend routes/endpoints involved
- `POST /clans/join-requests` unchanged

#### Files in play
- `frontend/src/pages/JoinEntryPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Product-owner feedback from a Nigeria tester showed the public join form
  still made testers think too much in early fields.
- The backend join-request payload still expects `business_name` as a string,
  so this pass keeps the backend contract unchanged.
- The country field is still a route-local select, but selecting a country now
  supplies the matching phone dial-code hint and pre-fills the phone field only
  when doing so will not overwrite an already-entered number.
- The previous open-ended `Work, business, or trade` text field is now guided
  by plain categories such as trader, service work, salary/civil-service work,
  farming, student/apprentice, home/family support, not working yet, and other.
- Optional work detail is still available when useful, and the frontend
  combines the category and detail back into the existing `business_name`
  string before submission.
- This is a working-tree-only update. It has not been committed and has not
  been deployed to Render.

#### Verification
- `npm run build` passed in `frontend`.

#### Next recommended step
- Phone-test the guided join form locally or after the next intentional Render
  deploy. If the choices feel right, include this with the next commit bundle.

### Previous update

#### Date
2026-04-22

#### Workstream
Public invite/join pilot correction and GSN real-life wedge language.

#### Routes/screens affected
- `/start/join/:code`
- `/cover?entry=invite`
- `/welcome?entry=invite`
- `/join`

#### Backend routes/endpoints involved
- `POST /clans/join-requests`
- `POST /clans/{clan_id}/invite`
- `GET /clans/{clan_id}/invite-link`

#### Files in play
- `gmfn_backend/app/api/routes/clans.py`
- `gmfn_backend/alembic/versions/20260422_add_join_request_activation_fields.py`
- `frontend/src/pages/JoinEntryPage.tsx`
- `gmfn_backend/tests/test_join_requests.py`
- `docs/PROJECT_PROTOCOL.md`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- A tester in Nigeria reached the public join form but received
  `Invitation not found` after submitting.
- Code inspection confirmed two invite-code sources:
  - newer package invite rows in `clan_invites.code`
  - older community invite codes in `clans.invite_code`
- Public join submission previously checked the older community invite code
  first, so a valid newer invite-link code could open the page but fail on
  submit.
- Public invite copy now follows the GSN wedge: existing community trust should
  become visible, recordable, useful proof that can support trade, lending,
  repayment, and stronger economic opportunity.
- `docs/PROJECT_PROTOCOL.md` now records the real-life institutional language
  standard so future work avoids cold textbook explanations.
- Added an idempotent migration for join-request activation delivery fields,
  because the model already used those fields and the join approval/status path
  can fail if the database has not been patched.

#### Verification
- `python -m compileall gmfn_backend\app\api\routes\clans.py gmfn_backend\alembic\versions\20260422_add_join_request_activation_fields.py` passed.
- `python -m pytest gmfn_backend\tests\test_join_requests.py gmfn_backend\tests\test_entry_create.py -q` passed: 12 tests.
- `npm run build` passed in `frontend`.
- `GMFN_DEV_MODE=1 python -m alembic upgrade head` passed locally and applied
  `20260422_add_join_request_activation_fields`.
- `git diff --check` passed for the touched files with only normal line-ending
  warnings.

#### Next recommended step
- Run targeted backend tests for join requests and frontend build. Then deploy
  so testers can retry the same WhatsApp invite path.

### Latest update

#### Date
2026-04-21

#### Workstream
Vault access backend contract and Shop Control wiring.

#### Routes/screens affected
- `/app/shop-control`
- `/vault/:token`

#### Backend routes/endpoints involved
- `POST /marketplace/shops/{shop_id}/vault-access-links`
- `GET /marketplace/shops/{shop_id}/vault-access-links`
- `POST /marketplace/vault-access-links/{link_id}/revoke`
- `POST /marketplace/vault-access-links/{link_id}/extend`
- `GET /marketplace/vault-access/{token}`
- `POST /marketplace/vault-access/{token}/open`

#### Files in play
- `gmfn_backend/app/api/routes/vault_access.py`
- `gmfn_backend/app/api/router.py`
- `gmfn_backend/alembic/versions/20260421_add_vault_access_links.py`
- `frontend/src/pages/ShopControlPage.tsx`
- `docs/HANDOFF_NOTES.md`
- `docs/ENDPOINT_AUDIT_2026-04-21.md`
- `docs/BACKEND_ADMIN_VAULT_COMPLETION_PROGRAM_2026-04-21.md`

#### Confirmed facts
- Vault had an existing model and service but no mounted API router.
- Added a route-local Vault access router under `/marketplace`.
- Added an idempotent migration for `vault_access_links`; it skips creation if
  the table already exists and uses PostgreSQL-safe boolean defaults.
- After Render failed the first `5c392d1` deploy during pre-deploy, the Vault
  migration was made more defensive: it now creates the Vault table without
  requiring `marketplace_shops` to already exist, and only adds the shop foreign
  key when that referenced table is present.
- `GET /marketplace/vault-access/{token}` resolves a Vault view without
  incrementing the view counter.
- `POST /marketplace/vault-access/{token}/open` records the open/view by using
  the existing service increment path.
- Shop Control now lists Vault links through the shared Vault API helper instead
  of the stale `/api/vault-access/links` path.
- Shop Control can create a 7-day/20-view private viewing link, copy/open it,
  extend it by 7 days, and revoke it.
- No Vault trust event creation was added. No auth core, payment, ledger,
  TrustSlip, Dashboard Market Wisdom, or public Shop Gallery behavior changed.

#### Verification
- `python -m compileall app\api\router.py app\api\routes\vault_access.py app\services\vault_access_service.py` passed.
- `python -m alembic upgrade head` passed locally with `GMFN_DEV_MODE=1`.
- A fresh temporary SQLite migration from empty database to head passed and
  reached `20260421_add_vault_access_links`.
- Local OpenAPI now includes all six Vault access operations; local path count
  is `217`.
- `npm exec -- eslint src/pages/ShopControlPage.tsx` produced no errors; the
  page still has two pre-existing hook dependency warnings.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Render still needs a successful backend redeploy before live OpenAPI shows the
  Vault endpoints.
- Phone testing is needed for the new Shop Control Vault link buttons.
- Duplicate OpenAPI operation ID warnings remain from older trust/admin routes.

#### Next recommended step
- Push/deploy this change, then confirm live OpenAPI includes the six Vault
  endpoints and test: create Vault private product, create link in Shop Control,
  open `/vault/:token`, verify the private product appears, then revoke/extend.

### Previous update

#### Date
2026-04-21

#### Workstream
Shop Gallery quality extension across Vault, Spotlight, and Product Shelf.

#### Routes/screens affected
- `/shop/:gmfnId`
- `/app/shop/:gmfnId` through the existing redirect/public shop route

#### Backend routes/endpoints involved
- no backend contract changed
- no product loading, visibility, share, Vault, auth, payment, or schema logic changed

#### Files in play
- `frontend/src/pages/ShopGalleryPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Product owner asked to extend the new signpost quality to the remaining Shop
  Gallery blocks, especially the "vote" block, interpreted from previous
  context as the Vault/private-viewing block.
- Extended the accepted GSN public-shop visual language route-locally:
  - strengthened shared Shop Gallery surfaces with more controlled blue, gold,
    and pink brand patching
  - upgraded the Vault block into a dark GSN trust panel with private-viewing
    copy, gold trust accents, and a clearer owner-approval rail
  - refined Mini Spotlight into a premium media stage with the same institutional
    accent line and softened glass shell
  - upgraded the Product Blocks header into a `Public product shelf` surface
    rather than a plain white section
  - kept existing buttons, handlers, product fetching, Vault request behavior,
    and public-route behavior unchanged
- No Dashboard, Dashboard Market Wisdom, Community Home, Marketplace, backend,
  auth, schema, payment, or deployment configuration changed.

#### Verification
- `npm exec -- eslint src/pages/ShopGalleryPage.tsx` passed in `frontend`.
- `git diff --check -- frontend/src/pages/ShopGalleryPage.tsx` passed with only
  the normal Windows line-ending warning.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Phone review is needed to confirm the Vault panel feels premium and enticing,
  not too dark or heavy.
- The product cards themselves were not structurally changed in this pass; this
  was primarily a quality/unification pass across the remaining blocks.

#### Next recommended step
- Deploy/retest the public shop page on phone from top to bottom. Confirm the
  signpost, Vault block, Mini Spotlight, and Product Shelf now feel like one
  coherent GSN public shop experience.

### Previous update

#### Date
2026-04-21

#### Workstream
Shop Gallery world-facing signpost upgrade.

#### Routes/screens affected
- `/shop/:gmfnId`
- `/app/shop/:gmfnId` through the existing redirect/public shop route

#### Backend routes/endpoints involved
- no backend contract changed
- no product loading, visibility, share, Vault, auth, payment, or schema logic changed

#### Files in play
- `frontend/src/pages/ShopGalleryPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Product owner accepted that the Shop Gallery signpost structure was stronger
  than before but said the visual language still did not feel award-level,
  worldwide, or institutionally distinctive enough.
- Outside design scan and two code-review agents pointed to the same direction:
  make the signpost feel like a GSN public shop passport/trade pass, not a
  decorative nested card or chip cloud.
- Reworked the public signpost presentation route-locally:
  - strengthened the surrounding brand field with deeper GSN navy, controlled
    blue, gold, and pink accents
  - renamed the signpost label to `GSN public shop`
  - turned the initials into a crest-like medallion
  - made the shop name sit on a stronger institutional identity plate
  - replaced the loose badge/chip cloud with a structured identity rail for
    GSN ID, Trust, Community, Contact, and Vault
  - kept `Share shop`, `Copy shop link`, contact, Vault, and product behavior
    unchanged
- No Dashboard, Dashboard Market Wisdom, Community Home, Marketplace, backend,
  auth, schema, payment, or deployment configuration changed.

#### Verification
- `npm exec -- eslint src/pages/ShopGalleryPage.tsx` passed in `frontend`.
- `git diff --check -- frontend/src/pages/ShopGalleryPage.tsx` passed with only
  the normal Windows line-ending warning.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Phone review is needed to confirm the stronger brand field feels more
  premium rather than too dark or too busy on the actual device.
- If the owner likes the identity rail but wants a different colour mood, the
  safe next adjustment is colour tuning only inside the signpost block; do not
  change handlers, product fetches, Vault logic, or public route behavior.

#### Next recommended step
- Deploy/retest the public shop link on phone and judge the signpost in the
  first screen: shop name strength, colour mood, identity rail readability,
  and whether it feels like a public-facing GSN trade pass.

### Previous update

#### Date
2026-04-21

#### Workstream
Shop Gallery product image clarity correction.

#### Routes/screens affected
- `/shop/:gmfnId`
- `/app/shop/:gmfnId` through the existing redirect/public shop route

#### Backend routes/endpoints involved
- no backend contract changed
- no product loading, visibility, share, Vault, auth, payment, or schema logic changed

#### Files in play
- `frontend/src/pages/ShopGalleryPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Product owner accepted the lighter mobile product-card direction but reported
  that the white/frost framing was reducing the clarity of the actual product
  photo, especially near the bottom information block.
- Removed the compact/mobile white image-wash overlay that sat over the product
  photo.
- Removed the compact/mobile `backdropFilter` blur from the bottom information
  dock so the product photo is no longer visually smudged behind/near the dock.
- Replaced the strong white image rim with a subtle GSN blue border and lighter
  shadow, preserving the lighter frame without whitening the product image.
- Made the bottom dock more solid/opaque so text remains readable without
  needing to blur or wash the photo behind it.
- Existing product IDs, API fetch flow, visibility filtering, public product
  recovery logic, and Share behavior were preserved.
- No Dashboard, Dashboard Market Wisdom, Community Home, Marketplace, backend,
  auth, schema, payment, or deployment configuration changed.

#### Verification
- `git diff --check -- frontend/src/pages/ShopGalleryPage.tsx` passed with only
  the normal Windows line-ending warning.
- `npm exec -- eslint src/pages/ShopGalleryPage.tsx` passed.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Phone review is needed to confirm product photos now look clear enough while
  the bottom information dock remains readable on bright images.
- The next product decision is what the small information area should carry:
  whether to keep the two status chips, merge them into one simpler label, or
  give that space a more useful buyer-facing cue.

#### Next recommended step
- Deploy/retest the public shop link on phone. First judge photo clarity near
  the bottom dock, then decide whether the `Storefront block` /
  `Community-visible` chips should be simplified.

### Previous update

#### Date
2026-04-21

#### Workstream
Shop Gallery mobile product-card colour balance.

#### Routes/screens affected
- `/shop/:gmfnId`
- `/app/shop/:gmfnId` through the existing redirect/public shop route

#### Backend routes/endpoints involved
- no backend contract changed
- no product loading, visibility, share, Vault, auth, payment, or schema logic changed

#### Files in play
- `frontend/src/pages/ShopGalleryPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Product owner accepted the new image-led product-card structure but reported
  that the dark frame/background felt too deep, heavy, and plastic against the
  lighter Shop Gallery page background.
- The colour pass keeps the one-screen poster structure from the previous
  checkpoint but changes compact/mobile colour hierarchy:
  - product card shell is now a lighter GSN white-blue surface with soft
    blue/gold/pink accents
  - image frame uses a pale institutional blue wash instead of a heavy navy
    stage
  - dark navy is retained only as controlled authority in shadows and the
    primary Share button
  - bottom product information dock is now frosted white-blue with dark navy
    text instead of dark glass
  - product image border and frame label were softened to make the photo feel
    larger and less boxed in
- Existing product IDs, API fetch flow, visibility filtering, public product
  recovery logic, and Share behavior were preserved.
- No Dashboard, Dashboard Market Wisdom, Community Home, Marketplace, backend,
  auth, schema, payment, or deployment configuration changed.

#### Verification
- `git diff --check -- frontend/src/pages/ShopGalleryPage.tsx` passed with only
  the normal Windows line-ending warning.
- `npm exec -- eslint src/pages/ShopGalleryPage.tsx` passed.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Phone review is still needed because the new light dock may need a minor tint
  adjustment depending on how it overlays very bright product photos.

#### Next recommended step
- Deploy/retest the public shop link on phone and compare product slots with
  both light and dark photos. If the structure is accepted but the dock needs
  more contrast, adjust only compact dock tint/text colours.

### Previous update

#### Date
2026-04-21

#### Workstream
Shop Gallery mobile product-card bank-standard polish.

#### Routes/screens affected
- `/shop/:gmfnId`
- `/app/shop/:gmfnId` through the existing redirect/public shop route

#### Backend routes/endpoints involved
- no backend contract changed
- no product loading, visibility, share, Vault, auth, payment, or schema logic changed

#### Files in play
- `frontend/src/pages/ShopGalleryPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- Product owner reported that the 12 public product cards still had too much
  white/empty space and did not yet feel bank-standard or close enough to the
  accepted GSN institutional direction.
- A route-local audit confirmed the mobile white-space problem came from the
  lower product information panel stretching below the image.
- Consultant/audit feedback agreed the spare mobile height should belong to
  the product image, not to a large lower text area.
- Compact/mobile product cards now behave as one sealed poster-style product
  frame: the product image fills the phone-panel area and the product name,
  status chips, description, price, and Share action sit in a compact frosted
  dock over the bottom of the image.
- The product share handler, product IDs, API fetch flow, visibility filtering,
  and recovered public product display logic were preserved.
- Removed four unused route-local Shop Gallery executive-image helper functions
  that were blocking a clean ESLint pass.
- No Dashboard, Dashboard Market Wisdom, Community Home, Marketplace, backend,
  auth, schema, payment, or deployment configuration changed.

#### Verification
- `git diff --check -- frontend/src/pages/ShopGalleryPage.tsx` passed with only
  the normal Windows line-ending warning.
- `npm exec -- eslint src/pages/ShopGalleryPage.tsx` passed.
- `npm run build` passed in `frontend`.

#### Open risks or unknowns
- Phone review is still needed to confirm the bottom information dock feels
  readable on very bright or very dark product photos.
- If the dock feels too dark on phone, the safe next adjustment is color/tint
  only inside the compact product-card dock; do not change product loading or
  share logic.

#### Next recommended step
- Deploy/retest `/shop/GMFN-U-9867079C` or the current public shop link on
  phone. Scroll through slots 1-12 and confirm each product reads as one
  premium frame, with less white space and steady Share taps.

### Previous update

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

### Shop Gallery institutional polish addendum

- Updated `frontend/src/pages/ShopGalleryPage.tsx` only.
- Preserved the restored product-loading logic and public shop route behavior.
- Replaced bare white Shop Gallery surfaces with the accepted calm
  institutional page wash: soft blue base, light pink/gold accents, and raised
  white-blue cards.
- Upgraded public product cards so the lower product information area no longer
  sits on a plain white strip:
  - product card shells now have stronger but calm institutional depth
  - product names are centered and can wrap to two lines
  - product descriptions now sit inside a contained raised description panel
  - price/share controls sit centered in the card footer
- Updated route-local badges and buttons to the same calm raised 3D language
  used in the recent Community Home / Marketplace polish, without changing
  global button behavior.
- No backend, auth, schema, payment, environment config, or Dashboard Market
  Wisdom behavior changed.

### Verification after Shop Gallery polish

- `git diff --check -- frontend/src/pages/ShopGalleryPage.tsx` passed with only
  the normal Windows line-ending warning.
- `npm run build` passed in `frontend`.

### Shop Gallery mobile identity compression addendum

- Updated `frontend/src/pages/ShopGalleryPage.tsx` only.
- Compressed the first public shop identity/signpost area for average phone
  screens after phone screenshots showed the identity block being split across
  two screenshots.
- Mobile Shop Gallery now treats a normal phone viewport as the yardstick for
  one major introduction/identity block:
  - removed the repeated explanation toggle inside the mobile signpost card
  - reduced duplicate owner/ID presentation where owner and GMFN ID are the same
  - moved the `Public shop identity` label into the mobile flow so it no longer
    overlaps the top chips
  - shortened top chips, shop description, signpost copy, avatar size, badges,
    and action buttons on compact screens
  - preserved desktop detail and route behavior
- Kept the calm institutional blue-white brand treatment from the accepted
  Shop Gallery polish. No backend, auth, schema, payment, environment config,
  or Dashboard Market Wisdom behavior changed.

### Verification after mobile identity compression

- `git diff --check -- frontend/src/pages/ShopGalleryPage.tsx` passed with only
  the normal Windows line-ending warning.
- `npm run build` passed in `frontend`.

### Shop Gallery mobile label removal addendum

- Updated `frontend/src/pages/ShopGalleryPage.tsx` only.
- Removed the decorative hero labels `Public shop identity`, `Visitor view`,
  and `Clean link` from the Shop Gallery identity area after phone review.
- Used the freed vertical space to pull the actual shop identity upward and
  tighten compact-screen padding/gaps so the first identity block fits closer
  to a normal phone-screen yardstick.
- Preserved the shop data, share/copy actions, product loading, Vault access
  flow, desktop detail, and the accepted institutional background treatment.
- No backend, auth, schema, payment, environment config, or Dashboard Market
  Wisdom behavior changed.

### Verification after mobile label removal

- `git diff --check -- frontend/src/pages/ShopGalleryPage.tsx` passed with only
  the normal Windows line-ending warning.
- `npm run build` passed in `frontend`.

### Shop Gallery share/repost and private viewing copy addendum

- Updated `frontend/src/pages/ShopGalleryPage.tsx` only.
- Confirmed backend truth before changing UI copy:
  - `Share shop` is a browser/native share action for the public shop page.
  - `Copy shop link` copies only the public shop URL.
  - real `repost` logic exists as a product-level backend action through
    `/marketplace/products/{product_id}/repost`; it is not the same as sharing
    or copying a shop link, and no fake shop-level repost button was added.
- Renamed route-local frontend handlers from `repostShop`/`repostProduct` to
  `shareShop`/`shareProduct` so local code no longer calls ordinary sharing a
  repost.
- Rewrote Vault/public-shop language into user-facing private-viewing wording:
  - removed `private stock` / `private warehouse` phrasing
  - presents selected offers as owner-approved private viewing by trust link
  - updates WhatsApp/Telegram/copy request text to ask for a private viewing
    link rather than "Vault access"
- No backend, auth, schema, payment, environment config, or Dashboard Market
  Wisdom behavior changed.

### Verification after private viewing copy update

- `git diff --check -- frontend/src/pages/ShopGalleryPage.tsx` passed with only
  the normal Windows line-ending warning.
- `npm run build` passed in `frontend`.

### Shop Gallery Vault branding and signpost polish addendum

- Updated `frontend/src/pages/ShopGalleryPage.tsx` only.
- Preserved `Vault` as the main memorable user-facing tag after owner review,
  while keeping the plain-language explanation as private viewing by trust link.
- Tightened the customer-facing shop signpost on compact/mobile screens:
  - the real shop name stays visible instead of a generic `Public shop link`
    heading
  - the signpost icon, title, helper copy, badges, and buttons are centered
    into one calmer stacked flow
  - `Vault` remains visible as a compact tag instead of being desktop-only
- Made the Shop Gallery outer sections use one calmer branded white-blue
  surface so the page reads less like separate joined blocks; the darker
  billboard moments now sit inside the shared surface rather than replacing it.
- No backend, auth, schema, payment, environment config, or Dashboard Market
  Wisdom behavior changed.

### Verification after Vault branding/signpost polish

- `git diff --check -- frontend/src/pages/ShopGalleryPage.tsx` passed with only
  the normal Windows line-ending warning.
- `npm run build` passed in `frontend`.

### Shop Gallery Vault repetition cleanup addendum

- Updated `frontend/src/pages/ShopGalleryPage.tsx` only.
- Merged the separate Vault explanation card and Vault request card into one
  combined Vault block after phone review showed they repeated the same idea.
- The single Vault block now explains:
  - the public shop shows what everyone can see
  - Vault is the trust-link path for selected offers shared privately
  - the buyer can ask for a Vault viewing link and the owner decides what to
    share
- Kept the existing shop share/copy link behavior and product share behavior
  unchanged.
- No backend, auth, schema, payment, environment config, or Dashboard Market
  Wisdom behavior changed.

### Verification after Vault repetition cleanup

- `git diff --check -- frontend/src/pages/ShopGalleryPage.tsx` passed with only
  the normal Windows line-ending warning.
- `npm run build` passed in `frontend`.

### Shop Gallery mobile product panel sizing addendum

- Updated `frontend/src/pages/ShopGalleryPage.tsx` only.
- Adjusted the 12 public product display cards so each card behaves like a
  phone-screen panel on compact/mobile screens:
  - compact cards now use a viewport-based minimum height
  - compact product image frames use a viewport-based height with safe min/max
  - product cards have larger compact gaps so the next slot is less likely to
    peek into the same phone view
  - cards receive scroll snap alignment hints for cleaner per-product review
- Polished the lower product information area:
  - added a subtle institutional separator line between media and details
  - improved the white/blue product detail wash
  - gave the description panel more room and depth on compact screens
  - kept price and share actions centered
- No backend, auth, schema, payment, environment config, or Dashboard Market
  Wisdom behavior changed.

### Verification after mobile product panel sizing

- `git diff --check -- frontend/src/pages/ShopGalleryPage.tsx` passed with only
  the normal Windows line-ending warning.
- `npm run build` passed in `frontend`.

### Shop Gallery mobile product image ratio addendum

- Updated `frontend/src/pages/ShopGalleryPage.tsx` only.
- Increased compact/mobile product image frame height from `48svh` to `61svh`
  with larger safe min/max bounds so the photo carries more of the phone-screen
  product panel.
- Tightened the lower product information area:
  - reduced compact padding and gaps
  - centered details instead of spreading them through empty white space
  - reduced compact description height/line clamp so the lower area is useful
    but less dominant than the picture
- No backend, auth, schema, payment, environment config, or Dashboard Market
  Wisdom behavior changed.

### Verification after mobile product image ratio update

- `git diff --check -- frontend/src/pages/ShopGalleryPage.tsx` passed with only
  the normal Windows line-ending warning.
- `npm run build` passed in `frontend`.

### Shop Gallery smart buyer rail addendum

- Updated `frontend/src/pages/ShopGalleryPage.tsx` only.
- Consulted two code-review agents before changing the public product cards:
  - UX recommendation: make the lower product block a compact buyer decision
    rail instead of a system-label panel.
  - Engineering recommendation: keep this route-local and use existing product
    payload fields only; defer backend/schema intelligence work.
- Normalized additional backend product fields already emitted by
  `/marketplace/products`:
  - `video_url`
  - `created_at`
  - `origin_shop_name`
  - `reposts_used`
  - `distribution_slots_remaining`
- Reworked compact/mobile product cards so the lower overlay is smaller and
  more buyer-facing:
  - `Storefront block` / `Community-visible` became dynamic signals such as
    `Public offer`, `Video story`, `Fresh this week`, or `Community shop`.
  - numeric/code-like product names now give way to the useful description as
    the visible buyer title, while the code becomes supporting cue text.
  - the description panel became a single-line buyer cue instead of a large
    white box over the image.
  - price and share remain the primary actions.
- Added passive support for product `video_url`; cards render a controlled
  video frame when a product provides a video, otherwise they keep the image
  path.
- No backend, auth, schema, payment, environment config, or Dashboard Market
  Wisdom behavior changed.

### Verification after smart buyer rail update

- `npm exec -- eslint src/pages/ShopGalleryPage.tsx` passed in `frontend`.
- `git diff --check -- frontend/src/pages/ShopGalleryPage.tsx` passed with only
  the normal Windows line-ending warning.
- `npm run build` passed in `frontend`.

### Shop Gallery mobile signpost contact addendum

- Updated `frontend/src/pages/ShopGalleryPage.tsx` only.
- Confirmed the backend shop payload already returns `whatsapp_number` and
  `telegram_handle`, and the frontend normalizes them into `effectiveShop`.
- Fixed the public shop signpost so compact/mobile screens show the shop
  WhatsApp and Telegram contact badges when those values exist. Previously
  those badges were desktop-only.
- Made the signpost helper sentence contact-aware:
  - if contact exists, it tells visitors they can contact the shop, share the
    clean link, or ask for Vault viewing
  - if contact is absent, it keeps the link/Vault guidance
- Confirmed public Shop Gallery page views are not currently counted by a
  backend shop-view analytics contract. Existing real view tracking is limited
  to controlled Vault access links (`views_used`, `max_views`,
  `last_opened_at`) and invite analytics. Do not show public shop visitor
  counts until a real backend event/analytics contract exists.
- No backend, auth, schema, payment, environment config, or Dashboard Market
  Wisdom behavior changed.

### Shop Gallery signpost institutional polish addendum

- Updated `frontend/src/pages/ShopGalleryPage.tsx` only.
- Reworked the public shop signpost into a stronger world-facing trust plaque:
  - added a richer white-blue outer surface with controlled navy, gold, blue,
    and pink brand patches
  - moved the shop initials and shop name onto a darker institutional identity
    plate so the signpost reads less empty and more deliberate
  - kept the existing shop identity, contact, Trust, community, Vault, share,
    and copy-link behavior unchanged
  - grouped the badges into a calmer glass rail beneath the identity plate
- This is a route-local visual polish only. No backend, auth, schema, payment,
  environment config, or Dashboard Market Wisdom behavior changed.

### Verification after signpost institutional polish

- `npm exec -- eslint src/pages/ShopGalleryPage.tsx` passed in `frontend`.
- `git diff --check -- frontend/src/pages/ShopGalleryPage.tsx` passed with only
  the normal Windows line-ending warning.
- `npm run build` passed in `frontend`.

### Finance File cross-community backbone addendum

- Updated `frontend/src/pages/FinancePage.tsx` only.
- Confirmed backend finance truth before changing UI:
  - `/pool/me/summary` already provides the cumulative member pool summary
    across all active communities.
  - `/pool/me` remains the current selected-community pool file.
  - `/trust/me/why` provides Trust Passport evidence/score context.
  - `/guarantor-earnings/me` provides visible guarantor earnings rows.
- Added a new route-local `GSN finance file` surface near the top of Finance:
  - reads the member's same GSN ID across communities
  - shows combined effective available, membership pool total, reserved/locked
    money, locked guarantor support, and visible guarantor earnings
  - separates `What is helping` from `What needs attention`
  - lists compact community finance units from the backend cumulative pool
    summary
  - links directly into Trust Passport and Loan Readiness for correlation
- Preserved the existing Finance summary, expected-payment reconciliation,
  borrower-side finance, guarantor-side finance, recent finance events, and
  route links.
- No backend, auth, schema, payment, ledger, environment config, or Dashboard
  Market Wisdom behavior changed.

### Verification after Finance File update

- `npm exec -- eslint src/pages/FinancePage.tsx` passed in `frontend`.
- `git diff --check -- frontend/src/pages/FinancePage.tsx` passed with only
  the normal Windows line-ending warning.
- `npm run build` passed in `frontend`.

### Finance page explanation addendum

- Updated `frontend/src/pages/FinancePage.tsx` only.
- Expanded the existing open/close `DomainIntroToggle` into a plain-language
  Finance Page Explanation.
- The copy now explains Finance as the GSN money-behaviour evidence room:
  - it does not judge trust by wealth
  - it reads one member's finance activity across every community they belong
    to
  - each community remains its own finance unit inside the wider GSN finance
    file
  - completed repayments, confirmed payments, responsible support, and clear
    records strengthen trust evidence
  - missed payments, defaults, unresolved expected payments, or over-locked
    support become early watch signals
  - Finance shows the money facts while Trust Passport explains the trust
    meaning
- No backend, auth, schema, payment, ledger, environment config, or Dashboard
  Market Wisdom behavior changed.

### Verification after Finance page explanation

- `npm exec -- eslint src/pages/FinancePage.tsx` passed in `frontend`.
- `git diff --check -- frontend/src/pages/FinancePage.tsx docs/HANDOFF_NOTES.md`
  passed with only the normal Windows line-ending warning.
- `npm run build` passed in `frontend`.

### Page explanation rollout backlog

- Product decision to carry forward: each major GSN domain should eventually
  have a plain-language open/close page explanation that tells a newcomer what
  that page can do for them before they start pressing action buttons.
- The Finance page now has the first route-local version using
  `DomainIntroToggle`.
- Future version should likely become a shared system pattern, but only after
  2-3 major pages prove the wording and behavior:
  - optional first-visit prompt such as `Read what this page can do for you?`
  - user can choose yes/no
  - if user says no, avoid repeatedly popping it up on that page
  - user can still manually open the explanation later
  - keep copy simple, practical, and user-facing, not builder-facing
- Candidate rollout order after Finance is stable:
  - Marketplace
  - Community Home
  - Dashboard, while respecting the frozen Market Wisdom area
  - Trust Passport / Trust Score
  - Shop Gallery public view
  - Admin Command Centre
- Keep this pattern route-local until the mobile behavior is trusted. Avoid
  changing shared navigation, auth, route guards, or global shell just to add
  page explanations.

### Finance file consolidation audit addendum

- Updated `frontend/src/pages/FinancePage.tsx` only.
- Consulted two code-audit agents before changing the page:
  - UI audit confirmed repeated intro/help layers, duplicate finance-reading
    sections, repeated balance/guarantor totals, and duplicate route guidance.
  - Backend-truth audit confirmed the safe finance surfaces already available:
    `/pool/me/summary`, `/pool/me`, expected payments, loan summaries,
    guarantor exposure, guarantor earnings, trust evidence, and community
    liquidity context.
- Refactored Finance into fewer factual sections:
  - `About Finance`
  - `GSN finance file`
  - `Selected community finance unit`
  - `Balances and exposure`
  - `Expected payments and reconciliation`
  - `Borrowing and support exposure`
  - `Recent finance events`
- Removed the duplicate `Fixed finance context`, duplicate `Finance reading`,
  separate duplicate guarantor cards, hidden `ExplainToggle` usages, and the
  duplicate `Next routes` section because `PageTopNav` and `NextActionGuide`
  already provide the route movement.
- Replaced large repeated card clusters with table-like records:
  - community finance units table
  - selected-community pool file table
  - balances/exposure table
  - expected-payment table
  - borrower loan summary table
  - guarantor exposure and earnings tables
  - recent finance event ledger table
- Extended loan-summary normalization to show backend-provided `paid_total`,
  `service_fee`, `net_disbursed`, `guarantor_pool`, and `platform_revenue`
  when present.
- Copy was tightened toward record-style language and away from builder-facing
  or over-personal phrasing.
- No backend, auth, schema, payment, ledger, environment config, global shell,
  or Dashboard Market Wisdom behavior changed.

### Verification after Finance file consolidation

- `npm exec -- eslint src/pages/FinancePage.tsx` passed in `frontend`.
- `git diff --check -- frontend/src/pages/FinancePage.tsx` passed with only
  the normal Windows line-ending warning.
- `npm run build` passed in `frontend`.

### Finance benefit-led explanation addendum

- Updated `frontend/src/pages/FinancePage.tsx` only.
- Product-owner voice correction: page explanations should not read like
  instructions for operating the screen. They should explain what the page can
  do for the member in real life and what future benefit it creates.
- Rewrote the Finance `DomainIntroToggle` around this standard:
  - Finance is not a wealth judge.
  - Finance helps underbanked and unbanked members build visible reliability
    through money behaviour.
  - completed repayments, confirmed payments, and responsible support become
    proof.
  - one member keeps one GSN finance file across communities, with each
    community shown as its own finance unit.
  - Helping / Watch / Pressure language should be the simple interpretation
    pattern for community finance units.
  - Finance shows what happened with money, Trust Passport explains what it
    means, and Trust Events record the proof.
- Updated the Finance top subtitle and hero description so the page introduces
  itself as a cross-community proof trail rather than a technical record page.
- Future page explanations should follow this benefit-led pattern: show the
  user how the page helps their life, trust, access, safety, or proof story
  before explaining page controls.
- No backend, auth, schema, payment, ledger, environment config, global shell,
  or Dashboard Market Wisdom behavior changed.

### Finance button tap-stability addendum

- Updated `frontend/src/pages/FinancePage.tsx` and
  `frontend/src/components/DomainIntroToggle.tsx`.
- Product-owner phone test found Finance buttons still felt jumpy, with some
  open/collapse taps succeeding only after repeated careful attempts.
- Tightened the Finance route-local collapse buttons:
  - larger minimum tap area
  - stronger button isolation and z-index
  - disabled mobile blue tap highlight
  - stopped pointer/mouse/touch/click propagation before toggling sections
- Tightened the shared `DomainIntroToggle` open/close button because Finance,
  Marketplace, Community Home, Shop Gallery, and Trust pages use it for page
  explanations:
  - larger open/close tap target
  - touch-safe styling
  - tap event isolation on the section and button
- This change is UI/tap-safety only. It does not change finance calculations,
  backend calls, auth, schema, payment, ledger, route guards, global shell, or
  Dashboard Market Wisdom behavior.

### Trust Passport blueprint and explanation addendum

- Updated `frontend/src/pages/TrustScorePage.tsx` only for the Trust route
  surface at `/app/trust`.
- Product-owner direction: Trust should develop like Finance, with one personal
  trust record for the member across communities and a separate smaller
  community-specific trust reading for the selected group.
- Consulted frontend and backend trust audits before changing the page:
  - frontend audit confirmed `/app/trust` is the correct Trust Passport target
    and `TrustScorePage.tsx` is the safest route-local place to clarify the
    model
  - backend audit confirmed the current services already support personal
    trust evidence, TrustSlip summaries, CCI, graph context, timelines, and
    community-scoped readings without needing schema or scoring changes
- Rewrote the Trust page explanation around benefits:
  - Trust Passport is not a permanent label or judgement
  - one member keeps one personal GSN trust record across communities
  - each selected community can still show its own smaller Open Trust reading
  - completed finance promises, responsible guarantees, clean identity
    continuity, and good participation strengthen the trust story
  - missed promises, defaults, overexposure, unresolved actions, or identity
    shifts create pressure and repair paths
  - TrustSlip remains the smaller portable proof, not the whole Passport
- Added a new route-local "Trust record model" section that separates:
  - personal trust record
  - selected community reading
  - what strengthens trust
  - what creates pressure
  - what can safely travel outside as proof
- Tightened Trust page open/collapse and action buttons with the same
  tap-safety pattern used on Finance:
  - larger tap targets
  - mobile tap highlight removed
  - event propagation stopped before toggling
  - Trust Journey action buttons isolated from surrounding cards
- Added `docs/BENEFIT_LED_PAGE_EXPLANATIONS_2026-04-21.md` as the working
  source bank for page explanations that can later be polished into school,
  partner, innovation, or immigration/institutional documentation.
- No backend scoring, auth, schema, payment, ledger, environment config,
  global shell, route guard, or Dashboard Market Wisdom behavior changed.

### Trust Passport repetition cleanup addendum

- Re-audited `frontend/src/pages/TrustScorePage.tsx` after the first Trust
  Passport blueprint pass because the page still had repeated explanation
  layers and route buttons.
- Removed duplicate route-local explanation blocks:
  - the `What this posture means` explainer inside the current posture card
  - the `What this does` explainer inside the trust summary card
- Removed the duplicate `Next routes` section because `PageTopNav` and
  `NextActionGuide` already provide the movement layer.
- Removing `Next routes` also removed the disabled `Open TrustSlip Verify`
  button state from the bottom of the page.
- Retained the useful top TrustSlip verify link when an actual verification URL
  exists, plus the main `Refresh`, `Copy GMFN ID`, and `Print Trust Passport`
  actions.
- Renamed the document badges to separate the two trust truths more clearly:
  personal GSN trust record and community reading kept separate.
- This cleanup is route-local to `/app/trust`; no backend, scoring, auth,
  schema, payment, ledger, global shell, route guard, or Dashboard Market
  Wisdom behavior changed.

### Trust Passport tap and polish hardening addendum

- Updated `frontend/src/pages/TrustScorePage.tsx` to harden the remaining
  Trust route actions before phone verification:
  - added route-local CSS for all Trust buttons and links to remove mobile tap
    highlight and enforce touch manipulation
  - raised button z-index and pointer isolation
  - increased primary, secondary, soft, and collapse button tap areas
  - gave Trust cards and stat tiles a more institutional layered surface
  - converted the top TrustSlip verify link into a tap-safe button so it uses
    the same event isolation as the other Trust actions
- Updated `frontend/src/components/NextActionGuide.tsx` with UI-only tap
  hardening because the "What do you want to do next?" guide is now shared by
  Trust, Finance, Community Home, Dashboard, and Loans:
  - larger minimum button areas
  - stronger button isolation and z-index
  - pointer events kept explicitly on the button surface
- No backend scoring, auth, schemas, payment, ledger, deployment config,
  environment config, route guards, or Dashboard Market Wisdom behavior changed.

### Trust Passport benefit-led wedge addendum

- Updated `frontend/src/pages/TrustScorePage.tsx` so the `How Trust Passport
  Helps You` guide now tells the stronger product story:
  - informal community vouching already works in real life
  - that vouching is limited by location, availability, sentiment, and personal
    relationship pressure
  - Trust Passport keeps the fuller trust record
  - TrustSlip becomes the shareable proof that can be checked before a seller
    releases goods on credit, before a loan is approved, before support is
    given, or before a guarantor accepts risk
  - Finance records what happened, Trust Passport explains what it means, and
    TrustSlip proves the current state quickly
- Updated `frontend/src/lib/gmfnCapabilities.ts` under capability `15`
  (`Portable Trust Identity`) so the shared 22-capability guide carries the
  innovation wedge:
  `GSN turns informal community vouching into portable, verifiable trust
  evidence, especially for people who are normally invisible to formal credit
  systems.`
- Updated `docs/BENEFIT_LED_PAGE_EXPLANATIONS_2026-04-21.md` with the same
  fuller Trust Passport story for later school, partner, innovation, or
  immigration/institutional documentation.
- This is copy/system-explanation work only. No backend scoring, auth, schemas,
  payment, ledger, deployment config, route guards, or Dashboard Market Wisdom
  presentation logic changed.

### Marketplace shop-gallery benefit-led explanation addendum

- Updated `frontend/src/pages/MarketplacePage.tsx` so the active Marketplace
  `DomainIntroToggle` is now a benefit-led story titled
  `How Marketplace Helps Your Shop Travel`.
- The story intentionally stays inside `/app/marketplace`, not the public Shop
  Gallery, because Marketplace owns the selected-community context and the
  outward-control tools.
- The new story explains:
  - Shop Gallery as the clean public face of the one global shop inside a
    trusted marketplace context
  - Vault as permission-based private viewing for stock/offers that should not
    be shown to everyone
  - Spotlight and paid spotlight as routes for lifting trusted value into view
  - Demand Box as the buyer/need side of the same marketplace opportunity
  - repost/outward links as controlled ways for shop, marketplace, Vault-style,
    or approved spotlight access to travel beyond the first circle
  - TrustSlip as the deeper proof layer before goods are released on credit,
    risk is accepted, or support moves
- Added the same Marketplace / Shop Gallery source language to
  `docs/BENEFIT_LED_PAGE_EXPLANATIONS_2026-04-21.md` for later institutional
  documentation.
- This is copy/system-explanation work only. No backend, auth, schema, payment,
  ledger, route guard, deployment config, public Shop Gallery, or Dashboard
  Market Wisdom behavior changed.

### Marketplace lived-in explanation rewrite addendum

- Updated the active Marketplace `How Marketplace Helps Your Shop Travel`
  guide in `frontend/src/pages/MarketplacePage.tsx` again after product-owner
  review.
- The new version deliberately sounds like a member already using GSN, not like
  an academic or product brochure:
  - before GSN, the shop only travelled as far as people knew the seller
  - GSN lets the shop carry community identity, GSN ID, and trust record
  - Shop Gallery shows goods with a real person/community/trust context
  - Vault supports private viewing when not everything should be public
  - Spotlight and paid Spotlight help trusted value travel further
  - Demand Box surfaces what people are asking for
  - repost links let the shop move outward while preserving marketplace context
  - TrustSlip can speak for the member when the usual human voucher is not
    physically present
- Kept the same innovation wedge as the closing note:
  `GSN turns informal community vouching into portable, verifiable trust
  evidence, especially for people who are normally invisible to formal credit
  systems.`
- Updated `docs/BENEFIT_LED_PAGE_EXPLANATIONS_2026-04-21.md` with the same
  lived-in Marketplace / Shop Gallery wording.
- This remains copy/system-explanation work only. No backend, auth, schema,
  payment, ledger, route guard, deployment config, public Shop Gallery, or
  Dashboard Market Wisdom behavior changed.

### Dashboard benefit-led explanation addendum

- Added a route-local `How Dashboard Helps You` guide to
  `frontend/src/pages/DashboardPage.tsx`.
- The guide frames Dashboard as the reflector/summary surface, not the command
  centre, and focuses the story on:
  - Market Wisdom as the first reading
  - Focus Commitment as visible follow-through discipline
  - Notifications as event signals, not just messages
  - Demand Box pressure and opportunity signals
  - Spotlight visibility and marketplace context
  - TrustSlip as the proof layer behind repeated honest behaviour
- Added the same Dashboard source language to
  `docs/BENEFIT_LED_PAGE_EXPLANATIONS_2026-04-21.md` for later school,
  partner, innovation, immigration, or institutional documentation.
- This is copy/system-explanation work only. The frozen `/app/dashboard`
  Market Wisdom presentation and interaction model was not restyled or
  restructured. No backend, auth, schema, payment, ledger, route guard, or
  deployment config changed.

### Dashboard lived-reality explanation rewrite addendum

- Rewrote the active Dashboard `How Dashboard Helps You` guide in
  `frontend/src/pages/DashboardPage.tsx` after product-owner review because the
  first version was accurate but too surface-level.
- The new version explains Dashboard from ordinary market/community life:
  - seeing what trusted friends and community members are selling without
    physically travelling to each shop
  - using Spotlight as real-time visibility, buying, support, or resale
    opportunity
  - using Focus Commitment as a practical reminder and follow-through record,
    not just a to-do list
  - treating Demand Box as opportunity from what people are asking for, not only
    from what a seller already displays
  - treating Notifications as event memory for payment movement, kindness,
    approvals, demand, spotlight, repayments, and unfinished duties
  - keeping evidence together when a member borrows, lends, repays, contributes,
    supports, or helps from another city or country
  - connecting Dashboard events back to stronger TrustSlip evidence
- Updated `docs/BENEFIT_LED_PAGE_EXPLANATIONS_2026-04-21.md` with the same
  deeper Dashboard storyline for later school, partner, innovation,
  immigration, or institutional documentation.
- This remains copy/system-explanation work only. The frozen `/app/dashboard`
  Market Wisdom presentation and interaction model was not restyled or
  restructured. No backend, auth, schema, payment, ledger, route guard, or
  deployment config changed.

### Benefit guide visual polish addendum

- Updated the shared `frontend/src/components/DomainIntroToggle.tsx` component
  used by the benefit-led "What this can do for you" guides.
- This intentionally polishes the same guide surface across the four current
  major benefit-story pages:
  - `/app/dashboard`
  - `/app/finance`
  - `/app/trust`
  - `/app/marketplace`
- Visual-only improvements:
  - richer institutional blue/gold/pink background treatment
  - top accent strip for stronger branded character
  - more premium open/close pill button
  - numbered evidence-style bullet rows
  - clearer wedge/note block treatment
  - preserved tap containment and mobile-safe button behaviour
- No page copy, route logic, backend, auth, schema, payment, ledger,
  deployment config, route guard, or Dashboard Market Wisdom behavior changed.

### Removed "Your guide" label addendum

- Removed the visible `Your guide` phrase from shared guide defaults and
  page-specific helper copy so the newer benefit-led page explanations can
  carry the meaning without that older label.
- Updated:
  - `frontend/src/components/DomainIntroToggle.tsx`
  - `frontend/src/components/NextActionGuide.tsx`
  - `frontend/src/layout/AppLayout.tsx`
  - `frontend/src/pages/CommunityHomePage.tsx`
  - `frontend/src/pages/DashboardPage.tsx`
  - `frontend/src/pages/MarketplacePage.tsx`
  - `frontend/src/pages/MyGMFNAndIPage.tsx`
  - `frontend/src/pages/ShopGalleryPage.tsx`
- Full frontend search for `your guide` is now clean.
- This is copy/surface cleanup only. It does not remove the actual benefit
  panels, next-action guide logic, routes, backend, auth, schema, payment,
  ledger, route guard, deployment config, or Dashboard Market Wisdom behavior.

### Live entry route deploy check addendum

- Phone pilot testing reported `Not Found` during the first create-community
  entry steps.
- Local branch inspection confirmed the entry routers are present in
  `gmfn_backend/app/api/router.py` and the create-entry frontend calls
  `/entry/phone/start`, `/entry/bank-details`, and `/entry/create`.
- Live Render inspection on 2026-04-21 showed:
  - `https://gmfn-api.onrender.com/health` returns healthy.
  - `POST https://gmfn-api.onrender.com/entry/phone/start` returns 404.
  - Live OpenAPI does not list the `/entry/*` routes.
- Conclusion: the live API deployment is stale or not running the latest backend
  branch that contains public entry routes. This is not currently evidence of a
  user form mistake.
- Added `gmfn_backend/docs/render_deploy_marker.md` as a docs-only backend-root
  change to trigger Render API redeploy without changing runtime behavior.
- Recommended test links after the API redeploy:
  - Create a new community: `https://gmfn-frontend.onrender.com/cover?entry=create`
  - Join an existing community: use a generated invite link containing a real
    invite code.

### Render pre-deploy migration hardening addendum

- A Render pre-deploy failure was reported with SQLAlchemy `f405` after
  `alembic upgrade head`.
- The pasted log tail did not include the exact failing SQL line, but the likely
  failure class is an already-existing table, column, index, or foreign-key
  during newer entry/marketplace migrations.
- Hardened these migrations to be idempotent before pushing another deploy:
  - `20260418_add_entry_bank_details_and_payout_destinations.py`
  - `20260418_add_entry_region_consistency_fields.py`
  - `20260420_add_marketplace_request_clan_id.py`
- The hardening only checks for existing objects before creating them. It does
  not change table meaning, route logic, auth, permissions, payment, ledger, or
  frontend behavior.
- Verified a fresh SQLite Alembic upgrade to head locally after the change.

### Render notifications boolean default addendum

- Render pre-deploy later reached
  `20260418_add_notifications_table.py` and failed on PostgreSQL because the
  `notifications.is_read` boolean column used `DEFAULT 0`.
- PostgreSQL reported:
  `column "is_read" is of type boolean but default expression is of type integer`.
- Updated that migration to use SQLAlchemy's boolean default expression
  `sa.false()`, which compiles safely for PostgreSQL while preserving the same
  meaning: new notifications start unread.

### Shop gallery public signpost cleanup addendum

- The public shop gallery was repeating the same identity details in both the
  top signpost and the following middle card.
- Updated `frontend/src/pages/ShopGalleryPage.tsx` so the top hero remains the
  single shop identity/signpost area, while the repeated middle card now acts
  as a buyer-confidence action block:
  - `Trade with confidence`
  - public shelf / Vault / seller-contact signals
  - `Ask seller`, `Share shop`, and `Copy link` actions
- Removed the customer-facing `What this screen does` guide from the public
  shop gallery so visitors see the shop surface directly.
- This is frontend copy/layout cleanup only. No backend routes, auth,
  permissions, schema, payment, ledger, or deployment settings changed.

### Internal page tap-stability foundation addendum

- Product-owner testing moved into broader page-to-page checking and requested
  inside pages be tightened without changing their meaning.
- Applied a shared UI/tap-stability polish pass rather than rewriting each
  route-local page:
  - `frontend/src/index.css` now sharpens font rendering and hardens tap
    behavior for buttons, links, summaries, and role-button surfaces.
  - `frontend/src/components/PageTopNav.tsx` now gives phone top-nav actions
    larger tap targets and stronger pointer isolation.
  - `frontend/src/components/EntryControls.tsx`,
    `frontend/src/components/uiKit.tsx`, and
    `frontend/src/styles/gmfnBrand.ts` now apply the same touch-safe,
    no-highlight, isolated action-button foundation.
- This pass is intended to benefit internal pages that share the app shell,
  top nav, entry controls, branded buttons, or plain native buttons while
  preserving route contracts and page content.
- No backend, auth, permissions, schemas, payment, ledger, route guard,
  deployment configuration, or Dashboard Market Wisdom presentation changed.

### Pilot test flow definition addendum

- Product-owner testing has started and the next phase needs a clear
  beginning-to-end correction map rather than route-by-route improvisation.
- Added `docs/PILOT_TEST_FLOW_2026-04-21.md` as the pilot source-of-truth for:
  - live and local test URLs
  - tester roles
  - public entry, create-community, invite/join, activation, login, dashboard,
    community, marketplace, shop, Vault, demand, finance, trust, notifications,
    identity, settings, and admin test paths
  - practical definition of when a route is actually corrected
  - tester feedback format
  - correction priority order
  - boundaries that should not be disturbed during pilot testing
- This is documentation/control-layer work only. No frontend route behavior,
  backend routes, auth, permissions, schemas, payment, ledger, migrations,
  deployment config, or Dashboard Market Wisdom presentation changed.

### Endpoint audit and active frontend endpoint normalization addendum

- Product-owner requested an end-to-end endpoint audit because pilot testing has
  started.
- Added `docs/ENDPOINT_AUDIT_2026-04-21.md` with confirmed backend/live state,
  frontend endpoint risks, duplicate backend registrations, unmounted router
  files, and recommended cleanup order.
- Confirmed live Render API and local OpenAPI now match exactly with `209`
  paths each; entry routes are live; marketplace media routes are live.
- Confirmed the backend is mounted without an `/api` prefix. A live request to
  `/api/marketplace/products` returns `404`, so active page-local frontend
  fetches needed normalization.
- Updated active frontend pages so page-local `/api/...` calls are routed
  through the configured API base instead of directly hitting the frontend host:
  - `frontend/src/pages/JoinByInvitePage.tsx`
  - `frontend/src/pages/ShopAssetsPage.tsx`
  - `frontend/src/pages/ShopControlPage.tsx`
  - `frontend/src/pages/LoanSummaryPage.tsx`
- Replaced stale shop image upload candidates in Shop Assets and Shop Control
  with the shared marketplace media upload helper using `/marketplace/media/image`.
- Corrected Shop Control expected-payment lookup to use the mounted
  `/bank/expected` endpoint shape.
- Remaining audited backend gaps:
  - Vault access UI/service exists, but no Vault access router is mounted.
  - `system_diagnostics.py` exists but is not mounted, so
    `/system/diagnostics` returns `404`.
  - Duplicate route registrations exist for several trust/admin/bank endpoints.
- Verified `npm run build` in `frontend` succeeds after these changes.

### Safe backend correction and completion-program addendum

- Product-owner approved applying the safe endpoint corrections now and
  separating heavier Vault/admin/backend work into a controlled program.
- Mounted the existing admin-protected diagnostics router:
  - `gmfn_backend/app/api/router.py`
  - `gmfn_backend/app/api/routes/system_diagnostics.py`
- Local OpenAPI now includes `/system/diagnostics`; path count moves from `209`
  to `210` locally. The route should become live after the backend Render
  redeploy containing this commit.
- Updated `docs/ENDPOINT_AUDIT_2026-04-21.md` to mark system diagnostics as
  corrected locally but pending live deploy.
- Added `docs/BACKEND_ADMIN_VAULT_COMPLETION_PROGRAM_2026-04-21.md` to guide:
  - pilot-critical route confirmation
  - Vault access backend contract
  - admin backend cleanup
  - final freeze before wider testing
- This correction does not change auth rules, schemas, migrations, payments,
  ledger behavior, environment config, or user-facing route layout.

### Dormant route classification addendum

- Product-owner asked to start with the safest item among the remaining backend
  corrections.
- Added `docs/DORMANT_ROUTE_CLASSIFICATION_2026-04-21.md` as a docs-only safety
  classification for unmounted backend route files.
- No dormant routes were mounted and no route files were deleted in this pass.
- Confirmed `system_diagnostics.py` is already corrected locally and should not
  be treated as dormant after that backend deploy.
- Classified likely duplicate/superseded route files:
  - `health.py`
  - `public.py`
  - `loan_summary.py`
  - `repayments.py`
  - `trust_evidence_pack.py`
  - `exposure_admin.py`
  - `trust_score.py`
- Marked `trust_timeline.py` as the next safest code candidate because
  `frontend/src/pages/TrustTimelinePage.tsx` actively calls
  `/trust/me/timeline?limit=200`, while the JSON timeline route lives in that
  currently unmounted file.
- Marked `merchant_verify.py` as a medium-risk candidate because
  `frontend/src/lib/merchantChannel.ts` calls `/trust-slips/me/merchant-link`,
  but merchant verification overlaps with public TrustSlip verification rules.
- Marked repayment/admin repayment, dispute, shipment/courier, merchant release,
  merchant view, and bulk guarantor routes as real product work that should not
  be mounted blindly.

### Trust Timeline endpoint correction addendum

- Continued from the dormant-route safety classification by applying the next
  safest code correction.
- Mounted `trust_timeline.py` in `gmfn_backend/app/api/router.py`:
  - `GET /trust/me/timeline`
  - `GET /trust/timeline/{user_id}`
- Updated `frontend/src/pages/TrustTimelinePage.tsx` so its authenticated JSON
  and PDF requests use the configured backend API base instead of same-origin
  static-site fetches.
- This aligns the active Trust Timeline screen with the backend route that was
  already implemented but not mounted.
- Verification:
  - `python -m compileall app\api\router.py app\api\routes\trust_timeline.py`
    passed from `gmfn_backend`.
  - local OpenAPI with `GMFN_DEV_MODE=1` includes `/trust/me/timeline`,
    `/trust/timeline/{user_id}`, and `/trust/me/timeline.pdf`.
  - `npm run build` passed in `frontend`.
- Remaining OpenAPI warnings are the pre-existing duplicate operation IDs:
  - `trust_why_user`
  - `admin_recent_trust_events`
  - `admin_trust_why`
- No schemas, migrations, auth core, permissions core, payment, ledger, or
  TrustEvent scoring logic changed.

### Merchant verification dormant-route inspection addendum

- Continued the safe backend endpoint cleanup by inspecting the next candidate:
  `gmfn_backend/app/api/routes/merchant_verify.py`.
- No merchant verification route was mounted in this pass.
- Confirmed `frontend/src/lib/merchantChannel.ts` references
  `/trust-slips/me/merchant-link`, but repo search shows it is not imported by
  active frontend pages.
- Confirmed active TrustSlip verification is already mounted through
  `gmfn_backend/app/api/routes/trust_slips.py`, including:
  - `GET /trust-slips/verify/{code}`
  - `GET /trust-slips/verify/{code}/page`
  - `GET /trust-slips/verify/{code}/qr.png`
  - `GET /trust-slips/{code}/share`
- Confirmed `merchant_verify.py` defines `GET /trust-slips/verify/{token}`,
  which overlaps the mounted TrustSlip verification route shape
  `GET /trust-slips/verify/{code}`.
- Confirmed `merchant_verify_service.py` can write append-only merchant
  verification TrustEvents:
  - `merchant.verify_link_created`
  - `merchant.verify_token_used`
- Decision: keep `merchant_verify.py` dormant until the merchant-token route
  contract is deliberately redesigned, moved to a non-conflicting path, or
  merged into mounted `trust_slips.py`.
- This was documentation/control-layer work only. No backend routes, frontend
  runtime code, schemas, migrations, auth, permissions, payment, ledger, or
  TrustEvent scoring logic changed.

### Controlled entry-lane addendum

- Product-owner reported testing confusion when WhatsApp testers land directly
  on `/cover`, press Continue, and then see multiple welcome choices.
- Confirmed explicit entry routes already preserve distinct lanes:
  - `/public-create` and `/founder` set create mode.
  - `/invite/:code` and `/get-invite/:code` set invite mode.
  - `/approved/:requestId` sets approved mode.
  - `/existing` sets existing-member mode.
- Applied a narrow frontend correction so plain `/cover` now continues to
  `/create` instead of `/welcome`; this makes the controlled pilot default to
  one create-community action rather than a three-choice welcome screen.
- Kept invite, approved, and existing-member paths distinct.
- Updated shared `coverContinueTo()` to match the same create-default behavior
  for any future shared caller.
- Fixed backend-generated frontend links so community invite and activation
  links no longer default to `127.0.0.1` or `localhost`:
  - `clans.py` now uses `FRONTEND_BASE_URL`, `GMFN_FRONTEND_BASE_URL`, or
    `PUBLIC_FRONTEND_URL`, then request origin, then
    `https://gmfn-frontend.onrender.com`.
  - `invites_service.py` keeps respecting `FRONTEND_BASE_URL` and falls back to
    `https://gmfn-frontend.onrender.com`.
- Verification:
  - `npm run build` passed in `frontend`.

### Demand Box and Community Home interior-button tightening addendum

- Product-owner reported during live pilot testing that Demand Box and
  Community Home interior controls still had some "jumpy" button behavior,
  especially around demand actions and deeper Community Home blocks.
- Updated `frontend/src/pages/DemandBoxPage.tsx`:
  - Strengthened the shared tap target layer with higher stacking, pointer
    containment, browser appearance reset, and larger focus offset.
  - Increased primary, secondary, and subtle button hit areas.
  - Added click-level event containment to community selection, create demand,
    details expansion, mark fulfilled, and cancel demand controls.
- Updated `frontend/src/pages/CommunityHomePage.tsx`:
  - Strengthened shared action buttons and collapse buttons with higher
    stacking, isolation, pointer containment, transform-layer stabilization,
    tap-highlight removal, and larger hit areas.
- No backend logic, route contracts, auth, schemas, spotlight quota logic, or
  the frozen Dashboard Market Wisdom area were changed.
- Verification:
  - `npm exec -- eslint src/pages/DemandBoxPage.tsx src/pages/CommunityHomePage.tsx`
    passed with the existing Demand Box hook dependency warning.
  - `npm run build` passed in `frontend`.
  - `git diff --check -- frontend/src/pages/DemandBoxPage.tsx frontend/src/pages/CommunityHomePage.tsx`
    passed with only Windows line-ending warnings.

### Spotlight pilot quota and 30-second rotation addendum

- Product-owner reported during live pilot testing that spotlight uploads were
  still returning the old capacity message and that video/spotlight movement was
  hard to confirm from the phone.
- Confirmed from code:
  - The exact `Spotlight capacity reached for clan ...` message exists in the
    backend marketplace broadcast route only.
  - The local backend already had the pilot free-capacity override enabled, so
    any continued live appearance of that exact message strongly suggests the
    running Render backend had not yet picked up the latest backend build or was
    still serving an older deploy.
- Updated `gmfn_backend/app/api/routes/marketplace.py`:
  - Kept the temporary pilot override enabled.
  - Extended the override to bypass the paid spotlight one-active-item cap as
    well as the free clan-capacity cap.
  - Did not remove paid entitlement checks, shop ownership checks, auth,
    membership resolution, media upload, or broadcast creation rules.
- Updated `frontend/src/components/CommunityMarketplaceSpotlight.tsx`:
  - Live marketplace spotlight refresh now runs every 30 seconds.
  - Spotlight rotation now runs every 30 seconds instead of 45 seconds.
- Updated `frontend/src/pages/CommunityHomePage.tsx`:
  - Live community spotlight state refresh now runs every 30 seconds.
  - Live community spotlight video now autoplays muted/inline/looped when a
    video URL is present, while keeping controls available.
- Verification:
  - `python -m compileall gmfn_backend\app\api\routes\marketplace.py` passed.
  - `python -m pytest gmfn_backend\tests\test_marketplace_requests.py -q`
    passed.
  - `npm exec -- eslint src/components/CommunityMarketplaceSpotlight.tsx src/pages/CommunityHomePage.tsx`
    passed.
  - `npm run build` passed in `frontend`.
  - `git diff --check -- gmfn_backend/app/api/routes/marketplace.py frontend/src/components/CommunityMarketplaceSpotlight.tsx frontend/src/pages/CommunityHomePage.tsx frontend/src/pages/DemandBoxPage.tsx docs/HANDOFF_NOTES.md`
    passed with only Windows line-ending warnings.

### Temporary spotlight capacity quota suspension

- Product-owner requested a short pilot suspension of the Spotlight quota so
  testers can publish and play short videos today before testing Vault and paid
  subscription surfaces.
- Updated `gmfn_backend/app/api/routes/marketplace.py`:
  - Added `SPOTLIGHT_CAPACITY_PILOT_OVERRIDE_ENABLED = True` as an explicit
    pilot switch after testers still hit the old capacity message while Render
    deploy timing was being verified.
  - Added `SPOTLIGHT_CAPACITY_PILOT_OVERRIDE_UNTIL = 2026-04-24 23:59:59 UTC`.
  - Added `_spotlight_capacity_pilot_override_active()`.
  - Bypassed only the free Spotlight clan-capacity rejection while the pilot
    switch is enabled or the dated override is active.
- What remains protected:
  - paid Spotlight entitlement checks still run.
  - one-active-paid-spotlight-per-shop check still runs.
  - shop ownership, clan membership, media upload, expiry, auth, schema, Vault,
    subscription, and trust-event logic were not changed.
- Remove or disable this override before normal outside-circle release.

### Public Shop Gallery safe navigation and tap-target addendum

- Product-owner reported that customer-facing shops trapped signed-in users and
  did not give a safe way back into the app, while public visitors must not be
  able to operate internal GSN tools.
- Updated `frontend/src/pages/ShopGalleryPage.tsx` only:
  - Added an auth-aware top navigation strip to `/shop/:gmfnId`.
  - Public visitors now see only safe public exits/actions: Back, Sign in, and
    Open GSN. They do not see Dashboard, Community, Marketplace, or Shop
    Control.
  - Signed-in viewers now see protected return doors to Dashboard, Community,
    Marketplace, and their own shop.
  - The Shop Control link appears only when the signed-in viewer's GSN ID
    matches the public shop GSN ID.
  - Tightened shop action buttons: public share/copy/Vault request buttons,
    mini spotlight links, and product Share buttons now have larger stable
    touch targets and tap containment.
  - Removed two unused route-local leftovers (`initialsOf`, `shopTrustText`)
    surfaced by lint.
- No backend, auth core, permissions, schemas, route contracts, payment, Vault
  logic, product loading, or Dashboard Market Wisdom changes were made.
- Verification:
  - `npm exec -- eslint src/pages/ShopGalleryPage.tsx` passed.
  - `npm run build` passed in `frontend`.
  - `git diff --check -- frontend/src/pages/ShopGalleryPage.tsx docs/HANDOFF_NOTES.md`
    passed with only Windows line-ending warnings.

### Main navigation click-bubble hardening addendum

- Product-owner continued live pilot testing and identified jumpy main-domain
  buttons/navigation as a major remaining weak area while testers were offline.
- Confirmed from code:
  - `frontend/src/components/OriginLink.tsx` already stopped pointer, touch,
    and mouse-down propagation.
  - It did not stop the final click event from bubbling into surrounding cards,
    drawers, overlays, or parent link-like blocks.
  - That can make a correctly tapped link still trigger a parent surface after
    the link receives the tap, which matches the reported “button falls
    somewhere else” behaviour.
- Updated `frontend/src/components/OriginLink.tsx`:
  - Link and external-anchor clicks now stop propagation before calling their
    own supplied `onClick` handler.
  - The link's own handler still runs, so drawer/page-action close handlers and
    normal navigation continue to work.
- No route names, route contracts, auth, backend logic, schemas, payments,
  invites, or permissions were changed.
- Verification:
  - `npm exec -- eslint src/components/OriginLink.tsx src/layout/AppLayout.tsx src/components/PageTopNav.tsx`
    passed.
  - `npm run build` passed in `frontend`.
  - `git diff --check -- frontend/src/components/OriginLink.tsx` passed with
    only Windows line-ending warnings.

### AppLayout main-domain navigation tightening addendum

- Product-owner asked to tighten the main domain buttons and instill proper
  navigation after repeated phone testing showed jumpy taps and uncertainty
  around major domain movement.
- Updated `frontend/src/layout/AppLayout.tsx`:
  - Main Movement now treats `Loans & Support` as a first-class domain beside
    Dashboard, Community Home, Marketplace, Shop, Finance, and Trust Passport.
  - Mobile bottom navigation now includes `Loans` and uses the shorter `Trust`
    label while preserving the existing `/app/trust` route contract.
  - Desktop side navigation, mobile drawer links, mobile Tools/page-action
    links, and mobile bottom navigation now use `OriginLink` so page return
    context is preserved more consistently.
  - Shared domain buttons now have stronger touch targets, centered labels,
    tap-highlight suppression, pointer/touch containment, and horizontal snap
    behavior on the mobile bottom rail.
  - Loan summary routes now keep the Loans/Support main-domain highlight active.
- No backend, auth, schema, environment, permission, route contract, or frozen
  Dashboard Market Wisdom changes were made.
- Verification:
  - `npm exec -- eslint src/layout/AppLayout.tsx` passed.
  - `npm run build` passed in `frontend`.
  - `git diff --check -- frontend/src/layout/AppLayout.tsx docs/HANDOFF_NOTES.md`
    passed with only a Windows line-ending warning.

#### Mobile follow-up
- Product-owner shared a phone screenshot showing the first-currency headline
  splitting awkwardly on mobile while looking acceptable on laptop.
- Adjusted the phone-only Dashboard first-currency headline to use one centered
  logo, one balanced headline, and one small `GSN` / `Visible. Portable.
  Usable.` proof line.
- The laptop/desktop presentation was left intact.
- Verification:
  - `npm exec -- eslint src/pages/DashboardPage.tsx` passed.
  - `npm run build` passed in `frontend`.

### Create-entry pilot phone-session expiry addendum

- Product-owner tested the Render create-community flow and saw
  `Verified phone session has expired` during onboarding.
- Confirmed current behavior from code:
  - `/entry/phone/start` creates an `EntryPhoneVerification`.
  - Pilot/preview mode returns `otp_preview` because live SMS OTP delivery is
    not connected yet.
  - `/entry/bank-details` and `/entry/create` correctly reject expired phone
    sessions, but a 10-minute timeout is too short for controlled pilot testers
    who pause to read the guide or ask questions.
- Updated `gmfn_backend/app/api/routes/entry.py`:
  - Added `_entry_phone_session_minutes`.
  - Pilot/preview/manual delivery now defaults to a one-hour phone-session
    window.
  - Live SMS mode still defaults to 10 minutes.
  - `GMFN_ENTRY_PHONE_SESSION_MINUTES` can override the value, clamped between
    10 minutes and 24 hours.
- Updated `frontend/src/pages/CreateEntryPage.tsx`:
  - Detects expired/not-found temporary phone sessions.
  - When saving bank/wallet details, the frontend refreshes and auto-confirms
    the pilot phone proof, then saves the details against the fresh proof.
  - When finishing community creation, the frontend also refreshes the pilot
    phone proof, re-saves the bank/wallet proof against it, and then submits
    community creation.
- Product-owner refined the pilot rule:
  - One hour is enough for controlled testing.
  - The phone confirmation message should say the phone has been successfully
    linked to the user's name.
  - If a refresh cannot complete after the proof is too old, the user-facing
    error should explain that the phone proof is more than one hour old and ask
    the user to start afresh.
- Updated `gmfn_backend/tests/test_entry_create.py`:
  - Added a regression test proving preview/pilot phone sessions last long
    enough for practical pilot onboarding.
- Product decision captured:
  - Current pilot flow is not full real SMS OTP.
  - It ties the founder name, phone number, and bank/wallet record as starter
    proof during onboarding.
  - Real OTP should later be connected through an SMS provider with delivery
    env config, spend controls, rate limiting, and phone-number formatting.
- No schema, migration, auth core, invite/join flow, payment movement, ledger
  movement, or permanent TrustEvent timing was changed.
- Verification:
  - `python -m compileall gmfn_backend\app\api\routes\entry.py` passed.
  - `python -m pytest gmfn_backend\tests\test_entry_create.py -q` passed:
    10 tests.
  - `npm run build` passed in `frontend`.

### Loan, guarantor, repayment proof audit addendum

- Product-owner requested an end-to-end audit of bank verification, bank rails,
  loan amount vs personal pool, above-pool guarantor requirements, guarantor
  responses, repayment, and TrustEvent proof.
- Confirmed backend behavior:
  - Loan requests within the member personal pool are auto-approved and log
    `loan.created` plus `loan.auto_approved_by_pool`.
  - Loan requests above the personal pool remain pending/incomplete until both
    guarantor count and locked pledge coverage meet the required gap.
  - Current guarantor policy is tiered as 4 / 8 / 12 guarantors, not 1 / 2.
    Do not silently change this without explicit product-owner approval because
    it is a business-policy change.
  - Guarantor approval locks pledge exposure and logs guarantor/guarantee
    events; repayment should release those locks.
  - Bank reconciliation can create expected repayment records and auto-apply a
    matching bank event to the repayment service.
- Safe corrections made:
  - `gmfn_backend/app/services/trust_events_services.py` now accepts the
    repayment-service full-repayment call shape, including `amount`,
    `confirmed_by_user_id`, `payment_reference`, `reason`, `commit`, and
    `refresh`.
  - `gmfn_backend/app/services/trust_score_service.py` now treats legacy
    `loan.repaid` events as full-repayment trust evidence.
  - `gmfn_backend/app/api/routes/loans.py` loan summary now returns
    `personal_pool_at_request`, `pool_used`, and `guarantee_gap` so frontend
    support screens can show the pool/gap story instead of defaulting to zero.
  - `frontend/src/pages/GuarantorInboxPage.tsx` now lets a guarantor approve or
    decline a pending request directly from the inbox, with success/error
    feedback and a queue refresh.
  - Added `gmfn_backend/tests/test_repayment_completion_service.py` to verify
    full repayment records repayment proof, releases guarantor lock, and keeps
    `payment_reference` / `confirmed_by_user_id` in TrustEvent metadata.
- Remaining product decisions / risks:
  - The product-owner mentioned one/two guarantor examples, but live rules use
    4/8/12. This should be treated as a separate policy discussion.
  - Bank details are recorded payout/rail evidence in the pilot; external bank
    ownership verification and actual payout execution are still not connected.
  - Older dormant guarantor tests appear to reference removed service names and
    should be cleaned in a later test-suite maintenance pass.
- Verification:
  - `python -m pytest gmfn_backend/tests/test_repayment_completion_service.py -q`
    passed.
  - `npm run build` passed in `frontend`.

### Bank rails, repayment, and guarantor commission audit addendum

- Product-owner asked to inspect bank rails, borrowing repayment, payback,
  commissions, and guarantor commissions before wider testing continues.
- Applied the safest contract fixes found during the audit:
  - `frontend/src/lib/api.ts`
    - `createPoolInstruction` and `createLoanInstruction` now send JSON bodies
      to `/payment-instructions/pool` and `/payment-instructions/loan`, matching
      the backend contract.
    - Bank Console manual ingest now sends a JSON body to `/bank/ingest`,
      matching the backend contract.
    - Bank Console/finance bank reads and reconciliation now pass the selected
      clan as `X-Clan-Id` instead of relying only on ignored `clan_id` query
      parameters.
    - `listExpectedPayments` now targets the mounted `/bank/expected` route
      instead of the non-mounted `/bank-reconciliation/expected` path.
  - `frontend/src/lib/communityMoney.ts`
    - Money In and loan repayment instruction generation now use JSON-body
      POST calls instead of query-string no-body POST calls.
  - `gmfn_backend/app/api/routes/admin_pool.py`
    - Admin pool confirmation now calls `confirm_pool_event` using the correct
      `confirmed_by_user_id` parameter.
    - Admin pool confirmation now catches the service's `ValueError` cleanly
      instead of allowing a not-found/mismatch case to become a server error.
  - `gmfn_backend/app/api/routes/admin_repayments.py`
    - Admin manual repayment confirmation now loads the borrower and calls the
      canonical `create_repayment` service with `payer`, `payment_reference`,
      and `confirmed_by_user_id`.
  - `gmfn_backend/app/services/repayments_service.py`
    - `create_repayment` now accepts optional `payment_reference` and
      `confirmed_by_user_id` so admin/bank-origin repayments can preserve
      reference evidence in trust metadata.
  - `gmfn_backend/app/services/bank_application_service.py`
    - Reconciled repayment application now passes the matched bank reference
      into repayment creation.
  - `gmfn_backend/app/api/routes/bank.py`
    - Fixed the expected pool deposit reference generator that was calling
      `build_reference` with unsupported keyword arguments.
  - `gmfn_backend/app/services/guarantor_earnings_service.py`
    - Updated dormant guarantor earnings materialization to use
      `get_loan_revenue_allocation` and `share_amount`, matching the active
      revenue-allocation service.
- Confirmed remaining structural risks:
  - Duplicate mounted routes still exist for `GET /bank/expected` and
    `POST /bank/reconcile`. The first mounted `/bank` routes currently win.
    This was documented but not removed because deleting/remounting finance
    routes is a higher-risk cleanup.
  - Pool deposit instruction creates an expected payment, while the older pool
    deposit request flow creates a `PoolEvent`. A future pass should decide
    whether one guided pay-in action should create both records or whether the
    old pool-event request path should be retired.
  - Active guarantor commission logic currently computes entitlement from loan
    revenue allocation; there is not yet a full paid/pending/payout lifecycle
    for guarantor earnings.
- Verification:
  - `npm run build` passed in `frontend`.
  - `python -m compileall app` passed in `gmfn_backend`.
  - `python -m pytest tests/test_reconciliation_integrity.py tests/test_clan_pool.py -q`
    passed in `gmfn_backend` (`5 passed`).
  - `python -m compileall app\api\routes\clans.py app\services\invites_service.py`
    passed from `gmfn_backend`.

### Create-entry payment-record explanation addendum

- Product-owner reported that WhatsApp testers can become cautious when the
  create-community flow asks for bank/account details before they understand
  what GSN does.
- Updated `frontend/src/pages/CreateEntryPage.tsx` only:
  - Renamed the second visible stage from "Verification and bank rails" to
    "Verification and payment record".
  - Added a default-open "Read this first" explanation before the account or
    wallet fields.
  - The explanation states that GSN does not keep money, and that account/wallet
    details are recorded so future support, repayments, payouts, and trust
    evidence can be matched to the right person.
  - Added a public `/guide` link labeled "Read My GSN and I" from the same
    explanation card.
- No backend route, schema, auth, verification, bank, or payment logic changed.
- Verification:
  - `npm run build` passed in `frontend`.

### Create-entry password-in-first-block addendum

- Product-owner confirmed the first create-community block should be a complete
  account setup block, not only name/phone/email.
- Updated `frontend/src/pages/CreateEntryPage.tsx`:
  - Block 1 now asks for email, password, and repeat password.
  - Email is now required in the create-entry UI.
  - Password must be at least 6 characters and match before phone verification
    can start.
  - Final create-entry submission sends `password` and `confirm_password`.
- Updated `gmfn_backend/app/api/routes/entry.py`:
  - `/entry/create` now accepts optional `password` and `confirm_password`.
  - When provided, the password is validated, hashed, and saved immediately for
    the founder account.
  - The response includes an access token, allowing the frontend to continue
    into the app without sending the founder to activation-password setup again.
  - Older callers that do not send a password still keep the previous
    `PENDING_APPROVAL` activation behavior.
- No database schema, migrations, auth core, permission core, or payment logic
  changed.
- Verification:
  - `npm run build` passed in `frontend`.
  - `python -m compileall app\api\routes\entry.py` passed from `gmfn_backend`.

### Create-entry guide-placement correction addendum

- Product-owner clarified that the "why GSN asks for account/wallet details"
  explanation should not replace or sit inside Block 2.
- Corrected `frontend/src/pages/CreateEntryPage.tsx`:
  - The create guide now opens by default and is labeled "Read First".
  - The account/wallet explanation now sits in the "My GSN and I guide" area
    before the user works through the blocks.
  - Block 2 title and purpose were restored to "Verification and bank rails".
  - Block 2 again presents the practical phone verification, bank destination,
    region explanation, and optional licence proof step.
- No backend route, auth, schema, bank, verification, or payment logic changed.
- Verification:
  - `npm run build` passed in `frontend`.

### Create-entry guide simplification addendum

- Product-owner clarified the account/wallet explanation should not appear as
  a separate extra card because it makes the create flow look more complex.
- Updated `frontend/src/pages/CreateEntryPage.tsx` only:
  - Removed the separate "Why GSN asks for your account or wallet details"
    card from the open create guide.
  - Folded that explanation directly into guide step `2. Verification and bank
    rails`.
  - Kept the practical visible Block 2 as `Verification and bank rails`.
  - Removed the now-unused `OriginLink` import from the page.
- No backend route, auth, schema, bank, verification, payment, or route
  contract changed.
- Verification:
  - `npm run build` passed in `frontend`.

### Create-entry read-first gate addendum

- Product-owner clarified that the `Read First` guide should sit in the body of
  the create-community screen, not as an abstract top-right header action.
- Updated `frontend/src/pages/CreateEntryPage.tsx` only:
  - Replaced the top subtitle `Founder entry and verification` with `Start a
    new community`.
  - Removed the top-right `About / Read First` launcher from the entry header.
  - Renamed the hero label from `Create entry` to `Create community`.
  - Placed the `Read First` button directly under `Start a new community`.
  - Block 1 no longer opens by default for a plain create-community entry.
  - The guide now has a clear `Done, start Block 1` action; pressing it closes
    the guide and opens Block 1.
  - Pressing the locked Block 1 button before reading opens the guide instead
    of exposing the form.
- Existing entry API calls, password/account setup fields, verification steps,
  bank rails, community creation submission, auth, schema, invite/join routes,
  and backend contracts were not changed.
- Verification:
  - `npm run build` passed in `frontend`.

### Controlled WhatsApp/start-link routing addendum

- Product-owner clarified that early testers will mostly receive links through
  WhatsApp/Telegram/direct messages, and those links should make the intended
  lane obvious without showing multiple first-step choices.
- Added frontend start-route aliases in `frontend/src/App.tsx`:
  - `/start`, `/start/create`, and `/start/community` open the create-community
    lane through `/cover?entry=create`.
  - `/start/join/:code` and `/start/invite/:code` open the invite/join lane
    through `/cover?entry=invite&invite_code=:code`.
  - `/start/existing`, `/start/member`, and `/start/login` open the
    existing-member lane through `/cover?entry=existing`.
- Updated backend-generated invite links so new share links point to
  `/start/join/{invite_code}` while preserving community, marketplace, and
  inviter query context:
  - `gmfn_backend/app/api/routes/clans.py`
  - `gmfn_backend/app/services/invites_service.py`
- Plain `https://gmfn-frontend.onrender.com` still enters the controlled
  create-community pilot flow through `/cover`.
- Existing older routes such as `/invite/:code`, `/get-invite/:code`,
  `/join/community/:clanId`, `/public-create`, `/founder`, and `/existing` were
  preserved.
- No database schema, auth core, permission core, payment, ledger, invite
  validation, or join-request backend rules changed.
- Verification:
  - `npm run build` passed in `frontend`.
  - `python -m compileall app\api\routes\clans.py app\services\invites_service.py`
    passed from `gmfn_backend`.

### Marketplace WhatsApp link block normalization addendum

- Product-owner asked how the new `/start/...` links affect Marketplace-owned
  link blocks and whether marketplace-tailored information still travels with
  the link.
- Updated `frontend/src/pages/MarketplacePage.tsx` only:
  - Marketplace invite payloads are now normalized into
    `/start/join/{invite_code}` before the page displays, copies, or opens the
    join link.
  - The normalization preserves existing query context such as invite code,
    community name, community code, marketplace name, and inviter name.
  - Legacy invite formats like `/join?code=...`, `/join/community/...`, and
    `/invite/...` are converted into the newer start-link shape when enough
    invite-code information is present.
  - The Marketplace-owned links copy now calls the first card a
    `WhatsApp join link` and explains that the link still knows which
    marketplace invited the person.
- This is a frontend display/share normalization only. It does not change
  invite creation, invite validation, join-request submission, auth, schemas,
  payments, ledger behavior, or backend permissions.
- Verification:
  - `npm run build` passed in `frontend`.

### Admin command-centre executive surface addendum

- Product-owner liked the deep navy, blue-white, and muted gold executive
  language on the create-community entry page and asked to replicate that
  first on the admin side.
- Updated `frontend/src/pages/TrustCommandCentrePage.tsx` only:
  - Added a route-local executive admin shell using the same institutional
    navy, blue-white, and gold surface family.
  - Restyled command-centre cards, stat tiles, route tiles, badges, input
    fields, and action/collapse buttons to feel more serious and bank-standard.
  - Tightened admin buttons with larger hit areas, rounded shapes,
    tap-highlight removal, and isolated pointer surfaces.
  - Applied the same shell to the loading state so the admin route does not
    flash back to the old plain white surface while loading.
- This is visual-only route-local work for `/app/command-center`. No backend
  route, admin permission, auth, schema, API contract, member dashboard,
  Marketplace, Finance, Trust Passport, or frozen Market Wisdom behavior was
  changed.
- Verification:
  - `npm run build` passed in `frontend`.

### Create-entry existing-member escape addendum

- Product-owner observed that the controlled create link now sends testers from
  cover directly into the create-community path, which is correct for new
  founders but confusing for someone who is already a member.
- Updated `frontend/src/pages/CreateEntryPage.tsx` only:
  - Added a small collapsed `Already a member?` card near the top of the
    create-community page.
  - Opening it explains that existing members should not create another
    account/community just to continue.
  - The `I am already a member` action stores the entry mode as `existing`,
    clears create/invite entry storage, and sends the user to
    `/login?entry=existing&force=1`.
  - `force=1` keeps the sign-in page from silently bypassing the email/password
    check if a stale token exists during testing.
- The create-community, invite/join, activation, backend auth, schemas,
  permissions, and membership rules were not changed.
- Verification:
  - `npm run build` passed in `frontend`.

### Create-entry existing-member placement and memory addendum

- Product-owner clarified that the `Already a member?` escape should not sit in
  the middle of the create-community explanation because it interrupts the
  creation story.
- Updated `frontend/src/pages/CreateEntryPage.tsx` only:
  - Moved the `Already a member?` card to the top of the create page, before
    the create-community story begins.
  - Removed the duplicate/old placement from inside the create-community story.
  - Added a route-local local-storage choice
    `gmfn.createEntry.existingMemberChoice.v1`.
  - When a user chooses `I am already a member`, the create form is tucked away
    on that device and the page opens in existing-member mode next time.
  - Added `Start a new community instead` so a mistaken existing-member choice
    can be safely reversed without clearing browser data.
- This remains frontend route-local. No backend, auth core, schema, invite,
  join, membership, payment, or permission behavior was changed.
- Verification:
  - `npm run build` passed in `frontend`.

### Existing-member sign-in return-path correction addendum

- Product-owner tested the `Already a member?` path and found that after
  signing in, the user returned to the create-community page instead of entering
  the app workspace.
- Corrected `frontend/src/pages/CreateEntryPage.tsx` only:
  - The existing-member action still sends the user to
    `/login?entry=existing&force=1`.
  - It no longer passes `/create` as the login return location.
  - Removed the remembered create-page hiding behavior from the create page so
    existing-member guidance behaves as a simple doorway to sign-in, not a
    second mode on the create screen.
  - Updated the visible explanation to tell the user that after sign-in the app
    opens their workspace instead of returning to the create-community form.
- Login behavior itself, backend auth, tokens, schemas, invite/join paths, and
  membership rules were not changed.
- Verification:
  - `npm run build` passed in `frontend`.

### Pool deposit instruction reconciliation bridge addendum

- Product-owner asked to continue with the next safest bank-rails correction
  before committing the current work.
- Confirmed risk:
  - New pool Money In instructions created an `ExpectedPayment`.
  - Older pool deposit flow created a `PoolEvent`.
  - Bank reconciliation could only auto-confirm pool money into the member pool
    when it found a matching `PoolEvent`, so instruction-generated deposits
    could reconcile at bank level but fail downstream with `pool_event_not_found`.
- Updated `gmfn_backend/app/services/payment_instruction_service.py`:
  - `create_pool_deposit_instruction` now creates a pending
    `PoolEvent(event_type="deposit.requested")` with the exact same generated
    reference as the `ExpectedPayment`.
  - The `ExpectedPayment.meta_json` now stores `pool_event_id`, `source`, and
    `reference`.
  - The instruction response now includes `pool_event_id`.
  - Currency is normalized to uppercase and amount is validated as positive in
    the service, not only at the API schema boundary.
- Updated `frontend/src/lib/communityMoney.ts`:
  - Normalizes the optional backend `pool_event_id` response as `poolEventId`.
- Updated `gmfn_backend/tests/test_reconciliation_integrity.py`:
  - Test fixture now creates both core app metadata and bank metadata because
    `pool_events` and `expected_payments` live under different Base metadata
    objects in the current codebase.
  - Added a test proving that a pool instruction generates a linked pool event
    and bank reconciliation turns it into `deposit.confirmed`.
- No public route path, request body, database schema, migration, auth,
  permission, settlement config, or old `/pool/deposits/request` contract was
  changed.
- Verification:
  - `python -m compileall app` passed in `gmfn_backend`.
  - `python -m pytest tests/test_reconciliation_integrity.py tests/test_clan_pool.py -q`
    passed: 6 tests.
  - `npm run build` passed in `frontend`.

### Bank duplicate-route surface cleanup addendum

- Product-owner asked to continue with the remaining low-risk interconnected
  correction before committing, so the bank-rails pieces can be tested together.
- Confirmed `frontend/src/pages/ShopControlPage.tsx` still contains some
  `/api/...` path strings, but its route-local `apiUrl()` helper strips `/api`
  and sends requests through the configured backend API base. No frontend
  correction was needed there.
- Updated `gmfn_backend/app/api/router.py`:
  - Unmounted the legacy `bank_reconciliation.py` router.
  - Kept the route file itself in the repo; no code was deleted.
  - Canonical `/bank` behavior is now owned by `app/api/routes/bank.py`.
- Why this was safe:
  - Active frontend code uses `/bank/ingest`, `/bank/recent`,
    `/bank/unmatched`, `/bank/expected`, `/bank/reconcile`, and `/bank/credits`
    from the canonical `bank.py` router.
  - The legacy router created duplicate `GET /bank/expected` and
    `POST /bank/reconcile` registrations.
  - It also exposed older `/bank/events` and generic expected-payment surfaces
    that are not active frontend routes and should not be part of the pilot
    bank surface without deliberate review.
- Updated docs:
  - `docs/ENDPOINT_AUDIT_2026-04-21.md`
  - `docs/BACKEND_ADMIN_VAULT_COMPLETION_PROGRAM_2026-04-21.md`
  - `docs/DORMANT_ROUTE_CLASSIFICATION_2026-04-21.md`
- Verification:
  - `python -m compileall app\api\router.py app\api\routes\bank.py app\api\routes\bank_reconciliation.py`
    passed from `gmfn_backend`.
  - `python -m pytest tests/test_reconciliation_integrity.py tests/test_clan_pool.py -q`
    passed: 6 tests.
  - Local duplicate-route inspection no longer reports `GET /bank/expected` or
    `POST /bank/reconcile`. Remaining duplicate route warnings are trust/admin
    pre-existing items, not bank routes.

### Guarantor earnings lifecycle clarity addendum

- Product-owner asked to continue through the remaining low-risk bank-rails
  surface corrections before committing/deploying the interconnected batch.
- Confirmed risk:
  - `/guarantor-earnings/me` returned a calculated guarantor reward share but
    did not say whether the share was merely potential, actually earned, or
    blocked by an unclean loan outcome.
  - The frontend therefore had to infer status and could make pending support
    look like completed earnings.
- Updated `gmfn_backend/app/services/revenue_allocation_service.py`:
  - `get_my_guarantor_earnings` now returns `estimated_amount`,
    `payable_amount`, `earning_status`, `status_note`, `loan_status`,
    `guarantor_status`, `clan_id`, `created_at`, and `updated_at` per row.
  - `total_earned`/`total_payable` now represent only reward value earned after
    the supported loan is fully repaid.
  - `total_estimated`, `total_pending`, and `total_blocked` keep the wider
    support-share picture visible without calling it payable money too early.
  - `get_loan_revenue_allocation` now also returns `clan_id` and
    `loan_status` metadata.
- Updated frontend clarity:
  - `frontend/src/pages/GuarantorEarningsPage.tsx` now distinguishes
    `Potential share` from `Total earned`.
  - Recent rows show the loan status and lifecycle note.
  - `frontend/src/pages/FinancePage.tsx` now calls the summary
    `Earned guarantor value` and includes row status in the guarantor earnings
    table.
- Added `gmfn_backend/tests/test_guarantor_earnings_service.py`:
  - Covers pending reward share before repayment.
  - Covers earned/payable reward after full repayment.
- This is still not a payout implementation. It does not move money, create
  payout rows, alter payment/ledger tables, change auth, change schemas, or add
  migrations.
- Verification:
  - `python -m compileall app` passed from `gmfn_backend`.
  - `python -m pytest tests\test_guarantor_earnings_service.py tests\test_reconciliation_integrity.py tests\test_clan_pool.py -q`
    passed: 8 tests.
  - `npm run build` passed in `frontend`.

### Create-entry Block 2 phone-code clarity addendum

- Product-owner sent a phone screenshot showing that after Block 1, Block 2
  opened with a `Verification code` field under `Verification and bank rails`.
  This felt like a mistake because testers had not clearly received a phone
  code and expected bank/account details.
- Confirmed from code:
  - Block 1 starts `/entry/phone/start`.
  - Block 2 first enters the temporary `verify` state.
  - Only after `/entry/phone/confirm` does the bank/account form open.
  - The repo has no live SMS sender wired for this route, so Render could ask
    for a code while returning no visible code unless `GMFN_DEV_MODE` was set.
- Updated `gmfn_backend/app/api/routes/entry.py`:
  - Added pilot-safe `GMFN_ENTRY_PHONE_DELIVERY` handling.
  - Default delivery is `preview`, so controlled testing shows the OTP code.
  - Future live SMS can disable preview by setting
    `GMFN_ENTRY_PHONE_DELIVERY` away from `preview`/`pilot`/`manual`.
- Updated `frontend/src/pages/CreateEntryPage.tsx`:
  - Block 2 title is now dynamic:
    - `Phone code first` while waiting for phone confirmation.
    - `Bank and wallet details` after phone confirmation.
    - `Verification and bank rails` before Block 2 is reached.
  - Added a simple explanatory card: Block 2 has two parts; confirm phone,
    then account/wallet details open.
  - Pilot OTP preview explains that the visible code appears because live SMS
    is not connected yet.
  - Button label changed from `Submit Block 2` to `Confirm phone code` for the
    phone step.
- No entry database schema, auth token logic, community creation contract, bank
  details endpoint, invite/join route, or payment/ledger behavior changed.
- Verification:
  - `python -m compileall app\api\routes\entry.py` passed from
    `gmfn_backend`.
  - `npm run build` passed in `frontend`.

### Create-entry phone proof feedback addendum

- Product-owner clarified that after confirming the phone code, the app should
  tell the user that the phone has been verified and registered against their
  name, and should return a trust-event response instead of silently moving to
  the next fields.
- Confirmed from code:
  - A permanent `TrustEvent` needs a real `User` and community context.
  - The create-entry flow only has an `EntryPhoneVerification` row at the
    phone-confirm step.
  - The permanent `identity.phone_verified` TrustEvent is already written when
    `/entry/create` completes and creates the founder user/community.
- Updated `gmfn_backend/app/api/routes/entry.py`:
  - `/entry/phone/confirm` now returns `verified_at`,
    `confirmation_message`, and `trust_event_response`.
  - `trust_event_response.event_type` is `identity.phone_verified`.
  - `trust_event_response.status` is `ready_for_registration`, meaning the
    phone proof is ready and will become a permanent trust event when the
    community creation finishes.
- Updated `frontend/src/pages/CreateEntryPage.tsx`:
  - After the phone code is confirmed, Block 2 now shows a `Phone verified`
    proof card with the user's name, phone number, and trust-event response.
  - The success message now uses the backend confirmation text when available.
- Updated `gmfn_backend/tests/test_entry_create.py`:
  - The entry flow test now asserts the new confirmation and trust-event
    response fields.
- No database schema, auth core, invite/join logic, phone-code validation,
  bank details logic, payment, ledger, or permanent TrustEvent timing changed.
- Verification:
  - `python -m compileall app\api\routes\entry.py` passed from
    `gmfn_backend`.
  - `python -m pytest tests\test_entry_create.py -q` passed: 9 tests.
  - `npm run build` passed in `frontend`.

### Bank rails payout destination alignment addendum

- Product-owner asked to continue with the safest bank-rails corrections while
  waiting for live testing.
- Confirmed from code:
  - Backend `/withdrawal-destinations/me` already accepts and stores `country`
    and `currency` on payout destinations.
  - Frontend `PayoutDetailsPage` collected those values, but the shared
    withdrawal-destination API helper did not forward them as first-class
    fields.
- Updated `frontend/src/lib/api.ts`:
  - `saveWithdrawalDestination` and `updateWithdrawalDestination` payloads now
    accept `country` and `currency`.
  - `normalizeWithdrawalDestinationPayload` now forwards `country` and
    uppercased `currency` to the backend.
- Updated `frontend/src/pages/PayoutDetailsPage.tsx`:
  - Save payload now includes `country` and `currency` as real fields.
  - Copied payout summary now uses ASCII fallback dashes for missing fields.
- Updated `frontend/src/pages/PaymentRailsPage.tsx`:
  - Improved contrast on the dark Payment Rails intelligence card.
  - Fixed a pale text color in the white structured rail section.
- No backend route, schema, migration, reconciliation logic, payment movement,
  ledger behavior, auth, or permission behavior was changed.
- Verification:
  - `git diff --check -- frontend/src/lib/api.ts frontend/src/pages/PayoutDetailsPage.tsx frontend/src/pages/PaymentRailsPage.tsx`
    passed with only existing line-ending warnings.
  - `npm run build` passed in `frontend`.

### Bank rails achievement-feedback addendum

- Product-owner clarified that every practical achievement in the bank/rails
  entry line should give immediate human feedback, including trust-event-style
  feedback separate from notifications.
- Confirmed safety decision:
  - `identity.bank_destination_recorded` already affects trust scoring when
    written as a permanent `TrustEvent`.
  - To avoid noisy repeated scoring events when users edit payout details, this
    change adds immediate proof-style `trust_event_response` messages without
    creating extra permanent scoring events at payout-edit time.
- Updated `gmfn_backend/app/api/routes/entry.py`:
  - `/entry/bank-details` now returns `confirmation_message` and
    `trust_event_response` for the bank/wallet proof recorded during founder
    onboarding.
- Updated `gmfn_backend/app/api/routes/withdrawal_destinations.py`:
  - `/withdrawal-destinations/me` GET/POST/PATCH payloads now include
    `confirmation_message` and `trust_event_response`.
  - The message explains that the payout destination tells GSN where approved
    withdrawals should go, but it does not move money by itself.
  - It also explains that external bank-rail ownership verification is still a
    separate future connection.
- Updated frontend proof surfaces:
  - `frontend/src/pages/CreateEntryPage.tsx` now shows a persistent
    `Bank and wallet proof recorded` card after Block 2 bank details save.
  - `frontend/src/pages/PayoutDetailsPage.tsx` now shows a persistent
    `Trust event response` card after payout details are saved.
- No schema, migration, auth, permission, payment movement, ledger movement, or
  permanent TrustEvent timing was changed.
- Verification:
  - `python -m compileall app\api\routes\entry.py app\api\routes\withdrawal_destinations.py`
    passed from `gmfn_backend`.
  - `python -m pytest tests\test_entry_create.py -q` passed: 9 tests.
  - `npm run build` passed in `frontend`.
  - `git diff --check -- gmfn_backend/app/api/routes/entry.py gmfn_backend/app/api/routes/withdrawal_destinations.py frontend/src/pages/CreateEntryPage.tsx frontend/src/pages/PayoutDetailsPage.tsx gmfn_backend/tests/test_entry_create.py`
    passed with only existing line-ending warnings.

### Create-entry Block 2 pilot auto-confirm addendum

- Product-owner re-tested onboarding from Render and still saw Block 2 open as
  a `Verification code` screen with the old `Verification and bank rails` /
  `Submit Block 2` language.
- Confirmed current architecture:
  - Backend still requires phone verification before `/entry/bank-details`.
  - During pilot testing, `/entry/phone/start` returns `otp_preview` because
    live SMS is not connected.
  - The confusing part was frontend presentation: testers had to manually copy
    the preview code before reaching the practical bank/wallet fields.
- Updated `frontend/src/pages/CreateEntryPage.tsx` only:
  - Block 2 now presents as `Bank and wallet details` by default.
  - If the backend returns an `otp_preview`, the frontend immediately confirms
    it and opens the bank/wallet fields.
  - The manual phone-code form remains only as a fallback for future live SMS
    or if pilot auto-confirm fails.
  - The bank/wallet account-name field now pre-fills from the entered street
    name when possible.
  - The bank save button now reads `Save bank and wallet details` instead of
    the generic `Submit Block 2`.
  - The guide copy now says `Bank and wallet details` and explains that the
    phone check protects the record in the background.
- Onboarding-line audit result:
  - `/entry/phone/start`, `/entry/phone/confirm`, `/entry/bank-details`, and
    `/entry/create` are still distinct and aligned.
  - Permanent TrustEvents are still written at `/entry/create`, not repeatedly
    during temporary entry steps.
  - Starter-trust notifications are still created after community creation.
  - Activation page already gives success feedback and links to Notifications,
    Trust, and the next workspace step.
- No backend route, schema, migration, auth core, invite/join flow, payment
  movement, ledger movement, permanent TrustEvent timing, or notification
  pipeline was changed in this Block 2 pass.
- Verification:
  - `npm run build` passed in `frontend`.
  - `python -m pytest tests\test_entry_create.py -q` passed: 9 tests.
  - `git diff --check -- frontend/src/pages/CreateEntryPage.tsx gmfn_backend/app/api/routes/entry.py gmfn_backend/tests/test_entry_create.py`
    passed with only existing line-ending warnings.

### Bank console achievement-feedback polish addendum

- Product-owner returned to the bank-rails work while waiting for Render to
  finish redeploying the previous backend/frontend batch.
- Confirmed status:
  - The pilot bank-rails path now has expected payments, generated references,
    pool deposit reconciliation bridge, repayment reconciliation application,
    payout destination proof, and guarantor earnings lifecycle clarity.
  - It is not yet a full production banking system because external bank
    ownership verification and actual payout execution are still deliberately
    not connected.
- Updated `frontend/src/pages/BankConsolePage.tsx` only:
  - Manual bank-event ingest feedback now shows event id, status, reference,
    reason when available, and the next step to run reconciliation.
  - Reconciliation feedback now reports seen, confirmed, partial, pending,
    mismatch, and duplicate counts.
  - If pending or mismatch items remain, the message tells the admin not to
    treat the rail as settled until review is complete.
- No backend route, schema, migration, reconciliation algorithm, ledger,
  payout movement, auth, permission, or expected-payment contract was changed.
- Verification:
  - `npm run build` passed in `frontend`.

### Create-entry bank/wallet pilot stabilization addendum

- Product-owner is actively testing public create-entry links with UK and
  Nigeria testers, and asked not to commit/deploy this local batch yet.
- Confirmed current certification level:
  - The create-entry bank/wallet route is pilot-safe for controlled testing.
  - It is not production-certified banking yet because live SMS OTP, live bank
    provider configuration for all regions, and real payout execution are still
    separate production rails.
- Updated `gmfn_backend/app/api/routes/entry.py`:
  - `/entry/phone/start` can now resume an unfinished, unconsumed phone session
    for the same phone plus matching email/name instead of trapping testers
    behind `Phone number already registered`.
  - Resumed sessions extend expiry and report whether the phone and bank/wallet
    details are already recorded.
  - Scotland, Wales, and Northern Ireland are now treated as GB country hints.
- Updated `gmfn_backend/app/api/routes/entry_verification.py`:
  - Bank and licence verification region names now normalize common country
    labels such as United Kingdom, Scotland, Nigeria, Ghana, Kenya, and USA
    before routing to verification providers.
- Updated `frontend/src/pages/CreateEntryPage.tsx`:
  - Block 2 now gives country choices instead of a blank bank-country textbox.
  - Country selection suggests the likely currency.
  - UK testers are guided to use United Kingdom for Scotland/England/Wales/
    Northern Ireland.
  - Bank-verification feedback now explains in plain language when details were
    recorded but the live provider is unavailable for the pilot region.
  - If a real completed account already owns the phone number, the page opens
    the Already-a-member path instead of encouraging a second create entry.
- Updated `gmfn_backend/tests/test_entry_create.py`:
  - Added regression coverage for resuming unfinished verified sessions.
  - Added regression coverage for resuming unfinished sessions after bank/wallet
    details are already recorded.
- Verification:
  - `python -m pytest tests\test_entry_create.py -q` passed: 12 tests.
  - `python -m compileall app\api\routes\entry.py app\api\routes\entry_verification.py app\services\verification_router.py app\services\verification_adapters\bank_truelayer_gb.py`
    passed from `gmfn_backend`.
  - `npm run build` passed in `frontend`.
  - `git diff --check` passed with only Windows line-ending warnings on edited
    frontend files.
- Do not commit or deploy this batch until the product-owner confirms the next
  testing feedback bundle is ready.

### Daily pilot link/session lifetime addendum

- Product-owner reported that a Nigeria tester returned after more than one
  hour and saw the public join page reject the invitation as no longer valid or
  not copied fully.
- Confirmed from code:
  - Create-entry phone proof was still one hour by default in pilot preview
    mode.
  - Normal clan invite packages are usually seven days, but older/alternate
    short-lived invite records could still expire too quickly for remote
    WhatsApp testing.
- Updated `gmfn_backend/app/api/routes/entry.py`:
  - Pilot/preview entry phone sessions now default to 24 hours.
  - Live SMS mode still defaults to the shorter 10-minute window unless
    `GMFN_ENTRY_PHONE_SESSION_MINUTES` overrides it.
- Updated `gmfn_backend/app/api/routes/clans.py` and
  `gmfn_backend/app/services/invites_service.py`:
  - Added a configurable minimum invite lifetime via
    `GMFN_JOIN_INVITE_MIN_TTL_HOURS`.
  - Default is 24 hours for the current controlled pilot.
  - If an invite code exists but was created with a shorter expiry, the backend
    treats it as valid until at least 24 hours after creation.
  - This does not rescue links whose invite code was never created on the
    active Render database or was copied incompletely.
- Updated tests:
  - Entry phone preview lifetime now expects about 24 hours.
  - Public join request accepts a short-lived package invite during the daily
    pilot window.
  - Public join request still rejects that same kind of invite after the daily
    pilot window.
- Verification:
  - `python -m pytest tests\test_entry_create.py tests\test_join_requests.py -q`
    passed: 16 tests.
  - `python -m compileall app\api\routes\entry.py app\api\routes\clans.py app\services\invites_service.py`
    passed from `gmfn_backend`.
- Later production decision:
  - Reduce `GMFN_JOIN_INVITE_MIN_TTL_HOURS` and
    `GMFN_ENTRY_PHONE_SESSION_MINUTES` back toward one or two hours when the
    outside-circle test moves beyond controlled pilot testing.

### Controlled pilot relaxations register addendum

- Product-owner clarified the current testing philosophy:
  - keep the pilot moving for known testers,
  - allow selected rails to behave as recorded/accepted during testing,
  - but record every suspended or simulated external dependency so it can be
    restored before wider public launch.
- Updated `docs/PILOT_TEST_FLOW_2026-04-21.md` with a controlled-relaxations
  register covering:
  - phone proof / live SMS OTP,
  - bank and wallet destination recording,
  - payment expectations and reconciliation,
  - payout destination and money-out execution,
  - invite-link lifetime,
  - trust-event-style feedback versus permanent trust scoring events.
- Current engineering interpretation:
  - It is acceptable in the controlled pilot for GSN to record bank/wallet
    details and continue even when a live bank provider is not configured.
  - It is acceptable for admin/manual bank-event ingest to support controlled
    reconciliation tests.
  - It is not acceptable to call these final production bank ownership checks,
    real payout execution, or certified banking rails until the external
    providers and audit controls are connected.
- Practical language standard:
  - Each step should explain what was recorded, what it proves, and what is
    still pending.
  - Users should not be left with a cold `saved`, `failed`, or raw provider
    message when the app already knows the next safe thing to do.

### Marketplace WhatsApp join-link recovery addendum

- Product-owner tested Marketplace-owned links on phone and saw the WhatsApp
  join link still showing `Join link not ready yet` while the marketplace view
  link was ready.
- Confirmed from code:
  - The backend `GET /clans/{clan_id}/invite-link` requires the active
    `X-Clan-Id` header to match the `clan_id` in the URL.
  - The frontend helper was using the stored selected clan header by default,
    which could be stale or different from the Marketplace page's active
    community id.
- Updated `frontend/src/lib/api.ts`:
  - `getClanInviteLink(clanId)` and `createClanInvite(clanId)` now send the
    same `clanId` as the explicit `X-Clan-Id` header.
- Updated `frontend/src/pages/MarketplacePage.tsx`:
  - The `Create / Refresh` action now surfaces the backend error instead of
    silently converting every failure into `Invite link is not ready yet`.
- No backend permission, invite lifetime, schema, auth, or route contract was
  changed.
- Verification:
  - `npm exec -- eslint src/pages/MarketplacePage.tsx` passed with only the two
    pre-existing hook dependency warnings in that file.
  - `npm run build` passed in `frontend`.
  - `git diff --check -- frontend/src/lib/api.ts frontend/src/pages/MarketplacePage.tsx`
    passed with only Windows line-ending warnings.

### First Circle guided-flow simplification addendum

- Product-owner shared phone feedback that `/app/first-circle` was too complex
  for ordinary testers:
  - repeated `Member` wording made the role unclear,
  - the large progress card looked inactive/confusing,
  - users were getting lost before understanding the next action.
- Confirmed from code:
  - `BuildFirstCirclePage.tsx` had local role values such as `seller`,
    `worker`, and `service-provider`, while shared First Circle logic expects
    canonical values such as `trader`, `supplier`, and `service_provider`.
  - That mismatch caused shared role labels to fall back to generic `Member`.
- Updated `frontend/src/pages/BuildFirstCirclePage.tsx`:
  - Replaced page-local role and relationship lists with the shared
    First Circle role/relationship options.
  - Reworked the top of the page into a guided `Do this now` card with a small
    progress bar and a three-step path: choose role, add people, copy invite.
  - Removed the separate oversized progress-tile block.
  - Made Step 2 depend on Step 1 so the user is guided instead of facing every
    action at once.
  - Changed repeated `Selected`/`Member` style language to clearer terms such
    as `In first circle`, `Included`, and `Not chosen`.
- Updated `frontend/src/lib/firstCircle.ts`:
  - `roleLabel("")` now returns `Not chosen`.
  - First Circle progress no longer gets stuck asking for an operating-pattern
    field that the page does not currently collect.
- No backend route, invite, membership, auth, schema, or navigation contract was
  changed.
- Verification:
  - `npm exec -- eslint src/pages/BuildFirstCirclePage.tsx src/lib/firstCircle.ts`
    passed.
  - `npm run build` passed in `frontend`.
  - `git diff --check -- frontend/src/pages/BuildFirstCirclePage.tsx frontend/src/lib/firstCircle.ts`
    passed with only Windows line-ending warnings.

### Public join-link origin hardening addendum

- Product-owner tested a newly generated Marketplace WhatsApp join link and
  found it opened on the laptop but not on phones because the copied URL used
  `http://localhost:5174/start/join/...`.
- Confirmed root cause:
  - `localhost` only points to the device opening the link. On a phone, it
    points to the phone itself, not the laptop or Render.
  - Public/WhatsApp invite links must not use localhost, 127.0.0.1, or private
    LAN origins such as 192.168.x.x because remote testers cannot open them.

### Spotlight pilot video/queue test checkpoint

- Product-owner requested a temporary pilot path to test many Community Home
  spotlights, including video and image rotation, without the marketplace
  capacity cap blocking uploads during the day.
- Confirmed and preserved the backend source-level pilot override in
  `gmfn_backend/app/api/routes/marketplace.py`:
  - normal spotlight capacity checks are bypassed while the pilot override is
    active.
  - the API now reports queue/count metadata from `GET /marketplace/broadcasts`:
    `matching_total`, `active_total`, `video_total`, `image_total`, and
    `spotlight_capacity_pilot_override_active`.
  - `POST /marketplace/broadcasts` also reports
    `spotlight_capacity_pilot_override_active` so the frontend/admin can see
    the pilot state.
- Kept video guardrails instead of removing them:
  - `gmfn_backend/app/api/routes/marketplace_media.py` now accepts marketplace
    video uploads up to 15 MB.
  - Uploaded spotlight videos must be 10 seconds or shorter by the time they
    reach the backend.
  - Frontend preparation still automatically creates a spotlight-ready clip
    when the selected file is too long or too heavy.
- Updated frontend video preparation:
  - `frontend/src/lib/spotlightMediaPrep.ts` defaults to 15 MB / 10 seconds.
  - `frontend/src/pages/CommunityHomePage.tsx` and
    `frontend/src/pages/ShopControlPage.tsx` use the same 15 MB / 10 second
    pilot limits.
- Updated live spotlight visibility:
  - Community Home now keeps the active spotlight list, shows live/queued
    counts, and rotates through active spotlight items every 30 seconds.
  - Dashboard spotlight data refreshes every 30 seconds, shows the live/queued
    count, and rotates every 30 seconds. The frozen Dashboard Market Wisdom
    section was not changed.
  - Shop Gallery mini spotlight rotation is now 30 seconds.
  - `frontend/src/components/SpotlightMediaFrame.tsx` now shows a small visible
    message if a video fails to play and the fallback cover is shown.
- Important deploy note:
  - If Render still returns `Spotlight capacity reached for clan 3...`, the live
    backend is still serving an older deploy or has not restarted onto the
    current source.
- Verification:
  - `python -m compileall gmfn_backend\app\api\routes\marketplace.py gmfn_backend\app\api\routes\marketplace_media.py`
    passed.
  - `npm exec -- eslint src/pages/CommunityHomePage.tsx src/pages/ShopControlPage.tsx src/pages/ShopGalleryPage.tsx src/pages/DashboardPage.tsx src/components/SpotlightMediaFrame.tsx src/lib/spotlightMediaPrep.ts`
    passed with two pre-existing Shop Control hook dependency warnings.
  - `git diff --check -- frontend/src/pages/CommunityHomePage.tsx frontend/src/pages/ShopControlPage.tsx frontend/src/pages/ShopGalleryPage.tsx frontend/src/pages/DashboardPage.tsx frontend/src/components/SpotlightMediaFrame.tsx frontend/src/lib/spotlightMediaPrep.ts gmfn_backend/app/api/routes/marketplace.py gmfn_backend/app/api/routes/marketplace_media.py`
    passed with only Windows line-ending warnings.
  - `npm run build` passed in `frontend`.

- Updated backend link builders:
  - `gmfn_backend/app/api/routes/clans.py` now uses configured public frontend
    URL first, then only a public request origin, then
    `https://gmfn-frontend.onrender.com`.
  - `gmfn_backend/app/services/invites_service.py` now accepts
    `FRONTEND_BASE_URL`, `GMFN_FRONTEND_BASE_URL`, or `PUBLIC_FRONTEND_URL`
    only when the value is public; private/local values fall back to Render.
- Updated frontend Marketplace link normalization:
  - `frontend/src/pages/MarketplacePage.tsx` now rewrites generated join links
    to a public frontend origin when the browser is running on localhost,
    127.0.0.1, or a private LAN address.
  - `frontend/.env.production.example` now documents
    `VITE_PUBLIC_FRONTEND_URL=https://gmfn-frontend.onrender.com`.
- Added regression coverage:
  - `gmfn_backend/tests/test_frontend_link_origins.py` verifies that localhost
    and private LAN origins do not leak into public invite links.
- No invite-code validity, invite lifetime, join approval, auth, schema,
  membership, or permission rules were changed.
- Verification:
  - `python -m pytest tests\test_frontend_link_origins.py -q` passed: 6 tests.
  - `python -m pytest tests\test_join_requests.py tests\test_frontend_link_origins.py -q`
    passed: 12 tests.
  - `python -m compileall app\api\routes\clans.py app\services\invites_service.py`
    passed.
  - `npm run build` passed in `frontend`.
  - `git diff --check -- frontend/.env.production.example frontend/src/pages/MarketplacePage.tsx gmfn_backend/app/api/routes/clans.py gmfn_backend/app/services/invites_service.py gmfn_backend/tests/test_frontend_link_origins.py`
    passed with only Windows line-ending warnings.

### Join-entry invite-code recovery addendum

- Product-owner shared phone screenshots where the join page opened but showed
  `Link needed` / `This join page does not contain a valid invite code yet`.
- Confirmed this was different from backend invite expiry:
  - the frontend join form had no visible invite code, so it could not even ask
    the backend to preview the invite.
  - WhatsApp/copy flows can sometimes preserve `/start/join/{code}` while
    dropping or damaging the query string.
- Updated `frontend/src/pages/JoinEntryPage.tsx`:
  - The join form now accepts invite code from `?invite=`, `?code=`,
    `?invite_code=`, `?join_code=`, `/join/{code}`, or the saved cover-page
    handoff storage.
  - When a code is recovered, the join form writes it back to the same entry
    handoff storage so later continuation does not lose it.
- Updated `frontend/src/App.tsx`:
  - Added `/join/:code` as a direct join-form route for old/manual links that
    carry the invite code in the path.
- No backend invite validity, expiry, usage, approval, membership, auth,
  schema, or permission behavior was changed.
- Verification:
  - `npm run build` passed in `frontend`.

### Marketplace fresh invite creation addendum

- Product-owner shared a later join-page screenshot that now reached invite
  validation but showed `Fresh invite link needed`.
- Confirmed against the live Render API:
  - `GET https://gmfn-api.onrender.com/clans/join-invite/preview?code=JEszw1VrZ-md_jOijmjkZg`
    returned `valid: false`, `status: not_found`.
  - This means the active Render backend could not find that invite code in
    either the invite package table or the legacy community invite field.
- Root-cause risk:
  - The Marketplace page's `Create / Refresh` button was still calling the
    read endpoint `getClanInviteLink`, which can preserve or re-copy a legacy
    community invite code.
  - For pilot testers, the safer action is to create a fresh invite package in
    the active backend database whenever the owner presses `Create / Refresh`.
- Updated `frontend/src/pages/MarketplacePage.tsx`:
  - Imported `createClanInvite`.
  - `handleCreateInviteLink()` now calls `createClanInvite(activeCommunityId)`
    instead of `getClanInviteLink(activeCommunityId)`.
- No backend route, database schema, membership approval, invite validation,
  auth, or permission behavior was changed.
- Verification:
  - `npm exec -- eslint src/pages/MarketplacePage.tsx` passed with the two
    pre-existing hook dependency warnings in that file.
  - `npm run build` passed in `frontend`.

### Live pilot tap-stability checkpoint

- During live phone testing, the product-owner reported recurring button
  sensitivity / jumpy tap behavior on entry, First Circle, notifications, and
  admin/money surfaces.
- Applied route-local mobile tap hardening only. The change adds stronger
  isolated tap styles and touch/mouse/pointer propagation guards to buttons
  without changing backend rules, invite validity, permissions, schemas, auth,
  or route contracts.
- Affected frontend surfaces:
  - `frontend/src/components/EntryControls.tsx`
  - `frontend/src/pages/CreateEntryPage.tsx`
  - `frontend/src/pages/JoinEntryPage.tsx`
  - `frontend/src/pages/BuildFirstCirclePage.tsx`
  - `frontend/src/pages/NotificationsPage.tsx`
  - `frontend/src/pages/SystemOperationsPage.tsx`
  - `frontend/src/pages/BankConsolePage.tsx`
  - `frontend/src/pages/AdminIncompleteLoansPage.tsx`
  - `frontend/src/pages/TrustAnalyticsPage.tsx`
  - `frontend/src/pages/CommunityJoinRequestsPage.tsx`
  - `frontend/src/pages/PaymentRailsPage.tsx`
  - `frontend/src/pages/PaymentInstructionsPage.tsx`
  - `frontend/src/pages/WithdrawalInstructionsPage.tsx`
- Routes/screens most directly affected:
  - `/create`
  - `/join`
  - `/app/build-first-circle`
  - `/app/notifications`
  - `/app/command-center/system-operations`
  - `/app/command-center/bank-console`
  - `/app/command-center/incomplete-loans`
  - `/app/command-center/trust-analytics`
  - `/app/community/:clanId/join-requests`
  - `/app/payment-rails`
  - `/app/payment/pool`
  - `/app/withdrawal-instructions`
- First Circle specifically:
  - Kept the guided role -> people -> invite structure.
  - Added the same stronger tap containment to all page buttons.
  - Did not change the shared First Circle draft model or invite/message logic.
- Notifications specifically:
  - Hardened attention/action/collapse buttons.
  - Did not change notification target normalization, unread behavior, or
    backend notification APIs.
- Verification:
  - `npm exec -- eslint src/pages/BuildFirstCirclePage.tsx` passed.
  - `npm exec -- eslint src/pages/NotificationsPage.tsx` passed.
  - `npm run build` passed in `frontend`.

### Dashboard Attention Guide user-scope and tap-target addendum

- Product-owner reported during live pilot testing that the Dashboard
  `Attention Guide` was disturbing newly created testers and appeared to carry
  creator/admin pressure into fresh user sessions.
- Confirmed from code:
  - Dashboard attention state was stored in one browser-wide key:
    `gmfn.dashboard.attention.v2`.
  - The page also used one browser-wide avatar key:
    `gmfn.member.avatar`.
  - On shared phones/browsers or repeated test accounts, that can make local
    Attention Guide state and profile image behavior feel like it belongs to a
    previous user.
- Updated `frontend/src/pages/DashboardPage.tsx`:
  - Dashboard Attention Guide state now uses a scoped localStorage key based on
    the signed-in user's `gmfn_id`, `id`, email, or phone.
  - The Attention Guide no longer opens until a user identity is available, so
    a temporary visitor/default key does not fire a popup during load.
  - Dashboard avatar storage now uses the same user-scoped key pattern.
  - The dashboard profile-picture upload control is now a larger real button
    that triggers the hidden file input, instead of a small label target.
  - Attention Guide action buttons now use the stronger touch/mouse/pointer
    guard props used by the safer pilot pages.
- Updated `frontend/src/pages/MarketplacePage.tsx`:
  - The marketplace picture-tool upload label now has the same touch/mouse
    containment as surrounding marketplace buttons.
- No backend notification APIs, notification ownership rules, auth, schema,
  route contracts, or the frozen Dashboard Market Wisdom section were changed.
- Verification:
  - `npm run build` passed in `frontend`.
  - `npm exec -- eslint src/pages/DashboardPage.tsx src/pages/MarketplacePage.tsx`
    passed with the two pre-existing Marketplace hook dependency warnings.
  - `git diff --check -- frontend/src/pages/DashboardPage.tsx frontend/src/pages/MarketplacePage.tsx`
    passed with only Windows line-ending warnings.

### Dashboard profile and first-currency visual polish addendum

- Product-owner clarified that the Dashboard profile photo block should stay
  distinct but feel less detached from the rest of the Dashboard, with fewer
  empty side spaces around the photo and a more institutional, 3D first
  currency block.
- Updated `frontend/src/pages/DashboardPage.tsx` only:
  - Extended the Dashboard profile photo frame height for shorter phones.
  - Reworked the profile/photo surface from a very dark isolated block into a
    softer blue/gold/white institutional blend that connects visually with the
    surrounding Dashboard cards.
  - Strengthened the `Trust is the first currency` card with layered
    blue/gold gradients, inset shadowing, and a more 3D institutional finish.
  - Replaced the plain inline GSN text treatment in the first-currency headline
    with the existing `GSNBrandMark` logo seal plus a smaller GSN closing seal.
- Did not touch backend logic, auth, schemas, notification ownership, route
  contracts, or the frozen Dashboard Market Wisdom section.
- Verification:
  - `npm run build` passed in `frontend`.

### Community Home shop-control cleanup checkpoint

- Product-owner reported that Community Home had accumulated several old and
  new Shop Control / Spotlight layers: repeated shop identity, repeated owner
  contact facts, repeated visible-item counts, and repeated shop/spotlight tool
  explanations.
- Audited Community Home against the canonical skeleton:
  - Community Home may hold owner-side shop control and spotlight apparatus.
  - Shop Gallery owns customer-facing product visibility truth.
  - Marketplace remains the operational nucleus for one selected community.
- Updated `frontend/src/components/CommunityShopControlPanel.tsx`:
  - Removed the repeated owner/contact/stat tile row from the expanded Shop
    Control panel.
  - Removed all visible-item count display from Community Home Shop Control.
    The public Shop Gallery is now the surface that should show product reality.
  - Replaced the verbose repeated shop-tool explanation with four compact
    owner lanes: Public shop, Spotlight, Paid spotlight, and Vault.
  - Added stronger pointer/touch/mouse containment to every button in the panel
    to reduce jumpy taps on phone browsers.
  - Removed the extra "How your shop works" explanation block because the same
    concept was already explained in the main shop identity summary.
- Updated `frontend/src/pages/ShopGalleryPage.tsx`:
  - Public Shop Gallery now accepts the same extra shop image aliases used by
    Community Home/backend shop payloads: `photo_url`, `logo_url`, and
    `shop_logo_url`.
- No backend rules, auth, permissions, schemas, payment logic, invite logic, or
  Dashboard Market Wisdom code were changed.
- Verification:
  - `npm exec -- eslint src/components/CommunityShopControlPanel.tsx src/pages/ShopGalleryPage.tsx` passed.
  - `git diff --check -- frontend/src/components/CommunityShopControlPanel.tsx frontend/src/pages/ShopGalleryPage.tsx` passed with only Windows line-ending warnings.
  - `npm run build` passed in `frontend`.

### Community Home spotlight pilot panel cleanup

- Product-owner reported that Community Home Spotlight still looked confusing
  during video testing and live attempts were still surfacing the old backend
  capacity message:
  `Spotlight capacity reached for clan 3. Wait for an active spotlight to expire.`
- Confirmed current source state:
  - `gmfn_backend/app/api/routes/marketplace.py` already has the temporary
    pilot capacity override enabled in source.
  - With that source active, the exact capacity rejection is bypassed for the
    pilot. If the message appears on Render, the live backend is still serving
    an older deploy or has not restarted onto the current code.
- Updated `frontend/src/pages/CommunityHomePage.tsx`:
  - Shortened the Spotlight block title and helper copy.
  - Replaced the long accepted-media paragraph with simpler image/video rules.
  - Added wrapping for selected media filenames so long WebM filenames do not
    stretch the mobile card.
  - Translated the old capacity rejection into a pilot-friendly message telling
    the tester to reload after the latest backend deploy finishes while keeping
    their selected media in place.
- No backend rules, auth, schemas, media validators, spotlight creation payloads,
  or Dashboard Market Wisdom code were changed in this checkpoint.
- Verification:
  - `npm exec -- eslint src/pages/CommunityHomePage.tsx` passed.
  - `python -m compileall gmfn_backend\app\api\routes\marketplace.py` passed.

### Admin pilot intake monitor triage cleanup

- While waiting for Render to pick up the spotlight pilot update, the
  product-owner asked what other safe work could continue besides button
  checking.
- Confirmed `gmfn_backend/app/api/routes/admin.py` already exposes the
  admin-only, read-only `/admin/pilot-intake` endpoint with create-entry and
  join-request stages plus `next_action` guidance.
- Updated `frontend/src/pages/SystemOperationsPage.tsx` only:
  - Added human labels for pilot intake stages such as `Bank/wallet needed`,
    `Ready for community`, `Sign in instead`, and `Activation missing`.
  - Sorted create-entry and join-request rows so records needing help appear
    first instead of being buried by newest-only order.
  - Added a `First support action` card that tells the admin what to check
    first during live testing.
  - Renamed summary tiles from raw wording such as `Ready setup` and
    `Awaiting bank` to clearer pilot-support language.
- No backend routes, schemas, permissions, auth, invite validity, or business
  rules were changed.
- Verification:
  - `npm exec -- eslint src/pages/SystemOperationsPage.tsx` passed.

### Spotlight pilot media/debug checkpoint

- Product-owner is actively testing Community Home Spotlight and asked to
  suspend the community spotlight quota for one day so many image/video
  spotlights can be loaded during the pilot.
- Confirmed source state:
  - `gmfn_backend/app/api/routes/marketplace.py` has
    `SPOTLIGHT_CAPACITY_PILOT_OVERRIDE_ENABLED = True`.
  - With current backend source running, `/marketplace/broadcasts` returns
    `spotlight_capacity_pilot_override_active: true`.
  - `gmfn_backend/app/api/routes/marketplace_media.py` allows videos up to
    `15MB` and only rejects videos over `10s` when a duration is explicitly
    submitted.
- Updated frontend spotlight media behavior:
  - `frontend/src/lib/spotlightMediaPrep.ts` keeps the 15MB / 10s preparation
    target.
  - `frontend/src/pages/CommunityHomePage.tsx` and
    `frontend/src/pages/ShopControlPage.tsx` now fall back to the original
    selected video when phone-browser trimming fails, as long as the file is
    accepted and no larger than 15MB.
  - `frontend/src/components/SpotlightMediaFrame.tsx` now accepts
    `maxVideoSeconds` and loops/pauses video playback at that limit, so pilot
    videos behave as 10-second spotlight clips even when the uploaded file was
    not physically trimmed by the browser.
  - Community Home, Shop Control, Dashboard, Shop Gallery, and Marketplace
    spotlight frames pass the 10-second playback cap where relevant.
- Updated frontend refresh behavior:
  - Community Home and Dashboard no longer clear the visible spotlight while
    the 30-second background refresh is running, reducing the "blink" effect.
- Runtime finding from local audit:
  - Local backend had previously been running old code without reload; it was
    restarted on 2026-04-23 with current source.
  - After restart, backend logs showed repeated GETs for
    `/marketplace/broadcasts?clan_id=3&active_only=true&limit=20`, but no new
    POST to `/marketplace/media/video`, `/marketplace/media/image`, or
    `/marketplace/broadcasts`.
  - Local SQLite `marketplace_broadcasts` for `clan_id=3` still had only one
    active row, id `59`, so the UI's `1 live / queued` count was reflecting
    backend state rather than a hard-coded counter.
  - Local Vite was running on `127.0.0.1:5174`, so phones on the LAN will not
    see local HMR changes unless the frontend is restarted with a LAN host
    such as `0.0.0.0`, or the changes are deployed to Render.
- Local pilot data action:
  - Backed up local SQLite database to
    `gmfn_backend/gmfn.db.backup_spotlight_pilot_20260423_112949`.
  - Extended `expires_at` to `2026-04-24 23:59:59.000000` for existing
    clan `3` spotlight rows that already had image or video media.
  - This revived 17 existing image spotlights for local pilot rotation testing
    without requiring the product-owner to upload more images.
  - Confirmed local API now returns `total: 17`, `active_total: 17`,
    `image_total: 17`, `video_total: 0`, and
    `spotlight_capacity_pilot_override_active: true`.
- Verification:
  - `npm exec -- eslint src/pages/CommunityHomePage.tsx src/pages/ShopControlPage.tsx src/pages/DashboardPage.tsx src/pages/ShopGalleryPage.tsx src/components/CommunityMarketplaceSpotlight.tsx src/components/SpotlightMediaFrame.tsx` passed with only the existing Shop Control hook dependency warnings.
  - `python -m compileall gmfn_backend\app\api\routes\marketplace.py gmfn_backend\app\api\routes\marketplace_media.py` passed.
  - `npm run build` passed in `frontend`.

### Shop Gallery spotlight frame and loaded-shelf checkpoint

- Product-owner asked for the Shop Gallery mini spotlight frame to look
  distinct from normal shop/customer cards without changing its structure.
- Updated `frontend/src/pages/ShopGalleryPage.tsx` only:
  - Gave the mini spotlight a darker amber/teal broadcast-style frame while
    preserving the same media frame size, playback, rotation, and page flow.
  - Kept the shared spotlight pilot rotation and 10-second playback cap wired
    through `frontend/src/lib/spotlightPilot.ts`.
  - Confirmed the "loaded but not showing" product issue was caused by the
    gallery rendering only the first 12 products while the API can return more.
  - Added a visible status plus a route-local `Show all loaded items` switch so
    extra returned products can be opened during testing without changing
    backend product-slot rules.
  - Added pointer-event protection on decorative hero overlays so they cannot
    intercept taps over the first shop blocks.
- No backend routes, schemas, auth, product-slot limits, or payment/trust logic
  were changed.
- Verification:
  - `npm exec -- eslint src/pages/ShopGalleryPage.tsx` passed.
  - `npm run build` passed in `frontend`.

### Shop Gallery public product slot open/close checkpoint

- Product-owner clarified that the issue was not only extra loaded products:
  the first two public product slots themselves needed to be openable.
- Updated `frontend/src/pages/ShopGalleryPage.tsx` only:
  - Added route-local open/close state for public product cards.
  - Every visible product slot, including Slot 01 and Slot 02, now exposes an
    `Open item` / `Close` control.
  - Opening a slot reveals a public-safe detail panel with the product cue,
    price, shop source, and freshness signal where available.
  - On compact phones, opening a slot changes the card from a bottom-overlay
    dock into a downward-flowing detail card so the slot visibly opens instead
    of remaining a static image/share panel.
  - Kept owner/admin controls out of the public Shop Gallery product detail
    panel.
- No backend routes, schemas, product-slot rules, auth, payment, trust, or
  invite logic were changed.
- Verification:
  - `npm exec -- eslint src/pages/ShopGalleryPage.tsx` passed.
  - `npm run build` passed in `frontend`.

### Shop Gallery broken product media checkpoint

- Product-owner clarified that Slot 01 and Slot 02 were still not showing
  pictures at all.
- Checked the running local backend and SQLite product rows:
  - The backend was running.
  - The current shop product API was returning product rows for shop `1`.
  - The newest two community-visible rows had `image_url` values pointing to
    missing upload files:
    `/uploads/marketplace/images/20260412163112_b3deb91a22a05cbf.jpg` and
    `/uploads/marketplace/images/20260326220342_6364908345ab88a4.jpg`.
  - Backend logs confirmed repeated `404 Not Found` responses for those image
    files.
- Updated `frontend/src/pages/ShopGalleryPage.tsx` only:
  - Added a route-local broken-media registry for public product images/videos.
  - If a product image/video fails to load, the gallery marks that media URL as
    broken and moves that product out of the public photo-ready shelf so it no
    longer occupies Slot 01 or Slot 02.
  - The shelf then refills from the next usable products, so the first visible
    slots are picture-bearing slots instead of empty broken-image cards.
  - Added a small status badge when old missing-photo links have been moved
    aside.
- No backend data was edited, and no backend routes, schemas, auth,
  permissions, invite, trust, or payment logic were changed.
- Verification:
  - `npm exec -- eslint src/pages/ShopGalleryPage.tsx` passed.
  - `npm run build` passed in `frontend`.

### Shop Gallery backend media availability checkpoint

- Follow-up audit showed the first two product rows were still being returned
  by the backend with upload URLs whose files no longer exist locally, so a
  refresh could still surface dead media before the frontend had a chance to
  react.
- Updated `gmfn_backend/app/api/routes/marketplace.py` only:
  - Added a small upload-path availability guard for `/uploads/...` media
    returned by marketplace product and broadcast serializers.
  - Local upload URLs now return `None` when the underlying file is missing;
    external, data, and blob URLs are left untouched.
  - Product responses now include `image_url_available` and
    `video_url_available` booleans so the frontend can reason about stale
    media without guessing.
- Confirmed locally that:
  - `/uploads/marketplace/images/20260321190614_2456fdda238a248a.jpg` still
    resolves as available.
  - `/uploads/marketplace/images/20260412163112_b3deb91a22a05cbf.jpg` and
    `/uploads/marketplace/images/20260326220342_6364908345ab88a4.jpg` resolve
    to `None` because the files are missing.
- Restarted the local backend on `127.0.0.1:8012` with `GMFN_DEV_MODE=1`.
- Verification:
  - `python -m compileall app/api/routes/marketplace.py` passed in
    `gmfn_backend`.
  - `npm exec -- eslint src/pages/ShopGalleryPage.tsx` passed.
  - `npm run build` passed in `frontend`.

### Community Home spotlight duplication cleanup checkpoint

- Product-owner asked to continue the page-by-page cleanup, especially around
  Community Home, Marketplace, Shop Control, and duplicated Spotlight handling.
- Updated `frontend/src/pages/CommunityHomePage.tsx` only:
  - Removed the duplicate full Spotlight upload/publish composer from
    Community Home.
  - Community Home now keeps Spotlight as a read-only live-status and guidance
    surface.
  - The "What do you want to do next?" result and Spotlight section now route
    the user to `/app/shop-control#shop-control-spotlight` for actual
    publishing work.
  - Removed the extra Spotlight button from the general "Your main actions"
    grid because the page already has a dedicated Spotlight status/launcher.
  - This preserves the route responsibility split: Community Home explains
    and shows state; Shop Control owns picture, product, Vault, and Spotlight
    operations.
- Updated `frontend/src/components/CommunityShopControlPanel.tsx`:
  - Compressed the embedded Community Home shop panel by replacing the large
    second "owner tool lanes" block with a compact Shop Control shortcut strip.
  - This keeps quick routes to picture/products, Spotlight, paid Spotlight,
    and Vault without making Community Home behave like a second Shop Control
    page.
- Updated `frontend/src/pages/MarketplacePage.tsx`:
  - Removed repeated "Marketplace-owned links" wording inside the outward link
    section and replaced it with clearer "Outgoing links" copy.
  - Link behavior was not changed.
- No backend routes, schemas, auth, payment, invite, trust, quota, or product
  media rules were changed in this cleanup.
- Verification:
  - `npm exec -- eslint src/pages/CommunityHomePage.tsx src/components/CommunityShopControlPanel.tsx` passed.
  - `npm exec -- eslint src/pages/MarketplacePage.tsx src/pages/CommunityHomePage.tsx src/components/CommunityShopControlPanel.tsx` passed with only pre-existing Marketplace hook dependency warnings.
  - `npm run build` passed in `frontend`.

### Demand Box and First Circle button-tightening checkpoint

- Product-owner asked to continue inner-page cleanup while remote testing
  continues, with special concern around jumpy buttons and repeated guidance.
- Updated `frontend/src/pages/BuildFirstCirclePage.tsx` only:
  - Strengthened all route-local button styles with larger tap targets,
    pointer-event protection, appearance reset, and safer text wrapping.
  - Guarded click handlers as well as pointer/touch/mouse-down handlers on
    role, contact, collapse, include/remove, copy, and reset buttons.
  - Simplified the user path language from repeated step/role wording to
    "Aim", "People", and "Invite" so the screen is more direct for first-time
    users.
- Updated `frontend/src/pages/DemandBoxPage.tsx` only:
  - Removed a repeated top navigation cluster from the create-demand card
    because the route already has navigation at the hero and page top.
  - Tightened the optional details summary opener with the same route-local tap
    protection used by other buttons.
  - Simplified the Demand Box explainer tiles to shorter wording.
  - Fixed the route-local `loadPage` hook dependency warning with
    `useCallback`; no API contract changed.
- No backend routes, schemas, auth, payment, invite, quota, trust, or product
  media logic were changed.
- Verification:
  - `npm exec -- eslint src/pages/BuildFirstCirclePage.tsx src/pages/DemandBoxPage.tsx` passed.
  - `npm run build` passed in `frontend`.

### Shop Control button-tightening checkpoint

- Continued the safe inner-page cleanup lane after Community Home was made a
  status/launcher surface and Shop Control became the main working page for
  picture, product, Spotlight, paid Spotlight, and Vault actions.
- Updated `frontend/src/pages/ShopControlPage.tsx` only:
  - Strengthened the route-local button/tap target style with larger minimum
    height, higher stacking, pointer-event protection, appearance reset,
    line wrapping, and stable full-width alignment.
  - Added a small route-local guarded click helper and applied it to shop
    gallery open/copy actions, picture save/remove, shop details save,
    paid-feature instruction buttons, Spotlight mode/publish buttons, and
    Vault link copy/open/extend/revoke/create buttons.
  - Made `openSpotlightTools` consume the triggering tap before opening and
    scrolling to the Spotlight publisher.
  - Fixed the route-local `loadPage` and hash-scroll hook dependency warnings
    with `useCallback`; no API contract changed.
- No backend routes, schemas, auth, payment, invite, quota, trust, product
  media, or Spotlight business rules were changed in this pass.
- Verification:
  - `npm exec -- eslint src/pages/ShopControlPage.tsx` passed.
  - `npm run build` passed in `frontend`.

### Shop Assets and Shop Gallery button-tightening checkpoint

- Continued the same safe button-stability pass into the shop owner asset page
  and the public shop/gallery page.
- Updated `frontend/src/pages/ShopAssetsPage.tsx` only:
  - Strengthened route-local button styles with larger tap targets,
    pointer-event protection, appearance reset, stable text wrapping, and
    guarded click handling.
  - Applied the guarded click path to shop gallery/copy actions, guidance and
    section toggles, signboard save/reset/remove, product submit/clear/copy,
    and product edit/restore/delete actions.
  - Fixed the route-local `loadPage` hook dependency warning with
    `useCallback`; no API contract changed.
- Updated `frontend/src/pages/ShopGalleryPage.tsx` only:
  - Strengthened public-shop navigation and shop/product action buttons with
    the same route-local tap-target hardening.
  - Guarded Back, Vault request, shop share/copy, show-all-products, product
    open/close, and product share actions.
  - Preserved the visitor/member split: visitors can view/share/request/sign
    in, while protected GSN app doors remain signed-in member navigation.
- Updated `frontend/src/components/CommunityShopControlPanel.tsx` only:
  - Raised the embedded Community Home shop shortcut buttons to the same
    mobile tap-target standard as the main shop pages.
  - Tightened the panel collapse and copy-shop-link actions with stronger
    event guards so the summary panel behaves like a launcher, not a second
    shop-control workflow.
- No backend routes, schemas, auth, payment, invite, quota, trust, product
  media, or Spotlight business rules were changed in this pass.
- Verification:
  - `npm exec -- eslint src/pages/ShopAssetsPage.tsx` passed.
  - `npm exec -- eslint src/pages/ShopGalleryPage.tsx` passed.
  - `npm exec -- eslint src/components/CommunityShopControlPanel.tsx` passed.

### Loans domain audit/refinement checkpoint

- Audited the loans/support domain across frontend pages and backend route
  ownership without changing backend business rules.
- Confirmed the backend remains the source of truth for loan lifecycle,
  guarantor decisions, repayment claims, repayment completion, trust proof,
  and guarantor lock release.
- Updated these frontend pages only:
  - `frontend/src/pages/LoansPage.tsx`
  - `frontend/src/pages/LoanReadinessPage.tsx`
  - `frontend/src/pages/LoanSuggestionsPage.tsx`
  - `frontend/src/pages/LoanWorkbenchPage.tsx`
  - `frontend/src/pages/LoanSummaryPage.tsx`
  - `frontend/src/pages/GuarantorInboxPage.tsx`
  - `frontend/src/pages/GuarantorEarningsPage.tsx`
  - `frontend/src/pages/RepaymentPage.tsx`
  - `frontend/src/pages/BorrowerPreflightPage.tsx`
  - `frontend/src/pages/LoanDecisionPage.tsx`
- Route-level changes:
  - Tightened loan-domain action and collapse buttons with larger tap targets,
    stronger stacking, pointer-event protection, mobile appearance reset, and
    safer wrapping.
  - Corrected `LoanDecisionPage` navigation so the workbench and loans return
    buttons point to `/app/loan-workbench` and `/app/loans`.
- No backend routes, schemas, auth, payment, invite, quota, trust, repayment,
  guarantor, or loan lifecycle rules were changed.
- Verification:
  - `npm exec -- eslint src/pages/LoansPage.tsx src/pages/LoanReadinessPage.tsx src/pages/LoanSuggestionsPage.tsx src/pages/LoanWorkbenchPage.tsx src/pages/LoanSummaryPage.tsx src/pages/GuarantorInboxPage.tsx src/pages/GuarantorEarningsPage.tsx src/pages/RepaymentPage.tsx src/pages/BorrowerPreflightPage.tsx src/pages/LoanDecisionPage.tsx` passed with existing hook-dependency warnings only.
  - `npm run build` passed in `frontend`.

### Loan polish continuation and join-link refresh fix

- Continued the loan/support polish so the last rough support screens now match
  the stronger finance-adjacent loan pages.
- Updated frontend only:
  - `frontend/src/pages/LoanDecisionPage.tsx`
  - `frontend/src/pages/BorrowerPreflightPage.tsx`
- Route-level changes:
  - Rebuilt both screens with the same institutional surfaces, stronger tap
    targets, calmer navigation, and simpler guidance language already used in
    the main loans pages.
  - Reduced paper-flat presentation and removed broken symbol/encoding style
    output from borrower preflight.
- Blocking outside-test fix:
  - Updated `gmfn_backend/app/api/routes/clans.py` so
    `GET /clans/{clan_id}/invite-link` now prefers the latest still-active
    `ClanInvite` row for the community instead of falling back to an older
    legacy clan invite after a page refresh.
  - If no usable invite row exists and the legacy clan invite is expired or
    exhausted, the route now creates a fresh active invite and returns that
    link instead of surfacing a stale expired one.
  - This is meant to stop Marketplace and Workspace screens from showing a
    link that looks ready locally but fails on phone with expired/invalid
    messages after refresh or resend.
- No join-request approval rules, vote thresholds, auth contracts, schemas, or
  trust-event business rules were changed in this pass.
- Verification:
  - `python -m py_compile gmfn_backend/app/api/routes/clans.py` passed.
  - `npm exec -- eslint src/pages/LoanDecisionPage.tsx src/pages/BorrowerPreflightPage.tsx` passed.
  - `npm run build` passed in `frontend`.

### Loans and finance strategic alignment pass

- Continued the frontend-only cleanup so Finance and Loans & Support now speak
  more clearly as adjacent domains instead of sounding like duplicate money
  consoles.
- Updated these frontend pages only:
  - `frontend/src/pages/FinancePage.tsx`
  - `frontend/src/pages/LoansPage.tsx`
  - `frontend/src/pages/LoanReadinessPage.tsx`
  - `frontend/src/pages/LoanSuggestionsPage.tsx`
  - `frontend/src/pages/LoanWorkbenchPage.tsx`
  - `frontend/src/pages/LoanSummaryPage.tsx`
  - `frontend/src/pages/RepaymentPage.tsx`
  - `frontend/src/pages/RevenueAllocationPage.tsx`
- Route/screen alignment changes:
  - Finance now presents itself as the wider finance file and evidence record,
    while Loans & Support is described as the live one-community workflow.
  - Finance utility links and support CTAs now consistently use the
    `Loans & Support` label.
  - Loan readiness, suggestions, workbench, summary, repayment, and revenue
    allocation now use the same “This page is one step inside Loans & Support”
    framing or equivalent route-local support wording.
  - Cross-links from loan pages back into finance were softened from action
    language like `Open Finance` to evidence language like `See this in
    Finance` where appropriate.
  - Remaining “support continuation routes” wording was normalized into
    `Next support routes` so the loans stack no longer mixes three route-label
    styles.
- Mobile polish / button tightening:
  - Strengthened route-local tap targets, collapse toggles, and action buttons
    across the touched loan/support pages.
  - Extended the institutional surface treatment to repayment, readiness,
    suggestions, and revenue allocation so the inner pages read less like
    paper forms and more like the rest of the product.
  - Added guarded pointer/touch handlers on the touched loan/support pages so
    nested cards behave more predictably on phones.
- No backend routes, schemas, auth, invite contracts, quota rules, finance
  calculations, repayment rules, guarantor rules, or trust-event business
  logic were changed in this pass.
- Verification:
  - `npm exec -- eslint src/pages/FinancePage.tsx src/pages/LoansPage.tsx src/pages/LoanReadinessPage.tsx src/pages/LoanSuggestionsPage.tsx src/pages/LoanWorkbenchPage.tsx src/pages/LoanSummaryPage.tsx src/pages/RepaymentPage.tsx src/pages/RevenueAllocationPage.tsx` passed with existing hook-dependency warnings only.
  - `npm run build` passed in `frontend`.
- Residual risk / follow-up:
  - Some loan pages still carry existing React hook dependency warnings that
    predate this pass.
  - The remaining cleanup work in this domain is mostly experiential:
    broader mobile testing, further de-duplication if the product owner wants
    even fewer helper layers, and aligning any untouched support-adjacent
    screens to the same institutional visual standard.

### Join-link normalization and phone testing follow-up

- Continued the invite-link stabilization work so phone/WhatsApp testing is not
  forced to depend only on Render timing.
- Added shared frontend join-link normalization:
  - `frontend/src/lib/joinLinks.ts`
- Updated invite/share surfaces to use that shared normalizer:
  - `frontend/src/pages/MarketplacePage.tsx`
  - `frontend/src/pages/CommunityHomePage.tsx`
  - `frontend/src/pages/MarketplaceWorkspacePage.tsx`
  - `frontend/src/pages/ClansPage.tsx`
- Updated the backend clan invite link helper to emit the short canonical
  frontend path:
  - `gmfn_backend/app/api/routes/clans.py`
  - Canonical outward invite now prefers `/start/join/{code}` instead of the
    older long query-heavy format.
- Tightened the join request screen:
  - `frontend/src/pages/JoinEntryPage.tsx`
  - Missing/expired invite now reads more clearly.
  - The page no longer reuses `ENTRY_INVITE_CODE_KEY` from storage as a silent
    fallback when the current URL does not contain a fresh invite code.
  - Invalid-link state was simplified so the page can move toward one guided
    warning path instead of a dead launcher plus a second warning.
  - Invite expiry badges and invite letter fallback now accept preview expiry
    data too.
- Small cleanup:
  - `frontend/src/pages/ClansPage.tsx`
  - Removed an empty `catch` lint error in clipboard copy fallback.
- Invite-path audit findings from parallel explorers:
  - Frontend:
    - old invite codes can become sticky if they are read back from storage;
      this was fixed in `JoinEntryPage`.
    - public-origin normalization may still preserve older public hosts instead
      of forcing one canonical frontend origin.
  - Backend:
    - `GET /clans/{clan_id}/invite-link` still does not behave like a true
      hard refresh when a usable `ClanInvite` row already exists; it can return
      the existing row unchanged.
    - legacy clan-invite fallback paths still exist and can create mismatch
      with newer `ClanInvite.code`-based flows.
    - `community_integrity_service.join_clan_via_invite()` appears to query
      `ClanInvite.invite_code` even though the model uses `ClanInvite.code`;
      this route should be audited before relying on it.
- Local phone testing setup:
  - Backend confirmed listening on `127.0.0.1:8012`.
  - Frontend Vite dev server was started on LAN host `0.0.0.0:5173`.
  - Current local network test URL:
    - `http://192.168.1.38:5173`
  - This lets a phone on the same Wi-Fi test the app without waiting for
    Render deploys; Vite proxies the backend locally.
- Verification:
  - `npm exec -- eslint src/lib/joinLinks.ts src/pages/JoinEntryPage.tsx src/pages/MarketplacePage.tsx src/pages/CommunityHomePage.tsx src/pages/MarketplaceWorkspacePage.tsx src/pages/ClansPage.tsx`
    passed with only 2 pre-existing warnings in `MarketplacePage.tsx`.
  - `npm run build` passed in `frontend`.
- Most necessary next step after this checkpoint:
  1. Make `GET /clans/{clan_id}/invite-link` perform a real refresh or clearly
     separate `create` from `refresh`, so resend never hands back an older code.
  2. Audit and possibly remove remaining legacy clan-invite fallback paths once
     product-owner confirms that `ClanInvite.code` is now the single source of
     truth for outward join links.

### Community Home vs Marketplace boundary alignment

- Continued the route-purpose cleanup so Community Home, Marketplace, and the
  supporting community workspace layers stop sounding like copies of the same
  domain.
- Updated:
  - `frontend/src/pages/CommunityHomePage.tsx`
  - `frontend/src/pages/MarketplacePage.tsx`
  - `frontend/src/pages/MarketplaceWorkspacePage.tsx`
  - `frontend/src/components/CommunityShopControlPanel.tsx`
- Boundary decisions now reflected in frontend copy:
  - Community Home is the cross-community index and owner launcher layer.
  - Marketplace is the live one-community operating surface.
  - Marketplace-owned links remain owned by Marketplace, not by Community Home.
  - Community workspace/access surfaces are described as utility/access layers,
    not as a second Marketplace or a second Community Home.
  - Shop Control is described as the owner-side tool panel for the one global
    shop, while Marketplace remains the place where that shop meets one
    selected community.
- Concrete cleanup in this pass:
  - Community Home owner-launcher text now more clearly says Marketplace keeps
    outward links and live local work.
  - Marketplace workspace top-level language was rewritten from
    `Community Workspace` / general work wording toward `Community Access` /
    invite-visibility-alert-member mapping wording.
  - Marketplace workspace route-handoff copy now says those buttons return the
    user into live community routes instead of acting like a replacement
    Marketplace.
  - `CommunityShopControlPanel` button label `Marketplace` was clarified to
    `Open Marketplace`.
- Parallel explorer audit (read-only) confirmed the main remaining overlap risk
  is not backend logic but wording and ownership drift across:
  - `frontend/src/pages/MarketplaceWorkspacePage.tsx`
  - `frontend/src/components/CommunityShopControlPanel.tsx`
  - residual Community Home spotlight/launcher wording
- Verification:
  - `npm exec -- eslint src/pages/CommunityHomePage.tsx src/pages/MarketplacePage.tsx src/pages/MarketplaceWorkspacePage.tsx src/components/CommunityShopControlPanel.tsx`
    passed with only the 2 pre-existing hook-dependency warnings in
    `MarketplacePage.tsx`.
  - `npm run build` passed in `frontend`.
- Residual risk / next recommended step:
  1. Continue a smaller wording-and-layout cleanup on `MarketplaceWorkspacePage`
     if the product owner wants that surface to become even more clearly a
     support/admin utility layer rather than a semi-public marketplace face.
  2. After the invite-link refresh issue is stabilized on the backend, do a
     fresh phone audit of Community Home -> Marketplace -> outward links so the
     boundary can be validated in real navigation, not only in copy.

### Invite-link stabilization checkpoint (2026-04-24)

- Purpose:
  - reduce the repeated outside-testing failure where phone/WhatsApp opens land
    on the Join Entry red state:
    - `Fresh invite link needed.`
    - `This invitation link is no longer valid or was not copied fully.`

- Files changed in this pass:
  - `frontend/src/lib/joinLinks.ts`
  - `frontend/src/pages/MarketplaceWorkspacePage.tsx`
  - `gmfn_backend/app/api/routes/clans.py`
  - `gmfn_backend/app/services/community_integrity_service.py`
  - `gmfn_backend/tests/test_join_requests.py`

- Confirmed frontend cleanup:
  - `normalizedJoinInviteUrl()` now prefers the invite code extracted from the
    actual outward share link first, then `payload.code`, and only then the
    older `payload.invite_code` field.
  - `MarketplaceWorkspacePage` now prefers `inviteInfo.code` before
    `inviteInfo.invite_code`.
  - This reduces the chance that a stale legacy code keeps being copied after a
    newer shareable invite already exists.

- Confirmed backend cleanup:
  - `GET /clans/{clan_id}/invite-link`
    - now works from `ClanInvite.code` as the shareable outward source of
      truth.
    - uses a reusable default max-uses value of `100` when no stricter value is
      requested.
    - reuses the latest still-usable invite when it already matches the share
      policy, otherwise creates a new live invite.
  - `GET /clans/join-invite/preview`
    - no longer treats legacy `Clan.invite_code` as a live outward join link.
    - can recover the latest usable community invite when a stale or missing
      code is opened together with a valid `community_code`.
  - `community_integrity_service.join_clan_via_invite()`
    - now queries `ClanInvite.code` instead of the wrong legacy
      `ClanInvite.invite_code`.
  - `community_integrity_service.audit_invite()`
    - now reports `invite.code`.

- New tests added:
  - preview does **not** accept legacy clan-level invite codes as live outward
    share links
  - preview **does** recover the newest usable invite from `community_code`
  - reusable shareable invite default max uses is `100`
  - requested max-uses still overrides the default when explicitly provided

- Verification run:
  - `python -m pytest gmfn_backend/tests/test_join_requests.py -q`
    - `10 passed`
  - `python -m py_compile gmfn_backend/app/api/routes/clans.py gmfn_backend/app/services/community_integrity_service.py`
    passed
  - `npm exec -- eslint src/lib/joinLinks.ts src/pages/MarketplaceWorkspacePage.tsx`
    passed when run from `frontend/`
  - `npm run build`
    passed in `frontend/`

- Practical meaning:
  - stale outward join links should no longer stay "sticky" as easily across
    frontend copy paths
  - preview should no longer silently validate an old legacy clan code
  - if a person opens an older link but the community code is still present, the
    backend can now hand them forward to the latest live invite for that same
    community

- Remaining risk / next recommended step:
  1. Deploy backend and frontend together so Render uses the new invite-source
     rules and the newer join-link normalizer.
  2. From the live app, generate one fresh join link again from the community
     that should be tested.
  3. Retest the exact generated link on:
     - laptop browser
     - phone browser directly
     - WhatsApp open-from-message
  4. If the red state still appears after deployment, capture the **exact full
     URL** that was opened on the phone so the remaining break can be traced as
     either:
     - a malformed shared URL
     - an old cached URL
     - a producer screen still emitting legacy data

### Marketplace button-stability audit checkpoint (2026-04-24)

- Purpose:
  - reduce the current phone-testing blocker where Marketplace buttons feel
    jumpy, stiff, or dead, especially on:
    - `Create / Refresh`
    - `Copy WhatsApp Link`
    - `Open Join Link`
    - outward link copy/open actions

- Files changed in this pass:
  - `frontend/src/pages/MarketplacePage.tsx`

- Confirmed Marketplace interaction cleanup:
  - `consumeMarketplaceButtonEvent()` no longer calls `preventDefault()` for
    click/submit events. It now only stops propagation.
  - `marketplaceButtonGuardProps()` now uses the lighter
    `consumeMarketplacePointerEvent()` on pointer/touch/mouse down instead of
    the heavier button event helper.
  - The duplicate `consumeMarketplaceButtonEvent(event)` calls were removed
    from Marketplace button `onClick` bodies where the same controls already
    use `marketplaceButtonGuardProps()`.
  - Affected Marketplace action clusters include:
    - invite creation / copy / open / WhatsApp send
    - create-link copy / open / WhatsApp send
    - public marketplace/shop outward link buttons
    - picture tool remove button
    - support-draft start / refresh / cancel
    - chosen supporter / guarantor selection buttons
    - guarantor-request send button

- Practical meaning:
  - Marketplace buttons should no longer be double-guarded on the same tap.
  - Phone taps should feel steadier because buttons are no longer being asked
    to stop/guard the same interaction both on pointer-down and again inside
    the click body.

- Verification:
  - `npm exec -- eslint src/pages/MarketplacePage.tsx`
    - passed with only the 2 pre-existing hook-dependency warnings
  - `npm run build`
    - passed in `frontend/`

- Recommended next test:
  1. Retest Marketplace on phone, starting with:
     - `Create / Refresh`
     - `Copy WhatsApp Link`
     - `Open Join Link`
     - `Copy Create Link`
     - `Open Marketplace Face`
     - `Open Shop Face`
  2. If these are steadier, carry the same button-lightening audit into the
     next most troublesome inner route instead of broad restyling first.

### Marketplace link-humanization checkpoint (2026-04-24)

- Purpose:
  - reduce the "computer language" feel in the Marketplace link desk so
    outward links look more human and WhatsApp sends carry a real GSN message
    instead of a bare raw URL.

- Files changed in this pass:
  - `frontend/src/pages/MarketplacePage.tsx`

- Confirmed Marketplace link-desk cleanup:
  - Added masked outward-link labels so the page no longer shows the full raw
    join URL directly in the visible card.
  - Added helper builders for:
    - masked outward link codes / labels
    - short GSN share-message text
  - Join-link card now shows a humanized label like:
    - `Secure GSN join link for <community> • code <shortened>`
  - Create-link area now shows a short message preview and a masked founder
    entry label.
  - Public marketplace face and public shop face now show short masked labels
    under their readiness pills.
  - `Send WhatsApp` for join/create now sends a short GSN message plus the real
    live link, instead of sending only the raw URL.
  - `Copy WhatsApp Link` / `Copy Create Link` behavior was then corrected again:
    - the button text now reads:
      - `Copy WhatsApp Message`
      - `Copy Create Message`
    - these copy actions now copy the short human GSN message plus the live
      link, not the bare raw URL alone.

- Practical meaning:
  - the underlying link is unchanged and still works normally
  - the page looks less technical
  - WhatsApp recipients receive a short human note before the link
  - if a user copies directly from the browser address bar or from a raw URL
    source, WhatsApp will still show the technical link; the human result
    depends on using the message-copy or WhatsApp-send actions from
    Marketplace itself

- Verification:
  - `npm exec -- eslint src/pages/MarketplacePage.tsx`
    - passed with only the 2 pre-existing hook-dependency warnings
  - `npm run build`
    - passed in `frontend/`

- Recommended next review:
  1. Open Marketplace on phone and review the new message preview language.
  2. If the owner wants it stronger, shorten or deepen only the text layer;
     do not change the underlying invite route again unless the business
     behavior itself needs to change.

### Loans page base-domain shortcut restoration (2026-04-24)

- Purpose:
  - restore the missing main-domain shortcut strip at the base of the Loans page
    so the page does not end abruptly after the final route cards on phone.

- Files changed in this pass:
  - `frontend/src/pages/LoansPage.tsx`

- Confirmed change:
  - Added a new `Main domain shortcuts` section at the end of `/app/loans`.
  - Added shortcut chips for:
    - `Dashboard`
    - `Community`
    - `Marketplace`
    - `Shop`
    - `Finance`
    - `Loans`
  - Increased bottom padding on the loaded Loans page so the new footer strip has
    room on compact/mobile screens.

- Practical meaning:
  - the loan overview now finishes with a clear return path into the wider GSN domains
  - this is frontend-only and route-local; no backend business logic or contracts changed

- Verification:
  - `npm exec -- eslint src/pages/LoansPage.tsx`
    - passed
  - `npm run build`
    - passed in `frontend/`

### Loan inner-page domain shortcut restoration (2026-04-24)

- Purpose:
  - restore the missing main-domain shortcut strip at the base of the main
    inner loan pages so phone users do not get trapped inside route cards with
    no wider-domain return path.

- Files changed in this pass:
  - `frontend/src/components/MainDomainShortcutStrip.tsx`
  - `frontend/src/pages/LoanWorkbenchPage.tsx`
  - `frontend/src/pages/LoanReadinessPage.tsx`
  - `frontend/src/pages/LoanSuggestionsPage.tsx`
  - `frontend/src/pages/LoanSummaryPage.tsx`
  - `frontend/src/pages/RepaymentPage.tsx`
  - `frontend/src/pages/GuarantorInboxPage.tsx`
  - `frontend/src/pages/GuarantorEarningsPage.tsx`
  - `frontend/src/pages/RevenueAllocationPage.tsx`
  - `frontend/src/pages/BorrowerPreflightPage.tsx`
  - `frontend/src/pages/LoanDecisionPage.tsx`

- Confirmed change:
  - Added a shared `MainDomainShortcutStrip` component for loan-domain pages.
  - Added the base shortcut strip to these routes/screens:
    - `/app/loan-workbench`
    - `/app/loan-readiness`
    - `/app/loan-suggestions`
    - `/app/loan-summary/:id`
    - `/app/payment/loans/:loanId`
    - `/app/guarantor-inbox`
    - `/app/guarantor-earnings`
    - `/app/revenue-allocation`
    - `/app/borrower-preflight`
    - `/app/loan-decision`
  - Shortcut strip includes:
    - `Dashboard`
    - `Community`
    - `Marketplace`
    - `Shop`
    - `Finance`
    - `Loans`
  - Increased bottom padding on these pages so the shortcut strip has stable
    room on compact/mobile screens.

- Practical meaning:
  - the inner loan pages now finish with a consistent wider-domain return path
  - this is frontend-only and route-local; no backend business logic or
    contracts changed

- Verification:
  - `npm exec -- eslint src/components/MainDomainShortcutStrip.tsx src/pages/LoanWorkbenchPage.tsx src/pages/LoanReadinessPage.tsx src/pages/LoanSuggestionsPage.tsx src/pages/LoanSummaryPage.tsx src/pages/RepaymentPage.tsx src/pages/GuarantorInboxPage.tsx src/pages/GuarantorEarningsPage.tsx src/pages/RevenueAllocationPage.tsx src/pages/BorrowerPreflightPage.tsx src/pages/LoanDecisionPage.tsx`
    - passed with 4 pre-existing hook-dependency warnings only
  - `npm run build`
    - passed in `frontend/`

### Loan domain footer correction to shared app rail (2026-04-24)

- Purpose:
  - replace the temporary loan-page shortcut strip with the real shared
    app-wide bottom movement rail, so Loans uses the same base domain line as
    the rest of the mobile workspace.

- Files changed in this pass:
  - `frontend/src/layout/AppLayout.tsx`
  - `frontend/src/pages/LoansPage.tsx`
  - `frontend/src/pages/LoanWorkbenchPage.tsx`
  - `frontend/src/pages/LoanReadinessPage.tsx`
  - `frontend/src/pages/LoanSuggestionsPage.tsx`
  - `frontend/src/pages/LoanSummaryPage.tsx`
  - `frontend/src/pages/RepaymentPage.tsx`
  - `frontend/src/pages/GuarantorInboxPage.tsx`
  - `frontend/src/pages/GuarantorEarningsPage.tsx`
  - `frontend/src/pages/RevenueAllocationPage.tsx`
  - `frontend/src/pages/BorrowerPreflightPage.tsx`
  - `frontend/src/pages/LoanDecisionPage.tsx`
  - deleted `frontend/src/components/MainDomainShortcutStrip.tsx`

- Confirmed change:
  - The shared mobile bottom rail in `AppLayout` is now allowed to remain
    visible on the focused Loans / Support task routes instead of being hidden
    just because those pages are in task-focus mode.
  - Removed the temporary page-local loan shortcut strip from the loan domain
    pages so there is one source of truth for the base navigation again.
  - Reduced the extra bottom padding that had only been added to make the
    temporary strip fit.
  - `Admin` remains permission-based through the existing `canUseAdminTools`
    logic in `AppLayout`; it is not forced on for non-admin users.

- Routes/screens affected:
  - `/app/loans`
  - `/app/loan-readiness`
  - `/app/loan-suggestions`
  - `/app/loan-workbench`
  - `/app/guarantor-earnings`
  - `/app/payment/pool`
  - `/app/payment-rails`
  - `/app/payout-details`
  - `/app/payment/loans/:loanId`
  - `/app/withdrawal-instructions`
  - plus the page-local cleanup on:
    - `/app/loan-summary/:id`
    - `/app/guarantor-inbox`
    - `/app/revenue-allocation`
    - `/app/borrower-preflight`
    - `/app/loan-decision`

- Practical meaning:
  - Loans now returns to the same app-wide domain rail already used elsewhere,
    including `Trust` and, where permitted, `Admin`.
  - This keeps the major-domain movement in the shared shell rather than inside
    route-local substitute cards.

- Verification:
  - `npm exec -- eslint src/layout/AppLayout.tsx src/pages/LoansPage.tsx src/pages/LoanWorkbenchPage.tsx src/pages/LoanReadinessPage.tsx src/pages/LoanSuggestionsPage.tsx src/pages/LoanSummaryPage.tsx src/pages/RepaymentPage.tsx src/pages/GuarantorInboxPage.tsx src/pages/GuarantorEarningsPage.tsx src/pages/RevenueAllocationPage.tsx src/pages/BorrowerPreflightPage.tsx src/pages/LoanDecisionPage.tsx`
    - passed with 4 pre-existing hook-dependency warnings only
  - `npm run build`
    - passed in `frontend/`

### Loan/support color strengthening and real rail enrichment (2026-04-24)

- Continued the safe deep-cleaning pass after restoring the real shared bottom rail.
- Strengthened the real app-wide mobile bottom rail in `frontend/src/layout/AppLayout.tsx`:
  - richer blue-white gradient
  - stronger borders and shadows
  - firmer active-state fill and contrast
- Deepened the first loan/support pages so they stop reading as washed out compared with Marketplace:
  - `frontend/src/pages/LoansPage.tsx`
  - `frontend/src/pages/LoanWorkbenchPage.tsx`
  - `frontend/src/pages/LoanReadinessPage.tsx`
- Tightened:
  - route cards
  - helper text contrast
  - status pills
  - collapse buttons
  - secondary/soft action buttons
  - outer and inner card surfaces
- Route behavior and backend logic were not changed in this pass.
- Verification:
  - `npm exec -- eslint src/layout/AppLayout.tsx src/pages/LoansPage.tsx src/pages/LoanWorkbenchPage.tsx src/pages/LoanReadinessPage.tsx`
  - `npm run build`

### Loan/support shared rail completion and inner-page strengthening (2026-04-24)

- Continued the safe frontend-only cleanup in the loan/support domain.
- Completed the shared-shell bottom-rail allowlist in `frontend/src/layout/AppLayout.tsx` for the remaining focused routes:
  - `/app/loan-summary/:loanId`
  - `/app/guarantor-inbox`
  - `/app/revenue-allocation`
  - `/app/borrower-preflight`
  - `/app/loan-decision`
- Deepened the next flatter inner loan/support pages so they match the richer institutional direction already applied to Loans, Workbench, and Readiness:
  - `frontend/src/pages/LoanSuggestionsPage.tsx`
  - `frontend/src/pages/RevenueAllocationPage.tsx`
  - `frontend/src/pages/BorrowerPreflightPage.tsx`
  - `frontend/src/pages/LoanDecisionPage.tsx`
- Strengthened:
  - outer cards
  - inner cards
  - stat tiles
  - route tiles
  - helper text contrast
  - section labels
  - pills/badges
  - action buttons / links
- Corrected one route-local navigation typo in `LoanDecisionPage.tsx`:
  - `Guarantor Inbox` utility link now points to `/app/guarantor-inbox`
- No backend logic, auth, permissions, schemas, or business rules changed.

### Guarantor-side visual strengthening pass (2026-04-24)

- Continued the same route-local deep-cleaning pattern into the guarantor inner pages:
  - `frontend/src/pages/GuarantorInboxPage.tsx`
  - `frontend/src/pages/GuarantorEarningsPage.tsx`
- Deepened:
  - outer cards
  - inner cards
  - stat tiles
  - route tiles
  - action buttons
  - filter / collapse controls
  - helper text contrast
  - section labels
  - status badges
- Kept the work frontend-only with no backend or business-rule changes.

### Repayment and loan-summary strengthening pass (2026-04-24)

- Continued the same safe frontend-only tightening into the remaining lighter loan inner pages:
  - `frontend/src/pages/RepaymentPage.tsx`
  - `frontend/src/pages/LoanSummaryPage.tsx`
- Deepened:
  - page cards
  - soft cards
  - inner cards
  - stat tiles
  - route tiles
  - badges
  - helper text contrast
  - section labels
  - primary / secondary / soft action buttons
  - collapse controls
- Purpose of the pass:
  - keep the loan/support inner pages visually aligned with the richer Marketplace and updated loan pages
  - make buttons feel firmer and less washed out on phone without touching business logic
- Verification:
  - `npm exec -- eslint src/pages/RepaymentPage.tsx src/pages/LoanSummaryPage.tsx src/pages/GuarantorInboxPage.tsx src/pages/GuarantorEarningsPage.tsx`
  - `npm run build`
- Current lint warnings still present but pre-existing / not introduced in this pass:
  - `frontend/src/pages/GuarantorInboxPage.tsx` missing dependency warning for `loadInbox`
  - `frontend/src/pages/LoanSummaryPage.tsx` missing dependency warning for `refreshAll`

### Payment and payout inner-page strengthening pass (2026-04-24)

- Continued the same safe frontend-only deep-cleaning pass into the money-path inner pages:
  - `frontend/src/pages/PaymentInstructionsPage.tsx`
  - `frontend/src/pages/PaymentRailsPage.tsx`
  - `frontend/src/pages/WithdrawalInstructionsPage.tsx`
  - `frontend/src/pages/PayoutDetailsPage.tsx`
- Strengthened:
  - page cards
  - soft cards
  - inner cards
  - stat tiles
  - route tiles where present
  - helper text contrast
  - section labels
  - status pills/badges
  - primary / secondary / soft action buttons
  - collapse controls
  - input fields
- Purpose of the pass:
  - bring the payment and payout path up to the richer institutional standard already applied to loans and marketplace
  - make the button rows and input controls feel firmer on phone without touching route behavior or money logic
- Verification:
  - `npm exec -- eslint src/pages/PaymentInstructionsPage.tsx src/pages/PaymentRailsPage.tsx src/pages/WithdrawalInstructionsPage.tsx src/pages/PayoutDetailsPage.tsx`
  - `npm run build`
- Current lint warnings still present but pre-existing / not introduced in this pass:
  - `frontend/src/pages/WithdrawalInstructionsPage.tsx` missing dependency warning for `loadPage`

### Dashboard upload button stabilization and targeted inner-page cleanup (2026-04-25)

- Tightened the dashboard profile-picture upload/change control in
  `frontend/src/pages/DashboardPage.tsx` without touching the frozen Market
  Wisdom area.
- The dashboard avatar action button now uses the proper action-button guard
  path, with firmer chrome for phone taps:
  - stronger border
  - richer white/blue gradient
  - deeper shadow
  - slightly larger tap target
  - `translateZ(0)` / `pointerEvents: auto` / stronger z-index
- Removed the now-unused `dashboardPointerGuardProps()` helper after switching
  the avatar button fully onto `dashboardButtonGuardProps()`.
- Continued the same safe frontend-only strengthening into the marketplace/join
  inner route family:
  - `frontend/src/pages/MarketplaceWorkspacePage.tsx`
  - `frontend/src/pages/JoinEntryPage.tsx`
- Marketplace Workspace updates:
  - switched local surfaces onto the shared institutional surface helpers
  - deepened the main inner cards
  - strengthened the shared button chrome
  - applied local press guards to the real action buttons so taps feel steadier
    on phone
- Join Entry updates:
  - switched the request-launcher card onto the shared institutional inner-card
    surface so it no longer reads flatter than the newer pages
- Verification:
  - `npm exec -- eslint src/pages/DashboardPage.tsx src/pages/MarketplaceWorkspacePage.tsx src/pages/JoinEntryPage.tsx`
  - `npm run build`
- Result:
  - targeted eslint passed cleanly
  - frontend build passed

### Spotlight recovery for stale community selection (2026-04-25)

- Investigated the report that some invited members could reach the dashboard
  but could not see the admin's live spotlight or same-community shop
  experience.
- Confirmed from local data that clan `3` already has active members, an active
  shop, active community-visible products, and active marketplace broadcasts, so
  the missing spotlight was not caused by missing source data.
- Traced the likely break to stale `gmfn_selected_clan_id` state on some phones:
  `getMarketplaceBroadcasts(...)` was implicitly reusing that stored clan id and
  throwing a `403` before it could fall back to broader active-community data.
- Applied the smallest safe recovery in
  `frontend/src/lib/api.ts`:
  - `getMarketplaceBroadcasts(...)` now treats `403` on an implicitly inherited
    stored clan the same way it already treated `400` on the scoped attempts
    and continues to the fallback attempts instead of hard-failing immediately
  - explicit caller-provided clan ids still keep their normal stricter behavior
  - `getCurrentClan()` now self-heals a stale stored clan id back to the first
    active clan row returned by `/clans/me`, so later route loads can recover
    cleanly instead of preserving the dead selection forever
- Purpose of the pass:
  - restore spotlight visibility on phones carrying stale community selection
    without changing backend rules or broad selection behavior
  - reduce one concrete same-community visibility lapse before auditing
    notifications or deeper membership activation paths
- Verification:
  - `npm run build`
- Current lint state:
  - `npm exec -- eslint src/lib/api.ts` still reports pre-existing file-wide
    errors unrelated to this change (`no-empty`, unused `_payload`)

### Join-review notifications now reach all active reviewers (2026-04-25)

- Investigated the report that one community member could approve a join request
  but the second active person did not receive the join-review notification.
- Confirmed from code that the mismatch was real and system-level:
  - `vote_join_request(...)` already allows any active clan member to vote
  - `create_join_request(...)` was only notifying memberships with role
    `"admin"`
- Applied the smallest safe backend fix in
  `gmfn_backend/app/api/routes/clans.py`:
  - new join requests now notify all active memberships in the clan, not only
    admins
  - recipients are deduplicated by `user_id` before notifications are created
- Added a focused regression test in
  `gmfn_backend/tests/test_join_requests.py` to prove that a normal active
  member receives the `approval_request` notification alongside the admin.
- Purpose of the pass:
  - align the join-review notification audience with the actual voting rule
  - remove the product mismatch where the system could require multiple
    approvals but only alert admins
- Verification:
  - `python -m py_compile app/api/routes/clans.py tests/test_join_requests.py`
  - `python -m pytest tests/test_join_requests.py -q`
- Result:
  - compile passed
  - join-request suite passed: `13 passed`

### Join status pages now keep community and marketplace identity separate (2026-04-25)

- Investigated the report that a join-status screen could show a request tied to
  `GMFN-C-000003` while displaying an unexpected community name, creating the
  impression that lineage was being mixed together.
- Confirmed from local backend data that community code and community name can
  already be returned separately from the status endpoint, but the frontend
  status surfaces were still blending `community_name` and `marketplace_name`
  together in places.
- Updated:
  - `frontend/src/pages/JoinRequestPendingPage.tsx`
  - `frontend/src/pages/JoinApprovalPage.tsx`
- Changes made:
  - `JoinRequestPendingPage` now loads live backend status by `request_id`
    through `getJoinApprovalStatus(...)` instead of relying only on carried
    route state or query params
  - both pending and approval pages now treat:
    - `community_name`
    - `community_code`
    - `marketplace_name`
    as separate identity fields instead of collapsing community and marketplace
    into one fallback label
  - both pages now show `Community`, `Community ID`, and `Community / Market`
    separately whenever those values are available
- Purpose of the pass:
  - make request lineage easier to audit visually
  - reduce confusion when a request is being traced across invite, pending, and
    approval surfaces
- Verification:
  - `npm exec -- eslint src/pages/JoinRequestPendingPage.tsx src/pages/JoinApprovalPage.tsx`
  - `npm run build`
- Result:
  - frontend build passed
  - targeted eslint passed cleanly after memoizing the carried route state on
    `JoinRequestPendingPage`

### Reviewer notifications now refresh faster on Dashboard and Notifications (2026-04-25)

- Investigated the report that testers could submit a join request and see the
  pending state on their side, but reviewer phones were not seeing the review
  notification quickly enough.
- Confirmed from code that the backend notification audience mismatch had
  already been fixed earlier in the day; the next practical gap was frontend
  refresh cadence:
  - `frontend/src/pages/DashboardPage.tsx` was loading notice items only once
    on mount
  - `frontend/src/pages/NotificationsPage.tsx` was polling every `60000ms`
    with no `focus` / `visibilitychange` recovery
- Applied the smallest safe reviewer-facing refresh fix:
  - `DashboardPage.tsx`
    - pending join requests now refresh on:
      - initial load
      - `window.focus`
      - `document.visibilitychange`
      - a `15000ms` interval
    - notice items now refresh on:
      - initial load
      - `window.focus`
      - `document.visibilitychange`
      - a `15000ms` interval
  - `NotificationsPage.tsx`
    - full notification/guidance load now refreshes on:
      - initial load
      - `window.focus`
      - `document.visibilitychange`
      - a `15000ms` interval instead of `60000ms`
- Purpose of the pass:
  - make reviewer phones pick up newly created join-review notifications sooner
    without adding a broader real-time channel
  - reduce the gap between backend notification creation and visible reviewer UI
- Verification:
  - `npm exec -- eslint src/pages/DashboardPage.tsx src/pages/NotificationsPage.tsx`
  - `npm run build`
- Result:
  - targeted eslint passed cleanly
  - frontend build passed

### Pilot admin override added for blocked join approvals (2026-04-25)

- Investigated the product-owner request to let a tester continue when a join
  request is blocked waiting for an unknown second reviewer.
- Confirmed the existing backend rule was still valid:
  - active community members can vote on a join request
  - required approvals can remain greater than one when the community already
    has multiple active memberships
- Added a **pilot-only admin override** so the community admin can approve a
  pending join request without waiting for the second reviewer during testing.
- Backend changes:
  - `gmfn_backend/app/api/routes/clans.py`
  - `gmfn_backend/tests/test_join_requests.py`
- Frontend changes:
  - `frontend/src/lib/api.ts`
  - `frontend/src/pages/CommunityJoinRequestsPage.tsx`
- New behavior:
  - `GET /clans/{clan_id}/join-requests` now returns:
    - `reviewer_role`
    - `reviewer_can_pilot_approve`
  - new backend route:
    - `POST /clans/{clan_id}/join-requests/{join_request_id}/pilot-approve`
  - the community join-requests page now shows:
    - reviewer-role context
    - a pilot explanation card for admins
    - `Approve Now (Pilot)` on pending requests when the signed-in reviewer is
      an admin
- Important scope:
  - this does **not** remove the normal multi-reviewer rule for everyone
  - it adds a reversible pilot-unblock path for admins only
  - the override reuses the existing approval flow, so GMFN/GSN ID issuance,
    membership activation, and approval-result payloads stay aligned with the
    normal approval path
- Extra hardening:
  - `list_join_requests(...)` now reads community name safely from a slim clan
    object during tests instead of assuming `clan.name` is always present
  - `CommunityJoinRequestsPage.tsx` now uses a real local reviewer-role badge
    style instead of the missing `badge(...)` helper that had broken the build
- Verification:
  - `python -m pytest tests/test_join_requests.py -q`
  - `npm exec -- eslint src/pages/CommunityJoinRequestsPage.tsx`
  - `npm run build`
- Result:
  - backend join-request suite passed: `15 passed`
  - targeted eslint on `CommunityJoinRequestsPage.tsx` now has only one
    pre-existing hook-dependency warning for `load`
  - frontend build passed

### Local testing data cleanup for community `GMFN-C-000003` (2026-04-25)

- The product owner confirmed that:
  - `GMFN-U-A66CF7C0`
  - `GMFN-U-38EAA738`
  belonged to older duplicate-community testing and should no longer appear in
  the active membership line for `Aberdeen city ICA` /
  `Aberdeen city marketplace`.
- Confirmed from local DB before cleanup:
  - both users still had active `clan_memberships` rows in clan `3`
  - their older memberships in deleted/older clans were already closed with
    `left_at`
- Applied the smallest reversible cleanup in the local testing DB only:
  - set `left_at` on the active clan-`3` memberships for those two users
  - did **not** hard-delete users or historical join-request rows
- Resulting local state for community `GMFN-C-000003`:
  - active members: `1`
  - remaining active member:
    - `admin@test.com` / `GMFN-U-9867079C`
- Important:
  - this was a **local data cleanup**, not a backend code change
  - approved historical join-request rows for those users still exist in local
    DB for traceability
  - if the same cleanup is needed on live Render, it must be done against the
    live production data separately

### `Default Clan` hidden when a real community exists (2026-04-25)

- The product owner flagged that `Default Clan` was still appearing in
  `Community Home` like a normal created community, which was confusing because
  it is a system fallback rather than a real user-intended community.
- Re-confirmed from backend code:
  - `gmfn_backend/app/core/clan_auth.py`
  - `get_or_create_default_clan()` creates `Default Clan` automatically
  - `get_current_clan_membership()` can still fall back into that clan when a
    request arrives without an explicit clan header
- Applied the smallest safe frontend fix in:
  - `frontend/src/lib/api.ts`
- New behavior:
  - `listMyClans()` now filters `Default Clan` out of the visible community list
    whenever the user already has at least one real community
  - if `Default Clan` is the only clan available, it is still returned so the
    app keeps its fallback context
  - this improves:
    - `Community Home`
    - any screen using `listMyClans()` or `getCurrentClan()`
- Important scope:
  - this does **not** remove the backend fallback itself
  - this is a presentation/selection cleanup so `Default Clan` stops posing as a
    normal user community in the frontend
- Verification:
  - `npm run build`
- Result:
  - frontend build passed

### Invite join lane audit and steadier activation handoff (2026-04-25)

- The product owner asked for a route-truth audit of the public invite flow for
  joining an already existing community because the lane was feeling unstable
  and not app-led enough.
- Audited the real chain across backend and frontend:
  - frontend:
    - `frontend/src/pages/JoinEntryPage.tsx`
    - `frontend/src/pages/JoinRequestPendingPage.tsx`
    - `frontend/src/pages/JoinApprovalPage.tsx`
    - `frontend/src/pages/MemberActivationPage.tsx`
    - `frontend/src/lib/api.ts`
  - backend:
    - `gmfn_backend/app/api/routes/clans.py`
    - `gmfn_backend/tests/test_join_requests.py`
- Confirmed backend truth before changes:
  - public invite preview exists
  - join request submission exists
  - reviewers are notified on submission
  - approval generates `GMFN ID`, activation message, and activation link
  - status route already exposes approval status and activation details
- Confirmed weak points before changes:
  - `JoinEntryPage` still left too much manual movement after submit
  - `JoinRequestPendingPage` only checked approval status once, so a person
    could sit there without a steady continuation
  - approval notification used a generic `/activate-membership` route instead
    of the exact activation path the backend already knew
- Applied the smallest system-level fixes:
  - backend `gmfn_backend/app/api/routes/clans.py`
    - added `_frontend_activation_path(...)`
    - activation package now carries both:
      - `activation_path`
      - `activation_link`
    - approval-success notification now points to the exact activation route
      with `gmfn_id` and `request_id`
    - join-request status fallback now rebuilds activation path/link with
      `request_id` included
  - frontend `frontend/src/pages/JoinEntryPage.tsx`
    - when a live invite is ready, the request form now opens automatically
    - after successful join submission, the user is pushed directly into the
      pending-review lane instead of being left to decide what to do next
  - frontend `frontend/src/pages/JoinRequestPendingPage.tsx`
    - approval status now polls every 8 seconds
    - when approved, the page forwards the user into activation with the exact
      activation path / identity context
    - when rejected, the page forwards into the approval-status page instead of
      leaving the user in a stale pending screen
- Verification:
  - frontend build: `npm run build`
  - backend tests: `.\\.venv\\Scripts\\python -m pytest tests/test_join_requests.py`
- Result:
  - frontend build passed
  - backend join-request suite passed: `15 passed`

### Forced `Default Clan` fallback removed (2026-04-25)

- The product owner confirmed that nobody should be forced into a default
  community and that `Default Clan` should stop appearing as the first
  community option.
- Re-audited the real system-level behavior:
  - `gmfn_backend/app/core/clan_auth.py`
  - `gmfn_backend/app/api/routes/clans.py`
  - `gmfn_backend/app/services/clans_service.py`
  - `frontend/src/lib/api.ts`
- Confirmed backend truth before this pass:
  - `get_current_clan_membership()` still fell back to `Default Clan` when a
    user had no real active community
  - visible clan filtering still allowed `Default Clan` through when it was the
    only membership
  - normal clan join/select routes did not block `Default Clan`
- Applied the smallest safe system-level change:
  - backend `gmfn_backend/app/core/clan_auth.py`
    - removed automatic fallback to `Default Clan`
    - `list_visible_user_clans()` now returns only real communities
    - `get_current_clan_membership()` now raises a clear
      `No community selected. Create or join a community first.` error when the
      user has no real community instead of auto-assigning one
  - backend `gmfn_backend/app/services/clans_service.py`
    - `list_my_clans()` now excludes `Default Clan` completely
  - backend `gmfn_backend/app/api/routes/clans.py`
    - normal `join` and `select` routes now refuse `Default Clan`
  - frontend `frontend/src/lib/api.ts`
    - `listMyClans()` filtering now excludes `Default Clan` even when it is the
      only row returned
- Local database check:
  - local DB still contains an old `Default Clan` row
  - active memberships in that clan are now `0`
  - no additional local data cleanup was needed because there were no active
    forced memberships left
- Verification:
  - frontend build: `npm run build`
  - backend tests:
    - `.\\.venv\\Scripts\\python -m pytest tests/test_join_requests.py tests/test_default_clan_removal.py`
- Result:
  - frontend build passed
  - backend tests passed: `17 passed`
- Important remaining product note:
  - the lane is now steadier and more app-led, but the user-facing copy can
    still be simplified further if the product owner wants an even stronger
    “the app leads every next step” tone before freezing this route
### Public shop / gallery now reads through a true public route (2026-04-25)

- Product-owner concern:
  - spotlight uploads and shop gallery updates felt owner-only
  - public-facing shop results were not reliably showing what had been uploaded
  - the risk was that earlier fixes may have been page-local instead of a
    truthful system-level lane
- Re-audited the real write and read paths:
  - owner-side write/publish logic was already real:
    - `frontend/src/pages/ShopControlPage.tsx`
    - `frontend/src/pages/ShopAssetsPage.tsx`
    - backend upload/publish routes under:
      - `gmfn_backend/app/api/routes/marketplace.py`
      - `gmfn_backend/app/api/routes/marketplace_media.py`
  - the main mismatch was the public shop face:
    - `frontend/src/pages/ShopGalleryPage.tsx`
    - it was still reading through member-only marketplace endpoints instead of
      a dedicated public route
- Applied the smallest system-level fix:
  - backend `gmfn_backend/app/api/routes/marketplace.py`
    - added `GET /marketplace/public/shop/{gmfn_id}`
    - returns:
      - canonical shop
      - community-visible products
      - active broadcasts
      - primary broadcast
      - community metadata
    - no auth dependency on this read route
    - still respects existing media-availability filtering through shared
      serializers
  - frontend `frontend/src/lib/api.ts`
    - added `getPublicMarketplaceShopByGmfnId(...)`
  - frontend `frontend/src/pages/ShopGalleryPage.tsx`
    - public shop page now reads through the new public route instead of
      member-only `getMarketplaceShopByGmfnId(...)`,
      `getMarketplaceProducts(...)`, and `getMarketplaceBroadcasts(...)`
    - this aligns the public-facing page with the actual published system data
- Added backend proof:
  - `gmfn_backend/tests/test_marketplace_public_shop.py`
    - verifies saved public product + spotlight return on the public route
    - verifies missing media links are hidden instead of leaking broken URLs
- Verification:
  - frontend build: `npm run build`
  - backend tests:
    - `.\\.venv\\Scripts\\python -m pytest tests/test_marketplace_public_shop.py`
- Result:
  - frontend build passed
  - backend public-shop tests passed: `2 passed`
- Important remaining product note:
  - if owners still report that uploads disappear after this fix, the next
    audit target is persistent upload storage / file survival rather than the
    public read route itself

### Shop control free spotlight flow simplified in-place (2026-04-25)

- Product-owner concern:
  - free spotlight still felt like multiple pages doing the same work
  - after choosing media on phone, the page could appear to jump back to the
    beginning instead of staying inside the same spotlight draft flow
  - the desired behavior is:
    - open free spotlight
    - choose picture and/or video
    - see draft preview immediately
    - publish from the same section
- Re-audited the real route:
  - `frontend/src/pages/ShopControlPage.tsx`
  - owner-side spotlight publish logic was already real, but the UX had two
    weak points:
    - background focus / visibility refresh could push the whole page into a
      top-level loading state when the phone file picker closed
    - the free composer carried too many mode switches and optional paths,
      making it feel duplicated against the separate paid spotlight card
- Applied the smallest safe fix:
  - `frontend/src/pages/ShopControlPage.tsx`
    - `loadPage(...)` now supports background refresh without replacing the
      whole page with the loading screen during file-picker return
    - periodic, focus, and visibility refreshes now run in background mode
    - spotlight open handler now accepts an explicit mode:
      - free
      - paid
    - main recommendation button now opens free spotlight directly
    - paid spotlight card now opens the publisher already in paid mode
    - free/publisher section copy now states clearly that everything happens in
      one section
    - free composer layout now keeps:
      - message
      - picture picker
      - short video picker
      - live draft preview
      - publish
      in one in-place block
    - visible manual URL fields were removed from the main draft surface to
      reduce duplication and confusion
- Verification:
  - frontend build: `npm run build`
- Result:
  - frontend build passed
- Important remaining product note:
  - this simplifies the route shape and removes the strongest phone jump-back
    cause, but it should still be phone-tested once deployed to confirm the
    picker return now feels steady in real use

### Shop spotlight publish now targets the shop's real community only (2026-04-25)

- Product-owner concern:
  - after media attach, the publish action still did not feel trustworthy
  - spotlight behavior showed signs of duplication
  - the likely system-level risk was that one shop spotlight publish was being
    treated like a whole-account broadcast instead of a publish for the selected
    shop/community
- Re-audited the backend route:
  - `gmfn_backend/app/api/routes/marketplace.py`
  - `POST /marketplace/broadcasts`
- Confirmed weak point before this fix:
  - when `shop_id` was supplied, the route still expanded the publish into all
    active clan memberships for the current user
  - that could:
    - create duplicate shop spotlight rows
    - let one unrelated clan capacity block the whole publish
    - make one shop spotlight look inconsistent across routes
- Applied the smallest safe system-level fix:
  - `gmfn_backend/app/api/routes/marketplace.py`
    - when a shop-owned spotlight is created:
      - the shop's own `clan_id` becomes the resolved target community
      - membership is checked against that real shop community
      - `target_clan_ids` becomes only `[shop.clan_id]`
    - non-shop generic broadcasts keep their wider multi-clan behavior
- Added backend proof:
  - `gmfn_backend/tests/test_marketplace_public_shop.py`
    - new regression test verifies that a shop spotlight publish creates a
      record only for the shop's own community, even when the owner belongs to
      multiple communities
- Verification:
  - backend tests:
    - `.\\.venv\\Scripts\\python -m pytest tests/test_marketplace_public_shop.py`
  - frontend build:
    - `npm run build`
- Result:
  - backend tests passed: `3 passed`
  - frontend build passed
- Important remaining product note:
  - after deploy, phone-test one free spotlight publish again. If publish still
    fails after this routing fix, the next audit target is the live frontend
    error surfacing around the publish response, not the community targeting
    rule itself

### Shop control spotlight publish now uploads media against the shop's own community (2026-04-25)

- Product-owner concern:
  - even after the community-targeting fix, the publish button still did not
    feel reliable in the live shop spotlight flow
- Re-audited the frontend publish path:
  - `frontend/src/pages/ShopControlPage.tsx`
- Confirmed weak point before this fix:
  - spotlight media upload during publish still used `selectedClanId`
  - final spotlight publish already used the shop's own community truth
  - if the selected clan state was stale, empty, or different from the shop's
    real community, media upload could fail before the broadcast was created
- Applied the smallest safe frontend fix:
  - `frontend/src/pages/ShopControlPage.tsx`
    - added `effectiveShopClanId`
    - shop picture upload now uses the shop's real community id
    - spotlight image upload now uses the shop's real community id
    - spotlight video upload now uses the shop's real community id
    - final broadcast publish also uses the same `effectiveShopClanId`
    - this keeps upload and publish on one consistent route truth
- Verification:
  - frontend build: `npm run build`
- Result:
  - frontend build passed
- Important remaining product note:
  - if publish still fails after this deploy, the next step should be to keep
    a persistent inline publish error block in the spotlight composer so the
    exact backend rejection stays visible instead of fading as a short notice

### Free spotlight lane audited end-to-end with frontend and backend fixes (2026-04-25)

- Product-owner concern:
  - the free spotlight lane still felt dead or jumpy after media attach:
    - the draft could disappear after file-picker return
    - a successful publish could still look like a failure
    - the owner page could re-read through the wrong community and hide the
      just-published spotlight
- Audit scope:
  - `frontend/src/pages/ShopControlPage.tsx`
  - `gmfn_backend/app/api/routes/marketplace.py`
  - `gmfn_backend/tests/test_marketplace_public_shop.py`
- Confirmed weak points before this fix:
  - owner rereads were still tied to `selectedClanId` even when the shop itself
    belonged to another community
  - free spotlight success was coupled to the follow-up refresh, so a refresh
    failure could relabel a real publish as `"Spotlight could not be created."`
  - choosing a new image or video cleared the existing draft too early, even if
    the new pick was cancelled or rejected
  - shop-backed publish could still be rejected by stale explicit/header clan
    input before the backend had a chance to anchor the publish to the shop's
    own community
- Applied the smallest safe fixes:
  - `frontend/src/pages/ShopControlPage.tsx`
    - shop control now loads shop data through
      `getMarketplaceShopByGmfnId(...)`
    - once the shop is known, broadcasts, private products, and expected
      payments re-read through the shop's own `clan_id` instead of the global
      selected clan
    - free and paid spotlight hash entry now both reopen the correct in-page
      spotlight publisher mode
    - image/video re-picks no longer wipe a good draft before the new file is
      validated
    - publish success is now separated from refresh success
    - the spotlight composer now keeps an inline publish feedback card so the
      result stays visible in the same panel
  - `gmfn_backend/app/api/routes/marketplace.py`
    - when `shop_id` is present, shop spotlight publish now resolves the shop
      first and then anchors the publish to `shop.clan_id` before any stale
      explicit/header clan can reject it
- Added backend proof:
  - `gmfn_backend/tests/test_marketplace_public_shop.py`
    - added regression coverage proving that an owned shop spotlight can still
      publish when a stale clan id/header is sent with the request
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/ShopControlPage.tsx`
  - frontend build:
    - `npm run build`
  - backend tests:
    - `.\\gmfn_backend\\.venv\\Scripts\\python -m pytest gmfn_backend/tests/test_marketplace_public_shop.py`
- Result:
  - frontend lint passed
  - frontend build passed
  - backend tests passed: `4 passed`
- Important remaining product note:
  - after deploy, phone-test the exact free spotlight lane again:
    - open free spotlight
    - attach image or short video
    - confirm the draft preview stays in place
    - publish from the same panel
    - confirm the inline result stays visible and the live spotlight card updates

### Free spotlight now runs inside a guided portal instead of leaving the user inside full shop control (2026-04-25)

- Product-owner expectation:
  - once the user chooses spotlight, the app should suspend the rest of the page
    and lead the person through one deterministic flow:
    - choose free or paid spotlight
    - choose picture, video, or both
    - upload
    - preview
    - publish
    - finish or cancel
- Applied route-local guidance changes:
  - `frontend/src/pages/ShopControlPage.tsx`
    - when spotlight opens, Shop Control now switches into a dedicated
      spotlight portal view instead of leaving the whole shop page on screen
    - free and paid spotlight both enter the same guided portal
    - the portal now shows step progress:
      - `Add media`
      - `Preview and publish`
    - users can now choose:
      - free spotlight
      - paid spotlight
      - picture only
      - video only
      - picture and video
    - once media is ready, the portal moves into preview/publish instead of
      making the user keep navigating around the wider page
    - spotlight portal now includes an inactivity timeout:
      - after 5 minutes without interaction, the portal closes and tells the
        user to reopen it when ready
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/ShopControlPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed
- Product note:
  - this portal behavior is now the best reference for later process-led lanes
    such as votes, payment-in, payment-out, withdrawal, and other subscription
    actions that should lead the user step by step instead of leaving the whole
    page active underneath

### Spotlight portal action buttons restored for mobile taps (2026-04-25)

- Product-owner complaint:
  - inside the new spotlight portal, these buttons still felt dead:
    - `Publish spotlight`
    - `Cancel spotlight`
    - `Back to upload`
- Confirmed weak point:
  - the portal buttons were still using the heavier shop-control guard layer,
    which could swallow taps before the actual button action fired reliably on
    mobile
- Applied smallest safe fix:
  - `frontend/src/pages/ShopControlPage.tsx`
    - removed the extra click-capture guard from `buttonGuardProps()`
    - changed the spotlight portal action buttons to plain direct click
      handlers with local `preventDefault()` / `stopPropagation()`
    - this keeps the buttons protected from layout interference without blocking
      the actual action
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/ShopControlPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed

### Spotlight now leads through first shop setup instead of failing with "shop record is not available" (2026-04-25)

- Product-owner complaint:
  - opening spotlight before the shop was fully prepared could still lead to
    `"Shop record is not available."`
  - this left the user inside the process without the app guiding the missing
    prerequisite first
- Applied smallest safe guidance fix:
  - `frontend/src/pages/ShopControlPage.tsx`
    - spotlight portal now starts with a `Prepare shop` step whenever no real
      shop record exists yet
    - the same spotlight portal lets the user complete the basic shop identity:
      - shop name
      - WhatsApp
      - Telegram
      - description
    - GSN then creates the first canonical shop record from inside the portal
      and automatically advances the user into the upload step
    - if the community is not selected yet, the portal explains that selection
      must happen first instead of letting the later spotlight publish fail
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/ShopControlPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed

### Community Home "What do you want to do?" now explains the first required step before routing (2026-04-25)

- Product-owner requirement:
  - the shared guidance block on Community Home should not dump people into
    routes too quickly
  - GSN should first explain the first required step, then lead the person
    onward
  - spotlight must check its shop prerequisite before opening anything
- Applied the smallest safe route-plus-shared fix:
  - `frontend/src/components/NextActionGuide.tsx`
    - added optional guided-resolution support
    - when a page supplies a resolver, the guide now:
      - lets the user pick or type an action
      - asks GSN to check the first required step
      - shows a short explanation card
      - only continues after the user confirms
  - `frontend/src/pages/CommunityHomePage.tsx`
    - Community Home now uses the guided-resolution path
    - spotlight intent now checks:
      - whether a community is selected
      - whether the member already has a shop in that community
    - if no community is selected, GSN leads back to the community list
    - if no shop exists yet, GSN says to prepare the shop first and opens the
      shop setup route from there
    - marketplace, shop control, and loans/support now also explain their
      community prerequisite instead of only appearing disabled
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/components/NextActionGuide.tsx src/pages/CommunityHomePage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed

### Shared next-action typing is now stricter and no longer auto-jumps on weak guesses (2026-04-25)

- Product-owner complaint:
  - typing a request such as spotlight-related text could still jump into the
    wrong route
  - weak keyword overlap was too willing to open unrelated pages
- Applied the smallest safe shared fix:
  - `frontend/src/components/NextActionGuide.tsx`
    - guide matching now strips filler words such as `want`, `open`, `close`,
      `please`, and similar low-signal tokens
    - matching now scores labels, technical names, and keywords much more
      strongly than long descriptive body text
    - weak or ambiguous matches are now rejected instead of guessed
    - typed submit now stops on a confirmation card before routing, even on
      pages that do not use the newer resolver hook yet
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/components/NextActionGuide.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed

### Shared next-action quick-choice buttons now also stop on confirmation first (2026-04-25)

- Product-owner complaint:
  - the new next-action buttons still felt too quick and too jumpy
  - even when typing was improved, a clicked quick choice could still feel like
    it fired too fast
- Applied the smallest safe shared fix:
  - `frontend/src/components/NextActionGuide.tsx`
    - quick-choice buttons now behave like typed requests
    - they open the confirmation / explanation card first
    - only the second confirm action continues into the route
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/components/NextActionGuide.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed

### Community Home spotlight now opens as a family first, then asks for the exact next path (2026-04-25)

- Product-owner requirement:
  - typing or choosing `Spotlight` should not be the final routing decision
  - GSN should first open the spotlight family, then let the person choose:
    - free spotlight
    - subscription spotlight
    - Vault
    - shop setup
- Applied the smallest safe shared-plus-route fix:
  - `frontend/src/components/NextActionGuide.tsx`
    - guide items can now carry child actions
    - choosing a parent item now opens a child step inside the same guide
    - the guide shows `What do you want under ...?` and allows stepping back
  - `frontend/src/pages/CommunityHomePage.tsx`
    - `Spotlight` is now a family item instead of a final action
    - Community Home now offers:
      - `Free spotlight`
      - `Subscription spotlight`
      - `Vault`
      - `Shop setup`
    - each child path now checks its own prerequisites before opening the next
      route
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/components/NextActionGuide.tsx src/pages/CommunityHomePage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed

### Community Home now suspends unrelated sections while Spotlight guidance is active (2026-04-26)

- Product-owner correction:
  - once the person chooses `Spotlight` inside `What do you want to do next?`,
    Community Home should stop showing unrelated tools
  - the guide should hold the screen on the spotlight task until the person
    continues, goes back one step, or cancels
- Applied the smallest safe route-local fix:
  - `frontend/src/components/NextActionGuide.tsx`
    - added optional `onBranchChange` so a route can react when the guide enters
      or leaves a child-action family
  - `frontend/src/pages/CommunityHomePage.tsx`
    - Community Home now detects when the guide is inside the `Spotlight`
      family
    - while that spotlight family is active, the rest of Community Home is
      hidden
    - the screen now keeps only:
      - the guide itself
      - any notice
      - one spotlight-task explanation card
    - backing out of the spotlight family restores the wider Community Home
      surface
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/components/NextActionGuide.tsx src/pages/CommunityHomePage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed

### Community Home owner collapse buttons now live inside the large owner cards and toggle directly (2026-04-26)

- Product-owner complaint:
  - the owner-side collapse buttons still felt jumpy
  - `Owner shop control` and `Owner spotlight status` should keep their open /
    collapse controls inside the large cards themselves
- Applied the smallest safe frontend fix:
  - `frontend/src/pages/CommunityHomePage.tsx`
    - moved the owner-card collapse buttons into calmer in-card control rows
    - renamed the labels to be more explicit:
      - `Open owner actions` / `Collapse owner actions`
      - `Open spotlight status` / `Collapse spotlight status`
    - removed the old delayed toggle for Community Home section collapse, so the
      buttons now act directly on tap
  - `frontend/src/components/CommunityShopControlPanel.tsx`
    - moved the owner shop-control collapse button into its own in-card control
      row
    - changed the label to `Open owner shop control` /
      `Collapse owner shop control`
    - removed the old delayed toggle here too, so the button acts directly on
      tap
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/CommunityHomePage.tsx src/components/CommunityShopControlPanel.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed

### Frontend LAN preview is now enabled for phone testing (2026-04-26)

- Product-owner need:
  - phone UX must be viewable directly from the laptop dev server
- Applied the smallest safe frontend config fix:
  - `frontend/vite.config.ts`
    - added `server.host = "0.0.0.0"` so Vite listens on the local network,
      not only on localhost
- Local runtime confirmation:
  - frontend dev server is listening on `0.0.0.0:5173`
  - laptop Wi-Fi IPv4 is `192.168.1.38`
  - phone preview URL is `http://192.168.1.38:5173`
- Verification:
  - frontend build:
    - `npm run build`
- Result:
  - frontend build passed

### Spotlight branch in the guided action lane now shows spotlight-only handles (2026-04-26)

- Product-owner correction from live screenshots:
  - once the user enters `Spotlight`, the guide must stop showing the wider
    community action list
  - the spotlight branch should behave like its own handle block and keep only
    spotlight-related options visible
- Applied the smallest safe fix:
  - `frontend/src/components/NextActionGuide.tsx`
    - branch mode now renders `activeItems` in the quick-choice list instead of
      always rendering the top-level list
    - spotlight branch helper text was tightened so it reads like a spotlight
      handle family instead of duplicating the generic wording
  - `frontend/src/pages/CommunityHomePage.tsx`
    - the spotlight suspended-task card now explicitly lists the spotlight
      family handles:
      - Free spotlight
      - Subscription spotlight
      - Vault
      - Shop setup
    - it also explains the shop-first rule in plain language
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/components/NextActionGuide.tsx src/pages/CommunityHomePage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed

### Spotlight is now treated as an intent entry that opens a dedicated spotlight task surface (2026-04-26)

- Product-owner direction:
  - `What do you want to do next?` should identify the user's intent
  - after the user chooses `Spotlight`, the app should hand off into a proper
    spotlight decision surface instead of keeping the user inside a small guide
    widget
  - the real spotlight handles should then live on that dedicated surface
- Applied the smallest safe route-local refactor:
  - `frontend/src/pages/CommunityHomePage.tsx`
    - `Spotlight` in the next-action guide is now a single intent entry, not a
      child-action tree inside the guide
    - choosing `Spotlight` now opens the dedicated spotlight task surface in
      Community Home
    - that surface now carries the real spotlight handles directly:
      - `Free spotlight`
      - `Subscription spotlight`
      - `Vault`
      - `Shop setup`
    - spotlight handle buttons now run the same prerequisite checks and then
      continue into the correct route
    - if a shop must be prepared first, the existing spotlight prerequisite
      logic is still reused
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/CommunityHomePage.tsx src/components/NextActionGuide.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed

### Major-domain guides can now hand off into the same Spotlight task surface (2026-04-26)

- Product-owner direction:
  - users are likely to start from `Dashboard` or another major domain when they
    want to work on Spotlight
  - `What do you want to do next?` should let them type `spotlight` from those
    domains and still be led into the correct guided Spotlight family
  - the guided Spotlight family should stay centralized instead of being rebuilt
    differently on every page
- Applied the smallest safe frontend-only change:
  - `frontend/src/pages/CommunityHomePage.tsx`
    - now accepts `?guide=spotlight` as a route handoff signal
    - when present, Community Home opens the dedicated Spotlight task surface,
      expands the spotlight area, scrolls to it, and then clears the query from
      the URL
  - `frontend/src/pages/DashboardPage.tsx`
    - added a dedicated `Spotlight` next-action item that routes to
      `/app/community?guide=spotlight`
    - removed the `spotlight` keyword from the broader `Community Home` item so
      typed Spotlight intent does not get swallowed by the generic community
      route
  - `frontend/src/pages/FinancePage.tsx`
  - `frontend/src/pages/LoansPage.tsx`
  - `frontend/src/pages/TrustScorePage.tsx`
    - each now includes a direct `Open spotlight guide` next-action entry that
      routes to `/app/community?guide=spotlight`
- Route impact:
  - `/app/dashboard`
  - `/app/finance`
  - `/app/loans`
  - `/app/trust`
  - `/app/community`
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/CommunityHomePage.tsx src/pages/DashboardPage.tsx src/pages/FinancePage.tsx src/pages/LoansPage.tsx src/pages/TrustScorePage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed with one pre-existing warning in `TrustScorePage.tsx`
    about a missing `loadAll` hook dependency
  - frontend build passed

### Shop Control was simplified for readability and lower-cognitive-use owner flow (2026-04-26)

- Product-owner direction from live screenshots:
  - `Shop Control` was too dark, too crowded, and too hard to read for
    non-technical users
  - the major owner handle page should feel simpler, clearer, and less
    double-minded
  - only the basic actions should dominate; the rest should remain available
    without competing equally for attention
- Applied the smallest safe route-local UI simplification:
  - `frontend/src/pages/ShopControlPage.tsx`
    - simplified `PageTopNav` links so the top strip has fewer competing pills
    - changed the top summary block from a dark heavy owner wall to a lighter
      readable owner page surface
    - rewrote the summary copy in simpler owner-facing language
    - replaced the dense badge cluster with a smaller set of readable summary
      tiles
    - shortened several repeated labels:
      - `Public Shop Face` -> `Public Shop`
      - `Copy Public Shop Face Link` -> `Copy Public Link`
      - `Start 6-slot payment` -> `Start 6-slot plan`
      - `Create Vault access link` -> `Create access link`
    - simplified the `Paid access` introduction into `Optional paid tools`
    - softened the lower `Private Vault access` section from dark blue into a
      lighter readable surface while keeping the same actions
    - simplified the `Public shop face` helper copy and de-emphasized the image
      URL wording
    - renamed `Slot usage` to `Shop summary` to make the section clearer
- Route impact:
  - `/app/shop-control`
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/ShopControlPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed

### Shop Control was restored to stronger institutional GSN presentation (2026-04-26)

- Product-owner correction after live review:
  - the simplified `Shop Control` pass improved clarity but lost too much of
    the institutional GSN look
  - the page needed the original blue/white/gold strength back, with sharper
    edges, better contrast, and a more official feel
  - the surface should stay simpler than before, but it should no longer feel
    washed out or amateur
- Applied the smallest safe route-local styling correction:
  - `frontend/src/pages/ShopControlPage.tsx`
    - strengthened the page shell with darker branded blue rails and cleaner
      white-center contrast
    - restored the owner summary section to a deep GSN blue header with gold
      label treatment and higher-contrast copy
    - sharpened card edges, borders, shadows, and spacing across summary,
      helper, and status surfaces
    - upgraded badges and secondary buttons from pale washed tones to stronger
      institutional white/blue and gold gradients
    - darkened helper text and section labels so the page remains readable on
      real devices
    - kept the earlier simplification of structure while restoring the stronger
      branded presentation
- Route impact:
  - `/app/shop-control`
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/ShopControlPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed

### Dashboard `Find action` no longer shares its text search with broad recommendation cards (2026-04-26)

- Product-owner issue:
  - the `Find action` button inside `What do you want to do next?` on
    `Dashboard` was still jumping wrongly
  - the likely cause was that typed intent was being matched against the same
    mixed list used to display dynamic priority and supporting recommendation
    cards, not only the stable user-intent routes
- Applied the smallest safe change:
  - `frontend/src/components/NextActionGuide.tsx`
    - added an optional `searchItems` prop so a route can keep one list for
      visible quick choices and another, safer list for typed intent matching
    - existing pages continue to work as before when `searchItems` is not
      provided
  - `frontend/src/pages/DashboardPage.tsx`
    - created a Dashboard-specific search list that excludes dynamic
      `priority-*` and `support-*` recommendation cards
    - Dashboard now keeps showing those recommendation cards visually, but typed
      `Find action` matching only uses the stable route-intent items
- Route impact:
  - `/app/dashboard`
- Shared logic impact:
  - `NextActionGuide` gained a backward-compatible `searchItems` lane for safer
    typed matching where needed
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/components/NextActionGuide.tsx src/pages/DashboardPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed

### Shared next-action guide buttons were hardened for steadier mobile use (2026-04-26)

- Product-owner issue:
  - the new guided `What do you want to do next?` family was still suffering
    from jumpy button behavior during live Dashboard testing
  - the problem needed to be solved at the shared guide level so the same fix
    benefits Dashboard and the other guided domains
- Applied the smallest safe shared-frontend fix:
  - `frontend/src/components/NextActionGuide.tsx`
    - added one centralized guarded press path for guide buttons
    - back/open/close, quick-choice, continue, and `Find action` buttons now
      use the same direct activation logic
    - duplicate taps on the same guide control inside a short window are now
      ignored so mobile click + touch/click echo does not trigger a second,
      conflicting guide action
    - the shared guide still stops unrelated parent handlers, but it now
      activates its own buttons through a tighter controlled lane
- Route impact:
  - every screen using `NextActionGuide`
  - especially `/app/dashboard` during typed-intent testing
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/components/NextActionGuide.tsx src/pages/DashboardPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed

### Dashboard attention guide no longer auto-opens as a full blocking panel on phone (2026-04-26)

- Product-owner issue from phone testing:
  - the Dashboard attention guide was staying visibly active on phone and felt
    like it could be contributing to jumpy-button behavior
  - the attention surface needed to stay under control instead of taking over
    the phone screen by default
- Applied the smallest safe Dashboard-only fix:
  - `frontend/src/pages/DashboardPage.tsx`
    - phone view no longer auto-opens the full attention guide panel when the
      signal is active
    - on phone, the attention signal now stays as a reminder surface until the
      user deliberately opens it
    - desktop/non-phone behavior remains unchanged
- Route impact:
  - `/app/dashboard`
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/DashboardPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed
  - product-owner confirmed the phone behavior is now under control and this
    Dashboard attention-guide lane should be treated as frozen unless a later
    task explicitly asks to change it

### Community Home spotlight and community-list controls were structurally calmed (2026-04-26)

- Product-owner issue:
  - Community Home still had underlaying jumpiness even after earlier guide
    stabilization
  - the spotlight family could still aim at hidden destinations while the page
    was in suspended spotlight mode
  - the communities section still used a broad clickable header surface instead
    of one explicit collapse button
- Applied the smallest safe route-local cleanup:
  - `frontend/src/pages/CommunityHomePage.tsx`
    - replaced the old timer-driven community reveal helpers with one shared
      `requestAnimationFrame`-based reveal lane that cancels previous jobs
    - guided Spotlight now clears conflicting hash-driven scroll competition by
      removing the hash when `?guide=spotlight` is consumed
    - opening the inline spotlight workspace now clears the suspended spotlight
      guide first, so the launcher no longer targets a hidden owner workspace
    - Spotlight `choose community` handoffs now restore Community Home before
      opening the communities section
    - removed the duplicate `Cancel` exit in the suspended spotlight surface
    - converted the communities section from a full-header clickable surface to
      an explicit `Open communities` / `Collapse communities` button
  - `frontend/src/components/CommunityShopControlPanel.tsx`
    - removed a dead collapse timer ref left over from older interaction logic
- Route impact:
  - `/app/community`
- Shared logic impact:
  - no backend or cross-route contract changes
  - this is a Community Home route-local interaction cleanup
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/CommunityHomePage.tsx src/components/CommunityShopControlPanel.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed
  - ready for phone regression on Community Home spotlight handoff, owner shop
    control reveal, and communities collapse/open behavior before freezing

### Community Home spotlight surface regained its own top collapse control (2026-04-26)

- Product-owner issue:
  - after the structural Community Home cleanup, the `What do you want to do
    next?` Spotlight surface still did not expose a clear working top
    `Collapse` control during phone testing
- Applied the smallest safe route-local follow-up:
  - `frontend/src/pages/CommunityHomePage.tsx`
    - added a real top `Collapse` button to the suspended spotlight surface so
      it matches the guide pattern and exits Spotlight mode directly back into
      Community Home
- Route impact:
  - `/app/community`
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/CommunityHomePage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed

### Dashboard spotlight/task-start buttons stabilized (2026-04-26)

- Product-owner issue:
  - Dashboard still felt unpredictable for first-time users because Spotlight
    task-start buttons were not all using the same path
  - some Dashboard buttons still lived inside passive wrapper layers that could
    intercept taps around the real button
- Applied the smallest safe route-local cleanup:
  - `frontend/src/pages/DashboardPage.tsx`
    - added one shared Dashboard Spotlight guide launcher and routed Dashboard
      Spotlight task-start actions through `/app/community?guide=spotlight`
    - changed Dashboard Spotlight task-entry labels from generic `Open
      spotlight` / `Open community home` into clearer `Open spotlight tasks`
      where the real destination is the guided Spotlight family
    - kept route-local preview/support actions like `Market`, `Shop`, and
      `Hide` in place
    - removed passive wrapper click-catchers around the Demand Box primary CTA
      and Notifications action grid so the real button handles the tap more
      directly
    - removed the now-dead old local Spotlight opener so stale underlaying
      behavior does not linger underneath the newer guided path
- Route impact:
  - `/app/dashboard`
- Shared logic impact:
  - no backend change
  - no cross-route contract change beyond Dashboard using the already-existing
    Community Home guided Spotlight route more consistently
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/DashboardPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed
  - ready for phone regression on Dashboard `Find action`, Spotlight task
    entry, Demand Box primary action, and Notifications action buttons

### Dashboard inner pages reached a calmer safe checkpoint (2026-04-26)

- Product-owner issue:
  - after the Dashboard route-local cleanup, the first inner pages users reach
    from Dashboard still felt less steady than the Dashboard itself
  - the biggest reported concern was that users could feel delayed or sticky
    responses after entering Dashboard-linked pages like Notifications and
    Demand Box
- Applied the smallest safe inner-page pass:
  - `frontend/src/pages/NotificationsPage.tsx`
    - changed the primary notice action so the page no longer waits for
      `markAsRead()` before moving the user forward
    - read-marking now runs in the background, which should make the first
      action feel more immediate
  - `frontend/src/pages/DemandBoxPage.tsx`
    - replaced the delayed `setTimeout` create-mode auto-scroll with one shared
      `requestAnimationFrame` reveal helper
    - create-mode now clears its hash after the reveal, so the page does not
      keep reasserting old create state underneath the user
    - removed duplicate click-time `guardButtonPress(event)` calls from the
      main guarded Demand Box buttons, leaving one guard lane instead of two
- Routes impacted:
  - `/app/notifications`
  - `/app/demand-box`
- Shared logic impact:
  - no backend changes
  - this is a frontend interaction-calming pass only
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/NotificationsPage.tsx src/pages/DemandBoxPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed
  - treat Notifications and Demand Box as a safer checkpoint for continued
    phone testing, not a final freeze yet

### Dashboard route contracts reached a cleaner safe checkpoint (2026-04-26)

- Product-owner issue:
  - even after Dashboard button stabilization, some Dashboard task entries were
    still launching through mixed destination shapes
  - that can make the app feel unpredictable because the tap works, but the
    user does not always land in one consistent family of routes
- Applied the smallest safe route-contract cleanup:
  - `frontend/src/pages/DashboardPage.tsx`
    - changed Spotlight marketplace launches to use the authenticated
      Marketplace alias shape `/app/marketplace/community/:clanId` instead of
      mixing direct `/community/:clanId` with `/app/marketplace`
    - changed Dashboard `Shop` intent launches to use the canonical owner room
      `/app/shop-control` instead of mixed public-shop-style aliases
- Route impact:
  - `/app/dashboard`
  - Dashboard handoffs into Marketplace workspace
  - Dashboard handoffs into Shop owner control
- Shared logic impact:
  - no backend change
  - this is a frontend route-contract normalization pass only
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/DashboardPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed
  - Dashboard now has a cleaner safe checkpoint for continued phone testing

### Dashboard to Demand Box create entry reached a calmer safe checkpoint (2026-04-26)

- Product-owner issue:
  - Dashboard still launched first-time Demand Box creation through the older
    hash contract `/app/demand-box#demand-box-create`
  - that meant the Dashboard button layer had been cleaned up, but one older
    route-entry shape was still sitting underneath the path and could keep the
    create flow feeling less steady
- Applied the smallest safe route-contract cleanup:
  - `frontend/src/pages/DashboardPage.tsx`
    - changed the empty-state Demand Box primary action from the old hash entry
      to the calmer query-based entry `/app/demand-box?mode=create`
  - `frontend/src/pages/DemandBoxPage.tsx`
    - added support for query-based create mode while keeping the legacy hash
      path working for backward compatibility
    - create-mode cleanup now removes the `mode=create` query after reveal, the
      same way the legacy hash path was being cleared after use
- Routes impacted:
  - `/app/dashboard`
  - `/app/demand-box`
- Shared logic impact:
  - no backend change
  - this is a frontend route-entry normalization pass only
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/DashboardPage.tsx src/pages/DemandBoxPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed
  - Dashboard-to-Demand-Box create entry is now at a safer checkpoint for phone
    testing

### Finance and Loans section reveals reached a calmer safe checkpoint (2026-04-26)

- Product-owner issue:
  - after Dashboard route cleanup, the next major money-side pages still used
    delayed `setTimeout` section reveals from `What do you want to do next?`
  - that older pattern can make the button feel like it did not respond on the
    first press, then the page jumps a moment later
- Applied the smallest safe interaction cleanup:
  - `frontend/src/pages/FinancePage.tsx`
    - replaced guide-driven delayed section reveals with one cancelable
      `requestAnimationFrame` reveal lane
    - finance summary and reconciliation now open and scroll through the calmer
      reveal helper instead of delayed timers
  - `frontend/src/pages/LoansPage.tsx`
    - replaced guide-driven delayed section reveals with one cancelable
      `requestAnimationFrame` reveal lane
    - support summary, current focus, borrower flow, and guarantor queue now
      open and scroll through the calmer reveal helper instead of delayed timers
- Routes impacted:
  - `/app/finance`
  - `/app/loans`
- Shared logic impact:
  - no backend change
  - this is a frontend interaction-calming pass only
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/FinancePage.tsx src/pages/LoansPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed
  - Finance and Loans are now at a safer checkpoint for continued phone testing

### Trust guided section reveals reached a calmer safe checkpoint (2026-04-26)

- Product-owner issue:
  - the Trust page still used delayed timer-based section reveals for guided
    actions and for the `#trust-journey` deep entry
  - that meant the guide path could still feel like it paused first, then
    jumped underneath the user
- Applied the smallest safe interaction cleanup:
  - `frontend/src/pages/TrustScorePage.tsx`
    - replaced delayed timer-based guided section reveals with one cancelable
      `requestAnimationFrame` reveal lane
    - trust summary, trust journey, explainability, and evidence now reveal and
      scroll through the calmer helper instead of delayed timers
    - the `#trust-journey` deep entry now uses the same calmer reveal lane
- Routes impacted:
  - `/app/trust`
- Shared logic impact:
  - no backend change
  - this is a frontend interaction-calming pass only
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/TrustScorePage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed with the same pre-existing `loadAll` dependency
    warning, plus one new warning suggesting `revealTrustSection` be included in
    an effect dependency array
  - frontend build passed
  - Trust is now at a safer checkpoint for continued phone testing

### Shop Control vault link actions reached a calmer safe checkpoint (2026-04-26)

- Product-owner issue:
  - the per-link Vault controls in Shop Control still felt dense and jumpy
  - one compact four-button row mixed "use the link" and "manage the link"
    actions together
  - both management actions also shared one busy state, so a single tap could
    make the whole row feel unstable
- Applied the smallest safe interaction cleanup:
  - `frontend/src/pages/ShopControlPage.tsx`
    - added a separate `busyVaultLinkAction` state so only the active
      management action changes label while it is working
    - split each Vault link control set into two calmer groups:
      - `Copy link`, `Open link`
      - `Extend 7 days`, `Revoke`
    - shortened the first-row labels to reduce width churn during repeated use
    - changed the busy labels to action-specific text:
      - `Extending...`
      - `Revoking...`
- Routes impacted:
  - `/app/shop-control`
- Shared logic impact:
  - no backend change
  - this is a frontend button-stability pass only
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/ShopControlPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed
  - the densest remaining Vault link controls are now at a calmer safe
    checkpoint for continued phone testing

### Shop Control paid-tool bands reached a calmer safe checkpoint (2026-04-26)

- Product-owner issue:
  - the remaining paid-tool sections in Shop Control still mixed setup, payment,
    and use actions inside the same action bands
  - generic `Working...` labels also made unrelated actions feel too similar
    while the page was busy
- Applied the smallest safe interaction cleanup:
  - `frontend/src/pages/ShopControlPage.tsx`
    - expanded `paidToolActionLabel(...)` to support action-specific busy text
    - split the Vault section controls into:
      - `Start or renew Vault access`
      - `Continue with Vault work`
    - split the Verification section controls into:
      - `Start or renew verification`
      - `Use verification pages`
    - split the Paid spotlight section controls into:
      - `Start or renew paid spotlight`
      - `Continue with paid spotlight work`
    - tightened the live button labels used in those sections:
      - `Preparing...`
      - `Creating link...`
      - `Open paid publisher`
- Routes impacted:
  - `/app/shop-control`
- Shared logic impact:
  - no backend change
  - this is a frontend action-band readability and button-stability pass only
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/ShopControlPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed
  - the main paid-tool action bands are now at a calmer safe checkpoint for
    continued phone testing

### Create community entry reveals reached a calmer safe checkpoint (2026-04-26)

- Product-owner issue:
  - the create-community onboarding lane still used a delayed timer before
    opening and scrolling to the next major block
  - for first-time users that creates the same "nothing first, then jump"
    feeling that discourages testing
- Applied the smallest safe interaction cleanup:
  - `frontend/src/pages/CreateEntryPage.tsx`
    - replaced the delayed `setTimeout(..., 80)` panel reveal with one
      cancelable `requestAnimationFrame` reveal path
    - added cleanup so unfinished panel-reveal work is canceled on unmount
    - kept the route purpose and onboarding contract unchanged
- Routes impacted:
  - `/create-entry`
  - the public create-community onboarding lane
- Shared logic impact:
  - no backend change
  - this is a frontend interaction-calming pass only
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/CreateEntryPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed
  - the create-community onboarding reveals are now at a safer checkpoint for
    continued phone testing

### Build First Circle buttons reached a calmer safe checkpoint (2026-04-26)

- Product-owner issue:
  - the first-circle setup flow still had many buttons guarded twice on the same
    tap
  - buttons already used shared `buttonGuardProps()` and then called
    `guardButtonPress(event)` again inside `onClick`
  - this kind of stacked event handling is one of the patterns that can make
    the app feel hesitant or jumpy under repeated use
- Applied the smallest safe interaction cleanup:
  - `frontend/src/pages/BuildFirstCirclePage.tsx`
    - removed the redundant inner `guardButtonPress(event)` calls from the main
      first-circle actions while keeping the shared guard props in place
    - affected actions include:
      - role choice buttons
      - `Add Person`
      - `Clear Form`
      - `Choose from Phone Contacts`
      - `Open` / `Collapse` for people review
      - `Included` / `Include`
      - `Remove`
      - `Open` / `Collapse` for invite message
      - `Copy Invite Bundle`
      - `Reset First Circle`
- Routes impacted:
  - `/app/build-first-circle`
- Shared logic impact:
  - no backend change
  - this is a frontend button-stability pass only
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/BuildFirstCirclePage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed
  - the first-circle setup buttons are now at a safer checkpoint for continued
    phone testing

### Shop Assets buttons reached a calmer safe checkpoint (2026-04-26)

- Product-owner issue:
  - the shop-assets lane still had a couple of remaining buttons guarded twice
    on the same tap
  - this was smaller than the earlier shop-control cleanup, but it was the same
    underlayer pattern of new behavior sitting on top of older event handling
- Applied the smallest safe interaction cleanup:
  - `frontend/src/pages/ShopAssetsPage.tsx`
    - removed the redundant inner `guardButtonPress(event)` call from
      `Open Shop Gallery`
    - removed the redundant inner `guardButtonPress(event)` call from
      `Reset Preview`
    - kept the shared `buttonGuardProps()` layer in place
- Routes impacted:
  - `/app/shop-assets`
- Shared logic impact:
  - no backend change
  - this is a frontend button-stability pass only
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/ShopAssetsPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed
  - the shop-assets lane is now at a calmer safe checkpoint for continued phone
    testing

### Demand Box community-choice buttons reached a calmer safe checkpoint (2026-04-26)

- Product-owner issue:
  - the Demand Box create flow still had one remaining explicit duplicate guard
    on the community-choice buttons
  - that meant the new calmer demand flow still had one old event-handling
    layer sitting underneath the first meaningful decision in the route
- Applied the smallest safe interaction cleanup:
  - `frontend/src/pages/DemandBoxPage.tsx`
    - removed the redundant inner `guardButtonPress(event)` call from the
      community-choice buttons
    - kept the shared `buttonGuardProps()` layer in place
- Routes impacted:
  - `/app/demand-box`
- Shared logic impact:
  - no backend change
  - this is a frontend button-stability pass only
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/DemandBoxPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed
  - the Demand Box community-choice lane is now at a calmer safe checkpoint for
    continued phone testing

### Activation handoff reached a calmer safe checkpoint (2026-04-26)

- Product-owner issue:
  - the activation lane still delayed the final handoff into the workspace
    through a timer after success
  - even though the route was working, that older timer pattern can still make
    a successful first-use tap feel like "nothing happened yet, then it jumped"
- Applied the smallest safe interaction cleanup:
  - `frontend/src/pages/ActivateMembershipPage.tsx`
    - removed the delayed `setTimeout(..., 600)` workspace handoff after
      activation success
    - activation now moves into `/app/dashboard` immediately after a valid
      success response
- Routes impacted:
  - `/activate-membership`
- Shared logic impact:
  - no backend change
  - this is a frontend handoff-calming pass only
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/ActivateMembershipPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend build passed
  - frontend lint still reports a pre-existing unused `isCompact` issue in
    `ActivateMembershipPage.tsx`
  - the activation handoff is now at a calmer safe checkpoint for continued
    phone testing

### Loan Decision links reached a calmer safe checkpoint (2026-04-26)

- Product-owner issue:
  - the borrowing-side button audit is now moving into deeper route-local
    layers, not just the headline pages
  - `LoanDecisionPage` still had page-level tap guards stacked on top of
    `OriginLink`, even though `OriginLink` already isolates taps internally
  - this kind of double layering is one of the patterns that keeps buttons
    feeling heavier or less predictable than they should
- Applied the smallest safe interaction cleanup:
  - `frontend/src/pages/LoanDecisionPage.tsx`
    - removed `buttonGuardProps()` from the `OriginLink` actions used for:
      - `Open Loan Summary`
      - `Open Workbench`
      - `Loan Workbench`
      - `Return to Loans & Support`
      - `Open Finance`
    - removed the now-dead local `guardButtonPress()` and `buttonGuardProps()`
      helper from that page
- Routes impacted:
  - `/app/loan-decision`
- Shared logic impact:
  - no backend change
  - no route contract change
  - this is a frontend interaction cleanup only
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/LoanDecisionPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed
  - the loan-decision route is now at a calmer safe checkpoint for continued
    phone testing

### Borrower Preflight links reached a calmer safe checkpoint (2026-04-26)

- Product-owner issue:
  - the deeper borrowing-family audit found another stacked-link pattern in the
    borrower preflight lane
  - `BorrowerPreflightPage` was still adding `buttonGuardProps()` directly to
    `OriginLink`, even though `OriginLink` already isolates taps internally
- Applied the smallest safe interaction cleanup:
  - `frontend/src/pages/BorrowerPreflightPage.tsx`
    - removed `buttonGuardProps()` from:
      - `Open Loans & Support`
      - `Check Loan Readiness`
      - `Open Commitment Builder`
    - removed the now-dead local `guardButtonPress()` and `buttonGuardProps()`
      helper from that page
- Routes impacted:
  - `/app/borrower-preflight`
- Shared logic impact:
  - no backend change
  - no route contract change
  - this is a frontend interaction cleanup only
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/BorrowerPreflightPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - frontend lint passed
  - frontend build passed
  - the borrower-preflight route is now at a calmer safe checkpoint for
    continued phone testing

### Join request duplicate submissions now stay inside the live pending channel (2026-04-27)

- Product-owner issue:
  - the public join line still stopped too early when the same invited person
    tried again after already submitting once
  - backend knew the request was already pending, but frontend only showed a red
    dead-end message instead of carrying the person into the real pending-status
    lane
- Applied the smallest safe system-level fix:
  - `gmfn_backend/app/api/routes/clans.py`
    - duplicate pending join requests now return a structured `409` detail
      payload with:
      - `code = pending_request_exists`
      - `request_id`
      - `community_id`
      - `community_code`
      - `community_name`
      - `marketplace_name`
      - `submitted_at`
      - `pending_status_path`
      - `approval_path`
  - `frontend/src/lib/api.ts`
    - `submitJoinRequest(...)` now recognizes that structured duplicate-pending
      response and returns it as a usable result instead of flattening it into a
      dead text error
  - `frontend/src/pages/JoinEntryPage.tsx`
    - when a pending duplicate is returned, the user is now redirected straight
      into `/pending-approval?request_id=...` with the carried community state
  - `frontend/src/pages/JoinRequestPendingPage.tsx`
    - cleaned the small empty-catch lint issue while keeping the activation
      fallback behavior intact
  - `gmfn_backend/tests/test_join_requests.py`
    - added coverage proving duplicate pending submissions now return the
      structured lineage payload
- Routes impacted:
  - backend:
    - `POST /clans/join-requests`
  - frontend:
    - `/start/join/...`
    - `/pending-approval`
    - `/join-approval/:requestId`
- Shared logic impact:
  - this is a real join-channel behavior change, not a cosmetic page-only patch
  - duplicate submissions still do **not** create a second reviewer
    notification; they now simply return the applicant to the live pending lane
- Verification:
  - backend tests:
    - `python -m pytest tests/test_join_requests.py -q`
  - frontend lint:
    - `npm exec -- eslint src/pages/JoinEntryPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/JoinApprovalPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - backend tests passed (`16 passed`)
  - targeted frontend lint passed
  - frontend build passed
  - the public join line now keeps a pending applicant inside the same live
    channel instead of ending at a dead message

### Same invite + same phone now reopens the live request channel (2026-04-27)

- Product-owner issue:
  - duplicate-pending submission handling was fixed, but the join page still
    did not automatically reconnect a returning invited person to their already
    existing request
  - if the same person reopened the same invite later, the app still risked
    dropping them back onto the form instead of the live pending-status route
- Applied the smallest safe system-level continuation fix:
  - `gmfn_backend/app/api/routes/clans.py`
    - added `GET /clans/join-invite/request-status`
    - resolves the community from the live invite code and optional
      `community_code`
    - resolves the applicant from `phone_e164` (or the derived pending email)
    - returns structured request lineage/status when that phone already has a
      join request in that community
    - `create_join_request(...)` now also persists `phone_e164` on the pending
      applicant user so this lookup path is reliable
  - `frontend/src/lib/api.ts`
    - added `getJoinInviteRequestStatus(...)`
  - `frontend/src/pages/JoinEntryPage.tsx`
    - when the invite is valid and a usable phone is entered, the page now
      performs a short debounced lookup
    - if a request already exists for that same invite/community + phone, the
      user is redirected directly into `/pending-approval?request_id=...`
      instead of needing to submit again
  - `gmfn_backend/tests/test_join_requests.py`
    - added coverage proving the new invite+phone status route finds the
      existing pending request correctly
- Routes impacted:
  - backend:
    - `GET /clans/join-invite/request-status`
    - `POST /clans/join-requests`
  - frontend:
    - `/start/join/...`
    - `/pending-approval`
- Shared logic impact:
  - this extends the system-level join channel so a returning applicant can
    stay inside the same live request line
  - it still does **not** send the final result back through WhatsApp itself;
    the return path is now inside the app channel
- Verification:
  - backend tests:
    - `python -m pytest tests/test_join_requests.py -q`
    - result: `17 passed`
  - backend syntax check:
    - `python -m py_compile app/api/routes/clans.py tests/test_join_requests.py`
  - frontend lint:
    - `npm exec -- eslint src/pages/JoinEntryPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/JoinApprovalPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - backend tests passed (`17 passed`)
  - backend compile passed
  - targeted frontend lint passed
  - frontend build passed
  - the public join line now reconnects the same invite + same phone back into
    the existing live request channel without relying on a second manual submit

### Same invite now keeps a local applicant draft on the same device (2026-04-27)

- Continued the same join-channel workstream with the next safe system-level
  improvement in the app return path.
- Problem:
  - even after the invite+phone request-status lookup was added, a returning
    invited person on the same device could still lose their already-entered
    form state and feel pushed back toward starting from scratch
- Applied the smallest safe route-level fix:
  - `frontend/src/pages/JoinEntryPage.tsx`
    - now reads and writes a join-form draft in local storage keyed by:
      - invite code
      - community code
    - persists:
      - first name
      - surname
      - phone
      - country
      - work category
      - work detail
      - note
    - when that same invite is reopened on the same device, the form can
      restore the prior applicant state instead of starting empty again
- Routes impacted:
  - frontend:
    - `/start/join/...`
- Shared logic impact:
  - this is still within the same app join channel; it does not affect backend
    approvals, vote thresholds, or WhatsApp sending
  - it reduces repeated re-entry on the same device while preserving the
    backend request-status lookup already added earlier
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/JoinEntryPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/JoinApprovalPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - targeted frontend lint passed
  - frontend build passed
  - the same invite path now feels more durable on the same device even before
    the applicant submits again

### Same invite now remembers its own saved request on the same device (2026-04-27)

- Continued the same join-channel workstream with a safer resume layer.
- Problem:
  - even with the local form draft and the invite+phone status lookup, a
    returning invited person could still feel lost if they reopened the same
    invite later and did not immediately know whether to type again or just
    continue the existing request
- Applied the smallest safe route-level improvement:
  - `frontend/src/pages/JoinEntryPage.tsx`
    - now stores a saved join-request lineage payload in local storage keyed by:
      - invite code
      - community code
    - preserves:
      - request id
      - status
      - community name
      - marketplace name
      - submitted_at
      - gmfn_id
      - phone_e164
      - activation / approval / pending paths when available
    - renders a clear in-page resume block:
      - `Continue previous request`
      - `Clear saved request`
    - the resume action refreshes the live backend status by request id first,
      then routes the user into:
      - pending status
      - activation
      - rejection result
- Routes impacted:
  - frontend:
    - `/start/join/...`
- Shared logic impact:
  - this stays inside the same in-app join channel
  - it avoids silently mixing applicants on the same device because the user
    gets an explicit resume/clear choice instead of an unconditional redirect
- Verification:
  - frontend lint:
    - `npm exec -- eslint src/pages/JoinEntryPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/JoinApprovalPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - targeted frontend lint passed
  - frontend build passed
  - the same invite now exposes a clearer saved-request continuation path on the
    same device even before the applicant manually submits again

### Dashboard profile picture is now backend-backed at system level (2026-04-27)

- Closed the biggest remaining system-level gap in the dashboard profile picture
  path.
- Problem:
  - the dashboard picture looked like it was saved, but it only lived in
    browser/device storage
  - for some Render users the picture disappeared after leaving the dashboard
    because there was no backend user-avatar field or upload route
- Applied the smallest safe end-to-end fix:
  - `gmfn_backend/app/db/models.py`
    - added `User.profile_image_url`
  - `gmfn_backend/alembic/versions/20260427_add_user_profile_image_url.py`
    - added migration for the new nullable avatar column
  - `gmfn_backend/app/main.py`
    - added a startup compat guard that ensures the new
      `users.profile_image_url` column exists even when the environment is only
      doing app boot, so Render startup can self-heal this schema addition
  - `gmfn_backend/app/api/routes/auth.py`
    - extended `UserOut` and `/auth/me` payloads with `profile_image_url`
    - added authenticated upload route:
      - `POST /auth/me/profile-image/upload`
    - validates image type and size
    - writes the file to `/uploads/profile/users/...`
    - persists the relative URL on the user record
  - `frontend/src/lib/api.ts`
    - added `uploadMyProfileImageFile(file)`
  - `frontend/src/pages/DashboardPage.tsx`
    - dashboard now prefers backend `profile_image_url`
    - upload still shows an immediate local preview, but then replaces it with
      the persisted backend URL
    - persisted backend avatar is mirrored into local storage only as a backup,
      not as the source of truth
- Routes impacted:
  - backend:
    - `/auth/me`
    - `POST /auth/me/profile-image/upload`
  - frontend:
    - `/app/dashboard`
- Shared logic impact:
  - this is now a true backend/system-level save path rather than a page-local
    illusion
  - the dashboard picture should now survive route changes and later sessions on
    Render because the source of truth is the user record
- Verification:
  - backend compile:
    - `python -m py_compile app/api/routes/auth.py app/main.py app/db/models.py alembic/versions/20260427_add_user_profile_image_url.py tests/test_entry_create.py`
  - backend tests:
    - `python -m pytest tests/test_entry_create.py tests/test_join_requests.py -q`
  - frontend lint:
    - `npm exec -- eslint src/pages/DashboardPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - backend compile passed
  - backend tests passed (`32 passed`)
  - targeted frontend lint passed
  - frontend build passed
  - dashboard profile picture now has a real backend save path suitable for
    deployment to Render

### Join approval now counts only activated reviewers at system level (2026-04-27)

- Closed the backend mismatch where placeholder/pending community records could
  inflate reviewer counts, receive join-review notifications, or appear in
  visible member rows like fully activated members.
- Problem:
  - older pending applicants could still exist as active `clan_memberships`
  - the join-status threshold logic counted every active membership row
  - reviewer notifications were sent to every active membership row
  - visible community member lists could therefore include placeholder rows
  - result: a join request could look like it needed a second approval from a
    person who was not truly activated and could not realistically complete the
    review
- Applied the smallest safe backend alignment:
  - `gmfn_backend/app/core/auth.py`
    - added `is_user_activation_pending(user)`
    - treats these as not activated:
      - empty password
      - `"PENDING_APPROVAL"`
      - legacy placeholder users with `@pending.gmfn.local` whose stored hash
        still matches the old `"temp-password"` bootstrap
  - `gmfn_backend/app/api/routes/auth.py`
    - authentication now blocks all activation-pending users through the shared
      helper instead of only checking the raw `"PENDING_APPROVAL"` sentinel
    - approved-member activation status now also uses the shared helper
  - `gmfn_backend/app/api/routes/clans.py`
    - added `_active_reviewer_memberships(...)`
    - join-review thresholds now count only activated reviewer memberships
    - join-review notifications now go only to activated reviewer memberships
    - join voting now rejects activation-pending users with:
      - `Only activated community members can vote`
    - visible clan member lists now exclude activation-pending placeholder rows
    - newly created pending applicants are now stored with:
      - `hashed_password="PENDING_APPROVAL"`
      instead of the older hashed `"temp-password"` bootstrap
- Routes impacted:
  - backend auth:
    - `/auth/login`
    - `/auth/activate-approved-member`
    - `/auth/approved-member-status`
  - backend community/join flow:
    - `POST /clans/join-requests`
    - `POST /clans/{clan_id}/join-requests/{join_request_id}/vote`
    - `GET /clans/{clan_id}/members`
- Shared logic impact:
  - active reviewer counts now reflect only real activated community members
  - pending placeholder rows no longer appear as visible community members
  - reviewer notifications now align with who can truly act
  - this is a backend/system-level rule correction, not a page-local UI tweak
- Verification:
  - backend compile:
    - `python -m py_compile gmfn_backend/app/core/auth.py gmfn_backend/app/api/routes/auth.py gmfn_backend/app/api/routes/clans.py gmfn_backend/tests/test_join_requests.py`
  - backend tests:
    - `python -m pytest tests/test_join_requests.py -q`
- Result:
  - backend compile passed
  - join-request backend tests passed (`21 passed`)
  - community reviewer thresholds, notifications, visible member lists, and
    vote eligibility are now aligned around activated membership only

### Approved join-request status now records activation-channel reopening (2026-04-27)

- Continued the same system-level join-channel workstream by wiring the existing
  activation delivery fields into the status path itself.
- Problem:
  - approved join requests already stored:
    - `activation_link`
    - `activation_message`
    - `activation_generated_at`
    - `activation_delivery_status`
    - `activation_delivered_at`
  - but the backend never updated delivery state when the applicant actually
    reopened the approved path later
  - result: activation delivery could stay `"pending"` forever even when the
    applicant had already reopened the same invite/status line
- Applied the smallest safe backend fix:
  - `gmfn_backend/app/api/routes/clans.py`
    - added `_mark_activation_opened_if_needed(...)`
    - when an approved join request is reopened through:
      - `GET /clans/join-invite/request-status`
      - `GET /clans/join-requests/{join_request_id}/status`
      the backend now marks:
      - `activation_delivery_status = "opened"`
      - `activation_delivered_at = now`
    - the update is idempotent and only runs for approved requests
- Routes impacted:
  - `GET /clans/join-invite/request-status`
  - `GET /clans/join-requests/{join_request_id}/status`
- Shared logic impact:
  - the join/result line is now more traceable at backend level
  - admin/reviewer tooling can tell whether an approved applicant actually
    reopened the activation/status path instead of leaving delivery frozen at
    generation time
  - this supports the same-link continuity work already added on the frontend
- Verification:
  - backend compile:
    - `python -m py_compile gmfn_backend/app/api/routes/clans.py gmfn_backend/tests/test_join_requests.py`
  - backend tests:
    - `python -m pytest tests/test_join_requests.py -q`
- Result:
  - backend compile passed
  - join-request backend tests passed (`22 passed`)
  - approved request status polling now updates activation delivery state when
    the applicant actually reopens that approved path

### Join status payload now carries authoritative result paths (2026-04-27)

- Continued the same system-level join-channel workstream so the frontend stops
  guessing where a pending / approved / rejected applicant should go next.
- Problem:
  - the backend already knew whether a request was pending, approved, or
    rejected
  - but the frontend was still composing some of the follow-up routes locally
    (`/pending-approval`, `/join-approval/:id`, `/activate-membership`)
  - that made the return path more fragile and less faithful to the actual
    backend lineage
- Applied the smallest safe backend + frontend fix:
  - `gmfn_backend/app/api/routes/clans.py`
    - `_join_request_status_payload(...)` now returns:
      - `pending_status_path`
      - `approval_path`
      - `result_channel`
      - `result_path`
    - `result_channel` is now explicit:
      - `pending-review`
      - `activation-ready`
      - `request-rejected`
    - `result_path` is the backend-authoritative next path for that request
  - `frontend/src/pages/JoinEntryPage.tsx`
    - continue / retry flow now prefers backend `result_path` and
      `pending_status_path`
    - same-device saved request lineage now resumes through the backend path
      instead of rebuilding it locally
  - `frontend/src/pages/JoinRequestPendingPage.tsx`
    - pending status page now prefers backend `result_path` for approved or
      rejected transitions
  - `frontend/src/pages/JoinApprovalPage.tsx`
    - continue-activation button now prefers backend `result_path`, then falls
      back to the older activation fields only if needed
- Routes impacted:
  - backend:
    - `GET /clans/join-invite/request-status`
    - `GET /clans/join-requests/{join_request_id}/status`
  - frontend:
    - `/start/join/...`
    - `/pending-approval`
    - `/join-approval/:requestId`
- Shared logic impact:
  - the backend is now the source of truth for the next request-state route
  - pending / approved / rejected reopen flows are less likely to drift when
    the same invite is revisited later
  - this is a backend/system-level continuation of the invite/request channel,
    not a page-only message tweak
- Verification:
  - backend compile:
    - `python -m py_compile gmfn_backend/app/api/routes/clans.py gmfn_backend/tests/test_join_requests.py`
  - backend tests:
    - `python -m pytest tests/test_join_requests.py -q`
  - frontend targeted lint:
    - `npm exec -- eslint src/pages/JoinEntryPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/JoinApprovalPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - backend compile passed
  - join-request backend tests passed (`22 passed`)
  - targeted frontend lint passed
  - frontend build passed
  - join status reopen flows now follow backend-authoritative result paths

### Join rejection channel now completes at backend level (2026-04-27)

- Continued the same system-level join / approval workstream to close the
  missing rejection branch.
- Problem:
  - `_current_join_status(...)` already counted reject votes
  - but the backend never transitioned a request into a real `rejected` state
  - so the negative side of the join channel was incomplete even though the
    vote tally already existed
- Applied the smallest safe backend + frontend fix:
  - `gmfn_backend/app/api/routes/clans.py`
    - added `_build_rejection_package(...)`
    - added `_reject_join_request(...)`
    - `vote_join_request(...)` now triggers a real rejection transition once
      reject votes reach the current threshold
    - `_join_request_status_payload(...)` now returns:
      - `result_channel = "request-rejected"`
      - `result_path = "/join-approval/{request_id}"`
      - `next_step = "review-decision"`
    - rejected applicants now receive an `approval_rejected` notification with
      an action back into the join decision page
  - `gmfn_backend/tests/test_join_requests.py`
    - added coverage proving that:
      - an activated reviewer can reject
      - the request status becomes `rejected`
      - `decided_at` is written
      - the applicant gets `approval_rejected`
      - the backend status route reports the rejected result channel/path
  - `frontend/src/pages/CommunityJoinRequestsPage.tsx`
    - review UI now understands `rejected_now`
    - if the backend completes the rejection immediately, the page surfaces the
      backend decision message instead of a vague generic success string
- Routes impacted:
  - backend:
    - `POST /clans/{clan_id}/join-requests/{join_request_id}/vote`
    - `GET /clans/join-requests/{join_request_id}/status`
  - frontend:
    - `/app/community/:id/join-requests`
- Shared logic impact:
  - approval and rejection are now both real backend state transitions
  - the applicant-side status route can now represent the full join-review
    decision tree instead of only pending / approved
  - this is a backend/system-level fix, not a page-only message tweak
- Verification:
  - backend compile:
    - `python -m py_compile gmfn_backend/app/api/routes/clans.py gmfn_backend/tests/test_join_requests.py`
  - backend tests:
    - `python -m pytest tests/test_join_requests.py -q`
  - frontend targeted lint:
    - `npm exec -- eslint src/pages/CommunityJoinRequestsPage.tsx src/pages/JoinEntryPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/JoinApprovalPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - backend compile passed
  - join-request backend tests passed (`23 passed`)
  - frontend targeted lint passed with only 1 pre-existing warning in
    `CommunityJoinRequestsPage.tsx`
  - frontend build passed
  - the system now has a real rejected branch for the join channel

### Existing join requests now reopen across all final states (2026-04-27)

- Continued the same system-level join-channel cleanup to close the gap where
  duplicate submissions only reconnected if the earlier request was still
  pending.
- Problem:
  - `POST /clans/join-requests` could already detect an existing request
  - but the frontend only treated `pending_request_exists` as resumable lineage
  - approved and rejected existing requests could still feel like dead conflicts
- Applied the smallest safe backend + frontend fix:
  - `gmfn_backend/app/api/routes/clans.py`
    - `create_join_request(...)` now checks the newest existing request for the
      applicant in that community, regardless of final state
    - `_existing_join_request_conflict_detail(...)` now returns structured
      lineage for `pending`, `approved`, and `rejected`
  - `gmfn_backend/tests/test_join_requests.py`
    - added coverage proving duplicate submissions now return:
      - `approved_request_exists` with activation lineage
      - `rejected_request_exists` with review-decision lineage
  - `frontend/src/lib/api.ts`
    - `submitJoinRequest(...)` now recognizes any `*_request_exists` conflict
      and returns a structured existing-request payload instead of throwing
  - `frontend/src/pages/JoinEntryPage.tsx`
    - the submit path now routes through the same existing-request recovery
      logic for pending, approved, and rejected requests
- Routes impacted:
  - backend:
    - `POST /clans/join-requests`
  - frontend:
    - `/start/join/...`
- Shared logic impact:
  - reopening the same invite and submitting again no longer dead-ends simply
    because the earlier request has already been approved or rejected
  - the app now follows backend-authoritative lineage consistently across all
    request states
- Verification:
  - backend compile:
    - `python -m py_compile gmfn_backend/app/api/routes/clans.py gmfn_backend/tests/test_join_requests.py`
  - backend tests:
    - `python -m pytest gmfn_backend/tests/test_join_requests.py -q`
  - frontend targeted lint:
    - `npm exec -- eslint src/pages/JoinEntryPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/JoinApprovalPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - backend compile passed
  - join-request backend tests passed (`25 passed`)
  - targeted frontend lint passed
  - frontend build passed

### Late reviewer notifications now backfill on system routes (2026-04-27)

- Continued the same system-level join-review channel so reviewers who become
  active after a request is already pending do not miss the approval notice.
- Problem:
  - join-review notifications were only created at request-submission time
  - if a reviewer became active later, or first opened their dashboard /
    notifications later, they could be eligible to vote but still never see a
    pending join-review notice
- Applied the smallest safe backend fix:
  - `gmfn_backend/app/services/notification_service.py`
    - added `ensure_join_review_notifications(...)`
    - it scans active memberships for the current reviewer, finds pending
      community join requests, excludes the applicant, and backfills a single
      `approval_request` notification per request/action URL if one does not
      already exist
  - `gmfn_backend/app/api/routes/notifications.py`
    - `GET /notifications/me`
    - `GET /notifications/me/unread-count`
    - both now call `ensure_join_review_notifications(...)` before returning
      notifications or counts
  - `gmfn_backend/tests/test_join_requests.py`
    - added coverage proving:
      - late reviewers get a missing approval-request notification when they
        open notifications
      - repeated refreshes do not duplicate the same review notice
    - also corrected the activated-reviewer notification test so the seeded
      reviewer membership points at the actual reviewer user id rather than the
      applicant placeholder id
- Routes impacted:
  - backend:
    - `GET /notifications/me`
    - `GET /notifications/me/unread-count`
- Shared logic impact:
  - join-review notifications are now recoverable at system level rather than
    only at initial request creation time
  - activated reviewers opening notifications later can still receive the
    pending review notice they need
  - duplicate backfilled notifications are prevented by reviewer + kind +
    action URL dedupe
- Verification:
  - backend compile:
    - `python -m py_compile gmfn_backend/app/api/routes/notifications.py gmfn_backend/app/services/notification_service.py gmfn_backend/tests/test_join_requests.py`
  - backend tests:
    - `python -m pytest gmfn_backend/tests/test_join_requests.py -q`
  - frontend build:
    - `npm run build`
- Result:
  - backend compile passed
  - join-request backend tests passed (`26 passed`)
  - frontend build passed
  - the system now backfills missing late-reviewer join notifications through
    the shared notifications routes instead of leaving those reviewers stranded

### Approved-member activation now accepts request lineage directly (2026-04-27)

- Continued the same system-level join / approval workstream to close the
  backend/frontend contract gap after approval.
- Problem:
  - the frontend activation path was already prepared to submit `request_id`
    back to the backend
  - but `POST /auth/activate-approved-member` still effectively depended on a
    direct `gmfn_id`
  - this made the return channel more brittle than it needed to be once a user
    was approved from a join request
- Applied the smallest safe backend fix:
  - `gmfn_backend/app/api/routes/auth.py`
    - `ActivateApprovedMemberIn` now accepts either:
      - `gmfn_id`
      - `request_id`
    - `activate_approved_member(...)` now:
      - resolves the applicant through `ClanJoinRequest` when `request_id` is
        supplied
      - verifies `confirm_password` when present
      - guards against mismatched `gmfn_id` + `request_id` payloads
      - continues through the normal activation / GMFN ID issuance / token path
  - `gmfn_backend/tests/test_join_requests.py`
    - added coverage proving an approved applicant can activate directly with:
      - `request_id`
      - `password`
      - `confirm_password`
- Routes impacted:
  - backend:
    - `POST /auth/activate-approved-member`
- Shared logic impact:
  - approved users no longer depend on a manually carried GMFN ID to complete
    the activation step
  - the join-result return channel is now more consistent with the request
    lineage already being carried through the rest of the system
- Verification:
  - backend compile:
    - `python -m py_compile gmfn_backend/app/api/routes/auth.py gmfn_backend/tests/test_join_requests.py`
  - backend tests:
    - `python -m pytest gmfn_backend/tests/test_join_requests.py -q`
- Result:
  - backend compile passed
  - join-request backend tests passed (`27 passed`)
  - the backend activation route now accepts request-based lineage directly

### Pending join status now exposes live reviewer counts and activated reviewer line (2026-04-27)

- Continued the same system-level join / approval workstream to make the
  waiting path easier to trace for applicants and testers.
- Problem:
  - the pending route could say a request was still under review
  - but it did not expose the live approval counts or the currently activated
    reviewer line that the backend was actually using
  - this made it hard to tell whether the system was waiting on a real reviewer
    or on placeholder/duplicate community records
- Applied the smallest safe backend + frontend fix:
  - `gmfn_backend/app/api/routes/clans.py`
    - `_current_join_status(...)` now returns:
      - `eligible_reviewers`
      - `approvals`
      - `rejects`
      - `total_votes`
      - `active_member_count`
      - `required_approvals`
      - `threshold_ratio`
    - `_join_request_out(...)` and `_join_request_status_payload(...)` now
      include the same live review stats
  - `frontend/src/pages/JoinRequestPendingPage.tsx`
    - added a typed `ReviewerLine` model for the pending screen
    - added a `Live review position` card showing:
      - approvals
      - rejects
      - total votes
      - required approvals
      - activated reviewers currently counted
    - added an `Activated reviewers on record` card showing the current
      reviewer display line and GMFN ID when available
  - `gmfn_backend/tests/test_join_requests.py`
    - added coverage proving the status route reports the live approval counts
      and the current activated reviewer line
- Routes impacted:
  - backend:
    - `GET /clans/join-requests/{join_request_id}/status`
    - `GET /clans/join-invite/request-status`
  - frontend:
    - `/pending-approval`
- Shared logic impact:
  - the applicant-side pending channel can now show the real backend review
    position instead of only a generic waiting state
  - this makes it easier to confirm whether reviewers are truly active and
    whether the current threshold is being driven by real community membership
  - the system still treats backend review stats as the source of truth
- Verification:
  - backend compile:
    - `python -m py_compile gmfn_backend/app/api/routes/clans.py gmfn_backend/tests/test_join_requests.py`
  - backend tests:
    - `python -m pytest gmfn_backend/tests/test_join_requests.py -q`
  - frontend targeted lint:
    - `npm exec -- eslint src/pages/JoinRequestPendingPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - backend compile passed
  - join-request backend tests passed (`28 passed`)
  - targeted pending-page lint passed
  - frontend build passed

### Join review pages received finishing cleanup without changing structure (2026-04-27)

- Continued the same join / approval finish pass, but kept the current screen
  structure intact.
- Problem:
  - the review pages were functionally working but still had rough phone edges:
    - the community join-requests summary grid was too rigid on smaller screens
    - the request metadata inside each review card was still reading like loose
      text instead of a stable institutional panel
    - the join approval page still needed stronger tap isolation on its live
      action buttons
    - the pending page still had the malformed reviewer role line
- Applied a frontend-only cleanup:
  - `frontend/src/pages/CommunityJoinRequestsPage.tsx`
    - added a phone-aware compact mode (`window.innerWidth <= 920`)
    - made the top summary stats responsive (`2` columns on compact, `4` on
      larger screens)
    - moved each request's metadata list into an institutional inner panel so
      the same information reads more cleanly without changing the order or the
      route flow
    - wrapped `load` in `useCallback(...)` and fixed the page's remaining hook
      dependency warning
  - `frontend/src/pages/JoinApprovalPage.tsx`
    - added the same stable tap guard style used on the other review surfaces
    - applied pointer / touch / mouse guard handlers to the live `Back` and
      `Continue Activation` buttons to reduce phone drift without changing the
      route behavior
  - `frontend/src/pages/JoinRequestPendingPage.tsx`
    - normalized the reviewer role label through a small formatter
    - stopped relying on the malformed encoded separator by hiding the raw role
      token and rendering a clean `Role: ...` line beneath the reviewer record
- Routes impacted:
  - `/app/community/:id/join-requests`
  - `/join-approval/:requestId`
  - `/join-request/pending`
- Shared logic impact:
  - none on backend business rules
  - this was a phone-first finish pass on the review surfaces only
- Verification:
  - targeted frontend lint:
    - `npm exec -- eslint src/pages/JoinRequestPendingPage.tsx src/pages/JoinApprovalPage.tsx src/pages/CommunityJoinRequestsPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - targeted lint passed cleanly
  - frontend build passed
  - the current join review flow remains unchanged, but the pages are steadier
    and more polished on phone

### Notifications page now explains join-review alerts more clearly and behaves more steadily on phone (2026-04-27)

- Continued the same join / approval finishing pass without changing the
  existing Action Inbox structure.
- Problem:
  - join-review alerts in `/app/notifications` were still reading like generic
    raw updates
  - the inbox could show backend kinds like `approval_request` without
    translating them into the simple join-review language already used in the
    pending and approval pages
  - several inbox controls still lacked the same pointer / touch guard used on
    the steadier phone surfaces
- Applied a frontend-only cleanup:
  - `frontend/src/pages/NotificationsPage.tsx`
    - added a shared join-notification interpretation layer:
      - detects join-review request / decision notifications from kind, text,
        and target path
      - maps them into clearer labels like `Join review` and `Join decision`
      - upgrades generic CTA labels into clearer actions like
        `Open join review` and `Open decision`
    - preserved the current page structure but made the raw notification feed
      show the cleaner `kindLabel` instead of the raw backend token
    - added missing button guards to the inbox summary action, bucket collapse,
      raw-feed collapse, reading collapse, and close-review controls so those
      taps behave more like the already-tightened review pages
- Routes impacted:
  - `/app/notifications`
- Shared logic impact:
  - join-review alerts now read more consistently from:
    - notification inbox
    - community join review
    - pending applicant status
    - approval / rejection result page
  - no backend business rules or route contracts changed
- Verification:
  - targeted frontend lint:
    - `npm exec -- eslint src/pages/NotificationsPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - targeted lint passed
  - frontend build passed
  - the notification inbox now speaks the join-review language more clearly and
    its core controls are steadier on phone

### Join entry page received small finishing cleanup for saved-request and form launcher behavior (2026-04-27)

- Continued the same join / approval finish pass without changing the route
  structure.
- Problem:
  - the join-entry page still had a rough saved-request separator that could
    render inconsistently depending on device encoding
  - the request-form launcher button was missing the same tap guard used on the
    steadier join-review controls
- Applied a frontend-only cleanup:
  - `frontend/src/pages/JoinEntryPage.tsx`
    - converted the saved-request community separator into an explicit bullet
      escape (`\\u2022`) so it renders consistently
    - added the shared `buttonGuardProps()` to the request-form launcher button
      so that opening / collapsing the form behaves more steadily on phone
- Routes impacted:
  - `/start/join/...`
- Shared logic impact:
  - none on backend business rules or join lineage
  - this was a phone-stability / rendering finish pass only
- Verification:
  - targeted frontend lint:
    - `npm exec -- eslint src/pages/JoinEntryPage.tsx src/pages/NotificationsPage.tsx src/pages/JoinApprovalPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/CommunityJoinRequestsPage.tsx`
  - frontend build:
    - `npm run build`
- Result:
  - targeted lint passed
  - frontend build passed
  - the join-entry screen now fits more cleanly into the same tightened
    phone-facing join flow

### Cover page continue action received phone-tap tightening cleanup (2026-04-27)

- Continued the same public entry / join / activation finishing pass without
  changing route structure.
- Problem:
  - the public cover page `Continue` action was still on the older tap pattern
    even though the surrounding public entry family had already been tightened
    for phone use
- Applied a frontend-only cleanup:
  - `frontend/src/pages/CoverPage.tsx`
    - added touch-safe button helpers for the public cover page
    - added the shared tap guard to the real `Continue` action
    - added touch-safe button styling so the first public entry action matches
      the steadier join / create / login / activation buttons
- Routes impacted:
  - public cover page rendered by `frontend/src/pages/CoverPage.tsx`
- Shared logic impact:
  - none on backend logic or route contracts
  - this was a phone-stability / finishing cleanup only

### My GMFN and I settings actions received phone-tap tightening cleanup (2026-04-27)

- Continued the same finishing pass without changing the page structure.
- Problem:
  - the `My GMFN and I` settings page still had direct action buttons on the
    older tap pattern
  - the selector control was also missing the same touch-safe behavior used on
    the stronger cleaned pages
- Applied a frontend-only cleanup:
  - `frontend/src/pages/MyGMFNAndIPage.tsx`
    - added touch-safe selector styling
    - added shared tap guards to `Save Settings` and `Reset Defaults`
    - applied touch-safe button styling so these settings actions behave more
      steadily on phone
- Routes impacted:
  - `frontend/src/pages/MyGMFNAndIPage.tsx`
- Shared logic impact:
  - none on backend logic or route contracts
  - this was a phone-stability / finishing cleanup only

### Join-by-invite preview continue action received phone-tap tightening cleanup (2026-04-27)

- Continued the same finishing pass without changing the invite-preview route
  structure.
- Problem:
  - the public invite-preview page still had its main continuation action on
    the older tap pattern
- Applied a frontend-only cleanup:
  - `frontend/src/pages/JoinByInvitePage.tsx`
    - added touch-safe button helpers for the invite-preview page
    - added the shared tap guard to the real `Continue invited route` action
    - applied touch-safe button styling so the invite-preview handoff matches
      the steadier public entry / join / login / activation actions
- Routes impacted:
  - `frontend/src/pages/JoinByInvitePage.tsx`
  - `frontend/src/pages/JoinClanPage.tsx` (wrapper route)
- Shared logic impact:
  - none on backend logic or route contracts
  - this was a phone-stability / finishing cleanup only

### Shop assets copy actions received phone-tap tightening cleanup (2026-04-27)

- Continued the same finishing pass without changing the route structure.
- Problem:
  - a few copy-link actions inside the shop-assets workflow were still bypassing
    the shared tap guard even though the surrounding page had already been
    tightened
- Applied a frontend-only cleanup:
  - `frontend/src/pages/ShopAssetsPage.tsx`
    - added the shared tap guard to the remaining direct copy actions:
      - `Copy Shop Link` near the signboard launcher
      - `Copy Shop Link` in the product form actions
      - `Copy Link` in the posted products list
- Routes impacted:
  - `frontend/src/pages/ShopAssetsPage.tsx`
- Shared logic impact:
  - none on backend logic or route contracts
  - this was a phone-stability / finishing cleanup only

### Marketplace workspace copy and selection controls received phone-tap tightening cleanup (2026-04-28)

- Continued the same finishing pass without changing the workspace structure.
- Problem:
  - several live controls in `MarketplaceWorkspacePage` were still using direct
    taps without the shared button guard
  - this included the invite panel toggle, copy actions, and member row
    selection button
- Applied a frontend-only cleanup:
  - `frontend/src/pages/MarketplaceWorkspacePage.tsx`
    - added the shared tap guard to:
      - invite panel `Open / Hide`
      - `Copy Join Link`
      - `Copy Join Message`
      - `Copy Public Shop Link`
      - `Copy Public Shop Message`
      - member `View Row`
- Routes impacted:
  - `frontend/src/pages/MarketplaceWorkspacePage.tsx`
- Shared logic impact:
  - none on backend logic or route contracts
  - this was a phone-stability / finishing cleanup only

### Shop control public-link and vault-link copy actions received phone-tap tightening cleanup (2026-04-28)

- Continued the same finishing pass without changing the owner-side route
  structure.
- Problem:
  - several copy-link actions in `ShopControlPage` were still bypassing the
    shared tap guard even though neighboring owner actions were already using
    it
- Applied a frontend-only cleanup:
  - `frontend/src/pages/ShopControlPage.tsx`
    - added the shared tap guard to:
      - `Copy Public Link` in the shop-control summary block
      - `Copy Public Link` in the shop details action row
      - `Copy public shop link` in the live spotlight block
      - `Copy link` in the vault viewing links list
- Routes impacted:
  - `frontend/src/pages/ShopControlPage.tsx`
- Shared logic impact:
  - none on backend logic or route contracts
  - this was a phone-stability / finishing cleanup only

### Shop gallery public-link copy and product-list toggle controls received phone-tap tightening cleanup (2026-04-28)

- Continued the same finishing pass without changing the public shop route
  structure.
- Problem:
  - the public shop face still had a couple of direct copy-link actions and the
    `Show all loaded items` toggle on the older tap path
- Applied a frontend-only cleanup:
  - `frontend/src/pages/ShopGalleryPage.tsx`
    - added the shared tap guard to:
      - `Copy public link`
      - `Copy public shop link`
      - `Show all loaded items` / `Return to 12-slot shelf`
- Routes impacted:
  - `frontend/src/pages/ShopGalleryPage.tsx`
- Shared logic impact:
  - none on backend logic or route contracts
  - this was a phone-stability / finishing cleanup only

### Marketplace outward-link copy controls received phone-tap tightening cleanup (2026-04-28)

- Continued the same finishing pass without changing the Marketplace route
  structure.
- Problem:
  - four outward-link copy actions in `MarketplacePage` were still bypassing
    the shared Marketplace tap guard even though the neighboring open/send
    actions were already using it
- Applied a frontend-only cleanup:
  - `frontend/src/pages/MarketplacePage.tsx`
    - added the shared Marketplace tap guard to:
      - `Copy WhatsApp Message`
      - `Copy Create Message`
      - `Copy Marketplace Link`
      - `Copy Shop Link`
- Routes impacted:
  - `frontend/src/pages/MarketplacePage.tsx`
- Shared logic impact:
  - none on backend logic or route contracts
  - this was a phone-stability / finishing cleanup only

### Community Home spotlight, circle, and community-list controls received phone-tap tightening cleanup (2026-04-28)

- Continued the same finishing pass without changing the Community Home route
  structure.
- Problem:
  - several high-traffic collapse/back/copy controls in `CommunityHomePage`
    were still sitting on the older direct tap path even though neighboring
    launcher actions already used the shared Community Home guard
- Applied a frontend-only cleanup:
  - `frontend/src/pages/CommunityHomePage.tsx`
    - added the shared Community Home tap guard to:
      - spotlight guidance `Collapse`
      - `Back to Community Home`
      - owner actions `Open/Collapse`
      - trusted-circle `Open/Collapse`
      - `Copy Invite Bundle`
      - spotlight status `Open/Collapse`
      - communities `Open/Collapse`
- Routes impacted:
  - `frontend/src/pages/CommunityHomePage.tsx`
- Shared logic impact:
  - none on backend logic or route contracts
  - this was a phone-stability / finishing cleanup only

### Community Shop Control panel collapse and public-shop copy controls received phone-tap tightening cleanup (2026-04-28)

- Continued the same finishing pass without changing the panel structure
  launched from Community Home.
- Problem:
  - `CommunityShopControlPanel` was already using the shared tap guard for most
    owner-launcher actions, but its main collapse control and public-shop copy
    action were still on the older direct tap path
- Applied a frontend-only cleanup:
  - `frontend/src/components/CommunityShopControlPanel.tsx`
    - added the shared panel tap guard to:
      - `Open/Collapse owner shop control`
      - `Copy Public Shop Link`
- Routes impacted:
  - `frontend/src/components/CommunityShopControlPanel.tsx`
- Shared logic impact:
  - none on backend logic or route contracts
  - this was a phone-stability / finishing cleanup only

### Shop Control spotlight workflow buttons received phone-tap tightening cleanup (2026-04-28)

- Continued the same finishing pass without changing the Shop Control route
  structure.
- Problem:
  - the step-by-step spotlight workflow in `ShopControlPage` still had several
    direct action buttons on the older tap path even though much of the rest of
    the owner-control surface had already been tightened
- Applied a frontend-only cleanup:
  - `frontend/src/pages/ShopControlPage.tsx`
    - added the shared Shop Control tap guard to:
      - `Continue to shop spotlight`
      - all spotlight `Cancel` actions
      - spotlight priority selection (`Free spotlight`, `Paid spotlight`)
      - spotlight media selection (`Picture only`, `Video only`, `Picture and video`)
      - `Continue to preview`
      - `Back to upload`
      - `Publish spotlight`
- Routes impacted:
  - `frontend/src/pages/ShopControlPage.tsx`
- Shared logic impact:
  - none on backend logic or route contracts
  - this was a phone-stability / finishing cleanup only

### Shop Assets section toggles received phone-tap tightening cleanup (2026-04-28)

- Continued the same finishing pass without changing the Shop Assets route
  structure.
- Problem:
  - `ShopAssetsPage` still had its main section collapse controls on the older
    direct tap path even though its direct product and copy actions had already
    been tightened
- Applied a frontend-only cleanup:
  - `frontend/src/pages/ShopAssetsPage.tsx`
    - added the shared Shop Assets tap guard to:
      - guided release order `Open/Collapse`
      - signboard `Open/Collapse`
      - product picture blocks `Open/Collapse`
      - posted product blocks `Open/Collapse`
- Routes impacted:
  - `frontend/src/pages/ShopAssetsPage.tsx`
- Shared logic impact:
  - none on backend logic or route contracts
  - this was a phone-stability / finishing cleanup only

### TrustSlip copy, print, and section-toggle controls received phone-tap tightening cleanup (2026-04-28)

- Continued the same finishing pass without changing the TrustSlip route
  structure.
- Problem:
  - `TrustSlipPage` still had its main copy/print cluster and section toggles
    on the older direct tap path
- Applied a frontend-only cleanup:
  - `frontend/src/pages/TrustSlipPage.tsx`
    - added the shared tap guard and stable touch-safe button styling to:
      - `Copy TrustSlip Code`
      - `Copy Verify Link`
      - `Copy GMFN ID`
      - `Print TrustSlip`
      - `Merchant verification` `Open/Collapse`
      - merchant verify `Copy Verify Link`
      - `Merchant-facing view` `Open/Collapse`
      - `Evidence and exposure context` `Open/Collapse`
      - `Institutional notes` `Open/Collapse`
- Routes impacted:
  - `frontend/src/pages/TrustSlipPage.tsx`
- Shared logic impact:
  - none on backend logic or route contracts
  - this was a phone-stability / finishing cleanup only

### TrustSlip Verify quick-action buttons received phone-tap tightening cleanup (2026-04-28)

- Continued the same finishing pass without changing the TrustSlip Verify
  route structure.
- Problem:
  - the quick action cluster in `TrustSlipVerifyPage` still used direct click
    handlers without the shared tap guard
- Applied a frontend-only cleanup:
  - `frontend/src/pages/TrustSlipVerifyPage.tsx`
    - added the shared tap guard to:
      - `Copy TrustSlip Code`
      - `Copy Verify Link`
      - `Copy GMFN ID`
      - `Print Verification`
- Routes impacted:
  - `frontend/src/pages/TrustSlipVerifyPage.tsx`
- Shared logic impact:
  - none on backend logic or route contracts
  - this was a phone-stability / finishing cleanup only

### Backend clan/member route regression fixed and backend suite restored to green (2026-04-29)

- Continued the completion push by resolving the remaining backend regression
  that was blocking a truly deployment-ready batch.
- Problem:
  - clan/member routes had been refactored to resolve the target community by
    explicit path `clan_id`, but the older backend test fixtures were still
    seeding an underspecified `clans` row
  - under the current migrated SQLite schema, that fixture insert was silently
    ignored, so member-management routes returned `Clan not found`
- Applied a backend/system-level fix:
  - `gmfn_backend/app/api/routes/clans.py`
    - added `_resolve_target_clan_membership(...)` so path-based clan/member
      routes resolve the requested real community explicitly instead of relying
      on ambient clan context
    - updated member-management routes to use the explicit current user +
      target-clan resolution path:
      - `GET /clans/{clan_id}/members`
      - `POST /clans/{clan_id}/members`
      - `DELETE /clans/{clan_id}/members/{user_id}`
      - `PATCH /clans/{clan_id}/members/{user_id}/role`
      - `PATCH /clans/{clan_id}/members/{user_id}/pool`
  - `gmfn_backend/tests/conftest.py`
    - updated clan seed fixtures to insert a fully valid test community row
      including:
      - `invite_code`
      - `community_code`
      - `status`
      - `invite_uses`
      - `created_at`
- Verification:
  - `python -m pytest tests/test_clan_members.py tests/test_clan_pool.py -q`
    → `7 passed`
  - `python -m pytest -q tests`
    → `94 passed`
  - `python -m py_compile app/api/routes/clans.py tests/conftest.py tests/test_join_requests.py`
    → passed
- Routes impacted:
  - backend member-management + pool-adjustment routes listed above
- Shared logic impact:
  - clan/member management now behaves correctly when the user belongs to
    multiple real communities
  - test fixtures now reflect the current clan schema instead of a stale
    pre-invite-code shape

### Shared institutional visual system hardened toward a more serious live-ready look (2026-04-29)

- Continued the finish pass at system level instead of repainting single pages.
- Goal:
  - reduce the warmer / softer / immature visual feel on weaker pages
  - move shared surfaces closer to a more institutional blue-gold standard
    that feels more trustworthy and less like a demo
- Applied a shared frontend visual pass:
  - `frontend/src/styles/gmfnBrand.ts`
    - deepened the core GMFN/GSN brand palette
    - strengthened page-wash, hero, and glass gradients
    - strengthened card, inner-card, badge, and action-button contrast/shadows
  - `frontend/src/lib/institutionalSurface.ts`
    - hardened the default page / soft / inner / stat gradients
    - strengthened blue-rail shells, borders, and shadows
  - `frontend/src/ui/styles.ts`
    - upgraded legacy generic cards/buttons/pills to the same institutional
      visual language so older pages do not stay flatter/warmer than the
      stronger route family
  - `frontend/src/components/PageTopNav.tsx`
    - strengthened the shared page-top navigation shell and action controls
      so routes using it inherit the more mature visual tone
  - `frontend/src/components/WorkspaceSettingsBridge.tsx`
    - kept the existing settings structure, but normalized the alternate tone
      presets so even non-default presets remain institutional rather than
      overly warm/pastel
  - `frontend/src/index.css`
    - hardened the global page wash and default watermark tint toward the
      institutional blue baseline
- Verification:
  - `npm exec -- eslint src/styles/gmfnBrand.ts src/lib/institutionalSurface.ts src/ui/styles.ts src/components/WorkspaceSettingsBridge.tsx src/components/PageTopNav.tsx`
    → passed
  - `npm run build`
    → passed
- Routes / screen families most affected:
  - app shell / layout-driven surfaces using `gmfnBrand` and the shared page
    wash
  - routes using `PageTopNav`
  - routes using `institutionalSurface` helpers
  - older routes using the generic `ui/styles.ts` cards/buttons
- Frozen-area note:
  - the `/app/dashboard` frozen `Market Wisdom` interaction model was not
    restructured in this pass
- Shared logic impact:
  - this was a system-level visual maturity correction, not a route-contract or
    backend-behavior change

### Private guidance/member utility surfaces darkened for pilot-readiness (2026-04-29)

- Continued the GMFN-only pilot-readiness visual pass on active authenticated routes that still felt lighter/older than the institutional family.
- Route-local updates:
  - `frontend/src/pages/BuildFirstCirclePage.tsx`
    - darkened the main page-card / soft-card / inner-card / stat-tile system
    - strengthened labels, chips, helper text, and invite-preview surfaces so the first-circle workflow reads as a serious guided workspace instead of a lighter setup page
    - cleaned the share-ready invite copy separators back to plain ASCII `-`
  - `frontend/src/pages/NotificationsPage.tsx`
    - darkened the page shell, action rails, stat tiles, focus/review surfaces, raw-feed panels, and reading guide blocks
    - moved the softer utility controls into the same darker institutional button/card rhythm used on stronger live routes
    - replaced the truncated glyph suffix with plain ASCII `...`
  - `frontend/src/pages/ClansPage.tsx`
    - darkened the community creation, invite package, and existing-community management shells
    - kept form inputs readable while moving the surrounding cards, badges, and secondary actions into the darker institutional family
    - strengthened invite-package evidence blocks so sender/link/code/share text no longer sits in lighter utility boxes
- Verification:
  - `npm exec -- eslint src/pages/BuildFirstCirclePage.tsx src/pages/NotificationsPage.tsx src/pages/ClansPage.tsx`
    -> passed
  - `npm run build`
    -> passed
- Routes impacted:
  - `/app/build-first-circle`
  - `/app/notifications`
  - `/app/clans`
- Frozen-area note:
  - `/app/dashboard` Market Wisdom remained untouched
- Shared logic impact:
  - no auth, backend, or route-contract behavior changed
  - this was a route-local institutional polish / readability pass for live private member surfaces

### Private member guide and community landing surfaces institutionalized further (2026-04-29)

- Continued the GMFN-only private pilot-readiness pass on two larger authenticated live routes that still felt lighter than the stronger institutional family.
- Route-local updates:
  - `frontend/src/pages/CommunityHomePage.tsx`
    - darkened the route-local page-card / soft-card / inner-card system
    - retuned badges, compact signals, metric cards, collapse controls, and secondary actions into the darker institutional family
    - strengthened the community-summary and first-circle support surfaces without changing community-home workflow or shop-control behavior
  - `frontend/src/pages/MyGMFNAndIPage.tsx`
    - darkened the guide/settings shell cards plus capability and route tiles
    - strengthened the hero-side guidance panel and settings summary cards so the member guide feels closer to the same serious private workspace family as Community Home and Notifications
    - kept the public `/guide` vs signed-in `/app/my-gmfn-and-i` context split intact while improving the protected member presentation
- Verification:
  - `npm exec -- eslint src/pages/CommunityHomePage.tsx src/pages/MyGMFNAndIPage.tsx`
    -> passed
  - `npm run build`
    -> passed
- Routes impacted:
  - `/app/community`
  - `/app/my-gmfn-and-i`
  - `/guide` (presentation continuity only through the shared page file)
- Frozen-area note:
  - `/app/dashboard` Market Wisdom remained untouched
- Shared logic impact:
  - no auth, backend, or route-contract behavior changed
  - this was a route-local institutional polish pass for private member surfaces and the shared guide/member page shell

### Private operational money-support routes darkened for pilot-readiness (2026-04-29)

- Continued the GMFN-only private pilot-readiness pass on active operational/support routes that still felt lighter and less institutional than the stronger authenticated surfaces.
- Route-local updates:
  - `frontend/src/pages/WithdrawalInstructionsPage.tsx`
    - darkened the page-card / soft-card / inner-card / stat-tile system
    - moved section labels, badges, helper text, collapse controls, and non-primary action buttons into the same darker institutional family used on stronger private routes
    - retuned explanatory/result text blocks so the live withdrawal route no longer mixes a dark shell with lighter legacy reading surfaces
  - `frontend/src/pages/PaymentInstructionsPage.tsx`
    - darkened the main payment-in shell plus soft/inner/stat surfaces
    - moved section labels, badges, helper text, collapse controls, and secondary/soft actions into the darker institutional family
    - kept pay-in form inputs readable while strengthening the surrounding route guidance and reconciliation explanation surfaces
  - `frontend/src/pages/PayoutDetailsPage.tsx`
    - darkened the payout shell, secondary action treatment, section labels, badges, and explanatory detail surfaces
    - kept account-entry inputs readable while moving the surrounding payout explanation and next-step areas into the same institutional family
- Verification:
  - `npm exec -- eslint src/pages/WithdrawalInstructionsPage.tsx src/pages/PaymentInstructionsPage.tsx src/pages/PayoutDetailsPage.tsx`
    -> passed with one pre-existing warning in `WithdrawalInstructionsPage.tsx`:
       `react-hooks/exhaustive-deps` on `loadPage`
  - `npm run build`
    -> passed
- Routes impacted:
  - `/app/withdrawal-instructions`
  - `/app/payment/pool`
  - `/app/payout-details`
- Frozen-area note:
  - `/app/dashboard` Market Wisdom remained untouched
- Shared logic impact:
  - no auth, backend, or route-contract behavior changed
  - this was a route-local institutional polish / readability pass for live private money-support routes

### Private finance and loan follow-through routes institutionalized further (2026-04-29)

- Continued the GMFN-only private pilot-readiness haul on the next coherent authenticated operational family: finance overview, loans, loan readiness, and repayment follow-through.
- Route-local updates:
  - `frontend/src/pages/FinancePage.tsx`
    - darkened route-local badges, helper text, collapse controls, and non-primary buttons
    - moved the finance tables into a darker institutional shell with lighter header/value text so the finance workspace no longer drops back to a bright utility table treatment
  - `frontend/src/pages/LoansPage.tsx`
    - darkened the page-card / soft-card / inner-card / stat-tile system
    - moved route tiles, badges, helper text, collapse controls, and supporting text into the same darker institutional family
    - retuned explicit value/summary text so the live loan workspace reads consistently against the darker shell
  - `frontend/src/pages/LoanReadinessPage.tsx`
    - darkened the page-card / soft-card / inner-card / stat-tile system
    - moved route tiles, badges, helper text, and collapse controls into the same darker institutional family as Loans
    - retuned explicit explanatory/result text so the readiness route no longer mixes dark shells with lighter legacy reading blocks
  - `frontend/src/pages/RepaymentPage.tsx`
    - darkened the repayment page-card / soft-card / inner-card / stat-tile system
    - moved badges, helper text, secondary/soft buttons, and collapse controls into the same darker institutional family
    - retuned repayment explanation/detail text blocks so the route now matches the stronger private money-support surfaces
- Verification:
  - `npm exec -- eslint src/pages/FinancePage.tsx src/pages/LoansPage.tsx src/pages/LoanReadinessPage.tsx src/pages/RepaymentPage.tsx`
    -> passed
  - `npm run build`
    -> passed
- Routes impacted:
  - `/app/finance`
  - `/app/loans`
  - `/app/loan-readiness`
  - `/app/payment/loans/:loanId`
- Frozen-area note:
  - `/app/dashboard` Market Wisdom remained untouched
- Shared logic impact:
  - no auth, backend, or route-contract behavior changed
  - this was a route-local institutional polish / readability pass for live private finance and loan follow-through routes

### Private guarantor and loan-workbench routes darkened for pilot-readiness (2026-04-29)

- Continued the GMFN-only private pilot-readiness haul on the adjacent live guarantor/workbench family so the support-routing surfaces no longer lag the newer institutional member routes.
- Route-local updates:
  - `frontend/src/pages/LoanSuggestionsPage.tsx`
    - darkened the page-card / soft-card / inner-card / stat-tile system
    - moved route tiles, badges, helper text, collapse controls, and non-primary buttons into the darker institutional family
    - cleaned the legacy broken fallback date marker from `â€”` to `Not stated`
    - retuned explicit explanatory/result text so the suggested-supporter route no longer mixes dark shells with brighter utility cards
  - `frontend/src/pages/LoanWorkbenchPage.tsx`
    - darkened the page-card / soft-card / inner-card / stat-tile system
    - moved route tiles, badges, helper text, collapse controls, and non-primary buttons into the same darker institutional family as Loans and Readiness
    - cleaned the legacy broken fallback date marker from `â€”` to `Not stated`
    - retuned detailed workbench reading text so the live loan support route feels visually aligned with the stronger private operational surfaces
  - `frontend/src/pages/GuarantorInboxPage.tsx`
    - darkened the inbox shell, route tiles, badges, helper text, filter controls, secondary controls, and collapse controls
    - kept the guarantor decision workflow intact while moving the surrounding queue/guidance surfaces into the darker institutional family
  - `frontend/src/pages/GuarantorEarningsPage.tsx`
    - darkened the earnings shell, route tiles, badges, helper text, secondary controls, and collapse controls
    - retuned explicit value and guidance text so the live guarantor-earnings route reads more like a serious private workspace and less like an older utility page
- Verification:
  - `npm exec -- eslint src/pages/LoanSuggestionsPage.tsx src/pages/LoanWorkbenchPage.tsx src/pages/GuarantorInboxPage.tsx src/pages/GuarantorEarningsPage.tsx`
    -> passed with pre-existing warnings:
       - `GuarantorInboxPage.tsx:628` missing dependency `loadInbox`
       - `LoanSuggestionsPage.tsx:885` missing dependency `loadSuggestionsForLoan`
       - `LoanWorkbenchPage.tsx:1042` missing dependencies `loadLoanList` and `loadLoanWorkbench`
  - `npm run build`
    -> passed
- Routes impacted:
  - `/app/loan-suggestions`
  - `/app/loan-workbench`
  - `/app/guarantor-inbox`
  - `/app/guarantor-earnings`
- Frozen-area note:
  - `/app/dashboard` Market Wisdom remained untouched
- Shared logic impact:
  - no auth, backend, or route-contract behavior changed
  - this was a route-local institutional polish / readability pass for live private guarantor and loan-workbench routes

### Command-center operational admin routes darkened for pilot-readiness (2026-04-29)

- Continued the GMFN-only longer-haul pilot-readiness pass on the live authenticated command-center / oversight family that was still visually lighter than the upgraded private operational routes.
- Route-local updates:
  - `frontend/src/pages/SystemOperationsPage.tsx`
    - moved the live system-operations shell, soft cards, inner cards, stat tiles, route tiles, badges, helper text, and secondary/collapse controls into the darker institutional surface family
    - kept the existing queue/intake/signal logic intact while making the route feel much closer to the steadier private command-center system
  - `frontend/src/pages/BankConsolePage.tsx`
    - darkened the main shell plus soft/inner support surfaces and steadied the secondary action treatment
    - cleaned the fallback status/date marker from the legacy dash to `Not stated`
    - kept bank-ingest / reconciliation workflow and route contracts unchanged
  - `frontend/src/pages/ExposureAdminPage.tsx`
    - moved the exposure pressure/queue/route surfaces into the darker institutional card family
    - retuned route tiles, stat tiles, badges, helper text, and secondary/soft controls so the command-center branch no longer drops back into lighter legacy panels
  - `frontend/src/pages/AdminIdentityRiskPage.tsx`
    - upgraded the identity-risk cards, grouped-signal rows, and detail-toggle treatment into the same darker institutional family
    - kept the risk grouping/classification logic intact while making the manual-review route read more like a serious admin workspace
- Verification:
  - `npm exec -- eslint src/pages/SystemOperationsPage.tsx src/pages/BankConsolePage.tsx src/pages/ExposureAdminPage.tsx src/pages/AdminIdentityRiskPage.tsx`
    -> passed with one pre-existing warning in `BankConsolePage.tsx`:
       `react-hooks/exhaustive-deps` on `loadAll`
  - `npm run build`
    -> passed
- Routes impacted:
  - `/app/command-center/system-operations`
  - `/app/command-center/bank-console`
  - `/app/command-center/exposure`
  - `/app/command-center/identity-risk`
- Frozen-area note:
  - `/app/dashboard` Market Wisdom remained untouched
- Shared logic impact:
  - no auth, backend, or route-contract behavior changed
  - this was a route-local institutional polish / readability pass for live authenticated command-center operational routes
### Marketplace operations and trust-graph routes darkened for pilot-readiness (2026-04-29)

- Continued the GMFN-only longer-haul pilot-readiness pass on the remaining authenticated marketplace-operations and trust-graph oversight routes that were still visually lighter than the upgraded private operational families.
- Route-local updates:
  - `frontend/src/pages/DemandBoxPage.tsx`
    - moved the demand-box page-card / soft-card / inner-card / stat-tile system into the darker institutional surface family
    - retuned section labels, badges, helper text, and softer action surfaces so the live demand workflow no longer drops back into older bright utility styling
  - `frontend/src/pages/ShopAssetsPage.tsx`
    - moved the shop-assets page-card / soft-card / inner-card / stat-tile system into the same darker institutional family
    - darkened route-local badges, helper text, section labels, and non-primary action treatment while preserving the existing assets workflow and route purposes
  - `frontend/src/pages/ShopControlPage.tsx`
    - deepened the route-local page-card / soft-card / notice / secondary-control treatment so the live shop-control route reads more like the upgraded private marketplace workspace
    - kept existing shop-control logic and destinations intact while removing some of the lighter legacy utility feel
  - `frontend/src/pages/AdminTrustGraphPage.tsx`
    - moved the trust-graph page-card / soft-card / inner-card / stat-tile system into the darker institutional command-center family
    - darkened route tiles, badges, helper text, and collapse-control treatment so the live oversight surface aligns better with the upgraded admin routes
- Verification:
  - `npm exec -- eslint src/pages/DemandBoxPage.tsx src/pages/ShopAssetsPage.tsx src/pages/ShopControlPage.tsx src/pages/AdminTrustGraphPage.tsx`
    -> passed
  - `npm run build`
    -> passed
- Routes impacted:
  - `/app/demand-box`
  - `/app/shop-assets`
  - `/app/shop-control`
  - `/app/command-center/trust-graph`
- Frozen-area note:
  - `/app/dashboard` Market Wisdom remained untouched
- Shared logic impact:
  - no auth, backend, or route-contract behavior changed
  - this was a route-local institutional polish / readability pass for live authenticated marketplace operations and trust-graph oversight routes
### Core command-center routes darkened further for pilot-readiness (2026-04-29)

- Continued the GMFN-only longer-haul authenticated pilot-readiness pass on the remaining core command-center routes so the command-center landing, trust-analytics, and revenue-allocation branches no longer lag the upgraded admin / operational family.
- Route-local updates:
  - `frontend/src/pages/TrustCommandCentrePage.tsx`
    - moved the command-center page-card / soft-card / inner-card / stat-tile system closer to the darker institutional surface family
    - darkened route tiles, badges, helper text, and softer action surfaces while preserving all existing oversight destinations and loading logic
    - cleaned the fallback date marker to `Not stated`
  - `frontend/src/pages/TrustAnalyticsPage.tsx`
    - moved the trust-analytics page-card / soft-card / inner-card / stat-tile system into the same darker institutional family
    - darkened badges, helper text, soft actions, and collapse controls while preserving the existing analytics workflow and route purpose
    - cleaned the fallback date marker to `Not stated`
  - `frontend/src/pages/RevenueAllocationPage.tsx`
    - deepened the route-tile, secondary-action, collapse-control, badge, and helper-text treatment so the revenue-allocation route sits more naturally beside the upgraded finance / command-center surfaces
    - cleaned the fallback date marker to `Not stated`
- Verification:
  - `npm exec -- eslint src/pages/TrustCommandCentrePage.tsx src/pages/TrustAnalyticsPage.tsx src/pages/RevenueAllocationPage.tsx`
    -> passed
  - `npm run build`
    -> passed
- Routes impacted:
  - `/app/command-center`
  - `/app/command-center/trust-analytics`
  - `/app/command-center/revenue-allocation`
- Frozen-area note:
  - `/app/dashboard` Market Wisdom remained untouched
- Shared logic impact:
  - no auth, backend, or route-contract behavior changed
  - this was a route-local institutional polish / readability pass for live authenticated core command-center routes
### Marketplace workspace, payment rails, and loan-summary routes polished further for pilot-readiness (2026-04-29)

- Continued the GMFN-only longer-haul authenticated pilot-readiness pass on the next coherent private workspace family so marketplace workspace, payment-rails, and loan-summary no longer lag the darker institutional operational surfaces.
- Route-local updates:
  - `frontend/src/pages/MarketplaceWorkspacePage.tsx`
    - deepened the secondary button, badge, helper-text, and section-label treatment so the live community marketplace workspace feels steadier and less like a lighter utility branch
    - kept the existing community invite/member/join-request workflow intact
  - `frontend/src/pages/PaymentRailsPage.tsx`
    - moved the page-card / soft-card / inner-card system into the same darker institutional family used by the upgraded private operational routes
    - darkened route tiles, badges, helper text, and soft controls while preserving the existing payment-rails reading workflow and route purpose
  - `frontend/src/pages/LoanSummaryPage.tsx`
    - deepened the route-tile, secondary-action, collapse-control, badge, helper-text, and section-label treatment so the live loan-summary route aligns better with the upgraded finance / guarantor / repayment surfaces
    - cleaned the fallback date marker to `Not stated`
- Verification:
  - `npm exec -- eslint src/pages/MarketplaceWorkspacePage.tsx src/pages/PaymentRailsPage.tsx src/pages/LoanSummaryPage.tsx`
    -> passed with one pre-existing warning in `LoanSummaryPage.tsx`:
       `react-hooks/exhaustive-deps` on `refreshAll`
  - `npm run build`
    -> passed
- Routes impacted:
  - `/community/:clanId`
  - `/app/payment-rails`
  - `/app/loan-summary/:loanId`
- Frozen-area note:
  - `/app/dashboard` Market Wisdom remained untouched
- Shared logic impact:
  - no auth, backend, or route-contract behavior changed
  - this was a route-local institutional polish / readability pass for live authenticated marketplace workspace, payment rails, and loan-summary routes
### Public entry button labels tightened for pilot-readiness (2026-04-29)

- Switched the GMFN-only pilot-readiness pass from broad visual cleanup into route-truth on the live public entry funnel, where vague `Continue` labels still made the next step feel less explicit than it should.
- Route-local updates:
  - `frontend/src/pages/CoverPage.tsx`
    - changed the main dock action from `Continue` to `Open Welcome`
    - kept the exact route behavior intact while making the first public handoff clearer
  - `frontend/src/pages/WelcomePage.tsx`
    - changed the single-lane create action from `Continue` to `Start community setup`
    - changed the single-lane invitation action from `Continue` to `Open join path`
    - changed the single-lane approved-member action from `Continue` to `Finish activation`
    - changed the general new-member chooser action from `Continue` to `Choose create or join`
- Verification:
  - `npm exec -- eslint src/pages/CoverPage.tsx src/pages/WelcomePage.tsx`
    -> passed
  - `npm run build`
    -> passed
- Routes impacted:
  - `/cover`
  - `/welcome`
- Frozen-area note:
  - `/app/dashboard` Market Wisdom remained untouched
- Shared logic impact:
  - no auth, backend, or route-contract behavior changed
  - this was a route-local pilot-readiness truth pass on live public entry labels so users can tell what each button really opens before tapping it
### Authenticated focus-commitment handoffs clarified for pilot-readiness (2026-04-29)

- Continued the GMFN-only pilot-readiness truth sweep on live authenticated support / borrowing routes where technically correct next-step buttons still hid that they were opening the Dashboard focus-commitments section.
- Route-local updates:
  - `frontend/src/pages/LoansPage.tsx`
    - changed the route-tile label from `Commitment Builder` to `Open Focus Commitments`
    - clarified the helper copy so the route now says it opens the Dashboard focus section for a steadier visible plan
  - `frontend/src/pages/LoanReadinessPage.tsx`
    - changed the route-tile label from `Commitment Builder` to `Open Focus Commitments`
    - clarified the helper copy so the route now says it opens the Dashboard focus section for readiness follow-through
  - `frontend/src/pages/WithdrawalInstructionsPage.tsx`
    - changed the support CTA from `Continue To Loan Readiness` to `Open Loan Readiness Support`
    - kept the same route behavior while making the destination explicit before tap
  - `frontend/src/pages/FinancePage.tsx`
    - changed the focus handoff from `Add a money promise` to `Open Focus Commitments`
    - clarified the detail and technical text to say it opens the Dashboard focus section / Dashboard focus commitments
  - `frontend/src/pages/TrustScorePage.tsx`
    - changed the trust-facing focus handoffs from generic promise/builder language to `Open Focus Commitments`
    - clarified the route details so users can tell the action opens the Dashboard focus section for repair, repayment, or follow-through
- Verification:
  - `npm exec -- eslint src/pages/LoansPage.tsx src/pages/LoanReadinessPage.tsx src/pages/WithdrawalInstructionsPage.tsx src/pages/FinancePage.tsx src/pages/TrustScorePage.tsx`
    -> passed with the same pre-existing warnings:
       - `frontend/src/pages/TrustScorePage.tsx:1647` missing dependency `revealTrustSection`
       - `frontend/src/pages/TrustScorePage.tsx:1774` missing dependency `loadAll`
       - `frontend/src/pages/WithdrawalInstructionsPage.tsx:765` missing dependency `loadPage`
  - `npm run build`
    -> passed
- Routes impacted:
  - `/app/loans`
  - `/app/loan-readiness`
  - `/app/withdrawal-instructions`
  - `/app/finance`
  - `/app/trust`
- Frozen-area note:
  - `/app/dashboard` Market Wisdom remained untouched
- Shared logic impact:
  - no auth, backend, or route-contract behavior changed
  - this was a route-local pilot-readiness truth pass so authenticated users can tell when a button opens the Dashboard focus section before tapping it
### Notifications and guide route truth tightened for pilot-readiness (2026-04-29)

- Continued the GMFN-only pilot-readiness truth sweep on live authenticated continuity routes so focus-commitment and guide handoffs no longer use older or more misleading wording once a user is already inside the member workspace.
- Route-local updates:
  - `frontend/src/pages/NotificationsPage.tsx`
    - added a route-local CTA-label normalizer for notification actions
    - notification actions that resolve to `/app/dashboard#focus-commitments` now show `Open Focus Commitments` instead of older or generic action labels
    - notification actions that resolve to `/app/my-gmfn-and-i` now show `Open My GSN and I` when the incoming label is vague or still uses older naming
  - `frontend/src/pages/MyGMFNAndIPage.tsx`
    - changed the route tile label from `Commitment Builder` to `My GSN and I`
    - clarified the helper copy so the page explains that member guidance/settings live here, while Focus Commitments opens from Dashboard when the execution-discipline layer is needed
- Verification:
  - `npm exec -- eslint src/pages/NotificationsPage.tsx src/pages/MyGMFNAndIPage.tsx`
    -> passed
  - `npm run build`
    -> passed
- Routes impacted:
  - `/app/notifications`
  - `/app/my-gmfn-and-i`
  - `/guide`
- Frozen-area note:
  - `/app/dashboard` Market Wisdom remained untouched
- Shared logic impact:
  - no auth, backend, or route-contract behavior changed
  - this was a route-local pilot-readiness truth pass so notification actions and guide tiles say more honestly which live member surface opens next
### Invitation, approval, and return-entry button truth tightened further for pilot-readiness (2026-04-29)

- Continued the GMFN-only pilot-readiness truth sweep on live public invitation / approval / return-entry routes where the next-step actions still used vague `Continue` wording even though each button was opening a specific route.
- Route-local updates:
  - `frontend/src/pages/InviteLandingPage.tsx`
    - changed the success-state notice from `Continue into the guided founder route` to `Open the guided founder entry route`
    - changed the primary CTA from `Continue founder route` to `Open founder entry`
    - changed the supporting copy from `Continue into the public founder flow` to `Open the public founder flow`
  - `frontend/src/pages/JoinByInvitePage.tsx`
    - changed the success-state notice from `Continue into the guided invited entry` to `Open the guided invited entry route`
    - changed the primary CTA from `Continue invited route` to `Open invited entry`
  - `frontend/src/pages/JoinApprovalPage.tsx`
    - changed the approval CTA from `Continue Activation` to `Open activation`
  - `frontend/src/pages/WelcomePage.tsx`
    - changed the existing-account CTA from `Continue to Login` to `Open sign in`
  - `frontend/src/pages/JoinEntryPage.tsx`
    - changed the saved-request CTA from `Continue previous request` to `Reopen saved request`
- Verification:
  - `npm exec -- eslint src/pages/InviteLandingPage.tsx src/pages/JoinByInvitePage.tsx src/pages/JoinApprovalPage.tsx src/pages/WelcomePage.tsx src/pages/JoinEntryPage.tsx`
    -> passed
  - `npm run build`
    -> passed
- Routes impacted:
  - founder invite landing in `frontend/src/pages/InviteLandingPage.tsx`
  - `/join-by-invite/:code`
  - `/join-approval/:requestId`
  - `/welcome`
  - `/join`
  - `/join/:code`
  - `/join/community/:clanId`
- Frozen-area note:
  - `/app/dashboard` Market Wisdom remained untouched
- Shared logic impact:
  - no auth, backend, or route-contract behavior changed
  - this was a route-local pilot-readiness truth pass so live public entry buttons say more clearly which route opens next before the user taps
### Focus Commitments naming tightened across live invitation/public entry routes (2026-04-29)

- Continued the GMFN-only pilot-readiness truth sweep on live invitation and public-entry routes so older `Commitment Builder` wording no longer leaks into public-facing guidance where the actual live member destination is the Dashboard Focus Commitments section.
- Route-local updates:
  - `frontend/src/pages/InviteLandingPage.tsx`
    - changed the support explanation from `Commitment Builder opens after workspace entry` to `Focus Commitments opens from Dashboard after workspace entry`
    - changed the support CTA from `Read about Commitment Builder first` to `Read about Focus Commitments first`
  - `frontend/src/pages/JoinByInvitePage.tsx`
    - made the same support-copy truth fix so the page now explains that Focus Commitments opens from Dashboard after workspace entry
    - changed `Read about Commitment Builder first` to `Read about Focus Commitments first`
  - `frontend/src/pages/JoinApprovalPage.tsx`
    - made the same support-copy truth fix for the approved/decision route
    - changed `Read about Commitment Builder first` to `Read about Focus Commitments first`
  - `frontend/src/pages/JoinRequestPendingPage.tsx`
    - changed `Read about Commitment Builder first` to `Read about Focus Commitments first`
  - `frontend/src/pages/WelcomePage.tsx`
    - changed the public capability list item from `Commitment Builder` to `Focus Commitments`
- Verification:
  - `npm exec -- eslint src/pages/InviteLandingPage.tsx src/pages/JoinByInvitePage.tsx src/pages/JoinApprovalPage.tsx src/pages/JoinRequestPendingPage.tsx src/pages/WelcomePage.tsx`
    -> passed
  - `npm run build`
    -> passed
- Routes impacted:
  - founder invite landing in `frontend/src/pages/InviteLandingPage.tsx`
  - `/join-by-invite/:code`
  - `/join-approval/:requestId`
  - `/pending-approval`
  - `/join-request/pending`
  - `/welcome`
- Frozen-area note:
  - `/app/dashboard` Market Wisdom remained untouched
- Shared logic impact:
  - no auth, backend, or route-contract behavior changed
  - this was a route-local pilot-readiness truth pass so public-facing guide/support language matches the actual live Focus Commitments destination more honestly
### Trust and inbox destination labels tightened after activation for pilot-readiness (2026-04-29)

- Continued the GMFN-only pilot-readiness truth sweep on live authenticated member-continuity routes so post-activation and action-inbox trust handoffs now say more exactly which private screen opens next.
- Route-local updates:
  - `frontend/src/pages/MemberActivationPage.tsx`
    - changed `Review Trust` to `Open Trust Passport`
    - changed `Review Notifications` to `Open Action Inbox`
  - `frontend/src/pages/NotificationsPage.tsx`
    - changed the trust-onboarding fallback CTA label from `Review Trust` to `Open Trust Passport`
    - changed the rendered trust-onboarding primary action from `Review Trust` to `Open Trust Passport`
- Verification:
  - `npm exec -- eslint src/pages/MemberActivationPage.tsx src/pages/NotificationsPage.tsx`
    -> passed
  - `npm run build`
    -> passed
- Routes impacted:
  - `/activate-membership`
  - `/app/notifications`
  - `/app/trust`
- Frozen-area note:
  - `/app/dashboard` Market Wisdom remained untouched
- Shared logic impact:
  - no auth, backend, or route-contract behavior changed
  - this was a route-local pilot-readiness truth pass so post-activation and inbox trust actions name the actual destination more clearly before the user taps
### Entry and activation chain wording tightened further for pilot-readiness (2026-04-29)

- Continued the GMFN-only pilot-readiness truth sweep on the live entry and activation chain so the create/sign-in/activation routes speak more clearly about what opens next and when a user should leave the current form instead of forcing the wrong path.
- Route-local updates:
  - `frontend/src/pages/LoginPage.tsx`
    - changed the sign-in guide step heading from `Continue safely` to `Use activation first if needed`
    - kept the same guidance meaning while making the route choice more explicit
  - `frontend/src/pages/CreateEntryPage.tsx`
    - changed the existing-member helper copy from `Go to sign in` to `Open sign in`
    - changed the existing-member CTA from `I am already a member` to `Open sign in instead`
  - `frontend/src/pages/WelcomePage.tsx`
    - changed the general approved-member CTA from `Activate` to `Open activation`
    - changed the general existing-member CTA from `Login` to `Open sign in`
    - changed the general create/join branch CTAs from `Create` / `Join` to `Open create path` / `Open join path`
  - `frontend/src/pages/MemberActivationPage.tsx`
    - changed the submit CTA from `Activate Membership` to `Finish activation`
    - changed the busy label from `Activating...` to `Finishing activation...`
- Verification:
  - `npm exec -- eslint src/pages/LoginPage.tsx src/pages/CreateEntryPage.tsx src/pages/WelcomePage.tsx src/pages/MemberActivationPage.tsx`
    -> passed
  - `npm run build`
    -> passed
- Routes impacted:
  - `/login`
  - `/create`
  - `/welcome`
  - `/activate-membership`
- Frozen-area note:
  - `/app/dashboard` Market Wisdom remained untouched
- Shared logic impact:
  - no auth, backend, or route-contract behavior changed
  - this was a route-local pilot-readiness truth pass so the core entry/activation chain says more plainly what action each live button actually performs next
### Entry-step toggles and headlines clarified for end-to-end pilot-readiness (2026-04-29)

- Continued the GMFN-only end-to-end pilot-readiness sweep on the live entry chain so collapsible steps and welcome headlines no longer rely on generic `Open` / `Collapse` wording where a pilot user needs a more concrete sense of which step is being revealed.
- Route-local updates:
  - `frontend/src/pages/JoinEntryPage.tsx`
    - changed the request-form toggle from `Open` / `Collapse` to `Open request form` / `Collapse form`
  - `frontend/src/pages/CreateEntryPage.tsx`
    - changed the existing-member helper toggle from `Open` / `Collapse` to `Open sign-in help` / `Collapse sign-in help`
    - changed the stage toggles from generic `Open` / `Collapse` to step-specific labels:
      - `Open details step` / `Collapse details step`
      - `Open verification step` / `Collapse verification step`
      - `Open community step` / `Collapse community step`
  - `frontend/src/pages/WelcomePage.tsx`
    - changed the route headline copy to be more action-truthful:
      - `Continue your invitation.` -> `Open your invitation path.`
      - `Continue creating your community.` -> `Open your community setup.`
      - `Complete your activation.` -> `Open your activation path.`
      - `Sign in to continue.` -> `Open sign in.`
    - clarified related subtext so the page now says more directly which live route opens next
- Verification:
  - `npm exec -- eslint src/pages/JoinEntryPage.tsx src/pages/CreateEntryPage.tsx src/pages/WelcomePage.tsx`
    -> passed
  - `npm run build`
    -> passed
- Routes impacted:
  - `/join`
  - `/join/:code`
  - `/join/community/:clanId`
  - `/create`
  - `/welcome`
- Frozen-area note:
  - `/app/dashboard` Market Wisdom remained untouched
- Shared logic impact:
  - no auth, backend, or route-contract behavior changed
  - this was a route-local pilot-readiness truth pass so the live entry chain reads more like a guided route system and less like a set of generic expand/collapse controls
### Finance and support chain handoffs made more route-truthful for pilot testing (2026-04-29)

- Continued the GMFN-only end-to-end pilot-readiness sweep on the live finance / loans / support chain so route handoffs now name their real destinations more consistently instead of mixing current-page nouns with action labels.
- Route-local updates:
  - `frontend/src/pages/FinancePage.tsx`
    - changed support-route labels to be more destination-truthful:
      - `Borrow / lend / support` -> `Open Loans & Support`
      - `Choose payment route` -> `Open Payment Rails`
      - `Set payout details` -> `Open Payout Details`
      - `Check expected payments` -> `Open Payment Reconciliation`
      - `Check loan readiness` -> `Open Loan Readiness`
      - `See what is waiting` -> `Open Action Inbox`
  - `frontend/src/pages/LoansPage.tsx`
    - changed route labels to name the next surface more explicitly:
      - `Check readiness` -> `Open Loan Readiness`
      - `Get suggestions` -> `Open Loan Suggestions`
      - `Open workbench` -> `Open Loan Workbench`
      - `Guarantor earnings` -> `Open Guarantor Earnings`
      - `See this in Finance` -> `Open Finance`
      - `See what is waiting` -> `Open Action Inbox`
  - `frontend/src/pages/LoanReadinessPage.tsx`
    - normalized the fallback CTA label from `Open Support Start Surface` to `Open Support Start Page` so it matches the same destination language used elsewhere in the chain
  - `frontend/src/pages/WithdrawalInstructionsPage.tsx`
    - changed live support/finance action labels to be explicit route openings:
      - `Loan Readiness` -> `Open Loan Readiness`
      - `Loan Suggestions` -> `Open Loan Suggestions`
      - `Loan Workbench` -> `Open Loan Workbench`
      - `Payout Details` -> `Open Payout Details`
      - `Finance` -> `Open Finance`
      - `Payment Rails` -> `Open Payment Rails`
      - `Loans` -> `Open Loans & Support`
- Verification:
  - `npm exec -- eslint src/pages/FinancePage.tsx src/pages/LoansPage.tsx src/pages/LoanReadinessPage.tsx src/pages/WithdrawalInstructionsPage.tsx`
    -> passed with one pre-existing warning in `WithdrawalInstructionsPage.tsx`:
       `react-hooks/exhaustive-deps` on `loadPage`
  - `npm run build`
    -> passed
- Routes impacted:
  - `/app/finance`
  - `/app/loans`
  - `/app/loan-readiness`
  - `/app/withdrawal-instructions`
- Frozen-area note:
  - `/app/dashboard` Market Wisdom remained untouched
- Shared logic impact:
  - no auth, backend, or route-contract behavior changed
  - this was a route-local pilot-readiness truth pass so the live finance/support chain says more plainly which screen each action opens next
### Final live-route pilot preflight tweaks completed after end-to-end audit (2026-04-29)

- Finished the GMFN-only end-to-end pilot-readiness audit across the live entry, join, activation, and finance/support chains, then closed the last route-local wording gaps that still made some surfaces feel more generic than their real destination.
- Route-local updates:
  - `frontend/src/pages/LoanSuggestionsPage.tsx`
    - changed the fallback CTA from `Start Support Request` to `Open Support Start Page` so the support-chain language stays consistent with Loan Readiness and Loan Workbench
  - `frontend/src/pages/JoinRequestPendingPage.tsx`
    - changed `Check approval status` to `Open approval status`
    - changed `Welcome` to `Open Welcome`
  - `frontend/src/pages/LoginPage.tsx`
    - changed the sign-in guide step heading from `Continue safely` to `Use activation first if needed`
  - `frontend/src/pages/CreateEntryPage.tsx`
    - changed existing-member route guidance to `Open sign in` / `Open sign in instead`
    - changed generic helper toggles to route-specific labels such as `Open sign-in help`
  - `frontend/src/pages/WelcomePage.tsx`
    - changed general route CTAs and headlines to more route-truthful language like `Open sign in`, `Open create path`, `Open join path`, and `Open your invitation path`
  - `frontend/src/pages/MemberActivationPage.tsx`
    - changed the submit CTA to `Finish activation`
    - changed post-activation destination labels to `Open Trust Passport` and `Open Action Inbox`
  - `frontend/src/pages/FinancePage.tsx`
    - changed several route labels to explicit destination language such as `Open Loans & Support`, `Open Payment Rails`, `Open Payout Details`, `Open Payment Reconciliation`, `Open Loan Readiness`, and `Open Action Inbox`
  - `frontend/src/pages/LoansPage.tsx`
    - changed support-route labels to destination-truthful names such as `Open Loan Readiness`, `Open Loan Suggestions`, `Open Loan Workbench`, `Open Guarantor Earnings`, `Open Finance`, and `Open Action Inbox`
  - `frontend/src/pages/LoanReadinessPage.tsx`
    - normalized the fallback CTA to `Open Support Start Page`
  - `frontend/src/pages/WithdrawalInstructionsPage.tsx`
    - changed follow-through actions to explicit route openings like `Open Finance`, `Open Loan Readiness`, `Open Loan Suggestions`, `Open Loan Workbench`, `Open Payment Rails`, `Open Payout Details`, and `Open Loans & Support`
  - `frontend/src/pages/NotificationsPage.tsx`
    - normalized live CTA labels so focus-commitment links show `Open Focus Commitments` and guide links show `Open My GSN and I`
- Verification:
  - `npm exec -- eslint src/pages/LoanSuggestionsPage.tsx src/pages/JoinRequestPendingPage.tsx`
    -> passed with one pre-existing warning in `LoanSuggestionsPage.tsx`:
       `react-hooks/exhaustive-deps` on `loadSuggestionsForLoan`
  - earlier in the same audit chain, all other touched live-route files also passed targeted eslint with only the previously known hook warnings
  - `npm run build`
    -> passed after each batch and after this final pass
- Routes impacted across the final audit:
  - `/cover`
  - `/welcome`
  - `/create`
  - `/login`
  - `/join`
  - `/join/:code`
  - `/join/community/:clanId`
  - `/join-by-invite/:code`
  - `/join-approval/:requestId`
  - `/pending-approval`
  - `/join-request/pending`
  - `/activate-membership`
  - `/app/notifications`
  - `/app/trust`
  - `/app/finance`
  - `/app/loans`
  - `/app/loan-readiness`
  - `/app/withdrawal-instructions`
- Frozen-area note:
  - `/app/dashboard` Market Wisdom remained untouched
- Shared logic impact:
  - no auth, backend, or route-contract behavior changed
  - this work stayed route-local and focused on pilot-facing route truth / continuity only

### Entry cover-to-welcome bridge polish (2026-05-03)

- Continued the public entry flow polish after `/cover` and `/guide` were updated and pushed in commit `8e6dfe2`.
- Important product-owner instruction:
  - Treat `/cover` as visually frozen unless the owner explicitly asks to change the visual design again.
  - The change below only corrected the route bridge from the frozen cover.
- Route/link changes:
  - `frontend/src/pages/CoverPage.tsx`
    - changed the general `Continue` destination from `/create` to `/welcome`.
    - create/invite/approved/existing mode destinations remain `/create`, `/join`, `/activate-membership`, and `/login`.
- UI/content changes:
  - `frontend/src/pages/WelcomePage.tsx`
    - strengthened the two-card welcome choice screen around `Existing member / Sign in` and `New member / Sign up`.
    - added icon-led institutional cards for the owner-requested low-literacy visual cues.
    - preserved the explicit activation note so approved users still have a visible route to activation.
    - refined the second step into clear `Start community` and `Join community` choices.
  - `frontend/src/pages/LoginPage.tsx`
    - aligned the sign-in bridge more closely with the owner screenshots: `Welcome back`, badge presence, icon-led inputs, `Continue`, sign-in help, start-new-community link, protected-data trust block, and activation fallback.
    - kept the password field because the live sign-in implementation still requires email/password.
- Verification:
  - `npm exec -- eslint src/pages/CoverPage.tsx src/pages/WelcomePage.tsx src/pages/LoginPage.tsx`
    -> passed
  - `npm run build`
    -> passed
  - `http://192.168.1.38:5174/welcome`
    -> returned `200`
  - `http://192.168.1.38:5174/login?force=1`
    -> returned `200`
- Routes impacted:
  - `/cover`
  - `/welcome`
  - `/login`
  - existing links onward to `/create`, `/join`, `/activate-membership`, and `/guide`
- Current caveat:
  - there are still unrelated pre-existing dirty files/logs in the worktree, especially `frontend/src/pages/DashboardPage.tsx` and generated/local log files. Do not revert them without owner approval.

### Welcome page simplification follow-up (2026-05-03)

- Owner feedback: `/welcome` should be a clean decision gate, not a guide page.
- Updated `frontend/src/pages/WelcomePage.tsx`:
  - removed the visible `GSN and I` launcher from the welcome header
  - removed the hidden welcome-page guide panel/content from source
  - removed the `After registration, approval, or activation...` info block from the normal choice screen
  - removed the bottom `One Clear Next Step` / `Open full GSN guide` block
- Verification:
  - `npm exec -- eslint src/pages/WelcomePage.tsx`
    -> passed
  - `npm run build`
    -> passed
  - `http://192.168.1.38:5174/welcome`
    -> returned `200`
- Scope:
  - `/welcome` only
  - no auth, backend, or route-contract changes

### Cover `My GSN and I` wording and return flow (2026-05-03)

- Owner correction: the cover secondary action is not a "guide" yet; it is `My GSN and I`, meaning the public reader should understand what GSN can do before entering the protocol.
- Updated `frontend/src/pages/CoverPage.tsx`:
  - changed `Read the full guide first` to `Read My GSN and I`
  - when opening `/guide`, passes a `returnTo` route state back to the current cover URL
- Updated `frontend/src/pages/MyGMFNAndIPage.tsx` public `/guide` mode:
  - changed the public page framing to `My GSN and I`
  - changed the headline to `22 things GSN can do for you`
  - added top `Close` and `Continue` actions
  - added bottom `Collapse` and `Continue` actions
  - close/collapse/continue return to the cover URL that opened the page, falling back to `/cover`
- Verification:
  - `npm exec -- eslint src/pages/CoverPage.tsx src/pages/MyGMFNAndIPage.tsx`
    -> passed
  - `npm run build`
    -> passed
  - `http://192.168.1.38:5174/cover`
    -> returned `200`
  - `http://192.168.1.38:5174/guide`
    -> returned `200`
- Scope:
  - `/cover`
  - `/guide`
  - no backend/auth/schema changes

### Dashboard guide removal and preferred arrangement polish (2026-05-03)

- Owner instruction: delete the dashboard guide/primer and polish toward the supplied dashboard arrangement screenshot.
- Removed the expandable `/app/dashboard` primer titled `What you will find`.
- Removed the dashboard-only helper data and styling function added for that primer.
- Removed the visible generic dashboard guide/search surface and long `How Dashboard Helps You` explainer from the dashboard top.
- Added a clean top arrangement:
  - `Main Movement / Dashboard` header with Menu and Attention Guide controls
  - `Identity Passport` card with `Trust is the first currency`, profile image, GSN ID, trust/CCI/TrustSlip status, and `View Identity`
  - simple `What do you want to do next?` action row, now acting as the main launcher instead of duplicating the old Regular Apps block
  - four visible actions: Marketplace, Create Demand, Spotlight, Trust Events
  - a `+ More` / `Close` expansion for Community, Shop, What Matters Now, and My Identity
  - symbolic emoji/sign badges for the launcher actions so low-literacy users can scan the options faster without depending only on text
- Reordered dashboard grid presentation to match the preferred flow:
  - Spotlight before What Matters Now
  - What Matters Now before Demand Box
  - Market Wisdom and Focus Commitments below the primary launcher/spotlight/action surfaces
- Hid the separate Regular Apps block because the main launcher now serves that purpose.
- On phone, compacted the right-side top control to `Tools` so it stops crowding the `Dashboard` heading.
- Market Wisdom internals were not changed; only its dashboard grid placement was pushed lower in the visual order.
- Follow-up polish:
  - extended the emoji/sign-language treatment beyond the main launcher into dashboard section headers and key detail labels.
  - changed visible dashboard copy toward direct user-addressed language, such as `Your Marketplace`, `Your Spotlight`, `Your Demand Box`, `Your alerts`, and `Your Focus Commitments`.
  - changed generic notification language to user-facing alert language where it appears on `/app/dashboard`.
  - did not debug Spotlight data/media behavior yet; this pass only made the dashboard language and visual signals clearer before the requested Spotlight investigation.
- Important caveat:
  - `DashboardPage.tsx` still has pre-existing local dirty changes unrelated to this removal, including UI storage key/default collapse behavior and disabled attention auto-open. Do not revert them without owner approval.
- Verification:
  - `npm exec -- eslint src/pages/DashboardPage.tsx`
    -> passed
  - `npm run build`
    -> passed
- Scope:
  - `/app/dashboard`
  - no backend/auth/schema changes

### Dashboard passport/logo compact polish (2026-05-03)

- Owner feedback from phone screenshots:
  - the dashboard had a duplicated `Menu / Main Movement / Dashboard / Tools` header row.
  - `Your Identity Passport` should be tighter, clearer, and less wordy.
  - the visible shield mark should match the cleaner cover-page brand mark and stop carrying the old internal lattice.
  - demand empty-state language should not name one marketplace because a user may belong to more than one community or marketplace.
- Updated shared frontend brand marks:
  - `frontend/src/components/GSNBrandMark.tsx`
  - `frontend/src/components/GSNBrandMonument.tsx`
  - removed the old internal lattice/node artwork from the shield SVG so shared mark usage aligns with the cleaner cover-page direction.
  - no database logo row was changed; inspected logo usage here is frontend SVG/component driven.
- Updated `frontend/src/pages/DashboardPage.tsx`:
  - removed the duplicate inner dashboard header row.
  - changed `Your Identity Passport` to `Identity Passport`.
  - removed the extra section emoji beside the identity title.
  - compacted/centered the identity image area and GSN ID row.
  - removed the `View Identity` button from the identity passport card.
  - generalized Demand Box empty-state copy so it tells the user to choose the community or marketplace when creating demand.
  - changed the empty demand action to `Create your demand`.
  - removed empty-state community/GSN ID chips from the Demand Box explanation.
  - strengthened alert chips with clear emoji/status signals for act-now, unread, waiting, and clear states.
- Verification:
  - `npm exec -- eslint src/pages/DashboardPage.tsx src/components/GSNBrandMark.tsx src/components/GSNBrandMonument.tsx`
    -> passed
  - `npm run build`
    -> passed
- Important caveat:
  - `DashboardPage.tsx` still has pre-existing local dirty UI-state changes unrelated to this task: storage key v5, default collapsed dashboard sections, and disabled attention auto-open. Do not commit or revert them unless the owner asks.
- Scope:
  - `/app/dashboard`
  - shared GSN SVG mark components
  - no backend/auth/schema/database changes

### Dashboard accordion-row follow-up (2026-05-03)

- Owner feedback: the dashboard action and attention blocks should match the supplied phone reference more closely, with compact one-line rows that expand only when tapped.
- Updated `frontend/src/pages/DashboardPage.tsx`:
  - changed `What do you want to do next?` from an always-open button grid into a compact accordion row.
  - the row now shows an icon, short user-facing description, and a chevron; tapping opens the action buttons.
  - moved the primary and secondary dashboard action buttons behind that expanded state so the collapsed dashboard is calmer on phone.
  - changed `What needs your attention` into the same accordion-row pattern, with a bell icon, alert summary, status chip, and rotating chevron.
  - the detailed alert card now appears only when the attention row is expanded.
  - added a section signal for `What do you want to do next?`.
- Verification:
  - `npm exec -- eslint src/pages/DashboardPage.tsx`
    -> passed
  - `npm run build`
    -> passed
- Important caveat:
  - `DashboardPage.tsx` still has older local dirty UI-state edits in the worktree; when committing, stage only the accordion-related state reset/hunks needed for this change.
- Scope:
  - `/app/dashboard`
  - no backend/auth/schema changes
