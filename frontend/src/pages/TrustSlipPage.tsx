import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  getMyTrustSlip,
  getTrustSlipShareBundle,
  safeCopy,
  verifyTrustSlip,
} from "../lib/api";

type ShareLevel = "minimal" | "standard" | "detailed";

type SummaryItem = {
  label: string;
  value: string;
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

function subtleBtn(active = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "8px 12px",
    borderRadius: 12,
    border: active
      ? "1px solid rgba(11,99,209,0.18)"
      : "1px solid rgba(11,31,51,0.10)",
    background: active ? "rgba(11,99,209,0.08)" : "#FFFFFF",
    color: active ? "#0B63D1" : "#24415C",
    fontWeight: 800,
    fontSize: 13,
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

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";

  return String(raw || "").trim().replace(/\/+$/, "");
}

function apiOrigin(): string {
  const base = apiBase();

  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      const u = new URL(base);
      return `${u.protocol}//${u.host}`;
    } catch {
      return "http://127.0.0.1:8012";
    }
  }

  return "http://127.0.0.1:8012";
}

function appOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "";
}

function buildFallbackPublicVerifyUrl(code: string): string {
  const cleaned = safeStr(code);
  if (!cleaned) return "";
  return `${appOrigin()}/t/${encodeURIComponent(cleaned)}`;
}

function summarizeVerification(data: any, level: ShareLevel): SummaryItem[] {
  const items: SummaryItem[] = [];

  const rows: Array<[string, string]> = [
    ["Share level", safeStr(data?.level || level)],
    [
      "Trust band",
      safeStr(
        data?.trust_band ||
          data?.band ||
          data?.current_band ||
          data?.open_trust_band
      ),
    ],
    [
      "Score",
      safeStr(
        data?.trust_score ||
          data?.score ||
          data?.current_score ||
          data?.open_trust_score
      ),
    ],
    [
      "GMFN ID",
      safeStr(data?.gmfn_id || data?.subject_gmfn_id || data?.member_gmfn_id),
    ],
    [
      "Community",
      safeStr(
        data?.community_name ||
          data?.clan_name ||
          data?.selected_community_name
      ),
    ],
    [
      "Status",
      safeStr(data?.status || data?.state || data?.summary_label),
    ],
  ];

  rows.forEach(([label, value]) => {
    if (value) {
      items.push({ label, value });
    }
  });

  return items;
}

export default function TrustSlipPage() {
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [slip, setSlip] = useState<any>(null);
  const [bundle, setBundle] = useState<any>(null);
  const [verificationPreview, setVerificationPreview] = useState<any>(null);
  const [loadingSlip, setLoadingSlip] = useState(true);
  const [loadingBundle, setLoadingBundle] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [shareLevel, setShareLevel] = useState<ShareLevel>("standard");

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
      setLoadingSlip(true);
      try {
        const res = await getMyTrustSlip().catch(() => null);
        setSlip(res);
      } finally {
        setLoadingSlip(false);
      }
    })();
  }, []);

  const trustSlipCode = useMemo(() => safeStr(slip?.code || ""), [slip]);

  useEffect(() => {
    (async () => {
      if (!trustSlipCode) {
        setBundle(null);
        return;
      }

      setLoadingBundle(true);
      try {
        const res = await getTrustSlipShareBundle(trustSlipCode, shareLevel).catch(
          () => null
        );
        setBundle(res);
      } finally {
        setLoadingBundle(false);
      }
    })();
  }, [trustSlipCode, shareLevel]);

  useEffect(() => {
    (async () => {
      if (!trustSlipCode) {
        setVerificationPreview(null);
        return;
      }

      setLoadingPreview(true);
      try {
        const res = await verifyTrustSlip(trustSlipCode, shareLevel).catch(
          () => null
        );
        setVerificationPreview(res);
      } finally {
        setLoadingPreview(false);
      }
    })();
  }, [trustSlipCode, shareLevel]);

  const publicVerifyUrl = useMemo(() => {
    const fromBundle = safeStr(
      bundle?.share_url || bundle?.verify_url || bundle?.public_url || bundle?.url
    );

    return fromBundle || buildFallbackPublicVerifyUrl(trustSlipCode);
  }, [bundle, trustSlipCode]);

  const verificationItems = useMemo(
    () => summarizeVerification(verificationPreview, shareLevel),
    [verificationPreview, shareLevel]
  );

  const readableName = safeStr(
    slip?.display_name || slip?.name || slip?.member_name || "Member"
  );

  const issuedAtText = safeDateTime(
    slip?.issued_at || slip?.created_at || slip?.generated_at
  );

  const expiryText = safeDateTime(
    slip?.expires_at || slip?.expiry_at || slip?.valid_until
  );

  function handleCopyCode() {
    if (!trustSlipCode) return;
    safeCopy(trustSlipCode);
  }

  function handleCopyLink() {
    if (!publicVerifyUrl) return;
    safeCopy(publicVerifyUrl);
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
        sectionLabel="TrustSlip"
        title="TrustSlip"
        subtitle="A calm verification surface for sharing and checking your trust reading without mixing it up with other trust pages."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/trust"
        nextLinks={[
          { label: "My Trust", to: "/app/trust" },
          { label: "Community", to: "/app/community" },
          { label: "Notifications", to: "/app/notifications" },
        ]}
        utilityLinks={[
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
              : "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <div>
            <div style={sectionLabel()}>What this page is for</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.12,
              }}
            >
              TrustSlip is the verification surface.
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
              This page is for sharing or checking a trust reading in a calmer,
              clearer way. It is not the same as your broader trust explanation
              page. My Trust explains the readings. TrustSlip helps verify them.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>
                Share level: {shareLevel}
              </span>
              <span style={badge(false)}>
                Code: {trustSlipCode || "Pending"}
              </span>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>How to use it</div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div style={statTile()}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                  }}
                >
                  1. Choose a share level
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#5F7287",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  Pick the level of detail you want a verifier to see.
                </div>
              </div>

              <div style={statTile()}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                  }}
                >
                  2. Share the link or code
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#5F7287",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  You can share the verification link, the code, or let the
                  person scan the QR.
                </div>
              </div>

              <div style={statTile()}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                  }}
                >
                  3. Keep meaning separate
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#5F7287",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  TrustSlip is for verification. My Trust is where the deeper
                  reading and explanation belong.
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
            : "minmax(0, 1.05fr) minmax(340px, 0.95fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Your current TrustSlip</div>

          {loadingSlip ? (
            <div
              style={{
                marginTop: 14,
                color: "#64748B",
                lineHeight: 1.75,
              }}
            >
              Loading TrustSlip...
            </div>
          ) : trustSlipCode ? (
            <>
              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "minmax(0, 1fr) minmax(160px, 0.55fr)",
                  gap: 16,
                  alignItems: "start",
                }}
              >
                <div style={innerCard("#FCFEFF")}>
                  <div
                    style={{
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 22,
                      lineHeight: 1.25,
                    }}
                  >
                    {readableName}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={badge(true)}>Code: {trustSlipCode}</span>
                    <span style={badge(false)}>
                      Level: {shareLevel}
                    </span>
                  </div>

                  {issuedAtText ? (
                    <div
                      style={{
                        marginTop: 12,
                        color: "#5F7287",
                        fontSize: 14,
                        lineHeight: 1.7,
                      }}
                    >
                      Issued: {issuedAtText}
                    </div>
                  ) : null}

                  {expiryText ? (
                    <div
                      style={{
                        marginTop: 6,
                        color: "#5F7287",
                        fontSize: 14,
                        lineHeight: 1.7,
                      }}
                    >
                      Valid until: {expiryText}
                    </div>
                  ) : null}

                  <div
                    style={{
                      marginTop: 14,
                      color: "#5F7287",
                      fontSize: 14,
                      lineHeight: 1.8,
                    }}
                  >
                    Choose a share level below, then copy the code, copy the
                    link, or open the public verification page.
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <button type="button" onClick={handleCopyCode} style={secondaryBtn()}>
                      Copy code
                    </button>

                    <button type="button" onClick={handleCopyLink} style={secondaryBtn()}>
                      Copy link
                    </button>

                    <a
                      href={publicVerifyUrl || "#"}
                      target="_blank"
                      rel="noreferrer"
                      style={primaryBtn(!publicVerifyUrl)}
                      onClick={(event) => {
                        if (!publicVerifyUrl) event.preventDefault();
                      }}
                    >
                      Open public verify page
                    </a>
                  </div>
                </div>

                <div style={innerCard("#F8FBFF")}>
                  <div style={sectionLabel()}>QR</div>

                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={`${apiOrigin()}/trust-slips/verify/${encodeURIComponent(
                        trustSlipCode
                      )}/qr.png`}
                      alt="TrustSlip QR"
                      style={{
                        width: 144,
                        height: 144,
                        borderRadius: 16,
                        border: "1px solid rgba(11,31,51,0.10)",
                        background: "#FFFFFF",
                        padding: 6,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      color: "#5F7287",
                      fontSize: 13,
                      lineHeight: 1.7,
                      textAlign: "center",
                    }}
                  >
                    Scan to open verification
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={sectionLabel()}>Share level</div>

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShareLevel("minimal")}
                    style={subtleBtn(shareLevel === "minimal")}
                  >
                    Minimal
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareLevel("standard")}
                    style={subtleBtn(shareLevel === "standard")}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareLevel("detailed")}
                    style={subtleBtn(shareLevel === "detailed")}
                  >
                    Detailed
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                marginTop: 14,
                color: "#64748B",
                lineHeight: 1.75,
              }}
            >
              A TrustSlip is not available yet.
            </div>
          )}
        </div>

        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>What a verifier can see</div>

          <div
            style={{
              marginTop: 10,
              color: "#5F7287",
              fontSize: 14,
              lineHeight: 1.75,
            }}
          >
            This preview shows the kind of reading the verifier may see at the
            selected share level.
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {loadingPreview ? (
              <div style={{ color: "#64748B" }}>Loading verification preview...</div>
            ) : verificationItems.length > 0 ? (
              verificationItems.map((item) => (
                <div key={item.label} style={innerCard("#FCFEFF")}>
                  <div
                    style={{
                      color: "#5F7287",
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: 0.25,
                      textTransform: "uppercase",
                    }}
                  >
                    {item.label}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      color: "#0B1F33",
                      fontSize: 15,
                      fontWeight: 900,
                      lineHeight: 1.5,
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  color: "#64748B",
                  lineHeight: 1.75,
                }}
              >
                No preview detail is available yet for this share level.
              </div>
            )}
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isCompact
            ? "1fr"
            : "repeat(3, minmax(0, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Minimal</div>

          <div
            style={{
              marginTop: 10,
              color: "#0B1F33",
              fontWeight: 900,
              fontSize: 18,
              lineHeight: 1.35,
            }}
          >
            Smallest share surface
          </div>

          <div
            style={{
              marginTop: 8,
              color: "#5F7287",
              fontSize: 14,
              lineHeight: 1.8,
            }}
          >
            Use this when someone only needs a limited verification view and not
            a fuller reading.
          </div>
        </div>

        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Standard</div>

          <div
            style={{
              marginTop: 10,
              color: "#0B1F33",
              fontWeight: 900,
              fontSize: 18,
              lineHeight: 1.35,
            }}
          >
            Balanced verification
          </div>

          <div
            style={{
              marginTop: 8,
              color: "#5F7287",
              fontSize: 14,
              lineHeight: 1.8,
            }}
          >
            Use this when someone needs a normal, readable verification view
            without too much detail.
          </div>
        </div>

        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Detailed</div>

          <div
            style={{
              marginTop: 10,
              color: "#0B1F33",
              fontWeight: 900,
              fontSize: 18,
              lineHeight: 1.35,
            }}
          >
            Fuller verification detail
          </div>

          <div
            style={{
              marginTop: 8,
              color: "#5F7287",
              fontSize: 14,
              lineHeight: 1.8,
            }}
          >
            Use this when fuller context is needed and a stronger trust reading
            is appropriate to share.
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Continue</div>

        <div
          style={{
            marginTop: 10,
            color: "#0B1F33",
            fontWeight: 900,
            fontSize: isCompact ? 24 : 30,
            lineHeight: 1.15,
            maxWidth: 820,
          }}
        >
          Use TrustSlip for verification. Use My Trust for explanation.
        </div>

        <div
          style={{
            marginTop: 12,
            color: "#5F7287",
            fontSize: 15,
            lineHeight: 1.82,
            maxWidth: 900,
          }}
        >
          Keeping those two pages distinct reduces confusion and makes the trust
          experience easier to understand.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link to="/app/trust" style={primaryBtn(false)}>
            Open My Trust
          </Link>
          <Link to="/app/community" style={secondaryBtn()}>
            Open Community Home
          </Link>
          <Link to="/app/notifications" style={secondaryBtn()}>
            Notifications
          </Link>
        </div>

        {loadingBundle ? (
          <div
            style={{
              marginTop: 14,
              color: "#64748B",
              fontSize: 13,
            }}
          >
            Refreshing share bundle...
          </div>
        ) : null}
      </section>
    </div>
  );
}