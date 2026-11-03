export const GMFN_VISUAL_SETTINGS_EVENT = "gmfn:visual-settings-updated";
export const GMFN_COMPANION_SETTINGS_EVENT = "gmfn:companion-settings-updated";
export const GMFN_WORKSPACE_DATA_CHANGED_EVENT = "gmfn:workspace-data-changed";

export function emitVisualSettingsUpdated(payload: any): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(GMFN_VISUAL_SETTINGS_EVENT, {
      detail: payload,
    })
  );
}

export function emitCompanionSettingsUpdated(payload: any): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(GMFN_COMPANION_SETTINGS_EVENT, {
      detail: payload,
    })
  );
}

export function emitWorkspaceDataChanged(payload: any): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(GMFN_WORKSPACE_DATA_CHANGED_EVENT, {
      detail: payload,
    })
  );
}

export function subscribeVisualSettingsUpdated(
  listener: (payload: any) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<any>).detail;
    listener(detail);
  };

  window.addEventListener(GMFN_VISUAL_SETTINGS_EVENT, handler as EventListener);

  return () => {
    window.removeEventListener(
      GMFN_VISUAL_SETTINGS_EVENT,
      handler as EventListener
    );
  };
}

export function subscribeCompanionSettingsUpdated(
  listener: (payload: any) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<any>).detail;
    listener(detail);
  };

  window.addEventListener(
    GMFN_COMPANION_SETTINGS_EVENT,
    handler as EventListener
  );

  return () => {
    window.removeEventListener(
      GMFN_COMPANION_SETTINGS_EVENT,
      handler as EventListener
    );
  };
}

export function subscribeWorkspaceDataChanged(
  listener: (payload: any) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<any>).detail;
    listener(detail);
  };

  window.addEventListener(
    GMFN_WORKSPACE_DATA_CHANGED_EVENT,
    handler as EventListener
  );

  return () => {
    window.removeEventListener(
      GMFN_WORKSPACE_DATA_CHANGED_EVENT,
      handler as EventListener
    );
  };
}
