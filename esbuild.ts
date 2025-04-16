import * as esbuild from "esbuild";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

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
    });
  },
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
