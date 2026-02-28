import { SCMFactory } from "@/scm/scm-provider";
import { AIMessage } from "@/ai/types";
import { filterCodeBlockMarkers } from "@/commands/generate-commit/utils/commit-formatter";
import { ModelValidationService } from "@/services/core/model-validation-service";
import { ProviderSelectionService } from "@/services/core/provider-selection-service";
import { ProfileManagerService } from "@/services/profile-manager/profile-manager-service";
import { PreferencesSettingsManager } from "@/services/settings/preferences-settings-manager";
import { BaseMessageHandler } from "@/services/webview/handlers/settings/base-message-handler";
import {
  CommitChatGetChangedFilesResponse,
  CommitChatGetFileDiffRequest,
  CommitChatGetFileDiffResponse,
  CommitChatSendMessageRequest,
  CommitChatSendMessageResponse,
  CommitChatStreamDeltaResponse,
  CommitChatStreamErrorResponse,
  CommitChatStreamStartedResponse,
  ExtensionResponse,
  UIRequest,
  UIRequestMessage,
} from "@shared/types/messages";
import * as vscode from "vscode";

export class CommitChatMessageHandler extends BaseMessageHandler {
  constructor(extensionContext: vscode.ExtensionContext) {
    super(extensionContext);
  }

  public async handle(
    message: UIRequestMessage,
    webview: vscode.Webview,
  ): Promise<void> {
    switch (message.command) {
      case UIRequest.CommitChatSendMessage:
        await this.handleSendMessage(message, webview);
        break;
      case UIRequest.CommitChatGetChangedFiles:
        await this.handleGetChangedFiles(message, webview);
        break;
      case UIRequest.CommitChatGetFileDiff:
        await this.handleGetFileDiff(message, webview);
        break;
    }
  }

  private async handleSendMessage(
    message: UIRequestMessage,
    webview: vscode.Webview,
  ): Promise<void> {
    const payload = (message.data || {}) as CommitChatSendMessageRequest;
    const normalizedFiles = this.normalizeFiles(payload.targetFiles);
    const lastUserMessage = [...(payload.messages || [])]
      .reverse()
      .find((item) => item.role === "user")?.content;

    if (!lastUserMessage) {
      await webview.postMessage({
        command: ExtensionResponse.CommitChatResponse,
        requestId: message.requestId,
        data: {
          reply: "Please provide a message.",
          targetFiles: normalizedFiles,
        } satisfies CommitChatSendMessageResponse,
      });
      return;
    }

    const scmProvider = await SCMFactory.detectSCM(normalizedFiles);

    if (!scmProvider) {
      await webview.postMessage({
        command: ExtensionResponse.CommitChatResponse,
        requestId: message.requestId,
        data: {
          reply:
            "No Git/SVN repository was detected. Open a repository and try again.",
          targetFiles: normalizedFiles,
        } satisfies CommitChatSendMessageResponse,
      });
      return;
    }

    const fileDiffContext =
      normalizedFiles.length > 0
        ? await scmProvider.getDiff(normalizedFiles)
        : undefined;

    try {
      await webview.postMessage({
        command: ExtensionResponse.CommitChatStreamStarted,
        requestId: message.requestId,
        data: {
          targetFiles: normalizedFiles,
        } satisfies CommitChatStreamStartedResponse,
      });

      const generationResult = await this.generateWithConfiguredProvider(
        payload,
        normalizedFiles,
        fileDiffContext || "",
        async (delta) => {
          await webview.postMessage({
            command: ExtensionResponse.CommitChatStreamDelta,
            requestId: message.requestId,
            data: { delta } satisfies CommitChatStreamDeltaResponse,
          });
        },
      );

      if (generationResult.commitMessage) {
        await scmProvider.setCommitInput(generationResult.commitMessage);
      }

      await webview.postMessage({
        command: ExtensionResponse.CommitChatResponse,
        requestId: message.requestId,
        data: {
          reply: generationResult.reply,
          commitMessage: generationResult.commitMessage,
          suggestions: generationResult.suggestions,
          targetFiles: normalizedFiles,
        } satisfies CommitChatSendMessageResponse,
      });
    } catch (error) {
      await webview.postMessage({
        command: ExtensionResponse.CommitChatStreamError,
        requestId: message.requestId,
        data: {
          error:
            error instanceof Error
              ? error.message
              : "Failed to generate response from configured AI provider.",
        } satisfies CommitChatStreamErrorResponse,
      });

      await webview.postMessage({
        command: ExtensionResponse.CommitChatResponse,
        requestId: message.requestId,
        data: {
          reply:
            error instanceof Error
              ? error.message
              : "Failed to generate response from configured AI provider.",
          targetFiles: normalizedFiles,
        } satisfies CommitChatSendMessageResponse,
      });
    }
  }

  private async handleGetChangedFiles(
    message: UIRequestMessage,
    webview: vscode.Webview,
  ): Promise<void> {
    const scmProvider = await SCMFactory.detectSCM();
    const files = scmProvider?.getAllChangedFiles
      ? await scmProvider.getAllChangedFiles()
      : [];

    await webview.postMessage({
      command: ExtensionResponse.CommitChatChangedFilesLoaded,
      requestId: message.requestId,
      data: { files } satisfies CommitChatGetChangedFilesResponse,
    });
  }

  private async handleGetFileDiff(
    message: UIRequestMessage,
    webview: vscode.Webview,
  ): Promise<void> {
    const payload = (message.data || {}) as CommitChatGetFileDiffRequest;
    const file = (payload.file || "").trim();

    if (!file) {
      await webview.postMessage({
        command: ExtensionResponse.CommitChatFileDiffLoaded,
        requestId: message.requestId,
        data: { file: "", diff: "" } satisfies CommitChatGetFileDiffResponse,
      });
      return;
    }

    const scmProvider = await SCMFactory.detectSCM([file]);
    const diff = scmProvider ? (await scmProvider.getDiff([file])) || "" : "";

    await webview.postMessage({
      command: ExtensionResponse.CommitChatFileDiffLoaded,
      requestId: message.requestId,
      data: { file, diff } satisfies CommitChatGetFileDiffResponse,
    });
  }

  private normalizeFiles(files: string[] | undefined): string[] {
    if (!files || files.length === 0) {
      return [];
    }

    return [...new Set(files.map((file) => file.trim()).filter(Boolean))];
  }

  private async generateWithConfiguredProvider(
    payload: CommitChatSendMessageRequest,
    targetFiles: string[],
    fileDiff: string,
    onDelta: (delta: string) => Promise<void>,
  ): Promise<{
    reply: string;
    commitMessage?: string;
    suggestions?: string[];
  }> {
    const profileManager = await ProfileManagerService.create(
      this.extensionContext,
    );
    const activeProfileId = profileManager.getActiveProfileId();

    if (!activeProfileId) {
      throw new Error("No active profile found.");
    }

    const profile = profileManager.getProfileById(activeProfileId);
    if (!profile) {
      throw new Error("Active profile is missing.");
    }

    const selection = ProviderSelectionService.selectProvider(profile);
    if (!selection.provider || !selection.model) {
      throw new Error("Provider or model is not configured in active profile.");
    }

    const featureSettings = profileManager.getFeatureSettings();
    const preferences = PreferencesSettingsManager.getInstance(
      this.extensionContext,
    ).getSettings();

    const fullConfig = {
      ...selection.config,
      base: {
        language: preferences.language || "Simplified Chinese",
      },
      features: {
        suppressNonCriticalWarnings:
          featureSettings.suppressNonCriticalWarnings,
        commitFormat: {
          enableMergeCommit: featureSettings.enableMergeCommit,
          enableEmoji: featureSettings.enableEmoji,
          enableBody: featureSettings.enableBody,
          enableLayeredCommit: featureSettings.enableLayeredCommit,
          enableGlobalContext: featureSettings.enableGlobalContext,
        },
        commitMessage: {
          useRecentCommitsAsReference:
            featureSettings.useRecentCommitsAsReference,
          largePromptAction: featureSettings.largePromptAction,
          systemPrompt: undefined,
        },
        codeAnalysis: {
          diffTarget: featureSettings.diffTarget,
          autoDetectStaged: featureSettings.autoDetectStaged,
          fallbackToAll: featureSettings.fallbackToAll,
          simplifyDiff: featureSettings.simplifyDiff,
        },
      },
      preferences,
    };

    const { aiProvider, selectedModel } = await ModelValidationService.validateModel(
      selection.provider,
      selection.model,
      fullConfig,
      profile,
    );

    if (typeof aiProvider.setGlobalConfig === "function") {
      aiProvider.setGlobalConfig(fullConfig);
    }

    const history = (payload.messages || []).slice(-8);
    const historyText = history
      .map((item) => `${item.role === "assistant" ? "Assistant" : "User"}: ${item.content}`)
      .join("\n");

    const systemPrompt = [
      "You are a senior Git commit assistant for a VS Code extension.",
      "Generate exactly one concise, high-quality Git commit message.",
      "Output plain text only.",
      "Do not use markdown code fences.",
      "Do not add explanations or any extra lines.",
    ].join("\n");

    const userPrompt = [
      `Conversation:\n${historyText}`,
      targetFiles.length > 0
        ? `Focused files:\n${targetFiles.join("\n")}`
        : "Focused files: none",
      fileDiff ? `Diff:\n${fileDiff}` : "Diff: unavailable",
      "Generate the final commit message now.",
    ].join("\n\n");

    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const requestParams = {
      messages,
      diff: fileDiff || userPrompt,
      model: selectedModel,
      additionalContext: "",
      language: preferences.language,
      simplifyDiff: featureSettings.simplifyDiff,
      feature: "commit-chat",
      changeFiles: targetFiles,
      enableEmoji: featureSettings.enableEmoji,
      enableMergeCommit: featureSettings.enableMergeCommit,
    };

    let content = "";
    if (aiProvider.generateCommitStream) {
      const stream = await aiProvider.generateCommitStream(requestParams);
      for await (const chunk of stream) {
        content += chunk;
        await onDelta(chunk);
      }
    } else {
      const result = await aiProvider.generateCommit(requestParams);
      content = result.content || "";
      if (content) {
        await onDelta(content);
      }
    }

    const cleaned = filterCodeBlockMarkers(content).trim();
    const commitMessage = cleaned || "chore: update changes";

    return {
      reply: commitMessage,
      commitMessage,
    };
  }
}
