import React, { useEffect, useState } from "react";
import { Navigate, useLocation, type Location as RouterLocation } from "react-router-dom";
import { CardActionRow, StableCtaLink } from "./StableButton";
import {
  getAccessToken,
  getCurrentClan,
  getMe,
  getMeWithToken,
  getMyIdentityRisk,
  getSelectedClanId,
  observeIdentityRisk,
  setAccessToken,
  setSelectedClanId,
  setStoredGmfnId,
} from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import { peekPublishRecoveryTarget } from "../lib/publishRecovery";

type Props = {
  children: React.ReactNode;
  requireRole?: "admin" | "adminOrClanAdmin";
};

type ContinuityBlock = {
  status: "reverify_required" | "protected_lock";
  score: string;
  reason: string;
  action: string;
};

// Temporary pilot-testing switch. Backend identity continuity remains intact,
// but the frontend route-block screen is disabled while mobile tap behavior is
// being audited. Re-enable after the UI is stable.
const IDENTITY_CONTINUITY_ROUTE_BLOCK_ENABLED = false;
const IDENTITY_CONTINUITY_OBSERVATION_ENABLED = false;
const SLOW_SESSION_CHECK_MS = 8000;

const CONTINUITY_PROTECTED_PREFIXES = [
  "/app/finance",
  "/app/finances",
  "/app/financials",
  "/app/payment",
  "/app/payment-rails",
  "/app/payout-details",
  "/app/withdrawal-instructions",
  "/app/withdrawal",
  "/app/money-in",
  "/app/money-out",
  "/app/loan-workbench",
  "/app/loan-summary",
  "/app/shop-control",
  "/app/shop-assets",
  "/app/command-center",
];

function resolveRole(me: any): string {
  return String(
    me?.role ||
      me?.account_role ||
      me?.user_role ||
      (Array.isArray(me?.permissions) &&
      me.permissions.includes("admin")
        ? "admin"
        : "")
  )
    .trim()
    .toLowerCase();
}

function hasAdminAccess(me: any): boolean {
  const role = resolveRole(me);
  return role === "admin";
}

function readCachedRole(): string {
  try {
    if (typeof window === "undefined") return "";
    return String(window.localStorage.getItem("gmfn_role") || "")
      .trim()
      .toLowerCase();
  } catch {
    return "";
  }
}

function cachedRoleAllows(requireRole: Props["requireRole"]): boolean {
  const role = readCachedRole();
  if (requireRole === "admin") return role === "admin";
  if (requireRole === "adminOrClanAdmin") return role === "admin";
  return false;
}

function resolveClanRole(currentClan: any): string {
  return String(
    currentClan?.role ||
      currentClan?.member_role ||
      currentClan?.membership_role ||
      currentClan?.participant_role ||
      ""
  )
    .trim()
    .toLowerCase();
}

function hasClanAdminAccess(currentClan: any): boolean {
  return resolveClanRole(currentClan) === "admin";
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

function isContinuityProtectedRoute(pathname: string): boolean {
  const current = String(pathname || "").trim().toLowerCase();
  return CONTINUITY_PROTECTED_PREFIXES.some(
    (prefix) => current === prefix || current.startsWith(`${prefix}/`)
  );
}

function extractContinuityBlock(summary: any): ContinuityBlock | null {
  const continuity = summary?.continuity;
  const status = String(continuity?.status || "")
    .trim()
    .toLowerCase();

  if (status !== "reverify_required" && status !== "protected_lock") {
    return null;
  }

  const rawScore = Number(continuity?.score);

  return {
    status,
    score: Number.isFinite(rawScore) ? String(Math.round(rawScore)) : "Pending",
    reason:
      String(continuity?.reason || "").trim() ||
      "Identity continuity changed enough that the app needs to protect the account before sensitive actions continue.",
    action:
      String(continuity?.action || "").trim() ||
      "Open Identity and Integrity to review what changed, then continue from the protected next step shown there.",
  };
}

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background: "#F4F7FB",
  };
}

function denyCard(): React.CSSProperties {
  return {
    width: "min(100%, 720px)",
    borderRadius: 28,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.08)",
    padding: 28,
  };
}

function computeClientFingerprint(): string {
  try {
    const parts = [
      navigator.userAgent || "",
      navigator.language || "",
      String(window.screen?.width || 0),
      String(window.screen?.height || 0),
      Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    ];

    return btoa(parts.join("|")).slice(0, 120);
  } catch {
    return "unknown-client";
  }
}

function httpStatus(error: unknown): number | null {
  const status = Number((error as any)?.status);
  return Number.isFinite(status) ? status : null;
}

function isNetworkSessionError(error: unknown): boolean {
  const message = String((error as any)?.message || error || "").toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network error") ||
    message.includes("server did not finish") ||
    message.includes("check your connection")
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function getMeWithStoredTokenRetry(token: string): Promise<any> {
  try {
    return await getMe();
  } catch (error) {
    if (!isNetworkSessionError(error)) throw error;
    await wait(650);
    return getMeWithToken(token, { fresh: true });
  }
}

function routeStateFromTarget(target: string) {
  try {
    const parsed = new URL(target, "https://gsn.local");
    return {
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
    };
  } catch {
    return { pathname: "/app/dashboard", search: "", hash: "" };
  }
}

function loginRecoveryTarget(
  location: Pick<RouterLocation, "pathname" | "search" | "hash">
) {
  const publishTarget = peekPublishRecoveryTarget();

  if (!publishTarget) {
    return {
      to: "/login?session=expired",
      state: { from: location },
    };
  }

  const next = new URLSearchParams();
  next.set("session", "expired");
  next.set("next", publishTarget);

  return {
    to: `/login?${next.toString()}`,
    state: {
      from: routeStateFromTarget(publishTarget),
      recoveredFrom: `${location.pathname || ""}${location.search || ""}${location.hash || ""}`,
    },
  };
}

export default function RequireAuth({ children, requireRole }: Props) {
  const location = useLocation();
  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = {
    dashboard: routeTarget("dashboard", selectedClanId, "require-auth.route.dashboard"),
    community: routeTarget("communityHome", selectedClanId, "require-auth.route.community"),
    identity: routeTarget("cci", selectedClanId, "require-auth.route.identity"),
    notifications: routeTarget("notifications", selectedClanId, "require-auth.route.notifications"),
    trust: routeTarget("trust", selectedClanId, "require-auth.route.trust"),
  };

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [deniedForRole, setDeniedForRole] = useState(false);
  const [continuityBlock, setContinuityBlock] = useState<ContinuityBlock | null>(
    null
  );
  const [slowSessionCheck, setSlowSessionCheck] = useState(false);

  useEffect(() => {
    let active = true;

    const finish = (nextAllowed: boolean, roleDenied = false) => {
      if (!active) return;
      setAllowed(nextAllowed);
      setDeniedForRole(roleDenied);
      if (!nextAllowed) {
        setContinuityBlock(null);
      }
      setLoading(false);
    };

    const run = async () => {
      try {
        const tok = getAccessToken();

        if (!tok) {
          finish(false);
          return;
        }

        let me: any = null;
        let meError: unknown = null;

        try {
          me = await getMeWithStoredTokenRetry(tok);
        } catch (error) {
          meError = error;
        }

        const currentClan = await getCurrentClan().catch(() => null);

        if (!me) {
          const status = httpStatus(meError);
          if (status === 401 || status === 403) {
            setAccessToken(null);
            setStoredGmfnId(null);
            setSelectedClanId(null);
          }
          if (
            requireRole &&
            isNetworkSessionError(meError) &&
            cachedRoleAllows(requireRole)
          ) {
            setContinuityBlock(null);
            finish(true);
            return;
          }
          if (!requireRole && isNetworkSessionError(meError)) {
            setContinuityBlock(null);
            finish(true);
            return;
          }
          finish(false);
          return;
        }

        const riskSummary = IDENTITY_CONTINUITY_ROUTE_BLOCK_ENABLED
          ? await getMyIdentityRisk().catch(() => null)
          : null;
        const blockingContinuity = IDENTITY_CONTINUITY_ROUTE_BLOCK_ENABLED
          ? extractContinuityBlock(riskSummary)
          : null;

        if (requireRole === "admin" && !hasAdminAccess(me)) {
          finish(false, true);
          return;
        }

        if (
          requireRole === "adminOrClanAdmin" &&
          !hasAdminAccess(me) &&
          !hasClanAdminAccess(currentClan)
        ) {
          finish(false, true);
          return;
        }

        if (
          blockingContinuity &&
          isContinuityProtectedRoute(location.pathname)
        ) {
          setContinuityBlock(blockingContinuity);
        } else {
          setContinuityBlock(null);
        }

        finish(true);

        if (IDENTITY_CONTINUITY_OBSERVATION_ENABLED) {
          try {
            const fp = computeClientFingerprint();
            void observeIdentityRisk(fp).catch((error) => {
              console.warn("Identity observation skipped:", error);
            });
          } catch (error) {
            console.warn("Identity observation skipped:", error);
          }
        }
      } catch {
        finish(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [location.pathname, requireRole]);

  useEffect(() => {
    if (!loading) {
      setSlowSessionCheck(false);
      return;
    }

    setSlowSessionCheck(false);
    const timer = window.setTimeout(
      () => setSlowSessionCheck(true),
      SLOW_SESSION_CHECK_MS
    );

    return () => window.clearTimeout(timer);
  }, [loading, location.pathname, location.search]);

  if (loading) {
    return (
      <div style={pageShell()}>
        <div
          style={{
            ...denyCard(),
            maxWidth: 520,
            padding: 24,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "#5D7389",
              fontWeight: 900,
              letterSpacing: 0.35,
              textTransform: "uppercase",
            }}
          >
            Secure workspace check
          </div>
          <div
            style={{
              marginTop: 10,
              fontWeight: 900,
              color: "#0B1F33",
              fontSize: 22,
              lineHeight: 1.2,
            }}
          >
            {slowSessionCheck
              ? "This is taking longer than expected."
              : "Loading workspace..."}
          </div>
          <div
            style={{
              margin: "12px auto 0",
              maxWidth: 420,
              color: "#5F7287",
              fontSize: 14,
              lineHeight: 1.65,
            }}
          >
            {slowSessionCheck
              ? "Your phone may be holding an old sign-in session, or the local connection may have changed. Open sign-in again to refresh the session check."
              : "GSN is checking that this device can safely open your member workspace."}
          </div>
          {slowSessionCheck ? (
            <CardActionRow style={{ marginTop: 18, justifyContent: "center" }}>
              <StableCtaLink
                to="/login?session=expired&force=1"
                kind="primary"
                debugId="require-auth.loading.open-sign-in"
              >
                Open Sign In
              </StableCtaLink>
              <StableCtaLink
                to="/login?session=expired&force=1"
                kind="secondary"
                debugId="require-auth.loading.start-again"
              >
                Start Again
              </StableCtaLink>
            </CardActionRow>
          ) : null}
        </div>
      </div>
    );
  }

  if (!allowed) {
    if (!getAccessToken()) {
      const target = loginRecoveryTarget(location);
      return <Navigate to={target.to} replace state={target.state} />;
    }

    if (deniedForRole) {
      return (
        <div style={pageShell()}>
          <div style={denyCard()}>
            <div
              style={{
                fontSize: 12,
                color: "#5D7389",
                fontWeight: 900,
                letterSpacing: 0.35,
                textTransform: "uppercase",
              }}
            >
              {requireRole === "admin"
                ? "Platform admin access required"
                : "Admin access required"}
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 1000,
                fontSize: 30,
                lineHeight: 1.12,
              }}
            >
              {requireRole === "admin"
                ? "This route needs platform admin access."
                : "This workspace is not open to ordinary users."}
            </div>

            <div
              style={{
                marginTop: 14,
                color: "#5F7287",
                fontSize: 15,
                lineHeight: 1.8,
              }}
            >
              {requireRole === "admin"
                ? "This part of the command centre is reserved for platform-admin work such as trust-event oversight, identity-risk review, system diagnostics, and other cross-community controls."
                : "The command centre is reserved for admin-led work such as trust oversight, exposure review, reconciliation, and other community operating tasks."}
            </div>

            <div
              style={{
                marginTop: 16,
                borderRadius: 16,
                border: "1px solid rgba(11,31,51,0.08)",
                background: "#F8FBFF",
                padding: 16,
                color: "#24415C",
                lineHeight: 1.7,
              }}
            >
              Requested route: <b>{location.pathname}</b>
              <div style={{ marginTop: 6 }}>
                If you expected admin access here, sign in with an admin account
                or switch to the correct community-admin identity first.
              </div>
            </div>

            <CardActionRow style={{ marginTop: 18 }}>
              <StableCtaLink
                to={routes.dashboard}
                kind="primary"
                debugId="require-auth.admin-denied.dashboard"
              >
                Return to Dashboard
              </StableCtaLink>
              <StableCtaLink
                to={routes.community}
                kind="secondary"
                debugId="require-auth.admin-denied.community"
              >
                Open Community Home
              </StableCtaLink>
            </CardActionRow>
          </div>
        </div>
      );
    }

    const target = loginRecoveryTarget(location);
    return <Navigate to={target.to} replace state={target.state} />;
  }

  if (continuityBlock) {
    const isProtectedLock = continuityBlock.status === "protected_lock";

    return (
      <div style={pageShell()}>
        <div style={denyCard()}>
          <div
            style={{
              fontSize: 12,
              color: isProtectedLock ? "#991B1B" : "#9A3412",
              fontWeight: 900,
              letterSpacing: 0.35,
              textTransform: "uppercase",
            }}
          >
            {isProtectedLock
              ? "Sensitive actions paused"
              : "Reverification needed"}
          </div>

          <div
            style={{
              marginTop: 10,
              color: "#0B1F33",
              fontWeight: 1000,
              fontSize: 30,
              lineHeight: 1.12,
            }}
          >
            {isProtectedLock
              ? "This route is protected until identity continuity is restored."
              : "This route needs an identity review before it can continue."}
          </div>

          <div
            style={{
              marginTop: 14,
              color: "#5F7287",
              fontSize: 15,
              lineHeight: 1.8,
            }}
          >
            The app noticed a major enough change in device-use continuity that
            it should protect sensitive trust, finance, commerce, or management
            actions for now. This protects the owner and keeps trust events from
            being credited to the wrong person.
          </div>

          <div
            style={{
              marginTop: 16,
              borderRadius: 16,
              border: isProtectedLock
                ? "1px solid rgba(239,68,68,0.14)"
                : "1px solid rgba(245,158,11,0.14)",
              background: isProtectedLock ? "#FEF2F2" : "#FFF7ED",
              padding: 16,
              color: "#24415C",
              lineHeight: 1.7,
            }}
          >
            <div>
              Requested route: <b>{location.pathname}</b>
            </div>
            <div style={{ marginTop: 6 }}>
              Continuity score: <b>{continuityBlock.score}</b>
            </div>
            <div style={{ marginTop: 6 }}>{continuityBlock.reason}</div>
            <div style={{ marginTop: 6 }}>{continuityBlock.action}</div>
          </div>

          <CardActionRow style={{ marginTop: 18 }}>
            <StableCtaLink
              to={routes.identity}
              kind="primary"
              debugId="require-auth.continuity.identity"
            >
              Review Identity
            </StableCtaLink>
            <StableCtaLink
              to={routes.notifications}
              kind="secondary"
              debugId="require-auth.continuity.notifications"
            >
              Open Notifications
            </StableCtaLink>
            <StableCtaLink
              to={routes.trust}
              kind="secondary"
              debugId="require-auth.continuity.trust"
            >
              Review Trust
            </StableCtaLink>
            <StableCtaLink
              to={routes.dashboard}
              kind="secondary"
              debugId="require-auth.continuity.dashboard"
            >
              Return to Dashboard
            </StableCtaLink>
          </CardActionRow>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
