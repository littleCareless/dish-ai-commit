import * as path from "path";
import { loadRequiredLanguageParsers, LanguageParser } from "../../core/tree-sitter/languageParser";
import { Logger } from "../logger";

/**
 * 文件变更摘要接口
 */
export interface FileSummary {
  filePath: string;
  changedClasses: string[];
  changedFunctions: Array<{
    name: string;
    signature: string;
  }>;
  changeType: "new" | "modified" | "refactor" | "renamed";
  estimatedTokens: number;
}

/**
 * 变更结构提取器
 * 使用 tree-sitter 从 diff 中提取结构化的变更信息
 */
export class DiffStructureExtractor {
  private static logger = Logger.getInstance("DiffStructureExtractor");

  /**
   * 从 diff 中提取文件的结构化摘要
   * @param diff - 文件的 diff 内容
   * @param filePath - 文件路径
   * @returns 文件变更摘要
   */
  static async extractStructuralSummary(diff: string, filePath: string): Promise<FileSummary> {
    try {
      const language = this.getLanguageFromPath(filePath);
      const parsers = await loadRequiredLanguageParsers([filePath]);
      const parserInfo = parsers[language];

      if (!parserInfo) {
        this.logger.warn(`No parser available for language: ${language}`);
        return this.createFallbackSummary(filePath, diff);
      }

      // 提取变更的结构信息
      const changedStructures = this.extractChangedStructures(
        diff,
        parserInfo.parser,
        language
      );

      return {
        filePath,
        changedClasses: changedStructures.classes.map((c) => c.name),
        changedFunctions: changedStructures.functions.map((f) => ({
          name: f.name,
          signature: f.signature,
        })),
        changeType: this.detectChangeType(diff),
        estimatedTokens: this.calculateEstimatedTokens(changedStructures),
      };
    } catch (error) {
      this.logger.error(
        `Error extracting structural summary for ${filePath}: ${error}`
      );
      return this.createFallbackSummary(filePath, diff);
    }
  }

  /**
   * 从文件路径推断编程语言
   */
  private static getLanguageFromPath(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const extMap: Record<string, string> = {
      ".ts": "typescript",
      ".tsx": "tsx",
      ".js": "javascript",
      ".jsx": "javascript",
      ".py": "python",
      ".java": "java",
      ".cs": "c-sharp",
      ".cpp": "cpp",
      ".c": "c",
      ".go": "go",
      ".rs": "rust",
      ".php": "php",
      ".rb": "ruby",
      ".swift": "swift",
      ".kt": "kotlin",
      ".scala": "scala",
      ".lua": "lua",
      ".elm": "elm",
      ".ocaml": "ocaml",
      ".vue": "vue",
      ".html": "html",
      ".css": "css",
      ".yaml": "yaml",
      ".yml": "yaml",
      ".toml": "toml",
      ".json": "json",
    };
    return extMap[ext] || "typescript";
  }

  /**
   * 提取变更的结构信息
   */
  private static extractChangedStructures(
    diff: string,
    parser: any,
    language: string
  ): {
    classes: Array<{ name: string }>;
    functions: Array<{ name: string; signature: string }>;
  } {
    const classes: Array<{ name: string }> = [];
    const functions: Array<{ name: string; signature: string }> = [];

    try {
      // 解析 diff 内容
      const tree = parser.parse(diff);

      // 根据语言类型执行不同的查询
      const query = this.getLanguageQuery(language);
      if (!query) {
        return { classes, functions };
      }

      const captures = query.captures(tree.rootNode);

      for (const capture of captures) {
        const { name, node } = capture;

        if (name.includes("definition.class")) {
          const className = this.extractNodeName(node);
          if (className) {
            classes.push({ name: className });
          }
        } else if (
          name.includes("definition.function") ||
          name.includes("definition.method")
        ) {
          const functionName = this.extractNodeName(node);
          if (functionName) {
            functions.push({
              name: functionName,
              signature: this.extractFunctionSignature(node),
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Error parsing diff with tree-sitter: ${error}`);
    }

    return { classes, functions };
  }

  /**
   * 获取语言的查询规则
   */
  private static getLanguageQuery(language: string): any {
    try {
      const queryMap: Record<string, string> = {
        typescript: `
          (class_declaration name: (type_identifier) @name.definition.class) @definition.class
          (function_declaration name: (identifier) @name.definition.function) @definition.function
          (method_definition name: (property_identifier) @name.definition.method) @definition.method
        `,
        javascript: `
          (class name: (identifier) @name.definition.class) @definition.class
          (function_declaration name: (identifier) @name.definition.function) @definition.function
          (method_definition name: (property_identifier) @name.definition.method) @definition.method
        `,
        python: `
          (class_definition name: (identifier) @name.definition.class) @definition.class
          (function_definition name: (identifier) @name.definition.function) @definition.function
        `,
        java: `
          (class_declaration name: (identifier) @name.definition.class) @definition.class
          (method_declaration name: (identifier) @name.definition.method) @definition.method
        `,
      };

      const queryString = queryMap[language];
      if (!queryString) {
        return null;
      }

      // 这里需要实际的 tree-sitter 查询对象
      // 暂时返回 null，后续需要根据实际的 LanguageParser 实现调整
      return null;
    } catch (error) {
      this.logger.warn(
        `Error creating query for language ${language}: ${error}`
      );
      return null;
    }
  }

  /**
   * 提取节点名称
   */
  private static extractNodeName(node: any): string | null {
    try {
      // 遍历子节点寻找标识符
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (
          child.type === "identifier" ||
          child.type === "type_identifier" ||
          child.type === "property_identifier"
        ) {
          return child.text;
        }
        // 递归查找
        const name = this.extractNodeName(child);
        if (name) return name;
      }
    } catch (error) {
      this.logger.warn(`Error extracting node name: ${error}`);
    }
    return null;
  }

  /**
   * 提取函数签名
   */
  private static extractFunctionSignature(node: any): string {
    try {
      // 简化实现：只返回函数名和参数列表的概览
      const name = this.extractNodeName(node);
      if (!name) return "function()";

      // 查找参数列表
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (
          child.type === "formal_parameters" ||
          child.type === "parameter_list"
        ) {
          const paramCount = child.childCount;
          return `function ${name}(${paramCount > 0 ? "...params" : ""})`;
        }
      }

      return `function ${name}()`;
    } catch (error) {
      this.logger.warn(`Error extracting function signature: ${error}`);
      return "function()";
    }
  }

  /**
   * 检测变更类型
   */
  private static detectChangeType(
    diff: string
  ): "new" | "modified" | "refactor" | "renamed" {
    const lines = diff.split("\n");

    // 检查是否为新文件
    if (
      lines.some(
        (line) => line.startsWith("+++ /dev/null") || line.includes("new file")
      )
    ) {
      return "new";
    }

    // 检查是否为重命名
    if (
      lines.some(
        (line) => line.includes("rename") || line.includes("similarity index")
      )
    ) {
      return "renamed";
    }

    // 检查是否为重构（主要通过变更模式判断）
    const addedLines = lines.filter((line) => line.startsWith("+")).length;
    const removedLines = lines.filter((line) => line.startsWith("-")).length;

    // 如果添加和删除的行数接近，可能是重构
    if (
      Math.abs(addedLines - removedLines) <=
      Math.min(addedLines, removedLines) * 0.3
    ) {
      return "refactor";
    }

    return "modified";
  }

  /**
   * 计算预估的 token 数量
   */
  private static calculateEstimatedTokens(structures: {
    classes: any[];
    functions: any[];
  }): number {
    let tokens = 10; // 基础开销

    // 每个类约 5 tokens
    tokens += structures.classes.length * 5;

    // 每个函数约 8 tokens
    tokens += structures.functions.length * 8;

    return Math.min(tokens, 100); // 最大限制为 100 tokens
  }

  /**
   * 创建兜底摘要（当解析失败时）
   */
  private static createFallbackSummary(
    filePath: string,
    diff: string
  ): FileSummary {
    const changeType = this.detectChangeType(diff);
    const lines = diff.split("\n");
    const addedLines = lines.filter((line) => line.startsWith("+")).length;
    const removedLines = lines.filter((line) => line.startsWith("-")).length;

    return {
      filePath,
      changedClasses: [],
      changedFunctions: [],
      changeType,
      estimatedTokens: 20 + Math.min(addedLines + removedLines, 50),
    };
  }
}
