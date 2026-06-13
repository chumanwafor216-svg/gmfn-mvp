# app/api/routes/courier_confirm.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.shipment import CourierConfirmIn
from app.services.courier_token_service import verify_courier_token
from app.services.trust_events_services import log_trust_event
from app.db.models import TrustEvent

router = APIRouter(prefix="/courier", tags=["courier"])

COURIER_STAGES = {"received", "in_transit", "delivered"}


def _already_confirmed(db: Session, *, loan_id: int, borrower_user_id: int, stage: str) -> bool:
    et = f"courier.{stage}"
    q = (
        db.query(TrustEvent)
        .filter(TrustEvent.loan_id == int(loan_id))
        .filter(TrustEvent.subject_user_id == int(borrower_user_id))
        .filter(TrustEvent.event_type == et)
    )
    return db.query(q.exists()).scalar() is True


@router.get("/confirm-ui/{token}", response_class=HTMLResponse)
def courier_confirm_ui(token: str):
    """
    No-login courier UI. Minimal, WhatsApp-friendly.
    """
    html = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Courier Confirmation</title>
  <style>
    body {{
      margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      background: linear-gradient(180deg, #e0f2fe 0%, #fff7ed 45%, #f0fdf4 100%);
      color:#0f172a;
    }}
    .wrap {{ max-width: 720px; margin:0 auto; padding:18px; }}
    .card {{
      background: rgba(255,255,255,0.9);
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 14px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.06);
    }}
    h2 {{ margin:0; }}
    .sub {{ margin-top:6px; color:#64748b; font-size:13px; line-height:1.4; }}
    .grid {{ margin-top:12px; display:grid; gap:10px; }}
    button {{
      padding: 12px; border-radius: 12px; border: 1px solid #e5e7eb;
      background: white; font-weight: 900; cursor: pointer;
    }}
    textarea,input {{
      width:100%; padding:10px; border-radius:12px; border:1px solid #e5e7eb;
    }}
    .note {{ font-size:12px; color:#64748b; margin-top:10px; line-height:1.4; }}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h2>Courier update</h2>
      <div class="sub">
        Please confirm the shipment status. This is a self-reported acknowledgment, not a delivery guarantee.
      </div>

      <div class="grid">
        <input id="carrier" placeholder="Carrier name (optional) e.g. GIG / DHL" />
        <input id="tracking" placeholder="Tracking / Waybill no (optional)" />
        <textarea id="note" rows="3" placeholder="Optional note (e.g. received at depot)"></textarea>

        <button onclick="sendStage('received')">Goods received</button>
        <button onclick="sendStage('in_transit')">Now in transit</button>
        <button onclick="sendStage('delivered')">Delivered</button>

        <div class="note" id="msg"></div>
        <div class="note"><b>Disclaimer:</b> GSN records trade events for transparency. GSN does not guarantee courier performance.</div>
      </div>
    </div>
  </div>

<script>
async function sendStage(stage) {{
  const msg = document.getElementById("msg");
  msg.textContent = "Sending...";
  try {{
    const carrier_name = document.getElementById("carrier").value || null;
    const tracking_number = document.getElementById("tracking").value || null;
    const note = document.getElementById("note").value || null;

    const res = await fetch("/courier/confirm/" + encodeURIComponent("{token}"), {{
      method: "POST",
      headers: {{
        "Accept": "application/json",
        "Content-Type": "application/json"
      }},
      body: JSON.stringify({{ stage, carrier_name, tracking_number, note }})
    }});
    const text = await res.text();
    if (!res.ok) {{
      msg.textContent = text || "Failed.";
      return;
    }}
    msg.textContent = "Recorded ✅ Thank you.";
  }} catch (e) {{
    msg.textContent = "Error sending confirmation.";
  }}
}}
</script>
</body>
</html>
"""
    return HTMLResponse(content=html)


@router.post("/confirm/{token}")
def courier_confirm(
    token: str,
    payload: CourierConfirmIn,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Courier submits stage confirmation (no login).
    Logs TrustEvent courier.<stage> with meta + IP.
    """
    try:
        info = verify_courier_token(token)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired courier link.")

    stage = payload.stage
    if stage not in COURIER_STAGES:
        raise HTTPException(status_code=400, detail="Invalid stage.")

    loan_id = int(info["loan_id"])
    borrower_user_id = int(info["borrower_user_id"])
    jti = str(info["jti"])

    if _already_confirmed(db, loan_id=loan_id, borrower_user_id=borrower_user_id, stage=stage):
        return {"ok": True, "already_recorded": True, "stage": stage}

    ip = request.client.host if request.client else None

    log_trust_event(
        db,
        event_type=f"courier.{stage}",
        clan_id=0,
        loan_id=loan_id,
        guarantor_id=None,
        actor_user_id=0,  # anonymous courier
        subject_user_id=borrower_user_id,
        meta={
            "policy": "trust_constitution_v1",
            "trust_delta": "0.00",
            "reason": "courier_confirmation",
            "stage": stage,
            "carrier_name": payload.carrier_name,
            "tracking_number": payload.tracking_number,
            "note": payload.note,
            "token_jti": jti,
            "ip": ip,
            "self_reported": True,
            "source": "courier",
        },
    )

    return {"ok": True, "stage": stage, "loan_id": loan_id, "borrower_user_id": borrower_user_id}
