import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { Menu, Moon, Sun, X } from "lucide-react";
import React from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";

export const Header: React.FC = () => {
  const location = useLocation();
  const { toggleTheme, isDark } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // 获取当前页面标题
  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case "/settings":
        return "设置";
      case "/commit-chat":
        return "提交聊天";
      case "/weekly-report":
        return "周报";
      case "/help":
        return "帮助";
      case "/operation-guide":
        return "操作指导";
      case "/troubleshooting":
        return "故障排除";
      case "/vscode-test":
        return "组件测试";
      default:
        return "Dish AI Commit Gen";
    }
  };

  return (
    <header className="bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b px-6 py-4">
      <div className="flex items-center justify-between">
        {/* 左侧：页面标题 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">
                D
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {getPageTitle()}
              </h1>
              <p className="text-sm text-muted-foreground">
                AI 驱动的提交信息生成工具
              </p>
            </div>
          </div>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-3">
          {/* 主题切换 */}
          <VSCodeButton
            appearance="icon"
            onClick={toggleTheme}
            className="h-9 w-9 p-0 rounded-lg hover:bg-accent"
            title={`切换到${isDark ? "浅色" : "深色"}主题`}
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </VSCodeButton>

          {/* 移动端菜单按钮 */}
          <VSCodeButton
            appearance="icon"
            className="h-9 w-9 p-0 rounded-lg hover:bg-accent md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </VSCodeButton>
        </div>
      </div>

      {/* 移动端菜单 */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-4 pt-4 border-t">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              移动端导航菜单 - 功能开发中
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
