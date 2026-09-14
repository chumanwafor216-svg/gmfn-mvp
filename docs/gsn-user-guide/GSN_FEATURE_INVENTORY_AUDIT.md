# GSN Feature Inventory Audit

Audit date: 2026-09-13
Repository commit inspected: `69ddf6f1`

This inventory classifies user-facing GSN capability from current route code, backend route inventory, frontend audits, backend tests, and mocked current screenshots. It is an audit document, not public marketing copy.

## Verification Sources

- Raw route/API/model/check inventory: `deliverables/self_service_guide_audit_2026-09-13/raw_product_inventory.json`
- App route constants: 56 named routes
- React route declarations found: 272
- Backend route handlers found: 553
- Backend/app model classes found: 339
- Audit/smoke/backend test files found: 221

## Inventory

| ID | Feature | Public section | Status | Setup | Behaviour | Route | Labels | Recovery |
|---|---|---|---|---|---|---|---|---|
| F001 | Member account, profile, and personal GSN identity | A | LIVE | FOUNDATIONAL_REQUIRED | USER_CONFIGURES_OR_CREATES | /login; /app/my-gmfn-and-i | Existing Member Sign In; My GSN Identity; Settings | Return to Profile or Settings, correct fields, repeat verification if asked. |
| F002 | Create community or join existing community | A | LIVE | FOUNDATIONAL_REQUIRED | USER_CONFIGURES_OR_CREATES | /app/community; /app/clans; /join/:code; /pending-approval; /app/community/:id/join-requests | Community Home; Set up Community Domain; Join marketplace; Owner approvals; Review Join Requests | Use latest invite link/code, ask owner/admin to review, or return to Community Home/Dashboard. |
| F003 | Community Domain setup and administration | A | PARTIAL | FOUNDATIONAL_REQUIRED | USER_CONFIGURES_OR_CREATES | /community-domain/purchase; /app/community-domain; /app/community-domain/:communityDomainId | Community Domain; Check domain; Create draft; Open my Community Domains; Set up Community Domain | Check another name, open/create base community first, delegate editor, or return to Community Home. |
| F004 | Community Bulletin / official notice board | A | LIVE | OPTIONAL_CONFIGURATION | USER_CONFIGURES_OR_CREATES | /app/community; /community-notices/:public_code | Community Bulletin; Bulletin tools; Post; Submit; Contact; Open QR link; Read full notice | Open Bulletin tools, check policy, submit again with required length, or ask admin to decide. |
| F005 | Shop setup | A | LIVE | FOUNDATIONAL_REQUIRED | USER_CONFIGURES_OR_CREATES | /app/shop-control; /shop/:gmfnId | Shop Control; Save; WhatsApp number; Manage Products; Analytics | Return to Shop Control, save details, check listing policy, wait for approval if required. |
| F006 | Product/service public blocks and images | A | LIVE | FOUNDATIONAL_REQUIRED | USER_CONFIGURES_OR_CREATES | /app/shop-assets; /app/shop-control#shop-control-gallery-tools; /shop/:gmfnId | Manage Products; Public Items; Public shop blocks; No vault items yet; Price on request | Open Shop Assets or Manage Products, replace slot, add media, archive duplicate/old block. |
| F007 | Contact information for shop and DemandBox | A | LIVE | FOUNDATIONAL_REQUIRED | USER_CONFIGURES_OR_CREATES | /app/shop-control; /app/demand-box; /shop/:gmfnId | WhatsApp; WhatsApp number; Contact | Add or update contact in Shop Control or request details; retry contact action. |
| F008 | Private Vault offers and access links | A | LIVE | OPTIONAL_CONFIGURATION | USER_CONFIGURES_OR_CREATES | /app/vault-control; /share/vault-request/:gmfn_id | Private Vault; Create a link; Share access; No private offer is ready yet; No access link is ready yet | Add private offer first, create access link, extend/revoke as needed. |
| F009 | Free Spotlight publisher | A | LIVE | OPTIONAL_CONFIGURATION | USER_CONFIGURES_OR_CREATES | /app/shop-control#shop-control-spotlight; /app/dashboard; /shop/:gmfnId | Free Spotlight; Publish; Your Spotlight; Show Spotlight screen; WhatsApp | Open Spotlight tasks, check media/message, wait for daily quota reset, or use paid route. |
| F010 | Subscription Spotlight and paid Network Repost | A | PARTIAL | OPTIONAL_CONFIGURATION | USER_CONFIGURES_OR_CREATES | /app/shop-control/subscription-spotlight; /app/marketplace | Subscription Spotlight; Spotlight credits; Generate payment code; Copy payment details; Publish Subscription Spotlight; Network Spotlight | Generate/refresh payment status, pick one public block, check target community ID, wait for credit confirmation. |
| F011 | Share public shop, product, Spotlight, or bulletin link | B | LIVE | NONE | USER_TRIGGERS_ON_DEMAND | /shop/:gmfnId; /app/shop-control; /app/whatsapp-bridge; /community-notices/:public_code | Share; Copy; Copy Bulletin Message; Share to WhatsApp; Open QR link | Create or publish the underlying shop/product/notice/Spotlight first, then share again. |
| F012 | QR and public verification links | B | LIVE | NONE | USER_TRIGGERS_ON_DEMAND | /t/:code; /trust-slips/verify/:code; /community-notices/:public_code; /join/:code | QR; TrustSlip Verify; Open QR link; Live ID card | Ask holder/admin to refresh code, resend latest QR/link, or use manual code fallback. |
| F013 | DemandBox post, response, close, and cancellation | B | LIVE | NONE | USER_TRIGGERS_ON_DEMAND | /app/demand-box; /marketplace/requests/:request_id | DemandBox; Post demand; Posting...; Open my demand; Open community demand; Fulfilled; Cancelled; Open your DemandBox | Create/join a community, add a title if validation responds, reopen DemandBox, or contact requester. |
| F014 | Ask Community through DemandBox | B | LIVE | NONE | USER_TRIGGERS_ON_DEMAND | /app/demand-box?mode=ask_community | Ask Community; Community question posted in DemandBox; Community Ask; Post a direct need or ask the community first | Choose community, write question/title, post again, use DemandBox response or contact path. |
| F015 | TrustSlip generation, sharing, and recipient verification | B | LIVE | NONE | USER_TRIGGERS_ON_DEMAND | /app/trust-slip; /t/:code; /verify/trust-slip; /app/trust-slip/verify | TrustSlip; TrustSlip Verify; Public Decision Pack; Read evidence; Ask community | Holder refreshes/generates current TrustSlip, selects correct purpose, shares latest QR/code/link. |
| F016 | Community confirmation and witness response | B | PARTIAL | NONE | USER_TRIGGERS_ON_DEMAND | /community-confirmations/public/:token; /app/community-confirmations; /app/community-confirmations/policy | Community Confirmation; Confirm membership; Ask community; Review witnesses | Use inbox/policy screens, ask community only when code/response pool ready, review evidence before relying. |
| F017 | Community Domain Bulletin Bridge | B | LIVE | NONE | USER_TRIGGERS_ON_DEMAND | /app/whatsapp-bridge | Community Domain Bulletin Bridge; Broadcast approved public bulletins.; Copy Bulletin Message; Share to WhatsApp; No public bulletin ready; Output only; No internal tools; No WhatsApp scraping | Post/approve a public bulletin first, return to bridge, copy message or share manually. |
| F018 | GS ID / GSN ID assignment and display | C | LIVE | NONE | SYSTEM_DERIVES_OR_UPDATES | /app/my-gmfn-and-i; /app/dashboard; /app/community; /shop/:gmfnId | GSN ID; GSN ID visible; Trust Identity | Complete activation/join approval/profile setup; ask owner/admin if ID not issued. |
| F019 | Shop Control automatic status and owner board | C | LIVE | NONE | SYSTEM_DERIVES_OR_UPDATES | /app/shop-control | Shop Control; Analytics; Public Items; Vault; Spotlights; Followers; Shared links; Visitors; Product opens; Contact taps | Create public items, publish/share, wait for activity, then reopen Analytics; correct source records in owning feature. |
| F020 | Business Analytics and Advanced Analytics snapshot | C | PARTIAL | NONE | SYSTEM_DERIVES_OR_UPDATES | /app/shop-control#shop-control-summary | Business Analytics; Advanced Analytics; Market Intelligence; Advanced Analytics snapshot; Evidence first, next test second; Contact taps | Publish/share/post demand, record outcomes, close loops, then recheck; do not treat early readings as proof. |
| F021 | Market Wisdom | C | LIVE | NONE | SYSTEM_DERIVES_OR_UPDATES | /app/dashboard; /app/marketplace; /public/daily-insight | Market Wisdom; Your Market Wisdom; Market; GSN; Guide; Now | Refresh Dashboard, check backend route/connectivity, use Focus Commitments when relevant. |
| F022 | TrustEvents and TrustTimeline | C | LIVE | NONE | SYSTEM_DERIVES_OR_UPDATES | /app/trust-timeline; /app/command-center/trust-events | Trust Events; Latest event context; TrustTimeline; Admin Trust Events | Record real activity in owning feature, ask admin/reviewer to correct authorized evidence, or use Identity/Trust recovery. |
| F023 | TrustPassport | C | LIVE | NONE | SYSTEM_DERIVES_OR_UPDATES | /app/trust; /trust-passport redirect to /app/trust | Trust Passport; Open Trust Passport; fuller personal/private record | Correct source evidence, add missing confirmation/identity records, wait for refresh, or use TrustSlip refresh for public proof. |
| F024 | TrustGraph and Trust Analytics admin views | C | ADMIN_ONLY | NONE | SYSTEM_DERIVES_OR_UPDATES | /app/command-center/trust-graph; /app/command-center/trust-analytics | Trust Graph; Trust Analytics | Use admin Command Center after permission; correct source events instead of editing graph interpretation directly. |
| F025 | Notifications and phone Web Push | C | PARTIAL | OPTIONAL_CONFIGURATION | SYSTEM_DERIVES_OR_UPDATES | /app/notifications; service worker; web-push API | Notifications; Action Inbox; Web Push | Install/permit PWA/browser notifications, verify environment keys, open Action Inbox fallback. |
| F026 | Opportunity / Market Intelligence capability | D | EXPERIMENTAL | NONE | CONDITIONALLY_UNLOCKED | /app/shop-control#shop-control-summary; /app/marketplace; /app/demand-box | Opportunity Engine / Market Intelligence; Advanced Analytics snapshot; Opportunity reading; Recommended next move; Ask Community; Open DemandBox | Add a real offer, publish/share, post or answer DemandBox items, close outcomes, and recheck after evidence grows. |

## F001 - Member account, profile, and personal GSN identity

- Product status: `LIVE`
- Setup requirement: `FOUNDATIONAL_REQUIRED`
- Behaviour type: `USER_CONFIGURES_OR_CREATES`
- Source data: Signup/login record, profile fields, phone/identity evidence where supplied, selected community context.
- Prerequisites: User must create or sign in to an account.
- Dependencies: Auth routes, entry verification routes, profile page, selected community state.
- Permissions: Signed-in member; some recovery/admin tools are restricted.
- Exact route(s): `/login; /app/my-gmfn-and-i`
- Exact visible labels: Existing Member Sign In; My GSN Identity; Settings
- Empty/stale state: Incomplete profile evidence shows as evidence still building or prompts to complete settings.
- Recovery path: Return to Profile or Settings, correct fields, repeat verification if asked.
- Screenshot: screenshots/2026-09-13_trust-passport.png
- Verification evidence: APP_ROUTES LOGIN/PROFILE; entry/auth routes; SCREEN_REGISTRY Profile/MyGMFNAndI.

## F002 - Create community or join existing community

- Product status: `LIVE`
- Setup requirement: `FOUNDATIONAL_REQUIRED`
- Behaviour type: `USER_CONFIGURES_OR_CREATES`
- Source data: Community record, invite code/link/QR context, join request, approval votes, selected community.
- Prerequisites: Signed-in member and invite or owner intent to create.
- Dependencies: Community Home, Clans/invite routes, join requests, admin review policy.
- Permissions: Member for request; owner/admin/reviewer for approval.
- Exact route(s): `/app/community; /app/clans; /join/:code; /pending-approval; /app/community/:id/join-requests`
- Exact visible labels: Community Home; Set up Community Domain; Join marketplace; Owner approvals; Review Join Requests
- Empty/stale state: No marketplace communities yet; invite code or join link needed; request may remain pending.
- Recovery path: Use latest invite link/code, ask owner/admin to review, or return to Community Home/Dashboard.
- Screenshot: screenshots/2026-09-13_community-home.png
- Verification evidence: Community Home and Clans audits; join request tests; appRoutes COMMUNITY/CLANS/JOIN_PENDING.

## F003 - Community Domain setup and administration

- Product status: `PARTIAL`
- Setup requirement: `FOUNDATIONAL_REQUIRED`
- Behaviour type: `USER_CONFIGURES_OR_CREATES`
- Source data: Domain draft, profile, templates, package quote, setup evidence, governance settings, response channels.
- Prerequisites: Existing community or owner authority; domain name/template choice.
- Dependencies: Community Domain purchase/dashboard, community domain API, package/payment instructions, governance policy.
- Permissions: Community owner/admin/setup editor; some routes platform/admin governed.
- Exact route(s): `/community-domain/purchase; /app/community-domain; /app/community-domain/:communityDomainId`
- Exact visible labels: Community Domain; Check domain; Create draft; Open my Community Domains; Set up Community Domain
- Empty/stale state: Domain can be draft/unavailable; marketplace community may not be linked yet.
- Recovery path: Check another name, open/create base community first, delegate editor, or return to Community Home.
- Screenshot: screenshots/2026-09-13_community-home.png
- Verification evidence: CommunityDomainPurchasePage/CommunityDomainDashboardPage route code; community domain product contract audit passed.

## F004 - Community Bulletin / official notice board

- Product status: `LIVE`
- Setup requirement: `OPTIONAL_CONFIGURATION`
- Behaviour type: `USER_CONFIGURES_OR_CREATES`
- Source data: Community notice events, notice settings, public code, attachments, acknowledgement/availability responses.
- Prerequisites: Selected community; posting permission according to notice policy.
- Dependencies: Community Home, Community Notices API, review queue, public notice route, Web Push where configured.
- Permissions: Members/admins depending on policy; review actions owner/admin/platform admin.
- Exact route(s): `/app/community; /community-notices/:public_code`
- Exact visible labels: Community Bulletin; Bulletin tools; Post; Submit; Contact; Open QR link; Read full notice
- Empty/stale state: No active notice or no public bulletin ready; member submission may wait for review.
- Recovery path: Open Bulletin tools, check policy, submit again with required length, or ask admin to decide.
- Screenshot: screenshots/2026-09-13_community-home.png
- Verification evidence: Community Home button inventory passed; community_notices backend tests passed.

## F005 - Shop setup

- Product status: `LIVE`
- Setup requirement: `FOUNDATIONAL_REQUIRED`
- Behaviour type: `USER_CONFIGURES_OR_CREATES`
- Source data: Shop/business name, category, description, contact/WhatsApp, community visibility, owner GSN ID.
- Prerequisites: Signed-in member with community membership and shop feature enabled.
- Dependencies: Marketplace shop routes, Shop Control, public shop, feature policy.
- Permissions: Shop owner; domain policy may require admin approval for listings.
- Exact route(s): `/app/shop-control; /shop/:gmfnId`
- Exact visible labels: Shop Control; Save; WhatsApp number; Manage Products; Analytics
- Empty/stale state: Shop record not ready; open Shop Control first if the shop has not been created.
- Recovery path: Return to Shop Control, save details, check listing policy, wait for approval if required.
- Screenshot: screenshots/2026-09-13_shop-control.png
- Verification evidence: Shop Control audit passed; marketplace/public shop backend tests passed outside sandbox.

## F006 - Product/service public blocks and images

- Product status: `LIVE`
- Setup requirement: `FOUNDATIONAL_REQUIRED`
- Behaviour type: `USER_CONFIGURES_OR_CREATES`
- Source data: Product title, detail, price/currency, category, availability, public/private visibility, image/video media.
- Prerequisites: Shop exists; media meets file rules; public slots available.
- Dependencies: Shop Assets, Marketplace products API, media upload route, public shop rendering.
- Permissions: Shop owner; listing approval may apply.
- Exact route(s): `/app/shop-assets; /app/shop-control#shop-control-gallery-tools; /shop/:gmfnId`
- Exact visible labels: Manage Products; Public Items; Public shop blocks; No vault items yet; Price on request
- Empty/stale state: Empty slot or no media link; public shop hides missing media rather than broken links.
- Recovery path: Open Shop Assets or Manage Products, replace slot, add media, archive duplicate/old block.
- Screenshot: screenshots/2026-09-13_shop-assets.png
- Verification evidence: Shop assets/gallery audits; marketplace media boundary tests; public shop tests passed.

## F007 - Contact information for shop and DemandBox

- Product status: `LIVE`
- Setup requirement: `FOUNDATIONAL_REQUIRED`
- Behaviour type: `USER_CONFIGURES_OR_CREATES`
- Source data: WhatsApp number, phone/contact fields, request contact path, owner contact visibility.
- Prerequisites: User consents to show a contact path for shop/request.
- Dependencies: Shop Control, DemandBox, public shop, WhatsApp link helper.
- Permissions: Owner controls own contact fields; viewers see public/request-visible contact only.
- Exact route(s): `/app/shop-control; /app/demand-box; /shop/:gmfnId`
- Exact visible labels: WhatsApp; WhatsApp number; Contact
- Empty/stale state: No WhatsApp/contact path means chat/call action cannot open from that surface.
- Recovery path: Add or update contact in Shop Control or request details; retry contact action.
- Screenshot: screenshots/2026-09-13_shop-control.png
- Verification evidence: ShopControlPage and DemandBoxPage labels; public shop button inventory passed.

## F008 - Private Vault offers and access links

- Product status: `LIVE`
- Setup requirement: `OPTIONAL_CONFIGURATION`
- Behaviour type: `USER_CONFIGURES_OR_CREATES`
- Source data: Private product/offer records, access-link recipient, expiry/extension/revocation state.
- Prerequisites: Shop and at least one private offer.
- Dependencies: Vault Control, vault access API, marketplace products private visibility.
- Permissions: Shop owner; recipient link holder sees only scoped offer.
- Exact route(s): `/app/vault-control; /share/vault-request/:gmfn_id`
- Exact visible labels: Private Vault; Create a link; Share access; No private offer is ready yet; No access link is ready yet
- Empty/stale state: No private offer ready or no access link ready.
- Recovery path: Add private offer first, create access link, extend/revoke as needed.
- Screenshot: Not captured in this pass
- Verification evidence: APP_ROUTES VAULT_CONTROL; ShopControl Vault section source; vault tests present.

## F009 - Free Spotlight publisher

- Product status: `LIVE`
- Setup requirement: `OPTIONAL_CONFIGURATION`
- Behaviour type: `USER_CONFIGURES_OR_CREATES`
- Source data: Shop/product details, Spotlight message/body, media, owner identity, eligible owner communities.
- Prerequisites: Shop exists, product/media/message eligible, daily free quota available.
- Dependencies: Shop Control Spotlight workflow, Marketplace broadcast API, Dashboard/Public Shop feed.
- Permissions: Shop owner in eligible communities; domain policy can disable Spotlight.
- Exact route(s): `/app/shop-control#shop-control-spotlight; /app/dashboard; /shop/:gmfnId`
- Exact visible labels: Free Spotlight; Publish; Your Spotlight; Show Spotlight screen; WhatsApp
- Empty/stale state: No live Spotlight for you; last Spotlight ended; quota may be exhausted.
- Recovery path: Open Spotlight tasks, check media/message, wait for daily quota reset, or use paid route.
- Screenshot: screenshots/2026-09-13_dashboard.png
- Verification evidence: Spotlight system feed audit passed; Shop Gallery audit passed; backend public shop tests passed.

## F010 - Subscription Spotlight and paid Network Repost

- Product status: `PARTIAL`
- Setup requirement: `OPTIONAL_CONFIGURATION`
- Behaviour type: `USER_CONFIGURES_OR_CREATES`
- Source data: Paid Spotlight credit bundle, payment instruction, target community, selected public block, credit usage.
- Prerequisites: Shop/product exists; payment/credit instruction generated and usable credit confirmed.
- Dependencies: Subscription Spotlight page, payment instructions, marketplace repost action, spotlight credit/status API.
- Permissions: Shop owner; paid credit and domain feature policy required.
- Exact route(s): `/app/shop-control/subscription-spotlight; /app/marketplace`
- Exact visible labels: Subscription Spotlight; Spotlight credits; Generate payment code; Copy payment details; Publish Subscription Spotlight; Network Spotlight
- Empty/stale state: Publisher: Waiting; active paid Spotlight may already exist; no target community suggestion may be ready.
- Recovery path: Generate/refresh payment status, pick one public block, check target community ID, wait for credit confirmation.
- Screenshot: screenshots/2026-09-13_marketplace.png
- Verification evidence: Spotlight subscription pricing tests passed; Spotlight system feed audit passed.

## F011 - Share public shop, product, Spotlight, or bulletin link

- Product status: `LIVE`
- Setup requirement: `NONE`
- Behaviour type: `USER_TRIGGERS_ON_DEMAND`
- Source data: Already-created public shop/product/Spotlight/bulletin URL and public-safe summary.
- Prerequisites: A public output must already exist.
- Dependencies: Public links/share helpers, QR/public routes, route-specific copy/share buttons.
- Permissions: Viewer/owner as surfaced by the route; public output only.
- Exact route(s): `/shop/:gmfnId; /app/shop-control; /app/whatsapp-bridge; /community-notices/:public_code`
- Exact visible labels: Share; Copy; Copy Bulletin Message; Share to WhatsApp; Open QR link
- Empty/stale state: No public link/output ready.
- Recovery path: Create or publish the underlying shop/product/notice/Spotlight first, then share again.
- Screenshot: screenshots/2026-09-13_bulletin-bridge.png
- Verification evidence: Link contract audit passed; Bulletin Bridge contract passed.

## F012 - QR and public verification links

- Product status: `LIVE`
- Setup requirement: `NONE`
- Behaviour type: `USER_TRIGGERS_ON_DEMAND`
- Source data: Invite/public notice/TrustSlip/public shop code or URL.
- Prerequisites: Underlying public record exists and is current.
- Dependencies: QR component, public frontend/API origin, trust/public routes.
- Permissions: QR viewer only sees public-safe output; signed-in routes remain protected.
- Exact route(s): `/t/:code; /trust-slips/verify/:code; /community-notices/:public_code; /join/:code`
- Exact visible labels: QR; TrustSlip Verify; Open QR link; Live ID card
- Empty/stale state: No public QR verification path or expired/stale code.
- Recovery path: Ask holder/admin to refresh code, resend latest QR/link, or use manual code fallback.
- Screenshot: screenshots/2026-09-13_public-trustslip.png
- Verification evidence: Public TrustSlip first-viewport and verify-boundary audits passed; link contract audit passed.

## F013 - DemandBox post, response, close, and cancellation

- Product status: `LIVE`
- Setup requirement: `NONE`
- Behaviour type: `USER_TRIGGERS_ON_DEMAND`
- Source data: Demand title, description, community ID, requester GSN ID/contact, status, response path.
- Prerequisites: Signed-in member and selected community; DemandBox feature enabled.
- Dependencies: Marketplace request API, DemandBox page, Dashboard DemandBox preview.
- Permissions: Requester can create/close/cancel own demand; community members can view/respond according to app surface.
- Exact route(s): `/app/demand-box; /marketplace/requests/:request_id`
- Exact visible labels: DemandBox; Post demand; Posting...; Open my demand; Open community demand; Fulfilled; Cancelled; Open your DemandBox
- Empty/stale state: No community available; no extra detail yet; feature may be off while existing requests remain visible.
- Recovery path: Create/join a community, add a title if validation responds, reopen DemandBox, or contact requester.
- Screenshot: screenshots/2026-09-13_demandbox.png
- Verification evidence: DemandBox front package audit passed; marketplace_requests backend tests passed.

## F014 - Ask Community through DemandBox

- Product status: `LIVE`
- Setup requirement: `NONE`
- Behaviour type: `USER_TRIGGERS_ON_DEMAND`
- Source data: Question text, community context, category Community Ask, requester/contact path.
- Prerequisites: Signed-in member and selected community; DemandBox enabled.
- Dependencies: DemandBox modal, createMarketplaceRequest API, not Community Notice engine.
- Permissions: Member request action; responses stay in DemandBox or approved private contact path.
- Exact route(s): `/app/demand-box?mode=ask_community`
- Exact visible labels: Ask Community; Community question posted in DemandBox; Community Ask; Post a direct need or ask the community first
- Empty/stale state: If community missing, user must create/join first; post button gives validation feedback.
- Recovery path: Choose community, write question/title, post again, use DemandBox response or contact path.
- Screenshot: screenshots/2026-09-13_demandbox.png
- Verification evidence: DemandBox audit requires Community Ask to createMarketplaceRequest category Community Ask and not Community Notice Board.

## F015 - TrustSlip generation, sharing, and recipient verification

- Product status: `LIVE`
- Setup requirement: `NONE`
- Behaviour type: `USER_TRIGGERS_ON_DEMAND`
- Source data: Existing eligible identity/community/trust evidence, selected purpose/Decision Pack, public code, validity window.
- Prerequisites: Holder has account and enough eligible evidence for requested purpose/context.
- Dependencies: TrustSlip page, trust slip APIs, public verify page, TrustPassport/private evidence boundary.
- Permissions: Holder controls sharing; public verifier sees public-safe TrustSlip only.
- Exact route(s): `/app/trust-slip; /t/:code; /verify/trust-slip; /app/trust-slip/verify`
- Exact visible labels: TrustSlip; TrustSlip Verify; Public Decision Pack; Read evidence; Ask community
- Empty/stale state: Expired, missing, stale, or not enough evidence; verifier may ask holder to refresh.
- Recovery path: Holder refreshes/generates current TrustSlip, selects correct purpose, shares latest QR/code/link.
- Screenshot: screenshots/2026-09-13_trustslip.png
- Verification evidence: Public TrustSlip audits passed; Decision Pack QR/public-link issue registered.

## F016 - Community confirmation and witness response

- Product status: `PARTIAL`
- Setup requirement: `NONE`
- Behaviour type: `USER_TRIGGERS_ON_DEMAND`
- Source data: TrustSlip/community confirmation request, public token, eligible response pool, witness responses, review case.
- Prerequisites: Public TrustSlip/community evidence context and configured response permissions.
- Dependencies: Community confirmation APIs, public confirmation route, inbox/policy route.
- Permissions: Requester/recipient/community responders; reviewer/admin for review cases.
- Exact route(s): `/community-confirmations/public/:token; /app/community-confirmations; /app/community-confirmations/policy`
- Exact visible labels: Community Confirmation; Confirm membership; Ask community; Review witnesses
- Empty/stale state: Request can remain pending or response pool unavailable.
- Recovery path: Use inbox/policy screens, ask community only when code/response pool ready, review evidence before relying.
- Screenshot: Not captured in this pass
- Verification evidence: Community confirmation backend tests passed; public TrustSlip audit checks confirmation choices.

## F017 - Community Domain Bulletin Bridge

- Product status: `LIVE`
- Setup requirement: `NONE`
- Behaviour type: `USER_TRIGGERS_ON_DEMAND`
- Source data: Latest already-published public Community Bulletin notice link and public-safe message.
- Prerequisites: A public Community Domain bulletin/notice already exists.
- Dependencies: Community notices list, public notice URL builder, WhatsApp/share helper.
- Permissions: Signed-in community/domain user with route access; output is public bulletin only.
- Exact route(s): `/app/whatsapp-bridge`
- Exact visible labels: Community Domain Bulletin Bridge; Broadcast approved public bulletins.; Copy Bulletin Message; Share to WhatsApp; No public bulletin ready; Output only; No internal tools; No WhatsApp scraping
- Empty/stale state: No public bulletin ready.
- Recovery path: Post/approve a public bulletin first, return to bridge, copy message or share manually.
- Screenshot: screenshots/2026-09-13_bulletin-bridge.png
- Verification evidence: WhatsApp Bridge contract audit passed from frontend directory.

## F018 - GS ID / GSN ID assignment and display

- Product status: `LIVE`
- Setup requirement: `NONE`
- Behaviour type: `SYSTEM_DERIVES_OR_UPDATES`
- Source data: User/community identity records and approval/activation flow.
- Prerequisites: Account/member record exists and approval/activation produced an ID.
- Dependencies: Entry, join approvals, profile, public shop/trust routes.
- Permissions: User views own ID; public surfaces expose only public-safe ID where designed.
- Exact route(s): `/app/my-gmfn-and-i; /app/dashboard; /app/community; /shop/:gmfnId`
- Exact visible labels: GSN ID; GSN ID visible; Trust Identity
- Empty/stale state: No community ID yet or no GSN ID yet until activation/record creation completes.
- Recovery path: Complete activation/join approval/profile setup; ask owner/admin if ID not issued.
- Screenshot: screenshots/2026-09-13_shop-control.png
- Verification evidence: App labels/source and join approval source; tests cover approval issuing GSN ID.

## F019 - Shop Control automatic status and owner board

- Product status: `LIVE`
- Setup requirement: `NONE`
- Behaviour type: `SYSTEM_DERIVES_OR_UPDATES`
- Source data: Shop, product slots, Vault offers, Spotlight state, follower count, share/attention events, trade records.
- Prerequisites: Shop exists; richer reading needs activity.
- Dependencies: Shop Control, marketplace analytics summary, attention spine, product and broadcast records.
- Permissions: Shop owner only for analytics/management; public shop shows public-safe face.
- Exact route(s): `/app/shop-control`
- Exact visible labels: Shop Control; Analytics; Public Items; Vault; Spotlights; Followers; Shared links; Visitors; Product opens; Contact taps
- Empty/stale state: No active spotlight; no followers yet; no tracked share action yet; no source breakdown yet.
- Recovery path: Create public items, publish/share, wait for activity, then reopen Analytics; correct source records in owning feature.
- Screenshot: screenshots/2026-09-13_shop-control.png
- Verification evidence: Shop Control button inventory and Spotlight system feed audits passed.

## F020 - Business Analytics and Advanced Analytics snapshot

- Product status: `PARTIAL`
- Setup requirement: `NONE`
- Behaviour type: `SYSTEM_DERIVES_OR_UPDATES`
- Source data: Shop activity, Spotlight, DemandBox, trade evidence, follower notices, selected community context.
- Prerequisites: Shop and some measurable activity; advanced reading becomes useful as evidence grows.
- Dependencies: Marketplace analytics API, Shop Control analytics panels, shopAnalyticsWisdom, Attention Spine.
- Permissions: Shop owner; public users do not see owner analytics.
- Exact route(s): `/app/shop-control#shop-control-summary`
- Exact visible labels: Business Analytics; Advanced Analytics; Market Intelligence; Advanced Analytics snapshot; Evidence first, next test second; Contact taps
- Empty/stale state: Gathering data; no protected trade record; no source breakdown; no tracked share action.
- Recovery path: Publish/share/post demand, record outcomes, close loops, then recheck; do not treat early readings as proof.
- Screenshot: screenshots/2026-09-13_shop-control.png
- Verification evidence: Spotlight system feed audit verifies Advanced Analytics/Opportunity snapshot inside Shop Control analytics.

## F021 - Market Wisdom

- Product status: `LIVE`
- Setup requirement: `NONE`
- Behaviour type: `SYSTEM_DERIVES_OR_UPDATES`
- Source data: Public/backend daily insight, local fallback weighted by identity, support pressure, unread activity, trust pressure, Spotlight and time of day.
- Prerequisites: None for public insight; signed-in context improves smart fallback.
- Dependencies: daily_insight API, Dashboard, Marketplace wisdom lens, marketWisdom frontend library.
- Permissions: Public daily insight route; signed-in dashboard can use local context.
- Exact route(s): `/app/dashboard; /app/marketplace; /public/daily-insight`
- Exact visible labels: Market Wisdom; Your Market Wisdom; Market; GSN; Guide; Now
- Empty/stale state: Backend insight can fall back to local smart wisdom; no proof/guarantee implied.
- Recovery path: Refresh Dashboard, check backend route/connectivity, use Focus Commitments when relevant.
- Screenshot: screenshots/2026-09-13_dashboard.png
- Verification evidence: Market Wisdom contract audit passed; market_wisdom_engine tests passed.

## F022 - TrustEvents and TrustTimeline

- Product status: `LIVE`
- Setup requirement: `NONE`
- Behaviour type: `SYSTEM_DERIVES_OR_UPDATES`
- Source data: Recorded community, support, repayment, confirmation, shop/trade, focus, and admin-reviewed evidence events.
- Prerequisites: Actions/evidence must be recorded by live features or authorized admin/manual event paths.
- Dependencies: Trust event routes, TrustTimeline, evidence pack, TrustPassport/TrustSlip readings.
- Permissions: Signed-in user for own timeline; admin routes for manual/admin review.
- Exact route(s): `/app/trust-timeline; /app/command-center/trust-events`
- Exact visible labels: Trust Events; Latest event context; TrustTimeline; Admin Trust Events
- Empty/stale state: No trust events yet or no recent event visible yet.
- Recovery path: Record real activity in owning feature, ask admin/reviewer to correct authorized evidence, or use Identity/Trust recovery.
- Screenshot: Not captured in this pass
- Verification evidence: Trust route ownership/evidence pack tests passed; admin trust event routes present.

## F023 - TrustPassport

- Product status: `LIVE`
- Setup requirement: `NONE`
- Behaviour type: `SYSTEM_DERIVES_OR_UPDATES`
- Source data: Identity, membership, TrustEvents, community confirmations, repayment/support and evidence-pack summaries.
- Prerequisites: Member account and real recorded evidence.
- Dependencies: Trust page, trust score/CCI/explainability routes, evidence pack, TrustSlip.
- Permissions: Private/signed-in fuller personal record; public verifier does not get private passport content.
- Exact route(s): `/app/trust; /trust-passport redirect to /app/trust`
- Exact visible labels: Trust Passport; Open Trust Passport; fuller personal/private record
- Empty/stale state: No trust events yet or evidence still building.
- Recovery path: Correct source evidence, add missing confirmation/identity records, wait for refresh, or use TrustSlip refresh for public proof.
- Screenshot: screenshots/2026-09-13_trust-passport.png
- Verification evidence: Public TrustSlip verify boundary passed; trust route/evidence tests passed.

## F024 - TrustGraph and Trust Analytics admin views

- Product status: `ADMIN_ONLY`
- Setup requirement: `NONE`
- Behaviour type: `SYSTEM_DERIVES_OR_UPDATES`
- Source data: TrustEvents, community/member relationships, exposure/analytics records.
- Prerequisites: Admin/platform permission and existing evidence.
- Dependencies: Command Center admin routes, trust graph/trust analytics APIs.
- Permissions: Admin/platform admin only.
- Exact route(s): `/app/command-center/trust-graph; /app/command-center/trust-analytics`
- Exact visible labels: Trust Graph; Trust Analytics
- Empty/stale state: No relationship/evidence data yet or admin access unavailable.
- Recovery path: Use admin Command Center after permission; correct source events instead of editing graph interpretation directly.
- Screenshot: Not captured in this pass
- Verification evidence: APP_ROUTES TRUST_GRAPH/TRUST_ANALYTICS; backend trust_graph/admin routes present.

## F025 - Notifications and phone Web Push

- Product status: `PARTIAL`
- Setup requirement: `OPTIONAL_CONFIGURATION`
- Behaviour type: `SYSTEM_DERIVES_OR_UPDATES`
- Source data: Notice board events, notification rows, service worker subscription, configured push keys, device permission.
- Prerequisites: Browser/device permits notifications and production push environment is configured.
- Dependencies: Notifications page, web push service worker, backend web_push routes, official-board push boundary.
- Permissions: Signed-in user/device consent; community notice permission for sender.
- Exact route(s): `/app/notifications; service worker; web-push API`
- Exact visible labels: Notifications; Action Inbox; Web Push
- Empty/stale state: Notification rows may exist while phone sound/vibration does not happen if browser permission/config missing.
- Recovery path: Install/permit PWA/browser notifications, verify environment keys, open Action Inbox fallback.
- Screenshot: Not captured in this pass
- Verification evidence: Web Push production readiness audit and web_push_notifications tests passed.

## F026 - Opportunity / Market Intelligence capability

- Product status: `EXPERIMENTAL`
- Setup requirement: `NONE`
- Behaviour type: `CONDITIONALLY_UNLOCKED`
- Source data: Shop, I Can Help With/capability signals where available, DemandBox needs, Ask Community, Spotlight attention, Repost, Shop Control analytics, Market Wisdom, trust/evidence context.
- Prerequisites: Foundational shop/community/evidence setup plus enough activity and permission to read it.
- Dependencies: Shop Control Advanced Analytics, Market Intelligence, Attention Spine, DemandBox, Market Wisdom.
- Permissions: Owner-facing analytics only; no private graph logic exposed.
- Exact route(s): `/app/shop-control#shop-control-summary; /app/marketplace; /app/demand-box`
- Exact visible labels: Opportunity Engine / Market Intelligence; Advanced Analytics snapshot; Opportunity reading; Recommended next move; Ask Community; Open DemandBox
- Empty/stale state: Advanced Analytics shows gathering-data/evidence-first states and blocks wider guidance until records exist.
- Recovery path: Add a real offer, publish/share, post or answer DemandBox items, close outcomes, and recheck after evidence grows.
- Screenshot: screenshots/2026-09-13_shop-control.png
- Verification evidence: Advanced Analytics brief; Spotlight system feed audit verifies Opportunity snapshot under existing analytics, not standalone engine.
