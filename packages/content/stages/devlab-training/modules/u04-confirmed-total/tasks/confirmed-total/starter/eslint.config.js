import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default defineConfig([
  globalIgnores([".stella/", "coverage/", "dist/"]),
  {
    files: ["**/*.{js,jsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  reactHooks.configs.flat.recommended,
  {
    files: ["*.config.js", "vitest.setup.js", "tests/**/*.{js,jsx}"],
    languageOptions: { globals: globals.node },
  },
]);
