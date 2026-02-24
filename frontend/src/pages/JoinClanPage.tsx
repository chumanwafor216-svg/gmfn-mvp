import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getAccessToken } from "../lib/api";

async function apiRequest<T>(path: string, opts?: RequestInit, token?: string | null): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    try {
      const j = JSON.parse(text);
      throw new Error(j?.detail || text || `HTTP ${res.status}`);
    } catch {
      throw new Error(text || `HTTP ${res.status}`);
    }
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return undefined as T;
  return (await res.json()) as T;
}

type JoinResult = {
  ok?: boolean;
  clan_id?: number;
  role?: string;
  message?: string;
};

export default function JoinClanPage() {
  const { code } = useParams<{ code: string }>();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<JoinResult | null>(null);

  useEffect(() => {
    async function run() {
      setLoading(true);
      setErr(null);
      setMsg(null);

      try {
        if (!code) throw new Error("Missing invite code in URL.");

        const t = getAccessToken();
        if (!t) {
          setErr("You must log in first, then open the invite link again.");
          return;
        }

        // ✅ Adjust this path if your backend uses a different one
        // Common options: POST /invites/join/{code}  OR  POST /invites/accept/{code}
        const res = await apiRequest<JoinResult>(
          `/invites/join/${encodeURIComponent(code)}`,
          { method: "POST" },
          t
        );

        setResult(res || { ok: true });
        setMsg("Joined successfully ✅");
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    }

    run();
  }, [code]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Join Clan</h2>
      <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>
        Invite code: <code>{code || "-"}</code>
      </div>

      {loading && <div>Joining…</div>}
      {msg && <div style={{ color: "green", marginBottom: 10 }}>{msg}</div>}
      {err && (
        <div style={{ color: "red", marginBottom: 10 }}>
          {err}
          {!getAccessToken() && (
            <div style={{ marginTop: 8 }}>
              <Link to="/login">Go to Login</Link>
            </div>
          )}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 12 }}>
          <div>
            <b>Clan ID:</b> {result.clan_id ?? "-"}
          </div>
          <div>
            <b>Role:</b> {result.role ?? "-"}
          </div>
          {result.message && (
            <div style={{ marginTop: 8, opacity: 0.9 }}>{result.message}</div>
          )}

          <div style={{ marginTop: 14 }}>
            <button onClick={() => nav("/clans")}>Go to Clans</button>
          </div>
        </div>
      )}

      <hr style={{ marginTop: 18 }} />
      <div style={{ fontSize: 12, opacity: 0.8 }}>
        If this page says “endpoint not found”, tell me what the join endpoint is in Swagger and I’ll
        match the exact path.
      </div>
    </div>
  );
}
