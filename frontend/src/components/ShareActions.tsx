// src/components/ShareActions.tsx
import React, { useMemo } from "react";
import { CardActionRow, PrimaryButton, SecondaryButton } from "./StableButton";
import { safeCopy } from "../lib/api";
import { buildPublicShareText, buildWhatsAppUrl } from "../lib/share";
import SocialTagShareButton from "./SocialTagShareButton";

/**
 * ShareActions - unified share block (Copy / WhatsApp)
 *
 * MVP policy:
 * - QR is REMOVED to avoid dependency + build instability.
 * - We keep `qrLabel`, `mode`, `qrSize` props for backward-compatibility
 *   (pages may still pass them, but we ignore them).
 */

export type ShareMode = "offline" | "online";

export type ShareActionsProps = {
  title: string;
  text: string;
  url: string;

  copyLabel?: string;
  whatsappLabel?: string;

  // Backward-compatible (ignored in MVP)
  qrLabel?: string;
  mode?: ShareMode;
  qrSize?: number;
};

function smallNoteStyle(): React.CSSProperties {
  return { marginTop: 6, color: "#64748b", fontSize: 12 };
}

export default function ShareActions(props: ShareActionsProps) {
  const {
    title,
    text,
    url,
    copyLabel = "Copy link",
    whatsappLabel = "WhatsApp text",
  } = props;

  const cleanUrl = useMemo(() => (url || "").trim(), [url]);
  const cleanText = useMemo(() => (text || "").trim(), [text]);
  const publicShareText = useMemo(
    () => buildPublicShareText({ title, message: cleanText, url: cleanUrl }),
    [cleanText, cleanUrl, title]
  );

  const canShare = !!cleanUrl;

  function doCopy() {
    if (!canShare) return;
    safeCopy(cleanUrl);
  }

  function doWhatsApp() {
    if (!canShare) return;
    const wa = buildWhatsAppUrl(publicShareText);
    window.open(wa, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ marginTop: 10 }}>
      <CardActionRow>
        <PrimaryButton
          type="button"
          onClick={doCopy}
          disabled={!canShare}
          debugId="share-actions.copy-link"
        >
          {copyLabel}
        </PrimaryButton>

        <SecondaryButton
          type="button"
          onClick={doWhatsApp}
          disabled={!canShare}
          debugId="share-actions.whatsapp"
        >
          {whatsappLabel}
        </SecondaryButton>

        <SocialTagShareButton
          target={{ title, message: cleanText, url: cleanUrl }}
          disabled={!canShare}
          buttonLabel="Share"
          debugId="share-actions.tag-social"
        />
      </CardActionRow>

      <div style={smallNoteStyle()}>
        <b>Tip (low-end phones):</b> WhatsApp the link, open it, and screenshot
        the "VALID / NOT VALID" page.
      </div>

      {!canShare ? (
        <div style={{ marginTop: 8, color: "#64748b", fontSize: 12 }}>
          Generate the link first.
        </div>
      ) : null}
    </div>
  );
}
