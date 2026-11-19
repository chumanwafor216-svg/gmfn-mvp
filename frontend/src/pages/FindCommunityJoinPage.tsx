import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  confirmEntryPhoneVerification,
  createSearchJoinRequest,
  getAccessToken,
  getJoinableCommunity,
  getMe,
  searchJoinableCommunities,
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
import OriginLink from "../components/OriginLink";
import { StableButton } from "../components/StableButton";

type CommunityResult = {
  community_id: number;
  community_code: string;
  community_name: string;
  description?: string | null;
  admission_mode: string;
  admission_mode_label: string;
  admission_explanation: string;
};

function messageFrom(error: any): string {
  const detail = error?.detail || error?.response?.detail;
  return String(detail?.message || detail || error?.message || "GSN could not complete that step.");
}

export default function FindCommunityJoinPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommunityResult[]>([]);
  const [selected, setSelected] = useState<CommunityResult | null>(
    ((location.state as any)?.community as CommunityResult) || null
  );
  const [me, setMe] = useState<any>(null);
  const [form, setForm] = useState({ firstName: "", surname: "", phone: "", country: "", note: "" });
  const [verificationId, setVerificationId] = useState(0);
  const [verificationCode, setVerificationCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    if (!getAccessToken()) return;
    void getMe().then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    const communityId = Number(params.clanId || 0);
    if (!communityId || selected) return;
    setBusy(true);
    void getJoinableCommunity(communityId)
      .then((out) => setSelected(out?.community || null))
      .catch((error) => setNotice({ tone: "error", text: messageFrom(error) }))
      .finally(() => setBusy(false));
  }, [params.clanId, selected]);

  const signedIn = Boolean(me?.id);
  const canSubmit = useMemo(
    () => Boolean(selected && (signedIn || (phoneVerified && form.firstName.trim() && form.country.trim()))),
    [form.country, form.firstName, phoneVerified, selected, signedIn]
  );

  async function runSearch() {
    if (query.trim().length < 2) {
      setNotice({ tone: "info", text: "Enter at least two letters from the community name or its GSN community ID." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const out = await searchJoinableCommunities(query.trim());
      setResults(Array.isArray(out?.items) ? out.items : []);
      if (!out?.items?.length) {
        setNotice({ tone: "info", text: "No opted-in community matched that search. Check the name or ask the community for an invite." });
      }
    } catch (error) {
      setNotice({ tone: "error", text: messageFrom(error) });
    } finally {
      setBusy(false);
    }
  }

  async function startVerification() {
    if (!form.firstName.trim() || !form.phone.trim() || !form.country.trim()) {
      setNotice({ tone: "info", text: "Add your name, phone, and country before verifying the phone." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const out = await startEntryPhoneVerification({
        display_name: `${form.firstName} ${form.surname}`.trim(),
        phone_e164: form.phone.trim(),
        country: form.country.trim(),
      });
      setVerificationId(Number(out?.verification_id || 0));
      if (out?.otp_preview) setVerificationCode(String(out.otp_preview));
      setNotice({
        tone: "success",
        text: out?.otp_preview
          ? `Test verification code prepared: ${out.otp_preview}`
          : "A verification code was sent to your phone.",
      });
    } catch (error) {
      setNotice({ tone: "error", text: messageFrom(error) });
    } finally {
      setBusy(false);
    }
  }

  async function confirmVerification() {
    setBusy(true);
    setNotice(null);
    try {
      await confirmEntryPhoneVerification({ verification_id: verificationId, code: verificationCode });
      setPhoneVerified(true);
      setNotice({ tone: "success", text: "Phone verified. Your request can now be sent safely." });
    } catch (error) {
      setNotice({ tone: "error", text: messageFrom(error) });
    } finally {
      setBusy(false);
    }
  }

  async function submitRequest() {
    if (!selected || !canSubmit) return;
    setBusy(true);
    setNotice(null);
    try {
      const out = await createSearchJoinRequest({
        community_id: selected.community_id,
        ...(signedIn
          ? {}
          : {
              verification_id: verificationId,
              first_name: form.firstName.trim(),
              surname: form.surname.trim() || undefined,
              phone_e164: form.phone.trim(),
              country: form.country.trim(),
              note: form.note.trim() || undefined,
            }),
      });
      const requestId = String(out?.request_id || out?.request?.id || "").trim();
      saveActivationContinuation({
        requestId,
        gmfnId: String(out?.gmfn_id || "").trim(),
        statusToken: String(out?.status_token || "").trim(),
        activationToken: String(out?.activation_token || "").trim(),
      });
      if (String(out?.status || "").toLowerCase() === "approved") {
        if (out?.activation_required) {
          const activationParams = new URLSearchParams({
            gmfn_id: String(out?.gmfn_id || ""),
            request_id: requestId,
          });
          navigate(`/activate-membership?${activationParams.toString()}`, {
            state: {
              gmfn_id: out?.gmfn_id,
              request_id: requestId,
              activation_token: out?.activation_token,
              status_token: out?.status_token,
              community_id: selected.community_id,
              community_name: selected.community_name,
            },
          });
          return;
        }
        navigate(out?.result_path || `/app/community/${selected.community_id}`, { replace: true });
        return;
      }
      navigate("/pending-approval", {
        state: {
          request_id: requestId,
          status_token: out?.status_token,
          community_id: selected.community_id,
          community_name: selected.community_name,
          request_source: "search",
        },
      });
    } catch (error) {
      setNotice({ tone: "error", text: messageFrom(error) });
    } finally {
      setBusy(false);
    }
  }

  function chooseDifferentCommunity() {
    setSelected(null);
    setVerificationId(0);
    setVerificationCode("");
    setPhoneVerified(false);
    setNotice(null);
    if (params.clanId) navigate("/join", { replace: true });
  }

  return (
    <CommunityEntryShell
      eyebrow="Join an existing community"
      title="Find your community"
      summary="Search communities that chose to be discoverable, select the right one, then ask to join. Invite links still work separately."
      exitLabel="Leave join journey"
    >
      <div style={{ display: "grid", gap: 16 }} data-gsn-search-join="true">
        {notice ? <EntryNotice tone={notice.tone}>{notice.text}</EntryNotice> : null}
        {!selected ? (
          <>
            <label style={entryLabelStyle}>
              Community name or GSN community ID
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void runSearch()}
                placeholder="Example: Enugu Support Circle"
                style={entryFieldStyle}
                autoComplete="off"
              />
            </label>
            <StableButton debugId="find-community.search" onClick={() => void runSearch()} disabled={busy} style={entryPrimaryButtonStyle}>
              {busy ? "Searching…" : "Find communities"}
            </StableButton>
            <div style={{ display: "grid", gap: 10 }}>
              {results.map((community) => (
                <StableButton
                  key={community.community_id}
                  debugId={`find-community.select.${community.community_id}`}
                  onClick={() => setSelected(community)}
                  style={{
                    ...brandInnerCard(),
                    display: "block",
                    textAlign: "left",
                    cursor: "pointer",
                    color: gmfnBrand.colors.ink,
                  }}
                >
                  <strong style={{ display: "block", fontSize: 17 }}>{community.community_name}</strong>
                  <span style={{ ...brandHelperText(), display: "block", marginTop: 4 }}>{community.community_code}</span>
                  {community.description ? <span style={{ ...brandHelperText(), display: "block", marginTop: 8 }}>{community.description}</span> : null}
                  <span style={{ display: "block", color: gmfnBrand.colors.accent, fontWeight: 850, marginTop: 10 }}>
                    {community.admission_mode_label} · Select
                  </span>
                </StableButton>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={brandInnerCard()}>
              <div style={{ fontSize: 12, color: gmfnBrand.colors.label, fontWeight: 900, textTransform: "uppercase" }}>Selected community</div>
              <h2 style={{ margin: "7px 0 4px", fontSize: 22 }}>{selected.community_name}</h2>
              <div style={brandHelperText()}>{selected.community_code}</div>
              <p style={{ ...brandHelperText(), marginBottom: 0 }}>{selected.admission_explanation}</p>
            </div>
            <StableButton debugId="find-community.choose-different" onClick={chooseDifferentCommunity} style={entrySecondaryButtonStyle}>
              Choose a different community
            </StableButton>
            {signedIn ? (
              <EntryNotice tone="success">Signed in as {me?.display_name || me?.gmfn_id}. GSN will reuse this identity.</EntryNotice>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={entryLabelStyle}>First name<input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} style={entryFieldStyle} /></label>
                  <label style={entryLabelStyle}>Surname<input value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} style={entryFieldStyle} /></label>
                </div>
                <label style={entryLabelStyle}>Phone in international format<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+44… or +234…" style={entryFieldStyle} disabled={phoneVerified} /></label>
                <label style={entryLabelStyle}>Country<input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} style={entryFieldStyle} /></label>
                {!verificationId ? (
                  <StableButton debugId="find-community.verify-phone" onClick={() => void startVerification()} disabled={busy} style={entryPrimaryButtonStyle}>Verify phone</StableButton>
                ) : !phoneVerified ? (
                  <>
                    <label style={entryLabelStyle}>Verification code<input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} inputMode="numeric" style={entryFieldStyle} /></label>
                    <StableButton debugId="find-community.confirm-phone" onClick={() => void confirmVerification()} disabled={busy || !verificationCode.trim()} style={entryPrimaryButtonStyle}>Confirm phone</StableButton>
                  </>
                ) : null}
                <label style={entryLabelStyle}>Short note (optional)<textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={3} style={entryFieldStyle} /></label>
                <div style={{ ...brandHelperText(), textAlign: "center" }}>
                  Already have a GSN ID? <OriginLink to={`/login?force=1&next=${encodeURIComponent(location.pathname)}`} style={{ color: gmfnBrand.colors.accent, fontWeight: 850 }}>Sign in first</OriginLink>
                </div>
              </>
            )}
            <StableButton debugId="find-community.submit-request" onClick={() => void submitRequest()} disabled={busy || !canSubmit} style={entryPrimaryButtonStyle}>
              {busy ? "Sending request…" : selected.admission_mode === "instant_invite" ? "Join this community" : "Ask to join"}
            </StableButton>
          </>
        )}
      </div>
    </CommunityEntryShell>
  );
}
