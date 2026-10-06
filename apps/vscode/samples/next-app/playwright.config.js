import { defineConfig, devices } from "@playwright/test";

const port = 3100;

// 配布したテスト (tests/) を Chromium で実行する。画面は `next build` の結果を
// `next start` で開く (ビルドは STELLA の拡張がテストの前に行う)。
// 結果の出力形式と、ブラウザーの準備は STELLA の拡張が受け持つので、ここでは決めない。
export default defineConfig({
  testDir: "tests",
  forbidOnly: true,
  retries: 0,
  use: { baseURL: `http://127.0.0.1:${port}` },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // npm を通さずに Node.js で起動する (Windows でも同じ書き方で動く)。
    command: `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
