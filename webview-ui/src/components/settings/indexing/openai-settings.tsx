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
import { Select, SelectItem } from "../../ui/select";

const models = [
  { value: "text-embedding-3-small", label: "text-embedding-3-small (1536)" },
  { value: "text-embedding-3-large", label: "text-embedding-3-large (3072)" },
  { value: "text-embedding-ada-002", label: "text-embedding-ada-002 (1536)" },
];

interface OpenAISettingsProps {
  control: Control<IndexingFormValues>;
}

export const OpenAISettings: React.FC<OpenAISettingsProps> = ({ control }) => {
  const { t } = useTranslation("indexing-settings");
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="openaiApiKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("openai.apiKey")}</FormLabel>
            <FormControl>
              <Input type="password" {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="openaiModel"
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
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
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
