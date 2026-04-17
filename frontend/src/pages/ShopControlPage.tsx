import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import { getMe, getSelectedClanId } from "../lib/api";

type ShopRecord = {
  id: number;
  clan_id?: number | null;
  owner_user_id?: number | null;
  gmfn_id?: string | null;
  name?: string | null;
  description?: string | null;
  whatsapp_number?: string | null;
  telegram_handle?: string | null;
  image_url?: string | null;
  marketplace_name?: string | null;
  is_active?: boolean;
  created_at?: string | null;
};

type ProductRecord = {
  id: number;
  shop_id: number;
  clan_id?: number;
  name?: string | null;
  description?: string | null;
  price?: string | null;
  currency?: string | null;
  image_url?: string | null;
  visibility_mode?: string | null;
  is_active?: boolean;
  created_at?: string | null;
};

type BroadcastRecord = {
  id: number;
  shop_id?: number | null;
  message?: string | null;
  image_url?: string | null;
  priority_mode?: string | null;
  visibility_scope?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
};

type VaultLinkRecord = {
  id: number;
  shop_id: number;
  token?: string | null;
  status?: string | null;
  expires_at?: string | null;
  max_views?: number | null;
  views_used?: number | null;
  allow_download?: boolean;
  allow_print?: boolean;
  allow_reshare?: boolean;
  watermark_enabled?: boolean;
  frontend_hint_path?: string | null;
  api_view_url?: string | null;
};

type ExpectedPaymentRecord = {
  id?: number;
  expected_type?: string | null;
  amount?: string | null;
  currency?: string | null;
  reference_display?: string | null;
  status?: string | null;
  due_at?: string | null;
  matched_bank_event_id?: number | null;
  confirmed_at?: string | null;
  meta?: any;
};

type TrustSlipFeatureSummary = {
  merchant_verify_active?: boolean | null;
  merchant_verify_subscription_required?: boolean | null;
  merchant_verify_detail?: string | null;
  public_verify_url?: string | null;
  code?: string | null;
  verification_code?: string | null;
  token?: string | null;
};

type NoticeTone = "success" | "error" | "info";

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

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 14px 34px rgba(15,23,42,0.045), 0 2px 8px rgba(15,23,42,0.02)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5D7389",
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function safeDateTime(value: unknown): string {
  const raw = safeStr(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleString();
}

function featureProofLine(
  payment: ExpectedPaymentRecord | null | undefined,
  options: {
    active: boolean;
    activeText: string;
    awaitingText: string;
    confirmedText: string;
  }
): string {
  if (options.active) return options.activeText;
  if (!payment) return options.awaitingText;
  if (safeStr(payment.confirmed_at)) return options.confirmedText;
  return `Waiting for payment confirmation after reference ${firstTruthy(
    payment.reference_display,
    "is issued"
  )}.`;
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function actionBtn(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  if (kind === "primary") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 42,
      padding: "10px 14px",
      borderRadius: 14,
      border: "none",
      background: disabled ? "#CBD5E1" : "#0B63D1",
      color: "#FFFFFF",
      fontWeight: 900,
      fontSize: 14,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
    };
  }

  if (kind === "soft") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 38,
      padding: "8px 12px",
      borderRadius: 12,
      border: "1px solid rgba(11,31,51,0.08)",
      background: "#F8FBFF",
      color: disabled ? "#94A3B8" : "#24415C",
      fontWeight: 800,
      fontSize: 13,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    opacity: disabled ? 0.86 : 1,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    padding: "11px 12px",
    fontSize: 14,
    color: "#0B1F33",
    outline: "none",
    boxSizing: "border-box",
  };
}

function textAreaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 96,
    resize: "vertical",
    lineHeight: 1.6,
  };
}

function statTile(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    padding: 14,
  };
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  if (tone === "success") {
    return {
      ...softCard("#F3FBF5"),
      color: "#166534",
      border: "1px solid rgba(34,197,94,0.16)",
      fontWeight: 800,
    };
  }

  if (tone === "error") {
    return {
      ...softCard("#FEF2F2"),
      color: "#991B1B",
      border: "1px solid rgba(239,68,68,0.16)",
      fontWeight: 800,
    };
  }

  return {
    ...softCard("#F8FBFF"),
    color: "#24415C",
    border: "1px solid rgba(11,31,51,0.08)",
    fontWeight: 800,
  };
}

function getToken(): string {
  try {
    return localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers || {});
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });

  const text = await res.text();
  const contentType = String(res.headers.get("content-type") || "").toLowerCase();

  if (!res.ok) {
    try {
      const parsed = text ? JSON.parse(text) : {};
      throw new Error(parsed?.detail || parsed?.message || text || `HTTP ${res.status}`);
    } catch {
      throw new Error(text || `HTTP ${res.status}`);
    }
  }

  if (!text) return {} as T;
  if (contentType.includes("application/json")) return JSON.parse(text) as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return { raw: text } as T;
  }
}

async function uploadShopImageFile(file: File): Promise<string> {
  const token = getToken();
  const routes = [
    "/api/marketplace-media/upload-image",
    "/api/marketplace-media/images",
    "/api/marketplace-media/upload",
  ];

  for (const route of routes) {
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(route, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
        credentials: "include",
      });

      if (!res.ok) continue;
      const data = await res.json().catch(() => ({}));
      const url =
        firstTruthy(
          data?.image_url,
          data?.url,
          data?.path,
          data?.item?.image_url,
          data?.item?.url,
          data?.data?.image_url,
          data?.data?.url
        ) || "";

      if (url) return url;
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    "We could not prepare an image from that upload. Paste an image URL instead and continue."
  );
}

export default function ShopControlPage() {
  const navigate = useNavigate();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
    null
  );

  const [me, setMe] = useState<any>(null);
  const [shop, setShop] = useState<ShopRecord | null>(null);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [spotlights, setSpotlights] = useState<BroadcastRecord[]>([]);
  const [vaultLinks, setVaultLinks] = useState<VaultLinkRecord[]>([]);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [expectedPayments, setExpectedPayments] = useState<ExpectedPaymentRecord[]>([]);
  const [trustSlipFeature, setTrustSlipFeature] = useState<TrustSlipFeatureSummary | null>(
    null
  );
  const [creatingVaultInstruction, setCreatingVaultInstruction] = useState(false);
  const [creatingMerchantVerifyInstruction, setCreatingMerchantVerifyInstruction] =
    useState(false);
  const [creatingSpotlightInstruction, setCreatingSpotlightInstruction] = useState(false);

  const [shopName, setShopName] = useState("");
  const [shopDescription, setShopDescription] = useState("");
  const [whatsApp, setWhatsApp] = useState("");
  const [telegramHandle, setTelegramHandle] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [savingShop, setSavingShop] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [spotlightMessage, setSpotlightMessage] = useState("");
  const [spotlightImageUrl, setSpotlightImageUrl] = useState("");
  const [creatingSpotlight, setCreatingSpotlight] = useState(false);
  const [spotlightPriorityMode, setSpotlightPriorityMode] = useState<"free" | "paid">("free");

  const selectedClanId = Number(getSelectedClanId() || 0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 980);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  async function loadPage() {
    setLoading(true);

    try {
      const meRes = await getMe().catch(() => null);
      setMe(meRes || null);

      const gmfnId = firstTruthy(meRes?.gmfn_id);
      if (!gmfnId) {
        setShop(null);
        setProducts([]);
        setSpotlights([]);
        setVaultLinks([]);
        return;
      }

      const shopRes = await apiJson<any>(
        `/api/marketplace/shops/by-gmfn/${encodeURIComponent(gmfnId)}?clan_id=${selectedClanId || 0}`
      ).catch(() => null);

      const shopItem = (shopRes?.item || null) as ShopRecord | null;
      const shopProducts = Array.isArray(shopRes?.products)
        ? (shopRes.products as ProductRecord[])
        : [];

      setShop(shopItem);
      setProducts(shopProducts);
      setShopName(firstTruthy(shopItem?.name));
      setShopDescription(firstTruthy(shopItem?.description));
      setWhatsApp(firstTruthy(shopItem?.whatsapp_number));
      setTelegramHandle(firstTruthy(shopItem?.telegram_handle));
      setImageUrlInput(firstTruthy(shopItem?.image_url));

      if (shopItem?.id) {
        const expectedPaymentsPath =
          `/api/bank-reconciliation/expected?clan_id=${selectedClanId || 0}&limit=100` +
          (Number(meRes?.id || 0) > 0 ? `&user_id=${Number(meRes?.id)}` : "");

        const [broadcastsRes, vaultLinksRes, privateProductsRes, expectedRes, trustSlipRes] =
          await Promise.all([
          apiJson<any>(
            `/api/marketplace/broadcasts?clan_id=${selectedClanId || 0}&limit=20`
          ).catch(() => ({ items: [] })),
          apiJson<any>(
            `/api/vault-access/links?shop_id=${shopItem.id}`
          ).catch(() => ({ items: [] })),
          apiJson<any>(
            `/api/marketplace/products?clan_id=${selectedClanId || 0}&shop_id=${shopItem.id}&include_private_manage=true&limit=200`
          ).catch(() => ({ items: [] })),
          apiJson<any>(expectedPaymentsPath).catch(() => []),
          apiJson<any>("/api/trust-slips/me").catch(() => null),
        ]);

        const visibleSpotlights = Array.isArray(broadcastsRes?.items)
          ? (broadcastsRes.items as BroadcastRecord[]).filter(
              (item) => Number(item?.shop_id || 0) === Number(shopItem.id)
            )
          : [];

        const privateManagedProducts = Array.isArray(privateProductsRes?.items)
          ? (privateProductsRes.items as ProductRecord[])
          : [];

        setProducts(privateManagedProducts.length > 0 ? privateManagedProducts : shopProducts);
        setSpotlights(visibleSpotlights);
        setVaultLinks(
          Array.isArray(vaultLinksRes?.items) ? (vaultLinksRes.items as VaultLinkRecord[]) : []
        );
        setExpectedPayments(
          Array.isArray(expectedRes)
            ? (expectedRes as ExpectedPaymentRecord[])
            : Array.isArray(expectedRes?.items)
              ? (expectedRes.items as ExpectedPaymentRecord[])
              : []
        );
        setTrustSlipFeature((trustSlipRes || null) as TrustSlipFeatureSummary | null);
      } else {
        setSpotlights([]);
        setVaultLinks([]);
        setExpectedPayments([]);
        setTrustSlipFeature(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();

    const timer = window.setInterval(() => {
      void loadPage();
    }, 60000);

    function handleFocusRefresh() {
      void loadPage();
    }

    function handleVisibilityRefresh() {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void loadPage();
      }
    }

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [selectedClanId]);

  const publicProducts = useMemo(
    () =>
      products.filter(
        (item) =>
          firstTruthy(item?.visibility_mode, "community_visible") === "community_visible" &&
          item?.is_active !== false
      ),
    [products]
  );

  const vaultProducts = useMemo(
    () =>
      products.filter(
        (item) =>
          firstTruthy(item?.visibility_mode, "community_visible") === "vault_private" &&
          item?.is_active !== false
      ),
    [products]
  );

  const activeSpotlights = useMemo(() => {
    const now = Date.now();
    return spotlights.filter((item) => {
      const expiresRaw = safeStr(item?.expires_at);
      if (!expiresRaw) return true;
      const parsed = new Date(expiresRaw);
      if (Number.isNaN(parsed.getTime())) return true;
      return parsed.getTime() > now;
    });
  }, [spotlights]);

  const currentActiveSpotlight = useMemo(() => {
    if (activeSpotlights.length === 0) return null;

    return [...activeSpotlights].sort((a, b) => {
      const aTime = new Date(safeStr(a?.created_at || "")).getTime();
      const bTime = new Date(safeStr(b?.created_at || "")).getTime();
      const safeATime = Number.isFinite(aTime) ? aTime : 0;
      const safeBTime = Number.isFinite(bTime) ? bTime : 0;
      return safeBTime - safeATime;
    })[0];
  }, [activeSpotlights]);

  const publicShopLink = useMemo(() => {
    const gmfnId = firstTruthy(shop?.gmfn_id, me?.gmfn_id);
    if (!gmfnId || typeof window === "undefined") return "";
    return `${window.location.origin}/shop/${encodeURIComponent(gmfnId)}`;
  }, [shop, me]);

  const communityName = useMemo(() => {
    return firstTruthy(
      shop?.marketplace_name,
      shop?.clan_id ? `Community ${shop.clan_id}` : "",
      "Selected community"
    );
  }, [shop]);

  const featurePayments = useMemo(() => {
    return expectedPayments.filter((item) =>
      ["vault_subscription", "merchant_verify_subscription", "spotlight_subscription"].includes(
        firstTruthy(item?.expected_type).toLowerCase()
      )
    );
  }, [expectedPayments]);

  const latestVaultPayment = useMemo(
    () =>
      featurePayments.find(
        (item) => firstTruthy(item?.expected_type).toLowerCase() === "vault_subscription"
      ) || null,
    [featurePayments]
  );

  const latestMerchantVerifyPayment = useMemo(
    () =>
      featurePayments.find(
        (item) =>
          firstTruthy(item?.expected_type).toLowerCase() === "merchant_verify_subscription"
      ) || null,
    [featurePayments]
  );

  const latestSpotlightPayment = useMemo(
    () =>
      featurePayments.find(
        (item) => firstTruthy(item?.expected_type).toLowerCase() === "spotlight_subscription"
      ) || null,
    [featurePayments]
  );

  const activePaidSpotlights = useMemo(
    () =>
      activeSpotlights.filter(
        (item) => firstTruthy(item?.priority_mode, "free").toLowerCase() === "paid"
      ),
    [activeSpotlights]
  );

  const vaultProofText = useMemo(
    () =>
      featureProofLine(latestVaultPayment, {
        active: vaultProducts.length > 0 || vaultLinks.length > 0,
        activeText:
          "Vault is active. You can now add private offers and share access links.",
        awaitingText:
          "Vault is not active yet. Start a Vault payment request first.",
        confirmedText:
          "Vault payment is confirmed. You can now add private offers.",
      }),
    [latestVaultPayment, vaultLinks.length, vaultProducts.length]
  );

  const merchantVerifyProofText = useMemo(
    () =>
      featureProofLine(latestMerchantVerifyPayment, {
        active: Boolean(trustSlipFeature?.merchant_verify_active),
        activeText:
          "Merchant Verify is active. Outside merchants can now rely on your verification page.",
        awaitingText:
          "Merchant Verify is not active yet. Start the payment request first.",
        confirmedText:
          "Merchant Verify payment is confirmed. Your verification page should now be active for outside merchants.",
      }),
    [latestMerchantVerifyPayment, trustSlipFeature?.merchant_verify_active]
  );

  const spotlightProofText = useMemo(
    () =>
      featureProofLine(latestSpotlightPayment, {
        active: activePaidSpotlights.length > 0,
        activeText:
          "Paid spotlight is active. Your shop now has priority visibility.",
        awaitingText:
          "No paid spotlight is active yet. Start the spotlight payment request first.",
        confirmedText:
          "Spotlight payment is confirmed. You can now start one paid spotlight for this shop.",
      }),
    [activePaidSpotlights.length, latestSpotlightPayment]
  );

  const vaultStateLabel = vaultProducts.length > 0 || vaultLinks.length > 0
    ? "Usable now"
    : safeStr(latestVaultPayment?.confirmed_at)
      ? "Confirmed"
      : latestVaultPayment
        ? "Awaiting confirmation"
        : "No payment request";

  const merchantVerifyStateLabel = Boolean(trustSlipFeature?.merchant_verify_active)
    ? "Usable now"
    : safeStr(latestMerchantVerifyPayment?.confirmed_at)
      ? "Confirmed"
      : latestMerchantVerifyPayment
        ? "Awaiting confirmation"
        : "No payment request";

  const spotlightStateLabel = activePaidSpotlights.length > 0
    ? "Usable now"
    : safeStr(latestSpotlightPayment?.confirmed_at)
      ? "Confirmed"
      : latestSpotlightPayment
        ? "Awaiting confirmation"
        : "No payment request";

  const canStartPaidSpotlight = Boolean(
    safeStr(latestSpotlightPayment?.confirmed_at) && activePaidSpotlights.length === 0
  );

  const spotlightNextAction = useMemo(() => {
    if (activePaidSpotlights.length > 0) {
      return {
        title: "Wait for the current paid spotlight to conclude",
        detail:
          "A paid spotlight is already live for this shop. Keep monitoring the live view until it expires, then start another paid run if needed.",
      };
    }

    if (canStartPaidSpotlight) {
      return {
        title: "Open spotlight tools and publish the paid run",
        detail:
          "Payment has been confirmed. Switch the spotlight composer to paid mode and publish when the message and image are ready.",
      };
    }

    if (latestSpotlightPayment) {
      return {
        title: "Complete payment and wait for reconciliation",
        detail:
          "The paid spotlight entitlement is not active yet. Use the payment reference, then return here after bank reconciliation reaches the backend.",
      };
    }

    return {
      title: "Start a paid spotlight payment request",
      detail:
        "Create the payment instruction first. After confirmation, this page will unlock the paid publish path for the shop.",
    };
  }, [activePaidSpotlights.length, canStartPaidSpotlight, latestSpotlightPayment]);

  useEffect(() => {
    if (spotlightPriorityMode === "paid" && !canStartPaidSpotlight) {
      setSpotlightPriorityMode("free");
    }
  }, [canStartPaidSpotlight, spotlightPriorityMode]);

  function copyText(text: string, successMessage: string) {
    if (!text) {
      showNotice("error", "Nothing to copy yet.");
      return;
    }

    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(text);
    }
    showNotice("success", successMessage);
  }

  async function createVaultInstruction(quantityTotal: 1 | 6) {
    if (!shop?.id) {
      showNotice("error", "Shop record is not available.");
      return;
    }

    setCreatingVaultInstruction(true);
    try {
      const result = await apiJson<any>("/api/payment-instructions/vault", {
        method: "POST",
        body: JSON.stringify({
          clan_id: Number(shop?.clan_id || selectedClanId || 0),
          shop_id: Number(shop.id),
          quantity_total: quantityTotal,
          currency: "GBP",
        }),
      });

      await loadPage();
      copyText(
        firstTruthy(result?.reference_display, result?.reference),
        "Vault payment reference copied."
      );
      showNotice(
        "success",
        `Vault payment request created for ${quantityTotal} slot${quantityTotal > 1 ? "s" : ""}.`
      );
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Vault payment request could not be created.");
    } finally {
      setCreatingVaultInstruction(false);
    }
  }

  async function createMerchantVerifyInstruction() {
    if (!shop?.id) {
      showNotice("error", "Shop record is not available.");
      return;
    }

    setCreatingMerchantVerifyInstruction(true);
    try {
      const result = await apiJson<any>("/api/payment-instructions/merchant-verify", {
        method: "POST",
        body: JSON.stringify({
          clan_id: Number(shop?.clan_id || selectedClanId || 0),
          shop_id: Number(shop.id),
          amount: "1.00",
          currency: "GBP",
        }),
      });

      await loadPage();
      copyText(
        firstTruthy(result?.reference_display, result?.reference),
        "Merchant Verify payment reference copied."
      );
      showNotice("success", "Merchant Verify payment request created.");
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Merchant Verify payment request could not be created."
      );
    } finally {
      setCreatingMerchantVerifyInstruction(false);
    }
  }

  async function createSpotlightInstruction() {
    if (!shop?.id) {
      showNotice("error", "Shop record is not available.");
      return;
    }

    setCreatingSpotlightInstruction(true);
    try {
      const result = await apiJson<any>("/api/payment-instructions/spotlight", {
        method: "POST",
        body: JSON.stringify({
          clan_id: Number(shop?.clan_id || selectedClanId || 0),
          shop_id: Number(shop.id),
          amount: "1.00",
          quantity_total: 1,
          currency: "GBP",
          visibility_scope: "direct_communities",
        }),
      });

      await loadPage();
      copyText(
        firstTruthy(result?.reference_display, result?.reference),
        "Spotlight payment reference copied."
      );
      showNotice("success", "Paid spotlight payment request created.");
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Paid spotlight payment request could not be created."
      );
    } finally {
      setCreatingSpotlightInstruction(false);
    }
  }

  async function saveShopDetails(extra?: Partial<ShopRecord> & { clear_image?: boolean }) {
    if (!shop?.id) {
      showNotice("error", "Shop record is not available yet.");
      return;
    }

    setSavingShop(true);

    try {
      const body: any = {
        name: safeStr(extra?.name ?? shopName),
        description: safeStr(extra?.description ?? shopDescription) || null,
        whatsapp_number: safeStr(extra?.whatsapp_number ?? whatsApp) || null,
        telegram_handle: safeStr(extra?.telegram_handle ?? telegramHandle) || null,
      };

      if (extra?.clear_image) {
        body.clear_image = true;
      } else if (extra && "image_url" in extra) {
        body.image_url = safeStr(extra.image_url) || null;
      } else {
        body.image_url = safeStr(imageUrlInput) || null;
      }

      const res = await apiJson<any>(`/api/marketplace/shops/${shop.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      const updated = (res?.item || shop) as ShopRecord;
      setShop(updated);
      setShopName(firstTruthy(updated?.name));
      setShopDescription(firstTruthy(updated?.description));
      setWhatsApp(firstTruthy(updated?.whatsapp_number));
      setTelegramHandle(firstTruthy(updated?.telegram_handle));
      setImageUrlInput(firstTruthy(updated?.image_url));
      showNotice("success", "Shop control details saved.");
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Shop details could not be saved.");
    } finally {
      setSavingShop(false);
    }
  }

  async function handleFilePicked(file: File | null) {
    if (!file) return;

    setUploadingImage(true);
    try {
      const uploadedUrl = await uploadShopImageFile(file);
      setImageUrlInput(uploadedUrl);
      await saveShopDetails({ image_url: uploadedUrl });
      showNotice("success", "Shop picture uploaded.");
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Shop picture upload failed."
      );
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleCreateSpotlight() {
    if (!shop?.id) {
      showNotice("error", "Shop record is not available.");
      return;
    }

    if (!safeStr(spotlightMessage)) {
      showNotice("error", "Add the spotlight message first.");
      return;
    }

    setCreatingSpotlight(true);

    try {
      await apiJson<any>("/api/marketplace/broadcasts", {
        method: "POST",
        body: JSON.stringify({
          clan_id: Number(shop?.clan_id || selectedClanId || 0),
          shop_id: Number(shop.id),
          message: safeStr(spotlightMessage),
          image_url: safeStr(spotlightImageUrl) || null,
          priority_mode: spotlightPriorityMode,
          visibility_scope: "direct_communities",
        }),
      });

      setSpotlightMessage("");
      setSpotlightImageUrl("");
      setSpotlightPriorityMode("free");
      setSpotlightOpen(false);
      await loadPage();
      showNotice(
        "success",
        `${spotlightPriorityMode === "paid" ? "Paid" : "Free"} spotlight created.`
      );
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Spotlight could not be created."
      );
    } finally {
      setCreatingSpotlight(false);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gap: 18 }}>
        <PageTopNav
          sectionLabel="Shop Control"
          title="Shop Control"
          subtitle="Loading shop control..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/marketplace"
          backLabel="Marketplace"
        />
        <section style={pageCard()}>
          <div style={helperText()}>Loading shop control...</div>
        </section>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        paddingBottom: 40,
        display: "grid",
        gap: 18,
      }}
    >
      <PageTopNav
        sectionLabel="Shop Control"
        title="Shop Control"
        subtitle="Restore the missing shop gallery controls, upload picture control, and keep spotlight compact instead of taking over the page."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/marketplace"
        backLabel="Marketplace"
        nextLinks={[
          { label: "Shop Assets", to: "/app/shop-assets" },
          { label: "TrustSlip", to: "/app/trust-slip" },
          { label: "Marketplace", to: "/app/marketplace" },
        ]}
        utilityLinks={[
          { label: "Community Home", to: "/app/community" },
          { label: "My GSN and I", to: "/app/my-gmfn-and-i" },
        ]}
      />

      <ExplainToggle
        label="What this screen does"
        what="Shop Control is where you manage the shop identity, picture, gallery shortcuts, visibility tools, and spotlight controls for the current shop."
        why="It keeps commercial visibility deliberate, so the shop can stay readable, trusted, and properly prepared before you push it outward."
        next="Check the shop summary first, then use the picture, spotlight, unlock, and detail sections depending on what you need to update."
        tone="light"
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={pageCard(
          "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
        )}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.08fr) 320px",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>Shop summary</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              {firstTruthy(shop?.name, "My Shop")}
            </div>

            <div
              style={{
                marginTop: 12,
                ...helperText(),
                maxWidth: 860,
                color: "#D7E3F1",
              }}
            >
              Keep the main page practical. Picture upload, shop gallery, and asset control
              should remain visible. Spotlight should remain available, but compact.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Community: {communityName}</span>
              <span style={badge(false)}>
                Community ID: {firstTruthy(shop?.clan_id, selectedClanId, "Awaiting issue")}
              </span>
              <span style={badge(false)}>
                GMFN ID: {firstTruthy(shop?.gmfn_id, me?.gmfn_id, "Awaiting issue")}
              </span>
              <span style={badge(false)}>Current page: Shop control</span>
              <span style={badge(false)}>Current step: Manage commerce access</span>
              <span style={badge(false)}>Community slots used: {publicProducts.length} / 12</span>
              <span style={badge(false)}>Vault slots used: {vaultProducts.length} / 6</span>
              <span style={badge(false)}>Active spotlights: {activeSpotlights.length}</span>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <OriginLink to="/app/shop-assets" style={actionBtn("primary")}>
                Open Shop Assets
              </OriginLink>

              <button
                type="button"
                onClick={() => {
                  if (publicShopLink) {
                    window.open(publicShopLink, "_blank", "noopener,noreferrer");
                  }
                }}
                style={actionBtn("secondary", !publicShopLink)}
                disabled={!publicShopLink}
              >
                Open Shop Gallery
              </button>

              <button
                type="button"
                onClick={() => copyText(publicShopLink, "Shop gallery link copied.")}
                style={actionBtn("secondary", !publicShopLink)}
                disabled={!publicShopLink}
              >
                Copy Gallery Link
              </button>

              <OriginLink to="/app/trust-slip" style={actionBtn("soft")}>
                Merchant Verify
              </OriginLink>
            </div>
          </div>

          <div
            style={{
              ...softCard("rgba(255,255,255,0.96)"),
              border: "1px solid rgba(212,175,55,0.14)",
              boxShadow: "0 18px 38px rgba(2,12,27,0.16)",
            }}
          >
            <div style={sectionLabel()}>Compact spotlight panel</div>

            <ExplainToggle
              label="What this panel does"
              what="This keeps the live spotlight available without letting it dominate the whole control page."
              why="You can quickly check whether a spotlight is live, then open it only when you need to inspect or use it."
              next="Open the spotlight when you want to review the current featured item, then close it again to keep the rest of the shop controls in view."
              tone="light"
              style={{ marginTop: 12 }}
            />

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 18,
                lineHeight: 1.35,
              }}
            >
              Spotlight kept smaller
            </div>

            <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
              Spotlight no longer takes over the page. Open it only when needed.
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setSpotlightOpen((prev) => !prev)}
                style={spotlightOpen ? actionBtn("primary") : actionBtn("secondary")}
              >
                {spotlightOpen ? "Close Spotlight" : "Open Spotlight"}
              </button>

              <span style={badge(false)}>{activeSpotlights.length} active</span>
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Commercial unlocks</div>

        <div style={{ marginTop: 10, ...helperText(), maxWidth: 900 }}>
          These controls show the full path clearly: start the payment request, use the exact
          reference, wait for payment confirmation, then use the feature.
        </div>

        <ExplainToggle
          label="How these unlocks work"
          what="These cards show which paid shop capabilities are available and what each one unlocks."
          why="They make the payment-first rule explicit so you can see the commercial path before trying to use a locked feature."
          next="Choose the feature you want, follow its payment or verification step, then return here to confirm the unlock has taken effect."
          tone="light"
          style={{ marginTop: 12 }}
        />

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              ...innerCard("rgba(255,255,255,0.98)"),
              border: "1px solid rgba(212,175,55,0.12)",
              boxShadow: "0 16px 34px rgba(2,12,27,0.10)",
            }}
          >
            <div style={sectionLabel()}>Vault</div>
            <div style={{ marginTop: 10, color: "#0B1F33", fontSize: 18, fontWeight: 900 }}>
              Vault access
            </div>
            <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
              Start with a Vault payment request. Once payment is confirmed, you can add private
              offers and share access links.
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(true)}>Vault slots used: {vaultProducts.length} / 6</span>
              <span style={badge(false)}>Vault links: {vaultLinks.length}</span>
              <span style={badge(false)}>State: {vaultStateLabel}</span>
              <span style={badge(false)}>
                Latest status: {firstTruthy(latestVaultPayment?.status, "No payment request yet")}
              </span>
            </div>
            {latestVaultPayment ? (
              <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                <div style={helperText()}>
                  Reference: {firstTruthy(latestVaultPayment.reference_display, "Awaiting reference")}
                </div>
                <div style={helperText()}>
                  Amount: {firstTruthy(latestVaultPayment.amount, "0.00")}{" "}
                  {firstTruthy(latestVaultPayment.currency, "GBP")}
                </div>
                <div style={helperText()}>
                  Reconciliation:
                  {" "}
                  {safeStr(latestVaultPayment.confirmed_at)
                    ? `Confirmed ${safeDateTime(latestVaultPayment.confirmed_at)}`
                    : firstTruthy(latestVaultPayment.status, "Expected")}
                </div>
                <div style={helperText()}>
                  Bank match: {latestVaultPayment.matched_bank_event_id ? `Bank event ${latestVaultPayment.matched_bank_event_id}` : "Waiting for bank match"}
                </div>
              </div>
            ) : null}
            <div style={{ marginTop: 10, ...helperText() }}>{vaultProofText}</div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void createVaultInstruction(1)}
                disabled={creatingVaultInstruction}
                style={actionBtn("primary", creatingVaultInstruction)}
              >
                {creatingVaultInstruction ? "Creating..." : "Start 1-slot payment"}
              </button>
              <button
                type="button"
                onClick={() => void createVaultInstruction(6)}
                disabled={creatingVaultInstruction}
                style={actionBtn("secondary", creatingVaultInstruction)}
              >
                Start 6-slot payment
              </button>
              <OriginLink to="/app/shop-assets" style={actionBtn("secondary")}>
                Open Shop Assets
              </OriginLink>
            </div>
          </div>

          <div style={innerCard("#FFFFFF")}>
            <div style={sectionLabel()}>Merchant Verify</div>
            <div style={{ marginTop: 10, color: "#0B1F33", fontSize: 18, fontWeight: 900 }}>
              Merchant verification
            </div>
            <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
              This controls whether outside merchants can rely on your TrustSlip verification page.
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(true)}>
                {trustSlipFeature?.merchant_verify_active ? "Active" : "Subscription required"}
              </span>
              <span style={badge(false)}>State: {merchantVerifyStateLabel}</span>
              <span style={badge(false)}>
                Latest status: {firstTruthy(latestMerchantVerifyPayment?.status, "No payment request yet")}
              </span>
            </div>
            <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
              <div style={helperText()}>
                {firstTruthy(
                  trustSlipFeature?.merchant_verify_detail,
                  "Merchant-facing verification is not active yet."
                )}
              </div>
              {latestMerchantVerifyPayment ? (
                <>
                  <div style={helperText()}>
                    Reference: {firstTruthy(latestMerchantVerifyPayment.reference_display, "Awaiting reference")}
                  </div>
                  <div style={helperText()}>
                    Amount: {firstTruthy(latestMerchantVerifyPayment.amount, "0.00")}{" "}
                    {firstTruthy(latestMerchantVerifyPayment.currency, "GBP")}
                  </div>
                  <div style={helperText()}>
                    Reconciliation:
                    {" "}
                    {safeStr(latestMerchantVerifyPayment.confirmed_at)
                      ? `Confirmed ${safeDateTime(latestMerchantVerifyPayment.confirmed_at)}`
                      : firstTruthy(latestMerchantVerifyPayment.status, "Expected")}
                  </div>
                  <div style={helperText()}>
                    Bank match: {latestMerchantVerifyPayment.matched_bank_event_id ? `Bank event ${latestMerchantVerifyPayment.matched_bank_event_id}` : "Waiting for bank match"}
                  </div>
                </>
              ) : null}
            </div>
            <div style={{ marginTop: 10, ...helperText() }}>{merchantVerifyProofText}</div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void createMerchantVerifyInstruction()}
                disabled={creatingMerchantVerifyInstruction}
                style={actionBtn("primary", creatingMerchantVerifyInstruction)}
              >
                {creatingMerchantVerifyInstruction ? "Creating..." : "Start verification payment"}
              </button>
              <OriginLink to="/app/trust-slip" style={actionBtn("secondary")}>
                Open TrustSlip
              </OriginLink>
              {safeStr(trustSlipFeature?.public_verify_url) ? (
                <a
                  href={String(trustSlipFeature?.public_verify_url)}
                  target="_blank"
                  rel="noreferrer"
                  style={actionBtn("secondary")}
                >
                  Open Verify Link
                </a>
              ) : null}
            </div>
          </div>

          <div style={innerCard("#FCFEFF")}>
            <div style={sectionLabel()}>Paid spotlight</div>
            <div style={{ marginTop: 10, color: "#0B1F33", fontSize: 18, fontWeight: 900 }}>
              Paid spotlight
            </div>
            <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
              Free spotlight stays available under the normal limit. Paid spotlight needs its own
              payment and only one paid spotlight can run at a time.
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(true)}>Active paid spotlights: {activePaidSpotlights.length}</span>
              <span style={badge(false)}>State: {spotlightStateLabel}</span>
              <span style={badge(false)}>
                Latest status: {firstTruthy(latestSpotlightPayment?.status, "No payment request yet")}
              </span>
            </div>
            {latestSpotlightPayment ? (
              <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                <div style={helperText()}>
                  Reference: {firstTruthy(latestSpotlightPayment.reference_display, "Awaiting reference")}
                </div>
                <div style={helperText()}>
                  Reconciliation:
                  {" "}
                  {safeStr(latestSpotlightPayment.confirmed_at)
                    ? `Confirmed ${safeDateTime(latestSpotlightPayment.confirmed_at)}`
                    : firstTruthy(latestSpotlightPayment.status, "Expected")}
                </div>
                <div style={helperText()}>
                  Amount: {firstTruthy(latestSpotlightPayment.amount, "0.00")}{" "}
                  {firstTruthy(latestSpotlightPayment.currency, "GBP")}
                </div>
                <div style={helperText()}>
                  Bank match: {latestSpotlightPayment.matched_bank_event_id ? `Bank event ${latestSpotlightPayment.matched_bank_event_id}` : "Waiting for bank match"}
                </div>
              </div>
            ) : null}
            <div style={{ marginTop: 10, ...helperText() }}>{spotlightProofText}</div>
            <div
              style={{
                marginTop: 12,
                ...innerCard("#FFFFFF"),
                border: "1px solid rgba(11,31,51,0.08)",
              }}
            >
              <div style={sectionLabel()}>Current next action</div>
              <div
                style={{
                  marginTop: 10,
                  color: "#0B1F33",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                {spotlightNextAction.title}
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                {spotlightNextAction.detail}
              </div>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void createSpotlightInstruction()}
                disabled={creatingSpotlightInstruction}
                style={actionBtn("primary", creatingSpotlightInstruction)}
              >
                {creatingSpotlightInstruction ? "Creating..." : "Start spotlight payment"}
              </button>
              <button
                type="button"
                onClick={() => setSpotlightOpen(true)}
                style={actionBtn("secondary")}
              >
                Open Spotlight Tools
              </button>
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Shop picture and gallery controls</div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "300px minmax(0, 1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div>
            <div
              style={{
                width: "100%",
                minHeight: 240,
                borderRadius: 28,
                border: "1px solid rgba(212,175,55,0.16)",
                background:
                  "linear-gradient(180deg, #0A1625 0%, #11263B 56%, #193A58 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                padding: 10,
                boxShadow:
                  "0 22px 48px rgba(2,12,27,0.24), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  minHeight: 220,
                  borderRadius: 22,
                  border: "1px solid rgba(212,175,55,0.14)",
                  overflow: "hidden",
                  background:
                    "linear-gradient(180deg, #11263B 0%, #193A58 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    zIndex: 2,
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 30,
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(7,16,28,0.72)",
                    border: "1px solid rgba(212,175,55,0.22)",
                    color: "#F6D77A",
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 0.24,
                    textTransform: "uppercase",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  Release preview
                </div>
                {safeStr(imageUrlInput) ? (
                  <img
                    src={imageUrlInput}
                    alt={firstTruthy(shop?.name, "Shop")}
                    style={{
                      width: "100%",
                      height: 240,
                      borderRadius: 16,
                      border: "1px solid rgba(212,175,55,0.14)",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      padding: 18,
                      textAlign: "center",
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 18,
                      lineHeight: 1.35,
                    }}
                  >
                    <div>Executive shop picture awaiting release</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#D7E3F1",
                        fontSize: 13,
                        lineHeight: 1.7,
                        maxWidth: 220,
                      }}
                    >
                      This preview frame shows how the public image shell will look once you save
                      the picture.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <div
              style={{
                ...innerCard("rgba(255,255,255,0.98)"),
                border: "1px solid rgba(212,175,55,0.12)",
                boxShadow: "0 16px 34px rgba(2,12,27,0.10)",
              }}
            >
              <div style={sectionLabel()}>Upload picture</div>

              <div style={{ marginTop: 10, ...helperText() }}>
                Upload a file when available, or paste an image URL and save it directly.
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleFilePicked(e.target.files?.[0] || null)}
                  style={inputStyle()}
                />

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={sectionLabel()}>Image URL</div>
                  <input
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Paste image URL"
                    style={inputStyle()}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => void saveShopDetails({ image_url: imageUrlInput })}
                    disabled={savingShop || uploadingImage}
                    style={actionBtn("primary", savingShop || uploadingImage)}
                  >
                    {savingShop ? "Saving..." : uploadingImage ? "Uploading..." : "Save Picture"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void saveShopDetails({ clear_image: true, image_url: null })}
                    disabled={savingShop || uploadingImage || !safeStr(imageUrlInput)}
                    style={actionBtn(
                      "secondary",
                      savingShop || uploadingImage || !safeStr(imageUrlInput)
                    )}
                  >
                    Remove Picture
                  </button>
                </div>
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Gallery shortcuts</div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <OriginLink to="/app/shop-assets" style={actionBtn("secondary")}>
                  Shop Assets
                </OriginLink>

                <button
                  type="button"
                  onClick={() => {
                    if (publicShopLink) {
                      window.open(publicShopLink, "_blank", "noopener,noreferrer");
                    }
                  }}
                  style={actionBtn("secondary", !publicShopLink)}
                  disabled={!publicShopLink}
                >
                  Public Gallery
                </button>

                <button
                  type="button"
                    onClick={() => copyText(publicShopLink, "Shop gallery link copied.")}
                  style={actionBtn("soft", !publicShopLink)}
                  disabled={!publicShopLink}
                >
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Shop details</div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
            <div style={sectionLabel()}>Shop name</div>
            <input
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Shop name"
              style={{ ...inputStyle(), marginTop: 8 }}
            />
          </div>

          <div>
            <div style={sectionLabel()}>WhatsApp</div>
            <input
              value={whatsApp}
              onChange={(e) => setWhatsApp(e.target.value)}
              placeholder="WhatsApp number"
              style={{ ...inputStyle(), marginTop: 8 }}
            />
          </div>

          <div>
            <div style={sectionLabel()}>Telegram</div>
            <input
              value={telegramHandle}
              onChange={(e) => setTelegramHandle(e.target.value)}
              placeholder="Telegram handle"
              style={{ ...inputStyle(), marginTop: 8 }}
            />
          </div>

          <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
            <div style={sectionLabel()}>Description</div>
            <textarea
              value={shopDescription}
              onChange={(e) => setShopDescription(e.target.value)}
              placeholder="Describe the shop..."
              style={{ ...textAreaStyle(), marginTop: 8 }}
            />
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => void saveShopDetails()}
            disabled={savingShop}
            style={actionBtn("primary", savingShop)}
          >
            {savingShop ? "Saving..." : "Save Shop Details"}
          </button>

          <OriginLink to="/app/shop-assets" style={actionBtn("secondary")}>
            Manage Products
          </OriginLink>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Slot usage</div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <div style={statTile()}>
            <div style={sectionLabel()}>Community</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              {publicProducts.length} / 12
            </div>
          </div>

          <div style={statTile()}>
            <div style={sectionLabel()}>Vault</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              {vaultProducts.length} / 6
            </div>
          </div>

          <div style={statTile()}>
            <div style={sectionLabel()}>Spotlights</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              {activeSpotlights.length}
            </div>
          </div>

          <div style={statTile()}>
            <div style={sectionLabel()}>Vault links</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              {vaultLinks.length}
            </div>
          </div>
        </div>
      </section>

      {spotlightOpen ? (
        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Spotlight</div>

          <div
            style={{
              marginTop: 12,
              ...helperText(),
              maxWidth: 860,
            }}
          >
            Spotlight is still here, but kept tighter so it does not take over the main page.
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div
              style={{
                ...innerCard("#FCFEFF"),
                border: "1px solid rgba(11,31,51,0.08)",
              }}
            >
              <div style={sectionLabel()}>Current live spotlight</div>
              {currentActiveSpotlight ? (
                <>
                  <div
                    style={{
                      marginTop: 10,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 16,
                      lineHeight: 1.4,
                    }}
                  >
                    {firstTruthy(currentActiveSpotlight?.message, "Spotlight is active.")}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge(true)}>
                      {firstTruthy(currentActiveSpotlight?.priority_mode, "free")}
                    </span>
                    <span style={badge(false)}>
                      Scope: {firstTruthy(currentActiveSpotlight?.visibility_scope, "direct_communities")}
                    </span>
                    <span style={badge(false)}>
                      {safeStr(currentActiveSpotlight?.expires_at)
                        ? `Expires: ${safeDateTime(currentActiveSpotlight?.expires_at) || safeStr(currentActiveSpotlight?.expires_at)}`
                        : "No expiry set"}
                    </span>
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    This live spotlight remains
                    visible across the live spotlight pages until it expires or is replaced.
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (publicShopLink) {
                          window.open(publicShopLink, "_blank", "noopener,noreferrer");
                        }
                      }}
                      style={actionBtn("secondary", !publicShopLink)}
                      disabled={!publicShopLink}
                    >
                      Open live shop view
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(publicShopLink, "Shop gallery link copied.")}
                      style={actionBtn("soft", !publicShopLink)}
                      disabled={!publicShopLink}
                    >
                      Copy live link
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginTop: 10, ...helperText() }}>
                    No active spotlight is live for this shop right now.
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    Use the free publish path below, or confirm a paid spotlight first if you want
                    priority visibility.
                  </div>
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setSpotlightPriorityMode("free")}
                style={
                  spotlightPriorityMode === "free"
                    ? actionBtn("primary")
                    : actionBtn("secondary")
                }
              >
                Free spotlight
              </button>
              <button
                type="button"
                onClick={() => setSpotlightPriorityMode("paid")}
                disabled={!canStartPaidSpotlight}
                style={
                  spotlightPriorityMode === "paid"
                    ? actionBtn("primary", !canStartPaidSpotlight)
                    : actionBtn("secondary", !canStartPaidSpotlight)
                }
              >
                Paid spotlight
              </button>
              <span style={badge(false)}>
                Publishing as: {spotlightPriorityMode === "paid" ? "paid priority" : "free"}
              </span>
            </div>

            <div style={{ ...helperText(), fontSize: 13 }}>
              {spotlightPriorityMode === "paid"
                ? "This publish will use your confirmed paid spotlight entitlement for priority visibility."
                : canStartPaidSpotlight
                ? "A paid spotlight is available, but you can still publish a normal free spotlight if you prefer."
                : safeStr(latestSpotlightPayment?.confirmed_at)
                ? "A paid spotlight is already active for this shop. Start another one only after the current paid run ends."
                : "Free spotlight stays available now. Paid spotlight becomes publishable here after payment confirmation reaches the backend."}
            </div>

            <textarea
              value={spotlightMessage}
              onChange={(e) => setSpotlightMessage(e.target.value)}
              placeholder="Spotlight message"
              style={textAreaStyle()}
            />

            <input
              value={spotlightImageUrl}
              onChange={(e) => setSpotlightImageUrl(e.target.value)}
              placeholder="Spotlight image URL (optional)"
              style={inputStyle()}
            />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void handleCreateSpotlight()}
                disabled={creatingSpotlight}
                style={actionBtn("primary", creatingSpotlight)}
              >
                {creatingSpotlight ? "Publishing..." : "Create Spotlight"}
              </button>

              <button
                type="button"
                onClick={() => setSpotlightOpen(false)}
                style={actionBtn("secondary")}
              >
                Collapse Spotlight
              </button>
            </div>

            {activeSpotlights.length > 0 ? (
              <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
                {activeSpotlights.slice(0, 4).map((item) => (
                  <div key={item.id} style={innerCard("#FCFEFF")}>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontWeight: 900,
                        fontSize: 15,
                        lineHeight: 1.35,
                      }}
                    >
                      {firstTruthy(item?.message, "Spotlight")}
                    </div>

                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={badge(false)}>
                        {firstTruthy(item?.priority_mode, "free")}
                      </span>
                      <span style={badge(false)}>
                        {firstTruthy(item?.visibility_scope, "direct_communities")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Vault and private access</div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={innerCard("#FCFEFF")}>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              Community-visible products
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {publicProducts.length > 0 ? (
                publicProducts.slice(0, 5).map((item) => (
                  <div key={item.id} style={helperText()}>
                    {firstTruthy(item?.name, "Product")}
                  </div>
                ))
              ) : (
                <div style={helperText()}>
                  Community-visible products have not been released yet.
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              ...innerCard(
                "linear-gradient(180deg, #0A1625 0%, #11263B 56%, #193A58 100%)"
              ),
              border: "1px solid rgba(212,175,55,0.16)",
              boxShadow: "0 18px 40px rgba(2,12,27,0.20)",
            }}
          >
            <div
              style={{
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              Vault private offers
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <div style={{ ...helperText(), color: "#D7E3F1" }}>
                Private offers ready: {vaultProducts.length}
              </div>
              <div style={{ ...helperText(), color: "#D7E3F1" }}>
                Access links ready: {vaultLinks.length}
              </div>

              {vaultLinks.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  style={{
                    ...innerCard("rgba(255,255,255,0.06)"),
                    border: "1px solid rgba(212,175,55,0.10)",
                    padding: 12,
                  }}
                >
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge(true)}>Link #{item.id}</span>
                    <span
                      style={{
                        ...badge(false),
                        background: "rgba(212,175,55,0.10)",
                        color: "#F6D77A",
                      }}
                    >
                      {firstTruthy(item?.status, "active")}
                    </span>
                  </div>
                  <div style={{ marginTop: 8, ...helperText(), color: "#D7E3F1" }}>
                    Access ends: {safeDateTime(item?.expires_at)}
                  </div>
                </div>
              ))}

              {vaultProducts.length === 0 && vaultLinks.length === 0 ? (
                <div style={{ ...helperText(), color: "#D7E3F1" }}>
                  Vault is not open yet. Private offers and permission-based access links will show
                  here after you activate Vault and release access.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}



