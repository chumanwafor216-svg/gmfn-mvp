from fastapi import APIRouter

router = APIRouter(prefix="/trust-slips", tags=["trust-slips"])

@router.get("/ping")
def ping():
    return {"ok": True, "message": "Trust slips placeholder"} 