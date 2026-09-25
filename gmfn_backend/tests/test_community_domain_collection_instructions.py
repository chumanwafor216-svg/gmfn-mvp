from __future__ import annotations

import json

from sqlalchemy import text

from app.db.database import engine


def _seed_domain(
    conn,
    *,
    domain_id: int,
    domain_type: str = "church_religious_body",
    template_key: str = "church_religious_body",
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
                :domain_type,
                :template_key,
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
            "domain_type": domain_type,
            "template_key": template_key,
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



def test_school_domain_activity_catalogue_prioritizes_school_governance_package(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(
            conn,
            domain_id=830,
            domain_type="school",
            template_key="school_multi_branch",
            policy_mode="admin_only",
        )

    response = client.get("/community-domains/830/activity-catalogue")

    assert response.status_code == 200, response.text
    catalogue = response.json()["activity_catalogue"]
    first_types = [item["activity_type"] for item in catalogue[:8]]
    assert first_types == [
        "school_notice_ack_follow_up",
        "school_fee_follow_up",
        "student_arrival_record",
        "student_dismissal_record",
        "school_shop_supply_notice",
        "attendance",
        "training_completion",
        "leadership_duty",
    ]
    by_type = {item["activity_type"]: item for item in catalogue}
    assert by_type["school_fee_follow_up"]["pilot_recommended"] is True
    assert by_type["school_fee_follow_up"]["workflow_context"] == "school_governance_package"
    assert "not bank confirmation" in by_type["school_fee_follow_up"]["summary"]
    assert by_type["student_arrival_record"]["evidence_dimension"] == "attendance"
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
            "follow_up_due_at": "2026-09-25T09:00:00Z",
        },
    )

    assert response.status_code == 201, response.text
    body = response.json()
    activity = body["activity"]
    assert activity["activity_type"] == "pastoral_follow_up"
    assert activity["evidence_dimension"] == "care_follow_up"
    assert activity["visibility"] == "admin_only"
    assert activity["note"].startswith("Pastor or welfare officer recorded")
    assert activity["evidence_reference"] == "pastoral-care-register-001"
    assert activity["follow_up_due_at"].startswith("2026-09-25T09:00:00")
    assert body["catalogue_item"] == {
        "activity_type": "pastoral_follow_up",
        "label": "Pastoral follow-up",
        "evidence_dimension": "care_follow_up",
    }
    assert "not a final beneficiary outcome" in body["boundary"]
    assert "not a public sponsor report" in body["boundary"]

    listed_res = client.get("/community-domains/815/activities")
    assert listed_res.status_code == 200, listed_res.text
    listed_activity = listed_res.json()["items"][0]
    assert listed_activity["activity_type"] == "pastoral_follow_up"
    assert listed_activity["note"].startswith("Pastor or welfare officer recorded")
    assert listed_activity["evidence_reference"] == "pastoral-care-register-001"
    assert listed_activity["follow_up_due_at"].startswith("2026-09-25T09:00:00")

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

def test_activity_list_scans_past_other_domain_rows_before_applying_domain_limit(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(conn, domain_id=823, policy_mode="admin_only")
        conn.execute(
            text(
                """
                INSERT INTO trust_events (
                    event_type,
                    clan_id,
                    actor_user_id,
                    subject_user_id,
                    meta_json,
                    created_at
                )
                VALUES (
                    'community_domain.activity_recorded',
                    1,
                    1,
                    1,
                    :target_meta_json,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "target_meta_json": json.dumps(
                    {
                        "source": "community_domain_activity_catalogue_v1",
                        "community_domain_id": 823,
                        "activity_type": "pastoral_follow_up",
                        "activity_label": "Hidden older church follow-up",
                        "evidence_dimension": "care_follow_up",
                        "quantity": "1.00",
                        "measurement_unit": "visit",
                        "evidence_strength": "admin_recorded",
                        "visibility": "director_safe",
                        "note": "Next follow-up date: 2026-09-24",
                        "follow_up_due_at": "2026-09-24T00:00:00+00:00",
                    }
                )
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO trust_events (
                    event_type,
                    clan_id,
                    actor_user_id,
                    subject_user_id,
                    meta_json,
                    created_at
                )
                VALUES (
                    'community_domain.activity_recorded',
                    1,
                    1,
                    1,
                    :distractor_meta_json,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "distractor_meta_json": json.dumps(
                    {
                        "source": "community_domain_activity_catalogue_v1",
                        "community_domain_id": 999999,
                        "activity_type": "market_meeting",
                        "activity_label": "Newer other-domain activity",
                        "evidence_dimension": "participation",
                        "quantity": "1.00",
                        "measurement_unit": "meeting",
                        "evidence_strength": "admin_recorded",
                        "visibility": "director_safe",
                    }
                )
            },
        )

    response = client.get("/community-domains/823/activities?limit=1")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["community_domain_id"] == 823
    assert body["items"][0]["activity_label"] == "Hidden older church follow-up"
    assert body["items"][0]["follow_up_due_at"].startswith("2026-09-24T00:00:00")


def test_activity_follow_up_queue_returns_due_pastoral_records_only(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(conn, domain_id=824, policy_mode="admin_only")
        follow_up_rows = [
            {
                "activity_type": "pastoral_follow_up",
                "activity_label": "Queue church follow-up",
                "community_domain_id": 824,
                "follow_up_due_at": "2026-09-23T00:00:00+00:00",
            },
            {
                "activity_type": "pastoral_follow_up",
                "activity_label": "Future church follow-up",
                "community_domain_id": 824,
                "follow_up_due_at": "2026-09-25T00:00:00+00:00",
            },
            {
                "activity_type": "market_meeting",
                "activity_label": "Due non-pastoral activity",
                "community_domain_id": 824,
                "follow_up_due_at": "2026-09-23T00:00:00+00:00",
            },
            {
                "activity_type": "pastoral_follow_up",
                "activity_label": "Other domain due follow-up",
                "community_domain_id": 999999,
                "follow_up_due_at": "2026-09-23T00:00:00+00:00",
            },
        ]
        for row in follow_up_rows:
            conn.execute(
                text(
                    """
                    INSERT INTO trust_events (
                        event_type,
                        clan_id,
                        actor_user_id,
                        subject_user_id,
                        meta_json,
                        created_at
                    )
                    VALUES (
                        'community_domain.activity_recorded',
                        1,
                        1,
                        1,
                        :meta_json,
                        CURRENT_TIMESTAMP
                    )
                    """
                ),
                {
                    "meta_json": json.dumps(
                        {
                            "source": "community_domain_activity_catalogue_v1",
                            "community_domain_id": row["community_domain_id"],
                            "activity_type": row["activity_type"],
                            "activity_label": row["activity_label"],
                            "evidence_dimension": "care_follow_up",
                            "quantity": "1.00",
                            "measurement_unit": "visit",
                            "evidence_strength": "admin_recorded",
                            "visibility": "director_safe",
                            "note": "Next follow-up date: " + row["follow_up_due_at"][:10],
                            "follow_up_due_at": row["follow_up_due_at"],
                        }
                    )
                },
            )

    response = client.get(
        "/community-domains/824/activities/follow-ups?due_on_or_before=2026-09-24&limit=10"
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["due_on_or_before"] == "2026-09-24"
    assert body["total"] == 1
    assert body["queue_total"] == 1
    assert body["overdue_before_cutoff_total"] == 1
    assert body["due_on_cutoff_total"] == 0
    assert body["scan_limit"] == 1000
    assert body["scanned_activity_total"] == 3
    assert body["scan_window_exhausted"] is False
    assert body["resolved_reference_scan_scope"] == "queue_activity_scan"
    assert body["resolved_reference_scanned_activity_total"] == 3
    assert body["resolved_reference_scan_window_exhausted"] is False
    assert body["items"][0]["community_domain_id"] == 824
    assert body["items"][0]["activity_label"] == "Queue church follow-up"
    assert body["items"][0]["follow_up_due_date"] == "2026-09-23"
    assert body["items"][0]["queue_source"] == "pastoral_follow_up_activity_records_v1"
    assert "Future church follow-up" not in str(body["items"])
    assert "Due non-pastoral activity" not in str(body["items"])
    assert "Other domain due follow-up" not in str(body["items"])


def test_activity_follow_up_queue_does_not_report_exhausted_at_exact_scan_limit(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(conn, domain_id=828, policy_mode="admin_only")
        for index in range(50):
            conn.execute(
                text(
                    """
                    INSERT INTO trust_events (
                        event_type,
                        clan_id,
                        actor_user_id,
                        subject_user_id,
                        meta_json,
                        created_at
                    )
                    VALUES (
                        'community_domain.activity_recorded',
                        1,
                        1,
                        1,
                        :meta_json,
                        CURRENT_TIMESTAMP
                    )
                    """
                ),
                {
                    "meta_json": json.dumps(
                        {
                            "source": "community_domain_activity_catalogue_v1",
                            "community_domain_id": 828,
                            "activity_type": "pastoral_follow_up",
                            "activity_label": f"Exact scan window church follow-up {index}",
                            "evidence_dimension": "care_follow_up",
                            "quantity": "1.00",
                            "measurement_unit": "visit",
                            "evidence_strength": "admin_recorded",
                            "visibility": "director_safe",
                            "note": "Next follow-up date: 2026-09-23",
                            "follow_up_due_at": "2026-09-23T00:00:00+00:00",
                        }
                    )
                },
            )

    response = client.get(
        "/community-domains/828/activities/follow-ups?due_on_or_before=2026-09-24&limit=10&scan_limit=50"
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["total"] == 10
    assert body["queue_total"] == 50
    assert body["scan_limit"] == 50
    assert body["scanned_activity_total"] == 50
    assert body["scan_window_exhausted"] is False
    assert body["resolved_reference_scan_scope"] == "queue_activity_scan"
    assert body["resolved_reference_scanned_activity_total"] == 50
    assert body["resolved_reference_scan_window_exhausted"] is False
    assert "Exact scan window church follow-up 0" not in str(body["items"])


def test_activity_follow_up_queue_reports_exhausted_scan_window(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(conn, domain_id=826, policy_mode="admin_only")
        for index in range(51):
            conn.execute(
                text(
                    """
                    INSERT INTO trust_events (
                        event_type,
                        clan_id,
                        actor_user_id,
                        subject_user_id,
                        meta_json,
                        created_at
                    )
                    VALUES (
                        'community_domain.activity_recorded',
                        1,
                        1,
                        1,
                        :meta_json,
                        CURRENT_TIMESTAMP
                    )
                    """
                ),
                {
                    "meta_json": json.dumps(
                        {
                            "source": "community_domain_activity_catalogue_v1",
                            "community_domain_id": 826,
                            "activity_type": "pastoral_follow_up",
                            "activity_label": f"Scan window church follow-up {index}",
                            "evidence_dimension": "care_follow_up",
                            "quantity": "1.00",
                            "measurement_unit": "visit",
                            "evidence_strength": "admin_recorded",
                            "visibility": "director_safe",
                            "note": "Next follow-up date: 2026-09-23",
                            "follow_up_due_at": "2026-09-23T00:00:00+00:00",
                        }
                    )
                },
            )

    response = client.get(
        "/community-domains/826/activities/follow-ups?due_on_or_before=2026-09-24&limit=10&scan_limit=50"
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["total"] == 10
    assert body["queue_total"] == 50
    assert body["scan_limit"] == 50
    assert body["scanned_activity_total"] == 50
    assert body["scan_window_exhausted"] is True
    assert body["resolved_reference_scan_scope"] == "queue_activity_scan"
    assert body["resolved_reference_scanned_activity_total"] == 50
    assert body["resolved_reference_scan_window_exhausted"] is True
    assert "older activity records may exist outside the response" in body["boundary"]
    assert "due rows stay node-scoped" in body["boundary"]
    assert "resolved activity-record references are checked across the domain activity scan" in body["boundary"]
    assert "Scan window church follow-up 0" not in str(body["items"])


def test_activity_follow_up_queue_hides_records_resolved_by_later_update(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(conn, domain_id=825, policy_mode="admin_only")
        conn.execute(
            text(
                """
                INSERT INTO trust_events (
                    event_type,
                    clan_id,
                    actor_user_id,
                    subject_user_id,
                    meta_json,
                    created_at
                )
                VALUES (
                    'community_domain.activity_recorded',
                    1,
                    1,
                    1,
                    :meta_json,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "meta_json": json.dumps(
                    {
                        "source": "community_domain_activity_catalogue_v1",
                        "community_domain_id": 825,
                        "activity_type": "pastoral_follow_up",
                        "activity_label": "Resolved church follow-up",
                        "evidence_dimension": "care_follow_up",
                        "evidence_strength": "admin_recorded",
                        "visibility": "director_safe",
                        "note": "Next follow-up date: 2026-09-23",
                        "follow_up_due_at": "2026-09-23T00:00:00+00:00",
                    }
                )
            },
        )
        resolved_event_id = conn.execute(text("SELECT last_insert_rowid()")).scalar_one()
        conn.execute(
            text(
                """
                INSERT INTO trust_events (
                    event_type,
                    clan_id,
                    actor_user_id,
                    subject_user_id,
                    meta_json,
                    created_at
                )
                VALUES (
                    'community_domain.activity_recorded',
                    1,
                    1,
                    1,
                    :meta_json,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "meta_json": json.dumps(
                    {
                        "source": "community_domain_activity_catalogue_v1",
                        "community_domain_id": 825,
                        "activity_type": "pastoral_follow_up",
                        "activity_label": "Future referenced church follow-up",
                        "evidence_dimension": "care_follow_up",
                        "evidence_strength": "admin_recorded",
                        "visibility": "director_safe",
                        "note": "Next follow-up date: 2026-09-30",
                        "follow_up_due_at": "2026-09-30T00:00:00+00:00",
                    }
                )
            },
        )
        future_referenced_event_id = conn.execute(text("SELECT last_insert_rowid()")).scalar_one()
        conn.execute(
            text(
                """
                INSERT INTO trust_events (
                    event_type,
                    clan_id,
                    actor_user_id,
                    subject_user_id,
                    meta_json,
                    created_at
                )
                VALUES (
                    'community_domain.activity_recorded',
                    1,
                    1,
                    1,
                    :meta_json,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "meta_json": json.dumps(
                    {
                        "source": "community_domain_activity_catalogue_v1",
                        "community_domain_id": 825,
                        "activity_type": "pastoral_follow_up",
                        "activity_label": "Still due church follow-up",
                        "evidence_dimension": "care_follow_up",
                        "evidence_strength": "admin_recorded",
                        "visibility": "director_safe",
                        "note": "Next follow-up date: 2026-09-23",
                        "follow_up_due_at": "2026-09-23T00:00:00+00:00",
                    }
                )
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO trust_events (
                    event_type,
                    clan_id,
                    actor_user_id,
                    subject_user_id,
                    meta_json,
                    created_at
                )
                VALUES (
                    'community_domain.activity_recorded',
                    1,
                    1,
                    1,
                    :meta_json,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "meta_json": json.dumps(
                    {
                        "source": "community_domain_activity_catalogue_v1",
                        "community_domain_id": 825,
                        "activity_type": "pastoral_follow_up",
                        "activity_label": "Recorded update for resolved follow-up",
                        "evidence_dimension": "care_follow_up",
                        "evidence_strength": "admin_recorded",
                        "visibility": "director_safe",
                        "evidence_reference": f"activity-record:{resolved_event_id}; activity-record:{future_referenced_event_id}",
                        "note": "Follow-up completed and next date moved forward.",
                        "follow_up_due_at": "2026-09-30T00:00:00+00:00",
                    }
                )
            },
        )

    response = client.get(
        "/community-domains/825/activities/follow-ups?due_on_or_before=2026-09-24&limit=10"
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["total"] == 1
    assert body["queue_total"] == 1
    assert body["resolved_reference_total"] == 1
    assert body["resolved_reference_scan_scope"] == "queue_activity_scan"
    assert body["resolved_reference_scan_window_exhausted"] is False
    assert body["items"][0]["activity_label"] == "Still due church follow-up"
    assert "Resolved church follow-up" not in str(body["items"])
    assert "Recorded update for resolved follow-up" not in str(body["items"])
    assert "Future referenced church follow-up" not in str(body["items"])


def test_activity_follow_up_queue_resolves_node_due_record_from_domain_update(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(conn, domain_id=827, policy_mode="admin_only")
        for node_id, node_name in ((8271, "Pastoral Team A"), (8272, "Pastoral Team B")):
            conn.execute(
                text(
                    """
                    INSERT INTO community_nodes (
                        id,
                        community_domain_id,
                        parent_node_id,
                        name,
                        node_type,
                        node_kind,
                        path,
                        depth,
                        description,
                        sort_order,
                        visibility_policy,
                        inherits_parent_policy,
                        status,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        :node_id,
                        827,
                        NULL,
                        :node_name,
                        'ministry_team',
                        'pastoral_team',
                        :node_path,
                        0,
                        NULL,
                        0,
                        'members',
                        1,
                        'active',
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                    """
                ),
                {
                    "node_id": node_id,
                    "node_name": node_name,
                    "node_path": str(node_id),
                },
            )
        conn.execute(
            text(
                """
                INSERT INTO trust_events (
                    event_type,
                    clan_id,
                    actor_user_id,
                    subject_user_id,
                    meta_json,
                    created_at
                )
                VALUES (
                    'community_domain.activity_recorded',
                    1,
                    1,
                    1,
                    :meta_json,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "meta_json": json.dumps(
                    {
                        "source": "community_domain_activity_catalogue_v1",
                        "community_domain_id": 827,
                        "community_node_id": 8271,
                        "activity_type": "pastoral_follow_up",
                        "activity_label": "Node scoped resolved church follow-up",
                        "evidence_dimension": "care_follow_up",
                        "evidence_strength": "admin_recorded",
                        "visibility": "director_safe",
                        "note": "Next follow-up date: 2026-09-23",
                        "follow_up_due_at": "2026-09-23T00:00:00+00:00",
                    }
                )
            },
        )
        resolved_event_id = conn.execute(text("SELECT last_insert_rowid()")).scalar_one()
        conn.execute(
            text(
                """
                INSERT INTO trust_events (
                    event_type,
                    clan_id,
                    actor_user_id,
                    subject_user_id,
                    meta_json,
                    created_at
                )
                VALUES (
                    'community_domain.activity_recorded',
                    1,
                    1,
                    1,
                    :meta_json,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "meta_json": json.dumps(
                    {
                        "source": "community_domain_activity_catalogue_v1",
                        "community_domain_id": 827,
                        "community_node_id": 8272,
                        "activity_type": "pastoral_follow_up",
                        "activity_label": "Other node church follow-up",
                        "evidence_dimension": "care_follow_up",
                        "evidence_strength": "admin_recorded",
                        "visibility": "director_safe",
                        "note": "Next follow-up date: 2026-09-23",
                        "follow_up_due_at": "2026-09-23T00:00:00+00:00",
                    }
                )
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO trust_events (
                    event_type,
                    clan_id,
                    actor_user_id,
                    subject_user_id,
                    meta_json,
                    created_at
                )
                VALUES (
                    'community_domain.activity_recorded',
                    1,
                    1,
                    1,
                    :meta_json,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "meta_json": json.dumps(
                    {
                        "source": "community_domain_activity_catalogue_v1",
                        "community_domain_id": 827,
                        "activity_type": "pastoral_follow_up",
                        "activity_label": "Domain-level resolved follow-up update",
                        "evidence_dimension": "care_follow_up",
                        "evidence_strength": "admin_recorded",
                        "visibility": "director_safe",
                        "evidence_reference": f"activity-record:{resolved_event_id}",
                        "note": "Follow-up completed for the node record.",
                        "follow_up_due_at": "2026-09-30T00:00:00+00:00",
                    }
                )
            },
        )

    response = client.get(
        "/community-domains/827/activities/follow-ups?due_on_or_before=2026-09-24&community_node_id=8271&include_descendants=false&limit=10"
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["community_node_ids"] == [8271]
    assert body["total"] == 0
    assert body["queue_total"] == 0
    assert body["resolved_reference_total"] == 1
    assert body["resolved_reference_scan_scope"] == "domain_activity_scan"
    assert body["resolved_reference_scanned_activity_total"] == 3
    assert body["resolved_reference_scan_window_exhausted"] is False
    assert "Node scoped resolved church follow-up" not in str(body["items"])
    assert "Other node church follow-up" not in str(body["items"])


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

def test_school_guardian_contact_records_parent_reference_without_delivery_proof(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(
            conn,
            domain_id=837,
            domain_type="school",
            template_key="school_multi_branch",
            policy_mode="admin_only",
            notice_policy_mode="admin_only",
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role, display_name)
                VALUES (2, 'school-guardian-student-2@example.com', 'hashed', 'user', 'Guardian Student Two')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO community_domain_memberships (
                    community_domain_id,
                    user_id,
                    role,
                    status,
                    title,
                    created_at,
                    updated_at
                )
                VALUES (837, 2, 'member', 'active', 'Student', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )

    inactive_res = client.post(
        "/community-domains/837/school-roster/999/guardian-contacts",
        json={"guardian_label": "Parent on file"},
    )
    assert inactive_res.status_code == 400, inactive_res.text
    assert inactive_res.json()["detail"]["code"] == "community_domain_school_guardian_contact_subject_not_active_member"

    missing_res = client.get("/community-domains/837/school-roster/guardian-contacts")
    assert missing_res.status_code == 200, missing_res.text
    missing_summary = missing_res.json()["summary"]
    assert missing_summary["active_member_total"] == 1
    assert missing_summary["active_member_with_active_contact_total"] == 0
    assert missing_summary["active_member_missing_active_contact_total"] == 1
    assert 2 in missing_summary["missing_active_contact_subject_user_ids"]
    assert "does not prove parent identity" in missing_summary["coverage_boundary"]

    create_res = client.post(
        "/community-domains/837/school-roster/2/guardian-contacts",
        json={
            "guardian_label": "Mrs Parent Two",
            "relationship": "parent",
            "channel": "whatsapp",
            "destination_reference_status": "admin_verified_off_platform",
            "destination_reference_label": "Parent WhatsApp on file",
            "contact_status": "active_attestation",
            "consent_basis": "guardian_or_authorized_contact",
            "notification_scope": "school_attendance_fee_and_notice_follow_up",
            "note": "Recorded from school office enrolment records.",
        },
    )
    assert create_res.status_code == 201, create_res.text
    body = create_res.json()
    assert "not parent identity verification" in body["message"]
    contact = body["guardian_contact"]
    assert contact["subject_user_id"] == 2
    assert contact["guardian_label"] == "Mrs Parent Two"
    assert contact["channel"] == "whatsapp"
    assert contact["provider_send_ready"] is False
    assert contact["parent_identity_verified_by_gsn"] is False
    assert contact["automatic_parent_notification"] is False
    assert contact["whatsapp_delivery_proof"] is False
    assert "not WhatsApp delivery proof" in contact["boundary"]

    list_res = client.get("/community-domains/837/school-roster/guardian-contacts")
    assert list_res.status_code == 200, list_res.text
    list_body = list_res.json()
    assert list_body["total"] == 1
    assert list_body["summary"]["active"] == 1
    assert list_body["summary"]["provider_ready"] == 0
    assert list_body["summary"]["active_member_total"] == 1
    assert list_body["summary"]["active_member_with_active_contact_total"] == 1
    assert list_body["summary"]["active_member_missing_active_contact_total"] == 0
    assert 2 not in list_body["summary"]["missing_active_contact_subject_user_ids"]
    assert list_body["items"][0]["destination_reference_label"] == "Parent WhatsApp on file"

    filtered_res = client.get("/community-domains/837/school-roster/guardian-contacts?subject_user_id=2")
    assert filtered_res.status_code == 200, filtered_res.text
    assert filtered_res.json()["total"] == 1

    with engine.begin() as conn:
        contact_event_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM trust_events
                WHERE event_type = 'community_domain.school_guardian_contact.recorded'
                AND meta_json LIKE :domain_like
                """
            ),
            {"domain_like": '%community_domain_id%837%'},
        ).scalar_one()
    assert contact_event_count == 1


def test_school_fee_expected_payment_tracks_student_fee_without_bank_confirmation(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(
            conn,
            domain_id=832,
            domain_type="school",
            template_key="school_multi_branch",
            policy_mode="admin_only",
            notice_policy_mode="admin_only",
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role, display_name)
                VALUES (2, 'school-fee-student-2@example.com', 'hashed', 'user', 'School Fee Student Two')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO community_domain_memberships (
                    community_domain_id,
                    user_id,
                    role,
                    status,
                    title,
                    created_at,
                    updated_at
                )
                VALUES (832, 2, 'member', 'active', 'Student', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )

    missing_res = client.get("/community-domains/832/school-fees/expected-payments")
    assert missing_res.status_code == 200, missing_res.text
    missing_summary = missing_res.json()["summary"]
    assert missing_summary["active_member_total"] == 1
    assert missing_summary["active_member_with_expected_payment_total"] == 0
    assert missing_summary["active_member_missing_expected_payment_total"] == 1
    assert 2 in missing_summary["missing_expected_payment_subject_user_ids"]
    assert "does not prove debt" in missing_summary["coverage_boundary"]

    create_res = client.post(
        "/community-domains/832/school-fees/expected-payments",
        json={
            "subject_user_id": 2,
            "amount": "50000.00",
            "currency": "NGN",
            "term_label": "2026 first term",
            "fee_label": "School fees",
            "campus_label": "Campus 3",
            "note": "Parent has been notified manually by bursar.",
        },
    )
    assert create_res.status_code == 201, create_res.text
    body = create_res.json()
    payment = body["expected_payment"]
    assert body["already_exists"] is False
    assert payment["expected_type"] == "school_fee"
    assert payment["subject_user_id"] == 2
    assert payment["student_display_name"] == "School Fee Student Two"
    assert payment["amount"] == "50000.00"
    assert payment["currency"] == "NGN"
    assert payment["status"] == "expected"
    assert payment["payment_status_label"] == "Awaiting proof or bank match"
    assert payment["reference_display"].startswith("GSN-SF-CD832-U2-")
    assert payment["meta"]["automatic_bank_confirmation"] is False
    assert payment["meta"]["parent_whatsapp_sent_by_gsn"] is False
    assert "not automatic bank confirmation" in body["boundary"]

    duplicate_res = client.post(
        "/community-domains/832/school-fees/expected-payments",
        json={
            "subject_user_id": 2,
            "amount": "50000.00",
            "currency": "NGN",
            "term_label": "2026 first term",
            "fee_label": "School fees",
        },
    )
    assert duplicate_res.status_code == 201, duplicate_res.text
    assert duplicate_res.json()["already_exists"] is True
    assert duplicate_res.json()["expected_payment"]["id"] == payment["id"]

    list_res = client.get("/community-domains/832/school-fees/expected-payments")
    assert list_res.status_code == 200, list_res.text
    listed_body = list_res.json()
    assert listed_body["summary"]["expected"] == 1
    assert listed_body["summary"]["confirmed"] == 0
    assert listed_body["summary"]["active_member_total"] == 1
    assert listed_body["summary"]["active_member_with_expected_payment_total"] == 1
    assert listed_body["summary"]["active_member_missing_expected_payment_total"] == 0
    assert 2 not in listed_body["summary"]["missing_expected_payment_subject_user_ids"]
    listed = listed_body["items"][0]
    assert listed["id"] == payment["id"]
    assert listed["campus_label"] == "Campus 3"
    assert listed["boundary"] == listed_body["boundary"]

    proof_res = client.post(
        f"/community-domains/832/school-fees/expected-payments/{payment['id']}/proof-logs",
        json={
            "proof_source": "whatsapp_screenshot",
            "proof_status": "submitted",
            "proof_reference": "parent-chat-slip-001",
            "amount_reported": "50000.00",
            "note": "Parent sent a transfer screenshot to the bursar.",
        },
    )
    assert proof_res.status_code == 201, proof_res.text
    proof_body = proof_res.json()
    assert "not bank confirmation" in proof_body["message"]
    assert proof_body["proof"]["proof_source"] == "whatsapp_screenshot"
    assert proof_body["proof"]["amount_reported"] == "50000.00"
    assert proof_body["proof"]["automatic_bank_confirmation"] is False
    assert proof_body["proof"]["receipt_issued_by_gsn"] is False
    assert "not automatic bank confirmation" in proof_body["boundary"]
    assert proof_body["expected_payment"]["status"] == "expected"
    assert proof_body["expected_payment"]["payment_status_label"] == "Proof uploaded"
    assert proof_body["expected_payment"]["bank_event_id"] is None

    proof_list_res = client.get("/community-domains/832/school-fees/expected-payments")
    assert proof_list_res.status_code == 200, proof_list_res.text
    proof_list_body = proof_list_res.json()
    assert proof_list_body["summary"]["expected"] == 1
    assert proof_list_body["summary"]["confirmed"] == 0
    assert proof_list_body["summary"]["proof_uploaded"] == 1
    assert proof_list_body["summary"]["active_member_with_proof_total"] == 1
    proof_listed = proof_list_body["items"][0]
    assert proof_listed["payment_status_label"] == "Proof uploaded"
    assert proof_listed["meta"]["latest_payment_proof"]["proof_reference"] == "parent-chat-slip-001"
    assert proof_listed["meta"]["latest_payment_proof"]["automatic_bank_confirmation"] is False

    with engine.begin() as conn:
        stored = conn.execute(
            text(
                """
                SELECT expected_type, status, trust_event_id, meta_json
                FROM expected_payments
                WHERE id = :payment_id
                """
            ),
            {"payment_id": payment["id"]},
        ).mappings().one()

    assert stored["expected_type"] == "school_fee"
    assert stored["status"] == "expected"
    assert stored["trust_event_id"] is not None
    stored_meta = json.loads(stored["meta_json"] or "{}")
    assert stored_meta["feature_code"] == "school_fee_tracking"
    assert stored_meta["latest_payment_proof"]["proof_status"] == "submitted"
    assert stored_meta["latest_payment_proof"]["automatic_bank_confirmation"] is False
    assert stored_meta["latest_payment_proof"]["receipt_issued_by_gsn"] is False

    with engine.begin() as conn:
        proof_event_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM trust_events
                WHERE event_type = 'community_domain.school_fee_payment_proof.logged'
                AND meta_json LIKE :domain_like
                """
            ),
            {"domain_like": '%community_domain_id%832%'},
        ).scalar_one()
    assert proof_event_count == 1


def test_school_fee_bulk_open_missing_active_roster_is_idempotent(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(
            conn,
            domain_id=838,
            domain_type="school",
            template_key="school_multi_branch",
            policy_mode="admin_only",
            notice_policy_mode="admin_only",
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role, display_name)
                VALUES
                  (2, 'bulk-fee-student-2@example.com', 'hashed', 'user', 'Bulk Fee Student Two'),
                  (3, 'bulk-fee-student-3@example.com', 'hashed', 'user', 'Bulk Fee Student Three')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO community_domain_memberships (
                    community_domain_id,
                    user_id,
                    role,
                    status,
                    title,
                    created_at,
                    updated_at
                )
                VALUES
                  (838, 2, 'member', 'active', 'Student', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                  (838, 3, 'member', 'active', 'Student', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )

    missing_res = client.get("/community-domains/838/school-fees/expected-payments")
    assert missing_res.status_code == 200, missing_res.text
    assert missing_res.json()["summary"]["active_member_total"] == 2
    assert missing_res.json()["summary"]["active_member_missing_expected_payment_total"] == 2

    bulk_res = client.post(
        "/community-domains/838/school-fees/expected-payments/bulk-open-missing",
        json={
            "amount": "42000.00",
            "currency": "NGN",
            "term_label": "2026 first term",
            "fee_label": "School fees",
            "campus_label": "Campus 3",
            "note": "Bulk opened from school governance packet.",
        },
    )
    assert bulk_res.status_code == 201, bulk_res.text
    bulk_body = bulk_res.json()
    assert bulk_body["opened_count"] == 2
    assert bulk_body["already_existing_count"] == 0
    assert bulk_body["target_member_count"] == 2
    assert len(bulk_body["items"]) == 2
    assert "not debt proof" in bulk_body["message"]
    assert {item["subject_user_id"] for item in bulk_body["items"]} == {2, 3}

    duplicate_res = client.post(
        "/community-domains/838/school-fees/expected-payments/bulk-open-missing",
        json={
            "amount": "42000.00",
            "currency": "NGN",
            "term_label": "2026 first term",
            "fee_label": "School fees",
            "campus_label": "Campus 3",
        },
    )
    assert duplicate_res.status_code == 201, duplicate_res.text
    duplicate_body = duplicate_res.json()
    assert duplicate_body["opened_count"] == 0
    assert duplicate_body["already_existing_count"] == 2

    list_res = client.get("/community-domains/838/school-fees/expected-payments")
    assert list_res.status_code == 200, list_res.text
    summary = list_res.json()["summary"]
    assert summary["total"] == 2
    assert summary["active_member_with_expected_payment_total"] == 2
    assert summary["active_member_missing_expected_payment_total"] == 0
    assert summary["missing_expected_payment_subject_user_ids"] == []

    with engine.begin() as conn:
        payment_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM expected_payments
                WHERE expected_type = 'school_fee'
                  AND reference_display LIKE 'GSN-SF-CD838-%'
                """
            )
        ).scalar_one()
    assert payment_count == 2


def test_school_staff_scan_attendance_records_student_without_student_phone(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(
            conn,
            domain_id=831,
            domain_type="school",
            template_key="school_multi_branch",
            policy_mode="admin_only",
            notice_policy_mode="admin_only",
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role, display_name)
                VALUES (2, 'school-student-2@example.com', 'hashed', 'user', 'School Student Two')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO community_domain_memberships (
                    community_domain_id,
                    user_id,
                    role,
                    status,
                    title,
                    created_at,
                    updated_at
                )
                VALUES (831, 2, 'member', 'active', 'Student', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )

    session_res = client.post(
        "/community-domains/831/attendance-sessions",
        json={
            "programme_label": "Campus 3 morning arrival",
            "method": "staff_scan",
            "window_minutes": 120,
            "note": "Teacher scans student ID cards at the gate.",
        },
    )
    assert session_res.status_code == 201, session_res.text
    session = session_res.json()["attendance_session"]
    assert session["attendance_method"] == "staff_scan"
    assert session["evidence_strength"] == "admin_attested"
    assert "automatic parent notification" in session["boundary"]

    checkin_res = client.post(
        f'/community-domains/831/attendance-sessions/{session["event_id"]}/admin-check-ins',
        json={
            "subject_user_id": 2,
            "method": "staff_scan",
            "note": "Student ID card scanned by gate teacher.",
        },
    )
    assert checkin_res.status_code == 200, checkin_res.text
    checkin = checkin_res.json()["attendance_checkin"]
    assert checkin_res.json()["already_recorded"] is False
    assert checkin["checked_in_user_id"] == 2
    assert checkin["recorded_by_user_id"] == 1
    assert checkin["attendance_method"] == "staff_scan"
    assert checkin["evidence_strength"] == "admin_attested"
    assert checkin["staff_recorded"] is True
    assert checkin["student_phone_required"] is False
    assert checkin["parent_notification_sent_by_gsn"] is False

    duplicate_res = client.post(
        f'/community-domains/831/attendance-sessions/{session["event_id"]}/admin-check-ins',
        json={"subject_user_id": 2, "method": "staff_scan"},
    )
    assert duplicate_res.status_code == 200, duplicate_res.text
    assert duplicate_res.json()["already_recorded"] is True

    list_res = client.get("/community-domains/831/attendance-sessions")
    assert list_res.status_code == 200, list_res.text
    listed = list_res.json()["items"][0]
    assert listed["checkin_count"] == 1
    assert listed["checked_in_user_ids"] == [2]
    assert listed["method_counts"] == {"staff_scan": 1}

    public_res = client.get(session["public_api_path"])
    assert public_res.status_code == 200, public_res.text
    public_session = public_res.json()["attendance_session"]
    assert public_session["checkin_count"] == 1
    assert "checked_in_user_ids" not in public_session
    assert "School Student Two" not in str(public_session)

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
            {"domain_like": '%community_domain_id%831%'},
        ).scalar_one()

    assert checkin_count == 1



def test_school_attendance_card_code_records_student_without_student_phone(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(
            conn,
            domain_id=836,
            domain_type="school",
            template_key="school_multi_branch",
            policy_mode="admin_only",
            notice_policy_mode="admin_only",
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role, display_name)
                VALUES (2, 'school-card-student-2@example.com', 'hashed', 'user', 'School Card Student Two')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO community_domain_memberships (
                    community_domain_id,
                    user_id,
                    role,
                    status,
                    title,
                    created_at,
                    updated_at
                )
                VALUES (836, 2, 'member', 'active', 'Student', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )

    members_res = client.get("/community-domains/836/members")
    assert members_res.status_code == 200, members_res.text
    member = next(item for item in members_res.json()["items"] if item["user_id"] == 2)
    assert member["attendance_card_code"] == "GSN-ATT-CD836-U2"
    assert member["attendance_card_qr_value"] == "GSN-ATT-CD836-U2"
    assert "do not expose student names publicly" in member["attendance_card_boundary"]
    assert "automatic parent notification" in members_res.json()["boundary"]

    session_res = client.post(
        "/community-domains/836/attendance-sessions",
        json={
            "programme_label": "Campus 1 morning gate",
            "method": "staff_scan",
            "window_minutes": 120,
            "note": "Teacher scans printed GSN student cards.",
        },
    )
    assert session_res.status_code == 201, session_res.text
    session = session_res.json()["attendance_session"]

    guardian_contact_res = client.post(
        "/community-domains/836/school-roster/2/guardian-contacts",
        json={
            "guardian_label": "Mrs Card Parent",
            "relationship": "parent",
            "channel": "whatsapp",
            "destination_reference_status": "admin_verified_off_platform",
            "destination_reference_label": "Card parent WhatsApp on file",
            "contact_status": "active_attestation",
            "consent_basis": "guardian_or_authorized_contact",
            "notification_scope": "school_attendance_fee_and_notice_follow_up",
        },
    )
    assert guardian_contact_res.status_code == 201, guardian_contact_res.text
    guardian_contact = guardian_contact_res.json()["guardian_contact"]

    premature_notification_res = client.post(
        f'/community-domains/836/attendance-sessions/{session["event_id"]}/parent-notification-logs',
        json={
            "subject_user_id": 2,
            "channel": "whatsapp",
            "delivery_status": "prepared",
            "destination_reference_status": "on_file",
            "destination_reference_label": "Parent on file",
        },
    )
    assert premature_notification_res.status_code == 409, premature_notification_res.text
    assert premature_notification_res.json()["detail"]["code"] == "community_domain_attendance_checkin_required"

    card_res = client.post(
        f'/community-domains/836/attendance-sessions/{session["event_id"]}/admin-card-check-ins',
        json={
            "card_code": "GSN-ATT-CD836-U2",
            "method": "staff_scan",
            "note": "Printed card scanned by gate teacher.",
        },
    )
    assert card_res.status_code == 200, card_res.text
    body = card_res.json()
    assert body["already_recorded"] is False
    assert body["card_code"] == "GSN-ATT-CD836-U2"
    assert "not automatic parent notification" in body["message"]
    checkin = body["attendance_checkin"]
    assert checkin["checked_in_user_id"] == 2
    assert checkin["staff_recorded"] is True
    assert checkin["student_phone_required"] is False
    assert checkin["parent_notification_sent_by_gsn"] is False
    assert checkin["capture_method"] == "staff_card_scan"

    duplicate_res = client.post(
        f'/community-domains/836/attendance-sessions/{session["event_id"]}/admin-card-check-ins',
        json={"card_code": "GSN-ATT-CD836-U2", "method": "staff_scan"},
    )
    assert duplicate_res.status_code == 200, duplicate_res.text
    assert duplicate_res.json()["already_recorded"] is True

    notification_res = client.post(
        f'/community-domains/836/attendance-sessions/{session["event_id"]}/parent-notification-logs',
        json={
            "subject_user_id": 2,
            "channel": "whatsapp",
            "delivery_status": "sent_outside_gsn",
            "destination_reference_status": "on_file",
            "destination_reference_label": "Parent/guardian on file",
            "note": "Office WhatsApp prompt prepared from the attendance record.",
        },
    )
    assert notification_res.status_code == 200, notification_res.text
    notification_body = notification_res.json()
    assert "not WhatsApp" in notification_body["message"]
    notification_log = notification_body["parent_notification_log"]
    assert notification_log["subject_user_id"] == 2
    assert notification_log["channel"] == "whatsapp"
    assert notification_log["delivery_status"] == "sent_outside_gsn"
    assert notification_log["sent_by_gsn"] is False
    assert notification_log["whatsapp_delivery_proof"] is False
    assert notification_log["automatic_parent_notification"] is False
    assert notification_log["guardian_contact_snapshot_used"] is True
    assert notification_log["guardian_contact_event_id"] == guardian_contact["event_id"]
    assert notification_log["guardian_contact_label"] == "Mrs Card Parent"
    assert notification_log["guardian_contact_channel"] == "whatsapp"
    assert notification_log["guardian_contact_reference_label"] == "Card parent WhatsApp on file"
    assert "not WhatsApp delivery proof" in notification_log["boundary"]

    notification_list_res = client.get(
        f'/community-domains/836/attendance-sessions/{session["event_id"]}/parent-notification-logs'
    )
    assert notification_list_res.status_code == 200, notification_list_res.text
    assert notification_list_res.json()["total"] == 1
    assert notification_list_res.json()["items"][0]["attendance_session_event_id"] == session["event_id"]

    wrong_domain_res = client.post(
        f'/community-domains/836/attendance-sessions/{session["event_id"]}/admin-card-check-ins',
        json={"card_code": "GSN-ATT-CD999-U2", "method": "staff_scan"},
    )
    assert wrong_domain_res.status_code == 400, wrong_domain_res.text
    assert wrong_domain_res.json()["detail"]["code"] == "community_domain_attendance_card_wrong_domain"

    public_res = client.get(session["public_api_path"])
    assert public_res.status_code == 200, public_res.text
    public_session = public_res.json()["attendance_session"]
    assert "attendance_card_code" not in str(public_session)
    assert "School Card Student Two" not in str(public_session)

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
            {"domain_like": '%community_domain_id%836%'},
        ).scalar_one()

    assert checkin_count == 1

def test_church_live_attendance_admin_follow_up_snapshot_has_private_safe_candidate_ids(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(conn, domain_id=822, policy_mode="admin_only", notice_policy_mode="admin_only")
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role, display_name)
                VALUES
                  (2, 'church-member-2@example.com', 'hashed', 'user', 'Church Member Two'),
                  (3, 'church-member-3@example.com', 'hashed', 'user', 'Church Member Three')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO community_domain_memberships (
                    community_domain_id,
                    user_id,
                    role,
                    status,
                    title,
                    created_at,
                    updated_at
                )
                VALUES
                  (822, 1, 'owner', 'active', 'Pastor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                  (822, 2, 'member', 'active', 'Member', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                  (822, 3, 'member', 'active', 'Member', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )

    session_res = client.post(
        "/community-domains/822/attendance-sessions",
        json={"programme_label": "Sunday service follow-up test", "method": "qr", "window_minutes": 45},
    )
    assert session_res.status_code == 201, session_res.text
    session = session_res.json()["attendance_session"]
    opening_snapshot = session["follow_up_snapshot"]
    assert opening_snapshot["expected_member_count"] == 3
    assert opening_snapshot["present_member_count"] == 0
    assert opening_snapshot["follow_up_needed_count"] == 3
    assert opening_snapshot["follow_up_candidate_user_ids"] == [1, 2, 3]
    assert opening_snapshot["follow_up_status"] == "care_follow_up_needed"
    assert "follow_up_needed_members" not in opening_snapshot

    public_res = client.get(session["public_api_path"])
    assert public_res.status_code == 200, public_res.text
    public_session = public_res.json()["attendance_session"]
    assert "follow_up_snapshot" not in public_session
    assert "checked_in_user_ids" not in public_session
    assert "follow_up_candidate_user_ids" not in str(public_session)

    checkin_res = client.post(
        f'{session["public_api_path"]}/check-ins',
        json={"method": "qr"},
    )
    assert checkin_res.status_code == 200, checkin_res.text

    list_res = client.get("/community-domains/822/attendance-sessions")
    assert list_res.status_code == 200, list_res.text
    listed = list_res.json()["items"][0]
    snapshot = listed["follow_up_snapshot"]
    assert listed["checked_in_user_ids"] == [1]
    assert snapshot["expected_member_count"] == 3
    assert snapshot["present_member_count"] == 1
    assert snapshot["follow_up_needed_count"] == 2
    assert snapshot["follow_up_candidate_user_ids"] == [2, 3]
    assert snapshot["follow_up_status"] == "care_follow_up_needed"
    assert "Do not publish an absence list" in snapshot["next_step"]
    assert "roster user IDs" in snapshot["boundary"]
    assert "member names or contact details" in snapshot["boundary"]
    assert "Church Member Two" not in str(snapshot)
    assert "church-member-2@example.com" not in str(snapshot)


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
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role, display_name)
                VALUES (2, 'church-admin-2@example.com', 'hashed', 'user', 'Church Admin Two')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO community_domain_memberships (
                    community_domain_id,
                    user_id,
                    role,
                    status,
                    title,
                    created_at,
                    updated_at
                )
                VALUES (821, 2, 'admin', 'active', 'Follow-up team', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )

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
    assert response_res.json()["admin_notifications_created"] == 1
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
        notification = conn.execute(
            text(
                """
                SELECT title, message, action_url, action_label
                FROM notifications
                WHERE user_id = 2
                  AND kind = 'community_domain.response.admin_review'
                """
            )
        ).mappings().one()

    assert response_count == 1
    assert "Follow-up response" in notification["title"]
    assert "Review it inside GSN" in notification["message"]
    assert "youth programme" not in notification["message"]
    assert "Church Admin Two" not in notification["message"]
    assert "church-admin-2@example.com" not in notification["message"]
    assert notification["action_url"] == "/app/community-domain/821?lane=governance"
    assert notification["action_label"] == "Open Response Review"


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



def test_school_notice_acknowledgement_tracks_signed_in_ack_without_whatsapp_delivery(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    with engine.begin() as conn:
        _seed_domain(
            conn,
            domain_id=835,
            domain_type="school_multi_branch",
            template_key="school_multi_branch",
            policy_mode="admin_only",
            notice_policy_mode="admin_only",
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role, display_name)
                VALUES
                  (1, 'pytest@example.com', 'hashed', 'admin', 'School Owner'),
                  (2, 'parent-two@example.com', 'hashed', 'user', 'Parent Two'),
                  (3, 'parent-three@example.com', 'hashed', 'user', 'Parent Three')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO community_domain_memberships (
                    community_domain_id,
                    user_id,
                    role,
                    status,
                    title,
                    created_at,
                    updated_at
                )
                VALUES
                  (835, 1, 'owner', 'active', 'Proprietor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                  (835, 2, 'member', 'active', 'Parent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                  (835, 3, 'member', 'active', 'Parent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )

    notice_res = client.post(
        "/community-domains/835/notices",
        json={
            "body": "School fees are due this Friday. Please acknowledge this notice in GSN.",
            "expiry_policy": "standard",
            "public_qr_enabled": True,
        },
    )
    assert notice_res.status_code == 200, notice_res.text
    notice = notice_res.json()["notice"]

    list_res = client.get("/community-domains/835/notices")
    assert list_res.status_code == 200, list_res.text
    listed_notice = list_res.json()["notices"][0]
    summary = listed_notice["acknowledgement_summary"]
    assert summary["total_active_members"] == 3
    assert summary["acknowledged_count"] == 0
    assert summary["not_acknowledged_count"] == 3
    assert summary["not_acknowledged_user_ids"] == [1, 2, 3]
    assert summary["whatsapp_delivery_proof"] is False
    assert "not WhatsApp delivery proof" in summary["boundary"]

    public_res = client.get(notice["public_api_path"])
    assert public_res.status_code == 200, public_res.text
    public_notice = public_res.json()["notice"]
    assert "acknowledgement_summary" not in public_notice
    assert "not_acknowledged_user_ids" not in public_res.text
    assert "Parent Two" not in public_res.text
    assert "parent-two@example.com" not in public_res.text

    ack_res = client.post(
        f"/community-domains/835/notices/{notice['event_id']}/acknowledgements",
        json={},
    )
    assert ack_res.status_code == 200, ack_res.text
    ack_summary = ack_res.json()["acknowledgement_summary"]
    assert ack_summary["acknowledged_count"] == 1
    assert ack_summary["not_acknowledged_count"] == 2
    assert ack_summary["viewer_acknowledged"] is True
    assert ack_summary["acknowledged_user_ids"] == [1]
    assert ack_summary["not_acknowledged_user_ids"] == [2, 3]
    assert ack_summary["whatsapp_delivery_proof"] is False

    duplicate_ack_res = client.post(
        f"/community-domains/835/notices/{notice['event_id']}/acknowledgements",
        json={},
    )
    assert duplicate_ack_res.status_code == 200, duplicate_ack_res.text
    duplicate_summary = duplicate_ack_res.json()["acknowledgement_summary"]
    assert duplicate_summary["acknowledged_count"] == 1

    with engine.begin() as conn:
        ack_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM trust_events
                WHERE event_type = 'community_domain.notice.acknowledged'
                  AND meta_json LIKE :domain_like
                """
            ),
            {"domain_like": '%community_domain_id%835%'},
        ).scalar_one()

    assert ack_count == 1
