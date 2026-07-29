import React from "react";
import { GsnLegacyIcon } from "../../components/GsnLegacyIcon";
import { SubtleButton } from "../../components/StableButton";
import { TrustPaperSecurityFooter } from "../../components/TrustPaperMarks";
import { institutionalInnerCard } from "../../lib/institutionalSurface";

type InstitutionalContextRow = [string, React.ReactNode];

type TrustPassportInstitutionalContextProps = {
  isCompact: boolean;
  institutionalRows: InstitutionalContextRow[];
  institutionalContextDetailsOpen: boolean;
  setInstitutionalContextDetailsOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    borderRadius: 18,
    padding: 15,
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#526579",
    fontSize: 14.5,
    lineHeight: 1.75,
  };
}

export default function TrustPassportInstitutionalContext({
  isCompact,
  institutionalRows,
  institutionalContextDetailsOpen,
  setInstitutionalContextDetailsOpen,
}: TrustPassportInstitutionalContextProps) {
  return (
    <section
      style={{
        ...innerCard("#FFFFFF"),
        border: "1px solid rgba(216,227,238,0.9)",
        marginTop: 14,
      }}
    >
      <div style={{ color: "#07172C", fontWeight: 1000, fontSize: 20 }}>
        8. Evidence & institutional context
      </div>
      <div
        data-trust-passport-institutional-context-details="collapsed"
        style={{
          ...innerCard("#FFFFFF"),
          border: "1px solid rgba(216,227,238,0.9)",
          display: "grid",
          gap: institutionalContextDetailsOpen ? (isCompact ? 9 : 12) : 0,
          marginTop: 10,
        }}
      >
        <SubtleButton
          debugId="trust-score.institutional-context-details.toggle"
          stableHeight={isCompact ? 42 : 44}
          onClick={() => setInstitutionalContextDetailsOpen((open) => !open)}
          aria-expanded={institutionalContextDetailsOpen}
          fullWidth
          style={{
            justifyContent: "space-between",
            borderRadius: 13,
            background: institutionalContextDetailsOpen ? "#F8FBFF" : "#FFFFFF",
            border: "1px solid rgba(11,99,209,0.14)",
            color: "#24415C",
            boxShadow: "none",
            fontSize: 12.5,
            fontWeight: 1000,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <GsnLegacyIcon name="evidence" size={24} decorative />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Institutional context details
            </span>
          </span>
          <span aria-hidden="true" style={{ color: "#617085", fontSize: 18 }}>
            {institutionalContextDetailsOpen ? "-" : "+"}
          </span>
        </SubtleButton>

        {institutionalContextDetailsOpen ? (
          <div
            style={{
              display: "grid",
              gap: isCompact ? 8 : 10,
              paddingTop: isCompact ? 8 : 10,
              borderTop: "1px solid rgba(216,227,238,0.62)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
                gap: 0,
                border: "1px solid rgba(216,227,238,0.9)",
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              {institutionalRows.map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                    gap: isCompact ? 4 : 10,
                    padding: "10px 12px",
                    borderBottom: "1px solid rgba(216,227,238,0.72)",
                    borderRight: isCompact ? "none" : "1px solid rgba(216,227,238,0.72)",
                    alignItems: isCompact ? "start" : "center",
                  }}
                >
                  <span style={{ color: "#526579", fontWeight: 850 }}>{label}</span>
                  <b
                    style={{
                      color: label === "Risk level" ? "#991B1B" : "#07172C",
                      textAlign: isCompact ? "left" : "right",
                      overflowWrap: "break-word",
                      wordBreak: "normal",
                    }}
                  >
                    {value}
                  </b>
                </div>
              ))}
            </div>
            <p style={{ ...helperText(), margin: 0 }}>
              Human-first evidence reading: identity first, explanation second,
              evidence third, technical detail last.
            </p>
            <TrustPaperSecurityFooter text="Human-first evidence reading: identity first, explanation second, evidence third, technical detail last." />
          </div>
        ) : null}
      </div>
    </section>
  );
}
