import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, BookOpen, Github, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface GuideLinkConfig {
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  href: string;
  isExternal?: boolean;
}

const guideLinkConfigs: GuideLinkConfig[] = [
  {
    icon: <BookOpen className="w-4 h-4" />,
    titleKey: "quickStart.links.gettingStarted.title",
    descriptionKey: "quickStart.links.gettingStarted.description",
    href: "https://github.com/littleCareless/dish-ai-commit#readme",
    isExternal: true,
  },
  {
    icon: <Github className="w-4 h-4" />,
    titleKey: "quickStart.links.github.title",
    descriptionKey: "quickStart.links.github.description",
    href: "https://github.com/littleCareless/dish-ai-commit",
    isExternal: true,
  },
  {
    icon: <MessageCircle className="w-4 h-4" />,
    titleKey: "quickStart.links.community.title",
    descriptionKey: "quickStart.links.community.description",
    href: "https://github.com/littleCareless/dish-ai-commit/issues",
    isExternal: true,
  },
];

interface QuickStartGuideProps {
  className?: string;
}

const QuickStartGuide = ({ className = "" }: QuickStartGuideProps) => {
  const { t } = useTranslation("welcome-page");
  const [isVisible, setIsVisible] = useState(false);

  const guideLinks = useMemo(
    () =>
      guideLinkConfigs.map((config) => ({
        ...config,
        title: t(config.titleKey),
        description: t(config.descriptionKey),
      })),
    [t],
  );

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`py-4 ${className} transition-all duration-500 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <h2
        className="text-lg font-semibold mb-3 text-center"
        style={{ color: "var(--vscode-foreground)" }}
      >
        {t("quickStart.title")}
      </h2>
      <div className="flex flex-wrap justify-center gap-2 px-2">
        {guideLinks.map((link) => (
          <a
            key={link.title}
            href={link.href}
            target={link.isExternal ? "_blank" : undefined}
            rel={link.isExternal ? "noopener noreferrer" : undefined}
            className="block group"
          >
            <Card
              className="transition-all duration-300 hover:scale-105 cursor-pointer"
              style={{
                borderColor: "var(--vscode-panel-border)",
                backgroundColor: "var(--vscode-editor-background)",
              }}
            >
              <CardContent className="p-3 flex items-center gap-2">
                <span
                  className="shrink-0"
                  style={{ color: "var(--vscode-textLink-foreground)" }}
                >
                  {link.icon}
                </span>
                <div className="min-w-0">
                  <div
                    className="text-sm font-medium flex items-center gap-1"
                    style={{ color: "var(--vscode-foreground)" }}
                  >
                    {link.title}
                    {link.isExternal && (
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    )}
                  </div>
                  <p
                    className="text-xs truncate"
                    style={{ color: "var(--vscode-descriptionForeground)" }}
                  >
                    {link.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
};

export default QuickStartGuide;
