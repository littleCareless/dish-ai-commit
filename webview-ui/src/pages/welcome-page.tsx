import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Zap } from "lucide-react";
import { useVSCodeContext } from "@/contexts/useVSCodeContext";
import WelcomeHero from "@/components/welcome/WelcomeHero";
import FeatureShowcase from "@/components/welcome/FeatureShowcase";
import SetupWizard from "@/components/welcome/SetupWizard";
import QuickStartGuide from "@/components/welcome/QuickStartGuide";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { postMessage } from "@/utils/vscode";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import { useNavigate } from "react-router-dom";
import { routes } from "@/router/routes";

type ViewMode = "welcome" | "setup";

const WelcomePage = () => {
  const { t } = useTranslation("welcome-page");
  const { initialData, isFirstInstall } = useVSCodeContext();
  const [viewMode, setViewMode] = useState<ViewMode>("welcome");
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [quickActionMessage, setQuickActionMessage] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);
  const setupRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const apiConfiguration = useMemo(
    () => initialData?.apiConfiguration || {},
    [initialData?.apiConfiguration],
  );

  const handleGetStarted = useCallback(() => {
    setViewMode("setup");
    setTimeout(() => {
      setupRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  const handleComplete = useCallback(() => {
    console.log("[WelcomePage] Setup completed, navigating to settings...");
    // 跳转到设置页面
    navigate(routes.settings);
  }, [navigate]);

  const handleScroll = useCallback(() => {
    if (contentRef.current) {
      const { scrollTop } = contentRef.current;
      if (scrollTop > 50) {
        setShowScrollHint(false);
      }
    }
  }, []);

  // 首次安装时自动跳转到设置向导（使用 useLayoutEffect 避免级联渲染）
  useEffect(() => {
    if (isFirstInstall) {
      // 使用微任务延迟状态更新，避免级联渲染
      Promise.resolve().then(() => {
        setViewMode("setup");
      });
    }
  }, [isFirstInstall]);

  useEffect(() => {
    const content = contentRef.current;
    if (content) {
      content.addEventListener("scroll", handleScroll);
      return () => content.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command !== ExtensionResponse.FeaturesCommandExecuted) {
        return;
      }

      const action = String(message.data?.action ?? "");
      const actionLabel = t(`quickActions.actions.${action}`);
      setExecutingAction(null);
      if (message.data?.success) {
        setQuickActionMessage(
          t("quickActions.result.success", { action: actionLabel }),
        );
      } else {
        setQuickActionMessage(
          t("quickActions.result.failed", {
            action: actionLabel,
            error: message.data?.error || "unknown",
          }),
        );
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [t]);

  const handleExecuteCommand = useCallback(
    (action: string) => {
      setExecutingAction(action);
      setQuickActionMessage(
        t("quickActions.result.running", {
          action: t(`quickActions.actions.${action}`),
        }),
      );
      postMessage(
        UIRequest.FeaturesExecuteCommand,
        { action, source: "welcome-page" },
        { allowDuplicate: true },
      );
    },
    [t],
  );

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ backgroundColor: "var(--vscode-sideBar-background)" }}
    >
      {/* Main scrollable content - 占满全屏 */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{
          scrollBehavior: "smooth",
        }}
      >
        {/* Background decoration */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 0 }}
        >
          <div
            className="absolute -top-1/2 -right-1/2 w-full h-full rounded-full opacity-5 blur-3xl"
            style={{ background: "var(--vscode-button-background)" }}
          />
          <div
            className="absolute -bottom-1/2 -left-1/2 w-full h-full rounded-full opacity-5 blur-3xl"
            style={{ background: "var(--vscode-textLink-foreground)" }}
          />
        </div>

        {/* Content container */}
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-2">
          {/* Hero section - 仅在非首次安装或欢迎模式下显示 */}
          {(!isFirstInstall || viewMode === "welcome") && (
            <WelcomeHero
              onGetStarted={
                viewMode === "welcome" ? handleGetStarted : undefined
              }
            />
          )}

          {/* Feature showcase - 仅在非首次安装时显示 */}
          {!isFirstInstall && <FeatureShowcase className="mb-4" />}

          {!isFirstInstall && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="w-4 h-4" />
                  {t("quickActions.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t("quickActions.description")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "generateCommit",
                    "reviewCode",
                    "generateBranchName",
                    "generatePRSummary",
                    "generateWeeklyReport",
                  ].map((action) => (
                    <Button
                      key={action}
                      appearance="secondary"
                      disabled={executingAction !== null}
                      onClick={() => handleExecuteCommand(action)}
                    >
                      {executingAction === action
                        ? t("quickActions.buttonRunning")
                        : t(`quickActions.actions.${action}`)}
                    </Button>
                  ))}
                </div>
                {quickActionMessage && (
                  <p className="text-xs text-muted-foreground">
                    {quickActionMessage}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Setup wizard or quick start */}
          <div ref={setupRef}>
            {viewMode === "setup" ? (
              <SetupWizard
                initialConfig={apiConfiguration}
                onComplete={handleComplete}
                isFirstInstall={isFirstInstall}
              />
            ) : (
              !isFirstInstall && <QuickStartGuide />
            )}
          </div>

          {/* Footer */}
          <footer
            className="py-6 text-center text-xs"
            style={{ color: "var(--vscode-descriptionForeground)" }}
          >
            <p className="mb-1">{t("footer.title")}</p>
            <p className="opacity-70">
              {t("footer.madeWith")}{" "}
              <a
                href="https://github.com/littleCareless"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-100 transition-opacity"
                style={{ color: "var(--vscode-textLink-foreground)" }}
              >
                littleCareless
              </a>
            </p>
          </footer>
        </div>
      </div>

      {/* Scroll hint indicator - 仅在欢迎模式下显示 */}
      {viewMode === "welcome" && showScrollHint && !isFirstInstall && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce transition-opacity duration-300"
          style={{
            opacity: showScrollHint ? 0.6 : 0,
            color: "var(--vscode-descriptionForeground)",
          }}
        >
          <span className="text-xs">{t("scrollHint")}</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};

export default WelcomePage;
