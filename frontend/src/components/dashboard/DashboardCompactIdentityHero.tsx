import React from "react";
import GSNBrandMark from "../GSNBrandMark";
import { GsnLegacyIcon } from "../GsnLegacyIcon";
import PictureFrameToolsControl from "../PictureFrameToolsControl";
import { StableButton, StableDisclosureSummary } from "../StableButton";
import { colors, radius } from "../../design/tokens";
import dashboardNetworkGlobe from "../../assets/dashboard/dashboard-network-globe.jpg";

export type DashboardCompactIdentityReading = {
  label: string;
  value: string;
  detail?: string;
  to: string;
};

type DashboardCompactIdentityHeroProps = {
  order: number;
  name: string;
  avatarSrc: string;
  initials: string;
  gsnId: string;
  membershipLabel: string;
  readings: DashboardCompactIdentityReading[];
  photoToolsOpen: boolean;
  avatarInputId: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onAvatarImageError: () => void;
  onAvatarSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onTogglePhotoTools: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onRemoveAvatar: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMissingAvatar: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenCard: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenReading: (
    event: React.MouseEvent<HTMLButtonElement>,
    to: string
  ) => void;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onDisclosurePointerDown: (event: React.PointerEvent<HTMLElement>) => void;
};

const compactActionFrame: React.CSSProperties = {
  boxSizing: "border-box",
  transform: "none",
  transition: "none",
  overflowAnchor: "none",
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

export default function DashboardCompactIdentityHero({
  order,
  name,
  avatarSrc,
  initials,
  gsnId,
  membershipLabel,
  readings,
  photoToolsOpen,
  avatarInputId,
  fileInputRef,
  onAvatarImageError,
  onAvatarSelected,
  onTogglePhotoTools,
  onRemoveAvatar,
  onMissingAvatar,
  onOpenCard,
  onOpenReading,
  onPointerDown,
  onDisclosurePointerDown,
}: DashboardCompactIdentityHeroProps) {
  return (
    <section
      data-dashboard-passport-reference="gsn-trust-card"
      data-dashboard-compact-identity="true"
      style={{
        gridColumn: "1 / -1",
        order,
        width: "100%",
        minWidth: 0,
        borderRadius: radius.lg,
        border: "1px solid rgba(214,170,69,0.28)",
        backgroundColor: colors.navy900,
        backgroundImage: `linear-gradient(90deg, rgba(3,16,31,0.98) 0%, rgba(3,16,31,0.92) 38%, rgba(3,16,31,0.42) 72%, rgba(3,16,31,0.16) 100%), url(${dashboardNetworkGlobe})`,
        backgroundPosition: "center, center",
        backgroundRepeat: "no-repeat, no-repeat",
        backgroundSize: "cover, cover",
        color: colors.white,
        boxShadow:
          "0 18px 36px rgba(6,24,39,0.18), inset 0 1px 0 rgba(255,255,255,0.10)",
        overflow: "visible",
        position: "relative",
        zIndex: 20,
      }}
    >
      <div
        style={{
          minHeight: 132,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 64px",
          gap: 10,
          alignItems: "center",
          padding: "13px 13px 11px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              color: "rgba(255,255,255,0.72)",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: 0.9,
              textTransform: "uppercase",
            }}
          >
            <GSNBrandMark width={16} height={20} />
            <span>Welcome back</span>
          </div>

          <div
            style={{
              marginTop: 3,
              color: colors.white,
              fontSize: 27,
              fontWeight: 1000,
              lineHeight: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </div>

          <div
            style={{
              marginTop: 5,
              color: colors.gold300,
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 14.5,
              fontStyle: "italic",
              fontWeight: 700,
              lineHeight: 1.15,
            }}
          >
            Your trust is the first currency.
          </div>

          <div
            style={{
              marginTop: 9,
              display: "flex",
              alignItems: "center",
              gap: 7,
              minWidth: 0,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 25,
                maxWidth: "100%",
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid rgba(242,207,119,0.30)",
                background: "rgba(255,255,255,0.08)",
                color: "#FFF8DC",
                fontSize: 10.5,
                fontWeight: 900,
                lineHeight: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {gsnId}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                minHeight: 25,
                padding: "4px 8px",
                borderRadius: 999,
                background: "rgba(33,163,101,0.16)",
                color: "#D8F8E6",
                fontSize: 10.5,
                fontWeight: 900,
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: "#55D98B",
                  boxShadow: "0 0 0 3px rgba(85,217,139,0.12)",
                }}
              />
              {membershipLabel}
            </span>
          </div>
        </div>

        <div
          style={{
            width: 64,
            display: "grid",
            justifyItems: "center",
            gap: 4,
            position: "relative",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              border: "3px solid rgba(255,255,255,0.90)",
              background: "linear-gradient(180deg, #EAF3FF 0%, #D8E8F8 100%)",
              overflow: "hidden",
              display: "grid",
              placeItems: "center",
                color: colors.navy700,
              fontSize: 18,
              fontWeight: 1000,
              boxShadow: "0 12px 22px rgba(0,0,0,0.20)",
            }}
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Profile"
                onError={onAvatarImageError}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center 18%",
                  display: "block",
                }}
              />
            ) : (
              initials
            )}
          </div>

          <PictureFrameToolsControl
            open={photoToolsOpen}
            label="Edit photo"
            ariaLabel="Open profile photo tools"
            triggerContent={<span aria-hidden="true">Edit</span>}
            onToggle={onTogglePhotoTools}
            slotStyle={{
              width: 58,
              height: 30,
              minHeight: 30,
              maxHeight: 30,
            }}
            buttonStyle={{
              ...compactActionFrame,
              width: "100%",
              height: 30,
              minHeight: 30,
              maxHeight: 30,
              padding: "0 8px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.22)",
              background: "rgba(255,255,255,0.10)",
              color: colors.white,
              fontSize: 10.5,
              fontWeight: 900,
              boxShadow: "none",
            }}
            railGap={7}
            railColumns="repeat(3, minmax(0, 1fr))"
            railMinWidth={286}
            triggerHeight={30}
            zIndex={3200}
            railStyle={{
              gap: 8,
              alignItems: "stretch",
              borderRadius: 18,
              padding: 8,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(239,246,255,0.98) 100%)",
              border: "1px solid rgba(11,99,209,0.14)",
              boxShadow: "0 18px 30px rgba(10,24,49,0.18)",
            }}
            actions={[
              {
                label: "Upload",
                inputId: avatarInputId,
                style: { height: 44, minHeight: 44, maxHeight: 44, fontSize: 11 },
              },
              {
                label: "Change",
                inputId: avatarInputId,
                style: { height: 44, minHeight: 44, maxHeight: 44, fontSize: 11 },
              },
              {
                label: "Remove",
                disabled: !avatarSrc,
                onDisabledClick: onMissingAvatar,
                onClick: onRemoveAvatar,
                style: { height: 44, minHeight: 44, maxHeight: 44, fontSize: 11 },
              },
            ]}
          />

          <input
            id={avatarInputId}
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onAvatarSelected}
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              opacity: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          alignItems: "stretch",
          position: "relative",
          borderTop: "1px solid rgba(255,255,255,0.10)",
          borderRadius: "0 0 23px 23px",
          background: "rgba(3,16,31,0.32)",
        }}
      >
        <StableButton
          debugId="dashboard.passport-gsn-id-card"
          type="button"
          aria-label="Open your GSN ID Card"
          onClick={onOpenCard}
          onPointerDown={onPointerDown}
          style={{
            ...compactActionFrame,
            minWidth: 0,
            minHeight: 52,
            display: "grid",
            gridTemplateColumns: "auto minmax(0, 1fr) auto",
            gap: 8,
            alignItems: "center",
            padding: "8px 11px",
            border: "none",
            borderRight: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 0,
            background: "transparent",
            color: colors.white,
            textAlign: "left",
            boxShadow: "none",
          }}
        >
          <GsnLegacyIcon name="id" size={24} decorative />
          <span style={{ minWidth: 0 }}>
            <span
              style={{
                display: "block",
                color: "rgba(255,255,255,0.68)",
                fontSize: 9.5,
                fontWeight: 900,
                letterSpacing: 0.7,
                textTransform: "uppercase",
              }}
            >
              GSN ID Card
            </span>
            <span
              style={{
                display: "block",
                marginTop: 2,
                color: colors.white,
                fontSize: 11.5,
                fontWeight: 900,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {gsnId}
            </span>
          </span>
          <span aria-hidden="true" style={{ color: colors.gold300, fontSize: 18 }}>&gt;</span>
        </StableButton>

        <details style={{ minWidth: 0 }}>
          <StableDisclosureSummary
            debugId="dashboard.passport.identity-and-trust"
            stableHeight={52}
            onPointerDown={onDisclosurePointerDown}
            style={{
              minWidth: 104,
              display: "grid",
              placeItems: "center",
              padding: "8px 10px",
              color: "#FFF8DC",
              fontSize: 10.5,
              fontWeight: 900,
              lineHeight: 1.15,
              textAlign: "center",
              listStyle: "none",
            }}
          >
            Identity &amp; trust
          </StableDisclosureSummary>

          <div
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              zIndex: 40,
              marginTop: 7,
              display: "grid",
              gap: 7,
              padding: 9,
              borderRadius: 16,
              border: "1px solid rgba(214,170,69,0.26)",
              background: "linear-gradient(180deg, #FFFFFF 0%, #F4F8FF 100%)",
              boxShadow: "0 18px 36px rgba(6,24,39,0.22)",
            }}
          >
            {readings.map((reading) => (
              <StableButton
                debugId={`dashboard.passport-signal.${reading.label.toLowerCase()}`}
                key={reading.label}
                type="button"
                onClick={(event) => onOpenReading(event, reading.to)}
                onPointerDown={onPointerDown}
                style={{
                  ...compactActionFrame,
                  display: "grid",
                  gridTemplateColumns: "84px minmax(0, 1fr)",
                  gap: 8,
                  alignItems: "center",
                  minHeight: 42,
                  padding: "7px 9px",
                  borderRadius: 12,
                  border: "1px solid rgba(15,59,116,0.10)",
                  background: "rgba(255,255,255,0.90)",
                  color: "#07172C",
                  textAlign: "left",
                  boxShadow: "none",
                }}
              >
                <span
                  style={{
                      color: colors.textMuted,
                    fontSize: 10.5,
                    fontWeight: 900,
                    textTransform: "uppercase",
                  }}
                >
                  {reading.label}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      color: colors.textDark,
                      fontSize: 12,
                      fontWeight: 950,
                      lineHeight: 1.15,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {reading.value}
                  </span>
                  {reading.detail ? (
                    <span
                      style={{
                        display: "block",
                        marginTop: 2,
                        color: colors.textMuted,
                        fontSize: 10.5,
                        fontWeight: 750,
                        lineHeight: 1.2,
                      }}
                    >
                      {reading.detail}
                    </span>
                  ) : null}
                </span>
              </StableButton>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
