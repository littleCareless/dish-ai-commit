import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  MessageSquare,
  GitBranch,
  Zap,
  Shield,
  Globe,
  Settings,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Feature {
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  gradient: string;
}

const featureConfigs: Omit<Feature, "icon">[] = [
  {
    titleKey: "features.smartCommit.title",
    descriptionKey: "features.smartCommit.description",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    titleKey: "features.multiRepo.title",
    descriptionKey: "features.multiRepo.description",
    gradient: "from-purple-500/20 to-pink-500/20",
  },
  {
    titleKey: "features.fastResponse.title",
    descriptionKey: "features.fastResponse.description",
    gradient: "from-amber-500/20 to-orange-500/20",
  },
  {
    titleKey: "features.secure.title",
    descriptionKey: "features.secure.description",
    gradient: "from-green-500/20 to-emerald-500/20",
  },
  {
    titleKey: "features.multiLanguage.title",
    descriptionKey: "features.multiLanguage.description",
    gradient: "from-indigo-500/20 to-violet-500/20",
  },
  {
    titleKey: "features.customizable.title",
    descriptionKey: "features.customizable.description",
    gradient: "from-rose-500/20 to-red-500/20",
  },
];

const featureIcons = [
  <MessageSquare key="smart" className="w-5 h-5" />,
  <GitBranch key="multi" className="w-5 h-5" />,
  <Zap key="fast" className="w-5 h-5" />,
  <Shield key="secure" className="w-5 h-5" />,
  <Globe key="lang" className="w-5 h-5" />,
  <Settings key="custom" className="w-5 h-5" />,
];

interface FeatureShowcaseProps {
  className?: string;
}

const FeatureShowcase = ({ className = "" }: FeatureShowcaseProps) => {
  const { t } = useTranslation("welcome-page");
  const [visibleItems, setVisibleItems] = useState<number[]>([]);

  const features = useMemo(
    () =>
      featureConfigs.map((config, index) => ({
        ...config,
        icon: featureIcons[index],
        title: t(config.titleKey),
        description: t(config.descriptionKey),
      })),
    [t],
  );

  useEffect(() => {
    features.forEach((_, index) => {
      setTimeout(() => {
        setVisibleItems((prev) => [...prev, index]);
      }, 150 * index);
    });
  }, [features]);

  return (
    <div className={`py-6 ${className}`}>
      <h2
        className="text-lg font-semibold mb-4 text-center"
        style={{ color: "var(--vscode-foreground)" }}
      >
        {t("features.title")}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-2">
        {features.map((feature, index) => (
          <FeatureCard
            key={feature.title}
            feature={feature}
            isVisible={visibleItems.includes(index)}
            delay={index * 100}
          />
        ))}
      </div>
    </div>
  );
};

interface DisplayFeature {
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  gradient: string;
  title: string;
  description: string;
}

interface FeatureCardProps {
  feature: DisplayFeature;
  isVisible: boolean;
  delay: number;
}

const FeatureCard = ({ feature, isVisible }: FeatureCardProps) => {
  return (
    <Card
      className={`group cursor-default transition-all duration-500 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
      style={{
        borderColor: "var(--vscode-panel-border)",
        backgroundColor: "var(--vscode-editor-background)",
      }}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div
            className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br ${feature.gradient} transition-transform group-hover:scale-110`}
            style={{ color: "var(--vscode-foreground)" }}
          >
            {feature.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="font-medium text-sm mb-0.5 truncate"
              style={{ color: "var(--vscode-foreground)" }}
            >
              {feature.title}
            </h3>
            <p
              className="text-xs leading-relaxed line-clamp-2"
              style={{ color: "var(--vscode-descriptionForeground)" }}
            >
              {feature.description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureShowcase;
