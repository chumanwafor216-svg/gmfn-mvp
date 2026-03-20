import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { verifyTrustSlip } from "../lib/api";

type VerifyLevel = "minimal" | "standard" | "detailed";

function safeStr(x: any, fallback = ""): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

function normalizeMerchantMessage(x: any): string {
  const s = safeStr(x);
  if (!s) return "";
  return s
    .replace(/â€”|â€"|â€“/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function card(): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function actionLink(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
    cursor: "pointer",
  };
}

function statusBanner(status: string): React.CSSProperties {
  const s = status.toLowerCase();

  if (
    s.includes("valid") ||
    s.includes("active") ||
    s.includes("ok to release goods")
  ) {
    return {
      borderRadius: 18,
      background: "#ECFDF5",
      border: "1px solid #A7F3D0",
      color: "#065F46",
      padding: 16,
      fontWeight: 1000,
      fontSize: 18,
    };
  }

  if (
    s.includes("expired") ||
    s.includes("revoked") ||
    s.includes("invalid") ||
    s.includes("do not release") ||
    s.includes("frozen")
  ) {
    return {
      borderRadius: 18,
      background: "#FEF2F2",
      border: "1px solid #FECACA",
      color: "#991B1B",
      padding: 16,
      fontWeight: 1000,
      fontSize: 18,
    };
  }

  return {
    borderRadius: 18,
    background: "#FFF7ED",
    border: "1px solid #FED7AA",
    color: "#9A3412",
    padding: 16,
    fontWeight: 1000,
    fontSize: 18,
  };
}

function pagePattern(): string {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="320" viewBox="0 0 1600 320">
    <rect width="1600" height="320" fill="#F8FBFE"/>
    <g fill="none" stroke="#C7D9EE" stroke-opacity="0.40" stroke-width="2">
      <path d="M70 170 C180 90, 290 90, 400 170 S620 250, 730 170" />
      <path d="M900 170 C1010 90, 1120 90, 1230 170 S1450 250, 1560 170" />
    </g>
    <g fill="#D6AF47" fill-opacity="0.92">
      <path d="M70 160 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M180 96 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M290 96 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M400 160 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
    </g>
  </svg>`.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function safeLevel(value: string | null): VerifyLevel {
  if (value === "minimal" || value === "standard" || value === "detailed") {
    return value;
  }
  return "standard";
}

export default function TrustSlipVerifyPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();

  const codeFromParam = safeStr(params.code);
  const codeFromQuery = safeStr(searchParams.get("code"));
  const code = codeFromParam || codeFromQuery;

  const level = safeLevel(searchParams.get("level"));
  const pattern = useMemo(() => pagePattern(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setErr("");

      try {
        if (!code) {
          throw new Error("TrustSlip code is missing. Open this page with /t/{code} or ?code={code}.");
        }

        const res = await verifyTrustSlip(code, level);

        if (active) {
          setData(res || null);
        }
      } catch (e: any) {
        if (active) {
          setErr(String(e?.message || e || "Unable to verify TrustSlip."));
          setData(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [code, level]);

  const merchantView = data?.merchant_view || {};
  const merchantSummary = merchantView?.merchant_summary || {};

  const displayName = safeStr(
    merchantView?.display_name ||
      merchantSummary?.display_name ||
      data?.holder_gmfn_id ||
      "Member"
  );

  const gmfnId = safeStr(
    merchantView?.gmfn_id ||
      merchantSummary?.gmfn_id ||
      data?.holder_gmfn_id ||
      "N/A"
  );

  const community = safeStr(
    merchantView?.community || merchantSummary?.community || "—"
  );

  const band = safeStr(
    merchantView?.band || merchantSummary?.band || "—"
  );

  const trustLimit = safeStr(
    data?.trust_limit ||
      data?.trust_slip_limit ||
      merchantSummary?.trust_limit ||
      merchantView?.trust_limit ||
      "0.00"
  );

  const currency = safeStr(
    data?.currency || merchantSummary?.currency || merchantView?.currency || "NGN"
  );

  const issued = safeStr(data?.issued_at || data?.created_at || "—");
  const expires = safeStr(data?.expires_at || merchantSummary?.expires_at || "—");
  const effectiveStatus = safeStr(data?.effective_status || data?.status || "unknown");
  const merchantMessage = normalizeMerchantMessage(
    data?.merchant_message || effectiveStatus
  );

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: 20 }}>
      <div
        style={{
          backgroundImage: `url("${pattern}")`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          borderRadius: 28,
          border: "1px solid rgba(11,31,51,0.06)",
          overflow: "hidden",
          backgroundColor: "#F8FBFE",
        }}
      >
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 36, fontWeight: 1000, color: "#0B1F33" }}>
            TrustSlip Verification
          </div>
          <div style={{ marginTop: 10, color: "#6B7A88", lineHeight: 1.8 }}>
            Independent verification of community-backed trust visibility.
          </div>

          {loading ? (
            <div style={{ ...card(), marginTop: 18, fontWeight: 900 }}>
              Loading verification...
            </div>
          ) : null}

          {err ? (
            <div
              style={{
                ...card(),
                marginTop: 18,
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#991B1B",
                fontWeight: 900,
              }}
            >
              {err}
            </div>
          ) : null}

          {!loading && !err && data ? (
            <>
              <div style={{ marginTop: 18, ...statusBanner(merchantMessage) }}>
                {merchantMessage}
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "grid",
                  gridTemplateColumns: "1.15fr 0.85fr",
                  gap: 18,
                }}
              >
                <div style={card()}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748B",
                      fontWeight: 1000,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Verified TrustSlip
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 30,
                      fontWeight: 1000,
                      color: "#0B1F33",
                    }}
                  >
                    {displayName}
                  </div>

                  <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                    <div style={{ color: "#475569", lineHeight: 1.8 }}>
                      <b>GMFN ID:</b> {gmfnId}
                    </div>
                    <div style={{ color: "#475569", lineHeight: 1.8 }}>
                      <b>Community:</b> {community}
                    </div>
                    <div style={{ color: "#475569", lineHeight: 1.8 }}>
                      <b>Band:</b> {band}
                    </div>
                    <div style={{ color: "#475569", lineHeight: 1.8 }}>
                      <b>Trust Limit:</b> {trustLimit} {currency}
                    </div>
                    <div style={{ color: "#475569", lineHeight: 1.8 }}>
                      <b>Issued:</b> {issued}
                    </div>
                    <div style={{ color: "#475569", lineHeight: 1.8 }}>
                      <b>Expires:</b> {expires}
                    </div>
                    <div style={{ color: "#475569", lineHeight: 1.8 }}>
                      <b>Status:</b> {effectiveStatus}
                    </div>
                  </div>
                </div>

                <div style={card()}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 1000,
                      color: "#0B1F33",
                    }}
                  >
                    Merchant Guidance
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      color: "#6B7A88",
                      lineHeight: 1.9,
                    }}
                  >
                    This verification confirms whether the TrustSlip is currently
                    valid, expired, frozen, revoked, or otherwise not valid for
                    trust-based release decisions.
                  </div>

                  <div
                    style={{
                      marginTop: 16,
                      padding: 14,
                      borderRadius: 14,
                      background: "#F8FAFC",
                      border: "1px solid rgba(11,31,51,0.06)",
                      color: "#475569",
                      lineHeight: 1.8,
                    }}
                  >
                    {safeStr(
                      data?.offline_note ||
                        "If network drops, screenshot this page and re-verify later using the same code."
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      padding: 14,
                      borderRadius: 14,
                      background: "#F8FAFC",
                      border: "1px solid rgba(11,31,51,0.06)",
                      color: "#475569",
                      lineHeight: 1.8,
                    }}
                  >
                    {safeStr(
                      data?.pilot_note ||
                        "GMFN is non-custodial in MVP. This verifies TrustSlip validity only."
                    )}
                  </div>
                </div>
              </div>

              <div style={{ ...card(), marginTop: 18 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 1000,
                    color: "#0B1F33",
                  }}
                >
                  Verification Details
                </div>

                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  <div style={{ color: "#475569", lineHeight: 1.8 }}>
                    <b>Code:</b> {safeStr(data?.code || code, "—")}
                  </div>
                  <div style={{ color: "#475569", lineHeight: 1.8 }}>
                    <b>Verified At:</b> {safeStr(data?.verified_at, "—")}
                  </div>
                  <div style={{ color: "#475569", lineHeight: 1.8 }}>
                    <b>Visibility Level:</b>{" "}
                    {safeStr(merchantView?.visibility_level || level, "standard")}
                  </div>
                  <div style={{ color: "#475569", lineHeight: 1.8 }}>
                    <b>Snapshot Version:</b> {safeStr(data?.snapshot_version, "—")}
                  </div>
                  <div style={{ color: "#475569", lineHeight: 1.8, wordBreak: "break-word" }}>
                    <b>Snapshot Checksum:</b> {safeStr(data?.snapshot_checksum, "—")}
                  </div>
                </div>

                <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link to="/cover" style={actionLink(false)}>
                    Open Cover
                  </Link>
                  <Link to="/login" style={actionLink(false)}>
                    Open Login
                  </Link>
                  <Link to="/app/trust-slip" style={actionLink(true)}>
                    Open TrustSlip
                  </Link>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
