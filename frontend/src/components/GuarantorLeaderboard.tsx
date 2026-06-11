// frontend/src/components/GuarantorLeaderboard.tsx

import { useEffect, useState } from "react";
import { getAccessToken } from "../lib/api";

import { getGuarantorLeaderboard } from "../lib/leaderboard";

// If your leaderboard types are exported, keep this.
// If you get a type error, we can inline the type later.
import type { GuarantorLeaderboardRow } from "../lib/leaderboard.ts";

export function GuarantorLeaderboard(props: { clanId: number }) {
  const { clanId } = props;

  const [items, setItems] = useState<GuarantorLeaderboardRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();

    // If user is not logged in, show a friendly message instead of crashing
    if (!token) {
      setError("Please log in to view the guarantor leaderboard.");
      setItems([]);
      return;
    }

    getGuarantorLeaderboard(clanId, token)
      .then((res: any) => setItems(res.items || []))
      .catch((e: any) => setError(String(e?.message || e)));
  }, [clanId]);

  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <div>
      <h3>Guarantor Leaderboard</h3>

      {items.length === 0 ? (
        <div>No leaderboard data yet.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                User
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                Score
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                Notes
              </th>
            </tr>
          </thead>

          <tbody>
            {items.map((row, idx) => (
              <tr key={idx}>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  {(row as any).name ?? (row as any).email ?? (row as any).user_id ?? "—"}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  {(row as any).score ?? (row as any).trust_score ?? "—"}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  {(row as any).notes ?? (row as any).reason ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default GuarantorLeaderboard; 
