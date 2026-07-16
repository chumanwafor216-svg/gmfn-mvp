import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GsnRealisticIcon,
  type Gsn3DIconKey,
} from "../../components/GsnRealisticIcon";
import { StableButton, StableCtaLink } from "../../components/StableButton";
import { APP_ROUTES } from "../../lib/appRoutes";
import { lookupCommunityDomainByName } from "../../lib/api";
import { humanStatus } from "./statusLanguage";

type DomainSelectorPanelProps = {
  domainItems?: any[];
};

type SelectorMode = "owned" | "start" | "edit";

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

function darkShell(): React.CSSProperties {
  return {
    borderRadius: 30,
    border: "1px solid rgba(220,231,243,0.10)",
    background:
      "radial-gradient(circle at 80% 0%, rgba(70,119,165,0.15) 0%, transparent 32%), linear-gradient(180deg, #111D2B 0%, #07111E 100%)",
    boxShadow:
      "0 30px 70px rgba(0,8,18,0.34), inset 0 1px 0 rgba(255,255,255,0.08)",
    padding: "26px 22px",
    color: "#FFFFFF",
    display: "grid",
    gap: 20,
  };
}

function darkLabel(): React.CSSProperties {
  return {
    color: "#F2C766",
    fontSize: 14,
    fontWeight: 950,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function pathGroup(): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(220,231,243,0.08)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.060) 0%, rgba(255,255,255,0.032) 100%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
    padding: 16,
    display: "grid",
    gap: 12,
  };
}

function pathActionStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 76,
    height: "auto",
    maxHeight: "none",
    borderRadius: 20,
    padding: "12px 14px",
    display: "grid",
    gridTemplateColumns: "58px minmax(0, 1fr) 24px",
    justifyContent: "stretch",
    alignItems: "center",
    gap: 14,
    border: "1px solid rgba(220,231,243,0.09)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.070) 0%, rgba(255,255,255,0.036) 100%)",
    color: "#FFFFFF",
    boxShadow: "none",
    textAlign: "left",
  };
}

function quickActionStyle(): React.CSSProperties {
  return {
    ...pathActionStyle(),
    minHeight: 64,
    gridTemplateColumns: "48px minmax(0, 1fr)",
    borderRadius: 18,
    fontSize: 14,
  };
}

function iconDisk(accent: "gold" | "green" | "blue" | "slate"): React.CSSProperties {
  const palette =
    accent === "gold"
      ? "linear-gradient(180deg, #F5D76E 0%, #D9A72E 100%)"
      : accent === "green"
      ? "linear-gradient(180deg, #75D878 0%, #2E9B62 100%)"
      : accent === "blue"
      ? "linear-gradient(180deg, #5FA1FF 0%, #225ED8 100%)"
      : "linear-gradient(180deg, #7D8EA4 0%, #304259 100%)";

  return {
    width: 54,
    height: 54,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: palette,
    boxShadow: "0 14px 26px rgba(0,8,18,0.22)",
  };
}

function pathText(): React.CSSProperties {
  return {
    minWidth: 0,
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: 950,
    lineHeight: 1.08,
    overflowWrap: "normal",
    wordBreak: "normal",
  };
}

function arrowStyle(color: string): React.CSSProperties {
  return {
    color,
    fontSize: 34,
    fontWeight: 500,
    lineHeight: 1,
    justifySelf: "end",
  };
}

function PathIcon({
  icon,
  accent,
  size = 40,
}: {
  icon: Gsn3DIconKey;
  accent: "gold" | "green" | "blue" | "slate";
  size?: number;
}) {
  return (
    <span style={iconDisk(accent)}>
      <GsnRealisticIcon name={icon} size={size} decorative />
    </span>
  );
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
  const [selectorMode, setSelectorMode] = useState<SelectorMode>(
    domainItems.length ? "owned" : "start"
  );
  const [editDomainName, setEditDomainName] = useState("");
  const [editLookup, setEditLookup] = useState<any | null>(null);
  const [editLookupMessage, setEditLookupMessage] = useState("");
  const [editLookupBusy, setEditLookupBusy] = useState(false);
  const [selectorNotice, setSelectorNotice] = useState("");

  useEffect(() => {
    setSelectorMode((current) => {
      if (domainItems.length && current === "start") return "owned";
      if (!domainItems.length && current === "owned") return "start";
      return current;
    });
  }, [domainItems.length]);

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

  function openMyDomains() {
    if (domainItems.length) {
      setSelectorMode("owned");
      setSelectorNotice("");
      return;
    }
    setSelectorNotice("No Community Domains are linked to this account yet.");
  }

  const startPanel = (
    <div style={darkShell()}>
      <div style={{ display: "grid", gap: 6 }}>
        <div
          style={{
            color: "rgba(255,255,255,0.66)",
            fontSize: 17,
            fontWeight: 950,
            letterSpacing: 0,
            textTransform: "uppercase",
          }}
        >
          GSN / Community Domain
        </div>
        <h2 style={{ margin: 0, fontSize: 34, lineHeight: 1.03, fontWeight: 950 }}>
          Choose a Path
        </h2>
      </div>

      <div style={pathGroup()}>
        <div style={darkLabel()}>Community path</div>
        <StableCtaLink
          to="/create"
          kind="secondary"
          stableHeight={76}
          debugId="community-domain-dashboard.selector.free-committee"
          style={pathActionStyle()}
        >
          <PathIcon icon="join-person-plus" accent="gold" />
          <span style={pathText()}>Free Committee</span>
          <span aria-hidden="true" style={arrowStyle("#F2C766")}>
            &gt;
          </span>
        </StableCtaLink>
      </div>

      <div style={pathGroup()}>
        <div style={darkLabel()}>Domain path</div>
        <StableCtaLink
          to="/community-domain/purchase"
          kind="secondary"
          stableHeight={76}
          debugId="community-domain-dashboard.selector.setup-new"
          style={pathActionStyle()}
        >
          <PathIcon icon="finance-bank-building" accent="green" />
          <span style={pathText()}>Buy Domain</span>
          <span aria-hidden="true" style={arrowStyle("#57C76D")}>
            &gt;
          </span>
        </StableCtaLink>
        <StableButton
          type="button"
          kind="secondary"
          stableHeight={76}
          debugId="community-domain-dashboard.selector.edit-existing-focus"
          style={pathActionStyle()}
          onClick={() => {
            setSelectorMode("edit");
            setSelectorNotice("");
            setEditLookupMessage(
              "Enter the Community Domain code below, then tap Find domain."
            );
          }}
        >
          <PathIcon icon="public-globe" accent="blue" />
          <span style={pathText()}>Find Domain</span>
          <span aria-hidden="true" style={arrowStyle("#4D8DF7")}>
            &gt;
          </span>
        </StableButton>
      </div>

      <div style={pathGroup()}>
        <div
          style={{
            color: "rgba(255,255,255,0.62)",
            fontSize: 13,
            fontWeight: 950,
            textTransform: "uppercase",
          }}
        >
          Quick actions
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <StableButton
            type="button"
            kind="secondary"
            stableHeight={64}
            debugId="community-domain-dashboard.selector.my-domains"
            style={quickActionStyle()}
            onClick={openMyDomains}
          >
            <PathIcon icon="records-folder" accent="blue" size={35} />
            <span style={{ ...pathText(), fontSize: 17 }}>My Domains</span>
          </StableButton>
          <StableCtaLink
            to={APP_ROUTES.SETTINGS}
            kind="secondary"
            stableHeight={64}
            debugId="community-domain-dashboard.selector.settings"
            style={quickActionStyle()}
          >
            <PathIcon icon="identity-card" accent="slate" size={35} />
            <span style={{ ...pathText(), fontSize: 17 }}>Settings</span>
          </StableCtaLink>
        </div>
        {selectorNotice ? (
          <div role="status" style={{ color: "rgba(255,255,255,0.76)", fontSize: 13 }}>
            {selectorNotice}
          </div>
        ) : null}
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
      <StableButton
        type="button"
        kind="secondary"
        debugId="community-domain-dashboard.selector.back-to-choice"
        onClick={() => {
          setSelectorMode(domainItems.length ? "owned" : "start");
          setEditLookupMessage("");
          setEditLookup(null);
        }}
      >
        Back to choices
      </StableButton>
    </div>
  );

  const quickPathRow = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
        gap: 10,
      }}
    >
      <StableCtaLink
        to="/community-domain/purchase"
        kind="secondary"
        debugId="community-domain-dashboard.selector.setup-new-compact"
      >
        Set up new domain
      </StableCtaLink>
      <StableButton
        type="button"
        kind="secondary"
        debugId="community-domain-dashboard.selector.edit-existing-compact"
        onClick={() => {
          setSelectorMode("edit");
          setSelectorNotice("");
          setEditLookupMessage(
            "Enter the Community Domain code below, then tap Find domain."
          );
        }}
      >
        Find existing domain
      </StableButton>
    </div>
  );

  if (!domainItems.length) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        {selectorMode === "edit" ? editPanel : startPanel}
      </div>
    );
  }

  if (selectorMode === "start") {
    return <div style={{ display: "grid", gap: 12 }}>{startPanel}</div>;
  }

  if (selectorMode === "edit") {
    return <div style={{ display: "grid", gap: 12 }}>{editPanel}</div>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={sectionLabel()}>Your Community Domains</div>
      <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.1 }}>
        Choose a Domain.
      </h2>
      <div style={helperText()}>
        Drafts continue setup. Active domains open their institutional operating
        home, then hand off to Marketplace when the domain is ready.
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
              <div style={{ display: "grid", gap: 10 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "58px minmax(0, 1fr)",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <span style={iconDisk("slate")}>
                    <GsnRealisticIcon
                      name="finance-bank-building"
                      size={43}
                      decorative
                    />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: 21, lineHeight: 1.12 }}>
                      {cleanText(itemDomain.display_name, "Community Domain")}
                    </h3>
                    <div style={{ ...helperText(), marginTop: 5 }}>
                      Code: <strong>{cleanText(itemDomain.domain_name, "not recorded")}</strong>
                      <br />
                      Role:{" "}
                      <strong style={{ textTransform: "capitalize" }}>
                        {compactStatus(itemMembership.role)}
                      </strong>
                    </div>
                  </div>
                </div>
                <div style={helperText()}>
                  {item?.viewer?.can_admin ? "Owner/admin" : "Member"}
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
                  {draftDomain ? "Continue setup" : "Open domain"}
                </StableCtaLink>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ ...softCard(), display: "grid", gap: 10 }}>
        <div style={sectionLabel()}>Other paths</div>
        <div style={helperText()}>
          Use these only when you are adding a new institutional domain or
          looking up a known domain code.
        </div>
        {quickPathRow}
      </div>
    </div>
  );
}
