import React from "react";
import { StableButton } from "../../components/StableButton";
import { GsnLegacyIcon, type GsnIconName } from "../../components/GsnLegacyIcon";
import { marketplaceSectionStyle } from "../../lib/marketplaceActionStability";

type NoticePolicy = "members" | "admins";

type NoticeItem = {
  notice_id?: number | string | null;
  meeting_id?: number | string | null;
  body?: string | null;
  title?: string | null;
  purpose?: string | null;
  created_at?: string | null;
  scheduled_at?: string | null;
  expires_at?: string | null;
  expires_on?: string | null;
  sender_whatsapp_number?: string | null;
  sender_whatsapp_label?: string | null;
};

type MarketplaceListingReviewSubmission = {
  submission_event_id?: number | string | null;
  listing_type?: string | null;
  listing_payload?: Record<string, unknown> | null;
  summary?: string | null;
  created_at?: string | null;
  submitted_by_user_id?: number | string | null;
  submitted_by_role?: string | null;
  review_status?: string | null;
};
type DemandSignal = {
  request_id?: number | string | null;
  title?: string | null;
  category?: string | null;
  urgency?: string | null;
  area?: string | null;
  created_at?: string | null;
  requester_trust_score?: number | null;
  requester_trust_band?: string | null;
};

type Props = {
  isCompact: boolean;
  isOpen: boolean;
  activeCommunityId: number;
  activeCommunityName: string;
  canPostMarketplaceNotice: boolean;
  canManageMarketplaceNoticeSettings: boolean;
  activeNoticePostingPolicy: NoticePolicy;
  marketplaceNoticeSettingsSaving: boolean;
  marketplaceNoticesLoading: boolean;
  marketplaceNotices: NoticeItem[];
  marketplaceDemandSignalCount: number;
  marketplaceDemandSignals: DemandSignal[];
  marketplaceListingReviewLoading: boolean;
  marketplaceListingReviewSubmissions: MarketplaceListingReviewSubmission[];
  marketplaceListingReviewBusyId?: string | null;
  marketplaceSurfaceTouchProps: (debugId: string) => Record<string, unknown>;
  onPostAnnouncement: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onUpdateNoticePolicy: (
    event: React.MouseEvent<HTMLButtonElement>,
    policy: NoticePolicy
  ) => void | Promise<void>;
  onToggleBoard: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenNoticeSenderWhatsApp: (
    event: React.MouseEvent<HTMLButtonElement>,
    item: NoticeItem
  ) => void;
  onDecideMarketplaceListingReview: (
    event: React.MouseEvent<HTMLButtonElement>,
    submissionEventId: number | string | null | undefined,
    decision: "approve" | "reject"
  ) => void | Promise<void>;
};

type MarketplaceGlyphName = "notice";

const MARKETPLACE_GLYPH_ICON_MAP = {
  notice: "evidence",
} satisfies Record<MarketplaceGlyphName, GsnIconName>;

function MarketplaceGlyph({ name, size = 24 }: { name: MarketplaceGlyphName; size?: number }) {
  return (
    <GsnLegacyIcon
      name={MARKETPLACE_GLYPH_ICON_MAP[name]}
      size={Math.max(size, Math.round(size * 1.15))}
      decorative
      style={{ display: "inline-grid", flex: "0 0 auto" }}
    />
  );
}

function marketplaceSurface(bg: string): string {
  if (bg === "#FFFFFF") {
    return "linear-gradient(180deg, var(--gsn-white) 0%, var(--gsn-blue-50) 54%, var(--gsn-surface-blue) 100%)";
  }
  return bg;
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--gsn-border)",
    background: marketplaceSurface(bg),
    padding: 18,
    boxShadow: "var(--shadow-card)",
    backdropFilter: "blur(8px)",
    overflow: "hidden",
    overflowAnchor: "none",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#173750",
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#4A6178",
    fontSize: 14,
    lineHeight: 1.55,
  };
}

function badgeStyle(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 28,
    borderRadius: 999,
    padding: "6px 10px",
    border: primary
      ? "1px solid rgba(34,82,120,0.10)"
      : "1px solid rgba(16,37,59,0.08)",
    background: primary
      ? "linear-gradient(180deg, rgba(224,236,248,0.96) 0%, rgba(208,224,239,0.92) 100%)"
      : "linear-gradient(180deg, rgba(236,243,250,0.94) 0%, rgba(222,233,244,0.9) 100%)",
    color: primary ? "#1E4868" : "#42596F",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.72), 0 6px 14px rgba(10,24,49,0.05)",
  };
}

function badge(primary = false): React.CSSProperties {
  return badgeStyle(primary);
}

function stableStatusPillStyle(primary = false): React.CSSProperties {
  return {
    ...badgeStyle(primary),
    height: 34,
    minHeight: 34,
    maxHeight: 34,
    maxWidth: "100%",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  };
}

function marketplaceActionStyle(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  if (kind === "soft") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      height: 56,
      minHeight: 56,
      maxHeight: 56,
      padding: "0 14px",
      borderRadius: 13,
      border: disabled
        ? "1px solid rgba(66,87,106,0.40)"
        : "1px solid rgba(8,35,58,0.34)",
      background: disabled
        ? "linear-gradient(180deg, #E0EAF2 0%, #CBDCE8 52%, #B5C9DA 100%)"
        : "linear-gradient(180deg, #EFF6FB 0%, #D8E8F5 46%, #BFD7EA 100%)",
      color: disabled ? "#34495F" : "#08233A",
      fontWeight: 900,
      fontSize: 12,
      lineHeight: 1.15,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      boxShadow: disabled
        ? "0 9px 16px rgba(8,35,58,0.10), inset 0 1px 0 rgba(255,255,255,0.76), inset 0 -2px 0 rgba(8,35,58,0.12)"
        : "0 10px 18px rgba(8,35,58,0.10), inset 0 1px 0 rgba(255,255,255,0.84), inset 0 -2px 0 rgba(8,35,58,0.12)",
      touchAction: "manipulation",
      WebkitTapHighlightColor: "transparent",
      userSelect: "none",
      WebkitUserSelect: "none",
      boxSizing: "border-box",
      appearance: "none",
      WebkitAppearance: "none",
      pointerEvents: "auto",
      transform: "none",
      translate: "none",
      scale: "none",
      flexShrink: 0,
      overflowAnchor: "none",
      transition: "none",
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    minHeight: 56,
    maxHeight: 56,
    padding: "0 15px",
    borderRadius: 14,
    border: disabled
      ? "1px solid rgba(66,87,106,0.42)"
      : "1px solid rgba(6,24,39,0.42)",
    background: disabled
      ? "linear-gradient(180deg, #DDE8F1 0%, #C5D6E4 58%, #AFC3D3 100%)"
      : "linear-gradient(180deg, #0B2D4A 0%, #08233A 62%, #061827 100%)",
    color: disabled ? "#34495F" : "#FFFFFF",
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1.15,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    boxShadow: disabled
      ? "0 10px 18px rgba(8,35,58,0.12), inset 0 1px 0 rgba(255,255,255,0.70), inset 0 -2px 0 rgba(8,35,58,0.14)"
      : "0 13px 22px rgba(6,24,39,0.22), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -2px 0 rgba(0,0,0,0.18)",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    WebkitUserSelect: "none",
    boxSizing: "border-box",
    appearance: "none",
    WebkitAppearance: "none",
    pointerEvents: "auto",
    transform: "none",
    translate: "none",
    scale: "none",
    flexShrink: 0,
    overflowAnchor: "none",
    transition: "none",
  };
}

function marketplaceOsIconStyle(bg: string, isCompact = false): React.CSSProperties {
  return {
    width: isCompact ? 42 : 46,
    height: isCompact ? 42 : 46,
    borderRadius: isCompact ? 14 : 15,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,251,255,0.96) 100%)",
    border: "1px solid rgba(13,95,168,0.12)",
    color: "#0B2D4A",
    fontSize: isCompact ? 20 : 22,
    boxShadow:
      "0 10px 18px rgba(10,24,49,0.09), inset 4px 0 0 rgba(214,170,69,0.16), inset 0 1px 0 rgba(255,255,255,0.96)",
    outline: `1px solid ${
      bg.includes("#25A65A")
        ? "rgba(46,155,98,0.10)"
        : "rgba(214,170,69,0.08)"
    }`,
    outlineOffset: -2,
  };
}

function marketplaceDepartmentShellStyle(isCompact: boolean): React.CSSProperties {
  return {
    marginTop: isCompact ? 14 : 16,
    borderRadius: isCompact ? 18 : 22,
    border: "1px solid rgba(16,37,59,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,251,255,0.96) 100%)",
    padding: isCompact ? 12 : 14,
    boxShadow: "0 16px 34px rgba(10,24,49,0.08)",
    display: "grid",
    gap: isCompact ? 10 : 12,
    overflow: "hidden",
    overflowAnchor: "none",
  };
}

function marketplaceFrontTagStyle(
  color: string,
  background: string,
  isCompact = false
): React.CSSProperties {
  return {
    borderRadius: 999,
    background,
    color,
    padding: isCompact ? "4px 7px" : "6px 10px",
    fontSize: isCompact ? 10 : 12,
    fontWeight: 950,
    lineHeight: 1.15,
    whiteSpace: "nowrap",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
}

function safeStr(value: unknown): string {
  return String(value || "").trim();
}

function firstTruthy(...values: unknown[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function wordLimit(text: string, maxWords: number): string {
  const words = safeStr(text).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return safeStr(text);
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function safeDateLabel(value: unknown): string {
  const text = safeStr(value);
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function noticeExpiryLabel(item: NoticeItem): string {
  return firstTruthy(item.expires_at, item.expires_on)
    ? `Expires ${safeDateLabel(firstTruthy(item.expires_at, item.expires_on))}`
    : "";
}

function marketplaceDemandUrgencyLabel(value?: string | null): string {
  const normalized = safeStr(value).toLowerCase();
  if (normalized === "high" || normalized === "urgent") return "Urgent";
  if (normalized === "low") return "Low urgency";
  return "Normal";
}

function marketplaceDemandTrustLabel(signal?: DemandSignal | null): string {
  if (!signal) return "";
  const band = firstTruthy(signal.requester_trust_band);
  if (band) return `Trust ${band}`;
  const score = Number(signal.requester_trust_score || 0);
  return score > 0 ? `Trust ${score}` : "";
}

export default function MarketplaceBoardSection({
  isCompact,
  isOpen,
  activeCommunityId,
  activeCommunityName,
  canPostMarketplaceNotice,
  canManageMarketplaceNoticeSettings,
  activeNoticePostingPolicy,
  marketplaceNoticeSettingsSaving,
  marketplaceNoticesLoading,
  marketplaceNotices,
  marketplaceDemandSignalCount,
  marketplaceDemandSignals,
  marketplaceListingReviewLoading,
  marketplaceListingReviewSubmissions,
  marketplaceListingReviewBusyId,
  marketplaceSurfaceTouchProps,
  onPostAnnouncement,
  onUpdateNoticePolicy,
  onToggleBoard,
  onOpenNoticeSenderWhatsApp,
  onDecideMarketplaceListingReview,
}: Props) {
  return (
    <section
      id="marketplace-official-board"
      style={{
        ...pageCard("#FFFFFF"),
        ...marketplaceSectionStyle(),
        order: 4,
        padding: isCompact ? 14 : 18,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            minWidth: 0,
          }}
        >
          <span
            aria-hidden="true"
            style={marketplaceOsIconStyle(
              "linear-gradient(180deg, #244969 0%, #061827 100%)",
              true
            )}
          >
            <MarketplaceGlyph name="notice" size={26} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={sectionLabel()}>Official Board</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Official notices for this selected marketplace/community only.
              They are not broadcast to your other marketplaces, other
              communities, or public visitors.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={badge(Boolean(activeCommunityId))}>
            {activeCommunityName || "Select marketplace"}
          </span>
          {canPostMarketplaceNotice ? (
            <StableButton
              debugId="marketplace.board.post"
              type="button"
              onClick={onPostAnnouncement}
              style={marketplaceActionStyle("secondary")}
            >
              Post announcement
            </StableButton>
          ) : null}
          {canManageMarketplaceNoticeSettings ? (
            <>
              <StableButton
                debugId="marketplace.board.policy.members"
                type="button"
                onClick={(event) => onUpdateNoticePolicy(event, "members")}
                style={marketplaceActionStyle(
                  activeNoticePostingPolicy === "members" ? "secondary" : "soft",
                  marketplaceNoticeSettingsSaving
                )}
              >
                Open to members
              </StableButton>
              <StableButton
                debugId="marketplace.board.policy.admins"
                type="button"
                onClick={(event) => onUpdateNoticePolicy(event, "admins")}
                style={marketplaceActionStyle(
                  activeNoticePostingPolicy === "admins" ? "secondary" : "soft",
                  marketplaceNoticeSettingsSaving
                )}
              >
                Admin only
              </StableButton>
            </>
          ) : null}
          <StableButton
            debugId="marketplace.board.toggle"
            type="button"
            onClick={onToggleBoard}
            style={marketplaceActionStyle("soft")}
          >
            {isOpen ? "Collapse" : "Open"}
          </StableButton>
        </div>
      </div>

      {isOpen ? (
        <div
          {...marketplaceSurfaceTouchProps("marketplace.board.module")}
          style={{
            ...marketplaceDepartmentShellStyle(isCompact),
            marginTop: 14,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
              gap: 12,
              alignItems: "start",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={sectionLabel()}>Community notice board</div>
              <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                {activeNoticePostingPolicy === "members"
                  ? "Open board: active members can post short announcements. GSN links the sender's verified public WhatsApp contact when they have chosen to show one."
                  : "Admin-only board: only community officers can post new announcements."}
              </div>
            </div>
            <span style={stableStatusPillStyle(!marketplaceNoticesLoading)}>
              {marketplaceNoticesLoading
                ? "Loading"
                : `${marketplaceNotices.length} visible`}
            </span>
          </div>

          {canManageMarketplaceNoticeSettings ? (
            <div
              id="marketplace-listing-review-panel"
              style={{
                marginTop: 12,
                borderRadius: 14,
                border: "1px solid rgba(15,55,86,0.12)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(242,247,252,0.94) 100%)",
                padding: isCompact ? 12 : 14,
                display: "grid",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={sectionLabel()}>Listing review</div>
                  <div style={{ marginTop: 5, ...helperText(), fontSize: 13 }}>
                    Member shops and products waiting for community admin approval.
                  </div>
                </div>
                <span style={stableStatusPillStyle(Boolean(marketplaceListingReviewSubmissions.length))}>
                  {marketplaceListingReviewLoading
                    ? "Loading"
                    : `${marketplaceListingReviewSubmissions.length} pending`}
                </span>
              </div>

              {marketplaceListingReviewLoading ? (
                <div style={{ ...helperText(), fontSize: 13 }}>
                  Loading listing review requests.
                </div>
              ) : marketplaceListingReviewSubmissions.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {marketplaceListingReviewSubmissions.map((item) => {
                    const submissionId = item.submission_event_id;
                    const payload = item.listing_payload || {};
                    const title = firstTruthy(
                      item.summary,
                      payload.name,
                      item.listing_type,
                      "Marketplace listing"
                    );
                    const price = firstTruthy(payload.price, payload.currency);
                    const busyApprove =
                      marketplaceListingReviewBusyId === `${submissionId}:approve`;
                    const busyReject =
                      marketplaceListingReviewBusyId === `${submissionId}:reject`;
                    return (
                      <div
                        key={String(submissionId || title)}
                        style={{
                          borderRadius: 13,
                          border: "1px solid rgba(16,37,59,0.10)",
                          background: "#FFFFFF",
                          padding: 12,
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={badge(true)}>{firstTruthy(item.listing_type, "listing")}</span>
                          <span style={badge(false)}>{safeDateLabel(item.created_at) || "Pending"}</span>
                          {price ? <span style={badge(false)}>{price}</span> : null}
                        </div>
                        <div style={{ color: "#10253B", fontWeight: 900, lineHeight: 1.3 }}>
                          {title}
                        </div>
                        {firstTruthy(payload.description) ? (
                          <div style={{ ...helperText(), fontSize: 13 }}>
                            {wordLimit(firstTruthy(payload.description), 26)}
                          </div>
                        ) : null}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <StableButton
                            debugId="marketplace.board.listing-review.approve"
                            type="button"
                            onClick={(event) =>
                              onDecideMarketplaceListingReview(event, submissionId, "approve")
                            }
                            disabled={Boolean(marketplaceListingReviewBusyId)}
                            style={marketplaceActionStyle("secondary", Boolean(marketplaceListingReviewBusyId))}
                          >
                            {busyApprove ? "Approving" : "Approve"}
                          </StableButton>
                          <StableButton
                            debugId="marketplace.board.listing-review.reject"
                            type="button"
                            onClick={(event) =>
                              onDecideMarketplaceListingReview(event, submissionId, "reject")
                            }
                            disabled={Boolean(marketplaceListingReviewBusyId)}
                            style={marketplaceActionStyle("soft", Boolean(marketplaceListingReviewBusyId))}
                          >
                            {busyReject ? "Rejecting" : "Reject"}
                          </StableButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ ...helperText(), fontSize: 13 }}>
                  No member listing requests are waiting for review.
                </div>
              )}
            </div>
          ) : null}

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {marketplaceNoticesLoading ? (
              <div style={{ ...helperText(), fontSize: 13 }}>
                Loading official marketplace notices.
              </div>
            ) : marketplaceNotices.length ? (
              marketplaceNotices.map((item, index) => {
                const title = wordLimit(
                  firstTruthy(item.body, item.title, item.purpose),
                  50
                );
                const when = safeDateLabel(item.created_at || item.scheduled_at);
                const expiry = noticeExpiryLabel(item);
                const key = firstTruthy(
                  item.notice_id,
                  item.meeting_id,
                  item.created_at,
                  item.scheduled_at,
                  index
                );

                return (
                  <div
                    key={key}
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(23,55,80,0.12)",
                      background: "#FFFFFF",
                      padding: isCompact ? 12 : 14,
                      boxShadow: "0 10px 22px rgba(10,24,49,0.06)",
                    }}
                  >
                    <div
                      style={{
                        color: "#07172C",
                        fontSize: isCompact ? 14 : 15,
                        fontWeight: 950,
                        lineHeight: 1.3,
                        overflowWrap: "break-word",
                      }}
                    >
                      {title || "Official marketplace notice"}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={marketplaceFrontTagStyle("#173750", "#EEF3F7", isCompact)}>
                        Newest first
                      </span>
                      {when ? (
                        <span style={marketplaceFrontTagStyle("#617085", "#F3F6FA", isCompact)}>
                          {when}
                        </span>
                      ) : null}
                      {expiry ? (
                        <span style={marketplaceFrontTagStyle("#617085", "#F3F6FA", isCompact)}>
                          {expiry}
                        </span>
                      ) : null}
                      <span style={marketplaceFrontTagStyle("#27435F", "#F3F6FA", isCompact)}>
                        {item.sender_whatsapp_number
                          ? `WhatsApp: ${firstTruthy(item.sender_whatsapp_label, "sender")}`
                          : "No sender WhatsApp"}
                      </span>
                    </div>
                    {item.sender_whatsapp_number ? (
                      <div style={{ marginTop: 8 }}>
                        <StableButton
                          debugId={`marketplace.board.sender-whatsapp.${item.notice_id || index}`}
                          type="button"
                          onClick={(event) => onOpenNoticeSenderWhatsApp(event, item)}
                          style={marketplaceActionStyle("soft")}
                        >
                          Message sender
                        </StableButton>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(23,55,80,0.12)",
                  background: "#FFFFFF",
                  padding: isCompact ? 12 : 14,
                }}
              >
                <div
                  style={{
                    color: "#07172C",
                    fontSize: 14,
                    fontWeight: 950,
                    lineHeight: 1.3,
                  }}
                >
                  No official notices yet.
                </div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                  When members or community officers post for this marketplace,
                  members of this marketplace see it here.
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 14,
              borderTop: "1px solid rgba(23,55,80,0.1)",
              paddingTop: 12,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                gap: 10,
                alignItems: "start",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={sectionLabel()}>Demand Box signals</div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                  Open needs from this community only. These are read-only
                  pointers; responding, contact, terms, and closure stay inside
                  Demand Box.
                </div>
              </div>
              <span style={stableStatusPillStyle(Boolean(marketplaceDemandSignalCount))}>
                {marketplaceDemandSignalCount
                  ? `${marketplaceDemandSignalCount} open`
                  : "No open demand"}
              </span>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {marketplaceNoticesLoading ? (
                <div style={{ ...helperText(), fontSize: 13 }}>
                  Checking Demand Box signals.
                </div>
              ) : marketplaceDemandSignals.length ? (
                marketplaceDemandSignals.map((signal, index) => {
                  const title = wordLimit(
                    firstTruthy(signal.title, "Community demand request"),
                    18
                  );
                  const trustLabel = marketplaceDemandTrustLabel(signal);
                  const when = safeDateLabel(signal.created_at);
                  const key = firstTruthy(signal.request_id, signal.created_at, index);

                  return (
                    <div
                      key={key}
                      style={{
                        borderRadius: 16,
                        border: "1px solid rgba(215,162,45,0.22)",
                        background: "#FFFCF3",
                        padding: isCompact ? 12 : 14,
                      }}
                    >
                      <div
                        style={{
                          color: "#07172C",
                          fontSize: isCompact ? 14 : 15,
                          fontWeight: 950,
                          lineHeight: 1.3,
                          overflowWrap: "break-word",
                        }}
                      >
                        {title}
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={marketplaceFrontTagStyle("#805A0F", "#F7EED8", isCompact)}>
                          {marketplaceDemandUrgencyLabel(signal.urgency)}
                        </span>
                        {signal.category ? (
                          <span style={marketplaceFrontTagStyle("#27435F", "#F3F6FA", isCompact)}>
                            {safeStr(signal.category)}
                          </span>
                        ) : null}
                        {signal.area ? (
                          <span style={marketplaceFrontTagStyle("#27435F", "#F3F6FA", isCompact)}>
                            {safeStr(signal.area)}
                          </span>
                        ) : null}
                        {trustLabel ? (
                          <span style={marketplaceFrontTagStyle("#0B5A34", "#EAF7EF", isCompact)}>
                            {trustLabel}
                          </span>
                        ) : null}
                        {when ? (
                          <span style={marketplaceFrontTagStyle("#617085", "#F3F6FA", isCompact)}>
                            {when}
                          </span>
                        ) : null}
                        <span style={marketplaceFrontTagStyle("#173750", "#EEF3F7", isCompact)}>
                          Respond in Demand Box
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(23,55,80,0.12)",
                    background: "#FFFFFF",
                    padding: isCompact ? 12 : 14,
                  }}
                >
                  <div
                    style={{
                      color: "#07172C",
                      fontSize: 14,
                      fontWeight: 950,
                      lineHeight: 1.3,
                    }}
                  >
                    No open Demand Box signals.
                  </div>
                  <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                    When a member posts a need, the board can point to the
                    Demand Box without becoming another response screen.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
