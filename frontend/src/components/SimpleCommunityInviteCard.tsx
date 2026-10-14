import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createClanInvite, getClanInviteLink } from "../lib/api";
import {
  normalizedJoinInviteUrl,
  personalizedJoinInviteUrl,
} from "../lib/joinLinks";
import { copyToClipboard } from "../lib/share";
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
  inviterName?: string;
  communityCode?: string;
};

type InviteFeedback = {
  tone: "success" | "error";
  text: string;
} | null;

function inviteMessage(
  communityName: string,
  inviteLink: string,
  inviterName = "",
  recipientName = ""
): string {
  const destination = communityName || "this GSN community";
  const sender = inviterName || "A GSN member";
  const greeting = recipientName ? `Hi ${recipientName},\n\n` : "";
  return `${greeting}${sender} invited you to join ${destination} on GSN.\n\nOpen this link to request access:\n${inviteLink}\n\nCommunity approval is required.`;
}

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
  inviterName = "",
  communityCode = "",
}: SimpleCommunityInviteCardProps) {
  const normalizedInitialLink = useMemo(
    () => normalizedJoinInviteUrl({ invite_link: initialLink }),
    [initialLink]
  );
  const [inviteLink, setInviteLink] = useState(normalizedInitialLink);
  const [loading, setLoading] = useState(
    Boolean(!hero && communityId && !normalizedInitialLink)
  );
  const [preparedInviterName, setPreparedInviterName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [feedback, setFeedback] = useState<InviteFeedback>(null);

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
    setRecipientName("");

    if (!communityId || normalizedInitialLink || hero) {
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
  }, [communityId, hero, normalizedInitialLink]);

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
    const message = inviteMessage(
      communityName,
      linkToShare,
      safeInviterName,
      safeRecipientName
    );

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: communityName ? `Join ${communityName}` : "Join this GSN community",
          text: `${safeRecipientName ? `Hi ${safeRecipientName}, ` : ""}${safeInviterName || "A GSN member"} invited you to join ${communityName || "this GSN community"} on GSN.`,
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

  if (hero) {
    const visibleInviterName = inviterName.trim() || preparedInviterName || "Your GSN name";
    return (
      <details
        data-debug-id="simple-community-invite"
        style={{
          marginTop: compact ? 11 : 14,
        }}
      >
        <StableDisclosureSummary
          debugId="simple-community-invite.open"
          stableHeight={40}
          style={{
            width: "fit-content",
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 13px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.42)",
            background: "linear-gradient(180deg, #F8D976 0%, #E8B83D 100%)",
            color: "#07172C",
            fontSize: 14,
            fontWeight: 950,
            lineHeight: 1,
          }}
        >
          <GsnLegacyIcon name="community" size={21} />
          Invite
        </StableDisclosureSummary>

        <div
          style={{
            marginTop: 9,
            borderRadius: 16,
            border: "1px solid rgba(231,202,124,0.32)",
            background: "rgba(255,255,255,0.07)",
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
                color: "#F8FBFF",
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
              color: feedback?.tone === "error" ? "#FFD2D2" : "#DCEBFA",
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
          <GsnLegacyIcon name="community" size={compact ? 28 : 32} />
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
            Invite someone
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
        Copy and send the link. They tap it to ask to join. You approve them before they join.
      </div>

      <div
        aria-live="polite"
        style={{
          marginTop: feedback || loading ? 10 : 0,
          minHeight: feedback || loading ? 22 : 0,
          color: feedback?.tone === "error" ? "#991B1B" : gmfnBrand.colors.accent,
          fontSize: 13,
          fontWeight: 900,
        }}
      >
        {feedback?.text || (loading ? "Preparing link..." : "")}
      </div>

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
          debugId="simple-community-invite.copy"
          onClick={copyInviteLink}
          busy={loading}
          busyLabel="Preparing..."
          disabled={!communityId}
          fullWidth
          stableHeight={52}
        >
          <GsnLegacyIcon name="copy" size={19} />
          Copy invite link
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
          Share invite
        </StableButton>
      </div>
    </section>
  );
}
