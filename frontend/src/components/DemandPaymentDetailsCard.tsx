import { useState } from "react";
import type { SellerPaymentMessage } from "../lib/protectedTradePaymentMessage";
import { SecondaryButton } from "./StableAction";

type DemandPaymentDetailsCardProps = {
  details: SellerPaymentMessage;
};

export default function DemandPaymentDetailsCard({ details }: DemandPaymentDetailsCardProps) {
  const [codeCopied, setCodeCopied] = useState(false);
  const rows = [
    ["Item", details.itemTitle],
    ["Amount", `${details.currency} ${details.amount}`],
    ["Account name", details.accountName],
    ["Account number", details.accountNumber],
    ["Bank / wallet", details.bankName],
    ...(details.sortCode ? [["Sort code", details.sortCode]] : []),
  ];

  return (
    <section
      data-gsn-demand-payment-details="seller-direct"
      aria-label="Seller payment details"
      style={{
        minWidth: 0,
        display: "grid",
        gap: 8,
        padding: 10,
        borderRadius: 14,
        border: "1px solid rgba(214,170,69,0.34)",
        background: "linear-gradient(180deg, #FFFDF7 0%, #FFFFFF 100%)",
      }}
    >
      <div style={{ color: "#17324A", fontSize: 13, fontWeight: 950 }}>
        Seller payment details
      </div>
      <div
        data-gsn-demand-payment-beneficiary="seller-direct"
        style={{ color: "#17663D", fontSize: 11, fontWeight: 900 }}
      >
        Pay directly to the seller
      </div>
      <div style={{ display: "grid", gap: 5 }}>
        {rows.map(([label, value]) => (
          <div
            key={label}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(84px, 0.42fr) minmax(0, 1fr)",
              gap: 7,
              color: "#29445E",
              fontSize: 11.5,
              lineHeight: 1.35,
            }}
          >
            <span style={{ color: "#64748B", fontWeight: 800 }}>{label}</span>
            <strong style={{ overflowWrap: "anywhere" }}>{value}</strong>
          </div>
        ))}
      </div>
      <div
        data-gsn-demand-payment-reference="shared-evidence"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: 8,
          alignItems: "center",
          padding: "8px 9px",
          borderRadius: 10,
          background: "#EEF5FF",
          color: "#0B4FA8",
          fontSize: 10.5,
          fontWeight: 900,
          lineHeight: 1.35,
          overflowWrap: "anywhere",
        }}
      >
        <span>Shared payment code: {details.paymentReference}</span>
        <SecondaryButton
          type="button"
          onClick={() => {
            if (!navigator.clipboard?.writeText) return;
            void navigator.clipboard.writeText(details.paymentReference).then(() => {
              setCodeCopied(true);
              window.setTimeout(() => setCodeCopied(false), 1600);
            }).catch(() => setCodeCopied(false));
          }}
          debugId="demand-payment-details.copy-code"
          stableHeight={34}
          style={{ borderRadius: 9, padding: "5px 9px", fontSize: 10.5 }}
        >
          {codeCopied ? "Copied" : "Copy code"}
        </SecondaryButton>
      </div>
      <div style={{ color: "#64748B", fontSize: 9.5, lineHeight: 1.35 }}>
        Buyer and seller see this same code. Use it as the transfer reference; GSN stores it with the Trade Record but does not hold or automatically verify the money.
      </div>
    </section>
  );
}
