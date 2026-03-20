import React, { useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";

function card(active = false): React.CSSProperties {
  return {
    borderRadius: 22,
    border: active
      ? "1px solid rgba(11,99,209,0.24)"
      : "1px solid rgba(11,31,51,0.08)",
    background: active ? "#F8FBFF" : "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
    cursor: "pointer",
  };
}

function detailCard(): React.CSSProperties {
  return {
    borderRadius: 22,
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

const blocks = [
  {
    key: "community_support",
    title: "Community Support",
    text:
      "People who already know your integrity can support your next business move. Their reputation stands with you, guiding and strengthening your decisions.",
    linkTo: "/app/community",
    linkLabel: "Open Community Home",
  },
  {
    key: "verified_integrity",
    title: "Verified Integrity",
    text:
      "GMFN automatically records your financial behaviour. Repayments and fulfilled commitments become visible proof of your integrity.",
    linkTo: "/app/trust-slip",
    linkLabel: "Open TrustSlip",
  },
  {
    key: "clear_decisions",
    title: "Clear Decisions",
    text:
      "Before you trade, you can see the trust standing of the person you are dealing with. This helps you know who is safe to do business with.",
    linkTo: "/app/trust",
    linkLabel: "Open Community Standing",
  },
  {
    key: "trusted_markets",
    title: "Trusted Markets",
    text:
      "Many markets operate on trust and credit. GMFN makes that trust visible so merchants can trade confidently.",
    linkTo: "/app/marketplace",
    linkLabel: "Open Marketplace",
  },
  {
    key: "open_marketplace",
    title: "Open Marketplace",
    text:
      "Display your goods and services across communities. The GMFN network connects buyers and sellers across markets.",
    linkTo: "/app/marketplace",
    linkLabel: "Open Marketplace",
  },
  {
    key: "merchant_verification",
    title: "Merchant Verification",
    text:
      "Verify traders and merchants through community-backed trust records. Know who you are dealing with before any transaction begins.",
    linkTo: "/app/trust-slip/verify",
    linkLabel: "Open TrustSlip Verify",
  },
];

export default function MyGMFNAndIPage() {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const active = blocks.find((b) => b.key === activeKey) || null;

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <PageTopNav
        title="My GMFN and I"
        subtitle="Understand in a simple way how GMFN works for you, your community, and your business relationships."
      />

      <div style={{ ...detailCard(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          What this page is for
        </div>
        <div style={{ marginTop: 10, color: "#475569", lineHeight: 1.8 }}>
          GMFN is not asking you to prove yourself from nothing. It helps make
          the integrity, repayment behaviour, and trusted relationships you have
          already built visible and usable.
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        {blocks.map((b) => (
          <div
            key={b.key}
            style={card(activeKey === b.key)}
            onClick={() => setActiveKey((prev) => (prev === b.key ? null : b.key))}
          >
            <div
              style={{
                fontSize: 12,
                color: "#64748b",
                fontWeight: 1000,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              GMFN AND I
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 20,
                fontWeight: 1000,
                color: "#0B1F33",
                lineHeight: 1.25,
              }}
            >
              {b.title}
            </div>

            <div
              style={{
                marginTop: 12,
                color: "#6B7A88",
                lineHeight: 1.7,
                fontSize: 14,
              }}
            >
              Click to understand what this means for you.
            </div>
          </div>
        ))}
      </div>

      {active ? (
        <div style={{ ...detailCard(), marginTop: 18 }}>
          <div
            style={{
              fontSize: 12,
              color: "#64748b",
              fontWeight: 1000,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Selected Topic
          </div>

          <div
            style={{
              marginTop: 10,
              fontSize: 26,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {active.title}
          </div>

          <div
            style={{
              marginTop: 14,
              color: "#475569",
              lineHeight: 1.9,
              fontSize: 16,
              maxWidth: 860,
            }}
          >
            {active.text}
          </div>

          <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to={active.linkTo} style={actionLink(true)}>
              {active.linkLabel}
            </Link>

            <button
              type="button"
              onClick={() => setActiveKey(null)}
              style={actionLink(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}