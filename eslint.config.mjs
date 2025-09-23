import stylistic from "@stylistic/eslint-plugin";
import parserTs from "@typescript-eslint/parser";

export default [
  {
    ignores: ["**/out", "**/dist", "**/*.d.ts"],
  },
  {
    files: ["src/**/*.ts"],
    plugins: {
      "@stylistic": stylistic,
    },

    languageOptions: {
      parser: parserTs,
      ecmaVersion: 6,
      sourceType: "module",
    },

    rules: {
      // "@stylistic/ts/naming-convention": [
      //   "warn",
      //   {
      //     selector: "import",
      //     format: ["camelCase", "PascalCase"],
      //   },
      // ],

      "@stylistic/semi": "warn",
      curly: "warn",
      eqeqeq: "warn",
      "no-throw-literal": "warn",
      semi: "off",
    },
  },
];
