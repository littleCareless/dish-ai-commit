import * as esbuild from "esbuild";
import * as fs from "fs";
import * as path from "path";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

function copyWasmsToDist(): void {
  const srcDir = process.cwd(); // 项目根目录
  const distDir = path.join(srcDir, "dist"); // esbuild 的输出目录

  const nodeModulesDir = path.join(srcDir, "node_modules");

  // 确保 dist 目录存在
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
    console.log(`[copyWasms] Created dist directory: ${distDir}`);
  }

  // Main tree-sitter WASM file.
  const treeSitterWasmSource = path.join(
    nodeModulesDir,
    "web-tree-sitter",
    "tree-sitter.wasm"
  );
  const treeSitterWasmDest = path.join(distDir, "tree-sitter.wasm");
  if (fs.existsSync(treeSitterWasmSource)) {
    fs.copyFileSync(treeSitterWasmSource, treeSitterWasmDest);
    console.log(`[copyWasms] Copied tree-sitter.wasm to ${treeSitterWasmDest}`);
  } else {
    // This is critical based on the user's error message.
    console.error(
      `[copyWasms] CRITICAL ERROR: tree-sitter.wasm not found at ${treeSitterWasmSource}. This is the likely cause of the 'ENOENT' error for tree-sitter.wasm.`
    );
  }

  // Copy language-specific WASM files.
  const languageWasmDir = path.join(nodeModulesDir, "tree-sitter-wasms", "out");
  if (fs.existsSync(languageWasmDir)) {
    const wasmFiles = fs
      .readdirSync(languageWasmDir)
      .filter((file) => file.endsWith(".wasm"));
    if (wasmFiles.length > 0) {
      wasmFiles.forEach((filename) => {
        const sourceFile = path.join(languageWasmDir, filename);
        const destFile = path.join(distDir, filename);
        fs.copyFileSync(sourceFile, destFile);
      });
      console.log(
        `[copyWasms] Copied ${wasmFiles.length} tree-sitter language WASM(s) from ${languageWasmDir} to ${distDir}`
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

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outfile: "dist/extension.js",
    external: ["vscode"],
    logLevel: "warning",
    plugins: [esbuildProblemMatcherPlugin],
  });

  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: "esbuild-problem-matcher",

  setup(build: import("esbuild").PluginBuild) {
    build.onStart(() => {
      console.log("[watch] build started");
    });
    build.onEnd((result: import("esbuild").BuildResult) => {
      result.errors.forEach(
        ({
          text,
          location,
        }: {
          text: string;
          location: import("esbuild").Location | null;
        }) => {
          console.error(`✘ [ERROR] ${text}`);
          if (location == null) return;
          console.error(
            `    ${location.file}:${location.line}:${location.column}:`
          );
        }
      );
      console.log("[watch] build finished");

      if (result.errors.length === 0) {
        try {
          console.log(
            "[esbuild] Build successful, attempting to copy WASM files..."
          );
          copyWasmsToDist(); // Call the function to copy WASMs
          console.log("[esbuild] WASM files copy process finished.");
        } catch (e: any) {
          // Catch potential errors during copy
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
    });
  },
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
