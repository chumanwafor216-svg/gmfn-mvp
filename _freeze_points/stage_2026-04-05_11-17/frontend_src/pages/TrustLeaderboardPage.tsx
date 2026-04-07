import { useEffect, useState } from "react";

type TrustRow = {
  user_id: number;
  email: string;
  cci_score: number;
  reliability_score?: number;
};

export default function TrustLeaderboardPage() {
  const [items, setItems] = useState<TrustRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  setItems([]);
  setError("Leaderboard disabled in this build.");
  setLoading(false);
}, []);

  if (loading) return <div>Loading trust leaderboard…</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <div>
      <h2>Trust Leaderboard</h2>

      {items.length === 0 ? (
        <div>No trust data available yet.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>User</th>
              <th>CCI Score</th>
              <th>Reliability</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.user_id}>
                <td>{row.email}</td>
                <td>{row.cci_score}</td>
                <td>{row.reliability_score ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
