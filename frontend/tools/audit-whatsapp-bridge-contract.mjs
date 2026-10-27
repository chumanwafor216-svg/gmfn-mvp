/* global console */
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function mustInclude(name, text, needle) {
  if (!text.includes(needle)) {
    throw new Error(`${name} is missing required bridge contract text: ${needle}`);
  }
}

function mustNotInclude(name, text, needle) {
  if (text.includes(needle)) {
    throw new Error(`${name} still includes retired broad-bridge behavior: ${needle}`);
  }
}

const app = read("src/App.tsx");
const routes = read("src/lib/appRoutes.ts");
const page = read("src/pages/WhatsAppBridgePage.tsx");
const publicNoticePage = read("src/pages/CommunityNoticePage.tsx");
const noticeModal = read("src/components/CommunityNoticeModal.tsx");
const communityHome = read("src/pages/CommunityHomePage.tsx");
const noticeApi = read("../gmfn_backend/app/api/routes/community_notices.py");
const registry = read("../docs/SCREEN_REGISTRY.md");
const specs = read("../docs/SCREEN_SPECS.md");
const protocol = read("../docs/GSN_WHATSAPP_BRIDGE_PROTOCOL_2026-09-11.md");

mustInclude("App.tsx", app, "WhatsAppBridgePage");
mustInclude("App.tsx", app, 'path="whatsapp-bridge" element={<WhatsAppBridgePage />}');
mustInclude("App.tsx", app, 'path="/whatsapp-bridge" element={<PreserveRedirect to={APP_ROUTES.WHATSAPP_BRIDGE} />}');

mustInclude("appRoutes.ts", routes, 'WHATSAPP_BRIDGE: "/app/whatsapp-bridge"');
mustInclude("appRoutes.ts", routes, '"WHATSAPP_BRIDGE"');

mustInclude("WhatsAppBridgePage.tsx", page, 'data-gsn-whatsapp-bridge="root"');
mustInclude("WhatsAppBridgePage.tsx", page, "Community Domain Bulletin Bridge");
mustInclude("WhatsAppBridgePage.tsx", page, "Broadcast approved public bulletins.");
mustInclude("WhatsAppBridgePage.tsx", page, "Copy Bulletin Message");
mustInclude("WhatsAppBridgePage.tsx", page, "Share to WhatsApp");
mustInclude("WhatsAppBridgePage.tsx", page, "SocialTagShareButton");
mustInclude("WhatsAppBridgePage.tsx", page, 'buttonLabel="Share bulletin"');
mustInclude("WhatsAppBridgePage.tsx", page, "No public bulletin ready");
mustInclude("WhatsAppBridgePage.tsx", page, "Output only");
mustInclude("WhatsAppBridgePage.tsx", page, "No internal tools");
mustInclude("WhatsAppBridgePage.tsx", page, "No WhatsApp scraping");
mustInclude("WhatsAppBridgePage.tsx", page, "listCommunityNotices");
mustInclude("WhatsAppBridgePage.tsx", page, "publicNoticeUrl");
mustInclude("WhatsAppBridgePage.tsx", page, "isMarketNeedPulseNotice");
mustInclude("WhatsAppBridgePage.tsx", page, "!isMarketNeedPulseNotice(item)");
mustInclude("WhatsAppBridgePage.tsx", page, "The Community Domain Bulletin Bridge distributes public announcement");
mustInclude("WhatsAppBridgePage.tsx", page, "Acknowledgement, availability and poll responses happen inside the detached GSN");
mustNotInclude("WhatsAppBridgePage.tsx", page, "StableCtaLink");
mustNotInclude("WhatsAppBridgePage.tsx", page, "sourceRows");
mustNotInclude("WhatsAppBridgePage.tsx", page, "SignpostSource");
mustNotInclude("WhatsAppBridgePage.tsx", page, "Membership QR / invite");
mustNotInclude("WhatsAppBridgePage.tsx", page, "Community Domain setup");
mustNotInclude("WhatsAppBridgePage.tsx", page, "/app/clans");
mustNotInclude("WhatsAppBridgePage.tsx", page, "/app/community-domain");
mustNotInclude("WhatsAppBridgePage.tsx", page, "/app/shop-control#shop-control-gallery-tools");
mustNotInclude("WhatsAppBridgePage.tsx", page, "/app/demand-box?mode=ask_community");
mustNotInclude("WhatsAppBridgePage.tsx", page, "whatsapp-bridge.destination.");
mustNotInclude("WhatsAppBridgePage.tsx", page, "whatsapp-bridge.source.");
mustNotInclude("WhatsAppBridgePage.tsx", page, "Fallback signpost link");
mustNotInclude("WhatsAppBridgePage.tsx", page, "Copy Signpost Message");

mustInclude("CommunityNoticePage.tsx", publicNoticePage, 'data-debug-id="community-notice.public-page"');
mustInclude("CommunityNoticePage.tsx", publicNoticePage, "Announcement-only public package");
mustInclude("CommunityNoticePage.tsx", publicNoticePage, "Acknowledge announcement");
mustInclude("CommunityNoticePage.tsx", publicNoticePage, "Contact the announcer");
mustInclude("CommunityNoticePage.tsx", publicNoticePage, "Call announcer");
mustInclude("CommunityNoticePage.tsx", publicNoticePage, "attachmentActionLabel");
mustInclude("CommunityNoticePage.tsx", publicNoticePage, 'buttonLabel="Share announcement"');
mustInclude("CommunityNoticePage.tsx", publicNoticePage, "recordCommunityNoticePollResponse");
mustInclude("CommunityNoticePage.tsx", publicNoticePage, "recordPublicCommunityNoticePollResponse");
mustInclude("CommunityNoticePage.tsx", publicNoticePage, "publicPollResponseToken");
mustInclude("CommunityNoticePage.tsx", publicNoticePage, 'data-debug-id="community-notice.choice-poll"');
mustInclude("CommunityNoticePage.tsx", publicNoticePage, 'debugId="community-notice.poll-submit"');
mustInclude("CommunityNoticePage.tsx", publicNoticePage, "OK — send response");
mustInclude("CommunityNoticePage.tsx", publicNoticePage, "No writing is needed.");
mustInclude("CommunityNoticePage.tsx", publicNoticePage, 'data-debug-id="community-notice.poll-results"');
mustInclude("CommunityNoticePage.tsx", publicNoticePage, "Public-link totals are browser-response counts, not proof of unique people.");
mustNotInclude("CommunityNoticePage.tsx", publicNoticePage, "poll-roll-call");
mustNotInclude("CommunityNoticePage.tsx", publicNoticePage, "CommunityNoticeModal");
mustNotInclude("CommunityNoticePage.tsx", publicNoticePage, "createCommunityNotice");

mustInclude("CommunityNoticeModal.tsx", noticeModal, "Who can vote?");
mustInclude("CommunityNoticeModal.tsx", noticeModal, "Community members only");
mustInclude("CommunityNoticeModal.tsx", noticeModal, "Anyone with the announcement link");
mustInclude("CommunityNoticeModal.tsx", noticeModal, 'if (audience === "public_link") setPublicQrEnabled(true)');
mustInclude("CommunityNoticeModal.tsx", noticeModal, "public responses are anonymous browser counts.");

mustInclude("community_notices.py", noticeApi, 'COMMUNITY_NOTICE_POLL_RESPONSE_EVENT = "community.notice.poll_response"');
mustInclude("community_notices.py", noticeApi, "MAX_NOTICE_POLL_OPTIONS = 7");
mustInclude("community_notices.py", noticeApi, '@router.post("/{notice_event_id}/poll-response")');
mustInclude("community_notices.py", noticeApi, '@router.post("/public/{public_code}/poll-response")');
mustInclude("community_notices.py", noticeApi, '@router.get("/{notice_event_id}/poll-roll-call")');
mustInclude("community_notices.py", noticeApi, 'NOTICE_POLL_SELECTION_MULTIPLE = "multiple"');
mustInclude("community_notices.py", noticeApi, 'NOTICE_POLL_AUDIENCE_PUBLIC_LINK = "public_link"');
mustInclude("community_notices.py", noticeApi, "CommunityNoticePublicPollResponse");
mustInclude("community_notices.py", noticeApi, '"public_response_count"');
mustInclude("community_notices.py", noticeApi, "Browser-response totals are not proof of unique people.");
mustInclude("community_notices.py", noticeApi, "Totals combine member account responses and anonymous browser responses.");
mustInclude("community_notices.py", noticeApi, '"poll_summary"');
mustInclude("community_notices.py", noticeApi, '"sender_contact_ready"');

mustInclude("CommunityHomePage.tsx", communityHome, "Community Bulletin");
mustInclude("CommunityHomePage.tsx", communityHome, "Anyone with the announcement link may vote");
mustInclude("CommunityHomePage.tsx", communityHome, "Public-link responses are counts only and never enter the member roll call.");
mustInclude("CommunityHomePage.tsx", communityHome, "SocialTagShareButton");
mustInclude("CommunityHomePage.tsx", communityHome, 'buttonLabel="Share announcement"');
mustInclude("CommunityHomePage.tsx", communityHome, "shareablePublicFrontendUrl");
mustInclude("CommunityHomePage.tsx", communityHome, "community-home.bulletin.share.");
mustNotInclude("CommunityHomePage.tsx", communityHome, 'id: `notice-response-${noticeKey}`');
mustNotInclude("CommunityHomePage.tsx", communityHome, 'id: `notice-ack-${noticeKey}`');
mustNotInclude("CommunityHomePage.tsx", communityHome, "routes.whatsappBridge");
mustNotInclude("CommunityHomePage.tsx", communityHome, "community-home.lane.marketplace-tools");

mustInclude("SCREEN_REGISTRY.md", registry, "WhatsAppBridgePage");
mustInclude("SCREEN_SPECS.md", specs, "## WhatsAppBridgePage");
mustInclude("SCREEN_SPECS.md", specs, "Community Domain Bulletin Bridge title");
mustInclude("SCREEN_SPECS.md", specs, "broadcast already-published");
mustInclude("SCREEN_SPECS.md", specs, "Community Domain bulletin outputs");
mustInclude("SCREEN_SPECS.md", specs, "Do not expose GSN internal feature pointers");
mustInclude("protocol", protocol, "Community Domain Bulletin Bridge");
mustInclude("protocol", protocol, "WhatsApp is the conversation room. GSN is the organised action room.");
mustInclude("protocol", protocol, "feature-specific public share link");
mustInclude("protocol", protocol, "WhatsApp Status is only a reminder");

console.log("WhatsApp Bridge contract audit passed.");
