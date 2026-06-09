import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  PrimaryButton,
  SecondaryButton,
  StableCtaLink,
  StableDisclosureSummary,
  SubtleButton,
} from "../components/StableButton";
import * as api from "../lib/api";
import {
  institutionalPageCard,
  institutionalSoftCard,
} from "../lib/institutionalSurface";
import { navigateWithOrigin } from "../lib/nav";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import { buildTrustSlipVerifySnapshot } from "../lib/trustDocumentSnapshots";
import TrustSlipVerifyBoundary from "./trustSlipVerify/TrustSlipVerifyBoundary";
import TrustSlipVerifyPrivateEvidence from "./trustSlipVerify/TrustSlipVerifyPrivateEvidence";
import TrustSlipVerifyPublicPaper from "./trustSlipVerify/TrustSlipVerifyPublicPaper";
import type { CommunityConfirmationCallbackDraft } from "./trustSlipVerify/TrustSlipVerifyPublicPaper";
import {
  callFirstAvailable,
  deriveBanner,
  normalizeTrustSlipVerification,
  type CommunityConfirmationOutcome,
  type TrustSlipVerifyRecord,
  type VerifyBannerTone,
} from "./trustSlipVerify/trustSlipVerifyData";
import { buildTrustSlipVerifyViewModel } from "./trustSlipVerify/trustSlipVerifyViewModel";
type NoticeTone = "success" | "error";

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

function firstNumberLike(...values: any[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || String(value).trim() === "") {
      continue;
    }
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    borderRadius: 26,
    padding: 20,
    backdropFilter: "blur(6px)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    borderRadius: 20,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#39526C",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#526579",
    fontSize: 14.5,
    lineHeight: 1.75,
  };
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  return {
    ...softCard(tone === "success" ? "#F3FBF5" : "#FEF2F2"),
    color: tone === "success" ? "#166534" : "#991B1B",
    border:
      tone === "success"
        ? "1px solid rgba(34,197,94,0.16)"
        : "1px solid rgba(239,68,68,0.16)",
    fontWeight: 800,
  };
}

function bannerToneStyle(tone: VerifyBannerTone): {
  bg: string;
  border: string;
  text: string;
} {
  if (tone === "success") {
    return {
      bg: "#F3FBF5",
      border: "1px solid rgba(34,197,94,0.16)",
      text: "#166534",
    };
  }

  if (tone === "warning") {
    return {
      bg: "#FFFBEF",
      border: "1px solid rgba(245,158,11,0.16)",
      text: "#92400E",
    };
  }

  if (tone === "error") {
    return {
      bg: "#FFF5F5",
      border: "1px solid rgba(239,68,68,0.16)",
      text: "#991B1B",
    };
  }

  return {
    bg: "#F8FBFF",
    border: "1px solid rgba(11,99,209,0.12)",
    text: "#0B63D1",
  };
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

export default function TrustSlipVerifyPage() {
  const params = useParams<{ code?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [record, setRecord] = useState<TrustSlipVerifyRecord | null>(null);
  const [resolvedCode, setResolvedCode] = useState("");
  const [codeEntry, setCodeEntry] = useState("");
  const [loadError, setLoadError] = useState("");
  const [confirmationBusy, setConfirmationBusy] = useState(false);
  const [confirmationOutcome, setConfirmationOutcome] =
    useState<CommunityConfirmationOutcome | null>(null);

  const isAppRoute = location.pathname.startsWith("/app/");
  const selectedClanId = Number((api as any).getSelectedClanId?.() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "trust-slip-verify.route.dashboard"),
      trustSlip: routeTarget("trustSlip", selectedClanId, "trust-slip-verify.route.trust-slip"),
      trust: routeTarget("trust", selectedClanId, "trust-slip-verify.route.trust"),
    }),
    [selectedClanId]
  );
  const queryCode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return safeStr(params.get("code"));
  }, [location.search]);

  const requestedCode = useMemo(() => {
    return firstTruthy(params.code, queryCode);
  }, [params.code, queryCode]);

  const noPublicCodeSupplied = !isAppRoute && !requestedCode;

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

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setLoadError("");

      try {
        const [meRes, clanRes] = isAppRoute
          ? await Promise.all([
              (api as any).getMe?.().catch(() => null) ?? Promise.resolve(null),
              (api as any).getCurrentClan?.().catch(() => null) ?? Promise.resolve(null),
            ])
          : [null, null];

        if (!alive) return;
        setMe(meRes || null);
        setCurrentClan(clanRes || null);

        let codeToUse = requestedCode;

        if (!codeToUse && isAppRoute && typeof (api as any).getMyTrustSlip === "function") {
          const mySlip = await (api as any).getMyTrustSlip().catch(() => null);
          codeToUse = firstTruthy(mySlip?.code, mySlip?.trust_slip_code);
          if (!alive) return;
        }

        setResolvedCode(codeToUse);

        if (!codeToUse) {
          setRecord(null);
          setLoadError("No TrustSlip code was supplied.");
          return;
        }

        const verifyResult = await callFirstAvailable(
          [
            "verifyTrustSlipCode",
            "verifyTrustSlip",
            "getTrustSlipVerify",
            "getTrustSlipVerification",
            "getTrustSlipByCode",
            "getTrustSlipPublic",
            "getTrustSlipPublicByCode",
          ],
          [[codeToUse], [{ code: codeToUse }], [codeToUse, { code: codeToUse }]]
        );

        if (!alive) return;

        const normalized = normalizeTrustSlipVerification(verifyResult, codeToUse);
        setRecord(normalized);
        setConfirmationOutcome(null);

        if (!normalized) {
          setLoadError(
            "The supplied TrustSlip code did not return a readable verification record."
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [requestedCode, isAppRoute]);

  const communityLabel = useMemo(() => {
    return (
      firstTruthy(
        record?.community_name,
        record?.marketplace_name,
        record?.clan_name,
        isAppRoute ? currentClan?.marketplace_name : null,
        isAppRoute ? currentClan?.name : null,
        isAppRoute ? currentClan?.display_name : null,
        isAppRoute ? currentClan?.title : null
      ) || "Not stated"
    );
  }, [record, currentClan, isAppRoute]);

  const gmfnId = useMemo(() => {
    return firstTruthy(record?.gmfn_id, isAppRoute ? me?.gmfn_id : null, "Awaiting issue");
  }, [record, me, isAppRoute]);

  const holderName = useMemo(() => {
    return (
      firstTruthy(
        record?.holder_name,
        isAppRoute ? me?.display_name : null,
        isAppRoute ? me?.nickname : null,
        isAppRoute ? me?.name : null,
        isAppRoute ? me?.first_name : null,
        isAppRoute ? me?.email : null
      ) || "Member"
    );
  }, [record, me, isAppRoute]);

  const visibleBand = firstTruthy(
    record?.open_trust_band,
    record?.community_trust_band,
    record?.trust_band,
    record?.open_trust_class,
    record?.community_trust_class,
    record?.trust_class,
    "Visible reading"
  );

  const visibleScore = firstNumberLike(
    record?.open_trust_score,
    record?.community_trust_score,
    record?.trust_score
  );

  const banner = useMemo(() => deriveBanner(record), [record]);
  const bannerStyle = bannerToneStyle(banner.tone);

  const trustSlipView = useMemo(
    () =>
      buildTrustSlipVerifyViewModel({
        record,
        me,
        isAppRoute,
        holderName,
        communityLabel,
        visibleBand,
        visibleScore,
        resolvedCode,
        banner,
      }),
    [
      record,
      me,
      isAppRoute,
      holderName,
      communityLabel,
      visibleBand,
      visibleScore,
      resolvedCode,
      banner,
    ]
  );

  const {
    trustLimit,
    currency,
    cciReading,
    cciBand,
    sponsorCount,
    profileImageUrl,
    communityGlobalId,
    holderRole,
    activeMemberCount,
    activeCommunityCount,
    identityStatusLabel,
    cciMeaning,
    phoneVerified,
    merchantVerifyActive,
    lastReleaseText,
    lastFullRepaymentText,
    snapshotLabel,
    riskFlags,
    personalCommitmentDiscipline,
    contributionDiscipline,
    repaymentDiscipline,
    commitmentPlainLanguage,
    personalCommitmentPlainLanguage,
    commitmentSourceNote,
    fourDecisionQuestions,
    readerVerdict,
    verifyPath,
    verifyUrl,
    compactTrustLimit,
    publicVisibleScore,
    visibleBandLabel,
    visibleBandMeaning,
    visibleEvidenceLabel,
    validNow,
    publicValidityLabel,
    quickTrustAnswers,
    communityConfirmation,
    communityVerifyPath,
    communityRelayAvailable,
    communityPulseAvailable,
    communityConfirmationText,
    communityConfirmationRows,
    statusLabel,
    issuedAtLabel,
    expiresAtLabel,
    systemNote,
    verificationState,
    verificationNote,
  } = trustSlipView;

  const confirmationResult = confirmationOutcome?.community_response || null;
  const confirmationPublicPath = confirmationOutcome?.public_token
    ? `/community-confirmations/public/${encodeURIComponent(String(confirmationOutcome.public_token))}`
    : "";

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  async function copyTextWithNotice(text: string, successText: string, emptyText: string) {
    const value = safeStr(text);
    if (!value) {
      showNotice("error", emptyText);
      return;
    }

    const copied = await api.safeCopy(value);
    showNotice(
      copied ? "success" : "error",
      copied ? successText : "Copy did not complete. Select the text and copy it manually."
    );
  }

  function submitCodeEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = safeStr(codeEntry).replace(/\s+/g, "");
    if (!code) {
      showNotice("error", "Enter the TrustSlip code first.");
      return;
    }
    navigateWithOrigin(
      navigate,
      `/trust-slips/verify/${encodeURIComponent(code)}/page`,
      location
    );
  }

  async function requestCommunityPulse(draft: CommunityConfirmationCallbackDraft = {}) {
    const code = firstTruthy(record?.code, resolvedCode);
    if (!code) {
      showNotice("error", "TrustSlip code is not available.");
      return;
    }

    if (!communityPulseAvailable) {
      showNotice("error", "Community confirmation relay is not available yet.");
      return;
    }

    setConfirmationBusy(true);

    try {
      const result = await (api as any).requestCommunityConfirmation({
        trust_slip_code: code,
        requester_external_label:
          firstTruthy(draft.requesterExternalLabel, "TrustSlip public viewer"),
        requester_callback_channel: draft.callbackChannel || "none",
        requester_callback_contact: draft.callbackContact || undefined,
        requester_callback_consent: Boolean(draft.callbackConsent),
        reason_type: "merchant_trust_check",
        risk_level: "low",
        mode: communityConfirmation?.instant_pulse_available ? "instant_pulse" : "relay",
      });
      setConfirmationOutcome(result);
      showNotice("success", "Community confirmation request opened.");
      if (result?.public_token) {
        navigateWithOrigin(
          navigate,
          `/community-confirmations/public/${encodeURIComponent(String(result.public_token))}`,
          location
        );
      }
    } catch {
      showNotice("error", "Community confirmation could not be opened yet.");
    } finally {
      setConfirmationBusy(false);
    }
  }

  async function copyVerifyLink() {
    await copyTextWithNotice(
      verifyUrl,
      "Verify link copied.",
      "Verify link is not available."
    );
  }

  async function copyCode() {
    await copyTextWithNotice(
      resolvedCode,
      "TrustSlip code copied.",
      "TrustSlip code is not available."
    );
  }

  async function copyGmfnId() {
    if (!gmfnId || gmfnId === "Awaiting issue") {
      showNotice("error", "GSN ID is not available.");
      return;
    }

    await copyTextWithNotice(gmfnId, "GSN ID copied.", "GSN ID is not available.");
  }

  async function copyVerificationSnapshot() {
    await copyTextWithNotice(
      buildTrustSlipVerifySnapshot({
        holderName,
        gmfnId,
        communityLabel,
        trustSlipCode: resolvedCode || "Not available",
        visibleBand,
        visibleScore: visibleScore === null ? "-" : String(Math.round(visibleScore)),
        verificationStatus: banner.title,
        issuedAt: issuedAtLabel,
        expiresAt: expiresAtLabel,
        verifyUrl,
      }),
      "Verification snapshot copied.",
      "Verification snapshot is not ready yet."
    );
  }

  const publicTrustSlipActions = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
        gap: isCompact ? 8 : 12,
      }}
    >
      <SecondaryButton
        type="button"
        onClick={() => {
          if (typeof window !== "undefined" && typeof window.print === "function") {
            window.print();
            return;
          }
          showNotice(
            "error",
            "Print is not available in this browser. Use Copy verify link instead."
          );
        }}
        stableHeight={isCompact ? 52 : 58}
        fullWidth={isCompact}
        minWidth={isCompact ? undefined : 176}
        debugId="trust-slip-verify.public.print"
        style={{
          borderRadius: 12,
          background: "#062B58",
          color: "#FFFFFF",
          fontWeight: 1000,
        }}
      >
        Print / save PDF
      </SecondaryButton>
      {isAppRoute ? (
        <SecondaryButton
          type="button"
          onClick={() => navigateWithOrigin(navigate, routes.trust, location)}
          stableHeight={isCompact ? 52 : 58}
          fullWidth={isCompact}
          minWidth={isCompact ? undefined : 132}
          debugId="trust-slip-verify.public.open-passport"
          style={{ borderRadius: 12, fontWeight: 1000 }}
        >
          Lite view
        </SecondaryButton>
      ) : (
        <SecondaryButton
          type="button"
          onClick={() => navigateWithOrigin(navigate, "/guide", location)}
          stableHeight={isCompact ? 52 : 58}
          fullWidth={isCompact}
          minWidth={isCompact ? undefined : 132}
          debugId="trust-slip-verify.public.open-guide"
          style={{ borderRadius: 12, fontWeight: 1000 }}
        >
          Lite view
        </SecondaryButton>
      )}
      {communityVerifyPath ? (
        <StableCtaLink
          to={communityVerifyPath}
          kind="primary"
          stableHeight={isCompact ? 52 : 58}
          fullWidth={isCompact}
          minWidth={isCompact ? undefined : 190}
          debugId="trust-slip-verify.public.open-community-record"
          style={{
            borderRadius: 12,
            background: "linear-gradient(135deg, #D6AA45 0%, #B7791F 100%)",
            color: "#FFFFFF",
            fontWeight: 1000,
          }}
        >
          Request current TrustSlip
        </StableCtaLink>
      ) : (
        <SecondaryButton
          type="button"
          onClick={() => {
            showNotice(
              "error",
              "Public community record is not ready yet. Ask the holder to refresh TrustSlip or request community confirmation first."
            );
          }}
          stableHeight={isCompact ? 52 : 58}
          fullWidth={isCompact}
          minWidth={isCompact ? undefined : 190}
          debugId="trust-slip-verify.public.open-community-record"
          style={{
            borderRadius: 12,
            background: "linear-gradient(135deg, #D6AA45 0%, #B7791F 100%)",
            color: "#FFFFFF",
            fontWeight: 1000,
          }}
        >
          Request current TrustSlip
        </SecondaryButton>
      )}
      <div style={{ display: "none" }}>
        <SecondaryButton
          type="button"
          onClick={() => {
            void copyVerifyLink();
          }}
          stableHeight={44}
          debugId="trust-slip-verify.public.copy-link"
        >
          Copy verify link
        </SecondaryButton>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          paddingBottom: 40,
          display: "grid",
          gap: 18,
        }}
      >
        {isAppRoute ? (
          <PageTopNav
            sectionLabel="TrustSlip Verify"
            title="TrustSlip Verify"
            subtitle="Loading the verification reading..."
            homeTo={routes.dashboard}
            homeLabel="Dashboard"
            backTo={routes.trustSlip}
            backLabel="TrustSlip"
          />
        ) : (
          <section
            style={pageCard(
              "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
            )}
          >
            <div style={sectionLabel()}>TrustSlip verify</div>
            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontSize: isCompact ? 28 : 34,
                fontWeight: 900,
                lineHeight: 1.1,
              }}
            >
              Loading verification page
            </div>
            <div style={{ marginTop: 12, ...helperText(), color: "#D7E3F1" }}>
              Reading the TrustSlip verification record...
            </div>
          </section>
        )}

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading TrustSlip verification...
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1080,
        margin: "0 auto",
        paddingBottom: 40,
        display: "grid",
        gap: 18,
      }}
    >
      <style>{`
        @page { margin: 14mm; }
        @media print {
          body { background: #ffffff !important; }
          a[href]:after { content: "" !important; }
          button { display: none !important; }
          .print-trust-nav { display: none !important; }
          .print-trust-document,
          .print-trust-support {
            box-shadow: none !important;
            border: 1px solid rgba(148,163,184,0.34) !important;
            background: #ffffff !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
      {isAppRoute ? (
        <div className="print-trust-nav">
          <PageTopNav
            sectionLabel="TrustSlip Verify"
            title="TrustSlip Verify"
            subtitle="Check the holder, status, QR code, and safe public limits."
            homeTo={routes.dashboard}
            homeLabel="Dashboard"
            backTo={routes.trustSlip}
            backLabel="TrustSlip"
          />
        </div>
      ) : (
        <section
          style={pageCard(
            "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
          )}
        >
          <div style={sectionLabel()}>TrustSlip verify</div>

          <div
            style={{
              marginTop: 10,
              color: "#F8FBFF",
              fontSize: isCompact ? 28 : 34,
              fontWeight: 900,
              lineHeight: 1.1,
            }}
          >
            TrustSlip Verify
          </div>

          <div
            style={{
              marginTop: 12,
              ...helperText(),
              maxWidth: 860,
              color: "#D7E3F1",
            }}
          >
            Public check for holder, status, QR code, and safe limits.
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <StableCtaLink
              to="/welcome"
              kind="secondary"
              stableHeight={48}
              minWidth={isCompact ? undefined : 116}
              debugId="trust-slip-verify.hero.welcome"
            >
              Welcome
            </StableCtaLink>
            <StableCtaLink
              to="/guide"
              kind="secondary"
              stableHeight={48}
              minWidth={isCompact ? undefined : 132}
              debugId="trust-slip-verify.hero.guide"
            >
              My GSN and I
            </StableCtaLink>
          </div>
        </section>
      )}

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      {noPublicCodeSupplied ? (
        <section
          style={{
            ...pageCard("#FFFFFF"),
            border: "1px solid rgba(11,99,209,0.14)",
            display: "grid",
            gap: 14,
          }}
        >
          <div style={sectionLabel()}>Code checker</div>
          <div
            style={{
              color: "#07172C",
              fontSize: isCompact ? 26 : 32,
              fontWeight: 1000,
              lineHeight: 1.08,
            }}
          >
            Verify a TrustSlip code
          </div>
          <p style={{ margin: 0, ...helperText(), color: "#475569", maxWidth: 760 }}>
            Use this when both sides already know the GSN code. For far-away checks,
            ask for the full verify link. For face-to-face checks, scan the QR.
          </p>
          <form
            onSubmit={submitCodeEntry}
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 220px",
              gap: 10,
              alignItems: "stretch",
            }}
          >
            <input
              value={codeEntry}
              onChange={(event) => setCodeEntry(event.target.value)}
              placeholder="Enter TrustSlip code"
              aria-label="TrustSlip code"
              autoComplete="off"
              style={{
                width: "100%",
                minWidth: 0,
                boxSizing: "border-box",
                borderRadius: 18,
                border: "1px solid rgba(8,35,58,0.16)",
                background: "#F8FBFF",
                color: "#07172C",
                padding: "15px 16px",
                fontSize: 16,
                fontWeight: 900,
                outline: "none",
              }}
            />
            <PrimaryButton
              type="submit"
              stableHeight={56}
              fullWidth
              debugId="trust-slip-verify.code-checker.submit"
            >
              Verify code
            </PrimaryButton>
          </form>
          <div
            style={{
              borderRadius: 16,
              border: "1px solid rgba(214,170,69,0.28)",
              background: "#FFF7E6",
              color: "#5F4100",
              padding: "12px 14px",
              fontSize: 13,
              fontWeight: 850,
              lineHeight: 1.45,
            }}
          >
            The code opens the same public TrustSlip Verify paper as the link or
            QR. It does not expose the holder's private Trust Passport.
          </div>
        </section>
      ) : null}

      {noPublicCodeSupplied ? null : (
      <TrustSlipVerifyPublicPaper
        compact={isCompact}
        validNow={validNow}
        publicValidityLabel={publicValidityLabel}
        bannerDetail={banner.detail}
        profileImageUrl={profileImageUrl}
        holderName={holderName}
        gsnId={gmfnId}
        communityLabel={communityLabel}
        visibleBand={visibleBand}
        visibleBandLabel={visibleBandLabel}
        visibleBandMeaning={visibleBandMeaning}
        visibleEvidenceLabel={visibleEvidenceLabel}
        publicVisibleScore={publicVisibleScore}
        compactTrustLimit={compactTrustLimit}
        issuedAtLabel={issuedAtLabel}
        expiresAtLabel={expiresAtLabel}
        resolvedCode={resolvedCode}
        verifyPath={verifyPath}
        verifyUrl={verifyUrl}
        quickTrustAnswers={quickTrustAnswers}
        communityRelayAvailable={communityRelayAvailable}
        communityPulseAvailable={communityPulseAvailable}
        communityConfirmationText={communityConfirmationText}
        communityConfirmationRows={communityConfirmationRows}
        confirmationOutcome={confirmationOutcome}
        confirmationResult={confirmationResult}
        confirmationPublicPath={confirmationPublicPath}
        confirmationBusy={confirmationBusy}
        canRequestCommunityPulse={Boolean(firstTruthy(record?.code, resolvedCode))}
        onRequestCommunityPulse={(draft) => {
          void requestCommunityPulse(draft);
        }}
        publicActions={publicTrustSlipActions}
      />
      )}
      {noPublicCodeSupplied ? null : <TrustSlipVerifyBoundary compact={isCompact} />}

      {isAppRoute ? (
        <details
          className="print-trust-support"
          style={{
            ...pageCard("#FFF7E6"),
            padding: isCompact ? 14 : 18,
            border: "2px solid rgba(180,83,9,0.5)",
            boxShadow: "0 18px 42px rgba(146,64,14,0.13)",
            overflowAnchor: "none",
          }}
        >
          <StableDisclosureSummary
            debugId="trust-slip-verify.full-evidence-toggle"
            stableHeight={92}
            style={{
              color: "#07172C",
              fontSize: isCompact ? 18 : 20,
              fontWeight: 1000,
              alignItems: "flex-start",
              justifyContent: "center",
              flexDirection: "column",
              textAlign: "left",
              gap: 0,
            }}
          >
            Private/internal detail
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                width: "fit-content",
                marginTop: 8,
                borderRadius: 999,
                padding: "6px 10px",
                background: "#FFF1F2",
                border: "1px solid rgba(190,18,60,0.28)",
                color: "#991B1B",
                fontSize: 12,
                fontWeight: 1000,
                textTransform: "uppercase",
              }}
            >
              Not the public/shareable TrustSlip
            </span>
            <span
              style={{
                display: "block",
                marginTop: 6,
                color: "#64748B",
                fontSize: 13,
                fontWeight: 800,
                lineHeight: 1.45,
              }}
            >
              Review, repair, and deeper evidence only. Keep this separate from the public paper.
            </span>
          </StableDisclosureSummary>

      <TrustSlipVerifyPrivateEvidence
        compact={isCompact}
        bannerTitle={banner.title}
        bannerDetail={banner.detail}
        bannerStyle={bannerStyle}
        loadError={loadError}
        resolvedCode={resolvedCode}
        statusLabel={loadError ? "Unavailable" : statusLabel}
        holderName={holderName}
        gsnId={gmfnId}
        profileImageUrl={profileImageUrl}
        communityLabel={communityLabel}
        communityGlobalId={communityGlobalId}
        holderRole={holderRole}
        activeMemberCount={activeMemberCount}
        activeCommunityCount={activeCommunityCount}
        sponsorCount={sponsorCount}
        phoneVerifiedRaw={record?.phone_verified}
        identityStatusLabel={identityStatusLabel}
        cciReading={cciReading}
        cciBand={cciBand}
        cciMeaning={cciMeaning}
        trustLimit={trustLimit}
        currency={currency}
        readerVerdict={readerVerdict}
        questions={fourDecisionQuestions}
        visibleBand={visibleBand}
        visibleScore={visibleScore}
        issuedAt={record?.issued_at}
        expiresAt={record?.expires_at}
        merchantVerifyActive={merchantVerifyActive}
        phoneVerified={phoneVerified}
        contributionDiscipline={contributionDiscipline}
        repaymentDiscipline={repaymentDiscipline}
        personalCommitmentDiscipline={personalCommitmentDiscipline}
        commitmentPlainLanguage={commitmentPlainLanguage}
        personalCommitmentPlainLanguage={personalCommitmentPlainLanguage}
        commitmentSourceNote={commitmentSourceNote}
        systemNote={systemNote}
        verificationState={verificationState}
        verifyPath={verifyPath}
        lastReleaseText={lastReleaseText}
        lastFullRepaymentText={lastFullRepaymentText}
        snapshotLabel={snapshotLabel}
        riskFlags={riskFlags}
        verificationNote={verificationNote}
      />
      <section className="print-trust-support" style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Internal actions</div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <PrimaryButton
            type="button"
            onClick={() => {
              void copyCode();
            }}
            stableHeight={44}
            minWidth={isCompact ? undefined : 166}
            debugId="trust-slip-verify.copy-code"
          >
            Copy TrustSlip Code
          </PrimaryButton>

          <SecondaryButton
            type="button"
            onClick={() => {
              void copyVerifyLink();
            }}
            stableHeight={44}
            minWidth={isCompact ? undefined : 148}
            debugId="trust-slip-verify.copy-link"
          >
            Copy Verify Link
          </SecondaryButton>

          <SecondaryButton
            type="button"
            onClick={() => {
              void copyGmfnId();
            }}
            stableHeight={44}
            minWidth={isCompact ? undefined : 124}
            debugId="trust-slip-verify.copy-gmfn-id"
          >
            Copy GSN ID
          </SecondaryButton>

          <SubtleButton
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && typeof window.print === "function") {
                window.print();
                return;
              }
              showNotice(
                "error",
                "Print is not available in this browser. Use Copy snapshot or Copy verify link."
              );
            }}
            stableHeight={44}
            minWidth={isCompact ? undefined : 92}
            debugId="trust-slip-verify.print"
          >
            Print
          </SubtleButton>

          <SubtleButton
            type="button"
            onClick={() => {
              void copyVerificationSnapshot();
            }}
            stableHeight={44}
            minWidth={isCompact ? undefined : 132}
            debugId="trust-slip-verify.copy-snapshot"
          >
            Copy snapshot
          </SubtleButton>

          {isAppRoute ? (
            <StableCtaLink
              to={routes.trust}
              kind="soft"
              stableHeight={44}
              minWidth={isCompact ? undefined : 140}
              debugId="trust-slip-verify.route.trust"
            >
              Trust Passport
            </StableCtaLink>
          ) : (
            <StableCtaLink
              to="/guide"
              kind="soft"
              stableHeight={44}
              minWidth={isCompact ? undefined : 132}
              debugId="trust-slip-verify.route.trust"
            >
              My GSN and I
            </StableCtaLink>
          )}
        </div>
      </section>

        </details>
      ) : null}
    </div>
  );
}





