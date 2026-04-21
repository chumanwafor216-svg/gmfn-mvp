import React, { useEffect, useMemo, useState } from "react";

export type NextActionGuideTone = "primary" | "secondary" | "soft";

export type NextActionGuideItem = {
  id: string;
  label: string;
  detail: string;
  technical?: string;
  to?: string;
  keywords?: string[];
  tone?: NextActionGuideTone;
  disabled?: boolean;
  disabledReason?: string;
};

type NextActionGuideProps = {
  title?: string;
  eyebrow?: string;
  intro?: string;
  placeholder?: string;
  items: NextActionGuideItem[];
  storageKey?: string;
  defaultOpen?: boolean;
  compact?: boolean;
  onSelect: (
    item: NextActionGuideItem,
    event?: React.SyntheticEvent<HTMLElement>
  ) => void;
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function stopGuideEvent(
  event?: React.SyntheticEvent<HTMLElement>,
  preventDefault = false
) {
  if (!event) return;
  if (preventDefault) event.preventDefault();
  event.stopPropagation();
}

function readOpenState(storageKey: string | undefined, fallback: boolean) {
  if (!storageKey || typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === "open") return true;
    if (raw === "closed") return false;
  } catch {
    // Keep the guide usable even when local storage is blocked.
  }

  return fallback;
}

function writeOpenState(storageKey: string | undefined, open: boolean) {
  if (!storageKey || typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, open ? "open" : "closed");
  } catch {
    // Non-critical preference only.
  }
}

function matchGuideItem(
  query: string,
  items: NextActionGuideItem[]
): NextActionGuideItem | null {
  const needle = normalizeText(query);
  if (!needle) return null;

  const tokens = needle.split(/\s+/).filter(Boolean);

  for (const item of items) {
    const haystack = normalizeText(
      [
        item.label,
        item.detail,
        item.technical,
        ...(item.keywords || []),
      ]
        .filter(Boolean)
        .join(" ")
    );

    if (haystack.includes(needle)) return item;
    if (tokens.length > 0 && tokens.every((token) => haystack.includes(token))) {
      return item;
    }
  }

  return null;
}

function cardStyle(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 1,
    isolation: "isolate",
    borderRadius: 24,
    border: "1px solid rgba(16,37,59,0.12)",
    background:
      "radial-gradient(circle at 12% 0%, rgba(11,99,209,0.065) 0%, rgba(11,99,209,0.00) 36%), radial-gradient(circle at 92% 4%, rgba(243,208,106,0.05) 0%, rgba(243,208,106,0.00) 28%), linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(244,250,254,0.90) 58%, rgba(235,245,252,0.88) 100%)",
    padding: "clamp(14px, 3.8vw, 20px)",
    boxShadow:
      "0 18px 38px rgba(10,24,49,0.075), inset 0 1px 0 rgba(255,255,255,0.74)",
    overflow: "hidden",
    backdropFilter: "blur(8px)",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
}

function headerStyle(compact: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: compact ? "1fr" : "minmax(0, 1fr) auto",
    gap: compact ? 10 : 12,
    alignItems: "center",
  };
}

function labelStyle(): React.CSSProperties {
  return {
    color: "#315A80",
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  };
}

function helperStyle(): React.CSSProperties {
  return {
    color: "#4D667D",
    fontSize: 14,
    lineHeight: 1.65,
  };
}

function guideButtonStyle(
  tone: NextActionGuideTone = "secondary",
  disabled = false
): React.CSSProperties {
  const primary = tone === "primary";
  const soft = tone === "soft";

  return {
    position: "relative",
    zIndex: 4,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: soft ? 48 : 50,
    minWidth: soft ? 112 : 126,
    maxWidth: "100%",
    padding: soft ? "11px 15px" : "12px 16px",
    borderRadius: primary ? 16 : 15,
    border: primary
      ? "1px solid rgba(16,37,59,0.22)"
      : "1px solid rgba(16,37,59,0.14)",
    background: disabled
      ? "linear-gradient(180deg, #F1F5F9 0%, #E2E8F0 100%)"
      : primary
      ? "linear-gradient(180deg, #1B4B78 0%, #2B6599 56%, #3B78AE 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(239,246,252,0.94) 58%, rgba(225,236,245,0.92) 100%)",
    color: disabled ? "#94A3B8" : primary ? "#F8FBFF" : "#102A43",
    fontSize: soft ? 12 : 13,
    fontWeight: primary ? 900 : 850,
    lineHeight: 1.18,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    overflow: "hidden",
    overflowWrap: "anywhere",
    boxSizing: "border-box",
    boxShadow: disabled
      ? "none"
      : primary
      ? "0 11px 20px rgba(10,24,49,0.14), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -2px 0 rgba(7,24,39,0.16)"
      : "0 9px 18px rgba(10,24,49,0.085), inset 0 1px 0 rgba(255,255,255,0.78), inset 0 -2px 0 rgba(16,37,59,0.04)",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    pointerEvents: "auto",
    appearance: "none",
    WebkitAppearance: "none",
    isolation: "isolate",
    transform: "translateZ(0)",
    willChange: "box-shadow",
    outlineOffset: 4,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    border: "1px solid rgba(16,37,59,0.12)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,251,254,0.94) 100%)",
    padding: "10px 12px",
    color: "#102A43",
    fontSize: 14,
    fontWeight: 800,
    outline: "none",
    boxSizing: "border-box",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.84)",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
}

export default function NextActionGuide({
  title = "What do you want to do next?",
  eyebrow = "Your guide",
  intro = "Say it simply. GSN will point you to the closest place.",
  placeholder = "Try: loan, deposit, withdraw, shop, invite...",
  items,
  storageKey,
  defaultOpen = false,
  compact = false,
  onSelect,
}: NextActionGuideProps) {
  const [open, setOpen] = useState(() => readOpenState(storageKey, defaultOpen));
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    writeOpenState(storageKey, open);
  }, [open, storageKey]);

  const visibleItems = useMemo(
    () => items.filter((item) => item && item.id && item.label),
    [items]
  );

  const matchedItem = useMemo(
    () => matchGuideItem(query, visibleItems),
    [query, visibleItems]
  );

  function chooseItem(
    item: NextActionGuideItem | null,
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    stopGuideEvent(event, true);

    if (!item) {
      setNotice(
        "I could not match that yet. Try loan, deposit, withdraw, shop, community, invite, trust, or marketplace."
      );
      return;
    }

    if (item.disabled) {
      setNotice(
        item.disabledReason ||
          "This action is not ready yet. Complete the first required step, then try again."
      );
      return;
    }

    setNotice("");
    onSelect(item, event);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    chooseItem(matchedItem, event);
  }

  return (
    <section
      onPointerDown={stopGuideEvent}
      onMouseDown={stopGuideEvent}
      onTouchStart={stopGuideEvent}
      onClick={stopGuideEvent}
      style={cardStyle()}
    >
      <div style={headerStyle(compact)}>
        <div style={{ minWidth: 0 }}>
          <div style={labelStyle()}>{eyebrow}</div>
          <div
            style={{
              marginTop: 5,
              color: "#10253B",
              fontSize: compact ? 22 : 28,
              fontWeight: 950,
              lineHeight: 1.08,
              letterSpacing: -0.2,
            }}
          >
            {title}
          </div>
        </div>

        <button
          type="button"
          aria-expanded={open}
          onPointerDown={(event) => stopGuideEvent(event)}
          onMouseDown={(event) => stopGuideEvent(event)}
          onTouchStart={(event) => stopGuideEvent(event)}
          onClick={(event) => {
            stopGuideEvent(event, true);
            setOpen((value) => !value);
          }}
          style={{
            ...guideButtonStyle("soft"),
            justifySelf: compact ? "stretch" : "end",
          }}
        >
          {open ? "Collapse" : "Open"}
        </button>
      </div>

      {open ? (
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gap: 12,
          }}
        >
          <div style={helperStyle()}>{intro}</div>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "grid",
              gridTemplateColumns: compact ? "1fr" : "minmax(0, 1fr) auto",
              gap: 10,
              alignItems: "center",
            }}
          >
            <input
              value={query}
              onPointerDown={(event) => stopGuideEvent(event)}
              onMouseDown={(event) => stopGuideEvent(event)}
              onTouchStart={(event) => stopGuideEvent(event)}
              onChange={(event) => {
                setQuery(event.target.value);
                setNotice("");
              }}
              placeholder={placeholder}
              aria-label={title}
              style={inputStyle()}
            />

            <button
              type="submit"
              onPointerDown={(event) => stopGuideEvent(event)}
              onMouseDown={(event) => stopGuideEvent(event)}
              onTouchStart={(event) => stopGuideEvent(event)}
              style={guideButtonStyle("primary")}
            >
              {matchedItem ? `Open ${matchedItem.label}` : "Find action"}
            </button>
          </form>

          <div
            style={{
              ...helperStyle(),
              fontSize: 13,
              color: notice ? "#8A3B12" : "#52677C",
              fontWeight: notice ? 850 : 700,
            }}
          >
            {notice ||
              (matchedItem
                ? `Best match: ${matchedItem.label}${
                    matchedItem.technical ? ` - ${matchedItem.technical}` : ""
                  }.`
                : "You can also use the quick choices below.")}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: compact
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {visibleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                onPointerDown={(event) => stopGuideEvent(event)}
                onMouseDown={(event) => stopGuideEvent(event)}
                onTouchStart={(event) => stopGuideEvent(event)}
                onClick={(event) => chooseItem(item, event)}
                style={{
                  ...guideButtonStyle(item.tone || "secondary", item.disabled),
                  minHeight: compact ? 64 : 72,
                  alignItems: "flex-start",
                  flexDirection: "column",
                  gap: 5,
                  padding: "11px 12px",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    color: item.disabled
                      ? "#94A3B8"
                      : item.tone === "primary"
                      ? "#F8FBFF"
                      : "#10253B",
                    fontSize: 15,
                    fontWeight: 950,
                    lineHeight: 1.2,
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    color: item.disabled
                      ? "#94A3B8"
                      : item.tone === "primary"
                      ? "rgba(248,251,255,0.82)"
                      : "#52677C",
                    fontSize: 12,
                    fontWeight: 780,
                    lineHeight: 1.35,
                  }}
                >
                  {item.detail}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
