/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

const files = {
  gapLog: "docs/GSN_EVIDENCE_LIVE_VERIFICATION_GAP_LOG.md",
  fixtureRunbook: "docs/GSN_EVIDENCE_LIVE_FIXTURE_RUNBOOK.md",
  package: "frontend/package.json",
  allLocalVerifier: "frontend/tools/verify-evidence-boundary-local-all.mjs",
  verifier: "frontend/tools/verify-evidence-display-boundary-local.mjs",
  liveReadinessVerifier: "frontend/tools/verify-evidence-live-readiness-local.mjs",
  publishReadinessVerifier: "frontend/tools/verify-evidence-publish-readiness-local.mjs",
  publishReadinessNonmutatingAudit:
    "frontend/tools/audit-evidence-publish-readiness-nonmutating.mjs",
  stagePlan: "frontend/tools/print-evidence-local-batch-stage-plan.mjs",
  stagePlanAudit: "frontend/tools/audit-evidence-local-batch-stage-plan.mjs",
  statusScopeAudit: "frontend/tools/audit-evidence-local-batch-status-scope.mjs",
  fixtureRunbookAudit: "frontend/tools/audit-evidence-live-fixture-runbook.mjs",
  liveHarness: "frontend/tools/audit-live-evidence-boundaries.mjs",
  liveRefusals: "frontend/tools/audit-live-evidence-boundary-refusals.mjs",
  smokeBatch: "frontend/tools/smoke-evidence-display-boundary-batch.mjs",
  staticBatch: "frontend/tools/audit-evidence-display-boundary-batch.mjs",
  suite: "frontend/tools/audit-evidence-display-boundary-suite.mjs",
  handoff: "docs/HANDOFF_NOTES.md",
};

const sourceByKey = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [
    key,
    readFileSync(join(repoRoot, file), "utf8"),
  ])
);

const packageJson = JSON.parse(sourceByKey.package);
const findings = [];

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function addFinding(key, index, message, text = "Expected pattern was not found.") {
  const source = sourceByKey[key];
  findings.push({
    file: files[key],
    line: index >= 0 ? lineAt(source, index) : 1,
    message,
    text: String(text).replace(/\s+/g, " ").slice(0, 380),
  });
}

function assertContains(key, pattern, message, text) {
  const source = sourceByKey[key];
  if (pattern.test(source)) return;
  addFinding(key, -1, message, text || pattern.toString());
}

function assertScript(name, command) {
  if (packageJson.scripts?.[name] === command) return;
  findings.push({
    file: files.package,
    line: 1,
    message: `Package script ${name} must stay registered.`,
    text: `Expected ${JSON.stringify(command)}, found ${JSON.stringify(
      packageJson.scripts?.[name]
    )}.`,
  });
}

assertScript(
  "verify:evidence-boundary-local-all",
  "node tools/verify-evidence-boundary-local-all.mjs"
);
assertScript(
  "verify:evidence-display-boundary-local",
  "node tools/verify-evidence-display-boundary-local.mjs"
);
assertScript(
  "verify:evidence-live-readiness-local",
  "node tools/verify-evidence-live-readiness-local.mjs"
);
assertScript(
  "verify:evidence-publish-readiness-local",
  "node tools/verify-evidence-publish-readiness-local.mjs"
);
assertScript(
  "print:evidence-local-batch-stage-plan",
  "node tools/print-evidence-local-batch-stage-plan.mjs"
);
assertScript(
  "audit:evidence-publish-readiness-nonmutating",
  "node tools/audit-evidence-publish-readiness-nonmutating.mjs"
);
assertScript(
  "audit:evidence-local-batch-stage-plan",
  "node tools/audit-evidence-local-batch-stage-plan.mjs"
);
assertScript(
  "audit:evidence-local-batch-status-scope",
  "node tools/audit-evidence-local-batch-status-scope.mjs"
);
assertScript(
  "audit:evidence-live-verification-gap-log",
  "node tools/audit-evidence-live-verification-gap-log.mjs"
);
assertScript(
  "audit:evidence-live-fixture-runbook",
  "node tools/audit-evidence-live-fixture-runbook.mjs"
);
assertScript(
  "smoke:evidence-display-boundary-batch",
  "node tools/smoke-evidence-display-boundary-batch.mjs"
);
assertScript(
  "audit:evidence-display-boundary-batch",
  "node tools/audit-evidence-display-boundary-batch.mjs"
);
assertScript(
  "audit:live-evidence-boundaries",
  "node tools/audit-live-evidence-boundaries.mjs"
);
assertScript(
  "audit:live-evidence-boundary-refusals",
  "node tools/audit-live-evidence-boundary-refusals.mjs"
);

assertContains(
  "gapLog",
  /What Local Verification Proves[\s\S]*?evidence-boundary source audits[\s\S]*?mocked browser route-state smokes[\s\S]*?public TrustSlip Verify[\s\S]*?public community verification[\s\S]*?signed-in Trust Passport[\s\S]*?visible boundary language[\s\S]*?future publish scope[\s\S]*?without performing Git or deployment actions/,
  "Gap log must say what local verification actually proves."
);

assertContains(
  "gapLog",
  /What Local Verification Does Not Prove[\s\S]*?live backend authorization[\s\S]*?production payload shape[\s\S]*?production database records[\s\S]*?Render has deployed[\s\S]*?full mobile\/desktop visual quality[\s\S]*?legal, bank, government, regulatory, escrow, delivery, payout, or credit\s+approval/,
  "Gap log must explicitly block local verification from being treated as live production proof."
);

assertContains(
  "gapLog",
  /Before Claiming Live Evidence Proof[\s\S]*?audit:evidence-display-boundary-batch[\s\S]*?smoke:evidence-display-boundary-batch[\s\S]*?verify:evidence-display-boundary-local[\s\S]*?verify:evidence-live-readiness-local[\s\S]*?verify:evidence-boundary-local-all[\s\S]*?print:evidence-local-batch-stage-plan[\s\S]*?audit:evidence-local-batch-stage-plan[\s\S]*?verify:evidence-publish-readiness-local[\s\S]*?npm --prefix frontend run build[\s\S]*?Live public API boundary[\s\S]*?Live signed-in API boundary[\s\S]*?Render deployment[\s\S]*?Visual QA/,
  "Gap log must list the extra proof layers needed before stronger live claims."
);

assertContains(
  "gapLog",
  /Live Harness[\s\S]*?audit:live-evidence-boundaries[\s\S]*?GSN_LIVE_EVIDENCE_BASE_URL[\s\S]*?GSN_LIVE_TRUSTSLIP_CODE[\s\S]*?GSN_LIVE_COMMUNITY_KEY[\s\S]*?GSN_LIVE_COMMUNITY_MEMBER_KEY[\s\S]*?GSN_LIVE_CONFIRMATION_TOKEN[\s\S]*?GSN_LIVE_AUTH_TOKEN[\s\S]*?--dry-run/,
  "Gap log must document the opt-in live harness and required fixture inputs."
);

assertContains(
  "gapLog",
  /audit:live-evidence-boundary-refusals[\s\S]*?--dry-run[\s\S]*?missing `GSN_LIVE_EVIDENCE_BASE_URL` refuses live requests[\s\S]*?base URL without any fixture input refuses to claim live evidence proof[\s\S]*?must not be treated\s+as API verification/,
  "Gap log must document the local fail-closed refusal audit for the live harness."
);

assertContains(
  "gapLog",
  /GSN_EVIDENCE_LIVE_FIXTURE_RUNBOOK\.md[\s\S]*?template-only fixture\s+runbook[\s\S]*?temporary shell environment variables[\s\S]*?without recording\s+tokens, private codes, production URLs, deploy hooks, or raw payloads/,
  "Gap log must point live operators to the no-secrets fixture runbook."
);

assertContains(
  "gapLog",
  /Next Live-Verification Candidates[\s\S]*?Public TrustSlip Verify no-auth live route check[\s\S]*?Public Community Verify no-auth live route check[\s\S]*?Community Confirmation Outcome public payload privacy check[\s\S]*?Signed-in Trust Timeline auth-required live check[\s\S]*?Evidence ZIP\/PDF redaction check/,
  "Gap log must name narrow next live-verification candidates."
);

assertContains(
  "gapLog",
  /It is not a production proof system[\s\S]*?mocked payloads as production[\s\S]*?polished overclaim/,
  "Gap log must keep the devil's-advocate warning against overclaiming mocked payloads."
);

assertContains(
  "verifier",
  /audit-evidence-display-boundary-batch\.mjs[\s\S]*?smoke-evidence-display-boundary-batch\.mjs[\s\S]*?does not prove live backend authorization, production payload shape, full visual QA, or deployment state/,
  "Local verifier must continue to state its live-proof limits."
);

assertContains(
  "fixtureRunbook",
  /Template-only live\/staging fixture runbook[\s\S]*?No-Secrets Rule[\s\S]*?Do not paste real values[\s\S]*?Forbidden in documentation:[\s\S]*?bearer tokens[\s\S]*?API keys[\s\S]*?deploy hooks[\s\S]*?real production or staging base URLs[\s\S]*?verify:evidence-boundary-local-all[\s\S]*?broadest local\s+preflight[\s\S]*?still not live API proof/,
  "Fixture runbook must stay template-only and no-secrets."
);

assertContains(
  "allLocalVerifier",
  /verify-evidence-display-boundary-local\.mjs[\s\S]*?verify-evidence-live-readiness-local\.mjs[\s\S]*?does not prove live API authorization, production payload shape, visual QA, build health, deployment state, or any real fixture/,
  "All-local verifier must chain display and live-readiness local checks and state its proof limits."
);

assertContains(
  "publishReadinessVerifier",
  /audit-evidence-boundary-local-batch-manifest\.mjs[\s\S]*?audit-evidence-display-boundary-suite\.mjs[\s\S]*?audit-evidence-local-batch-stage-plan\.mjs[\s\S]*?audit-evidence-local-batch-status-scope\.mjs[\s\S]*?verify-evidence-boundary-local-all\.mjs[\s\S]*?git[\s\S]*?diff[\s\S]*?--check[\s\S]*?does not commit, push, deploy, prove Render state, prove live API authorization, or prove production payload shape/,
  "Publish-readiness verifier must stay local and non-publishing."
);

assertContains(
  "stagePlan",
  /read-only preview[\s\S]*?No staging, commit, push, GitHub Actions, or Render deploy is performed[\s\S]*?Unabated truth:[\s\S]*?does not prove production payloads, live authorization, build health, visual quality, or deployment state/,
  "Stage plan must keep future scope printing separate from live proof."
);

assertContains(
  "stagePlanAudit",
  /Shared scope module must define the in-scope evidence batch files[\s\S]*?Status-scope audit must consume the shared evidence batch scope[\s\S]*?Stage plan must not spawn commands or mutate files[\s\S]*?future staging scope is printable, caged, and non-mutating/,
  "Stage-plan audit must cage printable scope and non-mutating behavior."
);

assertContains(
  "statusScopeAudit",
  /git[\s\S]*?status[\s\S]*?--short[\s\S]*?--untracked-files=normal[\s\S]*?No staging, commit, push, or deployment action was performed/,
  "Status-scope audit must remain a read-only git-status scope check."
);

assertContains(
  "publishReadinessNonmutatingAudit",
  /verify-evidence-publish-readiness-local\.mjs[\s\S]*?git[\s\S]*?diff[\s\S]*?--check[\s\S]*?git or gh shell commands[\s\S]*?must not call gh, curl, npm deploy\/publish, Render hooks[\s\S]*?must not write files, delete files, or use opaque shell execution/,
  "Publish-readiness non-mutating audit must block staging, push, deploy, secret, and file-mutation drift."
);

assertContains(
  "liveReadinessVerifier",
  /audit-evidence-live-fixture-runbook\.mjs[\s\S]*?audit-evidence-live-verification-gap-log\.mjs[\s\S]*?audit-live-evidence-boundaries\.mjs", "--dry-run"[\s\S]*?audit-live-evidence-boundary-refusals\.mjs[\s\S]*?does not prove live API authorization, production payload shape, visual QA, build health, deployment state, or any real fixture/,
  "Live-readiness verifier must run only local no-secret, dry-run, and fail-closed checks and state its limits."
);

assertContains(
  "fixtureRunbookAudit",
  /assertNotContains[\s\S]*?https\?:\\\/\\\/[\s\S]*?Bearer\\s\+[\s\S]*?eyJ\[A-Za-z0-9_-\][\s\S]*?deploy-hook\|hooks\\\.render\\\.com/,
  "Fixture runbook audit must reject obvious real URLs, bearer tokens, JWTs, and deploy hooks."
);

assertContains(
  "liveHarness",
  /GSN_LIVE_EVIDENCE_BASE_URL[\s\S]*?GSN_LIVE_TRUSTSLIP_CODE[\s\S]*?GSN_LIVE_COMMUNITY_KEY[\s\S]*?GSN_LIVE_COMMUNITY_MEMBER_KEY[\s\S]*?GSN_LIVE_CONFIRMATION_TOKEN[\s\S]*?GSN_LIVE_AUTH_TOKEN/,
  "Live harness must require explicit base URL and fixture environment variables."
);

assertContains(
  "liveHarness",
  /--dry-run[\s\S]*?Missing required \$\{REQUIRED_BASE_ENV\}[\s\S]*?Refusing to make live requests[\s\S]*?No live evidence fixture was supplied[\s\S]*?Refusing to claim live evidence proof/,
  "Live harness must support dry-run and refuse unconfigured live proof."
);

assertContains(
  "liveHarness",
  /Public TrustSlip Verify live boundary[\s\S]*?Public Community Verify live boundary[\s\S]*?Public Community Member Credential live boundary[\s\S]*?Public Community Confirmation Outcome live boundary[\s\S]*?Signed-in Trust Timeline live boundary/,
  "Live harness must cover the first narrow public and signed-in live evidence candidates."
);

assertContains(
  "liveHarness",
  /access_token[\s\S]*?authorization[\s\S]*?private_contacts[\s\S]*?review_evidence[\s\S]*?admin_notes[\s\S]*?storage_key[\s\S]*?bank_account[\s\S]*?account_number[\s\S]*?sort_code[\s\S]*?risk_flags/,
  "Live harness must scan public payloads for sensitive forbidden keys."
);

assertContains(
  "liveHarness",
  /anonymous request returned HTTP \$\{anonymous\.response\.status\}; expected 401 or 403[\s\S]*?Authorization: `Bearer \$\{authToken\}`/,
  "Live harness must require signed-in evidence routes to reject anonymous reads before authenticated reads."
);

assertContains(
  "liveRefusals",
  /GSN_LIVE_EVIDENCE_BASE_URL[\s\S]*?GSN_LIVE_TRUSTSLIP_CODE[\s\S]*?GSN_LIVE_COMMUNITY_KEY[\s\S]*?GSN_LIVE_COMMUNITY_MEMBER_KEY[\s\S]*?GSN_LIVE_CONFIRMATION_TOKEN[\s\S]*?GSN_LIVE_AUTH_TOKEN/,
  "Refusal audit must clear live fixture environment variables before probing the harness."
);

assertContains(
  "liveRefusals",
  /--dry-run[\s\S]*?Missing required GSN_LIVE_EVIDENCE_BASE_URL\. Refusing to make live requests\.[\s\S]*?No live evidence fixture was supplied\. Refusing to claim live evidence proof\./,
  "Refusal audit must cover dry-run, missing-base, and missing-fixture fail-closed cases."
);

assertContains(
  "liveRefusals",
  /http:\/\/127\.0\.0\.1:9[\s\S]*?must not be treated|fails closed when base URL or fixtures are missing/,
  "Refusal audit must keep its probe local and fail-closed scoped."
);

assertContains(
  "staticBatch",
  /static route-family evidence boundary audits are runnable as one local batch/,
  "Static batch must remain source-audit scoped."
);

assertContains(
  "smokeBatch",
  /mocked browser route-state checks are runnable as one local batch/,
  "Smoke batch must remain mocked-browser scoped."
);

assertContains(
  "suite",
  /audit:evidence-live-verification-gap-log[\s\S]*?audit-evidence-live-verification-gap-log\.mjs/,
  "Discoverability suite must keep the live verification gap audit registered."
);

assertContains(
  "handoff",
  /Evidence display local verifier registered locally[\s\S]*?not a live backend[\s\S]*?production payload-shape[\s\S]*?full visual QA/,
  "Handoff must preserve the local verifier's live-proof limits."
);

if (findings.length > 0) {
  console.error("Evidence live verification gap log audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "Evidence live verification gap log audit passed: local mocked verification remains clearly separated from live backend, production payload, visual QA, and deployment proof."
);
