import { defineConfig } from "vitest/config";

// 配布したテスト (tests/) だけを実行する。通信は tests/ の疑似応答 (MSW) が受ける。
// 結果の出力形式は STELLA の拡張が実行時に指定するので、ここでは決めない。
export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    environment: "node",
  },
});
