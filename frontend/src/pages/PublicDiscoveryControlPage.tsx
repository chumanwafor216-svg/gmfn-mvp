import { useCallback, useEffect, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import { StableButton } from "../components/StableButton";
import {
  getPublicDiscoveryOwnerPreview,
  updatePublicDiscoveryPublication,
} from "../lib/api";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
} from "../lib/institutionalSurface";
import { entryFieldStyle } from "../components/CommunityEntryShell";
import { gmfnBrand } from "../styles/gmfnBrand";

type PublicationState = "published" | "hidden" | "paused" | "withdrawn";

function errorMessage(error: any): string {
  const detail = error?.detail || error?.response?.detail;
  return String(detail?.message || detail || error?.message || "GSN could not update public discovery.");
}

export default function PublicDiscoveryControlPage() {
  const [preview, setPreview] = useState<any>(null);
  const [busyProductId, setBusyProductId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expiryByProduct, setExpiryByProduct] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setError("");
    try {
      setPreview(await getPublicDiscoveryOwnerPreview());
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeState(item: any, state: PublicationState) {
    const productId = Number(item?.product_id || 0);
    if (!productId) return;
    if (
      state === "published" &&
      !window.confirm(
        "Publish this product for people outside your communities to find? Its direct shop link remains separate."
      )
    ) {
      return;
    }
    setBusyProductId(productId);
    setError("");
    setSuccess("");
    try {
      await updatePublicDiscoveryPublication(productId, {
        state,
        confirm_publication: state === "published",
        authority_version: preview?.authority_version,
        notice_version: preview?.notice_version,
        expires_at: expiryByProduct[productId]
          ? new Date(`${expiryByProduct[productId]}T23:59:59Z`).toISOString()
          : null,
      });
      setSuccess(
        state === "published"
          ? "This product is now published for wider discovery."
          : `This product is now ${state}. Its direct shop link was not changed.`
      );
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusyProductId(null);
    }
  }

  return (
    <main
      style={{
        width: "min(100%, 760px)",
        margin: "0 auto",
        padding: "18px 14px 42px",
        display: "grid",
        gap: 14,
      }}
    >
      <PageTopNav
        sectionLabel="Shop Control"
        title="Public discovery"
        subtitle="Choose which products people outside your communities may find."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/shop-control"
        backLabel="Shop Control"
      />

      <section style={{ ...institutionalPageCard("#0B1F33"), color: "#FFFFFF", padding: 18 }}>
        <div style={{ color: "#F2C766", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>
          Wider public search
        </div>
        <h1 style={{ margin: "8px 0 6px", fontSize: "clamp(26px, 7vw, 36px)" }}>
          Publish deliberately
        </h1>
        <p style={{ margin: 0, color: "#D7E2EE", lineHeight: 1.55 }}>
          Products stay out of wider search until you publish them here.
        </p>
      </section>

      {preview ? (
        <section style={{ ...institutionalSoftCard("#F7FAFE"), padding: 16, display: "grid", gap: 8 }}>
          <strong style={{ color: gmfnBrand.colors.ink }}>
            {preview.ready ? "Public discovery is ready" : "Public discovery is not active"}
          </strong>
          <span style={{ color: gmfnBrand.colors.inkSoft, lineHeight: 1.5 }}>
            {preview.legacy_notice}
          </span>
          <span style={{ color: gmfnBrand.colors.inkSoft, lineHeight: 1.5 }}>
            {preview.direct_shop_rule}
          </span>
        </section>
      ) : null}

      {error ? (
        <div role="alert" style={{ ...institutionalSoftCard("#FFF2F2"), padding: 14, color: "#8A2020" }}>
          {error}
        </div>
      ) : null}
      {success ? (
        <div role="status" style={{ ...institutionalSoftCard("#EEF9F2"), padding: 14, color: "#185A34" }}>
          {success}
        </div>
      ) : null}

      <section style={{ display: "grid", gap: 12 }}>
        {(preview?.items || []).map((item: any) => {
          const productId = Number(item.product_id);
          const busy = busyProductId === productId;
          return (
            <article
              key={productId}
              style={{ ...institutionalInnerCard("#FFFFFF"), padding: 16, display: "grid", gap: 12 }}
            >
              <div>
                <div style={{ color: gmfnBrand.colors.ink, fontWeight: 900, fontSize: 18 }}>
                  {item.name}
                </div>
                <div style={{ color: gmfnBrand.colors.inkSoft, marginTop: 4 }}>
                  Status: {String(item.effective_state || "").replace(/_/g, " ")}
                </div>
              </div>
              <label style={{ display: "grid", gap: 6, color: gmfnBrand.colors.inkSoft, fontWeight: 800 }}>
                Optional expiry date
                <input
                  type="date"
                  value={expiryByProduct[productId] || ""}
                  onChange={(event) =>
                    setExpiryByProduct((current) => ({
                      ...current,
                      [productId]: event.target.value,
                    }))
                  }
                  style={entryFieldStyle}
                />
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: 8,
                }}
              >
                <StableButton
                  kind="primary"
                  busy={busy && item.effective_state !== "published"}
                  disabled={busy || !item.eligible_to_publish}
                  onClick={() => void changeState(item, "published")}
                  debugId={`public-discovery.publish.${productId}`}
                >
                  Publish
                </StableButton>
                <StableButton
                  disabled={busy}
                  onClick={() => void changeState(item, "paused")}
                  debugId={`public-discovery.pause.${productId}`}
                >
                  Pause
                </StableButton>
                <StableButton
                  disabled={busy}
                  onClick={() => void changeState(item, "hidden")}
                  debugId={`public-discovery.hide.${productId}`}
                >
                  Hide
                </StableButton>
                <StableButton
                  kind="danger"
                  disabled={busy}
                  onClick={() => void changeState(item, "withdrawn")}
                  debugId={`public-discovery.withdraw.${productId}`}
                >
                  Withdraw
                </StableButton>
              </div>
            </article>
          );
        })}
      </section>

      {preview && !(preview.items || []).length ? (
        <section style={{ ...institutionalSoftCard("#F7FAFE"), padding: 16 }}>
          Add a product to your shop before publishing it for public discovery.
        </section>
      ) : null}
    </main>
  );
}
