const SLICE_STATUS_LABELS: Record<string, string> = {
  activated: "not activated yet",
  approved: "not approved yet",
  calculated: "not calculated yet",
  changed: "not changed yet",
  configured: "not configured yet",
  connected: "not connected yet",
  created: "not created yet",
  downloaded: "not downloaded yet",
  enforced: "not enforced yet",
  exposed: "not exposed",
  granted: "not granted yet",
  issued: "not issued yet",
  metered: "not measured yet",
  moved: "not moved yet",
  persisted: "not saved yet",
  published: "not published yet",
  recorded: "not recorded yet",
  released: "not released yet",
  sent: "not sent yet",
  transferred: "not transferred yet",
  uploaded: "not uploaded yet",
  written: "not written yet",
};

export function humanStatus(value: unknown, fallback = "not recorded"): string {
  const normalized = String(value ?? "").trim().replace(/_/g, " ") || fallback;
  const sliceMatch = normalized.match(/^not\s+([a-z]+)\s+in\s+this\s+slice$/i);
  if (!sliceMatch) {
    return normalized;
  }
  const action = sliceMatch[1]?.toLowerCase() || "";
  return SLICE_STATUS_LABELS[action] || `not ${action} yet`;
}
