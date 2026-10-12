import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isAllowedOrigin } from "../../src/lib/cors.js";
import { parseD1Config } from "./d1-remote.js";
import {
  resolveDeployDatabase,
  validateAccessSettings,
  validateDeployUrls,
  withAccessVars,
  withDeployDatabase,
} from "./deploy-target.js";

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
  // API は Web の Worker が同じオリジンで中継する (Cloudflare Access が守るホスト)。
  const server = "https://stella-web.saedgewell.workers.dev";
  it("allows the new Web origin but rejects retired production origins", () => {
    const allowed = TOML.match(/^ALLOWED_ORIGINS = "([^"]+)"/m)?.[1] ?? "";
    expect(isAllowedOrigin("https://stella-web.saedgewell.workers.dev", allowed)).toBe(true);
    for (const origin of [
      // 本番は JWT の戻り先にも使うので、利用者の PC の開発サーバーを許さない (ローカルは .dev.vars)。
      "http://127.0.0.1:5173",
      "http://localhost:5173",
      "https://falcon-web.a-sugai.workers.dev",
      "https://stella-web.a-sugai.workers.dev",
      "https://falcon-web.pages.dev",
      "https://preview.falcon-web.pages.dev",
    ]) {
      expect(isAllowedOrigin(origin, allowed)).toBe(false);
    }
  });
  it("keeps the local Web origins in .dev.vars.example (wrangler dev overrides [vars] with it)", () => {
    const example = readFileSync(
      join(import.meta.dirname, "..", "..", ".dev.vars.example"),
      "utf8",
    );
    const local = example.match(/^ALLOWED_ORIGINS=(.+)$/m)?.[1] ?? "";
    expect(isAllowedOrigin("http://localhost:5173", local)).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:5173", local)).toBe(true);
  });
  it("uses the new Web for invite redirects", () => {
    expect(TOML.match(/^INVITE_REDIRECT_URL = "([^"]+)"/m)?.[1]).toBe(
      "https://stella-web.saedgewell.workers.dev",
    );
  });
  it("accepts the Web origin (same-origin API) and a public materials origin", () => {
    expect(() => validateDeployUrls(server, "https://materials.example.com")).not.toThrow();
  });
  it.each([
    undefined,
    "",
    "https://old-api.example.com",
    "https://stella-api.saedgewell.workers.dev",
    `${server}/api`,
  ])("rejects an unset or incorrect API URL: %s", (url) =>
    expect(() => validateDeployUrls(url, "https://materials.example.com")).toThrow(),
  );
  it.each([undefined, "", "http://materials.example.com", "https://user:secret@example.com"])(
    "rejects an unset or non-public materials URL: %s",
    (url) => expect(() => validateDeployUrls(server, url)).toThrow(),
  );
});

describe("Cloudflare Access settings", () => {
  const AUD = "a".repeat(64);

  it("normalizes the team domain and accepts one or more AUD tags", () => {
    expect(validateAccessSettings("https://Stella.cloudflareaccess.com/", AUD)).toEqual({
      teamDomain: "stella.cloudflareaccess.com",
      aud: AUD,
    });
    expect(
      validateAccessSettings("stella.cloudflareaccess.com", `${AUD}, ${"b".repeat(64)}`).aud,
    ).toBe(`${AUD},${"b".repeat(64)}`);
  });

  it.each([
    [undefined, AUD],
    ["", AUD],
    ["evil.example.com", AUD],
    ["stella.cloudflareaccess.com/path", AUD],
    ["stella.cloudflareaccess.com", undefined],
    ["stella.cloudflareaccess.com", "not-a-tag"],
  ])("stops the deploy without valid settings: %s / %s", (domain, aud) => {
    expect(() => validateAccessSettings(domain, aud)).toThrow();
  });

  it("writes the settings into [vars] only, replacing previous values", () => {
    const settings = { teamDomain: "stella.cloudflareaccess.com", aud: AUD };
    const patched = withAccessVars(TOML, settings);
    const vars = patched.slice(patched.indexOf("[vars]"), patched.indexOf("[[unsafe.bindings]]"));
    expect(vars).toContain('ACCESS_TEAM_DOMAIN = "stella.cloudflareaccess.com"');
    expect(vars).toContain(`ACCESS_AUD = "${AUD}"`);
    const again = withAccessVars(patched, { ...settings, aud: "c".repeat(64) });
    expect(again.match(/^ACCESS_AUD = /gm)).toHaveLength(1);
    expect(again).toContain(`ACCESS_AUD = "${"c".repeat(64)}"`);
    expect(again.replace(/^ACCESS_(TEAM_DOMAIN|AUD) = .*\n/gm, "")).toBe(
      TOML.replace(/^ACCESS_(TEAM_DOMAIN|AUD) = .*\n/gm, ""),
    );
  });
});
