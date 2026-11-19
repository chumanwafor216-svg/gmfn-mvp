import type { CSSProperties, ReactNode } from "react";
import OriginLink from "./OriginLink";
import { EntryBackLink } from "./EntryControls";
import {
  brandActionButton,
  brandHelperText,
  brandPageCard,
  gmfnBrand,
} from "../styles/gmfnBrand";

export const entryFieldStyle: CSSProperties = {
  width: "100%",
  minHeight: 48,
  boxSizing: "border-box",
  borderRadius: 14,
  border: `1px solid ${gmfnBrand.colors.lineStrong}`,
  background: "#FFFFFF",
  color: gmfnBrand.colors.ink,
  padding: "12px 14px",
  fontSize: 16,
  outline: "none",
};

export const entryLabelStyle: CSSProperties = {
  display: "grid",
  gap: 7,
  color: gmfnBrand.colors.inkSoft,
  fontSize: 13,
  fontWeight: 850,
};

export const entryPrimaryButtonStyle: CSSProperties = {
  ...brandActionButton("primary"),
  width: "100%",
  minHeight: 50,
};

export const entrySecondaryButtonStyle: CSSProperties = {
  ...brandActionButton("secondary"),
  width: "100%",
  minHeight: 48,
};

export function CommunityEntryShell({
  eyebrow,
  title,
  summary,
  backTo,
  backLabel = "Back to welcome",
  exitLabel = "Back to GSN entry",
  exitTo = "/cover",
  compactHeader = false,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  backTo?: string;
  backLabel?: string;
  exitLabel?: string | null;
  exitTo?: string;
  compactHeader?: boolean;
  children: ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        boxSizing: "border-box",
        padding: "18px 14px 42px",
        background: gmfnBrand.gradients.pageWash,
        color: gmfnBrand.colors.ink,
      }}
    >
      <div style={{ width: "min(100%, 620px)", margin: "0 auto" }}>
        {backTo ? (
          <div style={{ display: "flex", marginBottom: 12 }}>
            <EntryBackLink to={backTo} label={backLabel} />
          </div>
        ) : null}
        <header
          style={{
            borderRadius: 26,
            padding: compactHeader ? "17px 18px" : "22px 20px",
            background: gmfnBrand.gradients.hero,
            color: gmfnBrand.colors.darkText,
            boxShadow: gmfnBrand.shadows.hero,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              color: "#F2C766",
              fontWeight: 900,
              fontSize: 12,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              marginBottom: compactHeader ? 7 : 10,
            }}
          >
            {eyebrow}
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: compactHeader
                ? "clamp(26px, 7vw, 34px)"
                : "clamp(27px, 8vw, 38px)",
              lineHeight: 1.08,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: compactHeader ? "8px 0 0" : "12px 0 0",
              color: gmfnBrand.colors.darkMuted,
              lineHeight: compactHeader ? 1.45 : 1.6,
            }}
          >
            {summary}
          </p>
        </header>
        <section style={{ ...brandPageCard(), padding: 18 }}>{children}</section>
        {exitLabel ? (
          <footer style={{ ...brandHelperText(), textAlign: "center", marginTop: 18 }}>
            <OriginLink to={exitTo} style={{ color: gmfnBrand.colors.accent, fontWeight: 800 }}>
              {exitLabel}
            </OriginLink>
          </footer>
        ) : null}
      </div>
    </main>
  );
}

export function EntryNotice({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success";
  children: ReactNode;
}) {
  const palette =
    tone === "error"
      ? { background: "#FFF0F0", border: "#E7A8A8", color: "#7F1D1D" }
      : tone === "success"
        ? { background: "#ECF9F1", border: "#A8D9B9", color: "#14532D" }
        : { background: "#EDF5FF", border: "#B7CDEA", color: "#173A5C" };
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      style={{
        borderRadius: 14,
        border: `1px solid ${palette.border}`,
        background: palette.background,
        color: palette.color,
        padding: "12px 14px",
        fontSize: 14,
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  );
}
