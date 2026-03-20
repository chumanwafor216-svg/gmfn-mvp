import React, { useEffect, useMemo, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import { getMyGuarantorEarnings } from "../lib/api";

function safeStr(x: any): string {
  return String(x ?? "");
}

function toNum(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(x: any): string {
  return toNum(x).toFixed(2);
}

function card(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function softCard(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    padding: 16,
  };
}

export default function GuarantorEarningsPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getMyGuarantorEarnings(100);
        setData(res || null);
      } catch (e: any) {
        setErr(String(e?.message || e || "Unable to load guarantor earnings."));
      }
    })();
  }, []);

  const items = Array.isArray(data?.items) ? data.items : [];
  const currency = safeStr(items?.[0]?.currency || "NGN");

  const totals = useMemo(() => {
    const total = items.reduce((sum: number, row: any) => sum + toNum(row?.share_amount), 0);
    const thisMonth = items
      .filter((row: any) => {
        const dt = safeStr(row?.created_at || row?.updated_at || "");
        if (!dt) return false;
        const d = new Date(dt);
        const now = new Date();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((sum: number, row: any) => sum + toNum(row?.share_amount), 0);

    const thisYear = items
      .filter((row: any) => {
        const dt = safeStr(row?.created_at || row?.updated_at || "");
        if (!dt) return false;
        const d = new Date(dt);
        const now = new Date();
        return d.getFullYear() === now.getFullYear();
      })
      .reduce((sum: number, row: any) => sum + toNum(row?.share_amount), 0);

    return { total, thisMonth, thisYear };
  }, [items]);

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }}>
      <PageTopNav
        title="Guarantor Earnings"
        subtitle="See what you have earned by supporting successful community loans."
      />

      {err ? (
        <div
          style={{
            ...card("#FEF2F2"),
            marginTop: 18,
            border: "1px solid #FECACA",
            color: "#991B1B",
            fontWeight: 900,
          }}
        >
          {err}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 18,
        }}
      >
        <div style={card()}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>TOTAL EARNED</div>
          <div style={{ marginTop: 8, fontWeight: 1000, fontSize: 28, color: "#0B1F33" }}>
            {fmtMoney(totals.total)} {currency}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>THIS MONTH</div>
          <div style={{ marginTop: 8, fontWeight: 1000, fontSize: 28, color: "#0B1F33" }}>
            {fmtMoney(totals.thisMonth)} {currency}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>THIS YEAR</div>
          <div style={{ marginTop: 8, fontWeight: 1000, fontSize: 28, color: "#0B1F33" }}>
            {fmtMoney(totals.thisYear)} {currency}
          </div>
        </div>
      </div>

      <div style={{ ...card("#F8FBFF"), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          Why this matters
        </div>
        <div style={{ marginTop: 10, color: "#475569", lineHeight: 1.8 }}>
          Supporting responsible borrowers can create real value for you over time. The system should help you see that your support is not invisible.
        </div>
      </div>

      <div
        style={{
          ...card("#FFFDF5"),
          marginTop: 18,
          border: "1px solid rgba(214,175,71,0.25)",
        }}
      >
        <div style={{ fontWeight: 1000, color: "#92400E" }}>
          Encouragement
        </div>
        <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.8 }}>
          As your guarantor earnings grow, GMFN should remind you that standing behind responsible people also creates value and reputation for you.
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>Recent Earnings</div>

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {items.length === 0 ? (
            <div style={{ color: "#7A8D9F" }}>No guarantor earnings found yet.</div>
          ) : null}

          {items.map((g: any, idx: number) => (
            <div key={g?.loan_guarantor_id || idx} style={softCard()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 17 }}>
                    Loan #{safeStr(g?.loan_id || "—")}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 14, color: "#64748b" }}>
                    Contribution weight: {safeStr(g?.weight_amount || "0")} {safeStr(g?.currency || currency)}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 14, color: "#64748b" }}>
                    Status: {safeStr(g?.status || "—")}
                  </div>
                </div>

                <div style={{ textAlign: "right", minWidth: 120 }}>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>EARNED</div>
                  <div style={{ marginTop: 6, fontWeight: 1000, fontSize: 18, color: "#065F46" }}>
                    {safeStr(g?.share_amount || "0")} {safeStr(g?.currency || currency)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}