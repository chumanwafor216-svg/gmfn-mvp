# app/api/routes/trust_slips_verify_ui.py
from __future__ import annotations

from html import escape

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.merchant_verify_service import verify_merchant_token
from app.services.trust_slips_services import get_trust_slip_for_user
from app.services.shipment_progress_service import get_shipment_progress

router = APIRouter(prefix="/trust-slips", tags=["trust-slips"])


@router.get("/verify/{token}", response_class=HTMLResponse)
def verify_trust_slip_ui(token: str, db: Session = Depends(get_db)):
    """
    Merchant verification UI (no login).
    Shows:
    - current public record status
    - visibility level label
    - TrustSlip limit (depending on level)
    - shipment progress bar (Released → Dispatched → In transit → Delivered → Buyer confirmed)
    """
    try:
        info = verify_merchant_token(token)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link.")

    user_id = int(info.get("user_id") or info.get("uid") or 0)
    level = str(info.get("level") or info.get("lvl") or "standard")

    if user_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid verification payload.")

    trust = get_trust_slip_for_user(db, user_id=user_id)
    prog = get_shipment_progress(db, user_id=user_id, loan_id=None)

    # Visibility rules
    show_limit = level in ("standard", "detailed")
    show_last_repayment = level in ("standard", "detailed")
    show_disclaimer = True

    trust_limit = trust.get("trust_slip_limit") if show_limit else "Hidden"
    last_full = trust.get("last_full_repayment_at") if show_last_repayment else "Hidden"
    level_label = trust.get("level_label") or "Current record"

    steps = prog.get("steps", [])

    def html_text(value, fallback: str = "-") -> str:
        text = str(value if value is not None else fallback).strip()
        return escape(text or fallback, quote=True)

    def step_dot(done: bool) -> str:
        return "#16a34a" if done else "#cbd5e1"

    def step_text(done: bool) -> str:
        return "#0f172a" if done else "#64748b"

    # Build progress HTML segments
    step_blocks = ""
    for s in steps:
        done = bool(s.get("done"))
        at = html_text(s.get("at"), "")
        name = html_text(s.get("name"), "Step")
        sub = f"<div style='font-size:11px;color:#64748b;margin-top:2px'>{at}</div>" if at else ""
        step_blocks += f"""
        <div style="display:flex;align-items:flex-start;gap:10px;padding:10px;border:1px solid #e5e7eb;border-radius:12px;background:rgba(255,255,255,0.92)">
          <div style="width:12px;height:12px;border-radius:999px;margin-top:4px;background:{step_dot(done)}"></div>
          <div>
            <div style="font-weight:900;color:{step_text(done)}">{name}</div>
            {sub}
          </div>
        </div>
        """

    html = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>GSN Merchant Verification Record</title>
  <style>
    body {{
      margin:0;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      background: linear-gradient(180deg, #e0f2fe 0%, #fff7ed 45%, #f0fdf4 100%);
      color:#0f172a;
    }}
    .wrap {{ max-width: 860px; margin:0 auto; padding:18px; }}
    .card {{
      background: rgba(255,255,255,0.85);
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      padding: 16px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.06);
    }}
    .row {{ display:flex; gap:14px; flex-wrap:wrap; }}
    .pill {{
      display:inline-flex; align-items:center; gap:8px;
      padding:6px 10px; border-radius:999px;
      background:#dcfce7; color:#166534; font-weight:900;
      border:1px solid #bbf7d0;
    }}
    .muted {{ color:#64748b; font-size:13px; line-height:1.4; }}
    .k {{ color:#64748b; font-size:12px; }}
    .v {{ font-weight:900; }}
    .grid {{ display:grid; gap:10px; margin-top:12px; }}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="row" style="justify-content:space-between;align-items:baseline">
        <div>
          <div style="font-size:22px;font-weight:1000">GSN Merchant Verification Record</div>
          <div class="muted">This is a current GSN evidence view. It is not a bank guarantee, credit approval, payment instruction, or release authority.</div>
        </div>
        <div class="pill">Record found</div>
      </div>

      <div class="row" style="margin-top:12px">
        <div style="flex:1;min-width:240px">
          <div class="k">Holder reference</div>
          <div class="v">{html_text(user_id)}</div>
        </div>
        <div style="flex:1;min-width:240px">
          <div class="k">Visibility</div>
          <div class="v">{html_text(level)}</div>
        </div>
        <div style="flex:1;min-width:240px">
          <div class="k">Evidence level</div>
          <div class="v">{html_text(level_label)}</div>
        </div>
      </div>

      <div class="row" style="margin-top:12px">
        <div style="flex:1;min-width:240px">
          <div class="k">TrustSlip limit signal</div>
          <div class="v">{html_text(trust_limit)}</div>
        </div>
        <div style="flex:1;min-width:240px">
          <div class="k">Last full repayment</div>
          <div class="v">{html_text(last_full)}</div>
        </div>
        <div style="flex:1;min-width:240px">
          <div class="k">Related loan</div>
          <div class="v">{html_text(prog.get("loan_id"))}</div>
        </div>
      </div>

      <div style="margin-top:14px;font-weight:1000">Trade / shipment progress</div>
      <div class="muted" style="margin-top:4px">{html_text(prog.get("note"), "No progress note is available.")}</div>

      <div class="grid">
        {step_blocks}
      </div>

      <div class="muted" style="margin-top:12px">
        <b>Limitation:</b> Shipment updates may be self-reported by the merchant, courier, or holder. GSN does not guarantee delivery, receipt, repayment, or release of goods, credit, or money.
      </div>
    </div>
  </div>
</body>
</html>
"""
    return HTMLResponse(content=html)
