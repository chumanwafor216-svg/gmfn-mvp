import React, { useEffect, useMemo, useState } from "react";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import { getMe } from "../lib/api";

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

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 14px 34px rgba(15,23,42,0.045), 0 2px 8px rgba(15,23,42,0.02)",
    overflow: "hidden",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5D7389",
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
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
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function actionBtn(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    padding: "10px 14px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textDecoration: "none",
    whiteSpace: "normal",
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
        scoreText: scoreNum === null || Number.isNaN(scoreNum) ? "—" : String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Healthy across visible communities",
        whyText: String(rawWhy || "Your trust position is steady right now."),
      };
    }
    if (classText === "B") {
      return {
        classText,
        scoreText: scoreNum === null || Number.isNaN(scoreNum) ? "—" : String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Stable and growing",
        whyText: String(rawWhy || "Keep consistent positive actions across communities."),
      };
    }
    if (classText === "C") {
      return {
        classText,
        scoreText: scoreNum === null || Number.isNaN(scoreNum) ? "—" : String(Math.round(scoreNum)),
        tone: "yellow",
        statusText: "Needs attention",
        whyText: String(rawWhy || "A few better actions can improve your standing."),
      };
    }
    return {
      classText,
      scoreText: scoreNum === null || Number.isNaN(scoreNum) ? "—" : String(Math.round(scoreNum)),
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
    scoreText: "—",
    tone: "neutral",
    statusText: "CCI is being prepared",
    whyText: "A fuller cross-community reading will appear when available.",
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
        nextLinks={[
          { label: "Identity & Integrity", to: "/app/identity" },
          { label: "Trust Passport", to: "/app/trust" },
        ]}
        utilityLinks={[{ label: "TrustSlip", to: "/app/trust-slip" }]}
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
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
