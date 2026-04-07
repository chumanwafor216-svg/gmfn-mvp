import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { getMySettings } from "../lib/api";
import { subscribeVisualSettingsUpdated } from "../lib/workspaceEvents";

type ThemePreset =
  | "professional-blue"
  | "cooperative-warm"
  | "enterprise-green";

type WorkspaceSettings = {
  tonePreset: ThemePreset;
  textSize: "standard" | "large";
  contrast: "standard" | "high";
  motion: "normal" | "reduced";
  density: "comfortable" | "compact";
};

const DEFAULT_SETTINGS: WorkspaceSettings = {
  tonePreset: "professional-blue",
  textSize: "standard",
  contrast: "standard",
  motion: "normal",
  density: "comfortable",
};

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function normalizeSettings(input: any): WorkspaceSettings {
  const tonePreset = safeStr(input?.tonePreset || input?.tone_preset);
  const textSize = safeStr(input?.textSize || input?.text_size);
  const contrast = safeStr(input?.contrast);
  const motion = safeStr(input?.motion);
  const density = safeStr(input?.density);

  return {
    tonePreset:
      tonePreset === "cooperative-warm" || tonePreset === "enterprise-green"
        ? (tonePreset as ThemePreset)
        : "professional-blue",
    textSize: textSize === "large" ? "large" : "standard",
    contrast: contrast === "high" ? "high" : "standard",
    motion: motion === "reduced" ? "reduced" : "normal",
    density: density === "compact" ? "compact" : "comfortable",
  };
}

function getThemeFromPreset(
  preset: ThemePreset
): { accent: string; page: string; text: string } {
  if (preset === "cooperative-warm") {
    return {
      accent: "#8A5A2B",
      page: "#F8F3ED",
      text: "#2F241A",
    };
  }

  if (preset === "enterprise-green") {
    return {
      accent: "#0F766E",
      page: "#F2FAF8",
      text: "#102A27",
    };
  }

  return {
    accent: "#0B63D1",
    page: "#F4F8FC",
    text: "#0B1F33",
  };
}

export default function WorkspaceSettingsBridge() {
  const location = useLocation();
  const [settings, setSettings] = useState<WorkspaceSettings>(DEFAULT_SETTINGS);

  const theme = useMemo(
    () => getThemeFromPreset(settings.tonePreset),
    [settings.tonePreset]
  );

  useEffect(() => {
    let alive = true;

    async function loadSettings() {
      const settingsRes = await getMySettings().catch(() => null);
      if (!alive) return;

      if (settingsRes) {
        setSettings(normalizeSettings(settingsRes));
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    }

    void loadSettings();

    function handleFocus() {
      void loadSettings();
    }

    function handleVisibilityChange() {
      if (typeof document === "undefined") return;
      if (!document.hidden) {
        void loadSettings();
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleFocus);
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      alive = false;

      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleFocus);
      }

      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [location.pathname, location.search]);

  useEffect(() => {
    const unsubscribe = subscribeVisualSettingsUpdated((payload: any) => {
      setSettings(normalizeSettings(payload));
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const html = document.documentElement;
    const body = document.body;

    html.setAttribute("data-gmfn-contrast", settings.contrast);
    html.setAttribute("data-gmfn-motion", settings.motion);
    html.setAttribute("data-gmfn-density", settings.density);
    html.setAttribute("data-gmfn-tone", settings.tonePreset);
    html.setAttribute("data-gmfn-text-size", settings.textSize);

    html.style.setProperty("--gmfn-workspace-accent", theme.accent);
    html.style.setProperty("--gmfn-workspace-page", theme.page);
    html.style.setProperty("--gmfn-workspace-text", theme.text);
    html.style.setProperty(
      "--gmfn-workspace-density-scale",
      settings.density === "compact" ? "0.94" : "1"
    );
    html.style.setProperty(
      "--gmfn-workspace-text-scale",
      settings.textSize === "large" ? "1.08" : "1"
    );

    body.style.backgroundColor = theme.page;
    body.style.color = theme.text;

    const styleId = "gmfn-workspace-settings-bridge-style";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      html[data-gmfn-motion="reduced"] *,
      html[data-gmfn-motion="reduced"] *::before,
      html[data-gmfn-motion="reduced"] *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }

      html[data-gmfn-contrast="high"] img {
        filter: contrast(1.06) saturate(1.02);
      }

      html[data-gmfn-text-size="large"] {
        -webkit-text-size-adjust: 112%;
        text-size-adjust: 112%;
      }
    `;

    return () => {
      if (typeof document === "undefined") return;

      const currentHtml = document.documentElement;
      const currentBody = document.body;

      currentHtml.removeAttribute("data-gmfn-contrast");
      currentHtml.removeAttribute("data-gmfn-motion");
      currentHtml.removeAttribute("data-gmfn-density");
      currentHtml.removeAttribute("data-gmfn-tone");
      currentHtml.removeAttribute("data-gmfn-text-size");

      currentHtml.style.removeProperty("--gmfn-workspace-accent");
      currentHtml.style.removeProperty("--gmfn-workspace-page");
      currentHtml.style.removeProperty("--gmfn-workspace-text");
      currentHtml.style.removeProperty("--gmfn-workspace-density-scale");
      currentHtml.style.removeProperty("--gmfn-workspace-text-scale");

      currentBody.style.backgroundColor = "";
      currentBody.style.color = "";
    };
  }, [settings, theme]);

  return null;
}