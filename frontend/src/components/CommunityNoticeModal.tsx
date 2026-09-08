import React, { useMemo, useState } from "react";
import { StableButton } from "./StableButton";

type Props = {
  open: boolean;
  communityName: string;
  busy?: boolean;
  postingPolicy?: "members" | "admins" | string;
  submitMode?: "post" | "review";
  onClose: () => void;
  onSubmit: (
    body: string,
    options?: { expiry_policy?: NoticeExpiryPolicy; expires_at?: string; public_qr_enabled?: boolean; availability_enabled?: boolean; full_body?: string | null }
  ) => Promise<void> | void;
};

type NoticeExpiryPolicy = "standard" | "urgent" | "event" | "pinned";

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export default function CommunityNoticeModal({
  open,
  communityName,
  busy = false,
  postingPolicy = "members",
  submitMode = "post",
  onClose,
  onSubmit,
}: Props) {
  const [body, setBody] = useState("");
  const [includeFullBody, setIncludeFullBody] = useState(false);
  const [fullBody, setFullBody] = useState("");
  const [expiryPolicy, setExpiryPolicy] = useState<NoticeExpiryPolicy>("standard");
  const [eventExpiresAt, setEventExpiresAt] = useState("");
  const [publicQrEnabled, setPublicQrEnabled] = useState(false);
  const [availabilityEnabled, setAvailabilityEnabled] = useState(false);
  const words = useMemo(() => countWords(body), [body]);
  const fullWords = useMemo(() => countWords(fullBody), [fullBody]);
  const eventExpiryMissing = expiryPolicy === "event" && !eventExpiresAt;
  const blocked = words > 50 || !body.trim() || (includeFullBody && fullWords > 600) || eventExpiryMissing || busy;
  const isReviewSubmission = submitMode === "review";

  if (!open) return null;

  async function submitNotice() {
    if (blocked) return;
    await onSubmit(body.trim(), {
      expiry_policy: expiryPolicy,
      expires_at:
        expiryPolicy === "event" && eventExpiresAt
          ? new Date(eventExpiresAt).toISOString()
          : undefined,
      public_qr_enabled: publicQrEnabled,
      availability_enabled: availabilityEnabled,
      full_body: includeFullBody ? fullBody.trim() || null : undefined,
    });
    setBody("");
    setExpiryPolicy("standard");
    setIncludeFullBody(false);
    setFullBody("");
    setEventExpiresAt("");
    setPublicQrEnabled(false);
    setAvailabilityEnabled(false);
  }

  return (
    <div
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-label={isReviewSubmission ? "Submit community record" : "Post community notice"}
    >
      <div style={modalStyle}>
        <div style={eyebrowStyle}>Community announcement</div>
        <h3 style={titleStyle}>
          {isReviewSubmission ? "Submit for review" : "Post to"} {communityName || "this community"}
        </h3>
        <p style={copyStyle}>
          {isReviewSubmission
            ? "Keep it short. GSN records your submission, then a community officer approves it before it appears on the active board."
            : "Keep it short. GSN records who posted it and links your verified public WhatsApp contact when you have chosen to show one. Expired notices leave the active board but stay in Community Memory."}
        </p>

        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={500}
          placeholder="Meeting Saturday 4 pm."
          style={textareaStyle}
        />

        <label style={checkboxRowStyle}>
          <input
            type="checkbox"
            checked={includeFullBody}
            onChange={(event) => setIncludeFullBody(event.target.checked)}
            disabled={busy}
          />
          <span>Add full notice details</span>
        </label>

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
            <label style={checkboxRowStyle}>
              <input
                type="checkbox"
                checked={availabilityEnabled}
                onChange={(event) => setAvailabilityEnabled(event.target.checked)}
                disabled={busy}
              />
              <span>Ask members if they are available</span>
            </label>
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
          <span style={chipStyle}>{availabilityEnabled ? "Availability poll" : "No attendance poll"}</span>
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
            busy={busy}
            busyLabel={isReviewSubmission ? "Submitting..." : "Posting..."}
            stableHeight={48}
            kind="primary"
          >
            {isReviewSubmission ? "Submit record" : "Post notice"}
          </StableButton>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 18,
  background: "rgba(7, 23, 44, 0.54)",
};

const modalStyle: React.CSSProperties = {
  width: "min(440px, 100%)",
  borderRadius: 18,
  border: "1px solid rgba(16,37,59,0.14)",
  background: "#FFFFFF",
  boxShadow: "0 24px 60px rgba(7,23,44,0.24)",
  padding: 18,
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
  minHeight: 118,
  resize: "vertical",
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
  marginTop: 16,
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
};
