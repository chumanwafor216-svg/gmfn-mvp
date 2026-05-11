import { useEffect, useMemo, useState } from "react";
import { StableCtaLink } from "../components/StableButton";
import { getAccessToken } from "../lib/api";

type OpenApiSpec = {
  info?: { title?: string; version?: string };
  paths?: Record<string, any>;
};

type Row = {
  path: string;
  methods: string[];
};

export default function ApiPage() {
  const [title, setTitle] = useState("-");
  const [version, setVersion] = useState("-");
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const tokenPresent = useMemo(() => Boolean(getAccessToken()), []);

  useEffect(() => {
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        // ✅ MUST go through /api proxy so it hits backend correctly
        const res = await fetch("/api/openapi.json");
        if (!res.ok) throw new Error(await res.text());

        const spec = (await res.json()) as OpenApiSpec;

        setTitle(spec?.info?.title ?? "-");
        setVersion(spec?.info?.version ?? "-");

        const list: Row[] = [];
        const paths = spec?.paths || {};
        for (const path of Object.keys(paths)) {
          const obj = paths[path] || {};
          const methods = Object.keys(obj).map((m) => m.toUpperCase());
          list.push({ path, methods: methods.sort() });
        }

        list.sort((a, b) => a.path.localeCompare(b.path));
        setRows(list);
      } catch (e: any) {
        setErr(e?.message || "Failed to load OpenAPI");
        setRows([]);
      } finally {
        setLoading(false);
      }
    }

    run();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.path.toLowerCase().includes(needle) ||
        r.methods.join(",").toLowerCase().includes(needle)
    );
  }, [q, rows]);

  return (
    <div style={{ padding: 16 }}>
      <h2>API</h2>
      <p style={{ color: "#6b7280" }}>
        Live backend routes discovered from OpenAPI.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <b>Title:</b> {title}
        </div>
        <div>
          <b>Version:</b> {version}
        </div>
        <div>
          <b>Token:</b> {tokenPresent ? "present ✅" : "missing ❌"}
        </div>
        <div>
          <b>Routes:</b> {rows.length}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search routes (e.g. /loans, /trust, invites)"
          style={{ width: 420, maxWidth: "100%", padding: 8 }}
        />
        <StableCtaLink
          to="/docs"
          target="_blank"
          rel="noreferrer"
          stableHeight={32}
          debugId="api.open-swagger"
          style={{
            minHeight: 32,
            minWidth: 0,
            padding: "4px 0",
            border: "none",
            borderRadius: 0,
            background: "transparent",
            boxShadow: "none",
            color: "#2563EB",
            fontWeight: 700,
            textDecoration: "underline",
          }}
        >
          Swagger →
        </StableCtaLink>
        <StableCtaLink
          to="/api/openapi.json"
          target="_blank"
          rel="noreferrer"
          stableHeight={32}
          debugId="api.open-openapi-json"
          style={{
            minHeight: 32,
            minWidth: 0,
            padding: "4px 0",
            border: "none",
            borderRadius: 0,
            background: "transparent",
            boxShadow: "none",
            color: "#2563EB",
            fontWeight: 700,
            textDecoration: "underline",
          }}
        >
          OpenAPI →
        </StableCtaLink>
      </div>

      {loading && <div>Loading…</div>}

      {err && (
        <pre style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{err}</pre>
      )}

      {!loading && !err && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                Path
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                Methods
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.path}>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  <code>{r.path}</code>
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  {r.methods.map((m) => (
                    <span
                      key={m}
                      style={{
                        display: "inline-block",
                        marginRight: 6,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "#f3f4f6",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {m}
                    </span>
                  ))}
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={2} style={{ padding: 8 }}>
                  No routes match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
