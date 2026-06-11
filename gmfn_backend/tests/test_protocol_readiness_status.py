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
    assert "guarantor borrower/admin invite phone proof and payout-route decision" in " ".join(payload["next_priority"])
    assert "trust-event route consistency" not in " ".join(payload["next_priority"])


def test_readiness_partial_text_reflects_latest_completed_work_without_overclaiming():
    payload = pilot_readiness()
    checks_by_key = {check["key"]: check for check in payload["checks"]}

    guarantor_flow = checks_by_key["guarantor_flow"]
    assert any("not an automatic payout" in item for item in guarantor_flow["complete"])
    assert any("guided withdrawal workflow" in item for item in guarantor_flow["remaining"])
    assert not any("only visibility for pilot" in item for item in guarantor_flow["remaining"])

    trustslip = checks_by_key["trustslip"]
    assert any("Older Trust Timeline" in item for item in trustslip["complete"])
    assert any("Render and review" in item for item in trustslip["remaining"])

    evidence = checks_by_key["evidence"]
    assert any("source-level PDF shell pass" in item for item in evidence["complete"])
    assert any("Visually open generated PDFs" in item for item in evidence["remaining"])
