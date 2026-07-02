// src/components/ShareButtons.tsx
import React, { useMemo, useState } from "react";
import {
  CardActionRow,
  PrimaryButton,
  SecondaryButton,
  SubtleButton,
} from "./StableButton";
import SocialTagShareButton from "./SocialTagShareButton";
import {
  buildQrImageUrl,
  buildPublicShareText,
  buildWhatsAppUrl,
  copyToClipboard,
  normalizeUrl,
  type ShareTarget,
} from "../lib/share";

type Props = {
  target: ShareTarget;
  variant?: "row" | "stack";
  small?: boolean;
};

export default function ShareButtons({
  target,
  variant = "row",
  small = false,
}: Props) {
  const [toast, setToast] = useState<string>("");
  const [qrOpen, setQrOpen] = useState(false);

  const url = useMemo(() => normalizeUrl(target.url), [target.url]);
  const publicShareText = useMemo(
    () => buildPublicShareText({ ...target, url }),
    [target, url]
  );
  const qrImg = useMemo(() => buildQrImageUrl(url, 240), [url]);

  function actionRowStyle(): React.CSSProperties {
    return {
      flexDirection: variant === "stack" ? "column" : "row",
      alignItems: variant === "stack" ? "stretch" : "center",
    };
  }

  function actionButtonStyle(): React.CSSProperties {
    return {
      padding: small ? "8px 10px" : undefined,
      minHeight: small ? 40 : undefined,
    };
  }

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1600);
  }

  async function onCopyLink() {
    const ok = await copyToClipboard(url);
    showToast(ok ? "Copied link" : "Copy failed");
  }

  async function onCopyText() {
    const ok = await copyToClipboard(publicShareText);
    showToast(ok ? "Copied WhatsApp text" : "Copy failed");
  }

  function onWhatsApp() {
    window.open(buildWhatsAppUrl(publicShareText), "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ marginTop: 10 }}>
      <CardActionRow style={actionRowStyle()} align={variant === "stack" ? "stretch" : "start"}>
        <PrimaryButton
          onClick={onCopyLink}
          type="button"
          style={actionButtonStyle()}
          debugId="share-buttons.copy-link"
        >
          Copy link
        </PrimaryButton>

        <SecondaryButton
          onClick={onWhatsApp}
          type="button"
          title="Opens WhatsApp with a prefilled message"
          style={actionButtonStyle()}
          debugId="share-buttons.whatsapp"
        >
          WhatsApp text
        </SecondaryButton>

        <SecondaryButton
          onClick={onCopyText}
          type="button"
          title="Copies the WhatsApp text to clipboard"
          style={actionButtonStyle()}
          debugId="share-buttons.copy-text"
        >
          Copy text
        </SecondaryButton>

        <SocialTagShareButton
          target={{ ...target, url }}
          buttonLabel="Share"
          debugId="share-buttons.tag-social"
          stableHeight={small ? 40 : undefined}
          style={actionButtonStyle()}
        />

        <SubtleButton
          onClick={() => setQrOpen(true)}
          type="button"
          title="Shows a QR code you can screenshot"
          style={actionButtonStyle()}
          debugId="share-buttons.qr"
        >
          QR
        </SubtleButton>
      </CardActionRow>

      {toast ? (
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            color: "#0a7",
            fontWeight: 900,
          }}
        >
          {toast}
        </div>
      ) : null}

      {qrOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
          onClick={() => setQrOpen(false)}
        >
          <div
            style={{
              width: 360,
              maxWidth: "95vw",
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #e5e7eb",
              padding: 14,
              boxShadow: "0 16px 40px rgba(0,0,0,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 1000 }}>QR (screenshot and share)</div>
              <SecondaryButton
                onClick={() => setQrOpen(false)}
                type="button"
                style={actionButtonStyle()}
                debugId="share-buttons.close-qr"
              >
                Close
              </SecondaryButton>
            </div>

            <div style={{ marginTop: 12, fontSize: 13, color: "#334155" }}>
              Tip for low-end devices: open this QR, screenshot it, and send via
              WhatsApp.
            </div>

            <div
              style={{ marginTop: 12, display: "flex", justifyContent: "center" }}
            >
              <img
                src={qrImg}
                alt="QR code"
                style={{
                  width: 240,
                  height: 240,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                }}
              />
            </div>

            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "#64748b",
                wordBreak: "break-all",
              }}
            >
              {url}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
