import { ConfigProvider } from "@arco-design/web-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useCallback, useEffect } from "react";
import { useEvent } from "react-use";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { ExtensionStateContextProvider } from "./context/ExtensionStateContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { VSCodeProvider, useVSCodeContext } from "./contexts/VSCodeContext";
import TranslationProvider from "./i18n/translation-context";
import { AppRouter } from "./router";
import { postMessage } from "./utils/vscode";

const STANDARD_TOOLTIP_DELAY = 300;

const App: React.FC = () => {
  // const { didHydrateState } = useExtensionState();
  useVSCodeContext(); // 确保在 Provider 内部使用

  const onMessage = useCallback((e: MessageEvent) => {
    const message = e.data;
    // 可以在这里处理全局消息
    console.log("Received message:", message);
  }, []);

  useEvent("message", onMessage);

  useEffect(() => {
    postMessage("webviewDidLaunch", {});
  }, []);

  // if (!didHydrateState) {
  //   // 在状态恢复之前，可以显示一个加载指示器
  //   return <div>Loading...</div>;
  // }

  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  );
};

const queryClient = new QueryClient();

const AppWithProviders = () => (
  <ConfigProvider>
    <ErrorBoundary>
      <VSCodeProvider>
        <SettingsProvider>
          <ExtensionStateContextProvider>
            <TranslationProvider>
              <QueryClientProvider client={queryClient}>
                <TooltipProvider delayDuration={STANDARD_TOOLTIP_DELAY}>
                  <App />
                </TooltipProvider>
              </QueryClientProvider>
            </TranslationProvider>
          </ExtensionStateContextProvider>
        </SettingsProvider>
      </VSCodeProvider>
    </ErrorBoundary>
  </ConfigProvider>
);

export default AppWithProviders;
