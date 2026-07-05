# GSN Evidence Live Fixture Runbook

Date: 2026-07-05
Status: Template-only live/staging fixture runbook

## Purpose

This runbook explains how to supply live or staging fixture inputs to the
evidence-boundary harness without committing secrets, bearer tokens, private
codes, or production URLs into the repository.

It is a preparation guide. It is not proof that any live route has passed.

## No-Secrets Rule

Do not paste real values into this file, `docs/HANDOFF_NOTES.md`, source code,
Git commits, screenshots, issue comments, pull request comments, or chat logs.

Use only temporary shell environment variables for real values. Clear them when
the run is finished.

Allowed in documentation:

- variable names;
- placeholder values wrapped in angle brackets;
- the command shape.

Forbidden in documentation:

- bearer tokens;
- API keys;
- deploy hooks;
- real production or staging base URLs;
- real TrustSlip codes;
- real community keys;
- real member credential keys;
- real confirmation tokens;
- private member contact details.

## Fixture Inputs

The live harness reads these variables:

| Variable | Purpose | Placeholder |
| --- | --- | --- |
| `GSN_LIVE_EVIDENCE_BASE_URL` | API base URL for the staging or production target | `<staging-or-production-api-base-url>` |
| `GSN_LIVE_TRUSTSLIP_CODE` | Public TrustSlip Verify fixture | `<public-trustslip-code>` |
| `GSN_LIVE_COMMUNITY_KEY` | Public Community Verify fixture | `<public-community-key>` |
| `GSN_LIVE_COMMUNITY_MEMBER_KEY` | Public Community Member Credential fixture | `<public-community-member-key>` |
| `GSN_LIVE_CONFIRMATION_TOKEN` | Public Community Confirmation Outcome fixture | `<public-confirmation-token>` |
| `GSN_LIVE_AUTH_TOKEN` | Signed-in Trust Timeline fixture token | `<short-lived-signed-in-token>` |

Use the smallest fixture set needed for the claim. A public TrustSlip check does
not require a signed-in token. A signed-in Trust Timeline check does require a
short-lived token for an allowed test account.

## PowerShell Template

Set only the variables needed for the specific live or staging check:

```powershell
$env:GSN_LIVE_EVIDENCE_BASE_URL = "<staging-or-production-api-base-url>"
$env:GSN_LIVE_TRUSTSLIP_CODE = "<public-trustslip-code>"
$env:GSN_LIVE_COMMUNITY_KEY = "<public-community-key>"
$env:GSN_LIVE_COMMUNITY_MEMBER_KEY = "<public-community-member-key>"
$env:GSN_LIVE_CONFIRMATION_TOKEN = "<public-confirmation-token>"
$env:GSN_LIVE_AUTH_TOKEN = "<short-lived-signed-in-token>"

npm --prefix frontend run audit:live-evidence-boundaries
```

Clear the variables after the run:

```powershell
Remove-Item Env:\GSN_LIVE_EVIDENCE_BASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:\GSN_LIVE_TRUSTSLIP_CODE -ErrorAction SilentlyContinue
Remove-Item Env:\GSN_LIVE_COMMUNITY_KEY -ErrorAction SilentlyContinue
Remove-Item Env:\GSN_LIVE_COMMUNITY_MEMBER_KEY -ErrorAction SilentlyContinue
Remove-Item Env:\GSN_LIVE_CONFIRMATION_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:\GSN_LIVE_AUTH_TOKEN -ErrorAction SilentlyContinue
```

## Before Running Live Checks

Run the local no-network checks first:

```powershell
npm --prefix frontend run verify:evidence-boundary-local-all
npm --prefix frontend run verify:evidence-live-readiness-local
npm --prefix frontend run audit:evidence-live-verification-gap-log
npm --prefix frontend run audit:live-evidence-boundary-refusals
npm --prefix frontend run audit:live-evidence-boundaries -- --dry-run
```

`verify:evidence-live-readiness-local` runs the template-only fixture runbook
audit, the live verification gap audit, the live harness dry-run, and the
fail-closed refusal audit together.

`verify:evidence-boundary-local-all` also runs the local evidence-display
boundary verifier before the live-readiness verifier. It is the broadest local
preflight, but it is still not live API proof.

That verifier may need escalation on this Windows sandbox because the refusal
audit spawns child Node processes.

The verifier is still local preflight only. A pass means the live/staging run
process is caged; it does not mean a live API route, production payload, Render
deployment, or real fixture passed.

## After Running Live Checks

Record only non-secret evidence:

- command name;
- target environment name, such as staging or production;
- exact commit SHA if deployed;
- timestamp;
- route families checked;
- pass/fail outcome;
- sanitized HTTP status summary;
- deploy id if a Render deploy was part of the claim.

Never record the bearer token, full fixture codes, private contact data, raw
payloads, or deploy hook URLs.

## Unabated Truth

This runbook reduces the chance of leaking live fixtures. It does not create
safe live fixtures, rotate credentials, deploy code, verify production data, or
prove that a live evidence route is correct.
