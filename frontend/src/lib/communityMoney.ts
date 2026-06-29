import * as api from "./api";

export type CommunityMoneySettlement = {
  railName: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode: string;
  routingNumber: string;
  achRoutingNumber: string;
  wireRoutingNumber: string;
  iban: string;
  swiftBic: string;
  bankCode: string;
  branchCode: string;
  branchName: string;
  ifscCode: string;
  mobileMoneyProvider: string;
  mobileMoneyNumber: string;
  country: string;
  currency?: string;
  regionCode: string;
  paymentNetworks: string[];
  missingFieldText: string;
  supportNote: string;
  configured?: boolean;
  source?: string;
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
  expectedPaymentId?: number | null;
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
  contributionReason?: string;
};

export type CommunitySettlementDestination = {
  destinationName: string;
  bankName: string;
  accountNumber: string;
  sortCode: string;
  phoneNumber: string;
  country: string;
  currency: string;
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
  withdrawableNow: string;
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
  contributionReason?: string;
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
  withdrawableNow: string;
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

function normalizeSortCode(value: any): string {
  return safeStr(value)
    .replace(/[^\dA-Za-z]/g, "")
    .replace(/(.{2})(?=.)/g, "$1-")
    .slice(0, 16);
}

function extractSortCodeFromNote(note: any): string {
  const raw = safeStr(note);
  if (!raw) return "";
  const match = raw.match(/(?:UK\s*)?Sort code:\s*([^|;\n]+)/i);
  return normalizeSortCode(match?.[1] || "");
}

function stripSortCodeFromNote(note: any): string {
  return safeStr(note)
    .split("|")
    .map((part) => safeStr(part))
    .filter((part) => part && !/^(?:UK\s*)?Sort code:/i.test(part))
    .join(" | ");
}

function noteWithSortCode(note: any, sortCode: any): string {
  const base = stripSortCodeFromNote(note);
  const normalized = normalizeSortCode(sortCode);
  return [base, normalized ? `UK Sort code: ${normalized}` : ""]
    .filter(Boolean)
    .join(" | ");
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";

  return String(raw || "").trim().replace(/\/+$/, "");
}

const COMMUNITY_MONEY_JSON_TIMEOUT_MS = 30000;

async function fetchWithCommunityMoneyTimeout(
  input: RequestInfo | URL,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(
    () => controller.abort(),
    COMMUNITY_MONEY_JSON_TIMEOUT_MS
  );

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(
        "The server did not finish this request. Please check your connection and try again."
      );
    }
    throw err;
  } finally {
    globalThis.clearTimeout(timer);
  }
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
  const res = await fetchWithCommunityMoneyTimeout(`${apiBase()}${path}`, {
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
  clanId?: number,
  method = "POST"
): Promise<any | null> {
  const res = await fetchWithCommunityMoneyTimeout(`${apiBase()}${path}`, {
    method,
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

  const paymentNetworks = src?.payment_networks || src?.paymentNetworks;

  const settlement: CommunityMoneySettlement = {
    railName: firstTruthy(src?.rail_name, src?.railName),
    bankName: firstTruthy(src?.bank_name, src?.bankName),
    accountName: firstTruthy(src?.account_name, src?.accountName),
    accountNumber: firstTruthy(src?.account_number, src?.accountNumber),
    sortCode: firstTruthy(src?.sort_code, src?.sortCode),
    routingNumber: firstTruthy(src?.routing_number, src?.routingNumber),
    achRoutingNumber: firstTruthy(src?.ach_routing_number, src?.achRoutingNumber),
    wireRoutingNumber: firstTruthy(src?.wire_routing_number, src?.wireRoutingNumber),
    iban: firstTruthy(src?.iban),
    swiftBic: firstTruthy(src?.swift_bic, src?.swiftBic, src?.bic),
    bankCode: firstTruthy(src?.bank_code, src?.bankCode),
    branchCode: firstTruthy(src?.branch_code, src?.branchCode),
    branchName: firstTruthy(src?.branch_name, src?.branchName),
    ifscCode: firstTruthy(src?.ifsc_code, src?.ifscCode),
    mobileMoneyProvider: firstTruthy(src?.mobile_money_provider, src?.mobileMoneyProvider),
    mobileMoneyNumber: firstTruthy(src?.mobile_money_number, src?.mobileMoneyNumber),
    country: firstTruthy(src?.country),
    currency: firstTruthy(src?.currency),
    regionCode: firstTruthy(src?.region_code, src?.regionCode),
    paymentNetworks: Array.isArray(paymentNetworks)
      ? paymentNetworks.map((item: any) => safeStr(item)).filter(Boolean)
      : [],
    missingFieldText: firstTruthy(src?.missing_field_text, src?.missingFieldText),
    supportNote: firstTruthy(src?.support_note, src?.supportNote),
    configured:
      typeof src?.configured === "boolean" ? Boolean(src.configured) : undefined,
    source: firstTruthy(src?.source),
  };

  const visible = [
    settlement.bankName,
    settlement.accountName,
    settlement.accountNumber,
    settlement.sortCode,
    settlement.routingNumber,
    settlement.iban,
    settlement.swiftBic,
    settlement.mobileMoneyNumber,
  ].some((value) => safeStr(value));
  return visible ? settlement : null;
}

export function communityPayInReady(
  settlement: CommunityMoneySettlement | null
): boolean {
  if (!settlement) return false;
  if (settlement.configured === false) return false;
  if (
    settlement.configured !== true &&
    safeStr(settlement.source) !== "community_pay_in_account"
  ) {
    return false;
  }

  const bankName = safeStr(settlement.bankName).toLowerCase();
  const accountName = safeStr(settlement.accountName).toLowerCase();
  const accountNumber = safeStr(settlement.accountNumber).toLowerCase();

  if (!accountNumber || accountNumber === "to be assigned") return false;
  if (bankName.includes("settlement rail") && accountNumber === "to be assigned") {
    return false;
  }
  if (accountName === "gsn settlement" && accountNumber === "to be assigned") {
    return false;
  }

  return Boolean(
    safeStr(settlement.bankName) &&
      safeStr(settlement.accountName) &&
      safeStr(settlement.accountNumber)
  );
}

function settlementDetailLines(settlement: CommunityMoneySettlement | null): string[] {
  if (!settlement) return [];

  return [
    settlement.bankName ? `Bank: ${settlement.bankName}` : "",
    settlement.accountName ? `Account name: ${settlement.accountName}` : "",
    settlement.accountNumber ? `Account number: ${settlement.accountNumber}` : "",
    settlement.sortCode ? `UK sort code: ${settlement.sortCode}` : "",
    settlement.routingNumber ? `US routing number: ${settlement.routingNumber}` : "",
    settlement.achRoutingNumber ? `ACH routing: ${settlement.achRoutingNumber}` : "",
    settlement.wireRoutingNumber ? `Wire routing: ${settlement.wireRoutingNumber}` : "",
    settlement.iban ? `IBAN: ${settlement.iban}` : "",
    settlement.swiftBic ? `SWIFT/BIC: ${settlement.swiftBic}` : "",
    settlement.bankCode ? `Bank code: ${settlement.bankCode}` : "",
    settlement.branchCode ? `Branch code: ${settlement.branchCode}` : "",
    settlement.branchName ? `Branch name: ${settlement.branchName}` : "",
    settlement.ifscCode ? `IFSC: ${settlement.ifscCode}` : "",
    settlement.mobileMoneyProvider ? `Mobile money: ${settlement.mobileMoneyProvider}` : "",
    settlement.mobileMoneyNumber ? `Mobile money number: ${settlement.mobileMoneyNumber}` : "",
    settlement.country ? `Country: ${settlement.country}` : "",
    settlement.regionCode ? `Region profile: ${settlement.regionCode.replace(/_/g, " ")}` : "",
    settlement.paymentNetworks.length ? `Payment networks: ${settlement.paymentNetworks.join(", ")}` : "",
    settlement.supportNote ? settlement.supportNote : "",
  ].filter(Boolean);
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
  const availableRails = src?.available_rails || src?.availableRails;

  return {
    instructionType: firstTruthy(src?.instruction_type, src?.instructionType),
    currency: firstTruthy(src?.currency, "NGN"),
    defaultRail: normalizePaymentRail(src?.default_rail || src?.defaultRail),
    availableRails: Array.isArray(availableRails)
      ? availableRails
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
    withdrawableNow: firstTruthy(
      src?.withdrawable_now,
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
    contributionReason: firstTruthy(
      src?.contribution_reason,
      src?.contributionReason,
      src?.reason,
      src?.note
    ),
  };
}

function buildRouteFromContext(params: {
  context: PaymentRailContext | null;
  fallbackSettlement?: CommunityMoneySettlement | null;
  title: string;
  instructionType: string;
}): CommunityMoneyRoute | null {
  const defaultRail = params.context?.defaultRail || null;
  const settlement = params.fallbackSettlement || defaultRail?.settlement || null;

  if (!defaultRail && !settlement) return null;

  const detailLines = [
    defaultRail?.label ? `Rail: ${defaultRail.label}` : "",
    ...settlementDetailLines(settlement),
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

function communityPayInStorageKey(clanId: number): string {
  return `gmfn.money.communityPayIn.${clanId || 0}`;
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

export async function getCommunityPayInSettlement(
  clanId: number
): Promise<CommunityMoneySettlement | null> {
  const raw = await fetchJson(
    `/community-pay-in-accounts/${Number(clanId)}`,
    clanId
  ).catch(() => null);

  const settlement = normalizeCommunitySettlement(raw);
  if (settlement && communityPayInReady(settlement)) {
    writeLocalJSON(communityPayInStorageKey(clanId), settlement);
    return settlement;
  }

  const cached = readLocalJSON<CommunityMoneySettlement | null>(
    communityPayInStorageKey(clanId),
    null
  );
  return communityPayInReady(cached) ? cached : null;
}

export async function saveCommunityPayInSettlement(params: {
  clanId: number;
  accountName: string;
  bankName: string;
  accountNumber: string;
  sortCode?: string;
  routingNumber?: string;
  iban?: string;
  swiftBic?: string;
  country?: string;
  currency?: string;
  note?: string;
}): Promise<CommunityMoneySettlement | null> {
  const raw = await postJson(
    `/community-pay-in-accounts/${Number(params.clanId)}`,
    {
      account_name: safeStr(params.accountName),
      bank_name: safeStr(params.bankName),
      account_number: safeStr(params.accountNumber),
      sort_code: normalizeSortCode(params.sortCode),
      routing_number: safeStr(params.routingNumber),
      iban: safeStr(params.iban),
      swift_bic: safeStr(params.swiftBic),
      country: safeStr(params.country),
      currency: safeStr(params.currency || "NGN") || "NGN",
      note: safeStr(params.note),
    },
    params.clanId,
    "PUT"
  );

  const settlement = normalizeCommunitySettlement(raw);
  if (settlement) {
    writeLocalJSON(communityPayInStorageKey(params.clanId), settlement);
  }
  return settlement;
}

export function defaultDestination(): CommunitySettlementDestination {
  return {
    destinationName: "",
    bankName: "",
    accountNumber: "",
    sortCode: "",
    phoneNumber: "",
    country: "",
    currency: "",
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
  const communityPayIn = await getCommunityPayInSettlement(clanId).catch(
    () => null
  );
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
    fallbackSettlement: communityPayIn || instructionCfg.settlement,
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
  contributionReason?: string;
}): Promise<CommunityMoneyRoute | null> {
  const currency = safeStr(params.currency || "NGN") || "NGN";

  const raw = await postJson(
    "/payment-instructions/pool",
    {
      clan_id: Number(params.clanId),
      amount: safeStr(params.amount),
      currency,
      contribution_reason: safeStr(params.contributionReason || ""),
    },
    params.clanId
  ).catch(() => null);

  const normalized = normalizePoolDepositInstruction(raw);
  if (!normalized) return null;

  const rail = await getDefaultPaymentRail(currency, params.clanId).catch(
    () => null
  );
  const communityPayIn = await getCommunityPayInSettlement(params.clanId).catch(
    () => null
  );
  const settlement = communityPayIn || normalized.settlement || rail?.settlement || null;

  return {
    expectedPaymentId: normalized.expectedPaymentId,
    title: "Generated Pool Deposit Instruction",
    detail: [
      settlement?.railName
        ? `Rail: ${settlement.railName}`
        : "",
      ...settlementDetailLines(settlement),
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
    settlement,
    railCode: firstTruthy(rail?.railCode),
    railLabel: firstTruthy(rail?.label),
    kind: firstTruthy(rail?.kind),
    availableRails: rail ? [rail] : [],
    contributionReason: normalized.contributionReason,
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
  const communityPayIn = await getCommunityPayInSettlement(params.clanId).catch(
    () => null
  );
  const settlement = communityPayIn || normalized.settlement;

  return {
    title: "Generated Support Repayment Instruction",
    detail: [
      settlement?.railName
        ? `Rail: ${settlement.railName}`
        : "",
      ...settlementDetailLines(settlement),
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
    settlement,
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
  );
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
      ...settlementDetailLines(settlement),
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
        sortCode: firstTruthy(
          src?.sort_code,
          src?.bank_sort_code,
          src?.sortCode,
          fallback.sortCode,
          extractSortCodeFromNote(src?.note),
          extractSortCodeFromNote(fallback.note)
        ),
        phoneNumber: firstTruthy(
          src?.phone_number,
          src?.phone,
          fallback.phoneNumber
        ),
        country: firstTruthy(src?.country, src?.region, fallback.country),
        currency: firstTruthy(src?.currency, fallback.currency),
        note: stripSortCodeFromNote(
          firstTruthy(src?.note, src?.description, fallback.note)
        ),
      }
    : {
        destinationName: safeStr(fallback.destinationName),
        bankName: safeStr(fallback.bankName),
        accountNumber: safeStr(fallback.accountNumber),
        sortCode: firstTruthy(
          fallback.sortCode,
          extractSortCodeFromNote(fallback.note)
        ),
        phoneNumber: safeStr(fallback.phoneNumber),
        country: safeStr(fallback.country),
        currency: safeStr(fallback.currency),
        note: stripSortCodeFromNote(fallback.note),
      };

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
    sort_code: normalizeSortCode(destination.sortCode),
    bank_sort_code: normalizeSortCode(destination.sortCode),
    phone_number: safeStr(destination.phoneNumber),
    country: safeStr(destination.country),
    currency: safeStr(destination.currency),
    note: noteWithSortCode(destination.note, destination.sortCode),
  };

  let viaWrapper = null;
  let saveError: any = null;
  if (typeof (api as any).updateWithdrawalDestination === "function") {
    viaWrapper = await (api as any)
      .updateWithdrawalDestination(payload)
      .catch((error: any) => {
        saveError = error;
        return null;
      });
  }
  if (!viaWrapper && typeof (api as any).saveWithdrawalDestination === "function") {
    viaWrapper = await (api as any)
      .saveWithdrawalDestination(payload)
      .catch((error: any) => {
        saveError = error;
        return null;
      });
  }

  if (!viaWrapper && saveError) {
    throw saveError;
  }

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
        sortCode: firstTruthy(
          src?.sort_code,
          src?.bank_sort_code,
          src?.sortCode,
          destination.sortCode,
          extractSortCodeFromNote(src?.note)
        ),
        phoneNumber: firstTruthy(
          src?.phone_number,
          src?.phone,
          destination.phoneNumber
        ),
        country: firstTruthy(src?.country, src?.region, destination.country),
        currency: firstTruthy(src?.currency, destination.currency),
        note: stripSortCodeFromNote(
          firstTruthy(src?.note, src?.description, destination.note)
        ),
      }
    : {
        destinationName: safeStr(destination.destinationName),
        bankName: safeStr(destination.bankName),
        accountNumber: safeStr(destination.accountNumber),
        sortCode: normalizeSortCode(destination.sortCode),
        phoneNumber: safeStr(destination.phoneNumber),
        country: safeStr(destination.country),
        currency: safeStr(destination.currency),
        note: stripSortCodeFromNote(destination.note),
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
    communityPayInSettlement,
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
    getCommunityPayInSettlement(clanId).catch(() => null),
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
    withdrawableNow: firstTruthy(poolState.withdrawableNow, poolState.effectiveAvailable, "0.00"),
    reservedPool: firstTruthy(poolState.reservedPool, "0.00"),
    pendingDeposits: firstTruthy(poolState.pendingDeposits, "0.00"),
    pendingWithdrawals: firstTruthy(poolState.pendingWithdrawals, "0.00"),
    poolReference: firstTruthy(poolState.reference),
    recentPoolEvents: Array.isArray(poolState.recentEvents)
      ? poolState.recentEvents
      : [],

    communitySettlement:
      communityPayInSettlement ||
      depositRoute?.settlement ||
      depositRailContext?.defaultRail?.settlement ||
      communitySettlement ||
      paymentInstructionConfig.settlement ||
      withdrawalRoute?.settlement ||
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
