import React, { useMemo, useState } from "react";
import { safeCopy, type ProtectedTradeRecord } from "../lib/api";
import GsnSnapshotPaperCard from "./GsnSnapshotPaperCard";
import { SecondaryButton, SubtleButton } from "./StableButton";

type GsnTradeRecordDocumentProps = {
  trade: ProtectedTradeRecord;
  buyerName?: string;
  sellerName?: string;
  shopName?: string;
  fulfilmentMethod?: string;
};

function clean(value: unknown, fallback = "Not recorded"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function titleCase(value: unknown): string {
  return clean(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function utcTimestamp(value: unknown): string {
  const parsed = new Date(String(value || ""));
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString().replace(/\.\d{3}Z$/, "Z")
    : parsed.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function recordStage(trade: ProtectedTradeRecord): {
  title: string;
  status: string;
  payment: string;
} {
  const status = String(trade.status || "").toLowerCase();
  const paymentStatus = String(trade.payment_status || "").toLowerCase();
  const receiptStatus = String(trade.receipt_status || "").toLowerCase();
  const releaseStatus = String(trade.release_status || "").toLowerCase();
  const deferredCredit = trade.meta?.payment_timing === "deferred_credit";

  let title = status === "awaiting_buyer_acceptance"
    ? "GSN Proposed Trade Agreement"
    : "GSN Trade Record";
  if (["claimed", "payment_claimed"].includes(paymentStatus) || status === "payment_claimed") {
    title = "GSN Payment Report";
  }
  if (paymentStatus === "seller_confirmed_received" || status === "payment_received") {
    title = "GSN Payment Acknowledgement";
  }
  if (releaseStatus || ["released", "received", "not_received"].includes(status)) {
    title = status === "received" || receiptStatus === "confirmed"
      ? "GSN Fulfilment Record"
      : "GSN Dispatch Record";
  }

  let payment = deferredCredit
    ? "Deferred payment terms recorded; no immediate payment claim"
    : "No payment report recorded";
  if (paymentStatus === "instruction_added") {
    payment = "Seller supplied direct payment details and a GSN payment code";
  } else if (["claimed", "payment_claimed"].includes(paymentStatus) || status === "payment_claimed") {
    payment = "Buyer reported payment; seller acknowledgement remains required";
  } else if (paymentStatus === "seller_confirmed_received" || status === "payment_received") {
    payment = "Seller acknowledged receipt; GSN did not independently verify the bank transfer";
  }

  return {
    title,
    status: titleCase(status || "draft"),
    payment,
  };
}

function buildRecordText(
  trade: ProtectedTradeRecord,
  details: {
    buyerName?: string;
    sellerName?: string;
    shopName?: string;
    fulfilmentMethod?: string;
  }
): string {
  const stage = recordStage(trade);
  const meta = trade.meta || {};
  const currency = clean(trade.currency, "Currency not recorded").toUpperCase();
  const amount = clean(trade.amount, "Amount not recorded");
  const quantity = clean(meta.quantity, "Quantity not recorded");
  const fulfilment = titleCase(meta.fulfilment_method || details.fulfilmentMethod || "on request");
  return [
    "GLOBAL SUPPORT NETWORK (GSN)",
    "Official GSN headed paper",
    `Title: ${stage.title}`,
    "Purpose: Private transaction record prepared from participant-confirmed actions.",
    `Generated (UTC): ${utcTimestamp(trade.updated_at || trade.created_at)}`,
    `Reference: ${clean(trade.trade_code, "Pending reference")}`,
    "GSN record context",
    `Record status: ${stage.status}`,
    `Buyer: ${clean(details.buyerName, "Requesting buyer")}`,
    `Seller: ${clean(details.sellerName, "Matched seller")}`,
    `Shop: ${clean(details.shopName, "Matched Shop")}`,
    "Record details",
    `Item: ${clean(trade.item_title)}`,
    `Quantity: ${quantity}`,
    `Final total: ${currency} ${amount}`,
    `Fulfilment: ${fulfilment}`,
    `Terms: ${clean(trade.terms_summary)}`,
    `Payment state: ${stage.payment}`,
    "Privacy: This copy contains the transaction record only. The private conversation and seller bank details are not included.",
    "Limitation: Recorded by GSN from participant-confirmed actions. This is not escrow, independent bank verification, a product warranty, or automatic proof of delivery.",
    "Footer: Global Support Network (GSN). A private record of what participants confirmed.",
  ].join("\n");
}

export default function GsnTradeRecordDocument({
  trade,
  buyerName,
  sellerName,
  shopName,
  fulfilmentMethod,
}: GsnTradeRecordDocumentProps) {
  const [actionMessage, setActionMessage] = useState("");
  const printKey = `gsn-trade-${Number(trade.id || 0)}`;
  const recordText = useMemo(
    () => buildRecordText(trade, { buyerName, sellerName, shopName, fulfilmentMethod }),
    [buyerName, fulfilmentMethod, sellerName, shopName, trade]
  );

  function printRecord() {
    if (typeof document === "undefined" || typeof window === "undefined") return;
    const style = document.createElement("style");
    style.setAttribute("data-gsn-trade-print-style", printKey);
    style.textContent = `@media print {
      body * { visibility: hidden !important; }
      [data-gsn-trade-document-print="${printKey}"],
      [data-gsn-trade-document-print="${printKey}"] * { visibility: visible !important; }
      [data-gsn-trade-document-print="${printKey}"] {
        position: absolute !important; inset: 0 auto auto 0 !important;
        width: 100% !important; padding: 18px !important; background: #fff !important;
      }
      [data-gsn-trade-document-actions="true"] { display: none !important; }
    }`;
    document.head.appendChild(style);
    const cleanup = () => {
      style.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.setTimeout(cleanup, 3000);
    window.print();
  }

  async function shareRecord() {
    setActionMessage("");
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: clean(trade.trade_code, "GSN Trade Record"),
          text: recordText,
        });
        setActionMessage("Record shared. The private conversation was not included.");
        return;
      }
      const copied = await safeCopy(recordText);
      setActionMessage(
        copied
          ? "Record copied. The private conversation was not included."
          : "This browser could not share or copy the record. Use Print or save PDF instead."
      );
    } catch (error: any) {
      if (String(error?.name || "") === "AbortError") return;
      const copied = await safeCopy(recordText);
      setActionMessage(
        copied
          ? "Record copied. The private conversation was not included."
          : "This browser could not share the record. Use Print or save PDF instead."
      );
    }
  }

  return (
    <section
      data-gsn-trade-document="private-official-record"
      data-gsn-trade-document-print={printKey}
      style={{ display: "grid", gap: 9, minWidth: 0 }}
    >
      <GsnSnapshotPaperCard
        paperText={recordText}
        compact
        icon="document"
        style={{ boxShadow: "0 14px 32px rgba(8,17,31,0.13)" }}
      />
      <div
        data-gsn-trade-document-actions="true"
        style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 7 }}
      >
        <SecondaryButton
          type="button"
          onClick={printRecord}
          debugId={`demand-box.trade.${Number(trade.id || 0)}.print`}
          stableHeight={42}
          style={{ borderRadius: 12, fontSize: 11.5 }}
        >
          Print or save PDF
        </SecondaryButton>
        <SubtleButton
          type="button"
          onClick={() => void shareRecord()}
          debugId={`demand-box.trade.${Number(trade.id || 0)}.share`}
          stableHeight={42}
          style={{ borderRadius: 12, fontSize: 11.5 }}
        >
          Share record copy
        </SubtleButton>
      </div>
      {actionMessage ? (
        <div role="status" data-gsn-trade-document-actions="true" style={{ color: "#41556B", fontSize: 11, lineHeight: 1.4 }}>
          {actionMessage}
        </div>
      ) : null}
    </section>
  );
}
