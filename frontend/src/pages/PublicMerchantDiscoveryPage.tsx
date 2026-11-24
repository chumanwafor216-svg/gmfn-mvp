import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
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

type SearchFilters = {
  q: string;
  category: string;
  area: string;
};

function errorMessage(error: any): string {
  const detail = error?.detail || error?.response?.detail;
  return String(detail?.message || detail || error?.message || "Public discovery is not available.");
}

function safeReturnPath(value: string | null): string {
  const candidate = String(value || "").trim();
  return candidate.startsWith("/") && !candidate.startsWith("//")
    ? candidate
    : "/app/marketplace";
}

function ResultCard({
  item,
  source,
}: {
  item: PublicDiscoveryResult;
  source: "public-discovery" | "similar-products";
}) {
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
          Ask seller to confirm availability
        </div>
        <div style={{ ...brandHelperText(), margin: 0 }}>
          {item.contact_available
            ? "A public contact route is available in the shop."
            : "Open the shop to view its published information."}
        </div>
      </div>
      <StableCtaLink
        to={`${item.shop_path}?product_id=${encodeURIComponent(String(item.offer_id))}&source=${source}`}
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
  const location = useLocation();
  const initialParams = useRef(new URLSearchParams(location.search));
  const initialQuery = String(initialParams.current.get("q") || "").trim();
  const similarProductsMode = initialParams.current.get("source") === "similar-products";
  const sourceProductId = Number(initialParams.current.get("product_id") || 0);
  const returnTo = safeReturnPath(initialParams.current.get("return_to"));
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("");
  const [area, setArea] = useState("");
  const [items, setItems] = useState<PublicDiscoveryResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [coverageComplete, setCoverageComplete] = useState(true);
  const [scannedPublicationCount, setScannedPublicationCount] = useState(0);
  const [evaluatedPublicationCount, setEvaluatedPublicationCount] = useState(0);
  const [activeFilters, setActiveFilters] = useState<SearchFilters>({
    q: initialQuery,
    category: "",
    area: "",
  });
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const requestSequence = useRef(0);

  async function runSearch(filters: SearchFilters, cursor = 0, append = false) {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    if (append) setLoadingMore(true);
    else setBusy(true);
    setNotice(null);
    try {
      const response = await searchPublicMerchantDiscovery({
        ...filters,
        cursor,
      });
      if (requestSequence.current !== requestId) return;
      const rawResponseItems = Array.isArray(response?.items) ? response.items : [];
      const responseItems = similarProductsMode
        ? rawResponseItems.filter((item) => Number(item.offer_id) !== sourceProductId)
        : rawResponseItems;
      setItems((current) => {
        if (!append) return responseItems;
        const known = new Set(current.map((item) => item.publication_id));
        return [...current, ...responseItems.filter((item) => !known.has(item.publication_id))];
      });
      setSuggestions(Array.isArray(response?.suggestions) ? response.suggestions : []);
      setTotal(Number(response?.total || 0));
      setNextCursor(response?.next_cursor == null ? null : Number(response.next_cursor));
      setCoverageComplete(response?.coverage_complete !== false);
      setScannedPublicationCount(Number(response?.scanned_publication_count || 0));
      setEvaluatedPublicationCount(Number(response?.evaluated_publication_count || 0));
      setActiveFilters(filters);
      setSearched(true);
    } catch (error) {
      if (requestSequence.current !== requestId) return;
      if (!append) {
        setItems([]);
        setSuggestions([]);
        setTotal(0);
        setNextCursor(null);
        setCoverageComplete(true);
        setScannedPublicationCount(0);
        setEvaluatedPublicationCount(0);
      }
      setSearched(true);
      setNotice(errorMessage(error));
    } finally {
      if (requestSequence.current !== requestId) return;
      if (append) setLoadingMore(false);
      else setBusy(false);
    }
  }

  useEffect(() => {
    void runSearch({ q: initialQuery, category: "", area: "" });
    return () => {
      requestSequence.current += 1;
    };
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    void runSearch({
      q: query.trim(),
      category: category.trim(),
      area: area.trim(),
    });
  }

  return (
    <CommunityEntryShell
      eyebrow={similarProductsMode ? "Similar products" : "Public shops"}
      title={similarProductsMode ? `More like “${initialQuery}”` : "Find products and services"}
      summary={
        similarProductsMode
          ? "Compare owner-published products. Each seller keeps their own price and currency."
          : "Search products that their shop owners chose to publish beyond their communities."
      }
      backTo={similarProductsMode ? returnTo : "/cover"}
      backLabel={similarProductsMode ? "Back to product" : "Back to GSN"}
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
            {coverageComplete
              ? "No published product matched this search. Try fewer words, another category, or a wider area."
              : `No match was found among the ${evaluatedPublicationCount} most recent published offers checked. Older published offers may still exist; try fewer words, another category, or a wider area.`}
          </EntryNotice>
        </div>
      ) : null}

      {!notice && searched && !coverageComplete ? (
        <div style={{ marginTop: 14 }}>
          <EntryNotice tone="info">
            Search coverage is incomplete. GSN evaluated {evaluatedPublicationCount} recent published offers and used {scannedPublicationCount} raw records to detect the scan boundary, so the result count is a minimum rather than a complete total.
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
            {similarProductsMode
              ? `Showing ${items.length} ${items.length === 1 ? "similar product" : "similar products"}`
              : `Showing ${items.length} of ${coverageComplete ? "" : "at least "}${total} ${total === 1 ? "published result" : "published results"}`}
          </div>
          {items.map((item) => (
            <ResultCard
              key={item.publication_id}
              item={item}
              source={similarProductsMode ? "similar-products" : "public-discovery"}
            />
          ))}
        </section>
      ) : null}
      {nextCursor !== null ? (
        <div style={{ marginTop: 12 }}>
          <StableButton
            type="button"
            kind="secondary"
            fullWidth
            busy={loadingMore}
            busyLabel="Loading more..."
            onClick={() => void runSearch(activeFilters, nextCursor, true)}
            debugId="public-discovery.load-more"
          >
            Show more results
          </StableButton>
        </div>
      ) : null}
    </CommunityEntryShell>
  );
}
