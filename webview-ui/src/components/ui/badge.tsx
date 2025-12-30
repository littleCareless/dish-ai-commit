import React from "react";
import "@vscode/webview-ui-toolkit/dist/toolkit";
import { themeStyles } from "@/utils/theme";

interface BadgeProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  ...props
}) => {
  const variantStyles: React.CSSProperties =
    variant === "destructive"
      ? {
          backgroundColor: "var(--destructive)",
          color: "var(--destructive-foreground)",
          border: "1px solid transparent",
        }
      : variant === "secondary"
        ? {
            backgroundColor: "var(--vscode-button-secondaryBackground)",
            color: "var(--vscode-button-secondaryForeground)",
            border: "1px solid transparent",
          }
        : variant === "outline"
          ? {
              backgroundColor: "transparent",
              color: themeStyles.foreground(),
              border: `1px solid ${themeStyles.border("normal")}`,
            }
          : {
              backgroundColor: "var(--vscode-button-background)",
              color: "var(--vscode-button-foreground)",
              border: "1px solid transparent",
            };

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={variantStyles}
      {...props}
    >
      {children}
    </span>
  );
};

export { Badge };
