import { afterEach, describe, expect, it, vi } from "vitest";
import { deployment } from "../../scripts/lib/deployment-config.js";
import { healthMismatches } from "../../scripts/lib/deployment-health.js";
import type { Env } from "../env.js";
import { mountTestApp, request } from "../testing/route-harness.js";
import { healthzRoute } from "./healthz.js";

afterEach(() => vi.useRealTimers());

function configured(overrides: Partial<Env> = {}): Env {
  return {
    GOOGLE_CLIENT_ID: "client-id",
    GOOGLE_CLIENT_SECRET: "private-google-value",
    AUTH_JWT_SECRET: "private-jwt-value",
    ANTHROPIC_API_KEY: "private-anthropic-value",
    ALLOWED_ORIGINS: "https://example.test",
    LIBRARY_BUCKET: {} as R2Bucket,
    NARRATOR: {
      capabilities: vi.fn(async () => ({ configured: true, provider: "gemini" as const })),
      startJob: vi.fn(),
    },
    ...overrides,
  } as Env;
}
async function health(env: Env) {
  const app = mountTestApp(env, healthzRoute).app;
  return request(app, env, "/api/healthz");
}

describe("configuration health", () => {
  it("reports effective production settings without secrets or starting any work", async () => {
    const env = configured();
    const response = await health(env);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      googleOAuthConfigured: true,
      jwtConfigured: true,
      libraryEnabled: true,
      narratorAvailable: true,
      narratorGeminiConfigured: true,
      processingAvailable: true,
      aiReviewConfigured: true,
      devModeAvailable: false,
    });
    expect(JSON.stringify(body)).not.toContain("private-");
    expect(env.NARRATOR?.capabilities).toHaveBeenCalledTimes(1);
    expect(env.NARRATOR?.startJob).not.toHaveBeenCalled();
  });

  it("rejects a configured fake narrator from production health while retaining local processing", async () => {
    const env = configured();
    vi.mocked(env.NARRATOR?.capabilities ?? vi.fn()).mockResolvedValue({
      configured: true,
      provider: "fake",
    });
    const body = await (await health(env)).json();
    expect(body).toMatchObject({
      narratorAvailable: true,
      narratorGeminiConfigured: false,
      processingAvailable: true,
    });
    expect(healthMismatches(body, deployment.health)).toEqual([
      "narratorGeminiConfigured: expected true, got false",
    ]);
    expect(env.NARRATOR?.startJob).not.toHaveBeenCalled();
  });

  it("reports an unconfigured provider without starting any work", async () => {
    const env = configured();
    vi.mocked(env.NARRATOR?.capabilities ?? vi.fn()).mockResolvedValue({
      configured: false,
      provider: "unconfigured",
    });
    expect(await (await health(env)).json()).toMatchObject({
      narratorAvailable: true,
      narratorGeminiConfigured: false,
      processingAvailable: false,
    });
    expect(env.NARRATOR?.startJob).not.toHaveBeenCalled();
  });

  it("distinguishes a missing AI key and incomplete Gateway settings", async () => {
    for (const overrides of [
      { ANTHROPIC_API_KEY: " " },
      { AI_GATEWAY_ID: "gateway", CLOUDFLARE_ACCOUNT_ID: "" },
    ]) {
      const body = await (await health(configured(overrides))).json();
      expect(body).toMatchObject({ aiReviewConfigured: false });
    }
  });

  it.each([
    { LIBRARY_ENABLED: "0" },
    { LIBRARY_ENABLED: "false" },
    { LIBRARY_BUCKET: undefined },
    { NARRATOR: undefined },
  ])(
    "disables processing when required library configuration is missing: %j",
    async (overrides) => {
      expect(await (await health(configured(overrides))).json()).toMatchObject({
        processingAvailable: false,
      });
    },
  );

  it("reports a reachable narrator with processing intentionally switched off", async () => {
    const env = configured();
    vi.mocked(env.NARRATOR?.capabilities ?? vi.fn()).mockResolvedValue({
      configured: false,
      provider: "gemini",
    });
    expect(await (await health(env)).json()).toMatchObject({
      narratorAvailable: true,
      narratorGeminiConfigured: true,
      processingAvailable: false,
    });
  });

  it("keeps health available and sanitizes narrator failures", async () => {
    const env = configured();
    vi.mocked(env.NARRATOR?.capabilities ?? vi.fn()).mockRejectedValue(
      new Error("provider-private-value"),
    );
    const response = await health(env);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      narratorAvailable: false,
      narratorGeminiConfigured: false,
      processingAvailable: false,
    });
    expect(JSON.stringify(body)).not.toContain("private-value");
  });

  it("bounds a hanging narrator RPC", async () => {
    vi.useFakeTimers();
    const env = configured();
    vi.mocked(env.NARRATOR?.capabilities ?? vi.fn()).mockImplementation(
      () =>
        new Promise(() => {
          // Simulate an RPC that never responds.
        }),
    );
    const pending = health(env);
    await vi.advanceTimersByTimeAsync(3_000);
    expect(await (await pending).json()).toMatchObject({
      narratorAvailable: false,
      narratorGeminiConfigured: false,
      processingAvailable: false,
    });
    expect(vi.getTimerCount()).toBe(0);
  });
});
