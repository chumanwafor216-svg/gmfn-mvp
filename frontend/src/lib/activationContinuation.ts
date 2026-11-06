type ActivationContinuation = {
  requestId?: string;
  gmfnId?: string;
  statusToken?: string;
  activationToken?: string;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function key(kind: "request" | "gmfn", value: string): string {
  return `gsn_activation_continuation:${kind}:${value}`;
}

function keysFor(input: ActivationContinuation): string[] {
  const requestId = clean(input.requestId);
  const gmfnId = clean(input.gmfnId).toUpperCase();
  return [
    ...(requestId ? [key("request", requestId)] : []),
    ...(gmfnId ? [key("gmfn", gmfnId)] : []),
  ];
}

export function saveActivationContinuation(input: ActivationContinuation): void {
  if (typeof window === "undefined") return;
  const storageKeys = keysFor(input);
  if (!storageKeys.length) return;

  const statusToken = clean(input.statusToken);
  const activationToken = clean(input.activationToken);
  const base = {
    requestId: clean(input.requestId),
    gmfnId: clean(input.gmfnId).toUpperCase(),
    updatedAt: Date.now(),
  };

  storageKeys.forEach((storageKey) => {
    if (statusToken) {
      window.localStorage.setItem(storageKey, JSON.stringify({ ...base, statusToken }));
    }
    if (activationToken) {
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify({ ...base, activationToken })
      );
    }
  });
}

export function readActivationContinuation(
  input: Pick<ActivationContinuation, "requestId" | "gmfnId">
): ActivationContinuation {
  if (typeof window === "undefined") return {};
  const storageKeys = keysFor(input);
  for (const storageKey of storageKeys) {
    try {
      const status = JSON.parse(window.localStorage.getItem(storageKey) || "null") || {};
      const activation =
        JSON.parse(window.sessionStorage.getItem(storageKey) || "null") || {};
      if (status.statusToken || activation.activationToken) {
        return {
          requestId: clean(status.requestId || activation.requestId || input.requestId),
          gmfnId: clean(status.gmfnId || activation.gmfnId || input.gmfnId).toUpperCase(),
          statusToken: clean(status.statusToken),
          activationToken: clean(activation.activationToken),
        };
      }
    } catch {
      window.localStorage.removeItem(storageKey);
      window.sessionStorage.removeItem(storageKey);
    }
  }
  return {};
}

export function clearActivationContinuation(
  input: Pick<ActivationContinuation, "requestId" | "gmfnId">
): void {
  if (typeof window === "undefined") return;
  keysFor(input).forEach((storageKey) => {
    window.localStorage.removeItem(storageKey);
    window.sessionStorage.removeItem(storageKey);
  });
}
