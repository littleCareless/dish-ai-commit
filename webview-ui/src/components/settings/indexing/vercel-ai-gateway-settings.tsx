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
  {
    value: "openai/text-embedding-3-small",
    label: "openai/text-embedding-3-small (1536)",
  },
  {
    value: "openai/text-embedding-3-large",
    label: "openai/text-embedding-3-large (3072)",
  },
  {
    value: "openai/text-embedding-ada-002",
    label: "openai/text-embedding-ada-002 (1536)",
  },
  { value: "cohere/embed-v4.0", label: "cohere/embed-v4.0 (1024)" },
  {
    value: "google/gemini-embedding-001",
    label: "google/gemini-embedding-001 (3072)",
  },
  {
    value: "google/text-embedding-005",
    label: "google/text-embedding-005 (768)",
  },
  {
    value: "amazon/titan-embed-text-v2",
    label: "amazon/titan-embed-text-v2 (1024)",
  },
  { value: "mistral/codestral-embed", label: "mistral/codestral-embed (1536)" },
  { value: "mistral/mistral-embed", label: "mistral/mistral-embed (1024)" },
];

interface VercelAIGatewaySettingsProps {
  control: Control<IndexingFormValues>;
}

export const VercelAIGatewaySettings: React.FC<
  VercelAIGatewaySettingsProps
> = ({ control }) => {
  const { t } = useTranslation("indexing-settings");
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="vercelAIGatewayApiKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("vercelAIGateway.apiKey")}</FormLabel>
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
        name="vercelAIGatewayModel"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("vercelAIGateway.model")}</FormLabel>
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
