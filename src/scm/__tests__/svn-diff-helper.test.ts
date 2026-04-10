import { beforeEach, describe, expect, it, vi } from "vitest";

// -- Shared mocks ----------------------------------------------------------

const { mockExec } = vi.hoisted(() => {
  const mockExec = vi.fn();
  return { mockExec };
});

vi.mock("child_process", () => ({
  exec: mockExec,
}));

vi.mock("util", async () => {
  const actual = await vi.importActual("util");
  return {
    ...actual,
    promisify: (fn: any) => {
      return (...args: any[]) => {
        return new Promise((resolve, reject) => {
          fn(...args, (err: any, result: any) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
      };
    },
  };
});

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  logError: vi.fn(),
};

vi.mock("@/utils/logger", () => ({
  Logger: {
    getInstance: () => mockLogger,
  },
}));

vi.mock("@/utils/i18n", () => ({
  getMessage: (key: string) => key,
  formatMessage: (key: string, args: any[] = []) =>
    args.length > 0 ? `${key}:${args.join(",")}` : key,
}));

vi.mock("@/utils/notification/notification-manager", () => ({
  notify: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/scm/svn/helpers/svn-path-helper", () => ({
  SvnPathHelper: {
    normalizePath: (p: string) => p,
    getSvnPath: vi.fn(async () => "svn"),
    getEnvironmentConfig: () => ({}),
    escapeShellPath: (p: string) => p,
    createExecOptions: (cwd: string) => ({ cwd }),
  },
}));

vi.mock("@/scm/utils/improved-path-utils", () => ({
  ImprovedPathUtils: {
    normalizePath: (p: string) => p,
    createExecOptions: (cwd: string) => ({ cwd }),
    escapeShellPath: (p: string) => p,
    createTempFilePath: (name: string) => `/tmp/${name}`,
  },
}));

vi.mock("@/utils/diff/file-type-utils", () => ({
  FileTypeUtils: {
    shouldSkipDiff: () => false,
    getFileTypeDescription: (f: string) => "text file",
  },
  SKIPPED_DIFF_PLACEHOLDER_SENTINEL: "[SKIPPED]",
}));

let diffProcessorProcessMock = vi.fn((content: string) => content);

vi.mock("@/utils/diff/diff-processor", () => ({
  DiffProcessor: {
    get process() { return diffProcessorProcessMock; },
  },
}));

const mockFeatureSettings = {
  diffTarget: "all",
};

vi.mock("@/services/profile-manager/profile-manager-service", () => ({
  ProfileManagerService: {
    getInstance: () => ({
      getFeatureSettings: () => ({ ...mockFeatureSettings }),
    }),
  },
}));

vi.mock("fs", async () => {
  const actual = await vi.importActual("fs");
  return {
    ...actual,
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    readFileSync: vi.fn(() => "file content\n"),
  };
});

import { SvnDiffHelper } from "@/scm/svn/helpers/svn-diff-helper";

// -- Test data -------------------------------------------------------------

const SVN_DIFF_OUTPUT = `Index: src/utils/helper.ts
===================================================================
--- src/utils/helper.ts  (revision 100)
+++ src/utils/helper.ts  (working copy)
@@ -1,5 +1,6 @@
 import { format } from 'util';
+import { validate } from './validate';

 export function process(input: string): string {
-  return format(input);
+  const result = format(input);
+  return validate(result);
 }
`;

const SVN_STATUS_OUTPUT = `M       src/utils/helper.ts
A       src/new-file.ts
?       src/untracked.ts
D       src/deleted.ts
`;

// -- Helpers ---------------------------------------------------------------

function setupExecResponses(
  responses: Array<{ pattern: string; stdout: string; stderr?: string; error?: boolean }>,
) {
  mockExec.mockImplementation(
    (cmd: string, _opts: any, callback: any) => {
      if (typeof _opts === "function") {
        callback = _opts;
      }
      for (const resp of responses) {
        if (cmd.includes(resp.pattern)) {
          if (resp.error) {
            const err: any = new Error(resp.stderr || "command failed");
            err.stderr = resp.stderr || "";
            callback(err, { stdout: resp.stdout || "", stderr: resp.stderr || "" });
          } else {
            callback(null, { stdout: resp.stdout, stderr: resp.stderr || "" });
          }
          return;
        }
      }
      callback(null, { stdout: "", stderr: "" });
    },
  );
}

// -- Tests -----------------------------------------------------------------

describe("SvnDiffHelper", () => {
  let helper: SvnDiffHelper;
  const envConfig = { path: ["/usr/local/bin"], locale: "en_US.UTF-8" };
  const repositoryPath = "/workspace/svn-repo";

  beforeEach(() => {
    mockExec.mockReset();
    diffProcessorProcessMock.mockClear();
    helper = new SvnDiffHelper("svn", envConfig);
  });

  // -----------------------------------------------------------------------
  // getFileStatus
  // -----------------------------------------------------------------------
  describe("getFileStatus", () => {
    it('returns "Modified File" for M-prefixed status', async () => {
      setupExecResponses([
        { pattern: "status", stdout: "M       file.ts\n" },
      ]);

      const status = await helper.getFileStatus("file.ts", repositoryPath);
      expect(status).toBe("Modified File");
    });

    it('returns "New File" for ?-prefixed status', async () => {
      setupExecResponses([
        { pattern: "status", stdout: "?       new.ts\n" },
      ]);

      const status = await helper.getFileStatus("new.ts", repositoryPath);
      expect(status).toBe("New File");
    });

    it('returns "Deleted File" for D-prefixed status', async () => {
      setupExecResponses([
        { pattern: "status", stdout: "D       old.ts\n" },
      ]);

      const status = await helper.getFileStatus("old.ts", repositoryPath);
      expect(status).toBe("Deleted File");
    });

    it('returns "Unknown" when status is empty', async () => {
      setupExecResponses([]);

      const status = await helper.getFileStatus("file.ts", repositoryPath);
      expect(status).toBe("Unknown");
    });

    it('returns "Unknown" on exec error', async () => {
      setupExecResponses([
        { pattern: "status", stdout: "", error: true },
      ]);

      const status = await helper.getFileStatus("file.ts", repositoryPath);
      expect(status).toBe("Unknown");
    });
  });

  // -----------------------------------------------------------------------
  // getDiff - with specific files
  // -----------------------------------------------------------------------
  describe("getDiff with specific files", () => {
    it("returns diff content for a modified tracked file", async () => {
      setupExecResponses([
        { pattern: "status", stdout: "M       file.ts\n" },
        { pattern: "diff", stdout: SVN_DIFF_OUTPUT },
      ]);

      const result = await helper.getDiff(repositoryPath, ["file.ts"]);
      expect(result).toBeDefined();
    });

    it("returns deleted file header without diff content", async () => {
      setupExecResponses([
        { pattern: "status", stdout: "D       deleted.ts\n" },
      ]);

      const result = await helper.getDiff(repositoryPath, ["deleted.ts"]);
      expect(result).toContain("Deleted File: deleted.ts");
    });

    it("returns undefined when no diff output", async () => {
      setupExecResponses([
        { pattern: "status", stdout: "M       file.ts\n" },
      ]);

      const result = await helper.getDiff(repositoryPath, ["file.ts"]);
      expect(result).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // getDiff - all changes (no files specified)
  // -----------------------------------------------------------------------
  describe("getDiff all changes", () => {
    it("returns all changes diff when no files specified", async () => {
      mockFeatureSettings.diffTarget = "all";

      let callIndex = 0;
      mockExec.mockImplementation(
        (cmd: string, _opts: any, callback: any) => {
          if (typeof _opts === "function") {
            callback = _opts;
          }
          callIndex++;
          // Sequence of calls in getAllChangesDiff for "all":
          // 1. svn status --no-ignore --xml
          // 2. "svn diff" (get all changes diff)
          // 3. "svn status" (get untracked files)
          if (cmd.includes("--no-ignore") && cmd.includes("--xml")) {
            callback(null, { stdout: '<?xml version="1.0"?>\n<status>\n</status>', stderr: "" });
          } else if (cmd === '"svn" diff' || cmd.endsWith('svn" diff')) {
            callback(null, { stdout: SVN_DIFF_OUTPUT, stderr: "" });
          } else if (cmd.includes("status") && !cmd.includes("--xml")) {
            callback(null, { stdout: SVN_STATUS_OUTPUT, stderr: "" });
          } else {
            callback(null, { stdout: "", stderr: "" });
          }
        },
      );

      const result = await helper.getDiff(repositoryPath);
      // Should produce output via DiffProcessor
      expect(result).toBeDefined();
    });

    it("returns undefined when no changes exist", async () => {
      mockFeatureSettings.diffTarget = "all";

      setupExecResponses([
        { pattern: "status --no-ignore --xml", stdout: '<?xml version="1.0"?>\n<status>\n</status>' },
        { pattern: "svn diff", stdout: "" },
        { pattern: "status", stdout: "" },
      ]);

      const result = await helper.getDiff(repositoryPath);
      expect(result).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // SVN diff format parsing
  // -----------------------------------------------------------------------
  describe("SVN diff format parsing", () => {
    it("processes SVN unified diff format through DiffProcessor", async () => {
      setupExecResponses([
        { pattern: "status", stdout: "M       helper.ts\n" },
        { pattern: "diff", stdout: SVN_DIFF_OUTPUT },
      ]);

      await helper.getDiff(repositoryPath, ["helper.ts"]);

      // Verify DiffProcessor.process was called
      expect(diffProcessorProcessMock).toHaveBeenCalled();
    });
  });
});
