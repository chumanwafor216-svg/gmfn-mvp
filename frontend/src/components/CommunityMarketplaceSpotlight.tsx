import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CardActionRow,
  PrimaryButton,
  SecondaryButton,
  StableCtaLink,
} from "./StableButton";
import SpotlightMediaFrame from "./SpotlightMediaFrame";
import {
  getMarketplaceBroadcasts,
  getSelectedClanId,
} from "../lib/api";
import { resolveCtaTarget, type CtaTarget } from "../lib/ctaTargets";
import {
  SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
  SPOTLIGHT_PILOT_REFRESH_MS,
  SPOTLIGHT_PILOT_ROTATION_MS,
} from "../lib/spotlightPilot";
import { publicShopPath } from "../lib/publicLinks";

type MarketplaceFeedItem = {
  id?: number;
  message?: string;
  created_at?: string;
  expires_at?: string | null;
  author_user_id?: number;
  image_url?: string | null;
  video_url?: string | null;
  source_shop_name?: string | null;
  source_clan_name?: string | null;
  source_clan_id?: number | string | null;
  source_marketplace_id?: number | string | null;
  clan_id?: number | string | null;
  marketplace_id?: number | string | null;
  trust_band?: string | null;
  trust_score?: string | number | null;
  author_name?: string | null;
  author_gmfn_id?: string | null;
};

function card(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function tinyText(): React.CSSProperties {
  return {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 1.5,
  };
}

function formatWhen(value?: string | null): string {
  if (!value) return "Unknown time";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function positiveNumber(value: unknown): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function apiOrigin(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env?.VITE_API_BASE_URL) ||
    "/api";
  const base = String(raw || "").trim().replace(/\/+$/, "");

  if (/^https?:\/\//i.test(base)) {
    try {
      return new URL(base).origin;
    } catch {
      return typeof window !== "undefined" ? window.location.origin : "";
    }
  }

  return typeof window !== "undefined" ? window.location.origin : "";
}

function resolveSpotlightAssetUrl(value?: string | null): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("blob:") ||
    raw.startsWith("data:")
  ) {
    return raw;
  }

  const origin = apiOrigin();
  if (!origin) return raw;
  return `${origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

type SpotlightItem =
  {
    type: "broadcast";
    key: string;
    feed: MarketplaceFeedItem;
  };

function spotlightFeedKey(item: MarketplaceFeedItem | null): string {
  if (!item) return "";

  const rawId = Number(item.id || 0);
  if (Number.isFinite(rawId) && rawId > 0) return `broadcast-${rawId}`;

  return [
    String(item.author_gmfn_id || "").trim(),
    String(item.created_at || "").trim(),
    String(item.message || "").trim(),
    String(item.source_shop_name || "").trim(),
  ]
    .filter(Boolean)
    .join("|");
}

function spotlightFeedSortValue(item: MarketplaceFeedItem | null): number {
  if (!item?.created_at) return 0;
  const timestamp = new Date(item.created_at).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function ctaPath(target: CtaTarget): string {
  return typeof target.to === "string" ? target.to : String(target.to);
}

export default function CommunityMarketplaceSpotlight() {
  const [feed, setFeed] = useState<MarketplaceFeedItem[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const feedRef = useRef<MarketplaceFeedItem[]>([]);
  const spotlightIndexRef = useRef(0);

  const selectedClanId = positiveNumber(getSelectedClanId());
  const communityHomeCta = useMemo(
    () =>
      resolveCtaTarget("communityHome", {
        communityId: selectedClanId,
        debugId: "community-marketplace-spotlight.community-home",
      }),
    [selectedClanId]
  );

  async function loadSpotlight() {
    setErr("");
    setLoading(true);

    try {
      const clanId = getSelectedClanId() || undefined;

      const scopedFeedRes = await getMarketplaceBroadcasts({
        clan_id: clanId,
        active_only: true,
        limit: 10,
      }).catch(() => ({ items: [] }));

      const scopedFeed = Array.isArray(scopedFeedRes?.items) ? scopedFeedRes.items : [];

      let nextFeed = [...scopedFeed].sort((a, b) => {
        const timeDelta = spotlightFeedSortValue(b) - spotlightFeedSortValue(a);
        if (timeDelta !== 0) return timeDelta;
        return spotlightFeedKey(a).localeCompare(spotlightFeedKey(b));
      });

      if (clanId && scopedFeed.length === 0) {
        const fallbackFeedRes = await getMarketplaceBroadcasts({
          clan_id: null,
          active_only: true,
          limit: 10,
        }).catch(() => ({ items: [] }));

        const fallbackFeed = Array.isArray(fallbackFeedRes?.items)
          ? fallbackFeedRes.items
          : [];

        nextFeed = [...(fallbackFeed.length > 0 ? fallbackFeed : scopedFeed)].sort((a, b) => {
          const timeDelta = spotlightFeedSortValue(b) - spotlightFeedSortValue(a);
          if (timeDelta !== 0) return timeDelta;
          return spotlightFeedKey(a).localeCompare(spotlightFeedKey(b));
        });
      }

      const currentItem =
        feedRef.current[spotlightIndexRef.current] || feedRef.current[0] || null;
      const currentKey = spotlightFeedKey(currentItem);
      const matchedIndex = currentKey
        ? nextFeed.findIndex(
            (item: MarketplaceFeedItem) => spotlightFeedKey(item) === currentKey
          )
        : -1;

      setFeed(nextFeed);
      setSpotlightIndex(
        nextFeed.length <= 0
          ? 0
          : matchedIndex >= 0
          ? matchedIndex
          : 0
      );
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to load marketplace spotlight."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSpotlightIndex(0);
  }, [selectedClanId]);

  useEffect(() => {
    feedRef.current = feed;
  }, [feed]);

  useEffect(() => {
    spotlightIndexRef.current = spotlightIndex;
  }, [spotlightIndex]);

  useEffect(() => {
    void loadSpotlight();

    const timer = window.setInterval(() => {
      void loadSpotlight();
    }, SPOTLIGHT_PILOT_REFRESH_MS);

    function handleFocusRefresh() {
      void loadSpotlight();
    }

    function handleVisibilityRefresh() {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void loadSpotlight();
      }
    }

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [selectedClanId]);

  const spotlightItems = useMemo<SpotlightItem[]>(() => {
    const broadcastItems: SpotlightItem[] = feed.slice(0, 10).map((f, i) => ({
      type: "broadcast",
      key: `broadcast-${f.id ?? i}`,
      feed: f,
    }));

    return broadcastItems.slice(0, 10);
  }, [feed]);

  const activeItem = useMemo(() => {
    if (spotlightItems.length === 0) return null;
    return spotlightItems[spotlightIndex % spotlightItems.length] || spotlightItems[0];
  }, [spotlightItems, spotlightIndex]);
  const isRefreshing = loading && !!activeItem;

  useEffect(() => {
    if (spotlightItems.length <= 0 && spotlightIndex !== 0) {
      setSpotlightIndex(0);
      return;
    }

    if (spotlightItems.length > 0 && spotlightIndex >= spotlightItems.length) {
      setSpotlightIndex(0);
    }
  }, [spotlightItems.length, spotlightIndex]);

  const activeItemView = useMemo(() => {
    if (!activeItem) {
      const marketplaceCta = resolveCtaTarget("marketplace", {
        communityId: selectedClanId,
        debugId: "community-marketplace-spotlight.empty-marketplace",
      });

      return {
        kind: "empty" as const,
        title: "",
        detail: "",
        heroImageSrc: "",
        heroVideoSrc: "",
        heroAlt: "Marketplace spotlight",
        kindLabel: "Marketplace Spotlight",
        showVisualPriority: false,
        priceLine: "",
        metaLines: [] as string[],
        primaryLabel: "Open Marketplace",
        primaryCta: marketplaceCta,
      };
    }

    const gmfnId = String(activeItem.feed?.author_gmfn_id || "").trim();
    const sourceClanId = positiveNumber(
      activeItem.feed?.source_clan_id ||
        activeItem.feed?.clan_id ||
        activeItem.feed?.source_marketplace_id ||
        activeItem.feed?.marketplace_id
    );
    const primaryCta = gmfnId
      ? resolveCtaTarget("shop", {
          explicitTo: publicShopPath(gmfnId),
          communityId: sourceClanId || selectedClanId,
          debugId: "community-marketplace-spotlight.seller-shop",
        })
      : resolveCtaTarget("marketplace", {
          communityId: sourceClanId || selectedClanId,
          debugId: "community-marketplace-spotlight.broadcast-marketplace",
        });

    return {
      kind: "broadcast" as const,
      title: activeItem.feed?.source_shop_name || "Community Spotlight",
      detail: activeItem.feed?.message || "No spotlight message.",
      heroImageSrc: resolveSpotlightAssetUrl(activeItem.feed?.image_url || ""),
      heroVideoSrc: resolveSpotlightAssetUrl(activeItem.feed?.video_url || ""),
      heroAlt: activeItem.feed?.source_shop_name || "Marketplace spotlight",
      kindLabel: activeItem.feed?.video_url ? "Community Video Spotlight" : "Community Spotlight",
      showVisualPriority: false,
      priceLine: "",
      metaLines: [
        `Community: ${activeItem.feed?.source_clan_name || "Current community"}`,
        `Trust: ${activeItem.feed?.trust_band || "Trusted visibility"}`,
        `Posted: ${formatWhen(activeItem.feed?.created_at)}`,
      ],
      primaryLabel: gmfnId ? "Open seller shop" : "Open Marketplace",
      primaryCta,
    };
  }, [activeItem, selectedClanId]);

  useEffect(() => {
    if (spotlightItems.length <= 1) return;

    const timer = window.setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % spotlightItems.length);
    }, SPOTLIGHT_PILOT_ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [spotlightItems.length]);

  const broadcastCount = feed.length;

  return (
    <div style={{ marginTop: 18 }}>
      <div style={card()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
              Community Marketplace Spotlight
            </div>
            <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
              This spotlight follows the community source directly, so the live item here
              comes from the approved community broadcast flow.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div
              style={{
                borderRadius: 999,
                background: "#F8FAFC",
                color: "#475569",
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 1000,
              }}
            >
              Community spotlights: {broadcastCount}
            </div>
          </div>
        </div>

        {err ? (
          <div
            style={{
              marginTop: 14,
              borderRadius: 14,
              border: "1px solid #FECACA",
              background: "#FEF2F2",
              color: "#991B1B",
              padding: 12,
              fontWeight: 900,
            }}
          >
            <div>Marketplace spotlight could not refresh from live data.</div>
            <div style={{ marginTop: 8, fontWeight: 700, lineHeight: 1.7 }}>
              {err}
            </div>
            <CardActionRow style={{ marginTop: 10 }}>
              <PrimaryButton
                type="button"
                onClick={() => void loadSpotlight()}
                disabled={loading}
                busy={loading}
                busyLabel="Retrying..."
                debugId="community-marketplace-spotlight.retry"
              >
                Retry spotlight
              </PrimaryButton>
              <StableCtaLink
                to={ctaPath(communityHomeCta)}
                kind="secondary"
                debugId={communityHomeCta.debugId}
              >
                Open Community Home
              </StableCtaLink>
            </CardActionRow>
          </div>
        ) : null}

        <div
          style={{
            marginTop: 14,
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(29,78,216,0.10)",
            background: "linear-gradient(180deg, #FFFFFF 0%, #F7FBFF 100%)",
            boxShadow: "0 14px 30px rgba(29,78,216,0.05)",
          }}
        >
          <div
            style={{
              minHeight: 300,
              background:
                activeItemView.heroImageSrc || activeItemView.heroVideoSrc
                  ? "#E2E8F0"
                  : "linear-gradient(135deg,#EAF2FF,#F0F7FF)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {activeItemView.heroImageSrc || activeItemView.heroVideoSrc ? (
              <SpotlightMediaFrame
                imageUrl={activeItemView.heroImageSrc}
                videoUrl={activeItemView.heroVideoSrc}
                videoPoster={activeItemView.heroImageSrc}
                alt={activeItemView.heroAlt}
                frameStyle={{
                  minHeight: 300,
                  height: 300,
                  borderRadius: 0,
                }}
                mediaStyle={{
                  width: "100%",
                  height: "100%",
                }}
                showVideoControls={false}
                autoPlayVideo={Boolean(activeItemView.heroVideoSrc)}
                mutedVideo={Boolean(activeItemView.heroVideoSrc)}
                loopVideo={Boolean(activeItemView.heroVideoSrc)}
                showAudioUnlock={Boolean(activeItemView.heroVideoSrc)}
                audioUnlockLabel="Sound on"
                maxVideoSeconds={SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 300,
                  color: "#1D4ED8",
                  fontWeight: 1000,
                  fontSize: 22,
                }}
              >
                Marketplace Spotlight
              </div>
            )}

            <div
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                background: "rgba(255,255,255,0.92)",
                color: "#163B63",
                border: "1px solid rgba(29,78,216,0.12)",
                borderRadius: 999,
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 1000,
              }}
            >
              {activeItemView.kindLabel}
            </div>

            {activeItemView.showVisualPriority ? (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  background: "rgba(29,78,216,0.92)",
                  color: "#FFFFFF",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 1000,
                }}
              >
                Visual Priority
              </div>
            ) : null}
          </div>

          <div style={{ padding: 16 }}>
            {loading && !activeItem ? (
              <div style={{ color: "#6B7A88", lineHeight: 1.7 }}>
                Reloading the current community spotlight from live marketplace data.
              </div>
            ) : !activeItem ? (
              <div style={{ color: "#6B7A88", lineHeight: 1.7 }}>
                No active spotlight is live for this community right now. If one should be visible,
                refresh here or open the community/shop spotlight controls to verify the source state.
              </div>
            ) : (
              <>
                {isRefreshing ? (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: 28,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "rgba(29,78,216,0.08)",
                      color: "#1D4ED8",
                      fontSize: 12,
                      fontWeight: 1000,
                    }}
                  >
                    Refreshing live spotlight
                  </div>
                ) : null}

                <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>
                  {activeItemView.title}
                </div>

                <div style={{ marginTop: 8, color: "#64748B", lineHeight: 1.7 }}>
                  {activeItemView.detail}
                </div>

                {activeItemView.metaLines.map((line, index) => (
                  <div
                    key={`broadcast-spotlight-meta-${index}`}
                    style={{ marginTop: index === 0 ? 10 : 4, ...tinyText() }}
                  >
                    {line}
                  </div>
                ))}

                <CardActionRow style={{ marginTop: 14 }}>
                  <StableCtaLink
                    to={ctaPath(activeItemView.primaryCta)}
                    kind="primary"
                    debugId={activeItemView.primaryCta.debugId}
                  >
                    {activeItemView.primaryLabel}
                  </StableCtaLink>
                </CardActionRow>
              </>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={tinyText()}>
            Community ID: {selectedClanId || "No active community selected"}
          </div>

          <SecondaryButton
            onClick={() => void loadSpotlight()}
            disabled={loading}
            busy={loading}
            busyLabel="Refreshing..."
            debugId="community-marketplace-spotlight.refresh"
            type="button"
          >
            Refresh Spotlight
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}
