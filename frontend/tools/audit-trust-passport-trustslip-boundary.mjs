/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  app: "src/App.tsx",
  trustPassport: "src/pages/TrustScorePage.tsx",
  trustSlip: "src/pages/TrustSlipPage.tsx",
  reader: "src/components/TrustSlipReaderBlock.tsx",
  viewModel: "src/lib/trustPassportViewModel.ts",
  api: "src/lib/api.ts",
  package: "package.json",
  map: "../docs/GSN_EVIDENCE_DISPLAY_IMPLEMENTATION_MAP_DRAFT.md",
  protocol: "../docs/TRUST_DOCUMENT_LANGUAGE_PROTOCOL.md",
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

function assertLineAbsent(key, pattern, message) {
  const source = sourceByKey[key];
  source.split(/\r?\n/).forEach((line, index) => {
    if (!pattern.test(line)) return;
    findings.push({
      file: files[key],
      line: index + 1,
      message,
      text: line.trim(),
    });
  });
}

assertContains(
  "app",
  /const TrustScorePage = React\.lazy\(\(\) => import\("\.\/pages\/TrustScorePage"\)\);[\s\S]*?const TrustSlipPage = React\.lazy\(\(\) => import\("\.\/pages\/TrustSlipPage"\)\);/,
  "Trust Passport and TrustSlip pages must remain separate lazy-loaded surfaces."
);

assertContains(
  "app",
  /<Route path="trust" element=\{<TrustScorePage \/>\} \/>[\s\S]*?<Route path="trust-passport" element=\{<PreserveRedirect to=\{APP_ROUTES\.TRUST\} \/>\} \/>[\s\S]*?<Route path="trust-slip" element=\{<TrustSlipPage \/>\} \/>/,
  "Signed-in /app/trust must render TrustScorePage while /app/trust-slip renders TrustSlipPage."
);

assertContains(
  "app",
  /<Route path="\/trust" element=\{<PreserveRedirect to=\{APP_ROUTES\.TRUST\} \/>\} \/>[\s\S]*?<Route path="\/trust-passport" element=\{<PreserveRedirect to=\{APP_ROUTES\.TRUST\} \/>\} \/>[\s\S]*?<Route path="\/trust-slip" element=\{<PreserveRedirect to=\{APP_ROUTES\.TRUST_SLIP\} \/>\} \/>/,
  "Top-level Trust Passport and TrustSlip aliases must continue to redirect to their canonical signed-in routes."
);

assertContains(
  "protocol",
  /Trust Passport is the fuller personal\/private record[\s\S]*?must not expose private passport contents to public[\s\S]*?readers/,
  "Trust Document protocol must keep the private Trust Passport boundary explicit."
);

assertContains(
  "protocol",
  /TrustSlip is a portable public trust document[\s\S]*?must not expose the[\s\S]*?private[\s\S]*?Trust Passport/,
  "Trust Document protocol must keep TrustSlip as portable public evidence, not a full passport."
);

assertContains(
  "map",
  /Trust Passport \| `\/app\/trust`[\s\S]*?Fuller signed-in trust story[\s\S]*?Do not redesign before mapping exact fields/,
  "Evidence display map must keep /app/trust classified as the fuller signed-in Trust Passport."
);

assertContains(
  "map",
  /TrustSlip holder page \| `\/app\/trust-slip`[\s\S]*?Portable current evidence controlled by holder[\s\S]*?Must not show full private Passport or imply bank\/escrow\/release authority/,
  "Evidence display map must keep /app/trust-slip classified as portable holder-controlled evidence with authority limits."
);

assertContains(
  "api",
  /export async function getMyTrustSlip\(\): Promise<any> \{[\s\S]*?return httpJson\("\/trust-slips\/me", "GET"\);[\s\S]*?\}/,
  "Signed-in holder TrustSlip lookup must keep using the authenticated /trust-slips/me wrapper."
);

assertContains(
  "api",
  /export async function reissueMyTrustSlip[\s\S]*?return httpJson\("\/trust-slips\/me\/reissue", "POST"/,
  "TrustSlip reissue must remain a signed-in holder operation."
);

assertContains(
  "api",
  /export async function verifyTrustSlip[\s\S]*?`\/trust-slips\/verify\/\$\{encodeURIComponent\(String\(code\)\)\}[\s\S]*?\{ includeAuth: false, header_clan_id: null \}/,
  "Public TrustSlip verify wrapper must remain unauthenticated and selected-community-free."
);

assertContains(
  "trustPassport",
  /buildTrustPassportViewModel\(\{[\s\S]*?trustSlipStatus,[\s\S]*?trustSlipCode,[\s\S]*?verifyUrl,/,
  "Trust Passport must continue deriving its signed-in view model with TrustSlip status, code, and verify URL as outputs."
);

assertContains(
  "trustPassport",
  /data-gsn-trust-document-certificate="trust-passport"[\s\S]*?<TrustDocumentConfidenceRibbon[\s\S]*?<TrustDocumentSecurityPanel[\s\S]*?<TrustDocumentBoundaryPanel[\s\S]*?title="This passport confirms"[\s\S]*?<TrustDocumentBoundaryPanel[\s\S]*?title="This passport does not confirm"[\s\S]*?<TrustDocumentFingerprint/,
  "Trust Passport must keep core Trust Document Language primitives and confirms/does-not-confirm panels."
);

assertContains(
  "trustPassport",
  /const trustPassportSecurityItems[\s\S]*?Private passport surface[\s\S]*?not the public TrustSlip[\s\S]*?Public boundary[\s\S]*?Public readers should receive a scoped TrustSlip or community record, not this full private passport/,
  "Trust Passport security panel must explicitly frame the page as private/full and public TrustSlip as scoped."
);

assertContains(
  "trustPassport",
  /const trustPassportConfirmsList = \[[\s\S]*?Signed-in member view of current visible Trust Passport fields[\s\S]*?TrustSlip status and verification path when available[\s\S]*?\];/,
  "Trust Passport confirms list must keep signed-in/full-record and TrustSlip-output boundaries."
);

assertContains(
  "trustPassport",
  /const trustPassportDoesNotConfirmList = \[[\s\S]*?Bank approval, credit approval, payment movement, or escrow[\s\S]*?Future behaviour, future repayment, delivery, or marketplace outcome[\s\S]*?That a public TrustSlip exposes the full private Trust Passport[\s\S]*?\];/,
  "Trust Passport does-not-confirm list must block bank/payment/future-outcome overclaims and full-passport public exposure."
);

assertContains(
  "trustPassport",
  /Record reference for this visible private Trust Passport[\s\S]*?not legal proof or payment approval/,
  "Trust Passport fingerprint must remain a private visible-record reference, not legal/payment proof."
);

assertContains(
  "trustPassport",
  /The trust band is a reading of available evidence, not a character judgement or permanent label/,
  "Trust Passport page language must keep trust-band meaning as evidence reading, not character judgement."
);

assertContains(
  "viewModel",
  /Ask for more evidence before money, credit, or goods/,
  "Trust Passport view model must keep money/credit/goods caution when repayment evidence is incomplete."
);

assertContains(
  "trustSlip",
  /fetchTrustSlipPageData[\s\S]*?cacheBust\("\/trust-slips\/me\/summary"\)[\s\S]*?cacheBust\("\/trust-slips\/me"\)[\s\S]*?getMyTrustSlip/,
  "TrustSlip holder page must load signed-in holder summary/me data, not public verify data as the source of truth."
);

assertContains(
  "trustSlip",
  /api\.reissueMyTrustSlip\([\s\S]*?reason: "holder_requested_fresh_public_trustslip"/,
  "TrustSlip holder refresh must keep using the explicit holder-requested reissue reason."
);

assertContains(
  "trustSlip",
  /data-gsn-trust-document-certificate="trustslip-holder"[\s\S]*?<TrustDocumentConfidenceRibbon[\s\S]*?<TrustDocumentBoundaryPanel[\s\S]*?title="This TrustSlip confirms"[\s\S]*?<TrustDocumentBoundaryPanel[\s\S]*?title="This TrustSlip does not confirm"[\s\S]*?<TrustDocumentSecurityPanel[\s\S]*?<TrustDocumentFingerprint/,
  "TrustSlip holder page must keep core Trust Document Language primitives and confirms/does-not-confirm panels."
);

assertContains(
  "trustSlip",
  /Privacy boundary[\s\S]*?short portable summary[\s\S]*?does not expose the holder's private Trust Passport, private notes, contacts, or admin records/,
  "TrustSlip holder security panel must explicitly protect the private Trust Passport and private records."
);

assertContains(
  "trustSlip",
  /const trustSlipHolderConfirmsList = \[[\s\S]*?Holder display name and GSN ID shown on this TrustSlip[\s\S]*?Current TrustSlip status, code, issue window, and expiry window where available[\s\S]*?QR, verify action, and copied verify link open the public TrustSlip reading when available[\s\S]*?\];/,
  "TrustSlip holder confirms list must keep holder identity, validity window, and public verify path boundaries."
);

assertContains(
  "trustSlip",
  /const trustSlipHolderDoesNotConfirmList = \[[\s\S]*?Bank approval, credit approval, payment movement, or escrow[\s\S]*?Authority to release goods, money, credit, or services[\s\S]*?Private Trust Passport history, private notes, private contacts, or admin records[\s\S]*?\];/,
  "TrustSlip holder does-not-confirm list must block payment/release authority and private Passport exposure."
);

assertContains(
  "trustSlip",
  /<TrustSlipReaderBlock[\s\S]*?memberCredentialPath=\{memberCredentialPath\}/,
  "TrustSlip holder page must keep the reader block and scoped member credential path."
);

assertContains(
  "reader",
  /TrustSlip reader block[\s\S]*?Use this TrustSlip as evidence[\s\S]*?should not make the decision for you/,
  "TrustSlip reader block must keep decision-support language."
);

assertContains(
  "reader",
  /Private verifier names are not exposed here[\s\S]*?Evidence currentness:/,
  "TrustSlip reader block must keep private verifier and currentness boundaries."
);

assertContains(
  "reader",
  /Read this as evidence, not automatic approval[\s\S]*?ask for the full Trust Passport or direct community confirmation/,
  "TrustSlip reader block must keep non-approval guidance and escalation to Passport/community confirmation."
);

assertOrder(
  "trustPassport",
  [
    { label: "open holder TrustSlip", pattern: /debugId="trust-score\.open-trust-slip"[\s\S]*?Open TrustSlip/ },
    { label: "open public verify", pattern: /debugId="trust-score\.verify"[\s\S]*?Open TrustSlip verify/ },
  ],
  "Trust Passport shareable tools must keep holder TrustSlip and public verify as separate actions."
);

assertLineAbsent(
  "trustSlip",
  /data-gsn-trust-document-certificate="trust-passport"/,
  "TrustSlip holder page must not render itself as the full Trust Passport certificate."
);

assertLineAbsent(
  "trustPassport",
  /data-gsn-trust-document-certificate="trustslip-holder"/,
  "Trust Passport page must not render itself as the TrustSlip holder certificate."
);

assertContains(
  "package",
  /"audit:trust-passport-trustslip-boundary": "node tools\/audit-trust-passport-trustslip-boundary\.mjs"/,
  "Trust Passport / TrustSlip boundary audit must stay registered in package scripts."
);

if (findings.length > 0) {
  console.error("Trust Passport / TrustSlip boundary audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "Trust Passport / TrustSlip boundary audit passed: /app/trust remains the fuller private Passport, /app/trust-slip remains holder-controlled portable evidence, public verify stays unauthenticated, and bank/payment/release/private-record overclaims are caged."
);
