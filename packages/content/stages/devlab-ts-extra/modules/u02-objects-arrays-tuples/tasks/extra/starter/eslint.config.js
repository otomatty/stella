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
      // 比較は === と !== だけを使う
      eqeqeq: "error",
      // if や for の中身が1行でも {} を付ける
      curly: "error",
      // 文字列の組み立ては + ではなくテンプレートリテラルで書く
      "prefer-template": "error",
      // { name: name } ではなく { name } と書く
      "object-shorthand": "error",
      // 引数に値を入れ直さない
      "no-param-reassign": "error",
      // 条件式には boolean を書く。null や undefined になりうる値をそのまま条件にしない
      "@typescript-eslint/strict-boolean-expressions": "error",
      // switch でユニオン型の値をすべて扱っているかを確かめる
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      // テンプレートリテラルに数値を埋め込むのは許す
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      // type と interface は、問題ごとに使い分けるので統一しない
      "@typescript-eslint/consistent-type-definitions": "off",
      // インデックス型（02章）と Record（07章）は、どちらも教えるので統一しない
      "@typescript-eslint/consistent-indexed-object-style": "off",
    },
  },
]);
