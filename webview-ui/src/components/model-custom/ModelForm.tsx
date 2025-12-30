import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectOption } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ModelFormValues } from "@/types/model-custom";
import { themeStyles } from "@/utils/theme";

interface ModelFormProps {
  providers: { id: string; name: string }[];
  defaultValues?: Partial<ModelFormValues>;
  onSubmit: (data: ModelFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ModelForm({
  providers,
  defaultValues,
  onSubmit,
  onCancel,
  isLoading,
}: ModelFormProps) {
  const { t } = useTranslation("model-custom");

  // Create dynamic schema with i18n validation messages
  const formSchema = z.object({
    providerId: z.string().min(1, t("validation.required")),
    modelId: z.string().min(1, t("validation.required")),
    modelName: z.string().min(1, t("validation.required")),
    inputTokens: z
      .number()
      .min(1, t("validation.positiveNumber"))
      .max(1000000, t("validation.maxTokensExceeded")),
    outputTokens: z
      .number()
      .min(1, t("validation.positiveNumber"))
      .max(1000000, t("validation.maxTokensExceeded")),
    contextWindow: z.number().optional(),
    streaming: z.boolean().optional(),
    functionCalling: z.boolean().optional(),
    vision: z.boolean().optional(),
    pricingInput: z.number().optional(),
    pricingOutput: z.number().optional(),
    deprecated: z.boolean().optional(),
    notes: z.string().optional(),
  });

  const form = useForm<ModelFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      providerId: "",
      modelId: "",
      modelName: "",
      inputTokens: 4096,
      outputTokens: 2048,
      ...defaultValues,
    },
  });

  // Use useWatch for React Compiler compatibility
  const providerId = useWatch({ name: "providerId", control: form.control });
  const streaming = useWatch({ name: "streaming", control: form.control });
  const functionCalling = useWatch({
    name: "functionCalling",
    control: form.control,
  });
  const vision = useWatch({ name: "vision", control: form.control });
  const deprecated = useWatch({ name: "deprecated", control: form.control });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {/* 第一行：提供商和模型ID - 上下排列 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-medium"
            style={{ color: themeStyles.foreground() }}
          >
            {t("provider")}
          </label>
          <Select
            value={providerId}
            onValueChange={(v) => form.setValue("providerId", v)}
          >
            <SelectOption value="">
              {t("validation.invalidProvider")}
            </SelectOption>
            {providers.map((p) => (
              <SelectOption key={p.id} value={p.id}>
                {p.name}
              </SelectOption>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-medium"
            style={{ color: themeStyles.foreground() }}
          >
            {t("modelId")}
          </label>
          <Input {...form.register("modelId")} placeholder="gpt-4-custom" />
        </div>
      </div>

      {/* 模型名称 - 单独一行 */}
      <div className="flex flex-col gap-2">
        <label
          className="text-sm font-medium"
          style={{ color: themeStyles.foreground() }}
        >
          {t("modelName")}
        </label>
        <Input {...form.register("modelName")} placeholder="GPT-4 Custom" />
      </div>

      {/* Token 上限 - 上下排列 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-medium"
            style={{ color: themeStyles.foreground() }}
          >
            {t("maxTokens.input")}
          </label>
          <Input
            type="number"
            {...form.register("inputTokens", { valueAsNumber: true })}
            placeholder="128000"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-medium"
            style={{ color: themeStyles.foreground() }}
          >
            {t("maxTokens.output")}
          </label>
          <Input
            type="number"
            {...form.register("outputTokens", { valueAsNumber: true })}
            placeholder="16384"
          />
        </div>
      </div>

      {/* 上下文窗口和备注 - 上下排列 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-medium"
            style={{ color: themeStyles.foreground() }}
          >
            {t("contextWindow")}
          </label>
          <Input
            type="number"
            {...form.register("contextWindow", { valueAsNumber: true })}
            placeholder="128000"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-medium"
            style={{ color: themeStyles.foreground() }}
          >
            {t("notes")}
          </label>
          <Textarea
            {...form.register("notes")}
            placeholder={t("notes") + "..."}
          />
        </div>
      </div>

      {/* 复选框 - 水平排列 */}
      <div className="grid grid-cols-3 gap-4">
        <label className="flex items-center gap-2">
          <Checkbox
            checked={streaming}
            onCheckedChange={(v) => form.setValue("streaming", v as boolean)}
          />
          <span className="text-sm">{t("capabilities.streaming")}</span>
        </label>
        <label className="flex items-center gap-2">
          <Checkbox
            checked={functionCalling}
            onCheckedChange={(v) =>
              form.setValue("functionCalling", v as boolean)
            }
          />
          <span className="text-sm">{t("capabilities.functionCalling")}</span>
        </label>
        <label className="flex items-center gap-2">
          <Checkbox
            checked={vision}
            onCheckedChange={(v) => form.setValue("vision", v as boolean)}
          />
          <span className="text-sm">{t("capabilities.vision")}</span>
        </label>
      </div>

      {/* 价格 - 上下排列 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-medium"
            style={{ color: themeStyles.foreground() }}
          >
            {t("pricing.input")}
          </label>
          <Input
            type="number"
            {...form.register("pricingInput", { valueAsNumber: true })}
            placeholder="2.5"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-medium"
            style={{ color: themeStyles.foreground() }}
          >
            {t("pricing.output")}
          </label>
          <Input
            type="number"
            {...form.register("pricingOutput", { valueAsNumber: true })}
            placeholder="10.0"
          />
        </div>
      </div>

      {/* 已废弃 - 单独一行 */}
      <div className="flex items-center gap-2">
        <Checkbox
          checked={deprecated}
          onCheckedChange={(v) => form.setValue("deprecated", v as boolean)}
        />
        <span className="text-sm">{t("deprecated")}</span>
      </div>

      {/* 按钮区域 */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t("save") + "..." : t("save")}
        </Button>
      </div>
    </form>
  );
}
