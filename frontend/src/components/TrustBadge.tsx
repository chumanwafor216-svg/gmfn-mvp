import { getContextualEvidencePosture } from "../lib/trustBandLanguage";

export default function TrustBadge({
  score,
  band,
}: {
  score: number;
  band?: string | null;
}) {
  const b = band ?? "-";
  const posture = getContextualEvidencePosture(score, b);

  const bg =
    b === "A"
      ? "#dcfce7"
      : b === "B"
      ? "#e0f2fe"
      : b === "C"
      ? "#fef9c3"
      : b === "D"
      ? "#fee2e2"
      : "#f3f4f6";

  const tooltip =
    `Trust evidence posture\n` +
    `Posture: ${posture.label}\n\n` +
    `${posture.boundary}\n` +
    `Computed from logged actions (TrustEvents): invites, support actions, repayments, participation.\n` +
    `See the Trust page for the evidence behind this reading.`;

  return (
    <span
      title={tooltip}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 10px",
        borderRadius: 999,
        background: bg,
        fontSize: 12,
        fontWeight: 800,
        cursor: "help",
        userSelect: "none",
      }}
    >
      {posture.shortLabel}
      <span style={{ fontSize: 12, opacity: 0.7 }}>i</span>
    </span>
  );
}
