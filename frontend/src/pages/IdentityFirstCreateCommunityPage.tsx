import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  confirmEntryPhoneVerification,
  createCommunityAfterIdentity,
  establishEntryIdentity,
  getAccessToken,
  getMe,
  startEntryPhoneVerification,
} from "../lib/api";
import {
  CommunityEntryShell,
  EntryNotice,
  entryFieldStyle,
  entryLabelStyle,
  entryPrimaryButtonStyle,
  entrySecondaryButtonStyle,
} from "../components/CommunityEntryShell";
import { brandHelperText, brandInnerCard, gmfnBrand } from "../styles/gmfnBrand";
import { saveActivationContinuation } from "../lib/activationContinuation";
import { StableButton } from "../components/StableButton";

const DRAFT_KEY = "gsn_identity_first_create:v1";

type Draft = {
  identityRequestKey: string;
  creationRequestKey: string;
  displayName: string;
  phone: string;
  email: string;
  country: string;
  clanName: string;
  clanDescription: string;
};

function uniqueKey(prefix: string): string {
  const uuid = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${uuid}`.slice(0, 64);
}

function emptyDraft(): Draft {
  return {
    identityRequestKey: uniqueKey("identity"),
    creationRequestKey: uniqueKey("community"),
    displayName: "",
    phone: "",
    email: "",
    country: "",
    clanName: "",
    clanDescription: "",
  };
}

function initialDraft(): Draft {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (saved?.identityRequestKey && saved?.creationRequestKey) {
      return {
        identityRequestKey: String(saved.identityRequestKey),
        creationRequestKey: String(saved.creationRequestKey),
        displayName: String(saved.displayName || ""),
        phone: String(saved.phone || ""),
        email: String(saved.email || ""),
        country: String(saved.country || ""),
        clanName: String(saved.clanName || ""),
        clanDescription: String(saved.clanDescription || ""),
      };
    }
  } catch {
    return emptyDraft();
  }
  return emptyDraft();
}

function messageFrom(error: any): string {
  const detail = error?.detail || error?.response?.detail;
  return String(detail?.message || detail || error?.message || "GSN could not complete that step.");
}

function existingAccountNotice(error: any): string {
  const message = messageFrom(error).toLowerCase();
  if (message.includes("phone number already registered")) {
    return "This phone already has a GSN account. Sign in to continue.";
  }
  if (message.includes("email already registered")) {
    return "This email already has a GSN account. Sign in to continue.";
  }
  return "";
}

export default function IdentityFirstCreateCommunityPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(() => initialDraft());
  const [stage, setStage] = useState<"identity" | "verify" | "community">("identity");
  const [me, setMe] = useState<any>(null);
  const [verificationId, setVerificationId] = useState(0);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationReady, setVerificationReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [existingAccountFound, setExistingAccountFound] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    if (!getAccessToken()) return;
    void getMe()
      .then((user) => {
        setMe(user);
        if (user?.id) setStage("community");
      })
      .catch(() => setMe(null));
  }, []);

  const identityComplete = Boolean(me?.id && getAccessToken());
  const canStart = useMemo(
    () => Boolean(draft.displayName.trim() && draft.phone.trim() && draft.country.trim()),
    [draft.country, draft.displayName, draft.phone]
  );

  async function startPhone() {
    if (!canStart) return;
    setBusy(true);
    setExistingAccountFound(false);
    setNotice(null);
    try {
      const out = await startEntryPhoneVerification({
        display_name: draft.displayName.trim(),
        phone_e164: draft.phone.trim(),
        email: draft.email.trim() || undefined,
        country: draft.country.trim(),
      });
      setVerificationId(Number(out?.verification_id || 0));
      setVerificationReady(Boolean(out?.verified || out?.registered_only));
      if (out?.otp_preview) setVerificationCode(String(out.otp_preview));
      setStage("verify");
      setNotice({
        tone: "success",
        text: out?.registered_only
          ? "Phone registration is recorded for this controlled environment. Continue to establish your GSN ID."
          : out?.verified
            ? "This phone session is already verified. Continue to establish your GSN ID."
            : out?.otp_preview
              ? `Test verification code prepared: ${out.otp_preview}`
              : "A verification code was sent to your phone.",
      });
    } catch (error) {
      const accountNotice = existingAccountNotice(error);
      if (accountNotice) {
        setExistingAccountFound(true);
        setNotice({ tone: "info", text: accountNotice });
      } else {
        setNotice({ tone: "error", text: messageFrom(error) });
      }
    } finally {
      setBusy(false);
    }
  }

  function openSignIn() {
    const signInIdentifier = draft.phone.trim() || draft.email.trim();
    localStorage.removeItem(DRAFT_KEY);
    navigate("/login?force=1", {
      replace: true,
      state: {
        sign_in_identifier: signInIdentifier,
        sign_in_notice: "Your GSN account already exists. Sign in with your password.",
      },
    });
  }

  function useDifferentDetails() {
    setDraft((current) => ({
      ...current,
      identityRequestKey: uniqueKey("identity"),
      phone: "",
      email: "",
    }));
    setVerificationId(0);
    setVerificationCode("");
    setVerificationReady(false);
    setExistingAccountFound(false);
    setNotice(null);
    setStage("identity");
  }

  async function confirmPhone() {
    setBusy(true);
    setNotice(null);
    try {
      await confirmEntryPhoneVerification({ verification_id: verificationId, code: verificationCode });
      setVerificationReady(true);
      setNotice({ tone: "success", text: "Phone verified. GSN can now establish your identity." });
    } catch (error) {
      setNotice({ tone: "error", text: messageFrom(error) });
    } finally {
      setBusy(false);
    }
  }

  async function establishIdentity() {
    setBusy(true);
    setNotice(null);
    try {
      const out = await establishEntryIdentity({
        verification_id: verificationId,
        identity_request_key: draft.identityRequestKey,
        email: draft.email.trim() || undefined,
        country: draft.country.trim(),
      });
      saveActivationContinuation({
        gmfnId: String(out?.gmfn_id || "").trim(),
        activationToken: String(out?.activation_token || "").trim(),
      });
      const activationParams = new URLSearchParams({
        gmfn_id: String(out?.gmfn_id || ""),
        next: "/create?stage=community",
      });
      navigate(`/activate-membership?${activationParams.toString()}`, {
        state: {
          gmfn_id: out?.gmfn_id,
          activation_token: out?.activation_token,
          next_path: "/create?stage=community",
          next_label: "Continue community setup",
        },
      });
    } catch (error) {
      setNotice({ tone: "error", text: messageFrom(error) });
    } finally {
      setBusy(false);
    }
  }

  async function createCommunity() {
    if (!identityComplete) {
      setNotice({ tone: "info", text: "Activate or sign in to your GSN identity before creating the community." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const out = await createCommunityAfterIdentity({
        creation_request_key: draft.creationRequestKey,
        clan_name: draft.clanName.trim(),
        clan_description: draft.clanDescription.trim() || undefined,
        community_type: "informal_social",
        governance_weight: "light",
        invite_admission_mode: "instant_invite",
        invite_admin_override: false,
        search_join_admission_mode: "community_vote",
        search_join_admin_override: false,
      });
      localStorage.removeItem(DRAFT_KEY);
      navigate(out?.result_path || `/app/community/${out?.community_id}`, { replace: true });
    } catch (error) {
      setNotice({ tone: "error", text: messageFrom(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <CommunityEntryShell
      eyebrow={existingAccountFound ? "Existing member" : "Create community"}
      title={
        existingAccountFound
          ? "Sign in to continue"
          : stage === "community"
            ? "Set up your community"
            : "Secure your identity first"
      }
      summary={
        existingAccountFound
          ? "These details already belong to a GSN account. Use that account instead of creating another one."
          : stage === "community"
            ? "Name the new community, add a short description, and create it. Nothing else is required here."
            : "Secure your personal GSN identity first, then continue directly to creating one new community."
      }
      exitLabel="Leave create journey"
    >
      <div style={{ display: "grid", gap: 16 }} data-gsn-identity-first-create="true">
        {existingAccountFound ? (
          <>
            <EntryNotice tone="info">
              {notice?.text || "This account already exists. Sign in to continue."}
            </EntryNotice>
            <StableButton
              debugId="identity-first.existing-account.sign-in"
              onClick={openSignIn}
              style={entryPrimaryButtonStyle}
            >
              Sign in
            </StableButton>
            <StableButton
              debugId="identity-first.existing-account.different-details"
              onClick={useDifferentDetails}
              style={entrySecondaryButtonStyle}
            >
              Use different details
            </StableButton>
          </>
        ) : (
          <>
        {notice ? <EntryNotice tone={notice.tone}>{notice.text}</EntryNotice> : null}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {["Identity", "Secure account", "Community"].map((label, index) => (
            <div key={label} style={{ borderRadius: 999, padding: "8px 6px", textAlign: "center", fontSize: 12, fontWeight: 850, background: (stage === "community" ? index <= 2 : stage === "verify" ? index <= 1 : index === 0) ? gmfnBrand.colors.accentSoft : "rgba(9,27,46,0.06)", color: gmfnBrand.colors.inkSoft }}>{label}</div>
          ))}
        </div>

        {stage === "identity" ? (
          <>
            <label style={entryLabelStyle}>Your name<input value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} autoComplete="name" style={entryFieldStyle} /></label>
            <label style={entryLabelStyle}>Phone in international format<input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="+44… or +234…" autoComplete="tel" style={entryFieldStyle} /></label>
            <label style={entryLabelStyle}>Email (optional)<input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} type="email" autoComplete="email" style={entryFieldStyle} /></label>
            <label style={entryLabelStyle}>Country<input value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} autoComplete="country-name" style={entryFieldStyle} /></label>
            <StableButton debugId="identity-first.verify-details" onClick={() => void startPhone()} disabled={busy || !canStart} style={entryPrimaryButtonStyle}>{busy ? "Preparing…" : "Verify identity details"}</StableButton>
          </>
        ) : stage === "verify" ? (
          <>
            <div style={brandInnerCard()}>
              <strong style={{ display: "block" }}>{draft.displayName}</strong>
              <span style={brandHelperText()}>{draft.phone}</span>
            </div>
            {!verificationReady ? (
              <>
                <label style={entryLabelStyle}>Verification code<input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} inputMode="numeric" style={entryFieldStyle} /></label>
                <StableButton debugId="identity-first.confirm-phone" onClick={() => void confirmPhone()} disabled={busy || !verificationCode.trim()} style={entryPrimaryButtonStyle}>Confirm phone</StableButton>
              </>
            ) : (
              <StableButton debugId="identity-first.create-gsn-id" onClick={() => void establishIdentity()} disabled={busy} style={entryPrimaryButtonStyle}>{busy ? "Establishing GSN ID…" : "Create my GSN ID"}</StableButton>
            )}
            <StableButton debugId="identity-first.edit-details" onClick={() => setStage("identity")} style={entrySecondaryButtonStyle}>Edit identity details</StableButton>
          </>
        ) : (
          <>
            {identityComplete ? <EntryNotice tone="success">GSN identity secured as {me?.gmfn_id}. Community setup can now be retried without recreating your identity.</EntryNotice> : <EntryNotice>Sign in or finish activation, then return to this saved community setup.</EntryNotice>}
            <label style={entryLabelStyle}>Community name<input value={draft.clanName} onChange={(e) => setDraft({ ...draft, clanName: e.target.value })} style={entryFieldStyle} /></label>
            <label style={entryLabelStyle}>Short description<textarea value={draft.clanDescription} onChange={(e) => setDraft({ ...draft, clanDescription: e.target.value })} rows={3} style={entryFieldStyle} /></label>

            <StableButton debugId="identity-first.create-community" onClick={() => void createCommunity()} disabled={busy || !identityComplete || draft.clanName.trim().length < 2} style={entryPrimaryButtonStyle}>{busy ? "Creating community…" : "Create community"}</StableButton>
          </>
        )}
          </>
        )}
      </div>
    </CommunityEntryShell>
  );
}
