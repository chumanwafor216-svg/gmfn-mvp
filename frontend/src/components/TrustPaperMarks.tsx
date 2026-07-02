import React from "react";
import GSNBrandMark from "./GSNBrandMark";

export type TrustPaperIconName =
  | "alert"
  | "bank"
  | "briefcase"
  | "calendar"
  | "card"
  | "chart"
  | "chevronDown"
  | "chevronUp"
  | "check"
  | "community"
  | "copy"
  | "document"
  | "eye"
  | "globe"
  | "hash"
  | "home"
  | "id"
  | "image"
  | "lock"
  | "megaphone"
  | "navigation"
  | "pen"
  | "phone"
  | "qr"
  | "refresh"
  | "search"
  | "shield"
  | "shop"
  | "spark"
  | "tag"
  | "user"
  | "vault"
  | "video"
  | "wallet";

type IconProps = {
  name: TrustPaperIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
};

export function TrustPaperIcon({
  name,
  size = 22,
  color = "currentColor",
  strokeWidth = 2.2,
  style,
}: IconProps) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth,
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={{ display: "block", color, flex: "0 0 auto", ...style }}
    >
      {name === "alert" ? (
        <>
          <path {...common} d="M12 3 2.9 20h18.2L12 3Z" />
          <path {...common} d="M12 8.5v5" />
          <path {...common} d="M12 17.4h.01" />
        </>
      ) : name === "bank" ? (
        <>
          <path {...common} d="M4 9.5 12 4l8 5.5" />
          <path {...common} d="M6 10h12" />
          <path {...common} d="M7 10v7M11 10v7M15 10v7M19 19H5" />
          <path {...common} d="M4 21h16" />
        </>
      ) : name === "briefcase" ? (
        <>
          <path {...common} d="M9 7V5.8C9 4.8 9.8 4 10.8 4h2.4c1 0 1.8.8 1.8 1.8V7" />
          <rect {...common} x="4" y="7" width="16" height="13" rx="2.2" />
          <path {...common} d="M4 12h16" />
          <path {...common} d="M10 12v1.5h4V12" />
        </>
      ) : name === "calendar" ? (
        <>
          <rect {...common} x="4" y="5" width="16" height="15" rx="2.2" />
          <path {...common} d="M8 3v4M16 3v4M4 10h16" />
          <path {...common} d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
        </>
      ) : name === "card" ? (
        <>
          <rect {...common} x="3.5" y="6" width="17" height="12" rx="2.2" />
          <path {...common} d="M3.5 10h17" />
          <path {...common} d="M7 14.5h4.5" />
          <path {...common} d="M15.5 14.5h1.5" />
        </>
      ) : name === "chart" ? (
        <>
          <path {...common} d="M4 19V5" />
          <path {...common} d="M4 19h16" />
          <path {...common} d="M7 15l3-4 3 2 4-7" />
          <path {...common} d="M17 6h3v3" />
        </>
      ) : name === "chevronDown" ? (
        <>
          <path {...common} d="m6 9 6 6 6-6" />
        </>
      ) : name === "chevronUp" ? (
        <>
          <path {...common} d="m6 15 6-6 6 6" />
        </>
      ) : name === "check" ? (
        <>
          <circle {...common} cx="12" cy="12" r="8.5" />
          <path {...common} d="m8.4 12.2 2.4 2.4 4.9-5.2" />
        </>
      ) : name === "community" ? (
        <>
          <path {...common} d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path {...common} d="M15.8 11a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z" />
          <path {...common} d="M3.5 20c.4-3.2 2.3-5 5-5s4.6 1.8 5 5" />
          <path {...common} d="M13.2 15.4c2.8-.7 5.3 1 5.8 4.6" />
        </>
      ) : name === "copy" ? (
        <>
          <rect {...common} x="8" y="8" width="11" height="12" rx="2" />
          <path {...common} d="M5 16H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
        </>
      ) : name === "document" ? (
        <>
          <path {...common} d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path {...common} d="M14 3v5h5" />
          <path {...common} d="M8.5 13h7M8.5 16h7M8.5 10h3" />
        </>
      ) : name === "eye" ? (
        <>
          <path {...common} d="M3.5 12s3.2-5.5 8.5-5.5S20.5 12 20.5 12s-3.2 5.5-8.5 5.5S3.5 12 3.5 12Z" />
          <circle {...common} cx="12" cy="12" r="2.4" />
        </>
      ) : name === "globe" ? (
        <>
          <circle {...common} cx="12" cy="12" r="9" />
          <path {...common} d="M3 12h18M12 3c2.4 2.6 3.4 5.6 3.4 9s-1 6.4-3.4 9M12 3c-2.4 2.6-3.4 5.6-3.4 9s1 6.4 3.4 9" />
        </>
      ) : name === "hash" ? (
        <>
          <path {...common} d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16" />
        </>
      ) : name === "home" ? (
        <>
          <path {...common} d="m3 11 9-8 9 8" />
          <path {...common} d="M5.5 10.5V20h13v-9.5" />
          <path {...common} d="M10 20v-6h4v6" />
        </>
      ) : name === "id" ? (
        <>
          <rect {...common} x="3" y="5" width="18" height="14" rx="2.2" />
          <circle {...common} cx="8.5" cy="11" r="2" />
          <path {...common} d="M5.6 16c.6-1.6 1.6-2.4 2.9-2.4s2.3.8 2.9 2.4M14 10h4M14 14h4" />
        </>
      ) : name === "image" ? (
        <>
          <rect {...common} x="4" y="5" width="16" height="14" rx="2.2" />
          <circle {...common} cx="9" cy="10" r="1.7" />
          <path {...common} d="m5.5 17 4.2-4.2 3.1 3.1 2.1-2.1L20 18" />
        </>
      ) : name === "lock" ? (
        <>
          <rect {...common} x="5" y="10" width="14" height="10" rx="2" />
          <path {...common} d="M8 10V7a4 4 0 0 1 8 0v3" />
          <path {...common} d="M12 14v2" />
        </>
      ) : name === "megaphone" ? (
        <>
          <path {...common} d="M4 13h3l8 4V7l-8 4H4v2Z" />
          <path {...common} d="M7 13l1 5" />
          <path {...common} d="M18 9.5c.8.7 1.2 1.5 1.2 2.5s-.4 1.8-1.2 2.5" />
          <path {...common} d="M19.5 7.2c1.4 1.2 2 2.8 2 4.8s-.6 3.6-2 4.8" />
        </>
      ) : name === "navigation" ? (
        <>
          <path {...common} d="M12 3.5 19.5 20 12 16.5 4.5 20 12 3.5Z" />
          <path {...common} d="M12 3.5v13" />
        </>
      ) : name === "pen" ? (
        <>
          <path {...common} d="M4.5 19.5 8 18.8 18.4 8.4a2.2 2.2 0 0 0-3.1-3.1L4.9 15.7 4.5 19.5Z" />
          <path {...common} d="m14 6.6 3.4 3.4" />
        </>
      ) : name === "phone" ? (
        <>
          <path {...common} d="M7 3h10a1.8 1.8 0 0 1 1.8 1.8v14.4A1.8 1.8 0 0 1 17 21H7a1.8 1.8 0 0 1-1.8-1.8V4.8A1.8 1.8 0 0 1 7 3Z" />
          <path {...common} d="M10 18h4" />
        </>
      ) : name === "qr" ? (
        <>
          <path {...common} d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
          <path {...common} d="M14 14h2M18 14h2M14 18h6M18 16v4" />
        </>
      ) : name === "refresh" ? (
        <>
          <path {...common} d="M20 7v5h-5" />
          <path {...common} d="M4 17v-5h5" />
          <path {...common} d="M18.5 12a6.5 6.5 0 0 0-11.2-4.5L4 11" />
          <path {...common} d="M5.5 12a6.5 6.5 0 0 0 11.2 4.5L20 13" />
        </>
      ) : name === "search" ? (
        <>
          <circle {...common} cx="10.5" cy="10.5" r="6.5" />
          <path {...common} d="m15.5 15.5 4.5 4.5" />
        </>
      ) : name === "shield" ? (
        <>
          <path {...common} d="M12 3 5 6v5.8c0 4.4 2.9 7.4 7 9.2 4.1-1.8 7-4.8 7-9.2V6l-7-3Z" />
          <path {...common} d="m8.8 12.2 2.2 2.2 4.4-4.8" />
        </>
      ) : name === "shop" ? (
        <>
          <path {...common} d="M5 10h14l-1-5H6l-1 5Z" />
          <path {...common} d="M6 10v10h12V10" />
          <path {...common} d="M9 20v-5h6v5" />
        </>
      ) : name === "spark" ? (
        <>
          <path {...common} d="M12 3l1.5 5 5 1.5-5 1.5-1.5 5-1.5-5-5-1.5 5-1.5L12 3Z" />
          <path {...common} d="M18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8L18 16Z" />
        </>
      ) : name === "tag" ? (
        <>
          <path {...common} d="M4 5.5V11l8.2 8.2a2 2 0 0 0 2.8 0l4.2-4.2a2 2 0 0 0 0-2.8L11 4H5.5A1.5 1.5 0 0 0 4 5.5Z" />
          <path {...common} d="M8.2 8.2h.01" />
        </>
      ) : name === "user" ? (
        <>
          <circle {...common} cx="12" cy="8" r="4" />
          <path {...common} d="M4.5 21c.9-4.2 3.4-6.3 7.5-6.3s6.6 2.1 7.5 6.3" />
        </>
      ) : name === "vault" ? (
        <>
          <rect {...common} x="4" y="6" width="16" height="13" rx="2.4" />
          <circle {...common} cx="12" cy="12.5" r="2.8" />
          <path {...common} d="M12 9.7v5.6M9.2 12.5h5.6" />
          <path {...common} d="M7 6V4h10v2" />
        </>
      ) : name === "video" ? (
        <>
          <rect {...common} x="4" y="6" width="12" height="12" rx="2.2" />
          <path {...common} d="m16 10 4-2.5v9L16 14" />
          <path {...common} d="M8 10h4M8 14h2" />
        </>
      ) : (
        <>
          <rect {...common} x="5" y="6" width="14" height="12" rx="2" />
          <path {...common} d="M8 10h8M8 14h5" />
        </>
      )}
    </svg>
  );
}

type MarkProps = {
  name?: TrustPaperIconName;
  color?: string;
  size?: number;
  opacity?: number;
  style?: React.CSSProperties;
};

export function TrustPaperWatermark({
  name = "shield",
  color = "#0B63D1",
  size = 178,
  opacity = 0.07,
  style,
}: MarkProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        right: -22,
        bottom: -26,
        opacity,
        pointerEvents: "none",
        color,
        ...style,
      }}
    >
      <TrustPaperIcon name={name} size={size} strokeWidth={1.45} />
    </div>
  );
}

export function TrustPaperSeal({ compact = false }: { compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        right: compact ? 8 : 10,
        bottom: compact ? 8 : 10,
        width: compact ? 34 : 42,
        height: compact ? 34 : 42,
        borderRadius: 14,
        display: "grid",
        placeItems: "center",
        color: "#FFFFFF",
        background: "linear-gradient(135deg, #0B63D1 0%, #073E83 100%)",
        border: "3px solid #FFFFFF",
        boxShadow: "0 10px 22px rgba(11,99,209,0.28)",
      }}
    >
      <TrustPaperIcon name="shield" size={compact ? 23 : 27} strokeWidth={2.35} />
    </span>
  );
}

type BadgeIconProps = {
  name: TrustPaperIconName;
  ok?: boolean;
};

export function TrustPaperBadgeIcon({ name, ok = true }: BadgeIconProps) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 25,
        height: 25,
        borderRadius: 999,
        display: "inline-grid",
        placeItems: "center",
        color: ok ? "#166534" : "#92400E",
        background: ok ? "#EAF7EE" : "#FFF7E6",
        border: `1px solid ${ok ? "rgba(46,155,98,0.2)" : "rgba(245,158,11,0.2)"}`,
        flex: "0 0 auto",
      }}
    >
      <TrustPaperIcon name={ok ? "check" : name} size={16} strokeWidth={2.5} />
    </span>
  );
}

type FooterProps = {
  text: string;
};

type AuthorityStripProps = {
  title?: string;
  reference?: string;
  generatedAt?: string;
  classification?: string;
  compact?: boolean;
  tone?: "light" | "dark";
  style?: React.CSSProperties;
};

function authorityText(value: unknown, fallback: string): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function isGeneratedPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "current when viewed" || normalized === "current when copied";
}

function utcGeneratedText(date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function TrustPaperAuthorityStrip({
  title = "Official GSN paper",
  reference = "GSN current record",
  generatedAt = "",
  classification = "Traceable public evidence",
  compact = false,
  tone = "light",
  style,
}: AuthorityStripProps) {
  const generatedAtText = React.useMemo(() => {
    const text = String(generatedAt ?? "").trim();
    return !text || isGeneratedPlaceholder(text) ? utcGeneratedText() : text;
  }, [generatedAt]);
  const dark = tone === "dark";
  const textColor = dark ? "#FFFFFF" : "#07172C";
  const mutedColor = dark ? "rgba(255,255,255,0.74)" : "#526579";
  const shellBackground = dark
    ? "rgba(6,24,39,0.48)"
    : "linear-gradient(135deg, rgba(255,255,255,0.94), rgba(248,251,255,0.88))";

  return (
    <section
      aria-label="GSN document authority marks"
      style={{
        position: "relative",
        zIndex: 2,
        display: "grid",
        gridTemplateColumns: compact ? "auto minmax(0, 1fr)" : "auto minmax(0, 1fr) auto",
        gap: compact ? 10 : 12,
        alignItems: "center",
        borderRadius: compact ? 16 : 18,
        border: dark ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(212,175,55,0.28)",
        background: shellBackground,
        boxShadow: dark
          ? "inset 0 1px 0 rgba(255,255,255,0.10)"
          : "0 14px 30px rgba(6,24,39,0.08), inset 0 1px 0 rgba(255,255,255,0.72)",
        padding: compact ? "10px 11px" : "12px 14px",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: compact ? 42 : 50,
          height: compact ? 42 : 50,
          borderRadius: compact ? 14 : 16,
          display: "grid",
          placeItems: "center",
          background: dark ? "rgba(255,255,255,0.92)" : "#FFFFFF",
          border: "1px solid rgba(214,170,69,0.24)",
          boxShadow: "0 10px 22px rgba(6,24,39,0.12)",
          flex: "0 0 auto",
        }}
      >
        <GSNBrandMark width={compact ? 24 : 29} height={compact ? 30 : 36} />
      </div>

      <div style={{ minWidth: 0, display: "grid", gap: 3 }}>
        <div
          style={{
            color: dark ? "#F6D77A" : "#0B63D1",
            fontSize: compact ? 10.5 : 11,
            fontWeight: 1000,
            letterSpacing: 0,
            textTransform: "uppercase",
          }}
        >
          Global Support Network
        </div>
        <strong
          style={{
            color: textColor,
            fontSize: compact ? 14 : 15,
            fontWeight: 1000,
            lineHeight: 1.16,
            overflowWrap: "anywhere",
          }}
        >
          {authorityText(title, "Official GSN paper")}
        </strong>
        <div
          style={{
            color: mutedColor,
            fontSize: compact ? 11.5 : 12,
            fontWeight: 850,
            lineHeight: 1.32,
            overflowWrap: "anywhere",
          }}
        >
          Prepared: {generatedAtText} | Record:{" "}
          {authorityText(reference, "GSN current record")}
        </div>
      </div>

      <div
        style={{
          gridColumn: compact ? "1 / -1" : undefined,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: compact ? "flex-start" : "flex-end",
          gap: 7,
          minWidth: 0,
        }}
      >
        {[classification, "Watermark", "Traceable"].map((item) => (
          <span
            key={item}
            style={{
              minHeight: compact ? 26 : 28,
              borderRadius: 999,
              padding: compact ? "5px 8px" : "6px 9px",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: dark ? "#F6D77A" : "#7A5A10",
              background: dark ? "rgba(246,215,122,0.10)" : "rgba(255,247,220,0.82)",
              border: dark ? "1px solid rgba(246,215,122,0.18)" : "1px solid rgba(214,170,69,0.22)",
              fontSize: compact ? 10.5 : 11,
              fontWeight: 1000,
              lineHeight: 1.1,
              whiteSpace: "nowrap",
            }}
          >
            <TrustPaperIcon name={item === "Watermark" ? "shield" : "lock"} size={14} />
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

export function TrustPaperSecurityNote({
  reference,
  compact = false,
}: {
  reference?: string;
  compact?: boolean;
}) {
  return (
    <div
      aria-label="GSN screenshot security note"
      style={{
        borderRadius: compact ? 14 : 16,
        border: "1px dashed rgba(11,99,209,0.28)",
        background: "rgba(232,241,255,0.70)",
        padding: compact ? "9px 10px" : "10px 12px",
        color: "#24415C",
        fontSize: compact ? 11.5 : 12,
        fontWeight: 900,
        lineHeight: 1.42,
      }}
    >
      Screenshot security: this paper should travel with the GSN mark, watermark,
      generated time, and reference{reference ? ` ${reference}` : ""}. Reopen the
      QR or link for the current record before relying on the screenshot.
    </div>
  );
}

export function TrustPaperSecurityFooter({ text }: FooterProps) {
  return (
    <div
      style={{
        marginTop: 14,
        marginLeft: -22,
        marginRight: -22,
        marginBottom: -22,
        padding: "14px 20px",
        background: "linear-gradient(90deg, #061827 0%, #0B2D4A 100%)",
        color: "#F6D77A",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        fontWeight: 1000,
        flexWrap: "wrap",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        <TrustPaperIcon name="shield" size={24} color="#F6D77A" />
        <span>{text}</span>
      </span>
      <span style={{ display: "inline-flex", gap: 8, color: "#F6D77A" }} aria-hidden="true">
        <TrustPaperIcon name="spark" size={19} />
        <TrustPaperIcon name="lock" size={19} />
      </span>
    </div>
  );
}
