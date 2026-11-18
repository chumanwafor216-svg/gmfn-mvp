import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  inviteMode: "instant_invite" | "community_vote";
  inviteOverride: boolean;
  searchEnabled: boolean;
  searchMode: "instant_invite" | "community_vote";
  searchOverride: boolean;
};

function uniqueKey(prefix: string): string {
  const uuid = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${uuid}`.slice(0, 64);
}

function initialDraft(): Draft {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (saved?.identityRequestKey && saved?.creationRequestKey) return saved;
  } catch {
  }
  return {
    identityRequestKey: uniqueKey("identity"),
    creationRequestKey: uniqueKey("community"),
    displayName: "",
    phone: "",
    email: "",
    country: "",
    clanName: "",
    clanDescription: "",
    inviteMode: "instant_invite",
    inviteOverride: false,
    searchEnabled: false,
    searchMode: "community_vote",
    searchOverride: false,
  };
}

function messageFrom(error: any): string {
  const detail = error?.detail || error?.response?.detail;
  return String(detail?.message || detail || error?.message || "GSN could not complete that step.");
}

export default function IdentityFirstCreateCommunityPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [draft, setDraft] = useState<Draft>(() => initialDraft());
  const [stage, setStage] = useState<"identity" | "verify" | "community">(
    searchParams.get("stage") === "community" ? "community" : "identity"
  );
  const [me, setMe] = useState<any>(null);
  const [verificationId, setVerificationId] = useState(0);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationReady, setVerificationReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    if (!getAccessToken()) return;
    void getMe()
      .then((user) => {
        setMe(user);
        if (user?.id && searchParams.get("stage") === "community") setStage("community");
      })
      .catch(() => setMe(null));
  }, [searchParams]);

  const identityComplete = Boolean(me?.id && getAccessToken());
  const canStart = useMemo(
    () => Boolean(draft.displayName.trim() && draft.phone.trim() && draft.country.trim()),
    [draft.country, draft.displayName, draft.phone]
  );

  async function startPhone() {
    if (!canStart) return;
    setBusy(true);
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
      setNotice({ tone: "error", text: messageFrom(error) });
    } finally {
      setBusy(false);
    }
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
        invite_admission_mode: draft.inviteMode,
        invite_admin_override: draft.inviteOverride,
        search_join_enabled: draft.searchEnabled,
        search_join_admission_mode: draft.searchMode,
        search_join_admin_override: draft.searchOverride,
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
      eyebrow="Start a new community"
      title={stage === "community" ? "Set up your community" : "Secure your identity first"}
      summary="GSN creates your personal identity before the community. Your identity remains safe and resumable if community setup needs another attempt."
    >
      <div style={{ display: "grid", gap: 16 }} data-gsn-identity-first-create="true">
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
            <button type="button" onClick={() => void startPhone()} disabled={busy || !canStart} style={entryPrimaryButtonStyle}>{busy ? "Preparing…" : "Verify identity details"}</button>
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
                <button type="button" onClick={() => void confirmPhone()} disabled={busy || !verificationCode.trim()} style={entryPrimaryButtonStyle}>Confirm phone</button>
              </>
            ) : (
              <button type="button" onClick={() => void establishIdentity()} disabled={busy} style={entryPrimaryButtonStyle}>{busy ? "Establishing GSN ID…" : "Create my GSN ID"}</button>
            )}
            <button type="button" onClick={() => setStage("identity")} style={entrySecondaryButtonStyle}>Edit identity details</button>
          </>
        ) : (
          <>
            {identityComplete ? <EntryNotice tone="success">GSN identity secured as {me?.gmfn_id}. Community setup can now be retried without recreating your identity.</EntryNotice> : <EntryNotice>Sign in or finish activation, then return to this saved community setup.</EntryNotice>}
            <label style={entryLabelStyle}>Community name<input value={draft.clanName} onChange={(e) => setDraft({ ...draft, clanName: e.target.value })} style={entryFieldStyle} /></label>
            <label style={entryLabelStyle}>Short description<textarea value={draft.clanDescription} onChange={(e) => setDraft({ ...draft, clanDescription: e.target.value })} rows={3} style={entryFieldStyle} /></label>

            <div style={brandInnerCard()}>
              <strong>People joining by invitation</strong>
              <p style={brandHelperText()}>Invite links remain private and separate from public search.</p>
              <select value={draft.inviteMode} onChange={(e) => setDraft({ ...draft, inviteMode: e.target.value as Draft["inviteMode"], inviteOverride: e.target.value === "community_vote" ? draft.inviteOverride : false })} style={entryFieldStyle}>
                <option value="instant_invite">Join instantly with a valid invite</option>
                <option value="community_vote">Community members vote</option>
              </select>
              {draft.inviteMode === "community_vote" ? <label style={{ ...entryLabelStyle, gridTemplateColumns: "auto 1fr", alignItems: "center", marginTop: 12 }}><input type="checkbox" checked={draft.inviteOverride} onChange={(e) => setDraft({ ...draft, inviteOverride: e.target.checked })} /> Allow an admin to override the vote when necessary</label> : null}
            </div>

            <div style={brandInnerCard()}>
              <label style={{ ...entryLabelStyle, gridTemplateColumns: "auto 1fr", alignItems: "center" }}><input type="checkbox" checked={draft.searchEnabled} onChange={(e) => setDraft({ ...draft, searchEnabled: e.target.checked })} /> Let people find this community and ask to join</label>
              {draft.searchEnabled ? (
                <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                  <select value={draft.searchMode} onChange={(e) => setDraft({ ...draft, searchMode: e.target.value as Draft["searchMode"], searchOverride: e.target.value === "community_vote" ? draft.searchOverride : false })} style={entryFieldStyle}>
                    <option value="community_vote">Community members vote</option>
                    <option value="instant_invite">Join instantly after verified request</option>
                  </select>
                  {draft.searchMode === "community_vote" ? <label style={{ ...entryLabelStyle, gridTemplateColumns: "auto 1fr", alignItems: "center" }}><input type="checkbox" checked={draft.searchOverride} onChange={(e) => setDraft({ ...draft, searchOverride: e.target.checked })} /> Allow an admin to override the vote when necessary</label> : null}
                </div>
              ) : null}
            </div>
            <button type="button" onClick={() => void createCommunity()} disabled={busy || !identityComplete || draft.clanName.trim().length < 2} style={entryPrimaryButtonStyle}>{busy ? "Creating community…" : "Create community"}</button>
          </>
        )}
      </div>
    </CommunityEntryShell>
  );
}
