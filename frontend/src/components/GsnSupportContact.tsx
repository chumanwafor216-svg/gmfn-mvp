import React, { useMemo } from "react";
import { GsnLegacyIcon } from "./GsnLegacyIcon";
import { StableCtaLink } from "./StableButton";

type GsnSupportContactProps = {
  context: string;
  subject?: string;
  body?: string;
  style?: React.CSSProperties;
};

function configuredSupportEmail(): string {
  const env =
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env ||
    {};
  return String(env.VITE_GSN_SUPPORT_EMAIL || env.VITE_SUPPORT_EMAIL || "").trim();
}

function isValidSupportEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function supportCardStyle(): React.CSSProperties {
  return {
    border: "1px solid rgba(214,170,69,0.28)",
    borderRadius: 24,
    background: "#FFFBEF",
    boxShadow: "0 18px 48px rgba(7,23,44,0.08)",
    padding: 16,
    display: "grid",
    gridTemplateColumns: "52px minmax(0, 1fr)",
    gap: 12,
    alignItems: "center",
    overflow: "hidden",
    overflowAnchor: "none",
    transform: "none",
    transition: "none",
  };
}

function labelStyle(): React.CSSProperties {
  return {
    color: "#5A4612",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function copyStyle(): React.CSSProperties {
  return {
    color: "#334155",
    fontSize: 14,
    lineHeight: 1.45,
    marginTop: 4,
  };
}

export function getGsnSupportEmail(): string {
  const email = configuredSupportEmail();
  return isValidSupportEmail(email) ? email : "";
}

export default function GsnSupportContact({
  context,
  subject,
  body,
  style,
}: GsnSupportContactProps) {
  const email = getGsnSupportEmail();

  const href = useMemo(() => {
    if (!email) return "";
    const messageSubject = subject || `GSN ${context} help`;
    const messageBody =
      body ||
      `Please include your GSN ID, community, reference, and a short note about ${context}.`;
    return `mailto:${email}?subject=${encodeURIComponent(messageSubject)}&body=${encodeURIComponent(
      messageBody
    )}`;
  }, [body, context, email, subject]);

  if (!email) return null;

  return (
    <section style={{ ...supportCardStyle(), ...style }}>
      <span
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          background: "#FFFFFF",
          display: "grid",
          placeItems: "center",
          boxShadow: "inset 0 0 0 1px rgba(214,170,69,0.18)",
        }}
      >
        <GsnLegacyIcon name="phone" size={34} />
      </span>

      <div style={{ minWidth: 0 }}>
        <div style={labelStyle()}>Need help?</div>
        <div style={copyStyle()}>
          Email GSN support. Include your GSN ID, community, reference, and a
          short note.
        </div>
        <StableCtaLink
          to={href}
          debugId={`gsn-support-contact.${context.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
          stableHeight={48}
          minWidth={148}
          style={{
            marginTop: 10,
            background: "#061827",
            color: "#FFFFFF",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 10px 24px rgba(6,24,39,0.18)",
          }}
        >
          Email support
        </StableCtaLink>
      </div>
    </section>
  );
}
