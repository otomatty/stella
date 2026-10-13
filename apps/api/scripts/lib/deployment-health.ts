import { deployment } from "./deployment-config.js";

export type HealthExpectations = Record<keyof typeof deployment.health, boolean>;

/** Only booleans and field names may enter diagnostics; never print the response body. */
export function healthMismatches(body: unknown, expected: HealthExpectations): string[] {
  const actual = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  return Object.entries(expected).flatMap(([name, value]) => {
    const got: unknown = Reflect.get(actual, name);
    if (typeof value !== "boolean") return [`${name}: expectation must be a boolean`];
    if (typeof got !== "boolean") return [`${name}: missing or non-boolean`];
    return got === value ? [] : [`${name}: expected ${value}, got ${got}`];
  });
}

export async function verifyDeploymentHealth(
  origin: string | undefined,
  fetchImpl: typeof fetch = fetch,
  pause: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<void> {
  if (origin !== deployment.healthOrigin)
    throw new Error("Health check origin must match deployment.json healthOrigin");
  let failure = "Health check failed";
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const response = await fetchImpl(new URL("/api/healthz", origin), {
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
        redirect: "error",
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) failure = `Health check: HTTP ${response.status}`;
      else {
        const mismatches = healthMismatches(await response.json(), deployment.health);
        if (!mismatches.length) return;
        failure = `Production configuration mismatch: ${mismatches.join("; ")}`;
      }
    } catch {
      failure = "Health check request failed or returned invalid JSON";
    }
    if (attempt < 7) await pause(2_000);
  }
  throw new Error(failure);
}
