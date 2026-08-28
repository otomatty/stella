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
    // 閾値は置かない。 落とすためではなく、 どこが手薄かを見えるようにするため
    // (数字を見ないまま閾値だけ入れると、 通すためのテストが書かれる)。
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      reportsDirectory: "coverage",
      // .tsx を外すと apps/web の React UI がまるごと母数から消え、 手薄な場所を
      // 見せるという目的と逆に「実態より高い数字」が出る。
      include: ["packages/*/src/**/*.{ts,tsx}", "apps/*/src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.ts",
        "**/*.d.ts",
        // 教材の問題データ・生成物・テストの足場は測っても意味がない
        "packages/shared/src/problems/**",
        "apps/web/src/routeTree.gen.ts",
        "apps/api/src/testing/**",
      ],
    },
  },
});
