/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");
const findings = [];

function source(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function requirePattern(relativePath, pattern, message) {
  if (!pattern.test(source(relativePath))) {
    findings.push(relativePath + ": " + message);
  }
}

requirePattern(
  "gmfn_backend/app/db/models.py",
  /class Clan\b[\s\S]*?admission_mode[\s\S]*?voting_admin_override[\s\S]*?class ClanInvite\b[\s\S]*?admission_mode[\s\S]*?voting_admin_override/,
  "Community policy and invite snapshot fields must remain persisted."
);
requirePattern(
  "gmfn_backend/alembic/versions/20261015_add_membership_admission_policy.py",
  /revision[^=]*= "20261015_membership_admission"[\s\S]*?down_revision[^=]*= "20261012_spotlight_pacing_state"[\s\S]*?admission_mode[\s\S]*?voting_admin_override/,
  "The production migration must remain in the current Alembic chain."
);
requirePattern(
  "gmfn_backend/app/api/routes/clans.py",
  /ADMISSION_MODE_INSTANT = "instant_invite"[\s\S]*?ADMISSION_MODE_ADMIN = "admin_approval"[\s\S]*?ADMISSION_MODE_VOTE = "community_vote"[\s\S]*?\/\{clan_id\}\/admission-policy[\s\S]*?instant_invite_accepted[\s\S]*?\/\{clan_id\}\/join-requests\/\{join_request_id\}\/admin-approve/,
  "Backend modes, policy route, instant acceptance, and admin decision route must remain connected."
);
requirePattern(
  "gmfn_backend/app/api/routes/clans.py",
  /Admission confirms community membership only\. It does not create[\s\S]*?verification[\s\S]*?trust/i,
  "Membership admission must remain separate from verification, financial approval, and trust."
);
requirePattern(
  "gmfn_backend/app/api/routes/clans.py",
  /if admission_policy\["instant_join"\][\s\S]*?else None[\s\S]*?admission_mode=admission_policy\["admission_mode"\][\s\S]*?voting_admin_override=admission_policy\["voting_admin_override"\]/,
  "Instant links must remain single-use and every new link must snapshot its policy."
);
requirePattern(
  "frontend/src/lib/api.ts",
  /export type CommunityAdmissionMode[\s\S]*?"instant_invite"[\s\S]*?"admin_approval"[\s\S]*?"community_vote"[\s\S]*?updateCommunityAdmissionPolicy[\s\S]*?adminApproveJoinRequest/,
  "Frontend API helpers must expose all three modes and the admin decision."
);
requirePattern(
  "frontend/src/pages/CommunityJoinRequestsPage.tsx",
  /How people join[\s\S]*?Instant join[\s\S]*?Admin approval[\s\S]*?Community vote[\s\S]*?admissionMode === "community_vote"[\s\S]*?Allow an admin to approve without waiting for all votes/,
  "The settings surface must keep one clear three-mode choice and show override only for voting."
);
requirePattern(
  "frontend/src/pages/JoinEntryPage.tsx",
  /const isInstantJoin = inviteAdmissionMode === "instant_invite";[\s\S]*?const joinActionLabel = isInstantJoin \? "Accept invite" : "Request access";[\s\S]*?confirms membership[\s\S]*?identity[\s\S]*?trust/i,
  "Invite entry must use the mode-aware action and preserve the membership/trust boundary."
);
requirePattern(
  "frontend/src/pages/ActivateMembershipPage.tsx",
  /You’re in\. Opening your community[\s\S]*?routeTarget\("communityHome"/,
  "Activation must sign the member in and open the joined Community Home."
);

if (findings.length) {
  console.error("Membership admission policy audit failed:");
  findings.forEach((finding) => console.error("- " + finding));
  process.exit(1);
}

console.log(
  "Membership admission policy audit passed: three saved modes, invite snapshots, instant membership, explicit vote override, truth boundary, and Community Home activation remain connected."
);
