import React, { useEffect, useMemo, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import { StableButton } from "../components/StableButton";
import {
  getPipelineCreditPricingCatalogue,
  updatePipelineCreditPricingPolicy,
  updatePipelineCreditServicePrice,
} from "../lib/api";
import { structuredErrorMessage } from "../lib/structuredErrors";
import {
  brandHelperText,
  brandInnerCard,
  brandPageCard,
  brandSectionLabel,
  brandSoftCard,
  gmfnBrand,
} from "../styles/gmfnBrand";

type ServicePrice = {
  service_code: string;
  service_label: string;
  connected: boolean;
  configured: boolean;
  version?: number | null;
  pricing_mode?: "fixed_credits" | "conversion" | null;
  credit_cost?: string | null;
  cash_reference_amount?: string | null;
  cash_reference_currency?: string | null;
  duration_days: number;
  unit_label: string;
};

type PricingCatalogue = {
  pricing_policy?: {
    version: number;
    credits_per_currency_unit: string;
    currency: string;
  } | null;
  services?: ServicePrice[];
};

function fieldStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 48,
    borderRadius: 14,
    border: `1px solid ${gmfnBrand.colors.lineStrong}`,
    background: "#FFFFFF",
    color: gmfnBrand.colors.ink,
    padding: "10px 12px",
    fontSize: 16,
    fontWeight: 800,
    boxSizing: "border-box",
  };
}

function statusBadge(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "6px 10px",
    color: active ? "#166534" : "#7C2D12",
    background: active ? "#DCFCE7" : "#FFEDD5",
    fontSize: 12,
    fontWeight: 900,
  };
}

export default function PipelineCreditPricingPage() {
  const [catalogue, setCatalogue] = useState<PricingCatalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [conversionRate, setConversionRate] = useState("");
  const [selectedCode, setSelectedCode] = useState("vault.slot");
  const [pricingMode, setPricingMode] = useState<"fixed_credits" | "conversion">("fixed_credits");
  const [creditCost, setCreditCost] = useState("");
  const [cashReference, setCashReference] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [unitLabel, setUnitLabel] = useState("block");

  async function loadCatalogue() {
    setLoading(true);
    try {
      const result = await getPipelineCreditPricingCatalogue({
        region_code: "global",
        currency: "GBP",
      });
      setCatalogue(result || null);
      setConversionRate(String(result?.pricing_policy?.credits_per_currency_unit || ""));
    } catch (error) {
      setNotice({ tone: "error", text: structuredErrorMessage(error, "Pricing catalogue could not be loaded.") });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCatalogue();
  }, []);

  const services = useMemo(() => catalogue?.services || [], [catalogue]);
  const selected = useMemo(
    () => services.find((service) => service.service_code === selectedCode) || services[0] || null,
    [selectedCode, services]
  );

  useEffect(() => {
    if (!selected) return;
    setSelectedCode(selected.service_code);
    setPricingMode(selected.pricing_mode || "fixed_credits");
    setCreditCost(selected.credit_cost || "");
    setCashReference(selected.cash_reference_amount || "");
    setDurationDays(String(selected.duration_days || 1));
    setUnitLabel(selected.unit_label || "unit");
  }, [selected]);

  async function saveConversion() {
    if (!conversionRate.trim()) {
      setNotice({ tone: "error", text: "Enter the number of Pipeline Credits issued for GBP 1." });
      return;
    }
    setBusy("conversion");
    setNotice(null);
    try {
      const result = await updatePipelineCreditPricingPolicy({
        region_code: "global",
        currency: "GBP",
        credits_per_currency_unit: conversionRate,
      });
      setCatalogue(result || null);
      setConversionRate(String(result?.pricing_policy?.credits_per_currency_unit || conversionRate));
      setNotice({ tone: "success", text: "The global GBP conversion was versioned and saved." });
    } catch (error) {
      setNotice({ tone: "error", text: structuredErrorMessage(error, "The conversion could not be saved.") });
    } finally {
      setBusy("");
    }
  }

  async function saveServicePrice() {
    if (!selected) return;
    if (pricingMode === "fixed_credits" && !creditCost.trim()) {
      setNotice({ tone: "error", text: "Enter the direct Pipeline Credit cost for this service." });
      return;
    }
    if (pricingMode === "conversion" && !cashReference.trim()) {
      setNotice({ tone: "error", text: "Enter the GBP reference amount used with the active conversion." });
      return;
    }
    setBusy("service");
    setNotice(null);
    try {
      const result = await updatePipelineCreditServicePrice(selected.service_code, {
        region_code: "global",
        pricing_mode: pricingMode,
        credit_cost: pricingMode === "fixed_credits" ? creditCost : null,
        cash_reference_amount: pricingMode === "conversion" ? cashReference : null,
        cash_reference_currency: "GBP",
        duration_days: Math.max(1, Number(durationDays || 1)),
        unit_label: unitLabel,
      });
      setCatalogue(result || null);
      setNotice({
        tone: "success",
        text: `${selected.service_label} now has a new active price version. Historical quotes were not changed.`,
      });
    } catch (error) {
      setNotice({ tone: "error", text: structuredErrorMessage(error, "The service price could not be saved.") });
    } finally {
      setBusy("");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "18px 14px 48px",
        background: gmfnBrand.gradients.pageWash,
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gap: 16 }}>
        <PageTopNav
          sectionLabel="Command Centre"
          title="Pipeline Credit Pricing"
          subtitle="Set the conversion and versioned service prices used by every connected GSN purchase flow."
          homeTo="/app/command-center"
          homeLabel="Command Centre"
          backTo="/app/command-center"
          backLabel="Command Centre"
        />

        <section style={brandPageCard(gmfnBrand.gradients.hero)}>
          <div style={{ ...brandSectionLabel(), color: gmfnBrand.colors.gold }}>Protected operator control</div>
          <h1 style={{ margin: "10px 0 0", color: "#FFFFFF", fontSize: 30, lineHeight: 1.12 }}>
            One server-owned price source
          </h1>
          <p style={{ margin: "12px 0 0", ...brandHelperText(), color: gmfnBrand.colors.darkMuted }}>
            User screens request a service code and quantity. They never decide the amount. Every saved change creates a new version and leaves accepted quotes and completed spends untouched.
          </p>
        </section>

        {notice ? (
          <div
            role="status"
            style={{
              ...brandInnerCard(notice.tone === "success" ? "#ECFDF5" : "#FEF2F2"),
              color: notice.tone === "success" ? "#166534" : "#991B1B",
              fontWeight: 850,
            }}
          >
            {notice.text}
          </div>
        ) : null}

        <section style={brandPageCard()}>
          <div style={brandSectionLabel()}>Global conversion</div>
          <h2 style={{ margin: "8px 0 0", color: gmfnBrand.colors.ink }}>GBP 1 equals how many Pipeline Credits?</h2>
          <p style={{ margin: "8px 0 0", ...brandHelperText() }}>
            Leave it blank until the operator decides. Changing this automatically versions every service using conversion-derived pricing; direct credit overrides stay fixed.
          </p>
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10 }}>
            <input
              inputMode="decimal"
              value={conversionRate}
              onChange={(event) => setConversionRate(event.target.value)}
              placeholder="Example: 5"
              aria-label="Pipeline Credits per GBP 1"
              style={fieldStyle()}
            />
            <StableButton
              kind="primary"
              busy={busy === "conversion"}
              busyLabel="Saving..."
              onClick={saveConversion}
              debugId="pipeline-credit-pricing.save-conversion"
            >
              Save conversion
            </StableButton>
          </div>
          <div style={{ marginTop: 10, ...brandHelperText(), fontSize: 13 }}>
            {catalogue?.pricing_policy
              ? `Active version ${catalogue.pricing_policy.version}: GBP 1 = ${catalogue.pricing_policy.credits_per_currency_unit} Pipeline Credits.`
              : "No conversion has been configured. No conversion-derived service can be priced."}
          </div>
        </section>

        <section style={brandPageCard()}>
          <div style={brandSectionLabel()}>Service catalogue</div>
          <h2 style={{ margin: "8px 0 0", color: gmfnBrand.colors.ink }}>Choose one service to price</h2>
          <p style={{ margin: "8px 0 0", ...brandHelperText() }}>
            A configured price does not claim delivery is connected. Vault is the first complete debit-and-delivery lane.
          </p>

          {loading ? (
            <div style={{ marginTop: 16, ...brandHelperText() }}>Loading the operator catalogue...</div>
          ) : (
            <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
              {services.map((service) => (
                <button
                  key={service.service_code}
                  type="button"
                  onClick={() => setSelectedCode(service.service_code)}
                  style={{
                    ...brandSoftCard(selectedCode === service.service_code ? "#EEF6FF" : "#FFFFFF"),
                    width: "100%",
                    display: "grid",
                    gridTemplateColumns: "minmax(0,1fr) auto",
                    gap: 10,
                    alignItems: "center",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", color: gmfnBrand.colors.ink, fontWeight: 900 }}>
                      {service.service_label}
                    </span>
                    <span style={{ display: "block", marginTop: 4, ...brandHelperText(), fontSize: 12.5 }}>
                      {service.service_code} · {service.configured ? `${service.credit_cost} credits / ${service.unit_label}` : "Price vacant"}
                    </span>
                  </span>
                  <span style={statusBadge(service.connected)}>{service.connected ? "Connected" : "Not connected"}</span>
                </button>
              ))}
            </div>
          )}

          {selected ? (
            <div style={{ marginTop: 16, ...brandInnerCard("#F8FBFF") }}>
              <div style={brandSectionLabel()}>Selected service</div>
              <h3 style={{ margin: "8px 0 0", color: gmfnBrand.colors.ink }}>{selected.service_label}</h3>
              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6, color: gmfnBrand.colors.inkSoft, fontWeight: 850 }}>
                  Pricing mode
                  <select value={pricingMode} onChange={(event) => setPricingMode(event.target.value as "fixed_credits" | "conversion")} style={fieldStyle()}>
                    <option value="fixed_credits">Direct Pipeline Credit cost</option>
                    <option value="conversion">GBP reference × active conversion</option>
                  </select>
                </label>

                {pricingMode === "fixed_credits" ? (
                  <label style={{ display: "grid", gap: 6, color: gmfnBrand.colors.inkSoft, fontWeight: 850 }}>
                    Credits per {unitLabel || selected.unit_label}
                    <input inputMode="decimal" value={creditCost} onChange={(event) => setCreditCost(event.target.value)} placeholder="Leave vacant until decided" style={fieldStyle()} />
                  </label>
                ) : (
                  <label style={{ display: "grid", gap: 6, color: gmfnBrand.colors.inkSoft, fontWeight: 850 }}>
                    GBP reference per {unitLabel || selected.unit_label}
                    <input inputMode="decimal" value={cashReference} onChange={(event) => setCashReference(event.target.value)} placeholder="Example: 5" style={fieldStyle()} />
                  </label>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6, color: gmfnBrand.colors.inkSoft, fontWeight: 850 }}>
                    Duration days
                    <input inputMode="numeric" value={durationDays} onChange={(event) => setDurationDays(event.target.value)} style={fieldStyle()} />
                  </label>
                  <label style={{ display: "grid", gap: 6, color: gmfnBrand.colors.inkSoft, fontWeight: 850 }}>
                    Unit label
                    <input value={unitLabel} onChange={(event) => setUnitLabel(event.target.value)} style={fieldStyle()} />
                  </label>
                </div>

                <StableButton
                  kind="primary"
                  busy={busy === "service"}
                  busyLabel="Saving..."
                  onClick={saveServicePrice}
                  debugId="pipeline-credit-pricing.save-service"
                  fullWidth
                >
                  Save new price version
                </StableButton>
                <div style={{ ...brandHelperText(), fontSize: 12.5 }}>
                  {selected.configured
                    ? `Active version ${selected.version}: ${selected.credit_cost} Pipeline Credits per ${selected.unit_label} for ${selected.duration_days} days.`
                    : "This service is vacant. Users cannot receive a spendable quote until an operator saves the first version."}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
