import React from "react";
import "@vscode/webview-ui-toolkit/dist/toolkit";

interface AlertProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  variant?: "default" | "destructive";
}

interface AlertTitleProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

const Alert: React.FC<AlertProps> = ({
  children,
  variant = "default",
  ...props
}) => {
  const variantStyles: React.CSSProperties =
    variant === "destructive"
      ? {
          borderColor: "var(--vscode-inputValidation-errorBorder)",
          backgroundColor: "var(--vscode-inputValidation-errorBackground)",
          color: "var(--vscode-errorForeground)",
        }
      : {
          backgroundColor: "var(--vscode-editor-background)",
          color: "var(--vscode-foreground)",
          borderColor: "var(--vscode-panel-border)",
        };

  return (
    <div
      role="alert"
      className="relative w-full rounded-lg border p-4"
      style={variantStyles}
      {...props}
    >
      {children}
    </div>
  );
};

const AlertTitle: React.FC<AlertTitleProps> = ({ children, ...props }) => {
  return (
    <h5 className="mb-1 font-medium leading-none tracking-tight" {...props}>
      {children}
    </h5>
  );
};

const AlertDescription: React.FC<AlertDescriptionProps> = ({
  children,
  ...props
}) => {
  return (
    <div className="text-sm [&_p]:leading-relaxed" {...props}>
      {children}
    </div>
  );
};

export { Alert, AlertTitle, AlertDescription };
