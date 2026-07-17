const SLICE_STATUS_LABELS: Record<string, string> = {
  activated: "not activated yet",
  approved: "not approved yet",
  calculated: "not calculated yet",
  changed: "not changed yet",
  configured: "not set up yet",
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

const STATUS_LABELS: Record<string, string> = {
  "manual pilot quote only": "Manual quote only",
  "not automated": "Needs manual review",
  "pilot quote accepted": "Quote accepted",
  "pilot quote required": "Quote needed",
  "quote accepted": "Quote accepted",
  "quote pending": "Quote pending",
  "quote required": "Quote needed",
};

export function humanStatus(value: unknown, fallback = "not recorded"): string {
  const normalized =
    String(value ?? "")
      .trim()
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ") || fallback;
  const key = normalized.toLowerCase();
  if (STATUS_LABELS[key]) {
    return STATUS_LABELS[key];
  }
  if (key === "not configured") {
    return "not set up yet";
  }
  const sliceMatch = normalized.match(/^not\s+([a-z]+)\s+in\s+this\s+slice$/i);
  if (!sliceMatch) {
    return normalized;
  }
  const action = sliceMatch[1]?.toLowerCase() || "";
  return SLICE_STATUS_LABELS[action] || `not ${action} yet`;
}
