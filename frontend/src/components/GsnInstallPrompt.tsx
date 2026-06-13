import React, { useEffect, useMemo, useState } from "react";

import { PrimaryButton } from "./StableButton";
import {
  hasNativeInstallPrompt,
  isGsnStandaloneDisplay,
  isIosManualInstallTarget,
  promptGsnInstall,
  subscribePwaInstall,
  wasInstalledThisSession,
} from "../lib/pwaInstall";

type InstallPromptTone = "dark" | "light";

type GsnInstallPromptProps = {
  tone?: InstallPromptTone;
  compact?: boolean;
  surface?: string;
};

type InstallState = {
  promptReady: boolean;
  installed: boolean;
};

function readInstallState(): InstallState {
  return {
    promptReady: hasNativeInstallPrompt(),
    installed: isGsnStandaloneDisplay() || wasInstalledThisSession(),
  };
}

function outerCardStyle(tone: InstallPromptTone, compact: boolean): React.CSSProperties {
  const dark = tone === "dark";

  return {
    borderRadius: compact ? 18 : 22,
    border: dark
      ? "1px solid rgba(243,208,106,0.24)"
      : "1px solid rgba(13,95,168,0.14)",
    background: dark
      ? "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.045) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(238,246,255,0.94) 100%)",
    boxShadow: dark
      ? "0 20px 38px rgba(0,8,18,0.22), inset 0 1px 0 rgba(255,255,255,0.10)"
      : "0 16px 34px rgba(8,38,67,0.10), inset 0 1px 0 rgba(255,255,255,0.86)",
    color: dark ? "#F8FBFF" : "#0B1F33",
    padding: compact ? 12 : 14,
    display: "grid",
    gap: compact ? 9 : 10,
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
    overflowAnchor: "none",
  };
}

function markStyle(tone: InstallPromptTone, compact: boolean): React.CSSProperties {
  return {
    width: compact ? 34 : 40,
    height: compact ? 34 : 40,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    background: tone === "dark" ? "rgba(255,255,255,0.08)" : "rgba(8,35,58,0.05)",
    border: "1px solid rgba(243,208,106,0.24)",
    boxShadow:
      "0 10px 22px rgba(6,24,39,0.16), inset 0 1px 0 rgba(255,255,255,0.18)",
    overflow: "hidden",
  };
}

function primaryStyle(compact: boolean): React.CSSProperties {
  return {
    width: "100%",
    minHeight: compact ? 42 : 46,
    height: compact ? 42 : 46,
    maxHeight: compact ? 42 : 46,
    borderRadius: 999,
    padding: compact ? "0 12px" : "0 14px",
    fontSize: compact ? 13 : 13.5,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
}

function helperTextStyle(tone: InstallPromptTone, compact: boolean): React.CSSProperties {
  return {
    margin: 0,
    color: tone === "dark" ? "rgba(226,232,240,0.78)" : "#526C84",
    fontSize: compact ? 12 : 12.8,
    lineHeight: 1.4,
    fontWeight: 700,
  };
}

function manualSteps(isIos: boolean): string[] {
  if (isIos) {
    return [
      "If you are inside WhatsApp, open this page in Safari first.",
      "Tap Share.",
      "Tap Add to Home Screen.",
    ];
  }

  return [
    "Tap the Chrome menu ⋮.",
    "Tap Add to Home screen or Install app.",
    "Tap Add.",
  ];
}

export default function GsnInstallPrompt({
  tone = "dark",
  compact = false,
  surface = "general",
}: GsnInstallPromptProps) {
  const [state, setState] = useState<InstallState>(() => readInstallState());
  const [manualOpen, setManualOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    return subscribePwaInstall(() => {
      setState(readInstallState());
    });
  }, []);

  useEffect(() => {
    function updateDisplayState() {
      setState(readInstallState());
    }

    window
      .matchMedia?.("(display-mode: standalone)")
      ?.addEventListener?.("change", updateDisplayState);

    return () => {
      window
        .matchMedia?.("(display-mode: standalone)")
        ?.removeEventListener?.("change", updateDisplayState);
    };
  }, []);

  const isIos = useMemo(() => isIosManualInstallTarget(), []);

  if (state.installed) return null;

  async function handleInstall() {
    setMessage("");

    const choice = await promptGsnInstall();
    if (!choice) {
      setManualOpen(true);
      setMessage(
        isIos
          ? "iPhone uses Safari's Share button for this. Follow these steps."
          : "Chrome may hide this in the menu. Follow these steps."
      );
      return;
    }

    if (choice.outcome === "accepted") {
      setMessage("Done. Check your phone screen for GSN.");
      return;
    }

    setManualOpen(true);
    setMessage("Not added yet. Use these simple steps.");
  }

  const label = isIos
    ? "Show iPhone screen steps"
    : state.promptReady
    ? "Add GSN to phone screen"
    : "Show 3 phone steps";
  const describedBy = `gsn-install-${surface.replace(/[^a-z0-9-]+/gi, "-")}`;
  const steps = manualSteps(isIos);

  return (
    <section
      aria-label="Keep GSN on this phone"
      style={outerCardStyle(tone, compact)}
      data-gsn-install-surface={surface}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto minmax(0, 1fr)",
          gap: 10,
          alignItems: "center",
          minWidth: 0,
        }}
      >
        <div style={markStyle(tone, compact)} aria-hidden="true">
          <img
            src="/gsn-app-icon.svg"
            alt=""
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              objectFit: "cover",
            }}
          />
        </div>
        <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
          <div
            style={{
              color: tone === "dark" ? "#F8FBFF" : "#0B1F33",
              fontSize: compact ? 14.5 : 16,
              fontWeight: 1000,
              lineHeight: 1.18,
            }}
          >
            Keep GSN nearby
          </div>
          <p id={describedBy} style={helperTextStyle(tone, compact)}>
            {isIos
              ? "On iPhone, add GSN through Safari's Share button."
              : "Put a GSN icon on your phone screen."}
          </p>
        </div>
      </div>

      <PrimaryButton
        type="button"
        onClick={state.promptReady ? handleInstall : () => setManualOpen((current) => !current)}
        stableHeight={52}
        debugId={`gsn-install.${surface}.setup`}
        aria-expanded={manualOpen}
        aria-describedby={describedBy}
        style={primaryStyle(compact)}
      >
        {manualOpen && !state.promptReady ? "Hide steps" : label}
      </PrimaryButton>

      {message ? <p style={helperTextStyle(tone, compact)}>{message}</p> : null}

      {manualOpen ? (
        <div
          style={{
            borderRadius: 14,
            border:
              tone === "dark"
                ? "1px solid rgba(220,231,243,0.16)"
                : "1px solid rgba(13,95,168,0.12)",
            background:
              tone === "dark"
                ? "rgba(6,24,39,0.42)"
                : "rgba(255,255,255,0.72)",
            padding: compact ? "9px 10px" : "10px 12px",
          }}
        >
          <ol
            style={{
              margin: 0,
              paddingLeft: 18,
              color: tone === "dark" ? "rgba(248,251,255,0.88)" : "#0B1F33",
              fontSize: compact ? 12 : 12.8,
              lineHeight: 1.45,
              fontWeight: 800,
            }}
          >
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
