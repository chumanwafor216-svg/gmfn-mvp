import React from "react";
import GSNBrandMark from "../GSNBrandMark";
import { GsnLegacyIcon } from "../GsnLegacyIcon";
import { GsnRealisticIcon, type Gsn3DIconKey } from "../GsnRealisticIcon";
import PictureFrameToolsControl from "../PictureFrameToolsControl";
import { StableButton, StableDisclosureSummary } from "../StableButton";
import { colors, radius } from "../../design/tokens";
import dashboardNetworkGlobe from "../../assets/dashboard/dashboard-network-globe.jpg";
import {
  authenticatedStaticNeonAction,
  authenticatedStaticNeonFrame,
} from "../../design/authenticatedNeon";

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

type IdentityReadingPresentation = {
  icon: Gsn3DIconKey;
  endIcon: Gsn3DIconKey;
  description: string;
  background: string;
  borderColor: string;
  glow: string;
  valueColor: string;
};

function identityReadingPresentation(label: string): IdentityReadingPresentation {
  switch (label.trim().toLowerCase()) {
    case "wider":
      return {
        icon: "community-building",
        endIcon: "public-globe",
        description: "Grow your trust across more communities.",
        background:
          "linear-gradient(102deg, rgba(4,35,92,0.98) 0%, rgba(11,24,68,0.98) 47%, rgba(88,31,150,0.96) 100%)",
        borderColor: "rgba(186,116,255,0.94)",
        glow: "rgba(139,78,255,0.48)",
        valueColor: "#FFD15A",
      };
    case "trustslip":
      return {
        icon: "trust-shield",
        endIcon: "certificate-seal",
        description: "Your Trust Record on GSN (for people, shops and trades).",
        background:
          "linear-gradient(102deg, rgba(3,53,91,0.98) 0%, rgba(5,34,65,0.98) 54%, rgba(72,59,18,0.96) 100%)",
        borderColor: "rgba(58,225,255,0.94)",
        glow: "rgba(38,213,255,0.42)",
        valueColor: "#FFFFFF",
      };
    default:
      return {
        icon: "identity-card",
        endIcon: "trust-shield",
        description: "You’re getting known and trusted on GSN.",
        background:
          "linear-gradient(102deg, rgba(3,54,118,0.98) 0%, rgba(5,35,83,0.98) 52%, rgba(5,104,62,0.96) 100%)",
        borderColor: "rgba(63,239,224,0.94)",
        glow: "rgba(54,231,178,0.42)",
        valueColor: "#9AFF4D",
      };
  }
}

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
      data-dashboard-neon-surface="identity"
      style={{
        gridColumn: "1 / -1",
        order,
        width: "100%",
        minWidth: 0,
        borderRadius: radius.lg,
        border: "1px solid rgba(52,211,255,0.76)",
        backgroundColor: colors.navy900,
        backgroundImage: `linear-gradient(90deg, rgba(3,16,31,0.98) 0%, rgba(3,16,31,0.92) 38%, rgba(3,16,31,0.42) 72%, rgba(3,16,31,0.16) 100%), url(${dashboardNetworkGlobe})`,
        backgroundPosition: "center, center",
        backgroundRepeat: "no-repeat, no-repeat",
        backgroundSize: "cover, cover",
        color: colors.white,
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.16), 0 0 18px rgba(31,203,255,0.40), 0 0 34px rgba(117,73,255,0.22), 0 20px 40px rgba(2,12,27,0.30), inset 0 1px 0 rgba(255,255,255,0.18)",
        overflow: "visible",
        position: "relative",
        zIndex: 20,
        ...authenticatedStaticNeonFrame("cyanViolet", "vivid"),
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
              boxShadow:
                "0 0 0 1px rgba(52,211,255,0.54), 0 0 13px rgba(31,203,255,0.30), 0 12px 22px rgba(0,0,0,0.24)",
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
              border: "1px solid rgba(52,211,255,0.68)",
              background: "rgba(255,255,255,0.10)",
              color: colors.white,
              fontSize: 10.5,
              fontWeight: 900,
              boxShadow:
                "0 0 11px rgba(31,203,255,0.34), 0 0 18px rgba(117,73,255,0.18), inset 0 1px 0 rgba(255,255,255,0.18)",
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
          borderTop: "1px solid rgba(52,211,255,0.42)",
          borderRadius: "0 0 23px 23px",
          background: "rgba(3,16,31,0.32)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 7px 16px rgba(31,203,255,0.06)",
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
            borderRight: "1px solid rgba(52,211,255,0.28)",
            borderRadius: 0,
            background:
              "linear-gradient(180deg, rgba(31,203,255,0.055) 0%, rgba(117,73,255,0.035) 100%)",
            color: colors.white,
            textAlign: "left",
            boxShadow:
              "inset 0 0 0 1px rgba(52,211,255,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
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
              background:
                "linear-gradient(180deg, rgba(31,203,255,0.07) 0%, rgba(117,73,255,0.05) 100%)",
              boxShadow:
                "inset 0 0 0 1px rgba(52,211,255,0.18), 0 0 10px rgba(31,203,255,0.12)",
            }}
          >
            Identity &amp; trust
          </StableDisclosureSummary>

          <div
            data-dashboard-identity-reading-style="reference-two"
            style={{
              position: "absolute",
              left: 7,
              right: 7,
              zIndex: 40,
              marginTop: 7,
              display: "grid",
              gap: 8,
              padding: 7,
              borderRadius: 20,
              border: "1px solid rgba(52,211,255,0.52)",
              background:
                "linear-gradient(180deg, rgba(2,14,35,0.99) 0%, rgba(3,19,45,0.99) 100%)",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.10), 0 18px 38px rgba(1,8,24,0.50), 0 0 24px rgba(60,203,255,0.20)",
            }}
          >
            {readings.map((reading) => {
              const presentation = identityReadingPresentation(reading.label);
              const readingKey = reading.label.trim().toLowerCase();
              const description =
                readingKey === "trustslip" && reading.detail
                  ? reading.detail
                  : presentation.description;

              return (
                <StableButton
                  debugId={`dashboard.passport-signal.${readingKey}`}
                  key={reading.label}
                  type="button"
                  aria-label={`Open ${reading.label}: ${reading.value}`}
                  onClick={(event) => onOpenReading(event, reading.to)}
                  onPointerDown={onPointerDown}
                  style={{
                    ...compactActionFrame,
                    width: "100%",
                    minWidth: 0,
                    minHeight: 90,
                    display: "grid",
                    gridTemplateColumns: "74px minmax(0, 1fr) 54px",
                    gap: 8,
                    alignItems: "stretch",
                    padding: 0,
                    overflow: "hidden",
                    borderRadius: 22,
                    border: `1px solid ${presentation.borderColor}`,
                    background: presentation.background,
                    color: colors.white,
                    textAlign: "left",
                    boxShadow: `0 0 0 1px rgba(255,255,255,0.13), 0 0 13px ${presentation.glow}, inset 0 1px 0 rgba(255,255,255,0.20)`,
                  }}
                >
                  <span
                    style={{
                      minWidth: 0,
                      display: "grid",
                      placeItems: "center",
                      alignContent: "center",
                      gap: 2,
                      padding: "7px 4px",
                      borderRight: "1px solid rgba(255,255,255,0.18)",
                      borderRadius: "21px 0 0 21px",
                      background:
                        "linear-gradient(135deg, rgba(20,92,189,0.58), rgba(7,27,78,0.46))",
                      boxShadow: "inset -10px 0 22px rgba(2,11,38,0.22)",
                    }}
                  >
                    <GsnRealisticIcon
                      name={presentation.icon}
                      size={42}
                      decorative
                      loading="eager"
                      style={{
                        borderRadius: 13,
                        filter: `drop-shadow(0 0 7px ${presentation.glow})`,
                      }}
                    />
                    <span
                      style={{
                        maxWidth: "100%",
                        color: "#FFFFFF",
                        fontSize: 9.5,
                        fontWeight: 1000,
                        lineHeight: 1,
                        letterSpacing: 0.2,
                        textAlign: "center",
                        textTransform: "uppercase",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {reading.label}
                    </span>
                  </span>

                  <span
                    style={{
                      minWidth: 0,
                      alignSelf: "center",
                      display: "grid",
                      alignContent: "center",
                      padding: "8px 0",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        color: presentation.valueColor,
                        fontSize: "clamp(16px, 5vw, 21px)",
                        fontWeight: 1000,
                        lineHeight: 1.02,
                        overflowWrap: "anywhere",
                        textShadow: `0 0 10px ${presentation.glow}`,
                      }}
                    >
                      {reading.value}
                    </span>
                    <span
                      style={{
                        display: "block",
                        marginTop: 4,
                        color: "rgba(255,255,255,0.94)",
                        fontSize: 10.5,
                        fontWeight: 760,
                        lineHeight: 1.18,
                      }}
                    >
                      {description}
                    </span>
                    {readingKey === "wider" ? (
                      <span
                        aria-hidden="true"
                        style={{
                          width: "fit-content",
                          maxWidth: "100%",
                          minHeight: 22,
                          marginTop: 6,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 8px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.72)",
                          background: "rgba(106,43,186,0.48)",
                          color: "#FFFFFF",
                          fontSize: 9.5,
                          fontWeight: 950,
                          lineHeight: 1,
                          whiteSpace: "nowrap",
                          boxShadow: "0 0 9px rgba(183,105,255,0.38)",
                        }}
                      >
                        Grow My Reach <span style={{ fontSize: 13 }}>&gt;</span>
                      </span>
                    ) : null}
                  </span>

                  <span
                    aria-hidden="true"
                    style={{
                      display: "grid",
                      placeItems: "center",
                      paddingRight: 5,
                      overflow: "hidden",
                    }}
                  >
                    <GsnRealisticIcon
                      name={presentation.endIcon}
                      size={48}
                      decorative
                      loading="eager"
                      style={{
                        borderRadius: 14,
                        filter: `drop-shadow(0 0 8px ${presentation.glow})`,
                      }}
                      imageStyle={{ transform: "scale(1.06)" }}
                    />
                  </span>
                </StableButton>
              );
            })}
          </div>
        </details>
      </div>
    </section>
  );
}
