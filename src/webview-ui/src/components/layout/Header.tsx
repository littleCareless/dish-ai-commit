import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/button';
import { Sun, Moon, Menu, X } from 'lucide-react';

export const Header: React.FC = () => {
  const location = useLocation();
  const { toggleTheme, isDark } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // 获取当前页面标题
  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/settings':
        return '设置';
      case '/commit-chat':
        return '提交聊天';
      case '/weekly-report':
        return '周报';
      case '/help':
        return '帮助';
      case '/operation-guide':
        return '操作指导';
      case '/troubleshooting':
        return '故障排除';
      case '/vscode-test':
        return '组件测试';
      default:
        return 'Dish AI Commit Gen';
    }
  };

  return (
    <header className="bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        {/* 左侧：页面标题 */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">
            {getPageTitle()}
          </h1>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 主题切换 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-8 w-8 p-0"
            title={`切换到${isDark ? '浅色' : '深色'}主题`}
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* 移动端菜单按钮 */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* 移动端菜单 */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-border">
          <div className="space-y-2">
            {/* 这里可以添加移动端导航菜单 */}
            <div className="text-sm text-muted-foreground">
              移动端导航菜单
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
