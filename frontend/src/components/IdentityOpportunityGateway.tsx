import React from "react";
import { GsnRealisticIcon, type Gsn3DIconKey } from "./GsnRealisticIcon";
import { StableCtaLink, StableDisclosureSummary } from "./StableButton";

export type IdentityOpportunityAction = {
  key: string;
  label: string;
  to: string;
  debugId: string;
  icon: Gsn3DIconKey;
  kind?: "primary" | "secondary" | "soft";
};

type IdentityOpportunityGatewayProps = {
  audience: "owner" | "public";
  compact: boolean;
  title: string;
  description: string;
  actions: IdentityOpportunityAction[];
  collapseAll?: boolean;
  collapseSecondary?: boolean;
  secondaryLabel?: string;
  emptyMessage?: string;
};

function OpportunityAction({
  action,
  compact,
}: {
  action: IdentityOpportunityAction;
  compact: boolean;
}) {
  return (
    <StableCtaLink
      to={action.to}
      kind={action.kind || "secondary"}
      stableHeight={compact ? 52 : 56}
      fullWidth
      debugId={action.debugId}
      style={{
        borderRadius: 15,
        justifyContent: "flex-start",
        gap: 10,
        padding: compact ? "8px 12px" : "9px 14px",
        fontWeight: 1000,
        textAlign: "left",
      }}
    >
      <GsnRealisticIcon
        name={action.icon}
        size={compact ? 34 : 38}
        decorative
        style={{ background: "rgba(255,255,255,0.88)" }}
      />
      <span>{action.label}</span>
    </StableCtaLink>
  );
}

export default function IdentityOpportunityGateway({
  audience,
  compact,
  title,
  description,
  actions,
  collapseAll = false,
  collapseSecondary = false,
  secondaryLabel = "More ways to use this GSN ID",
  emptyMessage = "No additional public opportunity is available from this card yet.",
}: IdentityOpportunityGatewayProps) {
  const primaryAction = collapseAll ? null : actions[0] || null;
  const secondaryActions = collapseAll ? actions : actions.slice(1);
  const coverActions = collapseAll || collapseSecondary;

  return (
    <section
      data-gsn-identity-opportunity-gateway={audience}
      style={{
        borderRadius: compact ? 22 : 26,
        border: "1px solid rgba(214,170,69,0.34)",
        background:
          "linear-gradient(145deg, #FFFFFF 0%, #F8FBFF 64%, #FFF8E7 100%)",
        boxShadow: "0 16px 38px rgba(7,23,44,0.10)",
        padding: compact ? 14 : 20,
        display: "grid",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "48px minmax(0, 1fr)" : "58px minmax(0, 1fr)",
          gap: compact ? 10 : 14,
          alignItems: "center",
        }}
      >
        <GsnRealisticIcon
          name="public-globe"
          size={compact ? 48 : 58}
          decorative
          style={{ background: "#F8FBFF" }}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: "#9A6A12",
              fontSize: compact ? 9 : 10,
              fontWeight: 1000,
              letterSpacing: 1.1,
              textTransform: "uppercase",
            }}
          >
            GSN Opportunity Gateway
          </div>
          <h2
            style={{
              margin: "4px 0 0",
              color: "#07172C",
              fontSize: compact ? 19 : 23,
              lineHeight: 1.08,
            }}
          >
            {title}
          </h2>
        </div>
      </div>

      <p
        style={{
          margin: 0,
          color: "#526174",
          fontSize: compact ? 13 : 14,
          fontWeight: 760,
          lineHeight: 1.42,
        }}
      >
        {description}
      </p>

      {primaryAction ? <OpportunityAction action={primaryAction} compact={compact} /> : actions.length === 0 ? (
        <div
          style={{
            borderRadius: 14,
            background: "#F8FBFF",
            border: "1px solid rgba(37,78,119,0.12)",
            color: "#617085",
            padding: 12,
            fontSize: 13,
            fontWeight: 820,
            lineHeight: 1.35,
          }}
        >
          {emptyMessage}
        </div>
      ) : null}

      {secondaryActions.length > 0 && coverActions ? (
        <details
          data-gsn-identity-opportunity-secondary="covered"
          data-gsn-identity-opportunity-all={collapseAll ? "covered" : undefined}
        >
          <StableDisclosureSummary
            stableHeight={compact ? 52 : 56}
            debugId={`identity-opportunity-gateway.${audience}.more`}
            style={{
              borderRadius: 15,
              border: "1px solid rgba(154,106,18,0.52)",
              background: "linear-gradient(135deg, #F8D978 0%, #D6AA45 100%)",
              boxShadow: "0 10px 22px rgba(154,106,18,0.22)",
              color: "#07172C",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 10,
              padding: compact ? "8px 12px" : "9px 14px",
              fontSize: compact ? 12.5 : 14,
              fontWeight: 1000,
              lineHeight: 1.15,
            }}
          >
            <GsnRealisticIcon
              name="public-globe"
              size={compact ? 34 : 38}
              decorative
              style={{ background: "rgba(255,255,255,0.9)" }}
            />
            <span>{secondaryLabel}</span>
          </StableDisclosureSummary>
          <div
            style={{
              marginTop: 8,
              display: "grid",
              gridTemplateColumns: compact ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {secondaryActions.map((action) => (
              <OpportunityAction key={action.key} action={action} compact={compact} />
            ))}
          </div>
        </details>
      ) : secondaryActions.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          {secondaryActions.map((action) => (
            <OpportunityAction key={action.key} action={action} compact={compact} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
