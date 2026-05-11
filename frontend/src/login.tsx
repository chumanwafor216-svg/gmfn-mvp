import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PrimaryButton } from "./components/StableButton";

type LocationState = {
  from?: { pathname?: string };
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const from =
    (location.state as LocationState | null)?.from?.pathname || "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: email,
          password,
        }),
      });

      if (!res.ok) {
        throw new Error("Invalid login details");
      }

      const data = await res.json();

      // Store token (simple + explicit)
      localStorage.setItem("access_token", data.access_token);

      // ✅ Redirect back to where user came from (or dashboard)
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "80px auto" }}>
      <h2>Login</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p style={{ color: "red", marginTop: 12 }}>{error}</p>}

        <PrimaryButton
          type="submit"
          busy={loading}
          busyLabel="Logging in..."
          stableHeight={48}
          debugId="legacy-login.submit"
          style={{ marginTop: 20 }}
        >
          Login
        </PrimaryButton>
      </form>
    </div>
  );
}
