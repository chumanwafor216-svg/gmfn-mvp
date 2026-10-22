/* global console, process */

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = mkdtempSync(join(tmpdir(), "gsn-dashboard-attention-"));

try {
  writeFileSync(join(outputRoot, "package.json"), '{"type":"module"}\n', "utf8");
  execFileSync(
    process.execPath,
    [
      join(frontendRoot, "node_modules", "typescript", "bin", "tsc"),
      "--target",
      "ES2020",
      "--module",
      "ES2020",
      "--moduleResolution",
      "node",
      "--skipLibCheck",
      "--outDir",
      outputRoot,
      join(frontendRoot, "src", "lib", "dashboardTrustSemantics.ts"),
      join(frontendRoot, "src", "lib", "dashboardAttentionEngine.ts"),
    ],
    { cwd: frontendRoot, stdio: "inherit" }
  );

  const semanticsPath = join(outputRoot, "dashboardTrustSemantics.js");
  const enginePath = join(outputRoot, "dashboardAttentionEngine.js");
  assert.ok(existsSync(semanticsPath), "Trust semantics module should compile");
  assert.ok(existsSync(enginePath), "Attention engine should compile");

  const semantics = await import(pathToFileURL(semanticsPath).href);
  const engine = await import(pathToFileURL(enginePath).href);

  assert.equal(
    semantics.classifyDashboardTrustEvidence({
      rawClass: "D",
      trustExplanation: {
        computed: {
          counts: { missed_payments: 0, defaults: 0 },
          penalties: { total: 0 },
          gains: { total: 2.9, identity_phone: 1.45 },
          starter_evidence_summary: { phone_verified: true },
        },
      },
    }),
    "starter_building"
  );
  assert.equal(
    semantics.classifyDashboardTrustEvidence({
      rawClass: "D",
      trustExplanation: {
        computed: {
          counts: { missed_payments: 1 },
          penalties: { total: 4 },
          gains: { total: 0 },
        },
      },
    }),
    "adverse"
  );
  assert.equal(
    semantics.classifyDashboardTrustEvidence({
      rawClass: "D",
      trustExplanation: {
        computed: {
          counts: { missed_payments: 0 },
          penalties: { total: 0 },
          gains: { total: 0 },
        },
      },
    }),
    "insufficient"
  );

  for (const kind of [
    "marketplace.shop.broadcast_created",
    "marketplace.shop.product_created",
    "demand_new",
    "demand_posted",
    "approval_request",
  ]) {
    assert.equal(
      semantics.dashboardNotificationRequiresAttention({ kind }, "actNow"),
      false,
      `${kind} must remain informational`
    );
  }
  assert.equal(
    semantics.dashboardNotificationRequiresAttention(
      { kind: "approval_request", attention_actionable: false },
      "actNow"
    ),
    false
  );
  assert.equal(
    semantics.dashboardNotificationRequiresAttention(
      { kind: "approval_request", attention_actionable: true },
      "actNow"
    ),
    true
  );

  const nowMs = Date.UTC(2026, 9, 19, 12, 0, 0);
  const baseInput = {
    userClass: "steady",
    nextRouteKey: "notifications",
    nextRouteLabel: "notifications",
    nextRouteTo: "/app/notifications",
    nextRouteCopy: {
      issueText: "One item needs a decision.",
      consequenceText: "The decision is waiting.",
      actionText: "Open the item and decide.",
    },
    totalNotifications: 11,
    actNowCount: 0,
    unreadCount: 11,
    actionableCount: 0,
    issueKeys: [],
    scopeKey: "community-1|starter-building",
    sourceTitles: ["Marketplace"],
    focusBehindCount: 0,
    focusWatchCount: 0,
    focusNextReviewLabel: "",
    focusRouteTo: "/app/dashboard#focus-commitments",
    notificationsTo: "/app/notifications",
    nowMs,
  };

  const informationalSignal = engine.buildDashboardAttentionSignal(baseInput);
  assert.equal(informationalSignal.active, false);

  const actionableSignal = engine.buildDashboardAttentionSignal({
    ...baseInput,
    userClass: "approval",
    nextRouteKey: "join-requests",
    actionableCount: 1,
    issueKeys: ["approval:7"],
  });
  assert.equal(actionableSignal.active, true);
  assert.equal(actionableSignal.sourceKind, "approval");

  const targetedDemandSignal = engine.buildDashboardAttentionSignal({
    ...baseInput,
    userClass: "demand",
    nextRouteKey: "demand-box",
    nextRouteLabel: "DemandBox",
    nextRouteTo: "/app/demand-box?clan_id=1&queue=tagged&demand_id=9",
    actionableCount: 1,
    demandActionable: true,
    issueKeys: ["demand:9"],
    issueTitle: "Request for you: Dairy juice",
    issueDetail:
      "This was sent directly to you. Open it to decide whether you can help; you are not committed until you answer.",
  });
  assert.equal(targetedDemandSignal.active, true);
  assert.equal(targetedDemandSignal.sourceKind, "demand");
  assert.equal(targetedDemandSignal.title, "Request for you: Dairy juice.");
  assert.match(targetedDemandSignal.intro, /not committed until you answer/i);
  assert.equal(targetedDemandSignal.ctaLabel, "Open exact request");
  assert.match(targetedDemandSignal.ctaTo, /demand_id=9/);

  const generalDemandSignal = engine.buildDashboardAttentionSignal({
    ...baseInput,
    userClass: "demand",
    nextRouteKey: "demand-box",
    actionableCount: 1,
    demandActionable: false,
    issueKeys: ["other:4"],
  });
  assert.notEqual(generalDemandSignal.sourceKind, "demand");

  const repairSignal = engine.buildDashboardAttentionSignal({
    ...baseInput,
    userClass: "repair",
    nextRouteKey: "trust",
    actionableCount: 1,
    issueKeys: ["evidence:23"],
  });
  const agedRepairSignal = engine.buildDashboardAttentionSignal({
    ...baseInput,
    userClass: "repair",
    nextRouteKey: "trust",
    actionableCount: 1,
    issueKeys: ["evidence:23"],
    nowMs: nowMs + 120 * 60 * 60 * 1000,
    storedState: repairSignal.state,
  });
  assert.equal(agedRepairSignal.stage, "followup");
  assert.doesNotMatch(agedRepairSignal.intro, /same problem/i);

  const changedIssueSignal = engine.buildDashboardAttentionSignal({
    ...baseInput,
    userClass: "repair",
    nextRouteKey: "trust",
    actionableCount: 1,
    issueKeys: ["evidence:24"],
    storedState: repairSignal.state,
  });
  assert.notEqual(changedIssueSignal.signature, repairSignal.signature);

  console.log("Dashboard attention semantics tests passed.");
} finally {
  if (outputRoot.startsWith(join(tmpdir(), "gsn-dashboard-attention-"))) {
    rmSync(outputRoot, { recursive: true, force: true });
  }
}
