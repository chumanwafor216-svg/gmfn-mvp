import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import { PrimaryButton, SecondaryButton } from "../components/StableButton";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import { APP_ROUTES } from "../lib/appRoutes";
import {
  getCommunityConfirmationPolicy,
  getSelectedClanId,
  safeCopy,
  updateCommunityConfirmationContact,
  updateCommunityConfirmationPolicy,
} from "../lib/api";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";
import { navigateWithOrigin } from "../lib/nav";

type Policy = {
  relay_enabled?: boolean | null;
  instant_pulse_enabled?: boolean | null;
  public_confirmation_enabled?: boolean | null;
  minimum_positive_responses?: number | null;
  maximum_relay_contacts?: number | null;
  response_window_seconds?: number | null;
  review_attention_after_hours?: number | null;
  review_overdue_after_hours?: number | null;
  active_member_count?: number | null;
  contactable_reference_count?: number | null;
  relay_available?: boolean | null;
};

type RelayContact = {
  user_id: number;
  display_name?: string | null;
  gsn_id?: string | null;
  profile_image_url?: string | null;
  phone_verified?: boolean | null;
  membership_role?: string | null;
  role_type?: string | null;
  active?: boolean | null;
  can_receive_relay_requests?: boolean | null;
  can_receive_instant_pulse?: boolean | null;
  standing_status?: string | null;
  receiving_requests?: boolean | null;
  member_opted_out?: boolean | null;
  plain_language?: string | null;
};

type Notice = {
  tone: "success" | "error";
  text: string;
};

function safeStr(value: any): string {
  return String(value ?? "").trim();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function rowsOf<T = any>(value: any): T[] {
  if (Array.isArray(value)) return value as T[];
  if (Array.isArray(value?.items)) return value.items as T[];
  if (Array.isArray(value?.contacts)) return value.contacts as T[];
  if (Array.isArray(value?.data?.contacts)) return value.data.contacts as T[];
  return [];
}

function hoursLabel(value: number | null | undefined): string {
  const hours = Number(value || 0);
  if (!Number.isFinite(hours) || hours <= 0) return "Not set";
  if (hours % 24 === 0) return `${hours / 24} day${hours === 24 ? "" : "s"}`;
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    borderRadius: 24,
    padding: 20,
    border: "1px solid rgba(37,78,119,0.12)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    borderRadius: 22,
    border: "1px solid rgba(37,78,119,0.12)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    borderRadius: 18,
    padding: 15,
    border: "1px solid rgba(37,78,119,0.12)",
  };
}

function statTile(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalStatTile(bg),
    borderRadius: 18,
    border: "1px solid rgba(37,78,119,0.12)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    color: "#39526C",
    fontSize: 12,
    fontWeight: 1000,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#526579",
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1.5,
  };
}

function statusPill(active: boolean, label: string): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "7px 10px",
    background: active ? "#EEF9F1" : "#FEF2F2",
    border: `1px solid ${active ? "rgba(46,155,98,0.22)" : "rgba(220,38,38,0.22)"}`,
    color: active ? "#166534" : "#991B1B",
    fontSize: label.length > 14 ? 11 : 12,
    fontWeight: 950,
    whiteSpace: "nowrap",
  };
}

function iconTile(
  name: GsnIconName,
  tone: "navy" | "blue" | "gold" | "green" | "red" = "navy",
  size = 17
) {
  const palette = {
    navy: {
      color: "#0B2D4A",
      background: "rgba(255,255,255,0.96)",
      border: "1px solid rgba(13,95,168,0.14)",
    },
    blue: {
      color: "#0B63D1",
      background: "rgba(255,255,255,0.96)",
      border: "1px solid rgba(29,95,212,0.18)",
    },
    gold: {
      color: "#7A4A00",
      background: "rgba(255,255,255,0.96)",
      border: "1px solid rgba(214,170,69,0.32)",
    },
    green: {
      color: "#065F46",
      background: "rgba(255,255,255,0.96)",
      border: "1px solid rgba(34,197,94,0.18)",
    },
    red: {
      color: "#991B1B",
      background: "rgba(255,255,255,0.96)",
      border: "1px solid rgba(239,68,68,0.18)",
    },
  }[tone];

  return (
    <span
      aria-hidden="true"
      style={{
        width: 30,
        height: 30,
        borderRadius: 12,
        display: "inline-grid",
        placeItems: "center",
        flex: "0 0 auto",
        boxShadow:
          "0 8px 16px rgba(2,6,23,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
        ...palette,
      }}
    >
      <GsnLegacyIcon name={name} size={Math.max(24, Math.round(size * 1.55))} />
    </span>
  );
}

function labelWithIcon(
  name: GsnIconName,
  label: React.ReactNode,
  tone: "navy" | "blue" | "gold" | "green" | "red" = "blue"
) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      {iconTile(name, tone, 16)}
      <span>{label}</span>
    </span>
  );
}

function sectionLabelWithIcon(
  name: GsnIconName,
  label: string,
  tone: "navy" | "blue" | "gold" | "green" | "red" = "blue"
) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      {iconTile(name, tone, 16)}
      <span style={sectionLabel()}>{label}</span>
    </div>
  );
}

function statusPillWithIcon(active: boolean, label: string, icon: GsnIconName) {
  return (
    <span style={{ ...statusPill(active, label), display: "inline-flex", alignItems: "center", gap: 7 }}>
      {iconTile(icon, active ? "green" : "red", 14)}
      <span>{label}</span>
    </span>
  );
}

function normalizeContact(raw: any): RelayContact | null {
  const userId = Number(raw?.user_id || raw?.userId || 0);
  if (!Number.isFinite(userId) || userId <= 0) return null;
  return {
    user_id: userId,
    display_name: firstTruthy(raw?.display_name, raw?.displayName),
    gsn_id: firstTruthy(raw?.gsn_id, raw?.gmfn_id, raw?.gmfnId),
    profile_image_url: firstTruthy(raw?.profile_image_url, raw?.profileImageUrl),
    phone_verified: Boolean(raw?.phone_verified),
    membership_role: firstTruthy(raw?.membership_role),
    role_type: firstTruthy(raw?.role_type),
    active: Boolean(raw?.active),
    can_receive_relay_requests: Boolean(raw?.can_receive_relay_requests),
    can_receive_instant_pulse: Boolean(raw?.can_receive_instant_pulse),
    standing_status: firstTruthy(raw?.standing_status),
    receiving_requests: Boolean(raw?.receiving_requests),
    member_opted_out: Boolean(raw?.member_opted_out),
    plain_language: firstTruthy(raw?.plain_language),
  };
}

function CommunityConfirmationPolicyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCompact, setIsCompact] = useState(() =>
    typeof window === "undefined" ? false : window.innerWidth <= 820
  );
  const [communityId] = useState(() => Number(getSelectedClanId() || 0));
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyKey, setBusyKey] = useState("");
  const [community, setCommunity] = useState<any>(null);
  const [policy, setPolicy] = useState<Policy>({});
  const [contacts, setContacts] = useState<RelayContact[]>([]);

  const copyText = useMemo(() => {
    return [
      "GSN instant community confirmation policy",
      `Community: ${firstTruthy(community?.name, communityId ? `Community ${communityId}` : "")}`,
      `Request routing: ${policy.relay_enabled ? "on" : "off"}`,
      `Instant confirmation: ${policy.instant_pulse_enabled ? "on" : "off"}`,
      `Review attention: ${hoursLabel(policy.review_attention_after_hours || 24)}`,
      `Review overdue: ${hoursLabel(policy.review_overdue_after_hours || 72)}`,
      `Contactable references: ${policy.contactable_reference_count || 0}`,
    ].join("\n");
  }, [community, communityId, policy]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function handleResize() {
      setIsCompact(window.innerWidth <= 820);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadPolicy = useCallback(async () => {
    if (!communityId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await getCommunityConfirmationPolicy(communityId);
      setCommunity(result?.community || null);
      setPolicy(result?.policy || {});
      setContacts(
        rowsOf<any>(result?.contacts || result)
          .map((row) => normalizeContact(row))
          .filter(Boolean) as RelayContact[]
      );
    } catch {
      setNotice({
        tone: "error",
        text: "GSN could not load this relay policy. You may need community admin access.",
      });
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    void loadPolicy();
  }, [loadPolicy]);

  async function patchPolicy(
    key: string,
    payload: Parameters<typeof updateCommunityConfirmationPolicy>[1]
  ) {
    if (!communityId) return;
    setBusyKey(key);
    try {
      const result = await updateCommunityConfirmationPolicy(communityId, payload);
      setCommunity(result?.community || community);
      setPolicy(result?.policy || {});
      setContacts(
        rowsOf<any>(result?.contacts || result)
          .map((row) => normalizeContact(row))
          .filter(Boolean) as RelayContact[]
      );
      setNotice({ tone: "success", text: "Community relay policy updated." });
    } catch {
      setNotice({ tone: "error", text: "GSN could not update this relay policy yet." });
    } finally {
      setBusyKey("");
    }
  }

  async function patchContact(
    contact: RelayContact,
    payload: Parameters<typeof updateCommunityConfirmationContact>[2]
  ) {
    if (!communityId) return;
    const key = `contact-${contact.user_id}`;
    setBusyKey(key);
    try {
      const result = await updateCommunityConfirmationContact(
        communityId,
        contact.user_id,
        payload
      );
      setCommunity(result?.community || community);
      setPolicy(result?.policy || {});
      setContacts(
        rowsOf<any>(result?.contacts || result)
          .map((row) => normalizeContact(row))
          .filter(Boolean) as RelayContact[]
      );
      setNotice({ tone: "success", text: "Relay contact rule updated." });
    } catch {
      setNotice({
        tone: "error",
        text: "GSN could not update this contact. Member opt-out cannot be overridden here.",
      });
    } finally {
      setBusyKey("");
    }
  }

  const relayOn = Boolean(policy.relay_enabled);
  const instantOn = Boolean(policy.instant_pulse_enabled);
  const publicOn = Boolean(policy.public_confirmation_enabled);

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", paddingBottom: isCompact ? 36 : 56 }}>
      <PageTopNav
        sectionLabel="Community confirmation"
        title="Instant Confirmation Policy"
        subtitle="Choose who may answer live community confirmation requests."
        homeTo={APP_ROUTES.DASHBOARD}
        homeLabel="Dashboard"
        backTo={APP_ROUTES.COMMUNITY_CONFIRMATION_INBOX}
        backLabel="Inbox"
      />

      <ExplainToggle
        label="How this works"
        what="A TrustSlip may say community confirmation is available."
        why="This page controls who can answer and how many answers are enough."
        next="Admins set routing. The result still comes from member responses."
        tone="blue"
        style={{ marginTop: 16 }}
      />

      {notice ? (
        <div
          style={{
            marginTop: 14,
            ...innerCard(notice.tone === "success" ? "#EEF9F1" : "#FEF2F2"),
            color: notice.tone === "success" ? "#166534" : "#991B1B",
            fontWeight: 900,
          }}
        >
          {notice.text}
        </div>
      ) : null}

      <section
        style={{
          marginTop: 16,
          ...pageCard("#FFFFFF"),
          background:
            "linear-gradient(135deg, rgba(7,23,44,0.98) 0%, rgba(16,52,84,0.95) 100%)",
          color: "#FFFFFF",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
            gap: 16,
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ color: "#F2C766", fontSize: 12, fontWeight: 1000, textTransform: "uppercase" }}>
              {labelWithIcon("shield", "Community control", "gold")}
            </div>
            <h1 style={{ margin: "8px 0 0", fontSize: isCompact ? 30 : 42, lineHeight: 1, fontWeight: 1000 }}>
              Who can answer for this community?
            </h1>
            <p style={{ margin: "12px 0 0", color: "#D7E2EF", fontSize: 16, fontWeight: 800, lineHeight: 1.5 }}>
              {firstTruthy(
                community?.name,
                communityId ? `Community ${communityId}` : "Choose a community first"
              )}
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "repeat(3, minmax(0, 1fr))" : "1fr",
              gap: 10,
              minWidth: isCompact ? "auto" : 210,
            }}
          >
            <div style={statTile("rgba(255,255,255,0.08)")}>
              <div style={{ ...sectionLabel(), color: "#B9C7D8" }}>
                {labelWithIcon("megaphone", "Requests", "gold")}
              </div>
              <div style={{ marginTop: 4, color: relayOn ? "#B7F7CA" : "#FECACA", fontSize: 24, fontWeight: 1000 }}>
                {relayOn ? "On" : "Off"}
              </div>
            </div>
            <div style={statTile("rgba(255,255,255,0.08)")}>
              <div style={{ ...sectionLabel(), color: "#B9C7D8" }}>
                {labelWithIcon("community", "Contacts", "gold")}
              </div>
              <div style={{ marginTop: 4, color: "#FFFFFF", fontSize: 24, fontWeight: 1000 }}>
                {policy.contactable_reference_count || 0}
              </div>
            </div>
            <div style={statTile("rgba(255,255,255,0.08)")}>
              <div style={{ ...sectionLabel(), color: "#B9C7D8" }}>
                {labelWithIcon("user", "Members", "gold")}
              </div>
              <div style={{ marginTop: 4, color: "#FFFFFF", fontSize: 24, fontWeight: 1000 }}>
                {policy.active_member_count || 0}
              </div>
            </div>
          </div>
        </div>
      </section>

      {!communityId ? (
        <section style={{ marginTop: 14, ...softCard("#FEF2F2") }}>
          <div style={{ color: "#991B1B", fontWeight: 1000 }}>
            {labelWithIcon("alert", "No active community is selected.", "red")}
          </div>
          <p style={{ margin: "8px 0 0", ...helperText() }}>
            Open Community and choose the community before managing instant confirmation.
          </p>
          <SecondaryButton
            type="button"
            onClick={() => navigateWithOrigin(navigate, APP_ROUTES.COMMUNITY, location)}
            stableHeight={48}
            minWidth={160}
            style={{ marginTop: 12 }}
            debugId="community-confirmation-policy.open-community"
          >
            {labelWithIcon("community", "Open Community", "blue")}
          </SecondaryButton>
        </section>
      ) : null}

      <section style={{ marginTop: 14, ...softCard("#FFFFFF") }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div>
            {sectionLabelWithIcon("shield", "Policy switches", "blue")}
            <div style={{ marginTop: 6, ...helperText(), color: "#07172C" }}>
              Turn request routing and quick answers on or off.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: isCompact ? 24 : 0 }}>
            <SecondaryButton
              type="button"
              onClick={() => void loadPolicy()}
              busy={loading}
              busyLabel="Refreshing..."
              stableHeight={52}
              fullWidth={false}
              minWidth={120}
              debugId="community-confirmation-policy.refresh"
            >
              {labelWithIcon("refresh", "Refresh", "blue")}
            </SecondaryButton>
            <SecondaryButton
              type="button"
              onClick={() => {
                safeCopy(copyText);
                setNotice({ tone: "success", text: "Relay policy summary copied." });
              }}
              stableHeight={52}
              fullWidth={false}
              minWidth={120}
              debugId="community-confirmation-policy.copy"
            >
              {labelWithIcon("copy", "Copy summary", "blue")}
            </SecondaryButton>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {[
            {
              key: "relay",
              title: "Confirmation requests",
              text: "Allow controlled live confirmation requests through GSN.",
              active: relayOn,
              payload: { relay_enabled: !relayOn },
            },
            {
              key: "instant",
              title: "Instant confirmation",
              text: "Allow quick community answers for low-risk checks.",
              active: instantOn,
              payload: { instant_pulse_enabled: !instantOn },
            },
            {
              key: "public",
              title: "Public community signal",
              text: "Let public trust papers say live confirmation is available.",
              active: publicOn,
              payload: { public_confirmation_enabled: !publicOn },
            },
          ].map((item) => (
            <div key={item.key} style={innerCard(item.active ? "#F4FBF7" : "#FEF2F2")}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ color: "#07172C", fontWeight: 1000 }}>
                  {labelWithIcon(item.key === "relay" ? "megaphone" : item.key === "instant" ? "spark" : "globe", item.title, item.active ? "green" : "red")}
                </div>
                {statusPillWithIcon(item.active, item.active ? "On" : "Off", item.active ? "check" : "alert")}
              </div>
              <p style={{ margin: "8px 0 12px", ...helperText(), fontSize: 13 }}>
                {item.text}
              </p>
              <SecondaryButton
                type="button"
                onClick={() => void patchPolicy(item.key, item.payload)}
                disabled={!communityId || Boolean(busyKey)}
                busy={busyKey === item.key}
                busyLabel="Saving..."
                fullWidth
                stableHeight={isCompact ? 52 : 46}
                debugId={`community-confirmation-policy.${item.key}`}
              >
                {labelWithIcon(item.active ? "lock" : "check", `Turn ${item.active ? "off" : "on"}`, item.active ? "red" : "green")}
              </SecondaryButton>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <div style={innerCard("#F8FBFF")}>
            <div style={{ color: "#07172C", fontWeight: 1000 }}>
              {labelWithIcon("check", "Minimum positive answers", "green")}
            </div>
            <p style={{ margin: "6px 0 10px", ...helperText(), fontSize: 13 }}>
              Two answers are stronger than one.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[1, 2, 3].map((value) => (
                <SecondaryButton
                  key={value}
                  type="button"
                  onClick={() =>
                    void patchPolicy(`min-${value}`, {
                      minimum_positive_responses: value,
                    })
                  }
                  disabled={!communityId || Boolean(busyKey)}
                  busy={busyKey === `min-${value}`}
                  stableHeight={isCompact ? 48 : 42}
                  minWidth={72}
                  debugId={`community-confirmation-policy.minimum-${value}`}
                >
                  {value}
                </SecondaryButton>
              ))}
            </div>
          </div>
          <div style={innerCard("#F8FBFF")}>
            <div style={{ color: "#07172C", fontWeight: 1000 }}>
              {labelWithIcon("calendar", "Response window", "blue")}
            </div>
            <p style={{ margin: "6px 0 10px", ...helperText(), fontSize: 13 }}>
              Short for quick checks. Longer for formal review.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                ["5 min", 300],
                ["1 day", 86400],
                ["3 days", 259200],
              ].map(([label, seconds]) => (
                <SecondaryButton
                  key={String(seconds)}
                  type="button"
                  onClick={() =>
                    void patchPolicy(`window-${seconds}`, {
                      response_window_seconds: Number(seconds),
                    })
                  }
                  disabled={!communityId || Boolean(busyKey)}
                  busy={busyKey === `window-${seconds}`}
                  stableHeight={isCompact ? 48 : 42}
                  minWidth={88}
                  debugId={`community-confirmation-policy.window-${seconds}`}
                >
                  {String(label)}
                </SecondaryButton>
              ))}
            </div>
          </div>
          <div style={innerCard("#FFFDF5")}>
            <div style={{ color: "#07172C", fontWeight: 1000 }}>
              {labelWithIcon("alert", "Review timing", "gold")}
            </div>
            <p style={{ margin: "6px 0 10px", ...helperText(), fontSize: 13 }}>
              Cases need attention after {hoursLabel(policy.review_attention_after_hours || 24)} and become overdue after {hoursLabel(policy.review_overdue_after_hours || 72)}.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                ["1d / 3d", 24, 72],
                ["2d / 5d", 48, 120],
                ["3d / 7d", 72, 168],
              ].map(([label, attentionHours, overdueHours]) => (
                <SecondaryButton
                  key={String(label)}
                  type="button"
                  onClick={() =>
                    void patchPolicy(`review-sla-${attentionHours}-${overdueHours}`, {
                      review_attention_after_hours: Number(attentionHours),
                      review_overdue_after_hours: Number(overdueHours),
                    })
                  }
                  disabled={!communityId || Boolean(busyKey)}
                  busy={busyKey === `review-sla-${attentionHours}-${overdueHours}`}
                  stableHeight={isCompact ? 48 : 42}
                  minWidth={88}
                  debugId={`community-confirmation-policy.review-sla-${attentionHours}-${overdueHours}`}
                >
                  {String(label)}
                </SecondaryButton>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 14, ...softCard("#F8FBFF") }}>
        {sectionLabelWithIcon("community", "Eligible response pool", "blue")}
        <h2 style={{ margin: "6px 0 0", color: "#07172C", fontSize: 24, fontWeight: 1000 }}>
          People allowed to answer confirmation requests
        </h2>
        <p style={{ margin: "8px 0 0", ...helperText() }}>
          These members may receive GSN relay requests. Public papers never show private contacts or raw votes.
        </p>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {loading ? (
            <div style={innerCard("#FFFFFF")}>Loading relay contacts...</div>
          ) : contacts.length === 0 ? (
            <div style={innerCard("#FFFFFF")}>
              No relay contacts are currently listed for this community.
            </div>
          ) : (
            contacts.map((contact) => {
              const receiving = Boolean(contact.receiving_requests);
              const key = `contact-${contact.user_id}`;
              return (
                <article key={contact.user_id} style={innerCard("#FFFFFF")}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "56px minmax(0, 1fr)", gap: 12, alignItems: "center" }}>
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 18,
                          overflow: "hidden",
                          display: "grid",
                          placeItems: "center",
                          background: "#EAF3FF",
                          border: "1px solid rgba(11,99,209,0.16)",
                          color: "#0B63D1",
                          fontWeight: 1000,
                        }}
                      >
                        {contact.profile_image_url ? (
                          <img
                            src={contact.profile_image_url}
                            alt={`${firstTruthy(contact.display_name, "Member")} profile`}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <GsnLegacyIcon name="user" size={34} />
                        )}
                      </div>
                      <div>
                        <div style={{ color: "#07172C", fontSize: 18, fontWeight: 1000 }}>
                          {firstTruthy(contact.display_name, `Member ${contact.user_id}`)}
                        </div>
                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {statusPillWithIcon(receiving, receiving ? "Receiving" : "Paused", receiving ? "check" : "lock")}
                          {statusPillWithIcon(Boolean(contact.phone_verified), contact.phone_verified ? "Phone verified" : "Phone not shown", "phone")}
                          {statusPillWithIcon(!contact.member_opted_out, contact.member_opted_out ? "Member opted out" : "Opted in", contact.member_opted_out ? "lock" : "check")}
                        </div>
                        <p style={{ margin: "8px 0 0", ...helperText(), fontSize: 13 }}>
                          {firstTruthy(contact.gsn_id, contact.role_type, contact.membership_role, "GSN relay contact")}
                        </p>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                        gap: 8,
                        minWidth: isCompact ? "auto" : 260,
                      }}
                    >
                      <SecondaryButton
                        type="button"
                        onClick={() =>
                          void patchContact(contact, {
                            active: !receiving,
                            can_receive_relay_requests: !receiving,
                          })
                        }
                        disabled={!communityId || Boolean(busyKey) || Boolean(contact.member_opted_out)}
                        busy={busyKey === key}
                        busyLabel="Saving..."
                        stableHeight={isCompact ? 52 : 46}
                        debugId={`community-confirmation-policy.contact.${contact.user_id}.relay`}
                      >
                        {labelWithIcon(receiving ? "lock" : "megaphone", receiving ? "Pause requests" : "Allow requests", receiving ? "red" : "green")}
                      </SecondaryButton>
                      <SecondaryButton
                        type="button"
                        onClick={() =>
                          void patchContact(contact, {
                            can_receive_instant_pulse: !contact.can_receive_instant_pulse,
                            can_receive_relay_requests: true,
                            active: true,
                          })
                        }
                        disabled={!communityId || Boolean(busyKey) || Boolean(contact.member_opted_out)}
                        busy={busyKey === key}
                        busyLabel="Saving..."
                        stableHeight={isCompact ? 52 : 46}
                        debugId={`community-confirmation-policy.contact.${contact.user_id}.instant`}
                      >
                        {labelWithIcon("spark", `Instant ${contact.can_receive_instant_pulse ? "on" : "off"}`, contact.can_receive_instant_pulse ? "green" : "gold")}
                      </SecondaryButton>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section style={{ marginTop: 14, ...pageCard("#07172C"), color: "#FFFFFF" }}>
        <div style={{ color: "#F2C766", fontWeight: 1000 }}>
          {labelWithIcon("lock", "Privacy rule", "gold")}
        </div>
        <p style={{ margin: "8px 0 0", color: "#D7E2EF", fontWeight: 800, lineHeight: 1.5 }}>
          GSN can ask eligible members, but public readers see only the controlled outcome. Private contacts and raw votes stay protected.
        </p>
        <PrimaryButton
          type="button"
          onClick={() => navigateWithOrigin(navigate, APP_ROUTES.COMMUNITY_CONFIRMATION_INBOX, location)}
          stableHeight={50}
          minWidth={180}
          style={{ marginTop: 14 }}
          debugId="community-confirmation-policy.open-inbox"
        >
          {labelWithIcon("navigation", "Open responder inbox", "navy")}
        </PrimaryButton>
      </section>
    </div>
  );
}

export default CommunityConfirmationPolicyPage;
