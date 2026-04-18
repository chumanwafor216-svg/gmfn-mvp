import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { EntryBackLink, EntryGuideLauncher } from "../components/EntryControls";
import OriginLink from "../components/OriginLink";
import {
  clearPublicEntryState,
  confirmEntryPhoneVerification,
  createEntry,
  getCreateCode,
  getMe,
  isAuthenticated,
  saveEntryBankDetails,
  startEntryPhoneVerification,
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
    background: disabled ? "#CBD5E1" : "#0B63D1",
    color: "#FFFFFF",
    fontWeight: 1000,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15,
    opacity: disabled ? 0.8 : 1,
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
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

function stageShell(active = false, complete = false): React.CSSProperties {
  if (active) {
    return {
      borderRadius: 20,
      padding: 18,
      border: "1px solid rgba(11,99,209,0.18)",
      background:
        "linear-gradient(180deg, rgba(11,99,209,0.10) 0%, rgba(248,251,255,0.92) 100%)",
      boxShadow: "0 12px 28px rgba(11,99,209,0.10)",
    };
  }

  if (complete) {
    return {
      borderRadius: 20,
      padding: 18,
      border: "1px solid rgba(34,197,94,0.18)",
      background:
        "linear-gradient(180deg, rgba(34,197,94,0.08) 0%, rgba(255,255,255,0.98) 100%)",
    };
  }

  return {
    borderRadius: 20,
    padding: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
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
      ? "#0B63D1"
      : complete
        ? "#166534"
        : "rgba(11,31,51,0.08)",
    color: active || complete ? "#FFFFFF" : "#24415C",
  };
}

function panelCard(): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,248,253,0.96) 100%)",
    boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
    padding: 22,
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
  const [bankCountry, setBankCountry] = useState("");
  const [bankCurrency, setBankCurrency] = useState("NGN");
  const [bankNote, setBankNote] = useState("");
  const [driverLicenceNumber, setDriverLicenceNumber] = useState("");
  const [driverLicenceCountry, setDriverLicenceCountry] = useState("");
  const [driverLicenceNote, setDriverLicenceNote] = useState("");
  const [procedureOpen, setProcedureOpen] = useState(false);
  const [openPanel, setOpenPanel] = useState<"details" | "verification" | "community">(
    initialCommunityName || initialDescription ? "community" : "details"
  );

  const canContinue = !!safeStr(communityName) && !!safeStr(displayName) && !!safeStr(phone);
  const canContinueDetails = !!safeStr(displayName) && !!safeStr(phone);
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

  function handleOpenPanel(next: "details" | "verification" | "community") {
    if (next === "verification" && !canOpenVerification) return;
    if (next === "community" && !canOpenCommunity) return;
    setOpenPanel(next);
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

      setStep("community");
      setOpenPanel("community");
      setSuccess(
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
      };

      if (safeStr(email)) {
        payload.email = safeStr(email);
      }

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
              text="Create Guide"
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
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)",
                  padding: 16,
                  color: "#D7E3F1",
                  lineHeight: 1.8,
                }}
              >
                1. Open Block 1 and fill your founder details.
                <br />
                2. Submit Block 1 and it closes back into place.
                <br />
                3. Block 2 opens for phone verification and bank rails.
                <br />
                4. Submit Block 2 and it closes back into place.
                <br />
                5. Block 3 opens for community setup.
                <br />
                6. Finish Block 3 and continue into founder activation from this same page.
              </div>
            ) : null}
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <OriginLink to="/login" style={secondaryBtn()}>
              Already have access?
            </OriginLink>
          </div>
        </div>

        {error ? <div style={feedbackCard(false)}>{error}</div> : null}
        {success ? <div style={feedbackCard(true)}>{success}</div> : null}

        <div style={pageCard()}>
          <div style={{ display: "grid", gap: 14 }}>
            <div
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
                      ? setOpenPanel("verification")
                      : handleOpenPanel("details")
                  }
                  style={secondaryBtn()}
                >
                  {openPanel === "details" ? "Collapse" : "Open Block 1"}
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
                Street name, phone number, and optional email start the founder identity.
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
                      placeholder="+234..."
                      style={input()}
                    />
                  </div>

                  <div>
                    <div style={fieldLabel()}>Email (optional)</div>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email if you use one"
                      style={input()}
                    />
                  </div>

                  <div style={{ marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={handleStartVerification}
                      style={primaryBtn(!canContinueDetails || busy)}
                      disabled={!canContinueDetails || busy}
                    >
                      {busy ? "Sending..." : "Submit Block 1"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div
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
                      ? setOpenPanel("details")
                      : handleOpenPanel("verification")
                  }
                  style={secondaryBtn()}
                  disabled={!canOpenVerification}
                >
                  {openPanel === "verification" ? "Collapse" : "Open Block 2"}
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

                    <div style={{ marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={handleConfirmVerification}
                        style={primaryBtn(!canConfirmOtp || busy)}
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

                    <div style={{ marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={handleSaveBankDetails}
                        style={primaryBtn(!canContinueBank || busy)}
                        disabled={!canContinueBank || busy}
                      >
                        {busy ? "Saving..." : "Submit Block 2"}
                      </button>
                    </div>
                  </div>
                )
              ) : null}
            </div>

            <div style={stageShell(stepProgress.community, false)}>
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
                      ? setOpenPanel("verification")
                      : handleOpenPanel("community")
                  }
                  style={secondaryBtn()}
                  disabled={!canOpenCommunity}
                >
                  {openPanel === "community" ? "Collapse" : "Open Block 3"}
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

                  <div style={{ marginTop: 4 }}>
                    <button
                      type="submit"
                      style={primaryBtn(!canContinue || busy)}
                      disabled={!canContinue || busy}
                    >
                      {busy ? "Continuing..." : "Continue to founder creation"}
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


