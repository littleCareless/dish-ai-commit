import { useTheme } from "@/hooks/useTheme";
import React from "react";
import { useLocation } from "react-router-dom";
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
    <div className={`min-h-screen ${theme}`}>
      <div className="flex flex-col h-screen">
        <div className="flex flex-1 overflow-hidden">
          {/* 侧边导航 */}
          {!hideNavigation && (
            <div
              className="w-46 border-r flex-shrink-0"
              style={{
                backgroundColor:
                  "var(--vscode-sideBar-background, hsl(var(--card)))",
                backdropFilter: "blur(8px)",
                borderColor: "var(--vscode-sideBar-border, hsl(var(--border)))",
              }}
            >
              <Navigation />
            </div>
          )}

          {/* 主内容区域 */}
          <main
            className="flex-1 overflow-auto"
            style={{
              backgroundColor:
                "var(--vscode-editor-background, hsl(var(--background)))",
              color: "var(--vscode-editor-foreground, hsl(var(--foreground)))",
            }}
          >
            <div className="h-full">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
};
