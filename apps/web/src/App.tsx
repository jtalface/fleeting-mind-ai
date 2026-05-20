import { useMemo } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { getWebRuntimeConfig } from "./config/runtime.js";
import { AppShell } from "./layout/AppShell.js";
import { ChatPage } from "./pages/ChatPage.js";
import { FleetMapPage } from "./pages/FleetMapPage.js";
import { InsightsPage } from "./pages/InsightsPage.js";

export function App(): JSX.Element {
  const cfg = useMemo(() => getWebRuntimeConfig(), []);

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="/chat" element={<ChatPage cfg={cfg} />} />
        <Route path="/insights" element={<InsightsPage cfg={cfg} />} />
        <Route path="/map" element={<FleetMapPage cfg={cfg} />} />
      </Route>
    </Routes>
  );
}
