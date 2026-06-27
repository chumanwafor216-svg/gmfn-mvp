import React from "react";
import TrustBandMeaningGuide from "./TrustBandMeaningGuide";
import { StableCtaLink } from "./StableButton";

type TrustSlipQuestion = {
  title: string;
  answer: string;
};

type TrustSlipReaderBlockProps = {
  compact?: boolean;
  holderName: string;
  gmfnId: string;
  profileImageUrl?: string | null;
  communityName: string;
  communityGlobalId?: string | null;
  holderRole?: string | null;
  activeMemberCount?: string | number | null;
  activeCommunityCount?: string | number | null;
  memberWitnessCount?: string | number | null;
  membershipStrengthLabel?: string | null;
  membershipRenewalStatusLabel?: string | null;
  membershipValidUntil?: string | null;
  nextWitnessRenewalAt?: string | null;
  nextWitnessRenewalStatusLabel?: string | null;
  membershipCurrentnessLabel?: string | null;
  membershipCurrentnessScope?: string | null;
  memberCredentialPath?: string | null;
  communityActivityCount?: string | number | null;
  communityActivityLatestAt?: string | null;
  communityActivityCategories?: string[] | null;
  communityActivityLabel?: string | null;
  sponsorCount?: string | number | null;
  phoneVerified?: boolean | null;
  identityStatusLabel?: string | null;
  cciScore?: string | number | null;
  cciBand?: string | null;
  cciMeaning?: string | null;
  trustLimit?: string | number | null;
  currency?: string | null;
  readerVerdict?: string | null;
  questions: TrustSlipQuestion[];
};

function clean(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function countLabel(value: unknown, fallback = "Not shown"): string {
  const text = clean(value);
  return text || fallback;
}

function dateLabel(value: unknown): string {
  const text = clean(value);
  if (!text) return "";
  const parsed = new Date(text);
  if (!Number.isFinite(parsed.getTime())) return text;
  return parsed.toLocaleDateString();
}

function listLabel(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.map((item) => clean(item)).filter(Boolean).join(", ");
}

function initials(name: string): string {
  const parts = clean(name, "Member")
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2);
  return parts.join("").toUpperCase() || "GSN";
}

function shell(): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(37,78,119,0.12)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(246,250,255,0.98) 100%)",
    boxShadow:
      "0 18px 42px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.88)",
    padding: 18,
    color: "#0B1F33",
  };
}

function label(): React.CSSProperties {
  return {
    color: "#526579",
    fontSize: 11,
    fontWeight: 1000,
    letterSpacing: 0.42,
    textTransform: "uppercase",
  };
}

function body(): React.CSSProperties {
  return {
    color: "#38506A",
    fontSize: 14,
    lineHeight: 1.65,
  };
}

function pill(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 28,
    borderRadius: 999,
    padding: "5px 9px",
    border: primary
      ? "1px solid rgba(11,99,209,0.14)"
      : "1px solid rgba(108,138,184,0.18)",
    background: primary
      ? "linear-gradient(180deg, rgba(11,99,209,0.11) 0%, rgba(11,99,209,0.06) 100%)"
      : "linear-gradient(180deg, rgba(245,249,255,0.96) 0%, rgba(232,240,249,0.94) 100%)",
    color: primary ? "#0B63D1" : "#415A72",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function tile(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(37,78,119,0.10)",
    background: bg,
    padding: 14,
    minWidth: 0,
  };
}

export default function TrustSlipReaderBlock({
  compact = false,
  holderName,
  gmfnId,
  profileImageUrl,
  communityName,
  communityGlobalId,
  holderRole,
  activeMemberCount,
  activeCommunityCount,
  memberWitnessCount,
  membershipStrengthLabel,
  membershipRenewalStatusLabel,
  membershipValidUntil,
  nextWitnessRenewalAt,
  nextWitnessRenewalStatusLabel,
  membershipCurrentnessLabel,
  membershipCurrentnessScope,
  memberCredentialPath,
  communityActivityCount,
  communityActivityLatestAt,
  communityActivityCategories,
  communityActivityLabel,
  sponsorCount,
  phoneVerified,
  identityStatusLabel,
  cciScore,
  cciBand,
  cciMeaning,
  trustLimit,
  currency,
  readerVerdict,
  questions,
}: TrustSlipReaderBlockProps) {
  const phoneText =
    phoneVerified === true
      ? "Phone verified"
      : phoneVerified === false
        ? "Phone not verified or not shown"
        : "Phone status not shown";
  const identityText =
    clean(identityStatusLabel) ||
    `${phoneText}; formal identity document not verified by GSN yet`;
  const communityDensity = `${countLabel(activeMemberCount)} active member${
    countLabel(activeMemberCount) === "1" ? "" : "s"
  } shown in this community`;
  const widerContext = `${countLabel(activeCommunityCount)} active community context${
    countLabel(activeCommunityCount) === "1" ? "" : "s"
  }; ${countLabel(sponsorCount)} sponsor signal${countLabel(sponsorCount) === "1" ? "" : "s"}`;
  const memberWitnessText =
    clean(membershipStrengthLabel) && clean(memberWitnessCount)
      ? `${clean(membershipStrengthLabel)} from ${countLabel(memberWitnessCount, "0")} member witness${
          countLabel(memberWitnessCount, "0") === "1" ? "" : "es"
        }`
      : "Member-witness strength not shown";
  const validUntil = dateLabel(membershipValidUntil);
  const validUntilText = validUntil
    ? ` Valid until ${validUntil}.`
    : "";
  const nextRenewal = dateLabel(nextWitnessRenewalAt);
  const nextRenewalText = nextRenewal
    ? ` Next witness renewal: ${nextRenewal} (${clean(nextWitnessRenewalStatusLabel, "Not Started")}).`
    : "";
  const renewalText = clean(membershipRenewalStatusLabel)
    ? ` Renewal status: ${clean(membershipRenewalStatusLabel)}.`
    : "";
  const currentnessText = clean(
    membershipCurrentnessLabel,
    "Witness renewal not started"
  );
  const currentnessScopeText = clean(
    membershipCurrentnessScope,
    "This active membership record has no current witness validity window. Ask for member witnesses, TrustSlip, or live community confirmation before a serious decision."
  );
  const activityCount = countLabel(communityActivityCount, "0");
  const activityLatest = dateLabel(communityActivityLatestAt);
  const activityCategories = listLabel(communityActivityCategories);
  const activityText =
    clean(communityActivityLabel) || "No community activity recorded yet";
  const activityMeta = [
    activityCategories ? `Categories: ${activityCategories}.` : "",
    activityLatest ? `Latest activity: ${activityLatest}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section style={shell()}>
      <div style={label()}>TrustSlip reader block</div>
      <div
        style={{
          marginTop: 8,
          color: "#0B1F33",
          fontSize: compact ? 20 : 24,
          fontWeight: 1000,
          lineHeight: 1.2,
        }}
      >
        {clean(
          readerVerdict,
          "Use this TrustSlip as evidence. It should help your decision, but it should not make the decision for you."
        )}
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "minmax(0, 0.9fr) minmax(0, 1.1fr)",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        <div style={tile("#FCFEFF")}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={`${clean(holderName, "Member")} profile`}
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: 18,
                  objectFit: "cover",
                  border: "1px solid rgba(37,78,119,0.14)",
                  background: "#EAF1F8",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                aria-hidden
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: 18,
                  display: "grid",
                  placeItems: "center",
                  border: "1px solid rgba(37,78,119,0.14)",
                  background:
                    "linear-gradient(180deg, rgba(234,241,248,0.98) 0%, rgba(220,230,241,0.98) 100%)",
                  color: "#0B63D1",
                  fontWeight: 1000,
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {initials(holderName)}
              </div>
            )}

            <div style={{ minWidth: 0 }}>
              <div style={label()}>Holder</div>
              <div
                style={{
                  marginTop: 5,
                  fontSize: 22,
                  lineHeight: 1.15,
                  fontWeight: 1000,
                  color: "#0B1F33",
                  overflowWrap: "anywhere",
                }}
              >
                {clean(holderName, "Member")}
              </div>
              <div style={{ marginTop: 7, ...body(), overflowWrap: "anywhere" }}>
                GSN number: <b>{clean(gmfnId, "Not shown")}</b>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={pill(phoneVerified === true)}>{phoneText}</span>
            <span style={pill(false)}>
              ID document: not verified by GSN yet
            </span>
          </div>

          <div style={{ marginTop: 10, ...body() }}>{identityText}</div>
        </div>

        <div style={tile("#F8FBFF")}>
          <div style={label()}>Community context</div>
          <div
            style={{
              marginTop: 7,
              color: "#0B1F33",
              fontSize: 18,
              fontWeight: 1000,
              lineHeight: 1.25,
            }}
          >
            {clean(communityName, "Community not shown")}
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={pill(true)}>
              Role: {clean(holderRole, "member")}
            </span>
            <span style={pill(false)}>
              Community ID: {clean(communityGlobalId, "Not shown")}
            </span>
            <span style={pill(clean(memberWitnessCount) !== "" && clean(memberWitnessCount) !== "0")}>
              {memberWitnessText}
            </span>
            <span style={pill(clean(membershipRenewalStatusLabel).toLowerCase() === "active")}>
              Renewal: {clean(membershipRenewalStatusLabel, "Not Started")}
            </span>
            <span style={pill(clean(nextWitnessRenewalStatusLabel).toLowerCase() === "active")}>
              Next witness: {nextRenewal || "Not shown"}
            </span>
            <span style={pill(currentnessText.toLowerCase().includes("current"))}>
              Currentness: {currentnessText}
            </span>
            <span style={pill(clean(communityActivityCount) !== "" && clean(communityActivityCount) !== "0")}>
              Activity: {activityCount}
            </span>
          </div>

          <div style={{ marginTop: 10, ...body() }}>{communityDensity}</div>
          <div style={{ marginTop: 5, ...body() }}>{widerContext}</div>
          <div style={{ marginTop: 5, ...body() }}>
            Community activity evidence: {activityText}. {activityMeta}
          </div>
          <div style={{ marginTop: 5, ...body() }}>
            GSN shows witness strength as a count and status label. Private verifier names are not exposed here.
            {validUntilText}
            {renewalText}
            {nextRenewalText}
          </div>
          <div style={{ marginTop: 5, ...body() }}>
            Evidence currentness: {currentnessScopeText}
          </div>
          {clean(memberCredentialPath) ? (
            <StableCtaLink
              to={clean(memberCredentialPath)}
              kind="soft"
              stableHeight={44}
              debugId="trust-slip-reader.open-member-credential"
              style={{
                marginTop: 10,
                width: "100%",
                borderRadius: 12,
                fontWeight: 1000,
              }}
            >
              Open member credential
            </StableCtaLink>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <TrustBandMeaningGuide
          compact={compact}
          currentBand={cciBand}
        />
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "0.9fr 1.1fr",
          gap: 14,
        }}
      >
        <div style={tile("#FFFFFF")}>
          <div style={label()}>Cross-community consistency</div>
          <div
            style={{
              marginTop: 7,
              color: "#0B1F33",
              fontSize: 22,
              fontWeight: 1000,
              lineHeight: 1.2,
            }}
          >
            {clean(cciScore, "Not shown")} / {clean(cciBand, "Not stated")}
          </div>
          <div style={{ marginTop: 8, ...body() }}>
            {clean(
              cciMeaning,
              "Cross-community consistency helps the reader understand how much visible community evidence exists. If the score is low or empty, treat it as weak evidence, not a quiet approval."
            )}
          </div>
          <div style={{ marginTop: 8, ...body() }}>
            Trust-limit signal:{" "}
            <b>
              {clean(trustLimit, "0.00")} {clean(currency)}
            </b>
          </div>
        </div>

        <div style={tile("#FFFBEB")}>
          <div style={label()}>Plain decision guide</div>
          <div style={{ marginTop: 8, ...body(), color: "#0B1F33" }}>
            Read this as evidence, not automatic approval. For a bigger risk, ask for the full Trust Passport or direct community confirmation.
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "1fr 1fr",
          gap: 10,
        }}
      >
        {questions.map((item) => (
          <div key={item.title} style={tile("#FFFFFF")}>
            <div
              style={{
                color: "#0B1F33",
                fontSize: 15,
                fontWeight: 1000,
                lineHeight: 1.35,
              }}
            >
              {item.title}
            </div>
            <div style={{ marginTop: 8, ...body() }}>{item.answer}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
