import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import {
  createMarketplaceRequest,
  getCurrentClan,
  getMe,
  getSelectedClanId,
  listMarketplaceRequests,
  updateMarketplaceRequestStatus,
} from "../lib/api";

type DemandRow = {
  id?: number;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  urgency?: string | null;
  area?: string | null;
  whatsapp_number?: string | null;
  payment_mode?: string | null;
  allow_trust_credit?: boolean;
  status?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  requester_name?: string | null;
  requester_nickname?: string | null;
  requester_gmfn_id?: string | null;
  requester_email?: string | null;
  requester_trust_score?: number | null;
  requester_trust_band?: string | null;
  is_mine?: boolean;
  mine?: boolean;
};

type NoticeTone = "success" | "error";

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function rowsOf<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
  return [];
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

function detailsShell(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    overflow: "hidden",
  };
}

function detailsSummary(): React.CSSProperties {
  return {
    listStyle: "none",
    cursor: "pointer",
    padding: "16px 18px",
    fontWeight: 900,
    color: "#0B1F33",
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };
}

function statTile(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    padding: 14,
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "none",
    background: disabled ? "#CBD5E1" : "#0B63D1",
    color: "#FFFFFF",
    fontWeight: 900,
    fontSize: 14,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.86 : 1,
  };
}

function secondaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.86 : 1,
  };
}

function subtleBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#F8FBFF",
    color: disabled ? "#94A3B8" : "#24415C",
    fontWeight: 800,
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.86 : 1,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    padding: "11px 12px",
    fontSize: 14,
    color: "#0B1F33",
    outline: "none",
    boxSizing: "border-box",
  };
}

function textAreaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 100,
    resize: "vertical" as const,
    lineHeight: 1.6,
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
    gap: 6,
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

function noticeCard(tone: NoticeTone): React.CSSProperties {
  return {
    ...softCard(tone === "success" ? "#F3FBF5" : "#FEF2F2"),
    color: tone === "success" ? "#166534" : "#991B1B",
    border:
      tone === "success"
        ? "1px solid rgba(34,197,94,0.16)"
        : "1px solid rgba(239,68,68,0.16)",
    fontWeight: 800,
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function urgencyLabel(value?: string | null): string {
  const v = safeStr(value).toLowerCase();
  if (v === "high") return "Urgent";
  if (v === "low") return "Low pressure";
  return "Normal";
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function communityName(currentClan: any, selectedClanId: number): string {
  return (
    firstTruthy(
      currentClan?.marketplace_name,
      currentClan?.name,
      currentClan?.display_name,
      currentClan?.title
    ) || (selectedClanId ? `Community ${selectedClanId}` : "No community selected")
  );
}

function requesterName(row: DemandRow): string {
  return (
    firstTruthy(
      row?.requester_name,
      row?.requester_nickname,
      row?.requester_email,
      row?.requester_gmfn_id
    ) || "Member"
  );
}

function isMineRow(row: DemandRow, me: any): boolean {
  if (row?.is_mine === true || row?.mine === true) return true;

  const myGmfnId = safeStr(me?.gmfn_id).toUpperCase();
  const rowGmfnId = safeStr(row?.requester_gmfn_id).toUpperCase();

  if (myGmfnId && rowGmfnId && myGmfnId === rowGmfnId) return true;

  const myEmail = safeStr(me?.email).toLowerCase();
  const rowEmail = safeStr(row?.requester_email).toLowerCase();

  if (myEmail && rowEmail && myEmail === rowEmail) return true;

  return false;
}

export default function DemandBoxPage() {
  const location = useLocation();
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
    null
  );

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [myOpenRows, setMyOpenRows] = useState<DemandRow[]>([]);
  const [visibleRows, setVisibleRows] = useState<DemandRow[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [area, setArea] = useState("");
  const [category, setCategory] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [expiresInHours, setExpiresInHours] = useState("72");
  const [allowTrustCredit, setAllowTrustCredit] = useState(false);

  const [creating, setCreating] = useState(false);
  const [updatingDemandId, setUpdatingDemandId] = useState<number>(0);

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
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [notice]);

  async function loadPage() {
    setLoading(true);

    try {
      const [meRes, currentClanRes, myRes, visibleRes] = await Promise.all([
        getMe().catch(() => null),
        getCurrentClan().catch(() => null),
        listMarketplaceRequests({
          clan_id: selectedClanId || undefined,
          mine_only: true,
          status: "open",
          limit: 50,
        }).catch(() => []),
        listMarketplaceRequests({
          clan_id: selectedClanId || undefined,
          mine_only: false,
          status: "open",
          limit: 50,
        }).catch(() => []),
      ]);

      const myRows = rowsOf<DemandRow>(myRes);
      const visibleAll = rowsOf<DemandRow>(visibleRes);

      const filteredVisible = visibleAll.filter(
        (row) => !isMineRow(row, meRes || null)
      );

      setMe(meRes || null);
      setCurrentClan(currentClanRes || null);
      setMyOpenRows(myRows);
      setVisibleRows(filteredVisible);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, [selectedClanId]);

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  async function handleCreateDemand() {
    if (!selectedClanId) {
      showNotice("error", "Select a community first before creating a demand.");
      return;
    }

    if (!safeStr(title)) {
      showNotice("error", "Add what you need first.");
      return;
    }

    setCreating(true);

    try {
      await createMarketplaceRequest({
        title: safeStr(title),
        description: safeStr(description) || undefined,
        category: safeStr(category) || undefined,
        urgency: safeStr(urgency) || undefined,
        area: safeStr(area) || undefined,
        whatsapp_number: safeStr(whatsappNumber) || undefined,
        expires_in_hours: Number(expiresInHours || 0) > 0 ? Number(expiresInHours) : undefined,
        allow_trust_credit: allowTrustCredit,
        clan_id: selectedClanId,
      });

      setTitle("");
      setDescription("");
      setUrgency("normal");
      setArea("");
      setCategory("");
      setWhatsappNumber("");
      setExpiresInHours("72");
      setAllowTrustCredit(false);

      await loadPage();
      showNotice("success", "Demand posted successfully.");
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Demand could not be created."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateDemandStatus(
    row: DemandRow,
    status: "fulfilled" | "cancelled"
  ) {
    const demandId = Number(row?.id || 0);
    if (!demandId) {
      showNotice("error", "This demand does not have a usable ID.");
      return;
    }

    setUpdatingDemandId(demandId);

    try {
      await updateMarketplaceRequestStatus(demandId, status);
      await loadPage();
      showNotice(
        "success",
        status === "fulfilled"
          ? "Demand marked as fulfilled."
          : "Demand cancelled."
      );
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Demand status could not be updated."
      );
    } finally {
      setUpdatingDemandId(0);
    }
  }

  const currentCommunityName = useMemo(
    () => communityName(currentClan, selectedClanId),
    [currentClan, selectedClanId]
  );

  const memberName = useMemo(() => {
    return (
      firstTruthy(
        me?.display_name,
        me?.nickname,
        me?.name,
        me?.first_name,
        me?.email
      ) || "Member"
    );
  }, [me]);

  const visiblePreview = useMemo(() => visibleRows.slice(0, 6), [visibleRows]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (loading) return;
    if (location.hash !== "#demand-box-create") return;

    const timer = window.setTimeout(() => {
      document.getElementById("demand-box-create")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [location.hash, loading]);

  if (loading) {
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
          sectionLabel="Demand Box"
          title="Demand Box"
          subtitle="Loading Demand Box..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/marketplace"
          backLabel="Marketplace"
          nextLinks={[
            { label: "Community Home", to: "/app/community" },
            { label: "Notifications", to: "/app/notifications" },
          ]}
          utilityLinks={[
            { label: "Trust", to: "/app/trust" },
            { label: "My GSN and I", to: "/app/my-gmfn-and-i" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading Demand Box...
          </div>
        </section>
      </div>
    );
  }

  if (!selectedClanId) {
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
          sectionLabel="Demand Box"
          title="Demand Box"
          subtitle="Demand stays identity-based and works in your current community."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/community"
          backLabel="Community Home"
          nextLinks={[
            { label: "Community Home", to: "/app/community" },
            { label: "Marketplace", to: "/app/marketplace" },
          ]}
          utilityLinks={[
            { label: "My GSN and I", to: "/app/my-gmfn-and-i" },
            { label: "Settings", to: "/app/my-gmfn-and-i?tab=settings" },
          ]}
        />

        {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>No current community</div>

          <div
            style={{
              marginTop: 12,
              color: "#0B1F33",
              fontSize: 28,
              fontWeight: 900,
              lineHeight: 1.15,
              maxWidth: 760,
            }}
          >
            Open Community Home first, then choose the community where this need belongs.
          </div>

          <div
            style={{
              marginTop: 12,
              ...helperText(),
              maxWidth: 860,
            }}
          >
            Demand should remain attached to identity and your current community,
            not float around without a chosen community.
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <OriginLink to="/app/community" style={primaryBtn(false)}>
              Open Community Home
            </OriginLink>
            <OriginLink to="/app/dashboard" style={secondaryBtn(false)}>
              Dashboard
            </OriginLink>
          </div>
        </section>
      </div>
    );
  }

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
        sectionLabel="Demand Box"
        title="Demand Box"
        subtitle="Demand stays identity-based. Keep this page for real needs, clean follow-up, and proper closure."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/marketplace"
        backLabel="Marketplace"
        nextLinks={[
          { label: "Community Home", to: "/app/community" },
          { label: "Notifications", to: "/app/notifications" },
          { label: "Shop Control", to: "/app/shop-control" },
        ]}
        utilityLinks={[
          { label: "Trust", to: "/app/trust" },
          { label: "My GSN and I", to: "/app/my-gmfn-and-i" },
          { label: "Settings", to: "/app/my-gmfn-and-i?tab=settings" },
        ]}
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={pageCard(
          "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
        )}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>Current demand context</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.12,
              }}
            >
              Real needs, real people, real follow-up
            </div>

            <div
              style={{
                marginTop: 12,
                ...helperText(),
                color: "#D7E3F1",
                maxWidth: 840,
              }}
            >
              Demand belongs to the person asking. It should be clear, identity-based,
              and easy to update or close when the need changes.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Member: {memberName}</span>
              <span style={badge(false)}>Context: {currentCommunityName}</span>
              <span style={badge(false)}>My open needs: {myOpenRows.length}</span>
              <span style={badge(false)}>Visible needs: {visibleRows.length}</span>
            </div>
          </div>

          <div
            style={{
              ...softCard("rgba(255,255,255,0.96)"),
              border: "1px solid rgba(212,175,55,0.14)",
              boxShadow: "0 18px 38px rgba(2,12,27,0.16)",
            }}
          >
            <div style={sectionLabel()}>Step order</div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div style={statTile()}>
                <div style={sectionLabel()}>1</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  State the need clearly
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>2</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  Wait for response and keep the request current
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>3</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  Mark it fulfilled or cancel it cleanly
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="demand-box-create" style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Post a new need</div>

        <div
          style={{
            marginTop: 10,
            ...helperText(),
            maxWidth: 860,
          }}
        >
          Start with the simple fields first. Add more detail only when needed.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                gap: 12,
              }}
            >
              <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
                <div style={sectionLabel()}>What do you need?</div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Example: Need 5 bags of rice this week"
                  style={{ ...inputStyle(), marginTop: 8 }}
                />
              </div>

              <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
                <div style={sectionLabel()}>Explain briefly</div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a short explanation so people can understand the need quickly"
                  style={{ ...textAreaStyle(), marginTop: 8 }}
                />
              </div>

              <div>
                <div style={sectionLabel()}>Urgency</div>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  style={{ ...inputStyle(), marginTop: 8 }}
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <div style={sectionLabel()}>Area / location</div>
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Area"
                  style={{ ...inputStyle(), marginTop: 8 }}
                />
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void handleCreateDemand()}
                disabled={creating || !safeStr(title)}
                style={primaryBtn(creating || !safeStr(title))}
              >
                {creating ? "Posting..." : "Post Demand"}
              </button>

              <OriginLink to="/app/notifications" style={secondaryBtn(false)}>
                Open Action Inbox
              </OriginLink>
            </div>
          </div>

          <div style={detailsShell()}>
            <details>
              <summary style={detailsSummary()}>
                <span>More detail</span>
                <span style={{ color: "#64748B", fontSize: 13 }}>Optional</span>
              </summary>

              <div style={{ padding: "0 18px 18px", display: "grid", gap: 12 }}>
                <div>
                  <div style={sectionLabel()}>Category</div>
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Optional category"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>WhatsApp number</div>
                  <input
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="Optional WhatsApp contact"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Expiry in hours</div>
                  <input
                    type="number"
                    min="1"
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(e.target.value)}
                    placeholder="72"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div style={innerCard("#F8FBFF")}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      color: "#0B1F33",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={allowTrustCredit}
                      onChange={(e) => setAllowTrustCredit(e.target.checked)}
                    />
                    Allow trust credit where appropriate
                  </label>
                </div>
              </div>
            </details>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>My open needs</div>

          <div
            style={{
              marginTop: 10,
              ...helperText(),
              maxWidth: 760,
            }}
          >
            Keep only live requests open. When the need is met or no longer relevant,
            close it cleanly.
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {myOpenRows.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                You do not have any open demand right now.
              </div>
            ) : (
              myOpenRows.map((row, index) => {
                const rowId = Number(row?.id || 0);
                const busy = updatingDemandId === rowId;

                return (
                  <div key={`${row?.id || index}`} style={innerCard("#FCFEFF")}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          color: "#0B1F33",
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {firstTruthy(row?.title, "Need")}
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={badge(true)}>{urgencyLabel(row?.urgency)}</span>
                        {safeStr(row?.status) ? (
                          <span style={badge(false)}>{safeStr(row?.status)}</span>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ marginTop: 8, ...helperText() }}>
                      {firstTruthy(row?.description, "No extra detail yet.")}
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      {safeStr(row?.area) ? (
                        <span style={badge(false)}>Area: {safeStr(row?.area)}</span>
                      ) : null}
                      {row?.allow_trust_credit ? (
                        <span style={badge(false)}>Trust credit allowed</span>
                      ) : null}
                      {safeStr(row?.created_at) ? (
                        <span style={badge(false)}>
                          {safeDateTime(row?.created_at)}
                        </span>
                      ) : null}
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => void handleUpdateDemandStatus(row, "fulfilled")}
                        disabled={busy}
                        style={secondaryBtn(busy)}
                      >
                        {busy ? "Updating..." : "Mark Fulfilled"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleUpdateDemandStatus(row, "cancelled")}
                        disabled={busy}
                        style={subtleBtn(busy)}
                      >
                        {busy ? "Updating..." : "Cancel"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Visible community needs</div>

          <div
            style={{
              marginTop: 10,
              ...helperText(),
              maxWidth: 760,
            }}
          >
            These are open visible requests from other people in your current community.
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {visiblePreview.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No visible community demand is open right now.
              </div>
            ) : (
              visiblePreview.map((row, index) => (
                <div key={`${row?.id || index}`} style={innerCard("#FCFEFF")}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "#0B1F33",
                        fontWeight: 900,
                        lineHeight: 1.35,
                      }}
                    >
                      {firstTruthy(row?.title, "Need")}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={badge(true)}>{urgencyLabel(row?.urgency)}</span>
                      {safeStr(row?.requester_trust_band) ? (
                        <span style={badge(false)}>
                          {safeStr(row?.requester_trust_band)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ marginTop: 8, ...helperText() }}>
                    {firstTruthy(row?.description, "No extra detail yet.")}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={badge(false)}>By: {requesterName(row)}</span>
                    {safeStr(row?.area) ? (
                      <span style={badge(false)}>Area: {safeStr(row?.area)}</span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <OriginLink to="/app/marketplace" style={secondaryBtn(false)}>
              Marketplace
            </OriginLink>
            <OriginLink to="/app/notifications" style={secondaryBtn(false)}>
              Action Inbox
            </OriginLink>
          </div>
        </section>
      </section>
    </div>
  );
}
