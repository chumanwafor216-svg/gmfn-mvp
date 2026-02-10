from fastapi import APIRouter

# Create the API router FIRST (must exist at import time)
api_router = APIRouter()

# Core
from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router

# Clans / Invites / Share
from app.api.routes.clans import router as clans_router
from app.api.routes.invites import router as invites_router
from app.api.routes.share import router as share_router

# Loans
from app.api.routes.loans import router as loans_router
from app.api.routes.loans_bulk import router as loans_bulk_router

# Trust
from app.api.routes.trust_events import router as trust_events_router
from app.api.routes.trust import router as trust_router
from app.api.routes.trust_score import router as trust_score_router
from app.api.routes.trust_slips import router as trust_slips_router

# Exposure / Reports / Analytics
from app.api.routes.exposure import router as exposure_router
from app.api.routes.exposure_admin import router as exposure_admin_router
from app.api.routes.reports import router as reports_router
from app.api.routes.analytics import router as analytics_router

# Admin
from app.api.routes.admin_trust_events import router as admin_trust_events_router


# Include routers
api_router.include_router(health_router)
api_router.include_router(auth_router)

api_router.include_router(clans_router)
api_router.include_router(invites_router)
api_router.include_router(share_router)

api_router.include_router(loans_router)
api_router.include_router(loans_bulk_router)

api_router.include_router(trust_events_router)
api_router.include_router(trust_router)
api_router.include_router(trust_score_router)
api_router.include_router(trust_slips_router)

api_router.include_router(exposure_router)
api_router.include_router(exposure_admin_router)
api_router.include_router(reports_router)
api_router.include_router(analytics_router)

api_router.include_router(admin_trust_events_router)
