import { ModelCustomStorage } from "@/services/storage/model-custom-storage";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import { ProviderInfo } from "@shared/types/model-custom";
import * as vscode from "vscode";

/**
 * 自定义模型 Webview 消息处理器
 * 处理来自 Webview UI 的所有模型管理相关请求
 */
export class ModelCustomMessageHandler {
  private storage: ModelCustomStorage;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.storage = ModelCustomStorage.getInstance(context);
  }

  /**
   * 处理消息
   * @param message - 来自 Webview 的消息
   * @param webview - Webview 实例
   */
  async handle(message: any, webview: vscode.Webview): Promise<void> {
    const { command, data, requestId } = message;

    try {
      switch (command) {
        case UIRequest.ModelCustomGetAll:
          await this.handleGetAll(webview, requestId);
          break;

        case UIRequest.ModelCustomSave:
          await this.handleSave(data, webview, requestId);
          break;

        case UIRequest.ModelCustomDelete:
          await this.handleDelete(data, webview, requestId);
          break;

        case UIRequest.ModelCustomExport:
          await this.handleExport(webview, requestId);
          break;

        case UIRequest.ModelCustomImport:
          await this.handleImport(data, webview, requestId);
          break;

        case UIRequest.ModelCustomGetProviders:
          await this.handleGetProviders(webview, requestId);
          break;

        default:
          throw new Error(`Unknown command: ${command}`);
      }
    } catch (error) {
      webview.postMessage({
        command: ExtensionResponse.ModelCustomError,
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 处理：获取所有模型信息
   */
  private async handleGetAll(
    webview: vscode.Webview,
    requestId: string
  ): Promise<void> {
    const allData = await this.storage.getAllModelInfo();
    webview.postMessage({
      command: ExtensionResponse.ModelCustomAllLoaded,
      requestId,
      payload: allData,
    });
  }

  /**
   * 处理：保存模型信息
   */
  private async handleSave(
    data: any,
    webview: vscode.Webview,
    requestId: string
  ): Promise<void> {
    if (!data.info) {
      throw new Error("Missing info data");
    }
    await this.storage.saveModelInfo(data.info);
    webview.postMessage({
      command: ExtensionResponse.ModelCustomSaved,
      requestId,
      payload: { success: true },
    });
  }

  /**
   * 处理：删除模型信息
   */
  private async handleDelete(
    data: any,
    webview: vscode.Webview,
    requestId: string
  ): Promise<void> {
    if (!data.providerId || !data.modelId) {
      throw new Error("Missing providerId or modelId");
    }
    await this.storage.deleteModelInfo(data.providerId, data.modelId);
    webview.postMessage({
      command: ExtensionResponse.ModelCustomDeleted,
      requestId,
      payload: { success: true },
    });
  }

  /**
   * 处理：导出数据
   */
  private async handleExport(
    webview: vscode.Webview,
    requestId: string
  ): Promise<void> {
    const exportData = await this.storage.exportData();
    webview.postMessage({
      command: ExtensionResponse.ModelCustomExported,
      requestId,
      payload: exportData,
    });
  }

  /**
   * 处理：导入数据
   */
  private async handleImport(
    data: any,
    webview: vscode.Webview,
    requestId: string
  ): Promise<void> {
    if (!data.registry) {
      throw new Error("Missing registry data");
    }
    await this.storage.importData(data.registry);
    webview.postMessage({
      command: ExtensionResponse.ModelCustomImported,
      requestId,
      payload: { success: true },
    });
  }

  /**
   * 处理：获取提供商列表
   */
  private async handleGetProviders(
    webview: vscode.Webview,
    requestId: string
  ): Promise<void> {
    const providers: ProviderInfo[] = [
      { id: "openai", name: "OpenAI" },
      { id: "anthropic", name: "Anthropic" },
      { id: "gemini", name: "Google Gemini" },
      { id: "github", name: "GitHub" },
      { id: "zhipu", name: "ZhiPu" },
      { id: "dashscope", name: "DashScope" },
      { id: "doubao", name: "Doubao" },
      { id: "deepseek", name: "DeepSeek" },
      { id: "iflow", name: "Alibaba iFlow" },
      { id: "volcano", name: "ByteDance Volcano" },
      { id: "modelscope", name: "ModelScope" },
      { id: "kat", name: "Kuaishou KAT" },
      { id: "longcat", name: "Meituan LongCat" },
      { id: "qiniu", name: "Qiniu AI" },
      { id: "nvidia", name: "NVIDIA NIM" },
      { id: "cerebras", name: "Cerebras" },
      { id: "codebuddy", name: "Tencent CodeBuddy" },
      { id: "codeflicker", name: "Kuaishou CodeFlicker" },
      { id: "tongyi", name: "Tongyi Lingma" },
    ];
    webview.postMessage({
      command: ExtensionResponse.ModelCustomProvidersLoaded,
      requestId,
      payload: providers,
    });
  }
}
