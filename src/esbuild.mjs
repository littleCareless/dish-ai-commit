import * as esbuild from "esbuild"
import * as fs from "fs"
import process from "node:process"
import * as path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
	const name = "extension"
	const production = process.argv.includes("--production")
	const watch = process.argv.includes("--watch")
	const minify = production
	const sourcemap = !production

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
	}

	const srcDir = path.dirname(__dirname) // 项目根目录
	const buildDir = __dirname // src 目录
	const distDir = path.join(buildDir, "dist")

	if (fs.existsSync(distDir)) {
		console.log(`[${name}] Cleaning dist directory: ${distDir}`)
		fs.rmSync(distDir, { recursive: true, force: true })
	}

	/**
	 * @type {import('esbuild').Plugin[]}
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
							["webview-ui-dist", "webview-ui-dist"],
						],
						srcDir,
						buildDir,
					)
				})
			},
		},
		{
			name: "copyWasms",
			setup(build) {
				build.onEnd(() => copyWasms(srcDir, distDir))
			},
		},
		{
			name: "esbuild-problem-matcher",
			setup(build) {
				build.onStart(() => {
					console.log("[esbuild-problem-matcher#onStart]")
					console.log("[watch] build started")
				})
				build.onEnd((result) => {
					result.errors.forEach(({ text, location }) => {
						console.error(`✘ [ERROR] ${text}`)
						if (location && location.file) {
							console.error(`    ${location.file}:${location.line}:${location.column}:`)
						}
					})

					console.log("[watch] build finished")

					if (result.errors.length === 0) {
						try {
							console.log("[esbuild] Build successful, attempting to copy WASM files...")
							copyWasms(srcDir, distDir)
							console.log("[esbuild] WASM files copy process finished.")
						} catch (e) {
							console.error(`[copyWasms] Error during WASM copy: ${e.message}`, e.stack)
						}
					} else {
						console.log("[esbuild] Build failed with errors, skipping WASM files copy.")
					}
					
					console.log("[esbuild-problem-matcher#onEnd]")
				})
			},
		},
	]

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
	}

	const extensionCtx = await esbuild.context(extensionConfig)

	if (watch) {
		await extensionCtx.watch()
	} else {
		await extensionCtx.rebuild()
		await extensionCtx.dispose()
	}
}

function copyDir(srcDir, dstDir, count = 0) {
	const entries = fs.readdirSync(srcDir, { withFileTypes: true })

	for (const entry of entries) {
		const srcPath = path.join(srcDir, entry.name)
		const dstPath = path.join(dstDir, entry.name)

		if (entry.isDirectory()) {
			fs.mkdirSync(dstPath, { recursive: true })
			count = copyDir(srcPath, dstPath, count)
		} else {
			count = count + 1
			fs.copyFileSync(srcPath, dstPath)
		}
	}

	return count
}

function rmDir(dirPath, maxRetries = 5) {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			fs.rmSync(dirPath, { recursive: true, force: true })
			return
		} catch (error) {
			const isLastAttempt = attempt === maxRetries

			const isRetryableError =
				error instanceof Error &&
				"code" in error &&
				(error.code === "ENOTEMPTY" ||
					error.code === "EBUSY" ||
					error.code === "EPERM" ||
					error.code === "EACCES")

			if (isLastAttempt) {
				try {
					console.warn(`[rmDir] Final attempt using alternative cleanup for ${dirPath}`)
					fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
					return
				} catch (finalError) {
					console.error(`[rmDir] Failed to remove ${dirPath} after ${maxRetries} attempts:`, finalError)
					throw finalError
				}
			}

			if (!isRetryableError) {
				throw error
			}

			const baseDelay = process.platform === "win32" ? 200 : 100
			const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 2000)
			console.warn(`[rmDir] Attempt ${attempt} failed for ${dirPath}, retrying in ${delay}ms...`)

			const start = Date.now()
			while (Date.now() - start < delay) {
				/* Busy wait */
			}
		}
	}
}

function copyPaths(copyPaths, srcDir, dstDir) {
	copyPaths.forEach(([srcRelPath, dstRelPath, options = {}]) => {
		try {
			const stats = fs.lstatSync(path.join(srcDir, srcRelPath))

			if (stats.isDirectory()) {
				if (fs.existsSync(path.join(dstDir, dstRelPath))) {
					rmDir(path.join(dstDir, dstRelPath))
				}

				fs.mkdirSync(path.join(dstDir, dstRelPath), { recursive: true })

				const count = copyDir(path.join(srcDir, srcRelPath), path.join(dstDir, dstRelPath), 0)
				console.log(`[copyPaths] Copied ${count} files from ${srcRelPath} to ${dstRelPath}`)
			} else {
				fs.copyFileSync(path.join(srcDir, srcRelPath), path.join(dstDir, dstRelPath))
				console.log(`[copyPaths] Copied ${srcRelPath} to ${dstRelPath}`)
			}
		} catch (error) {
			if (options.optional) {
				console.warn(`[copyPaths] Optional file not found: ${srcRelPath}`)
			} else {
				throw error
			}
		}
	})
}

function copyWasms(srcDir, distDir) {
	const nodeModulesDir = path.join(srcDir, "node_modules")

	fs.mkdirSync(distDir, { recursive: true })

	// Main tree-sitter WASM file.
	const treeSitterWasmSource = path.join(
		nodeModulesDir,
		"web-tree-sitter",
		"tree-sitter.wasm"
	)
	const treeSitterWasmDest = path.join(distDir, "tree-sitter.wasm")
	if (fs.existsSync(treeSitterWasmSource)) {
		fs.copyFileSync(treeSitterWasmSource, treeSitterWasmDest)
		console.log(`[copyWasms] Copied tree-sitter.wasm to ${treeSitterWasmDest}`)
	} else {
		console.error(
			`[copyWasms] CRITICAL ERROR: tree-sitter.wasm not found at ${treeSitterWasmSource}.`
		)
	}

	// Copy tiktoken WASM file.
	const tiktokenWasmSource = path.join(
		nodeModulesDir,
		"tiktoken",
		"tiktoken_bg.wasm"
	)
	const tiktokenWasmDest = path.join(distDir, "tiktoken_bg.wasm")
	if (fs.existsSync(tiktokenWasmSource)) {
		fs.copyFileSync(tiktokenWasmSource, tiktokenWasmDest)
		console.log(`[copyWasms] Copied tiktoken_bg.wasm to ${tiktokenWasmDest}`)
	} else {
		console.error(
			`[copyWasms] CRITICAL ERROR: tiktoken_bg.wasm not found at ${tiktokenWasmSource}.`
		)
	}

	// Copy language-specific WASM files.
	const languageWasmDir = path.join(nodeModulesDir, "tree-sitter-wasms", "out")
	if (fs.existsSync(languageWasmDir)) {
		const wasmFiles = fs
			.readdirSync(languageWasmDir)
			.filter((file) => file.endsWith(".wasm"))
		if (wasmFiles.length > 0) {
			wasmFiles.forEach((filename) => {
				const sourceFile = path.join(languageWasmDir, filename)
				const destFile = path.join(distDir, filename)
				fs.copyFileSync(sourceFile, destFile)
			})
			console.log(
				`[copyWasms] Copied ${wasmFiles.length} tree-sitter language WASM(s) from ${languageWasmDir} to ${distDir}`
			)
		} else {
			console.log(`[copyWasms] No .wasm files found in ${languageWasmDir}.`)
		}
	} else {
		console.log(
			`[copyWasms] Optional: Directory for language-specific WASMs (${languageWasmDir}) not found. Skipping.`
		)
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
