import { fileURLToPath } from "node:url";
import { defineConfig } from "playwright/test";
import e2eConfig from "../playwright.config";

const webServer = e2eConfig.webServer;
if (!webServer || Array.isArray(webServer)) throw new Error("Web の E2E サーバー設定が必要です");

export default defineConfig({
  testDir: ".",
  testMatch: "capture.spec.ts",
  retries: 1,
  workers: 1,
  use: {
    baseURL: e2eConfig.use?.baseURL,
    browserName: "chromium",
    serviceWorkers: "block",
    launchOptions: e2eConfig.use?.launchOptions,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-light",
      use: {
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 2,
        colorScheme: "light",
        locale: "ja-JP",
        timezoneId: "Asia/Tokyo",
      },
    },
  ],
  webServer: {
    ...webServer,
    cwd: fileURLToPath(new URL("..", import.meta.url)),
  },
});
