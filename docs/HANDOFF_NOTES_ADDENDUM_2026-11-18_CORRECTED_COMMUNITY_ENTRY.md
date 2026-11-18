# Handoff addendum: corrected community entry

Date: 2026-11-18

## Completed

- Added explicit opt-in community discovery and a dedicated search-based join-request path.
- Kept every invite-code route on `JoinEntryPage` and confirmed the existing invitation smoke still passes.
- Added independent search admission settings; invitation instant admission does not imply instant search admission.
- Added immutable request source and admission snapshots.
- Preserved stored legacy standalone admin approval, while blocking new transitions into that legacy configuration.
- Added identity-first founder onboarding with activation before community setup and idempotent community creation.
- Added Pixel 5 browser coverage and focused backend security/concurrency coverage.

## Primary files

- `gmfn_backend/alembic/versions/20261118_corrected_community_entry.py`
- `gmfn_backend/app/api/routes/clans.py`
- `gmfn_backend/app/api/routes/entry.py`
- `gmfn_backend/app/api/routes/auth.py`
- `gmfn_backend/app/db/models.py`
- `gmfn_backend/tests/test_corrected_community_entry.py`
- `frontend/src/pages/FindCommunityJoinPage.tsx`
- `frontend/src/pages/IdentityFirstCreateCommunityPage.tsx`
- `frontend/src/components/CommunityEntryShell.tsx`
- `frontend/tools/smoke-corrected-community-entry-pixel.mjs`
- `docs/GSN_CORRECTED_COMMUNITY_ENTRY_IMPLEMENTATION_2026-11-18.md`

## Validation

- Focused backend suite: 29 passed, including search privacy, instant and reviewed outcomes, identity reuse, protected continuation replay, final-decision locking, stable-ID selection, and authorized/unauthorized override-audit cases.
- Frontend production build: passed.
- Corrected Pixel 5 smoke: passed.
- Existing invitation journey smoke: passed.
- Membership admission audit: passed.
- Entry-flow audit: passed.

## Not done

- This addendum is included in the scoped local release-candidate commit. No push, `main` promotion, GitHub Actions verification, migration application, or Render deployment was performed.
- The working tree already contained unrelated tracked and untracked changes. Stage only the files listed in the implementation report before publishing.
- The in-memory public rate limiter remains a per-process pilot limitation.
- PostgreSQL concurrency execution remains blocked: no disposable URL is configured, the installed Docker engine would not start, and CI has no PostgreSQL service. The targeted independent-connection test is present but skipped until that capability exists.
- Exposed-session invalidation and production backup preparation are not completed.

## Release preparation update

- Added explicit assertions that pending reviewed applicants have no GSN ID and no active membership; the internal PENDING_APPROVAL user row is not account activation.
- Added and passed a representative legacy-community and pending-request migration upgrade and downgrade rehearsal.
- Manually reviewed the three existing Pixel images, added only the missing search-results state, reran the Pixel smoke, and manually accepted all four states.
- Confirmed current Render topology: one gmfn-api instance, one Uvicorn worker, auto deploy off, PostgreSQL 18.
- Confirmed /create has no rollout gate and will be generally available; community search remains independently opt-in and the first pilot stays vote-only with admin override off.
- Full release-preparation truth is in docs/GSN_CORRECTED_COMMUNITY_ENTRY_RELEASE_CANDIDATE_2026-11-18.md.
