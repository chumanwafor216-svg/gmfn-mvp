import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function RequireAuth({ children }: Props) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setAuthed(false);
      setLoading(false);
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(() => setAuthed(true))
      .catch(() => {
        localStorage.removeItem("access_token");
        setAuthed(false);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: 20 }}>Loading…</div>;
  }

  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
