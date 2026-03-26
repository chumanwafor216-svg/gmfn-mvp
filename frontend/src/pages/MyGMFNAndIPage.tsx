import React, { useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 26,
    border: "1px solid rgba(11,31,51,0.10)",
    background: bg,
    boxShadow:
      "0 22px 54px rgba(15,23,42,0.07), 0 2px 8px rgba(15,23,42,0.03)",
    padding: 22,
    position: "relative",
    overflow: "hidden",
  };
}

function detailCard(): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #FBFDFF 100%)",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
    position: "relative",
    overflow: "hidden",
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
    background: primary
      ? "linear-gradient(180deg, #1677E6 0%, #0B63D1 100%)"
      : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: primary ? "0 10px 22px rgba(11,99,209,0.16)" : "none",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4F6B8A",
    fontWeight: 1000,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  };
}

const blocks = [
  {
    key: "1",
    title: "My Identity in Trust Terms",
    text:
      "GMFN reflects who I am in trust terms.\n\nWhat it means:\nMy reputation is no longer hidden only in people’s memories, private conversations, or assumptions. It becomes visible and structured.\n\nWhy it matters:\nInstead of starting from zero every time I enter a new community, market, or transaction, my integrity can travel with me.\n\nIn simple terms:\nGMFN helps people see not just my name, but the trust meaning attached to my identity.",
    linkTo: "/app/trust",
    linkLabel: "Open Trust",
  },
  {
    key: "2",
    title: "Trust as Savings",
    text:
      "Every good action becomes stored reliability.\n\nWhat it means:\nGMFN helps me build trust savings, not cash savings. Every fulfilled promise, repayment, and helpful action becomes part of what I have built.\n\nWhy it matters:\nWhen I need support later, I do not start from zero. My past reliability already exists as usable value.\n\nIn simple terms:\nTrust behaves like a stored reserve that I can draw from when opportunity or difficulty comes.",
    linkTo: "/app/trust",
    linkLabel: "View Trust",
  },
  {
    key: "3",
    title: "My Actions Become Record",
    text:
      "Repayments, behaviour, and support become visible evidence.\n\nWhat it means:\nGMFN turns meaningful actions into record instead of letting them disappear.\n\nWhy it matters:\nA person should not have to depend only on storytelling or memory when their behaviour can be shown through evidence.\n\nIn simple terms:\nGood conduct stops being invisible. It becomes part of my record.",
    linkTo: "/app/trust-slip",
    linkLabel: "Open TrustSlip",
  },
  {
    key: "4",
    title: "My Trust Becomes Visible",
    text:
      "Others can see my reliability before dealing with me.\n\nWhat it means:\nGMFN makes trust readable before decisions happen.\n\nWhy it matters:\nThis reduces blind judgment and improves decision quality in trade, support, and community dealings.\n\nIn simple terms:\nInstead of asking only, 'Who is this?', people can also ask, 'How dependable is this person?'",
    linkTo: "/app/trust",
    linkLabel: "Open Trust",
  },
  {
    key: "5",
    title: "Cross-Community Integrity",
    text:
      "My trust works across all communities I belong to.\n\nWhat it means:\nGMFN does not trap my reputation inside one group. It can be read across communities.\n\nWhy it matters:\nPeople often belong to several markets, associations, circles, and support networks. Trust should move with them.\n\nIn simple terms:\nMy integrity is portable, not locked in one place.",
    linkTo: "/app/trust",
    linkLabel: "Open Trust",
  },
  {
    key: "6",
    title: "My TrustSlip",
    text:
      "My trust becomes usable through TrustSlip.\n\nWhat it means:\nTrustSlip is the form my trust takes when it needs to be presented and used.\n\nWhy it matters:\nIt turns invisible reputation into something actionable for support, release-before-payment, and structured trust decisions.\n\nIn simple terms:\nTrustSlip is not money. It is trust expressed in a usable form.",
    linkTo: "/app/trust-slip",
    linkLabel: "Open TrustSlip",
  },
  {
    key: "7",
    title: "Release Before Payment",
    text:
      "Trade can happen based on trust, not only upfront cash.\n\nWhat it means:\nA person may receive goods or services based on visible social backing and known reliability.\n\nWhy it matters:\nThis reflects how many real markets already work informally, but with more structure and clarity.\n\nIn simple terms:\nGMFN helps trust unlock trade before full payment is completed.",
    linkTo: "/app/trust-slip",
    linkLabel: "Open TrustSlip",
  },
  {
    key: "8",
    title: "Trusted Buying and Selling",
    text:
      "Trade decisions are based on visible trust.\n\nWhat it means:\nBuying and selling can be supported by identity, record, and community-backed confidence.\n\nWhy it matters:\nThis reduces weak transactions and improves confidence between buyers and sellers.\n\nIn simple terms:\nTrade becomes safer when people can see who they are dealing with.",
    linkTo: "/app/marketplace",
    linkLabel: "Open Marketplace",
  },
  {
    key: "9",
    title: "Cross-Community Trade",
    text:
      "Trade extends beyond one group into many communities.\n\nWhat it means:\nA person’s credibility does not need to restart from zero every time they enter another community or market.\n\nWhy it matters:\nThis helps expand opportunity beyond local boundaries.\n\nIn simple terms:\nGMFN helps trust move across communities so trade can grow wider.",
    linkTo: "/app/marketplace",
    linkLabel: "Open Marketplace",
  },
  {
    key: "10",
    title: "Fraud Reduction",
    text:
      "People see who they are dealing with before acting.\n\nWhat it means:\nGMFN introduces a trust visibility layer before a transaction or support decision happens.\n\nWhy it matters:\nFraud thrives where people act blindly.\n\nIn simple terms:\nThe clearer the person is, the harder it is for deception to hide.",
    linkTo: "/app/trust-slip/verify",
    linkLabel: "Verify Trust",
  },
  {
    key: "11",
    title: "Spotlight Visibility",
    text:
      "Your shop can be seen without extra effort.\n\nWhat it means:\nSpotlight helps push visibility toward the member’s shop inside shared communities.\n\nWhy it matters:\nPeople need not rely only on manual promotion every time.\n\nIn simple terms:\nGMFN can advertise trusted members and their shops more naturally within the network.",
    linkTo: "/app/marketplace",
    linkLabel: "Open Marketplace",
  },
  {
    key: "12",
    title: "Reputation-Based Visibility",
    text:
      "Visibility is tied to trust, not noise.\n\nWhat it means:\nGMFN is not meant to become a loud marketplace of random shouting.\n\nWhy it matters:\nCommunities need meaningful visibility, not empty visibility.\n\nIn simple terms:\nThe system is stronger when attention is tied to integrity and relevance.",
    linkTo: "/app/trust",
    linkLabel: "Open Trust",
  },
  {
    key: "13",
    title: "People-Backed Loans",
    text:
      "Loans are supported by people, not collateral.\n\nWhat it means:\nSupport can come through human backing, social knowledge, and visible reliability.\n\nWhy it matters:\nMany capable people are locked out because they lack formal collateral, not because they lack character.\n\nIn simple terms:\nGMFN helps trust become part of financial access.",
    linkTo: "/app/loans",
    linkLabel: "Open Loans",
  },
  {
    key: "14",
    title: "Emergency Support",
    text:
      "Communities can respond quickly in urgent situations.\n\nWhat it means:\nWhen time matters, visible trust helps people act faster.\n\nWhy it matters:\nEmergencies often do not wait for formal paperwork or full cash readiness.\n\nIn simple terms:\nTrust can speed up help where delay would be harmful.",
    linkTo: "/app/community",
    linkLabel: "Open Community",
  },
  {
    key: "15",
    title: "Diaspora Trust Bridge",
    text:
      "Support across countries becomes safer and clearer.\n\nWhat it means:\nPeople abroad can support trusted people at home with better visibility and less blind risk.\n\nWhy it matters:\nDiaspora support is often large, but uncertainty remains a major barrier.\n\nIn simple terms:\nGMFN helps distant support become more structured and more confident.",
    linkTo: "/app/community",
    linkLabel: "Open Community",
  },
  {
    key: "16",
    title: "Trust Savings (ROSCA)",
    text:
      "Contribution systems become stronger and more reliable.\n\nWhat it means:\nGMFN can strengthen contribution cultures such as ROSCA, ajo, esusu, stokvel, tanda, susu, hui, and similar systems.\n\nWhy it matters:\nThese systems already work through trust. GMFN helps protect and structure that trust.\n\nIn simple terms:\nIt supports savings culture by making contribution reliability easier to see and remember.",
    linkTo: "/app/community",
    linkLabel: "Open Community",
  },
  {
    key: "17",
    title: "Portable Identity",
    text:
      "One identity works everywhere.\n\nWhat it means:\nMy global ID remains mine across communities.\n\nWhy it matters:\nIdentity fragmentation weakens trust portability.\n\nIn simple terms:\nGMFN helps one person remain one person across the whole network.",
    linkTo: "/app/trust",
    linkLabel: "Open Trust",
  },
  {
    key: "18",
    title: "One Global Shop",
    text:
      "One shop follows me across all communities.\n\nWhat it means:\nMy shop is tied to my identity, not duplicated separately in every place.\n\nWhy it matters:\nThis creates consistency, traceability, and stronger reputation.\n\nIn simple terms:\nOne person, one identity, one shop — visible across communities they belong to.",
    linkTo: "/app/shop-control",
    linkLabel: "Open Shop",
  },
  {
    key: "19",
    title: "Service-Based Trust",
    text:
      "Trust applies beyond trade into real services.\n\nWhat it means:\nGMFN is not just for buying and selling goods. It can support services like labour, transport, care, education, and practical community work.\n\nWhy it matters:\nReal economies are broader than products.\n\nIn simple terms:\nTrust should support services too, not only merchandise.",
    linkTo: "/app/trust",
    linkLabel: "Open Trust",
  },
  {
    key: "20",
    title: "Demand Box",
    text:
      "Anyone can request help without owning a shop.\n\nWhat it means:\nDemand Box is identity-based, not shop-based.\n\nWhy it matters:\nNot everyone wants or needs to open a shop, but they may still need help, supply, labour, or urgent support.\n\nIn simple terms:\nA member does not need a shop to be visible in need.",
    linkTo: "/app/demand-box",
    linkLabel: "Open Demand Box",
  },
  {
    key: "21",
    title: "Community Economic Power",
    text:
      "Trust turns communities into economic systems.\n\nWhat it means:\nWhen trust becomes visible, communities can coordinate trade, support, savings, and opportunity more powerfully.\n\nWhy it matters:\nThis is bigger than one user or one transaction.\n\nIn simple terms:\nGMFN helps communities act like organised economic engines, not scattered individuals.",
    linkTo: "/app/community",
    linkLabel: "Open Community",
  },
];

export default function MyGMFNAndIPage() {
  const [activeKey, setActiveKey] = useState<string | null>(blocks[0].key);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <PageTopNav
        title="My GMFN and I"
        subtitle="Understand in a simple way how GMFN works for you, your community, your reputation, and your real-world opportunities."
      />

      <div
        style={{
          ...pageCard(
            "linear-gradient(180deg, rgba(248,251,255,1) 0%, rgba(242,248,255,1) 100%)"
          ),
          marginTop: 18,
          padding: 0,
        }}
      >
        <div
          style={{
            position: "relative",
            padding: "24px 24px 22px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -40,
              top: -40,
              width: 180,
              height: 180,
              borderRadius: 999,
              background: "rgba(11,99,209,0.06)",
            }}
          />

          <div
            style={{
              position: "absolute",
              right: 80,
              bottom: -50,
              width: 140,
              height: 140,
              borderRadius: 999,
              background: "rgba(11,31,51,0.04)",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={sectionLabel()}>Core understanding</div>

            <div
              style={{
                marginTop: 10,
                fontSize: 30,
                fontWeight: 1000,
                color: "#0B1F33",
                lineHeight: 1.15,
                letterSpacing: -0.3,
                maxWidth: 820,
              }}
            >
              You already have trust. GMFN helps you use it.
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#60758E",
                fontSize: 15,
                lineHeight: 1.85,
                maxWidth: 860,
              }}
            >
              GMFN is not where I come to get money. It is where my reputation
              becomes usable, my integrity becomes measurable, and my community
              backing becomes visible. I do not use GMFN to become trusted. I
              use GMFN to make my existing trust real, visible, and useful.
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gap: 14,
        }}
      >
        {blocks.map((b, idx) => {
          const open = activeKey === b.key;

          return (
            <div
              key={b.key}
              style={{
                ...detailCard(),
                padding: 0,
                border: open
                  ? "1px solid rgba(11,99,209,0.22)"
                  : "1px solid rgba(11,31,51,0.08)",
                boxShadow: open
                  ? "0 20px 46px rgba(11,99,209,0.10), 0 2px 8px rgba(15,23,42,0.03)"
                  : "0 18px 50px rgba(15,23,42,0.05)",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setActiveKey((prev) => (prev === b.key ? null : b.key))
                }
                style={{
                  width: "100%",
                  border: "none",
                  background: "transparent",
                  padding: "18px 20px",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 34,
                      height: 34,
                      borderRadius: 999,
                      padding: "0 10px",
                      background: open
                        ? "linear-gradient(180deg, #1677E6 0%, #0B63D1 100%)"
                        : "#F1F5F9",
                      color: open ? "#FFFFFF" : "#475569",
                      fontSize: 12,
                      fontWeight: 1000,
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#64748B",
                        fontWeight: 1000,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      My GMFN and I
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 20,
                        fontWeight: 1000,
                        color: "#0B1F33",
                        lineHeight: 1.3,
                      }}
                    >
                      {b.title}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 1000,
                    color: open ? "#0B63D1" : "#64748B",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {open ? "Close" : "Open"}
                </div>
              </button>

              {open ? (
                <div
                  style={{
                    borderTop: "1px solid rgba(11,31,51,0.08)",
                    padding: "0 20px 20px",
                  }}
                >
                  <div
                    style={{
                      marginTop: 16,
                      color: "#475569",
                      lineHeight: 1.95,
                      fontSize: 16,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {b.text}
                  </div>

                  <div
                    style={{
                      marginTop: 18,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <Link to={b.linkTo} style={actionLink(true)}>
                      {b.linkLabel}
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
        })}
      </div>
    </div>
  );
}