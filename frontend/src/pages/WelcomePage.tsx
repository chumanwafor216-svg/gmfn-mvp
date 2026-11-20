import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  EntryActionButton,
  EntryBackLink,
} from "../components/EntryControls";
import { GsnRealisticIcon, type Gsn3DIconKey } from "../components/GsnRealisticIcon";
import { getAccessToken } from "../lib/api";
import { APP_ROUTES } from "../lib/appRoutes";
import {
  detectEntryMode,
  readStorage,
  routeForActivation,
  routeForCreate,
  routeForInvitation,
  routeForJoin,
  writeStorage,
  ENTRY_CREATE_CODE_KEY,
  ENTRY_INVITE_CODE_KEY,
  ENTRY_MODE_KEY,
  type EntryMode,
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

function iconBadge(): React.CSSProperties {
  return {
    width: 58,
    height: 58,
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

function supportText(): React.CSSProperties {
  return {
    color: "rgba(255,255,255,0.84)",
    fontSize: 13.5,
    lineHeight: 1.55,
  };
}

function addForceLoginFlag(base: string): string {
  const [pathname, rawQuery = ""] = String(base || "").split("?");
  const params = new URLSearchParams(rawQuery);
  params.set("force", "1");
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function intentNeutralSearch(search: string): string {
  const params = new URLSearchParams(search);
  for (const key of ["entry", "entry_from", "flow", "mode", "intent"]) {
    params.delete(key);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
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
    if (typeof document !== "undefined") {
      document.title = "GSN | Welcome";
    }
  }, []);

  const neutralSearch = useMemo(
    () => intentNeutralSearch(location.search),
    [location.search]
  );
  const createTo = useMemo(() => routeForCreate(neutralSearch), [neutralSearch]);
  const joinTo = useMemo(() => routeForJoin(neutralSearch), [neutralSearch]);
  const invitationTo = useMemo(
    () =>
      routeForInvitation(
        location.search,
        readStorage(ENTRY_INVITE_CODE_KEY)
      ),
    [location.search]
  );
  const activationTo = useMemo(
    () => routeForActivation(neutralSearch),
    [neutralSearch]
  );

  const loginTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    params.delete("entry");
    params.delete("entry_from");
    const base = `/login${params.toString() ? `?${params.toString()}` : ""}`;
    return addForceLoginFlag(base);
  }, [location.search]);

  if (entryMode === "existing") {
    return <Navigate to={loginTo} replace state={location.state} />;
  }

  if (entryMode === "invite") {
    return <Navigate to={invitationTo || joinTo} replace state={location.state} />;
  }

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

  const isIntentGateway = entryMode === "general" || entryMode === "create";
  const headline =
    isIntentGateway
      ? "Create community"
      : entryMode === "approved"
      ? "Open your activation path."
      : "Welcome";

  const subtext =
    isIntentGateway
      ? ""
      : entryMode === "approved"
      ? "Your approval has already been confirmed. Open activation below."
      : "";

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
            <EntryBackLink to="/cover?entry=general" />
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

          {isIntentGateway ? (
            <div
              data-welcome-intent-gateway="true"
              style={{
                width: isCompact ? "min(100%, 260px)" : 280,
                justifySelf: "center",
                display: "grid",
                justifyItems: "center",
                gap: 10,
              }}
            >
              <EntryActionButton
                type="button"
                onClick={openCreate}
                debugId="welcome.gateway.create-community"
                style={{ width: "100%", fontSize: 16 }}
              >
                Start
              </EntryActionButton>

              <EntryActionButton
                type="button"
                onClick={openJoin}
                variant="secondary"
                debugId="welcome.gateway.join-community"
                style={{
                  width: "100%",
                  minHeight: 48,
                  background: "rgba(255,255,255,0.075)",
                  boxShadow: "none",
                }}
              >
                Find a community
              </EntryActionButton>

              <div
                style={{
                  minHeight: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  color: "rgba(255,255,255,0.72)",
                  fontSize: 12.5,
                  fontWeight: 750,
                }}
              >
                <span>Already a member?</span>
                <EntryActionButton
                  type="button"
                  onClick={openExisting}
                  variant="secondary"
                  debugId="welcome.gateway.sign-in"
                  style={{
                    minHeight: 40,
                    width: 86,
                    padding: "8px 12px",
                    borderRadius: 999,
                    background: "transparent",
                    boxShadow: "none",
                    color: "#F3D06A",
                    fontSize: 12.5,
                  }}
                >
                  Sign in
                </EntryActionButton>
              </div>
            </div>
          ) : null}

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
                debugId="welcome.signed-in.dashboard"
                style={{ width: "100%" }}
              >
                Continue to my GSN
              </EntryActionButton>
            </div>
          ) : null}

          {entryMode === "approved" ? (
            <div style={routeCard()}>
              <div style={labelText()}>Activation</div>
              <div style={supportText()}>
                Create your password and complete your entry into the system.
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <EntryActionButton
                  type="button"
                  onClick={openActivation}
                  debugId="welcome.approved.open-activation"
                >
                  Finish activation
                </EntryActionButton>
              </div>
            </div>
          ) : null}

        </div>
      </div>
    </div>
  );
}

