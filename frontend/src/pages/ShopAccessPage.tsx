import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import SpotlightMediaFrame from "../components/SpotlightMediaFrame";
import { StableCtaLink } from "../components/StableButton";
import {
  TrustPaperAuthorityStrip,
  TrustPaperSecurityNote,
  TrustPaperWatermark,
} from "../components/TrustPaperMarks";
import {
  recordVaultShopAccessOpen,
  type VaultShopAccessProduct,
  type VaultShopAccessView,
} from "../lib/api";
import { publicShopPath } from "../lib/publicLinks";

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
    position: "relative",
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

function shopAccessIconText(
  name: GsnIconName,
  label: React.ReactNode,
  size = 24
) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <GsnLegacyIcon name={name} size={size} />
      <span>{label}</span>
    </span>
  );
}

function shopAccessIconTile(name: GsnIconName, size = 54) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 18,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: `0 0 ${size}px`,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)",
        border: "1px solid rgba(255,255,255,0.16)",
        boxShadow:
          "0 18px 34px rgba(2,8,23,0.22), inset 0 1px 0 rgba(255,255,255,0.10)",
      }}
    >
      <GsnLegacyIcon name={name} size={Math.max(30, size - 14)} />
    </span>
  );
}

function shopAccessStatusIcon(status: string): GsnIconName {
  if (status === "active") return "check";
  if (status === "expired" || status === "revoked" || status === "exhausted") {
    return "alert";
  }
  if (status === "product_inactive" || status === "block_inactive") return "lock";
  return "shield";
}

function restrictionIcon(label: string): GsnIconName {
  if (label.startsWith("Download")) return "document";
  if (label.startsWith("Print")) return "briefcase";
  if (label.startsWith("Reshare")) return "globe";
  return "shield";
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
  const accessLoadSeqRef = useRef(0);
  const accessLoadContextRef = useRef("");

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "GSN | Vault Access";
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const contextKey = token;
    const loadSeq = accessLoadSeqRef.current + 1;
    accessLoadSeqRef.current = loadSeq;
    accessLoadContextRef.current = contextKey;

    function isCurrentAccessLoad() {
      return (
        alive &&
        accessLoadSeqRef.current === loadSeq &&
        accessLoadContextRef.current === contextKey
      );
    }

    async function load() {
      if (!token) {
        setView(null);
        setErrorText("This Vault link is missing its access code.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorText("");
      setView(null);

      try {
        const res = await recordVaultShopAccessOpen(token);
        if (!isCurrentAccessLoad()) return;
        setView(res || null);

        const nextStatus = safeStr(res?.status).toLowerCase();

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
        if (!isCurrentAccessLoad()) return;
        setView(null);
        setErrorText(
          safeStr(err?.message) || "This Vault access link could not be opened."
        );
      } finally {
        if (isCurrentAccessLoad()) setLoading(false);
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
    return gmfnId ? publicShopPath(gmfnId) : "";
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
            <div style={sectionLabel()}>
              {shopAccessIconText("vault", "Vault access", 22)}
            </div>
            <div style={{ marginTop: 10, color: "#F8FBFF", fontSize: 30, fontWeight: 1000 }}>
              {shopAccessIconText("refresh", "Opening private access", 34)}
            </div>
            <div style={{ marginTop: 12, ...helperText(), color: "#D7E3F1" }}>
              Checking this private link and opening the shared shop view.
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
            <div style={sectionLabel()}>
              {shopAccessIconText("vault", "Vault access", 22)}
            </div>
            <div
              style={{
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              {shopAccessIconTile(shopAccessStatusIcon(status), 50)}
              <div style={{ fontSize: 30, fontWeight: 1000 }}>
                {statusLabel(status)}
              </div>
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
              <span style={badge(false)}>
                {shopAccessIconText(
                  shopAccessStatusIcon(status),
                  `Status: ${status || "invalid"}`,
                  20
                )}
              </span>
              <span style={badge(false)}>
                {shopAccessIconText(
                  "calendar",
                  `Expiry: ${safeDateTime(view?.policy?.expires_at)}`,
                  20
                )}
              </span>
              <span style={badge(false)}>
                {shopAccessIconText(
                  "eye",
                  `Views: ${safeStr(view?.policy?.views_used || 0)} / ${safeStr(
                    view?.policy?.max_views || "Unlimited"
                  )}`,
                  20
                )}
              </span>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <StableCtaLink
                  to="/welcome"
                  kind="secondary"
                  stableHeight={52}
                  debugId="shop-access.invalid.back-welcome"
                >
                  {shopAccessIconText("home", "Back to Welcome")}
                </StableCtaLink>
                {publicShopRoute ? (
                  <StableCtaLink
                    to={publicShopRoute}
                    kind="primary"
                    stableHeight={52}
                    debugId="shop-access.invalid.open-public-shop"
                  >
                    {shopAccessIconText("shop", "Open public shop face")}
                  </StableCtaLink>
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
        <section
          style={pageCard(
            "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
          )}
        >
          <TrustPaperWatermark
            name="lock"
            color="#F6D77A"
            size={230}
            opacity={0.055}
            style={{ right: -42, bottom: -48 }}
          />
          <div style={sectionLabel()}>
            {shopAccessIconText("vault", "Vault access", 22)}
          </div>
          <div
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {shopAccessIconTile("vault", 56)}
            <div style={{ color: "#F8FBFF", fontSize: 34, fontWeight: 1000 }}>
              {firstTruthy(view?.shop_name, "Private vault shop")}
            </div>
          </div>
          <div style={{ marginTop: 12, ...helperText(), maxWidth: 860, color: "#D7E3F1" }}>
            Shared privately by {firstTruthy(view?.owner_name, view?.gmfn_id, "the shop owner")}.
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(true)}>
              {shopAccessIconText("check", "Private link open", 20)}
            </span>
            <span style={badge(false)}>
              {shopAccessIconText("calendar", `Expires: ${safeDateTime(view?.policy?.expires_at)}`, 20)}
            </span>
          </div>
          <TrustPaperAuthorityStrip
            title="GSN Private Vault Access Paper"
            reference={firstTruthy(view?.gmfn_id, view?.shop_name, "Private vault access")}
            classification="Restricted access evidence"
            compact
            tone="dark"
            style={{ marginTop: 16 }}
          />
        </section>

        {safeStr(view?.banner_url || view?.image_url) ? (
          <section style={{ ...pageCard("#FFFFFF"), order: 2 }}>
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

        <section style={{ ...pageCard("#FFFFFF"), order: 3 }}>
          <details>
            <summary style={{ cursor: "pointer", color: "#0B1F33", fontSize: 18, fontWeight: 950 }}>
              Link details
            </summary>
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div style={{ ...helperText(), color: "#0B1F33" }}>
                Views: {safeStr(view?.policy?.views_used || 0)} / {safeStr(view?.policy?.max_views || "Unlimited")}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {restrictionBadges.map((item) => (
                  <span key={item} style={badge(false)}>
                    {shopAccessIconText(restrictionIcon(item), item, 20)}
                  </span>
                ))}
              </div>
              <TrustPaperSecurityNote
                reference={firstTruthy(view?.gmfn_id, view?.shop_name, "private vault access")}
                compact
              />
            </div>
          </details>
        </section>
        <section style={{ ...pageCard("#FFFFFF"), order: 1 }}>
          <div style={sectionLabel()}>
            {shopAccessIconText("shop", "Private products", 22)}
          </div>
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
                {shopAccessIconText(
                  "document",
                  "This access link is active, but no private offers are being shown right now.",
                  24
                )}
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
                      <span style={badge(true)}>
                        {shopAccessIconText("lock", "Private block", 20)}
                      </span>
                      {productVideoUrl ? (
                        <span style={badge(false)}>
                          {shopAccessIconText("video", "Video", 20)}
                        </span>
                      ) : null}
                      {safeStr(view?.watermark_text) ? (
                        <span style={badge(false)}>
                          {shopAccessIconText("shield", safeStr(view?.watermark_text), 20)}
                        </span>
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
                      {shopAccessIconText("wallet", productPriceText(product), 22)}
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
