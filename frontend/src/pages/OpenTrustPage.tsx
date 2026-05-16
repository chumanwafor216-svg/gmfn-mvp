import React, { useEffect, useMemo, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import { CardActionRow, StableCtaLink } from "../components/StableButton";
import {
  getCurrentClan,
  getMe,
  getMyTrustSlip,
  getSelectedClanId,
} from "../lib/api";
import {
  institutionalInnerCard,
  institutionalPageCard,
} from "../lib/institutionalSurface";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import {
  getTrustBandLanguage,
  getTrustBandShortLabel,
  normalizeTrustBand,
} from "../lib/trustBandLanguage";

type TrustSlipRecord = {
  code?: string | null;
  status?: string | null;
  trust_band?: string | null;
  trust_class?: string | null;
  trust_score?: string | number | null;
  open_trust_band?: string | null;
  open_trust_class?: string | null;
  open_trust_score?: string | number | null;
  community_trust_band?: string | null;
  community_trust_class?: string | null;
  community_trust_score?: string | number | null;
};

type ReadingState = {
  classText: string;
  scoreText: string;
  tone: "green" | "yellow" | "red" | "neutral";
  statusText: string;
  whyText: string;
};

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function firstNumberLike(...values: any[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || String(value).trim() === "") {
      continue;
    }
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    borderRadius: 26,
    padding: 20,
    backdropFilter: "blur(6px)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    borderRadius: 18,
    padding: 15,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#39526C",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#526579",
    fontSize: 14.5,
    lineHeight: 1.75,
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    border: primary
      ? "1px solid rgba(11,99,209,0.14)"
      : "1px solid rgba(108,138,184,0.18)",
    background: primary
      ? "linear-gradient(180deg, rgba(11,99,209,0.11) 0%, rgba(11,99,209,0.06) 100%)"
      : "linear-gradient(180deg, rgba(245,249,255,0.96) 0%, rgba(232,240,249,0.94) 100%)",
    color: primary ? "#0B63D1" : "#415A72",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function normalizeTrustSlipRecord(raw: any): TrustSlipRecord | null {
  if (!raw) return null;
  const src = raw?.item || raw?.trust_slip || raw;
  return {
    code: firstTruthy(src?.code, src?.trust_slip_code),
    status: firstTruthy(src?.status, src?.state, src?.verification_status),
    trust_band: firstTruthy(src?.trust_band, src?.trust_class),
    trust_class: firstTruthy(src?.trust_class, src?.trust_band),
    trust_score: firstNumberLike(src?.trust_score),
    open_trust_band: firstTruthy(
      src?.open_trust_band,
      src?.community_trust_band,
      src?.open_trust_class
    ),
    open_trust_class: firstTruthy(
      src?.open_trust_class,
      src?.community_trust_class,
      src?.open_trust_band
    ),
    open_trust_score: firstNumberLike(
      src?.open_trust_score,
      src?.community_trust_score
    ),
    community_trust_band: firstTruthy(
      src?.community_trust_band,
      src?.open_trust_band
    ),
    community_trust_class: firstTruthy(
      src?.community_trust_class,
      src?.open_trust_class
    ),
    community_trust_score: firstNumberLike(
      src?.community_trust_score,
      src?.open_trust_score
    ),
  };
}

function getOpenTrustState(
  me: any,
  trustSlip: TrustSlipRecord | null,
  hasSelectedCommunity: boolean
): ReadingState {
  const rawClass = firstTruthy(
    me?.open_trust_class,
    me?.open_trust_band,
    me?.current_community_trust_class,
    me?.current_community_trust_band,
    me?.community_trust_class,
    me?.community_trust_band,
    me?.selected_clan_trust_class,
    me?.selected_clan_trust_band,
    trustSlip?.open_trust_class,
    trustSlip?.open_trust_band,
    trustSlip?.community_trust_class,
    trustSlip?.community_trust_band,
    me?.trust_class,
    me?.trust_band,
    trustSlip?.trust_class,
    trustSlip?.trust_band
  ).toUpperCase();

  const rawScore = firstNumberLike(
    me?.open_trust_score,
    me?.current_community_trust_score,
    me?.community_trust_score,
    me?.selected_clan_trust_score,
    trustSlip?.open_trust_score,
    trustSlip?.community_trust_score,
    me?.trust_score,
    trustSlip?.trust_score
  );

  const rawWhy = firstTruthy(
    me?.open_trust_reason,
    me?.current_community_trust_reason,
    me?.community_trust_reason,
    me?.selected_clan_trust_reason,
    me?.trust_reason
  );

  if (rawClass) {
    if (rawClass === "A" || rawClass === "A+") {
      return {
        classText: rawClass,
        scoreText:
          rawScore === null || Number.isNaN(rawScore) ? "—" : String(Math.round(rawScore)),
        tone: "green",
        statusText: "Strong in your current community",
        whyText: rawWhy || "Your present community reading is strong.",
      };
    }
    if (rawClass === "B") {
      return {
        classText: rawClass,
        scoreText:
          rawScore === null || Number.isNaN(rawScore) ? "—" : String(Math.round(rawScore)),
        tone: "green",
        statusText: "Stable in your current community",
        whyText: rawWhy || "Your current community reading looks steady right now.",
      };
    }
    if (rawClass === "C") {
      return {
        classText: rawClass,
        scoreText:
          rawScore === null || Number.isNaN(rawScore) ? "—" : String(Math.round(rawScore)),
        tone: "yellow",
        statusText: "Needs attention in your current community",
        whyText:
          rawWhy || "Your current community reading suggests some areas need attention.",
      };
    }
    return {
      classText: rawClass,
      scoreText:
        rawScore === null || Number.isNaN(rawScore) ? "—" : String(Math.round(rawScore)),
      tone: "red",
      statusText: "At risk in your current community",
      whyText:
        rawWhy || "Your current community reading shows pressure that needs attention.",
    };
  }

  if (rawScore !== null && !Number.isNaN(rawScore)) {
    if (rawScore >= 75) {
      return {
        classText: "A",
        scoreText: String(Math.round(rawScore)),
        tone: "green",
        statusText: "Strong in your current community",
        whyText: rawWhy || "Your current community reading is strong.",
      };
    }
    if (rawScore >= 55) {
      return {
        classText: "B",
        scoreText: String(Math.round(rawScore)),
        tone: "green",
        statusText: "Stable in your current community",
        whyText: rawWhy || "Your current community reading looks steady right now.",
      };
    }
    if (rawScore >= 35) {
      return {
        classText: "C",
        scoreText: String(Math.round(rawScore)),
        tone: "yellow",
        statusText: "Needs attention in your current community",
        whyText:
          rawWhy || "Your current community reading suggests some areas need attention.",
      };
    }
    return {
      classText: "D",
      scoreText: String(Math.round(rawScore)),
      tone: "red",
      statusText: "At risk in your current community",
      whyText:
        rawWhy || "Your current community reading shows pressure that needs attention.",
    };
  }

  if (!hasSelectedCommunity) {
    return {
      classText: "Pending",
      scoreText: "—",
      tone: "neutral",
      statusText: "Select a community to view local trust",
      whyText:
        "Local community trust belongs to the community you are using right now. It is separate from the wider cross-community consistency reading.",
    };
  }

  return {
    classText: "Pending",
    scoreText: "—",
    tone: "neutral",
    statusText: "No local community reading yet",
    whyText:
      "Local community trust reflects your standing in your current community. Select or use a community first, then this reading will appear here.",
  };
}

function toneMeta(tone: ReadingState["tone"]) {
  if (tone === "green") {
    return { bg: "#F3FBF5", border: "1px solid rgba(34,197,94,0.16)", text: "#166534" };
  }
  if (tone === "yellow") {
    return { bg: "#FFFBEF", border: "1px solid rgba(245,158,11,0.16)", text: "#92400E" };
  }
  if (tone === "red") {
    return { bg: "#FFF5F5", border: "1px solid rgba(239,68,68,0.16)", text: "#991B1B" };
  }
  return { bg: "#F8FAFC", border: "1px solid rgba(148,163,184,0.16)", text: "#334155" };
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

export default function OpenTrustPage() {
  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "open-trust.route.dashboard"),
      trust: routeTarget("trust", selectedClanId, "open-trust.route.trust"),
      community: routeTarget("communityHome", selectedClanId, "open-trust.route.community"),
    }),
    [selectedClanId]
  );
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [trustSlip, setTrustSlip] = useState<TrustSlipRecord | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function handleResize() {
      setIsCompact(window.innerWidth <= 980);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [meRes, clanRes, trustSlipRes] = await Promise.all([
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
          getMyTrustSlip().catch(() => null),
        ]);
        if (!alive) return;
        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setTrustSlip(normalizeTrustSlipRecord(trustSlipRes));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const openTrust = useMemo(
    () => getOpenTrustState(me, trustSlip, Boolean(selectedClanId)),
    [me, trustSlip, selectedClanId]
  );
  const openTrustBand = normalizeTrustBand(openTrust.classText);
  const openTrustBandLabel = openTrustBand
    ? `${openTrustBand} - ${getTrustBandShortLabel(openTrustBand)}`
    : openTrust.classText;
  const openTrustBandMeaning = useMemo(
    () => getTrustBandLanguage(openTrust.classText),
    [openTrust.classText]
  );
  const tone = useMemo(() => toneMeta(openTrust.tone), [openTrust.tone]);
  const routeGuide = useMemo(
    () => [
      {
        label: "Stay here when",
        title: "You only need the immediate community read",
        body:
          "Local community trust answers the narrower question: how are you reading inside the community you are in right now?",
      },
      {
        label: "Move to Trust Passport when",
        title: "You need the fuller trust story",
        body:
          "Trust Passport carries the wider explanation, document surfaces, and longer trust record beyond this one community snapshot.",
      },
      {
        label: "Move to Community when",
        title: "You need to act inside the current group",
        body:
          "Open Community if the next step is member activity, coordination, or checking the place where this trust reading is being formed.",
      },
    ],
    []
  );

  const communityLabel = useMemo(
    () =>
      firstTruthy(
        currentClan?.marketplace_name,
        currentClan?.name,
        currentClan?.display_name,
        currentClan?.title
      ) || (selectedClanId ? `Community ${selectedClanId}` : "No current community"),
    [currentClan, selectedClanId]
  );

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 18 }}>
      <PageTopNav
        sectionLabel="Local community trust"
        title="Local community trust"
        subtitle="Your immediate community reading without the wider Trust Passport bundle."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.dashboard}
        backLabel="Dashboard"
      />

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Local trust reading</div>
        <div style={{ marginTop: 10, color: "#0B1F33", fontSize: isCompact ? 28 : 34, fontWeight: 900, lineHeight: 1.1 }}>
          Current community reading
        </div>
        <div style={{ marginTop: 8, ...helperText(), maxWidth: 760 }}>
          Use this page when you want the immediate community trust reading only.
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={badge(true)}>{communityLabel}</span>
          <span style={badge(false)}>{openTrustBandLabel}</span>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(280px, 0.9fr) minmax(0, 1.1fr)",
            gap: 14,
            alignItems: "start",
          }}
        >
          <div style={{ ...innerCard(tone.bg), border: tone.border }}>
            <div style={sectionLabel()}>Reading</div>
            <div style={{ marginTop: 12, color: tone.text, fontWeight: 900, fontSize: 34, lineHeight: 1 }}>
              {openTrustBandLabel}
            </div>
            <div style={{ marginTop: 10, color: "#475569", fontSize: 14, fontWeight: 800 }}>
              Current score: {openTrust.scoreText}
            </div>
            <div style={{ marginTop: 10, color: "#0B1F33", fontSize: 14, fontWeight: 800, lineHeight: 1.45 }}>
              {openTrust.statusText}
            </div>
            <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
              {openTrustBandMeaning.plainMeaning}
            </div>
          </div>

          <div style={innerCard("#F8FBFF")}>
            <div style={sectionLabel()}>Why this reading</div>
            <div style={{ marginTop: 10, ...helperText() }}>
              {loading ? "Loading the current community trust reading..." : openTrust.whyText}
            </div>
            <CardActionRow style={{ marginTop: 16 }}>
              <StableCtaLink to={routes.trust} kind="primary" debugId="open-trust.trust">
                Open Trust Passport
              </StableCtaLink>
              <StableCtaLink to={routes.community} debugId="open-trust.community">
                Open Community
              </StableCtaLink>
            </CardActionRow>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>What to do next</div>
        <div
          style={{
            marginTop: 10,
            color: "#0B1F33",
            fontSize: isCompact ? 24 : 29,
            fontWeight: 900,
            lineHeight: 1.15,
          }}
        >
          Use the right trust surface for the right question
        </div>
        <div style={{ marginTop: 8, ...helperText(), maxWidth: 760 }}>
          Local community trust is the narrow community reading. If you need the fuller trust record or
          the place where this reading is being shaped, move there directly from here.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {routeGuide.map((item) => (
            <div key={item.title} style={innerCard("#F8FBFF")}>
              <div style={sectionLabel()}>{item.label}</div>
              <div
                style={{
                  marginTop: 10,
                  color: "#0B1F33",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {item.title}
              </div>
              <div style={{ marginTop: 10, ...helperText() }}>{item.body}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
