// src/components/ShareButtons.tsx
import React, { useMemo, useState } from "react";
import { ShareTarget, buildQrImageUrl, buildShareText, buildWhatsAppUrl, copyToClipboard, normalizeUrl } from "../lib/share";

type Props = {
  target: ShareTarget;
  variant?: "row" | "stack";
  small?: boolean;
};

export default function ShareButtons({ target, variant = "row", small = false }: Props) {
  const [toast, setToast] = useState<string>("");
  const [qrOpen, setQrOpen] = useState(false);

  const url = useMemo(() => normalizeUrl(target.url), [target.url]);
  const shareText = useMemo(() => buildShareText({ ...target, url }), [target.title, target.message, url]);
  const qrImg = useMemo(() => buildQrImageUrl(url, 240), [url]);

  function btnStyle(primary = false): React.CSSProperties {
    const pad = small ? "8px 10px" : "10px 12px";
    return {
      padding: pad,
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      background: primary ? "#111" : "rgba(255,255,255,0.95)",
      color: primary ? "#fff" : "#111",
      fontWeight: 900,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      whiteSpace: "nowrap",
    };
  }

  function wrapStyle(): React.CSSProperties {
    return {
      display: "flex",
      flexDirection: variant === "stack" ? "column" : "row",
      gap: 10,
      flexWrap: "wrap",
      alignItems: variant === "stack" ? "stretch" : "center",
    };
  }

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1600);
  }

  async function onCopyLink() {
    const ok = await copyToClipboard(url);
    showToast(ok ? "Copied link ✅" : "Copy failed ❌");
  }

  async function onCopyText() {
    const ok = await copyToClipboard(shareText);
    showToast(ok ? "Copied WhatsApp text ✅" : "Copy failed ❌");
  }

  function onWhatsApp() {
    window.open(buildWhatsAppUrl(shareText), "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div style={wrapStyle()}>
        <button style={btnStyle(true)} onClick={onCopyLink} type="button">
          🔗 Copy link
        </button>

        <button style={btnStyle(false)} onClick={onWhatsApp} type="button" title="Opens WhatsApp with a prefilled message">
          💬 WhatsApp text
        </button>

        <button style={btnStyle(false)} onClick={onCopyText} type="button" title="Copies the WhatsApp text to clipboard">
          📋 Copy text
        </button>

        <button style={btnStyle(false)} onClick={() => setQrOpen(true)} type="button" title="Shows a QR code you can screenshot">
          � QR
        </button>
      </div>

      {toast ? (
        <div style={{ marginTop: 10, fontSize: 13, color: "#0a7", fontWeight: 900 }}>{toast}</div>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 1000 }}>QR (screenshot & share)</div>
              <button style={btnStyle(false)} onClick={() => setQrOpen(false)} type="button">
                ✖ Close
              </button>
            </div>

            <div style={{ marginTop: 12, fontSize: 13, color: "#334155" }}>
              Tip for low-end devices: open this QR, screenshot it, and send via WhatsApp.
            </div>

            <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
              <img
                src={qrImg}
                alt="QR code"
                style={{ width: 240, height: 240, borderRadius: 12, border: "1px solid #e5e7eb" }}
              />
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: "#64748b", wordBreak: "break-all" }}>{url}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}