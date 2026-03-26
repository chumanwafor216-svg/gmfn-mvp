import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  createMarketplaceRequest,
  getMe,
  getSelectedClanId,
  listMarketplaceRequests,
  MarketplaceRequestItem,
  updateMarketplaceRequestStatus,
} from "../lib/api";
import { HUMANIZED } from "../lib/humanizedText";

type SummaryCounts = {
  openVisible: number;
  myOpen: number;
};

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.10)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 22px 54px rgba(15,23,42,0.07), 0 2px 8px rgba(15,23,42,0.03)",
    overflow: "hidden",
  };
}

function card(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 20,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 18,
    boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
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

function btn(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 12,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.12)",
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    opacity: disabled ? 0.85 : 1,
  };
}

function smallBtn(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 12px",
    borderRadius: 12,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.12)",
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.85 : 1,
  };
}

function tiny(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 1000,
    letterSpacing: 0.2,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4F6B8A",
    fontWeight: 1000,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    marginTop: 6,
    width: "100%",
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.12)",
    padding: "12px 14px",
    outline: "none",
    background: "#FFFFFF",
    boxSizing: "border-box",
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

function urgencyPill(value?: string | null): React.CSSProperties {
  const v = String(value || "").toLowerCase();
  if (v === "high") {
    return {
      display: "inline-flex",
      padding: "4px 8px",
      borderRadius: 999,
      background: "#FEF2F2",
      color: "#991B1B",
      fontWeight: 900,
      fontSize: 12,
      border: "1px solid rgba(239,68,68,0.12)",
    };
  }
  if (v === "low") {
    return {
      display: "inline-flex",
      padding: "4px 8px",
      borderRadius: 999,
      background: "#F0FDF4",
      color: "#166534",
      fontWeight: 900,
      fontSize: 12,
      border: "1px solid rgba(34,197,94,0.12)",
    };
  }
  return {
    display: "inline-flex",
    padding: "4px 8px",
    borderRadius: 999,
    background: "#FFFBEB",
    color: "#92400E",
    fontWeight: 900,
    fontSize: 12,
    border: "1px solid rgba(245,158,11,0.12)",
  };
}

function statusPill(value?: string | null): React.CSSProperties {
  const v = String(value || "").toLowerCase();
  if (v === "fulfilled") {
    return {
      display: "inline-flex",
      padding: "4px 8px",
      borderRadius: 999,
      background: "#F0FDF4",
      color: "#166534",
      fontWeight: 900,
      fontSize: 12,
    };
  }
  if (v === "cancelled" || v === "expired") {
    return {
      display: "inline-flex",
      padding: "4px 8px",
      borderRadius: 999,
      background: "#F8FAFC",
      color: "#475569",
      fontWeight: 900,
      fontSize: 12,
    };
  }
  return {
    display: "inline-flex",
    padding: "4px 8px",
    borderRadius: 999,
    background: "#EFF6FF",
    color: "#1D4ED8",
    fontWeight: 900,
    fontSize: 12,
  };
}

function trustPill(band?: string | null): React.CSSProperties {
  const v = String(band || "").toLowerCase();
  if (v.includes("strong") || v.includes("high")) {
    return {
      display: "inline-flex",
      padding: "4px 8px",
      borderRadius: 999,
      background: "#ECFDF5",
      color: "#065F46",
      fontWeight: 900,
      fontSize: 12,
      border: "1px solid rgba(16,185,129,0.12)",
    };
  }
  if (v.includes("new") || v.includes("low")) {
    return {
      display: "inline-flex",
      padding: "4px 8px",
      borderRadius: 999,
      background: "#F8FAFC",
      color: "#475569",
      fontWeight: 900,
      fontSize: 12,
      border: "1px solid rgba(148,163,184,0.16)",
    };
  }
  return {
    display: "inline-flex",
    padding: "4px 8px",
    borderRadius: 999,
    background: "#EFF6FF",
    color: "#1D4ED8",
    fontWeight: 900,
    fontSize: 12,
    border: "1px solid rgba(59,130,246,0.12)",
  };
}

function typePill(value?: string | null): React.CSSProperties {
  const v = String(value || "").toLowerCase();
  if (v === "product") {
    return {
      display: "inline-flex",
      padding: "4px 8px",
      borderRadius: 999,
      background: "#EEF2FF",
      color: "#4338CA",
      fontWeight: 900,
      fontSize: 12,
      border: "1px solid rgba(99,102,241,0.12)",
    };
  }
  return {
    display: "inline-flex",
    padding: "4px 8px",
    borderRadius: 999,
    background: "#ECFDF5",
    color: "#065F46",
    fontWeight: 900,
    fontSize: 12,
    border: "1px solid rgba(16,185,129,0.12)",
  };
}

function normalizeRequestType(value?: string | null): "product" | "service" {
  const v = String(value || "").trim().toLowerCase();
  return v === "product" ? "product" : "service";
}

function formatUrgencyLabel(value?: string | null): string {
  const v = String(value || "").toLowerCase();
  if (v === "high") return "Urgent";
  if (v === "low") return "Low pressure";
  return "Normal";
}

function formatStatusLabel(value?: string | null): string {
  const v = String(value || "").toLowerCase();
  if (v === "fulfilled") return "Fulfilled";
  if (v === "cancelled") return "Cancelled";
  if (v === "expired") return "Expired";
  return "Open";
}

function normalizeWhatsappNumber(phone?: string | null): string {
  return String(phone || "").replace(/[^\d]/g, "");
}

export default function DemandBoxPage() {
  const demandTitle =
    HUMANIZED?.demandTitle || "Post what you need — your people can respond.";

  const demandSubtitle =
    HUMANIZED?.demandHelper ||
    "Keep it short. Share your need once and let connected communities see it.";

  const [me, setMe] = useState<any>(null);
  const [items, setItems] = useState<MarketplaceRequestItem[]>([]);
  const [summaryCounts, setSummaryCounts] = useState<SummaryCounts>({
    openVisible: 0,
    myOpen: 0,
  });

  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [statusFilter, setStatusFilter] = useState("open");
  const [mineOnly, setMineOnly] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requestType, setRequestType] = useState<"product" | "service">("service");
  const [category, setCategory] = useState("service");
  const [urgency, setUrgency] = useState("medium");
  const [area, setArea] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(48);
  const [paymentMode, setPaymentMode] = useState("");
  const [allowTrustCredit, setAllowTrustCredit] = useState(false);

  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const selectedClanId = Number(getSelectedClanId() || 0);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const params =
        statusFilter === "all"
          ? { mine_only: mineOnly, limit: 100 }
          : { status: statusFilter, mine_only: mineOnly, limit: 100 };

      const [meRes, rows, openRows, myOpenRows] = await Promise.all([
        getMe().catch(() => null),
        listMarketplaceRequests(params).catch(() => []),
        listMarketplaceRequests({
          status: "open",
          mine_only: false,
          limit: 100,
        }).catch(() => []),
        listMarketplaceRequests({
          status: "open",
          mine_only: true,
          limit: 100,
        }).catch(() => []),
      ]);

      const loadedRows = Array.isArray(rows) ? rows : [];
      const loadedOpenRows = Array.isArray(openRows) ? openRows : [];
      const loadedMyOpenRows = Array.isArray(myOpenRows) ? myOpenRows : [];

      setMe(meRes || null);
      setItems(loadedRows);
      setSummaryCounts({
        openVisible: loadedOpenRows.length,
        myOpen: loadedMyOpenRows.length,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load demand box.");
      setItems([]);
      setSummaryCounts({
        openVisible: 0,
        myOpen: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter, mineOnly]);

  useEffect(() => {
    setCategory(requestType);
  }, [requestType]);

  useEffect(() => {
    if (showPostForm && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [showPostForm]);

  async function submitRequest() {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Please tell people what you need.");
      return;
    }

    setPosting(true);
    setError("");
    setFeedback("");

    try {
      await createMarketplaceRequest({
        title: cleanTitle,
        description: description.trim(),
        category: category.trim() || requestType,
        urgency,
        area: area.trim(),
        whatsapp_number: whatsappNumber.trim(),
        expires_in_hours: Number(expiresInHours || 48),
        payment_mode: paymentMode.trim(),
        allow_trust_credit: allowTrustCredit,
      });

      setTitle("");
      setDescription("");
      setRequestType("service");
      setCategory("service");
      setUrgency("medium");
      setArea("");
      setWhatsappNumber("");
      setExpiresInHours(48);
      setPaymentMode("");
      setAllowTrustCredit(false);
      setShowMoreOptions(false);
      setShowPostForm(false);
      setFeedback("Your demand has been posted.");

      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to share your need.");
    } finally {
      setPosting(false);
    }
  }

  async function markStatus(
    requestId: number,
    status: "fulfilled" | "cancelled"
  ) {
    setError("");
    setFeedback("");

    try {
      await updateMarketplaceRequestStatus(requestId, status);
      setFeedback(
        status === "fulfilled"
          ? "Request marked as fulfilled."
          : "Request closed."
      );
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to update request.");
    }
  }

  function openWhatsapp(item: MarketplaceRequestItem) {
    const phone = normalizeWhatsappNumber(item.whatsapp_number);
    if (!phone) {
      setError("No WhatsApp number is available for this post.");
      return;
    }

    const message = encodeURIComponent(
      `Hello, I saw your GMFN post: "${item.title}". I can help.`
    );

    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  }

  const visibleOpenItems = useMemo(
    () => items.filter((x) => String(x.status || "").toLowerCase() === "open"),
    [items]
  );

  const myVisibleItems = useMemo(() => {
    const myId = safeStr(me?.gmfn_id || "");
    if (!myId) return [];
    return items.filter(
      (item) => safeStr(item.requester_gmfn_id || "") === myId
    );
  }, [items, me?.gmfn_id]);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 30 }}>
      <div
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
          marginTop: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 18,
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: 760 }}>
            <div style={sectionLabel()}>Demand Box</div>

            <div
              style={{
                marginTop: 10,
                fontSize: 30,
                fontWeight: 1000,
                color: "#0B1F33",
                lineHeight: 1.15,
              }}
            >
              {demandTitle}
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#6B7A88",
                lineHeight: 1.7,
                fontSize: 14,
                maxWidth: 760,
              }}
            >
              {demandSubtitle}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "#FFFFFF",
                  border: "1px solid rgba(11,31,51,0.08)",
                  color: "#0B1F33",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                Identity-based
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "#FFFFFF",
                  border: "1px solid rgba(11,31,51,0.08)",
                  color: "#0B1F33",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                Visible through your communities
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "#FFFFFF",
                  border: "1px solid rgba(11,31,51,0.08)",
                  color: "#0B1F33",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                No shop required
              </div>
            </div>
          </div>

          <div
            style={{
              minWidth: 240,
              flex: "0 1 300px",
              ...softCard("#FFFFFF"),
            }}
          >
            <div style={tiny()}>Quick links</div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Link to="/app/community" style={btn(false)}>
                Community Home
              </Link>
              <Link to="/app/marketplace" style={btn(true)}>
                Marketplace
              </Link>
            </div>

            <div
              style={{
                marginTop: 12,
                color: "#64748B",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              {selectedClanId
                ? `Selected community context is active.`
                : "No selected community context yet."}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div
          style={{
            ...card("#FEF2F2"),
            marginTop: 18,
            border: "1px solid rgba(239,68,68,0.18)",
            color: "#991B1B",
            fontWeight: 800,
          }}
        >
          {error}
        </div>
      ) : null}

      {feedback ? (
        <div
          style={{
            ...card("#ECFDF5"),
            marginTop: 18,
            border: "1px solid rgba(16,185,129,0.18)",
            color: "#065F46",
            fontWeight: 800,
          }}
        >
          {feedback}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <div style={softCard()}>
          <div style={tiny()}>OPEN NOW</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 26,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {summaryCounts.openVisible}
          </div>
          <div style={{ marginTop: 6, color: "#64748B", fontSize: 14 }}>
            Active visible posts across your current view.
          </div>
        </div>

        <div style={softCard()}>
          <div style={tiny()}>MY OPEN POSTS</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 26,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {summaryCounts.myOpen}
          </div>
          <div style={{ marginTop: 6, color: "#64748B", fontSize: 14 }}>
            Your currently open demand posts.
          </div>
        </div>

        <div style={softCard()}>
          <div style={tiny()}>VISIBLE RIGHT NOW</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 26,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {visibleOpenItems.length}
          </div>
          <div style={{ marginTop: 6, color: "#64748B", fontSize: 14 }}>
            Open items in the list you are currently viewing.
          </div>
        </div>

        <div style={softCard()}>
          <div style={tiny()}>MY VISIBLE POSTS</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 26,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {myVisibleItems.length}
          </div>
          <div style={{ marginTop: 6, color: "#64748B", fontSize: 14 }}>
            Your items in the current filtered list.
          </div>
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={tiny()}>POST A NEED</div>
            <div
              style={{
                marginTop: 6,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              Start with one clear line. Add more only if it helps someone respond faster.
            </div>
          </div>

          <button
            type="button"
            style={smallBtn(true)}
            onClick={() => setShowPostForm((v) => !v)}
          >
            {showPostForm ? "Close" : `+ ${HUMANIZED?.postNeed || "Post Need"}`}
          </button>
        </div>

        {showPostForm ? (
          <div
            style={{
              ...softCard("#FFFFFF"),
              marginTop: 14,
              display: "grid",
              gap: 14,
            }}
          >
            <div>
              <div style={tiny()}>WHAT DO YOU NEED?</div>
              <input
                ref={titleInputRef}
                value={title}
                maxLength={40}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  requestType === "product"
                    ? "e.g. 5 bags of cement"
                    : "e.g. Need a plumber today"
                }
                style={inputStyle()}
              />

              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  color: "#64748B",
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                <span>
                  Examples: Plumber, Electrician, Painter, Cement, Welding repair.
                </span>
                <span style={{ fontWeight: 900 }}>{title.length}/40</span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              <div>
                <div style={tiny()}>TYPE</div>
                <select
                  value={requestType}
                  onChange={(e) =>
                    setRequestType(e.target.value === "product" ? "product" : "service")
                  }
                  style={inputStyle()}
                >
                  <option value="service">Service</option>
                  <option value="product">Product</option>
                </select>
              </div>

              <div>
                <div style={tiny()}>CATEGORY</div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={inputStyle()}
                >
                  {requestType === "service" ? (
                    <>
                      <option value="service">Service</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="electrical">Electrical</option>
                      <option value="painting">Painting</option>
                      <option value="building">Building</option>
                      <option value="transport">Transport</option>
                      <option value="other">Other</option>
                    </>
                  ) : (
                    <>
                      <option value="product">Product</option>
                      <option value="cement">Cement</option>
                      <option value="wiring">Wiring</option>
                      <option value="tiles">Tiles</option>
                      <option value="tools">Tools</option>
                      <option value="food">Food</option>
                      <option value="other">Other</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <div style={tiny()}>AREA</div>
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. Aba South"
                  style={inputStyle()}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                style={smallBtn(false)}
                onClick={() => setShowMoreOptions((v) => !v)}
              >
                {showMoreOptions ? "Hide more options" : "More options"}
              </button>
            </div>

            {showMoreOptions ? (
              <div
                style={{
                  display: "grid",
                  gap: 14,
                  padding: 14,
                  borderRadius: 16,
                  background: "#F8FBFF",
                  border: "1px solid rgba(11,31,51,0.08)",
                }}
              >
                <div>
                  <div style={tiny()}>MORE DETAIL</div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add useful detail so the right person can respond quickly"
                    rows={4}
                    style={{
                      ...inputStyle(),
                      resize: "vertical",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={tiny()}>URGENCY</div>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value)}
                      style={inputStyle()}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Normal</option>
                      <option value="high">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <div style={tiny()}>WHATSAPP NUMBER</div>
                    <input
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="e.g. 2348012345678"
                      style={inputStyle()}
                    />
                  </div>

                  <div>
                    <div style={tiny()}>HOW LONG SHOULD IT STAY OPEN?</div>
                    <select
                      value={expiresInHours}
                      onChange={(e) => setExpiresInHours(Number(e.target.value))}
                      style={inputStyle()}
                    >
                      <option value={12}>12 hours</option>
                      <option value={24}>24 hours</option>
                      <option value={48}>48 hours</option>
                      <option value={72}>72 hours</option>
                    </select>
                  </div>

                  <div>
                    <div style={tiny()}>
                      {HUMANIZED?.paymentLabel || "HOW CAN YOU PAY?"}
                    </div>
                    <input
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      placeholder="Cash, transfer, flexible..."
                      style={inputStyle()}
                    />
                  </div>
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#0B1F33",
                    fontWeight: 700,
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={allowTrustCredit}
                    onChange={(e) => setAllowTrustCredit(e.target.checked)}
                  />
                  Allow trust-backed fulfilment
                </label>
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                style={btn(true, posting)}
                disabled={posting}
                onClick={submitRequest}
              >
                {posting ? "Posting..." : HUMANIZED?.postNeed || "Post Need"}
              </button>

              <button
                type="button"
                style={btn(false)}
                onClick={() => {
                  setShowPostForm(false);
                  setShowMoreOptions(false);
                }}
              >
                Not now
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={tiny()}>DEMAND FLOW</div>
            <div
              style={{
                marginTop: 6,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              See what people need now. Respond quickly where you can help.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                borderRadius: 12,
                border: "1px solid rgba(11,31,51,0.12)",
                padding: "10px 12px",
                background: "#FFFFFF",
              }}
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="all">All</option>
            </select>

            <button
              type="button"
              style={smallBtn(mineOnly)}
              onClick={() => setMineOnly((v) => !v)}
            >
              {mineOnly ? "Showing only mine" : "Show mine only"}
            </button>

            <button type="button" style={smallBtn(false)} onClick={load}>
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ marginTop: 14, color: "#64748B" }}>Loading demand flow...</div>
        ) : items.length === 0 ? (
          <div
            style={{
              marginTop: 14,
              borderRadius: 16,
              background: "#F8FBFF",
              border: "1px solid rgba(11,31,51,0.06)",
              padding: 16,
              color: "#64748B",
              lineHeight: 1.7,
            }}
          >
            Nothing is open right now.
            <br />
            Be the first to post what you need.
          </div>
        ) : (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {items.map((item) => {
              const isOpen = String(item.status || "").toLowerCase() === "open";
              const requesterLabel = safeStr(
                item.requester_name ||
                  item.requester_nickname ||
                  item.requester_email ||
                  "Member"
              );

              const derivedType = normalizeRequestType(item.category);
              const trustBand = safeStr(item.requester_trust_band || "");
              const isMine =
                safeStr(me?.gmfn_id || "") &&
                safeStr(item.requester_gmfn_id || "") === safeStr(me?.gmfn_id || "");

              return (
                <div
                  key={item.id}
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(11,31,51,0.08)",
                    background: "#FFFFFF",
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 20 }}>
                        {safeStr(item.title)}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={typePill(derivedType)}>
                          {derivedType === "product" ? "Product" : "Service"}
                        </span>

                        <span style={urgencyPill(item.urgency)}>
                          {formatUrgencyLabel(item.urgency)}
                        </span>

                        <span style={statusPill(item.status)}>
                          {formatStatusLabel(item.status)}
                        </span>

                        {trustBand ? (
                          <span style={trustPill(trustBand)}>{trustBand}</span>
                        ) : null}

                        {item.allow_trust_credit ? (
                          <span
                            style={{
                              display: "inline-flex",
                              padding: "4px 8px",
                              borderRadius: 999,
                              background: "#EFF6FF",
                              color: "#1D4ED8",
                              fontWeight: 900,
                              fontSize: 12,
                            }}
                          >
                            Trust-backed allowed
                          </span>
                        ) : null}

                        {isMine ? <span style={trustPill("mine")}>Your post</span> : null}
                      </div>
                    </div>

                    <div style={{ color: "#64748B", fontSize: 13 }}>
                      Posted: {safeDateTime(item.created_at) || "—"}
                    </div>
                  </div>

                  {item.description ? (
                    <div
                      style={{
                        marginTop: 10,
                        color: "#64748B",
                        fontSize: 14,
                        lineHeight: 1.7,
                      }}
                    >
                      {safeStr(item.description)}
                    </div>
                  ) : null}

                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 8,
                    }}
                  >
                    <div style={{ color: "#475569", fontSize: 13 }}>
                      <strong>Name:</strong> {requesterLabel}
                    </div>

                    <div style={{ color: "#475569", fontSize: 13 }}>
                      <strong>GMFN ID:</strong> {safeStr(item.requester_gmfn_id || "—")}
                    </div>

                    <div style={{ color: "#475569", fontSize: 13 }}>
                      <strong>Area:</strong> {safeStr(item.area || "—")}
                    </div>

                    <div style={{ color: "#475569", fontSize: 13 }}>
                      <strong>Payment:</strong> {safeStr(item.payment_mode || "—")}
                    </div>
                  </div>

                  <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {isOpen ? (
                      <button
                        type="button"
                        style={smallBtn(true)}
                        onClick={() => openWhatsapp(item)}
                      >
                        I can help
                      </button>
                    ) : null}

                    {isOpen && typeof item.id === "number" && isMine ? (
                      <button
                        type="button"
                        style={smallBtn(false)}
                        onClick={() => markStatus(item.id, "fulfilled")}
                      >
                        {HUMANIZED?.fulfilled || "Mark as Fulfilled"}
                      </button>
                    ) : null}

                    {isOpen && typeof item.id === "number" && isMine ? (
                      <button
                        type="button"
                        style={smallBtn(false)}
                        onClick={() => markStatus(item.id, "cancelled")}
                      >
                        Close this post
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}