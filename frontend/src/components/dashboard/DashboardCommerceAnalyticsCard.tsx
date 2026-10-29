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
        paddingTop: 10,
        borderTop: "1px solid rgba(15,59,116,0.12)",
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
              width: 30,
              height: 30,
              flex: "0 0 30px",
              borderRadius: 10,
              display: "grid",
              placeItems: "center",
              border: "1px solid rgba(184,137,45,0.18)",
              background: "linear-gradient(180deg, #FFF9E8 0%, #FCEBB6 100%)",
              boxShadow: "0 5px 10px rgba(184,137,45,0.10)",
            }}
          >
            <GsnLegacyIcon name="chart" size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: "#0B1F33",
                fontSize: isPhone ? 13 : 14,
                fontWeight: 950,
                lineHeight: 1.1,
              }}
            >
              Market Wisdom shop signal
            </div>
            <div
              style={{
                marginTop: 3,
                color: "#526B84",
                fontSize: isPhone ? 10 : 10.5,
                fontWeight: 700,
                lineHeight: 1.3,
              }}
            >
              Recorded attention from the last 7 days.
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
            padding: "5px 8px",
            fontSize: 10,
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
        >
          Last 7 days
        </div>
      </div>

      <div
        style={{
          marginTop: 8,
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
              minHeight: isPhone ? 54 : 58,
              borderRadius: isPhone ? 10 : 12,
              border: "1px solid rgba(15,59,116,0.10)",
              background: metric.wash,
              padding: isPhone ? "6px 5px" : "7px 7px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                color: "#526B84",
                fontSize: isPhone ? 8.5 : 9.5,
                fontWeight: 850,
                lineHeight: 1.15,
                minHeight: 12,
              }}
            >
              {metric.label}
            </div>
            <div
              style={{
                color: "#0B1F33",
                fontSize: isPhone ? 16 : 18,
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
                height: 3,
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
          marginTop: 7,
          color: "#60748A",
          fontSize: 9.5,
          fontWeight: 750,
          lineHeight: 1.3,
        }}
      >
        Recorded attention, not sales.
      </div>

      <StableButton
        debugId="dashboard.market-wisdom.open-commerce-action"
        type="button"
        stableHeight={38}
        onClick={(event) => onOpenRoute(event, actionRoute)}
        onPointerDown={onPointerDown}
        style={{
          marginTop: 7,
          marginLeft: "auto",
          display: "flex",
          width: "fit-content",
          minWidth: isPhone ? 136 : 148,
          borderRadius: 12,
          background: "rgba(255,255,255,0.88)",
          color: "#173654",
          border: "1px solid rgba(15,59,116,0.16)",
          boxShadow: "0 5px 12px rgba(15,23,42,0.06)",
          fontSize: 11.5,
          fontWeight: 950,
        }}
      >
        <GsnLegacyIcon name="chart" size={16} />
        {visibleActionLabel}
        <span aria-hidden="true" style={{ marginLeft: 4, fontSize: 17 }}>
          {"\u2192"}
        </span>
      </StableButton>
    </div>
  );
}
