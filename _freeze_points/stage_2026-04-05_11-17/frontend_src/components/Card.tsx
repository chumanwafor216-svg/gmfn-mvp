import type { ReactNode } from "react";

export function Card(props: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        background: "#fff",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <h3 style={{ margin: 0, marginBottom: 10, fontSize: 16 }}>{props.title}</h3>
      {props.children}
    </div>
  );
}

export function Badge(props: { text: string; tone?: "ok" | "warn" | "error" | "neutral" }) {
  const tone = props.tone ?? "neutral";
  const bg =
    tone === "ok"
      ? "#dcfce7"
      : tone === "warn"
      ? "#fef9c3"
      : tone === "error"
      ? "#fee2e2"
      : "#e5e7eb";

  const fg =
    tone === "ok"
      ? "#166534"
      : tone === "warn"
      ? "#854d0e"
      : tone === "error"
      ? "#991b1b"
      : "#111827";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        background: bg,
        color: fg,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {props.text}
    </span>
  );
} 
