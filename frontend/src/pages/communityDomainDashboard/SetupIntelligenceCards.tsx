import React from "react";

type SetupIntelligenceCardsProps = {
  isBaseReadinessLoading?: boolean;
  setupReadiness?: any;
  setupPlan?: any;
};

function cleanText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function compactStatus(value: unknown): string {
  return cleanText(value, "not recorded").replace(/_/g, " ");
}

function countValue(value: unknown): string {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? String(numberValue) : "0";
}

function whiteCard(): React.CSSProperties {
  return {
    borderRadius: 24,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid rgba(255,255,255,0.78)",
    boxShadow: "0 18px 42px rgba(6,20,38,0.10)",
    padding: 18,
    color: "#091B2E",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#506A82",
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#4F647A",
    fontSize: 14,
    lineHeight: 1.65,
  };
}

function statusBadge(status: unknown): React.CSSProperties {
  const text = cleanText(status).toLowerCase();
  const warning =
    text.includes("draft") ||
    text.includes("quote") ||
    text.includes("not") ||
    text.includes("needs") ||
    text.includes("pending") ||
    text.includes("optional") ||
    text.includes("read only");
  const danger = text.includes("suspended") || text.includes("expired") || text.includes("closed");
  const palette = danger
    ? { bg: "rgba(153,27,27,0.10)", color: "#991B1B", border: "rgba(153,27,27,0.20)" }
    : warning
    ? { bg: "rgba(146,94,8,0.11)", color: "#925E08", border: "rgba(146,94,8,0.22)" }
    : { bg: "rgba(22,101,52,0.10)", color: "#166534", border: "rgba(22,101,52,0.22)" };

  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: palette.bg,
    color: palette.color,
    border: `1px solid ${palette.border}`,
    fontSize: 12,
    fontWeight: 900,
    textTransform: "capitalize",
  };
}

function setupReadinessItems(setupReadiness: any): any[] {
  return Array.isArray(setupReadiness?.items) ? setupReadiness.items : [];
}

function setupPlanSteps(setupPlan: any): any[] {
  return Array.isArray(setupPlan?.steps) ? setupPlan.steps : [];
}

export default function CommunityDomainSetupIntelligenceCards({
  isBaseReadinessLoading = false,
  setupReadiness,
  setupPlan,
}: SetupIntelligenceCardsProps): React.ReactElement {
  const blockedSetupReadinessItems = setupReadinessItems(setupReadiness).filter(
    (item) => !item.ready
  );
  const visibleSetupPlanSteps = setupPlanSteps(setupPlan);
  const openSetupPlanSteps = visibleSetupPlanSteps.filter((step) => !step.completed);

  return (
    <>
      <div style={whiteCard()}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={sectionLabel()}>Setup readiness</div>
          <h2 style={{ margin: 0, fontSize: 23, lineHeight: 1.12 }}>
            {isBaseReadinessLoading && !setupReadiness
              ? "Loading readiness checks"
              : setupReadiness
              ? `${countValue(setupReadiness.ready_total)} of ${countValue(
                  setupReadiness.total
                )} checks ready`
              : "Readiness is not loaded"}
          </h2>
          <div style={helperText()}>
            {isBaseReadinessLoading && !setupReadiness
              ? "GSN is loading the setup checklist while the main Community Domain dashboard remains usable."
              : setupReadiness
              ? `${countValue(
                  setupReadiness.blocked_total
                )} setup checks still need attention before this domain is ready.`
              : "GSN could not load the setup checklist for this view."}
          </div>
          {blockedSetupReadinessItems.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {blockedSetupReadinessItems.slice(0, 3).map((item) => (
                <div
                  key={cleanText(item.lane_key, cleanText(item.label, "setup-check"))}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    gap: 10,
                    alignItems: "center",
                    borderRadius: 14,
                    border: "1px solid rgba(146,94,8,0.16)",
                    background: "rgba(255,247,226,0.62)",
                    padding: "10px 10px 10px 12px",
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 950 }}>
                      {cleanText(item.label, "Setup check")}
                    </span>
                    <span
                      style={{
                        display: "block",
                        color: "#4F647A",
                        fontSize: 12.5,
                        lineHeight: 1.45,
                        marginTop: 3,
                      }}
                    >
                      {cleanText(item.next_step, "Review this setup area before launch.")}
                    </span>
                  </span>
                  <span style={statusBadge(item.state)}>{compactStatus(item.state)}</span>
                </div>
              ))}
            </div>
          ) : setupReadiness ? (
            <div style={{ ...helperText(), fontSize: 13 }}>
              No setup blocker is visible in this readiness checklist.
            </div>
          ) : null}
          <div style={{ ...helperText(), fontSize: 13 }}>
            This checklist only shows setup gaps. It does not change membership,
            billing, authority, payments, or private evidence.
          </div>
        </div>
      </div>

      <div style={whiteCard()}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={sectionLabel()}>Setup plan</div>
          <h2 style={{ margin: 0, fontSize: 23, lineHeight: 1.12 }}>
            {isBaseReadinessLoading && !setupPlan
              ? "Loading setup plan"
              : setupPlan
              ? `${countValue(setupPlan.completed_steps)} of ${countValue(
                  visibleSetupPlanSteps.length
                )} steps complete`
              : "Setup plan is not loaded"}
          </h2>
          <div style={helperText()}>
            {isBaseReadinessLoading && !setupPlan
              ? "GSN is loading the setup plan while the main Community Domain dashboard remains usable."
              : setupPlan
              ? `Current phase: ${compactStatus(setupPlan.setup_phase)}. ${cleanText(
                  setupPlan.primary_next_action?.label,
                  "Review the next setup step with a Community Domain admin."
                )}.`
              : "GSN could not load the setup plan for this view."}
          </div>
          {openSetupPlanSteps.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {openSetupPlanSteps.slice(0, 3).map((step) => {
                const missingCount = Array.isArray(step.missing_items)
                  ? step.missing_items.length
                  : 0;
                return (
                  <div
                    key={cleanText(step.step_key, cleanText(step.label, "setup-step"))}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      gap: 10,
                      alignItems: "center",
                      borderRadius: 14,
                      border: "1px solid rgba(9,27,46,0.10)",
                      background: "rgba(255,255,255,0.72)",
                      padding: "10px 10px 10px 12px",
                    }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 950 }}>
                        {cleanText(step.label, compactStatus(step.step_key || "Setup step"))}
                      </span>
                      <span
                        style={{
                          display: "block",
                          color: "#4F647A",
                          fontSize: 12.5,
                          lineHeight: 1.45,
                          marginTop: 3,
                        }}
                      >
                        {missingCount
                          ? `${countValue(missingCount)} missing item${
                              missingCount === 1 ? "" : "s"
                            } before this step is complete.`
                          : "This step still needs owner/admin review before completion is relied on."}
                      </span>
                    </span>
                    <span style={statusBadge(step.requires_admin ? "admin guided" : "view only")}>
                      {step.requires_admin ? "Admin" : "View only"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : setupPlan ? (
            <div style={{ ...helperText(), fontSize: 13 }}>
              No open setup step is visible in this setup plan.
            </div>
          ) : null}
          <div style={{ ...helperText(), fontSize: 13 }}>
            This plan only shows next setup steps. It does not change structure,
            policy, billing, public pages, money, or private evidence.
          </div>
        </div>
      </div>
    </>
  );
}
