import React, { useEffect, useMemo, useState } from "react";
import { getAccessToken, getMe, getStoredGmfnId } from "../lib/api";
import {
  ownerSurfaceFirstMeaningful,
  ownerSurfaceIdentityMatches,
} from "../lib/ownerSurfaceIdentity";
import { StableCtaLink } from "./StableButton";

type OwnerSurfaceNavLink = {
  label: string;
  to: string;
  debugId: string;
};

type OwnerOnlySurfaceNavProps = {
  ownerGmfnId?: string | null;
  compact?: boolean;
  label?: string;
  ariaLabel?: string;
  links?: OwnerSurfaceNavLink[];
  refreshKey?: string | number;
  requireOwnerMatch?: boolean;
};

const DEFAULT_OWNER_SURFACE_LINKS: OwnerSurfaceNavLink[] = [
  {
    label: "Dashboard",
    to: "/app/dashboard",
    debugId: "owner-surface-nav.dashboard",
  },
  {
    label: "Marketplace",
    to: "/app/marketplace",
    debugId: "owner-surface-nav.marketplace",
  },
  {
    label: "Shop Control",
    to: "/app/shop-control",
    debugId: "owner-surface-nav.shop-control",
  },
];

export default function OwnerOnlySurfaceNav({
  ownerGmfnId,
  compact = false,
  label = "Owner view",
  ariaLabel = "Owner surface navigation",
  links = DEFAULT_OWNER_SURFACE_LINKS,
  refreshKey = "",
  requireOwnerMatch = true,
}: OwnerOnlySurfaceNavProps) {
  const [signedInGmfnId, setSignedInGmfnId] = useState<string>(
    () => getStoredGmfnId() || ""
  );
  const [hasSignedInSession, setHasSignedInSession] = useState<boolean>(
    () => Boolean(getAccessToken())
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    let alive = true;
    let refreshFrame: number | null = null;

    async function refreshSignedInOwnerIdentity() {
      const token = getAccessToken();
      if (alive) setHasSignedInSession(Boolean(token));

      if (!token) {
        if (alive) {
          setSignedInGmfnId("");
        }
        return;
      }

      const meRes = await getMe().catch(() => null);
      if (!alive) return;

      setSignedInGmfnId(
        ownerSurfaceFirstMeaningful(
          meRes?.gmfn_id,
          meRes?.gmfnId,
          meRes?.gmfnID,
          meRes?.member_global_id,
          meRes?.global_id,
          meRes?.gsn_id,
          getStoredGmfnId()
        )
      );
    }

    function scheduleRefresh() {
      if (refreshFrame !== null) return;
      refreshFrame = window.requestAnimationFrame(() => {
        refreshFrame = null;
        void refreshSignedInOwnerIdentity();
      });
    }

    scheduleRefresh();
    window.addEventListener("focus", scheduleRefresh);
    window.addEventListener("storage", scheduleRefresh);

    return () => {
      alive = false;
      window.removeEventListener("focus", scheduleRefresh);
      window.removeEventListener("storage", scheduleRefresh);
      if (refreshFrame !== null) window.cancelAnimationFrame(refreshFrame);
    };
  }, [refreshKey]);

  const shouldShowOwnerNav = useMemo(
    () =>
      Boolean(
        hasSignedInSession &&
          (requireOwnerMatch
            ? signedInGmfnId &&
              ownerGmfnId &&
              ownerSurfaceIdentityMatches(signedInGmfnId, ownerGmfnId)
            : true)
      ),
    [hasSignedInSession, ownerGmfnId, requireOwnerMatch, signedInGmfnId]
  );

  if (!shouldShowOwnerNav) return null;

  const navGridTemplateColumns = compact
    ? "repeat(auto-fit, minmax(78px, 1fr))"
    : "repeat(auto-fit, minmax(120px, 1fr))";

  return (
    <nav
      aria-label={ariaLabel}
      style={{
        display: "grid",
        gridTemplateColumns: compact ? "1fr" : "auto minmax(0, 1fr)",
        gap: compact ? 8 : 12,
        alignItems: "center",
        borderRadius: compact ? 18 : 22,
        padding: compact ? 10 : 12,
        border: "1px solid rgba(246,196,83,0.34)",
        background:
          "linear-gradient(135deg, rgba(8,35,61,0.96) 0%, rgba(7,58,107,0.94) 100%)",
        boxShadow:
          "0 16px 34px rgba(2,12,27,0.18), inset 0 1px 0 rgba(255,255,255,0.12)",
      }}
    >
      <div
        style={{
          color: "#F6D77A",
          fontWeight: 950,
          fontSize: compact ? 12 : 13,
          textTransform: "uppercase",
          letterSpacing: 0,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: navGridTemplateColumns,
          gap: compact ? 7 : 8,
        }}
      >
        {links.map((link) => (
          <StableCtaLink
            key={link.debugId}
            to={link.to}
            minWidth={0}
            stableHeight={52}
            debugId={link.debugId}
            style={{
              fontSize: compact ? 10.8 : 13,
              borderRadius: 13,
              padding: compact ? "7px 4px" : "8px 10px",
            }}
          >
            {link.label}
          </StableCtaLink>
        ))}
      </div>
    </nav>
  );
}
