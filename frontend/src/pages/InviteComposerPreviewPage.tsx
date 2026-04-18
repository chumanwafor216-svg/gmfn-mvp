import React, { useMemo, useState } from "react";
import { EntryBackLink } from "../components/EntryControls";

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, rgba(243,208,106,0.10) 0%, rgba(243,208,106,0) 24%), radial-gradient(circle at top right, rgba(74,132,214,0.18) 0%, rgba(74,132,214,0) 28%), radial-gradient(circle at bottom left, rgba(39,91,156,0.20) 0%, rgba(39,91,156,0) 30%), linear-gradient(180deg, #07101C 0%, #0B1F33 36%, #173654 70%, #26527C 100%)",
    padding: "22px 24px",
    boxSizing: "border-box",
  };
}

function frameCard(): React.CSSProperties {
  return {
    width: "min(100%, 640px)",
    margin: "0 auto",
    boxSizing: "border-box",
    borderRadius: 26,
    border: "1px solid rgba(255,255,255,0.30)",
    background:
      "linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(230,239,252,0.96) 58%, rgba(212,226,246,0.92) 100%)",
    boxShadow:
      "0 22px 56px rgba(5,16,38,0.26), inset 0 1px 0 rgba(255,255,255,0.82)",
    padding: 16,
    overflow: "hidden",
  };
}

function darkPanel(): React.CSSProperties {
  return {
    borderRadius: 22,
    background:
      "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)",
    border: "1px solid rgba(16,37,59,0.16)",
    boxShadow:
      "0 18px 34px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
    padding: 14,
    position: "relative",
    overflow: "hidden",
  };
}

function softCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(242,247,252,0.90) 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.84), 0 8px 18px rgba(10,24,49,0.05)",
    padding: 14,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(28,76,126,0.16)",
    padding: "12px 13px",
    outline: "none",
    fontSize: 14,
    color: "#0B1F33",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.98) 100%)",
    boxSizing: "border-box",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.86), 0 6px 14px rgba(10,24,49,0.04)",
  };
}

function textareaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 96,
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: 1.65,
  };
}

function goldBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 16px",
    borderRadius: 16,
    border: "none",
    background:
      "linear-gradient(180deg, #F6D77D 0%, #F3D06A 52%, #D9A941 100%)",
    color: "#10253B",
    fontWeight: 1000,
    fontSize: 14,
    boxShadow:
      "0 18px 32px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.58), inset 0 -8px 14px rgba(125,85,10,0.12)",
    textShadow: "0 1px 0 rgba(255,255,255,0.36)",
    cursor: "pointer",
  };
}

function chip(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    background: primary ? "rgba(243,208,106,0.16)" : "rgba(16,37,59,0.06)",
    color: primary ? "#8A6508" : "#475569",
    border: primary
      ? "1px solid rgba(243,208,106,0.28)"
      : "1px solid rgba(11,31,51,0.08)",
    fontSize: 12,
    fontWeight: 900,
  };
}

function labelText(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 1000,
    letterSpacing: 0.25,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F768D",
    lineHeight: 1.75,
    fontSize: 14,
  };
}

export default function InviteComposerPreviewPage() {
  const [sender] = useState("John Community Member");
  const [community] = useState("Example Community");
  const [receiver, setReceiver] = useState("Mary Friend");
  const [message, setMessage] = useState(
    "I would like you to join our community."
  );

  const previewText = useMemo(() => {
    const lines = [
      `From: ${safeStr(sender) || "Community member"}`,
      `Receiver: ${safeStr(receiver) || "[add receiver name]"}`,
      `Community: ${safeStr(community) || "Community"}`,
      "",
      `Message: ${
        safeStr(message) || `You are invited to join ${safeStr(community)} on GSN.`
      }`,
    ];
    return lines.join("\n");
  }, [community, message, receiver, sender]);

  return (
    <div style={pageShell()}>
      <div style={frameCard()}>
        <div style={{ ...darkPanel(), marginBottom: 16 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "radial-gradient(circle at top, rgba(243,208,106,0.10) 0%, rgba(243,208,106,0) 28%), radial-gradient(circle at bottom, rgba(123,181,255,0.10) 0%, rgba(123,181,255,0) 30%)",
            }}
          />
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "grid",
              gridTemplateColumns: "56px 1fr",
              alignItems: "center",
              gap: 12,
            }}
          >
            <EntryBackLink to="/welcome" />
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 1000,
                  letterSpacing: 4.2,
                  color: "#F3D06A",
                  textTransform: "uppercase",
                }}
              >
                GSN
              </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "#E9F2FF",
                    fontSize: 16,
                    fontWeight: 900,
                  }}
                >
                  Invite sender form
                </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ ...softCard(), display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={chip(true)}>Sender known</span>
            <span style={chip(false)}>{community}</span>
          </div>

          <div style={softCard()}>
            <div style={labelText()}>Sender</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              {sender}
            </div>
          </div>

          <div style={softCard()}>
            <div style={labelText()}>Receiver name</div>
            <input
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              placeholder="Enter the name of the person you want to invite"
              style={{ ...inputStyle(), marginTop: 8 }}
            />
          </div>

          <div style={softCard()}>
            <div style={labelText()}>Short invitation note</div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a short personal note"
              rows={3}
              style={{ ...textareaStyle(), marginTop: 8 }}
            />
          </div>

          <div style={softCard()}>
            <div style={labelText()}>Outgoing preview</div>
            <div style={{ marginTop: 8, ...helperText(), whiteSpace: "pre-wrap" }}>
              {previewText}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: 4,
            }}
          >
            <button type="button" style={goldBtn()}>
              Create invite package
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
