/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const pageFile = "src/pages/DemandBoxPage.tsx";
const apiFile = "src/lib/api.ts";
const protectedVoiceFile = "src/components/ProtectedVoiceNotePlayer.tsx";
const recorderFile = "src/components/VoiceNoteRecorder.tsx";
const responsePanelFile = "src/components/DemandResponsePanel.tsx";
const appLayoutFile = "src/layout/AppLayout.tsx";
const companionBridgeFile = "src/components/WorkspaceCompanionBridge.tsx";
const source = readFileSync(join(frontendRoot, pageFile), "utf8");
const apiSource = readFileSync(join(frontendRoot, apiFile), "utf8");
const protectedVoiceSource = readFileSync(
  join(frontendRoot, protectedVoiceFile),
  "utf8"
);
const recorderSource = readFileSync(join(frontendRoot, recorderFile), "utf8");
const responsePanelSource = readFileSync(join(frontendRoot, responsePanelFile), "utf8");
const appLayoutSource = readFileSync(join(frontendRoot, appLayoutFile), "utf8");
const companionBridgeSource = readFileSync(join(frontendRoot, companionBridgeFile), "utf8");
const failures = [];

function requirePattern(input, file, pattern, message) {
  if (!pattern.test(input)) failures.push(file + ": " + message);
}

function forbidPattern(input, file, pattern, message) {
  if (pattern.test(input)) failures.push(file + ": " + message);
}

[
  [/demand-box-opportunity-hero-v2\.webp/, "the first surface must use the approved opportunity-led human marketplace image"],
  [/data-gsn-demand-front-door="simple"[\s\S]*?Find what you need[\s\S]*?Ask, request or get help from people in/, "the first surface must explain DemandBox in plain human language"],
  [/debugId="demand-box\.create"[\s\S]*?Post a need/, "the first surface must keep one clear Post a need action"],
  [/const routeAskCommunityMode = \["ask_community", "ask-community", "market_need_pulse"\][\s\S]*?const isCreateMode = demandMode === "create" \|\| routeAskCommunityMode/, "legacy Ask Community modes must continue to enter the existing DemandBox create flow"],
  [/askCommunity: appendRouteQueryParam\([\s\S]*?"mode"[\s\S]*?"ask_community"/, "legacy Ask Community deep links must continue to resolve through the existing DemandBox route"],
  [/data-gsn-demand-facts="compact"[\s\S]*?Yours \{myOpenRows\.length\}[\s\S]*?For you \{visibleRows\.length\}/, "the first surface must keep the two useful counts"],
  [/debugId="demand-box\.community-selector"[\s\S]*?\{currentMarketplaceName\}/, "the compact front door must keep the selected marketplace identity above the human market image"],
  [/data-gsn-demand-human-hero="market"[\s\S]*?demandBoxOpportunityHero[\s\S]*?People helping people/, "the compact front door must keep the approved human marketplace image and GSN promise"],
  [/!showCreateWorkSurface && selectedClanId && canManageRelayPolicy/, "community search policy controls must stay hidden from ordinary members"],
  [/<span>Community search settings<\/span>/, "admin relay controls need a plain collapsed label"],
  [/data-gsn-demand-create-form="simple"/, "the create form must expose the simple-form contract"],
  [/data-gsn-demand-create-hero="text-first"[\s\S]*?What do you need\?[\s\S]*?Write it or record a voice note\./, "the create hero must keep the short written-or-voice posting path"],
  [/function demandCreateFieldLabel\(label: string\)[\s\S]*?data-gsn-demand-field-label="text-only"[\s\S]*?<span>\{label\}<\/span>/, "create-form field headings must use the shared text-only label"],
  [/htmlFor="demand-box-title"[\s\S]*?Write your need/, "the main form must keep a labelled written need field"],
  [/DEMAND_CATEGORY_CHOICES[\s\S]*?Transport[\s\S]*?Repairs[\s\S]*?Food[\s\S]*?Books[\s\S]*?Housing[\s\S]*?Other[\s\S]*?data-gsn-demand-category-selector="true"/, "the main form must keep all governed need types in one compact selector"],
  [/<VoiceNoteRecorder[\s\S]*?maxSeconds=\{60\}/, "the main form must keep the bounded 60-second voice recorder"],
  [/debugPrefix="demand-box\.request\.voice"[\s\S]*?compact=\{isCompact\}[\s\S]*?heroWaveform=\{isCompact\}/, "the compact Demand Box composer must make the voice waveform its central recording visual"],
  [/htmlFor="demand-box-area"[\s\S]*?demandCreateFieldLabel\("Area"\)/, "the main form must keep area on the first surface"],
  [/data-gsn-demand-privacy-route="true"[\s\S]*?demand-box\.visibility\.community[\s\S]*?Community[\s\S]*?demand-box\.visibility\.protected-target[\s\S]*?One person/, "the main form must keep an explicit community or one-person choice"],
  [/visibilityScope === DEMAND_VISIBILITY_PROTECTED[\s\S]*?htmlFor="demand-box-person"[\s\S]*?Choose person[\s\S]*?demand-box-gsn-member-handles/, "the person chooser must appear only for the private route"],
  [/debugId="demand-box\.more-options"[\s\S]*?WhatsApp number[\s\S]*?Urgency[\s\S]*?Payment[\s\S]*?Proof needed[\s\S]*?Hours open[\s\S]*?Trust credit may be discussed[\s\S]*?Search one more community if needed/, "secondary create controls must remain reachable behind one disclosure"],
  [/onRecordingChange=\{setVoiceRecording\}/, "the request form must receive the recorder's active state"],
  [/if \(voiceRecording\)[\s\S]*?Tap Stop and wait for Voice note ready before posting/, "request submission must reject an unfinished recording"],
  [/disabled=\{creating \|\| voiceRecording\}[\s\S]*?debugId="demand-box\.post"[\s\S]*?Stop recording first[\s\S]*?Post need/, "the post action must stay locked until recorded audio is ready"],
  [/visibilityScope === DEMAND_VISIBILITY_PROTECTED && !selectedTagMember[\s\S]*?Choose a matched GSN handle/, "private posting must still require a matched community member"],
  [/visibility_scope: visibilityScope/, "the selected privacy scope must still reach the API payload"],
  [/buildDemandDescription\(description, responseEvidence, targetHandle\)/, "optional explanation, proof, and member tag must still reach the request"],
  [/allow_one_hop_relay:[\s\S]*?visibilityScope === DEMAND_VISIBILITY_COMMUNITY && allowOneHopRelay/, "one-hop search consent must stay community-only"],
  [/data-gsn-demand-queue="simple"[\s\S]*?data-gsn-demand-queue-lanes="true"/, "the simple queue and its primary filters must render"],
  [/filter\(\(lane\) => \["open", "for_me", "mine"\]\.includes\(lane\.key\)\)/, "only All, For you, and Yours may remain exposed"],
  [/const active = activeQueueLane === lane\.key;[\s\S]*?aria-pressed=\{active\}/, "queue selectors must expose their selected state accessibly"],
  [/data-gsn-demand-more-filters="true"[\s\S]*?More filters[\s\S]*?\["tagged", "ask_community", "urgent", "categories"\]/, "Tagged, Questions, Urgent, and Need types must remain behind More filters"],
  [/type DemandQueueLane = "open" \| "tagged" \| "for_me" \| "mine" \| "ask_community" \| "urgent" \| "categories"/, "all seven queue contracts must remain supported"],
  [/return \["open", "queue", "all", "tagged", "for_me", "community", "mine", "ask_community", "ask-community", "urgent", "categories"\]\.includes\(explicitQueueMode\)/, "direct queue links must remain supported"],
  [/data-gsn-demand-record=\{recordOpen \? "open" : "closed"\}/, "request cards must expose their compact open state"],
  [/openDemandRecordKey === rowKey[\s\S]*?setOpenDemandRecordKey\(recordOpen \? "" : rowKey\)/, "phone cards must use a single shared open key"],
  [/data-gsn-demand-request-preview=\{!recordOpen && isCompact \? "message-first" : undefined\}[\s\S]*?data-gsn-demand-preview-style=\{!recordOpen && isCompact \? "neon-paper" : undefined\}[\s\S]*?WebkitLineClamp: isCompact \? 3[\s\S]*?>\s*View request →\s*</, "closed phone cards must lead with the request message and the approved full-width View request action"],
  [/debugId=\{debugBase \+ "\.request-details"\}[\s\S]*?Details[\s\S]*?Privacy/, "technical request metadata must remain behind a plain disclosure"],
  [/data-gsn-demand-request-hero="request"[\s\S]*?data-gsn-demand-request-icon="compact"[\s\S]*?demandCategoryChoice\(row\?\.category\)\.icon/, "opened phone requests must keep the bounded subject pictogram compact so the request remains dominant"],
  [/requester_profile_image_url[\s\S]*?data-gsn-demand-sender-identity="true"/, "request cards must keep the optional portrait-or-initials identity row"],
  [/data-gsn-demand-primary-message="true"[\s\S]*?firstTruthy\(row\?\.description, "No details yet."\)/, "opened requests must show the complete request message without another disclosure"],
  [/data-gsn-demand-respond-in-place="true"[\s\S]*?<ProtectedVoiceNotePlayer[\s\S]*?audio_attachment_id[\s\S]*?<DemandResponsePanel[\s\S]*?requestId=\{rowId\}/, "opened requests must place protected voice and the private response surface together"],
  [/data-gsn-demand-past-requests="true"[\s\S]*?Past requests[\s\S]*?<DemandHistoryCard/, "closed requests must remain reachable in collapsed history"],
  [/const \[showSenderPhoto, setShowSenderPhoto\] = useState\(true\)/, "request portraits must begin included when a saved profile photo exists"],
  [/data-gsn-demand-photo-consent="true"[\s\S]*?Include my current profile photo[\s\S]*?Turn this off before posting/, "request portraits must remain visibly disableable before posting"],
  [/data-gsn-demand-detail-tabs="compact"[\s\S]*?\.request-details[\s\S]*?\.privacy-terms[\s\S]*?data-gsn-demand-detail-panel="request"[\s\S]*?data-gsn-demand-detail-panel="privacy"/, "phone metadata must stay behind the compact Request details and Privacy & terms tabs"],
  [/data-gsn-demand-expand-search="true"[\s\S]*?Search one more community[\s\S]*?Stop expanded search[\s\S]*?One community only/, "the phone one-hop card must keep the approved compact search actions and boundary"],
  [/data-gsn-demand-action-dock=\{isCompact \? "compact" : "standard"\}[\s\S]*?demandDockStyle\(canClose \? 3 : 1\)[\s\S]*?fulfilled[\s\S]*?cancelled[\s\S]*?demandPaperAction\(row, scope, copyDebugId\)/, "opened owner requests must keep the calm three-action lifecycle dock"],
  [/data-gsn-demand-contact-actions="private"[\s\S]*?demandContactActions\(row, debugBase \+ "\.contact", true\)/, "WhatsApp contact actions must remain reachable under privacy and terms"],
  [/showMoreQueueRows \? 12 : 1[\s\S]*?debugId="demand-box\.queue\.view-more"[\s\S]*?View more needs/, "phone queues must start with one request and provide a deliberate view-more action"],
  [/directDemandId[\s\S]*?setActiveQueueLane\([\s\S]*?myOpenRows[\s\S]*?"mine"[\s\S]*?visibleRows[\s\S]*?"for_me"[\s\S]*?setOpenDemandRecordKey\(String\(directDemandId\)\)/, "direct demand links must select the correct lane and open the requested card"],
  [/demandQueueIntentAppliedRef[\s\S]*?visibleRows\.length > 0[\s\S]*?setActiveQueueLane\("for_me"\)/, "ordinary entry must prefer answerable For you work when available"],
  [/debugId=\{[^\n]*fulfilled[^\n]*\}[\s\S]*?debugId=\{[^\n]*cancelled[^\n]*\}/, "owner fulfil and cancel controls must remain available inside open cards"],
  [/demandPaperAction\(row, scope, copyDebugId\)[\s\S]*?demandContactActions\(row/, "copy and contact actions must remain inside open cards"],
  [/getDemandSupplyMatches/, "possible supply matching must remain server-driven"],
  [/getDemandSupplySellerContact[\s\S]*?buildWhatsAppChatUrl[\s\S]*?prepared_message/, "Ask seller must use the authenticated server-validated contact handoff"],
  [/isMineRow\(row, me\)[\s\S]*?data-gsn-demand-ask-seller="validated"/, "direct seller contact must remain requester-only in the interface"],
  [/data-gsn-demand-seller-contact-result[\s\S]*?Back to request[\s\S]*?View Shop/, "seller contact must preserve a direct return and optional Shop route"],
  [/reliableDemandMatches[\s\S]*?RELEVANCE_RELIABLE[\s\S]*?\.slice\(0, 3\)/, "only the first three reliable matches may surface immediately"],
  [/data-gsn-demand-supply-intelligence="true"[\s\S]*?Check these listings\. Availability and suitability are not confirmed\.[\s\S]*?data-gsn-demand-match-list="compact"[\s\S]*?data-gsn-demand-match-row="compact"[\s\S]*?data-gsn-demand-ask-seller="validated"[\s\S]*?Ask seller[\s\S]*?data-gsn-demand-match-action="compact"[\s\S]*?Shop ›/, "truthful compact supply rows must keep direct validated seller contact and optional Shop access"],
  [/demandMatchEvidenceSentence[\s\S]*?availability not confirmed\./, "each compact match must keep one concise availability boundary"],
  [/gridTemplateColumns: "minmax\(0, 1fr\) auto"[\s\S]*?minHeight: isCompact \? 84 : 88/, "compact match rows must keep bounded row geometry with the two compact actions"],
  [/Community connection is context, not professional verification or guaranteed trust\./, "community context must not be presented as professional verification"],
  [/data-gsn-demand-load-older="true"[\s\S]*?demand-box\.queue\.load-older/, "large queues must keep paged loading"],
  [/const DEMAND_BOX_PAGE_SIZE = 200/, "the backend-safe page size must remain explicit"],
  [/pulseDestination="demand_box"/, "Ask a question must still post into DemandBox"],
].forEach(([pattern, message]) => requirePattern(source, pageFile, pattern, message));

[
  [/queue_keys\?: string\[\] \| null/, "request types must keep saved queue keys"],
  [/mentioned_handles\?: string\[\] \| null/, "request types must keep member handles"],
  [/visibility_scope\?: string \| null/, "request types must keep privacy scope"],
  [/offset\?: number/, "request listing must keep offset paging"],
  [/createMarketplaceVoiceRequest/, "the API client must keep protected voice request creation"],
  [/fetchDemandAudioBlob/, "the API client must keep authenticated audio retrieval"],
  [/deleteDemandAudio/, "the API client must keep sender-controlled voice deletion"],
  [/DELETE VOICE NOTE/, "permanent deletion must keep the explicit server confirmation phrase"],
  [/getDemandSupplySellerContact[\s\S]*?\/seller-contact/, "the API client must keep the authenticated seller-contact authority"],
  [/createMarketplaceRequestResponse/, "the API client must keep private replies"],
  [/repostMarketplaceRequest/, "the API client must keep linked reposting"],
].forEach(([pattern, message]) => requirePattern(apiSource, apiFile, pattern, message));

[
  [/data-gsn-demand-voice-delete-confirmation="true"/, "voice deletion must keep a distinct confirmation state"],
  [/Delete this recording permanently[?][^]*?This cannot be undone[.]/, "voice deletion must explain its irreversible effect"],
  [/GSN keeps the request or reply, sender, time, and deletion event/, "voice deletion must explain retained history"],
  [/Delete permanently/, "voice deletion must require a second explicit action"],
  [/data-gsn-demand-voice-deleted="true"/, "deleted voice notes must leave a truthful tombstone"],
  [/data-gsn-demand-voice-presentation="hero-removed"[^]*?<AudioWaveSignal mode="hero" \/>[^]*?Recording removed/, "deleted voice notes must make the crossed hero waveform their central visual"],
  [/data-gsn-demand-voice-presentation="hero-live"[^]*?<AudioWavePlayer/, "live voice notes must retain the dominant shared waveform player"],
].forEach(([pattern, message]) =>
  requirePattern(protectedVoiceSource, protectedVoiceFile, pattern, message)
);

[
  [/onRecordingChange\?: \(recording: boolean\) => void/, "the recorder must expose active recording state"],
  [/onChange\([\s\S]*?new File[\s\S]*?onRecordingChange\?\.\(false\)/, "the recorder must deliver the file before unlocking submission"],
  [/No voice was captured\. Record again before sending\./, "empty recordings must fail visibly"],
  [/data-gsn-voice-recording=\{recording \? "true" : "false"\}/, "the recorder must expose its runtime state for regression checks"],
  [/heroWaveform\?: boolean/, "the recorder must keep the hero waveform scoped to approved callers"],
  [/data-gsn-voice-recorder-waveform="hero"[\s\S]*?<AudioWaveSignal mode="hero" playing=\{recording\} \/>[\s\S]*?Tap Record and speak/, "the approved composer must place a large shared waveform above the recording action"],
].forEach(([pattern, message]) => requirePattern(recorderSource, recorderFile, pattern, message));

[
  [/SELLER_QUICK_REPLIES[\s\S]*?I can help\.[\s\S]*?Unavailable\.[\s\S]*?I need more details\./, "the private composer must keep the three optional seller response helpers"],
  [/!isOwner[\s\S]*?data-gsn-demand-seller-quick-replies="editable"[\s\S]*?setText\(reply\)[\s\S]*?textareaRef\.current\?\.focus/, "seller helpers must remain responder-only, editable text rather than transaction statuses"],
  [/onRecordingChange=\{setVoiceRecording\}/, "private replies must receive the recorder''s active state"],
  [/if \(voiceRecording\)[\s\S]*?Tap Stop and wait for Voice note ready before sending/, "private reply submission must reject an unfinished recording"],
  [/disabled=\{sending \|\| voiceRecording\}[\s\S]*?Stop recording first[\s\S]*?Send private reply/, "private reply sending must stay locked until recorded audio is ready"],
  [/data-gsn-demand-conversation="whatsapp-like"[\s\S]*?data-gsn-demand-message-direction=\{mine \? "outgoing" : "incoming"\}/, "private replies must keep the familiar alternating chat trail"],
  [/data-gsn-demand-message-avatar="portrait"[\s\S]*?data-gsn-demand-message-avatar="initials"/, "every reply must show the consented portrait or the privacy-safe initials fallback"],
  [/const visibleRows = useMemo[\s\S]*?authorId === ownerUserId && recipientId === recipientUserId[\s\S]*?authorId === recipientUserId && recipientId === ownerUserId/, "request owners must see one private participant exchange at a time"],
  [/Private exchange\. Only the requester and this member can read or play it\./, "the chat trail must retain its private-audience boundary"],
].forEach(([pattern, message]) => requirePattern(responsePanelSource, responsePanelFile, pattern, message));

[
  [/data-gsn-demand-box-shell=\{isDemandBoxRoute \? "neon" : undefined\}/, "the Demand Box neon shell must stay route-scoped"],
  [/pathname === "\/app\/marketplace" \|\| pathname === "\/app\/demand-box"/, "Demand Box must keep Marketplace active in the authenticated bottom rail"],
  [/function shouldKeepBottomRailInTaskMode[\s\S]*?pathname === "\/app\/demand-box"/, "Demand Box must keep the authenticated bottom rail visible"],
  [/if \(pathname === "\/app\/demand-box"\)[\s\S]*?page: "Demand Box"[\s\S]*?data-gmfn-mobile-top-title="true"/, "the compact shell must keep the approved Demand Box title"],
].forEach(([pattern, message]) => requirePattern(appLayoutSource, appLayoutFile, pattern, message));

requirePattern(
  companionBridgeSource,
  companionBridgeFile,
  /COMPANION_BLOCKED_PATH_PREFIXES[\s\S]*?"\/app\/demand-box"/,
  "the focused Demand Box route must not be interrupted by a global companion card"
);

[
  [/Current state/, "the repeated Current state card must not return"],
  [/Create demand/, "the old technical create label must not return"],
  [/Ask a question/, "the first surface must not restore the superseded Ask a question label"],
  [/demand-box\.hero-dashboard|demand-box\.bottom-dashboard|demand-box\.bottom-return/, "duplicate route buttons must not return"],
  [/demand-box\.open-notifications/, "Notifications must not compete with posting"],
  [/data-gsn-demand-routing-readiness="true"/, "technical routing readiness copy must stay off the member surface"],
  [/demandBoxAutoMechanicHero|demand-box-auto-mechanic-hero|data-gsn-demand-request-hero=\{/, "request heroes must not use category-specific mechanic photography"],
  [/width: 104,[\s\S]*?name=\{fromAskCommunity \? "community" : "megaphone"\}/, "the oversized request icon tile must not return"],
  [/<GsnLegacyIcon name="megaphone" size=\{isCompact \? 58 : 66\} \/>/, "the decorative megaphone tile must not return to the create hero"],
  [/demandCreateFieldLabel\("(?:image|megaphone|community|navigation)",/, "decorative icons must not return to create-form field headings"],
  [/demandIconText\("vault", "More options", 24\)/, "the More options heading must remain text-only"],
  [/minHeight: 82,\s*alignItems: "flex-start"/, "the seven tall queue tiles must not return"],
  [/activeDetailTab === "replies"|\.private-replies/, "a second reply-opening disclosure must not return"],
  [/Possible matches[^\n]*\b(recommended|trusted|approved|best|guaranteed)\b/i, "possible matches must not imply endorsement"],
  [/currently available supply/i, "a listing must not be described as confirmed current availability"],
  [/toggleDemandMatches|openMatchDemandId|View matches|Hide matches/, "reliable matches must not require another expansion step"],
  [/<button|<summary|<a\s/, "DemandBox must keep shared stable action primitives"],
].forEach(([pattern, message]) => forbidPattern(source, pageFile, pattern, message));

if (failures.length) {
  console.error("DemandBox front package audit failed:");
  failures.forEach((failure) => console.error("- " + failure));
  process.exit(1);
}

console.log("DemandBox simple front package audit passed.");
