import { Navigate, useLocation } from "react-router-dom";

const SETTINGS_PATH = "/app/my-gmfn-and-i";

export default function ThemeSettingsPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set("tab", "settings");

  return (
    <Navigate
      replace
      to={{
        pathname: SETTINGS_PATH,
        search: `?${params.toString()}`,
        hash: location.hash,
      }}
    />
  );
}
