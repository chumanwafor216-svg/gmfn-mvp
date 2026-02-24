import { useEffect, useState } from "react";

export default function GuarantorLeaderboardPage() {
  const [message, setMessage] = useState("Loading Leaderboard…");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setMessage("No access token found. Please log in.");
      return;
    }

    fetch("/api/trust/admin/leaderboard/guarantors?clan_id=1&limit=20", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || "Request failed");
        }
        return r.json();
      })
      .then((json) => {
        setData(json);
        setMessage("Leaderboard Loaded ✅");
      })
      .catch((e) => setMessage(`Error: ${e.message}`));
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>Guarantor Leaderboard</h2>
      <p style={{ color: message.startsWith("Error") ? "red" : "#555" }}>{message}</p>
      <pre
        style={{
          marginTop: 16,
          padding: 12,
          background: "#f6f6f6",
          borderRadius: 8,
          overflow: "auto",
          border: "1px solid #eee",
        }}
      >
        {data ? JSON.stringify(data, null, 2) : "No data yet"}
      </pre>
    </div>
  );
}
