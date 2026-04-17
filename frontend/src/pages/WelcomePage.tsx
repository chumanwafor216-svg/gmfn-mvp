import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
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

const GUIDE_TO = "/guide";
const COMMITMENT_TO = "/app/dashboard#focus-commitments";

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
    color: "rgba(255,255,255,0.72)",
    fontWeight: 900,
    letterSpacing: 0.45,
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
    borderRadius: 24,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: 22,
    display: "grid",
    gap: 12,
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
      ? "How would you like to begin?"
      : "Choose how you want to continue.";

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
      ? "Choose whether you are creating a new community or joining an existing one."
      : "Start with the option that matches you best. The app will guide you one step at a time.";

  return (
    <div style={pageShell()}>
      <div style={heroCard()}>
        <div style={{ display: "grid", gap: 18 }}>
          <ExplainToggle
            label="What this screen does"
            what="This welcome screen helps you choose the right starting lane, whether you are creating something new or entering an existing community."
            why="It reduces entry confusion by steering you into the right route before you start the next step."
            next="Choose the lane that matches your situation, then follow the guided route that opens from here."
            tone="dark"
          />

          <div>
            <div style={labelText()}>GSN Welcome</div>

            <div
              style={{
                marginTop: 10,
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
                marginTop: 14,
                fontSize: 16,
                lineHeight: 1.82,
                color: "rgba(255,255,255,0.90)",
                maxWidth: 760,
              }}
            >
              {subtext}
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

              <ExplainToggle
                label="What this does"
                what="This lane sends you into the new-community route."
                why="It keeps community creation separate from joining an existing community."
                next="Choose Continue here only if you are starting a new community."
                tone="dark"
                style={{ marginTop: 12, marginBottom: 12 }}
              />

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button type="button" onClick={openCreate} style={primaryBtn()}>
                  Continue
                </button>
                <OriginLink to={GUIDE_TO} style={secondaryBtn()}>
                  Open My GSN and I
                </OriginLink>
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

              <ExplainToggle
                label="What this does"
                what="This lane sends you into the guided join route for an existing community."
                why="It keeps invited entry and join review separate from new-community creation."
                next="Choose Continue here only if you are entering a community that already exists."
                tone="dark"
                style={{ marginTop: 12, marginBottom: 12 }}
              />

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button type="button" onClick={openJoin} style={primaryBtn()}>
                  Continue
                </button>
                <OriginLink to={GUIDE_TO} style={secondaryBtn()}>
                  Open My GSN and I
                </OriginLink>
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

              <ExplainToggle
                label="What this does"
                what="This lane sends you into the final activation step after approval."
                why="It keeps approved entry separate from both sign-in and the earlier join route."
                next="Choose Continue here only if your entry has already been approved and you now need to finish activation."
                tone="dark"
                style={{ marginTop: 12, marginBottom: 12 }}
              />

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button type="button" onClick={openActivation} style={primaryBtn()}>
                  Continue
                </button>
                <OriginLink to={GUIDE_TO} style={secondaryBtn()}>
                  Open My GSN and I
                </OriginLink>
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

              <ExplainToggle
                label="What this does"
                what="This lane sends returning users to sign in with an existing account."
                why="It keeps returning-user access separate from new entry, join review, and activation."
                next="Choose Continue to Login here only if you already have active access and just need to sign back in."
                tone="dark"
                style={{ marginTop: 12, marginBottom: 12 }}
              />

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button type="button" onClick={openExisting} style={primaryBtn()}>
                  Continue to Login
                </button>
                <OriginLink to={GUIDE_TO} style={secondaryBtn()}>
                  Open My GSN and I
                </OriginLink>
              </div>
            </div>
          ) : null}

          {entryMode === "general" && step === "choose_identity" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 14,
              }}
            >
              <div style={routeCard()}>
                <div style={labelText()}>New member</div>
                <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>
                  I am new here
                </div>
              <div style={supportText()}>
                  Choose this if you are entering for the first time.
                </div>

                <ExplainToggle
                  label="What this does"
                  what="This choice sends first-time users into the new-entry lane."
                  why="It separates first entry from returning-user sign-in before the flow gets deeper."
                  next="Choose this only if you are entering GSN for the first time."
                  tone="dark"
                  style={{ marginTop: 12, marginBottom: 12 }}
                />

                <div>
                  <button
                    type="button"
                    onClick={() => setStep("choose_new_lane")}
                    style={primaryBtn()}
                  >
                    I am a new member
                  </button>
                </div>
              </div>

              <div style={routeCard()}>
                <div style={labelText()}>Existing member</div>
                <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>
                  I already have access
                </div>
                <div style={supportText()}>
                  Choose this if you already have an active account and want to sign in.
                </div>

                <ExplainToggle
                  label="What this does"
                  what="This choice sends returning users into the existing-account lane."
                  why="It keeps returning access separate from new-member entry before the route asks for sign-in."
                  next="Choose this only if you already have an account and want to return to it."
                  tone="dark"
                  style={{ marginTop: 12, marginBottom: 12 }}
                />

                <div>
                  <button
                    type="button"
                    onClick={openExisting}
                    style={secondaryBtn()}
                  >
                    Go to Login
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {entryMode === "general" && step === "choose_new_lane" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 14,
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
                <ExplainToggle
                  label="What this does"
                  what="This route starts a brand-new community from your side as the founder."
                  why="Choose it when you are not entering someone else's existing community."
                  next="Open Create to begin naming the community and setting up the first entry details."
                  tone="dark"
                />

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
                <ExplainToggle
                  label="What this does"
                  what="This route helps you enter a community that already exists and is ready to accept members."
                  why="Choose it when you were invited, approved, or told to join an existing community instead of creating one."
                  next="Open Join to continue into the community-entry steps from here."
                  tone="dark"
                />

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

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <OriginLink to={GUIDE_TO} style={secondaryBtn()}>
              Open My GSN and I
            </OriginLink>

            <OriginLink to={COMMITMENT_TO} style={secondaryBtn()}>
              Open Commitment Builder
            </OriginLink>
          </div>

          <div style={infoCard()}>
            <div style={labelText()}>How this works</div>
            <div style={{ marginTop: 10, ...supportText() }}>
              You will see one step at a time. Choose your path, continue, and the next page will guide you.
            </div>

            <div style={{ marginTop: 10, ...supportText() }}>
              Inside this guided flow, GSN can also help turn intentions into
              steadier follow-through through Commitment Builder.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
