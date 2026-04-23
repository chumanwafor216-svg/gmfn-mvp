import React, { useEffect, useMemo, useRef, useState } from "react";
import OriginLink from "./OriginLink";
import SpotlightMediaFrame from "./SpotlightMediaFrame";
import {
  getMarketplaceBroadcasts,
  getSelectedClanId,
} from "../lib/api";

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

function btn(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,99,209,0.12)",
    background: primary ? "#1D4ED8" : "#FDFEFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 1000,
    fontSize: 14,
    textDecoration: "none",
    cursor: "pointer",
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

const SPOTLIGHT_REFRESH_MS = 30000;
const SPOTLIGHT_ROTATION_MS = 30000;

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

export default function CommunityMarketplaceSpotlight() {
  const [feed, setFeed] = useState<MarketplaceFeedItem[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const feedRef = useRef<MarketplaceFeedItem[]>([]);
  const spotlightIndexRef = useRef(0);

  const selectedClanId = getSelectedClanId();

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
    }, SPOTLIGHT_REFRESH_MS);

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
        primaryTo: "/app/marketplace",
      };
    }

    const gmfnId = String(activeItem.feed?.author_gmfn_id || "").trim();
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
      primaryTo: gmfnId ? `/app/shop/${encodeURIComponent(gmfnId)}` : "/app/marketplace",
    };
  }, [activeItem]);

  useEffect(() => {
    if (spotlightItems.length <= 1) return;

    const timer = window.setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % spotlightItems.length);
    }, SPOTLIGHT_ROTATION_MS);

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
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void loadSpotlight()}
                style={btn(true)}
              >
                Retry spotlight
              </button>
              <OriginLink to="/app/community" style={btn(false)}>
                Open Community Home
              </OriginLink>
            </div>
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

                <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <OriginLink to={activeItemView.primaryTo} style={btn(true)}>
                    {activeItemView.primaryLabel}
                  </OriginLink>
                </div>
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

          <button
            onClick={loadSpotlight}
            style={btn(false)}
            type="button"
          >
            Refresh Spotlight
          </button>
        </div>
      </div>
    </div>
  );
}
