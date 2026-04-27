import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { EntryBackLink, EntryGuideLauncher } from "../components/EntryControls";
import {
  clearPublicEntryState,
  confirmEntryPhoneVerification,
  createEntry,
  getCreateCode,
  getEntryVerificationCheck,
  getMe,
  isAuthenticated,
  listMyClans,
  loginAndStore,
  saveEntryBankDetails,
  setSelectedClanId,
  startEntryPhoneVerification,
  verifyEntryBankDetails,
  verifyEntryDriversLicence,
} from "../lib/api";
import {
  ENTRY_CREATE_CODE_KEY,
  ENTRY_INVITE_CODE_KEY,
  ENTRY_MODE_KEY,
  writeStorage,
} from "../lib/entryFlow";

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    width: "100%",
    background:
      "radial-gradient(circle at top, rgba(47,103,196,0.16) 0%, rgba(16,37,59,0.00) 32%), linear-gradient(180deg, #10243A 0%, #173654 62%, #26527C 100%)",
    padding: "34px 22px",
    boxSizing: "border-box",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    background: bg,
    border: "1px solid rgba(11,31,51,0.08)",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 24,
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    background: bg,
    border: "1px solid rgba(11,31,51,0.08)",
    padding: 18,
  };
}

function fieldLabel(): React.CSSProperties {
  return {
    fontSize: 13,
    fontWeight: 900,
    color: "#0B1F33",
    marginBottom: 6,
  };
}

function input(): React.CSSProperties {
  return {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.12)",
    outline: "none",
    fontSize: 14,
    boxSizing: "border-box",
    background: "#FFFFFF",
    color: "#0B1F33",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
}

function textArea(): React.CSSProperties {
  return {
    ...input(),
    minHeight: 110,
    resize: "vertical",
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 2,
    isolation: "isolate",
    width: "100%",
    padding: "14px 18px",
    borderRadius: 16,
    background: disabled
      ? "linear-gradient(180deg, #D7DEE8 0%, #C8D2DF 100%)"
      : "linear-gradient(180deg, #F6D77D 0%, #F3D06A 52%, #D9A941 100%)",
    color: disabled ? "#6B7B8D" : "#10253B",
    fontWeight: 1000,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15,
    opacity: disabled ? 0.8 : 1,
    boxShadow: disabled
      ? "0 10px 20px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.52)"
      : "0 16px 30px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.56)",
    textShadow: disabled ? "none" : "0 1px 0 rgba(255,255,255,0.36)",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    pointerEvents: "auto",
    appearance: "none",
    WebkitAppearance: "none",
    transform: "translateZ(0)",
    outlineOffset: 4,
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 2,
    isolation: "isolate",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 999,
    border: "1px solid rgba(16,37,59,0.12)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(229,237,249,0.96) 100%)",
    color: "#123055",
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
    boxShadow:
      "0 10px 24px rgba(10,24,49,0.14), inset 0 1px 0 rgba(255,255,255,0.78)",
    whiteSpace: "nowrap",
    textShadow: "0 1px 0 rgba(255,255,255,0.52)",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    pointerEvents: "auto",
    appearance: "none",
    WebkitAppearance: "none",
    transform: "translateZ(0)",
    outlineOffset: 4,
  };
}

function stageToggleBtn(active = false): React.CSSProperties {
  return active
    ? secondaryBtn()
    : {
        ...secondaryBtn(),
        borderRadius: 16,
        border: "none",
        background:
          "linear-gradient(180deg, #F6D77D 0%, #F3D06A 52%, #D9A941 100%)",
        color: "#10253B",
        boxShadow:
          "0 16px 30px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.56)",
        textShadow: "0 1px 0 rgba(255,255,255,0.36)",
      };
}

function existingMemberCard(open = false): React.CSSProperties {
  return {
    width: "min(100%, 760px)",
    borderRadius: 22,
    border: open
      ? "1px solid rgba(243,208,106,0.34)"
      : "1px solid rgba(255,255,255,0.16)",
    background: open
      ? "linear-gradient(180deg, rgba(255,251,235,0.14) 0%, rgba(255,255,255,0.07) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)",
    boxShadow:
      "0 16px 34px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.10)",
    padding: 14,
    display: "grid",
    gap: 12,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4F6B8A",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

function feedbackCard(success = false): React.CSSProperties {
  return {
    borderRadius: 16,
    padding: 14,
    border: success ? "1px solid #A7F3D0" : "1px solid #FECACA",
    background: success ? "#ECFDF5" : "#FEF2F2",
    color: success ? "#065F46" : "#991B1B",
    fontWeight: 900,
  };
}

function guardButtonPress(event: React.SyntheticEvent<HTMLElement>) {
  event.stopPropagation();
}

function buttonGuardProps(): Pick<
  React.HTMLAttributes<HTMLElement>,
  "onPointerDown" | "onTouchStart" | "onMouseDown"
> {
  return {
    onPointerDown: guardButtonPress,
    onTouchStart: guardButtonPress,
    onMouseDown: guardButtonPress,
  };
}

type EntryVerificationResult = {
  verification_check_id?: number;
  verification_type?: string;
  status?: string;
  provider_key?: string;
  region_code?: string | null;
  confidence_score?: number | null;
  explanation?: string;
  verified_at?: string | null;
} | null;

type PhoneVerificationProof = {
  display_name?: string;
  phone_e164?: string;
  verified_at?: string;
  confirmation_message?: string;
  trust_event_response?: {
    event_type?: string;
    status?: string;
    message?: string;
  };
} | null;

type BankRecordProof = {
  confirmation_message?: string;
  verification_status?: string;
  verification_note?: string;
  trust_event_response?: {
    event_type?: string;
    status?: string;
    message?: string;
  };
} | null;

function verificationCard(status?: string | null): React.CSSProperties {
  const normalized = safeStr(status).toLowerCase();

  if (normalized === "matched") {
    return {
      borderRadius: 16,
      padding: 14,
      border: "1px solid #A7F3D0",
      background: "#ECFDF5",
      color: "#065F46",
    };
  }

  if (normalized === "partial_match" || normalized === "manual_review_required") {
    return {
      borderRadius: 16,
      padding: 14,
      border: "1px solid #FDE68A",
      background: "#FFFBEB",
      color: "#92400E",
    };
  }

  if (normalized === "unavailable") {
    return {
      borderRadius: 16,
      padding: 14,
      border: "1px solid #BFDBFE",
      background: "#EFF6FF",
      color: "#1D4ED8",
    };
  }

  return {
    borderRadius: 16,
    padding: 14,
    border: "1px solid #FECACA",
    background: "#FEF2F2",
    color: "#991B1B",
  };
}

function stageShell(active = false, complete = false): React.CSSProperties {
  if (active) {
    return {
      borderRadius: 20,
      padding: 18,
      border: "1px solid rgba(28,76,126,0.24)",
      background:
        "linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(230,239,252,0.96) 58%, rgba(212,226,246,0.92) 100%)",
      boxShadow:
        "0 16px 34px rgba(16,37,59,0.10), inset 0 1px 0 rgba(255,255,255,0.72)",
    };
  }

  if (complete) {
    return {
      borderRadius: 20,
      padding: 18,
      border: "1px solid rgba(217,169,65,0.30)",
      background:
        "linear-gradient(180deg, rgba(255,251,238,0.98) 0%, rgba(252,245,225,0.94) 100%)",
      boxShadow:
        "0 12px 24px rgba(16,37,59,0.07), inset 0 1px 0 rgba(255,255,255,0.72)",
    };
  }

  return {
    borderRadius: 20,
    padding: 18,
    border: "1px solid rgba(28,76,126,0.18)",
    background:
      "linear-gradient(180deg, rgba(248,251,255,0.99) 0%, rgba(238,245,252,0.97) 100%)",
    boxShadow:
      "0 10px 22px rgba(16,37,59,0.06), inset 0 1px 0 rgba(255,255,255,0.68)",
  };
}

function stageBadge(
  active = false,
  complete = false
): React.CSSProperties {
  return {
    width: 34,
    height: 34,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 1000,
    fontSize: 14,
    background: active
      ? "#1F548C"
      : complete
        ? "#B88721"
        : "rgba(28,76,126,0.10)",
    color: active || complete ? "#FFFFFF" : "#24415C",
    boxShadow: active || complete
      ? "0 10px 18px rgba(10,24,49,0.18), inset 0 1px 0 rgba(255,255,255,0.22)"
      : "0 8px 16px rgba(10,24,49,0.10), inset 0 1px 0 rgba(255,255,255,0.74)",
    border:
      active || complete
        ? "1px solid rgba(255,255,255,0.12)"
        : "1px solid rgba(28,76,126,0.12)",
    textShadow:
      active || complete ? "0 1px 0 rgba(0,0,0,0.12)" : "0 1px 0 rgba(255,255,255,0.68)",
  };
}

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function resolveIssuedGmfnId(out: any, me: any): string {
  return safeStr(
    me?.gmfn_id ||
      out?.gmfn_id ||
      out?.user?.gmfn_id ||
      out?.member?.gmfn_id ||
      out?.data?.gmfn_id
  );
}

function resolveActivationRequestId(out: any): string {
  return safeStr(
    out?.request_id ||
      out?.join_request_id ||
      out?.member_request_id ||
      out?.approval_request_id
  );
}

const BANK_COUNTRY_OPTIONS = [
  "Nigeria",
  "United Kingdom",
  "Ghana",
  "Kenya",
  "United States",
  "Ireland",
  "South Africa",
  "Uganda",
  "Tanzania",
  "Rwanda",
  "Other",
];

const BANK_COUNTRY_CURRENCY: Record<string, string> = {
  Nigeria: "NGN",
  "United Kingdom": "GBP",
  Ghana: "GHS",
  Kenya: "KES",
  "United States": "USD",
  Ireland: "EUR",
  "South Africa": "ZAR",
  Uganda: "UGX",
  Tanzania: "TZS",
  Rwanda: "RWF",
};

function currencyForBankCountry(country: string): string {
  return BANK_COUNTRY_CURRENCY[safeStr(country)] || "";
}

function bankVerificationHelpText(result: EntryVerificationResult): string {
  const status = safeStr(result?.status).toLowerCase();
  const explanation = safeStr(result?.explanation);

  if (status === "unavailable") {
    return (
      "Your bank or wallet details have been recorded. The live bank-check provider is not connected for this pilot region yet, so GSN keeps this as reviewable evidence instead of blocking you."
    );
  }

  if (status === "manual_review_required") {
    return (
      "Your bank or wallet details have been recorded, but this one needs human review or more information before it can become a stronger bank-check signal."
    );
  }

  if (status === "failed") {
    return (
      explanation ||
      "The live bank check could not confirm these details. Check the account name, number, country, and any required sort code or IBAN, then try again."
    );
  }

  if (status === "partial_match") {
    return (
      explanation ||
      "The bank check found a partial match. GSN recorded it, but it may need a closer review before it becomes strong evidence."
    );
  }

  if (status === "matched") {
    return (
      explanation ||
      "The bank check matched these details and GSN has recorded it as stronger identity evidence."
    );
  }

  return explanation || "The bank verification result is now attached to this onboarding session.";
}

export default function CreateEntryPage() {
  const nav = useNavigate();
  const location = useLocation();

  const search = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const stateCreateEntry =
    (location.state as {
      create_entry?: {
        clan_name?: string;
        clan_description?: string;
        display_name?: string;
        nickname?: string;
        phone_e164?: string;
        phone?: string;
        email?: string;
        create_code?: string;
      };
    } | null)?.create_entry || null;

  const initialCommunityName = safeStr(
    stateCreateEntry?.clan_name ||
      search.get("clan_name") ||
      search.get("community_name") ||
      ""
  );

  const initialDescription = safeStr(
    stateCreateEntry?.clan_description ||
      search.get("clan_description") ||
      search.get("community_description") ||
      ""
  );

  const initialEmail = safeStr(
    stateCreateEntry?.email || search.get("email") || ""
  );
  const initialDisplayName = safeStr(
    stateCreateEntry?.display_name ||
      stateCreateEntry?.nickname ||
      search.get("display_name") ||
      search.get("nickname") ||
      ""
  );
  const initialPhone = safeStr(
    stateCreateEntry?.phone_e164 ||
      stateCreateEntry?.phone ||
      search.get("phone_e164") ||
      search.get("phone") ||
      ""
  );

  const createCode = safeStr(
    stateCreateEntry?.create_code ||
      search.get("create_code") ||
      getCreateCode() ||
      ""
  );
  const hasInitialCommunityContext = Boolean(
    initialCommunityName || initialDescription
  );

  const [communityName, setCommunityName] = useState(initialCommunityName);
  const [description, setDescription] = useState(initialDescription);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState<"details" | "verify" | "bank" | "community">(
    hasInitialCommunityContext ? "community" : "details"
  );
  const [verificationId, setVerificationId] = useState<number>(0);
  const [otpCode, setOtpCode] = useState("");
  const [otpPreview, setOtpPreview] = useState("");
  const [otpDeliveryMode, setOtpDeliveryMode] = useState("");
  const [phoneVerificationProof, setPhoneVerificationProof] =
    useState<PhoneVerificationProof>(null);
  const [bankRecordProof, setBankRecordProof] = useState<BankRecordProof>(null);
  const [bankAccountName, setBankAccountName] = useState(initialDisplayName);
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankSortCode, setBankSortCode] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [bankCountry, setBankCountry] = useState("");
  const [bankCurrency, setBankCurrency] = useState("NGN");
  const [bankNote, setBankNote] = useState("");
  const [driverLicenceNumber, setDriverLicenceNumber] = useState("");
  const [driverLicenceCountry, setDriverLicenceCountry] = useState("");
  const [driverLicenceNote, setDriverLicenceNote] = useState("");
  const [bankVerificationResult, setBankVerificationResult] =
    useState<EntryVerificationResult>(null);
  const [licenceVerificationResult, setLicenceVerificationResult] =
    useState<EntryVerificationResult>(null);
  const [guideDone, setGuideDone] = useState(hasInitialCommunityContext);
  const [procedureOpen, setProcedureOpen] = useState(false);
  const [existingMemberOpen, setExistingMemberOpen] = useState(false);
  const [openPanel, setOpenPanel] = useState<"details" | "verification" | "community" | null>(
    hasInitialCommunityContext ? "community" : null
  );
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const verificationRef = useRef<HTMLDivElement | null>(null);
  const communityRef = useRef<HTMLDivElement | null>(null);
  const panelRevealFrameRef = useRef<number | null>(null);

  const passwordReady =
    safeStr(password).length >= 6 && safeStr(password) === safeStr(confirmPassword);
  const canContinue =
    !!safeStr(communityName) &&
    !!safeStr(displayName) &&
    !!safeStr(phone) &&
    !!safeStr(email) &&
    passwordReady;
  const canContinueDetails =
    !!safeStr(displayName) && !!safeStr(phone) && !!safeStr(email) && passwordReady;
  const canConfirmOtp = Number(verificationId) > 0 && safeStr(otpCode).length >= 4;
  const canContinueBank =
    Number(verificationId) > 0 &&
    !!safeStr(bankAccountName) &&
    !!safeStr(bankName) &&
    !!safeStr(bankAccountNumber);
  const stepProgress = useMemo(
    () => ({
      details: step === "details",
      verification: step === "verify" || step === "bank",
      community: step === "community",
      detailsDone:
        step === "verify" || step === "bank" || step === "community",
      verificationDone: step === "community",
    }),
    [step]
  );

  const canOpenDetails = guideDone;
  const canOpenVerification = step !== "details";
  const canOpenCommunity = step === "community";

  const verificationBlockTitle =
    step === "verify"
      ? "Phone confirmation"
      : "Bank and wallet details";
  const verificationBlockHelp =
    step === "verify"
      ? "Confirm this phone only if the app asks for a live SMS code. In pilot testing, GSN should usually finish this check automatically and open the bank or wallet fields."
      : step === "bank"
        ? "Add the account or wallet where trusted support, repayment records, and future payment references should point."
        : "After your first details are accepted, this block records the bank or wallet destination for trusted support, repayments, and future payout references.";

  const existingMemberLoginTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    params.set("entry", "existing");
    params.set("force", "1");
    params.delete("create_code");
    params.delete("founder_code");
    params.delete("public_create_code");
    params.delete("code");
    const query = params.toString();
    return `/login${query ? `?${query}` : "?entry=existing&force=1"}`;
  }, [location.search]);

  function cancelPendingPanelReveal() {
    if (typeof window !== "undefined" && panelRevealFrameRef.current !== null) {
      window.cancelAnimationFrame(panelRevealFrameRef.current);
      panelRevealFrameRef.current = null;
    }
  }

  function focusPanel(next: "details" | "verification" | "community") {
    const map = {
      details: detailsRef,
      verification: verificationRef,
      community: communityRef,
    } as const;
    if (typeof window === "undefined") return;

    cancelPendingPanelReveal();

    let attempts = 0;
    const reveal = () => {
      const node = map[next].current;
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "start" });
        panelRevealFrameRef.current = null;
        return;
      }

      attempts += 1;
      if (attempts >= 10) {
        panelRevealFrameRef.current = null;
        return;
      }

      panelRevealFrameRef.current = window.requestAnimationFrame(reveal);
    };

    panelRevealFrameRef.current = window.requestAnimationFrame(reveal);
  }

  function handleOpenPanel(next: "details" | "verification" | "community") {
    if (next === "details" && !canOpenDetails) {
      setProcedureOpen(true);
      return;
    }
    if (next === "verification" && !canOpenVerification) return;
    if (next === "community" && !canOpenCommunity) return;
    setOpenPanel(next);
    focusPanel(next);
  }

  function handleGuideDone() {
    setGuideDone(true);
    setProcedureOpen(false);
    if (step === "details") {
      setOpenPanel("details");
      focusPanel("details");
    }
  }

  function handleExistingMemberLogin() {
    writeStorage(ENTRY_MODE_KEY, "existing");
    writeStorage(ENTRY_CREATE_CODE_KEY, null);
    writeStorage(ENTRY_INVITE_CODE_KEY, null);
    nav(existingMemberLoginTo, { replace: false });
  }

  useEffect(() => {
    return () => cancelPendingPanelReveal();
  }, []);

  const existingMemberPanel = (
    <div style={existingMemberCard(existingMemberOpen)}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 5 }}>
          <div style={{ ...sectionLabel(), color: "#F3D06A" }}>
            Already a member?
          </div>
          <div
            style={{
              color: "#F8FBFF",
              fontSize: 15,
              fontWeight: 900,
              lineHeight: 1.35,
            }}
          >
            Sign in instead of filling the new-community form.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExistingMemberOpen((current) => !current)}
          style={{
            ...secondaryBtn(),
            minHeight: 44,
            color: "#123055",
          }}
        >
          {existingMemberOpen ? "Collapse" : "Open"}
        </button>
      </div>

      {existingMemberOpen ? (
        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.08)",
            padding: 14,
            display: "grid",
            gap: 12,
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.86)",
              fontSize: 13.5,
              lineHeight: 1.7,
              fontWeight: 700,
            }}
          >
            If you already have a GSN account, do not create another one.
            Go to sign in and verify yourself with your email and password.
            After sign-in, the app opens your workspace instead of returning
            you to this create-community form.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleExistingMemberLogin}
              style={{
                ...primaryBtn(false),
                width: "auto",
                minWidth: 178,
                flex: "1 1 220px",
              }}
            >
              I am already a member
            </button>
            <button
              type="button"
              onClick={() => setExistingMemberOpen(false)}
              style={{
                ...secondaryBtn(),
                minWidth: 112,
              }}
            >
              Stay here
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  function clearDetailsBlock() {
    setDisplayName("");
    setPhone("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  }

  function clearVerificationBlock() {
    setOtpCode("");
    setOtpDeliveryMode("");
    setBankAccountName(initialDisplayName);
    setBankName("");
    setBankAccountNumber("");
    setBankSortCode("");
    setBankIban("");
    setBankCountry("");
    setBankCurrency("NGN");
    setBankNote("");
    setDriverLicenceNumber("");
    setDriverLicenceCountry("");
    setDriverLicenceNote("");
    setBankVerificationResult(null);
    setLicenceVerificationResult(null);
    setPhoneVerificationProof(null);
    setBankRecordProof(null);
    setError("");
    setSuccess("");
  }

  function clearCommunityBlock() {
    setCommunityName("");
    setDescription("");
    setError("");
    setSuccess("");
  }

  function handleBankCountryChange(nextCountry: string) {
    setBankCountry(nextCountry);

    const nextCurrency = currencyForBankCountry(nextCountry);
    if (nextCurrency) {
      setBankCurrency(nextCurrency);
    }
  }

  function isPhoneSessionExpiredError(err: any): boolean {
    const message = safeStr(err?.message || err).toLowerCase();
    return (
      message.includes("verified phone session has expired") ||
      message.includes("phone verification code has expired") ||
      message.includes("phone verification session not found")
    );
  }

  function isPhoneAlreadyRegisteredError(err: any): boolean {
    const message = safeStr(err?.message || err).toLowerCase();
    return message.includes("phone number already registered");
  }

  function isCompletedAccountError(err: any): boolean {
    const message = safeStr(err?.message || err).toLowerCase();
    return (
      message.includes("phone number already registered") ||
      message.includes("email already registered") ||
      message.includes("founder identity already exists") ||
      message.includes("phone verification session has already been used") ||
      message.includes("verified phone session has already been used")
    );
  }

  function firstClanIdFrom(out: any): number | null {
    const direct = Number(
      out?.clan_id ||
        out?.clan?.id ||
        out?.selected_clan_id ||
        out?.data?.clan_id ||
        0
    );

    if (Number.isFinite(direct) && direct > 0) return direct;
    return null;
  }

  async function selectCreatedOrFirstClan(out?: any): Promise<number | null> {
    const directClanId = firstClanIdFrom(out);
    if (directClanId) {
      setSelectedClanId(directClanId);
      return directClanId;
    }

    const clans = await listMyClans().catch(() => null);
    const rows = Array.isArray(clans)
      ? clans
      : Array.isArray(clans?.items)
        ? clans.items
        : [];
    const first = rows[0] || null;
    const firstClanId = firstClanIdFrom(first);

    if (firstClanId) {
      setSelectedClanId(firstClanId);
      return firstClanId;
    }

    return null;
  }

  async function openCreatedWorkspace(out?: any): Promise<void> {
    await selectCreatedOrFirstClan(out);
    clearPublicEntryState();
    nav("/app/build-first-circle", { replace: true });
  }

  async function recoverCompletedCreateEntry(): Promise<boolean> {
    const userEmail = safeStr(email);
    const userPassword = safeStr(password);

    if (!userEmail || !userPassword) return false;

    try {
      await loginAndStore(userEmail, userPassword);
      await openCreatedWorkspace();
      return true;
    } catch {
      return false;
    }
  }

  async function startAndMaybeConfirmPhoneSession(): Promise<{
    verificationId: number;
    autoConfirmed: boolean;
    message: string;
  }> {
    const out = await startEntryPhoneVerification({
      display_name: safeStr(displayName),
      phone_e164: safeStr(phone),
      email: safeStr(email) || undefined,
    });

    setVerificationId(Number(out?.verification_id || 0));
    const nextVerificationId = Number(out?.verification_id || 0);
    const previewCode = safeStr(out?.otp_preview);
    setOtpPreview(previewCode);
    setOtpDeliveryMode(safeStr(out?.delivery_mode));
    setPhoneVerificationProof(null);
    setBankRecordProof(null);

    if (nextVerificationId > 0 && out?.verified) {
      setPhoneVerificationProof({
        display_name: safeStr(displayName),
        phone_e164: safeStr(out?.phone_e164) || safeStr(phone),
        verified_at: safeStr(out?.verified_at),
        confirmation_message: safeStr(out?.confirmation_message),
        trust_event_response: undefined,
      });
      setBankAccountName((current) => safeStr(current) || safeStr(displayName));

      if (out?.bank_details_recorded) {
        setStep("community");
        setOpenPanel("community");
        focusPanel("community");

        return {
          verificationId: nextVerificationId,
          autoConfirmed: true,
          message:
            "GSN found your unfinished entry record. Your phone and bank or wallet details are already recorded, so you can continue with community setup.",
        };
      }

      setStep("bank");
      setOpenPanel("verification");
      focusPanel("verification");

      return {
        verificationId: nextVerificationId,
        autoConfirmed: true,
        message:
          safeStr(out?.confirmation_message) ||
          "GSN found your verified phone record. Continue with your bank or wallet details.",
      };
    }

    if (nextVerificationId > 0 && previewCode) {
      const confirmed = await confirmEntryPhoneVerification({
        verification_id: nextVerificationId,
        code: previewCode,
      });

      setOtpCode(previewCode);
      setPhoneVerificationProof({
        display_name: safeStr(confirmed?.display_name),
        phone_e164: safeStr(confirmed?.phone_e164),
        verified_at: safeStr(confirmed?.verified_at),
        confirmation_message: safeStr(confirmed?.confirmation_message),
        trust_event_response: confirmed?.trust_event_response || null,
      });
      setBankAccountName((current) => safeStr(current) || safeStr(displayName));
      setStep("bank");
      setOpenPanel("verification");
      focusPanel("verification");

      return {
        verificationId: nextVerificationId,
        autoConfirmed: true,
        message:
          safeStr(confirmed?.confirmation_message) ||
          "Pilot phone check completed. Add your bank or wallet details now.",
      };
    }

    setStep("verify");
    setOpenPanel("verification");
    focusPanel("verification");

    return {
      verificationId: nextVerificationId,
      autoConfirmed: false,
      message:
        safeStr(out?.message) ||
        "Phone confirmation started. Enter the code to continue.",
    };
  }

  async function handleStartVerification() {
    if (!canContinueDetails || busy) return;

    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const started = await startAndMaybeConfirmPhoneSession();
      setSuccess(started.message);
    } catch (err: any) {
      if (isPhoneAlreadyRegisteredError(err)) {
        const recovered = await recoverCompletedCreateEntry();
        if (recovered) return;

        setExistingMemberOpen(true);
        setError(
          "This phone number already belongs to a completed GSN account. Please use Already a member to sign in instead of starting a second community entry."
        );
      } else {
        setError(err?.message || "Phone verification could not be started.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmVerification() {
    if (!canConfirmOtp || busy) return;

    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const out = await confirmEntryPhoneVerification({
        verification_id: verificationId,
        code: otpCode,
      });

      setPhoneVerificationProof({
        display_name: safeStr(out?.display_name),
        phone_e164: safeStr(out?.phone_e164),
        verified_at: safeStr(out?.verified_at),
        confirmation_message: safeStr(out?.confirmation_message),
        trust_event_response: out?.trust_event_response || null,
      });
      setBankAccountName((current) => safeStr(current) || safeStr(displayName));
      setStep("bank");
      setOpenPanel("verification");
      focusPanel("verification");
      setSuccess(
        safeStr(out?.confirmation_message) ||
          "Phone verified. Add your bank details before community details continue."
      );
    } catch (err: any) {
      setError(err?.message || "Phone verification could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveBankDetailsForVerification(activeVerificationId: number): Promise<{
    out: any;
    bankVerification: EntryVerificationResult;
  }> {
    const out = await saveEntryBankDetails({
      verification_id: activeVerificationId,
      destination_name: safeStr(bankAccountName),
      bank_name: safeStr(bankName),
      account_number: safeStr(bankAccountNumber),
      phone_number: safeStr(phone) || undefined,
      country: safeStr(bankCountry) || undefined,
      currency: safeStr(bankCurrency) || "NGN",
      note: safeStr(bankNote) || undefined,
      driver_licence_number: safeStr(driverLicenceNumber) || undefined,
      driver_licence_country: safeStr(driverLicenceCountry) || undefined,
      driver_licence_note: safeStr(driverLicenceNote) || undefined,
    });

    setBankRecordProof({
      confirmation_message: safeStr(out?.confirmation_message),
      verification_status: safeStr(out?.verification_status),
      verification_note: safeStr(out?.verification_note),
      trust_event_response: out?.trust_event_response || null,
    });

    let nextBankVerification: EntryVerificationResult = null;
    let nextLicenceVerification: EntryVerificationResult = null;

    try {
      const bankVerification = await verifyEntryBankDetails({
        verification_id: activeVerificationId,
        destination_name: safeStr(bankAccountName),
        bank_name: safeStr(bankName),
        account_number: safeStr(bankAccountNumber),
        sort_code: safeStr(bankSortCode) || undefined,
        iban: safeStr(bankIban) || undefined,
        phone_number: safeStr(phone) || undefined,
        country: safeStr(bankCountry) || undefined,
        currency: safeStr(bankCurrency) || "NGN",
        note: safeStr(bankNote) || undefined,
      });
      nextBankVerification = bankVerification;

      if (Number(bankVerification?.verification_check_id || 0) > 0) {
        nextBankVerification = await getEntryVerificationCheck(
          bankVerification.verification_check_id
        ).catch(() => bankVerification);
      }
    } catch (verificationErr: any) {
      nextBankVerification = {
        status: "failed",
        explanation:
          verificationErr?.message ||
          "Bank verification could not be checked right now.",
      };
    }

    if (safeStr(driverLicenceNumber) && safeStr(driverLicenceCountry)) {
      try {
        const licenceVerification = await verifyEntryDriversLicence({
          verification_id: activeVerificationId,
          licence_number: safeStr(driverLicenceNumber),
          country: safeStr(driverLicenceCountry),
          note: safeStr(driverLicenceNote) || undefined,
        });
        nextLicenceVerification = licenceVerification;

        if (Number(licenceVerification?.verification_check_id || 0) > 0) {
          nextLicenceVerification = await getEntryVerificationCheck(
            licenceVerification.verification_check_id
          ).catch(() => licenceVerification);
        }
      } catch (verificationErr: any) {
        nextLicenceVerification = {
          status: "failed",
          explanation:
            verificationErr?.message ||
            "Driver's licence verification could not be checked right now.",
        };
      }
    }

    setBankVerificationResult(nextBankVerification);
    setLicenceVerificationResult(nextLicenceVerification);

    return { out, bankVerification: nextBankVerification };
  }

  function finishBankStep(out: any, nextBankVerification: EntryVerificationResult) {
    setStep("community");
    setOpenPanel("community");
    focusPanel("community");
    setSuccess(
      safeStr(out?.confirmation_message) ||
        safeStr(nextBankVerification?.explanation) ||
        safeStr(out?.verification_note) ||
        "Bank details recorded. You can now continue with community details."
    );
  }

  async function refreshPilotPhoneSession(): Promise<number> {
    const refreshed = await startAndMaybeConfirmPhoneSession();

    if (!refreshed.autoConfirmed || !refreshed.verificationId) {
      throw new Error(
        "Your pilot phone proof has timed out. Please start this entry step afresh so GSN can link the phone to your name again."
      );
    }

    return refreshed.verificationId;
  }

  async function handleSaveBankDetails() {
    if (!canContinueBank || busy) return;

    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const saved = await saveBankDetailsForVerification(verificationId);
      finishBankStep(saved.out, saved.bankVerification);
    } catch (err: any) {
      if (isPhoneSessionExpiredError(err) && canContinueDetails) {
        try {
          const refreshedVerificationId = await refreshPilotPhoneSession();
          const saved = await saveBankDetailsForVerification(refreshedVerificationId);
          finishBankStep(saved.out, saved.bankVerification);
          setSuccess(
            "Your pilot phone proof had timed out, so GSN refreshed it and saved your bank or wallet details."
          );
        } catch (retryErr: any) {
          setError(
            retryErr?.message ||
              "Your pilot phone proof has timed out. Please start afresh so GSN can link the phone to your name again."
          );
        }
      } else {
        setError(err?.message || "Bank details could not be recorded.");
      }
    } finally {
      setBusy(false);
    }
  }

  function buildCreateEntryPayload(activeVerificationId: number): Record<string, any> {
    const payload: Record<string, any> = {
      verification_id: activeVerificationId,
      clan_name: safeStr(communityName),
      clan_description: safeStr(description) || undefined,
      password: safeStr(password),
      confirm_password: safeStr(confirmPassword),
    };

    payload.email = safeStr(email);

    if (createCode) {
      payload.create_code = createCode;
    }

    return payload;
  }

  async function submitCreateEntry(activeVerificationId: number) {
    const out = await createEntry(buildCreateEntryPayload(activeVerificationId));
    const me = await getMe().catch(() => null);

    const nextStep = safeStr(out?.next_step).toLowerCase();
    const issuedGmfnId = resolveIssuedGmfnId(out, me);
    const requestId = resolveActivationRequestId(out);
    const authenticatedNow = isAuthenticated();

    if (nextStep === "build-first-circle" && authenticatedNow) {
      await openCreatedWorkspace(out);
      return;
    }

    if (nextStep === "activate-membership" || issuedGmfnId || requestId) {
      if (!issuedGmfnId && !requestId) {
        throw new Error(
          "GSN created the community but did not return the activation reference. Please retry this step or ask the community helper to check the intake monitor."
        );
      }

      clearPublicEntryState();

      const next = new URLSearchParams();
      if (issuedGmfnId) next.set("gmfn_id", issuedGmfnId);
      if (requestId) next.set("request_id", requestId);

      nav(
        next.toString()
          ? `/activate-membership?${next.toString()}`
          : "/activate-membership",
        {
          replace: true,
          state: {
            gmfn_id: issuedGmfnId || undefined,
            request_id: requestId || undefined,
          },
        }
      );
      return;
    }

    throw new Error(
      safeStr(
        out?.detail ||
          out?.message ||
          "GSN could not determine the next route after creating this community. Please retry this step so the app can continue the journey properly."
      )
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canContinue || busy || !verificationId) return;

    setError("");
    setSuccess("");
    setBusy(true);

    try {
      await submitCreateEntry(verificationId);
    } catch (err: any) {
      if (isPhoneSessionExpiredError(err) && canContinueBank) {
        try {
          const refreshedVerificationId = await refreshPilotPhoneSession();
          await saveBankDetailsForVerification(refreshedVerificationId);
          await submitCreateEntry(refreshedVerificationId);
        } catch (retryErr: any) {
          if (isCompletedAccountError(retryErr)) {
            const recovered = await recoverCompletedCreateEntry();
            if (recovered) return;
          }

          setError(
            retryErr?.message ||
              "Your pilot phone proof has timed out. Please start afresh so GSN can link the phone to your name again."
          );
        }
      } else if (isCompletedAccountError(err)) {
        const recovered = await recoverCompletedCreateEntry();
        if (recovered) return;

        setExistingMemberOpen(true);
        setError(
          "This phone or email already has a completed GSN account. Use Already a member to sign in with the email and password you entered. If that does not work, ask the person helping you to check the pilot intake monitor."
        );
      } else {
        setError(err?.message || "Founder entry could not be completed.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={pageShell()}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: 18 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "56px 1fr 56px",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <EntryBackLink to="/welcome" />
          </div>

          <div style={{ textAlign: "center", display: "grid", gap: 6 }}>
            <div
              style={{
                fontSize: 12,
                color: "#F3D06A",
                fontWeight: 900,
                letterSpacing: 3.4,
                textTransform: "uppercase",
              }}
            >
              GSN
            </div>
            <div
              style={{
                color: "#F8FBFF",
                fontSize: 15,
                lineHeight: 1.6,
                opacity: 0.92,
              }}
            >
              Start a new community
            </div>
          </div>

          <div aria-hidden="true" />
        </div>

        {existingMemberPanel}

        <div
          style={{
            ...pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"),
          }}
        >
          <div style={sectionLabel()}>Create community</div>

          <div
            style={{
              marginTop: 10,
              fontSize: 30,
              fontWeight: 1000,
              color: "#F8FBFF",
              lineHeight: 1.15,
            }}
          >
            Start a new community
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 12, justifyItems: "start" }}>
            <EntryGuideLauncher
              compact
              text={guideDone ? "Read Again" : "Read First"}
              onClick={() => setProcedureOpen(true)}
            />
            <div
              style={{
                color: guideDone ? "#B9D7F0" : "#F3D06A",
                fontSize: 13,
                fontWeight: 800,
                lineHeight: 1.6,
              }}
            >
              {guideDone
                ? "Guide read. Block 1 is open so you can start safely."
                : "Read this first. Block 1 opens after you finish the guide."}
            </div>
            {procedureOpen ? (
              <div
                style={{
                  width: "min(100%, 760px)",
                  borderRadius: 22,
                  border: "1px solid rgba(255,255,255,0.42)",
                  background:
                    "linear-gradient(180deg, rgba(251,253,255,0.99) 0%, rgba(235,242,251,0.98) 34%, rgba(220,232,247,0.95) 68%, rgba(206,221,240,0.92) 100%)",
                  boxShadow:
                    "0 24px 60px rgba(5,16,38,0.28), inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -18px 30px rgba(122,147,180,0.08)",
                  padding: 24,
                  color: "#17324D",
                  lineHeight: 1.8,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background:
                      "radial-gradient(circle at top, rgba(243,208,106,0.16) 0%, rgba(243,208,106,0) 26%), radial-gradient(circle at bottom right, rgba(52,101,164,0.14) 0%, rgba(52,101,164,0) 30%)",
                  }}
                />
                <div
                  style={{
                    display: "grid",
                    gap: 6,
                    justifyItems: "center",
                    textAlign: "center",
                    marginBottom: 14,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      ...sectionLabel(),
                      color: "#B88721",
                      letterSpacing: 3.4,
                      textShadow: "0 1px 0 rgba(255,255,255,0.76)",
                    }}
                  >
                    My GSN and I guide
                  </div>
                  <div
                    style={{
                      color: "#0B1F33",
                      fontSize: 30,
                      fontWeight: 1000,
                      lineHeight: 1.06,
                      letterSpacing: 0.2,
                      textShadow:
                        "0 1px 0 rgba(255,255,255,0.92), 0 10px 24px rgba(10,24,49,0.12)",
                    }}
                  >
                    Read this first
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: 10,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setProcedureOpen(false)}
                    style={{
                      ...secondaryBtn(),
                      border: "1px solid rgba(16,37,59,0.12)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(229,237,249,0.96) 100%)",
                      color: "#123055",
                      boxShadow: "0 10px 24px rgba(10,24,49,0.14)",
                    }}
                  >
                    Collapse
                  </button>
                </div>
                <div style={{ display: "grid", gap: 18 }}>
                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                  <div
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(16,37,59,0.10)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(245,249,253,0.68) 100%)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.82), 0 8px 20px rgba(10,24,49,0.06)",
                      padding: "13px 14px",
                    }}
                  >
                    <strong style={{ color: "#10253B" }}>1. Your details.</strong> We ask for your street name or nickname and
                    your phone number first so the system can know who is starting this community.
                    Your email and password become the sign-in details you will use later. This helps
                    protect your entry from being used by the wrong person.
                  </div>
                  <div
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(16,37,59,0.10)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(245,249,253,0.68) 100%)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.82), 0 8px 20px rgba(10,24,49,0.06)",
                      padding: "13px 14px",
                    }}
                  >
                    <strong style={{ color: "#10253B" }}>2. Bank and wallet details.</strong> GSN does
                    not keep your money. It records the account or wallet you say belongs to you so
                    future support, repayments, payouts, and trusted financial actions can be matched
                    to the right person. The phone check protects this record in the background, and
                    the bank or wallet details become the practical part you fill here.
                  </div>
                  <div
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(16,37,59,0.10)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(245,249,253,0.68) 100%)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.82), 0 8px 20px rgba(10,24,49,0.06)",
                      padding: "13px 14px",
                    }}
                  >
                    <strong style={{ color: "#10253B" }}>3. Community setup.</strong> Only after your identity and rails are in
                    place do we ask for your community name and short story. This keeps the
                    community tied to a real, explainable founder record and helps the app detect
                    abnormal changes if someone else tries to take over your flow.
                  </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGuideDone}
                    style={{
                      ...primaryBtn(false),
                      width: "100%",
                      minHeight: 54,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    Done, start Block 1
                  </button>
                </div>
              </div>
            ) : null}

          </div>

        </div>

        {error ? <div style={feedbackCard(false)}>{error}</div> : null}
        {success ? <div style={feedbackCard(true)}>{success}</div> : null}

        <div style={pageCard()}>
          <div style={{ display: "grid", gap: 14 }}>
            <div
              ref={detailsRef}
              style={stageShell(
                guideDone && stepProgress.details,
                stepProgress.detailsDone
              )}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={stageBadge(
                      guideDone && stepProgress.details,
                      stepProgress.detailsDone
                    )}
                  >
                    1
                  </span>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={sectionLabel()}>First block</div>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontSize: 22,
                        fontWeight: 1000,
                        lineHeight: 1.15,
                      }}
                    >
                      Your details
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    !guideDone
                      ? setProcedureOpen(true)
                      : openPanel === "details"
                      ? setOpenPanel(null)
                      : handleOpenPanel("details")
                  }
                  style={stageToggleBtn(guideDone && openPanel === "details")}
                >
                  {!guideDone
                    ? "Read First"
                    : openPanel === "details"
                    ? "Collapse"
                    : "Open"}
                </button>
              </div>

              <div
                style={{
                  marginTop: 10,
                  color: "#5F7287",
                  lineHeight: 1.7,
                  fontSize: 14,
                }}
              >
                {guideDone
                  ? "Street name, phone number, email, and password start the founder identity."
                  : "Read the short guide first. After you press Done, this first block opens here."}
              </div>

              {guideDone && openPanel === "details" ? (
                <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
                  <div>
                    <div style={fieldLabel()}>Street name or nickname</div>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="What people know you by"
                      style={input()}
                    />
                  </div>

                  <div>
                    <div style={fieldLabel()}>Phone number</div>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+44 7..., +234..., +1..."
                      style={input()}
                    />
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: "#5F7287",
                        fontWeight: 700,
                      }}
                    >
                      Start with your international country code so the app can recognise your region correctly.
                    </div>
                  </div>

                  <div>
                    <div style={fieldLabel()}>Email</div>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter the email you will use to sign in"
                      style={input()}
                    />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={fieldLabel()}>Password</div>
                      <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                        placeholder="At least 6 characters"
                        autoComplete="new-password"
                        style={input()}
                      />
                    </div>

                    <div>
                      <div style={fieldLabel()}>Repeat password</div>
                      <input
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        type="password"
                        placeholder="Type the password again"
                        autoComplete="new-password"
                        style={input()}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: -4,
                      color: passwordReady ? "#166534" : "#5F7287",
                      fontSize: 12,
                      lineHeight: 1.6,
                      fontWeight: 800,
                    }}
                  >
                    {passwordReady
                      ? "Password is ready. This email and password will be used for sign in."
                      : "Use at least 6 characters and repeat the same password so the app can create your sign-in safely."}
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      {...buttonGuardProps()}
                      onClick={clearDetailsBlock}
                      style={{ ...secondaryBtn(), minWidth: 116 }}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      {...buttonGuardProps()}
                      onClick={handleStartVerification}
                      style={{
                        ...primaryBtn(!canContinueDetails || busy),
                        width: "auto",
                        minWidth: 180,
                        flex: "1 1 220px",
                      }}
                      disabled={!canContinueDetails || busy}
                    >
                      {busy ? "Sending..." : "Submit Block 1"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div
              ref={verificationRef}
              style={stageShell(
                stepProgress.verification,
                stepProgress.verificationDone
              )}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={stageBadge(
                      stepProgress.verification,
                      stepProgress.verificationDone
                    )}
                  >
                    2
                  </span>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={sectionLabel()}>Second block</div>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontSize: 22,
                        fontWeight: 1000,
                        lineHeight: 1.15,
                      }}
                    >
                      {verificationBlockTitle}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    openPanel === "verification"
                      ? setOpenPanel(null)
                      : handleOpenPanel("verification")
                  }
                  style={stageToggleBtn(openPanel === "verification")}
                  disabled={!canOpenVerification}
                >
                  {openPanel === "verification" ? "Collapse" : "Open"}
                </button>
              </div>

              <div
                style={{
                  marginTop: 10,
                  color: "#5F7287",
                  lineHeight: 1.7,
                  fontSize: 14,
                }}
              >
                {verificationBlockHelp}
              </div>

              {phoneVerificationProof ? (
                <div
                  style={{
                    ...softCard("#ECFDF5"),
                    marginTop: 14,
                    border: "1px solid #A7F3D0",
                  }}
                >
                  <div style={{ ...sectionLabel(), color: "#047857" }}>
                    Phone verified
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#065F46",
                      fontWeight: 1000,
                      lineHeight: 1.45,
                    }}
                  >
                    {safeStr(phoneVerificationProof.confirmation_message) ||
                      `${safeStr(phoneVerificationProof.phone_e164) || "This phone"} is now verified for ${safeStr(phoneVerificationProof.display_name) || "this founder"}.`}
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {safeStr(phoneVerificationProof.display_name) ? (
                      <span style={secondaryBtn()}>
                        Name: {safeStr(phoneVerificationProof.display_name)}
                      </span>
                    ) : null}
                    {safeStr(phoneVerificationProof.phone_e164) ? (
                      <span style={secondaryBtn()}>
                        Phone: {safeStr(phoneVerificationProof.phone_e164)}
                      </span>
                    ) : null}
                  </div>

                  {phoneVerificationProof.trust_event_response ? (
                    <div
                      style={{
                        marginTop: 12,
                        borderRadius: 14,
                        background: "rgba(255,255,255,0.72)",
                        border: "1px solid rgba(4,120,87,0.16)",
                        padding: 12,
                      }}
                    >
                      <div style={{ ...sectionLabel(), color: "#047857" }}>
                        Trust event response
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          color: "#065F46",
                          lineHeight: 1.65,
                          fontWeight: 800,
                        }}
                      >
                        {safeStr(
                          phoneVerificationProof.trust_event_response.message
                        ) ||
                          "This phone proof is ready to become trust evidence when registration is completed."}
                      </div>
                      {safeStr(
                        phoneVerificationProof.trust_event_response.event_type
                      ) ? (
                        <div
                          style={{
                            marginTop: 8,
                            color: "#047857",
                            fontSize: 12.5,
                            fontWeight: 1000,
                          }}
                        >
                          Event:{" "}
                          {safeStr(
                            phoneVerificationProof.trust_event_response.event_type
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {bankRecordProof ? (
                <div
                  style={{
                    ...softCard("#ECFDF5"),
                    marginTop: 14,
                    border: "1px solid #A7F3D0",
                  }}
                >
                  <div style={{ ...sectionLabel(), color: "#047857" }}>
                    Bank and wallet proof recorded
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#065F46",
                      fontWeight: 1000,
                      lineHeight: 1.45,
                    }}
                  >
                    {safeStr(bankRecordProof.confirmation_message) ||
                      "Your bank or wallet destination has been recorded for this onboarding session."}
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {safeStr(bankRecordProof.verification_status) ? (
                      <span style={secondaryBtn()}>
                        Status:{" "}
                        {safeStr(bankRecordProof.verification_status).replace(/_/g, " ")}
                      </span>
                    ) : null}
                    {safeStr(bankRecordProof.verification_note) ? (
                      <span style={secondaryBtn()}>Recorded for trust review</span>
                    ) : null}
                  </div>

                  {bankRecordProof.trust_event_response ? (
                    <div
                      style={{
                        marginTop: 12,
                        borderRadius: 14,
                        background: "rgba(255,255,255,0.72)",
                        border: "1px solid rgba(4,120,87,0.16)",
                        padding: 12,
                      }}
                    >
                      <div style={{ ...sectionLabel(), color: "#047857" }}>
                        Trust event response
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          color: "#065F46",
                          lineHeight: 1.65,
                          fontWeight: 800,
                        }}
                      >
                        {safeStr(bankRecordProof.trust_event_response.message) ||
                          "This bank or wallet proof is ready to become trust evidence when registration is completed."}
                      </div>
                      {safeStr(bankRecordProof.trust_event_response.event_type) ? (
                        <div
                          style={{
                            marginTop: 8,
                            color: "#047857",
                            fontSize: 12.5,
                            fontWeight: 1000,
                          }}
                        >
                          Event:{" "}
                          {safeStr(bankRecordProof.trust_event_response.event_type)}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {bankVerificationResult ? (
                <div style={{ ...verificationCard(bankVerificationResult.status), marginTop: 14 }}>
                  <div style={sectionLabel()}>Bank verification status</div>
                  <div style={{ marginTop: 8, fontWeight: 1000, fontSize: 16 }}>
                    {safeStr(bankVerificationResult.status || "recorded")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char) => char.toUpperCase())}
                  </div>
                  <div style={{ marginTop: 8, lineHeight: 1.7 }}>
                    {bankVerificationHelpText(bankVerificationResult)}
                  </div>
                  {safeStr(bankVerificationResult.provider_key) ? (
                    <div style={{ marginTop: 8, fontSize: 12, fontWeight: 900, opacity: 0.84 }}>
                      Provider: {safeStr(bankVerificationResult.provider_key)}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {licenceVerificationResult ? (
                <div
                  style={{
                    ...verificationCard(licenceVerificationResult.status),
                    marginTop: 12,
                  }}
                >
                  <div style={sectionLabel()}>Licence verification status</div>
                  <div style={{ marginTop: 8, fontWeight: 1000, fontSize: 16 }}>
                    {safeStr(licenceVerificationResult.status || "recorded")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char) => char.toUpperCase())}
                  </div>
                  <div style={{ marginTop: 8, lineHeight: 1.7 }}>
                    {safeStr(licenceVerificationResult.explanation) ||
                      "The driver's licence check is now attached to this onboarding session."}
                  </div>
                  {safeStr(licenceVerificationResult.provider_key) ? (
                    <div style={{ marginTop: 8, fontSize: 12, fontWeight: 900, opacity: 0.84 }}>
                      Provider: {safeStr(licenceVerificationResult.provider_key)}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {openPanel === "verification" ? (
                step === "verify" ? (
                  <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
                    <div style={softCard("#F8FBFF")}>
                      <div style={sectionLabel()}>Phone check</div>
                      <div
                        style={{
                          marginTop: 8,
                          color: "#475569",
                          lineHeight: 1.75,
                          fontSize: 14,
                        }}
                      >
                        Block 2 has two parts. First confirm this phone number.
                        Then the bank or wallet details will open below it.
                      </div>
                    </div>

                    <div>
                      <div style={fieldLabel()}>Verification code</div>
                      <input
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="Enter the code sent to your phone"
                        style={input()}
                      />
                    </div>

                    {otpPreview ? (
                      <div style={softCard("#FFFBEB")}>
                        <div style={sectionLabel()}>Pilot code preview</div>
                        <div
                          style={{
                            marginTop: 10,
                            color: "#92400E",
                            fontWeight: 900,
                            fontSize: 18,
                            letterSpacing: 1.2,
                          }}
                        >
                          {otpPreview}
                        </div>
                        <div
                          style={{
                            marginTop: 8,
                            color: "#92400E",
                            fontSize: 13,
                            lineHeight: 1.6,
                            fontWeight: 800,
                          }}
                        >
                          This appears during pilot testing because no live SMS
                          sender is connected yet.
                        </div>
                      </div>
                    ) : otpDeliveryMode === "pending-sms" ? (
                      <div style={softCard("#EFF6FF")}>
                        <div style={sectionLabel()}>SMS code</div>
                        <div
                          style={{
                            marginTop: 8,
                            color: "#1D4ED8",
                            fontSize: 13,
                            lineHeight: 1.6,
                            fontWeight: 800,
                          }}
                        >
                          A live SMS sender is expected to deliver this code.
                          If no code arrives during testing, the phone delivery
                          setting needs to be switched back to pilot preview.
                        </div>
                      </div>
                    ) : null}

                    <div
                      style={{
                        marginTop: 4,
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        {...buttonGuardProps()}
                        onClick={clearVerificationBlock}
                        style={{ ...secondaryBtn(), minWidth: 116 }}
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        {...buttonGuardProps()}
                        onClick={handleConfirmVerification}
                        style={{
                          ...primaryBtn(!canConfirmOtp || busy),
                          width: "auto",
                          minWidth: 180,
                          flex: "1 1 220px",
                        }}
                        disabled={!canConfirmOtp || busy}
                      >
                        {busy ? "Verifying..." : "Confirm phone code"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
                    <div>
                      <div style={fieldLabel()}>Account name</div>
                      <input
                        value={bankAccountName}
                        onChange={(e) => setBankAccountName(e.target.value)}
                        placeholder="Name on the bank or wallet account"
                        style={input()}
                      />
                    </div>

                    <div>
                      <div style={fieldLabel()}>Bank or wallet provider</div>
                      <input
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Enter the bank or wallet provider"
                        style={input()}
                      />
                    </div>

                    <div>
                      <div style={fieldLabel()}>Account number or wallet number</div>
                      <input
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        placeholder="Enter the destination number"
                        style={input()}
                      />
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={fieldLabel()}>Sort code or branch code (optional)</div>
                        <input
                          value={bankSortCode}
                          onChange={(e) => setBankSortCode(e.target.value)}
                          placeholder="Needed for UK and similar rails"
                          style={input()}
                        />
                      </div>

                      <div>
                        <div style={fieldLabel()}>IBAN (optional)</div>
                        <input
                          value={bankIban}
                          onChange={(e) => setBankIban(e.target.value)}
                          placeholder="Use this where IBAN is standard"
                          style={input()}
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 160px",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={fieldLabel()}>Country (optional)</div>
                        <select
                          value={bankCountry}
                          onChange={(e) => handleBankCountryChange(e.target.value)}
                          style={input()}
                        >
                          <option value="">Select bank country</option>
                          {BANK_COUNTRY_OPTIONS.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <div
                          style={{
                            marginTop: 7,
                            color: "#64748B",
                            fontSize: 12.5,
                            lineHeight: 1.55,
                            fontWeight: 800,
                          }}
                        >
                          For Scotland, England, Wales, or Northern Ireland, use
                          United Kingdom or GB.
                        </div>
                        {bankCountry === "Other" ? (
                          <div
                            style={{
                              marginTop: 7,
                              color: "#92400E",
                              fontSize: 12.5,
                              lineHeight: 1.55,
                              fontWeight: 800,
                            }}
                          >
                            If your country is not listed, leave this as Other
                            and explain it in the note below.
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <div style={fieldLabel()}>Currency</div>
                        <select
                          value={bankCurrency}
                          onChange={(e) => setBankCurrency(e.target.value)}
                          style={input()}
                        >
                          <option value="NGN">NGN</option>
                          <option value="GBP">GBP</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="KES">KES</option>
                          <option value="GHS">GHS</option>
                          <option value="ZAR">ZAR</option>
                          <option value="UGX">UGX</option>
                          <option value="TZS">TZS</option>
                          <option value="RWF">RWF</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div style={fieldLabel()}>Note or cross-region explanation</div>
                      <textarea
                        value={bankNote}
                        onChange={(e) => setBankNote(e.target.value)}
                        placeholder="If your phone country and bank country do not match, explain briefly here"
                        style={textArea()}
                      />
                    </div>

                    <div style={softCard("#F8FBFF")}>
                      <div style={sectionLabel()}>Optional licence proof</div>
                      <div
                        style={{
                          marginTop: 10,
                          color: "#475569",
                          lineHeight: 1.8,
                          fontSize: 14,
                        }}
                      >
                        If you have a driver's licence or similar strong identity document,
                        you can record it here as an extra trust signal. It is optional.
                      </div>

                      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                        <input
                          value={driverLicenceNumber}
                          onChange={(e) => setDriverLicenceNumber(e.target.value)}
                          placeholder="Driver's licence number (optional)"
                          style={input()}
                        />

                        <input
                          value={driverLicenceCountry}
                          onChange={(e) => setDriverLicenceCountry(e.target.value)}
                          placeholder="Issuing country (optional)"
                          style={input()}
                        />

                        <textarea
                          value={driverLicenceNote}
                          onChange={(e) => setDriverLicenceNote(e.target.value)}
                          placeholder="Optional note about the licence or document"
                          style={textArea()}
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        {...buttonGuardProps()}
                        onClick={clearVerificationBlock}
                        style={{ ...secondaryBtn(), minWidth: 116 }}
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        {...buttonGuardProps()}
                        onClick={handleSaveBankDetails}
                        style={{
                          ...primaryBtn(!canContinueBank || busy),
                          width: "auto",
                          minWidth: 180,
                          flex: "1 1 220px",
                        }}
                        disabled={!canContinueBank || busy}
                      >
                        {busy ? "Saving..." : "Save bank and wallet details"}
                      </button>
                    </div>
                  </div>
                )
              ) : null}
            </div>

            <div ref={communityRef} style={stageShell(stepProgress.community, false)}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={stageBadge(stepProgress.community, false)}>3</span>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={sectionLabel()}>Third block</div>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontSize: 22,
                        fontWeight: 1000,
                        lineHeight: 1.15,
                      }}
                    >
                      Community setup
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    openPanel === "community"
                      ? setOpenPanel(null)
                      : handleOpenPanel("community")
                  }
                  style={stageToggleBtn(openPanel === "community")}
                  disabled={!canOpenCommunity}
                >
                  {openPanel === "community" ? "Collapse" : "Open"}
                </button>
              </div>

              <div
                style={{
                  marginTop: 10,
                  color: "#5F7287",
                  lineHeight: 1.7,
                  fontSize: 14,
                }}
              >
                Community name and short story only appear after the identity and rails checks are in place.
              </div>

              {openPanel === "community" ? (
                <form
                  onSubmit={onSubmit}
                  style={{ display: "grid", gap: 14, marginTop: 16 }}
                >
                  <div>
                    <div style={fieldLabel()}>Community name</div>
                    <input
                      value={communityName}
                      onChange={(e) => setCommunityName(e.target.value)}
                      placeholder="Enter community name"
                      style={input()}
                    />
                  </div>

                  <div>
                    <div style={fieldLabel()}>Short description</div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what this community represents"
                      style={textArea()}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      {...buttonGuardProps()}
                      onClick={clearCommunityBlock}
                      style={{ ...secondaryBtn(), minWidth: 116 }}
                    >
                      Clear
                    </button>
                    <button
                      type="submit"
                      {...buttonGuardProps()}
                      style={{
                        ...primaryBtn(!canContinue || busy),
                        width: "auto",
                        minWidth: 220,
                        flex: "1 1 260px",
                      }}
                      disabled={!canContinue || busy}
                    >
                      {busy ? "Continuing..." : "Final submit"}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


