import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NextActionGuide from "../components/NextActionGuide";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import TrustDocumentFamilyMap from "../components/TrustDocumentFamilyMap";
import TrustDocumentUseCases from "../components/TrustDocumentUseCases";
import { getMe, safeCopy } from "../lib/api";
import { navigateWithOrigin } from "../lib/nav";
import { buildTrustDocumentFamilyItems } from "../lib/trustDocumentFamilyMap";
import { buildTrustDocumentUseCaseItems } from "../lib/trustDocumentUseCases";
import { buildCciGuideItems } from "../lib/trustDocumentGuide";
import { buildCciSnapshot } from "../lib/trustDocumentSnapshots";

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
    letterSpacing: 0.45,
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

function stableTapStyle(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 20,
    isolation: "isolate",
    pointerEvents: "auto",
    boxSizing: "border-box",
    appearance: "none",
    WebkitAppearance: "none",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    transform: "none",
    outlineOffset: 4,
    lineHeight: 1.2,
  };
}

function actionBtn(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    padding: "12px 16px",
    borderRadius: 15,
    border: primary
      ? "1px solid rgba(18,77,176,0.22)"
      : "1px solid rgba(121,149,190,0.18)",
    background: primary
      ? "linear-gradient(180deg, #2A6AF3 0%, #134FBF 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #F2F7FF 100%)",
    color: primary ? "#FFFFFF" : "#0B1F33",
    boxShadow: primary
      ? "0 14px 28px rgba(19,79,191,0.22)"
      : "0 12px 26px rgba(15,23,42,0.07)",
    fontWeight: 900,
    fontSize: 14,
    textDecoration: "none",
    whiteSpace: "normal",
    ...stableTapStyle(),
  };
}

function getCciState(me: any): ReadingState {
  const rawScore =
    me?.cci_score ??
    me?.cross_client_integrity_score ??
    me?.cross_clan_integrity_score ??
    me?.cross_community_integrity_score ??
    null;

  const rawClass =
    me?.cci_class ??
    me?.cross_client_integrity_class ??
    me?.cross_clan_integrity_class ??
    me?.cross_community_integrity_class ??
    "";

  const rawWhy =
    me?.cci_reason ??
    me?.cross_client_integrity_reason ??
    me?.cross_clan_integrity_reason ??
    me?.cross_community_integrity_reason ??
    "";

  const scoreNum =
    rawScore === null || rawScore === undefined || String(rawScore).trim() === ""
      ? null
      : Number(rawScore);

  const classText = String(rawClass || "").trim().toUpperCase();

  if (classText) {
    if (classText === "A" || classText === "A+") {
      return {
        classText,
        scoreText: scoreNum === null || Number.isNaN(scoreNum) ? "-" : String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Healthy across visible communities",
        whyText: String(rawWhy || "Your trust position is steady right now."),
      };
    }
    if (classText === "B") {
      return {
        classText,
        scoreText: scoreNum === null || Number.isNaN(scoreNum) ? "-" : String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Stable and growing",
        whyText: String(rawWhy || "Keep consistent positive actions across communities."),
      };
    }
    if (classText === "C") {
      return {
        classText,
        scoreText: scoreNum === null || Number.isNaN(scoreNum) ? "-" : String(Math.round(scoreNum)),
        tone: "yellow",
        statusText: "Needs attention",
        whyText: String(rawWhy || "A few better actions can improve your standing."),
      };
    }
    return {
      classText,
      scoreText: scoreNum === null || Number.isNaN(scoreNum) ? "-" : String(Math.round(scoreNum)),
      tone: "red",
      statusText: "At risk",
      whyText: String(rawWhy || "Your trust position needs action and repair."),
    };
  }

  if (scoreNum !== null && !Number.isNaN(scoreNum)) {
    if (scoreNum >= 75) {
      return {
        classText: "A",
        scoreText: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Healthy across visible communities",
        whyText: String(rawWhy || "Your trust position is looking strong."),
      };
    }
    if (scoreNum >= 55) {
      return {
        classText: "B",
        scoreText: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Stable and growing",
        whyText: String(rawWhy || "Keep consistent actions to strengthen your standing."),
      };
    }
    if (scoreNum >= 35) {
      return {
        classText: "C",
        scoreText: String(Math.round(scoreNum)),
        tone: "yellow",
        statusText: "Needs attention",
        whyText: String(rawWhy || "Some recent actions may have reduced your trust strength."),
      };
    }
    return {
      classText: "D",
      scoreText: String(Math.round(scoreNum)),
      tone: "red",
      statusText: "At risk",
      whyText: String(rawWhy || "Your trust position needs urgent improvement."),
    };
  }

  return {
    classText: "Pending",
    scoreText: "-",
    tone: "neutral",
    statusText: "No CCI reading yet",
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

export default function CCIReadingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);

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
        const meRes = await getMe().catch(() => null);
        if (!alive) return;
        setMe(meRes || null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const cci = useMemo(() => getCciState(me), [me]);
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
        scoreText: cci.scoreText,
        statusText: cci.statusText,
        whyText: cci.whyText,
      })
    );
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 18 }}>
      <PageTopNav
        sectionLabel="CCI"
        title="CCI"
        subtitle="Your cross-community integrity reading without opening the full Trust Passport."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
        backLabel="Dashboard"
      />

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>CCI</div>
        <div style={{ marginTop: 10, color: "#0B1F33", fontSize: isCompact ? 28 : 34, fontWeight: 900, lineHeight: 1.1 }}>
          Cross-community integrity reading
        </div>
        <div style={{ marginTop: 8, ...helperText(), maxWidth: 760 }}>
          Use this page when you want the CCI reading directly without the wider trust passport explanation.
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={badge(true)}>Class {cci.classText}</span>
          <span style={badge(false)}>Score {cci.scoreText}</span>
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
              Class {cci.classText}
            </div>
            <div style={{ marginTop: 10, color: "#475569", fontSize: 14, fontWeight: 800 }}>
              Score {cci.scoreText}
            </div>
            <div style={{ marginTop: 10, color: "#0B1F33", fontSize: 14, fontWeight: 800, lineHeight: 1.45 }}>
              {cci.statusText}
            </div>
          </div>

          <div style={innerCard("#F8FBFF")}>
            <div style={sectionLabel()}>Why this reading</div>
            <div style={{ marginTop: 10, ...helperText() }}>
              {loading ? "Loading the CCI reading..." : cci.whyText}
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <OriginLink to="/app/identity" style={actionBtn(false)}>
                Open Identity & Integrity
              </OriginLink>
              <OriginLink to="/app/trust" style={actionBtn(false)}>
                Open Trust Passport
              </OriginLink>
              <button type="button" onClick={copyCciSnapshot} style={actionBtn(false)}>
                Copy CCI snapshot
              </button>
            </div>
          </div>
        </div>
      </section>

      <NextActionGuide
        storageKey="gmfn.cciReading.nextActionGuide.v1"
        compact={isCompact}
        items={guideItems}
        intro="Say what you want next in plain words like verify identity, explain my trust, or open the portable proof. GSN will point you to the closest trust document surface."
        onSelect={handleGuideSelect}
      />

      <TrustDocumentFamilyMap
        compact={isCompact}
        items={familyItems}
        title="Where CCI sits inside the trust-document family"
        intro="CCI is only one reading inside the wider trust system. Use this map when you need to understand whether to stay with the narrow integrity read, move into the fuller personal trust story, carry portable proof, or confirm public validity."
      />

      <TrustDocumentUseCases
        compact={isCompact}
        items={trustDocumentUseCases}
        title="Which trust question should stay with CCI?"
        intro="Stay with CCI when the question is the narrower cross-community integrity read. Move out when someone needs the stable identity anchor, the fuller trust story, portable proof, or a public validity check."
      />

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>What to do with this reading</div>
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
              Use CCI for the wider read
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This page helps you understand how people outside your immediate
              community may read your visible trust behaviour right now.
            </div>
          </div>

          <div style={innerCard("#FFFFFF")}>
            <div style={{ color: "#0B1F33", fontWeight: 900, fontSize: 15 }}>
              Do not stop here if you need proof
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              If someone needs a portable trust document or a public verify
              code, continue into TrustSlip or Trust Passport instead of using
              the CCI page alone.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
