import { FormEvent, useEffect, useState } from "react";
import {
  searchPublicMerchantDiscovery,
  type PublicDiscoveryResult,
} from "../lib/api";
import {
  CommunityEntryShell,
  EntryNotice,
  entryFieldStyle,
  entryLabelStyle,
} from "../components/CommunityEntryShell";
import { StableButton, StableCtaLink } from "../components/StableButton";
import { brandInnerCard, brandHelperText, gmfnBrand } from "../styles/gmfnBrand";

function errorMessage(error: any): string {
  const detail = error?.detail || error?.response?.detail;
  return String(detail?.message || detail || error?.message || "Public discovery is not available.");
}

function ResultCard({ item }: { item: PublicDiscoveryResult }) {
  const terms = [...(item.categories || []), ...(item.capability_terms || [])].slice(0, 3);
  return (
    <article
      style={{
        ...brandInnerCard(),
        padding: 14,
        display: "grid",
        gap: 12,
        border: `1px solid ${gmfnBrand.colors.line}`,
      }}
    >
      {item.image_url ? (
        <img
          src={item.image_url}
          alt=""
          style={{
            width: "100%",
            maxHeight: 220,
            objectFit: "cover",
            borderRadius: 16,
            background: "#E8EEF5",
          }}
        />
      ) : null}
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ color: gmfnBrand.colors.accent, fontSize: 12, fontWeight: 900 }}>
          {item.shop_name}
        </div>
        <h2 style={{ margin: 0, color: gmfnBrand.colors.ink, fontSize: 21 }}>
          {item.offer_name}
        </h2>
        {item.offer_description ? (
          <p style={{ ...brandHelperText(), margin: 0 }}>{item.offer_description}</p>
        ) : null}
        {item.price ? (
          <strong style={{ color: gmfnBrand.colors.ink }}>
            {[item.currency, item.price].filter(Boolean).join(" ")}
          </strong>
        ) : null}
        {terms.length ? (
          <div style={{ ...brandHelperText(), margin: 0 }}>{terms.join(" · ")}</div>
        ) : null}
        <div style={{ ...brandHelperText(), margin: 0 }}>
          {item.service_areas?.length
            ? item.service_areas.join(" · ")
            : item.remote_available
              ? "Remote service"
              : "Ask the shop about service area"}
          {" · "}
          {item.availability === "available"
            ? "Available"
            : item.availability === "on_request"
              ? "Available on request"
              : "Ask about availability"}
        </div>
        <div style={{ ...brandHelperText(), margin: 0 }}>
          {item.contact_available
            ? "A public contact route is available in the shop."
            : "Open the shop to view its published information."}
        </div>
      </div>
      <StableCtaLink
        to={`${item.shop_path}?product_id=${encodeURIComponent(String(item.offer_id))}&source=public-discovery`}
        kind="primary"
        fullWidth
        debugId={`public-discovery.open.${item.publication_id}`}
      >
        Open shop
      </StableCtaLink>
    </article>
  );
}

export default function PublicMerchantDiscoveryPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [area, setArea] = useState("");
  const [items, setItems] = useState<PublicDiscoveryResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function runSearch() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await searchPublicMerchantDiscovery({
        q: query.trim(),
        category: category.trim(),
        area: area.trim(),
      });
      setItems(Array.isArray(response?.items) ? response.items : []);
      setSuggestions(Array.isArray(response?.suggestions) ? response.suggestions : []);
      setTotal(Number(response?.total || 0));
      setSearched(true);
    } catch (error) {
      setItems([]);
      setSuggestions([]);
      setTotal(0);
      setSearched(true);
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void runSearch();
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    void runSearch();
  }

  return (
    <CommunityEntryShell
      eyebrow="Public shops"
      title="Find products and services"
      summary="Search products that their shop owners chose to publish beyond their communities."
      backTo="/cover"
      backLabel="Back to GSN"
      exitLabel={null}
    >
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label style={entryLabelStyle}>
          What do you need?
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Example: car repair or school uniforms"
            style={entryFieldStyle}
          />
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 10,
          }}
        >
          <label style={entryLabelStyle}>
            Category
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Example: repairs"
              style={entryFieldStyle}
            />
          </label>
          <label style={entryLabelStyle}>
            General service area
            <input
              value={area}
              onChange={(event) => setArea(event.target.value)}
              placeholder="Example: Enugu or remote"
              style={entryFieldStyle}
            />
          </label>
        </div>
        <StableButton
          type="submit"
          kind="primary"
          fullWidth
          busy={busy}
          busyLabel="Searching…"
          debugId="public-discovery.search"
        >
          Find products and services
        </StableButton>
      </form>

      {notice ? (
        <div style={{ marginTop: 14 }}>
          <EntryNotice tone="error">{notice}</EntryNotice>
        </div>
      ) : null}

      {!notice && searched && !busy && items.length === 0 ? (
        <div style={{ marginTop: 14 }}>
          <EntryNotice>
            No published product matched this search. Try fewer words, another category, or a wider area.
          </EntryNotice>
        </div>
      ) : null}

      {suggestions.length ? (
        <div style={{ ...brandHelperText(), marginTop: 14 }}>
          Try: {suggestions.join(" · ")}
        </div>
      ) : null}

      {items.length ? (
        <section style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <div style={{ color: gmfnBrand.colors.inkSoft, fontWeight: 850 }}>
            {total} {total === 1 ? "published result" : "published results"}
          </div>
          {items.map((item) => (
            <ResultCard key={item.publication_id} item={item} />
          ))}
        </section>
      ) : null}
    </CommunityEntryShell>
  );
}
