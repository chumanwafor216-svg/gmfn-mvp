import { useEffect, useMemo, useState } from "react";
import { GsnLegacyIcon } from "../components/GsnLegacyIcon";
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
  const routeLinkStyle = {
    minHeight: 48,
    minWidth: 128,
    padding: "0 14px",
    border: "1px solid #BFDBFE",
    borderRadius: 14,
    background: "#EFF6FF",
    boxShadow: "none",
    color: "#0B3B74",
    fontWeight: 800,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  } as const;

  useEffect(() => {
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        // Keep this on the frontend proxy so it reaches the configured backend.
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
        setErr(e?.message || "Could not load the service route list.");
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
      <h2>Service Routes</h2>
      <p style={{ color: "#6b7280" }}>
        Available GSN service routes for support and verification checks.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <b>Service:</b> {title}
        </div>
        <div>
          <b>Version:</b> {version}
        </div>
        <div>
          <b>Session:</b> {tokenPresent ? "present" : "missing"}
        </div>
        <div>
          <b>Routes:</b> {rows.length}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search routes, for example loans, trust, invites"
          style={{ width: 420, maxWidth: "100%", padding: 8 }}
        />
        <StableCtaLink
          to="/docs"
          target="_blank"
          rel="noreferrer"
          stableHeight={52}
          debugId="api.open-swagger"
          style={{
            ...routeLinkStyle,
          }}
        >
          <GsnLegacyIcon name="document" size={26} />
          Route guide
        </StableCtaLink>
        <StableCtaLink
          to="/api/openapi.json"
          target="_blank"
          rel="noreferrer"
          stableHeight={52}
          debugId="api.open-openapi-json"
          style={{
            ...routeLinkStyle,
          }}
        >
          <GsnLegacyIcon name="navigation" size={26} />
          Route file
        </StableCtaLink>
      </div>

      {loading && <div>Loading...</div>}

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
