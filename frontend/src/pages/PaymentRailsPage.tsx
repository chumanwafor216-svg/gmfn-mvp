// FILE: src/pages/PaymentRailsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { getPaymentRails } from "../lib/api";

type RailItem = {
  key: string;
  name: string;
  direction: "Inbound" | "Outbound" | "General";
  status: string;
  provider: string;
  currencies: string[];
  countries: string[];
  note: string;
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
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    minHeight: 42,
    borderRadius: 14,
    border: "none",
    background: disabled ? "#CBD5E1" : "#0B63D1",
    color: "#FFFFFF",
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "nowrap",
  };
}

function secondaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    minHeight: 42,
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.72 : 1,
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

function feedbackCard(success: boolean): React.CSSProperties {
  return {
    ...pageCard(success ? "#ECFDF5" : "#FEF2F2"),
    border: success ? "1px solid #A7F3D0" : "1px solid #FECACA",
    color: success ? "#065F46" : "#991B1B",
    fontWeight: 900,
    padding: 14,
  };
}

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

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const text = safeStr(value);
    if (!text) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }

  return out;
}

function toStringArray(...values: any[]): string[] {
  const out: string[] = [];

  for (const value of values) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const text = safeStr(item);
        if (text) out.push(text);
      }
      continue;
    }

    const text = safeStr(value);
    if (!text) continue;

    if (text.includes(",") || text.includes("|")) {
      const parts = text.split(/[,|]/g).map((part) => safeStr(part));
      for (const part of parts) {
        if (part) out.push(part);
      }
      continue;
    }

    out.push(text);
  }

  return dedupeStrings(out);
}

function normalizeDirection(value: any): "Inbound" | "Outbound" | "General" {
  const raw = safeStr(value).toLowerCase();

  if (
    raw.includes("inbound") ||
    raw === "in" ||
    raw.includes("deposit") ||
    raw.includes("credit") ||
    raw.includes("receive")
  ) {
    return "Inbound";
  }

  if (
    raw.includes("outbound") ||
    raw === "out" ||
    raw.includes("withdraw") ||
    raw.includes("payout") ||
    raw.includes("debit") ||
    raw.includes("disburse")
  ) {
    return "Outbound";
  }

  return "General";
}

function normalizeStatus(rawStatus: any, enabledValue?: any): string {
  const status = safeStr(rawStatus);
  if (status) return status;

  if (enabledValue === true) return "active";
  if (enabledValue === false) return "disabled";

  return "unknown";
}

function isActiveStatus(status: string): boolean {
  const s = safeStr(status).toLowerCase();

  return (
    s.includes("active") ||
    s.includes("enabled") ||
    s.includes("available") ||
    s.includes("ready") ||
    s.includes("live") ||
    s === "ok"
  );
}

function railStatusTone(status: string) {
  const s = safeStr(status).toLowerCase();

  if (isActiveStatus(s)) {
    return {
      bg: "#ECFDF5",
      border: "1px solid #A7F3D0",
      text: "#065F46",
    };
  }

  if (
    s.includes("pending") ||
    s.includes("review") ||
    s.includes("limited") ||
    s.includes("partial")
  ) {
    return {
      bg: "#EFF6FF",
      border: "1px solid #BFDBFE",
      text: "#1D4ED8",
    };
  }

  if (
    s.includes("disabled") ||
    s.includes("blocked") ||
    s.includes("down") ||
    s.includes("inactive") ||
    s.includes("failed")
  ) {
    return {
      bg: "#FEF2F2",
      border: "1px solid #FECACA",
      text: "#991B1B",
    };
  }

  return {
    bg: "#F8FAFC",
    border: "1px solid #E2E8F0",
    text: "#475569",
  };
}

function parseRail(raw: any, forcedDirection?: string): RailItem | null {
  if (!raw || typeof raw !== "object") return null;

  const src = raw?.item || raw?.rail || raw;

  const name = firstTruthy(
    src?.name,
    src?.title,
    src?.rail_name,
    src?.method,
    src?.channel,
    src?.bank_name,
    src?.provider_name,
    src?.provider,
    "Rail"
  );

  const provider = firstTruthy(
    src?.provider_name,
    src?.provider,
    src?.institution_name,
    src?.bank_name
  );

  const direction = normalizeDirection(
    forcedDirection ||
      src?.direction ||
      src?.type ||
      src?.kind ||
      src?.flow ||
      src?.category ||
      src?.mode
  );

  const status = normalizeStatus(
    src?.status || src?.state || src?.availability,
    src?.enabled ?? src?.active ?? src?.is_enabled ?? src?.is_active
  );

  const currencies = toStringArray(
    src?.currencies,
    src?.supported_currencies,
    src?.currency_codes,
    src?.currency,
    src?.currency_code
  );

  const countries = toStringArray(
    src?.countries,
    src?.supported_countries,
    src?.country_codes,
    src?.country,
    src?.country_code
  );

  const note = firstTruthy(src?.note, src?.description, src?.detail, src?.summary);

  const key = firstTruthy(
    String(src?.id || ""),
    `${direction}-${name}-${provider || "provider"}-${status}`
  );

  return {
    key,
    name,
    direction,
    status,
    provider,
    currencies,
    countries,
    note,
  };
}

function extractRails(payload: any): RailItem[] {
  const out: RailItem[] = [];

  function addBucket(bucket: any, forcedDirection?: string) {
    if (!bucket) return;

    if (Array.isArray(bucket)) {
      for (const row of bucket) {
        const parsed = parseRail(row, forcedDirection);
        if (parsed) out.push(parsed);
      }
      return;
    }

    if (typeof bucket === "object") {
      const direct = parseRail(bucket, forcedDirection);
      if (
        direct &&
        (safeStr(bucket?.name) ||
          safeStr(bucket?.provider_name) ||
          safeStr(bucket?.provider) ||
          safeStr(bucket?.bank_name) ||
          safeStr(bucket?.direction) ||
          safeStr(bucket?.type) ||
          safeStr(bucket?.kind))
      ) {
        out.push(direct);
      }
    }
  }

  addBucket(payload);
  addBucket(payload?.items);
  addBucket(payload?.rails);
  addBucket(payload?.payment_rails);
  addBucket(payload?.data?.items);
  addBucket(payload?.data?.rails);

  addBucket(payload?.inbound, "inbound");
  addBucket(payload?.outbound, "outbound");
  addBucket(payload?.inbound_rails, "inbound");
  addBucket(payload?.outbound_rails, "outbound");
  addBucket(payload?.deposit_rails, "inbound");
  addBucket(payload?.withdrawal_rails, "outbound");
  addBucket(payload?.payout_rails, "outbound");

  addBucket(payload?.rails?.inbound, "inbound");
  addBucket(payload?.rails?.outbound, "outbound");
  addBucket(payload?.payment_rails?.inbound, "inbound");
  addBucket(payload?.payment_rails?.outbound, "outbound");

  const seen = new Set<string>();
  const deduped: RailItem[] = [];

  for (const item of out) {
    const key = `${item.key}-${item.direction}-${item.name}-${item.provider}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

export default function PaymentRailsPage() {
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

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
      setLoading(true);
      setErr("");

      try {
        const res = await getPaymentRails();
        setData(res || null);
      } catch (e: any) {
        setErr(String(e?.message || e || "Unable to load payment rails."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const rails = useMemo(() => extractRails(data), [data]);

  const inboundRails = useMemo(
    () => rails.filter((item) => item.direction === "Inbound"),
    [rails]
  );

  const outboundRails = useMemo(
    () => rails.filter((item) => item.direction === "Outbound"),
    [rails]
  );

  const generalRails = useMemo(
    () => rails.filter((item) => item.direction === "General"),
    [rails]
  );

  const activeCount = useMemo(
    () => rails.filter((item) => isActiveStatus(item.status)).length,
    [rails]
  );

  const supportedCurrencies = useMemo(() => {
    return dedupeStrings(
      rails.flatMap((item) => item.currencies.map((currency) => safeStr(currency)))
    );
  }, [rails]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        sectionLabel="Payment Rails"
        title="Payment Rails"
        subtitle="Read-only overview of available inbound and outbound rails for GMFN operations."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/loans"
        backLabel="Loans & Support"
        nextLinks={[
          { label: "Pool Deposit Instructions", to: "/app/payment/pool" },
          { label: "Withdrawal Instructions", to: "/app/withdrawal-instructions" },
          { label: "Community Home", to: "/app/community" },
        ]}
        utilityLinks={[
          { label: "Marketplace", to: "/app/marketplace" },
          { label: "Trust", to: "/app/trust" },
        ]}
      />

      {err ? (
        <div style={{ ...feedbackCard(false), marginTop: 18 }}>{err}</div>
      ) : null}

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
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>Rails overview</div>

            <div
              style={{
                marginTop: 10,
                fontSize: 30,
                fontWeight: 1000,
                color: "#0B1F33",
                lineHeight: 1.15,
              }}
            >
              Payment rails should stay readable, not hidden in a JSON wall
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#6B7A88",
                lineHeight: 1.8,
              }}
            >
              This page is informational. It shows the currently visible rails for
              inbound and outbound money movement without turning the page into an
              action surface.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Total rails: {rails.length}</span>
              <span style={badge(false)}>Inbound: {inboundRails.length}</span>
              <span style={badge(false)}>Outbound: {outboundRails.length}</span>
              <span style={badge(false)}>Active: {activeCount}</span>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Link to="/app/payment/pool" style={primaryBtn(false)}>
                Pool Deposit Instructions
              </Link>
              <Link to="/app/withdrawal-instructions" style={secondaryBtn(false)}>
                Withdrawal Instructions
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
                Review the visible rails first so the money path stays clearer
                before anyone starts moving funds.
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
                A readable rails surface reduces confusion and makes settlement
                easier to understand and explain.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Total rails</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {loading ? "…" : rails.length}
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Inbound</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {loading ? "…" : inboundRails.length}
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Outbound</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {loading ? "…" : outboundRails.length}
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Currencies</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 18,
              fontWeight: 1000,
              color: "#0B1F33",
              lineHeight: 1.4,
            }}
          >
            {loading
              ? "…"
              : supportedCurrencies.length > 0
              ? supportedCurrencies.join(", ")
              : "Not shown"}
          </div>
        </div>
      </section>

      <section style={{ ...pageCard(), marginTop: 18 }}>
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
            <div style={sectionLabel()}>Structured rail listing</div>
            <div
              style={{
                marginTop: 8,
                color: "#6B7A88",
                lineHeight: 1.8,
              }}
            >
              The page keeps a structured view when the response supports it. The
              full raw response remains available below.
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowRaw((prev) => !prev)}
            style={secondaryBtn(false)}
          >
            {showRaw ? "Hide raw response" : "Show raw response"}
          </button>
        </div>

        {loading ? (
          <div style={{ marginTop: 16, color: "#64748B" }}>
            Loading rail visibility...
          </div>
        ) : rails.length === 0 ? (
          <div style={{ marginTop: 16, color: "#64748B", lineHeight: 1.8 }}>
            No structured rail listing is visible yet. The raw response stays
            available below.
          </div>
        ) : (
          <div style={{ marginTop: 16, display: "grid", gap: 18 }}>
            {[
              {
                title: "Inbound rails",
                items: inboundRails,
              },
              {
                title: "Outbound rails",
                items: outboundRails,
              },
              {
                title: "General rails",
                items: generalRails,
              },
            ]
              .filter((group) => group.items.length > 0)
              .map((group) => (
                <div key={group.title} style={{ display: "grid", gap: 10 }}>
                  <div
                    style={{
                      color: "#0B1F33",
                      fontSize: 18,
                      fontWeight: 1000,
                    }}
                  >
                    {group.title}
                  </div>

                  {group.items.map((rail) => {
                    const tone = railStatusTone(rail.status);

                    return (
                      <div key={rail.key} style={innerCard("#FCFEFF")}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) auto",
                            gap: 12,
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                color: "#0B1F33",
                                fontSize: 17,
                                fontWeight: 1000,
                                lineHeight: 1.35,
                              }}
                            >
                              {rail.name}
                            </div>

                            {rail.provider ? (
                              <div
                                style={{
                                  marginTop: 8,
                                  color: "#64748B",
                                  fontSize: 14,
                                  lineHeight: 1.7,
                                }}
                              >
                                Provider: {rail.provider}
                              </div>
                            ) : null}
                          </div>

                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "6px 10px",
                              borderRadius: 999,
                              background: tone.bg,
                              border: tone.border,
                              color: tone.text,
                              fontSize: 12,
                              fontWeight: 1000,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {safeStr(rail.status || "unknown").toUpperCase()}
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 10,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={badge(true)}>{rail.direction}</span>

                          {rail.currencies.length > 0 ? (
                            <span style={badge(false)}>
                              Currencies: {rail.currencies.join(", ")}
                            </span>
                          ) : null}

                          {rail.countries.length > 0 ? (
                            <span style={badge(false)}>
                              Countries: {rail.countries.join(", ")}
                            </span>
                          ) : null}
                        </div>

                        {rail.note ? (
                          <div
                            style={{
                              marginTop: 10,
                              color: "#64748B",
                              lineHeight: 1.75,
                              fontSize: 14,
                            }}
                          >
                            {rail.note}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        )}

        {showRaw ? (
          <div style={{ marginTop: 18 }}>
            <div style={sectionLabel()}>Raw response</div>
            <pre
              style={{
                marginTop: 12,
                whiteSpace: "pre-wrap",
                fontSize: 13,
                lineHeight: 1.7,
                color: "#334155",
                background: "#F8FAFC",
                border: "1px solid rgba(11,31,51,0.08)",
                borderRadius: 16,
                padding: 16,
                overflowX: "auto",
              }}
            >
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        ) : null}
      </section>
    </div>
  );
}