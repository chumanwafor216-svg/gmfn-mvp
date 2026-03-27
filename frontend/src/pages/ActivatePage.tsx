import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function ActivatePage() {
  const location = useLocation();

  return (
    <Navigate
      to={`/activate-membership${location.search}${location.hash}`}
      replace
      state={location.state}
    />
  );
}