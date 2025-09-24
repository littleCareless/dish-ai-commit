import * as fs from "fs/promises";
import * as path from "path";
import ignore from "ignore"; // For handling .gitignore patterns

export interface FileNode {
  // Added export
  path: string; // Relative path from project root
  name: string;
  type: "file" | "directory";
  size?: number; // In bytes, for files
  lastModified?: Date; // For files
  children?: FileNode[]; // For directories
  language?: string; // Detected language from extension
  module?: string; // Derived module based on path
  tags?: string[]; // Semantic tags
  fileType?: "code" | "config" | "resource" | "document" | "other"; // Broader categorization
  domain?: string; // Functional domain like "authentication", "payment", "user-management"
}

export class FileScanner {
  private projectRoot: string;
  private ig: ReturnType<typeof ignore>;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.ig = ignore();
  }

  private async loadGitignore(): Promise<void> {
    try {
      const gitignorePath = path.join(this.projectRoot, ".gitignore");
      const gitignoreContent = await fs.readFile(gitignorePath, "utf-8");
      this.ig.add(gitignoreContent);
      // Add common patterns to ignore by default, even if not in .gitignore
      this.ig.add(["node_modules", ".git", "dist", "build", "*.log", "*.lock"]);
    } catch (error) {
      // If .gitignore doesn't exist, or other error, proceed without it
      console.warn(
        "Could not load .gitignore, proceeding without it. Common patterns still ignored.",
        error
      );
      this.ig.add(["node_modules", ".git", "dist", "build", "*.log", "*.lock"]);
    }
  }

  public async scanProject(): Promise<FileNode | null> {
    await this.loadGitignore();
    try {
      return await this.scanDirectoryRecursive(this.projectRoot, "");
    } catch (error) {
      console.error("Error scanning project:", error);
      return null;
    }
  }

  private async scanDirectoryRecursive(
    absoluteDirPath: string,
    relativeDirPath: string
  ): Promise<FileNode> {
    const dirName = path.basename(absoluteDirPath);
    const dirNode: FileNode = {
      path: relativeDirPath || ".", // Use '.' for the root itself if relativeDirPath is empty
      name: dirName,
      type: "directory",
      children: [],
      module: this.deriveModule(relativeDirPath),
      tags: this.generateTags(relativeDirPath, dirName, true),
      fileType: "other", // Directories themselves don't have a specific fileType like files
      domain: this.determineFunctionalDomain(
        relativeDirPath,
        dirName,
        true,
        this.deriveModule(relativeDirPath)
      ),
    };

    const entries = await fs.readdir(absoluteDirPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryName = entry.name;
      const entryRelativePath = path.join(relativeDirPath, entryName);

      if (this.ig.ignores(entryRelativePath)) {
        continue;
      }

      const entryAbsolutePath = path.join(absoluteDirPath, entryName);

      if (entry.isDirectory()) {
        const childDirNode = await this.scanDirectoryRecursive(
          entryAbsolutePath,
          entryRelativePath
        );
        dirNode.children?.push(childDirNode);
      } else if (entry.isFile()) {
        try {
          const stats = await fs.stat(entryAbsolutePath);
          const fileExtension = path.extname(entryName).toLowerCase();
          const language = this.getLanguageFromExtension(fileExtension);
          dirNode.children?.push({
            path: entryRelativePath,
            name: entryName,
            type: "file",
            size: stats.size,
            lastModified: stats.mtime,
            language: language,
            module: this.deriveModule(entryRelativePath),
            tags: this.generateTags(
              entryRelativePath,
              entryName,
              false,
              language
            ),
            fileType: this.categorizeFileType(fileExtension, entryName),
            domain: this.determineFunctionalDomain(
              entryRelativePath,
              entryName,
              false,
              this.deriveModule(entryRelativePath),
              language,
              this.generateTags(entryRelativePath, entryName, false, language)
            ),
          });
        } catch (statError) {
          console.warn(
            `Could not stat file ${entryAbsolutePath}, skipping. Error: ${statError}`
          );
        }
      }
    }
    // Sort children: directories first, then files, both alphabetically
    dirNode.children?.sort((a, b) => {
      if (a.type === "directory" && b.type === "file") {
        return -1;
      }
      if (a.type === "file" && b.type === "directory") {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });
    return dirNode;
  }

  private getLanguageFromExtension(extension: string): string | undefined {
    // Based on common extensions
    const langMap: Record<string, string> = {
      ".js": "javascript",
      ".jsx": "javascript",
      ".ts": "typescript",
      ".tsx": "typescript",
      ".py": "python",
      ".pyw": "python",
      ".go": "go",
      ".java": "java",
      ".class": "java", // .class is compiled, but good to note
      ".cs": "csharp",
      ".c": "c",
      ".h": "c",
      ".cpp": "cpp",
      ".hpp": "cpp",
      ".cxx": "cpp",
      ".rb": "ruby",
      ".php": "php",
      ".swift": "swift",
      ".kt": "kotlin",
      ".kts": "kotlin",
      ".rs": "rust",
      ".html": "html",
      ".htm": "html",
      ".css": "css",
      ".scss": "scss",
      ".sass": "sass",
      ".json": "json",
      ".xml": "xml",
      ".yaml": "yaml",
      ".yml": "yaml",
      ".md": "markdown",
      ".sh": "shell",
      ".bat": "batch",
      ".pl": "perl",
      ".lua": "lua",
      ".sql": "sql",
      ".r": "r",
      ".m": "objective-c", // or matlab
      ".scala": "scala",
      ".dart": "dart",
      ".vue": "vue",
      ".svelte": "svelte",
    };
    return langMap[extension];
  }

  private deriveModule(filePath: string): string | undefined {
    const parts = filePath?.split(path.sep).filter((p) => p && p !== ".");

    // Rule 1: Explicit 'modules' directory
    const modulesIndex = parts.indexOf("modules");
    if (modulesIndex !== -1 && modulesIndex < parts.length - 1) {
      // Consider path like "src/modules/auth/core/service.ts" -> "auth"
      // or "modules/payment/api.ts" -> "payment"
      return parts[modulesIndex + 1];
    }

    // Rule 2: Top-level directory under 'src', 'app', 'lib', 'packages'
    const commonRootDirs = ["src", "app", "lib", "packages"];
    if (commonRootDirs.includes(parts[0]) && parts.length > 1) {
      // If path is "src/auth/service.ts", parts[1] is "auth"
      // If path is "src/index.ts", parts[1] is "index.ts" (filename)
      // We want the directory name if it's not a direct file in src/
      const potentialModule = parts[1];
      if (
        parts.length > 2 ||
        (parts.length === 2 && !path.extname(potentialModule))
      ) {
        // Check if it's a directory or a file
        // Avoid using 'index.ts' or 'main.ts' as module name directly under src
        if (!potentialModule.match(/^(index|main)\.(ts|js|py|go|java|cs)$/i)) {
          return potentialModule;
        }
      }
    }

    // Rule 3: If the path is like "featureA/services/service.ts" (not under src/modules)
    // and 'featureA' is not a common utility name.
    if (
      parts.length > 1 &&
      !commonRootDirs.includes(parts[0]) &&
      !["utils", "components", "helpers", "shared", "common", "core"].includes(
        parts[0].toLowerCase()
      )
    ) {
      // Check if parts[0] is a directory (heuristically, if it doesn't have an extension or if it's not the last part)
      if (
        parts.length > 1 &&
        (path.extname(parts[0]) === "" || parts.length - 1 > 0)
      ) {
        return parts[0];
      }
    }

    // Fallback: if the file is in a directory that is not 'src', 'lib' etc. use that dir name
    if (
      parts.length > 1 &&
      !commonRootDirs.includes(parts[0]) &&
      path.extname(parts[parts.length - 1]) !== ""
    ) {
      // is a file path
      const parentDir = parts[parts.length - 2];
      if (
        parentDir &&
        !commonRootDirs.includes(parentDir) &&
        ![
          "utils",
          "components",
          "helpers",
          "shared",
          "common",
          "core",
        ].includes(parentDir.toLowerCase())
      ) {
        return parentDir;
      }
    }

    return undefined;
  }

  private generateTags(
    filePath: string,
    name: string,
    isDirectory: boolean,
    language?: string
  ): string[] {
    const tags: Set<string> = new Set();
    const normalizedPath = path.normalize(filePath);
    const parts = normalizedPath
      ?.split(path.sep)
      .filter(
        (p) =>
          p &&
          p !== "." &&
          p !== "src" &&
          p !== "lib" &&
          p !== "app" &&
          p !== "packages"
      );

    parts.forEach((part) => {
      const tagName = path.basename(part, path.extname(part)).toLowerCase();
      if (
        tagName &&
        tagName !==
          name.toLowerCase().replace(path.extname(name).toLowerCase(), "")
      ) {
        tags.add(tagName);
      }
    });

    const baseName = path.basename(name, path.extname(name)).toLowerCase();

    if (!isDirectory) {
      tags.add(baseName);
      if (language) {
        tags.add(language);
      }
      // Keywords in file names
      const fileKeywords = [
        "service",
        "controller",
        "model",
        "util",
        "config",
        "test",
        "route",
        "middleware",
        "component",
        "view",
        "schema",
        "handler",
        "manager",
        "provider",
        "repository",
        "dto",
        "entity",
        "dao",
        "api",
        "job",
        "worker",
        "listener",
        "event",
        "subscriber",
        "guard",
        "interceptor",
        "pipe",
        "filter",
        "decorator",
        "module",
        "plugin",
        "adapter",
        "connector",
        "client",
        "server",
        "script",
        "tool",
        "helper",
        "constant",
        "enum",
        "interface",
        "type",
        "class",
        "function",
        "hook",
      ];
      fileKeywords.forEach((keyword) => {
        if (baseName.includes(keyword)) {
          tags.add(keyword);
        }
      });
      if (baseName.startsWith("use")) {
        tags.add("hook");
      } // React hooks etc.
      if (
        baseName === "index" ||
        baseName === "main" ||
        baseName === "app" ||
        baseName === "server"
      ) {
        tags.add("entry-point");
      }
    } else {
      // For directories
      tags.add(baseName); // Use baseName for directories too (which is name.toLowerCase())
      const dirKeywords = [
        "utils",
        "helpers",
        "services",
        "controllers",
        "models",
        "config",
        "configuration",
        "tests",
        "__tests__",
        "routes",
        "routing",
        "middleware",
        "components",
        "views",
        "schemas",
        "assets",
        "public",
        "docs",
        "data",
        "core",
        "shared",
        "common",
        "lib",
        "app",
        "src",
        "include",
        "bin",
        "dist",
        "build",
        "api",
        "client",
        "server",
        "jobs",
        "workers",
        "events",
        "handlers",
        "managers",
        "providers",
        "repositories",
        "entities",
        "dto",
        "store",
        "hooks",
        "contexts",
        "pipes",
        "filters",
        "guards",
        "interceptors",
        "decorators",
        "modules",
        "plugins",
        "adapters",
        "connectors",
        "scripts",
        "tools",
        "types",
        "interfaces",
        "enums",
        "constants",
        "styles",
        "themes",
        "layouts",
        "pages",
        "templates",
        "i18n",
        "locales",
        "migrations",
        "seeders",
        "factories",
        "fixtures",
        "validators",
        "mappers",
        "selectors",
        "reducers",
        "sagas",
        "epics",
        "graphql",
        "grpc",
        "rest",
      ];
      dirKeywords.forEach((keyword) => {
        if (baseName === keyword) {
          tags.add(keyword + (baseName.endsWith("s") ? "-group" : "-layer"));
        }
        // e.g. services-layer, util-group
        else if (baseName.includes(keyword)) {
          tags.add(keyword);
        }
      });
    }
    return Array.from(tags);
  }

  private categorizeFileType(
    extension: string,
    fileName: string
  ): FileNode["fileType"] {
    const ext = extension.startsWith(".") ? extension : "." + extension;
    // Code files
    if (
      [
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".py",
        ".go",
        ".java",
        ".cs",
        ".c",
        ".cpp",
        ".h",
        ".hpp",
        ".rb",
        ".php",
        ".swift",
        ".kt",
        ".rs",
        ".vue",
        ".svelte",
        ".dart",
      ].includes(ext)
    ) {
      return "code";
    }
    // Config files
    if (
      [".json", ".yaml", ".yml", ".xml", ".ini", ".toml", ".env"].includes(
        ext
      ) ||
      fileName.endsWith(".config.js") ||
      fileName.endsWith(".config.ts") ||
      fileName.startsWith(".env")
    ) {
      return "config";
    }
    // Document files
    if (
      [".md", ".txt", ".doc", ".docx", ".pdf", ".rtf", ".odt"].includes(ext) ||
      fileName.toUpperCase().startsWith("README") ||
      fileName.toUpperCase().startsWith("LICENSE")
    ) {
      return "document";
    }
    // Resource files (images, fonts, etc.) - very basic
    if (
      [
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".svg",
        ".webp",
        ".ico",
        ".woff",
        ".woff2",
        ".ttf",
        ".eot",
        ".otf",
        ".mp3",
        ".wav",
        ".mp4",
        ".webm",
      ].includes(ext)
    ) {
      return "resource";
    }
    return "other";
  }

  private determineFunctionalDomain(
    filePath: string,
    name: string,
    isDirectory: boolean,
    moduleName?: string,
    language?: string,
    tags?: string[]
  ): string | undefined {
    const lowerName = name.toLowerCase();
    const lowerPath = filePath.toLowerCase();
    const checkPathOrModule = (
      keywords: string[],
      targetDomain: string
    ): string | undefined => {
      if (
        keywords.some(
          (kw) =>
            lowerPath.includes(kw) ||
            (moduleName && moduleName.toLowerCase().includes(kw))
        )
      ) {
        return targetDomain;
      }
      if (tags && keywords.some((kw) => tags.includes(kw))) {
        return targetDomain;
      }
      return undefined;
    };

    let domain: string | undefined;

    // Authentication & Authorization
    domain = checkPathOrModule(
      [
        "auth",
        "login",
        "register",
        "password",
        "jwt",
        "token",
        "session",
        "user-access",
        "permission",
        "role",
      ],
      "authentication"
    );
    if (domain) {
      return domain;
    }

    // User Management
    domain = checkPathOrModule(
      ["user", "profile", "account", "customer", "member"],
      "user-management"
    );
    if (domain) {
      return domain;
    }

    // Payment & Billing
    domain = checkPathOrModule(
      [
        "payment",
        "billing",
        "invoice",
        "charge",
        "subscription",
        "checkout",
        "stripe",
        "paypal",
      ],
      "payment-billing"
    );
    if (domain) {
      return domain;
    }

    // Product & Catalog
    domain = checkPathOrModule(
      ["product", "item", "catalog", "inventory", "stock"],
      "product-catalog"
    );
    if (domain) {
      return domain;
    }

    // Order & Cart
    domain = checkPathOrModule(
      ["order", "cart", "checkout", "shipment"],
      "order-processing"
    );
    if (domain) {
      return domain;
    }

    // Database & Storage
    domain = checkPathOrModule(
      [
        "db",
        "database",
        "sql",
        "query",
        "repository",
        "dao",
        "entity",
        "storage",
        "migration",
      ],
      "data-access"
    );
    if (domain) {
      return domain;
    }

    // API & Interface
    domain = checkPathOrModule(
      [
        "api",
        "controller",
        "route",
        "handler",
        "graphql",
        "rest",
        "endpoint",
        "gateway",
      ],
      "api-interface"
    );
    if (domain) {
      return domain;
    }

    // UI & Frontend
    domain = checkPathOrModule(
      [
        "ui",
        "view",
        "component",
        "page",
        "template",
        "style",
        "css",
        "frontend",
        "client",
      ],
      "ui-frontend"
    );
    if (domain) {
      return domain;
    }

    // Logging & Monitoring
    domain = checkPathOrModule(
      ["log", "logger", "monitoring", "metric", "trace", "telemetry"],
      "logging-monitoring"
    );
    if (domain) {
      return domain;
    }

    // Configuration
    domain = checkPathOrModule(
      ["config", "setting", "env", "parameter"],
      "configuration"
    );
    if (domain) {
      return domain;
    }

    // Testing
    domain = checkPathOrModule(
      ["test", "spec", "fixture", "mock", "e2e", "unit"],
      "testing"
    );
    if (domain) {
      return domain;
    }

    // Build & Deployment
    domain = checkPathOrModule(
      ["build", "deploy", "ci", "cd", "docker", "script", "pipeline"],
      "build-deployment"
    );
    if (domain) {
      return domain;
    }

    // Notifications
    domain = checkPathOrModule(
      ["notification", "email", "sms", "webhook", "alert"],
      "notifications"
    );
    if (domain) {
      return domain;
    }

    // Search
    domain = checkPathOrModule(
      ["search", "index", "query", "elasticsearch", "solr", "algolia"],
      "search"
    );
    if (domain) {
      return domain;
    }

    // Core & Shared Utilities
    if (
      !domain &&
      (moduleName === "core" ||
        moduleName === "shared" ||
        moduleName === "common" ||
        moduleName === "util" ||
        lowerPath.includes("/core/") ||
        lowerPath.includes("/shared/") ||
        lowerPath.includes("/common/") ||
        lowerPath.includes("/utils/"))
    ) {
      return "core-shared";
    }

    return undefined;
  }
}
