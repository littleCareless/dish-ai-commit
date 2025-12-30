import "@vscode/webview-ui-toolkit/dist/toolkit";
import React from "react";
import { cn } from "../../lib/utils";
import { themeStyles } from "@/utils/theme";

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn("p-4 border rounded-lg", className)}
      style={{
        borderColor: themeStyles.border("normal"),
        backgroundColor: themeStyles.background(),
        color: themeStyles.foreground(),
      }}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader: React.FC<CardProps> = ({ className, children, ...props }) => {
  return (
    <div className={cn("mb-4", className)} {...props}>
      {children}
    </div>
  );
};

const CardTitle: React.FC<CardProps> = ({ className, children, ...props }) => {
  return (
    <h3
      className={cn("text-lg font-semibold tracking-tight", className)}
      style={{
        color: themeStyles.foreground(),
      }}
      {...props}
    >
      {children}
    </h3>
  );
};

const CardDescription: React.FC<CardProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <p
      className={cn("text-sm mt-1", className)}
      style={{
        color: "var(--vscode-descriptionForeground)",
        opacity: 0.8,
      }}
      {...props}
    >
      {children}
    </p>
  );
};

const CardContent: React.FC<CardProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
};

const CardFooter: React.FC<CardProps> = ({ className, children, ...props }) => {
  return (
    <div className={cn("mt-4 flex items-center", className)} {...props}>
      {children}
    </div>
  );
};

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
