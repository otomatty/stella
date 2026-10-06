import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";

export default defineConfig([
  globalIgnores([".stella/", "dist/", "test-results/", "playwright-report/"]),
  {
    files: ["**/*.js"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["*.config.js", "tests/**/*.js"],
    languageOptions: { globals: globals.node },
  },
]);
