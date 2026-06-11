import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  EntryActionButton,
  EntryBackLink,
} from "../components/EntryControls";
import GsnInstallPrompt from "../components/GsnInstallPrompt";
import { GsnRealisticIcon, type Gsn3DIconKey } from "../components/GsnRealisticIcon";
import { getAccessToken } from "../lib/api";
import { APP_ROUTES } from "../lib/appRoutes";
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

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at 84% 8%, rgba(84,123,169,0.12) 0%, rgba(84,123,169,0.00) 28%), radial-gradient(circle at 18% 88%, rgba(58,92,134,0.12) 0%, rgba(58,92,134,0.00) 28%), linear-gradient(180deg, #06111C 0%, #0A1B2B 46%, #102A43 100%)",
    color: "#FFFFFF",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    padding: "18px",
    boxSizing: "border-box",
  };
}

function heroCard(): React.CSSProperties {
  return {
    maxWidth: 980,
    width: "100%",
    borderRadius: 34,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
    border: "1px solid rgba(220,231,243,0.18)",
    boxShadow:
      "0 36px 84px rgba(0,8,18,0.36), inset 0 1px 0 rgba(255,255,255,0.08)",
    padding: 18,
    backdropFilter: "blur(10px)",
    position: "relative",
    overflow: "hidden",
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

function routeCard(): React.CSSProperties {
  return {
    width: "min(100%, 188px)",
    justifySelf: "center",
    borderRadius: 24,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)",
    border: "1px solid rgba(220,231,243,0.16)",
    boxShadow: "0 22px 40px rgba(0,8,18,0.24), inset 0 1px 0 rgba(255,255,255,0.09)",
    padding: 9,
    display: "grid",
    gap: 6,
    minHeight: 78,
    alignContent: "start",
  };
}

function choiceCard(): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 24,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.045) 100%)",
    border: "1px solid rgba(220,231,243,0.20)",
    boxShadow:
      "0 24px 46px rgba(0,8,18,0.28), inset 0 1px 0 rgba(255,255,255,0.13), inset 0 -10px 22px rgba(6,18,35,0.12)",
    padding: 18,
    display: "grid",
    gridTemplateColumns: "68px minmax(0, 1fr)",
    gap: "14px 16px",
    alignItems: "center",
    minHeight: 202,
  };
}

function iconBadge(): React.CSSProperties {
  return {
    width: 66,
    height: 66,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at 35% 24%, rgba(244,208,106,0.20) 0%, rgba(244,208,106,0.00) 34%), linear-gradient(180deg, rgba(26,58,91,0.96) 0%, rgba(10,29,48,0.96) 100%)",
    border: "1px solid rgba(243,208,106,0.28)",
    boxShadow:
      "0 18px 30px rgba(0,8,18,0.26), inset 0 1px 0 rgba(255,255,255,0.12)",
    color: "#F3D06A",
    fontSize: 0,
    lineHeight: 1,
    textShadow: "0 2px 12px rgba(0,0,0,0.22)",
  };
}

function WelcomeIcon({ name }: { name: Gsn3DIconKey }) {
  return (
    <GsnRealisticIcon
      name={name}
      size={48}
      decorative
      imageStyle={{
        width: "92%",
        height: "92%",
      }}
    />
  );
}

function routePill(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 28,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(243,208,106,0.20)",
    color: "rgba(243,208,106,0.92)",
    fontSize: 11,
    fontWeight: 1000,
    letterSpacing: 1.3,
    textTransform: "uppercase",
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
  const [isSignedIn] = useState(() => Boolean(getAccessToken()));

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

  function openDashboard() {
    navigate(APP_ROUTES.DASHBOARD);
  }

  const headline =
    entryMode === "invite"
      ? "Open your invitation path."
      : entryMode === "create"
      ? "Create community"
      : entryMode === "approved"
      ? "Open your activation path."
      : entryMode === "existing"
      ? "Open sign in."
      : step === "choose_new_lane"
      ? "New member sign up"
      : "Welcome";

  const subtext =
    entryMode === "invite"
      ? "Your invitation has already been recognised. Open the guided join path below."
      : entryMode === "create"
      ? ""
      : entryMode === "approved"
      ? "Your approval has already been confirmed. Open activation below."
      : entryMode === "existing"
      ? "Choose this only if you already have an active account and want to reopen it now."
      : step === "choose_new_lane"
      ? "Choose your starting path."
      : "Choose how you want to continue.";

  return (
    <div style={pageShell()}>
      <div style={heroCard()}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at top, rgba(201,154,39,0.07) 0%, rgba(201,154,39,0) 26%), radial-gradient(circle at bottom, rgba(110,145,186,0.08) 0%, rgba(110,145,186,0) 30%)",
          }}
        />
        <div style={{ display: "grid", gap: 14, position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact
                ? "44px minmax(0, 1fr) 44px"
                : "1fr minmax(0, 760px) 1fr",
              alignItems: "start",
              gap: isCompact ? 8 : 10,
            }}
          >
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <EntryBackLink to="/cover" />
          </div>

          <div style={{ textAlign: "center", display: "grid", gap: 8, justifyItems: "center" }}>
            <div style={labelText()}>GSN</div>
            <div
              style={{
                fontSize: isCompact ? 27 : 40,
                fontWeight: 900,
                lineHeight: 1.03,
                letterSpacing: 0.2,
                maxWidth: isCompact ? 270 : 760,
                textShadow: "0 12px 30px rgba(0,0,0,0.22)",
              }}
            >
              {headline}
            </div>

            <div
              style={{
                fontSize: isCompact ? 13.5 : 15,
                lineHeight: isCompact ? 1.42 : 1.65,
                color: "rgba(255,255,255,0.90)",
                maxWidth: 760,
              }}
            >
              {subtext}
            </div>
          </div>

          <div />
          </div>

          {entryMode === "create" && isKnownSingleLane(entryMode) ? (
            <div
              style={{
                ...routeCard(),
                width: isCompact ? "min(100%, 268px)" : routeCard().width,
                minHeight: isCompact ? 72 : routeCard().minHeight,
                padding: isCompact ? 9 : routeCard().padding,
                gap: isCompact ? 7 : routeCard().gap,
              }}
            >
              <div style={labelText()}>Founder path</div>
              <div
                style={{
                  fontSize: isCompact ? 23 : 28,
                  fontWeight: 900,
                  lineHeight: 1.08,
                }}
              >
                Set up the basics
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <EntryActionButton type="button" onClick={openCreate}>
                  Begin
                </EntryActionButton>
              </div>
            </div>
          ) : null}

          <div style={{ width: "min(100%, 680px)", justifySelf: "center" }}>
            <GsnInstallPrompt
              tone="dark"
              compact={isCompact}
              surface="welcome"
            />
          </div>

          {entryMode === "general" && isSignedIn ? (
            <div
              style={{
                width: "min(100%, 680px)",
                justifySelf: "center",
                borderRadius: 22,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.045) 100%)",
                border: "1px solid rgba(243,208,106,0.22)",
                boxShadow:
                  "0 20px 38px rgba(0,8,18,0.22), inset 0 1px 0 rgba(255,255,255,0.10)",
                padding: isCompact ? 12 : 14,
                display: "grid",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto minmax(0, 1fr)",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div style={iconBadge()} aria-hidden="true">
                  <WelcomeIcon name="trust-shield" />
                </div>
                <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                  <div
                    style={{
                      color: "#F8FBFF",
                      fontSize: isCompact ? 15 : 17,
                      fontWeight: 1000,
                      lineHeight: 1.18,
                    }}
                  >
                    You are already signed in
                  </div>
                  <div style={{ ...supportText(), fontSize: isCompact ? 12.5 : 13.5 }}>
                    Open your dashboard when you are ready.
                  </div>
                </div>
              </div>
              <EntryActionButton
                type="button"
                onClick={openDashboard}
                style={{ width: "100%" }}
              >
                Continue to my GSN
              </EntryActionButton>
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
                <EntryActionButton type="button" onClick={openJoin}>
                  Open join path
                </EntryActionButton>
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
                <EntryActionButton type="button" onClick={openActivation}>
                  Finish activation
                </EntryActionButton>
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
                <EntryActionButton type="button" onClick={openExisting}>
                  Open sign in
                </EntryActionButton>
              </div>
            </div>
          ) : null}

          {entryMode === "general" && step === "choose_identity" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 318px))",
                gap: isCompact ? 16 : 20,
                justifyContent: "center",
                alignItems: "stretch",
              }}
            >
              <div style={choiceCard()}>
                <div style={iconBadge()} aria-hidden="true">
                  <WelcomeIcon name="identity-card" />
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={routePill()}>Existing member</div>
                  <div
                    style={{
                      fontSize: isCompact ? 25 : 30,
                      fontWeight: 900,
                      lineHeight: 1.08,
                    }}
                  >
                    Sign in
                  </div>
                  <div style={supportText()}>
                    Continue from your active GSN account.
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "center", gridColumn: "1 / -1" }}>
                  <EntryActionButton
                    type="button"
                    onClick={openExisting}
                    style={{ width: "100%" }}
                  >
                    Sign in
                  </EntryActionButton>
                </div>
              </div>

              <div style={choiceCard()}>
                <div style={iconBadge()} aria-hidden="true">
                  <WelcomeIcon name="join-person-plus" />
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={routePill()}>New member</div>
                  <div
                    style={{
                      fontSize: isCompact ? 25 : 30,
                      fontWeight: 900,
                      lineHeight: 1.08,
                    }}
                  >
                    Sign up
                  </div>
                  <div style={supportText()}>
                    Create a community or request to join one.
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "center", gridColumn: "1 / -1" }}>
                  <EntryActionButton
                    type="button"
                    onClick={() => setStep("choose_new_lane")}
                    style={{ width: "100%" }}
                  >
                    Sign up
                  </EntryActionButton>
                </div>
              </div>

            </div>
          ) : null}

          {entryMode === "general" && step === "choose_new_lane" ? (
            <div
              style={{
                display: "grid",
                justifyItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: "min(100%, 680px)",
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 318px))",
                  justifyContent: "center",
                  gap: isCompact ? 16 : 20,
                  padding: 0,
                }}
              >
                <div style={choiceCard()}>
                  <div style={iconBadge()} aria-hidden="true">
                    <WelcomeIcon name="community-building" />
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={routePill()}>Create</div>
                    <div
                      style={{
                        fontSize: isCompact ? 24 : 28,
                        fontWeight: 900,
                        lineHeight: 1.08,
                        textShadow: "0 10px 24px rgba(0,0,0,0.12)",
                      }}
                    >
                      Create a new community
                    </div>
                    <div style={supportText()}>
                      Create your community and invite your first people.
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "center", gridColumn: "1 / -1" }}>
                    <EntryActionButton type="button" onClick={openCreate} style={{ width: "100%" }}>
                      Start community
                    </EntryActionButton>
                  </div>
                </div>

                <div style={choiceCard()}>
                  <div style={iconBadge()} aria-hidden="true">
                    <WelcomeIcon name="join-person-plus" />
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={routePill()}>Join</div>
                  <div
                    style={{
                      fontSize: isCompact ? 24 : 28,
                      fontWeight: 900,
                      lineHeight: 1.08,
                      textShadow: "0 10px 24px rgba(0,0,0,0.12)",
                    }}
                  >
                    Join an existing community
                  </div>
                    <div style={supportText()}>
                      Use an invite or request access to a trusted community.
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "center", gridColumn: "1 / -1" }}>
                    <EntryActionButton type="button" onClick={openJoin} style={{ width: "100%" }}>
                      Join community
                    </EntryActionButton>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

        </div>
      </div>
    </div>
  );
}

