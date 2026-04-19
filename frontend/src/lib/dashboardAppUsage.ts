export type AppUseRecord = {
  key: string;
  label: string;
  detail: string;
  to: string;
  count: number;
  lastOpenedAt: string;
};

export const DASHBOARD_APP_USAGE_STORAGE_KEY = "gmfn.dashboard.app-usage.v2";
const DASHBOARD_APP_USAGE_RECENT_KEY = "gmfn.dashboard.app-usage.recent.v1";
const DASHBOARD_APP_USAGE_DEDUPE_MS = 1500;

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function pathOnly(value: string): string {
  const raw = safeStr(value);
  return raw.split("?")[0].split("#")[0] || "/";
}

function isoNow(): string {
  return new Date().toISOString();
}

function shouldSkipImmediateDuplicate(
  next: Pick<AppUseRecord, "key" | "to">
): boolean {
  try {
    if (typeof window === "undefined") return false;

    const raw = window.sessionStorage.getItem(DASHBOARD_APP_USAGE_RECENT_KEY);
    const current = Date.now();
    const signature = `${safeStr(next.key)}::${pathOnly(next.to)}`;

    if (raw) {
      const parsed = JSON.parse(raw);
      const previousSignature = safeStr(parsed?.signature);
      const previousAt = Number(parsed?.at || 0);

      if (
        previousSignature === signature &&
        previousAt > 0 &&
        current - previousAt < DASHBOARD_APP_USAGE_DEDUPE_MS
      ) {
        return true;
      }
    }

    window.sessionStorage.setItem(
      DASHBOARD_APP_USAGE_RECENT_KEY,
      JSON.stringify({
        signature,
        at: current,
      })
    );
  } catch {
    return false;
  }

  return false;
}

export function sortAppUsageRows(rows: AppUseRecord[]): AppUseRecord[] {
  return [...rows].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;

    const dateCompare = safeStr(b.lastOpenedAt).localeCompare(
      safeStr(a.lastOpenedAt)
    );
    if (dateCompare !== 0) return dateCompare;

    return safeStr(a.label).localeCompare(safeStr(b.label));
  });
}

export function readDashboardAppUsage(): AppUseRecord[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(DASHBOARD_APP_USAGE_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return sortAppUsageRows(
      parsed
        .map((row) => ({
          key: safeStr(row?.key),
          label: safeStr(row?.label),
          detail: safeStr(row?.detail),
          to: safeStr(row?.to),
          count: Number(row?.count || 0),
          lastOpenedAt: safeStr(row?.lastOpenedAt),
        }))
        .filter((row) => row.key && row.label && row.to && row.count > 0)
    );
  } catch {
    return [];
  }
}

export function writeDashboardAppUsage(rows: AppUseRecord[]): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      DASHBOARD_APP_USAGE_STORAGE_KEY,
      JSON.stringify(sortAppUsageRows(rows))
    );
  } catch {
    // ignore
  }
}

export function trackDashboardAppUsage(
  rows: AppUseRecord[],
  next: Pick<AppUseRecord, "key" | "label" | "detail" | "to">
): AppUseRecord[] {
  const copy = [...rows];
  const index = copy.findIndex((row) => row.key === next.key);

  if (index >= 0) {
    copy[index] = {
      ...copy[index],
      label: next.label,
      detail: next.detail,
      to: next.to,
      count: Number(copy[index].count || 0) + 1,
      lastOpenedAt: isoNow(),
    };
    return sortAppUsageRows(copy);
  }

  copy.push({
    ...next,
    count: 1,
    lastOpenedAt: isoNow(),
  });

  return sortAppUsageRows(copy);
}

export function recordDashboardAppUsage(
  next: Pick<AppUseRecord, "key" | "label" | "detail" | "to">
): void {
  if (shouldSkipImmediateDuplicate(next)) return;

  const current = readDashboardAppUsage();
  const updated = trackDashboardAppUsage(current, next);
  writeDashboardAppUsage(updated);
}

export function getDashboardAppUsageEntryFromLocation(
  pathname: string,
  search = ""
): Pick<AppUseRecord, "key" | "label" | "detail" | "to"> | null {
  const path = pathOnly(pathname);
  const query = safeStr(search).toLowerCase();

  if (path === "/app/community" || path.startsWith("/app/community/")) {
    return {
      key: "community",
      label: "Community",
      detail: "Your community page.",
      to: "/app/community",
    };
  }

  if (path === "/app/marketplace") {
    return {
      key: "marketplace",
      label: "Marketplace",
      detail: "Your community marketplace page.",
      to: "/app/marketplace",
    };
  }

  if (
    path === "/app/loans" ||
    path === "/app/loan-readiness" ||
    path === "/app/loan-suggestions" ||
    path === "/app/loan-workbench" ||
    path === "/app/guarantor-earnings" ||
    path === "/app/repayment"
  ) {
    return {
      key: "support",
      label: "Loans & Support",
      detail: "Loans, readiness, suggestions, workbench, and support paths.",
      to: "/app/loans",
    };
  }

  if (path === "/app/finance") {
    return {
      key: "finance",
      label: "Finance",
      detail: "Pool, locks, support, and money events.",
      to: "/app/finance",
    };
  }

  if (path === "/app/payment/pool" || path === "/app/payment-rails") {
    return {
      key: "money-in",
      label: "Money In",
      detail: "Add money into the pool path.",
      to: "/app/payment/pool",
    };
  }

  if (
    path === "/app/withdrawal-instructions" ||
    path === "/app/payout-details"
  ) {
    return {
      key: "money-out",
      label: "Money Out",
      detail: "Open the clean money-out route.",
      to: "/app/withdrawal-instructions",
    };
  }

  if (path === "/app/notifications") {
    return {
      key: "notifications",
      label: "What Matters Now",
      detail: "Organised live actions and next priorities.",
      to: "/app/notifications",
    };
  }

  if (path === "/app/shop-control" || path === "/app/shop-assets") {
    return {
      key: "shop",
      label: "Shop",
      detail: "Your public trade page and shop controls.",
      to: "/app/shop-control",
    };
  }

  if (path.startsWith("/app/shop/")) {
    return {
      key: "shop",
      label: "Shop",
      detail: "Your public trade page and shop controls.",
      to: path,
    };
  }

  if (path === "/app/trust") {
    return {
      key: "trust",
      label: "Trust",
      detail: "Read trust movement and repair paths.",
      to: "/app/trust",
    };
  }

  if (path === "/app/identity") {
    return {
      key: "cci",
      label: "CCI",
      detail: "Cross-community integrity reading.",
      to: "/app/identity",
    };
  }

  if (path === "/app/trust-slip" || path.startsWith("/app/trust-slip/")) {
    return {
      key: "trust-slip",
      label: "TrustSlip",
      detail: "Portable verification for merchants and institutions.",
      to: "/app/trust-slip",
    };
  }

  if (path === "/app/demand-box") {
    return {
      key: "demand-box",
      label: "Demand Box",
      detail: "Your demand page.",
      to: "/app/demand-box",
    };
  }

  if (path === "/app/my-gmfn-and-i" || path === "/app/settings") {
    return {
      key: "guide",
      label: query.includes("tab=settings") ? "Settings" : "My GSN and I",
      detail: "Plain-language guide and settings path.",
      to: query.includes("tab=settings")
        ? "/app/my-gmfn-and-i?tab=settings"
        : "/app/my-gmfn-and-i",
    };
  }

  return null;
}
