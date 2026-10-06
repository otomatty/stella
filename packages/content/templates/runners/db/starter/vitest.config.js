import { defineConfig } from "vitest/config";

// 配布したテスト (tests/) だけを実行する。PostgreSQL は PGlite でメモリの中に作る。
// データベースの準備には数秒かかるので、準備 (beforeAll など) の待ち時間を長めにする。
// PGlite は 1 つで数百 MB のメモリを使うので、テストのファイルは 1 つずつ実行する。
// 結果の出力形式は STELLA の拡張が実行時に指定するので、ここでは決めない。
export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    environment: "node",
    hookTimeout: 60_000,
    testTimeout: 20_000,
    fileParallelism: false,
  },
});
