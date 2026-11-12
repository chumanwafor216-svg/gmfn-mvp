import React, { useEffect, useMemo, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import { StableButton } from "../components/StableButton";
import {
  getPipelineCreditPricingCatalogue,
  updatePipelineCreditAcquisitionPack,
  updatePipelineCreditCommercialControl,
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

type CommercialLifecycle =
  | "research"
  | "draft"
  | "shadow"
  | "pilot"
  | "enforced"
  | "suspended";

type AcquisitionLifecycle = CommercialLifecycle | "retired";

type ServicePrice = {
  service_code: string;
  service_label: string;
  connected: boolean;
  configured: boolean;
  version?: number | null;
  credit_cost?: string | null;
  duration_days?: number | null;
  unit_label?: string | null;
};

type PricingCatalogue = {
  commercial_control?: {
    lifecycle_status?: string | null;
    quotes_enabled?: boolean;
    spends_enabled?: boolean;
    version?: number | null;
    commercial_control_version?: number | null;
  } | null;
  commercial_control_version?: number | null;
  services?: ServicePrice[];
  acquisition_packs?: unknown;
  packs?: unknown;
};

const COMMERCIAL_STATUSES: Array<Exclude<CommercialLifecycle, "suspended">> = [
  "research",
  "draft",
  "shadow",
  "pilot",
  "enforced",
];

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
    whiteSpace: "nowrap",
  };
}

function rowsFrom<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
  return [];
}

function normalizeStatus(value: unknown): CommercialLifecycle {
  const status = String(value || "research").trim().toLowerCase();
  return ["research", "draft", "shadow", "pilot", "enforced", "suspended"].includes(status)
    ? (status as CommercialLifecycle)
    : "research";
}

function normalizeAcquisitionStatus(value: unknown): AcquisitionLifecycle {
  const status = String(value || "draft").trim().toLowerCase();
  return ["research", "draft", "shadow", "pilot", "enforced", "suspended", "retired"].includes(status)
    ? (status as AcquisitionLifecycle)
    : "draft";
}

export default function PipelineCreditPricingPage() {
  const [catalogue, setCatalogue] = useState<PricingCatalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<Exclude<CommercialLifecycle, "suspended">>("research");
  const [commercialNote, setCommercialNote] = useState("");
  const [selectedCode, setSelectedCode] = useState("vault.slot");
  const [creditCost, setCreditCost] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [unitLabel, setUnitLabel] = useState("block");
  const [profileCode, setProfileCode] = useState("");
  const [profileLabel, setProfileLabel] = useState("");
  const [countryCodes, setCountryCodes] = useState("");
  const [packCurrency, setPackCurrency] = useState("");
  const [packCode, setPackCode] = useState("");
  const [creditQuantity, setCreditQuantity] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [packStatus, setPackStatus] = useState<AcquisitionLifecycle>("draft");
  const [packNote, setPackNote] = useState("");

  function applyCatalogueResult(result: any) {
    const next = result?.catalogue || result;
    if (next?.services || next?.commercial_control || next?.acquisition_packs || next?.packs) {
      setCatalogue(next as PricingCatalogue);
      return;
    }
    setCatalogue((current) => ({ ...(current || {}), commercial_control: next }));
  }

  async function loadCatalogue() {
    setLoading(true);
    try {
      const result = await getPipelineCreditPricingCatalogue({
        region_code: "global",
        currency: "GBP",
      });
      setCatalogue(result || null);
      const control = result?.commercial_control || {};
      const currentStatus = normalizeStatus(control.lifecycle_status);
      setSelectedStatus(currentStatus === "suspended" ? "research" : currentStatus);
      setCommercialNote(String(control.decision_note || ""));
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
  const commercialControl = catalogue?.commercial_control || {};
  const currentStatus = normalizeStatus(commercialControl.lifecycle_status);
  const commercialVersion =
    commercialControl.version ??
    commercialControl.commercial_control_version ??
    catalogue?.commercial_control_version ??
    null;
  const latestPacks = rowsFrom<any>(catalogue?.acquisition_packs || catalogue?.packs);

  useEffect(() => {
    if (!selected) return;
    setSelectedCode(selected.service_code);
    setCreditCost(selected.credit_cost || "");
    setDurationDays(String(selected.duration_days || 1));
    setUnitLabel(selected.unit_label || "unit");
  }, [selected]);

  async function saveCommercialControl(status: CommercialLifecycle) {
    const note = commercialNote.trim();
    if (status === "enforced" && !note) {
      setNotice({ tone: "error", text: "Add a decision note before enabling Enforced status." });
      return;
    }
    setBusy("commercial");
    setNotice(null);
    try {
      const result = await updatePipelineCreditCommercialControl({
        lifecycle_status: status,
        decision_note: note || null,
      });
      applyCatalogueResult(result);
      setNotice({ tone: "success", text: `Commercial status saved as ${status}.` });
    } catch (error) {
      setNotice({ tone: "error", text: structuredErrorMessage(error, "Commercial status could not be saved.") });
    } finally {
      setBusy("");
    }
  }

  async function saveServicePrice() {
    if (!selected) return;
    if (!creditCost.trim()) {
      setNotice({ tone: "error", text: "Enter the direct Pipeline Credit cost for this service." });
      return;
    }
    setBusy("service");
    setNotice(null);
    try {
      const result = await updatePipelineCreditServicePrice(selected.service_code, {
        region_code: "global",
        pricing_mode: "fixed_credits",
        credit_cost: creditCost,
        duration_days: Math.max(1, Number(durationDays || 1)),
        unit_label: unitLabel.trim() || "unit",
      });
      applyCatalogueResult(result);
      setNotice({ tone: "success", text: `${selected.service_label} now has a new active price version.` });
    } catch (error) {
      setNotice({ tone: "error", text: structuredErrorMessage(error, "The service price could not be saved.") });
    } finally {
      setBusy("");
    }
  }

  async function saveAcquisitionPack() {
    const code = profileCode.trim();
    const label = profileLabel.trim();
    const countries = countryCodes.split(",").map((value) => value.trim().toUpperCase()).filter(Boolean);
    if (!code || !label || !countries.length || !packCurrency.trim() || !packCode.trim() || !creditQuantity.trim() || !cashAmount.trim()) {
      setNotice({ tone: "error", text: "Complete the acquisition pack profile, countries, currency, amounts and lifecycle status." });
      return;
    }
    setBusy("pack");
    setNotice(null);
    try {
      const result = await updatePipelineCreditAcquisitionPack(code, {
        profile_label: label,
        country_codes: countries,
        currency: packCurrency.trim().toUpperCase(),
        pack_code: packCode.trim(),
        credit_quantity: creditQuantity.trim(),
        cash_amount: cashAmount.trim(),
        lifecycle_status: packStatus,
        decision_note: packNote.trim() || null,
      });
      applyCatalogueResult(result);
      setNotice({ tone: "success", text: `${code} acquisition pack profile was versioned and saved.` });
    } catch (error) {
      setNotice({ tone: "error", text: structuredErrorMessage(error, "The acquisition pack could not be saved.") });
    } finally {
      setBusy("");
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: "18px 14px 48px", background: gmfnBrand.gradients.pageWash, boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gap: 16 }}>
        <PageTopNav
          sectionLabel="Command Centre"
          title="Pipeline Credit Pricing"
          subtitle="Control commercial readiness, global service debits and future acquisition profiles from one protected operator surface."
          homeTo="/app/command-center"
          homeLabel="Command Centre"
          backTo="/app/command-center"
          backLabel="Command Centre"
        />

        <section style={brandPageCard(gmfnBrand.gradients.hero)}>
          <div style={{ ...brandSectionLabel(), color: gmfnBrand.colors.gold }}>Protected operator control</div>
          <h1 style={{ margin: "10px 0 0", color: "#FFFFFF", fontSize: 30, lineHeight: 1.12 }}>One server-owned Pipeline Credit source</h1>
          <p style={{ margin: "12px 0 0", ...brandHelperText(), color: gmfnBrand.colors.darkMuted }}>
            The operator decides whether commerce is ready. Connected services use only the saved global debit price, while acquisition packs remain a future cash-to-credit definition. Checkout is not connected on this screen.
          </p>
        </section>

        {notice ? (
          <div role="status" style={{ ...brandInnerCard(notice.tone === "success" ? "#ECFDF5" : notice.tone === "info" ? "#EFF6FF" : "#FEF2F2"), color: notice.tone === "success" ? "#166534" : notice.tone === "info" ? "#1D4ED8" : "#991B1B", fontWeight: 850 }}>
            {notice.text}
          </div>
        ) : null}

        <section style={brandPageCard()}>
          <div style={brandSectionLabel()}>A · Commercial status</div>
          <h2 style={{ margin: "8px 0 0", color: gmfnBrand.colors.ink }}>Decide what Pipeline Credit commerce may do</h2>
          <p style={{ margin: "8px 0 0", ...brandHelperText() }}>
            Current lifecycle: <strong>{currentStatus}</strong>. Quotes: <strong>{commercialControl.quotes_enabled === true ? "enabled" : "disabled"}</strong>. Spends: <strong>{commercialControl.spends_enabled === true ? "enabled" : "disabled"}</strong>. Immutable control version: <strong>{commercialVersion ?? "not reported"}</strong>.
          </p>
          <div style={{ marginTop: 14, ...brandInnerCard("#F8FBFF"), display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, color: gmfnBrand.colors.inkSoft, fontWeight: 850 }}>
              Selected commercial lifecycle
              <select aria-label="Selected commercial lifecycle" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as Exclude<CommercialLifecycle, "suspended">)} style={fieldStyle()}>
                {COMMERCIAL_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6, color: gmfnBrand.colors.inkSoft, fontWeight: 850 }}>
              Commercial decision note
              <textarea aria-label="Commercial decision note" value={commercialNote} onChange={(event) => setCommercialNote(event.target.value)} rows={3} placeholder="Record why this lifecycle is appropriate." style={{ ...fieldStyle(), resize: "vertical" }} />
            </label>
            <StableButton kind="primary" busy={busy === "commercial"} busyLabel="Applying..." onClick={() => void saveCommercialControl(selectedStatus)} debugId="pipeline-credit-pricing.apply-commercial-status" fullWidth>
              Apply selected status
            </StableButton>
            <StableButton kind="danger" busy={busy === "commercial"} busyLabel="Suspending..." onClick={() => void saveCommercialControl("suspended")} debugId="pipeline-credit-pricing.suspend-commercial-status" fullWidth>
              Suspend now
            </StableButton>
          </div>
          <div style={{ marginTop: 12, ...brandHelperText(), fontSize: 13 }}>
            Shadow calculates non-spendable quotes. Pilot is non-spendable until named cohort support exists. Enforced permits connected service debits. Suspended blocks new quote and spend decisions.
          </div>
        </section>

        <section style={brandPageCard()}>
          <div style={brandSectionLabel()}>B · Global service costs</div>
          <h2 style={{ margin: "8px 0 0", color: gmfnBrand.colors.ink }}>Set one direct debit price worldwide</h2>
          <p style={{ margin: "8px 0 0", ...brandHelperText() }}>
            The same service debit applies worldwide. The connected badge describes the current integration state; Vault is the first connected lane. No GBP conversion or region-specific service cost is configured here.
          </p>
          {loading ? <div style={{ marginTop: 16, ...brandHelperText() }}>Loading the operator catalogue...</div> : (
            <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
              {services.map((service) => (
                <StableButton
                  key={service.service_code}
                  kind={selectedCode === service.service_code ? "primary" : "secondary"}
                  onClick={() => setSelectedCode(service.service_code)}
                  debugId={`pipeline-credit-pricing.select-service.${service.service_code}`}
                  style={{ ...brandSoftCard(selectedCode === service.service_code ? "#EEF6FF" : "#FFFFFF"), width: "100%", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center", textAlign: "left" }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", color: gmfnBrand.colors.ink, fontWeight: 900 }}>{service.service_label}</span>
                    <span style={{ display: "block", marginTop: 4, ...brandHelperText(), fontSize: 12.5 }}>{service.service_code} · {service.configured ? `${service.credit_cost} credits / ${service.unit_label}` : "Price vacant"}</span>
                  </span>
                  <span style={statusBadge(Boolean(service.connected))}>{service.connected ? "Connected" : "Not connected"}</span>
                </StableButton>
              ))}
            </div>
          )}
          {selected ? (
            <div style={{ marginTop: 16, ...brandInnerCard("#F8FBFF") }}>
              <div style={brandSectionLabel()}>Selected service</div>
              <h3 style={{ margin: "8px 0 0", color: gmfnBrand.colors.ink }}>{selected.service_label}</h3>
              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6, color: gmfnBrand.colors.inkSoft, fontWeight: 850 }}>
                  Direct Pipeline Credit cost
                  <input aria-label="Direct Pipeline Credit cost" inputMode="decimal" value={creditCost} onChange={(event) => setCreditCost(event.target.value)} placeholder="Example: 12" style={fieldStyle()} />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6, color: gmfnBrand.colors.inkSoft, fontWeight: 850 }}>
                    Duration days
                    <input aria-label="Service duration days" inputMode="numeric" value={durationDays} onChange={(event) => setDurationDays(event.target.value)} style={fieldStyle()} />
                  </label>
                  <label style={{ display: "grid", gap: 6, color: gmfnBrand.colors.inkSoft, fontWeight: 850 }}>
                    Unit label
                    <input aria-label="Service unit label" value={unitLabel} onChange={(event) => setUnitLabel(event.target.value)} style={fieldStyle()} />
                  </label>
                </div>
                <StableButton kind="primary" busy={busy === "service"} busyLabel="Saving..." onClick={saveServicePrice} debugId="pipeline-credit-pricing.save-service" fullWidth>
                  Save new price version
                </StableButton>
                <div style={{ ...brandHelperText(), fontSize: 12.5 }}>
                  {selected.configured ? `Active version ${selected.version ?? "not reported"}: ${selected.credit_cost} Pipeline Credits per ${selected.unit_label} for ${selected.duration_days} days.` : "This service is vacant. Users cannot receive a spendable quote until an operator saves the first version."}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section style={brandPageCard()}>
          <div style={brandSectionLabel()}>C · Country acquisition packs</div>
          <h2 style={{ margin: "8px 0 0", color: gmfnBrand.colors.ink }}>Define how credits may later be acquired</h2>
          <p style={{ margin: "8px 0 0", ...brandHelperText() }}>
            Packs affect how credits may later be acquired, not how a connected service debits credits. Checkout remains disconnected, so saving a pack does not make payment available.
          </p>
          <div style={{ marginTop: 14, ...brandInnerCard("#F8FBFF"), display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <label style={{ display: "grid", gap: 6, color: gmfnBrand.colors.inkSoft, fontWeight: 850 }}>Profile code<input aria-label="Acquisition pack profile code" value={profileCode} onChange={(event) => setProfileCode(event.target.value)} placeholder="Example: UK_STANDARD" style={fieldStyle()} /></label>
              <label style={{ display: "grid", gap: 6, color: gmfnBrand.colors.inkSoft, fontWeight: 850 }}>Profile label<input aria-label="Acquisition pack profile label" value={profileLabel} onChange={(event) => setProfileLabel(event.target.value)} placeholder="Example: Standard profile" style={fieldStyle()} /></label>
            </div>
            <label style={{ display: "grid", gap: 6, color: gmfnBrand.colors.inkSoft, fontWeight: 850 }}>Countries, comma-separated<input aria-label="Acquisition pack country codes" value={countryCodes} onChange={(event) => setCountryCodes(event.target.value)} placeholder="GB, NG" style={fieldStyle()} /></label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <label style={{ display: "grid", gap: 6, color: gmfnBrand.colors.inkSoft, fontWeight: 850 }}>Currency<input aria-label="Acquisition pack currency" value={packCurrency} onChange={(event) => setPackCurrency(event.target.value)} placeholder="GBP" style={fieldStyle()} /></label>
              <label style={{ display: "grid", gap: 6, color: gmfnBrand.colors.inkSoft, fontWeight: 850 }}>Pack code<input aria-label="Acquisition pack code" value={packCode} onChange={(event) => setPackCode(event.target.value)} placeholder="PACK-100" style={fieldStyle()} /></label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <label style={{ display: "grid", gap: 6, color: gmfnBrand.colors.inkSoft, fontWeight: 850 }}>Local cash amount<input aria-label="Acquisition pack local cash amount" inputMode="decimal" value={cashAmount} onChange={(event) => setCashAmount(event.target.value)} placeholder="100" style={fieldStyle()} /></label>
              <label style={{ display: "grid", gap: 6, color: gmfnBrand.colors.inkSoft, fontWeight: 850 }}>Credit quantity<input aria-label="Acquisition pack credit quantity" inputMode="decimal" value={creditQuantity} onChange={(event) => setCreditQuantity(event.target.value)} placeholder="100" style={fieldStyle()} /></label>
            </div>
            <label style={{ display: "grid", gap: 6, color: gmfnBrand.colors.inkSoft, fontWeight: 850 }}>Acquisition pack lifecycle status<select aria-label="Acquisition pack lifecycle status" value={packStatus} onChange={(event) => setPackStatus(event.target.value as AcquisitionLifecycle)} style={fieldStyle()}>{["research", "draft", "shadow", "pilot", "enforced", "suspended", "retired"].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label style={{ display: "grid", gap: 6, color: gmfnBrand.colors.inkSoft, fontWeight: 850 }}>Acquisition pack decision note<textarea aria-label="Acquisition pack decision note" value={packNote} onChange={(event) => setPackNote(event.target.value)} rows={3} placeholder="Record the reason for this pack version." style={{ ...fieldStyle(), resize: "vertical" }} /></label>
            <StableButton kind="primary" busy={busy === "pack"} busyLabel="Saving..." onClick={saveAcquisitionPack} debugId="pipeline-credit-pricing.save-acquisition-pack" fullWidth>
              Save acquisition pack version
            </StableButton>
          </div>
          <div style={{ marginTop: 14, ...brandSectionLabel() }}>Latest pack versions</div>
          {latestPacks.length ? (
            <div style={{ marginTop: 8, display: "grid", gap: 8 }}>{latestPacks.slice(0, 6).map((pack, index) => <div key={`${pack.profile_code || pack.pack_code || "pack"}-${pack.version || index}`} style={brandSoftCard("#FFFFFF")}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", color: gmfnBrand.colors.ink, fontWeight: 900 }}><span>{pack.profile_code || pack.pack_code || "Unnamed profile"}</span><span>{normalizeAcquisitionStatus(pack.lifecycle_status)} · v{pack.version ?? "?"}</span></div><div style={{ marginTop: 4, ...brandHelperText(), fontSize: 13 }}>{pack.profile_label || "No profile label"} · {pack.country_codes?.join?.(", ") || "Countries not reported"} · {pack.cash_amount || "—"} {pack.currency || ""} for {pack.credit_quantity || "—"} credits</div></div>)}</div>
          ) : <div style={{ marginTop: 8, ...brandHelperText() }}>No acquisition pack versions have been recorded yet.</div>}
        </section>
      </div>
    </div>
  );
}
