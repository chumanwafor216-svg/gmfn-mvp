import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import SocialTagShareButton from "../components/SocialTagShareButton";
import {
  PrimaryButton,
  SecondaryButton,
  StableCtaLink,
  StableDisclosureSummary,
  SubtleButton,
} from "../components/StableButton";
import { GsnRealisticIcon, type Gsn3DIconKey } from "../components/GsnRealisticIcon";
import * as api from "../lib/api";
import { decisionPackConfirmationMechanics, normalizeDecisionPackPublicContext } from "../lib/decisionPacks";
import {
  institutionalPageCard,
  institutionalSoftCard,
} from "../lib/institutionalSurface";
import { navigateWithOrigin } from "../lib/nav";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import { buildTrustSlipVerifyShareText } from "../lib/trustDocumentSnapshots";
import TrustSlipVerifyBoundary from "./trustSlipVerify/TrustSlipVerifyBoundary";
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

const TrustSlipVerifyPrivateEvidence = React.lazy(
  () => import("./trustSlipVerify/TrustSlipVerifyPrivateEvidence")
);

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

function isMissingPublicHolderName(value: any): boolean {
  const text = safeStr(value).toLowerCase();
  return [
    "-",
    "member name not set",
    "name not set",
    "name not shown",
    "not set",
    "not shown",
    "unknown",
  ].includes(text);
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
    letterSpacing: 0,
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

function labelWithIcon(icon: Gsn3DIconKey, label: React.ReactNode): React.ReactNode {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <span
        aria-hidden="true"
        style={{
          flex: "0 0 auto",
          width: 34,
          height: 34,
          borderRadius: 8,
          display: "inline-grid",
          placeItems: "center",
          color: "#7A4A00",
          background: "rgba(255,255,255,0.97)",
          border: "1px solid rgba(226,192,106,0.34)",
          boxShadow:
            "0 8px 16px rgba(6,24,39,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
        }}
      >
        <GsnRealisticIcon
          name={icon}
          size={30}
          decorative
          imageStyle={{ width: "96%", height: "96%" }}
        />
      </span>
      <span>{label}</span>
    </span>
  );
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
  const [privateEvidenceRecord, setPrivateEvidenceRecord] =
    useState<TrustSlipVerifyRecord | null>(null);
  const [resolvedCode, setResolvedCode] = useState("");
  const [codeEntry, setCodeEntry] = useState("");
  const [loadError, setLoadError] = useState("");
  const [confirmationBusy, setConfirmationBusy] = useState(false);
  const [confirmationOutcome, setConfirmationOutcome] =
    useState<CommunityConfirmationOutcome | null>(null);
  const [selectedConfirmationCommunityId, setSelectedConfirmationCommunityId] = useState("");
  const [privateEvidenceOpen, setPrivateEvidenceOpen] = useState(false);

  const isAppRoute = location.pathname.startsWith("/app/");
  const selectedClanId = Number((api as any).getSelectedClanId?.() || 0);
  const verifyLoadSeqRef = useRef(0);
  const confirmationSeqRef = useRef(0);
  const verifyContextRef = useRef("");
  const resolvedCodeRef = useRef("");
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
  const publicDecisionPackContext = useMemo(() => {
    const search = new URLSearchParams(location.search);
    const decisionPackKey = firstTruthy(search.get("decision_pack"), search.get("decision_pack_key"));
    const accessPurpose = firstTruthy(search.get("access_purpose"), search.get("purpose"));
    const recipientQuestion = firstTruthy(
      search.get("recipient_question"),
      search.get("decision_question")
    );
    const accessScope = firstTruthy(search.get("access_scope"), "public_decision_pack");
    const decisionFocus = firstTruthy(search.get("decision_focus"), search.get("focus"));
    if (!decisionPackKey && !accessPurpose && !recipientQuestion && !decisionFocus) return null;

    const decisionPack = normalizeDecisionPackPublicContext({
      key: decisionPackKey,
      label: accessPurpose,
      recipientQuestion,
      focus: decisionFocus,
      scope: accessScope,
    });

    const relevantSignals = decisionPack.expectedEvidence.slice(0, 5).map((evidence, index) => ({
      key: `expected_evidence_${index + 1}`,
      label: index === 0 ? "Expected evidence" : `Expected evidence ${index + 1}`,
      status: "expected",
      value: evidence,
      decision_use: "Check whether this evidence is visible, current, or confirmed by the community before relying.",
    }));
    const recommendedChecks = decisionPack.gsnSources.slice(0, 4).map(
      (source) => `${source.label}: ${source.evidence}`
    );
    const gapChecks = decisionPack.missingLinks.slice(0, 4).map((gap, index) => ({
      key: `missing_link_${index + 1}`,
      label: index === 0 ? "Architecture gap" : `Architecture gap ${index + 1}`,
      reason: gap,
      next_step: "Ask for live community confirmation or the fuller Trust Passport before relying on this point.",
    }));
    const mappedSources = decisionPack.gsnSources.slice(0, 4).map((source, index) => ({
      key: `mapped_source_${index + 1}`,
      label: source.label,
      status: "mapped_source",
      evidence_count: null,
      latest_at: "",
      decision_use: source.evidence,
    }));
    const privateReviewRequired = decisionPack.missingLinks.slice(0, 4).map((gap, index) => ({
      key: `private_review_${index + 1}`,
      label: index === 0 ? "Needs confirmation" : `Needs confirmation ${index + 1}`,
      status: "not_publicly_proven",
      decision_use: gap,
    }));
    const sourceSummary = recommendedChecks.length
      ? recommendedChecks.join("; ")
      : "Public TrustSlip context only; ask for live community confirmation before relying.";
    const boundaryList = decisionPack.refusesToClaim.slice(0, 3).join(", ") || "the final decision";

    return {
      decision_pack: decisionPack.key,
      access_purpose: decisionPack.label,
      share_purpose: decisionPack.label,
      access_scope: decisionPack.scope,
      access_note: decisionPack.recipientQuestion,
      decision_pack_focus: decisionPack.focus,
      decision_pack_profile: {
        access_purpose: decisionPack.label,
        recipient_question: decisionPack.recipientQuestion,
        relevant_signals: relevantSignals,
        gaps_to_check: gapChecks,
        recommended_checks: recommendedChecks,
        evidence_extract: {
          source: "gsn_decision_pack_matrix",
          source_note:
            "Prepared from the shared GSN Decision Pack evidence matrix; public verification shows the lens and gaps, not private Trust Passport records.",
          evidence_scope: {
            reading_scope: decisionPack.scope,
            included_active_community_count: null,
            includes_holder_level_records: false,
            public_summary: sourceSummary,
            boundary:
              "The public link maps the decision question to possible GSN evidence sources; it does not expose private records or replace live confirmation.",
          },
          categories: mappedSources,
          private_review_required: privateReviewRequired,
          boundary_note: `This public Decision Pack does not prove ${boundaryList}.`,
        },
        basis_note:
          "This Decision Pack says what evidence should be checked for this purpose and where GSN can currently point; it does not make the decision.",
        boundary_note: `This Decision Pack reduces uncertainty; it does not remove risk, make the recipient's decision, or prove ${boundaryList}.`,
        community_confirmation_prompt: {
          reason_type: decisionPack.confirmationReasonType,
          question: decisionPack.confirmationQuestion,
          responders: decisionPackConfirmationMechanics(decisionPack).responders,
          counts_as: decisionPackConfirmationMechanics(decisionPack).countsAs,
          escalation: decisionPackConfirmationMechanics(decisionPack).escalation,
          boundary:
            "Responses are community witness evidence only; they are not licences, guarantees, approvals, or final decisions.",
        },
      },
      share_access_record: {
        recipient_label: "TrustSlip recipient",
        purpose: decisionPack.label,
        scope: decisionPack.scope,
        note: decisionPack.recipientQuestion,
        focus: decisionPack.focus,
        status: `Shared to support ${decisionPack.label}.`,
      },
    };
  }, [location.search]);
  const publicDecisionPackContextKey = useMemo(
    () =>
      publicDecisionPackContext
        ? [
            publicDecisionPackContext.access_purpose,
            publicDecisionPackContext.access_scope,
            publicDecisionPackContext.access_note,
            publicDecisionPackContext.decision_pack_focus,
          ].join(":")
        : "none",
    [publicDecisionPackContext]
  );

  const requestedCode = useMemo(() => {
    return firstTruthy(params.code, queryCode);
  }, [params.code, queryCode]);
  const verifyContextKey = `${isAppRoute ? "app" : "public"}:${selectedClanId || 0}:${
    requestedCode || "auto"
  }:${publicDecisionPackContextKey}`;
  verifyContextRef.current = verifyContextKey;
  const isLiteRoute = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (
      location.pathname.replace(/\/+$/, "").endsWith("/lite") ||
      safeStr(params.get("view")).toLowerCase() === "lite"
    );
  }, [location.pathname, location.search]);

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
    const loadSeq = verifyLoadSeqRef.current + 1;
    verifyLoadSeqRef.current = loadSeq;
    confirmationSeqRef.current += 1;
    const contextKey = verifyContextKey;

    (async () => {
      setLoading(true);
      setLoadError("");
      setMe(null);
      setCurrentClan(null);
      setRecord(null);
      setPrivateEvidenceRecord(null);
      setResolvedCode("");
      resolvedCodeRef.current = "";
      setConfirmationOutcome(null);
      setConfirmationBusy(false);
      setPrivateEvidenceOpen(false);

      try {
        const [meRes, clanRes] = isAppRoute
          ? await Promise.all([
              (api as any).getMe?.().catch(() => null) ?? Promise.resolve(null),
              (api as any).getCurrentClan?.().catch(() => null) ?? Promise.resolve(null),
            ])
          : [null, null];

        if (
          !alive ||
          loadSeq !== verifyLoadSeqRef.current ||
          contextKey !== verifyContextRef.current
        ) {
          return;
        }
        setMe(meRes || null);
        setCurrentClan(clanRes || null);

        let codeToUse = requestedCode;
        let mySlip: any = null;

        if (isAppRoute && typeof (api as any).getMyTrustSlip === "function") {
          mySlip = await (api as any).getMyTrustSlip().catch(() => null);
          if (!codeToUse) {
            codeToUse = firstTruthy(
              mySlip?.code,
              mySlip?.trust_slip_code,
              mySlip?.token,
              mySlip?.verification_code
            );
          }
          if (
            !alive ||
            loadSeq !== verifyLoadSeqRef.current ||
            contextKey !== verifyContextRef.current
          ) {
            return;
          }
        }

        setResolvedCode(codeToUse);
        resolvedCodeRef.current = codeToUse;

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

        if (
          !alive ||
          loadSeq !== verifyLoadSeqRef.current ||
          contextKey !== verifyContextRef.current ||
          codeToUse !== resolvedCodeRef.current
        ) {
          return;
        }

        const mergedVerifyResult =
          verifyResult && publicDecisionPackContext
            ? {
                ...verifyResult,
                ...publicDecisionPackContext,
                decision_pack_profile:
                  verifyResult?.decision_pack_profile || publicDecisionPackContext.decision_pack_profile,
              }
            : verifyResult;
        const normalized = normalizeTrustSlipVerification(mergedVerifyResult, codeToUse);
        setRecord(normalized);
        const mySlipCode = firstTruthy(
          mySlip?.code,
          mySlip?.trust_slip_code,
          mySlip?.token,
          mySlip?.verification_code
        );
        const privateNormalized =
          isAppRoute && mySlipCode && mySlipCode === codeToUse
            ? normalizeTrustSlipVerification(mySlip, codeToUse)
            : null;
        setPrivateEvidenceRecord(privateNormalized);
        setConfirmationOutcome(null);

        if (!normalized) {
          setLoadError(
            "The supplied TrustSlip code did not return a readable verification record."
          );
        }
      } finally {
        if (
          alive &&
          loadSeq === verifyLoadSeqRef.current &&
          contextKey === verifyContextRef.current
        ) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [
    requestedCode,
    isAppRoute,
    selectedClanId,
    verifyContextKey,
    publicDecisionPackContext,
  ]);

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

  const gmfnIdValue = useMemo(() => {
    return firstTruthy(record?.gmfn_id, isAppRoute ? me?.gmfn_id : null);
  }, [record, me, isAppRoute]);
  const gmfnId = gmfnIdValue || "Not issued yet";

  const holderName = useMemo(() => {
    const candidate = firstTruthy(
      record?.holder_name,
      isAppRoute ? me?.display_name : null,
      isAppRoute ? me?.nickname : null,
      isAppRoute ? me?.name : null,
      isAppRoute ? me?.first_name : null,
      isAppRoute ? me?.email : null
    );
    if (candidate && !isMissingPublicHolderName(candidate)) return candidate;

    const publicId = firstTruthy(record?.gmfn_id, isAppRoute ? me?.gmfn_id : null);
    return publicId ? `GSN holder ${publicId}` : "GSN holder";
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
  const privateEvidenceCode = firstTruthy(privateEvidenceRecord?.code);
  const visibleRecordCode = firstTruthy(record?.code, resolvedCode);
  const ownsVisibleTrustSlip =
    isAppRoute &&
    Boolean(privateEvidenceRecord) &&
    Boolean(privateEvidenceCode) &&
    privateEvidenceCode === visibleRecordCode;

  const trustSlipView = useMemo(
    () =>
      buildTrustSlipVerifyViewModel({
        record,
        me: ownsVisibleTrustSlip ? me : null,
        isAppRoute: ownsVisibleTrustSlip,
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
      ownsVisibleTrustSlip,
      holderName,
      communityLabel,
      visibleBand,
      visibleScore,
      resolvedCode,
      banner,
    ]
  );
  const privateEvidenceBanner = useMemo(
    () => deriveBanner(privateEvidenceRecord || record),
    [privateEvidenceRecord, record]
  );
  const privateEvidenceBannerStyle = bannerToneStyle(privateEvidenceBanner.tone);
  const privateEvidenceView = useMemo(
    () =>
      buildTrustSlipVerifyViewModel({
        record: privateEvidenceRecord || record,
        me,
        isAppRoute,
        holderName,
        communityLabel,
        visibleBand,
        visibleScore,
        resolvedCode,
        banner: privateEvidenceBanner,
      }),
    [
      privateEvidenceRecord,
      record,
      me,
      isAppRoute,
      holderName,
      communityLabel,
      visibleBand,
      visibleScore,
      resolvedCode,
      privateEvidenceBanner,
    ]
  );
  const canShowPrivateEvidence = ownsVisibleTrustSlip;

  const {
    profileImageUrl,
    holderRole,
    memberWitnessCount,
    membershipStrengthLabel,
    membershipRenewalStatusLabel,
    membershipValidUntil,
    nextWitnessRenewalAt,
    nextWitnessRenewalStatusLabel,
    membershipCurrentnessLabel,
    membershipCurrentnessScope,
    communityEvidenceCurrentnessLabel,
    communityEvidenceCurrentnessScope,
    relationshipEvidenceSummary,
    communityActivityCount,
    communityActivityLatestAt,
    communityActivityCategories,
    communityActivityLabel,
    activeCommunityCount,
    evidenceScopeSummary,
    evidenceScopeBoundary,
    evidenceScopeReadingScope,
    verifyPath,
    verifyUrl,
    compactTrustLimit,
    publicEvidencePosture,
    publicEvidencePostureMeaning,
    publicEvidencePostureBoundary,
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
    memberCredentialPath,
    issuedAtLabel,
    expiresAtLabel,
    decisionPackProfile,
    recipientAccessRecord,
  } = trustSlipView;
  const verifyCommunityActivityEvidence = communityActivityCount
    ? `${communityActivityCount} community activity event${
        communityActivityCount === "1" ? "" : "s"
      }${
        communityActivityCategories.length
          ? ` across ${communityActivityCategories.slice(0, 3).join(", ")}`
          : ""
      }`
    : "";
  const verifyWitnessEvidence = firstTruthy(
    membershipStrengthLabel,
    membershipCurrentnessLabel
  );

  const communityConfirmationOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<Record<string, any>> = [];
    const addOption = (item: Record<string, any> | null | undefined) => {
      if (!item) return;
      const communityId = firstTruthy(item.community_id, item.clan_id);
      if (!communityId || seen.has(communityId)) return;
      seen.add(communityId);
      options.push({
        community_id: communityId,
        clan_id: communityId,
        community_name: firstTruthy(item.community_name, item.name, communityLabel),
        community_code: firstTruthy(item.community_code),
        holder_role: firstTruthy(item.holder_role, item.role, "member"),
        role: firstTruthy(item.role, item.holder_role, "member"),
        is_primary_anchor: Boolean(item.is_primary_anchor),
        community_status: firstTruthy(item.community_status),
        active_member_count: item.active_member_count,
        contactable_reference_count: item.contactable_reference_count,
        sponsor_signal_count: item.sponsor_signal_count,
        last_community_confirmation: item.last_community_confirmation,
        relay_available: item.relay_available,
        instant_pulse_available: item.instant_pulse_available,
        plain_language: firstTruthy(item.plain_language),
      });
    };
    (record?.community_confirmation_options || []).forEach(addOption);
    (record?.community_footprint || []).forEach(addOption);
    if (communityConfirmation) {
      addOption({
        community_id: communityConfirmation.community_id,
        community_name: communityConfirmation.community_name || communityLabel,
        community_code: communityConfirmation.community_code,
        holder_role: record?.holder_role,
        is_primary_anchor: true,
      });
    }
    return options;
  }, [record, communityConfirmation, communityLabel]);

  useEffect(() => {
    const firstOptionId = firstTruthy(communityConfirmationOptions[0]?.community_id);
    if (!firstOptionId) {
      if (selectedConfirmationCommunityId) setSelectedConfirmationCommunityId("");
      return;
    }
    const stillAvailable = communityConfirmationOptions.some(
      (item) => firstTruthy(item.community_id, item.clan_id) === selectedConfirmationCommunityId
    );
    if (!stillAvailable) {
      setSelectedConfirmationCommunityId(firstOptionId);
    }
  }, [communityConfirmationOptions, selectedConfirmationCommunityId]);

  const selectedConfirmationCommunity =
    communityConfirmationOptions.find(
      (item) => firstTruthy(item.community_id, item.clan_id) === selectedConfirmationCommunityId
    ) || communityConfirmationOptions[0] || null;
  const selectedCommunityRelayAvailable = selectedConfirmationCommunity
    ? Boolean(selectedConfirmationCommunity.relay_available)
    : communityRelayAvailable;
  const selectedCommunityPulseAvailable = selectedConfirmationCommunity
    ? Boolean(
        selectedConfirmationCommunity.instant_pulse_available ||
          selectedConfirmationCommunity.relay_available
      )
    : communityPulseAvailable;
  const selectedCommunityRequestMode = selectedConfirmationCommunity?.instant_pulse_available
    ? "instant_pulse"
    : "relay";
  const selectedCommunityConfirmationRows: Array<[string, string]> = selectedConfirmationCommunity
    ? [
        ["Community status", firstTruthy(selectedConfirmationCommunity.community_status, "Not shown")],
        ["Active members", firstTruthy(selectedConfirmationCommunity.active_member_count, "Not shown")],
        ["Eligible response pool", firstTruthy(selectedConfirmationCommunity.contactable_reference_count, "0")],
        ["Sponsor signals", firstTruthy(selectedConfirmationCommunity.sponsor_signal_count, "0")],
        ["Last confirmation", firstTruthy(selectedConfirmationCommunity.last_community_confirmation, "Not requested yet")],
      ]
    : communityConfirmationRows;
  const selectedCommunityConfirmationText = firstTruthy(
    selectedConfirmationCommunity?.plain_language,
    communityConfirmationText
  );

  const confirmationResult = confirmationOutcome?.community_response || null;
  const confirmationPublicPath = confirmationOutcome?.public_token
    ? `/community-confirmations/public/${encodeURIComponent(String(confirmationOutcome.public_token))}`
    : "";
  const publicLitePath = resolvedCode
    ? `/t/${encodeURIComponent(resolvedCode)}/lite`
    : "";
  const publicReaderPath = resolvedCode
    ? `/t/${encodeURIComponent(resolvedCode)}`
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
      `/t/${encodeURIComponent(code)}`,
      location
    );
  }

  async function requestCommunityPulse(draft: CommunityConfirmationCallbackDraft = {}) {
    const code = firstTruthy(record?.code, resolvedCode);
    if (!code) {
      showNotice("error", "TrustSlip code is not available.");
      return;
    }

    if (!selectedCommunityPulseAvailable) {
      showNotice("error", "Community confirmation relay is not available for the selected community yet.");
      return;
    }

    const requestSeq = confirmationSeqRef.current + 1;
    confirmationSeqRef.current = requestSeq;
    const contextKey = verifyContextRef.current;
    const requestCode = code;

    setConfirmationBusy(true);
    setConfirmationOutcome(null);

    try {
      const result = await (api as any).requestCommunityConfirmation({
        trust_slip_code: requestCode,
        requester_external_label:
          firstTruthy(draft.requesterExternalLabel, "Person checking this TrustSlip"),
        requester_callback_channel: draft.callbackChannel || "none",
        requester_callback_contact: draft.callbackContact || undefined,
        requester_callback_consent: Boolean(draft.callbackConsent),
        community_id: firstTruthy(
          draft.confirmationCommunityId,
          selectedConfirmationCommunityId
        ) || undefined,
        reason_type:
          decisionPackProfile.communityConfirmationPrompt.reasonType || "community_standing_check",
        risk_level: "low",
        mode: selectedCommunityRequestMode,
      });
      if (
        requestSeq !== confirmationSeqRef.current ||
        contextKey !== verifyContextRef.current ||
        requestCode !== firstTruthy(record?.code, resolvedCodeRef.current)
      ) {
        return;
      }
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
      if (
        requestSeq === confirmationSeqRef.current &&
        contextKey === verifyContextRef.current
      ) {
        showNotice("error", "Community confirmation could not be opened yet.");
      }
    } finally {
      if (
        requestSeq === confirmationSeqRef.current &&
        contextKey === verifyContextRef.current
      ) {
        setConfirmationBusy(false);
      }
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
    if (!gmfnIdValue) {
      showNotice("error", "GSN ID is not available.");
      return;
    }

    await copyTextWithNotice(gmfnIdValue, "GSN ID copied.", "GSN ID is not available.");
  }

  async function copyVerificationSnapshot() {
    await copyTextWithNotice(
      buildTrustSlipVerifyShareText({
        holderName,
        gmfnId,
        communityLabel,
        holderRole,
        communityEvidence: verifyCommunityActivityEvidence,
        witnessEvidence: verifyWitnessEvidence,
        trustSlipCode: resolvedCode || "Not available",
        visibleBand,
        visiblePosture: publicEvidencePosture || "-",
        verificationStatus: banner.title,
        issuedAt: issuedAtLabel,
        expiresAt: expiresAtLabel,
        verifyUrl,
        activeCommunityCount,
      }),
      "Verification snapshot copied.",
      "Verification snapshot is not ready yet."
    );
  }

  const publicTrustSlipActions = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isCompact ? "1fr" : "repeat(4, minmax(0, 1fr))",
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
          boxShadow: "0 14px 28px rgba(6,43,88,0.18)",
        }}
      >
        {labelWithIcon("records-folder", "Print / save PDF")}
      </SecondaryButton>
      {isLiteRoute && publicReaderPath ? (
        <StableCtaLink
          to={publicReaderPath}
          kind="secondary"
          stableHeight={isCompact ? 52 : 58}
          fullWidth={isCompact}
          minWidth={isCompact ? undefined : 132}
          debugId="trust-slip-verify.public.open-full-paper"
          style={{
            borderRadius: 12,
            fontWeight: 1000,
            background: "#FFFFFF",
            color: "#07172C",
          }}
        >
          {labelWithIcon("public-globe", "Full paper")}
        </StableCtaLink>
      ) : publicLitePath ? (
        <StableCtaLink
          to={publicLitePath}
          kind="secondary"
          stableHeight={isCompact ? 52 : 58}
          fullWidth={isCompact}
          minWidth={isCompact ? undefined : 132}
          debugId="trust-slip-verify.public.open-lite"
          style={{
            borderRadius: 12,
            fontWeight: 1000,
            background: "#FFFFFF",
            color: "#07172C",
          }}
        >
          {labelWithIcon("public-globe", "Lite view")}
        </StableCtaLink>
      ) : isAppRoute ? (
        <SecondaryButton
          type="button"
          onClick={() => navigateWithOrigin(navigate, routes.trust, location)}
          stableHeight={isCompact ? 52 : 58}
          fullWidth={isCompact}
          minWidth={isCompact ? undefined : 132}
          debugId="trust-slip-verify.public.open-passport"
          style={{ borderRadius: 12, fontWeight: 1000 }}
        >
          {labelWithIcon("public-globe", "Lite view")}
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
          {labelWithIcon("public-globe", "Lite view")}
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
          {labelWithIcon("trust-shield", "Request current TrustSlip")}
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
          {labelWithIcon("trust-shield", "Request current TrustSlip")}
        </SecondaryButton>
      )}
      <SocialTagShareButton
        target={{
          title: "TrustSlip Verify",
          message: buildTrustSlipVerifyShareText({
            holderName,
            gmfnId,
            communityLabel,
            holderRole,
            communityEvidence: verifyCommunityActivityEvidence,
            witnessEvidence: verifyWitnessEvidence,
            trustSlipCode: resolvedCode || "Not available",
            visibleBand,
            visiblePosture: publicEvidencePosture || "-",
            verificationStatus: banner.title,
            issuedAt: issuedAtLabel,
            expiresAt: expiresAtLabel,
            verifyUrl,
            activeCommunityCount,
          }),
          url: verifyUrl,
        }}
        disabled={false}
        buttonLabel="Share paper"
        stableHeight={isCompact ? 52 : 58}
        fullWidth={isCompact}
        minWidth={isCompact ? undefined : 132}
        debugId="trust-slip-verify.public.tag-social"
        style={{
          borderRadius: 12,
          fontWeight: 1000,
          background: verifyUrl
            ? "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"
            : "#F8FBFF",
          color: "#07172C",
          border: "1px solid rgba(11,99,209,0.14)",
        }}
        onResult={showNotice}
      />
      <div style={{ display: "none" }}>
        <SecondaryButton
          type="button"
          onClick={() => {
            void copyVerifyLink();
          }}
          stableHeight={isCompact ? 52 : 44}
          debugId="trust-slip-verify.public.copy-link"
        >
          {labelWithIcon("public-globe", "Copy verify link")}
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
      ) : noPublicCodeSupplied ? (
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
      ) : null}

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
          holderRole={holderRole}
          memberWitnessCount={memberWitnessCount}
          membershipStrengthLabel={membershipStrengthLabel}
          membershipRenewalStatusLabel={membershipRenewalStatusLabel}
          membershipValidUntil={membershipValidUntil}
          nextWitnessRenewalAt={nextWitnessRenewalAt}
          nextWitnessRenewalStatusLabel={nextWitnessRenewalStatusLabel}
          membershipCurrentnessLabel={membershipCurrentnessLabel}
          membershipCurrentnessScope={membershipCurrentnessScope}
          communityEvidenceCurrentnessLabel={communityEvidenceCurrentnessLabel}
          communityEvidenceCurrentnessScope={communityEvidenceCurrentnessScope}
          memberCredentialPath={memberCredentialPath}
          relationshipEvidenceSummary={relationshipEvidenceSummary}
          communityActivityCount={communityActivityCount}
          communityActivityLatestAt={communityActivityLatestAt}
          communityActivityCategories={communityActivityCategories}
          communityActivityLabel={communityActivityLabel}
          activeCommunityCount={activeCommunityCount}
          evidenceScopeSummary={evidenceScopeSummary}
          evidenceScopeBoundary={evidenceScopeBoundary}
          evidenceScopeReadingScope={evidenceScopeReadingScope}
          visibleBand={visibleBand}
          visibleBandLabel={visibleBandLabel}
          visibleBandMeaning={visibleBandMeaning}
          visibleEvidenceLabel={visibleEvidenceLabel}
          publicEvidencePosture={publicEvidencePosture}
          publicEvidencePostureMeaning={publicEvidencePostureMeaning}
          publicEvidencePostureBoundary={publicEvidencePostureBoundary}
          compactTrustLimit={compactTrustLimit}
          issuedAtLabel={issuedAtLabel}
          expiresAtLabel={expiresAtLabel}
          resolvedCode={resolvedCode}
          verifyPath={verifyPath}
          verifyUrl={verifyUrl}
          quickTrustAnswers={quickTrustAnswers}
          communityRelayAvailable={selectedCommunityRelayAvailable}
          communityPulseAvailable={selectedCommunityPulseAvailable}
          communityConfirmationText={selectedCommunityConfirmationText}
          communityConfirmationRows={selectedCommunityConfirmationRows}
          communityConfirmationOptions={communityConfirmationOptions}
          selectedConfirmationCommunityId={selectedConfirmationCommunityId}
          onConfirmationCommunityChange={setSelectedConfirmationCommunityId}
          confirmationOutcome={confirmationOutcome}
          confirmationResult={confirmationResult}
          confirmationPublicPath={confirmationPublicPath}
          confirmationBusy={confirmationBusy}
          canRequestCommunityPulse={Boolean(firstTruthy(record?.code, resolvedCode))}
          onRequestCommunityPulse={(draft) => {
            void requestCommunityPulse(draft);
          }}
          publicActions={publicTrustSlipActions}
          decisionPackProfile={decisionPackProfile}
          recipientAccessRecord={recipientAccessRecord}
          variant={isLiteRoute ? "lite" : "full"}
        />
      )}
      {noPublicCodeSupplied ? null : <TrustSlipVerifyBoundary compact={isCompact} />}

      {canShowPrivateEvidence ? (
        <details
          className="print-trust-support"
          open={privateEvidenceOpen}
          onToggle={(event) => {
            setPrivateEvidenceOpen(event.currentTarget.open);
          }}
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
            {labelWithIcon("vault-safe", "Private review details")}
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
              Not for public sharing
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
              Use this for review, repair, and deeper evidence. Keep it separate from the public TrustSlip.
            </span>
          </StableDisclosureSummary>

          {privateEvidenceOpen ? (
            <React.Suspense
              fallback={
                <div
                  style={{
                    ...softCard("#FFFFFF"),
                    marginTop: 14,
                    color: "#64748B",
                    fontWeight: 850,
                    lineHeight: 1.6,
                  }}
                >
                  Loading private review details...
                </div>
              }
            >
              <TrustSlipVerifyPrivateEvidence
                compact={isCompact}
                bannerTitle={privateEvidenceBanner.title}
                bannerDetail={privateEvidenceBanner.detail}
                bannerStyle={privateEvidenceBannerStyle}
                loadError={loadError}
                resolvedCode={resolvedCode}
                statusLabel={loadError ? "Unavailable" : privateEvidenceView.statusLabel}
                holderName={holderName}
                gsnId={gmfnId}
                profileImageUrl={privateEvidenceView.profileImageUrl}
                communityLabel={communityLabel}
                communityGlobalId={privateEvidenceView.communityGlobalId}
                holderRole={privateEvidenceView.holderRole}
                activeMemberCount={privateEvidenceView.activeMemberCount}
                activeCommunityCount={privateEvidenceView.activeCommunityCount}
                memberWitnessCount={privateEvidenceView.memberWitnessCount}
                membershipStrengthLabel={privateEvidenceView.membershipStrengthLabel}
                membershipRenewalStatusLabel={privateEvidenceView.membershipRenewalStatusLabel}
                membershipValidUntil={privateEvidenceView.membershipValidUntil}
                nextWitnessRenewalAt={privateEvidenceView.nextWitnessRenewalAt}
                nextWitnessRenewalStatusLabel={privateEvidenceView.nextWitnessRenewalStatusLabel}
                memberCredentialPath={privateEvidenceView.memberCredentialPath}
                communityActivityCount={privateEvidenceView.communityActivityCount}
                communityActivityLatestAt={privateEvidenceView.communityActivityLatestAt}
                communityActivityCategories={privateEvidenceView.communityActivityCategories}
                communityActivityLabel={privateEvidenceView.communityActivityLabel}
                sponsorCount={privateEvidenceView.sponsorCount}
                phoneVerifiedRaw={privateEvidenceRecord?.phone_verified}
                identityStatusLabel={privateEvidenceView.identityStatusLabel}
                cciReading={privateEvidenceView.cciReading}
                cciBand={privateEvidenceView.cciBand}
                cciMeaning={privateEvidenceView.cciMeaning}
                trustLimit={privateEvidenceView.trustLimit}
                currency={privateEvidenceView.currency}
                readerVerdict={privateEvidenceView.readerVerdict}
                questions={privateEvidenceView.fourDecisionQuestions}
                visibleBand={visibleBand}
                visibleScore={visibleScore}
                issuedAt={privateEvidenceRecord?.issued_at}
                expiresAt={privateEvidenceRecord?.expires_at}
                merchantVerifyActive={privateEvidenceView.merchantVerifyActive}
                phoneVerified={privateEvidenceView.phoneVerified}
                contributionDiscipline={privateEvidenceView.contributionDiscipline}
                repaymentDiscipline={privateEvidenceView.repaymentDiscipline}
                personalCommitmentDiscipline={privateEvidenceView.personalCommitmentDiscipline}
                commitmentPlainLanguage={privateEvidenceView.commitmentPlainLanguage}
                personalCommitmentPlainLanguage={privateEvidenceView.personalCommitmentPlainLanguage}
                commitmentSourceNote={privateEvidenceView.commitmentSourceNote}
                systemNote={privateEvidenceView.systemNote}
                verificationState={privateEvidenceView.verificationState}
                verifyPath={privateEvidenceView.verifyPath}
                lastReleaseText={privateEvidenceView.lastReleaseText}
                lastFullRepaymentText={privateEvidenceView.lastFullRepaymentText}
                snapshotLabel={privateEvidenceView.snapshotLabel}
                riskFlags={privateEvidenceView.riskFlags}
                verificationNote={privateEvidenceView.verificationNote}
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
                    stableHeight={isCompact ? 52 : 44}
                    fullWidth={isCompact}
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
                    stableHeight={isCompact ? 52 : 44}
                    fullWidth={isCompact}
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
                    stableHeight={isCompact ? 52 : 44}
                    fullWidth={isCompact}
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
                    stableHeight={isCompact ? 52 : 44}
                    fullWidth={isCompact}
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
                    stableHeight={isCompact ? 52 : 44}
                    fullWidth={isCompact}
                    minWidth={isCompact ? undefined : 132}
                    debugId="trust-slip-verify.copy-snapshot"
                  >
                    Copy snapshot
                  </SubtleButton>

                  {isAppRoute ? (
                    <StableCtaLink
                      to={routes.trust}
                      kind="soft"
                      stableHeight={isCompact ? 52 : 44}
                      fullWidth={isCompact}
                      minWidth={isCompact ? undefined : 140}
                      debugId="trust-slip-verify.route.trust"
                    >
                      Trust Passport
                    </StableCtaLink>
                  ) : (
                    <StableCtaLink
                      to="/guide"
                      kind="soft"
                      stableHeight={isCompact ? 52 : 44}
                      fullWidth={isCompact}
                      minWidth={isCompact ? undefined : 132}
                      debugId="trust-slip-verify.route.trust"
                    >
                      My GSN and I
                    </StableCtaLink>
                  )}
                </div>
              </section>
            </React.Suspense>
          ) : null}

        </details>
      ) : null}
    </div>
  );
}





