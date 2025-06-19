import { readFile } from "fs/promises";
import { createHash } from "crypto";
import * as path from "path";
import * as treeSitter from "web-tree-sitter"; // For types
import {
  LanguageParser,
  loadRequiredLanguageParsers,
} from "../tree-sitter/languageParser"; // Assuming path
import { scannerExtensions } from "../shared/supported-extensions"; // Assuming path
import {
  MAX_BLOCK_CHARS,
  MIN_BLOCK_CHARS,
  MIN_CHUNK_REMAINDER_CHARS,
  MAX_CHARS_TOLERANCE_FACTOR,
} from "../constants"; // Assuming path

export interface SemanticBlock {
  type: string; // e.g., "function", "class", "interface", "method", "variable", "function_chunk"
  name: string | null; // Name of the entity, or null for anonymous or chunks
  file: string;
  startLine: number;
  endLine: number;
  signature?: string; // For functions, methods
  doc?: string; // From comments
  code: string; // The actual code block
  modulePath: string; // Derived from file path
}

export class CodeIndexer {
  private loadedParsers: LanguageParser = {};
  private pendingLoads: Map<string, Promise<LanguageParser | undefined>> =
    new Map();
  private seenSegmentHashes: Set<string> = new Set<string>(); // For deduplicating chunks across calls if instance is reused

  constructor() {
    // Initialization if needed, e.g., TreeSitter init (often handled by loadRequiredLanguageParsers)
  }

  public async parseFile(
    filePath: string,
    options?: {
      content?: string;
      // fileHash?: string; // Not directly stored in SemanticBlock, but used for parsing if provided
    }
  ): Promise<SemanticBlock[]> {
    this.seenSegmentHashes.clear(); // Clear for each new file parse if instance is long-lived
    const ext = path.extname(filePath).toLowerCase();

    if (!this.isSupportedLanguage(ext.slice(1))) {
      // console.warn(`Unsupported language for file: ${filePath}`);
      return [];
    }

    let fileContent: string;
    // const fileHashString = options?.fileHash; // Not used further unless chunking needs it explicitly

    if (options?.content) {
      fileContent = options.content;
    } else {
      try {
        fileContent = await readFile(filePath, "utf8");
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return [];
      }
    }
    // Not creating fileHash unless specifically needed by a sub-function that CodeParser used it for.
    // SemanticBlock itself doesn't store it.
    return this.parseContent(filePath, fileContent);
  }

  private isSupportedLanguage(extension: string): boolean {
    return scannerExtensions.includes(`.${extension}`); // scannerExtensions usually include the dot
  }

  // createFileHash is not needed if not storing hashes in SemanticBlock or for deduplication logic that requires it.
  // CodeParser used it for CodeBlock.segmentHash and CodeBlock.fileHash.
  // If seenSegmentHashes relies on fileHash, it might be needed.
  // For now, segment hashes in _chunkTextByLines will be based on content and location.

  private deriveModulePath(fp: string): string {
    let derivedPath = fp.startsWith("src/") ? fp.substring(4) : fp;
    // Robustly remove extension
    const ext = path.extname(derivedPath);
    if (ext) {
      derivedPath = derivedPath.substring(0, derivedPath.length - ext.length);
    }
    return derivedPath;
  }

  private getDocumentation(node: treeSitter.SyntaxNode): string | undefined {
    let previousSibling = node.previousNamedSibling;
    if (
      previousSibling &&
      (previousSibling.type === "comment" ||
        previousSibling.type === "line_comment" ||
        previousSibling.type === "block_comment")
    ) {
      return previousSibling.text;
    }
    if (!previousSibling && node.parent) {
      previousSibling = node.parent.previousNamedSibling;
      if (
        previousSibling &&
        (previousSibling.type === "comment" ||
          previousSibling.type === "line_comment" ||
          previousSibling.type === "block_comment")
      ) {
        return previousSibling.text;
      }
    }
    return undefined;
  }

  private extractSignature(
    node: treeSitter.SyntaxNode,
    fileContent: string
  ): string | undefined {
    // Logic from original CodeIndexer, adapted for web-tree-sitter nodes
    if (
      node.type === "function_declaration" ||
      node.type === "method_definition" ||
      node.type === "arrow_function"
    ) {
      const bodyNode = node.childForFieldName("body");
      if (bodyNode) {
        const signatureText = fileContent
          .substring(node.startIndex, bodyNode.startIndex)
          .trim();
        return signatureText.endsWith("{")
          ? signatureText.slice(0, -1).trim()
          : signatureText;
      }
      if (node.type === "arrow_function") {
        const arrowOperator = node.children.find(
          (c: treeSitter.SyntaxNode) => c.type === "=>"
        );
        if (arrowOperator) {
          return fileContent
            .substring(node.startIndex, arrowOperator.startIndex)
            .trim();
        }
      }
      const firstBraceIndex = node.text.indexOf("{");
      if (firstBraceIndex !== -1) {
        return node.text.substring(0, firstBraceIndex).trim();
      }
      return node.text.trim(); // Fallback, might include body
    }
    return undefined;
  }

  private extractName(node: treeSitter.SyntaxNode): string | null {
    let nameNode = node.childForFieldName("name");

    if (
      !nameNode &&
      (node.type === "lexical_declaration" ||
        node.type === "variable_declaration")
    ) {
      // Simplified: take first identifier in first declarator for now
      const declarator =
        node.descendantsOfType("variable_declarator")[0] ||
        node.descendantsOfType("lexical_declaration")[0]; // tree-sitter-go uses lexical_declaration for var
      if (declarator) {
        nameNode =
          declarator.childForFieldName("name") ||
          declarator.descendantsOfType("identifier")[0];
      }
    } else if (!nameNode && node.type === "function_declaration") {
      // e.g. tree-sitter-go
      nameNode = node.descendantsOfType("identifier")[0];
    } else if (!nameNode && node.type === "type_identifier") {
      // For interface names etc. in some grammars
      return node.text;
    }

    if (node.type === "arrow_function") {
      // Check if it's like `const myFunc = () => ...`
      let parent = node.parent;
      if (
        parent &&
        (parent.type === "variable_declarator" ||
          parent.type === "assignment_expression")
      ) {
        const potentialNameNode =
          parent.childForFieldName("name") || parent.childForFieldName("left");
        if (potentialNameNode) return potentialNameNode.text;
      }
      return "anonymous_arrow_function";
    }
    return nameNode?.text || null;
  }

  private mapNodeToSemanticType(
    nodeType: string,
    node: treeSitter.SyntaxNode
  ): string | null {
    // This mapping depends on the tree-sitter grammar and desired SemanticBlock types
    // It should align with what language.query captures.
    // Example, if query captures 'function_declaration' as 'function.definition':
    // if (captureName === 'function.definition') return 'function';
    // For now, direct mapping from common tree-sitter node types:
    switch (nodeType) {
      case "function_declaration":
        return "function";
      case "arrow_function":
        return "function"; // Or 'arrow_function' if distinct type needed
      case "method_definition":
        return "method";
      case "class_declaration":
        return "class";
      case "interface_declaration":
      case "type_alias_declaration": // TS interfaces and types
        return "interface"; // Grouping for simplicity
      case "lexical_declaration": // For const, let
      case "variable_declaration": // For var
        // Check if it's a module-level variable
        if (
          node.parent &&
          (node.parent.type === "program" ||
            node.parent.type === "module" ||
            node.parent.type.endsWith("_file") ||
            node.parent.type === "source_file")
        ) {
          return "variable";
        }
        return null; // Ignore block-scoped variables unless query is specific
      // Add more based on typical query captures for other languages (structs, enums, etc.)
      case "struct_declaration": // Go, C, etc.
      case "enum_declaration":
        return nodeType.split("_")[0]; // 'struct', 'enum'
      default:
        // console.warn(`Unhandled node type for semantic mapping: ${nodeType}`);
        return null;
    }
  }

  private async parseContent(
    filePath: string,
    content: string
  ): Promise<SemanticBlock[]> {
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const modulePath = this.deriveModulePath(filePath);

    if (!this.loadedParsers[ext]) {
      const pendingLoad = this.pendingLoads.get(ext);
      if (pendingLoad) {
        try {
          await pendingLoad;
        } catch (error) {
          console.error(`Error in pending parser load for ${filePath}:`, error);
          return [];
        }
      } else {
        const loadPromise = loadRequiredLanguageParsers([filePath]); // Pass filePath to select correct parser
        this.pendingLoads.set(ext, loadPromise);
        try {
          const newParsers = await loadPromise;
          if (newParsers) {
            this.loadedParsers = { ...this.loadedParsers, ...newParsers };
          }
        } catch (error) {
          console.error(
            `Error loading language parser for ${filePath}:`,
            error
          );
          return [];
        } finally {
          this.pendingLoads.delete(ext);
        }
      }
    }

    const languageInfo = this.loadedParsers[ext];
    if (!languageInfo || !languageInfo.parser || !languageInfo.query) {
      console.warn(
        `No parser or query available for file extension: ${ext} in ${filePath}`
      );
      return [];
    }

    const tree = languageInfo.parser.parse(content);
    const captures = languageInfo.query.captures(tree.rootNode);

    const results: SemanticBlock[] = [];

    if (captures.length === 0) {
      if (content.length >= MIN_BLOCK_CHARS) {
        const fallbackChunks = this._performFallbackChunking(
          filePath,
          content,
          modulePath
        );
        results.push(...fallbackChunks);
      }
      return results;
    }

    for (const capture of captures) {
      const node = capture.node;
      const nodeContent = node.text;
      const nodeTypeString = node.type; // This is the tree-sitter node type

      // The capture.name (e.g., "function.definition", "class.name") from query can also guide type
      // For now, using mapNodeToSemanticType based on node.type
      const semanticType = this.mapNodeToSemanticType(nodeTypeString, node);

      if (!semanticType) {
        // If query captured something we don't map to a SemanticBlock type, skip
        // Or, if mapNodeToSemanticType returns null for non-module level vars etc.
        continue;
      }

      const name = this.extractName(node);
      const doc = this.getDocumentation(node);
      const signature = this.extractSignature(node, content);
      const startLine = node.startPosition.row + 1;
      const endLine = node.endPosition.row + 1;

      // Special handling for variable declarations to get individual variables
      if (
        semanticType === "variable" &&
        (nodeTypeString === "lexical_declaration" ||
          nodeTypeString === "variable_declaration")
      ) {
        const declarators = node.children.filter(
          (child: treeSitter.SyntaxNode) => child.type === "variable_declarator"
        );
        for (const declarator of declarators) {
          const varNameNode = declarator.childForFieldName("name");
          const varName = varNameNode?.text || "unknown_variable";
          const varDoc = this.getDocumentation(declarator.parent!); // Doc is for the whole statement
          // Signature usually not applicable for variables in this context

          if (
            declarator.text.length >
            MAX_BLOCK_CHARS * MAX_CHARS_TOLERANCE_FACTOR
          ) {
            results.push(
              ...this._chunkNodeAsSemanticBlocks(
                declarator,
                filePath,
                modulePath,
                semanticType,
                varName,
                varDoc,
                undefined,
                content,
                startLine
              )
            );
          } else if (declarator.text.length >= MIN_BLOCK_CHARS) {
            results.push({
              type: semanticType, // 'variable'
              name: varName,
              file: filePath,
              startLine: declarator.startPosition.row + 1,
              endLine: declarator.endPosition.row + 1,
              code: declarator.text,
              doc: varDoc,
              signature: undefined,
              modulePath: modulePath,
            });
          }
        }
        continue; // Processed variables, move to next capture
      }

      if (nodeContent.length > MAX_BLOCK_CHARS * MAX_CHARS_TOLERANCE_FACTOR) {
        // Node is too large, chunk it
        results.push(
          ...this._chunkNodeAsSemanticBlocks(
            node,
            filePath,
            modulePath,
            semanticType,
            name,
            doc,
            signature,
            content,
            startLine
          )
        );
      } else if (nodeContent.length >= MIN_BLOCK_CHARS) {
        // Node is of suitable size
        results.push({
          type: semanticType,
          name: name,
          file: filePath,
          startLine: startLine,
          endLine: endLine,
          code: nodeContent,
          doc: doc,
          signature: signature,
          modulePath: modulePath,
        });
      }
      // Else (nodeContent.length < MIN_BLOCK_CHARS):
      // For semantic blocks, we might still want small functions/classes.
      // The MIN_BLOCK_CHARS check is more for preventing tiny, noisy chunks.
      // If a valid semantic structure is small, we should probably keep it.
      // Let's include them if they are valid semantic types.
      // The check above `nodeContent.length >= MIN_BLOCK_CHARS` handles this.
      // If we want to include even smaller, remove that condition or lower MIN_BLOCK_CHARS.
    }
    return results;
  }

  private _chunkTextByLines(
    lines: string[],
    filePath: string,
    modulePath: string,
    baseSemanticType: string, // e.g., "function_chunk", "fallback_chunk"
    // seenSegmentHashes: Set<string>, // Already a class member: this.seenSegmentHashes
    baseStartLine: number = 1,
    originalName: string | null = null,
    originalDoc?: string,
    originalSignature?: string
  ): SemanticBlock[] {
    const chunks: SemanticBlock[] = [];
    let currentChunkLines: string[] = [];
    let currentChunkLength = 0;
    let chunkStartLineIndex = 0; // 0-based index within the `lines` array
    const effectiveMaxChars = MAX_BLOCK_CHARS * MAX_CHARS_TOLERANCE_FACTOR;

    const finalizeChunk = (
      endLineIndex: number,
      isLastOverallChunk: boolean = false
    ) => {
      if (
        currentChunkLines.length > 0 &&
        (currentChunkLength >= MIN_BLOCK_CHARS ||
          (isLastOverallChunk && currentChunkLength > 0))
      ) {
        const chunkContent = currentChunkLines.join("\n");
        const startLine = baseStartLine + chunkStartLineIndex;
        const endLine = baseStartLine + endLineIndex; // endLineIndex is 0-based relative to `lines`

        // Create a unique hash for the segment to avoid duplicates if this method is called multiple times
        // for overlapping content or identical chunks.
        const segmentIdentifier = `${filePath}-${startLine}-${endLine}-${chunkContent.substring(
          0,
          50
        )}`; // Use part of content for hash
        const segmentHash = createHash("sha256")
          .update(segmentIdentifier)
          .digest("hex");

        if (!this.seenSegmentHashes.has(segmentHash)) {
          this.seenSegmentHashes.add(segmentHash);
          chunks.push({
            file: filePath,
            // Name for chunks can be like "originalName_partX" or null
            name: originalName
              ? `${originalName} (part ${chunks.length + 1})`
              : null,
            type: baseSemanticType,
            startLine: startLine, // Corrected from start_line
            endLine: endLine, // Corrected from end_line
            // content: chunkContent, // Redundant, use 'code'
            doc: chunks.length === 0 ? originalDoc : undefined, // Doc only for the first chunk
            signature: chunks.length === 0 ? originalSignature : undefined, // Signature only for the first chunk
            modulePath: modulePath,
            code: chunkContent,
          });
        }
      }
      currentChunkLines = [];
      currentChunkLength = 0;
      chunkStartLineIndex = endLineIndex + 1;
    };

    const createSegmentBlockForOversizedLine = (
      segment: string,
      originalLineNumberInFile: number,
      segmentIndex: number
    ) => {
      const segmentIdentifier = `${filePath}-${originalLineNumberInFile}-${segmentIndex}-${segment.substring(
        0,
        50
      )}`;
      const segmentHash = createHash("sha256")
        .update(segmentIdentifier)
        .digest("hex");

      if (!this.seenSegmentHashes.has(segmentHash)) {
        this.seenSegmentHashes.add(segmentHash);
        chunks.push({
          file: filePath,
          name: originalName
            ? `${originalName} (line ${originalLineNumberInFile} segment ${
                segmentIndex + 1
              })`
            : `(line ${originalLineNumberInFile} segment ${segmentIndex + 1})`,
          type: `${baseSemanticType}_line_segment`,
          startLine: originalLineNumberInFile, // Corrected from start_line
          endLine: originalLineNumberInFile, // Corrected from end_line
          // content: segment, // Redundant, use 'code'
          doc: undefined, // Doc/Signature usually not for sub-line segments
          signature: undefined,
          modulePath: modulePath,
          code: segment,
        });
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLengthWithNewline =
        line.length + (i < lines.length - 1 ? 1 : 0); // +1 for newline
      const absoluteLineNumber = baseStartLine + i;

      if (line.length > effectiveMaxChars) {
        // Single line is too long
        if (currentChunkLines.length > 0) {
          finalizeChunk(i - 1);
        }
        let remainingLineContent = line;
        let segmentIdx = 0;
        while (remainingLineContent.length > 0) {
          const segment = remainingLineContent.substring(0, MAX_BLOCK_CHARS); // Use MAX_BLOCK_CHARS for segments
          createSegmentBlockForOversizedLine(
            segment,
            absoluteLineNumber,
            segmentIdx++
          );
          remainingLineContent =
            remainingLineContent.substring(MAX_BLOCK_CHARS);
        }
        chunkStartLineIndex = i + 1; // Next chunk starts after this oversized line
        continue;
      }

      if (
        currentChunkLength > 0 &&
        currentChunkLength + lineLengthWithNewline > effectiveMaxChars
      ) {
        // Current chunk + this line would exceed max. Try to rebalance.
        const remainingLines = lines.slice(i);
        const remainingLength = remainingLines.join("\n").length;

        if (
          currentChunkLength >= MIN_BLOCK_CHARS &&
          remainingLength < MIN_CHUNK_REMAINDER_CHARS &&
          currentChunkLines.length > 1 &&
          i > chunkStartLineIndex
        ) {
          // Try to move the last line of the current chunk to the next one if it helps balance
          // This is a simplified re-balancing. CodeParser's was more complex.
          // For now, just finalize the current chunk as is.
          finalizeChunk(i - 1);
          // Fall through to add current line to new chunk
        } else {
          finalizeChunk(i - 1);
          // Fall through to add current line to new chunk
        }
      }
      // Add current line to chunk
      currentChunkLines.push(line);
      currentChunkLength += lineLengthWithNewline;
    }

    // Finalize any remaining chunk
    if (currentChunkLines.length > 0) {
      finalizeChunk(lines.length - 1, true);
    }
    return chunks;
  }

  private _performFallbackChunking(
    filePath: string,
    content: string,
    modulePath: string
  ): SemanticBlock[] {
    const lines = content.split("\n");
    // For fallback, originalName, doc, signature are not applicable.
    return this._chunkTextByLines(
      lines,
      filePath,
      modulePath,
      "fallback_chunk",
      1,
      null,
      undefined,
      undefined
    );
  }

  private _chunkNodeAsSemanticBlocks(
    node: treeSitter.SyntaxNode,
    filePath: string,
    modulePath: string,
    semanticType: string, // Original semantic type of the node
    name: string | null,
    doc: string | undefined,
    signature: string | undefined,
    fullFileContent: string, // For context if needed, though node.text is primary
    nodeStartLineInFile: number
  ): SemanticBlock[] {
    const lines = node.text.split("\n");
    const chunkBaseType = `${semanticType}_chunk`; // e.g., "function_chunk"
    return this._chunkTextByLines(
      lines,
      filePath,
      modulePath,
      chunkBaseType,
      nodeStartLineInFile, // baseStartLine for _chunkTextByLines
      name,
      doc,
      signature
    );
  }
}

// Export a singleton instance for convenience, if desired by the project structure
// export const codeIndexer = new CodeIndexer();
