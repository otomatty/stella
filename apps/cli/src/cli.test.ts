import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readCredentials, saveCredentials } from "./credentials.js";
import { main } from "./index.js";

const TOKEN = "cli-token-should-not-print-9f3a";

const problemsManifest = {
  schemaVersion: 1,
  id: "extra/unit/calc",
  title: "計算",
  kind: "basic",
  runner: "node-test",
  problems: [
    { id: "q01-add", title: "足す" },
    { id: "q02-sub", title: "引く" },
  ],
  submit: { files: ["src/**/*.ts"] },
  protected: [],
  checks: { lint: false, format: false },
};

describe("引数", () => {
  it("不明なコマンドは 1", async () => {
    const err: string[] = [];
    const code = await main(["no-such"], { stderr: (text) => err.push(text), env: {} });
    expect(code).toBe(1);
    expect(err.join("")).toContain("不明なコマンド");
  });

  it("submit --all と問題の同時指定は 1", async () => {
    const err: string[] = [];
    const code = await main(["submit", "--all", "q01-add"], {
      stderr: (text) => err.push(text),
      env: {},
    });
    expect(code).toBe(1);
    expect(err.join("")).toContain("同時に使えません");
  });

  it("--code の値なしは 1", async () => {
    const err: string[] = [];
    const code = await main(["login", "--code"], { stderr: (text) => err.push(text), env: {} });
    expect(code).toBe(1);
    expect(err.join("")).toContain("--code");
  });

  it("引数なしと help は使い方で 0", async () => {
    const out: string[] = [];
    expect(await main([], { stdout: (text) => out.push(text), env: {} })).toBe(0);
    expect(out.join("")).toContain("使い方");
    const help: string[] = [];
    expect(await main(["--help"], { stdout: (text) => help.push(text), env: {} })).toBe(0);
    expect(help.join("")).toContain("login");
  });
});

describe("接続と課題フォルダー", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
  });

  async function temp(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), "stella-cli-"));
    dirs.push(dir);
    return dir;
  }

  async function task(manifest: unknown): Promise<string> {
    const root = await temp();
    await mkdir(path.join(root, ".stella"), { recursive: true });
    await writeFile(path.join(root, ".stella", "task.json"), JSON.stringify(manifest));
    return root;
  }

  it("ログインの出力にトークンを含めない", async () => {
    const home = await temp();
    const out: string[] = [];
    const err: string[] = [];
    const logs: string[] = [];
    for (const method of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        logs.push(args.map((item) => String(item)).join(" "));
      });
    }
    const fetchFn = vi.fn<typeof fetch>(async () => Response.json({ access_token: TOKEN }));
    const code = await main(["login", "--code", "ABCD2345"], {
      home,
      env: {},
      stdout: (text) => out.push(text),
      stderr: (text) => err.push(text),
      fetch: fetchFn,
    });
    expect(code).toBe(0);
    expect([...out, ...err, ...logs].join("")).not.toContain(TOKEN);
    await expect(readCredentials(home)).resolves.toMatchObject({ accessToken: TOKEN });
  });

  it("別の serverUrl ではトークンを送らず再ログインを促す", async () => {
    const home = await temp();
    const root = await task(problemsManifest);
    await saveCredentials({ serverUrl: "https://a.example", accessToken: TOKEN }, home);
    const fetchFn = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchFn);
    const err: string[] = [];
    const code = await main(["status"], {
      cwd: root,
      home,
      env: { STELLA_SERVER_URL: "https://b.example" },
      stderr: (text) => err.push(text),
    });
    expect(code).toBe(1);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(err.join("")).not.toContain(TOKEN);
    expect(err.join("")).toContain("やり直して");
    await expect(readCredentials(home)).resolves.toMatchObject({ accessToken: TOKEN });
  });

  it("http://example.com ではログインの交換をしない", async () => {
    const fetchFn = vi.fn<typeof fetch>();
    const err: string[] = [];
    const code = await main(["login", "--code", "ABCD2345"], {
      env: { STELLA_SERVER_URL: "http://example.com" },
      stderr: (text) => err.push(text),
      fetch: fetchFn,
    });
    expect(code).toBe(1);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(err.join("")).toContain("localhost");
  });

  it("親の課題フォルダーを見つけ、外では 1", async () => {
    const root = await task(problemsManifest);
    const child = path.join(root, "src", "nested");
    await mkdir(child, { recursive: true });
    const home = await temp();
    const inside: string[] = [];
    const insideCode = await main(["status"], {
      cwd: child,
      home,
      env: {},
      stderr: (text) => inside.push(text),
    });
    expect(insideCode).toBe(1);
    expect(inside.join("")).toContain("接続されていません");
    expect(inside.join("")).not.toContain("課題フォルダーの中で");

    const outside = await temp();
    const err: string[] = [];
    const code = await main(["status"], {
      cwd: outside,
      home,
      env: {},
      stderr: (text) => err.push(text),
    });
    expect(code).toBe(1);
    expect(err.join("")).toContain("課題フォルダーの中で実行してください");
  });

  it("問題つきでない課題は拡張で開く案内で 1", async () => {
    const root = await task({ ...problemsManifest, problems: undefined });
    const err: string[] = [];
    const code = await main(["check"], {
      cwd: root,
      home: await temp(),
      env: {},
      stderr: (text) => err.push(text),
    });
    expect(code).toBe(1);
    expect(err.join("")).toContain(
      "この課題は問題つきではありません。VS Code 拡張で開いてください",
    );
  });
});
