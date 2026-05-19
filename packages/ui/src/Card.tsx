import type { CSSProperties, ReactNode } from "react";

export interface CardProps {
  title?: string;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export function Card({ title, children, style, className }: CardProps): JSX.Element {
  return (
    <section
      className={className}
      style={{
        background: "var(--fm-color-surface)",
        border: "1px solid var(--fm-color-border)",
        borderRadius: "var(--fm-radius-md)",
        padding: "var(--fm-space-4)",
        ...style
      }}
    >
      {title ? (
        <h3
          style={{
            margin: "0 0 var(--fm-space-3)",
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "var(--fm-color-text)"
          }}
        >
          {title}
        </h3>
      ) : null}
      {children}
    </section>
  );
}
