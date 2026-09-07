import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useParams } from "react-router-dom";
import { GsnRealisticIcon } from "../components/GsnRealisticIcon";
import PageTopNav from "../components/PageTopNav";
import { StableButton } from "../components/StableButton";
import { getPublicCommunityDomainCollectionInstruction } from "../lib/api";

function safeText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function titleCase(value: unknown, fallback = "Collection"): string {
  const text = safeText(value, fallback).replace(/_/g, " ");
  return text.replace(/\b\w/g, (match) => match.toUpperCase());
}

function errorMessage(error: any): string {
  const detail = error?.detail;
  const message = safeText(detail?.message || error?.message || error);
  return message || "GSN could not load this collection QR link.";
}

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #061827 0%, #0A2237 42%, #F5F0E6 42%, #F5F0E6 100%)",
    color: "#091B2E",
  };
}

function pageInner(): React.CSSProperties {
  return {
    maxWidth: 860,
    margin: "0 auto",
    padding: "20px 16px 44px",
    display: "grid",
    gap: 16,
  };
}

function card(): React.CSSProperties {
  return {
    borderRadius: 24,
    background: "#FFFFFF",
    border: "1px solid rgba(9,27,46,0.12)",
    boxShadow: "0 22px 60px rgba(2,14,24,0.18)",
    padding: 18,
    display: "grid",
    gap: 14,
  };
}

function softCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    background: "#F8FBFF",
    border: "1px solid rgba(9,27,46,0.1)",
    padding: 14,
    display: "grid",
    gap: 8,
  };
}

function helper(): React.CSSProperties {
  return {
    color: "rgba(9,27,46,0.68)",
    fontSize: 14,
    lineHeight: 1.45,
  };
}

function label(): React.CSSProperties {
  return {
    color: "#A67C00",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function badge(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 900,
    color: "#155A32",
    background: "#EAF8EF",
    border: "1px solid rgba(9,27,46,0.08)",
  };
}

export default function CommunityCollectionPage() {
  const { publicCode } = useParams();
  const code = safeText(publicCode);
  const [record, setRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!code) {
        setLoading(false);
        setMessage("This collection link is missing its QR code.");
        return;
      }
      setLoading(true);
      setMessage("");
      try {
        const payload = await getPublicCommunityDomainCollectionInstruction(code);
        if (!cancelled) setRecord(payload?.collection_instruction || null);
      } catch (error: any) {
        if (!cancelled) setMessage(errorMessage(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const pageUrl = useMemo(() => {
    if (typeof window === "undefined") return record?.public_path || "";
    return window.location.href;
  }, [record?.public_path]);

  const domainName = safeText(
    record?.community_domain?.display_name,
    safeText(record?.community_domain_name, "This community")
  );
  const purpose = safeText(record?.purpose_label, "Collection");
  const externalPaymentUrl = safeText(record?.external_payment_url);

  async function copyLink() {
    if (!pageUrl || typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main style={pageShell()} data-debug-id="community-collection.public-page">
      <PageTopNav
        sectionLabel="Public collection"
        title="GSN collection QR"
        subtitle="Governed payment instruction"
      />
      <section style={pageInner()}>
        <div style={{ color: "#F8FBFF", display: "grid", gap: 8, padding: "8px 2px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <GsnRealisticIcon name="finance-wallet-card" size={46} decorative />
            <div>
              <div style={{ ...label(), color: "#F3C85B" }}>GSN Collection QR</div>
              <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.08, letterSpacing: 0 }}>
                {loading ? "Loading collection" : purpose}
              </h1>
            </div>
          </div>
          <p style={{ margin: 0, maxWidth: 680, color: "rgba(248,251,255,0.78)", lineHeight: 1.55 }}>
            Scan-confirmed giving instruction for {domainName}. The receiving account remains controlled by the community, not GSN.
          </p>
        </div>

        <section style={card()}>
          {loading ? (
            <div style={softCard()}>Loading this governed collection instruction.</div>
          ) : message ? (
            <div style={{ ...softCard(), background: "#FFF4D6", color: "#6B4A00" }}>{message}</div>
          ) : record ? (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={label()}>{domainName}</div>
                  <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.12, letterSpacing: 0 }}>{purpose}</h2>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge()}>{titleCase(record.collection_type, "Offering")}</span>
                    <span style={badge()}>{titleCase(record.collection_mode, "Standing")}</span>
                    {safeText(record.amount_label) ? <span style={badge()}>{record.amount_label}</span> : null}
                    {safeText(record.currency) ? <span style={badge()}>{record.currency}</span> : null}
                  </div>
                </div>
                <div style={{ borderRadius: 18, background: "#FFFFFF", border: "1px solid rgba(9,27,46,0.12)", padding: 10 }}>
                  <QRCodeSVG value={pageUrl || code} size={128} bgColor="#FFFFFF" fgColor="#07172C" level="M" marginSize={1} />
                </div>
              </div>

              <div style={softCard()}>
                <div style={label()}>Payment Path</div>
                <p style={{ ...helper(), margin: 0 }}>
                  {externalPaymentUrl
                    ? "Open the approved external payment page below. GSN records that this QR instruction was published; it does not confirm the transfer."
                    : "No external payment page is attached to this QR yet. Ask the community finance lead for the approved transfer path before sending money."}
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {externalPaymentUrl ? (
                    <StableButton
                      kind="primary"
                      debugId="community-collection.open-payment-page"
                      onClick={() => window.location.assign(externalPaymentUrl)}
                    >
                      Open Payment Page
                    </StableButton>
                  ) : null}
                  <StableButton
                    kind="secondary"
                    debugId="community-collection.copy-link"
                    onClick={copyLink}
                  >
                    {copied ? "Copied" : "Copy QR Link"}
                  </StableButton>
                </div>
              </div>

              <div style={{ ...softCard(), background: "#F5F0E6" }}>
                <div style={label()}>Boundary</div>
                <p style={{ ...helper(), margin: 0 }}>
                  {safeText(record.boundary, "GSN shows a governed collection instruction only. GSN does not hold this money, confirm payment, expose church bank details, guarantee settlement, or prove impact.")}
                </p>
              </div>
            </>
          ) : (
            <div style={softCard()}>GSN could not find this collection instruction.</div>
          )}
        </section>
      </section>
    </main>
  );
}
