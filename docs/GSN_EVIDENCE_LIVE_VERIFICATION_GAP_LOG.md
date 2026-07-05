# GSN Evidence Live Verification Gap Log

Date: 2026-07-05
Status: Local verification boundary log

## Purpose

This log records the truth boundary after the evidence-display local verifier
was added.

GSN now has useful local evidence checks:

- static source audits for evidence-boundary language, route ownership, and
  public/private separation;
- mocked browser smoke checks for route states, visible boundary language, and
  auth/no-auth request behavior;
- one local wrapper that runs both layers;
- local publish-readiness guards that preview future batch scope without
  staging, committing, pushing, or deploying.

Those checks are valuable. They are not the same as proving production evidence
behavior.

## What Local Verification Proves

The local verifier currently proves:

- evidence-boundary source audits are registered and runnable together;
- mocked browser route-state smokes are registered and runnable together;
- public TrustSlip Verify states stay bounded in mocked browser checks;
- signed-in holder/private TrustSlip evidence stays gated in mocked browser
  checks;
- public community verification and confirmation routes do not inherit signed-in
  local state in mocked browser checks;
- signed-in Trust Passport, holder TrustSlip, Trust Timeline, PDF, and ZIP reads
  carry auth in mocked browser checks;
- visible boundary language for bank approval, payment movement, auto-debit,
  payout, goods release, private Passport, private contacts, and unreleased
  evidence is present in the covered mocked route states.
- future publish scope for the local evidence-boundary batch can be printed and
  audited without performing Git or deployment actions.

## What Local Verification Does Not Prove

The local verifier does not prove:

- live backend authorization;
- production payload shape;
- production database records contain the same fields as the mocks;
- real public TrustSlip codes are current, expired, revoked, frozen, or
  visibility-filtered correctly;
- real public community records and member credentials are complete;
- real confirmation outcome payloads hide every private contact or review note;
- real Trust Timeline PDFs or evidence ZIPs contain only the intended redacted
  data;
- Render has deployed the current local changes;
- full mobile/desktop visual quality;
- complete app accessibility;
- legal, bank, government, regulatory, escrow, delivery, payout, or credit
  approval.

## Before Claiming Live Evidence Proof

Before any route-family evidence work is described as live-production verified,
run or create checks that prove the relevant layer:

| Layer | Required Proof Before Stronger Claim |
| --- | --- |
| Frontend source contract | `npm --prefix frontend run audit:evidence-display-boundary-batch` passes. |
| Mocked browser route states | `npm --prefix frontend run smoke:evidence-display-boundary-batch` passes. |
| Combined local proof | `npm --prefix frontend run verify:evidence-display-boundary-local` passes. |
| Live-readiness local preflight | `npm --prefix frontend run verify:evidence-live-readiness-local` passes, proving only no-secret runbook, dry-run, and fail-closed local harness behavior. |
| All-local evidence boundary preflight | `npm --prefix frontend run verify:evidence-boundary-local-all` passes, proving only the combined static, mocked browser, no-secret, dry-run, and fail-closed local checks. |
| Future batch scope preview | `npm --prefix frontend run print:evidence-local-batch-stage-plan` and `npm --prefix frontend run audit:evidence-local-batch-stage-plan` pass, proving only that the future stage list is printable, aligned with the manifest, and non-mutating. |
| Local publish-readiness preflight | `npm --prefix frontend run verify:evidence-publish-readiness-local` passes, proving only the manifest, suite, stage-plan, status-scope, all-local, and whitespace checks. |
| Production build | `npm --prefix frontend run build` passes. |
| Live public API boundary | Live public routes are called without bearer auth or selected-community headers, and responses contain only public-safe fields. |
| Live signed-in API boundary | Live private routes reject anonymous users and carry bearer auth for allowed users. |
| Live data shape | Representative production or staging payloads contain the expected source, state, visibility, confirms, and excluded-claims fields. |
| Render deployment | GitHub workflow or Render returns a deploy id for the target commit, and deployment completion is verified if the claim is "live now". |
| Visual QA | Browser screenshots or manual QA confirm the page is readable, not crowded, and boundary text is visible in the target viewport. |

## Live Harness

`npm --prefix frontend run audit:live-evidence-boundaries` is an opt-in live
or staging harness.

It refuses to make live requests unless `GSN_LIVE_EVIDENCE_BASE_URL` is set.
It also needs explicit fixture inputs before it can prove anything useful:

- `GSN_LIVE_TRUSTSLIP_CODE` for public TrustSlip Verify;
- `GSN_LIVE_COMMUNITY_KEY` for public Community Verify;
- `GSN_LIVE_COMMUNITY_MEMBER_KEY` with `GSN_LIVE_COMMUNITY_KEY` for public
  Community Member Credential;
- `GSN_LIVE_CONFIRMATION_TOKEN` for public Community Confirmation Outcome;
- `GSN_LIVE_AUTH_TOKEN` for signed-in Trust Timeline and evidence reads.

The harness deliberately checks only the supplied fixtures. A pass means those
specific public/private route boundaries passed on the configured base URL. It
does not prove every TrustSlip, every community, every confirmation outcome, or
every production payload shape.

Use `npm --prefix frontend run audit:live-evidence-boundaries -- --dry-run` to
print the required inputs without making network requests.

`npm --prefix frontend run audit:live-evidence-boundary-refusals` is the local
fail-closed audit for this harness. It verifies:

- `--dry-run` prints usage and exits successfully;
- missing `GSN_LIVE_EVIDENCE_BASE_URL` refuses live requests;
- a base URL without any fixture input refuses to claim live evidence proof.

The refusal audit deliberately uses no real live fixture and must not be treated
as API verification.

Use `docs/GSN_EVIDENCE_LIVE_FIXTURE_RUNBOOK.md` as the template-only fixture
runbook before any real live or staging run. That file explains how to pass
fixture values through temporary shell environment variables without recording
tokens, private codes, production URLs, deploy hooks, or raw payloads in the
repository.

## Next Live-Verification Candidates

The next useful live checks should be narrow and explicit:

1. Public TrustSlip Verify no-auth live route check.
2. Public Community Verify no-auth live route check.
3. Community Confirmation Outcome public payload privacy check.
4. Signed-in Trust Timeline auth-required live check.
5. Evidence ZIP/PDF redaction check against a controlled test account.

## Unabated Truth

The current local verifier is a strong local regression guard.

It is not a production proof system. Treating mocked payloads as production
evidence would be exactly the kind of polished overclaim this evidence-boundary
work is meant to prevent.
