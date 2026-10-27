import { describe, expect, it, vi } from "vitest";

import worker, { type Env } from "./index";

function setup() {
  const api = vi.fn(async (_req: Request) => new Response("api"));
  const assets = vi.fn(async (_req: Request) => new Response("assets"));
  return { env: { API: { fetch: api }, ASSETS: { fetch: assets } } as Env, api, assets };
}

describe("web worker", () => {
  it("/api/* はそのまま (Cookie・IP も) API に渡す", async () => {
    const { env, api, assets } = setup();
    const request = new Request("https://stella.example.com/api/me", {
      headers: { Cookie: "session=1", "CF-Connecting-IP": "198.51.100.9" },
    });
    await worker.fetch(request, env);
    expect(api.mock.calls[0]?.[0]).toBe(request);
    expect(assets).not.toHaveBeenCalled();
  });

  it("/api 以外は静的ファイル", async () => {
    const { env, api, assets } = setup();
    await worker.fetch(new Request("https://stella.example.com/stages"), env);
    await worker.fetch(new Request("https://stella.example.com/apix"), env);
    expect(assets).toHaveBeenCalledTimes(2);
    expect(api).not.toHaveBeenCalled();
  });
});
