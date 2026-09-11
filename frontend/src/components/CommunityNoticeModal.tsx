import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { StableButton } from "./StableButton";
import {
  uploadMarketplaceImageFile,
  uploadMarketplaceVideoFile,
} from "../lib/api";
import {
  SPOTLIGHT_MAX_IMAGE_BYTES,
  SPOTLIGHT_MAX_VIDEO_BYTES,
  SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
} from "../lib/spotlightPilot";
import {
  prepareSpotlightImageFile,
  prepareSpotlightVideoFile,
} from "../lib/spotlightMediaPrep";

type NoticeAttachmentKind = "link" | "video" | "poster" | "document";
type CommunityNoticeModalMode = "notice" | "market_need_pulse";

type Props = {
  open: boolean;
  communityName: string;
  busy?: boolean;
  postingPolicy?: "members" | "admins" | string;
  submitMode?: "post" | "review";
  mode?: CommunityNoticeModalMode;
  clanId?: number | null;
  onClose: () => void;
  onSubmit: (
    body: string,
    options?: {
      expiry_policy?: NoticeExpiryPolicy;
      expires_at?: string;
      public_qr_enabled?: boolean;
      availability_enabled?: boolean;
      full_body?: string | null;
      attachment_url?: string | null;
      attachment_label?: string | null;
      attachment_kind?: NoticeAttachmentKind | null;
      notice_mode?: CommunityNoticeModalMode;
    }
  ) => Promise<void> | void;
};

type NoticeExpiryPolicy = "standard" | "urgent" | "event" | "pinned";

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function isAllowedAttachmentUrl(value: string): boolean {
  const raw = value.trim();
  if (!raw) return true;
  if (/^\/uploads\/marketplace\/(?:images|videos)\/[^?#\s]+(?:[?#][^\s]*)?$/i.test(raw)) {
    return true;
  }
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function uploadResultUrl(data: any, mediaKind: "image" | "video"): string {
  const value = String(
    data?.[mediaKind === "image" ? "image_url" : "video_url"] ||
      data?.url ||
      data?.file_url ||
      data?.path ||
      data?.item?.[mediaKind === "image" ? "image_url" : "video_url"] ||
      data?.data?.[mediaKind === "image" ? "image_url" : "video_url"] ||
      ""
  ).trim();
  if (!value) {
    throw new Error(
      mediaKind === "image"
        ? "Image upload completed but did not return a usable link."
        : "Video upload completed but did not return a usable link."
    );
  }
  return value;
}

export default function CommunityNoticeModal({
  open,
  communityName,
  busy = false,
  postingPolicy = "members",
  submitMode = "post",
  mode = "notice",
  clanId = null,
  onClose,
  onSubmit,
}: Props) {
  const [body, setBody] = useState("");
  const [includeFullBody, setIncludeFullBody] = useState(false);
  const [fullBody, setFullBody] = useState("");
  const [expiryPolicy, setExpiryPolicy] = useState<NoticeExpiryPolicy>("standard");
  const [eventExpiresAt, setEventExpiresAt] = useState("");
  const [publicQrEnabled, setPublicQrEnabled] = useState(false);
  const isMarketNeedPulse = mode === "market_need_pulse";
  const [availabilityEnabled, setAvailabilityEnabled] = useState(isMarketNeedPulse);
  const [attachmentPanelOpen, setAttachmentPanelOpen] = useState(false);
  const [attachmentKind, setAttachmentKind] = useState<NoticeAttachmentKind>("link");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentLabel, setAttachmentLabel] = useState("");
  const [attachmentUploadMessage, setAttachmentUploadMessage] = useState("");
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const words = useMemo(() => countWords(body), [body]);
  const fullWords = useMemo(() => countWords(fullBody), [fullBody]);
  const attachmentUrlTrimmed = attachmentUrl.trim();
  const attachmentUrlInvalid = Boolean(attachmentUrlTrimmed) && !isAllowedAttachmentUrl(attachmentUrlTrimmed);
  const eventExpiryMissing = expiryPolicy === "event" && !eventExpiresAt;
  useEffect(() => {
    if (open && isMarketNeedPulse) {
      setAvailabilityEnabled(true);
    }
  }, [isMarketNeedPulse, open]);

  const blocked =
    words > 50 ||
    !body.trim() ||
    (includeFullBody && fullWords > 600) ||
    attachmentUrlInvalid ||
    attachmentUploading ||
    eventExpiryMissing ||
    busy;
  const isReviewSubmission = submitMode === "review";

  if (!open) return null;

  function clearAttachmentState(nextKind: NoticeAttachmentKind = "link") {
    setAttachmentKind(nextKind);
    setAttachmentUrl("");
    setAttachmentLabel("");
    setAttachmentUploadMessage("");
    setAttachmentError("");
  }

  async function pickAttachmentFile(file: File | null, mediaKind: "image" | "video") {
    setAttachmentError("");
    setAttachmentUploadMessage("");
    if (!file) return;
    setAttachmentUploading(true);
    try {
      if (mediaKind === "image") {
        const prepared = await prepareSpotlightImageFile(file, {
          maxBytes: SPOTLIGHT_MAX_IMAGE_BYTES,
        });
        const data = await uploadMarketplaceImageFile(prepared.file, clanId || null);
        const url = uploadResultUrl(data, "image");
        setAttachmentUrl(url);
        setAttachmentLabel((current) => current.trim() || "Open poster");
        setAttachmentUploadMessage(
          prepared.message || "Poster image attached. It will open from the notice."
        );
        return;
      }

      const prepared = await prepareSpotlightVideoFile(file, {
        maxBytes: SPOTLIGHT_MAX_VIDEO_BYTES,
        maxDurationSeconds: SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
      });
      const data = await uploadMarketplaceVideoFile(
        prepared.file,
        prepared.durationSeconds ?? null,
        clanId || null
      );
      const url = uploadResultUrl(data, "video");
      setAttachmentUrl(url);
      setAttachmentLabel((current) => current.trim() || "Open video");
      setAttachmentUploadMessage(
        prepared.message || "Video attached. It will open from the notice."
      );
    } catch (error: any) {
      setAttachmentError(
        String(error?.detail?.message || error?.detail || error?.message || error)
          .trim() || "This attachment could not be uploaded."
      );
    } finally {
      setAttachmentUploading(false);
    }
  }

  async function submitNotice() {
    if (blocked) return;
    await onSubmit(body.trim(), {
      expiry_policy: expiryPolicy,
      expires_at:
        expiryPolicy === "event" && eventExpiresAt
          ? new Date(eventExpiresAt).toISOString()
          : undefined,
      public_qr_enabled: publicQrEnabled,
      availability_enabled: isMarketNeedPulse || availabilityEnabled,
      notice_mode: isMarketNeedPulse ? "market_need_pulse" : "notice",
      full_body: includeFullBody ? fullBody.trim() || null : undefined,
      attachment_url: attachmentUrlTrimmed || undefined,
      attachment_label: attachmentUrlTrimmed ? attachmentLabel.trim() || undefined : undefined,
      attachment_kind: attachmentUrlTrimmed ? attachmentKind : undefined,
    });
    setBody("");
    setExpiryPolicy("standard");
    setIncludeFullBody(false);
    setFullBody("");
    setEventExpiresAt("");
    setPublicQrEnabled(false);
    setAvailabilityEnabled(false);
    setAttachmentPanelOpen(false);
    clearAttachmentState();
  }

  const dialog = (
    <div
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-label={isMarketNeedPulse ? "Ask community question" : isReviewSubmission ? "Submit community record" : "Post community notice"}
    >
      <div style={modalStyle}>
        <div style={eyebrowStyle}>{isMarketNeedPulse ? "Demand Box question" : "Community announcement"}</div>
        <h3 style={titleStyle}>
          {isMarketNeedPulse ? "Ask" : isReviewSubmission ? "Submit for review" : "Post to"} {communityName || "this community"}
        </h3>
        <p style={copyStyle}>
          {isMarketNeedPulse
            ? "Ask one simple market-need question from Demand Box. Members answer yes, maybe, or no. GSN records a demand signal, not a buyer list or sales proof."
            : isReviewSubmission
            ? "Keep it short. GSN records your submission, then a community officer approves it before it appears on the active board."
            : "Keep it short. GSN records who posted it and links your verified public WhatsApp contact when you have chosen to show one. Expired notices leave the active board but stay in Community Memory."}
        </p>

        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={500}
          placeholder={isMarketNeedPulse ? "Do you need this service this month?" : "Meeting Saturday 4 pm."}
          style={textareaStyle}
        />

        <StableButton
          type="button"
          debugId="community-notice-modal.attachment-toggle"
          onClick={() => setAttachmentPanelOpen((current) => !current)}
          disabled={busy}
          kind="secondary"
          stableHeight={44}
          fullWidth
          style={attachmentToggleStyle}
        >
          {attachmentPanelOpen ? "Close attachment" : "+ Add attachment"}
        </StableButton>

        {attachmentPanelOpen ? (
          <div style={attachmentPanelStyle}>
            <div style={fieldGroupStyle}>
              <label style={fieldLabelStyle} htmlFor="community-notice-attachment-kind">
                Attachment type
              </label>
              <select
                id="community-notice-attachment-kind"
                value={attachmentKind}
                onChange={(event) => clearAttachmentState(event.target.value as NoticeAttachmentKind)}
                style={fieldStyle}
              >
                <option value="link">Public link</option>
                <option value="video">Video from phone</option>
                <option value="poster">Poster image from phone</option>
                <option value="document">Document link</option>
              </select>
            </div>
            {attachmentKind === "video" || attachmentKind === "poster" ? (
              <div style={fieldGroupStyle}>
                <label
                  style={fieldLabelStyle}
                  htmlFor="community-notice-attachment-file"
                >
                  {attachmentKind === "video" ? "Choose video" : "Choose poster"}
                </label>
                <input
                  id="community-notice-attachment-file"
                  data-gmfn-action-root="true"
                  data-cta-id="community-notice-modal.attachment-file"
                  type="file"
                  accept={
                    attachmentKind === "video"
                      ? "video/*,.mp4,.webm,.mov"
                      : "image/*,.jpg,.jpeg,.png,.webp"
                  }
                  onChange={(event) =>
                    pickAttachmentFile(
                      event.currentTarget.files?.[0] || null,
                      attachmentKind === "video" ? "video" : "image"
                    )
                  }
                  disabled={busy || attachmentUploading}
                  style={fileFieldStyle}
                />
              </div>
            ) : null}
            <div style={fieldGroupStyle}>
              <label style={fieldLabelStyle} htmlFor="community-notice-attachment-url">
                {attachmentKind === "document"
                  ? "Public document link"
                  : attachmentKind === "link"
                  ? "Public attachment link"
                  : "Uploaded attachment link"}
              </label>
              <input
                id="community-notice-attachment-url"
                type={attachmentKind === "video" || attachmentKind === "poster" ? "text" : "url"}
                value={attachmentUrl}
                onChange={(event) => setAttachmentUrl(event.target.value)}
                maxLength={1000}
                placeholder={
                  attachmentKind === "video" || attachmentKind === "poster"
                    ? "Choose a file above"
                    : "https://..."
                }
                readOnly={attachmentKind === "video" || attachmentKind === "poster"}
                style={attachmentUrlInvalid ? invalidFieldStyle : fieldStyle}
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={fieldLabelStyle} htmlFor="community-notice-attachment-label">
                Button label
              </label>
              <input
                id="community-notice-attachment-label"
                type="text"
                value={attachmentLabel}
                onChange={(event) => setAttachmentLabel(event.target.value)}
                maxLength={80}
                placeholder="Open attachment"
                style={fieldStyle}
              />
            </div>
            {attachmentUploading ? (
              <p style={attachmentHelpStyle}>Uploading attachment...</p>
            ) : null}
            {attachmentUploadMessage ? (
              <p style={successTextStyle}>{attachmentUploadMessage}</p>
            ) : null}
            {attachmentError ? (
              <p style={errorTextStyle}>{attachmentError}</p>
            ) : attachmentUrlInvalid ? (
              <p style={errorTextStyle}>
                Use a public http/https link or choose a supported GSN media file.
              </p>
            ) : null}
            <p style={attachmentHelpStyle}>
              Video and poster choices open your phone gallery. Document attachments use a public document link for now.
            </p>
            <label style={checkboxRowStyle}>
              <input
                type="checkbox"
                checked={includeFullBody}
                onChange={(event) => setIncludeFullBody(event.target.checked)}
                disabled={busy}
              />
              <span>Attach longer text</span>
            </label>
          </div>
        ) : null}

        {includeFullBody ? (
          <textarea
            value={fullBody}
            onChange={(event) => setFullBody(event.target.value)}
            maxLength={4000}
            placeholder="Add the longer message here. The main board stays short; readers open the full notice or scan the QR for the complete detail."
            style={fullTextareaStyle}
          />
        ) : null}

        <div style={fieldGroupStyle}>
          <label style={fieldLabelStyle} htmlFor="community-notice-expiry">
            Active board time
          </label>
          <select
            id="community-notice-expiry"
            value={expiryPolicy}
            onChange={(event) => setExpiryPolicy(event.target.value as NoticeExpiryPolicy)}
            style={fieldStyle}
          >
            <option value="standard">Normal - 7 days</option>
            <option value="urgent">Urgent - 48 hours</option>
            <option value="event">Until event date</option>
            <option value="pinned">Pinned until admin changes it</option>
          </select>
        </div>

        {expiryPolicy === "event" ? (
          <div style={fieldGroupStyle}>
            <label style={fieldLabelStyle} htmlFor="community-notice-event-expiry">
              Event ends
            </label>
            <input
              id="community-notice-event-expiry"
              type="datetime-local"
              value={eventExpiresAt}
              onChange={(event) => setEventExpiresAt(event.target.value)}
              style={fieldStyle}
            />
          </div>
        ) : null}

        {!isReviewSubmission ? (
          <>
            {isMarketNeedPulse ? (
              <div style={checkboxRowStyle}>
                <span>Collect yes, maybe, or no responses</span>
              </div>
            ) : (
              <label style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  checked={availabilityEnabled}
                  onChange={(event) => setAvailabilityEnabled(event.target.checked)}
                  disabled={busy}
                />
                <span>Ask members if they are available</span>
              </label>
            )}
            <label style={checkboxRowStyle}>
              <input
                type="checkbox"
                checked={publicQrEnabled}
                onChange={(event) => setPublicQrEnabled(event.target.checked)}
                disabled={busy}
              />
              <span>Create public QR for this message</span>
            </label>
          </>
        ) : null}

        <div style={metaRowStyle}>
          <span style={words > 50 ? warningStyle : chipStyle}>{words}/50 words</span>
          <span style={chipStyle}>
            {isReviewSubmission
              ? "Admin review required"
              : postingPolicy === "admins"
              ? "Admin-only board"
              : "Members can post"}
          </span>
          <span style={eventExpiryMissing ? warningStyle : chipStyle}>
            {expiryPolicy === "standard"
              ? "Visible 7 days"
              : expiryPolicy === "urgent"
              ? "Visible 48 hours"
              : expiryPolicy === "event"
              ? "Until event date"
              : "Pinned"}
          </span>
          {includeFullBody ? (
            <span style={fullWords > 600 ? warningStyle : chipStyle}>{fullWords}/600 full words</span>
          ) : null}
          <span style={chipStyle}>No comments</span>
          <span style={chipStyle}>{isMarketNeedPulse ? "Need pulse" : availabilityEnabled ? "Availability poll" : "No attendance poll"}</span>
          {attachmentUrlTrimmed ? <span style={chipStyle}>Attachment ready</span> : null}
        </div>

        <div style={actionsStyle}>
          <StableButton
            type="button"
            debugId="community-notice-modal.cancel"
            onClick={onClose}
            disabled={busy}
            stableHeight={48}
          >
            Cancel
          </StableButton>
          <StableButton
            type="button"
            debugId="community-notice-modal.post"
            onClick={submitNotice}
            disabled={blocked}
            busy={busy || attachmentUploading}
            busyLabel={attachmentUploading ? "Uploading..." : isReviewSubmission ? "Submitting..." : "Posting..."}
            stableHeight={48}
            kind="primary"
          >
            {isMarketNeedPulse ? "Ask Community" : isReviewSubmission ? "Submit record" : "Post notice"}
          </StableButton>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(dialog, document.body) : dialog;
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 5600,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "max(14px, env(safe-area-inset-top)) 14px max(22px, env(safe-area-inset-bottom))",
  overflowY: "auto",
  overscrollBehavior: "contain",
  background: "rgba(7, 23, 44, 0.54)",
};

const modalStyle: React.CSSProperties = {
  width: "min(440px, 100%)",
  borderRadius: 18,
  border: "1px solid rgba(16,37,59,0.14)",
  background: "#FFFFFF",
  boxShadow: "0 24px 60px rgba(7,23,44,0.24)",
  padding: 16,
  maxHeight: "calc(100dvh - 36px)",
  paddingBottom: 0,
  overflowY: "auto",
  overscrollBehavior: "contain",
  WebkitOverflowScrolling: "touch",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#48657D",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
};

const titleStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#07172C",
  fontSize: 21,
  lineHeight: 1.18,
};

const copyStyle: React.CSSProperties = {
  margin: "8px 0 12px",
  color: "#617085",
  fontSize: 13,
  lineHeight: 1.45,
  fontWeight: 750,
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 96,
  resize: "none",
  borderRadius: 14,
  border: "1px solid rgba(16,37,59,0.16)",
  padding: 12,
  color: "#07172C",
  fontSize: 15,
  fontWeight: 750,
  lineHeight: 1.45,
  outline: "none",
  boxSizing: "border-box",
};

const fullTextareaStyle: React.CSSProperties = {
  ...textareaStyle,
  marginTop: 8,
  minHeight: 154,
  background: "#F8FBFF",
};

const attachmentToggleStyle: React.CSSProperties = {
  marginTop: 10,
  justifyContent: "center",
};

const attachmentPanelStyle: React.CSSProperties = {
  marginTop: 10,
  borderRadius: 16,
  border: "1px solid rgba(16,37,59,0.12)",
  background: "#F8FBFF",
  padding: 12,
  display: "grid",
  gap: 8,
};

const fieldGroupStyle: React.CSSProperties = {
  marginTop: 10,
  display: "grid",
  gap: 6,
};

const fieldLabelStyle: React.CSSProperties = {
  color: "#48657D",
  fontSize: 12,
  fontWeight: 900,
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 46,
  borderRadius: 14,
  border: "1px solid rgba(16,37,59,0.16)",
  background: "#FFFFFF",
  color: "#07172C",
  padding: "0 12px",
  fontSize: 16,
  fontWeight: 800,
  boxSizing: "border-box",
  outline: "none",
};

const invalidFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  borderColor: "#FCA5A5",
  background: "#FFFAFA",
};

const fileFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  padding: "10px 12px",
  height: "auto",
  lineHeight: 1.25,
};

const attachmentHelpStyle: React.CSSProperties = {
  margin: 0,
  color: "#617085",
  fontSize: 12,
  lineHeight: 1.4,
  fontWeight: 750,
};

const successTextStyle: React.CSSProperties = {
  ...attachmentHelpStyle,
  color: "#155A32",
};

const errorTextStyle: React.CSSProperties = {
  ...attachmentHelpStyle,
  color: "#7F1D1D",
};

const checkboxRowStyle: React.CSSProperties = {
  marginTop: 10,
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#48657D",
  fontSize: 13,
  fontWeight: 850,
};
const metaRowStyle: React.CSSProperties = {
  marginTop: 10,
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const chipStyle: React.CSSProperties = {
  borderRadius: 999,
  border: "1px solid rgba(16,37,59,0.10)",
  background: "#F8FBFF",
  color: "#48657D",
  padding: "5px 8px",
  fontSize: 12,
  fontWeight: 900,
};

const warningStyle: React.CSSProperties = {
  ...chipStyle,
  color: "#7F1D1D",
  background: "#FFFAFA",
  borderColor: "#FECACA",
};

const actionsStyle: React.CSSProperties = {
  position: "sticky",
  bottom: 0,
  zIndex: 2,
  margin: "14px -16px 0",
  padding: "10px 16px max(14px, env(safe-area-inset-bottom))",
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
  background: "linear-gradient(180deg, rgba(255,255,255,0.82), #FFFFFF 24%)",
  borderTop: "1px solid rgba(16,37,59,0.08)",
};
