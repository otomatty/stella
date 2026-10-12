import { afterEach, describe, expect, it, vi } from "vitest";

import { buildVerificationUrl } from "./certificates-api";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("buildVerificationUrl", () => {
  it("受講者用の入口 (VITE_SERVER_URL) で作る (講師・管理者用の入口の URL を外へ渡さない)", () => {
    vi.stubEnv("VITE_AUTH_MODE", "clerk");
    vi.stubEnv("VITE_SERVER_URL", "https://stella-web.example.com/");
    expect(buildVerificationUrl("AB12")).toBe("https://stella-web.example.com/verify/AB12");
  });

  it("ローカル開発では API のオリジン (VITE_SERVER_URL) ではなく、開いている画面で作る", () => {
    vi.stubEnv("VITE_AUTH_MODE", "dev-token");
    vi.stubEnv("VITE_SERVER_URL", "http://127.0.0.1:8787");
    vi.stubGlobal("window", { location: { origin: "http://localhost:5173" } });
    expect(buildVerificationUrl("AB12")).toBe("http://localhost:5173/verify/AB12");
  });

  it("ログインなしで開ける /verify/<コード> を組み立てる (クエリ文字列は使わない)", () => {
    vi.stubEnv("VITE_AUTH_MODE", "dev-token");
    expect(buildVerificationUrl("AB12-CD34")).toBe("/verify/AB12-CD34");
    expect(buildVerificationUrl("a/b c")).toBe("/verify/a%2Fb%20c");
  });
});
