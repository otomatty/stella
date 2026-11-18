import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// 開発サーバー (npm run dev) とテストで同じ設定を使う。
// テストは配布したテスト (tests/) だけを、ブラウザーの代わりの jsdom の中で実行する。
// 結果の出力形式は STELLA の拡張が実行時に指定するので、ここでは決めない。
export default defineConfig({
  plugins: [react()],
  test: {
    include: ["tests/**/*.test.{js,jsx}"],
    environment: "jsdom",
    setupFiles: ["./vitest.setup.js"],
  },
});
