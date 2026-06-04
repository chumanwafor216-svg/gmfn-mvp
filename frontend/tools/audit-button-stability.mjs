/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

const findings = [];

function assertContains(file, pattern, message) {
  const text = read(file);
  if (!pattern.test(text)) {
    findings.push({ file, message, text: "Expected pattern was not found." });
  }
}

function assertNotContains(file, pattern, message) {
  const text = read(file);
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (pattern.test(line)) {
      findings.push({ file, line: index + 1, message, text: line.trim() });
    }
  });
}

assertContains(
  "src/lib/appRoutes.ts",
  /export const APP_ROUTES =[\s\S]*?DASHBOARD:[\s\S]*?COMMUNITY:[\s\S]*?MARKETPLACE:[\s\S]*?MONEY_IN:[\s\S]*?MONEY_OUT:[\s\S]*?PAYOUT_DETAILS:[\s\S]*?PAYMENT_RAILS:[\s\S]*?TRUST_SLIP:[\s\S]*?MERCHANT_VERIFY:[\s\S]*?LOAN_WORKBENCH:[\s\S]*?LOAN_SUMMARY:[\s\S]*?GUARANTOR_INBOX:[\s\S]*?NOTIFICATIONS:[\s\S]*?BUILD_FIRST_CIRCLE:[\s\S]*?ADMIN_COMMAND:[\s\S]*?SYSTEM_OPERATIONS:[\s\S]*?BANK_CONSOLE:[\s\S]*?INCOMPLETE_LOANS:[\s\S]*?IDENTITY_RISK:[\s\S]*?TRUST_ANALYTICS:[\s\S]*?TRUST_GRAPH:[\s\S]*?EXPOSURE_ADMIN:/,
  "Important app destinations must live in the shared route registry."
);

assertContains(
  "src/lib/ctaTargets.ts",
  /export function resolveCtaTarget[\s\S]*?export function navigateToCta[\s\S]*?debugCtaResolution/,
  "CTA target resolution, origin-aware navigation, and debug logging must stay centralized."
);

assertContains(
  "src/components/StableButton.tsx",
  /function stableStyle[\s\S]*?const fixedHeight = typeof args\.stableHeight === "number" \? args\.stableHeight : undefined;[\s\S]*?minHeight: fixedHeight \?\? base\.minHeight,[\s\S]*?height: fixedHeight,[\s\S]*?maxHeight: fixedHeight,[\s\S]*?export function StableButton[\s\S]*?inFlight[\s\S]*?const softDisabled =[\s\S]*?aria-disabled[\s\S]*?const resolvedStyle = useMemo[\s\S]*?const guardedPointerDown = useMemo[\s\S]*?const guardedPointerUp = useMemo[\s\S]*?const handleClick = useCallback[\s\S]*?const customClick = Boolean\(onClick\);[\s\S]*?if \(locked \|\| inFlight\.current\)[\s\S]*?event\.preventDefault\(\);[\s\S]*?if \(type !== "submit" \|\| customClick\)[\s\S]*?event\.preventDefault\(\);[\s\S]*?aria-disabled=\{locked \|\| softDisabled \|\| undefined\}[\s\S]*?tabIndex=\{locked \? -1 : tabIndex\}[\s\S]*?onPointerDown=\{guardedPointerDown\}[\s\S]*?onPointerUp=\{guardedPointerUp\}[\s\S]*?style=\{resolvedStyle\}[\s\S]*?export function StableCtaLink[\s\S]*?const softDisabled =[\s\S]*?aria-disabled[\s\S]*?const resolvedStyle = useMemo[\s\S]*?const guardedPointerDown = useMemo[\s\S]*?aria-disabled=\{locked \|\| softDisabled \|\| undefined\}[\s\S]*?onPointerDown=\{guardedPointerDown\}[\s\S]*?onPointerUp=\{guardedPointerUp\}[\s\S]*?style=\{resolvedStyle\}[\s\S]*?export function PrimaryButton[\s\S]*?export function SecondaryButton[\s\S]*?export function SubtleButton[\s\S]*?export function DangerButton[\s\S]*?export function CardActionRow[\s\S]*?export function StableDisclosureSummary[\s\S]*?onPointerUp=\{\(event\) => \{[\s\S]*?stopTap\(event\);/,
  "Shared button primitives must include duplicate-click protection, guarded default-action prevention that preserves plain submit buttons, guarded aria-disabled state, pointer-down/up tap guards, link support, stable action rows, and stable disclosure summaries."
);

assertContains(
  "src/components/StableButton.tsx",
  /const stableMovementLock: React\.CSSProperties = \{[\s\S]*?transform: "none"[\s\S]*?transition: "none"[\s\S]*?overflowAnchor: "none"[\s\S]*?function stableStyle[\s\S]*?\.\.\.stableMovementLock,[\s\S]*?\.\.\.args\.style,[\s\S]*?\.\.\.stableMovementLock/,
  "Shared stable actions must reapply movement locks after caller styles without wrapping complex child layouts."
);

assertContains(
  "src/components/StableButton.tsx",
  /function stableStyle[\s\S]*?overflowWrap: "normal"[\s\S]*?wordBreak: "normal"[\s\S]*?hyphens: "none"[\s\S]*?textOverflow: "ellipsis"/,
  "Shared stable actions must not split button labels inside words; they should wrap at word boundaries and clip cleanly."
);

assertContains(
  "src/styles/gmfnBrand.ts",
  /const stableButtonText: React\.CSSProperties = \{[\s\S]*?overflowWrap: "normal"[\s\S]*?wordBreak: "normal"[\s\S]*?hyphens: "none"[\s\S]*?textOverflow: "ellipsis"/,
  "Brand action button styles must keep button words intact across pages."
);

assertNotContains(
  "src/components/StableButton.tsx",
  /stableContentStyle|<span style=\{stableContentStyle\}>/,
  "Stable actions must not wrap all children in a generic inline-flex content span because complex CTA card layouts collapse on mobile."
);

assertContains(
  "src/components/OriginLink.tsx",
  /onPointerDown=\{\(event\) => guardLinkTap\(event, rest\.onPointerDown\)\}[\s\S]*?onPointerUp=\{\(event\) => guardLinkTap\(event, rest\.onPointerUp\)\}[\s\S]*?onMouseDown=\{\(event\) => guardLinkTap\(event, rest\.onMouseDown\)\}[\s\S]*?onClick=\{\(event\) => guardLinkTap\(event, rest\.onClick\)\}[\s\S]*?<Link[\s\S]*?onPointerDown=\{\(event\) => guardLinkTap\(event, rest\.onPointerDown\)\}[\s\S]*?onPointerUp=\{\(event\) => guardLinkTap\(event, rest\.onPointerUp\)\}[\s\S]*?onMouseDown=\{\(event\) => guardLinkTap\(event, rest\.onMouseDown\)\}[\s\S]*?onClick=\{\(event\) => \{[\s\S]*?guardLinkTap\(event, rest\.onClick\);[\s\S]*?if \(!event\.defaultPrevented\) \{[\s\S]*?rememberAppRouteRecovery\(nextTo, linkDebugId\);[\s\S]*?\}[\s\S]*?\}\}/,
  "OriginLink must guard pointer-down, pointer-up, mouse-down, and click for both external anchors and React Router links."
);

assertNotContains(
  "src/components/StableButton.tsx",
  /disabled=\{locked\}/,
  "StableButton must not use native disabled because dead controls can let parent card clicks win on mobile."
);

assertContains(
  "src/components/uiKit.tsx",
  /import \{ PrimaryButton, StableButton \} from "\.\/StableButton";[\s\S]*?export function Button[\s\S]*?<StableButton[\s\S]*?export function ButtonPrimary[\s\S]*?<PrimaryButton/,
  "Legacy uiKit button exports must delegate to the shared stable button primitives."
);

assertNotContains(
  "src/components/uiKit.tsx",
  /(<button|<\/button>|<a\s|OriginLink|buttonGuardProps|stableTapStyle|guardButtonPress|actionTapGuardProps)/,
  "uiKit must not keep a second raw button or local tap guard implementation."
);

assertContains(
  "src/App.tsx",
  /import \{ APP_ROUTES \} from "\.\/lib\/appRoutes";/,
  "The app shell must use the shared route registry instead of a local APP_ROUTES copy."
);

assertNotContains(
  "src/App.tsx",
  /const APP_ROUTES = \{/,
  "The app shell must not keep a second local route registry."
);

assertContains(
  "src/layout/AppLayout.tsx",
  /import \{ StableButton, StableCtaLink \} from "\.\.\/components\/StableButton";[\s\S]*?debugId="app-layout\.brand\.dashboard"[\s\S]*?debugId=\{`app-layout\.desktop-group\.\$\{group\.key\}\.toggle`\}[\s\S]*?debugId=\{`app-layout\.desktop-nav\.\$\{group\.key\}\.[\s\S]*?debugId="app-layout\.desktop\.logout"[\s\S]*?debugId="app-layout\.mobile\.open-navigation"[\s\S]*?debugId=\{`app-layout\.drawer\.[\s\S]*?debugId=\{`app-layout\.page-action\.[\s\S]*?debugId=\{`app-layout\.bottom-nav\./,
  "AppLayout must use shared stable primitives for shell brand, desktop nav, mobile drawer, page actions, bottom nav, and logout controls."
);

assertNotContains(
  "src/layout/AppLayout.tsx",
  /(<button|<\/button>|<a\s|OriginLink|layoutTapGuardProps|handleDisabledNavClick|actionTapGuardProps|brandStableTapTarget|stopActionTap)/,
  "AppLayout must not keep raw button/link primitives or local tap/action guards."
);

assertContains(
  "src/pages/CommunityHomePage.tsx",
  /import \{ StableButton \} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId=\{`community-home\.tool\.\$\{item\.id\}`\}[\s\S]*?debugId="community-home\.communities\.header-toggle"[\s\S]*?debugId=\{`community-home\.communities\.\$\{clan\.id \?\? clan\.clan_id \?\? clan\.name \?\? "unknown"\}\.open-marketplace`\}/,
  "Community Home must use the shared stable button primitive and shared CTA resolution for community selection, owner routes, and local action rows."
);

assertContains(
  "src/pages/CommunityHomePage.tsx",
  /import \{ brandClampLines, brandSingleLine \} from "\.\.\/styles\/gmfnBrand";[\s\S]*?function communityToolRowStyle\(\): React\.CSSProperties \{[\s\S]*?overflow: "hidden",[\s\S]*?overflowAnchor: "none",[\s\S]*?transform: "none",[\s\S]*?transition: "none",[\s\S]*?debugId="community-home\.finance-summary\.open"[\s\S]*?brandClampLines\(1\)[\s\S]*?brandClampLines\(2\)[\s\S]*?debugId="community-home\.trust-summary\.open"[\s\S]*?brandClampLines\(2\)/,
  "Community Home visible action rows must keep stable geometry and clamped text so labels cannot stretch, overlap, or create unstable tap targets."
);

assertNotContains(
  "src/pages/CommunityHomePage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|buttonGuardProps|communityButtonGuardProps|actionTapGuardProps|brandStableTapTarget|stableTapTarget|actionBtn\(|homeTo="\/app|backTo="\/app|to="\/app|withClanQuery\("\/app|openCommunityRoute\(event, "\/app|navigateWithOrigin\(navigate, `\/app|navigateWithOrigin\(navigate, "\/app)/,
  "Community Home must not keep raw buttons, raw links, page-local tap guard primitives, or hard-coded app route CTAs."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /import \{[\s\S]*?navigateToCta[\s\S]*?resolveCtaTarget[\s\S]*?type CtaIntent[\s\S]*?\} from "\.\.\/lib\/ctaTargets";[\s\S]*?function openMarketplaceCta[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?<StableButton[\s\S]*?Community Home[\s\S]*?<StableCtaLink[\s\S]*?Open shop[\s\S]*?Start Support Request/,
  "Marketplace must use shared stable primitives and shared CTA resolution for marketplace navigation, member/shop links, link desk actions, and support-request controls."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function marketplaceActionStyle[\s\S]*?height: 56,[\s\S]*?maxHeight: 56,[\s\S]*?function marketplaceOsTileStyle\(isCompact: boolean\): React\.CSSProperties \{[\s\S]*?height: isCompact \? 116 : 178,[\s\S]*?maxHeight: isCompact \? 116 : 178,[\s\S]*?gridTemplateColumns: isCompact \? "46px minmax\(0, 1fr\)" : "1fr"[\s\S]*?gridTemplateAreas[\s\S]*?icon title[\s\S]*?function marketplaceOsTileTitleStyle[\s\S]*?WebkitLineClamp: 2,[\s\S]*?function marketplaceOsTileMetricStyle[\s\S]*?WebkitLineClamp: isCompact \? 1 : 2,[\s\S]*?function marketplaceOsTileHelperStyle[\s\S]*?WebkitLineClamp: isCompact \? 1 : 2,[\s\S]*?function marketplaceOsRowStyle\(isCompact: boolean\): React\.CSSProperties \{[\s\S]*?height: isCompact \? 116 : 96,[\s\S]*?maxHeight: isCompact \? 116 : 96,[\s\S]*?transform: "none"[\s\S]*?flexShrink: 0[\s\S]*?transition: "none"[\s\S]*?function marketplaceOsRowDetailStyle[\s\S]*?WebkitLineClamp: isCompact \? 3 : 2,/,
  "Marketplace route/action tiles must keep fixed phone-safe heights with clamped text so card content cannot stretch, overlap, or create unstable tap targets."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function marketplaceMoneyRouteCardStyle\(isCompact: boolean\): React\.CSSProperties \{[\s\S]*?minHeight: isCompact \? 92 : 150[\s\S]*?gridTemplateColumns: isCompact[\s\S]*?"50px minmax\(0, 1fr\) auto"[\s\S]*?gridTemplateAreas: isCompact[\s\S]*?"icon text status"[\s\S]*?overflow: "hidden"[\s\S]*?overflowAnchor: "none"[\s\S]*?transform: "none"[\s\S]*?transition: "none"[\s\S]*?function marketplaceMoneyRouteValueStyle[\s\S]*?WebkitLineClamp: ready \? 2 : 1[\s\S]*?function marketplaceMoneyStatusPillStyle[\s\S]*?stableStatusPillStyle\(ready\)[\s\S]*?function marketplaceMoneyChartBubbleStyle/,
  "Marketplace money detail cards must keep fixed, clamped, phone-safe geometry so readiness text cannot stretch cards or create jumpy taps."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.network-repost\.place"[\s\S]*?stableHeight=\{58\}[\s\S]*?debugId="marketplace\.network-repost\.subscription"[\s\S]*?stableHeight=\{58\}/,
  "Marketplace paid network repost controls must keep stable fixed-height buttons inside Marketplace, not Public Shop."
);

assertContains(
  "src/components/OwnerOnlySurfaceNav.tsx",
  /const navGridTemplateColumns = compact[\s\S]*?repeat\(auto-fit, minmax\(78px, 1fr\)\)[\s\S]*?repeat\(auto-fit, minmax\(120px, 1fr\)\)[\s\S]*?gridTemplateColumns: navGridTemplateColumns/,
  "Owner/member surface navigation must wrap signed-in user links into stable cells instead of squeezing all buttons into one phone row."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /import \{[\s\S]*?marketplaceSectionStyle[\s\S]*?scrollElementToMarketplaceLanding[\s\S]*?traceMarketplaceLanding[\s\S]*?\} from "\.\.\/lib\/marketplaceActionStability";[\s\S]*?scrollTimeoutRefs[\s\S]*?cancelMarketplaceSectionScroll[\s\S]*?scrollElementToMarketplaceLanding[\s\S]*?traceMarketplaceLanding[\s\S]*?\[80, 180, 360, 720, 1200, 1800\]\.forEach[\s\S]*?marketplaceSectionStyle\(\)/,
  "Marketplace section buttons must use the shared Marketplace landing helper with repeated phone-safe landing passes and section scroll margins."
);

assertNotContains(
  "src/pages/MarketplacePage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|marketplacePointerGuardProps|marketplaceButtonGuardProps|actionTapGuardProps|brandStableTapTarget|stableTapTarget|actionBtn\(|aria-disabled=|withClanQuery\(|openMarketplaceRoute\(event, "\/app|to: "\/app)/,
  "Marketplace must not keep raw buttons, raw links, page-local tap guards, aria-only disabled controls, or local hard-coded app route CTAs."
);

assertContains(
  "src/pages/DashboardPage.tsx",
  /import \{ StableButton, StableDisclosureSummary \} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?<StableDisclosureSummary[\s\S]*?debugId="dashboard\.trust-detail\.toggle"[\s\S]*?<StableButton[\s\S]*?Your Market Wisdom[\s\S]*?Open Focus Commitments/,
  "Dashboard must use shared stable button primitives and shared CTA resolution for patched route-sensitive actions while preserving the frozen Market Wisdom presentation and route behavior."
);

assertNotContains(
  "src/pages/DashboardPage.tsx",
  /(<button|<\/button>|<a\s|<summary|<\/summary>|OriginLink|dashboardButtonGuardProps|buttonGuardProps|actionTapGuardProps|brandStableTapTarget|stableTapTarget|actionBtn\(|to="\/app|homeTo="\/app|backTo="\/app|navigate\("\/app|navigateWithOrigin\(navigate, "\/app|ctaTo: "\/app|ctaTo: `\/app)/,
  "Dashboard must not keep raw buttons, raw summaries, raw links, page-local tap guard primitives, or direct hard-coded app route CTAs."
);

assertContains(
  "src/pages/CoverPage.tsx",
  /import \{ PrimaryButton, SecondaryButton \} from "\.\.\/components\/StableButton";[\s\S]*?debugId="cover\.continue"[\s\S]*?debugId="cover\.about-gsn"/,
  "Cover page public entry actions must use shared stable button primitives."
);

assertNotContains(
  "src/pages/CoverPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|buttonGuardProps|stableTapStyle|guardButtonPress)/,
  "Cover page must not keep raw button/link or local tap guard primitives."
);

assertContains(
  "src/pages/LoginPage.tsx",
  /import \{ PrimaryButton, SecondaryButton, SubtleButton \} from "\.\.\/components\/StableButton";/,
  "Login page must import shared stable button primitives for guide, submit, create, and activation actions."
);

[
  "login.open-help",
  "login.guide.collapse",
  "login.error.activate-membership",
  "login.submit",
  "login.start-community",
  "login.activate-approved",
].forEach((debugId) => {
  assertContains(
    "src/pages/LoginPage.tsx",
    new RegExp(`debugId="${debugId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`),
    `Login page must keep stable CTA debug id ${debugId}.`
  );
});

assertNotContains(
  "src/pages/LoginPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|buttonGuardProps|stableTapStyle|guardButtonPress)/,
  "Login page must not keep raw button/link or local tap guard primitives."
);

assertContains(
  "src/login.tsx",
  /import \{ PrimaryButton \} from "\.\/components\/StableButton";[\s\S]*?debugId="legacy-login\.submit"/,
  "Legacy login entry must use the shared stable button primitive for submit."
);

assertNotContains(
  "src/login.tsx",
  /(<button|<\/button>|<a\s|OriginLink|buttonGuardProps|stableTapStyle|guardButtonPress)/,
  "Legacy login entry must not keep raw button/link or local tap guard primitives."
);

assertContains(
  "src/pages/CreateEntryPage.tsx",
  /import \{ PrimaryButton, SecondaryButton \} from "\.\.\/components\/StableButton";[\s\S]*?debugId="create-entry\.existing-member\.toggle"[\s\S]*?debugId="create-entry\.existing-member\.sign-in"[\s\S]*?debugId="create-entry\.guide\.done"[\s\S]*?debugId="create-entry\.details\.submit"[\s\S]*?debugId="create-entry\.verification\.confirm-code"[\s\S]*?debugId="create-entry\.bank\.save"[\s\S]*?debugId="create-entry\.community\.submit"/,
  "Create entry must use shared stable button primitives across existing-member, guide, details, verification, bank, and final submit actions."
);

assertContains(
  "src/pages/CreateEntryPage.tsx",
  /function fieldLabelOnDark[\s\S]*?color: "#D7E3F1"[\s\S]*?function entryActionRowStyle\(height = 56\)[\s\S]*?gridAutoRows: `\$\{height\}px`[\s\S]*?overflowAnchor: "none"[\s\S]*?function entryActionStyle\(height = 56\)[\s\S]*?height,[\s\S]*?maxHeight: height[\s\S]*?function otpDigits[\s\S]*?replace\(\/\\D\/g, ""\)\.slice\(0, 8\)[\s\S]*?const normalizedOtpCode = otpDigits\(otpCode\)[\s\S]*?code: normalizedOtpCode[\s\S]*?inputMode="numeric"[\s\S]*?autoComplete="one-time-code"[\s\S]*?name="entry-phone-code"[\s\S]*?style=\{entryActionRowStyle\(56\)\}[\s\S]*?stableHeight=\{56\}[\s\S]*?debugId="create-entry\.verification\.confirm-code"/,
  "Create entry phone-code controls must reject phone autofill leakage, keep the verification label readable on the dark panel, and use fixed-height action geometry."
);

assertNotContains(
  "src/pages/CreateEntryPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|buttonGuardProps|stableTapStyle|guardButtonPress)/,
  "Create entry must not keep raw button/link or local tap guard primitives."
);

assertContains(
  "src/IdentityImageBlock.tsx",
  /import \{ CardActionRow, DangerButton, PrimaryButton, SecondaryButton \} from "\.\/components\/StableButton";[\s\S]*?debugId="identity-image\.upload"[\s\S]*?debugId="identity-image\.camera"[\s\S]*?debugId="identity-image\.change"[\s\S]*?debugId="identity-image\.remove"/,
  "Identity image controls must use shared stable button primitives."
);

assertNotContains(
  "src/IdentityImageBlock.tsx",
  /(<button|<\/button>|<a\s|OriginLink|buttonGuardProps|stableTapStyle|guardButtonPress)/,
  "Identity image controls must not keep raw button/link or local tap guard primitives."
);

assertContains(
  "src/pages/JoinEntryPage.tsx",
  /import \{[\s\S]*?CardActionRow[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?StableCtaLink[\s\S]*?\} from "\.\.\/components\/StableButton";/,
  "Join entry must use shared stable CTA primitives for invite buttons."
);

assertNotContains(
  "src/pages/JoinEntryPage.tsx",
  /function (primaryBtn|secondaryLink|buttonGuardProps)\(/,
  "Join entry must not keep local button primitives after migration."
);

assertContains(
  "src/pages/MarketplaceWorkspacePage.tsx",
  /import \{[\s\S]*?CardActionRow[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?StableCtaLink[\s\S]*?SubtleButton[\s\S]*?\} from "\.\.\/components\/StableButton";[\s\S]*?getAccessToken[\s\S]*?resolveCtaTarget[\s\S]*?function workspaceCtaPath[\s\S]*?function workspaceActionRowStyle[\s\S]*?gridAutoRows: "58px"[\s\S]*?function workspaceActionStyle[\s\S]*?height: 58/,
  "Marketplace workspace must use shared stable CTA primitives and shared CTA target resolution."
);

assertNotContains(
  "src/pages/MarketplaceWorkspacePage.tsx",
  /function (btn|buttonGuardProps)\(/,
  "Marketplace workspace must not keep local button primitives after migration."
);

assertContains(
  "src/pages/JoinRequestPendingPage.tsx",
  /import \{ CardActionRow, StableCtaLink \} from "\.\.\/components\/StableButton";[\s\S]*?resolveCtaTarget/,
  "Join pending must use shared stable CTA primitives and shared CTA target resolution."
);

assertNotContains(
  "src/pages/JoinRequestPendingPage.tsx",
  /function actionBtn\(/,
  "Join pending must not keep a local action button helper after migration."
);

assertContains(
  "src/pages/JoinApprovalPage.tsx",
  /import \{[\s\S]*?CardActionRow[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?StableCtaLink[\s\S]*?\} from "\.\.\/components\/StableButton";[\s\S]*?resolveCtaTarget[\s\S]*?navigateToCta/,
  "Join approval must use shared stable CTA primitives and shared CTA target resolution."
);

assertNotContains(
  "src/pages/JoinApprovalPage.tsx",
  /function (actionBtn|stableTapStyle|consumeActionEvent)\(/,
  "Join approval must not keep local button/tap primitives after migration."
);

assertContains(
  "src/pages/CommunityJoinRequestsPage.tsx",
  /import \{[\s\S]*?CardActionRow[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?StableCtaLink[\s\S]*?\} from "\.\.\/components\/StableButton";[\s\S]*?resolveCtaTarget[\s\S]*?navigateToCta/,
  "Community join requests must use shared stable CTA primitives and shared CTA target resolution."
);

assertNotContains(
  "src/pages/CommunityJoinRequestsPage.tsx",
  /function (actionBtn|stableTapStyle|consumeActionEvent|withClanQuery)\(/,
  "Community join requests must not keep local button/tap/route helper primitives after migration."
);

assertContains(
  "src/components/CommunityMarketplaceSpotlight.tsx",
  /import \{[\s\S]*?CardActionRow[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?StableCtaLink[\s\S]*?\} from "\.\/StableButton";[\s\S]*?resolveCtaTarget[\s\S]*?primaryCta/,
  "Community Marketplace Spotlight must bind dynamic live items to shared CTA primitives and shared CTA target resolution."
);

assertNotContains(
  "src/components/CommunityMarketplaceSpotlight.tsx",
  /(import OriginLink|function btn\(|function withClanQuery\(|<button|<a\s)/,
  "Community Marketplace Spotlight must not keep local buttons, anchors, or route helper primitives after migration."
);

assertContains(
  "src/components/PageTopNav.tsx",
  /import \{ StableCtaLink \} from "\.\/StableButton";[\s\S]*?<StableCtaLink[\s\S]*?debugId=\{`page-top-nav\.\$\{kind\}\.\$\{item\.label/,
  "PageTopNav route links must render through the shared stable CTA link primitive."
);

assertNotContains(
  "src/components/PageTopNav.tsx",
  /(import OriginLink|function actionBtn\(|<button|<a\s|brandStableTapTarget)/,
  "PageTopNav must not keep local link/button/tap-target primitives after migration."
);

assertContains(
  "src/components/ShareActions.tsx",
  /import \{ CardActionRow, PrimaryButton, SecondaryButton \} from "\.\/StableButton";[\s\S]*?debugId="share-actions\.copy-link"[\s\S]*?debugId="share-actions\.whatsapp"/,
  "ShareActions must use shared stable button primitives for copy and WhatsApp actions."
);

assertNotContains(
  "src/components/ShareActions.tsx",
  /(function btnStyle\(|function btnPrimaryStyle\(|<button|<a\s)/,
  "ShareActions must not keep local button primitives after migration."
);

assertContains(
  "src/components/ShareButtons.tsx",
  /import \{[\s\S]*?CardActionRow[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?SubtleButton[\s\S]*?\} from "\.\/StableButton";[\s\S]*?debugId="share-buttons\.copy-link"[\s\S]*?debugId="share-buttons\.whatsapp"[\s\S]*?debugId="share-buttons\.copy-text"[\s\S]*?debugId="share-buttons\.qr"[\s\S]*?debugId="share-buttons\.close-qr"/,
  "ShareButtons must use shared stable button primitives for copy, WhatsApp, QR, and modal close actions."
);

assertNotContains(
  "src/components/ShareButtons.tsx",
  /(function btnStyle\(|<button|<a\s)/,
  "ShareButtons must not keep local button primitives after migration."
);

assertContains(
  "src/pages/MemberActivationPage.tsx",
  /import \{[\s\S]*?CardActionRow[\s\S]*?PrimaryButton[\s\S]*?StableCtaLink[\s\S]*?SubtleButton[\s\S]*?\} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\(intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="member-activation\.finish"[\s\S]*?debugId="member-activation\.build-first-circle"[\s\S]*?debugId="member-activation\.trust"[\s\S]*?debugId="member-activation\.notifications"/,
  "Member activation must use shared stable button primitives and shared CTA resolution for guide, submit, and post-activation route actions."
);

assertNotContains(
  "src/pages/MemberActivationPage.tsx",
  /(import OriginLink|function (primaryBtn|secondaryBtn|stableTapStyle|buttonGuardProps|guideAboutBtn|guideMainBtn)\(|<button|<a\s|to="\/app|navigate\("\/app)/,
  "Member activation must not keep local button/tap/link primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/ActivateMembershipPage.tsx",
  /import \{ CardActionRow, PrimaryButton, SecondaryButton \} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\(intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="activate-membership\.activate"[\s\S]*?debugId="activate-membership\.clear-password"/,
  "Legacy activation page must use shared stable button primitives and shared CTA resolution if it is reintroduced."
);

assertNotContains(
  "src/pages/ActivateMembershipPage.tsx",
  /(function (primaryBtn|secondaryBtn|stableTapStyle|buttonGuardProps)\(|<button|<a\s|navigate\("\/app|to="\/app)/,
  "Legacy activation page must not keep local button/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/components/RequireAuth.tsx",
  /import \{ CardActionRow, StableCtaLink \} from "\.\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\(intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="require-auth\.admin-denied\.dashboard"[\s\S]*?debugId="require-auth\.admin-denied\.community"[\s\S]*?debugId="require-auth\.continuity\.identity"[\s\S]*?debugId="require-auth\.continuity\.dashboard"/,
  "RequireAuth denied/continuity recovery actions must use shared stable CTA link primitives and shared CTA resolution."
);

assertNotContains(
  "src/components/RequireAuth.tsx",
  /(import \{ Link|function actionBtn\(|<button|<a\s|to="\/app)/,
  "RequireAuth must not keep local link/button primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/components/EntryControls.tsx",
  /import \{ StableButton, StableCtaLink \} from "\.\/StableButton";[\s\S]*?export function EntryActionButton[\s\S]*?<StableButton[\s\S]*?debugId=\{debugId\}[\s\S]*?export function EntryBackLink[\s\S]*?<StableCtaLink[\s\S]*?debugId="entry-controls\.back"[\s\S]*?debugId="entry-controls\.guide-compact"[\s\S]*?debugId="entry-controls\.guide-label"[\s\S]*?debugId="entry-controls\.guide-main"/,
  "EntryControls must render entry buttons and links through shared stable primitives."
);

assertNotContains(
  "src/components/EntryControls.tsx",
  /(import OriginLink|<button|<a\s|entryTapGuardProps|guardEntryButtonPress|zIndex|isolation)/,
  "EntryControls must not keep local button/link/tap primitives or stacking layers after migration."
);

assertContains(
  "src/pages/ProfilePage.tsx",
  /import \{ CardActionRow, PrimaryButton, SecondaryButton \} from "\.\.\/components\/StableButton";[\s\S]*?debugId="profile\.save-local"[\s\S]*?debugId="profile\.refresh"/,
  "Profile page must use shared stable button primitives for save and refresh actions."
);

assertNotContains(
  "src/pages/ProfilePage.tsx",
  /(function btn\(|<button|<a\s|OriginLink)/,
  "Profile page must not keep local button/link primitives after migration."
);

assertContains(
  "src/pages/TrustPage.tsx",
  /import \{ CardActionRow, PrimaryButton, SecondaryButton \} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="trust\.refresh"[\s\S]*?debugId="trust\.export-csv"[\s\S]*?debugId="trust\.toggle-explainability"[\s\S]*?debugId="trust\.copy-explainability-json"[\s\S]*?debugId="trust\.apply-filters"[\s\S]*?debugId="trust\.clear-filters"/,
  "Trust page must use shared stable button primitives and shared CTA resolution for refresh, export, explainability, copy, filter, and top-nav actions."
);

assertNotContains(
  "src/pages/TrustPage.tsx",
  /(function actionBtn\(|actionBtn\(|<button|<a\s|OriginLink|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Trust page must not keep local button/link primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/OpenTrustPage.tsx",
  /import \{ CardActionRow, StableCtaLink \} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="open-trust\.trust"[\s\S]*?debugId="open-trust\.community"/,
  "Open Trust reading must use shared stable CTA link primitives and shared CTA resolution for trust and community routes."
);

assertNotContains(
  "src/pages/OpenTrustPage.tsx",
  /(import OriginLink|function (actionBtn|stableTapStyle)\(|actionBtn\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Open Trust reading must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/CCIReadingPage.tsx",
  /import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="cci-reading\.identity"[\s\S]*?debugId="cci-reading\.trust"[\s\S]*?debugId="cci-reading\.copy-snapshot"/,
  "CCI reading must use shared stable CTA primitives and shared CTA resolution for identity, trust, and copy actions."
);

assertNotContains(
  "src/pages/CCIReadingPage.tsx",
  /(import OriginLink|function (actionBtn|stableTapStyle)\(|actionBtn\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app)/,
  "CCI reading must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/TrustLeaderboardPage.tsx",
  /import \{ CardActionRow, StableCtaLink \} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="trust-leaderboard\.trust"[\s\S]*?debugId="trust-leaderboard\.trust-slip"[\s\S]*?debugId="trust-leaderboard\.open-trust"/,
  "Trust leaderboard must use shared stable CTA link primitives and shared CTA resolution for disabled-state recovery routes."
);

assertNotContains(
  "src/pages/TrustLeaderboardPage.tsx",
  /(import OriginLink|function (actionBtn|stableTapStyle)\(|actionBtn\(|<button|<a\s|to="\/app)/,
  "Trust leaderboard must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/TrustTimelinePage.tsx",
  /import \{[\s\S]*?CardActionRow[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?StableCtaLink[\s\S]*?SubtleButton[\s\S]*?\} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="trust-timeline\.trust-slip"[\s\S]*?debugId="trust-timeline\.refresh"[\s\S]*?debugId="trust-timeline\.download-pdf"[\s\S]*?debugId="trust-timeline\.copy-pack-id"[\s\S]*?debugId="trust-timeline\.download-evidence-zip"/,
  "Trust Timeline must use shared stable CTA primitives and shared CTA resolution for route, refresh, copy, and evidence export actions."
);

assertNotContains(
  "src/pages/TrustTimelinePage.tsx",
  /(import OriginLink|function (actionBtn|stableTapStyle)\(|actionBtn\(|<button|<a\s|to="\/app)/,
  "Trust Timeline must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/TrustScorePage.tsx",
  /import \{[\s\S]*?DangerButton[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?SubtleButton[\s\S]*?\} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\(intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId: "trust-score\.surface\.local-community-trust"[\s\S]*?debugId: "trust-score\.surface\.cross-community-consistency"[\s\S]*?debugId=\{item\.debugId\}[\s\S]*?stableHeight=\{isCompact \? 48 : 58\}[\s\S]*?debugId="trust-score\.refresh"[\s\S]*?debugId="trust-score\.copy-snapshot"[\s\S]*?debugId="trust-score\.verify"[\s\S]*?debugId="trust-score\.review-care"/,
  "Trust Score must use shared stable button primitives and shared CTA resolution for surface navigation, refresh, copy, verify, and review actions."
);

assertNotContains(
  "src/pages/TrustScorePage.tsx",
  /(function (actionBtn|tapSafeButtonBase|stopTrustTap)\(|actionBtn\(|tapSafeButtonBase\(|stopTrustTap|<button|<a\s|OriginLink|to="\/app|homeTo="\/app|backTo="\/app|openTrustRoute\("\/app)/,
  "Trust Score must not keep local button/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/MyGMFNAndIPage.tsx",
  /import \{[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?StableCtaLink[\s\S]*?\} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\(intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId: "my-gmfn\.route\.dashboard"[\s\S]*?debugId: "my-gmfn\.route\.demand-box"[\s\S]*?debugId="my-gmfn\.hero\.dashboard"[\s\S]*?debugId="my-gmfn\.tab\.guide"[\s\S]*?debugId="my-gmfn\.settings\.save"[\s\S]*?debugId="my-gmfn\.settings\.reset"/,
  "My GSN and I must use shared stable primitives and shared CTA resolution for hero, guide tabs, route tiles, and settings actions."
);

assertNotContains(
  "src/pages/MyGMFNAndIPage.tsx",
  /(import OriginLink|function (actionBtn|stableTapStyle|buttonGuardProps)\(|brandActionButton|actionBtn\(|stableTapStyle\(|buttonGuardProps\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app)/,
  "My GSN and I must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/TrustSlipPage.tsx",
  /import \{[\s\S]*?CardActionRow[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?StableCtaLink[\s\S]*?SubtleButton[\s\S]*?\} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="trust-slip\.copy-code"[\s\S]*?debugId="trust-slip\.toggle-merchant-verify"[\s\S]*?debugId="trust-slip\.open-verify"[\s\S]*?debugId="trust-slip\.toggle-notes"[\s\S]*?debugId="trust-slip\.open-guide"/,
  "TrustSlip must use shared stable primitives and shared CTA resolution for copy, collapse, verification, and supporting document actions."
);

assertNotContains(
  "src/pages/TrustSlipPage.tsx",
  /(import OriginLink|function (actionBtn|stableTapStyle|buttonGuardProps)\(|const stableTapTarget|guardButtonPress|actionBtn\(|stableTapStyle\(|buttonGuardProps\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app)/,
  "TrustSlip must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/IdentityIntegrityPage.tsx",
  /import \{[\s\S]*?CardActionRow[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?StableCtaLink[\s\S]*?SubtleButton[\s\S]*?\} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\(intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="identity-integrity\.copy-gmfn-id"[\s\S]*?debugId="identity-integrity\.toggle-summary"[\s\S]*?debugId="identity-integrity\.recovery-save"[\s\S]*?debugId="identity-integrity\.toggle-next"[\s\S]*?debugId="identity-integrity\.open-notifications"/,
  "Identity & Integrity must use shared stable primitives and shared CTA resolution for copy, recovery, collapse, and next-step actions."
);

assertNotContains(
  "src/pages/IdentityIntegrityPage.tsx",
  /(import OriginLink|function (actionBtn|stableTapStyle|identityButtonGuardProps)\(|stopIdentityTap|actionBtn\(|stableTapStyle\(|identityButtonGuardProps\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Identity & Integrity must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/NotificationsPage.tsx",
  /import \{[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?StableButton[\s\S]*?StableCtaLink[\s\S]*?SubtleButton[\s\S]*?\} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\(intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="notifications\.hero\.dashboard"[\s\S]*?debugId="notifications\.show-urgent"[\s\S]*?debugId="notifications\.toggle-focus"[\s\S]*?debugId="notifications\.focus\.primary"[\s\S]*?debugId="notifications\.focus\.open-page"[\s\S]*?debugId="notifications\.toggle-buckets"[\s\S]*?debugId=\{`notifications\.bucket\.\$\{bucket\}`\}[\s\S]*?debugId="notifications\.selected\.open"[\s\S]*?debugId="notifications\.selected\.close"/,
  "Notifications must use shared stable primitives and shared CTA resolution for hero, urgent, focus, bucket, selected, and collapse actions."
);

assertNotContains(
  "src/pages/NotificationsPage.tsx",
  /(import OriginLink|function (actionBtn|stableTapStyle|buttonGuardProps)\(|guardButtonPress|actionBtn\(|stableTapStyle\(|buttonGuardProps\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Notifications must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/DemandBoxPage.tsx",
  /import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="demand-box\.open-community"[\s\S]*?debugId="demand-box\.create"[\s\S]*?debugId="demand-box\.post"[\s\S]*?debugId="demand-box\.more-detail"[\s\S]*?debugId=\{`demand-box\.request\.\$\{row\?\.id \|\| index\}\.fulfilled`\}[\s\S]*?debugId="demand-box\.bottom-dashboard"/,
  "Demand Box must use shared stable primitives and shared CTA resolution for community selection, create/post, disclosure, status updates, and route actions."
);

assertContains(
  "src/pages/DemandBoxPage.tsx",
  /function demandActionRowStyle\([\s\S]*?gridAutoRows: `\$\{height\}px`[\s\S]*?overflowAnchor: "none"[\s\S]*?transition: "none"[\s\S]*?function demandActionStyle\(height = 54\)[\s\S]*?height,[\s\S]*?minHeight: height,[\s\S]*?maxHeight: height,[\s\S]*?overflow: "hidden"[\s\S]*?transition: "none"[\s\S]*?stableHeight=\{54\}[\s\S]*?debugId="demand-box\.post"[\s\S]*?style=\{demandActionStyle\(54\)\}/,
  "Demand Box action rows must reserve fixed phone-safe row heights and fixed button heights for create/post/status/route actions."
);

assertNotContains(
  "src/pages/DemandBoxPage.tsx",
  /(import OriginLink|function (primaryBtn|secondaryBtn|subtleBtn|whiteActionBtn|communityChoiceBtn|buttonGuardProps)\(|guardButtonPress|buttonGuardProps\(|primaryBtn\(|secondaryBtn\(|subtleBtn\(|whiteActionBtn\(|communityChoiceBtn\(|brandStableTapTarget|<button|<summary|<a\s|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Demand Box must not keep local/raw button, summary, link, tap-target primitives, or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/LoansPage.tsx",
  /import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="loans\.toggle-overview"[\s\S]*?debugId="loans\.route\.start-support"[\s\S]*?debugId="loans\.route\.money-in"[\s\S]*?debugId="loans\.route\.readiness"[\s\S]*?debugId="loans\.route\.marketplace"/,
  "Loans landing page must use shared stable CTA primitives and shared CTA resolution for collapse and support route tiles."
);

assertNotContains(
  "src/pages/LoansPage.tsx",
  /(import OriginLink|function (stableTapStyle|collapseToggle)\(|routeTile\(|stableTapStyle\(|collapseToggle\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app|communityTo\("\/app)/,
  "Loans landing page must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/LoanReadinessPage.tsx",
  /import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="loan-readiness\.toggle-overview"[\s\S]*?debugId="loan-readiness\.toggle-reading"[\s\S]*?debugId="loan-readiness\.route\.recommended"[\s\S]*?debugId="loan-readiness\.route\.suggestions"[\s\S]*?debugId="loan-readiness\.route\.guarantor-inbox"/,
  "Loan Readiness must use shared stable CTA primitives and shared CTA resolution for collapse controls and next-route tiles."
);

assertNotContains(
  "src/pages/LoanReadinessPage.tsx",
  /(import OriginLink|function (stableTapStyle|collapseToggle)\(|routeTile\(|stableTapStyle\(|collapseToggle\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app|communityTo\("\/app)/,
  "Loan Readiness must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/LoanSuggestionsPage.tsx",
  /import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="loan-suggestions\.refresh-fit"[\s\S]*?debugId="loan-suggestions\.toggle-overview"[\s\S]*?debugId="loan-suggestions\.toggle-supporters"[\s\S]*?debugId="loan-suggestions\.route\.next"[\s\S]*?debugId="loan-suggestions\.route\.workbench"[\s\S]*?debugId="loan-suggestions\.route\.guarantor-inbox"/,
  "Loan Suggestions must use shared stable CTA primitives and shared CTA resolution for refresh, collapse controls, and next-route tiles."
);

assertNotContains(
  "src/pages/LoanSuggestionsPage.tsx",
  /(import OriginLink|function (stableTapStyle|buttonGuardProps|actionBtn|collapseToggle)\(|guardButtonPress|routeTile\(|stableTapStyle\(|buttonGuardProps\(|actionBtn\(|collapseToggle\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app|communityTo\("\/app)/,
  "Loan Suggestions must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/LoanWorkbenchPage.tsx",
  /import \{[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?StableCtaLink[\s\S]*?SubtleButton[\s\S]*?\} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="loan-workbench\.refresh"[\s\S]*?debugId="loan-workbench\.copy-loan-id"[\s\S]*?debugId="loan-workbench\.toggle-selection"[\s\S]*?debugId=\{`loan-workbench\.select\.\$\{positiveNumber\(item\.id\) \|\| "none"\}`\}[\s\S]*?debugId="loan-workbench\.route\.next"[\s\S]*?debugId="loan-workbench\.route\.payment"/,
  "Loan Workbench must use shared stable CTA primitives and shared CTA resolution for refresh, copy, selection, collapse, and next-route actions."
);

assertNotContains(
  "src/pages/LoanWorkbenchPage.tsx",
  /(import OriginLink|function (stableTapStyle|buttonGuardProps|actionBtn|collapseToggle)\(|guardButtonPress|routeTile\(|stableTapStyle\(|buttonGuardProps\(|actionBtn\(|collapseToggle\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app|communityTo\("\/app|withCommunityQuery)/,
  "Loan Workbench must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/LoanSummaryPage.tsx",
  /import \{[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?StableCtaLink[\s\S]*?SubtleButton[\s\S]*?\} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="loan-summary\.copy-summary"[\s\S]*?debugId="loan-summary\.toggle-overview"[\s\S]*?debugId=\{`loan-summary\.guarantor\.\$\{g\.id \|\| idx\}\.approve`\}[\s\S]*?debugId="loan-summary\.toggle-repayment"[\s\S]*?debugId="loan-summary\.open-revenue-preview"[\s\S]*?debugId="loan-summary\.route\.workbench"[\s\S]*?debugId="loan-summary\.route\.payment-or-finance"/,
  "Loan Summary must use shared stable primitives and shared CTA resolution for copy, collapse, guarantor decisions, revenue, and route actions."
);

assertNotContains(
  "src/pages/LoanSummaryPage.tsx",
  /(import OriginLink|function (stableTapStyle|buttonGuardProps|primaryBtn|secondaryBtn|collapseToggle)\(|guardButtonPress|routeTile\(|stableTapStyle\(|buttonGuardProps\(|primaryBtn\(|secondaryBtn\(|collapseToggle\(|<button|<\/button>|<a\s|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Loan Summary must not keep local/raw button, link, tap primitives, or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/FinancePage.tsx",
  /import \{[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?StableCtaLink[\s\S]*?SubtleButton[\s\S]*?\} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\(intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?stableHeight=\{isCompact \? 124 : 132\}[\s\S]*?debugId=\{`finance\.tool\.\$\{item\.id\}`\}[\s\S]*?stableHeight=\{isCompact \? 88 : 76\}[\s\S]*?debugId=\{`finance\.mini-tool\.\$\{tool\.label[\s\S]*?debugId="finance\.events\.view-all"[\s\S]*?debugId="finance\.view-signals"[\s\S]*?debugId="finance\.toggle-overview"[\s\S]*?debugId="finance\.open-loans"[\s\S]*?debugId="finance\.toggle-events"/,
  "Finance page must use shared stable CTA primitives and shared CTA resolution for tool cards, collapse controls, and support route actions."
);

assertNotContains(
  "src/pages/FinancePage.tsx",
  /(import OriginLink|function (tapSafeButtonBase|actionBtn|collapseToggle)\(|stopFinanceTap|tapSafeButtonBase\(|actionBtn\(|collapseToggle\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app|openFinanceRoute\("\/app)/,
  "Finance page must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/PaymentRailsPage.tsx",
  /import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\(intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="payment-rails\.toggle-raw"[\s\S]*?debugId="payment-rails\.route\.money-in"[\s\S]*?debugId="payment-rails\.route\.money-out"[\s\S]*?debugId="payment-rails\.route\.workbench"[\s\S]*?debugId="payment-rails\.route\.community"/,
  "Payment Rails must use shared stable CTA primitives and shared CTA resolution for raw-response toggle and next-route tiles."
);

assertNotContains(
  "src/pages/PaymentRailsPage.tsx",
  /(import OriginLink|function stableTapStyle\(|softBtn\(|routeTile\(|stableTapStyle\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Payment Rails must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/GuarantorEarningsPage.tsx",
  /import \{ SecondaryButton, StableCtaLink, SubtleButton \} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="guarantor-earnings\.copy-summary"[\s\S]*?debugId="guarantor-earnings\.toggle-overview"[\s\S]*?debugId="guarantor-earnings\.toggle-recent"[\s\S]*?debugId="guarantor-earnings\.route\.next"[\s\S]*?debugId="guarantor-earnings\.route\.money-out"/,
  "Guarantor Earnings must use shared stable CTA primitives and shared CTA resolution for copy, collapse, and next-route actions."
);

assertNotContains(
  "src/pages/GuarantorEarningsPage.tsx",
  /(import OriginLink|function stableTapStyle\(|secondaryBtn\(|collapseToggle\(|routeTile\(|stableTapStyle\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app|communityTo\("\/app|withCommunityQuery)/,
  "Guarantor Earnings must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/PayoutDetailsPage.tsx",
  /import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="payout-details\.save"[\s\S]*?debugId="payout-details\.copy-summary"[\s\S]*?debugId="payout-details\.clear-local"[\s\S]*?debugId="payout-details\.open-money-out"[\s\S]*?debugId="payout-details\.open-loans"/,
  "Payout Details must use shared stable CTA primitives and shared CTA resolution for save, copy, clear, and next-route actions."
);

assertNotContains(
  "src/pages/PayoutDetailsPage.tsx",
  /(import OriginLink|function stableTapStyle\(|buttonGuardProps\(|primaryBtn\(|secondaryBtn\(|stableTapStyle\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app|ctaTo: "\/app)/,
  "Payout Details must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/GuarantorInboxPage.tsx",
  /import \{ PrimaryButton, SecondaryButton, StableCtaLink, SubtleButton \} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="guarantor-inbox\.copy-queue"[\s\S]*?debugId="guarantor-inbox\.toggle-overview"[\s\S]*?debugId=\{`guarantor-inbox\.filter\.\$\{x\}`\}[\s\S]*?debugId=\{`guarantor-inbox\.row\.\$\{row\.id \|\| row\.loanId \|\| i\}\.approve`\}[\s\S]*?debugId="guarantor-inbox\.route\.next"[\s\S]*?debugId="guarantor-inbox\.route\.notifications"/,
  "Guarantor Inbox must use shared stable CTA primitives and shared CTA resolution for copy, filters, decisions, collapse controls, and next-route actions."
);

assertNotContains(
  "src/pages/GuarantorInboxPage.tsx",
  /(import OriginLink|function stableTapStyle\(|buttonGuardProps\(|guardButtonPress\(|routeTile\(|primaryBtn\(|secondaryBtn\(|collapseToggle\(|filterBtn\(|stableTapStyle\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app|communityTo\("\/app|withCommunityQuery)/,
  "Guarantor Inbox must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/PaymentInstructionsPage.tsx",
  /import \{ PrimaryButton, SecondaryButton, StableCtaLink, SubtleButton \} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\(intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="money-in\.toggle-overview"[\s\S]*?debugId="money-in\.generate-instruction"[\s\S]*?debugId="money-in\.copy-reference"[\s\S]*?debugId="money-in\.confirm-paid"[\s\S]*?debugId="money-in\.reset-task"[\s\S]*?debugId="money-in\.route\.finance"[\s\S]*?debugId="money-in\.route\.notifications"/,
  "Money In instructions must use shared stable CTA primitives and shared CTA resolution for generation, copy/confirm, reset, collapse, and next-route actions."
);

assertNotContains(
  "src/pages/PaymentInstructionsPage.tsx",
  /(import OriginLink|function stableTapStyle\(|buttonGuardProps\(|guardButtonPress\(|actionBtn\(|collapseToggle\(|stableTapStyle\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app|communityTo\(|withCommunityQuery|APP_TARGETS)/,
  "Money In instructions must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/WithdrawalInstructionsPage.tsx",
  /import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="money-out\.toggle-overview"[\s\S]*?debugId="money-out\.continue-direct"[\s\S]*?debugId="money-out\.open-support"[\s\S]*?debugId="money-out\.save-destination"[\s\S]*?debugId="money-out\.copy-community-rail"[\s\S]*?debugId="money-out\.refresh-status"[\s\S]*?debugId="money-out\.route\.finance"[\s\S]*?debugId="money-out\.route\.notifications"/,
  "Money Out instructions must use shared stable CTA primitives and shared CTA resolution for direct/support actions, destination saving, rail actions, refresh, collapse, and next-route actions."
);

assertNotContains(
  "src/pages/WithdrawalInstructionsPage.tsx",
  /(import OriginLink|function stableTapStyle\(|buttonGuardProps\(|guardButtonPress\(|actionBtn\(|collapseToggle\(|stableTapStyle\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app|communityTo\("\/app)/,
  "Money Out instructions must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/AdminIdentityRiskPage.tsx",
  /import \{ StableDisclosureSummary \} from "\.\.\/components\/StableButton";[\s\S]*?<StableDisclosureSummary[\s\S]*?debugId=\{`admin-identity-risk\.\$\{g\.userId\}\.details`\}/,
  "Admin Identity Risk disclosure summary must use the shared stable disclosure primitive."
);

assertNotContains(
  "src/pages/AdminIdentityRiskPage.tsx",
  /(function stableTapStyle\(|stableTapStyle\(|brandStableTapTarget|<summary|<\/summary>)/,
  "Admin Identity Risk must not keep page-local stable tap or raw summary helpers."
);

assertContains(
  "src/pages/AdminTrustEventsPage.tsx",
  /import \{ SecondaryButton, StableCtaLink, SubtleButton \} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="admin-trust-events\.route\.analytics"[\s\S]*?debugId="admin-trust-events\.route\.graph"[\s\S]*?debugId="admin-trust-events\.route\.identity-risk"[\s\S]*?debugId=\{`admin-trust-events\.row\.\$\{rowKey\}\.copy`\}[\s\S]*?debugId=\{`admin-trust-events\.row\.\$\{rowKey\}\.toggle`\}/,
  "Admin Trust Events must use shared stable CTA primitives and shared CTA resolution for command routes, row copy, and raw-event toggles."
);

assertNotContains(
  "src/pages/AdminTrustEventsPage.tsx",
  /(import OriginLink|function stableTapStyle\(|buttonGuardProps\(|guardButtonPress\(|actionBtn\(|collapseToggle\(|stableTapStyle\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Admin Trust Events must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/AdminIncompleteLoansPage.tsx",
  /import \{ SecondaryButton, StableCtaLink \} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="admin-incomplete-loans\.copy-queue"[\s\S]*?debugId="admin-incomplete-loans\.route\.system-operations"[\s\S]*?debugId="admin-incomplete-loans\.route\.bank-console"[\s\S]*?debugId=\{`admin-incomplete-loans\.loan\.\$\{loanId\}\.copy`\}[\s\S]*?debugId=\{`admin-incomplete-loans\.loan\.\$\{loanId\}\.summary`\}/,
  "Admin Incomplete Loans must use shared stable CTA primitives and shared CTA resolution for queue copy, command routes, loan copy, and loan summary links."
);

assertNotContains(
  "src/pages/AdminIncompleteLoansPage.tsx",
  /(import OriginLink|function stableTapStyle\(|buttonGuardProps\(|guardButtonPress\(|actionBtn\(|stableTapStyle\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Admin Incomplete Loans must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/AdminTrustGraphPage.tsx",
  /import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="admin-trust-graph\.toggle-overview"[\s\S]*?debugId="admin-trust-graph\.toggle-structure"[\s\S]*?debugId="admin-trust-graph\.toggle-signals"[\s\S]*?debugId="admin-trust-graph\.route\.analytics"[\s\S]*?debugId="admin-trust-graph\.route\.command-center"/,
  "Admin Trust Graph must use shared stable CTA primitives and shared CTA resolution for collapse controls and next-route tiles."
);

assertNotContains(
  "src/pages/AdminTrustGraphPage.tsx",
  /(import OriginLink|function stableTapStyle\(|graphButtonGuardProps\(|guardButtonPress\(|routeTile\(|collapseToggle\(|stableTapStyle\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Admin Trust Graph must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/BankConsolePage.tsx",
  /import \{ PrimaryButton, SecondaryButton, StableCtaLink \} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="bank-console\.next-step"[\s\S]*?debugId=\{`bank-console\.row\.\$\{safeStr\(row\.id \|\| displayReference \|\| i\)\}\.copy`\}[\s\S]*?debugId="bank-console\.refresh"[\s\S]*?debugId="bank-console\.ingest"[\s\S]*?debugId="bank-console\.reconcile"[\s\S]*?debugId="bank-console\.copy-config"/,
  "Bank Console must use shared stable CTA primitives and shared CTA resolution for next-step, row copy, refresh, ingest, reconcile, and config-copy actions."
);

assertNotContains(
  "src/pages/BankConsolePage.tsx",
  /(import OriginLink|function stableTapStyle\(|bankButtonGuardProps\(|guardButtonPress\(|primaryBtn\(|secondaryBtn\(|stableTapStyle\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Bank Console must not keep local button/link/tap primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/components/EvidencePackPanel.tsx",
  /import \{ SecondaryButton \} from "\.\/StableButton";[\s\S]*?debugId="evidence-pack\.download-full"[\s\S]*?debugId="evidence-pack\.download-redacted"/,
  "Evidence Pack panel must use shared stable button primitives for download actions."
);

assertNotContains(
  "src/components/EvidencePackPanel.tsx",
  /(<button|<a\s)/,
  "Evidence Pack panel must not keep raw button/link primitives."
);

assertContains(
  "src/components/GMFNConfirmModal.tsx",
  /import \{ PrimaryButton, SecondaryButton \} from "\.\/StableButton";[\s\S]*?debugId="gmfn-confirm\.cancel"[\s\S]*?debugId="gmfn-confirm\.confirm"/,
  "GMFN confirm modal must use shared stable button primitives for cancel and confirm actions."
);

assertNotContains(
  "src/components/GMFNConfirmModal.tsx",
  /(<button|<a\s)/,
  "GMFN confirm modal must not keep raw button/link primitives."
);

assertContains(
  "src/components/DomainIntroToggle.tsx",
  /import \{ SubtleButton \} from "\.\/StableButton";[\s\S]*?debugId="domain-intro\.toggle"/,
  "Domain Intro Toggle must use the shared stable button primitive for its expand/collapse action."
);

assertNotContains(
  "src/components/DomainIntroToggle.tsx",
  /(<button|<a\s)/,
  "Domain Intro Toggle must not keep raw button/link primitives."
);

assertContains(
  "src/pages/BorrowerPreflightPage.tsx",
  /import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="borrower-preflight\.open-loans"[\s\S]*?debugId="borrower-preflight\.open-readiness"[\s\S]*?debugId="borrower-preflight\.open-commitments"/,
  "Borrower Preflight must use shared stable CTA links and shared CTA resolution for support, readiness, and commitment routes."
);

assertNotContains(
  "src/pages/BorrowerPreflightPage.tsx",
  /(import OriginLink|from "react-router-dom"|function stableTapStyle\(|stableTapStyle\(|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Borrower Preflight must not keep local/raw link, button, tap primitives, or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/AppearancePage.tsx",
  /import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="appearance\.route\.payout-details"[\s\S]*?debugId="appearance\.route\.notifications"[\s\S]*?debugId="appearance\.route\.identity"[\s\S]*?debugId=\{`appearance\.theme\.\$\{t\.key\}`\}/,
  "Appearance page must use shared stable CTA primitives and shared CTA resolution for settings shortcuts and theme choices."
);

assertNotContains(
  "src/pages/AppearancePage.tsx",
  /(from "react-router-dom"|<button|<a\s|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Appearance page must not keep raw button/link primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/components/CompanionLayer.tsx",
  /import \{ PrimaryButton, SecondaryButton, SubtleButton \} from "\.\/StableButton";[\s\S]*?debugId=\{`companion-toast\.\$\{toast\.id\}\.dismiss-icon`\}[\s\S]*?debugId=\{`companion-toast\.\$\{toast\.id\}\.open`\}[\s\S]*?debugId=\{`companion-toast\.\$\{toast\.id\}\.dismiss`\}/,
  "Companion toast layer must use shared stable button primitives for open and dismiss actions."
);

assertNotContains(
  "src/components/CompanionLayer.tsx",
  /(<button|<a\s)/,
  "Companion toast layer must not keep raw button/link primitives."
);

assertContains(
  "src/components/CompanionSettingsPanel.tsx",
  /import \{ SecondaryButton \} from "\.\/StableButton";[\s\S]*?debugId="companion-settings\.mode\.off"[\s\S]*?debugId="companion-settings\.mode\.active"[\s\S]*?debugId="companion-settings\.audible\.urgent-only"[\s\S]*?debugId="companion-settings\.voice\.on"[\s\S]*?debugId="companion-settings\.push\.off"/,
  "Companion settings panel must use shared stable button primitives for option and toggle controls."
);

assertNotContains(
  "src/components/CompanionSettingsPanel.tsx",
  /(<button|<a\s)/,
  "Companion settings panel must not keep raw button/link primitives."
);

assertContains(
  "src/components/CommunityShopControlPanel.tsx",
  /import \{ PrimaryButton, SecondaryButton, StableCtaLink, SubtleButton \} from "\.\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="community-shop-control\.toggle"[\s\S]*?debugId="community-shop-control\.public-url"[\s\S]*?debugId="community-shop-control\.open-owner"[\s\S]*?debugId="community-shop-control\.open-public"[\s\S]*?debugId="community-shop-control\.copy-public-link"[\s\S]*?debugId="community-shop-control\.open-marketplace"[\s\S]*?debugId="community-shop-control\.shortcut\.pictures"[\s\S]*?debugId="community-shop-control\.shortcut\.vault"/,
  "Community Shop Control panel must use shared stable button primitives and shared CTA resolution for panel toggle, owner actions, and shortcuts."
);

assertNotContains(
  "src/components/CommunityShopControlPanel.tsx",
  /(<button|<\/button>|panelButtonGuardProps|actionBtn\(|collapseToggle\(|actionTapGuardProps|brandStableTapTarget|openPanelRoute\("\/app|withClanQuery\("\/app|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Community Shop Control panel must not keep raw button, local tap/action helper primitives, or hard-coded app route CTAs after migration."
);

assertContains(
  "src/components/IdentityImageBlock.tsx",
  /import \{ PrimaryButton, SecondaryButton \} from "\.\/StableButton";[\s\S]*?debugId="identity-image\.upload"[\s\S]*?debugId="identity-image\.camera"[\s\S]*?debugId="identity-image\.change"[\s\S]*?debugId="identity-image\.remove"/,
  "Identity image block must use shared stable button primitives for upload, camera, change, and remove actions."
);

assertNotContains(
  "src/components/IdentityImageBlock.tsx",
  /(<button|<a\s)/,
  "Identity image block must not keep raw button/link primitives."
);

assertContains(
  "src/components/ExplainToggle.tsx",
  /import \{ SubtleButton \} from "\.\/StableButton";[\s\S]*?debugId="explain-toggle\.toggle"/,
  "Explain toggle must use the shared stable button primitive for guide disclosure."
);

assertNotContains(
  "src/components/ExplainToggle.tsx",
  /(<button|<a\s)/,
  "Explain toggle must not keep raw button/link primitives."
);

assertContains(
  "src/components/PaymentInstructionsPanel.tsx",
  /import \{ SecondaryButton \} from "\.\/StableButton";[\s\S]*?debugId="payment-instructions-panel\.copy-reference"/,
  "Payment instructions panel must use the shared stable button primitive for reference copy."
);

assertNotContains(
  "src/components/PaymentInstructionsPanel.tsx",
  /(<button|<a\s)/,
  "Payment instructions panel must not keep raw button/link primitives."
);

assertContains(
  "src/components/LoanWorkbenchPage.tsx",
  /import \{ PrimaryButton \} from "\.\/StableButton";[\s\S]*?debugId="loan-workbench-legacy\.load"/,
  "Legacy Loan Workbench component must use the shared stable button primitive for loading workspace data."
);

assertNotContains(
  "src/components/LoanWorkbenchPage.tsx",
  /(<button|<a\s)/,
  "Legacy Loan Workbench component must not keep raw button/link primitives."
);

assertContains(
  "src/components/PictureFrameToolsControl.tsx",
  /import \{ SecondaryButton, SubtleButton \} from "\.\/StableButton";[\s\S]*?debugId=\{`picture-frame-tools\.action\.\$\{action\.label\}`\}[\s\S]*?debugId="picture-frame-tools\.toggle"/,
  "Picture frame tools must use shared stable button primitives for rail actions and toggle control."
);

assertNotContains(
  "src/components/PictureFrameToolsControl.tsx",
  /(<button|<a\s)/,
  "Picture frame tools must not keep raw button/link primitives."
);

assertContains(
  "src/components/NextActionGuide.tsx",
  /import \{ StableButton \} from "\.\/StableButton";[\s\S]*?debugId="next-action-guide\.back-one-step"[\s\S]*?debugId="next-action-guide\.open-close"[\s\S]*?debugId="next-action-guide\.find-action"[\s\S]*?debugId=\{`next-action-guide\.item\.\$\{item\.id\}`\}[\s\S]*?debugId=\{`next-action-guide\.continue\.\$\{selection\.item\.id\}`\}[\s\S]*?debugId="next-action-guide\.choose-something-else"/,
  "Next Action Guide must use shared stable button primitives for guide navigation, search, choices, and continuation."
);

assertNotContains(
  "src/components/NextActionGuide.tsx",
  /(<button|<a\s)/,
  "Next Action Guide must not keep raw button/link primitives."
);

assertContains(
  "src/components/PilotRiskDisclosureGate.tsx",
  /import \{ PrimaryButton \} from "\.\/StableButton";[\s\S]*?debugId="pilot-risk-disclosure\.continue"/,
  "Pilot risk disclosure gate must use the shared stable button primitive for continue acknowledgement."
);

assertNotContains(
  "src/components/PilotRiskDisclosureGate.tsx",
  /(<button|<a\s)/,
  "Pilot risk disclosure gate must not keep raw button/link primitives."
);

assertContains(
  "src/components/SpotlightMediaFrame.tsx",
  /import \{ SecondaryButton \} from "\.\/StableButton";[\s\S]*?debugId="spotlight-media-frame\.toggle-audio"/,
  "Spotlight media frame must use the shared stable button primitive for the audio unlock control."
);

assertNotContains(
  "src/components/SpotlightMediaFrame.tsx",
  /(<button|<a\s)/,
  "Spotlight media frame must not keep raw button/link primitives."
);

assertContains(
  "src/pages/ClansPage.tsx",
  /import \{ PrimaryButton, SecondaryButton, StableCtaLink \} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="clans\.quick\.community"[\s\S]*?debugId="clans\.create-community"[\s\S]*?debugId="clans\.next\.marketplace"[\s\S]*?debugId="clans\.invite\.open-form\.top"[\s\S]*?debugId="clans\.invite\.copy-link"[\s\S]*?debugId="clans\.invite\.open-guide"[\s\S]*?debugId="clans\.invite-modal\.create-package"[\s\S]*?debugId=\{`clans\.community\.\$\{id\}\.marketplace`\}/,
  "Clans page must use shared stable CTA primitives and shared CTA resolution for community creation, selection, invite package, and route actions."
);

assertNotContains(
  "src/pages/ClansPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|to="\/app|homeTo="\/app|backTo="\/app|withClanQuery\("\/app|navigateWithOrigin\(navigate, "\/app)/,
  "Clans page must not keep raw button/link primitives or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/BuildFirstCirclePage.tsx",
  /import \{[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?StableButton[\s\S]*?SubtleButton[\s\S]*?\} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\(intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId=\{`build-first-circle\.role\.\$\{role\}`\}[\s\S]*?debugId="build-first-circle\.add-person"[\s\S]*?debugId="build-first-circle\.choose-phone-contacts"[\s\S]*?debugId="build-first-circle\.toggle-contacts"[\s\S]*?debugId=\{`build-first-circle\.contact\.\$\{item\.id\}\.remove`\}[\s\S]*?debugId="build-first-circle\.copy-invite-bundle"[\s\S]*?debugId="build-first-circle\.reset"/,
  "Build First Circle page must use shared stable button primitives and shared CTA resolution for role, contact, section, invite, and nav actions."
);

assertNotContains(
  "src/pages/BuildFirstCirclePage.tsx",
  /(<button|<\/button>|<a\s|buttonGuardProps|stableTapStyle|guardButtonPress|OriginLink|actionBtn\(|homeTo="\/app|backTo="\/app|to="\/app)/,
  "Build First Circle page must not keep raw button/link, local tap/action primitives, or hard-coded app route CTAs after migration."
);

assertContains(
  "src/components/TrustDocumentUseCases.tsx",
  /import \{ StableCtaLink \} from "\.\/StableButton";[\s\S]*?debugId=\{`trust-document-use-cases\.open\.\$\{item\.id\}`\}/,
  "Trust document use-case cards must use shared stable CTA links."
);

assertNotContains(
  "src/components/TrustDocumentUseCases.tsx",
  /(<button|<a\s|OriginLink)/,
  "Trust document use-case cards must not keep raw link/button primitives."
);

assertContains(
  "src/components/TrustDocumentFamilyMap.tsx",
  /import \{ StableCtaLink \} from "\.\/StableButton";[\s\S]*?debugId=\{`trust-document-family\.open\.\$\{item\.id\}`\}/,
  "Trust document family map cards must use shared stable CTA links."
);

assertNotContains(
  "src/components/TrustDocumentFamilyMap.tsx",
  /(<button|<a\s|OriginLink)/,
  "Trust document family map cards must not keep raw link/button primitives."
);

assertContains(
  "src/pages/RegisterPage.tsx",
  /import \{ PrimaryButton, StableCtaLink \} from "\.\.\/components\/StableButton";[\s\S]*?debugId="register\.continue-login"[\s\S]*?debugId="register\.activate-membership"[\s\S]*?debugId="register\.create-entry"[\s\S]*?debugId="register\.welcome"/,
  "Register handoff page must use shared stable CTA primitives for continuation and fallback routes."
);

assertNotContains(
  "src/pages/RegisterPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink)/,
  "Register handoff page must not keep raw button/link primitives."
);

assertContains(
  "src/pages/IntroductionPage.tsx",
  /import \{ StableCtaLink \} from "\.\.\/components\/StableButton";[\s\S]*?debugId="introduction\.continue-welcome"[\s\S]*?debugId="introduction\.open-guide"[\s\S]*?debugId="introduction\.open-commitment"[\s\S]*?debugId="introduction\.existing-access"[\s\S]*?debugId="introduction\.footer\.commitment"/,
  "Introduction page must use shared stable CTA links for public entry and footer routes."
);

assertNotContains(
  "src/pages/IntroductionPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|useNavigate)/,
  "Introduction page must not keep raw button/link primitives or local navigation buttons."
);

assertContains(
  "src/pages/InviteLandingPage.tsx",
  /import \{ PrimaryButton, StableCtaLink \} from "\.\.\/components\/StableButton";[\s\S]*?debugId="invite-landing\.open-founder-entry"[\s\S]*?debugId="invite-landing\.open-guide"[\s\S]*?debugId="invite-landing\.open-focus-guide"[\s\S]*?debugId="invite-landing\.open-welcome"/,
  "Invite landing page must use shared stable CTA primitives for founder entry and guide routes."
);

assertNotContains(
  "src/pages/InviteLandingPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|actionBtn\()/,
  "Invite landing page must not keep raw button/link or local action primitives."
);

assertContains(
  "src/pages/JoinByInvitePage.tsx",
  /import \{ PrimaryButton, StableCtaLink \} from "\.\.\/components\/StableButton";[\s\S]*?debugId="join-by-invite\.open-invited-entry"[\s\S]*?debugId="join-by-invite\.open-guide"[\s\S]*?debugId="join-by-invite\.open-focus-guide"[\s\S]*?debugId="join-by-invite\.open-welcome"/,
  "Join-by-invite page must use shared stable CTA primitives for invited entry and guide routes."
);

assertNotContains(
  "src/pages/JoinByInvitePage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|buttonGuardProps|stableTapStyle|guardButtonPress)/,
  "Join-by-invite page must not keep raw button/link or local tap guard primitives."
);

assertContains(
  "src/pages/ExposurePage.tsx",
  /import \{ SecondaryButton, StableCtaLink \} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="exposure\.run-overdue"[\s\S]*?debugId="exposure\.refresh"[\s\S]*?debugId="exposure\.load-cci"[\s\S]*?debugId="exposure\.open-trust-analytics"[\s\S]*?debugId=\{`exposure\.loan\.\$\{e\.loan_id\}\.timeline`\}[\s\S]*?debugId=\{`exposure\.user\.\$\{borrowerId\}\.timeline`\}[\s\S]*?debugId="exposure\.back-dashboard"/,
  "Exposure admin page must use shared stable primitives and shared CTA resolution for admin tools, analytics links, table drilldowns, and dashboard return."
);

assertNotContains(
  "src/pages/ExposurePage.tsx",
  /(<button|<\/button>|<a\s|import \{ Link|stableTapStyle|exposureButtonGuardProps|stopExposureTap|to="\/app)/,
  "Exposure admin page must not keep raw button/link, local tap guard primitives, or hard-coded app route CTAs."
);

assertContains(
  "src/pages/SeedDemoPage.tsx",
  /import \{ PrimaryButton \} from "\.\.\/components\/StableButton";[\s\S]*?debugId="seed-demo\.run"/,
  "Seed demo page must use the shared stable button primitive for the demo seed action."
);

assertNotContains(
  "src/pages/SeedDemoPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink)/,
  "Seed demo page must not keep raw button/link primitives."
);

assertContains(
  "src/pages/InviteComposerPreviewPage.tsx",
  /import \{ PrimaryButton \} from "\.\.\/components\/StableButton";[\s\S]*?debugId="invite-composer-preview\.create-package"/,
  "Invite composer preview page must use the shared stable button primitive for its package action."
);

assertNotContains(
  "src/pages/InviteComposerPreviewPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink)/,
  "Invite composer preview page must not keep raw button/link primitives outside shared entry controls."
);

assertContains(
  "src/pages/LoanDecisionPage.tsx",
  /import \{ StableCtaLink \} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId=\{`loan-decision\.\$\{loanId \|\| index\}\.summary`\}[\s\S]*?debugId=\{`loan-decision\.\$\{loanId \|\| index\}\.workbench`\}[\s\S]*?debugId="loan-decision\.route\.workbench"[\s\S]*?debugId="loan-decision\.route\.loans"[\s\S]*?debugId="loan-decision\.route\.finance"/,
  "Loan Decision page must use shared stable CTA links and shared CTA resolution for row drilldowns and next-door routes."
);

assertNotContains(
  "src/pages/LoanDecisionPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|stableTapStyle|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Loan Decision page must not keep raw link/button, local tap primitives, or hard-coded app route CTAs."
);

assertContains(
  "src/pages/LockManagementPage.tsx",
  /import \{ StableCtaLink \} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="lock-management\.open-workbench"[\s\S]*?debugId="lock-management\.open-system-operations"[\s\S]*?debugId="lock-management\.back-dashboard"/,
  "Lock Management page must use shared stable CTA links and shared CTA resolution for onward routes."
);

assertNotContains(
  "src/pages/LockManagementPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|actionBtn\(|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Lock Management page must not keep raw link/button, local action primitives, or hard-coded app route CTAs."
);

assertContains(
  "src/pages/ShopAccessPage.tsx",
  /import \{ StableCtaLink \} from "\.\.\/components\/StableButton";[\s\S]*?debugId="shop-access\.invalid\.back-welcome"[\s\S]*?debugId="shop-access\.invalid\.open-public-shop"[\s\S]*?debugId="shop-access\.hero\.open-public-shop"[\s\S]*?debugId="shop-access\.hero\.return-entry"[\s\S]*?debugId="shop-access\.next\.open-public-shop"[\s\S]*?debugId="shop-access\.next\.back-welcome"/,
  "Shop Access page must use shared stable CTA links for invalid, hero, and next-step routes."
);

assertNotContains(
  "src/pages/ShopAccessPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|actionBtn\()/,
  "Shop Access page must not keep raw link/button or local action primitives."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /import \{ PrimaryButton, SecondaryButton, StableCtaLink \} from "\.\.\/components\/StableButton";[\s\S]*?debugId="shop-gallery\.share-shop"[\s\S]*?debugId="shop-gallery\.verify-shop\.toggle"[\s\S]*?debugId="shop-gallery\.owner-contact\.choose"[\s\S]*?debugId="shop-gallery\.verify-shop\.request-trustslip"[\s\S]*?debugId="shop-gallery\.verify-shop\.open-public-shop"[\s\S]*?debugId="shop-gallery\.verify-shop\.open-community-record"[\s\S]*?debugId="shop-gallery\.open-spotlight-preview"[\s\S]*?debugId="shop-gallery\.ask-vault-access"[\s\S]*?debugId="shop-gallery\.copy-vault-shop-link"[\s\S]*?debugId=\{`shop-gallery\.product\.\$\{productOpenId\}\.toggle`\}[\s\S]*?debugId=\{`shop-gallery\.product\.\$\{productOpenId\}\.share`\}[\s\S]*?debugId=\{`shop-gallery\.product\.\$\{productOpenId\}\.contact`\}[\s\S]*?debugId="shop-gallery\.toggle-all-products"/,
  "Shop Gallery must use shared stable primitives for hero, vault, product, spotlight, and remaining public-shop actions."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /audioUnlockLabel="🔊"[\s\S]*?audioUnlockOffLabel="🔇"[\s\S]*?aria-label=\{isProductOpen \? `Close \$\{displayTitle\}` : `Open \$\{displayTitle\}`\}[\s\S]*?\{isProductOpen \? "🔼" : "👁️"\}[\s\S]*?aria-label=\{`Share \$\{displayTitle\}`\}[\s\S]*?🔗[\s\S]*?aria-label=\{`Contact owner about \$\{displayTitle\}`\}[\s\S]*?💬/,
  "Shop Gallery product cards must use compact real-life signs for sound, open/close, block share, and owner contact while keeping accessible action labels."
);

assertNotContains(
  "src/pages/ShopGalleryPage.tsx",
  /audioUnlockLabel="Sound on"|>Sound on<|>Sound off<|>Share shop<|>Open<|>Close</,
  "Shop Gallery product cards must not bring back oversized text-only media/open/share buttons."
);

assertNotContains(
  "src/pages/ShopGalleryPage.tsx",
  /shop-gallery\.repost|repostPanelOpen|createMarketplaceRepost/,
  "Public Shop Gallery must not expose the in-network repost action as a public visitor button."
);

assertNotContains(
  "src/pages/ShopGalleryPage.tsx",
  /(<button|<\/button>|<a\s|buttonGuardProps|actionTapGuardProps|brandStableTapTarget|stableTapTarget)/,
  "Shop Gallery must not keep raw button/link or local tap guard primitives."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /import \{[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?StableButton[\s\S]*?StableCtaLink[\s\S]*?SubtleButton[\s\S]*?\} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\(intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="shop-assets\.back-shop-control"[\s\S]*?debugId="shop-assets\.open-public-shop"[\s\S]*?debugId="shop-assets\.toggle-guidance"[\s\S]*?debugId="shop-assets\.signboard\.save"[\s\S]*?debugId=\{`shop-assets\.public-slot\.\$\{slotNumber\}\.select`\}[\s\S]*?debugId="shop-assets\.product\.submit"[\s\S]*?debugId="shop-assets\.toggle-posted"[\s\S]*?debugId=\{`shop-assets\.product\.\$\{item\.id\}\.copy-link`\}/,
  "Shop Assets must use shared stable primitives and shared CTA resolution for owner routes, public shop actions, collapses, signboard, slot, product, and posted-item actions."
);

assertNotContains(
  "src/pages/ShopAssetsPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|buttonGuardProps|actionTapGuardProps|brandStableTapTarget|stableTapTarget|actionBtn\(|collapseToggle|ownerActionButton|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Shop Assets must not keep raw button/link, local tap/action primitives, or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/VaultControlPage.tsx",
  /import \{[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?StableButton[\s\S]*?SubtleButton[\s\S]*?\} from "\.\.\/components\/StableButton";[\s\S]*?debugId=\{`vault-control\.panel\.\$\{panel\}\.toggle`\}[\s\S]*?debugId=\{`vault-control\.payment-slot\.\$\{slot\}`\}[\s\S]*?debugId="vault-control\.confirm-quote"[\s\S]*?debugId="vault-control\.generate-payment-code"[\s\S]*?debugId="vault-control\.copy-payment-details"[\s\S]*?debugId=\{`vault-control\.block-slot\.\$\{slotNumber\}\.select`\}[\s\S]*?debugId="vault-control\.selected-block\.add"[\s\S]*?debugId="vault-control\.link\.create-or-replace"[\s\S]*?debugId="vault-control\.editor\.save"/,
  "Vault Control must use shared stable primitives for panel, payment, block, link, and editor actions."
);

assertNotContains(
  "src/pages/VaultControlPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|buttonGuardProps|actionTapGuardProps)/,
  "Vault Control must not keep raw button/link or local tap guard primitives after migration."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /import \{[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?StableButton[\s\S]*?StableCtaLink[\s\S]*?SubtleButton[\s\S]*?\} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="shop-control\.spotlight\.setup\.continue"[\s\S]*?debugId="shop-control\.spotlight\.upload\.preview"[\s\S]*?debugId="shop-control\.spotlight\.preview\.publish"[\s\S]*?debugId=\{`shop-control\.hero-shortcut\.[\s\S]*?debugId="shop-control\.vault\.pay-1-slot"[\s\S]*?debugId="shop-control\.verify\.pay"[\s\S]*?debugId="shop-control\.subscription\.open"[\s\S]*?debugId="shop-control\.details\.save"[\s\S]*?debugId="shop-control\.vault-layer\.create-link"[\s\S]*?debugId=\{`shop-control\.vault-link\.\$\{item\.id\}\.copy`\}/,
  "Shop Control must use shared stable primitives and shared CTA resolution for spotlight, owner shortcuts, paid tools, details, and vault-link actions."
);

assertNotContains(
  "src/pages/ShopControlPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|buttonGuardProps|actionTapGuardProps|brandStableTapTarget|stableTapTarget|actionBtn\(|fullButton\(|to="\/app|homeTo="\/app|backTo="\/app|navigate\("\/app)/,
  "Shop Control must not keep raw button/link, local tap/action primitives, or hard-coded app route CTAs after migration."
);

assertContains(
  "src/pages/ApiPage.tsx",
  /import \{ StableCtaLink \} from "\.\.\/components\/StableButton";[\s\S]*?debugId="api\.open-swagger"[\s\S]*?debugId="api\.open-openapi-json"/,
  "API page must use shared stable CTA links for Swagger and OpenAPI document routes."
);

assertNotContains(
  "src/pages/ApiPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink)/,
  "API page must not keep raw link/button primitives."
);

assertContains(
  "src/pages/RepaymentPage.tsx",
  /import \{ PrimaryButton, SecondaryButton, StableCtaLink, SubtleButton \} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="repayment\.toggle-overview"[\s\S]*?debugId="repayment\.toggle-instruction"[\s\S]*?debugId="repayment\.generate-instruction"[\s\S]*?debugId="repayment\.copy-reference"[\s\S]*?debugId="repayment\.copy-full-instruction"[\s\S]*?debugId="repayment\.toggle-result"[\s\S]*?debugId="repayment\.confirm-paid"[\s\S]*?debugId="repayment\.toggle-routes"[\s\S]*?debugId="repayment\.route\.loan-summary"[\s\S]*?debugId="repayment\.route\.finance"[\s\S]*?debugId="repayment\.route\.loans"/,
  "Repayment page must use shared stable primitives and shared CTA resolution for collapse, instruction, confirmation, copy, and route actions."
);

assertNotContains(
  "src/pages/RepaymentPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|buttonGuardProps|stableTapStyle|guardButtonPress|actionBtn\(|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Repayment page must not keep raw button/link, local tap/action primitives, or hard-coded app route CTAs."
);

assertContains(
  "src/pages/RevenueAllocationPage.tsx",
  /import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="revenue-allocation\.load"[\s\S]*?debugId="revenue-allocation\.copy-summary"[\s\S]*?debugId="revenue-allocation\.toggle-summary"[\s\S]*?debugId="revenue-allocation\.toggle-details"[\s\S]*?debugId="revenue-allocation\.toggle-context"[\s\S]*?debugId="revenue-allocation\.toggle-routes"[\s\S]*?debugId="revenue-allocation\.route\.loan-summary"[\s\S]*?debugId="revenue-allocation\.route\.workbench"[\s\S]*?debugId="revenue-allocation\.route\.finance"[\s\S]*?debugId="revenue-allocation\.route\.money-out"/,
  "Revenue Allocation page must use shared stable primitives and shared CTA resolution for load, copy, collapse, and next-route actions."
);

assertNotContains(
  "src/pages/RevenueAllocationPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|buttonGuardProps|stableTapStyle|guardButtonPress|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Revenue Allocation page must not keep raw button/link, local tap guard primitives, or hard-coded app route CTAs."
);

assertContains(
  "src/pages/TrustSlipVerifyPage.tsx",
  /import \{[\s\S]*?PrimaryButton[\s\S]*?SecondaryButton[\s\S]*?StableCtaLink[\s\S]*?StableDisclosureSummary[\s\S]*?SubtleButton[\s\S]*?\} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="trust-slip-verify\.hero\.welcome"[\s\S]*?debugId="trust-slip-verify\.hero\.guide"[\s\S]*?debugId="trust-slip-verify\.copy-code"[\s\S]*?debugId="trust-slip-verify\.copy-link"[\s\S]*?debugId="trust-slip-verify\.copy-gmfn-id"[\s\S]*?debugId="trust-slip-verify\.print"[\s\S]*?debugId="trust-slip-verify\.copy-snapshot"[\s\S]*?debugId="trust-slip-verify\.route\.trust"/,
  "TrustSlip Verify page must use shared stable primitives, stable disclosure summaries, and shared CTA resolution for public navigation, copy, print, and trust routes."
);

assertNotContains(
  "src/pages/TrustSlipVerifyPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|actionBtn\(|to="\/app|homeTo="\/app|backTo="\/app)/,
  "TrustSlip Verify page must not keep raw button/link, local action primitives, or hard-coded app route CTAs."
);

assertContains(
  "src/pages/SubscriptionSpotlightPage.tsx",
  /import \{ PrimaryButton, SecondaryButton, SubtleButton \} from "\.\.\/components\/StableButton";[\s\S]*?debugId=\{`subscription-spotlight\.credit\.\$\{credit\}`\}[\s\S]*?debugId="subscription-spotlight\.confirm-quote"[\s\S]*?debugId="subscription-spotlight\.generate-payment-code"[\s\S]*?debugId="subscription-spotlight\.copy-payment-details"[\s\S]*?debugId="subscription-spotlight\.check-payment-status"[\s\S]*?debugId="subscription-spotlight\.publish"/,
  "Subscription Spotlight page must use shared stable button primitives for credit selection, quote, payment, and publish actions."
);

assertNotContains(
  "src/pages/SubscriptionSpotlightPage.tsx",
  /(<button|<\/button>|<a\s|buttonGuardProps|actionTapGuardProps)/,
  "Subscription Spotlight page must not keep raw button/link or local tap guard primitives."
);

assertContains(
  "src/pages/TrustAnalyticsPage.tsx",
  /import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="trust-analytics\.toggle\.overview"[\s\S]*?debugId="trust-analytics\.toggle\.mix"[\s\S]*?debugId="trust-analytics\.toggle\.timeline"[\s\S]*?debugId="trust-analytics\.toggle\.notes"[\s\S]*?debugId="trust-analytics\.route\.system-operations"[\s\S]*?debugId="trust-analytics\.route\.exposure"[\s\S]*?debugId="trust-analytics\.route\.trust-graph"[\s\S]*?debugId="trust-analytics\.route\.command-center"/,
  "Trust Analytics must use shared stable primitives and shared CTA resolution for collapse controls and command routes."
);

assertNotContains(
  "src/pages/TrustAnalyticsPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|analyticsButtonGuardProps|stableTapStyle|stopAnalyticsTap|actionBtn\(|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Trust Analytics must not keep raw button/link, local tap/action primitives, or hard-coded app route CTAs."
);

assertContains(
  "src/pages/SystemOperationsPage.tsx",
  /import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="system-operations\.toggle\.overview"[\s\S]*?debugId="system-operations\.toggle\.intake"[\s\S]*?debugId="system-operations\.toggle\.signals"[\s\S]*?debugId=\{`system-operations\.signal\.\$\{row\.id\}\.route`\}[\s\S]*?debugId="system-operations\.toggle\.queues"[\s\S]*?debugId="system-operations\.toggle\.routes"[\s\S]*?debugId="system-operations\.route\.bank-console"[\s\S]*?debugId="system-operations\.route\.incomplete-loans"[\s\S]*?debugId="system-operations\.route\.identity-risk"[\s\S]*?debugId="system-operations\.route\.trust-analytics"/,
  "System Operations must use shared stable primitives and shared CTA resolution for collapse controls, live signal routes, and next-route cards."
);

assertNotContains(
  "src/pages/SystemOperationsPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|systemButtonGuardProps|stableTapStyle|stopSystemTap|actionBtn\(|to="\/app|homeTo="\/app|backTo="\/app|ctaTo: "\/app)/,
  "System Operations must not keep raw button/link, local tap/action primitives, or hard-coded app route CTAs."
);

assertContains(
  "src/pages/ExposureAdminPage.tsx",
  /import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="exposure-admin\.toggle\.overview"[\s\S]*?debugId="exposure-admin\.toggle\.pressure"[\s\S]*?debugId="exposure-admin\.toggle\.queues"[\s\S]*?debugId=\{`exposure-admin\.queue\.\$\{row\.key\}\.route`\}[\s\S]*?debugId="exposure-admin\.toggle\.routes"[\s\S]*?debugId="exposure-admin\.route\.system-operations"[\s\S]*?debugId="exposure-admin\.route\.trust-analytics"[\s\S]*?debugId="exposure-admin\.route\.trust-graph"[\s\S]*?debugId="exposure-admin\.route\.bank-console"/,
  "Exposure Admin must use shared stable primitives and shared CTA resolution for collapse controls, queue routes, and next-route cards."
);

assertNotContains(
  "src/pages/ExposureAdminPage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|exposureButtonGuardProps|stableTapStyle|stopExposureTap|actionBtn\(|to="\/app|homeTo="\/app|backTo="\/app|route: "\/app)/,
  "Exposure Admin must not keep raw button/link, local tap/action primitives, or hard-coded app route CTAs."
);

assertContains(
  "src/pages/TrustCommandCentrePage.tsx",
  /import \{ SecondaryButton, StableCtaLink \} from "\.\.\/components\/StableButton";[\s\S]*?import \{ resolveCtaTarget, type CtaIntent \} from "\.\.\/lib\/ctaTargets";[\s\S]*?function routeTarget\([\s\S]*?intent: CtaIntent[\s\S]*?resolveCtaTarget\(intent,[\s\S]*?debugId="trust-command\.toggle\.executive"[\s\S]*?debugId="trust-command\.executive\.next-action"[\s\S]*?debugId="trust-command\.toggle\.pilot"[\s\S]*?debugId="trust-command\.toggle\.overview"[\s\S]*?debugId="trust-command\.toggle\.routes"[\s\S]*?debugId=\{`trust-command\.route\.\$\{card\.label\.toLowerCase\(\)\.replace\(\/\[\^a-z0-9\]\+\/g, "-"\)\}`\}[\s\S]*?debugId="trust-command\.toggle\.workflows"[\s\S]*?debugId="trust-command\.toggle\.notes"[\s\S]*?debugId=\{`trust-command\.next\.\$\{item\.label\.toLowerCase\(\)\.replace\(\/\[\^a-z0-9\]\+\/g, "-"\)\}`\}/,
  "Trust Command Centre must use shared stable primitives and shared CTA resolution for command toggles and route actions."
);

assertNotContains(
  "src/pages/TrustCommandCentrePage.tsx",
  /(<button|<\/button>|<a\s|OriginLink|commandButtonGuardProps|stopCommandTap|WebkitTapHighlightColor|touchAction|position: "relative"|zIndex: 2|actionBtn\(|to="\/app|homeTo="\/app|backTo="\/app)/,
  "Trust Command Centre must not keep raw button/link, local tap guard, local route/action stacking primitives, or hard-coded app route CTAs."
);

if (findings.length > 0) {
  console.error("Button stability audit failed:");
  for (const finding of findings) {
    const location = finding.line ? `${finding.file}:${finding.line}` : finding.file;
    console.error(`- ${location} ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log("Button stability audit passed.");
