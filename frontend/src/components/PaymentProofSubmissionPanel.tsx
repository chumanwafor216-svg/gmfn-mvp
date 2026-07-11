import React, { useEffect, useMemo, useState } from "react";
import { PrimaryButton, SecondaryButton } from "./StableButton";
import { uploadPaymentInstructionProofFile } from "../lib/api";
import {
  brandActionButton,
  brandBadge,
  brandHelperText,
  brandInnerCard,
  brandSectionLabel,
  gmfnBrand,
} from "../styles/gmfnBrand";

type NoticeTone = "success" | "error" | "info";

export type PaymentProofExpectedPayment = {
  id?: number | string | null;
  clan_id?: number | string | null;
  amount?: string | number | null;
  currency?: string | null;
  reference_display?: string | null;
  reference?: string | null;
  status?: string | null;
  payment_stage?: string | null;
  payment_status_label?: string | null;
  bank_authentication_guidance?: string | null;
  confirmed_at?: string | null;
  matched_bank_event_id?: number | string | null;
  bank_event_id?: number | string | null;
  meta?: any;
  meta_json?: any;
};

type Props = {
  payment?: PaymentProofExpectedPayment | null;
  clanId?: number | string | null;
  title?: string;
  compact?: boolean;
  debugIdPrefix?: string;
  onUploaded?: (payment: PaymentProofExpectedPayment) => void | Promise<void>;
  onNotice?: (tone: NoticeTone, message: string) => void;
};

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function firstTruthy(...values: unknown[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function safeMeta(payment?: PaymentProofExpectedPayment | null): Record<string, any> {
  const raw = payment?.meta ?? payment?.meta_json ?? {};
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

function safeDateTime(value: unknown): string {
  const raw = safeStr(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return raw;
  try {
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return raw;
  }
}

function paymentIsConfirmed(payment?: PaymentProofExpectedPayment | null): boolean {
  const status = safeStr(payment?.status).toLowerCase();
  return Boolean(payment?.confirmed_at) || status === "confirmed" || status === "applied";
}

function paymentStatusLabel(payment?: PaymentProofExpectedPayment | null): string {
  const direct = firstTruthy(payment?.payment_status_label);
  if (direct) return direct;

  const status = safeStr(payment?.status).toLowerCase();
  if (status === "confirmed" || status === "applied") return "Completed";
  if (status === "partial") return "Partially confirmed";
  if (status === "failed" || status === "defaulted") return "Failed";
  if (status === "cancelled" || status === "canceled") return "Cancelled";
  if (status === "expired") return "Expired";
  if (status === "expected") return "Pending authentication";
  return firstTruthy(payment?.status, "Waiting for bank");
}

export default function PaymentProofSubmissionPanel({
  payment,
  clanId,
  title = "Payment proof",
  compact = false,
  debugIdPrefix = "payment-proof",
  onUploaded,
  onNotice,
}: Props) {
  const meta = useMemo(() => safeMeta(payment), [payment]);
  const initialReference = firstTruthy(
    payment?.reference_display,
    payment?.reference,
    meta.payment_reference
  );
  const resolvedClanId = Number(clanId || payment?.clan_id || meta.clan_id || 0);
  const expectedPaymentId = Number(payment?.id || 0);
  const confirmed = paymentIsConfirmed(payment);
  const matched = Boolean(payment?.matched_bank_event_id || payment?.bank_event_id);
  const statusLabel = paymentStatusLabel(payment);
  const authGuidance = firstTruthy(
    payment?.bank_authentication_guidance,
    "Your bank may require app approval, SMS OTP, a one-time code, a code generator, or biometric confirmation before the transfer completes. Complete that with your banking provider; GSN only confirms this payment after the bank/provider match is received."
  );
  const latestProof = meta.latest_payment_proof || {};
  const latestProofName = firstTruthy(latestProof.original_filename, latestProof.stored_filename);
  const latestProofAt = safeDateTime(latestProof.submitted_at || meta.proof_submitted_at);
  const proofStatusText = firstTruthy(
    meta.proof_status_text,
    latestProofName ? "Submitted for finance review" : ""
  );

  const [reference, setReference] = useState(initialReference);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [localMessage, setLocalMessage] = useState<{ tone: NoticeTone; text: string } | null>(null);

  useEffect(() => {
    setReference(initialReference);
  }, [initialReference]);

  function show(tone: NoticeTone, text: string) {
    setLocalMessage({ tone, text });
    onNotice?.(tone, text);
  }

  async function submitProof() {
    if (confirmed) {
      show("info", "Payment is already finance-confirmed.");
      return;
    }
    if (!expectedPaymentId || !resolvedClanId || !initialReference) {
      show("error", "This payment code is missing the system payment id, community id, or reference.");
      return;
    }
    if (!file) {
      show("error", "Choose a JPG, PNG, WEBP, or PDF proof first.");
      return;
    }
    const submittedReference = safeStr(reference);
    if (!submittedReference) {
      show("error", "Enter the payment code used in the bank transfer.");
      return;
    }

    setBusy(true);
    try {
      const updated = await uploadPaymentInstructionProofFile(
        expectedPaymentId,
        file,
        resolvedClanId,
        submittedReference
      );
      setFile(null);
      show("success", "Proof uploaded for finance review. This does not confirm payment yet.");
      await onUploaded?.(updated as PaymentProofExpectedPayment);
    } catch (err: any) {
      show(
        "error",
        safeStr(err?.message) ||
          "Proof upload failed. The payment still needs finance review or a bank match."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!payment) return null;

  const messageTone = localMessage?.tone === "error" ? "error" : localMessage?.tone === "success" ? "success" : "info";

  return (
    <div
      style={{
        marginTop: 12,
        ...brandInnerCard("linear-gradient(180deg, #FFFFFF 0%, #F7FBFF 100%)"),
        border: `1px solid ${confirmed ? "rgba(46,155,98,0.22)" : "rgba(201,154,39,0.22)"}`,
      }}
    >
      <div style={brandSectionLabel()}>{title}</div>
      <div style={{ marginTop: 8, ...brandHelperText(), fontWeight: 760 }}>
        After bank transfer, upload the receipt or screenshot here. If your bank asks for extra authentication, complete it in your banking app or provider channel first. Finance still has to match or review the payment before it becomes confirmed.
      </div>

      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <span style={brandBadge(confirmed)}>Payment: {confirmed ? "Completed" : statusLabel}</span>
        <span style={brandBadge(matched)}>Bank match: {matched ? "Found" : "Waiting"}</span>
        <span style={brandBadge(Boolean(latestProofName))}>
          Proof: {latestProofName ? "Submitted" : "Not uploaded"}
        </span>
      </div>

      {!confirmed ? (
        <div
          style={{
            marginTop: 10,
            borderRadius: 14,
            border: "1px solid rgba(201,154,39,0.22)",
            background: "#FFF8E6",
            color: "#6F4E00",
            padding: "9px 10px",
            fontSize: 13,
            fontWeight: 820,
            lineHeight: 1.4,
          }}
        >
          {authGuidance}
        </div>
      ) : null}

      {latestProofName || proofStatusText ? (
        <div
          style={{
            marginTop: 10,
            borderRadius: 14,
            border: "1px solid rgba(46,155,98,0.18)",
            background: "#F3FBF5",
            color: "#166534",
            padding: "9px 10px",
            fontSize: 13,
            fontWeight: 850,
            lineHeight: 1.4,
          }}
        >
          {proofStatusText || "Submitted for finance review"}
          {latestProofName ? `: ${latestProofName}` : ""}
          {latestProofAt ? ` at ${latestProofAt}` : ""}
        </div>
      ) : null}

      {!confirmed ? (
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 10,
            alignItems: "end",
          }}
        >
          <label style={{ display: "block", minWidth: 0 }}>
            <div style={{ ...brandSectionLabel(), fontSize: 11 }}>Payment code used</div>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder={initialReference || "Paste payment code"}
              style={{
                marginTop: 6,
                width: "100%",
                minHeight: 46,
                borderRadius: 14,
                border: `1px solid ${gmfnBrand.colors.lineStrong}`,
                background: "#FFFFFF",
                color: gmfnBrand.colors.ink,
                padding: "0 12px",
                fontWeight: 850,
                boxSizing: "border-box",
                minWidth: 0,
              }}
            />
          </label>

          <label
            htmlFor={`${debugIdPrefix}-file`}
            data-gmfn-action-root="true"
            data-cta-id={`${debugIdPrefix}.choose-file`}
            className="gmfn-stable-action"
            style={{
              ...brandActionButton("secondary", busy),
              minHeight: 46,
              width: "100%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {file ? file.name : "Choose proof file"}
          </label>
          <input
            id={`${debugIdPrefix}-file`}
            type="file"
            accept="image/*,.pdf"
            disabled={busy}
            data-gmfn-field="true"
            data-cta-id={`${debugIdPrefix}.file-input`}
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: "none",
            }}
          />

          <PrimaryButton
            type="button"
            onClick={() => void submitProof()}
            disabled={busy || !file}
            busy={busy}
            busyLabel="Uploading proof..."
            fullWidth
            stableHeight={50}
            debugId={`${debugIdPrefix}.submit`}
            style={{
              ...brandActionButton("primary", busy || !file),
              gridColumn: compact ? "1" : "1 / -1",
            }}
          >
            {busy ? "Uploading proof..." : "Submit proof for finance review"}
          </PrimaryButton>
        </div>
      ) : (
        <SecondaryButton
          type="button"
          disabled
          fullWidth
          stableHeight={46}
          debugId={`${debugIdPrefix}.confirmed`}
          style={{ ...brandActionButton("soft", true), marginTop: 12 }}
        >
          Finance confirmed
        </SecondaryButton>
      )}

      {localMessage ? (
        <div
          style={{
            marginTop: 10,
            borderRadius: 14,
            border:
              messageTone === "error"
                ? "1px solid rgba(153,27,27,0.18)"
                : messageTone === "success"
                  ? "1px solid rgba(46,155,98,0.18)"
                  : "1px solid rgba(12,79,168,0.18)",
            background:
              messageTone === "error"
                ? "#FEF2F2"
                : messageTone === "success"
                  ? "#F3FBF5"
                  : "#F3F8FF",
            color:
              messageTone === "error"
                ? "#991B1B"
                : messageTone === "success"
                  ? "#166534"
                  : gmfnBrand.colors.inkSoft,
            padding: "9px 10px",
            fontSize: 13,
            fontWeight: 850,
            lineHeight: 1.4,
          }}
        >
          {localMessage.text}
        </div>
      ) : null}
    </div>
  );
}
