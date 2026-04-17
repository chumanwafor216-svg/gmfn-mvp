// src/components/uiKit.tsx
import React from "react";

export function Card(props: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      className="gmfn-card"
      style={{
        padding: 14,
        ...props.style,
      }}
    >
      {props.children}
    </div>
  );
}

export function SoftCard(props: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <Card style={{ boxShadow: "none", ...props.style }}>{props.children}</Card>;
}

export function PageHeader(props: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 24, fontWeight: 1000 }}>{props.title}</div>
        {props.subtitle && <div className="gmfn-muted" style={{ marginTop: 2 }}>{props.subtitle}</div>}
      </div>
      {props.right}
    </div>
  );
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="gmfn-btn"
      style={{
        ...(props.style || {}),
      }}
    />
  );
}

export function ButtonPrimary(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="gmfn-btn gmfn-btn-primary"
      style={{
        ...(props.style || {}),
      }}
    />
  );
}

export function Pill(props: { kind: "blue" | "green" | "gray" | "red" | "gold"; children: React.ReactNode }) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    color: "#374151",
    whiteSpace: "normal",
    textAlign: "center",
  };
  const style =
    props.kind === "green"
      ? { ...base, color: "#065f46", background: "#ecfdf5", borderColor: "#a7f3d0" }
      : props.kind === "blue"
      ? { ...base, color: "#1e40af", background: "#eff6ff", borderColor: "#bfdbfe" }
      : props.kind === "red"
      ? { ...base, color: "#991b1b", background: "#fffafa", borderColor: "#fecaca" } // very light (no pink vibe)
      : props.kind === "gold"
      ? { ...base, color: "#92400e", background: "#fffbeb", borderColor: "#fde68a" }
      : base;

  return <span style={style}>{props.children}</span>;
}

/**
 * Alert — calm, professional banners (no “pink panic”)
 * kind:
 * - error: border red, background near-white
 * - info: blue border, pale blue bg
 * - warn: amber border, pale amber bg
 */
export function Alert(props: { kind?: "error" | "info" | "warn"; title?: string; children: React.ReactNode }) {
  const kind = props.kind || "info";

  const style: React.CSSProperties =
    kind === "error"
      ? { border: "1px solid #fecaca", background: "#fffafa", color: "#7f1d1d" }
      : kind === "warn"
      ? { border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e" }
      : { border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e40af" };

  return (
    <Card style={{ marginTop: 12, ...style }}>
      <div style={{ fontWeight: 1000 }}>{props.title || (kind === "error" ? "Issue" : kind === "warn" ? "Note" : "Info")}</div>
      <div style={{ marginTop: 8 }}>{props.children}</div>
    </Card>
  );
}

/**
 * Banner — for "Not Found", "Coming Soon", "Admin Only", etc.
 * This replaces random red/pink blocks everywhere.
 */
export function Banner(props: {
  kind: "not_found" | "coming_soon" | "admin_only" | "blocked";
  text?: string;
  details?: string;
}) {
  const { kind, text, details } = props;

  const map = {
    not_found: { k: "warn" as const, title: "Not available", defaultText: "This feature is not available in this build." },
    coming_soon: { k: "info" as const, title: "Coming soon", defaultText: "This section is being prepared." },
    admin_only: { k: "warn" as const, title: "Admin only", defaultText: "You need admin access to view this." },
    blocked: { k: "error" as const, title: "Blocked", defaultText: "Action blocked. Please check permissions or status." },
  }[kind];

  return (
    <Alert kind={map.k} title={map.title}>
      <div style={{ fontWeight: 900 }}>{text || map.defaultText}</div>
      {details && <div className="gmfn-muted" style={{ marginTop: 6 }}>{details}</div>}
    </Alert>
  );
}

export function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: number;
  type?: string;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div className="gmfn-muted" style={{ fontWeight: 900 }}>{props.label}</div>
      <input
        type={props.type || "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          width: props.width ? props.width : undefined,
          background: "rgba(255,255,255,0.95)",
        }}
      />
    </div>
  );
}
