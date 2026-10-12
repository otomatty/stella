import { describe, expect, it, vi } from "vitest";

import worker, { type Env } from "./index";

function env(trust: string | undefined) {
  const api = vi.fn(async (_req: Request) => new Response("api"));
  const assets = vi.fn(async (_req: Request) => new Response("assets"));
  return {
    env: { API: { fetch: api }, ASSETS: { fetch: assets }, TRUST_ACCESS_ASSERTION: trust } as Env,
    api,
    assets,
  };
}

const request = () =>
  new Request("https://stella.example.com/api/me", {
    headers: {
      Authorization: "Bearer clerk.jwt",
      "Cf-Access-Jwt-Assertion": "access.jwt",
      "CF-Connecting-IP": "198.51.100.9",
    },
  });

describe("web worker", () => {
  it("受講者用の入口は、利用者が付けた Access のヘッダを消して API に渡す (ほかのヘッダは残す)", async () => {
    const { env: e, api } = env("0");
    await worker.fetch(request(), e);
    const forwarded = api.mock.calls[0]?.[0];
    expect(forwarded?.headers.has("cf-access-jwt-assertion")).toBe(false);
    expect(forwarded?.headers.get("authorization")).toBe("Bearer clerk.jwt");
    expect(forwarded?.headers.get("cf-connecting-ip")).toBe("198.51.100.9");
  });

  it("設定が無いときも渡さない (既定は受講者用の入口)", async () => {
    const { env: e, api } = env(undefined);
    await worker.fetch(request(), e);
    expect(api.mock.calls[0]?.[0].headers.has("cf-access-jwt-assertion")).toBe(false);
  });

  it("講師・管理者用の入口 (Access の後ろ) は、Access の付けたヘッダをそのまま渡す", async () => {
    const { env: e, api } = env("1");
    await worker.fetch(request(), e);
    expect(api.mock.calls[0]?.[0].headers.get("cf-access-jwt-assertion")).toBe("access.jwt");
  });

  it("/api 以外は静的ファイル", async () => {
    const { env: e, api, assets } = env("0");
    await worker.fetch(new Request("https://stella.example.com/stages"), e);
    expect(assets).toHaveBeenCalledTimes(1);
    expect(api).not.toHaveBeenCalled();
  });
});
