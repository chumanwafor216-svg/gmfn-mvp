import React, { useMemo, useRef, useState } from "react";
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
  saveEntryBankDetails,
  startEntryPhoneVerification,
  verifyEntryBankDetails,
  verifyEntryDriversLicence,
} from "../lib/api";

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
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
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
    initialCommunityName || initialDescription ? "community" : "details"
  );
  const [verificationId, setVerificationId] = useState<number>(0);
  const [otpCode, setOtpCode] = useState("");
  const [otpPreview, setOtpPreview] = useState("");
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
  const [procedureOpen, setProcedureOpen] = useState(true);
  const [openPanel, setOpenPanel] = useState<"details" | "verification" | "community" | null>(
    initialCommunityName || initialDescription ? "community" : "details"
  );
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const verificationRef = useRef<HTMLDivElement | null>(null);
  const communityRef = useRef<HTMLDivElement | null>(null);

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

  const canOpenVerification = step !== "details";
  const canOpenCommunity = step === "community";

  function focusPanel(next: "details" | "verification" | "community") {
    const map = {
      details: detailsRef,
      verification: verificationRef,
      community: communityRef,
    } as const;
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        map[next].current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }

  function handleOpenPanel(next: "details" | "verification" | "community") {
    if (next === "verification" && !canOpenVerification) return;
    if (next === "community" && !canOpenCommunity) return;
    setOpenPanel(next);
    focusPanel(next);
  }

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
    setError("");
    setSuccess("");
  }

  function clearCommunityBlock() {
    setCommunityName("");
    setDescription("");
    setError("");
    setSuccess("");
  }

  async function handleStartVerification() {
    if (!canContinueDetails || busy) return;

    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const out = await startEntryPhoneVerification({
        display_name: safeStr(displayName),
        phone_e164: safeStr(phone),
        email: safeStr(email) || undefined,
      });

      setVerificationId(Number(out?.verification_id || 0));
      setOtpPreview(safeStr(out?.otp_preview));
      setStep("verify");
      setOpenPanel("verification");
      focusPanel("verification");
      setSuccess(
        safeStr(out?.message) ||
          "Phone verification started. Enter the code to continue."
      );
    } catch (err: any) {
      setError(err?.message || "Phone verification could not be started.");
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
      await confirmEntryPhoneVerification({
        verification_id: verificationId,
        code: otpCode,
      });

      setStep("bank");
      setOpenPanel("verification");
      focusPanel("verification");
      setSuccess("Phone verified. Add your bank details before community details continue.");
    } catch (err: any) {
      setError(err?.message || "Phone verification could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveBankDetails() {
    if (!canContinueBank || busy) return;

    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const out = await saveEntryBankDetails({
        verification_id: verificationId,
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

      let nextBankVerification: EntryVerificationResult = null;
      let nextLicenceVerification: EntryVerificationResult = null;

      try {
        const bankVerification = await verifyEntryBankDetails({
          verification_id: verificationId,
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
            verification_id: verificationId,
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

      setStep("community");
      setOpenPanel("community");
      focusPanel("community");
      setSuccess(
        safeStr(nextBankVerification?.explanation) ||
          safeStr(out?.verification_note) ||
          "Bank details recorded. You can now continue with community details."
      );
    } catch (err: any) {
      setError(err?.message || "Bank details could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canContinue || busy || !verificationId) return;

    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const payload: Record<string, any> = {
        verification_id: verificationId,
        clan_name: safeStr(communityName),
        clan_description: safeStr(description) || undefined,
        password: safeStr(password),
        confirm_password: safeStr(confirmPassword),
      };

      payload.email = safeStr(email);

      if (createCode) {
        payload.create_code = createCode;
      }

      const out = await createEntry(payload);
      const me = await getMe().catch(() => null);

      const issuedGmfnId = resolveIssuedGmfnId(out, me);
      const requestId = resolveActivationRequestId(out);
      const authenticatedNow = isAuthenticated();

      if (authenticatedNow) {
        clearPublicEntryState();
        nav("/app/build-first-circle", { replace: true });
        return;
      }

      if (issuedGmfnId || requestId) {
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

      setSuccess(
        safeStr(
          out?.detail ||
            out?.message ||
            "Founder entry was submitted successfully. Continue when activation details are available."
        )
      );
    } catch (err: any) {
      setError(err?.message || "Founder entry could not be completed.");
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
            gridTemplateColumns: "56px 1fr auto",
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
              Founder entry and verification
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <EntryGuideLauncher
              label="About"
              text="Read First"
              onClick={() => setProcedureOpen((current) => !current)}
            />
          </div>
        </div>

        <div
          style={pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)")}
        >
          <div style={sectionLabel()}>Create entry</div>

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

          <div style={{ marginTop: 14, display: "grid", gap: 10, justifyItems: "start" }}>
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
                      display: "flex",
                      justifyContent: "center",
                      paddingTop: 4,
                      paddingBottom: 6,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 30,
                        padding: "12px 18px",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.62) 0%, rgba(236,242,250,0.24) 100%)",
                        border: "1px solid rgba(255,255,255,0.56)",
                        boxShadow:
                          "0 18px 36px rgba(10,24,49,0.12), inset 0 1px 0 rgba(255,255,255,0.82), inset 0 -10px 18px rgba(123,149,181,0.08)",
                        minWidth: 184,
                        minHeight: 42,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#24415C",
                        fontWeight: 900,
                        fontSize: 12,
                        letterSpacing: 2.2,
                        textTransform: "uppercase",
                        textShadow: "0 1px 0 rgba(255,255,255,0.8)",
                      }}
                    >
                      Founder route
                    </div>
                  </div>

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
                    <strong style={{ color: "#10253B" }}>2. Verification and bank rails.</strong> Your phone is verified so the
                    system can confirm identity continuity. GSN does not keep your money. It records
                    the account or wallet you say belongs to you so future support, repayments,
                    payouts, and trusted financial actions can be matched to the right person. This
                    protects both sides and gives people a clear proof trail instead of relying on
                    memory.
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
              style={stageShell(stepProgress.details, stepProgress.detailsDone)}
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
                      stepProgress.details,
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
                    openPanel === "details"
                      ? setOpenPanel(null)
                      : handleOpenPanel("details")
                  }
                  style={stageToggleBtn(openPanel === "details")}
                >
                  {openPanel === "details" ? "Collapse" : "Open"}
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
                Street name, phone number, email, and password start the founder identity.
              </div>

              {openPanel === "details" ? (
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
                      onClick={clearDetailsBlock}
                      style={{ ...secondaryBtn(), minWidth: 116 }}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
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
                      Verification and bank rails
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
                Phone verification, bank destination, region explanation, and optional licence proof sit here.
              </div>

              {bankVerificationResult ? (
                <div style={{ ...verificationCard(bankVerificationResult.status), marginTop: 14 }}>
                  <div style={sectionLabel()}>Bank verification status</div>
                  <div style={{ marginTop: 8, fontWeight: 1000, fontSize: 16 }}>
                    {safeStr(bankVerificationResult.status || "recorded")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char) => char.toUpperCase())}
                  </div>
                  <div style={{ marginTop: 8, lineHeight: 1.7 }}>
                    {safeStr(bankVerificationResult.explanation) ||
                      "The bank verification result is now attached to this onboarding session."}
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
                        onClick={clearVerificationBlock}
                        style={{ ...secondaryBtn(), minWidth: 116 }}
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmVerification}
                        style={{
                          ...primaryBtn(!canConfirmOtp || busy),
                          width: "auto",
                          minWidth: 180,
                          flex: "1 1 220px",
                        }}
                        disabled={!canConfirmOtp || busy}
                      >
                        {busy ? "Verifying..." : "Submit Block 2"}
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
                        <input
                          value={bankCountry}
                          onChange={(e) => setBankCountry(e.target.value)}
                          placeholder="Country"
                          style={input()}
                        />
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
                        onClick={clearVerificationBlock}
                        style={{ ...secondaryBtn(), minWidth: 116 }}
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveBankDetails}
                        style={{
                          ...primaryBtn(!canContinueBank || busy),
                          width: "auto",
                          minWidth: 180,
                          flex: "1 1 220px",
                        }}
                        disabled={!canContinueBank || busy}
                      >
                        {busy ? "Saving..." : "Submit Block 2"}
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
                      onClick={clearCommunityBlock}
                      style={{ ...secondaryBtn(), minWidth: 116 }}
                    >
                      Clear
                    </button>
                    <button
                      type="submit"
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


