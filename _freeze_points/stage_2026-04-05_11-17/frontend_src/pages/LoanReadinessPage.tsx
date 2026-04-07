import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { getCurrentClan, getSelectedClanId } from "../lib/api";

type CommunityLite = {
  id?: number;
  clan_id?: number;
  name?: string | null;
  marketplace_name?: string | null;
};

type NextStepState = {
  title: string;
  detail: string;
  today: string;
  tomorrow: string;
  ctaLabel: string;
  ctaTo: string;
};

type SignalItem = {
  title: string;
  detail: string;
};

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.10)",
    background: bg,
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
    boxShadow: "0 10px 24px rgba(15,23,42,0.035)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
  };
}

function actionLink(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.12)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4F6B8A",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    padding: "6px 10px",
    borderRadius: 999,
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#475569",
    fontSize: 12,
    fontWeight: 1000,
    whiteSpace: "nowrap",
  };
}

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function getCommunityIdValue(clan: CommunityLite | null | undefined): number {
  return Number(clan?.id || clan?.clan_id || 0);
}

function getCommunityName(clan: CommunityLite | null | undefined): string {
  return safeStr(clan?.marketplace_name || clan?.name || "");
}

function renderCta(step: NextStepState) {
  return (
    <Link to={step.ctaTo} style={actionLink(true)}>
      {step.ctaLabel}
    </Link>
  );
}

const strongerSignals: SignalItem[] = [
  {
    title: "Visible trust position",
    detail:
      "Your trust position is visible, readable, and understandable before you ask for support.",
  },
  {
    title: "TrustSlip is ready when needed",
    detail:
      "Your TrustSlip can be shown when verification is needed, instead of leaving people uncertain.",
  },
  {
    title: "Money path is clear",
    detail:
      "Your pool participation or money movement is clear enough for others to understand.",
  },
  {
    title: "Request is realistic",
    detail:
      "Your support request is specific, realistic, and time-bound instead of vague or overextended.",
  },
  {
    title: "Workbench is prepared",
    detail:
      "Your workbench details are prepared before you ask others to help carry the request.",
  },
];

const weakerSignals: SignalItem[] = [
  {
    title: "Trust position is unclear",
    detail:
      "If your trust position is weak or unclear, support will feel less grounded.",
  },
  {
    title: "Request is vague or rushed",
    detail:
      "A vague, inconsistent, or hurried request weakens readiness quickly.",
  },
  {
    title: "Money path is not understandable",
    detail:
      "If the money path is unclear, people cannot see what exactly they are supporting.",
  },
  {
    title: "Preparation is incomplete",
    detail:
      "Asking before preparing the practical details weakens confidence in the request.",
  },
  {
    title: "Visible behaviour does not support the size",
    detail:
      "If your visible actions do not yet support the size of the request, readiness will feel weak.",
  },
];

const preparationOrder: SignalItem[] = [
  {
    title: "1. Start with trust clarity",
    detail:
      "Read your trust surface first so you know what visible position you are asking from.",
  },
  {
    title: "2. Confirm money path clarity",
    detail:
      "Make sure the pool and money path are understandable before asking for support.",
  },
  {
    title: "3. Define the request clearly",
    detail:
      "State a realistic amount, timing, and purpose instead of asking in a loose way.",
  },
  {
    title: "4. Use guided suggestions",
    detail:
      "Move into Suggestions to see what the current support path is likely to tolerate.",
  },
  {
    title: "5. Use the workbench before asking",
    detail:
      "Use Workbench to prepare the practical support details before the request goes live.",
  },
];

export default function LoanReadinessPage() {
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [community, setCommunity] = useState<CommunityLite | null>(null);

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
      const clanRes = await getCurrentClan().catch(() => null);
      setCommunity(clanRes);
    })();
  }, []);

  const effectiveCommunityId = useMemo(() => {
    return Number(selectedClanId || getCommunityIdValue(community) || 0);
  }, [selectedClanId, community]);

  const effectiveCommunityName = useMemo(() => {
    return (
      getCommunityName(community) ||
      (effectiveCommunityId ? `Community ${effectiveCommunityId}` : "")
    );
  }, [community, effectiveCommunityId]);

  const nextStep = useMemo<NextStepState>(() => {
    if (!effectiveCommunityId) {
      return {
        title: "Choose the community context first",
        detail:
          "Loan readiness belongs inside a real community context. Select the community you want to work in before continuing.",
        today: "Open Community Home and confirm the community you want to work in.",
        tomorrow:
          "A selected community keeps the support path cleaner and easier to understand.",
        ctaLabel: "Open Community Home",
        ctaTo: "/app/community",
      };
    }

    return {
      title: "Move from readiness into guided suggestions",
      detail:
        "Once your trust, money path, and request clarity are in place, the next step is Suggestions, not random asking.",
      today: "Use Suggestions to judge whether the support path is realistic.",
      tomorrow:
        "A guided path is stronger than starting the request from confusion.",
      ctaLabel: "Open Guided Suggestions",
      ctaTo: "/app/loan-suggestions",
    };
  }, [effectiveCommunityId]);

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        sectionLabel="Loan Readiness"
        title="Loan Readiness"
        subtitle="Use this page to judge whether your visible trust, money path, and preparation are strong enough before you ask people for support."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/loans"
        backLabel="Loans & Support"
        nextLinks={[
          { label: "Guided Suggestions", to: "/app/loan-suggestions" },
          { label: "Workbench", to: "/app/loan-workbench" },
          { label: "Marketplace", to: "/app/marketplace" },
        ]}
        utilityLinks={[
          { label: "Trust", to: "/app/trust" },
          { label: "Money In", to: "/app/payment/pool" },
        ]}
      />

      <section
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
          marginTop: 18,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>Readiness guidance</div>

            <div
              style={{
                marginTop: 10,
                fontSize: 30,
                fontWeight: 1000,
                color: "#0B1F33",
                lineHeight: 1.15,
              }}
            >
              Use readiness before you ask people for support
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#475569",
                lineHeight: 1.8,
                maxWidth: 860,
              }}
            >
              Loan readiness is a member-facing guidance surface. It helps you judge
              whether your current visible trust, money flow, and preparation are
              strong enough to make a support request feel realistic.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {effectiveCommunityId ? (
                <span style={badge(true)}>
                  Context: {effectiveCommunityName || `Community ${effectiveCommunityId}`}
                </span>
              ) : (
                <span style={badge(true)}>No community selected</span>
              )}
              <span style={badge(false)}>Readiness is guidance</span>
              <span style={badge(false)}>It does not approve by itself</span>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {renderCta(nextStep)}
              <Link to="/app/loan-workbench" style={actionLink(false)}>
                Open Workbench
              </Link>
              <Link to="/app/trust" style={actionLink(false)}>
                Open Trust
              </Link>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Today</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.65,
                }}
              >
                {nextStep.today}
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Tomorrow</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.65,
                }}
              >
                {nextStep.tomorrow}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          ...pageCard("#FFFDF5"),
          marginTop: 18,
          border: "1px solid rgba(214,175,71,0.25)",
        }}
      >
        <div style={{ fontWeight: 1000, color: "#92400E" }}>
          Live readiness score
        </div>

        <div
          style={{
            marginTop: 8,
            color: "#475569",
            lineHeight: 1.8,
          }}
        >
          A live readiness score is future-only until it is fully wired to
          recorded trust and money events. For now, use the readiness guide
          below instead of relying on a fake number.
        </div>
      </section>

      <section
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
          gap: 18,
        }}
      >
        <div style={pageCard()}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            What improves readiness
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {strongerSignals.map((item, index) => (
              <div key={index} style={innerCard("#F8FBFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    lineHeight: 1.5,
                    fontSize: 15,
                    fontWeight: 900,
                  }}
                >
                  {item.title}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#475569",
                    lineHeight: 1.8,
                    fontSize: 14,
                  }}
                >
                  {item.detail}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={pageCard()}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            What weakens readiness
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {weakerSignals.map((item, index) => (
              <div key={index} style={innerCard("#FFFFFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    lineHeight: 1.5,
                    fontSize: 15,
                    fontWeight: 900,
                  }}
                >
                  {item.title}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#475569",
                    lineHeight: 1.8,
                    fontSize: 14,
                  }}
                >
                  {item.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
          gap: 18,
        }}
      >
        <div style={softCard("#FFFFFF")}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            What this page is for
          </div>

          <div
            style={{
              marginTop: 12,
              color: "#475569",
              lineHeight: 1.9,
            }}
          >
            Readiness does not approve or reject a support request by itself.
            It helps you think realistically before proceeding and reduces weak
            or badly timed requests.
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            What this page is not for
          </div>

          <div
            style={{
              marginTop: 12,
              color: "#475569",
              lineHeight: 1.9,
            }}
          >
            This page is not the place for guessing, rushing, or asking people
            for help before your visible position and practical preparation are
            clear enough.
          </div>
        </div>
      </section>

      <section style={{ ...pageCard(), marginTop: 18 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 1000,
            color: "#0B1F33",
          }}
        >
          Deterministic preparation order
        </div>

        <div
          style={{
            marginTop: 10,
            color: "#475569",
            lineHeight: 1.8,
            maxWidth: 900,
          }}
        >
          Use the same order every time so the support path stays human, structured,
          and clear.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {preparationOrder.map((item, index) => (
            <div key={index} style={innerCard("#FCFEFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontSize: 16,
                  fontWeight: 1000,
                  lineHeight: 1.4,
                }}
              >
                {item.title}
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#475569",
                  fontSize: 14,
                  lineHeight: 1.8,
                }}
              >
                {item.detail}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...pageCard(), marginTop: 18 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 1000,
            color: "#0B1F33",
          }}
        >
          Suggested next step
        </div>

        <div
          style={{
            marginTop: 10,
            color: "#475569",
            lineHeight: 1.8,
          }}
        >
          Improve your visible preparation, then use the guided support tools
          before making the request itself.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {renderCta(nextStep)}
          <Link to="/app/payment/pool" style={actionLink(false)}>
            Money In
          </Link>
          <Link to="/app/loan-workbench" style={actionLink(false)}>
            Open Workbench
          </Link>
          <Link to="/app/community" style={actionLink(false)}>
            Community Home
          </Link>
        </div>
      </section>
    </div>
  );
}