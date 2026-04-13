import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import * as api from "../lib/api";

type FormState = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  clanName: string;
  clanDescription: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function initialFormState(params: URLSearchParams, routeState: any): FormState {
  const carried = routeState?.create_entry || {};

  return {
    fullName: safeStr(carried.full_name || carried.name || ""),
    email: safeStr(carried.email || ""),
    password: "",
    confirmPassword: "",
    clanName: safeStr(
      carried.clan_name ||
        params.get("clan_name") ||
        params.get("community_name") ||
        ""
    ),
    clanDescription: safeStr(
      carried.clan_description ||
        params.get("clan_description") ||
        params.get("community_description") ||
        ""
    ),
  };
}

function validateForm(values: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!safeStr(values.fullName)) {
    errors.fullName = "Full name is required.";
  }

  if (!safeStr(values.email)) {
    errors.email = "Email is required.";
  } else if (!values.email.includes("@")) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.password) {
    errors.password = "Password is required.";
  } else if (values.password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (!safeStr(values.clanName)) {
    errors.clanName = "Community name is required.";
  }

  return errors;
}

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, rgba(47,103,196,0.14) 0%, rgba(16,37,59,0.00) 34%), linear-gradient(180deg, #F8FAFC 0%, #EEF2FF 55%, #FFFFFF 100%)",
    padding: "32px 16px",
    boxSizing: "border-box",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    background: bg,
    border: "1px solid rgba(11,31,51,0.08)",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0 12px 36px rgba(15,23,42,0.06)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    background: bg,
    border: "1px solid rgba(11,31,51,0.08)",
    padding: 18,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 1000,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.8,
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    padding: "6px 10px",
    borderRadius: 999,
    background: primary ? "#EAF2FF" : "#F8FAFC",
    border: primary
      ? "1px solid rgba(11,99,209,0.14)"
      : "1px solid rgba(11,31,51,0.08)",
    color: primary ? "#0B63D1" : "#475569",
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "nowrap",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px",
    borderRadius: 12,
    border: "1px solid #CBD5E1",
    outline: "none",
    fontSize: 15,
    background: "#FFFFFF",
    color: "#0F172A",
  };
}

function textAreaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 110,
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: 1.6,
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    width: "100%",
    border: "none",
    borderRadius: 14,
    padding: "14px 18px",
    background: disabled ? "#94A3B8" : "#0F172A",
    color: "#FFFFFF",
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15,
    opacity: disabled ? 0.85 : 1,
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 14,
    padding: "14px 18px",
    background: "#FFFFFF",
    color: "#0B1F33",
    fontWeight: 800,
    border: "1px solid rgba(11,31,51,0.10)",
    cursor: "pointer",
    fontSize: 15,
  };
}

function secondaryLink(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 900,
    border: "1px solid rgba(11,31,51,0.10)",
    fontSize: 14,
  };
}

function noticeStyle(
  kind: "error" | "info" | "success" | "warning"
): React.CSSProperties {
  if (kind === "error") {
    return {
      borderRadius: 16,
      background: "#FEF2F2",
      border: "1px solid #FECACA",
      color: "#991B1B",
      padding: 16,
      lineHeight: 1.75,
      fontSize: 14,
    };
  }

  if (kind === "success") {
    return {
      borderRadius: 16,
      background: "#ECFDF5",
      border: "1px solid #A7F3D0",
      color: "#065F46",
      padding: 16,
      lineHeight: 1.75,
      fontSize: 14,
    };
  }

  if (kind === "warning") {
    return {
      borderRadius: 16,
      background: "#FFFBEB",
      border: "1px solid #FDE68A",
      color: "#92400E",
      padding: 16,
      lineHeight: 1.75,
      fontSize: 14,
    };
  }

  return {
    borderRadius: 16,
    background: "#F8FBFF",
    border: "1px solid rgba(11,31,51,0.08)",
    color: "#35516B",
    padding: 16,
    lineHeight: 1.75,
    fontSize: 14,
  };
}

function Field(props: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
}) {
  const { label, value, onChange, error, type = "text", placeholder } = props;

  return (
    <label style={{ display: "block" }}>
      <div
        style={{
          marginBottom: 8,
          ...sectionLabel(),
          color: "#475569",
        }}
      >
        {label}
      </div>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...inputStyle(),
          border: error ? "1px solid #DC2626" : "1px solid #CBD5E1",
        }}
      />

      {error ? (
        <div
          style={{
            marginTop: 6,
            color: "#DC2626",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}
    </label>
  );
}

function TextAreaField(props: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  error?: string;
  placeholder?: string;
}) {
  const { label, value, onChange, error, placeholder } = props;

  return (
    <label style={{ display: "block" }}>
      <div
        style={{
          marginBottom: 8,
          ...sectionLabel(),
          color: "#475569",
        }}
      >
        {label}
      </div>

      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...textAreaStyle(),
          border: error ? "1px solid #DC2626" : "1px solid #CBD5E1",
        }}
      />

      {error ? (
        <div
          style={{
            marginTop: 6,
            color: "#DC2626",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}
    </label>
  );
}

async function submitFounderCreate(
  createCode: string,
  form: FormState
): Promise<any> {
  const founderPayload = {
    email: safeStr(form.email),
    password: form.password,
    clan_name: safeStr(form.clanName),
    clan_description: safeStr(form.clanDescription) || undefined,
    full_name: safeStr(form.fullName),
    founder_name: safeStr(form.fullName),
    display_name: safeStr(form.fullName),
    create_code: createCode || undefined,
    founder_code: createCode || undefined,
    public_create_code: createCode || undefined,
  };

  const inviteFallbackPayload = {
    invite_code: createCode,
    email: safeStr(form.email),
    password: form.password,
    clan_name: safeStr(form.clanName),
    clan_description: safeStr(form.clanDescription) || undefined,
  };

  const candidateNames = [
    "signupFounder",
    "createFounderAccount",
    "registerFounder",
    "publicCreateFounder",
    "publicCreateCommunity",
    "createEntrySignup",
  ];

  for (const name of candidateNames) {
    const fn = (api as any)[name];
    if (typeof fn === "function") {
      return await fn(founderPayload);
    }
  }

  if (createCode) {
    const fallbackFn = (api as any).signupWithInvite;
    if (typeof fallbackFn === "function") {
      return await fallbackFn(inviteFallbackPayload);
    }
  }

  throw new Error(
    "Founder create API is not wired in this build yet. Wire the backend create endpoint before testing this route."
  );
}

export default function CreateEntryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const routeState = (location.state as any) || {};

  const createCode = useMemo(() => {
    return safeStr(
      searchParams.get("create_code") ||
        searchParams.get("founder_code") ||
        searchParams.get("public_create_code") ||
        searchParams.get("code") ||
        ""
    );
  }, [searchParams]);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 920;
  });

  const [form, setForm] = useState<FormState>(() =>
    initialFormState(searchParams, routeState)
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [submitInfo, setSubmitInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedGmfnId, setIssuedGmfnId] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 920);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "GSN | Create Entry";
    }
  }, []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [key]: undefined,
    }));

    if (submitError) setSubmitError("");
    if (submitInfo) setSubmitInfo("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nextErrors = validateForm(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setSubmitInfo("");

    try {
      const res = await submitFounderCreate(createCode, form);

      const nextGmfnId = safeStr(
        res?.gmfn_id || res?.item?.gmfn_id || res?.data?.gmfn_id || ""
      );
      const nextClanId = Number(
        res?.clan_id ?? res?.item?.clan_id ?? res?.data?.clan_id ?? 0
      );
      const nextToken = safeStr(
        res?.access_token || res?.token || res?.data?.access_token || ""
      );

      if (nextGmfnId) {
        setIssuedGmfnId(nextGmfnId);
      }

      if (typeof (api as any).setAccessToken === "function") {
        (api as any).setAccessToken(nextToken || null);
      } else if (nextToken) {
        localStorage.setItem("access_token", nextToken);
      }

      if (nextClanId > 0) {
        if (typeof (api as any).setSelectedClanId === "function") {
          (api as any).setSelectedClanId(nextClanId);
        } else {
          localStorage.setItem("gmfn_selected_clan_id", String(nextClanId));
        }
      }

      if (nextToken) {
        setSubmitInfo("Founder account created. Opening your workspace...");
        setTimeout(() => {
          navigate("/app/dashboard", { replace: true });
        }, 700);
      } else {
        setSubmitInfo(
          "Founder account details were submitted. Continue to login if your backend creates the account without immediate sign-in."
        );
      }
    } catch (error: any) {
      setSubmitError(
        error?.message ||
          "Founder creation could not be completed right now. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function clearDraft() {
    setForm(initialFormState(searchParams, routeState));
    setErrors({});
    setSubmitError("");
    setSubmitInfo("");
  }

  return (
    <div style={pageShell()}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gap: 18 }}>
        <div style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}>
          <div style={sectionLabel()}>Founder create route</div>

          <div
            style={{
              marginTop: 10,
              color: "#0F172A",
              fontSize: isCompact ? 30 : 36,
              lineHeight: 1.08,
              fontWeight: 1000,
              maxWidth: 760,
            }}
          >
            Create your founder account and your first community.
          </div>

          <div style={{ marginTop: 12, ...helperText(), maxWidth: 820 }}>
            This route is for the first member who is creating a new community.
            The app should keep this path focused and should not mix it with the
            join route.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={badge(true)}>Create route</span>
            {createCode ? (
              <span style={badge(false)}>Create code detected</span>
            ) : (
              <span style={badge(false)}>No create code detected</span>
            )}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1.02fr 0.98fr",
            gap: 18,
          }}
        >
          <div style={pageCard()}>
            <div style={sectionLabel()}>Create entry form</div>

            <div
              style={{
                marginTop: 12,
                color: "#0F172A",
                fontSize: 24,
                fontWeight: 1000,
                lineHeight: 1.15,
              }}
            >
              Founder details
            </div>

            <div style={{ marginTop: 10, ...helperText() }}>
              Provide the founder details and the name of the first community.
            </div>

            {!createCode ? (
              <div style={{ marginTop: 16, ...noticeStyle("info") }}>
                This page can still be prepared and reviewed without a create
                code, but final founder submission depends on the backend create
                endpoint being wired correctly.
              </div>
            ) : null}

            {submitError ? (
              <div style={{ marginTop: 16, ...noticeStyle("error") }}>
                {submitError}
              </div>
            ) : null}

            {submitInfo ? (
              <div style={{ marginTop: 16, ...noticeStyle("success") }}>
                {submitInfo}
              </div>
            ) : null}

            {issuedGmfnId ? (
              <div style={{ marginTop: 16, ...noticeStyle("info") }}>
                <div style={{ fontWeight: 1000, marginBottom: 6 }}>
                  Global GMFN ID issued
                </div>
                <div style={{ fontSize: 18, fontWeight: 1000 }}>
                  {issuedGmfnId}
                </div>
                <div style={{ marginTop: 6 }}>
                  This permanent identity remains yours across all communities and future trust calculations.
                </div>
              </div>
            ) : null}

            <form
              onSubmit={handleSubmit}
              style={{
                marginTop: 18,
                display: "grid",
                gap: 16,
              }}
            >
              <Field
                label="Full name"
                value={form.fullName}
                onChange={(next) => updateField("fullName", next)}
                error={errors.fullName}
                placeholder="Enter your full name"
              />

              <Field
                label="Email"
                value={form.email}
                onChange={(next) => updateField("email", next)}
                error={errors.email}
                type="email"
                placeholder="Enter your email"
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 16,
                }}
              >
                <Field
                  label="Password"
                  value={form.password}
                  onChange={(next) => updateField("password", next)}
                  error={errors.password}
                  type="password"
                  placeholder="Create a password"
                />

                <Field
                  label="Confirm password"
                  value={form.confirmPassword}
                  onChange={(next) => updateField("confirmPassword", next)}
                  error={errors.confirmPassword}
                  type="password"
                  placeholder="Confirm your password"
                />
              </div>

              <Field
                label="Community name"
                value={form.clanName}
                onChange={(next) => updateField("clanName", next)}
                error={errors.clanName}
                placeholder="Name your community"
              />

              <TextAreaField
                label="Community description (optional)"
                value={form.clanDescription}
                onChange={(next) => updateField("clanDescription", next)}
                error={errors.clanDescription}
                placeholder="Describe the purpose of the community"
              />

              <div style={{ marginTop: 6, display: "grid", gap: 12 }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={primaryBtn(isSubmitting)}
                >
                  {isSubmitting ? "Creating founder account..." : "Create founder account"}
                </button>

                <button
                  type="button"
                  onClick={clearDraft}
                  style={secondaryBtn()}
                >
                  Reset draft
                </button>
              </div>
            </form>
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            <div style={pageCard()}>
              <div style={sectionLabel()}>What happens next</div>

              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <div style={softCard()}>
                  <div style={{ color: "#0F172A", fontWeight: 1000, fontSize: 18 }}>
                    1. Founder account
                  </div>
                  <div style={{ marginTop: 8, ...helperText() }}>
                    The system creates the founder record and the first community entry.
                  </div>
                </div>

                <div style={softCard()}>
                  <div style={{ color: "#0F172A", fontWeight: 1000, fontSize: 18 }}>
                    2. GMFN identity
                  </div>
                  <div style={{ marginTop: 8, ...helperText() }}>
                    Your permanent GMFN identity is issued as the trust anchor for future movement.
                  </div>
                </div>

                <div style={softCard()}>
                  <div style={{ color: "#0F172A", fontWeight: 1000, fontSize: 18 }}>
                    3. Authenticated flow
                  </div>
                  <div style={{ marginTop: 8, ...helperText() }}>
                    After successful creation and sign-in, the wider member flow opens from inside the app.
                  </div>
                </div>
              </div>
            </div>

            <div style={pageCard()}>
              <div style={sectionLabel()}>Support links</div>

              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link to="/guide" style={secondaryLink()}>
                  Open My GMFN and I
                </Link>

                <Link to="/welcome" style={secondaryLink()}>
                  Welcome
                </Link>

                <Link to="/login" style={secondaryLink()}>
                  Existing access
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}