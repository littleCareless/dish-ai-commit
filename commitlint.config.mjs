export default {
  extends: ["gitmoji"],
  rules: {
    "header-max-length": [2, "always", 108],
    "type-empty": [2, "never"],
    "type-enum": [
      2,
      "always",
      [
        "✨ feat",
        "🐛 fix",
        "🎉 init",
        "📚 docs",
        "🎨 style",
        "♻️ refactor",
        "⚡ perf",
        "✅ test",
        "⏪ revert",
        "🔧 chore",
        "🔨 build",
        "⚙️ ci",
      ],
    ],
  },
};
