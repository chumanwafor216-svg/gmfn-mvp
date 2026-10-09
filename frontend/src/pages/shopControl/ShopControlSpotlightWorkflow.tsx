import React from "react";
import SpotlightMediaFrame from "../../components/SpotlightMediaFrame";
import {
  PrimaryButton,
  SecondaryButton,
  StableButton,
} from "../../components/StableButton";
import { GsnLegacyIcon } from "../../components/GsnLegacyIcon";
import { navigateWithOrigin } from "../../lib/nav";
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

function liveSpotlightStatus(item: ShopControlSpotlightBroadcast | null) {
  const expiresRaw = safeSpotlightText(item?.expires_at);
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
    formatFileSize,
    preparingSpotlightVideo,
    spotlightVideoInputKey,
    handleSpotlightVideoPicked,
    spotlightVideoFile,
    spotlightVideoDurationSeconds,
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
    handleTakeDownCurrentSpotlight,
    shopActionsLocked,
  } = props;
  const currentLiveSpotlightIsPaid =
    firstTruthy(currentActiveSpotlight?.priority_mode, "free").toLowerCase() === "paid";

  return (
    <section
      id="shop-control-spotlight"
      style={pageCard("linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 54%, #EAF3FF 100%)")}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "72px minmax(0, 1fr)",
          gap: 14,
          alignItems: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 64,
            height: 64,
            borderRadius: 22,
            display: "grid",
            placeItems: "center",
            background: "rgba(255,255,255,0.97)",
            color: "#7A4A00",
            border: "1px solid rgba(226,192,106,0.36)",
            boxShadow:
              "0 16px 30px rgba(6,24,39,0.10), inset 0 1px 0 rgba(255,255,255,0.96)",
          }}
        >
          <GsnLegacyIcon name={spotlightLaneIcon} size={38} />
        </div>

        <div>
          <div style={sectionLabel()}>Spotlight publisher</div>
          <div
            style={{
              marginTop: 8,
              color: "#07172C",
              fontSize: isCompact ? 23 : 28,
              fontWeight: 950,
              lineHeight: 1.08,
            }}
          >
            {spotlightPortalTitle}
          </div>
          <div style={{ marginTop: 8, ...helperText(), maxWidth: 760 }}>
            {spotlightPortalSubtitle}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {spotlightStepBadges.map((item) => (
          <span key={item.key} style={badge(spotlightFlowStep === item.key)}>
            {item.label}
          </span>
        ))}
        <span style={badge(false)}>Community: {communityName}</span>
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
                  imageUrl={currentActiveSpotlight?.image_url || ""}
                  videoUrl={currentActiveSpotlight?.video_url || ""}
                  videoPoster={currentActiveSpotlight?.image_url || ""}
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
                  autoPlayVideo={Boolean(currentActiveSpotlight?.video_url)}
                  mutedVideo={Boolean(currentActiveSpotlight?.video_url)}
                  loopVideo={Boolean(currentActiveSpotlight?.video_url)}
                  showAudioUnlock={Boolean(currentActiveSpotlight?.video_url)}
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
                    Take it down first if the media or wording is wrong. After it is down,
                    publish the corrected Spotlight from this page.
                    {currentLiveSpotlightIsPaid
                      ? " Paid Spotlight payments are not refunded by this action."
                      : ""}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <StableButton
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
                    onClick={() => setSpotlightFlowStep("upload")}
                    debugId="shop-control.spotlight.live.open-publisher"
                  >
                    Open publisher
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    onClick={() => handleTakeDownCurrentSpotlight()}
                    disabled={takingDownSpotlight || creatingSpotlight}
                    debugId="shop-control.spotlight.live.take-down"
                  >
                    {takingDownSpotlight ? "Taking down..." : "Take down live Spotlight"}
                  </SecondaryButton>
                </div>
              </div>
            </div>
          </div>
        );
      })() : null}
      {spotlightPublishFeedback ? (
        <div style={{ marginTop: 14, ...noticeCard(spotlightPublishFeedback.tone) }}>
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
              <div style={sectionLabel()}>{labelWithIcon("megaphone", "Create one shop update")}</div>
              <div style={{ marginTop: 8, color: "#0B1F33", fontSize: isCompact ? 21 : 24, fontWeight: 950, lineHeight: 1.1 }}>
                Picture / video, item, message.
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                Keep it simple outside. GSN handles the shop link, community, timing, and publishing rules inside.
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <div style={sectionLabel()}>Item or offer</div>
                  <input
                    value={spotlightProductName}
                    onChange={(e) => setSpotlightProductName(e.target.value)}
                    placeholder="Fish for sale"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>
                <div>
                  <div style={sectionLabel()}>Price or key detail</div>
                  <input
                    value={spotlightPriceNote}
                    onChange={(e) => setSpotlightPriceNote(e.target.value)}
                    placeholder="Quarter box N90k"
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
                <div style={sectionLabel()}>{labelWithIcon("image", "Picture / video")}</div>
                <div style={{ marginTop: 7, ...helperText(), fontSize: 13 }}>
                  Add a picture, a short video, or both. Use what people will understand fastest.
                </div>
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
                      input?.click();
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
                      input?.click();
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
                {spotlightImageFile || spotlightVideoFile ? (
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
                  </div>
                ) : null}
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={sectionLabel()}>{labelWithIcon("pen", "Message")}</div>
                <div style={{ marginTop: 7, ...helperText(), fontSize: 13 }}>
                  Tell customers what is available or how to order.
                </div>
                <textarea
                  value={spotlightMessage}
                  onChange={(e) => setSpotlightMessage(e.target.value)}
                  placeholder="Available today. Message me on WhatsApp to order."
                  style={{ ...textAreaStyle(), marginTop: 10 }}
                />
              </div>
            </div>

            <div style={controlGrid(isCompact, 150)}>
              <PrimaryButton
                type="button"
                onClick={() => setSpotlightFlowStep("preview")}
                disabled={
                  preparingSpotlightImage ||
                  preparingSpotlightVideo ||
                  !spotlightCanContinueToPreview
                }
                busy={preparingSpotlightImage || preparingSpotlightVideo}
                busyLabel="Preparing media..."
                fullWidth
                debugId="shop-control.spotlight.upload.preview"
              >
                Preview
              </PrimaryButton>
              <SecondaryButton
                type="button"
                onClick={collapseSpotlightTools}
                fullWidth
                debugId="shop-control.spotlight.upload.cancel"
              >
                Cancel
              </SecondaryButton>
            </div>
          </>
        ) : (
          <>
            <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 58%, #EAF4FF 100%)")}>
              <div style={sectionLabel()}>{labelWithIcon("eye", "Preview")}</div>
              <div style={{ marginTop: 10 }}>
                {spotlightImagePreviewUrl || spotlightVideoPreviewUrl ? (
                  <SpotlightMediaFrame
                    imageUrl={spotlightImagePreviewUrl}
                    videoUrl={spotlightVideoPreviewUrl}
                    videoPoster={spotlightImagePreviewUrl}
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
                        No media is ready yet
                      </div>
                      <div style={{ marginTop: 8, ...helperText(), fontSize: 13, maxWidth: 260 }}>
                        Go back and add the picture or short video first.
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
                    spotlightPriorityMode === "paid" ? "Paid lane" : "Free lane"
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
              <SecondaryButton
                type="button"
                onClick={() => setSpotlightFlowStep("upload")}
                fullWidth
                debugId="shop-control.spotlight.preview.back"
              >
                Back to upload
              </SecondaryButton>
              <PrimaryButton
                type="button"
                onClick={() => handleCreateSpotlight()}
                disabled={creatingSpotlight}
                busy={creatingSpotlight}
                busyLabel="Publishing..."
                fullWidth
                debugId="shop-control.spotlight.preview.publish"
              >
                {shopActionsLocked && spotlightPriorityMode === "paid"
                  ? "Publish after identity review"
                  : creatingSpotlight
                  ? "Publishing..."
                  : "Publish spotlight"}
              </PrimaryButton>
              <SecondaryButton
                type="button"
                onClick={collapseSpotlightTools}
                fullWidth
                debugId="shop-control.spotlight.preview.cancel"
              >
                Cancel spotlight
              </SecondaryButton>
            </div>
          </>
        )}
      </div>
    </section>
  );
}