import React, { useState } from "react";
import {
  getMarketplaceRequestHistory,
  type MarketplaceRequestActivityItem,
  type MarketplaceRequestItem,
} from "../lib/api";
import { GsnLegacyIcon } from "./GsnLegacyIcon";
import ProtectedVoiceNotePlayer from "./ProtectedVoiceNotePlayer";
import { PrimaryButton, StableDisclosureSummary } from "./StableButton";

type DemandHistoryCardProps = {
  row: MarketplaceRequestItem;
  busy?: boolean;
  onRepost: () => void;
};

function dateLabel(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString();
}

export default function DemandHistoryCard({
  row,
  busy = false,
  onRepost,
}: DemandHistoryCardProps) {
  const [activities, setActivities] = useState<MarketplaceRequestActivityItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  async function loadHistory() {
    if (loaded) return;
    try {
      const history = await getMarketplaceRequestHistory(row.id);
      setActivities(history.activities || []);
      setLoaded(true);
    } catch (err: any) {
      setError(String(err?.message || "Request history could not be loaded."));
    }
  }

  return (
    <details
      data-gsn-demand-history-card="true"
      onToggle={(event) => {
        if (event.currentTarget.open) void loadHistory();
      }}
      style={{
        borderRadius: 18,
        border: "1px solid rgba(13,95,168,0.14)",
        background: "#FFFFFF",
        overflow: "hidden",
      }}
    >
      <StableDisclosureSummary
        stableHeight={58}
        debugId={`demand-box.history.${row.id}.open`}
        style={{
          padding: "0 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", color: "#0B1F33", fontWeight: 900 }}>
            {row.title}
          </span>
          <span style={{ display: "block", marginTop: 3, color: "#64748B", fontSize: 11 }}>
            {row.status} Â· {dateLabel(row.created_at)}
          </span>
        </span>
        <GsnLegacyIcon name="refresh" size={24} />
      </StableDisclosureSummary>
      <div style={{ padding: "0 14px 14px", display: "grid", gap: 10 }}>
        {Number(row.audio_attachment_id || 0) > 0 ? (
          <ProtectedVoiceNotePlayer
            attachmentId={Number(row.audio_attachment_id)}
            durationSeconds={row.audio_duration_seconds}
            label="Original voice note"
            debugId={`demand-box.history.${row.id}.listen`}
          />
        ) : null}
        {activities.length ? (
          <div style={{ display: "grid", gap: 7 }}>
            {activities.map((activity) => (
              <div
                key={activity.id}
                style={{
                  padding: "9px 10px",
                  borderRadius: 12,
                  background: "#F8FBFF",
                  color: "#29445E",
                  fontSize: 12,
                }}
              >
                <strong>{activity.event_type.replace(/_/g, " ")}</strong>
                {activity.detail ? ` â€” ${activity.detail}` : ""}
                <span style={{ display: "block", marginTop: 3, color: "#64748B", fontSize: 10 }}>
                  {dateLabel(activity.created_at)}
                </span>
              </div>
            ))}
          </div>
        ) : loaded ? (
          <div style={{ color: "#64748B", fontSize: 12 }}>No lifecycle events recorded.</div>
        ) : null}
        {error ? <div role="alert" style={{ color: "#A33B16", fontSize: 12 }}>{error}</div> : null}
        <PrimaryButton
          type="button"
          onClick={onRepost}
          disabled={busy}
          busy={busy}
          busyLabel="Posting again..."
          fullWidth
          stableHeight={52}
          debugId={`demand-box.history.${row.id}.repost`}
        >
          Post again
        </PrimaryButton>
        <div style={{ color: "#64748B", fontSize: 11, lineHeight: 1.45 }}>
          This creates a linked new request. Photo sharing and one-hop relay consent stay off until you choose them again.
        </div>
      </div>
    </details>
  );
}
