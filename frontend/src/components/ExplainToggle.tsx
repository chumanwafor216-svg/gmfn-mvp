import React, { useState } from "react";

// Shared rollback switch: hide helper explain surfaces globally while we
// stabilize route behavior and reduce UI noise.
const EXPLAIN_TOGGLES_ENABLED = false;

type ExplainToggleProps = {
  label: string;
  what: string;
  why: string;
  next?: string;
  tone?: "light" | "blue" | "dark";
  defaultOpen?: boolean;
  style?: React.CSSProperties;
};

function toneStyles(tone: "light" | "blue" | "dark"): {
  shell: React.CSSProperties;
  chip: React.CSSProperties;
  text: string;
  subtext: string;
  button: React.CSSProperties;
} {
  if (tone === "dark") {
    return {
      shell: {
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
      },
      chip: {
        background: "rgba(255,255,255,0.12)",
        color: "#F8FBFF",
        border: "1px solid rgba(255,255,255,0.14)",
      },
      text: "#F8FBFF",
      subtext: "rgba(226,232,240,0.86)",
      button: {
        background: "rgba(255,255,255,0.12)",
        color: "#F8FBFF",
        border: "1px solid rgba(255,255,255,0.14)",
      },
    };
  }

  if (tone === "blue") {
    return {
      shell: {
        background: "linear-gradient(180deg, #FFFFFF 0%, #F6FAFF 100%)",
        border: "1px solid rgba(11,99,209,0.12)",
        boxShadow: "0 12px 24px rgba(11,99,209,0.05)",
      },
      chip: {
        background: "rgba(226,240,255,0.96)",
        color: "#16324F",
        border: "1px solid rgba(22,50,79,0.10)",
      },
      text: "#102A43",
      subtext: "#35516B",
      button: {
        background: "#FFFFFF",
        color: "#14324C",
        border: "1px solid rgba(15,59,116,0.14)",
      },
    };
  }

  return {
    shell: {
      background: "#FFFFFF",
      border: "1px solid rgba(11,31,51,0.08)",
      boxShadow: "0 10px 22px rgba(15,23,42,0.04)",
    },
    chip: {
      background: "#F8FBFF",
      color: "#16324F",
      border: "1px solid rgba(22,50,79,0.08)",
    },
    text: "#102A43",
    subtext: "#4C647B",
    button: {
      background: "#FFFFFF",
      color: "#14324C",
      border: "1px solid rgba(15,59,116,0.12)",
    },
  };
}

export default function ExplainToggle(props: ExplainToggleProps) {
  if (!EXPLAIN_TOGGLES_ENABLED) {
    return null;
  }

  const [open, setOpen] = useState(Boolean(props.defaultOpen));
  const tone = toneStyles(props.tone || "light");

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 14,
        ...tone.shell,
        ...(props.style || {}),
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 0.22,
              textTransform: "uppercase",
              ...tone.chip,
            }}
          >
            Guide
          </span>

          <div
            style={{
              color: tone.text,
              fontSize: 14,
              fontWeight: 900,
              lineHeight: 1.35,
            }}
          >
            {props.label}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minHeight: 38,
            padding: "8px 12px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            whiteSpace: "normal",
            textAlign: "center",
            ...tone.button,
          }}
        >
          {open ? "Collapse guide" : "Open guide"}
        </button>
      </div>

      {open ? (
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ color: tone.subtext, fontSize: 14, lineHeight: 1.75 }}>
            <strong style={{ color: tone.text }}>What this is:</strong> {props.what}
          </div>
          <div style={{ color: tone.subtext, fontSize: 14, lineHeight: 1.75 }}>
            <strong style={{ color: tone.text }}>Why it matters:</strong> {props.why}
          </div>
          {props.next ? (
            <div style={{ color: tone.subtext, fontSize: 14, lineHeight: 1.75 }}>
              <strong style={{ color: tone.text }}>What to do next:</strong> {props.next}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
