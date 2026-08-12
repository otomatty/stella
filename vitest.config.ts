import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // packages/** のテストが apps/web の fixtures を辿ることがある（例:
  // export-seed-sql は fixtures の Course を読む）。web 側は `@` を src に
  // 解決するので、同じ別名をここでも張らないと `@/demo/fixtures` が落ちる。
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web/src"),
    },
  },
  test: {
    include: ["packages/**/*.test.ts", "apps/**/src/**/*.test.ts"],
    environment: "node",
  },
});
