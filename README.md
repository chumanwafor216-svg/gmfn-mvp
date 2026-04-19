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
