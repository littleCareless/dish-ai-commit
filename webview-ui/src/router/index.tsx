import { useVSCodeContext } from "@/contexts/useVSCodeContext";
import { useTheme } from "@/hooks/useTheme";
import React from "react";
import { MemoryRouter, Navigate, Route, Routes } from "react-router-dom";

// 页面组件
import { AboutPage } from "@/pages/about-page";
import { CommitChatPage } from "@/pages/CommitChatPage";
import { ContextPage } from "@/pages/context-page";
import { ExperimentalPage } from "@/pages/experimental-page";
import { IndexingPage } from "@/pages/indexing-page";
import MigrationPage from "@/pages/migration-page";
import { ModelRegistryPage } from "@/pages/model-registry-page";
import { NotificationsPage } from "@/pages/notifications-page";
import { PromptsPage } from "@/pages/prompts-page";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { StoragePage } from "@/pages/storage-page";
import { UsagePage } from "@/pages/usage-page";
import WelcomePage from "@/pages/welcome-page";
import WeeklyReportPage from "@/pages/weekly-report-page";

// 布局组件
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { LoadingPage } from "@/components/common/LoadingPage";
import { Layout } from "@/components/layout/Layout";

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

  const initialEntries = [
    (window as Window & { initialRoute?: string }).initialRoute || "/",
  ];

  return (
    <ErrorBoundary>
      <MemoryRouter initialEntries={initialEntries}>
        <RouteGuard>
          <Routes>
            {/* 周报页面 - 独立布局 */}
            <Route path={routes.weeklyReport} element={<WeeklyReportPage />} />

            {/* 其他页面 - 使用公共布局 */}
            <Route
              path="/*"
              element={
                <Layout>
                  <Routes>
                    {/* 欢迎页面 */}
                    <Route path={routes.welcome} element={<WelcomePage />} />

                    {/* 设置页面 */}
                    <Route path={routes.settings} element={<SettingsPage />} />

                    {/* 迁移页面 */}
                    <Route
                      path={routes.migration}
                      element={<MigrationPage />}
                    />

                    {/* 通知页面 */}
                    <Route
                      path={routes.notifications}
                      element={<NotificationsPage />}
                    />

                    {/* 上下文页面 */}
                    <Route path={routes.context} element={<ContextPage />} />

                    {/* 提示词页面 */}
                    <Route path={routes.prompts} element={<PromptsPage />} />

                    {/* 模型目录页面 */}
                    <Route
                      path={routes.modelRegistry}
                      element={<ModelRegistryPage />}
                    />

                    {/* Commit Chat 页面 */}
                    <Route
                      path={routes.commitChat}
                      element={<CommitChatPage />}
                    />

                    {/* 实验性页面 */}
                    <Route
                      path={routes.experimental}
                      element={<ExperimentalPage />}
                    />

                    {/* 关于页面 */}
                    <Route path={routes.about} element={<AboutPage />} />

                    {/* 索引页面 */}
                    <Route path={routes.indexing} element={<IndexingPage />} />

                    {/* 用量页面 */}
                    <Route path={routes.usage} element={<UsagePage />} />

                    {/* 存储页面 */}
                    <Route path={routes.storage} element={<StoragePage />} />

                    {/* 404 页面 */}
                    <Route
                      path="*"
                      element={<Navigate to={routes.welcome} replace />}
                    />
                  </Routes>
                </Layout>
              }
            />
          </Routes>
        </RouteGuard>
      </MemoryRouter>
    </ErrorBoundary>
  );
};

// 注意：使用 React Router 的内置钩子替代自定义导航逻辑
// - useNavigate() 用于编程式导航
// - useLocation() 用于获取当前位置
// - useParams() 用于获取路由参数
