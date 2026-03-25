import * as fs from "fs";
import * as path from "path";
import ts from "typescript";

export type FindingLevel = "ERROR" | "WARN" | "INFO";
export type FindingDirection =
  | "ui->extension"
  | "extension->ui"
  | "declaration";

export interface ProtocolFinding {
  level: FindingLevel;
  type:
    | "unknown-string-command"
    | "missing-extension-receiver"
    | "missing-extension-sender"
    | "unused-ui-request"
    | "unused-extension-response"
    | "legacy-allowlisted-command"
    | "expired-waiver";
  command: string;
  direction: FindingDirection;
  file?: string;
  line?: number;
  reason: string;
  suggestion: string;
}

export interface ProtocolAuditSummary {
  error: number;
  warn: number;
  info: number;
  total: number;
}

export interface ProtocolAuditReport {
  summary: ProtocolAuditSummary;
  findings: ProtocolFinding[];
  uncovered: {
    declaredOnly: {
      uiRequests: string[];
      extensionResponses: string[];
    };
    sentOnly: {
      uiRequests: string[];
      extensionResponses: string[];
    };
    receivedOnly: {
      uiRequests: string[];
      extensionResponses: string[];
    };
  };
  stats: {
    uiSentCount: number;
    uiReceivedCount: number;
    extensionSentCount: number;
    extensionReceivedCount: number;
    unknownStringCount: number;
    scannedFiles: number;
    skippedFiles: number;
  };
}

export interface ProtocolAuditAllowlist {
  legacyCommands: string[];
  fileScopedIgnores: Array<{
    file: string;
    commands: string[];
    reason?: string;
  }>;
  temporaryWaivers: Array<{
    command: string;
    reason: string;
    expiresAt: string;
  }>;
}

interface EnumEntry {
  member: string;
  value: string;
  file: string;
  line: number;
}

interface MessageCatalog {
  uiRequestByMember: Map<string, EnumEntry>;
  uiRequestByValue: Map<string, EnumEntry>;
  extensionResponseByMember: Map<string, EnumEntry>;
  extensionResponseByValue: Map<string, EnumEntry>;
  allMessageValues: Set<string>;
}

type CommandUsageChannel =
  | "ui-send"
  | "ui-receive"
  | "ext-send"
  | "ext-receive";

interface ResolvedCommandValue {
  command: string | null;
  origin: "string" | "enum" | "identifier" | "unknown";
  enumType?: "UIRequest" | "ExtensionResponse";
  expression: string;
}

interface CommandUsage extends ResolvedCommandValue {
  file: string;
  line: number;
  channel: CommandUsageChannel;
}

interface ScanResult {
  uiSent: CommandUsage[];
  uiReceived: CommandUsage[];
  extSent: CommandUsage[];
  extReceived: CommandUsage[];
  scannedFiles: number;
  skippedFiles: number;
}

export interface RunProtocolAuditOptions {
  workspaceRoot: string;
  allowlistPath?: string;
}

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

const ROOT_SCAN_CONFIG = {
  uiRoots: ["webview-ui/src"],
  extensionRoots: ["src/services/webview", "src/webview"],
};

const BUILTIN_SKIP_PATH_SEGMENTS = [
  "node_modules",
  "dist",
  "out",
  "coverage",
  ".turbo",
  "__tests__",
  "commit-chat",
];

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function isSourceFile(filePath: string): boolean {
  return SOURCE_EXTENSIONS.has(path.extname(filePath));
}

function shouldSkipFile(relativePath: string): boolean {
  const normalized = toPosixPath(relativePath);
  return BUILTIN_SKIP_PATH_SEGMENTS.some((segment) =>
    normalized.includes(`/${segment}/`) ||
    normalized.startsWith(`${segment}/`) ||
    normalized.endsWith(`/${segment}`)
  );
}

function collectSourceFiles(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const files: string[] = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && isSourceFile(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function getNodeLine(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
}

function getPropertyAccessRootText(node: ts.PropertyAccessExpression): string {
  const root = node.expression;
  return ts.isPropertyAccessExpression(root)
    ? `${getPropertyAccessRootText(root)}.${root.name.text}`
    : root.getText();
}

function isCommandReferenceExpression(
  node: ts.Expression,
  commandAliases: Set<string>
): boolean {
  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text === "command";
  }

  if (ts.isElementAccessExpression(node)) {
    return (
      ts.isStringLiteral(node.argumentExpression) &&
      node.argumentExpression.text === "command"
    );
  }

  return ts.isIdentifier(node) && commandAliases.has(node.text);
}

function resolveByEnumMember(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
  catalog: MessageCatalog
): ResolvedCommandValue | null {
  if (ts.isPropertyAccessExpression(expression)) {
    const member = expression.name.text;
    const rootText = getPropertyAccessRootText(expression);

    if (rootText.endsWith("UIRequest")) {
      const entry = catalog.uiRequestByMember.get(member);
      if (entry) {
        return {
          command: entry.value,
          origin: "enum",
          enumType: "UIRequest",
          expression: expression.getText(sourceFile),
        };
      }
    }

    if (rootText.endsWith("ExtensionResponse")) {
      const entry = catalog.extensionResponseByMember.get(member);
      if (entry) {
        return {
          command: entry.value,
          origin: "enum",
          enumType: "ExtensionResponse",
          expression: expression.getText(sourceFile),
        };
      }
    }
  }

  if (ts.isElementAccessExpression(expression)) {
    const rootText = expression.expression.getText(sourceFile);
    const keyNode = expression.argumentExpression;
    if (!keyNode || !ts.isStringLiteral(keyNode)) {
      return null;
    }

    if (rootText.endsWith("UIRequest")) {
      const entry = catalog.uiRequestByMember.get(keyNode.text);
      if (entry) {
        return {
          command: entry.value,
          origin: "enum",
          enumType: "UIRequest",
          expression: expression.getText(sourceFile),
        };
      }
    }

    if (rootText.endsWith("ExtensionResponse")) {
      const entry = catalog.extensionResponseByMember.get(keyNode.text);
      if (entry) {
        return {
          command: entry.value,
          origin: "enum",
          enumType: "ExtensionResponse",
          expression: expression.getText(sourceFile),
        };
      }
    }
  }

  return null;
}

function resolveCommandExpression(
  expression: ts.Expression | undefined,
  sourceFile: ts.SourceFile,
  catalog: MessageCatalog,
  commandValueAliases: Map<string, ResolvedCommandValue>
): ResolvedCommandValue {
  if (!expression) {
    return {
      command: null,
      origin: "unknown",
      expression: "<missing>",
    };
  }

  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    return {
      command: expression.text,
      origin: "string",
      expression: expression.getText(sourceFile),
    };
  }

  if (ts.isParenthesizedExpression(expression)) {
    return resolveCommandExpression(
      expression.expression,
      sourceFile,
      catalog,
      commandValueAliases
    );
  }

  const enumResolved = resolveByEnumMember(expression, sourceFile, catalog);
  if (enumResolved) {
    return enumResolved;
  }

  if (ts.isIdentifier(expression)) {
    const aliased = commandValueAliases.get(expression.text);
    if (aliased) {
      return {
        ...aliased,
        expression: expression.getText(sourceFile),
      };
    }
    return {
      command: null,
      origin: "identifier",
      expression: expression.getText(sourceFile),
    };
  }

  return {
    command: null,
    origin: "unknown",
    expression: expression.getText(sourceFile),
  };
}

function collectCommandAliasesAndValues(
  sourceFile: ts.SourceFile,
  catalog: MessageCatalog
): {
  commandAliases: Set<string>;
  commandValueAliases: Map<string, ResolvedCommandValue>;
} {
  const commandAliases = new Set<string>(["command"]);
  const commandValueAliases = new Map<string, ResolvedCommandValue>();

  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node)) {
      if (ts.isObjectBindingPattern(node.name)) {
        for (const element of node.name.elements) {
          const propertyName = element.propertyName
            ? element.propertyName.getText(sourceFile)
            : element.name.getText(sourceFile);
          if (propertyName === "command" && ts.isIdentifier(element.name)) {
            commandAliases.add(element.name.text);
          }
        }
      }

      if (ts.isIdentifier(node.name) && node.initializer) {
        if (isCommandReferenceExpression(node.initializer, commandAliases)) {
          commandAliases.add(node.name.text);
        } else {
          const resolved = resolveCommandExpression(
            node.initializer,
            sourceFile,
            catalog,
            commandValueAliases
          );
          if (resolved.command) {
            commandValueAliases.set(node.name.text, resolved);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);
  return { commandAliases, commandValueAliases };
}

function pushUsage(
  usages: CommandUsage[],
  dedupe: Set<string>,
  usage: CommandUsage
): void {
  const key = [
    usage.channel,
    usage.command ?? usage.expression,
    usage.file,
    usage.line,
    usage.origin,
  ].join("|");
  if (dedupe.has(key)) {
    return;
  }
  dedupe.add(key);
  usages.push(usage);
}

function scanFileForUsages(
  filePath: string,
  workspaceRoot: string,
  catalog: MessageCatalog
): CommandUsage[] {
  const code = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const relative = toPosixPath(path.relative(workspaceRoot, filePath));
  const isUIFile = relative.startsWith("webview-ui/src/");
  const isExtensionFile =
    relative.startsWith("src/services/webview/") ||
    relative.startsWith("src/webview/");

  if (!isUIFile && !isExtensionFile) {
    return [];
  }

  const { commandAliases, commandValueAliases } = collectCommandAliasesAndValues(
    sourceFile,
    catalog
  );
  const usages: CommandUsage[] = [];
  const dedupe = new Set<string>();

  const addUsageFromExpression = (
    expr: ts.Expression | undefined,
    channel: CommandUsageChannel,
    node: ts.Node
  ) => {
    const resolved = resolveCommandExpression(
      expr,
      sourceFile,
      catalog,
      commandValueAliases
    );
    pushUsage(usages, dedupe, {
      ...resolved,
      file: filePath,
      line: getNodeLine(sourceFile, node),
      channel,
    });
  };

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression)) {
        if (node.expression.text === "postMessage") {
          if (isUIFile && node.arguments.length >= 1) {
            addUsageFromExpression(node.arguments[0], "ui-send", node);
          } else if (isExtensionFile && node.arguments.length >= 2) {
            addUsageFromExpression(node.arguments[1], "ext-send", node);
          }
        }

        if (
          isUIFile &&
          node.expression.text === "useVSCodeMessage" &&
          node.arguments.length >= 1
        ) {
          addUsageFromExpression(node.arguments[0], "ui-receive", node);
        }
      }

      if (
        isExtensionFile &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "postMessage" &&
        node.arguments.length >= 1
      ) {
        const firstArg = node.arguments[0];
        if (ts.isObjectLiteralExpression(firstArg)) {
          for (const prop of firstArg.properties) {
            if (
              ts.isPropertyAssignment(prop) &&
              ((ts.isIdentifier(prop.name) && prop.name.text === "command") ||
                (ts.isStringLiteral(prop.name) &&
                  prop.name.text === "command"))
            ) {
              addUsageFromExpression(prop.initializer, "ext-send", prop);
            }
          }
        }
      }
    }

    if (ts.isSwitchStatement(node)) {
      const channel: CommandUsageChannel | null = isUIFile
        ? "ui-receive"
        : isExtensionFile
          ? "ext-receive"
          : null;

      if (
        channel &&
        isCommandReferenceExpression(node.expression, commandAliases)
      ) {
        for (const clause of node.caseBlock.clauses) {
          if (ts.isCaseClause(clause)) {
            addUsageFromExpression(clause.expression, channel, clause);
          }
        }
      }
    }

    if (
      ts.isBinaryExpression(node) &&
      (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken)
    ) {
      const channel: CommandUsageChannel | null = isUIFile
        ? "ui-receive"
        : isExtensionFile
          ? "ext-receive"
          : null;

      if (!channel) {
        ts.forEachChild(node, visit);
        return;
      }

      const leftIsCommandRef = isCommandReferenceExpression(
        node.left,
        commandAliases
      );
      const rightIsCommandRef = isCommandReferenceExpression(
        node.right,
        commandAliases
      );

      if (leftIsCommandRef && !rightIsCommandRef) {
        addUsageFromExpression(node.right, channel, node);
      } else if (rightIsCommandRef && !leftIsCommandRef) {
        addUsageFromExpression(node.left, channel, node);
      }
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);
  return usages;
}

export function loadProtocolAuditAllowlist(
  allowlistPath: string | undefined,
  workspaceRoot: string
): ProtocolAuditAllowlist {
  const defaultAllowlistPath = path.join(
    workspaceRoot,
    "src/scripts/protocol-audit.allowlist.json"
  );
  const targetPath = allowlistPath
    ? path.resolve(allowlistPath)
    : defaultAllowlistPath;

  if (!fs.existsSync(targetPath)) {
    return {
      legacyCommands: [],
      fileScopedIgnores: [],
      temporaryWaivers: [],
    };
  }

  const parsed = JSON.parse(fs.readFileSync(targetPath, "utf8")) as Partial<
    ProtocolAuditAllowlist
  >;
  return {
    legacyCommands: parsed.legacyCommands ?? [],
    fileScopedIgnores: parsed.fileScopedIgnores ?? [],
    temporaryWaivers: parsed.temporaryWaivers ?? [],
  };
}

function isCommandAllowlisted(
  command: string,
  file: string,
  workspaceRoot: string,
  allowlist: ProtocolAuditAllowlist,
  now: Date
): { allowed: boolean; reason?: string; expired?: boolean } {
  if (allowlist.legacyCommands.includes(command)) {
    return { allowed: true, reason: "legacyCommands" };
  }

  const relativeFile = toPosixPath(path.relative(workspaceRoot, file));
  const fileScoped = allowlist.fileScopedIgnores.find(
    (entry) =>
      toPosixPath(entry.file) === relativeFile && entry.commands.includes(command)
  );
  if (fileScoped) {
    return {
      allowed: true,
      reason: fileScoped.reason ?? "fileScopedIgnores",
    };
  }

  const waiver = allowlist.temporaryWaivers.find(
    (entry) => entry.command === command
  );
  if (!waiver) {
    return { allowed: false };
  }

  const expiresAt = new Date(waiver.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt < now) {
    return { allowed: false, expired: true, reason: waiver.reason };
  }

  return { allowed: true, reason: `temporaryWaivers(${waiver.reason})` };
}

export function extractMessageCatalog(messagesFilePath: string): MessageCatalog {
  const code = fs.readFileSync(messagesFilePath, "utf8");
  const sourceFile = ts.createSourceFile(
    messagesFilePath,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  const uiRequestByMember = new Map<string, EnumEntry>();
  const uiRequestByValue = new Map<string, EnumEntry>();
  const extensionResponseByMember = new Map<string, EnumEntry>();
  const extensionResponseByValue = new Map<string, EnumEntry>();

  const registerEnum = (
    node: ts.EnumDeclaration,
    targetByMember: Map<string, EnumEntry>,
    targetByValue: Map<string, EnumEntry>
  ) => {
    for (const member of node.members) {
      if (!member.initializer || !ts.isStringLiteral(member.initializer)) {
        continue;
      }
      const memberName = member.name.getText(sourceFile);
      const entry: EnumEntry = {
        member: memberName,
        value: member.initializer.text,
        file: messagesFilePath,
        line: getNodeLine(sourceFile, member),
      };
      targetByMember.set(memberName, entry);
      targetByValue.set(entry.value, entry);
    }
  };

  for (const statement of sourceFile.statements) {
    if (!ts.isEnumDeclaration(statement)) {
      continue;
    }

    if (statement.name.text === "UIRequest") {
      registerEnum(statement, uiRequestByMember, uiRequestByValue);
    }
    if (statement.name.text === "ExtensionResponse") {
      registerEnum(
        statement,
        extensionResponseByMember,
        extensionResponseByValue
      );
    }
  }

  const allMessageValues = new Set<string>([
    ...uiRequestByValue.keys(),
    ...extensionResponseByValue.keys(),
  ]);

  return {
    uiRequestByMember,
    uiRequestByValue,
    extensionResponseByMember,
    extensionResponseByValue,
    allMessageValues,
  };
}

function scanWorkspace(
  workspaceRoot: string,
  catalog: MessageCatalog
): ScanResult {
  const uiFiles = ROOT_SCAN_CONFIG.uiRoots.flatMap((root) =>
    collectSourceFiles(path.join(workspaceRoot, root))
  );
  const extensionFiles = ROOT_SCAN_CONFIG.extensionRoots.flatMap((root) =>
    collectSourceFiles(path.join(workspaceRoot, root))
  );
  const allFiles = [...uiFiles, ...extensionFiles];

  const uiSent: CommandUsage[] = [];
  const uiReceived: CommandUsage[] = [];
  const extSent: CommandUsage[] = [];
  const extReceived: CommandUsage[] = [];
  let scannedFiles = 0;
  let skippedFiles = 0;

  for (const filePath of allFiles) {
    const relative = toPosixPath(path.relative(workspaceRoot, filePath));
    if (shouldSkipFile(relative)) {
      skippedFiles += 1;
      continue;
    }

    scannedFiles += 1;
    const usages = scanFileForUsages(filePath, workspaceRoot, catalog);
    for (const usage of usages) {
      switch (usage.channel) {
        case "ui-send":
          uiSent.push(usage);
          break;
        case "ui-receive":
          uiReceived.push(usage);
          break;
        case "ext-send":
          extSent.push(usage);
          break;
        case "ext-receive":
          extReceived.push(usage);
          break;
      }
    }
  }

  return {
    uiSent,
    uiReceived,
    extSent,
    extReceived,
    scannedFiles,
    skippedFiles,
  };
}

function toSet(values: Iterable<string>): Set<string> {
  return new Set(values);
}

function sorted(values: Iterable<string>): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function buildSummary(findings: ProtocolFinding[]): ProtocolAuditSummary {
  const summary = {
    error: 0,
    warn: 0,
    info: 0,
    total: findings.length,
  };

  for (const finding of findings) {
    if (finding.level === "ERROR") summary.error += 1;
    if (finding.level === "WARN") summary.warn += 1;
    if (finding.level === "INFO") summary.info += 1;
  }

  return summary;
}

export function runProtocolAudit(
  options: RunProtocolAuditOptions
): ProtocolAuditReport {
  const workspaceRoot = path.resolve(options.workspaceRoot);
  const messagesPath = path.join(workspaceRoot, "shared/types/messages.ts");
  if (!fs.existsSync(messagesPath)) {
    throw new Error(`messages.ts not found: ${messagesPath}`);
  }

  const catalog = extractMessageCatalog(messagesPath);
  const allowlist = loadProtocolAuditAllowlist(
    options.allowlistPath,
    workspaceRoot
  );
  const scanResult = scanWorkspace(workspaceRoot, catalog);
  const findings: ProtocolFinding[] = [];
  const now = new Date();

  const allUsages = [
    ...scanResult.uiSent,
    ...scanResult.uiReceived,
    ...scanResult.extSent,
    ...scanResult.extReceived,
  ];

  const unknownStringUsages = allUsages.filter(
    (usage) =>
      usage.origin === "string" &&
      usage.command &&
      !catalog.allMessageValues.has(usage.command)
  );

  const expiredWaiversAdded = new Set<string>();
  for (const usage of unknownStringUsages) {
    const command = usage.command!;
    const allow = isCommandAllowlisted(
      command,
      usage.file,
      workspaceRoot,
      allowlist,
      now
    );

    if (allow.allowed) {
      findings.push({
        level: "INFO",
        type: "legacy-allowlisted-command",
        command,
        direction:
          usage.channel === "ui-send" || usage.channel === "ext-receive"
            ? "ui->extension"
            : "extension->ui",
        file: usage.file,
        line: usage.line,
        reason: `Legacy command is allowlisted via ${allow.reason}.`,
        suggestion:
          "Replace with UIRequest/ExtensionResponse enum command and remove allowlist entry when migration finishes.",
      });
      continue;
    }

    if (allow.expired) {
      const waiverKey = `${command}`;
      if (!expiredWaiversAdded.has(waiverKey)) {
        expiredWaiversAdded.add(waiverKey);
        findings.push({
          level: "WARN",
          type: "expired-waiver",
          command,
          direction: "declaration",
          file: usage.file,
          line: usage.line,
          reason: "Temporary waiver has expired and no longer suppresses this command.",
          suggestion:
            "Remove the waiver entry or complete migration to enum-based protocol command.",
        });
      }
    }

    findings.push({
      level: "ERROR",
      type: "unknown-string-command",
      command,
      direction:
        usage.channel === "ui-send" || usage.channel === "ext-receive"
          ? "ui->extension"
          : "extension->ui",
      file: usage.file,
      line: usage.line,
      reason:
        "String command is not declared in UIRequest/ExtensionResponse and is not allowlisted.",
      suggestion:
        "Use shared enum command or add a time-bounded allowlist entry with migration owner.",
    });
  }

  const uiSentUIRequest = toSet(
    scanResult.uiSent
      .filter((usage) => usage.command && catalog.uiRequestByValue.has(usage.command))
      .map((usage) => usage.command!)
  );
  const extReceivedUIRequest = toSet(
    scanResult.extReceived
      .filter((usage) => usage.command && catalog.uiRequestByValue.has(usage.command))
      .map((usage) => usage.command!)
  );
  const extSentExtensionResponse = toSet(
    scanResult.extSent
      .filter(
        (usage) => usage.command && catalog.extensionResponseByValue.has(usage.command)
      )
      .map((usage) => usage.command!)
  );
  const uiReceivedExtensionResponse = toSet(
    scanResult.uiReceived
      .filter(
        (usage) => usage.command && catalog.extensionResponseByValue.has(usage.command)
      )
      .map((usage) => usage.command!)
  );

  const declaredUIRequest = toSet(catalog.uiRequestByValue.keys());
  const declaredExtensionResponse = toSet(
    catalog.extensionResponseByValue.keys()
  );

  const uiRequestSentOnly = sorted(
    [...uiSentUIRequest].filter((command) => !extReceivedUIRequest.has(command))
  );
  const extensionResponseReceivedOnly = sorted(
    [...uiReceivedExtensionResponse].filter(
      (command) => !extSentExtensionResponse.has(command)
    )
  );
  const uiRequestDeclaredOnly = sorted(
    [...declaredUIRequest].filter((command) => !uiSentUIRequest.has(command))
  );
  const extensionResponseSentOnly = sorted(
    [...extSentExtensionResponse].filter(
      (command) => !uiReceivedExtensionResponse.has(command)
    )
  );

  for (const command of uiRequestSentOnly) {
    const sample = scanResult.uiSent.find((usage) => usage.command === command);
    findings.push({
      level: "ERROR",
      type: "missing-extension-receiver",
      command,
      direction: "ui->extension",
      file: sample?.file,
      line: sample?.line,
      reason: "UI sends this UIRequest command, but extension side does not receive it.",
      suggestion:
        "Add extension handler route for this UIRequest or stop sending this command.",
    });
  }

  for (const command of extensionResponseReceivedOnly) {
    const sample = scanResult.uiReceived.find(
      (usage) => usage.command === command
    );
    findings.push({
      level: "ERROR",
      type: "missing-extension-sender",
      command,
      direction: "extension->ui",
      file: sample?.file,
      line: sample?.line,
      reason: "UI expects this ExtensionResponse command, but extension side does not send it.",
      suggestion:
        "Emit this ExtensionResponse in extension flow or remove stale UI receiver.",
    });
  }

  for (const command of uiRequestDeclaredOnly) {
    const declared = catalog.uiRequestByValue.get(command);
    findings.push({
      level: "WARN",
      type: "unused-ui-request",
      command,
      direction: "declaration",
      file: declared?.file,
      line: declared?.line,
      reason: "UIRequest enum command is declared but never sent by UI.",
      suggestion:
        "Remove dead enum entry or implement the corresponding UI sender.",
    });
  }

  for (const command of extensionResponseSentOnly) {
    const sample = scanResult.extSent.find((usage) => usage.command === command);
    findings.push({
      level: "WARN",
      type: "unused-extension-response",
      command,
      direction: "extension->ui",
      file: sample?.file,
      line: sample?.line,
      reason: "Extension sends this response, but UI does not listen for it.",
      suggestion:
        "Add UI receiver for this response or remove stale extension emitter.",
    });
  }

  const uncovered = {
    declaredOnly: {
      uiRequests: uiRequestDeclaredOnly,
      extensionResponses: sorted(
        [...declaredExtensionResponse].filter(
          (command) => !extSentExtensionResponse.has(command)
        )
      ),
    },
    sentOnly: {
      uiRequests: uiRequestSentOnly,
      extensionResponses: extensionResponseSentOnly,
    },
    receivedOnly: {
      uiRequests: sorted(
        [...extReceivedUIRequest].filter((command) => !uiSentUIRequest.has(command))
      ),
      extensionResponses: extensionResponseReceivedOnly,
    },
  };

  findings.sort((a, b) => {
    const levelOrder: Record<FindingLevel, number> = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
    };
    if (levelOrder[a.level] !== levelOrder[b.level]) {
      return levelOrder[a.level] - levelOrder[b.level];
    }
    if (a.command !== b.command) {
      return a.command.localeCompare(b.command);
    }
    if ((a.file ?? "") !== (b.file ?? "")) {
      return (a.file ?? "").localeCompare(b.file ?? "");
    }
    return (a.line ?? 0) - (b.line ?? 0);
  });

  return {
    summary: buildSummary(findings),
    findings,
    uncovered,
    stats: {
      uiSentCount: scanResult.uiSent.length,
      uiReceivedCount: scanResult.uiReceived.length,
      extensionSentCount: scanResult.extSent.length,
      extensionReceivedCount: scanResult.extReceived.length,
      unknownStringCount: unknownStringUsages.length,
      scannedFiles: scanResult.scannedFiles,
      skippedFiles: scanResult.skippedFiles,
    },
  };
}

export function formatAuditMarkdown(report: ProtocolAuditReport): string {
  const lines: string[] = [];
  lines.push("# Message Protocol Audit Report");
  lines.push("");
  lines.push(
    `Summary: ERROR ${report.summary.error} | WARN ${report.summary.warn} | INFO ${report.summary.info} | TOTAL ${report.summary.total}`
  );
  lines.push("");
  lines.push(
    `Scanned: ${report.stats.scannedFiles} files, skipped: ${report.stats.skippedFiles}`
  );
  lines.push(
    `Usage points: ui-send ${report.stats.uiSentCount}, ui-receive ${report.stats.uiReceivedCount}, extension-send ${report.stats.extensionSentCount}, extension-receive ${report.stats.extensionReceivedCount}`
  );
  lines.push("");

  if (report.findings.length === 0) {
    lines.push("No findings.");
  } else {
    lines.push("## Findings");
    lines.push("");
    for (const finding of report.findings) {
      const location =
        finding.file && finding.line
          ? ` (${finding.file}:${finding.line})`
          : finding.file
            ? ` (${finding.file})`
            : "";
      lines.push(
        `- [${finding.level}] ${finding.type} \`${finding.command}\`${location}`
      );
      lines.push(`  - Reason: ${finding.reason}`);
      lines.push(`  - Suggestion: ${finding.suggestion}`);
    }
  }

  lines.push("");
  lines.push("## Uncovered");
  lines.push("");
  lines.push(
    `- declaredOnly.uiRequests: ${report.uncovered.declaredOnly.uiRequests.length}`
  );
  lines.push(
    `- declaredOnly.extensionResponses: ${report.uncovered.declaredOnly.extensionResponses.length}`
  );
  lines.push(`- sentOnly.uiRequests: ${report.uncovered.sentOnly.uiRequests.length}`);
  lines.push(
    `- sentOnly.extensionResponses: ${report.uncovered.sentOnly.extensionResponses.length}`
  );
  lines.push(
    `- receivedOnly.uiRequests: ${report.uncovered.receivedOnly.uiRequests.length}`
  );
  lines.push(
    `- receivedOnly.extensionResponses: ${report.uncovered.receivedOnly.extensionResponses.length}`
  );

  return lines.join("\n");
}
