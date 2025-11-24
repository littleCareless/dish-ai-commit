import React from "react";
import { Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { IndexingFormValues } from "@/pages/indexing-page";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface OpenAICompatibleSettingsProps {
  control: Control<IndexingFormValues>;
}

export const OpenAICompatibleSettings: React.FC<
  OpenAICompatibleSettingsProps
> = ({ control }) => {
  const { t } = useTranslation("indexing-settings");
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="providers.openai-compatible.baseUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("openaiCompatible.baseUrl")}</FormLabel>
            <FormControl>
              <Input
                placeholder={t(
                  "openaiCompatible.baseUrlPlaceholder",
                  "https://api.openai.com/v1",
                )}
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
        name="providers.openai-compatible.apiKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("openaiCompatible.apiKey")}</FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder={t("openaiCompatible.apiKeyPlaceholder", "sk-...")}
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
        name="providers.openai-compatible.model"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("openaiCompatible.model", "模型名称")}</FormLabel>
            <FormControl>
              <Input
                placeholder={t(
                  "openaiCompatible.modelPlaceholder",
                  "text-embedding-ada-002",
                )}
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
        name="providers.openai-compatible.modelDimensions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("openaiCompatible.modelDimensions")}</FormLabel>
            <FormControl>
              <Input
                placeholder={t(
                  "openaiCompatible.modelDimensionsPlaceholder",
                  "1536",
                )}
                {...field}
                type="text"
                value={String(field.value ?? "")}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
