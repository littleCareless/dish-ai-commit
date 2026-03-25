#!/usr/bin/env ts-node
import * as fs from "fs";
import * as path from "path";
import {
  formatAuditMarkdown,
  runProtocolAudit,
  type ProtocolAuditReport,
} from "./protocol-audit-core";

type OutputFormat = "markdown" | "json" | "both";

interface CliOptions {
  format: OutputFormat;
  ci: boolean;
  strict: boolean;
  allowlistPath?: string;
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    format: "both",
    ci: false,
    strict: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    switch (token) {
      case "--":
        break;
      case "--format": {
        const value = argv[i + 1];
        if (!value || !["markdown", "json", "both"].includes(value)) {
          throw new Error(
            "Invalid --format value. Use one of: markdown, json, both."
          );
        }
        options.format = value as OutputFormat;
        i += 1;
        break;
      }
      case "--ci":
        options.ci = true;
        break;
      case "--strict":
        options.strict = true;
        break;
      case "--allowlist": {
        const value = argv[i + 1];
        if (!value) {
          throw new Error("Missing --allowlist path.");
        }
        options.allowlistPath = value;
        i += 1;
        break;
      }
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(
    [
      "Usage: ts-node ./scripts/protocol-audit.ts [options]",
      "",
      "Options:",
      "  --format markdown|json|both   Output format (default: both)",
      "  --ci                           Enable non-zero exit code on violations",
      "  --strict                       Treat WARN as failure when --ci is enabled",
      "  --allowlist <path>             Override allowlist JSON path",
      "  -h, --help                     Show help",
    ].join("\n")
  );
}

function findWorkspaceRoot(startDir: string): string {
  const candidates = [startDir, path.resolve(startDir, ".."), path.resolve(startDir, "../..")];
  for (const candidate of candidates) {
    const hasMessages = fs.existsSync(
      path.join(candidate, "shared/types/messages.ts")
    );
    const hasWebview = fs.existsSync(path.join(candidate, "webview-ui/src"));
    const hasExtension = fs.existsSync(path.join(candidate, "src/services/webview"));
    if (hasMessages && hasWebview && hasExtension) {
      return candidate;
    }
  }
  throw new Error(
    `Unable to locate workspace root from ${startDir}. Expected shared/types/messages.ts and webview-ui/src.`
  );
}

function printReport(report: ProtocolAuditReport, format: OutputFormat): void {
  if (format === "markdown" || format === "both") {
    console.log(formatAuditMarkdown(report));
  }

  if (format === "json" || format === "both") {
    const json = JSON.stringify(report, null, 2);
    if (format === "both") {
      console.log("");
      console.log("## JSON");
      console.log("");
    }
    console.log(json);
  }
}

function shouldFail(report: ProtocolAuditReport, strict: boolean): boolean {
  if (report.summary.error > 0) {
    return true;
  }
  return strict && report.summary.warn > 0;
}

function main(): void {
  const options = parseCliOptions(process.argv.slice(2));
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const allowlistPath = options.allowlistPath
    ? path.resolve(options.allowlistPath)
    : undefined;

  const report = runProtocolAudit({
    workspaceRoot,
    allowlistPath,
  });

  const jsonOutputPath = path.join(workspaceRoot, "protocol-audit-report.json");
  fs.writeFileSync(jsonOutputPath, JSON.stringify(report, null, 2), "utf8");

  printReport(report, options.format);
  console.log("");
  console.log(`JSON report written to: ${jsonOutputPath}`);

  if (options.ci && shouldFail(report, options.strict)) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(
    `[protocol-audit] ${error instanceof Error ? error.message : String(error)}`
  );
  process.exitCode = 1;
}
