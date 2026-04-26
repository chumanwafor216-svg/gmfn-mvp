import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import * as api from "../lib/api";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";
import { publicFrontendUrl } from "../lib/publicLinks";

type TrustSlipVerifyRecord = {
  id?: number;
  code?: string | null;
  holder_name?: string | null;
  gmfn_id?: string | null;
  status?: string | null;
  verification_status?: string | null;
  state?: string | null;
  trust_band?: string | null;
  trust_class?: string | null;
  trust_score?: string | number | null;
  open_trust_band?: string | null;
  open_trust_class?: string | null;
  open_trust_score?: string | number | null;
  community_trust_band?: string | null;
  community_trust_class?: string | null;
  community_trust_score?: string | number | null;
  community_name?: string | null;
  clan_name?: string | null;
  marketplace_name?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  valid?: boolean | null;
  verified?: boolean | null;
  message?: string | null;
  detail?: string | null;
};

type VerifyBannerTone = "success" | "warning" | "error" | "info";
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

function firstNumberLike(...values: any[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || String(value).trim() === "") {
      continue;
    }
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    borderRadius: 26,
    padding: 20,
    backdropFilter: "blur(6px)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    borderRadius: 20,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    borderRadius: 18,
    padding: 15,
  };
}

function statTile(
  bg = "#FFFFFF",
  border = "1px solid rgba(11,31,51,0.08)"
): React.CSSProperties {
  return {
    ...institutionalStatTile(
      bg,
      border === "1px solid rgba(11,31,51,0.08)"
        ? "1px solid rgba(37,78,119,0.12)"
        : border,
    ),
    borderRadius: 18,
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

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    border: primary
      ? "1px solid rgba(11,99,209,0.14)"
      : "1px solid rgba(108,138,184,0.18)",
    background: primary
      ? "linear-gradient(180deg, rgba(11,99,209,0.11) 0%, rgba(11,99,209,0.06) 100%)"
      : "linear-gradient(180deg, rgba(245,249,255,0.96) 0%, rgba(232,240,249,0.94) 100%)",
    color: primary ? "#0B63D1" : "#415A72",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function actionBtn(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  if (kind === "primary") {
    return {
      position: "relative",
      zIndex: 2,
      boxSizing: "border-box",
      appearance: "none",
      WebkitAppearance: "none",
      touchAction: "manipulation",
      WebkitTapHighlightColor: "transparent",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
      padding: "12px 16px",
      borderRadius: 16,
      border: disabled
        ? "1px solid rgba(148,163,184,0.22)"
        : "1px solid rgba(9,83,176,0.24)",
      background: disabled
        ? "linear-gradient(180deg, #CBD5E1 0%, #B8C4D2 100%)"
        : "linear-gradient(180deg, #1D75E8 0%, #0B63D1 100%)",
      color: "#FFFFFF",
      fontWeight: 900,
      fontSize: 15,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
      boxShadow: disabled ? "none" : "0 12px 28px rgba(15,23,42,0.12)",
    };
  }

  if (kind === "soft") {
    return {
      position: "relative",
      zIndex: 2,
      boxSizing: "border-box",
      appearance: "none",
      WebkitAppearance: "none",
      touchAction: "manipulation",
      WebkitTapHighlightColor: "transparent",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
      padding: "10px 14px",
      borderRadius: 14,
      border: "1px solid rgba(124,153,196,0.22)",
      background: "linear-gradient(180deg, #F6FAFF 0%, #EAF2FF 100%)",
      color: disabled ? "#94A3B8" : "#24415C",
      fontWeight: 800,
      fontSize: 14,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
      boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
    };
  }

  return {
    position: "relative",
    zIndex: 2,
    boxSizing: "border-box",
    appearance: "none",
    WebkitAppearance: "none",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "12px 16px",
    borderRadius: 16,
    border: "1px solid rgba(124,153,196,0.22)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #EEF4FF 100%)",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 900,
    fontSize: 15,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    opacity: disabled ? 0.86 : 1,
    boxShadow: "0 12px 28px rgba(15,23,42,0.10)",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#526579",
    fontSize: 14.5,
    lineHeight: 1.75,
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

function bannerToneStyle(tone: VerifyBannerTone): {
  bg: string;
  border: string;
  text: string;
} {
  if (tone === "success") {
    return {
      bg: "#F3FBF5",
      border: "1px solid rgba(34,197,94,0.16)",
      text: "#166534",
    };
  }

  if (tone === "warning") {
    return {
      bg: "#FFFBEF",
      border: "1px solid rgba(245,158,11,0.16)",
      text: "#92400E",
    };
  }

  if (tone === "error") {
    return {
      bg: "#FFF5F5",
      border: "1px solid rgba(239,68,68,0.16)",
      text: "#991B1B",
    };
  }

  return {
    bg: "#F8FBFF",
    border: "1px solid rgba(11,99,209,0.12)",
    text: "#0B63D1",
  };
}

function documentMetaCard(bg = "#F7FAFC"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.18)",
    background: bg,
    padding: 14,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45)",
  };
}

function documentFrameStyle(): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    border: "1px solid rgba(148,163,184,0.2)",
    boxShadow:
      "0 20px 54px rgba(2,6,23,0.12), inset 0 1px 0 rgba(255,255,255,0.5)",
  };
}

function documentWatermarkStyle(): React.CSSProperties {
  return {
    position: "absolute",
    top: 18,
    right: -16,
    transform: "rotate(-90deg)",
    transformOrigin: "top right",
    letterSpacing: 3.1,
    fontSize: 11,
    fontWeight: 900,
    color: "rgba(11,31,51,0.08)",
    pointerEvents: "none",
    textTransform: "uppercase",
  };
}

function documentFooterGrid(isCompact: boolean): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 1,
    marginTop: 16,
    paddingTop: 14,
    borderTop: "1px solid rgba(148,163,184,0.2)",
    display: "grid",
    gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
    gap: 12,
  };
}

function documentFooterLabel(): React.CSSProperties {
  return {
    fontSize: 11,
    letterSpacing: 0.28,
    fontWeight: 900,
    textTransform: "uppercase",
    color: "#64748B",
  };
}

function normalizeTrustSlipVerification(raw: any, fallbackCode: string): TrustSlipVerifyRecord | null {
  if (!raw) return null;

  const src = raw?.item || raw?.trust_slip || raw?.verification || raw;

  return {
    id: positiveNumber(firstTruthy(src?.id, src?.trust_slip_id)) || undefined,
    code: firstTruthy(src?.code, src?.trust_slip_code, fallbackCode),
    holder_name: firstTruthy(
      src?.holder_name,
      src?.display_name,
      src?.name,
      src?.member_name
    ),
    gmfn_id: firstTruthy(src?.gmfn_id),
    status: firstTruthy(src?.status),
    verification_status: firstTruthy(src?.verification_status),
    state: firstTruthy(src?.state),
    trust_band: firstTruthy(src?.trust_band, src?.trust_class),
    trust_class: firstTruthy(src?.trust_class, src?.trust_band),
    trust_score: firstNumberLike(src?.trust_score),
    open_trust_band: firstTruthy(
      src?.open_trust_band,
      src?.community_trust_band,
      src?.open_trust_class
    ),
    open_trust_class: firstTruthy(
      src?.open_trust_class,
      src?.community_trust_class,
      src?.open_trust_band
    ),
    open_trust_score: firstNumberLike(
      src?.open_trust_score,
      src?.community_trust_score
    ),
    community_trust_band: firstTruthy(
      src?.community_trust_band,
      src?.open_trust_band
    ),
    community_trust_class: firstTruthy(
      src?.community_trust_class,
      src?.open_trust_class
    ),
    community_trust_score: firstNumberLike(
      src?.community_trust_score,
      src?.open_trust_score
    ),
    community_name: firstTruthy(
      src?.community_name,
      src?.clan_name,
      src?.marketplace_name
    ),
    clan_name: firstTruthy(src?.clan_name),
    marketplace_name: firstTruthy(src?.marketplace_name),
    issued_at: firstTruthy(src?.issued_at, src?.created_at),
    expires_at: firstTruthy(src?.expires_at, src?.expiry_at),
    valid:
      typeof src?.valid === "boolean"
        ? src.valid
        : typeof src?.is_valid === "boolean"
        ? src.is_valid
        : null,
    verified:
      typeof src?.verified === "boolean"
        ? src.verified
        : typeof src?.is_verified === "boolean"
        ? src.is_verified
        : null,
    message: firstTruthy(src?.message),
    detail: firstTruthy(src?.detail, src?.description),
  };
}

async function callFirstAvailable<T = any>(
  names: string[],
  argsSets: any[][]
): Promise<T | null> {
  for (const name of names) {
    const fn = (api as any)[name];
    if (typeof fn !== "function") continue;

    for (const args of argsSets) {
      try {
        const result = await fn(...args);
        if (result) return result as T;
      } catch {
        // try next signature
      }
    }
  }

  return null;
}

function deriveBanner(record: TrustSlipVerifyRecord | null): {
  tone: VerifyBannerTone;
  title: string;
  detail: string;
} {
  if (!record) {
    return {
      tone: "error",
      title: "No usable TrustSlip record was found",
      detail:
        "The supplied TrustSlip code did not return a usable verification record from the available verification source.",
    };
  }

  const statusText = [
    safeStr(record.status),
    safeStr(record.verification_status),
    safeStr(record.state),
  ]
    .join(" ")
    .toLowerCase();

  const expiresAt = safeStr(record.expires_at);
  const expiresDate = expiresAt ? new Date(expiresAt) : null;
  const isExpired =
    expiresDate && Number.isFinite(expiresDate.getTime())
      ? expiresDate.getTime() < Date.now()
      : false;

  if (isExpired || statusText.includes("expired")) {
    return {
      tone: "warning",
      title: "This TrustSlip looks expired",
      detail:
        "A record was found, but the expiry line suggests that the current verification window may have ended.",
    };
  }

  if (
    record.valid === false ||
    record.verified === false ||
    statusText.includes("revoked") ||
    statusText.includes("invalid") ||
    statusText.includes("rejected")
  ) {
    return {
      tone: "error",
      title: "This TrustSlip is not currently valid",
      detail:
        "A record was found, but the visible verification state suggests it is not currently valid.",
    };
  }

  if (
    statusText.includes("pending") ||
    statusText.includes("preparing") ||
    statusText.includes("processing")
  ) {
    return {
      tone: "warning",
      title: "This TrustSlip is still being issued",
      detail:
        "A TrustSlip record exists, but the visible state suggests the current verification issue is not fully settled yet.",
    };
  }

  return {
    tone: "success",
    title: "A TrustSlip record was found",
    detail:
      "This shows the current verification reading returned for the supplied TrustSlip code.",
  };
}

export default function TrustSlipVerifyPage() {
  const params = useParams<{ code?: string }>();
  const location = useLocation();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [record, setRecord] = useState<TrustSlipVerifyRecord | null>(null);
  const [resolvedCode, setResolvedCode] = useState("");
  const [loadError, setLoadError] = useState("");

  const isAppRoute = location.pathname.startsWith("/app/");
  const queryCode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return safeStr(params.get("code"));
  }, [location.search]);

  const requestedCode = useMemo(() => {
    return firstTruthy(params.code, queryCode);
  }, [params.code, queryCode]);

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
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setLoadError("");

      try {
        const [meRes, clanRes] = await Promise.all([
          (api as any).getMe?.().catch(() => null) ?? Promise.resolve(null),
          (api as any).getCurrentClan?.().catch(() => null) ?? Promise.resolve(null),
        ]);

        if (!alive) return;
        setMe(meRes || null);
        setCurrentClan(clanRes || null);

        let codeToUse = requestedCode;

        if (!codeToUse && isAppRoute && typeof (api as any).getMyTrustSlip === "function") {
          const mySlip = await (api as any).getMyTrustSlip().catch(() => null);
          codeToUse = firstTruthy(mySlip?.code, mySlip?.trust_slip_code);
          if (!alive) return;
        }

        setResolvedCode(codeToUse);

        if (!codeToUse) {
          setRecord(null);
          setLoadError("No TrustSlip code was supplied.");
          return;
        }

        const verifyResult = await callFirstAvailable(
          [
            "verifyTrustSlipCode",
            "verifyTrustSlip",
            "getTrustSlipVerify",
            "getTrustSlipVerification",
            "getTrustSlipByCode",
            "getTrustSlipPublic",
            "getTrustSlipPublicByCode",
          ],
          [[codeToUse], [{ code: codeToUse }], [codeToUse, { code: codeToUse }]]
        );

        if (!alive) return;

        const normalized = normalizeTrustSlipVerification(verifyResult, codeToUse);
        setRecord(normalized);

        if (!normalized) {
          setLoadError(
            "The supplied TrustSlip code did not return a readable verification record."
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [requestedCode, isAppRoute]);

  const communityLabel = useMemo(() => {
    return (
      firstTruthy(
        record?.community_name,
        record?.marketplace_name,
        record?.clan_name,
        currentClan?.marketplace_name,
        currentClan?.name,
        currentClan?.display_name,
        currentClan?.title
      ) || "Not stated"
    );
  }, [record, currentClan]);

  const gmfnId = useMemo(() => {
    return firstTruthy(record?.gmfn_id, me?.gmfn_id, "Awaiting issue");
  }, [record, me]);

  const holderName = useMemo(() => {
    return (
      firstTruthy(
        record?.holder_name,
        me?.display_name,
        me?.nickname,
        me?.name,
        me?.first_name,
        me?.email
      ) || "Member"
    );
  }, [record, me]);

  const visibleBand = firstTruthy(
    record?.open_trust_band,
    record?.community_trust_band,
    record?.trust_band,
    record?.open_trust_class,
    record?.community_trust_class,
    record?.trust_class,
    "Visible reading"
  );

  const visibleScore = firstNumberLike(
    record?.open_trust_score,
    record?.community_trust_score,
    record?.trust_score
  );

  const banner = useMemo(() => deriveBanner(record), [record]);
  const bannerStyle = bannerToneStyle(banner.tone);

  const verifyPath = resolvedCode ? `/t/${encodeURIComponent(resolvedCode)}` : "";
  const verifyUrl = resolvedCode ? publicFrontendUrl(verifyPath) : "";

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function copyCode() {
    if (!resolvedCode) {
      showNotice("error", "TrustSlip code is not available.");
      return;
    }

    api.safeCopy(resolvedCode);
    showNotice("success", "TrustSlip code copied.");
  }

  function copyVerifyLink() {
    if (!verifyUrl) {
      showNotice("error", "Verify link is not available.");
      return;
    }

    api.safeCopy(verifyUrl);
    showNotice("success", "Verify link copied.");
  }

  function copyGmfnId() {
    if (!gmfnId || gmfnId === "Awaiting issue") {
      showNotice("error", "GMFN ID is not available.");
      return;
    }

    api.safeCopy(gmfnId);
    showNotice("success", "GMFN ID copied.");
  }

  if (loading) {
    return (
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          paddingBottom: 40,
          display: "grid",
          gap: 18,
        }}
      >
        {isAppRoute ? (
          <PageTopNav
            sectionLabel="TrustSlip Verify"
            title="TrustSlip Verify"
            subtitle="Loading the verification reading..."
            homeTo="/app/dashboard"
            homeLabel="Dashboard"
            backTo="/app/trust-slip"
            backLabel="TrustSlip"
          />
        ) : (
          <section
            style={pageCard(
              "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
            )}
          >
            <div style={sectionLabel()}>TrustSlip verify</div>
            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontSize: isCompact ? 28 : 34,
                fontWeight: 900,
                lineHeight: 1.1,
              }}
            >
              Loading verification page
            </div>
            <div style={{ marginTop: 12, ...helperText(), color: "#D7E3F1" }}>
              Reading the TrustSlip verification record...
            </div>
          </section>
        )}

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading TrustSlip verification...
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1080,
        margin: "0 auto",
        paddingBottom: 40,
        display: "grid",
        gap: 18,
      }}
    >
      <style>{`
        @page { margin: 14mm; }
        @media print {
          body { background: #ffffff !important; }
          a[href]:after { content: "" !important; }
          button { display: none !important; }
          .print-trust-nav { display: none !important; }
          .print-trust-document,
          .print-trust-support {
            box-shadow: none !important;
            border: 1px solid rgba(148,163,184,0.34) !important;
            background: #ffffff !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
      {isAppRoute ? (
        <div className="print-trust-nav">
          <PageTopNav
            sectionLabel="TrustSlip Verify"
            title="TrustSlip Verify"
            subtitle="Confirm who this TrustSlip belongs to, whether it is valid now, and when the current verification window ends."
            homeTo="/app/dashboard"
            homeLabel="Dashboard"
            backTo="/app/trust-slip"
            backLabel="TrustSlip"
          />
        </div>
      ) : (
        <section
          style={pageCard(
            "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
          )}
        >
          <div style={sectionLabel()}>TrustSlip verify</div>

          <div
            style={{
              marginTop: 10,
              color: "#F8FBFF",
              fontSize: isCompact ? 28 : 34,
              fontWeight: 900,
              lineHeight: 1.1,
            }}
          >
            TrustSlip verification page
          </div>

          <div
            style={{
              marginTop: 12,
              ...helperText(),
              maxWidth: 860,
              color: "#D7E3F1",
            }}
          >
            It confirms identity, visible trust reading, and current validity. It is not the full trust explanation page.
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <OriginLink to="/welcome" style={actionBtn("secondary")}>
              Welcome
            </OriginLink>
            <OriginLink to="/guide" style={actionBtn("secondary")}>
              My GSN and I
            </OriginLink>
          </div>
        </section>
      )}

      <ExplainToggle
        label="What this screen does"
        what="TrustSlip Verify confirms whether the supplied TrustSlip code belongs to a valid current record and what public reading is visible for it."
        why="It gives a clean verification layer without forcing people into the fuller trust explanation pages first."
        next="Read the verification result first, then use the detailed record below if you need the holder, status, and validity window."
        tone="blue"
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={{
          ...pageCard(bannerStyle.bg),
          border: bannerStyle.border,
        }}
      >
        <div style={sectionLabel()}>Verification result</div>

        <ExplainToggle
          label="What this result means"
          what="This banner is the first verification answer for the supplied code."
          why="It tells you quickly whether the record is valid now and whether it is safe to trust the public reading shown below."
          next="Use the status and code here as the first check, then read the detailed verification record if you need the fuller context."
          tone="light"
          style={{ marginTop: 12 }}
        />

        <div
          style={{
            marginTop: 10,
            color: bannerStyle.text,
            fontWeight: 900,
            fontSize: isCompact ? 24 : 30,
            lineHeight: 1.15,
          }}
        >
          {banner.title}
        </div>

        <div style={{ marginTop: 12, ...helperText(), color: "#0B1F33" }}>
          {loadError || banner.detail}
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
            Code: {resolvedCode || "Not available"}
          </span>
          <span style={badge(false)}>
            Status:{" "}
            {firstTruthy(
              record?.status,
              record?.verification_status,
              record?.state,
              loadError ? "Unavailable" : "Record found"
            )}
          </span>
        </div>
      </section>

      <section
        className="print-trust-document"
        style={{ ...pageCard("#FFFFFF"), ...documentFrameStyle() }}
      >
        <div className="print-watermark" aria-hidden style={documentWatermarkStyle()}>
          GSN Verify
        </div>
        <div style={sectionLabel()}>Verification summary</div>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={innerCard("#FCFEFF")}>
            <div style={sectionLabel()}>Holder identity</div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={statTile()}>
                <div style={sectionLabel()}>Holder</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 18,
                  }}
                >
                  {holderName}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>GMFN ID</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 16,
                    lineHeight: 1.25,
                    wordBreak: "break-word",
                  }}
                >
                  {gmfnId}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Community</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 16,
                    lineHeight: 1.25,
                  }}
                >
                  {communityLabel}
                </div>
              </div>
            </div>
          </div>

          <div style={innerCard("#FFFFFF")}>
            <div style={sectionLabel()}>Visible trust reading</div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={statTile()}>
                <div style={sectionLabel()}>Visible band</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 18,
                    lineHeight: 1.25,
                  }}
                >
                  {visibleBand}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Visible score</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 18,
                    lineHeight: 1.25,
                  }}
                >
                  {visibleScore === null ? "—" : String(Math.round(visibleScore))}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Issued / expires</div>
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  <div style={{ ...helperText(), color: "#0B1F33" }}>
                    Issued: {safeDateTime(record?.issued_at) || "—"}
                  </div>
                  <div style={{ ...helperText(), color: "#0B1F33" }}>
                    Expires: {safeDateTime(record?.expires_at) || "Not stated"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {firstTruthy(record?.message, record?.detail) ? (
          <div style={{ marginTop: 14, ...softCard("#F8FBFF") }}>
            <div style={sectionLabel()}>System note</div>
            <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
              {firstTruthy(record?.message, record?.detail)}
            </div>
          </div>
        ) : null}

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={documentMetaCard("#FFFFFF")}>
            <div style={sectionLabel()}>Document reference</div>
            <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
              Verification code: {resolvedCode || "Not available"}
            </div>
            <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
              Verification state: {firstTruthy(record?.verification_status, record?.status, "Not stated")}
            </div>
          </div>

          <div style={documentMetaCard("#F8FBFF")}>
            <div style={sectionLabel()}>Validity window</div>
            <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
              Issued: {safeDateTime(record?.issued_at) || "Not stated"}
            </div>
            <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
              Expires: {safeDateTime(record?.expires_at) || "Not stated"}
            </div>
            <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
              Public verify path: {verifyPath || "Not available"}
            </div>
          </div>
        </div>

        <div style={documentFooterGrid(isCompact)}>
          <div>
            <div style={documentFooterLabel()}>Verification control</div>
            <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
              Code: {resolvedCode || "Not available"}
            </div>
            <div style={{ marginTop: 4, ...helperText(), color: "#0B1F33" }}>
              Public path: {verifyPath || "Not available"}
            </div>
          </div>

          <div>
            <div style={documentFooterLabel()}>Validity window</div>
            <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
              Issued: {safeDateTime(record?.issued_at) || "Not stated"}
            </div>
            <div style={{ marginTop: 4, ...helperText(), color: "#0B1F33" }}>
              Expires: {safeDateTime(record?.expires_at) || "Not stated"}
            </div>
          </div>

          <div>
            <div style={documentFooterLabel()}>Verification note</div>
            <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
              This confirms current public validity only. Trust Passport
              gives the fuller explanation.
            </div>
          </div>
        </div>
      </section>

      <section className="print-trust-support" style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>What this page means</div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={innerCard("#F8FBFF")}>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 15,
              }}
            >
              Current validity
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Use this public verification page to confirm identity, trust
              reading, and current validity quickly.
            </div>
          </div>

          <div style={innerCard("#FFFFFF")}>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 15,
              }}
            >
              This is not the full trust story
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The full trust explanation still belongs in Trust Passport, where the why, change path, repair path, and trust journey are explained in more detail.
            </div>
          </div>
        </div>
      </section>

      <section className="print-trust-support" style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Quick actions</div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={copyCode}
            disabled={!resolvedCode}
            style={actionBtn("primary", !resolvedCode)}
          >
            Copy TrustSlip Code
          </button>

          <button
            type="button"
            onClick={copyVerifyLink}
            disabled={!verifyUrl}
            style={actionBtn("secondary", !verifyUrl)}
          >
            Copy Verify Link
          </button>

          <button
            type="button"
            onClick={copyGmfnId}
            disabled={!gmfnId || gmfnId === "Awaiting issue"}
            style={actionBtn("secondary", !gmfnId || gmfnId === "Awaiting issue")}
          >
            Copy GMFN ID
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && typeof window.print === "function") {
                window.print();
              }
            }}
            style={actionBtn("soft")}
          >
            Print Verification
          </button>

          {isAppRoute ? (
            <OriginLink to="/app/trust" style={actionBtn("soft")}>
              Trust Passport
            </OriginLink>
          ) : (
            <OriginLink to="/guide" style={actionBtn("soft")}>
              My GSN and I
            </OriginLink>
          )}
        </div>
      </section>
    </div>
  );
}



