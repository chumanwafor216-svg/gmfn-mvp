import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  createMarketplaceRequest,
  getCurrentClan,
  getMe,
  getSelectedClanId,
  listMarketplaceRequests,
  type MarketplaceRequestItem,
  updateMarketplaceRequestStatus,
} from "../lib/api";

type ClanItem = {
  id?: number;
  clan_id?: number;
  name?: string | null;
  clan_name?: string | null;
  description?: string | null;
  clan_description?: string | null;
};

type BalanceState = {
  label: string;
  amountText: string;
  noteText: string;
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
    opacity: disabled ? 0.9 : 1,
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

function statTile(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    padding: 14,
  };
}

function fieldLabel(): React.CSSProperties {
  return {
    fontSize: 13,
    color: "#24415C",
    fontWeight: 800,
  };
}

function textInput(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 42,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.12)",
    background: "#FFFFFF",
    color: "#0B1F33",
    fontSize: 14,
    boxSizing: "border-box",
  };
}

function textArea(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 110,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.12)",
    background: "#FFFFFF",
    color: "#0B1F33",
    fontSize: 14,
    boxSizing: "border-box",
    resize: "vertical" as const,
  };
}

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function safeDateTime(x: any): string {
  const raw = String(x || "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function getClanIdValue(clan: ClanItem | null | undefined): number {
  return Number(clan?.id || clan?.clan_id || 0);
}

function getClanName(clan: ClanItem | null | undefined): string {
  return safeStr(clan?.name || clan?.clan_name || "Community");
}

function urgencyLabel(value?: string | null): string {
  const v = String(value || "").toLowerCase();
  if (v === "high") return "Urgent";
  if (v === "low") return "Low pressure";
  return "Normal";
}

function getVisibleBalanceState(me: any): BalanceState {
  const candidates: Array<{ value: any; label: string }> = [
    { value: me?.marketplace_balance, label: "Marketplace balance" },
    { value: me?.available_balance, label: "Available balance" },
    { value: me?.wallet_balance, label: "Wallet balance" },
    { value: me?.pool_balance, label: "Pool balance" },
    { value: me?.balance, label: "Balance" },
  ];

  const currency = safeStr(
    me?.marketplace_balance_currency ||
      me?.balance_currency ||
      me?.wallet_currency ||
      me?.currency
  );

  for (const item of candidates) {
    const raw = String(item.value ?? "").trim();
    if (!raw) continue;

    return {
      label: item.label,
      amountText: currency ? `${currency} ${raw}` : raw,
      noteText:
        "This is your personal balance view only. It is tied to your global GMFN ID and shown only to you.",
    };
  }

  return {
    label: "Visible balance",
    amountText: "Pending",
    noteText:
      "A personal balance view will appear here when available. It is tied to your global GMFN ID and shown only to you.",
  };
}

export default function DemandBoxPage() {
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [me, setMe] = useState<any>(null);
  const [clan, setClan] = useState<ClanItem | null>(null);
  const [items, setItems] = useState<MarketplaceRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workingId, setWorkingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [allowTrustCredit, setAllowTrustCredit] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 980);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function refreshDemand() {
    setLoading(true);
    try {
      const [meRes, clanRes, demandRes] = await Promise.all([
        getMe().catch(() => null),
        getCurrentClan().catch(() => null),
        listMarketplaceRequests({
          status: "open",
          clan_id: selectedClanId || undefined,
          mine_only: false,
          limit: 40,
        }).catch(() => []),
      ]);

      setMe(meRes);
      setClan(clanRes);
      setItems(Array.isArray(demandRes) ? demandRes : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshDemand();
  }, [selectedClanId]);

  const effectiveClanId = useMemo(
    () => Number(selectedClanId || getClanIdValue(clan) || 0),
    [selectedClanId, clan]
  );

  const clanName = useMemo(() => getClanName(clan), [clan]);
  const gmfnId = useMemo(() => safeStr(me?.gmfn_id || "Pending"), [me]);
  const visibleBalance = useMemo(() => getVisibleBalanceState(me), [me]);

  const myItems = useMemo(() => {
    const mine = safeStr(me?.gmfn_id || "");

    return items.filter((item) => {
      if (item?.mine === true || item?.is_mine === true) return true;
      return safeStr(item?.requester_gmfn_id || "") === mine;
    });
  }, [items, me]);

  const communityItems = useMemo(() => {
    const mineIds = new Set(myItems.map((item) => Number(item.id || 0)));
    return items.filter((item) => !mineIds.has(Number(item.id || 0)));
  }, [items, myItems]);

  async function handleCreateDemand(event: React.FormEvent) {
    event.preventDefault();

    if (!safeStr(title) || !effectiveClanId) return;

    setSubmitting(true);
    try {
      await createMarketplaceRequest({
        title: safeStr(title),
        description: safeStr(description),
        urgency: safeStr(urgency) || "normal",
        allow_trust_credit: allowTrustCredit,
        clan_id: effectiveClanId,
      }).catch(() => null);

      setTitle("");
      setDescription("");
      setUrgency("normal");
      setAllowTrustCredit(false);

      await refreshDemand();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateStatus(
    requestId: number,
    status: "fulfilled" | "cancelled"
  ) {
    if (!requestId) return;

    setWorkingId(requestId);
    try {
      await updateMarketplaceRequestStatus(requestId, status).catch(() => null);
      await refreshDemand();
    } finally {
      setWorkingId(null);
    }
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
        subtitle="Demand is identity-based. This page belongs to the person making the request, not to an anonymous separate surface."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
        nextLinks={[
          { label: "Marketplace", to: "/app/marketplace" },
          { label: "Community", to: "/app/community" },
          { label: "Notifications", to: "/app/notifications" },
        ]}
        utilityLinks={[
          { label: "My Shop", to: "/app/shop-control" },
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
              : "minmax(0, 1.15fr) minmax(340px, 0.85fr)",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <div>
            <div style={sectionLabel()}>Identity-based demand</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.12,
              }}
            >
              Demand belongs to the individual who is asking.
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
              Demand Box is not Dashboard. It is the working page for identity-based
              requests. Each post stays tied to the person’s global GMFN ID while
              still sitting within the selected community surface.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>GMFN ID: {gmfnId}</span>
              <span style={badge(false)}>
                Community ID: {effectiveClanId || "Not selected"}
              </span>
              <span style={badge(false)}>
                Your open posts: {myItems.length}
              </span>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Your personal view</div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gap: 10,
              }}
            >
              <div style={statTile()}>
                <div style={{ color: "#5F7287", fontSize: 13, fontWeight: 800 }}>
                  {visibleBalance.label}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "#0B1F33",
                    fontSize: 24,
                    fontWeight: 900,
                  }}
                >
                  {visibleBalance.amountText}
                </div>
              </div>

              <div style={statTile()}>
                <div
                  style={{
                    color: "#5F7287",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  {visibleBalance.noteText}
                </div>
              </div>

              <div style={statTile()}>
                <div style={{ color: "#5F7287", fontSize: 13, fontWeight: 800 }}>
                  Selected surface
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "#0B1F33",
                    fontSize: 16,
                    fontWeight: 900,
                  }}
                >
                  {effectiveClanId ? `${clanName} (ID ${effectiveClanId})` : "No community selected"}
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
            : "minmax(0, 1fr) minmax(320px, 0.92fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Create a demand post</div>

          <div
            style={{
              marginTop: 10,
              color: "#5F7287",
              fontSize: 14,
              lineHeight: 1.75,
            }}
          >
            This post will stay attached to your GMFN ID. It is not anonymous.
          </div>

          {!effectiveClanId ? (
            <div
              style={{
                marginTop: 14,
                color: "#64748B",
                lineHeight: 1.75,
              }}
            >
              Select a community before creating a demand post.
            </div>
          ) : (
            <form onSubmit={handleCreateDemand} style={{ marginTop: 14, display: "grid", gap: 14 }}>
              <div>
                <div style={fieldLabel()}>Title</div>
                <div style={{ marginTop: 6 }}>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="What do you need?"
                    style={textInput()}
                  />
                </div>
              </div>

              <div>
                <div style={fieldLabel()}>Description</div>
                <div style={{ marginTop: 6 }}>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Add a clearer explanation of the need"
                    style={textArea()}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 14,
                }}
              >
                <div>
                  <div style={fieldLabel()}>Urgency</div>
                  <div style={{ marginTop: 6 }}>
                    <select
                      value={urgency}
                      onChange={(event) => setUrgency(event.target.value)}
                      style={textInput()}
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div style={fieldLabel()}>Trust credit</div>
                  <div style={{ marginTop: 10 }}>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        color: "#24415C",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={allowTrustCredit}
                        onChange={(event) =>
                          setAllowTrustCredit(event.target.checked)
                        }
                      />
                      Allow trust credit for this post
                    </label>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="submit"
                  style={primaryBtn(submitting || !safeStr(title))}
                  disabled={submitting || !safeStr(title)}
                >
                  {submitting ? "Posting..." : "Post demand"}
                </button>

                <Link to="/app/marketplace" style={secondaryBtn()}>
                  Marketplace
                </Link>
              </div>
            </form>
          )}
        </div>

        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Demand summary</div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={statTile()}>
              <div style={{ color: "#5F7287", fontSize: 13, fontWeight: 800 }}>
                Your open demand posts
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: "#0B1F33",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {loading ? "…" : myItems.length}
              </div>
            </div>

            <div style={statTile()}>
              <div style={{ color: "#5F7287", fontSize: 13, fontWeight: 800 }}>
                Visible community demand
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: "#0B1F33",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {loading ? "…" : communityItems.length}
              </div>
            </div>

            <div style={statTile()}>
              <div
                style={{
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.75,
                }}
              >
                Demand stays tied to the person’s global identity and still
                shows the active community context.
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
            : "minmax(0, 1fr) minmax(320px, 0.95fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Your demand posts</div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {loading ? (
              <div style={{ color: "#64748B" }}>Loading your demand posts...</div>
            ) : myItems.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.75 }}>
                You do not have any open demand post right now.
              </div>
            ) : (
              myItems.map((item) => (
                <div key={Number(item.id || 0)} style={innerCard("#FCFEFF")}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                      {safeStr(item.title || "Need")}
                    </div>

                    <span style={badge(false)}>{urgencyLabel(item.urgency)}</span>
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      color: "#5F7287",
                      fontSize: 14,
                      lineHeight: 1.75,
                    }}
                  >
                    {safeStr(item.description || "No extra detail yet.")}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={badge(true)}>GMFN ID: {safeStr(item.requester_gmfn_id || gmfnId)}</span>
                    <span style={badge(false)}>Community ID: {effectiveClanId || "Not selected"}</span>
                    {item.allow_trust_credit ? (
                      <span style={badge(false)}>Trust credit allowed</span>
                    ) : null}
                  </div>

                  {item.created_at ? (
                    <div
                      style={{
                        marginTop: 8,
                        color: "#64748B",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {safeDateTime(item.created_at)}
                    </div>
                  ) : null}

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
                      onClick={() =>
                        handleUpdateStatus(Number(item.id || 0), "fulfilled")
                      }
                      style={secondaryBtn()}
                      disabled={workingId === Number(item.id || 0)}
                    >
                      Mark fulfilled
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateStatus(Number(item.id || 0), "cancelled")
                      }
                      style={secondaryBtn()}
                      disabled={workingId === Number(item.id || 0)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Visible community demand</div>

          <div
            style={{
              marginTop: 10,
              color: "#5F7287",
              fontSize: 14,
              lineHeight: 1.75,
            }}
          >
            This is the lighter preview of other visible demand in the selected
            community surface.
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {loading ? (
              <div style={{ color: "#64748B" }}>Loading visible demand...</div>
            ) : communityItems.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.75 }}>
                No visible community demand is open right now.
              </div>
            ) : (
              communityItems.slice(0, 8).map((item) => (
                <div key={Number(item.id || 0)} style={innerCard("#FCFEFF")}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                      {safeStr(item.title || "Need")}
                    </div>

                    <span style={badge(false)}>{urgencyLabel(item.urgency)}</span>
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      color: "#5F7287",
                      fontSize: 14,
                      lineHeight: 1.75,
                    }}
                  >
                    {safeStr(item.description || "No extra detail yet.")}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={badge(true)}>
                      GMFN ID: {safeStr(item.requester_gmfn_id || "Not shown")}
                    </span>
                    <span style={badge(false)}>
                      Community ID: {effectiveClanId || "Not selected"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link to="/app/marketplace" style={secondaryBtn()}>
              Marketplace
            </Link>
            <Link to="/app/community" style={secondaryBtn()}>
              Community Home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}