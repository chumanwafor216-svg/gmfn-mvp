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

  return "/create";

}



function pageShell(): React.CSSProperties {

  return {

    minHeight: "100dvh",

    width: "100%",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    background:

      "radial-gradient(circle at top, rgba(63,114,206,0.14) 0%, rgba(9,23,44,0.00) 30%), linear-gradient(180deg, #07172B 0%, #0D2A48 58%, #12365A 100%)",

    color: "#FFFFFF",

    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",

    padding: 0,

    boxSizing: "border-box",

  };

}



function frameStyle(): React.CSSProperties {

  return {

    width: "min(100vw, 520px)",

    minHeight: "100dvh",

    display: "flex",

    flexDirection: "column",

    gap: 10,

    alignItems: "center",

    justifyContent: "center",

  };

}



function artworkShell(): React.CSSProperties {

  return {

    width: "100%",

    height: "100dvh",

    position: "relative",

    borderRadius: 0,

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

    border: disabled ? "1px solid rgba(177,196,220,0.55)" : "1px solid rgba(255,255,255,0.92)",

    background: disabled
      ? "linear-gradient(180deg, #9DB5D5 0%, #88A5C8 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #F1F6FD 52%, #DCE9F7 100%)",

    color: "#08254A",

    fontWeight: 900,

    fontSize: 16,

    cursor: disabled ? "not-allowed" : "pointer",

    boxShadow: disabled
      ? "none"
      : "0 18px 34px rgba(1,13,32,0.30), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -2px 0 rgba(124,149,182,0.35)",

    whiteSpace: "normal",

    touchAction: "manipulation",

    WebkitTapHighlightColor: "transparent",

  };

}



function stableTapStyle(): React.CSSProperties {

  return {

    touchAction: "manipulation",

    WebkitTapHighlightColor: "transparent",

  };

}



function guardButtonPress(

  event:

    | React.PointerEvent<HTMLElement>

    | React.TouchEvent<HTMLElement>

    | React.MouseEvent<HTMLElement>

): void {

  event.stopPropagation();

}



function buttonGuardProps() {

  return {

    onPointerDown: guardButtonPress,

    onTouchStart: guardButtonPress,

    onMouseDown: guardButtonPress,

  };

}



function GSNSplashArtwork() {

  return (

    <div

      style={{

        width: "100%",

        height: "100%",

        position: "relative",

        overflow: "hidden",

        background:

          "radial-gradient(circle at 50% 18%, rgba(123,181,255,0.16), transparent 24%), linear-gradient(180deg, #081E63 0%, #0B349B 38%, #0F5FC4 72%, #1282D2 100%)",

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

        preserveAspectRatio="xMidYMid slice"

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

          <linearGradient id="gsnCastFill" x1="0" y1="0" x2="0" y2="1">

            <stop offset="0%" stopColor="#FFFFFF" />

            <stop offset="36%" stopColor="#F2F7FD" />

            <stop offset="68%" stopColor="#D6E4F3" />

            <stop offset="100%" stopColor="#ACC2DB" />

          </linearGradient>

          <linearGradient id="diamondLiftFill" x1="0" y1="0" x2="0" y2="1">

            <stop offset="0%" stopColor="#FFFFFF" />

            <stop offset="44%" stopColor="#F7FBFF" />

            <stop offset="100%" stopColor="#DDEBFA" />

          </linearGradient>

          <linearGradient id="starReliefFill" x1="0" y1="0" x2="0" y2="1">

            <stop offset="0%" stopColor="#FFF4C8" />

            <stop offset="48%" stopColor="#F2CB67" />

            <stop offset="100%" stopColor="#D99630" />

          </linearGradient>

          <radialGradient id="starPulseGlow" cx="50%" cy="45%" r="62%">

            <stop offset="0%" stopColor="rgba(255,244,184,0.96)" />

            <stop offset="38%" stopColor="rgba(246,208,104,0.54)" />

            <stop offset="100%" stopColor="rgba(246,208,104,0)" />

          </radialGradient>

          <linearGradient id="shieldSweep" x1="0" y1="0" x2="1" y2="1">

            <stop offset="0%" stopColor="rgba(255,255,255,0)" />

            <stop offset="38%" stopColor="rgba(255,255,255,0.04)" />

            <stop offset="52%" stopColor="rgba(255,255,255,0.20)" />

            <stop offset="66%" stopColor="rgba(255,255,255,0.04)" />

            <stop offset="100%" stopColor="rgba(255,255,255,0)" />

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

          <filter id="gsnCastShadow" x="-120%" y="-120%" width="340%" height="340%">

            <feOffset dx="0" dy="8" result="offset" />

            <feGaussianBlur in="offset" stdDeviation="8" result="blur" />

            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0.02 0 0 0 0 0.07 0 0 0 0 0.18 0 0 0 0.75 0"
              result="shadow"
            />

            <feMerge>

              <feMergeNode in="shadow" />

              <feMergeNode in="SourceGraphic" />

            </feMerge>

          </filter>

          <filter id="diamondLiftShadow" x="-180%" y="-180%" width="420%" height="420%">

            <feOffset dx="0" dy="4" result="offset" />

            <feGaussianBlur in="offset" stdDeviation="4" result="blur" />

            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0.05 0 0 0 0 0.10 0 0 0 0 0.19 0 0 0 0.45 0"
              result="shadow"
            />

            <feMerge>

              <feMergeNode in="shadow" />

              <feMergeNode in="SourceGraphic" />

            </feMerge>

          </filter>

          <filter id="starReliefShadow" x="-180%" y="-180%" width="420%" height="420%">

            <feOffset dx="0" dy="5" result="offset" />

            <feGaussianBlur in="offset" stdDeviation="4.5" result="blur" />

            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0.14 0 0 0 0 0.08 0 0 0 0 0.02 0 0 0 0.40 0"
              result="shadow"
            />

            <feMerge>

              <feMergeNode in="shadow" />

              <feMergeNode in="SourceGraphic" />

            </feMerge>

          </filter>

          <filter id="starInnerSpark" x="-180%" y="-180%" width="420%" height="420%">

            <feGaussianBlur stdDeviation="2.2" result="blur" />

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

              M450 222

              L566 283

              L566 602

              C566 747 525 857 450 952

              C375 857 334 747 334 602

              L334 283

              Z

            "

            fill="none"

            stroke="rgba(228,240,255,0.20)"

            strokeWidth="2.5"

          />

          <path

            d="

              M450 242

              L548 294

              L548 590

              C548 724 511 827 450 907

              C389 827 352 724 352 590

              L352 294

              Z

            "

            fill="none"

            stroke="rgba(255,255,255,0.10)"

            strokeWidth="1.6"

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

            fill="url(#shieldSweep)"

            opacity="0.72"

          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="-38 0;38 0;-38 0"
              dur="5.2s"
              repeatCount="indefinite"
            />
          </path>



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

            <text
              x="452"
              y="336"
              textAnchor="middle"
              fill="rgba(6,22,56,0.72)"
              fontSize="48"
              fontWeight="900"
              letterSpacing="6"
              fontFamily="Arial, Helvetica, sans-serif"
            >
              GSN
            </text>

            <text
              x="450"
              y="328"
              textAnchor="middle"
              fill="url(#gsnCastFill)"
              stroke="rgba(255,255,255,0.50)"
              strokeWidth="1.1"
              filter="url(#gsnCastShadow)"
              fontSize="48"
              fontWeight="900"
              letterSpacing="6"
              fontFamily="Arial, Helvetica, sans-serif"
            >
              GSN
            </text>

            <g>

              <ellipse
                cx="450"
                cy="418"
                rx="56"
                ry="56"
                fill="url(#starPulseGlow)"
                opacity="0.72"
              >
                <animate
                  attributeName="opacity"
                  values="0.42;0.82;0.42"
                  dur="2.8s"
                  repeatCount="indefinite"
                />
              </ellipse>

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

                fill="url(#starReliefFill)"
                stroke="rgba(255,247,217,0.76)"
                strokeWidth="1.2"
                filter="url(#starReliefShadow)"
              >
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="1 1;1.03 1.03;1 1"
                  dur="2.8s"
                  repeatCount="indefinite"
                  additive="sum"
                  origin="450 418"
                />
              </polygon>

              <polygon

                points="

                  450,372

                  461,402

                  493,403

                  467,421

                  476,452

                  450,434

                  424,452

                  433,421

                  407,403

                  439,402

                "

                fill="rgba(255,252,232,0.70)"
                opacity="0.82"
                filter="url(#starInnerSpark)"
              />

            </g>

            <circle cx="565" cy="565" r="15" fill="#F4F7FA" />

            <circle cx="360" cy="632" r="15" fill="#F4F7FA" />

            <circle cx="384" cy="815" r="15" fill="#F4F7FA" />

            <circle cx="542" cy="796" r="15" fill="#F4F7FA" />

          </g>

        </g>



        <g transform="translate(120,1048)">
          <path
            d="
              M214 18
              L252 -8
              H408
              L446 18
              Z
            "
            fill="rgba(255,255,255,0.04)"
            stroke="rgba(228,240,255,0.10)"
            strokeWidth="1.2"
          />

          <rect
            x="0"
            y="0"
            width="660"
            height="246"
            rx="32"
            fill="rgba(5,19,45,0.54)"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2"
          />

          <rect
            x="24"
            y="22"
            width="612"
            height="202"
            rx="24"
            fill="rgba(255,255,255,0.03)"
            stroke="rgba(244,199,90,0.18)"
            strokeWidth="1.5"
          />

          <rect
            x="40"
            y="36"
            width="580"
            height="174"
            rx="18"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
            strokeDasharray="2 8"
          />

          <rect
            x="52"
            y="40"
            width="556"
            height="3"
            rx="1.5"
            fill="url(#shieldBorderGlow)"
          />

          <text
            x="330"
            y="82"
            textAnchor="middle"
            fill="#F3D06A"
            fontSize="22"
            fontWeight="800"
            letterSpacing="5.2"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            TRUST INFRASTRUCTURE PROTOCOL
          </text>

          <text
            x="330"
            y="136"
            textAnchor="middle"
            fill="#F6F8FC"
            fontSize="36"
            fontWeight="700"
            letterSpacing="1.6"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            Global Support Network
          </text>

          <text
            x="330"
            y="180"
            textAnchor="middle"
            fill="#DCEBFF"
            fontSize="24"
            fontWeight="500"
            letterSpacing="0.4"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            Trust made visible for stronger communities.
          </text>

          <text
            x="330"
            y="206"
            textAnchor="middle"
            fill="rgba(233,241,252,0.56)"
            fontSize="14"
            fontWeight="700"
            letterSpacing="3.6"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            TRUSTED COMMUNITY ENTRY
          </text>

          <path
            d="
              M286 -6
              L330 -52
              L374 -6
              L330 38
              Z
            "
            fill="url(#diamondLiftFill)"
            stroke="rgba(236,245,255,0.98)"
            strokeWidth="1.8"
            filter="url(#diamondLiftShadow)"
          />

        </g>



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

      document.title = "GSN | Global Support Network";
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

          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 18,
              transform: "translateX(-50%)",
              zIndex: 3,
            }}
          >
            <button

              type="button"

              onClick={goNext}

              {...buttonGuardProps()}

              disabled={busy}

              style={{ ...buttonStyle(busy), ...stableTapStyle() }}

            >

              {busy ? "Opening..." : "Continue"}

            </button>
          </div>

        </div>

      </div>

    </div>

  );

}



