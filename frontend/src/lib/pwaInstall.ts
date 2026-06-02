type BeforeInstallPromptChoice = {
  outcome?: "accepted" | "dismissed" | string;
  platform?: string;
};

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<BeforeInstallPromptChoice>;
};

const installListeners = new Set<() => void>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let supportRegistered = false;
let installedThisSession = false;

function notifyInstallListeners(): void {
  installListeners.forEach((listener) => listener());
}

export function isGsnStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;

  const standaloneMatch = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const fullscreenMatch = window.matchMedia?.("(display-mode: fullscreen)")?.matches;
  const navigatorStandalone = Boolean((window.navigator as any)?.standalone);

  return Boolean(standaloneMatch || fullscreenMatch || navigatorStandalone);
}

export function hasNativeInstallPrompt(): boolean {
  return Boolean(deferredPrompt);
}

export function wasInstalledThisSession(): boolean {
  return installedThisSession;
}

export function isIosManualInstallTarget(): boolean {
  if (typeof window === "undefined") return false;

  const platform = String(window.navigator?.platform || "").toLowerCase();
  const userAgent = String(window.navigator?.userAgent || "").toLowerCase();
  const maxTouchPoints = Number(window.navigator?.maxTouchPoints || 0);

  return (
    /iphone|ipad|ipod/.test(userAgent) ||
    (platform === "macintel" && maxTouchPoints > 1)
  );
}

export function subscribePwaInstall(listener: () => void): () => void {
  installListeners.add(listener);

  return () => {
    installListeners.delete(listener);
  };
}

export function registerPwaInstallSupport(): void {
  if (supportRegistered || typeof window === "undefined") return;
  supportRegistered = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notifyInstallListeners();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installedThisSession = true;
    notifyInstallListeners();
  });
}

export async function promptGsnInstall(): Promise<BeforeInstallPromptChoice | null> {
  const promptEvent = deferredPrompt;
  if (!promptEvent) return null;

  await promptEvent.prompt();

  const choice = await promptEvent.userChoice.catch(() => null);
  deferredPrompt = null;
  notifyInstallListeners();

  return choice;
}

export function registerGsnServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Install support is helpful, but it must never block the app.
    });
  });
}
