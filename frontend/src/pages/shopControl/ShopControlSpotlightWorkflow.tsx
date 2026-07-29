import React from "react";
import SpotlightMediaFrame from "../../components/SpotlightMediaFrame";
import {
  PrimaryButton,
  SecondaryButton,
  StableButton,
} from "../../components/StableButton";
import { GsnLegacyIcon } from "../../components/GsnLegacyIcon";
import { navigateWithOrigin } from "../../lib/nav";

type ShopControlSpotlightWorkflowProps = Record<string, any>;

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
    shopActionsLocked,
  } = props;

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
        {spotlightStepBadges.map((item: any) => (
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

      {currentActiveSpotlight ? (
        <div
          style={{
            marginTop: 14,
            ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
            border: "1px solid rgba(11,31,51,0.08)",
          }}
        >
          <div style={sectionLabel()}>{labelWithIcon("megaphone", "Live now")}</div>
          <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900, fontSize: 16 }}>
            {firstTruthy(currentActiveSpotlight?.message, "Live spotlight is active.")}
          </div>
          <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
            Publishing a new one will replace the current live spotlight for this shop.
          </div>
        </div>
      ) : null}

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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div
                style={{
                  ...innerCard(
                    spotlightPriorityMode === "free"
                      ? "linear-gradient(180deg, #0B2D4A 0%, #061827 100%)"
                      : "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"
                  ),
                  border:
                    spotlightPriorityMode === "free"
                      ? "1px solid rgba(242,199,102,0.36)"
                      : "1px solid rgba(13,95,168,0.12)",
                }}
              >
                {controlIconTile("megaphone", spotlightPriorityMode === "free")}
                <div
                  style={{
                    marginTop: 10,
                    color: spotlightPriorityMode === "free" ? "#FFFFFF" : "#07172C",
                    fontSize: 17,
                    fontWeight: 950,
                  }}
                >
                  Free Spotlight
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: spotlightPriorityMode === "free" ? "#D7E3F1" : "#466078",
                    fontSize: 13,
                    lineHeight: 1.45,
                    fontWeight: 700,
                  }}
                >
                  Normal community visibility.
                </div>
                <SecondaryButton
                  type="button"
                  onClick={() => setSpotlightPriorityMode("free")}
                  fullWidth
                  style={{ marginTop: 12 }}
                  debugId="shop-control.spotlight.free-lane"
                >
                  Use free lane
                </SecondaryButton>
              </div>

              <div
                style={{
                  ...innerCard(
                    spotlightPriorityMode === "paid"
                      ? "linear-gradient(180deg, #FFF8DE 0%, #F8E6A6 100%)"
                      : "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"
                  ),
                  border:
                    spotlightPriorityMode === "paid"
                      ? "1px solid rgba(183,128,24,0.28)"
                      : "1px solid rgba(13,95,168,0.12)",
                }}
              >
                {controlIconTile("financeInstitution", spotlightPriorityMode === "paid")}
                <div
                  style={{
                    marginTop: 10,
                    color: "#07172C",
                    fontSize: 17,
                    fontWeight: 950,
                  }}
                >
                  Spotlight Subscription
                </div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 13, lineHeight: 1.45 }}>
                  Paid priority opens on its own focused page.
                </div>
                <SecondaryButton
                  type="button"
                  onClick={() =>
                    navigateWithOrigin(navigate, routes.subscriptionSpotlight, location)
                  }
                  fullWidth
                  style={{ marginTop: 12 }}
                  debugId="shop-control.spotlight.paid-lane"
                >
                  Open paid lane
                </SecondaryButton>
                <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                  Payment and paid publishing are kept separate from Free Spotlight.
                </div>
              </div>
            </div>

            <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)")}>
              <div style={sectionLabel()}>{labelWithIcon("navigation", "Choose what people will see")}</div>
              <div style={{ marginTop: 8, color: "#0B1F33", fontSize: 17, fontWeight: 900 }}>
                Pick one clear format.
              </div>
              <div style={{ marginTop: 12, ...controlGrid(isCompact, 150) }}>
                <StableButton
                  type="button"
                  kind={spotlightMediaChoice === "image" ? "primary" : "secondary"}
                  onClick={() => setSpotlightMediaChoice("image")}
                  fullWidth
                  debugId="shop-control.spotlight.media.image"
                >
                  {labelWithIcon("image", "Picture")}
                </StableButton>
                <StableButton
                  type="button"
                  kind={spotlightMediaChoice === "video" ? "primary" : "secondary"}
                  onClick={() => setSpotlightMediaChoice("video")}
                  fullWidth
                  debugId="shop-control.spotlight.media.video"
                >
                  {labelWithIcon("video", "Video")}
                </StableButton>
                <StableButton
                  type="button"
                  kind={spotlightMediaChoice === "both" ? "primary" : "secondary"}
                  onClick={() => setSpotlightMediaChoice("both")}
                  fullWidth
                  debugId="shop-control.spotlight.media.both"
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                    {inlineIcon("image")}
                    {inlineIcon("video")}
                    <span>Picture + video</span>
                  </span>
                </StableButton>
              </div>
            </div>

            <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 58%, #EAF4FF 100%)")}>
              <div style={sectionLabel()}>Product details</div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                Your shop is already linked to your GSN ID. Add only the item or update people should see now.
              </div>
              <div
                style={{
                  marginTop: 12,
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
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 14,
              }}
            >
              <div
                aria-hidden={spotlightMediaChoice === "video" || undefined}
                style={{
                  ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
                  visibility: spotlightMediaChoice === "video" ? "hidden" : "visible",
                  pointerEvents: spotlightMediaChoice === "video" ? "none" : "auto",
                  minHeight: 170,
                }}
              >
                  <div style={sectionLabel()}>{labelWithIcon("image", "Picture")}</div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    Choose the picture people should notice first.
                  </div>
                  <input
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
                    style={{ ...inputStyle(), marginTop: 10 }}
                  />
                  {spotlightImageFile ? (
                    <div style={{ marginTop: 10 }}>
                      <span style={badge(true)}>
                        {labelWithIcon("check", <>Picture ready - {formatFileSize(spotlightImageFile.size)}</>)}
                      </span>
                    </div>
                  ) : null}
              </div>

              <div
                aria-hidden={spotlightMediaChoice === "image" || undefined}
                style={{
                  ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
                  visibility: spotlightMediaChoice === "image" ? "hidden" : "visible",
                  pointerEvents: spotlightMediaChoice === "image" ? "none" : "auto",
                  minHeight: 170,
                }}
              >
                  <div style={sectionLabel()}>{labelWithIcon("video", "Short video")}</div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    Use a short clip when movement explains the shop better.
                  </div>
                  <input
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
                    style={{ ...inputStyle(), marginTop: 10 }}
                  />
                  {spotlightVideoFile ? (
                    <div style={{ marginTop: 10 }}>
                      <span style={badge(true)}>
                        {labelWithIcon("check", <>Video ready - {formatFileSize(spotlightVideoFile.size)}</>)}
                        {spotlightVideoDurationSeconds != null
                          ? ` - ${spotlightVideoDurationSeconds.toFixed(1)}s`
                          : ""}
                      </span>
                    </div>
                  ) : null}
              </div>
            </div>

            <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 58%, #EAF4FF 100%)")}>
              <div style={sectionLabel()}>{labelWithIcon("pen", "Message")}</div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                Add availability, delivery, WhatsApp instruction, or any short note for this update.
              </div>
              <textarea
                value={spotlightMessage}
                onChange={(e) => setSpotlightMessage(e.target.value)}
                placeholder="Available today. Message me on WhatsApp to order."
                style={{ ...textAreaStyle(), marginTop: 10 }}
              />
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
                Preview spotlight
              </PrimaryButton>
              <SecondaryButton
                type="button"
                onClick={collapseSpotlightTools}
                fullWidth
                debugId="shop-control.spotlight.upload.cancel"
              >
                Cancel spotlight
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