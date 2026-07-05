/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  app: "src/App.tsx",
  community: "src/pages/CommunityVerifyPage.tsx",
  member: "src/pages/CommunityMemberVerifyPage.tsx",
  api: "src/lib/api.ts",
  publicLinks: "src/lib/publicLinks.ts",
  service: "../gmfn_backend/app/services/community_confirmation_service.py",
  package: "package.json",
  protectedFreeze: "tools/audit-protected-button-freeze.mjs",
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

function assertNotContains(key, pattern, message) {
  const source = sourceByKey[key];
  const match = source.match(pattern);
  if (!match || match.index === undefined) return;
  addFinding(key, match.index, message, match[0]);
}

assertContains(
  "app",
  /path="\/verify\/community\/:communityKey\/member\/:memberKey"[\s\S]*?<CommunityMemberVerifyPage \/>[\s\S]*?path="\/verify\/community\/:communityKey"[\s\S]*?<CommunityVerifyPage \/>/,
  "Community Verification and Member Credential public routes must stay mapped to their route-local pages."
);

assertContains(
  "api",
  /export async function getPublicCommunityConfirmation\([\s\S]*?return httpJson\([\s\S]*?`\/community-confirmations\/public\/\$\{encodeURIComponent\(String\(publicToken\)\)\}`,[\s\S]*?"GET",[\s\S]*?undefined,[\s\S]*?\{ includeAuth: false, header_clan_id: null \}/,
  "Public Community Confirmation Outcome GET must not inherit viewer auth or selected-community headers."
);

assertContains(
  "api",
  /export async function getPublicCommunityVerification\([\s\S]*?return httpJson\([\s\S]*?`\/verify\/community\/\$\{encodeURIComponent\(String\(communityKey\)\)\}`,[\s\S]*?"GET",[\s\S]*?undefined,[\s\S]*?\{ includeAuth: false, header_clan_id: null \}/,
  "Public Community Verification GET must not inherit viewer auth or selected-community headers."
);

assertContains(
  "api",
  /export async function getPublicCommunityMemberVerification\([\s\S]*?return httpJson\([\s\S]*?`\/verify\/community\/\$\{encodeURIComponent\(String\(communityKey\)\)\}\/member\/\$\{encodeURIComponent\([\s\S]*?String\(memberKey\)[\s\S]*?\)\}`,[\s\S]*?"GET",[\s\S]*?undefined,[\s\S]*?\{ includeAuth: false, header_clan_id: null \}/,
  "Public Community Member Credential GET must not inherit viewer auth or selected-community headers."
);

assertContains(
  "community",
  /getPublicCommunityVerification\(keyText\)/,
  "Community Verify must load through the public community verification API wrapper."
);

assertContains(
  "community",
  /TrustDocumentRegistryMasthead[\s\S]*TrustDocumentConfidenceRibbon[\s\S]*TrustDocumentSecurityPanel[\s\S]*TrustDocumentBoundaryPanel[\s\S]*TrustDocumentFingerprint/,
  "Community Verify must keep Trust Document Language primitives for a bounded public record."
);

assertContains(
  "community",
  /const confirmsList = \[[\s\S]*?Community identity anchor[\s\S]*?GSN public registry status[\s\S]*?Community ID[\s\S]*?Record currentness signal[\s\S]*?Controlled relay availability[\s\S]*?\];/,
  "Community Verify must keep a clear 'this confirms' boundary list."
);

assertContains(
  "community",
  /const doesNotConfirmList = \[[\s\S]*?Individual members[\s\S]*?Shops or merchants[\s\S]*?Departments, lines, or subgroups[\s\S]*?Transactions or money movement[\s\S]*?Trust Passport standing[\s\S]*?\];/,
  "Community Verify must keep a clear 'this does not confirm' boundary list."
);

assertContains(
  "community",
  /Private member lists, phone numbers, verifier names, witness details, disputes, and private review records are not shown on this public page\./,
  "Community Verify must plainly protect private contacts, member lists, witnesses, disputes, and review records."
);

assertContains(
  "community",
  /Request sent through GSN controlled relay\. Private member contacts were not exposed\./,
  "Community Verify confirmation request success language must keep the private-contact boundary."
);

assertNotContains(
  "community",
  /\b(PageTopNav|BottomNav|AppLayout|TrustPassportPrivateEvidence|TrustSlipVerifyPrivateEvidence)\b/,
  "Community Verify public record must not import app chrome or private evidence components."
);

assertContains(
  "member",
  /getPublicCommunityMemberVerification\([\s\S]*?cleanCommunityKey,[\s\S]*?cleanMemberKey/,
  "Community Member Credential must load through the public member credential API wrapper."
);

assertContains(
  "member",
  /TrustDocumentConfidenceRibbon[\s\S]*TrustDocumentBoundaryPanel[\s\S]*TrustDocumentSecurityPanel[\s\S]*TrustDocumentFingerprint/,
  "Community Member Credential must keep Trust Document Language primitives for scoped member evidence."
);

assertContains(
  "member",
  /const memberCredentialConfirmsList = \[[\s\S]*?Member GSN ID and Community ID[\s\S]*?Membership status and role[\s\S]*?Witness count, renewal status, and currentness labels[\s\S]*?Community record currentness and broad activity summary[\s\S]*?\];/,
  "Community Member Credential must keep a clear 'this confirms' boundary list."
);

assertContains(
  "member",
  /const memberCredentialDoesNotConfirmList = \[[\s\S]*?Legal identity or government registration[\s\S]*?Full Trust Passport or private member history[\s\S]*?Payments, escrow, loans, credit approval, or delivery[\s\S]*?Membership in any other community[\s\S]*?\];/,
  "Community Member Credential must keep a clear 'this does not confirm' boundary list."
);

assertContains(
  "member",
  /Private verifier names, contacts, review notes, payment records, and the full Trust Passport stay hidden\./,
  "Community Member Credential must plainly protect private verifier/contact/review/passport data."
);

assertContains(
  "member",
  /membershipStatusText = firstTruthy\(credential\?\.membership_status, "active"\);/,
  "Community Member Credential active fallback exists and must stay downstream of the credential render gate."
);

assertContains(
  "member",
  /error \? "Credential not found" : title[\s\S]*?\) : credential \? \(/,
  "Community Member Credential primary facts must remain gated behind a loaded credential, not missing/error state fallbacks."
);

assertContains(
  "publicLinks",
  /UNREADY_PUBLIC_CREDENTIAL_KEYS[\s\S]*?"not shown"[\s\S]*?"pending"[\s\S]*?"protected member reference"[\s\S]*?publicCommunityMemberCredentialPath[\s\S]*?return "";/,
  "Public member credential link helper must suppress unready/protected member credential keys."
);

assertContains(
  "service",
  /def public_community_verification\(db: Session, \*, community_key: str\) -> Dict\[str, Any\]:[\s\S]*?"community_public_face_scope": public_face_scope[\s\S]*?"community_next_evidence_scope": next_evidence_scope[\s\S]*?"community_reader_decision_scope": reader_decision_scope[\s\S]*?"community_evidence_currentness_scope": evidence_currentness_scope[\s\S]*?"public_limitation": \(/,
  "Backend public community verification must keep explicit scope and limitation fields."
);

assertContains(
  "service",
  /def public_community_member_verification\([\s\S]*?if community_status != "active":[\s\S]*?raise ValueError\("Community not found"\)[\s\S]*?if not membership:[\s\S]*?raise ValueError\("Member not found in this community"\)[\s\S]*?if is_user_activation_pending\(member\):[\s\S]*?raise ValueError\("Member not found in this community"\)/,
  "Backend public member credential must keep inactive/missing/pending member suppression."
);

assertContains(
  "service",
  /eligible_rows = \[[\s\S]*?if int\(row\.subject_user_id\) in active_member_ids[\s\S]*?and int\(row\.verifier_user_id\) in active_member_ids[\s\S]*?\][\s\S]*?current_rows = \[[\s\S]*?valid_until[\s\S]*?>= now/,
  "Backend public member credential must count only eligible active/current witness rows."
);

assertContains(
  "service",
  /"privacy_note": "Private verifier names and private member contact details are not shown\.",[\s\S]*?"decision_note": "Use this as membership evidence, not as a guarantee or automatic transaction approval\."/,
  "Backend public member credential must keep privacy and non-approval notes."
);

assertContains(
  "service",
  /def request_public_community_verification_confirmation\([\s\S]*?"private_contacts_exposed": False[\s\S]*?"Request sent through GSN controlled relay\. Private member contacts were not exposed\."/,
  "Backend public community confirmation request must keep contacts hidden."
);

assertContains(
  "package",
  /"audit:community-verification-boundary": "node tools\/audit-community-verification-boundary\.mjs"/,
  "Community Verification boundary audit must stay registered in package scripts."
);

assertContains(
  "protectedFreeze",
  /audit-community-verification-boundary\.mjs/,
  "Community Verification boundary audit must stay included in the protected button freeze cage."
);

if (findings.length > 0) {
  console.error("Community Verification boundary audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "Community Verification boundary audit passed: public community/member routes, no-auth public GETs, trust-document boundaries, active credential gating, backend privacy limits, and controlled relay privacy are caged."
);
