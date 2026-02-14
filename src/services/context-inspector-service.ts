import { AIModel } from "@/ai/types";
import { ContextManager } from "@/utils/context-manager";
import {
  ContextBlock,
  ContextBuildReport,
  TruncationStrategy,
} from "@/utils/context-manager/types";
import {
  ContextBlockSnapshot,
  ContextPreviewSnapshot,
  ContextSummarySnapshot,
} from "@shared/types/messages";

interface StoreContextSnapshotInput {
  requestId: string;
  provider: string;
  model: AIModel;
  contextManager: ContextManager;
  suppressNonCriticalWarnings: boolean;
}

interface StoredContextSnapshot {
  requestId: string;
  provider: string;
  model: AIModel;
  generatedAt: number;
  systemPrompt: string;
  suppressNonCriticalWarnings: boolean;
  blocks: ContextBlock[];
  report: ContextBuildReport;
}

const MAX_PREVIEW_LENGTH = 2400;

export class ContextInspectorService {
  private static instance: ContextInspectorService;
  private latestSnapshot: StoredContextSnapshot | null = null;

  public static getInstance(): ContextInspectorService {
    if (!ContextInspectorService.instance) {
      ContextInspectorService.instance = new ContextInspectorService();
    }
    return ContextInspectorService.instance;
  }

  public storeSnapshot(input: StoreContextSnapshotInput): void {
    input.contextManager.buildMessages();
    const report = input.contextManager.getLastBuildReport();
    const systemPrompt = this.extractSystemPrompt(input.contextManager);

    this.latestSnapshot = {
      requestId: input.requestId,
      provider: input.provider,
      model: input.model,
      generatedAt: Date.now(),
      systemPrompt,
      suppressNonCriticalWarnings: input.suppressNonCriticalWarnings,
      blocks: input.contextManager.getBlocks().map((block) => ({ ...block })),
      report,
    };
  }

  public getLatestPreview(): ContextPreviewSnapshot | null {
    if (!this.latestSnapshot) {
      return null;
    }
    return this.toPreviewSnapshot(this.latestSnapshot.report, this.latestSnapshot);
  }

  public rebuildPreview(exclude: string[] = []): ContextPreviewSnapshot | null {
    if (!this.latestSnapshot) {
      return null;
    }

    const excludeSet = new Set(exclude);
    const filteredBlocks = this.latestSnapshot.blocks.filter(
      (block) => !excludeSet.has(block.name),
    );

    const contextManager = new ContextManager(
      this.latestSnapshot.model,
      this.latestSnapshot.systemPrompt,
      this.latestSnapshot.suppressNonCriticalWarnings,
    );
    for (const block of filteredBlocks) {
      contextManager.addBlock({ ...block });
    }
    contextManager.buildMessages();
    const rebuiltReport = contextManager.getLastBuildReport();

    return this.toPreviewSnapshot(rebuiltReport, this.latestSnapshot);
  }

  private toPreviewSnapshot(
    report: ContextBuildReport,
    snapshot: StoredContextSnapshot,
  ): ContextPreviewSnapshot {
    const blocksByName = new Map<string, ContextBlock>();
    for (const block of snapshot.blocks) {
      if (!blocksByName.has(block.name)) {
        blocksByName.set(block.name, block);
      }
    }

    const blocks: ContextBlockSnapshot[] = report.blocks.map((block) => {
      const rawContent = blocksByName.get(block.name)?.content ?? "";
      const previewContent = block.included ? block.finalContent : rawContent;
      return {
        name: block.name,
        priority: block.priority,
        strategy: TruncationStrategy[block.strategy],
        forceRetained: block.forceRetained,
        included: block.included,
        truncated: block.truncated,
        rawTokens: block.rawTokens,
        finalTokens: block.finalTokens,
        rawLength: block.rawLength,
        finalLength: block.finalLength,
        contentPreview: this.toPreviewText(previewContent),
      };
    });

    const summary: ContextSummarySnapshot = {
      requestId: snapshot.requestId,
      provider: snapshot.provider,
      modelId: snapshot.model.id,
      maxInputTokens: report.summary.maxTokens,
      systemPromptTokens: report.summary.systemPromptTokens,
      rawPromptTokens: report.summary.rawPromptTokens,
      finalPromptTokens: report.summary.finalPromptTokens,
      reserveTokens: report.summary.reserveTokens,
      generatedAt: snapshot.generatedAt,
    };

    return {
      summary,
      blocks,
      includedBlockNames: report.includedBlockNames,
      excludedBlockNames: report.excludedBlockNames,
      finalUserContent: this.toPreviewText(report.userContent, 12000),
    };
  }

  private toPreviewText(content: string, maxLength = MAX_PREVIEW_LENGTH): string {
    if (content.length <= maxLength) {
      return content;
    }
    return `${content.slice(0, maxLength)}\n...`;
  }

  private extractSystemPrompt(contextManager: ContextManager): string {
    const messages = contextManager.buildMessages();
    return typeof messages[0]?.content === "string"
      ? messages[0].content
      : JSON.stringify(messages[0]?.content ?? "");
  }
}
