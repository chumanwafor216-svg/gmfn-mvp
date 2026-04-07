import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import gmfnMark from "../assets/gmfn-mark.svg";

const PUBLIC_GUIDE_TO = "/guide";
const PDF_FALLBACK_TO = "/GSN_FINAL_WHITE.pdf";

const ACCESS_TOKEN_KEY = "access_token";
const ENTRY_MODE_KEY = "gmfn_entry_mode";
const ENTRY_INVITE_CODE_KEY = "gmfn_entry_invite_code";
const ENTRY_CREATE_CODE_KEY = "gmfn_entry_create_code";

type EntryMode = "general" | "create" | "invite" | "approved" | "existing";

type ModeConfig = {
  label: string;
  heading: string;
  description: string;
  supportText: string;
  primaryLabel: string;
  primaryTo: string;
  steps: string[];
  showLoginLink?: boolean;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStorage(key: string): string | null {
  try {
    if (!canUseStorage()) return null;
    const value = window.localStorage.getItem(key);
    return value == null ? null : String(value);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (!canUseStorage()) return;

    if (value == null || String(value).trim() === "") {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, String(value));
  } catch {}
}

function normalizeValue(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function isAuthenticated(): boolean {
  return Boolean(String(readStorage(ACCESS_TOKEN_KEY) || "").trim());
}

function matchEntryMode(raw: string): EntryMode | null {
  if (
    raw === "create" ||
    raw === "founder" ||
    raw === "public-create" ||
    raw === "new"
  ) {
    return "create";
  }

  if (
    raw === "invite" ||
    raw === "invited" ||
    raw === "join" ||
    raw === "get-invite"
  ) {
    return "invite";
  }

  if (raw === "approved" || raw === "activate" || raw === "activation") {
    return "approved";
  }

  if (raw === "existing" || raw === "login" || raw === "member") {
    return "existing";
  }

  if (raw === "general" || raw === "public" || raw === "welcome") {
    return "general";
  }

  return null;
}

function readLocationStateEntry(state: unknown): string {
  if (!state || typeof state !== "object") return "";

  const value =
    (state as any).entry ??
    (state as any).entryMode ??
    (state as any).mode ??
    (state as any).flow ??
    (state as any).intent ??
    "";

  return normalizeValue(value);
}

function detectEntryMode(
  pathname: string,
  search: string,
  state: unknown
): EntryMode {
  const params = new URLSearchParams(search);

  const queryValue =
    normalizeValue(params.get("entry")) ||
    normalizeValue(params.get("flow")) ||
    normalizeValue(params.get("mode")) ||
    normalizeValue(params.get("intent"));

  const queryMatch = matchEntryMode(queryValue);
  if (queryMatch) return queryMatch;

  const stateMatch = matchEntryMode(readLocationStateEntry(state));
  if (stateMatch) return stateMatch;

  const path = normalizeValue(pathname);

  if (
    path.includes("get-invite") ||
    path.includes("invite") ||
    path.includes("join")
  ) {
    return "invite";
  }

  if (path.includes("create") || path.includes("founder")) {
    return "create";
  }

  if (path.includes("approved") || path.includes("activate")) {
    return "approved";
  }

  if (path.includes("login") || path.includes("existing")) {
    return "existing";
  }

  return "general";
}

function persistEntryState(entryMode: EntryMode, search: string): void {
  const params = new URLSearchParams(search);

  const inviteCode =
    params.get("invite_code") ||
    params.get("invite") ||
    params.get("join_code") ||
    params.get("code") ||
    null;

  const createCode =
    params.get("create_code") ||
    params.get("founder_code") ||
    params.get("public_create_code") ||
    params.get("code") ||
    null;

  writeStorage(ENTRY_MODE_KEY, entryMode);

  if (entryMode === "invite") {
    writeStorage(ENTRY_INVITE_CODE_KEY, inviteCode);
    writeStorage(ENTRY_CREATE_CODE_KEY, null);
    return;
  }

  if (entryMode === "create") {
    writeStorage(ENTRY_CREATE_CODE_KEY, createCode);
    writeStorage(ENTRY_INVITE_CODE_KEY, null);
    return;
  }

  writeStorage(ENTRY_INVITE_CODE_KEY, null);
  writeStorage(ENTRY_CREATE_CODE_KEY, null);
}

function mergeSearchIntoPath(to: string, currentSearch: string): string {
  const [basePath, baseQueryRaw = ""] = String(to || "").split("?");
  const merged = new URLSearchParams(baseQueryRaw);
  const current = new URLSearchParams(currentSearch);

  current.forEach((value, key) => {
    if (!merged.has(key)) {
      merged.append(key, value);
    }
  });

  const finalQuery = merged.toString();
  return finalQuery ? `${basePath}?${finalQuery}` : basePath;
}

const MODE_CONFIG: Record<EntryMode, ModeConfig> = {
  general: {
    label: "Public entry",
    heading:
      "A guided system for identity, trust, community, demand, and support.",
    description:
      "GMFN / GSN is designed to reduce confusion and guide people into the correct next step. Start here, understand the system if needed, then continue through the right public path.",
    supportText:
      "This general public route is for people who are not coming through a special create, invite, or approval link. It is designed to feel calm, structured, and easy to follow.",
    primaryLabel: "Continue to guided welcome",
    primaryTo: "/welcome",
    steps: [
      "Open the guided welcome page.",
      "Choose whether to read My GMFN and I first.",
      "Continue to login when ready.",
      "Enter your dashboard after sign in.",
    ],
    showLoginLink: true,
  },
  create: {
    label: "Founder create entry",
    heading: "Start the founder route for a new GMFN community.",
    description:
      "This entry already knows you are coming through the public create route. Continue directly into Create Entry. No prior login should be required before first-time founder setup.",
    supportText:
      "After completing the required registration and setup fields, the system should issue one global GMFN ID to that identity and attach one global shop to it. Immediately after GMFN issuance, the next guided step should be Build Your First Circle.",
    primaryLabel: "Continue to Create Entry",
    primaryTo: "/create",
    steps: [
      "Open Create Entry.",
      "Complete the required registration and setup fields.",
      "Receive your global GMFN ID and linked global shop.",
      "Build Your First Circle.",
      "Then continue into dashboard and wider member surfaces.",
    ],
    showLoginLink: false,
  },
  invite: {
    label: "Invited join entry",
    heading: "Continue your request to join an existing community.",
    description:
      "This entry already knows you are coming through the invited join route. Continue into Join Entry, not founder create and not the generic welcome page.",
    supportText:
      "After the first submission, the flow continues into Pending Approval. Activation should happen only after the team or community has approved the request.",
    primaryLabel: "Continue to Join Entry",
    primaryTo: "/join",
    steps: [
      "Open Join Entry and submit the required information.",
      "Move into Pending Approval while the request is reviewed.",
      "After approval, continue into activation and final setup.",
      "Receive your GMFN ID.",
      "Build Your First Circle before wider movement reopens.",
    ],
    showLoginLink: false,
  },
  approved: {
    label: "Approved activation entry",
    heading: "Complete activation for your approved membership.",
    description:
      "Your request has already been approved. Continue directly into final activation, complete the remaining setup, and enter the system.",
    supportText:
      "This page is not for first-time joining. It is only for approved people who now need to finish activation and receive full access.",
    primaryLabel: "Continue to Activation",
    primaryTo: "/activate-membership",
    steps: [
      "Open Activation.",
      "Complete your final details and set your password.",
      "Receive your GMFN identity if issuance happens at this stage.",
      "Build Your First Circle.",
      "Then continue into dashboard and wider member surfaces.",
    ],
    showLoginLink: false,
  },
  existing: {
    label: "Existing access",
    heading: "Sign in to your existing GMFN access.",
    description:
      "If you already have working access, continue straight to login. You do not need to repeat join, create, or activation steps.",
    supportText:
      "This is the shortest route for an already active user. Sign in and continue from your dashboard.",
    primaryLabel: "Continue to Login",
    primaryTo: "/login",
    steps: [
      "Open Login.",
      "Enter your credentials.",
      "Continue to your dashboard.",
    ],
    showLoginLink: false,
  },
};

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at top, rgba(47,103,196,0.18) 0%, rgba(16,37,59,0.00) 32%), linear-gradient(180deg, #0C1F33 0%, #143454 62%, #183F66 100%)",
    color: "#FFFFFF",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    padding: "22px",
    boxSizing: "border-box",
  };
}

function heroCard(): React.CSSProperties {
  return {
    maxWidth: 1020,
    width: "100%",
    borderRadius: 32,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
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
    minHeight: 48,
    padding: "14px 22px",
    borderRadius: 16,
    border: "none",
    fontSize: 15,
    fontWeight: 900,
    background: "#F3D06A",
    color: "#10253B",
    cursor: "pointer",
    textDecoration: "none",
    boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
    whiteSpace: "nowrap",
  };
}

function secondaryLink(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "#FFFFFF",
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 14,
    whiteSpace: "nowrap",
  };
}

function mutedPanel(): React.CSSProperties {
  return {
    borderRadius: 22,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    padding: 18,
  };
}

function stepCard(): React.CSSProperties {
  return {
    borderRadius: 16,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    padding: 14,
  };
}

function infoCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
    padding: 16,
  };
}

export default function CoverPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 920;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 920);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const entryMode = useMemo(
    () => detectEntryMode(location.pathname, location.search, location.state),
    [location.pathname, location.search, location.state]
  );

  const signedIn = isAuthenticated();
  const activeMode = MODE_CONFIG[entryMode];

  useEffect(() => {
    persistEntryState(entryMode, location.search);
  }, [entryMode, location.search]);

  function goNext() {
    if (signedIn && (entryMode === "general" || entryMode === "existing")) {
      navigate("/app/dashboard");
      return;
    }

    navigate(mergeSearchIntoPath(activeMode.primaryTo, location.search), {
      state:
        location.state && typeof location.state === "object"
          ? { ...(location.state as Record<string, unknown>) }
          : undefined,
    });
  }

  const primaryLabel =
    signedIn && (entryMode === "general" || entryMode === "existing")
      ? "Open Dashboard"
      : activeMode.primaryLabel;

  return (
    <div style={pageShell()}>
      <div style={heroCard()}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.18fr) minmax(300px, 0.82fr)",
            gap: 22,
            alignItems: "stretch",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <img
                src={gmfnMark}
                alt="GMFN / GSN"
                style={{
                  width: isCompact ? 92 : 112,
                  height: "auto",
                  filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.28))",
                }}
              />

              <div>
                <div style={labelText()}>{activeMode.label}</div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: isCompact ? 30 : 40,
                    fontWeight: 900,
                    letterSpacing: 0.4,
                    lineHeight: 1.05,
                  }}
                >
                  GMFN / GSN
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: isCompact ? 18 : 21,
                    fontWeight: 700,
                    color: "#F3D06A",
                  }}
                >
                  Global Support Network
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 22,
                fontSize: isCompact ? 24 : 36,
                fontWeight: 900,
                lineHeight: 1.12,
                maxWidth: 760,
              }}
            >
              {activeMode.heading}
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
              {activeMode.description}
            </div>

            <div
              style={{
                marginTop: 18,
                fontSize: 14,
                lineHeight: 1.8,
                color: "rgba(255,255,255,0.74)",
                maxWidth: 760,
              }}
            >
              {activeMode.supportText}
            </div>

            <div
              style={{
                marginTop: 22,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "repeat(2, max-content)",
                gap: 12,
                alignItems: "start",
                justifyContent: "start",
              }}
            >
              <button type="button" onClick={goNext} style={primaryBtn()}>
                {primaryLabel}
              </button>

              <Link to={PUBLIC_GUIDE_TO} style={secondaryLink()}>
                Open My GMFN and I
              </Link>

              {activeMode.showLoginLink && !signedIn ? (
                <Link to="/login" style={secondaryLink()}>
                  Login
                </Link>
              ) : null}
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <a
                href={PDF_FALLBACK_TO}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "rgba(255,255,255,0.74)",
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                PDF fallback
              </a>
            </div>

            <div
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div style={infoCard()}>
                <div style={labelText()}>Why this entry is guided</div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 14,
                    lineHeight: 1.75,
                    color: "rgba(255,255,255,0.84)",
                  }}
                >
                  People should not be pushed into too many equal choices at
                  once. The system should guide the next move clearly.
                </div>
              </div>

              <div style={infoCard()}>
                <div style={labelText()}>Who this design serves</div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 14,
                    lineHeight: 1.75,
                    color: "rgba(255,255,255,0.84)",
                  }}
                >
                  It is built to be clearer and safer for people who need plain
                  language, institutional calm, and lower cognitive load.
                </div>
              </div>
            </div>
          </div>

          <div style={mutedPanel()}>
            <div style={labelText()}>What happens next</div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gap: 10,
              }}
            >
              {activeMode.steps.map((step, index) => (
                <div key={`${entryMode}-${index}`} style={stepCard()}>
                  <div
                    style={{
                      color: "#F3D06A",
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: 0.35,
                      textTransform: "uppercase",
                    }}
                  >
                    Step {index + 1}
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 15,
                      fontWeight: 800,
                      lineHeight: 1.6,
                      color: "#FFFFFF",
                    }}
                  >
                    {step}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 16,
                color: "rgba(255,255,255,0.74)",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              My GMFN and I is the readable guide page. The PDF remains
              available only as fallback, not as the main path.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}