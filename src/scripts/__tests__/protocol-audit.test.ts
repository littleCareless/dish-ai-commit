import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  extractMessageCatalog,
  formatAuditMarkdown,
  runProtocolAudit,
} from "../protocol-audit-core";

function ensureDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeFile(root: string, relativePath: string, content: string): void {
  const fullPath = path.join(root, relativePath);
  ensureDir(fullPath);
  fs.writeFileSync(fullPath, content, "utf8");
}

function createFixtureWorkspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "protocol-audit-"));

  writeFile(
    root,
    "shared/types/messages.ts",
    `
export enum UIRequest {
  A = "feature.a",
  B = "feature.b",
  C = "feature.c"
}

export enum ExtensionResponse {
  X = "feature.x",
  Y = "feature.y",
  Z = "feature.z"
}
`
  );

  writeFile(
    root,
    "webview-ui/src/page.tsx",
    `
import { UIRequest, ExtensionResponse } from "@shared/types/messages";
import { postMessage } from "@/utils/vscode";

postMessage(UIRequest.A);
postMessage(UIRequest.B);
postMessage("legacyCommand");

window.addEventListener("message", (event) => {
  if (event.data.command === ExtensionResponse.X) {
    return;
  }
  if (event.data.command === ExtensionResponse.Y) {
    return;
  }
  if (event.data.command === "unknownRecv") {
    return;
  }
});
`
  );

  writeFile(
    root,
    "src/services/webview/handler.ts",
    `
import { UIRequest, ExtensionResponse } from "@shared/types/messages";

export function handle(message: any, webview: any) {
  switch (message.command) {
    case UIRequest.A:
      break;
    case "legacyCommand":
      break;
  }

  webview.postMessage({ command: ExtensionResponse.X, data: {} });
}
`
  );

  writeFile(
    root,
    "src/scripts/protocol-audit.allowlist.json",
    JSON.stringify(
      {
        legacyCommands: ["legacyCommand"],
        fileScopedIgnores: [],
        temporaryWaivers: [],
      },
      null,
      2
    )
  );

  return root;
}

const temporaryRoots: string[] = [];

afterEach(() => {
  while (temporaryRoots.length > 0) {
    const root = temporaryRoots.pop()!;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("protocol-audit", () => {
  it("extracts enum message catalog", () => {
    const root = createFixtureWorkspace();
    temporaryRoots.push(root);

    const catalog = extractMessageCatalog(
      path.join(root, "shared/types/messages.ts")
    );

    expect(catalog.uiRequestByMember.get("A")?.value).toBe("feature.a");
    expect(catalog.uiRequestByValue.get("feature.b")?.member).toBe("B");
    expect(catalog.extensionResponseByMember.get("X")?.value).toBe("feature.x");
    expect(catalog.extensionResponseByValue.get("feature.z")?.member).toBe("Z");
  });

  it("reports errors, warnings and allowlisted legacy commands", () => {
    const root = createFixtureWorkspace();
    temporaryRoots.push(root);

    const report = runProtocolAudit({ workspaceRoot: root });

    expect(
      report.findings.some(
        (finding) =>
          finding.type === "legacy-allowlisted-command" &&
          finding.command === "legacyCommand" &&
          finding.level === "INFO"
      )
    ).toBe(true);

    expect(
      report.findings.some(
        (finding) =>
          finding.type === "unknown-string-command" &&
          finding.command === "unknownRecv" &&
          finding.level === "ERROR"
      )
    ).toBe(true);

    expect(
      report.findings.some(
        (finding) =>
          finding.type === "missing-extension-receiver" &&
          finding.command === "feature.b" &&
          finding.level === "ERROR"
      )
    ).toBe(true);

    expect(
      report.findings.some(
        (finding) =>
          finding.type === "missing-extension-sender" &&
          finding.command === "feature.y" &&
          finding.level === "ERROR"
      )
    ).toBe(true);

    expect(
      report.findings.some(
        (finding) =>
          finding.type === "unused-ui-request" &&
          finding.command === "feature.c" &&
          finding.level === "WARN"
      )
    ).toBe(true);

    expect(report.uncovered.sentOnly.uiRequests).toContain("feature.b");
    expect(report.uncovered.receivedOnly.extensionResponses).toContain(
      "feature.y"
    );
    expect(report.summary.error).toBeGreaterThan(0);
    expect(report.summary.warn).toBeGreaterThan(0);
    expect(report.summary.info).toBeGreaterThan(0);
  });

  it("formats markdown output", () => {
    const root = createFixtureWorkspace();
    temporaryRoots.push(root);

    const report = runProtocolAudit({ workspaceRoot: root });
    const markdown = formatAuditMarkdown(report);
    const normalized = markdown.split(root).join("<ROOT>");
    expect(normalized).toMatchSnapshot();
  });
});
