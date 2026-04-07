import * as api from "./api";

export type CommunityMoneyRoute = {
  title: string;
  detail: string;
  status: string;
  reference: string;
  currency: string;
  minAmount: string;
  maxAmount: string;
  updatedAt: string;
};

export type CommunitySettlementDestination = {
  destinationName: string;
  bankName: string;
  accountNumber: string;
  phoneNumber: string;
  note: string;
};

export type CommunityMoneySurface = {
  clanId: number;
  gmfnId: string;
  poolAmount: string;
  poolCurrency: string;
  depositRoute: CommunityMoneyRoute | null;
  withdrawalRoute: CommunityMoneyRoute | null;
  settlementDestination: CommunitySettlementDestination;
};

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

async function callFirstAvailable<T = any>(
  names: string[],
  argsSets: any[][]
): Promise<T | null> {
  for (const name of names) {
    const fn = (api as any)[name];
    if (typeof fn !== "function") continue;

    for (const args of argsSets) {
      try {
        const result = await fn(...args);
        if (result) return result as T;
      } catch {
        // try next signature
      }
    }
  }

  return null;
}

function getPoolAmountText(payload: any): string {
  const candidates = [
    payload?.available_balance,
    payload?.balance,
    payload?.pool_balance,
    payload?.summary?.available_balance,
    payload?.summary?.balance,
    payload?.totals?.available_balance,
    payload?.totals?.balance,
    payload?.wallet_balance,
  ];

  for (const candidate of candidates) {
    const text = safeStr(candidate);
    if (text) return text;
  }

  return "—";
}

function getPoolCurrency(payload: any): string {
  return firstTruthy(
    payload?.currency,
    payload?.summary?.currency,
    payload?.totals?.currency,
    "NGN"
  );
}

function normalizeSettlementDestination(raw: any): CommunitySettlementDestination {
  const src = raw?.item || raw?.destination || raw?.data || raw || {};

  return {
    destinationName: firstTruthy(
      src?.destination_name,
      src?.account_name,
      src?.name
    ),
    bankName: firstTruthy(src?.bank_name, src?.bank, src?.institution_name),
    accountNumber: firstTruthy(
      src?.account_number,
      src?.bank_account_number,
      src?.number
    ),
    phoneNumber: firstTruthy(
      src?.phone_number,
      src?.phone,
      src?.mobile_number
    ),
    note: firstTruthy(src?.note, src?.description, src?.memo),
  };
}

function normalizeMoneyRoute(raw: any): CommunityMoneyRoute | null {
  if (!raw) return null;

  const src = raw?.item || raw?.route || raw?.instruction || raw?.data || raw;

  const detail = [
    firstTruthy(src?.detail, src?.message, src?.instruction_text),
    firstTruthy(src?.account_name ? `Account name: ${src.account_name}` : ""),
    firstTruthy(src?.bank_name ? `Bank: ${src.bank_name}` : ""),
    firstTruthy(src?.account_number ? `Account number: ${src.account_number}` : ""),
    firstTruthy(src?.reference ? `Reference: ${src.reference}` : ""),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    title: firstTruthy(
      src?.title,
      src?.instruction_title,
      "Money route instructions"
    ),
    detail: detail || "Route loaded.",
    status: firstTruthy(src?.status, src?.state, "ready"),
    reference: firstTruthy(src?.reference, src?.withdrawal_reference),
    currency: firstTruthy(src?.currency, src?.currency_code, "NGN"),
    minAmount: firstTruthy(src?.min_amount, src?.minimum_amount),
    maxAmount: firstTruthy(src?.max_amount, src?.maximum_amount),
    updatedAt: firstTruthy(src?.updated_at, src?.created_at),
  };
}

function defaultDestination(): CommunitySettlementDestination {
  return {
    destinationName: "",
    bankName: "",
    accountNumber: "",
    phoneNumber: "",
    note: "",
  };
}

function destinationStorageKey(gmfnId: string, clanId: number): string {
  return `gmfn.money.destination.${gmfnId || "me"}.${clanId || 0}`;
}

function depositRouteStorageKey(gmfnId: string, clanId: number): string {
  return `gmfn.money.depositRoute.${gmfnId || "me"}.${clanId || 0}`;
}

function withdrawalRouteStorageKey(gmfnId: string, clanId: number): string {
  return `gmfn.money.withdrawalRoute.${gmfnId || "me"}.${clanId || 0}`;
}

function readLocalJSON<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJSON(key: string, value: any) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export async function loadCommunityDepositRoute(
  clanId: number,
  gmfnId: string
): Promise<CommunityMoneyRoute | null> {
  const routeRes = await callFirstAvailable(
    [
      "getPaymentInstructions",
      "getDepositInstructions",
      "getCommunityDepositInstructions",
      "getMyDepositRoute",
      "loadPaymentRoute",
      "requestPaymentInstructions",
      "requestDepositInstructions",
    ],
    [[{ clan_id: clanId || undefined, gmfn_id: gmfnId || undefined }], [clanId || undefined], []]
  );

  const normalized = normalizeMoneyRoute(routeRes);
  if (normalized) {
    writeLocalJSON(depositRouteStorageKey(gmfnId, clanId), normalized);
    return normalized;
  }

  return readLocalJSON<CommunityMoneyRoute | null>(
    depositRouteStorageKey(gmfnId, clanId),
    null
  );
}

export async function loadCommunityWithdrawalRoute(
  clanId: number,
  gmfnId: string
): Promise<CommunityMoneyRoute | null> {
  const routeRes = await callFirstAvailable(
    [
      "getWithdrawalInstructions",
      "getWithdrawalRoute",
      "getMyWithdrawalRoute",
      "loadWithdrawalRoute",
      "requestWithdrawalInstructions",
      "requestWithdrawalRoute",
    ],
    [[{ clan_id: clanId || undefined, gmfn_id: gmfnId || undefined }], [clanId || undefined], []]
  );

  const normalized = normalizeMoneyRoute(routeRes);
  if (normalized) {
    writeLocalJSON(withdrawalRouteStorageKey(gmfnId, clanId), normalized);
    return normalized;
  }

  return readLocalJSON<CommunityMoneyRoute | null>(
    withdrawalRouteStorageKey(gmfnId, clanId),
    null
  );
}

export async function getCommunitySettlementDestination(
  clanId: number,
  gmfnId: string
): Promise<CommunitySettlementDestination> {
  const destinationRes = await callFirstAvailable(
    [
      "getMyWithdrawalDestination",
      "getWithdrawalDestination",
      "getSettlementDestination",
      "getMySettlementDestination",
    ],
    [[{ clan_id: clanId || undefined, gmfn_id: gmfnId || undefined }], [clanId || undefined], []]
  );

  const local = readLocalJSON<CommunitySettlementDestination>(
    destinationStorageKey(gmfnId, clanId),
    defaultDestination()
  );

  const normalized = destinationRes
    ? {
        ...local,
        ...normalizeSettlementDestination(destinationRes),
      }
    : local;

  writeLocalJSON(destinationStorageKey(gmfnId, clanId), normalized);
  return normalized;
}

export async function saveCommunitySettlementDestination(
  clanId: number,
  gmfnId: string,
  destination: CommunitySettlementDestination
): Promise<CommunitySettlementDestination> {
  const payload = {
    clan_id: clanId || undefined,
    gmfn_id: gmfnId || undefined,
    destination_name: safeStr(destination.destinationName),
    bank_name: safeStr(destination.bankName),
    account_number: safeStr(destination.accountNumber),
    phone_number: safeStr(destination.phoneNumber),
    note: safeStr(destination.note),
  };

  const saved = await callFirstAvailable(
    [
      "saveWithdrawalDestination",
      "updateWithdrawalDestination",
      "saveSettlementDestination",
      "updateSettlementDestination",
      "setMyWithdrawalDestination",
    ],
    [[payload]]
  );

  const normalized = saved
    ? {
        ...destination,
        ...normalizeSettlementDestination(saved),
      }
    : destination;

  writeLocalJSON(destinationStorageKey(gmfnId, clanId), normalized);
  return normalized;
}

export async function getCommunityMoneySurface(
  clanId: number,
  gmfnId: string
): Promise<CommunityMoneySurface> {
  const poolRes =
    typeof (api as any).getPoolMe === "function"
      ? await (api as any).getPoolMe("NGN", 20).catch(() => null)
      : null;

  const [depositRoute, withdrawalRoute, settlementDestination] = await Promise.all([
    loadCommunityDepositRoute(clanId, gmfnId).catch(() => null),
    loadCommunityWithdrawalRoute(clanId, gmfnId).catch(() => null),
    getCommunitySettlementDestination(clanId, gmfnId).catch(() =>
      readLocalJSON<CommunitySettlementDestination>(
        destinationStorageKey(gmfnId, clanId),
        defaultDestination()
      )
    ),
  ]);

  return {
    clanId,
    gmfnId,
    poolAmount: getPoolAmountText(poolRes),
    poolCurrency: getPoolCurrency(poolRes),
    depositRoute,
    withdrawalRoute,
    settlementDestination,
  };
}