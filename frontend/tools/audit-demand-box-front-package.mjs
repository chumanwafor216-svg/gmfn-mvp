/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const pageFile = "src/pages/DemandBoxPage.tsx";
const apiFile = "src/lib/api.ts";
const source = readFileSync(join(frontendRoot, pageFile), "utf8");
const apiSource = readFileSync(join(frontendRoot, apiFile), "utf8");
const findings = [];

function lineAt(index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function addFinding(index, message, text = "Expected pattern was not found.") {
  findings.push({
    file: pageFile,
    line: index >= 0 ? lineAt(index) : 1,
    message,
    text: text.replace(/\s+/g, " ").slice(0, 260),
  });
}

function requirePattern(pattern, message) {
  const index = source.search(pattern);
  if (index === -1) {
    addFinding(-1, message, pattern.toString());
  }
}

function requireApiPattern(pattern, message) {
  if (apiSource.search(pattern) === -1) {
    findings.push({
      file: apiFile,
      line: 1,
      message,
      text: pattern.toString().replace(/\s+/g, " ").slice(0, 260),
    });
  }
}

[
  [
    /function demandHeroActionRowStyle\(isCompact: boolean\)/,
    "DemandBox hero actions must use the compact two-row phone grid.",
  ],
  [
    /function demandHeroPrimaryActionStyle\(isCompact: boolean\)/,
    "DemandBox primary hero action must be able to span the phone row.",
  ],
  [
    /Ask clearly from \{currentCommunityName\}\./,
    "DemandBox hero copy must stay community-specific and short.",
  ],
  [
    /Post one real need, keep the community context attached, and close\s+it when it is answered\./,
    "DemandBox hero helper must stay compact and practical.",
  ],
  [
    /Current state/,
    "DemandBox must expose a compact current-state card.",
  ],
  [
    /Mine: \{myOpenRows\.length\}/,
    "DemandBox current-state card must show the user's open demand count.",
  ],
  [
    /All open: \{allOpenRows\.length\}/,
    "DemandBox current-state card must show the full open demand count.",
  ],
  [
    /Next: post or review/,
    "DemandBox current-state card must show a simple next step.",
  ],
  [
    /Create only one clear request at a time\. Mark it fulfilled or\s+cancel it when the need is resolved\./,
    "DemandBox must keep one active request guidance visible.",
  ],
  [
    /debugId="demand-box\.change-community\.summary"/,
    "DemandBox community switching must stay collapsed behind a stable disclosure.",
  ],
  [
    /<span>Change community<\/span>/,
    "DemandBox community chooser summary must keep the short label.",
  ],
  [
    /<span style=\{badge\(false\)\}>Evidence optional<\/span>/,
    "DemandBox form context must use compact evidence chips.",
  ],
  [
    /<span style=\{badge\(false\)\}>Payment terms optional<\/span>/,
    "DemandBox form context must use compact payment chips.",
  ],
  [
    /minHeight: 82/,
    "DemandBox explanation textarea must stay compact on phone.",
  ],
  [
    /disabled=\{creating\}/,
    "DemandBox post button must allow an in-place missing-title response instead of silently disabling.",
  ],
  [
    /debugId="demand-box\.post"/,
    "DemandBox post action must keep its stable debug id.",
  ],
  [
    /debugId="demand-box\.create"/,
    "DemandBox create action must keep its stable debug id.",
  ],
  [
    /debugId="demand-box\.return"/,
    "DemandBox return action must keep its stable debug id.",
  ],
  [
    /type DemandQueueLane = "open" \| "tagged" \| "for_me" \| "mine" \| "ask_community" \| "urgent" \| "categories"/,
    "DemandBox must define a full open queue plus governed lanes instead of a flat hidden drawer model.",
  ],
  [
    /const \[activeQueueLane, setActiveQueueLane\] = useState<DemandQueueLane>\("open"\)/,
    "DemandBox must default to the full open queue so dashboard counts match visible rows.",
  ],
  [
    /return \["open", "queue", "all", "tagged", "for_me", "community", "mine", "ask_community", "ask-community", "urgent", "categories"\]\.includes\(queueMode\)/,
    "DemandBox must recognize Dashboard queue links and direct lane links.",
  ],
  [
    /uniqueDemandRows\(\[\.\.\.visibleRows, \.\.\.myOpenRows\]\)/,
    "DemandBox queue board must deduplicate visible and personal open rows.",
  ],
  [
    /const urgentRows = useMemo\(\(\) => allOpenRows\.filter\(isUrgentDemand\), \[allOpenRows\]\)/,
    "DemandBox must expose an urgent lane derived from recorded urgency/expiry.",
  ],
  [
    /function isAskCommunityDemand\(row: DemandRow\): boolean[\s\S]*?community ask posted through demandbox/,
    "DemandBox must detect Ask Community rows from existing category/description truth.",
  ],
  [
    /const askCommunityRows = useMemo\([\s\S]*?allOpenRows\.filter\(isAskCommunityDemand\)/,
    "DemandBox must expose Ask Community as a separate visible lane.",
  ],
  [
    /const taggedRows = useMemo\([\s\S]*?allOpenRows\.filter\(isTaggedForMe\)/,
    "DemandBox must derive a separate tagged lane from resolved GSN handle metadata.",
  ],
  [
    /key: "tagged"[\s\S]*?label: "Tagged"/,
    "DemandBox must show tagged demand separately from the general open queue.",
  ],
  [
    /key: "open"[\s\S]*?label: "All open"[\s\S]*?count: allOpenRows\.length/,
    "DemandBox must expose an All open lane whose count matches every loaded open row.",
  ],
  [
    /const normalizedQueueMode = queueMode === "ask-community" \|\| queueMode === "community" \|\| queueMode === "queue" \|\| queueMode === "all" \? "open" : queueMode/,
    "DemandBox dashboard queue links must land on the full open queue, not a filtered lane.",
  ],
  [
    /if \(shouldOpenDemandQueues\) \{\s*setActiveQueueLane\("open"\);\s*\}/,
    "DemandBox fallback queue links must keep all open requests visible.",
  ],
  [
    /function queueKeysOf\(row: DemandRow\): string\[\][\s\S]*?queue_keys/,
    "DemandBox must consume saved queue keys for large-community sorting.",
  ],
  [
    /queueKeysOf\(row\)\.includes\("urgent"\)/,
    "DemandBox urgent lane must respect saved queue keys before local fallbacks.",
  ],
  [
    /queueKeys\.includes\("ask_community"\)/,
    "DemandBox Ask Community lane must respect saved queue keys before local fallbacks.",
  ],
  [
    /mentioned_handles\?: string\[\] \| null/,
    "DemandBox must expose typed handle metadata and keep delivery truth visible.",
  ],
  [
    /routing_status\?: string \| null/,
    "DemandBox must expose routing status metadata for queue clarity.",
  ],
  [
    /const categoryBuckets = useMemo\(\(\) => \{[\s\S]*?categoryLabel\(row\)[\s\S]*?urgentCount: rows\.filter\(isUrgentDemand\)\.length/,
    "DemandBox must group open rows by recorded demand category.",
  ],
  [
    /const queueLaneRows = useMemo<Record<DemandQueueLane, DemandRow\[\]>>[\s\S]*?open: allOpenRows,[\s\S]*?tagged: taggedRows/,
    "DemandBox must map every lane to a visible result set including All open and Tagged.",
  ],
  [
    /setActiveQueueLane\(lane\.key\)/,
    "DemandBox lane buttons must switch the visible queue without hiding rows in a drawer.",
  ],
  [
    /data-gsn-demand-queue-lanes="true"/,
    "DemandBox must render the governed queue lane controls.",
  ],
  [
    /debugId=\{`demand-box\.queue-lane\.\$\{lane\.key\}`\}/,
    "DemandBox queue lane buttons must keep stable dynamic debug ids.",
  ],
  [
    /data-gsn-demand-queue-results="true"/,
    "DemandBox must render visible results for the selected lane.",
  ],
  [
    /Need type tag[\s\S]*?value=\{category\}[\s\S]*?Food, vacancy, repair, transport/,
    "DemandBox must expose the category/tag field in the main create form.",
  ],
  [
    /function normalizeGsnMention\(value: string\): string[\s\S]*?Tagged GSN handle:/,
    "DemandBox must normalize typed GSN handles into request text for backend tag resolution.",
  ],
  [
    /const \[targetHandle, setTargetHandle\] = useState\(""\)/,
    "DemandBox must keep an explicit member-handle field instead of expecting users to type hidden syntax.",
  ],
  [
    /buildDemandDescription\(description, responseEvidence, targetHandle\)/,
    "DemandBox normal request posting must include the optional tagged GSN handle.",
  ],
  [
    /buildAskCommunityDemandDescription\(body, targetHandle, options\)/,
    "DemandBox Ask Community posting must include the optional tagged GSN handle.",
  ],
  [
    /Contact by GSN handle[\s\S]*?value=\{targetHandle\}[\s\S]*?placeholder="@GSN-U-RESPONDER"[\s\S]*?demand-box-gsn-member-handles[\s\S]*?Do not use a phone number/,
    "DemandBox must expose a clear phone-free GSN handle contact control in the create flow.",
  ],
  [
    /listClanMembers\(effectiveClanId\)\.catch\(\(\) => \(\{ items: \[\] \}\)\)/,
    "DemandBox must use the existing scoped community roster for tag suggestions when available.",
  ],
  [
    /const tagHandleOptions = useMemo\(\(\) => \{[\s\S]*?\.slice\(0, 40\);/,
    "DemandBox tag suggestions must stay bounded and deduplicated for large communities.",
  ],
  [
    /<datalist id="demand-box-gsn-member-handles">[\s\S]*?tagHandleOptions\.map/,
    "DemandBox must provide GSN-ID suggestions without exposing a large chat-style roster block.",
  ],
  [
    /const normalizedTargetHandle = useMemo[\s\S]*?const selectedTagMember = useMemo/,
    "DemandBox must compute visible tag matching from the same bounded community roster suggestions.",
  ],
  [
    /data-gsn-demand-tag-preview="true"[\s\S]*?Matched community member[\s\S]*?will stay in the request text unless it matches an active member's GSN handle or ID/,
    "DemandBox must preview whether a typed GSN tag is a real in-community member before posting.",
  ],
  [
    /data-gsn-demand-matched-tag-chip="true"[\s\S]*?Matched tags: \{matchedTagCount\}[\s\S]*?No matched member yet/,
    "DemandBox request cards must distinguish matched member tags from text-only handles.",
  ],
  [
    /label: "Ask Community"[\s\S]*?key: "ask_community"|key: "ask_community"[\s\S]*?label: "Ask Community"/,
    "DemandBox must show Ask Community as its own queue lane instead of repeating the Community lane.",
  ],
  [
    /data-gsn-demand-routing-readiness="true"[\s\S]*?Load older requests extends the visible queue in batches[\s\S]*?ranked queues, moderation rules, rate limits, and saved assignments still need governed records work before/,
    "DemandBox must keep the large-community routing boundary collapsed, batch-aware, and honest.",
  ],
  [
    /Need types, Urgent, or Tagged to narrow the queue, or load older community requests if more are available\./,
    "DemandBox overflow guidance must point to lane narrowing or older-batch loading.",
  ],
  [
    /data-gsn-demand-category-buckets="true"/,
    "DemandBox must render a category bucket view for tag-like sorting.",
  ],
  [
    /function renderDemandRecord\(/,
    "DemandBox must use one shared demand record renderer instead of duplicate old blocks.",
  ],
  [
    /debugId=\{`\$\{debugBase\}\.fulfilled`\}/,
    "DemandBox fulfilled actions must keep stable dynamic debug ids through the shared renderer.",
  ],
  [
    /debugId=\{`\$\{debugBase\}\.cancelled`\}/,
    "DemandBox cancel actions must keep stable dynamic debug ids through the shared renderer.",
  ],
  [
    /Tagged: \{taggedRows\.length\}/,
    "DemandBox must surface matched GSN handle routing without hiding it in text.",
  ],
  [
    /Not a chat feed/,
    "DemandBox must state the anti-WhatsApp queue boundary.",
  ],
  [
    /data-gsn-demand-load-older="true"[\s\S]*?debugId="demand-box\.queue\.load-older"[\s\S]*?Load older requests/,
    "DemandBox must expose a load-older control for paged community demand queues.",
  ],
  [
    /const DEMAND_BOX_PAGE_SIZE = 200/,
    "DemandBox must keep the backend-safe page size explicit.",
  ],
  [
    /offset: visibleRowsRawLoaded[\s\S]*?nextOffset = visibleRowsRawLoaded \+ nextRawRows\.length[\s\S]*?limit: 1,[\s\S]*?offset: nextOffset/,
    "DemandBox must request older rows with backend offset and probe the following batch before showing more.",
  ],
  [
    /limit: 1,[\s\S]*?offset: DEMAND_BOX_PAGE_SIZE[\s\S]*?visibleProbeRows[\s\S]*?setHasMoreVisibleRows\(visibleProbeRows\.length > 0\)/,
    "DemandBox must prove older rows exist with a one-row probe after the initial batch.",
  ],
  [
    /askCommunity: appendRouteQueryParam[\s\S]*?routeTarget\("demandBox", selectedClanId, "demand-box\.ask-community"\)[\s\S]*?"mode"[\s\S]*?"ask_community"/,
    "DemandBox Ask Community must route into DemandBox question mode, not a separate Marketplace posting path.",
  ],
  [
    /to=\{routes\.askCommunity\}[\s\S]*?debugId="demand-box\.ask-community"[\s\S]*?Ask Community/,
    "DemandBox hero must expose the Ask Community action without creating a separate demand engine.",
  ],
  [
    /debugId="demand-box\.mode\.normal-demand"[\s\S]*?Post demand[\s\S]*?debugId="demand-box\.ask-community\.inline"[\s\S]*?Ask Community/,
    "DemandBox form must show Ask Community as a Demand type beside normal demand posting.",
  ],
  [
    /submitMarketNeedPulse[\s\S]*?createMarketplaceRequest[\s\S]*?category: "Community Ask"[\s\S]*?Community question posted in DemandBox/,
    "DemandBox Ask Community must post into DemandBox requests, not the Community Bulletin notice engine.",
  ],
  [
    /pulseDestination="demand_box"/,
    "DemandBox Ask Community modal must use DemandBox destination wording and controls.",
  ],
  [
    /debugId="demand-box\.hero-dashboard"/,
    "DemandBox dashboard escape must keep its stable debug id.",
  ],
].forEach(([pattern, message]) => requirePattern(pattern, message));

[
  [
    /queue_keys\?: string\[\] \| null/,
    "API request type must include saved queue keys.",
  ],
  [
    /mentioned_handles\?: string\[\] \| null/,
    "API request type must include typed handle metadata.",
  ],
  [
    /routing_status\?: string \| null/,
    "API request type must include routing status metadata.",
  ],
  [
    /is_tagged_for_me\?: boolean \| null/,
    "API request type must include tagged-for-me metadata.",
  ],
  [
    /mentioned_member_count\?: number \| null/,
    "API request type must include matched-member count metadata.",
  ],
  [
    /offset\?: number/,
    "API request list helper must include the backend paging offset.",
  ],
].forEach(([pattern, message]) => requireApiPattern(pattern, message));

[
  [
    /createCommunityNotice[\s\S]*?notice_mode: "market_need_pulse"/,
    "DemandBox Ask Community must not post into Community Notice Board as a market-need pulse.",
  ],
  [
    /Ask clearly\. Let your trust speak before people answer\./,
    "DemandBox must not restore the old tall hero sentence.",
  ],
  [
    /How demand works/,
    "DemandBox must not restore the old explainer card heading.",
  ],
  [
    /disabled=\{creating \|\| !safeStr\(title\)\}/,
    "DemandBox post button must not hide validation feedback behind a disabled state.",
  ],
  [
    /institutionalStatTile/,
    "DemandBox must not restore the old exposed stat-tile stack.",
  ],
  [
    /visibleRows\.slice\(0, 6\)/,
    "DemandBox must not restore the six-card community demand preview.",
  ],
  [
    /const visiblePreview = useMemo\(\(\) => visibleRows\.slice\(0, 1\), \[visibleRows\]\)/,
    "DemandBox must not hide community demand behind the old one-visible-row preview.",
  ],
  [
    /const extraVisibleRows = useMemo\(\(\) => visibleRows\.slice\(1, 5\), \[visibleRows\]\)/,
    "DemandBox must not tuck additional community demand into the old bounded drawer preview.",
  ],
  [
    /const extraMyOpenRows = useMemo\(\(\) => myOpenRows\.slice\(1\), \[myOpenRows\]\)/,
    "DemandBox must not tuck additional personal demand behind the old drawer.",
  ],
  [
    /myOpenRows\.slice\(0, 1\)\.map/,
    "DemandBox must not show only the first live personal demand before a drawer.",
  ],
  [
    /visiblePreview\.map/,
    "DemandBox must not show only the first visible community demand before a drawer.",
  ],
  [
    /debugId="demand-box\.more-visible-demand\.summary"/,
    "DemandBox must not hide extra visible community demand behind the old More drawer.",
  ],
  [
    /debugId="demand-box\.more-my-demand\.summary"/,
    "DemandBox must not hide extra personal demand behind the old More drawer.",
  ],
  [
    /key: "community", label: "Community"/,
    "DemandBox must not restore a duplicate Community lane that repeats the For me queue.",
  ],
  [
    /<div style=\{sectionLabel\(\)\}>Category<\/div>[\s\S]*?placeholder="Optional category"/,
    "DemandBox must not hide the need-type tag inside More detail again.",
  ],
  [
    /cursor paging and direct handles are being built|full list controls are prepared|full list paging still need|Max loaded now: 200 per read/,
    "DemandBox must not expose raw implementation wording about unfinished cursor/direct-handle work.",
  ],
].forEach(([pattern, message]) => {
  const index = source.search(pattern);
  if (index !== -1) addFinding(index, message, source.slice(index, index + 180));
});

if (findings.length > 0) {
  console.error("DemandBox front package audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("DemandBox front package audit passed.");
