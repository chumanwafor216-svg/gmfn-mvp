function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

export function normalizeWhatsAppRecipient(value: unknown): string {
  const raw = cleanText(value);
  if (!raw) return "";

  const compact = raw.replace(/[^\d+]/g, "");
  if (!compact) return "";

  if (compact.startsWith("+")) {
    return compact.slice(1).replace(/\D/g, "");
  }

  if (compact.startsWith("00")) {
    return compact.slice(2).replace(/\D/g, "");
  }

  const digits = compact.replace(/\D/g, "");
  if (/^07\d{9}$/.test(digits)) {
    return `44${digits.slice(1)}`;
  }

  if (/^7\d{9}$/.test(digits)) {
    return `44${digits}`;
  }

  return digits;
}

export function buildWhatsAppChatUrl(
  recipient: unknown,
  message: string
): string {
  const phone = normalizeWhatsAppRecipient(recipient);
  if (!phone) return "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(cleanText(message))}`;
}
