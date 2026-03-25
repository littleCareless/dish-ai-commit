import { extractResourceFilePath } from "@/scm/utils/resource-state-utils";
import {
  NormalizedCommandInput,
  SourceControlInput,
} from "@/commands/generate-commit/types";
import * as vscode from "vscode";

function isSourceControlInput(value: unknown): value is SourceControlInput {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    !!candidate.rootUri &&
    typeof (candidate.rootUri as vscode.Uri).fsPath === "string"
  );
}

function toResourceStates(args: unknown[]): vscode.SourceControlResourceState[] {
  const resourceStates: vscode.SourceControlResourceState[] = [];
  for (const arg of args) {
    if (!arg || typeof arg !== "object") {
      continue;
    }
    const filePath = extractResourceFilePath(
      arg as vscode.SourceControlResourceState,
    );
    if (filePath) {
      resourceStates.push(arg as vscode.SourceControlResourceState);
    }
  }
  return resourceStates;
}

export function normalizeGenerateCommitInput(
  rawArgs: any[],
): NormalizedCommandInput {
  const normalizedArgs =
    rawArgs.length === 1 && Array.isArray(rawArgs[0]) ? rawArgs[0] : rawArgs;

  const sourceControl = normalizedArgs.find((arg) =>
    isSourceControlInput(arg),
  ) as SourceControlInput | undefined;
  const resourceStates = toResourceStates(normalizedArgs);

  let source: NormalizedCommandInput["source"] = "command-palette";
  if (sourceControl) {
    source = "scm-title";
  } else if (resourceStates.length > 0) {
    source = "resource-context";
  }

  const prepareArg = sourceControl
    ? sourceControl
    : resourceStates.length > 0
      ? resourceStates
      : undefined;

  return {
    rawArgs,
    source,
    sourceControl,
    resourceStates,
    prepareArg,
  };
}

