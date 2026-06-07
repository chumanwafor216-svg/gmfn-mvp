from fastapi import APIRouter

# =========================
# Core
# =========================
from app.api.routes.auth import router as auth_router
from app.api.routes.entry import router as entry_router
from app.api.routes.entry_verification import router as entry_verification_router
from app.api.routes.clans import router as clans_router
from app.api.routes.invites import router as invites_router
from app.api.routes.loans import router as loans_router
from app.api.routes.loan_suggestions import router as loan_suggestions_router
from app.api.routes.loan_decision import router as loan_decision_router
from app.api.routes.loan_readiness import router as loan_readiness_router
from app.api.routes.loan_workspace import router as loan_workspace_router
from app.api.routes.borrower_preflight import router as borrower_preflight_router
from app.api.routes.pool import router as pool_router
from app.api.routes.loans_inbox import router as loans_inbox_router
from app.api.routes.loan_hardening import router as loan_hardening_router
from app.api.routes.marketplace_requests import router as marketplace_requests_router

# =========================
# Trust Core
# =========================
from app.api.routes.trust import router as trust_router
from app.api.routes.trust_events import router as trust_events_router
from app.api.routes.trust_slips import router as trust_slips_router
from app.api.routes.trust_why import router as trust_why_router
from app.api.routes.trust_recompute import router as trust_recompute_router
from app.api.routes.trust_timeline import router as trust_timeline_router
from app.api.routes.trust_timeline_pdf import router as trust_timeline_pdf_router
from app.api.routes.trust_explainability import router as trust_explainability_router
from app.api.routes.trust_graph import router as trust_graph_router
from app.api.routes.community_integrity import router as community_integrity_router
from app.api.routes.community_confirmations import router as community_confirmations_router

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
from app.api.routes.liquidity import router as liquidity_router

# =========================
# Merchant / Public Config
# =========================
from app.api.routes.public_config import router as public_config_router
from app.api.routes.merchant_verify import router as merchant_verify_router
from app.api.routes.merchant_risk import router as merchant_risk_router
from app.api.routes.marketplace import router as marketplace_router
from app.api.routes.marketplace_media import router as marketplace_media_router
from app.api.routes.share_preview import router as share_preview_router
from app.api.routes.vault import router as vault_router
from app.api.routes.vault_access import router as vault_access_router

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
from app.api.routes.admin_behaviour_metrics import router as admin_behaviour_metrics_router

# =========================
# Payments / Rails / Notifications / Identity
# =========================
from app.api.routes.payment_instructions import router as payment_router
from app.api.routes.payment_rails import router as payment_rails_router
from app.api.routes.rosca import router as rosca_router
from app.api.routes.community_meetings import router as community_meetings_router
from app.api.routes.withdrawal_destinations import router as withdrawal_destinations_router
from app.api.routes.withdrawal_instructions import router as withdrawal_instructions_router
from app.api.routes.settlement_config import router as settlement_config_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.identity_risk import router as identity_risk_router
from app.api.routes.settings import router as settings_router

# =========================
# Revenue / Earnings / Status
# =========================
from app.api.routes.revenue_allocation import router as revenue_allocation_router
from app.api.routes.guarantor_earnings import router as guarantor_earnings_router
from app.api.routes.system_diagnostics import router as system_diagnostics_router
from app.api.routes.system_health import router as system_health_router
from app.api.routes.system_status import router as system_status_router
from app.api.routes.protocol_status import router as protocol_status_router
from app.api.routes.pilot_readiness import router as pilot_readiness_router

# =========================
# Bank / Reconciliation
# =========================
from app.api.routes.bank import router as bank_router


api_router = APIRouter()

# CORE
api_router.include_router(auth_router)
api_router.include_router(entry_router)
api_router.include_router(entry_verification_router)
api_router.include_router(clans_router)
api_router.include_router(invites_router)
api_router.include_router(loans_router)
api_router.include_router(loan_suggestions_router)
api_router.include_router(loan_decision_router)
api_router.include_router(loan_readiness_router)
api_router.include_router(loan_workspace_router)
api_router.include_router(borrower_preflight_router)
api_router.include_router(pool_router)
api_router.include_router(loans_inbox_router)
api_router.include_router(loan_hardening_router)
api_router.include_router(marketplace_requests_router)

# TRUST CORE
api_router.include_router(trust_router)
api_router.include_router(trust_events_router)
api_router.include_router(trust_slips_router)
api_router.include_router(trust_why_router)
api_router.include_router(trust_recompute_router)
api_router.include_router(trust_timeline_router)
api_router.include_router(trust_timeline_pdf_router)
api_router.include_router(trust_explainability_router)
api_router.include_router(trust_graph_router)
api_router.include_router(community_integrity_router)
api_router.include_router(community_confirmations_router)

# EVIDENCE
api_router.include_router(evidence_pack_router)
api_router.include_router(evidence_pack_trustwhy_router)
api_router.include_router(admin_evidence_trustwhy_router)
api_router.include_router(evidence_verify_router)

# REPORTS / ANALYTICS
api_router.include_router(exposure_router)
api_router.include_router(reports_router)
api_router.include_router(analytics_router)
api_router.include_router(analytics_liquidity_router)
api_router.include_router(guarantors_exposure_router)
api_router.include_router(liquidity_router)

# MERCHANT / PUBLIC CONFIG
api_router.include_router(public_config_router)
api_router.include_router(merchant_verify_router)
api_router.include_router(merchant_risk_router)
api_router.include_router(marketplace_media_router)
api_router.include_router(marketplace_router)
api_router.include_router(share_preview_router)
api_router.include_router(vault_router)
api_router.include_router(vault_access_router)

# ADMIN
api_router.include_router(admin_router)
api_router.include_router(admin_loans_router)
api_router.include_router(admin_trust_events_router)
api_router.include_router(admin_trust_why_router)
api_router.include_router(admin_reconcile_router)
api_router.include_router(admin_bank_debug_router)
api_router.include_router(admin_trust_manual_router)
api_router.include_router(admin_pool_router)
api_router.include_router(admin_behaviour_metrics_router)

# PAYMENTS / RAILS / NOTIFICATIONS / IDENTITY
api_router.include_router(payment_router)
api_router.include_router(payment_rails_router)
api_router.include_router(rosca_router)
api_router.include_router(community_meetings_router)
api_router.include_router(withdrawal_destinations_router)
api_router.include_router(withdrawal_instructions_router)
api_router.include_router(settlement_config_router)
api_router.include_router(notifications_router)
api_router.include_router(identity_risk_router)
api_router.include_router(settings_router)

# REVENUE / EARNINGS / STATUS
api_router.include_router(revenue_allocation_router)
api_router.include_router(guarantor_earnings_router)
api_router.include_router(system_diagnostics_router)
api_router.include_router(system_health_router)
api_router.include_router(system_status_router)
api_router.include_router(protocol_status_router)
api_router.include_router(pilot_readiness_router)

# BANK / RECONCILIATION
api_router.include_router(bank_router)
