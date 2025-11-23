import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectOption } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Info } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { UserPreferences } from "../../types/settings";

interface PreferencesSettingsProps {
  preferences: UserPreferences;
  onChange: (preferences: UserPreferences) => void;
  className?: string;
  isLoading?: boolean;
}

export const PreferencesSettings: React.FC<PreferencesSettingsProps> = ({
  preferences,
  onChange,
  className = "",
}) => {
  const { t } = useTranslation("preferences-settings");

  const handleTemperatureChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = parseFloat(event.target.value || "0");
    onChange({ ...preferences, temperature: value });
  };

  const handleLanguageChange = (event: React.FormEvent<HTMLElement>) => {
    const value = (event.target as HTMLSelectElement)?.value || "";
    onChange({ ...preferences, language: value });
  };

  const getTemperatureDescription = (value: number) => {
    if (value === 0) return t("temperatureLevels.deterministic");
    if (value <= 0.5) return t("temperatureLevels.low");
    if (value <= 1.0) return t("temperatureLevels.balanced");
    if (value <= 1.5) return t("temperatureLevels.high");
    return t("temperatureLevels.max");
  };

  const languageOptions = [
    { value: "Simplified Chinese", labelKey: "languages.simplifiedChinese" },
    { value: "Traditional Chinese", labelKey: "languages.traditionalChinese" },
    { value: "Japanese", labelKey: "languages.japanese" },
    { value: "Korean", labelKey: "languages.korean" },
    { value: "Czech", labelKey: "languages.czech" },
    { value: "German", labelKey: "languages.german" },
    { value: "French", labelKey: "languages.french" },
    { value: "Italian", labelKey: "languages.italian" },
    { value: "Dutch", labelKey: "languages.dutch" },
    { value: "Portuguese", labelKey: "languages.portuguese" },
    { value: "Vietnamese", labelKey: "languages.vietnamese" },
    { value: "English", labelKey: "languages.english" },
    { value: "Spanish", labelKey: "languages.spanish" },
    { value: "Swedish", labelKey: "languages.swedish" },
    { value: "Russian", labelKey: "languages.russian" },
    { value: "Bahasa", labelKey: "languages.bahasa" },
    { value: "Polish", labelKey: "languages.polish" },
    { value: "Turkish", labelKey: "languages.turkish" },
    { value: "Thai", labelKey: "languages.thai" },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Temperature Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            {t("responseCreativity")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                {t("temperature", { temperature: preferences.temperature })}
              </Label>
              <Badge variant="outline">
                {getTemperatureDescription(preferences.temperature)}
              </Badge>
            </div>
            <Slider
              min={0}
              max={2}
              step={0.1}
              value={preferences.temperature}
              onChange={handleTemperatureChange}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              {t("temperatureDescription")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle>{t("language")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="language">{t("generatedContentLanguage")}</Label>
            <Select
              value={preferences.language}
              onChange={handleLanguageChange}
            >
              {languageOptions.map((option) => (
                <SelectOption key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </SelectOption>
              ))}
            </Select>
            <p className="text-sm text-muted-foreground">
              {t("generatedContentLanguageDescription")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
