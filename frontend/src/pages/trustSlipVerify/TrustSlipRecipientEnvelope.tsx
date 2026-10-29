import React from "react";
import { GsnRealisticIcon } from "../../components/GsnRealisticIcon";
import { PrimaryButton } from "../../components/StableButton";

type TrustSlipRecipientEnvelopeProps = {
  compact: boolean;
  holderName: string;
  communityLabel: string;
  onOpen: () => void;
};

export default function TrustSlipRecipientEnvelope({
  compact,
  holderName,
  communityLabel,
  onOpen,
}: TrustSlipRecipientEnvelopeProps) {
  return (
    <section
      data-gsn-trustslip-recipient-envelope="sealed"
      style={{
        width: "100%",
        boxSizing: "border-box",
        borderRadius: compact ? 24 : 32,
        border: "1px solid rgba(246,215,122,0.34)",
        background:
          "radial-gradient(circle at 50% 0%, rgba(28,74,110,0.72), transparent 46%), linear-gradient(155deg, #07172C 0%, #082A45 100%)",
        boxShadow: "0 28px 64px rgba(7,23,44,0.22)",
        padding: compact ? "20px 16px 16px" : "32px 44px 26px",
        display: "grid",
        justifyItems: "center",
        gap: compact ? 12 : 16,
        overflow: "hidden",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 620 }}>
        <h1
          style={{
            margin: 0,
            color: "#FFFFFF",
            fontSize: compact ? 28 : 40,
            lineHeight: 1.04,
            fontWeight: 1000,
          }}
        >
          A TrustSlip has arrived
        </h1>
        <p
          style={{
            margin: "9px 0 0",
            color: "#D7E3F1",
            fontSize: compact ? 13 : 15,
            lineHeight: 1.45,
            fontWeight: 800,
          }}
        >
          From {holderName}
        </p>
      </div>

      <div
        data-gsn-trustslip-envelope-object="closed"
        aria-label={`Sealed TrustSlip from ${holderName}`}
        role="img"
        style={{
          position: "relative",
          width: compact ? "min(100%, 330px)" : "min(100%, 520px)",
          aspectRatio: "1.55 / 1",
          borderRadius: compact ? 18 : 24,
          border: "2px solid rgba(214,170,69,0.68)",
          background: "linear-gradient(145deg, #FFFDF7 0%, #F5E9CB 100%)",
          boxShadow: "0 22px 42px rgba(0,0,0,0.24), inset 0 0 0 4px rgba(255,255,255,0.52)",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "0 0 36%",
            clipPath: "polygon(0 0, 100% 0, 50% 100%)",
            background: "linear-gradient(180deg, #FFFDF8 0%, #E8D6AC 100%)",
            borderBottom: "1px solid rgba(122,74,0,0.22)",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "34% 0 0",
            clipPath: "polygon(0 0, 52% 58%, 100% 0, 100% 100%, 0 100%)",
            background: "linear-gradient(160deg, rgba(255,253,247,0.96), rgba(236,218,174,0.98))",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: compact ? 16 : 24,
            right: compact ? 16 : 24,
            bottom: compact ? 12 : 20,
            display: "grid",
            gap: 3,
            color: "#07172C",
          }}
        >
          <span style={{ fontSize: compact ? 9 : 10, fontWeight: 1000, color: "#7A4A00", textTransform: "uppercase" }}>
            Community
          </span>
          <span style={{ fontSize: compact ? 13 : 15, fontWeight: 1000, overflowWrap: "anywhere" }}>
            {communityLabel}
          </span>
        </div>

        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            top: "47%",
            transform: "translate(-50%, -50%)",
            width: compact ? 72 : 96,
            height: compact ? 72 : 96,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "radial-gradient(circle at 35% 25%, #F9E7A3 0%, #D6AA45 56%, #8B5B0B 100%)",
            border: "4px double rgba(95,65,0,0.72)",
            boxShadow: "0 10px 20px rgba(75,45,0,0.28)",
          }}
        >
          <GsnRealisticIcon
            name="certificate-seal"
            size={compact ? 58 : 76}
            decorative
            loading="eager"
          />
        </div>
      </div>

      <div style={{ width: "min(100%, 520px)", display: "grid", gap: 7 }}>
        <PrimaryButton
          type="button"
          fullWidth
          stableHeight={compact ? 56 : 60}
          debugId="trust-slip-verify.public.open-envelope"
          onClick={onOpen}
          style={{ justifyContent: "center", borderRadius: 16, fontSize: compact ? 17 : 18 }}
        >
          Open TrustSlip
        </PrimaryButton>
      </div>
    </section>
  );
}
