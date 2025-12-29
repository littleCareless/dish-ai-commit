import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectOption } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ModelFormValues } from "@/types/model-custom";

const formSchema = z.object({
  providerId: z.string().min(1, "必填"),
  modelId: z.string().min(1, "必填"),
  modelName: z.string().min(1, "必填"),
  inputTokens: z.number().min(1).max(1000000, "不能超过 1,000,000"),
  outputTokens: z.number().min(1).max(1000000, "不能超过 1,000,000"),
  contextWindow: z.number().optional(),
  streaming: z.boolean().optional(),
  functionCalling: z.boolean().optional(),
  vision: z.boolean().optional(),
  pricingInput: z.number().optional(),
  pricingOutput: z.number().optional(),
  deprecated: z.boolean().optional(),
  notes: z.string().optional(),
});

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

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">提供商</label>
          <Select
            value={form.watch("providerId")}
            onValueChange={(v) => form.setValue("providerId", v)}
          >
            <SelectOption value="">选择提供商</SelectOption>
            {providers.map((p) => (
              <SelectOption key={p.id} value={p.id}>
                {p.name}
              </SelectOption>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">模型ID</label>
          <Input {...form.register("modelId")} placeholder="gpt-4-custom" />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">模型名称</label>
        <Input {...form.register("modelName")} placeholder="GPT-4 Custom" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">输入Token上限</label>
          <Input
            type="number"
            {...form.register("inputTokens", { valueAsNumber: true })}
            placeholder="128000"
          />
        </div>
        <div>
          <label className="text-sm font-medium">输出Token上限</label>
          <Input
            type="number"
            {...form.register("outputTokens", { valueAsNumber: true })}
            placeholder="16384"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">上下文窗口 (可选)</label>
          <Input
            type="number"
            {...form.register("contextWindow", { valueAsNumber: true })}
            placeholder="128000"
          />
        </div>
        <div>
          <label className="text-sm font-medium">备注</label>
          <Textarea {...form.register("notes")} placeholder="补充说明..." />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <label className="flex items-center gap-2">
          <Checkbox
            checked={form.watch("streaming")}
            onCheckedChange={(v) => form.setValue("streaming", v as boolean)}
          />
          <span className="text-sm">流式输出</span>
        </label>
        <label className="flex items-center gap-2">
          <Checkbox
            checked={form.watch("functionCalling")}
            onCheckedChange={(v) =>
              form.setValue("functionCalling", v as boolean)
            }
          />
          <span className="text-sm">函数调用</span>
        </label>
        <label className="flex items-center gap-2">
          <Checkbox
            checked={form.watch("vision")}
            onCheckedChange={(v) => form.setValue("vision", v as boolean)}
          />
          <span className="text-sm">视觉能力</span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">输入价格 (每1M tokens)</label>
          <Input
            type="number"
            {...form.register("pricingInput", { valueAsNumber: true })}
            placeholder="2.5"
          />
        </div>
        <div>
          <label className="text-sm font-medium">输出价格 (每1M tokens)</label>
          <Input
            type="number"
            {...form.register("pricingOutput", { valueAsNumber: true })}
            placeholder="10.0"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          checked={form.watch("deprecated")}
          onCheckedChange={(v) => form.setValue("deprecated", v as boolean)}
        />
        <span className="text-sm">已废弃</span>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "保存中..." : "保存"}
        </Button>
      </div>
    </form>
  );
}
