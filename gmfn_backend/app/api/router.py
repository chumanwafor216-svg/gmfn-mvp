# app/api/router.py
from fastapi import APIRouter

# =========================
# Core
# =========================
from app.api.routes.auth import router as auth_router
from app.api.routes.clans import router as clans_router
from app.api.routes.invites import router as invites_router
from app.api.routes.loans import router as loans_router
from app.api.routes.pool import router as pool_router
# =========================
# Trust Core
# =========================
from app.api.routes.trust import router as trust_router
from app.api.routes.trust_events import router as trust_events_router
from app.api.routes.trust_slips import router as trust_slips_router
from app.api.routes.trust_why import router as trust_why_router
from app.api.routes.trust_recompute import router as trust_recompute_router
from app.api.routes.trust_timeline_pdf import router as trust_timeline_pdf_router

# =========================
# Evidence
# =========================
from app.api.routes.evidence_pack import router as evidence_pack_router
from app.api.routes.evidence_pack_trustwhy import router as evidence_pack_trustwhy_router
from app.api.routes.admin_evidence_trustwhy import router as admin_evidence_trustwhy_router
from app.api.routes.evidence_verify import router as evidence_verify_router

# =========================
# Reports / Exposure / Analytics
# =========================
from app.api.routes.exposure import router as exposure_router
from app.api.routes.reports import router as reports_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.analytics_liquidity import router as analytics_liquidity_router
from app.api.routes.guarantors_exposure import router as guarantors_exposure_router

# =========================
# Merchant / Public Config (Infrastructure Pack)
# =========================
from app.api.routes.public_config import router as public_config_router
from app.api.routes.merchant_risk import router as merchant_risk_router

# =========================
# Admin
# =========================
from app.api.routes.admin import router as admin_router
from app.api.routes.admin_loans import router as admin_loans_router
from app.api.routes.admin_trust_events import router as admin_trust_events_router
from app.api.routes.admin_trust_why import router as admin_trust_why_router
from app.api.routes.admin_reconcile import router as admin_reconcile_router
from app.api.routes.admin_bank_debug import router as admin_bank_debug_router
from app.api.routes.admin_trust_manual import router as admin_trust_manual_router
from app.api.routes.admin_pool import router as admin_pool_router
# =========================
# Shipment / Payments
# =========================
from app.api.routes.shipment import router as shipment_router
from app.api.routes.payment_instructions import router as payment_router

# =========================
# Bank / Reconciliation
# =========================
from app.api.routes.bank import router as bank_router
from app.api.routes.bank_reconciliation import router as bank_reconciliation_router
from app.api.routes.system_status import router as system_status_router

# =========================
# API Router
# =========================
api_router = APIRouter()

# --- Core ---
api_router.include_router(auth_router)
api_router.include_router(clans_router)
api_router.include_router(invites_router)
api_router.include_router(loans_router)
api_router.include_router(pool_router)
# --- Trust ---
api_router.include_router(trust_events_router)
api_router.include_router(trust_router)
api_router.include_router(trust_slips_router)
api_router.include_router(trust_why_router)
api_router.include_router(trust_recompute_router)
api_router.include_router(trust_timeline_pdf_router)

# --- Evidence ---
api_router.include_router(evidence_pack_router)
api_router.include_router(evidence_pack_trustwhy_router)
api_router.include_router(admin_evidence_trustwhy_router)
api_router.include_router(evidence_verify_router)

# --- Exposure / Reports / Analytics ---
api_router.include_router(exposure_router)
api_router.include_router(reports_router)
api_router.include_router(analytics_router)
api_router.include_router(analytics_liquidity_router)
api_router.include_router(guarantors_exposure_router)

# --- Merchant / Public Config ---
api_router.include_router(public_config_router)
api_router.include_router(merchant_risk_router)

# --- Admin ---
api_router.include_router(admin_router)
api_router.include_router(admin_loans_router)
api_router.include_router(admin_trust_events_router)
api_router.include_router(admin_trust_why_router)
api_router.include_router(admin_reconcile_router)
api_router.include_router(admin_bank_debug_router)
api_router.include_router(admin_trust_manual_router)
api_router.include_router(admin_pool_router)
# --- Shipment / Payments ---
api_router.include_router(shipment_router)
api_router.include_router(payment_router)

# --- Bank / Reconciliation ---
api_router.include_router(bank_router)
api_router.include_router(bank_reconciliation_router)
api_router.include_router(system_status_router)
