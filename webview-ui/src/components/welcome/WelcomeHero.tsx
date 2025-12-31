import { Button } from "@/components/ui/button";
import { GitCommit, Sparkles, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

declare global {
  interface Window {
    IMAGES_BASE_URI?: string;
  }
}

interface WelcomeHeroProps {
  onGetStarted?: () => void;
}

const WelcomeHero = ({ onGetStarted }: WelcomeHeroProps) => {
  const { t } = useTranslation("welcome-page");
  const [imagesBaseUri] = useState(() => window.IMAGES_BASE_URI || "");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`flex flex-col items-center justify-center py-8 px-4 transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {/* Logo */}
      <div className="relative mb-6">
        <div
          className="absolute -inset-4 rounded-full opacity-20 blur-xl animate-pulse"
          style={{
            background:
              "linear-gradient(135deg, var(--vscode-button-background), var(--vscode-textLink-foreground))",
          }}
        />
        <div
          className="relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
          style={{
            background:
              "linear-gradient(135deg, var(--vscode-button-background), var(--vscode-textLink-foreground))",
          }}
        >
          {imagesBaseUri ? (
            <img
              src={`${imagesBaseUri}/icon.svg`}
              alt={t("images.dishCommitAlt")}
              className="w-12 h-12"
            />
          ) : (
            <GitCommit className="w-10 h-10 text-white" />
          )}
        </div>
      </div>

      {/* Title */}
      <h1
        className="text-2xl font-bold mb-2 text-center"
        style={{ color: "var(--vscode-foreground)" }}
      >
        {t("hero.title")}
      </h1>

      {/* Subtitle with gradient */}
      <p
        className="text-base mb-4 text-center max-w-md"
        style={{ color: "var(--vscode-descriptionForeground)" }}
      >
        {t("hero.subtitle")}
      </p>

      {/* Feature badges */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        <FeatureBadge
          icon={<Sparkles className="w-3.5 h-3.5" />}
          text={t("hero.badges.aiPowered")}
        />
        <FeatureBadge
          icon={<Zap className="w-3.5 h-3.5" />}
          text={t("hero.badges.fastGeneration")}
        />
        <FeatureBadge
          icon={<GitCommit className="w-3.5 h-3.5" />}
          text={t("hero.badges.standardCommit")}
        />
      </div>

      {/* CTA Button */}
      {onGetStarted && (
        <div className="flex justify-center">
          <Button
            onClick={onGetStarted}
            className="group relative w-fit px-6 py-2.5 font-medium text-sm transition-all duration-300 hover:scale-105 active:scale-95"
          >
            {t("hero.getStarted")}
            <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-12" />
          </Button>
        </div>
      )}
    </div>
  );
};

const FeatureBadge = ({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) => (
  <span
    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors"
    style={{
      backgroundColor: "var(--vscode-badge-background)",
      color: "var(--vscode-badge-foreground)",
    }}
  >
    {icon}
    {text}
  </span>
);

export default WelcomeHero;
