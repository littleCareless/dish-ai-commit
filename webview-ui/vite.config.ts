import { execSync } from "child_process";
import fs from "fs";
import path, { resolve } from "path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin, type PluginOption } from "vite";

function getGitSha() {
  let gitSha: string | undefined = undefined;

  try {
    gitSha = execSync("git rev-parse HEAD").toString().trim();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    // Do nothing.
  }

  return gitSha;
}

const wasmPlugin = (): Plugin => ({
  name: "wasm",
  async load(id) {
    if (id.endsWith(".wasm")) {
      const wasmBinary = await import(id);

      return `
          			const wasmModule = new WebAssembly.Module(${wasmBinary.default});
          			export default wasmModule;
        		`;
    }
  },
});

const persistPortPlugin = (): Plugin => ({
  name: "write-port-to-file",
  configureServer(viteDevServer) {
    viteDevServer?.httpServer?.once("listening", () => {
      const address = viteDevServer?.httpServer?.address();
      const port = address && typeof address === "object" ? address.port : null;

      if (port) {
        fs.writeFileSync(
          resolve(__dirname, "..", ".vite-port"),
          port.toString(),
        );
        console.log(`[Vite Plugin] Server started on port ${port}`);
      } else {
        console.warn("[Vite Plugin] Could not determine server port");
      }
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const outDir = "../webview-ui-dist";

  const pkg = JSON.parse(
    fs.readFileSync(path.join(__dirname, "package.json"), "utf8"),
  );
  const gitSha = getGitSha();

  const define: Record<string, string> = {
    "process.platform": JSON.stringify(process.platform),
    "process.env.VSCODE_TEXTMATE_DEBUG": JSON.stringify(
      process.env.VSCODE_TEXTMATE_DEBUG,
    ),
    "process.env.PKG_NAME": JSON.stringify(pkg.name),
    "process.env.PKG_VERSION": JSON.stringify(pkg.version),
    "process.env.PKG_OUTPUT_CHANNEL": JSON.stringify("Dish-AI-Commit"),
    ...(gitSha ? { "process.env.PKG_SHA": JSON.stringify(gitSha) } : {}),
  };

  const plugins: PluginOption[] = [
    react(),
    tailwindcss(),
    persistPortPlugin(),
    wasmPlugin(),
  ];

  return {
    plugins,
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
        "@shared": resolve(__dirname, "../shared"),
      },
      // 确保只有一个 React 实例，避免 "Invalid hook call" 错误
      dedupe: ["react", "react-dom", "@microsoft/fast-web-utilities"],
    },
    build: {
      outDir,
      emptyOutDir: true,
      reportCompressedSize: false,
      // Generate complete source maps with original TypeScript sources
      sourcemap: true,
      // Ensure source maps are properly included in the build
      minify: mode === "production" ? "esbuild" : false,
      rollupOptions: {
        external: [
          "vscode-webview",
          "vscode-jsonrpc/lib/common/events.js",
          "vscode-jsonrpc/lib/common/cancellation.js",
          "vscode-languageserver-types",
          "@chevrotain/regexp-to-ast",
        ],
        output: {
          entryFileNames: `assets/[name].js`,
          chunkFileNames: (chunkInfo) => {
            if (chunkInfo.name === "mermaid-bundle") {
              return `assets/mermaid-bundle.js`;
            }
            // Default naming for other chunks, ensuring uniqueness from entry
            return `assets/chunk-[hash].js`;
          },
          assetFileNames: (assetInfo) => {
            if (
              assetInfo.name &&
              (assetInfo.name.endsWith(".woff2") ||
                assetInfo.name.endsWith(".woff") ||
                assetInfo.name.endsWith(".ttf"))
            ) {
              return "assets/fonts/[name][extname]";
            }
            // Ensure source maps are included in the build
            if (assetInfo.name && assetInfo.name.endsWith(".map")) {
              return "assets/[name]";
            }
            return "assets/[name][extname]";
          },
          manualChunks: (id: string, { getModuleInfo }) => {
            // Consolidate all mermaid code and its direct large dependencies (like dagre)
            // into a single chunk. The 'channel.js' error often points to dagre.
            if (
              id.includes("node_modules/mermaid") ||
              id.includes("node_modules/dagre") || // dagre is a common dep for graph layout
              id.includes("node_modules/cytoscape") // another potential graph lib
              // Add other known large mermaid dependencies if identified
            ) {
              return "mermaid-bundle";
            }

            // Check if the module is part of any explicitly defined mermaid-related dynamic import
            // This is a more advanced check if simple path matching isn't enough.
            const moduleInfo = getModuleInfo(id);
            if (
              moduleInfo?.importers.some((importer: string) =>
                importer.includes("node_modules/mermaid"),
              )
            ) {
              return "mermaid-bundle";
            }
            if (
              moduleInfo?.dynamicImporters.some((importer: string) =>
                importer.includes("node_modules/mermaid"),
              )
            ) {
              return "mermaid-bundle";
            }
          },
        },
      },
    },
    server: {
      hmr: {
        host: "localhost",
        protocol: "ws",
      },
      cors: {
        origin: "*",
        methods: "*",
        allowedHeaders: "*",
      },
    },
    define,
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "@arco-design/web-react",
        "mermaid",
        "dagre", // Explicitly include dagre for pre-bundling
        "@microsoft/fast-web-utilities", // Include this dependency for pre-bundling
        // Add other known large mermaid dependencies if identified
      ],
      exclude: [
        "@vscode/codicons",
        "vscode-oniguruma",
        "shiki",
        "vscode-jsonrpc",
        "vscode-languageserver-types",
        "@chevrotain/regexp-to-ast",
        "@vscode/webview-ui-toolkit",
      ],
      force: true, // Force re-optimization
    },
    assetsInclude: ["**/*.wasm", "**/*.wav"],
  };
});
