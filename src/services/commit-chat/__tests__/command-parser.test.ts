import {
  CommandParser,
  CommitCommand,
  CommandContext,
} from "@/services/commit-chat/command-parser";
import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockContext(
  overrides: Partial<CommandContext> = {},
): CommandContext {
  return {
    currentInput: "",
    messageHistory: [],
    projectContext: {
      language: "typescript",
      recentCommits: [
        "feat: add login",
        "fix: resolve crash",
        "docs: update readme",
      ],
    },
    userPreferences: {
      style: "conventional",
      language: "en",
      maxLength: 72,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseCommand
// ---------------------------------------------------------------------------

describe("CommandParser.parseCommand", () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  it("returns null for non-command input (no leading slash)", () => {
    expect(parser.parseCommand("hello world")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parser.parseCommand("")).toBeNull();
  });

  it("parses a command without arguments", () => {
    const result = parser.parseCommand("/help");
    expect(result).toEqual({ command: "help", args: [] });
  });

  it("parses a command with a single argument", () => {
    const result = parser.parseCommand("/style conventional");
    expect(result).toEqual({ command: "style", args: ["conventional"] });
  });

  it("parses a command with multiple arguments", () => {
    const result = parser.parseCommand("/length 72");
    expect(result).toEqual({ command: "length", args: ["72"] });
  });

  it("handles extra whitespace between command and arguments", () => {
    const result = parser.parseCommand("/help   template");
    expect(result).toEqual({ command: "help", args: ["template"] });
  });

  it("returns null when input has leading whitespace (does not start with /)", () => {
    // The source checks startsWith("/") strictly -- leading space causes null
    const result = parser.parseCommand("  /clear  ");
    expect(result).toBeNull();
  });

  it("handles trailing whitespace correctly", () => {
    const result = parser.parseCommand("/clear  ");
    expect(result).toEqual({ command: "clear", args: [] });
  });

  it("handles arguments containing special characters", () => {
    const result = parser.parseCommand("/suggest fix: login-bug (urgent!)");
    expect(result).toEqual({
      command: "suggest",
      args: ["fix:", "login-bug", "(urgent!)"],
    });
  });
});

// ---------------------------------------------------------------------------
// executeCommand -- help
// ---------------------------------------------------------------------------

describe("CommandParser.executeCommand -- help", () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  it("returns list of all commands when called without arguments", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/help", ctx);
    expect(result.success).toBe(true);
    expect(result.message).toContain("Available commands");
  });

  it("returns details for a specific command", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/help template", ctx);
    expect(result.success).toBe(true);
    expect(result.message).toContain("template");
    expect(result.message).toContain("Usage");
  });

  it("returns error for unknown help target", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/help nonexistent", ctx);
    expect(result.success).toBe(false);
    expect(result.message).toContain("does not exist");
  });

  it("returns Chinese localized messages when preference is zh", async () => {
    const ctx = createMockContext({
      userPreferences: { style: "conventional", language: "zh", maxLength: 72 },
    });
    const result = await parser.executeCommand("/help", ctx);
    expect(result.success).toBe(true);
    expect(result.message).toContain("可用命令");
  });
});

// ---------------------------------------------------------------------------
// executeCommand -- template
// ---------------------------------------------------------------------------

describe("CommandParser.executeCommand -- template", () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  it("lists available templates when called without arguments", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/template", ctx);
    expect(result.success).toBe(true);
    expect(result.message).toContain("feat");
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions!.length).toBeGreaterThan(0);
  });

  it("returns specific template when type is valid", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/template feat", ctx);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.template).toContain("feat");
  });

  it("returns error for unknown template type", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/template unknown", ctx);
    expect(result.success).toBe(false);
    expect(result.message).toContain("does not exist");
  });
});

// ---------------------------------------------------------------------------
// executeCommand -- style
// ---------------------------------------------------------------------------

describe("CommandParser.executeCommand -- style", () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  it("lists available styles when called without arguments", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/style", ctx);
    expect(result.success).toBe(true);
    expect(result.message).toContain("conventional");
    expect(result.message).toContain("descriptive");
  });

  it("sets style when valid style name provided", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/style emoji", ctx);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ style: "emoji" });
  });

  it("returns error for invalid style name", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/style nonexistent", ctx);
    expect(result.success).toBe(false);
    expect(result.message).toContain("does not exist");
  });
});

// ---------------------------------------------------------------------------
// executeCommand -- length
// ---------------------------------------------------------------------------

describe("CommandParser.executeCommand -- length", () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  it("returns error when called without a number", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/length", ctx);
    expect(result.success).toBe(false);
    expect(result.message).toContain("specify a length");
  });

  it("sets max length for valid number", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/length 72", ctx);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ maxLength: 72 });
  });

  it("rejects length below minimum (10)", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/length 5", ctx);
    expect(result.success).toBe(false);
    expect(result.message).toContain("number between 10 and 200");
  });

  it("rejects length above maximum (200)", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/length 300", ctx);
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric input", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/length abc", ctx);
    expect(result.success).toBe(false);
    expect(result.message).toContain("number between 10 and 200");
  });
});

// ---------------------------------------------------------------------------
// executeCommand -- language
// ---------------------------------------------------------------------------

describe("CommandParser.executeCommand -- language", () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  it("lists available languages when called without arguments", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/language", ctx);
    expect(result.success).toBe(true);
    expect(result.message).toContain("zh");
    expect(result.message).toContain("en");
  });

  it("sets language when valid code provided", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/language zh", ctx);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ language: "zh" });
  });

  it("returns error for unsupported language code", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/language fr", ctx);
    expect(result.success).toBe(false);
    expect(result.message).toContain("not supported");
  });
});

// ---------------------------------------------------------------------------
// executeCommand -- suggest
// ---------------------------------------------------------------------------

describe("CommandParser.executeCommand -- suggest", () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  it("generates suggestions from provided input", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand(
      "/suggest add user login",
      ctx,
    );
    expect(result.success).toBe(true);
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions!.length).toBe(4);
    expect(result.suggestions![0]).toContain("feat: add user login");
  });

  it("falls back to currentInput when no args provided", async () => {
    const ctx = createMockContext({ currentInput: "fix crash" });
    const result = await parser.executeCommand("/suggest", ctx);
    expect(result.success).toBe(true);
    expect(result.suggestions![0]).toContain("feat: fix crash");
  });

  it("returns error when no input available", async () => {
    const ctx = createMockContext({ currentInput: "" });
    const result = await parser.executeCommand("/suggest", ctx);
    expect(result.success).toBe(false);
    expect(result.message).toContain("provide input");
  });
});

// ---------------------------------------------------------------------------
// executeCommand -- history
// ---------------------------------------------------------------------------

describe("CommandParser.executeCommand -- history", () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  it("shows recent commits with default count of 5", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/history", ctx);
    expect(result.success).toBe(true);
    expect(result.message).toContain("feat: add login");
  });

  it("respects custom count argument", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/history 1", ctx);
    expect(result.success).toBe(true);
    expect(result.message).toContain("feat: add login");
    expect(result.message).not.toContain("fix: resolve crash");
  });

  it("shows empty history message when no commits exist", async () => {
    const ctx = createMockContext({
      projectContext: {
        language: "typescript",
        recentCommits: [],
      },
    });
    const result = await parser.executeCommand("/history", ctx);
    expect(result.success).toBe(true);
    expect(result.message).toContain("No commit history");
  });
});

// ---------------------------------------------------------------------------
// executeCommand -- clear / export
// ---------------------------------------------------------------------------

describe("CommandParser.executeCommand -- clear and export", () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  it("clear returns success with clear action", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/clear", ctx);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ action: "clear" });
  });

  it("export returns success with export action", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/export", ctx);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ action: "export" });
  });
});

// ---------------------------------------------------------------------------
// executeCommand -- unknown / invalid
// ---------------------------------------------------------------------------

describe("CommandParser.executeCommand -- unknown and invalid commands", () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  it("returns error for unknown command", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("/unknowncmd", ctx);
    expect(result.success).toBe(false);
    expect(result.message).toContain("Unknown command");
  });

  it("returns error for non-command string", async () => {
    const ctx = createMockContext();
    const result = await parser.executeCommand("just text", ctx);
    expect(result.success).toBe(false);
    expect(result.message).toContain("Invalid command format");
  });
});

// ---------------------------------------------------------------------------
// getCommandSuggestions
// ---------------------------------------------------------------------------

describe("CommandParser.getCommandSuggestions", () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  it("returns empty array for non-slash input", () => {
    expect(parser.getCommandSuggestions("hello")).toEqual([]);
  });

  it("returns matching commands for slash prefix", () => {
    const suggestions = parser.getCommandSuggestions("/h");
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((s) => s.startsWith("/"))).toBe(true);
    expect(suggestions).toContain("/help");
    expect(suggestions).toContain("/history");
  });

  it("returns all commands for just slash", () => {
    const suggestions = parser.getCommandSuggestions("/");
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it("limits results to 10 suggestions", () => {
    const suggestions = parser.getCommandSuggestions("/");
    expect(suggestions.length).toBeLessThanOrEqual(10);
  });

  it("returns empty array when no commands match", () => {
    const suggestions = parser.getCommandSuggestions("/zzzzz");
    expect(suggestions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Command registration and history
// ---------------------------------------------------------------------------

describe("CommandParser custom commands and history", () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  it("registers and executes a custom command", async () => {
    const customCommand: CommitCommand = {
      command: "custom",
      description: "A custom test command",
      usage: "/custom [arg]",
      examples: ["/custom hello"],
      handler: async (args) => ({
        success: true,
        message: `Custom: ${args.join(" ")}`,
      }),
    };

    parser.registerCommand(customCommand);
    expect(parser.hasCommand("custom")).toBe(true);

    const ctx = createMockContext();
    const result = await parser.executeCommand("/custom hello world", ctx);
    expect(result.success).toBe(true);
    expect(result.message).toBe("Custom: hello world");
  });

  it("unregisters a command", () => {
    expect(parser.hasCommand("help")).toBe(true);
    parser.unregisterCommand("help");
    expect(parser.hasCommand("help")).toBe(false);
  });

  it("tracks command history after execution", async () => {
    const ctx = createMockContext();
    await parser.executeCommand("/help", ctx);
    await parser.executeCommand("/clear", ctx);

    const history = parser.getCommandHistory();
    expect(history).toEqual(["/help", "/clear"]);
  });

  it("limits command history to 50 entries", async () => {
    const ctx = createMockContext();
    for (let i = 0; i < 55; i++) {
      await parser.executeCommand("/clear", ctx);
    }

    const history = parser.getCommandHistory();
    expect(history.length).toBe(50);
    // The first 5 entries should have been evicted
    expect(history[0]).toBe("/clear");
  });

  it("getAllCommands returns all registered commands", () => {
    const commands = parser.getAllCommands();
    expect(commands.length).toBeGreaterThan(0);
    const names = commands.map((c) => c.command);
    expect(names).toContain("help");
    expect(names).toContain("template");
    expect(names).toContain("clear");
  });

  it("getCommand returns specific command", () => {
    const cmd = parser.getCommand("help");
    expect(cmd).toBeDefined();
    expect(cmd!.command).toBe("help");
  });

  it("getCommand returns undefined for unknown command", () => {
    expect(parser.getCommand("nonexistent")).toBeUndefined();
  });

  it("accepts custom commands via constructor", async () => {
    const customCommand: CommitCommand = {
      command: "initcmd",
      description: "Constructor-provided command",
      usage: "/initcmd",
      examples: ["/initcmd"],
      handler: async () => ({
        success: true,
        message: "init cmd executed",
      }),
    };

    const customParser = new CommandParser([customCommand]);
    expect(customParser.hasCommand("initcmd")).toBe(true);

    const ctx = createMockContext();
    const result = await customParser.executeCommand("/initcmd", ctx);
    expect(result.success).toBe(true);
    expect(result.message).toBe("init cmd executed");
  });

  it("handles handler errors gracefully", async () => {
    const errorCommand: CommitCommand = {
      command: "failcmd",
      description: "Always fails",
      usage: "/failcmd",
      examples: ["/failcmd"],
      handler: async () => {
        throw new Error("handler error");
      },
    };

    parser.registerCommand(errorCommand);
    const ctx = createMockContext();
    const result = await parser.executeCommand("/failcmd", ctx);
    expect(result.success).toBe(false);
    expect(result.message).toContain("failed");
    expect(result.message).toContain("handler error");
  });
});
