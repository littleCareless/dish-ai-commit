import "@vscode/webview-ui-toolkit/dist/toolkit";
import React, { createContext, useContext, useState } from "react";

interface TabsContextType {
  activeTab: string;
  onTabChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

interface TabsProps extends React.HTMLAttributes<HTMLElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

interface TabsListProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  orientation?: "horizontal" | "vertical";
}

interface TabsTriggerProps extends React.HTMLAttributes<HTMLElement> {
  value: string;
  children: React.ReactNode;
}

interface TabsContentProps extends React.HTMLAttributes<HTMLElement> {
  value: string;
  children: React.ReactNode;
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
    <TabsContext.Provider value={{ activeTab, onTabChange: handleTabChange }}>
      <div className="tabs" {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

const TabsList: React.FC<TabsListProps> = ({
  children,
  orientation = "horizontal",
  className = "",
  ...props
}) => {
  const baseClasses =
    orientation === "horizontal" ? "flex" : "flex flex-col space-y-1";

  return (
    <div
      className={`${baseClasses} ${className}`}
      style={{
        borderBottom:
          orientation === "horizontal"
            ? "1px solid var(--vscode-panel-border)"
            : "none",
      }}
      {...props}
    >
      {children}
    </div>
  );
};

const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  className = "",
  ...props
}) => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("TabsTrigger must be used within a Tabs component");
  }

  const { activeTab, onTabChange } = context;
  const isActive = activeTab === value;

  const baseClasses = "px-4 py-2 text-sm font-medium transition-colors";
  const activeClasses = isActive
    ? "border-b-2"
    : "border-transparent border-b-2";

  return (
    <button
      className={`${baseClasses} ${activeClasses} ${className}`}
      style={{
        borderColor: isActive
          ? "var(--vscode-tab-activeBorder)"
          : "transparent",
        color: isActive
          ? "var(--vscode-tab-activeForeground)"
          : "var(--vscode-tab-inactiveForeground)",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = "var(--vscode-tab-hoverForeground)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = "var(--vscode-tab-inactiveForeground)";
        }
      }}
      onClick={() => onTabChange(value)}
      {...props}
    >
      {children}
    </button>
  );
};

const TabsContent: React.FC<TabsContentProps> = ({
  value,
  children,
  className = "",
  ...props
}) => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("TabsContent must be used within a Tabs component");
  }

  const { activeTab } = context;

  if (activeTab !== value) return null;

  return (
    <div className={`mt-4 ${className}`} {...props}>
      {children}
    </div>
  );
};

export { Tabs, TabsContent, TabsList, TabsTrigger };
