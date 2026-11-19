import { test as base } from "playwright/test";

export { expect } from "playwright/test";

export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    await page.route(/^https?:\/\//, (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === baseURL) return route.continue();
      if (url.origin !== "http://127.0.0.1:8787") return route.abort("blockedbyclient");

      if (request.method() === "POST" && url.pathname === "/api/lesson-progress") {
        // まとめを開くだけで走る自動保存を受け止め、シードの進捗を変えない。
        return route.fulfill({ json: { cleared_stages: [] } });
      }

      return ["GET", "HEAD", "OPTIONS"].includes(request.method())
        ? route.continue()
        : route.abort("blockedbyclient");
    });
    await use(page);
  },
});
