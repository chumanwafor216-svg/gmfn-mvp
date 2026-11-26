import { useEffect, useState } from "react";
import { fetchDemandMediaBlob, type MarketplaceRequestAttachmentItem } from "../lib/api";
import OriginLink from "./OriginLink";
import { SubtleButton } from "./StableButton";

export default function ProtectedDemandMedia({
  attachment,
  compact = false,
}: {
  attachment: MarketplaceRequestAttachmentItem;
  compact?: boolean;
}) {
  const [source, setSource] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    if (attachment.kind === "link") return undefined;
    setSource("");
    setError("");
    void fetchDemandMediaBlob(Number(attachment.id))
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      })
      .catch(() => {
        if (active) setError("Attachment unavailable");
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.id, attachment.kind]);

  if (attachment.kind === "link") {
    return (
      <OriginLink
        to={attachment.url || ""}
        target="_blank"
        rel="noreferrer"
        data-cta-id={`demand-media.${attachment.id}.external`}
        style={{ color: "#0B4FA8", fontSize: compact ? 11 : 12, overflowWrap: "anywhere" }}
      >
        Open attached link
      </OriginLink>
    );
  }
  if (error) return <span style={{ color: "#7C3218", fontSize: 11 }}>{error}</span>;
  if (!source) return <span style={{ color: "#587087", fontSize: 11 }}>Loading attachment…</span>;
  if (attachment.kind === "video") {
    return (
      <video
        src={source}
        controls
        preload="metadata"
        style={{ width: "100%", maxHeight: compact ? 180 : 280, borderRadius: 12, background: "#0B1F33" }}
      />
    );
  }
  if (attachment.kind === "document") {
    return (
      <SubtleButton
        type="button"
        debugId={`demand-media.${attachment.id}.document`}
        onClick={() => {
          const download = document.createElement("a");
          download.href = source;
          download.download = attachment.original_filename || "GSN attachment";
          download.click();
        }}
        stableHeight={40}
        style={{ color: "#0B4FA8", fontSize: compact ? 11 : 12, fontWeight: 850 }}
      >
        Open {attachment.original_filename || "attached document"}
      </SubtleButton>
    );
  }
  return (
    <img
      src={source}
      alt={attachment.original_filename || "Attached photo"}
      style={{ width: "100%", maxHeight: compact ? 180 : 280, objectFit: "contain", borderRadius: 12, background: "#F4F8FC" }}
    />
  );
}
