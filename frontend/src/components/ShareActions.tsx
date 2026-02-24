// src/components/ShareActions.tsx
import React, { useMemo } from "react";

/**
 * ShareActions — unified share block (Copy / WhatsApp)
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

function btnStyle(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "rgba(255,255,255,0.95)",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function btnPrimaryStyle(): React.CSSProperties {
  return {
    ...btnStyle(),
    background: "rgba(59,130,246,0.12)",
    border: "1px solid rgba(59,130,246,0.35)",
  };
}

function smallNoteStyle(): React.CSSProperties {
  return { marginTop: 6, color: "#64748b", fontSize: 12 };
}

function safeCopy(text: string) {
  const t = (text || "").trim();
  if (!t) return;

  // Prefer modern clipboard API
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(t).catch(() => {
      // fallback below
      tryLegacyCopy(t);
    });
    return;
  }

  tryLegacyCopy(t);
}

// Deprecated but still works on some older devices/browsers
function tryLegacyCopy(text: string) {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
    } catch {
      // ignore
    }
    textarea.remove();
  } catch {
    // ignore
  }
}

function buildWhatsAppUrl(message: string) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/?text=${encoded}`;
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

  const canShare = !!cleanUrl;

  function doCopy() {
    if (!canShare) return;
    safeCopy(cleanUrl);
  }

  function doWhatsApp() {
    if (!canShare) return;
    const msg = `${title}\n\n${cleanText}\n\n${cleanUrl}`;
    const wa = buildWhatsAppUrl(msg);
    window.open(wa, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button style={btnPrimaryStyle()} onClick={doCopy} disabled={!canShare}>
          {copyLabel}
        </button>

        <button style={btnStyle()} onClick={doWhatsApp} disabled={!canShare}>
          {whatsappLabel}
        </button>
      </div>

      <div style={smallNoteStyle()}>
        <b>Tip (low-end phones):</b> WhatsApp the link, open it, and screenshot the “VALID / NOT VALID” page.
      </div>

      {!canShare && <div style={{ marginTop: 8, color: "#64748b", fontSize: 12 }}>Generate the link first.</div>}
    </div>
  );
}