import { useEffect, useRef, useState } from "react";
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

export default function JoinByInvitePage() {
  const { code } = useParams<{ code: string }>();
  const nav = useNavigate();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  // ✅ prevent auto-join from firing repeatedly
  const autoJoinAttemptedRef = useRef(false);

  // If not logged in, go to login but preserve return path
  useEffect(() => {
    if (!code) return;
    const token = getToken();
    if (!token) {
      nav(`/login?next=${encodeURIComponent(`/join/${code}`)}`, { replace: true });
    }
  }, [code, nav]);

  // Load preview (public)
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
        if (!cancelled) setErr(e?.message || "Failed to load invite");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const canJoin =
    !!preview &&
    preview.is_active &&
    !preview.revoked_at &&
    (!preview.max_uses || (preview.uses ?? 0) < preview.max_uses);

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

      // ✅ redirect after join
      nav("/clans", { replace: true });
    } catch (e: any) {
      // If auto-join fails, show the error and allow manual retry only if canJoin is true
      setErr(e?.message || "Join failed");
      if (!manual) {
        // stop repeated attempts
        autoJoinAttemptedRef.current = true;
      }
    } finally {
      setJoining(false);
    }
  }

  // ✅ Auto-join once when preview loads and invite is usable
  useEffect(() => {
    if (!code) return;
    if (!preview) return;

    if (joined) return;
    if (!canJoin) return;

    // only attempt once
    if (autoJoinAttemptedRef.current) return;
    autoJoinAttemptedRef.current = true;

    // fire auto join
    void join(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, preview, canJoin, joined]);

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", padding: 16 }}>
      <h2>Join Clan</h2>

      {!code && <p>Missing invite code.</p>}

      {loading && <p>Loading invite…</p>}

      {err && <pre style={{ whiteSpace: "pre-wrap", color: "crimson" }}>{err}</pre>}

      {!loading && preview && (
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <p>
            <b>Clan:</b> {preview.clan_name}
          </p>
          <p>
            <b>Code:</b> {preview.code}
          </p>
          <p>
            <b>Status:</b> {preview.is_active ? "Active" : "Inactive"}
          </p>
          <p>
            <b>Uses:</b> {preview.uses}
            {preview.max_uses ? ` / ${preview.max_uses}` : ""}
          </p>

          {preview.expires_at && (
            <p style={{ fontSize: 12, opacity: 0.85 }}>
              Expires: {new Date(preview.expires_at).toLocaleString()}
            </p>
          )}

          {preview.revoked_at && <p style={{ color: "crimson" }}>This invite has been revoked.</p>}

          {!canJoin && !preview.revoked_at && (
            <p style={{ color: "crimson" }}>
              This invite cannot be used (inactive/expired/limit reached).
            </p>
          )}

          {/* Manual fallback button (useful if auto-join failed due to temporary issues) */}
          <button
            onClick={() => join(true)}
            disabled={!canJoin || joining}
            style={{ padding: 10 }}
          >
            {joining ? "Joining…" : "Join now"}
          </button>

          {/* small hint */}
          {canJoin && !joining && !err && (
            <p style={{ fontSize: 12, opacity: 0.75, marginTop: 10 }}>
              Auto-joining… if nothing happens, click “Join now”.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
