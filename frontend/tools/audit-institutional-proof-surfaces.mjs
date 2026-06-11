/* global console, process */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");
const findings = [];

const files = {
  package: "frontend/package.json",
  institutionalPdf: "gmfn_backend/app/services/institutional_pdf.py",
  evidencePack: "gmfn_backend/app/services/evidence_pack_pdf_service.py",
  loanEvidencePack: "gmfn_backend/app/services/loan_evidence_pack_pdf_service.py",
  userEvidencePack: "gmfn_backend/app/services/user_evidence_pack_pdf_service.py",
  trustSlipPdf: "gmfn_backend/app/services/trust_slip_evidence_pdf_service.py",
  trustTimelinePdf: "gmfn_backend/app/services/trust_timeline_pdf_service.py",
  reports: "gmfn_backend/app/services/reports_service.py",
  publicPaper: "frontend/src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
  privateEvidence: "frontend/src/pages/trustSlipVerify/TrustSlipVerifyPrivateEvidence.tsx",
  boundary: "frontend/src/pages/trustSlipVerify/TrustSlipVerifyBoundary.tsx",
  resultCard: "frontend/src/pages/trustSlipVerify/TrustSlipVerifyResultCard.tsx",
  trustSlip: "frontend/src/pages/TrustSlipPage.tsx",
  trustPassport: "frontend/src/pages/TrustScorePage.tsx",
  evidencePanel: "frontend/src/components/EvidencePackPanel.tsx",
  pilotChecklist: "docs/PILOT_EVIDENCE_PACK_CHECKLIST.md",
  uxChecklist: "docs/UX_ACCEPTANCE_CHECKLIST.md",
};

function absolute(file) {
  return join(repoRoot, file);
}

function read(file) {
  const path = absolute(file);
  if (!existsSync(path)) {
    findings.push({
      file,
      line: 1,
      message: "Required proof-surface file is missing.",
      text: file,
    });
    return "";
  }
  return readFileSync(path, "utf8");
}

const sourceByFile = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, read(file)])
);

function lineAt(source, index) {
  return source.slice(0, Math.max(0, index)).split(/\r?\n/).length;
}

function addFinding(key, index, message, text = "Expected pattern was not found.") {
  const file = files[key] || key;
  const source = sourceByFile[key] || "";
  findings.push({
    file,
    line: index >= 0 ? lineAt(source, index) : 1,
    message,
    text: String(text).replace(/\s+/g, " ").slice(0, 300),
  });
}

function assertContains(key, pattern, message) {
  const source = sourceByFile[key];
  if (pattern.test(source)) return;
  addFinding(key, -1, message);
}

function assertNotContains(key, pattern, message) {
  const source = sourceByFile[key];
  let match;
  while ((match = pattern.exec(source))) {
    addFinding(key, match.index, message, match[0]);
  }
}

function assertOrdered(key, snippets, message) {
  const source = sourceByFile[key];
  let cursor = -1;

  for (const snippet of snippets) {
    const index = source.indexOf(snippet, cursor + 1);
    if (index === -1) {
      addFinding(key, Math.max(cursor, 0), message, snippet);
      return;
    }
    cursor = index;
  }
}

const institutionalShellServices = [
  "evidencePack",
  "loanEvidencePack",
  "userEvidencePack",
  "trustTimelinePdf",
  "reports",
];

const pdfServices = [
  ...institutionalShellServices,
  "trustSlipPdf",
];

assertContains(
  "institutionalPdf",
  /def draw_gsn_watermark\(/,
  "Institutional PDF helper must keep the official GSN watermark renderer."
);
assertContains(
  "institutionalPdf",
  /def draw_institutional_header\(/,
  "Institutional PDF helper must keep the reusable header renderer."
);
assertContains(
  "institutionalPdf",
  /def draw_institutional_footer\(/,
  "Institutional PDF helper must keep the reusable footer renderer."
);
assertContains(
  "institutionalPdf",
  /def utc_generated_label\(/,
  "Institutional PDF helper must keep a UTC generated label."
);
assertContains(
  "institutionalPdf",
  /def safe_pdf_text\(/,
  "Institutional PDF helper must keep safe text conversion for official papers."
);
assertContains(
  "institutionalPdf",
  /GLOBAL SUPPORT NETWORK[\s\S]*?Generated:[\s\S]*?Reference:/,
  "Institutional header must show GSN authority, generated time, and reference."
);
assertContains(
  "institutionalPdf",
  /not a bank guarantee/,
  "Institutional footer must keep the limitation that papers are not bank guarantees."
);

for (const key of institutionalShellServices) {
  assertContains(key, /draw_institutional_header/, "PDF services must use the shared institutional header.");
  assertContains(key, /draw_institutional_footer/, "PDF services must use the shared institutional footer.");
  assertContains(key, /safe_pdf_text/, "PDF services must sanitize visible PDF text.");
  assertContains(key, /utc_generated_label/, "PDF services must stamp a UTC generated time.");
}

assertContains(
  "trustSlipPdf",
  /title="GSN TrustSlip Evidence Snapshot"/,
  "TrustSlip PDF metadata must use the GSN evidence snapshot title."
);
assertContains(
  "trustSlipPdf",
  /Global Support Network official evidence paper/,
  "TrustSlip PDF must identify itself as an official GSN evidence paper."
);
assertContains(
  "trustSlipPdf",
  /Evidence Pack ID/,
  "TrustSlip PDF must show an Evidence Pack ID."
);
assertContains(
  "trustSlipPdf",
  /Generated at \(UTC\)/,
  "TrustSlip PDF must show when it was generated."
);
assertContains(
  "trustSlipPdf",
  /not a bank guarantee[\s\S]*?does not auto-debit/,
  "TrustSlip PDF must keep the reader-facing limitation language."
);
assertContains(
  "trustSlipPdf",
  /draw_gsn_watermark[\s\S]*?draw_institutional_footer/,
  "TrustSlip PDF must draw the official watermark and footer on every page."
);

for (const key of pdfServices) {
  assertNotContains(
    key,
    /GMFN Evidence Pack|GMFN TrustSlip Evidence Snapshot|GMFN Trust Timeline Evidence Report|GMFN Loan Trust Report|GMFN Clan Exposure Report/g,
    "Official PDF paper titles must use the user-facing GSN brand, not GMFN."
  );
  assertNotContains(
    key,
    /[\u2013\u2014\u2018\u2019\u201C\u201D\u00A0\u00C2]/g,
    "Official PDF source text must avoid non-ASCII punctuation that can render badly in generated papers."
  );
  assertNotContains(
    key,
    /â|�/g,
    "Official PDF source text must not contain garbled mojibake characters."
  );
}

assertContains(
  "publicPaper",
  /import GSNBrandMark/,
  "Public TrustSlip paper must use the official GSN brand mark."
);
assertContains(
  "publicPaper",
  /officialPaperWatermark[\s\S]*?<GSNBrandMark/,
  "Public TrustSlip paper must keep the official paper watermark."
);
assertContains(
  "publicPaper",
  /QRCodeSVG/,
  "Public TrustSlip paper must keep QR verification support."
);
assertContains(
  "publicPaper",
  /Public verification paper[\s\S]*?TrustSlip Verify/,
  "Public TrustSlip paper must present itself as an institutional verification paper."
);
assertContains(
  "publicPaper",
  /Code: \{resolvedCode \|\| "Not available"\}[\s\S]*?Public link: \{verifyPath \|\| "Not available"\}/,
  "Public TrustSlip paper must expose both code and verification path."
);
assertContains(
  "publicPaper",
  /GSN returns counts and outcome only\. It does not publish member phone numbers\./,
  "Public TrustSlip paper must keep privacy boundary language."
);
assertContains(
  "publicPaper",
  /decision left with the reader/,
  "Public TrustSlip paper footer must keep the reader-decision limitation."
);

assertContains(
  "privateEvidence",
  /import GSNBrandMark/,
  "Private evidence area must keep the official GSN watermark."
);
assertContains(
  "privateEvidence",
  /className="print-trust-document"/,
  "Private evidence area must remain printable as a document section."
);
assertContains(
  "privateEvidence",
  /Verification code:[\s\S]*?Verification state:/,
  "Private evidence area must show verification code and state."
);
assertContains(
  "privateEvidence",
  /Public verify path:/,
  "Private evidence area must show the public verify path."
);

assertContains(
  "boundary",
  /Public paper ends here[\s\S]*?Private review area below/,
  "TrustSlip verify page must clearly separate public paper from private review."
);
assertContains(
  "resultCard",
  /Verification result[\s\S]*?Code: \{resolvedCode \|\| "Not available"\}[\s\S]*?Status: \{statusLabel\}/,
  "TrustSlip result card must show result, code, and status."
);

assertContains(
  "trustSlip",
  /Open TrustSlip Verify[\s\S]*?Copy Verify Link[\s\S]*?Open Public Verify/,
  "TrustSlip page must keep open/copy/public verify actions."
);
assertContains(
  "trustSlip",
  /This is not a bank guarantee[\s\S]*?No automatic debit is connected/,
  "TrustSlip page must keep institutional limitation language visible."
);
assertContains(
  "trustPassport",
  /7\. Shareable trust tools[\s\S]*?debugId="trust-score\.verify"[\s\S]*?Open TrustSlip verify/,
  "Trust Passport must keep the shareable TrustSlip verify action."
);
assertContains(
  "trustPassport",
  /TrustPaperSecurityFooter/,
  "Trust Passport must keep the proof-paper security footer on institutional sections."
);

assertContains(
  "evidencePanel",
  /GSN Evidence Pack \(PDF\)/,
  "Evidence pack panel must use GSN institutional wording."
);
assertContains(
  "evidencePanel",
  /not a bank guarantee/,
  "Evidence pack panel must show the paper limitation before download."
);
assertContains(
  "evidencePanel",
  /GsnRealisticIcon/,
  "Evidence pack panel must use the shared 3D icon system."
);

assertContains(
  "pilotChecklist",
  /10_generated_pdfs[\s\S]*?GSN institutional PDF shell[\s\S]*?not a bank guarantee/,
  "Pilot evidence checklist must keep the generated-PDF institutional shell requirement."
);
assertContains(
  "uxChecklist",
  /watermark (?:or|\/) brand mark[\s\S]*?generated time[\s\S]*?limitation statement[\s\S]*?footer/,
  "UX checklist must keep proof-paper authority requirements."
);

assertOrdered(
  "package",
  ['"audit:trust-actions"', '"audit:proof-surfaces"'],
  "Proof surface audit must be registered near trust audits in package scripts."
);

if (findings.length > 0) {
  console.error("Institutional proof surface audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log("Institutional proof surface audit passed.");
