import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import OriginLink from "../components/OriginLink";
import { submitJoinRequest } from "../lib/api";

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

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.12)",
    outline: "none",
    fontSize: 14,
    color: "#0B1F33",
    background: "#FFFFFF",
    boxSizing: "border-box",
  };
}

function textareaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 110,
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: 1.6,
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

function helperText(): React.CSSProperties {
  return {
    color: "#6B7A88",
    lineHeight: 1.75,
    fontSize: 14,
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    background: primary ? "#EAF2FF" : "#F8FAFC",
    border: primary
      ? "1px solid rgba(11,99,209,0.14)"
      : "1px solid rgba(11,31,51,0.08)",
    color: primary ? "#0B63D1" : "#475569",
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "nowrap",
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
  return String(value || "").trim();
}

function looksLikeSystemId(value: string): boolean {
  const v = cleanText(value).toUpperCase();
  if (!v) return false;
  if (v.startsWith("GMFN-U-")) return true;
  if (v.startsWith("GMFN-C-")) return true;
  return false;
}

function decodeFriendly(value: string): string {
  return cleanText(value).replace(/\+/g, " ");
}

function emailPrefix(value: string): string {
  const raw = cleanText(value);
  if (!raw.includes("@")) return raw;
  return raw.split("@")[0].trim();
}

function humanInviterLabel(rawInviter: string): string {
  const v = decodeFriendly(rawInviter);
  if (!v) return "A known GMFN member";

  if (looksLikeSystemId(v)) {
    return "A known GMFN member";
  }

  if (v.includes("@")) {
    const prefix = emailPrefix(v);
    return prefix || "A known GMFN member";
  }

  return v;
}

function safeDateTime(value: any): string {
  const raw = cleanText(value);
  if (!raw) return "Not available yet";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

export default function JoinEntryPage() {
  const { clanId } = useParams();
  const [searchParams] = useSearchParams();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 980);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "GMFN | Join Entry";
    }
  }, []);

  const inviteCode = useMemo(() => {
    return cleanText(
      searchParams.get("invite") ||
        searchParams.get("code") ||
        searchParams.get("invite_code") ||
        ""
    );
  }, [searchParams]);

  const communityName = useMemo(() => {
    return decodeFriendly(
      searchParams.get("community_name") ||
        searchParams.get("clan_name") ||
        "this GMFN community"
    );
  }, [searchParams]);

  const marketplaceName = useMemo(() => {
    return decodeFriendly(searchParams.get("marketplace_name") || "");
  }, [searchParams]);

  const inviterNameRaw = useMemo(() => {
    return cleanText(
      searchParams.get("inviter_name") ||
        searchParams.get("invited_by") ||
        searchParams.get("sender_name") ||
        ""
    );
  }, [searchParams]);

  const inviterLabel = useMemo(() => {
    return humanInviterLabel(inviterNameRaw);
  }, [inviterNameRaw]);

  const intendedReceiver = useMemo(() => {
    return decodeFriendly(
      searchParams.get("receiver_name") ||
        searchParams.get("receiver") ||
        searchParams.get("to") ||
        ""
    );
  }, [searchParams]);

  const inviteExpiry = useMemo(() => {
    return cleanText(
      searchParams.get("expires_at") ||
        searchParams.get("expiry") ||
        searchParams.get("expires") ||
        ""
    );
  }, [searchParams]);

  const inviteMessage = useMemo(() => {
    return decodeFriendly(
      searchParams.get("message") ||
        searchParams.get("note") ||
        searchParams.get("invite_message") ||
        ""
    );
  }, [searchParams]);

  const communityCode = useMemo(() => {
    return cleanText(searchParams.get("community_code") || "");
  }, [searchParams]);

  const routeLabel = useMemo(() => {
    const routeFromPath = cleanText(clanId || "");
    if (routeFromPath) return routeFromPath;
    return cleanText(searchParams.get("community_route") || "");
  }, [clanId, searchParams]);

  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [note, setNote] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);

  const canSubmit =
    !!inviteCode &&
    !!cleanText(firstName) &&
    !!cleanText(surname) &&
    !!cleanText(phone) &&
    !!cleanText(country) &&
    !busy;

  const submittedRequestId = cleanText(
    success?.request?.id || success?.request_id || ""
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setBusy(true);
    setErr(null);
    setSuccess(null);

    try {
      const safeInviteCode = cleanText(inviteCode);
      const safeFirstName = cleanText(firstName);
      const safeSurname = cleanText(surname);
      const safePhone = cleanText(phone);
      const safeCountry = cleanText(country);
      const safeBusinessName = cleanText(businessName);
      const safeNote = cleanText(note);

      if (!safeInviteCode) {
        throw new Error("Invite code is missing from this join link.");
      }
      if (!safeFirstName) {
        throw new Error("Enter first name.");
      }
      if (!safeSurname) {
        throw new Error("Enter surname.");
      }
      if (!safePhone) {
        throw new Error("Enter phone number.");
      }
      if (!safeCountry) {
        throw new Error("Enter country.");
      }

      const res = await submitJoinRequest({
        invite_code: safeInviteCode,
        first_name: safeFirstName,
        surname: safeSurname,
        phone_e164: safePhone,
        country: safeCountry,
        business_name: safeBusinessName || undefined,
        note: safeNote || undefined,
      });

      setSuccess(res);
      setFirstName("");
      setSurname("");
      setPhone("");
      setCountry("");
      setBusinessName("");
      setNote("");
    } catch (e: any) {
      setErr(String(e?.message || "Unable to submit your join request."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5FAFE",
        padding: "34px 22px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div
          style={{
            ...pageCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
            padding: 30,
          }}
        >
          <div style={labelText()}>Invited join route</div>

          <div
            style={{
              marginTop: 10,
              fontSize: 42,
              lineHeight: 1.08,
              fontWeight: 1000,
              color: "#0B1F33",
              maxWidth: 860,
            }}
          >
            Continue your join request carefully.
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
            This path is only for people invited into an existing GMFN community.
            It is guided, trust-based, and not automatic.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={badge(true)}>Join route</span>
            <span style={badge(false)}>
              Community ID: {communityCode || "Awaiting issue"}
            </span>
            <span style={badge(false)}>
              Community: {communityName || "Community not stated yet"}
            </span>
            <span style={badge(false)}>
              Invited by: {inviterLabel}
            </span>
            <span style={badge(false)}>Current step: Join request entry</span>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "0.95fr 1.05fr",
            gap: 18,
          }}
        >
          <div style={pageCard()}>
            <div style={labelText()}>Invitation package</div>

            <div
              style={{
                marginTop: 12,
                fontSize: 22,
                fontWeight: 1000,
                color: "#0B1F33",
              }}
            >
              Community join details
            </div>

            <div style={{ marginTop: 12, ...helperText() }}>
              You are not creating a normal public account here. You are
              submitting a request to be considered for admission into an
              existing community.
            </div>

            <div style={{ marginTop: 18, ...softCard() }}>
              <div
                style={{
                  fontWeight: 1000,
                  color: "#0B1F33",
                  fontSize: 15,
                }}
              >
                Invitation summary
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
                  {communityName || "This GMFN community"}
                </div>

                {marketplaceName ? (
                  <div>
                    <strong style={{ color: "#0B1F33" }}>Community market:</strong>{" "}
                    {marketplaceName}
                  </div>
                ) : null}

                <div>
                  <strong style={{ color: "#0B1F33" }}>Invited by:</strong>{" "}
                  {inviterLabel}
                </div>

                {intendedReceiver ? (
                  <div>
                    <strong style={{ color: "#0B1F33" }}>Intended receiver:</strong>{" "}
                    {intendedReceiver}
                  </div>
                ) : null}

                {routeLabel ? (
                  <div>
                    <strong style={{ color: "#0B1F33" }}>Community route:</strong>{" "}
                    {routeLabel}
                  </div>
                ) : null}

                {inviteExpiry ? (
                  <div>
                    <strong style={{ color: "#0B1F33" }}>Expiry:</strong>{" "}
                    {safeDateTime(inviteExpiry)}
                  </div>
                ) : null}

                <div>
                  <strong style={{ color: "#0B1F33" }}>Invite code:</strong>{" "}
                  {inviteCode || "Not available yet"}
                </div>
              </div>

              {inviteMessage ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    background: "#FFFFFF",
                    border: "1px solid rgba(11,31,51,0.08)",
                    color: "#475569",
                    lineHeight: 1.75,
                    fontSize: 14,
                  }}
                >
                  <strong style={{ color: "#0B1F33" }}>Invite message:</strong>{" "}
                  {inviteMessage}
                </div>
              ) : null}
            </div>

            <div style={{ marginTop: 18, ...softCard() }}>
              <div
                style={{
                  fontWeight: 1000,
                  color: "#0B1F33",
                  fontSize: 15,
                }}
              >
                Important admission rule
              </div>

              <div style={{ marginTop: 8, ...helperText() }}>
                Receiving an invitation or submitting this request does not
                guarantee admission. Members of the community must still approve
                your request according to the decision rule already in place.
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
                What happens next
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div style={noticeStyle("info")}>
                  <strong>Step 1:</strong> Submit your join request with the
                  details required by the community.
                </div>
                <div style={noticeStyle("info")}>
                  <strong>Step 2:</strong> The community reviews and votes on
                  the request according to its internal rule.
                </div>
                <div style={noticeStyle("info")}>
                  <strong>Step 3:</strong> If approved, you move into activation
                  and the next authenticated member steps.
                </div>
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

              <div style={{ marginTop: 8, ...helperText() }}>
                Before joining, read My GMFN and I and understand how trust-based
                participation works.
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <OriginLink to="/guide" style={secondaryLink()}>
                  Open My GMFN and I
                </OriginLink>
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
            <div style={labelText()}>Join request form</div>

            <div
              style={{
                marginTop: 12,
                fontSize: 22,
                fontWeight: 1000,
                color: "#0B1F33",
              }}
            >
              Submit your request
            </div>

            <div style={{ marginTop: 10, ...helperText() }}>
              Provide the details the community needs in order to review your
              admission request.
            </div>

            {!inviteCode ? (
              <div style={{ marginTop: 18, ...noticeStyle("error") }}>
                This join page does not contain a valid invite code yet. Return
                to the invited link and reopen it correctly before submitting.
              </div>
            ) : null}

            {err ? (
              <div style={{ marginTop: 18, ...noticeStyle("error") }}>
                {err}
              </div>
            ) : null}

            {success ? (
              <div style={{ marginTop: 18, ...noticeStyle("success") }}>
                <div style={{ fontWeight: 1000, marginBottom: 8 }}>
                  Join request submitted successfully.
                </div>

                <div>
                  Your request has been sent for community review. Admission is
                  not automatic. Once approval is reached, you will be able to
                  proceed to activation with your GMFN identity.
                </div>

                <div style={{ marginTop: 12 }}>
                  <strong>Request status:</strong>{" "}
                  {String(success?.request?.status || success?.status || "pending")}
                </div>

                <div style={{ marginTop: 6 }}>
                  <strong>Community:</strong>{" "}
                  {String(
                    success?.community_name ||
                      success?.request?.clan_name ||
                      communityName ||
                      "Community not stated yet"
                  )}
                </div>

                <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {submittedRequestId ? (
                    <OriginLink
                      to={`/join-approval/${submittedRequestId}`}
                      style={secondaryLink()}
                    >
                      Check approval status
                    </OriginLink>
                  ) : (
                    <OriginLink to="/join-request/pending" style={secondaryLink()}>
                      Open pending page
                    </OriginLink>
                  )}
                </div>
              </div>
            ) : null}

            <form onSubmit={onSubmit}>
              <div
                style={{
                  marginTop: 18,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <div style={labelText()}>First name</div>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={labelText()}>Surname</div>
                  <input
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder="Enter surname"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <div style={labelText()}>Phone number</div>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Preferably +E164 format"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={labelText()}>Country</div>
                  <input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Enter country"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={labelText()}>Business or trade (optional)</div>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Business / trade"
                  style={{ ...inputStyle(), marginTop: 8 }}
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={labelText()}>Short note to the community (optional)</div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a short note"
                  style={{ ...textareaStyle(), marginTop: 8 }}
                />
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "grid",
                  gap: 12,
                }}
              >
                <button type="submit" disabled={!canSubmit} style={primaryBtn(!canSubmit)}>
                  {busy ? "Submitting Request..." : "Submit Join Request"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <OriginLink to="/welcome" style={secondaryLink()}>
            Back to Welcome
          </OriginLink>
        </div>
      </div>
    </div>
  );
}
