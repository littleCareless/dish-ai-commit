import { AIProviderFactory } from "../../ai/ai-provider-factory";
import { ConfigurationManager } from "../../config/configuration-manager";
import { ModelPickerService } from "../../services/model-picker-service";
import { getMessage } from "../i18n";
import { AIModel } from "../../ai/types";

interface ValidatedModelResult {
  provider: string;
  model: string;
  selectedModel: AIModel;
  aiProvider: any;
}

interface ProviderAndModels {
  aiProvider: any;
  models: AIModel[];
}

/**
 * 获取provider实例和models列表
 */
async function getProviderAndModels(
  provider: string
): Promise<ProviderAndModels> {
  const aiProvider = AIProviderFactory.getProvider(provider);
  const models = await aiProvider.getModels();
  return { aiProvider, models };
}

/**
 * 重新选择并验证模型
 */
async function revalidateModel(
  provider: string,
  model: string
): Promise<ValidatedModelResult> {
  const result = await selectAndUpdateModel(provider, model);
  if (!result) {
    throw new Error(getMessage("model.selection.cancelled"));
  }

  const { aiProvider, models } = await getProviderAndModels(result.provider);

  if (!models?.length) {
    throw new Error(getMessage("model.list.empty"));
  }

  const selectedModel = models.find((m) => m.name === result.model);
  if (!selectedModel) {
    throw new Error(getMessage("model.notFound"));
  }

  return {
    provider: result.provider,
    model: result.model,
    selectedModel,
    aiProvider,
  };
}

/**
 * 验证并获取AI模型配置
 */
export async function validateAndGetModel(
  provider = "Ollama",
  model = "Ollama"
): Promise<ValidatedModelResult> {
  let { aiProvider, models } = await getProviderAndModels(provider);

  if (!models?.length) {
    return revalidateModel(provider, model);
  }

  const selectedModel = models.find((m) => m.name === model);
  if (!selectedModel) {
    return revalidateModel(provider, model);
  }

  return {
    provider,
    model,
    selectedModel,
    aiProvider,
  };
}

/**
 * 选择模型并更新配置
 */
async function selectAndUpdateModel(provider: string, model: string) {
  const selection = await ModelPickerService.showModelPicker(provider, model);
  if (!selection) {
    return;
  }

  const config = ConfigurationManager.getInstance();
  await config.updateAIConfiguration(selection.provider, selection.model);

  return selection;
}

// 用于仅需要provider和selectedModel的场景
export function extractProviderAndModel(result: ValidatedModelResult) {
  return {
    aiProvider: result.aiProvider,
    selectedModel: result.selectedModel,
  };
}
