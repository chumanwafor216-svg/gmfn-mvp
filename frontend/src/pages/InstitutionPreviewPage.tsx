import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function InstitutionPreviewPage() {
  const location = useLocation();

  return (
    <Navigate
      to={`/cover${location.search}${location.hash}`}
      replace
      state={location.state}
    />
  );
}