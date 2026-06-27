import React, { useMemo } from "react";
import GSNBrandMark from "./GSNBrandMark";
import {
  TrustPaperIcon,
  TrustPaperAuthorityStrip,
  TrustPaperSecurityNote,
  TrustPaperSecurityFooter,
  TrustPaperWatermark,
  type TrustPaperIconName,
} from "./TrustPaperMarks";

type ParsedFact = {
  label: string;
  value: string;
};

type ParsedPaper = {
  title: string;
  purpose: string;
  generatedAt: string;
  reference: string;
  context: ParsedFact[];
  details: string[];
  actionLink: string;
  securityMarks: string;
  privacy: string;
  limitation: string;
  footer: string;
};

type Props = {
  paperText: string;
  compact?: boolean;
  icon?: TrustPaperIconName;
  maxBodyLines?: number;
  style?: React.CSSProperties;
};

function stripPrefix(line: string, prefix: string): string {
  return line.slice(prefix.length).trim();
}

function parseFact(line: string): ParsedFact {
  const splitAt = line.indexOf(":");
  if (splitAt === -1) {
    return { label: "Detail", value: line.trim() || "-" };
  }
  return {
    label: line.slice(0, splitAt).trim() || "Detail",
    value: line.slice(splitAt + 1).trim() || "-",
  };
}

function parsePaperText(paperText: string): ParsedPaper {
  const lines = paperText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const paper: ParsedPaper = {
    title: "GSN Snapshot",
    purpose: "",
    generatedAt: "",
    reference: "",
    context: [],
    details: [],
    actionLink: "",
    securityMarks: "",
    privacy: "",
    limitation: "",
    footer: "Global Support Network (GSN). Trust infrastructure for organized communities.",
  };

  let mode: "none" | "context" | "details" = "none";

  for (const line of lines) {
    if (line === "GSN record context") {
      mode = "context";
      continue;
    }
    if (line === "Record details") {
      mode = "details";
      continue;
    }
    if (line.startsWith("Title:")) {
      paper.title = stripPrefix(line, "Title:") || paper.title;
      mode = "none";
      continue;
    }
    if (line.startsWith("Purpose:")) {
      paper.purpose = stripPrefix(line, "Purpose:");
      mode = "none";
      continue;
    }
    if (line.startsWith("Generated (UTC):")) {
      paper.generatedAt = stripPrefix(line, "Generated (UTC):");
      mode = "none";
      continue;
    }
    if (line.startsWith("Reference:")) {
      paper.reference = stripPrefix(line, "Reference:");
      mode = "none";
      continue;
    }
    if (line.startsWith("Verification / action link:")) {
      paper.actionLink = stripPrefix(line, "Verification / action link:");
      mode = "none";
      continue;
    }
    if (line.startsWith("Security marks:")) {
      paper.securityMarks = line;
      mode = "none";
      continue;
    }
    if (line.startsWith("Privacy:")) {
      paper.privacy = line;
      mode = "none";
      continue;
    }
    if (line.startsWith("Limitation:")) {
      paper.limitation = line;
      mode = "none";
      continue;
    }
    if (line.startsWith("Footer:")) {
      paper.footer = stripPrefix(line, "Footer:") || paper.footer;
      mode = "none";
      continue;
    }
    if (line === "GLOBAL SUPPORT NETWORK (GSN)" || line === "Official GSN headed paper") {
      continue;
    }

    if (mode === "context") {
      paper.context.push(parseFact(line));
    } else if (mode === "details") {
      paper.details.push(line);
    }
  }

  return paper;
}

function labelStyle(): React.CSSProperties {
  return {
    color: "#66788F",
    fontSize: 11,
    fontWeight: 1000,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  };
}

function valueStyle(): React.CSSProperties {
  return {
    marginTop: 4,
    color: "#07172C",
    fontSize: 14,
    fontWeight: 950,
    lineHeight: 1.3,
    overflowWrap: "anywhere",
  };
}

function isGeneratedPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "current when viewed" || normalized === "current when copied";
}

function currentUtcGeneratedText(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export default function GsnSnapshotPaperCard({
  paperText,
  compact = false,
  icon = "document",
  maxBodyLines,
  style,
}: Props) {
  const paper = useMemo(() => parsePaperText(paperText), [paperText]);
  const generatedAtText = useMemo(() => {
    const text = paper.generatedAt.trim();
    return !text || isGeneratedPlaceholder(text) ? currentUtcGeneratedText() : text;
  }, [paper.generatedAt]);
  const visibleDetails = maxBodyLines
    ? paper.details.slice(0, maxBodyLines)
    : paper.details;
  const hiddenCount =
    maxBodyLines && paper.details.length > maxBodyLines
      ? paper.details.length - maxBodyLines
      : 0;

  if (!paperText.trim()) return null;

  return (
    <article
      className="gsn-snapshot-paper-card"
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: compact ? 18 : 22,
        border: "1px solid rgba(212,175,55,0.38)",
        background:
          "linear-gradient(135deg, rgba(255,252,244,0.98) 0%, rgba(248,251,255,0.98) 58%, rgba(238,246,255,0.96) 100%)",
        boxShadow:
          "0 24px 54px rgba(8,17,31,0.16), inset 0 1px 0 rgba(255,255,255,0.88)",
        padding: compact ? 18 : 22,
        color: "#07172C",
        ...style,
      }}
    >
      <TrustPaperWatermark
        name="shield"
        size={compact ? 150 : 190}
        opacity={0.055}
        color="#0B63D1"
        style={{ right: compact ? -28 : -24, bottom: compact ? -18 : -28 }}
      />

      <header
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "auto minmax(0, 1fr) auto",
          gap: compact ? 10 : 12,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: compact ? 54 : 62,
            height: compact ? 54 : 62,
            borderRadius: 18,
            display: "grid",
            placeItems: "center",
            background: "#FFFFFF",
            border: "1px solid rgba(212,175,55,0.22)",
            boxShadow: "0 12px 26px rgba(8,17,31,0.10)",
          }}
        >
          <GSNBrandMark width={compact ? 28 : 34} height={compact ? 34 : 40} />
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={labelStyle()}>Global Support Network</div>
          <h3
            style={{
              margin: "4px 0 0",
              color: "#07172C",
              fontSize: compact ? 20 : 24,
              fontWeight: 1000,
              lineHeight: 1.1,
              overflowWrap: "anywhere",
            }}
          >
            {paper.title}
          </h3>
          {paper.purpose ? (
            <p
              style={{
                margin: "7px 0 0",
                color: "#4A5F78",
                fontSize: compact ? 13 : 14,
                lineHeight: 1.45,
                fontWeight: 750,
              }}
            >
              {paper.purpose}
            </p>
          ) : null}
        </div>

        <div
          aria-hidden="true"
          style={{
            width: compact ? 42 : 46,
            height: compact ? 42 : 46,
            borderRadius: 16,
            display: "grid",
            placeItems: "center",
            color: "#F6D77A",
            background: "linear-gradient(180deg, #061827 0%, #0B2D4A 100%)",
            border: "1px solid rgba(212,175,55,0.38)",
            boxShadow: "0 12px 26px rgba(8,17,31,0.18)",
          }}
        >
          <TrustPaperIcon name={icon} size={compact ? 22 : 24} strokeWidth={2.35} />
        </div>
      </header>

      <TrustPaperAuthorityStrip
        compact={compact}
        title={paper.title}
        generatedAt={generatedAtText}
        reference={paper.reference || "GSN current record"}
        classification="Screenshot-ready"
        style={{ marginTop: compact ? 12 : 14 }}
      />

      <section
        style={{
          position: "relative",
          marginTop: compact ? 14 : 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
          gap: 10,
        }}
      >
        <div
          style={{
            borderRadius: 14,
            padding: "11px 12px",
            background: "rgba(255,255,255,0.76)",
            border: "1px solid rgba(123,161,204,0.18)",
          }}
        >
          <div style={labelStyle()}>Generated UTC</div>
          <div style={valueStyle()}>{generatedAtText}</div>
        </div>
        <div
          style={{
            borderRadius: 14,
            padding: "11px 12px",
            background: "rgba(255,255,255,0.76)",
            border: "1px solid rgba(123,161,204,0.18)",
          }}
        >
          <div style={labelStyle()}>Reference</div>
          <div style={valueStyle()}>{paper.reference || "GSN current record"}</div>
        </div>
      </section>

      {paper.context.length ? (
        <section
          style={{
            position: "relative",
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 10,
          }}
        >
          {paper.context.map((fact) => (
            <div
              key={`${fact.label}-${fact.value}`}
              style={{
                borderRadius: 14,
                padding: "10px 12px",
                background: "rgba(255,255,255,0.62)",
                border: "1px solid rgba(123,161,204,0.16)",
                minWidth: 0,
              }}
            >
              <div style={labelStyle()}>{fact.label}</div>
              <div style={valueStyle()}>{fact.value}</div>
            </div>
          ))}
        </section>
      ) : null}

      {visibleDetails.length ? (
        <section
          style={{
            position: "relative",
            marginTop: 14,
            display: "grid",
            gap: 8,
          }}
        >
          <div style={labelStyle()}>Record Details</div>
          {visibleDetails.map((detail, index) => (
            <div
              key={`${index}-${detail}`}
              style={{
                display: "flex",
                gap: 9,
                alignItems: "flex-start",
                color: "#21364E",
                fontSize: compact ? 13 : 14,
                fontWeight: 780,
                lineHeight: 1.45,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  marginTop: 6,
                  background: "#D4AF37",
                  boxShadow: "0 0 0 4px rgba(212,175,55,0.12)",
                  flex: "0 0 auto",
                }}
              />
              <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{detail}</span>
            </div>
          ))}
          {hiddenCount ? (
            <div
              style={{
                color: "#8A6A18",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              {hiddenCount} more detail{hiddenCount === 1 ? "" : "s"} included in copied paper.
            </div>
          ) : null}
        </section>
      ) : null}

      {paper.actionLink ? (
        <section
          style={{
            position: "relative",
            marginTop: 14,
            borderRadius: 16,
            border: "1px solid rgba(11,99,209,0.18)",
            background: "rgba(232,241,255,0.76)",
            padding: "11px 12px",
          }}
        >
          <div style={labelStyle()}>Verification / Action Link</div>
          <div style={{ ...valueStyle(), color: "#0B4AA2" }}>{paper.actionLink}</div>
        </section>
      ) : null}

      <section style={{ position: "relative", marginTop: 14 }}>
        <TrustPaperSecurityNote reference={paper.reference} compact={compact} />
        {paper.securityMarks ? (
          <div
            style={{
              marginTop: 8,
              color: "#526579",
              fontSize: 11,
              fontWeight: 850,
              lineHeight: 1.4,
            }}
          >
            {paper.securityMarks}
          </div>
        ) : null}
      </section>

      <section
        style={{
          position: "relative",
          marginTop: 14,
          display: "grid",
          gap: 8,
        }}
      >
        {[paper.privacy, paper.limitation].filter(Boolean).map((note) => (
          <div
            key={note}
            style={{
              borderRadius: 14,
              border: "1px solid rgba(212,175,55,0.18)",
              background: "rgba(255,251,235,0.72)",
              padding: "10px 12px",
              color: "#624A0F",
              fontSize: 12,
              fontWeight: 850,
              lineHeight: 1.45,
            }}
          >
            {note}
          </div>
        ))}
      </section>

      <TrustPaperSecurityFooter text={paper.footer} />
    </article>
  );
}
