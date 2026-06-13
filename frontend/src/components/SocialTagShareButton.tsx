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
  buildSocialShareText,
  buildXIntentShareUrl,
  copyToClipboard,
  normalizeUrl,
  type ShareTarget,
} from "../lib/share";

type NoticeTone = "success" | "error";

type SocialTagShareButtonProps = {
  target: ShareTarget;
  disabled?: boolean;
  buttonLabel?: string;
  buttonKind?: "primary" | "secondary";
  debugId: string;
  stableHeight?: number;
  fullWidth?: boolean;
  minWidth?: number | string;
  style?: React.CSSProperties;
  onResult?: (tone: NoticeTone, text: string) => void;
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
  buttonKind = "secondary",
  debugId,
  stableHeight,
  fullWidth,
  minWidth,
  style,
  onResult,
}: SocialTagShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [shareName, setShareName] = useState("");
  const [localNotice, setLocalNotice] = useState("");

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

  function report(tone: NoticeTone, text: string) {
    setLocalNotice(text);
    onResult?.(tone, text);
  }

  const TriggerButton = buttonKind === "primary" ? PrimaryButton : SecondaryButton;

  async function copyPreparedText(kind: "copy" | "instagram" | "tiktok" | "linkedin") {
    if (!canShare) {
      report("error", "Share link is not ready yet.");
      return;
    }
    const copied = await copyToClipboard(
      buildSocialShareText(cleanTarget, kind === "copy" ? "" : shareName, kind)
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
        : "Copy did not complete. Select the text and copy it manually."
    );
  }

  async function copyAllPreparedText() {
    if (!canShare) {
      report("error", "Share link is not ready yet.");
      return;
    }
    const text = [
      "X",
      buildSocialShareText(cleanTarget, shareName, "x"),
      "",
      "LinkedIn",
      buildSocialShareText(cleanTarget, shareName, "linkedin"),
      "",
      "Instagram",
      buildSocialShareText(cleanTarget, shareName, "instagram"),
      "",
      "TikTok",
      buildSocialShareText(cleanTarget, shareName, "tiktok"),
    ].join("\n");
    const copied = await copyToClipboard(text);
    report(
      copied ? "success" : "error",
      copied
        ? "All prepared share captions copied."
        : "Copy did not complete. Select the text and copy it manually."
    );
  }

  function openX() {
    if (!canShare) {
      report("error", "Share link is not ready yet.");
      return;
    }
    const opened = openExternal(buildXIntentShareUrl(cleanTarget, shareName));
    report(
      opened ? "success" : "error",
      opened
        ? "X post opened. Review it before posting."
        : "X could not open. Copy the text instead."
    );
  }

  function openFacebook() {
    if (!canShare) {
      report("error", "Share link is not ready yet.");
      return;
    }
    const opened = openExternal(buildFacebookShareUrl(cleanTarget));
    report(
      opened ? "success" : "error",
      opened
        ? "Facebook share opened. Add any tag there before posting."
        : "Facebook could not open. Copy the text instead."
    );
  }

  async function openLinkedIn() {
    if (!canShare) {
      report("error", "Share link is not ready yet.");
      return;
    }
    const opened = openExternal(buildLinkedInShareUrl(cleanTarget));
    const copied = opened
      ? await copyToClipboard(buildSocialShareText(cleanTarget, shareName, "linkedin"))
      : false;
    report(
      opened ? "success" : "error",
      opened
        ? copied
          ? "LinkedIn share opened. Short caption copied; paste it before posting."
          : "LinkedIn share opened. Add a short note there before posting."
        : "LinkedIn could not open. Copy the text instead."
    );
  }

  return (
    <>
      <TriggerButton
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        debugId={debugId}
        stableHeight={stableHeight}
        fullWidth={fullWidth}
        minWidth={minWidth}
        style={style}
        title="Choose how to share this GSN package"
      >
        {buttonLabel}
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

            <details style={{ marginTop: 10 }}>
              <summary
                style={{
                  cursor: "pointer",
                  color: "#173750",
                  fontSize: 13,
                  fontWeight: 1000,
                }}
              >
                Add handle or name
              </summary>
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
            </details>

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

            <details style={{ marginTop: 10 }}>
              <summary
                style={{
                  cursor: "pointer",
                  color: "#475569",
                  fontSize: 12.5,
                  fontWeight: 900,
                }}
              >
                More copy options
              </summary>
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
            </details>

            {localNotice ? (
              <div
                style={{
                  marginTop: 12,
                  color: "#12633F",
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                {localNotice}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
