import React from "react";

type StructurePreviewPanelProps = {
  visibleStructureRows?: Array<{
    node?: {
      id?: number | string | null;
      name?: string | null;
      node_type?: string | null;
      node_kind?: string | null;
      status?: string | null;
    } | null;
    level?: number;
  }>;
};

function cleanText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function compactStatus(value: unknown): string {
  return cleanText(value, "not recorded").replace(/_/g, " ");
}

function softCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    background:
      "linear-gradient(180deg, rgba(248,251,255,0.995) 0%, rgba(236,243,250,0.985) 100%)",
    border: "1px solid rgba(9,27,46,0.12)",
    boxShadow: "0 14px 30px rgba(7,20,36,0.055)",
    padding: 14,
    color: "#091B2E",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#506A82",
    fontWeight: 900,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#4F647A",
    fontSize: 14,
    lineHeight: 1.65,
  };
}

function statusBadge(status: unknown): React.CSSProperties {
  const text = cleanText(status).toLowerCase();
  const warning =
    text.includes("draft") ||
    text.includes("quote") ||
    text.includes("not") ||
    text.includes("needs") ||
    text.includes("pending") ||
    text.includes("optional") ||
    text.includes("read only");
  const danger = text.includes("suspended") || text.includes("expired") || text.includes("closed");
  const palette = danger
    ? { bg: "rgba(153,27,27,0.10)", color: "#991B1B", border: "rgba(153,27,27,0.20)" }
    : warning
    ? { bg: "rgba(146,94,8,0.11)", color: "#925E08", border: "rgba(146,94,8,0.22)" }
    : { bg: "rgba(22,101,52,0.10)", color: "#166534", border: "rgba(22,101,52,0.22)" };

  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: palette.bg,
    color: palette.color,
    border: `1px solid ${palette.border}`,
    fontSize: 12,
    fontWeight: 900,
    textTransform: "capitalize",
  };
}

export default function CommunityDomainStructurePreviewPanel({
  visibleStructureRows = [],
}: StructurePreviewPanelProps): React.ReactElement {
  return (
    <div style={softCard()}>
      <div style={sectionLabel()}>Structure preview</div>
      <div style={{ ...helperText(), marginTop: 7 }}>
        Root institution and first operating units, shown from the read-only Community Domain tree.
      </div>
      {visibleStructureRows.length ? (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {visibleStructureRows.map(({ node, level = 0 }) => (
            <div
              key={`${cleanText(node?.id)}:${cleanText(node?.name)}`}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: 10,
                alignItems: "center",
                borderRadius: 14,
                border: "1px solid rgba(9,27,46,0.10)",
                background: "rgba(255,255,255,0.72)",
                padding: "10px 10px 10px 12px",
                marginLeft: level ? 12 : 0,
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 950 }}>
                  {cleanText(node?.name, level ? "Operating unit" : "Root institution")}
                </span>
                <span
                  style={{
                    display: "block",
                    color: "#4F647A",
                    fontSize: 12.5,
                    marginTop: 3,
                    textTransform: "capitalize",
                  }}
                >
                  {level ? "Operating unit" : "Root"} -{" "}
                  {compactStatus(node?.node_type || node?.node_kind)}
                </span>
              </span>
              <span style={statusBadge(node?.status)}>{compactStatus(node?.status)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ ...helperText(), marginTop: 10 }}>
          No operating-unit structure has been mapped yet. Owners and domain admins still need
          to add branches, departments, lines, classes, or committees through scoped structure
          tools.
        </div>
      )}
      <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
        This preview does not create nodes, change parentage, place members, grant roles,
        activate billing, or verify a branch.
      </div>
    </div>
  );
}
