const extensions = [
  "tla",
  "js",
  "jsx",
  "ts",
  "vue",
  "tsx",
  "py",
  // Rust
  "rs",
  "go",
  // C
  "c",
  "h",
  // C++
  "cpp",
  "hpp",
  // C#
  "cs",
  // Ruby
  "rb",
  "java",
  "php",
  "swift",
  // Solidity
  "sol",
  // Kotlin
  "kt",
  "kts",
  // Elixir
  "ex",
  "exs",
  // Elisp
  "el",
  // HTML
  "html",
  "htm",
  // Markdown
  "md",
  "markdown",
  // JSON
  "json",
  // CSS
  "css",
  // SystemRDL
  "rdl",
  // OCaml
  "ml",
  "mli",
  // Lua
  "lua",
  // Scala
  "scala",
  // TOML
  "toml",
  // Zig
  "zig",
  // Elm
  "elm",
  // Embedded Template
  "ejs",
  "erb",
].map((e) => `.${e}`);

export { extensions };

// Filter out markdown extensions for the scanner
export const scannerExtensions = extensions.filter(
  (ext) => ext !== ".md" && ext !== ".markdown"
);
