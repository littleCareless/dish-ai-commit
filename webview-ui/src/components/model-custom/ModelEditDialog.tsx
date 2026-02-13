import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { ModelForm } from "./ModelForm";
import { CustomModelInfo, ModelFormValues } from "@/types/model-custom";

interface ModelEditDialogProps {
  open: boolean;
  onClose: () => void;
  model: CustomModelInfo | null;
  providers: { id: string; name: string }[];
  onSave: (info: CustomModelInfo) => Promise<void>;
}

export function ModelEditDialog({
  open,
  onClose,
  model,
  providers,
  onSave,
}: ModelEditDialogProps) {
  const { t } = useTranslation("model-custom");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (data: ModelFormValues) => {
    console.log("handleSubmit called", data);
    setIsSaving(true);
    try {
      const info: CustomModelInfo = {
        id: data.modelId,
        providerId: data.providerId,
        modelName: data.modelName,
        maxTokens: {
          input: data.inputTokens,
          output: data.outputTokens,
        },
        contextWindow: data.contextWindow,
        capabilities: {
          streaming: data.streaming,
          functionCalling: data.functionCalling,
          vision: data.vision,
        },
        pricing:
          data.pricingInput || data.pricingOutput
            ? {
                input: data.pricingInput || 0,
                output: data.pricingOutput || 0,
              }
            : undefined,
        deprecated: data.deprecated,
        notes: data.notes,
      };

      console.log("Calling onSave", info);
      await onSave(info);
      console.log("onSave completed");
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const defaultValues = model
    ? {
        providerId: model.providerId,
        modelId: model.id,
        modelName: model.modelName,
        inputTokens: model.maxTokens.input,
        outputTokens: model.maxTokens.output,
        contextWindow: model.contextWindow,
        streaming: model.capabilities?.streaming,
        functionCalling: model.capabilities?.functionCalling,
        vision: model.capabilities?.vision,
        pricingInput: model.pricing?.input,
        pricingOutput: model.pricing?.output,
        deprecated: model.deprecated,
        notes: model.notes,
      }
    : undefined;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{model ? t("edit") : t("addModel")}</DialogTitle>
        </DialogHeader>
        <ModelForm
          providers={providers}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={onClose}
          isLoading={isSaving}
        />
      </DialogContent>
    </Dialog>
  );
}
