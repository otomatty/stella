import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isAllowedOrigin } from "../../src/lib/cors.js";
import { googleRedirectUri } from "../../src/lib/google-oauth.js";
import { parseD1Config } from "./d1-remote.js";
import { resolveDeployDatabase, validateDeployUrls, withDeployDatabase } from "./deploy-target.js";

const TOML = readFileSync(join(import.meta.dirname, "..", "..", "wrangler.toml"), "utf8");
const ID = "12345678-1234-1234-1234-123456789abc";
const reply = (result: unknown, success = true) =>
  new Response(JSON.stringify({ success, result }));

afterEach(() => vi.unstubAllEnvs());

describe("deployment database", () => {
  it("resolves the exact new name and changes only its binding ID", async () => {
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "");
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      reply([
        { name: "stella-db-copy", uuid: "other" },
        { name: "stella-db", uuid: ID },
      ]),
    );
    const id = await resolveDeployDatabase(TOML, "test-token", fetchImpl);
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(String(url)).toContain("/d1/database?name=stella-db&per_page=100");
    expect(init?.method ?? "GET").toBe("GET");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-token");
    const patched = withDeployDatabase(TOML, id);
    expect(parseD1Config(patched, "stella-db").databaseId).toBe(ID);
    expect(patched.replace(ID, "00000000-0000-0000-0000-000000000000")).toBe(TOML);
    expect(withDeployDatabase(patched, id)).toBe(patched);
  });

  it.each([
    { result: [] },
    { result: [{ name: "stella-db-copy", uuid: ID }] },
    { result: [{ name: "stella-db", uuid: "invalid" }] },
    {
      result: [
        { name: "stella-db", uuid: ID },
        { name: "stella-db", uuid: ID },
      ],
    },
  ])("stops if the migration destination is missing or ambiguous: $result", async ({ result }) => {
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "");
    await expect(resolveDeployDatabase(TOML, "token", async () => reply(result))).rejects.toThrow(
      /Create and restore/,
    );
  });

  it("stops on API failure rather than retaining the local ID", async () => {
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "");
    await expect(
      resolveDeployDatabase(TOML, "token", async () => new Response("denied", { status: 403 })),
    ).rejects.toThrow(/HTTP 403/);
    await expect(
      resolveDeployDatabase(TOML, "token", async () => reply([], false)),
    ).rejects.toThrow(/successful database list/);
  });

  it("rejects another account before making a request", async () => {
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "wrong-account");
    const fetchImpl = vi.fn<typeof fetch>();
    await expect(resolveDeployDatabase(TOML, "token", fetchImpl)).rejects.toThrow(/account_id/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("does not patch an unrelated D1 binding or accept duplicate target bindings", () => {
    const other =
      '\n[[d1_databases]]\nbinding = "OTHER"\ndatabase_name = "other"\ndatabase_id = "other-id"\n';
    expect(withDeployDatabase(TOML + other, ID)).toContain(other);
    expect(() => withDeployDatabase(other, ID)).toThrow(/exactly one/);
    expect(() => withDeployDatabase(TOML + TOML, ID)).toThrow(/exactly one/);
  });
});

describe("deployment URLs", () => {
  const server = "https://stella-api.a-sugai.workers.dev";
  it("allows the new Web origin but rejects retired production origins", () => {
    const allowed = TOML.match(/^ALLOWED_ORIGINS = "([^"]+)"/m)?.[1] ?? "";
    expect(isAllowedOrigin("https://stella-web.a-sugai.workers.dev", allowed)).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:5173", allowed)).toBe(true);
    for (const origin of [
      "https://falcon-web.a-sugai.workers.dev",
      "https://falcon-web.pages.dev",
      "https://preview.falcon-web.pages.dev",
    ]) {
      expect(isAllowedOrigin(origin, allowed)).toBe(false);
    }
  });
  it("uses the new API for Google's callback and the new Web for invite redirects", () => {
    expect(googleRedirectUri(`${server}/api/auth/google?return_to=ignored`)).toBe(
      `${server}/api/auth/google/callback`,
    );
    expect(TOML.match(/^INVITE_REDIRECT_URL = "([^"]+)"/m)?.[1]).toBe(
      "https://stella-web.a-sugai.workers.dev",
    );
  });
  it("accepts the new API and a public materials origin", () => {
    expect(() => validateDeployUrls(server, "https://materials.example.com")).not.toThrow();
  });
  it.each([undefined, "", "https://old-api.example.com", `${server}/api`])(
    "rejects an unset or incorrect API URL: %s",
    (url) => expect(() => validateDeployUrls(url, "https://materials.example.com")).toThrow(),
  );
  it.each([undefined, "", "http://materials.example.com", "https://user:secret@example.com"])(
    "rejects an unset or non-public materials URL: %s",
    (url) => expect(() => validateDeployUrls(server, url)).toThrow(),
  );
});
