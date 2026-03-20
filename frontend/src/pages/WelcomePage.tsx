import React from "react";
import { Link, useNavigate } from "react-router-dom";

function card(): React.CSSProperties {
  return {
    borderRadius: 24,
    background: "#FFFFFF",
    border: "1px solid rgba(11,31,51,0.08)",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 24,
  };
}

function actionCard(active = false): React.CSSProperties {
  return {
    borderRadius: 22,
    background: active ? "#F8FBFF" : "#FFFFFF",
    border: active
      ? "1px solid rgba(11,99,209,0.20)"
      : "1px solid rgba(11,31,51,0.08)",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 24,
  };
}

function primaryBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "14px 18px",
    borderRadius: 16,
    background: "#0B63D1",
    color: "#FFFFFF",
    textDecoration: "none",
    fontWeight: 1000,
    border: "none",
    cursor: "pointer",
    fontSize: 15,
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "14px 18px",
    borderRadius: 16,
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 1000,
    border: "1px solid rgba(11,31,51,0.10)",
    cursor: "pointer",
    fontSize: 15,
  };
}

function secondaryLink(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 900,
    border: "1px solid rgba(11,31,51,0.10)",
    fontSize: 14,
  };
}

function labelText(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 1000,
    letterSpacing: 0.2,
  };
}

function backBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 900,
    border: "1px solid rgba(11,31,51,0.10)",
    cursor: "pointer",
    fontSize: 14,
  };
}

export default function WelcomePage() {
  const navigate = useNavigate();

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/cover");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5FAFE",
        padding: "34px 22px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div
          style={{
            marginBottom: 14,
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button type="button" onClick={goBack} style={backBtn()}>
            ← Back
          </button>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/cover" style={secondaryLink()}>
              Cover
            </Link>
            <Link to="/login" style={secondaryLink()}>
              Login
            </Link>
            <Link to="/activate" style={secondaryLink()}>
              Activate Membership
            </Link>
          </div>
        </div>

        <div style={{ ...card(), padding: 30 }}>
          <div
            style={{
              fontSize: 42,
              lineHeight: 1.08,
              fontWeight: 1000,
              color: "#0B1F33",
              maxWidth: 760,
            }}
          >
            Welcome to GMFN.
          </div>

          <div
            style={{
              marginTop: 14,
              fontSize: 18,
              lineHeight: 1.8,
              color: "#35516B",
              maxWidth: 940,
            }}
          >
            GMFN is not an open social platform. Entry follows existing trust
            relationships and community rules. From here, choose whether you are
            joining an existing community through an invitation, activating an
            already approved membership, or creating a new community path.
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
          }}
        >
          <div style={actionCard(true)}>
            <div style={labelText()}>JOIN PATH</div>

            <div
              style={{
                marginTop: 12,
                fontSize: 24,
                fontWeight: 1000,
                color: "#0B1F33",
              }}
            >
              Join a Community
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#6B7A88",
                lineHeight: 1.8,
                fontSize: 15,
              }}
            >
              Use this path if a member you already know has invited you into an
              existing GMFN community.
            </div>

            <div
              style={{
                marginTop: 18,
                borderRadius: 16,
                background: "#F8FBFF",
                border: "1px solid rgba(11,31,51,0.08)",
                padding: 16,
              }}
            >
              <div
                style={{
                  fontWeight: 1000,
                  color: "#0B1F33",
                  fontSize: 15,
                }}
              >
                Important
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#6B7A88",
                  lineHeight: 1.75,
                  fontSize: 14,
                }}
              >
                Receiving an invitation does not by itself guarantee admission.
                You may be invited to begin the joining process, but final entry
                still depends on the approval rules already set inside that
                community.
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                display: "grid",
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() => navigate("/join")}
                style={primaryBtn()}
              >
                Continue to Join Path
              </button>

              <button
                type="button"
                onClick={() => navigate("/activate")}
                style={secondaryBtn()}
              >
                I have been approved — Activate Membership
              </button>

              <button
                type="button"
                onClick={() => navigate("/login")}
                style={secondaryBtn()}
              >
                I already have access — Sign in
              </button>
            </div>
          </div>

          <div style={actionCard()}>
            <div style={labelText()}>CREATE PATH</div>

            <div
              style={{
                marginTop: 12,
                fontSize: 24,
                fontWeight: 1000,
                color: "#0B1F33",
              }}
            >
              Create a Community
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#6B7A88",
                lineHeight: 1.8,
                fontSize: 15,
              }}
            >
              Use this path if you are coming from public awareness, campaign, or
              advert entry and want to establish a new GMFN community as a
              founder.
            </div>

            <div
              style={{
                marginTop: 18,
                borderRadius: 16,
                background: "#F8FBFF",
                border: "1px solid rgba(11,31,51,0.08)",
                padding: 16,
              }}
            >
              <div
                style={{
                  fontWeight: 1000,
                  color: "#0B1F33",
                  fontSize: 15,
                }}
              >
                What this means
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#6B7A88",
                  lineHeight: 1.75,
                  fontSize: 14,
                }}
              >
                This route is for creating a new community, becoming its first
                responsible member, and activating the future join-link path for
                those you will later invite into that network.
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                display: "grid",
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() => navigate("/create")}
                style={primaryBtn()}
              >
                Continue to Create Path
              </button>

              <button
                type="button"
                onClick={() => navigate("/login")}
                style={secondaryBtn()}
              >
                I already have access — Sign in
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            ...card(),
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 1000,
                color: "#0B1F33",
                fontSize: 16,
              }}
            >
              Trust-based entry
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#6B7A88",
                lineHeight: 1.75,
                fontSize: 14,
              }}
            >
              GMFN begins from real trust networks, not open public membership.
            </div>
          </div>

          <div>
            <div
              style={{
                fontWeight: 1000,
                color: "#0B1F33",
                fontSize: 16,
              }}
            >
              Approval matters
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#6B7A88",
                lineHeight: 1.75,
                fontSize: 14,
              }}
            >
              Joining an existing community may require approval by the members
              already inside it.
            </div>
          </div>

          <div>
            <div
              style={{
                fontWeight: 1000,
                color: "#0B1F33",
                fontSize: 16,
              }}
            >
              Identity is issued properly
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#6B7A88",
                lineHeight: 1.75,
                fontSize: 14,
              }}
            >
              GMFN identity should follow trust approval and structured entry,
              not casual self-assignment.
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            ...card(),
            background: "#F8FBFF",
          }}
        >
          <div
            style={{
              fontWeight: 1000,
              color: "#0B1F33",
              fontSize: 18,
            }}
          >
            Already approved by a community?
          </div>

          <div
            style={{
              marginTop: 8,
              color: "#6B7A88",
              lineHeight: 1.75,
              fontSize: 14,
              maxWidth: 760,
            }}
          >
            If your join request has already been approved and you have been
            issued a GMFN ID, go straight to membership activation to set your
            password and enter the workspace.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link to="/activate" style={secondaryLink()}>
              Activate Membership
            </Link>

            <Link to="/login" style={secondaryLink()}>
              Go to Login
            </Link>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link to="/cover" style={secondaryLink()}>
            Back to Cover
          </Link>

          <Link to="/login" style={secondaryLink()}>
            Go to Login
          </Link>

          <Link to="/activate" style={secondaryLink()}>
            Activate Membership
          </Link>
        </div>
      </div>
    </div>
  );
}