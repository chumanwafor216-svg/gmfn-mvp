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
]) {
  if (!generatorSource.includes(requiredText)) {
    addFinding(`Static PDF generator must include institutional positioning text: ${requiredText}.`);
  }
}
if (/21 core capabilities/.test(generatorSource)) {
  addFinding("Static PDF generator must not keep the old 21-capability heading.");
}

if (findings.length) {
  console.error("Static PDF asset audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("Static PDF asset audit passed.");
