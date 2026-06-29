import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { GsnRealisticIcon } from "../components/GsnRealisticIcon";
import { StableButton, StableCtaLink } from "../components/StableButton";
import {
  createCommunityDomainPackageQuote,
  getCommunityDomainDashboard,
  listMyCommunityDomains,
} from "../lib/api";
import { APP_ROUTES } from "../lib/appRoutes";

type DomainLane = {
  lane_key?: string;
  label?: string;
  status?: string;
  count?: number;
};

type DashboardPayload = {
  community_domain?: any;
  template?: any;
  viewer?: {
    user_id?: number;
    can_admin?: boolean;
  };
  status?: any;
  counts?: any;
  primary_next_action?: {
    action_key?: string;
    label?: string;
    route_hint?: string | null;
    requires_admin?: boolean;
  };
  lanes?: DomainLane[];
  package_quote?: any;
  boundary?: string;
};

const MODULE_LABELS: Record<string, string> = {
  governance: "Governance",
  members: "Members",
  departments: "Structure",
  shops: "Shops",
  marketplace: "Marketplace",
  spotlight: "Spotlight",
  vault: "Vault",
  verification: "Verification",
  analytics: "Analytics",
};

function cleanText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function compactStatus(value: unknown): string {
  return cleanText(value, "not recorded").replace(/_/g, " ");
}

function countValue(value: unknown): string {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? String(numberValue) : "0";
}

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100%",
    width: "100%",
    display: "grid",
    gap: 16,
    padding: "0 0 28px",
    boxSizing: "border-box",
  };
}

function heroCard(): React.CSSProperties {
  return {
    borderRadius: 26,
    background:
      "radial-gradient(circle at 88% 10%, rgba(214,170,69,0.16) 0%, rgba(214,170,69,0.00) 30%), linear-gradient(180deg, #071424 0%, #0D2640 54%, #173A5C 100%)",
    border: "1px solid rgba(214,228,242,0.16)",
    boxShadow:
      "0 26px 56px rgba(2,12,27,0.24), inset 0 1px 0 rgba(255,255,255,0.06)",
    padding: 18,
    color: "#F8FBFF",
    overflow: "hidden",
  };
}

function whiteCard(): React.CSSProperties {
  return {
    borderRadius: 22,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(244,248,252,0.985) 100%)",
    border: "1px solid rgba(9,27,46,0.13)",
    boxShadow:
      "0 20px 46px rgba(7,20,36,0.08), inset 0 1px 0 rgba(255,255,255,0.82)",
    padding: 16,
    color: "#091B2E",
  };
}

function softCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    background:
      "linear-gradient(180deg, rgba(248,251,255,0.995) 0%, rgba(236,243,250,0.985) 100%)",
    border: "1px solid rgba(9,27,46,0.12)",
    boxShadow: "0 14px 30px rgba(7,20,36,0.055)",
    padding: 14,
    color: "#091B2E",
  };
}

function sectionLabel(onDark = false): React.CSSProperties {
  return {
    fontSize: 12,
    color: onDark ? "#F3D06A" : "#506A82",
    fontWeight: 900,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  };
}

function helperText(onDark = false): React.CSSProperties {
  return {
    color: onDark ? "rgba(248,251,255,0.82)" : "#4F647A",
    fontSize: 14,
    lineHeight: 1.65,
  };
}

function factTile(): React.CSSProperties {
  return {
    borderRadius: 16,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(214,228,242,0.16)",
    padding: 12,
    minHeight: 74,
    display: "grid",
    alignContent: "center",
    gap: 5,
  };
}

function statusBadge(status: unknown): React.CSSProperties {
  const text = cleanText(status).toLowerCase();
  const warning = text.includes("draft") || text.includes("quote") || text.includes("not");
  const danger = text.includes("suspended") || text.includes("expired") || text.includes("closed");
  const palette = danger
    ? { bg: "rgba(153,27,27,0.10)", color: "#991B1B", border: "rgba(153,27,27,0.20)" }
    : warning
    ? { bg: "rgba(146,94,8,0.11)", color: "#925E08", border: "rgba(146,94,8,0.22)" }
    : { bg: "rgba(22,101,52,0.10)", color: "#166534", border: "rgba(22,101,52,0.22)" };

  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: palette.bg,
    color: palette.color,
    border: `1px solid ${palette.border}`,
    fontSize: 12,
    fontWeight: 900,
    textTransform: "capitalize",
  };
}

function laneForAction(actionKey: unknown): string {
  const key = cleanText(actionKey).toLowerCase();
  if (key.includes("package") || key.includes("billing")) return "billing";
  if (key.includes("review") || key.includes("governance")) return "governance";
  if (key.includes("member")) return "members";
  if (key.includes("module")) return "modules";
  return "structure";
}

function moduleLabel(moduleKey: unknown): string {
  const key = cleanText(moduleKey);
  return MODULE_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());
}

function laneDisplayLabel(lane: any, fallback = "Lane"): string {
  const key = cleanText(lane?.lane_key).toLowerCase();
  const label = cleanText(lane?.label, fallback);
  if (key === "modules" || label.toLowerCase() === "modules") return "Services";
  return label;
}

export default function CommunityDomainDashboardPage() {
  const params = useParams();
  const communityDomainId = cleanText(params.communityDomainId || params.id);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [domainItems, setDomainItems] = useState<any[]>([]);
  const [quote, setQuote] = useState<any | null>(null);
  const [activeLane, setActiveLane] = useState("structure");
  const [loading, setLoading] = useState(true);
  const [busyQuote, setBusyQuote] = useState(false);
  const [message, setMessage] = useState("");

  async function loadDashboard() {
    if (!communityDomainId) {
      setLoading(true);
      setMessage("");
      try {
        const payload = await listMyCommunityDomains();
        setDomainItems(Array.isArray(payload?.items) ? payload.items : []);
      } catch (err: any) {
        setDomainItems([]);
        setMessage(
          err?.message ||
            "GSN could not load your Community Domains. Check that you are signed in."
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setMessage("");
    setDomainItems([]);
    try {
      const payload = await getCommunityDomainDashboard(communityDomainId);
      const nextDashboard = (payload?.dashboard || null) as DashboardPayload | null;
      setDashboard(nextDashboard);
      setQuote(nextDashboard?.package_quote || null);
      setActiveLane(laneForAction(nextDashboard?.primary_next_action?.action_key));
    } catch (err: any) {
      setDashboard(null);
      setMessage(
        err?.message ||
          "GSN could not open this Community Domain dashboard. Check that you are signed in as an active domain member."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "GSN | Community Domain";
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [communityDomainId]);

  const domain = dashboard?.community_domain || {};
  const template = dashboard?.template || {};
  const status = dashboard?.status || {};
  const counts = dashboard?.counts || {};
  const lanes = Array.isArray(dashboard?.lanes) ? dashboard?.lanes || [] : [];
  const isAdmin = Boolean(dashboard?.viewer?.can_admin);
  const selectedLane = lanes.find((lane) => lane.lane_key === activeLane) || lanes[0];
  const primaryActionLaneKey = laneForAction(dashboard?.primary_next_action?.action_key);
  const primaryActionLane =
    lanes.find((lane) => lane.lane_key === primaryActionLaneKey) || selectedLane;
  const primaryActionLaneLabel = laneDisplayLabel(primaryActionLane, "work");
  const billingIsActive =
    cleanText(status.billing_status || selectedLane?.status).toLowerCase() === "active";
  const packageReviewActionLabel = isAdmin
    ? billingIsActive
      ? "Review package details"
      : "Review package quote"
    : billingIsActive
    ? "Why package details are owner-only"
    : "Why quote review is owner-only";

  const moduleKeys = useMemo(() => {
    const included = Array.isArray(quote?.included_modules) ? quote.included_modules : [];
    const templateModules = Array.isArray(template?.default_modules)
      ? template.default_modules
      : [];
    return Array.from(new Set([...included, ...templateModules])).slice(0, 8);
  }, [quote, template]);

  async function refreshQuote() {
    if (!communityDomainId) return;
    if (!isAdmin) {
      setMessage(
        billingIsActive
          ? "Only a Community Domain owner or domain admin can review the package details."
          : "Only a Community Domain owner or domain admin can review the package quote."
      );
      return;
    }

    setBusyQuote(true);
    setMessage("");
    try {
      const payload = await createCommunityDomainPackageQuote(communityDomainId);
      setQuote(payload?.quote || null);
      setActiveLane("billing");
      setMessage(
        billingIsActive
          ? "Package details refreshed. Billing is already shown as active here, but this refresh is still not payment confirmation, activation, or verification."
          : "Package quote refreshed. It is still not a payment instruction, payment confirmation, activation, or verification."
      );
    } catch (err: any) {
      setMessage(err?.message || "GSN could not refresh the package quote.");
    } finally {
      setBusyQuote(false);
    }
  }

  return (
    <main style={pageShell()}>
      <PageTopNav
        sectionLabel="Community Domain"
        title="Institutional dashboard"
        subtitle="Operate the domain after it exists. Keep setup, payment, and verification separate."
        homeTo={APP_ROUTES.DASHBOARD}
        homeLabel="Dashboard"
        backTo={APP_ROUTES.COMMUNITY}
        backLabel="Community Home"
      />

      {loading ? (
        <section style={whiteCard()}>
          <div style={sectionLabel()}>Loading</div>
          <div style={{ ...helperText(), marginTop: 8 }}>
            {communityDomainId
              ? "Opening the Community Domain dashboard..."
              : "Loading your Community Domains..."}
          </div>
        </section>
      ) : null}

      {!loading && message && !dashboard ? (
        <section style={whiteCard()}>
          <div style={sectionLabel()}>
            {communityDomainId ? "Cannot open dashboard" : "Cannot load domains"}
          </div>
          <h2 style={{ margin: "8px 0 6px", fontSize: 24, lineHeight: 1.1 }}>
            {communityDomainId
              ? "This Community Domain is not available here."
              : "Your Community Domains could not be loaded."}
          </h2>
          <div style={helperText()}>{message}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <StableButton
              type="button"
              kind="primary"
              debugId={
                communityDomainId
                  ? "community-domain-dashboard.error.retry-dashboard"
                  : "community-domain-dashboard.error.retry-selector"
              }
              onClick={loadDashboard}
            >
              Try again
            </StableButton>
            <StableCtaLink
              to={APP_ROUTES.COMMUNITY}
              kind="secondary"
              debugId="community-domain-dashboard.error.community-home"
            >
              Community Home
            </StableCtaLink>
            <StableCtaLink
              to="/community-domain/purchase"
              kind="soft"
              debugId="community-domain-dashboard.error.purchase"
            >
              Purchase path
            </StableCtaLink>
          </div>
        </section>
      ) : null}

      {!loading && !communityDomainId && !message ? (
        <section style={whiteCard()}>
          {domainItems.length > 0 ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={sectionLabel()}>Your Community Domains</div>
              <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.1 }}>
                Choose a domain to operate.
              </h2>
              <div style={helperText()}>
                These are active Community Domain memberships attached to your signed-in
                account. Opening one keeps payment, activation, and verification
                boundaries separate.
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
                  gap: 12,
                }}
              >
                {domainItems.map((item) => {
                  const itemDomain = item?.community_domain || {};
                  const itemMembership = item?.membership || {};
                  const path =
                    cleanText(item?.dashboard_path) ||
                    `/app/community-domain/${encodeURIComponent(String(itemDomain.id))}`;
                  return (
                    <div key={cleanText(itemDomain.id, path)} style={softCard()}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={sectionLabel()}>
                          {item?.viewer?.can_admin ? "Owner/admin" : "Member"}
                        </div>
                        <h3 style={{ margin: 0, fontSize: 19, lineHeight: 1.14 }}>
                          {cleanText(itemDomain.display_name, "Community Domain")}
                        </h3>
                        <div style={helperText()}>
                          Code: <strong>{cleanText(itemDomain.domain_name, "not recorded")}</strong>
                          <br />
                          Role:{" "}
                          <strong style={{ textTransform: "capitalize" }}>
                            {compactStatus(itemMembership.role)}
                          </strong>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          <span style={statusBadge(itemDomain.status)}>
                            Domain: {compactStatus(itemDomain.status)}
                          </span>
                          <span style={statusBadge(itemDomain.verification_status)}>
                            Verification: {compactStatus(itemDomain.verification_status)}
                          </span>
                        </div>
                        <StableCtaLink
                          to={path}
                          kind="primary"
                          fullWidth
                          debugId={`community-domain-dashboard.selector.open-${cleanText(
                            itemDomain.id,
                            "domain"
                          )}`}
                        >
                          Open dashboard
                        </StableCtaLink>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={sectionLabel()}>No Community Domains yet</div>
              <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.1 }}>
                Start from the purchase path.
              </h2>
              <div style={helperText()}>
                This account does not have an active Community Domain membership to
                open here. You can check a domain name or return to Community Home.
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <StableCtaLink
                  to="/community-domain/purchase"
                  kind="primary"
                  debugId="community-domain-dashboard.empty.purchase"
                >
                  Check domain name
                </StableCtaLink>
                <StableCtaLink
                  to={APP_ROUTES.COMMUNITY}
                  kind="secondary"
                  debugId="community-domain-dashboard.empty.community-home"
                >
                  Community Home
                </StableCtaLink>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {!loading && communityDomainId && dashboard ? (
        <>
          <section style={heroCard()}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: 16,
                alignItems: "start",
              }}
            >
              <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
                <div style={sectionLabel(true)}>GSN / Community Domain</div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "clamp(28px, 5vw, 46px)",
                    lineHeight: 1.02,
                    fontWeight: 950,
                    letterSpacing: 0,
                    overflowWrap: "break-word",
                  }}
                >
                  {cleanText(domain.display_name, "Community Domain")}
                </h1>
                <div style={helperText(true)}>
                  Domain code: <strong>{cleanText(domain.domain_name, "not recorded")}</strong>
                </div>
              </div>
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 24,
                  display: "grid",
                  placeItems: "center",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.06) 100%)",
                  border: "1px solid rgba(243,208,106,0.22)",
                  boxShadow: "0 16px 30px rgba(0,8,18,0.22)",
                }}
              >
                <GsnRealisticIcon name="community-building" size={62} decorative />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))",
                gap: 10,
                marginTop: 16,
              }}
            >
              {[
                ["Domain status", compactStatus(status.domain_status)],
                ["Verification", compactStatus(status.verification_status)],
                ["Billing", compactStatus(status.billing_status)],
                ["Activation", compactStatus(status.activation_status)],
              ].map(([label, value]) => (
                <div key={label} style={factTile()}>
                  <div style={sectionLabel(true)}>{label}</div>
                  <div style={{ color: "#FFFFFF", fontSize: 16, fontWeight: 950, textTransform: "capitalize" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            <div style={whiteCard()}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={sectionLabel()}>Next action</div>
                <h2 style={{ margin: 0, fontSize: 23, lineHeight: 1.12 }}>
                  Open the {primaryActionLaneLabel} lane
                </h2>
                <div style={helperText()}>
                  {cleanText(
                    dashboard.primary_next_action?.label,
                    "Review the current Community Domain setup state."
                  )}{" "}
                  GSN opens the matching lane here first; deeper changes still use
                  owner/admin tools that check permissions.
                </div>
                <StableButton
                  type="button"
                  kind="primary"
                  fullWidth
                  debugId="community-domain-dashboard.continue-setup"
                  onClick={() => setActiveLane(primaryActionLaneKey)}
                >
                  Open {primaryActionLaneLabel}
                </StableButton>
              </div>
            </div>

            <div style={whiteCard()}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={sectionLabel()}>Template</div>
                <h2 style={{ margin: 0, fontSize: 23, lineHeight: 1.12 }}>
                  {cleanText(template.label, "Institution")}
                </h2>
                <div style={helperText()}>
                  Marketplace role:{" "}
                  <strong style={{ textTransform: "capitalize" }}>
                    {compactStatus(template.marketplace_role)}
                  </strong>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <span style={statusBadge(status.domain_status)}>
                    {compactStatus(status.domain_status)}
                  </span>
                  <span style={statusBadge(status.verification_status)}>
                    {compactStatus(status.verification_status)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section style={whiteCard()}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              {[
                ["Structure", counts.nodes],
                ["Members", counts.active_members],
                ["Role placements", counts.active_node_memberships],
                ["Policies", counts.active_policies],
                ["Open reviews", counts.open_reviews],
              ].map(([label, value]) => (
                <div key={String(label)} style={softCard()}>
                  <div style={sectionLabel()}>{String(label)}</div>
                  <div style={{ fontSize: 28, fontWeight: 950, marginTop: 4 }}>
                    {countValue(value)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
              gap: 12,
              alignItems: "start",
            }}
          >
            <div style={whiteCard()}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={sectionLabel()}>Work lanes</div>
                {lanes.map((lane) => {
                  const selected = lane.lane_key === activeLane;
                  return (
                    <StableButton
                      key={cleanText(lane.lane_key, lane.label)}
                      type="button"
                      kind="secondary"
                      onClick={() => setActiveLane(cleanText(lane.lane_key))}
                      debugId={`community-domain-dashboard.lane.${cleanText(lane.lane_key)}`}
                      fullWidth
                      stableHeight={58}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        justifyContent: "stretch",
                        gap: 10,
                        alignItems: "center",
                        borderRadius: 16,
                        border: selected
                          ? "1px solid rgba(12,79,168,0.34)"
                          : "1px solid rgba(9,27,46,0.10)",
                        background: selected
                          ? "linear-gradient(180deg, rgba(12,79,168,0.11) 0%, rgba(12,79,168,0.05) 100%)"
                          : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(242,247,252,0.98) 100%)",
                        color: "#091B2E",
                        padding: "10px 12px",
                        textAlign: "left",
                        cursor: "pointer",
                        boxSizing: "border-box",
                      }}
                    >
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontWeight: 950, fontSize: 14 }}>
                          {laneDisplayLabel(lane, "Lane")}
                        </span>
                        <span
                          style={{
                            display: "block",
                            color: "#4F647A",
                            fontSize: 12.5,
                            marginTop: 3,
                            textTransform: "capitalize",
                          }}
                        >
                          {compactStatus(lane.status)}
                        </span>
                      </span>
                      <span style={statusBadge(lane.status)}>{countValue(lane.count)}</span>
                    </StableButton>
                  );
                })}
              </div>
            </div>

            <div style={whiteCard()}>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={sectionLabel()}>Opened lane</div>
                <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.1 }}>
                  {laneDisplayLabel(selectedLane, "Community Domain setup")}
                </h2>
                <div style={helperText()}>
                  Current state:{" "}
                  <strong style={{ textTransform: "capitalize" }}>
                    {compactStatus(selectedLane?.status)}
                  </strong>
                  . Count: <strong>{countValue(selectedLane?.count)}</strong>.
                </div>

                {activeLane === "billing" ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Package and renewal</div>
                    <div style={{ ...helperText(), marginTop: 7 }}>
                      Billing status:{" "}
                      <strong style={{ textTransform: "capitalize" }}>
                        {compactStatus(status.billing_status || selectedLane?.status)}
                      </strong>
                      .{" "}
                      {billingIsActive
                        ? "Quote details remain available for reference, but this lane is no longer asking for a quote before setup continues."
                        : "Quote details are still required before a payment instruction exists."}{" "}
                      Renewal period and payment instruction are not configured here.
                    </div>
                    <div style={{ ...helperText(), marginTop: 7 }}>
                      Package quote:{" "}
                      <strong style={{ textTransform: "capitalize" }}>
                        {compactStatus(quote?.pricing_status || quote?.quote_status)}
                      </strong>
                      .
                    </div>
                    <StableButton
                      type="button"
                      kind="secondary"
                      fullWidth
                      disabled={busyQuote}
                      debugId="community-domain-dashboard.refresh-package-quote"
                      onClick={refreshQuote}
                      style={{ marginTop: 12 }}
                    >
                      {packageReviewActionLabel}
                    </StableButton>
                  </div>
                ) : null}

                {activeLane === "modules" ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Service rows</div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      {(moduleKeys.length ? moduleKeys : ["governance", "members", "analytics"]).map(
                        (moduleKey) => (
                          <div key={String(moduleKey)} style={statusBadge("ready")}>
                            {moduleLabel(moduleKey)}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : null}

                {activeLane !== "billing" && activeLane !== "modules" ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Safe next step</div>
                    <div style={{ ...helperText(), marginTop: 7 }}>
                      Use this lane to review setup state first. Creation, member changes,
                      policy decisions, payment, and verification remain separate actions
                      with owner/admin permission checks.
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {message ? (
            <section style={whiteCard()}>
              <div style={sectionLabel()}>Action response</div>
              <div style={{ ...helperText(), marginTop: 8 }}>{message}</div>
            </section>
          ) : null}

          <section style={whiteCard()}>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={sectionLabel()}>Boundary</div>
              <div style={helperText()}>
                This dashboard does not create payment instructions, confirm payment,
                activate billing, activate a Community Domain, verify ownership, expose
                private finance records, or expose private member evidence.
              </div>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
