import React from "react";
import { StableButton, StableCtaLink } from "../../components/StableButton";
import { APP_ROUTES } from "../../lib/appRoutes";

export type MarketplaceCommunityMemberRow = {
  name: string;
  gmfnId?: string;
  userId?: number | string;
  membershipRole?: string;
  profileImageUrl?: string;
  shopTo?: string;
  shopName?: string;
};

type Props = {
  isCompact: boolean;
  activeCommunityId: number;
  activeCommunityName: string;
  canManageCommunityConfirmation: boolean;
  memberRows: MarketplaceCommunityMemberRow[];
  marketplaceSurfaceTouchProps: (debugId: string) => Record<string, unknown>;
  marketplaceFieldTouchProps: (debugId: string) => Record<string, unknown>;
};

function initials(name: string): string {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "GS";
  return `${parts[0]?.[0] || ""}${parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : ""}`
    .toUpperCase()
    .slice(0, 2);
}

function displayGsnId(value: unknown): string {
  const text = String(value || "").trim();
  if (!text) return "GSN ID pending";
  const upper = text.toUpperCase();
  return upper.startsWith("GSN-") || upper.startsWith("GMFN-") ? upper : `GSN-${text}`;
}

function statusLabel(row: MarketplaceCommunityMemberRow): string {
  const role = String(row.membershipRole || "").trim().toLowerCase();
  if (["admin", "owner", "founder", "creator"].includes(role)) return "Community admin";
  return row.shopTo ? "Shop active" : "Community member";
}

function confirmationTarget(
  communityId: number,
  member: MarketplaceCommunityMemberRow,
  action: "record" | "request"
): string {
  const params = new URLSearchParams();
  if (communityId) params.set("community_id", String(communityId));
  if (member.userId) params.set("member_witness_subject", String(member.userId));
  params.set("member_witness_action", action);
  return `${APP_ROUTES.COMMUNITY_CONFIRMATION_POLICY}?${params.toString()}#member-witness`;
}

function avatarStyle(hasPhoto: boolean, large = false): React.CSSProperties {
  const size = large ? 62 : 40;
  return {
    width: size,
    height: size,
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
    overflow: "hidden",
    border: "1px solid rgba(185,132,22,0.34)",
    background: hasPhoto ? "#EAF1F7" : "linear-gradient(180deg, #FFF8DB 0%, #F3E3B1 100%)",
    color: "#173750",
    fontWeight: 1000,
    fontSize: large ? 20 : 12,
    boxShadow: "0 8px 18px rgba(10,24,49,0.10)",
  };
}

function MemberAvatar({ row, large = false }: { row: MarketplaceCommunityMemberRow; large?: boolean }) {
  return (
    <span aria-hidden="true" style={avatarStyle(Boolean(row.profileImageUrl), large)}>
      {row.profileImageUrl ? (
        <img
          src={row.profileImageUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        initials(row.name)
      )}
    </span>
  );
}

const softAction: React.CSSProperties = {
  border: "1px solid rgba(8,35,58,0.24)",
  background: "linear-gradient(180deg, #F5F9FD 0%, #DDEAF5 100%)",
  color: "#08233A",
  boxShadow: "0 8px 16px rgba(8,35,58,0.08)",
};

export default function MarketplaceCommunityMembers({
  isCompact,
  activeCommunityId,
  activeCommunityName,
  canManageCommunityConfirmation,
  memberRows,
  marketplaceSurfaceTouchProps,
  marketplaceFieldTouchProps,
}: Props) {
  const [search, setSearch] = React.useState("");
  const [shopsOnly, setShopsOnly] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [selectedKey, setSelectedKey] = React.useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRows = React.useMemo(
    () =>
      memberRows.filter((row) => {
        if (shopsOnly && !row.shopTo) return false;
        if (!normalizedSearch) return true;
        return [row.name, row.gmfnId, row.membershipRole, row.shopName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      }),
    [memberRows, normalizedSearch, shopsOnly]
  );
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const selectedMember =
    memberRows.find((row) => String(row.userId || row.gmfnId || row.name) === selectedKey) || null;

  React.useEffect(() => setPage(1), [normalizedSearch, shopsOnly]);
  React.useEffect(() => setPage((current) => Math.min(current, pageCount)), [pageCount]);

  return (
    <div
      {...marketplaceSurfaceTouchProps("marketplace.members.community-roster")}
      style={{
        marginTop: 14,
        borderRadius: isCompact ? 20 : 24,
        border: "1px solid rgba(35,218,255,0.72)",
        background: "linear-gradient(180deg, rgba(248,253,255,0.99) 0%, rgba(255,250,244,0.99) 100%)",
        padding: isCompact ? 12 : 16,
        boxShadow:
          "0 0 0 2px rgba(199,54,255,0.20), 0 0 22px rgba(35,218,255,0.24), 0 0 34px rgba(199,54,255,0.16), 0 18px 38px rgba(7,23,44,0.12)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#173750", fontSize: 12, fontWeight: 1000, textTransform: "uppercase" }}>
            Community members
          </div>
          <div style={{ marginTop: 4, color: "#4A6178", fontSize: isCompact ? 12.5 : 13.5, fontWeight: 760, lineHeight: 1.45 }}>
            Find a member of {activeCommunityName || "this community"}, then open only the details you need.
          </div>
        </div>
        <span style={{ borderRadius: 999, padding: "7px 10px", background: "#E9F4FC", color: "#1E4868", fontSize: 12, fontWeight: 950 }}>
          {memberRows.length} member{memberRows.length === 1 ? "" : "s"}
        </span>
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: isCompact ? "minmax(0, 1fr) auto" : "minmax(0, 1fr) 160px", gap: 8 }}>
        <input
          {...marketplaceFieldTouchProps("marketplace.members.member-search")}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name or GSN ID"
          aria-label="Search community members"
          enterKeyHint="search"
          autoComplete="off"
          style={{ width: "100%", minWidth: 0, height: 46, borderRadius: 14, border: "1px solid rgba(16,37,59,0.18)", background: "#FFFFFF", color: "#0B1F33", fontSize: 16, fontWeight: 760, padding: "0 13px", boxSizing: "border-box" }}
        />
        <StableButton
          debugId="marketplace.members.filter.shops"
          type="button"
          aria-pressed={shopsOnly}
          stableHeight={46}
          onClick={() => setShopsOnly((current) => !current)}
          style={{ ...softAction, padding: "0 12px" }}
        >
          {shopsOnly ? "Shops only ✓" : "Filters"}
        </StableButton>
      </div>

      <div style={{ marginTop: 10, display: "grid" }}>
        {visibleRows.length ? (
          visibleRows.map((row) => {
            const key = String(row.userId || row.gmfnId || row.name);
            const selected = selectedKey === key;
            return (
              <StableButton
                key={key}
                debugId={`marketplace.members.member.${key}.open`}
                type="button"
                aria-expanded={selected}
                onClick={() => setSelectedKey((current) => (current === key ? "" : key))}
                style={{
                  width: "100%",
                  minWidth: 0,
                  minHeight: 56,
                  height: "auto",
                  maxHeight: "none",
                  padding: "8px 6px",
                  border: 0,
                  borderBottom: "1px solid rgba(16,37,59,0.10)",
                  borderRadius: 0,
                  background: selected ? "linear-gradient(90deg, rgba(35,218,255,0.13), rgba(199,54,255,0.09))" : "transparent",
                  boxShadow: "none",
                  color: "#07172C",
                  display: "grid",
                  gridTemplateColumns: "40px minmax(0, 1fr) auto auto",
                  gap: 9,
                  alignItems: "center",
                  textAlign: "left",
                  whiteSpace: "normal",
                }}
              >
                <MemberAvatar row={row} />
                <span style={{ minWidth: 0, display: "grid", gap: 2 }}>
                  <span style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
                  <span style={{ color: "#586D82", fontSize: 11.5, fontWeight: 800 }}>{displayGsnId(row.gmfnId)}</span>
                </span>
                <span style={{ color: row.shopTo ? "#18704A" : "#8A5A05", fontSize: isCompact ? 11 : 12, fontWeight: 950, textAlign: "right" }}>
                  {statusLabel(row)}
                </span>
                <span aria-hidden="true" style={{ fontSize: 24, lineHeight: 1 }}>›</span>
              </StableButton>
            );
          })
        ) : (
          <div style={{ borderRadius: 15, border: "1px solid rgba(16,37,59,0.10)", background: "#FFFFFF", padding: 13, color: "#64748B", lineHeight: 1.55 }}>
            No community member matches this search or filter.
          </div>
        )}
      </div>

      {pageCount > 1 ? (
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}>
          <StableButton debugId="marketplace.members.page.previous" type="button" disabled={page <= 1} stableHeight={42} onClick={() => setPage((current) => Math.max(1, current - 1))} style={softAction}>
            Previous
          </StableButton>
          <span style={{ color: "#435B72", fontSize: 12, fontWeight: 950 }}>Page {page} of {pageCount}</span>
          <StableButton debugId="marketplace.members.page.next" type="button" disabled={page >= pageCount} stableHeight={42} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} style={softAction}>
            Next
          </StableButton>
        </div>
      ) : null}

      {selectedMember ? (
        <div role="region" aria-label={`${selectedMember.name} member details`} style={{ marginTop: 12, borderRadius: 18, border: "1px solid rgba(199,54,255,0.50)", background: "#FFFFFF", padding: 14, boxShadow: "0 0 18px rgba(35,218,255,0.22), 0 0 26px rgba(199,54,255,0.15)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "62px minmax(0, 1fr) auto", gap: 11, alignItems: "center" }}>
            <MemberAvatar row={selectedMember} large />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#07172C", fontSize: 20, fontWeight: 1000, lineHeight: 1.08 }}>{selectedMember.name}</div>
              <div style={{ marginTop: 4, color: selectedMember.shopTo ? "#18704A" : "#7A5A18", fontWeight: 950 }}>{statusLabel(selectedMember)}</div>
              <div style={{ marginTop: 3, color: "#5A6F84", fontSize: 12, fontWeight: 800 }}>{displayGsnId(selectedMember.gmfnId)}</div>
            </div>
            <StableButton debugId="marketplace.members.member.close" type="button" aria-label="Close member details" stableHeight={42} onClick={() => setSelectedKey("")} style={{ ...softAction, width: 42, minWidth: 42, padding: 0, fontSize: 22 }}>
              ×
            </StableButton>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <StableCtaLink to={confirmationTarget(activeCommunityId, selectedMember, "record")} debugId="marketplace.members.member.confirm-known" kind="primary" fullWidth stableHeight={52}>
              Confirm I know this member ›
            </StableCtaLink>
            <StableCtaLink to={confirmationTarget(activeCommunityId, selectedMember, "request")} debugId="marketplace.members.member.ask-confirmation" kind="secondary" fullWidth stableHeight={50}>
              Ask this member to confirm me ›
            </StableCtaLink>
            {selectedMember.shopTo ? (
              <StableCtaLink to={selectedMember.shopTo} debugId="marketplace.members.member.open-shop" kind="secondary" fullWidth stableHeight={50}>
                Open public shop ›
              </StableCtaLink>
            ) : null}
            {canManageCommunityConfirmation ? (
              <StableCtaLink to={`${APP_ROUTES.COMMUNITY_CONFIRMATION_POLICY}?community_id=${encodeURIComponent(String(activeCommunityId))}`} debugId="marketplace.members.member.confirmation-settings" kind="secondary" fullWidth stableHeight={50}>
                Request preferences and settings ›
              </StableCtaLink>
            ) : null}
            <StableCtaLink to={`${APP_ROUTES.COMMUNITY_CONFIRMATION_POLICY}?community_id=${encodeURIComponent(String(activeCommunityId))}`} debugId="marketplace.members.member.how-confirmation-works" kind="secondary" fullWidth stableHeight={48}>
              How confirmation works
            </StableCtaLink>
          </div>
        </div>
      ) : null}
    </div>
  );
}
