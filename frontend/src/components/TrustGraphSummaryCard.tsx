import React from "react";
import { Card, Pill } from "../components/uiKit";
import { TrustGraphSummaryOut } from "../lib/api";

function safeStr(x: any): string {
  return (x ?? "").toString();
}

function statLabel(label: string, value: React.ReactNode) {
  return (
    <div
      style={{
        border: "1px solid rgba(11,31,51,0.08)",
        borderRadius: 14,
        padding: 12,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>{value}</div>
    </div>
  );
}

export default function TrustGraphSummaryCard(props: {
  summary: TrustGraphSummaryOut;
  trustBand?: string | null;
  trustScore?: number | null;
}) {
  const { summary, trustBand, trustScore } = props;

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
          <div style={{ fontSize: 16, fontWeight: 1000, color: "#0B1F33" }}>TrustGraph Summary</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
            Internal command-centre analysis of cross-clan trust structure.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Pill kind="blue">CCI {safeStr(summary.cci_score)}</Pill>
          <Pill kind="gold">Graph {safeStr(summary.graph_score)}</Pill>
          {trustBand ? <Pill kind="green">Band {safeStr(trustBand)}</Pill> : null}
          {trustScore != null ? <Pill kind="gray">Trust {safeStr(trustScore)}</Pill> : null}
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 10,
        }}
        className="gmfn-tg-grid-4"
      >
        {statLabel("Active clans", summary.active_clan_count)}
        {statLabel("Sponsors", summary.sponsor_count)}
        {statLabel("Counterparties", summary.unique_counterparties)}
        {statLabel("Inbound edges", summary.inbound_trust_edges)}
        {statLabel("Outbound edges", summary.outbound_trust_edges)}
        {statLabel("Repayment edges", summary.repayment_edge_count)}
        {statLabel("Guarantee edges", summary.guarantee_edge_count)}
        {statLabel("Invite edges", summary.invite_edge_count)}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Risk flags</div>
        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Array.isArray(summary.risk_flags) && summary.risk_flags.length > 0 ? (
            summary.risk_flags.map((flag) => (
              <Pill key={flag} kind="red">
                {flag}
              </Pill>
            ))
          ) : (
            <Pill kind="green">no major graph flags</Pill>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .gmfn-tg-grid-4 {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 620px) {
          .gmfn-tg-grid-4 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </Card>
  );
}