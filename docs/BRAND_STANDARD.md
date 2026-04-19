# BRAND_STANDARD.md

## Purpose
This file defines the current frontend branding baseline for the user-facing
GSN product surface.

Corporate context and surface branding are not the same thing:
- **GSN** (`Global Support Network`) is the default user-facing brand for
  screens, labels, helper text, and branded UX surfaces.
- **GMFN** (`Global Mutual Funds Network`) is the wider corporate / owner
  context and should not replace GSN on visible user-facing surfaces unless the
  product owner explicitly asks for that exception.

The primary visual reference for the institutional brand direction is the
`GSN summary` treatment inside `frontend/src/pages/WelcomePage.tsx`.

`frontend/src/pages/MyGMFNAndIPage.tsx` remains a useful reference for content
structure and page discipline, but it is not the only mood-board source.

The goal is not decorative restyling. The goal is a consistent, trusted,
institution-grade visual language that can be rolled through pages without
introducing new one-off palettes.

## Source of truth in code
- Shared brand tokens: `frontend/src/styles/gmfnBrand.ts`
- Workspace shell bridge: `frontend/src/components/WorkspaceSettingsBridge.tsx`
- Entry reference screen: `frontend/src/pages/WelcomePage.tsx`
- Current dashboard rollout target: `frontend/src/pages/DashboardPage.tsx`

## Brand baseline
- Primary hero gradient:
  `linear-gradient(180deg, #10243A 0%, #173654 52%, #26527C 100%)`
- Raised blue inner gradient:
  `linear-gradient(180deg, #163552 0%, #2A5B84 100%)`
- Workspace page wash:
  light blue-white institutional wash based on `#EEF4FA` and `#F8FBFF`
- Primary action blue: `#1D4ED8`
- Primary text ink: `#0B1F33`
- Secondary text: `#5F7287`
- Label text: `#5D7389`
- Default panel: `#FFFFFF`
- Soft panel: `#F8FBFF`

## Layout language
- Use blue-gradient hero sections for the most important top-of-page orientation
  blocks only.
- When a page needs a premium institutional hero, prefer the Welcome summary
  pattern:
  blue field outside, lighter summary panel inside, clear dark text, restrained
  gold accents, and glass-like depth rather than heavy dark stacking.
- Use white primary cards and light-blue secondary cards for the main reading
  surfaces.
- Prefer calm spacing, strong headings, and restrained contrast rather than
  noisy decoration.
- Keep actions clearly tiered:
  primary blue button, white secondary button, light-blue soft button.

## Rollout rule
- New or revised pages should use the shared brand tokens/helpers before adding
  fresh hard-coded colors.
- Existing pages should be migrated page-by-page, not through unsafe bulk
  rewrites.
- When a page needs a special accent, keep the GSN institutional blue system as
  the base layer and add accents sparingly.

## Current scope
This standard is now wired into:
- the workspace shell baseline
- `MyGMFNAndIPage`
- the first branded dashboard pass
- `SystemPictureFrame`
- route loading fallback

Further page-level rollout should continue from this shared token file instead
of inventing new palette copies.
