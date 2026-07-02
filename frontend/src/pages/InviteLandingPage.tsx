import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { PrimaryButton, StableCtaLink } from "../components/StableButton";
import { getInvitePreview } from "../lib/api";
import { navigateWithOrigin } from "../lib/nav";

type InvitePreview = {
  code?: string;
  clan_id?: number;
  clan_name?: string;
  inviter_display?: string;
  expires_at?: string | null;
  is_active?: boolean;
  uses?: number;
  max_uses?: number | null;
  revoked_at?: string | null;
};

function safeStr(x: any, fallback = ""): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "Not specified";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function isExpired(iso?: string | null): boolean {
  const raw = safeStr(iso);
  if (!raw) return false;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

function buildCoverCreateRoute(
  code: string,
  preview: InvitePreview | null,
  currentSearch: string
): string {
  const params = new URLSearchParams(currentSearch);

  params.set("entry", "create");
  params.set("create_code", code);

  if (safeStr(preview?.clan_name)) {
    params.set("community_name", safeStr(preview?.clan_name));
    params.set("clan_name", safeStr(preview?.clan_name));
  }

  if (preview?.clan_id) {
    params.set("community_route", String(preview.clan_id));
  }

  if (safeStr(preview?.expires_at)) {
    params.set("expires_at", safeStr(preview?.expires_at));
  }

  if (safeStr(preview?.inviter_display)) {
    params.set("inviter_name", safeStr(preview?.inviter_display));
  }

  return `/cover?${params.toString()}`;
}

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, rgba(94,146,214,0.12) 0%, rgba(11,31,51,0.00) 28%), radial-gradient(circle at top right, rgba(214,173,82,0.08) 0%, rgba(11,31,51,0.00) 24%), linear-gradient(180deg, #07101C 0%, #0B1F33 38%, #173654 72%, #24496E 100%)",
    padding: "32px 16px",
    boxSizing: "border-box",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    background: bg,
    border: "1px solid rgba(196,210,226,0.18)",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0 20px 46px rgba(2, 6, 23, 0.24)",
  };
}

function softCard(bg = "#F4F8FC"): React.CSSProperties {
  return {
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 16,
    background: bg,
    padding: 14,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.78)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5C7186",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function pill(kind: "blue" | "green" | "red" | "gray"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 1000,
    border: "1px solid #e5e7eb",
    background: "#fff",
    whiteSpace: "normal",
  };

  if (kind === "blue") {
    return {
      ...base,
      color: "#1e40af",
      background: "#eff6ff",
      borderColor: "#bfdbfe",
    };
  }

  if (kind === "green") {
    return {
      ...base,
      color: "#166534",
      background: "#f0fdf4",
      borderColor: "#bbf7d0",
    };
  }

  if (kind === "red") {
    return {
      ...base,
      color: "#991b1b",
      background: "#fef2f2",
      borderColor: "#fecaca",
    };
  }

  return {
    ...base,
    color: "#334155",
    background: "#f8fafc",
    borderColor: "#e2e8f0",
  };
}

function FeatureCard(props: { title: string; text: string }) {
  const { title, text } = props;

  return (
    <div
      style={{
        border: "1px solid #E2E8F0",
        borderRadius: 16,
        padding: 16,
        background: "#FFFFFF",
      }}
    >
      <div
        style={{
          fontWeight: 900,
          fontSize: 16,
          marginBottom: 8,
          color: "#0F172A",
        }}
      >
        {title}
      </div>
      <div style={helperText()}>{text}</div>
    </div>
  );
}

export default function InviteLandingPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 920;
  });

  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [continuing, setContinuing] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 920);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "GSN | Founder Invitation";
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr("");

        if (!code) {
          throw new Error("Missing invitation code.");
        }

        const res = await getInvitePreview(code);
        setInvite(res || null);
      } catch (e: any) {
        setInvite(null);
        setErr(e?.message || "Invitation could not be loaded.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [code]);

  const unavailableReason = useMemo(() => {
    if (!invite) return "";
    if (invite.revoked_at) return "This invitation has been revoked.";
    if (!invite.is_active) return "This invitation is inactive.";
    if (isExpired(invite.expires_at)) return "This invitation has expired.";
    if (invite.max_uses && (invite.uses ?? 0) >= invite.max_uses) {
      return "This invitation has reached its usage limit.";
    }
    return "";
  }, [invite]);

  const canContinue = useMemo(() => {
    return Boolean(invite && !unavailableReason && safeStr(code));
  }, [invite, unavailableReason, code]);

  const continueTo = useMemo(() => {
    return buildCoverCreateRoute(safeStr(code), invite, location.search);
  }, [code, invite, location.search]);

  const inviteStatus = useMemo(() => {
    if (!invite) return { label: "Unavailable", kind: "gray" as const };
    if (invite.revoked_at) return { label: "Revoked", kind: "red" as const };
    if (unavailableReason) return { label: "Unavailable", kind: "gray" as const };
    if (invite.is_active) return { label: "Eligible", kind: "green" as const };
    return { label: "Inactive", kind: "gray" as const };
  }, [invite, unavailableReason]);

  function continueFounderRoute() {
    if (!canContinue) return;
    setContinuing(true);
    navigateWithOrigin(navigate, continueTo, location);
  }

  return (
    <div style={pageShell()}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: 18 }}>
        <div style={pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 54%, #173654 100%)")}>
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span style={pill("blue")}>Founder invitation</span>
            <span style={pill(inviteStatus.kind)}>{inviteStatus.label}</span>
          </div>

          <div
            style={{
              marginTop: 16,
              fontSize: isCompact ? 30 : 36,
              lineHeight: 1.1,
              color: "#F8FBFF",
              fontWeight: 1000,
              maxWidth: 800,
            }}
          >
            Establish community leadership through a guided founder route.
          </div>

          <div
            style={{
              marginTop: 14,
              color: "#334155",
              fontSize: 15,
              lineHeight: 1.8,
              maxWidth: 820,
            }}
          >
            This invitation does not open the app directly. It first verifies the
            invitation, then moves you into the controlled founder route so the
            entry path stays clear and orderly.
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {safeStr(invite?.clan_name) ? (
              <span style={pill("gray")}>Community: {safeStr(invite?.clan_name)}</span>
            ) : null}
            {safeStr(invite?.inviter_display) ? (
              <span style={pill("gray")}>Invited by: {safeStr(invite?.inviter_display)}</span>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div style={pageCard()}>
            <div style={{ color: "#334155", fontWeight: 800 }}>Loading invitation...</div>
          </div>
        ) : null}

        {err ? (
          <div
            style={{
              ...pageCard("#FEF2F2"),
              border: "1px solid #FECACA",
              color: "#991B1B",
            }}
          >
            {err}
          </div>
        ) : null}

        {!loading && invite ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                gap: 18,
              }}
            >
              <div style={pageCard()}>
                <div style={sectionLabel()}>Invitation details</div>

                <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Community</div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 22,
                        fontWeight: 1000,
                        color: "#0F172A",
                      }}
                    >
                      {safeStr(invite.clan_name, "GSN Community")}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <div style={softCard()}>
                      <div style={sectionLabel()}>Invitation reference</div>
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 16,
                          fontWeight: 900,
                          color: "#0F172A",
                          wordBreak: "break-word",
                        }}
                      >
                        {safeStr(invite.code || code || "—")}
                      </div>
                    </div>

                    <div style={softCard()}>
                      <div style={sectionLabel()}>Invited by</div>
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 16,
                          fontWeight: 900,
                          color: "#0F172A",
                        }}
                      >
                        {safeStr(invite.inviter_display, "GSN Network")}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <div style={softCard()}>
                      <div style={sectionLabel()}>Expiry</div>
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 15,
                          fontWeight: 900,
                          color: "#0F172A",
                        }}
                      >
                        {fmtDate(invite.expires_at)}
                      </div>
                    </div>

                    <div style={softCard()}>
                      <div style={sectionLabel()}>Usage position</div>
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 15,
                          fontWeight: 900,
                          color: "#0F172A",
                        }}
                      >
                        {invite.uses ?? 0}
                        {invite.max_uses ? ` / ${invite.max_uses}` : " / unlimited"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={pageCard()}>
                <div style={sectionLabel()}>What this route does</div>

                <div
                  style={{
                    marginTop: 14,
                    display: "grid",
                    gap: 14,
                  }}
                >
                  <FeatureCard
                    title="Controlled founder onboarding"
                    text="The app does not dump everything at once. It carries you into founder creation one step at a time."
                  />
                  <FeatureCard
                    title="Trust-first entry"
                    text="Identity, community creation, and later authenticated actions should unfold in the right order."
                  />
                  <FeatureCard
                    title="No direct app access yet"
                    text="This public step verifies the invitation, then guides you into Cover and Welcome before Create Entry."
                  />
                </div>
              </div>
            </div>

            {unavailableReason ? (
              <div
                style={{
                  ...pageCard("#FEF2F2"),
                  border: "1px solid #FECACA",
                  color: "#991B1B",
                }}
              >
                {unavailableReason}
              </div>
            ) : (
              <div
                style={{
                  ...pageCard("#EFF6FF"),
                  border: "1px solid #BFDBFE",
                  color: "#1D4ED8",
                }}
              >
                This invitation is valid. Open the guided founder entry route.
              </div>
            )}

            <div style={pageCard()}>
              <div style={sectionLabel()}>Next step</div>

              <div style={{ marginTop: 10, ...helperText(), maxWidth: 780 }}>
                Open the public founder flow. The app will then guide
                you from Cover to Welcome and from Welcome to Create Entry.
              </div>

              <div style={{ marginTop: 10, ...helperText(), maxWidth: 780 }}>
                Focus Commitments opens from Dashboard after workspace entry. If
                you want to understand that discipline path first, open the full
                guide before you continue.
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <PrimaryButton
                  onClick={continueFounderRoute}
                  disabled={!canContinue || continuing}
                  busy={continuing}
                  busyLabel="Opening..."
                  stableHeight={52}
                  debugId="invite-landing.open-founder-entry"
                >
                  Open founder entry
                </PrimaryButton>

                <StableCtaLink
                  to="/guide"
                  kind="secondary"
                  stableHeight={52}
                  debugId="invite-landing.open-guide"
                >
                  Open full GSN guide
                </StableCtaLink>

                <StableCtaLink
                  to="/guide"
                  kind="secondary"
                  stableHeight={52}
                  debugId="invite-landing.open-focus-guide"
                >
                  Read about Focus Commitments first
                </StableCtaLink>

                <StableCtaLink
                  to="/welcome"
                  kind="secondary"
                  stableHeight={52}
                  debugId="invite-landing.open-welcome"
                >
                  Open Welcome
                </StableCtaLink>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
