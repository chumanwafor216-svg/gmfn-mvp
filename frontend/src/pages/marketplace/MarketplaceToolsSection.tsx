import React, {
  lazy,
  Suspense,
  type CSSProperties,
  type Dispatch,
  type RefObject,
  type SetStateAction,
  type SyntheticEvent,
} from "react";

import {
  StableButton,
  StableCtaLink,
  StableDisclosureSummary,
} from "../../components/StableButton";
import { APP_ROUTES, routeWithCommunity } from "../../lib/appRoutes";
import type {
  ExpectedPaymentRecord,
  LinkCenterTool,
  MarketplaceGlyphName,
  MarketplaceShop,
  NoticeTone,
  RepostProductOption,
  RepostTargetSuggestion,
} from "../MarketplacePage";
import type {
  MarketplaceActionKind,
  MarketplaceFieldTouchProps,
  MarketplaceSectionKey,
  MarketplaceSurfaceTouchProps,
} from "./MarketplaceSupportTypes";

const PaymentProofSubmissionPanel = lazy(
  () => import("../../components/PaymentProofSubmissionPanel")
);

const SocialTagShareButton = lazy(
  () => import("../../components/SocialTagShareButton")
);

type MarketplaceGlyphComponent = (props: {
  name: MarketplaceGlyphName;
  size?: number;
}) => React.ReactElement | null;

type MarketplaceChoiceOption = {
  value: string;
  label: string;
};

type MarketplaceAppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];

type MarketplaceLinkRowStatus = "ready" | "warn" | "idle";

export type MarketplaceToolsSectionData = {
  MarketplaceGlyph: MarketplaceGlyphComponent;
  activeCommunityId: number;
  activeLinkCenterTool: LinkCenterTool | null;
  canManageMarketplaceLinks: boolean;
  canPlaceMarketplaceRepost: boolean;
  availableMarketplaceRepostCredits: number;
  badge: (primary?: boolean) => CSSProperties;
  creatingInviteLink: boolean;
  displayGsnLabel: (value: unknown) => string;
  emailFreshPublicShopLink: () => Promise<void>;
  firstPublicIdentity: (...values: unknown[]) => string;
  firstTruthy: (...values: unknown[]) => string;
  handleCreateInviteLink: (opts?: {
    quiet?: boolean;
    force?: boolean;
  }) => Promise<boolean>;
  JOIN_KNOWN_DURATION_OPTIONS: readonly MarketplaceChoiceOption[];
  JOIN_RELATIONSHIP_OPTIONS: readonly MarketplaceChoiceOption[];
  joinRecipientReady: boolean;
  joinRelationshipReady: boolean;
  joinSenderReady: boolean;
  joinShareMessageCardStyle: (isCompact: boolean) => CSSProperties;
  loadMarketplaceRepostTargetSuggestions: (background?: boolean) => Promise<void>;
  marketplaceJoinActionsStyle: (isCompact: boolean) => CSSProperties;
  marketplaceJoinFieldLabelStyle: (isCompact: boolean) => CSSProperties;
  marketplaceJoinFieldShellStyle: (isCompact: boolean) => CSSProperties;
  marketplaceJoinLinkGuidance: string;
  maskedMarketplaceFaceLabel: string;
  openReadyPublicShopLink: () => void;
  positiveNumber: (value: unknown) => number;
  publicShopSocialPackage: string;
  publicShopSocialPreviewLink: string;
  repostProductLabel: (product: RepostProductOption | null) => string;
  repostProductPriceLabel: (product: RepostProductOption | null) => string;
  resolvedRepostDurationDays: number;
  resolvedRepostTargetCommunityInput: string;
  routeRepostBlockNumber: number;
  routeRepostProductId: number;
  safeCopy: (text: string) => Promise<boolean>;
  setJoinRelationshipEvidenceRecordedKey: Dispatch<SetStateAction<string>>;
  shopEmailSubject: string;
  cancelMarketplaceSectionScroll: () => void;
  compactStatusPillStyle: (primary?: boolean) => CSSProperties;
  copyFreshPublicShopLink: () => Promise<void>;
  copyJoinInviteMessage: () => Promise<void>;
  copyMarketplaceLink: (
    link: string,
    successText: string,
    missingText: string,
    customMessage?: string
  ) => Promise<void>;
  createMarketplaceRepostPaymentInstruction: () => Promise<void>;
  creatingRepostPaymentInstruction: boolean;
  formatRailMoney: (amount: unknown, currency?: string) => string;
  helperText: () => CSSProperties;
  inputStyle: () => CSSProperties;
  inviteLink: string;
  isCompact: boolean;
  joinEmailSubject: string;
  joinInviteDoorwayMessage: string;
  joinInviteManualCopyMessage: string;
  joinInviteShareReady: boolean;
  joinInviteTrustReady: boolean;
  joinRelationshipStatusText: string;
  latestRepostPayment: ExpectedPaymentRecord | null;
  latestRepostPaymentAmount: string;
  latestRepostPaymentReference: string;
  latestRepostPaymentStatus: string;
  linkReserveTextStyle: () => CSSProperties;
  loadingRepostCredits: boolean;
  loadingRepostProducts: boolean;
  loadingRepostTargetSuggestions: boolean;
  marketplaceActionStyle: (
    kind?: MarketplaceActionKind,
    disabled?: boolean
  ) => CSSProperties;
  marketplaceEmailMessage: string;
  marketplaceEmailSubject: string;
  marketplaceFieldTouchProps: (debugId: string) => MarketplaceFieldTouchProps;
  marketplaceInlineActionStyle: (
    kind: MarketplaceActionKind,
    disabled: boolean,
    isCompact: boolean
  ) => CSSProperties;
  marketplaceInlineActionsStyle: (isCompact: boolean) => CSSProperties;
  marketplaceJoinFixedFieldStyle: (isCompact: boolean) => CSSProperties;
  marketplaceJoinLinkMissingMessage: string;
  marketplaceJoinPreviewPendingMessage: string;
  marketplaceLinkActiveToolStackStyle: () => CSSProperties;
  marketplaceLinkChooserButtonStyle: (
    isCompact: boolean,
    primary?: boolean
  ) => CSSProperties;
  marketplaceLinkChooserDetailStyle: (isCompact: boolean) => CSSProperties;
  marketplaceLinkChooserGridStyle: (isCompact: boolean) => CSSProperties;
  marketplaceLinkChooserTextStyle: () => CSSProperties;
  marketplaceLinkChooserTitleStyle: (isCompact: boolean) => CSSProperties;
  marketplaceLinkHeroBodyStyle: (isCompact: boolean) => CSSProperties;
  marketplaceLinkHeroIconStyle: (isCompact: boolean) => CSSProperties;
  marketplaceLinkHeroPillRowStyle: () => CSSProperties;
  marketplaceLinkHeroPillStyle: () => CSSProperties;
  marketplaceLinkHeroStyle: (isCompact: boolean) => CSSProperties;
  marketplaceLinkHeroSubtitleStyle: (isCompact: boolean) => CSSProperties;
  marketplaceLinkHeroTitleStyle: (isCompact: boolean) => CSSProperties;
  marketplaceLinkMiniIconStyle: () => CSSProperties;
  marketplaceLinkRowHeaderStyle: (isCompact: boolean) => CSSProperties;
  marketplaceLinkRowIconStyle: (
    tone: "blue" | "gold" | "green" | "navy" | "purple",
    isCompact: boolean
  ) => CSSProperties;
  marketplaceLinkRowStatusStyle: (
    status: MarketplaceLinkRowStatus,
    isCompact: boolean
  ) => CSSProperties;
  marketplaceLinkRowStyle: (
    isCompact: boolean,
    expanded?: boolean
  ) => CSSProperties;
  marketplaceLinkRowSubStyle: (isCompact: boolean) => CSSProperties;
  marketplaceLinkRowTitleStyle: (isCompact: boolean) => CSSProperties;
  marketplaceLinkToolHeaderStyle: (isCompact: boolean) => CSSProperties;
  marketplaceRepostLocked: boolean;
  marketplaceSectionStyle: () => CSSProperties;
  marketplaceSurfaceTouchProps: (debugId: string) => MarketplaceSurfaceTouchProps;
  missingMarketplaceRepostCredits: number;
  openMarketplaceEmail: (
    subject: string,
    body: string,
    link: string,
    missingText: string
  ) => void;
  openMarketplaceExternalLink: (url: string, missingText: string) => void;
  openMarketplaceRoute: (
    event: SyntheticEvent<HTMLElement> | undefined,
    to: MarketplaceAppRoute
  ) => void;
  openMarketplaceSection: (
    event: SyntheticEvent<HTMLElement> | undefined,
    key: MarketplaceSectionKey,
    sectionId: string
  ) => void;
  pageCard: (bg?: string) => CSSProperties;
  pendingMarketplaceSectionRef: RefObject<string>;
  personalizedInviteLink: string;
  personalizedInviteMaskedLabel: string;
  placingMarketplaceRepost: boolean;
  preparePublicShopLink: () => Promise<string>;
  preparingPublicShopLink: boolean;
  publicCommunityWorkspaceLink: string;
  publicShopActionUnavailableMessage: (
    isPreparing: boolean,
    fallbackText: string
  ) => string;
  publicShopActionsLocked: boolean;
  publicShopRecord: MarketplaceShop | null;
  publicShopSocialLink: string;
  publicShopUnavailableText: string;
  publicShopViewLink: string;
  refreshMarketplaceRepostCredits: () => Promise<void>;
  requiredMarketplaceRepostAmount: number;
  requiredMarketplaceRepostCredits: number;
  requireJoinInviteTrustEvidence: () => boolean;
  repostDurationDays: string;
  repostTargetMarketplaceId: string;
  repostTargetSuggestionError: string;
  repostTargetSuggestions: RepostTargetSuggestion[];
  runMarketplaceAction: (
    event: SyntheticEvent<HTMLElement> | undefined,
    action: () => void
  ) => void;
  safeStr: (value: unknown) => string;
  sectionLabel: () => CSSProperties;
  sectionsOpen: Record<MarketplaceSectionKey, boolean>;
  selectedRepostProduct: RepostProductOption | null;
  selectedRepostProductImageSrc: string;
  selectedRepostProductPublicLink: string;
  selectedRepostProductVideoSrc: string;
  setActiveLinkCenterTool: Dispatch<SetStateAction<LinkCenterTool | null>>;
  setCreatedRepostInstruction: Dispatch<
    SetStateAction<ExpectedPaymentRecord | null>
  >;
  setJoinInviteNote: Dispatch<SetStateAction<string>>;
  setJoinKnownDuration: Dispatch<SetStateAction<string>>;
  setJoinRecipientName: Dispatch<SetStateAction<string>>;
  setJoinRelationshipContext: Dispatch<SetStateAction<string>>;
  setJoinRelationshipType: Dispatch<SetStateAction<string>>;
  setJoinSenderName: Dispatch<SetStateAction<string>>;
  setRepostDurationDays: Dispatch<SetStateAction<string>>;
  setRepostExpectedPayments: Dispatch<SetStateAction<ExpectedPaymentRecord[]>>;
  setRepostTargetMarketplaceId: Dispatch<SetStateAction<string>>;
  setSelectedRepostProductId: Dispatch<SetStateAction<number>>;
  showNotice: (tone: NoticeTone, text: string) => void;
  stableStatusPillStyle: (primary?: boolean) => CSSProperties;
  submitMarketplaceRepost: () => Promise<void>;
  toggleSectionFromButton: (
    event: SyntheticEvent<HTMLElement> | undefined,
    key: MarketplaceSectionKey
  ) => void;
  visibleRepostProducts: RepostProductOption[];
  joinSenderName: string;
  joinRecipientName: string;
  joinInviteNote: string;
  joinRelationshipType: string;
  joinKnownDuration: string;
  joinRelationshipContext: string;
};

type MarketplaceToolsSectionProps = {
  data: MarketplaceToolsSectionData;
};

export default function MarketplaceToolsSection({ data }: MarketplaceToolsSectionProps) {
  const {
    MarketplaceGlyph,
    activeCommunityId,
    activeLinkCenterTool,
    canManageMarketplaceLinks,
    canPlaceMarketplaceRepost,
    availableMarketplaceRepostCredits,
    badge,
    creatingInviteLink,
    displayGsnLabel,
    emailFreshPublicShopLink,
    firstPublicIdentity,
    firstTruthy,
    handleCreateInviteLink,
    JOIN_KNOWN_DURATION_OPTIONS,
    JOIN_RELATIONSHIP_OPTIONS,
    joinRecipientReady,
    joinRelationshipReady,
    joinSenderReady,
    joinShareMessageCardStyle,
    loadMarketplaceRepostTargetSuggestions,
    marketplaceJoinActionsStyle,
    marketplaceJoinFieldLabelStyle,
    marketplaceJoinFieldShellStyle,
    marketplaceJoinLinkGuidance,
    maskedMarketplaceFaceLabel,
    openReadyPublicShopLink,
    positiveNumber,
    publicShopSocialPackage,
    publicShopSocialPreviewLink,
    repostProductLabel,
    repostProductPriceLabel,
    resolvedRepostDurationDays,
    resolvedRepostTargetCommunityInput,
    routeRepostBlockNumber,
    routeRepostProductId,
    safeCopy,
    setJoinRelationshipEvidenceRecordedKey,
    shopEmailSubject,
    cancelMarketplaceSectionScroll,
    compactStatusPillStyle,
    copyFreshPublicShopLink,
    copyJoinInviteMessage,
    copyMarketplaceLink,
    createMarketplaceRepostPaymentInstruction,
    creatingRepostPaymentInstruction,
    formatRailMoney,
    helperText,
    inputStyle,
    inviteLink,
    isCompact,
    joinEmailSubject,
    joinInviteDoorwayMessage,
    joinInviteManualCopyMessage,
    joinInviteShareReady,
    joinInviteTrustReady,
    joinRelationshipStatusText,
    latestRepostPayment,
    latestRepostPaymentAmount,
    latestRepostPaymentReference,
    latestRepostPaymentStatus,
    linkReserveTextStyle,
    loadingRepostCredits,
    loadingRepostProducts,
    loadingRepostTargetSuggestions,
    marketplaceActionStyle,
    marketplaceEmailMessage,
    marketplaceEmailSubject,
    marketplaceFieldTouchProps,
    marketplaceInlineActionStyle,
    marketplaceInlineActionsStyle,
    marketplaceJoinFixedFieldStyle,
    marketplaceJoinLinkMissingMessage,
    marketplaceJoinPreviewPendingMessage,
    marketplaceLinkActiveToolStackStyle,
    marketplaceLinkChooserButtonStyle,
    marketplaceLinkChooserDetailStyle,
    marketplaceLinkChooserGridStyle,
    marketplaceLinkChooserTextStyle,
    marketplaceLinkChooserTitleStyle,
    marketplaceLinkHeroBodyStyle,
    marketplaceLinkHeroIconStyle,
    marketplaceLinkHeroPillRowStyle,
    marketplaceLinkHeroPillStyle,
    marketplaceLinkHeroStyle,
    marketplaceLinkHeroSubtitleStyle,
    marketplaceLinkHeroTitleStyle,
    marketplaceLinkMiniIconStyle,
    marketplaceLinkRowHeaderStyle,
    marketplaceLinkRowIconStyle,
    marketplaceLinkRowStatusStyle,
    marketplaceLinkRowStyle,
    marketplaceLinkRowSubStyle,
    marketplaceLinkRowTitleStyle,
    marketplaceLinkToolHeaderStyle,
    marketplaceRepostLocked,
    marketplaceSectionStyle,
    marketplaceSurfaceTouchProps,
    missingMarketplaceRepostCredits,
    openMarketplaceEmail,
    openMarketplaceExternalLink,
    openMarketplaceRoute,
    openMarketplaceSection,
    pageCard,
    pendingMarketplaceSectionRef,
    personalizedInviteLink,
    personalizedInviteMaskedLabel,
    placingMarketplaceRepost,
    preparePublicShopLink,
    preparingPublicShopLink,
    publicCommunityWorkspaceLink,
    publicShopActionUnavailableMessage,
    publicShopActionsLocked,
    publicShopRecord,
    publicShopSocialLink,
    publicShopUnavailableText,
    publicShopViewLink,
    refreshMarketplaceRepostCredits,
    requiredMarketplaceRepostAmount,
    requiredMarketplaceRepostCredits,
    requireJoinInviteTrustEvidence,
    repostDurationDays,
    repostTargetMarketplaceId,
    repostTargetSuggestionError,
    repostTargetSuggestions,
    runMarketplaceAction,
    safeStr,
    sectionLabel,
    sectionsOpen,
    selectedRepostProduct,
    selectedRepostProductImageSrc,
    selectedRepostProductPublicLink,
    selectedRepostProductVideoSrc,
    setActiveLinkCenterTool,
    setCreatedRepostInstruction,
    setJoinInviteNote,
    setJoinKnownDuration,
    setJoinRecipientName,
    setJoinRelationshipContext,
    setJoinRelationshipType,
    setJoinSenderName,
    setRepostDurationDays,
    setRepostExpectedPayments,
    setRepostTargetMarketplaceId,
    setSelectedRepostProductId,
    showNotice,
    stableStatusPillStyle,
    submitMarketplaceRepost,
    toggleSectionFromButton,
    visibleRepostProducts,
    joinSenderName,
    joinRecipientName,
    joinInviteNote,
    joinRelationshipType,
    joinKnownDuration,
    joinRelationshipContext,
  } = data;

  return (
    <>      {sectionsOpen.tools ? (
      <section
        id="marketplace-owned-links"
        style={{ ...pageCard("#FFFFFF"), ...marketplaceSectionStyle(), order: 4 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={sectionLabel()}>
            {activeLinkCenterTool === "repost" ? "Marketing tools" : "Access & public links"}
          </div>
          <StableButton
            debugId="marketplace.links.toggle"
            type="button"
            onClick={(event) => toggleSectionFromButton(event, "tools")}
            stableHeight={52}
            style={{
              ...marketplaceActionStyle("soft"),
              width: 112,
              height: 52,
              minHeight: 52,
              maxHeight: 52,
            }}
          >
            <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
              <MarketplaceGlyph
                name={sectionsOpen.tools ? "chevronUp" : "chevron"}
                size={18}
              />
            </span>
            {sectionsOpen.tools ? "Close" : "Open"}
          </StableButton>
        </div>

        <div style={marketplaceLinkHeroStyle(isCompact)}>
          <div aria-hidden="true" style={marketplaceLinkHeroIconStyle(isCompact)}>
            <MarketplaceGlyph
              name={activeLinkCenterTool === "repost" ? "repost" : "links"}
              size={isCompact ? 42 : 52}
            />
          </div>
          <div style={marketplaceLinkHeroBodyStyle(isCompact)}>
            <div>
              <div style={marketplaceLinkHeroTitleStyle(isCompact)}>
                {activeLinkCenterTool === "repost" ? "Marketing Tools" : "Access & Public Links"}
              </div>
              <div style={marketplaceLinkHeroSubtitleStyle(isCompact)}>
                {activeLinkCenterTool === "repost"
                  ? "Place a shop block into another Spotlight lane, open Spotlight, or record trade evidence."
                  : "Verify the community, invite someone, start your own community, or share the public shop."}
              </div>
            </div>
            <div style={marketplaceLinkHeroPillRowStyle()}>
              <span style={marketplaceLinkHeroPillStyle()}>
                <MarketplaceGlyph name="links" size={16} />
                {activeLinkCenterTool === "repost" ? "4 marketing jobs" : "4 link jobs"}
              </span>
              <span style={marketplaceLinkHeroPillStyle()}>
                <MarketplaceGlyph name="spark" size={16} />
                {activeLinkCenterTool === "repost" ? "Repost selected" : "1 active"}
              </span>
              <span style={marketplaceLinkHeroPillStyle()}>
                <MarketplaceGlyph name="verify" size={16} />
                {activeLinkCenterTool === "repost" ? "Marketplace-safe" : "Fast links"}
              </span>
            </div>
          </div>
        </div>

        {sectionsOpen.tools ? (
          <>
            {!activeLinkCenterTool ? (
              <div style={marketplaceLinkChooserGridStyle(isCompact)}>
                <StableButton
                  debugId="marketplace.links.choose.verify"
                  type="button"
                  onClick={(event) =>
                    runMarketplaceAction(event, () => {
                      cancelMarketplaceSectionScroll();
                      pendingMarketplaceSectionRef.current = "";
                      setActiveLinkCenterTool("verify");
                    })
                  }
                  stableHeight={isCompact ? 68 : 88}
                  style={marketplaceLinkChooserButtonStyle(isCompact, true)}
                >
                  <span aria-hidden="true" style={marketplaceLinkRowIconStyle("navy", isCompact)}>
                    <MarketplaceGlyph name="verify" size={isCompact ? 24 : 28} />
                  </span>
                  <span style={marketplaceLinkChooserTextStyle()}>
                    <span style={marketplaceLinkChooserTitleStyle(isCompact)}>
                      Verify Community
                    </span>
                    <span style={marketplaceLinkChooserDetailStyle(isCompact)}>
                      Open or copy the public community record.
                    </span>
                  </span>
                </StableButton>
                <StableButton
                  debugId="marketplace.links.choose.join"
                  type="button"
                  onClick={(event) =>
                    runMarketplaceAction(event, () => {
                      cancelMarketplaceSectionScroll();
                      pendingMarketplaceSectionRef.current = "";
                      setActiveLinkCenterTool("join");
                    })
                  }
                  stableHeight={isCompact ? 68 : 88}
                  style={marketplaceLinkChooserButtonStyle(isCompact)}
                >
                  <span aria-hidden="true" style={marketplaceLinkRowIconStyle("blue", isCompact)}>
                    <MarketplaceGlyph name="join" size={isCompact ? 24 : 28} />
                  </span>
                  <span style={marketplaceLinkChooserTextStyle()}>
                    <span style={marketplaceLinkChooserTitleStyle(isCompact)}>
                      Invite Someone
                    </span>
                    <span style={marketplaceLinkChooserDetailStyle(isCompact)}>
                      Prepare a trusted join invite.
                    </span>
                  </span>
                </StableButton>
                <StableButton
                  debugId="marketplace.links.choose.create-community"
                  type="button"
                  onClick={(event) => {
                    cancelMarketplaceSectionScroll();
                    pendingMarketplaceSectionRef.current = "";
                    openMarketplaceRoute(event, APP_ROUTES.CLANS);
                  }}
                  stableHeight={isCompact ? 68 : 88}
                  style={marketplaceLinkChooserButtonStyle(isCompact)}
                >
                  <span aria-hidden="true" style={marketplaceLinkRowIconStyle("navy", isCompact)}>
                    <MarketplaceGlyph name="members" size={isCompact ? 24 : 28} />
                  </span>
                  <span style={marketplaceLinkChooserTextStyle()}>
                    <span style={marketplaceLinkChooserTitleStyle(isCompact)}>
                      Create Community
                    </span>
                    <span style={marketplaceLinkChooserDetailStyle(isCompact)}>
                      Start your own group with the same GSN ID.
                    </span>
                  </span>
                </StableButton>
                <StableButton
                  debugId="marketplace.links.choose.shop-face"
                  type="button"
                  onClick={(event) =>
                    runMarketplaceAction(event, () => {
                      cancelMarketplaceSectionScroll();
                      pendingMarketplaceSectionRef.current = "";
                      setActiveLinkCenterTool("shopFace");
                    })
                  }
                  stableHeight={isCompact ? 68 : 88}
                  style={marketplaceLinkChooserButtonStyle(isCompact)}
                >
                  <span aria-hidden="true" style={marketplaceLinkRowIconStyle("gold", isCompact)}>
                    <MarketplaceGlyph name="shop" size={isCompact ? 24 : 28} />
                  </span>
                  <span style={marketplaceLinkChooserTextStyle()}>
                    <span style={marketplaceLinkChooserTitleStyle(isCompact)}>
                      Public Shop Face
                    </span>
                    <span style={marketplaceLinkChooserDetailStyle(isCompact)}>
                      Refresh, copy, share, or open the shop link.
                    </span>
                  </span>
                </StableButton>
              </div>
            ) : (
              <>
                <div style={marketplaceLinkToolHeaderStyle(isCompact)}>
                  <div style={{ minWidth: 0 }}>
                    <div style={sectionLabel()}>
                      {activeLinkCenterTool === "repost"
                        ? "Selected Marketing Tool"
                        : "Selected Link Center tool"}
                    </div>
                    <div style={marketplaceLinkHeroSubtitleStyle(isCompact)}>
                      {activeLinkCenterTool === "join"
                        ? "Join Invite"
                        : activeLinkCenterTool === "verify"
                          ? "Verify Community"
                          : activeLinkCenterTool === "shopFace"
                          ? "Public Shop Face"
                          : activeLinkCenterTool === "repost"
                            ? "Paid Repost"
                            : "Access & Public Links"}
                    </div>
                  </div>
                  <StableButton
                    debugId="marketplace.links.back-to-center"
                    type="button"
                    onClick={(event) =>
                      runMarketplaceAction(event, () => setActiveLinkCenterTool(null))
                    }
                    stableHeight={52}
                    style={{
                      ...marketplaceActionStyle("soft"),
                      width: "100%",
                      height: 52,
                      minHeight: 52,
                      maxHeight: 52,
                    }}
                  >
                    <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                      <MarketplaceGlyph name="chevron" size={18} />
                    </span>
                    {activeLinkCenterTool === "repost"
                      ? "Back to Marketing Tools"
                      : "Back to Link Center"}
                  </StableButton>
                </div>
                <div style={marketplaceLinkActiveToolStackStyle()}>
                {activeLinkCenterTool === "join" ? (
                <div
                  {...marketplaceSurfaceTouchProps("marketplace.links.join.surface")}
                  style={marketplaceLinkRowStyle(isCompact, true)}
                >
                  <div style={marketplaceLinkRowHeaderStyle(isCompact)}>
                    <span
                      aria-hidden="true"
                      style={marketplaceLinkRowIconStyle("blue", isCompact)}
                    >
                      <MarketplaceGlyph name="join" size={isCompact ? 25 : 30} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={sectionLabel()}>Join this community</div>
                      <div style={marketplaceLinkRowTitleStyle(isCompact)}>
                        {isCompact ? "1. Join" : "1. Join Community"}
                      </div>
                      <div style={marketplaceLinkRowSubStyle(isCompact)}>
                        {isCompact ? "Community invite" : "Invite someone into this marketplace."}
                      </div>
                    </div>
                    <span
                      style={marketplaceLinkRowStatusStyle(
                        joinInviteTrustReady
                          ? "ready"
                          : joinInviteShareReady
                            ? "ready"
                            : canManageMarketplaceLinks
                            ? "warn"
                            : "idle",
                        isCompact
                      )}
                    >
                      {canManageMarketplaceLinks ? joinRelationshipStatusText : "Member"}
                    </span>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <span style={compactStatusPillStyle(joinInviteShareReady)}>
                      {joinInviteShareReady
                        ? "Community join link ready"
                        : creatingInviteLink
                          ? "Preparing reusable join link"
                        : !joinSenderReady
                          ? "Add sender name first"
                        : !joinRecipientReady
                          ? "Add receiver name first"
                        : !joinRelationshipReady
                          ? "Add relationship evidence first"
                        : canManageMarketplaceLinks
                            ? "GSN prepares the reusable link automatically"
                          : "Select an active community first"}
                    </span>
                  </div>
                  <div style={linkReserveTextStyle()}>
                    <MarketplaceGlyph name={inviteLink ? "links" : "verify"} size={15} />
                    {inviteLink
                      ? personalizedInviteMaskedLabel
                      : marketplaceJoinLinkGuidance}
                  </div>
                  <div
                    style={{
                      ...marketplaceJoinFieldShellStyle(isCompact),
                      marginTop: isCompact ? 8 : 10,
                    }}
                  >
                    <label
                      htmlFor="marketplace-join-sender-name"
                      style={marketplaceJoinFieldLabelStyle(isCompact)}
                    >
                      From (sender)
                    </label>
                    <input
                      {...marketplaceFieldTouchProps("marketplace.join.sender-name")}
                      id="marketplace-join-sender-name"
                      type="text"
                      value={joinSenderName}
                      onChange={(event) => setJoinSenderName(event.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                      enterKeyHint="next"
                      aria-label="Sender name for join invitation"
                      style={marketplaceJoinFixedFieldStyle(isCompact)}
                    />
                  </div>
                  <div
                    style={{
                      marginTop: isCompact ? 8 : 10,
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                      gap: isCompact ? 8 : 10,
                    }}
                  >
                    <div
                      style={marketplaceJoinFieldShellStyle(isCompact)}
                    >
                      <label
                        htmlFor="marketplace-join-recipient-name"
                        style={marketplaceJoinFieldLabelStyle(isCompact)}
                      >
                        Receiver name
                      </label>
                      <input
                        {...marketplaceFieldTouchProps("marketplace.join.recipient-name")}
                        id="marketplace-join-recipient-name"
                        type="text"
                        value={joinRecipientName}
                        onChange={(event) => setJoinRecipientName(event.target.value)}
                        placeholder="Receiver name"
                        autoComplete="off"
                        enterKeyHint="next"
                        style={marketplaceJoinFixedFieldStyle(isCompact)}
                        aria-label="Receiver name for join invitation"
                      />
                    </div>
                    <div
                      style={marketplaceJoinFieldShellStyle(isCompact)}
                    >
                      <label
                        htmlFor="marketplace-join-invite-note"
                        style={marketplaceJoinFieldLabelStyle(isCompact)}
                      >
                        Message to receiver (optional)
                      </label>
                      <input
                        {...marketplaceFieldTouchProps("marketplace.join.invite-note")}
                        id="marketplace-join-invite-note"
                        type="text"
                        value={joinInviteNote}
                        onChange={(event) => setJoinInviteNote(event.target.value)}
                        placeholder="Short note"
                        autoComplete="off"
                        enterKeyHint="next"
                        style={marketplaceJoinFixedFieldStyle(isCompact)}
                        aria-label="Short personal message for join invitation"
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: isCompact ? 8 : 10,
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                      gap: isCompact ? 8 : 10,
                    }}
                  >
                    <div
                      style={marketplaceJoinFieldShellStyle(isCompact)}
                    >
                      <label
                        htmlFor="marketplace-join-relationship-type"
                        style={marketplaceJoinFieldLabelStyle(isCompact)}
                      >
                        How do you know this person?
                      </label>
                      <select
                        {...marketplaceFieldTouchProps("marketplace.join.relationship-type")}
                        id="marketplace-join-relationship-type"
                        value={joinRelationshipType}
                        onChange={(event) => {
                          setJoinRelationshipType(event.target.value);
                          setJoinRelationshipEvidenceRecordedKey("");
                        }}
                        style={marketplaceJoinFixedFieldStyle(isCompact)}
                        aria-label="How you know the person you are inviting"
                      >
                        <option value="">Choose one</option>
                        {JOIN_RELATIONSHIP_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div
                      style={marketplaceJoinFieldShellStyle(isCompact)}
                    >
                      <label
                        htmlFor="marketplace-join-known-duration"
                        style={marketplaceJoinFieldLabelStyle(isCompact)}
                      >
                        How long have you known them?
                      </label>
                      <select
                        {...marketplaceFieldTouchProps("marketplace.join.known-duration")}
                        id="marketplace-join-known-duration"
                        value={joinKnownDuration}
                        onChange={(event) => {
                          setJoinKnownDuration(event.target.value);
                          setJoinRelationshipEvidenceRecordedKey("");
                        }}
                        style={marketplaceJoinFixedFieldStyle(isCompact)}
                        aria-label="How long you have known the person you are inviting"
                      >
                        <option value="">Choose one</option>
                        {JOIN_KNOWN_DURATION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div
                    style={{
                      ...marketplaceJoinFieldShellStyle(isCompact),
                      marginTop: isCompact ? 8 : 10,
                      height: isCompact ? 114 : 118,
                      minHeight: isCompact ? 114 : 118,
                      maxHeight: isCompact ? 114 : 118,
                    }}
                  >
                    <label
                      htmlFor="marketplace-join-relationship-context"
                      style={marketplaceJoinFieldLabelStyle(isCompact)}
                    >
                      Private GSN relationship note (optional)
                    </label>
                    <textarea
                      {...marketplaceFieldTouchProps("marketplace.join.relationship-context")}
                      id="marketplace-join-relationship-context"
                      value={joinRelationshipContext}
                      onChange={(event) => {
                        setJoinRelationshipContext(event.target.value);
                        setJoinRelationshipEvidenceRecordedKey("");
                      }}
                      placeholder="Private note, not sent in the invite message"
                      rows={1}
                      style={{
                        ...marketplaceJoinFixedFieldStyle(isCompact),
                        resize: "none",
                        overflowY: "hidden",
                      }}
                      aria-label="Private relationship note about how you know the invited person"
                    />
                    <span
                      style={{
                        ...helperText(),
                        fontSize: 10.5,
                        lineHeight: 1.22,
                        fontWeight: 800,
                        color: "#6A4B0B",
                      }}
                    >
                      Private trust note only. Do not add phone numbers, bank
                      details, exact addresses, or gossip.
                    </span>
                  </div>
                  <div
                    {...marketplaceSurfaceTouchProps("marketplace.links.join.actions")}
                    style={marketplaceJoinActionsStyle(isCompact)}
                  >
                    {!isCompact ? (
                      <StableButton
                        debugId="marketplace.links.join.copy"
                        type="button"
                        onClick={(event) => {
                          runMarketplaceAction(event, () => {
                            if (!requireJoinInviteTrustEvidence()) return;
                            copyMarketplaceLink(
                              personalizedInviteLink,
                              "GSN join link copied.",
                              marketplaceJoinLinkMissingMessage
                            );
                          });
                        }}
                        style={marketplaceInlineActionStyle(
                          "primary",
                          !joinInviteTrustReady,
                          isCompact
                        )}
                      >
                        <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                          <MarketplaceGlyph name="copy" size={18} />
                        </span>
                        Copy Join Link
                      </StableButton>
                    ) : null}
                    <StableButton
                      debugId="marketplace.links.join.refresh"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          void handleCreateInviteLink();
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        isCompact ? "primary" : "secondary",
                        creatingInviteLink ||
                          !canManageMarketplaceLinks ||
                          !joinRelationshipReady,
                        isCompact
                      )}
                    >
                      {creatingInviteLink
                        ? "Preparing..."
                        : canManageMarketplaceLinks
                          ? (
                            <>
                              <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                                <MarketplaceGlyph name="refresh" size={18} />
                              </span>
                              {joinInviteTrustReady ? "Link Ready" : "Prepare Link"}
                            </>
                          )
                          : "Community needed"}
                    </StableButton>
                    <StableButton
                      debugId="marketplace.links.join.copy-message"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          void copyJoinInviteMessage();
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        isCompact ? "primary" : "secondary",
                        !joinInviteShareReady,
                        isCompact
                      )}
                    >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="copy" size={18} />
                      </span>
                      {isCompact ? "Copy Invite" : "Copy Invite Message"}
                    </StableButton>
                    {!isCompact ? (
                      <StableButton
                        debugId="marketplace.links.join.email"
                        type="button"
                        onClick={(event) => {
                          runMarketplaceAction(event, () => {
                            if (!requireJoinInviteTrustEvidence()) return;
                            openMarketplaceEmail(
                              joinEmailSubject,
                              joinInviteDoorwayMessage,
                              personalizedInviteLink,
                              marketplaceJoinLinkMissingMessage
                            );
                          });
                        }}
                        style={marketplaceInlineActionStyle(
                          "secondary",
                          !joinInviteShareReady,
                          isCompact
                        )}
                      >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="email" size={18} />
                      </span>
                        Email Join Link
                      </StableButton>
                    ) : null}
                    <StableButton
                      debugId="marketplace.links.join.whatsapp"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          if (!requireJoinInviteTrustEvidence()) return;
                          openMarketplaceExternalLink(
                            `https://wa.me/?text=${encodeURIComponent(joinInviteDoorwayMessage)}`,
                            marketplaceJoinLinkMissingMessage
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !joinInviteShareReady,
                        isCompact
                      )}
                    >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="whatsapp" size={18} />
                      </span>
                      WhatsApp
                    </StableButton>
                    {!isCompact ? (
                      <Suspense fallback={null}>
                        <SocialTagShareButton
                          target={{
                            title: joinEmailSubject,
                            message: joinInviteDoorwayMessage,
                            url: personalizedInviteLink,
                          }}
                          disabled={!joinInviteShareReady}
                          buttonLabel="Share"
                          stableHeight={58}
                          debugId="marketplace.links.join.tag-social"
                          style={marketplaceInlineActionStyle(
                            "secondary",
                            !joinInviteShareReady,
                            isCompact
                          )}
                          onResult={showNotice}
                        />
                      </Suspense>
                    ) : null}
                  </div>
                  {joinInviteManualCopyMessage ? (
                    <div
                      style={{
                        ...joinShareMessageCardStyle(isCompact),
                        height: isCompact ? 224 : 238,
                        minHeight: isCompact ? 224 : 238,
                        maxHeight: isCompact ? 224 : 238,
                      }}
                    >
                      <div style={sectionLabel()}>Invite text</div>
                      <textarea
                        {...marketplaceFieldTouchProps("marketplace.join.manual-copy")}
                        id="marketplace-join-manual-copy"
                        readOnly
                        value={joinInviteManualCopyMessage}
                        onFocus={(event) => event.currentTarget.select()}
                        onClick={(event) => event.currentTarget.select()}
                        aria-label="Prepared join invite text"
                        rows={5}
                        style={{
                          marginTop: 8,
                          width: "100%",
                          minHeight: isCompact ? 170 : 184,
                          maxHeight: isCompact ? 170 : 184,
                          resize: "none",
                          border: "1px solid rgba(148, 163, 184, 0.42)",
                          borderRadius: 14,
                          background: "#FFFFFF",
                          color: "#102033",
                          fontSize: 16,
                          lineHeight: 1.38,
                          fontWeight: 800,
                          padding: isCompact ? "12px 13px" : "14px 16px",
                          boxSizing: "border-box",
                          WebkitUserSelect: "text",
                          userSelect: "text",
                        }}
                      />
                    </div>
                  ) : null}
                  {!isCompact ? (
                    <div style={joinShareMessageCardStyle(isCompact)}>
                      <div style={sectionLabel()}>Message to send</div>
                      <div
                        style={{
                          marginTop: 8,
                          ...helperText(),
                          whiteSpace: "pre-line",
                          fontSize: 13,
                        }}
                      >
                        {inviteLink
                          ? joinInviteDoorwayMessage
                          : marketplaceJoinPreviewPendingMessage}
                      </div>
                    </div>
                  ) : null}
                </div>
                ) : null}

                {activeLinkCenterTool === "verify" ? (
                <div style={marketplaceLinkRowStyle(isCompact, true)}>
                  <div style={marketplaceLinkRowHeaderStyle(isCompact)}>
                    <span
                      aria-hidden="true"
                      style={marketplaceLinkRowIconStyle("navy", isCompact)}
                    >
                      <MarketplaceGlyph name="verify" size={isCompact ? 25 : 30} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={marketplaceLinkRowTitleStyle(isCompact)}>
                        {isCompact ? "2. Verify" : "2. Verify Community"}
                      </div>
                      <div style={marketplaceLinkRowSubStyle(isCompact)}>
                        Public record
                      </div>
                    </div>
                    <span
                      style={marketplaceLinkRowStatusStyle(
                        publicCommunityWorkspaceLink ? "ready" : "idle",
                        isCompact
                      )}
                    >
                      {publicCommunityWorkspaceLink ? "Ready" : "Not ready yet"}
                    </span>
                  </div>
                  <div style={linkReserveTextStyle()}>
                    <MarketplaceGlyph name="verify" size={15} />
                    {publicCommunityWorkspaceLink
                      ? maskedMarketplaceFaceLabel
                      : "Community verification appears after the community context is ready."}
                  </div>
                  <div style={marketplaceInlineActionsStyle(isCompact)}>
                    <StableButton
                      debugId="marketplace.links.community-desk.copy"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          copyMarketplaceLink(
                            publicCommunityWorkspaceLink,
                            "GSN community verification package copied.",
                            "Community verification link is not ready yet.",
                            marketplaceEmailMessage
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !publicCommunityWorkspaceLink,
                        isCompact
                      )}
                    >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="copy" size={18} />
                      </span>
                      Copy Link
                    </StableButton>
                    <StableButton
                      debugId="marketplace.links.community-desk.email"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          openMarketplaceEmail(
                            marketplaceEmailSubject,
                            marketplaceEmailMessage,
                            publicCommunityWorkspaceLink,
                            "Community verification link is not ready yet."
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !publicCommunityWorkspaceLink,
                        isCompact
                      )}
                    >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="email" size={18} />
                      </span>
                      Email
                    </StableButton>
                    <StableButton
                      debugId="marketplace.links.community-desk.open"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          openMarketplaceExternalLink(
                            publicCommunityWorkspaceLink,
                            "Community verification link is not ready yet."
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !publicCommunityWorkspaceLink,
                        isCompact
                      )}
                    >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="open" size={18} />
                      </span>
                      Open
                    </StableButton>
                  </div>
                </div>
                ) : null}

                {activeLinkCenterTool === "shopFace" ? (
                <div style={marketplaceLinkRowStyle(isCompact, true)}>
                  <div style={marketplaceLinkRowHeaderStyle(isCompact)}>
                    <span
                      aria-hidden="true"
                      style={marketplaceLinkRowIconStyle("gold", isCompact)}
                    >
                      <MarketplaceGlyph name="shop" size={isCompact ? 25 : 30} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={marketplaceLinkRowTitleStyle(isCompact)}>
                        {isCompact ? "3. Shop Face" : "3. Public Shop Face"}
                      </div>
                      <div style={marketplaceLinkRowSubStyle(isCompact)}>
                        Storefront link
                      </div>
                    </div>
                    <span
                      style={{
                        ...stableStatusPillStyle(Boolean(publicShopViewLink)),
                        padding: "0 10px",
                        color: publicShopViewLink ? "#12633F" : "#8A5A05",
                        background: publicShopViewLink
                          ? "linear-gradient(180deg, #EEFBF4 0%, #D9F0E3 100%)"
                          : "linear-gradient(180deg, #FFF9E8 0%, #F6E6C3 100%)",
                        border: publicShopViewLink
                          ? "1px solid rgba(46,155,98,0.18)"
                          : "1px solid rgba(214,170,69,0.28)",
                        justifyContent: "center",
                        gridColumn: isCompact ? "2 / 3" : undefined,
                        justifySelf: isCompact ? "start" : undefined,
                        height: isCompact ? 28 : undefined,
                        minHeight: isCompact ? 28 : undefined,
                        maxHeight: isCompact ? 28 : undefined,
                      }}
                    >
                      {publicShopViewLink
                        ? "Ready"
                        : publicShopRecord
                        ? "Refreshing"
                        : "Needs refresh"}
                    </span>
                  </div>
                  <div style={linkReserveTextStyle()}>
                    <MarketplaceGlyph name="shop" size={15} />
                    {publicShopViewLink ? (
                      <StableCtaLink
                        to={publicShopViewLink}
                        target="_blank"
                        rel="noreferrer"
                        debugId="marketplace.public-shop.visible-link"
                        style={{
                          display: "inline",
                          width: "auto",
                          minWidth: 0,
                          minHeight: 0,
                          height: "auto",
                          padding: 0,
                          border: "0",
                          background: "transparent",
                          boxShadow: "none",
                          color: "inherit",
                          fontWeight: 850,
                          textDecoration: "underline",
                          textUnderlineOffset: 3,
                          touchAction: "manipulation",
                          overflowWrap: "normal",
                          wordBreak: "normal",
                          hyphens: "none",
                          lineHeight: 1.2,
                        }}
                      >
                        {publicShopViewLink}
                      </StableCtaLink>
                    ) : (
                      publicShopUnavailableText
                    )}
                  </div>
                  <div style={marketplaceInlineActionsStyle(isCompact)}>
                    <StableButton
                      type="button"
                      debugId="marketplace.public-shop.refresh"
                      stableHeight={58}
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          if (publicShopActionsLocked) {
                            showNotice(
                              "error",
                              publicShopActionUnavailableMessage(
                                preparingPublicShopLink,
                                publicShopUnavailableText
                              )
                            );
                            return;
                          }
                          void preparePublicShopLink();
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "primary",
                        publicShopActionsLocked,
                        isCompact
                      )}
                    >
                      {preparingPublicShopLink ? (
                        "Refreshing..."
                      ) : (
                        <>
                          <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                            <MarketplaceGlyph name="refresh" size={18} />
                          </span>
                          Refresh
                        </>
                      )}
                    </StableButton>
                    <StableButton
                      type="button"
                      debugId="marketplace.public-shop.copy"
                      stableHeight={58}
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          if (publicShopActionsLocked) {
                            showNotice(
                              "error",
                              publicShopActionUnavailableMessage(
                                preparingPublicShopLink,
                                publicShopUnavailableText
                              )
                            );
                            return;
                          }
                          void copyFreshPublicShopLink();
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        publicShopActionsLocked,
                        isCompact
                      )}
                    >
                      {preparingPublicShopLink ? (
                        "Refreshing..."
                      ) : (
                        <>
                          <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                            <MarketplaceGlyph name="copy" size={18} />
                          </span>
                          {isCompact ? "Copy Shop" : "Copy Shop Link"}
                        </>
                      )}
                    </StableButton>
                    <StableButton
                      type="button"
                      debugId="marketplace.public-shop.email"
                      stableHeight={58}
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          if (publicShopActionsLocked) {
                            showNotice(
                              "error",
                              publicShopActionUnavailableMessage(
                                preparingPublicShopLink,
                                publicShopUnavailableText
                              )
                            );
                            return;
                          }
                          void emailFreshPublicShopLink();
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        publicShopActionsLocked,
                        isCompact
                      )}
                    >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="email" size={18} />
                      </span>
                      {isCompact ? "Email" : "Email Link"}
                    </StableButton>
                    {!isCompact ? (
                      <Suspense fallback={null}>
                        <SocialTagShareButton
                          target={{
                            title: shopEmailSubject,
                            message: publicShopSocialPackage,
                            socialMessage: `${firstPublicIdentity(publicShopRecord?.name) || "Public GSN Shop"} on GSN. Public shop record. Open the shop link.`,
                            socialUrl: publicShopSocialPreviewLink,
                            url: publicShopSocialLink,
                          }}
                          disabled={publicShopActionsLocked || !publicShopSocialLink}
                          buttonLabel="Share"
                          stableHeight={58}
                          debugId="marketplace.public-shop.tag-social"
                          style={marketplaceInlineActionStyle(
                            "secondary",
                            publicShopActionsLocked || !publicShopSocialLink,
                            isCompact
                          )}
                          onResult={showNotice}
                        />
                      </Suspense>
                    ) : null}
                    <StableButton
                      type="button"
                      debugId="marketplace.public-shop.open"
                      stableHeight={58}
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          if (publicShopActionsLocked) {
                            showNotice(
                              "error",
                              publicShopActionUnavailableMessage(
                                preparingPublicShopLink,
                                publicShopUnavailableText
                              )
                            );
                            return;
                          }
                          openReadyPublicShopLink();
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        publicShopActionsLocked,
                        isCompact
                      )}
                    >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="open" size={18} />
                      </span>
                      {isCompact ? "Open Shop" : "Open Shop Face"}
                    </StableButton>
                  </div>
                </div>
                ) : null}

                {activeLinkCenterTool === "repost" ? (
                <div
                  id="marketplace-paid-network-placement"
                  {...marketplaceSurfaceTouchProps("marketplace.network-repost.surface")}
                  style={{
                    ...marketplaceLinkRowStyle(isCompact),
                    scrollMarginTop: isCompact ? 84 : 104,
                    position: "relative",
                    pointerEvents: "auto",
                  }}
                >
                  <div style={marketplaceLinkRowHeaderStyle(isCompact)}>
                    <span
                      aria-hidden="true"
                      style={marketplaceLinkRowIconStyle("green", isCompact)}
                    >
                      <MarketplaceGlyph name="repost" size={isCompact ? 25 : 30} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={marketplaceLinkRowTitleStyle(isCompact)}>
                        {isCompact ? "4. Repost" : "4. Paid Repost"}
                      </div>
                      <div style={marketplaceLinkRowSubStyle(isCompact)}>
                        Target, duration, credits.
                      </div>
                    </div>
                    <span
                      style={marketplaceLinkRowStatusStyle(
                        selectedRepostProduct || canPlaceMarketplaceRepost ? "ready" : "idle",
                        isCompact
                      )}
                    >
                      {selectedRepostProduct || canPlaceMarketplaceRepost ? "Ready" : "Set up"}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      display: isCompact ? "none" : "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={badge(Boolean(selectedRepostProduct))}>
                      {loadingRepostProducts
                        ? "Loading block"
                        : selectedRepostProduct
                        ? "Block ready"
                        : "No block ready"}
                    </span>
                    <span style={badge(Boolean(resolvedRepostTargetCommunityInput))}>
                      {resolvedRepostTargetCommunityInput
                        ? `Target ${resolvedRepostTargetCommunityInput}`
                        : "Target needed"}
                    </span>
                    <span style={badge(true)}>
                      {resolvedRepostDurationDays} day{resolvedRepostDurationDays === 1 ? "" : "s"}
                    </span>
                    <span style={badge(canPlaceMarketplaceRepost)}>
                      {availableMarketplaceRepostCredits} credit{availableMarketplaceRepostCredits === 1 ? "" : "s"}
                    </span>
                  </div>
                  {selectedRepostProduct ? (
                    <div
                      style={{
                        marginTop: 12,
                        minHeight: isCompact ? 92 : 190,
                        padding: isCompact ? 9 : 12,
                        borderRadius: isCompact ? 17 : 20,
                        border: "1px solid rgba(11, 45, 74, 0.14)",
                        background:
                          "linear-gradient(135deg, rgba(7,23,44,0.96) 0%, rgba(13,54,88,0.92) 100%)",
                        color: "#FFFFFF",
                        display: "grid",
                        gridTemplateColumns: isCompact
                          ? "72px minmax(0, 1fr)"
                          : "minmax(160px, 0.42fr) minmax(0, 1fr)",
                        gap: isCompact ? 9 : 12,
                        alignItems: isCompact ? "center" : "stretch",
                        overflow: "hidden",
                        overflowAnchor: "none",
                        transition: "none",
                      }}
                    >
                      <div
                        style={{
                          minHeight: isCompact ? 72 : 164,
                          height: isCompact ? 72 : undefined,
                          borderRadius: isCompact ? 14 : 18,
                          overflow: "hidden",
                          background:
                            "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
                          border: "1px solid rgba(255,255,255,0.18)",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        {selectedRepostProductVideoSrc ? (
                          <video
                            src={selectedRepostProductVideoSrc}
                            poster={selectedRepostProductImageSrc || undefined}
                            muted
                            playsInline
                            controls
                            style={{
                              width: "100%",
                              height: "100%",
                              minHeight: isCompact ? 72 : 164,
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : selectedRepostProductImageSrc ? (
                          <img
                            src={selectedRepostProductImageSrc}
                            alt={selectedRepostProduct.title}
                            style={{
                              width: "100%",
                              height: "100%",
                              minHeight: isCompact ? 72 : 164,
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              padding: 14,
                              textAlign: "center",
                              fontWeight: 950,
                              color: "rgba(255,255,255,0.82)",
                            }}
                          >
                            Block #{selectedRepostProduct.blockNumber || "?"}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          minWidth: 0,
                          display: "grid",
                          gap: isCompact ? 5 : 9,
                          alignContent: "center",
                        }}
                      >
                        <div
                          style={{
                            ...sectionLabel(),
                            color: "#F2C766",
                            display: isCompact ? "none" : undefined,
                          }}
                        >
                          Selected public block
                        </div>
                        <div
                          style={{
                            fontSize: isCompact ? 15 : 26,
                            lineHeight: isCompact ? 1.12 : 1.05,
                            fontWeight: 950,
                            overflowWrap: "break-word",
                            wordBreak: "normal",
                            display: isCompact ? "-webkit-box" : undefined,
                            WebkitLineClamp: isCompact ? 2 : undefined,
                            WebkitBoxOrient: isCompact ? "vertical" : undefined,
                            overflow: "hidden",
                          }}
                        >
                          Block #{selectedRepostProduct.blockNumber || "?"}:{" "}
                          {selectedRepostProduct.title}
                        </div>
                        {selectedRepostProduct.description && !isCompact ? (
                          <div
                            style={{
                              color: "rgba(255,255,255,0.78)",
                              fontSize: 14,
                              lineHeight: 1.45,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {selectedRepostProduct.description}
                          </div>
                        ) : null}
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            alignItems: "center",
                            minWidth: 0,
                          }}
                        >
                          {repostProductPriceLabel(selectedRepostProduct) ? (
                            <span
                              style={{
                                ...badge(true),
                                background: "rgba(242,199,102,0.16)",
                                color: "#FFF4C7",
                              }}
                            >
                              {repostProductPriceLabel(selectedRepostProduct)}
                            </span>
                          ) : null}
                          {!isCompact ? (
                            <>
                              <span
                                style={{
                                  ...badge(true),
                                  background: "rgba(255,255,255,0.12)",
                                  color: "#FFFFFF",
                                }}
                              >
                                Product ID {selectedRepostProduct.id}
                              </span>
                              <span
                                style={{
                                  ...badge(true),
                                  background: "rgba(255,255,255,0.12)",
                                  color: "#FFFFFF",
                                }}
                              >
                                Exact block handoff
                              </span>
                            </>
                          ) : null}
                        </div>
                        {!isCompact ? (
                          <div
                            style={{
                              color: "rgba(255,255,255,0.72)",
                              fontSize: 13,
                              lineHeight: 1.45,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {selectedRepostProduct.originShopName
                              ? `From ${selectedRepostProduct.originShopName}. `
                              : ""}
                            {selectedRepostProduct.sellerGmfnId
                              ? `GSN ID ${displayGsnLabel(selectedRepostProduct.sellerGmfnId)}.`
                              : "This block will carry its shop identity into the target Spotlight."}
                          </div>
                        ) : null}
                        <StableButton
                          type="button"
                          debugId="marketplace.network-repost.selected-block.copy-link"
                          stableHeight={48}
                          onClick={(event) => {
                            runMarketplaceAction(event, () => {
                              if (!selectedRepostProductPublicLink) {
                                showNotice(
                                  "error",
                                  "This block link is not ready yet."
                                );
                                return;
                              }
                              void safeCopy(selectedRepostProductPublicLink).then(
                                (copied: boolean) => {
                                  showNotice(
                                    copied ? "success" : "error",
                                    copied
                                      ? "Exact block link copied."
                                      : "This block link could not be copied."
                                  );
                                }
                              );
                            });
                          }}
                          style={{
                            ...marketplaceInlineActionStyle(
                              "soft",
                              !selectedRepostProductPublicLink,
                              isCompact
                            ),
                            display: isCompact ? "none" : undefined,
                            height: 48,
                            minHeight: 48,
                            maxHeight: 48,
                            maxWidth: isCompact ? "100%" : 220,
                          }}
                        >
                          Copy exact block link
                        </StableButton>
                      </div>
                    </div>
                  ) : loadingRepostProducts &&
                    (routeRepostProductId || routeRepostBlockNumber) ? (
                    <div
                      style={{
                        marginTop: 12,
                        minHeight: 96,
                        padding: 14,
                        borderRadius: 18,
                        border: "1px solid rgba(214, 170, 69, 0.28)",
                        background: "rgba(214, 170, 69, 0.12)",
                        color: "#0B1F33",
                        display: "grid",
                        alignContent: "center",
                        gap: 6,
                        overflowAnchor: "none",
                        transition: "none",
                      }}
                    >
                      <div style={{ fontWeight: 950 }}>
                        Loading the selected block...
                      </div>
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        Wait for this block before choosing the target
                        community.
                      </div>
                    </div>
                  ) : routeRepostProductId || routeRepostBlockNumber ? (
                    <div
                      style={{
                        marginTop: 12,
                        minHeight: 108,
                        padding: 14,
                        borderRadius: 18,
                        border: "1px solid rgba(139, 25, 25, 0.2)",
                        background: "rgba(255, 239, 239, 0.92)",
                        color: "#3B1420",
                        display: "grid",
                        alignContent: "center",
                        gap: 6,
                        overflowAnchor: "none",
                        transition: "none",
                      }}
                    >
                      <div style={{ fontWeight: 950 }}>
                        This block did not load yet.
                      </div>
                      <div style={{ ...helperText(), fontSize: 13, color: "#6B2630" }}>
                        Return to Shop Diaries and tap Repost again.
                      </div>
                    </div>
                  ) : null}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "minmax(0, 1fr) minmax(112px, 0.48fr)"
                        : "minmax(0, 1fr) minmax(0, 1fr) minmax(150px, 0.55fr)",
                      gap: 10,
                      marginTop: 12,
                    }}
                  >
                    <label
                      style={{
                        display: "grid",
                        gap: 6,
                        color: "#0B1F33",
                        fontWeight: 850,
                        gridColumn: isCompact ? "1 / -1" : undefined,
                      }}
                    >
                      <span style={{ fontSize: 12 }}>Public block</span>
                      <select
                        {...marketplaceFieldTouchProps(
                          "marketplace.network-repost.public-block-select"
                        )}
                        value={String(selectedRepostProduct?.id || "")}
                        onChange={(event) =>
                          setSelectedRepostProductId(Number(event.target.value || 0))
                        }
                        data-gmfn-control-state={
                          loadingRepostProducts
                            ? "loading"
                            : visibleRepostProducts.length === 0
                              ? "empty"
                              : "ready"
                        }
                        style={{
                          ...inputStyle(),
                          opacity: loadingRepostProducts ? 0.78 : 1,
                        }}
                      >
                        {visibleRepostProducts.length === 0 ? (
                          <option value="">
                            {loadingRepostProducts
                              ? "Loading public blocks..."
                              : "No public block is ready"}
                          </option>
                        ) : (
                          visibleRepostProducts.map((product) => (
                            <option key={`marketplace-repost-product-${product.id}`} value={product.id}>
                              {repostProductLabel(product)}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 6, color: "#0B1F33", fontWeight: 850 }}>
                      <span style={{ fontSize: 12 }}>Target community ID</span>
                      <input
                        {...marketplaceFieldTouchProps(
                          "marketplace.network-repost.target-community-input"
                        )}
                        inputMode="text"
                        value={repostTargetMarketplaceId}
                        onChange={(event) =>
                          setRepostTargetMarketplaceId(event.target.value.trim())
                        }
                        placeholder="GMFN-C-000008"
                        style={inputStyle()}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 6, color: "#0B1F33", fontWeight: 850 }}>
                      <span style={{ fontSize: 12 }}>Duration</span>
                      <select
                        {...marketplaceFieldTouchProps(
                          "marketplace.network-repost.duration-select"
                        )}
                        value={repostDurationDays}
                        onChange={(event) => setRepostDurationDays(event.target.value)}
                        style={inputStyle()}
                      >
                        <option value="1">1 day</option>
                        <option value="3">3 days</option>
                        <option value="5">5 days</option>
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                        <option value="30">30 days</option>
                      </select>
                    </label>
                  </div>
                  {selectedRepostProduct ? (
                    <div
                      style={{
                        marginTop: 10,
                        display: isCompact ? "none" : "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={badge(true)}>
                        Block identity kept
                      </span>
                      <span style={badge(true)}>
                        {selectedRepostProduct.repostsUsed} placements recorded
                      </span>
                      <span style={badge(canPlaceMarketplaceRepost)}>
                        Needs {requiredMarketplaceRepostCredits} paid credit{requiredMarketplaceRepostCredits === 1 ? "" : "s"}
                      </span>
                    </div>
                  ) : null}
                  <details
                    open={!isCompact}
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 18,
                      border: "1px solid rgba(11, 45, 74, 0.12)",
                      background: "rgba(234, 243, 255, 0.72)",
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <StableDisclosureSummary
                      debugId="marketplace.network-repost.target-help.summary"
                      stableHeight={52}
                      style={{
                        cursor: "pointer",
                        color: "#0B1F33",
                        fontWeight: 950,
                        listStyle: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <span>Target help</span>
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="target" size={18} />
                      </span>
                    </StableDisclosureSummary>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 950,
                            color: "#0B1F33",
                            display: isCompact ? "none" : undefined,
                          }}
                        >
                          Target help
                        </div>
                        <div style={{ ...helperText(), fontSize: 13 }}>
                          Find communities that fit this block.
                        </div>
                      </div>
                      <StableButton
                        type="button"
                        debugId="marketplace.network-repost.find-targets"
                        stableHeight={50}
                        onClick={(event) => {
                          runMarketplaceAction(event, () => {
                            if (loadingRepostTargetSuggestions) {
                              showNotice(
                                "error",
                                "GSN is already finding target IDs for this block."
                              );
                              return;
                            }
                            void loadMarketplaceRepostTargetSuggestions();
                          });
                        }}
                        style={{
                          ...marketplaceInlineActionStyle(
                            "secondary",
                            loadingRepostTargetSuggestions || !selectedRepostProduct,
                            false
                          ),
                          height: 50,
                          minHeight: 50,
                          maxHeight: 50,
                          minWidth: isCompact ? "100%" : 180,
                          flex: "0 0 auto",
                        }}
                      >
                        {loadingRepostTargetSuggestions ? (
                          "Finding..."
                        ) : (
                          <>
                            <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                              <MarketplaceGlyph name="target" size={18} />
                            </span>
                            Targets
                          </>
                        )}
                      </StableButton>
                    </div>
                    {repostTargetSuggestionError ? (
                      <div style={{ ...helperText(), fontSize: 13, color: "#8A1F1F" }}>
                        {repostTargetSuggestionError}
                      </div>
                    ) : null}
                    {repostTargetSuggestions.length ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {repostTargetSuggestions.slice(0, 3).map((item, index) => {
                          const code = safeStr(item.community_code);
                          const title = firstTruthy(
                            item.marketplace_name,
                            item.public_name,
                            code
                          );
                          const reasons = Array.isArray(item.reasons)
                            ? item.reasons.filter(Boolean).slice(0, 2)
                            : [];
                          const fitStrength = positiveNumber(item.score);
                          const fitLabel =
                            fitStrength >= 80
                              ? "best fit"
                              : fitStrength >= 50
                                ? "good fit"
                                : fitStrength > 0
                                  ? "possible fit"
                                  : "";
                          return (
                            <div
                              key={`marketplace-repost-target-${code || index}`}
                              style={{
                                display: "grid",
                                gridTemplateColumns: isCompact
                                  ? "1fr"
                                  : "minmax(0, 1fr) 132px",
                                gap: 8,
                                alignItems: "center",
                                padding: 10,
                                borderRadius: 16,
                                background: "#FFFFFF",
                                border: "1px solid rgba(11, 45, 74, 0.1)",
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 900,
                                    color: "#0B1F33",
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {title}
                                </div>
                                <div style={{ ...helperText(), fontSize: 12 }}>
                                  {code}
                                  {fitLabel ? ` | ${fitLabel}` : ""}
                                </div>
                                {reasons.length ? (
                                  <div style={{ ...helperText(), fontSize: 12 }}>
                                    {reasons.join(" | ")}
                                  </div>
                                ) : null}
                              </div>
                              <StableButton
                                type="button"
                                debugId={`marketplace.network-repost.target.${code || index}.use`}
                                stableHeight={52}
                                onClick={(event) => {
                                  runMarketplaceAction(event, () => {
                                    if (!code) {
                                      showNotice(
                                        "error",
                                        "This target community ID is not ready yet."
                                      );
                                      return;
                                    }
                                    setRepostTargetMarketplaceId(code);
                                    showNotice(
                                      "success",
                                      `${code} selected for Paid Repost.`
                                    );
                                  });
                                }}
                                style={{
                                  ...marketplaceInlineActionStyle(
                                    "primary",
                                    !code,
                                    isCompact
                                  ),
                                  height: 52,
                                  minHeight: 52,
                                  maxHeight: 52,
                                }}
                              >
                                <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                                  <MarketplaceGlyph name="target" size={18} />
                                </span>
                                Use
                              </StableButton>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </details>
                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "1fr"
                        : "repeat(4, minmax(0, 1fr))",
                      gap: 8,
                    }}
                  >
                    <span style={badge(Boolean(selectedRepostProduct))}>
                      Block {selectedRepostProduct ? "ready" : "needed"}
                    </span>
                    <span style={badge(Boolean(resolvedRepostTargetCommunityInput))}>
                      Target {resolvedRepostTargetCommunityInput ? "ready" : "needed"}
                    </span>
                    <span style={badge(true)}>
                      {resolvedRepostDurationDays} day{resolvedRepostDurationDays === 1 ? "" : "s"}
                    </span>
                    <span style={badge(canPlaceMarketplaceRepost)}>
                      {availableMarketplaceRepostCredits}/{requiredMarketplaceRepostCredits} credit{requiredMarketplaceRepostCredits === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div
                    {...marketplaceSurfaceTouchProps("marketplace.network-repost.payment-actions")}
                    style={marketplaceInlineActionsStyle(isCompact)}
                  >
                    <StableButton
                      type="button"
                      debugId="marketplace.network-repost.generate-payment-code"
                      stableHeight={58}
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          void createMarketplaceRepostPaymentInstruction();
                        });
                      }}
                      disabled={creatingRepostPaymentInstruction}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        creatingRepostPaymentInstruction,
                        isCompact
                      )}
                    >
                      {creatingRepostPaymentInstruction ? (
                        "Generating..."
                      ) : (
                        <>
                          <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                            <MarketplaceGlyph name="payment" size={18} />
                          </span>
                          Pay Code
                        </>
                      )}
                    </StableButton>
                    <StableButton
                      type="button"
                      debugId="marketplace.network-repost.refresh-credits"
                      stableHeight={58}
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          void refreshMarketplaceRepostCredits();
                        });
                      }}
                      disabled={loadingRepostCredits}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        loadingRepostCredits,
                        isCompact
                      )}
                    >
                      {loadingRepostCredits ? (
                        "Refreshing..."
                      ) : (
                        <>
                          <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                            <MarketplaceGlyph name="refresh" size={18} />
                          </span>
                          Refresh
                        </>
                      )}
                    </StableButton>
                    <StableButton
                      type="button"
                      debugId="marketplace.network-repost.place"
                      stableHeight={58}
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          void submitMarketplaceRepost();
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "primary",
                        marketplaceRepostLocked,
                        isCompact
                      )}
                    >
                      {placingMarketplaceRepost ? (
                        "Placing..."
                      ) : (
                        <>
                          <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                            <MarketplaceGlyph name="spark" size={18} />
                          </span>
                          Place
                        </>
                      )}
                    </StableButton>
                  </div>
                  <details
                    open={!isCompact}
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 18,
                      border: "1px solid rgba(11, 45, 74, 0.12)",
                      background: canPlaceMarketplaceRepost
                        ? "rgba(46, 155, 98, 0.08)"
                        : "rgba(214, 170, 69, 0.12)",
                      color: "#0B1F33",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <StableDisclosureSummary
                      debugId="marketplace.network-repost.credit-details.summary"
                      stableHeight={52}
                      style={{
                        cursor: "pointer",
                        color: "#0B1F33",
                        fontWeight: 950,
                        listStyle: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <span>
                        {canPlaceMarketplaceRepost
                          ? "Credit details"
                          : `Need ${missingMarketplaceRepostCredits} credit${
                              missingMarketplaceRepostCredits === 1 ? "" : "s"
                            }`}
                      </span>
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="payment" size={18} />
                      </span>
                    </StableDisclosureSummary>
                    <div style={{ fontWeight: 900 }}>
                      {canPlaceMarketplaceRepost
                        ? "Credit ready."
                        : `Need ${missingMarketplaceRepostCredits} Spotlight credit${
                            missingMarketplaceRepostCredits === 1 ? "" : "s"
                          } before placing.`}
                    </div>
                    <div style={{ ...helperText(), fontSize: 13 }}>
                      {requiredMarketplaceRepostCredits} day{requiredMarketplaceRepostCredits === 1 ? "" : "s"} =
                      {" "}{formatRailMoney(requiredMarketplaceRepostAmount, "GBP")}.
                    </div>
                    {latestRepostPaymentReference ? (
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        Latest code: <strong>{latestRepostPaymentReference}</strong>
                        {latestRepostPaymentAmount ? ` | ${latestRepostPaymentAmount}` : ""}
                        {latestRepostPaymentStatus ? ` | ${latestRepostPaymentStatus}` : ""}
                      </div>
                    ) : (
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        Generate when the block and target are ready.
                      </div>
                    )}
                    {latestRepostPayment ? (
                      <Suspense fallback={null}>
                        <PaymentProofSubmissionPanel
                          payment={latestRepostPayment}
                          title="Network Spotlight payment proof"
                          debugIdPrefix="marketplace-network-repost-proof"
                          onUploaded={(payment) => {
                            setCreatedRepostInstruction(payment as ExpectedPaymentRecord);
                            setRepostExpectedPayments((prev) => {
                              const paymentId = String(payment.id || "");
                              const reference = firstTruthy(
                                payment.reference_display,
                                payment.reference
                              );
                              let replaced = false;
                              const next = prev.map((item) => {
                                const sameId =
                                  paymentId && String(item.id || "") === paymentId;
                                const sameReference =
                                  reference &&
                                  firstTruthy(item.reference_display, item.reference) ===
                                    reference;
                                if (sameId || sameReference) {
                                  replaced = true;
                                  return payment as ExpectedPaymentRecord;
                                }
                                return item;
                              });
                              return replaced
                                ? next
                                : [payment as ExpectedPaymentRecord, ...prev];
                            });
                            showNotice(
                              "success",
                              "Network Spotlight payment proof uploaded for finance review."
                            );
                          }}
                        />
                      </Suspense>
                    ) : null}
                  </details>
                    <div style={marketplaceInlineActionsStyle(isCompact)}>
                      <StableCtaLink
                        to={routeWithCommunity(APP_ROUTES.FREE_SPOTLIGHT, activeCommunityId)}
                        debugId="marketplace.marketing.free-spotlight"
                        stableHeight={58}
                        style={marketplaceInlineActionStyle("secondary", false, isCompact)}
                      >
                        <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                          <MarketplaceGlyph name="spark" size={18} />
                        </span>
                        Free Spotlight
                      </StableCtaLink>
                      <StableCtaLink
                        to={routeWithCommunity(APP_ROUTES.SUBSCRIPTION_SPOTLIGHT, activeCommunityId)}
                        debugId="marketplace.network-repost.subscription"
                        stableHeight={58}
                        style={marketplaceInlineActionStyle("secondary", false, isCompact)}
                      >
                        <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                          <MarketplaceGlyph name="spark" size={18} />
                        </span>
                        Subscription Spotlight
                      </StableCtaLink>
                      <StableButton
                        type="button"
                        debugId="marketplace.marketing.trade-evidence"
                        stableHeight={58}
                        onClick={(event) =>
                          openMarketplaceSection(event, "trade", "marketplace-trade-evidence")
                        }
                        style={marketplaceInlineActionStyle("secondary", false, isCompact)}
                      >
                        <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                          <MarketplaceGlyph name="ledger" size={18} />
                        </span>
                        Trade Evidence
                      </StableButton>
                    </div>
                </div>
                ) : null}

                </div>
              </>
            )}
          </>
        ) : null}
      </section>
      ) : null}
    </>
  );
}