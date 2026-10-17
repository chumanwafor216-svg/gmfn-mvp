/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const pageFile = "src/pages/DemandBoxPage.tsx";
const apiFile = "src/lib/api.ts";
const source = readFileSync(join(frontendRoot, pageFile), "utf8");
const apiSource = readFileSync(join(frontendRoot, apiFile), "utf8");
const failures = [];

function requirePattern(input, file, pattern, message) {
  if (!pattern.test(input)) failures.push(file + ": " + message);
}

function forbidPattern(input, file, pattern, message) {
  if (pattern.test(input)) failures.push(file + ": " + message);
}

[
  [/data-gsn-demand-front-door="simple"[\s\S]*?What do you need\?/, "the first surface must ask one short question"],
  [/debugId="demand-box\.create"[\s\S]*?Post a need/, "the first surface must keep one clear Post a need action"],
  [/debugId="demand-box\.ask-community"[\s\S]*?Ask a question/, "the first surface must keep Ask Community under the plain Ask a question label"],
  [/data-gsn-demand-facts="compact"[\s\S]*?Yours \{myOpenRows\.length\}[\s\S]*?For you \{visibleRows\.length\}[\s\S]*?\{currentCommunityName\}/, "the first surface must keep only the two useful counts and community context"],
  [/!showCreateWorkSurface && selectedClanId && canManageRelayPolicy/, "community search policy controls must stay hidden from ordinary members"],
  [/<span>Community search settings<\/span>/, "admin relay controls need a plain collapsed label"],
  [/data-gsn-demand-create-form="simple"/, "the create form must expose the simple-form contract"],
  [/htmlFor="demand-box-title"[\s\S]*?What do you need\?/, "the main form must keep a labelled need field"],
  [/htmlFor="demand-box-type"[\s\S]*?>Type</, "the main form must keep the matching type field"],
  [/htmlFor="demand-box-area"[\s\S]*?>Area</, "the main form must keep area on the first surface"],
  [/data-gsn-demand-privacy-route="true"[\s\S]*?demand-box\.visibility\.community[\s\S]*?Community[\s\S]*?demand-box\.visibility\.protected-target[\s\S]*?One person/, "the main form must keep an explicit community or one-person choice"],
  [/visibilityScope === DEMAND_VISIBILITY_PROTECTED[\s\S]*?htmlFor="demand-box-person"[\s\S]*?Choose person[\s\S]*?demand-box-gsn-member-handles/, "the person chooser must appear only for the private route"],
  [/debugId="demand-box\.more-options"[\s\S]*?Short explanation[\s\S]*?WhatsApp number[\s\S]*?Urgency[\s\S]*?Payment[\s\S]*?Proof needed[\s\S]*?Hours open[\s\S]*?Trust credit may be discussed[\s\S]*?Search one more community if needed/, "all optional create controls must remain reachable behind one disclosure"],
  [/debugId="demand-box\.post"[\s\S]*?Post need/, "the post action must remain stable and plain"],
  [/visibilityScope === DEMAND_VISIBILITY_PROTECTED && !selectedTagMember[\s\S]*?Choose a matched GSN handle/, "private posting must still require a matched community member"],
  [/visibility_scope: visibilityScope/, "the selected privacy scope must still reach the API payload"],
  [/buildDemandDescription\(description, responseEvidence, targetHandle\)/, "optional explanation, proof, and member tag must still reach the request"],
  [/allow_one_hop_relay:[\s\S]*?visibilityScope === DEMAND_VISIBILITY_COMMUNITY && allowOneHopRelay/, "one-hop search consent must stay community-only"],
  [/data-gsn-demand-queue="simple"[\s\S]*?data-gsn-demand-queue-lanes="true"/, "the simple queue and its primary filters must render"],
  [/filter\(\(lane\) => \["open", "for_me", "mine"\]\.includes\(lane\.key\)\)/, "only All, For you, and Yours may remain exposed"],
  [/data-gsn-demand-more-filters="true"[\s\S]*?More filters[\s\S]*?\["tagged", "ask_community", "urgent", "categories"\]/, "Tagged, Questions, Urgent, and Need types must remain behind More filters"],
  [/type DemandQueueLane = "open" \| "tagged" \| "for_me" \| "mine" \| "ask_community" \| "urgent" \| "categories"/, "all seven queue contracts must remain supported"],
  [/return \["open", "queue", "all", "tagged", "for_me", "community", "mine", "ask_community", "ask-community", "urgent", "categories"\]\.includes\(queueMode\)/, "direct queue links must remain supported"],
  [/data-gsn-demand-record=\{recordOpen \? "open" : "closed"\}/, "request cards must expose their compact open state"],
  [/openDemandRecordKey === rowKey[\s\S]*?setOpenDemandRecordKey\(recordOpen \? "" : rowKey\)/, "phone cards must use a single shared open key"],
  [/recordOpen \? "Close" : "Open"/, "closed cards must offer one plain Open action"],
  [/directDemandId[\s\S]*?setOpenDemandRecordKey\(String\(directDemandId\)\)/, "direct demand links must open the requested card"],
  [/debugId=\{[^\n]*fulfilled[^\n]*\}[\s\S]*?debugId=\{[^\n]*cancelled[^\n]*\}/, "owner fulfil and cancel controls must remain available inside open cards"],
  [/demandPaperAction\(row, scope, copyDebugId\)[\s\S]*?demandContactActions\(row/, "copy and contact actions must remain inside open cards"],
  [/getDemandSupplyMatches/, "possible supply matching must remain server-driven"],
  [/data-gsn-demand-supply-intelligence="true"[\s\S]*?Open supply/, "possible supply results must remain reachable"],
  [/data-gsn-demand-load-older="true"[\s\S]*?demand-box\.queue\.load-older/, "large queues must keep paged loading"],
  [/const DEMAND_BOX_PAGE_SIZE = 200/, "the backend-safe page size must remain explicit"],
  [/pulseDestination="demand_box"/, "Ask a question must still post into DemandBox"],
].forEach(([pattern, message]) => requirePattern(source, pageFile, pattern, message));

[
  [/queue_keys\?: string\[\] \| null/, "request types must keep saved queue keys"],
  [/mentioned_handles\?: string\[\] \| null/, "request types must keep member handles"],
  [/visibility_scope\?: string \| null/, "request types must keep privacy scope"],
  [/offset\?: number/, "request listing must keep offset paging"],
].forEach(([pattern, message]) => requirePattern(apiSource, apiFile, pattern, message));

[
  [/Current state/, "the repeated Current state card must not return"],
  [/Create demand/, "the old technical create label must not return"],
  [/Ask Community<\/|Ask Community", 20/, "the first surface must not restore the old Ask Community button label"],
  [/demand-box\.hero-dashboard|demand-box\.bottom-dashboard|demand-box\.bottom-return/, "duplicate route buttons must not return"],
  [/demand-box\.open-notifications/, "Notifications must not compete with posting"],
  [/data-gsn-demand-routing-readiness="true"/, "technical routing readiness copy must stay off the member surface"],
  [/minHeight: 82,\s*alignItems: "flex-start"/, "the seven tall queue tiles must not return"],
  [/Possible matches[^\n]*\b(recommended|trusted|approved|best|guaranteed)\b/i, "possible matches must not imply endorsement"],
  [/<button|<summary|<a\s/, "DemandBox must keep shared stable action primitives"],
].forEach(([pattern, message]) => forbidPattern(source, pageFile, pattern, message));

if (failures.length) {
  console.error("DemandBox front package audit failed:");
  failures.forEach((failure) => console.error("- " + failure));
  process.exit(1);
}

console.log("DemandBox simple front package audit passed.");
