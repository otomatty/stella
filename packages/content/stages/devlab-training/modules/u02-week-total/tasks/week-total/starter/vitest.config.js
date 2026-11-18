import { defineConfig } from "vitest/config";

// 配布したテストから、受講者が書くテストも読み込む。型の確認 (expectTypeOf) は tsc の手順が見る。
// 結果の出力形式は STELLA の拡張が実行時に指定するので、ここでは決めない。
export default defineConfig({
  test: {
    include: ["tests/sum-week.test.ts"],
    environment: "node",
  },
});
