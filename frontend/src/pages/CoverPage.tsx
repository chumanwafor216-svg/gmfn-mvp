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
  void mode;
  return "/welcome";

}



function pageShell(): React.CSSProperties {

  return {

    minHeight: "100dvh",

    width: "100%",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    background:
      "radial-gradient(circle at 12% 0%, rgba(201,154,39,0.10) 0%, rgba(201,154,39,0.00) 22%), radial-gradient(circle at 84% 6%, rgba(70,116,171,0.11) 0%, rgba(70,116,171,0.00) 28%), linear-gradient(180deg, #06101A 0%, #0A1828 48%, #112B40 100%)",

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

    border: "1px solid rgba(226,236,246,0.16)",

    background:
      "linear-gradient(180deg, rgba(255,255,255,0.036) 0%, rgba(255,255,255,0.016) 100%)",

    boxShadow:
      "0 40px 92px rgba(0,8,18,0.38), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -18px 42px rgba(5,17,32,0.18)",

  };

}

function artworkPolishFrameStyle(): React.CSSProperties {

  return {

    position: "absolute",

    inset: 20,

    borderRadius: 28,

    border: "1px solid rgba(230,237,244,0.10)",

    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(12,27,44,0.24)",

    background:
      "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.00) 38%, rgba(5,17,32,0.08) 100%)",

    pointerEvents: "none",

    zIndex: 1,

  };

}

function artworkBottomVeilStyle(): React.CSSProperties {

  return {

    position: "absolute",

    left: 0,

    right: 0,

    bottom: 0,

    height: 176,

    background:
      "linear-gradient(180deg, rgba(7,20,34,0.00) 0%, rgba(7,20,34,0.24) 32%, rgba(6,16,27,0.54) 100%)",

    pointerEvents: "none",

    zIndex: 2,

  };

}

function buttonDockStyle(): React.CSSProperties {

  return {

    display: "inline-flex",

    alignItems: "center",

    justifyContent: "center",

    padding: "12px 12px 14px",

    borderRadius: 26,

    border: "1px solid rgba(227,235,243,0.22)",

    background:
      "linear-gradient(180deg, rgba(13,31,50,0.40) 0%, rgba(7,18,32,0.68) 100%)",

    boxShadow:
      "0 22px 44px rgba(1,9,22,0.40), inset 0 1px 0 rgba(255,255,255,0.11), inset 0 -1px 0 rgba(3,10,22,0.34)",

    backdropFilter: "blur(12px)",

    WebkitBackdropFilter: "blur(12px)",

  };

}



function buttonStyle(disabled = false): React.CSSProperties {

  return {

    display: "inline-flex",

    alignItems: "center",

    justifyContent: "center",

    minHeight: 58,

    minWidth: 236,

    padding: "14px 24px",

    borderRadius: 17,

    border: disabled
      ? "1px solid rgba(161,179,199,0.48)"
      : "1px solid rgba(239,246,255,0.95)",

    background: disabled
      ? "linear-gradient(180deg, #97AABE 0%, #869CAF 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #F5F8FC 38%, #DCE7F2 100%)",

    color: "#071D33",

    fontWeight: 1000,

    fontSize: 17,

    letterSpacing: "0.055em",

    cursor: disabled ? "not-allowed" : "pointer",

    boxShadow: disabled
      ? "none"
      : "0 24px 42px rgba(1,10,24,0.34), 0 0 0 1px rgba(204,172,99,0.20), inset 0 1px 0 rgba(255,255,255,1), inset 0 -3px 0 rgba(91,114,140,0.28)",

    textTransform: "uppercase",

    textShadow: disabled ? "none" : "0 1px 0 rgba(255,255,255,0.62)",

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
          "radial-gradient(circle at 50% 18%, rgba(164,190,218,0.10), transparent 24%), radial-gradient(circle at 18% 6%, rgba(201,154,39,0.07), transparent 20%), linear-gradient(180deg, #06131E 0%, #0B1D2D 34%, #143045 68%, #254C65 100%)",

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

            <stop offset="0%" stopColor="#E3C06A" />

            <stop offset="100%" stopColor="#B98A2B" />

          </linearGradient>



          <linearGradient id="shieldFill" x1="0" y1="0" x2="0" y2="1">

            <stop offset="0%" stopColor="#215989" />

            <stop offset="100%" stopColor="#133A63" />

          </linearGradient>



          <linearGradient id="shieldInnerLight" x1="0" y1="0" x2="1" y2="1">

            <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />

            <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />

          </linearGradient>

          <linearGradient id="gsnCastFill" x1="0" y1="0" x2="0" y2="1">

            <stop offset="0%" stopColor="#FFFFFF" />

            <stop offset="36%" stopColor="#F4F7FB" />

            <stop offset="68%" stopColor="#D4DEE9" />

            <stop offset="100%" stopColor="#9FB2C7" />

          </linearGradient>

          <linearGradient id="titleEmbossFill" x1="0" y1="0" x2="0" y2="1">

            <stop offset="0%" stopColor="#F8FBFF" />

            <stop offset="34%" stopColor="#E7EEF6" />

            <stop offset="64%" stopColor="#C6D4E3" />

            <stop offset="100%" stopColor="#8FA3B8" />

          </linearGradient>

          <linearGradient id="diamondLiftFill" x1="0" y1="0" x2="0" y2="1">

            <stop offset="0%" stopColor="#FFFFFF" />

            <stop offset="44%" stopColor="#F5F8FB" />

            <stop offset="100%" stopColor="#D5E0EA" />

          </linearGradient>

          <linearGradient id="starReliefFill" x1="0" y1="0" x2="0" y2="1">

            <stop offset="0%" stopColor="#F7E9B9" />

            <stop offset="48%" stopColor="#DAB460" />

            <stop offset="100%" stopColor="#A9792A" />

          </linearGradient>

          <radialGradient id="starPulseGlow" cx="50%" cy="45%" r="62%">

            <stop offset="0%" stopColor="rgba(245,232,179,0.88)" />

            <stop offset="38%" stopColor="rgba(214,179,95,0.42)" />

            <stop offset="100%" stopColor="rgba(214,179,95,0)" />

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

          <filter id="titleEmbossShadow" x="-80%" y="-100%" width="260%" height="300%">

            <feOffset dx="0" dy="4" result="lowerOffset" />

            <feGaussianBlur in="lowerOffset" stdDeviation="3" result="lowerBlur" />

            <feColorMatrix
              in="lowerBlur"
              type="matrix"
              values="0 0 0 0 0.01 0 0 0 0 0.04 0 0 0 0 0.10 0 0 0 0.82 0"
              result="lowerShadow"
            />

            <feOffset dx="0" dy="-0.8" result="upperOffset" />

            <feGaussianBlur in="upperOffset" stdDeviation="0.5" result="upperGlow" />

            <feColorMatrix
              in="upperGlow"
              type="matrix"
              values="0 0 0 0 0.88 0 0 0 0 0.94 0 0 0 0 1.00 0 0 0 0.34 0"
              result="topHighlight"
            />

            <feMerge>

              <feMergeNode in="lowerShadow" />

              <feMergeNode in="topHighlight" />

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



        <g opacity="0.15">

          <path

            d="M-20 108 C 180 24, 350 46, 544 118 S 812 186, 948 114"

            fill="none"

            stroke="#A8C5D8"

            strokeWidth="3"

          />

          <path

            d="M-10 214 C 164 138, 340 154, 520 226 S 810 300, 952 218"

            fill="none"

            stroke="#89AFC9"

            strokeWidth="2.5"

          />

        </g>



        <g opacity="0.14">

          <path

            d="M20 1088 C 232 990, 426 1018, 628 1092 S 876 1184, 982 1106"

            fill="none"

            stroke="#88AFC7"

            strokeWidth="3"

          />

          <path

            d="M-10 1254 C 210 1144, 430 1172, 650 1254 S 886 1360, 980 1270"

            fill="none"

            stroke="#82A8C0"

            strokeWidth="3"

          />

        </g>



        <g transform="translate(81,15) scale(0.82)">

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



          <g>

            <text
              x="451"
              y="334"
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
          </g>

        </g>



        <g transform="translate(120,930)">
          <path
            d="
              M214 18
              L252 -6
              H408
              L446 18
              Z
            "
            fill="rgba(255,255,255,0.03)"
            stroke="rgba(228,240,255,0.10)"
            strokeWidth="1.2"
          />

          <rect
            x="0"
            y="0"
            width="660"
            height="128"
            rx="32"
            fill="rgba(7,19,35,0.62)"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="2"
          />

          <rect
            x="24"
            y="20"
            width="612"
            height="88"
            rx="24"
            fill="rgba(255,255,255,0.028)"
            stroke="rgba(201,154,39,0.18)"
            strokeWidth="1.5"
          />

          <rect
            x="40"
            y="34"
            width="580"
            height="60"
            rx="18"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
            strokeDasharray="2 8"
          />

          <rect
            x="52"
            y="38"
            width="556"
            height="3"
            rx="1.5"
            fill="url(#shieldBorderGlow)"
          />

          <text
            x="332"
            y="92"
            textAnchor="middle"
            fill="rgba(1,9,22,0.62)"
            fontSize="38"
            fontWeight="850"
            letterSpacing="1.2"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            Global Support Network
          </text>

          <text
            x="330"
            y="88"
            textAnchor="middle"
            fill="url(#titleEmbossFill)"
            stroke="rgba(238,246,255,0.24)"
            strokeWidth="0.7"
            filter="url(#titleEmbossShadow)"
            fontSize="38"
            fontWeight="850"
            letterSpacing="1.2"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            Global Support Network
          </text>

          <text
            x="330"
            y="86.5"
            textAnchor="middle"
            fill="rgba(255,255,255,0.16)"
            fontSize="38"
            fontWeight="850"
            letterSpacing="1.2"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            Global Support Network
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



        <g opacity="0.18">

          <circle cx="152" cy="1388" r="4" fill="#AEC1D0" />

          <circle cx="738" cy="1398" r="4" fill="#AEC1D0" />

          <circle cx="308" cy="1366" r="3.5" fill="#AEC1D0" />

          <circle cx="590" cy="1350" r="3.5" fill="#AEC1D0" />

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

  function openGuide() {

    if (busy) return;

    navigate("/guide", {

      replace: false,

      state:

        location.state && typeof location.state === "object"

          ? {
              ...(location.state as Record<string, unknown>),
              returnTo: `${location.pathname}${location.search || ""}`,
            }

          : { returnTo: `${location.pathname}${location.search || ""}` },

    });

  }



  return (

    <div style={pageShell()}>

      <div style={frameStyle()}>

        <div style={artworkShell()}>

          <GSNSplashArtwork />

          <div style={artworkPolishFrameStyle()} />

          <div style={artworkBottomVeilStyle()} />

          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 20,
              transform: "translateX(-50%)",
              zIndex: 4,
            }}
          >
            <div style={{ ...buttonDockStyle(), display: "grid", gap: 10, justifyItems: "center" }}>
            <button

              type="button"

              onClick={goNext}

              {...buttonGuardProps()}

              disabled={busy}

              style={{ ...buttonStyle(busy), ...stableTapStyle() }}

            >

              {busy ? "Continuing..." : "Continue"}

            </button>

            <button

              type="button"

              onClick={openGuide}

              {...buttonGuardProps()}

              disabled={busy}

              style={{
                ...buttonStyle(false),
                ...stableTapStyle(),
                minHeight: 40,
                padding: "10px 20px",
                borderRadius: 18,
                background: "linear-gradient(180deg, rgba(235,244,255,0.20) 0%, rgba(98,126,153,0.13) 100%)",
                color: "#F4F8FC",
                border: "1px solid rgba(221,232,244,0.22)",
                boxShadow: "0 14px 28px rgba(1,9,22,0.26), inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(2,12,24,0.28)",
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: "0.025em",
                textTransform: "none",
                textShadow: "0 1px 0 rgba(0,0,0,0.30)",
              }}

            >

              About GSN & I

            </button>
            </div>
          </div>

        </div>

      </div>

    </div>

  );

}



