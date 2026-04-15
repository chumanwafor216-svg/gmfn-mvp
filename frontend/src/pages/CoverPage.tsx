import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const ENTRY_MODE_KEY = "gmfn_entry_mode";
const ENTRY_INVITE_CODE_KEY = "gmfn_entry_invite_code";
const ENTRY_CREATE_CODE_KEY = "gmfn_entry_create_code";

type EntryMode = "general" | "create" | "invite" | "approved" | "existing";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (!canUseStorage()) return;

    if (value == null || String(value).trim() === "") {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
}

function normalizeValue(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
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

function nextRouteForMode(mode: EntryMode): string {
  if (mode === "create") return "/create";
  if (mode === "invite") return "/join";
  if (mode === "approved") return "/activate-membership";
  if (mode === "existing") return "/login";
  return "/welcome";
}

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

function frameStyle(): React.CSSProperties {
  return {
    width: "min(92vw, 560px)",
    display: "grid",
    gap: 18,
    justifyItems: "center",
  };
}

function artworkShell(): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 34,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 28px 74px rgba(0,0,0,0.30)",
  };
}

function buttonStyle(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    minWidth: 210,
    padding: "12px 18px",
    borderRadius: 16,
    border: "none",
    background: disabled ? "#8AA7D0" : "#FFFFFF",
    color: "#0B2E59",
    fontWeight: 900,
    fontSize: 16,
    cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: disabled ? "none" : "0 14px 30px rgba(0,0,0,0.18)",
    whiteSpace: "nowrap",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "rgba(255,255,255,0.84)",
    fontSize: 13,
    lineHeight: 1.7,
    textAlign: "center",
    maxWidth: 420,
  };
}

function GSNSplashArtwork() {
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "9 / 16",
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 50% 18%, rgba(92,157,255,0.20), transparent 26%), linear-gradient(180deg, #0A2A88 0%, #0D47D6 42%, #19AEEF 100%)",
      }}
    >
      <svg
        viewBox="0 0 900 1600"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="shieldBorderGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F4C75A" />
            <stop offset="100%" stopColor="#E7A83B" />
          </linearGradient>

          <linearGradient id="shieldFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F6FF0" />
            <stop offset="100%" stopColor="#0A49BA" />
          </linearGradient>

          <linearGradient id="shieldInnerLight" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
          </linearGradient>

          <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="starGlow" x="-200%" y="-200%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect
          x="34"
          y="34"
          width="832"
          height="1532"
          rx="36"
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="2"
        />

        <g opacity="0.20">
          <path
            d="M-20 108 C 180 24, 350 46, 544 118 S 812 186, 948 114"
            fill="none"
            stroke="#CBEAFF"
            strokeWidth="3"
          />
          <path
            d="M-10 214 C 164 138, 340 154, 520 226 S 810 300, 952 218"
            fill="none"
            stroke="#A6E4FF"
            strokeWidth="2.5"
          />
        </g>

        <g opacity="0.18">
          <path
            d="M20 1088 C 232 990, 426 1018, 628 1092 S 876 1184, 982 1106"
            fill="none"
            stroke="#A3E6FF"
            strokeWidth="3"
          />
          <path
            d="M-10 1254 C 210 1144, 430 1172, 650 1254 S 886 1360, 980 1270"
            fill="none"
            stroke="#9FE0FF"
            strokeWidth="3"
          />
        </g>

        <g transform="translate(0,10)">
          <path
            d="
              M450 170
              L612 255
              L612 626
              C612 814 556 954 450 1082
              C344 954 288 814 288 626
              L288 255
              Z
            "
            fill="url(#shieldFill)"
            stroke="url(#shieldBorderGlow)"
            strokeWidth="10"
            filter="url(#softGlow)"
          />

          <path
            d="
              M450 198
              L586 270
              L586 613
              C586 775 538 898 450 1008
              C362 898 314 775 314 613
              L314 270
              Z
            "
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="4"
          />

          <path
            d="
              M450 268
              L545 785
              L450 948
              L355 785
              Z
            "
            fill="rgba(14,43,118,0.18)"
          />

          <g stroke="#F7FBFF" strokeWidth="6" fill="none" strokeLinecap="round">
            <path d="M450 425 L565 565" />
            <path d="M450 425 L360 632" />
            <path d="M450 425 L450 724" />
            <path d="M360 632 L384 815" />
            <path d="M384 815 L542 796" />
            <path d="M542 796 L565 565" />
            <path d="M450 724 L565 565" />
            <path d="M450 724 L542 796" />
            <path d="M450 724 L384 815" />
            <path d="M360 632 L565 565" />
          </g>

          <g>
            <polygon
              points="
                450,362
                464,404
                508,404
                472,430
                486,472
                450,446
                414,472
                428,430
                392,404
                436,404
              "
              fill="#F5CF68"
              filter="url(#starGlow)"
            />
            <circle cx="565" cy="565" r="15" fill="#F4F7FA" />
            <circle cx="360" cy="632" r="15" fill="#F4F7FA" />
            <circle cx="384" cy="815" r="15" fill="#F4F7FA" />
            <circle cx="542" cy="796" r="15" fill="#F4F7FA" />
          </g>
        </g>

        <text
          x="450"
          y="1140"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="98"
          fontWeight="900"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          GMFN
        </text>

        <text
          x="450"
          y="1256"
          textAnchor="middle"
          fill="#F3D06A"
          fontSize="54"
          fontWeight="700"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          Global Mutual Finance Network
        </text>

        <text
          x="450"
          y="1334"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="42"
          fontWeight="500"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          Trust Infrastructure Protocol
        </text>

        <text
          x="450"
          y="1484"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="38"
          fontWeight="500"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          Trusted cooperation for communities.
        </text>

        <g opacity="0.26">
          <circle cx="152" cy="1388" r="4" fill="#C7EDFF" />
          <circle cx="738" cy="1398" r="4" fill="#C7EDFF" />
          <circle cx="308" cy="1366" r="3.5" fill="#C7EDFF" />
          <circle cx="590" cy="1350" r="3.5" fill="#C7EDFF" />
        </g>
      </svg>
    </div>
  );
}

export default function CoverPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);

  const entryMode = useMemo(
    () => detectEntryMode(location.pathname, location.search, location.state),
    [location.pathname, location.search, location.state]
  );

  useEffect(() => {
    persistEntryState(entryMode, location.search);
  }, [entryMode, location.search]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "GMFN | Global Support Network";
    }
  }, []);

  function goNext() {
    if (busy) return;
    setBusy(true);

    const nextTo = mergeSearchIntoPath(
      nextRouteForMode(entryMode),
      location.search
    );

    navigate(nextTo, {
      replace: false,
      state:
        location.state && typeof location.state === "object"
          ? { ...(location.state as Record<string, unknown>) }
          : undefined,
    });
  }

  return (
    <div style={pageShell()}>
      <div style={frameStyle()}>
        <div style={artworkShell()}>
          <GSNSplashArtwork />
        </div>

        <div style={helperText()}>
          Trust-first entry into the Global Support Network.
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={busy}
          style={buttonStyle(busy)}
        >
          {busy ? "Opening..." : "Continue"}
        </button>
      </div>
    </div>
  );
}
