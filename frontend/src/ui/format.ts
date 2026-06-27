// src/ui/format.ts
export function safeStr(x: any): string {
  return (x ?? "").toString();
}

export function parseItems<T>(payload: any): T[] {
  if (!payload) return [];
  if (Array.isArray(payload?.items)) return payload.items as T[];
  if (Array.isArray(payload)) return payload as T[];
  return [];
}

export function moneyNum(s?: string | null): number {
  const n = Number((s ?? "").toString().trim());
  return Number.isFinite(n) ? n : 0;
}

export function fmtMoney(s?: string | null): string {
  const n = moneyNum(s);
  const fixed = n.toFixed(2);
  return fixed.replace(/\.00$/, "");
}

export function displayNameFromEmail(email?: string | null): string {
  const e = safeStr(email).trim();
  if (!e) return "Member";
  const head = e.split("@")[0] || "member";
  const pretty = head.replace(/[_\-.]+/g, " ").trim();
  if (!pretty) return "Member";
  return pretty.replace(/\b\w/g, (m) => m.toUpperCase());
}

export function maskedEmail(email?: string | null): string {
  const e = safeStr(email).trim();
  if (!e) return "member@gsn.example";
  const head = e.split("@")[0] || "member";
  const short = head.length <= 3 ? head : `${head.slice(0, 3)}...`;
  return `${short}@gsn.example`;
}
