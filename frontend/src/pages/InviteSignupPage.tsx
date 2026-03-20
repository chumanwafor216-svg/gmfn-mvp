import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { setAccessToken, setSelectedClanId, signupWithInvite } from "../lib/api";

type FormState = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  clanName: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

function initialFormState(code?: string): FormState {
  return {
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    clanName: code ? `GMFN Community ${code}` : "",
  };
}

function validateForm(values: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!values.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }

  if (!values.email.trim()) {
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

  if (!values.clanName.trim()) {
    errors.clanName = "Community name is required.";
  }

  return errors;
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
          fontWeight: 700,
          color: "#0f172a",
          fontSize: 14,
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
          width: "100%",
          boxSizing: "border-box",
          padding: "13px 14px",
          borderRadius: 12,
          border: error ? "1px solid #dc2626" : "1px solid #cbd5e1",
          outline: "none",
          fontSize: 15,
          background: "#ffffff",
        }}
      />
      {error ? (
        <div
          style={{
            marginTop: 6,
            color: "#dc2626",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}
    </label>
  );
}

export default function InviteSignupPage() {
  const { code } = useParams();
  const navigate = useNavigate();

  const safeCode = useMemo(() => code?.trim() || "UNKNOWN", [code]);

  const [form, setForm] = useState<FormState>(() => initialFormState(safeCode));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedGmfnId, setIssuedGmfnId] = useState<string>("");

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [key]: undefined,
    }));

    if (submitError) {
      setSubmitError("");
    }
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

    try {
      const res = await signupWithInvite({
        invite_code: safeCode,
        email: form.email.trim(),
        password: form.password,
        clan_name: form.clanName.trim(),
        clan_description: form.fullName.trim() ? `Founder: ${form.fullName.trim()}` : null,
      });

      const nextGmfnId = String(res?.gmfn_id || "").trim();
      if (nextGmfnId) {
        setIssuedGmfnId(nextGmfnId);
      }

      setAccessToken(res.access_token || null);
      setSelectedClanId(Number(res.clan_id));

      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 700);
    } catch (error: any) {
      setSubmitError(error?.message || "Signup could not be completed right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f8fafc 0%, #eef2ff 55%, #ffffff 100%)",
        padding: "32px 16px",
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div
            style={{
              display: "inline-block",
              background: "#e0e7ff",
              color: "#3730a3",
              padding: "8px 12px",
              borderRadius: 999,
              fontWeight: 700,
              fontSize: 12,
              marginBottom: 16,
            }}
          >
            Founder Signup
          </div>

          <h1
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: 30,
              lineHeight: 1.15,
              fontWeight: 900,
            }}
          >
            Create your GMFN founder account
          </h1>

          <p
            style={{
              marginTop: 14,
              marginBottom: 0,
              color: "#475569",
              fontSize: 15,
              lineHeight: 1.8,
            }}
          >
            This onboarding creates your founder account, your first community,
            and your permanent global GMFN identity.
          </p>

          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 14,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#334155",
              fontSize: 14,
            }}
          >
            Invite code: <strong>{safeCode}</strong>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              marginTop: 24,
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

            <Field
              label="Community name"
              value={form.clanName}
              onChange={(next) => updateField("clanName", next)}
              error={errors.clanName}
              placeholder="Name your community"
            />

            {submitError ? (
              <div
                style={{
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#991b1b",
                  padding: 12,
                  borderRadius: 12,
                  fontSize: 14,
                }}
              >
                {submitError}
              </div>
            ) : null}

            {issuedGmfnId ? (
              <div
                style={{
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#1e3a8a",
                  padding: 14,
                  borderRadius: 12,
                  fontSize: 14,
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 6 }}>
                  Global GMFN ID issued
                </div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>{issuedGmfnId}</div>
                <div style={{ marginTop: 6 }}>
                  This permanent identity remains yours across all clans and future CCI calculations.
                </div>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                marginTop: 6,
                border: "none",
                borderRadius: 14,
                padding: "14px 18px",
                background: isSubmitting ? "#94a3b8" : "#0f172a",
                color: "#ffffff",
                fontWeight: 800,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                fontSize: 15,
              }}
            >
              {isSubmitting ? "Creating account..." : "Create founder account"}
            </button>
          </form>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <Link
              to={`/invite/${safeCode}`}
              style={{
                textDecoration: "none",
                color: "#3730a3",
                fontWeight: 700,
              }}
            >
              Back to invite page
            </Link>

            <span style={{ color: "#94a3b8" }}>•</span>

            <Link
              to="/login"
              style={{
                textDecoration: "none",
                color: "#0f172a",
                fontWeight: 700,
              }}
            >
              Already have an account? Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}