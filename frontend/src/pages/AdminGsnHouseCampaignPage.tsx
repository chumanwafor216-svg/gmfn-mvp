import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import { GsnLegacyIcon } from "../components/GsnLegacyIcon";
import { StableButton, StableDisclosureSummary } from "../components/StableButton";
import VideoSoundEditor from "../components/VideoSoundEditor";
import {
  createAdminGsnHouseCampaign,
  discardAdminGsnHouseCampaignReviewMedia,
  listAdminGsnHouseCampaigns,
  listAdminGsnHouseCampaignDestinations,
  previewAdminGsnHouseCampaign,
  stopAdminGsnHouseCampaign,
  stopAdminGsnHouseCampaignDestination,
  uploadMarketplaceImageFile,
  uploadMarketplaceVideoFile,
  type GsnHouseCampaignDestination,
  type GsnHouseCampaignOperations,
  type GsnHouseCampaignPreview,
  type GsnHouseCampaignPublication,
  type GsnHouseCampaignReport,
  type MarketplaceVideoSoundOptions,
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
  key: string;
  kind: "image" | "video";
  file: File;
  durationSeconds?: number | null;
  preparationMessage?: string | null;
  sound?: MarketplaceVideoSoundOptions | null;
};

type CampaignReviewMedia = {
  key: string;
  fileName: string;
  mediaKind: "image" | "video";
  mediaUrl: string;
  idempotencyKey: string;
};

type CampaignReview = {
  message: string;
  contactPhone: string;
  expiresAt: string;
  schedule: {
    startsAt: string;
    endsAt: string;
    intervalMinutes: number;
    timezoneLabel: string;
  } | null;
  media: CampaignReviewMedia[];
  preview: GsnHouseCampaignPreview;
};

type BatchPublication = {
  results: GsnHouseCampaignPublication[];
  total: number;
  complete: boolean;
};

const MAX_GSN_HOUSE_BATCH_MEDIA = 10;
const GSN_HOUSE_DEFAULT_LIFETIME_MS = 24 * 60 * 60 * 1000;
const GSN_HOUSE_MIN_SCHEDULE_INTERVAL_MINUTES = 5;

function dateTimeInputValue(date: Date): string {
  const localTime = date.getTime() - date.getTimezoneOffset() * 60 * 1000;
  return new Date(localTime).toISOString().slice(0, 16);
}

function defaultExpiryInputValue(): string {
  return dateTimeInputValue(new Date(Date.now() + GSN_HOUSE_DEFAULT_LIFETIME_MS));
}

function scheduleInputValue(
  date: Date,
  timezone: 'device' | 'africa_lagos'
): string {
  if (timezone === 'device') return dateTimeInputValue(date);
  return new Date(date.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);
}

function defaultScheduleStartInputValue(
  timezone: 'device' | 'africa_lagos' = 'africa_lagos'
): string {
  return scheduleInputValue(new Date(Date.now() + 30 * 60 * 1000), timezone);
}

function defaultScheduleEndInputValue(
  timezone: 'device' | 'africa_lagos' = 'africa_lagos'
): string {
  return scheduleInputValue(new Date(Date.now() + 90 * 60 * 1000), timezone);
}

function campaignExpiryIso(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function campaignExpiryProblem(value: string): string {
  const expiryTime = new Date(value).getTime();
  if (!value || Number.isNaN(expiryTime)) return 'Choose the date and time when this advert group should stop.';
  if (expiryTime <= Date.now()) return 'Choose an advert-group expiry in the future.';
  return '';
}

function dateTimeInSelectedZoneIso(value: string, timezone: 'device' | 'africa_lagos'): string {
  if (!value) return '';
  if (timezone === 'device') return campaignExpiryIso(value);
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return '';
  const [, year, month, day, hour, minute] = match;
  const utcTime = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  ) - 60 * 60 * 1000;
  return new Date(utcTime).toISOString();
}

function scheduleProblem(input: {
  mode: 'normal' | 'timed';
  startsAtInput: string;
  endsAtInput: string;
  intervalMinutes: string;
  timezone: 'device' | 'africa_lagos';
  expiresAt: string;
}): string {
  if (input.mode === 'normal') return '';
  const startsAt = new Date(dateTimeInSelectedZoneIso(input.startsAtInput, input.timezone)).getTime();
  const endsAt = new Date(dateTimeInSelectedZoneIso(input.endsAtInput, input.timezone)).getTime();
  const expiry = new Date(input.expiresAt).getTime();
  const interval = Number(input.intervalMinutes);
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt)) return 'Choose a valid timed start and end.';
  if (startsAt <= Date.now()) return 'Choose a timed start in the future so review and publication can finish first.';
  if (endsAt <= startsAt) return 'The timed window must end after it starts.';
  if (Number.isFinite(expiry) && endsAt > expiry) return 'The timed window must end on or before the advert-group expiry.';
  if (!Number.isInteger(interval) || interval < GSN_HOUSE_MIN_SCHEDULE_INTERVAL_MINUTES || interval > 1440) {
    return 'Choose a whole-number interval from 5 to 1,440 minutes.';
  }
  return '';
}

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
  return safeStr(row.community_domain_name) || safeStr(row.community_name, "Unnamed community");
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

function mediaFileKey(file: File): string {
  return [file.name, file.size, file.lastModified].join(":");
}

function mediaFileKind(file: File): "image" | "video" | null {
  const lowerName = safeStr(file.name).toLowerCase();
  if (
    safeStr(file.type).toLowerCase().startsWith("video/") ||
    /[.](mp4|mov|webm|m4v)$/.test(lowerName)
  ) {
    return "video";
  }
  if (
    safeStr(file.type).toLowerCase().startsWith("image/") ||
    /[.](jpe?g|png|webp)$/.test(lowerName)
  ) {
    return "image";
  }
  return null;
}

function canonicalAdvertiserPhone(value: unknown): string {
  const compact = safeStr(value).replace(/[\s().-]+/g, "");
  return /^\+[1-9][0-9]{7,14}$/.test(compact) ? compact : "";
}

function dateTimeLabel(value?: string | null): string {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function scheduledDateTimeLabel(value: string, timezoneLabel: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  if (timezoneLabel.startsWith('Africa/Lagos')) {
    return parsed.toLocaleString(undefined, { timeZone: 'Africa/Lagos' });
  }
  return parsed.toLocaleString();
}

function stateLabel(value: string): string {
  return safeStr(value, "unknown").replace(/_/g, " ");
}

function campaignRequestError(error: unknown, fallback: string): string {
  const detail = structuredErrorMessage(error, fallback).trim();
  if (/^(failed to fetch|load failed|networkerror(?: when attempting to fetch resource[.])?)$/i.test(detail)) {
    return `${fallback} The connection ended before GSN could confirm this step. Keep this page open and try again.`;
  }
  return detail;
}

function destinationIsServing(row: GsnHouseCampaignDestination): boolean {
  const placementState = safeStr(row.placement_serving_status).toLowerCase();
  return placementState ? placementState === "serving" : row.delivery_eligible === true;
}

function destinationStatusLabel(row: GsnHouseCampaignDestination): string {
  const placementState = safeStr(row.placement_serving_status).toLowerCase();
  if (placementState === "withdrawn") return "Stopped here";
  if (row.delivery_eligible === true) return "Showing here";
  if (row.policy_eligible === false || row.eligible === false) return "Blocked by community policy";
  if (placementState && placementState !== "serving") return stateLabel(placementState);
  return "Not showing now";
}

function replaceCampaignReport(
  operations: GsnHouseCampaignOperations,
  report: GsnHouseCampaignReport
): GsnHouseCampaignOperations {
  const replace = (row: GsnHouseCampaignReport) =>
    row.campaign_id === report.campaign_id ? report : row;
  return {
    ...operations,
    current:
      operations.current?.campaign_id === report.campaign_id
        ? report
        : operations.current,
    active: operations.active.map(replace),
    history: operations.history.map(replace),
    items: operations.items.map(replace),
  };
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
  const [expiryInput, setExpiryInput] = useState(defaultExpiryInputValue);
  const [scheduleMode, setScheduleMode] = useState<'normal' | 'timed'>('normal');
  const [scheduleStartInput, setScheduleStartInput] = useState(defaultScheduleStartInputValue);
  const [scheduleEndInput, setScheduleEndInput] = useState(defaultScheduleEndInputValue);
  const [scheduleIntervalMinutes, setScheduleIntervalMinutes] = useState('20');
  const [scheduleTimezone, setScheduleTimezone] = useState<'device' | 'africa_lagos'>('africa_lagos');
  const [message, setMessage] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [mediaQueue, setMediaQueue] = useState<PreparedMedia[]>([]);
  const [mediaInputKey, setMediaInputKey] = useState(0);
  const [mediaPreviewKey, setMediaPreviewKey] = useState("");
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState("");
  const [mediaProgress, setMediaProgress] = useState("");
  const [stagedReviewMedia, setStagedReviewMedia] = useState<Record<string, CampaignReviewMedia>>({});
  const [review, setReview] = useState<CampaignReview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [publication, setPublication] = useState<BatchPublication | null>(null);
  const [publishingProgress, setPublishingProgress] = useState("");
  const [operations, setOperations] = useState<GsnHouseCampaignOperations | null>(null);
  const [stopReason, setStopReason] = useState("");
  const [stopConfirmed, setStopConfirmed] = useState(false);
  const [destinationStopTarget, setDestinationStopTarget] = useState<{
    campaignId: number;
    clanId: number;
  } | null>(null);
  const [destinationStopSelection, setDestinationStopSelection] = useState<{
    campaignId: number;
    clanId: number;
  } | null>(null);
  const [destinationStopReason, setDestinationStopReason] = useState("");
  const [destinationStopConfirmed, setDestinationStopConfirmed] = useState(false);
  const [destinationStopFeedback, setDestinationStopFeedback] = useState<{
    campaignId: number;
    tone: "error" | "success" | "info";
    text: string;
  } | null>(null);
  const [loadingCatalogue, setLoadingCatalogue] = useState(false);
  const [loadingOperations, setLoadingOperations] = useState(false);
  const [preparingMedia, setPreparingMedia] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [stoppingCampaign, setStoppingCampaign] = useState(false);
  const [stoppingDestination, setStoppingDestination] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "error" | "success" | "info";
    text: string;
  } | null>(null);
  const reviewRef = useRef<CampaignReview | null>(null);
  const publicationRef = useRef<BatchPublication | null>(null);
  const stagedReviewMediaRef = useRef<Record<string, CampaignReviewMedia>>({});

  const selectedRows = useMemo(
    () => Object.values(selected).sort((a, b) => destinationTitle(a).localeCompare(destinationTitle(b))),
    [selected]
  );
  const previewMediaIndex = useMemo(
    () => mediaQueue.findIndex((item) => item.key === mediaPreviewKey),
    [mediaPreviewKey, mediaQueue]
  );
  const previewMedia = previewMediaIndex >= 0 ? mediaQueue[previewMediaIndex] : null;
  const publishedCount = publication?.results.length || 0;
  const stagedReviewCount = mediaQueue.filter((item) => stagedReviewMedia[item.key]).length;
  const draftBusy = preparingMedia || reviewing || publishing;
  const reviewBlockers = useMemo(() => {
    const blockers: string[] = [];
    const expiryProblem = campaignExpiryProblem(expiryInput);
    const timingProblem = scheduleProblem({
      mode: scheduleMode,
      startsAtInput: scheduleStartInput,
      endsAtInput: scheduleEndInput,
      intervalMinutes: scheduleIntervalMinutes,
      timezone: scheduleTimezone,
      expiresAt: campaignExpiryIso(expiryInput),
    });
    if (selectedRows.length === 0) blockers.push("Choose at least one eligible community.");
    if (message.trim().length < 2) blockers.push("Write the official GSN message.");
    if (!contactPhone.trim()) {
      blockers.push("Add the advertiser's public contact phone number.");
    } else if (!canonicalAdvertiserPhone(contactPhone)) {
      blockers.push("Use an international contact number such as +234....");
    }
    if (mediaQueue.length === 0) blockers.push("Add at least one picture or short video.");
    if (
      mediaQueue.some(
        (item) => item.kind === "video" && item.sound && !item.sound.rightsConfirmed
      )
    ) {
      blockers.push("Confirm permission for every added sound.");
    }
    if (preparingMedia) blockers.push("Wait for media preparation to finish.");
    if (expiryProblem) blockers.push(expiryProblem);
    if (timingProblem) blockers.push(timingProblem);
    return blockers;
  }, [
    contactPhone,
    expiryInput,
    mediaQueue,
    message,
    preparingMedia,
    scheduleEndInput,
    scheduleIntervalMinutes,
    scheduleMode,
    scheduleStartInput,
    scheduleTimezone,
    selectedRows.length,
  ]);

  useEffect(() => {
    reviewRef.current = review;
    publicationRef.current = publication;
    stagedReviewMediaRef.current = stagedReviewMedia;
  }, [publication, review, stagedReviewMedia]);

  const discardReviewMediaItems = useCallback(async (items: CampaignReviewMedia[]) => {
    const results = await Promise.allSettled(
      items.map((item) =>
        discardAdminGsnHouseCampaignReviewMedia(item.mediaUrl)
      )
    );
    if (results.some((result) => result.status === "rejected")) {
      setFeedback({
        tone: "error",
        text: "The unpublished review was cleared, but some uploaded media could not be removed automatically.",
      });
    }
  }, []);

  const discardUnpublishedReview = useCallback(
    async (candidate: CampaignReview) => discardReviewMediaItems(candidate.media),
    [discardReviewMediaItems]
  );

  const invalidateReview = useCallback(() => {
    if (publication?.results.length) {
      setFeedback({
        tone: "error",
        text: "This batch has started publishing and is locked. Finish the remaining promotions or prepare another batch afterward.",
      });
      return false;
    }
    if (review && !publication) {
      void discardUnpublishedReview(review);
    } else if (Object.keys(stagedReviewMedia).length > 0) {
      void discardReviewMediaItems(Object.values(stagedReviewMedia));
    }
    setStagedReviewMedia({});
    setReview(null);
    setConfirmed(false);
    setPublication(null);
    setPublishingProgress("");
    return true;
  }, [discardReviewMediaItems, discardUnpublishedReview, publication, review, stagedReviewMedia]);

  const loadOperations = useCallback(async (silent = false): Promise<boolean> => {
    setLoadingOperations(true);
    try {
      setOperations(await listAdminGsnHouseCampaigns(100));
      return true;
    } catch (error) {
      if (!silent) {
        setFeedback({
          tone: "error",
          text: campaignRequestError(
            error,
            "GSN campaign status and history could not be refreshed. Existing information may be out of date."
          ),
        });
      }
      return false;
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
        text: campaignRequestError(error, "Community destinations could not be loaded."),
      });
    } finally {
      setLoadingCatalogue(false);
    }
  }, []);

  useEffect(() => {
    void loadDestinations("");
    void loadOperations();
  }, [loadDestinations, loadOperations]);

  useEffect(() => {
    if (typeof window === "undefined" || !operations?.active.length) return;
    const now = Date.now();
    const nextExpiry = operations.active
      .map((item) => new Date(item.expires_at || "").getTime())
      .filter((value) => Number.isFinite(value) && value > now)
      .sort((a, b) => a - b)[0];
    if (!nextExpiry) return;

    const timer = window.setTimeout(() => {
      void loadOperations();
    }, Math.max(nextExpiry - Date.now() + 250, 250));
    return () => window.clearTimeout(timer);
  }, [loadOperations, operations?.active]);

  useEffect(
    () => () => {
      const abandoned = reviewRef.current;
      const completed = publicationRef.current?.results.length || 0;
      const abandonedMedia = abandoned
        ? abandoned.media.slice(completed)
        : Object.values(stagedReviewMediaRef.current);
      if (abandonedMedia.length > 0) {
        for (const item of abandonedMedia) {
          void discardAdminGsnHouseCampaignReviewMedia(item.mediaUrl).catch(() => undefined);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (mediaQueue.length === 0) {
      setMediaPreviewKey("");
      return;
    }
    if (!previewMedia) {
      setMediaPreviewKey(mediaQueue[mediaQueue.length - 1].key);
    }
  }, [mediaQueue, previewMedia]);

  useEffect(() => {
    if (!previewMedia) {
      setMediaPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(previewMedia.file);
    setMediaPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [previewMedia]);

  function toggleDestination(row: GsnHouseCampaignDestination) {
    if (!row.eligible) return;
    if (draftBusy) {
      setFeedback({ tone: "info", text: "Wait for the current batch step to finish before changing destinations." });
      return;
    }
    if (!invalidateReview()) return;
    setSelected((current) => {
      if (current[row.clan_id]) {
        const next = { ...current };
        delete next[row.clan_id];
        return next;
      }
      if (Object.keys(current).length >= 100) {
        setFeedback({
          tone: "error",
          text: "A single GSN promotion can target at most 100 communities in this pilot.",
        });
        return current;
      }
      return { ...current, [row.clan_id]: row };
    });
  }

  function removePreparedMedia(key: string) {
    if (draftBusy) return;
    if (!invalidateReview()) return;
    setMediaQueue((current) => current.filter((item) => item.key !== key));
    setMediaInputKey((current) => current + 1);
    setFeedback({ tone: "info", text: "The media item was removed from this batch." });
  }

  function updatePreparedMediaSound(
    key: string,
    sound: MarketplaceVideoSoundOptions | null
  ) {
    if (draftBusy || !invalidateReview()) return;
    setMediaQueue((current) =>
      current.map((item) => (item.key === key ? { ...item, sound } : item))
    );
  }

  async function handleMediaPicked(files: File[]) {
    if (!invalidateReview()) return;
    setFeedback(null);
    if (files.length === 0) return;

    const existingKeys = new Set(mediaQueue.map((item) => item.key));
    const additions = files.filter((file) => !existingKeys.has(mediaFileKey(file)));
    if (mediaQueue.length + additions.length > MAX_GSN_HOUSE_BATCH_MEDIA) {
      setFeedback({
        tone: "error",
        text: `A batch can hold at most ${MAX_GSN_HOUSE_BATCH_MEDIA} media items. Remove an item or choose a smaller group.`,
      });
      setMediaInputKey((current) => current + 1);
      return;
    }
    if (additions.length === 0) {
      setFeedback({ tone: "info", text: "Those media files are already in this batch." });
      setMediaInputKey((current) => current + 1);
      return;
    }

    setPreparingMedia(true);
    const preparedItems: PreparedMedia[] = [];
    const failedNames: string[] = [];
    try {
      for (let index = 0; index < additions.length; index += 1) {
        const file = additions[index];
        const kind = mediaFileKind(file);
        setMediaProgress(`Preparing ${index + 1} of ${additions.length}: ${file.name}`);
        if (!kind) {
          failedNames.push(file.name);
          continue;
        }
        try {
          let preparedItem: PreparedMedia;
          if (kind === "video") {
            const prepared = await prepareSpotlightVideoFile(file, {
              maxBytes: SPOTLIGHT_MAX_VIDEO_BYTES,
              maxDurationSeconds: SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
            });
            preparedItem = {
              key: mediaFileKey(file),
              kind,
              file: prepared.file,
              durationSeconds: prepared.durationSeconds,
              preparationMessage: prepared.message,
            };
          } else {
            const prepared = await prepareSpotlightImageFile(file, {
              maxBytes: SPOTLIGHT_MAX_IMAGE_BYTES,
            });
            preparedItem = {
              key: mediaFileKey(file),
              kind,
              file: prepared.file,
              preparationMessage: prepared.message,
            };
          }
          preparedItems.push(preparedItem);
          setMediaQueue((current) => [...current, preparedItem]);
          setMediaPreviewKey(preparedItem.key);
        } catch {
          failedNames.push(file.name);
        }
      }
      if (preparedItems.length > 0) {
        setFeedback({
          tone: failedNames.length > 0 ? "info" : "success",
          text: `${preparedItems.length} media item${preparedItems.length === 1 ? "" : "s"} added. ${failedNames.length > 0 ? `${failedNames.length} could not be prepared: ${failedNames.join(", ")}.` : "The batch is ready for review preparation."}`,
        });
      } else {
        setFeedback({
          tone: "error",
          text: "None of the selected media could be prepared. Use JPG, PNG, WebP, MP4, MOV, or WebM files that meet the Spotlight limits.",
        });
      }
    } catch (error) {
      setMediaInputKey((current) => current + 1);
      setFeedback({
        tone: "error",
        text: structuredErrorMessage(error, "The selected media batch could not be prepared for Spotlight."),
      });
    } finally {
      setPreparingMedia(false);
      setMediaProgress("");
      setMediaInputKey((current) => current + 1);
    }
  }

  async function handleReview() {
    setFeedback(null);
    setPublication(null);
    setConfirmed(false);
    const cleanMessage = message.trim();
    const cleanContactPhone = canonicalAdvertiserPhone(contactPhone);
    const expiryProblem = campaignExpiryProblem(expiryInput);
    const expiresAt = campaignExpiryIso(expiryInput);
    const timingProblem = scheduleProblem({
      mode: scheduleMode,
      startsAtInput: scheduleStartInput,
      endsAtInput: scheduleEndInput,
      intervalMinutes: scheduleIntervalMinutes,
      timezone: scheduleTimezone,
      expiresAt,
    });
    const timedSchedule = scheduleMode === 'timed'
      ? {
          startsAt: dateTimeInSelectedZoneIso(scheduleStartInput, scheduleTimezone),
          endsAt: dateTimeInSelectedZoneIso(scheduleEndInput, scheduleTimezone),
          intervalMinutes: Number(scheduleIntervalMinutes),
          timezoneLabel: scheduleTimezone === 'africa_lagos'
            ? 'Africa/Lagos (UTC+1)'
            : Intl.DateTimeFormat().resolvedOptions().timeZone || 'Device time',
        }
      : null;
    if (preparingMedia) {
      setFeedback({ tone: "info", text: "Wait for media preparation to finish before reviewing." });
      return;
    }
    if (selectedRows.length === 0) {
      setFeedback({ tone: "error", text: "Select at least one eligible community." });
      return;
    }
    if (cleanMessage.length < 2) {
      setFeedback({ tone: "error", text: "Write the official GSN campaign message before reviewing." });
      return;
    }
    if (!cleanContactPhone) {
      setFeedback({
        tone: "error",
        text: "Add the advertiser's public international phone number, beginning with + and the country code.",
      });
      return;
    }
    if (expiryProblem || !expiresAt) {
      setFeedback({ tone: 'error', text: expiryProblem || 'Choose a valid advert-group expiry.' });
      return;
    }
    if (timingProblem) {
      setFeedback({ tone: 'error', text: timingProblem });
      return;
    }
    if (mediaQueue.length === 0) {
      setFeedback({ tone: "error", text: "Add at least one prepared picture or verified short video before reviewing." });
      return;
    }

    setReviewing(true);
    try {
      const destinationPreview = await previewAdminGsnHouseCampaign({
        clan_ids: selectedRows.map((row) => row.clan_id),
        promotion_count: mediaQueue.length,
        expires_at: expiresAt,
        schedule: timedSchedule
          ? {
              starts_at: timedSchedule.startsAt,
              ends_at: timedSchedule.endsAt,
              interval_minutes: timedSchedule.intervalMinutes,
              timezone_label: timedSchedule.timezoneLabel,
            }
          : null,
      });
      if (Number(destinationPreview.eligible_count || 0) <= 0) {
        setReview(null);
        setFeedback({
          tone: "error",
          text: "None of the selected communities is still eligible. Review the exclusions and choose another destination.",
        });
        return;
      }

      const uploadedMedia: CampaignReviewMedia[] = [];
      let failedItem: PreparedMedia | null = null;
      try {
        for (let index = 0; index < mediaQueue.length; index += 1) {
          const item = mediaQueue[index];
          const retained = stagedReviewMedia[item.key];
          if (retained) {
            uploadedMedia.push(retained);
            setMediaProgress(`Keeping ${index + 1} of ${mediaQueue.length}: ${item.file.name}`);
            continue;
          }
          setMediaProgress(`Uploading ${index + 1} of ${mediaQueue.length}: ${item.file.name}`);
          let response: any;
          try {
            response =
              item.kind === "video"
                ? await uploadMarketplaceVideoFile(
                    item.file,
                    item.durationSeconds != null &&
                      item.durationSeconds <= SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS
                      ? item.durationSeconds
                      : null,
                    null,
                    null,
                    item.sound || null
                  )
                : await uploadMarketplaceImageFile(item.file, null);
          } catch (error) {
            failedItem = item;
            throw error;
          }
          const readyMediaUrl = uploadUrl(response, item.kind);
          if (!readyMediaUrl) {
            failedItem = item;
            throw new Error("GSN did not return a usable media link.");
          }
          const preparedReviewMedia = {
            key: item.key,
            fileName: item.file.name,
            mediaKind: item.kind,
            mediaUrl: readyMediaUrl,
            idempotencyKey: makeIdempotencyKey(),
          } satisfies CampaignReviewMedia;
          uploadedMedia.push(preparedReviewMedia);
          setStagedReviewMedia((current) => ({
            ...current,
            [item.key]: preparedReviewMedia,
          }));
        }
      } catch (error) {
        setReview(null);
        setFeedback({
          tone: "error",
          text: `${campaignRequestError(
            error,
            `${failedItem?.file.name || "The next media item"} could not be prepared.`
          )} ${uploadedMedia.length} of ${mediaQueue.length} media items remain safely prepared on GSN. Tap Continue final check to resume from the unfinished item; the completed uploads will not be repeated.`,
        });
        return;
      }

      setStagedReviewMedia(
        Object.fromEntries(uploadedMedia.map((item) => [item.key, item]))
      );
      setReview({
        message: cleanMessage,
        contactPhone: cleanContactPhone,
        expiresAt,
        schedule: timedSchedule,
        media: uploadedMedia,
        preview: destinationPreview,
      });
      setFeedback({
        tone: "success",
        text: `Read-only review is ready for ${uploadedMedia.length} promotion${uploadedMedia.length === 1 ? "" : "s"}. Nothing has been published.`,
      });
    } catch (error) {
      setReview(null);
      setFeedback({
        tone: "error",
        text: campaignRequestError(error, "The campaign review could not be prepared."),
      });
    } finally {
      setReviewing(false);
      setMediaProgress("");
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
    const results = [...(publication?.results || [])];
    try {
      for (let index = results.length; index < review.media.length; index += 1) {
        const item = review.media[index];
        setPublishingProgress(
          `Publishing ${index + 1} of ${review.media.length}: ${item.fileName}`
        );
        const response = await createAdminGsnHouseCampaign({
          clan_ids: review.preview.requested_clan_ids,
          message: review.message,
          image_url: item.mediaKind === "image" ? item.mediaUrl : null,
          video_url: item.mediaKind === "video" ? item.mediaUrl : null,
          advertiser_contact_phone: review.contactPhone,
          expires_at: review.expiresAt,
          schedule: review.schedule
            ? {
                starts_at: review.schedule.startsAt,
                ends_at: review.schedule.endsAt,
                interval_minutes: review.schedule.intervalMinutes,
                timezone_label: review.schedule.timezoneLabel,
              }
            : null,
          idempotency_key: item.idempotencyKey,
        });
        results.push(response);
        setPublication({
          results: [...results],
          total: review.media.length,
          complete: false,
        });
      }
      setPublication({
        results: [...results],
        total: review.media.length,
        complete: true,
      });
      const statusRefreshed = await loadOperations(true);
      setFeedback(
        statusRefreshed
          ? {
              tone: "success",
              text: `${results.length} official GSN promotion${results.length === 1 ? "" : "s"} published to the currently eligible destinations.`,
            }
          : {
              tone: "info",
              text: `${results.length} official GSN promotion${results.length === 1 ? "" : "s"} published, but GSN could not refresh the status report. Do not publish again. Check the connection, then tap Refresh status.`,
            }
      );
    } catch (error) {
      const statusRefreshed = await loadOperations(true);
      const failure = campaignRequestError(
        error,
        "GSN could not confirm the next promotion."
      );
      setFeedback({
        tone: "error",
        text: `${failure} ${results.length} of ${review.media.length} promotions were confirmed in this session. ${statusRefreshed ? "Check the refreshed status below." : "Check the connection and tap Refresh status first."} If the next promotion is absent, Continue publishing safely; completed promotions use the same publication key and will not be duplicated.`,
      });
    } finally {
      setPublishing(false);
      setPublishingProgress("");
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

  function beginDestinationStop(
    campaign: GsnHouseCampaignReport,
    destination: GsnHouseCampaignDestination
  ) {
    setDestinationStopTarget({
      campaignId: campaign.campaign_id,
      clanId: destination.clan_id,
    });
    setDestinationStopReason("");
    setDestinationStopConfirmed(false);
    setDestinationStopFeedback(null);
  }

  function beginSelectedDestinationStop(campaign: GsnHouseCampaignReport) {
    const selectedClanId =
      destinationStopSelection?.campaignId === campaign.campaign_id
        ? destinationStopSelection.clanId
        : 0;
    const destination = campaign.destinations.find(
      (row) => row.clan_id === selectedClanId && destinationIsServing(row)
    );
    if (!destination) {
      setDestinationStopFeedback({
        campaignId: campaign.campaign_id,
        tone: "error",
        text: "Choose the community where future delivery must stop.",
      });
      return;
    }
    beginDestinationStop(campaign, destination);
  }

  function cancelDestinationStop() {
    setDestinationStopTarget(null);
    setDestinationStopSelection(null);
    setDestinationStopReason("");
    setDestinationStopConfirmed(false);
    setDestinationStopFeedback(null);
  }

  async function handleStopCampaignDestination(
    campaign: GsnHouseCampaignReport,
    destination: GsnHouseCampaignDestination
  ) {
    const reason = destinationStopReason.trim();
    if (!destinationIsServing(destination)) {
      setDestinationStopFeedback({
        campaignId: campaign.campaign_id,
        tone: "info",
        text: `${destinationTitle(destination)} is already unavailable for future delivery.`,
      });
      return;
    }
    if (campaign.destinations.filter(destinationIsServing).length <= 1) {
      setDestinationStopFeedback({
        campaignId: campaign.campaign_id,
        tone: "error",
        text: "This is the final serving destination. Use Emergency campaign stop so the whole campaign closes clearly.",
      });
      return;
    }
    if (reason.length < 5) {
      setDestinationStopFeedback({
        campaignId: campaign.campaign_id,
        tone: "error",
        text: "Write a clear reason of at least 5 characters for the destination audit record.",
      });
      return;
    }
    if (!destinationStopConfirmed) {
      setDestinationStopFeedback({
        campaignId: campaign.campaign_id,
        tone: "error",
        text: "Confirm that future delivery must stop in this community while the campaign continues elsewhere.",
      });
      return;
    }

    setStoppingDestination(true);
    setDestinationStopFeedback(null);
    try {
      const response = await stopAdminGsnHouseCampaignDestination(
        campaign.campaign_id,
        destination.clan_id,
        { reason, confirm_withdrawal: true }
      );
      setOperations((current) =>
        current ? replaceCampaignReport(current, response.campaign) : current
      );
      cancelDestinationStop();
      setDestinationStopFeedback({
        campaignId: campaign.campaign_id,
        tone: "success",
        text: response.idempotent_replay
          ? `${destinationTitle(destination)} was already stopped. The existing audited result was recovered.`
          : `Future delivery stopped in ${destinationTitle(destination)}. Other permitted destinations continue and campaign history is preserved.`,
      });
      await loadOperations();
    } catch (error) {
      setDestinationStopFeedback({
        campaignId: campaign.campaign_id,
        tone: "error",
        text: structuredErrorMessage(
          error,
          "GSN could not stop delivery in this community."
        ),
      });
    } finally {
      setStoppingDestination(false);
    }
  }

  function resetCampaign() {
    setSelected({});
    setExpiryInput(defaultExpiryInputValue());
    setScheduleMode('normal');
    setScheduleStartInput(defaultScheduleStartInputValue());
    setScheduleEndInput(defaultScheduleEndInputValue());
    setScheduleIntervalMinutes('20');
    setScheduleTimezone('africa_lagos');
    setMessage("");
    setContactPhone("");
    setMediaQueue([]);
    setMediaPreviewKey("");
    setMediaProgress("");
    setStagedReviewMedia({});
    setMediaInputKey((current) => current + 1);
    setReview(null);
    setConfirmed(false);
    setPublication(null);
    setPublishingProgress("");
    setFeedback(null);
  }

  function renderCampaignDestinations(campaign: GsnHouseCampaignReport) {
    const destinations = Array.isArray(campaign.destinations)
      ? campaign.destinations
      : [];
    if (destinations.length === 0) return null;

    const servingCount = destinations.filter(destinationIsServing).length;
    const activeTarget =
      destinationStopTarget?.campaignId === campaign.campaign_id
        ? destinationStopTarget
        : null;
    const displayedDestinations = activeTarget
      ? destinations.filter((row) => row.clan_id === activeTarget.clanId)
      : destinations;
    const campaignFeedback =
      destinationStopFeedback?.campaignId === campaign.campaign_id
        ? destinationStopFeedback
        : null;
    const selectedClanId =
      destinationStopSelection?.campaignId === campaign.campaign_id
        ? destinationStopSelection.clanId
        : 0;

    return (
      <details
        style={{ marginTop: 14, ...institutionalInnerCard("#FFFFFF") }}
        open={activeTarget || campaignFeedback || selectedClanId > 0 ? true : undefined}
        data-campaign-destinations={campaign.campaign_id}
      >
        <StableDisclosureSummary
          debugId={`admin-gsn-campaign.destinations.${campaign.campaign_id}`}
          style={{ color: "#0B1F33", fontWeight: 900 }}
          onClick={() => {
            if (activeTarget) return;
            if (selectedClanId > 0) setDestinationStopSelection(null);
            if (campaignFeedback) setDestinationStopFeedback(null);
          }}
        >
          Destinations ({destinations.length}) · {servingCount} still serving
        </StableDisclosureSummary>
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <div style={helper()}>
            Stop one community here without ending delivery in the campaign&apos;s other permitted communities. The original publication and audit history remain recorded.
          </div>

          {!activeTarget && servingCount > 1 && !destinationStopTarget ? (
            <div style={{ ...institutionalInnerCard("#F8FBFF"), display: "grid", gap: 10 }}>
              <label>
                <span style={{ ...sectionLabel(), display: "block", marginBottom: 7 }}>
                  Community to stop
                </span>
                <select
                  value={
                    selectedClanId || ""
                  }
                  onChange={(event) => {
                    const clanId = Number(event.target.value || 0);
                    setDestinationStopSelection(
                      clanId > 0
                        ? { campaignId: campaign.campaign_id, clanId }
                        : null
                    );
                    setDestinationStopFeedback(null);
                  }}
                  style={fieldStyle()}
                  data-gmfn-field={`admin-gsn-campaign.destination-stop-choice.${campaign.campaign_id}`}
                >
                  <option value="">Choose one serving community</option>
                  {destinations.filter(destinationIsServing).map((destination) => (
                    <option key={destination.clan_id} value={destination.clan_id}>
                      {destinationTitle(destination)}
                      {destination.community_code ? ` · ${destination.community_code}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <StableButton
                kind="danger"
                stableHeight={48}
                onClick={() => beginSelectedDestinationStop(campaign)}
                debugId={`admin-gsn-campaign.destination-stop.review.${campaign.campaign_id}`}
              >
                Review destination stop
              </StableButton>
            </div>
          ) : !activeTarget && destinationStopTarget ? (
            <div style={statusPanel("info")}>
              Finish or close the open destination action first.
            </div>
          ) : null}

          {campaignFeedback ? (
            <div role="status" style={statusPanel(campaignFeedback.tone)}>
              {campaignFeedback.text}
            </div>
          ) : null}

          {displayedDestinations.map((destination) => {
            const isTarget = activeTarget?.clanId === destination.clan_id;
            const serving = destinationIsServing(destination);
            const finalServingDestination = serving && servingCount <= 1;
            const status = destinationStatusLabel(destination);
            const statusColor =
              safeStr(destination.placement_serving_status).toLowerCase() === "withdrawn"
                ? "#7F1D1D"
                : destination.delivery_eligible === true
                  ? "#166534"
                  : "#8A4B12";

            return (
              <div
                key={destination.clan_id}
                style={institutionalInnerCard(isTarget ? "#FFF7F7" : "#F8FBFF")}
                data-campaign-destination={destination.clan_id}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0, flex: "1 1 220px" }}>
                    <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                      {destinationTitle(destination)}
                    </div>
                    {destinationContext(destination) ? (
                      <div style={{ marginTop: 3, ...helper(), fontSize: 13 }}>
                        {destinationContext(destination)}
                      </div>
                    ) : null}
                  </div>
                  <span
                    style={{
                      borderRadius: 999,
                      padding: "6px 9px",
                      background: "#FFFFFF",
                      color: statusColor,
                      border: `1px solid ${statusColor}33`,
                      fontSize: 11,
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {status}
                  </span>
                </div>

                <div style={{ marginTop: 8, display: "grid", gap: 5, ...helper(), fontSize: 13 }}>
                  <div>
                    <strong>Authorised until:</strong>{" "}
                    {dateTimeLabel(
                      destination.placement_authorized_expires_at || campaign.expires_at
                    )}
                  </div>
                  {destination.policy_eligible === false || destination.eligible === false ? (
                    <div><strong>Current policy:</strong> {destination.reason}</div>
                  ) : null}
                  {destination.destination_withdrawal_audit?.reason ? (
                    <div>
                      <strong>Why it stopped here:</strong>{" "}
                      {destination.destination_withdrawal_audit.reason}
                    </div>
                  ) : null}
                </div>

                {isTarget ? (
                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    <div style={{ color: "#7F1D1D", fontSize: 14, lineHeight: 1.6 }}>
                      Future delivery will stop in this community. Other permitted destinations continue. This does not erase prior publication or delivery evidence.
                    </div>
                    <label>
                      <span style={{ ...sectionLabel(), display: "block", marginBottom: 7 }}>
                        Required audit reason
                      </span>
                      <textarea
                        value={destinationStopReason}
                        onChange={(event) => {
                          setDestinationStopReason(event.target.value);
                          setDestinationStopConfirmed(false);
                        }}
                        maxLength={500}
                        placeholder="Explain why GSN must stop delivery in this community."
                        style={fieldStyle(true)}
                        data-gmfn-field="admin-gsn-campaign.destination-stop-reason"
                      />
                    </label>
                    <label
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        color: "#7F1D1D",
                        fontSize: 14,
                        lineHeight: 1.55,
                        fontWeight: 800,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={destinationStopConfirmed}
                        onChange={(event) =>
                          setDestinationStopConfirmed(event.target.checked)
                        }
                        style={{ width: 20, height: 20, marginTop: 1, accentColor: "#991B1B" }}
                      />
                      I confirm that future delivery must stop in this community while the campaign continues elsewhere.
                    </label>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <StableButton
                        kind="danger"
                        busy={stoppingDestination}
                        busyLabel="Stopping here"
                        onClick={() =>
                          handleStopCampaignDestination(campaign, destination)
                        }
                        debugId={`admin-gsn-campaign.destination-stop.confirm.${campaign.campaign_id}.${destination.clan_id}`}
                      >
                        Stop in this community
                      </StableButton>
                      <StableButton
                        onClick={cancelDestinationStop}
                        debugId={`admin-gsn-campaign.destination-stop.cancel.${campaign.campaign_id}.${destination.clan_id}`}
                      >
                        Back to destinations
                      </StableButton>
                    </div>
                  </div>
                ) : finalServingDestination ? (
                  <div style={{ marginTop: 9, ...helper(), color: "#7F1D1D" }}>
                    This is the final serving destination. Use Emergency campaign stop to end it.
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </details>
    );
  }

  return (
    <main style={pageShell()} data-screen="admin-gsn-house-campaign">
      <div style={contentWrap()}>
        <PageTopNav
          sectionLabel="Platform administration"
          title="GSN Spotlight publisher"
          subtitle="Build a central inventory of official GSN promotions for active communities, while respecting recorded advertising exclusions."
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
              ["Expiry control", "Admin-selected"],
              ["Selected", String(selectedRows.length)],
              ["Media", mediaQueue.length > 0 ? `${mediaQueue.length} prepared` : "Not ready"],
              ['Group expiry', dateTimeLabel(campaignExpiryIso(expiryInput))],
              ['Timing', scheduleMode === 'timed' ? `Every ${scheduleIntervalMinutes || '?'} min` : 'Normal rotation'],
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
              {operations.current.content.advertiser_contact_phone ? (
                <div style={{ marginTop: 8, ...helper() }}>
                  <strong>Advertiser contact:</strong> {operations.current.content.advertiser_contact_phone}
                </div>
              ) : null}
              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 9 }}>
                {[
                  ["Placements", operations.current.delivery.placement_count],
                  ["Eligible now", operations.current.delivery.currently_eligible_destination_count],
                  ["Issued by GSN", operations.current.delivery.issued_presentation_count],
                  ["Seen", operations.current.delivery.qualified_presentation_count],
                  ["People who saw it", operations.current.delivery.unique_qualified_viewer_accounts],
                  ["Addressable accounts", operations.current.audience?.distinct_accounts ?? 0],
                  ["Repost-equivalent credits", operations.current.commercial_equivalence?.repost_equivalent_credits ?? 0],
                  ["Timing", operations.current.schedule?.timed ? `Every ${operations.current.schedule.interval_minutes} min` : 'Normal'],
                  ["Due / unfilled", operations.current.schedule?.timed
                    ? `${operations.current.schedule.due_slot_count ?? 0} / ${operations.current.schedule.unfilled_due_slot_count ?? 0}`
                    : 'Not applicable'],
                ].map(([label, value]) => (
                  <div key={label} style={institutionalInnerCard("#FFFFFF")}>
                    <div style={{ color: "#64778B", fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
                    <div style={{ marginTop: 6, color: "#0B1F33", fontSize: 18, fontWeight: 900 }}>{value}</div>
                  </div>
                ))}
              </div>

              {operations.current.schedule?.timed ? (
                <div style={{ marginTop: 12, ...softCard('#FFFDF6'), ...helper() }}>
                  <strong>Timed window:</strong>{' '}
                  {scheduledDateTimeLabel(
                    operations.current.schedule.starts_at || '',
                    operations.current.schedule.timezone_label || 'Device time'
                  )} to{' '}
                  {scheduledDateTimeLabel(
                    operations.current.schedule.ends_at || '',
                    operations.current.schedule.timezone_label || 'Device time'
                  )} · every{' '}
                  {operations.current.schedule.interval_minutes} minutes ·{' '}
                  {operations.current.schedule.timezone_label || 'Recorded time basis'}.
                  {' '}Unfilled due slots do not prove a fault: they mean no qualifying presentation filled that due opportunity. Peak-time surcharge policy remains undecided and no charge is made here.
                </div>
              ) : null}

              {renderCampaignDestinations(operations.current)}

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
              <div style={{ marginTop: 5, ...helper() }}>You can start building promotion inventory for the selected campaign period below.</div>
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
                    {item.content.advertiser_contact_phone ? (
                      <div style={{ marginTop: 6, ...helper(), fontSize: 13 }}>
                        <strong>Advertiser contact:</strong> {item.content.advertiser_contact_phone}
                      </div>
                    ) : null}
                    <div style={{ marginTop: 8, ...helper(), fontSize: 13 }}>
                      {item.delivery.placement_count} placements · {item.delivery.issued_presentation_count} issued · {item.delivery.qualified_presentation_count} seen · expires {dateTimeLabel(item.expires_at)}
                    </div>
                    {renderCampaignDestinations(item)}
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
                    {item.content.advertiser_contact_phone ? <div><strong>Advertiser contact:</strong> {item.content.advertiser_contact_phone}</div> : null}
                    <div><strong>Destinations:</strong> {item.delivery.placement_count}</div>
                    <div><strong>Expires:</strong> {dateTimeLabel(item.expires_at)}</div>
                    <div><strong>Issued by GSN:</strong> {item.delivery.issued_presentation_count}</div>
                    <div><strong>Seen:</strong> {item.delivery.qualified_presentation_count}</div>
                    <div><strong>People who saw it:</strong> {item.delivery.unique_qualified_viewer_accounts}</div>
                    <div><strong>Addressable active accounts:</strong> {item.audience?.distinct_accounts ?? 0}</div>
                    <div><strong>Connected right now:</strong> Not recorded</div>
                    <div><strong>Repost-equivalent quotation:</strong> £{item.commercial_equivalence?.quoted_amount_gbp ?? '0.00'} (no financial movement)</div>
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
              Check the shared official message, {review.media.length} uploaded media item{review.media.length === 1 ? "" : "s"}, eligible destinations, and exclusions. Each media item will become one promotion.
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
                  <div><strong>Advertiser contact:</strong> {review.contactPhone}</div>
                  <div><strong>Promotions:</strong> {review.media.length}</div>
                  <div><strong>Eligible now:</strong> {review.preview.eligible_count}</div>
                  <div><strong>Excluded now:</strong> {review.preview.excluded_count}</div>
                  <div><strong>Addressable active accounts:</strong> {review.preview.audience?.distinct_accounts ?? 0}</div>
                  <div><strong>Connected right now:</strong> Not recorded</div>
                  <div><strong>Repost-equivalent credits:</strong> {review.preview.commercial_equivalence?.repost_equivalent_credits ?? 0}</div>
                  <div><strong>Quotation:</strong> £{review.preview.commercial_equivalence?.quoted_amount_gbp ?? '0.00'} (no charge or credit movement)</div>
                  <div><strong>Group expiry:</strong> {dateTimeLabel(review.expiresAt)}</div>
                  <div><strong>Timing:</strong> {review.schedule
                    ? `Every ${review.schedule.intervalMinutes} minutes from ${scheduledDateTimeLabel(review.schedule.startsAt, review.schedule.timezoneLabel)} until ${scheduledDateTimeLabel(review.schedule.endsAt, review.schedule.timezoneLabel)} (${review.schedule.timezoneLabel})`
                    : 'Normal Spotlight rotation'}</div>
                  {review.schedule ? (
                    <div><strong>Timed opportunity boundary:</strong> One eligible network-wide presentation opportunity per interval; not guaranteed playback, reach, or sale.</div>
                  ) : null}
                  {review.schedule ? (
                    <div><strong>Peak-time surcharge:</strong> Policy undecided; not included and no charge occurs here.</div>
                  ) : null}
                  <div><strong>Duration:</strong> Until the reviewed expiry selected by the admin</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, ...softCard("#FFFFFF") }}>
              <div style={sectionLabel()}>Eligible destinations</div>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {review.preview.eligible_destinations.map((row) => (
                  <div key={row.clan_id} style={{ color: "#0B1F33", fontWeight: 850 }}>
                    {destinationTitle(row)}{row.community_code ? ` · ${row.community_code}` : ""} · {row.addressable_active_member_accounts ?? 0} active account{Number(row.addressable_active_member_accounts || 0) === 1 ? '' : 's'}
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

            <div style={{ marginTop: 12, ...softCard("#071A2D"), color: "#FFFFFF", display: "grid", gap: 9 }}>
              <div style={{ color: "#F4D77E", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>
                Media batch ({review.media.length})
              </div>
              {review.media.map((item, index) => (
                <details key={item.key} style={{ ...institutionalInnerCard("rgba(255,255,255,0.08)"), borderColor: "rgba(255,255,255,0.14)" }}>
                  <summary style={{ cursor: "pointer", color: "#FFFFFF", fontWeight: 850 }}>
                    {index + 1}. {item.fileName} · {item.mediaKind === "video" ? "Verified video" : "Prepared picture"}
                  </summary>
                  {item.mediaKind === "image" ? (
                    <img src={item.mediaUrl} alt={`Official GSN promotion ${index + 1}`} style={{ marginTop: 10, width: "100%", maxHeight: 390, objectFit: "cover", borderRadius: 16 }} />
                  ) : (
                    <video src={item.mediaUrl} controls playsInline style={{ marginTop: 10, width: "100%", maxHeight: 390, borderRadius: 16, background: "#000000" }} />
                  )}
                </details>
              ))}
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

            {!publication?.complete ? (
              <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                {publishingProgress ? <div role="status" style={statusPanel("info")}>{publishingProgress}</div> : null}
                <StableButton
                  kind="primary"
                  fullWidth
                  stableHeight={54}
                  busy={publishing}
                  busyLabel="Publishing safely"
                  onClick={handlePublish}
                  debugId="admin-gsn-campaign.publish"
                  aria-label="Publish GSN campaign batch"
                >
                  {publishedCount > 0 ? "Continue publishing batch" : `Publish ${review.media.length} GSN promotion${review.media.length === 1 ? "" : "s"}`}
                </StableButton>
                {publishedCount === 0 ? (
                  <StableButton
                    kind="danger"
                    onClick={() => {
                      invalidateReview();
                      setFeedback({
                        tone: "info",
                        text: "The unpublished review was discarded. GSN is removing every unreferenced uploaded media item.",
                      });
                    }}
                    debugId="admin-gsn-campaign.review-discard"
                  >
                    Discard unpublished review
                  </StableButton>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {publication ? (
          <section style={{ ...card("#ECFDF3"), order: 6 }}>
            <div style={sectionLabel()}>Publication result</div>
            <h2 style={{ margin: "8px 0 0", color: "#14532D", fontSize: 24 }}>
              {publication.complete
                ? `${publication.results.length} official GSN promotion${publication.results.length === 1 ? " is" : "s are"} live`
                : `${publication.results.length} of ${publication.total} promotions are live`}
            </h2>
            <p style={{ margin: "8px 0 0", color: "#166534", lineHeight: 1.65 }}>
              {publication.complete
                ? "The full reviewed batch has finished publishing."
                : "The completed promotions are preserved. Use Continue publishing batch to resume safely from the next item."}
            </p>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 9 }}>
              {[
                ["Promotions live", publication.results.length],
                ["Batch total", publication.total],
                [
                  "Community placements",
                  publication.results.reduce(
                    (total, item) =>
                      total +
                      Number(item.propagated_count || item.propagated_clan_ids?.length || 0),
                    0
                  ),
                ],
                [
                  "Excluded decisions",
                  publication.results.reduce(
                    (total, item) => total + Number(item.excluded_count || 0),
                    0
                  ),
                ],
              ].map(([label, value]) => (
                <div key={String(label)} style={institutionalInnerCard("#FFFFFF")}>
                  <div style={{ color: "#64778B", fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
                  <div style={{ marginTop: 6, color: "#0B1F33", fontSize: 18, fontWeight: 900 }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 13, ...softCard("#FFFFFF"), ...helper() }}>
              Publisher: <strong>Global Support Network (GSN-HOUSE)</strong><br />
              Member advertising credit used: <strong>No</strong><br />
              Community endorsement created: <strong>No</strong><br />
              Audit actor: <strong>Your signed-in platform-admin identity</strong>
            </div>
            {publication.complete ? (
              <div style={{ marginTop: 14 }}>
                <StableButton onClick={resetCampaign} debugId="admin-gsn-campaign.reset">
                  Prepare another batch
                </StableButton>
              </div>
            ) : null}
          </section>
        ) : null}

        <details style={{ ...card(), order: 7 }}>
          <summary style={{ cursor: "pointer", color: "#0B1F33", fontWeight: 900 }}>
            Governance and delivery boundary
          </summary>
          <div style={{ marginTop: 13, ...helper(), display: "grid", gap: 8 }}>
            <div>The campaign expires at the admin-selected future time. Twenty-four hours is the starting default, not a maximum.</div>
            <div>The expiry records the approved serving boundary. It does not by itself prove payment, payer authority, or settlement.</div>
            <div>Optional timed delivery changes only that campaign. Normal Spotlight rotation remains unchanged for ordinary campaigns.</div>
            <div>A timed interval is an eligible presentation opportunity, not guaranteed clock-time playback, audience-wide broadcast, reach, or sale.</div>
            <div>Only explicitly selected communities are considered.</div>
            <div>A destination opt-out or policy change stops later delivery because eligibility is rechecked by the backend.</div>
            <div>The supplied advertiser phone is a public contact route for this promotion. It does not create a shop, seller trust claim, member endorsement, or Community Domain endorsement.</div>
            <div>The normal member Spotlight quota and member advertising credit are not used.</div>
          </div>
        </details>
        {feedback ? <div role="status" style={{ ...statusPanel(feedback.tone), order: 2 }}>{feedback.text}</div> : null}

        <section style={{ ...card(), order: 3 }}>
          <div style={sectionLabel()}>1. Choose communities</div>
          <h2 style={{ margin: "8px 0 0", color: "#0B1F33", fontSize: 22 }}>
            Where should this official campaign appear?
          </h2>
          <p style={{ margin: "8px 0 0", ...helper() }}>
            Active free communities are available by default. A Community Domain is blocked only when its lifecycle, Spotlight policy, or recorded advertising exclusion prevents delivery. Blocked rows stay visible so the reason is clear.
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
              <div style={softCard()}>No matching communities were found.</div>
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
                    disabled={!row.eligible || draftBusy || publishedCount > 0}
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
            Use one short official message and add up to {MAX_GSN_HOUSE_BATCH_MEDIA} pictures or short videos. Each media item becomes one promotion. Preparation and review do not publish anything.
          </p>

          {operations?.active_count ? (
            <div style={{ marginTop: 13, ...statusPanel("info") }}>
              {operations.active_count} promotion{operations.active_count === 1 ? " is" : "s are"} already active. This new promotion will join that inventory; it will not replace them.
            </div>
          ) : null}

          <label style={{ display: "block", marginTop: 16 }}>
            <span style={{ ...sectionLabel(), display: "block", marginBottom: 7 }}>Advertiser contact phone</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={contactPhone}
              disabled={draftBusy || publishedCount > 0}
              onChange={(event) => {
                if (invalidateReview()) setContactPhone(event.target.value);
              }}
              maxLength={40}
              placeholder="Example: +2348012345678"
              style={fieldStyle()}
            />
          </label>
          <div style={{ marginTop: 6, color: "#60758A", fontSize: 12, lineHeight: 1.5 }}>
            This number will be public on every promotion in this batch so viewers can call the advertiser. Include + and the country code.
          </div>

          <label style={{ display: 'block', marginTop: 16 }}>
            <span style={{ ...sectionLabel(), display: 'block', marginBottom: 7 }}>Advert group expiry</span>
            <input
              type='datetime-local'
              value={expiryInput}
              min={dateTimeInputValue(new Date())}
              disabled={draftBusy || publishedCount > 0}
              onChange={(event) => {
                if (invalidateReview()) setExpiryInput(event.target.value);
              }}
              style={fieldStyle()}
            />
          </label>
          <div style={{ marginTop: 6, color: '#60758A', fontSize: 12, lineHeight: 1.5 }}>
            Every picture and video in this reviewed group receives this same expiry. The starting value is 24 hours, but you may choose any future date and time, including a multi-month campaign. The expiry does not itself confirm payment.
          </div>

          <div style={{ marginTop: 16, ...softCard('#F8FBFF'), display: 'grid', gap: 12 }}>
            <label>
              <span style={{ ...sectionLabel(), display: 'block', marginBottom: 7 }}>Delivery timing</span>
              <select
                value={scheduleMode}
                disabled={draftBusy || publishedCount > 0}
                onChange={(event) => {
                  if (!invalidateReview()) return;
                  const nextMode = event.target.value === 'timed' ? 'timed' : 'normal';
                  setScheduleMode(nextMode);
                  if (nextMode === 'timed') {
                    setScheduleStartInput(defaultScheduleStartInputValue(scheduleTimezone));
                    setScheduleEndInput(defaultScheduleEndInputValue(scheduleTimezone));
                  }
                }}
                style={fieldStyle()}
                data-gmfn-field='admin-gsn-campaign.schedule-mode'
              >
                <option value='normal'>Normal Spotlight rotation</option>
                <option value='timed'>Specific window and interval</option>
              </select>
            </label>

            {scheduleMode === 'timed' ? (
              <>
                <div style={{ ...statusPanel('info'), fontWeight: 700 }}>
                  Timed delivery creates one network-wide eligible presentation opportunity at each interval. It cannot guarantee clock-time playback, a particular viewer, reach, or a sale because an eligible member must have Spotlight open.
                </div>
                <label>
                  <span style={{ ...sectionLabel(), display: 'block', marginBottom: 7 }}>Time basis</span>
                  <select
                    value={scheduleTimezone}
                    disabled={draftBusy || publishedCount > 0}
                    onChange={(event) => {
                      if (!invalidateReview()) return;
                      const nextTimezone = event.target.value === 'device' ? 'device' : 'africa_lagos';
                      setScheduleTimezone(nextTimezone);
                      setScheduleStartInput(defaultScheduleStartInputValue(nextTimezone));
                      setScheduleEndInput(defaultScheduleEndInputValue(nextTimezone));
                    }}
                    style={fieldStyle()}
                    data-gmfn-field='admin-gsn-campaign.schedule-timezone'
                  >
                    <option value='africa_lagos'>Nigeria time (Africa/Lagos, UTC+1)</option>
                    <option value='device'>This device&apos;s local time</option>
                  </select>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <label>
                    <span style={{ ...sectionLabel(), display: 'block', marginBottom: 7 }}>Window starts</span>
                    <input
                      type='datetime-local'
                      value={scheduleStartInput}
                      disabled={draftBusy || publishedCount > 0}
                      onChange={(event) => {
                        if (invalidateReview()) setScheduleStartInput(event.target.value);
                      }}
                      style={fieldStyle()}
                      data-gmfn-field='admin-gsn-campaign.schedule-start'
                    />
                  </label>
                  <label>
                    <span style={{ ...sectionLabel(), display: 'block', marginBottom: 7 }}>Window ends</span>
                    <input
                      type='datetime-local'
                      value={scheduleEndInput}
                      disabled={draftBusy || publishedCount > 0}
                      onChange={(event) => {
                        if (invalidateReview()) setScheduleEndInput(event.target.value);
                      }}
                      style={fieldStyle()}
                      data-gmfn-field='admin-gsn-campaign.schedule-end'
                    />
                  </label>
                  <label>
                    <span style={{ ...sectionLabel(), display: 'block', marginBottom: 7 }}>Opportunity every</span>
                    <input
                      type='number'
                      min={GSN_HOUSE_MIN_SCHEDULE_INTERVAL_MINUTES}
                      max={1440}
                      step={1}
                      value={scheduleIntervalMinutes}
                      disabled={draftBusy || publishedCount > 0}
                      onChange={(event) => {
                        if (invalidateReview()) setScheduleIntervalMinutes(event.target.value);
                      }}
                      style={fieldStyle()}
                      data-gmfn-field='admin-gsn-campaign.schedule-interval'
                    />
                    <span style={{ display: 'block', marginTop: 6, color: '#60758A', fontSize: 12 }}>Minutes; minimum 5.</span>
                  </label>
                </div>
                <div style={{ ...helper(), fontSize: 13 }}>
                  Repost-equivalent opportunities are quoted now. The additional peak-time surcharge remains policy-undecided and is not charged by this board.
                </div>
              </>
            ) : (
              <div style={{ ...helper(), fontSize: 13 }}>
                Existing normal rotation remains unchanged. No timed window or interval is applied.
              </div>
            )}
          </div>

          <label style={{ display: "block", marginTop: 16 }}>
            <span style={{ ...sectionLabel(), display: "block", marginBottom: 7 }}>Official GSN message</span>
            <textarea
              value={message}
              disabled={draftBusy || publishedCount > 0}
              onChange={(event) => {
                if (invalidateReview()) setMessage(event.target.value);
              }}
              maxLength={2000}
              placeholder="Write the official service announcement or campaign message."
              style={fieldStyle(true)}
            />
          </label>
          <div style={{ marginTop: 6, color: "#60758A", fontSize: 12, lineHeight: 1.5 }}>
            A short sentence is enough. The 2,000-character allowance is only a maximum, not a target.
          </div>

          <label style={{ display: "block", marginTop: 14, ...softCard("#FFFFFF") }}>
            <span style={{ ...sectionLabel(), display: "block", marginBottom: 7 }}>Pictures and verified short videos</span>
            <input
              key={mediaInputKey}
              type="file"
              data-gmfn-action-root="true"
              data-cta-id="admin-gsn-campaign.media"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,.jpg,.jpeg,.png,.webp,.mp4,.mov,.webm,.m4v"
              multiple
              disabled={draftBusy || publishedCount > 0}
              onChange={(event) => void handleMediaPicked(Array.from(event.target.files || []))}
              style={{ width: "100%", color: "#0B1F33", font: "inherit" }}
            />
            <span style={{ display: "block", marginTop: 9, ...helper(), fontSize: 13 }}>
              Choose up to {MAX_GSN_HOUSE_BATCH_MEDIA} files. GSN prepares them one at a time. Keep this page open: before review, the queue exists only in this phone session. Review uploads each file to GSN storage without publishing it.
            </span>
          </label>

          {mediaProgress ? <div role="status" style={{ marginTop: 12, ...statusPanel("info") }}>{mediaProgress}</div> : null}

          {!review ? (
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              <div id="admin-gsn-campaign-review-readiness" role="status" style={statusPanel(reviewBlockers.length > 0 ? "info" : "success")}>
                {reviewBlockers.length > 0 ? (
                  <>
                    <div style={{ fontWeight: 900 }}>Still needed before publishing:</div>
                    <ul style={{ margin: "7px 0 0", paddingLeft: 20 }}>
                      {reviewBlockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                    </ul>
                  </>
                ) : (
                  stagedReviewCount > 0
                    ? `${stagedReviewCount} of ${mediaQueue.length} media items are already prepared on GSN. Continue the final check to resume without repeating them.`
                    : `Ready to open the final check for ${mediaQueue.length} promotion${mediaQueue.length === 1 ? "" : "s"}. Nothing publishes until you approve the review and tap Publish.`
                )}
              </div>
              <StableButton
                kind="primary"
                fullWidth
                stableHeight={54}
                busy={reviewing || preparingMedia}
                busyLabel={preparingMedia ? "Preparing media" : "Preparing final check"}
                onClick={handleReview}
                debugId="admin-gsn-campaign.review"
                aria-label="Open final campaign check"
                aria-describedby="admin-gsn-campaign-review-readiness"
              >
                {stagedReviewCount > 0
                  ? `Continue final check · ${stagedReviewCount} of ${mediaQueue.length} prepared`
                  : `Open final check${mediaQueue.length > 0 ? ` for ${mediaQueue.length} promotion${mediaQueue.length === 1 ? "" : "s"}` : ""}`}
              </StableButton>
            </div>
          ) : null}

          {mediaQueue.length > 0 && previewMedia && mediaPreviewUrl ? (
            <div style={{ marginTop: 14, ...softCard("#071A2D"), color: "#FFFFFF" }}>
              <div style={{ color: "#F4D77E", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>
                Prepared batch · showing {previewMediaIndex + 1} of {mediaQueue.length}
              </div>
              {previewMedia.kind === "image" ? (
                <img src={mediaPreviewUrl} alt={`Prepared GSN promotion ${previewMediaIndex + 1}`} style={{ marginTop: 10, width: "100%", maxHeight: 360, objectFit: "cover", borderRadius: 16 }} />
              ) : (
                <video src={mediaPreviewUrl} controls playsInline style={{ marginTop: 10, width: "100%", maxHeight: 360, borderRadius: 16, background: "#000000" }} />
              )}
              <div style={{ marginTop: 10, color: "#D7E3EF", fontSize: 13 }}>
                {previewMedia.file.name} · {previewMedia.kind === "video" ? "Verified short video" : "Prepared picture"}
              </div>
              {previewMedia.kind === "video" ? (
                <VideoSoundEditor
                  value={previewMedia.sound || null}
                  onChange={(sound) => updatePreparedMediaSound(previewMedia.key, sound)}
                  disabled={draftBusy || publishedCount > 0}
                  debugIdPrefix="admin-gsn-campaign.video-sound"
                />
              ) : null}
              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {mediaQueue.map((item, index) => (
                  <div key={item.key} style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", padding: "9px 10px", borderRadius: 12, background: "rgba(255,255,255,0.08)" }}>
                    <span style={{ minWidth: 0, color: "#FFFFFF", fontSize: 13, lineHeight: 1.45, overflowWrap: "anywhere" }}>
                      {index + 1}. {item.file.name} · {item.kind === "video" ? "Video" : "Picture"}
                    </span>
                    <div style={{ display: "flex", gap: 7, flex: "0 0 auto" }}>
                      <StableButton
                        disabled={draftBusy}
                        onClick={() => setMediaPreviewKey(item.key)}
                        debugId={`admin-gsn-campaign.media-preview-${index + 1}`}
                        stableHeight={36}
                        minWidth={76}
                        style={{ borderRadius: 999, border: "1px solid rgba(255,255,255,0.28)", background: item.key === previewMedia.key ? "rgba(244,215,126,0.24)" : "rgba(255,255,255,0.10)", color: "#FFFFFF", fontSize: 12 }}
                      >
                        {item.key === previewMedia.key ? "Showing" : "Preview"}
                      </StableButton>
                      <StableButton
                        disabled={draftBusy || publishedCount > 0}
                        onClick={() => removePreparedMedia(item.key)}
                        debugId={`admin-gsn-campaign.media-remove-${index + 1}`}
                        stableHeight={36}
                        minWidth={76}
                        style={{ borderRadius: 999, border: "1px solid rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.10)", color: "#FFFFFF", fontSize: 12 }}
                      >
                        Remove
                      </StableButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

        </section>
      </div>
    </main>
  );
}
