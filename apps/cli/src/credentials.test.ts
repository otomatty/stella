import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  credentialsPath,
  readCredentials,
  resolveServerUrl,
  saveCredentials,
  tokenForServer,
} from "./credentials.js";

describe("接続情報", () => {
  const homes: string[] = [];
  afterEach(async () => {
    for (const home of homes.splice(0)) await rm(home, { recursive: true, force: true });
  });

  async function home(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), "stella-cli-cred-"));
    homes.push(dir);
    return dir;
  }

  it("保存した内容を読める", async () => {
    const dir = await home();
    await saveCredentials(
      { serverUrl: "https://stella.example", accessToken: "secret-token" },
      dir,
    );
    await expect(readCredentials(dir)).resolves.toEqual({
      serverUrl: "https://stella.example",
      accessToken: "secret-token",
    });
  });

  it("POSIX ではファイルが 0600 でフォルダーが 0700", async () => {
    const dir = await home();
    await saveCredentials(
      { serverUrl: "https://stella.example", accessToken: "secret-token" },
      dir,
    );
    if (process.platform === "win32") return;
    const file = await stat(credentialsPath(dir));
    const folder = await stat(path.dirname(credentialsPath(dir)));
    expect(file.mode & 0o777).toBe(0o600);
    expect(folder.mode & 0o777).toBe(0o700);
  });

  it("別の serverUrl にはトークンを渡さない", () => {
    const creds = { serverUrl: "https://a.example", accessToken: "secret-token" };
    expect(tokenForServer(creds, "https://a.example")).toBe("secret-token");
    expect(tokenForServer(creds, "https://b.example")).toBeNull();
    expect(tokenForServer(undefined, "https://a.example")).toBeNull();
  });

  it("http://example.com の宛先を拒否する", () => {
    expect(() => resolveServerUrl({ STELLA_SERVER_URL: "http://example.com" })).toThrow(
      /localhost/,
    );
    expect(resolveServerUrl({})).toBe("https://stella.saedgewell.workers.dev");
    expect(resolveServerUrl({ STELLA_SERVER_URL: "http://127.0.0.1:8787" })).toBe(
      "http://127.0.0.1:8787",
    );
    expect(resolveServerUrl({ STELLA_SERVER_URL: "http://localhost:8787/" })).toBe(
      "http://localhost:8787",
    );
  });
});
