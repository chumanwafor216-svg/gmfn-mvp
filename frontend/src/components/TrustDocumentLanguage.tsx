import React from "react";
import GSNBrandMark from "./GSNBrandMark";
import { GsnRealisticIcon, type Gsn3DIconKey } from "./GsnRealisticIcon";
import { StableDisclosureSummary } from "./StableButton";

export type TrustDocumentTone = "good" | "warn" | "info" | "neutral";

export type TrustDocumentRibbonItem = {
  label: string;
  value: string;
  tone?: TrustDocumentTone;
  detail?: string;
};

export type TrustDocumentPanelItem = {
  title: string;
  detail: string;
  tone?: TrustDocumentTone;
  icon?: Gsn3DIconKey;
};

function disclosureSummaryStyle(): React.CSSProperties {
  return {
    minHeight: 36,
    borderRadius: 999,
    border: "1px solid rgba(8,35,58,0.12)",
    background: "rgba(255,255,255,0.78)",
    color: "#24415C",
    padding: "8px 10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 1000,
    lineHeight: 1.1,
    listStyle: "none",
  };
}

function actionIdPart(value: string): string {
  return (
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "details"
  );
}

function TrustDocumentMoreDetails({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <details
      data-gsn-trust-document-collapsible="true"
      style={{
        marginTop: 2,
        borderRadius: 18,
      }}
    >
      <StableDisclosureSummary
        debugId={`trust-document.more-details.${actionIdPart(label)}`}
        stableHeight={36}
        style={disclosureSummaryStyle()}
      >
        <span>{label}</span>
        <span
          aria-hidden="true"
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            display: "inline-grid",
            placeItems: "center",
            color: "#07172C",
            background: "#F6D77A",
            border: "1px solid rgba(214,170,69,0.36)",
            fontSize: 16,
            fontWeight: 1000,
            lineHeight: 1,
          }}
        >
          +
        </span>
      </StableDisclosureSummary>
      <div style={{ display: "grid", gap: 8, paddingTop: 9 }}>{children}</div>
    </details>
  );
}

export function TrustDocumentDisclosureSection({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      data-gsn-trust-document-section-disclosure="true"
      open={defaultOpen}
      style={{
        borderRadius: 18,
        border: "1px solid rgba(8,35,58,0.12)",
        background: "linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)",
        boxShadow: "0 10px 24px rgba(6,24,39,0.05)",
        overflow: "hidden",
      }}
    >
      <StableDisclosureSummary
        debugId={`trust-document.section.${actionIdPart(title)}`}
        stableHeight={48}
        style={{
          ...disclosureSummaryStyle(),
          border: 0,
          borderRadius: 0,
          minHeight: 48,
          padding: "12px 13px",
          background: "rgba(255,255,255,0.92)",
        }}
      >
        <span style={{ minWidth: 0, display: "grid", gap: 3 }}>
          <strong
            style={{
              color: "#07172C",
              fontSize: 14,
              fontWeight: 1000,
              lineHeight: 1.16,
            }}
          >
            {title}
          </strong>
          {summary ? (
            <span
              style={{
                color: "#526579",
                fontSize: 12,
                fontWeight: 780,
                lineHeight: 1.28,
              }}
            >
              {summary}
            </span>
          ) : null}
        </span>
        <span
          aria-hidden="true"
          style={{
            width: 24,
            height: 24,
            borderRadius: 999,
            display: "inline-grid",
            placeItems: "center",
            color: "#07172C",
            background: "#F6D77A",
            border: "1px solid rgba(214,170,69,0.36)",
            fontSize: 17,
            fontWeight: 1000,
            lineHeight: 1,
            flex: "0 0 auto",
          }}
        >
          +
        </span>
      </StableDisclosureSummary>
      <div style={{ display: "grid", gap: 8, padding: 12 }}>{children}</div>
    </details>
  );
}

function tonePalette(tone: TrustDocumentTone = "neutral") {
  switch (tone) {
    case "good":
      return {
        color: "#12633F",
        background: "linear-gradient(180deg, #F0FDF4 0%, #E1F6E8 100%)",
        border: "rgba(46,155,98,0.24)",
      };
    case "warn":
      return {
        color: "#8A4D08",
        background: "linear-gradient(180deg, #FFFDF4 0%, #F8EBC2 100%)",
        border: "rgba(214,170,69,0.34)",
      };
    case "info":
      return {
        color: "#0B4EA2",
        background: "linear-gradient(180deg, #F2F8FF 0%, #E3F0FE 100%)",
        border: "rgba(11,99,209,0.22)",
      };
    case "neutral":
    default:
      return {
        color: "#24415C",
        background: "linear-gradient(180deg, #F8FBFF 0%, #EDF3F9 100%)",
        border: "rgba(36,65,92,0.18)",
      };
  }
}

function confidenceDot(tone: TrustDocumentTone = "neutral"): React.CSSProperties {
  const palette = tonePalette(tone);
  return {
    width: 16,
    height: 16,
    borderRadius: 999,
    display: "inline-grid",
    placeItems: "center",
    color: "#FFFFFF",
    background: palette.color,
    boxShadow: `0 0 0 4px ${palette.border}`,
    fontSize: 11,
    fontWeight: 1000,
    lineHeight: 1,
    flex: "0 0 auto",
  };
}

export function TrustDocumentRegistryMasthead({
  eyebrow = "Public verification",
  title,
  subtitle = "Official GSN Registry Record",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header
      className="gsn-trust-document-masthead"
      data-gsn-trust-document-masthead="true"
      style={{
        minHeight: 86,
        borderRadius: "24px 24px 0 0",
        background:
          "radial-gradient(circle at 90% 18%, rgba(214,170,69,0.20) 0%, rgba(214,170,69,0) 24%), linear-gradient(90deg, #061827 0%, #08233A 60%, #0B2D4A 100%)",
        color: "#F7FAFF",
        padding: "16px 18px",
        display: "grid",
        gap: 16,
        alignItems: "center",
        border: "1px solid rgba(214,170,69,0.24)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="gsn-trust-document-masthead-brand"
        style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}
      >
        <GSNBrandMark width={44} height={54} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <strong
              style={{
                fontSize: 32,
                lineHeight: 1,
                letterSpacing: 0,
                fontWeight: 1000,
              }}
            >
              GSN
            </strong>
            <span
              style={{
                color: "#D6AA45",
                fontSize: 12,
                fontWeight: 1000,
                letterSpacing: 0,
                textTransform: "uppercase",
              }}
            >
              Global Support Network
            </span>
          </div>
          <div
            style={{
              marginTop: 4,
              color: "#C8D8EA",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 0,
              textTransform: "uppercase",
            }}
          >
            Trust - Transparency - Community
          </div>
        </div>
      </div>
      <div
        className="gsn-trust-document-masthead-record"
        style={{
          minWidth: 0,
          display: "grid",
          gridTemplateColumns: "38px minmax(0, 1fr)",
          gap: 10,
          alignItems: "center",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 38,
            height: 38,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            border: "1px solid rgba(214,170,69,0.40)",
            background: "rgba(255,255,255,0.06)",
          }}
        >
          <GsnRealisticIcon
            name="trust-shield"
            size={36}
            loading="eager"
            decorative
          />
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 1000,
              lineHeight: 1.12,
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              marginTop: 4,
              color: "#FFFFFF",
              fontSize: 16,
              fontWeight: 1000,
              lineHeight: 1.12,
              overflowWrap: "normal",
              wordBreak: "normal",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                marginTop: 3,
                color: "#C8D8EA",
                fontSize: 12,
                fontWeight: 850,
                lineHeight: 1.25,
                overflowWrap: "normal",
                wordBreak: "normal",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function TrustDocumentConfidenceRibbon({
  items,
}: {
  items: TrustDocumentRibbonItem[];
}) {
  return (
    <section
      data-gsn-confidence-ribbon="true"
      aria-label="Record confidence ribbon"
      style={{
        borderRadius: 20,
        border: "1px solid rgba(8,35,58,0.13)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.98) 100%)",
        padding: 10,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))",
        gap: 8,
        boxShadow: "0 14px 30px rgba(6,24,39,0.07)",
      }}
    >
      {items.map((item) => {
        const palette = tonePalette(item.tone);
        return (
          <div
            key={`${item.label}:${item.value}`}
            style={{
              minHeight: 58,
              borderRadius: 16,
              border: `1px solid ${palette.border}`,
              background: palette.background,
              padding: "9px 10px",
              display: "grid",
              gridTemplateColumns: "18px minmax(0, 1fr)",
              gap: 8,
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <span aria-hidden="true" style={confidenceDot(item.tone)}>
              {item.tone === "warn" ? "!" : "OK"}
            </span>
            <span style={{ minWidth: 0, display: "grid", gap: 2 }}>
              <span
                style={{
                  color: "#526579",
                  fontSize: 10,
                  fontWeight: 1000,
                  letterSpacing: 0,
                  textTransform: "uppercase",
                  lineHeight: 1.1,
                }}
              >
                {item.label}
              </span>
              <strong
                style={{
                  color: palette.color,
                  fontSize: 13,
                  fontWeight: 1000,
                  lineHeight: 1.15,
                  overflowWrap: "break-word",
                }}
              >
                {item.value}
              </strong>
              {item.detail ? (
                <span
                  style={{
                    color: "#526579",
                    fontSize: 11,
                    fontWeight: 780,
                    lineHeight: 1.22,
                  }}
                >
                  {item.detail}
                </span>
              ) : null}
            </span>
          </div>
        );
      })}
    </section>
  );
}

export function TrustDocumentSecurityPanel({
  title = "Digital security",
  items,
}: {
  title?: string;
  items: TrustDocumentPanelItem[];
}) {
  const visibleItems = items.slice(0, 2);
  const extraItems = items.slice(2);
  const renderItem = (item: TrustDocumentPanelItem) => (
      <div
        key={`${item.title}:${item.detail}`}
        style={{
          display: "grid",
          gridTemplateColumns: "22px minmax(0, 1fr)",
          gap: 9,
          alignItems: "start",
        }}
      >
        <span aria-hidden="true" style={confidenceDot(item.tone)}>
          {item.tone === "warn" ? "!" : "OK"}
        </span>
        <span style={{ minWidth: 0, display: "grid", gap: 2 }}>
          <strong
            style={{
              color: "#07172C",
              fontSize: 14,
              fontWeight: 1000,
              lineHeight: 1.16,
            }}
          >
            {item.title}
          </strong>
          <span
            style={{
              color: "#526579",
              fontSize: 12.5,
              fontWeight: 780,
              lineHeight: 1.32,
            }}
          >
            {item.detail}
          </span>
        </span>
      </div>
  );

  return (
    <section
      data-gsn-security-panel="true"
      aria-label={title}
      style={{
        borderRadius: 22,
        border: "1px solid rgba(8,35,58,0.14)",
        background: "#FFFFFF",
        padding: 15,
        display: "grid",
        gap: 12,
        boxShadow: "0 14px 34px rgba(6,24,39,0.07)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <GsnRealisticIcon
          name="certificate-seal"
          size={38}
          decorative
          style={{
            background: "#F7FAFF",
            border: "1px solid rgba(11,99,209,0.12)",
          }}
        />
        <h2
          style={{
            margin: 0,
            color: "#07172C",
            fontSize: 17,
            fontWeight: 1000,
            lineHeight: 1.15,
            textTransform: "uppercase",
          }}
        >
          {title}
        </h2>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {visibleItems.map(renderItem)}
        {extraItems.length ? (
          <TrustDocumentMoreDetails label="More security details">
            {extraItems.map(renderItem)}
          </TrustDocumentMoreDetails>
        ) : null}
      </div>
    </section>
  );
}

export function TrustDocumentBoundaryPanel({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "good" | "warn";
  items: string[];
}) {
  const palette = tonePalette(tone);
  const visibleItems = items.slice(0, 3);
  const extraItems = items.slice(3);
  const renderItem = (item: string) => (
    <div
      key={item}
      style={{
        display: "grid",
        gridTemplateColumns: "18px minmax(0, 1fr)",
        gap: 8,
        alignItems: "start",
      }}
    >
      <span aria-hidden="true" style={confidenceDot(tone)}>
        {tone === "warn" ? "x" : "OK"}
      </span>
      <span
        style={{
          color: "#1F3145",
          fontSize: 13,
          fontWeight: 900,
          lineHeight: 1.28,
        }}
      >
        {item}
      </span>
    </div>
  );

  return (
    <section
      data-gsn-confirmation-boundary={tone}
      aria-label={title}
      style={{
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        background: palette.background,
        padding: 14,
        display: "grid",
        gap: 10,
      }}
    >
      <h2
        style={{
          margin: 0,
          color: palette.color,
          fontSize: 15,
          fontWeight: 1000,
          lineHeight: 1.15,
          textTransform: "uppercase",
        }}
      >
        {title}
      </h2>
      <div style={{ display: "grid", gap: 8 }}>
        {visibleItems.map(renderItem)}
        {extraItems.length ? (
          <TrustDocumentMoreDetails
            label={tone === "warn" ? "More limits" : "More confirmed details"}
          >
            {extraItems.map(renderItem)}
          </TrustDocumentMoreDetails>
        ) : null}
      </div>
    </section>
  );
}

export function TrustDocumentFingerprint({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <section
      data-gsn-record-fingerprint="true"
      style={{
        borderRadius: 18,
        border: "1px solid rgba(8,35,58,0.12)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,250,255,0.98) 100%)",
        padding: 12,
        display: "grid",
        gridTemplateColumns: "42px minmax(0, 1fr)",
        gap: 10,
        alignItems: "start",
      }}
    >
      <GsnRealisticIcon
        name="qr-record"
        size={40}
        decorative
        style={{
          background: "#F7FAFF",
          border: "1px solid rgba(8,35,58,0.10)",
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: "#526579",
            fontSize: 10.5,
            fontWeight: 1000,
            letterSpacing: 0,
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <div
          style={{
            marginTop: 5,
            color: "#07172C",
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 12.5,
            fontWeight: 900,
            lineHeight: 1.35,
            overflowWrap: "anywhere",
          }}
        >
          {value}
        </div>
        {detail ? (
          <p
            style={{
              margin: "7px 0 0",
              color: "#526579",
              fontSize: 12.5,
              fontWeight: 780,
              lineHeight: 1.35,
            }}
          >
            {detail}
          </p>
        ) : null}
      </div>
    </section>
  );
}
