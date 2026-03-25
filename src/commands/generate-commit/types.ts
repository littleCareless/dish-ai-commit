import { AIModel, AIProvider } from "@/ai/types";
import { ISCMProvider } from "@/scm/scm-provider";
import { RepositoryContext } from "@/scm/staged-detector-types";
import * as vscode from "vscode";

export type GenerationStatus = "success" | "failed" | "cancelled" | "too_large";

export interface GenerationNotification {
  level: "info" | "warn" | "error";
  key: string;
  args?: Array<string | number>;
}

export interface GenerationResult {
  status: GenerationStatus;
  applied: boolean;
  requestId: string;
  repositoryPath?: string;
  provider?: string;
  model?: string;
  message?: string;
  error?: string;
  errorCode?: string;
  fromCache?: boolean;
  notification?: GenerationNotification;
}

export interface CrossRepositoryItemResult extends GenerationResult {
  repoPath: string;
}

export interface CrossRepositoryResult {
  requestId: string;
  total: number;
  successCount: number;
  failureCount: number;
  cancelledCount: number;
  cancelled: boolean;
  results: CrossRepositoryItemResult[];
}

export type NormalizedCommandSource =
  | "scm-title"
  | "resource-context"
  | "command-palette";

export interface SourceControlInput {
  id: string;
  rootUri: vscode.Uri;
}

export interface NormalizedCommandInput {
  rawArgs: any[];
  source: NormalizedCommandSource;
  sourceControl?: SourceControlInput;
  resourceStates: vscode.SourceControlResourceState[];
  prepareArg?: any;
}

export interface GenerationTargetContext {
  repositoryPath: string;
  scmProvider?: ISCMProvider;
  selectedFiles?: string[];
  repositoryContext: RepositoryContext;
  detectionError?: string;
}

export type GenerationSCMContext =
  | {
      mode: "single";
      target: GenerationTargetContext;
    }
  | {
      mode: "cross";
      targets: GenerationTargetContext[];
    };

export interface GenerationSession {
  requestId: string;
  provider: string;
  model: string;
  providerConfig: any;
  aiProvider: AIProvider;
  selectedModel: AIModel;
  input: NormalizedCommandInput;
  scmContext: GenerationSCMContext;
}
