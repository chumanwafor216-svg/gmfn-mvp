import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { StableCtaLink } from "../components/StableButton";

import Mark from "../assets/gmfn-mark.svg";
import Wordmark from "../assets/gmfn-wordmark.svg";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function hasActiveSession(): boolean {
  try {
    if (!canUseStorage()) return false;
    return Boolean(String(window.localStorage.getItem("access_token") || "").trim());
  } catch {
    return false;
  }
}

function mergeSearchIntoPath(to: string, currentSearch: string): string {
  const [basePath, baseQueryRaw = ""] = String(to || "").split("?");
  const merged = new URLSearchParams(baseQueryRaw);
  const current = new URLSearchParams(currentSearch);

  current.forEach((value, key) => {
    if (!merged.has(key)) {
      merged.append(key, value);
    }
  });

  const finalQuery = merged.toString();
  return finalQuery ? `${basePath}?${finalQuery}` : basePath;
}

function topPattern(): string {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="320" viewBox="0 0 1600 320">
    <rect width="1600" height="320" fill="#F7FAFD"/>
    <g fill="none" stroke="#C5D7EB" stroke-opacity="0.52" stroke-width="2">
      <path d="M80 160 C180 90, 280 90, 380 160 S580 230, 690 150" />
      <path d="M920 160 C1020 90, 1120 90, 1220 160 S1420 230, 1520 150" />
    </g>
    <g fill="#D6AF47" fill-opacity="0.95">
      <path d="M80 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M180 96 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M280 96 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M380 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M510 205 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M650 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>

      <path d="M920 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M1020 96 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M1120 96 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M1220 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M1350 205 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M1490 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
    </g>
  </svg>`.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function panel(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    padding: 24,
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
  };
}

function actionButton(primary?: boolean): React.CSSProperties {
  return {
    padding: "15px 24px",
    borderRadius: 16,
    border: primary ? "none" : "1px solid #D7E3F0",
    background: primary ? "#1D4ED8" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 1000,
    fontSize: 16,
    cursor: "pointer",
    minWidth: 180,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5B7693",
    fontWeight: 1000,
    letterSpacing: 1,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F768D",
    lineHeight: 1.85,
    fontSize: 14,
  };
}

function FeatureCard(props: { title: string; text: string }) {
  const { title, text } = props;

  return (
    <div style={panel()}>
      <div style={{ fontSize: 14, fontWeight: 1000, color: "#0B1F33" }}>
        {title}
      </div>
      <p style={{ marginTop: 12, marginBottom: 0, ...helperText() }}>{text}</p>
    </div>
  );
}

export default function IntroductionPage() {
  const location = useLocation();
  const pattern = topPattern();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

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
    if (typeof document !== "undefined") {
      document.title = "GSN | Introduction";
    }
  }, []);

  const welcomeTo = useMemo(
    () => mergeSearchIntoPath("/welcome", location.search),
    [location.search]
  );

  const guideTo = useMemo(
    () => mergeSearchIntoPath("/guide", location.search),
    [location.search]
  );

  const commitmentTo = useMemo(
    () => mergeSearchIntoPath("/app/dashboard#focus-commitments", location.search),
    [location.search]
  );

  const loginTo = useMemo(
    () => mergeSearchIntoPath("/login", location.search),
    [location.search]
  );

  const signedIn = useMemo(() => hasActiveSession(), []);

  return (
    <div style={{ minHeight: "100vh", background: "#F8FBFE" }}>
      <div
        style={{
          backgroundImage: `url("${pattern}")`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          borderBottom: "1px solid rgba(11,31,51,0.06)",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px 38px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 22,
              flexWrap: "wrap",
            }}
          >
            <img src={Mark} alt="GSN mark" style={{ width: 36, height: 36 }} />
            <img src={Wordmark} alt="GSN wordmark" style={{ height: 30, width: "auto" }} />
          </div>

          <div style={sectionLabel()}>Introduction</div>

          <h1
            style={{
              marginTop: 12,
              marginBottom: 16,
              fontSize: isCompact ? 34 : 56,
              lineHeight: 1.08,
              color: "#0B1F33",
              fontWeight: 1000,
              maxWidth: 900,
              letterSpacing: -1,
              textShadow: "0 1px 0 rgba(255,255,255,0.85)",
            }}
          >
            A structured trust framework for community-backed support.
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: isCompact ? 18 : 22,
              lineHeight: 1.76,
              color: "#48627C",
              maxWidth: 980,
            }}
          >
            GSN is designed to help communities organise support responsibly,
            make trust visible, and preserve a clear evidence trail around commitments,
            guarantees, and repayment behaviour.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: 24 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 20,
          }}
        >
          <FeatureCard
            title="Community coordination"
            text="Communities can organise support using visible relationships, transparent processes, and shared awareness of current obligations."
          />

          <FeatureCard
            title="Explainable trust growth"
            text="Trust grows gradually through verified completion of commitments, rather than hidden manual scoring or unexplained adjustments."
          />

          <FeatureCard
            title="Portable reliability"
            text="TrustSlip allows reliability to be presented clearly to merchants and partners without claiming to be a bank guarantee."
          />

          <FeatureCard
            title="Commitment Builder"
            text="GSN can also help members turn intentions into steadier follow-through around savings, repayment, business targets, and retirement readiness over time."
          />
        </div>

        <div
          style={{
            marginTop: 28,
            ...panel(),
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1.05fr 0.95fr",
            gap: 24,
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 1000, color: "#0B1F33" }}>
              Continue into the guided public flow
            </div>

            <div style={{ marginTop: 10, ...helperText() }}>
              Continue to the Welcome page. From there, the app will guide one
              decision at a time.
            </div>

            <div
              style={{
                marginTop: 12,
                color: "#5B7693",
                fontSize: 13,
                lineHeight: 1.75,
              }}
            >
              GSN is not only about trust records and support decisions. It also
              helps people build steadier follow-through once they are inside the
              guided flow.
            </div>

            <div
              style={{
                marginTop: 14,
                color: "#7A8D9F",
                fontSize: 13,
                lineHeight: 1.75,
              }}
            >
              Public entry stays structured so you do not have to choose too many
              things at once.
            </div>

            {signedIn ? (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 13,
                  color: "#5B7693",
                  lineHeight: 1.7,
                }}
              >
                Active session detected. Keep using the guided flow here, or
                return to your dashboard.
              </div>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <StableCtaLink
              to={welcomeTo}
              kind="primary"
              debugId="introduction.continue-welcome"
              style={actionButton(true)}
            >
              Continue to Welcome
            </StableCtaLink>

            <StableCtaLink
              to={guideTo}
              debugId="introduction.open-guide"
              style={actionButton(false)}
            >
              Open My GSN and I
            </StableCtaLink>

            <StableCtaLink
              to={commitmentTo}
              debugId="introduction.open-commitment"
              style={actionButton(false)}
            >
              Open Commitment Builder
            </StableCtaLink>

            <StableCtaLink
              to={loginTo}
              debugId="introduction.existing-access"
              style={actionButton(false)}
            >
              Existing access
            </StableCtaLink>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <StableCtaLink
            to={welcomeTo}
            debugId="introduction.footer.welcome"
            stableHeight={52}
            style={secondaryLinkStyle()}
          >
            Welcome
          </StableCtaLink>

          <StableCtaLink
            to={guideTo}
            debugId="introduction.footer.guide"
            stableHeight={52}
            style={secondaryLinkStyle()}
          >
            My GSN and I
          </StableCtaLink>

          <StableCtaLink
            to={commitmentTo}
            debugId="introduction.footer.commitment"
            stableHeight={52}
            style={secondaryLinkStyle()}
          >
            Commitment Builder
          </StableCtaLink>
        </div>
      </div>
    </div>
  );
}

function secondaryLinkStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 900,
    border: "1px solid rgba(11,31,51,0.10)",
    fontSize: 14,
  };
}
