from __future__ import annotations

import json

from sqlalchemy import text

from app.db.database import engine


def _seed_domain(
    conn,
    *,
    domain_id: int,
    policy_mode: str = "admin_only",
    notice_policy_mode: str = "admin_only",
    demand_policy_mode: str = "admin_only",
) -> None:
    conn.execute(
        text(
            """
            INSERT INTO community_domains (
                id,
                domain_name,
                display_name,
                domain_type,
                template_key,
                owner_user_id,
                clan_id,
                status,
                verification_status,
                created_at,
                updated_at
            )
            VALUES (
                :domain_id,
                :domain_name,
                :display_name,
                'church_religious_body',
                'church_religious_body',
                1,
                1,
                'active',
                'unverified',
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            """
        ),
        {
            "domain_id": domain_id,
            "domain_name": f"collection-domain-{domain_id}",
            "display_name": f"Collection Domain {domain_id}",
        },
    )
    conn.execute(
        text(
            """
            INSERT INTO community_domain_policies (
                id,
                community_domain_id,
                policy_key,
                action_key,
                scope_type,
                review_mode,
                required_role,
                status,
                policy_summary,
                config_json,
                created_by_user_id,
                created_at,
                updated_at
            )
            VALUES (
                :policy_id,
                :domain_id,
                'domain.feature_policy',
                'domain.features.configure',
                'domain',
                'domain_admin_review',
                'owner_admin',
                'active',
                'Collection instruction route test policy',
                :config_json,
                1,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            """
        ),
        {
            "policy_id": domain_id + 1000,
            "domain_id": domain_id,
            "config_json": json.dumps(
                {
                    "features": {
                        "payments_contributions": policy_mode,
                        "announcement_board": notice_policy_mode,
                        "demand_box": demand_policy_mode,
                    }
                }
            ),
        },
    )


def _collection_event_count() -> int:
    with engine.begin() as conn:
        return conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM trust_events
                WHERE event_type = 'community_domain.collection_instruction'
                """
            )
        ).scalar_one()


def test_domain_admin_can_publish_public_collection_qr_without_public_account_details(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(conn, domain_id=811, policy_mode="admin_only")

    response = client.post(
        "/community-domains/811/collection-instructions",
        json={
            "collection_type": "offering",
            "collection_mode": "standing",
            "purpose_label": "Sunday Offering",
            "amount_label": "Open amount",
            "currency": "GBP",
            "external_payment_url": "https://pay.example.org/church-offering",
            "receiving_account_label": "Church official account ending 1234",
            "visibility_scope": "public",
            "note": "Approved by the finance committee",
        },
    )

    assert response.status_code == 201, response.text
    body = response.json()
    instruction = body["collection_instruction"]
    assert instruction["purpose_label"] == "Sunday Offering"
    assert instruction["public_path"].startswith("/community-collections/")
    assert instruction["external_payment_url"] == "https://pay.example.org/church-offering"
    assert instruction["receiving_account_label"] == "Church official account ending 1234"
    assert "does not hold" in body["boundary"]
    assert _collection_event_count() == 1

    public_response = client.get(body["public_api_path"])
    assert public_response.status_code == 200, public_response.text
    public_instruction = public_response.json()["collection_instruction"]
    assert public_instruction["purpose_label"] == "Sunday Offering"
    assert public_instruction["external_payment_url"] == "https://pay.example.org/church-offering"
    assert "receiving_account_label" not in public_instruction
    assert "Church official account" not in public_response.text
    assert "confirm payment" in public_instruction["boundary"]


def test_collection_qr_respects_disabled_payments_contributions_policy(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(conn, domain_id=812, policy_mode="off")

    response = client.post(
        "/community-domains/812/collection-instructions",
        json={
            "collection_type": "donation",
            "collection_mode": "event_specific",
            "purpose_label": "Building Fund",
            "external_payment_url": "https://pay.example.org/building-fund",
            "visibility_scope": "public",
        },
    )

    assert response.status_code == 403, response.text
    detail = response.json()["detail"]
    assert detail["code"] == "community_domain_feature_disabled"
    assert detail["feature_key"] == "payments_contributions"
    assert _collection_event_count() == 0


def test_collection_qr_rejects_non_https_payment_links(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(conn, domain_id=813, policy_mode="admin_only")

    response = client.post(
        "/community-domains/813/collection-instructions",
        json={
            "collection_type": "offering",
            "collection_mode": "standing",
            "purpose_label": "Sunday Offering",
            "external_payment_url": "http://pay.example.org/church-offering",
            "visibility_scope": "public",
        },
    )

    assert response.status_code == 422, response.text
    assert "https://" in response.text
    assert _collection_event_count() == 0

def test_church_domain_activity_catalogue_prioritizes_pastor_discovery_workflows(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(conn, domain_id=814, policy_mode="admin_only")

    response = client.get("/community-domains/814/activity-catalogue")

    assert response.status_code == 200, response.text
    catalogue = response.json()["activity_catalogue"]
    first_types = [item["activity_type"] for item in catalogue[:8]]
    assert first_types == [
        "church_programme_attendance",
        "pastoral_follow_up",
        "welfare_support",
        "member_belonging_check",
        "department_service",
        "leadership_duty",
        "contribution_memory",
        "volunteer_service",
    ]
    by_type = {item["activity_type"]: item for item in catalogue}
    assert by_type["pastoral_follow_up"]["pilot_recommended"] is True
    assert by_type["pastoral_follow_up"]["workflow_context"] == "church_pastor_discovery"
    assert by_type["member_belonging_check"]["evidence_dimension"] == "belonging"
    assert "not GSN payment proof" in by_type["contribution_memory"]["summary"]
    assert "does not create activities by itself" in response.json()["boundary"]


def test_church_domain_can_record_private_pastoral_follow_up_without_payment_or_outcome_claim(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(conn, domain_id=815, policy_mode="admin_only")

    response = client.post(
        "/community-domains/815/activities",
        json={
            "subject_user_id": 1,
            "activity_type": "pastoral_follow_up",
            "activity_label": "New member welfare follow-up",
            "quantity": "1",
            "measurement_unit": "visit",
            "evidence_strength": "admin_recorded",
            "visibility": "admin_only",
            "note": "Pastor or welfare officer recorded that follow-up happened; no sensitive counselling detail stored.",
            "evidence_reference": "pastoral-care-register-001",
        },
    )

    assert response.status_code == 201, response.text
    body = response.json()
    activity = body["activity"]
    assert activity["activity_type"] == "pastoral_follow_up"
    assert activity["evidence_dimension"] == "care_follow_up"
    assert activity["visibility"] == "admin_only"
    assert body["catalogue_item"] == {
        "activity_type": "pastoral_follow_up",
        "label": "Pastoral follow-up",
        "evidence_dimension": "care_follow_up",
    }
    assert "not a final beneficiary outcome" in body["boundary"]
    assert "not a public sponsor report" in body["boundary"]

    with engine.begin() as conn:
        row = conn.execute(
            text(
                """
                SELECT meta_json
                FROM trust_events
                WHERE event_type = 'community_domain.activity_recorded'
                """
            )
        ).scalar_one()
    meta = json.loads(row)
    assert meta["trust_delta"] == "0.00"
    assert meta["activity_type"] == "pastoral_follow_up"
    assert meta["source"] == "community_domain_activity_catalogue_v1"
    assert meta["note"].startswith("Pastor or welfare officer recorded")

def test_public_notice_qr_requires_explicit_public_qr_opt_in(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(conn, domain_id=816, notice_policy_mode="admin_only")

    private_notice = client.post(
        "/community-domains/816/notices",
        json={"body": "Members only planning note."},
    )
    assert private_notice.status_code == 200, private_notice.text
    assert private_notice.json()["notice"]["public_path"] is None

    public_notice = client.post(
        "/community-domains/816/notices",
        json={
            "body": "Sunday message topic: faith, service, and belonging.",
            "expiry_policy": "pinned",
            "public_qr_enabled": True,
        },
    )
    assert public_notice.status_code == 200, public_notice.text
    posted = public_notice.json()
    assert posted["public_path"].startswith("/community-notices/")
    assert posted["public_api_path"].startswith(
        "/community-domains/public/notices/"
    )
    assert posted["notice"]["public_qr_enabled"] is True

    visible = client.get(posted["public_api_path"])
    assert visible.status_code == 200, visible.text
    payload = visible.json()
    notice = payload["notice"]
    assert notice["body"] == "Sunday message topic: faith, service, and belonging."
    assert notice["community_domain"]["display_name"] == "Collection Domain 816"
    assert "posted_by_user_id" not in notice
    assert "member lists" in payload["boundary"]
    assert "collect money" in payload["boundary"]


def test_public_notice_qr_stops_when_announcement_board_is_turned_off(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(conn, domain_id=817, notice_policy_mode="admin_only")

    public_notice = client.post(
        "/community-domains/817/notices",
        json={
            "body": "Message of the day for public QR.",
            "expiry_policy": "pinned",
            "public_qr_enabled": True,
        },
    )
    assert public_notice.status_code == 200, public_notice.text
    public_api_path = public_notice.json()["public_api_path"]

    first_read = client.get(public_api_path)
    assert first_read.status_code == 200, first_read.text

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE community_domain_policies
                SET config_json = :config_json
                WHERE community_domain_id = 817
                  AND policy_key = 'domain.feature_policy'
                """
            ),
            {
                "config_json": json.dumps(
                    {
                        "features": {
                            "payments_contributions": "admin_only",
                            "announcement_board": "off",
                        }
                    }
                )
            },
        )

    blocked = client.get(public_api_path)
    assert blocked.status_code == 404, blocked.text
    assert blocked.json()["detail"]["code"] == "community_domain_notice_feature_off"


def test_church_summary_pdf_summarizes_message_qr_and_programme_records(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(conn, domain_id=818, policy_mode="admin_only", notice_policy_mode="admin_only")

    notice = client.post(
        "/community-domains/818/notices",
        json={
            "body": "Sunday message topic: faith, service, and belonging.",
            "expiry_policy": "pinned",
            "public_qr_enabled": True,
        },
    )
    assert notice.status_code == 200, notice.text
    assert notice.json()["notice"]["public_qr_enabled"] is True

    activity = client.post(
        "/community-domains/818/activities",
        json={
            "subject_user_id": 1,
            "activity_type": "church_programme_attendance",
            "activity_label": "Sunday service attendance",
            "quantity": "42",
            "measurement_unit": "attendees",
            "evidence_strength": "admin_recorded",
            "visibility": "director_safe",
            "note": "Programme attendance captured for the church memory report.",
        },
    )
    assert activity.status_code == 201, activity.text

    summary = client.get(
        "/community-domains/818/community-value-report.pdf",
        params={"audience": "church_memory"},
    )
    assert summary.status_code == 200, summary.text
    assert summary.content.startswith(b"%PDF-")
    assert summary.headers["content-type"].startswith("application/pdf")
    assert "church-summary-church_memory" in summary.headers["content-disposition"]

def test_church_live_attendance_qr_records_member_checkin_once(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(conn, domain_id=819, policy_mode="admin_only", notice_policy_mode="admin_only")

    session_res = client.post(
        "/community-domains/819/attendance-sessions",
        json={
            "programme_label": "Sunday service live attendance",
            "method": "qr",
            "window_minutes": 45,
            "note": "Pastor opened the service attendance QR.",
        },
    )
    assert session_res.status_code == 201, session_res.text
    session = session_res.json()["attendance_session"]
    assert session["programme_label"] == "Sunday service live attendance"
    assert session["attendance_method"] == "qr"
    assert session["evidence_strength"] == "moderate"
    assert session["active"] is True
    assert session["automatic_bluetooth_scan"] is False
    assert session["public_path"].startswith("/community-attendance/")
    assert session["public_api_path"].startswith("/community-domains/public/attendance-sessions/")

    public_res = client.get(session["public_api_path"])
    assert public_res.status_code == 200, public_res.text
    public_session = public_res.json()["attendance_session"]
    assert public_session["programme_label"] == "Sunday service live attendance"
    assert public_session["checkin_count"] == 0
    assert "checked_in_user_ids" not in public_session
    assert public_res.json()["signin_required"] is True

    checkin_res = client.post(
        f'{session["public_api_path"]}/check-ins',
        json={"method": "qr", "note": "Scanned from the church screen."},
    )
    assert checkin_res.status_code == 200, checkin_res.text
    checkin = checkin_res.json()["attendance_checkin"]
    assert checkin_res.json()["already_recorded"] is False
    assert checkin["checked_in_user_id"] == 1
    assert checkin["attendance_method"] == "qr"
    assert checkin["evidence_strength"] == "moderate"
    assert checkin["automatic_bluetooth_scan"] is False

    duplicate_res = client.post(
        f'{session["public_api_path"]}/check-ins',
        json={"method": "qr"},
    )
    assert duplicate_res.status_code == 200, duplicate_res.text
    assert duplicate_res.json()["already_recorded"] is True

    list_res = client.get("/community-domains/819/attendance-sessions")
    assert list_res.status_code == 200, list_res.text
    listed = list_res.json()["items"][0]
    assert listed["event_id"] == session["event_id"]
    assert listed["checkin_count"] == 1
    assert listed["checked_in_user_ids"] == [1]
    assert listed["method_counts"] == {"qr": 1}
    assert "Presence Evidence only" in listed["boundary"]

    with engine.begin() as conn:
        checkin_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM trust_events
                WHERE event_type = 'community_domain.attendance_checkin.recorded'
                  AND meta_json LIKE :domain_like
                """
            ),
            {"domain_like": '%community_domain_id%819%'},
        ).scalar_one()

    assert checkin_count == 1


def test_church_summary_pdf_accepts_live_attendance_qr_counts(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(conn, domain_id=820, policy_mode="admin_only", notice_policy_mode="admin_only")

    session_res = client.post(
        "/community-domains/820/attendance-sessions",
        json={"programme_label": "Midweek fellowship", "method": "qr", "window_minutes": 30},
    )
    assert session_res.status_code == 201, session_res.text
    session = session_res.json()["attendance_session"]

    checkin_res = client.post(
        f'{session["public_api_path"]}/check-ins',
        json={"method": "qr"},
    )
    assert checkin_res.status_code == 200, checkin_res.text

    response_channel_res = client.post(
        "/community-domains/820/response-channels",
        json={"title": "Midweek fellowship response", "source_kind": "church_service", "window_days": 14},
    )
    assert response_channel_res.status_code == 201, response_channel_res.text
    response_channel = response_channel_res.json()["response_channel"]
    response_res = client.post(
        f'{response_channel["public_api_path"]}/responses',
        json={
            "response_type": "need_request",
            "body": "Please add transport support to next week's plan.",
            "wants_private_follow_up": True,
            "preferred_follow_up_channel": "gsn",
        },
    )
    assert response_res.status_code == 200, response_res.text

    summary = client.get(
        "/community-domains/820/community-value-report.pdf",
        params={"audience": "church_memory"},
    )
    assert summary.status_code == 200, summary.text
    assert summary.content.startswith(b"%PDF-")
    assert "church-summary-church_memory" in summary.headers["content-disposition"]


def test_church_response_qr_records_member_question_and_follow_up_preference(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(conn, domain_id=821, policy_mode="admin_only", notice_policy_mode="admin_only")

    channel_res = client.post(
        "/community-domains/821/response-channels",
        json={
            "title": "Sunday service questions",
            "source_kind": "church_service",
            "prompt": "Send questions, comments, needs, or follow-up from today's service.",
            "related_label": "Sunday service",
            "window_days": 14,
            "allow_private_follow_up": True,
            "note": "Pastor opened the after-service response QR.",
        },
    )
    assert channel_res.status_code == 201, channel_res.text
    channel = channel_res.json()["response_channel"]
    assert channel["title"] == "Sunday service questions"
    assert channel["source_kind"] == "church_service"
    assert channel["active"] is True
    assert channel["public_path"].startswith("/community-responses/")
    assert channel["public_api_path"].startswith("/community-domains/public/response-channels/")

    public_res = client.get(channel["public_api_path"])
    assert public_res.status_code == 200, public_res.text
    public_channel = public_res.json()["response_channel"]
    assert public_channel["response_count"] == 0
    assert "recent_responses" not in public_channel
    assert public_res.json()["signin_required"] is True

    response_res = client.post(
        f'{channel["public_api_path"]}/responses',
        json={
            "response_type": "question",
            "body": "Can the church share the youth programme follow-up plan?",
            "wants_private_follow_up": True,
            "preferred_follow_up_channel": "whatsapp",
        },
    )
    assert response_res.status_code == 200, response_res.text
    body = response_res.json()["response"]
    assert body["response_type"] == "question"
    assert body["wants_private_follow_up"] is True
    assert body["preferred_follow_up_channel"] == "whatsapp"
    assert "responder_user_id" not in body

    list_res = client.get("/community-domains/821/response-channels")
    assert list_res.status_code == 200, list_res.text
    listed = list_res.json()["items"][0]
    assert listed["event_id"] == channel["event_id"]
    assert listed["response_count"] == 1
    assert listed["private_follow_up_count"] == 1
    assert listed["by_type"] == {"question": 1}
    assert listed["recent_responses"][0]["responder_user_id"] == 1
    assert "youth programme" in listed["recent_responses"][0]["body"]

    with engine.begin() as conn:
        response_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM trust_events
                WHERE event_type = 'community_domain.response.recorded'
                  AND meta_json LIKE :domain_like
                """
            ),
            {"domain_like": '%community_domain_id%821%'},
        ).scalar_one()

    assert response_count == 1


def test_church_response_qr_respects_disabled_demand_box_policy(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(
            conn,
            domain_id=822,
            policy_mode="admin_only",
            notice_policy_mode="admin_only",
            demand_policy_mode="off",
        )

    blocked = client.post(
        "/community-domains/822/response-channels",
        json={
            "title": "Blocked response box",
            "source_kind": "church_service",
            "window_days": 14,
        },
    )
    assert blocked.status_code == 403, blocked.text
    assert blocked.json()["detail"]["feature_key"] == "demand_box"