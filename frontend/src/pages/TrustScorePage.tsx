import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  getMe,
  getMyTrustSlip,
  getSelectedClanId,
  getTrustScoreExplained,
} from "../lib/api";

type Tone = "green" | "yellow" | "red" | "neutral";

type TrustState = {
  scoreText: string;
  bandText: string;
  tone: Tone;
  heading: string;
  whyText: string;
  scopeText: string;
};

type CciState = {
  classText: string;
  scoreText: string;
  tone: Tone;
  statusText: string;
  whyText: string;
};

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 14px 34px rgba(15,23,42,0.045), 0 2px 8px rgba(15,23,42,0.02)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
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

function primaryBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "none",
    background: "#0B63D1",
    color: "#FFFFFF",
    fontWeight: 900,
    fontSize: 14,
    textDecoration: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textDecoration: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
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

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
}

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function numberOrNull(...values: any[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || String(value).trim() === "") {
      continue;
    }

    const num = Number(value);
    if (!Number.isNaN(num)) return num;
  }

  return null;
}

function toStringArray(...values: any[]): string[] {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean);
    }
  }

  return [];
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";

  return String(raw || "").trim().replace(/\/+$/, "");
}

function apiOrigin(): string {
  const base = apiBase();

  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      const u = new URL(base);
      return `${u.protocol}//${u.host}`;
    } catch {
      return "http://127.0.0.1:8012";
    }
  }

  return "http://127.0.0.1:8012";
}

function toneStyles(tone: Tone) {
  if (tone === "green") {
    return {
      bg: "#F3FBF5",
      border: "1px solid rgba(34,197,94,0.16)",
      text: "#166534",
      soft: "rgba(22,101,52,0.08)",
    };
  }

  if (tone === "yellow") {
    return {
      bg: "#FFFBEF",
      border: "1px solid rgba(245,158,11,0.16)",
      text: "#92400E",
      soft: "rgba(146,64,14,0.08)",
    };
  }

  if (tone === "red") {
    return {
      bg: "#FFF5F5",
      border: "1px solid rgba(239,68,68,0.16)",
      text: "#991B1B",
      soft: "rgba(153,27,27,0.08)",
    };
  }

  return {
    bg: "#F8FAFC",
    border: "1px solid rgba(148,163,184,0.16)",
    text: "#334155",
    soft: "rgba(51,65,85,0.07)",
  };
}

function getCciState(me: any): CciState {
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

  const scoreNum = numberOrNull(rawScore);
  const classText = safeStr(rawClass).toUpperCase();

  if (classText) {
    if (classText === "A" || classText === "A+") {
      return {
        classText,
        scoreText: scoreNum === null ? "—" : String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Healthy across your visible communities",
        whyText: safeStr(rawWhy || "Your cross-community trust position is steady right now."),
      };
    }

    if (classText === "B") {
      return {
        classText,
        scoreText: scoreNum === null ? "—" : String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Stable and growing",
        whyText: safeStr(
          rawWhy || "Keep consistent positive actions across communities."
        ),
      };
    }

    if (classText === "C") {
      return {
        classText,
        scoreText: scoreNum === null ? "—" : String(Math.round(scoreNum)),
        tone: "yellow",
        statusText: "Needs attention",
        whyText: safeStr(
          rawWhy || "A few better actions can improve your standing."
        ),
      };
    }

    return {
      classText,
      scoreText: scoreNum === null ? "—" : String(Math.round(scoreNum)),
      tone: "red",
      statusText: "At risk",
      whyText: safeStr(
        rawWhy || "Your cross-community trust position needs action and repair."
      ),
    };
  }

  if (scoreNum !== null) {
    if (scoreNum >= 75) {
      return {
        classText: "A",
        scoreText: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Healthy across your visible communities",
        whyText: safeStr(rawWhy || "Your cross-community trust position is looking strong."),
      };
    }

    if (scoreNum >= 55) {
      return {
        classText: "B",
        scoreText: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Stable and growing",
        whyText: safeStr(
          rawWhy || "Keep consistent actions to strengthen your standing."
        ),
      };
    }

    if (scoreNum >= 35) {
      return {
        classText: "C",
        scoreText: String(Math.round(scoreNum)),
        tone: "yellow",
        statusText: "Needs attention",
        whyText: safeStr(
          rawWhy || "Some recent actions may have reduced your trust strength."
        ),
      };
    }

    return {
      classText: "D",
      scoreText: String(Math.round(scoreNum)),
      tone: "red",
      statusText: "At risk",
      whyText: safeStr(rawWhy || "Your cross-community trust position needs urgent improvement."),
    };
  }

  return {
    classText: "Pending",
    scoreText: "—",
    tone: "neutral",
    statusText: "Cross-community reading is being prepared",
    whyText: "A fuller cross-community explanation will appear when available.",
  };
}

function deriveBandFromScore(scoreNum: number | null): string {
  if (scoreNum === null) return "Pending";
  if (scoreNum >= 75) return "Strong";
  if (scoreNum >= 55) return "Steady";
  if (scoreNum >= 35) return "Watch";
  return "At risk";
}

function getOpenTrustState(
  explained: any,
  me: any,
  selectedClanId: number
): TrustState {
  const data = explained?.current ?? explained?.community ?? explained ?? {};

  const scoreNum = numberOrNull(
    data?.open_trust_score,
    data?.community_score,
    data?.trust_score,
    data?.score,
    me?.open_trust_score,
    me?.current_community_trust_score,
    me?.trust_score
  );

  const rawBand = safeStr(
    data?.open_trust_band ||
      data?.community_band ||
      data?.trust_band ||
      data?.band ||
      data?.class
  );

  const bandText = rawBand || deriveBandFromScore(scoreNum);

  const whyText = safeStr(
    data?.open_trust_reason ||
      data?.community_reason ||
      data?.trust_reason ||
      data?.reason ||
      data?.summary ||
      data?.explanation ||
      "This reading reflects how your identity is currently standing inside the community you are working in right now."
  );

  const communityName = safeStr(
    data?.community_name || data?.clan_name || data?.selected_community_name
  );

  const scopeText = communityName
    ? `This reading reflects your immediate standing in ${communityName}.`
    : selectedClanId
    ? `This reading reflects your immediate standing in the currently selected community (Community ${selectedClanId}).`
    : "Open Trust reflects your immediate standing in the currently selected community. Select a community to make this reading more specific.";

  if (scoreNum !== null) {
    if (scoreNum >= 75) {
      return {
        scoreText: String(Math.round(scoreNum)),
        bandText,
        tone: "green",
        heading: "Healthy in your current community",
        whyText,
        scopeText,
      };
    }

    if (scoreNum >= 55) {
      return {
        scoreText: String(Math.round(scoreNum)),
        bandText,
        tone: "green",
        heading: "Stable in your current community",
        whyText,
        scopeText,
      };
    }

    if (scoreNum >= 35) {
      return {
        scoreText: String(Math.round(scoreNum)),
        bandText,
        tone: "yellow",
        heading: "Needs attention in your current community",
        whyText,
        scopeText,
      };
    }

    return {
      scoreText: String(Math.round(scoreNum)),
      bandText,
      tone: "red",
      heading: "At risk in your current community",
      whyText,
      scopeText,
    };
  }

  return {
    scoreText: "—",
    bandText: bandText || "Pending",
    tone: "neutral",
    heading: "Community trust reading is being prepared",
    whyText,
    scopeText,
  };
}

export default function TrustScorePage() {
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [me, setMe] = useState<any>(null);
  const [trustSlip, setTrustSlip] = useState<any>(null);
  const [trustExplained, setTrustExplained] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    (async () => {
      setLoading(true);
      try {
        const [meRes, slipRes, explainedRes] = await Promise.all([
          getMe().catch(() => null),
          getMyTrustSlip().catch(() => null),
          getTrustScoreExplained().catch(() => null),
        ]);

        setMe(meRes);
        setTrustSlip(slipRes);
        setTrustExplained(explainedRes);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cci = useMemo(() => getCciState(me), [me]);
  const cciTone = useMemo(() => toneStyles(cci.tone), [cci.tone]);

  const openTrust = useMemo(
    () => getOpenTrustState(trustExplained, me, selectedClanId),
    [trustExplained, me, selectedClanId]
  );
  const openTrustTone = useMemo(
    () => toneStyles(openTrust.tone),
    [openTrust.tone]
  );

  const trustSlipCode = safeStr(trustSlip?.code || "");

  const strengths = useMemo(
    () =>
      toStringArray(
        trustExplained?.strengths,
        trustExplained?.positives,
        trustExplained?.what_is_helping
      ),
    [trustExplained]
  );

  const watchItems = useMemo(
    () =>
      toStringArray(
        trustExplained?.watch_items,
        trustExplained?.risks,
        trustExplained?.what_to_watch
      ),
    [trustExplained]
  );

  const nextSteps = useMemo(
    () =>
      toStringArray(
        trustExplained?.recommendations,
        trustExplained?.next_steps,
        trustExplained?.actions
      ),
    [trustExplained]
  );

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        paddingBottom: 40,
        display: "grid",
        gap: 18,
      }}
    >
      <PageTopNav
        sectionLabel="Trust"
        title="My Trust"
        subtitle="This page separates your immediate community trust from your cross-community integrity reading, so the two do not get mixed together."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
        nextLinks={[
          { label: "TrustSlip", to: "/app/trust-slip" },
          { label: "Community", to: "/app/community" },
          { label: "Notifications", to: "/app/notifications" },
        ]}
        utilityLinks={[
          { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
        ]}
      />

      <section
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <div>
            <div style={sectionLabel()}>How to read this page</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.12,
              }}
            >
              Open Trust is not the same thing as CCI.
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#5F7287",
                fontSize: 15,
                lineHeight: 1.82,
                maxWidth: 820,
              }}
            >
              Open Trust reflects your immediate standing inside the community
              you are working in right now. CCI, or cross-community integrity,
              reflects your behaviour across visible communities. They should be
              read together, but they should not be merged into one score.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>
                {selectedClanId
                  ? `Selected community: ${selectedClanId}`
                  : "No community selected"}
              </span>
              <span style={badge(false)}>
                GMFN ID: {safeStr(me?.gmfn_id || "Pending")}
              </span>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Trust surfaces</div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gap: 10,
              }}
            >
              <div style={innerCard("#F8FBFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                  }}
                >
                  Open Trust
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#5F7287",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  Immediate-community reading for the community you are
                  currently operating in.
                </div>
              </div>

              <div style={innerCard("#F8FBFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                  }}
                >
                  CCI / cross-community integrity
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#5F7287",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  Broader reading of behaviour and consistency across visible
                  communities.
                </div>
              </div>

              <div style={innerCard("#F8FBFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                  }}
                >
                  TrustSlip and QR
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#5F7287",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  Verification surface for sharing and checking the TrustSlip
                  when it is available.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isCompact
            ? "1fr"
            : "minmax(0, 1.05fr) minmax(320px, 0.95fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div
          style={{
            ...pageCard(openTrustTone.bg),
            border: openTrustTone.border,
          }}
        >
          <div style={sectionLabel()}>Open Trust</div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                minWidth: 96,
                minHeight: 96,
                borderRadius: 24,
                background: openTrustTone.soft,
                color: openTrustTone.text,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 34,
                fontWeight: 900,
                border: openTrustTone.border,
              }}
            >
              {openTrust.scoreText}
            </div>

            <div style={{ flex: 1, minWidth: 220 }}>
              <div
                style={{
                  color: openTrustTone.text,
                  fontWeight: 900,
                  fontSize: 22,
                  lineHeight: 1.35,
                }}
              >
                {openTrust.heading}
              </div>

              <div
                style={{
                  marginTop: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 30,
                  borderRadius: 999,
                  padding: "6px 10px",
                  background: "#FFFFFF",
                  border: openTrustTone.border,
                  color: openTrustTone.text,
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                Band: {openTrust.bandText}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              color: openTrustTone.text,
              fontSize: 14,
              lineHeight: 1.8,
            }}
          >
            {openTrust.whyText}
          </div>

          <div
            style={{
              marginTop: 12,
              color: "#5F7287",
              fontSize: 13,
              lineHeight: 1.75,
            }}
          >
            {openTrust.scopeText}
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link to="/app/community" style={primaryBtn()}>
              Open Community Home
            </Link>
            <Link to="/app/notifications" style={secondaryBtn()}>
              Notifications
            </Link>
          </div>
        </div>

        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>TrustSlip and QR</div>

          {trustSlipCode ? (
            <>
              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <img
                  src={`${apiOrigin()}/trust-slips/verify/${encodeURIComponent(
                    trustSlipCode
                  )}/qr.png`}
                  alt="Trust QR"
                  style={{
                    width: 142,
                    height: 142,
                    borderRadius: 16,
                    border: "1px solid rgba(11,31,51,0.10)",
                    background: "#FFFFFF",
                    padding: 6,
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: 12,
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  textAlign: "center",
                }}
              >
                Scan to verify your TrustSlip
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#64748B",
                  fontSize: 13,
                  lineHeight: 1.65,
                  textAlign: "center",
                }}
              >
                Code: {trustSlipCode}
              </div>
            </>
          ) : (
            <div
              style={{
                marginTop: 12,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              Your TrustSlip QR will appear here when available.
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link to="/app/trust-slip" style={primaryBtn()}>
              Open TrustSlip
            </Link>
            <Link to="/app/community" style={secondaryBtn()}>
              Open Trust in community
            </Link>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isCompact
            ? "1fr"
            : "minmax(0, 1fr) minmax(320px, 0.9fr)",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            ...pageCard(cciTone.bg),
            border: cciTone.border,
          }}
        >
          <div style={sectionLabel()}>CCI / cross-community integrity</div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                minWidth: 96,
                minHeight: 96,
                borderRadius: 24,
                background: cciTone.soft,
                color: cciTone.text,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 34,
                fontWeight: 900,
                border: cciTone.border,
              }}
            >
              {cci.classText}
            </div>

            <div style={{ flex: 1, minWidth: 220 }}>
              <div
                style={{
                  color: cciTone.text,
                  fontWeight: 900,
                  fontSize: 22,
                  lineHeight: 1.35,
                }}
              >
                {cci.statusText}
              </div>

              <div
                style={{
                  marginTop: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 30,
                  borderRadius: 999,
                  padding: "6px 10px",
                  background: "#FFFFFF",
                  border: cciTone.border,
                  color: cciTone.text,
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                Score: {cci.scoreText}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              color: cciTone.text,
              fontSize: 14,
              lineHeight: 1.8,
            }}
          >
            {cci.whyText}
          </div>

          <div
            style={{
              marginTop: 12,
              color: "#5F7287",
              fontSize: 13,
              lineHeight: 1.75,
            }}
          >
            CCI reads behaviour across visible communities. It should not be
            mistaken for your immediate-community Open Trust reading.
          </div>
        </div>

        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>The distinction in plain language</div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Open Trust
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.75,
                }}
              >
                How you are standing in the community you are actively working
                in right now.
              </div>
            </div>

            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                CCI
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.75,
                }}
              >
                How your identity is behaving across visible communities more
                broadly.
              </div>
            </div>

            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                TrustSlip and QR
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.75,
                }}
              >
                Verification tools for checking or sharing your trust surface
                when needed.
              </div>
            </div>
          </div>
        </div>
      </section>

      {strengths.length > 0 || watchItems.length > 0 || nextSteps.length > 0 ? (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "repeat(3, minmax(0, 1fr))",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={pageCard("#FFFFFF")}>
            <div style={sectionLabel()}>What is helping</div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {strengths.length > 0 ? (
                strengths.map((item, index) => (
                  <div key={index} style={innerCard("#FCFEFF")}>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontSize: 14,
                        lineHeight: 1.7,
                      }}
                    >
                      {item}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: "#64748B", lineHeight: 1.75 }}>
                  No additional strengths are listed yet.
                </div>
              )}
            </div>
          </div>

          <div style={pageCard("#FFFFFF")}>
            <div style={sectionLabel()}>What to watch</div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {watchItems.length > 0 ? (
                watchItems.map((item, index) => (
                  <div key={index} style={innerCard("#FCFEFF")}>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontSize: 14,
                        lineHeight: 1.7,
                      }}
                    >
                      {item}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: "#64748B", lineHeight: 1.75 }}>
                  No additional watch item is listed yet.
                </div>
              )}
            </div>
          </div>

          <div style={pageCard("#FFFFFF")}>
            <div style={sectionLabel()}>Suggested next steps</div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {nextSteps.length > 0 ? (
                nextSteps.map((item, index) => (
                  <div key={index} style={innerCard("#FCFEFF")}>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontSize: 14,
                        lineHeight: 1.7,
                      }}
                    >
                      {item}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: "#64748B", lineHeight: 1.75 }}>
                  No additional next step is listed yet.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Continue</div>

        <div
          style={{
            marginTop: 10,
            color: "#0B1F33",
            fontWeight: 900,
            fontSize: isCompact ? 24 : 30,
            lineHeight: 1.15,
            maxWidth: 820,
          }}
        >
          Read Open Trust for the current community, read CCI for the broader
          picture, and use TrustSlip when you need verification.
        </div>

        <div
          style={{
            marginTop: 12,
            color: "#5F7287",
            fontSize: 15,
            lineHeight: 1.82,
            maxWidth: 900,
          }}
        >
          The point of this page is clarity. The two readings should stay in the
          right place and should not be mixed together.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link to="/app/trust-slip" style={primaryBtn()}>
            Open TrustSlip
          </Link>
          <Link to="/app/community" style={secondaryBtn()}>
            Open Community Home
          </Link>
          <Link to="/app/notifications" style={secondaryBtn()}>
            Notifications
          </Link>
        </div>

        {loading ? (
          <div
            style={{
              marginTop: 14,
              color: "#64748B",
              fontSize: 13,
            }}
          >
            Refreshing trust data...
          </div>
        ) : null}
      </section>
    </div>
  );
}