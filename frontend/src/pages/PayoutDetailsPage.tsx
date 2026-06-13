import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import GsnSnapshotPaperCard from "../components/GsnSnapshotPaperCard";
import PageTopNav from "../components/PageTopNav";
import { PrimaryButton, SecondaryButton, StableCtaLink } from "../components/StableButton";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import { communityIdFromSearch } from "../lib/communityRouteContext";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import {
  getCurrentClan,
  getMe,
  getMyWithdrawalDestination,
  getSelectedClanId,
  safeCopy,
  updateWithdrawalDestination,
} from "../lib/api";
import { buildGsnPaymentInstructionPackage } from "../lib/gsnSnapshotPaper";

type CommunityLite = {
  id?: number;
  clan_id?: number;
  name?: string | null;
  marketplace_name?: string | null;
};

type PayoutForm = {
  account_name: string;
  account_number: string;
  bank_name: string;
  sort_code: string;
  country: string;
  currency: string;
};

type NextStepState = {
  title: string;
  detail: string;
  today: string;
  tomorrow: string;
};

type TrustEventFeedback = {
  confirmation_message?: string;
  verification_status?: string;
  verification_note?: string;
  trust_event_response?: {
    event_type?: string;
    status?: string;
    message?: string;
  } | null;
} | null;

const LOCAL_PAYOUT_KEY = "gmfn_payout_account";

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(123,161,204,0.20)",
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(8,17,31,0.98) 0%, rgba(11,31,51,0.97) 56%, rgba(23,54,84,0.95) 100%)"
        : bg,
    boxShadow:
      "0 22px 48px rgba(2,6,23,0.22), 0 6px 14px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(123,161,204,0.16)",
    background:
      bg === "#F8FBFF" || bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(13,28,45,0.96) 0%, rgba(18,40,64,0.94) 100%)"
        : bg,
    padding: 16,
    boxShadow:
      "0 14px 30px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function payoutPrimaryButtonStyle(disabled = false): React.CSSProperties {
  return {
    borderRadius: 15,
    border: disabled
      ? "1px solid rgba(148,163,184,0.24)"
      : "1px solid rgba(18,77,176,0.22)",
    background: disabled
      ? "linear-gradient(180deg, #D5DEE8 0%, #C6D1DD 100%)"
      : "linear-gradient(180deg, #255FCE 0%, #1B4FBF 100%)",
    color: "#FFFFFF",
    boxShadow: disabled
      ? "none"
      : "0 18px 34px rgba(19,79,191,0.24), inset 0 1px 0 rgba(255,255,255,0.18)",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "nowrap",
    transition: "none",
  };
}

function payoutSecondaryButtonStyle(disabled = false): React.CSSProperties {
  return {
    borderRadius: 15,
    border: "1px solid rgba(121,149,190,0.20)",
    background:
      "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    color: disabled ? "#94A3B8" : "#E6EEF8",
    boxShadow: disabled
      ? "none"
      : "0 12px 24px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "nowrap",
    transition: "none",
  };
}

function actionText(name: GsnIconName, label: string): React.ReactNode {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minWidth: 0,
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          borderRadius: 11,
          display: "grid",
          placeItems: "center",
          flex: "0 0 auto",
          color: "#0B2D4A",
          background: "rgba(255,255,255,0.96)",
          border: "1px solid rgba(226,192,106,0.30)",
          boxShadow:
            "0 8px 16px rgba(2,6,23,0.10), inset 0 1px 0 rgba(255,255,255,0.96)",
        }}
      >
        <GsnLegacyIcon name={name} size={26} />
      </span>
      <span>{label}</span>
    </span>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    padding: "11px 12px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.12)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F9FCFF 100%)",
    width: "100%",
    boxSizing: "border-box",
    minHeight: 46,
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.52), 0 12px 24px rgba(15,23,42,0.05)",
    outline: "none",
    fontSize: 14,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#B9CBE0",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

function lightSectionLabel(): React.CSSProperties {
  return {
    ...sectionLabel(),
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: "#41556E",
  };
}

function iconTile(
  tone: "navy" | "gold" | "green" | "soft" = "navy"
): React.CSSProperties {
  const palette = {
    navy: {
      background: "linear-gradient(180deg, #0B3B68 0%, #061827 100%)",
      color: "#FFFFFF",
      border: "1px solid rgba(255,255,255,0.18)",
    },
    gold: {
      background: "linear-gradient(180deg, #FFF1B8 0%, #D6AA45 100%)",
      color: "#10253B",
      border: "1px solid rgba(214,170,69,0.48)",
    },
    green: {
      background: "linear-gradient(180deg, #E6F9EF 0%, #C8F0DA 100%)",
      color: "#087044",
      border: "1px solid rgba(46,155,98,0.26)",
    },
    soft: {
      background: "linear-gradient(180deg, #FFFFFF 0%, #EAF3FF 100%)",
      color: "#0B3B68",
      border: "1px solid rgba(123,161,204,0.24)",
    },
  }[tone];

  return {
    width: 44,
    height: 44,
    borderRadius: 15,
    display: "inline-grid",
    placeItems: "center",
    flex: "0 0 auto",
    boxShadow: "0 12px 22px rgba(2,6,23,0.12)",
    ...palette,
  };
}

function IconBadge({
  name,
  tone = "navy",
  size = 22,
}: {
  name: GsnIconName;
  tone?: "navy" | "gold" | "green" | "soft";
  size?: number;
}) {
  return (
    <span style={iconTile(tone)}>
      <GsnLegacyIcon name={name} size={Math.max(30, Math.round(size * 1.45))} />
    </span>
  );
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 32,
    padding: "7px 12px",
    borderRadius: 999,
    background: primary ? "rgba(32,76,133,0.36)" : "rgba(255,255,255,0.08)",
    border: primary
      ? "1px solid rgba(123,161,204,0.24)"
      : "1px solid rgba(123,161,204,0.14)",
    color: primary ? "#CFE3FF" : "#E6EEF8",
    fontSize: 12,
    fontWeight: 1000,
    whiteSpace: "normal",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function feedbackCard(success: boolean): React.CSSProperties {
  return {
    ...pageCard(success ? "#ECFDF5" : "#FEF2F2"),
    border: success ? "1px solid #A7F3D0" : "1px solid #FECACA",
    color: success ? "#065F46" : "#991B1B",
    fontWeight: 900,
    padding: 14,
  };
}

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function normalizeSortCode(value: string): string {
  const raw = safeStr(value);
  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 6) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
  }

  return raw;
}

function extractSortCodeFromNote(note: any): string {
  const raw = safeStr(note);
  const match = raw.match(/(?:UK\s*)?Sort code:\s*([^|;\n]+)/i);
  return normalizeSortCode(match?.[1] || "");
}

function isUkPayout(form: PayoutForm): boolean {
  const country = safeStr(form.country).toUpperCase();
  const currency = safeStr(form.currency).toUpperCase();
  return (
    currency === "GBP" ||
    country === "GB" ||
    country === "UK" ||
    country === "UNITED KINGDOM" ||
    country === "ENGLAND" ||
    country === "SCOTLAND" ||
    country === "WALES" ||
    country === "NORTHERN IRELAND"
  );
}

function buildPayoutNote(form: PayoutForm): string {
  return [
    safeStr(form.country) ? `Country: ${safeStr(form.country)}` : "",
    safeStr(form.currency) ? `Currency: ${safeStr(form.currency)}` : "",
    safeStr(form.sort_code) ? `UK Sort code: ${normalizeSortCode(form.sort_code)}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

function detectCurrency(me: any): string {
  const preferred = safeStr(me?.preferred_currency).toUpperCase();
  if (preferred) return preferred;

  const country = safeStr(me?.country).toUpperCase();
  if (country === "GB" || country === "UK") return "GBP";
  if (country === "NG") return "NGN";
  if (country === "KE") return "KES";
  if (country === "GH") return "GHS";
  return "NGN";
}

function readLocalPayout(): Partial<PayoutForm> | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(LOCAL_PAYOUT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    return {
      account_name: safeStr((parsed as any).account_name || ""),
      account_number: safeStr((parsed as any).account_number || ""),
      bank_name: safeStr((parsed as any).bank_name || ""),
      sort_code: normalizeSortCode(
        safeStr((parsed as any).sort_code || (parsed as any).bank_sort_code || "")
      ),
      country: safeStr((parsed as any).country || ""),
      currency: safeStr((parsed as any).currency || ""),
    };
  } catch {
    return null;
  }
}

function writeLocalPayout(form: PayoutForm): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_PAYOUT_KEY, JSON.stringify(form));
}

function removeLocalPayout(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCAL_PAYOUT_KEY);
}

function buildPayoutSummary(
  form: PayoutForm,
  context: {
    memberName?: string;
    gsnId?: string;
    communityName?: string;
    communityId?: string | number;
    status?: string;
  } = {}
): string {
  const lines = [
    `Account Name: ${safeStr(form.account_name || "-")}`,
    `Account Number / Wallet: ${safeStr(form.account_number || "-")}`,
    `Bank / Wallet Provider: ${safeStr(form.bank_name || "-")}`,
    `UK Sort Code: ${safeStr(normalizeSortCode(form.sort_code) || "-")}`,
    `Country: ${safeStr(form.country || "-")}`,
    `Currency: ${safeStr(form.currency || "-")}`,
  ];

  return buildGsnPaymentInstructionPackage({
    title: "GSN Payout Details Snapshot",
    purpose: "Review the payout destination saved for approved withdrawals.",
    memberName: context.memberName,
    gsnId: context.gsnId,
    communityName: context.communityName,
    communityId: safeStr(context.communityId),
    routeName: "Payout Details",
    status: context.status,
    detailLines: lines,
  });
}

function getCommunityName(clan: CommunityLite | null): string {
  return safeStr(clan?.marketplace_name || clan?.name || "");
}

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string
): string {
  return String(resolveCtaTarget(intent, { communityId, debugId }).to);
}

export default function PayoutDetailsPage() {
  const location = useLocation();
  const routeClanId = useMemo(
    () => communityIdFromSearch(location.search),
    [location.search]
  );
  const selectedClanId = routeClanId || Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "payout-details.nav.dashboard"),
      moneyOut: routeTarget("moneyOut", selectedClanId, "payout-details.route.money-out"),
      loans: routeTarget("loans", selectedClanId, "payout-details.route.loans"),
    }),
    [selectedClanId]
  );

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [me, setMe] = useState<any>(null);
  const [community, setCommunity] = useState<CommunityLite | null>(null);
  const [loadedFromLocal, setLoadedFromLocal] = useState(false);
  const [loadedFromServer, setLoadedFromServer] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [proofFeedback, setProofFeedback] = useState<TrustEventFeedback>(null);

  const [form, setForm] = useState<PayoutForm>({
    account_name: "",
    account_number: "",
    bank_name: "",
    sort_code: "",
    country: "",
    currency: "NGN",
  });

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
    (async () => {
      const [meRes, clanRes] = await Promise.all([
        getMe().catch(() => null),
        getCurrentClan().catch(() => null),
      ]);

      const server = await getMyWithdrawalDestination({
        clan_id: selectedClanId || undefined,
        gmfn_id: safeStr(meRes?.gmfn_id || "") || undefined,
      }).catch(() => null);
      const local = readLocalPayout();

      setMe(meRes || null);
      setCommunity(clanRes || null);
      setLoadedFromLocal(Boolean(local));
      setLoadedFromServer(Boolean(server));

      setForm({
        account_name: safeStr(
          server?.account_name ||
            server?.destination_name ||
            local?.account_name ||
            meRes?.account_name ||
            ""
        ),
        account_number: safeStr(
          server?.account_number ||
            server?.bank_account_number ||
            local?.account_number ||
            meRes?.account_number ||
            ""
        ),
        bank_name: safeStr(
          server?.bank_name || server?.bank || local?.bank_name || meRes?.bank_name || ""
        ),
        sort_code: normalizeSortCode(
          safeStr(
            server?.sort_code ||
              server?.bank_sort_code ||
              local?.sort_code ||
              extractSortCodeFromNote(server?.note) ||
              ""
          )
        ),
        country: safeStr(server?.country || local?.country || meRes?.country || ""),
        currency:
          safeStr(
            server?.currency || local?.currency || detectCurrency(meRes) || "NGN"
          ) || "NGN",
      });
    })();
  }, [selectedClanId]);

  useEffect(() => {
    if (!msg && !err) return;

    const timer = window.setTimeout(() => {
      setMsg("");
      setErr("");
      setProofFeedback(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [msg, err]);

  const selectedCommunityLabel = useMemo(() => {
    return (
      getCommunityName(community) ||
      (selectedClanId ? `Community ${selectedClanId}` : "No community selected")
    );
  }, [community, selectedClanId]);

  const completionCount = useMemo(() => {
    let count = 0;
    if (safeStr(form.account_name)) count += 1;
    if (safeStr(form.account_number)) count += 1;
    if (safeStr(form.bank_name)) count += 1;
    if (!isUkPayout(form) || safeStr(form.sort_code)) count += 1;
    if (safeStr(form.country)) count += 1;
    if (safeStr(form.currency)) count += 1;
    return count;
  }, [form]);

  const needsUkSortCode = isUkPayout(form);
  const requiredFieldCount = needsUkSortCode ? 6 : 5;
  const isReady = completionCount >= requiredFieldCount;
  const payoutPaperContext = useMemo(
    () => ({
      memberName: safeStr(
        me?.display_name || me?.name || me?.first_name || me?.email || "Member"
      ),
      gsnId: safeStr(me?.gmfn_id || ""),
      communityName: selectedCommunityLabel,
      communityId: selectedClanId || "",
      status: isReady ? "Ready for withdrawal flow" : "Needs completion",
    }),
    [isReady, me, selectedClanId, selectedCommunityLabel]
  );
  const payoutSummaryPaper = useMemo(
    () => buildPayoutSummary(form, payoutPaperContext),
    [form, payoutPaperContext]
  );

  const nextStep = useMemo<NextStepState>(() => {
    if (!selectedClanId) {
      return {
        title: "Choose the community first",
        detail:
          "Confirm the community before saving payout details.",
        today: "Open Community Home and confirm the active community.",
        tomorrow:
          "Then return here and save the destination.",
      };
    }

    if (!isReady) {
      return {
        title: "Complete the payout destination first",
        detail:
          "Approved withdrawals need a clear destination.",
        today: needsUkSortCode
          ? "Complete account name, bank, account number, UK sort code, country, and currency."
          : "Complete the payout fields and save.",
        tomorrow:
          "Withdrawal can then use this record.",
      };
    }

    return {
      title: "Keep the payout destination ready for withdrawal",
      detail:
        "This destination is ready for approved withdrawals.",
      today: "Review the details before withdrawal.",
      tomorrow:
        "Use Withdrawal Instructions when approval is ready.",
    };
  }, [selectedClanId, isReady, needsUkSortCode]);

  function update<K extends keyof PayoutForm>(key: K, value: PayoutForm[K]) {
    setMsg("");
    setErr("");
    setProofFeedback(null);
    setForm((prev) => ({
      ...prev,
      [key]: key === "sort_code" ? normalizeSortCode(String(value)) : value,
    }));
  }

  async function savePayout() {
    try {
      const payload = {
        clan_id: selectedClanId || undefined,
        gmfn_id: safeStr(me?.gmfn_id || "") || undefined,
        destination_name: safeStr(form.account_name),
        bank_name: safeStr(form.bank_name),
        account_number: safeStr(form.account_number),
        sort_code: normalizeSortCode(form.sort_code) || undefined,
        bank_sort_code: normalizeSortCode(form.sort_code) || undefined,
        phone_number: safeStr(me?.phone_e164 || "") || undefined,
        country: safeStr(form.country) || undefined,
        currency: safeStr(form.currency).toUpperCase() || undefined,
        note: buildPayoutNote(form),
      };

      const saved = await updateWithdrawalDestination(payload);

      setProofFeedback({
        confirmation_message: safeStr(saved?.confirmation_message),
        verification_status: safeStr(saved?.verification_status),
        verification_note: safeStr(saved?.verification_note),
        trust_event_response: saved?.trust_event_response || null,
      });

      writeLocalPayout(form);
      setLoadedFromLocal(true);
      setLoadedFromServer(true);
      setErr("");
      setMsg(
        safeStr(saved?.confirmation_message) ||
          "Payout details saved on the system and kept locally for continuity."
      );
    } catch {
      setProofFeedback(null);
      setErr("Payout details could not be saved on the system.");
    }
  }

  function clearLocal() {
    try {
      removeLocalPayout();
      setLoadedFromLocal(false);

      setForm({
        account_name: safeStr(me?.account_name || ""),
        account_number: safeStr(me?.account_number || ""),
        bank_name: safeStr(me?.bank_name || ""),
        sort_code: "",
        country: safeStr(me?.country || ""),
        currency: detectCurrency(me),
      });

      setErr("");
      setProofFeedback(null);
      setMsg("Local payout details cleared.");
    } catch {
      setErr("Local payout details could not be cleared.");
    }
  }

  function copySummary() {
    safeCopy(payoutSummaryPaper);
    setProofFeedback(null);
    setErr("");
    setMsg("Payout summary copied.");
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        sectionLabel="Bank / Wallet Details"
        title="Bank / Wallet Details"
        subtitle="Save the destination for approved withdrawals."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.moneyOut}
        backLabel="Withdrawal Instructions"
      />

      <section
        style={{
          ...pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"),
          marginTop: 18,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "auto minmax(0, 1fr) minmax(260px, 0.74fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          {isCompact ? null : <IconBadge name="wallet" tone="gold" size={24} />}
          <div>
            <div style={sectionLabel()}>Payout destination</div>

            <div
              style={{
                marginTop: 10,
                fontSize: 30,
                fontWeight: 1000,
                color: "#F8FBFF",
                lineHeight: 1.15,
              }}
            >
              {nextStep.title}
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#D7E3F1",
                lineHeight: 1.45,
                fontWeight: 760,
                maxWidth: 620,
              }}
            >
              {nextStep.detail}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Context: {selectedCommunityLabel}</span>
              <span style={badge(false)}>
                Readiness: {completionCount}/{requiredFieldCount} fields complete
              </span>
              <span style={badge(false)}>
                Source: {loadedFromServer ? "System record" : loadedFromLocal ? "Local fallback" : "Profile defaults"}
              </span>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(false)}>
                <GsnLegacyIcon name="document" size={24} /> Record only
              </span>
              <span style={badge(false)}>
                <GsnLegacyIcon name="shield" size={24} /> No money moves here
              </span>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(2, minmax(0, max-content))",
                gap: 10,
                alignItems: "center",
              }}
            >
              <PrimaryButton
                onClick={() => {
                  void savePayout();
                }}
                debugId="payout-details.front-save"
                fullWidth={isCompact}
                minWidth={isCompact ? undefined : 148}
                stableHeight={52}
                style={payoutPrimaryButtonStyle(false)}
              >
                {actionText("check", "Save details")}
              </PrimaryButton>

              <SecondaryButton
                onClick={copySummary}
                debugId="payout-details.front-copy-summary"
                fullWidth={isCompact}
                minWidth={isCompact ? undefined : 150}
                stableHeight={52}
                style={payoutSecondaryButtonStyle(false)}
              >
                {actionText("copy", "Copy summary")}
              </SecondaryButton>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Today</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.65,
                }}
              >
                {nextStep.today}
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Tomorrow</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.65,
                }}
              >
                {nextStep.tomorrow}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          ...pageCard("linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)"),
          marginTop: 18,
          color: "#07172C",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto minmax(0, 1fr)",
            gap: 12,
            alignItems: "center",
          }}
        >
          <IconBadge name="bank" tone="navy" size={24} />
          <div>
            <div style={lightSectionLabel()}>Destination fields</div>
            <div style={{ marginTop: 4, fontSize: 22, fontWeight: 1000 }}>
              Bank or wallet account
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
            gap: 12,
          }}
        >
          <label style={{ display: "grid", gap: 7 }}>
            <span style={lightSectionLabel()}>
              <GsnLegacyIcon name="user" size={24} /> Account name
            </span>
            <input
              value={form.account_name}
              onChange={(e) => update("account_name", e.target.value)}
              placeholder="Account name"
              style={inputStyle()}
            />
          </label>

          <label style={{ display: "grid", gap: 7 }}>
            <span style={lightSectionLabel()}>
              <GsnLegacyIcon name="hash" size={24} /> Account / wallet number
            </span>
            <input
              value={form.account_number}
              onChange={(e) => update("account_number", e.target.value)}
              placeholder="Account number / wallet number"
              style={inputStyle()}
            />
          </label>

          <label style={{ display: "grid", gap: 7 }}>
            <span style={lightSectionLabel()}>
              <GsnLegacyIcon name="bank" size={24} /> Bank / wallet provider
            </span>
            <input
              value={form.bank_name}
              onChange={(e) => update("bank_name", e.target.value)}
              placeholder="Bank / wallet provider"
              style={inputStyle()}
            />
          </label>

          <label style={{ display: "grid", gap: 7 }}>
            <span style={lightSectionLabel()}>
              <GsnLegacyIcon name="hash" size={24} /> UK sort code
            </span>
            <input
              value={form.sort_code}
              onChange={(e) => update("sort_code", e.target.value)}
              placeholder="12-34-56"
              inputMode="numeric"
              style={inputStyle()}
            />
          </label>

          <label style={{ display: "grid", gap: 7 }}>
            <span style={lightSectionLabel()}>
              <GsnLegacyIcon name="globe" size={24} /> Country
            </span>
            <input
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
              placeholder="Country"
              style={inputStyle()}
            />
          </label>

          <label style={{ display: "grid", gap: 7 }}>
            <span style={lightSectionLabel()}>
              <GsnLegacyIcon name="wallet" size={24} /> Currency
            </span>
            <select
              value={form.currency}
              onChange={(e) => update("currency", e.target.value)}
              style={inputStyle()}
            >
              <option value="GBP">GBP</option>
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="KES">KES</option>
              <option value="GHS">GHS</option>
            </select>
          </label>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              ...badge(false),
              background: "#EEF6FF",
              color: "#0B3B68",
              border: "1px solid rgba(123,161,204,0.28)",
            }}
          >
            <GsnLegacyIcon name="shield" size={24} /> Recorded destination
          </span>
          <span
            style={{
              ...badge(false),
              background: needsUkSortCode && !safeStr(form.sort_code) ? "#FFF7D6" : "#ECFDF5",
              color: needsUkSortCode && !safeStr(form.sort_code) ? "#7A4A00" : "#065F46",
              border:
                needsUkSortCode && !safeStr(form.sort_code)
                  ? "1px solid rgba(214,170,69,0.38)"
                  : "1px solid rgba(46,155,98,0.24)",
            }}
          >
            <GsnLegacyIcon name={needsUkSortCode && !safeStr(form.sort_code) ? "alert" : "check"} size={24} />
            {needsUkSortCode && !safeStr(form.sort_code)
              ? "UK sort code needed"
              : "Region fields ready"}
          </span>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "repeat(3, minmax(146px, max-content))",
            gap: 10,
            alignItems: "center",
          }}
        >
          <PrimaryButton
            onClick={() => {
              void savePayout();
            }}
            debugId="payout-details.save"
            fullWidth={isCompact}
            minWidth={isCompact ? undefined : 148}
            stableHeight={52}
            style={payoutPrimaryButtonStyle(false)}
          >
            {actionText("check", "Save details")}
          </PrimaryButton>

          <SecondaryButton
            onClick={copySummary}
            debugId="payout-details.copy-summary"
            fullWidth={isCompact}
            minWidth={isCompact ? undefined : 150}
            stableHeight={52}
            style={payoutSecondaryButtonStyle(false)}
          >
            {actionText("copy", "Copy summary")}
          </SecondaryButton>

          <SecondaryButton
            onClick={clearLocal}
            debugId="payout-details.clear-local"
            fullWidth={isCompact}
            minWidth={isCompact ? undefined : 132}
            stableHeight={52}
            style={payoutSecondaryButtonStyle(false)}
          >
            {actionText("refresh", "Clear local")}
          </SecondaryButton>
        </div>

        {err ? <div style={{ ...feedbackCard(false), marginTop: 14 }}>{err}</div> : null}
        {msg ? <div style={{ ...feedbackCard(true), marginTop: 14 }}>{msg}</div> : null}
        {proofFeedback ? (
          <div
            style={{
              marginTop: 12,
              borderRadius: 18,
              border: "1px solid rgba(46,155,98,0.22)",
              background: "#F0FDF4",
              color: "#065F46",
              padding: 14,
              display: "grid",
              gap: 8,
              fontWeight: 850,
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 1000 }}>
              <GsnLegacyIcon name="check" size={28} />
              {safeStr(proofFeedback.confirmation_message) ||
                "Your payout destination has been recorded."}
            </div>
            <div style={{ lineHeight: 1.5 }}>
              {safeStr(proofFeedback.trust_event_response?.message) ||
                safeStr(proofFeedback.verification_note) ||
                "External bank ownership verification is still a separate connection."}
            </div>
          </div>
        ) : null}
      </section>

      <section
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
          gap: 18,
        }}
      >
        <div
          style={{
            ...pageCard("linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)"),
            color: "#07172C",
          }}
        >
          <div style={lightSectionLabel()}>Current payout readiness</div>
          <div
            style={{
              marginTop: 10,
              color: "#07172C",
              fontSize: 24,
              fontWeight: 1000,
            }}
          >
            {isReady ? "Ready for withdrawal flow" : "Needs completion"}
          </div>

          <div
            style={{
              marginTop: 10,
              color: "#4A5F78",
              lineHeight: 1.45,
            }}
          >
            {isReady
              ? "Core fields are complete."
              : "Complete the required fields before withdrawal."}
          </div>
        </div>

        <div
          style={{
            ...pageCard("linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)"),
            color: "#07172C",
          }}
        >
          <div style={lightSectionLabel()}>Stored summary</div>
          <GsnSnapshotPaperCard
            paperText={payoutSummaryPaper}
            compact={isCompact}
            icon="bank"
            maxBodyLines={isCompact ? 6 : undefined}
            style={{ marginTop: 12 }}
          />
        </div>
      </section>

      <section
        style={{
          ...pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 100%)"),
          marginTop: 18,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <IconBadge name="document" tone="soft" size={22} />
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#F8FBFF" }}>
            What happens next
          </div>
        </div>

        <div style={{ marginTop: 10, color: "#D7E3F1", lineHeight: 1.45, fontWeight: 760 }}>
          After approval, open Withdrawal Instructions. That page handles the next payout step.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(150px, max-content))",
            gap: 10,
            alignItems: "center",
          }}
        >
          <StableCtaLink
            to={routes.moneyOut}
            debugId="payout-details.open-money-out"
            fullWidth={isCompact}
            minWidth={isCompact ? undefined : 150}
            stableHeight={52}
            style={payoutPrimaryButtonStyle(false)}
          >
            {actionText("wallet", "Money Out")}
          </StableCtaLink>
          <StableCtaLink
            to={routes.loans}
            debugId="payout-details.open-loans"
            fullWidth={isCompact}
            minWidth={isCompact ? undefined : 166}
            stableHeight={52}
            style={payoutSecondaryButtonStyle(false)}
          >
            {actionText("briefcase", "Loans & Support")}
          </StableCtaLink>
        </div>
      </section>
    </div>
  );
}
