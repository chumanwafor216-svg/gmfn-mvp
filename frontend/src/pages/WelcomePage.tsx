import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import GSNBrandMonument from "../components/GSNBrandMonument";
import OriginLink from "../components/OriginLink";
import {
  detectEntryMode,
  initialWelcomeStep,
  isKnownSingleLane,
  routeForActivation,
  routeForCreate,
  routeForJoin,
  writeStorage,
  ENTRY_CREATE_CODE_KEY,
  ENTRY_INVITE_CODE_KEY,
  ENTRY_MODE_KEY,
  type EntryMode,
  type WelcomeStep,
} from "../lib/entryFlow";

const GUIDE_SUMMARY_ITEMS = [
  "Release Before Payment",
  "Trusted Buying and Selling",
  "Cross-Community Trade",
  "Fraud Reduction Before Action",
  "Spotlight Visibility",
  "Reputation-Based Visibility",
  "Marketplace Presence Across Communities",
  "People-Backed Loans",
  "Supporting Others",
  "Emergency Support",
  "Diaspora Trust Bridge",
  "Trust Savings (ROSCA Support)",
  "Contribution Tracking",
  "Continuity Across Distance",
  "Portable Trust Identity",
  "Reputation Mobility",
  "One Global Shop",
  "Service Economy Participation",
  "Trust-Based Hiring",
  "Demand Box",
  "Community Economic Power",
  "Commitment Builder",
] as const;

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at top, rgba(47,103,196,0.16) 0%, rgba(16,37,59,0.00) 32%), linear-gradient(180deg, #10243A 0%, #173654 62%, #26527C 100%)",
    color: "#FFFFFF",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    padding: "22px",
    boxSizing: "border-box",
  };
}

function heroCard(): React.CSSProperties {
  return {
    maxWidth: 980,
    width: "100%",
    borderRadius: 32,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
    padding: 28,
    backdropFilter: "blur(10px)",
  };
}

function labelText(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#F3D06A",
    fontWeight: 900,
    letterSpacing: 3.6,
    textTransform: "uppercase",
  };
}

function primaryBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    padding: "14px 22px",
    borderRadius: 16,
    border: "none",
    fontSize: 15,
    fontWeight: 900,
    textAlign: "center",
    background: "#F3D06A",
    color: "#10253B",
    cursor: "pointer",
    textDecoration: "none",
    boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
    whiteSpace: "normal",
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    color: "#FFFFFF",
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 14,
    textAlign: "center",
    whiteSpace: "normal",
    cursor: "pointer",
  };
}

function routeCard(): React.CSSProperties {
  return {
    width: "min(100%, 300px)",
    justifySelf: "center",
    borderRadius: 20,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: 16,
    display: "grid",
    gap: 10,
  };
}

function infoCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: 16,
  };
}

function supportText(): React.CSSProperties {
  return {
    color: "rgba(255,255,255,0.84)",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function addForceLoginFlag(base: string): string {
  const [pathname, rawQuery = ""] = String(base || "").split("?");
  const params = new URLSearchParams(rawQuery);
  params.set("force", "1");
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function WelcomePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 920;
  });

  const entryMode = useMemo<EntryMode>(
    () => detectEntryMode(location.pathname, location.search, location.state),
    [location.pathname, location.search, location.state]
  );

  const [step, setStep] = useState<WelcomeStep>(initialWelcomeStep(entryMode));
  const [guideOpen, setGuideOpen] = useState(false);

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
    setStep(initialWelcomeStep(entryMode));
  }, [entryMode]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "GSN | Welcome";
    }
  }, []);

  const createTo = useMemo(() => routeForCreate(location.search), [location.search]);
  const joinTo = useMemo(() => routeForJoin(location.search), [location.search]);
  const activationTo = useMemo(
    () => routeForActivation(location.search),
    [location.search]
  );

  const loginTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    params.delete("entry");
    const base = `/login${params.toString() ? `?${params.toString()}` : ""}`;
    return addForceLoginFlag(base);
  }, [location.search]);

  function openCreate() {
    writeStorage(ENTRY_MODE_KEY, "create");
    writeStorage(ENTRY_INVITE_CODE_KEY, null);
    navigate(createTo);
  }

  function openJoin() {
    writeStorage(ENTRY_MODE_KEY, "invite");
    writeStorage(ENTRY_CREATE_CODE_KEY, null);
    navigate(joinTo);
  }

  function openExisting() {
    writeStorage(ENTRY_MODE_KEY, "existing");
    navigate(loginTo);
  }

  function openActivation() {
    writeStorage(ENTRY_MODE_KEY, "approved");
    navigate(activationTo);
  }

  const headline =
    entryMode === "invite"
      ? "Continue your invitation."
      : entryMode === "create"
      ? "Continue creating your community."
      : entryMode === "approved"
      ? "Complete your activation."
      : entryMode === "existing"
      ? "Sign in to continue."
      : step === "choose_new_lane"
      ? "Choose your path."
      : "Welcome";

  const subtext =
    entryMode === "invite"
      ? "Your invitation has already been recognised. Continue below."
      : entryMode === "create"
      ? "You are already on the community-creation path. Continue below."
      : entryMode === "approved"
      ? "Your approval has already been confirmed. Finish activation below."
      : entryMode === "existing"
      ? "Choose this only if you already have an active account."
      : step === "choose_new_lane"
      ? "Choose how you want to continue."
      : "Choose how you want to continue.";

  return (
    <div style={pageShell()}>
      <div style={heroCard()}>
        {guideOpen ? (
          <div style={{ display: "grid", gap: 18 }}>
            <div
              style={{
                display: "grid",
                gap: 8,
                justifyItems: "center",
                textAlign: "center",
              }}
            >
              <div style={labelText()}>GSN summary</div>
              <div
                style={{
                  fontSize: isCompact ? 28 : 36,
                  fontWeight: 900,
                  lineHeight: 1.08,
                  maxWidth: 760,
                  color: "#FFFFFF",
                }}
              >
                My GSN and I
              </div>
            </div>

            <div
              style={{
                ...infoCard(),
                background:
                  "linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(230,239,252,0.96) 58%, rgba(212,226,246,0.92) 100%)",
                border: "1px solid rgba(255,255,255,0.34)",
                boxShadow: "0 22px 56px rgba(5,16,38,0.26)",
                padding: 22,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => setGuideOpen(false)}
                  style={{
                    ...secondaryBtn(),
                    minHeight: 42,
                    padding: "10px 16px",
                    borderRadius: 14,
                    border: "1px solid rgba(16,37,59,0.12)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(229,237,249,0.96) 100%)",
                    color: "#123055",
                    boxShadow: "0 10px 24px rgba(10, 24, 49, 0.14)",
                    fontWeight: 900,
                  }}
                >
                  Collapse
                </button>
              </div>

              <div style={{ display: "grid", gap: 18 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    paddingTop: 4,
                    paddingBottom: 6,
                  }}
                >
                  <GSNBrandMonument
                    width={isCompact ? 147 : 182}
                    height={isCompact ? 241 : 301}
                  />
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                <div
                  style={{
                    fontSize: isCompact ? 24 : 30,
                    fontWeight: 900,
                    lineHeight: 1.12,
                    color: "#10253B",
                    maxWidth: 720,
                  }}
                >
                  Trust made visible, portable, and usable.
                </div>

                <div
                  style={{
                    ...supportText(),
                    color: "rgba(16,37,59,0.88)",
                    maxWidth: 760,
                  }}
                >
                  What GSN can do across trust, trade, finance, identity, and work.
                </div>
              </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                }}
              >
                {GUIDE_SUMMARY_ITEMS.map((item, index) => (
                  <div
                    key={item}
                    style={{
                      borderRadius: 14,
                      border: "1px solid rgba(16,37,59,0.10)",
                      background:
                        index < 2
                          ? "rgba(243,208,106,0.16)"
                          : "rgba(116,136,160,0.14)",
                      backdropFilter: "blur(3px)",
                      padding: "12px 14px",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#10253B",
                    }}
                  >
                    <span style={{ color: "#8A651E", marginRight: 8 }}>
                      {index + 1}.
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
        <div style={{ display: "grid", gap: 18 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr minmax(0, 760px) 1fr",
              alignItems: "start",
              gap: 12,
            }}
          >
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <OriginLink to="/cover" style={{ ...secondaryBtn(), fontSize: 0 }}>
              <span style={{ fontSize: 14 }}>{"<-"}</span>
              
            </OriginLink>
          </div>

          <div style={{ textAlign: "center", display: "grid", gap: 10, justifyItems: "center" }}>
            <div style={labelText()}>GSN</div>
            <div
              style={{
                fontSize: isCompact ? 30 : 40,
                fontWeight: 900,
                lineHeight: 1.08,
                maxWidth: 760,
              }}
            >
              {headline}
            </div>

            <div
              style={{
                fontSize: 16,
                lineHeight: 1.82,
                color: "rgba(255,255,255,0.90)",
                maxWidth: 760,
              }}
            >
              {subtext}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              style={secondaryBtn()}
            >
              My GSN and I
            </button>
          </div>
          </div>

          {entryMode === "create" && isKnownSingleLane(entryMode) ? (
            <div style={routeCard()}>
              <div style={labelText()}>Create</div>
              <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>
                Create a new community
              </div>
              <div style={supportText()}>
                Set up your community and continue from there.
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button type="button" onClick={openCreate} style={primaryBtn()}>
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {entryMode === "invite" && isKnownSingleLane(entryMode) ? (
            <div style={routeCard()}>
              <div style={labelText()}>Invitation</div>
              <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>
                Join an existing community
              </div>
              <div style={supportText()}>
                Continue your join request through the guided invitation path.
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button type="button" onClick={openJoin} style={primaryBtn()}>
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {entryMode === "approved" && isKnownSingleLane(entryMode) ? (
            <div style={routeCard()}>
              <div style={labelText()}>Activation</div>
              <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>
                Finish activation
              </div>
              <div style={supportText()}>
                Create your password and complete your entry into the system.
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button type="button" onClick={openActivation} style={primaryBtn()}>
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {entryMode === "existing" ? (
            <div style={routeCard()}>
              <div style={labelText()}>Existing account</div>
              <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>
                Go to sign in
              </div>
              <div style={supportText()}>
                Enter your email and password on the next page.
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button type="button" onClick={openExisting} style={primaryBtn()}>
                  Continue to Login
                </button>
              </div>
            </div>
          ) : null}

          {entryMode === "general" && step === "choose_identity" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 360px))",
                gap: 20,
                justifyContent: "center",
              }}
            >
              <div style={routeCard()}>
                <div style={labelText()}>New member</div>
                <div style={supportText()}>
                  Choose this if you are entering for the first time.
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setStep("choose_new_lane")}
                    style={primaryBtn()}
                  >
                    Continue
                  </button>
                </div>
              </div>

              <div style={routeCard()}>
                <div style={labelText()}>Existing member</div>

                <div>
                  <button
                    type="button"
                    onClick={openExisting}
                    style={secondaryBtn()}
                  >
                    Login
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {entryMode === "general" && step === "choose_new_lane" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 360px))",
                gap: 20,
                justifyContent: "center",
              }}
            >
              <div style={routeCard()}>
                <div style={labelText()}>Create</div>
                <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>
                  Create a new community
                </div>
                <div style={supportText()}>
                  Start as a founder and set up your new community.
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button type="button" onClick={openCreate} style={primaryBtn()}>
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("choose_identity")}
                    style={secondaryBtn()}
                  >
                    Back
                  </button>
                </div>
              </div>

              <div style={routeCard()}>
                <div style={labelText()}>Join</div>
                <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>
                  Join an existing community
                </div>
                <div style={supportText()}>
                  Continue as a new member joining a community that already exists.
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button type="button" onClick={openJoin} style={primaryBtn()}>
                    Join
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("choose_identity")}
                    style={secondaryBtn()}
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          ) : null}

        </div>
        )}
      </div>
    </div>
  );
}

