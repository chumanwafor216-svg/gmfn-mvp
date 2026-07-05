/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  app: "src/App.tsx",
  routes: "src/lib/appRoutes.ts",
  targets: "src/lib/actionTargetRoutes.ts",
  timeline: "src/pages/TrustTimelinePage.tsx",
  package: "package.json",
  map: "../docs/GSN_EVIDENCE_DISPLAY_IMPLEMENTATION_MAP_DRAFT.md",
  backendTimeline: "../gmfn_backend/app/api/routes/trust_timeline.py",
  backendPack: "../gmfn_backend/app/api/routes/trust_evidence_pack.py",
  backendPdf: "../gmfn_backend/app/api/routes/trust_timeline_pdf.py",
  pdfService: "../gmfn_backend/app/services/trust_timeline_pdf_service.py",
  packService: "../gmfn_backend/app/services/trust_evidence_pack_service.py",
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
    text: String(text).replace(/\s+/g, " ").slice(0, 340),
  });
}

function assertContains(key, pattern, message, text) {
  const source = sourceByKey[key];
  if (pattern.test(source)) return;
  addFinding(key, -1, message, text || pattern.toString());
}

function assertOrder(key, orderedPatterns, message) {
  const source = sourceByKey[key];
  let cursor = -1;
  const seen = [];
  for (const item of orderedPatterns) {
    const scoped = source.slice(cursor + 1);
    const match = scoped.match(item.pattern);
    if (!match || match.index === undefined) {
      addFinding(
        key,
        cursor,
        message,
        `Missing after ${seen.join(" -> ") || "start"}: ${item.label}`
      );
      return;
    }
    cursor = cursor + 1 + match.index;
    seen.push(item.label);
  }
}

assertContains(
  "app",
  /const TrustTimelinePage = React\.lazy\(\(\) => import\("\.\/pages\/TrustTimelinePage"\)\);[\s\S]*?<Route path="trust-timeline" element=\{<TrustTimelinePage \/>\} \/>/,
  "Trust Timeline must stay a signed-in app route rendered by TrustTimelinePage."
);

assertContains(
  "app",
  /<Route path="\/trust-timeline" element=\{<PreserveRedirect to=\{APP_ROUTES\.TRUST_TIMELINE\} \/>\} \/>/,
  "Top-level /trust-timeline must redirect to the signed-in app route, not become public."
);

assertContains(
  "routes",
  /TRUST_TIMELINE: "\/app\/trust-timeline"/,
  "Canonical Trust Timeline route must remain /app/trust-timeline."
);

assertContains(
  "targets",
  /TRUST_TIMELINE: APP_ROUTES\.TRUST_TIMELINE[\s\S]*?"trust-timeline": ACTION_TARGETS\.TRUST_TIMELINE/,
  "Shared action targets must keep Trust Timeline normalized to the signed-in route."
);

assertContains(
  "map",
  /Trust Timeline \| `\/app\/trust-timeline`[\s\S]*?Signed-in event trail and redacted evidence pack tools[\s\S]*?Must stay signed-in\/private and not become public proof or release authority/,
  "Evidence display map must classify Trust Timeline as signed-in/private redacted evidence, not public proof."
);

assertContains(
  "timeline",
  /function getToken\(\): string \| null \{[\s\S]*?localStorage\.getItem\("access_token"\)/,
  "Trust Timeline must read a signed-in access token before loading evidence."
);

assertContains(
  "timeline",
  /async function authedJson[\s\S]*?if \(!tok\) throw new Error\("You are logged out\. Please log in again\."\);[\s\S]*?Authorization: `Bearer \$\{tok\}`/,
  "Trust Timeline JSON loads must require signed-in Authorization."
);

assertContains(
  "timeline",
  /async function authedBlob[\s\S]*?if \(!tok\) throw new Error\("You are logged out\. Please log in again\."\);[\s\S]*?Authorization: `Bearer \$\{tok\}`/,
  "Trust Timeline PDF and ZIP downloads must require signed-in Authorization."
);

assertContains(
  "timeline",
  /authedJson<ScoreExplained>\("\/trust\/score\/explained", "GET"\)[\s\S]*?authedJson<TimelineResponse>\("\/trust\/me\/timeline\?limit=200", "GET"\)/,
  "Trust Timeline page must load score explanation and member timeline through signed-in endpoints."
);

assertContains(
  "timeline",
  /authedJson<PackMetaResp>\([\s\S]*?"\/trust\/me\/evidence-pack\/meta"[\s\S]*?"GET"[\s\S]*?\)/,
  "Trust Timeline evidence pack metadata must stay signed-in."
);

assertContains(
  "timeline",
  /authedBlob\("\/trust\/me\/timeline\.pdf\?limit=200"\)/,
  "Trust Timeline PDF download must use signed-in /trust/me/timeline.pdf."
);

assertContains(
  "timeline",
  /authedBlob\(`\/trust\/me\/evidence-pack\.zip\$\{query\}`\)/,
  "Trust Timeline evidence ZIP download must use signed-in /trust/me/evidence-pack.zip."
);

assertContains(
  "timeline",
  /data-gsn-trust-document-certificate="trust-timeline"[\s\S]*?<TrustDocumentRegistryMasthead[\s\S]*?eyebrow="Private evidence"[\s\S]*?title="Trust Timeline Evidence Record"[\s\S]*?<TrustDocumentConfidenceRibbon[\s\S]*?<TrustDocumentBoundaryPanel[\s\S]*?title="This timeline confirms"[\s\S]*?<TrustDocumentBoundaryPanel[\s\S]*?title="This timeline does not confirm"[\s\S]*?<TrustDocumentSecurityPanel[\s\S]*?<TrustDocumentFingerprint/,
  "Trust Timeline must keep Trust Document Language primitives and private-evidence masthead."
);

assertContains(
  "timeline",
  /const trustTimelineSecurityItems[\s\S]*?Signed-in access[\s\S]*?current member session before loading timeline events, PDF, or evidence pack files[\s\S]*?Visibility-bound evidence[\s\S]*?leaves private contact details out of the portable package[\s\S]*?Reader boundary[\s\S]*?does not approve credit, move money, or authorize release of goods or services/,
  "Trust Timeline security panel must keep signed-in, redacted, and non-approval boundaries."
);

assertContains(
  "timeline",
  /const trustTimelineDoesNotConfirmList = \[[\s\S]*?Payment movement, escrow, payout approval, credit approval, or automatic debit authority[\s\S]*?Authority to release goods, money, credit, services, or private records[\s\S]*?Private contacts, complete private Trust Passport history, protected event details, or admin-only notes[\s\S]*?\];/,
  "Trust Timeline does-not-confirm list must block payment/release authority and private-record exposure."
);

assertContains(
  "timeline",
  /Follow events are attention records[\s\S]*?do not prove[\s\S]*?membership, endorsement, verification, payment evidence, or trust-score[\s\S]*?growth/,
  "Trust Timeline must keep the follow-event boundary so attention records do not become trust proof."
);

assertContains(
  "timeline",
  /The share copy follows your TrustSlip visibility level and leaves[\s\S]*?out private contact details and complete private records/,
  "Trust Timeline evidence share copy must keep redaction language visible."
);

assertOrder(
  "timeline",
  [
    { label: "open TrustSlip action", pattern: /debugId="trust-timeline\.trust-slip"/ },
    { label: "refresh action", pattern: /debugId="trust-timeline\.refresh"/ },
    { label: "download PDF action", pattern: /debugId="trust-timeline\.download-pdf"/ },
    { label: "copy pack id action", pattern: /debugId="trust-timeline\.copy-pack-id"/ },
    { label: "download ZIP action", pattern: /debugId="trust-timeline\.download-evidence-zip"/ },
  ],
  "Trust Timeline action/debug-id inventory must stay traceable."
);

assertContains(
  "backendTimeline",
  /@router\.get\("\/me\/timeline"\)[\s\S]*?current_user: User = Depends\(get_current_user\)[\s\S]*?user_id=int\(current_user\.id\)[\s\S]*?audience="user"[\s\S]*?hide_zero_deltas_for_user=True/,
  "Backend member timeline must stay signed-in, self-scoped, user-audience, and user-redacted."
);

assertContains(
  "backendTimeline",
  /@router\.get\("\/timeline\/\{user_id\}"\)[\s\S]*?_require_admin\(current_user\)[\s\S]*?audience="admin"[\s\S]*?hide_zero_deltas_for_user=False/,
  "Backend arbitrary-user timeline must remain admin-gated."
);

assertContains(
  "backendPack",
  /@router\.get\("\/me\/evidence-pack\/meta"\)[\s\S]*?current_user: User = Depends\(get_current_user\)[\s\S]*?user_id=int\(current_user\.id\)/,
  "Evidence pack metadata route must remain signed-in and self-scoped."
);

assertContains(
  "backendPack",
  /@router\.get\("\/me\/evidence-pack\.zip"\)[\s\S]*?current_user: User = Depends\(get_current_user\)[\s\S]*?build_trust_evidence_pack_zip_with_meta\(db, user_id=int\(current_user\.id\)\)/,
  "Evidence pack ZIP route must remain signed-in and self-scoped."
);

assertContains(
  "backendPdf",
  /@router\.get\("\/timeline\.pdf"\)[\s\S]*?current_user: Any = Depends\(get_current_user\)[\s\S]*?visibility_level = _safe_visibility_level\(current_user, level\)[\s\S]*?redact=True/,
  "Trust Timeline PDF route must remain signed-in and redacted."
);

assertContains(
  "pdfService",
  /def _timeline_contact_boundary\(\) -> str:[\s\S]*?return "redacted for timeline PDF"/,
  "Trust Timeline PDF service must keep contact redaction boundary."
);

assertContains(
  "pdfService",
  /Reader boundary: redacted personal trust history for controlled review\. Not a bank guarantee, credit approval, payment instruction, or automatic debit authority\./,
  "Trust Timeline PDF must keep reader-boundary non-approval language."
);

assertContains(
  "packService",
  /"private_member_reference": "redacted for trust evidence pack"/,
  "Trust evidence pack JSON must keep private member reference redaction."
);

assertContains(
  "packService",
  /build_trust_timeline_pdf\([\s\S]*?audience="user"[\s\S]*?pack_meta=pack_meta/,
  "Trust evidence pack must generate a user-audience timeline PDF with pack metadata."
);

assertContains(
  "package",
  /"audit:trust-timeline-evidence-boundary": "node tools\/audit-trust-timeline-evidence-boundary\.mjs"/,
  "Trust Timeline evidence boundary audit must stay registered in package scripts."
);

if (findings.length > 0) {
  console.error("Trust Timeline evidence boundary audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "Trust Timeline evidence boundary audit passed: signed-in timeline, redacted PDF/ZIP evidence pack, Trust Document boundaries, and non-approval/private-record limits are caged."
);
