\# GMFN MVP



\## Backend



The backend is built with \*\*FastAPI\*\*, \*\*SQLAlchemy\*\*, and \*\*Alembic\*\*.



\### Running backend tests locally



```bash

cd gmfn\_backend

python -m venv .venv

.venv\\Scripts\\activate   # Windows

pip install -r requirements.txt

pip install -r requirements-dev.txt

python -m pytest -q tests



