import React from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { Navigation } from "./Navigation";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { theme } = useTheme();

  // 某些页面不需要导航栏
  const hideNavigation = ["/onboarding", "/vscode-test"].includes(
    location.pathname,
  );

  return (
    <div className={`min-h-screen bg-background text-foreground ${theme}`}>
      <div className="flex flex-col h-screen">
        <div className="flex flex-1 overflow-hidden">
          {/* 侧边导航 */}
          {!hideNavigation && (
            <div className="w-52 border-r bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60 flex-shrink-0">
              <Navigation />
            </div>
          )}

          {/* 主内容区域 */}
          <main className="flex-1 overflow-auto bg-background">
            <div className="h-full">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
};
