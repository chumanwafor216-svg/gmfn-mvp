import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { GsnRealisticIcon } from "../components/GsnRealisticIcon";
import PageTopNav from "../components/PageTopNav";
import { StableButton } from "../components/StableButton";
import {
  getPublicBeneficiaryOutcomeConfirmation,
  respondPublicBeneficiaryOutcomeConfirmation,
} from "../lib/api";

type ResponseOption = {
  value: "confirm" | "partly_confirm" | "challenge" | "cannot_confirm";
  label: string;
  note: string;
};

const RESPONSE_OPTIONS: ResponseOption[] = [
  {
    value: "confirm",
    label: "Confirm",
    note: "The support and result shown here are correct.",
  },
  {
    value: "partly_confirm",
    label: "Partly confirm",
    note: "Some of this is correct, but something needs review.",
  },
  {
    value: "challenge",
    label: "Challenge",
    note: "This record is wrong or should not be relied on as written.",
  },
  {
    value: "cannot_confirm",
    label: "Cannot confirm",
    note: "You cannot safely confirm this record now.",
  },
];

function safeText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function errorMessage(error: any): string {
  const message = safeText(error?.message || error);
  return message || "GSN could not load this confirmation link.";
}

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #061827 0%, #0A2237 42%, #F5F0E6 42%, #F5F0E6 100%)",
    color: "#091B2E",
  };
}

function pageInner(): React.CSSProperties {
  return {
    maxWidth: 880,
    margin: "0 auto",
    padding: "20px 16px 44px",
    display: "grid",
    gap: 16,
  };
}

function card(): React.CSSProperties {
  return {
    borderRadius: 24,
    background: "#FFFFFF",
    border: "1px solid rgba(9,27,46,0.12)",
    boxShadow: "0 22px 60px rgba(2,14,24,0.18)",
    padding: 18,
    display: "grid",
    gap: 14,
  };
}

function softCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    background: "#F8FBFF",
    border: "1px solid rgba(9,27,46,0.1)",
    padding: 14,
    display: "grid",
    gap: 8,
  };
}

function label(): React.CSSProperties {
  return {
    color: "#A67C00",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function helper(): React.CSSProperties {
  return {
    color: "rgba(9,27,46,0.68)",
    fontSize: 14,
    lineHeight: 1.45,
  };
}

function field(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 46,
    borderRadius: 14,
    border: "1px solid rgba(9,27,46,0.16)",
    background: "#FFFFFF",
    color: "#091B2E",
    font: "inherit",
    fontSize: 16,
    padding: "10px 12px",
    boxSizing: "border-box",
  };
}

function badge(tone: string): React.CSSProperties {
  const positive = tone.includes("confirm");
  const caution = tone.includes("partly") || tone.includes("review");
  const danger = tone.includes("challenge") || tone.includes("expired");
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 900,
    color: danger ? "#7A1F1F" : positive ? "#155A32" : caution ? "#6B4A00" : "#1B3654",
    background: danger
      ? "#FFEAEA"
      : positive
        ? "#EAF8EF"
        : caution
          ? "#FFF4D6"
          : "#EAF2FF",
    border: "1px solid rgba(9,27,46,0.08)",
  };
}

export default function BeneficiaryOutcomeConfirmationPage() {
  const { token } = useParams();
  const publicToken = safeText(token);
  const [record, setRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [responseType, setResponseType] =
    useState<ResponseOption["value"]>("confirm");
  const [responderName, setResponderName] = useState("");
  const [note, setNote] = useState("");
  const [correctionNote, setCorrectionNote] = useState("");
  const [submitted, setSubmitted] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!publicToken) {
        setLoading(false);
        setMessage("This confirmation link is missing its token.");
        return;
      }
      setLoading(true);
      setMessage("");
      try {
        const payload = await getPublicBeneficiaryOutcomeConfirmation(publicToken);
        if (!cancelled) setRecord(payload);
      } catch (error: any) {
        if (!cancelled) setMessage(errorMessage(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [publicToken]);

  const selectedOption = useMemo(
    () => RESPONSE_OPTIONS.find((item) => item.value === responseType) || RESPONSE_OPTIONS[0],
    [responseType]
  );

  const domainName = safeText(
    record?.community_domain?.display_name,
    safeText(record?.community_domain?.domain_name, "this Community Domain")
  );
  const outcome = record?.outcome || {};
  const alreadyResponded = safeText(record?.status).toLowerCase() === "responded";

  async function submitResponse() {
    if (!publicToken || submitting || submitted || alreadyResponded) return;
    setSubmitting(true);
    setMessage("");
    try {
      const payload = await respondPublicBeneficiaryOutcomeConfirmation(publicToken, {
        response_type: responseType,
        responder_name: responderName,
        note,
        correction_note: correctionNote,
      });
      setSubmitted(payload);
      setMessage("Your response has been recorded as a GSN Trust Event.");
    } catch (error: any) {
      setMessage(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={pageShell()}>
      <PageTopNav
        sectionLabel="Public confirmation"
        title="GSN confirmation"
        subtitle="Private outcome review"
      />
      <main style={pageInner()}>
        <section
          style={{
            display: "grid",
            gap: 12,
            padding: "14px 2px 4px",
            color: "#FFFFFF",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                background: "rgba(255,255,255,0.12)",
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <GsnRealisticIcon name="certificate-seal" size={44} />
            </div>
            <div>
              <div style={{ ...label(), color: "#E4B73C" }}>Private evidence link</div>
              <h1 style={{ margin: "3px 0 0", fontSize: 30, lineHeight: 1.05 }}>
                Confirm a beneficiary outcome.
              </h1>
            </div>
          </div>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.82)", lineHeight: 1.5 }}>
            Review the record below and choose the honest answer. Your response
            becomes evidence, but it does not rewrite the original record.
          </p>
        </section>

        <section style={card()}>
          {loading ? (
            <div style={helper()}>Loading confirmation record...</div>
          ) : message && !record ? (
            <div style={softCard()}>
              <div style={label()}>Could not open link</div>
              <h2 style={{ margin: 0, fontSize: 22 }}>This link cannot be used.</h2>
              <div style={helper()}>{message}</div>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <span style={badge(safeText(record?.status, "open"))}>
                  {safeText(record?.status, "open").replace(/_/g, " ")}
                </span>
                <span style={badge(safeText(record?.responder_type, "responder"))}>
                  {safeText(record?.responder_type, "responder").replace(/_/g, " ")}
                </span>
              </div>

              <div>
                <div style={label()}>Organization</div>
                <h2 style={{ margin: "4px 0 0", fontSize: 24, lineHeight: 1.12 }}>
                  {domainName}
                </h2>
              </div>

              <div style={softCard()}>
                <div style={label()}>Outcome shown for confirmation</div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>
                  {safeText(outcome?.outcome_indicator, "Outcome indicator not shown")}
                </div>
                <div style={helper()}>
                  Programme: {safeText(outcome?.programme_label, "Not shown")}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
                    gap: 10,
                  }}
                >
                  <div style={softCard()}>
                    <div style={label()}>Before</div>
                    <div style={helper()}>
                      {safeText(outcome?.baseline_value, "Baseline not shown")}
                    </div>
                  </div>
                  <div style={softCard()}>
                    <div style={label()}>After</div>
                    <div style={helper()}>
                      {safeText(outcome?.after_value, "After value not shown")}
                    </div>
                  </div>
                </div>
                <div style={helper()}>
                  Support recorded: {safeText(outcome?.support_received, "Not shown")}
                </div>
              </div>

              {submitted ? (
                <div style={{ ...softCard(), background: "#EAF8EF" }}>
                  <div style={label()}>Response recorded</div>
                  <h3 style={{ margin: 0, fontSize: 22 }}>
                    Thank you. Your answer is now part of the evidence trail.
                  </h3>
                  <div style={helper()}>
                    Response: {safeText(submitted?.response_type).replace(/_/g, " ")}.
                    Confirmation state:{" "}
                    {safeText(submitted?.confirmation_state).replace(/_/g, " ")}.
                  </div>
                </div>
              ) : alreadyResponded ? (
                <div style={{ ...softCard(), background: "#EAF8EF" }}>
                  <div style={label()}>Already answered</div>
                  <h3 style={{ margin: 0, fontSize: 22 }}>
                    This confirmation link already has a recorded response.
                  </h3>
                  <div style={helper()}>
                    GSN keeps the first answer as the evidence record for this
                    private link. Ask the organization for a new review link if
                    something still needs correction.
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={label()}>Your answer</div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
                      gap: 8,
                    }}
                  >
                    {RESPONSE_OPTIONS.map((option) => {
                      const selected = option.value === responseType;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setResponseType(option.value)}
                          style={{
                            borderRadius: 16,
                            border: selected
                              ? "2px solid #B8860B"
                              : "1px solid rgba(9,27,46,0.14)",
                            background: selected ? "#FFF8E8" : "#FFFFFF",
                            padding: 12,
                            minHeight: 92,
                            textAlign: "left",
                            cursor: "pointer",
                            color: "#091B2E",
                            font: "inherit",
                          }}
                        >
                          <div style={{ fontWeight: 950 }}>{option.label}</div>
                          <div style={{ ...helper(), marginTop: 4, fontSize: 13 }}>
                            {option.note}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div style={helper()}>{selectedOption.note}</div>

                  <input
                    value={responderName}
                    onChange={(event) => setResponderName(event.target.value)}
                    placeholder="Your name, optional"
                    style={field()}
                  />
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Short note, optional"
                    style={{ ...field(), minHeight: 92, resize: "vertical" }}
                  />
                  {(responseType === "partly_confirm" || responseType === "challenge") ? (
                    <textarea
                      value={correctionNote}
                      onChange={(event) => setCorrectionNote(event.target.value)}
                      placeholder="What should be corrected or reviewed?"
                      style={{ ...field(), minHeight: 92, resize: "vertical" }}
                    />
                  ) : null}

                  <StableButton
                    type="button"
                    kind="primary"
                    stableHeight={48}
                    disabled={submitting}
                    debugId="beneficiary-outcome-confirmation.submit"
                    onClick={() => {
                      void submitResponse();
                    }}
                  >
                    {submitting ? "Recording..." : "Submit response"}
                  </StableButton>
                </div>
              )}

              {message ? <div style={helper()}>{message}</div> : null}

              <div style={{ ...softCard(), background: "#FFF8E8" }}>
                <div style={label()}>Boundary</div>
                <div style={helper()}>
                  This private link records your answer as a Trust Event. It does
                  not publish your case publicly, does not make a payment decision,
                  and does not delete the original admin record.
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
