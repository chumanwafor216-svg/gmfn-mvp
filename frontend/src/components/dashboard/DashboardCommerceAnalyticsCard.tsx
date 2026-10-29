import React, { useMemo } from "react";
import { GsnLegacyIcon } from "../GsnLegacyIcon";
import { StableButton } from "../StableButton";

type CommerceEvidenceCounts = {
  shop_visits_7d?: number | null;
  product_opens_7d?: number | null;
  spotlight_shop_clicks_7d?: number | null;
  contact_taps_7d?: number | null;
};

type DashboardCommerceAnalyticsCardProps = {
  evidenceCounts?: CommerceEvidenceCounts | null;
  actionLabel: string;
  actionRoute: string;
  isPhone: boolean;
  onOpenRoute: (
    event: React.MouseEvent<HTMLButtonElement>,
    route: string
  ) => void;
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
};

function attentionCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function metricBarWidth(value: number, maximum: number): string {
  if (value <= 0 || maximum <= 0) return "6%";
  return `${Math.max(14, Math.round((value / maximum) * 100))}%`;
}

export default function DashboardCommerceAnalyticsCard({
  evidenceCounts,
  actionLabel,
  actionRoute,
  isPhone,
  onOpenRoute,
  onPointerDown,
}: DashboardCommerceAnalyticsCardProps) {
  const metrics = useMemo(
    () => [
      {
        key: "visits",
        label: "Visits",
        value: attentionCount(evidenceCounts?.shop_visits_7d),
        color: "#1769C2",
        wash: "linear-gradient(180deg, #F8FBFF 0%, #EDF5FF 100%)",
      },
      {
        key: "opens",
        label: "Item opens",
        value: attentionCount(evidenceCounts?.product_opens_7d),
        color: "#B47A10",
        wash: "linear-gradient(180deg, #FFFDF7 0%, #FFF7DE 100%)",
      },
      {
        key: "spotlight",
        label: "Spotlight clicks",
        value: attentionCount(evidenceCounts?.spotlight_shop_clicks_7d),
        color: "#0F766E",
        wash: "linear-gradient(180deg, #F6FFFC 0%, #E7F8F2 100%)",
      },
      {
        key: "contacts",
        label: "Contact taps",
        value: attentionCount(evidenceCounts?.contact_taps_7d),
        color: "#6D4AAF",
        wash: "linear-gradient(180deg, #FCFAFF 0%, #F1ECFF 100%)",
      },
    ],
    [evidenceCounts]
  );
  const maximum = Math.max(0, ...metrics.map((metric) => metric.value));
  const analyticsRoute = actionRoute.includes("shop-control#shop-control-counts");
  const visibleActionLabel = analyticsRoute ? "View Analytics" : actionLabel;

  if (!actionRoute || !visibleActionLabel) return null;

  return (
    <div
      data-dashboard-shop-analytics="real-commerce-signal"
      style={{
        marginTop: 12,
        borderRadius: isPhone ? 18 : 20,
        border: "1px solid rgba(15,59,116,0.13)",
        background: "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.92), 0 16px 30px rgba(2,12,27,0.08)",
        padding: isPhone ? 12 : 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div
            aria-hidden="true"
            style={{
              width: 42,
              height: 42,
              flex: "0 0 42px",
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              border: "1px solid rgba(184,137,45,0.18)",
              background: "linear-gradient(180deg, #FFF9E8 0%, #FCEBB6 100%)",
              boxShadow: "0 8px 16px rgba(184,137,45,0.12)",
            }}
          >
            <GsnLegacyIcon name="chart" size={27} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: "#0B1F33",
                fontSize: isPhone ? 17 : 18,
                fontWeight: 950,
                lineHeight: 1.1,
              }}
            >
              Shop Analytics
            </div>
            <div
              style={{
                marginTop: 3,
                color: "#526B84",
                fontSize: isPhone ? 11.5 : 12,
                fontWeight: 700,
                lineHeight: 1.3,
              }}
            >
              See what is working in your shop.
            </div>
          </div>
        </div>

        <div
          style={{
            flex: "0 0 auto",
            borderRadius: 999,
            border: "1px solid rgba(15,59,116,0.12)",
            background: "#FFFFFF",
            color: "#173654",
            padding: "7px 10px",
            fontSize: 11,
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
        >
          Last 7 days
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: isPhone ? 6 : 8,
        }}
      >
        {metrics.map((metric) => (
          <div
            key={metric.key}
            style={{
              minWidth: 0,
              minHeight: isPhone ? 92 : 98,
              borderRadius: isPhone ? 13 : 15,
              border: "1px solid rgba(15,59,116,0.10)",
              background: metric.wash,
              padding: isPhone ? "9px 7px" : "10px 9px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                color: "#526B84",
                fontSize: isPhone ? 9.5 : 10.5,
                fontWeight: 850,
                lineHeight: 1.15,
                minHeight: 23,
              }}
            >
              {metric.label}
            </div>
            <div
              style={{
                color: "#0B1F33",
                fontSize: isPhone ? 20 : 23,
                fontWeight: 950,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {metric.value.toLocaleString()}
            </div>
            <div
              aria-hidden="true"
              style={{
                height: 5,
                borderRadius: 999,
                background: "rgba(15,59,116,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: metricBarWidth(metric.value, maximum),
                  height: "100%",
                  borderRadius: 999,
                  background: metric.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 9,
          color: "#60748A",
          fontSize: 10.5,
          fontWeight: 750,
          lineHeight: 1.3,
        }}
      >
        Recorded attention, not sales.
      </div>

      <StableButton
        debugId="dashboard.market-wisdom.open-commerce-action"
        type="button"
        fullWidth
        stableHeight={52}
        onClick={(event) => onOpenRoute(event, actionRoute)}
        onPointerDown={onPointerDown}
        style={{
          marginTop: 10,
          borderRadius: 16,
          background: "linear-gradient(180deg, #0B2D4A 0%, #061827 100%)",
          color: "#FFFFFF",
          border: "1px solid rgba(243,208,106,0.70)",
          boxShadow: "0 12px 22px rgba(2,12,27,0.16)",
          fontSize: 14,
          fontWeight: 950,
        }}
      >
        <GsnLegacyIcon name="chart" size={23} />
        {visibleActionLabel}
        <span aria-hidden="true" style={{ marginLeft: "auto", fontSize: 22 }}>
          {"\u2192"}
        </span>
      </StableButton>
    </div>
  );
}
