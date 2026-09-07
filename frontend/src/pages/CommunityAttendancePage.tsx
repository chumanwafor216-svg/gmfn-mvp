import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate, useParams } from "react-router-dom";
import { GsnRealisticIcon } from "../components/GsnRealisticIcon";
import PageTopNav from "../components/PageTopNav";
import { StableButton } from "../components/StableButton";
import {
  getAccessToken,
  getPublicCommunityDomainAttendanceSession,
  recordPublicCommunityDomainAttendanceCheckin,
} from "../lib/api";

function safeText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function errorMessage(error: any): string {
  const detail = error?.detail;
  return safeText(
    detail?.message || error?.message || error,
    "GSN could not load this live attendance QR link."
  );
}

function formatDate(value: unknown): string {
  const raw = safeText(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #061827 0%, #0A2237 42%, #F5F0E6 42%, #F5F0E6 100%)",
    color: "#091B2E",
  };
}

function pageInner(): React.CSSProperties {
  return {
    maxWidth: 860,
    margin: "0 auto",
    padding: "20px 16px 44px",
    display: "grid",
    gap: 16,
  };
}

function card(): React.CSSProperties {
  return {
    borderRadius: 24,
    background: "#FFFFFF",
    border: "1px solid rgba(9,27,46,0.12)",
    boxShadow: "0 22px 60px rgba(2,14,24,0.18)",
    padding: 18,
    display: "grid",
    gap: 14,
  };
}

function softCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    background: "#F8FBFF",
    border: "1px solid rgba(9,27,46,0.1)",
    padding: 14,
    display: "grid",
    gap: 8,
  };
}

function helper(): React.CSSProperties {
  return {
    color: "rgba(9,27,46,0.68)",
    fontSize: 14,
    lineHeight: 1.45,
  };
}

function label(): React.CSSProperties {
  return {
    color: "#A67C00",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function badge(tone: "good" | "warn" | "info" = "info"): React.CSSProperties {
  const palette =
    tone === "good"
      ? { color: "#155A32", background: "#EAF8EF" }
      : tone === "warn"
      ? { color: "#6B4A00", background: "#FFF4D6" }
      : { color: "#0B4D78", background: "#EAF5FF" };
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(9,27,46,0.08)",
    ...palette,
  };
}

export default function CommunityAttendancePage() {
  const { publicCode } = useParams();
  const navigate = useNavigate();
  const code = safeText(publicCode);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [recorded, setRecorded] = useState(false);
  const signedIn = Boolean(getAccessToken());

  async function load() {
    if (!code) {
      setLoading(false);
      setMessage("This attendance link is missing its QR code.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const payload = await getPublicCommunityDomainAttendanceSession(code);
      setSession(payload?.attendance_session || null);
    } catch (error: any) {
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [code]);

  const pageUrl = useMemo(() => {
    if (typeof window === "undefined") return session?.public_path || "";
    return window.location.href;
  }, [session?.public_path]);

  const domainName = safeText(
    session?.community_domain?.display_name,
    safeText(session?.community_domain_name, "This community")
  );
  const programmeLabel = safeText(session?.programme_label, "Live attendance");
  const openedAt = formatDate(session?.attendance_opened_at || session?.created_at);
  const expiresAt = formatDate(session?.attendance_expires_at);
  const isActive = Boolean(session?.active);

  async function markPresent() {
    if (!signedIn) {
      const next = typeof window === "undefined" ? `/community-attendance/${code}` : window.location.pathname;
      navigate(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await recordPublicCommunityDomainAttendanceCheckin(code, {
        method: "qr",
        note: "Member scanned the live Community Domain attendance QR.",
      });
      setRecorded(true);
      setMessage(safeText(result?.message, "Attendance recorded from live QR."));
      await load();
    } catch (error: any) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={pageShell()} data-debug-id="community-attendance.public-page">
      <PageTopNav
        sectionLabel="Live attendance"
        title="GSN attendance QR"
        subtitle="Scan-to-mark-present Presence Evidence"
      />
      <section style={pageInner()}>
        <div style={{ color: "#F8FBFF", display: "grid", gap: 8, padding: "8px 2px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <GsnRealisticIcon name="certificate-seal" size={46} decorative />
            <div>
              <div style={{ ...label(), color: "#F3C85B" }}>GSN Attendance QR</div>
              <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.08, letterSpacing: 0 }}>
                {loading ? "Loading attendance" : domainName}
              </h1>
            </div>
          </div>
          <p style={{ margin: 0, maxWidth: 680, color: "rgba(248,251,255,0.78)", lineHeight: 1.55 }}>
            Scan this during the open service or programme window. GSN records your signed-in identity and check-in time as Presence Evidence only.
          </p>
        </div>

        <section style={card()}>
          {loading ? (
            <div style={softCard()}>Loading this live attendance QR.</div>
          ) : message && !session ? (
            <div style={{ ...softCard(), background: "#FFF4D6", color: "#6B4A00" }}>{message}</div>
          ) : session ? (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: 8, minWidth: 0, flex: "1 1 260px" }}>
                  <div style={label()}>{domainName}</div>
                  <h2 style={{ margin: 0, fontSize: 25, lineHeight: 1.2, letterSpacing: 0, overflowWrap: "break-word" }}>
                    {programmeLabel}
                  </h2>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge(isActive ? "good" : "warn")}>{isActive ? "Open now" : "Closed"}</span>
                    <span style={badge("info")}>{safeText(session.attendance_method, "qr")}</span>
                    <span style={badge("info")}>{safeText(session.checkin_count, "0")} checked in</span>
                    {openedAt ? <span style={badge("info")}>Opened {openedAt}</span> : null}
                    {expiresAt ? <span style={badge("warn")}>Closes {expiresAt}</span> : null}
                  </div>
                </div>
                <div style={{ borderRadius: 18, background: "#FFFFFF", border: "1px solid rgba(9,27,46,0.12)", padding: 10 }}>
                  <QRCodeSVG value={pageUrl || code} size={128} bgColor="#FFFFFF" fgColor="#07172C" level="M" marginSize={1} />
                </div>
              </div>

              <div style={softCard()}>
                <div style={label()}>Mark present</div>
                <p style={{ ...helper(), margin: 0 }}>
                  {signedIn
                    ? "Use your signed-in GSN identity to record one check-in for this open window. Re-scanning will not count twice."
                    : "Sign in with your GSN member identity first. GSN will not collect a raw phone number from this public QR page."}
                </p>
                <StableButton
                  kind="primary"
                  debugId="community-attendance.mark-present"
                  disabled={busy || !isActive || recorded}
                  busy={busy}
                  busyLabel="Recording..."
                  onClick={markPresent}
                >
                  {recorded ? "Attendance Recorded" : signedIn ? "Mark Me Present" : "Sign In To Mark Present"}
                </StableButton>
                {message ? (
                  <div style={{ ...helper(), color: recorded ? "#155A32" : "#6B4A00" }}>{message}</div>
                ) : null}
              </div>

              <div style={{ ...softCard(), background: "#F5F0E6" }}>
                <div style={label()}>Boundary</div>
                <p style={{ ...helper(), margin: 0 }}>
                  {safeText(session.boundary, "GSN records live Presence Evidence only. This is not a trust score, location tracker, manual attendance sheet, contribution proof, or spiritual judgement.")}
                </p>
              </div>
            </>
          ) : (
            <div style={softCard()}>GSN could not find this live attendance QR.</div>
          )}
        </section>
      </section>
    </main>
  );
}