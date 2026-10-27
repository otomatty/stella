import { describe, expect, it, vi } from "vitest";
import { deployment } from "./deployment-config.js";
import { healthMismatches, verifyDeploymentHealth } from "./deployment-health.js";

describe("production configuration verification", () => {
  it("requires every expected field to be an exact boolean, including intentional disabled features", () => {
    expect(healthMismatches(deployment.health, deployment.health)).toEqual([]);
    expect(
      healthMismatches({ ...deployment.health, devModeAvailable: true }, deployment.health),
    ).toEqual(["devModeAvailable: expected false, got true"]);
    expect(
      healthMismatches(
        { ...deployment.health, aiReviewConfigured: "secret-value" },
        deployment.health,
      ),
    ).toEqual(["aiReviewConfigured: missing or non-boolean"]);
    expect(healthMismatches(null, deployment.health)).toHaveLength(
      Object.keys(deployment.health).length,
    );
    expect(
      healthMismatches({ ...deployment.health, aiReviewConfigured: undefined }, deployment.health),
    ).toContain("aiReviewConfigured: missing or non-boolean");
  });

  it("checks only the public learner origin, never credentials or redirects", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json(deployment.health));
    await verifyDeploymentHealth(deployment.healthOrigin, fetchImpl);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe(`${deployment.healthOrigin}/api/healthz`);
    expect(init?.redirect).toBe("error");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
    await expect(verifyDeploymentHealth("https://other.example", fetchImpl)).rejects.toThrow(
      /origin/,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries propagation and transient failures, then accepts the matching state", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("provider-secret", { status: 503 }))
      .mockResolvedValueOnce(Response.json({ ...deployment.health, processingAvailable: false }))
      .mockResolvedValueOnce(Response.json(deployment.health));
    const pause = vi.fn(async () => undefined);
    await verifyDeploymentHealth(deployment.healthOrigin, fetchImpl, pause);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(pause.mock.calls).toHaveLength(2);
  });

  it("fails the run for missing AI settings, reporting only names and booleans", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({ ...deployment.health, aiReviewConfigured: false, secret: "never-log-this" }),
    );
    const pause = vi.fn(async () => undefined);
    await expect(verifyDeploymentHealth(deployment.healthOrigin, fetchImpl, pause)).rejects.toThrow(
      "aiReviewConfigured: expected true, got false",
    );
    expect(fetchImpl).toHaveBeenCalledTimes(8);
    expect(pause).toHaveBeenCalledTimes(7);
  });

  it.each(["invalid-json", "network", "http"])("sanitizes %s failures", async (kind) => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      if (kind === "network") throw new Error("never-log-this");
      return new Response("never-log-this", { status: kind === "http" ? 502 : 200 });
    });
    try {
      await verifyDeploymentHealth(deployment.healthOrigin, fetchImpl, async () => undefined);
      throw new Error("expected failure");
    } catch (error) {
      expect(String(error)).toMatch(/Health check/);
      expect(String(error)).not.toContain("never-log-this");
    }
  });
});
