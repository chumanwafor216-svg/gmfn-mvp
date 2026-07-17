import { useEffect, useMemo, useState } from "react";
import GSNBrandMark from "../components/GSNBrandMark";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import PageTopNav from "../components/PageTopNav";
import { CardActionRow, StableCtaLink } from "../components/StableButton";
import { getSelectedClanId } from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import { getContextualEvidencePosture } from "../lib/trustBandLanguage";

type TrustRow = {
  user_id: number;
  email: string;
  cci_score: number;
  reliability_score?: number;
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

function watermarkStyle(): React.CSSProperties {
  return {
    position: "absolute",
    right: -10,
    top: -22,
    opacity: 0.055,
    pointerEvents: "none",
  };
}

function trustLeaderboardActionText(
  name: GsnIconName,
  label: React.ReactNode,
  size = 22
) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minWidth: 0,
        whiteSpace: "nowrap",
      }}
    >
      <GsnLegacyIcon name={name} size={size} />
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </span>
    </span>
  );
}

function trustLeaderboardStatusIcon(name: GsnIconName, label: string) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        width: "fit-content",
        maxWidth: "100%",
        borderRadius: 999,
        border: "1px solid #FDE68A",
        background: "#FFFBEB",
        padding: "6px 10px",
        color: "#92400E",
        fontSize: 12,
        fontWeight: 1000,
        whiteSpace: "nowrap",
      }}
    >
      <GsnLegacyIcon name={name} size={20} />
      {label}
    </span>
  );
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

export default function TrustLeaderboardPage() {
  const [items, setItems] = useState<TrustRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      trust: routeTarget("trust", selectedClanId, "trust-leaderboard.route.trust"),
      trustSlip: routeTarget("trustSlip", selectedClanId, "trust-leaderboard.route.trust-slip"),
      openTrust: routeTarget("openTrust", selectedClanId, "trust-leaderboard.route.open-trust"),
    }),
    [selectedClanId]
  );

  useEffect(() => {
    setItems([]);
    setError("Trust evidence directory is disabled in this build.");
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
        <PageTopNav
          sectionLabel="Trust Evidence"
          title="Trust Evidence Directory"
          subtitle="This page is reserved for community-scoped trust evidence views when that surface is enabled."
        />
        <section style={pageCard("#FFFFFF")}>
          {trustLeaderboardActionText("refresh", "Loading trust evidence", 24)}
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{ maxWidth: 980, margin: "0 auto", padding: 16, display: "grid", gap: 18 }}
      >
        <PageTopNav
          sectionLabel="Trust Evidence"
          title="Trust Evidence Directory"
          subtitle="This page is reserved for community-scoped trust evidence views when that surface is enabled."
        />
        <section style={pageCard("#FFFFFF")}>
          <div style={watermarkStyle()} aria-hidden="true">
            <GSNBrandMark width={128} height={160} />
          </div>
          <div style={{ position: "relative", display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={sectionLabel()}>Current status</div>
                <div
                  style={{
                    marginTop: 10,
                    color: "#0B1F33",
                    fontSize: 30,
                    fontWeight: 1000,
                    lineHeight: 1.08,
                  }}
                >
                  Trust evidence directory is disabled in this build.
                </div>
              </div>
              {trustLeaderboardStatusIcon("lock", "Not public")}
            </div>
            <div style={{ ...helperText(), maxWidth: 760 }}>
              GSN is keeping trust evidence readable through Trust, TrustSlip, Trust
              Timeline, and Trust Passport instead of pushing a public list
              surface right now.
            </div>
            <CardActionRow>
              <StableCtaLink
                to={routes.trust}
                debugId="trust-leaderboard.trust"
                stableHeight={52}
              >
                {trustLeaderboardActionText("shield", "Trust Passport", 20)}
              </StableCtaLink>
              <StableCtaLink
                to={routes.trustSlip}
                debugId="trust-leaderboard.trust-slip"
                stableHeight={52}
              >
                {trustLeaderboardActionText("document", "TrustSlip", 20)}
              </StableCtaLink>
              <StableCtaLink
                to={routes.openTrust}
                debugId="trust-leaderboard.open-trust"
                stableHeight={52}
              >
                {trustLeaderboardActionText("eye", "Local reading", 20)}
              </StableCtaLink>
            </CardActionRow>
            <div style={{ ...helperText(), color: "#991B1B" }}>{error}</div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      style={{ maxWidth: 980, margin: "0 auto", padding: 16, display: "grid", gap: 18 }}
    >
      <PageTopNav
        sectionLabel="Trust Evidence"
        title="Trust Evidence Directory"
        subtitle="Open community-scoped evidence views only when this surface is enabled for the build."
      />

      {items.length === 0 ? (
        <section style={pageCard("#FFFFFF")}>
          {trustLeaderboardActionText("document", "No trust evidence available yet", 24)}
        </section>
      ) : (
        <section style={pageCard("#FFFFFF")}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>User</th>
                <th>Consistency posture</th>
                <th>Evidence status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.user_id}>
                  <td>{row.email}</td>
                  <td>{getContextualEvidencePosture(row.cci_score).label}</td>
                  <td>
                    {row.reliability_score === null || row.reliability_score === undefined
                      ? "Not shown"
                      : getContextualEvidencePosture(row.reliability_score).shortLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
