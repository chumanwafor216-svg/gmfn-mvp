import * as api from "./api";

export type CommunityMoneySettlement = {
  railName: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode: string;
  country: string;
  supportNote: string;
};

export type PaymentRail = {
  railCode: string;
  label: string;
  kind: string;
  status: string;
  supportsInbound: boolean;
  supportsOutbound: boolean;
  currencies: string[];
  settlement: CommunityMoneySettlement | null;
};

export type PaymentRailContext = {
  instructionType: string;
  currency: string;
  defaultRail: PaymentRail | null;
  availableRails: PaymentRail[];
};

export type CommunityMoneyRoute = {
  title: string;
  detail: string;
  status: string;
  reference: string;
  currency: string;
  minAmount: string;
  maxAmount: string;
  updatedAt: string;
  instructionType: string;
  settlement: CommunityMoneySettlement | null;
  railCode: string;
  railLabel: string;
  kind: string;
  availableRails: PaymentRail[];
};

export type CommunitySettlementDestination = {
  destinationName: string;
  bankName: string;
  accountNumber: string;
  phoneNumber: string;
  note: string;
};

export type CommunityPayoutDestination = CommunitySettlementDestination;

export type PaymentInstructionConfig = {
  settlement: CommunityMoneySettlement | null;
  availableInstructionTypes: string[];
};

export type GuarantorExposureSummary = {
  userId?: number | null;
  clanId?: number | null;
  totalLocked: string;
  totalReleased: string;
  activeGuarantees: number;
  historicalGuarantees: number;
  note: string;
};

export type ClanLiquiditySummary = {
  clanId?: number | null;
  clanName?: string | null;
  activeLoansCount?: number | null;
  pledgedTotal: string;
  lockedTotal: string;
  releasedTotal: string;
  note: string;
};

export type PoolStateSummary = {
  clanId?: number | null;
  userId?: number | null;
  currency: string;
  reservedPool: string;
  effectiveAvailable: string;
  availableBalance: string;
  pendingDeposits: string;
  pendingWithdrawals: string;
  reference: string;
  recentEvents: any[];
};

export type GeneratedPoolDepositInstruction = {
  expectedPaymentId?: number | null;
  poolEventId?: number | null;
  reference: string;
  amount: string;
  currency: string;
  settlement: CommunityMoneySettlement | null;
  instructionType: string;
};

export type PoolWithdrawalRequestPayload = {
  clanId: number;
  amount: string;
  currency: string;
  note?: string;
};

export type CommunityMoneySurface = {
  clanId: number;
  gmfnId: string;

  poolAmount: string;
  poolCurrency: string;
  effectiveAvailable: string;
  reservedPool: string;
  pendingDeposits: string;
  pendingWithdrawals: string;
  poolReference: string;
  recentPoolEvents: any[];

  communitySettlement: CommunityMoneySettlement | null;

  payoutDestination: CommunitySettlementDestination;
  settlementDestination: CommunitySettlementDestination;

  depositRailContext: PaymentRailContext | null;
  withdrawalRailContext: PaymentRailContext | null;

  depositRoute: CommunityMoneyRoute | null;
  withdrawalRoute: CommunityMoneyRoute | null;

  paymentInstructionConfig: PaymentInstructionConfig;
  guarantorExposure: GuarantorExposureSummary | null;
  clanLiquidity: ClanLiquiditySummary | null;
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

function parseMoneyNumber(value: any): number {
  const raw = safeStr(value).replace(/,/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";

  return String(raw || "").trim().replace(/\/+$/, "");
}

function buildHeaders(clanId?: number): Record<string, string> {
  const token =
    typeof (api as any).getAccessToken === "function"
      ? safeStr((api as any).getAccessToken())
      : "";

  const headers: Record<string, string> = {
    accept: "application/json",
  };

  if (clanId && Number.isFinite(Number(clanId)) && Number(clanId) > 0) {
    headers["X-Clan-Id"] = String(clanId);
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function fetchJson(path: string, clanId?: number): Promise<any | null> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "GET",
    headers: buildHeaders(clanId),
    credentials: "include",
  });

  const text = await res.text();
  let payload: any = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) {
    throw new Error(
      safeStr(payload?.detail) ||
        safeStr(payload?.message) ||
        `Request failed (${res.status})`
    );
  }

  return payload;
}

async function postJson(
  path: string,
  body: any,
  clanId?: number
): Promise<any | null> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: {
      ...buildHeaders(clanId),
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body || {}),
  });

  const text = await res.text();
  let payload: any = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) {
    throw new Error(
      safeStr(payload?.detail) ||
        safeStr(payload?.message) ||
        `Request failed (${res.status})`
    );
  }

  return payload;
}

function normalizeCommunitySettlement(raw: any): CommunityMoneySettlement | null {
  const src = raw?.settlement || raw?.item?.settlement || raw?.data?.settlement || raw;

  if (!src || typeof src !== "object") return null;

  const settlement: CommunityMoneySettlement = {
    railName: firstTruthy(src?.rail_name, src?.railName),
    bankName: firstTruthy(src?.bank_name, src?.bankName),
    accountName: firstTruthy(src?.account_name, src?.accountName),
    accountNumber: firstTruthy(src?.account_number, src?.accountNumber),
    sortCode: firstTruthy(src?.sort_code, src?.sortCode),
    country: firstTruthy(src?.country),
    supportNote: firstTruthy(src?.support_note, src?.supportNote),
  };

  const visible = Object.values(settlement).some((value) => safeStr(value));
  return visible ? settlement : null;
}

function normalizePaymentRail(raw: any): PaymentRail | null {
  if (!raw) return null;

  const src = raw?.item || raw?.data || raw;

  const rail: PaymentRail = {
    railCode: firstTruthy(src?.rail_code, src?.railCode),
    label: firstTruthy(src?.label),
    kind: firstTruthy(src?.kind),
    status: firstTruthy(src?.status),
    supportsInbound: Boolean(src?.supports_inbound ?? src?.supportsInbound),
    supportsOutbound: Boolean(src?.supports_outbound ?? src?.supportsOutbound),
    currencies: Array.isArray(src?.currencies)
      ? src.currencies.map((item: any) => safeStr(item)).filter(Boolean)
      : [],
    settlement: normalizeCommunitySettlement(src?.settlement),
  };

  return rail.railCode || rail.label || rail.settlement ? rail : null;
}

function normalizePaymentRailContext(raw: any): PaymentRailContext | null {
  if (!raw) return null;

  const src = raw?.item || raw?.data || raw;

  return {
    instructionType: firstTruthy(src?.instruction_type, src?.instructionType),
    currency: firstTruthy(src?.currency, "NGN"),
    defaultRail: normalizePaymentRail(src?.default_rail || src?.defaultRail),
    availableRails: Array.isArray(src?.available_rails || src?.availableRails)
      ? (src?.available_rails || src?.availableRails)
          .map((item: any) => normalizePaymentRail(item))
          .filter(Boolean) as PaymentRail[]
      : [],
  };
}

function normalizePaymentInstructionConfig(raw: any): PaymentInstructionConfig {
  const src = raw?.item || raw?.data || raw || {};

  return {
    settlement: normalizeCommunitySettlement(src?.settlement),
    availableInstructionTypes: Array.isArray(src?.available_instruction_types)
      ? src.available_instruction_types.map((item: any) => safeStr(item)).filter(Boolean)
      : [],
  };
}

function normalizePoolState(raw: any): PoolStateSummary {
  const src = raw?.item || raw?.data || raw || {};

  return {
    clanId: Number.isFinite(Number(src?.clan_id)) ? Number(src.clan_id) : null,
    userId: Number.isFinite(Number(src?.user_id)) ? Number(src.user_id) : null,
    currency: firstTruthy(src?.currency, "NGN"),
    reservedPool: firstTruthy(src?.reserved_pool, "0.00"),
    effectiveAvailable: firstTruthy(
      src?.effective_available,
      src?.available_balance,
      "0.00"
    ),
    availableBalance: firstTruthy(src?.available_balance, "0.00"),
    pendingDeposits: firstTruthy(src?.pending_deposits, "0.00"),
    pendingWithdrawals: firstTruthy(src?.pending_withdrawals, "0.00"),
    reference: firstTruthy(src?.reference),
    recentEvents: Array.isArray(src?.recent_events) ? src.recent_events : [],
  };
}

function normalizeGuarantorExposure(raw: any): GuarantorExposureSummary | null {
  if (!raw) return null;

  const src = raw?.item || raw?.data || raw;

  return {
    userId: Number.isFinite(Number(src?.user_id)) ? Number(src.user_id) : null,
    clanId: Number.isFinite(Number(src?.clan_id)) ? Number(src.clan_id) : null,
    totalLocked: firstTruthy(src?.total_locked, "0"),
    totalReleased: firstTruthy(src?.total_released, "0"),
    activeGuarantees: Number.isFinite(Number(src?.active_guarantees))
      ? Number(src.active_guarantees)
      : 0,
    historicalGuarantees: Number.isFinite(Number(src?.historical_guarantees))
      ? Number(src.historical_guarantees)
      : 0,
    note: firstTruthy(src?.note),
  };
}

function normalizeClanLiquidity(raw: any): ClanLiquiditySummary | null {
  if (!raw) return null;

  const src = raw?.item || raw?.data || raw;

  return {
    clanId: Number.isFinite(Number(src?.clan_id)) ? Number(src.clan_id) : null,
    clanName: firstTruthy(src?.clan_name),
    activeLoansCount: Number.isFinite(Number(src?.active_loans_count))
      ? Number(src.active_loans_count)
      : null,
    pledgedTotal: firstTruthy(src?.pledged_total, "0"),
    lockedTotal: firstTruthy(src?.locked_total, "0"),
    releasedTotal: firstTruthy(src?.released_total, "0"),
    note: firstTruthy(src?.note),
  };
}

function normalizePoolDepositInstruction(
  raw: any
): GeneratedPoolDepositInstruction | null {
  if (!raw) return null;

  const src = raw?.item || raw?.data || raw;

  return {
    expectedPaymentId: Number.isFinite(Number(src?.expected_payment_id))
      ? Number(src.expected_payment_id)
      : null,
    poolEventId: Number.isFinite(Number(src?.pool_event_id))
      ? Number(src.pool_event_id)
      : null,
    reference: firstTruthy(src?.reference),
    amount: firstTruthy(src?.amount),
    currency: firstTruthy(src?.currency, "NGN"),
    settlement: normalizeCommunitySettlement(src?.settlement),
    instructionType: firstTruthy(src?.instruction_type, "pool_deposit"),
  };
}

function buildRouteFromContext(params: {
  context: PaymentRailContext | null;
  fallbackSettlement?: CommunityMoneySettlement | null;
  title: string;
  instructionType: string;
}): CommunityMoneyRoute | null {
  const defaultRail = params.context?.defaultRail || null;
  const settlement = defaultRail?.settlement || params.fallbackSettlement || null;

  if (!defaultRail && !settlement) return null;

  const detailLines = [
    defaultRail?.label ? `Rail: ${defaultRail.label}` : "",
    settlement?.bankName ? `Bank: ${settlement.bankName}` : "",
    settlement?.accountName ? `Account name: ${settlement.accountName}` : "",
    settlement?.accountNumber ? `Account number: ${settlement.accountNumber}` : "",
    settlement?.sortCode ? `Sort code: ${settlement.sortCode}` : "",
    settlement?.country ? `Country: ${settlement.country}` : "",
    settlement?.supportNote ? settlement.supportNote : "",
  ].filter(Boolean);

  return {
    title: params.title,
    detail: detailLines.join("\n") || "Route loaded.",
    status: firstTruthy(defaultRail?.status, settlement ? "active" : "pending"),
    reference: "",
    currency: firstTruthy(params.context?.currency, "NGN"),
    minAmount: "",
    maxAmount: "",
    updatedAt: "",
    instructionType: params.instructionType,
    settlement,
    railCode: firstTruthy(defaultRail?.railCode),
    railLabel: firstTruthy(defaultRail?.label),
    kind: firstTruthy(defaultRail?.kind),
    availableRails: params.context?.availableRails || [],
  };
}

function destinationStorageKey(gmfnId: string, clanId: number): string {
  return `gmfn.money.destination.${gmfnId || "me"}.${clanId || 0}`;
}

function depositRouteStorageKey(
  gmfnId: string,
  clanId: number,
  currency: string
): string {
  return `gmfn.money.depositRoute.${gmfnId || "me"}.${clanId || 0}.${currency || "NGN"}`;
}

function withdrawalRouteStorageKey(
  gmfnId: string,
  clanId: number,
  currency: string
): string {
  return `gmfn.money.withdrawalRoute.${gmfnId || "me"}.${clanId || 0}.${currency || "NGN"}`;
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

export function defaultDestination(): CommunitySettlementDestination {
  return {
    destinationName: "",
    bankName: "",
    accountNumber: "",
    phoneNumber: "",
    note: "",
  };
}

export async function getPaymentInstructionConfig(
  clanId?: number
): Promise<PaymentInstructionConfig> {
  const raw = await fetchJson("/payment-instructions/my", clanId).catch(() => null);
  return normalizePaymentInstructionConfig(raw);
}

export async function getPaymentRails(
  currency = "NGN",
  clanId?: number
): Promise<PaymentRail[]> {
  void currency;

  const raw = await fetchJson("/payment-rails", clanId).catch(() => null);
  const rows = Array.isArray(raw?.items)
    ? raw.items
    : Array.isArray(raw)
    ? raw
    : [];

  return rows
    .map((row: any) => normalizePaymentRail(row))
    .filter(Boolean) as PaymentRail[];
}

export async function getDefaultPaymentRail(
  currency = "NGN",
  clanId?: number
): Promise<PaymentRail | null> {
  const query = new URLSearchParams({ currency }).toString();
  const raw = await fetchJson(`/payment-rails/default?${query}`, clanId).catch(
    () => null
  );
  return normalizePaymentRail(raw);
}

export async function getPaymentRailContext(
  instructionType: string,
  currency = "NGN",
  clanId?: number
): Promise<PaymentRailContext | null> {
  const query = new URLSearchParams({
    instruction_type: instructionType,
    currency,
  }).toString();

  const raw = await fetchJson(`/payment-rails/context?${query}`, clanId).catch(
    () => null
  );
  return normalizePaymentRailContext(raw);
}

export async function getSettlementConfig(
  clanId?: number
): Promise<CommunityMoneySettlement | null> {
  const raw = await fetchJson("/settlement-config", clanId).catch(() => null);
  return normalizeCommunitySettlement(raw);
}

export async function loadPoolState(
  clanId: number,
  currency = "NGN"
): Promise<PoolStateSummary> {
  const raw =
    typeof (api as any).getPoolMe === "function"
      ? await (api as any)
          .getPoolMe(currency, 20, { clan_id: clanId })
          .catch(() => null)
      : await fetchJson(
          `/pool/me?${new URLSearchParams({
            limit: "20",
            currency,
          }).toString()}`,
          clanId
        ).catch(() => null);

  return normalizePoolState(raw);
}

export async function getGuarantorExposureSummary(
  clanId: number
): Promise<GuarantorExposureSummary | null> {
  const raw = await fetchJson("/guarantors/exposure/me", clanId).catch(() => null);
  return normalizeGuarantorExposure(raw);
}

export async function getClanLiquiditySummary(
  clanId: number
): Promise<ClanLiquiditySummary | null> {
  const raw = await fetchJson("/analytics/clan-liquidity", clanId).catch(
    () => null
  );
  return normalizeClanLiquidity(raw);
}

export async function loadCommunityDepositRoute(
  clanId: number,
  gmfnId: string,
  currency = "NGN"
): Promise<CommunityMoneyRoute | null> {
  const instructionCfg = await getPaymentInstructionConfig(clanId).catch(() => ({
    settlement: null,
    availableInstructionTypes: [],
  }));

  const context = await getPaymentRailContext(
    "pool_deposit",
    currency,
    clanId
  ).catch(() => null);

  const fallbackDefaultRail = !context?.defaultRail
    ? await getDefaultPaymentRail(currency, clanId).catch(() => null)
    : null;

  const nextContext = context
    ? context
    : {
        instructionType: "pool_deposit",
        currency,
        defaultRail: fallbackDefaultRail,
        availableRails: fallbackDefaultRail ? [fallbackDefaultRail] : [],
      };

  const route = buildRouteFromContext({
    context: nextContext,
    fallbackSettlement: instructionCfg.settlement,
    title: "Community Pay In Rail",
    instructionType: "pool_deposit",
  });

  if (route) {
    writeLocalJSON(depositRouteStorageKey(gmfnId, clanId, currency), route);
    return route;
  }

  return readLocalJSON<CommunityMoneyRoute | null>(
    depositRouteStorageKey(gmfnId, clanId, currency),
    null
  );
}

export async function loadCommunityWithdrawalRoute(
  clanId: number,
  gmfnId: string,
  opts?: { currency?: string }
): Promise<CommunityMoneyRoute | null> {
  const currency = safeStr(opts?.currency || "NGN") || "NGN";

  const settlement = await getSettlementConfig(clanId).catch(() => null);
  const context = await getPaymentRailContext(
    "pool_withdrawal",
    currency,
    clanId
  ).catch(() => null);

  const fallbackDefaultRail = !context?.defaultRail
    ? await getDefaultPaymentRail(currency, clanId).catch(() => null)
    : null;

  const nextContext = context
    ? context
    : {
        instructionType: "pool_withdrawal",
        currency,
        defaultRail: fallbackDefaultRail,
        availableRails: fallbackDefaultRail ? [fallbackDefaultRail] : [],
      };

  const route = buildRouteFromContext({
    context: nextContext,
    fallbackSettlement: settlement,
    title: "Community Money Out Rail",
    instructionType: "pool_withdrawal",
  });

  if (route) {
    writeLocalJSON(withdrawalRouteStorageKey(gmfnId, clanId, currency), route);
    return route;
  }

  return readLocalJSON<CommunityMoneyRoute | null>(
    withdrawalRouteStorageKey(gmfnId, clanId, currency),
    null
  );
}

export async function createPoolDepositInstruction(params: {
  clanId: number;
  amount: string;
  currency?: string;
}): Promise<CommunityMoneyRoute | null> {
  const currency = safeStr(params.currency || "NGN") || "NGN";

  const raw = await postJson(
    "/payment-instructions/pool",
    {
      clan_id: Number(params.clanId),
      amount: safeStr(params.amount),
      currency,
    },
    params.clanId
  ).catch(() => null);

  const normalized = normalizePoolDepositInstruction(raw);
  if (!normalized) return null;

  const rail = await getDefaultPaymentRail(currency, params.clanId).catch(
    () => null
  );

  return {
    title: "Generated Pool Deposit Instruction",
    detail: [
      normalized.settlement?.railName
        ? `Rail: ${normalized.settlement.railName}`
        : "",
      normalized.settlement?.bankName
        ? `Bank: ${normalized.settlement.bankName}`
        : "",
      normalized.settlement?.accountName
        ? `Account name: ${normalized.settlement.accountName}`
        : "",
      normalized.settlement?.accountNumber
        ? `Account number: ${normalized.settlement.accountNumber}`
        : "",
      normalized.settlement?.supportNote || "",
    ]
      .filter(Boolean)
      .join("\n"),
    status: "ready",
    reference: normalized.reference,
    currency,
    minAmount: "",
    maxAmount: "",
    updatedAt: new Date().toISOString(),
    instructionType: normalized.instructionType,
    settlement: normalized.settlement,
    railCode: firstTruthy(rail?.railCode),
    railLabel: firstTruthy(rail?.label),
    kind: firstTruthy(rail?.kind),
    availableRails: rail ? [rail] : [],
  };
}

export async function createLoanRepaymentInstruction(params: {
  clanId: number;
  loanId: number;
  amount: string;
  currency?: string;
}): Promise<CommunityMoneyRoute | null> {
  const currency = safeStr(params.currency || "NGN") || "NGN";

  const raw = await postJson(
    "/payment-instructions/loan",
    {
      clan_id: Number(params.clanId),
      loan_id: Number(params.loanId),
      amount: safeStr(params.amount),
      currency,
    },
    params.clanId
  ).catch(() => null);

  const normalized = normalizePoolDepositInstruction(raw);
  if (!normalized) return null;

  const rail = await getDefaultPaymentRail(currency, params.clanId).catch(
    () => null
  );

  return {
    title: "Generated Loan Repayment Instruction",
    detail: [
      normalized.settlement?.railName
        ? `Rail: ${normalized.settlement.railName}`
        : "",
      normalized.settlement?.bankName
        ? `Bank: ${normalized.settlement.bankName}`
        : "",
      normalized.settlement?.accountName
        ? `Account name: ${normalized.settlement.accountName}`
        : "",
      normalized.settlement?.accountNumber
        ? `Account number: ${normalized.settlement.accountNumber}`
        : "",
      normalized.settlement?.supportNote || "",
    ]
      .filter(Boolean)
      .join("\n"),
    status: "ready",
    reference: normalized.reference,
    currency,
    minAmount: "",
    maxAmount: "",
    updatedAt: new Date().toISOString(),
    instructionType: normalized.instructionType,
    settlement: normalized.settlement,
    railCode: firstTruthy(rail?.railCode),
    railLabel: firstTruthy(rail?.label),
    kind: firstTruthy(rail?.kind),
    availableRails: rail ? [rail] : [],
  };
}

export async function requestPoolWithdrawal(
  payload: PoolWithdrawalRequestPayload
): Promise<any | null> {
  return postJson(
    "/pool/withdrawals/request",
    {
      amount: safeStr(payload.amount),
      currency: safeStr(payload.currency || "NGN") || "NGN",
      note: safeStr(payload.note || ""),
    },
    payload.clanId
  ).catch(() => null);
}

export async function getLoanWithdrawalInstruction(
  loanId: number,
  clanId: number
): Promise<CommunityMoneyRoute | null> {
  const raw = await fetchJson(
    `/withdrawal-instructions/loan/${loanId}`,
    clanId
  ).catch(() => null);

  if (!raw) return null;

  const settlement = normalizeCommunitySettlement(raw);

  return {
    title: firstTruthy(raw?.title, "Approved Loan Withdrawal Instruction"),
    detail: [
      settlement?.railName ? `Rail: ${settlement.railName}` : "",
      settlement?.bankName ? `Bank: ${settlement.bankName}` : "",
      settlement?.accountName ? `Account name: ${settlement.accountName}` : "",
      settlement?.accountNumber
        ? `Account number: ${settlement.accountNumber}`
        : "",
      settlement?.supportNote || "",
    ]
      .filter(Boolean)
      .join("\n"),
    status: firstTruthy(raw?.status, "ready"),
    reference: firstTruthy(raw?.reference),
    currency: firstTruthy(raw?.currency, "NGN"),
    minAmount: "",
    maxAmount: "",
    updatedAt: firstTruthy(raw?.updated_at, new Date().toISOString()),
    instructionType: "loan_withdrawal",
    settlement,
    railCode: "",
    railLabel: "",
    kind: "",
    availableRails: [],
  };
}

export async function getCommunitySettlementDestination(
  clanId: number,
  gmfnId: string
): Promise<CommunitySettlementDestination> {
  const fallback = readLocalJSON<CommunitySettlementDestination>(
    destinationStorageKey(gmfnId, clanId),
    defaultDestination()
  );

  const viaWrapper =
    typeof (api as any).getMyWithdrawalDestination === "function"
      ? await (api as any)
          .getMyWithdrawalDestination({
            clan_id: clanId || undefined,
            gmfn_id: gmfnId || undefined,
          })
          .catch(() => null)
      : null;

  const src =
    viaWrapper?.item || viaWrapper?.destination || viaWrapper?.data || viaWrapper;

  const normalized = src
    ? {
        destinationName: firstTruthy(
          src?.destination_name,
          src?.account_name,
          fallback.destinationName
        ),
        bankName: firstTruthy(src?.bank_name, src?.bank, fallback.bankName),
        accountNumber: firstTruthy(
          src?.account_number,
          src?.bank_account_number,
          fallback.accountNumber
        ),
        phoneNumber: firstTruthy(
          src?.phone_number,
          src?.phone,
          fallback.phoneNumber
        ),
        note: firstTruthy(src?.note, src?.description, fallback.note),
      }
    : fallback;

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

  const viaWrapper =
    typeof (api as any).saveWithdrawalDestination === "function"
      ? await (api as any).saveWithdrawalDestination(payload).catch(() => null)
      : typeof (api as any).updateWithdrawalDestination === "function"
      ? await (api as any).updateWithdrawalDestination(payload).catch(() => null)
      : null;

  const src =
    viaWrapper?.item || viaWrapper?.destination || viaWrapper?.data || viaWrapper;

  const normalized = src
    ? {
        destinationName: firstTruthy(
          src?.destination_name,
          src?.account_name,
          destination.destinationName
        ),
        bankName: firstTruthy(src?.bank_name, src?.bank, destination.bankName),
        accountNumber: firstTruthy(
          src?.account_number,
          src?.bank_account_number,
          destination.accountNumber
        ),
        phoneNumber: firstTruthy(
          src?.phone_number,
          src?.phone,
          destination.phoneNumber
        ),
        note: firstTruthy(src?.note, src?.description, destination.note),
      }
    : {
        destinationName: safeStr(destination.destinationName),
        bankName: safeStr(destination.bankName),
        accountNumber: safeStr(destination.accountNumber),
        phoneNumber: safeStr(destination.phoneNumber),
        note: safeStr(destination.note),
      };

  writeLocalJSON(destinationStorageKey(gmfnId, clanId), normalized);
  return normalized;
}

export async function getCommunityMoneySurface(
  clanId: number,
  gmfnId: string,
  currency = "NGN"
): Promise<CommunityMoneySurface> {
  const [
    poolState,
    paymentInstructionConfig,
    communitySettlement,
    payoutDestination,
    depositRailContext,
    withdrawalRailContext,
    depositRoute,
    withdrawalRoute,
    guarantorExposure,
    clanLiquidity,
  ] = await Promise.all([
    loadPoolState(clanId, currency).catch(() => normalizePoolState(null)),
    getPaymentInstructionConfig(clanId).catch(() =>
      normalizePaymentInstructionConfig(null)
    ),
    getSettlementConfig(clanId).catch(() => null),
    getCommunitySettlementDestination(clanId, gmfnId).catch(() =>
      defaultDestination()
    ),
    getPaymentRailContext("pool_deposit", currency, clanId).catch(() => null),
    getPaymentRailContext("pool_withdrawal", currency, clanId).catch(() => null),
    loadCommunityDepositRoute(clanId, gmfnId, currency).catch(() => null),
    loadCommunityWithdrawalRoute(clanId, gmfnId, { currency }).catch(() => null),
    getGuarantorExposureSummary(clanId).catch(() => null),
    getClanLiquiditySummary(clanId).catch(() => null),
  ]);

  return {
    clanId,
    gmfnId,

    poolAmount: firstTruthy(poolState.availableBalance, "0.00"),
    poolCurrency: firstTruthy(poolState.currency, currency),
    effectiveAvailable: firstTruthy(poolState.effectiveAvailable, "0.00"),
    reservedPool: firstTruthy(poolState.reservedPool, "0.00"),
    pendingDeposits: firstTruthy(poolState.pendingDeposits, "0.00"),
    pendingWithdrawals: firstTruthy(poolState.pendingWithdrawals, "0.00"),
    poolReference: firstTruthy(poolState.reference),
    recentPoolEvents: Array.isArray(poolState.recentEvents)
      ? poolState.recentEvents
      : [],

    communitySettlement:
      communitySettlement ||
      paymentInstructionConfig.settlement ||
      depositRoute?.settlement ||
      withdrawalRoute?.settlement ||
      depositRailContext?.defaultRail?.settlement ||
      withdrawalRailContext?.defaultRail?.settlement ||
      null,

    payoutDestination,
    settlementDestination: payoutDestination,

    depositRailContext,
    withdrawalRailContext,

    depositRoute,
    withdrawalRoute,

    paymentInstructionConfig,
    guarantorExposure,
    clanLiquidity,
  };
}
