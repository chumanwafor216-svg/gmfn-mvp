import React, { useState } from "react";

type DomainIntroTone = "light" | "blue" | "dark";

type DomainIntroToggleProps = {
  title: string;
  eyebrow?: string;
  body: string;
  bullets?: string[];
  note?: string;
  tone?: DomainIntroTone;
  defaultOpen?: boolean;
  style?: React.CSSProperties;
};

function toneStyles(tone: DomainIntroTone): {
  shell: React.CSSProperties;
  button: React.CSSProperties;
  label: string;
  title: string;
  body: string;
  panel: React.CSSProperties;
} {
  if (tone === "dark") {
    return {
      shell: {
        background: "linear-gradient(180deg, rgba(8,17,31,0.96) 0%, rgba(16,42,67,0.94) 100%)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 18px 38px rgba(7,16,28,0.16)",
      },
      button: {
        background: "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.16)",
        color: "#F8FBFF",
      },
      label: "#A8C7E8",
      title: "#F8FBFF",
      body: "rgba(226,232,240,0.88)",
      panel: {
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
      },
    };
  }

  if (tone === "blue") {
    return {
      shell: {
        background: "linear-gradient(180deg, #FFFFFF 0%, #F4F8FE 100%)",
        border: "1px solid rgba(11,99,209,0.12)",
        boxShadow: "0 14px 30px rgba(11,99,209,0.06)",
      },
      button: {
        background: "#FFFFFF",
        border: "1px solid rgba(11,99,209,0.16)",
        color: "#14324C",
      },
      label: "#0B63D1",
      title: "#102A43",
      body: "#35516B",
      panel: {
        background: "rgba(255,255,255,0.72)",
        border: "1px solid rgba(11,99,209,0.10)",
      },
    };
  }

  return {
    shell: {
      background: "#FFFFFF",
      border: "1px solid rgba(11,31,51,0.08)",
      boxShadow: "0 10px 24px rgba(15,23,42,0.04)",
    },
    button: {
      background: "#FFFFFF",
      border: "1px solid rgba(15,59,116,0.12)",
      color: "#14324C",
    },
    label: "#5F7287",
    title: "#102A43",
    body: "#4C647B",
    panel: {
      background: "#F8FBFF",
      border: "1px solid rgba(11,31,51,0.08)",
    },
  };
}

export default function DomainIntroToggle(props: DomainIntroToggleProps) {
  const [open, setOpen] = useState(Boolean(props.defaultOpen));
  const tone = toneStyles(props.tone || "light");
  const buttonLabel = open ? "Close" : "Open";

  return (
    <section
      style={{
        borderRadius: 22,
        padding: 12,
        ...tone.shell,
        ...(props.style || {}),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: tone.label,
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 0.32,
              textTransform: "uppercase",
            }}
          >
            {props.eyebrow || "Domain guide"}
          </div>
          <div
            style={{
              marginTop: 4,
              color: tone.title,
              fontSize: 16,
              fontWeight: 900,
              lineHeight: 1.25,
            }}
          >
            {props.title}
          </div>
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-label={`${buttonLabel} ${props.title}`}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen((prev) => !prev);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 38,
            minWidth: 82,
            padding: "8px 13px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 900,
            cursor: "pointer",
            textAlign: "center",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.70)",
            ...tone.button,
          }}
        >
          {buttonLabel}
        </button>
      </div>

      {open ? (
        <div
          style={{
            marginTop: 12,
            borderRadius: 18,
            padding: 14,
            ...tone.panel,
          }}
        >
          <div
            style={{
              color: tone.body,
              fontSize: 14,
              lineHeight: 1.75,
            }}
          >
            {props.body}
          </div>

          {props.bullets?.length ? (
            <div
              style={{
                marginTop: 12,
                display: "grid",
                gap: 8,
              }}
            >
              {props.bullets.map((item) => (
                <div
                  key={item}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "9px 1fr",
                    gap: 8,
                    alignItems: "start",
                    color: tone.body,
                    fontSize: 13.5,
                    lineHeight: 1.65,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      marginTop: 8,
                      background: tone.label,
                    }}
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : null}

          {props.note ? (
            <div
              style={{
                marginTop: 12,
                color: tone.title,
                fontSize: 13.5,
                fontWeight: 800,
                lineHeight: 1.65,
              }}
            >
              {props.note}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
