import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import SpotlightMediaFrame from "../components/SpotlightMediaFrame";
import {
  getVaultShopAccessView,
  recordVaultShopAccessOpen,
  type VaultShopAccessProduct,
  type VaultShopAccessView,
} from "../lib/api";

type NoticeTone = "error" | "info";

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function firstTruthy(...values: unknown[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 84% 8%, rgba(84,123,169,0.12) 0%, rgba(84,123,169,0.00) 28%), radial-gradient(circle at 18% 88%, rgba(58,92,134,0.12) 0%, rgba(58,92,134,0.00) 28%), linear-gradient(180deg, #06111C 0%, #0A1B2B 46%, #102A43 100%)",
    padding: "34px 22px",
    boxSizing: "border-box",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(17,37,58,0.11)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 24px 56px rgba(8,18,34,0.10), inset 0 1px 0 rgba(255,255,255,0.72)",
    overflow: "hidden",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(17,37,58,0.10)",
    background: bg,
    padding: 14,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5D7389",
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary
      ? "linear-gradient(180deg, rgba(235,244,255,0.98) 0%, rgba(218,233,249,0.88) 100%)"
      : "linear-gradient(180deg, rgba(248,251,254,0.96) 0%, rgba(232,239,247,0.86) 100%)",
    color: primary ? "#1D4ED8" : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.74)",
  };
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  return {
    ...pageCard(tone === "error" ? "#FEF2F2" : "#F8FBFF"),
    border:
      tone === "error"
        ? "1px solid rgba(239,68,68,0.16)"
        : "1px solid rgba(11,31,51,0.08)",
    color: tone === "error" ? "#991B1B" : "#24415C",
  };
}

function actionBtn(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "10px 16px",
    borderRadius: 14,
    border: primary
      ? "1px solid rgba(82,128,186,0.62)"
      : "1px solid rgba(16,37,59,0.12)",
    background: primary
      ? "linear-gradient(180deg, #2D6AA3 0%, #235784 52%, #173E63 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(229,237,249,0.98) 100%)",
    color: primary ? "#FFFFFF" : "#123055",
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 14,
    textAlign: "center",
    boxShadow: primary
      ? "0 18px 32px rgba(1,13,32,0.24), inset 0 1px 0 rgba(196,222,247,0.34), inset 0 -8px 12px rgba(8,25,43,0.20)"
      : "0 14px 28px rgba(10,24,49,0.16), inset 0 1px 0 rgba(255,255,255,0.82), inset 0 -6px 10px rgba(120,142,170,0.10)",
  };
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";

  return String(raw || "").trim().replace(/\/+$/, "");
}

function apiOrigin(): string {
  const base = apiBase();

  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      const url = new URL(base);
      return `${url.protocol}//${url.host}`;
    } catch {
      return typeof window !== "undefined"
        ? String(window.location.origin || "").trim().replace(/\/+$/, "")
        : "";
    }
  }

  return typeof window !== "undefined"
    ? String(window.location.origin || "").trim().replace(/\/+$/, "")
    : "";
}

function resolveAssetSrc(raw: unknown): string {
  const value = safeStr(raw);
  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${apiOrigin()}${value}`;
  }

  return `${apiOrigin()}/${value.replace(/^\/+/, "")}`;
}

function statusLabel(status: string): string {
  if (status === "active") return "Access active";
  if (status === "expired") return "Link expired";
  if (status === "revoked") return "Link revoked";
  if (status === "exhausted") return "View limit reached";
  if (status === "product_inactive") return "Private block unavailable";
  if (status === "block_inactive") return "Private block unavailable";
  return "Access unavailable";
}

function safeDateTime(value: unknown): string {
  const raw = safeStr(value);
  if (!raw) return "Not set";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleString();
}

function productPriceText(product: VaultShopAccessProduct): string {
  const price = safeStr(product?.price);
  const currency = firstTruthy(product?.currency, "NGN");
  if (!price) return "Price shared inside this private access";
  return `${price} ${currency}`.trim();
}

export default function ShopAccessPage() {
  const params = useParams<{ token?: string }>();
  const token = safeStr(params.token);

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [view, setView] = useState<VaultShopAccessView | null>(null);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "GSN | Vault Access";
    }
  }, []);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!token) {
        setErrorText("This Vault link is missing its access token.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorText("");

      try {
        const res = await getVaultShopAccessView(token);
        if (!alive) return;
        setView(res || null);

        const nextStatus = safeStr(res?.status).toLowerCase();

        if (nextStatus === "active") {
          void recordVaultShopAccessOpen(token).catch(() => {
            // Opening the Vault view should not fail only because telemetry/open tracking did not return.
          });
        }

        if (nextStatus !== "active") {
          setErrorText(
            firstTruthy(
              res?.disclaimer,
              res?.raw?.detail,
              "This Vault access link is not active."
            )
          );
        }
      } catch (err: any) {
        if (!alive) return;
        setErrorText(
          safeStr(err?.message) || "This Vault access link could not be opened."
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [token]);

  const status = useMemo(
    () => safeStr(view?.status).toLowerCase() || "invalid",
    [view]
  );

  const products = useMemo(
    () => (Array.isArray(view?.products) ? view?.products : []),
    [view]
  );

  const publicShopRoute = useMemo(() => {
    const gmfnId = safeStr(view?.gmfn_id);
    return gmfnId ? `/shop/${encodeURIComponent(gmfnId)}` : "";
  }, [view]);

  const restrictionBadges = useMemo(() => {
    const policy = view?.policy || {};
    return [
      `Download: ${policy.allow_download ? "Allowed" : "Restricted"}`,
      `Print: ${policy.allow_print ? "Allowed" : "Restricted"}`,
      `Reshare: ${policy.allow_reshare ? "Allowed" : "Restricted"}`,
      `Watermark: ${policy.watermark_enabled === false ? "Off" : "On"}`,
    ];
  }, [view]);

  if (loading) {
    return (
      <div style={pageShell()}>
        <div style={{ maxWidth: 1040, margin: "0 auto", display: "grid", gap: 18 }}>
          <section style={pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)")}>
            <div style={sectionLabel()}>Vault access</div>
            <div style={{ marginTop: 10, color: "#F8FBFF", fontSize: 30, fontWeight: 1000 }}>
              Opening private access
            </div>
            <div style={{ marginTop: 12, ...helperText(), color: "#D7E3F1" }}>
              Verifying this private access link and loading the restricted shop view.
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (status !== "active") {
    return (
      <div style={pageShell()}>
        <div style={{ maxWidth: 1040, margin: "0 auto", display: "grid", gap: 18 }}>
          <section style={noticeCard("error")}>
            <div style={sectionLabel()}>Vault access</div>
            <div style={{ marginTop: 10, fontSize: 30, fontWeight: 1000 }}>
              {statusLabel(status)}
            </div>
            <div style={{ marginTop: 12, lineHeight: 1.75 }}>
              {errorText || "This private access link is not available anymore."}
            </div>
            <div style={{ marginTop: 14 }}>
              <ExplainToggle
                label="What this does"
                what="This result shows that the private vault link cannot be used right now."
                why="It helps you tell the difference between a restricted link and a normal open shop page."
                next="Check the status and expiry details here, then return to the sender or request a fresh access link if you still need entry."
                tone="light"
              />
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(false)}>Status: {status || "invalid"}</span>
              <span style={badge(false)}>
                Expiry: {safeDateTime(view?.policy?.expires_at)}
              </span>
              <span style={badge(false)}>
                Views: {safeStr(view?.policy?.views_used || 0)} /{" "}
                {safeStr(view?.policy?.max_views || "Unlimited")}
              </span>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <OriginLink to="/welcome" style={actionBtn(false)}>
                  Back to Welcome
                </OriginLink>
                {publicShopRoute ? (
                  <OriginLink to={publicShopRoute} style={actionBtn(true)}>
                    Open public shop face
                  </OriginLink>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div style={pageShell()}>
      <div style={{ maxWidth: 1040, margin: "0 auto", display: "grid", gap: 18 }}>
        <ExplainToggle
          label="What this screen does"
          what="This screen handles private vault access to a shared shop view and explains why you can see this protected part of the shop."
          why="It makes the access rules visible so private shop access does not feel random or permanent."
          next="Check the vault status and access explanation first, then continue only while the shared access remains active."
          tone="light"
        />

        <section
          style={pageCard(
            "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
          )}
        >
          <div style={sectionLabel()}>Vault access</div>
          <div style={{ marginTop: 10, color: "#F8FBFF", fontSize: 34, fontWeight: 1000 }}>
            {firstTruthy(view?.shop_name, "Private vault shop")}
          </div>
          <div style={{ marginTop: 12, ...helperText(), maxWidth: 860, color: "#D7E3F1" }}>
            {firstTruthy(
              view?.shop_description,
              "You can see this private shop because the owner shared access with you."
            )}
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(true)}>Status: {statusLabel(status)}</span>
            <span style={badge(false)}>
              Community: {firstTruthy(view?.community_name, "Private community")}
            </span>
            <span style={badge(false)}>
              Merchant: {firstTruthy(view?.owner_name, view?.gmfn_id, "GSN merchant")}
            </span>
            <span style={badge(false)}>Current page: Vault access</span>
            <span style={badge(false)}>Current step: Private access</span>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {publicShopRoute ? (
              <OriginLink to={publicShopRoute} style={actionBtn(false)}>
                Open public shop face
              </OriginLink>
            ) : null}
            <OriginLink to="/welcome" style={actionBtn(true)}>
              Return to entry
            </OriginLink>
          </div>
        </section>

        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Access explanation</div>
          <div style={{ marginTop: 10, ...helperText(), maxWidth: 860 }}>
            You are viewing a private part of this shop. Access was shared by the owner and it can
            end when the time, view limit, or access rules are reached.
          </div>

          <ExplainToggle
            label="What this does"
            what="This access explanation makes the private access rules clear, including why access exists and why it may end."
            why="It helps visitors understand that vault access is permission-based rather than a permanent open shop state."
            next="Read the access explanation first, then decide whether to continue browsing, contact the owner, or return later."
            tone="light"
            style={{ marginTop: 14 }}
          />

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div
              style={{
                ...innerCard("rgba(248,251,255,0.98)"),
                border: "1px solid rgba(212,175,55,0.12)",
              }}
            >
              <div style={sectionLabel()}>Why you can see this</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                The owner shared a live Vault access link with you.
              </div>
            </div>

            <div
              style={{
                ...innerCard("rgba(255,251,239,0.98)"),
                border: "1px solid rgba(212,175,55,0.14)",
              }}
            >
              <div style={sectionLabel()}>What can end access</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                Access can end when the link expires, is turned off, or reaches its view limit.
              </div>
            </div>

            <div
              style={{
                ...innerCard("rgba(248,251,255,0.98)"),
                border: "1px solid rgba(11,99,209,0.10)",
              }}
            >
              <div style={sectionLabel()}>Current route state</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                This Vault route is now active and recorded as a private-access open. Stay on this
                path until you finish reviewing the approved private offers or the owner gives you a
                different next step.
              </div>
            </div>
          </div>
        </section>

        {safeStr(view?.banner_url || view?.image_url) ? (
          <section style={pageCard("#FFFFFF")}>
            <div
              style={{
                width: "100%",
                minHeight: 300,
                borderRadius: 28,
                overflow: "hidden",
                background:
                  "linear-gradient(180deg, #0A1625 0%, #11263B 56%, #193A58 100%)",
                border: "1px solid rgba(212,175,55,0.16)",
                padding: 10,
                boxShadow:
                  "0 22px 48px rgba(2,12,27,0.22), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  minHeight: 280,
                  borderRadius: 22,
                  overflow: "hidden",
                  border: "1px solid rgba(212,175,55,0.12)",
                }}
              >
                <img
                  src={firstTruthy(view?.banner_url, view?.image_url)}
                  alt={firstTruthy(view?.shop_name, "Vault shop")}
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: 300,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>
            </div>
          </section>
        ) : null}

        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Access details</div>
          <div style={{ marginTop: 10, ...helperText(), maxWidth: 860 }}>
            These details show how this private access works. They explain what is allowed here,
            but they do not promise impossible device-wide blocking.
          </div>
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <div
              style={{
                ...innerCard("rgba(252,254,255,0.98)"),
                border: "1px solid rgba(212,175,55,0.12)",
              }}
            >
              <div style={sectionLabel()}>Expiry</div>
              <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900, lineHeight: 1.4 }}>
                {safeDateTime(view?.policy?.expires_at)}
              </div>
            </div>

            <div
              style={{
                ...innerCard("rgba(252,254,255,0.98)"),
                border: "1px solid rgba(212,175,55,0.12)",
              }}
            >
              <div style={sectionLabel()}>Views used</div>
              <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900, lineHeight: 1.4 }}>
                {safeStr(view?.policy?.views_used || 0)} /{" "}
                {safeStr(view?.policy?.max_views || "Unlimited")}
              </div>
            </div>

            <div
              style={{
                ...innerCard("rgba(252,254,255,0.98)"),
                border: "1px solid rgba(212,175,55,0.12)",
              }}
            >
              <div style={sectionLabel()}>What is allowed here</div>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {restrictionBadges.map((item) => (
                  <span key={item} style={badge(false)}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>What to do next</div>
          <div style={{ marginTop: 10, ...helperText(), maxWidth: 860 }}>
            Use this route only for the private offers that were intentionally shared with you.
            If you need the wider storefront, return to the public shop face. If this link no
            longer serves the purpose you were given, go back to entry and wait for a fresh access
            path.
          </div>
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div style={innerCard("rgba(248,251,255,0.98)")}>
              <div style={sectionLabel()}>Stay here when</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                You are reviewing the selected private offers that were shared through this Vault
                link.
              </div>
            </div>
            <div style={innerCard("rgba(248,251,255,0.98)")}>
              <div style={sectionLabel()}>Leave this route when</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                You want the normal public shop view, you need a different access path, or the
                sender told you to continue somewhere else.
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {publicShopRoute ? (
              <OriginLink to={publicShopRoute} style={actionBtn(false)}>
                Open public shop face
              </OriginLink>
            ) : null}
            <OriginLink to="/welcome" style={actionBtn(true)}>
              Back to Welcome
            </OriginLink>
          </div>
        </section>

        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Private products</div>
          <div style={{ marginTop: 10, ...helperText(), maxWidth: 860 }}>
            Only the private offers shared through this access link are shown here.
          </div>

          {safeStr(view?.disclaimer) ? (
            <div style={{ marginTop: 14, ...noticeCard("info") }}>
              {safeStr(view?.disclaimer)}
            </div>
          ) : null}

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            {products.length === 0 ? (
              <div style={{ ...helperText(), gridColumn: "1 / -1" }}>
                This access link is active, but no private offers are being shown right now.
              </div>
            ) : (
              products.map((product, index) => {
                const productImageUrl = resolveAssetSrc(product?.image_url);
                const productVideoUrl = resolveAssetSrc(product?.video_url);
                const productTitle = firstTruthy(product?.name, "Vault product");

                return (
                  <div
                    key={`${safeStr(product?.id) || index}`}
                    style={{
                      ...innerCard(
                        "linear-gradient(180deg, #0A1625 0%, #11263B 56%, #193A58 100%)"
                      ),
                      border: "1px solid rgba(212,175,55,0.16)",
                      boxShadow: "0 18px 40px rgba(2,12,27,0.22)",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: 220,
                        borderRadius: 16,
                        overflow: "hidden",
                        background:
                          "linear-gradient(180deg, #11263B 0%, #193A58 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid rgba(212,175,55,0.12)",
                      }}
                    >
                      {productVideoUrl || productImageUrl ? (
                        <SpotlightMediaFrame
                          imageUrl={productImageUrl}
                          videoUrl={productVideoUrl}
                          videoPoster={productImageUrl || undefined}
                          alt={productTitle}
                          frameStyle={{
                            width: "100%",
                            height: "100%",
                            minHeight: 220,
                            borderRadius: 16,
                            border: "none",
                            boxShadow: "none",
                          }}
                          mediaStyle={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          autoPlayVideo={Boolean(productVideoUrl)}
                          mutedVideo={Boolean(productVideoUrl)}
                          loopVideo={Boolean(productVideoUrl)}
                          showAudioUnlock={Boolean(productVideoUrl)}
                          audioUnlockLabel="Sound on"
                        />
                      ) : (
                        <div style={{ color: "#D7E3F1", fontWeight: 800 }}>
                          No media shared
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={badge(true)}>Private block</span>
                      {productVideoUrl ? <span style={badge(false)}>Video</span> : null}
                      {safeStr(view?.watermark_text) ? (
                        <span style={badge(false)}>{safeStr(view?.watermark_text)}</span>
                      ) : null}
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        color: "#F8FBFF",
                        fontWeight: 900,
                        fontSize: 16,
                        lineHeight: 1.35,
                      }}
                    >
                      {productTitle}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        ...helperText(),
                        fontSize: 13,
                        color: "#D7E3F1",
                      }}
                    >
                      {firstTruthy(product?.description, "No product description was shared.")}
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        color: "#F8FBFF",
                        fontWeight: 900,
                        fontSize: 15,
                      }}
                    >
                      {productPriceText(product)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
