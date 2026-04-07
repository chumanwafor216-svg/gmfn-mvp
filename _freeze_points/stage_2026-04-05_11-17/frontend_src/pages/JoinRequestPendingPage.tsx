import React from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";

function safeStr(x: any, fallback = ""): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    border: "1px solid rgba(11,31,51,0.08)",
    borderRadius: 20,
    background: bg,
    padding: 18,
    boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    border: "1px solid rgba(11,31,51,0.08)",
    borderRadius: 16,
    background: bg,
    padding: 14,
  };
}

function actionBtn(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 12,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.12)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    textDecoration: "none",
    cursor: "pointer",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4F6B8A",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

export default function JoinRequestPendingPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const state =
    (location.state as {
      request_id?: string | number;
      community_name?: string;
    }) || {};

  const requestId = safeStr(
    state.request_id || searchParams.get("request_id") || ""
  );

  const communityName = safeStr(
    state.community_name || searchParams.get("community_name") || "the community",
    "the community"
  );

  return (
    <div style={{ padding: 20, maxWidth: 760, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        title="Join Request Pending"
        subtitle="Your request has been received and is now waiting for community review."
      />

      <div
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
          marginTop: 18,
        }}
      >
        <div style={sectionLabel()}>Request submitted</div>

        <div
          style={{
            marginTop: 8,
            fontSize: 28,
            fontWeight: 1000,
            color: "#0B1F33",
            lineHeight: 1.15,
          }}
        >
          Community review is now in progress
        </div>

        <div
          style={{
            marginTop: 10,
            color: "#64748B",
            lineHeight: 1.8,
          }}
        >
          Your join request has been sent to {communityName}. Entry is not automatic.
          Members of the community still need to review and approve your request.
        </div>
      </div>

      <div style={{ ...pageCard(), marginTop: 18 }}>
        <div style={sectionLabel()}>What happens next</div>

        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <div style={softCard()}>
            <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 18 }}>
              1. Community review
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#64748B",
                lineHeight: 1.8,
                fontSize: 14,
              }}
            >
              Members review your request according to the approval rule already in place.
            </div>
          </div>

          <div style={softCard()}>
            <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 18 }}>
              2. Approval outcome
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#64748B",
                lineHeight: 1.8,
                fontSize: 14,
              }}
            >
              If approved, your GMFN identity will be issued and you will continue to activation.
            </div>
          </div>

          <div style={softCard()}>
            <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 18 }}>
              3. Activation
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#64748B",
                lineHeight: 1.8,
                fontSize: 14,
              }}
            >
              Activation is the step where you create your password and enter your personal surfaces properly.
            </div>
          </div>
        </div>
      </div>

      {requestId ? (
        <div style={{ ...pageCard(), marginTop: 18 }}>
          <div style={sectionLabel()}>Track this request</div>

          <div
            style={{
              marginTop: 8,
              color: "#0B1F33",
              fontWeight: 1000,
              fontSize: 20,
            }}
          >
            Request ID: {requestId}
          </div>

          <div
            style={{
              marginTop: 10,
              color: "#64748B",
              lineHeight: 1.8,
            }}
          >
            Use this request ID to check the approval outcome later.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link to={`/join-approval/${encodeURIComponent(requestId)}`} style={actionBtn(true)}>
              Check approval status
            </Link>
          </div>
        </div>
      ) : null}

      <div style={{ ...pageCard(), marginTop: 18 }}>
        <div style={sectionLabel()}>Useful links</div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <a
            href="/GSN_FINAL_WHITE.pdf"
            target="_blank"
            rel="noreferrer"
            style={actionBtn(false)}
          >
            Open guide
          </a>

          <Link to="/welcome" style={actionBtn(false)}>
            Welcome
          </Link>

          <Link to="/cover" style={actionBtn(false)}>
            Cover
          </Link>
        </div>
      </div>
    </div>
  );
}