import React from "react";
import "@vscode/webview-ui-toolkit/dist/toolkit";

interface PopoverProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface PopoverTriggerProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  asChild?: boolean;
}

interface PopoverContentProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

const Popover: React.FC<PopoverProps> = ({
  children,
  open,
  onOpenChange,
  ...props
}) => {
  return (
    <div className="popover" {...props}>
      {children}
    </div>
  );
};

const PopoverTrigger: React.FC<PopoverTriggerProps> = ({
  children,
  asChild = false,
  ...props
}) => {
  if (asChild) {
    return <>{children}</>;
  }

  return <button {...props}>{children}</button>;
};

const PopoverContent: React.FC<PopoverContentProps> = ({
  children,
  align = "center",
  sideOffset = 4,
  ...props
}) => {
  return (
    <div
      className="z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md"
      {...props}
    >
      {children}
    </div>
  );
};

export { Popover, PopoverTrigger, PopoverContent };
