# GMFN Stability Operating Procedure (SOP)

## Purpose
Prevent backend chaos, port conflicts, interpreter confusion, and broken imports.

---

## 1️⃣ Terminal Discipline

Always use:
- Terminal 1 → Backend (uvicorn)
- Terminal 2 → Testing (PowerShell / curl / Swagger)
- Terminal 3 → Frontend (Vite)

Never start two backend servers.

---

## 2️⃣ Backend Startup Procedure

cd gmfn_backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level info

Wait until:
Application startup complete.
Uvicorn running on http://127.0.0.1:8000

---

## 3️⃣ If Port 8000 Fails

Run:
netstat -ano | findstr ":8000"

Kill PID:
taskkill /PID <PID> /F

Then restart uvicorn.

---

## 4️⃣ Health Check (Always Use This)

Invoke-RestMethod -Uri "http://127.0.0.1:8000/health"

Expected:
{"ok": true}

---

## 5️⃣ Diagnostics Check (Admin Only)

GET /system/diagnostics

Confirms:
- Protocol version
- Dev mode
- Secret presence
- Python executable
- Runtime stability

---

## 6️⃣ Constants Integrity Rule

If any import error references:
- STARTER_CAP
- LEVEL_STANDARD
- MERCHANT_LEVEL
- DEV_FALLBACK_SECRET

Fix ONLY in:
app/core/constants.py

Never scatter constants across services.

---

## 7️⃣ Restart Rule

If you change Python code:

CTRL + C (stop server)
Restart uvicorn

No --reload in production mode.

---

## 8️⃣ Debugging Rule

When error occurs:
1. Read last 10 lines of traceback.
2. Identify missing import name.
3. Fix single source of truth (constants or service).
4. Restart cleanly.

Never patch blindly.

---

## 9️⃣ Innovation Protocol Alignment

GMFN is:
- Not a bank
- Not a loan company
- A Trust Transmission Protocol

TrustSlip is:
- Community-backed integrity limit
- Not a bank guarantee
- Not auto-debit

All messaging must reflect this.

---

## 10️⃣ Stability First, Then Expansion

Never add new features if:
- Health fails
- Diagnostics fails
- Router import fails
- Constants import fails

System must boot clean before expanding.

---
---

## Proof Artifact: Evidence PDF Includes Merchant Release (2026-02-16)

**Endpoint:** `GET /trust-slips/me/evidence.pdf`  
**Result:** Valid PDF generated (`%PDF-1.4`) and now includes a **Merchant Release Evidence** section.

**Why this matters:**
- Merchant release becomes part of the audit trail.
- Strengthens dispute readiness and pilot credibility.
- Supports visa evidence narrative: signed verification + event logging + printable proof.

GMFN Innovation Trail
Phase: Trust-Backed Trade Lifecycle Protocol
Version: Pilot Expansion Draft v1
Founder: Chuma
1️⃣ Core Insight
Informal trade is not broken because of lack of banks.
It is broken because of lack of shared visibility during uncertainty.

The most anxiety-inducing period is:

Agreement → Dispatch → Silence → Arrival

GMFN introduces structured transparency during this silent phase.

2️⃣ New Expansion: Shipment Lifecycle Logging
We introduce a lightweight, non-custodial trade lifecycle protocol.

Actors
Borrower

Merchant

Courier (optional participant)

Admin (oversight only)

3️⃣ Shipment Event Model (Pilot Safe)
Events are logged as TrustEvents with metadata only.
No logistics API integration.
No delivery guarantee.

Merchant Events
merchant.release_recorded

merchant.dispatched

merchant.in_transit

merchant.delivered

merchant.delivery_issue

Borrower Event
merchant.delivery_confirmed

Courier Events (via expiring link)
courier.received

courier.in_transit

courier.delivered

All courier confirmations are self-reported acknowledgments.

4️⃣ Courier Confirmation Design
Mechanism
When merchant logs dispatch:

System generates:

Expiring courier confirmation link (48h default)

Tokenized, no login required

One-tap stage confirmations

Courier UI options:

Goods received

Goods now in transit

Goods delivered

Each confirmation logs:

Timestamp (UTC)

IP address (optional)

Event ID

Token ID

Self-reported flag

5️⃣ Liability Boundary (Critical)
GMFN records shipment events for transparency.

GMFN:

Does not manage courier operations

Does not guarantee delivery

Does not insure goods

Does not assume logistics liability

Every shipment screen must show:

GMFN records trade events for transparency.
GMFN does not guarantee courier performance or delivery outcomes.

6️⃣ Psychological Stabilization Effect
Instead of silence:

Borrower sees:

Released

Courier acknowledged receipt

In transit

Delivered

Confirmed

This reduces:

Panic

Accusations

Emotional disputes

Reputation damage

The system introduces structured reassurance.

7️⃣ Evidence Pack Integration
Evidence Pack ZIP will now include:

shipment.json

courier_acknowledgment.json

delivery_confirmation.json

timestamps

tracking number (if provided)

courier name

optional goods images

event hashes

signature (if enabled)

This upgrades GMFN into a documented trade lifecycle protocol.

8️⃣ Governance Upgrade
Multi-party acknowledgment creates soft accountability:

Merchant logs dispatch

Courier optionally confirms

Borrower confirms delivery

Trust increases only on repayment

Trust becomes:

Not just repayment score,
but structured trade behavior record.

9️⃣ Innovation Classification
GMFN is evolving into:

Trust-Backed Trade Authorization + Lifecycle Documentation Protocol

It is:

Not a bank

Not a logistics company

Not an escrow provider

It is:

A structured transparency layer for informal economies.

🔟 Immediate To-Do List
Phase 1 (Now)
 Backend shipment event logging endpoints

 Courier confirmation token generator

 Courier confirmation UI page

 Borrower delivery confirmation button

 Timeline integration

 Evidence pack shipment inclusion

 Clear liability disclaimer

Phase 2
 EXIF metadata stripping for image uploads

 Image size limits (max 2MB, max 3 images)

 Event IP logging (optional)

 Expiry enforcement for courier tokens

 Revocation button for merchant link

Phase 3
 Dispute workflow (open / respond / close)

 Traffic-light risk indicator for merchants

 Pack ID + Verification Code integration in disputes

 Time-weighted trust decay integration with shipment issues

Future Exploration
 Courier API integration (optional)

 QR printed waybill verification

 Geo-timestamp option

 AI-assisted goods tagging

 Merkle-style append-only trust ledger

 Public pack verification endpoint

1️⃣1️⃣ Strategic Outcome
After this phase, GMFN covers:

Trust authorization

Merchant release

Courier acknowledgment

Transit visibility

Delivery confirmation

Repayment scoring

Evidence export with integrity verification

This is no longer an MVP loan app.

It is a structured informal trade governance system.

1️⃣2️⃣ Founder Note
The goal is not to replace informal systems.

The goal is to:

Digitally mirror informal trust
while reducing anxiety and disputes.

End of Document.

End of SOP.
