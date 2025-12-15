import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { postMessage } from "@/utils/vscode";
import { useVSCodeContext } from "@/contexts/VSCodeContext";
import WelcomeHero from "@/components/welcome/WelcomeHero";
import FeatureShowcase from "@/components/welcome/FeatureShowcase";
import SetupWizard from "@/components/welcome/SetupWizard";
import QuickStartGuide from "@/components/welcome/QuickStartGuide";

type ViewMode = "welcome" | "setup";

const WelcomePage = () => {
  const { t } = useTranslation("welcome-page");
  const { initialData } = useVSCodeContext();
  const [viewMode, setViewMode] = useState<ViewMode>("welcome");
  const [showScrollHint, setShowScrollHint] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const setupRef = useRef<HTMLDivElement>(null);

  const apiConfiguration = useMemo(
    () => initialData?.apiConfiguration || {},
    [initialData?.apiConfiguration],
  );
  const currentApiConfigName = initialData?.currentApiConfigName || "default";

  const handleGetStarted = useCallback(() => {
    setViewMode("setup");
    setTimeout(() => {
      setupRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  const handleComplete = useCallback(() => {
    postMessage("upsertApiConfiguration", {
      text: currentApiConfigName,
      apiConfiguration,
    });
  }, [apiConfiguration, currentApiConfigName]);

  const handleScroll = useCallback(() => {
    if (contentRef.current) {
      const { scrollTop } = contentRef.current;
      if (scrollTop > 50) {
        setShowScrollHint(false);
      }
    }
  }, []);

  useEffect(() => {
    const content = contentRef.current;
    if (content) {
      content.addEventListener("scroll", handleScroll);
      return () => content.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ backgroundColor: "var(--vscode-sideBar-background)" }}
    >
      {/* Main scrollable content */}
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
          {/* Hero section */}
          <WelcomeHero
            onGetStarted={viewMode === "welcome" ? handleGetStarted : undefined}
          />

          {/* Feature showcase - always visible */}
          <FeatureShowcase className="mb-4" />

          {/* Setup wizard or quick start */}
          <div ref={setupRef}>
            {viewMode === "setup" ? (
              <SetupWizard
                initialConfig={apiConfiguration}
                currentApiConfigName={currentApiConfigName}
                onComplete={handleComplete}
              />
            ) : (
              <QuickStartGuide />
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

      {/* Scroll hint indicator */}
      {viewMode === "welcome" && showScrollHint && (
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
