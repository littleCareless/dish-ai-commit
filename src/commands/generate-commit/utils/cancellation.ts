import { getMessage } from "@/utils/i18n";
import { Logger } from "@/utils/logger";
import * as vscode from "vscode";

export function assertNotCancelled(
  token: vscode.CancellationToken,
  logger: Logger,
): void {
  if (token.isCancellationRequested) {
    logger.info(getMessage("user.cancelled.operation.log"));
    throw new Error(getMessage("user.cancelled.operation.error"));
  }
}

export function isCancellationError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message === getMessage("user.cancelled.operation.error");
}

