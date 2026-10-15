import React, { useMemo, useState } from "react";
import {
  CardActionRow,
  PrimaryButton,
  SecondaryButton,
  SubtleButton,
} from "./StableButton";
import {
  buildFacebookShareUrl,
  buildLinkedInShareUrl,
  buildPublicShareText,
  buildWhatsAppUrl,
  buildSocialShareText,
  buildXIntentShareUrl,
  copyToClipboard,
  normalizeUrl,
  shareTargetForChannel,
  type ShareResultChannel,
  type ShareTarget,
} from "../lib/share";

type NoticeTone = "success" | "error";

type SocialTagShareButtonProps = {
  target: ShareTarget;
  disabled?: boolean;
  buttonLabel?: string;
  triggerIcon?: React.ReactNode;
  buttonKind?: "primary" | "secondary";
  debugId: string;
  stableHeight?: number;
  fullWidth?: boolean;
  minWidth?: number | string;
  style?: React.CSSProperties;
  onBeforeOpen?: () => boolean | Promise<boolean>;
  onResult?: (tone: NoticeTone, text: string, channel?: ShareResultChannel) => void;
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9998,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 12,
  background: "rgba(2, 8, 23, 0.62)",
};

const modalStyle: React.CSSProperties = {
  width: 360,
  maxWidth: "96vw",
  maxHeight: "82vh",
  overflowY: "auto",
  borderRadius: 16,
  border: "1px solid rgba(203, 213, 225, 0.92)",
  background: "#FFFFFF",
  boxShadow: "0 24px 60px rgba(2, 8, 23, 0.28)",
  padding: 14,
  color: "#0F172A",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 44,
  borderRadius: 12,
  border: "1px solid #CBD5E1",
  background: "#F8FAFC",
  color: "#0F172A",
  padding: "9px 11px",
  fontSize: 15,
  fontWeight: 800,
  boxSizing: "border-box",
  outline: "none",
};

const noteStyle: React.CSSProperties = {
  marginTop: 8,
  color: "#475569",
  fontSize: 12.5,
  lineHeight: 1.38,
  fontWeight: 700,
};

const shareButtonStyle: React.CSSProperties = {
  minWidth: 0,
  width: "100%",
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 1000,
  padding: "7px 9px",
};

function openExternal(url: string): boolean {
  if (!url) return false;
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  return Boolean(opened);
}

export default function SocialTagShareButton({
  target,
  disabled = false,
  buttonLabel = "Share",
  triggerIcon,
  buttonKind = "secondary",
  debugId,
  stableHeight,
  fullWidth,
  minWidth,
  style,
  onBeforeOpen,
  onResult,
}: SocialTagShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [shareName, setShareName] = useState("");
  const [handleOpen, setHandleOpen] = useState(false);
  const [moreCopyOpen, setMoreCopyOpen] = useState(false);
  const [localNotice, setLocalNotice] = useState<{ tone: NoticeTone; text: string } | null>(null);

  const cleanTarget = useMemo<ShareTarget>(
    () => ({
      title: String(target.title || "GSN").trim(),
      message: String(target.message || "").trim(),
      socialMessage: String(target.socialMessage || "").trim(),
      socialUrl: normalizeUrl(target.socialUrl || ""),
      url: normalizeUrl(target.url),
    }),
    [target]
  );
  const canShare = Boolean(cleanTarget.url) && !disabled;

  function report(tone: NoticeTone, text: string, channel?: ShareResultChannel) {
    setLocalNotice({ tone, text });
    onResult?.(tone, text, channel);
  }

  const TriggerButton = buttonKind === "primary" ? PrimaryButton : SecondaryButton;

  async function openShareChooser() {
    if (disabled) return;
    if (onBeforeOpen) {
      const ok = await onBeforeOpen();
      if (!ok) return;
    }
    setOpen(true);
  }

  async function copyPreparedText(kind: "copy" | "instagram" | "tiktok" | "linkedin") {
    if (!canShare) {
      report("error", "Share link is not ready yet.");
      return;
    }
    const channelTarget = shareTargetForChannel(cleanTarget, kind);
    const copied = await copyToClipboard(
      buildSocialShareText(channelTarget, kind === "copy" ? "" : shareName, kind)
    );
    report(
      copied ? "success" : "error",
      copied
        ? kind === "instagram"
          ? "Caption copied for Instagram."
          : kind === "tiktok"
            ? "Caption copied for TikTok."
            : kind === "linkedin"
              ? "LinkedIn text copied."
              : "Tag text copied."
        : "Copy did not complete. Select the text and copy it manually.",
      kind
    );
  }

  async function copyAllPreparedText() {
    if (!canShare) {
      report("error", "Share link is not ready yet.");
      return;
    }
    const text = [
      "X",
      buildSocialShareText(shareTargetForChannel(cleanTarget, "x"), shareName, "x"),
      "",
      "LinkedIn",
      buildSocialShareText(shareTargetForChannel(cleanTarget, "linkedin"), shareName, "linkedin"),
      "",
      "Instagram",
      buildSocialShareText(shareTargetForChannel(cleanTarget, "instagram"), shareName, "instagram"),
      "",
      "TikTok",
      buildSocialShareText(shareTargetForChannel(cleanTarget, "tiktok"), shareName, "tiktok"),
    ].join("\n");
    const copied = await copyToClipboard(text);
    report(
      copied ? "success" : "error",
      copied
        ? "All prepared share captions copied."
        : "Copy did not complete. Select the text and copy it manually.",
      "copy"
    );
  }

  function openX() {
    if (!canShare) {
      report("error", "Share link is not ready yet.");
      return;
    }
    const channelTarget = shareTargetForChannel(cleanTarget, "x");
    const opened = openExternal(buildXIntentShareUrl(channelTarget, shareName));
    report(
      opened ? "success" : "error",
      opened
        ? "X post opened. Review it before posting."
        : "X could not open. Copy the text instead.",
      "x"
    );
  }

  function openFacebook() {
    if (!canShare) {
      report("error", "Share link is not ready yet.");
      return;
    }
    const channelTarget = shareTargetForChannel(cleanTarget, "facebook");
    const opened = openExternal(buildFacebookShareUrl(channelTarget));
    report(
      opened ? "success" : "error",
      opened
        ? "Facebook share opened. Add any tag there before posting."
        : "Facebook could not open. Copy the text instead.",
      "facebook"
    );
  }

  async function openLinkedIn() {
    if (!canShare) {
      report("error", "Share link is not ready yet.");
      return;
    }
    const channelTarget = shareTargetForChannel(cleanTarget, "linkedin");
    const opened = openExternal(buildLinkedInShareUrl(channelTarget));
    const copied = opened
      ? await copyToClipboard(buildSocialShareText(channelTarget, shareName, "linkedin"))
      : false;
    report(
      opened ? "success" : "error",
      opened
        ? copied
          ? "LinkedIn share opened. Short caption copied; paste it before posting."
          : "LinkedIn share opened. Add a short note there before posting."
        : "LinkedIn could not open. Copy the text instead.",
      "linkedin"
    );
  }

  function openWhatsApp() {
    if (!canShare) {
      report("error", "Share link is not ready yet.");
      return;
    }
    const channelTarget = shareTargetForChannel(cleanTarget, "whatsapp");
    const opened = openExternal(buildWhatsAppUrl(buildPublicShareText(channelTarget)));
    report(
      opened ? "success" : "error",
      opened
        ? "WhatsApp opened. Choose a person or group, then send."
        : "WhatsApp could not open. Copy the message instead.",
      "whatsapp"
    );
  }

  async function openNativeShare() {
    if (!canShare) {
      report("error", "Share link is not ready yet.");
      return;
    }
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      report("error", "Your browser does not offer the phone share sheet.");
      return;
    }

    const channelTarget = shareTargetForChannel(cleanTarget, "native");
    try {
      await navigator.share({
        title: channelTarget.title,
        text: buildPublicShareText(channelTarget),
      });
      report("success", "Phone share completed.", "native");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      report("error", "Phone share did not complete. Choose another option.");
    }
  }

  const nativeShareAvailable =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <>
      <TriggerButton
        type="button"
        onClick={() => {
          void openShareChooser();
        }}
        disabled={disabled}
        debugId={debugId}
        stableHeight={stableHeight}
        fullWidth={fullWidth}
        minWidth={minWidth}
        style={style}
        title="Choose how to share this GSN package"
      >
        {triggerIcon ? <span aria-hidden="true">{triggerIcon}</span> : null}
        <span>{buttonLabel}</span>
      </TriggerButton>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choose share channel"
          style={overlayStyle}
          onClick={() => setOpen(false)}
        >
          <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div
                  style={{
                    color: "#64748B",
                    fontSize: 12,
                    fontWeight: 1000,
                    letterSpacing: 0,
                    textTransform: "uppercase",
                  }}
                >
                  Share
                </div>
                <div style={{ marginTop: 3, fontSize: 20, fontWeight: 1000 }}>
                  Choose channel
                </div>
              </div>
              <SubtleButton
                type="button"
                onClick={() => setOpen(false)}
                stableHeight={40}
                minWidth={72}
                debugId="social-tag-share.close"
              >
                Close
              </SubtleButton>
            </div>

            <div style={noteStyle}>
              GSN prepares the message. You still review and post it yourself.
              It cannot guarantee delivery.
            </div>

            <div style={{ marginTop: 10 }}>
              <SubtleButton
                type="button"
                onClick={() => setHandleOpen((current) => !current)}
                stableHeight={38}
                minWidth="100%"
                debugId="social-tag-share.handle-toggle"
                style={{
                  justifyContent: "flex-start",
                  color: "#173750",
                  fontSize: 13,
                  fontWeight: 1000,
                  paddingInline: 10,
                }}
              >
                {handleOpen ? "Hide handle or name" : "Add handle or name"}
              </SubtleButton>
              {handleOpen ? (
              <label style={{ display: "block", marginTop: 8 }}>
                <span
                  style={{
                    display: "block",
                    marginBottom: 5,
                    color: "#334155",
                    fontSize: 12,
                    fontWeight: 1000,
                  }}
                >
                  Handle or name, if needed
                </span>
                <input
                  value={shareName}
                  onChange={(event) => setShareName(event.target.value)}
                  placeholder="@handle or name"
                  aria-label="Handle or name"
                  style={inputStyle}
                />
              </label>
              ) : null}
            </div>

            <CardActionRow
              minHeight={46}
              align="stretch"
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
                gap: 8,
              }}
            >
              <PrimaryButton
                type="button"
                onClick={openWhatsApp}
                stableHeight={46}
                debugId="social-tag-share.whatsapp"
                style={shareButtonStyle}
              >
                WhatsApp
              </PrimaryButton>
              {nativeShareAvailable ? (
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    void openNativeShare();
                  }}
                  stableHeight={46}
                  debugId="social-tag-share.native"
                  style={shareButtonStyle}
                >
                  Phone share
                </SecondaryButton>
              ) : null}
              <SecondaryButton
                type="button"
                onClick={openX}
                stableHeight={46}
                debugId="social-tag-share.x"
                style={shareButtonStyle}
              >
                X
              </SecondaryButton>
              <SecondaryButton
                type="button"
                onClick={() => {
                  void openLinkedIn();
                }}
                stableHeight={46}
                debugId="social-tag-share.linkedin"
                style={shareButtonStyle}
              >
                LinkedIn
              </SecondaryButton>
              <SecondaryButton
                type="button"
                onClick={openFacebook}
                stableHeight={46}
                debugId="social-tag-share.facebook"
                style={shareButtonStyle}
              >
                Facebook
              </SecondaryButton>
              <SecondaryButton
                type="button"
                onClick={() => {
                  void copyPreparedText("copy");
                }}
                stableHeight={46}
                debugId="social-tag-share.copy-text"
                style={shareButtonStyle}
              >
                Copy message
              </SecondaryButton>
            </CardActionRow>

            <div style={{ marginTop: 10 }}>
              <SubtleButton
                type="button"
                onClick={() => setMoreCopyOpen((current) => !current)}
                stableHeight={38}
                minWidth="100%"
                debugId="social-tag-share.more-copy-toggle"
                style={{
                  justifyContent: "flex-start",
                  color: "#475569",
                  fontSize: 12.5,
                  fontWeight: 900,
                  paddingInline: 10,
                }}
              >
                {moreCopyOpen ? "Hide copy options" : "More copy options"}
              </SubtleButton>
              {moreCopyOpen ? (
              <CardActionRow
                minHeight={42}
                align="stretch"
                style={{
                  marginTop: 8,
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    void copyPreparedText("instagram");
                  }}
                  stableHeight={42}
                  debugId="social-tag-share.instagram-copy"
                  style={shareButtonStyle}
                >
                  Instagram
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    void copyPreparedText("tiktok");
                  }}
                  stableHeight={42}
                  debugId="social-tag-share.tiktok-copy"
                  style={shareButtonStyle}
                >
                  TikTok
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    void copyAllPreparedText();
                  }}
                  stableHeight={42}
                  debugId="social-tag-share.copy-all"
                  style={{ ...shareButtonStyle, gridColumn: "1 / -1" }}
                >
                  Copy all variants
                </SecondaryButton>
              </CardActionRow>
              ) : null}
            </div>

            {localNotice ? (
              <div
                style={{
                  marginTop: 12,
                  color: localNotice.tone === "success" ? "#12633F" : "#9F1239",
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                {localNotice.text}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
