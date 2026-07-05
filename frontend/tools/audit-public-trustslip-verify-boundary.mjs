/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  app: "src/App.tsx",
  verify: "src/pages/TrustSlipVerifyPage.tsx",
  publicPaper: "src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
  privateEvidence: "src/pages/trustSlipVerify/TrustSlipVerifyPrivateEvidence.tsx",
  boundary: "src/pages/trustSlipVerify/TrustSlipVerifyBoundary.tsx",
  api: "src/lib/api.ts",
  backend: "../gmfn_backend/app/api/routes/trust_slips.py",
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
    text: String(text).replace(/\s+/g, " ").slice(0, 320),
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

function assertCount(key, pattern, expected, message) {
  const source = sourceByKey[key];
  const count = (source.match(pattern) || []).length;
  if (count === expected) return;
  addFinding(key, -1, message, `Expected ${expected}; found ${count}.`);
}

assertContains(
  "app",
  /<Route path="\/t\/:code" element=\{<TrustSlipVerifyPage \/>\} \/>[\s\S]*?<Route path="\/t\/:code\/lite" element=\{<TrustSlipVerifyPage \/>\} \/>[\s\S]*?<Route path="\/verify\/trust-slip" element=\{<TrustSlipVerifyPage \/>\} \/>[\s\S]*?<Route path="\/verify\/trustslip" element=\{<TrustSlipVerifyPage \/>\} \/>[\s\S]*?<Route path="\/trust-slips\/verify\/:code" element=\{<TrustSlipVerifyPage \/>\} \/>[\s\S]*?<Route path="\/trust-slips\/verify\/:code\/page" element=\{<TrustSlipVerifyPage \/>\} \/>[\s\S]*?<Route path="\/trust-slips\/verify\/:code\/lite" element=\{<TrustSlipVerifyPage \/>\} \/>[\s\S]*?<Route path="\/trust-slips\/verify\/:code\/print" element=\{<TrustSlipVerifyPage \/>\} \/>/,
  "Public TrustSlip Verify aliases must continue to route to TrustSlipVerifyPage."
);

assertContains(
  "app",
  /<Route path="trust-slip\/verify" element=\{<TrustSlipVerifyPage \/>\} \/>/,
  "Signed-in TrustSlip Verify route must continue to use the same boundary-aware page."
);

assertContains(
  "verify",
  /const isAppRoute = location\.pathname\.startsWith\("\/app\/"\);/,
  "TrustSlip Verify must derive public/app context from the route path."
);

assertContains(
  "verify",
  /const noPublicCodeSupplied = !isAppRoute && !requestedCode;/,
  "Public no-code state must stay public-only and not fall through to signed-in lookup behavior."
);

assertContains(
  "verify",
  /const \[meRes, clanRes\] = isAppRoute[\s\S]*?getMe[\s\S]*?getCurrentClan[\s\S]*?: \[null, null\];/,
  "Signed-in user and community data must only load on app routes."
);

assertContains(
  "verify",
  /if \(isAppRoute && typeof \(api as any\)\.getMyTrustSlip === "function"\) \{[\s\S]*?mySlip = await \(api as any\)\.getMyTrustSlip\(\)/,
  "Private holder TrustSlip lookup must stay gated to app routes."
);

assertContains(
  "verify",
  /const privateNormalized =[\s\S]*?isAppRoute && mySlipCode && mySlipCode === codeToUse[\s\S]*?\? normalizeTrustSlipVerification\(mySlip, codeToUse\)[\s\S]*?: null;/,
  "Private evidence source must require app route and an exact visible-code match."
);

assertContains(
  "verify",
  /const ownsVisibleTrustSlip =[\s\S]*?isAppRoute &&[\s\S]*?Boolean\(privateEvidenceRecord\) &&[\s\S]*?Boolean\(privateEvidenceCode\) &&[\s\S]*?privateEvidenceCode === visibleRecordCode;/,
  "Private evidence ownership must require app route, private record, and matching visible code."
);

assertContains(
  "verify",
  /buildTrustSlipVerifyViewModel\(\{[\s\S]*?record,[\s\S]*?me: ownsVisibleTrustSlip \? me : null,[\s\S]*?isAppRoute: ownsVisibleTrustSlip,/,
  "Public TrustSlip view model must not receive signed-in identity data unless the visitor owns the visible TrustSlip."
);

assertContains(
  "verify",
  /const canShowPrivateEvidence = ownsVisibleTrustSlip;/,
  "Private evidence visibility must stay tied to visible TrustSlip ownership."
);

assertContains(
  "api",
  /export async function verifyTrustSlip\([\s\S]*?return httpJson\([\s\S]*?`\/trust-slips\/verify\/\$\{encodeURIComponent\(String\(code\)\)\}\$\{buildQuery\([\s\S]*?\)[\s\S]*?"GET",[\s\S]*?undefined,[\s\S]*?\{ includeAuth: false, header_clan_id: null \}/,
  "Public TrustSlip verify API calls must not inherit viewer auth or selected-community headers."
);

assertCount(
  "verify",
  /<PageTopNav\b/g,
  2,
  "TrustSlip Verify PageTopNav inventory changed; re-audit public route navigation chrome."
);

assertContains(
  "verify",
  /\{isAppRoute \? \([\s\S]*?<PageTopNav[\s\S]*?\) : null\}/,
  "Public TrustSlip Verify must not render app PageTopNav outside app routes."
);

assertOrder(
  "verify",
  [
    { label: "public paper", pattern: /<TrustSlipVerifyPublicPaper/ },
    { label: "public sharing boundary", pattern: /<TrustSlipVerifyBoundary/ },
    { label: "private evidence gate", pattern: /\{canShowPrivateEvidence \? \(/ },
    { label: "private evidence disclosure", pattern: /debugId="trust-slip-verify\.full-evidence-toggle"/ },
    { label: "private evidence component", pattern: /<TrustSlipVerifyPrivateEvidence/ },
  ],
  "Public paper, public sharing boundary, and private evidence drawer must stay in the expected order."
);

assertContains(
  "publicPaper",
  /TrustDocumentConfidenceRibbon[\s\S]*TrustDocumentDisclosureSection[\s\S]*TrustDocumentSecurityPanel[\s\S]*TrustDocumentBoundaryPanel[\s\S]*TrustDocumentFingerprint/,
  "Public TrustSlip paper must keep core Trust Document Language primitives."
);

assertContains(
  "publicPaper",
  /const trustSlipConfirmsList = \[[\s\S]*?Public TrustSlip code status[\s\S]*?Visible evidence band and public score[\s\S]*?Displayed holder and GSN ID from this paper[\s\S]*?Community label shown on this TrustSlip[\s\S]*?Verification path and QR destination when available[\s\S]*?\];/,
  "Public TrustSlip paper must keep a clear 'this confirms' boundary list."
);

assertContains(
  "publicPaper",
  /const trustSlipDoesNotConfirmList = \[[\s\S]*?Legal identity or government registration[\s\S]*?The holder's private Trust Passport contents[\s\S]*?Payment, credit, escrow, release, or delivery approval[\s\S]*?Future behaviour or guaranteed performance[\s\S]*?\];/,
  "Public TrustSlip paper must keep a clear 'this does not confirm' boundary list."
);

assertContains(
  "publicPaper",
  /Private passport boundary[\s\S]*?the holder's private Trust Passport remains protected/,
  "Public TrustSlip paper must explicitly protect the private Trust Passport boundary."
);

assertContains(
  "publicPaper",
  /Validity check[\s\S]*?does not open the holder's private Trust Passport[\s\S]*?Evidence, not approval[\s\S]*?not as a guarantee, credit approval, payment instruction/,
  "Visible public reading must preserve non-private-passport and non-approval language."
);

assertContains(
  "boundary",
  /Public paper ends here[\s\S]*?Share or print only the section above[\s\S]*?Private review area below[\s\S]*?signed-in review or repair/,
  "TrustSlip public/private boundary component must still mark where public sharing ends."
);

assertContains(
  "privateEvidence",
  /TrustSlipVerifyPrivateEvidenceProps[\s\S]*?riskFlags[\s\S]*?contributionDiscipline[\s\S]*?repaymentDiscipline[\s\S]*?personalCommitmentDiscipline/,
  "Private evidence component still contains sensitive review-depth fields; keep it gated from public routes."
);

assertContains(
  "backend",
  /def _public_visibility_level\([\s\S]*?ranks = \{"minimal": 0, "standard": 1\}[\s\S]*?if requested not in ranks:[\s\S]*?return stored/,
  "Backend public visibility must continue to exclude detailed public resolution."
);

assertContains(
  "backend",
  /PUBLIC_TRUSTSLIP_BLOCKED_KEYS = \{[\s\S]*?"email"[\s\S]*?"phone"[\s\S]*?"private_contacts"[\s\S]*?"risk_flags"[\s\S]*?"evidence_summary"[\s\S]*?"payment_reference"[\s\S]*?"bank_account"[\s\S]*?"verifier_name"[\s\S]*?"admin_notes"[\s\S]*?\}/,
  "Backend public TrustSlip filter must continue blocking contact, finance, verifier, risk, evidence, and admin fields."
);

assertContains(
  "backend",
  /def _public_trustslip_value\(value: Any\) -> Any:[\s\S]*?if normalized in PUBLIC_TRUSTSLIP_BLOCKED_KEYS:[\s\S]*?continue[\s\S]*?out\[key\] = _public_trustslip_value\(child\)/,
  "Backend public TrustSlip filter must keep recursively dropping blocked keys."
);

assertContains(
  "backend",
  /@router\.get\("\/verify\/\{code\}"\)[\s\S]*?def verify_trust_slip_public[\s\S]*?visibility_level = _public_visibility_level/,
  "Backend public verify route must keep public visibility filtering and minimal-level suppression."
);

assertContains(
  "backend",
  /merchant_view_out = \{[\s\S]*?\*\*_public_trustslip_merchant_view\(merchant_view\)/,
  "Backend public verify route must keep applying the public TrustSlip merchant-view filter."
);

assertContains(
  "backend",
  /"profile_image_url": merchant_view_out\.get\("profile_image_url"\) if visibility_level != "minimal" else None,[\s\S]*?"identity_context": identity_context if visibility_level != "minimal" else \{\},[\s\S]*?"community_context": community_context if visibility_level != "minimal" else \{\},[\s\S]*?"community_confirmation": community_confirmation if visibility_level != "minimal" else \{/,
  "Backend minimal public TrustSlip level must continue suppressing profile image, identity, community, and detailed confirmation context."
);

assertContains(
  "package",
  /"audit:public-trustslip-verify-boundary": "node tools\/audit-public-trustslip-verify-boundary\.mjs"/,
  "Public TrustSlip Verify boundary audit must stay registered in package scripts."
);

if (findings.length > 0) {
  console.error("Public TrustSlip Verify boundary audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "Public TrustSlip Verify boundary audit passed: public aliases, app-only enrichment, ownership-gated private evidence, trust-document limits, and backend public filtering are caged."
);
