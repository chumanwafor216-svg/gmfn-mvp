export function paymentRecordStatusLabel(status: unknown): string {
  const value = String(status ?? "").trim().toLowerCase();

  if (value === "expected" || value === "pending") return "Waiting for payment";
  if (value === "declared" || value === "submitted") return "Sent for checking";
  if (value === "pending_match") return "Waiting to be matched";
  if (value === "mismatch_flagged") return "Payment needs checking";
  if (value === "partial") return "Part payment confirmed";
  if (value === "matched" || value === "reconciled" || value === "confirmed") {
    return "Payment confirmed";
  }
  if (value === "cancelled" || value === "canceled") return "Cancelled";
  return "Payment record available";
}

export function supportRecordStatusLabel(status: unknown): string {
  const value = String(status ?? "").trim().toLowerCase();

  if (value === "pending") return "Waiting for supporters";
  if (value === "incomplete") return "More support needed";
  if (value === "approved") return "Support recorded";
  if (value === "disbursed") return "Money sent";
  if (value === "active") return "Repayment active";
  if (value === "repaid") return "Repaid";
  if (value === "rejected") return "Not approved";
  if (value === "declined") return "Declined";
  if (value === "cancelled" || value === "canceled") return "Cancelled";
  return "Needs review";
}
