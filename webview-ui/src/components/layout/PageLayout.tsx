import { cn } from "@/lib/utils";
import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  className,
}) => {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};

type MaxWidth =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "full";

const maxWidthClasses: Record<MaxWidth, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  full: "max-w-full",
};

interface PageLayoutProps {
  children: React.ReactNode;
  maxWidth?: MaxWidth;
  className?: string;
  contentClassName?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  maxWidth = "3xl",
  className,
  contentClassName,
}) => {
  return (
    <div className={cn("h-full overflow-auto", className)}>
      <div
        className={cn(
          "mx-auto p-4 space-y-6",
          maxWidthClasses[maxWidth],
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
};

interface FullHeightLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const FullHeightLayout: React.FC<FullHeightLayoutProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn("h-full flex flex-col overflow-hidden", className)}>
      {children}
    </div>
  );
};

interface SplitLayoutProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
  sidebarWidth?: string;
  className?: string;
}

export const SplitLayout: React.FC<SplitLayoutProps> = ({
  sidebar,
  content,
  sidebarWidth = "w-1/3",
  className,
}) => {
  return (
    <div className={cn("flex flex-1 overflow-hidden gap-4 p-4", className)}>
      <div className={cn("flex flex-col gap-4", sidebarWidth)}>{sidebar}</div>
      <div className="flex-1 flex flex-col gap-4">{content}</div>
    </div>
  );
};
