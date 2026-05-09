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
  accentBar: string;
  chrome: string;
  eyebrowBg: string;
  item: React.CSSProperties;
  marker: React.CSSProperties;
  note: React.CSSProperties;
} {
  if (tone === "dark") {
    return {
      shell: {
        background:
          "radial-gradient(circle at 14% 0%, rgba(212,175,55,0.18), transparent 34%), radial-gradient(circle at 92% 10%, rgba(96,165,250,0.16), transparent 34%), linear-gradient(145deg, rgba(8,17,31,0.98) 0%, rgba(16,42,67,0.96) 100%)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow:
          "0 22px 46px rgba(7,16,28,0.24), inset 0 1px 0 rgba(255,255,255,0.08)",
      },
      button: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.09) 100%)",
        border: "1px solid rgba(255,255,255,0.16)",
        color: "#F8FBFF",
      },
      label: "#A8C7E8",
      title: "#F8FBFF",
      body: "rgba(226,232,240,0.88)",
      panel: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.06) 100%)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
      },
      accentBar:
        "linear-gradient(90deg, #D4AF37 0%, #93C5FD 48%, rgba(255,255,255,0.18) 100%)",
      chrome:
        "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0))",
      eyebrowBg: "rgba(168,199,232,0.12)",
      item: {
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.10)",
      },
      marker: {
        background:
          "linear-gradient(180deg, rgba(212,175,55,0.30) 0%, rgba(96,165,250,0.16) 100%)",
        color: "#F8FBFF",
        border: "1px solid rgba(255,255,255,0.16)",
      },
      note: {
        background: "rgba(212,175,55,0.12)",
        border: "1px solid rgba(212,175,55,0.18)",
        color: "#F8FBFF",
      },
    };
  }

  if (tone === "blue") {
    return {
      shell: {
        background:
          "radial-gradient(circle at 12% 0%, rgba(11,99,209,0.16), transparent 32%), radial-gradient(circle at 92% 8%, rgba(243,208,106,0.22), transparent 30%), radial-gradient(circle at 82% 92%, rgba(219,39,119,0.08), transparent 34%), linear-gradient(145deg, #FFFFFF 0%, #F7FBFF 46%, #EDF6FF 100%)",
        border: "1px solid rgba(15,59,116,0.16)",
        boxShadow:
          "0 22px 44px rgba(10,24,49,0.08), inset 0 1px 0 rgba(255,255,255,0.92)",
      },
      button: {
        background:
          "linear-gradient(180deg, #FFFFFF 0%, #F3F8FF 52%, #E4EFFB 100%)",
        border: "1px solid rgba(15,59,116,0.18)",
        color: "#14324C",
      },
      label: "#0F3B74",
      title: "#102A43",
      body: "#35516B",
      panel: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(246,250,255,0.92) 100%)",
        border: "1px solid rgba(15,59,116,0.12)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.92), 0 14px 28px rgba(10,24,49,0.05)",
      },
      accentBar:
        "linear-gradient(90deg, #0F3B74 0%, #0B63D1 42%, #D4AF37 76%, rgba(219,39,119,0.36) 100%)",
      chrome:
        "linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0))",
      eyebrowBg: "rgba(15,59,116,0.08)",
      item: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(240,247,255,0.88) 100%)",
        border: "1px solid rgba(15,59,116,0.10)",
      },
      marker: {
        background:
          "linear-gradient(180deg, #F9E7A8 0%, #D4AF37 100%)",
        color: "#14324C",
        border: "1px solid rgba(145,103,19,0.18)",
      },
      note: {
        background:
          "linear-gradient(135deg, rgba(15,59,116,0.08) 0%, rgba(212,175,55,0.16) 100%)",
        border: "1px solid rgba(15,59,116,0.12)",
        color: "#102A43",
      },
    };
  }

  return {
    shell: {
      background:
        "radial-gradient(circle at 12% 0%, rgba(15,59,116,0.08), transparent 30%), linear-gradient(145deg, #FFFFFF 0%, #F8FBFF 100%)",
      border: "1px solid rgba(11,31,51,0.10)",
      boxShadow:
        "0 18px 36px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.90)",
    },
    button: {
      background: "linear-gradient(180deg, #FFFFFF 0%, #F4F8FC 100%)",
      border: "1px solid rgba(15,59,116,0.12)",
      color: "#14324C",
    },
    label: "#5F7287",
    title: "#102A43",
    body: "#4C647B",
    panel: {
      background: "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)",
      border: "1px solid rgba(11,31,51,0.08)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.88)",
    },
    accentBar:
      "linear-gradient(90deg, #0F3B74 0%, #D4AF37 72%, rgba(15,59,116,0.10) 100%)",
    chrome:
      "linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0))",
    eyebrowBg: "rgba(95,114,135,0.08)",
    item: {
      background: "rgba(255,255,255,0.72)",
      border: "1px solid rgba(11,31,51,0.08)",
    },
    marker: {
      background: "linear-gradient(180deg, #FFFFFF 0%, #EAF1F8 100%)",
      color: "#14324C",
      border: "1px solid rgba(15,59,116,0.12)",
    },
    note: {
      background: "rgba(15,59,116,0.06)",
      border: "1px solid rgba(15,59,116,0.10)",
      color: "#102A43",
    },
  };
}

function stopIntroTap(
  event: React.SyntheticEvent<HTMLElement>,
  preventDefault = false
) {
  if (preventDefault) event.preventDefault();
  event.stopPropagation();
}

export default function DomainIntroToggle(props: DomainIntroToggleProps) {
  const [open, setOpen] = useState(Boolean(props.defaultOpen));
  const tone = toneStyles(props.tone || "light");
  const buttonLabel = open ? "Close" : "Open";
  const eyebrow = props.eyebrow?.trim();

  return (
    <section
      onPointerDown={(event) => stopIntroTap(event)}
      onMouseDown={(event) => stopIntroTap(event)}
      onClick={(event) => stopIntroTap(event)}
      style={{
        position: "relative",
        zIndex: 1,
        isolation: "isolate",
        borderRadius: 26,
        padding: 14,
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        overflow: "hidden",
        boxSizing: "border-box",
        ...tone.shell,
        ...(props.style || {}),
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: tone.chrome,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 5,
          background: tone.accentBar,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          padding: "2px 2px 0",
        }}
      >
        <div style={{ minWidth: 0 }}>
          {eyebrow ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 24,
                padding: "4px 10px",
                borderRadius: 999,
                background: tone.eyebrowBg,
                color: tone.label,
                fontSize: 10.5,
                fontWeight: 900,
                letterSpacing: 0.7,
                textTransform: "uppercase",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.42)",
              }}
            >
              {eyebrow}
            </div>
          ) : null}
          <div
            style={{
              marginTop: eyebrow ? 8 : 0,
              color: tone.title,
              fontSize: 17,
              fontWeight: 900,
              lineHeight: 1.2,
              letterSpacing: -0.08,
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
            stopIntroTap(event);
          }}
          onMouseDown={(event) => {
            stopIntroTap(event);
          }}
          onClick={(event) => {
            stopIntroTap(event, true);
            setOpen((prev) => !prev);
          }}
          style={{
            position: "relative",
            zIndex: 2,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 48,
            minWidth: 108,
            padding: "11px 18px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 900,
            cursor: "pointer",
            textAlign: "center",
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
            userSelect: "none",
            appearance: "none",
            WebkitAppearance: "none",
            boxSizing: "border-box",
            isolation: "isolate",
            transform: "none",
            overflowAnchor: "none",
            boxShadow:
              "0 12px 22px rgba(10,24,49,0.08), inset 0 1px 0 rgba(255,255,255,0.82), inset 0 -2px 0 rgba(10,24,49,0.04)",
            ...tone.button,
          }}
        >
          {buttonLabel}
        </button>
      </div>

      {open ? (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            marginTop: 14,
            borderRadius: 22,
            padding: 16,
            ...tone.panel,
          }}
        >
          <div
            style={{
              color: tone.body,
              fontSize: 14.2,
              lineHeight: 1.72,
              fontWeight: 650,
            }}
          >
            {props.body}
          </div>

          {props.bullets?.length ? (
            <div
              style={{
                marginTop: 14,
                display: "grid",
                gap: 9,
              }}
            >
              {props.bullets.map((item, index) => (
                <div
                  key={item}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "30px 1fr",
                    gap: 10,
                    alignItems: "start",
                    color: tone.body,
                    fontSize: 13.5,
                    lineHeight: 1.58,
                    borderRadius: 17,
                    padding: "10px 11px",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.62)",
                    ...tone.item,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      marginTop: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: 0.12,
                      boxShadow:
                        "0 8px 16px rgba(10,24,49,0.06), inset 0 1px 0 rgba(255,255,255,0.68)",
                      ...tone.marker,
                    }}
                  >
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : null}

          {props.note ? (
            <div
              style={{
                marginTop: 14,
                borderRadius: 17,
                padding: "12px 13px",
                color: tone.title,
                fontSize: 13.5,
                fontWeight: 850,
                lineHeight: 1.58,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.58)",
                ...tone.note,
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
