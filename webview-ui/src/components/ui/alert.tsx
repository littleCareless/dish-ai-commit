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
  const variantClasses = {
    default: "bg-background text-foreground",
    destructive: "border-destructive/50 text-destructive bg-destructive/10",
  };

  return (
    <div
      role="alert"
      className={`relative w-full rounded-lg border p-4 ${variantClasses[variant]}`}
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
