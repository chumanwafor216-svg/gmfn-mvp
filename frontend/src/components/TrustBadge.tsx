export default function TrustBadge({
  score,
  band,
}: {
  score: number;
  band?: string | null;
}) {
  const b = band ?? "-";

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
    `Trust band + score (explainable)\n` +
    `Band: ${b}\n` +
    `Score: ${score}/100\n\n` +
    `Bands: A=80-100, B=60-79, C=30-59, D=0-29\n` +
    `Computed from logged actions (TrustEvents): invites, support actions, repayments, participation.\n` +
    `Not a black box; see breakdown on the Trust page.`;

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
      {b} ({score})
      <span style={{ fontSize: 12, opacity: 0.7 }}>i</span>
    </span>
  );
}
