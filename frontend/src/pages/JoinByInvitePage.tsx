// src/pages/JoinByInvitePage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

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

function getToken(): string | null {
  return localStorage.getItem("access_token");
}

function card(): React.CSSProperties {
  return {
    border: "1px solid rgba(11,31,51,0.10)",
    borderRadius: 18,
    padding: 18,
    background: "rgba(255,255,255,0.96)",
    boxShadow: "0 18px 60px rgba(2,6,23,0.06)",
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
    whiteSpace: "nowrap",
  };

  if (kind === "blue") {
    return { ...base, color: "#1e40af", background: "#eff6ff", borderColor: "#bfdbfe" };
  }
  if (kind === "green") {
    return { ...base, color: "#065f46", background: "#ecfdf5", borderColor: "#a7f3d0" };
  }
  if (kind === "red") {
    return { ...base, color: "#991b1b", background: "#fef2f2", borderColor: "#fecaca" };
  }
  return { ...base, color: "#334155", background: "#f9fafb", borderColor: "#e5e7eb" };
}

function btn(primary?: boolean): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: 14,
    border: primary
      ? "1px solid rgba(11,31,51,0.75)"
      : "1px solid rgba(11,31,51,0.12)",
    background: primary ? "#0B1F33" : "#fff",
    color: primary ? "#fff" : "#0B1F33",
    fontWeight: 1000,
    cursor: "pointer",
  };
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "Not specified";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function JoinByInvitePage() {
  const { code } = useParams<{ code: string }>();
  const nav = useNavigate();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  const autoJoinAttemptedRef = useRef(false);

  useEffect(() => {
    if (!code) return;
    const token = getToken();
    if (!token) {
      nav(`/login?next=${encodeURIComponent(`/join/${code}`)}`, { replace: true });
    }
  }, [code, nav]);

  useEffect(() => {
    if (!code) return;

    let cancelled = false;

    async function run() {
      try {
        setErr(null);
        setLoading(true);

        const res = await fetch(`/api/invites/preview/${code}`);
        if (!res.ok) throw new Error(await parseError(res));

        const data = (await res.json()) as Preview;
        if (!cancelled) setPreview(data);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load invitation");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const canJoin = useMemo(() => {
    if (!preview) return false;
    if (!preview.is_active) return false;
    if (preview.revoked_at) return false;
    if (preview.max_uses && (preview.uses ?? 0) >= preview.max_uses) return false;
    return true;
  }, [preview]);

  async function join(manual: boolean) {
    if (!code) return;

    try {
      setJoining(true);
      setErr(null);

      const t = getToken();
      if (!t) {
        nav(`/login?next=${encodeURIComponent(`/join/${code}`)}`, { replace: true });
        return;
      }

      const res = await fetch(`/api/invites/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) throw new Error(await parseError(res));

      setJoined(true);
      nav("/clans", { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Join failed");
      if (!manual) {
        autoJoinAttemptedRef.current = true;
      }
    } finally {
      setJoining(false);
    }
  }

  useEffect(() => {
    if (!code || !preview || joined || !canJoin) return;
    if (autoJoinAttemptedRef.current) return;

    autoJoinAttemptedRef.current = true;
    void join(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, preview, canJoin, joined]);

  const statusLabel = !preview
    ? "Pending"
    : preview.revoked_at
    ? "Revoked"
    : canJoin
    ? "Eligible"
    : "Unavailable";

  const statusKind: "blue" | "green" | "red" | "gray" = !preview
    ? "blue"
    : preview.revoked_at
    ? "red"
    : canJoin
    ? "green"
    : "gray";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 55%, #ffffff 100%)",
        padding: "32px 16px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={card()}>
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
              <div style={{ fontSize: 24, fontWeight: 1000, color: "#0B1F33" }}>
                Community Admission
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#6B7A88", lineHeight: 1.4 }}>
                Secure access to an existing GMFN community through invitation.
              </div>
            </div>

            <span style={pill(statusKind)}>{statusLabel}</span>
          </div>

          {!code && (
            <div style={{ marginTop: 14, color: "#991b1b", fontWeight: 900 }}>
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

          {!loading && preview && (
            <>
              <div
                style={{
                  marginTop: 16,
                  padding: 16,
                  borderRadius: 16,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                  Community
                </div>
                <div style={{ fontSize: 22, fontWeight: 1000, color: "#0B1F33" }}>
                  {preview.clan_name}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>
                      Invitation Code
                    </div>
                    <div style={{ marginTop: 4, fontWeight: 900 }}>{preview.code}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>
                      Usage
                    </div>
                    <div style={{ marginTop: 4, fontWeight: 900 }}>
                      {preview.uses}
                      {preview.max_uses ? ` / ${preview.max_uses}` : ""}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>
                      Status
                    </div>
                    <div style={{ marginTop: 4, fontWeight: 900 }}>
                      {preview.is_active ? "Active" : "Inactive"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>
                      Expiry
                    </div>
                    <div style={{ marginTop: 4, fontWeight: 900 }}>
                      {fmtDate(preview.expires_at)}
                    </div>
                  </div>
                </div>
              </div>

              {preview.revoked_at && (
                <div style={{ marginTop: 14, color: "#991b1b", fontWeight: 900 }}>
                  This invitation has been revoked.
                </div>
              )}

              {!canJoin && !preview.revoked_at && (
                <div style={{ marginTop: 14, color: "#991b1b", fontWeight: 900 }}>
                  This invitation cannot currently be used.
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
                  onClick={() => join(true)}
                  disabled={!canJoin || joining}
                  style={btn(true)}
                >
                  {joining ? "Processing..." : "Join community"}
                </button>

                <button
                  onClick={() => nav("/clans")}
                  style={btn()}
                >
                  Open communities
                </button>
              </div>

              {canJoin && !joining && !err && (
                <div style={{ marginTop: 12, fontSize: 12, color: "#6B7A88" }}>
                  Admission processing starts automatically. Use the button above if manual confirmation is required.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}