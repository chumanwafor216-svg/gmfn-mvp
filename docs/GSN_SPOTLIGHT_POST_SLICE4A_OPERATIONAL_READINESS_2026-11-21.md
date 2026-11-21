# GSN Spotlight Post-Slice 4A Operational Readiness

Date: 2026-11-21
Accepted and tested revision: `3256ad8dfe18873cd70b64ea9496b1196541a2b4`
Purpose: smallest safe, measurement-only production proposal
Release boundary: proposal only; no deployment, payment activation, public-discovery activation, customer terms, merchant contact or `main` promotion

## Decision

**Conditional go for measurement-only observation; no-go for any commercial Spotlight activity.**

The accepted candidate can report existing Spotlight serving activity without creating a paid commitment. The report is an admin-only `GET`, its service performs database reads, and it verifies that the number of `paid_spotlight.day` spend orders is unchanged before and after each report.

This is not yet evidence of sellable capacity. A final presentation lease is viewer-triggered activity, not a purchased or genuinely supplied scheduled opportunity. Fourteen valid days are required before a separate capacity decision.

## 1. Exact release contents

### Backend code required

- `gmfn_backend/app/services/spotlight_capacity_measurement_service.py` — produces the read-only `spotlight-capacity-observation.v2` report.
- `gmfn_backend/app/api/routes/pipeline_credits.py` — exposes the admin-only `GET /pipeline-credits/admin/spotlight-capacity-measurement` route.
- `gmfn_backend/app/services/spotlight_presentation_service.py` — existing source of final presentation leases, visible-supply acknowledgements and qualifying impressions; no measurement-release change is required.
- `gmfn_backend/app/services/payment_operations_policy.py` — global financial emergency stop, default off.
- `gmfn_backend/app/services/spotlight_commercial_access_service.py` — paid-Spotlight financial stop and pilot entitlement authority, default off.
- `gmfn_backend/app/services/spotlight_commercial_service.py` — commercial booking workflow, default off.
- `gmfn_backend/app/api/router.py` — already includes the Pipeline Credit router.

No frontend change, new worker, scheduler or recurring job is required for the smallest release. The measurement operator calls the report once per completed local day and stores the returned aggregate JSON in the controlled observation record.

### Database state required

The application must run at the accepted candidate's single Alembic head:

- `20261121_spotlight_slice4_payments`
- `20261121_spotlight_slice4a_completion` — current head

The measurement report reads existing Spotlight presentation/exposure records and, if present, existing commercial booking/opportunity records. It does not create a measurement table. If production is already at head, no migration action is needed. If it is behind, the separately authorised release must back up PostgreSQL, record `alembic current`, run `alembic upgrade head`, and verify the resulting head before application traffic is restored.

Do not seed acquisition packs, pilot entitlements, pricing policies, commercial capacity windows or bookings for this observation.

### Exact environment configuration

Set and verify these values explicitly in production, even where the code already defaults to off:

```text
GSN_PAYMENT_OPERATIONS_ENABLED=0
GSN_PAID_SPOTLIGHT_PAYMENT_OPERATIONS_ENABLED=0
GSN_PAID_SPOTLIGHT_V1_ENABLED=0
GSN_MEMBER_CREDIT_SPOTLIGHT_WRITES_ENABLED=0
GSN_SPOTLIGHT_LIFECYCLE_WRITES_ENABLED=0
GMFN_ENABLE_RECONCILIATION_LOOP=0
GSN_ENABLE_SPOTLIGHT_RETENTION_LOOP=0
GSN_PUBLIC_MERCHANT_DISCOVERY_V1_ENABLED=0
```

Preserve all other current production values. In particular, do not alter ordinary existing Spotlight serving merely to collect measurements.

`render.yaml` currently records the reconciliation and retention-loop stops but does not explicitly record all financial and paid-Spotlight stops. The separately authorised release should add the explicit off values to Render configuration or the Blueprint before deployment. This proposal does not change them.

## 2. Financial isolation proof

### Read path

The observation call is:

```http
GET /pipeline-credits/admin/spotlight-capacity-measurement
    ?clan_id=<community-id>
    &service_date=YYYY-MM-DD
    &timezone_name=<IANA-timezone>
```

It requires an authenticated GSN administrator. It has no request body and does not call acquisition, quote, spending, booking, settlement or reconciliation mutation services.

The measurement service performs `SELECT`/count operations over:

- `spotlight_presentation_leases`;
- `spotlight_exposure_events`;
- `spotlight_campaigns` and marketplace placement relationships;
- existing `spotlight_commercial_bookings` and `spotlight_commercial_opportunities`, if any;
- a before/after count of `paid_spotlight.day` spend orders.

Every accepted report must contain:

```text
safety.created_paid_service_commitment = false
safety.paid_service_commitments_before = safety.paid_service_commitments_after
safety.selection_is_supplied_turn = false
safety.elapsed_time_is_supplied_turn = false
safety.repeated_presentations_are_distinct_scheduled_turns = false
safety.overnight_is_sellable_capacity = false
```

### Mutation prevention

- `GSN_PAYMENT_OPERATIONS_ENABLED=0` blocks globally governed payment instructions, credit allocation/debit, purchases and downstream payment applications.
- `GSN_PAID_SPOTLIGHT_PAYMENT_OPERATIONS_ENABLED=0` independently blocks paid-Spotlight collection and spending.
- `GSN_PAID_SPOTLIGHT_V1_ENABLED=0` blocks the commercial quote/booking workflow.
- No pilot entitlement is granted.
- Reconciliation and retention loops remain off.
- The observation procedure never calls a `POST`, `PUT`, `PATCH` or `DELETE` route.

The scoped Spotlight switch cannot enable unrelated financial operations. The global switch remains deliberately broad, so it must stay off throughout observation. A release is an immediate no-go if any listed value is absent from the operator evidence or resolves truthy at runtime.

### Verified evidence

- GitHub Actions run `44864859261` passed at exact SHA `3256ad8dfe18873cd70b64ea9496b1196541a2b4`.
- PostgreSQL job `136726150480` passed its required 12 tests with zero skips.
- Full backend job `136726150704` passed 1,861 tests with 36 documented infrastructure-dependent skips.
- Focused tests prove that measurement creates no paid commitment and that global-on/scoped-off and global-off/scoped-on states both prevent paid Spotlight.

## 3. Daily measurement contract

The authoritative community timezone is supplied as an IANA name. The report converts one local service date to its exact UTC bounds, including 23-hour and 25-hour daylight-saving days.

| Local period | Window | Commercial interpretation |
| --- | --- | --- |
| Overnight | 00:00-05:00 | measured separately; never ordinary sellable-capacity evidence |
| Morning | 05:00-12:00 | evidence candidate for the ten-opportunity morning allocation |
| Afternoon | 12:00-18:00 | evidence candidate for the ten-opportunity afternoon allocation |
| Evening | 18:00-24:00 | evidence candidate for the ten-opportunity evening allocation |

The report keeps these measures separate for the full day and each period:

- final presentations issued;
- recognised viewers receiving final presentations;
- visible presentations (`served` event);
- qualifying impressions;
- interrupted or unqualified presentations;
- scheduled commercial opportunities;
- genuinely supplied commercial opportunities;
- missed commercial opportunities;
- active campaigns and pre-existing promotional obligations.

Ordinary existing serving produces the first five measures as users encounter Spotlight. With commercial flags off, the scheduled/supplied/missed paid-opportunity measures should remain zero unless historical or already-authorised records exist. That is correct; measurement must not fabricate paid supply.

## 4. Fourteen-day observation plan

### Scope

- Select exactly one production community for the first observation.
- Record its immutable `clan_id`, authoritative IANA timezone and observation start date in the release ticket.
- Observe 14 consecutive completed local dates under normal existing Spotlight serving.
- If a day is invalid, retain it as an incident record and extend the period until 14 valid days exist. Never silently delete a bad or quiet day.

### Daily procedure

1. After the local date is complete, the Measurement Operator calls the admin report for that exact community, date and timezone.
2. Save the unedited response as `spotlight-capacity-observation.v2_<clan-id>_<YYYY-MM-DD>_<timezone>.json`.
3. Record request time, operator account ID, candidate SHA and a SHA-256 hash of the JSON in the observation register.
4. Confirm all safety fields and data-quality checks before marking the day valid.
5. Add the aggregate row to the 14-day CSV/report. Do not export viewer IDs or raw personal records.
6. A second reviewer signs the daily row by the next business day.

### Required daily report columns

```text
community_id, service_date, timezone, utc_start, utc_end, utc_hours,
active_campaigns, existing_paid_bookings, outstanding_paid_opportunities,
overnight_final, overnight_visible, overnight_qualified,
morning_final, morning_visible, morning_qualified,
afternoon_final, afternoon_visible, afternoon_qualified,
evening_final, evening_visible, evening_qualified,
interrupted_or_unqualified, scheduled, genuinely_supplied, missed,
commitments_before, commitments_after, created_commitment,
app_revision, operator_account_id, reviewer, validity, incident_reference
```

### Data-quality checks

- Community ID and timezone match the approved observation register.
- UTC duration is 23, 24 or 25 hours and agrees with the IANA local-date boundary.
- Overnight activity is not merged into evening.
- All counts are non-negative and daypart totals reconcile to daily totals.
- Presentation IDs and event idempotency remain authoritative; the exported report contains aggregates only.
- `created_paid_service_commitment` is false and before/after commitment counts match.
- Any non-zero scheduled, supplied or missed commercial count is investigated against pre-existing records before the day is accepted.
- A zero-activity day is retained. It may show low observed demand, an inactive campaign or an outage; it does not prove zero technical capacity by itself.
- Record deployments, outages, database incidents, campaign absence and abnormal response latency.
- Qualifying impressions, visible presentations and final leases are compared for anomalies, but none is relabelled as another measure to force reconciliation.

### Responsibilities

The release ticket must name the human and account ID for each role before deployment:

- **Accountable Product Owner — Chuma Nwafor:** approves the community, timezone, start date, stop/restart decision and final interpretation; cannot approve a commercial capacity from incomplete evidence.
- **Release Controller — named Render/repository administrator:** verifies revision, backup, migrations and all disabled flags; performs deployment or rollback only after separate written authorisation.
- **Measurement Operator — named GSN admin account:** runs the prior-day report, stores evidence and completes the daily checklist. This account receives no new payment or commercial entitlement.
- **Data Reviewer — named second person:** checks hashes, totals, incidents and validity independently.
- **Privacy/Legal Reviewer — named adviser before any paid pilot:** approves privacy information, ad identification, retention and customer terms; not required merely to operate the aggregate internal observation if current privacy authority already covers the underlying serving.

No-go until the unnamed operational roles are filled in the release ticket. Chuma may remain accountable, but the proposal does not invent employee names or permissions that have not been confirmed.

### Stop conditions

Stop collection and preserve evidence if any of these occurs:

- any financial, paid-Spotlight, member-credit-write, lifecycle-write, reconciliation, retention or public-discovery flag becomes enabled;
- a paid acquisition, debit, booking or service obligation is created;
- commitment counts change during a report;
- a non-admin can access the route;
- raw viewer identifiers appear in the exported report;
- the community or timezone differs from the register;
- a schema/revision mismatch is detected;
- measurement causes material latency, error-rate or database-load regression;
- two consecutive daily reports are missed or corrupted;
- serving behaviour changes during the observation without a documented restart decision.

After a stop, do not fill gaps with estimates. Correct the cause and either extend the observation or restart it where comparability was materially lost.

## 5. Separately authorised deployment and rollback

### Deployment procedure

1. Confirm branch candidate and artifact both resolve to `3256ad8dfe18873cd70b64ea9496b1196541a2b4`.
2. Capture a PostgreSQL backup and current Alembic revision.
3. Add and independently review the explicit disabled environment values listed above.
4. Confirm no pilot entitlements, acquisition seeds or commercial capacity records are being introduced.
5. Run the normal pre-deploy `alembic upgrade head`; verify `20261121_spotlight_slice4a_completion`.
6. Deploy backend only from the exact accepted commit. No frontend release is required for manual admin observation.
7. Smoke-test health and authenticated admin access.
8. Run one report for a completed historical date, verify all safety fields, then discard it from the 14-day observation unless it meets the declared start-date protocol.
9. Re-check every financial flag and inspect mutation tables for unchanged counts.
10. Start observation only after the Release Controller and Product Owner sign the release ticket.

### Rollback

1. Stop observation and revoke/disable the Measurement Operator's admin session if immediate access removal is required.
2. Roll the backend service back to the previously deployed application revision.
3. Keep all financial flags off.
4. Prefer leaving the additive Slice 4/4A schema in place during an application rollback; dormant additive tables/columns are safer than a hurried destructive downgrade.
5. If a schema downgrade is separately approved, stop all candidate application instances, back up PostgreSQL, and downgrade only to `20261121_spotlight_slice4_payments` as documented in the Slice 4A completion report.
6. Verify health, prior production behaviour and unchanged financial records.

There is no dedicated measurement-route feature flag in the accepted candidate. The rapid control is admin-session revocation plus application rollback. This is acceptable for a read-only admin route, but it is an honest operational limitation; a later dedicated read flag would improve convenience, not financial isolation.

## 6. Decisions required before real money

### Commercial decisions

- Approve the audience scope and whether delivery is contextual, community-scoped or personalised.
- Approve exact customer-facing daypart windows and authoritative timezone handling.
- Define what a scheduled opportunity promises and explicitly exclude guaranteed viewers, enquiries or sales.
- Approve booking cut-off, cancellation, expiry, hold, withdrawal and customer-change rules.
- Approve the underdelivery hierarchy: replacement service, restored credit, cash refund or customer choice.
- Approve what happens to unused Pipeline Credits and whether they expire.
- Approve the sellable-capacity formula only after 14 valid days; observed leases are not automatically sellable units.

### Accounting decisions

- Approve the earned-revenue point and treatment of deferred/outstanding service obligations.
- Approve evidence-backed processing fees and direct delivery cost methods.
- Approve community-allocation rate, beneficiary, trigger and posting authority.
- Approve refund authorisation, bank-disbursement evidence and reconciliation treatment.
- Approve tax/VAT treatment and invoice/receipt format with a qualified accountant.
- Keep unknown costs as `pending_policy`; do not turn them into zero.

### Legal and privacy decisions

- Confirm the lawful basis, transparency notice, retention and user controls for recognised-viewer measurement and any future targeting/profiling.
- Determine whether any storage/access technology used for advertising requires consent and whether the intended launch is contextual or behavioural.
- Complete or update the data-protection impact assessment before material profiling or new ad-targeting use.
- Make paid Spotlight obviously identifiable as advertising and approve sponsor/merchant labelling.
- Approve pre-contract information, cancellation, service-start consent, underdelivery and refund terms for the actual customer type and jurisdiction.
- Confirm whether merchants purchase as businesses, consumers or both; do not assume consumer protections are irrelevant.

Relevant official starting points include the [ICO guidance on online advertising](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/how-do-the-rules-apply-to-online-advertising/), [ICO privacy-information requirements](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/), [CAP Code advertising-recognition rules](https://www.asa.org.uk/type/non_broadcast/code_section/02.html), and the [Consumer Rights Act 2015](https://www.legislation.gov.uk/ukpga/2015/15). These are decision inputs, not legal advice or approved customer terms.

## Go/no-go checklist

### Measurement-only release: go only if all are true

- [ ] Exact backend revision is `3256ad8dfe18873cd70b64ea9496b1196541a2b4`.
- [ ] PostgreSQL backup exists and Alembic head is verified.
- [ ] Every listed financial/commercial/write/discovery flag is explicitly `0`.
- [ ] No acquisition pack, entitlement, booking or capacity seed is introduced.
- [ ] One community, `clan_id`, IANA timezone and start date are recorded.
- [ ] Release Controller, Measurement Operator and Data Reviewer are named with account IDs.
- [ ] Admin-only smoke report returns aggregate data and all safety fields pass.
- [ ] Rollback owner and previous production revision are recorded.

### Immediate no-go

- Any paid or global financial flag is on.
- Any mutation is required to obtain the measurement.
- Operator identities, timezone or community are unresolved.
- The report creates a commitment or exposes raw viewer data.
- The team intends to call observed presentations “sold capacity” before the observation and separate approval.

## Final status

The accepted candidate is technically ready for a separately authorised, read-only 14-day capacity observation under the controls above. It is not commercially ready for payment collection, credit spending, paid booking or a customer promise. No repository runtime file, production environment, database, deployment branch or customer-facing surface was changed by this proposal.
