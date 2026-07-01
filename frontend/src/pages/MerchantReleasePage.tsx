import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { PrimaryButton, SecondaryButton } from "../components/StableButton";
import { GsnLegacyIcon } from "../components/GsnLegacyIcon";
import {
  TrustDocumentBoundaryPanel,
  TrustDocumentConfidenceRibbon,
  TrustDocumentFingerprint,
  TrustDocumentSecurityPanel,
  type TrustDocumentPanelItem,
  type TrustDocumentRibbonItem,
} from "../components/TrustDocumentLanguage";
import {
  recordMerchantRelease,
  verifyMerchantPublic,
  type MerchantReleaseResponse,
  type MerchantVerifyPublicResponse,
} from "../lib/merchantChannel";
import { safeCopy } from "../lib/api";

type NoticeTone = "success" | "error";

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function referenceFingerprint(...values: unknown[]): string {
  const input = values.map((value) => safeStr(value)).join("|") || "gsn-merchant-record";
  let hashA = 0x811c9dc5;
  let hashB = 0x45d9f3b;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    hashA ^= code;
    hashA = Math.imul(hashA, 0x01000193);
    hashB ^= code + index;
    hashB = Math.imul(hashB, 0x27d4eb2d);
  }
  const left = (hashA >>> 0).toString(16).padStart(8, "0");
  const right = (hashB >>> 0).toString(16).padStart(8, "0");
  return `GSN-MR-${left}-${right}`.toUpperCase();
}

function dateTimeLabel(value: unknown): string {
  const text = safeStr(value);
  if (!text) return "";
  const parsed = new Date(text);
  if (!Number.isFinite(parsed.getTime())) return text;
  return parsed.toLocaleString();
}

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 10% 0%, rgba(214,170,69,0.16) 0%, transparent 30%), linear-gradient(180deg, #07172C 0%, #0B2942 45%, #F6FAFF 45%, #F6FAFF 100%)",
    padding: "22px 14px 40px",
    color: "#07172C",
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };
}

function paper(): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    width: "min(100%, 760px)",
    margin: "0 auto",
    borderRadius: 24,
    border: "1px solid rgba(214,226,239,0.96)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(248,252,255,0.985) 100%)",
    boxShadow: "0 28px 80px rgba(2,6,23,0.26)",
    padding: "24px 18px 20px",
  };
}

function watermark(): React.CSSProperties {
  return {
    position: "absolute",
    right: -40,
    top: 48,
    fontSize: 92,
    fontWeight: 1000,
    color: "rgba(11,99,209,0.045)",
    pointerEvents: "none",
    userSelect: "none",
  };
}

function iconTile(): React.CSSProperties {
  return {
    width: 58,
    height: 58,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    background: "#FFFFFF",
    border: "1px solid rgba(214,170,69,0.26)",
    boxShadow: "0 14px 32px rgba(7,23,44,0.12)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    color: "#52677C",
    fontSize: 12,
    fontWeight: 1000,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#52677C",
    fontSize: 14,
    lineHeight: 1.48,
    fontWeight: 760,
  };
}

function badge(active = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 34,
    borderRadius: 999,
    padding: "7px 11px",
    background: active ? "#E8F7EF" : "#F8FBFF",
    border: active ? "1px solid rgba(46,155,98,0.24)" : "1px solid rgba(214,226,239,0.92)",
    color: active ? "#12653C" : "#234560",
    fontSize: 13,
    fontWeight: 950,
  };
}

function field(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 50,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.42)",
    background: "#FFFFFF",
    color: "#07172C",
    font: "inherit",
    fontSize: 16,
    fontWeight: 800,
    padding: "12px 13px",
    boxSizing: "border-box",
    outline: "none",
  };
}

function factCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(214,226,239,0.9)",
    background: "#FFFFFF",
    padding: 14,
  };
}

function noticeStyle(tone: NoticeTone): React.CSSProperties {
  return {
    borderRadius: 18,
    border:
      tone === "success"
        ? "1px solid rgba(46,155,98,0.22)"
        : "1px solid rgba(200,58,58,0.22)",
    background: tone === "success" ? "#ECFDF5" : "#FFF5F5",
    color: tone === "success" ? "#12653C" : "#9B1C1C",
    padding: 14,
    fontSize: 14,
    lineHeight: 1.45,
    fontWeight: 850,
  };
}

function tradeContextLabel(value: unknown): string {
  const key = safeStr(value).toLowerCase();
  if (key === "gsn_gsn") return "GSN + GSN";
  if (key === "external_gsn") return "Outside GSN + GSN";
  return "GSN + outside GSN";
}

function buildMerchantTradePacketPaper(result: MerchantReleaseResponse): string {
  const packet = result.trade_packet || {};
  const generatedAt = new Date().toISOString();
  const evidenceSlots = packet.evidence_slots || {};
  const slotLine = (label: string, key: string) =>
    `${label}: ${evidenceSlots[key] ? "Referenced" : "Not recorded"}`;

  return [
    "GLOBAL SUPPORT NETWORK (GSN)",
    "Official GSN headed paper",
    "Title: GSN Merchant Trade Packet Evidence",
    "Purpose: Timestamped minimum evidence for a merchant release conversation. WhatsApp or the parties keep the conversation; GSN records the final evidence reference packet.",
    `Generated (UTC): ${generatedAt}`,
    `Link ID: ${result.verification_link_id || "Not shown"}`,
    `Pack ID: ${result.pack_id || "Not shown"}`,
    `Trade Packet ID: ${result.trade_packet_id || packet.trade_packet_id || "Not shown"}`,
    "Packet context",
    `Trade shape: ${tradeContextLabel(packet.trade_context)}`,
    `Goods value: ${result.currency || "NGN"} ${result.goods_value || "Not recorded"}`,
    `Item / product: ${packet.item_title || "Not recorded"}`,
    `Other party: ${packet.counterparty_label || "Not recorded"}`,
    `WhatsApp label: ${packet.counterparty_whatsapp_label || "Not recorded"}`,
    "Evidence references",
    slotLine("Product evidence", "product"),
    slotLine("Invoice evidence", "invoice"),
    `Invoice reference: ${packet.invoice_reference || "Not recorded"}`,
    slotLine("Final agreement evidence", "agreement"),
    slotLine("Courier evidence", "courier"),
    `Courier: ${packet.courier_name || "Not recorded"}`,
    `Courier contact label: ${packet.courier_contact_label || "Not recorded"}`,
    `Tracking / waybill: ${packet.tracking_number || "Not recorded"}`,
    `Released to courier: ${packet.released_to_courier_at || "Not recorded"}`,
    `Expected delivery: ${packet.expected_delivery_date || "Not recorded"}`,
    slotLine("Payment schedule evidence", "payment_schedule"),
    `Payment schedule: ${packet.payment_schedule_note || "Not recorded"}`,
    `Receipt state: ${packet.receipt_status || "awaiting_delivery"}`,
    "Evidence notes",
    `Product note: ${packet.product_evidence_note || "Not recorded"}`,
    `Invoice note: ${packet.invoice_evidence_note || "Not recorded"}`,
    `Agreement note: ${packet.agreement_evidence_note || "Not recorded"}`,
    "Boundary",
    result.evidence_boundary,
    "GSN does not store the full WhatsApp conversation in this packet, does not control the courier, does not hold money, and does not approve payout.",
    "Privacy: Keep only the final evidence needed for reference. Avoid unnecessary private chat, addresses, bank details, third-party names, and unrelated personal information.",
    "Security marks: GSN headed paper, watermark, Link ID, Pack ID, Trade Packet ID, issue time, evidence slots, privacy boundary, limitation note, and official footer.",
    "Footer: Global Support Network (GSN). Community commerce evidence for organized trust, portable records, and safer marketplace decisions.",
  ].join("\n");
}

export default function MerchantReleasePage() {
  const params = useParams();
  const token = safeStr(params.token);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verifyResult, setVerifyResult] = useState<MerchantVerifyPublicResponse | null>(null);
  const [releaseResult, setReleaseResult] = useState<MerchantReleaseResponse | null>(null);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(null);
  const [goodsValue, setGoodsValue] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [merchantNote, setMerchantNote] = useState("");
  const [tradeContext, setTradeContext] = useState("gsn_external");
  const [itemTitle, setItemTitle] = useState("");
  const [counterpartyLabel, setCounterpartyLabel] = useState("");
  const [counterpartyWhatsappLabel, setCounterpartyWhatsappLabel] = useState("");
  const [productEvidenceNote, setProductEvidenceNote] = useState("");
  const [invoiceReference, setInvoiceReference] = useState("");
  const [invoiceEvidenceNote, setInvoiceEvidenceNote] = useState("");
  const [agreementEvidenceNote, setAgreementEvidenceNote] = useState("");
  const [courierName, setCourierName] = useState("");
  const [courierContactLabel, setCourierContactLabel] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [releasedToCourierAt, setReleasedToCourierAt] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [paymentScheduleNote, setPaymentScheduleNote] = useState("");
  const [receiptStatus, setReceiptStatus] = useState("awaiting_delivery");
  const verifyLoadSeqRef = useRef(0);
  const verifyLoadContextRef = useRef("");
  const releaseActionSeqRef = useRef(0);
  const releaseActionContextRef = useRef("");
  const merchantReleaseContextRef = useRef("");
  merchantReleaseContextRef.current = token;

  useEffect(() => {
    let cancelled = false;
    const contextKey = token;
    const loadSeq = verifyLoadSeqRef.current + 1;
    verifyLoadSeqRef.current = loadSeq;
    verifyLoadContextRef.current = contextKey;

    function isCurrentVerifyLoad() {
      return (
        !cancelled &&
        verifyLoadSeqRef.current === loadSeq &&
        verifyLoadContextRef.current === contextKey
      );
    }

    setVerifyResult(null);
    setReleaseResult(null);
    setSubmitting(false);
    setGoodsValue("");
    setCurrency("NGN");
    setMerchantNote("");
    setTradeContext("gsn_external");
    setItemTitle("");
    setCounterpartyLabel("");
    setCounterpartyWhatsappLabel("");
    setProductEvidenceNote("");
    setInvoiceReference("");
    setInvoiceEvidenceNote("");
    setAgreementEvidenceNote("");
    setCourierName("");
    setCourierContactLabel("");
    setTrackingNumber("");
    setReleasedToCourierAt("");
    setExpectedDeliveryDate("");
    setPaymentScheduleNote("");
    setReceiptStatus("awaiting_delivery");

    async function run() {
      if (!token) {
        setChecking(false);
        setNotice({ tone: "error", text: "This merchant release link is missing its verification token." });
        return;
      }

      setChecking(true);
      setNotice(null);
      try {
        const result = await verifyMerchantPublic(token);
        if (!isCurrentVerifyLoad()) return;
        setVerifyResult(result);
        setNotice({
          tone: "success",
          text: "The signed GSN merchant rail was checked. Review the identifiers before recording release evidence.",
        });
      } catch (error) {
        if (!isCurrentVerifyLoad()) return;
        setVerifyResult(null);
        setReleaseResult(null);
        setNotice({
          tone: "error",
          text: error instanceof Error ? error.message : "This merchant release link could not be checked.",
        });
      } finally {
        if (isCurrentVerifyLoad()) setChecking(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const canSubmit = useMemo(
    () => Boolean(token && verifyResult?.verified && safeStr(goodsValue) && !releaseResult),
    [goodsValue, releaseResult, token, verifyResult?.verified]
  );
  const merchantRecordFingerprint = referenceFingerprint(
    verifyResult?.verification_link_id,
    verifyResult?.pack_id,
    verifyResult?.level,
    verifyResult?.expires_at,
    verifyResult?.verified ? "verified" : "not-verified",
    releaseResult?.trade_packet_id,
    releaseResult?.pack_id,
    releaseResult?.goods_value,
    releaseResult?.currency
  );
  const merchantConfidenceRibbonItems: TrustDocumentRibbonItem[] = [
    {
      label: "Merchant rail status",
      value: checking ? "Checking" : verifyResult?.verified ? "Signed rail checked" : "Not checked",
      tone: checking ? "info" : verifyResult?.verified ? "good" : "warn",
    },
    {
      label: "Record integrity",
      value: verifyResult?.verification_link_id ? "Link ID resolved" : "Limited",
      tone: verifyResult?.verification_link_id ? "good" : "warn",
    },
    {
      label: "Evidence chain",
      value: releaseResult ? "Trade packet recorded" : "Release evidence pending",
      tone: releaseResult ? "good" : "info",
      detail: "WhatsApp or the parties keep the full conversation.",
    },
    {
      label: "Verification path",
      value: verifyResult?.verified ? "Available" : "Unavailable",
      tone: verifyResult?.verified ? "good" : "warn",
    },
    {
      label: "Link expiry",
      value: dateTimeLabel(verifyResult?.expires_at) || "Not shown",
      tone: verifyResult?.expires_at ? "info" : "warn",
    },
  ];
  const merchantSecurityItems: TrustDocumentPanelItem[] = [
    {
      title: "Signed merchant rail",
      detail: verifyResult?.verified
        ? "The public merchant rail signature was checked before evidence entry."
        : "This page has not confirmed a signed merchant rail yet.",
      tone: verifyResult?.verified ? "good" : "warn",
    },
    {
      title: "Reference fingerprint",
      detail:
        "This reference fingerprint is derived from visible merchant record fields; it is not a cryptographic hash.",
      tone: "info",
    },
    {
      title: "Minimal trade packet",
      detail: releaseResult
        ? "GSN recorded the final trade packet identifiers and evidence slots."
        : "GSN will record only the minimum final evidence after the release form is submitted.",
      tone: releaseResult ? "good" : "info",
    },
    {
      title: "Privacy boundary",
      detail:
        "The full WhatsApp conversation, unnecessary private chat, bank details, and unrelated personal information stay outside this paper.",
      tone: "good",
    },
    {
      title: "Release authority boundary",
      detail:
        "This record is not escrow, payout approval, bank confirmation, courier control, or automatic release authority.",
      tone: "warn",
    },
  ];
  const merchantConfirmsList = [
    "Signed merchant rail check result",
    "Visible Link ID and Pack ID when available",
    "Minimum trade packet fields after submission",
    "Evidence slots and release reference after recording",
    "Reader boundary for marketplace judgement",
  ];
  const merchantDoesNotConfirmList = [
    "Payment received or payout approved",
    "Escrow, bank movement, or credit approval",
    "Courier delivery, receipt, or product quality",
    "Full WhatsApp conversation or private party details",
    "Permission to release goods, credit, or money",
  ];

  async function submitRelease() {
    if (!canSubmit) {
      setNotice({
        tone: "error",
        text: "Enter the goods value first. Record only what you actually released.",
      });
      return;
    }

    const contextKey = merchantReleaseContextRef.current;
    const actionSeq = releaseActionSeqRef.current + 1;
    releaseActionSeqRef.current = actionSeq;
    releaseActionContextRef.current = contextKey;
    function isCurrentReleaseAction() {
      return (
        releaseActionSeqRef.current === actionSeq &&
        releaseActionContextRef.current === contextKey &&
        merchantReleaseContextRef.current === contextKey
      );
    }

    setSubmitting(true);
    try {
      const result = await recordMerchantRelease({
        token,
        goods_value: goodsValue,
        currency,
        merchant_note: merchantNote || "Merchant release evidence recorded from public GSN release desk.",
        trade_context: tradeContext,
        item_title: itemTitle,
        counterparty_label: counterpartyLabel,
        counterparty_whatsapp_label: counterpartyWhatsappLabel,
        product_evidence_note: productEvidenceNote,
        invoice_reference: invoiceReference,
        invoice_evidence_note: invoiceEvidenceNote,
        agreement_evidence_note: agreementEvidenceNote,
        courier_name: courierName,
        courier_contact_label: courierContactLabel,
        tracking_number: trackingNumber,
        released_to_courier_at: releasedToCourierAt,
        expected_delivery_date: expectedDeliveryDate,
        payment_schedule_note: paymentScheduleNote,
        receipt_status: receiptStatus,
      });
      if (!isCurrentReleaseAction()) return;
      setReleaseResult(result);
      setNotice({
        tone: "success",
        text: "Release evidence recorded. Keep the Link ID and Pack ID with your own sales record.",
      });
    } catch (error) {
      if (!isCurrentReleaseAction()) return;
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Release evidence could not be recorded.",
      });
    } finally {
      if (isCurrentReleaseAction()) setSubmitting(false);
    }
  }

  async function copyReceipt() {
    const text = releaseResult ? buildMerchantTradePacketPaper(releaseResult) : "";

    if (!text) {
      setNotice({ tone: "error", text: "Record release evidence first, then copy the receipt." });
      return;
    }

    const copied = await safeCopy(text);
    setNotice({
      tone: copied ? "success" : "error",
      text: copied ? "GSN trade packet paper copied." : "Copy did not complete. Select the packet text and copy it manually.",
    });
  }

  return (
    <main style={pageShell()}>
      <section style={paper()} aria-label="GSN Merchant Release evidence desk">
        <div style={watermark()}>GSN</div>

        <header style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>
          <div style={iconTile()}>
            <GsnLegacyIcon name="evidence" size={46} />
          </div>
          <div>
            <div style={sectionLabel()}>Global Support Network</div>
            <h1 style={{ margin: "6px 0 0", fontSize: 32, lineHeight: 1.06, color: "#07172C" }}>
              Merchant Release Evidence
            </h1>
            <p style={{ margin: "10px 0 0", ...helperText(), maxWidth: 620 }}>
              Record that goods were released after checking a signed GSN merchant rail. This is evidence
              for a trade conversation, not payment confirmation or automatic release authority.
            </p>
          </div>
        </header>

        <div style={{ position: "relative", zIndex: 1, marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={badge(Boolean(verifyResult?.verified))}>
            {checking ? "Checking link" : verifyResult?.verified ? "Signed rail checked" : "Not checked"}
          </span>
          <span style={badge(false)}>Evidence only</span>
          <span style={badge(false)}>No escrow</span>
          <span style={badge(false)}>No payout approval</span>
        </div>

        {notice ? (
          <div style={{ position: "relative", zIndex: 1, marginTop: 16, ...noticeStyle(notice.tone) }}>
            {notice.text}
          </div>
        ) : null}

        <div style={{ position: "relative", zIndex: 1, marginTop: 16, display: "grid", gap: 12 }}>
          <TrustDocumentConfidenceRibbon items={merchantConfidenceRibbonItems} />
          <div
            data-gsn-trust-document-certificate="merchant-release"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            <TrustDocumentSecurityPanel
              title="Merchant record security"
              items={merchantSecurityItems}
            />
            <div style={{ display: "grid", gap: 12 }}>
              <TrustDocumentBoundaryPanel
                title="This page confirms"
                tone="good"
                items={merchantConfirmsList}
              />
              <TrustDocumentBoundaryPanel
                title="This page does not confirm"
                tone="warn"
                items={merchantDoesNotConfirmList}
              />
            </div>
          </div>
          <TrustDocumentFingerprint
            label="Merchant release record fingerprint"
            value={merchantRecordFingerprint}
            detail="Reference fingerprint for this visible merchant release paper. It is not a cryptographic proof."
          />
        </div>

        <section
          style={{
            position: "relative",
            zIndex: 1,
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          <div style={factCard()}>
            <div style={sectionLabel()}>Link ID</div>
            <div style={{ marginTop: 6, fontWeight: 1000, color: "#07172C" }}>
              {verifyResult?.verification_link_id || "Not available"}
            </div>
          </div>
          <div style={factCard()}>
            <div style={sectionLabel()}>Pack ID</div>
            <div style={{ marginTop: 6, fontWeight: 1000, color: "#07172C" }}>
              {verifyResult?.pack_id || "Not shown"}
            </div>
          </div>
          <div style={factCard()}>
            <div style={sectionLabel()}>Expires</div>
            <div style={{ marginTop: 6, fontWeight: 1000, color: "#07172C" }}>
              {verifyResult?.expires_at ? new Date(verifyResult.expires_at).toLocaleString() : "Not shown"}
            </div>
          </div>
        </section>

        {!releaseResult ? (
          <section style={{ position: "relative", zIndex: 1, marginTop: 18, display: "grid", gap: 12 }}>
            <div>
              <div style={sectionLabel()}>Release note</div>
              <p style={{ margin: "6px 0 0", ...helperText() }}>
                Enter the minimum final evidence. WhatsApp can hold the conversation; GSN keeps the
                timestamped reference packet for judgement later.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={sectionLabel()}>Trade shape</span>
                <select
                  value={tradeContext}
                  onChange={(event) => setTradeContext(event.target.value)}
                  style={field()}
                >
                  <option value="gsn_external">GSN + outside GSN</option>
                  <option value="external_gsn">Outside GSN + GSN</option>
                  <option value="gsn_gsn">GSN + GSN</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={sectionLabel()}>Item / product</span>
                <input
                  value={itemTitle}
                  onChange={(event) => setItemTitle(event.target.value)}
                  placeholder="Solar charger"
                  style={field()}
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={sectionLabel()}>Other party</span>
                <input
                  value={counterpartyLabel}
                  onChange={(event) => setCounterpartyLabel(event.target.value)}
                  placeholder="Seller or buyer name/label"
                  style={field()}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={sectionLabel()}>WhatsApp label</span>
                <input
                  value={counterpartyWhatsappLabel}
                  onChange={(event) => setCounterpartyWhatsappLabel(event.target.value)}
                  placeholder="Saved contact or masked number"
                  style={field()}
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 110px", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={sectionLabel()}>Goods value</span>
                <input
                  value={goodsValue}
                  onChange={(event) => setGoodsValue(event.target.value)}
                  inputMode="decimal"
                  placeholder="140.00"
                  style={field()}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={sectionLabel()}>Currency</span>
                <input
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value.toUpperCase().slice(0, 8))}
                  placeholder="NGN"
                  style={field()}
                />
              </label>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={sectionLabel()}>Product evidence</span>
              <textarea
                value={productEvidenceNote}
                onChange={(event) => setProductEvidenceNote(event.target.value)}
                placeholder="Example: product photo or video screenshot kept from WhatsApp."
                rows={3}
                style={{ ...field(), minHeight: 86, resize: "none", lineHeight: 1.45 }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={sectionLabel()}>Invoice reference</span>
                <input
                  value={invoiceReference}
                  onChange={(event) => setInvoiceReference(event.target.value)}
                  placeholder="Invoice number or label"
                  style={field()}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={sectionLabel()}>Receipt state</span>
                <select
                  value={receiptStatus}
                  onChange={(event) => setReceiptStatus(event.target.value)}
                  style={field()}
                >
                  <option value="awaiting_delivery">Awaiting delivery</option>
                  <option value="received">Received</option>
                  <option value="not_received">Not received</option>
                  <option value="disputed">Disputed</option>
                </select>
              </label>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={sectionLabel()}>Invoice / agreement evidence</span>
              <textarea
                value={invoiceEvidenceNote}
                onChange={(event) => setInvoiceEvidenceNote(event.target.value)}
                placeholder="Example: invoice screenshot captured from WhatsApp."
                rows={3}
                style={{ ...field(), minHeight: 86, resize: "none", lineHeight: 1.45 }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={sectionLabel()}>Final agreement</span>
              <textarea
                value={agreementEvidenceNote}
                onChange={(event) => setAgreementEvidenceNote(event.target.value)}
                placeholder="Example: final WhatsApp screenshot says item is released to courier before scheduled payment."
                rows={3}
                style={{ ...field(), minHeight: 86, resize: "none", lineHeight: 1.45 }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={sectionLabel()}>Courier</span>
                <input
                  value={courierName}
                  onChange={(event) => setCourierName(event.target.value)}
                  placeholder="Courier or transport company"
                  style={field()}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={sectionLabel()}>Courier contact</span>
                <input
                  value={courierContactLabel}
                  onChange={(event) => setCourierContactLabel(event.target.value)}
                  placeholder="Saved contact or masked number"
                  style={field()}
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={sectionLabel()}>Tracking</span>
                <input
                  value={trackingNumber}
                  onChange={(event) => setTrackingNumber(event.target.value)}
                  placeholder="Tracking or waybill"
                  style={field()}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={sectionLabel()}>Courier handoff</span>
                <input
                  value={releasedToCourierAt}
                  onChange={(event) => setReleasedToCourierAt(event.target.value)}
                  placeholder="Date/time released"
                  style={field()}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={sectionLabel()}>Expected delivery</span>
                <input
                  value={expectedDeliveryDate}
                  onChange={(event) => setExpectedDeliveryDate(event.target.value)}
                  placeholder="Expected date"
                  style={field()}
                />
              </label>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={sectionLabel()}>Payment schedule</span>
              <textarea
                value={paymentScheduleNote}
                onChange={(event) => setPaymentScheduleNote(event.target.value)}
                placeholder="Example: payment to seller is scheduled after courier handoff evidence."
                rows={3}
                style={{ ...field(), minHeight: 86, resize: "none", lineHeight: 1.45 }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={sectionLabel()}>Merchant note</span>
              <textarea
                value={merchantNote}
                onChange={(event) => setMerchantNote(event.target.value)}
                placeholder="Short factual note. Do not include private chat that is not needed."
                rows={3}
                style={{ ...field(), minHeight: 86, resize: "none", lineHeight: 1.45 }}
              />
            </label>

            <PrimaryButton
              onClick={() => void submitRelease()}
              busy={submitting || checking}
              busyLabel={checking ? "Checking..." : "Recording..."}
              stableHeight={54}
              fullWidth
              debugId="merchant-release.record"
            >
              Record release evidence
            </PrimaryButton>
          </section>
        ) : (
          <section style={{ position: "relative", zIndex: 1, marginTop: 18, display: "grid", gap: 12 }}>
            <div style={noticeStyle("success")}>
              Release evidence is recorded under Link ID {releaseResult.verification_link_id || "not shown"} and
              Trade Packet ID {releaseResult.trade_packet_id || "not shown"}.
              This record is not bank confirmation, delivery guarantee, escrow, payout approval, or automatic release authority.
            </div>
            <div
              style={{
                borderRadius: 18,
                border: "1px solid rgba(214,226,239,0.9)",
                background: "#FFFFFF",
                padding: 14,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={sectionLabel()}>Minimum packet</div>
              {[
                ["Item", releaseResult.trade_packet?.item_title || "Not recorded"],
                ["Other party", releaseResult.trade_packet?.counterparty_label || "Not recorded"],
                ["Invoice", releaseResult.trade_packet?.invoice_reference || "Not recorded"],
                ["Courier", releaseResult.trade_packet?.courier_name || "Not recorded"],
                ["Tracking", releaseResult.trade_packet?.tracking_number || "Not recorded"],
                ["Expected delivery", releaseResult.trade_packet?.expected_delivery_date || "Not recorded"],
                ["Receipt state", releaseResult.trade_packet?.receipt_status || "Awaiting delivery"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px minmax(0, 1fr)",
                    gap: 8,
                    color: "#173750",
                    fontSize: 13,
                    fontWeight: 850,
                  }}
                >
                  <span style={{ color: "#52677C", textTransform: "uppercase", fontSize: 11 }}>{label}</span>
                  <span style={{ overflowWrap: "anywhere" }}>{value}</span>
                </div>
              ))}
            </div>
            <SecondaryButton
              onClick={() => void copyReceipt()}
              stableHeight={52}
              fullWidth
              debugId="merchant-release.copy-receipt"
            >
              Copy GSN packet paper
            </SecondaryButton>
          </section>
        )}

        <footer
          style={{
            position: "relative",
            zIndex: 1,
            marginTop: 18,
            paddingTop: 14,
            borderTop: "1px solid rgba(214,226,239,0.9)",
            ...helperText(),
            fontSize: 12.5,
          }}
        >
          GSN records the event as community-backed evidence only. The merchant still remains responsible
          for their own sales, payment, delivery, and release decision.
        </footer>
      </section>
    </main>
  );
}
