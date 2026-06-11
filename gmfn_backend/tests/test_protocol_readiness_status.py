from app.api.routes.pilot_readiness import pilot_readiness
from app.api.routes.protocol_status import protocol_status


def test_pilot_readiness_partial_items_explain_remaining_work():
    payload = pilot_readiness()
    checks = payload["checks"]
    partial_checks = [check for check in checks if check["status"] == "partial"]

    assert payload["overall_status"] == "pilot_near_ready"
    assert payload["overall_label"] == "Near ready with evidence gaps"
    assert payload["partial_count"] == len(partial_checks)
    assert payload["partial_count"] >= 4
    assert "partial items still need" in payload["truth_statement"]

    partial_keys = {check["key"] for check in partial_checks}
    assert {
        "guarantor_flow",
        "loan_repayment_e2e",
        "trustslip",
        "frontend",
        "evidence",
    }.issubset(partial_keys)

    for check in partial_checks:
        assert check["status_label"] == "Needs proof"
        assert check["why_it_matters"]
        assert check["complete"]
        assert check["remaining"]
        assert check["next_step"]
        assert check["next_route"].startswith("/app/")


def test_protocol_status_keeps_summary_and_structured_truth_details():
    payload = protocol_status()

    assert payload["protocol"] == "GMFN"
    assert payload["surface_brand"] == "GSN"
    assert payload["stage"] == "late_stabilization"
    assert payload["summary"]["repayments"] == "complete"
    assert payload["summary"]["loan_repayment_e2e"] == "partial"
    assert payload["status_counts"]["partial"] >= 5
    assert "Partial items must keep their label" in payload["truth_statement"]

    details_by_key = {
        detail["key"]: detail
        for detail in payload["summary_details"]
    }

    for key in [
        "loan_repayment_e2e",
        "guarantor_flow",
        "trustslip",
        "frontend_wiring",
        "evidence_pack",
        "pilot_readiness",
    ]:
        assert details_by_key[key]["status"] == "partial"
        assert details_by_key[key]["next_step"]

    assert details_by_key["loan_repayment_e2e"]["remaining"]
    assert details_by_key["loan_repayment_e2e"]["next_route"] == "/app/loans"
    assert details_by_key["guarantor_flow"]["remaining"]
    assert details_by_key["guarantor_flow"]["next_route"] == "/app/loans"
    assert "guarantor invite permission" in " ".join(payload["next_priority"])
