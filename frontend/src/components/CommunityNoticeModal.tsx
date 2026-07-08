import React, { useMemo, useState } from "react";
import { StableButton } from "./StableButton";

type Props = {
  open: boolean;
  communityName: string;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (body: string) => Promise<void> | void;
};

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export default function CommunityNoticeModal({
  open,
  communityName,
  busy = false,
  onClose,
  onSubmit,
}: Props) {
  const [body, setBody] = useState("");
  const words = useMemo(() => countWords(body), [body]);
  const blocked = words > 50 || !body.trim() || busy;

  if (!open) return null;

  async function submitNotice() {
    if (blocked) return;
    await onSubmit(body.trim());
    setBody("");
  }

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Post community notice">
      <div style={modalStyle}>
        <div style={eyebrowStyle}>Official notice</div>
        <h3 style={titleStyle}>Post to {communityName || "this community"}</h3>
        <p style={copyStyle}>
          Keep it short. GSN records the notice; WhatsApp remains the conversation channel.
        </p>

        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={500}
          placeholder="Meeting Saturday 4 pm."
          style={textareaStyle}
        />

        <div style={metaRowStyle}>
          <span style={words > 50 ? warningStyle : chipStyle}>{words}/50 words</span>
          <span style={chipStyle}>No comments</span>
          <span style={chipStyle}>No reactions</span>
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
            busyLabel="Posting..."
            stableHeight={48}
            kind="primary"
          >
            Post notice
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
