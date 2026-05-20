import type { CSSProperties } from "react";
import { NavLink, Outlet } from "react-router-dom";

const linkStyle = ({ isActive }: { isActive: boolean }): CSSProperties => ({
  padding: "var(--fm-space-2) var(--fm-space-3)",
  borderRadius: "var(--fm-radius-sm)",
  textDecoration: "none",
  color: isActive ? "#fff" : "var(--fm-color-text-muted)",
  background: isActive ? "var(--fm-color-accent-muted)" : "transparent",
  fontWeight: isActive ? 600 : 500,
  fontSize: "0.9rem"
});

export function AppShell(): JSX.Element {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--fm-color-bg)",
        color: "var(--fm-color-text)",
        fontFamily: "var(--fm-font-sans)"
      }}
    >
      <div
        style={{
          borderBottom: "1px solid var(--fm-color-border)",
          background: "var(--fm-color-surface)",
          padding: "var(--fm-space-3) var(--fm-space-5)"
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--fm-space-4)"
          }}
        >
          <div style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.03em" }}>Fleet Mind AI</div>
          <nav style={{ display: "flex", gap: "var(--fm-space-2)" }}>
            <NavLink to="/chat" style={linkStyle}>
              Chat
            </NavLink>
            <NavLink to="/insights" style={linkStyle}>
              Insights
            </NavLink>
            <NavLink to="/map" style={linkStyle}>
              Map
            </NavLink>
          </nav>
        </div>
      </div>
      <div style={{ maxWidth: "1120px", margin: "0 auto", padding: "var(--fm-space-5)" }}>
        <Outlet />
      </div>
    </div>
  );
}
