import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps): JSX.Element {
  return (
    <header
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "var(--fm-space-4)",
        marginBottom: "var(--fm-space-5)"
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--fm-color-text)",
            letterSpacing: "-0.02em"
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p style={{ margin: "var(--fm-space-2) 0 0", color: "var(--fm-color-text-muted)", maxWidth: "52ch" }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div style={{ display: "flex", gap: "var(--fm-space-2)", alignItems: "center" }}>{actions}</div> : null}
    </header>
  );
}
