import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { useVSCodeContext } from "../contexts/VSCodeContext";

// 页面组件
import { SettingsPageNew } from "../pages/settings/SettingsPageNew";
import WeeklyReportPage from "../pages/weekly-report-page";
import { VSCodeComponentsTest } from "../pages/VSCodeComponentsTest";
import { CommitChatPage } from "../pages/CommitChatPage";
import { HelpPage } from "../pages/HelpPage";
import { OnboardingPage } from "../pages/OnboardingPage";
import { OperationGuidePage } from "../pages/OperationGuidePage";
import { TroubleshootingPage } from "../pages/TroubleshootingPage";

// 布局组件
import { Layout } from "../components/layout/Layout";
import { LoadingPage } from "../components/common/LoadingPage";
import { ErrorBoundary } from "../components/common/ErrorBoundary";

import { routes } from "./routes";

// 路由守卫组件
const RouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isReady } = useVSCodeContext();

  if (!isReady) {
    return <LoadingPage />;
  }

  return <>{children}</>;
};

// 主路由组件
export const AppRouter: React.FC = () => {
  const { theme } = useTheme();

  // 应用主题到 document 元素
  React.useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <RouteGuard>
          <Layout>
            <Routes>
              {/* 默认重定向到设置页面 */}
              <Route
                path="/"
                element={<Navigate to={routes.settings} replace />}
              />

              {/* 设置页面 */}
              <Route path={routes.settings} element={<SettingsPageNew />} />

              {/* 周报页面 */}
              <Route
                path={routes.weeklyReport}
                element={<WeeklyReportPage />}
              />

              {/* VSCode 组件测试页面 */}
              <Route
                path={routes.vscodeTest}
                element={<VSCodeComponentsTest />}
              />

              {/* 提交聊天页面 */}
              <Route path={routes.commitChat} element={<CommitChatPage />} />

              {/* 帮助页面 */}
              <Route path={routes.help} element={<HelpPage />} />

              {/* 新用户引导页面 */}
              <Route path={routes.onboarding} element={<OnboardingPage />} />

              {/* 操作指导页面 */}
              <Route
                path={routes.operationGuide}
                element={<OperationGuidePage />}
              />

              {/* 故障排除页面 */}
              <Route
                path={routes.troubleshooting}
                element={<TroubleshootingPage />}
              />

              {/* 404 页面 */}
              <Route
                path="*"
                element={<Navigate to={routes.settings} replace />}
              />
            </Routes>
          </Layout>
        </RouteGuard>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

// 路由工具函数
export const useNavigation = () => {
  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const goBack = () => {
    window.history.back();
  };

  const goForward = () => {
    window.history.forward();
  };

  return { navigate, goBack, goForward };
};

// 路由状态管理
export const useRouteState = () => {
  const [currentPath, setCurrentPath] = React.useState(
    window.location.pathname,
  );

  React.useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return { currentPath };
};
