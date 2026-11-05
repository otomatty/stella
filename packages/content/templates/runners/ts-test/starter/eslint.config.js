import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

// 型を使う規則 (strictTypeChecked) で、any・as による言い切り・@ts-ignore などの逃げを止める。
// 課題のファイルにコメントで規則を切る書き方 (eslint-disable) は効かないようにする。
export default defineConfig([
  globalIgnores([".stella/", "coverage/", "eslint.config.js", "vitest.config.js"]),
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    linterOptions: { noInlineConfig: true },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // テンプレートリテラルに数値を埋め込むのは許す。
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
]);
