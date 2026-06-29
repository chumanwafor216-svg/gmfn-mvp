import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  EntryActionButton,
  EntryBackLink,
} from "../components/EntryControls";
import { GsnRealisticIcon } from "../components/GsnRealisticIcon";
import {
  checkCommunityDomainAvailability,
  createCommunityDomainDraft,
  createCommunityDomainPackageQuote,
  getAccessToken,
  listCommunityDomainTemplates,
} from "../lib/api";

type TemplateOption = {
  template_key: string;
  domain_type: string;
  label: string;
  summary?: string;
  boundary?: string;
};

type AvailabilityResult = {
  domain_name?: string;
  normalized_domain_name?: string;
  available?: boolean;
  reason?: string | null;
};

const FALLBACK_TEMPLATES: TemplateOption[] = [
  {
    template_key: "school_multi_branch",
    domain_type: "school",
    label: "School",
    summary: "Schools, academies, branches, classes, staff, parents, and student groups.",
  },
  {
    template_key: "church_religious_body",
    domain_type: "religious_body",
    label: "Church / religious body",
    summary: "Branches, ministries, departments, leaders, members, and programmes.",
  },
  {
    template_key: "union_professional_body",
    domain_type: "professional_union",
    label: "Union / professional body",
    summary: "Chapters, committees, professional groups, and membership governance.",
  },
  {
    template_key: "market_cooperative",
    domain_type: "market_cooperative",
    label: "Market / cooperative",
    summary: "Market authorities, trade lines, shop clusters, and cooperative records.",
  },
  {
    template_key: "generic_association",
    domain_type: "generic_association",
    label: "Generic association",
    summary: "A flexible structure for custom institutional domains.",
  },
];

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100svh",
    width: "100%",
    background:
      "radial-gradient(circle at 86% 12%, rgba(214,170,69,0.13) 0%, rgba(214,170,69,0.00) 28%), radial-gradient(circle at 10% 84%, rgba(70,119,165,0.22) 0%, rgba(70,119,165,0.00) 30%), linear-gradient(180deg, #04101B 0%, #071A2A 46%, #0D2A43 100%)",
    color: "#FFFFFF",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    padding: "16px",
    boxSizing: "border-box",
  };
}

function glassCard(): React.CSSProperties {
  return {
    width: "min(100%, 1040px)",
    margin: "0 auto",
    borderRadius: 30,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)",
    border: "1px solid rgba(220,231,243,0.18)",
    boxShadow:
      "0 34px 78px rgba(0,8,18,0.34), inset 0 1px 0 rgba(255,255,255,0.08)",
    padding: 18,
    boxSizing: "border-box",
    overflow: "hidden",
    position: "relative",
  };
}

function whiteCard(): React.CSSProperties {
  return {
    borderRadius: 22,
    background:
      "linear-gradient(180deg, rgba(248,251,255,0.99) 0%, rgba(232,239,247,0.97) 100%)",
    border: "1px solid rgba(17,37,58,0.12)",
    boxShadow: "0 22px 48px rgba(8,18,34,0.13)",
    padding: 18,
    color: "#0B1F33",
  };
}

function darkPanel(): React.CSSProperties {
  return {
    borderRadius: 22,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.045) 100%)",
    border: "1px solid rgba(220,231,243,0.18)",
    boxShadow: "0 18px 34px rgba(0,8,18,0.18), inset 0 1px 0 rgba(255,255,255,0.10)",
    padding: 16,
  };
}

function labelText(onDark = true): React.CSSProperties {
  return {
    fontSize: 12,
    color: onDark ? "#F3D06A" : "#526B83",
    fontWeight: 900,
    letterSpacing: 2.6,
    textTransform: "uppercase",
  };
}

function helperText(onDark = true): React.CSSProperties {
  return {
    color: onDark ? "rgba(255,255,255,0.82)" : "#4F647A",
    fontSize: 14,
    lineHeight: 1.65,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 50,
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid rgba(28,76,126,0.15)",
    outline: "none",
    fontSize: 14,
    boxSizing: "border-box",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(246,250,255,0.99) 100%)",
    color: "#0B1F33",
  };
}

function fieldLabel(): React.CSSProperties {
  return {
    color: "#0B1F33",
    fontSize: 13,
    fontWeight: 900,
    marginBottom: 6,
  };
}

function statusPill(kind: "ready" | "blocked" | "waiting"): React.CSSProperties {
  const palette =
    kind === "ready"
      ? { bg: "rgba(22,101,52,0.10)", color: "#166534", border: "rgba(22,101,52,0.22)" }
      : kind === "blocked"
      ? { bg: "rgba(153,27,27,0.10)", color: "#991B1B", border: "rgba(153,27,27,0.20)" }
      : { bg: "rgba(146,94,8,0.10)", color: "#925E08", border: "rgba(146,94,8,0.22)" };

  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    padding: "6px 10px",
    borderRadius: 999,
    background: palette.bg,
    color: palette.color,
    border: `1px solid ${palette.border}`,
    fontSize: 12,
    fontWeight: 900,
  };
}

function compactValue(value: unknown, fallback = "Not set"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeTemplateItems(payload: any): TemplateOption[] {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const clean = items
    .map((item: any): TemplateOption | null => {
      const templateKey = compactValue(item?.template_key, "");
      const domainType = compactValue(item?.domain_type, templateKey);
      const label = compactValue(item?.label, "");
      if (!templateKey || !label) return null;
      return {
        template_key: templateKey,
        domain_type: domainType,
        label,
        summary: compactValue(item?.summary, ""),
        boundary: compactValue(item?.boundary, ""),
      };
    })
    .filter(Boolean) as TemplateOption[];

  return clean.length ? clean : FALLBACK_TEMPLATES;
}

export default function CommunityDomainPurchasePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 860;
  });
  const [organizationName, setOrganizationName] = useState("");
  const [domainName, setDomainName] = useState("");
  const [country, setCountry] = useState("");
  const [stateName, setStateName] = useState("");
  const [templateKey, setTemplateKey] = useState(FALLBACK_TEMPLATES[0].template_key);
  const [templates, setTemplates] = useState<TemplateOption[]>(FALLBACK_TEMPLATES);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [draftResult, setDraftResult] = useState<any>(null);
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [busy, setBusy] = useState<"templates" | "availability" | "draft" | null>(null);
  const [message, setMessage] = useState("");

  const isSignedIn = Boolean(getAccessToken());

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "GSN | Purchase Community Domain";
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 860);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadTemplates() {
      setBusy("templates");
      try {
        const payload = await listCommunityDomainTemplates();
        if (!alive) return;
        const nextTemplates = normalizeTemplateItems(payload);
        setTemplates(nextTemplates);
        if (!nextTemplates.some((item) => item.template_key === templateKey)) {
          setTemplateKey(nextTemplates[0]?.template_key || FALLBACK_TEMPLATES[0].template_key);
        }
      } catch {
        if (alive) {
          setTemplates(FALLBACK_TEMPLATES);
        }
      } finally {
        if (alive) setBusy(null);
      }
    }

    loadTemplates();
    return () => {
      alive = false;
    };
  }, []);

  const selectedTemplate = useMemo(
    () =>
      templates.find((item) => item.template_key === templateKey) ||
      templates[0] ||
      FALLBACK_TEMPLATES[0],
    [templateKey, templates]
  );

  const availabilityKind: "ready" | "blocked" | "waiting" = availability
    ? availability.available
      ? "ready"
      : "blocked"
    : "waiting";

  async function handleCheckAvailability(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setDraftResult(null);
    setQuoteResult(null);

    const requestedName = domainName.trim();
    if (requestedName.length < 2) {
      setAvailability(null);
      setMessage("Enter the domain name or code you want GSN to reserve for this institution.");
      return;
    }

    setBusy("availability");
    try {
      const result = await checkCommunityDomainAvailability(requestedName);
      setAvailability(result);
      setMessage(
        result?.available
          ? "This domain name can be used for a draft Community Domain request."
          : "That domain name is not available. Choose a different domain name before continuing."
      );
    } catch (err: any) {
      setAvailability(null);
      setMessage(err?.message || "GSN could not check that domain name right now.");
    } finally {
      setBusy(null);
    }
  }

  async function handleCreateDraft() {
    setMessage("");

    if (!isSignedIn) {
      navigate(`/login?force=1&next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }

    if (!availability?.available) {
      setMessage("Check an available domain name before creating a draft request.");
      return;
    }

    if (!organizationName.trim()) {
      setMessage("Add the organization name before creating a draft request.");
      return;
    }

    setBusy("draft");
    try {
      const draft = await createCommunityDomainDraft({
        domain_name: availability.normalized_domain_name || domainName.trim(),
        display_name: organizationName.trim(),
        domain_type: selectedTemplate.domain_type,
        template_key: selectedTemplate.template_key,
        country: country.trim() || null,
        state: stateName.trim() || null,
        public_profile: `Draft institutional Community Domain request for ${organizationName.trim()}.`,
      });

      setDraftResult(draft);

      const domainId = draft?.community_domain?.id;
      if (domainId) {
        try {
          const quote = await createCommunityDomainPackageQuote(domainId);
          setQuoteResult(quote);
        } catch (quoteErr: any) {
          setQuoteResult({
            error: quoteErr?.message || "Package quote could not be generated from this screen.",
          });
        }
      }

      setMessage(
        "Draft request created. It is not active, paid, or verified until payment instruction, confirmation, and admin activation happen."
      );
    } catch (err: any) {
      setMessage(err?.message || "GSN could not create the draft request.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main style={pageShell()}>
      <section style={glassCard()}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at top, rgba(201,154,39,0.08) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at bottom right, rgba(110,145,186,0.08) 0%, rgba(110,145,186,0) 32%)",
          }}
        />
        <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 16 }}>
          <header
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "44px minmax(0, 1fr)" : "44px minmax(0, 1fr) 110px",
              gap: 12,
              alignItems: "start",
            }}
          >
            <EntryBackLink to="/welcome" />
            <div style={{ display: "grid", gap: 8, justifyItems: isCompact ? "start" : "center" }}>
              <div style={labelText()}>GSN / Community Domain</div>
              <h1
                style={{
                  margin: 0,
                  color: "#F8FBFF",
                  fontSize: isCompact ? 31 : 44,
                  lineHeight: 1.03,
                  fontWeight: 950,
                  textAlign: isCompact ? "left" : "center",
                  letterSpacing: 0,
                }}
              >
                Purchase Community Domain
              </h1>
              <p
                style={{
                  ...helperText(),
                  margin: 0,
                  maxWidth: 760,
                  textAlign: isCompact ? "left" : "center",
                }}
              >
                Check the institutional domain name first. A draft request is not a live
                community, not a payment, and not a verified public record.
              </p>
            </div>
            {isCompact ? null : <div />}
          </header>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.15fr) minmax(330px, 0.85fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <form onSubmit={handleCheckAvailability} style={whiteCard()}>
              <div style={{ display: "grid", gap: 16 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "72px minmax(0, 1fr)",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 70,
                      height: 70,
                      borderRadius: 22,
                      display: "grid",
                      placeItems: "center",
                      background:
                        "linear-gradient(180deg, rgba(9,31,51,0.08) 0%, rgba(9,31,51,0.035) 100%)",
                      border: "1px solid rgba(9,31,51,0.10)",
                    }}
                  >
                    <GsnRealisticIcon name="public-globe" size={58} decorative />
                  </div>
                  <div style={{ display: "grid", gap: 5 }}>
                    <div style={labelText(false)}>Institutional path</div>
                    <div style={{ fontSize: 24, lineHeight: 1.08, fontWeight: 950 }}>
                      Reserve the name before setup.
                    </div>
                    <div style={helperText(false)}>
                      Ordinary Create Community remains the free social entry path. This
                      route is for a paid institutional Community Domain.
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  <label>
                    <div style={fieldLabel()}>Organization name</div>
                    <input
                      value={organizationName}
                      onChange={(event) => setOrganizationName(event.target.value)}
                      placeholder="Dominion Schools Network"
                      style={inputStyle()}
                    />
                  </label>

                  <label>
                    <div style={fieldLabel()}>Requested domain name</div>
                    <input
                      value={domainName}
                      onChange={(event) => {
                        setDomainName(event.target.value);
                        setAvailability(null);
                        setDraftResult(null);
                        setQuoteResult(null);
                      }}
                      placeholder="dominion-schools"
                      style={inputStyle()}
                    />
                  </label>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  <label>
                    <div style={fieldLabel()}>Society type / template</div>
                    <select
                      value={templateKey}
                      onChange={(event) => setTemplateKey(event.target.value)}
                      style={inputStyle()}
                    >
                      {templates.map((template) => (
                        <option key={template.template_key} value={template.template_key}>
                          {template.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <div style={fieldLabel()}>Country</div>
                    <input
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      placeholder="Nigeria"
                      style={inputStyle()}
                    />
                  </label>

                  <label>
                    <div style={fieldLabel()}>State / region</div>
                    <input
                      value={stateName}
                      onChange={(event) => setStateName(event.target.value)}
                      placeholder="Lagos"
                      style={inputStyle()}
                    />
                  </label>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div style={helperText(false)}>
                    {selectedTemplate.summary ||
                      "Templates are planning presets. They do not create, activate, verify, or bill a Community Domain."}
                  </div>
                  <EntryActionButton
                    type="submit"
                    disabled={busy === "availability"}
                    debugId="community-domain-purchase.check-domain"
                    style={{ minWidth: isCompact ? "100%" : 190 }}
                  >
                    {busy === "availability" ? "Checking..." : "Check domain name"}
                  </EntryActionButton>
                </div>
              </div>
            </form>

            <aside style={{ display: "grid", gap: 12 }}>
              <div style={whiteCard()}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={labelText(false)}>Availability result</div>
                  <div style={statusPill(availabilityKind)}>
                    {availability
                      ? availability.available
                        ? "Available"
                        : "Unavailable"
                      : busy === "templates"
                      ? "Loading templates"
                      : "Not checked"}
                  </div>
                  <div style={helperText(false)}>
                    {availability ? (
                      <>
                        Requested name:{" "}
                        <strong>{compactValue(availability.domain_name || domainName)}</strong>
                        <br />
                        Domain code:{" "}
                        <strong>
                          {compactValue(availability.normalized_domain_name, "Not returned")}
                        </strong>
                        {availability.reason ? (
                          <>
                            <br />
                            Reason: <strong>{availability.reason}</strong>
                          </>
                        ) : null}
                      </>
                    ) : (
                      "GSN checks availability by the domain name/code, not by display-name similarity."
                    )}
                  </div>
                </div>
              </div>

              <div style={whiteCard()}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={labelText(false)}>Draft and quote state</div>
                  <div style={statusPill(draftResult ? "ready" : "waiting")}>
                    {draftResult ? "Draft created" : "Waiting for owner"}
                  </div>
                  <div style={helperText(false)}>
                    {draftResult?.community_domain ? (
                      <>
                        Draft ID: <strong>{draftResult.community_domain.id}</strong>
                        <br />
                        Status: <strong>{draftResult.community_domain.status}</strong>
                        <br />
                        Verification:{" "}
                        <strong>{draftResult.community_domain.verification_status}</strong>
                      </>
                    ) : (
                      "Signed-in owners can create a draft after a name is available. The draft does not create a live social Community."
                    )}
                  </div>
                  {quoteResult ? (
                    <div style={helperText(false)}>
                      {quoteResult.error ? (
                        <>Package quote: {quoteResult.error}</>
                      ) : (
                        <>
                          Package quote:{" "}
                          <strong>
                            {compactValue(
                              quoteResult?.quote?.status || quoteResult?.quote?.quote_status,
                              "generated"
                            )}
                          </strong>
                        </>
                      )}
                    </div>
                  ) : null}
                  {draftResult?.community_domain?.id ? (
                    <EntryActionButton
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        navigate(
                          `/app/community-domain/${encodeURIComponent(
                            String(draftResult.community_domain.id)
                          )}`
                        )
                      }
                      debugId="community-domain-purchase.open-dashboard"
                      style={{
                        width: "100%",
                        color: "#10253B",
                        border: "1px solid rgba(16,37,59,0.14)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,246,253,0.98) 100%)",
                        boxShadow:
                          "0 14px 28px rgba(7,20,36,0.07), inset 0 1px 0 rgba(255,255,255,0.86)",
                      }}
                    >
                      Open domain dashboard
                    </EntryActionButton>
                  ) : null}
                  <EntryActionButton
                    type="button"
                    variant="secondary"
                    onClick={handleCreateDraft}
                    disabled={busy === "draft" || !availability?.available || Boolean(draftResult)}
                    debugId="community-domain-purchase.create-draft"
                    style={{
                      width: "100%",
                      color: "#10253B",
                      border: "1px solid rgba(16,37,59,0.14)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,246,253,0.98) 100%)",
                      boxShadow:
                        "0 14px 28px rgba(7,20,36,0.07), inset 0 1px 0 rgba(255,255,255,0.86)",
                    }}
                  >
                    {draftResult
                      ? "Draft request created"
                      : isSignedIn
                      ? "Create draft request"
                      : "Sign in to continue"}
                  </EntryActionButton>
                </div>
              </div>

              <div style={whiteCard()}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={labelText(false)}>Payment instruction</div>
                  <div style={statusPill("waiting")}>Not generated here</div>
                  <div style={helperText(false)}>
                    Payment instruction, payment confirmation, and domain activation are
                    separate steps. This screen will not claim the institution is active or
                    verified.
                  </div>
                </div>
              </div>
            </aside>
          </div>

          {message ? (
            <div
              role="status"
              style={{
                ...darkPanel(),
                color: "#F8FBFF",
                borderColor: availability?.available
                  ? "rgba(243,208,106,0.28)"
                  : "rgba(220,231,243,0.18)",
              }}
            >
              {message}
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={darkPanel()}>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={labelText()}>Create Community</div>
                <div style={{ fontSize: 21, fontWeight: 950, lineHeight: 1.12 }}>
                  Free social/community start
                </div>
                <div style={helperText()}>
                  Use this for a normal GSN community and member invitations. It is not
                  the paid institutional domain purchase path.
                </div>
                <EntryActionButton
                  type="button"
                  variant="secondary"
                  onClick={() => navigate("/create")}
                  debugId="community-domain-purchase.open-create-community"
                  style={{ width: "100%" }}
                >
                  Create a free community
                </EntryActionButton>
              </div>
            </div>

            <div style={darkPanel()}>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={labelText()}>Existing owner</div>
                <div style={{ fontSize: 21, fontWeight: 950, lineHeight: 1.12 }}>
                  Recover a signed-in path
                </div>
                <div style={helperText()}>
                  Sign in before creating the draft request so ownership is attached to
                  the correct account.
                </div>
                <EntryActionButton
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    navigate(
                      `/login?force=1&next=${encodeURIComponent(
                        location.pathname + location.search
                      )}`
                    )
                  }
                  debugId="community-domain-purchase.sign-in"
                  style={{ width: "100%" }}
                >
                  Sign in as existing member
                </EntryActionButton>
              </div>
            </div>
          </div>

          <details style={darkPanel()}>
            <summary
              style={{
                cursor: "pointer",
                color: "#F8FBFF",
                fontWeight: 950,
                fontSize: 15,
              }}
            >
              What happens after the draft?
            </summary>
            <div style={{ ...helperText(), marginTop: 10 }}>
              The owner reviews the draft, requests a package quote, receives payment
              instructions only when that rail exists, and waits for payment confirmation
              plus admin activation. Public verification language should only appear after
              backend status proves it.
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}
