# GSN Dependency and Setup Map

Audit date: 2026-09-13

## Setup Chain

1. Account/profile and identity record.
2. Create or join at least one community.
3. For selling: configure Shop, contact path, products/services, media, and optional Vault.
4. For attention: publish/share Spotlight, public shop, bulletin, or DemandBox request.
5. For evidence: complete real actions, confirmations, repayments/trades/support records, and then use TrustPassport/TrustSlip/analytics readings.

## Feature Dependencies

### A. What the user must set up or create

- **Member account, profile, and personal GSN identity**: needs User must create or sign in to an account. Feeds/dependencies: Auth routes, entry verification routes, profile page, selected community state.
- **Create community or join existing community**: needs Signed-in member and invite or owner intent to create. Feeds/dependencies: Community Home, Clans/invite routes, join requests, admin review policy.
- **Community Domain setup and administration**: needs Existing community or owner authority; domain name/template choice. Feeds/dependencies: Community Domain purchase/dashboard, community domain API, package/payment instructions, governance policy.
- **Community Bulletin / official notice board**: needs Selected community; posting permission according to notice policy. Feeds/dependencies: Community Home, Community Notices API, review queue, public notice route, Web Push where configured.
- **Shop setup**: needs Signed-in member with community membership and shop feature enabled. Feeds/dependencies: Marketplace shop routes, Shop Control, public shop, feature policy.
- **Product/service public blocks and images**: needs Shop exists; media meets file rules; public slots available. Feeds/dependencies: Shop Assets, Marketplace products API, media upload route, public shop rendering.
- **Contact information for shop and DemandBox**: needs User consents to show a contact path for shop/request. Feeds/dependencies: Shop Control, DemandBox, public shop, WhatsApp link helper.
- **Private Vault offers and access links**: needs Shop and at least one private offer. Feeds/dependencies: Vault Control, vault access API, marketplace products private visibility.
- **Free Spotlight publisher**: needs Shop exists, product/media/message eligible, daily free quota available. Feeds/dependencies: Shop Control Spotlight workflow, Marketplace broadcast API, Dashboard/Public Shop feed.
- **Subscription Spotlight and paid Network Repost**: needs Shop/product exists; payment/credit instruction generated and usable credit confirmed. Feeds/dependencies: Subscription Spotlight page, payment instructions, marketplace repost action, spotlight credit/status API.

### B. What the user does only when needed

- **Share public shop, product, Spotlight, or bulletin link**: needs A public output must already exist. Feeds/dependencies: Public links/share helpers, QR/public routes, route-specific copy/share buttons.
- **QR and public verification links**: needs Underlying public record exists and is current. Feeds/dependencies: QR component, public frontend/API origin, trust/public routes.
- **DemandBox post, response, close, and cancellation**: needs Signed-in member and selected community; DemandBox feature enabled. Feeds/dependencies: Marketplace request API, DemandBox page, Dashboard DemandBox preview.
- **Ask Community through DemandBox**: needs Signed-in member and selected community; DemandBox enabled. Feeds/dependencies: DemandBox modal, createMarketplaceRequest API, not Community Notice engine.
- **TrustSlip generation, sharing, and recipient verification**: needs Holder has account and enough eligible evidence for requested purpose/context. Feeds/dependencies: TrustSlip page, trust slip APIs, public verify page, TrustPassport/private evidence boundary.
- **Community confirmation and witness response**: needs Public TrustSlip/community evidence context and configured response permissions. Feeds/dependencies: Community confirmation APIs, public confirmation route, inbox/policy route.
- **Community Domain Bulletin Bridge**: needs A public Community Domain bulletin/notice already exists. Feeds/dependencies: Community notices list, public notice URL builder, WhatsApp/share helper.

### C. What GSN produces or updates automatically

- **GS ID / GSN ID assignment and display**: needs Account/member record exists and approval/activation produced an ID. Feeds/dependencies: Entry, join approvals, profile, public shop/trust routes.
- **Shop Control automatic status and owner board**: needs Shop exists; richer reading needs activity. Feeds/dependencies: Shop Control, marketplace analytics summary, attention spine, product and broadcast records.
- **Business Analytics and Advanced Analytics snapshot**: needs Shop and some measurable activity; advanced reading becomes useful as evidence grows. Feeds/dependencies: Marketplace analytics API, Shop Control analytics panels, shopAnalyticsWisdom, Attention Spine.
- **Market Wisdom**: needs None for public insight; signed-in context improves smart fallback. Feeds/dependencies: daily_insight API, Dashboard, Marketplace wisdom lens, marketWisdom frontend library.
- **TrustEvents and TrustTimeline**: needs Actions/evidence must be recorded by live features or authorized admin/manual event paths. Feeds/dependencies: Trust event routes, TrustTimeline, evidence pack, TrustPassport/TrustSlip readings.
- **TrustPassport**: needs Member account and real recorded evidence. Feeds/dependencies: Trust page, trust score/CCI/explainability routes, evidence pack, TrustSlip.
- **TrustGraph and Trust Analytics admin views**: needs Admin/platform permission and existing evidence. Feeds/dependencies: Command Center admin routes, trust graph/trust analytics APIs.
- **Notifications and phone Web Push**: needs Browser/device permits notifications and production push environment is configured. Feeds/dependencies: Notifications page, web push service worker, backend web_push routes, official-board push boundary.

### D. Advanced opportunity capabilities after foundations/evidence/permissions

- **Opportunity / Market Intelligence capability**: needs Foundational shop/community/evidence setup plus enough activity and permission to read it. Feeds/dependencies: Shop Control Advanced Analytics, Market Intelligence, Attention Spine, DemandBox, Market Wisdom.

## Main Dependency Flow

```text
Account/Profile -> Community membership -> Shop/Contact/Product setup -> Share/Spotlight/DemandBox/Bulletin actions -> TrustEvents/attention records -> TrustPassport/TrustSlip/Analytics/Market Wisdom -> Opportunity/Market Intelligence suggestions
```
