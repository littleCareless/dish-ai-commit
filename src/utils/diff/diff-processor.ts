import * as fs from "fs";
import { execSync } from "child_process";
import * as path from "path";
import * as vscode from "vscode";
import { DiffSimplifier } from "./diff-simplifier";
import { DiffSplitter } from "./diff-splitter";
import { DiffChunk, getDiffConfig } from "./types";

/**
 * A class to process diffs by simplifying and summarizing them into a structured plain text format.
 */
export class DiffProcessor {
  /**
   * Processes the diff output from a source control system.
   *
   * @param diff - The raw diff string.
   * @param type - The type of SCM ('git' or 'svn').
   * @returns The processed diff as a single formatted string.
   */
  static process(diff: string, type: "git" | "svn"): string {
    const chunks =
      type === "git"
        ? DiffSplitter.splitGitDiff(diff)
        : DiffSplitter.splitSvnDiff(diff);

    const processedChunks = chunks
      .map((chunk) => this.processChunk(chunk, type))
      .filter(Boolean)
      .join(""); // Join with no separator, as each chunk now ends with a newline

    if (!processedChunks) {
      return "";
    }

    return `<changes>\n${processedChunks}</changes>\n`;
  }

  /**
   * Processes a single diff chunk into a structured string.
   *
   * @param chunk - The diff chunk to process.
   * @returns The processed diff chunk content as a structured string, or null if not applicable.
   */
  private static processChunk(chunk: DiffChunk, type: "git" | "svn"): string | null {
    const config = getDiffConfig();
    let diffContent = chunk.content;

    if (config.enabled) {
      const lines = chunk.content.split("\n");
      const contextLines = config.contextLines;
      const importantLines = new Set<number>();

      lines.forEach((line, index) => {
        if (
          line.startsWith("+++") ||
          line.startsWith("---") ||
          line.startsWith("Index: ") ||
          line.startsWith("====") ||
          line.startsWith("diff --git") ||
          line.startsWith("@@")
        ) {
          importantLines.add(index);
        }

        if (line.startsWith("+") || line.startsWith("-")) {
          for (
            let i = Math.max(0, index - contextLines);
            i <= Math.min(lines.length - 1, index + contextLines);
            i++
          ) {
            importantLines.add(i);
          }
        }
      });

      let summarizedContent = "";
      let lastLine = -1;
      const sortedLines = Array.from(importantLines).sort((a, b) => a - b);

      for (const index of sortedLines) {
        if (lastLine !== -1 && index > lastLine + 1) {
          summarizedContent += "...\n";
        }
        summarizedContent += lines[index] + "\n";
        lastLine = index;
      }
      diffContent = summarizedContent;
    }

    const simplifiedDiff = DiffSimplifier.simplify(diffContent);
    const language = chunk.filename.split(".").pop() || "";

    // Generate # ORIGINAL CODE: block
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      return null; // Cannot proceed without workspace root
    }
    let originalCodeBlock = "";
    let originalContent = "";
    try {
      const relativeFilePath = chunk.filename;
      if (type === "git") {
        originalContent = execSync(`git show HEAD:"${relativeFilePath}"`, {
          cwd: workspaceRoot,
          encoding: "utf8",
          stdio: "pipe",
        });
      } else {
        originalContent = execSync(`svn cat "${relativeFilePath}"`, {
          cwd: workspaceRoot,
          encoding: "utf8",
          stdio: "pipe",
        });
      }
    } catch (error) {
      // This is expected for new files.
    }

    if (originalContent) {
      const originalCodeContent = [
        "# ORIGINAL CODE:",
        `\`\`\`${language}`,
        originalContent.trim(),
        "```",
      ].join("\n");
      originalCodeBlock = `<original-code>\n${originalCodeContent}\n</original-code>\n`;
    }

    // Generate # CODE CHANGES: block
    const codeChangesContent = [
      "# CODE CHANGES:",
      "```diff",
      simplifiedDiff.trim(),
      "```",
    ].join("\n");
    const codeChangesBlock = `<code-changes>\n${codeChangesContent}\n</code-changes>\n`;

    if (originalCodeBlock) {
      return `${originalCodeBlock}${codeChangesBlock}`;
    }
    return codeChangesBlock;
  }
}