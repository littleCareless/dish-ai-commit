import React, { useState } from "react";
import "@vscode/webview-ui-toolkit/dist/toolkit";

interface TabsProps extends React.HTMLAttributes<HTMLElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

interface TabsListProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

interface TabsTriggerProps extends React.HTMLAttributes<HTMLElement> {
  value: string;
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (value: string) => void;
}

interface TabsContentProps extends React.HTMLAttributes<HTMLElement> {
  value: string;
  children: React.ReactNode;
  activeTab?: string;
}

const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value,
  onValueChange,
  children,
  ...props
}) => {
  const [activeTab, setActiveTab] = useState(defaultValue || value || "");

  const handleTabChange = (newValue: string) => {
    setActiveTab(newValue);
    onValueChange?.(newValue);
  };

  return (
    <div className="tabs" {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            activeTab,
            onTabChange: handleTabChange,
          });
        }
        return child;
      })}
    </div>
  );
};

const TabsList: React.FC<TabsListProps> = ({ children, ...props }) => {
  return (
    <div className="flex border-b" {...props}>
      {children}
    </div>
  );
};

const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  activeTab,
  onTabChange,
  ...props
}) => {
  const isActive = activeTab === value;

  return (
    <button
      className={`px-4 py-2 text-sm font-medium border-b-2 ${
        isActive
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
      onClick={() => onTabChange?.(value)}
      {...props}
    >
      {children}
    </button>
  );
};

const TabsContent: React.FC<TabsContentProps> = ({
  value,
  children,
  activeTab,
  ...props
}) => {
  if (activeTab !== value) return null;

  return (
    <div className="mt-4" {...props}>
      {children}
    </div>
  );
};

export { Tabs, TabsList, TabsTrigger, TabsContent };
