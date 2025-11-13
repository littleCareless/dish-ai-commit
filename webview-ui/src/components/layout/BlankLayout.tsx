import React from "react";
import { useTheme } from "../../hooks/useTheme";

interface BlankLayoutProps {
  children: React.ReactNode;
}

export const BlankLayout: React.FC<BlankLayoutProps> = ({ children }) => {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen bg-background text-foreground ${theme}`}>
      <main className="flex-1 overflow-auto bg-background">
        <div className="h-full">{children}</div>
      </main>
    </div>
  );
};
