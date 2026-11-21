# GSN Spotlight Measurement-Only Release Ticket

**Ticket state:** NO-GO until the genuine blockers in Section 12 are closed

**Ticket type:** separately authorised, backend-only, read-only production observation

**Approved technical revision:** `3256ad8dfe18873cd70b64ea9496b1196541a2b4`

**Accepted documentation revision:** `10fe20e5c0eed81371eab992ea9d675d9e28ca09`

**Production application observed before this ticket:** `f12bd162dc33934b6b008c6ca92e605ec0ddd168`

**Production Render deploy observed:** `dep-dc00avui0phs73bbedj0`
**Release boundary:** this ticket prepares a release. It does not authorise deployment, environment changes, payments, bookings, merchant contact, customer terms, public discovery, or promotion to `main`.

## 1. Purpose and immutable boundary

Deploy the approved technical revision only to collect aggregate, admin-only evidence about existing Spotlight viewing activity for one selected community over fourteen consecutive local dates.

This observation must not:

- collect or spend money;
- allocate or spend Pipeline Credits;
- create paid Spotlight quotes, reservations, bookings, opportunities, remedies, or settlements;
- activate public merchant discovery;
- alter unrelated existing payment or Spotlight functions;
- describe observed viewing activity as purchased, reserved, scheduled, supplied, missed, or remedied paid service.

## 2. Required ticket fields

Complete every field before changing production.

| Field | Required value |
| --- | --- |
| Ticket ID | `________________` |
| Selected community name | `________________` |
| Selected community ID / `clan_id` | `________________` |
| IANA timezone | `________________` |
| Observation start local date | `YYYY-MM-DD` |
| Observation end local date | Start date plus 13 days: `YYYY-MM-DD` |
| Product owner / release approver | `Chuma / confirmation reference: ________________` |
| Release controller | `Name: ________________  GSN admin ID: ________________` |
| Measurement operator | `Name: ________________  GSN admin ID: ________________` |
| Independent data reviewer | `Name: ________________  GSN admin ID: ________________` |
| Rollback operator | `Name: ________________  GSN admin ID: ________________` |
| Change window | `Start UTC: ________________  End UTC: ________________` |
| Render workspace/service | `GMFN Pilot / gmfn-api (srv-d7h2c8ugvqtc73eshtd0)` |
| Render PostgreSQL | `gmfn-postgres (dpg-d7h15li8qa3s73crpcr0-a)` |

The timezone must be a valid IANA name. Do not accept abbreviations such as `GMT`, `WAT`, or `BST` as substitutes for the selected locality.

## 3. Verified current production position

Read-only production inspection on 2026-11-21 established:

- `gmfn-api` deploys from `main`, with auto-deploy disabled.
- Health path is `/health`; one Frankfurt instance is configured.
- Pre-deploy command is `alembic upgrade head`.
- A persistent disk is mounted at `/var/data/gmfn-uploads`.
- Live application revision is `f12bd162dc33934b6b008c6ca92e605ec0ddd168` in deploy `dep-dc00avui0phs73bbedj0`.
- Production PostgreSQL is available and reports Alembic revision `20261119_universal_clan_search`.
- Production has `pipeline_credit_service_spend_orders`.
- Production does not yet have `spotlight_commercial_bookings` or `spotlight_commercial_opportunities`.

Render's available read-only service interface did not expose runtime environment-variable values. Production SSH also rejected the available local key. Therefore no claim is made that the current Dashboard values match repository defaults. A named operator must complete the environment attestation in Section 4 from the Render Dashboard before GO.

## 4. Environment comparison and isolation decision

### 4.1 Flags that must be false or absent

Record the pre-change value. If any value is true, stop: this ticket does not authorise changing it.

| Variable | Repository behaviour at approved revision | Required production state | Unrelated-function impact |
| --- | --- | --- | --- |
| `GSN_PAID_SPOTLIGHT_PAYMENT_OPERATIONS_ENABLED` | Spotlight-specific payment sub-gate; safe default is disabled | `0`, `false`, or absent | None identified outside paid Spotlight. Do not turn it on. |
| `GSN_PAID_SPOTLIGHT_V1_ENABLED` | Enables the paid commercial quote/booking workflow | `0`, `false`, or absent | None identified outside paid Spotlight. Do not turn it on. |
| `GSN_PUBLIC_MERCHANT_DISCOVERY_V1_ENABLED` | Enables public merchant discovery | `0`, `false`, or absent | Public discovery remains unavailable. This is required by the release boundary. |

### 4.2 Existing values that must be preserved byte-for-byte

Do not force these variables off. Changing them could interrupt unrelated or pre-existing GSN behaviour.

| Variable | Why it is broad or pre-existing | Ticket instruction |
| --- | --- | --- |
| `GSN_PAYMENT_OPERATIONS_ENABLED` | Global emergency gate for multiple financial mutations, not only paid Spotlight | Record before and after. Preserve exactly. The Spotlight-specific sub-gate remains off. |
| `GSN_MEMBER_CREDIT_SPOTLIGHT_WRITES_ENABLED` | Controls established member-credit Spotlight writes | Preserve exactly; forcing it off could interrupt existing member-credit use. |
| `GSN_SPOTLIGHT_LIFECYCLE_WRITES_ENABLED` | Controls established lifecycle changes such as correction, hold, and withdrawal | Preserve exactly; forcing it off could interrupt existing lifecycle operations. |
| `GMFN_ENABLE_RECONCILIATION_LOOP` | Broad automatic bank-reconciliation loop; repository Blueprint currently declares `0` | Preserve the Dashboard value. Expected `0`, but do not overwrite an unexplained divergence. |
| `GSN_ENABLE_SPOTLIGHT_RETENTION_LOOP` | Existing Spotlight retention loop; repository Blueprint currently declares `0` | Preserve the Dashboard value. Expected `0`, but do not overwrite an unexplained divergence. |

### 4.3 Mandatory operator attestation

Attach a time-stamped Render Dashboard export or screenshots showing all eight variables. Record:

| Variable | Before | After | Changed? | Operator initials |
| --- | --- | --- | --- | --- |
| `GSN_PAID_SPOTLIGHT_PAYMENT_OPERATIONS_ENABLED` |  |  | Must be No |  |
| `GSN_PAID_SPOTLIGHT_V1_ENABLED` |  |  | Must be No |  |
| `GSN_PUBLIC_MERCHANT_DISCOVERY_V1_ENABLED` |  |  | Must be No |  |
| `GSN_PAYMENT_OPERATIONS_ENABLED` |  |  | No |  |
| `GSN_MEMBER_CREDIT_SPOTLIGHT_WRITES_ENABLED` |  |  | No |  |
| `GSN_SPOTLIGHT_LIFECYCLE_WRITES_ENABLED` |  |  | No |  |
| `GMFN_ENABLE_RECONCILIATION_LOOP` |  |  | No |  |
| `GSN_ENABLE_SPOTLIGHT_RETENTION_LOOP` |  |  | No |  |

If the three required-disabled flags are already false or absent, make no environment-variable change. If they are true, this ticket is NO-GO and a separate deactivation impact decision is required.

## 5. Verified measurement interface

**Route:** `GET /pipeline-credits/admin/spotlight-capacity-measurement`

**Required query parameters:**

- `clan_id`: selected community ID;
- `service_date`: local date in `YYYY-MM-DD`;
- `timezone_name`: selected IANA timezone.

Focused verification at the approved code line established:

- an authenticated non-admin receives `403` with `Admin access required`;
- an authorised community admin receives aggregate response version `spotlight-capacity-observation.v2`;
- the response separates `overnight`, `morning`, `afternoon`, and `evening`;
- the response contains no `viewer_user_id`;
- `created_paid_service_commitment` is false;
- paid-service commitment counts are identical before and after the request.

Focused command:

```powershell
Set-Location gmfn_backend
python -m pytest -q tests/test_spotlight_measurement_release_route.py tests/test_spotlight_slice4_payments.py -k "measurement or payment_gate_isolation"
```

Observed result: `5 passed, 7 deselected`.

Accepted repository evidence for revision `3256ad8dfe18873cd70b64ea9496b1196541a2b4`:

- PostgreSQL job `136726150480`: `12 passed`, `0 skipped`;
- full backend job `136726150704`: `1861 passed`, `36 documented infrastructure-dependent skips`.

## 6. Backup and migration procedure

### 6.1 Backup gate

Before deployment:

1. Open the Render PostgreSQL Recovery page for `gmfn-postgres`.
2. Create a logical export and record the point-in-time recovery timestamp.
3. Wait until the export is complete.
4. Download the `.dir.tar.gz` export to approved durable storage.
5. Calculate and record its SHA-256 hash.
6. Confirm the rollback deploy `dep-dc00avui0phs73bbedj0` remains selectable.

Record:

| Evidence | Value |
| --- | --- |
| Export created UTC |  |
| PITR timestamp |  |
| Export filename |  |
| Export SHA-256 |  |
| Storage location / custodian |  |
| Rollback deploy confirmed UTC |  |

No completed export means NO-GO.

### 6.2 Exact schema path

Production currently reports `20261119_universal_clan_search`. The approved revision has one Alembic head, `20261121_spotlight_slice4a_completion`. The pre-deploy upgrade therefore applies these six revisions in order:

1. `20261120_public_merchant_discovery`
2. `20261120_public_discovery_coverage`
3. `20261121_spotlight_slice3_commercial`
4. `20261121_spotlight_slice3a_integrity`
5. `20261121_spotlight_slice4_payments`
6. `20261121_spotlight_slice4a_completion`

Immediately before the authorised window, re-read the production Alembic revision. If it differs from `20261119_universal_clan_search`, stop and reconcile the path rather than guessing.

## 7. Separately authorised deployment procedure

This section is executable only after every GO item is signed.

1. Confirm the repository candidate is exactly `3256ad8dfe18873cd70b64ea9496b1196541a2b4` and the approved checks still correspond to that SHA.
2. Confirm the backup evidence and environment attestation are attached.
3. Do not alter any environment value unless separately authorised. If the three required-disabled flags are already false/absent, leave all values untouched.
4. In Render, choose **Manual Deploy → Deploy a specific commit** for `3256ad8dfe18873cd70b64ea9496b1196541a2b4` on `gmfn-api`.
5. Observe the pre-deploy migration. Do not bypass a migration failure.
6. Record the new Render deploy ID and timestamps.
7. Run Section 8 smoke tests before beginning the fourteen-day register.

No frontend deployment is required. Do not push or merge the candidate to `main` as part of this ticket.

## 8. Post-deployment smoke tests

Complete in order. A failure invokes the stop/rollback decision in Section 10.

| Check | Expected result | Evidence |
| --- | --- | --- |
| `GET /health` | `200` |  |
| Production Alembic revision | `20261121_spotlight_slice4a_completion` |  |
| Non-admin measurement request | `403`, `Admin access required` |  |
| Authorised-admin measurement request | `200`, version `spotlight-capacity-observation.v2` |  |
| Response scope | Correct community, local date, timezone, all four dayparts |  |
| Privacy | No raw viewer identifier or exact location |  |
| Read-only safety | `created_paid_service_commitment=false`; before count equals after count |  |
| Commercial rows | No new paid acquisition, spend, booking, opportunity, remedy, or settlement created |  |
| Required-disabled flags | All three false/absent |  |
| Preserved flags | All five unchanged from attestation |  |
| Existing Spotlight smoke | Existing authorised house/member-credit behaviour unchanged |  |
| Logs and health | No migration, permission, financial, or elevated error-rate signal |  |

## 9. Fourteen-day operation

Use:

- `docs/templates/GSN_SPOTLIGHT_CAPACITY_EVIDENCE_REGISTER_14_DAY.csv`
- `docs/templates/GSN_SPOTLIGHT_CAPACITY_DAILY_REPORT_TEMPLATE.md`

For each local date, the measurement operator obtains one aggregate response after the date is complete, saves the raw JSON in approved restricted storage, records a SHA-256 hash, and completes the daily report. The independent reviewer checks scope, daypart separation, safety fields, and absence of paid commitments.

A day is valid only when:

- the complete local day was observed;
- timezone and local-date boundaries are correct;
- overnight is not counted as morning, afternoon, or evening;
- no route or collection outage invalidated material coverage;
- aggregate privacy and financial-isolation checks pass;
- the raw response hash and operator/reviewer sign-off are present.

Invalid days remain in the register with their reason and do not count toward fourteen valid days.

## 10. Stop and rollback

Stop collection immediately for any unauthorised financial mutation, paid commitment, raw viewer disclosure, wrong community scope, unexplained flag change, migration instability, or material application regression.

Rollback order:

1. Revoke the measurement operator's admin session if access misuse or privacy is suspected.
2. In Render, redeploy `dep-dc00avui0phs73bbedj0` / `f12bd162dc33934b6b008c6ca92e605ec0ddd168`.
3. Leave the database at `20261121_spotlight_slice4a_completion` unless database recovery is separately approved.
4. Re-run `/health` and existing application smoke checks.
5. Reconfirm all eight environment values match the pre-release attestation.
6. Preserve logs, deploy evidence, and the backup; open an incident record.

The old application revision was rehearsed against the candidate schema in a disposable database: `/health` returned `200`, and the historical house-settlement query succeeded. This supports application-first rollback. It does not justify an automatic schema downgrade. The Slice 4 downgrade can remove Spotlight settlement data, so downgrade or PITR requires a separate incident decision.

Because the service uses a persistent disk, do not promise zero-downtime rollback. Record the actual interruption.

## 11. Evidence interpretation boundary

The observation reports existing serving/viewing activity only.

| Measurement term | Meaning | It is not |
| --- | --- | --- |
| Final presentation lease | A serving lease reached the final presentation stage | A paid scheduled opportunity |
| Visible presentation | The advert was visibly presented under the measurement rules | A purchased or supplied paid turn |
| Qualifying impression | A visible presentation met qualifying-impression rules | A sale, enquiry, unique person, or scheduled entitlement |
| Recognised unique reach | Deduplicated recognised viewers within the report's stated scope | Guaranteed audience or demand |
| Existing promotional obligation | A pre-existing obligation that consumes serving capacity | New sellable capacity |

Only the paid scheduling workflow can create purchased, reserved, scheduled, genuinely supplied, missed, or remedied paid opportunities. Measurement-only activity creates none of them. Fourteen-day observations are evidence for a later conservative capacity decision, not proof of sellable inventory by themselves.

## 12. Final GO / NO-GO checklist — genuine blockers only

The release is **GO** only when every item is checked:

- [ ] A separate deployment authorisation names revision `3256ad8dfe18873cd70b64ea9496b1196541a2b4`.
- [ ] Selected community ID, IANA timezone, and fourteen-day date range are complete.
- [ ] Release controller, measurement operator, independent reviewer, and rollback operator are named and authorised.
- [ ] Render Dashboard evidence confirms the three required-disabled flags are false or absent.
- [ ] Render Dashboard evidence confirms the five broad/pre-existing flags will remain byte-for-byte unchanged.
- [ ] A completed, downloaded, hashed PostgreSQL logical export and PITR timestamp are recorded.
- [ ] Rollback deploy `dep-dc00avui0phs73bbedj0` is still selectable.
- [ ] The production Alembic revision is rechecked and the six-revision path remains exact.

The following are **not blockers for measurement-only observation**: final Spotlight pricing terms, cash-refund policy, tax treatment, community-allocation rates, merchant entitlements, paid capacity approval, customer publication, or merchant outreach. They remain blockers for a real-money pilot, not for this read-only ticket.

Until all eight genuine blockers are closed, the truthful decision is **NO-GO**.
