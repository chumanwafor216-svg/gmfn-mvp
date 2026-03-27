"""
DEPRECATED MODULE (compatibility shim)

The single source of truth is:
    app.services.trust_events_services

This file remains only to avoid breaking older imports.
"""

from app.services.trust_events_services import log_trust_event  # noqa: F401
