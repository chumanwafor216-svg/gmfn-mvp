/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  app: "src/App.tsx",
  api: "src/lib/api.ts",
  dashboard: "src/pages/CommunityDomainDashboardPage.tsx",
  trustEvidencePanels:
    "src/pages/communityDomainDashboard/TrustEvidenceReadinessPanels.tsx",
  package: "package.json",
  map: "../docs/GSN_EVIDENCE_DISPLAY_IMPLEMENTATION_MAP_DRAFT.md",
  domainProtocol:
    "../docs/GSN_COMMUNITY_DOMAIN_ENGINE_PHILOSOPHY_PROTOCOL_2026-06-30.md",
  identityProtocol:
    "../docs/GSN_COMMUNITY_IDENTITY_MEMBERSHIP_TRUST_VERIFICATION_PROTOCOL_2026-06-30.md",
  graphProtocol:
    "../docs/GSN_COMMUNITY_VERIFICATION_TRUST_GRAPH_RELATIONSHIP_INTELLIGENCE_PROTOCOL_2026-06-30.md",
  backend: "../gmfn_backend/app/api/routes/community_domains.py",
  backendTests: "../gmfn_backend/tests/test_community_domains.py",
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
  /Community Domain Evidence Readiness \| `\/app\/community-domain`, `\/app\/community-domain\/:communityDomainId`[\s\S]*?Institutional setup\/readiness for evidence authority, release readiness, relay readiness, trust mobility, member verification, governance[\s\S]*?Current surfaces mostly show readiness\/configuration\. They must not look like issued public credentials or live proof until a release path proves that/,
  "Evidence display map must keep Community Domain evidence surfaces as readiness/configuration, not issued proof."
);

assertContains(
  "map",
  /Community Domain Evidence\/Readiness[\s\S]*?\/community-domains\/\{id\}\/evidence-map[\s\S]*?\/community-domains\/\{id\}\/evidence-record-readiness[\s\S]*?\/community-domains\/\{id\}\/evidence-release-readiness[\s\S]*?\/community-domains\/\{id\}\/trust-relay-readiness[\s\S]*?\/community-domains\/\{id\}\/member-verification-map[\s\S]*?\/community-domains\/\{id\}\/verification-requirements[\s\S]*?\/community-domains\/\{id\}\/node-evidence-authority-map[\s\S]*?\/community-domains\/\{id\}\/record-privacy-map[\s\S]*?readiness\/configuration\/reporting endpoints unless a specific release[\s\S]*?or public proof route says otherwise/,
  "Evidence display map must list Community Domain readiness endpoint families as readiness/configuration/reporting only."
);

assertContains(
  "map",
  /Audit Community Domain evidence\/readiness surfaces and keep readiness[\s\S]*?separate from released evidence/,
  "Evidence display implementation order must keep this Community Domain readiness-vs-released-evidence lane explicit."
);

assertContains(
  "domainProtocol",
  /Community Domains do not replace GSN[\s\S]*?They configure GSN[\s\S]*?Every Community Domain uses the same engines/,
  "Community Domain protocol must keep Community Domains as configured GSN surfaces, not a separate proof platform."
);

assertContains(
  "identityProtocol",
  /Identity;[\s\S]*?Membership;[\s\S]*?Community Verification;[\s\S]*?Trust;[\s\S]*?Endorsement[\s\S]*?These five concepts must never be confused[\s\S]*?Trust is always the last layer[\s\S]*?Never the first/,
  "Identity protocol must preserve separate identity, membership, verification, endorsement, and trust layers."
);

assertContains(
  "graphProtocol",
  /Community Verification is not the creation of trust[\s\S]*?communication of what the community already knows[\s\S]*?Can you guarantee this person\?[\s\S]*?The community only answers what it genuinely knows/,
  "Community verification protocol must prevent community readiness/verification from becoming a guarantee."
);

assertContains(
  "app",
  /const CommunityDomainDashboardPage = React\.lazy\([\s\S]*?import\("\.\/pages\/CommunityDomainDashboardPage"\)[\s\S]*?path="community-domain"[\s\S]*?path="community-domains"[\s\S]*?path="community-domain\/:communityDomainId"[\s\S]*?path="community-domains\/:communityDomainId"/,
  "Community Domain dashboard must stay a signed-in app dashboard route."
);

assertContains(
  "api",
  /getCommunityDomainNodeEvidenceAuthorityMap[\s\S]*?\/node-evidence-authority-map[\s\S]*?getCommunityDomainEvidenceMap[\s\S]*?\/evidence-map[\s\S]*?getCommunityDomainEvidenceRecordReadiness[\s\S]*?\/evidence-record-readiness[\s\S]*?getCommunityDomainEvidenceReleaseReadiness[\s\S]*?\/evidence-release-readiness[\s\S]*?getCommunityDomainTrustRelayReadiness[\s\S]*?\/trust-relay-readiness[\s\S]*?getCommunityDomainNotificationScopeReadiness[\s\S]*?\/notification-scope-readiness[\s\S]*?getCommunityDomainTrustMobility[\s\S]*?\/trust-mobility/,
  "Frontend API wrappers must keep Community Domain evidence/readiness calls explicit and signed-in through the shared API client."
);

assertContains(
  "api",
  /getCommunityDomainMemberVerificationMap[\s\S]*?\/member-verification-map[\s\S]*?getCommunityDomainRecordPrivacyMap[\s\S]*?\/record-privacy-map[\s\S]*?getCommunityDomainReadiness[\s\S]*?\/readiness[\s\S]*?getCommunityDomainVerificationRequirements[\s\S]*?\/verification-requirements/,
  "Frontend API wrappers must keep member verification, record privacy, readiness, and verification requirements as scoped Community Domain reads."
);

assertContains(
  "dashboard",
  /type ServiceDetailKey = "readiness" \| "local" \| "boundaries" \| "trust" \| "evidence"[\s\S]*?key: "evidence"[\s\S]*?label: "Evidence"[\s\S]*?note: "Open evidence records, release, relay, notices, and mobility readiness\."/,
  "Community Domain dashboard must label the evidence tab as readiness, not issued evidence."
);

assertContains(
  "dashboard",
  /lazy\([\s\S]*?import\("\.\/communityDomainDashboard\/TrustEvidenceReadinessPanels"\)[\s\S]*?getCommunityDomainEvidenceRecordReadiness[\s\S]*?getCommunityDomainEvidenceReleaseReadiness[\s\S]*?getCommunityDomainTrustRelayReadiness[\s\S]*?getCommunityDomainNotificationScopeReadiness[\s\S]*?getCommunityDomainTrustMobility[\s\S]*?CommunityDomainTrustEvidenceReadinessPanels[\s\S]*?evidenceRecordReadiness=\{evidenceRecordReadiness\}[\s\S]*?evidenceReleaseReadiness=\{evidenceReleaseReadiness\}[\s\S]*?trustRelayReadiness=\{trustRelayReadiness\}[\s\S]*?notificationScopeReadiness=\{notificationScopeReadiness\}[\s\S]*?trustMobility=\{trustMobility\}/,
  "Community Domain dashboard must load and pass the evidence readiness data into the dedicated readiness panels."
);

assertContains(
  "dashboard",
  /This dashboard does not create payment steps, confirm payment,[\s\S]*?activate billing, activate a Community Domain, verify ownership, show[\s\S]*?private finance records, or show private member evidence/,
  "Community Domain dashboard boundary must keep dashboard reads separate from activation, verification, payment, and private evidence."
);

assertContains(
  "trustEvidencePanels",
  /Evidence record readiness[\s\S]*?ready for future evidence records[\s\S]*?This view only shows evidence-record readiness\. It does not create[\s\S]*?records, upload files, issue credentials, publish proof, verify authority,[\s\S]*?score trust, move money, or show private evidence/,
  "Evidence record panel must say readiness only and block records, credentials, proof, authority verification, trust scoring, money, and private evidence."
);

assertContains(
  "trustEvidencePanels",
  /Evidence release readiness[\s\S]*?release checks are ready[\s\S]*?This view only shows public-release readiness\. It does not release[\s\S]*?evidence, publish proof, create public links or QR codes, issue[\s\S]*?credentials, share records, change permissions, score trust, move money,[\s\S]*?or show private evidence/,
  "Evidence release panel must say public-release readiness only and block actual release/proof/links/QR/permission changes."
);

assertContains(
  "trustEvidencePanels",
  /Trust relay readiness[\s\S]*?relay checks are ready[\s\S]*?This view only shows relay readiness\. It does not create relay paths,[\s\S]*?publish proof, repost Spotlight, create discovery or affiliations, share[\s\S]*?private records, issue credentials, create marketplace activity, activate[\s\S]*?billing, or move money/,
  "Trust relay panel must keep relay readiness separate from relay creation, proof, discovery, affiliation, marketplace, billing, and money movement."
);

assertContains(
  "trustEvidencePanels",
  /Notification scope readiness[\s\S]*?audience checks are ready[\s\S]*?This view only shows audience readiness\. It does not send messages,[\s\S]*?create delivery jobs or audience lists, publish announcements, show[\s\S]*?member lists, create marketplace records, move money, create trust[\s\S]*?records, or show private records/,
  "Notification scope panel must keep audience readiness separate from delivery, audience lists, announcements, trust records, money, and private records."
);

assertContains(
  "trustEvidencePanels",
  /Trust mobility readiness[\s\S]*?portability checks are ready[\s\S]*?This view only shows trust-mobility readiness\. It does not create trust[\s\S]*?records, credentials, relay paths, public proof, outward links,[\s\S]*?marketplace activity, separate communities, move money, or show[\s\S]*?private records/,
  "Trust mobility panel must keep portability readiness separate from trust records, credentials, proof, links, marketplace activity, communities, money, and private records."
);

assertContains(
  "backend",
  /def _community_domain_evidence_map_payload[\s\S]*?Community Domain evidence map is a read-only evidence readiness[\s\S]*?does not upload evidence[\s\S]*?does not show files[\s\S]*?does not show storage keys[\s\S]*?create member[\s\S]*?credentials[\s\S]*?create TrustSlips[\s\S]*?create Trust Passport entries[\s\S]*?publish a[\s\S]*?@router\.get\("\/\{community_domain_id\}\/evidence-map"[\s\S]*?def get_community_domain_evidence_map[\s\S]*?_require_domain_member_scope/,
  "Backend evidence map must stay scoped, read-only readiness without files, credentials, TrustSlips, Trust Passport entries, or publication."
);

assertContains(
  "backend",
  /def _community_domain_evidence_record_readiness_payload[\s\S]*?read-only durable evidence record readiness item[\s\S]*?does not create CommunityDomainEvidenceRecord rows[\s\S]*?upload files[\s\S]*?show storage keys[\s\S]*?issue credentials[\s\S]*?issue TrustSlips[\s\S]*?write Trust Passport entries[\s\S]*?publish proof[\s\S]*?@router\.get\("\/\{community_domain_id\}\/evidence-record-readiness"[\s\S]*?def get_community_domain_evidence_record_readiness[\s\S]*?_require_domain_member_scope/,
  "Backend evidence-record readiness must stay scoped, read-only, and non-issuing."
);

assertContains(
  "backend",
  /def _community_domain_evidence_release_readiness_payload[\s\S]*?Community Domain evidence release readiness is read-only public-safe[\s\S]*?does not release evidence[\s\S]*?show[\s\S]*?files[\s\S]*?show storage keys[\s\S]*?publish public proof[\s\S]*?create public[\s\S]*?URLs[\s\S]*?create QR codes[\s\S]*?issue credentials[\s\S]*?issue TrustSlips[\s\S]*?write[\s\S]*?Trust Passport entries[\s\S]*?@router\.get\("\/\{community_domain_id\}\/evidence-release-readiness"[\s\S]*?def get_community_domain_evidence_release_readiness[\s\S]*?_require_domain_member_scope/,
  "Backend evidence-release readiness must stay scoped read-only public-safe planning without proof, URLs, QR, credentials, TrustSlips, or Passport writes."
);

assertContains(
  "backend",
  /def _community_domain_trust_relay_readiness_payload[\s\S]*?Community Domain trust relay readiness is read-only relay path[\s\S]*?does not create trust relay path records[\s\S]*?repost[\s\S]*?Spotlight[\s\S]*?publish proof[\s\S]*?cross-domain discovery[\s\S]*?share private[\s\S]*?records[\s\S]*?issue TrustSlips[\s\S]*?write Trust Passport entries[\s\S]*?create credentials[\s\S]*?@router\.get\("\/\{community_domain_id\}\/trust-relay-readiness"[\s\S]*?def get_community_domain_trust_relay_readiness[\s\S]*?_require_domain_member_scope/,
  "Backend trust relay readiness must stay scoped, read-only planning without relay rows, Spotlight reposts, proof, discovery, private record sharing, or credential/trust issuance."
);

assertContains(
  "backend",
  /def _community_domain_notification_scope_readiness_payload[\s\S]*?read-only[\s\S]*?notification scope[\s\S]*?does not send[\s\S]*?notifications[\s\S]*?create notification jobs[\s\S]*?emails[\s\S]*?SMS[\s\S]*?WhatsApp[\s\S]*?push notifications[\s\S]*?audience lists[\s\S]*?public announcements[\s\S]*?cross-domain[\s\S]*?broadcasts[\s\S]*?show member lists[\s\S]*?@router\.get\("\/\{community_domain_id\}\/notification-scope-readiness"[\s\S]*?def get_community_domain_notification_scope_readiness[\s\S]*?_require_domain_member_scope/,
  "Backend notification scope readiness must stay scoped, read-only, and non-delivering."
);

assertContains(
  "backend",
  /def _community_domain_trust_mobility_payload[\s\S]*?Community Domain trust mobility is read-only portability planning[\s\S]*?does not create TrustSlips[\s\S]*?write Trust Passport[\s\S]*?entries[\s\S]*?create credentials[\s\S]*?create trust relay paths[\s\S]*?release[\s\S]*?evidence[\s\S]*?show files[\s\S]*?show storage keys[\s\S]*?publish proof[\s\S]*?@router\.get\("\/\{community_domain_id\}\/trust-mobility"[\s\S]*?def get_community_domain_trust_mobility[\s\S]*?_require_domain_member_scope/,
  "Backend trust mobility must stay scoped, read-only portability planning without TrustSlip, Passport, credentials, relay, release, files, or proof."
);

assertContains(
  "backend",
  /def _community_domain_member_verification_map_payload[\s\S]*?Community Domain member verification map is read-only readiness[\s\S]*?planning[\s\S]*?does not perform KYC[\s\S]*?issue credentials[\s\S]*?verify government identity[\s\S]*?create or change[\s\S]*?members[\s\S]*?upload evidence[\s\S]*?show storage keys[\s\S]*?publish proof[\s\S]*?issue[\s\S]*?TrustSlips[\s\S]*?write Trust Passport entries[\s\S]*?@router\.get\("\/\{community_domain_id\}\/member-verification-map"[\s\S]*?def get_community_domain_member_verification_map[\s\S]*?_require_domain_member_scope/,
  "Backend member verification map must stay scoped readiness, not KYC, credentials, member changes, evidence upload, proof, TrustSlip, or Passport writes."
);

assertContains(
  "backend",
  /def _community_domain_record_privacy_map_payload[\s\S]*?Community Domain record privacy map is read-only privacy planning[\s\S]*?does not change permissions[\s\S]*?show member lists[\s\S]*?show node rosters[\s\S]*?show review details[\s\S]*?show evidence files[\s\S]*?show storage keys[\s\S]*?publish proof[\s\S]*?issue TrustSlips[\s\S]*?write Trust[\s\S]*?Passport records[\s\S]*?@router\.get\("\/\{community_domain_id\}\/record-privacy-map"[\s\S]*?def get_community_domain_record_privacy_map[\s\S]*?_require_domain_member_scope/,
  "Backend record privacy map must stay scoped privacy planning, not permissions changes, member lists, evidence files, proof, TrustSlips, or Passport records."
);

assertContains(
  "backendTests",
  /test_evidence_map_projects_safe_evidence_readiness_without_private_records[\s\S]*?\/evidence-map[\s\S]*?branch-register\.pdf" not in str\(evidence_map\)[\s\S]*?after_counts == before_counts/,
  "Backend tests must prove evidence map is no-write readiness and does not expose private evidence filenames."
);

assertContains(
  "backendTests",
  /test_evidence_record_readiness_projects_future_records_without_writes[\s\S]*?\/evidence-record-readiness[\s\S]*?CommunityDomainEvidenceRecord[\s\S]*?private\/evidence\/domain-registration\.pdf" not in str\(readiness\)[\s\S]*?after_counts == before_counts/,
  "Backend tests must prove evidence-record readiness does not write durable records or expose private evidence filenames."
);

assertContains(
  "backendTests",
  /test_evidence_release_readiness_projects_public_safe_release_without_writes[\s\S]*?\/evidence-release-readiness[\s\S]*?public_proofs_published[\s\S]*?private\/evidence\/public-safe-line-summary\.pdf" not in str\(readiness\)[\s\S]*?after_counts == before_counts/,
  "Backend tests must prove evidence-release readiness does not publish proof or expose private evidence filenames."
);

assertContains(
  "backendTests",
  /test_trust_relay_readiness_projects_relay_path_without_writes[\s\S]*?\/trust-relay-readiness[\s\S]*?relay_paths_created[\s\S]*?private\/evidence\/trust-relay-bridge\.pdf" not in str\(readiness\)[\s\S]*?after_counts == before_counts/,
  "Backend tests must prove trust-relay readiness does not create relay records or expose private evidence filenames."
);

assertContains(
  "backendTests",
  /test_member_can_read_evidence_release_readiness_but_admin_counts_are_hidden[\s\S]*?\/evidence-release-readiness[\s\S]*?outsider_readiness\.status_code == 403[\s\S]*?"release_policy_count"\] is None/,
  "Backend tests must prove Community Domain readiness outsiders are rejected and member views hide admin-only release counts."
);

assertContains(
  "backendTests",
  /test_member_can_read_member_verification_map_but_admin_counts_are_hidden[\s\S]*?\/member-verification-map[\s\S]*?outsider_map\.status_code == 403[\s\S]*?"members_with_gsn_id"[\s\S]*?is None/,
  "Backend tests must prove member verification readiness rejects outsiders and hides admin-only member counts."
);

assertContains(
  "package",
  /"audit:community-domain-evidence-readiness-boundary": "node tools\/audit-community-domain-evidence-readiness-boundary\.mjs"/,
  "Community Domain evidence readiness boundary audit must stay registered in package scripts."
);

assertNotContains(
  "trustEvidencePanels",
  /(issue|issued|publish|published|release|released|verify|verified).*(credential|proof|TrustSlip|Trust Passport).*(here|from this view)/i,
  "Community Domain readiness panels must not claim the UI issues credentials/proof/TrustSlips/Trust Passport entries from the readiness view."
);

if (findings.length > 0) {
  console.error("Community Domain evidence/readiness boundary audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "Community Domain evidence/readiness boundary audit passed: readiness, configuration, relay, release, verification, and privacy maps stay scoped setup/readiness, not issued public proof, credentials, TrustSlips, Trust Passport records, permission changes, money movement, or private evidence exposure."
);
