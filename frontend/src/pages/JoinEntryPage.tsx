import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { EntryBackLink } from "../components/EntryControls";
import OriginLink from "../components/OriginLink";
import { submitJoinRequest } from "../lib/api";

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    background: bg,
    border: "1px solid rgba(11,31,51,0.08)",
    boxShadow:
      "0 20px 44px rgba(5,16,38,0.10), inset 0 1px 0 rgba(255,255,255,0.62)",
    padding: 24,
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    background:
      bg === "#F8FBFF"
        ? "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(242,247,252,0.90) 100%)"
        : bg,
    border: "1px solid rgba(11,31,51,0.08)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.84), 0 8px 18px rgba(10,24,49,0.05)",
    padding: 18,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid rgba(28,76,126,0.16)",
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
    width: "min(100%, 68%)",
    padding: "14px 18px",
    borderRadius: 16,
    background: disabled
      ? "linear-gradient(180deg, #D7DEE8 0%, #C8D2DF 100%)"
      : "linear-gradient(180deg, #F6D77D 0%, #F3D06A 52%, #D9A941 100%)",
    color: disabled ? "#6B7B8D" : "#10253B",
    textDecoration: "none",
    fontWeight: 1000,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15,
    opacity: disabled ? 0.82 : 1,
    textAlign: "center",
    boxShadow: disabled
      ? "0 10px 20px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.52)"
      : "0 18px 32px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.58), inset 0 -8px 14px rgba(125,85,10,0.12)",
    textShadow: disabled ? "none" : "0 1px 0 rgba(255,255,255,0.36)",
  };
}

function secondaryLink(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 16px",
    borderRadius: 999,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(229,237,249,0.96) 100%)",
    color: "#123055",
    textDecoration: "none",
    fontWeight: 900,
    border: "1px solid rgba(16,37,59,0.12)",
    fontSize: 14,
    boxShadow:
      "0 14px 24px rgba(10,24,49,0.16), inset 0 1px 0 rgba(255,255,255,0.82), inset 0 -6px 10px rgba(120,142,170,0.10)",
    textShadow: "0 1px 0 rgba(255,255,255,0.52)",
    cursor: "pointer",
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
    color: "#5F768D",
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
      ? "1px solid rgba(29,78,216,0.16)"
      : "1px solid rgba(11,31,51,0.08)",
    color: primary ? "#1D4ED8" : "#475569",
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "normal",
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

const COUNTRY_OPTIONS = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Argentina",
  "Australia",
  "Austria",
  "Bangladesh",
  "Belgium",
  "Benin",
  "Brazil",
  "Cameroon",
  "Canada",
  "China",
  "Cote d'Ivoire",
  "Denmark",
  "Egypt",
  "Ethiopia",
  "France",
  "Gambia",
  "Germany",
  "Ghana",
  "India",
  "Ireland",
  "Italy",
  "Japan",
  "Kenya",
  "Liberia",
  "Malaysia",
  "Morocco",
  "Netherlands",
  "New Zealand",
  "Niger",
  "Nigeria",
  "Norway",
  "Pakistan",
  "Philippines",
  "Portugal",
  "Rwanda",
  "Senegal",
  "Sierra Leone",
  "South Africa",
  "Spain",
  "Tanzania",
  "Togo",
  "Turkey",
  "Uganda",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Zambia",
  "Zimbabwe",
];

const COUNTRY_DIAL_CODES: Record<string, string> = {
  Afghanistan: "+93",
  Albania: "+355",
  Algeria: "+213",
  Argentina: "+54",
  Australia: "+61",
  Austria: "+43",
  Bangladesh: "+880",
  Belgium: "+32",
  Benin: "+229",
  Brazil: "+55",
  Cameroon: "+237",
  Canada: "+1",
  China: "+86",
  "Cote d'Ivoire": "+225",
  Denmark: "+45",
  Egypt: "+20",
  Ethiopia: "+251",
  France: "+33",
  Gambia: "+220",
  Germany: "+49",
  Ghana: "+233",
  India: "+91",
  Ireland: "+353",
  Italy: "+39",
  Japan: "+81",
  Kenya: "+254",
  Liberia: "+231",
  Malaysia: "+60",
  Morocco: "+212",
  Netherlands: "+31",
  "New Zealand": "+64",
  Niger: "+227",
  Nigeria: "+234",
  Norway: "+47",
  Pakistan: "+92",
  Philippines: "+63",
  Portugal: "+351",
  Rwanda: "+250",
  Senegal: "+221",
  "Sierra Leone": "+232",
  "South Africa": "+27",
  Spain: "+34",
  Tanzania: "+255",
  Togo: "+228",
  Turkey: "+90",
  Uganda: "+256",
  "United Arab Emirates": "+971",
  "United Kingdom": "+44",
  "United States": "+1",
  Zambia: "+260",
  Zimbabwe: "+263",
};

const WORK_OPTIONS = [
  {
    value: "trader",
    label: "Trader / market seller",
    hint: "Food seller, clothes, phone accessories, spare parts, provisions.",
  },
  {
    value: "service",
    label: "Service work / skill",
    hint: "Driver, plumber, tailor, hairdresser, mechanic, electrician.",
  },
  {
    value: "salary",
    label: "Salary worker / civil servant",
    hint: "Teacher, nurse, office worker, security, government or company work.",
  },
  {
    value: "farming",
    label: "Farming / agriculture",
    hint: "Crop farming, poultry, livestock, produce trading.",
  },
  {
    value: "student",
    label: "Student / apprentice",
    hint: "School, training, learning a skill, early work stage.",
  },
  {
    value: "home",
    label: "Home support / family work",
    hint: "Family care, home trading, helping a household business.",
  },
  {
    value: "none",
    label: "Not working yet",
    hint: "You can still join if the community knows you.",
  },
  {
    value: "other",
    label: "Other",
    hint: "Write the closest simple description.",
  },
];

function cleanText(value: any): string {
  return String(value || "").trim();
}

function dialCodeForCountry(country: string): string {
  return COUNTRY_DIAL_CODES[cleanText(country)] || "";
}

function workOptionFor(value: string) {
  return WORK_OPTIONS.find((item) => item.value === value) || null;
}

function buildWorkSummary(category: string, detail: string): string {
  const option = workOptionFor(category);
  const safeDetail = cleanText(detail);

  if (!option) return safeDetail;
  if (!safeDetail) return option.label;

  return `${option.label}: ${safeDetail}`;
}

function friendlyJoinError(value: any): string {
  const raw = cleanText(value);
  const lower = raw.toLowerCase();

  if (
    lower.includes("invitation not found") ||
    lower.includes("invite not found") ||
    lower.includes("not copied fully")
  ) {
    return (
      "This invitation link is no longer valid or was not copied fully. " +
      "Ask the person who invited you to send a fresh GSN invite link."
    );
  }

  if (lower.includes("expired")) {
    return "This invitation has expired. Ask the person who invited you to send a fresh GSN invite link.";
  }

  if (lower.includes("usage limit")) {
    return "This invitation has already reached its use limit. Ask the inviter to create a fresh GSN invite link.";
  }

  if (lower.includes("pending join request already exists")) {
    return "Your join request is already waiting for community review. You do not need to submit it again.";
  }

  return raw || "Unable to submit your join request.";
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
  if (!v) return "A known GSN member";

  if (looksLikeSystemId(v)) {
    return "A known GSN member";
  }

  if (v.includes("@")) {
    const prefix = emailPrefix(v);
    return prefix || "A known GSN member";
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

function buildInviteLetter(args: {
  receiver: string;
  communityName: string;
  inviter: string;
  marketplaceName: string;
  expiresAt: string;
  customMessage: string;
}): string[] {
  const receiver = cleanText(args.receiver);
  const communityName = cleanText(args.communityName) || "this GSN community";
  const inviter = cleanText(args.inviter) || "a known GSN member";
  const marketplaceName = cleanText(args.marketplaceName);
  const expiresAt = cleanText(args.expiresAt);
  const customMessage = cleanText(args.customMessage);

  const lines: string[] = [];

  lines.push(receiver ? `Hello ${receiver},` : "Hello,");
  lines.push(
    `${inviter} is inviting you to begin the join request process for ${communityName}.`
  );

  if (marketplaceName) {
    lines.push(`Community / Market: ${marketplaceName}.`);
  }

  lines.push(
    "We have already built trust by knowing, helping, lending, supporting, and standing for one another."
  );
  lines.push(
    "GSN helps make that trust visible, recordable, and useful, so the good things people do for each other can become proof for tomorrow."
  );
  lines.push(
    "With GSN, a trusted circle can trade, support small needs, lend, borrow, repay, and build a clearer record of reliability."
  );
  lines.push(
    "Over time, those records can help members carry their good name further, even beyond the people who already know them."
  );

  if (customMessage) {
    lines.push(`Message: ${customMessage}`);
  }

  if (expiresAt) {
    lines.push(`This invitation remains open until ${safeDateTime(expiresAt)}.`);
  }

  lines.push(
    "If you wish to continue, complete the form below and your request will return to the community for review."
  );

  return lines;
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
      document.title = "GSN | Join Entry";
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
        "this GSN community"
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

  const inviteLetter = useMemo(() => {
    return buildInviteLetter({
      receiver: intendedReceiver,
      communityName,
      inviter: inviterLabel,
      marketplaceName,
      expiresAt: inviteExpiry,
      customMessage: inviteMessage,
    });
  }, [
    intendedReceiver,
    communityName,
    inviterLabel,
    marketplaceName,
    inviteExpiry,
    inviteMessage,
  ]);

  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [workCategory, setWorkCategory] = useState("");
  const [workDetail, setWorkDetail] = useState("");
  const [note, setNote] = useState("");
  const [formOpen, setFormOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth > 980;
  });

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

  const selectedDialCode = useMemo(() => {
    return dialCodeForCountry(country);
  }, [country]);

  const selectedWorkOption = useMemo(() => {
    return workOptionFor(workCategory);
  }, [workCategory]);

  function handleCountryChange(nextCountry: string) {
    const previousDialCode = dialCodeForCountry(country);
    const nextDialCode = dialCodeForCountry(nextCountry);

    setCountry(nextCountry);

    if (!nextDialCode) return;

    setPhone((current) => {
      const safeCurrent = cleanText(current);

      if (!safeCurrent) return `${nextDialCode} `;
      if (previousDialCode && safeCurrent === previousDialCode) {
        return `${nextDialCode} `;
      }
      if (previousDialCode && safeCurrent === `${previousDialCode} `) {
        return `${nextDialCode} `;
      }

      return current;
    });
  }

  function handleWorkCategoryChange(nextCategory: string) {
    setWorkCategory(nextCategory);
    setWorkDetail("");
  }

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
      const safeBusinessName = buildWorkSummary(workCategory, workDetail);
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
      setWorkCategory("");
      setWorkDetail("");
      setNote("");
      setFormOpen(false);
    } catch (e: any) {
      setErr(friendlyJoinError(e?.message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(243,208,106,0.10) 0%, rgba(243,208,106,0) 24%), radial-gradient(circle at top right, rgba(74,132,214,0.18) 0%, rgba(74,132,214,0) 28%), radial-gradient(circle at bottom left, rgba(39,91,156,0.20) 0%, rgba(39,91,156,0) 30%), linear-gradient(180deg, #07101C 0%, #0B1F33 36%, #173654 70%, #26527C 100%)",
        padding: "22px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div
          style={{
            borderRadius: 26,
            border: "1px solid rgba(255,255,255,0.30)",
            background:
              "linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(230,239,252,0.96) 58%, rgba(212,226,246,0.92) 100%)",
            boxShadow:
              "0 22px 56px rgba(5,16,38,0.26), inset 0 1px 0 rgba(255,255,255,0.82)",
            padding: 20,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              borderRadius: 22,
              background:
                "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)",
              border: "1px solid rgba(16,37,59,0.16)",
              boxShadow:
                "0 18px 34px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
              padding: 18,
              position: "relative",
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
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
                    textShadow: "0 1px 0 rgba(255,255,255,0.14)",
                  }}
                >
                  GSN
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "#E9F2FF",
                    fontSize: 17,
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  Community invitation
                </div>
              </div>
            </div>
          </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "0.95fr 1.05fr",
            gap: 18,
          }}
        >
          <div style={pageCard()}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 1000,
                color: "#0B1F33",
              }}
            >
              Invitation message
            </div>

            <div style={{ marginTop: 18, ...softCard() }}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                <span style={badge(true)}>Invited by {inviterLabel}</span>
                <span style={badge(false)}>
                  {communityName || "This GSN community"}
                </span>
                {inviteExpiry ? (
                  <span style={badge(false)}>Expires {safeDateTime(inviteExpiry)}</span>
                ) : null}
              </div>
              <div
                style={{
                  fontWeight: 1000,
                  color: "#0B1F33",
                  fontSize: 15,
                }}
              >
                Invitation letter
              </div>

              <div
                style={{
                  marginTop: 10,
                  color: "#35516B",
                  lineHeight: 1.82,
                  fontSize: 15,
                  display: "grid",
                  gap: 10,
                }}
              >
                {inviteLetter.map((line, index) => (
                  <div key={`${line}-${index}`}>{line}</div>
                ))}
              </div>
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
              Tell the community enough to know who is asking to join. Your
              request still goes back to people for review, because trust stays
              protected.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
                borderRadius: 16,
                border: "1px solid rgba(11,31,51,0.08)",
                background: "rgba(255,255,255,0.74)",
                padding: 14,
              }}
            >
              <div>
                <div style={{ ...labelText(), marginBottom: 4 }}>Request form</div>
                <div style={{ color: "#35516B", fontSize: 14, lineHeight: 1.6 }}>
                  Open this when you are ready to return your request to the community.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFormOpen((prev) => !prev)}
                style={secondaryLink()}
              >
                {formOpen ? "Collapse" : "Open"}
              </button>
            </div>

            {!inviteCode ? (
              <div style={{ marginTop: 18, ...noticeStyle("error") }}>
                This join page does not contain a valid invite code yet. Ask the
                person who invited you to send the full GSN invite link again.
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
                  proceed to activation with your GSN identity.
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

            {formOpen ? (
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
                    placeholder={
                      selectedDialCode
                        ? `${selectedDialCode} then your number`
                        : "Preferably +E164 format"
                    }
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                  {selectedDialCode ? (
                    <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                      Phone starts with {selectedDialCode} for {country}. Add
                      the rest of your number after it.
                    </div>
                  ) : null}
                </div>

                <div>
                  <div style={labelText()}>Country</div>
                  <select
                    value={country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    style={{ ...inputStyle(), marginTop: 8 }}
                  >
                    <option value="">Select country</option>
                    {COUNTRY_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={labelText()}>Work, business, or trade (optional)</div>
                <select
                  value={workCategory}
                  onChange={(e) => handleWorkCategoryChange(e.target.value)}
                  style={{ ...inputStyle(), marginTop: 8 }}
                >
                  <option value="">Select the closest one</option>
                  {WORK_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                  Choose the nearest fit. This only helps the community
                  understand you faster.
                </div>
              </div>

              {workCategory && workCategory !== "none" ? (
                <div style={{ marginTop: 12 }}>
                  <div style={labelText()}>Short detail (optional)</div>
                  <input
                    value={workDetail}
                    onChange={(e) => setWorkDetail(e.target.value)}
                    placeholder={selectedWorkOption?.hint || "Add a few words if needed"}
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>
              ) : null}

              {workCategory === "none" ? (
                <div style={{ marginTop: 12, ...noticeStyle("info") }}>
                  That is okay. GSN is not judging income. The community can
                  still review you by relationship, trust, and what they know
                  about you.
                </div>
              ) : null}

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
                  justifyItems: isCompact ? "stretch" : "center",
                }}
              >
                <button type="submit" disabled={!canSubmit} style={primaryBtn(!canSubmit)}>
                  {busy ? "Submitting Request..." : "Submit Join Request"}
                </button>
              </div>
            </form>
            ) : null}
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
    </div>
  );
}



