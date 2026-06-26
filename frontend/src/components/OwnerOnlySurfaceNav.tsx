import React, { useEffect, useMemo, useState } from "react";
import { getAccessToken, getMe, getStoredGmfnId } from "../lib/api";
import {
  ownerSurfaceFirstMeaningful,
  ownerSurfaceIdentityMatches,
} from "../lib/ownerSurfaceIdentity";
import { StableButton, StableCtaLink } from "./StableButton";

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
  collapseOnCompact?: boolean;
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
  collapseOnCompact = false,
}: OwnerOnlySurfaceNavProps) {
  const [signedInGmfnId, setSignedInGmfnId] = useState<string>(
    () => getStoredGmfnId() || ""
  );
  const [hasSignedInSession, setHasSignedInSession] = useState<boolean>(
    () => Boolean(getAccessToken())
  );
  const [shortcutsOpen, setShortcutsOpen] = useState<boolean>(
    () => !(collapseOnCompact && compact)
  );

  useEffect(() => {
    setShortcutsOpen(!(collapseOnCompact && compact));
  }, [collapseOnCompact, compact]);

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

  const canCollapse = collapseOnCompact && compact;
  const showLinks = !canCollapse || shortcutsOpen;
  const navGridTemplateColumns = compact
    ? "repeat(auto-fit, minmax(78px, 1fr))"
    : "repeat(auto-fit, minmax(120px, 1fr))";

  return (
    <nav
      aria-label={ariaLabel}
      style={{
        display: "grid",
        gridTemplateColumns: compact ? "1fr" : "auto minmax(0, 1fr)",
        gap: canCollapse ? 5 : compact ? 6 : 12,
        alignItems: "center",
        borderRadius: compact ? 14 : 22,
        padding: canCollapse ? "6px 7px" : compact ? "7px 8px" : 12,
        border: "1px solid rgba(246,196,83,0.34)",
        background:
          "linear-gradient(135deg, rgba(8,35,61,0.96) 0%, rgba(7,58,107,0.94) 100%)",
        boxShadow:
          "0 16px 34px rgba(2,12,27,0.18), inset 0 1px 0 rgba(255,255,255,0.12)",
      }}
    >
      {canCollapse ? (
        <StableButton
          type="button"
          fullWidth
          stableHeight={38}
          debugId="owner-surface-nav.toggle"
          aria-expanded={shortcutsOpen}
          aria-controls="owner-surface-nav-links"
          onClick={() => setShortcutsOpen((current) => !current)}
          style={{
            justifyContent: "space-between",
            minWidth: 0,
            borderRadius: 11,
            padding: "6px 9px",
            color: "#F6D77A",
            border: "1px solid rgba(246,196,83,0.22)",
            background: "rgba(255,255,255,0.08)",
            fontSize: 10.5,
            fontWeight: 950,
            textTransform: "uppercase",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {label}
          </span>
          <span aria-hidden="true" style={{ color: "#FFFFFF", fontSize: 13, lineHeight: 1 }}>
            {shortcutsOpen ? "Close" : "Open"}
          </span>
        </StableButton>
      ) : (
        <div
          style={{
            color: "#F6D77A",
            fontWeight: 950,
            fontSize: compact ? 10 : 13,
            textTransform: "uppercase",
            letterSpacing: 0,
            whiteSpace: "nowrap",
            lineHeight: 1,
          }}
        >
          {label}
        </div>
      )}
      {showLinks ? (
        <div
          id="owner-surface-nav-links"
          style={{
            display: "grid",
            gridTemplateColumns: navGridTemplateColumns,
            gap: compact ? 6 : 8,
            paddingBottom: compact ? 1 : undefined,
          }}
        >
          {links.map((link) => (
            <StableCtaLink
              key={link.debugId}
              to={link.to}
              minWidth={0}
              stableHeight={compact ? 38 : 52}
              debugId={link.debugId}
              style={{
                minWidth: 0,
                fontSize: compact ? 10 : 13,
                borderRadius: compact ? 11 : 13,
                padding: compact ? "5px 8px" : "8px 10px",
                lineHeight: compact ? 1.05 : 1.15,
                whiteSpace: canCollapse ? "normal" : "nowrap",
              }}
            >
              {link.label}
            </StableCtaLink>
          ))}
        </div>
      ) : null}
    </nav>
  );
}
