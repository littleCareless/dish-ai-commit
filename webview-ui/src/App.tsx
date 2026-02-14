import { VSCodeProvider } from "@/contexts/VSCodeContext";
import { useVSCodeContext } from "@/contexts/useVSCodeContext";
import { ConfigProvider } from "@arco-design/web-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useCallback, useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { useEvent } from "react-use";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { LoadingPage } from "./components/common/LoadingPage";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { ExtensionStateContextProvider } from "./context/ExtensionStateContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import SessionManager from "./core/SessionManager";
import i18n from "./i18n/setup";
import { AppRouter } from "./router";
import { postMessage } from "./utils/vscode";

console.log("[App] React version:", React.version);

const STANDARD_TOOLTIP_DELAY = 300;

const App: React.FC = () => {
  useVSCodeContext();
  const [handshakeComplete, setHandshakeComplete] = useState(false);
  const [handshakeError, setHandshakeError] = useState<string | null>(null);

  const onMessage = useCallback((e: MessageEvent) => {
    const message = e.data;
    if (message.command === "webview.handshake.ack") {
      console.log("[App] Received handshake acknowledgment");
      SessionManager.getInstance().markHandshakeComplete();
      setHandshakeComplete(true);
      setHandshakeError(null);
    }
  }, []);

  useEvent("message", onMessage);

  useEffect(() => {
    const sessionManager = SessionManager.getInstance();
    sessionManager.initSession();
    sessionManager.markHandshakeStarted();

    postMessage("webview.handshake", {
      sessionId: sessionManager.getSessionId(),
      timestamp: Date.now(),
      capabilities: ["v1"],
    });

    console.log("[App] Handshake initiated");

    const timeout = setTimeout(() => {
      if (!handshakeComplete) {
        console.warn("[App] Handshake timeout, proceeding anyway");
        setHandshakeComplete(true);
        setHandshakeError("Handshake timeout");
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [handshakeComplete]);

  if (!handshakeComplete) {
    return <LoadingPage />;
  }

  if (handshakeError) {
    console.warn("[App] Proceeding with handshake error:", handshakeError);
  }

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
      <I18nextProvider i18n={i18n}>
        <VSCodeProvider>
          <SettingsProvider>
            <ExtensionStateContextProvider>
              {/* <I18nProvider> */}
              <QueryClientProvider client={queryClient}>
                <TooltipProvider delayDuration={STANDARD_TOOLTIP_DELAY}>
                  <App />
                </TooltipProvider>
              </QueryClientProvider>
              {/* </I18nProvider> */}
            </ExtensionStateContextProvider>
          </SettingsProvider>
        </VSCodeProvider>
      </I18nextProvider>
    </ErrorBoundary>
  </ConfigProvider>
);

export default AppWithProviders;
