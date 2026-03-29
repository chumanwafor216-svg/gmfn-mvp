import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";

const PDF_FALLBACK_TO = "/GSN_FINAL_WHITE.pdf";

type EntryMode = "general" | "create" | "invite" | "approved" | "existing";

type GuideBlock = {
  title: string;
  text: string;
};

type RouteBlock = {
  title: string;
  text: string;
};

type BenefitBlock = {
  no: number;
  title: string;
  text: string;
};

const FIXED_RULES: GuideBlock[] = [
  {
    title: "One person, one global identity",
    text: "Each user carries one global GMFN ID across the system. Identity should not split from one community to another.",
  },
  {
    title: "One identity, one global shop",
    text: "One identity carries one global shop. Shop visibility may appear across surfaces, but the underlying shop remains attached to the same identity.",
  },
  {
    title: "Demand follows identity",
    text: "Demand belongs to the person asking. It is identity-based, not a separate anonymous layer.",
  },
  {
    title: "Spotlight follows shop",
    text: "Spotlight belongs to the shop surface. It is not the same as demand, and it should not be confused with it.",
  },
  {
    title: "Community Home is private control",
    text: "Community Home is owner-only. It is not the public browsing surface and not the marketplace itself.",
  },
  {
    title: "Marketplace is a selected-community surface",
    text: "Marketplace reflects the selected community context. Shop Gallery is the viewing surface for a shop.",
  },
  {
    title: "Admin belongs only in Command Center",
    text: "Administrative tools must stay in Command Center. Member pages should stay clean and member-facing.",
  },
];

const READING_BLOCKS: GuideBlock[] = [
  {
    title: "Identity",
    text: "The identity layer explains who is participating. It should be stable, portable, and properly issued rather than casually self-assigned.",
  },
  {
    title: "Trust",
    text: "Trust summaries help explain how the identity is currently standing. They should be readable, calm, and easy to act on.",
  },
  {
    title: "Community",
    text: "Community is where participation, approvals, relationships, and visibility become structured. It is not just a social feed.",
  },
  {
    title: "Demand",
    text: "Demand shows what a person needs. It stays attached to the identity of the requester.",
  },
  {
    title: "Spotlight",
    text: "Spotlight shows what a shop wants to present. It is shop-based visibility, not the same thing as personal demand.",
  },
  {
    title: "Marketplace and shop",
    text: "Marketplace is the selected community market surface. Shop Gallery is the member and public viewing surface for a shop.",
  },
];

const ENTRY_PATHS: RouteBlock[] = [
  {
    title: "General public path",
    text: "Cover → Welcome → My GMFN and I or Login → Dashboard",
  },
  {
    title: "Founder / create path",
    text: "Cover → Create Entry → GMFN issuance → Dashboard",
  },
  {
    title: "Invited join path",
    text: "Cover → Join Entry → Pending Approval → Activation → GMFN issuance → Dashboard",
  },
  {
    title: "Existing user path",
    text: "Cover or Welcome → Login → Dashboard",
  },
];

const GMFN_21_THINGS: BenefitBlock[] = [
  {
    no: 1,
    title: "Gives you one global GMFN ID",
    text: "You receive one identity that stays with you across visible communities.",
  },
  {
    no: 2,
    title: "Attaches one global shop to your identity",
    text: "Your shop remains tied to your identity instead of becoming a separate broken surface.",
  },
  {
    no: 3,
    title: "Lets you appear properly in communities",
    text: "You can participate in communities through a structured membership and trust path.",
  },
  {
    no: 4,
    title: "Shows your immediate Open Trust reading",
    text: "You can see how you are currently standing in the community you are operating in now.",
  },
  {
    no: 5,
    title: "Shows your CCI reading",
    text: "You can see your cross-community integrity reading across visible communities.",
  },
  {
    no: 6,
    title: "Gives you a TrustSlip",
    text: "You can hold a trust verification surface without confusing it with the main trust explanation page.",
  },
  {
    no: 7,
    title: "Gives you a QR verification path",
    text: "A QR code helps others verify the TrustSlip more easily.",
  },
  {
    no: 8,
    title: "Lets you post demand as yourself",
    text: "Your requests stay identity-based and connected to the person asking.",
  },
  {
    no: 9,
    title: "Lets your shop appear in spotlight",
    text: "Spotlight gives shop-based visibility without merging it into demand.",
  },
  {
    no: 10,
    title: "Lets your shop appear in marketplace",
    text: "Your shop can become visible in the selected community surface.",
  },
  {
    no: 11,
    title: "Gives you a Shop Gallery surface",
    text: "Other members and the public can view your shop in a dedicated viewing surface.",
  },
  {
    no: 12,
    title: "Gives you Community Home access",
    text: "When appropriate, you can work through the private owner-facing community surface.",
  },
  {
    no: 13,
    title: "Lets communities invite and review entry properly",
    text: "Entry can move through invite, join, approval, and activation instead of informal confusion.",
  },
  {
    no: 14,
    title: "Shows you notifications that matter",
    text: "You can see important updates for trust, join requests, demand, spotlight, and money movement.",
  },
  {
    no: 15,
    title: "Supports loans and support pathways",
    text: "You can move into support, readiness, and related economic tools from one workspace.",
  },
  {
    no: 16,
    title: "Supports pool payment guidance",
    text: "You can see the payment route connected to your support or pool activity.",
  },
  {
    no: 17,
    title: "Supports withdrawal guidance",
    text: "You can follow structured withdrawal instructions where available.",
  },
  {
    no: 18,
    title: "Supports readiness and workbench tools",
    text: "You can review readiness, suggestions, and workbench movement where those tools apply.",
  },
  {
    no: 19,
    title: "Shows guarantor earnings where relevant",
    text: "You can see guarantor-related earnings in the correct place instead of scattered surfaces.",
  },
  {
    no: 20,
    title: "Helps protect identity integrity",
    text: "The system gives a place to understand identity consistency and risk signals.",
  },
  {
    no: 21,
    title: "Gives you one guided dashboard",
    text: "You start from a calmer home page that helps you move into trust, community, demand, marketplace, and shop in a structured way.",
  },
];

function readStorage(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    const value = window.localStorage.getItem(key);
    return value == null ? null : String(value);
  } catch {
    return null;
  }
}

function hasAccessToken(): boolean {
  return Boolean(String(readStorage("access_token") || "").trim());
}

function getEntryMode(): EntryMode | null {
  const raw = String(readStorage("gmfn_entry_mode") || "").trim().toLowerCase();

  if (
    raw === "general" ||
    raw === "create" ||
    raw === "invite" ||
    raw === "approved" ||
    raw === "existing"
  ) {
    return raw as EntryMode;
  }

  return null;
}

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background: "#F4F8FC",
    padding: "24px 18px 42px",
    boxSizing: "border-box",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 26,
    background: bg,
    border: "1px solid rgba(11,31,51,0.08)",
    boxShadow:
      "0 18px 44px rgba(15,23,42,0.05), 0 2px 10px rgba(15,23,42,0.02)",
    padding: 22,
  };
}

function softPanel(): React.CSSProperties {
  return {
    borderRadius: 20,
    background: "#F8FBFF",
    border: "1px solid rgba(11,31,51,0.08)",
    padding: 18,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    background: bg,
    border: "1px solid rgba(11,31,51,0.08)",
    padding: 16,
  };
}

function chip(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 34,
    padding: "7px 12px",
    borderRadius: 999,
    background: "rgba(11,99,209,0.08)",
    color: "#0B63D1",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.2,
  };
}

function utilityLink(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    padding: "9px 12px",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 800,
    border: "1px solid rgba(11,31,51,0.10)",
    fontSize: 14,
    whiteSpace: "nowrap",
  };
}

function primaryBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    padding: "12px 16px",
    borderRadius: 16,
    background: "#0B63D1",
    color: "#FFFFFF",
    textDecoration: "none",
    fontWeight: 900,
    border: "none",
    fontSize: 15,
    whiteSpace: "nowrap",
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    padding: "12px 16px",
    borderRadius: 16,
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 800,
    border: "1px solid rgba(11,31,51,0.10)",
    fontSize: 15,
    whiteSpace: "nowrap",
  };
}

function backBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    padding: "10px 14px",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 800,
    border: "1px solid rgba(11,31,51,0.10)",
    cursor: "pointer",
    fontSize: 14,
  };
}

function labelText(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 900,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  };
}

function getContinueTarget(
  isMemberRoute: boolean,
  signedIn: boolean,
  entryMode: EntryMode | null
): { label: string; to: string } {
  if (isMemberRoute || signedIn) {
    return {
      label: "Open Dashboard",
      to: "/app/dashboard",
    };
  }

  if (entryMode === "create") {
    return {
      label: "Continue to Create Entry",
      to: "/create",
    };
  }

  if (entryMode === "invite") {
    return {
      label: "Continue to Join Entry",
      to: "/join",
    };
  }

  if (entryMode === "approved") {
    return {
      label: "Continue to Activation",
      to: "/activate-membership",
    };
  }

  return {
    label: "Continue to Login",
    to: "/login",
  };
}

export default function MyGMFNAndIPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 920;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 920);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMemberRoute = useMemo(
    () => location.pathname.startsWith("/app/"),
    [location.pathname]
  );

  const signedIn = useMemo(() => hasAccessToken(), []);
  const entryMode = useMemo(() => getEntryMode(), []);
  const continueTarget = useMemo(
    () => getContinueTarget(isMemberRoute, signedIn, entryMode),
    [isMemberRoute, signedIn, entryMode]
  );

  function goBackPublic() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/welcome");
  }

  return (
    <div style={pageShell()}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        {isMemberRoute ? (
          <PageTopNav
            sectionLabel="Guide"
            title="My GMFN and I"
            subtitle="A plain-language guide to identity, trust, community, demand, shop, entry flow, and the concrete things GMFN can do for you."
            homeTo="/app/dashboard"
            homeLabel="Dashboard"
            backTo="/app/dashboard"
            nextLinks={[
              { label: "Trust", to: "/app/trust" },
              { label: "Community", to: "/app/community" },
              { label: "Marketplace", to: "/app/marketplace" },
            ]}
            utilityLinks={[
              { label: "Notifications", to: "/app/notifications" },
            ]}
          />
        ) : (
          <div
            style={{
              marginBottom: 14,
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button type="button" onClick={goBackPublic} style={backBtn()}>
              ← Back
            </button>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link to="/cover" style={utilityLink()}>
                Cover
              </Link>
              <Link to="/welcome" style={utilityLink()}>
                Welcome
              </Link>
              <Link to={continueTarget.to} style={utilityLink()}>
                {continueTarget.label}
              </Link>
            </div>
          </div>
        )}

        <section
          style={{
            ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
            padding: isCompact ? 22 : 30,
          }}
        >
          <div style={labelText()}>
            {isMemberRoute ? "Member guide" : "Public guide"}
          </div>

          <div style={{ marginTop: 12 }}>
            <span style={chip()}>My GMFN and I</span>
          </div>

          <h1
            style={{
              margin: "14px 0 0",
              fontSize: isCompact ? 32 : 46,
              lineHeight: 1.06,
              fontWeight: 900,
              color: "#0B1F33",
              maxWidth: 860,
            }}
          >
            A calmer explanation of what the system is doing, what it can do for
            you, and where you fit into it.
          </h1>

          <p
            style={{
              margin: "14px 0 0",
              fontSize: 17,
              lineHeight: 1.82,
              color: "#35516B",
              maxWidth: 920,
            }}
          >
            This page is for people who need plain language, guided movement,
            and lower cognitive burden. It now does two things together: it
            explains the system, and it clearly shows the practical things GMFN
            can do for you.
          </p>

          <div
            style={{
              marginTop: 20,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Link to={continueTarget.to} style={primaryBtn()}>
              {continueTarget.label}
            </Link>

            <a
              href={PDF_FALLBACK_TO}
              target="_blank"
              rel="noreferrer"
              style={secondaryBtn()}
            >
              Open PDF fallback
            </a>
          </div>
        </section>

        <section
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.18fr) minmax(320px, 0.82fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div style={pageCard("#FFFFFF")}>
            <div style={labelText()}>The core idea</div>

            <div
              style={{
                marginTop: 12,
                color: "#0B1F33",
                fontSize: isCompact ? 25 : 32,
                fontWeight: 900,
                lineHeight: 1.15,
                maxWidth: 820,
              }}
            >
              The system is trying to make real trust easier to see, easier to
              understand, and easier to use.
            </div>

            <div
              style={{
                marginTop: 12,
                color: "#5E7288",
                fontSize: 15,
                lineHeight: 1.85,
                maxWidth: 900,
              }}
            >
              Many people already move through life using trust, relationships,
              reputation, and community knowledge. GMFN / GSN does not try to
              replace that reality. It tries to structure it better so that
              people can move with more clarity, less confusion, and more
              practical confidence.
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div style={innerCard("#F8FBFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 16,
                  }}
                >
                  Plain language
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#5E7288",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  The experience should explain itself clearly instead of
                  sounding technical or abstract.
                </div>
              </div>

              <div style={innerCard("#F8FBFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 16,
                  }}
                >
                  Guided movement
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#5E7288",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  A person should know where to go next without being forced to
                  interpret too many choices at once.
                </div>
              </div>

              <div style={innerCard("#F8FBFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 16,
                  }}
                >
                  Institutional calm
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#5E7288",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  The system should feel trustworthy, ordered, and safe for
                  unbanked and underbanked users.
                </div>
              </div>
            </div>
          </div>

          <div style={pageCard("#F8FBFF")}>
            <div style={labelText()}>How to use this page</div>

            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              <div style={softPanel()}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: 15,
                    fontWeight: 900,
                  }}
                >
                  First
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#5E7288",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  Read the fixed rules so you understand what does not change in
                  the system.
                </div>
              </div>

              <div style={softPanel()}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: 15,
                    fontWeight: 900,
                  }}
                >
                  Then
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#5E7288",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  Read the 21 practical things GMFN can do for you.
                </div>
              </div>

              <div style={softPanel()}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: 15,
                    fontWeight: 900,
                  }}
                >
                  After that
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#5E7288",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  Continue using the route that matches your real stage in the
                  system.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            marginTop: 18,
            ...pageCard("#FFFFFF"),
          }}
        >
          <div style={labelText()}>What stays fixed</div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {FIXED_RULES.map((item) => (
              <div key={item.title} style={innerCard("#FCFEFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: 16,
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  {item.title}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#5E7288",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            marginTop: 18,
            ...pageCard("#FFFFFF"),
          }}
        >
          <div style={labelText()}>21 things GMFN can do for you</div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {GMFN_21_THINGS.map((item) => (
              <div key={item.no} style={innerCard("#FCFEFF")}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 34,
                    height: 34,
                    borderRadius: 999,
                    background: "rgba(11,99,209,0.08)",
                    color: "#0B63D1",
                    fontWeight: 900,
                    fontSize: 13,
                  }}
                >
                  {item.no}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    color: "#0B1F33",
                    fontSize: 16,
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  {item.title}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#5E7288",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            marginTop: 18,
            ...pageCard("#FFFFFF"),
          }}
        >
          <div style={labelText()}>How to read the system</div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {READING_BLOCKS.map((item) => (
              <div key={item.title} style={innerCard("#FFFFFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: 16,
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  {item.title}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#5E7288",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            marginTop: 18,
            ...pageCard("#F8FBFF"),
          }}
        >
          <div style={labelText()}>Entry map</div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {ENTRY_PATHS.map((item) => (
              <div key={item.title} style={innerCard("#FFFFFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 16,
                    lineHeight: 1.35,
                  }}
                >
                  {item.title}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#5E7288",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            marginTop: 18,
            ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
          }}
        >
          <div style={labelText()}>Continue</div>

          <div
            style={{
              marginTop: 10,
              color: "#0B1F33",
              fontSize: isCompact ? 26 : 34,
              fontWeight: 900,
              lineHeight: 1.12,
              maxWidth: 760,
            }}
          >
            Move forward using the route that matches your real stage.
          </div>

          <div
            style={{
              marginTop: 12,
              color: "#5E7288",
              fontSize: 15,
              lineHeight: 1.8,
              maxWidth: 860,
            }}
          >
            This guide should reduce confusion, not create more of it. Once you
            understand the main idea and the practical benefits, continue to the
            correct next step.
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Link to={continueTarget.to} style={primaryBtn()}>
              {continueTarget.label}
            </Link>

            {isMemberRoute ? (
              <Link to="/app/dashboard" style={secondaryBtn()}>
                Back to Dashboard
              </Link>
            ) : (
              <Link to="/welcome" style={secondaryBtn()}>
                Back to Welcome
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}