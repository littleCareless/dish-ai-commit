# Core 模块 - 核心基础设施

## 📋 概述

Core 模块是 Dish AI Commit Gen 的基础层，提供代码索引、语义分析、向量存储和基础工具。模块采用 **Tree-sitter** 进行代码解析，支持 **20+ 编程语言**，并使用 **Qdrant** 作为向量数据库。

### 核心价值

- ✅ **代码索引**: 基于语义的代码块提取和向量化
- ✅ **多语言支持**: 20+ 编程语言，通过 Tree-sitter WASM 实现
- ✅ **向量存储**: Qdrant 集成，支持语义搜索
- ✅ **智能分块**: 基于语义的代码分块，而非简单的行数分块
- ✅ **多仓库支持**: 支持单仓库和多仓库索引模式
- ✅ **性能优化**: 延迟加载、增量索引、缓存优化

## 🏗️ 架构设计

### 核心组件

```
Core Module
├── indexing/                      # 代码索引系统
│   ├── embedding-service.ts       # 嵌入服务 (300+行) ⭐
│   ├── embedding-service-manager.ts  # 服务管理器 (500行) ⭐
│   ├── code-indexer.ts            # 代码索引器 (200+行)
│   ├── vector-store.ts            # 向量存储 (150行)
│   ├── file-scanner.ts            # 文件扫描器
│   └── embedding-model-profiles.ts # 模型配置
│
├── tree-sitter/                   # 代码解析器
│   ├── languageParser.ts          # 语言解析器管理
│   ├── markdownParser.ts          # Markdown 解析器
│   └── queries/                   # 语言查询 (20+语言)
│       ├── javascript.ts          # JavaScript 查询
│       ├── typescript.ts          # TypeScript 查询
│       ├── python.ts              # Python 查询
│       ├── java.ts                # Java 查询
│       ├── go.ts                  # Go 查询
│       ├── rust.ts                # Rust 查询
│       ├── cpp.ts                 # C++ 查询
│       ├── c.ts                   # C 查询
│       ├── c-sharp.ts             # C# 查询
│       ├── php.ts                 # PHP 查询
│       ├── ruby.ts                # Ruby 查询
│       ├── swift.ts               # Swift 查询
│       ├── kotlin.ts              # Kotlin 查询
│       ├── scala.ts               # Scala 查询
│       ├── solidity.ts            # Solidity 查询
│       ├── vue.ts                 # Vue 查询
│       ├── html.ts                # HTML 查询
│       ├── css.ts                 # CSS 查询
│       ├── toml.ts                # TOML 查询
│       └── ... (更多语言)
│
├── glob/                          # 文件匹配
│   ├── constants.ts               # 全局常量
│   └── ignore-utils.ts            # 忽略规则
│
├── shared/                        # 共享定义
│   └── supported-extensions.ts    # 支持的扩展名
│
└── utils/                         # 核心工具
    ├── path.ts                    # 路径处理
    └── pathUtils.ts               # 路径工具
```

### 索引流程

```
用户触发索引
    ↓
EmbeddingServiceManager.detectRepositories()
    ├─ 扫描工作区文件夹
    ├─ 检测 Git/SVN 仓库
    └─ 返回仓库列表
    ↓
EmbeddingServiceManager.initialize()
    ├─ 单仓库模式 → initializeFallback()
    └─ 多仓库模式 → 为每个仓库创建服务
    ↓
EmbeddingService.indexCode()
    ├─ FileScanner 扫描文件
    ├─ CodeIndexer 解析代码
    ├─ EmbeddingService 生成向量
    └─ VectorStore 存储到 Qdrant
```

## 🎯 核心功能详解

### 1. 代码索引系统 (Indexing)

#### 1.1 EmbeddingService (嵌入服务)

**文件**: `indexing/embedding-service.ts` (300+ 行)

**职责**: 生成代码向量嵌入，管理索引流程

```typescript
class EmbeddingService {
  // 索引代码
  async indexCode(): Promise<void> {
    // 1. 扫描文件
    const files = await this.scanFiles();

    // 2. 解析代码
    const blocks = await this.parseFiles(files);

    // 3. 生成嵌入
    const embeddings = await this.generateEmbeddings(blocks);

    // 4. 存储到向量数据库
    await this.vectorStore.upsertPoints(embeddings);
  }

  // 搜索代码
  async searchCode(query: string, topK: number = 5): Promise<SemanticBlock[]> {
    const queryVector = await this.generateQueryEmbedding(query);
    return await this.vectorStore.search(queryVector, topK);
  }

  // 检查是否已索引
  async isIndexed(): Promise<number> {
    return await this.vectorStore.getPointCount();
  }
}
```

**支持的嵌入提供商**:

```typescript
// OpenAI
const openai = new OpenAI({ apiKey, baseURL: baseUrl });
const response = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: texts,
});

// Ollama (本地)
const response = await fetch("http://localhost:11434/api/embeddings", {
  method: "POST",
  body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
});

// OpenAI 兼容
// 任何支持 OpenAI Embeddings API 的服务
```

#### 1.2 EmbeddingServiceManager (服务管理器)

**文件**: `indexing/embedding-service-manager.ts` (500 行)

**职责**: 管理多个 EmbeddingService 实例，支持多仓库

```typescript
class EmbeddingServiceManager {
  // 单例模式
  private static _instance: EmbeddingServiceManager | null = null;

  // 多仓库映射
  private _repositoryServices: Map<string, RepositoryIndexingState> = new Map();

  // 初始化
  async initialize(): Promise<EmbeddingService | undefined> {
    const settings = this.getSettings();
    const enableMultiRepo = settings?.enableMultiRepoIndexing ?? true;

    if (enableMultiRepo) {
      // 多仓库模式
      const repositories = await this.detectRepositories();

      for (const repo of repositories) {
        const service = this.createServiceForRepository(repo);
        this._repositoryServices.set(repo.path, {
          repository: repo,
          embeddingService: service,
          isIndexed: 0,
        });
      }

      return this._repositoryServices.get(repositories[0].path)?.embeddingService;
    } else {
      // 单仓库模式
      return this.initializeFallback();
    }
  }

  // 检测仓库
  async detectRepositories(): Promise<RepositoryInfo[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const repositories: RepositoryInfo[] = [];

    for (const folder of workspaceFolders) {
      const repos = await this.discoverRepositories(folder.uri.fsPath);
      repositories.push(...repos);
    }

    return repositories;
  }

  // 发现仓库
  private async discoverRepositories(rootPath: string): Promise<RepositoryInfo[]> {
    // 1. 检查根目录是否是仓库
    const rootRepo = await this.checkRepository(rootPath);
    if (rootRepo) return [rootRepo];

    // 2. 搜索子目录
    const subdirs = await this.getSubdirectories(rootPath);
    const repos: RepositoryInfo[] = [];

    for (const subdir of subdirs) {
      const repo = await this.checkRepository(path.join(rootPath, subdir));
      if (repo) repos.push(repo);
    }

    return repos;
  }

  // 检查仓库类型
  private async checkRepository(dirPath: string): Promise<RepositoryInfo | undefined> {
    // 检查 Git
    const gitRepo = await this.checkGitRepository(dirPath);
    if (gitRepo) return gitRepo;

    // 检查 SVN
    const svnRepo = await this.checkSvnRepository(dirPath);
    if (svnRepo) return svnRepo;

    return undefined;
  }

  // 检查 Git 仓库
  private async checkGitRepository(dirPath: string): Promise<RepositoryInfo | undefined> {
    try {
      const { stdout } = await execAsync("git rev-parse --show-toplevel", {
        cwd: dirPath,
      });
      return {
        path: stdout.trim(),
        name: path.basename(stdout.trim()),
        type: "git",
      };
    } catch {
      return undefined;
    }
  }

  // 检查 SVN 仓库
  private async checkSvnRepository(dirPath: string): Promise<RepositoryInfo | undefined> {
    const svnDir = path.join(dirPath, ".svn");
    const stat = await statAsync(svnDir);
    if (stat.isDirectory()) {
      return {
        path: dirPath,
        name: path.basename(dirPath),
        type: "svn",
      };
    }
    return undefined;
  }

  // 为仓库创建服务
  private createServiceForRepository(repository: RepositoryInfo): EmbeddingService {
    const settings = this.getSettings();
    const qdrantUrl = settings?.qdrantUrl || "http://localhost:6333";

    // 为每个仓库生成独立的 collection name
    const hash = createHash("sha256").update(repository.path).digest("hex");
    const qdrantCollectionName = `dish-${hash.substring(0, 16)}`;

    // 确定向量维度
    const embeddingProvider = (settings?.provider || "openai") as
      | "openai"
      | "ollama"
      | "openai-compatible";

    let vectorSize: number;
    if (embeddingProvider === "openai-compatible") {
      const providerSettings = settings?.providers?.["openai-compatible"];
      vectorSize = providerSettings?.modelDimensions || 1536;
    } else {
      const embeddingModel = settings?.embeddingModel || "text-embedding-3-small";
      const modelProfile = EMBEDDING_MODEL_PROFILES[embeddingProvider.toLowerCase()]?.[embeddingModel];
      vectorSize = modelProfile?.dimension || 1536;
    }

    const vectorStore = new VectorStore(qdrantUrl, qdrantCollectionName, vectorSize);
    return new EmbeddingService(vectorStore, repository.name, repository.path);
  }
}
```

#### 1.3 CodeIndexer (代码索引器)

**文件**: `indexing/code-indexer.ts` (200+ 行)

**职责**: 使用 Tree-sitter 解析代码，提取语义块

```typescript
class CodeIndexer {
  private loadedParsers: LanguageParser = {};
  private seenSegmentHashes: Set<string> = new Set();

  // 解析文件
  async parseFile(filePath: string, options?: { content?: string }): Promise<SemanticBlock[]> {
    this.seenSegmentHashes.clear();

    const ext = path.extname(filePath).toLowerCase();
    if (!this.isSupportedLanguage(ext.slice(1))) {
      return [];
    }

    const fileContent = options?.content || await readFile(filePath, "utf8");
    return this.parseContent(filePath, fileContent);
  }

  // 解析内容
  private async parseContent(filePath: string, content: string): Promise<SemanticBlock[]> {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const parser = await this.getParser(ext);

    if (!parser) return [];

    const tree = parser.parser.parse(content);
    const query = parser.query;
    const captures = query.captures(tree.rootNode);

    return this.extractSemanticBlocks(captures, filePath, content);
  }

  // 提取语义块
  private extractSemanticBlocks(
    captures: any[],
    filePath: string,
    content: string
  ): SemanticBlock[] {
    const blocks: SemanticBlock[] = [];

    for (const capture of captures) {
      const node = capture.node;
      const type = capture.name; // "function", "class", "method", etc.

      const block: SemanticBlock = {
        type,
        name: node.text.split(/[({\s]/)[0], // 提取名称
        file: filePath,
        startLine: node.startPosition.row,
        endLine: node.endPosition.row,
        code: node.text,
        modulePath: this.deriveModulePath(filePath),
      };

      // 获取文档注释
      const doc = this.getDocumentation(node);
      if (doc) block.doc = doc;

      blocks.push(block);
    }

    return blocks;
  }

  // 获取文档注释
  private getDocumentation(node: any): string | undefined {
    let previousSibling = node.previousNamedSibling;
    if (
      previousSibling &&
      (previousSibling.type === "comment" ||
        previousSibling.type === "line_comment" ||
        previousSibling.type === "block_comment")
    ) {
      return previousSibling.text;
    }
    return undefined;
  }

  // 派生模块路径
  private deriveModulePath(fp: string): string {
    let derivedPath = fp.startsWith("src/") ? fp.substring(4) : fp;
    const ext = path.extname(derivedPath);
    if (ext) {
      derivedPath = derivedPath.substring(0, derivedPath.length - ext.length);
    }
    return derivedPath;
  }
}
```

**语义块结构**:

```typescript
interface SemanticBlock {
  type: string;           // "function", "class", "method", "interface"
  name: string | null;    // 实体名称
  file: string;           // 文件路径
  startLine: number;      // 起始行
  endLine: number;        // 结束行
  signature?: string;     // 函数签名
  doc?: string;           // 文档注释
  code: string;           // 实际代码
  modulePath: string;     // 模块路径
}
```

#### 1.4 VectorStore (向量存储)

**文件**: `indexing/vector-store.ts` (150 行)

**职责**: Qdrant 向量数据库操作

```typescript
class VectorStore {
  private client: QdrantClient;
  private collectionName: string;
  private vectorSize: number;

  constructor(
    qdrantUrl: string = "http://localhost:6333",
    collectionName: string = "code_semantic_blocks",
    vectorSize: number = 1536
  ) {
    this.client = new QdrantClient({ url: qdrantUrl });
    this.collectionName = collectionName;
    this.vectorSize = vectorSize;
  }

  // 初始化集合
  async initializeStore(): Promise<void> {
    const collections = await this.client.getCollections();
    const collectionExists = collections.collections.some(
      (c) => c.name === this.collectionName
    );

    if (!collectionExists) {
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: this.vectorSize,
          distance: "Cosine",
        },
      });
    }
  }

  // 插入/更新点
  async upsertPoints(points: QdrantPoint[]): Promise<void> {
    await this.initializeStore();
    if (points.length === 0) return;

    for (const point of points) {
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [point],
      });
    }
  }

  // 搜索相似代码
  async search(vector: number[], topK: number = 5): Promise<any[]> {
    await this.initializeStore();
    const result = await this.client.search(this.collectionName, {
      vector,
      limit: topK,
      with_payload: true,
    });
    return result;
  }

  // 获取点数量
  async getPointCount(): Promise<number> {
    try {
      const collectionInfo = await this.client.getCollection(this.collectionName);
      return collection_info.points_count || 0;
    } catch {
      return 0;
    }
  }
}
```

**Qdrant Point 结构**:

```typescript
interface QdrantPoint {
  id: string;              // 唯一 ID
  vector: number[];        // 向量嵌入
  payload: {               // 元数据
    type: string;
    name: string;
    file: string;
    startLine: number;
    endLine: number;
    signature?: string;
    doc?: string;
    code: string;
    modulePath: string;
    chunk_id: string;
    project: string;
  };
}
```

### 2. Tree-sitter 解析器

#### 2.1 LanguageParser (语言解析器)

**文件**: `tree-sitter/languageParser.ts`

**职责**: 管理 Tree-sitter WASM 解析器

```typescript
// 使用 Tree-sitter WASM (避免 Node.js 原生模块兼容性问题)
// 适用于 VS Code 扩展的 Electron 环境

export async function loadRequiredLanguageParsers(
  filesToParse: string[]
): Promise<LanguageParser> {
  await initializeParser();

  // 提取唯一扩展名
  const extensionsToLoad = new Set(
    filesToParse.map((file) => path.extname(file).toLowerCase().slice(1))
  );

  const parsers: LanguageParser = {};

  for (const ext of extensionsToLoad) {
    let language: Parser.Language;
    let query: Parser.Query;

    switch (ext) {
      case "js":
      case "jsx":
      case "json":
        language = await loadLanguage("javascript");
        query = language.query(javascriptQuery);
        break;

      case "ts":
      case "tsx":
        language = await loadLanguage("typescript");
        query = language.query(typescriptQuery);
        break;

      case "py":
        language = await loadLanguage("python");
        query = language.query(pythonQuery);
        break;

      case "java":
        language = await loadLanguage("java");
        query = language.query(javaQuery);
        break;

      case "go":
        language = await loadLanguage("go");
        query = language.query(goQuery);
        break;

      case "rs":
        language = await loadLanguage("rust");
        query = language.query(rustQuery);
        break;

      // ... 更多语言
    }

    const parser = new Parser();
    parser.setLanguage(language);

    parsers[ext] = { parser, query };
  }

  return parsers;
}
```

**支持的语言** (20+):
- JavaScript, TypeScript, JSX, TSX
- Python, Java, Go, Rust
- C, C++, C#
- PHP, Ruby, Swift, Kotlin
- Scala, Solidity, Zig
- HTML, CSS, Vue
- TOML, Elixir, Lua, 等

#### 2.2 语言查询 (Queries)

**文件**: `tree-sitter/queries/*.ts`

**职责**: 定义如何提取语义结构

**示例 - JavaScript 查询**:

```typescript
export const javascriptQuery = `
(function_declaration
  name: (identifier) @name
  body: (statement_block) @body) @function

(method_definition
  name: (property_identifier) @name
  body: (statement_block) @body) @method

(class_declaration
  name: (identifier) @name
  body: (class_body) @body) @class

(variable_declarator
  name: (identifier) @name
  value: (_) @value) @variable
`;
```

**示例 - Python 查询**:

```python
export const pythonQuery = `
(function_definition
  name: (identifier) @name
  body: (block) @body) @function

(class_definition
  name: (identifier) @name
  body: (block) @body) @class

(import_statement) @import
`;
```

### 3. 文件扫描和匹配

#### 3.1 FileScanner (文件扫描器)

**职责**: 扫描工作区文件，支持忽略规则

```typescript
class FileScanner {
  // 扫描文件
  async scanWorkspace(rootPath: string): Promise<string[]> {
    const files: string[] = [];

    // 读取 .gitignore 或 .dishignore
    const ignorePatterns = await this.loadIgnorePatterns(rootPath);

    // 递归扫描
    await this.walkDirectory(rootPath, files, ignorePatterns);

    return files.filter((file) => this.isSupportedExtension(file));
  }

  // 递归遍历目录
  private async walkDirectory(
    dir: string,
    files: string[],
    ignorePatterns: string[]
  ): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // 检查忽略规则
      if (this.isIgnored(fullPath, ignorePatterns)) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.walkDirectory(fullPath, files, ignorePatterns);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  // 检查是否被忽略
  private isIgnored(filePath: string, patterns: string[]): boolean {
    const relativePath = path.relative(process.cwd(), filePath);
    return patterns.some((pattern) => minimatch(relativePath, pattern));
  }
}
```

#### 3.2 Supported Extensions (支持的扩展名)

**文件**: `core/shared/supported-extensions.ts`

```typescript
export const scannerExtensions = [
  // Web
  ".js", ".jsx", ".ts", ".tsx", ".vue",
  ".html", ".css", ".scss", ".less",

  // Backend
  ".py", ".java", ".go", ".rs", ".php", ".rb", ".cs",
  ".cpp", ".c", ".h", ".hpp",

  // Mobile
  ".swift", ".kt", ".m",

  // Config
  ".json", ".yaml", ".yml", ".toml", ".ini",

  // Other
  ".md", ".sql", ".sh", ".dockerfile",
];
```

## 📊 性能优化

### 1. 延迟加载

```typescript
// WASM 解析器延迟加载
const pendingLoads: Map<string, Promise<LanguageParser>> = new Map();

async function getParser(ext: string): Promise<LanguageParser | undefined> {
  if (this.loadedParsers[ext]) {
    return this.loadedParsers[ext];
  }

  // 避免重复加载
  if (this.pendingLoads.has(ext)) {
    return await this.pendingLoads.get(ext);
  }

  const loadPromise = loadRequiredLanguageParsers([`file.${ext}`]);
  this.pendingLoads.set(ext, loadPromise);

  const parser = await loadPromise;
  this.loadedParsers[ext] = parser;
  this.pendingLoads.delete(ext);

  return parser;
}
```

### 2. 增量索引

```typescript
// 基于文件哈希的增量索引
async function indexFile(filePath: string): Promise<void> {
  const currentHash = await calculateFileHash(filePath);
  const lastHash = await getLastIndexedHash(filePath);

  if (currentHash === lastHash) {
    // 文件未变化，跳过
    return;
  }

  // 索引并更新哈希
  await performIndexing(filePath);
  await updateFileHash(filePath, currentHash);
}
```

### 3. 批量处理

```typescript
// 批量生成嵌入 (OpenAI 限制 2048 个输入)
const BATCH_SIZE = 100;

for (let i = 0; i < blocks.length; i += BATCH_SIZE) {
  const batch = blocks.slice(i, i + BATCH_SIZE);
  const texts = batch.map((b) => `${b.type} ${b.name}: ${b.code}`);
  const embeddings = await generateEmbeddings(texts);

  // 批量存储
  const points = embeddings.map((vector, idx) => ({
    id: generateId(batch[idx]),
    vector,
    payload: batch[idx],
  }));

  await vectorStore.upsertPoints(points);
}
```

### 4. 多仓库并行

```typescript
// 多仓库并行索引
const promises = repositories.map((repo) => {
  const service = manager.getServiceForRepository(repo.path);
  return service.indexCode();
});

await Promise.all(promises);
```

## 🎯 使用示例

### 示例 1: 单仓库索引

```typescript
// 1. 初始化管理器
const manager = EmbeddingServiceManager.getInstance();
manager.setIndexingSettingsManager(settingsManager);

// 2. 初始化服务
const service = await manager.initialize();

// 3. 索引代码
await service.indexCode();

// 4. 搜索代码
const results = await service.searchCode("用户登录功能", 5);

console.log(results);
// [
//   { type: "function", name: "login", file: "src/auth.ts", ... },
//   { type: "method", name: "authenticate", file: "src/user.ts", ... }
// ]
```

### 示例 2: 多仓库索引

```typescript
// 1. 启用多仓库模式
await settingsManager.updateSettings({
  enableMultiRepoIndexing: true,
});

// 2. 初始化管理器
const manager = EmbeddingServiceManager.getInstance();
await manager.initialize();

// 3. 获取所有仓库状态
const statuses = await manager.getRepositoriesStatus();
console.log(statuses);
// [
//   { repository: { name: "backend", type: "git" }, isIndexed: 150 },
//   { repository: { name: "frontend", type: "git" }, isIndexed: 89 }
// ]

// 4. 搜索特定仓库
const backendService = manager.getServiceForRepository("/path/to/backend");
const results = await backendService.searchCode("API endpoint", 3);
```

### 示例 3: 代码解析

```typescript
// 1. 创建索引器
const indexer = new CodeIndexer();

// 2. 解析文件
const blocks = await indexer.parseFile("src/main.ts");

console.log(blocks);
// [
//   {
//     type: "function",
//     name: "main",
//     file: "src/main.ts",
//     startLine: 1,
//     endLine: 10,
//     code: "function main() { ... }",
//     modulePath: "main"
//   },
//   {
//     type: "class",
//     name: "User",
//     file: "src/main.ts",
//     startLine: 12,
//     endLine: 30,
//     code: "class User { ... }",
//     modulePath: "main"
//   }
// ]
```

### 示例 4: 向量存储

```typescript
// 1. 创建向量存储
const vectorStore = new VectorStore(
  "http://localhost:6333",
  "my-project",
  1536
);

// 2. 插入点
await vectorStore.upsertPoints([
  {
    id: "function-login",
    vector: [0.1, 0.2, 0.3, ...], // 1536 维向量
    payload: {
      type: "function",
      name: "login",
      file: "src/auth.ts",
      code: "function login() { ... }",
    },
  },
]);

// 3. 搜索
const results = await vectorStore.search(
  [0.15, 0.25, 0.35, ...], // 查询向量
  5 // Top-K
);
```

## 🎓 设计模式

### 1. 单例模式

```typescript
// EmbeddingServiceManager 单例
class EmbeddingServiceManager {
  private static _instance: EmbeddingServiceManager | null = null;

  public static getInstance(): EmbeddingServiceManager {
    if (!EmbeddingServiceManager._instance) {
      EmbeddingServiceManager._instance = new EmbeddingServiceManager();
    }
    return EmbeddingServiceManager._instance;
  }
}

// 使用
const manager = EmbeddingServiceManager.getInstance();
```

### 2. 工厂模式

```typescript
// 为每个仓库创建独立的 EmbeddingService
private createServiceForRepository(repository: RepositoryInfo): EmbeddingService {
  const vectorStore = new VectorStore(qdrantUrl, collectionName, vectorSize);
  return new EmbeddingService(vectorStore, repository.name, repository.path);
}
```

### 3. 策略模式

```typescript
// 不同的嵌入提供商策略
interface EmbeddingStrategy {
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

class OpenAIStrategy implements EmbeddingStrategy {
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // OpenAI 实现
  }
}

class OllamaStrategy implements EmbeddingStrategy {
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // Ollama 实现
  }
}
```

### 4. 观察者模式

```typescript
// 配置变更监听
vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration("dish-ai-commit.indexing")) {
    // 重新初始化索引服务
    EmbeddingServiceManager.getInstance().reinitialize();
  }
});
```

## 🔍 故障排除

### 常见问题

#### 1. Qdrant 连接失败

**问题**: `Error: Connection refused`

**解决方案**:
```typescript
// 1. 检查 Qdrant 是否运行
// docker ps | grep qdrant

// 2. 启动 Qdrant
// docker run -p 6333:6333 qdrant/qdrant

// 3. 检查配置
const settings = await settingsManager.getSettings();
console.log("Qdrant URL:", settings.qdrantUrl); // 默认 http://localhost:6333
```

#### 2. Tree-sitter WASM 加载失败

**问题**: `Failed to load language parser`

**解决方案**:
```typescript
// 1. 检查 WASM 文件是否存在
const wasmPath = path.join(__dirname, "wasm", "tree-sitter-javascript.wasm");
console.log("WASM path:", wasmPath);
console.log("Exists:", fs.existsSync(wasmPath));

// 2. 检查扩展安装
// 确保 tree-sitter-wasms 已安装
```

#### 3. 嵌入生成失败

**问题**: `EmbeddingServiceError`

**解决方案**:
```typescript
// 1. 检查 API 密钥
const settings = await settingsManager.getSettings();
if (!settings.embeddingApiKey) {
  console.error("Missing embedding API key");
}

// 2. 检查模型配置
const modelProfile = EMBEDDING_MODEL_PROFILES[provider]?.[model];
if (!modelProfile) {
  console.error("Unknown embedding model:", model);
}

// 3. 检查网络连接
// 尝试 ping API 端点
```

#### 4. 多仓库检测失败

**问题**: 未检测到子仓库

**解决方案**:
```typescript
// 1. 检查工作区配置
const workspaceFolders = vscode.workspace.workspaceFolders;
console.log("Workspace folders:", workspaceFolders);

// 2. 检查仓库类型
// 确保子目录包含 .git 或 .svn

// 3. 手动指定仓库路径
const manager = EmbeddingServiceManager.getInstance();
const service = await manager.initialize();
```

## 🤝 开发指南

### 添加新的语言支持

```typescript
// 1. 添加扩展名到支持列表
// src/core/shared/supported-extensions.ts
export const scannerExtensions = [
  // ... 现有扩展
  ".dart",  // 新增
];

// 2. 创建语言查询
// src/core/tree-sitter/queries/dart.ts
export const dartQuery = `
(function_declaration
  name: (identifier) @name
  body: (block) @body) @function

(class_declaration
  name: (identifier) @name
  body: (class_body) @body) @class
`;

// 3. 在解析器中注册
// src/core/tree-sitter/languageParser.ts
switch (ext) {
  // ... 现有 case
  case "dart":
    language = await loadLanguage("dart");
    query = language.query(dartQuery);
    break;
}
```

### 测试策略

```typescript
describe('EmbeddingServiceManager', () => {
  it('should detect repositories', async () => {
    const manager = EmbeddingServiceManager.getInstance();
    const repos = await manager.detectRepositories();
    expect(repos.length).toBeGreaterThan(0);
  });

  it('should create service for each repo', async () => {
    const manager = EmbeddingServiceManager.getInstance();
    await manager.initialize();

    const services = manager.getAllServices();
    expect(services.size).toBeGreaterThan(0);
  });
});

describe('CodeIndexer', () => {
  it('should parse TypeScript file', async () => {
    const indexer = new CodeIndexer();
    const blocks = await indexer.parseFile("test.ts");

    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0].type).toBe("function");
  });
});
```

## 📚 相关文档

- **主 README**: [../README.md](../README.md) - 项目总览
- **服务模块**: [../services/README.md](../services/README.md) - 服务层
- **AI 模块**: [../ai/README.md](../ai/README.md) - AI 提供商
- **配置系统**: [../config/README.md](../config/README.md) - 配置定义

---

**最后更新**: 2024年12月
**模块版本**: v0.56.1
**支持语言**: 20+
**代码质量**: ⭐⭐⭐⭐⭐
**架构模式**: 单例、工厂、策略
