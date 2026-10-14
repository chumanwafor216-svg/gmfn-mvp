import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getClanInviteLink } from "../lib/api";
import { normalizedJoinInviteUrl } from "../lib/joinLinks";
import { copyToClipboard } from "../lib/share";
import {
  brandInnerCard,
  brandPageCard,
  brandSectionLabel,
  gmfnBrand,
} from "../styles/gmfnBrand";
import { GsnLegacyIcon } from "./GsnLegacyIcon";
import { StableButton } from "./StableButton";

type SimpleCommunityInviteCardProps = {
  communityId: number;
  communityName?: string;
  initialLink?: string;
  compact?: boolean;
  embedded?: boolean;
};

type InviteFeedback = {
  tone: "success" | "error";
  text: string;
} | null;

function inviteMessage(communityName: string, inviteLink: string): string {
  const destination = communityName || "this GSN community";
  return `Join ${destination} on GSN. Open this link to request access: ${inviteLink}`;
}

export default function SimpleCommunityInviteCard({
  communityId,
  communityName = "",
  initialLink = "",
  compact = false,
  embedded = false,
}: SimpleCommunityInviteCardProps) {
  const normalizedInitialLink = useMemo(
    () => normalizedJoinInviteUrl({ invite_link: initialLink }),
    [initialLink]
  );
  const [inviteLink, setInviteLink] = useState(normalizedInitialLink);
  const [loading, setLoading] = useState(Boolean(communityId && !normalizedInitialLink));
  const [feedback, setFeedback] = useState<InviteFeedback>(null);

  const prepareInviteLink = useCallback(async (): Promise<string> => {
    if (!communityId) return "";

    setLoading(true);
    try {
      const response = await getClanInviteLink(communityId);
      const nextLink = normalizedJoinInviteUrl(response);
      if (!nextLink) throw new Error("Invite link unavailable");
      setInviteLink(nextLink);
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
  }, [communityId]);

  useEffect(() => {
    let alive = true;
    setFeedback(null);
    setInviteLink(normalizedInitialLink);

    if (!communityId || normalizedInitialLink) {
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
  }, [communityId, normalizedInitialLink]);

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
    const link = await readyLink();
    if (!link) return;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: communityName ? `Join ${communityName}` : "Join this GSN community",
          text: inviteMessage(communityName, link),
          url: link,
        });
        setFeedback({ tone: "success", text: "Invite opened for sharing." });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    const copied = await copyToClipboard(inviteMessage(communityName, link));
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
          <div style={brandSectionLabel()}>Invite people</div>
          <div
            style={{
              marginTop: 3,
              color: gmfnBrand.colors.ink,
              fontSize: compact ? 18 : 21,
              fontWeight: 950,
              lineHeight: 1.15,
            }}
          >
            Invite to this community
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
        Send the link. They open it and ask to join. The community still approves them.
      </div>

      <div
        aria-live="polite"
        style={{
          marginTop: 10,
          minHeight: 22,
          color: feedback?.tone === "error" ? "#991B1B" : gmfnBrand.colors.accent,
          fontSize: 13,
          fontWeight: 900,
        }}
      >
        {feedback?.text || (loading ? "Preparing invite link..." : inviteLink ? "Invite link ready." : "Invite link needs preparing.")}
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
          busyLabel="Preparing link..."
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
