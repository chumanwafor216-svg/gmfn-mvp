import React, { useEffect, useMemo, useState } from "react";
import GSNBrandMark from "../components/GSNBrandMark";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import PageTopNav from "../components/PageTopNav";
import { CardActionRow, StableCtaLink } from "../components/StableButton";
import { getAccessToken, getSelectedClanId } from "../lib/api";
import {
  getGuarantorLeaderboard,
  type GuarantorLeaderboardRow,
} from "../lib/leaderboard";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";

function safeText(value: unknown, fallback = "-"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function pct(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0%";
  return `${Math.round(n * 100)}%`;
}

function pageShell(): React.CSSProperties {
  return {
    maxWidth: 1040,
    margin: "0 auto",
    padding: 16,
    display: "grid",
    gap: 18,
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    position: "relative",
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
    lineHeight: 1.7,
  };
}

function statGrid(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))",
    gap: 10,
  };
}

function statTile(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(122,152,195,0.18)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)",
    padding: 14,
    display: "grid",
    gap: 6,
    minHeight: 92,
    boxShadow: "0 14px 30px rgba(15,23,42,0.05)",
  };
}

function rowCard(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "minmax(170px, 1.25fr) repeat(4, minmax(82px, 0.65fr))",
    gap: 10,
    alignItems: "center",
    borderRadius: 18,
    border: "1px solid rgba(122,152,195,0.16)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)",
    padding: 12,
    boxShadow: "0 12px 24px rgba(15,23,42,0.05)",
    overflow: "hidden",
  };
}

function cellLabel(): React.CSSProperties {
  return {
    color: "#6A7D91",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.22,
    textTransform: "uppercase",
  };
}

function cellValue(): React.CSSProperties {
  return {
    color: "#0B1F33",
    fontSize: 14,
    fontWeight: 1000,
    lineHeight: 1.25,
    overflowWrap: "anywhere",
  };
}

function watermarkStyle(): React.CSSProperties {
  return {
    position: "absolute",
    right: -10,
    top: -20,
    opacity: 0.055,
    pointerEvents: "none",
  };
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

function guarantorLeaderboardActionText(
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

function guarantorLeaderboardStatusIcon(
  name: GsnIconName,
  label: string,
  tone: "ok" | "warn" | "neutral" = "neutral"
) {
  const bg =
    tone === "ok"
      ? "#ECFDF5"
      : tone === "warn"
        ? "#FFFBEB"
        : "rgba(255,255,255,0.82)";
  const border =
    tone === "ok"
      ? "#A7F3D0"
      : tone === "warn"
        ? "#FDE68A"
        : "rgba(120,150,192,0.22)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        width: "fit-content",
        maxWidth: "100%",
        borderRadius: 999,
        border: `1px solid ${border}`,
        background: bg,
        padding: "6px 10px",
        color: "#0B1F33",
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

export default function GuarantorLeaderboardPage() {
  const selectedClanId = Number(getSelectedClanId() || 1);
  const [items, setItems] = useState<GuarantorLeaderboardRow[]>([]);
  const [message, setMessage] = useState("Loading guarantor leaderboard...");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const routes = useMemo(
    () => ({
      loans: routeTarget("loans", selectedClanId, "guarantor-leaderboard.route.loans"),
      inbox: routeTarget(
        "guarantorInbox",
        selectedClanId,
        "guarantor-leaderboard.route.inbox"
      ),
      earnings: routeTarget(
        "guarantorEarnings",
        selectedClanId,
        "guarantor-leaderboard.route.earnings"
      ),
      trust: routeTarget("trust", selectedClanId, "guarantor-leaderboard.route.trust"),
    }),
    [selectedClanId]
  );

  useEffect(() => {
    let active = true;
    const token = getAccessToken();

    if (!token) {
      setItems([]);
      setError("Sign in to view guarantor standing for this community.");
      setMessage("No signed-in session found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage("Loading guarantor leaderboard...");

    getGuarantorLeaderboard(selectedClanId, token)
      .then((res) => {
        if (!active) return;
        const nextItems = Array.isArray(res?.items) ? res.items : [];
        setItems(nextItems);
        setMessage(
          nextItems.length
            ? `Showing ${nextItems.length} guarantor record${nextItems.length === 1 ? "" : "s"}.`
            : "No guarantor records are visible yet."
        );
      })
      .catch((e: unknown) => {
        if (!active) return;
        setItems([]);
        setError(safeText((e as Error)?.message, "Could not load guarantor leaderboard."));
        setMessage("Leaderboard could not load.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedClanId]);

  const summary = useMemo(() => {
    const totalRequests = items.reduce((sum, row) => sum + Number(row.total_requests || 0), 0);
    const approved = items.reduce((sum, row) => sum + Number(row.approved || 0), 0);
    const declined = items.reduce((sum, row) => sum + Number(row.declined || 0), 0);
    const avgReliability =
      items.length > 0
        ? items.reduce((sum, row) => sum + Number(row.reliability_score || 0), 0) /
          items.length
        : 0;

    return {
      guarantors: items.length,
      totalRequests,
      approved,
      declined,
      avgReliability,
    };
  }, [items]);

  return (
    <div style={pageShell()}>
      <PageTopNav
        sectionLabel="Loans & Support"
        title="Guarantor Leaderboard"
        subtitle="A compact view of who has stood for people, how often support was approved, and where the next action lives."
        homeTo={routes.loans}
        homeLabel="Loans & Support"
        backTo={routes.inbox}
        backLabel="Guarantor Inbox"
      />

      <section style={pageCard("#FFFFFF")}>
        <div style={watermarkStyle()} aria-hidden="true">
          <GSNBrandMark width={128} height={160} />
        </div>
        <div style={{ position: "relative", display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={sectionLabel()}>Community guarantor standing</div>
              <h1
                style={{
                  margin: "8px 0 0",
                  color: "#0B1F33",
                  fontSize: 30,
                  lineHeight: 1.08,
                  fontWeight: 1000,
                  letterSpacing: 0,
                }}
              >
                Support records, not popularity.
              </h1>
            </div>
            {guarantorLeaderboardStatusIcon(
              error ? "alert" : loading ? "refresh" : "shield",
              error ? "Needs sign in" : loading ? "Loading" : "GSN record",
              error ? "warn" : "ok"
            )}
          </div>
          <p style={{ ...helperText(), maxWidth: 720, margin: 0 }}>
            {message} GSN should treat this as an operational support record:
            useful for admins and community owners, but not a public shame board.
          </p>
          <CardActionRow>
            <StableCtaLink
              to={routes.inbox}
              debugId="guarantor-leaderboard.route.inbox"
              stableHeight={52}
            >
              {guarantorLeaderboardActionText("alert", "Inbox", 20)}
            </StableCtaLink>
            <StableCtaLink
              to={routes.earnings}
              debugId="guarantor-leaderboard.route.earnings"
              stableHeight={52}
            >
              {guarantorLeaderboardActionText("wallet", "Earnings", 20)}
            </StableCtaLink>
            <StableCtaLink
              to={routes.trust}
              debugId="guarantor-leaderboard.route.trust"
              stableHeight={52}
            >
              {guarantorLeaderboardActionText("shield", "Trust", 20)}
            </StableCtaLink>
          </CardActionRow>
        </div>
      </section>

      <section style={statGrid()} aria-label="Guarantor leaderboard summary">
        {[
          ["shield", "Guarantors", String(summary.guarantors)],
          ["document", "Requests", String(summary.totalRequests)],
          ["check", "Approved", String(summary.approved)],
          ["alert", "Declined", String(summary.declined)],
          ["chart", "Reliability", pct(summary.avgReliability)],
        ].map(([icon, label, value]) => (
          <div key={label} style={statTile()}>
            <GsnLegacyIcon name={icon as GsnIconName} size={34} />
            <div style={cellLabel()}>{label}</div>
            <div style={{ ...cellValue(), fontSize: 22 }}>{value}</div>
          </div>
        ))}
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Visible records</div>
        {error ? (
          <p style={{ ...helperText(), color: "#991B1B", marginBottom: 0 }}>{error}</p>
        ) : items.length === 0 ? (
          <div
            style={{
              marginTop: 12,
              borderRadius: 18,
              border: "1px solid rgba(122,152,195,0.18)",
              background: "#F8FBFF",
              padding: 16,
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <GsnLegacyIcon name={loading ? "refresh" : "document"} size={42} />
            <div>
              <div style={{ ...cellValue(), fontSize: 16 }}>
                {loading ? "Loading records" : "No leaderboard data yet"}
              </div>
              <div style={helperText()}>
                Approved support activity will appear here when the backend returns
                community guarantor rows.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {items.map((row) => (
              <div key={row.guarantor_user_id} style={rowCard()}>
                <div>
                  <div style={cellLabel()}>Guarantor</div>
                  <div style={cellValue()}>
                    {safeText(row.guarantor_email, `User ${row.guarantor_user_id}`)}
                  </div>
                </div>
                <div>
                  <div style={cellLabel()}>Requests</div>
                  <div style={cellValue()}>{row.total_requests}</div>
                </div>
                <div>
                  <div style={cellLabel()}>Approved</div>
                  <div style={cellValue()}>{row.approved}</div>
                </div>
                <div>
                  <div style={cellLabel()}>Rate</div>
                  <div style={cellValue()}>{pct(row.approval_rate)}</div>
                </div>
                <div>
                  <div style={cellLabel()}>Reliability</div>
                  <div style={cellValue()}>{pct(row.reliability_score)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
