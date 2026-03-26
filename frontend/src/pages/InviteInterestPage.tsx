import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getInvitePreview } from "../lib/api";

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background: "#F5FAFE",
    padding: "34px 22px",
    boxSizing: "border-box",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    background: bg,
    border: "1px solid rgba(11,31,51,0.08)",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 24,
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    background: bg,
    border: "1px solid rgba(11,31,51,0.08)",
    padding: 18,
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "14px 18px",
    borderRadius: 16,
    background: disabled ? "#93B7E3" : "#0B63D1",
    color: "#FFFFFF",
    textDecoration: "none",
    fontWeight: 1000,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15,
    opacity: disabled ? 0.82 : 1,
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "14px 18px",
    borderRadius: 16,
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 1000,
    border: "1px solid rgba(11,31,51,0.10)",
    cursor: "pointer",
    fontSize: 15,
  };
}

function secondaryLink(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 900,
    border: "1px solid rgba(11,31,51,0.10)",
    fontSize: 14,
  };
}

function labelText(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 1000,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  };
}

function noticeStyle(kind: "success" | "error" | "info"): React.CSSProperties {
  if (kind === "success") {
    return {
      borderRadius: 16,
      background: "#ECFDF5",
      border: "1px solid #A7F3D0",
      color: "#065F46",
      padding: 16,
      lineHeight: 1.75,
      fontSize: 14,
    };
  }

  if (kind === "error") {
    return {
      borderRadius: 16,
      background: "#FEF2F2",
      border: "1px solid #FECACA",
      color: "#991B1B",
      padding: 16,
      lineHeight: 1.75,
      fontSize: 14,
    };
  }

  return {
    borderRadius: 16,
    background: "#F8FBFF",
    border: "1px solid rgba(11,31,51,0.08)",
    color: "#35516B",
    padding: 16,
    lineHeight: 1.75,
    fontSize: 14,
  };
}

function cleanText(value: any): string {
  return String(value ?? "").trim();
}

function decodeFriendly(value: any): string {
  return cleanText(value).replace(/\+/g, " ");
}

function safeDateTime(value: any): string {
  const raw = cleanText(value);
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function looksLikeRejectedOrExpired(status: string): boolean {
  const s = cleanText(status).toLowerCase();
  return (
    s.includes("expired") ||
    s.includes("invalid") ||
    s.includes("revoked") ||
    s.includes("rejected") ||
    s.includes("closed")
  );
}

function firstValue(obj: any, paths: string[]): any {
  for (const path of paths) {
    const value = path.split(".").reduce((acc, key) => {
      if (acc == null) return undefined;
      return acc[key];
    }, obj);

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return null;
}

export default function InviteInterestPage() {
  const navigate = useNavigate();
  const { code } = useParams();

  const inviteCode = cleanText(code || "");
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");

      try {
        if (!inviteCode) {
          throw new Error("Invite code is missing.");
        }

        const res = await getInvitePreview(inviteCode);
        setPreview(res || null);
      } catch (e: any) {
        setError(e?.message || "Unable to load invite preview.");
        setPreview(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [inviteCode]);

  const communityName = useMemo(() => {
    return decodeFriendly(
      firstValue(preview, [
        "community_name",
        "clan_name",
        "community.display_name",
        "community.name",
        "clan.display_name",
        "clan.name",
      ]) || "this GMFN community"
    );
  }, [preview]);

  const marketplaceName = useMemo(() => {
    return decodeFriendly(
      firstValue(preview, [
        "marketplace_name",
        "community.marketplace_name",
        "clan.marketplace_name",
      ]) || ""
    );
  }, [preview]);

  const inviterName = useMemo(() => {
    return decodeFriendly(
      firstValue(preview, [
        "invited_by_display",
        "inviter_name",
        "sender_name",
        "invited_by_email",
        "sender_email",
      ]) || "a known GMFN member"
    );
  }, [preview]);

  const receiverName = useMemo(() => {
    return decodeFriendly(
      firstValue(preview, [
        "receiver_name",
        "receiver",
        "to_name",
        "intended_receiver",
      ]) || ""
    );
  }, [preview]);

  const inviteMessage = useMemo(() => {
    return decodeFriendly(
      firstValue(preview, [
        "message",
        "invite_message",
        "note",
        "share_text",
      ]) || ""
    );
  }, [preview]);

  const expiresAt = useMemo(() => {
    return cleanText(
      firstValue(preview, ["expires_at", "expiry", "expires"]) || ""
    );
  }, [preview]);

  const status = useMemo(() => {
    return cleanText(firstValue(preview, ["status", "invite_status", "state"]) || "");
  }, [preview]);

  const communityCode = useMemo(() => {
    return cleanText(
      firstValue(preview, ["community_code", "clan_code", "community_id"]) || ""
    );
  }, [preview]);

  const routeId = useMemo(() => {
    return cleanText(
      firstValue(preview, ["clan_id", "community.id", "clan.id"]) || ""
    );
  }, [preview]);

  const canContinue = useMemo(() => {
    if (!inviteCode) return false;
    const explicitValid = firstValue(preview, ["valid", "is_valid", "ok"]);
    if (explicitValid === false) return false;
    if (looksLikeRejectedOrExpired(status)) return false;
    return true;
  }, [inviteCode, preview, status]);

  function openJoinFlow() {
    const params = new URLSearchParams();
    params.set("invite", inviteCode);

    if (communityName) params.set("community_name", communityName);
    if (marketplaceName) params.set("marketplace_name", marketplaceName);
    if (inviterName) params.set("inviter_name", inviterName);
    if (receiverName) params.set("receiver_name", receiverName);
    if (inviteMessage) params.set("message", inviteMessage);
    if (expiresAt) params.set("expires_at", expiresAt);
    if (communityCode) params.set("community_code", communityCode);

    const basePath = routeId ? `/join/community/${encodeURIComponent(routeId)}` : "/join";
    navigate(`${basePath}?${params.toString()}`);
  }

  return (
    <div style={pageShell()}>
      <div style={{ maxWidth: 1040, margin: "0 auto", display: "grid", gap: 18 }}>
        <div style={{ ...pageCard(), padding: 30 }}>
          <div
            style={{
              fontSize: 42,
              lineHeight: 1.08,
              fontWeight: 1000,
              color: "#0B1F33",
              maxWidth: 860,
            }}
          >
            You have been invited into a GMFN community
          </div>

          <div
            style={{
              marginTop: 14,
              fontSize: 18,
              lineHeight: 1.8,
              color: "#35516B",
              maxWidth: 980,
            }}
          >
            This page helps you understand the invitation first. Joining is not
            automatic. You still submit a request and the community decides.
          </div>
        </div>

        {error ? (
          <div style={noticeStyle("error")}>{error}</div>
        ) : null}

        {loading ? (
          <div style={noticeStyle("info")}>Loading invite preview...</div>
        ) : null}

        {!loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "0.95fr 1.05fr",
              gap: 18,
            }}
          >
            <div style={pageCard()}>
              <div style={labelText()}>Invitation context</div>

              <div
                style={{
                  marginTop: 12,
                  fontSize: 22,
                  fontWeight: 1000,
                  color: "#0B1F33",
                }}
              >
                {communityName}
              </div>

              <div
                style={{
                  marginTop: 12,
                  color: "#6B7A88",
                  lineHeight: 1.8,
                  fontSize: 15,
                }}
              >
                You were invited by a member into an existing trust-based community.
              </div>

              <div style={{ marginTop: 18, ...softCard() }}>
                <div
                  style={{
                    fontWeight: 1000,
                    color: "#0B1F33",
                    fontSize: 15,
                  }}
                >
                  Invite package
                </div>

                <div
                  style={{
                    marginTop: 10,
                    color: "#35516B",
                    lineHeight: 1.85,
                    fontSize: 14,
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div>
                    <strong style={{ color: "#0B1F33" }}>Community:</strong>{" "}
                    {communityName}
                  </div>

                  {marketplaceName ? (
                    <div>
                      <strong style={{ color: "#0B1F33" }}>Community market:</strong>{" "}
                      {marketplaceName}
                    </div>
                  ) : null}

                  <div>
                    <strong style={{ color: "#0B1F33" }}>Invited by:</strong>{" "}
                    {inviterName}
                  </div>

                  {receiverName ? (
                    <div>
                      <strong style={{ color: "#0B1F33" }}>Intended receiver:</strong>{" "}
                      {receiverName}
                    </div>
                  ) : null}

                  {expiresAt ? (
                    <div>
                      <strong style={{ color: "#0B1F33" }}>Expiry:</strong>{" "}
                      {safeDateTime(expiresAt)}
                    </div>
                  ) : null}

                  {status ? (
                    <div>
                      <strong style={{ color: "#0B1F33" }}>Invite status:</strong>{" "}
                      {status}
                    </div>
                  ) : null}
                </div>
              </div>

              {inviteMessage ? (
                <div style={{ marginTop: 18, ...softCard() }}>
                  <div
                    style={{
                      fontWeight: 1000,
                      color: "#0B1F33",
                      fontSize: 15,
                    }}
                  >
                    Message from inviter
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      color: "#6B7A88",
                      lineHeight: 1.75,
                      fontSize: 14,
                    }}
                  >
                    {inviteMessage}
                  </div>
                </div>
              ) : null}

              <div style={{ marginTop: 18, ...softCard() }}>
                <div
                  style={{
                    fontWeight: 1000,
                    color: "#0B1F33",
                    fontSize: 15,
                  }}
                >
                  Important rule
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#6B7A88",
                    lineHeight: 1.75,
                    fontSize: 14,
                  }}
                >
                  This invite is not instant admission. It opens the path for you
                  to submit a join request. Community approval still decides entry.
                </div>
              </div>

              <div style={{ marginTop: 18, ...softCard() }}>
                <div
                  style={{
                    fontWeight: 1000,
                    color: "#0B1F33",
                    fontSize: 15,
                  }}
                >
                  Guide
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#6B7A88",
                    lineHeight: 1.75,
                    fontSize: 14,
                  }}
                >
                  Read the guide first so you understand what GMFN / GSN is for
                  before you continue.
                </div>

                <div style={{ marginTop: 12 }}>
                  <a
                    href="/GSN_FINAL_WHITE.pdf"
                    target="_blank"
                    rel="noreferrer"
                    style={secondaryLink()}
                  >
                    Open guide
                  </a>
                </div>
              </div>

              <div style={{ marginTop: 18, ...softCard() }}>
                <div
                  style={{
                    fontWeight: 1000,
                    color: "#0B1F33",
                    fontSize: 15,
                  }}
                >
                  Invite code
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: inviteCode ? "#0B1F33" : "#991B1B",
                    lineHeight: 1.7,
                    fontSize: 14,
                    wordBreak: "break-word",
                    fontWeight: 900,
                  }}
                >
                  {inviteCode || "No invite code was detected in this link."}
                </div>

                {communityCode ? (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      color: "#94A3B8",
                    }}
                  >
                    Community reference recorded securely.
                  </div>
                ) : null}
              </div>
            </div>

            <div style={pageCard()}>
              <div style={labelText()}>Next step</div>

              <div
                style={{
                  marginTop: 12,
                  fontSize: 22,
                  fontWeight: 1000,
                  color: "#0B1F33",
                }}
              >
                Continue to join request
              </div>

              <div
                style={{
                  marginTop: 10,
                  color: "#6B7A88",
                  lineHeight: 1.8,
                  fontSize: 15,
                }}
              >
                The next page lets you submit the details the community needs in
                order to review your entry request.
              </div>

              {!canContinue ? (
                <div style={{ marginTop: 18, ...noticeStyle("error") }}>
                  This invitation does not look active right now. You may need a
                  fresh invitation from the community.
                </div>
              ) : (
                <div style={{ marginTop: 18, ...noticeStyle("info") }}>
                  After submission, your request enters community review. If
                  approved, you will later activate your GMFN identity properly.
                </div>
              )}

              <div
                style={{
                  marginTop: 18,
                  display: "grid",
                  gap: 12,
                }}
              >
                <button
                  type="button"
                  onClick={openJoinFlow}
                  disabled={!canContinue}
                  style={primaryBtn(!canContinue)}
                >
                  Continue to Join Request
                </button>

                <Link to="/login" style={secondaryBtn()}>
                  I already have access — Sign in
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link to="/welcome" style={secondaryLink()}>
            Back to Welcome
          </Link>

          <Link to="/cover" style={secondaryLink()}>
            Back to Cover
          </Link>
        </div>
      </div>
    </div>
  );
}