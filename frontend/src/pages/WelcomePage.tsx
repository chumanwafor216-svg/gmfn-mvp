import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const ACCESS_TOKEN_KEY = "access_token";
const ENTRY_MODE_KEY = "gmfn_entry_mode";

const COVER_TO = "/cover";
const GUIDE_TO = "/guide";
const LOGIN_TO = "/login";
const CREATE_TO = "/create";
const JOIN_TO = "/join";
const ACTIVATE_TO = "/activate-membership";
const DASHBOARD_TO = "/app/dashboard";
const PDF_FALLBACK_TO = "/GSN_FINAL_WHITE.pdf";

type EntryMode = "general" | "create" | "invite" | "approved" | "existing";

function readStorage(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    const value = window.localStorage.getItem(key);
    return value == null ? null : String(value);
  } catch {
    return null;
  }
}

function hasAccessToken(): boolean {
  return Boolean(String(readStorage(ACCESS_TOKEN_KEY) || "").trim());
}

function getEntryMode(): EntryMode | null {
  const raw = String(readStorage(ENTRY_MODE_KEY) || "").trim().toLowerCase();

  if (
    raw === "general" ||
    raw === "create" ||
    raw === "invite" ||
    raw === "approved" ||
    raw === "existing"
  ) {
    return raw as EntryMode;
  }

  return null;
}

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background: "#F4F8FC",
    padding: "28px 18px 42px",
    boxSizing: "border-box",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 28,
    background: bg,
    border: "1px solid rgba(11,31,51,0.08)",
    boxShadow:
      "0 18px 44px rgba(15,23,42,0.05), 0 2px 10px rgba(15,23,42,0.02)",
    padding: 22,
  };
}

function softPanel(): React.CSSProperties {
  return {
    borderRadius: 20,
    background: "#F8FBFF",
    border: "1px solid rgba(11,31,51,0.08)",
    padding: 18,
  };
}

function stepCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    background: "#FFFFFF",
    border: "1px solid rgba(11,31,51,0.08)",
    padding: 16,
  };
}

function utilityLink(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    padding: "9px 12px",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 800,
    border: "1px solid rgba(11,31,51,0.10)",
    fontSize: 14,
    whiteSpace: "nowrap",
  };
}

function backBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    padding: "10px 14px",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 800,
    border: "1px solid rgba(11,31,51,0.10)",
    cursor: "pointer",
    fontSize: 14,
  };
}

function primaryBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    width: "100%",
    padding: "12px 16px",
    borderRadius: 16,
    background: "#0B63D1",
    color: "#FFFFFF",
    textDecoration: "none",
    fontWeight: 900,
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
    minHeight: 50,
    width: "100%",
    padding: "12px 16px",
    borderRadius: 16,
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 800,
    border: "1px solid rgba(11,31,51,0.10)",
    cursor: "pointer",
    fontSize: 15,
  };
}

function labelText(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 900,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  };
}

function heroEyebrow(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 34,
    padding: "7px 12px",
    borderRadius: 999,
    background: "rgba(11,99,209,0.08)",
    color: "#0B63D1",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.2,
  };
}

function loadingCard(): React.CSSProperties {
  return {
    ...pageCard("#FFFFFF"),
    maxWidth: 720,
    margin: "84px auto 0",
    textAlign: "center",
    color: "#5E7288",
    fontSize: 15,
    lineHeight: 1.8,
  };
}

export default function WelcomePage() {
  const navigate = useNavigate();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 920;
  });

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 920);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (hasAccessToken()) {
      navigate(DASHBOARD_TO, { replace: true });
      return;
    }

    const mode = getEntryMode();

    if (mode === "create") {
      navigate(CREATE_TO, { replace: true });
      return;
    }

    if (mode === "invite") {
      navigate(JOIN_TO, { replace: true });
      return;
    }

    if (mode === "approved") {
      navigate(ACTIVATE_TO, { replace: true });
      return;
    }

    if (mode === "existing") {
      navigate(LOGIN_TO, { replace: true });
      return;
    }

    setReady(true);
  }, [navigate]);

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(COVER_TO);
  }

  if (!ready) {
    return (
      <div style={pageShell()}>
        <div style={loadingCard()}>
          Preparing the correct entry route...
        </div>
      </div>
    );
  }

  return (
    <div style={pageShell()}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
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
            <Link to={COVER_TO} style={utilityLink()}>
              Cover
            </Link>
            <Link to={GUIDE_TO} style={utilityLink()}>
              My GMFN and I
            </Link>
            <Link to={LOGIN_TO} style={utilityLink()}>
              Login
            </Link>
          </div>
        </div>

        <section
          style={{
            ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
            padding: isCompact ? 22 : 30,
          }}
        >
          <div style={labelText()}>Welcome</div>

          <div style={{ marginTop: 12 }}>
            <span style={heroEyebrow()}>General public path</span>
          </div>

          <h1
            style={{
              margin: "14px 0 0",
              fontSize: isCompact ? 32 : 46,
              lineHeight: 1.06,
              fontWeight: 900,
              color: "#0B1F33",
              maxWidth: 820,
            }}
          >
            Do you need more information on what GSN can do for you?
          </h1>

          <p
            style={{
              margin: "14px 0 0",
              fontSize: 17,
              lineHeight: 1.82,
              color: "#35516B",
              maxWidth: 900,
            }}
          >
            This page is only for the general public route. Read the guide first
            if you want a clearer understanding of how identity, trust,
            community, demand, spotlight, marketplace, and shop surfaces work
            together. If you already understand the system, continue to login.
          </p>

          <div
            style={{
              marginTop: 20,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
              gap: 12,
              maxWidth: 760,
            }}
          >
            <Link to={GUIDE_TO} style={secondaryBtn()}>
              Yes — open My GMFN and I
            </Link>

            <Link to={LOGIN_TO} style={primaryBtn()}>
              No — continue to login
            </Link>
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <a
              href={PDF_FALLBACK_TO}
              target="_blank"
              rel="noreferrer"
              style={utilityLink()}
            >
              PDF fallback
            </a>
          </div>
        </section>

        <section
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.05fr) minmax(320px, 0.95fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div style={pageCard("#FFFFFF")}>
            <div style={labelText()}>What happens next</div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div style={stepCard()}>
                <div
                  style={{
                    color: "#0B63D1",
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: 0.3,
                    textTransform: "uppercase",
                  }}
                >
                  Step 1
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontSize: 14,
                    fontWeight: 800,
                    lineHeight: 1.65,
                  }}
                >
                  Read My GMFN and I if you want a calmer explanation first.
                </div>
              </div>

              <div style={stepCard()}>
                <div
                  style={{
                    color: "#0B63D1",
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: 0.3,
                    textTransform: "uppercase",
                  }}
                >
                  Step 2
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontSize: 14,
                    fontWeight: 800,
                    lineHeight: 1.65,
                  }}
                >
                  Continue to login when you are ready to enter your account.
                </div>
              </div>

              <div style={stepCard()}>
                <div
                  style={{
                    color: "#0B63D1",
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: 0.3,
                    textTransform: "uppercase",
                  }}
                >
                  Step 3
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontSize: 14,
                    fontWeight: 800,
                    lineHeight: 1.65,
                  }}
                >
                  After login, you continue directly into your dashboard.
                </div>
              </div>
            </div>
          </div>

          <div style={pageCard("#F8FBFF")}>
            <div style={labelText()}>Important routing note</div>

            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              <div style={softPanel()}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: 15,
                    fontWeight: 900,
                  }}
                >
                  Create route is separate
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#5E7288",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  Founder or public create entry should not stop here. That flow
                  should move from Cover into Create Entry directly.
                </div>
              </div>

              <div style={softPanel()}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: 15,
                    fontWeight: 900,
                  }}
                >
                  Invite route is separate
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#5E7288",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  Invited people should move through Join Entry, Pending
                  Approval, and Activation — not through this general public
                  page.
                </div>
              </div>

              <div style={softPanel()}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: 15,
                    fontWeight: 900,
                  }}
                >
                  Existing users should sign in
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#5E7288",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  Once a person already has access, public entry choices should
                  disappear and login becomes the main route.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            marginTop: 18,
            ...pageCard("#FFFFFF"),
          }}
        >
          <div style={labelText()}>Why this page is simple</div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 900,
                  color: "#0B1F33",
                  fontSize: 16,
                }}
              >
                Less choice overload
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#6B7A88",
                  lineHeight: 1.75,
                  fontSize: 14,
                }}
              >
                This page should guide, not overwhelm. It only asks one clear
                question.
              </div>
            </div>

            <div>
              <div
                style={{
                  fontWeight: 900,
                  color: "#0B1F33",
                  fontSize: 16,
                }}
              >
                Plain language first
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#6B7A88",
                  lineHeight: 1.75,
                  fontSize: 14,
                }}
              >
                People should not need to decode internal system logic before
                knowing where to go next.
              </div>
            </div>

            <div>
              <div
                style={{
                  fontWeight: 900,
                  color: "#0B1F33",
                  fontSize: 16,
                }}
              >
                Clear next movement
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#6B7A88",
                  lineHeight: 1.75,
                  fontSize: 14,
                }}
              >
                The right route should feel calm, trustworthy, and easy to
                continue.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}