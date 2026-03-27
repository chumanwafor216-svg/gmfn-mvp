from fastapi import APIRouter

from app.services.daily_insight_service import get_daily_market_wisdom

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/daily-insight")
def daily_insight():
    return get_daily_market_wisdom()