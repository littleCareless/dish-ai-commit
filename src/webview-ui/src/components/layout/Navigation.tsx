import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Settings, 
  BarChart3, 
  MessageSquare, 
  HelpCircle, 
  Play, 
  BookOpen, 
  Wrench,
  Home
} from 'lucide-react';
import { routes } from '../../router';
import { cn } from '../../lib/utils';

const navigationItems = [
  {
    path: routes.settings,
    label: '设置',
    icon: Settings,
    description: '配置 AI 提供商和偏好设置'
  },
  {
    path: routes.commitChat,
    label: '提交聊天',
    icon: MessageSquare,
    description: '与 AI 对话生成提交信息'
  },
  {
    path: routes.weeklyReport,
    label: '周报',
    icon: BarChart3,
    description: '生成周报和项目统计'
  },
  {
    path: routes.help,
    label: '帮助',
    icon: HelpCircle,
    description: '查看帮助文档和指南'
  },
  {
    path: routes.operationGuide,
    label: '操作指导',
    icon: BookOpen,
    description: '分步操作指导'
  },
  {
    path: routes.troubleshooting,
    label: '故障排除',
    icon: Wrench,
    description: '问题诊断和解决方案'
  },
  {
    path: routes.vscodeTest,
    label: '组件测试',
    icon: Play,
    description: 'VSCode 组件测试页面'
  }
];

export const Navigation: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="w-64 bg-card border-r border-border flex flex-col">
      {/* 导航头部 */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Home className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Dish AI</h2>
            <p className="text-xs text-muted-foreground">Commit Gen</p>
          </div>
        </div>
      </div>

      {/* 导航菜单 */}
      <div className="flex-1 p-4">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive: navIsActive }: { isActive: boolean }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    (isActive || navIsActive) && 'bg-accent text-accent-foreground'
                  )
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </div>
                </div>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* 导航底部 */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          <p>Dish AI Commit Gen</p>
          <p>v1.0.0</p>
        </div>
      </div>
    </nav>
  );
};
