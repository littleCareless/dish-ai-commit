import React from "react";
import "@vscode/webview-ui-toolkit/dist/toolkit";

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, ...props }) => {
  return (
    <div className="p-4 border rounded-lg bg-card" {...props}>
      {children}
    </div>
  );
};

const CardHeader: React.FC<CardProps> = ({ children, ...props }) => {
  return (
    <div className="mb-4" {...props}>
      {children}
    </div>
  );
};

const CardTitle: React.FC<CardProps> = ({ children, ...props }) => {
  return (
    <h3 className="text-lg font-semibold" {...props}>
      {children}
    </h3>
  );
};

const CardDescription: React.FC<CardProps> = ({ children, ...props }) => {
  return (
    <p className="text-sm text-muted-foreground" {...props}>
      {children}
    </p>
  );
};

const CardContent: React.FC<CardProps> = ({ children, ...props }) => {
  return <div {...props}>{children}</div>;
};

const CardFooter: React.FC<CardProps> = ({ children, ...props }) => {
  return (
    <div className="mt-4 flex items-center" {...props}>
      {children}
    </div>
  );
};

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
