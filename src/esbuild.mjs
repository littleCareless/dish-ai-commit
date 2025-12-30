import * as esbuild from "esbuild"
import * as fs from "fs"
import process from "node:process"
import * as path from "path"
import { fileURLToPath } from "url"

import { createRequire } from "module"
import buildEnv from "../scripts/build-env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

async function main() {
  const name = "extension";

  // 解析构建模式
  const mode = buildEnv.parseMode(process.argv);
  const isProduction = mode === 'production';

  const watch = process.argv.includes("--watch");
  const minify = isProduction;
  const sourcemap = !isProduction;

  // 获取环境变量配置
  const env = buildEnv.getBuildEnv(mode);
  const defines = buildEnv.getEsbuildDefine(mode);

  // 输出构建信息
  buildEnv.logBuildInfo(name, mode, { minify, sourcemap });

  /**
   * @type {import('esbuild').BuildOptions}
   */
  const buildOptions = {
    bundle: true,
    minify,
    sourcemap,
    logLevel: "warning",
    format: "cjs",
    sourcesContent: false,
    platform: "node",
    define: defines,
  };

  const srcDir = path.dirname(__dirname); // 项目根目录
  const buildDir = __dirname; // src 目录
  const distDir = path.join(buildDir, "dist");

  if (fs.existsSync(distDir)) {
    console.log(`[${name}] Cleaning dist directory: ${distDir}`);
    fs.rmSync(distDir, { recursive: true, force: true });
  }

  // 直接编译 prompt 文件到 dist/prompt（不再依赖 tsc 输出）
  await buildPromptFiles(buildDir, distDir, { minify, sourcemap });

  /**
   * @type {import('esbuild').Plugin[]}的
   */
  const plugins = [
    {
      name: "copyFiles",
      setup(build) {
        build.onEnd(() => {
          copyPaths(
            [
              ["README.md", "README.md", { optional: true }],
              ["CHANGELOG.md", "CHANGELOG.md", { optional: true }],
              ["CHANGELOG.zh-CN.md", "CHANGELOG.zh-CN.md", { optional: true }],
              ["src/license", "LICENSE", { optional: true }],
              ["SECURITY.md", "SECURITY.md", { optional: true }],
              ["webview-ui/dist", "webview-ui-dist"],
            ],
            srcDir,
            distDir
          );
        });
      },
    },
    {
      name: "copyWasms",
      setup(build) {
        build.onEnd(() => copyWasms(srcDir, distDir));
      },
    },
    {
      name: "copyNotifiers",
      setup(build) {
        build.onEnd(() => copyNotifiers(srcDir, distDir));
      },
    },
    {
      name: "esbuild-problem-matcher",
      setup(build) {
        build.onStart(() => {
          console.log("[esbuild-problem-matcher#onStart]");
          console.log("[watch] build started");
        });
        build.onEnd((result) => {
          result.errors.forEach(({ text, location }) => {
            console.error(`✘ [ERROR] ${text}`);
            if (location && location.file) {
              console.error(
                `    ${location.file}:${location.line}:${location.column}:`
              );
            }
          });

          console.log("[watch] build finished");

          if (result.errors.length === 0) {
            try {
              console.log(
                "[esbuild] Build successful, attempting to copy WASM files..."
              );
              copyWasms(srcDir, distDir);
              console.log("[esbuild] WASM files copy process finished.");

              console.log("[esbuild] Attempting to copy notifier binaries...");
              copyNotifiers(srcDir, distDir);
              console.log("[esbuild] Notifier binaries copy process finished.");
            } catch (e) {
              console.error(
                `[copyWasms] Error during WASM copy: ${e.message}`,
                e.stack
              );
            }
          } else {
            console.log(
              "[esbuild] Build failed with errors, skipping WASM files copy."
            );
          }

          console.log("[esbuild-problem-matcher#onEnd]");
        });
      },
    },
  ];

  /**
   * @type {import('esbuild').BuildOptions}
   */
  const extensionConfig = {
    ...buildOptions,
    plugins,
    entryPoints: ["extension.ts"],
    outfile: "dist/extension.js",
    external: ["vscode"],
    absWorkingDir: buildDir,
  };

  const extensionCtx = await esbuild.context(extensionConfig);

  if (watch) {
    await extensionCtx.watch();
  } else {
    await extensionCtx.rebuild();
    await extensionCtx.dispose();
  }
}

function copyDir(srcDir, dstDir, count = 0) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const dstPath = path.join(dstDir, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(dstPath, { recursive: true });
      count = copyDir(srcPath, dstPath, count);
    } else {
      count = count + 1;
      fs.copyFileSync(srcPath, dstPath);
    }
  }

  return count;
}

function rmDir(dirPath, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      return;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;

      const isRetryableError =
        error instanceof Error &&
        "code" in error &&
        (error.code === "ENOTEMPTY" ||
          error.code === "EBUSY" ||
          error.code === "EPERM" ||
          error.code === "EACCES");

      if (isLastAttempt) {
        try {
          console.warn(
            `[rmDir] Final attempt using alternative cleanup for ${dirPath}`
          );
          fs.rmSync(dirPath, {
            recursive: true,
            force: true,
            maxRetries: 3,
            retryDelay: 100,
          });
          return;
        } catch (finalError) {
          console.error(
            `[rmDir] Failed to remove ${dirPath} after ${maxRetries} attempts:`,
            finalError
          );
          throw finalError;
        }
      }

      if (!isRetryableError) {
        throw error;
      }

      const baseDelay = process.platform === "win32" ? 200 : 100;
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 2000);
      console.warn(
        `[rmDir] Attempt ${attempt} failed for ${dirPath}, retrying in ${delay}ms...`
      );

      const start = Date.now();
      while (Date.now() - start < delay) {
        /* Busy wait */
      }
    }
  }
}

function copyPaths(copyPaths, srcDir, dstDir) {
  copyPaths.forEach(([srcRelPath, dstRelPath, options = {}]) => {
    try {
      const stats = fs.lstatSync(path.join(srcDir, srcRelPath));

      if (stats.isDirectory()) {
        if (fs.existsSync(path.join(dstDir, dstRelPath))) {
          rmDir(path.join(dstDir, dstRelPath));
        }

        fs.mkdirSync(path.join(dstDir, dstRelPath), { recursive: true });

        const count = copyDir(
          path.join(srcDir, srcRelPath),
          path.join(dstDir, dstRelPath),
          0
        );
        console.log(
          `[copyPaths] Copied ${count} files from ${srcRelPath} to ${dstRelPath}`
        );
      } else {
        fs.copyFileSync(
          path.join(srcDir, srcRelPath),
          path.join(dstDir, dstRelPath)
        );
        console.log(`[copyPaths] Copied ${srcRelPath} to ${dstRelPath}`);
      }
    } catch (error) {
      if (options.optional) {
        console.warn(`[copyPaths] Optional file not found: ${srcRelPath}`);
      } else {
        throw error;
      }
    }
  });
}


function copyWasms(srcDir, distDir) {
  const wasmDistDir = path.join(distDir, "wasm");
  fs.mkdirSync(wasmDistDir, { recursive: true });
  // Ensure distDir exists for tiktoken
  fs.mkdirSync(distDir, { recursive: true });

  // 1. Copy web-tree-sitter/tree-sitter.wasm
  let treeSitterWasmSource;
  try {
    // Try to resolve via package.json -> location
    const pkgPath = require.resolve("web-tree-sitter/package.json");
    treeSitterWasmSource = path.join(path.dirname(pkgPath), "tree-sitter.wasm");
  } catch (e) {
    console.warn(
      `[copyWasms] Could not resolve web-tree-sitter/package.json: ${e.message}. Fallback to default path.`
    );
    // Fallback: assume node_modules/web-tree-sitter/tree-sitter.wasm
    treeSitterWasmSource = path.join(
      srcDir,
      "node_modules",
      "web-tree-sitter",
      "tree-sitter.wasm"
    );
  }

  const treeSitterWasmDest = path.join(wasmDistDir, "tree-sitter.wasm");
  if (fs.existsSync(treeSitterWasmSource)) {
    fs.copyFileSync(treeSitterWasmSource, treeSitterWasmDest);
    console.log(`[copyWasms] Copied tree-sitter.wasm to ${treeSitterWasmDest}`);
  } else {
    console.error(
      `[copyWasms] CRITICAL ERROR: tree-sitter.wasm not found at ${treeSitterWasmSource}.`
    );
  }

  // 2. Copy tiktoken/tiktoken_bg.wasm
  // NOTE: tiktoken usually expects the wasm next to the JS, keeping it in dist/ root if possible or needing specific handling.
  // We keep it in dist root as per original logic.
  let tiktokenWasmSource;
  try {
    // require.resolve("tiktoken") -> usually .../tiktoken/tiktoken.cjs
    // The wapm file is usually in the same dir or relative to it.
    // Based on previous check: .../tiktoken/tiktoken.cjs
    // And wasm is likely at .../tiktoken/tiktoken_bg.wasm
    const tiktokenEntry = require.resolve("tiktoken");
    tiktokenWasmSource = path.join(
      path.dirname(tiktokenEntry),
      "tiktoken_bg.wasm"
    );
  } catch (e) {
    console.warn(
      `[copyWasms] Could not resolve tiktoken: ${e.message}. Fallback to default path.`
    );
    tiktokenWasmSource = path.join(
      srcDir,
      "node_modules",
      "tiktoken",
      "tiktoken_bg.wasm"
    );
  }

  const tiktokenWasmDest = path.join(distDir, "tiktoken_bg.wasm");
  if (fs.existsSync(tiktokenWasmSource)) {
    fs.copyFileSync(tiktokenWasmSource, tiktokenWasmDest);
    console.log(`[copyWasms] Copied tiktoken_bg.wasm to ${tiktokenWasmDest}`);
  } else {
    console.error(
      `[copyWasms] CRITICAL ERROR: tiktoken_bg.wasm not found at ${tiktokenWasmSource}.`
    );
  }

  // 3. Copy tree-sitter-wasms (optional languages)
  // This package exports languages. finding the "out" dir might be tricky if not standard.
  // We can try to resolve "tree-sitter-wasms/package.json"
  let languageWasmDir;
  try {
    const pkgPath = require.resolve("tree-sitter-wasms/package.json");
    languageWasmDir = path.join(path.dirname(pkgPath), "out");
  } catch (e) {
    languageWasmDir = path.join(
      srcDir,
      "node_modules",
      "tree-sitter-wasms",
      "out"
    );
  }

  if (fs.existsSync(languageWasmDir)) {
    const wasmFiles = fs
      .readdirSync(languageWasmDir)
      .filter((file) => file.endsWith(".wasm"));
    if (wasmFiles.length > 0) {
      wasmFiles.forEach((filename) => {
        const sourceFile = path.join(languageWasmDir, filename);
        const destFile = path.join(wasmDistDir, filename);
        fs.copyFileSync(sourceFile, destFile);
      });
      console.log(
        `[copyWasms] Copied ${wasmFiles.length} tree-sitter language WASM(s) from ${languageWasmDir} to ${wasmDistDir}`
      );
    } else {
      console.log(`[copyWasms] No .wasm files found in ${languageWasmDir}.`);
    }
  } else {
    console.log(
      `[copyWasms] Optional: Directory for language-specific WASMs (${languageWasmDir}) not found. Skipping.`
    );
  }
}

/**
 * 直接使用 esbuild 编译 prompt/*.ts 文件到 dist/prompt/
 * 这样 F5 调试时不再依赖 tsc 先编译到 out/ 目录
 */
async function buildPromptFiles(buildDir, distDir, options = {}) {
  const promptSrcDir = path.join(buildDir, "prompt");
  const promptDistDir = path.join(distDir, "prompt");

  // 确保目标目录存在
  fs.mkdirSync(promptDistDir, { recursive: true });

  // 读取所有 .ts 文件
  const files = fs.readdirSync(promptSrcDir).filter((f) => f.endsWith(".ts"));

  if (files.length === 0) {
    console.log("[buildPromptFiles] No .ts files found in prompt directory");
    return;
  }

  // 为每个 prompt 文件单独 bundle（因为它们可能有依赖）
  for (const file of files) {
    const entryPoint = path.join(promptSrcDir, file);
    const outfile = path.join(promptDistDir, file.replace(".ts", ".js"));

    try {
      await esbuild.build({
        entryPoints: [entryPoint],
        outfile,
        bundle: true, // 需要 bundle 才能解析 @/ 别名
        minify: options.minify || false,
        sourcemap: options.sourcemap || false,
        format: "cjs",
        platform: "node",
        target: "ES2022",
        // 处理路径别名 @/
        alias: {
          "@": buildDir,
        },
        // 外部依赖，不打包进去
        external: ["vscode"],
      });
    } catch (error) {
      console.error(
        `[buildPromptFiles] Error compiling ${file}:`,
        error.message
      );
      throw error;
    }
  }

  console.log(
    `[buildPromptFiles] Compiled ${files.length} prompt files to ${promptDistDir}`
  );
}

/**
 * Copy notification binaries (like terminal-notifier for macOS)
 */
function copyNotifiers(srcDir, distDir) {
  const nodeModulesDir = path.join(srcDir, "node_modules");

  // Copy macOS terminal-notifier
  if (process.platform === "darwin") {
    const terminalNotifierSource = path.join(
      nodeModulesDir,
      "node-notifier",
      "vendor",
      "mac.noindex",
      "terminal-notifier.app"
    );

    const vendorDir = path.join(distDir, "vendor", "mac");
    const terminalNotifierDest = path.join(vendorDir, "terminal-notifier.app");

    if (fs.existsSync(terminalNotifierSource)) {
      fs.mkdirSync(vendorDir, { recursive: true });

      // Remove destination if it exists to avoid conflicts
      if (fs.existsSync(terminalNotifierDest)) {
        rmDir(terminalNotifierDest);
      }

      fs.mkdirSync(terminalNotifierDest, { recursive: true });
      const count = copyDir(terminalNotifierSource, terminalNotifierDest, 0);

      // Ensure the binary is executable
      const binaryPath = path.join(
        terminalNotifierDest,
        "Contents",
        "MacOS",
        "terminal-notifier"
      );
      if (fs.existsSync(binaryPath)) {
        fs.chmodSync(binaryPath, 0o755);
      }

      console.log(
        `[copyNotifiers] Copied terminal-notifier.app (${count} files) to ${terminalNotifierDest}`
      );
    } else {
      console.warn(
        `[copyNotifiers] terminal-notifier.app not found at ${terminalNotifierSource}. macOS notifications may not work in packaged extension.`
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
