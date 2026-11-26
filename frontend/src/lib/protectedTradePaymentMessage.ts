export const SELLER_PAYMENT_MESSAGE_TITLE = "GSN seller payment details";

export type SellerPaymentMessage = {
  itemTitle: string;
  amount: string;
  currency: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  sortCode?: string;
  paymentReference: string;
  tradeCode?: string;
};

function singleLine(value: unknown): string {
  return String(value ?? "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

export function serializeSellerPaymentMessage(details: SellerPaymentMessage): string {
  const itemTitle = singleLine(details.itemTitle);
  const amount = singleLine(details.amount);
  const currency = singleLine(details.currency).toUpperCase();
  const accountName = singleLine(details.accountName);
  const accountNumber = singleLine(details.accountNumber);
  const bankName = singleLine(details.bankName);
  const sortCode = singleLine(details.sortCode);
  const paymentReference = singleLine(details.paymentReference);
  const tradeCode = singleLine(details.tradeCode);

  if (!itemTitle || !amount || !currency || !accountName || !accountNumber || !bankName || !paymentReference) {
    throw new Error("Complete seller payment details are required before sending.");
  }

  return [
    SELLER_PAYMENT_MESSAGE_TITLE,
    `Item: ${itemTitle}`,
    `Amount: ${currency} ${amount}`,
    `Account name: ${accountName}`,
    `Account number: ${accountNumber}`,
    `Bank / wallet: ${bankName}`,
    sortCode ? `Sort code: ${sortCode}` : "",
    `Payment code: ${paymentReference}`,
    tradeCode ? `Protected Trade: ${tradeCode}` : "",
    "Use the payment code as the bank transfer reference.",
    "Payment goes directly to the seller. GSN does not hold or automatically verify the money.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseSellerPaymentMessage(value: unknown): SellerPaymentMessage | null {
  const lines = String(value ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines[0] !== SELLER_PAYMENT_MESSAGE_TITLE) return null;

  const field = (label: string) => {
    const prefix = `${label}:`;
    const line = lines.find((candidate) => candidate.startsWith(prefix));
    return line ? line.slice(prefix.length).trim() : "";
  };
  const amountLine = field("Amount");
  const amountMatch = amountLine.match(/^([A-Za-z]{3,8})\s+(.+)$/);
  const parsed: SellerPaymentMessage = {
    itemTitle: field("Item"),
    amount: amountMatch?.[2]?.trim() || "",
    currency: amountMatch?.[1]?.trim().toUpperCase() || "",
    accountName: field("Account name"),
    accountNumber: field("Account number"),
    bankName: field("Bank / wallet"),
    sortCode: field("Sort code") || undefined,
    paymentReference: field("Payment code"),
    tradeCode: field("Protected Trade") || undefined,
  };

  return parsed.itemTitle && parsed.amount && parsed.currency && parsed.accountName &&
    parsed.accountNumber && parsed.bankName && parsed.paymentReference
    ? parsed
    : null;
}
