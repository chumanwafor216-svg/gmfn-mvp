import React, { useEffect, useMemo, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import {
  getCurrentClan,
  getMe,
  getMyWithdrawalDestination,
  getSelectedClanId,
  safeCopy,
  saveWithdrawalDestination,
  updateWithdrawalDestination,
} from "../lib/api";

type CommunityLite = {
  id?: number;
  clan_id?: number;
  name?: string | null;
  marketplace_name?: string | null;
};

type PayoutForm = {
  account_name: string;
  account_number: string;
  bank_name: string;
  country: string;
  currency: string;
};

type NextStepState = {
  title: string;
  detail: string;
  today: string;
  tomorrow: string;
  ctaLabel: string;
  ctaTo: string;
};

type TrustEventFeedback = {
  confirmation_message?: string;
  verification_status?: string;
  verification_note?: string;
  trust_event_response?: {
    event_type?: string;
    status?: string;
    message?: string;
  } | null;
} | null;

const LOCAL_PAYOUT_KEY = "gmfn_payout_account";

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(123,161,204,0.20)",
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(8,17,31,0.98) 0%, rgba(11,31,51,0.97) 56%, rgba(23,54,84,0.95) 100%)"
        : bg,
    boxShadow:
      "0 22px 48px rgba(2,6,23,0.22), 0 6px 14px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(123,161,204,0.16)",
    background:
      bg === "#F8FBFF" || bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(13,28,45,0.96) 0%, rgba(18,40,64,0.94) 100%)"
        : bg,
    padding: 16,
    boxShadow:
      "0 14px 30px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function stableTapStyle(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 20,
    isolation: "isolate",
    pointerEvents: "auto",
    boxSizing: "border-box",
    appearance: "none",
    WebkitAppearance: "none",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    transform: "translateZ(0)",
    outlineOffset: 4,
    lineHeight: 1.2,
  };
}

function guardButtonPress(
  event:
    | React.PointerEvent<HTMLElement>
    | React.MouseEvent<HTMLElement>
    | React.TouchEvent<HTMLElement>
) {
  event.stopPropagation();
}

function buttonGuardProps() {
  return {
    onPointerDown: guardButtonPress,
    onMouseDown: guardButtonPress,
    onTouchStart: guardButtonPress,
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 16px",
    minHeight: 48,
    borderRadius: 15,
    border: disabled
      ? "1px solid rgba(148,163,184,0.24)"
      : "1px solid rgba(18,77,176,0.22)",
    background: disabled
      ? "linear-gradient(180deg, #D5DEE8 0%, #C6D1DD 100%)"
      : "linear-gradient(180deg, #255FCE 0%, #1B4FBF 100%)",
    color: "#FFFFFF",
    boxShadow: disabled
      ? "none"
      : "0 18px 34px rgba(19,79,191,0.24), inset 0 1px 0 rgba(255,255,255,0.18)",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "normal",
    ...stableTapStyle(),
  };
}

function secondaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 16px",
    minHeight: 48,
    borderRadius: 15,
    border: "1px solid rgba(121,149,190,0.20)",
    background:
      "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    color: disabled ? "#94A3B8" : "#E6EEF8",
    boxShadow: disabled
      ? "none"
      : "0 12px 24px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "normal",
    ...stableTapStyle(),
  };
}

function inputStyle(): React.CSSProperties {
  return {
    padding: "11px 12px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.12)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F9FCFF 100%)",
    width: "100%",
    boxSizing: "border-box",
    minHeight: 46,
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.52), 0 12px 24px rgba(15,23,42,0.05)",
    outline: "none",
    fontSize: 14,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#9CB4CF",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 32,
    padding: "7px 12px",
    borderRadius: 999,
    background: primary ? "rgba(32,76,133,0.36)" : "rgba(255,255,255,0.08)",
    border: primary
      ? "1px solid rgba(123,161,204,0.24)"
      : "1px solid rgba(123,161,204,0.14)",
    color: primary ? "#CFE3FF" : "#E6EEF8",
    fontSize: 12,
    fontWeight: 1000,
    whiteSpace: "normal",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function feedbackCard(success: boolean): React.CSSProperties {
  return {
    ...pageCard(success ? "#ECFDF5" : "#FEF2F2"),
    border: success ? "1px solid #A7F3D0" : "1px solid #FECACA",
    color: success ? "#065F46" : "#991B1B",
    fontWeight: 900,
    padding: 14,
  };
}

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function detectCurrency(me: any): string {
  const preferred = safeStr(me?.preferred_currency).toUpperCase();
  if (preferred) return preferred;

  const country = safeStr(me?.country).toUpperCase();
  if (country === "GB" || country === "UK") return "GBP";
  if (country === "NG") return "NGN";
  if (country === "KE") return "KES";
  if (country === "GH") return "GHS";
  return "NGN";
}

function readLocalPayout(): Partial<PayoutForm> | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(LOCAL_PAYOUT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    return {
      account_name: safeStr((parsed as any).account_name || ""),
      account_number: safeStr((parsed as any).account_number || ""),
      bank_name: safeStr((parsed as any).bank_name || ""),
      country: safeStr((parsed as any).country || ""),
      currency: safeStr((parsed as any).currency || ""),
    };
  } catch {
    return null;
  }
}

function writeLocalPayout(form: PayoutForm): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_PAYOUT_KEY, JSON.stringify(form));
}

function removeLocalPayout(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCAL_PAYOUT_KEY);
}

function buildPayoutSummary(form: PayoutForm): string {
  return [
    "GSN Payout Details",
    `Account Name: ${safeStr(form.account_name || "-")}`,
    `Account Number / Wallet: ${safeStr(form.account_number || "-")}`,
    `Bank / Wallet Provider: ${safeStr(form.bank_name || "-")}`,
    `Country: ${safeStr(form.country || "-")}`,
    `Currency: ${safeStr(form.currency || "-")}`,
  ].join("\n");
}

function getCommunityName(clan: CommunityLite | null): string {
  return safeStr(clan?.marketplace_name || clan?.name || "");
}

export default function PayoutDetailsPage() {
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [me, setMe] = useState<any>(null);
  const [community, setCommunity] = useState<CommunityLite | null>(null);
  const [loadedFromLocal, setLoadedFromLocal] = useState(false);
  const [loadedFromServer, setLoadedFromServer] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [proofFeedback, setProofFeedback] = useState<TrustEventFeedback>(null);

  const [form, setForm] = useState<PayoutForm>({
    account_name: "",
    account_number: "",
    bank_name: "",
    country: "",
    currency: "NGN",
  });

  const selectedClanId = Number(getSelectedClanId() || 0);

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
    (async () => {
      const [meRes, clanRes] = await Promise.all([
        getMe().catch(() => null),
        getCurrentClan().catch(() => null),
      ]);

      const server = await getMyWithdrawalDestination({
        clan_id: selectedClanId || undefined,
        gmfn_id: safeStr(meRes?.gmfn_id || "") || undefined,
      }).catch(() => null);
      const local = readLocalPayout();

      setMe(meRes || null);
      setCommunity(clanRes || null);
      setLoadedFromLocal(Boolean(local));
      setLoadedFromServer(Boolean(server));

      setForm({
        account_name: safeStr(
          server?.account_name ||
            server?.destination_name ||
            local?.account_name ||
            meRes?.account_name ||
            ""
        ),
        account_number: safeStr(
          server?.account_number ||
            server?.bank_account_number ||
            local?.account_number ||
            meRes?.account_number ||
            ""
        ),
        bank_name: safeStr(
          server?.bank_name || server?.bank || local?.bank_name || meRes?.bank_name || ""
        ),
        country: safeStr(server?.country || local?.country || meRes?.country || ""),
        currency:
          safeStr(
            server?.currency || local?.currency || detectCurrency(meRes) || "NGN"
          ) || "NGN",
      });
    })();
  }, [selectedClanId]);

  useEffect(() => {
    if (!msg && !err) return;

    const timer = window.setTimeout(() => {
      setMsg("");
      setErr("");
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [msg, err]);

  const selectedCommunityLabel = useMemo(() => {
    return (
      getCommunityName(community) ||
      (selectedClanId ? `Community ${selectedClanId}` : "No community selected")
    );
  }, [community, selectedClanId]);

  const completionCount = useMemo(() => {
    let count = 0;
    if (safeStr(form.account_name)) count += 1;
    if (safeStr(form.account_number)) count += 1;
    if (safeStr(form.bank_name)) count += 1;
    if (safeStr(form.country)) count += 1;
    if (safeStr(form.currency)) count += 1;
    return count;
  }, [form]);

  const isReady = completionCount >= 5;

  const nextStep = useMemo<NextStepState>(() => {
    if (!selectedClanId) {
      return {
        title: "Choose the community first",
        detail:
          "Payout details belong to the same money path as withdrawals and support. Confirm your current community first whenever possible.",
        today: "Open Community Home and confirm the community you are working in.",
        tomorrow:
          "A clear community keeps payout movement easier to understand.",
        ctaLabel: "Open Community Home",
        ctaTo: "/app/community",
      };
    }

    if (!isReady) {
      return {
        title: "Complete the payout destination first",
        detail:
          "Approved withdrawals should wait until your payout destination is complete enough for the route to be understood.",
        today: "Complete the payout fields and save them locally for this pilot build.",
        tomorrow:
          "A clear payout destination reduces mistakes and delay when withdrawal begins.",
        ctaLabel: "Open Withdrawal Instructions",
        ctaTo: "/app/withdrawal-instructions",
      };
    }

    return {
      title: "Keep the payout destination ready for withdrawal",
      detail:
        "Your payout destination is ready enough for the pilot flow. The next step is to use Withdrawal Instructions when the support route is approved.",
      today: "Review the details and keep them accurate before initiating withdrawal.",
      tomorrow:
        "A stable payout destination keeps the money path calmer and more traceable.",
      ctaLabel: "Open Withdrawal Instructions",
      ctaTo: "/app/withdrawal-instructions",
    };
  }, [selectedClanId, isReady]);

  function update<K extends keyof PayoutForm>(key: K, value: PayoutForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function savePayout() {
    try {
      const payload = {
        clan_id: selectedClanId || undefined,
        gmfn_id: safeStr(me?.gmfn_id || "") || undefined,
        destination_name: safeStr(form.account_name),
        bank_name: safeStr(form.bank_name),
        account_number: safeStr(form.account_number),
        phone_number: safeStr(me?.phone_e164 || "") || undefined,
        country: safeStr(form.country) || undefined,
        currency: safeStr(form.currency).toUpperCase() || undefined,
        note: [
          safeStr(form.country) ? `Country: ${safeStr(form.country)}` : "",
          safeStr(form.currency) ? `Currency: ${safeStr(form.currency)}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
      };

      const saved = loadedFromServer
        ? await updateWithdrawalDestination(payload)
        : await saveWithdrawalDestination(payload);

      setProofFeedback({
        confirmation_message: safeStr(saved?.confirmation_message),
        verification_status: safeStr(saved?.verification_status),
        verification_note: safeStr(saved?.verification_note),
        trust_event_response: saved?.trust_event_response || null,
      });

      writeLocalPayout(form);
      setLoadedFromLocal(true);
      setLoadedFromServer(true);
      setErr("");
      setMsg(
        safeStr(saved?.confirmation_message) ||
          "Payout details saved on the system and kept locally for continuity."
      );
    } catch {
      setProofFeedback(null);
      setErr("Payout details could not be saved on the system.");
    }
  }

  function clearLocal() {
    try {
      removeLocalPayout();
      setLoadedFromLocal(false);

      setForm({
        account_name: safeStr(me?.account_name || ""),
        account_number: safeStr(me?.account_number || ""),
        bank_name: safeStr(me?.bank_name || ""),
        country: safeStr(me?.country || ""),
        currency: detectCurrency(me),
      });

      setErr("");
      setProofFeedback(null);
      setMsg("Local payout details cleared.");
    } catch {
      setErr("Local payout details could not be cleared.");
    }
  }

  function copySummary() {
    safeCopy(buildPayoutSummary(form));
    setErr("");
    setMsg("Payout summary copied.");
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        sectionLabel="Bank / Wallet Details"
        title="Bank / Wallet Details"
        subtitle="Choose where approved withdrawals should go after they leave the community settlement account."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/withdrawal-instructions"
        backLabel="Withdrawal Instructions"
      />

      <ExplainToggle
        label="What this screen does"
        what="This screen records the bank or wallet destination that should receive your approved withdrawals after they leave the community settlement account."
        why="It reduces payout confusion by making the destination clear before money moves and before you continue deeper into Money Out."
        next="Confirm the destination fields first, review today's handoff, and then return to Withdrawal Instructions or Loans and Support if more action is needed."
        tone="light"
        style={{ marginTop: 18 }}
      />

      {err ? <div style={{ ...feedbackCard(false), marginTop: 18 }}>{err}</div> : null}
      {msg ? <div style={{ ...feedbackCard(true), marginTop: 18 }}>{msg}</div> : null}
      {proofFeedback ? (
        <div
          style={{
            ...pageCard("#ECFDF5"),
            marginTop: 18,
            border: "1px solid #A7F3D0",
            color: "#065F46",
          }}
        >
          <div style={{ ...sectionLabel(), color: "#047857" }}>
            Trust event response
          </div>
          <div style={{ marginTop: 8, fontWeight: 1000, lineHeight: 1.55 }}>
            {safeStr(proofFeedback.confirmation_message) ||
              "Your payout destination has been recorded."}
          </div>
          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {safeStr(proofFeedback.verification_status) ? (
              <span style={badge(false)}>
                Status: {safeStr(proofFeedback.verification_status).replace(/_/g, " ")}
              </span>
            ) : null}
            {safeStr(proofFeedback.trust_event_response?.event_type) ? (
              <span style={badge(true)}>
                Event: {safeStr(proofFeedback.trust_event_response?.event_type)}
              </span>
            ) : null}
          </div>
          <div style={{ marginTop: 10, lineHeight: 1.7, fontWeight: 800 }}>
            {safeStr(proofFeedback.trust_event_response?.message) ||
              safeStr(proofFeedback.verification_note) ||
              "This proof is ready for the trust record when the matching flow writes the permanent event."}
          </div>
        </div>
      ) : null}

      <section
        style={{
          ...pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"),
          marginTop: 18,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>Payout destination</div>

            <div
              style={{
                marginTop: 10,
                fontSize: 30,
                fontWeight: 1000,
                color: "#F8FBFF",
                lineHeight: 1.15,
              }}
            >
              {nextStep.title}
            </div>

            <div style={{ marginTop: 10, color: "#D7E3F1", lineHeight: 1.8 }}>
              GSN does not hold funds as a custodian. When a withdrawal is processed,
              money should move from the community settlement account into your own
              registered payout account or wallet. Confirm here where your approved
              funds should go.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Context: {selectedCommunityLabel}</span>
              <span style={badge(false)}>
                Readiness: {completionCount}/5 fields complete
              </span>
              <span style={badge(false)}>
                Source: {loadedFromServer ? "System record" : loadedFromLocal ? "Local fallback" : "Profile defaults"}
              </span>
            </div>

            <div
              style={{
                marginTop: 16,
                color: "#D7E3F1",
                lineHeight: 1.75,
                fontWeight: 800,
              }}
            >
              Keep the route reading here. When you are ready to move, use the
              single <span style={{ fontWeight: 1000 }}>What happens next</span>
              section below so payout routing stays in one clear place.
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Today</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.65,
                }}
              >
                {nextStep.today}
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Tomorrow</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.65,
                }}
              >
                {nextStep.tomorrow}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ ...pageCard(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#F8FBFF" }}>
          Why this matters
        </div>

        <div style={{ marginTop: 10, color: "#475569", lineHeight: 1.8 }}>
          GSN does not hold funds as a custodian. When a withdrawal is processed,
          money should move from the community settlement account into your own
          registered payout account. This confirms where your approved
          funds should go.
        </div>
      </section>

      <section style={{ ...pageCard(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#F8FBFF" }}>
          Payout Account Details
        </div>

        <ExplainToggle
          label="What this does"
          what="This form records the bank or wallet destination that should receive your approved payout after funds leave the community settlement account."
          why="It keeps the destination clear before you rely on the withdrawal path."
          next="Enter the payout account carefully, save the details, and use the summary here to confirm that the destination is correct."
          tone="light"
          style={{ marginTop: 14 }}
        />

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
            gap: 12,
          }}
        >
          <input
            value={form.account_name}
            onChange={(e) => update("account_name", e.target.value)}
            placeholder="Account name"
            style={inputStyle()}
          />

          <input
            value={form.account_number}
            onChange={(e) => update("account_number", e.target.value)}
            placeholder="Account number / wallet number"
            style={inputStyle()}
          />

          <input
            value={form.bank_name}
            onChange={(e) => update("bank_name", e.target.value)}
            placeholder="Bank / wallet provider"
            style={inputStyle()}
          />

          <input
            value={form.country}
            onChange={(e) => update("country", e.target.value)}
            placeholder="Country"
            style={inputStyle()}
          />

          <select
            value={form.currency}
            onChange={(e) => update("currency", e.target.value)}
            style={inputStyle()}
          >
            <option value="GBP">GBP</option>
            <option value="NGN">NGN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="KES">KES</option>
            <option value="GHS">GHS</option>
          </select>
        </div>

        <div
          style={{
            marginTop: 16,
            color: "#64748b",
            lineHeight: 1.8,
          }}
        >
          These details are now stored on the system and can also stay locally on
          this device for continuity. External bank-account verification is still a
          separate connection, but this destination is now part of the real payout record.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            {...buttonGuardProps()}
            onClick={() => {
              void savePayout();
            }}
            style={primaryBtn(false)}
          >
            Save Payout Details
          </button>

          <button
            onClick={copySummary}
            style={secondaryBtn(false)}
          >
            Copy Summary
          </button>

          <button
            onClick={clearLocal}
            style={secondaryBtn(false)}
          >
            Clear Local Details
          </button>
        </div>
      </section>

      <section
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
          gap: 18,
        }}
      >
        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Current payout readiness</div>
          <div
            style={{
              marginTop: 10,
              color: "#F8FBFF",
              fontSize: 24,
              fontWeight: 1000,
            }}
          >
            {isReady ? "Ready for pilot flow" : "Needs completion"}
          </div>

          <div
            style={{
              marginTop: 10,
              color: "#475569",
              lineHeight: 1.8,
            }}
          >
            {isReady
              ? "The core payout fields are complete enough for the pilot withdrawal flow."
              : "Complete all core payout fields before relying on the withdrawal path."}
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Stored summary</div>
          <div
            style={{
              marginTop: 10,
              color: "#475569",
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
            }}
          >
            {buildPayoutSummary(form)}
          </div>
        </div>
      </section>

      <section style={{ ...pageCard(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#F8FBFF" }}>
          What happens next
        </div>

        <div style={{ marginTop: 10, color: "#475569", lineHeight: 1.8 }}>
          Once your payout destination is complete, return to Withdrawal Instructions
          when the support route is approved. That page will tell you how approved
          value should move into this destination.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <OriginLink to="/app/withdrawal-instructions" style={primaryBtn(false)}>
            Open Withdrawal Instructions
          </OriginLink>
          <OriginLink to="/app/loans" style={secondaryBtn(false)}>
            Return to Loans & Support
          </OriginLink>
        </div>
      </section>
    </div>
  );
}
