import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createClanInvite, getClanInviteLink } from "../lib/api";
import {
  normalizedJoinInviteUrl,
  personalizedJoinInviteUrl,
} from "../lib/joinLinks";
import { copyToClipboard } from "../lib/share";
import { buildSimpleJoinInviteMessage } from "../lib/joinInviteMessaging";
import {
  brandInnerCard,
  brandPageCard,
  gmfnBrand,
} from "../styles/gmfnBrand";
import { GsnLegacyIcon } from "./GsnLegacyIcon";
import { StableButton, StableDisclosureSummary } from "./StableButton";

type SimpleCommunityInviteCardProps = {
  communityId: number;
  communityName?: string;
  initialLink?: string;
  compact?: boolean;
  embedded?: boolean;
  hero?: boolean;
  heroPresentation?: "pill" | "identity";
  heroSecondaryAction?: React.ReactNode;
  heroActionStyle?: React.CSSProperties;
  inviterName?: string;
  communityCode?: string;
};

type InviteFeedback = {
  tone: "success" | "error";
  text: string;
} | null;


function inviterNameFromLink(inviteLink: string): string {
  try {
    return new URL(inviteLink, "https://gsn.invalid").searchParams.get("inviter_name")?.trim() || "";
  } catch {
    return "";
  }
}

export default function SimpleCommunityInviteCard({
  communityId,
  communityName = "",
  initialLink = "",
  compact = false,
  embedded = false,
  hero = false,
  heroPresentation = "pill",
  heroSecondaryAction,
  heroActionStyle,
  inviterName = "",
  communityCode = "",
}: SimpleCommunityInviteCardProps) {
  const normalizedInitialLink = useMemo(
    () => normalizedJoinInviteUrl({ invite_link: initialLink }),
    [initialLink]
  );
  const [inviteLink, setInviteLink] = useState(normalizedInitialLink);
  const [loading, setLoading] = useState(
    Boolean(!hero && !embedded && communityId && !normalizedInitialLink)
  );
  const [preparedInviterName, setPreparedInviterName] = useState("");
  const admissionModeRef = useRef("community_vote");
  const [recipientName, setRecipientName] = useState("");
  const [feedback, setFeedback] = useState<InviteFeedback>(null);
  const [communityQrLink, setCommunityQrLink] = useState("");
  const [communityQrAdmissionMode, setCommunityQrAdmissionMode] = useState("");
  const communityQrAdmissionModeRef = useRef("");
  const [communityQrLoading, setCommunityQrLoading] = useState(false);
  const [communityQrFeedback, setCommunityQrFeedback] = useState<InviteFeedback>(null);

  const prepareInviteLink = useCallback(async (): Promise<string> => {
    if (!communityId) return "";

    setLoading(true);
    try {
      const response = hero
        ? await createClanInvite(communityId)
        : await getClanInviteLink(communityId);
      const nextLink = normalizedJoinInviteUrl(response);
      if (!nextLink) throw new Error("Invite link unavailable");
      setInviteLink(nextLink);
      setPreparedInviterName(
        String(
          response?.invited_by_display ||
            response?.inviter_name ||
            response?.invited_by_email ||
            ""
        ).trim()
      );
      const nextAdmissionMode = String(response?.admission_mode || "community_vote");
      admissionModeRef.current = nextAdmissionMode;
      return nextLink;
    } catch {
      setFeedback({
        tone: "error",
        text: "The invite link is not available right now. Try again.",
      });
      return "";
    } finally {
      setLoading(false);
    }
  }, [communityId, hero]);

  useEffect(() => {
    let alive = true;
    setFeedback(null);
    setInviteLink(normalizedInitialLink);
    setPreparedInviterName("");
    admissionModeRef.current = "community_vote";
    setRecipientName("");

    if (!communityId || normalizedInitialLink || hero || embedded) {
      setLoading(false);
      return () => {
        alive = false;
      };
    }

    setLoading(true);
    getClanInviteLink(communityId)
      .then((response) => {
        if (!alive) return;
        setInviteLink(normalizedJoinInviteUrl(response));
        setPreparedInviterName(
          String(
            response?.invited_by_display ||
              response?.inviter_name ||
              response?.invited_by_email ||
              ""
          ).trim()
        );
        const nextAdmissionMode = String(response?.admission_mode || "community_vote");
        admissionModeRef.current = nextAdmissionMode;
      })
      .catch(() => {
        if (!alive) return;
        setFeedback({
          tone: "error",
          text: "The invite link is not available right now. Try again.",
        });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [communityId, embedded, hero, normalizedInitialLink]);

  useEffect(() => {
    setCommunityQrLink("");
    setCommunityQrAdmissionMode("");
    communityQrAdmissionModeRef.current = "";
    setCommunityQrFeedback(null);
  }, [communityId]);

  async function prepareCommunityQrLink(): Promise<string> {
    if (!communityId) return "";
    if (communityQrLink) return communityQrLink;

    setCommunityQrLoading(true);
    setCommunityQrFeedback(null);
    try {
      const response = await getClanInviteLink(communityId, {
        qr_policy_key: "reviewed_access",
      });
      const nextLink = normalizedJoinInviteUrl(response);
      if (!nextLink) throw new Error("Community QR unavailable");
      const nextAdmissionMode = String(response?.admission_mode || "community_vote");
      setCommunityQrLink(nextLink);
      setCommunityQrAdmissionMode(nextAdmissionMode);
      communityQrAdmissionModeRef.current = nextAdmissionMode;
      setCommunityQrFeedback({
        tone: "success",
        text: "Community QR ready.",
      });
      return nextLink;
    } catch {
      setCommunityQrFeedback({
        tone: "error",
        text: "The community QR is not available right now. Try again.",
      });
      return "";
    } finally {
      setCommunityQrLoading(false);
    }
  }

  async function copyCommunityQrLink() {
    const link = await prepareCommunityQrLink();
    if (!link) return;
    const copied = await copyToClipboard(link);
    setCommunityQrFeedback({
      tone: copied ? "success" : "error",
      text: copied ? "Community link copied." : "Copy failed. Try Share instead.",
    });
  }

  async function shareCommunityQrLink() {
    const link = await prepareCommunityQrLink();
    if (!link) return;
    const safeCommunityName = communityName.trim() || "this GSN community";
    const admissionMode = communityQrAdmissionModeRef.current || "community_vote";
    const message = buildSimpleJoinInviteMessage({
      communityName: safeCommunityName,
      inviteLink: link,
      admissionMode,
    });
    const shareText = buildSimpleJoinInviteMessage({
      communityName: safeCommunityName,
      admissionMode,
    });

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `Join ${safeCommunityName}`,
          text: shareText,
          url: link,
        });
        setCommunityQrFeedback({ tone: "success", text: "Community QR opened for sharing." });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    const copied = await copyToClipboard(message);
    setCommunityQrFeedback({
      tone: copied ? "success" : "error",
      text: copied
        ? "Community invite copied. Paste it into WhatsApp or any message."
        : "Sharing is not available on this device.",
    });
  }

  async function readyLink(): Promise<string> {
    return inviteLink || prepareInviteLink();
  }

  async function copyInviteLink() {
    setFeedback(null);
    const link = await readyLink();
    if (!link) return;

    const copied = await copyToClipboard(link);
    setFeedback({
      tone: copied ? "success" : "error",
      text: copied ? "Invite link copied." : "Copy failed. Try Share instead.",
    });
  }

  async function shareInviteLink() {
    setFeedback(null);
    const safeRecipientName = recipientName.trim();
    if (hero && !safeRecipientName) {
      setFeedback({ tone: "error", text: "Enter their name." });
      return;
    }

    const link = await readyLink();
    if (!link) return;
    const safeInviterName =
      inviterNameFromLink(link) || inviterName.trim() || preparedInviterName;
    const personalizedLink = personalizedJoinInviteUrl(link, {
      inviterName: safeInviterName,
      recipientName: safeRecipientName,
      communityCode,
      communityName,
    });
    const linkToShare = personalizedLink || link;
    const message = buildSimpleJoinInviteMessage({
      communityName,
      inviteLink: linkToShare,
      inviter: safeInviterName,
      receiver: safeRecipientName,
      admissionMode: admissionModeRef.current,
    });
    const shareText = buildSimpleJoinInviteMessage({
      communityName,
      inviter: safeInviterName,
      receiver: safeRecipientName,
      admissionMode: admissionModeRef.current,
    });

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: communityName ? `Join ${communityName}` : "Join this GSN community",
          text: shareText,
          url: linkToShare,
        });
        setFeedback({ tone: "success", text: "Invite opened for sharing." });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    const copied = await copyToClipboard(message);
    setFeedback({
      tone: copied ? "success" : "error",
      text: copied
        ? "Invite message copied. Paste it into WhatsApp or any message."
        : "Sharing is not available on this device.",
    });
  }

  const cardStyle = embedded
    ? brandInnerCard("linear-gradient(180deg, #FFFFFF 0%, #F3F8FF 100%)")
    : brandPageCard("linear-gradient(180deg, #FFFFFF 0%, #F3F8FF 100%)");
  const communityQrIsInstant = communityQrAdmissionMode === "instant_invite";

  if (hero) {
    const visibleInviterName = inviterName.trim() || preparedInviterName || "Your GSN name";
    const identityPresentation = heroPresentation === "identity";
    return (
      <div
        data-debug-id="simple-community-invite"
        style={{
          marginTop: identityPresentation ? 10 : compact ? 11 : 14,
          display: identityPresentation ? "grid" : "block",
          gridTemplateColumns: identityPresentation
            ? "minmax(0, 1.45fr) minmax(0, 0.8fr)"
            : undefined,
          gap: identityPresentation ? 8 : undefined,
          alignItems: identityPresentation ? "start" : undefined,
        }}
      >
        <details style={{ display: identityPresentation ? "contents" : "block" }}>
        <StableDisclosureSummary
          debugId="simple-community-invite.open"
          stableHeight={identityPresentation ? 46 : 40}
          style={{
            width: identityPresentation ? "100%" : "fit-content",
            minWidth: 0,
            gridColumn: identityPresentation ? "1" : undefined,
            gridRow: identityPresentation ? "1" : undefined,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            padding: identityPresentation ? "10px 11px" : "8px 13px",
            borderRadius: identityPresentation ? 14 : 999,
            border: identityPresentation
              ? "1px solid rgba(13,95,168,0.18)"
              : "1px solid rgba(255,255,255,0.42)",
            background: identityPresentation
              ? "linear-gradient(180deg, #1267AC 0%, #0B4F86 100%)"
              : "linear-gradient(180deg, #F8D976 0%, #E8B83D 100%)",
            color: identityPresentation ? "#FFFFFF" : "#07172C",
            fontSize: identityPresentation ? 13.5 : 14,
            fontWeight: 950,
            lineHeight: 1,
            boxShadow: identityPresentation
              ? "0 10px 20px rgba(11,79,134,0.18)"
              : undefined,
            ...(identityPresentation ? heroActionStyle : {}),
          }}
        >
          <GsnLegacyIcon name="community" size={21} />
          {identityPresentation ? "Invite members" : "Invite"}
        </StableDisclosureSummary>

        <div
          style={{
            gridColumn: identityPresentation ? "1 / -1" : undefined,
            gridRow: identityPresentation ? "2" : undefined,
            marginTop: identityPresentation ? 0 : 9,
            borderRadius: 16,
            border: identityPresentation
              ? "1px solid rgba(13,95,168,0.14)"
              : "1px solid rgba(231,202,124,0.32)",
            background: identityPresentation
              ? "linear-gradient(180deg, #F8FBFF 0%, #EEF6FF 100%)"
              : "rgba(255,255,255,0.07)",
            padding: compact ? 9 : 11,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: compact ? "1fr" : "minmax(0, 1fr) auto",
              gap: 8,
              alignItems: "end",
            }}
          >
            <label
              style={{
                minWidth: 0,
                display: "grid",
                gap: 5,
                color: identityPresentation ? "#07172C" : "#F8FBFF",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              Their name
              <input
                data-debug-id="simple-community-invite.recipient-name"
                type="text"
                value={recipientName}
                onChange={(event) => {
                  setRecipientName(event.target.value);
                  if (feedback?.tone === "error") setFeedback(null);
                }}
                placeholder="Name"
                autoComplete="off"
                enterKeyHint="send"
                style={{
                  width: "100%",
                  minWidth: 0,
                  minHeight: 46,
                  boxSizing: "border-box",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.32)",
                  background: "rgba(255,255,255,0.96)",
                  color: "#07172C",
                  padding: "10px 12px",
                  font: "inherit",
                  fontSize: 16,
                  fontWeight: 800,
                  outline: "none",
                }}
              />
            </label>
            <StableButton
              type="button"
              kind="primary"
              debugId="simple-community-invite.send"
              onClick={shareInviteLink}
              busy={loading}
              busyLabel="Preparing..."
              disabled={!communityId}
              stableHeight={46}
              style={{ minWidth: compact ? "100%" : 142 }}
            >
              Send invite
            </StableButton>
          </div>

          <div
            style={{
              marginTop: 7,
              minHeight: 18,
              color: feedback?.tone === "error"
                ? identityPresentation ? "#991B1B" : "#FFD2D2"
                : identityPresentation ? "#48657D" : "#DCEBFA",
              fontSize: 12,
              fontWeight: 820,
              lineHeight: 1.35,
            }}
            aria-live="polite"
          >
            {feedback?.text || `From: ${visibleInviterName}`}
          </div>
        </div>
        </details>
        {identityPresentation && heroSecondaryAction ? (
          <div style={{ minWidth: 0, gridColumn: "2", gridRow: "1" }}>
            {heroSecondaryAction}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section
      data-debug-id="simple-community-invite"
      style={{
        ...cardStyle,
        padding: compact ? 15 : 18,
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
        <span
          aria-hidden="true"
          style={{
            width: compact ? 44 : 50,
            height: compact ? 44 : 50,
            display: "grid",
            placeItems: "center",
            borderRadius: 15,
            background: gmfnBrand.colors.accentSoft,
            border: `1px solid ${gmfnBrand.colors.accentBorder}`,
          }}
        >
          <GsnLegacyIcon name="qr" size={compact ? 28 : 32} />
        </span>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: gmfnBrand.colors.ink,
              fontSize: compact ? 18 : 21,
              fontWeight: 950,
              lineHeight: 1.15,
            }}
          >
            Community QR
          </div>
          <div style={{ marginTop: 4, color: "#24734B", fontSize: 12, fontWeight: 950 }}>
            {communityQrAdmissionMode
              ? communityQrIsInstant
                ? "Instant admission"
                : "Community approval"
              : "Follows your joining rule"}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          color: gmfnBrand.colors.muted,
          fontSize: compact ? 13 : 14,
          fontWeight: 760,
          lineHeight: 1.45,
        }}
      >
        {communityQrAdmissionMode
          ? communityQrIsInstant
            ? "One QR for many people. Each person joins immediately, receives a GSN ID, then creates their password."
            : "One QR for many people. Each person requests access, then your community approves them."
          : "One QR for many people. Instant Join admits them immediately; reviewed modes wait for community approval."}
      </div>

      <div
        aria-live="polite"
        style={{
          marginTop: communityQrFeedback || communityQrLoading ? 10 : 0,
          minHeight: communityQrFeedback || communityQrLoading ? 22 : 0,
          color: communityQrFeedback?.tone === "error" ? "#991B1B" : gmfnBrand.colors.accent,
          fontSize: 13,
          fontWeight: 900,
        }}
      >
        {communityQrFeedback?.text || (communityQrLoading ? "Creating community QR..." : "")}
      </div>

      {communityQrLink ? (
        <div
          style={{
            marginTop: 10,
            display: "grid",
            justifyItems: "center",
            gap: 9,
            padding: 12,
            borderRadius: 16,
            border: "1px solid rgba(37,78,119,0.16)",
            background: "#FFFFFF",
          }}
        >
          <QRCodeSVG
            value={communityQrLink}
            size={compact ? 176 : 196}
            bgColor="#FFFFFF"
            fgColor="#07172C"
            level="M"
            marginSize={1}
            aria-label={`Community QR for ${communityName || "this GSN community"}`}
          />
          <div style={{ color: gmfnBrand.colors.muted, fontSize: 12, fontWeight: 800 }}>
            {communityQrIsInstant ? "Scan to join immediately" : "Scan to request access"}
          </div>
        </div>
      ) : null}

      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "minmax(0, 1.25fr) minmax(0, 1fr)",
          gap: 9,
        }}
      >
        <StableButton
          type="button"
          kind="primary"
          debugId="simple-community-invite.community-qr"
          onClick={communityQrLink ? copyCommunityQrLink : prepareCommunityQrLink}
          busy={communityQrLoading}
          busyLabel="Creating..."
          disabled={!communityId}
          fullWidth
          stableHeight={52}
        >
          <GsnLegacyIcon name={communityQrLink ? "copy" : "qr"} size={19} />
          {communityQrLink ? "Copy community link" : "Create community QR"}
        </StableButton>
        <StableButton
          type="button"
          kind="secondary"
          debugId="simple-community-invite.community-qr-share"
          onClick={shareCommunityQrLink}
          disabled={!communityId || communityQrLoading}
          fullWidth
          stableHeight={52}
        >
          Share community link
        </StableButton>
      </div>

      <details style={{ marginTop: 12 }}>
        <StableDisclosureSummary
          debugId="simple-community-invite.personal"
          stableHeight={48}
          style={{
            width: "100%",
            borderRadius: 14,
            border: "1px solid rgba(37,78,119,0.16)",
            background: "#F8FBFF",
            color: gmfnBrand.colors.ink,
            fontSize: 14,
            fontWeight: 950,
          }}
        >
          Invite one person instead
        </StableDisclosureSummary>
        <div style={{ marginTop: 10, color: gmfnBrand.colors.muted, fontSize: 13, fontWeight: 760 }}>
          Send one ordinary invite link to one person.
        </div>
        <div
          aria-live="polite"
          style={{
            marginTop: feedback || loading ? 8 : 0,
            minHeight: feedback || loading ? 20 : 0,
            color: feedback?.tone === "error" ? "#991B1B" : gmfnBrand.colors.accent,
            fontSize: 13,
            fontWeight: 900,
          }}
        >
          {feedback?.text || (loading ? "Preparing invite..." : "")}
        </div>
        <div
          style={{
            marginTop: 9,
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "minmax(0, 1.25fr) minmax(0, 1fr)",
            gap: 9,
          }}
        >
          <StableButton
            type="button"
            kind="primary"
            debugId="simple-community-invite.copy"
            onClick={copyInviteLink}
            busy={loading}
            busyLabel="Preparing..."
            disabled={!communityId}
            fullWidth
            stableHeight={52}
          >
            <GsnLegacyIcon name="copy" size={19} />
            Copy personal link
          </StableButton>
          <StableButton
            type="button"
            kind="secondary"
            debugId="simple-community-invite.share"
            onClick={shareInviteLink}
            disabled={!communityId || loading}
            fullWidth
            stableHeight={52}
          >
            Share personal invite
          </StableButton>
        </div>
      </details>
    </section>
  );
}
