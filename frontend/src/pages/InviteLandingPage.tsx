// src/pages/InviteLandingPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getInvitePreview } from "../lib/api";

type InvitePreview = {
  code?: string;
  clan_id?: number;
  clan_name?: string;
  inviter_display?: string;
  expires_at?: string | null;
  is_active?: boolean;
  uses?: number;
  max_uses?: number | null;
  revoked_at?: string | null;
};

function FeatureCard(props: { title: string; text: string }) {
  const { title, text } = props;

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        padding: 16,
        background: "#ffffff",
      }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: 16,
          marginBottom: 8,
          color: "#0f172a",
        }}
      >
        {title}
      </div>
      <div
        style={{
          color: "#475569",
          lineHeight: 1.65,
          fontSize: 14,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function pill(kind: "blue" | "green" | "red" | "gray"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    border: "1px solid #e5e7eb",
    background: "#fff",
    whiteSpace: "nowrap",
  };

  if (kind === "blue") {
    return {
      ...base,
      color: "#1e40af",
      background: "#eff6ff",
      borderColor: "#bfdbfe",
    };
  }
  if (kind === "green") {
    return {
      ...base,
      color: "#166534",
      background: "#f0fdf4",
      borderColor: "#bbf7d0",
    };
  }
  if (kind === "red") {
    return {
      ...base,
      color: "#991b1b",
      background: "#fef2f2",
      borderColor: "#fecaca",
    };
  }
  return {
    ...base,
    color: "#334155",
    background: "#f8fafc",
    borderColor: "#e2e8f0",
  };
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "Not specified";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function InviteLandingPage() {
  const { code } = useParams();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        if (!code) return;
        const res = await getInvitePreview(code);
        setInvite(res);
      } catch {
        setInvite(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [code]);

  const inviteStatus = useMemo(() => {
    if (!invite) return { label: "Unavailable", kind: "gray" as const };
    if (invite.revoked_at) return { label: "Revoked", kind: "red" as const };
    if (invite.is_active) return { label: "Active", kind: "green" as const };
    return { label: "Inactive", kind: "gray" as const };
  }, [invite]);

  if (loading) {
    return (
      <div style={{ padding: 40, color: "#334155", fontWeight: 700 }}>
        Loading invitation...
      </div>
    );
  }

  if (!invite) {
    return (
      <div style={{ padding: 40, color: "#991b1b", fontWeight: 800 }}>
        Invitation not found.
      </div>
    );
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
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={pill("blue")}>Institutional Invitation</span>
            <span style={pill(inviteStatus.kind)}>{inviteStatus.label}</span>
          </div>

          <h1
            style={{
              margin: "16px 0 0 0",
              fontSize: 32,
              lineHeight: 1.15,
              color: "#0f172a",
              fontWeight: 900,
            }}
          >
            Global Mutual Finance Network
          </h1>

          <p
            style={{
              marginTop: 16,
              marginBottom: 0,
              color: "#334155",
              fontSize: 16,
              lineHeight: 1.8,
              maxWidth: 780,
            }}
          >
            GMFN is a trust infrastructure institution designed to strengthen
            economic cooperation within communities. It converts verified social
            reputation into structured financial access through transparent,
            accountable, and portable systems of trust.
          </p>

          <p
            style={{
              marginTop: 14,
              marginBottom: 0,
              color: "#475569",
              fontSize: 15,
              lineHeight: 1.8,
              maxWidth: 780,
            }}
          >
            Through its flagship instruments, GMFN enables communities to issue
            TrustSlip purchase authorization, organize guarantor-backed community
            lending, and maintain a transparent trust ledger that supports
            long-term financial credibility across networks.
          </p>

          <p
            style={{
              marginTop: 14,
              marginBottom: 0,
              color: "#475569",
              fontSize: 15,
              lineHeight: 1.8,
              maxWidth: 780,
            }}
          >
            This invitation grants access to establish community leadership within
            the GMFN network and initiate a governed trust-based financial
            community.
          </p>

          <div
            style={{
              marginTop: 24,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div
              style={{
                padding: 16,
                borderRadius: 16,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                Community
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 20,
                  fontWeight: 900,
                  color: "#0f172a",
                }}
              >
                {invite.clan_name || "GMFN Community"}
              </div>
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 16,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                Invitation Reference
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 20,
                  fontWeight: 900,
                  color: "#0f172a",
                }}
              >
                {invite.code || code || "—"}
              </div>
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 16,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                Invited By
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                {invite.inviter_display || "GMFN Network"}
              </div>
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 16,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                Expiry
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                {fmtDate(invite.expires_at)}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 16,
              borderRadius: 16,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
              Usage Position
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 15,
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              {invite.uses ?? 0}
              {invite.max_uses ? ` / ${invite.max_uses}` : " / unlimited"}
            </div>
          </div>

          <div
            style={{
              marginTop: 28,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            <FeatureCard
              title="TrustSlip Authorization"
              text="A verifiable trust-backed authorization instrument enabling responsible merchant confidence and goods release."
            />
            <FeatureCard
              title="Community Lending Framework"
              text="A structured support model in which trusted guarantor relationships improve access while preserving accountability."
            />
            <FeatureCard
              title="Transparent Trust Ledger"
              text="A deterministic trust record based on verifiable actions including repayment, guarantees, and community participation."
            />
          </div>

          <div
            style={{
              marginTop: 24,
              padding: 16,
              borderRadius: 16,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
              Web Access
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 15,
                lineHeight: 1.7,
                color: "#0f172a",
                fontWeight: 700,
              }}
            >
              www.gmfn.org
            </div>
          </div>

          <div
            style={{
              marginTop: 28,
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <Link
              to={`/signup/invite/${code}`}
              style={{
                textDecoration: "none",
                background: "#0f172a",
                color: "#ffffff",
                padding: "14px 18px",
                borderRadius: 14,
                fontWeight: 800,
              }}
            >
              Establish Community Leadership
            </Link>

            <Link
              to="/login"
              style={{
                textDecoration: "none",
                background: "#ffffff",
                color: "#0f172a",
                padding: "14px 18px",
                borderRadius: 14,
                border: "1px solid #cbd5e1",
                fontWeight: 800,
              }}
            >
              Access Existing Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}