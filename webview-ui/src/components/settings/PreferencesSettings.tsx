import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectOption } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { TagInput } from "@/components/ui/tag-input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DEFAULT_SKIP_DIFF_EXTENSIONS,
  DEFAULT_SKIP_DIFF_PATTERNS,
  DEFAULT_USER_PREFERENCES,
  UserPreferences,
} from "@/types/settings";
import { FileCode, Info } from "lucide-react";
import React, { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface PreferencesSettingsProps {
  preferences: UserPreferences;
  onChange: (preferences: UserPreferences) => void;
  className?: string;
  isLoading?: boolean;
}

export const PreferencesSettings: React.FC<PreferencesSettingsProps> = ({
  preferences: userPreferences,
  onChange,
  className = "",
}) => {
  const preferences = React.useMemo(
    () => ({ ...DEFAULT_USER_PREFERENCES, ...userPreferences }),
    [userPreferences],
  );
  const { t } = useTranslation("preferences-settings");

  const form = useForm<UserPreferences>({
    defaultValues: preferences,
  });

  // 当外部 preferences 变化时更新表单
  useEffect(() => {
    form.reset(preferences);
  }, [preferences, form]);

  const values = useWatch({ control: form.control });

  // 监听表单值变化并通知父组件
  useEffect(() => {
    onChange(values as UserPreferences);
  }, [values, onChange]);

  const getTemperatureLabel = (temp: number): string => {
    if (temp === 0) return t("temperatureLevels.deterministic");
    if (temp < 0.3) return t("temperatureLevels.low");
    if (temp < 0.7) return t("temperatureLevels.balanced");
    if (temp < 1.0) return t("temperatureLevels.high");
    return t("temperatureLevels.max");
  };

  // 别名，保持向后兼容
  const getTemperatureDescription = getTemperatureLabel;

  // === Diff 跳过配置相关 ===

  // 预设组合
  const presetGroups = {
    images: [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".bmp",
      ".ico",
      ".webp",
      ".svg",
      ".tiff",
      ".tif",
      ".psd",
      ".ai",
      ".eps",
      ".raw",
      ".heic",
      ".avif",
    ],
    videos: [
      ".mp4",
      ".avi",
      ".mov",
      ".mkv",
      ".webm",
      ".flv",
      ".wmv",
      ".m4v",
      ".mpg",
      ".mpeg",
      ".3gp",
      ".ogv",
    ],
    audios: [".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac", ".wma", ".opus"],
    documents: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"],
  };

  // 恢复默认配置
  const handleResetToDefault = () => {
    form.setValue("skipDiffFileExtensions", DEFAULT_SKIP_DIFF_EXTENSIONS);
    form.setValue("maxDiffFileSizeKB", 500);
    form.setValue("autoDetectBinaryFiles", true);
    form.setValue("skipDiffPathPatterns", DEFAULT_SKIP_DIFF_PATTERNS);
    form.setValue("respectGitAttributes", true);
  };

  // 添加预设组合
  const handleAddPreset = (presetName: keyof typeof presetGroups) => {
    const currentExtensions = form.getValues("skipDiffFileExtensions") || [];
    const presetExtensions = presetGroups[presetName];
    const newExtensions = [
      ...currentExtensions,
      ...presetExtensions.filter(
        (ext) => !(currentExtensions as string[]).includes(ext),
      ),
    ];
    form.setValue("skipDiffFileExtensions", newExtensions);
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

  const renderTemperatureField = (
    name:
      | "commitTemperature"
      | "reviewTemperature"
      | "branchNameTemperature"
      | "weeklyReportTemperature",
    label: string,
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <FormLabel>
              {label} ({field.value})
            </FormLabel>
            <Badge variant="outline">
              {getTemperatureDescription(field.value as number)}
            </Badge>
          </div>
          <FormControl>
            <Slider
              min={0}
              max={2}
              step={0.1}
              value={[field.value as number]}
              onValueChange={(value: number[]) => field.onChange(value[0])}
              className="w-full"
            />
          </FormControl>
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <div className={`space-y-6 ${className}`}>
        {/* Temperature Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              {t("temperatureSettings")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderTemperatureField(
              "commitTemperature",
              t("commitTemperature"),
            )}
            {renderTemperatureField(
              "reviewTemperature",
              t("reviewTemperature"),
            )}
            {renderTemperatureField(
              "branchNameTemperature",
              t("branchNameTemperature"),
            )}
            {renderTemperatureField(
              "weeklyReportTemperature",
              t("weeklyReportTemperature"),
            )}

            <FormDescription>{t("temperatureDescription")}</FormDescription>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle>{t("language")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("generatedContentLanguage")}</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onChange={(event: React.FormEvent<HTMLElement>) => {
                        const value =
                          (event.target as HTMLSelectElement)?.value || "";
                        field.onChange(value);
                      }}
                    >
                      {languageOptions.map((option) => (
                        <SelectOption key={option.value} value={option.value}>
                          {t(option.labelKey)}
                        </SelectOption>
                      ))}
                    </Select>
                  </FormControl>
                  <FormDescription>
                    {t("generatedContentLanguageDescription")}
                  </FormDescription>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Diff 跳过配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              {t("skipDiffConfig")}
            </CardTitle>
            <CardDescription>{t("skipDiffConfigDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 文件扩展名 */}
            <FormField
              control={form.control}
              name="skipDiffFileExtensions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fileExtensionsLabel")}</FormLabel>
                  <FormControl>
                    <TagInput
                      value={field.value || []}
                      onChange={field.onChange}
                      placeholder={t("extensionPlaceholder")}
                    />
                  </FormControl>
                  <FormDescription>{t("skipDiffDescription")}</FormDescription>
                </FormItem>
              )}
            />

            {/* 路径模式 */}
            <FormField
              control={form.control}
              name="skipDiffPathPatterns"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("pathPatternsLabel")}</FormLabel>
                  <FormControl>
                    <TagInput
                      value={field.value || []}
                      onChange={field.onChange}
                      placeholder={t("pathPatternPlaceholder")}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("pathPatternDescription")}
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* 文件大小限制 */}
            <FormField
              control={form.control}
              name="maxDiffFileSizeKB"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("maxFileSizeLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      value={field.value?.toString() || "0"}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = parseInt(e.target.value || "0", 10);
                        field.onChange(isNaN(value) ? 0 : value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("maxFileSizeDescription")}
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* 高级选项 */}
            <div className="space-y-3">
              <FormLabel>{t("advancedOptions")}</FormLabel>
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="autoDetectBinaryFiles"
                  render={({ field }) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                      />
                      <label
                        className="text-sm cursor-pointer"
                        onClick={() => field.onChange(!field.value)}
                      >
                        {t("autoDetectBinary")}
                      </label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("autoDetectBinaryTooltip")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                />

                <FormField
                  control={form.control}
                  name="respectGitAttributes"
                  render={({ field }) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                      />
                      <label
                        className="text-sm cursor-pointer"
                        onClick={() => field.onChange(!field.value)}
                      >
                        {t("respectGitAttributes")}
                      </label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("respectGitAttributesTooltip")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                />
              </div>
            </div>

            {/* 快捷操作 */}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetToDefault}
              >
                {t("resetToDefault")}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddPreset("images")}
              >
                {t("presets.images")}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddPreset("videos")}
              >
                {t("presets.videos")}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddPreset("audios")}
              >
                {t("presets.audios")}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddPreset("documents")}
              >
                {t("presets.documents")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Form>
  );
};
