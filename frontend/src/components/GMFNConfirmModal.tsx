// src/components/GMFNConfirmModal.tsx
import { useState } from "react";

export type GMFNConfirmResult = {
  reason?: string;
  note?: string;
};

type TrustImpact = {
  min: number;
  max: number;
  note?: string;
};

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;

  trustImpact?: TrustImpact;
  communityImpact?: string;

  requireReason?: boolean;

  onClose: () => void;
  onConfirm: (result: GMFNConfirmResult) => Promise<void> | void;
};

export default function GMFNConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  trustImpact,
  communityImpact,
  requireReason = false,
  onClose,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleConfirm() {
    if (requireReason && !reason.trim()) {
      alert("Please provide a reason.");
      return;
    }

    setLoading(true);
    try {
      await onConfirm({
        reason: reason || undefined,
        note: note || undefined,
      });
      onClose();
      setReason("");
      setNote("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3>{title}</h3>

        {description && <p style={{ color: "#555" }}>{description}</p>}

        {trustImpact && (
  <div style={box}>
    <b>Trust impact (preview)</b>
    <div style={{ fontSize: 13, marginTop: 4 }}>
      Possible change: <b>{trustImpact.min}</b> to <b>{trustImpact.max}</b>
    </div>

    {trustImpact.note && (
      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
        {trustImpact.note}
      </div>
    )}
  </div>
)} 

        {communityImpact && (
          <div style={impactBox}>👥 {communityImpact}</div>
        )}

        <label style={label}>Reason</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional reason"
          style={input}
        />

        <label style={label}>Internal note (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Internal note (audit trail)"
          style={{ ...input, height: 70 }}
        />

        <div style={actions}>
          <button onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button onClick={handleConfirm} disabled={loading}>
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- styles ---------------- */

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modal: React.CSSProperties = {
  background: "#fff",
  padding: 20,
  width: 420,
  borderRadius: 12,
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
};

const actions: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 16,
};

const label: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  marginTop: 10,
  display: "block",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: 8,
  marginTop: 4,
};

const impactBox: React.CSSProperties = {
  marginTop: 10,
  padding: 8,
  background: "#f3f4f6",
  borderRadius: 6,
  fontSize: 13,
}; 
const box: React.CSSProperties = {
  marginTop: 12,
  padding: 10,
  background: "#fafafa",
  borderRadius: 8,
};
