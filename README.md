# GMFN MVP

## Session continuity

To resume work quickly after a chat reset or a new session, read
`docs/HANDOFF_NOTES.md` after the core project docs. It tracks the latest
active workstream, exact routes/screens in play, confirmed facts from code, and
the next recommended step.

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
