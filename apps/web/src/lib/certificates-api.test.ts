import { afterEach, describe, expect, it, vi } from "vitest";

import { buildVerificationUrl } from "./certificates-api";

afterEach(() => vi.unstubAllEnvs());

describe("buildVerificationUrl", () => {
  it("受講者用の入口 (VITE_SERVER_URL) で作る (講師・管理者用の入口の URL を外へ渡さない)", () => {
    vi.stubEnv("VITE_SERVER_URL", "https://stella-web.example.com/");
    expect(buildVerificationUrl("AB12")).toBe("https://stella-web.example.com/verify/AB12");
  });

  it("Access の Bypass にしてある /verify/<コード> を組み立てる (クエリ文字列は使わない)", () => {
    expect(buildVerificationUrl("AB12-CD34")).toBe("/verify/AB12-CD34");
    expect(buildVerificationUrl("a/b c")).toBe("/verify/a%2Fb%20c");
  });
});
