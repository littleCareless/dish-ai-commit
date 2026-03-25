import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execSync } from "child_process";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/logger", () => ({
  Logger: {
    getInstance: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      logError: vi.fn(),
    }),
  },
}));

vi.mock("@/utils/i18n", () => ({
  formatMessage: (messageKey: string) => messageKey,
}));

vi.mock("@/utils/notification/notification-manager", () => ({
  notify: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/utils/diff/diff-processor", () => ({
  DiffProcessor: {
    process: (diff: string) => diff,
  },
}));

vi.mock("@/utils/diff/file-type-utils", () => ({
  SKIPPED_DIFF_PLACEHOLDER_SENTINEL: "[DishAI-SkipDiff-Placeholder]",
  FileTypeUtils: {
    shouldSkipDiff: () => false,
    getFileTypeDescription: () => "Binary/Resource File",
  },
}));

import { GitDiffHelper } from "@/scm/git/helpers/git-diff-helper";

function run(command: string, cwd: string): string {
  return execSync(command, { cwd, stdio: "pipe", encoding: "utf8" });
}

function createTempRepository(): string {
  const repoPath = fs.mkdtempSync(path.join(os.tmpdir(), "dish-git-diff-"));
  run("git init", repoPath);
  run('git config user.email "test@example.com"', repoPath);
  run('git config user.name "test-user"', repoPath);

  fs.writeFileSync(path.join(repoPath, "a.txt"), "line-a-1\n", "utf8");
  fs.writeFileSync(path.join(repoPath, "b.txt"), "line-b-1\n", "utf8");
  run("git add a.txt b.txt", repoPath);
  run('git commit -m "initial"', repoPath);

  return repoPath;
}

function setupChanges(repoPath: string): void {
  fs.writeFileSync(path.join(repoPath, "a.txt"), "line-a-2\n", "utf8");
  run("git add a.txt", repoPath);

  fs.writeFileSync(path.join(repoPath, "b.txt"), "line-b-2\n", "utf8");
}

describe("GitDiffHelper file target behavior", () => {
  const tempRepos: string[] = [];

  afterEach(() => {
    for (const repo of tempRepos.splice(0, tempRepos.length)) {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  });

  it("returns only staged file diff when target is staged", async () => {
    const repoPath = createTempRepository();
    tempRepos.push(repoPath);
    setupChanges(repoPath);

    const helper = new GitDiffHelper();
    const repository = {
      rootUri: {
        fsPath: repoPath,
      },
    } as any;

    const diff = await helper.getDiff(repository, ["a.txt", "b.txt"], "staged");

    expect(diff).toContain("a.txt");
    expect(diff).not.toContain("b.txt");
  });

  it("returns both staged and unstaged file diffs when target is all", async () => {
    const repoPath = createTempRepository();
    tempRepos.push(repoPath);
    setupChanges(repoPath);

    const helper = new GitDiffHelper();
    const repository = {
      rootUri: {
        fsPath: repoPath,
      },
    } as any;

    const diff = await helper.getDiff(repository, ["a.txt", "b.txt"], "all");

    expect(diff).toContain("a.txt");
    expect(diff).toContain("b.txt");
  });
});
