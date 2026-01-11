from fastapi import APIRouter
from app.api.routes.health import router as health_router
from app.api.routes.loans import router as loans_router
from app.api.routes.auth import router as auth_router
from app.api.routes.clans import router as clans_router

api_router = APIRouter()

api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router)
api_router.include_router(loans_router)  
api_router.include_router(clans_router)
from app.routers import loans

api_router.include_router(loans.router, tags=["loans"])
