import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PrimaryButton, SecondaryButton, SubtleButton } from "../components/StableButton";
import SpotlightMediaFrame from "../components/SpotlightMediaFrame";
import {
  createMarketplaceBroadcast,
  getAccessToken,
  getMarketplaceShopByGmfnId,
  getMe,
  getMyIdentityRisk,
  getSelectedClanId,
  safeCopy,
  uploadMarketplaceImageFile,
  uploadMarketplaceVideoFile,
} from "../lib/api";
import {
  SPOTLIGHT_MAX_IMAGE_BYTES,
  SPOTLIGHT_MAX_VIDEO_BYTES,
  SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
} from "../lib/spotlightPilot";
import {
  prepareSpotlightImageFile,
  prepareSpotlightVideoFile,
} from "../lib/spotlightMediaPrep";
import { APP_ROUTES, routeWithCommunity } from "../lib/appRoutes";
import { rememberPublishRecovery } from "../lib/publishRecovery";
import {
  brandActionButton,
  brandBadge,
  brandHelperText,
  brandInnerCard,
  brandPageCard,
  brandSectionLabel,
  gmfnBrand,
} from "../styles/gmfnBrand";

type NoticeTone = "success" | "error" | "info";
type Notice = { tone: NoticeTone; text: string } | null;

type ShopRecord = {
  id: number;
  clan_id?: number | null;
  gmfn_id?: string | null;
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  marketplace_name?: string | null;
};

type BroadcastRecord = {
  id?: number | string | null;
  shop_id?: number | string | null;
  message?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  priority_mode?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
};

type ExpectedPaymentRecord = {
  id?: number | string | null;
  expected_type?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  due_at?: string | null;
  reference_display?: string | null;
  status?: string | null;
  confirmed_at?: string | null;
  matched_bank_event_id?: number | string | null;
  meta?: any;
  meta_json?: any;
  quantity_total?: number | string | null;
};

type SettlementRecord = {
  rail_name?: string | null;
  bank_name?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  sort_code?: string | null;
  routing_number?: string | null;
  ach_routing_number?: string | null;
  wire_routing_number?: string | null;
  iban?: string | null;
  swift_bic?: string | null;
  bank_code?: string | null;
  branch_code?: string | null;
  branch_name?: string | null;
  ifsc_code?: string | null;
  mobile_money_number?: string | null;
  country?: string | null;
  region_code?: string | null;
  payment_networks?: string[] | null;
  missing_field_text?: string | null;
};

type SpotlightConfigRecord = {
  max_credits?: number | string | null;
  unit_price_gbp?: number | string | null;
  bundle_credit_count?: number | string | null;
  bundle_price_gbp?: number | string | null;
  payment_instruction_expiry_days?: number | string | null;
  payment_method?: string | null;
  payment_beneficiary_scope?: string | null;
};

type SpotlightStatusRecord = {
  available_paid_credits?: number | string | null;
  active_paid_spotlights?: number | string | null;
  can_publish_paid_spotlight?: boolean | null;
};

const SPOTLIGHT_CREDIT_LIMIT = 6;
const PAYMENT_DUE_DAYS = 7;

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function firstTruthy(...values: unknown[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function rowsOf<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
  return [];
}

function paymentQuantity(payment?: ExpectedPaymentRecord | null): number {
  const meta = payment?.meta || payment?.meta_json || {};
  const value = Number(payment?.quantity_total ?? meta?.quantity_total ?? 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function isConfirmedPayment(payment?: ExpectedPaymentRecord | null): boolean {
  const status = safeStr(payment?.status).toLowerCase();
  return Boolean(payment?.confirmed_at) || status === "confirmed" || status === "matched";
}

function spotlightCreditAmount(creditCount: unknown): number {
  const credits = Math.min(SPOTLIGHT_CREDIT_LIMIT, Math.max(1, Number(creditCount || 1)));
  return credits === SPOTLIGHT_CREDIT_LIMIT ? 5 : credits;
}

function quoteKey(creditCount: unknown): string {
  const credits = Math.min(SPOTLIGHT_CREDIT_LIMIT, Math.max(1, Number(creditCount || 1)));
  return `${credits}:${spotlightCreditAmount(credits)}:GBP`;
}

function formatMoney(amount: unknown, currency = "GBP"): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) {
    const text = safeStr(amount);
    return text ? `${currency} ${text}` : "";
  }
  return `${currency} ${n.toFixed(Math.abs(n % 1) > 0 ? 2 : 0)}`;
}

function safeDateTime(value: unknown): string {
  const raw = safeStr(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return raw;
  try {
    return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return raw;
  }
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";
  return String(raw || "").trim().replace(/\/+$/, "");
}

function apiOrigin(): string {
  const base = apiBase();
  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      const url = new URL(base);
      return `${url.protocol}//${url.host}`;
    } catch {
      return typeof window !== "undefined"
        ? String(window.location.origin || "").trim().replace(/\/+$/, "")
        : "";
    }
  }
  return typeof window !== "undefined"
    ? String(window.location.origin || "").trim().replace(/\/+$/, "")
    : "";
}

function resolveAssetSrc(raw: unknown): string {
  const value = safeStr(raw);
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:")) {
    return value;
  }
  if (value.startsWith("/")) return `${apiOrigin()}${value}`;
  return `${apiOrigin()}/${value.replace(/^\/+/, "")}`;
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {});
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const root = apiBase();
  let cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (root.endsWith("/api") && cleanPath.startsWith("/api/")) {
    cleanPath = cleanPath.slice(4);
  }

  const res = await fetch(`${root}${cleanPath}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    try {
      const parsed = JSON.parse(text);
      throw new Error(parsed?.detail || parsed?.message || text || `HTTP ${res.status}`);
    } catch (err: any) {
      if (err instanceof SyntaxError) throw new Error(text || `HTTP ${res.status}`);
      throw err;
    }
  }
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return { raw: text } as T;
  }
}

function settlementValue(settlement: SettlementRecord | null, key: keyof SettlementRecord): string {
  const value = settlement?.[key];
  if (Array.isArray(value)) return value.map((item) => safeStr(item)).filter(Boolean).join(", ");
  return firstTruthy(value);
}

function paymentLine(label: string, value: unknown): string {
  const text = firstTruthy(value);
  return text ? `${label}: ${text}` : "";
}

function pageShell(isCompact: boolean): React.CSSProperties {
  return {
    maxWidth: 1120,
    margin: "0 auto",
    display: "grid",
    gap: isCompact ? 12 : 16,
    padding: isCompact ? "0 0 36px" : "4px 0 42px",
    background:
      "radial-gradient(circle at 8% 0%, rgba(201,154,39,0.14), transparent 28%), radial-gradient(circle at 92% 6%, rgba(12,79,168,0.16), transparent 30%), linear-gradient(180deg, rgba(246,250,253,0), rgba(226,236,247,0.18))",
    borderRadius: 28,
  };
}

function heroBadge(active = false): React.CSSProperties {
  return {
    ...brandBadge(active),
    background: active
      ? "rgba(17,105,219,0.22)"
      : "rgba(255,255,255,0.12)",
    color: active ? "#DDEBFF" : "#D7E3F1",
    border: active ? "1px solid rgba(87,161,255,0.32)" : "1px solid rgba(255,255,255,0.16)",
  };
}

function sectionTitle(): React.CSSProperties {
  return {
    color: gmfnBrand.colors.ink,
    fontSize: 24,
    lineHeight: 1.1,
    fontWeight: 950,
  };
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  const palette =
    tone === "success"
      ? { bg: "#ECFDF3", border: "#A7F3D0", color: "#065F46" }
      : tone === "error"
        ? { bg: "#FFF1F2", border: "#FDA4AF", color: "#991B1B" }
        : { bg: "#EFF6FF", border: "#BFDBFE", color: "#17406D" };
  return {
    borderRadius: 18,
    border: `1px solid ${palette.border}`,
    background: palette.bg,
    color: palette.color,
    padding: 14,
    fontSize: 14,
    fontWeight: 820,
    lineHeight: 1.55,
  };
}

function slotButton(selected: boolean): React.CSSProperties {
  return {
    ...brandActionButton(selected ? "primary" : "secondary"),
    minHeight: 74,
    display: "grid",
    gap: 2,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 52,
    borderRadius: 14,
    border: `1px solid ${gmfnBrand.colors.lineStrong}`,
    background: "#FFFFFF",
    color: gmfnBrand.colors.ink,
    padding: "12px 14px",
    fontSize: 15,
    fontWeight: 760,
    boxSizing: "border-box",
  };
}

function textAreaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 118,
    resize: "vertical",
    lineHeight: 1.45,
  };
}

function actionGrid(isCompact: boolean, min = 160): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: isCompact ? "1fr" : `repeat(auto-fit, minmax(${min}px, 1fr))`,
    gap: 10,
    alignItems: "stretch",
  };
}

export default function SubscriptionSpotlightPage() {
  const [loading, setLoading] = useState(true);
  const [isCompact, setIsCompact] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [me, setMe] = useState<any>(null);
  const [identityBlocked, setIdentityBlocked] = useState(false);
  const [shop, setShop] = useState<ShopRecord | null>(null);
  const [settlement, setSettlement] = useState<SettlementRecord | null>(null);
  const [spotlightConfig, setSpotlightConfig] = useState<SpotlightConfigRecord | null>(null);
  const [expectedPayments, setExpectedPayments] = useState<ExpectedPaymentRecord[]>([]);
  const [spotlights, setSpotlights] = useState<BroadcastRecord[]>([]);
  const [spotlightStatus, setSpotlightStatus] = useState<SpotlightStatusRecord | null>(null);
  const [createdInstruction, setCreatedInstruction] = useState<ExpectedPaymentRecord | null>(null);
  const [selectedCredits, setSelectedCredits] = useState(1);
  const [confirmedQuoteKey, setConfirmedQuoteKey] = useState("");
  const [creatingInstruction, setCreatingInstruction] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number | null>(null);
  const [preparingImage, setPreparingImage] = useState(false);
  const [preparingVideo, setPreparingVideo] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const imagePrepRef = useRef(0);
  const videoPrepRef = useRef(0);

  const selectedClanId = Number(getSelectedClanId() || 0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function onResize() {
      setIsCompact(window.innerWidth <= 860);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    if (!videoFile) {
      setVideoPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(videoFile);
    setVideoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  const loadPage = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    try {
      const [meRes, riskRes, instructionConfigRes] = await Promise.all([
        getMe().catch(() => null),
        getMyIdentityRisk().catch(() => null),
        apiJson<any>("/api/payment-instructions/my").catch(() => null),
      ]);
      setMe(meRes || null);
      setSettlement((instructionConfigRes?.settlement || null) as SettlementRecord | null);
      setSpotlightConfig((instructionConfigRes?.spotlight_config || null) as SpotlightConfigRecord | null);

      const continuity = (riskRes as any)?.continuity || {};
      const status = safeStr(continuity?.status).toLowerCase();
      setIdentityBlocked(status === "reverify_required" || status === "protected_lock");

      const gmfnId = firstTruthy(meRes?.gmfn_id);
      if (!gmfnId) {
        setShop(null);
        setExpectedPayments([]);
        setSpotlights([]);
        setSpotlightStatus(null);
        return;
      }

      const shopRes = await getMarketplaceShopByGmfnId(gmfnId, {
        clan_id: selectedClanId || undefined,
        header_clan_id: selectedClanId || undefined,
      }).catch(() => null);
      const shopItem = (shopRes?.item || null) as ShopRecord | null;
      setShop(shopItem);

      if (!shopItem?.id) {
        setExpectedPayments([]);
        setSpotlights([]);
        setSpotlightStatus(null);
        return;
      }

      const clanId = Number(shopItem.clan_id || shopRes?.clan_id || selectedClanId || 0);
      const expectedPath =
        `/api/payment-instructions/my/expected?clan_id=${clanId}` +
        "&expected_type=spotlight_subscription&limit=100";

      const [expectedRes, broadcastsRes, spotlightStatusRes] = await Promise.all([
        apiJson<any>(expectedPath).catch(() => []),
        apiJson<any>(`/api/marketplace/broadcasts?clan_id=${clanId}&limit=40`).catch(() => ({ items: [] })),
        apiJson<any>(`/api/marketplace/shops/${shopItem.id}/spotlight-status`).catch(() => null),
      ]);

      setExpectedPayments(rowsOf<ExpectedPaymentRecord>(expectedRes));
      setSpotlightStatus((spotlightStatusRes || null) as SpotlightStatusRecord | null);
      setSpotlights(
        rowsOf<BroadcastRecord>(broadcastsRes).filter(
          (item) => Number(item?.shop_id || 0) === Number(shopItem.id)
        )
      );
    } finally {
      if (!background) setLoading(false);
    }
  }, [selectedClanId]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const paymentDueDays = Math.max(
    1,
    Number(spotlightConfig?.payment_instruction_expiry_days || PAYMENT_DUE_DAYS)
  );
  const activeSpotlights = useMemo(() => {
    const now = Date.now();
    return spotlights.filter((item) => {
      const raw = firstTruthy(item.expires_at);
      if (!raw) return true;
      const parsed = new Date(raw).getTime();
      return !Number.isFinite(parsed) || parsed > now;
    });
  }, [spotlights]);
  const activePaidSpotlights = useMemo(
    () => activeSpotlights.filter((item) => firstTruthy(item.priority_mode, "free").toLowerCase() === "paid"),
    [activeSpotlights]
  );
  const spotlightPayments = useMemo(
    () => expectedPayments.filter((item) => firstTruthy(item.expected_type).toLowerCase() === "spotlight_subscription"),
    [expectedPayments]
  );
  const createdReference = firstTruthy(
    createdInstruction?.reference_display,
    (createdInstruction as any)?.reference
  );
  const latestPayment =
    (createdReference
      ? spotlightPayments.find(
          (item) =>
            firstTruthy(item.reference_display, (item as any)?.reference) ===
            createdReference
        )
      : null) ||
    spotlightPayments[0] ||
    createdInstruction ||
    null;
  const confirmedCreditCount = useMemo(
    () =>
      spotlightPayments
        .filter(isConfirmedPayment)
        .reduce((total, item) => total + paymentQuantity(item), 0),
    [spotlightPayments]
  );
  const statusReadyCredits = Number(spotlightStatus?.available_paid_credits);
  const usableCredits =
    Number.isFinite(statusReadyCredits) && statusReadyCredits >= 0
      ? statusReadyCredits
      : Math.max(0, confirmedCreditCount - activePaidSpotlights.length);
  const selectedAmount = spotlightCreditAmount(selectedCredits);
  const selectedLabel = formatMoney(selectedAmount, "GBP");
  const currentQuoteKey = quoteKey(selectedCredits);
  const quoteConfirmed = confirmedQuoteKey === currentQuoteKey;
  const agreementText = `${selectedCredits} spotlight credit${selectedCredits === 1 ? "" : "s"} = ${selectedLabel}`;
  const shopName = firstTruthy(shop?.name, me?.display_name, me?.gmfn_id, "Your shop");
  const shopHeroImage = resolveAssetSrc(shop?.image_url);
  const shopClanId = Number(shop?.clan_id || selectedClanId || 0);
  const activePaymentReference = firstTruthy(latestPayment?.reference_display, (latestPayment as any)?.reference);
  const activePaymentAmount = firstTruthy(latestPayment?.amount);
  const activePaymentCurrency = firstTruthy(latestPayment?.currency, "GBP");
  const activePaymentDueAt = firstTruthy(latestPayment?.due_at);
  const settlementMissingText =
    settlementValue(settlement, "missing_field_text") || "Payment setup is not ready for this region yet.";
  const region = settlementValue(settlement, "region_code").toLowerCase();
  const country = settlementValue(settlement, "country").toUpperCase();
  const usesUkSort = region === "uk" || ["GB", "UK", "IM", "JE", "GG"].includes(country);
  const usesUsRouting = region === "united_states" || ["US", "USA"].includes(country);
  const usesIban =
    region === "europe_mena" ||
    ["AE", "BH", "DE", "EG", "ES", "FR", "GB", "IE", "IT", "NL", "QA", "SA", "TR", "UK"].includes(country) ||
    Boolean(settlementValue(settlement, "iban"));
  const localCode = firstTruthy(
    settlementValue(settlement, "bank_code"),
    settlementValue(settlement, "branch_code"),
    settlementValue(settlement, "ifsc_code"),
    settlementValue(settlement, "mobile_money_number")
  );
  const paymentLines = [
    paymentLine("Rail", settlementValue(settlement, "rail_name")),
    paymentLine("Payment networks", settlementValue(settlement, "payment_networks")),
    paymentLine("Bank", settlementValue(settlement, "bank_name")),
    paymentLine("Account name", settlementValue(settlement, "account_name")),
    paymentLine("Account number", settlementValue(settlement, "account_number")),
    paymentLine("Country", settlementValue(settlement, "country")),
    paymentLine("Region profile", settlementValue(settlement, "region_code").replace(/_/g, " ")),
    paymentLine(
      "Sort code / bank code",
      firstTruthy(
        settlementValue(settlement, "sort_code"),
        settlementValue(settlement, "bank_code"),
        settlementValue(settlement, "branch_code"),
        settlementValue(settlement, "ifsc_code"),
        settlementValue(settlement, "mobile_money_number"),
        settlementMissingText
      )
    ),
    usesUkSort ? paymentLine("UK sort code", settlementValue(settlement, "sort_code") || settlementMissingText) : "",
    usesUsRouting ? paymentLine("US routing number", settlementValue(settlement, "routing_number") || settlementMissingText) : "",
    paymentLine("ACH routing", settlementValue(settlement, "ach_routing_number")),
    paymentLine("Wire routing", settlementValue(settlement, "wire_routing_number")),
    usesIban ? paymentLine("IBAN", settlementValue(settlement, "iban") || settlementMissingText) : "",
    usesIban || settlementValue(settlement, "swift_bic")
      ? paymentLine("SWIFT/BIC", settlementValue(settlement, "swift_bic") || settlementMissingText)
      : "",
    localCode ? paymentLine("Local bank/mobile code", localCode) : "",
    paymentLine("Branch name", settlementValue(settlement, "branch_name")),
    paymentLine("Amount", activePaymentAmount ? formatMoney(activePaymentAmount, activePaymentCurrency) : ""),
    paymentLine("Payment code", activePaymentReference),
    paymentLine("Expires", safeDateTime(activePaymentDueAt) || `${paymentDueDays} days after generation`),
  ].filter(Boolean);

  const activePaidCount = Number(spotlightStatus?.active_paid_spotlights);
  const effectiveActivePaidCount =
    Number.isFinite(activePaidCount) && activePaidCount >= 0
      ? activePaidCount
      : activePaidSpotlights.length;
  const canPublishPaid = Boolean(shop?.id) && usableCredits > 0 && effectiveActivePaidCount === 0;
  const hasDraft = Boolean(firstTruthy(message) || imageFile || videoFile);

  async function createPaymentInstruction() {
    if (!shop?.id) {
      showNotice("error", "Shop record is not ready. Open Shop Control first if the shop has not been created.");
      return;
    }
    if (!quoteConfirmed) {
      showNotice("info", `Confirm this quote first: ${agreementText}.`);
      return;
    }
    setCreatingInstruction(true);
    try {
      const result = await apiJson<any>("/api/payment-instructions/spotlight", {
        method: "POST",
        body: JSON.stringify({
          clan_id: Number(shop.clan_id || selectedClanId || 0),
          shop_id: Number(shop.id),
          quantity_total: selectedCredits,
          currency: "GBP",
          visibility_scope: "direct_communities",
        }),
      });
      setCreatedInstruction(result as ExpectedPaymentRecord);
      const reference = firstTruthy(result?.reference_display, result?.reference);
      if (reference) safeCopy(reference);
      await loadPage(true);
      showNotice("success", `Payment code generated for ${agreementText}. Use that exact code in the bank transfer.`);
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Subscription Spotlight payment code could not be generated.");
    } finally {
      setCreatingInstruction(false);
    }
  }

  function copyPaymentDetails() {
    const text = paymentLines.join("\n");
    if (text) {
      safeCopy(text);
      showNotice("success", "Subscription Spotlight payment details copied.");
      return;
    }
    showNotice("info", "Copy is not available in this browser. Use the payment details shown here.");
  }

  async function refreshPaymentStatus() {
    setCheckingPayment(true);
    try {
      await loadPage(true);
      showNotice("info", "Payment status refreshed.");
    } finally {
      setCheckingPayment(false);
    }
  }

  async function prepareImage(file: File | null) {
    imagePrepRef.current += 1;
    const job = imagePrepRef.current;
    if (!file) {
      setImageFile(null);
      return;
    }
    try {
      setPreparingImage(true);
      const prepared = await prepareSpotlightImageFile(file, {
        maxBytes: SPOTLIGHT_MAX_IMAGE_BYTES,
      });
      if (imagePrepRef.current !== job) return;
      setImageFile(prepared.file);
      showNotice("info", prepared.message || "Picture ready for Subscription Spotlight.");
    } catch (err: any) {
      if (imagePrepRef.current !== job) return;
      setImageFile(null);
      showNotice("error", safeStr(err?.message) || "This picture could not be prepared.");
    } finally {
      if (imagePrepRef.current === job) setPreparingImage(false);
    }
  }

  async function prepareVideo(file: File | null) {
    videoPrepRef.current += 1;
    const job = videoPrepRef.current;
    if (!file) {
      setVideoFile(null);
      setVideoDurationSeconds(null);
      return;
    }
    try {
      setPreparingVideo(true);
      const prepared = await prepareSpotlightVideoFile(file, {
        maxBytes: SPOTLIGHT_MAX_VIDEO_BYTES,
        maxDurationSeconds: SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
      });
      if (videoPrepRef.current !== job) return;
      setVideoFile(prepared.file);
      setVideoDurationSeconds(prepared.durationSeconds ?? null);
      showNotice("info", prepared.message || "Video ready for Subscription Spotlight.");
    } catch (err: any) {
      if (videoPrepRef.current !== job) return;
      const canUseOriginal =
        Number(file.size || 0) <= SPOTLIGHT_MAX_VIDEO_BYTES;
      if (canUseOriginal) {
        setVideoFile(file);
        setVideoDurationSeconds(null);
        showNotice("info", "This phone could not trim the video automatically, so GSN will use the selected video and play it as a short spotlight clip.");
        return;
      }
      setVideoFile(null);
      setVideoDurationSeconds(null);
      showNotice("error", safeStr(err?.message) || "This video could not be prepared.");
    } finally {
      if (videoPrepRef.current === job) setPreparingVideo(false);
    }
  }

  async function publishSpotlight() {
    if (publishing) {
      showNotice("info", "Subscription Spotlight publish is already running.");
      return;
    }

    rememberPublishRecovery(
      routeWithCommunity(APP_ROUTES.SUBSCRIPTION_SPOTLIGHT, shopClanId || selectedClanId || 0),
      "subscription-spotlight.publish"
    );

    if (identityBlocked) {
      showNotice("error", "Identity review is blocking paid spotlight publishing. Complete identity review first, then return here.");
      return;
    }
    if (!canPublishPaid) {
      if (activePaidSpotlights.length > 0) {
        showNotice("info", "A paid spotlight is already live for this shop. Wait for it to finish before starting another one.");
      } else {
        showNotice("info", "Generate the payment code, pay by bank transfer, and wait for confirmation before publishing.");
      }
      return;
    }
    if (preparingImage || preparingVideo) {
      showNotice("info", "Please wait while GSN prepares the selected media, then publish again.");
      return;
    }
    if (!hasDraft) {
      showNotice("error", "Add a short message, picture, or video before publishing.");
      return;
    }
    setPublishing(true);
    try {
      let imageUrl = "";
      let videoUrl = "";
      if (imageFile) {
        const res = await uploadMarketplaceImageFile(imageFile, shopClanId || null);
        imageUrl = firstTruthy(res?.image_url, res?.url, res?.file_url, res?.path, res?.item?.image_url, res?.data?.image_url);
        if (!imageUrl) throw new Error("Image upload completed but did not return a usable image link.");
      }
      if (videoFile) {
        const res = await uploadMarketplaceVideoFile(videoFile, videoDurationSeconds, shopClanId || null);
        videoUrl = firstTruthy(res?.video_url, res?.url, res?.file_url, res?.path, res?.item?.video_url, res?.data?.video_url);
        if (!videoUrl) throw new Error("Video upload completed but did not return a usable video link.");
      }
      await createMarketplaceBroadcast({
        clan_id: shopClanId,
        shop_id: Number(shop?.id || 0),
        message: firstTruthy(message, "Subscription Spotlight update"),
        image_url: imageUrl || null,
        video_url: videoUrl || null,
        priority_mode: "paid",
        visibility_scope: "direct_communities",
      });
      setMessage("");
      setImageFile(null);
      setVideoFile(null);
      setVideoDurationSeconds(null);
      await loadPage(true);
      showNotice("success", videoUrl ? "Subscription Spotlight published with video." : "Subscription Spotlight published.");
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Subscription Spotlight could not be published.");
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div style={pageShell(isCompact)}>
        <section style={brandPageCard()}>
          <div style={brandHelperText()}>Loading Subscription Spotlight...</div>
        </section>
      </div>
    );
  }

  return (
    <div style={pageShell(isCompact)}>
      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={{
          ...brandPageCard(
            "radial-gradient(circle at 84% 10%, rgba(74,121,165,0.28), transparent 30%), linear-gradient(150deg, #06111F 0%, #082039 45%, #123E65 100%)"
          ),
          padding: isCompact ? 22 : 30,
          border: "1px solid rgba(243,208,106,0.22)",
          boxShadow: "0 28px 62px rgba(2,12,27,0.30), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 320px", gap: 26, alignItems: "center" }}>
          <div>
            <div style={{ ...brandSectionLabel(), color: gmfnBrand.colors.gold }}>💳 SHOP CONTROL</div>
            <h1 style={{ margin: "16px 0 0", color: "#FFFFFF", fontSize: isCompact ? 30 : 38, lineHeight: 1.04, fontWeight: 950, textTransform: "uppercase" }}>
              ⭐ Subscription Spotlight
            </h1>
            <div style={{ marginTop: 12, color: "#F8FBFF", fontSize: isCompact ? 22 : 28, lineHeight: 1.1, fontWeight: 950 }}>
              {shopName}
            </div>
            <div style={{ marginTop: 14, color: "#E8F1FA", fontSize: isCompact ? 16 : 18, lineHeight: 1.55, maxWidth: 640, fontWeight: 760 }}>
              Paid priority for one clear shop update. Choose credits, confirm the exact price, pay through the bank rail, then publish from this page only.
            </div>
            <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span style={heroBadge(true)}>⭐ Subscription Spotlight</span>
              <span style={heroBadge(usableCredits > 0)}>✅ {usableCredits} ready credit{usableCredits === 1 ? "" : "s"}</span>
              <span style={heroBadge(effectiveActivePaidCount > 0)}>📣 Live paid: {effectiveActivePaidCount}</span>
              <span style={heroBadge(false)}>⏳ One paid run at a time</span>
            </div>
          </div>
          <div
            style={{
              minHeight: 220,
              borderRadius: 24,
              border: "1px solid rgba(243,208,106,0.26)",
              background: "linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05))",
              position: "relative",
              overflow: "hidden",
              display: "grid",
              placeItems: "center",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 34px rgba(0,0,0,0.16)",
            }}
          >
            {shopHeroImage ? (
              <img src={shopHeroImage} alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.24, pointerEvents: "none" }} />
            ) : null}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(180deg, rgba(6,17,31,0.36), rgba(6,17,31,0.78))" }} />
            <div style={{ position: "relative", width: 118, height: 118, borderRadius: 999, border: "1px solid rgba(243,208,106,0.42)", display: "grid", placeItems: "center", background: "radial-gradient(circle at 36% 28%, rgba(255,255,255,0.24), transparent 28%), linear-gradient(180deg, #174C78, #071424)", color: "#F3D06A", fontSize: 58, fontWeight: 950 }}>
              S
            </div>
            <div style={{ position: "absolute", left: 18, right: 18, bottom: 18, textAlign: "center", color: "#FFFFFF", fontWeight: 950, fontSize: 20 }}>
              ⭐ Priority spotlight
            </div>
          </div>
        </div>
      </section>

      <section style={{ ...brandPageCard(), padding: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr" }}>
          <div style={{ padding: isCompact ? 20 : 24, borderRight: isCompact ? "none" : `1px solid ${gmfnBrand.colors.line}` }}>
            <div style={sectionTitle()}>1. ⭐ Activate spotlight credits</div>
            <div style={{ marginTop: 12, ...brandHelperText(), fontWeight: 760 }}>
              Choose the number of paid spotlight credits you want now. Each confirmed credit lets you publish one paid spotlight run.
            </div>
            <div style={{ marginTop: 14, ...brandInnerCard("linear-gradient(180deg, #FFF9E7 0%, #FFFFFF 100%)") }}>
              <div style={{ ...brandSectionLabel(), color: "#8A640E" }}>🏷️ Pricing rule</div>
              <div style={{ marginTop: 6, color: gmfnBrand.colors.ink, fontWeight: 900, lineHeight: 1.45 }}>
                1-5 credits are GBP 1 each. The 6-credit bundle is GBP 5.
              </div>
            </div>
            <div role="radiogroup" aria-label="Spotlight credits" style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              {[1, 2, 3, 4, 5, 6].map((credit) => {
                const selected = selectedCredits === credit;
                return (
                  <SecondaryButton
                    key={credit}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setSelectedCredits(credit);
                      setConfirmedQuoteKey("");
                    }}
                    stableHeight={74}
                    debugId={`subscription-spotlight.credit.${credit}`}
                    style={slotButton(selected)}
                  >
                    <span style={{ fontSize: 20, fontWeight: 950 }}>{credit}</span>
                    <span style={{ fontSize: 12, fontWeight: 900 }}>credit{credit === 1 ? "" : "s"}</span>
                  </SecondaryButton>
                );
              })}
            </div>
          </div>

          <div style={{ padding: isCompact ? 20 : 24, background: "linear-gradient(180deg, rgba(250,253,255,0.96), rgba(239,246,253,0.94))" }}>
            <div style={{ ...brandSectionLabel(), color: gmfnBrand.colors.accent }}>💳 Payment preview</div>
            <div style={{ marginTop: 16, color: gmfnBrand.colors.ink, fontSize: 24, fontWeight: 950 }}>
              {selectedCredits} credit{selectedCredits === 1 ? "" : "s"} selected = {selectedLabel}
            </div>
            <div style={{ marginTop: 14, ...brandHelperText(), fontWeight: 760 }}>
              Confirm this quote first. GSN will generate the payment code against this exact credit count and amount so the bank rail can cross-check the transfer.
            </div>
            <PrimaryButton
              type="button"
              onClick={() => {
                setConfirmedQuoteKey(currentQuoteKey);
                showNotice("success", `Subscription Spotlight quote confirmed: ${agreementText}.`);
              }}
              stableHeight={62}
              debugId="subscription-spotlight.confirm-quote"
              style={{ ...brandActionButton("primary"), marginTop: 18, minHeight: 62, width: "100%" }}
            >
              ✅ Agree: {agreementText}
            </PrimaryButton>
            <SecondaryButton
              type="button"
              onClick={() => void createPaymentInstruction()}
              disabled={creatingInstruction || !shop?.id}
              busy={creatingInstruction}
              busyLabel="Generating payment code..."
              stableHeight={54}
              debugId="subscription-spotlight.generate-payment-code"
              style={{ ...brandActionButton("secondary", creatingInstruction || !shop?.id), marginTop: 10, minHeight: 54, width: "100%" }}
            >
              {creatingInstruction ? "Generating payment code..." : "🔐 Generate payment code"}
            </SecondaryButton>
            <div style={{ marginTop: 14, ...brandHelperText(), fontWeight: 820 }}>
              Payment instructions expire {paymentDueDays} days after generation. Payment goes to the GSN platform account, not the community.
            </div>
            {identityBlocked ? (
              <div style={{ marginTop: 14, ...noticeCard("info") }}>
                Identity review may block paid publishing, but the payment quote and bank instruction still remain visible here.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section style={brandPageCard()}>
        <div style={sectionTitle()}>2. 🏦 Payment code and bank transfer</div>
        {latestPayment ? (
          <>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr", gap: 14 }}>
              {[paymentLines.slice(0, Math.ceil(paymentLines.length / 2)), paymentLines.slice(Math.ceil(paymentLines.length / 2))].map((group, groupIndex) => (
                <div key={groupIndex} style={{ border: `1px solid ${gmfnBrand.colors.lineStrong}`, borderRadius: 18, overflow: "hidden", background: "linear-gradient(180deg, #FFFFFF 0%, #F7FBFF 100%)" }}>
                  {group.map((line) => {
                    const [label, ...rest] = line.split(":");
                    const value = rest.join(":").trim();
                    return (
                      <div key={line} style={{ display: "grid", gridTemplateColumns: "minmax(112px, 0.42fr) minmax(0, 0.58fr)", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${gmfnBrand.colors.line}` }}>
                        <div style={{ color: gmfnBrand.colors.inkSoft, fontWeight: 900, fontSize: 13 }}>{label}</div>
                        <div style={{ color: gmfnBrand.colors.ink, fontWeight: 900, overflowWrap: "anywhere", fontSize: 13 }}>{value}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, ...actionGrid(isCompact, 170) }}>
              <SecondaryButton
                type="button"
                onClick={copyPaymentDetails}
                style={brandActionButton("secondary", paymentLines.length === 0)}
                disabled={paymentLines.length === 0}
                debugId="subscription-spotlight.copy-payment-details"
              >
                📋 Copy payment details
              </SecondaryButton>
              <SubtleButton
                type="button"
                onClick={() => void refreshPaymentStatus()}
                disabled={checkingPayment}
                busy={checkingPayment}
                busyLabel="Checking..."
                style={brandActionButton("soft", checkingPayment)}
                debugId="subscription-spotlight.check-payment-status"
              >
                {checkingPayment ? "Checking..." : "🔎 Check payment status"}
              </SubtleButton>
            </div>
          </>
        ) : (
          <div style={{ marginTop: 14, ...noticeCard("info") }}>
            Select credits, agree to the visible quote, then generate the payment code. The bank details will stay here until the instruction is paid, expired, or replaced.
          </div>
        )}
      </section>

      <section style={brandPageCard()}>
        <div style={sectionTitle()}>3. 📣 Publish Subscription Spotlight</div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={brandBadge(usableCredits > 0)}>✅ {usableCredits} ready credit{usableCredits === 1 ? "" : "s"}</span>
          <span style={brandBadge(effectiveActivePaidCount > 0)}>📣 Live paid: {effectiveActivePaidCount}</span>
          <span style={brandBadge(canPublishPaid)}>📝 Publisher: {canPublishPaid ? "Open" : "Waiting"}</span>
        </div>
        {activePaidSpotlights.length > 0 ? (
          <div style={{ marginTop: 14, ...brandInnerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)") }}>
            <div style={brandSectionLabel()}>📣 Live paid spotlight</div>
            <div style={{ marginTop: 8, color: gmfnBrand.colors.ink, fontWeight: 950, fontSize: 18 }}>
              {firstTruthy(activePaidSpotlights[0]?.message, "A paid spotlight is live for this shop.")}
            </div>
            <div style={{ marginTop: 8, ...brandHelperText() }}>
              Wait for the live paid spotlight to finish before opening another paid run.
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 340px", gap: 14 }}>
          <div style={{ ...brandInnerCard(), display: "grid", gap: 12 }}>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write the paid spotlight message people should see first." style={textAreaStyle()} />
            <input type="file" accept="image/*" onChange={(event) => void prepareImage(event.target.files?.[0] || null)} style={inputStyle()} />
            <input type="file" accept="video/*,.mp4,.webm,.mov" onChange={(event) => void prepareVideo(event.target.files?.[0] || null)} style={inputStyle()} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={brandBadge(Boolean(imageFile))}>{imageFile ? "🖼️ Picture ready" : "🖼️ Picture optional"}</span>
              <span style={brandBadge(Boolean(videoFile))}>{videoFile ? "🎬 Video ready" : "🎬 Video optional"}</span>
              {(preparingImage || preparingVideo) ? <span style={brandBadge(false)}>⚙️ Preparing media</span> : null}
            </div>
            <PrimaryButton
              type="button"
              onClick={() => void publishSpotlight()}
              disabled={publishing}
              busy={publishing}
              busyLabel="Publishing..."
              stableHeight={58}
              debugId="subscription-spotlight.publish"
              style={{ ...brandActionButton("primary", publishing), minHeight: 58 }}
            >
              {publishing ? "Publishing..." : "📣 Publish Subscription Spotlight"}
            </PrimaryButton>
          </div>
          <div style={{ ...brandInnerCard("linear-gradient(145deg, #071424 0%, #0D2640 48%, #173A5C 100%)"), border: "1px solid rgba(243,208,106,0.20)" }}>
            <div style={{ ...brandSectionLabel(), color: gmfnBrand.colors.gold }}>👀 Preview</div>
            <div style={{ marginTop: 12, borderRadius: 18, overflow: "hidden", minHeight: 220, background: "#061827" }}>
              {imagePreviewUrl || videoPreviewUrl ? (
                <SpotlightMediaFrame
                  imageUrl={resolveAssetSrc(imagePreviewUrl)}
                  videoUrl={resolveAssetSrc(videoPreviewUrl)}
                  videoPoster={resolveAssetSrc(imagePreviewUrl) || undefined}
                  alt="Subscription Spotlight preview"
                  frameStyle={{ width: "100%", minHeight: 220, height: 220, borderRadius: 18, border: "none" }}
                  mediaStyle={{ width: "100%", height: "100%", objectFit: "cover" }}
                  showVideoControls
                  showAudioUnlock={Boolean(videoPreviewUrl)}
                  audioUnlockLabel="Sound on"
                />
              ) : (
                <div style={{ height: 220, display: "grid", placeItems: "center", color: "#FFFFFF", fontWeight: 900, textAlign: "center", padding: 18 }}>
                  Preview appears here after media is selected.
                </div>
              )}
            </div>
            <div style={{ marginTop: 12, color: "#E8F1FA", fontSize: 13, lineHeight: 1.55, fontWeight: 760 }}>
              Paid spotlight uses the same media law as Free Spotlight and Vault: muted motion first, then a clear Sound on control for video.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
