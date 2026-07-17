import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NextActionGuide from "../components/NextActionGuide";
import PageTopNav from "../components/PageTopNav";
import { CardActionRow, SecondaryButton, StableCtaLink } from "../components/StableButton";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import TrustDocumentFamilyMap from "../components/TrustDocumentFamilyMap";
import TrustDocumentUseCases from "../components/TrustDocumentUseCases";
import {
  getClanTrustScoreExplained,
  getMe,
  getMyTrustSlip,
  getSelectedClanId,
  safeCopy,
  setSelectedClanId,
} from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import { navigateWithOrigin } from "../lib/nav";
import { buildTrustDocumentFamilyItems } from "../lib/trustDocumentFamilyMap";
import { buildTrustDocumentUseCaseItems } from "../lib/trustDocumentUseCases";
import { buildCciGuideItems } from "../lib/trustDocumentGuide";
import { buildCciSnapshot } from "../lib/trustDocumentSnapshots";
import { getContextualEvidencePosture } from "../lib/trustBandLanguage";

type ReadingState = {
  classText: string;
  scoreText: string;
  tone: "green" | "yellow" | "red" | "neutral";
  statusText: string;
  whyText: string;
};

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(108,138,184,0.18)",
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F3F8FF 100%)"
        : bg,
    padding: 20,
    boxShadow:
      "0 24px 52px rgba(15,23,42,0.08), 0 3px 10px rgba(15,23,42,0.03)",
    overflow: "hidden",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(125,154,196,0.18)",
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)"
        : bg,
    padding: 14,
    boxShadow: "0 16px 34px rgba(15,23,42,0.05)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#39526C",
    fontWeight: 1000,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#4F657B",
    fontSize: 14.5,
    lineHeight: 1.75,
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 32,
    borderRadius: 999,
    padding: "7px 12px",
    background: primary
      ? "linear-gradient(180deg, rgba(29,95,212,0.14) 0%, rgba(29,95,212,0.09) 100%)"
      : "linear-gradient(180deg, rgba(130,146,172,0.16) 0%, rgba(130,146,172,0.10) 100%)",
    border: primary
      ? "1px solid rgba(29,95,212,0.16)"
      : "1px solid rgba(130,146,172,0.14)",
    color: primary ? "#164AAE" : "#445C75",
    fontSize: 12,
    fontWeight: 1000,
    whiteSpace: "normal",
  };
}

function cciIconBadge(
  icon: GsnIconName,
  label: React.ReactNode,
  primary = false
): React.ReactNode {
  return (
    <span style={badge(primary)}>
      <span
        aria-hidden="true"
        style={{
          flex: "0 0 auto",
          width: 20,
          height: 20,
          borderRadius: 7,
          display: "inline-grid",
          placeItems: "center",
          color: primary ? "#7A4A00" : "#0B63D1",
          background: "rgba(255,255,255,0.96)",
          border: primary
            ? "1px solid rgba(214,170,69,0.30)"
            : "1px solid rgba(13,95,168,0.14)",
          boxShadow:
            "0 7px 14px rgba(6,24,39,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
        }}
      >
        <GsnLegacyIcon name={icon} size={20} />
      </span>
      <span>{label}</span>
    </span>
  );
}

function labelWithIcon(icon: GsnIconName, label: React.ReactNode): React.ReactNode {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }}>
      <span
        aria-hidden="true"
        style={{
          flex: "0 0 auto",
          width: 22,
          height: 22,
          borderRadius: 8,
          display: "inline-grid",
          placeItems: "center",
          color: "#0B63D1",
          background: "rgba(255,255,255,0.96)",
          border: "1px solid rgba(13,95,168,0.14)",
          boxShadow:
            "0 8px 16px rgba(6,24,39,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
        }}
      >
        <GsnLegacyIcon name={icon} size={22} />
      </span>
      <span>{label}</span>
    </span>
  );
}

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function positiveNumber(value: unknown): number {
  if (value === null || value === undefined || safeStr(value) === "") return 0;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

function formatReadingScore(rawScore: unknown, scoreNum: number | null): string {
  if (
    rawScore === null ||
    rawScore === undefined ||
    safeStr(rawScore) === "" ||
    scoreNum === null ||
    Number.isNaN(scoreNum)
  ) {
    return "-";
  }

  if (Number.isInteger(scoreNum)) return String(scoreNum);
  return scoreNum.toFixed(2).replace(/\.?0+$/, "");
}

function getCciState(me: any, trustSlip?: any, trust?: any): ReadingState {
  const rawScore = firstNonEmpty(
    me?.cci_score,
    me?.cross_client_integrity_score,
    me?.cross_clan_integrity_score,
    me?.cross_community_integrity_score,
    trustSlip?.cci_score,
    trustSlip?.cross_client_integrity_score,
    trustSlip?.cross_clan_integrity_score,
    trustSlip?.cross_community_integrity_score,
    trust?.cci_score,
    trust?.cross_client_integrity_score,
    trust?.cross_clan_integrity_score,
    trust?.cross_community_integrity_score,
    trust?.cci?.score,
    trust?.community_cci
  );

  const rawClass = firstNonEmpty(
    me?.cci_class,
    me?.cci_band,
    me?.cross_client_integrity_class,
    me?.cross_client_integrity_band,
    me?.cross_clan_integrity_class,
    me?.cross_clan_integrity_band,
    me?.cross_community_integrity_class,
    me?.cross_community_integrity_band,
    trustSlip?.cci_class,
    trustSlip?.cci_band,
    trustSlip?.cross_client_integrity_class,
    trustSlip?.cross_client_integrity_band,
    trustSlip?.cross_clan_integrity_class,
    trustSlip?.cross_clan_integrity_band,
    trustSlip?.cross_community_integrity_class,
    trustSlip?.cross_community_integrity_band,
    trust?.cci_class,
    trust?.cci_band,
    trust?.cross_client_integrity_class,
    trust?.cross_client_integrity_band,
    trust?.cross_clan_integrity_class,
    trust?.cross_clan_integrity_band,
    trust?.cross_community_integrity_class,
    trust?.cross_community_integrity_band,
    trust?.cci?.class,
    trust?.cci?.band
  );

  const rawWhy = firstNonEmpty(
    me?.cci_reason,
    me?.cross_client_integrity_reason,
    me?.cross_clan_integrity_reason,
    me?.cross_community_integrity_reason,
    trustSlip?.cci_reason,
    trustSlip?.cci_explainer,
    trustSlip?.cross_client_integrity_reason,
    trustSlip?.cross_clan_integrity_reason,
    trustSlip?.cross_community_integrity_reason,
    trust?.cci_reason,
    trust?.cci_explainer,
    trust?.cross_client_integrity_reason,
    trust?.cross_clan_integrity_reason,
    trust?.cross_community_integrity_reason,
    trust?.cci?.reason,
    trust?.cci?.explainer
  );

  const scoreNum =
    rawScore === null || rawScore === undefined || String(rawScore).trim() === ""
      ? null
      : Number(rawScore);

  const classText = String(rawClass || "").trim().toUpperCase();

  if (classText) {
    if (classText === "A" || classText === "A+") {
      return {
        classText,
        scoreText: formatReadingScore(rawScore, scoreNum),
        tone: "green",
        statusText: "Healthy across visible communities",
        whyText: String(rawWhy || "Your trust position is steady right now."),
      };
    }
    if (classText === "B") {
      return {
        classText,
        scoreText: formatReadingScore(rawScore, scoreNum),
        tone: "green",
        statusText: "Stable and growing",
        whyText: String(rawWhy || "Keep consistent positive actions across communities."),
      };
    }
    if (classText === "C") {
      return {
        classText,
        scoreText: formatReadingScore(rawScore, scoreNum),
        tone: "yellow",
        statusText: "Needs attention",
        whyText: String(rawWhy || "A few better actions can improve your standing."),
      };
    }
    return {
      classText,
      scoreText: formatReadingScore(rawScore, scoreNum),
      tone: "red",
      statusText: "At risk",
      whyText: String(rawWhy || "Your trust position needs action and repair."),
    };
  }

  if (scoreNum !== null && !Number.isNaN(scoreNum)) {
    if (scoreNum >= 75) {
      return {
        classText: "A",
        scoreText: formatReadingScore(rawScore, scoreNum),
        tone: "green",
        statusText: "Healthy across visible communities",
        whyText: String(rawWhy || "Your trust position is looking strong."),
      };
    }
    if (scoreNum >= 55) {
      return {
        classText: "B",
        scoreText: formatReadingScore(rawScore, scoreNum),
        tone: "green",
        statusText: "Stable and growing",
        whyText: String(rawWhy || "Keep consistent actions to strengthen your standing."),
      };
    }
    if (scoreNum >= 35) {
      return {
        classText: "C",
        scoreText: formatReadingScore(rawScore, scoreNum),
        tone: "yellow",
        statusText: "Needs attention",
        whyText: String(rawWhy || "Some recent actions may have reduced your trust strength."),
      };
    }
    return {
      classText: "D",
      scoreText: formatReadingScore(rawScore, scoreNum),
      tone: "red",
      statusText: "At risk",
      whyText: String(rawWhy || "Your trust position needs urgent improvement."),
    };
  }

  return {
    classText: "Not shown yet",
    scoreText: "-",
    tone: "neutral",
    statusText: "No wider consistency reading yet",
    whyText: "Complete identity and community activity first. The fuller cross-community reading will appear here when it is available.",
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

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string
): string {
  return String(resolveCtaTarget(intent, { communityId, debugId }).to);
}

export default function CCIReadingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeSelectedClanId = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return positiveNumber(
      query.get("community") ||
        query.get("clan_id") ||
        query.get("community_id")
    );
  }, [location.search]);
  const selectedClanId = routeSelectedClanId || Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "cci-reading.nav.dashboard"),
      identity: routeTarget("cci", selectedClanId, "cci-reading.identity"),
      trust: routeTarget("trust", selectedClanId, "cci-reading.trust"),
    }),
    [selectedClanId]
  );
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [trustSlip, setTrustSlip] = useState<any>(null);
  const [trustExplanation, setTrustExplanation] = useState<any>(null);

  useEffect(() => {
    if (routeSelectedClanId > 0) {
      setSelectedClanId(routeSelectedClanId);
    }
  }, [routeSelectedClanId]);

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
        const [meRes, trustSlipRes, trustExplanationRes] = await Promise.all([
          getMe().catch(() => null),
          getMyTrustSlip().catch(() => null),
          selectedClanId
            ? getClanTrustScoreExplained({
                clan_id: selectedClanId,
                limit: 8,
              }).catch(() => null)
            : Promise.resolve(null),
        ]);
        if (!alive) return;
        setMe(meRes || null);
        setTrustSlip(trustSlipRes || null);
        setTrustExplanation(trustExplanationRes || null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedClanId]);

  const cci = useMemo(
    () => getCciState(me, trustSlip, trustExplanation),
    [me, trustSlip, trustExplanation]
  );
  const cciPosture = useMemo(
    () => getContextualEvidencePosture(cci.scoreText, cci.classText),
    [cci.classText, cci.scoreText]
  );
  const tone = useMemo(() => toneMeta(cci.tone), [cci.tone]);
  const guideItems = useMemo(() => buildCciGuideItems(), []);
  const familyItems = useMemo(() => buildTrustDocumentFamilyItems(true), []);
  const trustDocumentUseCases = useMemo(
    () => buildTrustDocumentUseCaseItems(familyItems, "cci"),
    [familyItems]
  );
  const memberLabel = useMemo(() => {
    return String(
      me?.display_name ||
        me?.nickname ||
        me?.name ||
        me?.first_name ||
        me?.email ||
        "Member"
    ).trim();
  }, [me]);

  function handleGuideSelect(item: { to?: string }) {
    if (!item.to) return;
    navigateWithOrigin(navigate, item.to, location);
  }

  function copyCciSnapshot() {
    safeCopy(
      buildCciSnapshot({
        memberLabel,
        classText: cci.classText,
        scoreText: cciPosture.label,
        statusText: cci.statusText,
        whyText: cci.whyText,
      })
    );
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 18 }}>
      <PageTopNav
        sectionLabel="Cross-community consistency"
        title="Cross-community consistency"
        subtitle="Your wider trust reading across communities."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.dashboard}
        backLabel="Dashboard"
      />

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>{labelWithIcon("community", "Cross-community consistency")}</div>
        <div style={{ marginTop: 10, color: "#0B1F33", fontSize: isCompact ? 28 : 34, fontWeight: 900, lineHeight: 1.1 }}>
          Wider trust consistency reading
        </div>
        <div style={{ marginTop: 8, ...helperText(), maxWidth: 760 }}>
          See how steady this member's visible trust signals look beyond one community.
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {cciIconBadge("community", <>Posture {cciPosture.shortLabel}</>, true)}
          {cciIconBadge("search", <>Evidence only</>)}
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
            <div style={sectionLabel()}>{labelWithIcon("community", "Reading")}</div>
            <div style={{ marginTop: 12, color: tone.text, fontWeight: 900, fontSize: 34, lineHeight: 1 }}>
              {cciPosture.label}
            </div>
            <div style={{ marginTop: 10, color: "#475569", fontSize: 14, fontWeight: 800 }}>
              Only descriptive evidence posture is shown.
            </div>
            <div style={{ marginTop: 10, color: "#0B1F33", fontSize: 14, fontWeight: 800, lineHeight: 1.45 }}>
              {cci.statusText}
            </div>
          </div>

          <div style={innerCard("#F8FBFF")}>
            <div style={sectionLabel()}>{labelWithIcon("shield", "Why this reading")}</div>
            <div style={{ marginTop: 10, ...helperText() }}>
              {loading ? "Loading the consistency reading..." : cci.whyText}
            </div>
            <CardActionRow minHeight={isCompact ? 52 : 48} style={{ marginTop: isCompact ? 60 : 16 }}>
              <StableCtaLink
                to={routes.identity}
                stableHeight={isCompact ? 52 : 48}
                fullWidth={isCompact}
                minWidth={isCompact ? undefined : 210}
                debugId="cci-reading.identity"
              >
                {labelWithIcon("id", "Open Identity & Integrity")}
              </StableCtaLink>
              <StableCtaLink
                to={routes.trust}
                stableHeight={isCompact ? 52 : 48}
                fullWidth={isCompact}
                minWidth={isCompact ? undefined : 178}
                debugId="cci-reading.trust"
              >
                {labelWithIcon("evidence", "Open Trust Passport")}
              </StableCtaLink>
              <SecondaryButton
                onClick={copyCciSnapshot}
                stableHeight={isCompact ? 52 : 48}
                fullWidth={isCompact}
                minWidth={isCompact ? undefined : 216}
                debugId="cci-reading.copy-snapshot"
              >
                {labelWithIcon("copy", "Copy snapshot")}
              </SecondaryButton>
            </CardActionRow>
          </div>
        </div>
      </section>

      <NextActionGuide
        storageKey="gmfn.cciReading.nextActionGuide.v1"
        compact={isCompact}
        items={guideItems}
        intro="Choose the next trust step in plain language. GSN will point you to the right evidence surface."
        onSelect={handleGuideSelect}
      />

      <TrustDocumentFamilyMap
        compact={isCompact}
        items={familyItems}
        title="Where consistency sits inside the trust-document family"
        intro="Use this map to decide whether you need this narrow reading, a fuller trust story, a portable record, or public verification."
      />

      <TrustDocumentUseCases
        compact={isCompact}
        items={trustDocumentUseCases}
        title="Which trust question should stay here?"
        intro="Stay here for the wider consistency read. Move to another trust surface when someone needs identity, evidence, or public verification."
      />

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>{labelWithIcon("navigation", "What to do with this reading")}</div>
        <div
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={innerCard("#F8FBFF")}>
            <div style={{ color: "#0B1F33", fontWeight: 900, fontSize: 15 }}>
              Use this for the wider read
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Use it when someone needs a quick view of trust consistency
              across communities.
            </div>
          </div>

          <div style={innerCard("#FFFFFF")}>
            <div style={{ color: "#0B1F33", fontWeight: 900, fontSize: 15 }}>
              Do not stop here if you need evidence
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              For a portable document or public verify code, open TrustSlip or
              Trust Passport.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
