import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAccessToken } from "../lib/api";

type Props = {
  children: React.ReactNode;
  requireRole?: string; // optional role gating
};

function getStoredRole(): string | null {
  // If you store role elsewhere, adjust here.
  // Many apps store role in localStorage after /auth/me.
  return localStorage.getItem("role");
}

export default function RequireAuth({ children, requireRole }: Props) {
  const location = useLocation();
  const token = getAccessToken();

  // If not logged in, redirect to login with next target
  if (!token) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  // Optional role gate (if you already use it)
  if (requireRole) {
    const role = (getStoredRole() || "").toLowerCase();
    if (role && role !== requireRole.toLowerCase()) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
