/* global console, process */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const publicDir = join(root, "public");
const requiredPdfs = [
  "GSN_FINAL_WHITE.pdf",
  "gmfn-executive-summary.pdf",
  "GMFN_FINAL_WHITE.pdf",
];

const findings = [];

function addFinding(message) {
  findings.push(message);
}

function isRealPdf(bytes) {
  return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
}

const pdfBytesByName = new Map();

for (const name of requiredPdfs) {
  const path = join(publicDir, name);
  if (!existsSync(path)) {
    addFinding(`${name} is missing from frontend/public.`);
    continue;
  }
  const bytes = readFileSync(path);
  pdfBytesByName.set(name, bytes);
  if (!isRealPdf(bytes)) {
    addFinding(`${name} must be a real PDF binary, not plain text with a .pdf extension.`);
  }
  if (!bytes.subarray(Math.max(0, bytes.length - 32)).includes(Buffer.from("%%EOF"))) {
    addFinding(`${name} must end with a PDF EOF marker.`);
  }
  if (bytes.length < 8000) {
    addFinding(`${name} is too small for the institutional executive summary PDF.`);
  }
  if (bytes.includes(Buffer.from("GLOBAL SUPPORT NETWORK (GSN)\r\nExecutive Summary"))) {
    addFinding(`${name} appears to have regressed to the old plain-text body.`);
  }
}

const canonical = pdfBytesByName.get("GSN_FINAL_WHITE.pdf");
for (const alias of ["gmfn-executive-summary.pdf", "GMFN_FINAL_WHITE.pdf"]) {
  const aliasBytes = pdfBytesByName.get(alias);
  if (canonical && aliasBytes && !canonical.equals(aliasBytes)) {
    addFinding(`${alias} must remain a byte-for-byte compatibility alias of GSN_FINAL_WHITE.pdf.`);
  }
}

const trustSlipSource = readFileSync(join(root, "src/pages/TrustSlipPage.tsx"), "utf8");
if (!/const GSN_EXEC_SUMMARY_URL = "\/GSN_FINAL_WHITE\.pdf";/.test(trustSlipSource)) {
  addFinding("TrustSlipPage must default the executive summary link to /GSN_FINAL_WHITE.pdf.");
}
if (/const GMFN_EXEC_SUMMARY_URL = "\/gmfn-executive-summary\.pdf";/.test(trustSlipSource)) {
  addFinding("TrustSlipPage must not keep the old GMFN executive summary constant as the visible default.");
}

const generatorSource = readFileSync(join(root, "tools/generate-static-gsn-pdfs.py"), "utf8");
for (const requiredText of [
  "22 things GSN does",
  "Commitment Builder",
  "community capital",
  "ten-year view",
  "API-paid verification",
  "full escrow or automated release rail",
  "community capital grows",
  "private life into the open",
  "demonstrated value into practical access",
]) {
  if (!generatorSource.includes(requiredText)) {
    addFinding(`Static PDF generator must include institutional positioning text: ${requiredText}.`);
  }
}
if (!/savings, repayment,\s*"\s*\n\s*"retirement readiness/.test(generatorSource)) {
  addFinding("Static PDF generator must include Commitment Builder readiness text for savings, repayment, and retirement readiness.");
}
if (/real community trust made visible in GSN/.test(generatorSource)) {
  addFinding("Static PDF generator must not fall back to the old generic capability explanation.");
}
if (!/explanation pending/.test(generatorSource)) {
  addFinding("Static PDF generator must keep an obvious missing-explanation fallback for future capability additions.");
}
if (!/def validate_capability_explanations\(\)/.test(generatorSource)) {
  addFinding("Static PDF generator must fail closed when a listed capability has no tailored public explanation.");
}
if (!/Missing public PDF capability explanation/.test(generatorSource)) {
  addFinding("Static PDF generator must name missing capability explanations instead of silently generating an incomplete public paper.");
}
if (/21 core capabilities/.test(generatorSource)) {
  addFinding("Static PDF generator must not keep the old 21-capability heading.");
}
for (const driftedTitle of [
  "People-backed support",
  "Trust savings and ROSCA support",
]) {
  if (generatorSource.includes(`"${driftedTitle}"`)) {
    addFinding(`Static PDF generator must use the exact capability title instead of: ${driftedTitle}.`);
  }
}

if (findings.length) {
  console.error("Static PDF asset audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("Static PDF asset audit passed.");
