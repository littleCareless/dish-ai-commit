import React from "react";
import { Control, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  EMBEDDING_MODEL_PROFILES,
  getModelDimension,
} from "../../../lib/embedding-models";
import { IndexingFormValues } from "../../../pages/indexing-page";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";
import { Input } from "../../ui/input";
import { Select, SelectOption } from "../../ui/select";

interface OllamaSettingsProps {
  control: Control<IndexingFormValues>;
}

export const OllamaSettings: React.FC<OllamaSettingsProps> = ({ control }) => {
  const { t } = useTranslation("indexing-settings");
  const models = Object.keys(EMBEDDING_MODEL_PROFILES.ollama ?? {}).map(
    (modelId) => {
      const dimension = getModelDimension("ollama", modelId);
      return {
        value: modelId,
        label: dimension ? `${modelId} (${dimension})` : modelId,
      };
    },
  );

  const selectedModel = useWatch({
    control,
    name: "providers.ollama.model",
  });

  const needsDimensionInput =
    selectedModel && !getModelDimension("ollama", selectedModel);

  return (
    <>
      <FormField
        control={control}
        name="providers.ollama.baseUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("ollama.baseUrl")}</FormLabel>
            <FormControl>
              <Input
                placeholder={t(
                  "ollama.baseUrlPlaceholder",
                  "http://localhost:11434",
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
        name="providers.ollama.model"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("ollama.modelName")}</FormLabel>
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
      {needsDimensionInput && (
        <FormField
          control={control}
          name="providers.ollama.modelDimensions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("ollama.modelDimensions")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("ollama.modelDimensionsPlaceholder", "4096")}
                  {...field}
                  value={String(field.value ?? "")}
                  onChange={(e) => {
                    const value = parseInt(
                      (e.target as HTMLInputElement).value,
                      10,
                    );
                    field.onChange(isNaN(value) ? undefined : value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
};
