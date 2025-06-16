import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import TypeScript from 'tree-sitter-typescript';
import Python from 'tree-sitter-python';
import Go from 'tree-sitter-go';
import Java from 'tree-sitter-java';
import CSharp from 'tree-sitter-c-sharp';

export interface SemanticBlock { // Added export
  type: string; // e.g., "function", "class", "interface", "method", "variable"
  name: string;
  file: string;
  startLine: number;
  endLine: number;
  signature?: string; // For functions, methods
  doc?: string; // From comments
  code: string; // The actual code block
  modulePath: string; // Derived from file path, e.g., "auth/utils" from "src/auth/utils.ts"
}

export class CodeIndexer {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  public async parseFile(filePath: string, fileContent: string): Promise<SemanticBlock[]> {
    const language = this.getLanguageParser(filePath);
    if (!language) {
      console.warn(`Unsupported file type for: ${filePath}`);
      return [];
    }

    this.parser.setLanguage(language);
    const tree = this.parser.parse(fileContent);
    const rootNode = tree.rootNode;

    return this.extractSemanticBlocksRecursive(rootNode, filePath, fileContent);
  }

  private getLanguageParser(filePath: string): Parser.Language | undefined {
    const extension = filePath.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
        return JavaScript as unknown as Parser.Language;
      case 'ts':
      case 'tsx':
        return TypeScript.typescript as unknown as Parser.Language; // tree-sitter-typescript exports 'typescript' and 'tsx'
      case 'py':
        return Python as unknown as Parser.Language;
      case 'go':
        return Go as unknown as Parser.Language;
      case 'java':
        return Java as unknown as Parser.Language;
      case 'cs':
        return CSharp as unknown as Parser.Language;
      default:
        return undefined;
    }
  }

  // Placeholder for actual extraction logic
  // This will be a complex part involving traversing the AST
  // and identifying different types of nodes (functions, classes, etc.)
  private extractSemanticBlocksRecursive(node: Parser.SyntaxNode, filePath: string, fileContent: string): SemanticBlock[] {
    const blocks: SemanticBlock[] = [];

    const deriveModulePath = (fp: string): string => {
      // Remove common prefixes like src/ and file extensions
      let path = fp.startsWith('src/') ? fp.substring(4) : fp;
      path = path.replace(/\.(ts|tsx|js|jsx|py|go|java|cs)$/i, '');
      return path;
    };
    const modulePath = deriveModulePath(filePath);

    // Helper to get comments before a node
    const getDocumentation = (node: Parser.SyntaxNode): string | undefined => {
      let previousSibling = node.previousNamedSibling;
      if (previousSibling && (previousSibling.type === 'comment' || previousSibling.type === 'line_comment' || previousSibling.type === 'block_comment')) {
        // For some languages, comments might be multi-line and need to be concatenated
        // For simplicity, we'll take the text of the last comment node before the declaration.
        // More sophisticated logic might be needed to capture multi-line docstrings correctly.
        return previousSibling.text;
      }
      // Check for comments attached to the parent if the node is the first child, e.g. export function ...
      if (!previousSibling && node.parent) {
        previousSibling = node.parent.previousNamedSibling;
        if (previousSibling && (previousSibling.type === 'comment' || previousSibling.type === 'line_comment' || previousSibling.type === 'block_comment')) {
             return previousSibling.text;
        }
      }
      return undefined;
    };

    const nodeType = node.type;
    let currentBlock: Partial<SemanticBlock> = {};

    if (nodeType === 'function_declaration' || nodeType === 'arrow_function' || nodeType === 'method_definition') {
      const nameNode = node.childForFieldName('name') || (nodeType === 'arrow_function' ? node.descendantsOfType('identifier')[0] : undefined);
      const name = nameNode?.text || 'anonymous';
      
      currentBlock = {
        type: nodeType === 'method_definition' ? 'method' : 'function',
        name: name,
        file: filePath,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        code: node.text,
        doc: getDocumentation(node),
        signature: this.extractSignature(node, fileContent),
        modulePath: modulePath,
      };
      blocks.push(currentBlock as SemanticBlock);
    } else if (nodeType === 'class_declaration') {
      const nameNode = node.childForFieldName('name');
      currentBlock = {
        type: 'class',
        name: nameNode?.text || 'anonymousClass',
        file: filePath,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        code: node.text,
        doc: getDocumentation(node),
        modulePath: modulePath,
      };
      blocks.push(currentBlock as SemanticBlock);
    } else if (nodeType === 'interface_declaration') {
        const nameNode = node.childForFieldName('name');
        currentBlock = {
            type: 'interface',
            name: nameNode?.text || 'anonymousInterface',
            file: filePath,
            startLine: node.startPosition.row + 1,
            endLine: node.endPosition.row + 1,
            code: node.text,
            doc: getDocumentation(node),
            modulePath: modulePath,
        };
        blocks.push(currentBlock as SemanticBlock);
    } else if (nodeType === 'lexical_declaration' || nodeType === 'variable_declaration') {
        // Handling module-level variables.
        // Check if the parent is the root of the file (program or module) or a common file suffix.
        if (node.parent && (node.parent.type === 'program' || node.parent.type === 'module' || node.parent.type.endsWith('_file') || node.parent.type === 'source_file')) {
            // Both lexical_declaration (let, const) and variable_declaration (var)
            // contain 'variable_declarator' children in many grammars (e.g., JS/TS).
            const declarators = node.children.filter(child => child.type === 'variable_declarator');

            for (const declarator of declarators) {
                const nameNode = declarator.childForFieldName('name'); // For 'identifier'
                // For array/object destructuring, nameNode might be 'array_pattern' or 'object_pattern'.
                // We'll simplify and take the text of the pattern for now, or the first identifier.
                let name = 'unknown_variable';
                if (nameNode) {
                    if (nameNode.type === 'identifier') {
                        name = nameNode.text;
                    } else if (nameNode.type === 'array_pattern' || nameNode.type === 'object_pattern') {
                        name = nameNode.text; // This will be the full pattern like "[a,b]" or "{c,d}"
                        // Optionally, extract individual variables from destructuring if needed later.
                    }
                }


                if (name) {
                    blocks.push({
                        type: 'variable',
                        name: name,
                        file: filePath,
                        startLine: declarator.startPosition.row + 1,
                        endLine: declarator.endPosition.row + 1,
                        code: declarator.text,
                        doc: getDocumentation(node), // Documentation is for the whole declaration statement
                        modulePath: modulePath,
                    });
                }
            }
        }
    }


    for (const child of node.namedChildren) {
      blocks.push(...this.extractSemanticBlocksRecursive(child, filePath, fileContent));
    }
    return blocks;
  }

  private extractSignature(node: Parser.SyntaxNode, fileContent: string): string | undefined {
    if (node.type === 'function_declaration' || node.type === 'method_definition' || node.type === 'arrow_function') {
      const bodyNode = node.childForFieldName('body');
      if (bodyNode) {
        // Use startIndex from the original node and bodyNode to get the precise substring from fileContent
        const signatureText = fileContent.substring(node.startIndex, bodyNode.startIndex).trim();
        // Remove trailing '{' if it's part of the substring (can happen if bodyNode.startIndex is right after '{')
        if (signatureText.endsWith('{')) {
          return signatureText.slice(0, -1).trim();
        }
        return signatureText;
      }
      // Fallback for functions/methods without a clear body node identified by 'body' field name,
      // or for arrow functions where the body might not be a block.
      // Example: const x = () => y; (body is 'y')
      // In such cases, the entire node text might be too much (includes body).
      // A more robust solution would involve checking for '=>' in arrow functions
      // or specific parameter list nodes.
      // For now, if no body field, try to find '=>' for arrow functions.
      // This block is entered if bodyNode (from childForFieldName('body')) was null.
      if (node.type === 'arrow_function') {
        const arrowOperator = node.children.find(c => c.type === '=>');
        if (arrowOperator) {
            // The signature is from the start of the arrow function node
            // to the start of the '=>' token.
            return fileContent.substring(node.startIndex, arrowOperator.startIndex).trim();
        }
      }
      // Generic fallback: text up to the first '{' if present, or the whole text.
      // This is very heuristic.
      const firstBraceIndex = node.text.indexOf('{');
      if (firstBraceIndex !== -1) {
        return node.text.substring(0, firstBraceIndex).trim();
      }
      return node.text.trim(); // Could be the full code block if no '{'
    }
    return undefined;
  }
}