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
        name="openaiCompatibleBaseUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("openaiCompatible.baseUrl")}</FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="openaiCompatibleApiKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("openaiCompatible.apiKey")}</FormLabel>
            <FormControl>
              <Input type="password" {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="openaiCompatibleModel"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("openaiCompatible.model")}</FormLabel>
            <FormControl>
              <Input {...field} value={String(field.value ?? "")} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="openaiCompatibleModelDimensions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("openaiCompatible.modelDimensions")}</FormLabel>
            <FormControl>
              <Input {...field} type="text" value={String(field.value ?? "")} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
