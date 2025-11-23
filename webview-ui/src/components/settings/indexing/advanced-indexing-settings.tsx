import React from "react";
import { Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { IndexingFormValues } from "../../../pages/indexing-page";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";
import { Input } from "../../ui/input";

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
