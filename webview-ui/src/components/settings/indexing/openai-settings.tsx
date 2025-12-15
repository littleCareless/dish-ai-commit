import React from "react";
import { Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  EMBEDDING_MODEL_PROFILES,
  getModelDimension,
} from "@/lib/embedding-models";
import { IndexingFormValues } from "@/pages/indexing-page";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectOption } from "@/components/ui/select";

interface OpenAISettingsProps {
  control: Control<IndexingFormValues>;
}

export const OpenAISettings: React.FC<OpenAISettingsProps> = ({ control }) => {
  const { t } = useTranslation("indexing-settings");
  const models = Object.keys(EMBEDDING_MODEL_PROFILES.openai ?? {}).map(
    (modelId) => {
      const dimension = getModelDimension("openai", modelId);
      return {
        value: modelId,
        label: dimension ? `${modelId} (${dimension})` : modelId,
      };
    },
  );
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="providers.openai.apiKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("openai.apiKey")}</FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder={t("openai.apiKeyPlaceholder", "sk-...")}
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
        name="providers.openai.model"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("openai.model")}</FormLabel>
            <FormControl>
              <Select
                {...field}
                onValueChange={field.onChange}
                value={field.value as string}
              >
                {models.map((model) => (
                  <SelectOption key={model.value} value={model.value}>
                    {model.label}
                  </SelectOption>
                ))}
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
