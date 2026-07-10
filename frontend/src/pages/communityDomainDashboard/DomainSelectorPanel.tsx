import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StableButton, StableCtaLink } from "../../components/StableButton";
import { APP_ROUTES } from "../../lib/appRoutes";
import { lookupCommunityDomainByName } from "../../lib/api";
import { humanStatus } from "./statusLanguage";

type DomainSelectorPanelProps = {
  domainItems?: any[];
};

function cleanText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function compactStatus(value: unknown): string {
  return humanStatus(value);
}

function isDraftDomain(domain: any): boolean {
  const status = compactStatus(domain?.status || domain?.domain_status).toLowerCase();
  const billing = compactStatus(domain?.billing_status).toLowerCase();
  const activation = compactStatus(domain?.activation_status).toLowerCase();
  return (
    status.includes("draft") ||
    billing.includes("quote") ||
    activation.includes("not active") ||
    activation.includes("waiting")
  );
}

function softCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    background:
      "linear-gradient(180deg, rgba(248,251,255,0.995) 0%, rgba(236,243,250,0.985) 100%)",
    border: "1px solid rgba(9,27,46,0.12)",
    boxShadow: "0 14px 30px rgba(7,20,36,0.055)",
    padding: 14,
    color: "#091B2E",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#506A82",
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#4F647A",
    fontSize: 14,
    lineHeight: 1.65,
  };
}

function statusBadge(status: unknown): React.CSSProperties {
  const text = compactStatus(status).toLowerCase();
  const warning =
    text.includes("draft") ||
    text.includes("quote") ||
    text.includes("not") ||
    text.includes("needs") ||
    text.includes("pending") ||
    text.includes("optional") ||
    text.includes("read only");
  const danger = text.includes("suspended") || text.includes("expired") || text.includes("closed");
  const palette = danger
    ? { bg: "rgba(153,27,27,0.10)", color: "#991B1B", border: "rgba(153,27,27,0.20)" }
    : warning
    ? { bg: "rgba(146,94,8,0.11)", color: "#925E08", border: "rgba(146,94,8,0.22)" }
    : { bg: "rgba(22,101,52,0.10)", color: "#166534", border: "rgba(22,101,52,0.22)" };

  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: palette.bg,
    color: palette.color,
    border: `1px solid ${palette.border}`,
    fontSize: 12,
    fontWeight: 900,
    textTransform: "capitalize",
  };
}

export default function CommunityDomainSelectorPanel({
  domainItems = [],
}: DomainSelectorPanelProps): React.ReactElement {
  const navigate = useNavigate();
  const [editDomainName, setEditDomainName] = useState("");
  const [editLookup, setEditLookup] = useState<any | null>(null);
  const [editLookupMessage, setEditLookupMessage] = useState("");
  const [editLookupBusy, setEditLookupBusy] = useState(false);

  async function findDomainForEdit() {
    const requestedName = cleanText(editDomainName);
    setEditLookup(null);
    if (requestedName.length < 2) {
      setEditLookupMessage("Enter the Community Domain code first.");
      return;
    }

    setEditLookupBusy(true);
    setEditLookupMessage("");
    try {
      const payload = await lookupCommunityDomainByName(requestedName);
      const entry = payload?.community_domain || null;
      setEditLookup(entry);
      setEditLookupMessage(
        entry?.display_name
          ? `${entry.display_name} found. Open it next; if you are not authorised, GSN will show the owner-approval path.`
          : "Community Domain found. Open it next; if you are not authorised, GSN will show the owner-approval path."
      );
    } catch (err: any) {
      setEditLookupMessage(
        err?.message ||
          "GSN could not find that Community Domain code. Ask the organization for its exact GSN domain code."
      );
    } finally {
      setEditLookupBusy(false);
    }
  }

  function openDomainForEdit() {
    const path =
      cleanText(editLookup?.dashboard_path) ||
      (editLookup?.id
        ? `/app/community-domain/${encodeURIComponent(String(editLookup.id))}`
        : "");
    if (!path) {
      setEditLookupMessage("Find the Community Domain before opening edit.");
      return;
    }
    navigate(path);
  }

  const startPanel = (
    <div style={{ ...softCard(), display: "grid", gap: 12 }}>
      <div style={sectionLabel()}>Set up / edit</div>
      <h2 style={{ margin: 0, fontSize: 25, lineHeight: 1.1 }}>
        Choose the path first.
      </h2>
      <div style={helperText()}>
        Start a new institutional domain, or find an existing one before asking
        for owner-approved edit access.
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
          gap: 10,
        }}
      >
        <StableCtaLink
          to="/community-domain/purchase"
          kind="primary"
          debugId="community-domain-dashboard.selector.setup-new"
        >
          Set up new domain
        </StableCtaLink>
        <StableButton
          type="button"
          kind="secondary"
          debugId="community-domain-dashboard.selector.edit-existing-focus"
          onClick={() => {
            setEditLookupMessage(
              "Enter the Community Domain code below, then tap Find domain."
            );
          }}
        >
          Edit existing domain
        </StableButton>
      </div>
    </div>
  );

  const editPanel = (
    <div
      id="community-domain-edit-existing"
      style={{ ...softCard(), display: "grid", gap: 10 }}
    >
      <div style={sectionLabel()}>Edit existing domain</div>
      <div style={helperText()}>
        Enter the Community Domain code. GSN will find the public record first;
        the owner/admin still controls who can edit setup.
      </div>
      <input
        value={editDomainName}
        onChange={(event) => {
          setEditDomainName(event.target.value);
          setEditLookup(null);
          setEditLookupMessage("");
        }}
        placeholder="pillar-of-hope"
        aria-label="Community Domain code to edit"
        style={{
          width: "100%",
          boxSizing: "border-box",
          minHeight: 46,
          borderRadius: 14,
          border: "1px solid rgba(9,27,46,0.16)",
          background: "rgba(255,255,255,0.95)",
          color: "#091B2E",
          fontSize: 16,
          fontWeight: 850,
          padding: "10px 12px",
          outline: "none",
        }}
      />
      <StableButton
        type="button"
        kind="primary"
        debugId="community-domain-dashboard.selector.find-edit-domain"
        disabled={editLookupBusy}
        onClick={() => {
          void findDomainForEdit();
        }}
      >
        {editLookupBusy ? "Finding domain..." : "Find domain"}
      </StableButton>
      {editLookupMessage ? (
        <div style={{ ...helperText(), fontSize: 13 }}>{editLookupMessage}</div>
      ) : null}
      {editLookup ? (
        <StableButton
          type="button"
          kind="secondary"
          debugId="community-domain-dashboard.selector.open-edit-domain"
          onClick={openDomainForEdit}
        >
          Open edit path
        </StableButton>
      ) : null}
    </div>
  );

  if (!domainItems.length) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        {startPanel}
        {editPanel}
        <div style={sectionLabel()}>No Community Domains yet</div>
        <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.1 }}>
          No owned domains on this account.
        </h2>
        <div style={helperText()}>
          This account has no active Community Domain membership to open here.
          You can set up a new domain, find an existing domain, or return to
          Community Home.
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StableCtaLink
            to="/community-domain/purchase"
            kind="primary"
            debugId="community-domain-dashboard.empty.purchase"
          >
            Check domain name
          </StableCtaLink>
          <StableCtaLink
            to={APP_ROUTES.COMMUNITY}
            kind="secondary"
            debugId="community-domain-dashboard.empty.community-home"
          >
            Community Home
          </StableCtaLink>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {startPanel}
      {editPanel}
      <div style={sectionLabel()}>Your Community Domains</div>
      <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.1 }}>
        Choose a Community Domain.
      </h2>
      <div style={helperText()}>
        Draft domains open setup first. Existing domains can be opened for
        owner-approved setup edits or normal operation.
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
          gap: 12,
        }}
      >
        {domainItems.map((item) => {
          const itemDomain = item?.community_domain || {};
          const itemMembership = item?.membership || {};
          const draftDomain = isDraftDomain(itemDomain);
          const path =
            cleanText(item?.dashboard_path) ||
            `/app/community-domain/${encodeURIComponent(String(itemDomain.id))}`;
          return (
            <div key={cleanText(itemDomain.id, path)} style={softCard()}>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={sectionLabel()}>
                  {item?.viewer?.can_admin ? "Owner/admin" : "Member"}
                </div>
                <h3 style={{ margin: 0, fontSize: 19, lineHeight: 1.14 }}>
                  {cleanText(itemDomain.display_name, "Community Domain")}
                </h3>
                <div style={helperText()}>
                  Code: <strong>{cleanText(itemDomain.domain_name, "not recorded")}</strong>
                  <br />
                  Role:{" "}
                  <strong style={{ textTransform: "capitalize" }}>
                    {compactStatus(itemMembership.role)}
                  </strong>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <span style={statusBadge(itemDomain.status)}>
                    Domain: {compactStatus(itemDomain.status)}
                  </span>
                  <span style={statusBadge(itemDomain.verification_status)}>
                    Verification: {compactStatus(itemDomain.verification_status)}
                  </span>
                </div>
                <StableCtaLink
                  to={path}
                  kind="primary"
                  fullWidth
                  debugId={`community-domain-dashboard.selector.open-${cleanText(
                    itemDomain.id,
                    "domain"
                  )}`}
                >
                  {draftDomain ? "Set up / edit" : "Open / edit"}
                </StableCtaLink>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
