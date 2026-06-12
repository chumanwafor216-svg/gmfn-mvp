# GMFN MVP

## Session continuity

To resume work quickly after a chat reset or a new session, read
`docs/HANDOFF_NOTES.md` after the core project docs. It tracks the latest
active workstream, exact routes/screens in play, confirmed facts from code, and
the next recommended step.

For route-purpose or architecture work, also read
`docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`.
It is the current authoritative skeleton for how Community Home, Marketplace,
Shop Gallery, Finance, Trust Passport, TrustSlip, CCI, Dashboard, and Admin fit
together.

For mobile UI density, screenshot readiness, lane collapse, and action-surface
work, also read `docs/GSN_MOBILE_UI_PROTOCOL.md`.

For production polish, icon meaning, screenshot-quality, proof-document
presentation, and route completion gates, also read
`docs/GSN_PRODUCTION_POLISH_STANDARD.md`.

For app-wide page auditing, including entry-to-dashboard checks, in-page
navigation, action response, placeholder truth, permission visibility, and
domain-by-domain cage rules, also read `docs/APP_WIDE_AUDIT_PROTOCOL.md`.

For innovation-case, investor, policy, TrustSlip, merchant-verification, or
development-finance explanation work, also read
`docs/INNOVATION_POLICY_LOGIC_2026-04-20.md`.

## Backend

The backend is built with **FastAPI**, **SQLAlchemy**, and **Alembic**.

### Running backend tests locally

```bash
cd gmfn_backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
pip install -r requirements-dev.txt
python -m pytest -q tests
```
