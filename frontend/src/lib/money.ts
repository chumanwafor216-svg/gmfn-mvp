// frontend/src/lib/money.ts
export function currencySymbol(code?: string) {
  const c = (code || "").toUpperCase();
  if (c === "NGN") return "₦";
  if (c === "GBP") return "£";
  if (c === "USD") return "$";
  if (c === "EUR") return "€";
  if (c === "GHS") return "₵";
  return "";
}

export function formatMoney(amount: number | null | undefined, currency?: string) {
  const n = Number(amount ?? 0);
  const sym = currencySymbol(currency);
  // keep it simple + stable
  return `${sym}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

// Trust score styling
export function scoreTone(score: number) {
  if (score >= 10) return "green";
  if (score >= 3) return "blue";
  if (score >= 0) return "gray";
  return "red";
}
