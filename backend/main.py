from fastapi import FastAPI
from app.api.router import api_router
from app.core.logging import setup_logging

def create_app() -> FastAPI:
    setup_logging()
    app = FastAPI(title="GMFN MVP API", version="1.0.0")
    app.include_router(api_router)
    return app

app = create_app()
