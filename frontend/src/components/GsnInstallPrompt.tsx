import React, { useEffect, useMemo, useState } from "react";

import { PrimaryButton, SecondaryButton } from "./StableButton";
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
    borderRadius: compact ? 20 : 24,
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
    padding: compact ? 14 : 16,
    display: "grid",
    gap: compact ? 10 : 12,
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
    overflowAnchor: "none",
  };
}

function markStyle(tone: InstallPromptTone, compact: boolean): React.CSSProperties {
  const dark = tone === "dark";

  return {
    width: compact ? 38 : 44,
    height: compact ? 38 : 44,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    color: dark ? "#061827" : "#08233A",
    background:
      "linear-gradient(180deg, #FFF3B8 0%, #F2C766 54%, #D6AA45 100%)",
    border: "1px solid rgba(255,255,255,0.48)",
    boxShadow:
      "0 10px 22px rgba(6,24,39,0.16), inset 0 1px 0 rgba(255,255,255,0.66)",
    fontSize: compact ? 13 : 14,
    fontWeight: 1000,
    letterSpacing: 0.4,
  };
}

function primaryStyle(compact: boolean): React.CSSProperties {
  return {
    width: "100%",
    minHeight: compact ? 44 : 48,
    height: compact ? 44 : 48,
    maxHeight: compact ? 44 : 48,
    borderRadius: 999,
    padding: compact ? "0 14px" : "0 16px",
    fontSize: compact ? 13 : 14,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
}

function secondaryStyle(tone: InstallPromptTone, compact: boolean): React.CSSProperties {
  const dark = tone === "dark";

  return {
    width: "100%",
    minHeight: compact ? 40 : 42,
    height: compact ? 40 : 42,
    maxHeight: compact ? 40 : 42,
    borderRadius: 999,
    padding: compact ? "0 12px" : "0 14px",
    fontSize: compact ? 12.5 : 13,
    color: dark ? "#F8FBFF" : "#0B1F33",
    background: dark
      ? "linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #EDF5FF 100%)",
    border: dark
      ? "1px solid rgba(220,231,243,0.22)"
      : "1px solid rgba(13,95,168,0.14)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
}

function helperTextStyle(tone: InstallPromptTone, compact: boolean): React.CSSProperties {
  return {
    margin: 0,
    color: tone === "dark" ? "rgba(226,232,240,0.78)" : "#526C84",
    fontSize: compact ? 12.5 : 13.5,
    lineHeight: 1.48,
    fontWeight: 700,
  };
}

function manualSteps(isIos: boolean): string {
  if (isIos) {
    return "Open the browser share menu, choose Add to Home Screen, then save GSN.";
  }

  return "Open the browser menu and choose Install app or Add to Home screen.";
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
      setMessage("Use the phone browser menu to keep GSN on this phone.");
      return;
    }

    if (choice.outcome === "accepted") {
      setMessage("GSN is being added to this phone.");
      return;
    }

    setManualOpen(true);
    setMessage("Install was not completed. You can add GSN later from the browser menu.");
  }

  const label = state.promptReady ? "Keep GSN on this phone" : "Show phone setup";
  const describedBy = `gsn-install-${surface.replace(/[^a-z0-9-]+/gi, "-")}`;

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
          gap: 12,
          alignItems: "center",
          minWidth: 0,
        }}
      >
        <div style={markStyle(tone, compact)} aria-hidden="true">
          GSN
        </div>
        <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
          <div
            style={{
              color: tone === "dark" ? "#F8FBFF" : "#0B1F33",
              fontSize: compact ? 15 : 17,
              fontWeight: 1000,
              lineHeight: 1.18,
            }}
          >
            Keep GSN on this phone
          </div>
          <p id={describedBy} style={helperTextStyle(tone, compact)}>
            Add a GSN icon to the phone screen so this route does not get lost
            in WhatsApp or browser tabs.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 9,
          alignItems: "stretch",
        }}
      >
        {state.promptReady ? (
          <PrimaryButton
            type="button"
            onClick={handleInstall}
            stableHeight={compact ? 44 : 48}
            debugId={`gsn-install.${surface}.native`}
            aria-describedby={describedBy}
            style={primaryStyle(compact)}
          >
            {label}
          </PrimaryButton>
        ) : (
          <SecondaryButton
            type="button"
            onClick={() => setManualOpen((current) => !current)}
            stableHeight={compact ? 40 : 42}
            debugId={`gsn-install.${surface}.manual-toggle`}
            aria-expanded={manualOpen}
            aria-describedby={describedBy}
            style={secondaryStyle(tone, compact)}
          >
            {label}
          </SecondaryButton>
        )}

        <SecondaryButton
          type="button"
          onClick={() => setManualOpen((current) => !current)}
          stableHeight={compact ? 40 : 42}
          debugId={`gsn-install.${surface}.instructions`}
          aria-expanded={manualOpen}
          style={secondaryStyle(tone, compact)}
        >
          {manualOpen ? "Hide steps" : "Phone steps"}
        </SecondaryButton>
      </div>

      {message ? <p style={helperTextStyle(tone, compact)}>{message}</p> : null}

      {manualOpen ? (
        <div
          style={{
            borderRadius: 16,
            border:
              tone === "dark"
                ? "1px solid rgba(220,231,243,0.16)"
                : "1px solid rgba(13,95,168,0.12)",
            background:
              tone === "dark"
                ? "rgba(6,24,39,0.42)"
                : "rgba(255,255,255,0.72)",
            padding: compact ? "10px 12px" : "12px 14px",
          }}
        >
          <p style={helperTextStyle(tone, compact)}>{manualSteps(isIos)}</p>
        </div>
      ) : null}
    </section>
  );
}
