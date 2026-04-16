import React, { useEffect, useMemo, useState } from "react";
import {
  getMe,
  getMyTrustGraph,
  getTrustGraphByGmfnId,
  getTrustGraphByUserId,
  TrustGraphNodeOut,
} from "../lib/api";
import TrustGraphSummaryCard from "../components/TrustGraphSummaryCard";
import TrustGraphEdgeList from "../components/TrustGraphEdgeList";
import { Alert, Button, Card, PageHeader, Pill } from "../components/uiKit";

function safeStr(x: any): string {
  return (x ?? "").toString();
}

function fmtBool(v: any): string {
  return v ? "Verified" : "Not verified";
}

export default function TrustGraphAdminPage() {
  const [me, setMe] = useState<any>(null);
  const [graph, setGraph] = useState<TrustGraphNodeOut | null>(null);

  const [queryUserId, setQueryUserId] = useState("");
  const [queryGmfnId, setQueryGmfnId] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isAdmin = useMemo(() => safeStr(me?.role || "").toLowerCase() === "admin", [me]);

  async function loadMine() {
    setErr(null);
    setBusy(true);
    try {
      const g = await getMyTrustGraph();
      setGraph(g);
      setQueryUserId(safeStr(g?.user_id || ""));
      setQueryGmfnId(safeStr(g?.gmfn_id || ""));
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function loadAll() {
    setLoading(true);
    setErr(null);
    try {
      const m = await getMe();
      setMe(m);

      const g = await getMyTrustGraph();
      setGraph(g);
      setQueryUserId(safeStr(g?.user_id || ""));
      setQueryGmfnId(safeStr(g?.gmfn_id || ""));
    } catch (e: any) {
      setErr(String(e?.message || e));
      setGraph(null);
    } finally {
      setLoading(false);
    }
  }

  async function searchByUserId() {
    setErr(null);
    const n = Number(queryUserId);
    if (!Number.isFinite(n) || n <= 0) {
      setErr("Enter a valid user ID.");
      return;
    }

    setBusy(true);
    try {
      const g = await getTrustGraphByUserId(n);
      setGraph(g);
      setQueryGmfnId(safeStr(g?.gmfn_id || ""));
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function searchByGmfnId() {
    setErr(null);
    const s = safeStr(queryGmfnId).trim();
    if (!s) {
      setErr("Enter a GMFN ID.");
      return;
    }

    setBusy(true);
    try {
      const g = await getTrustGraphByGmfnId(s);
      setGraph(g);
      setQueryUserId(safeStr(g?.user_id || ""));
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <div style={{ padding: 18, maxWidth: 1200 }}>
      <PageHeader
        title="TrustGraph Command Centre"
        subtitle="Internal cross-clan trust architecture, explainability, and CCI command view."
        right={
          <Button onClick={loadAll} disabled={loading || busy}>
            {loading ? "Loading..." : busy ? "Working..." : "Refresh"}
          </Button>
        }
      />

      {err && <Alert kind="error">{err}</Alert>}

      <Card style={{ marginTop: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 1000, color: "#0B1F33" }}>Access posture</div>
            <div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>
              Admin/internal analysis only. TrustSlip remains the public-facing summary instrument.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill kind={isAdmin ? "green" : "red"}>{isAdmin ? "Admin access" : "Restricted"}</Pill>
            <Pill kind="blue">{safeStr(me?.gmfn_id || "GMFN ID pending")}</Pill>
          </div>
        </div>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 1000, color: "#0B1F33" }}>Lookup</div>
        <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
          Search by internal user ID or permanent member identity.
        </div>

        <div
          className="gmfn-tg-lookup-grid"
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <div
            style={{
              border: "1px solid rgba(11,31,51,0.08)",
              borderRadius: 16,
              padding: 12,
              background: "#fff",
            }}
          >
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Search by User ID</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                value={queryUserId}
                onChange={(e) => setQueryUserId(e.target.value)}
                placeholder="e.g. 12"
                style={{
                  flex: 1,
                  minWidth: 180,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(11,31,51,0.14)",
                }}
              />
              <Button onClick={searchByUserId} disabled={busy}>
                Open
              </Button>
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(11,31,51,0.08)",
              borderRadius: 16,
              padding: 12,
              background: "#fff",
            }}
          >
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Search by GMFN ID</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                value={queryGmfnId}
                onChange={(e) => setQueryGmfnId(e.target.value)}
                placeholder="e.g. GMFN-U-7K2F93QX"
                style={{
                  flex: 1,
                  minWidth: 180,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(11,31,51,0.14)",
                }}
              />
              <Button onClick={searchByGmfnId} disabled={busy}>
                Open
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {graph && (
        <>
          <Card
            style={{
              marginTop: 12,
              borderColor: "rgba(30,64,175,0.18)",
              background: "linear-gradient(180deg, rgba(239,246,255,0.96) 0%, rgba(255,255,255,0.98) 100%)",
            }}
          >
            <div
              className="gmfn-tg-node-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Selected node</div>
                <div style={{ marginTop: 6, fontSize: 28, fontWeight: 1000, color: "#0B1F33" }}>
                  {safeStr(graph.gmfn_id || "Pending")}
                </div>
                <div style={{ marginTop: 8, color: "#475569", fontSize: 14 }}>
                  User #{safeStr(graph.user_id)} · {safeStr(graph.email || "No email")}
                </div>
                <div style={{ marginTop: 8, color: "#64748b", fontSize: 12 }}>
                  Phone status: <b>{fmtBool(graph.phone_verified)}</b>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    border: "1px solid rgba(11,31,51,0.08)",
                    borderRadius: 14,
                    padding: 12,
                    background: "#fff",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>Trust score</div>
                  <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000 }}>
                    {safeStr(graph.trust_score ?? "—")}
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid rgba(11,31,51,0.08)",
                    borderRadius: 14,
                    padding: 12,
                    background: "#fff",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>Trust band</div>
                  <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000 }}>
                    {safeStr(graph.trust_band ?? "—")}
                  </div>
                </div>
              </div>
            </div>

            <style>{`
              @media (max-width: 980px) {
                .gmfn-tg-node-grid,
                .gmfn-tg-lookup-grid {
                  grid-template-columns: 1fr !important;
                }
              }
            `}</style>
          </Card>

          <div style={{ marginTop: 12 }}>
            <TrustGraphSummaryCard
              summary={graph.summary}
              trustBand={graph.trust_band}
              trustScore={graph.trust_score ?? null}
            />
          </div>

          <Card style={{ marginTop: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 1000, color: "#0B1F33" }}>Explainability</div>
            <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
              Why this graph and CCI score were produced.
            </div>

            <pre
              style={{
                marginTop: 10,
                background: "#f8fafc",
                borderRadius: 12,
                padding: 12,
                fontSize: 12,
                overflowX: "auto",
                color: "#334155",
              }}
            >
              {JSON.stringify(graph.summary?.explainability || {}, null, 2)}
            </pre>
          </Card>

          <div style={{ marginTop: 12 }}>
            <TrustGraphEdgeList edges={graph.edges || []} focusUserId={graph.user_id} />
          </div>
        </>
      )}
    </div>
  );
}


