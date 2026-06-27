import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PrimaryButton, SecondaryButton } from "../components/StableButton";
import { GsnLegacyIcon } from "../components/GsnLegacyIcon";
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

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        setChecking(false);
        setNotice({ tone: "error", text: "This merchant release link is missing its verification token." });
        return;
      }

      setChecking(true);
      try {
        const result = await verifyMerchantPublic(token);
        if (cancelled) return;
        setVerifyResult(result);
        setNotice({
          tone: "success",
          text: "The signed GSN merchant rail was checked. Review the identifiers before recording release evidence.",
        });
      } catch (error) {
        if (cancelled) return;
        setNotice({
          tone: "error",
          text: error instanceof Error ? error.message : "This merchant release link could not be checked.",
        });
      } finally {
        if (!cancelled) setChecking(false);
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

  async function submitRelease() {
    if (!canSubmit) {
      setNotice({
        tone: "error",
        text: "Enter the goods value first. Record only what you actually released.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await recordMerchantRelease({
        token,
        goods_value: goodsValue,
        currency,
        merchant_note: merchantNote || "Merchant release evidence recorded from public GSN release desk.",
      });
      setReleaseResult(result);
      setNotice({
        tone: "success",
        text: "Release evidence recorded. Keep the Link ID and Pack ID with your own sales record.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Release evidence could not be recorded.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function copyReceipt() {
    const text = releaseResult
      ? [
          "GSN Merchant Release Evidence",
          `Link ID: ${releaseResult.verification_link_id || "Not shown"}`,
          `Pack ID: ${releaseResult.pack_id || "Not shown"}`,
          `Goods value: ${releaseResult.goods_value} ${releaseResult.currency}`,
          releaseResult.evidence_boundary,
        ].join("\n")
      : "";

    if (!text) {
      setNotice({ tone: "error", text: "Record release evidence first, then copy the receipt." });
      return;
    }

    const copied = await safeCopy(text);
    setNotice({
      tone: copied ? "success" : "error",
      text: copied ? "Release receipt copied." : "Copy did not complete. Select the receipt text and copy it manually.",
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
                Enter only the goods value and a short factual note. Do not include private information
                that is not needed for the evidence record.
              </p>
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
              <span style={sectionLabel()}>Merchant note</span>
              <textarea
                value={merchantNote}
                onChange={(event) => setMerchantNote(event.target.value)}
                placeholder="Goods released after checking the signed GSN evidence page."
                rows={4}
                style={{ ...field(), minHeight: 112, resize: "none", lineHeight: 1.45 }}
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
              Release evidence is recorded under Link ID {releaseResult.verification_link_id || "not shown"}.
              This record is not bank confirmation, delivery guarantee, escrow, payout approval, or automatic release authority.
            </div>
            <SecondaryButton
              onClick={() => void copyReceipt()}
              stableHeight={52}
              fullWidth
              debugId="merchant-release.copy-receipt"
            >
              Copy release receipt
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
