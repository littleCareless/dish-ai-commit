import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { IndexingFormValues } from "@/pages/indexing-page";
import React from "react";
import { Control } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface AdvancedIndexingSettingsProps {
  control: Control<IndexingFormValues>;
}

export const AdvancedIndexingSettings: React.FC<
  AdvancedIndexingSettingsProps
> = ({ control }) => {
  const { t } = useTranslation("indexing-settings");
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">
          {t("qdrant.title")}
        </h2>
        <div className="mt-4 space-y-4">
          <FormField
            control={control}
            name="qdrantUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("qdrant.url")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("qdrant.urlPlaceholder")}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="qdrantApiKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("qdrant.apiKey")}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={t(
                      "qdrant.apiKeyPlaceholder",
                      "Your Qdrant API Key",
                    )}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-gray-900">
          {t("advanced.title")}
        </h2>
        <div className="mt-4 space-y-4">
          <FormField
            control={control}
            name="minBlockChars"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("advanced.minBlockChars")}</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-4">
                    <Slider
                      min={10}
                      max={500}
                      step={10}
                      value={[field.value ?? 100]}
                      onValueChange={(values) => field.onChange(values[0])}
                      className="flex-1"
                    />
                    <span className="w-12 text-sm text-muted-foreground text-right">
                      {field.value ?? 100}
                    </span>
                  </div>
                </FormControl>
                <FormDescription>
                  {t("advanced.minBlockCharsDescription")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="enableMultiRepoIndexing"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>{t("advanced.enableMultiRepoIndexing")}</FormLabel>
                  <FormDescription>
                    {t("advanced.enableMultiRepoIndexingDescription")}
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="searchScoreThreshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("advanced.searchScoreThreshold")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("advanced.searchScoreThresholdPlaceholder")}
                    {...field}
                    value={String(field.value ?? "")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="maxSearchResults"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("advanced.maxSearchResults")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("advanced.maxSearchResultsPlaceholder")}
                    {...field}
                    value={String(field.value ?? "")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
};
