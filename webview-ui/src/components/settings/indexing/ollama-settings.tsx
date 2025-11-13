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

interface OllamaSettingsProps {
  control: Control<IndexingFormValues>;
}

export const OllamaSettings: React.FC<OllamaSettingsProps> = ({ control }) => {
  const { t } = useTranslation("indexing-settings");
  return (
    <FormField
      control={control}
      name="ollamaModel"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("ollama.modelName")}</FormLabel>
          <FormControl>
            <Input
              placeholder={t("ollama.modelPlaceholder")}
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
