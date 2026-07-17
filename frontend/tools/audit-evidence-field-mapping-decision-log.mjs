/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  decisionLog: "../docs/GSN_EVIDENCE_FIELD_MAPPING_DECISION_LOG.md",
  map: "../docs/GSN_EVIDENCE_DISPLAY_IMPLEMENTATION_MAP_DRAFT.md",
  trustDocumentLanguage: "src/components/TrustDocumentLanguage.tsx",
  snapshotPaper: "src/lib/gsnSnapshotPaper.ts",
  trustBandLanguage: "src/lib/trustBandLanguage.ts",
  trustDocumentSnapshots: "src/lib/trustDocumentSnapshots.ts",
  trustDocumentFamilyMap: "src/lib/trustDocumentFamilyMap.ts",
  identityEvidenceCompletion: "src/lib/identityEvidenceCompletion.ts",
  package: "package.json",
};

const sourceByKey = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [
    key,
    readFileSync(join(frontendRoot, file), "utf8"),
  ])
);

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

function assertNotContains(key, pattern, message) {
  const source = sourceByKey[key];
  source.split(/\r?\n/).forEach((line, index) => {
    if (pattern.test(line)) {
      findings.push({
        file: files[key],
        line: index + 1,
        message,
        text: line.trim(),
      });
    }
  });
}

assertContains(
  "map",
  /Field Mapping Gaps[\s\S]*?`evidence_kind`[\s\S]*?`source_engine`[\s\S]*?`verification_state`[\s\S]*?`visibility`[\s\S]*?`provenance`[\s\S]*?`excluded_claims`[\s\S]*?`maturity_label`[\s\S]*?`reference_fingerprint`[\s\S]*?`related_trust_event_id`[\s\S]*?`trustslip_eligible`/,
  "Evidence display map must still list the field gaps that this decision log resolves conservatively."
);

assertContains(
  "decisionLog",
  /Keep evidence-display meaning route-local for now, but audit these shared[\s\S]*?field meanings/,
  "Decision log must keep evidence-display meaning route-local until source fields stabilize."
);

[
  "evidence_kind",
  "source_engine",
  "verification_state",
  "visibility",
  "provenance",
  "excluded_claims",
  "maturity_label",
  "reference_fingerprint",
  "related_trust_event_id",
  "trustslip_eligible",
].forEach((field) => {
  assertContains(
    "decisionLog",
    new RegExp(`\\\`${field}\\\``),
    `Decision log must map ${field}.`
  );
});

assertContains(
  "decisionLog",
  /Do not add a new `EvidenceDisplayRecord`, `EvidenceKind`, or backend schema in[\s\S]*?this batch/,
  "Decision log must explicitly block premature shared evidence schemas in this batch."
);

assertContains(
  "decisionLog",
  /Keep calling it a record\/reference fingerprint\. Do not call it cryptographic proof unless the backend provides cryptographic verification/,
  "Decision log must keep fingerprints as display references, not cryptographic proof."
);

assertContains(
  "decisionLog",
  /Show only when the route has an actual ID\/source\. Do not imply event-backed evidence from summaries or counts alone/,
  "Decision log must keep Trust Event provenance tied to actual IDs/sources."
);

assertContains(
  "decisionLog",
  /Treat as eligible only when a current TrustSlip code, holder-controlled TrustSlip page, public verify route, or explicit release path exists[\s\S]*?Marketplace, Finance, Identity, and Community Domain readiness are not TrustSlip proof by themselves/,
  "Decision log must keep TrustSlip eligibility tied to real TrustSlip/release paths."
);

assertContains(
  "decisionLog",
  /Public TrustSlip Verify \| Public-safe current TrustSlip verification \| TrustSlip \| Public \/ visibility-filtered[\s\S]*?Full private Passport, bank approval, payment movement, auto-debit, goods release, unreleased private evidence/,
  "Decision log must map Public TrustSlip Verify separately from the full private Passport."
);

assertContains(
  "decisionLog",
  /Identity and Integrity \| Identity continuity and evidence readiness[\s\S]*?Identity evidence supports trust; it is not trust itself[\s\S]*?Legal identity proof, professional licence, government ID proof, full trust, payment approval/,
  "Decision log must keep Identity and Integrity as support for trust, not full trust or legal identity proof."
);

assertContains(
  "decisionLog",
  /Marketplace \/ Trade Evidence \| Commerce activity context and protected trade evidence[\s\S]*?Treat as evidence rail and context, not custody[\s\S]*?Escrow, payout approval, bank confirmation, delivery guarantee, release authority/,
  "Decision log must keep Marketplace trade evidence non-custodial."
);

assertContains(
  "decisionLog",
  /Community Domain Evidence Readiness \| Institutional setup\/readiness\/configuration[\s\S]*?Readiness\/configuration\/reporting only unless a release\/public proof route exists[\s\S]*?Issued credentials, public proof, TrustSlip\/Passport writes, permission changes, money movement, private evidence exposure/,
  "Decision log must keep Community Domain readiness separate from released proof and credential issuance."
);

assertContains(
  "decisionLog",
  /Use existing shared primitives:[\s\S]*?TrustDocumentLanguage\.tsx[\s\S]*?gsnSnapshotPaper\.ts[\s\S]*?trustBandLanguage\.ts[\s\S]*?trustDocumentSnapshots\.ts[\s\S]*?trustDocumentFamilyMap\.ts[\s\S]*?identityEvidenceCompletion\.ts/,
  "Decision log must name the shared primitives to reuse before inventing another abstraction."
);

assertContains(
  "trustDocumentLanguage",
  /TrustDocumentRegistryMasthead[\s\S]*?TrustDocumentConfidenceRibbon[\s\S]*?TrustDocumentSecurityPanel[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?TrustDocumentFingerprint/,
  "Trust Document Language primitives must still provide masthead, confidence, boundary, security, and fingerprint building blocks."
);

assertContains(
  "snapshotPaper",
  /Privacy: only details needed for this GSN check are shown\.[\s\S]*?Limitation: GSN evidence only\. Not approval, guarantee, payment instruction, or auto-debit\.[\s\S]*?Security note: Keep the GSN mark, generated time, record code, privacy note, and limitation note with any copy\./,
  "Snapshot paper helper must keep default security, privacy, and limitation notes."
);

assertContains(
  "snapshotPaper",
  /GSN Community Record[\s\S]*?Evidence only\. Open this link to check the current public community record\.[\s\S]*?GSN Public Shop[\s\S]*?Evidence only\. Open this shop link to check current items and visible evidence\.[\s\S]*?GSN support evidence is not approval, a guarantee, a receipt, or payout authority\./,
  "Snapshot paper helper must keep community, shop, and support evidence boundaries."
);

assertContains(
  "trustBandLanguage",
  /This is not a character judgement[\s\S]*?Do not approve credit, release goods, accept responsibility, or make a serious referral from this record alone[\s\S]*?A thin record is not the same as bad trust[\s\S]*?Do not make a serious trust decision from the posture alone/,
  "Trust posture language must keep signal-only and non-character-judgement boundaries."
);

assertContains(
  "trustDocumentSnapshots",
  /Only descriptive evidence posture is shown[\s\S]*?Limitation: identity snapshot only\. Not legal identity proof[\s\S]*?Limitation: consistency evidence only\. Not a character label[\s\S]*?Limitation: TrustSlip is GSN evidence only\. Not a bank guarantee[\s\S]*?Limitation: TrustSlip verification is GSN evidence only[\s\S]*?Limitation: GSN evidence only\. Not approval, guarantee, payment instruction, or auto-debit/,
  "Trust document snapshots must keep identity, CCI, TrustSlip, verify, and Passport limitations."
);

assertContains(
  "trustDocumentFamilyMap",
  /Identity & Integrity[\s\S]*?steady identity layer[\s\S]*?Cross-community consistency[\s\S]*?narrower cross-community consistency read[\s\S]*?Trust Passport[\s\S]*?fuller personal record[\s\S]*?TrustSlip[\s\S]*?portable trust document[\s\S]*?TrustSlip Verify[\s\S]*?current public reading/,
  "Trust document family map must keep Identity, CCI, Trust Passport, TrustSlip, and TrustSlip Verify distinct."
);

assertContains(
  "identityEvidenceCompletion",
  /type IdentityEvidenceKey[\s\S]*?phone[\s\S]*?photo[\s\S]*?bank[\s\S]*?official_id[\s\S]*?Photo is ready on this phone\. Record it now so a real Trust Event can be written[\s\S]*?Add a clear photo\/selfie so Trust Passport and TrustSlip can keep the founder face consistent/,
  "Identity evidence completion must keep identity evidence as route-local readiness that can support Trust Events, Passport, and TrustSlip."
);

assertContains(
  "package",
  /"audit:evidence-field-mapping-decision-log": "node tools\/audit-evidence-field-mapping-decision-log\.mjs"/,
  "Evidence field mapping decision log audit must stay registered in package scripts."
);

assertNotContains(
  "decisionLog",
  /cryptographic proof is available|add a backend schema now|readiness is issued evidence/i,
  "Decision log must not overclaim cryptographic proof, backend schema readiness, TrustSlip proof, or readiness-as-issued-evidence."
);

if (findings.length > 0) {
  console.error("Evidence field mapping decision log audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "Evidence field mapping decision log audit passed: shared field meanings are mapped conservatively, existing primitives are caged, and no premature runtime/backend evidence schema is claimed."
);
