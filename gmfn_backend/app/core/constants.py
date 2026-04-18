"""
GMFN Core Protocol Constants (Single Source of Truth)

Rules:
- Decimal-safe (no floats)
- Backward compatible aliases included
- Security flags + dev fallbacks centralized
"""

import os
from decimal import Decimal

# ============================================================
# VERSION
# ============================================================
PROTOCOL_VERSION = "trust_constitution_v1"

# ============================================================
# TRUST GAINS
# ============================================================
BORROWER_FULL_REPAY_GAIN = Decimal("0.10")
GUARANTOR_SUCCESS_GAIN = Decimal("0.03")
IDENTITY_PHONE_VERIFIED_GAIN = Decimal("0.50")
IDENTITY_BANK_RECORDED_GAIN = Decimal("0.80")
IDENTITY_DRIVERS_LICENCE_GAIN = Decimal("0.40")
IDENTITY_REGION_CONSISTENT_GAIN = Decimal("0.20")

# Backward compatibility
BORROWER_FULL_REPAY = BORROWER_FULL_REPAY_GAIN
GUARANTOR_SUCCESS = GUARANTOR_SUCCESS_GAIN

# ============================================================
# TRUST PENALTIES
# ============================================================
MISSED_PAYMENT_PENALTY = Decimal("0.30")
DEFAULT_PENALTY = Decimal("0.70")
FRAUD_PENALTY = Decimal("1.50")

# ============================================================
# RECENCY / STANDING
# ============================================================
DEFAULT_WINDOW_DAYS = 180
RECENCY_MIN_FACTOR = Decimal("0.50")
RECENCY_MAX_FACTOR = Decimal("1.00")

INACTIVITY_DECAY_START_DAYS = 365
INACTIVITY_DECAY_PENALTY = Decimal("0.10")
INACTIVITY_DECAY_FLOOR = Decimal("0.40")

# ============================================================
# TRUSTSLIP ENGINE
# ============================================================
STARTER_CAP_DEFAULT = Decimal("100.00")
TRUSTSLIP_MULTIPLIER = Decimal("100.00")
HISTORICAL_CAP_MULTIPLIER = Decimal("3.00")

# Backward compatibility aliases
TRUSTSLIP_STARTER_CAP_DEFAULT = STARTER_CAP_DEFAULT
TRUSTSLIP_MULTIPLIER_DEFAULT = TRUSTSLIP_MULTIPLIER
TRUSTSLIP_HISTORICAL_CAP_MULTIPLIER = HISTORICAL_CAP_MULTIPLIER

# ============================================================
# MERCHANT VISIBILITY LEVELS
# ============================================================
LEVEL_MINIMAL = "minimal"
LEVEL_STANDARD = "standard"
LEVEL_DETAILED = "detailed"

ALLOWED_MERCHANT_LEVELS = {
    LEVEL_MINIMAL,
    LEVEL_STANDARD,
    LEVEL_DETAILED,
}

# Backward compatibility aliases
ALLOWED_LEVELS = ALLOWED_MERCHANT_LEVELS
MERCHANT_ALLOWED_LEVELS = ALLOWED_MERCHANT_LEVELS

MERCHANT_LEVEL_MINIMAL = LEVEL_MINIMAL
MERCHANT_LEVEL_STANDARD = LEVEL_STANDARD
MERCHANT_LEVEL_DETAILED = LEVEL_DETAILED

# ============================================================
# MERCHANT TOKEN / SECURITY DEFAULTS
# ============================================================
MERCHANT_TOKEN_TTL_HOURS_DEFAULT = 72

MERCHANT_VERIFY_RATE_LIMIT_WINDOW_SECONDS = 60
MERCHANT_VERIFY_RATE_LIMIT_MAX_REQUESTS = 30

MERCHANT_RELEASE_RATE_LIMIT_WINDOW_SECONDS = 60
MERCHANT_RELEASE_RATE_LIMIT_MAX_REQUESTS = 20

# Dev fallback behavior (MVP/local)
ALLOW_DEV_SECRET_FALLBACK = str(os.getenv("GMFN_DEV_MODE", "") or "").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
DEV_FALLBACK_SECRET = "gmfn-dev-secret-please-change-later"

# ============================================================
# ANTI-ABUSE
# ============================================================
MIN_TRUST_ELIGIBLE_LOAN_AMOUNT = Decimal("50.00")
TRUST_COOLDOWN_HOURS = 24
