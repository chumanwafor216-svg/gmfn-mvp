import React, { useEffect, useMemo, useRef, useState } from "react";

export type NextActionGuideTone = "primary" | "secondary" | "soft";

export type NextActionGuideItem = {
  id: string;
  label: string;
  detail: string;
  technical?: string;
  to?: string;
  keywords?: string[];
  children?: NextActionGuideItem[];
  tone?: NextActionGuideTone;
  disabled?: boolean;
  disabledReason?: string;
};

export type NextActionGuideResolution = {
  title?: string;
  detail?: string;
  firstStep?: string;
  continueLabel?: string;
  continueTone?: NextActionGuideTone;
  payload?: Record<string, any> | null;
};

type NextActionGuideProps = {
  title?: string;
  eyebrow?: string;
  intro?: string;
  placeholder?: string;
  items: NextActionGuideItem[];
  searchItems?: NextActionGuideItem[];
  storageKey?: string;
  defaultOpen?: boolean;
  compact?: boolean;
  resolveSelection?: (
    item: NextActionGuideItem
  ) =>
    | NextActionGuideResolution
    | null
    | Promise<NextActionGuideResolution | null>;
  onBranchChange?: (item: NextActionGuideItem | null) => void;
  onSelect: (
    item: NextActionGuideItem,
    event?: React.SyntheticEvent<HTMLElement>,
    resolution?: NextActionGuideResolution | null
  ) => void;
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

const GUIDE_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "can",
  "close",
  "do",
  "for",
  "go",
  "i",
  "in",
  "into",
  "it",
  "me",
  "my",
  "now",
  "of",
  "on",
  "open",
  "please",
  "show",
  "take",
  "that",
  "the",
  "this",
  "to",
  "want",
  "what",
  "with",
  "you",
]);

function meaningfulTokens(value: string): string[] {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && !GUIDE_STOP_WORDS.has(part));
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

  const queryTokens = meaningfulTokens(needle);
  if (queryTokens.length === 0) return null;

  let best: { item: NextActionGuideItem; score: number } | null = null;
  let runnerUp: { item: NextActionGuideItem; score: number } | null = null;

  for (const item of items) {
    const label = normalizeText(item.label);
    const technical = normalizeText(item.technical || "");
    const keywords = (item.keywords || []).map((value) => normalizeText(value));
    const detail = normalizeText(item.detail || "");
    const labelTokens = meaningfulTokens(item.label);
    const technicalTokens = meaningfulTokens(item.technical || "");
    const keywordTokens = keywords.flatMap((value) => meaningfulTokens(value));
    const detailTokens = meaningfulTokens(item.detail || "");

    let score = 0;

    if (label === needle) score += 120;
    if (technical && technical === needle) score += 100;
    if (keywords.some((keyword) => keyword === needle)) score += 110;
    if (label.includes(needle)) score += 70;
    if (technical && technical.includes(needle)) score += 55;
    if (keywords.some((keyword) => keyword.includes(needle))) score += 60;
    if (detail.includes(needle)) score += 18;

    for (const token of queryTokens) {
      if (labelTokens.includes(token)) score += 28;
      if (technicalTokens.includes(token)) score += 18;
      if (keywordTokens.includes(token)) score += 24;
      if (detailTokens.includes(token)) score += 6;
    }

    const strongCoverage = queryTokens.filter(
      (token) =>
        labelTokens.includes(token) ||
        technicalTokens.includes(token) ||
        keywordTokens.includes(token)
    ).length;
    score += strongCoverage * 12;

    if (!best || score > best.score) {
      runnerUp = best;
      best = { item, score };
      continue;
    }

    if (!runnerUp || score > runnerUp.score) {
      runnerUp = { item, score };
    }
  }

  if (!best) return null;
  if (best.score < 55) return null;
  if (runnerUp && best.score - runnerUp.score < 16) return null;
  return best.item;
}

function buildDefaultResolution(item: NextActionGuideItem): NextActionGuideResolution {
  return {
    title: item.label,
    detail: item.detail,
    continueLabel: `Open ${item.label}`,
    continueTone: item.tone === "soft" ? "secondary" : item.tone || "primary",
  };
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
    minHeight: soft ? 42 : 46,
    minWidth: soft ? 96 : 112,
    maxWidth: "100%",
    padding: soft ? "9px 13px" : "10px 14px",
    borderRadius: primary ? 14 : 14,
    border: primary
      ? "1px solid rgba(16,37,59,0.18)"
      : "1px solid rgba(16,37,59,0.12)",
    background: disabled
      ? "linear-gradient(180deg, #F1F5F9 0%, #E2E8F0 100%)"
      : primary
      ? "linear-gradient(180deg, #1E4E7C 0%, #2F6A9D 64%, #3C79AC 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(239,246,252,0.94) 58%, rgba(225,236,245,0.92) 100%)",
    color: disabled ? "#94A3B8" : primary ? "#F8FBFF" : "#102A43",
    fontSize: soft ? 11.5 : 12.5,
    fontWeight: primary ? 880 : 840,
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
      ? "0 7px 14px rgba(10,24,49,0.12), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -2px 0 rgba(7,24,39,0.14)"
      : "0 6px 12px rgba(10,24,49,0.07), inset 0 1px 0 rgba(255,255,255,0.78), inset 0 -1px 0 rgba(16,37,59,0.04)",
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
  eyebrow = "",
  intro = "Say it simply. GSN will point you to the closest place.",
  placeholder = "Try: loan, deposit, withdraw, shop, invite...",
  items,
  searchItems,
  storageKey,
  defaultOpen = false,
  compact = false,
  resolveSelection,
  onBranchChange,
  onSelect,
}: NextActionGuideProps) {
  const [open, setOpen] = useState(() => readOpenState(storageKey, defaultOpen));
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [resolvingId, setResolvingId] = useState("");
  const [branchItem, setBranchItem] = useState<NextActionGuideItem | null>(null);
  const [selection, setSelection] = useState<{
    item: NextActionGuideItem;
    resolution: NextActionGuideResolution | null;
  } | null>(null);
  const lastPressRef = useRef<{ key: string; at: number } | null>(null);
  const eyebrowText = eyebrow.trim();

  useEffect(() => {
    writeOpenState(storageKey, open);
  }, [open, storageKey]);

  const visibleItems = useMemo(
    () => items.filter((item) => item && item.id && item.label),
    [items]
  );
  const visibleSearchItems = useMemo(
    () => (searchItems || items).filter((item) => item && item.id && item.label),
    [items, searchItems]
  );

  const branchItems = useMemo(
    () =>
      (branchItem?.children || []).filter((item) => item && item.id && item.label),
    [branchItem]
  );

  const activeItems = branchItems.length > 0 ? branchItems : visibleItems;
  const activeSearchItems = branchItems.length > 0 ? branchItems : visibleSearchItems;
  const activeTitle = branchItem
    ? `What do you want under ${branchItem.label}?`
    : title;
  const activeIntro = branchItem
    ? `${branchItem.detail} Choose the exact spotlight handle you want next. GSN will check the requirement and continue from there.`
    : intro;

  const matchedItem = useMemo(
    () => matchGuideItem(query, activeSearchItems),
    [query, activeSearchItems]
  );

  useEffect(() => {
    setSelection(null);
    setResolvingId("");
  }, [visibleItems, branchItems]);

  useEffect(() => {
    if (!branchItem) return;
    const branchStillExists = visibleItems.some((item) => item.id === branchItem.id);
    if (!branchStillExists) {
      setBranchItem(null);
    }
  }, [branchItem, visibleItems]);

  useEffect(() => {
    onBranchChange?.(branchItem);
  }, [branchItem, onBranchChange]);

  async function chooseItem(
    item: NextActionGuideItem | null,
    event?: React.SyntheticEvent<HTMLElement>,
    options?: { requireConfirmation?: boolean }
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
    setSelection(null);

    if ((item.children || []).length > 0) {
      setBranchItem(item);
      setQuery("");
      return;
    }

    const requireConfirmation = Boolean(options?.requireConfirmation);

    if (!resolveSelection) {
      if (requireConfirmation) {
        setSelection({ item, resolution: buildDefaultResolution(item) });
        return;
      }

      setSelection(null);
      onSelect(item, event, null);
      return;
    }

    try {
      setResolvingId(item.id);
      const resolution = await resolveSelection(item);
      setSelection({ item, resolution });
    } catch (error: any) {
      setSelection(null);
      setNotice(
        String(
          error?.message ||
            "GSN could not check the next step just now. Please try again."
        )
      );
    } finally {
      setResolvingId("");
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    void chooseItem(matchedItem, event, { requireConfirmation: true });
  }

  function runGuidePress(
    actionKey: string,
    event: React.SyntheticEvent<HTMLElement> | undefined,
    action: () => void
  ) {
    stopGuideEvent(event, true);

    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const lastPress = lastPressRef.current;
    if (lastPress && lastPress.key === actionKey && now - lastPress.at < 650) {
      return;
    }

    lastPressRef.current = { key: actionKey, at: now };
    action();
  }

  function guidePressProps(
    actionKey: string,
    action: (event?: React.SyntheticEvent<HTMLElement>) => void
  ): Pick<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "onPointerDown" | "onMouseDown" | "onTouchStart" | "onClick"
  > {
    return {
      onPointerDown: (event) => stopGuideEvent(event),
      onMouseDown: (event) => stopGuideEvent(event),
      onTouchStart: (event) => stopGuideEvent(event),
      onClick: (event) => runGuidePress(actionKey, event, () => action(event)),
    };
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
            {eyebrowText ? <div style={labelStyle()}>{eyebrowText}</div> : null}
          <div
            style={{
              marginTop: eyebrowText ? 5 : 0,
              color: "#10253B",
              fontSize: compact ? 22 : 28,
              fontWeight: 950,
              lineHeight: 1.08,
              letterSpacing: -0.2,
            }}
          >
            {activeTitle}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: compact ? "stretch" : "flex-end",
          }}
        >
          {branchItem ? (
            <button
              type="button"
              {...guidePressProps("guide-back-one-step", () => {
                setBranchItem(null);
                setSelection(null);
                setQuery("");
                setNotice("");
              })}
              style={guideButtonStyle("soft")}
            >
              Back one step
            </button>
          ) : null}
          <button
            type="button"
            aria-expanded={open}
            {...guidePressProps("guide-open-close", () => {
              setOpen((value) => !value);
            })}
            style={{
              ...guideButtonStyle("soft"),
              justifySelf: compact ? "stretch" : "end",
            }}
          >
            {open ? "Collapse" : "Open"}
          </button>
        </div>
      </div>

      {open ? (
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gap: 12,
          }}
        >
          <div style={helperStyle()}>{activeIntro}</div>

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
                setSelection(null);
              }}
              placeholder={placeholder}
              aria-label={title}
              style={inputStyle()}
            />

            <button
              type="submit"
              {...guidePressProps(
                `guide-find-action-${matchedItem?.id || "none"}`,
                (event) => {
                  void chooseItem(matchedItem, event, {
                    requireConfirmation: true,
                  });
                }
              )}
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
              (resolvingId
                ? "GSN is checking the first step for that action."
                : selection
                ? `Ready: ${selection.item.label}.`
                : null) ||
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
            {activeItems.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                {...guidePressProps(`guide-item-${item.id}`, (event) => {
                  void chooseItem(item, event, { requireConfirmation: true });
                })}
                style={{
                  ...guideButtonStyle(item.tone || "secondary", item.disabled),
                  minHeight: compact ? 56 : 60,
                  alignItems: "flex-start",
                  flexDirection: "column",
                  gap: 4,
                  padding: compact ? "10px 11px" : "10px 12px",
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
                    fontSize: 14,
                    fontWeight: 900,
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
                    fontSize: 11.5,
                    fontWeight: 760,
                    lineHeight: 1.3,
                  }}
                >
                  {item.detail}
                </span>
              </button>
            ))}
          </div>

          {selection ? (
            <div
              style={{
                borderRadius: 20,
                border: "1px solid rgba(16,37,59,0.12)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,247,252,0.96) 100%)",
                padding: "14px 14px 16px",
                boxShadow:
                  "0 14px 28px rgba(10,24,49,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
                display: "grid",
                gap: 10,
              }}
            >
              <div style={labelStyle()}>GSN will lead this step</div>
              <div
                style={{
                  color: "#10253B",
                  fontSize: compact ? 18 : 20,
                  fontWeight: 950,
                  lineHeight: 1.2,
                }}
              >
                {selection.resolution?.title || selection.item.label}
              </div>
              <div style={helperStyle()}>
                {selection.resolution?.detail || selection.item.detail}
              </div>
              {selection.resolution?.firstStep ? (
                <div
                  style={{
                    ...helperStyle(),
                    fontSize: 13,
                    color: "#315A80",
                    fontWeight: 850,
                  }}
                >
                  First step: {selection.resolution.firstStep}
                </div>
              ) : null}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  {...guidePressProps(
                    `guide-continue-${selection.item.id}`,
                    (event) => {
                    onSelect(selection.item, event, selection.resolution);
                    setSelection(null);
                    }
                  )}
                  style={guideButtonStyle(
                    selection.resolution?.continueTone || "primary"
                  )}
                >
                  {selection.resolution?.continueLabel ||
                    `Continue to ${selection.item.label}`}
                </button>
                <button
                  type="button"
                  {...guidePressProps("guide-choose-something-else", () => {
                    setSelection(null);
                  })}
                  style={guideButtonStyle("soft")}
                >
                  Choose something else
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
