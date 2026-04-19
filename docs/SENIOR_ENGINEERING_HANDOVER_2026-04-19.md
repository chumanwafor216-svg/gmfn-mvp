# Senior Engineering Handover

## Date
2026-04-19

## Why this handover exists
This handover is for a fresh senior backend/frontend engineer to take over a
stabilization and recovery pass that has become too cross-cutting for more
incremental chat-driven patching.

The immediate need is not feature invention. The immediate need is to recover a
stable, understandable, publishable route structure and interaction model across
dashboard, community, marketplace, and related mobile shell behavior.

## Read order for the next engineer
Read these in this order before changing code:

1. `README.md`
2. `AGENTS.md`
3. `docs/PROJECT_PROTOCOL.md`
4. `docs/FREEZE_POLICY.md`
5. `docs/HANDOFF_NOTES.md`
6. this file

Then inspect the current code in:

- `frontend/src/layout/AppLayout.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/pages/MarketplacePage.tsx`
- `frontend/src/lib/dashboardAttentionEngine.ts`
- `frontend/src/components/ExplainToggle.tsx`
- `frontend/src/components/SpotlightMediaFrame.tsx`
- `frontend/src/pages/ThemeSettingsPage.tsx`

## Product intent we were trying to protect

### Brand
- User-facing surface brand should be `GSN`
- `GMFN` / `GMFM` still refer to the same product/corporate system in code and
  documentation, but visible product surfaces should default to `GSN` unless
  explicitly directed otherwise

### Route intent
- `Community Home` should be the command centre for community context
- `Marketplace` should be the commerce/support continuation layer, not a second
  community command centre
- `Dashboard` should be a compact, reliable member workspace, not a giant hero
  page
- `Trust Passport` / trust surfaces should carry the deeper trust explainer
- settings should live in one authoritative surface, not multiple competing UIs

### User-level goal
The app should feel understandable to ordinary users, including unbanked or
underbanked users. It should reduce reading clutter, remove builder-facing
language, and explain only what helps users act.

## What we were trying to achieve
The workstream aimed to:

1. brand the dashboard and related core routes to a more institutional GSN
   standard
2. reduce clutter, oversized surfaces, and repeated helper language
3. improve mobile behavior
4. make dashboard guidance more useful and more plain-language
5. stabilize route/button behavior so taps land where users expect
6. restore a clearer separation between:
   - Dashboard
   - Community Home
   - Marketplace
   - Trust Passport
   - Settings

## What happened
The dashboard and surrounding routes accumulated multiple overlapping layers:

- large spotlight/media surfaces
- popup guidance
- trust explainer surfaces
- repeated `What this does` helper blocks
- fixed mobile shell navigation above route content
- mixed routing patterns using:
  - `OriginLink`
  - explicit `navigateWithOrigin(...)`
  - local UI-state toggles
  - buttons nested inside interactive cards

Over time this led to three kinds of problems:

1. **surface drift**
   - pages began doing too many overlapping jobs
   - Community Home and Marketplace started to feel like duplicate command
     centres

2. **interaction fragility**
   - buttons and chips sometimes appeared to route to the wrong place
   - especially on mobile-sized usage

3. **guidance overload**
   - too many helper/explainer blocks on too many routes
   - user-facing surfaces began to sound like builder notes or training copy

## Current committed baseline
Latest committed checkpoints before the current working tree:

- `c4ee2ee` — `Remove tracked marketplace upload artifacts`
- `11cca69` — `Ignore runtime artifacts and clean generated repo noise`
- `0c2e1b4` — `Stabilize dashboard interactions and polish GSN workspace`

Treat `c4ee2ee` as the latest clean committed base.

## Current uncommitted working tree
At the time of handover, these files are modified and not committed:

- `docs/HANDOFF_NOTES.md`
- `frontend/src/components/ExplainToggle.tsx`
- `frontend/src/components/SpotlightMediaFrame.tsx`
- `frontend/src/layout/AppLayout.tsx`
- `frontend/src/lib/dashboardAttentionEngine.ts`
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/MarketplacePage.tsx`
- `frontend/src/pages/ThemeSettingsPage.tsx`

These are the active recovery files.

## What was changed in the active recovery worktree

### 1. Dashboard / spotlight / attention recovery
Files:
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/lib/dashboardAttentionEngine.ts`
- `frontend/src/components/SpotlightMediaFrame.tsx`

Confirmed changes:
- spotlight frame was reduced repeatedly to be much shorter
- dashboard attention timing was calmed more than once
- dashboard spotlight media fallback was hardened
- dashboard CTA behavior was partially migrated toward explicit button routing
- helper layers and popup behavior were trimmed repeatedly

Confirmed live-data action:
- the active spotlight broadcast had pointed to a missing image file
- the spotlight feed was restored with a newer uploaded image through real
  backend broadcast routes
- this was a data-level recovery, not a schema change

### 2. Community / Marketplace route recovery
Files:
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/pages/MarketplacePage.tsx`

Confirmed changes:
- Community Home was pushed back toward a command-centre role
- Marketplace was trimmed back toward commerce/support continuation
- overlapping marketplace tool surfaces were reduced
- community role visibility on Community Home was restored

### 3. Settings split recovery
File:
- `frontend/src/pages/ThemeSettingsPage.tsx`

Confirmed change:
- the stale standalone Theme Settings page was replaced with a redirect to the
  real active settings surface:
  `/app/my-gmfn-and-i?tab=settings`

### 4. Global explain-helper rollback
File:
- `frontend/src/components/ExplainToggle.tsx`

Confirmed change:
- all `ExplainToggle` surfaces are currently disabled globally through one
  shared constant
- this was done intentionally to remove noise without destructive deletion

### 5. Mobile shell recovery attempt
File:
- `frontend/src/layout/AppLayout.tsx`

Confirmed change:
- the mobile bottom nav was moved away from fixed overlay behavior toward layout
  flow/sticky behavior
- the main mobile content bottom padding was reduced accordingly

## What is confirmed vs what is still only suspected

### Confirmed facts
- Settings already had one real active path:
  `/app/my-gmfn-and-i?tab=settings`
- `ThemeSettingsPage.tsx` was stale and disconnected from actual route flow
- `ExplainToggle` had spread across many pages and added significant visible
  helper noise
- the spotlight missing-image problem was partly a real missing file problem,
  not only a rendering bug
- `Community Home` and `Marketplace` had drifted into overlapping surface roles
- the mobile shell previously used fixed bottom navigation above route content

### Strong suspicions, not yet fully proven
- button misrouting is still being caused by a combination of:
  - interactive cards wrapping smaller controls
  - nested routing surfaces
  - shared `OriginLink` usage inside dense blocks
  - residual shell/content overlap behavior on mobile
- the issue is likely not one single bug but one unstable interaction pattern
  repeated across several surfaces
- repeated dashboard work may have increased fragility because the route
  collected too many overlapping concerns

## What the next engineer should NOT do first
Do not start with:

- more branding polish
- more dashboard copy rewriting
- page-by-page random button tweaks
- deleting large chunks without tracing route purpose first
- assuming the remaining problem is only in `DashboardPage.tsx`

## What the next engineer should do first

### Phase 1: root-cause interaction audit
Start from the shared interaction model, not page cosmetics.

Inspect:
- `frontend/src/layout/AppLayout.tsx`
- `frontend/src/components/OriginLink.tsx`
- any cards or blocks with nested links/buttons on:
  - Dashboard
  - Community Home
  - Marketplace
  - Demand Box

Goal:
- determine whether misrouting comes from:
  - event propagation
  - nested interactive surfaces
  - shell overlay/layout overlap
  - routing helper inconsistency

### Phase 2: route-purpose audit
Confirm route roles again from code:
- Community Home
- Marketplace
- Shop Gallery
- Finance
- Money In
- Money Out
- Settings

Goal:
- make sure each route has one clear primary purpose
- remove duplicated command-centre/admin/tool behavior from the wrong routes

### Phase 3: reintroduce guidance selectively
Only after interaction stability is recovered:
- decide whether `ExplainToggle` should come back at all
- if it returns, restore only the minimum genuinely useful cases
- do not globally re-enable everything at once

### Phase 4: freeze checkpoint
Once the routes feel stable again:
- commit the recovery work
- freeze that checkpoint before more design changes

## Suggested verification checklist
Use a mobile-sized viewport first.

Check these routes:
- `/app/dashboard`
- `/app/community`
- `/app/marketplace`
- `/app/demand-box`
- `/app/my-gmfn-and-i?tab=settings`

Check these behaviors:
- lower-page buttons near the bottom of the screen
- spotlight controls
- demand-related CTAs
- community-to-marketplace movement
- settings entry from shell navigation
- whether popup guidance reappears too aggressively

## Commands used successfully during the current recovery
- `npm run build` in `frontend`
- `git status --short`
- `git diff --stat`
- `git log --oneline -n 8`

## Recommendation to the next engineer
Treat this as a **stabilization and route-recovery job**, not a UI polishing
job.

The best outcome is not “make the dashboard prettier.”  
The best outcome is:

- reliable button behavior
- one clear purpose per core route
- reduced duplicated UI layers
- a stable base that can then be branded and refined safely

## Expected handback
The next engineer should hand back:

1. a root-cause summary
2. exact files changed
3. exact routes/screens affected
4. what was fixed at shared level vs route-local level
5. what remains risky
6. a recommendation for the next freeze point
