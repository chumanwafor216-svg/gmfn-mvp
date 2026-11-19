# GSN corrected community entry release candidate

Date: 2026-11-18

## Scope

This pass keeps the accepted feature design fixed. It adds only missing verification, release evidence, and release-operating truth.

## 1. Reviewed-applicant identity timing

Status: completed locally.

- test_search_join_uses_separate_policy_and_records_immutable_snapshot now asserts that a new reviewed applicant has a pending request, no GSN ID, and zero active community memberships.
- test_public_join_request_creates_pending_activation_identity now makes the older wording explicit: the pending activation identity is an internal users row with the placeholder password state PENDING_APPROVAL. It is not a GSN ID, activation grant, usable account, or community membership.
- test_reviewed_search_rejection_cannot_be_overturned_by_late_override proves rejection leaves the applicant without a GSN ID and without active membership.
- test_reviewed_search_member_vote_approves_once_without_duplicate_membership proves approval issues the GSN ID once and creates one active membership.
- test_existing_identity_is_reused_across_search_join_and_community_creation proves an existing user keeps the same GSN ID through reviewed admission and later identity-first community creation.

No production code changed for this item because the observed behavior matches the agreed rule.

## 2. PostgreSQL concurrency

Status: executable check added; execution blocked and explicitly unverified.

gmfn_backend/tests/test_postgres_corrected_community_entry_concurrency.py uses independent SQLAlchemy sessions and thread barriers to cover:

- competing approval and rejection on one pending request;
- concurrent approvals of separate requests for the same new person;
- duplicate founder-community creation with one request key.

The assertions cover final database state and the losing or repeated application result.

The check could not be executed against PostgreSQL in this session:

- SPOTLIGHT_POSTGRES_TEST_DATABASE_URL, GSN_ALLOW_DESTRUCTIVE_DISPOSABLE_DB_TESTS, and DATABASE_URL are unset locally;
- Docker is installed, but its engine pipe is absent; Docker Desktop did not become ready within 120 seconds;
- the stopped com.docker.service could not be opened or started from the approved elevated command;
- .github/workflows/tests.yml has no PostgreSQL service or disposable database secret;
- the connected Render database is production, and the connector permits read-only queries, so it is not an acceptable destructive concurrency target.

The three PostgreSQL checks collect and skip with the exact missing-environment reason. Their pass or fail result remains unverified until a disposable PostgreSQL URL and destructive-test opt-in are supplied.

## 3. Deployment scope and rate limiting

Status: current Render state confirmed through the Render connector.

Actual backend topology:

- service: gmfn-api;
- branch: main;
- automatic deploy: off;
- instances: 1;
- start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT;
- Uvicorn workers: 1 because no workers option is configured;
- attached 10 GB disk, which keeps the service single-instance;
- current compute plan: 1c-2g;
- current production database: PostgreSQL 18, basic_1gb, 15 GB disk, no HA.

Rate-limit behavior:

- community search: 30 requests per 60 seconds per client IP;
- community detail: a separate 30 requests per 60 seconds per client IP;
- search-join submission: 5 requests per 600 seconds per client IP and community;
- the limiter is an in-memory singleton, so all counters are lost on process restart or deploy;
- the present one-instance and one-worker topology has one steady-state limiter;
- multiple Uvicorn workers or multiple instances would each enforce independent counters, multiplying the effective public allowance unless a shared store is introduced;
- /entry/identity/establish and /entry/identity/community do not currently have this route-level limiter. Their protections are verified-session or authentication requirements, idempotency keys, and database uniqueness, not a shared request throttle.

Rollout scope:

- identity-first /create has no feature flag or audience allow-list and is mounted directly by the frontend. It will be generally available when the frontend and backend are deployed;
- community search remains a separate per-community opt-in. Existing communities remain disabled after migration;
- the first search pilot must use community_vote with search_join_admin_override=false;
- identity-first creation availability must not be described as limited by the one-community search pilot.

## 4. Mobile evidence

Status: manually reviewed and completed.

The three existing Pixel 5 screenshots were inspected before adding evidence:

- 01-find-and-ask-ready.png clearly shows the selected community, verified phone state, voting explanation, and primary ask-to-join action, but it does not show the result list itself;
- 02-find-and-ask-pending.png clearly states Pending Review, that the request is waiting for community approval, that membership is not active, and what to do next;
- 03-identity-first-community-setup.png shows GMFN-U-NEW1001 secured before the
  focused community-name and description fields. Invitation, discovery, and
  admission controls are absent because they belong after creation.

Because the original set did not visibly prove the search query and result state, the existing smoke added only 00-find-community-results.png. It shows the query, returned community identity, description, voting mode, and select action. No UX structure or feature behavior changed.

The source PNGs are in frontend/screenshots/corrected-community-entry-pixel/. Exported review copies are in C:\tmp\gsn-corrected-entry-review\ for this session.

## 5. Migration and recovery

Status: representative local rehearsal completed; production-engine rehearsal and operational recovery preparation remain incomplete.

test_corrected_entry_migration_preserves_legacy_admission_and_pending_rows rehearses previous revision to corrected-entry head to previous revision with:

- a legacy community whose admission mode is null and therefore retains historical vote behavior;
- an existing explicit instant-invite community and its stored override setting;
- an existing owner and membership;
- a pending applicant and pending join request;
- an existing verified-phone session.

The rehearsal proves:

- existing users, communities, admission settings, membership, pending request, and phone-session rows are preserved;
- every existing community receives search_join_enabled=false;
- historical requests receive request_source=invite, no fabricated admission snapshot, and override false;
- identity and creation request keys remain null for historical rows;
- the corrected migration can downgrade locally while preserving the pre-existing core rows.

Staged compatibility evidence:

- legacy invitation request, pending, approval, activation, and instant-invite tests pass against the new backend;
- legacy /entry/create regression tests pass against the new backend;
- therefore the old frontend can remain live while the additive migration and compatible backend are deployed;
- the new frontend must not be deployed before the new backend because the identity-first and search routes do not exist in the old backend.

Recovery distinctions:

- application rollback: roll back frontend and backend code together while retaining the upgraded schema. This preserves valid post-release identities, requests, and communities and is the preferred recovery path;
- schema downgrade: removes search policy, request-source or snapshot, identity-request-key, and community-creation-key columns. Core rows remain, but provenance and retry or idempotency evidence are lost. Do not downgrade after live writes without first exporting and reconciling that evidence;
- backup restoration: restores the whole database to the backup timestamp and therefore loses every valid identity, request, membership, vote, and community created after that timestamp. It is a last-resort data-loss action, not ordinary application rollback.

Operational preparation truth:

- exposed-session invalidation is not completed. Access tokens are stateless JWTs with no general deny-list; production expiry is configured to 60 minutes. A confirmed exposed session requires waiting for expiry or rotating the signing secret, which invalidates all current sessions;
- production backup preparation is not completed. No pre-release backup timestamp, export artifact, or restore rehearsal was found or created in this pass;
- the Render connector confirms the production database is available, but it does not expose backup readiness in the returned service metadata;
- no production migration, session invalidation, backup, restore, or deployment action was performed.

## 6. Push and deploy behavior

- Any pushed branch containing gmfn_backend changes triggers the Backend Tests workflow.
- Trigger Render Deploy and Render Status are manual workflow_dispatch workflows.
- Render automatic deploy is off for both gmfn-api and gmfn-frontend.
- Pushing this branch or pushing main does not by itself deploy either service.
- After promotion to main, an operator must manually run Trigger Render Deploy; backend-impacting commits require working Render API credentials so the workflow can deploy the exact commit.

## Release gates still open

1. Run the three targeted concurrency tests against a disposable PostgreSQL database matching production behavior.
2. Record and verify a production backup or restorable export immediately before migration.
3. Resolve any exposed session by expiry or signing-secret rotation and record the action.
4. Promote the verified commit to main and manually deploy the exact backend and frontend commit.
5. Complete the live invitation, search-pilot, and identity-first resumption checks listed in the completion report.

## 7. Operational preparation completion

### PostgreSQL concurrency

Status: completed in clean GitHub Actions checkout.

- Backend Tests run 44393077707 used a disposable PostgreSQL 18 service and the explicit destructive-test opt-in.
- The dedicated job completed with 3 passed and 0 skipped.
- Competing final decisions returned one stored final outcome and handled the repeated decision as already final.
- Concurrent approvals for separate requests initially exposed two returned GSN IDs for one new person. The production fix now locks and refreshes the shared applicant row before first identity issuance, so both approvals return the one stored GSN ID and both memberships remain valid.
- Duplicate community-creation submissions returned the same community and membership, with one stored request key.
- The workflow verifies the JUnit totals and fails unless exactly three tests pass with zero skips, failures, or errors.

### Exposed ChatGPT session

Status: blocked; not invalidated.

- The exposed credential is a ChatGPT web access JWT issued by auth.openai.com, not a GSN application token, Render key, GitHub token, or OpenAI API key.
- Its embedded validity window ends at 2026-11-26 11:06:10 UTC.
- The supplied material contains the access JWT and session metadata but no refresh token or reusable browser cookie value.
- OpenAI supports individual-session or all-session logout through ChatGPT Security settings. This environment has no authenticated ChatGPT browser session, no supported session-revocation API, and no connected browser surface, so targeted revocation could not be completed or verified.
- Expiry is not accepted as completed invalidation while the access JWT remains within its validity window. The account owner must revoke the matching active session or log out all sessions, wait up to 30 minutes for propagation, and then confirm the exposed token is rejected.

### Production backup and recovery

Status: completed without downloading production rows into CI.

- Render logical export id: dpg-d7h15li8qa3s73crpcr0-a/2026-11-18T20:36Z.
- Export timestamp: 2026-11-18 20:36:00 UTC.
- Protected location: Render Postgres logical exports, with Render's documented seven-day retention.
- Protected PITR recovery id: dpg-dbv0p7psrm7s73b2hfmg-a.
- Restored point: 2026-11-18 20:22:49 UTC.
- External access was cleared before validation. Render metadata then confirmed users, clans, clan_join_requests, and clan_memberships on the recovered PostgreSQL 18 instance.
- The recovery instance was suspended after validation and remains protected with an empty external IP allow list.
- GitHub Actions run 44392776302 completed successfully. No database dump or production row data was retained as a CI artifact.

Recovery consequences remain unchanged:

- Prefer application rollback while retaining the upgraded schema; this preserves valid post-release identities, requests, memberships, votes, and communities.
- A schema downgrade removes corrected-entry provenance and idempotency columns and can lose evidence required to reconcile valid post-release actions.
- Restoring the export or PITR point replaces later state and loses every valid production write after the selected backup timestamp.

### Deployment safeguards

- Render automatic deploy remains off for gmfn-api and gmfn-frontend; branch pushes run CI but do not deploy.
- Identity-first endpoints remain generally available when deployed and are protected by verified-session or authenticated access, idempotency keys, and database uniqueness.
- The public limiter remains process-local. The documented one-instance, one-worker topology is required until shared enforcement is implemented before adding workers or instances.
- Search remains a separate per-community opt-in. The first search pilot retains community voting with admin override disabled.
