# app/api/routes/health.py
from fastapi import APIRouter

router = APIRouter(tags=["default"])


@router.get("/health", response_model=None)
def health():
    return {"status": "ok"} 
