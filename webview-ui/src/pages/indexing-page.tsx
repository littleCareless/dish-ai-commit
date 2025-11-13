import { useAppTranslation } from "@/i18n/translation-context";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { Control, useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { AdvancedIndexingSettings } from "../components/settings/indexing/advanced-indexing-settings";
import { GeminiSettings } from "../components/settings/indexing/gemini-settings";
import { MistralSettings } from "../components/settings/indexing/mistral-settings";
import { OllamaSettings } from "../components/settings/indexing/ollama-settings";
import { OpenAICompatibleSettings } from "../components/settings/indexing/openai-compatible-settings";
import { OpenAISettings } from "../components/settings/indexing/openai-settings";
import { ProviderSelector } from "../components/settings/indexing/provider-selector";
import { VercelAIGatewaySettings } from "../components/settings/indexing/vercel-ai-gateway-settings";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";

// Define the form schema using Zod
const formSchema = z.object({
  enabled: z.boolean(),
  provider: z.string(),
  qdrantUrl: z.string().optional(),
  qdrantApiKey: z.string().optional(),
  searchScoreThreshold: z.number().optional(),
  maxSearchResults: z.number().optional(),
  ollamaModel: z.string().optional(),
  openaiApiKey: z.string().optional(),
  openaiModel: z.string().optional(),
  geminiApiKey: z.string().optional(),
  geminiModel: z.string().optional(),
  mistralApiKey: z.string().optional(),
  mistralModel: z.string().optional(),
  vercelAIGatewayApiKey: z.string().optional(),
  vercelAIGatewayModel: z.string().optional(),
  openaiCompatibleBaseUrl: z.string().optional(),
  openaiCompatibleApiKey: z.string().optional(),
  openaiCompatibleModel: z.string().optional(),
  openaiCompatibleModelDimensions: z.number().optional(),
});

export type IndexingFormValues = z.infer<typeof formSchema>;

const providerComponents: {
  [key: string]: React.FC<{ control: Control<IndexingFormValues> }>;
} = {
  ollama: OllamaSettings,
  openai: OpenAISettings,
  "openai-compatible": OpenAICompatibleSettings,
  gemini: GeminiSettings,
  mistral: MistralSettings,
  "vercel-ai-gateway": VercelAIGatewaySettings,
};

export const IndexingPage: React.FC = () => {
  const { t } = useAppTranslation();
  const form = useForm<IndexingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      enabled: false,
      provider: "ollama",
    },
  });

  const selectedProvider = useWatch({
    control: form.control,
    name: "provider",
  });
  const ProviderComponent = providerComponents[selectedProvider];

  function onSubmit(values: IndexingFormValues) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">{t("indexing-page:title")}</h1>
          <p className="mt-2 text-gray-600">
            {t("indexing-page:description")}{" "}
            <a href="#">{t("indexing-page:learnMore")}</a>
          </p>
        </div>

        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="font-normal">
                {t("indexing-page:enableIndexing")}
              </FormLabel>
            </FormItem>
          )}
        />

        <div>
          <h2 className="text-lg font-medium text-gray-900">
            {t("indexing-page:status.title")}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {t("indexing-page:status.indexed")}
          </p>
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t("indexing-page:embeddingProvider")}</FormLabel>
                <FormControl>
                  <ProviderSelector
                    selectedProvider={field.value}
                    onProviderChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {ProviderComponent && (
            <ProviderComponent
              control={form.control as Control<IndexingFormValues>}
            />
          )}
        </div>

        <AdvancedIndexingSettings
          control={form.control as Control<IndexingFormValues>}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="secondary">
            {t("indexing-page:clearIndex")}
          </Button>
          <Button type="submit">{t("indexing-page:save")}</Button>
        </div>
      </form>
    </Form>
  );
};
