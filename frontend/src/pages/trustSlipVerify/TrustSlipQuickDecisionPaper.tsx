import React, { useState } from "react";
import { GsnRealisticIcon } from "../../components/GsnRealisticIcon";
import { PrimaryButton, StableCtaLink, SubtleButton } from "../../components/StableButton";

type Props = {
  validNow: boolean;
  validityLabel: string;
  holderName: string;
  communityLabel: string;
  supportLine: string;
  reasonRows: Array<[string, string]>;
  evidenceRows: Array<[string, string]>;
  sourceRows: Array<[string, string]>;
  resolvedCode: string;
  canAskCommunity: boolean;
  confirmationBusy: boolean;
  requestLockedReason: string;
  memberCredentialPath: string;
  onAskCommunity: () => void;
};

const labelStyle: React.CSSProperties = {
  color: "#526579",
  fontSize: 10,
  fontWeight: 1000,
  textTransform: "uppercase",
};

export default function TrustSlipQuickDecisionPaper(props: Props) {
  const [step, setStep] = useState<number | null>(null);
  const steps = [
    { title: "Why this result", summary: props.supportLine, rows: props.reasonRows.slice(0, 2) },
    { title: "Evidence checked", summary: "The strongest useful signals for this decision.", rows: props.evidenceRows.slice(0, 3) },
    {
      title: "Source and date",
      summary: "Where this reading came from and whether it is current.",
      rows: [...props.sourceRows.slice(0, 3), ["Record", props.resolvedCode || "Current TrustSlip"]] as Array<[string, string]>,
    },
    {
      title: "Scope",
      summary: "A short boundary for using this result well.",
      rows: [
        ["Community", `This result belongs to ${props.communityLabel}.`],
        ["Private details", "Notes, contacts, payments and addresses stay protected."],
        ["Decision", "Use this evidence to decide, and ask the community when the decision is important."],
      ] as Array<[string, string]>,
    },
  ];
  const activeStep = step === null ? null : steps[step];
  const hasSeparatePrimaryAction = props.canAskCommunity || Boolean(props.memberCredentialPath);

  const primaryAction = props.canAskCommunity ? (
    <PrimaryButton debugId="trust-slip-verify.public.quick-decision.ask-community" stableHeight={50} busy={props.confirmationBusy} busyLabel="Requesting..." disabled={Boolean(props.requestLockedReason)} onClick={props.onAskCommunity} fullWidth style={{ justifyContent: "center", borderRadius: 14 }}>
      Ask community
    </PrimaryButton>
  ) : props.memberCredentialPath ? (
    <StableCtaLink to={props.memberCredentialPath} kind="primary" stableHeight={50} debugId="trust-slip-verify.public.quick-decision.check-membership" style={{ width: "100%", borderRadius: 14, fontWeight: 1000 }}>
      Check membership
    </StableCtaLink>
  ) : (
    <PrimaryButton debugId="trust-slip-verify.public.quick-decision.review-evidence" stableHeight={50} onClick={() => setStep(0)} fullWidth style={{ justifyContent: "center", borderRadius: 14 }}>
      Review evidence
    </PrimaryButton>
  );

  return (
    <section
      className="print-trust-document"
      data-gsn-trustslip-certificate="quick-decision"
      data-gsn-public-mobile-full-evidence="one-step-reader"
      style={{ maxWidth: 560, margin: "0 auto", borderRadius: 24, overflow: "hidden", border: "1px solid rgba(214,170,69,0.42)", background: "#FFFFFF", boxShadow: "0 18px 40px rgba(7,23,44,0.12)" }}
    >
      <header style={{ minHeight: 66, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "linear-gradient(135deg, #061827 0%, #082A48 100%)", color: "#FFFFFF" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <span aria-hidden style={{ width: 40, height: 40, flex: "0 0 auto", borderRadius: 12, border: "1px solid rgba(246,215,122,0.55)", display: "grid", placeItems: "center" }}>
            <GsnRealisticIcon name="trust-shield" size={33} decorative />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", color: "#F6D77A", fontSize: 10, fontWeight: 1000, textTransform: "uppercase" }}>Public TrustSlip</span>
            <span style={{ display: "block", marginTop: 2, fontSize: 14, fontWeight: 1000 }}>{activeStep ? "Evidence review" : "Quick decision"}</span>
          </span>
        </div>
        <span style={{ borderRadius: 10, padding: "6px 9px", background: props.validNow ? "#EEF9F1" : "#FFF7E6", color: props.validNow ? "#166534" : "#92400E", fontSize: 10.5, fontWeight: 1000, textAlign: "center" }}>
          {props.validityLabel}
        </span>
      </header>

      {activeStep && step !== null ? (
        <div data-gsn-public-evidence-step={step + 1} style={{ padding: 16, display: "grid", gap: 14 }}>
          <div>
            <div style={{ ...labelStyle, color: "#0B63D1" }}>Step {step + 1} of {steps.length}</div>
            <h1 style={{ margin: "5px 0 0", color: "#07172C", fontSize: 24, lineHeight: 1.05, fontWeight: 1000 }}>{activeStep.title}</h1>
            <p style={{ margin: "7px 0 0", color: "#526579", fontSize: 13, lineHeight: 1.38, fontWeight: 800 }}>{activeStep.summary}</p>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {activeStep.rows.map(([label, value]) => (
              <div key={`${activeStep.title}-${label}`} style={{ borderRadius: 14, border: "1px solid rgba(37,78,119,0.12)", background: "#F8FBFF", padding: "10px 11px" }}>
                <div style={labelStyle}>{label}</div>
                <div style={{ marginTop: 4, color: "#07172C", fontSize: 13, lineHeight: 1.34, fontWeight: 900 }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 8 }}>
            <SubtleButton type="button" debugId="trust-slip-verify.public.evidence-step.previous" stableHeight={48} fullWidth onClick={() => setStep((current) => current === null || current <= 0 ? null : current - 1)} style={{ borderRadius: 13 }}>
              {step === 0 ? "Decision" : "Back"}
            </SubtleButton>
            <PrimaryButton type="button" debugId="trust-slip-verify.public.evidence-step.next" stableHeight={48} fullWidth onClick={() => setStep((current) => current === null || current >= steps.length - 1 ? null : current + 1)} style={{ justifyContent: "center", borderRadius: 13 }}>
              {step === steps.length - 1 ? "Back to decision" : "Next"}
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <div data-gsn-public-decision-first="one-answer-one-action" style={{ padding: 16, display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "50px minmax(0, 1fr)", gap: 11, alignItems: "center" }}>
            <span aria-hidden style={{ width: 50, height: 50, borderRadius: 15, display: "grid", placeItems: "center", background: props.validNow ? "#EEF9F1" : "#FFF7E6" }}>
              <GsnRealisticIcon name={props.validNow ? "community-building" : "vault-safe"} size={40} decorative />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...labelStyle, color: props.validNow ? "#166534" : "#92400E" }}>Result</div>
              <h1 style={{ margin: "3px 0 0", color: "#07172C", fontSize: 26, lineHeight: 1.02, fontWeight: 1000 }}>{props.validNow ? "Known in this community" : "Fresh check needed"}</h1>
            </div>
          </div>
          <div data-gsn-trustslip-certificate-facts="person-community-only" style={{ borderRadius: 16, border: "1px solid rgba(214,170,69,0.24)", background: "#FFFDF7", padding: "11px 12px", display: "grid", gap: 8 }}>
            <div><div style={{ ...labelStyle, color: "#7A4A00" }}>Person</div><div style={{ marginTop: 2, color: "#07172C", fontSize: 17, fontWeight: 1000 }}>{props.holderName}</div></div>
            <div style={{ borderTop: "1px solid rgba(214,170,69,0.18)", paddingTop: 8 }}><div style={{ ...labelStyle, color: "#7A4A00" }}>Community</div><div style={{ marginTop: 2, color: "#07172C", fontSize: 14, fontWeight: 950 }}>{props.communityLabel}</div></div>
          </div>
          <div style={{ borderRadius: 14, background: "#F1F7FD", padding: "10px 11px" }}>
            <div style={{ ...labelStyle, color: "#0B63D1" }}>Recommended next</div>
            <div style={{ marginTop: 3, color: "#07172C", fontSize: 14, lineHeight: 1.3, fontWeight: 950 }}>{props.validNow ? "Ask the community before an important decision." : "Ask the holder for a fresh TrustSlip."}</div>
          </div>
          <div data-gsn-public-phone-primary-action="one-next-step" style={{ display: "grid", gap: 8 }}>
            {primaryAction}
            {hasSeparatePrimaryAction ? <SubtleButton type="button" debugId="trust-slip-verify.public.quick-decision.review-evidence" stableHeight={44} fullWidth onClick={() => setStep(0)} style={{ borderRadius: 13 }}>Review evidence</SubtleButton> : null}
          </div>
        </div>
      )}
    </section>
  );
}
