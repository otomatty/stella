import { describe, expect, it } from "vitest";
import { deployment } from "../../scripts/lib/deployment-config.js";
import { healthMismatches } from "../../scripts/lib/deployment-health.js";
import type { Env } from "../env.js";
import { mountTestApp, request } from "../testing/route-harness.js";
import { healthzRoute } from "./healthz.js";

function configured(overrides: Partial<Env> = {}): Env {
  return {
    GOOGLE_CLIENT_ID: "client-id",
    GOOGLE_CLIENT_SECRET: "private-google-value",
    BETTER_AUTH_SECRET: "private-better-auth-value",
    BETTER_AUTH_URL: "https://web.example.test",
    ANTHROPIC_API_KEY: "private-anthropic-value",
    ALLOWED_ORIGINS: "https://example.test",
    LIBRARY_BUCKET: {} as R2Bucket,
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
      authConfigured: true,
      libraryEnabled: true,
      aiReviewConfigured: true,
      devModeAvailable: false,
    });
    expect(JSON.stringify(body)).not.toContain("private-");
    expect(healthMismatches(body, deployment.health)).toEqual([]);
    expect(body).not.toHaveProperty("narratorAvailable");
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

  it("reports the selected OpenAI provider and model as configured without an Anthropic key", async () => {
    const openai = {
      AI_REVIEW_PROVIDER: "openai",
      AI_REVIEW_MODEL: "selected-model",
      OPENAI_API_KEY: "private-openai-value",
      ANTHROPIC_API_KEY: "",
    };
    expect(await (await health(configured(openai))).json()).toMatchObject({
      aiReviewConfigured: true,
    });
    expect(
      await (await health(configured({ ...openai, AI_REVIEW_MODEL: "" }))).json(),
    ).toMatchObject({ aiReviewConfigured: false });
    expect(JSON.stringify(await (await health(configured(openai))).json())).not.toContain(
      "private-",
    );
  });

  it.each([{ LIBRARY_ENABLED: "0" }, { LIBRARY_ENABLED: "false" }, { LIBRARY_BUCKET: undefined }])(
    "reports the library as unavailable when its configuration is missing: %j",
    async (overrides) => {
      const body = await (await health(configured(overrides))).json();
      expect(body).toMatchObject({ libraryEnabled: false });
      expect(healthMismatches(body, deployment.health)).toEqual([
        "libraryEnabled: expected true, got false",
      ]);
    },
  );
});
