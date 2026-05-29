import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { EntryBackLink } from "../components/EntryControls";
import { PrimaryButton, SecondaryButton } from "../components/StableButton";
import {
  clearPublicEntryState,
  checkEntryCommunityName,
  confirmEntryPhoneVerification,
  createEntry,
  getCreateCode,
  getEntryVerificationCheck,
  getMe,
  isAuthenticated,
  listMyClans,
  loginAndStore,
  recordEntryOfficialId,
  recordEntryIdentityPhoto,
  resumeEntryPhoneVerification,
  saveEntryBankDetails,
  setSelectedClanId,
  startEntryPhoneVerification,
  verifyEntryBankDetails,
} from "../lib/api";
import {
  ENTRY_CREATE_CODE_KEY,
  ENTRY_INVITE_CODE_KEY,
  ENTRY_MODE_KEY,
  writeStorage,
} from "../lib/entryFlow";
import {
  buildActionBlockedMessage,
  buildActionSuccessMessage,
} from "../lib/actionResponseProtocol";
import {
  clearCreateEntryDraft,
  readCreateEntryDraft,
  saveCreateEntryDraft,
} from "../lib/entryDraft";
import { buildIdentityEvidenceCompletion } from "../lib/identityEvidenceCompletion";
import {
  countryFromPhone,
  countryOptions,
  evidenceRequirementForCountry,
} from "../lib/identityEvidenceRequirements";

type FeedbackTarget =
  | "global"
  | "details"
  | "phone"
  | "photo"
  | "bank"
  | "verification"
  | "community";

type CreateCommunityOutcome = {
  kind: "workspace" | "activation";
  message: string;
  actionLabel: string;
  path: string;
  out?: any;
  gmfnId?: string;
  requestId?: string;
};

type OptionalEvidenceStep =
  | "photo"
  | "photo_done"
  | "bank"
  | "bank_done"
  | "official_id"
  | "official_id_done";

type IdentityPhotoSelection = {
  id: string;
  file: File;
  kind: string;
  previewUrl: string;
};

const MAX_IDENTITY_PHOTO_SELECTIONS = 5;
const MAX_IDENTITY_PHOTO_BYTES = 5 * 1024 * 1024;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100svh",
    width: "100%",
    background:
      "radial-gradient(circle at 84% 18%, rgba(214,170,69,0.10) 0%, rgba(214,170,69,0.00) 24%), radial-gradient(circle at 16% 82%, rgba(70,119,165,0.20) 0%, rgba(70,119,165,0.00) 30%), linear-gradient(180deg, #04101B 0%, #061827 46%, #0B253B 100%)",
    padding: "8px 8px 14px",
    boxSizing: "border-box",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(248,251,255,0.99) 0%, rgba(232,239,247,0.97) 100%)"
        : bg,
    border: "1px solid rgba(17,37,58,0.11)",
    boxShadow: "0 26px 60px rgba(8,18,34,0.10)",
    padding: 24,
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    background:
      bg === "#F8FBFF"
        ? "linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(233,240,247,0.96) 100%)"
        : bg,
    border: "1px solid rgba(17,37,58,0.11)",
    padding: 18,
    boxShadow:
      "0 14px 30px rgba(8,18,34,0.07), inset 0 1px 0 rgba(255,255,255,0.74)",
  };
}

function fieldLabel(): React.CSSProperties {
  return {
    fontSize: 13,
    fontWeight: 900,
    color: "#0B1F33",
    marginBottom: 6,
  };
}

function fieldLabelOnDark(): React.CSSProperties {
  return {
    ...fieldLabel(),
    color: "#D7E3F1",
    textShadow: "0 1px 0 rgba(0,0,0,0.18)",
  };
}

function input(): React.CSSProperties {
  return {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid rgba(28,76,126,0.14)",
    outline: "none",
    fontSize: 14,
    boxSizing: "border-box",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.98) 100%)",
    color: "#0B1F33",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
}

type EntryDetailIconKind =
  | "person"
  | "phone"
  | "email"
  | "password"
  | "shield"
  | "bank"
  | "number"
  | "hash"
  | "globe"
  | "note"
  | "id"
  | "trash"
  | "group";

function EntryDetailIcon({
  kind,
  size = 19,
}: {
  kind: EntryDetailIconKind;
  size?: number;
}): React.ReactElement {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <span
      aria-hidden="true"
      style={{
        width: size + 19,
        height: size + 19,
        borderRadius: 11,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#F2C766",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.035) 100%)",
        border: "1px solid rgba(242,199,102,0.20)",
        boxShadow:
          "0 12px 24px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.10)",
        flex: "0 0 auto",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        {kind === "person" ? (
          <>
            <circle cx="12" cy="8" r="3.5" {...common} />
            <path d="M5 20c1.5-4 12.5-4 14 0" {...common} />
          </>
        ) : null}
        {kind === "phone" ? (
          <path
            d="M7 4h3l1 4-2 1c1 2 3 4 5 5l1-2 4 1v3c0 1-1 2-2 2C10 18 6 14 6 7c0-2 1-3 1-3Z"
            {...common}
          />
        ) : null}
        {kind === "email" ? (
          <>
            <rect x="4" y="6" width="16" height="12" rx="2" {...common} />
            <path d="m5 8 7 5 7-5" {...common} />
          </>
        ) : null}
        {kind === "password" ? (
          <>
            <rect x="5" y="10" width="14" height="10" rx="2" {...common} />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" {...common} />
            <path d="M12 14v2" {...common} />
          </>
        ) : null}
        {kind === "shield" ? (
          <>
            <path d="M12 3 5 6v5c0 4.5 3 7.5 7 10 4-2.5 7-5.5 7-10V6l-7-3Z" {...common} />
            <path d="m9 12 2 2 4-5" {...common} />
          </>
        ) : null}
        {kind === "bank" ? (
          <>
            <path d="M4 9h16L12 4 4 9Z" {...common} />
            <path d="M6 10v7M10 10v7M14 10v7M18 10v7M4 19h16" {...common} />
          </>
        ) : null}
        {kind === "number" ? (
          <>
            <rect x="5" y="5" width="14" height="14" rx="2" {...common} />
            <path d="M9 9h6M9 12h6M9 15h3" {...common} />
          </>
        ) : null}
        {kind === "hash" ? (
          <>
            <path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16" {...common} />
          </>
        ) : null}
        {kind === "globe" ? (
          <>
            <circle cx="12" cy="12" r="8" {...common} />
            <path d="M4 12h16M12 4c2 2 3 5 3 8s-1 6-3 8M12 4c-2 2-3 5-3 8s1 6 3 8" {...common} />
          </>
        ) : null}
        {kind === "note" ? (
          <>
            <path d="M5 5h10l4 4v10H5V5Z" {...common} />
            <path d="M15 5v4h4M8 13h8M8 16h6" {...common} />
          </>
        ) : null}
        {kind === "id" ? (
          <>
            <rect x="4" y="6" width="16" height="12" rx="2" {...common} />
            <circle cx="9" cy="12" r="2" {...common} />
            <path d="M13 10h4M13 14h3" {...common} />
          </>
        ) : null}
        {kind === "trash" ? (
          <>
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" {...common} />
          </>
        ) : null}
        {kind === "group" ? (
          <>
            <circle cx="9" cy="9" r="3" {...common} />
            <circle cx="17" cy="10" r="2.2" {...common} />
            <path d="M3 20c1-4 11-4 12 0M14 18c1.5-2 5-2 7 0" {...common} />
          </>
        ) : null}
      </svg>
    </span>
  );
}

function EyeGlyph({ closed = false }: { closed?: boolean }): React.ReactElement {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      {closed ? (
        <path
          d="M4 20 20 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}

function detailFieldLabelStyle(): React.CSSProperties {
  return {
    color: "#F8FBFF",
    fontSize: "clamp(12.5px, 3.35vw, 15px)",
    fontWeight: 1000,
    lineHeight: 1.18,
    letterSpacing: 0,
  };
}

function detailFieldHelpStyle(): React.CSSProperties {
  return {
    marginTop: 3,
    color: "#B9CBE0",
    fontSize: "clamp(10px, 2.75vw, 12px)",
    fontWeight: 740,
    lineHeight: 1.42,
  };
}

function credentialInputStyle(): React.CSSProperties {
  return {
    ...input(),
    minHeight: 47,
    marginTop: 7,
    borderRadius: 13,
    padding: "11px 14px",
    border: "1px solid rgba(255,255,255,0.74)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(247,249,252,0.99) 100%)",
    boxShadow:
      "0 14px 26px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.92)",
    color: "#10253B",
    fontSize: "clamp(13.5px, 3.65vw, 16px)",
    fontWeight: 760,
  };
}

function bankInputStyle(): React.CSSProperties {
  return {
    ...credentialInputStyle(),
    minHeight: 43,
    marginTop: 5,
    borderRadius: 10,
    padding: "9px 12px",
    fontSize: "clamp(12px, 3.2vw, 14px)",
    fontWeight: 700,
  };
}

function bankTextAreaStyle(): React.CSSProperties {
  return {
    ...bankInputStyle(),
    minHeight: 58,
    resize: "vertical",
  };
}

function bankFieldLabelStyle(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#F8FBFF",
    fontSize: "clamp(11.5px, 3vw, 13.5px)",
    fontWeight: 1000,
    lineHeight: 1.14,
  };
}

function countryChipStyle(active = false): React.CSSProperties {
  return {
    minHeight: 28,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    padding: "5px 6px",
    borderRadius: 999,
    border: active
      ? "1px solid rgba(242,199,102,0.56)"
      : "1px solid rgba(126,164,204,0.26)",
    background: active
      ? "linear-gradient(180deg, rgba(242,199,102,0.18) 0%, rgba(242,199,102,0.08) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)",
    color: "#F8FBFF",
    fontSize: 10.5,
    fontWeight: 900,
    boxShadow:
      "0 10px 18px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.10)",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
}

function countryFlagMark(country: "uk" | "ng" | "us"): React.ReactElement {
  const colors =
    country === "uk"
      ? ["#143A73", "#FFFFFF", "#C52233"]
      : country === "ng"
        ? ["#15803D", "#FFFFFF", "#15803D"]
        : ["#B91C1C", "#FFFFFF", "#1D4ED8"];
  return (
    <span
      aria-hidden="true"
      style={{
        width: 16,
        height: 11,
        borderRadius: 4,
        border: "1px solid rgba(255,255,255,0.34)",
        background: `linear-gradient(90deg, ${colors[0]} 0%, ${colors[0]} 33%, ${colors[1]} 33%, ${colors[1]} 66%, ${colors[2]} 66%, ${colors[2]} 100%)`,
        boxShadow: "0 4px 10px rgba(0,0,0,0.18)",
        flex: "0 0 auto",
      }}
    />
  );
}

function entryActionRowStyle(height = 56): React.CSSProperties {
  return {
    marginTop: 4,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(138px, 1fr))",
    gridAutoRows: `${height}px`,
    gap: 10,
    alignItems: "stretch",
    overflowAnchor: "none",
    transition: "none",
  };
}

function entryActionStyle(height = 56): React.CSSProperties {
  return {
    width: "100%",
    minWidth: 0,
    height,
    minHeight: height,
    maxHeight: height,
    boxSizing: "border-box",
    overflow: "hidden",
    overflowAnchor: "none",
    transition: "none",
    transform: "none",
    flexShrink: 0,
    whiteSpace: "normal",
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
}

function textArea(): React.CSSProperties {
  return {
    ...input(),
    minHeight: 110,
    resize: "vertical",
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 2,
    isolation: "isolate",
    width: "100%",
    padding: "14px 18px",
    borderRadius: 16,
    border: disabled
      ? "1px solid rgba(161,179,199,0.48)"
      : "1px solid rgba(82,128,186,0.62)",
    background: disabled
      ? "linear-gradient(180deg, #D7DEE8 0%, #C8D2DF 100%)"
      : "linear-gradient(180deg, #2D6AA3 0%, #235784 52%, #173E63 100%)",
    color: disabled ? "#6B7B8D" : "#FFFFFF",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15,
    opacity: disabled ? 0.8 : 1,
    boxShadow: disabled
      ? "0 10px 20px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.52)"
      : "0 20px 36px rgba(1,13,32,0.28), inset 0 1px 0 rgba(196,222,247,0.34), inset 0 -8px 12px rgba(8,25,43,0.20)",
    textShadow: "none",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    pointerEvents: "auto",
    appearance: "none",
    WebkitAppearance: "none",
    transform: "none",
    outlineOffset: 4,
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 2,
    isolation: "isolate",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 999,
    border: "1px solid rgba(16,37,59,0.12)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(229,237,249,0.98) 100%)",
    color: "#123055",
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
    boxShadow:
      "0 14px 28px rgba(10,24,49,0.16), inset 0 1px 0 rgba(255,255,255,0.82), inset 0 -6px 10px rgba(120,142,170,0.10)",
    whiteSpace: "nowrap",
    textShadow: "0 1px 0 rgba(255,255,255,0.52)",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    pointerEvents: "auto",
    appearance: "none",
    WebkitAppearance: "none",
    transform: "none",
    outlineOffset: 4,
  };
}

function stageDropDownHeader(active = false, complete = false): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 58,
    borderRadius: 14,
    border: "1px solid rgba(126,164,204,0.14)",
    background: active
      ? "linear-gradient(180deg, rgba(24,65,101,0.48) 0%, rgba(12,38,64,0.36) 100%)"
      : complete
        ? "linear-gradient(180deg, rgba(214,170,69,0.18) 0%, rgba(18,54,82,0.28) 100%)"
        : "transparent",
    color: "#F8FBFF",
    boxShadow: active
      ? "0 14px 28px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.10)"
      : "none",
    padding: "7px",
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 8,
    textAlign: "left",
    justifyContent: "stretch",
  };
}

function stageOpenIcon(active = false): React.CSSProperties {
  return {
    width: 26,
    height: 26,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: active ? "rgba(242,199,102,0.16)" : "rgba(126,164,204,0.12)",
    border: "1px solid rgba(255,255,255,0.16)",
    color: active ? "#F2C766" : "#C9D9E8",
    fontSize: 18,
    fontWeight: 1000,
    lineHeight: 1,
  };
}

function existingMemberCard(open = false): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 14,
    border: open
      ? "1px solid rgba(242,199,102,0.30)"
      : "1px solid rgba(126,164,204,0.24)",
    background: open
      ? "linear-gradient(180deg, rgba(13,45,73,0.96) 0%, rgba(7,28,48,0.98) 100%)"
      : "linear-gradient(180deg, rgba(11,40,66,0.94) 0%, rgba(8,29,49,0.96) 100%)",
    boxShadow:
      "0 18px 34px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.09)",
    padding: 9,
    display: "grid",
    gap: 7,
    position: "relative",
    overflow: "hidden",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4F6B8A",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

function feedbackCard(success = false): React.CSSProperties {
  return {
    borderRadius: 16,
    padding: 14,
    border: success ? "1px solid #A7F3D0" : "1px solid #FECACA",
    background: success ? "#ECFDF5" : "#FEF2F2",
    color: success ? "#065F46" : "#991B1B",
    fontWeight: 900,
  };
}

function localFeedbackCard(success = false): React.CSSProperties {
  return {
    ...feedbackCard(success),
    marginTop: 12,
    borderRadius: 14,
    padding: "12px 13px",
    boxShadow: success
      ? "0 14px 28px rgba(6,95,70,0.10)"
      : "0 14px 28px rgba(153,27,27,0.10)",
  };
}

function evidenceMeterCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(242,199,102,0.30)",
    background:
      "linear-gradient(180deg, rgba(242,199,102,0.13) 0%, rgba(13,45,73,0.62) 100%)",
    padding: 12,
    display: "grid",
    gridTemplateColumns: "82px minmax(0, 1fr)",
    gap: 12,
    alignItems: "center",
    overflow: "hidden",
  };
}

function evidenceDialStyle(degrees: number): React.CSSProperties {
  const clamped = Math.max(0, Math.min(360, Number(degrees) || 0));
  return {
    width: 76,
    height: 76,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: `conic-gradient(#F2C766 0deg ${clamped}deg, rgba(255,255,255,0.13) ${clamped}deg 360deg)`,
    boxShadow:
      "0 18px 34px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.30)",
    position: "relative",
    transition: "filter 220ms ease",
  };
}

function evidenceDialBallStyle(degrees: number): React.CSSProperties {
  const clamped = Math.max(0, Math.min(360, Number(degrees) || 0));
  return {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 11,
    height: 11,
    marginLeft: -5.5,
    marginTop: -5.5,
    borderRadius: 999,
    background: "#F8FBFF",
    border: "2px solid #F2C766",
    boxShadow: "0 6px 14px rgba(0,0,0,0.32)",
    transform: `rotate(${clamped - 90}deg) translate(34px)`,
    transition: "transform 360ms ease",
    pointerEvents: "none",
    zIndex: 2,
  };
}

function evidenceDialInner(): React.CSSProperties {
  return {
    width: 54,
    height: 54,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg, #102A43 0%, #07172C 100%)",
    color: "#F8FBFF",
    border: "1px solid rgba(255,255,255,0.15)",
    fontSize: 14,
    fontWeight: 1000,
    lineHeight: 1,
    position: "relative",
    zIndex: 1,
  };
}

function guideHeroCallout(done = false): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 16,
    border: done
      ? "1px solid rgba(255,255,255,0.16)"
      : "1px solid rgba(255,241,183,0.74)",
    background: done
      ? "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.045) 100%)"
      : "linear-gradient(145deg, #FFE795 0%, #F2C766 43%, #D9A842 100%)",
    boxShadow: done
      ? "0 14px 28px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.10)"
      : "0 26px 46px rgba(214,170,69,0.28), 0 18px 36px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.72)",
    padding: done ? "8px" : "9px",
    display: "grid",
    gridTemplateColumns: done ? "34px minmax(0, 1fr)" : "39px minmax(0, 1fr)",
    gap: done ? 7 : 8,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  };
}

function guideHeroMark(done = false): React.CSSProperties {
  return {
    width: done ? 34 : 39,
    height: done ? 34 : 39,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: done
      ? "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 100%)"
      : "linear-gradient(180deg, #102A43 0%, #07172C 100%)",
    color: done ? "#F3D06A" : "#F8FBFF",
    border: done
      ? "1px solid rgba(255,255,255,0.16)"
      : "1px solid rgba(255,255,255,0.42)",
    boxShadow: done
      ? "inset 0 1px 0 rgba(255,255,255,0.10)"
      : "0 16px 28px rgba(7,23,44,0.30), inset 0 1px 0 rgba(255,255,255,0.22)",
    fontSize: done ? 11.5 : 13,
    fontWeight: 1000,
    letterSpacing: 0,
  };
}

function guideHeroButton(done = false): React.CSSProperties {
  return {
    ...primaryBtn(false),
    width: "100%",
    minHeight: done ? 32 : 38,
    borderRadius: 11,
    border: done
      ? "1px solid rgba(255,255,255,0.18)"
      : "1px solid rgba(7,23,44,0.24)",
    background: done
      ? "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 100%)"
      : "linear-gradient(180deg, #102A43 0%, #0B1F33 54%, #07172C 100%)",
    color: done ? "#F8FBFF" : "#FFFFFF",
    boxShadow: done
      ? "0 12px 24px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.12)"
      : "0 18px 34px rgba(7,23,44,0.30), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -8px 12px rgba(0,0,0,0.16)",
    fontSize: done ? 11.5 : 13,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  };
}

type GuideStepKey = "details" | "verification" | "community";

function guideDropDownShell(open = false): React.CSSProperties {
  return {
    borderRadius: 16,
    border: open
      ? "1px solid rgba(45,106,163,0.32)"
      : "1px solid rgba(16,37,59,0.10)",
    background: open
      ? "linear-gradient(180deg, rgba(245,249,255,0.98) 0%, rgba(229,238,249,0.96) 100%)"
      : "linear-gradient(180deg, rgba(250,252,254,0.82) 0%, rgba(235,241,247,0.70) 100%)",
    boxShadow: open
      ? "0 14px 28px rgba(10,24,49,0.11), inset 0 1px 0 rgba(255,255,255,0.86)"
      : "inset 0 1px 0 rgba(255,255,255,0.82), 0 8px 20px rgba(10,24,49,0.06)",
    overflow: "hidden",
  };
}

function guideDropDownHeader(open = false): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 58,
    border: 0,
    background: "transparent",
    padding: "13px 14px",
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    gap: 10,
    alignItems: "center",
    textAlign: "left",
    color: "#10253B",
    fontWeight: 1000,
    fontSize: 14,
    cursor: "pointer",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    appearance: "none",
    WebkitAppearance: "none",
    transform: "none",
    transition: "none",
    outlineOffset: 4,
    boxSizing: "border-box",
    ...(open
      ? { borderBottom: "1px solid rgba(16,37,59,0.10)" }
      : null),
  };
}

function guideStepNumber(): React.CSSProperties {
  return {
    width: 26,
    height: 26,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg, #2D6AA3 0%, #173E63 100%)",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: 1000,
    boxShadow: "0 8px 18px rgba(23,62,99,0.22)",
  };
}

function MiniLineIcon({
  kind,
}: {
  kind: "member" | "shield" | "flag" | "doc" | "info" | "lock";
}): React.ReactElement {
  const common: React.CSSProperties = {
    width: 24,
    height: 24,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    border: "1px solid rgba(242,199,102,0.34)",
    background:
      "linear-gradient(180deg, rgba(242,199,102,0.13) 0%, rgba(242,199,102,0.05) 100%)",
    color: "#F2C766",
    fontWeight: 1000,
    fontSize: 10,
    lineHeight: 1,
    flex: "0 0 auto",
  };
  const glyph =
    kind === "member"
      ? "->"
      : kind === "shield"
        ? "OK"
        : kind === "flag"
          ? "1"
          : kind === "doc"
            ? "="
            : kind === "lock"
              ? "L"
              : "i";
  return <span aria-hidden="true" style={common}>{glyph}</span>;
}

function CreateCommunityWatermark(): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        right: -28,
        top: 58,
        width: 146,
        height: 146,
        opacity: 0.08,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "38% 38% 48% 48%",
          border: "7px solid rgba(242,199,102,0.62)",
          transform: "rotate(45deg)",
          boxSizing: "border-box",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 28,
          display: "grid",
          placeItems: "center",
          color: "#F2C766",
          fontSize: 27,
          fontWeight: 1000,
          letterSpacing: 0,
        }}
      >
        GSN
      </div>
    </div>
  );
}

type WizardActivePanel = "details" | "verification" | "community" | null;

function WizardProgress({
  guideDone,
  activePanel,
  detailsDone,
  trustDone,
  communityDone,
}: {
  guideDone: boolean;
  activePanel: WizardActivePanel;
  detailsDone: boolean;
  trustDone: boolean;
  communityDone: boolean;
}): React.ReactElement {
  const steps = [
    { number: "1", label: "Details", active: !guideDone || activePanel === "details", done: detailsDone },
    { number: "2", label: "Community", active: activePanel === "community", done: communityDone },
    { number: "3", label: "Trust", active: activePanel === "verification", done: trustDone },
  ];
  return (
    <div
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        alignItems: "start",
        gap: 0,
        width: "min(100%, 330px)",
        marginTop: 10,
        padding: "0 3px",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 30,
          right: 30,
          top: 13,
          borderTop: "2px dashed rgba(126,164,204,0.28)",
        }}
      />
      {steps.map((item) => (
          <div
            key={item.number}
            style={{
              position: "relative",
              display: "grid",
              justifyItems: "center",
              gap: 4,
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                background: item.active
                  ? "linear-gradient(180deg, #F8D779 0%, #D6AA45 100%)"
                  : "rgba(7,23,44,0.42)",
                border: item.active
                  ? "1px solid rgba(255,245,204,0.80)"
                  : "1px solid rgba(126,164,204,0.32)",
                color: item.active ? "#07172C" : "#E4EEF8",
                fontSize: 12,
                fontWeight: 1000,
                boxShadow: item.active
                  ? "0 12px 24px rgba(214,170,69,0.28), inset 0 1px 0 rgba(255,255,255,0.42)"
                  : "inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              {item.number}
            </div>
            <div
              style={{
                color: item.active ? "#F2C766" : "#8FA7BD",
                fontSize: 9.5,
                fontWeight: 900,
              }}
            >
              {item.label}
            </div>
          </div>
      ))}
    </div>
  );
}

function GuideDocumentGlyph(): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        right: 10,
        top: 24,
        width: 42,
        height: 42,
        opacity: 0.20,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 18,
          border: "2px solid rgba(255,255,255,0.72)",
          background: "rgba(255,255,255,0.12)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.40)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 22,
          right: 22,
          top: 28,
          display: "grid",
          gap: 8,
        }}
      >
        {[0, 1, 2].map((line) => (
          <span
            key={line}
            style={{
              height: 4,
              borderRadius: 999,
              background: "rgba(255,255,255,0.72)",
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          right: -12,
          bottom: -10,
          width: 44,
          height: 44,
          borderRadius: 999,
          border: "2px solid rgba(255,255,255,0.80)",
          display: "grid",
          placeItems: "center",
          color: "#FFFFFF",
          fontWeight: 1000,
          fontSize: 22,
        }}
      >
        i
      </div>
    </div>
  );
}

type EntryVerificationResult = {
  verification_check_id?: number;
  verification_type?: string;
  status?: string;
  provider_key?: string;
  region_code?: string | null;
  confidence_score?: number | null;
  explanation?: string;
  evidence_url?: string | null;
  evidence_recorded?: boolean;
  verified_at?: string | null;
} | null;

type PhoneVerificationProof = {
  display_name?: string;
  phone_e164?: string;
  verified_at?: string;
  registered_only?: boolean;
  confirmation_message?: string;
  trust_event_response?: {
    event_type?: string;
    status?: string;
    message?: string;
  };
} | null;

type BankRecordProof = {
  confirmation_message?: string;
  verification_status?: string;
  verification_note?: string;
  trust_event_response?: {
    event_type?: string;
    status?: string;
    message?: string;
  };
} | null;

function verificationCard(status?: string | null): React.CSSProperties {
  const normalized = safeStr(status).toLowerCase();

  if (normalized === "matched") {
    return {
      borderRadius: 16,
      padding: 14,
      border: "1px solid #A7F3D0",
      background: "#ECFDF5",
      color: "#065F46",
    };
  }

  if (normalized === "partial_match" || normalized === "manual_review_required") {
    return {
      borderRadius: 16,
      padding: 14,
      border: "1px solid #FDE68A",
      background: "#FFFBEB",
      color: "#92400E",
    };
  }

  if (normalized === "unavailable") {
    return {
      borderRadius: 16,
      padding: 14,
      border: "1px solid #BFDBFE",
      background: "#EFF6FF",
      color: "#1D4ED8",
    };
  }

  return {
    borderRadius: 16,
    padding: 14,
    border: "1px solid #FECACA",
    background: "#FEF2F2",
    color: "#991B1B",
  };
}

function stageShell(active = false, complete = false): React.CSSProperties {
  if (active) {
    return {
      borderRadius: 24,
      padding: 14,
      border: "1px solid rgba(126,164,204,0.30)",
      background:
        "linear-gradient(180deg, rgba(12,42,69,0.92) 0%, rgba(9,31,53,0.96) 100%)",
      boxShadow:
        "0 18px 36px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.10)",
    };
  }

  if (complete) {
    return {
      borderRadius: 24,
      padding: 14,
      border: "1px solid rgba(242,199,102,0.28)",
      background:
        "linear-gradient(180deg, rgba(18,54,82,0.88) 0%, rgba(10,32,54,0.96) 100%)",
      boxShadow:
        "0 14px 28px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
    };
  }

  return {
    borderRadius: 16,
    padding: 8,
    border: "1px solid rgba(126,164,204,0.22)",
    background:
      "linear-gradient(180deg, rgba(13,43,70,0.76) 0%, rgba(8,29,49,0.88) 100%)",
    boxShadow:
      "0 14px 28px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
  };
}

function stageBadge(
  active = false,
  complete = false
): React.CSSProperties {
  return {
    width: 44,
    height: 44,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 1000,
    fontSize: 22,
    background: active
      ? "linear-gradient(180deg, rgba(35,80,124,0.96) 0%, rgba(17,49,82,0.98) 100%)"
      : complete
        ? "linear-gradient(180deg, #D6AA45 0%, #9B6E1F 100%)"
        : "linear-gradient(180deg, rgba(35,80,124,0.64) 0%, rgba(12,37,63,0.78) 100%)",
    color: active || complete ? "#FFFFFF" : "rgba(248,251,255,0.90)",
    boxShadow: active || complete
      ? "0 14px 24px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.18)"
      : "0 12px 22px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.12)",
    border:
      active || complete
        ? "1px solid rgba(255,255,255,0.16)"
        : "1px solid rgba(126,164,204,0.22)",
    textShadow:
      active || complete ? "0 1px 0 rgba(0,0,0,0.12)" : "0 1px 0 rgba(255,255,255,0.68)",
  };
}

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function otpDigits(value: any): string {
  return safeStr(value).replace(/\D/g, "").slice(0, 8);
}

function structuredErrorDetail(err: any): Record<string, any> | null {
  const raw = safeStr(err?.message || err);
  if (!raw.startsWith("{") || !raw.endsWith("}")) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function resolveIssuedGmfnId(out: any, me: any): string {
  return safeStr(
    me?.gmfn_id ||
      out?.gmfn_id ||
      out?.user?.gmfn_id ||
      out?.member?.gmfn_id ||
      out?.data?.gmfn_id
  );
}

function resolveActivationRequestId(out: any): string {
  return safeStr(
    out?.request_id ||
      out?.join_request_id ||
      out?.member_request_id ||
      out?.approval_request_id
  );
}

const BANK_COUNTRY_OPTIONS = countryOptions();

function currencyForBankCountry(country: string): string {
  return evidenceRequirementForCountry(country).currency || "";
}

function bankVerificationHelpText(result: EntryVerificationResult): string {
  const status = safeStr(result?.status).toLowerCase();
  const explanation = safeStr(result?.explanation);

  if (status === "unavailable") {
    return (
      "Your bank or wallet details have been recorded. Automated bank checking is not available for this region yet, so GSN keeps this as reviewable evidence instead of blocking you."
    );
  }

  if (status === "manual_review_required") {
    return (
      "Your bank or wallet details have been recorded, but this one needs human review or more information before it can become a stronger bank-check signal."
    );
  }

  if (status === "failed") {
    return (
      explanation ||
      "The live bank check could not confirm these details. Check the account name, number, country, and any required sort code or IBAN, then try again."
    );
  }

  if (status === "partial_match") {
    return (
      explanation ||
      "The bank check found a partial match. GSN recorded it, but it may need a closer review before it becomes strong evidence."
    );
  }

  if (status === "matched") {
    return (
      explanation ||
      "The bank check matched these details and GSN has recorded it as stronger identity evidence."
    );
  }

  return explanation || "The bank verification result is now attached to this onboarding session.";
}

export default function CreateEntryPage() {
  const nav = useNavigate();
  const location = useLocation();

  const search = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const stateCreateEntry =
    (location.state as {
      create_entry?: {
        clan_name?: string;
        clan_description?: string;
        display_name?: string;
        nickname?: string;
        phone_e164?: string;
        phone?: string;
        email?: string;
        country?: string;
        create_code?: string;
      };
    } | null)?.create_entry || null;

  const createCode = safeStr(
    stateCreateEntry?.create_code ||
      search.get("create_code") ||
      getCreateCode() ||
      ""
  );

  const restoredDraft = useMemo(
    () => readCreateEntryDraft(createCode),
    [createCode]
  );

  const initialCommunityName = safeStr(
    stateCreateEntry?.clan_name ||
      search.get("clan_name") ||
      search.get("community_name") ||
      restoredDraft?.communityName ||
      ""
  );

  const initialDescription = safeStr(
    stateCreateEntry?.clan_description ||
      search.get("clan_description") ||
      search.get("community_description") ||
      restoredDraft?.description ||
      ""
  );

  const initialEmail = safeStr(
    stateCreateEntry?.email || search.get("email") || restoredDraft?.email || ""
  );
  const initialDisplayName = safeStr(
    stateCreateEntry?.display_name ||
      stateCreateEntry?.nickname ||
      search.get("display_name") ||
      search.get("nickname") ||
      restoredDraft?.displayName ||
      ""
  );
  const initialPhone = safeStr(
    stateCreateEntry?.phone_e164 ||
      stateCreateEntry?.phone ||
      search.get("phone_e164") ||
      search.get("phone") ||
      restoredDraft?.phone ||
      ""
  );
  const initialCountry = safeStr(
    stateCreateEntry?.country ||
      search.get("country") ||
      restoredDraft?.country ||
      countryFromPhone(initialPhone) ||
      "Nigeria"
  );

  const hasInitialCommunityContext = Boolean(
    initialCommunityName || initialDescription
  );
  const initialStep =
    restoredDraft?.step ||
    (hasInitialCommunityContext ? "community" : "details");
  const initialOpenPanel =
    restoredDraft?.openPanel ||
    (restoredDraft?.step === "community" && restoredDraft?.phoneVerificationProof
      ? "community"
        : restoredDraft?.step === "verify" || restoredDraft?.step === "bank"
          ? "verification"
          : hasInitialCommunityContext
            ? "community"
          : "details");

  const [communityName, setCommunityName] = useState(initialCommunityName);
  const [description, setDescription] = useState(initialDescription);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState(initialEmail);
  const [country, setCountry] = useState(initialCountry);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyTarget, setBusyTarget] = useState<FeedbackTarget | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [feedbackTarget, setFeedbackTarget] = useState<FeedbackTarget>("global");
  const [communityDetailsRecorded, setCommunityDetailsRecorded] = useState(false);
  const [createOutcome, setCreateOutcome] = useState<CreateCommunityOutcome | null>(null);
  const [optionalEvidenceStep, setOptionalEvidenceStep] =
    useState<OptionalEvidenceStep>("photo");
  const [resumeNotice, setResumeNotice] = useState(
    restoredDraft
      ? "GSN restored your unfinished entry. Passwords, SMS codes, photos, and bank numbers are not stored."
      : ""
  );
  const [step, setStep] = useState<"details" | "verify" | "bank" | "community">(
    initialStep
  );
  const [verificationId, setVerificationId] = useState<number>(
    Number(restoredDraft?.verificationId || 0)
  );
  const [otpCode, setOtpCode] = useState("");
  const [otpPreview, setOtpPreview] = useState("");
  const [otpDeliveryMode, setOtpDeliveryMode] = useState("");
  const [phoneVerificationProof, setPhoneVerificationProof] =
    useState<PhoneVerificationProof>(restoredDraft?.phoneVerificationProof || null);
  const [bankRecordProof, setBankRecordProof] = useState<BankRecordProof>(
    restoredDraft?.bankRecordProof || null
  );
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankSortCode, setBankSortCode] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [bankCountry, setBankCountry] = useState(initialCountry);
  const [bankCurrency, setBankCurrency] = useState(
    currencyForBankCountry(initialCountry) || "NGN"
  );
  const [bankNote, setBankNote] = useState("");
  const [driverLicenceNumber, setDriverLicenceNumber] = useState("");
  const [driverLicenceCountry, setDriverLicenceCountry] = useState(initialCountry);
  const [driverLicenceNote, setDriverLicenceNote] = useState("");
  const [identityPhotoItems, setIdentityPhotoItems] = useState<IdentityPhotoSelection[]>([]);
  const [identityPhotoKind, setIdentityPhotoKind] = useState("selfie");
  const [identityPhotoNote, setIdentityPhotoNote] = useState("");
  const [identityPhotoRecordedCount, setIdentityPhotoRecordedCount] = useState(
    restoredDraft?.identityPhotoResult ? 1 : 0
  );
  const [bankVerificationResult, setBankVerificationResult] =
    useState<EntryVerificationResult>(restoredDraft?.bankVerificationResult || null);
  const [licenceVerificationResult, setLicenceVerificationResult] =
    useState<EntryVerificationResult>(restoredDraft?.licenceVerificationResult || null);
  const [identityPhotoResult, setIdentityPhotoResult] =
    useState<EntryVerificationResult>(restoredDraft?.identityPhotoResult || null);
  const restoredSessionCheckedRef = useRef(false);
  const [guideDone, setGuideDone] = useState(
    true
  );
  const [procedureOpen, setProcedureOpen] = useState(false);
  const [guideStepOpen, setGuideStepOpen] = useState<GuideStepKey | null>(null);
  const [existingMemberOpen, setExistingMemberOpen] = useState(false);
  const [openPanel, setOpenPanel] = useState<"details" | "verification" | "community" | null>(
    initialOpenPanel
  );
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const verificationRef = useRef<HTMLDivElement | null>(null);
  const communityRef = useRef<HTMLDivElement | null>(null);
  const panelRevealFrameRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const selfiePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const galleryPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const identityPhotoItemsRef = useRef<IdentityPhotoSelection[]>([]);

  const identityPhotoCount = identityPhotoItems.length;
  const identityPhotoReady = identityPhotoCount > 0 && !identityPhotoResult;
  const regionalEvidence = useMemo(
    () => evidenceRequirementForCountry(country || bankCountry || driverLicenceCountry),
    [bankCountry, country, driverLicenceCountry]
  );

  const passwordReady =
    safeStr(password).length >= 6 && safeStr(password) === safeStr(confirmPassword);
  const canContinue =
    !!safeStr(communityName) &&
    !!safeStr(displayName) &&
    !!safeStr(phone) &&
    !!safeStr(email) &&
    !!safeStr(country) &&
    passwordReady;
  const canRecordCommunityDetails =
    step === "community" &&
    Number(verificationId) > 0 &&
    !!safeStr(communityName);
  const canFinishCommunityRegistration =
    Boolean(communityDetailsRecorded || createOutcome) &&
    Number(verificationId) > 0 &&
    !!safeStr(communityName) &&
    canContinue;
  const phoneEvidenceRecorded = Boolean(
    phoneVerificationProof || (step === "community" && Number(verificationId) > 0)
  );
  const canContinueDetails =
    !!safeStr(displayName) &&
    !!safeStr(phone) &&
    !!safeStr(email) &&
    !!safeStr(country) &&
    passwordReady;
  const normalizedOtpCode = otpDigits(otpCode);
  const canConfirmOtp = Number(verificationId) > 0 && normalizedOtpCode.length >= 4;
  const canContinueBank =
    Number(verificationId) > 0 &&
    !!safeStr(bankAccountName) &&
    !!safeStr(bankName) &&
    !!safeStr(bankAccountNumber);
  const canRecordOfficialId =
    Number(verificationId) > 0 &&
    !!safeStr(driverLicenceNumber) &&
    !!safeStr(driverLicenceCountry || country);
  const founderEvidence = useMemo(
    () =>
      buildIdentityEvidenceCompletion({
        detailsDone: canContinueDetails,
        phoneDone: phoneEvidenceRecorded,
        photoRecorded: Boolean(identityPhotoResult),
        photoReady: identityPhotoReady,
        bankRecorded: Boolean(bankRecordProof || bankVerificationResult),
        officialIdRecorded: Boolean(licenceVerificationResult),
        countReadyAsProgress: true,
      }),
    [
      bankRecordProof,
      bankVerificationResult,
      canContinueDetails,
      identityPhotoReady,
      identityPhotoResult,
      licenceVerificationResult,
      phoneEvidenceRecorded,
    ]
  );
  const stepProgress = useMemo(
    () => ({
      details: step === "details",
      verification: step === "verify" || step === "bank",
      community: step === "community",
      detailsDone:
        step === "verify" || step === "bank" || step === "community",
      verificationDone: Boolean(
        bankRecordProof ||
          bankVerificationResult ||
          licenceVerificationResult ||
          identityPhotoResult
      ),
    }),
    [step, bankRecordProof, bankVerificationResult, licenceVerificationResult, identityPhotoResult]
  );

  const canOpenDetails = guideDone;
  const canOpenVerification = step !== "details" && Number(verificationId) > 0;
  const canOpenCommunity = step === "community" || communityDetailsRecorded || Boolean(createOutcome);
  const communityDecisionMode =
    openPanel === "community" && communityDetailsRecorded && !createOutcome;
  const activeEvidenceMode = openPanel === "verification" && step !== "verify";
  const showPhotoEvidenceBlock =
    optionalEvidenceStep === "photo" && !identityPhotoResult;
  const showBankEvidenceBlock =
    optionalEvidenceStep === "bank" && !bankRecordProof && !bankVerificationResult;
  const showOfficialIdEvidenceBlock =
    optionalEvidenceStep === "official_id" && !licenceVerificationResult;

  const verificationBlockTitle =
    step === "verify"
      ? "Phone confirmation"
      : "Founder trust level";
  const verificationBlockHelp =
    step === "verify"
      ? "Record this phone against your entry name. SMS proof can come later."
      : "Optional proof. Add what you have now, or finish and continue.";

  function applyPhonePrefix(prefix: string) {
    setPhone((current) => {
      const cleaned = safeStr(current).replace(/^\+\d{1,4}\s*/, "").trim();
      return cleaned ? `${prefix} ${cleaned}` : `${prefix} `;
    });
    const nextCountry = countryFromPhone(prefix);
    if (nextCountry) {
      handleCountryChange(nextCountry);
    }
  }

  const existingMemberLoginTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    params.set("entry", "existing");
    params.set("force", "1");
    params.delete("create_code");
    params.delete("founder_code");
    params.delete("public_create_code");
    params.delete("code");
    const query = params.toString();
    return `/login${query ? `?${query}` : "?entry=existing&force=1"}`;
  }, [location.search]);

  function cancelPendingPanelReveal() {
    if (typeof window !== "undefined" && panelRevealFrameRef.current !== null) {
      window.cancelAnimationFrame(panelRevealFrameRef.current);
      panelRevealFrameRef.current = null;
    }
  }

  function focusPanel(next: "details" | "verification" | "community") {
    const map = {
      details: detailsRef,
      verification: verificationRef,
      community: communityRef,
    } as const;
    if (typeof window === "undefined") return;

    cancelPendingPanelReveal();

    let attempts = 0;
    const reveal = () => {
      const node = map[next].current;
      if (node) {
        node.scrollIntoView({ behavior: "auto", block: "start" });
        panelRevealFrameRef.current = null;
        return;
      }

      attempts += 1;
      if (attempts >= 10) {
        panelRevealFrameRef.current = null;
        return;
      }

      panelRevealFrameRef.current = window.requestAnimationFrame(reveal);
    };

    panelRevealFrameRef.current = window.requestAnimationFrame(reveal);
  }

  function handleOpenPanel(next: "details" | "verification" | "community") {
    if (next === "details" && !canOpenDetails) {
      setProcedureOpen(true);
      return;
    }
    if (next === "verification" && !canOpenVerification) return;
    if (next === "community" && !canOpenCommunity) return;
    setOpenPanel(next);
    focusPanel(next);
  }

  function handleToggleDetailsGroup() {
    if (!guideDone) {
      setProcedureOpen(true);
      return;
    }

    if (openPanel !== null) {
      setOpenPanel(null);
      return;
    }

    if (canOpenCommunity) {
      handleOpenPanel("community");
      return;
    }

    if (canOpenVerification) {
      handleOpenPanel("verification");
      return;
    }

    handleOpenPanel("details");
  }

  function handleGuideDone() {
    setGuideDone(true);
    setProcedureOpen(false);
    if (step === "details") {
      setOpenPanel("details");
      focusPanel("details");
    }
  }

  function clearIdentityPhotoSelections() {
    setIdentityPhotoItems((items) => {
      items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  }

  function handleExistingMemberLogin() {
    writeStorage(ENTRY_MODE_KEY, "existing");
    writeStorage(ENTRY_CREATE_CODE_KEY, null);
    writeStorage(ENTRY_INVITE_CODE_KEY, null);
    clearCreateEntryDraft(createCode);
    nav(existingMemberLoginTo, { replace: false });
  }

  function handleStartFreshEntry() {
    clearCreateEntryDraft(createCode);
    setCommunityName("");
    setDescription("");
    setDisplayName("");
    setPhone("");
    setEmail("");
    setCountry("Nigeria");
    setPassword("");
    setConfirmPassword("");
    setVerificationId(0);
    setOtpCode("");
    setOtpPreview("");
    setOtpDeliveryMode("");
    setPhoneVerificationProof(null);
    setBankRecordProof(null);
    setBankVerificationResult(null);
    setLicenceVerificationResult(null);
    setIdentityPhotoResult(null);
    setIdentityPhotoRecordedCount(0);
    clearIdentityPhotoSelections();
    setStep("details");
    setGuideDone(true);
    setOpenPanel("details");
    setError("");
    setSuccess("");
    setResumeNotice("");
  }

  useEffect(() => {
    return () => cancelPendingPanelReveal();
  }, []);

  useEffect(() => {
    identityPhotoItemsRef.current = identityPhotoItems;
  }, [identityPhotoItems]);

  useEffect(() => {
    return () => {
      identityPhotoItemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  useEffect(() => {
    saveCreateEntryDraft(createCode, {
      communityName,
      description,
      displayName,
      phone,
      email,
      country,
      createCode,
      step,
      openPanel,
      guideDone,
      verificationId,
      phoneVerificationProof,
      bankRecordProof,
      bankVerificationResult,
      licenceVerificationResult,
      identityPhotoResult,
    });
  }, [
    bankRecordProof,
    bankVerificationResult,
    communityName,
    createCode,
    country,
    description,
    displayName,
    email,
    guideDone,
    identityPhotoResult,
    licenceVerificationResult,
    openPanel,
    phone,
    phoneVerificationProof,
    step,
    verificationId,
  ]);

  useEffect(() => {
    if (restoredSessionCheckedRef.current) return;
    if (!restoredDraft?.verificationId) return;
    if (!verificationId || !safeStr(phone)) return;

    restoredSessionCheckedRef.current = true;

    resumeEntryPhoneVerification({
      verification_id: verificationId,
      phone_e164: phone,
    })
      .then((out) => {
        if (out?.can_continue) return;

        setResumeNotice(
          safeStr(out?.message) ||
            "Your saved entry is still on this phone, but the secure backend session is no longer active. Start the phone step again."
        );
        setVerificationId(0);
        setOtpCode("");
        setOtpPreview("");
        setOtpDeliveryMode("");
        setPhoneVerificationProof(null);
        setBankRecordProof(null);
        setBankVerificationResult(null);
        setLicenceVerificationResult(null);
        setIdentityPhotoResult(null);
        setStep("details");
        setOpenPanel("details");
      })
      .catch(() => {
        setResumeNotice(
          "GSN restored your local entry details, but could not confirm the secure backend session. If the next step fails, start the phone step again."
        );
      });
  }, [phone, restoredDraft?.verificationId, verificationId]);

  useEffect(() => {
    if (!isLegacyBankRequirementMessage(error)) return;

    setError("");
    setResumeNotice(
      "Bank or wallet details are optional founder evidence now. You can name the community and create it first."
    );
  }, [error]);

  useEffect(() => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }

    if (!error && !success) return;

    const targetAtSchedule = feedbackTarget;
    const dismissAfterMs = error ? 7200 : 5200;
    feedbackTimerRef.current = window.setTimeout(() => {
      if (feedbackTarget === targetAtSchedule) {
        setError("");
        setSuccess("");
      }
      feedbackTimerRef.current = null;
    }, dismissAfterMs);

    return () => {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }
    };
  }, [error, feedbackTarget, success]);

  const existingMemberPanel = (
    <div style={existingMemberCard(existingMemberOpen)}>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          right: -30,
          top: -34,
          width: 112,
          height: 112,
          borderRadius: 999,
          background: "radial-gradient(circle, rgba(242,199,102,0.10) 0%, rgba(242,199,102,0) 64%)",
        }}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto minmax(0, 1fr) auto",
          alignItems: "center",
          gap: 8,
          position: "relative",
          zIndex: 1,
        }}
      >
        <MiniLineIcon kind="member" />
        <div style={{ display: "grid", gap: 3 }}>
          <div style={{ ...sectionLabel(), color: "#F3D06A", fontSize: 9.5, letterSpacing: 1.4 }}>
            Already a member?
          </div>
          <div
            style={{
              color: "#F8FBFF",
              fontSize: "clamp(10.5px, 2.9vw, 12px)",
              fontWeight: 900,
              lineHeight: 1.24,
            }}
          >
            Already registered? Sign in.
          </div>
        </div>

        <SecondaryButton
          onClick={() => setExistingMemberOpen((current) => !current)}
          minWidth={122}
          stableHeight={35}
          debugId="create-entry.existing-member.toggle"
          style={{
            ...secondaryBtn(),
            minHeight: 35,
            padding: "7px 9px",
            fontSize: "clamp(10px, 2.8vw, 12px)",
            color: "#F8FBFF",
            border: "1px solid rgba(126,164,204,0.32)",
            background: "rgba(7,23,44,0.24)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
          }}
        >
          {existingMemberOpen ? "Close" : "Sign-in help"}
        </SecondaryButton>
      </div>

      {existingMemberOpen ? (
        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.08)",
            padding: 14,
            display: "grid",
            gap: 12,
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.86)",
              fontSize: 13.5,
              lineHeight: 1.7,
              fontWeight: 700,
            }}
          >
            Already have GSN? Sign in to open your workspace.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <PrimaryButton
              onClick={handleExistingMemberLogin}
              minWidth={178}
              stableHeight={52}
              debugId="create-entry.existing-member.sign-in"
              style={{
                ...primaryBtn(false),
                width: "auto",
                minWidth: 178,
                flex: "1 1 220px",
              }}
            >
              Sign in
            </PrimaryButton>
            <SecondaryButton
              onClick={() => setExistingMemberOpen(false)}
              minWidth={112}
              stableHeight={44}
              debugId="create-entry.existing-member.stay"
              style={{
                ...secondaryBtn(),
                minWidth: 112,
              }}
            >
              Stay here
            </SecondaryButton>
          </div>
        </div>
      ) : null}
    </div>
  );

  function showError(target: FeedbackTarget, message: string) {
    setFeedbackTarget(target);
    setSuccess("");
    setError(message);
  }

  function showSuccess(target: FeedbackTarget, message: string) {
    setFeedbackTarget(target);
    setError("");
    setSuccess(message);
  }

  function clearFeedback(target?: FeedbackTarget) {
    if (target) setFeedbackTarget(target);
    setError("");
    setSuccess("");
  }

  function beginAction(target: FeedbackTarget) {
    clearFeedback(target);
    setBusyTarget(target);
    setBusy(true);
  }

  function finishAction() {
    setBusy(false);
    setBusyTarget(null);
  }

  function missingFinishItems(): string[] {
    const missing: string[] = [];
    if (!communityDetailsRecorded) missing.push("record community details");
    if (!safeStr(communityName)) missing.push("community name");
    if (!Number(verificationId)) missing.push("phone proof");
    if (!safeStr(displayName)) missing.push("name");
    if (!safeStr(country)) missing.push("country");
    if (!safeStr(phone)) missing.push("phone");
    if (!safeStr(email)) missing.push("email");
    if (!passwordReady) missing.push("matching password");
    return missing;
  }

  function finishBlockedMessage(): string {
    const missing = missingFinishItems();

    return buildActionBlockedMessage({
      actionLabel: "Finish registration",
      missing,
      firstStep: !communityDetailsRecorded
        ? "record the community details, then GSN can create the community and move you to First Circle"
        : undefined,
      retryStep: communityDetailsRecorded
        ? "Reopen Details or Community setup, correct that item, then tap Finish registration now again."
        : undefined,
      fallback:
        "GSN cannot finish this registration yet. Please try again, or reopen the last completed step so the app can refresh the answer.",
    });
  }

  function hasLiveFeedback(target: FeedbackTarget) {
    return feedbackTarget === target && Boolean(error || success);
  }

  function isVerificationActionTarget(target: FeedbackTarget | null) {
    return (
      target === "phone" ||
      target === "photo" ||
      target === "bank" ||
      target === "verification"
    );
  }

  function shouldShowVerificationBlock(target: FeedbackTarget) {
    if (!busyTarget || !isVerificationActionTarget(busyTarget)) return true;
    return busyTarget === target;
  }

  function shouldShowVerificationResult(target: FeedbackTarget) {
    if (!shouldShowVerificationBlock(target)) return false;
    return !hasLiveFeedback(target);
  }

  function handleIdentityPhotoSelected(
    files: FileList | File[] | null | undefined,
    kind: string,
    sourceLabel: string
  ) {
    if (identityPhotoResult) {
      showError(
        "photo",
        "Photo evidence is already recorded for this entry. Use Clear if you need to choose the photos again before finishing."
      );
      return;
    }

    setIdentityPhotoKind(kind);
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) {
      showError(
        "photo",
        "No photo was selected. Try Selfie again or choose a file from your phone."
      );
      return;
    }

    const acceptableFiles = selectedFiles.filter((file) => {
      const type = safeStr(file.type).toLowerCase();
      const name = safeStr(file.name).toLowerCase();
      const looksSupported =
        type === "image/jpeg" ||
        type === "image/png" ||
        type === "image/webp" ||
        name.endsWith(".jpg") ||
        name.endsWith(".jpeg") ||
        name.endsWith(".png") ||
        name.endsWith(".webp");
      return looksSupported && file.size <= MAX_IDENTITY_PHOTO_BYTES;
    });

    if (!acceptableFiles.length) {
      showError(
        "photo",
        "Use jpg, jpeg, png, or webp images under 5MB each. GSN cannot attach the selected file type."
      );
      return;
    }

    const remaining = Math.max(0, MAX_IDENTITY_PHOTO_SELECTIONS - identityPhotoItems.length);
    const accepted = acceptableFiles.slice(0, remaining);
    const addedCount = accepted.length;
    const skippedCount = Math.max(0, selectedFiles.length - accepted.length);

    if (accepted.length) {
      const nextItems = accepted.map((file, index) => ({
        id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
        file,
        kind,
        previewUrl: URL.createObjectURL(file),
      }));
      setIdentityPhotoItems((current) => [...current, ...nextItems]);
    }

    if (addedCount > 0) {
      showSuccess(
        "photo",
        `${sourceLabel} received. ${addedCount} photo${addedCount === 1 ? "" : "s"} queued. You can attach up to ${MAX_IDENTITY_PHOTO_SELECTIONS}, then tap Record photo evidence.`
      );
      return;
    }

    showError(
      "photo",
      skippedCount > 0
        ? `GSN already has ${MAX_IDENTITY_PHOTO_SELECTIONS} photos queued. Remove one before adding another.`
        : "No supported photo could be queued."
    );
  }

  function removeIdentityPhotoSelection(id: string) {
    setIdentityPhotoItems((items) => {
      const removed = items.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return items.filter((item) => item.id !== id);
    });
  }

  function renderLocalFeedback(target: FeedbackTarget) {
    if (feedbackTarget !== target) return null;
    if (error) return <div style={localFeedbackCard(false)}>{error}</div>;
    if (success) return <div style={localFeedbackCard(true)}>{success}</div>;
    return null;
  }

  function FounderEvidenceMeter({ compact = false }: { compact?: boolean }) {
    return (
      <div style={{ ...evidenceMeterCard(), gridTemplateColumns: compact ? "68px minmax(0, 1fr)" : "82px minmax(0, 1fr)" }}>
        <div style={evidenceDialStyle(founderEvidence.degrees)}>
          <span aria-hidden="true" style={evidenceDialBallStyle(founderEvidence.degrees)} />
          <div style={evidenceDialInner()}>{founderEvidence.score}%</div>
        </div>
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <div style={{ display: "grid", gap: 3 }}>
            <div style={{ ...sectionLabel(), color: "#F2C766" }}>
              Founder evidence meter
            </div>
            <div style={{ color: "#F8FBFF", fontSize: compact ? 16 : 18, fontWeight: 1000, lineHeight: 1.2 }}>
              {founderEvidence.label}
            </div>
          </div>
          <div style={{ color: "#B9CBE0", fontSize: compact ? 12 : 13, fontWeight: 780, lineHeight: 1.55 }}>
            {founderEvidence.next}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {founderEvidence.items.map((item) => (
              <span
                key={item.key}
                style={{
                  borderRadius: 999,
                  border: item.done
                    ? "1px solid rgba(167,243,208,0.42)"
                    : item.ready
                      ? "1px solid rgba(242,199,102,0.48)"
                      : "1px solid rgba(255,255,255,0.15)",
                  background: item.done
                    ? "rgba(16,185,129,0.16)"
                    : item.ready
                      ? "rgba(242,199,102,0.16)"
                      : "rgba(255,255,255,0.07)",
                  color: item.done ? "#D1FAE5" : item.ready ? "#FCE7A3" : "#AFC4D8",
                  padding: "5px 8px",
                  fontSize: 10.5,
                  fontWeight: 950,
                  lineHeight: 1,
                }}
              >
                {item.done ? "Done: " : item.ready ? "Ready: " : "Add: "}
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function clearDetailsBlock() {
    setDisplayName("");
    setPhone("");
    setEmail("");
    setCountry("Nigeria");
    setPassword("");
    setConfirmPassword("");
    clearFeedback("details");
  }

  function clearVerificationBlock() {
    setOtpCode("");
    setOtpDeliveryMode("");
    setBankAccountName("");
    setBankName("");
    setBankAccountNumber("");
    setBankSortCode("");
    setBankIban("");
    setBankCountry(safeStr(country) || "Nigeria");
    setBankCurrency(currencyForBankCountry(country) || "NGN");
    setBankNote("");
    setDriverLicenceNumber("");
    setDriverLicenceCountry(safeStr(country) || "Nigeria");
    setDriverLicenceNote("");
    clearIdentityPhotoSelections();
    setIdentityPhotoKind("selfie");
    setIdentityPhotoNote("");
    setIdentityPhotoRecordedCount(0);
    setBankVerificationResult(null);
    setLicenceVerificationResult(null);
    setIdentityPhotoResult(null);
    setPhoneVerificationProof(null);
    setBankRecordProof(null);
    setOptionalEvidenceStep("photo");
    clearFeedback("verification");
  }

  function clearCommunityBlock() {
    setCommunityName("");
    setDescription("");
    setCommunityDetailsRecorded(false);
    setCreateOutcome(null);
    setOptionalEvidenceStep("photo");
    clearFeedback("community");
  }

  function handleBankCountryChange(nextCountry: string) {
    setBankCountry(nextCountry);

    const nextCurrency = currencyForBankCountry(nextCountry);
    if (nextCurrency) {
      setBankCurrency(nextCurrency);
    }
  }

  function handleCountryChange(nextCountry: string) {
    const cleanCountry = safeStr(nextCountry);
    setCountry(cleanCountry);
    if (!safeStr(bankCountry) || safeStr(bankCountry) === safeStr(country)) {
      setBankCountry(cleanCountry);
    }
    if (!safeStr(driverLicenceCountry) || safeStr(driverLicenceCountry) === safeStr(country)) {
      setDriverLicenceCountry(cleanCountry);
    }
    const nextCurrency = currencyForBankCountry(cleanCountry);
    if (nextCurrency && (!safeStr(bankCurrency) || safeStr(bankCurrency) === "NGN")) {
      setBankCurrency(nextCurrency);
    }
  }

  function isPhoneSessionExpiredError(err: any): boolean {
    const message = safeStr(err?.message || err).toLowerCase();
    return (
      message.includes("verified phone session has expired") ||
      message.includes("phone verification code has expired") ||
      message.includes("phone verification session not found")
    );
  }

  function isPhoneAlreadyRegisteredError(err: any): boolean {
    const message = safeStr(err?.message || err).toLowerCase();
    return message.includes("phone number already registered");
  }

  function isLegacyBankRequirementMessage(value: any): boolean {
    const message = safeStr(value).toLowerCase();
    return (
      message.includes("bank details must be completed before community creation") ||
      message.includes("bank or wallet details must be completed before community creation")
    );
  }

  function isCompletedAccountError(err: any): boolean {
    const message = safeStr(err?.message || err).toLowerCase();
    return (
      message.includes("phone number already registered") ||
      message.includes("email already registered") ||
      message.includes("founder identity already exists") ||
      message.includes("phone verification session has already been used") ||
      message.includes("verified phone session has already been used")
    );
  }

  function isCommunityNameTakenError(err: any): boolean {
    const detail = structuredErrorDetail(err);
    const message = safeStr(detail?.message || err?.message || err).toLowerCase();
    return (
      detail?.code === "entry_community_name_taken" ||
      message.includes("community name already exists") ||
      message.includes("clan name already exists")
    );
  }

  function communityNameTakenMessage(err?: any): string {
    const detail = structuredErrorDetail(err);
    return (
      safeStr(detail?.message) ||
      `A GSN community named ${safeStr(communityName)} already exists. Choose a different name to create a new community, or use Request to join if this is the community you meant.`
    );
  }

  function firstClanIdFrom(out: any): number | null {
    const direct = Number(
      out?.clan_id ||
        out?.clan?.id ||
        out?.selected_clan_id ||
        out?.data?.clan_id ||
        0
    );

    if (Number.isFinite(direct) && direct > 0) return direct;
    return null;
  }

  async function selectCreatedOrFirstClan(out?: any): Promise<number | null> {
    const directClanId = firstClanIdFrom(out);
    if (directClanId) {
      setSelectedClanId(directClanId);
      return directClanId;
    }

    const clans = await listMyClans().catch(() => null);
    const rows = Array.isArray(clans)
      ? clans
      : Array.isArray(clans?.items)
        ? clans.items
        : [];
    const first = rows[0] || null;
    const firstClanId = firstClanIdFrom(first);

    if (firstClanId) {
      setSelectedClanId(firstClanId);
      return firstClanId;
    }

    return null;
  }

  async function openCreatedWorkspace(out?: any): Promise<void> {
    await selectCreatedOrFirstClan(out);
    clearCreateEntryDraft(createCode);
    clearCreateEntryDraft(createCode);
    clearPublicEntryState();
    nav("/app/build-first-circle", { replace: true });
  }

  async function recoverCompletedCreateEntry(): Promise<boolean> {
    const userEmail = safeStr(email);
    const userPassword = safeStr(password);

    if (!userEmail || !userPassword) return false;

    try {
      await loginAndStore(userEmail, userPassword);
      await openCreatedWorkspace();
      return true;
    } catch {
      return false;
    }
  }

  function openActivationFromStructuredError(err: any): boolean {
    const detail = structuredErrorDetail(err);
    if (
      detail?.code !== "entry_activation_pending" &&
      detail?.next_action !== "activate_membership"
    ) {
      return false;
    }

    const gmfnId = safeStr(detail?.gmfn_id).toUpperCase();
    const activationPath =
      safeStr(detail?.activation_path) ||
      (gmfnId ? `/activate-membership?gmfn_id=${encodeURIComponent(gmfnId)}` : "");

    if (!activationPath) return false;

    clearPublicEntryState();
    nav(activationPath, {
      replace: true,
      state: {
        gmfn_id: gmfnId || undefined,
      },
    });
    return true;
  }

  async function startAndMaybeConfirmPhoneSession(): Promise<{
    verificationId: number;
    autoConfirmed: boolean;
    message: string;
  }> {
    const out = await startEntryPhoneVerification({
      display_name: safeStr(displayName),
      phone_e164: safeStr(phone),
      email: safeStr(email) || undefined,
      country: safeStr(country) || undefined,
    });

    setVerificationId(Number(out?.verification_id || 0));
    const nextVerificationId = Number(out?.verification_id || 0);
    const previewCode = safeStr(out?.otp_preview);
    const registeredOnly =
      Boolean(out?.registered_only) ||
      safeStr(out?.delivery_mode).toLowerCase() === "registration-only";
    setOtpPreview(previewCode);
    setOtpDeliveryMode(safeStr(out?.delivery_mode));
    setPhoneVerificationProof(null);
    setBankRecordProof(null);

    if (nextVerificationId > 0 && (out?.verified || registeredOnly)) {
      setPhoneVerificationProof({
        display_name: safeStr(displayName),
        phone_e164: safeStr(out?.phone_e164) || safeStr(phone),
        verified_at: safeStr(out?.verified_at),
        registered_only: registeredOnly,
        confirmation_message: safeStr(out?.confirmation_message),
        trust_event_response: undefined,
      });
      if (out?.bank_details_recorded) {
        setStep("community");
        setOpenPanel("community");
        focusPanel("community");

        return {
          verificationId: nextVerificationId,
          autoConfirmed: true,
          message:
            "GSN found your unfinished entry record. Your phone and bank or wallet details are already recorded, so you can continue with community setup.",
        };
      }

      setStep("community");
      setOpenPanel("community");
      focusPanel("community");

      return {
        verificationId: nextVerificationId,
        autoConfirmed: true,
        message:
          safeStr(out?.confirmation_message) ||
          (registeredOnly
            ? "Phone recorded. Set up the community now. Stronger checks can be added later."
            : "GSN found your verified phone record. Set up the community now. Stronger founder checks can be added as optional trust evidence."),
      };
    }

    if (nextVerificationId > 0 && previewCode) {
      const confirmed = await confirmEntryPhoneVerification({
        verification_id: nextVerificationId,
        code: previewCode,
      });

      setOtpCode(otpDigits(previewCode));
      setPhoneVerificationProof({
        display_name: safeStr(confirmed?.display_name),
        phone_e164: safeStr(confirmed?.phone_e164),
        verified_at: safeStr(confirmed?.verified_at),
        confirmation_message: safeStr(confirmed?.confirmation_message),
        trust_event_response: confirmed?.trust_event_response || null,
      });
      setStep("community");
      setOpenPanel("community");
      focusPanel("community");

      return {
        verificationId: nextVerificationId,
        autoConfirmed: true,
        message:
          safeStr(confirmed?.confirmation_message) ||
          "Phone check completed. Set up the community now. You can add stronger founder checks as optional trust evidence.",
      };
    }

    setStep("verify");
    setOpenPanel("verification");
    focusPanel("verification");

    return {
      verificationId: nextVerificationId,
      autoConfirmed: false,
      message:
        safeStr(out?.message) ||
        "Phone confirmation started. Enter the code to continue.",
    };
  }

  async function handleStartVerification() {
    if (!canContinueDetails || busy) return;

    beginAction("details");

    try {
      const started = await startAndMaybeConfirmPhoneSession();
      showSuccess(started.autoConfirmed ? "community" : "phone", started.message);
    } catch (err: any) {
      if (openActivationFromStructuredError(err)) return;

      if (isPhoneAlreadyRegisteredError(err)) {
        const recovered = await recoverCompletedCreateEntry();
        if (recovered) return;

        setExistingMemberOpen(true);
        showError(
          "details",
          "This phone number already belongs to a completed GSN account. Please use Already a member to sign in instead of starting a second community entry."
        );
      } else {
        showError("details", err?.message || "Phone verification could not be started.");
      }
    } finally {
      finishAction();
    }
  }

  async function handleConfirmVerification() {
    if (!canConfirmOtp || busy) return;

    beginAction("phone");

    try {
      const out = await confirmEntryPhoneVerification({
        verification_id: verificationId,
        code: normalizedOtpCode,
      });

      setPhoneVerificationProof({
        display_name: safeStr(out?.display_name),
        phone_e164: safeStr(out?.phone_e164),
        verified_at: safeStr(out?.verified_at),
        confirmation_message: safeStr(out?.confirmation_message),
        trust_event_response: out?.trust_event_response || null,
      });
      setStep("community");
      setOpenPanel("community");
      focusPanel("community");
      showSuccess(
        "phone",
        safeStr(out?.confirmation_message) ||
          "Phone verified. Set up the community now. Optional founder checks can be added for stronger trust."
      );
    } catch (err: any) {
      showError("phone", err?.message || "Phone verification could not be completed.");
    } finally {
      finishAction();
    }
  }

  async function saveBankDetailsForVerification(activeVerificationId: number): Promise<{
    out: any;
    bankVerification: EntryVerificationResult;
  }> {
    const out = await saveEntryBankDetails({
      verification_id: activeVerificationId,
      destination_name: safeStr(bankAccountName),
      bank_name: safeStr(bankName),
      account_number: safeStr(bankAccountNumber),
      phone_number: safeStr(phone) || undefined,
      country: safeStr(bankCountry || country) || undefined,
      currency: safeStr(bankCurrency) || "NGN",
      note: safeStr(bankNote) || undefined,
    });

    setBankRecordProof({
      confirmation_message: safeStr(out?.confirmation_message),
      verification_status: safeStr(out?.verification_status),
      verification_note: safeStr(out?.verification_note),
      trust_event_response: out?.trust_event_response || null,
    });

    let nextBankVerification: EntryVerificationResult = null;

    try {
      const bankVerification = await verifyEntryBankDetails({
        verification_id: activeVerificationId,
        destination_name: safeStr(bankAccountName),
        bank_name: safeStr(bankName),
        account_number: safeStr(bankAccountNumber),
        sort_code: safeStr(bankSortCode) || undefined,
        iban: safeStr(bankIban) || undefined,
        phone_number: safeStr(phone) || undefined,
        country: safeStr(bankCountry || country) || undefined,
        currency: safeStr(bankCurrency) || "NGN",
        note: safeStr(bankNote) || undefined,
      });
      nextBankVerification = bankVerification;

      if (Number(bankVerification?.verification_check_id || 0) > 0) {
        nextBankVerification = await getEntryVerificationCheck(
          bankVerification.verification_check_id
        ).catch(() => bankVerification);
      }
    } catch (verificationErr: any) {
      nextBankVerification = {
        status: "failed",
        explanation:
          verificationErr?.message ||
          "Bank verification could not be checked right now.",
      };
    }

    setBankVerificationResult(nextBankVerification);

    return { out, bankVerification: nextBankVerification };
  }

  function finishBankStep(out: any, nextBankVerification: EntryVerificationResult) {
    setStep("community");
    setOpenPanel("verification");
    setOptionalEvidenceStep("bank_done");
    showSuccess(
      "bank",
      safeStr(out?.confirmation_message) ||
        safeStr(nextBankVerification?.explanation) ||
        safeStr(out?.verification_note) ||
        "Optional founder proof recorded. You can continue creating the community."
    );
  }

  async function handleRecordOfficialId() {
    if (!canRecordOfficialId || busy) return;

    beginAction("verification");

    try {
      const out = await recordEntryOfficialId({
        verification_id: verificationId,
        document_type: regionalEvidence.officialIdLabel,
        document_reference: safeStr(driverLicenceNumber),
        country: safeStr(driverLicenceCountry || country),
        note: safeStr(driverLicenceNote) || undefined,
      });
      setLicenceVerificationResult(out);
      setOptionalEvidenceStep("official_id_done");
      showSuccess(
        "verification",
        safeStr(out?.explanation) ||
          `${regionalEvidence.officialIdLabel} evidence recorded for later review.`
      );
      setOpenPanel("verification");
    } catch (err: any) {
      if (isPhoneSessionExpiredError(err) && canContinueDetails) {
        try {
          const refreshedVerificationId = await refreshPilotPhoneSession();
          const out = await recordEntryOfficialId({
            verification_id: refreshedVerificationId,
            document_type: regionalEvidence.officialIdLabel,
            document_reference: safeStr(driverLicenceNumber),
            country: safeStr(driverLicenceCountry || country),
            note: safeStr(driverLicenceNote) || undefined,
          });
          setLicenceVerificationResult(out);
          setOptionalEvidenceStep("official_id_done");
          showSuccess(
            "verification",
            `Your phone proof had timed out, so GSN refreshed it and recorded ${regionalEvidence.officialIdLabel} evidence.`
          );
        } catch (retryErr: any) {
          showError(
            "verification",
            retryErr?.message ||
              "Official ID evidence could not be recorded. Start the phone step again and retry."
          );
        }
      } else {
        showError(
          "verification",
          err?.message || "Official ID evidence could not be recorded."
        );
      }
    } finally {
      finishAction();
    }
  }

  async function refreshPilotPhoneSession(): Promise<number> {
    const refreshed = await startAndMaybeConfirmPhoneSession();

    if (!refreshed.autoConfirmed || !refreshed.verificationId) {
      throw new Error(
        "Your phone proof has timed out. Please start this entry step afresh so GSN can link the phone to your name again."
      );
    }

    return refreshed.verificationId;
  }

  async function handleSaveBankDetails() {
    if (!canContinueBank || busy) return;

    beginAction("bank");

    try {
      const saved = await saveBankDetailsForVerification(verificationId);
      finishBankStep(saved.out, saved.bankVerification);
    } catch (err: any) {
      if (isPhoneSessionExpiredError(err) && canContinueDetails) {
        try {
          const refreshedVerificationId = await refreshPilotPhoneSession();
          const saved = await saveBankDetailsForVerification(refreshedVerificationId);
          finishBankStep(saved.out, saved.bankVerification);
          showSuccess(
            "bank",
            "Your phone proof had timed out, so GSN refreshed it and saved your bank or wallet details."
          );
        } catch (retryErr: any) {
          showError(
            "bank",
            retryErr?.message ||
              "Your phone proof has timed out. Please start afresh so GSN can link the phone to your name again."
          );
        }
      } else {
        showError("bank", err?.message || "Bank details could not be recorded.");
      }
    } finally {
      finishAction();
    }
  }

  async function recordIdentityPhotoQueue(activeVerificationId: number) {
    const selectedItems = [...identityPhotoItems];
    const uploaded: EntryVerificationResult[] = [];

    for (const item of selectedItems) {
      const out = await recordEntryIdentityPhoto({
        verification_id: activeVerificationId,
        file: item.file,
        document_type: item.kind || identityPhotoKind,
        note: identityPhotoNote,
      });
      uploaded.push(out);
    }

    return uploaded;
  }

  function finishIdentityPhotoRecording(uploaded: EntryVerificationResult[]) {
    const finalResult = uploaded[uploaded.length - 1] || null;
    if (finalResult) {
      setIdentityPhotoResult(finalResult);
      setIdentityPhotoRecordedCount(uploaded.length);
    }
    return finalResult;
  }

  async function handleRecordIdentityPhoto() {
    if (!identityPhotoCount || !Number(verificationId) || busy || identityPhotoResult) return;

    beginAction("photo");

    try {
      const uploaded = await recordIdentityPhotoQueue(verificationId);
      const out = finishIdentityPhotoRecording(uploaded);
      setOptionalEvidenceStep("photo_done");
      showSuccess(
        "photo",
        uploaded.length > 1
          ? `${uploaded.length} photo/selfie evidence records attached for identity continuity review.`
          : safeStr(out?.explanation) ||
              "Photo/selfie evidence recorded. It can support identity continuity after review."
      );
      setOpenPanel("verification");
    } catch (err: any) {
      if (isPhoneSessionExpiredError(err) && canContinueDetails) {
        try {
          const refreshedVerificationId = await refreshPilotPhoneSession();
          const uploaded = await recordIdentityPhotoQueue(refreshedVerificationId);
          finishIdentityPhotoRecording(uploaded);
          setOptionalEvidenceStep("photo_done");
          showSuccess(
            "photo",
            `Your phone proof had timed out, so GSN refreshed it and recorded ${uploaded.length} photo/selfie evidence record${uploaded.length === 1 ? "" : "s"}.`
          );
        } catch (retryErr: any) {
          showError(
            "photo",
            retryErr?.message ||
              "Photo/selfie evidence could not be recorded. Start the phone step again and retry."
          );
        }
      } else {
        showError("photo", err?.message || "Photo/selfie evidence could not be recorded.");
      }
    } finally {
      finishAction();
    }
  }

  function buildCreateEntryPayload(activeVerificationId: number): Record<string, any> {
    const payload: Record<string, any> = {
      verification_id: activeVerificationId,
      clan_name: safeStr(communityName),
      clan_description: safeStr(description) || undefined,
      password: safeStr(password),
      confirm_password: safeStr(confirmPassword),
    };

    payload.email = safeStr(email);
    payload.country = safeStr(country) || undefined;

    if (createCode) {
      payload.create_code = createCode;
    }

    return payload;
  }

  async function submitCreateEntry(activeVerificationId: number): Promise<CreateCommunityOutcome> {
    const out = await createEntry(buildCreateEntryPayload(activeVerificationId));
    const me = await getMe().catch(() => null);

    const nextStep = safeStr(out?.next_step).toLowerCase();
    const issuedGmfnId = resolveIssuedGmfnId(out, me);
    const requestId = resolveActivationRequestId(out);
    const authenticatedNow = isAuthenticated();

    if (nextStep === "build-first-circle" && authenticatedNow) {
      return {
        kind: "workspace",
        message:
          safeStr(out?.message) ||
          `Community ${safeStr(out?.clan_name || communityName)} has been registered. You can open the first-circle workspace now.`,
        actionLabel: "Open workspace",
        path: "/app/build-first-circle",
        out,
        gmfnId: issuedGmfnId || undefined,
      };
    }

    if (nextStep === "activate-membership" || issuedGmfnId || requestId) {
      if (!issuedGmfnId && !requestId) {
        throw new Error(
          "GSN created the community but did not return the activation reference. Please retry this step or ask the community helper to review the intake record."
        );
      }

      const next = new URLSearchParams();
      if (issuedGmfnId) next.set("gmfn_id", issuedGmfnId);
      if (requestId) next.set("request_id", requestId);
      const path = next.toString()
        ? `/activate-membership?${next.toString()}`
        : "/activate-membership";

      return {
        kind: "activation",
        message:
          safeStr(out?.message) ||
          `Community ${safeStr(out?.clan_name || communityName)} has been registered. Activate the membership record to continue.`,
        actionLabel: "Continue activation",
        path,
        out,
        gmfnId: issuedGmfnId || undefined,
        requestId: requestId || undefined,
      };
    }

    throw new Error(
      safeStr(
        out?.detail ||
          out?.message ||
          "GSN could not determine the next route after creating this community. Please retry this step so the app can continue the journey properly."
      )
    );
  }

  async function ensureCommunityNameCanBeCreated(): Promise<boolean> {
    try {
      const check = await checkEntryCommunityName(safeStr(communityName));

      if (check?.available === false) {
        setCommunityDetailsRecorded(false);
        setCreateOutcome(null);
        showError(
          "community",
          safeStr(check?.message) ||
            `A GSN community named ${safeStr(communityName)} already exists. Choose a different name to create a new community, or use Request to join if this is the community you meant.`
        );
        return false;
      }

      return true;
    } catch (err: any) {
      if (isCommunityNameTakenError(err)) {
        setCommunityDetailsRecorded(false);
        setCreateOutcome(null);
        showError("community", communityNameTakenMessage(err));
        return false;
      }

      return true;
    }
  }

  async function handleRecordCommunityDetails() {
    if (!canRecordCommunityDetails || busy || createOutcome) return;

    beginAction("community");
    try {
      const canCreateName = await ensureCommunityNameCanBeCreated();
      if (!canCreateName) return;

      setCommunityDetailsRecorded(true);
      showSuccess(
        "community",
        "Community details recorded here. Add founder trust evidence now, or finish registration and continue."
      );
    } finally {
      finishAction();
    }
  }

  async function handleFinishRegistration(feedbackTargetForFinish: FeedbackTarget = "community") {
    if (!canFinishCommunityRegistration || busy || !verificationId || createOutcome) {
      if (createOutcome) {
        showSuccess(
          feedbackTargetForFinish,
          "Congratulations. This community is already registered. Opening the next step now."
        );
        await wait(650);
        await handleContinueAfterCreateOutcome();
        return;
      }

      if (busy) {
        showSuccess(
          feedbackTargetForFinish,
          "GSN is already finishing this registration. Please wait for the result."
        );
        return;
      }

      showError(feedbackTargetForFinish, finishBlockedMessage());
      return;
    }

    clearFeedback(feedbackTargetForFinish);
    beginAction("community");

    try {
      const outcome = await submitCreateEntry(verificationId);
      setCreateOutcome(outcome);
      clearCreateEntryDraft(createCode);
      clearPublicEntryState();
      const successMessage =
        outcome.kind === "workspace"
          ? buildActionSuccessMessage({
              prefix: "Congratulations.",
              message: outcome.message,
              nextStep: "Opening First Circle now.",
            })
          : buildActionSuccessMessage({
              prefix: "Congratulations.",
              message: outcome.message,
            });
      showSuccess(feedbackTargetForFinish, successMessage);
      if (outcome.kind === "workspace") {
        await wait(850);
        await openCreatedWorkspace(outcome.out);
        return;
      }

      await wait(850);
      nav(outcome.path, {
        replace: true,
        state: {
          gmfn_id: outcome.gmfnId || undefined,
          request_id: outcome.requestId || undefined,
        },
      });
    } catch (err: any) {
      if (openActivationFromStructuredError(err)) return;

      if (isPhoneSessionExpiredError(err) && canContinueDetails) {
        try {
          const refreshedVerificationId = await refreshPilotPhoneSession();
          const outcome = await submitCreateEntry(refreshedVerificationId);
          setCreateOutcome(outcome);
          clearCreateEntryDraft(createCode);
          clearPublicEntryState();
          const successMessage =
            outcome.kind === "workspace"
              ? buildActionSuccessMessage({
                  prefix: "Congratulations.",
                  message: outcome.message,
                  nextStep: "Opening First Circle now.",
                })
                : buildActionSuccessMessage({
                  prefix: "Congratulations.",
                  message: outcome.message,
                });
          showSuccess(feedbackTargetForFinish, successMessage);
          if (outcome.kind === "workspace") {
            await wait(850);
            await openCreatedWorkspace(outcome.out);
            return;
          }

          await wait(850);
          nav(outcome.path, {
            replace: true,
            state: {
              gmfn_id: outcome.gmfnId || undefined,
              request_id: outcome.requestId || undefined,
            },
          });
        } catch (retryErr: any) {
          if (openActivationFromStructuredError(retryErr)) return;

          if (isCommunityNameTakenError(retryErr)) {
            setCommunityDetailsRecorded(false);
            setCreateOutcome(null);
            setOpenPanel("community");
            showError(feedbackTargetForFinish, communityNameTakenMessage(retryErr));
            return;
          }

          if (isCompletedAccountError(retryErr)) {
            const recovered = await recoverCompletedCreateEntry();
            if (recovered) return;
          }

          showError(
            feedbackTargetForFinish,
            retryErr?.message ||
              "Your phone proof has timed out. Please start afresh so GSN can link the phone to your name again."
          );
        }
      } else if (isCommunityNameTakenError(err)) {
        setCommunityDetailsRecorded(false);
        setCreateOutcome(null);
        setOpenPanel("community");
        showError(feedbackTargetForFinish, communityNameTakenMessage(err));
      } else if (isCompletedAccountError(err)) {
        if (openActivationFromStructuredError(err)) return;

        const recovered = await recoverCompletedCreateEntry();
        if (recovered) return;

        setExistingMemberOpen(true);
        showError(
          feedbackTargetForFinish,
          "This phone or email already has a completed GSN account. Use Already a member to sign in with the email and password you entered. If that does not work, ask the person helping you to review the intake record."
        );
      } else {
        showError(
          feedbackTargetForFinish,
          err?.message ||
            "Founder entry could not be completed. Check the message above, then try Finish registration now again."
        );
      }
    } finally {
      finishAction();
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleRecordCommunityDetails();
  }

  function handleAddFounderEvidenceFromCommunity() {
    if (!Number(verificationId)) return;
    setStep("bank");
    setOptionalEvidenceStep("photo");
    setOpenPanel("verification");
    focusPanel("verification");
  }

  function handleContinueToBankEvidence() {
    setOptionalEvidenceStep("bank");
    clearFeedback("bank");
    setOpenPanel("verification");
  }

  function handleContinueToOfficialIdEvidence() {
    setOptionalEvidenceStep("official_id");
    clearFeedback("verification");
    setOpenPanel("verification");
  }

  async function handleContinueAfterCreateOutcome() {
    if (!createOutcome) return;

    if (createOutcome.kind === "workspace") {
      await openCreatedWorkspace(createOutcome.out);
      return;
    }

    nav(createOutcome.path, {
      replace: true,
      state: {
        gmfn_id: createOutcome.gmfnId || undefined,
        request_id: createOutcome.requestId || undefined,
      },
    });
  }

  const guideStepItems: Array<{
    key: GuideStepKey;
    number: string;
    title: string;
    detail: string;
  }> = [
    {
      key: "details",
      number: "1",
      title: "Your details",
      detail:
        "Add your name, country, phone, email, and password.",
    },
    {
      key: "verification",
      number: "2",
      title: "Founder trust level",
      detail:
        "Add photo, bank, wallet, or ID proof when ready.",
    },
    {
      key: "community",
      number: "3",
      title: "Community setup",
      detail:
        "Name the community and add a short story.",
    },
  ];

  return (
    <div style={pageShell()}>
      <div style={{ maxWidth: 430, margin: "0 auto", display: "grid", gap: 7 }}>
        <div
          style={{
            display: "none",
            gridTemplateColumns: "56px 1fr 56px",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <EntryBackLink to="/welcome" />
          </div>

          <div style={{ textAlign: "center", display: "grid", gap: 6 }}>
            <div
              style={{
                fontSize: 12,
                color: "#F3D06A",
                fontWeight: 900,
                letterSpacing: 3.4,
                textTransform: "uppercase",
              }}
            >
              GSN
            </div>
            <div
              style={{
                color: "#F8FBFF",
                fontSize: 15,
                lineHeight: 1.6,
                opacity: 0.92,
              }}
            >
              Start a new community
            </div>
          </div>

          <div aria-hidden="true" />
        </div>

        {existingMemberPanel}

        <div
          style={{
            ...pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"),
            position: "relative",
            overflow: "hidden",
            borderRadius: 20,
            border: "1px solid rgba(126,164,204,0.20)",
            boxShadow:
              "0 20px 44px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)",
            padding: "12px",
          }}
        >
          <CreateCommunityWatermark />
          <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <MiniLineIcon kind="shield" />
            <div style={{ ...sectionLabel(), color: "#9EB1C6", fontSize: "clamp(9.5px, 2.7vw, 12px)", letterSpacing: 1.1 }}>
              Create community
            </div>
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: "clamp(25px, 8vw, 34px)",
              fontWeight: 1000,
              color: "#F8FBFF",
              lineHeight: 1.02,
              letterSpacing: 0,
              maxWidth: 560,
            }}
          >
            Start a new community
          </div>
          <div
            style={{
              marginTop: 6,
              color: "#C9D9E8",
              fontSize: "clamp(11px, 3vw, 13.5px)",
              fontWeight: 720,
              lineHeight: 1.38,
              maxWidth: 620,
            }}
          >
            Details. Phone. Community. Then invite.
          </div>

          <WizardProgress
            guideDone={guideDone}
            activePanel={openPanel}
            detailsDone={stepProgress.detailsDone}
            trustDone={stepProgress.verificationDone}
            communityDone={Boolean(communityDetailsRecorded || createOutcome)}
          />

          <div
            aria-label="Create community steps"
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 6,
            }}
          >
            {[
              ["👤", "Details"],
              ["📞", "Phone"],
              ["🏘️", "Community"],
              ["🤝", "Invite"],
            ].map(([mark, label]) => (
              <div
                key={label}
                style={{
                  minHeight: 42,
                  borderRadius: 14,
                  border: "1px solid rgba(126,164,204,0.20)",
                  background: "rgba(255,255,255,0.07)",
                  color: "#E6EEF8",
                  display: "grid",
                  placeItems: "center",
                  gap: 2,
                  padding: "7px 5px",
                  fontSize: 10.5,
                  fontWeight: 900,
                  lineHeight: 1.1,
                  textAlign: "center",
                }}
              >
                <span style={{ color: "#F2C766", fontSize: 12 }}>{mark}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 8,
              display: "none",
              gap: 7,
              justifyItems: "start",
            }}
          >
            <div style={guideHeroCallout(guideDone)}>
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  right: -12,
                  top: -18,
                  width: 62,
                  height: 62,
                  borderRadius: 999,
                  border: guideDone
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "1px solid rgba(7,23,44,0.08)",
                  opacity: guideDone ? 0.20 : 0.14,
                }}
              />
              {!guideDone ? <GuideDocumentGlyph /> : null}
              <div style={guideHeroMark(guideDone)}>GSN</div>
              <div style={{ display: "grid", gap: guideDone ? 4 : 6, minWidth: 0, position: "relative", zIndex: 1 }}>
                <div style={{ display: "grid", gap: guideDone ? 1 : 2 }}>
                  <div
                    style={{
                      color: guideDone ? "#F3D06A" : "#10253B",
                      fontSize: guideDone ? "clamp(8px, 2.2vw, 9.5px)" : "clamp(9px, 2.4vw, 10.5px)",
                      fontWeight: 1000,
                      letterSpacing: guideDone ? 1.6 : 2,
                      textTransform: "uppercase",
                    }}
                  >
                    {guideDone ? "Guide ready" : "Start here first"}
                  </div>
                  <div
                    style={{
                      color: guideDone ? "#F8FBFF" : "#07172C",
                      fontSize: guideDone ? "clamp(12px, 3.25vw, 13.5px)" : "clamp(13px, 3.6vw, 15px)",
                      fontWeight: 1000,
                      lineHeight: guideDone ? 1.14 : 1.22,
                    }}
                  >
                    {guideDone
                      ? "Guide is ready."
                      : "Read guide first."}
                  </div>
                  {!guideDone ? (
                    <div
                      style={{
                        color: "#334155",
                        fontSize: "clamp(10px, 2.75vw, 11.5px)",
                        fontWeight: 800,
                        lineHeight: 1.38,
                      }}
                    >
                      Then Block 1 opens.
                    </div>
                  ) : null}
                </div>
                <PrimaryButton
                  onClick={() => setProcedureOpen(true)}
                  fullWidth
                  stableHeight={guideDone ? 32 : 38}
                  debugId="create-entry.guide.primary"
                  style={guideHeroButton(guideDone)}
                >
                  {guideDone ? "Open guide" : "Read, then start"}
                </PrimaryButton>
              </div>
            </div>
            {procedureOpen ? (
              <div
                style={{
                  width: "min(100%, 760px)",
                  borderRadius: 22,
                  border: "1px solid rgba(255,255,255,0.42)",
                background:
                    "linear-gradient(180deg, rgba(244,248,252,0.99) 0%, rgba(228,235,243,0.98) 34%, rgba(210,221,233,0.95) 68%, rgba(191,205,220,0.92) 100%)",
                  boxShadow:
                    "0 24px 60px rgba(5,16,38,0.28), inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -18px 30px rgba(122,147,180,0.08)",
                  padding: 24,
                  color: "#17324D",
                  lineHeight: 1.8,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                  background:
                      "radial-gradient(circle at top, rgba(201,154,39,0.10) 0%, rgba(201,154,39,0) 24%), radial-gradient(circle at bottom right, rgba(84,123,169,0.10) 0%, rgba(84,123,169,0) 30%)",
                  }}
                />
                <div
                  style={{
                    display: "grid",
                    gap: 6,
                    justifyItems: "center",
                    textAlign: "center",
                    marginBottom: 14,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      ...sectionLabel(),
                      color: "#B18A3C",
                      letterSpacing: 3.4,
                      textShadow: "0 1px 0 rgba(255,255,255,0.76)",
                    }}
                  >
                    My GSN and I guide
                  </div>
                  <div
                    style={{
                      color: "#0B1F33",
                      fontSize: 30,
                      fontWeight: 1000,
                      lineHeight: 1.06,
                      letterSpacing: 0.2,
                      textShadow:
                        "0 1px 0 rgba(255,255,255,0.92), 0 10px 24px rgba(10,24,49,0.12)",
                    }}
                  >
                    Read this first
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: 10,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <SecondaryButton
                    onClick={() => setProcedureOpen(false)}
                    minWidth="auto"
                    stableHeight={44}
                    debugId="create-entry.guide.collapse"
                    style={{
                      ...secondaryBtn(),
                      border: "1px solid rgba(16,37,59,0.12)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(229,237,249,0.96) 100%)",
                      color: "#123055",
                      boxShadow: "0 10px 24px rgba(10,24,49,0.14)",
                    }}
                  >
                    Collapse
                  </SecondaryButton>
                </div>
                <div style={{ display: "grid", gap: 18 }}>
                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    {guideStepItems.map((item) => {
                      const isOpen = guideStepOpen === item.key;
                      return (
                        <div key={item.key} style={guideDropDownShell(isOpen)}>
                          <SecondaryButton
                            aria-expanded={isOpen}
                            onClick={() =>
                              setGuideStepOpen((current) =>
                                current === item.key ? null : item.key
                              )
                            }
                            minWidth="100%"
                            stableHeight={58}
                            debugId={`create-entry.guide.${item.key}.toggle`}
                            style={guideDropDownHeader(isOpen)}
                          >
                            <span style={guideStepNumber()}>{item.number}</span>
                            <span style={{ display: "grid", gap: 2 }}>
                              <span>{item.title}</span>
                              <span
                                style={{
                                  color: "#60758A",
                                  fontSize: 12,
                                  fontWeight: 850,
                                }}
                              >
                                {isOpen ? "Tap to close" : "Tap to read"}
                              </span>
                            </span>
                            <span
                              aria-hidden="true"
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 999,
                                display: "grid",
                                placeItems: "center",
                                background: isOpen
                                  ? "rgba(45,106,163,0.14)"
                                  : "rgba(16,37,59,0.08)",
                                color: "#173E63",
                                fontSize: 20,
                                fontWeight: 1000,
                                lineHeight: 1,
                              }}
                          >
                              {isOpen ? "-" : "+"}
                            </span>
                          </SecondaryButton>
                          {isOpen ? (
                            <div
                              style={{
                                padding: "13px 14px 15px 54px",
                                color: "#17324D",
                                fontSize: 14,
                                fontWeight: 780,
                                lineHeight: 1.75,
                              }}
                            >
                              {item.detail}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  <PrimaryButton
                    onClick={handleGuideDone}
                    fullWidth
                    stableHeight={54}
                    debugId="create-entry.guide.done"
                    style={{
                      ...primaryBtn(false),
                      width: "100%",
                      minHeight: 54,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    Done
                  </PrimaryButton>
                </div>
              </div>
            ) : null}

          </div>
          </div>

        </div>

        {resumeNotice ? (
          <div
            style={{
              ...softCard("#FFFBEF"),
              display: "grid",
              gap: 12,
              border: "1px solid rgba(214,170,69,0.32)",
            }}
          >
            <div
              style={{
                color: "#0B1F33",
                fontSize: 16,
                fontWeight: 950,
                lineHeight: 1.35,
              }}
            >
              Continue unfinished entry
            </div>
            <div style={{ color: "#52677C", fontSize: 14, fontWeight: 800, lineHeight: 1.55 }}>
              {resumeNotice}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 10,
              }}
            >
              <PrimaryButton
                onClick={() => setResumeNotice("")}
                stableHeight={54}
                debugId="create-entry.resume.continue"
                style={primaryBtn(false)}
              >
                Continue entry
              </PrimaryButton>
              <SecondaryButton
                onClick={handleStartFreshEntry}
                stableHeight={54}
                debugId="create-entry.resume.start-fresh"
                style={secondaryBtn()}
              >
                Start again
              </SecondaryButton>
            </div>
          </div>
        ) : null}

        {feedbackTarget === "global" && error ? (
          <div style={feedbackCard(false)}>{error}</div>
        ) : null}
        {feedbackTarget === "global" && success ? (
          <div style={feedbackCard(true)}>{success}</div>
        ) : null}

        <div
          style={{
            borderRadius: 18,
            background:
              "linear-gradient(180deg, rgba(8,31,53,0.96) 0%, rgba(6,24,39,0.98) 100%)",
            border: "1px solid rgba(126,164,204,0.20)",
            padding: 9,
            opacity: guideDone ? 1 : 0.78,
            boxShadow: guideDone
              ? "0 12px 28px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.08)"
              : "0 8px 20px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ display: "grid", gap: 8 }}>
            <div
              ref={detailsRef}
              style={{
                ...stageShell(
                  guideDone && openPanel === "details",
                  stepProgress.detailsDone
                ),
                ...(guideDone && openPanel === "details"
                  ? {
                      padding: 18,
                      borderRadius: 26,
                      border: "1px solid rgba(242,199,102,0.38)",
                      background:
                        "linear-gradient(180deg, rgba(8,31,53,0.97) 0%, rgba(5,22,39,0.99) 100%)",
                      boxShadow:
                        "0 24px 48px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.10)",
                    }
                  : null),
              }}
            >
              <SecondaryButton
                onClick={handleToggleDetailsGroup}
                fullWidth
                stableHeight={guideDone && openPanel === "details" ? 82 : 58}
                debugId="create-entry.details.toggle"
                style={{
                  ...stageDropDownHeader(guideDone && openPanel === "details", stepProgress.detailsDone),
                  ...(guideDone && openPanel === "details"
                    ? {
                        minHeight: 82,
                        borderRadius: 20,
                        border: "1px solid rgba(242,199,102,0.42)",
                        background:
                          "linear-gradient(180deg, rgba(13,45,73,0.72) 0%, rgba(7,28,48,0.48) 100%)",
                        padding: "10px 12px",
                        gap: 10,
                        boxShadow:
                          "0 18px 34px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.10)",
                      }
                    : null),
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  <span
                    style={{
                      ...stageBadge(
                        guideDone && stepProgress.details,
                        stepProgress.detailsDone
                      ),
                      ...(guideDone && openPanel === "details"
                        ? {
                            width: 52,
                            height: 52,
                            border: "1px solid rgba(242,199,102,0.68)",
                            background:
                              "linear-gradient(180deg, rgba(18,54,82,0.95) 0%, rgba(6,24,39,0.98) 100%)",
                            color: "#FFFFFF",
                            fontSize: 26,
                            boxShadow:
                              "0 0 0 3px rgba(242,199,102,0.10), 0 18px 30px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.18)",
                          }
                        : null),
                    }}
                  >
                    1
                  </span>
                    <span style={{ display: "grid", gap: 3 }}>
                    <span style={{ ...sectionLabel(), color: "#8FA7BD", letterSpacing: 1.5, fontSize: 9.5 }}>
                      Step 1
                    </span>
                    <span
                      style={{
                        color: "#F8FBFF",
                        fontSize: "clamp(17px, 4.9vw, 21px)",
                        fontWeight: 1000,
                        lineHeight: 1.15,
                      }}
                    >
                      Your details
                    </span>
                  </span>
                </span>
                <span style={stageOpenIcon(guideDone && openPanel === "details")}>
                  {!guideDone ? "!" : openPanel === "details" ? "-" : "+"}
                </span>
              </SecondaryButton>

              {guideDone && openPanel !== null ? (
                <div
                  style={{
                    marginTop: 6,
                    color: "#B9D0E6",
                    lineHeight: 1.4,
                    fontSize: "clamp(10.5px, 2.9vw, 12.5px)",
                    fontWeight: 760,
                  }}
                >
                  Name, country, phone, email.
                </div>
              ) : !guideDone ? (
                <div
                  style={{
                    marginTop: 6,
                    color: "#B9D0E6",
                    lineHeight: 1.4,
                    fontSize: "clamp(10.5px, 2.9vw, 12.5px)",
                    fontWeight: 760,
                  }}
                >
                  Read the guide first.
                  <div
                    style={{
                      marginTop: 6,
                      borderRadius: 10,
                      border: "1px solid rgba(126,164,204,0.16)",
                      background: "rgba(126,164,204,0.08)",
                      color: "#96AFC7",
                      minHeight: 27,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      fontSize: 10,
                      fontWeight: 900,
                    }}
                  >
                    <MiniLineIcon kind="lock" />
                    Locked
                  </div>
                </div>
              ) : null}

              {guideDone && openPanel !== null ? (
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    marginTop: 12,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      right: -42,
                      top: 210,
                      width: 150,
                      height: 150,
                      opacity: 0.10,
                      border: "8px solid rgba(255,255,255,0.70)",
                      borderRadius: "38% 38% 48% 48%",
                      transform: "rotate(45deg)",
                      pointerEvents: "none",
                    }}
                  />

                  <div style={{ display: "grid", gap: 5 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr)", gap: 9, alignItems: "center" }}>
                      <EntryDetailIcon kind="person" />
                      <div>
                        <div style={detailFieldLabelStyle()}>Display name or nickname</div>
                        <div style={detailFieldHelpStyle()}>
                          Known name.
                        </div>
                      </div>
                    </div>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Chuma International"
                      autoComplete="name"
                      style={credentialInputStyle()}
                    />
                  </div>

                  <div style={{ display: "grid", gap: 5 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr)", gap: 9, alignItems: "center" }}>
                      <EntryDetailIcon kind="phone" />
                      <div>
                        <div style={detailFieldLabelStyle()}>Phone number</div>
                        <div style={detailFieldHelpStyle()}>
                          Use country code.
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: 6,
                      }}
                    >
                      <SecondaryButton
                        type="button"
                        onClick={() => applyPhonePrefix("+44")}
                        stableHeight={34}
                        debugId="create-entry.details.phone-prefix-uk"
                        style={countryChipStyle(safeStr(phone).startsWith("+44"))}
                      >
                        {countryFlagMark("uk")} UK +44
                      </SecondaryButton>
                      <SecondaryButton
                        type="button"
                        onClick={() => applyPhonePrefix("+234")}
                        stableHeight={34}
                        debugId="create-entry.details.phone-prefix-ng"
                        style={countryChipStyle(safeStr(phone).startsWith("+234"))}
                      >
                        {countryFlagMark("ng")} Nigeria +234
                      </SecondaryButton>
                      <SecondaryButton
                        type="button"
                        onClick={() => applyPhonePrefix("+1")}
                        stableHeight={34}
                        debugId="create-entry.details.phone-prefix-us"
                        style={countryChipStyle(safeStr(phone).startsWith("+1"))}
                      >
                        {countryFlagMark("us")} USA +1
                      </SecondaryButton>
                    </div>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+44 7123 456789"
                      inputMode="tel"
                      autoComplete="tel"
                      style={credentialInputStyle()}
                    />
                  </div>

                  <div style={{ display: "grid", gap: 5 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr)", gap: 9, alignItems: "center" }}>
                      <EntryDetailIcon kind="globe" />
                      <div>
                        <div style={detailFieldLabelStyle()}>Country</div>
                        <div style={detailFieldHelpStyle()}>
                          Helps GSN ask for the right local evidence.
                        </div>
                      </div>
                    </div>
                    <select
                      value={country}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      autoComplete="country-name"
                      style={credentialInputStyle()}
                    >
                      {BANK_COUNTRY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "grid", gap: 5 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr)", gap: 9, alignItems: "center" }}>
                      <EntryDetailIcon kind="email" />
                      <div>
                        <div style={detailFieldLabelStyle()}>Email address</div>
                        <div style={detailFieldHelpStyle()}>
                          Sign-in email.
                        </div>
                      </div>
                    </div>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      type="email"
                      autoComplete="email"
                      style={credentialInputStyle()}
                    />
                  </div>

                  <div style={{ display: "grid", gap: 5 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr)", gap: 9, alignItems: "center" }}>
                      <EntryDetailIcon kind="password" />
                      <div>
                        <div style={detailFieldLabelStyle()}>Password</div>
                        <div style={detailFieldHelpStyle()}>Use at least 6 characters.</div>
                      </div>
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type={passwordVisible ? "text" : "password"}
                        placeholder="Create your password"
                        autoComplete="new-password"
                        style={{ ...credentialInputStyle(), paddingRight: 58 }}
                      />
                      <SecondaryButton
                        type="button"
                        onClick={() => setPasswordVisible((visible) => !visible)}
                        stableHeight={38}
                        minWidth={38}
                        debugId="create-entry.details.password-toggle"
                        aria-label={passwordVisible ? "Hide password" : "Show password"}
                        style={{
                          position: "absolute",
                          right: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 34,
                          minWidth: 34,
                          height: 34,
                          minHeight: 34,
                          padding: 0,
                          borderRadius: 999,
                          border: "none",
                          background: "transparent",
                          boxShadow: "none",
                          color: "#66758A",
                          fontSize: 0,
                          overflow: "hidden",
                        }}
                      >
                        <EyeGlyph closed={passwordVisible} />
                      </SecondaryButton>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 5 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr)", gap: 9, alignItems: "center" }}>
                      <EntryDetailIcon kind="shield" />
                      <div>
                        <div style={detailFieldLabelStyle()}>Confirm password</div>
                        <div style={detailFieldHelpStyle()}>
                          Repeat password.
                        </div>
                      </div>
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        type={confirmPasswordVisible ? "text" : "password"}
                        placeholder="Repeat your password"
                        autoComplete="new-password"
                        style={{ ...credentialInputStyle(), paddingRight: 58 }}
                      />
                      <SecondaryButton
                        type="button"
                        onClick={() => setConfirmPasswordVisible((visible) => !visible)}
                        stableHeight={38}
                        minWidth={38}
                        debugId="create-entry.details.confirm-password-toggle"
                        aria-label={confirmPasswordVisible ? "Hide repeated password" : "Show repeated password"}
                        style={{
                          position: "absolute",
                          right: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 34,
                          minWidth: 34,
                          height: 34,
                          minHeight: 34,
                          padding: 0,
                          borderRadius: 999,
                          border: "none",
                          background: "transparent",
                          boxShadow: "none",
                          color: "#66758A",
                          fontSize: 0,
                          overflow: "hidden",
                        }}
                      >
                        <EyeGlyph closed={confirmPasswordVisible} />
                      </SecondaryButton>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 0,
                      paddingTop: 12,
                      borderTop: "1px solid rgba(242,199,102,0.16)",
                      display: "grid",
                      gridTemplateColumns: "minmax(96px, 0.36fr) minmax(0, 1fr)",
                      gap: 9,
                      alignItems: "center",
                    }}
                  >
                    <SecondaryButton
                      onClick={clearDetailsBlock}
                      minWidth={116}
                      stableHeight={46}
                      debugId="create-entry.details.clear"
                      style={{
                        ...secondaryBtn(),
                        minWidth: 96,
                        minHeight: 46,
                        borderRadius: 999,
                        border: "1px solid rgba(242,199,102,0.50)",
                        background: "transparent",
                        color: "#F2C766",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                        textShadow: "none",
                      }}
                    >
                      Clear
                    </SecondaryButton>
                    <PrimaryButton
                      onClick={handleStartVerification}
                      busy={busy}
                      busyLabel="Sending..."
                      disabled={!canContinueDetails}
                      minWidth={180}
                      stableHeight={48}
                      debugId="create-entry.details.submit"
                      style={{
                        ...primaryBtn(!canContinueDetails || busy),
                        width: "100%",
                        minWidth: 0,
                        minHeight: 48,
                        borderRadius: 999,
                        border: !canContinueDetails || busy
                          ? "1px solid rgba(161,179,199,0.42)"
                          : "1px solid rgba(255,245,204,0.74)",
                        background: !canContinueDetails || busy
                          ? "linear-gradient(180deg, rgba(215,222,232,0.90) 0%, rgba(190,200,213,0.86) 100%)"
                          : "linear-gradient(180deg, #FFE795 0%, #F2C766 52%, #D6AA45 100%)",
                        color: !canContinueDetails || busy ? "#5F7287" : "#10253B",
                        boxShadow: !canContinueDetails || busy
                          ? "0 10px 20px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.42)"
                          : "0 18px 34px rgba(214,170,69,0.28), inset 0 1px 0 rgba(255,255,255,0.58)",
                      }}
                    >
                      Continue
                      <span aria-hidden="true" style={{ marginLeft: 10 }}>{">"}</span>
                    </PrimaryButton>
                  </div>

                  {renderLocalFeedback("details")}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      color: passwordReady ? "#E4EEF8" : "#B9CBE0",
                      fontSize: "clamp(10.5px, 2.8vw, 12px)",
                      lineHeight: 1.35,
                      fontWeight: 760,
                      textAlign: "center",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        display: "inline-flex",
                        color: "#F2C766",
                      }}
                    >
                      <svg width="19" height="19" viewBox="0 0 24 24">
                        <path
                          d="M12 3 5 6v5c0 4.5 3 7.5 7 10 4-2.5 7-5.5 7-10V6l-7-3Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="m9 12 2 2 4-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    Your sign-in details stay protected inside GSN.
                  </div>
                </div>
              ) : null}

              {guideDone && openPanel !== null ? (
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    marginTop: 18,
                    paddingTop: 16,
                    borderTop: "1px solid rgba(16,37,59,0.12)",
                  }}
                >
                  <div
                    style={{
                      color: "#8FA7BD",
                      fontSize: 12,
                      fontWeight: 950,
                      letterSpacing: 1.8,
                      textTransform: "uppercase",
                    }}
                  >
                    Next
                  </div>

            <div
              ref={verificationRef}
              style={{
                ...stageShell(
                  openPanel === "verification",
                  stepProgress.verificationDone
                ),
                display: communityDecisionMode ? "none" : undefined,
                order: step === "verify" ? 2 : 3,
                ...(openPanel === "verification" && step !== "verify"
                  ? {
                      padding: 14,
                      borderRadius: 24,
                      border: "1px solid rgba(242,199,102,0.36)",
                      background:
                        "linear-gradient(180deg, rgba(8,31,53,0.97) 0%, rgba(5,22,39,0.99) 100%)",
                      boxShadow:
                        "0 22px 44px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.10)",
                    }
                  : null),
              }}
            >
              <SecondaryButton
                onClick={() =>
                  openPanel === "verification"
                    ? setOpenPanel(null)
                    : handleOpenPanel("verification")
                }
                disabled={!canOpenVerification}
                fullWidth
                stableHeight={openPanel === "verification" && step !== "verify" ? 82 : 74}
                debugId="create-entry.verification.toggle"
                style={{
                  ...stageDropDownHeader(openPanel === "verification", stepProgress.verificationDone),
                  ...(openPanel === "verification" && step !== "verify"
                    ? {
                        minHeight: 82,
                        borderRadius: 18,
                        border: "1px solid rgba(242,199,102,0.46)",
                        background:
                          "linear-gradient(180deg, rgba(13,45,73,0.72) 0%, rgba(7,28,48,0.48) 100%)",
                        padding: "10px 12px",
                      }
                    : null),
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span
                    style={stageBadge(
                      stepProgress.verification,
                      stepProgress.verificationDone
                    )}
                  >
                    {step === "verify" ? 2 : 3}
                  </span>
                  <span style={{ display: "grid", gap: 6 }}>
                    <span style={{ ...sectionLabel(), color: "#8FA7BD", letterSpacing: 2.2 }}>
                      {step === "verify" ? "Step 2" : "Step 3"}
                    </span>
                    <span
                      style={{
                        color: "#F8FBFF",
                        fontSize: 22,
                        fontWeight: 1000,
                        lineHeight: 1.15,
                      }}
                    >
                      {verificationBlockTitle}
                    </span>
                  </span>
                </span>
                <span style={stageOpenIcon(openPanel === "verification")}>
                  {!canOpenVerification ? "!" : openPanel === "verification" ? "-" : "+"}
                </span>
              </SecondaryButton>

              {openPanel === "verification" ? (
                <div
                  style={{
                    marginTop: 10,
                    color: "#B9D0E6",
                    lineHeight: 1.7,
                    fontSize: 14,
                    fontWeight: 760,
                  }}
                >
                  {verificationBlockHelp}
                </div>
              ) : null}

              {openPanel === "verification" && step !== "verify" ? (
                <div style={{ marginTop: 12 }}>
                  <FounderEvidenceMeter />
                </div>
              ) : null}

              {openPanel === "verification" && step !== "verify" ? (
                <div
                  style={{
                    marginTop: 10,
                    borderRadius: 14,
                    border: "1px solid rgba(242,199,102,0.26)",
                    background: "rgba(242,199,102,0.09)",
                    color: "#F8FBFF",
                    padding: "10px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                    fontSize: 12,
                    fontWeight: 950,
                  }}
                >
                  <span>
                    Current:{" "}
                    {optionalEvidenceStep.startsWith("bank")
                      ? "Bank or wallet"
                      : optionalEvidenceStep.startsWith("official")
                        ? "Official ID"
                        : "Photo/selfie"}
                  </span>
                  <span style={{ color: "#F2C766" }}>
                    Integrity: {founderEvidence.label}
                  </span>
                </div>
              ) : null}

              {openPanel === "verification" && phoneVerificationProof && !activeEvidenceMode ? (
                <div
                  style={{
                    ...softCard("#ECFDF5"),
                    marginTop: 14,
                    border: "1px solid #A7F3D0",
                  }}
                >
                  <div style={{ ...sectionLabel(), color: "#047857" }}>
                    {phoneVerificationProof.registered_only
                      ? "Phone registered"
                      : "Phone verified"}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#065F46",
                      fontWeight: 1000,
                      lineHeight: 1.45,
                    }}
                  >
                    {safeStr(phoneVerificationProof.confirmation_message) ||
                      (phoneVerificationProof.registered_only
                        ? `${safeStr(phoneVerificationProof.phone_e164) || "This phone"} is linked to ${safeStr(phoneVerificationProof.display_name) || "this person"}.`
                        : `${safeStr(phoneVerificationProof.phone_e164) || "This phone"} is now linked to ${safeStr(phoneVerificationProof.display_name) || "this person"}.`)}
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {safeStr(phoneVerificationProof.display_name) ? (
                      <span style={secondaryBtn()}>
                        Name: {safeStr(phoneVerificationProof.display_name)}
                      </span>
                    ) : null}
                    {safeStr(phoneVerificationProof.phone_e164) ? (
                      <span style={secondaryBtn()}>
                        Phone: {safeStr(phoneVerificationProof.phone_e164)}
                      </span>
                    ) : null}
                  </div>

                  {phoneVerificationProof.trust_event_response ? (
                    <div
                      style={{
                        marginTop: 12,
                        borderRadius: 14,
                        background: "rgba(255,255,255,0.72)",
                        border: "1px solid rgba(4,120,87,0.16)",
                        padding: 12,
                      }}
                    >
                      <div style={{ ...sectionLabel(), color: "#047857" }}>
                        Phone saved
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          color: "#065F46",
                          lineHeight: 1.65,
                          fontWeight: 800,
                        }}
                      >
                        {safeStr(
                          phoneVerificationProof.trust_event_response.message
                        ) ||
                          (phoneVerificationProof.registered_only
                            ? "This phone is saved for your entry. SMS proof can be added later."
                            : "This phone is saved to strengthen your profile.")}
                      </div>
                      {safeStr(
                        phoneVerificationProof.trust_event_response.event_type
                      ) ? (
                        <div
                          style={{
                            marginTop: 8,
                            color: "#047857",
                            fontSize: 12.5,
                            fontWeight: 1000,
                          }}
                        >
                          Saved for your profile
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {openPanel === "verification" && bankRecordProof && !activeEvidenceMode && shouldShowVerificationResult("bank") ? (
                <div
                  style={{
                    ...softCard("#ECFDF5"),
                    marginTop: 14,
                    border: "1px solid #A7F3D0",
                  }}
                >
                  <div style={{ ...sectionLabel(), color: "#047857" }}>
                    Bank and wallet proof recorded
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#065F46",
                      fontWeight: 1000,
                      lineHeight: 1.45,
                    }}
                  >
                    {safeStr(bankRecordProof.confirmation_message) ||
                      "Your bank or wallet destination has been recorded for this onboarding session."}
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {safeStr(bankRecordProof.verification_status) ? (
                      <span style={secondaryBtn()}>
                        Status:{" "}
                        {safeStr(bankRecordProof.verification_status).replace(/_/g, " ")}
                      </span>
                    ) : null}
                    {safeStr(bankRecordProof.verification_note) ? (
                      <span style={secondaryBtn()}>Recorded for trust review</span>
                    ) : null}
                  </div>

                  {bankRecordProof.trust_event_response ? (
                    <div
                      style={{
                        marginTop: 12,
                        borderRadius: 14,
                        background: "rgba(255,255,255,0.72)",
                        border: "1px solid rgba(4,120,87,0.16)",
                        padding: 12,
                      }}
                    >
                      <div style={{ ...sectionLabel(), color: "#047857" }}>
                        Bank or wallet saved
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          color: "#065F46",
                          lineHeight: 1.65,
                          fontWeight: 800,
                        }}
                      >
                        {safeStr(bankRecordProof.trust_event_response.message) ||
                          "This bank or wallet detail is saved to strengthen your profile after review."}
                      </div>
                      {safeStr(bankRecordProof.trust_event_response.event_type) ? (
                        <div
                          style={{
                            marginTop: 8,
                            color: "#047857",
                            fontSize: 12.5,
                            fontWeight: 1000,
                          }}
                        >
                          Saved for your profile
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {openPanel === "verification" && bankVerificationResult && !activeEvidenceMode && shouldShowVerificationResult("bank") ? (
                <div style={{ ...verificationCard(bankVerificationResult.status), marginTop: 14 }}>
                  <div style={sectionLabel()}>Bank verification status</div>
                  <div style={{ marginTop: 8, fontWeight: 1000, fontSize: 16 }}>
                    {safeStr(bankVerificationResult.status || "recorded")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char) => char.toUpperCase())}
                  </div>
                  <div style={{ marginTop: 8, lineHeight: 1.7 }}>
                    {bankVerificationHelpText(bankVerificationResult)}
                  </div>
                  {safeStr(bankVerificationResult.provider_key) ? (
                    <div style={{ marginTop: 8, fontSize: 12, fontWeight: 900, opacity: 0.84 }}>
                      Verification source: Review recorded
                    </div>
                  ) : null}
                </div>
              ) : null}

              {openPanel === "verification" && licenceVerificationResult && !activeEvidenceMode && shouldShowVerificationResult("verification") ? (
                <div
                  style={{
                    ...verificationCard(licenceVerificationResult.status),
                    marginTop: 12,
                  }}
                >
                  <div style={sectionLabel()}>Official ID evidence</div>
                  <div style={{ marginTop: 8, fontWeight: 1000, fontSize: 16 }}>
                    {safeStr(licenceVerificationResult.status || "recorded")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char) => char.toUpperCase())}
                  </div>
                  <div style={{ marginTop: 8, lineHeight: 1.7 }}>
                    {safeStr(licenceVerificationResult.explanation) ||
                      "The official ID evidence is now attached to this onboarding session for later review."}
                  </div>
                  {safeStr(licenceVerificationResult.provider_key) ? (
                    <div style={{ marginTop: 8, fontSize: 12, fontWeight: 900, opacity: 0.84 }}>
                      Verification source: Review recorded
                    </div>
                  ) : null}
                </div>
              ) : null}

              {openPanel === "verification" && identityPhotoResult && !activeEvidenceMode && shouldShowVerificationResult("photo") ? (
                <div
                  style={{
                    ...verificationCard(identityPhotoResult.status),
                    marginTop: 12,
                  }}
                >
                  <div style={sectionLabel()}>Photo/selfie evidence</div>
                  <div style={{ marginTop: 8, fontWeight: 1000, fontSize: 16 }}>
                    {identityPhotoRecordedCount > 1
                      ? `${identityPhotoRecordedCount} photo records attached`
                      : safeStr(identityPhotoResult.status || "recorded")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char) => char.toUpperCase())}
                  </div>
                  <div style={{ marginTop: 8, lineHeight: 1.7 }}>
                    {identityPhotoRecordedCount > 1
                      ? "The selected photos are attached for identity continuity review."
                      : safeStr(identityPhotoResult.explanation) ||
                      "Photo/selfie evidence is attached for identity continuity review."}
                  </div>
                  {safeStr(identityPhotoResult.evidence_url) ||
                  identityPhotoResult.evidence_recorded ? (
                    <div style={{ marginTop: 8, fontSize: 12, fontWeight: 900, opacity: 0.84 }}>
                      Trust Passport picture source recorded.
                    </div>
                  ) : null}
                </div>
              ) : null}

              {openPanel === "verification" ? (
                step === "verify" ? (
                  <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
                    <div style={softCard("#F8FBFF")}>
                      <div style={sectionLabel()}>Phone check</div>
                      <div
                        style={{
                          marginTop: 8,
                          color: "#475569",
                          lineHeight: 1.75,
                          fontSize: 14,
                        }}
                      >
                        Record this phone to protect the entry. SMS proof can be added later.
                      </div>
                    </div>

                    <div>
                      <div style={fieldLabelOnDark()}>Verification code</div>
                      <input
                        value={otpCode}
                        onChange={(e) => setOtpCode(otpDigits(e.target.value))}
                        placeholder="Enter the code sent to your phone"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoCapitalize="none"
                        spellCheck={false}
                        pattern="[0-9]*"
                        maxLength={8}
                        name="entry-phone-code"
                        aria-label="Phone verification code"
                        style={input()}
                      />
                    </div>

                    {otpPreview ? (
                      <div style={softCard("#FFFBEB")}>
                        <div style={sectionLabel()}>Verification code preview</div>
                        <div
                          style={{
                            marginTop: 10,
                            color: "#92400E",
                            fontWeight: 900,
                            fontSize: 18,
                            letterSpacing: 1.2,
                          }}
                        >
                          {otpPreview}
                        </div>
                        <div
                          style={{
                            marginTop: 8,
                            color: "#92400E",
                            fontSize: 13,
                            lineHeight: 1.6,
                            fontWeight: 800,
                          }}
                        >
                          Use this code only if the app has not delivered an SMS code yet.
                        </div>
                      </div>
                    ) : otpDeliveryMode === "pending-sms" ? (
                      <div style={softCard("#EFF6FF")}>
                        <div style={sectionLabel()}>SMS code</div>
                        <div
                          style={{
                            marginTop: 8,
                            color: "#1D4ED8",
                            fontSize: 13,
                            lineHeight: 1.6,
                            fontWeight: 800,
                          }}
                        >
                          SMS delivery is only needed when the live SMS rail is enabled. For this pilot, refresh this step to record the phone and continue.
                        </div>
                      </div>
                    ) : null}

                    <div style={entryActionRowStyle(56)}>
                      <SecondaryButton
                        onClick={clearVerificationBlock}
                        minWidth={0}
                        stableHeight={56}
                        debugId="create-entry.verification.clear-code"
                        style={{ ...secondaryBtn(), ...entryActionStyle(56) }}
                      >
                        Clear
                      </SecondaryButton>
                      <PrimaryButton
                        onClick={handleConfirmVerification}
                        busy={busy}
                        busyLabel="Verifying..."
                        disabled={!canConfirmOtp}
                        minWidth={0}
                        stableHeight={56}
                        debugId="create-entry.verification.confirm-code"
                        style={{
                          ...primaryBtn(!canConfirmOtp || busy),
                          ...entryActionStyle(56),
                        }}
                      >
                        Confirm phone code
                      </PrimaryButton>
                    </div>

                    {renderLocalFeedback("phone")}
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                    <div
                      style={{
                        borderRadius: 18,
                        border: "1px solid rgba(242,199,102,0.28)",
                        background:
                          "linear-gradient(180deg, rgba(242,199,102,0.12) 0%, rgba(13,45,73,0.62) 100%)",
                        padding: 12,
                        display: shouldShowVerificationBlock("photo") && showPhotoEvidenceBlock ? "grid" : "none",
                        gap: 10,
                      }}
                    >
                      <div style={bankFieldLabelStyle()}>
                        <EntryDetailIcon kind="person" size={14} />
                        <span>
                          Integrity photo <span style={{ color: "#B9CBE0", fontWeight: 800 }}>(optional)</span>
                        </span>
                      </div>
                      <div style={{ color: "#B9CBE0", fontSize: 12, fontWeight: 760, marginTop: -5 }}>
                        Clear front face now. Side/profile photos can come later.
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(0, 0.42fr) minmax(0, 1fr)",
                          gap: 10,
                        }}
                      >
                        <SecondaryButton
                          type="button"
                          onClick={() => {
                            setIdentityPhotoKind("selfie");
                            clearFeedback("photo");
                            if (selfiePhotoInputRef.current) {
                              selfiePhotoInputRef.current.value = "";
                              selfiePhotoInputRef.current.click();
                            }
                          }}
                          debugId="create-entry.identity-photo.selfie"
                          minWidth={0}
                          stableHeight={54}
                          style={{
                            ...bankInputStyle(),
                            display: "grid",
                            placeItems: "center",
                            width: "100%",
                            color: "#07172C",
                            textAlign: "center",
                            whiteSpace: "nowrap",
                          }}
                          aria-label="Open phone camera for selfie"
                        >
                          Selfie
                        </SecondaryButton>
                        <SecondaryButton
                          type="button"
                          onClick={() => {
                            setIdentityPhotoKind("identity_photo");
                            clearFeedback("photo");
                            if (galleryPhotoInputRef.current) {
                              galleryPhotoInputRef.current.value = "";
                              galleryPhotoInputRef.current.click();
                            }
                          }}
                          debugId="create-entry.identity-photo.gallery"
                          minWidth={0}
                          stableHeight={54}
                          style={{
                            ...bankInputStyle(),
                            display: "grid",
                            placeItems: "center",
                            width: "100%",
                            color: "#07172C",
                            textAlign: "center",
                          }}
                          aria-label="Choose photo from gallery or files"
                        >
                          Choose up to 5
                        </SecondaryButton>
                        <input
                          ref={selfiePhotoInputRef}
                          type="file"
                          accept="image/*"
                          capture="user"
                          onChange={(e) => {
                            handleIdentityPhotoSelected(
                              e.target.files,
                              "selfie",
                              "Selfie"
                            );
                          }}
                          style={{ display: "none" }}
                          aria-label="Take selfie evidence"
                        />
                        <input
                          ref={galleryPhotoInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          multiple
                          onChange={(e) => {
                            handleIdentityPhotoSelected(
                              e.target.files,
                              "identity_photo",
                              "Photo"
                            );
                          }}
                          style={{ display: "none" }}
                          aria-label="Choose photo evidence from gallery"
                        />
                      </div>

                      {identityPhotoCount ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={{ color: "#D6E6F6", fontSize: 11.5, fontWeight: 820 }}>
                            {identityPhotoCount} of {MAX_IDENTITY_PHOTO_SELECTIONS} photos ready to attach
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(76px, 1fr))",
                              gap: 8,
                            }}
                          >
                            {identityPhotoItems.map((item, index) => (
                              <div
                                key={item.id}
                                style={{
                                  position: "relative",
                                  minHeight: 92,
                                  borderRadius: 14,
                                  overflow: "hidden",
                                  border: "1px solid rgba(242,199,102,0.34)",
                                  background: "rgba(255,255,255,0.08)",
                                  boxShadow: "0 12px 22px rgba(0,0,0,0.18)",
                                }}
                              >
                                <img
                                  src={item.previewUrl}
                                  alt={`Selected identity evidence ${index + 1}`}
                                  style={{
                                    width: "100%",
                                    height: 92,
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                />
                                <SecondaryButton
                                  type="button"
                                  onClick={() => removeIdentityPhotoSelection(item.id)}
                                  debugId={`create-entry.identity-photo.${item.id}.remove`}
                                  minWidth={0}
                                  stableHeight={28}
                                  aria-label={`Remove selected photo ${index + 1}`}
                                  style={{
                                    position: "absolute",
                                    right: 6,
                                    top: 6,
                                    width: 28,
                                    height: 28,
                                    borderRadius: 999,
                                    border: "1px solid rgba(255,255,255,0.7)",
                                    background: "rgba(7,23,44,0.78)",
                                    color: "#FFFFFF",
                                    fontSize: 16,
                                    fontWeight: 1000,
                                    lineHeight: 1,
                                    display: "grid",
                                    placeItems: "center",
                                    touchAction: "manipulation",
                                    WebkitTapHighlightColor: "transparent",
                                    padding: 0,
                                  }}
                                >
                                  x
                                </SecondaryButton>
                                <div
                                  style={{
                                    position: "absolute",
                                    left: 6,
                                    bottom: 6,
                                    borderRadius: 999,
                                    background: "rgba(7,23,44,0.78)",
                                    color: "#F2C766",
                                    padding: "4px 7px",
                                    fontSize: 10,
                                    fontWeight: 1000,
                                  }}
                                >
                                  {index + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {renderLocalFeedback("photo")}

                      {!busyTarget && (identityPhotoCount || identityPhotoResult) ? (
                        <FounderEvidenceMeter compact />
                      ) : null}

                      <textarea
                        value={identityPhotoNote}
                        onChange={(e) => setIdentityPhotoNote(e.target.value)}
                        placeholder="Short note (optional)"
                        style={{ ...bankTextAreaStyle(), minHeight: 44 }}
                      />

                      <PrimaryButton
                        onClick={handleRecordIdentityPhoto}
                        busy={busy}
                        busyLabel="Recording..."
                        disabled={!identityPhotoCount || !Number(verificationId) || Boolean(identityPhotoResult)}
                        minWidth={0}
                        stableHeight={48}
                        debugId="create-entry.identity-photo.record"
                        style={{
                          ...primaryBtn(
                            !identityPhotoCount ||
                              !Number(verificationId) ||
                              busy ||
                              Boolean(identityPhotoResult)
                          ),
                          width: "100%",
                          minWidth: 0,
                          minHeight: 48,
                          borderRadius: 14,
                          gap: 8,
                        }}
                      >
                        <EntryDetailIcon kind="id" size={14} />
                        {identityPhotoResult
                          ? "Photo evidence recorded"
                          : `Record ${identityPhotoCount > 1 ? `${identityPhotoCount} photos` : "photo evidence"}`}
                      </PrimaryButton>
                    </div>

                    {optionalEvidenceStep === "photo_done" ? (
                      <div
                        style={{
                          ...softCard("#ECFDF5"),
                          border: "1px solid rgba(167,243,208,0.70)",
                          display: "grid",
                          gap: 10,
                        }}
                      >
                        <div style={{ ...sectionLabel(), color: "#047857" }}>
                          Photo recorded
                        </div>
                        <div style={{ color: "#065F46", fontWeight: 900, lineHeight: 1.5 }}>
                          Integrity level: {founderEvidence.label}. Continue with bank or wallet evidence, or finish now.
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          <PrimaryButton
                            type="button"
                            onClick={handleContinueToBankEvidence}
                            minWidth={0}
                            stableHeight={48}
                            debugId="create-entry.photo.continue-bank"
                            style={{ ...primaryBtn(false), width: "100%", minWidth: 0 }}
                          >
                            Add bank or wallet
                          </PrimaryButton>
                          <SecondaryButton
                            type="button"
                            onClick={() => handleFinishRegistration("photo")}
                            busy={busy && busyTarget === "community"}
                            busyLabel="Registering..."
                            minWidth={0}
                            stableHeight={46}
                            debugId="create-entry.photo.finish-registration"
                            style={{ ...secondaryBtn(), width: "100%", minWidth: 0 }}
                          >
                            Finish registration now
                          </SecondaryButton>
                        </div>
                      </div>
                    ) : null}

                    <div
                      style={{
                        borderRadius: 18,
                        border: "1px solid rgba(126,164,204,0.22)",
                        background:
                          "linear-gradient(180deg, rgba(13,45,73,0.66) 0%, rgba(8,31,53,0.72) 100%)",
                        padding: 12,
                        display: shouldShowVerificationBlock("bank") && showBankEvidenceBlock ? "grid" : "none",
                        gap: 10,
                      }}
                    >
                      <div>
                        <div style={bankFieldLabelStyle()}>
                          <EntryDetailIcon kind="person" size={14} />
                          Account name
                        </div>
                        <input
                          value={bankAccountName}
                          onChange={(e) => setBankAccountName(e.target.value)}
                          placeholder="Account name"
                          autoComplete="name"
                          style={bankInputStyle()}
                        />
                      </div>

                      <div>
                        <div style={bankFieldLabelStyle()}>
                          <EntryDetailIcon kind="bank" size={14} />
                          Bank or wallet
                        </div>
                        <input
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="Choose or type provider"
                          list="entry-bank-wallet-providers"
                          style={bankInputStyle()}
                        />
                        <datalist id="entry-bank-wallet-providers">
                          <option value="Monzo" />
                          <option value="Barclays" />
                          <option value="Lloyds" />
                          <option value="NatWest" />
                          <option value="Opay" />
                          <option value="PalmPay" />
                          <option value="GTBank" />
                          <option value="Access Bank" />
                        </datalist>
                      </div>

                      <div>
                        <div style={bankFieldLabelStyle()}>
                          <EntryDetailIcon kind="number" size={14} />
                          Account / wallet number
                        </div>
                        <input
                          value={bankAccountNumber}
                          onChange={(e) => setBankAccountNumber(e.target.value)}
                          placeholder="Enter number"
                          inputMode="numeric"
                          style={bankInputStyle()}
                        />
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 10,
                        }}
                      >
                        <div>
                          <div style={bankFieldLabelStyle()}>
                            <EntryDetailIcon kind="hash" size={14} />
                            <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
                              Sort code
                              <span style={{ color: "#F2C766", fontSize: 10, fontWeight: 900 }}>UK only</span>
                            </span>
                          </div>
                          <input
                            value={bankSortCode}
                            onChange={(e) => setBankSortCode(e.target.value)}
                            placeholder="Enter sort code"
                            inputMode="numeric"
                            style={bankInputStyle()}
                          />
                        </div>

                        <div>
                          <div style={bankFieldLabelStyle()}>
                            <EntryDetailIcon kind="globe" size={14} />
                            <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
                              IBAN
                              <span style={{ color: "#F2C766", fontSize: 10, fontWeight: 900 }}>If used</span>
                            </span>
                          </div>
                          <input
                            value={bankIban}
                            onChange={(e) => setBankIban(e.target.value)}
                            placeholder="Enter IBAN (if used)"
                            style={bankInputStyle()}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 10,
                        }}
                      >
                        <div>
                          <div style={bankFieldLabelStyle()}>
                            <EntryDetailIcon kind="globe" size={14} />
                            Country
                          </div>
                          <select
                            value={bankCountry}
                            onChange={(e) => handleBankCountryChange(e.target.value)}
                            style={bankInputStyle()}
                          >
                            <option value="">Select</option>
                            {BANK_COUNTRY_OPTIONS.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <div style={bankFieldLabelStyle()}>
                            <EntryDetailIcon kind="globe" size={14} />
                            Currency
                          </div>
                          <select
                            value={bankCurrency}
                            onChange={(e) => setBankCurrency(e.target.value)}
                            style={bankInputStyle()}
                          >
                            <option value="NGN">NGN</option>
                            <option value="GBP">GBP</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="INR">INR</option>
                            <option value="KES">KES</option>
                            <option value="GHS">GHS</option>
                            <option value="ZAR">ZAR</option>
                            <option value="UGX">UGX</option>
                            <option value="TZS">TZS</option>
                            <option value="RWF">RWF</option>
                          </select>
                        </div>
                      </div>

                      <div
                        style={{
                          color: "#F2C766",
                          fontSize: 11.5,
                          fontWeight: 820,
                          lineHeight: 1.3,
                        }}
                      >
                        UK = United Kingdom / GB
                      </div>

                      <div>
                        <div style={bankFieldLabelStyle()}>
                          <EntryDetailIcon kind="note" size={14} />
                          Extra note
                        </div>
                        <textarea
                          value={bankNote}
                          onChange={(e) => setBankNote(e.target.value)}
                          placeholder="If phone country and bank country are different, explain briefly"
                          style={bankTextAreaStyle()}
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        borderRadius: 18,
                        border: "1px solid rgba(126,164,204,0.22)",
                        background:
                          "linear-gradient(180deg, rgba(13,45,73,0.58) 0%, rgba(8,31,53,0.66) 100%)",
                        padding: 12,
                        display: shouldShowVerificationBlock("verification") && showOfficialIdEvidenceBlock ? "grid" : "none",
                        gap: 10,
                      }}
                    >
                      <div style={bankFieldLabelStyle()}>
                        <EntryDetailIcon kind="id" size={14} />
                        <span>
                          {regionalEvidence.officialIdLabel} <span style={{ color: "#B9CBE0", fontWeight: 800 }}>(optional)</span>
                        </span>
                      </div>
                      <div style={{ color: "#B9CBE0", fontSize: 12, fontWeight: 760, marginTop: -5 }}>
                        {regionalEvidence.officialIdHelp}
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 10,
                        }}
                      >
                        <div>
                          <div style={{ ...detailFieldHelpStyle(), color: "#F8FBFF", marginTop: 0 }}>
                            Reference
                          </div>
                          <input
                            value={driverLicenceNumber}
                            onChange={(e) => setDriverLicenceNumber(e.target.value)}
                            placeholder={regionalEvidence.officialIdPlaceholder}
                            style={bankInputStyle()}
                          />
                        </div>
                        <div>
                          <div style={{ ...detailFieldHelpStyle(), color: "#F8FBFF", marginTop: 0 }}>
                            Issuing country
                          </div>
                          <input
                            value={driverLicenceCountry}
                            onChange={(e) => setDriverLicenceCountry(e.target.value)}
                            placeholder="Select country"
                            style={bankInputStyle()}
                          />
                        </div>
                      </div>

                      <div>
                        <div style={{ ...detailFieldHelpStyle(), color: "#F8FBFF", marginTop: 0 }}>
                          Short note
                        </div>
                        <textarea
                          value={driverLicenceNote}
                          onChange={(e) => setDriverLicenceNote(e.target.value)}
                          placeholder="Add a short note (optional)"
                          style={{ ...bankTextAreaStyle(), minHeight: 48 }}
                        />
                      </div>

                      <PrimaryButton
                        onClick={handleRecordOfficialId}
                        busy={busy}
                        busyLabel="Recording..."
                        disabled={!canRecordOfficialId || Boolean(licenceVerificationResult)}
                        minWidth={0}
                        stableHeight={48}
                        debugId="create-entry.official-id.record"
                        style={{
                          ...primaryBtn(!canRecordOfficialId || busy || Boolean(licenceVerificationResult)),
                          width: "100%",
                          minWidth: 0,
                          minHeight: 48,
                          borderRadius: 14,
                          gap: 8,
                        }}
                      >
                        <EntryDetailIcon kind="id" size={14} />
                        {licenceVerificationResult ? "Official ID evidence recorded" : "Record official ID evidence"}
                      </PrimaryButton>

                      {renderLocalFeedback("verification")}
                    </div>

                    {optionalEvidenceStep === "official_id_done" ? (
                      <div
                        style={{
                          ...softCard("#ECFDF5"),
                          border: "1px solid rgba(167,243,208,0.70)",
                          display: "grid",
                          gap: 10,
                        }}
                      >
                        <div style={{ ...sectionLabel(), color: "#047857" }}>
                          Official ID recorded
                        </div>
                        <div style={{ color: "#065F46", fontWeight: 900, lineHeight: 1.5 }}>
                          Integrity level: {founderEvidence.label}. You can finish registration now.
                        </div>
                        {renderLocalFeedback("verification")}
                        <PrimaryButton
                          type="button"
                          onClick={() => handleFinishRegistration("verification")}
                          busy={busy && busyTarget === "community"}
                          busyLabel="Registering..."
                          minWidth={0}
                          stableHeight={48}
                          debugId="create-entry.official-id.finish-registration"
                          style={{ ...primaryBtn(false), width: "100%", minWidth: 0 }}
                        >
                          Finish registration now
                        </PrimaryButton>
                      </div>
                    ) : null}

                    <div
                      style={{
                        display: shouldShowVerificationBlock("bank") && showBankEvidenceBlock ? "grid" : "none",
                        gridTemplateColumns: "minmax(96px, 0.36fr) minmax(0, 1fr)",
                        gap: 10,
                      }}
                    >
                      <SecondaryButton
                        onClick={clearVerificationBlock}
                        minWidth={0}
                        stableHeight={48}
                        debugId="create-entry.bank.clear"
                        style={{
                          ...secondaryBtn(),
                          width: "100%",
                          minWidth: 0,
                          minHeight: 48,
                          borderRadius: 14,
                          border: "1px solid rgba(242,199,102,0.56)",
                          background: "transparent",
                          color: "#F2C766",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                          textShadow: "none",
                          gap: 8,
                        }}
                      >
                        <EntryDetailIcon kind="trash" size={14} />
                        Clear
                      </SecondaryButton>
                      <PrimaryButton
                        onClick={handleSaveBankDetails}
                        busy={busy}
                        busyLabel="Saving..."
                        disabled={!canContinueBank}
                        minWidth={0}
                        stableHeight={48}
                        debugId="create-entry.bank.save"
                        style={{
                          ...primaryBtn(!canContinueBank || busy),
                          width: "100%",
                          minWidth: 0,
                          minHeight: 48,
                          borderRadius: 14,
                          border: !canContinueBank || busy
                            ? "1px solid rgba(161,179,199,0.42)"
                            : "1px solid rgba(255,245,204,0.74)",
                          background: !canContinueBank || busy
                            ? "linear-gradient(180deg, rgba(215,222,232,0.90) 0%, rgba(190,200,213,0.86) 100%)"
                            : "linear-gradient(180deg, #FFE795 0%, #F2C766 52%, #D6AA45 100%)",
                          color: !canContinueBank || busy ? "#5F7287" : "#10253B",
                          boxShadow: !canContinueBank || busy
                            ? "0 10px 20px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.42)"
                            : "0 18px 34px rgba(214,170,69,0.28), inset 0 1px 0 rgba(255,255,255,0.58)",
                          gap: 8,
                        }}
                      >
                        <EntryDetailIcon kind="password" size={14} />
                        Save bank and wallet details
                      </PrimaryButton>
                    </div>

                    {renderLocalFeedback("bank")}

                    {optionalEvidenceStep === "bank_done" ? (
                      <div
                        style={{
                          ...softCard("#ECFDF5"),
                          border: "1px solid rgba(167,243,208,0.70)",
                          display: "grid",
                          gap: 10,
                        }}
                      >
                        <div style={{ ...sectionLabel(), color: "#047857" }}>
                          Bank or wallet recorded
                        </div>
                        <div style={{ color: "#065F46", fontWeight: 900, lineHeight: 1.5 }}>
                          Integrity level: {founderEvidence.label}. Add official ID if available, or finish now.
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          <PrimaryButton
                            type="button"
                            onClick={handleContinueToOfficialIdEvidence}
                            minWidth={0}
                            stableHeight={48}
                            debugId="create-entry.bank.continue-official-id"
                            style={{ ...primaryBtn(false), width: "100%", minWidth: 0 }}
                          >
                            Add official ID
                          </PrimaryButton>
                          <SecondaryButton
                            type="button"
                            onClick={() => handleFinishRegistration("bank")}
                            busy={busy && busyTarget === "community"}
                            busyLabel="Registering..."
                            minWidth={0}
                            stableHeight={46}
                            debugId="create-entry.bank.finish-registration"
                            style={{ ...secondaryBtn(), width: "100%", minWidth: 0 }}
                          >
                            Finish registration now
                          </SecondaryButton>
                        </div>
                      </div>
                    ) : null}

                    {communityDetailsRecorded &&
                    !createOutcome &&
                    optionalEvidenceStep !== "photo_done" &&
                    optionalEvidenceStep !== "bank_done" &&
                    optionalEvidenceStep !== "official_id_done" ? (
                      <div
                        style={{
                          ...softCard("#ECFDF5"),
                          border: "1px solid rgba(167,243,208,0.70)",
                          display: "grid",
                          gap: 10,
                        }}
                      >
                        <div style={{ ...sectionLabel(), color: "#047857" }}>
                          Ready to finish
                        </div>
                        <div
                          style={{
                            color: "#065F46",
                            fontWeight: 900,
                            lineHeight: 1.55,
                          }}
                        >
                          Your community details are recorded on this screen. Finish registration now, or add more founder evidence first.
                        </div>
                        <PrimaryButton
                          type="button"
                          onClick={() => handleFinishRegistration("verification")}
                          busy={busy && busyTarget === "community"}
                          busyLabel="Registering..."
                          minWidth={0}
                          stableHeight={50}
                          debugId="create-entry.verification.finish-registration"
                          style={{
                            ...primaryBtn(busy),
                            width: "100%",
                            minWidth: 0,
                            minHeight: 50,
                          }}
                        >
                          Finish registration now
                        </PrimaryButton>
                      </div>
                    ) : null}
                  </div>
                )
              ) : null}
            </div>

            <div
              ref={communityRef}
              style={{
                ...stageShell(openPanel === "community", Boolean(communityDetailsRecorded || createOutcome)),
                display: activeEvidenceMode ? "none" : undefined,
                order: step === "verify" ? 3 : 2,
              }}
            >
              <SecondaryButton
                onClick={() =>
                  openPanel === "community"
                    ? setOpenPanel(null)
                    : handleOpenPanel("community")
                }
                disabled={!canOpenCommunity}
                fullWidth
                stableHeight={74}
                debugId="create-entry.community.toggle"
                style={stageDropDownHeader(openPanel === "community", Boolean(communityDetailsRecorded || createOutcome))}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={stageBadge(stepProgress.community, Boolean(communityDetailsRecorded || createOutcome))}>
                    {communityDetailsRecorded || createOutcome ? "OK" : step === "verify" ? 3 : 2}
                  </span>
                  <span style={{ display: "grid", gap: 6 }}>
                    <span style={{ ...sectionLabel(), color: "#8FA7BD", letterSpacing: 2.2 }}>
                      {step === "verify" ? "Step 3" : "Step 2"}
                    </span>
                    <span
                      style={{
                        color: "#F8FBFF",
                        fontSize: 22,
                        fontWeight: 1000,
                        lineHeight: 1.15,
                      }}
                    >
                      Community setup
                    </span>
                  </span>
                </span>
                <span style={stageOpenIcon(openPanel === "community")}>
                  {!canOpenCommunity ? "!" : openPanel === "community" ? "-" : "+"}
                </span>
              </SecondaryButton>

              {openPanel === "community" ? (
                <div
                  style={{
                    marginTop: 10,
                    color: "#B9D0E6",
                    lineHeight: 1.7,
                    fontSize: 14,
                    fontWeight: 760,
                  }}
                >
                  Name it. Add a short story. Finish now or add optional proof.
                </div>
              ) : null}

              {openPanel === "community" && !busyTarget && !communityDecisionMode ? (
                <div style={{ marginTop: 12 }}>
                  <FounderEvidenceMeter compact />
                </div>
              ) : null}

              {openPanel === "community" ? (
                <form
                  onSubmit={onSubmit}
                  style={{ display: "grid", gap: 14, marginTop: 16 }}
                >
                  <div style={{ display: communityDecisionMode ? "none" : undefined }}>
                    <div style={fieldLabel()}>Community name</div>
                    <input
                      value={communityName}
                      onChange={(e) => {
                        setCommunityName(e.target.value);
                        setCommunityDetailsRecorded(false);
                        setCreateOutcome(null);
                        clearFeedback("community");
                      }}
                      placeholder="Enter community name"
                      style={input()}
                    />
                  </div>

                  <div style={{ display: communityDecisionMode ? "none" : undefined }}>
                    <div style={fieldLabel()}>Short description</div>
                    <textarea
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        setCommunityDetailsRecorded(false);
                        setCreateOutcome(null);
                        clearFeedback("community");
                      }}
                      placeholder="Describe what this community represents"
                      style={textArea()}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      display: communityDecisionMode ? "none" : "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <SecondaryButton
                      onClick={clearCommunityBlock}
                      minWidth={116}
                      stableHeight={44}
                      debugId="create-entry.community.clear"
                      style={{ ...secondaryBtn(), minWidth: 116 }}
                    >
                      Clear
                    </SecondaryButton>
                    <PrimaryButton
                      type="submit"
                      busy={busy && busyTarget === "community" && !communityDetailsRecorded}
                      busyLabel="Recording..."
                      disabled={!canRecordCommunityDetails || Boolean(createOutcome)}
                      minWidth={220}
                      stableHeight={52}
                      debugId="create-entry.community.submit"
                      style={{
                        ...primaryBtn(!canRecordCommunityDetails || busy || Boolean(createOutcome)),
                        width: "auto",
                        minWidth: 220,
                        flex: "1 1 260px",
                      }}
                    >
                      {createOutcome
                        ? "Community registered"
                        : communityDetailsRecorded
                          ? "Update community details"
                          : "Record community details"}
                    </PrimaryButton>
                  </div>

                  {renderLocalFeedback("community")}

                  {communityDetailsRecorded || createOutcome ? (
                    <div
                      style={{
                        ...softCard(createOutcome ? "#ECFDF5" : "#FFFBEB"),
                        border: createOutcome
                          ? "1px solid #A7F3D0"
                          : "1px solid rgba(242,199,102,0.42)",
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <div style={{ ...sectionLabel(), color: createOutcome ? "#047857" : "#92400E" }}>
                        {createOutcome ? "Community registered" : "Community details recorded"}
                      </div>
                      {!createOutcome ? (
                        <div
                          style={{
                            justifySelf: "start",
                            borderRadius: 999,
                            border: "1px solid rgba(4,120,87,0.28)",
                            background: "rgba(16,185,129,0.13)",
                            color: "#047857",
                            padding: "6px 10px",
                            fontSize: 11,
                            fontWeight: 1000,
                            lineHeight: 1,
                          }}
                        >
                          Done: Community details
                        </div>
                      ) : null}
                      <div
                        style={{
                          color: createOutcome ? "#065F46" : "#92400E",
                          fontWeight: 900,
                          lineHeight: 1.55,
                        }}
                      >
                        {createOutcome
                          ? createOutcome.message
                          : "This community name and story are ready. Extra founder trust evidence is optional. Finish registration now to move ahead."}
                      </div>

                      {createOutcome ? (
                        <PrimaryButton
                          type="button"
                          onClick={handleContinueAfterCreateOutcome}
                          minWidth={0}
                          stableHeight={50}
                          debugId="create-entry.community.continue-after-create"
                          style={{
                            ...primaryBtn(false),
                            width: "100%",
                            minWidth: 0,
                            minHeight: 50,
                          }}
                        >
                          {createOutcome.actionLabel}
                        </PrimaryButton>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr",
                            gap: 8,
                          }}
                        >
                          <PrimaryButton
                            type="button"
                            onClick={() => handleFinishRegistration("community")}
                            busy={busy && busyTarget === "community"}
                            busyLabel="Registering..."
                            minWidth={0}
                            stableHeight={50}
                            debugId="create-entry.community.finish-registration"
                            style={{
                              ...primaryBtn(false),
                              width: "100%",
                              minWidth: 0,
                              minHeight: 50,
                            }}
                          >
                            Finish registration now
                          </PrimaryButton>
                          <SecondaryButton
                            type="button"
                            onClick={handleAddFounderEvidenceFromCommunity}
                            minWidth={0}
                            stableHeight={48}
                            debugId="create-entry.community.add-founder-evidence"
                            style={{
                              ...secondaryBtn(),
                              width: "100%",
                              minWidth: 0,
                              minHeight: 48,
                            }}
                          >
                            Add founder trust evidence
                          </SecondaryButton>
                        </div>
                      )}
                    </div>
                  ) : null}
                </form>
              ) : null}
            </div>
                </div>
              ) : null}
            </div>
          </div>
          <div
            style={{
              marginTop: 15,
              display: "grid",
              gridTemplateColumns: "auto minmax(0, 1fr) auto",
              alignItems: "center",
              gap: 9,
              color: "#B9D0E6",
            }}
          >
            <MiniLineIcon kind="shield" />
            <div style={{ display: "grid", gap: 3 }}>
              <div style={{ fontWeight: 900, fontSize: 13.5 }}>
                Secure setup.
              </div>
              <div style={{ color: "#8FA7BD", fontWeight: 760, lineHeight: 1.35, fontSize: 11.5 }}>
                Your data is protected.
              </div>
            </div>
            <span aria-hidden="true" style={{ color: "#8FA7BD", fontSize: 24, fontWeight: 300 }}>
              {">"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


