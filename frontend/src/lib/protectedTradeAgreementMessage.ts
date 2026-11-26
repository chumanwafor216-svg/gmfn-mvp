export const PROTECTED_TRADE_AGREEMENT_TITLE = "GSN Trade Record agreement";

export type ProtectedTradeAgreementMessage = {
  tradeId: number;
  tradeCode: string;
  itemTitle: string;
  quantity: string;
  amount: string;
  currency: string;
  termsSummary: string;
  paymentTiming: "pay_now" | "deferred_credit";
};

function singleLine(value: unknown): string {
  return String(value ?? "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

export function serializeProtectedTradeAgreementMessage(
  details: ProtectedTradeAgreementMessage
): string {
  const tradeId = Number(details.tradeId || 0);
  const tradeCode = singleLine(details.tradeCode);
  const itemTitle = singleLine(details.itemTitle);
  const quantity = singleLine(details.quantity);
  const amount = singleLine(details.amount);
  const currency = singleLine(details.currency).toUpperCase();
  const termsSummary = singleLine(details.termsSummary);
  const paymentTiming = details.paymentTiming === "deferred_credit" ? "deferred_credit" : "pay_now";
  if (!tradeId || !tradeCode || !itemTitle || !quantity || !amount || !currency || !termsSummary) {
    throw new Error("Complete Trade Record agreement details are required.");
  }
  return [
    PROTECTED_TRADE_AGREEMENT_TITLE,
    `Trade ID: ${tradeId}`,
    `Trade code: ${tradeCode}`,
    `Item: ${itemTitle}`,
    `Quantity: ${quantity}`,
    `Amount: ${currency} ${amount}`,
    `Payment timing: ${paymentTiming}`,
    `Terms: ${termsSummary}`,
    "Buyer: accept or request changes before the trade continues.",
    "GSN records evidence but does not hold money or guarantee delivery.",
  ].join("\n");
}

export function parseProtectedTradeAgreementMessage(
  value: unknown
): ProtectedTradeAgreementMessage | null {
  const lines = String(value ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines[0] !== PROTECTED_TRADE_AGREEMENT_TITLE) return null;
  const field = (label: string) => {
    const prefix = `${label}:`;
    const line = lines.find((candidate) => candidate.startsWith(prefix));
    return line ? line.slice(prefix.length).trim() : "";
  };
  const amountLine = field("Amount");
  const amountMatch = amountLine.match(/^([A-Za-z]{3,8})\s+(.+)$/);
  const paymentTiming = field("Payment timing") === "deferred_credit" ? "deferred_credit" : "pay_now";
  const parsed: ProtectedTradeAgreementMessage = {
    tradeId: Number(field("Trade ID") || 0),
    tradeCode: field("Trade code"),
    itemTitle: field("Item"),
    quantity: field("Quantity"),
    amount: amountMatch?.[2]?.trim() || "",
    currency: amountMatch?.[1]?.trim().toUpperCase() || "",
    termsSummary: field("Terms"),
    paymentTiming,
  };
  return parsed.tradeId && parsed.tradeCode && parsed.itemTitle && parsed.quantity &&
    parsed.amount && parsed.currency && parsed.termsSummary ? parsed : null;
}