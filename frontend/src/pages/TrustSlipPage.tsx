// src/pages/TrustSlipPage.tsx
import React, { useEffect, useMemo, useState } from "react";

import {
  getMyTrustSlip,
  getMyMerchantView,
  setMyMerchantView,
  getMerchantLink,
  postMerchantRelease,
  downloadMyTrustSlipEvidencePdf,
  getEvidencePackMeta,
  downloadEvidencePackZip,
  safeCopy,
  extractMerchantToken,
} from "../lib/api";

import RevenuePanel from "../components/RevenuePanel";
import ShareActions from "../components/ShareActions";
import PilotRiskDisclosureGate from "../components/PilotRiskDisclosureGate";
import { Alert, Button, ButtonPrimary, Card, PageHeader, Pill, Field } from "../components/uiKit";
import { safeStr, fmtMoney } from "../ui/format";

type MerchantLevel = "minimal" | "standard" | "detailed";

type TrustSlipSummary = {
  user_id: number;
  trust_slip_limit?: string | null;
  trust_limit?: string | null;
  currency?: string | null;
  status?: string | null;
  last_full_repayment_at?: string | null;
  last_release_at?: string | null;
  disclaimer?: string | null;
  code?: string | null;
};

type MerchantViewResp = { user_id: number; level: MerchantLevel; note?: string | null };

type PackMetaResp = {
  pack_id?: string;
  checksum?: string;
  based_on_event_at?: string | null;
  generated_at_utc?: string;
  protocol_version?: string | null;
  footer?: string | null;
};

function absUrl(pathOrUrl: string): string {
  const s = (pathOrUrl || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  const origin = window.location.origin;
  if (s.startsWith("/")) return origin + s;
  return origin + "/" + s;
}

export default function TrustSlipPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [summary, setSummary] = useState<TrustSlipSummary | null>(null);
  const [merchantView, setMerchantView] = useState<MerchantViewResp | null>(null);
  const [level, setLevel] = useState<MerchantLevel>("standard");

  const [merchantLink, setMerchantLink] = useState<string>("");
  const [packMeta, setPackMeta] = useState<PackMetaResp | null>(null);

  // merchant release (public)
  const [releaseTokenOrLink, setReleaseTokenOrLink] = useState("");
  const [goodsValue, setGoodsValue] = useState("100");
  const [currency, setCurrency] = useState("NGN");
  const [merchantNote, setMerchantNote] = useState("Released goods after verification (pilot evidence).");
  const [releaseMsg, setReleaseMsg] = useState("");

  const revAmount = useMemo(() => safeStr(summary?.trust_slip_limit ?? summary?.trust_limit ?? "0"), [summary]);
  const trustCurrency = useMemo(() => safeStr(summary?.currency || "NGN"), [summary]);

  const statusLabel = useMemo(() => safeStr(summary?.status || "active").toLowerCase(), [summary]);
  const statusKind = useMemo(() => {
    if (statusLabel.includes("active")) return "green";
    if (statusLabel.includes("blocked") || statusLabel.includes("invalid")) return "red";
    return "gray";
  }, [statusLabel]);

  const verifyUrl = useMemo(() => {
    // Prefer direct code if present
    const code = safeStr(summary?.code || "").trim();
    if (code) return `${window.location.origin}/t/${encodeURIComponent(code)}`;

    // Or derive token from merchant link if it contains verify path
    const tok = extractMerchantToken(merchantLink);
    if (tok) return `${window.location.origin}/t/${encodeURIComponent(tok)}`;
    return "";
  }, [summary, merchantLink]);

  const merchantWhatsAppText = useMemo(() => {
    const link = verifyUrl || absUrl(merchantLink);
    if (!link) return "";
    const limit = fmtMoney(revAmount);
    const cur = trustCurrency;
    return (
      `GMFN TrustSlip verification\n` +
      `Trust limit: ${limit} ${cur}\n\n` +
      `Verify here:\n${link}\n\n` +
      `Pilot disclaimer: GMFN MVP is non-custodial and does not auto-debit anyone.`
    );
  }, [verifyUrl, merchantLink, revAmount, trustCurrency]);

  async function loadAll() {
    setLoading(true);
    setErr(null);
    setReleaseMsg("");
    try {
      const [s, mv] = await Promise.all([getMyTrustSlip(), getMyMerchantView()]);
      setSummary(s);
      setMerchantView(mv);
      if (mv?.level) setLevel(mv.level);

      try {
        const pm = await getEvidencePackMeta();
        setPackMeta(pm);
      } catch {
        setPackMeta(null);
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
      setSummary(null);
      setMerchantView(null);
      setPackMeta(null);
    } finally {
      setLoading(false);
    }
  }

  async function saveVisibility() {
    setErr(null);
    try {
      const res: any = await setMyMerchantView(level);
      if (res?.ok === false) {
        throw new Error(res?.detail || "Visibility update not available in this build.");
      }
      setMerchantView(res);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function generateMerchantLinkNow() {
    setErr(null);
    try {
      const r = await getMerchantLink();
      const link = safeStr(r?.path || "");
      setMerchantLink(link);
      if (link) await safeCopy(absUrl(link));
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function downloadTrustSlipPdf() {
    setErr(null);
    try {
      const blob = await downloadMyTrustSlipEvidencePdf();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function downloadEvidenceZip() {
    setErr(null);
    try {
      const blob = await downloadEvidencePackZip();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function recordRelease() {
    setReleaseMsg("");
    setErr(null);
    try {
      const tok = extractMerchantToken(releaseTokenOrLink);
      if (!tok) throw new Error("Paste a verify link or token first.");
      await postMerchantRelease({
        token: tok,
        goods_value: safeStr(goodsValue).trim(),
        currency: safeStr(currency).trim() || "NGN",
        merchant_note: safeStr(merchantNote).trim(),
      });
      setReleaseMsg("Release recorded (pilot evidence).");
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PilotRiskDisclosureGate>
      <div style={{ padding: 18, maxWidth: 1100 }}>
        <PageHeader
          title="TrustSlip"
          subtitle="Buy with trust (pilot)."
          right={
            <Button onClick={loadAll} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          }
        />

        {err && <Alert kind="error">{err}</Alert>}

        {/* Summary */}
        <Card style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Trust limit</div>
              <div style={{ marginTop: 4, fontSize: 34, fontWeight: 1000 }}>
                {fmtMoney(revAmount)} <span style={{ fontSize: 16, color: "#64748b" }}>{trustCurrency}</span>
              </div>
            </div>
            <Pill kind={statusKind as any}>{statusLabel}</Pill>
          </div>

          <div style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>
            {safeStr(summary?.disclaimer) ||
              "Pilot disclaimer: GMFN MVP is non-custodial and does not auto-debit anyone. TrustSlip is not a bank guarantee."}
          </div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>Last full repayment</div>
              <div style={{ fontWeight: 900 }}>{safeStr(summary?.last_full_repayment_at || "—")}</div>
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>Last merchant release</div>
              <div style={{ fontWeight: 900 }}>{safeStr(summary?.last_release_at || "—")}</div>
            </div>
          </div>
        </Card>

        {/* Merchant visibility */}
        <Card style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 1000 }}>Merchant visibility</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>Choose what merchants see when verifying your TrustSlip.</div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
              >
                <option value="minimal">minimal</option>
                <option value="standard">standard</option>
                <option value="detailed">detailed</option>
              </select>
              <ButtonPrimary onClick={saveVisibility}>Save</ButtonPrimary>
            </div>
          </div>

          {merchantView?.note && <div style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>{merchantView.note}</div>}
        </Card>

        {/* Share with merchant (standardized: copy + whatsapp only) */}
        <Card style={{ marginTop: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 1000 }}>Share with Merchant</div>
          <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
            Works on low-end phones: WhatsApp the link, open it, screenshot VALID / NOT VALID.
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <ButtonPrimary onClick={generateMerchantLinkNow}>Generate link + copy</ButtonPrimary>
            {verifyUrl && <Button onClick={() => window.open(verifyUrl, "_blank", "noopener,noreferrer")}>Open verify page</Button>}
          </div>

          <div style={{ marginTop: 10, color: "#334155", fontSize: 12, wordBreak: "break-all" }}>
            {merchantLink ? absUrl(merchantLink) : "Generate merchant link first."}
          </div>

          {merchantLink ? (
            <div style={{ marginTop: 10 }}>
              <ShareActions
                title="GMFN TrustSlip verification"
                text={merchantWhatsAppText || "Open the link to verify. If valid, you may release goods. (Pilot evidence mode)"}
                url={absUrl(merchantLink)}
                copyLabel="Copy merchant link"
                whatsappLabel="WhatsApp merchant text"
                qrLabel="QR"
              />
            </div>
          ) : (
            <div style={{ marginTop: 10 }}>
              <Button onClick={() => safeCopy(merchantWhatsAppText)} disabled={!merchantWhatsAppText}>
                Copy WhatsApp text
              </Button>
            </div>
          )}
        </Card>

        {/* Evidence */}
        <Card style={{ marginTop: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 1000 }}>Evidence</div>
          <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>TrustSlip PDF + Evidence pack ZIP (pilot-friendly).</div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <ButtonPrimary onClick={downloadTrustSlipPdf}>Open TrustSlip PDF</ButtonPrimary>
            <Button onClick={downloadEvidenceZip}>Open Evidence pack ZIP</Button>
          </div>

          {packMeta && (
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>Pack ID</div>
                <div style={{ fontWeight: 900 }}>{safeStr(packMeta.pack_id || "—")}</div>
              </div>
              <div>
                <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>Protocol</div>
                <div style={{ fontWeight: 900 }}>{safeStr(packMeta.protocol_version || "—")}</div>
              </div>
            </div>
          )}
        </Card>

        {/* Revenue transparency */}
        <Card style={{ marginTop: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 1000 }}>Fees & Earnings (Transparent)</div>
          <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
            Shows how GMFN earns without interest (service commission only).
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, color: "#1e40af" }}>Pilot Service Fee: 3%</div>

            <RevenuePanel amount={revAmount} currency={trustCurrency} mode="pilot" />
          </div>
        </Card>

        {/* Merchant release logging (pilot evidence) */}
        <Card style={{ marginTop: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 1000 }}>Merchant release logging (pilot)</div>
          <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
            Non-custodial: recording a release does not mean money was processed by GMFN.
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
            <Field
              label="Verify link or token"
              value={releaseTokenOrLink}
              onChange={setReleaseTokenOrLink}
              placeholder="Paste verify link or token"
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Goods value" value={goodsValue} onChange={setGoodsValue} />
              <Field label="Currency" value={currency} onChange={setCurrency} />
            </div>

            <Field label="Note" value={merchantNote} onChange={setMerchantNote} />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <ButtonPrimary onClick={recordRelease}>Record release</ButtonPrimary>
              {releaseMsg && <Pill kind="green">{releaseMsg}</Pill>}
            </div>
          </div>
        </Card>
      </div>
    </PilotRiskDisclosureGate>
  );
}