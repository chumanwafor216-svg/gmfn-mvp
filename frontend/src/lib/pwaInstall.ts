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
let serviceWorkerControllerReloading = false;
let installedThisSession = false;
let shellFreshnessRegistered = false;
let shellFreshnessChecking = false;

const SHELL_FRESHNESS_INTERVAL_MS = 5 * 60 * 1000;
const SHELL_RELOAD_SIGNATURE_KEY = "gsn.pwa.shellReloadSignature";
const SHELL_ASSET_PATTERN = /\/assets\/[^"'<> ]+\.(?:js|css)/g;

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

function signatureFromAssets(assets: string[]): string {
  return Array.from(new Set(assets)).sort().join("|");
}

function shellSignatureFromHtml(html: string): string {
  const matches = html.match(SHELL_ASSET_PATTERN) || [];
  return signatureFromAssets(matches);
}

function currentDocumentShellSignature(): string {
  if (typeof document === "undefined") return "";

  const assets: string[] = [];

  document.querySelectorAll<HTMLScriptElement>("script[src]").forEach((node) => {
    try {
      const url = new URL(node.src, window.location.origin);
      if (url.origin === window.location.origin && url.pathname.startsWith("/assets/")) {
        assets.push(url.pathname);
      }
    } catch {
      // Ignore non-standard script URLs.
    }
  });

  document
    .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]')
    .forEach((node) => {
      try {
        const url = new URL(node.href, window.location.origin);
        if (url.origin === window.location.origin && url.pathname.startsWith("/assets/")) {
          assets.push(url.pathname);
        }
      } catch {
        // Ignore non-standard stylesheet URLs.
      }
    });

  return signatureFromAssets(assets);
}

function reloadForFreshShell(latestSignature: string): void {
  try {
    if (window.sessionStorage?.getItem(SHELL_RELOAD_SIGNATURE_KEY) === latestSignature) {
      return;
    }
    window.sessionStorage?.setItem(SHELL_RELOAD_SIGNATURE_KEY, latestSignature);
  } catch {
    // Reload is still safe if session storage is blocked.
  }

  try {
    if ("caches" in window) {
      void window.caches.keys().then((keys) => {
        keys
          .filter((key) => key.startsWith("gsn-pwa-shell-"))
          .forEach((key) => {
            void window.caches.delete(key);
          });
      });
    }
  } catch {
    // Cache cleanup must never block the freshness reload.
  }

  window.location.reload();
}

async function checkForFreshInstalledShell(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!isGsnStandaloneDisplay()) return;
  if (document.visibilityState === "hidden") return;
  if (shellFreshnessChecking) return;

  const currentSignature = currentDocumentShellSignature();
  if (!currentSignature) return;

  shellFreshnessChecking = true;
  try {
    const response = await fetch(`/?gsn_shell_check=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        "Cache-Control": "no-cache",
      },
    });
    if (!response.ok) return;

    const latestSignature = shellSignatureFromHtml(await response.text());
    if (latestSignature && latestSignature !== currentSignature) {
      reloadForFreshShell(latestSignature);
    }
  } catch {
    // Installed shortcut freshness is helpful, but the app must still open offline.
  } finally {
    shellFreshnessChecking = false;
  }
}

function nudgeWaitingServiceWorker(registration: ServiceWorkerRegistration): void {
  try {
    registration.waiting?.postMessage({ type: "GSN_SKIP_WAITING" });
  } catch {
    // Some older mobile browsers ignore worker messages.
  }
}

function registerInstalledShellFreshnessChecks(
  registration: ServiceWorkerRegistration
): void {
  if (shellFreshnessRegistered || typeof window === "undefined") return;
  shellFreshnessRegistered = true;

  const requestFreshnessCheck = () => {
    void checkForFreshInstalledShell();
  };

  registration.addEventListener("updatefound", () => {
    const installingWorker = registration.installing;
    if (!installingWorker) return;

    installingWorker.addEventListener("statechange", () => {
      if (installingWorker.state === "installed") {
        nudgeWaitingServiceWorker(registration);
        requestFreshnessCheck();
      }
    });
  });

  window.addEventListener("pageshow", requestFreshnessCheck);
  window.addEventListener("focus", requestFreshnessCheck);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      requestFreshnessCheck();
    }
  });

  window.setInterval(requestFreshnessCheck, SHELL_FRESHNESS_INTERVAL_MS);
  requestFreshnessCheck();
}

export function registerGsnServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (serviceWorkerControllerReloading) return;
    serviceWorkerControllerReloading = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        nudgeWaitingServiceWorker(registration);
        registerInstalledShellFreshnessChecks(registration);
        void registration.update().catch(() => undefined);
      })
      .catch(() => {
        // Install support is helpful, but it must never block the app.
      });
  });
}
