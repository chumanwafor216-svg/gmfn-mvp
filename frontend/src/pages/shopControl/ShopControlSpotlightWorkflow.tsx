import React from "react";
import SpotlightMediaFrame from "../../components/SpotlightMediaFrame";
import SocialTagShareButton from "../../components/SocialTagShareButton";
import VideoSoundEditor from "../../components/VideoSoundEditor";
import {
  PrimaryButton,
  SecondaryButton,
  StableButton,
  StableDisclosureSummary,
} from "../../components/StableButton";
import { GsnLegacyIcon } from "../../components/GsnLegacyIcon";
import { navigateWithOrigin } from "../../lib/nav";
import { buildPublicShareText, shareTargetForChannel } from "../../lib/share";
import { publicApiOrigin } from "../../lib/publicLinks";
import type { ShopControlSpotlightBroadcast, ShopControlSpotlightWorkflowProps } from "./ShopControlSpotlightWorkflowTypes";

function safeSpotlightText(value: unknown): string {
  return String(value ?? "").trim();
}

function spotlightPriceLine(price: unknown, currency: unknown): string {
  const priceText = safeSpotlightText(price);
  const currencyText = safeSpotlightText(currency);
  if (priceText && currencyText) return `${currencyText} ${priceText}`;
  return priceText || currencyText;
}

function formatSpotlightDate(value: unknown): string {
  const raw = safeSpotlightText(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return raw;
  return parsed.toLocaleString();
}

function resolveSpotlightMediaSrc(value: unknown): string {
  const raw = safeSpotlightText(value);
  if (!raw) return "";

  if (
    /^https?:\/\//i.test(raw) ||
    raw.startsWith("blob:") ||
    raw.startsWith("data:")
  ) {
    return raw;
  }

  const path = raw.startsWith("/") ? raw : `/${raw.replace(/^\/+/, "")}`;
  return `${publicApiOrigin()}${path}`;
}

function liveSpotlightStatus(item: ShopControlSpotlightBroadcast | null) {
  const servingStatus = safeSpotlightText(
    item?.campaign_serving_status || item?.serving_status
  );
  const expiresRaw = safeSpotlightText(
    item?.authorized_expires_at || item?.expires_at
  );
  if (servingStatus === "correction_hold") {
    return {
      chip: "Correction hold",
      detail: expiresRaw
        ? `Off-air while corrected. Original expiry: ${formatSpotlightDate(expiresRaw)}.`
        : "Off-air while corrected. The original entitlement clock is still running.",
      urgent: true,
    };
  }
  if (!expiresRaw) {
    return {
      chip: "Live now",
      detail: "No end time is visible for this Spotlight yet.",
      urgent: false,
    };
  }

  const expiresAt = new Date(expiresRaw);
  if (!Number.isFinite(expiresAt.getTime())) {
    return {
      chip: "Live now",
      detail: `Expiry: ${expiresRaw}`,
      urgent: false,
    };
  }

  const diffMs = expiresAt.getTime() - Date.now();
  if (diffMs <= 0) {
    return {
      chip: "Ended",
      detail: `This Spotlight ended at ${formatSpotlightDate(expiresAt)}.`,
      urgent: true,
    };
  }

  if (diffMs <= 24 * 60 * 60 * 1000) {
    return {
      chip: "Ends soon",
      detail: `Scheduled to end at ${formatSpotlightDate(expiresAt)}.`,
      urgent: true,
    };
  }

  return {
    chip: "Live now",
    detail: `Scheduled to end at ${formatSpotlightDate(expiresAt)}.`,
    urgent: false,
  };
}

export default function ShopControlSpotlightWorkflow(props: ShopControlSpotlightWorkflowProps) {
  const {
    isCompact,
    pageCard,
    spotlightLaneIcon,
    sectionLabel,
    spotlightPortalTitle,
    helperText,
    spotlightPortalSubtitle,
    spotlightStepBadges,
    spotlightFlowStep,
    badge,
    communityName,
    spotlightFeatureOff,
    noticeCard,
    spotlightFeatureOffText,
    marketplaceShopsFeatureOff,
    shop,
    marketplaceShopsFeatureOffText,
    currentActiveSpotlight,
    firstTruthy,
    spotlightPublishFeedback,
    spotlightMediaFeedback,
    innerCard,
    labelWithIcon,
    shopName,
    setShopName,
    inputStyle,
    whatsApp,
    setWhatsApp,
    telegramHandle,
    setTelegramHandle,
    shopDescription,
    setShopDescription,
    textAreaStyle,
    controlGrid,
    ensureSpotlightShopRecord,
    creatingSpotlightShop,
    collapseSpotlightTools,
    controlIconTile,
    spotlightPriorityMode,
    setSpotlightPriorityMode,
    navigate,
    routes,
    location,
    spotlightMediaChoice,
    setSpotlightMediaChoice,
    inlineIcon,
    spotlightProductName,
    setSpotlightProductName,
    products,
    spotlightCorrectionProductId,
    setSpotlightCorrectionProductId,
    spotlightPriceNote,
    setSpotlightPriceNote,
    spotlightMessage,
    setSpotlightMessage,
    preparingSpotlightImage,
    creatingSpotlight,
    showNotice,
    spotlightImageInputKey,
    handleSpotlightImagePicked,
    spotlightImageFile,
    spotlightHasImage,
    formatFileSize,
    preparingSpotlightVideo,
    spotlightVideoInputKey,
    handleSpotlightVideoPicked,
    spotlightVideoFile,
    spotlightVideoSound,
    setSpotlightVideoSound,
    shopReelPictureSound,
    setShopReelPictureSound,
    spotlightHasVideo,
    spotlightVideoDurationSeconds,
    spotlightNaturalFinishEnabled,
    setSpotlightNaturalFinishEnabled,
    spotlightNaturalFinishSeconds,
    setSpotlightNaturalFinishSeconds,
    spotlightFinishedVideoUrl,
    shopReelVideoUrl,
    clearPreparedShopReel,
    preparingShopReelFromImage,
    prepareShopReelFromImage,
    setSpotlightFinishedVideoUrl,
    preparingSpotlightFinish,
    prepareSpotlightNaturalFinish,
    spotlightCanContinueToPreview,
    setSpotlightFlowStep,
    spotlightImagePreviewUrl,
    spotlightVideoPreviewUrl,
    spotlightPilotMaxVideoSeconds,
    spotlightPreviewMessage,
    spotlightPreviewHasPicture,
    spotlightPreviewHasVideo,
    handleCreateSpotlight,
    takingDownSpotlight,
    handleCorrectCurrentSpotlight,
    handleTakeDownCurrentSpotlight,
    shopActionsLocked,
  } = props;
  const currentLiveSpotlightIsPaid =
    firstTruthy(currentActiveSpotlight?.priority_mode, "free").toLowerCase() === "paid";
  const lifecycleActionsEnabled =
    currentActiveSpotlight?.lifecycle_writers_enabled === true;
  const correctionHoldActive =
    firstTruthy(
      currentActiveSpotlight?.campaign_serving_status,
      currentActiveSpotlight?.serving_status
    ) === "correction_hold";

  function focusSpotlightTarget(targetId: string, openVideoOptions = false) {
    if (openVideoOptions) {
      const options = document.querySelector<HTMLDetailsElement>("[data-spotlight-video-options]");
      if (options) options.open = true;
    }
    window.setTimeout(() => {
      const target = document.getElementById(targetId);
      if (!target) return;
      target.scrollIntoView({ block: "center" });
      target.focus({ preventScroll: true });
    }, 0);
  }

  async function openSpotlightReview() {
    if (preparingSpotlightImage || preparingSpotlightVideo || preparingSpotlightFinish) {
      showNotice("info", "GSN is still getting your picture or video ready. Keep this page open for a moment.");
      return;
    }
    if (spotlightVideoSound && !spotlightVideoSound.rightsConfirmed) {
      showNotice("info", "Confirm that you created the added sound or have permission to use it.");
      focusSpotlightTarget("shop-control.spotlight.video-sound.rights", true);
      return;
    }
    if (spotlightMediaFeedback?.tone === "error") {
      showNotice("error", spotlightMediaFeedback.text);
      focusSpotlightTarget("shop-control-spotlight-add-picture");
      return;
    }
    if (!spotlightHasImage && !spotlightHasVideo) {
      showNotice("info", "Add a picture or short video so customers can see what you are selling.");
      focusSpotlightTarget("shop-control-spotlight-add-picture");
      return;
    }
    if (
      !safeSpotlightText(spotlightProductName) &&
      !safeSpotlightText(spotlightPriceNote) &&
      !safeSpotlightText(spotlightMessage)
    ) {
      showNotice("info", "Tell customers what you are selling or give them a short message.");
      focusSpotlightTarget("shop-control-spotlight-item");
      return;
    }
    if (!spotlightCanContinueToPreview) {
      showNotice("info", "Check the item, picture or video, and customer message, then try again.");
      return;
    }
    if (spotlightVideoFile && spotlightNaturalFinishEnabled && !spotlightFinishedVideoUrl) {
      const preparedUrl = await prepareSpotlightNaturalFinish();
      if (!preparedUrl) return;
    }
    setSpotlightFlowStep("preview");
  }

  const isPaidDraft = spotlightPriorityMode === "paid";
  const memberFacingTitle =
    spotlightFlowStep === "preview"
      ? "Check before publishing"
      : isPaidDraft
        ? spotlightPortalTitle
        : "Show customers what you’re selling";
  const memberFacingSubtitle =
    spotlightFlowStep === "preview"
      ? "Make sure the item, price and customer message are correct."
      : isPaidDraft
        ? spotlightPortalSubtitle
        : "Add one item or offer, a picture or video, and how customers should contact you.";
  const videoOptionsSummary = [
    spotlightNaturalFinishEnabled ? "Automatic improvement on" : "Automatic improvement off",
    spotlightVideoSound ? "Sound added" : "",
  ].filter(Boolean).join(" · ");

  const resolvedShopReelVideoUrl = resolveSpotlightMediaSrc(shopReelVideoUrl);
  const shopReelShareReady = Boolean(
    resolvedShopReelVideoUrl && safeSpotlightText(routes.publicShopReel)
  );
  const shopReelTitle = `${firstTruthy(shop?.name, shopName, "My GSN Shop")} | GSN Shop Reel`;
  const shopReelMessage = firstTruthy(
    spotlightPreviewMessage,
    currentActiveSpotlight?.message,
    shop?.description,
    "See what is available from this GSN shop."
  );
  const shopReelSocialMessage = `${shopReelMessage} Browse the shop and current Spotlight. Use GSN Demand Box when you cannot find what you need, and check any available TrustSlip separately before a serious trade decision.`;
  const shopReelShareTarget = {
    title: shopReelTitle,
    url: routes.publicShopReel,
    socialUrl: routes.publicShopReelSocialPreview || routes.publicShopReel,
    message: shopReelSocialMessage,
    socialMessage: shopReelSocialMessage,
  };

  async function downloadShopReel() {
    if (!resolvedShopReelVideoUrl) {
      showNotice("info", "Prepare a finished short video first.");
      return;
    }
    try {
      const response = await fetch(resolvedShopReelVideoUrl);
      if (!response.ok) throw new Error("Reel file could not be opened.");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "gsn-shop-reel.mp4";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      showNotice("success", "GSN Shop Reel downloaded. Review it before posting.");
    } catch {
      const opened = window.open(resolvedShopReelVideoUrl, "_blank", "noopener,noreferrer");
      showNotice(
        opened ? "info" : "error",
        opened
          ? "The reel opened in a new tab. Use your phone download control, then post it yourself."
          : "The reel could not be downloaded. Keep this page open and try again."
      );
    }
  }

  async function shareShopReelVideo() {
    if (!shopReelShareReady) {
      showNotice("info", "Prepare a finished short video first.");
      return;
    }
    if (
      typeof navigator === "undefined" ||
      typeof navigator.share !== "function" ||
      typeof navigator.canShare !== "function"
    ) {
      showNotice("info", "This browser cannot attach the reel. Download it, then use Choose link channel.");
      return;
    }
    try {
      const response = await fetch(resolvedShopReelVideoUrl);
      if (!response.ok) throw new Error("Reel file could not be opened.");
      const blob = await response.blob();
      const file = new File([blob], "gsn-shop-reel.mp4", {
        type: blob.type || "video/mp4",
      });
      if (!navigator.canShare({ files: [file] })) {
        showNotice("info", "This phone cannot attach the reel here. Download it, then post it yourself.");
        return;
      }
      const nativeTarget = shareTargetForChannel(shopReelShareTarget, "native");
      await navigator.share({
        title: nativeTarget.title,
        text: buildPublicShareText(nativeTarget),
        files: [file],
      });
      showNotice("success", "Reel and shop link shared from your phone.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      showNotice("error", "The phone could not share the reel. Download it, then post it yourself.");
    }
  }
  return (
    <section
      id="shop-control-spotlight"
      style={pageCard("linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 54%, #EAF3FF 100%)")}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "48px minmax(0, 1fr)" : "72px minmax(0, 1fr)",
          gap: isCompact ? 10 : 14,
          alignItems: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: isCompact ? 44 : 64,
            height: isCompact ? 44 : 64,
            borderRadius: isCompact ? 15 : 22,
            display: "grid",
            placeItems: "center",
            background: "rgba(255,255,255,0.97)",
            color: "#7A4A00",
            border: "1px solid rgba(226,192,106,0.36)",
            boxShadow:
              "0 16px 30px rgba(6,24,39,0.10), inset 0 1px 0 rgba(255,255,255,0.96)",
          }}
        >
          <GsnLegacyIcon name={spotlightLaneIcon} size={isCompact ? 28 : 38} />
        </div>

        <div>
          <div style={sectionLabel()}>{isPaidDraft ? "Spotlight subscription" : "Free Spotlight"}</div>
          <div
            style={{
              marginTop: isCompact ? 4 : 8,
              color: "#07172C",
              fontSize: isCompact ? 21 : 28,
              fontWeight: 950,
              lineHeight: 1.08,
            }}
          >
            {memberFacingTitle}
          </div>
          <div style={{ marginTop: isCompact ? 5 : 8, ...helperText(), maxWidth: 760 }}>
            {memberFacingSubtitle}
          </div>
        </div>
      </div>

      <div style={{ marginTop: isCompact ? 11 : 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {isCompact ? (
          <span style={badge(true)}>
            {spotlightFlowStep === "preview" ? "2 of 2 · Check and publish" : "1 of 2 · Add details"}
          </span>
        ) : (
          spotlightStepBadges.map((item) => (
            <span key={item.key} style={badge(spotlightFlowStep === item.key)}>
              {item.label}
            </span>
          ))
        )}
        <span style={badge(false)}>{communityName}</span>
      </div>

      {spotlightFeatureOff ? (
        <div style={{ marginTop: 14, ...noticeCard("error") }}>
          {spotlightFeatureOffText}
        </div>
      ) : marketplaceShopsFeatureOff && !shop?.id ? (
        <div style={{ marginTop: 14, ...noticeCard("error") }}>
          {marketplaceShopsFeatureOffText}
        </div>
      ) : null}

      {currentActiveSpotlight ? (() => {
        const liveStatus = liveSpotlightStatus(currentActiveSpotlight);
        const liveTitle = firstTruthy(
          currentActiveSpotlight?.source_product_title,
          currentActiveSpotlight?.message,
          "Live Spotlight"
        );
        const liveBody = firstTruthy(
          currentActiveSpotlight?.source_product_description,
          currentActiveSpotlight?.body,
          currentActiveSpotlight?.message,
          "Your Spotlight is live in the shop ecosystem."
        );
        const livePrice = spotlightPriceLine(
          currentActiveSpotlight?.source_product_price,
          currentActiveSpotlight?.source_product_currency
        );
        const liveCommunity = firstTruthy(
          currentActiveSpotlight?.source_clan_name,
          communityName
        );
        const liveShopName = firstTruthy(
          currentActiveSpotlight?.source_shop_name,
          shop?.name,
          shopName,
          "Your shop"
        );
        const liveImageUrl = resolveSpotlightMediaSrc(
          firstTruthy(
            currentActiveSpotlight?.image_url,
            currentActiveSpotlight?.source_product_image_url
          )
        );
        const liveVideoUrl = resolveSpotlightMediaSrc(
          firstTruthy(
            currentActiveSpotlight?.video_url,
            currentActiveSpotlight?.source_product_video_url
          )
        );

        return (
          <div
            data-spotlight-owner-frame="rich-live"
            style={{
              marginTop: 14,
              ...innerCard(
                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,250,238,0.98) 48%, rgba(239,247,255,0.98) 100%)"
              ),
              border: "1px solid rgba(184,137,45,0.24)",
              boxShadow:
                "0 20px 42px rgba(10,24,49,0.10), inset 0 1px 0 rgba(255,255,255,0.92)",
            }}
          >
            <div style={sectionLabel()}>
              {labelWithIcon("megaphone", "Live owner Spotlight")}
            </div>
            <div
              style={{
                marginTop: 10,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.16fr) minmax(260px, 0.84fr)",
                gap: isCompact ? 12 : 16,
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  position: "relative",
                  minHeight: isCompact ? 318 : 340,
                  borderRadius: isCompact ? 20 : 24,
                  overflow: "hidden",
                  border: "1px solid rgba(184,137,45,0.48)",
                  background: "linear-gradient(180deg, #0B1F33 0%, #061827 100%)",
                  boxShadow:
                    "0 18px 36px rgba(6,24,39,0.18), inset 0 1px 0 rgba(255,255,255,0.10)",
                }}
              >
                <SpotlightMediaFrame
                  imageUrl={liveImageUrl}
                  videoUrl={liveVideoUrl}
                  videoPoster={liveImageUrl}
                  alt={liveTitle}
                  frameStyle={{
                    width: "100%",
                    height: isCompact ? 318 : 340,
                    minHeight: isCompact ? 318 : 340,
                    borderRadius: isCompact ? 20 : 24,
                    background: "transparent",
                  }}
                  mediaStyle={{ width: "100%", height: "100%", objectFit: "cover" }}
                  contentPadding={0}
                  showVideoControls={false}
                  autoPlayVideo={Boolean(liveVideoUrl)}
                  mutedVideo={Boolean(liveVideoUrl)}
                  loopVideo={Boolean(liveVideoUrl)}
                  showAudioUnlock={Boolean(liveVideoUrl)}
                  audioUnlockLabel="Sound on"
                  audioUnlockOffLabel="Muted"
                  audioUnlockErrorLabel="Play"
                  audioUnlockStyle={{
                    top: 12,
                    right: 12,
                    minWidth: 46,
                    width: 46,
                    height: 46,
                    borderRadius: 999,
                    padding: 0,
                    fontSize: 0,
                    border: "1px solid rgba(214,170,69,0.58)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,248,232,0.96) 100%)",
                    color: "#07172C",
                    boxShadow:
                      "0 12px 22px rgba(2,12,27,0.28), inset 0 1px 0 rgba(255,255,255,0.92)",
                  }}
                  maxVideoSeconds={spotlightPilotMaxVideoSeconds}
                  fallback={
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        minHeight: isCompact ? 318 : 340,
                        display: "grid",
                        placeItems: "center",
                        padding: 22,
                        color: "#F8FBFF",
                        textAlign: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 950, fontSize: isCompact ? 19 : 24 }}>
                          Spotlight media unavailable
                        </div>
                        <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: "rgba(231,238,248,0.88)" }}>
                          The live Spotlight is still recorded. Republish if the media needs replacing.
                        </div>
                      </div>
                    </div>
                  }
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background:
                      "linear-gradient(180deg, rgba(6,19,34,0.04) 0%, rgba(6,19,34,0.18) 42%, rgba(6,19,34,0.82) 100%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 16,
                    right: 16,
                    bottom: 14,
                    display: "grid",
                    gap: 7,
                    color: "#FFFFFF",
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ ...badge(true), color: "#07172C" }}>{liveStatus.chip}</span>
                    <span style={{ ...badge(false), background: "rgba(255,255,255,0.14)", color: "#FFFFFF" }}>
                      {currentLiveSpotlightIsPaid ? "Paid Spotlight" : "Free Spotlight"}
                    </span>
                    {livePrice ? (
                      <span style={{ ...badge(false), background: "rgba(255,248,232,0.92)", color: "#08233A" }}>
                        {livePrice}
                      </span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: isCompact ? 22 : 28, fontWeight: 1000, lineHeight: 1.06 }}>
                    {liveTitle}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 850, color: "rgba(255,255,255,0.90)" }}>
                    {liveShopName} - {liveCommunity}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", alignContent: "space-between", gap: 14 }}>
                <div>
                  <div style={{ color: "#07172C", fontWeight: 950, fontSize: isCompact ? 20 : 24, lineHeight: 1.12 }}>
                    {liveTitle}
                  </div>
                  <div style={{ marginTop: 9, ...helperText(), fontSize: 13.5 }}>
                    {liveBody}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge(false)}>{liveStatus.detail}</span>
                    <span style={badge(false)}>
                      {currentActiveSpotlight?.visibility_scope === "marketplace_repost"
                        ? "Repost placement"
                        : "Shop Spotlight"}
                    </span>
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 12.5 }}>
                    Activated {formatSpotlightDate(currentActiveSpotlight?.activated_at) || "time unavailable"}.
                    {" "}Correction preserves this activation, the original expiry, used allowance,
                    delivery pacing, and viewer-frequency history. Permanent withdrawal stops delivery
                    without restoring credit or unused time.
                    {!lifecycleActionsEnabled
                      ? " These actions remain disabled until the compatible serving reader and cache contract is activated."
                      : ""}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <StableButton
                    id="shop-control-spotlight-add-picture"
                    type="button"
                    onClick={() => {
                      if (!routes.publicShopSpotlightPreview) {
                        showNotice("error", "Public shop link is not ready yet.");
                        return;
                      }
                      navigateWithOrigin(navigate, routes.publicShopSpotlightPreview, location);
                    }}
                    disabled={!routes.publicShopSpotlightPreview}
                    debugId="shop-control.spotlight.live.preview-shop"
                  >
                    Preview public shop
                  </StableButton>
                  <SecondaryButton
                    type="button"
                    onClick={() => handleCorrectCurrentSpotlight()}
                    disabled={!lifecycleActionsEnabled || takingDownSpotlight || creatingSpotlight}
                    debugId="shop-control.spotlight.live.correct"
                  >
                    Correct wording or media
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    onClick={() => handleTakeDownCurrentSpotlight()}
                    disabled={!lifecycleActionsEnabled || takingDownSpotlight || creatingSpotlight}
                    debugId="shop-control.spotlight.live.take-down"
                  >
                    {takingDownSpotlight ? "Withdrawing..." : "Permanently withdraw"}
                  </SecondaryButton>
                </div>
              </div>
            </div>
          </div>
        );
      })() : null}
      {spotlightPublishFeedback ? (
        <div
          style={{
            marginTop: 14,
            ...noticeCard(spotlightPublishFeedback.tone),
            ...(isCompact ? { padding: "10px 12px", fontSize: 13, lineHeight: 1.4 } : {}),
          }}
        >
          {spotlightPublishFeedback.text}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gap: 14,
        }}
      >
        {spotlightFlowStep === "setup" ? (
          <>
            <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)")}>
              <div style={sectionLabel()}>{labelWithIcon("shop", "Prepare shop")}</div>
              <div style={{ marginTop: 8, color: "#0B1F33", fontSize: 18, fontWeight: 900 }}>
                Add the basic shop record first.
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                Spotlight must belong to a real shop, so people know who they are seeing.
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
                  <div style={sectionLabel()}>Shop name</div>
                  <input
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="Shop name"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>WhatsApp</div>
                  <input
                    value={whatsApp}
                    onChange={(e) => setWhatsApp(e.target.value)}
                    placeholder="WhatsApp number"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Telegram</div>
                  <input
                    value={telegramHandle}
                    onChange={(e) => setTelegramHandle(e.target.value)}
                    placeholder="Telegram handle"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
                  <div style={sectionLabel()}>Description</div>
                  <textarea
                    value={shopDescription}
                    onChange={(e) => setShopDescription(e.target.value)}
                    placeholder="Tell people what this shop offers..."
                    style={{ ...textAreaStyle(), marginTop: 8 }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 14, ...controlGrid(isCompact, 150) }}>
                <PrimaryButton
                  type="button"
                  onClick={() => ensureSpotlightShopRecord()}
                  disabled={creatingSpotlightShop}
                  busy={creatingSpotlightShop}
                  busyLabel="Preparing shop..."
                  fullWidth
                  debugId="shop-control.spotlight.setup.continue"
                >
                  Continue
                </PrimaryButton>
                <SecondaryButton
                  type="button"
                  onClick={collapseSpotlightTools}
                  fullWidth
                  debugId="shop-control.spotlight.setup.cancel"
                >
                  Cancel spotlight
                </SecondaryButton>
              </div>
            </div>
          </>
        ) : spotlightFlowStep === "upload" ? (
          <>
            <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 58%, #EAF4FF 100%)")}>
              <div style={sectionLabel()}>{labelWithIcon("megaphone", "Promote one item or offer")}</div>
              <div style={{ marginTop: 8, color: "#0B1F33", fontSize: isCompact ? 21 : 24, fontWeight: 950, lineHeight: 1.1 }}>
                Tell customers what you have.
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                Add the item, a picture or short video, and how customers should contact you.
              </div>

              {correctionHoldActive ? (
                <div style={{ marginTop: 14 }}>
                  <div style={sectionLabel()}>What needs correcting? (optional)</div>
                  <select
                    value={spotlightCorrectionProductId || ""}
                    onChange={(event) =>
                      setSpotlightCorrectionProductId(
                        Number(event.target.value || 0) || null
                      )
                    }
                    style={{ ...inputStyle(), marginTop: 8 }}
                  >
                    <option value="">Words or picture/video only</option>
                    {products
                      .filter(
                        (product) =>
                          product.is_active !== false &&
                          firstTruthy(
                            product.visibility_mode,
                            "community_visible"
                          ) === "community_visible"
                      )
                      .map((product) => (
                        <option key={product.id} value={product.id}>
                          {firstTruthy(product.name, `Product ${product.id}`)}
                        </option>
                      ))}
                  </select>
                  <div style={{ marginTop: 7, ...helperText(), fontSize: 12.5 }}>
                    You can correct this promotion without starting or paying for a new one.
                  </div>
                </div>
              ) : null}

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <div style={sectionLabel()}>What are you selling?</div>
                  <input
                    id="shop-control-spotlight-item"
                    value={spotlightProductName}
                    onChange={(e) => setSpotlightProductName(e.target.value)}
                    placeholder="Fresh fish"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>
                <div>
                  <div style={sectionLabel()}>Price or important detail (optional)</div>
                  <input
                    id="shop-control-spotlight-price"
                    value={spotlightPriceNote}
                    onChange={(e) => setSpotlightPriceNote(e.target.value)}
                    placeholder="₦90,000 for a quarter box"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  borderRadius: 20,
                  border: "1px solid rgba(13,95,168,0.14)",
                  background: "linear-gradient(180deg, #FFFFFF 0%, #F2F8FF 100%)",
                  padding: isCompact ? 12 : 14,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.92)",
                }}
              >
                <div style={sectionLabel()}>{labelWithIcon("image", "Add a picture or short video")}</div>
                <div style={{ marginTop: 7, ...helperText(), fontSize: 13 }}>
                  Choose what helps customers understand the item fastest.
                </div>
                <div style={{ marginTop: 7, ...helperText(), fontSize: 12 }}>
                  For video: use good light, hold the phone steady and keep the item in view. GSN uses the first 10 seconds.
                </div>
                {spotlightMediaFeedback ? (
                  <div
                    data-spotlight-media-feedback={spotlightMediaFeedback.tone}
                    style={{
                      marginTop: 10,
                      ...noticeCard(spotlightMediaFeedback.tone),
                    }}
                  >
                    {spotlightMediaFeedback.text}
                  </div>
                ) : null}
                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(2, minmax(160px, 1fr))",
                    gap: 10,
                  }}
                >
                  <StableButton
                    type="button"
                    kind={spotlightImageFile ? "primary" : "secondary"}
                    onClick={() => {
                      setSpotlightMediaChoice(spotlightVideoFile ? "both" : "image");
                      const input = document.getElementById("shop-control-spotlight-image-file") as HTMLInputElement | null;
                      if (input) {
                        input.value = "";
                        input.click();
                      }
                    }}
                    disabled={preparingSpotlightImage || creatingSpotlight}
                    busy={preparingSpotlightImage}
                    busyLabel="Preparing..."
                    fullWidth
                    debugId="shop-control.spotlight.media.image"
                  >
                    {labelWithIcon("image", spotlightImageFile ? "Picture ready" : "Add picture")}
                  </StableButton>
                  <StableButton
                    type="button"
                    kind={spotlightVideoFile ? "primary" : "secondary"}
                    onClick={() => {
                      setSpotlightMediaChoice(spotlightImageFile ? "both" : "video");
                      const input = document.getElementById("shop-control-spotlight-video-file") as HTMLInputElement | null;
                      if (input) {
                        input.value = "";
                        input.click();
                      }
                    }}
                    disabled={preparingSpotlightVideo || creatingSpotlight}
                    busy={preparingSpotlightVideo}
                    busyLabel="Preparing..."
                    fullWidth
                    debugId="shop-control.spotlight.media.video"
                  >
                    {labelWithIcon("video", spotlightVideoFile ? "Video ready" : "Add video")}
                  </StableButton>
                </div>
                <input
                  id="shop-control-spotlight-image-file"
                  key={spotlightImageInputKey}
                  type="file"
                  data-gmfn-action-root="true"
                  data-cta-id="shop-control.spotlight.image-file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                  aria-disabled={preparingSpotlightImage || creatingSpotlight || undefined}
                  onClick={(e) => {
                    if (preparingSpotlightImage || creatingSpotlight) {
                      e.preventDefault();
                      showNotice("info", "GSN is still preparing the current spotlight media.");
                    }
                  }}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    void handleSpotlightImagePicked(file);
                  }}
                  style={{ display: "none" }}
                />
                <input
                  id="shop-control-spotlight-video-file"
                  key={spotlightVideoInputKey}
                  type="file"
                  data-gmfn-action-root="true"
                  data-cta-id="shop-control.spotlight.video-file"
                  accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime,video/mov"
                  aria-disabled={preparingSpotlightVideo || creatingSpotlight || undefined}
                  onClick={(e) => {
                    if (preparingSpotlightVideo || creatingSpotlight) {
                      e.preventDefault();
                      showNotice("info", "GSN is still preparing the current spotlight media.");
                    }
                  }}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    void handleSpotlightVideoPicked(file);
                  }}
                  style={{ display: "none" }}
                />
                {spotlightHasImage || spotlightHasVideo ? (
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {spotlightImageFile ? (
                      <span style={badge(true)}>
                        {labelWithIcon("check", <>Picture - {formatFileSize(spotlightImageFile.size)}</>)}
                      </span>
                    ) : null}
                    {spotlightVideoFile ? (
                      <span style={badge(true)}>
                        {labelWithIcon("check", <>Video - {formatFileSize(spotlightVideoFile.size)}</>)}
                        {spotlightVideoDurationSeconds != null
                          ? ` - ${spotlightVideoDurationSeconds.toFixed(1)}s`
                          : ""}
                      </span>
                    ) : null}
                    {spotlightHasImage && !spotlightImageFile ? (
                      <span style={badge(true)}>
                        {labelWithIcon('check', 'Saved picture ready')}
                      </span>
                    ) : null}
                    {spotlightHasVideo && !spotlightVideoFile ? (
                      <span style={badge(true)}>
                        {labelWithIcon('check', 'Saved video ready')}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={sectionLabel()}>{labelWithIcon("pen", "How should customers contact you?")}</div>
                <div style={{ marginTop: 7, ...helperText(), fontSize: 13 }}>
                  Give one simple next step.
                </div>
                <textarea
                  id="shop-control-spotlight-customer-message"
                  value={spotlightMessage}
                  onChange={(e) => { setSpotlightMessage(e.target.value); setSpotlightFinishedVideoUrl(''); }}
                  placeholder="Available today. Message me on WhatsApp to order."
                  style={{ ...textAreaStyle(), marginTop: 10 }}
                />
              </div>

              <div
                data-spotlight-publish-actions="persistent"
                style={{
                  marginTop: 12,
                  ...controlGrid(isCompact, 150),
                  ...(isCompact
                    ? {
                        position: "sticky",
                        top: 68,
                        zIndex: 8,
                        padding: 8,
                        borderRadius: 18,
                        border: "1px solid rgba(13,95,168,0.14)",
                        background: "rgba(248,251,255,0.96)",
                        boxShadow: "0 12px 26px rgba(6,24,39,0.14)",
                        backdropFilter: "blur(12px)",
                      }
                    : {}),
                }}
              >
                <PrimaryButton
                  type="button"
                  onClick={() => openSpotlightReview()}
                  disabled={
                    preparingSpotlightImage ||
                    preparingSpotlightVideo ||
                    preparingSpotlightFinish ||
                    creatingSpotlight
                  }
                  busy={preparingSpotlightImage || preparingSpotlightVideo || preparingSpotlightFinish}
                  busyLabel={preparingSpotlightFinish ? "Improving video..." : "Getting media ready..."}
                  fullWidth
                  debugId="shop-control.spotlight.upload.preview"
                >
                  Check and publish
                </PrimaryButton>
                <SecondaryButton
                  type="button"
                  onClick={collapseSpotlightTools}
                  fullWidth
                  debugId="shop-control.spotlight.upload.cancel"
                >
                  Close
                </SecondaryButton>
              </div>

              {spotlightVideoFile ? (
                <details data-spotlight-video-options style={{ marginTop: 10 }}>
                  <StableDisclosureSummary
                    debugId="shop-control.spotlight.video-options"
                    stableHeight={44}
                    style={{
                      display: "grid",
                      gap: 2,
                      padding: "9px 12px",
                      borderRadius: 16,
                      border: "1px solid rgba(13,95,168,0.18)",
                      background: "rgba(255,255,255,0.86)",
                      color: "#0B2D4A",
                      fontWeight: 900,
                      listStyle: "none",
                    }}
                  >
                    <span>Video options</span>
                    <span style={{ ...helperText(), fontSize: 12, fontWeight: 700 }}>
                      {videoOptionsSummary}
                    </span>
                  </StableDisclosureSummary>

                  <div style={{ marginTop: 8, ...innerCard("#F8FBFF"), display: "grid", gap: 10 }}>
                    <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontWeight: 900, color: "#0B2D4A" }}>
                      <input
                        type="checkbox"
                        checked={spotlightNaturalFinishEnabled}
                        onChange={(event) => {
                          setSpotlightNaturalFinishEnabled(event.target.checked);
                          setSpotlightFinishedVideoUrl("");
                        }}
                      />
                      Improve my video automatically
                    </label>
                    <div style={{ ...helperText(), fontSize: 12 }}>
                      GSN Natural Finish adds your shop name and prepares the clip. It does not change the item or certify its condition.
                    </div>
                    {spotlightNaturalFinishEnabled ? (
                      <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
                        <label style={{ color: "#0B2D4A", fontSize: 12, fontWeight: 850 }}>
                          Finish length
                          <select
                            value={spotlightNaturalFinishSeconds}
                            onChange={(event) => {
                              setSpotlightNaturalFinishSeconds(Number(event.target.value) === 5 ? 5 : 10);
                              setSpotlightFinishedVideoUrl("");
                            }}
                            style={{ ...inputStyle(), width: "auto", minWidth: 170, marginTop: 6 }}
                          >
                            <option value={5}>Short · 5 seconds</option>
                            <option value={10}>Full · 10 seconds</option>
                          </select>
                        </label>
                        {spotlightFinishedVideoUrl ? <span style={badge(true)}>Improved video ready</span> : null}
                      </div>
                    ) : null}

                    <VideoSoundEditor
                      value={spotlightVideoSound}
                      onChange={(sound) => {
                        setSpotlightVideoSound(sound);
                        setSpotlightFinishedVideoUrl("");
                      }}
                      disabled={preparingSpotlightVideo || preparingSpotlightFinish || creatingSpotlight}
                      debugIdPrefix="shop-control.spotlight.video-sound"
                    />
                  </div>
                </details>
              ) : null}
            </div>

          </>
        ) : (
          <>
            <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 58%, #EAF4FF 100%)")}>
              <div style={sectionLabel()}>{labelWithIcon("eye", "Check before publishing")}</div>
              <div style={{ marginTop: 10 }}>
                {spotlightImagePreviewUrl || spotlightVideoPreviewUrl ? (
                  <SpotlightMediaFrame
                    imageUrl={resolveSpotlightMediaSrc(spotlightImagePreviewUrl)}
                    videoUrl={resolveSpotlightMediaSrc(spotlightVideoPreviewUrl)}
                    videoPoster={resolveSpotlightMediaSrc(spotlightImagePreviewUrl)}
                    alt="Draft spotlight preview"
                    frameStyle={{
                      minHeight: isCompact ? 240 : 280,
                      height: isCompact ? 240 : 280,
                      borderRadius: 18,
                    }}
                    mediaStyle={{
                      width: "100%",
                      height: "100%",
                    }}
                    autoPlayVideo={Boolean(spotlightVideoPreviewUrl)}
                    mutedVideo={Boolean(spotlightVideoPreviewUrl)}
                    loopVideo={Boolean(spotlightVideoPreviewUrl)}
                    showAudioUnlock={Boolean(spotlightVideoPreviewUrl)}
                    audioUnlockLabel="Sound on"
                    maxVideoSeconds={spotlightPilotMaxVideoSeconds}
                  />
                ) : (
                  <div
                    style={{
                      minHeight: 220,
                      borderRadius: 16,
                      border: "1px solid rgba(13,95,168,0.12)",
                      background: "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)",
                      display: "grid",
                      placeItems: "center",
                      textAlign: "center",
                      padding: 16,
                    }}
                  >
                    <div>
                      <div style={{ color: "#0B1F33", fontSize: 16, fontWeight: 900 }}>
                        Add a picture or video first
                      </div>
                      <div style={{ marginTop: 8, ...helperText(), fontSize: 13, maxWidth: 260 }}>
                        Choose Change details below, then add the picture or short video.
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 12, color: "#0B1F33", fontWeight: 900, fontSize: 16 }}>
                {spotlightPreviewMessage || "Media-only spotlight"}
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={badge(true)}>
                  {labelWithIcon(
                    spotlightPriorityMode === "paid" ? "financeInstitution" : "megaphone",
                    spotlightPriorityMode === "paid" ? "Paid promotion" : "Free promotion"
                  )}
                </span>
                {spotlightPreviewHasPicture ? (
                  <span style={badge(false)}>{labelWithIcon("image", "Picture")}</span>
                ) : null}
                {spotlightPreviewHasVideo ? (
                  <span style={badge(false)}>{labelWithIcon("video", "Video")}</span>
                ) : null}
              </div>
            </div>

            <div style={controlGrid(isCompact, 150)}>
              <PrimaryButton
                type="button"
                onClick={() => handleCreateSpotlight()}
                disabled={creatingSpotlight || !spotlightCanContinueToPreview}
                busy={creatingSpotlight}
                busyLabel="Publishing..."
                fullWidth
                debugId="shop-control.spotlight.preview.publish"
              >
                {shopActionsLocked && spotlightPriorityMode === "paid"
                  ? "Publish after identity review"
                  : creatingSpotlight
                  ? "Publishing..."
                  : "Publish now"}
              </PrimaryButton>
              <SecondaryButton
                type="button"
                onClick={() => setSpotlightFlowStep("upload")}
                fullWidth
                debugId="shop-control.spotlight.preview.back"
              >
                Change details
              </SecondaryButton>
            </div>
          </>
        )}
      </div>
      {!isPaidDraft ? (
        <div
          data-gsn-shop-reel="free-pilot"
          style={{
            marginTop: 14,
            ...innerCard("linear-gradient(180deg, #07172C 0%, #0B3154 100%)"),
            border: "1px solid rgba(246,215,122,0.34)",
            color: "#F8FBFF",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ ...sectionLabel(), color: "#F6D77A" }}>GSN Shop Reel</div>
            <span style={{ ...badge(true), background: "#FFF8DE", color: "#704600" }}>Free pilot</span>
          </div>
          <div style={{ marginTop: 8, fontSize: isCompact ? 19 : 22, fontWeight: 950, lineHeight: 1.15 }}>
            Take your shop outside GSN
          </div>
          <div style={{ marginTop: 7, color: "#D7E3F1", fontSize: 13, fontWeight: 750, lineHeight: 1.45 }}>
            Use a selected picture or finished short video. GSN pairs the Reel with your public-shop link; you review it, then choose where to post it.
          </div>

          {shopReelShareReady ? (
            <>
              <div style={{ marginTop: 12 }}>
                <SpotlightMediaFrame
                  videoUrl={resolvedShopReelVideoUrl}
                  alt="Prepared GSN Shop Reel"
                  frameStyle={{ minHeight: isCompact ? 220 : 280, height: isCompact ? 220 : 280, borderRadius: 18 }}
                  mediaStyle={{ width: "100%", height: "100%" }}
                  autoPlayVideo={false}
                  mutedVideo
                  loopVideo
                  showAudioUnlock
                  audioUnlockLabel="Sound on"
                  maxVideoSeconds={10}
                />
              </div>
              <div style={{ marginTop: 12, ...controlGrid(isCompact, 150) }}>
                <PrimaryButton
                  type="button"
                  onClick={() => { void shareShopReelVideo(); }}
                  fullWidth
                  debugId="shop-control.reel.share-video"
                >
                  Share Reel from phone
                </PrimaryButton>
                <SocialTagShareButton
                  target={shopReelShareTarget}
                  buttonLabel="Choose link channel"
                  buttonKind="secondary"
                  fullWidth
                  stableHeight={50}
                  debugId="shop-control.reel.share"
                  onResult={(tone, text) => showNotice(tone, text)}
                />
                <SecondaryButton
                  type="button"
                  onClick={() => { void downloadShopReel(); }}
                  fullWidth
                  debugId="shop-control.reel.download"
                >
                  Download reel
                </SecondaryButton>
              </div>
              <div style={{ marginTop: 9, color: "#D7E3F1", fontSize: 12, fontWeight: 750, lineHeight: 1.45 }}>
                Package: reviewed video + public shop link + a short GSN note about Spotlight, Demand Box and separately checked TrustSlip evidence.
              </div>
            </>
          ) : (
            <div style={{ marginTop: 12, ...innerCard("rgba(255,255,255,0.96)"), color: "#07172C" }}>
              {spotlightImageFile && !spotlightVideoFile ? (
                <>
                  <div style={{ fontSize: 14, fontWeight: 950 }}>Turn this picture into a short Reel.</div>
                  <div style={{ marginTop: 6, ...helperText(), fontSize: 12.5, lineHeight: 1.4 }}>
                    GSN will keep your full picture visible, add gentle motion and your shop label, and create a {spotlightNaturalFinishSeconds}-second video. Your Spotlight remains a picture.
                  </div>
                  <label
                    style={{
                      display: "grid",
                      gap: 6,
                      marginTop: 10,
                      fontSize: 12.5,
                      fontWeight: 900,
                      color: "#183451",
                    }}
                  >
                    Reel length
                    <select
                      value={spotlightNaturalFinishSeconds}
                      onChange={(event) => setSpotlightNaturalFinishSeconds(event.target.value === "5" ? 5 : 10)}
                      data-reel-picture-length="true"
                      style={{
                        width: "100%",
                        minHeight: 46,
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "1px solid rgba(24,52,81,0.22)",
                        background: "#FFFFFF",
                        color: "#07172C",
                        font: "inherit",
                        fontSize: 16,
                        fontWeight: 850,
                      }}
                    >
                      <option value={5}>Short · 5 seconds</option>
                      <option value={10}>Full · 10 seconds</option>
                    </select>
                  </label>
                  <VideoSoundEditor
                    value={shopReelPictureSound}
                    onChange={(sound) => {
                      setShopReelPictureSound(sound);
                      clearPreparedShopReel();
                    }}
                    disabled={preparingShopReelFromImage}
                    debugIdPrefix="shop-control.reel.picture-sound"
                    silentSource
                  />
                  <div style={{ marginTop: 10 }}>
                    <PrimaryButton
                      type="button"
                      onClick={() => { void prepareShopReelFromImage(); }}
                      disabled={preparingShopReelFromImage}
                      busy={preparingShopReelFromImage}
                      busyLabel="Creating Reel..."
                      fullWidth
                      debugId="shop-control.reel.create-from-picture"
                    >
                      Create Reel from picture
                    </PrimaryButton>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 14, fontWeight: 950 }}>Add a picture or finish one short video above.</div>
                  <div style={{ marginTop: 6, ...helperText(), fontSize: 12.5, lineHeight: 1.4 }}>
                    A picture can become a short GSN Reel here. For video, leave automatic improvement on, then tap Check and publish.
                  </div>
                </>
              )}
            </div>
          )}

          <details style={{ marginTop: 10 }}>
            <StableDisclosureSummary
              debugId="shop-control.reel.boundary"
              stableHeight={42}
              style={{
                padding: "8px 10px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.10)",
                color: "#F8FBFF",
                fontSize: 12.5,
                fontWeight: 900,
              }}
            >
              What this pilot does
            </StableDisclosureSummary>
            <div style={{ marginTop: 8, color: "#D7E3F1", fontSize: 12, lineHeight: 1.45 }}>
              It can make a bounded five- or ten-second video from your selected picture, optionally add sound you own or may use, or reuse your reviewed video, then share it with your shop link. It does not post automatically, prove delivery or sales, invent product detail, use private Vault content, or supply a built-in music catalogue.
            </div>
          </details>
        </div>
      ) : null}
    </section>
  );
}
