import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import { GsnLegacyIcon } from "../components/GsnLegacyIcon";
import { StableButton } from "../components/StableButton";
import {
  createAdminGsnHouseCampaign,
  discardAdminGsnHouseCampaignReviewMedia,
  listAdminGsnHouseCampaigns,
  listAdminGsnHouseCampaignDestinations,
  previewAdminGsnHouseCampaign,
  stopAdminGsnHouseCampaign,
  uploadMarketplaceImageFile,
  uploadMarketplaceVideoFile,
  type GsnHouseCampaignDestination,
  type GsnHouseCampaignOperations,
  type GsnHouseCampaignPreview,
  type GsnHouseCampaignPublication,
} from "../lib/api";
import { APP_ROUTES } from "../lib/appRoutes";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
} from "../lib/institutionalSurface";
import {
  prepareSpotlightImageFile,
  prepareSpotlightVideoFile,
} from "../lib/spotlightMediaPrep";
import {
  SPOTLIGHT_MAX_IMAGE_BYTES,
  SPOTLIGHT_MAX_VIDEO_BYTES,
  SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
} from "../lib/spotlightPilot";
import { structuredErrorMessage } from "../lib/structuredErrors";

type PreparedMedia = {
  kind: "image" | "video";
  file: File;
  durationSeconds?: number | null;
  preparationMessage?: string | null;
};

type CampaignReview = {
  message: string;
  mediaKind: "image" | "video";
  mediaUrl: string;
  idempotencyKey: string;
  preview: GsnHouseCampaignPreview;
};

function safeStr(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100%",
    padding: "24px clamp(16px, 3vw, 32px) 48px",
    background: "linear-gradient(180deg, #F5F8FC 0%, #EAF1F8 100%)",
  };
}

function contentWrap(): React.CSSProperties {
  return {
    width: "min(1120px, 100%)",
    margin: "0 auto",
    display: "grid",
    gap: 18,
  };
}

function card(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    padding: "clamp(16px, 3vw, 24px)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    minWidth: 0,
  };
}

function helper(): React.CSSProperties {
  return {
    color: "#496277",
    fontSize: 14,
    lineHeight: 1.65,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    color: "#64778B",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function fieldStyle(multiline = false): React.CSSProperties {
  return {
    width: "100%",
    minHeight: multiline ? 116 : 46,
    boxSizing: "border-box",
    borderRadius: 14,
    border: "1px solid rgba(17,42,68,0.18)",
    background: "#FFFFFF",
    color: "#0B1F33",
    padding: multiline ? "12px 14px" : "10px 14px",
    font: "inherit",
    fontSize: 15,
    lineHeight: 1.55,
    resize: multiline ? "vertical" : "none",
    outlineColor: "#0B63D1",
  };
}

function statusPanel(tone: "error" | "success" | "info"): React.CSSProperties {
  const colors = {
    error: { bg: "#FEF2F2", border: "rgba(185,28,28,0.20)", text: "#991B1B" },
    success: { bg: "#ECFDF3", border: "rgba(22,116,71,0.22)", text: "#166534" },
    info: { bg: "#EFF6FF", border: "rgba(11,99,209,0.20)", text: "#174C84" },
  }[tone];
  return {
    ...institutionalInnerCard(colors.bg),
    border: `1px solid ${colors.border}`,
    color: colors.text,
    fontSize: 14,
    lineHeight: 1.6,
    fontWeight: 750,
  };
}

function destinationTitle(row: GsnHouseCampaignDestination): string {
  return safeStr(row.community_domain_name) || safeStr(row.community_name, "Unnamed Community Domain");
}

function destinationContext(row: GsnHouseCampaignDestination): string {
  const parts = [
    safeStr(row.community_name) !== destinationTitle(row)
      ? safeStr(row.community_name)
      : "",
    safeStr(row.community_code),
  ].filter(Boolean);
  return parts.join(" · ");
}

function uploadUrl(response: any, kind: "image" | "video"): string {
  return safeStr(
    response?.[`${kind}_url`] ||
      response?.url ||
      response?.file_url ||
      response?.path ||
      response?.item?.[`${kind}_url`] ||
      response?.data?.[`${kind}_url`]
  );
}

function makeIdempotencyKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `gsn-house-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function dateTimeLabel(value?: string | null): string {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function stateLabel(value: string): string {
  return safeStr(value, "unknown").replace(/_/g, " ");
}

export default function AdminGsnHouseCampaignPage() {
  const [query, setQuery] = useState("");
  const [catalogue, setCatalogue] = useState<GsnHouseCampaignDestination[]>([]);
  const [catalogueMeta, setCatalogueMeta] = useState({
    matchingTotal: 0,
    eligibleCount: 0,
    excludedCount: 0,
  });
  const [selected, setSelected] = useState<Record<number, GsnHouseCampaignDestination>>({});
  const [message, setMessage] = useState("");
  const [media, setMedia] = useState<PreparedMedia | null>(null);
  const [mediaInputKey, setMediaInputKey] = useState(0);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState("");
  const [review, setReview] = useState<CampaignReview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [publication, setPublication] = useState<GsnHouseCampaignPublication | null>(null);
  const [operations, setOperations] = useState<GsnHouseCampaignOperations | null>(null);
  const [stopReason, setStopReason] = useState("");
  const [stopConfirmed, setStopConfirmed] = useState(false);
  const [loadingCatalogue, setLoadingCatalogue] = useState(false);
  const [loadingOperations, setLoadingOperations] = useState(false);
  const [preparingMedia, setPreparingMedia] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [stoppingCampaign, setStoppingCampaign] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "error" | "success" | "info";
    text: string;
  } | null>(null);
  const reviewRef = useRef<CampaignReview | null>(null);
  const publicationRef = useRef<GsnHouseCampaignPublication | null>(null);

  const selectedRows = useMemo(
    () => Object.values(selected).sort((a, b) => destinationTitle(a).localeCompare(destinationTitle(b))),
    [selected]
  );

  useEffect(() => {
    reviewRef.current = review;
    publicationRef.current = publication;
  }, [publication, review]);

  const discardUnpublishedReview = useCallback(async (candidate: CampaignReview) => {
    try {
      await discardAdminGsnHouseCampaignReviewMedia(candidate.mediaUrl);
    } catch (error) {
      setFeedback({
        tone: "error",
        text: structuredErrorMessage(
          error,
          "The unpublished review was cleared, but its uploaded media could not be removed automatically."
        ),
      });
    }
  }, []);

  const invalidateReview = useCallback(() => {
    if (review && !publication) {
      void discardUnpublishedReview(review);
    }
    setReview(null);
    setConfirmed(false);
    setPublication(null);
  }, [discardUnpublishedReview, publication, review]);

  const loadOperations = useCallback(async () => {
    setLoadingOperations(true);
    try {
      setOperations(await listAdminGsnHouseCampaigns(100));
    } catch (error) {
      setFeedback({
        tone: "error",
        text: structuredErrorMessage(error, "GSN campaign status and history could not be loaded."),
      });
    } finally {
      setLoadingOperations(false);
    }
  }, []);

  const loadDestinations = useCallback(async (search = "") => {
    setLoadingCatalogue(true);
    setFeedback(null);
    try {
      const response = await listAdminGsnHouseCampaignDestinations({
        q: search,
        limit: 100,
      });
      setCatalogue(response.items);
      setCatalogueMeta({
        matchingTotal: Number(response.matching_total || 0),
        eligibleCount: Number(response.eligible_count || 0),
        excludedCount: Number(response.excluded_count || 0),
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: structuredErrorMessage(error, "Community Domain destinations could not be loaded."),
      });
    } finally {
      setLoadingCatalogue(false);
    }
  }, []);

  useEffect(() => {
    void loadDestinations("");
    void loadOperations();
  }, [loadDestinations, loadOperations]);

  useEffect(
    () => () => {
      const abandoned = reviewRef.current;
      if (abandoned && !publicationRef.current) {
        void discardAdminGsnHouseCampaignReviewMedia(abandoned.mediaUrl).catch(() => undefined);
      }
    },
    []
  );

  useEffect(() => {
    if (!media) {
      setMediaPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(media.file);
    setMediaPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [media]);

  function toggleDestination(row: GsnHouseCampaignDestination) {
    if (!row.eligible) return;
    invalidateReview();
    setSelected((current) => {
      if (current[row.clan_id]) {
        const next = { ...current };
        delete next[row.clan_id];
        return next;
      }
      if (Object.keys(current).length >= 100) {
        setFeedback({
          tone: "error",
          text: "A single GSN promotion can target at most 100 Community Domains in this pilot.",
        });
        return current;
      }
      return { ...current, [row.clan_id]: row };
    });
  }

  async function handleMediaPicked(file: File | null) {
    invalidateReview();
    setMedia(null);
    setFeedback(null);
    if (!file) return;

    const lowerName = safeStr(file.name).toLowerCase();
    const isVideo =
      safeStr(file.type).toLowerCase().startsWith("video/") ||
      /.(mp4|mov|webm|m4v)$/.test(lowerName);
    const isImage =
      safeStr(file.type).toLowerCase().startsWith("image/") ||
      /.(jpe?g|png|webp)$/.test(lowerName);
    if (!isVideo && !isImage) {
      setFeedback({
        tone: "error",
        text: "Choose a JPG, PNG, or WebP picture, or a playable MP4, MOV, or WebM video.",
      });
      setMediaInputKey((current) => current + 1);
      return;
    }

    setPreparingMedia(true);
    setFeedback({
      tone: "info",
      text: "Preparing the selected media. Review stays locked until it is ready.",
    });
    try {
      if (isVideo) {
        const prepared = await prepareSpotlightVideoFile(file, {
          maxBytes: SPOTLIGHT_MAX_VIDEO_BYTES,
          maxDurationSeconds: SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
        });
        setMedia({
          kind: "video",
          file: prepared.file,
          durationSeconds: prepared.durationSeconds,
          preparationMessage: prepared.message,
        });
        setFeedback({
          tone: "success",
          text: prepared.message || "The verified short video is ready for the read-only review.",
        });
      } else {
        const prepared = await prepareSpotlightImageFile(file, {
          maxBytes: SPOTLIGHT_MAX_IMAGE_BYTES,
        });
        setMedia({
          kind: "image",
          file: prepared.file,
          preparationMessage: prepared.message,
        });
        setFeedback({
          tone: "success",
          text: prepared.message || "The picture is ready for the read-only review.",
        });
      }
    } catch (error) {
      setMediaInputKey((current) => current + 1);
      setFeedback({
        tone: "error",
        text: structuredErrorMessage(error, "The selected media could not be prepared for Spotlight."),
      });
    } finally {
      setPreparingMedia(false);
    }
  }

  async function handleReview() {
    setFeedback(null);
    setPublication(null);
    setConfirmed(false);
    const cleanMessage = message.trim();
    if (selectedRows.length === 0) {
      setFeedback({ tone: "error", text: "Select at least one eligible Community Domain." });
      return;
    }
    if (cleanMessage.length < 2) {
      setFeedback({ tone: "error", text: "Write the official GSN campaign message before reviewing." });
      return;
    }
    if (!media) {
      setFeedback({ tone: "error", text: "Add one prepared picture or verified short video before reviewing." });
      return;
    }

    setReviewing(true);
    try {
      const destinationPreview = await previewAdminGsnHouseCampaign({
        clan_ids: selectedRows.map((row) => row.clan_id),
      });
      if (Number(destinationPreview.eligible_count || 0) <= 0) {
        setReview(null);
        setFeedback({
          tone: "error",
          text: "None of the selected Community Domains is still eligible. Review the exclusions and choose another destination.",
        });
        return;
      }

      const response =
        media.kind === "video"
          ? await uploadMarketplaceVideoFile(
              media.file,
              media.durationSeconds != null &&
                media.durationSeconds <= SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS
                ? media.durationSeconds
                : null,
              null
            )
          : await uploadMarketplaceImageFile(media.file, null);
      const readyMediaUrl = uploadUrl(response, media.kind);
      if (!readyMediaUrl) {
        throw new Error("Media preparation completed, but GSN did not return a usable media link.");
      }

      setReview({
        message: cleanMessage,
        mediaKind: media.kind,
        mediaUrl: readyMediaUrl,
        idempotencyKey: makeIdempotencyKey(),
        preview: destinationPreview,
      });
      setFeedback({
        tone: "success",
        text: "Read-only review is ready. Nothing has been published. Check the official message, media, destinations, and final confirmation.",
      });
    } catch (error) {
      setReview(null);
      setFeedback({
        tone: "error",
        text: structuredErrorMessage(error, "The campaign review could not be prepared."),
      });
    } finally {
      setReviewing(false);
    }
  }

  async function handlePublish() {
    if (!review) {
      setFeedback({ tone: "error", text: "Prepare the read-only review before publishing." });
      return;
    }
    if (!confirmed) {
      setFeedback({
        tone: "error",
        text: "Confirm the official GSN publication and non-endorsement boundary first.",
      });
      return;
    }

    setPublishing(true);
    setFeedback(null);
    try {
      const response = await createAdminGsnHouseCampaign({
        clan_ids: review.preview.requested_clan_ids,
        message: review.message,
        image_url: review.mediaKind === "image" ? review.mediaUrl : null,
        video_url: review.mediaKind === "video" ? review.mediaUrl : null,
        idempotency_key: review.idempotencyKey,
      });
      setPublication(response);
      await loadOperations();
      setFeedback({
        tone: "success",
        text: response.idempotent_replay
          ? "The existing GSN campaign result was safely recovered; no duplicate was created."
          : "The official GSN campaign has been published to the currently eligible destinations.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: structuredErrorMessage(
          error,
          "The GSN campaign could not be published. The same safe publication identity will be reused if you retry."
        ),
      });
    } finally {
      setPublishing(false);
    }
  }

  async function handleStopCampaign() {
    const current = operations?.current;
    const reason = stopReason.trim();
    if (!current) {
      setFeedback({ tone: "error", text: "There is no current GSN campaign to stop." });
      return;
    }
    if (reason.length < 5) {
      setFeedback({
        tone: "error",
        text: "Write a clear reason of at least 5 characters for the audit record.",
      });
      return;
    }
    if (!stopConfirmed) {
      setFeedback({
        tone: "error",
        text: "Confirm that this action immediately and permanently stops delivery.",
      });
      return;
    }

    setStoppingCampaign(true);
    setFeedback(null);
    try {
      const response = await stopAdminGsnHouseCampaign(current.campaign_id, {
        reason,
        confirm_withdrawal: true,
      });
      setStopReason("");
      setStopConfirmed(false);
      await loadOperations();
      setFeedback({
        tone: "success",
        text: response.idempotent_replay
          ? "The campaign was already stopped; the existing audited result was recovered."
          : "The campaign was stopped immediately. Pending presentation leases were invalidated and the reason was audited.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: structuredErrorMessage(error, "The GSN campaign could not be stopped."),
      });
    } finally {
      setStoppingCampaign(false);
    }
  }

  function resetCampaign() {
    setSelected({});
    setMessage("");
    setMedia(null);
    setMediaInputKey((current) => current + 1);
    setReview(null);
    setConfirmed(false);
    setPublication(null);
    setFeedback(null);
  }

  return (
    <main style={pageShell()} data-screen="admin-gsn-house-campaign">
      <div style={contentWrap()}>
        <PageTopNav
          sectionLabel="Platform administration"
          title="GSN Spotlight publisher"
          subtitle="Build a central inventory of official GSN promotions for Community Domains that explicitly allow central advertising."
          homeTo={APP_ROUTES.ADMIN_COMMAND}
          homeLabel="Command Centre"
          backTo={APP_ROUTES.ADMIN_COMMAND}
          backLabel="Back"
        />

        <section
          style={{
            ...card("#071A2D"),
            color: "#FFFFFF",
            background:
              "radial-gradient(circle at 86% 12%, rgba(214,170,69,0.24), transparent 34%), linear-gradient(145deg, #071424 0%, #0B2944 100%)",
            borderColor: "rgba(214,170,69,0.28)",
          }}
        >
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{
                width: 66,
                height: 66,
                borderRadius: 20,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(145deg, #FFF4C2, #D6AA45)",
                boxShadow: "0 18px 34px rgba(0,0,0,0.24)",
              }}
            >
              <GsnLegacyIcon name="megaphone" size={46} />
            </div>
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <div style={{ color: "#F4D77E", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>
                Official system publisher
              </div>
              <h1 style={{ margin: "7px 0 0", fontSize: "clamp(26px, 5vw, 40px)", lineHeight: 1.08 }}>
                Global Support Network
              </h1>
              <p style={{ margin: "10px 0 0", color: "#D7E3EF", lineHeight: 1.65, maxWidth: 760 }}>
                The public author is GSN-HOUSE. Your signed-in admin identity is kept separately as the audit actor. This tool does not borrow a member, shop, or community identity.
              </p>
            </div>
          </div>
          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            {[
              ["Publisher", "GSN-HOUSE"],
              ["Duration", "24 hours"],
              ["Selected", String(selectedRows.length)],
              ["Media", media ? (media.kind === "video" ? "Verified video" : "Prepared picture") : "Not ready"],
            ].map(([label, value]) => (
              <div key={label} style={{ ...institutionalInnerCard("rgba(255,255,255,0.08)"), borderColor: "rgba(255,255,255,0.13)" }}>
                <div style={{ color: "#BFD0E0", fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
                <div style={{ marginTop: 7, color: "#FFFFFF", fontSize: 16, fontWeight: 900 }}>{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ ...card(), order: 1 }} aria-label="GSN campaign operations">
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 280px" }}>
              <div style={sectionLabel()}>Campaign operations</div>
              <h2 style={{ margin: "8px 0 0", color: "#0B1F33", fontSize: 22 }}>
                Active inventory and truthful delivery report
              </h2>
              <p style={{ margin: "8px 0 0", ...helper() }}>
                GSN separates promotions issued for delivery from promotions that became visibly present. It does not infer handset receipt, playback, completion, sales, or verified-human reach.
              </p>
            </div>
            <StableButton
              busy={loadingOperations}
              busyLabel="Refreshing"
              onClick={() => void loadOperations()}
              debugId="admin-gsn-campaign.operations-refresh"
            >
              Refresh status
            </StableButton>
          </div>

          {loadingOperations && !operations ? (
            <div style={{ marginTop: 14, ...softCard() }}>Loading campaign operations…</div>
          ) : operations?.current ? (
            <div style={{ marginTop: 16, ...softCard("#F8FBFF") }}>
              <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                  <div style={{ color: "#166534", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>
                    {operations.active_count} active · most recent is {stateLabel(operations.current.state)}
                  </div>
                  <h3 style={{ margin: "6px 0 0", color: "#0B1F33", fontSize: 19 }}>
                    Campaign #{operations.current.campaign_id}
                  </h3>
                </div>
                <div style={{ color: "#496277", fontSize: 13, lineHeight: 1.5 }}>
                  Expires {dateTimeLabel(operations.current.expires_at)}
                </div>
              </div>
              <p style={{ margin: "12px 0 0", color: "#0B1F33", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                {operations.current.content.message}
              </p>
              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 9 }}>
                {[
                  ["Placements", operations.current.delivery.placement_count],
                  ["Eligible now", operations.current.delivery.currently_eligible_destination_count],
                  ["Issued by GSN", operations.current.delivery.issued_presentation_count],
                  ["Seen", operations.current.delivery.qualified_presentation_count],
                  ["People who saw it", operations.current.delivery.unique_qualified_viewer_accounts],
                ].map(([label, value]) => (
                  <div key={label} style={institutionalInnerCard("#FFFFFF")}>
                    <div style={{ color: "#64778B", fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
                    <div style={{ marginTop: 6, color: "#0B1F33", fontSize: 18, fontWeight: 900 }}>{value}</div>
                  </div>
                ))}
              </div>

              {operations.current.can_stop ? (
                <details style={{ marginTop: 14, ...institutionalInnerCard("#FFF7F7"), borderColor: "rgba(153,27,27,0.18)" }}>
                  <summary style={{ cursor: "pointer", color: "#991B1B", fontWeight: 900 }}>
                    Emergency campaign stop
                  </summary>
                  <p style={{ margin: "12px 0 0", color: "#7F1D1D", fontSize: 14, lineHeight: 1.6 }}>
                    This permanently ends delivery and invalidates pending presentation leases. It does not erase the campaign or its audit history.
                  </p>
                  <label style={{ display: "block", marginTop: 12 }}>
                    <span style={{ ...sectionLabel(), display: "block", marginBottom: 7 }}>Required audit reason</span>
                    <textarea
                      value={stopReason}
                      onChange={(event) => {
                        setStopReason(event.target.value);
                        setStopConfirmed(false);
                      }}
                      maxLength={500}
                      placeholder="Explain why GSN is stopping this campaign."
                      style={fieldStyle(true)}
                    />
                  </label>
                  <label style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "flex-start", color: "#7F1D1D", fontSize: 14, lineHeight: 1.55, fontWeight: 800 }}>
                    <input
                      type="checkbox"
                      checked={stopConfirmed}
                      onChange={(event) => setStopConfirmed(event.target.checked)}
                      style={{ width: 20, height: 20, marginTop: 1, accentColor: "#991B1B" }}
                    />
                    I confirm that this immediately and permanently stops this campaign.
                  </label>
                  <div style={{ marginTop: 13 }}>
                    <StableButton
                      kind="danger"
                      busy={stoppingCampaign}
                      busyLabel="Stopping campaign"
                      disabled={stopReason.trim().length < 5 || !stopConfirmed}
                      onClick={handleStopCampaign}
                      debugId="admin-gsn-campaign.stop"
                    >
                      Stop campaign now
                    </StableButton>
                  </div>
                </details>
              ) : null}
            </div>
          ) : (
            <div style={{ marginTop: 14, ...softCard("#F8FBFF") }}>
              <div style={{ color: "#0B1F33", fontWeight: 900 }}>No GSN house campaign is currently serving.</div>
              <div style={{ marginTop: 5, ...helper() }}>You can start building the 24-hour promotion inventory below.</div>
            </div>
          )}

          {operations && operations.active.length > 1 ? (
            <details style={{ marginTop: 14, ...softCard("#F5FAFF") }}>
              <summary style={{ cursor: "pointer", color: "#0B1F33", fontWeight: 900 }}>
                Other active promotions ({operations.active.length - 1})
              </summary>
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {operations.active.slice(1).map((item) => (
                  <div key={item.campaign_id} style={institutionalInnerCard("#FFFFFF")}>
                    <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                      Campaign #{item.campaign_id} · {stateLabel(item.state)}
                    </div>
                    <div style={{ marginTop: 6, ...helper() }}>{item.content.message}</div>
                    <div style={{ marginTop: 8, ...helper(), fontSize: 13 }}>
                      {item.delivery.placement_count} placements · {item.delivery.issued_presentation_count} issued · {item.delivery.qualified_presentation_count} seen · expires {dateTimeLabel(item.expires_at)}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ) : null}

          <details style={{ marginTop: 14, ...softCard("#FFFFFF") }}>
            <summary style={{ cursor: "pointer", color: "#0B1F33", fontWeight: 900 }}>
              Campaign history ({operations?.history.length || 0})
            </summary>
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {operations?.history.length ? operations.history.map((item) => (
                <details key={item.campaign_id} style={institutionalInnerCard("#F8FAFC")}>
                  <summary style={{ cursor: "pointer", color: "#0B1F33", fontWeight: 850 }}>
                    Campaign #{item.campaign_id} · {stateLabel(item.state)} · {dateTimeLabel(item.activated_at)}
                  </summary>
                  <div style={{ marginTop: 10, display: "grid", gap: 7, ...helper() }}>
                    <div>{item.content.message}</div>
                    <div><strong>Destinations:</strong> {item.delivery.placement_count}</div>
                    <div><strong>Issued by GSN:</strong> {item.delivery.issued_presentation_count}</div>
                    <div><strong>Seen:</strong> {item.delivery.qualified_presentation_count}</div>
                    <div><strong>People who saw it:</strong> {item.delivery.unique_qualified_viewer_accounts}</div>
                    {item.withdrawal_audit?.reason ? <div><strong>Stop reason:</strong> {item.withdrawal_audit.reason}</div> : null}
                  </div>
                </details>
              )) : <div style={helper()}>No earlier GSN house campaigns are recorded.</div>}
            </div>
          </details>
        </section>

        {review ? (
          <section style={{ ...card("#FFFDF6"), order: 5 }} aria-label="Read-only campaign review">
            <div style={sectionLabel()}>3. Read-only review</div>
            <h2 style={{ margin: "8px 0 0", color: "#0B1F33", fontSize: 22 }}>
              Nothing is published yet
            </h2>
            <p style={{ margin: "8px 0 0", ...helper() }}>
              Check the exact official message, uploaded media, eligible destinations, and exclusions. Changing any draft field invalidates this review and removes its unreferenced uploaded media.
            </p>

            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
              <div style={softCard("#FFFFFF")}>
                <div style={sectionLabel()}>Official message</div>
                <div style={{ marginTop: 9, color: "#0B1F33", fontSize: 16, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                  {review.message}
                </div>
              </div>
              <div style={softCard("#FFFFFF")}>
                <div style={sectionLabel()}>Publication facts</div>
                <div style={{ marginTop: 9, display: "grid", gap: 7, ...helper() }}>
                  <div><strong>Publisher:</strong> Global Support Network (GSN-HOUSE)</div>
                  <div><strong>Eligible now:</strong> {review.preview.eligible_count}</div>
                  <div><strong>Excluded now:</strong> {review.preview.excluded_count}</div>
                  <div><strong>Lifetime:</strong> 24 hours</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, ...softCard("#FFFFFF") }}>
              <div style={sectionLabel()}>Eligible destinations</div>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {review.preview.eligible_destinations.map((row) => (
                  <div key={row.clan_id} style={{ color: "#0B1F33", fontWeight: 850 }}>
                    {destinationTitle(row)}{row.community_code ? ` · ${row.community_code}` : ""}
                  </div>
                ))}
              </div>
            </div>

            {review.preview.excluded_destinations.length > 0 ? (
              <div style={{ marginTop: 12, ...softCard("#FFF7ED") }}>
                <div style={sectionLabel()}>Excluded before publication</div>
                <div style={{ marginTop: 10, display: "grid", gap: 9 }}>
                  {review.preview.excluded_destinations.map((row) => (
                    <div key={row.clan_id}>
                      <div style={{ color: "#7C2D12", fontWeight: 900 }}>{destinationTitle(row)}</div>
                      <div style={{ marginTop: 3, color: "#9A3412", fontSize: 13, lineHeight: 1.5 }}>{row.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div style={{ marginTop: 12, ...softCard("#071A2D"), color: "#FFFFFF" }}>
              {review.mediaKind === "image" ? (
                <img src={review.mediaUrl} alt="Official GSN campaign review" style={{ width: "100%", maxHeight: 390, objectFit: "cover", borderRadius: 16 }} />
              ) : (
                <video src={review.mediaUrl} controls playsInline style={{ width: "100%", maxHeight: 390, borderRadius: 16, background: "#000000" }} />
              )}
            </div>

            <label style={{ marginTop: 14, ...softCard("#FFFFFF"), display: "flex", gap: 11, alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                style={{ width: 21, height: 21, marginTop: 2, accentColor: "#0B63D1" }}
              />
              <span style={{ color: "#0B1F33", fontSize: 14, lineHeight: 1.6, fontWeight: 850 }}>
                I confirm this is an official GSN publication. It does not endorse a member, shop, advertised subject, or Community Domain, and destination eligibility will be rechecked while it is served.
              </span>
            </label>

            {!publication ? (
              <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                <StableButton
                  kind="primary"
                  fullWidth
                  stableHeight={54}
                  busy={publishing}
                  busyLabel="Publishing safely"
                  disabled={!confirmed}
                  onClick={handlePublish}
                  debugId="admin-gsn-campaign.publish"
                >
                  Publish GSN campaign
                </StableButton>
                <StableButton
                  kind="danger"
                  onClick={() => {
                    invalidateReview();
                    setFeedback({
                      tone: "info",
                      text: "The unpublished review was discarded. GSN is removing its uploaded media if no live record references it.",
                    });
                  }}
                  debugId="admin-gsn-campaign.review-discard"
                >
                  Discard unpublished review
                </StableButton>
              </div>
            ) : null}
          </section>
        ) : null}

        {publication ? (
          <section style={{ ...card("#ECFDF3"), order: 6 }}>
            <div style={sectionLabel()}>Publication result</div>
            <h2 style={{ margin: "8px 0 0", color: "#14532D", fontSize: 24 }}>
              Official GSN campaign is live
            </h2>
            <p style={{ margin: "8px 0 0", color: "#166534", lineHeight: 1.65 }}>
              Published to {Number(publication.propagated_count || publication.propagated_clan_ids?.length || 0)} currently eligible Community Domain{Number(publication.propagated_count || publication.propagated_clan_ids?.length || 0) === 1 ? "" : "s"}. {Number(publication.excluded_count || 0)} destination{Number(publication.excluded_count || 0) === 1 ? " was" : "s were"} excluded.
            </p>
            <div style={{ marginTop: 13, ...softCard("#FFFFFF"), ...helper() }}>
              Publisher: <strong>Global Support Network (GSN-HOUSE)</strong><br />
              Member advertising credit used: <strong>No</strong><br />
              Community endorsement created: <strong>No</strong><br />
              Audit actor: <strong>Your signed-in platform-admin identity</strong>
            </div>
            <div style={{ marginTop: 14 }}>
              <StableButton onClick={resetCampaign} debugId="admin-gsn-campaign.reset">
                Prepare another campaign
              </StableButton>
            </div>
          </section>
        ) : null}

        <details style={{ ...card(), order: 7 }}>
          <summary style={{ cursor: "pointer", color: "#0B1F33", fontWeight: 900 }}>
            Governance and delivery boundary
          </summary>
          <div style={{ marginTop: 13, ...helper(), display: "grid", gap: 8 }}>
            <div>The campaign expires after 24 hours.</div>
            <div>Only explicitly selected Community Domains are considered.</div>
            <div>A destination opt-out or policy change stops later delivery because eligibility is rechecked by the backend.</div>
            <div>The publication creates an audit event, not a seller trust claim, member endorsement, community endorsement, shop, or contact route.</div>
            <div>The normal member Spotlight quota and member advertising credit are not used.</div>
          </div>
        </details>
        {feedback ? <div role="status" style={{ ...statusPanel(feedback.tone), order: 2 }}>{feedback.text}</div> : null}

        <section style={{ ...card(), order: 3 }}>
          <div style={sectionLabel()}>1. Choose Community Domains</div>
          <h2 style={{ margin: "8px 0 0", color: "#0B1F33", fontSize: 22 }}>
            Where should this official campaign appear?
          </h2>
          <p style={{ margin: "8px 0 0", ...helper() }}>
            Only active Community Domains with an explicit central-advertising opt-in can be selected. Blocked rows stay visible so the reason is clear.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void loadDestinations(query.trim());
            }}
            style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}
          >
            <label style={{ flex: "1 1 280px" }}>
              <span style={{ ...sectionLabel(), display: "block", marginBottom: 7 }}>Search by community or domain name/code</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Example: Pillar of Hope or GSN-C-..."
                maxLength={120}
                style={fieldStyle()}
              />
            </label>
            <StableButton
              type="submit"
              busy={loadingCatalogue}
              busyLabel="Searching"
              stableHeight={46}
              debugId="admin-gsn-campaign.search"
              style={{ alignSelf: "flex-end" }}
            >
              Search
            </StableButton>
          </form>

          <div style={{ marginTop: 12, ...helper() }}>
            Showing {catalogue.length} of {catalogueMeta.matchingTotal} matches · {catalogueMeta.eligibleCount} eligible · {catalogueMeta.excludedCount} blocked
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {catalogue.length === 0 && !loadingCatalogue ? (
              <div style={softCard()}>No matching Community Domains were found.</div>
            ) : null}
            {catalogue.map((row) => {
              const checked = Boolean(selected[row.clan_id]);
              return (
                <label
                  key={row.clan_id}
                  style={{
                    ...softCard(row.eligible ? (checked ? "#EFF6FF" : "#FFFFFF") : "#F8FAFC"),
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    cursor: row.eligible ? "pointer" : "not-allowed",
                    opacity: row.eligible ? 1 : 0.82,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!row.eligible}
                    onChange={() => toggleDestination(row)}
                    style={{ width: 20, height: 20, marginTop: 2, accentColor: "#0B63D1" }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", color: "#0B1F33", fontWeight: 900, fontSize: 16 }}>
                      {destinationTitle(row)}
                    </span>
                    {destinationContext(row) ? (
                      <span style={{ display: "block", marginTop: 3, color: "#60758A", fontSize: 13 }}>
                        {destinationContext(row)}
                      </span>
                    ) : null}
                    <span style={{ display: "block", marginTop: 7, color: row.eligible ? "#166534" : "#8A4B12", fontSize: 13, lineHeight: 1.5 }}>
                      {row.reason}
                    </span>
                  </span>
                  <span style={{ borderRadius: 999, padding: "6px 9px", background: row.eligible ? "#DCFCE7" : "#FFF7ED", color: row.eligible ? "#166534" : "#9A3412", fontSize: 11, fontWeight: 900, whiteSpace: "nowrap" }}>
                    {row.eligible ? "Eligible" : "Blocked"}
                  </span>
                </label>
              );
            })}
          </div>

          {selectedRows.length > 0 ? (
            <div style={{ marginTop: 16, ...softCard("#F8FBFF") }}>
              <div style={sectionLabel()}>Selected destinations ({selectedRows.length})</div>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selectedRows.map((row) => (
                  <span key={row.clan_id} style={{ borderRadius: 999, background: "#E6F0FF", color: "#174C84", padding: "7px 10px", fontSize: 13, fontWeight: 850 }}>
                    {destinationTitle(row)}{row.community_code ? ` · ${row.community_code}` : ""}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section style={{ ...card(), order: 4 }}>
          <div style={sectionLabel()}>2. Message and media</div>
          <h2 style={{ margin: "8px 0 0", color: "#0B1F33", fontSize: 22 }}>
            Prepare the compact billboard
          </h2>
          <p style={{ margin: "8px 0 0", ...helper() }}>
            Use one short official message and one picture or short video. Uploading media does not publish the campaign.
          </p>

          {operations?.active_count ? (
            <div style={{ marginTop: 13, ...statusPanel("info") }}>
              {operations.active_count} promotion{operations.active_count === 1 ? " is" : "s are"} already active. This new promotion will join that inventory; it will not replace them.
            </div>
          ) : null}

          <label style={{ display: "block", marginTop: 16 }}>
            <span style={{ ...sectionLabel(), display: "block", marginBottom: 7 }}>Official GSN message</span>
            <textarea
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                invalidateReview();
              }}
              maxLength={2000}
              placeholder="Write the official service announcement or campaign message."
              style={fieldStyle(true)}
            />
          </label>
          <div style={{ marginTop: 5, textAlign: "right", color: "#60758A", fontSize: 12 }}>{message.length}/2000</div>

          <label style={{ display: "block", marginTop: 14, ...softCard("#FFFFFF") }}>
            <span style={{ ...sectionLabel(), display: "block", marginBottom: 7 }}>Picture or verified short video</span>
            <input
              key={mediaInputKey}
              type="file"
              data-gmfn-action-root="true"
              data-cta-id="admin-gsn-campaign.media"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,.jpg,.jpeg,.png,.webp,.mp4,.mov,.webm,.m4v"
              disabled={preparingMedia}
              onChange={(event) => void handleMediaPicked(event.target.files?.[0] || null)}
              style={{ width: "100%", color: "#0B1F33", font: "inherit" }}
            />
            <span style={{ display: "block", marginTop: 9, ...helper(), fontSize: 13 }}>
              Pictures are prepared up to 10 MB. Videos are quality-checked and reduced to the opening {SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS} seconds.
            </span>
          </label>

          {media && mediaPreviewUrl ? (
            <div style={{ marginTop: 14, ...softCard("#071A2D"), color: "#FFFFFF" }}>
              <div style={{ color: "#F4D77E", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>Ready media</div>
              {media.kind === "image" ? (
                <img src={mediaPreviewUrl} alt="Prepared GSN campaign" style={{ marginTop: 10, width: "100%", maxHeight: 360, objectFit: "cover", borderRadius: 16 }} />
              ) : (
                <video src={mediaPreviewUrl} controls playsInline style={{ marginTop: 10, width: "100%", maxHeight: 360, borderRadius: 16, background: "#000000" }} />
              )}
              <div style={{ marginTop: 10, color: "#D7E3EF", fontSize: 13 }}>
                {media.file.name} · {media.kind === "video" ? "Verified short video" : "Prepared picture"}
              </div>
            </div>
          ) : null}

          {!review ? (
            <div style={{ marginTop: 18 }}>
              <StableButton
                kind="primary"
                fullWidth
                stableHeight={54}
                busy={reviewing || preparingMedia}
                busyLabel={preparingMedia ? "Preparing media" : "Preparing review"}
                disabled={selectedRows.length === 0 || message.trim().length < 2 || !media}
                onClick={handleReview}
                debugId="admin-gsn-campaign.review"
              >
                Review campaign
              </StableButton>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
