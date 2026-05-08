import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import OriginLink from "../components/OriginLink";

type Preview = {
  code: string;
  clan_id: number;
  clan_name: string;
  is_active: boolean;
  uses: number;
  max_uses?: number | null;
  expires_at?: string | null;
  revoked_at?: string | null;
};

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    return j?.detail || text || `HTTP ${res.status}`;
  } catch {
    return text || `HTTP ${res.status}`;
  }
}

function cleanText(value: any): string {
  return String(value ?? "").trim();
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";

  return String(raw || "").trim().replace(/\/+$/, "");
}

function apiUrl(path: string): string {
  const raw = cleanText(path);
  if (/^https?:\/\//i.test(raw)) return raw;

  let cleanPath = raw.startsWith("/") ? raw : `/${raw}`;
  if (cleanPath.startsWith("/api/")) cleanPath = cleanPath.slice(4);

  return `${apiBase()}${cleanPath}`;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "Not specified";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function isExpired(iso?: string | null): boolean {
  const raw = cleanText(iso);
  if (!raw) return false;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, rgba(94,146,214,0.12) 0%, rgba(11,31,51,0.00) 28%), radial-gradient(circle at top right, rgba(214,173,82,0.06) 0%, rgba(11,31,51,0.00) 22%), linear-gradient(180deg, #07101C 0%, #0B1F33 40%, #173654 74%, #24496E 100%)",
    padding: "32px 16px",
    boxSizing: "border-box",
  };
}

function pageCard(bg = "linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(232,240,250,0.96) 58%, rgba(216,228,243,0.93) 100%)"): React.CSSProperties {
  return {
    border: "1px solid rgba(196,210,226,0.18)",
    borderRadius: 22,
    padding: 20,
    background: bg,
    boxShadow: "0 22px 56px rgba(2,6,23,0.22)",
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

function pill(kind: "blue" | "gray" | "green" | "red"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
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
      color: "#065f46",
      background: "#ecfdf5",
      borderColor: "#a7f3d0",
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
    background: "#f9fafb",
    borderColor: "#e5e7eb",
  };
}

function btn(primary = false, disabled = false): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: 14,
    border: primary
      ? "1px solid rgba(11,80,170,0.22)"
      : "1px solid rgba(37,78,119,0.20)",
    background: disabled
      ? "linear-gradient(180deg, #CBD5E1 0%, #B8C4D4 100%)"
      : primary
      ? "linear-gradient(180deg, #1A6BE1 0%, #0B63D1 58%, #09479C 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(241,247,253,0.98) 62%, rgba(224,234,244,0.98) 100%)",
    color: primary ? "#fff" : "#0B1F33",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    opacity: disabled ? 0.8 : 1,
    minHeight: 44,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "normal",
    textAlign: "center",
    boxShadow: disabled
      ? "none"
      : primary
      ? "0 16px 30px rgba(11,99,209,0.22), inset 0 1px 0 rgba(255,255,255,0.24)"
      : "0 12px 24px rgba(10,24,49,0.10), inset 0 1px 0 rgba(255,255,255,0.84)",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
}

function stableTapStyle(): React.CSSProperties {
  return {
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
}

function guardButtonPress(
  event:
    | React.PointerEvent<HTMLElement>
    | React.TouchEvent<HTMLElement>
    | React.MouseEvent<HTMLElement>
): void {
  event.stopPropagation();
}

function buttonGuardProps() {
  return {
    onPointerDown: guardButtonPress,
    onMouseDown: guardButtonPress,
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5C7186",
    lineHeight: 1.75,
    fontSize: 14,
  };
}

function buildCoverInviteRoute(
  code: string,
  preview: Preview | null,
  currentSearch: string
): string {
  const params = new URLSearchParams(currentSearch);

  params.set("entry", "invite");
  params.set("invite_code", code);

  if (preview?.clan_name) {
    params.set("community_name", preview.clan_name);
    params.set("clan_name", preview.clan_name);
  }

  if (preview?.clan_id) {
    params.set("community_route", String(preview.clan_id));
  }

  if (preview?.expires_at) {
    params.set("expires_at", preview.expires_at);
  }

  return `/cover?${params.toString()}`;
}

export default function JoinByInvitePage() {
  const { code } = useParams<{ code: string }>();
  const nav = useNavigate();
  const location = useLocation();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 920;
  });

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [continuing, setContinuing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      document.title = "GSN | Invitation Preview";
    }
  }, []);

  useEffect(() => {
    if (!code) return;

    let cancelled = false;

    async function run() {
      try {
        setErr(null);
        setLoading(true);

        const res = await fetch(apiUrl(`/api/invites/preview/${code}`));
        if (!res.ok) throw new Error(await parseError(res));

        const data = (await res.json()) as Preview;
        if (!cancelled) setPreview(data);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load invitation");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const unavailableReason = useMemo(() => {
    if (!preview) return "";
    if (preview.revoked_at) return "This invitation has been revoked.";
    if (!preview.is_active) return "This invitation is inactive.";
    if (isExpired(preview.expires_at)) return "This invitation has expired.";
    if (preview.max_uses && (preview.uses ?? 0) >= preview.max_uses) {
      return "This invitation has reached its usage limit.";
    }
    return "";
  }, [preview]);

  const canContinue = useMemo(() => {
    return Boolean(preview && !unavailableReason);
  }, [preview, unavailableReason]);

  const continueTo = useMemo(() => {
    return buildCoverInviteRoute(cleanText(code), preview, location.search);
  }, [code, preview, location.search]);

  const statusLabel = !preview
    ? "Pending"
    : preview.revoked_at
    ? "Revoked"
    : unavailableReason
    ? "Unavailable"
    : "Eligible";

  const statusKind: "blue" | "green" | "red" | "gray" = !preview
    ? "blue"
    : preview.revoked_at
    ? "red"
    : unavailableReason
    ? "gray"
    : "green";

  function continueInviteFlow() {
    if (!canContinue || !code) return;
    setContinuing(true);
    nav(continueTo);
  }

  return (
    <div style={pageShell()}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={pageCard("linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(232,240,250,0.96) 58%, rgba(216,228,243,0.93) 100%)")}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: "#64748B",
                  fontWeight: 1000,
                  letterSpacing: 0.45,
                  textTransform: "uppercase",
                }}
              >
                Invitation preview
              </div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: isCompact ? 28 : 34,
                  fontWeight: 1000,
                  color: "#0B1F33",
                  lineHeight: 1.1,
                }}
              >
                Community Admission
              </div>

              <div
                style={{
                  marginTop: 8,
                  ...helperText(),
                  maxWidth: 700,
                }}
              >
                This step checks the invitation first. Member areas open later,
                and the app will guide you one step at a time.
              </div>
            </div>

            <span style={pill(statusKind)}>{statusLabel}</span>
          </div>

          {!code && (
            <div
              style={{
                marginTop: 14,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#991b1b",
                padding: 12,
                borderRadius: 12,
                fontWeight: 700,
              }}
            >
              Missing invitation code.
            </div>
          )}

          {loading && (
            <div style={{ marginTop: 14, color: "#334155" }}>
              Loading invitation...
            </div>
          )}

          {err && (
            <div
              style={{
                marginTop: 14,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#991b1b",
                padding: 12,
                borderRadius: 12,
                fontWeight: 700,
                whiteSpace: "pre-wrap",
              }}
            >
              {err}
            </div>
          )}

          {!loading && preview ? (
            <>
              <div
                style={{
                  marginTop: 16,
                  padding: 16,
                  borderRadius: 16,
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#64748B",
                    fontWeight: 1000,
                    letterSpacing: 0.35,
                    textTransform: "uppercase",
                  }}
                >
                  Community
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 24,
                    fontWeight: 1000,
                    color: "#0B1F33",
                    lineHeight: 1.15,
                  }}
                >
                  {preview.clan_name}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div style={softCard("#FFFFFF")}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#64748B",
                        fontWeight: 900,
                        textTransform: "uppercase",
                      }}
                    >
                      Invitation Code
                    </div>
                    <div style={{ marginTop: 6, fontWeight: 900, color: "#0B1F33" }}>
                      {preview.code}
                    </div>
                  </div>

                  <div style={softCard("#FFFFFF")}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#64748B",
                        fontWeight: 900,
                        textTransform: "uppercase",
                      }}
                    >
                      Usage
                    </div>
                    <div style={{ marginTop: 6, fontWeight: 900, color: "#0B1F33" }}>
                      {preview.uses}
                      {preview.max_uses ? ` / ${preview.max_uses}` : ""}
                    </div>
                  </div>

                  <div style={softCard("#FFFFFF")}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#64748B",
                        fontWeight: 900,
                        textTransform: "uppercase",
                      }}
                    >
                      Status
                    </div>
                    <div style={{ marginTop: 6, fontWeight: 900, color: "#0B1F33" }}>
                      {preview.is_active ? "Active" : "Inactive"}
                    </div>
                  </div>

                  <div style={softCard("#FFFFFF")}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#64748B",
                        fontWeight: 900,
                        textTransform: "uppercase",
                      }}
                    >
                      Expiry
                    </div>
                    <div style={{ marginTop: 6, fontWeight: 900, color: "#0B1F33" }}>
                      {fmtDate(preview.expires_at)}
                    </div>
                  </div>
                </div>
              </div>

              {unavailableReason ? (
                <div
                  style={{
                    marginTop: 14,
                    border: "1px solid #fecaca",
                    background: "#fef2f2",
                    color: "#991b1b",
                    padding: 12,
                    borderRadius: 12,
                    fontWeight: 700,
                  }}
                >
                  {unavailableReason}
                </div>
              ) : (
                <div
                  style={{
                    marginTop: 14,
                    border: "1px solid #BFDBFE",
                    background: "#EFF6FF",
                    color: "#1D4ED8",
                    padding: 12,
                    borderRadius: 12,
                    fontWeight: 700,
                    lineHeight: 1.7,
                  }}
                >
                  This invite is valid. Open the guided invited entry route.
                </div>
              )}

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  {...buttonGuardProps()}
                  onClick={continueInviteFlow}
                  disabled={!canContinue || continuing}
                  style={{
                    ...btn(true, !canContinue || continuing),
                    ...stableTapStyle(),
                  }}
                >
                  {continuing ? "Opening..." : "Open invited entry"}
                </button>

                <OriginLink to="/guide" style={btn(false)}>
                  Open full GSN guide
                </OriginLink>

                <OriginLink to="/guide" style={btn(false)}>
                  Read about Focus Commitments first
                </OriginLink>

                <OriginLink to="/welcome" style={btn(false)}>
                  Open Welcome
                </OriginLink>
              </div>

              <div style={{ marginTop: 12, ...helperText() }}>
                This invite does not create membership immediately. It moves you
                into the guided public route so the entry path stays clear and
                controlled.
              </div>

              <div style={{ marginTop: 10, ...helperText() }}>
                Focus Commitments opens from Dashboard after workspace entry. If
                you want to understand that discipline path first, read the full
                guide before you continue.
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
