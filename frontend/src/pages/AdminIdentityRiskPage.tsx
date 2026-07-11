import React, { useEffect, useMemo, useRef, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import { PrimaryButton, StableDisclosureSummary } from "../components/StableButton";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import {
  institutionalInnerCard,
  institutionalPageCard,
} from "../lib/institutionalSurface";
import {
  getAdminIdentityRisk,
  getAdminPhoneIdentityLineage,
  postAdminIdentityReconciliation,
  postAdminManualRecoveryReset,
} from "../lib/api";

function safeStr(x: any): string {
  return String(x ?? "");
}

function toNum(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function card(): React.CSSProperties {
  return {
    ...institutionalPageCard(),
    border: "1px solid rgba(20,52,83,0.24)",
    boxShadow:
      "0 30px 62px rgba(7,20,36,0.12), 0 8px 18px rgba(7,20,36,0.045), inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -14px 28px rgba(18,52,86,0.06)",
    padding: 22,
  };
}

function summaryToggle(): React.CSSProperties {
  return {
    fontWeight: 900,
    color: "#0B1F33",
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 14px",
    borderRadius: 14,
    border: "1px solid rgba(122,152,195,0.20)",
    background:
      "linear-gradient(180deg, #FFFFFF 0%, #EEF5FF 100%)",
    boxShadow: "0 14px 30px rgba(15,23,42,0.09)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4E6680",
    fontWeight: 1000,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.65,
  };
}

function labelWithIcon(icon: GsnIconName, label: React.ReactNode) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
      }}
    >
      <GsnLegacyIcon name={icon} size={18} />
      <span>{label}</span>
    </span>
  );
}

function sectionLabelWithIcon(icon: GsnIconName, label: React.ReactNode) {
  return (
    <span
      style={{
        ...sectionLabel(),
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 11,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#FFFFFF",
          background: "linear-gradient(180deg, #08233A 0%, #061827 100%)",
          border: "1px solid rgba(8,35,58,0.16)",
          boxShadow: "0 10px 20px rgba(7,20,36,0.10)",
          flex: "0 0 auto",
        }}
      >
        <GsnLegacyIcon name={icon} size={16} />
      </span>
      <span>{label}</span>
    </span>
  );
}

function statusGuideRow(
  icon: GsnIconName,
  title: string,
  detail: string,
  bg: string,
  color: string
) {
  return (
    <div
      style={{
        ...institutionalInnerCard(bg),
        border: "1px solid rgba(20,52,83,0.14)",
        display: "grid",
        gridTemplateColumns: "42px minmax(0, 1fr)",
        gap: 12,
        alignItems: "center",
      }}
    >
      <span
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color,
          background: "#FFFFFF",
          boxShadow: "0 10px 22px rgba(7,20,36,0.08)",
          flex: "0 0 auto",
        }}
      >
        <GsnLegacyIcon name={icon} size={22} />
      </span>
      <span>
        <span
          style={{
            display: "block",
            color: "#0B1F33",
            fontWeight: 1000,
            fontSize: 14,
          }}
        >
          {title}
        </span>
        <span style={{ display: "block", marginTop: 4, ...helperText() }}>
          {detail}
        </span>
      </span>
    </div>
  );
}

function riskIcon(level: "green" | "yellow" | "red"): GsnIconName {
  if (level === "red") return "alert";
  if (level === "yellow") return "eye";
  return "check";
}

function riskStyle(level: "green" | "yellow" | "red"): React.CSSProperties {
  if (level === "red") {
    return {
      borderRadius: 14,
      background: "#FEF2F2",
      color: "#991B1B",
      padding: "8px 12px",
      fontWeight: 1000,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
    };
  }
  if (level === "yellow") {
    return {
      borderRadius: 14,
      background: "#FFF7ED",
      color: "#9A3412",
      padding: "8px 12px",
      fontWeight: 1000,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
    };
  }
  return {
    borderRadius: 14,
    background: "#F0FDF4",
    color: "#166534",
    padding: "8px 12px",
    fontWeight: 1000,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };
}

function recoveryColor(row: any): { bg: string; color: string } {
  const recovery = row?.private_recovery || {};
  if (recovery.locked || recovery.configured === false) {
    return { bg: "#FEF2F2", color: "#991B1B" };
  }
  if (!row?.phone_verified || row?.activation_pending) {
    return { bg: "#FFF7ED", color: "#9A3412" };
  }
  return { bg: "#F0FDF4", color: "#166534" };
}

function classify(row: any): { level: "green" | "yellow" | "red"; label: string; score: number } {
  const severity = toNum(row?.severity || 0);
  let score = severity * 10;

  const type = safeStr(row?.signal_type).toLowerCase();
  if (type.includes("cluster")) score += 30;
  if (type.includes("device")) score += 15;
  if (score >= 60) return { level: "red", label: "Intervention required", score };
  if (score >= 25) return { level: "yellow", label: "Monitor this account", score };
  return { level: "green", label: "Low visible concern", score };
}

export default function AdminIdentityRiskPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [phoneLookup, setPhoneLookup] = useState("");
  const [phoneLineage, setPhoneLineage] = useState<any>(null);
  const [phoneLineageErr, setPhoneLineageErr] = useState("");
  const [phoneLineageBusy, setPhoneLineageBusy] = useState(false);
  const [manualRecoveryConfirmed, setManualRecoveryConfirmed] = useState(false);
  const [manualRecoveryNote, setManualRecoveryNote] = useState("");
  const [manualRecoveryBusy, setManualRecoveryBusy] = useState("");
  const [manualRecoveryResult, setManualRecoveryResult] = useState<any>(null);
  const [manualRecoveryErr, setManualRecoveryErr] = useState("");
  const [manualRecoveryCopyStatus, setManualRecoveryCopyStatus] = useState("");
  const [canonicalIdentity, setCanonicalIdentity] = useState("");
  const [duplicateIdentity, setDuplicateIdentity] = useState("");
  const [reconcileOwnerConfirmed, setReconcileOwnerConfirmed] = useState(false);
  const [reconcileNote, setReconcileNote] = useState("");
  const [reconcileBusy, setReconcileBusy] = useState<"preview" | "execute" | "">("");
  const [reconcileResult, setReconcileResult] = useState<any>(null);
  const [reconcileErr, setReconcileErr] = useState("");
  const phoneLineageSeqRef = useRef(0);
  const phoneLineageContextRef = useRef("");
  const reconcileSeqRef = useRef(0);
  const reconcileContextRef = useRef("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await getAdminIdentityRisk(100);
        if (!alive) return;
        setData(res || null);
      } catch (e: any) {
        if (!alive) return;
        setErr(String(e?.message || e || "Unable to load identity risk."));
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const grouped = useMemo(() => {
    const items = Array.isArray(data?.items) ? data.items : [];
    const map = new Map<number, any[]>();
    for (const row of items) {
      const uid = toNum(row?.user_id || 0);
      if (!map.has(uid)) map.set(uid, []);
      map.get(uid)!.push(row);
    }
    return Array.from(map.entries()).map(([userId, rows]) => {
      const max = rows.reduce(
        (acc, r) => {
          const c = classify(r);
          if (c.score > acc.score) return c;
          return acc;
        },
        { level: "green" as const, label: "Low visible concern", score: 0 }
      );
      return { userId, rows, risk: max };
    });
  }, [data]);

  async function handlePhoneLineageLookup(event: React.FormEvent) {
    event.preventDefault();
    const phone = safeStr(phoneLookup).trim();
    if (!phone || phoneLineageBusy) return;

    const requestSeq = phoneLineageSeqRef.current + 1;
    phoneLineageSeqRef.current = requestSeq;
    phoneLineageContextRef.current = phone;
    setPhoneLineageBusy(true);
    setPhoneLineageErr("");
    setPhoneLineage(null);
    clearManualRecoveryResult();

    try {
      const res = await getAdminPhoneIdentityLineage(phone);
      if (
        phoneLineageSeqRef.current !== requestSeq ||
        phoneLineageContextRef.current !== phone
      ) {
        return;
      }
      setPhoneLineage(res || null);
    } catch (e: any) {
      if (
        phoneLineageSeqRef.current !== requestSeq ||
        phoneLineageContextRef.current !== phone
      ) {
        return;
      }
      setPhoneLineage(null);
      setPhoneLineageErr(String(e?.message || e || "Unable to load phone lineage."));
    } finally {
      if (phoneLineageSeqRef.current === requestSeq) {
        setPhoneLineageBusy(false);
      }
    }
  }

  function handlePhoneLookupChange(value: string) {
    phoneLineageContextRef.current = "";
    setPhoneLookup(value);
    setPhoneLineage(null);
    setPhoneLineageErr("");
    clearManualRecoveryResult();
  }

  function clearManualRecoveryResult() {
    setManualRecoveryConfirmed(false);
    setManualRecoveryNote("");
    setManualRecoveryBusy("");
    setManualRecoveryResult(null);
    setManualRecoveryErr("");
    setManualRecoveryCopyStatus("");
  }

  function canManualRecoveryReset(row: any): boolean {
    return Boolean(
      row?.gmfn_id &&
        row?.phone_e164 &&
        row?.phone_verified &&
        !row?.activation_pending &&
        row?.private_recovery?.configured === false
    );
  }

  async function handleManualRecoveryReset(row: any) {
    if (manualRecoveryBusy || !canManualRecoveryReset(row)) return;
    const note = safeStr(manualRecoveryNote).trim();
    if (!manualRecoveryConfirmed || note.length < 8) return;

    const contextKey = `${safeStr(row?.gmfn_id)}\n${safeStr(row?.phone_e164)}\n${note}`;
    setManualRecoveryBusy(contextKey);
    setManualRecoveryErr("");
    setManualRecoveryResult(null);
    setManualRecoveryCopyStatus("");

    try {
      const res = await postAdminManualRecoveryReset({
        gmfn_id: safeStr(row?.gmfn_id),
        phone_e164: safeStr(row?.phone_e164),
        owner_proof_confirmed: manualRecoveryConfirmed,
        reviewer_note: note,
      });
      if (manualRecoveryBusy && manualRecoveryBusy !== contextKey) return;
      setManualRecoveryResult(res || null);
    } catch (e: any) {
      if (manualRecoveryBusy && manualRecoveryBusy !== contextKey) return;
      setManualRecoveryErr(String(e?.message || e || "Unable to issue manual recovery reset."));
    } finally {
      setManualRecoveryBusy("");
    }
  }

  async function copyTemporaryPassword() {
    const password = safeStr(manualRecoveryResult?.temporary_password);
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setManualRecoveryCopyStatus("Temporary password copied.");
    } catch {
      setManualRecoveryCopyStatus("Copy was blocked. Select the temporary password manually.");
    }
  }

  function identityLookupPayload(value: string, prefix: "canonical" | "duplicate") {
    const cleaned = safeStr(value).trim().toUpperCase();
    if (/^\d+$/.test(cleaned)) {
      return { [`${prefix}_user_id`]: Number(cleaned) };
    }
    return { [`${prefix}_gmfn_id`]: cleaned };
  }

  async function handleIdentityReconciliation(execute: boolean) {
    if (reconcileBusy) return;
    const canonical = safeStr(canonicalIdentity).trim();
    const duplicate = safeStr(duplicateIdentity).trim();
    if (!canonical || !duplicate) return;
    const note = safeStr(reconcileNote).trim();
    const contextKey = [
      canonical,
      duplicate,
      reconcileOwnerConfirmed ? "owner-confirmed" : "owner-unconfirmed",
      execute ? "execute" : "preview",
      note,
    ].join("\n");
    const requestSeq = reconcileSeqRef.current + 1;
    reconcileSeqRef.current = requestSeq;
    reconcileContextRef.current = contextKey;

    setReconcileBusy(execute ? "execute" : "preview");
    setReconcileErr("");
    setReconcileResult(null);

    try {
      const res = await postAdminIdentityReconciliation({
        ...identityLookupPayload(canonical, "canonical"),
        ...identityLookupPayload(duplicate, "duplicate"),
        owner_confirmed: reconcileOwnerConfirmed,
        execute,
        reviewer_note: note || undefined,
      });
      if (
        reconcileSeqRef.current !== requestSeq ||
        reconcileContextRef.current !== contextKey
      ) {
        return;
      }
      setReconcileResult(res || null);
    } catch (e: any) {
      if (
        reconcileSeqRef.current !== requestSeq ||
        reconcileContextRef.current !== contextKey
      ) {
        return;
      }
      setReconcileErr(String(e?.message || e || "Unable to reconcile identities."));
    } finally {
      if (reconcileSeqRef.current === requestSeq) {
        setReconcileBusy("");
      }
    }
  }

  function clearReconciliationResult() {
    reconcileContextRef.current = "";
    setReconcileResult(null);
    setReconcileErr("");
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <PageTopNav
        sectionLabel="Identity Risk"
        title="Identity Risk"
        subtitle="Review device overlap, account clusters, and identity pressure that may need manual review."
      />

      <ExplainToggle
        label="What this screen does"
        what="This screen shows identity signals that may need monitoring or review."
        why="It helps you separate normal identity behaviour from stronger overlap pressure."
        next="Read the risk guide, then open detailed signals only when evidence is needed."
        tone="light"
        style={{ marginTop: 18 }}
      />

      {err ? (
        <div
          style={{
            ...card(),
            marginTop: 18,
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#991B1B",
            fontWeight: 900,
          }}
        >
          {err}
        </div>
      ) : null}

      <div style={{ ...card(), marginTop: 18 }}>
        <div>{sectionLabelWithIcon("shield", "How to read identity risk")}</div>
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {statusGuideRow(
            "check",
            "Normal",
            "No strong identity pressure is visible.",
            "#F0FDF4",
            "#166534"
          )}
          {statusGuideRow(
            "eye",
            "Monitor",
            "Watch the account more closely.",
            "#FFF7ED",
            "#9A3412"
          )}
          {statusGuideRow(
            "alert",
            "Intervene",
            "Review overlap or signal concentration.",
            "#FEF2F2",
            "#991B1B"
          )}
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div>{sectionLabelWithIcon("phone", "Phone identity lineage")}</div>
        <div style={{ marginTop: 10, ...helperText() }}>
          Look up the protected GSN identity that already owns a phone number.
          This is read-only; it does not merge, release, or verify the phone.
        </div>
        <div
          style={{
            marginTop: 12,
            ...institutionalInnerCard("#FFF7ED"),
            border: "1px solid rgba(154,52,18,0.16)",
            color: "#7C2D12",
            fontWeight: 900,
          }}
        >
          Forgot-password review: enter the member's recorded phone, confirm the
          GSN ID, then read phone verification and private recovery status before
          any manual account action.
        </div>
        <form
          onSubmit={handlePhoneLineageLookup}
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: 10,
            alignItems: "center",
          }}
        >
          <input
            value={phoneLookup}
            onChange={(event) => handlePhoneLookupChange(event.target.value)}
            placeholder="+447903165266"
            style={{
              width: "100%",
              minHeight: 52,
              boxSizing: "border-box",
              borderRadius: 16,
              border: "1px solid rgba(20,52,83,0.22)",
              background: "#FFFFFF",
              color: "#0B1F33",
              fontSize: 16,
              fontWeight: 900,
              padding: "0 14px",
            }}
          />
          <PrimaryButton
            type="submit"
            busy={phoneLineageBusy}
            busyLabel="Checking..."
            disabled={!safeStr(phoneLookup).trim()}
            stableHeight={52}
            minWidth={132}
            debugId="admin-identity-risk.phone-lineage.lookup"
          >
            Check phone
          </PrimaryButton>
        </form>

        {phoneLineageErr ? (
          <div
            style={{
              marginTop: 12,
              ...institutionalInnerCard("#FEF2F2"),
              color: "#991B1B",
              fontWeight: 900,
            }}
          >
            {phoneLineageErr}
          </div>
        ) : null}

        {phoneLineage ? (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div style={{ ...helperText(), fontWeight: 900 }}>
              {phoneLineage.match_count
                ? `${phoneLineage.match_count} protected identity line found.`
                : "No GSN identity currently owns that phone in the protected identity record."}
            </div>
            {Array.isArray(phoneLineage.matches)
              ? phoneLineage.matches.map((row: any) => (
                  <div
                    key={safeStr(row?.user_id)}
                    style={{
                      ...institutionalInnerCard("#F8FBFF"),
                      border: "1px solid rgba(20,52,83,0.18)",
                    }}
                  >
                    <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                      {labelWithIcon("identity-card", safeStr(row?.gmfn_id || `User #${row?.user_id}`))}
                    </div>
                    <div style={{ marginTop: 8, ...helperText() }}>
                      {safeStr(row?.display_name || row?.email || "Name not shown")}
                    </div>
                    <div style={{ marginTop: 10, display: "grid", gap: 6, ...helperText() }}>
                      <div>State: {safeStr(row?.protection_state || "unknown")}</div>
                      <div>Phone verified: {row?.phone_verified ? "Yes" : "No"}</div>
                      <div
                        style={{
                          borderRadius: 14,
                          background: recoveryColor(row).bg,
                          color: recoveryColor(row).color,
                          padding: "8px 10px",
                          fontWeight: 1000,
                        }}
                      >
                        Private recovery:{" "}
                        {safeStr(row?.private_recovery?.status_label || "Not checked")}
                      </div>
                      <div>
                        Recovery first step:{" "}
                        {safeStr(
                          row?.private_recovery?.recommended_first_step ||
                            "Review manually."
                        )}
                      </div>
                      <div>
                        Communities: {safeStr(row?.active_membership_count || 0)} active,{" "}
                        {safeStr(row?.created_community_count || 0)} created,{" "}
                        {safeStr(row?.pending_join_request_count || 0)} pending join
                      </div>
                      <div>First step: {safeStr(row?.recommended_first_step || "Review manually.")}</div>
                    </div>
                    {canManualRecoveryReset(row) ? (
                      <div
                        style={{
                          marginTop: 14,
                          ...institutionalInnerCard("#FFF7ED"),
                          border: "1px solid rgba(154,52,18,0.18)",
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        <div style={{ fontWeight: 1000, color: "#7C2D12" }}>
                          {labelWithIcon("shield", "Manual recovery reset")}
                        </div>
                        <div style={{ ...helperText(), color: "#7C2D12", fontWeight: 800 }}>
                          Use only after the owner proves this GSN ID and recorded
                          phone belong to them. This issues a temporary password;
                          it does not reveal the old password.
                        </div>
                        <textarea
                          value={manualRecoveryNote}
                          onChange={(event) => {
                            setManualRecoveryNote(event.target.value);
                            setManualRecoveryErr("");
                            setManualRecoveryResult(null);
                            setManualRecoveryCopyStatus("");
                          }}
                          placeholder="Reviewer note: what proof was checked?"
                          style={{
                            width: "100%",
                            minHeight: 86,
                            boxSizing: "border-box",
                            borderRadius: 16,
                            border: "1px solid rgba(20,52,83,0.22)",
                            background: "#FFFFFF",
                            color: "#0B1F33",
                            fontSize: 16,
                            fontWeight: 800,
                            padding: 14,
                            resize: "vertical",
                          }}
                        />
                        <label
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            color: "#0B1F33",
                            fontWeight: 900,
                            lineHeight: 1.35,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={manualRecoveryConfirmed}
                            onChange={(event) => {
                              setManualRecoveryConfirmed(event.target.checked);
                              setManualRecoveryErr("");
                              setManualRecoveryResult(null);
                              setManualRecoveryCopyStatus("");
                            }}
                            style={{ width: 18, height: 18, marginTop: 3, flex: "0 0 auto" }}
                          />
                          <span>
                            Owner proof checked: GSN ID, recorded phone, and
                            community identity match this person.
                          </span>
                        </label>
                        <PrimaryButton
                          type="button"
                          busy={Boolean(manualRecoveryBusy)}
                          busyLabel="Issuing..."
                          disabled={
                            !manualRecoveryConfirmed ||
                            safeStr(manualRecoveryNote).trim().length < 8 ||
                            Boolean(manualRecoveryResult?.temporary_password)
                          }
                          stableHeight={52}
                          minWidth={190}
                          debugId="admin-identity-risk.manual-recovery-reset.issue"
                          onClick={() => handleManualRecoveryReset(row)}
                        >
                          Issue temporary password
                        </PrimaryButton>
                        {manualRecoveryErr ? (
                          <div
                            style={{
                              ...institutionalInnerCard("#FEF2F2"),
                              color: "#991B1B",
                              fontWeight: 900,
                            }}
                          >
                            {manualRecoveryErr}
                          </div>
                        ) : null}
                        {manualRecoveryResult?.temporary_password ? (
                          <div
                            style={{
                              ...institutionalInnerCard("#F0FDF4"),
                              border: "1px solid rgba(22,101,52,0.18)",
                              display: "grid",
                              gap: 10,
                            }}
                          >
                            <div style={{ color: "#166534", fontWeight: 1000 }}>
                              Temporary password shown once
                            </div>
                            <div
                              style={{
                                padding: "12px 14px",
                                borderRadius: 14,
                                background: "#FFFFFF",
                                border: "1px solid rgba(20,52,83,0.16)",
                                color: "#0B1F33",
                                fontSize: 18,
                                fontWeight: 1000,
                                letterSpacing: 0.4,
                                overflowWrap: "anywhere",
                              }}
                            >
                              {safeStr(manualRecoveryResult.temporary_password)}
                            </div>
                            <div style={{ ...helperText(), color: "#166534", fontWeight: 800 }}>
                              Give it only to the verified owner. They must sign
                              in, change password, and set private recovery.
                            </div>
                            <PrimaryButton
                              type="button"
                              stableHeight={48}
                              minWidth={160}
                              debugId="admin-identity-risk.manual-recovery-reset.copy"
                              onClick={() => void copyTemporaryPassword()}
                            >
                              Copy temporary password
                            </PrimaryButton>
                            {manualRecoveryCopyStatus ? (
                              <div style={{ ...helperText(), color: "#166534", fontWeight: 900 }}>
                                {manualRecoveryCopyStatus}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))
              : null}
            <details>
              <StableDisclosureSummary
                style={summaryToggle()}
                debugId="admin-identity-risk.phone-lineage.raw"
              >
                {labelWithIcon("document", "Full phone-lineage record")}
              </StableDisclosureSummary>
              <pre
                style={{
                  marginTop: 12,
                  background: "#0B1F33",
                  color: "#E5E7EB",
                  padding: 16,
                  borderRadius: 14,
                  fontSize: 13,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {JSON.stringify(phoneLineage, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div>{sectionLabelWithIcon("identity-card", "Identity reconciliation")}</div>
        <div style={{ marginTop: 10, ...helperText() }}>
          Merge an owner-confirmed duplicate into the canonical GSN identity.
          Preview first. Execute only after the owner has confirmed both records
          belong to the same person.
        </div>
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 10,
          }}
        >
          <input
            value={canonicalIdentity}
            onChange={(event) => {
              setCanonicalIdentity(event.target.value);
              clearReconciliationResult();
            }}
            placeholder="Canonical GSN ID or user ID"
            style={{
              width: "100%",
              minHeight: 52,
              boxSizing: "border-box",
              borderRadius: 16,
              border: "1px solid rgba(20,52,83,0.22)",
              background: "#FFFFFF",
              color: "#0B1F33",
              fontSize: 16,
              fontWeight: 900,
              padding: "0 14px",
            }}
          />
          <input
            value={duplicateIdentity}
            onChange={(event) => {
              setDuplicateIdentity(event.target.value);
              clearReconciliationResult();
            }}
            placeholder="Duplicate GSN ID or user ID"
            style={{
              width: "100%",
              minHeight: 52,
              boxSizing: "border-box",
              borderRadius: 16,
              border: "1px solid rgba(20,52,83,0.22)",
              background: "#FFFFFF",
              color: "#0B1F33",
              fontSize: 16,
              fontWeight: 900,
              padding: "0 14px",
            }}
          />
        </div>
        <textarea
          value={reconcileNote}
          onChange={(event) => {
            setReconcileNote(event.target.value);
            clearReconciliationResult();
          }}
          placeholder="Reviewer note"
          style={{
            marginTop: 10,
            width: "100%",
            minHeight: 86,
            boxSizing: "border-box",
            borderRadius: 16,
            border: "1px solid rgba(20,52,83,0.22)",
            background: "#FFFFFF",
            color: "#0B1F33",
            fontSize: 16,
            fontWeight: 800,
            padding: 14,
            resize: "vertical",
          }}
        />
        <label
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#0B1F33",
            fontWeight: 900,
          }}
        >
          <input
            type="checkbox"
            checked={reconcileOwnerConfirmed}
            onChange={(event) => {
              setReconcileOwnerConfirmed(event.target.checked);
              clearReconciliationResult();
            }}
            style={{ width: 18, height: 18 }}
          />
          <span>Owner confirmed both records are the same person</span>
        </label>
        <div
          style={{
            marginTop: 14,
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <PrimaryButton
            type="button"
            busy={reconcileBusy === "preview"}
            busyLabel="Previewing..."
            disabled={!safeStr(canonicalIdentity).trim() || !safeStr(duplicateIdentity).trim()}
            stableHeight={52}
            minWidth={132}
            debugId="admin-identity-risk.reconcile.preview"
            onClick={() => handleIdentityReconciliation(false)}
          >
            Preview merge
          </PrimaryButton>
          <PrimaryButton
            type="button"
            busy={reconcileBusy === "execute"}
            busyLabel="Merging..."
            disabled={
              !safeStr(canonicalIdentity).trim() ||
              !safeStr(duplicateIdentity).trim() ||
              !reconcileOwnerConfirmed
            }
            stableHeight={52}
            minWidth={150}
            debugId="admin-identity-risk.reconcile.execute"
            onClick={() => handleIdentityReconciliation(true)}
          >
            Execute merge
          </PrimaryButton>
        </div>

        {reconcileErr ? (
          <div
            style={{
              marginTop: 12,
              ...institutionalInnerCard("#FEF2F2"),
              color: "#991B1B",
              fontWeight: 900,
            }}
          >
            {reconcileErr}
          </div>
        ) : null}

        {reconcileResult ? (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div
              style={{
                ...institutionalInnerCard(
                  reconcileResult.mode === "execute" ? "#F0FDF4" : "#F8FBFF"
                ),
                border: "1px solid rgba(20,52,83,0.18)",
              }}
            >
              <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                {reconcileResult.mode === "execute" ? "Merge executed" : "Merge preview"}
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                {safeStr(reconcileResult.warning || "Review the operation record before continuing.")}
              </div>
            </div>
            <details>
              <StableDisclosureSummary
                style={summaryToggle()}
                debugId="admin-identity-risk.reconcile.raw"
              >
                {labelWithIcon("document", "Full reconciliation record")}
              </StableDisclosureSummary>
              <pre
                style={{
                  marginTop: 12,
                  background: "#0B1F33",
                  color: "#E5E7EB",
                  padding: 16,
                  borderRadius: 14,
                  fontSize: 13,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {JSON.stringify(reconcileResult, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
        {grouped.length === 0 ? (
          <div style={card()}>
            <div style={{ color: "#6B7A88" }}>
              {labelWithIcon("check", "No identity-risk signals are currently shown.")}
            </div>
          </div>
        ) : null}

        {grouped.map((g) => (
          <div key={g.userId} style={card()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 1000, fontSize: 18, color: "#0B1F33" }}>
                  {labelWithIcon("user", <>User #{g.userId}</>)}
                </div>
                <div style={{ marginTop: 6, color: "#64748b" }}>
                  {labelWithIcon("document", <>Signals detected: {g.rows.length}</>)}
                </div>
              </div>

              <div style={riskStyle(g.risk.level)}>
                <GsnLegacyIcon
                  name={riskIcon(g.risk.level)}
                  size={18}
                />
                <span>{g.risk.label}</span>
              </div>
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              {g.rows.map((row: any) => (
                <div
                  key={row.id}
                  style={{
                    ...institutionalInnerCard("#F8FBFF"),
                    border: "1px solid rgba(20,52,83,0.18)",
                  }}
                >
                  <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                    {labelWithIcon("shield", safeStr(row?.signal_type || "signal"))}
                  </div>
                  <div style={{ marginTop: 6, ...helperText() }}>
                    {safeStr(row?.description || "No description")}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>
                    Severity: {safeStr(row?.severity || "0")} | Created:{" "}
                    {safeStr(row?.created_at || "-")}
                  </div>
                </div>
              ))}
            </div>

            <details style={{ marginTop: 14 }}>
              <StableDisclosureSummary
                style={summaryToggle()}
                debugId={`admin-identity-risk.${g.userId}.details`}
              >
                {labelWithIcon("document", "Full signal record")}
              </StableDisclosureSummary>
              <pre
                style={{
                  marginTop: 12,
                  background: "#0B1F33",
                  color: "#E5E7EB",
                  padding: 16,
                  borderRadius: 14,
                  fontSize: 13,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {JSON.stringify(g.rows, null, 2)}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
