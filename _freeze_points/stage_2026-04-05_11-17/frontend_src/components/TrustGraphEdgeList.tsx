import React, { useMemo, useState } from "react";
import { Card, Pill } from "../components/uiKit";
import { TrustGraphEdgeOut } from "../lib/api";

function safeStr(x: any): string {
  return (x ?? "").toString();
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return safeStr(iso);
  return d.toLocaleString();
}

function edgeKind(edgeType: string): "blue" | "green" | "gold" | "gray" | "red" {
  const t = safeStr(edgeType).toLowerCase();
  if (t.includes("repay")) return "green";
  if (t.includes("guarante")) return "gold";
  if (t.includes("invite") || t.includes("onboard")) return "blue";
  if (t.includes("merchant")) return "blue";
  if (t.includes("risk")) return "red";
  return "gray";
}

export default function TrustGraphEdgeList(props: {
  edges: TrustGraphEdgeOut[];
  focusUserId?: number | null;
}) {
  const { edges, focusUserId } = props;

  const [filter, setFilter] = useState("");
  const [limit, setLimit] = useState(50);

  const filtered = useMemo(() => {
    const q = safeStr(filter).trim().toLowerCase();
    let list = Array.isArray(edges) ? [...edges] : [];

    if (q) {
      list = list.filter((e) => {
        const blob = [
          e.edge_type,
          e.source_gmfn_id,
          e.target_gmfn_id,
          e.source_user_id,
          e.target_user_id,
          e.clan_id,
          e.loan_id,
        ]
          .map((x) => safeStr(x).toLowerCase())
          .join(" ");

        return blob.includes(q);
      });
    }

    list.sort((a, b) => {
      const da = new Date(a.last_seen_at || a.first_seen_at || 0).getTime();
      const db = new Date(b.last_seen_at || b.first_seen_at || 0).getTime();
      return db - da;
    });

    return list.slice(0, limit);
  }, [edges, filter, limit]);

  return (
    <Card>
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
          <div style={{ fontSize: 16, fontWeight: 1000, color: "#0B1F33" }}>TrustGraph Edges</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
            Relationship edges derived from invites, loans, repayments, merchant releases, and clan structure.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter edges..."
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(11,31,51,0.14)",
              minWidth: 180,
            }}
          />
          <select
            value={String(limit)}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(11,31,51,0.14)",
              background: "#fff",
            }}
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ color: "#64748b", fontSize: 12 }}>No edges found for this filter.</div>
        )}

        {filtered.map((e, idx) => {
          const isInbound = focusUserId != null && Number(e.target_user_id) === Number(focusUserId);
          const isOutbound = focusUserId != null && Number(e.source_user_id) === Number(focusUserId);

          return (
            <div
              key={`${e.edge_type}-${e.source_user_id}-${e.target_user_id}-${idx}`}
              style={{
                border: "1px solid rgba(11,31,51,0.10)",
                borderRadius: 16,
                padding: 12,
                background: "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <Pill kind={edgeKind(e.edge_type) as any}>{safeStr(e.edge_type)}</Pill>
                  {isInbound ? <Pill kind="green">inbound</Pill> : null}
                  {isOutbound ? <Pill kind="gold">outbound</Pill> : null}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Pill kind="gray">weight {safeStr(e.weight)}</Pill>
                  <Pill kind="gray">confidence {safeStr(e.confidence)}</Pill>
                  <Pill kind="gray">events {safeStr(e.event_count)}</Pill>
                </div>
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
                className="gmfn-tg-edge-grid"
              >
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>Source</div>
                  <div style={{ marginTop: 4, fontWeight: 1000, color: "#0B1F33" }}>
                    User #{safeStr(e.source_user_id)}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, color: "#475569" }}>
                    {safeStr(e.source_gmfn_id || "—")}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>Target</div>
                  <div style={{ marginTop: 4, fontWeight: 1000, color: "#0B1F33" }}>
                    User #{safeStr(e.target_user_id)}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, color: "#475569" }}>
                    {safeStr(e.target_gmfn_id || "—")}
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: 10,
                }}
                className="gmfn-tg-edge-grid-4"
              >
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>Clan</div>
                  <div style={{ fontWeight: 900 }}>{safeStr(e.clan_id ?? "—")}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>Loan</div>
                  <div style={{ fontWeight: 900 }}>{safeStr(e.loan_id ?? "—")}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>First seen</div>
                  <div style={{ fontWeight: 900, fontSize: 12 }}>{fmtDate(e.first_seen_at)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>Last seen</div>
                  <div style={{ fontWeight: 900, fontSize: 12 }}>{fmtDate(e.last_seen_at)}</div>
                </div>
              </div>

              {Array.isArray(e.provenance) && e.provenance.length > 0 ? (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>Provenance</div>
                  <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {e.provenance.map((p) => (
                      <Pill key={p} kind="gray">
                        {p}
                      </Pill>
                    ))}
                  </div>
                </div>
              ) : null}

              {e.meta && Object.keys(e.meta).length > 0 ? (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>Meta</div>
                  <pre
                    style={{
                      marginTop: 6,
                      background: "#f8fafc",
                      borderRadius: 12,
                      padding: 10,
                      fontSize: 12,
                      overflowX: "auto",
                      color: "#334155",
                    }}
                  >
                    {JSON.stringify(e.meta, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 780px) {
          .gmfn-tg-edge-grid,
          .gmfn-tg-edge-grid-4 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </Card>
  );
}