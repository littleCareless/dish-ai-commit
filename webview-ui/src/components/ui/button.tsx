import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  disabled?: boolean;
  appearance?: "primary" | "secondary" | "icon";
  type?: "button" | "submit" | "reset";
  onClick?: React.MouseEventHandler<HTMLElement>;
  size?: "small" | "medium" | "large" | "sm" | "icon";
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "destructive"
    | "default"
    | "link";
  className?: string;
  title?: string;
  style?: React.CSSProperties;
}

interface ButtonVariantsProps {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const buttonVariants = ({
  variant = "default",
  size = "default",
}: ButtonVariantsProps = {}) => {
  const baseStyles: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    borderRadius: "var(--vscode-button-border-radius, 2px)",
    fontSize: "var(--vscode-font-size, 13px)",
    fontWeight: "var(--vscode-font-weight, normal)",
    transition: "colors 0.2s",
    outline: "none",
  };

  const variantStyles: { [key: string]: React.CSSProperties } = {
    default: {
      backgroundColor: "var(--vscode-button-background)",
      color: "var(--vscode-button-foreground)",
      border: "1px solid var(--vscode-button-border, transparent)",
    },
    destructive: {
      backgroundColor: "var(--vscode-errorForeground)",
      color: "var(--vscode-button-foreground)",
      border: "1px solid transparent",
    },
    outline: {
      borderColor: "var(--vscode-input-border)",
      backgroundColor: "var(--vscode-editor-background)",
      color: "var(--vscode-foreground)",
    },
    secondary: {
      backgroundColor: "var(--vscode-button-secondaryBackground)",
      color: "var(--vscode-button-secondaryForeground)",
      border: "1px solid var(--vscode-button-secondaryBorder, transparent)",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--vscode-foreground)",
      border: "1px solid transparent",
    },
    link: {
      color: "var(--vscode-textLink-foreground)",
      textDecoration: "underline",
      backgroundColor: "transparent",
      border: "none",
    },
  };

  const sizeStyles: { [key: string]: React.CSSProperties } = {
    default: {
      height: "32px",
      padding: "0 12px",
    },
    sm: {
      height: "28px",
      padding: "0 10px",
    },
    lg: {
      height: "36px",
      padding: "0 16px",
    },
    icon: {
      height: "32px",
      width: "32px",
    },
  };

  return {
    ...baseStyles,
    ...variantStyles[variant],
    ...sizeStyles[size],
  };
};

const Button: React.FC<ButtonProps> = ({
  children,
  disabled = false,
  appearance = "primary",
  onClick,
  type,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  size,
  variant,
  className,
  title,
  style,
  ...props
}) => {
  // Map variant to appearance if provided
  const finalAppearance =
    variant === "outline"
      ? "secondary"
      : variant === "ghost"
        ? "secondary"
        : variant === "destructive"
          ? "primary"
          : variant === "default"
            ? "primary"
            : variant === "link"
              ? "secondary"
              : appearance;

  // Map size values (currently not used in VSCodeButton)
  // const finalSize = size === 'sm' ? 'small' :
  //                  size === 'icon' ? 'small' :
  //                  size;

  return (
    <VSCodeButton
      appearance={finalAppearance}
      disabled={disabled}
      onClick={onClick}
      type={type}
      className={className}
      title={title}
      style={style}
      {...props}
    >
      {children}
    </VSCodeButton>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
export type { ButtonProps, ButtonVariantsProps };
