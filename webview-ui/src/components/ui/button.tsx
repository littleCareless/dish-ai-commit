import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React from "react";
import { themeStyles } from "@/utils/theme";

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
    transition: "all 0.2s ease",
    outline: "none",
    cursor: "pointer",
  };

  const variantStyles: { [key: string]: React.CSSProperties } = {
    default: {
      backgroundColor: "var(--vscode-button-background)",
      color: "var(--vscode-button-foreground)",
      border: "1px solid var(--vscode-button-border, transparent)",
    },
    destructive: {
      backgroundColor: "var(--destructive)",
      color: "var(--destructive-foreground)",
      border: "1px solid transparent",
    },
    outline: {
      borderColor: themeStyles.border("normal"),
      backgroundColor: themeStyles.background(),
      color: themeStyles.foreground(),
      border: `1px solid ${themeStyles.border("normal")}`,
    },
    secondary: {
      backgroundColor: "var(--vscode-button-secondaryBackground)",
      color: "var(--vscode-button-secondaryForeground)",
      border: "1px solid var(--vscode-button-secondaryBorder, transparent)",
    },
    ghost: {
      backgroundColor: "transparent",
      color: themeStyles.foreground(),
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

  // 添加悬停效果
  const hoverStyles: React.CSSProperties = {
    opacity: 0.9,
  };

  return {
    ...baseStyles,
    ...variantStyles[variant],
    ...sizeStyles[size],
    "&:hover": hoverStyles,
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

  // 应用主题适配的样式
  const buttonStyle: React.CSSProperties = {
    ...style,
    // 确保在深色模式下使用正确的颜色
    ...(disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}),
  };

  return (
    <VSCodeButton
      appearance={finalAppearance}
      disabled={disabled}
      onClick={onClick}
      type={type}
      className={className}
      title={title}
      style={{
        ...buttonStyle,
        // 确保宽度自适应，避免 VSCodeButton 的默认宽度样式
        width:
          className?.includes("w-fit") || className?.includes("w-")
            ? "fit-content"
            : buttonStyle.width,
        minWidth: "0",
      }}
      {...props}
    >
      {children}
    </VSCodeButton>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
export type { ButtonProps, ButtonVariantsProps };
