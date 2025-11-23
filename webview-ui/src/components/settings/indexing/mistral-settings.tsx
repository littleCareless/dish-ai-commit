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
import { Select, SelectOption } from "../../ui/select";

const models = [
  { value: "codestral-embed-2505", label: "codestral-embed-2505 (1536)" },
];

interface MistralSettingsProps {
  control: Control<IndexingFormValues>;
}

export const MistralSettings: React.FC<MistralSettingsProps> = ({
  control,
}) => {
  const { t } = useTranslation("indexing-settings");
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="providers.mistral.apiKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("mistral.apiKey")}</FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder={t(
                  "mistral.apiKeyPlaceholder",
                  "Your Mistral API Key",
                )}
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
        name="providers.mistral.model"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("mistral.model")}</FormLabel>
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
