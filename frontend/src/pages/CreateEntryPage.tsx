import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import OriginLink from "../components/OriginLink";
import {
  clearPublicEntryState,
  createEntry,
  getCreateCode,
  getMe,
  isAuthenticated,
} from "../lib/api";

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background: "#F5FAFE",
    padding: "34px 22px",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    background: bg,
    border: "1px solid rgba(11,31,51,0.08)",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 24,
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

function fieldLabel(): React.CSSProperties {
  return {
    fontSize: 13,
    fontWeight: 900,
    color: "#0B1F33",
    marginBottom: 6,
  };
}

function input(): React.CSSProperties {
  return {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.12)",
    outline: "none",
    fontSize: 14,
    boxSizing: "border-box",
    background: "#FFFFFF",
    color: "#0B1F33",
  };
}

function textArea(): React.CSSProperties {
  return {
    ...input(),
    minHeight: 110,
    resize: "vertical",
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    width: "100%",
    padding: "14px 18px",
    borderRadius: 16,
    background: disabled ? "#CBD5E1" : "#0B63D1",
    color: "#FFFFFF",
    fontWeight: 1000,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15,
    opacity: disabled ? 0.8 : 1,
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4F6B8A",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

function feedbackCard(success = false): React.CSSProperties {
  return {
    borderRadius: 16,
    padding: 14,
    border: success ? "1px solid #A7F3D0" : "1px solid #FECACA",
    background: success ? "#ECFDF5" : "#FEF2F2",
    color: success ? "#065F46" : "#991B1B",
    fontWeight: 900,
  };
}

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function resolveIssuedGmfnId(out: any, me: any): string {
  return safeStr(
    me?.gmfn_id ||
      out?.gmfn_id ||
      out?.user?.gmfn_id ||
      out?.member?.gmfn_id ||
      out?.data?.gmfn_id
  );
}

function resolveActivationRequestId(out: any): string {
  return safeStr(
    out?.request_id ||
      out?.join_request_id ||
      out?.member_request_id ||
      out?.approval_request_id
  );
}

export default function CreateEntryPage() {
  const nav = useNavigate();
  const location = useLocation();

  const search = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const stateCreateEntry =
    (location.state as {
      create_entry?: {
        clan_name?: string;
        clan_description?: string;
        email?: string;
        create_code?: string;
      };
    } | null)?.create_entry || null;

  const initialCommunityName = safeStr(
    stateCreateEntry?.clan_name ||
      search.get("clan_name") ||
      search.get("community_name") ||
      ""
  );

  const initialDescription = safeStr(
    stateCreateEntry?.clan_description ||
      search.get("clan_description") ||
      search.get("community_description") ||
      ""
  );

  const initialEmail = safeStr(
    stateCreateEntry?.email || search.get("email") || ""
  );

  const createCode = safeStr(
    stateCreateEntry?.create_code ||
      search.get("create_code") ||
      getCreateCode() ||
      ""
  );

  const [communityName, setCommunityName] = useState(initialCommunityName);
  const [description, setDescription] = useState(initialDescription);
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canContinue = !!safeStr(communityName) && !!safeStr(email);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canContinue || busy) return;

    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const payload: Record<string, any> = {
        clan_name: safeStr(communityName),
        clan_description: safeStr(description) || undefined,
        email: safeStr(email),
      };

      if (createCode) {
        payload.create_code = createCode;
      }

      const out = await createEntry(payload);
      const me = await getMe().catch(() => null);

      const issuedGmfnId = resolveIssuedGmfnId(out, me);
      const requestId = resolveActivationRequestId(out);
      const authenticatedNow = isAuthenticated();

      if (authenticatedNow) {
        clearPublicEntryState();
        nav("/app/build-first-circle", { replace: true });
        return;
      }

      if (issuedGmfnId || requestId) {
        clearPublicEntryState();

        const next = new URLSearchParams();
        if (issuedGmfnId) next.set("gmfn_id", issuedGmfnId);
        if (requestId) next.set("request_id", requestId);

        nav(
          next.toString()
            ? `/activate-membership?${next.toString()}`
            : "/activate-membership",
          {
            replace: true,
            state: {
              gmfn_id: issuedGmfnId || undefined,
              request_id: requestId || undefined,
            },
          }
        );
        return;
      }

      setSuccess(
        safeStr(
          out?.detail ||
            out?.message ||
            "Founder entry was submitted successfully. Continue when activation details are available."
        )
      );
    } catch (err: any) {
      setError(err?.message || "Founder entry could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={pageShell()}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: 18 }}>
        <div
          style={pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)")}
        >
          <div style={sectionLabel()}>Create entry</div>

          <div
            style={{
              marginTop: 10,
              fontSize: 30,
              fontWeight: 1000,
              color: "#F8FBFF",
              lineHeight: 1.15,
            }}
          >
            Start a new community
          </div>

          <div
            style={{
              marginTop: 10,
              color: "#D7E3F1",
              lineHeight: 1.8,
              maxWidth: 760,
            }}
          >
            Start with a community name, add a short description, and continue
            into founder creation. If GSN access is issued here, the next guided
            step will be Build Your First Circle.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <a
              href="/GMFN_FINAL_WHITE.pdf"
              target="_blank"
              rel="noreferrer"
              style={secondaryBtn()}
            >
              Understand GSN first
            </a>

            <OriginLink to="/welcome" style={secondaryBtn()}>
              Back
            </OriginLink>

            <OriginLink to="/login" style={secondaryBtn()}>
              Already have access?
            </OriginLink>
          </div>
        </div>

        {error ? <div style={feedbackCard(false)}>{error}</div> : null}
        {success ? <div style={feedbackCard(true)}>{success}</div> : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div style={pageCard()}>
            <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
              <div>
                <div style={fieldLabel()}>Community name</div>
                <input
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  placeholder="Enter community name"
                  style={input()}
                />
              </div>

              <div>
                <div style={fieldLabel()}>Short description</div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this community represents"
                  style={textArea()}
                />
              </div>

              <div>
                <div style={fieldLabel()}>Your email</div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  style={input()}
                />
              </div>

              <div style={{ marginTop: 4 }}>
                <button
                  type="submit"
                  style={primaryBtn(!canContinue || busy)}
                  disabled={!canContinue || busy}
                >
                  {busy ? "Continuing..." : "Continue to founder creation"}
                </button>
              </div>
            </form>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <div style={softCard()}>
              <div style={sectionLabel()}>What happens next</div>
              <div
                style={{
                  marginTop: 10,
                  color: "#475569",
                  lineHeight: 1.8,
                  fontSize: 14,
                }}
              >
                1. Start with the community details.
                <br />
                2. Complete founder creation.
                <br />
                3. If GSN access is issued, move into Build Your First Circle.
                <br />
                4. Then continue into your wider member pages.
              </div>
            </div>

            <div style={softCard()}>
              <div style={sectionLabel()}>Why this page exists</div>
              <div
                style={{
                  marginTop: 10,
                  color: "#475569",
                  lineHeight: 1.8,
                  fontSize: 14,
                }}
              >
                Start public create entry here. Community management happens
                later in the guided member workspace.
              </div>
            </div>

            <div style={softCard()}>
              <div style={sectionLabel()}>Guide note</div>
              <div
                style={{
                  marginTop: 10,
                  color: "#475569",
                  lineHeight: 1.8,
                  fontSize: 14,
                }}
              >
                The guided founder path stays focused: start, validate,
                issue GSN access, build the first circle, then reopen wider
                movement.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


