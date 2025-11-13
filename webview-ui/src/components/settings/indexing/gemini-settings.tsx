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
  { value: "text-embedding-004", label: "text-embedding-004 (768)" },
  { value: "gemini-embedding-001", label: "gemini-embedding-001 (3072)" },
];

interface GeminiSettingsProps {
  control: Control<IndexingFormValues>;
}

export const GeminiSettings: React.FC<GeminiSettingsProps> = ({ control }) => {
  const { t } = useTranslation("indexing-settings");
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="geminiApiKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("gemini.apiKey")}</FormLabel>
            <FormControl>
              <Input
                type="password"
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
        name="geminiModel"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("gemini.model")}</FormLabel>
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
