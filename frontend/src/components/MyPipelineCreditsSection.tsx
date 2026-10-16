import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  checkMyMemberCreditPurchase,
  confirmMyMemberCreditPurchase,
  createMyMemberCreditPurchaseQuote,
  getMyMemberCreditCatalogue,
  getMyMemberCredits,
  listMyMemberCreditPurchases,
  setMyMemberCreditServicePermission,
  type MemberCreditCatalogue,
  type MemberCreditPurchaseQuote,
  type MemberCreditPurchaseStatus,
  type MemberCreditSelf,
} from "../lib/api";
import {
  PrimaryButton,
  SecondaryButton,
  StableCtaLink,
  StableDisclosureSummary,
} from "./StableButton";

type Props = {
  isCompact: boolean;
  selectedCommunityId?: number | null;
};

function newAttemptKey(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  return `${prefix}-${random}`.slice(0, 128);
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/suspended|disabled/i.test(message)) {
    return "Pipeline Credit purchases and spending are paused for the free pilot.";
  }
  return message || "This information could not be loaded right now.";
}

function formatMinorAmount(amountMinor: number, currency: string): string {
  const safeCurrency = String(currency || "").trim().toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: safeCurrency,
    }).format(Number(amountMinor || 0) / 100);
  } catch {
    return `${safeCurrency} ${(Number(amountMinor || 0) / 100).toFixed(2)}`.trim();
  }
}

function formatWhen(value: string | null | undefined): string {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "Time unavailable";
  return parsed.toLocaleString();
}

function formatDuration(seconds: number): string {
  const hours = Math.max(0, Math.round(Number(seconds || 0) / 3600));
  if (hours > 0 && hours % 24 === 0) {
    const days = hours / 24;
    return `${days} ${days === 1 ? "day" : "days"} (${hours} elapsed hours)`;
  }
  return `${hours} elapsed ${hours === 1 ? "hour" : "hours"}`;
}

function workflowTarget(path: string, communityId?: number | null): string {
  const raw = String(path || "").trim();
  if (!raw.startsWith("/app/")) return "/app/my-gmfn-and-i";
  const parsed = new URL(raw, "https://local.gsn.invalid");
  if (communityId && Number.isFinite(communityId) && communityId > 0) {
    parsed.searchParams.set("community", String(communityId));
  }
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function checkoutTarget(raw: string | null | undefined): string {
  try {
    const parsed = new URL(String(raw || ""));
    return parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function statusLabel(status: string): string {
  const key = String(status || "").trim().toLowerCase();
  const labels: Record<string, string> = {
    awarded: "Credits awarded",
    verified_award_pending: "Payment verified; credit award pending",
    verification_exception: "Payment needs review",
    verification_pending: "Waiting for verified payment",
    awaiting_payment: "Waiting for payment",
  };
  return labels[key] || key.replace(/_/g, " ") || "Status unavailable";
}

const shellStyle: React.CSSProperties = {
  gridColumn: "1 / -1",
  borderRadius: 20,
  border: "1px solid rgba(214,170,69,0.30)",
  background: "linear-gradient(180deg, rgba(255,253,247,0.995) 0%, rgba(255,255,255,0.99) 100%)",
  boxShadow:
    "0 18px 38px rgba(7,20,36,0.11), 0 0 0 1px rgba(255,255,255,0.72), inset 0 1px 0 rgba(255,255,255,0.98)",
  overflow: "hidden",
};

const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid rgba(15,23,42,0.08)",
  background: "rgba(248,251,255,0.96)",
  padding: 12,
  minWidth: 0,
};

const labelStyle: React.CSSProperties = {
  color: "#64748B",
  fontSize: 10.5,
  fontWeight: 1000,
  letterSpacing: 0.55,
  textTransform: "uppercase",
};

const helperStyle: React.CSSProperties = {
  color: "#526174",
  fontSize: 12.5,
  fontWeight: 720,
  lineHeight: 1.45,
};

export default function MyPipelineCreditsSection({
  isCompact,
  selectedCommunityId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [account, setAccount] = useState<MemberCreditSelf | null>(null);
  const [catalogue, setCatalogue] = useState<MemberCreditCatalogue | null>(null);
  const [purchases, setPurchases] = useState<MemberCreditPurchaseStatus[]>([]);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [quote, setQuote] = useState<MemberCreditPurchaseQuote | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [checkingOrderKey, setCheckingOrderKey] = useState("");
  const [permissionBusyCode, setPermissionBusyCode] = useState("");
  const quoteAttemptRef = useRef("");
  const confirmAttemptRef = useRef("");

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    const [accountResult, catalogueResult, purchasesResult] = await Promise.allSettled([
      getMyMemberCredits(20),
      getMyMemberCreditCatalogue(),
      listMyMemberCreditPurchases(),
    ]);
    const failures: unknown[] = [];
    if (accountResult.status === "fulfilled") setAccount(accountResult.value);
    else failures.push(accountResult.reason);
    if (catalogueResult.status === "fulfilled") {
      setCatalogue(catalogueResult.value);
      setSelectedPackId((current) => {
        if (current && catalogueResult.value.packs.some((pack) => pack.pack_version_id === current)) {
          return current;
        }
        return catalogueResult.value.packs[0]?.pack_version_id ?? null;
      });
    } else {
      failures.push(catalogueResult.reason);
    }
    if (purchasesResult.status === "fulfilled") setPurchases(purchasesResult.value);
    else failures.push(purchasesResult.reason);
    setLoadError(failures.length ? safeError(failures[0]) : "");
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      await refresh(true);
      if (!active) return;
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  const selectedPack = useMemo(
    () => catalogue?.packs.find((pack) => pack.pack_version_id === selectedPackId) || null,
    [catalogue, selectedPackId]
  );

  const balanceText = loading
    ? "Loading balance"
    : account
      ? `${account.balance_units} ${account.balance_units === 1 ? "credit" : "credits"}`
      : "Balance unavailable";

  async function reviewPurchase() {
    if (!selectedPack || !catalogue?.purchase_operations_enabled) return;
    setActionError("");
    setQuoteBusy(true);
    if (!quoteAttemptRef.current) quoteAttemptRef.current = newAttemptKey("profile-credit-quote");
    try {
      const issued = await createMyMemberCreditPurchaseQuote(
        selectedPack.pack_version_id,
        quoteAttemptRef.current
      );
      setQuote(issued);
      confirmAttemptRef.current = "";
    } catch (error) {
      setActionError(safeError(error));
    } finally {
      setQuoteBusy(false);
    }
  }

  async function confirmPurchase() {
    if (!quote || !catalogue?.purchase_operations_enabled) return;
    setActionError("");
    setConfirmBusy(true);
    if (!confirmAttemptRef.current) {
      confirmAttemptRef.current = newAttemptKey(`profile-credit-confirm-${quote.quote_key}`);
    }
    try {
      const status = await confirmMyMemberCreditPurchase(
        quote.quote_key,
        confirmAttemptRef.current
      );
      setPurchases((rows) => [status, ...rows.filter((row) => row.order_key !== status.order_key)]);
      setQuote(null);
      quoteAttemptRef.current = "";
      const destination = checkoutTarget(status.collection_action_url);
      if (destination) {
        window.location.assign(destination);
      } else if (status.collection_action_url) {
        setActionError("The server did not return a secure Checkout destination.");
      } else {
        await refresh(true);
      }
    } catch (error) {
      setActionError(safeError(error));
    } finally {
      setConfirmBusy(false);
    }
  }

  async function togglePermission(serviceCode: string, enabled: boolean) {
    setActionError("");
    setPermissionBusyCode(serviceCode);
    try {
      const saved = await setMyMemberCreditServicePermission(serviceCode, enabled);
      setCatalogue((current) =>
        current
          ? {
              ...current,
              services: current.services.map((service) =>
                service.service_code === saved.service_code
                  ? { ...service, permission_enabled: saved.enabled }
                  : service
              ),
            }
          : current
      );
    } catch (error) {
      setActionError(safeError(error));
      await refresh(true);
    } finally {
      setPermissionBusyCode("");
    }
  }

  async function checkPayment(orderKey: string) {
    setActionError("");
    setCheckingOrderKey(orderKey);
    try {
      const status = await checkMyMemberCreditPurchase(orderKey);
      setPurchases((rows) =>
        rows.map((row) => (row.order_key === status.order_key ? status : row))
      );
      await refresh(true);
    } catch (error) {
      setActionError(safeError(error));
    } finally {
      setCheckingOrderKey("");
    }
  }

  return (
    <details
      data-my-pipeline-credits="true"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      style={shellStyle}
    >
      <StableDisclosureSummary
        debugId="my-gsn.pipeline-credits.toggle"
        stableHeight={58}
        aria-label={`My Pipeline Credits, ${balanceText}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: isCompact ? "10px 12px" : "12px 16px",
          color: "#07172C",
          background: "rgba(255,255,255,0.92)",
          fontWeight: 1000,
        }}
      >
        <span style={{ display: "grid", gap: 3, minWidth: 0 }}>
          <span style={{ fontSize: isCompact ? 14 : 16 }}>My Pipeline Credits</span>
          <span style={{ color: "#526174", fontSize: 12, fontWeight: 850 }}>{balanceText}</span>
        </span>
        <span aria-hidden="true" style={{ color: "#A06D08", fontSize: 20 }}>
          {open ? "−" : "+"}
        </span>
      </StableDisclosureSummary>

      <div style={{ padding: isCompact ? "0 12px 12px" : "0 16px 16px", display: "grid", gap: 12 }}>
        <div style={{ ...cardStyle, background: "linear-gradient(180deg, #071C31 0%, #082846 100%)", color: "#FFFFFF" }}>
          <div style={{ color: "#D8C17A", fontSize: 10.5, fontWeight: 1000, textTransform: "uppercase" }}>
            Personal balance
          </div>
          <div style={{ marginTop: 5, fontSize: 25, fontWeight: 1000 }}>{balanceText}</div>
          <div style={{ marginTop: 6, color: "#DCEBFA", fontSize: 12.5, lineHeight: 1.4, fontWeight: 750 }}>
            This is your personal service-credit balance. Community and provider-cost accounts are separate.
          </div>
        </div>

        {loadError ? (
          <div role="status" style={{ ...cardStyle, color: "#8A4B08", background: "#FFF8E7", ...helperStyle }}>
            {loadError}
          </div>
        ) : null}
        {actionError ? (
          <div role="alert" style={{ ...cardStyle, color: "#991B1B", background: "#FEF2F2", ...helperStyle }}>
            {actionError}
          </div>
        ) : null}

        <section aria-labelledby="pipeline-credit-purchase-heading" style={cardStyle}>
          <div id="pipeline-credit-purchase-heading" style={labelStyle}>Purchase credits</div>
          {!catalogue?.purchase_operations_enabled ? (
            <p style={{ margin: "7px 0 0", ...helperStyle }}>
              Credit purchases are paused for the free pilot. No payment link is available.
            </p>
          ) : catalogue.packs.length === 0 ? (
            <p style={{ margin: "7px 0 0", ...helperStyle }}>
              No credit pack is currently available from the server catalogue.
            </p>
          ) : (
            <div style={{ marginTop: 9, display: "grid", gap: 9 }}>
              <label style={{ display: "grid", gap: 5, color: "#07172C", fontSize: 12.5, fontWeight: 900 }}>
                Available pack
                <select
                  aria-label="Pipeline Credit pack"
                  value={selectedPackId ?? ""}
                  onChange={(event) => {
                    setSelectedPackId(Number(event.target.value));
                    setQuote(null);
                    quoteAttemptRef.current = "";
                    confirmAttemptRef.current = "";
                  }}
                  style={{ minHeight: 44, borderRadius: 12, border: "1px solid rgba(15,23,42,0.16)", padding: "8px 10px", background: "#FFFFFF", color: "#07172C", fontWeight: 850 }}
                >
                  {catalogue.packs.map((pack) => (
                    <option key={pack.pack_version_id} value={pack.pack_version_id}>
                      {pack.credit_units} credits — {formatMinorAmount(pack.amount_minor, pack.currency)}
                    </option>
                  ))}
                </select>
              </label>
              {quote ? (
                <div data-pipeline-credit-purchase-confirmation="true" style={{ ...cardStyle, background: "#FFFFFF" }}>
                  <div style={{ color: "#07172C", fontSize: 14, fontWeight: 1000 }}>Confirm this purchase</div>
                  <div style={{ marginTop: 7, ...helperStyle }}>
                    {quote.credit_units} credits for {formatMinorAmount(quote.amount_minor, quote.currency)}.
                    Your balance would be {Number(account?.balance_units || 0) + quote.credit_units} only after the server verifies payment and completes the award.
                  </div>
                  <div style={{ marginTop: 5, ...helperStyle }}>Quote expires {formatWhen(quote.expires_at)}.</div>
                  <PrimaryButton
                    type="button"
                    fullWidth
                    busy={confirmBusy}
                    busyLabel="Opening secure Checkout…"
                    debugId="my-gsn.pipeline-credits.confirm-purchase"
                    onClick={confirmPurchase}
                    style={{ marginTop: 9 }}
                  >
                    Confirm and continue to Checkout
                  </PrimaryButton>
                </div>
              ) : (
                <PrimaryButton
                  type="button"
                  fullWidth
                  busy={quoteBusy}
                  busyLabel="Getting server quote…"
                  disabled={!selectedPack}
                  debugId="my-gsn.pipeline-credits.review-purchase"
                  onClick={reviewPurchase}
                >
                  Review purchase
                </PrimaryButton>
              )}
            </div>
          )}
        </section>

        <section aria-labelledby="pipeline-credit-services-heading" style={cardStyle}>
          <div id="pipeline-credit-services-heading" style={labelStyle}>Services</div>
          <p style={{ margin: "7px 0 0", ...helperStyle }}>
            ON permits future personal-credit use for that service. It does not spend, reserve, activate or renew anything.
          </p>
          {catalogue?.services.length ? (
            <div style={{ marginTop: 10, display: "grid", gap: 9 }}>
              {catalogue.services.map((service) => (
                <div key={service.service_code} data-pipeline-credit-service={service.service_code} style={{ ...cardStyle, background: "#FFFFFF" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "center" }}>
                    <div style={{ minWidth: 0 }}>
                      <StableCtaLink
                        to={workflowTarget(service.workflow_url, selectedCommunityId)}
                        kind="secondary"
                        debugId={`my-gsn.pipeline-credits.service.${service.service_code}`}
                        style={{ minHeight: 36, justifyContent: "flex-start", padding: 0, color: "#0B63D1", fontWeight: 1000 }}
                      >
                        {service.service_name}
                      </StableCtaLink>
                      <div style={{ marginTop: 4, ...helperStyle }}>{service.scope}</div>
                    </div>
                    <SecondaryButton
                      type="button"
                      role="switch"
                      aria-checked={service.permission_enabled}
                      aria-label={`${service.service_name} personal Pipeline Credit permission ${service.permission_enabled ? "on" : "off"}`}
                      busy={permissionBusyCode === service.service_code}
                      disabled={Boolean(permissionBusyCode && permissionBusyCode !== service.service_code)}
                      debugId={`my-gsn.pipeline-credits.permission.${service.service_code}`}
                      onClick={() => togglePermission(service.service_code, !service.permission_enabled)}
                      style={{ minWidth: 62, minHeight: 42, borderRadius: 999 }}
                    >
                      {service.permission_enabled ? "ON" : "OFF"}
                    </SecondaryButton>
                  </div>
                  <div style={{ marginTop: 8, ...helperStyle }}>
                    Cost: {service.credit_cost} {service.credit_cost === 1 ? "credit" : "credits"} · {formatDuration(service.duration_seconds)} · Balance after purchase: {service.resulting_balance_units}
                  </div>
                  {!service.has_sufficient_balance ? (
                    <div style={{ marginTop: 5, color: "#8A4B08", fontSize: 12, fontWeight: 850 }}>
                      Current balance is insufficient for this paid service.
                    </div>
                  ) : null}
                  {!service.spending_enabled ? (
                    <div style={{ marginTop: 5, color: "#64748B", fontSize: 12, fontWeight: 800 }}>
                      Paid use is currently unavailable. Existing free actions remain separate.
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: "8px 0 0", ...helperStyle }}>
              No supported paid service is currently available from the server catalogue. Existing free actions are unchanged.
            </p>
          )}
        </section>

        <section aria-labelledby="pipeline-credit-activity-heading" style={cardStyle}>
          <div id="pipeline-credit-activity-heading" style={labelStyle}>Purchase and credit activity</div>
          {purchases.length === 0 && (account?.entries.length || 0) === 0 ? (
            <p style={{ margin: "7px 0 0", ...helperStyle }}>No personal Pipeline Credit activity is recorded yet.</p>
          ) : (
            <div style={{ marginTop: 9, display: "grid", gap: 8 }}>
              {purchases.slice(0, 3).map((purchase) => (
                <div key={purchase.order_key} style={{ ...cardStyle, background: "#FFFFFF" }}>
                  <div style={{ color: "#07172C", fontSize: 13, fontWeight: 1000 }}>{statusLabel(purchase.status)}</div>
                  <div style={{ marginTop: 4, ...helperStyle }}>
                    {purchase.credit_units} credits · {formatMinorAmount(purchase.amount_minor, purchase.currency)} · Reference {purchase.order_key}
                  </div>
                  {purchase.award_error ? <div style={{ marginTop: 5, color: "#991B1B", fontSize: 12, fontWeight: 850 }}>{purchase.award_error}</div> : null}
                  {catalogue?.purchase_operations_enabled && purchase.status !== "awarded" ? (
                    <SecondaryButton
                      type="button"
                      busy={checkingOrderKey === purchase.order_key}
                      disabled={Boolean(checkingOrderKey && checkingOrderKey !== purchase.order_key)}
                      debugId={`my-gsn.pipeline-credits.check.${purchase.order_key}`}
                      onClick={() => checkPayment(purchase.order_key)}
                      style={{ marginTop: 8, minHeight: 40, fontSize: 12 }}
                    >
                      Check verified payment
                    </SecondaryButton>
                  ) : null}
                </div>
              ))}
              {account?.entries.slice(0, 4).map((entry) => (
                <div key={entry.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 2px", borderTop: "1px solid rgba(15,23,42,0.07)" }}>
                  <span style={{ ...helperStyle, minWidth: 0 }}>{entry.entry_type.replace(/_/g, " ")} · {formatWhen(entry.created_at)}</span>
                  <strong style={{ color: entry.units_delta >= 0 ? "#166534" : "#991B1B", whiteSpace: "nowrap" }}>{entry.units_delta >= 0 ? "+" : ""}{entry.units_delta}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <SecondaryButton
          type="button"
          fullWidth
          busy={refreshing}
          busyLabel="Refreshing…"
          debugId="my-gsn.pipeline-credits.refresh"
          onClick={() => refresh(false)}
        >
          Refresh balance and status
        </SecondaryButton>
      </div>
    </details>
  );
}
