import { useEffect, useMemo, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import { CardActionRow, StableCtaLink } from "../components/StableButton";
import { getSelectedClanId } from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";

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
    setError("Leaderboard disabled in this build.");
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
        <PageTopNav
          sectionLabel="Trust Leaderboard"
          title="Trust Leaderboard"
          subtitle="This page is reserved for cross-user trust ranking when that surface is enabled."
        />
        <section style={pageCard("#FFFFFF")}>Loading trust leaderboard...</section>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{ maxWidth: 980, margin: "0 auto", padding: 16, display: "grid", gap: 18 }}
      >
        <PageTopNav
          sectionLabel="Trust Leaderboard"
          title="Trust Leaderboard"
          subtitle="This page is reserved for cross-user trust ranking when that surface is enabled."
        />
        <section style={pageCard("#FFFFFF")}>
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
            Leaderboard is disabled in this build.
          </div>
          <div style={{ marginTop: 12, ...helperText(), maxWidth: 760 }}>
            GSN is keeping trust evidence readable through Trust, TrustSlip, Trust
            Timeline, and Trust Passport instead of pushing a public ranking
            surface right now.
          </div>
          <CardActionRow style={{ marginTop: 16 }}>
            <StableCtaLink to={routes.trust} debugId="trust-leaderboard.trust">
              Open Trust Passport
            </StableCtaLink>
            <StableCtaLink to={routes.trustSlip} debugId="trust-leaderboard.trust-slip">
              Open TrustSlip
            </StableCtaLink>
            <StableCtaLink
              to={routes.openTrust}
              debugId="trust-leaderboard.open-trust"
            >
              Open local trust reading
            </StableCtaLink>
          </CardActionRow>
          <div style={{ marginTop: 16, ...helperText(), color: "#991B1B" }}>
            {error}
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
        sectionLabel="Trust Leaderboard"
        title="Trust Leaderboard"
        subtitle="Compare visible trust ranking only when this surface is enabled for the build."
      />

      {items.length === 0 ? (
        <section style={pageCard("#FFFFFF")}>No trust data available yet.</section>
      ) : (
        <section style={pageCard("#FFFFFF")}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>User</th>
                <th>Consistency score</th>
                <th>Reliability</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.user_id}>
                  <td>{row.email}</td>
                  <td>{row.cci_score}</td>
                  <td>{row.reliability_score ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
