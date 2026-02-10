from fastapi import FastAPI

from app.api.router import api_router
from app.db.database import Base, engine

# IMPORTANT: ensure models are imported so SQLAlchemy sees them
import app.db.models  # noqa: F401


app = FastAPI(title="GMFN MVP API")
app.include_router(api_router)


# NOTE (MVP only):
# This creates tables automatically at startup.
# In production you should rely on Alembic migrations instead.
@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
