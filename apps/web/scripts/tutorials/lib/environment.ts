import { spawn, type ChildProcess } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";

export const WEB_ROOT = path.resolve(import.meta.dirname, "../../..");
const REPO = path.resolve(WEB_ROOT, "../..");
const API = path.join(REPO, "apps/api");
export const WORK_DIR = path.join(os.tmpdir(), "stella-tutorials");

function readDevVar(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  try {
    for (const raw of readFileSync(path.join(API, ".dev.vars"), "utf8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0 || line.slice(0, eq).trim() !== key) continue;
      return line
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  } catch {
    /* env のみで判断する */
  }
  return undefined;
}

export function jwtSecret(): string {
  const secret = readDevVar("AUTH_JWT_SECRET");
  if (!secret)
    throw new Error("AUTH_JWT_SECRET を環境変数か apps/api/.dev.vars に設定してください");
  return secret;
}

export function mintToken(secret: string, id: string): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const data = `${encode({ alg: "HS256" })}.${encode({ iss: "stella-api", aud: "stella-web", sub: id, email: `${id}@example.local`, iat: now, exp: now + 3600 })}`;
  return `${data}.${createHmac("sha256", secret).update(data).digest("base64url")}`;
}

async function freePort(port = 0): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("ポートを取得できません"));
        return;
      }
      server.close((err) => (err ? reject(err) : resolve(address.port)));
    });
  });
}

async function command(cwd: string, args: string[], env = process.env): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("bun", args, { cwd, env, stdio: "inherit" });
    child.on("error", () => reject(new Error("bun を起動できませんでした")));
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${args[0]} が失敗しました (${code})`)),
    );
  });
}

/** 台本の固定 SQL を、シェルを通さず 1 つの引数で Wrangler に渡す。 */
export function seedSqlArgs(persistTo: string, sql: string): string[] {
  return [
    "x",
    "wrangler",
    "d1",
    "execute",
    "stella-db",
    "--local",
    "--persist-to",
    persistTo,
    "--command",
    sql,
  ];
}

async function hashTree(dir: string, hash: ReturnType<typeof createHash>): Promise<void> {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    hash.update(entry.name);
    hash.update("\0");
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await hashTree(file, hash);
    else {
      hash.update(await readFile(file));
      hash.update("\0");
    }
  }
}

async function seedSnapshot(): Promise<string> {
  const hash = createHash("sha256");
  // seed ロジックの変更でも写しを更新する。
  for (const dir of [
    "apps/api/drizzle",
    "packages/content/stages",
    "packages/shared/src",
    "packages/shared/scripts",
    "apps/api/scripts",
  ]) {
    await hashTree(path.join(REPO, dir), hash);
  }
  const snapshot = path.join(WORK_DIR, `seed-${hash.digest("hex")}`);
  if (existsSync(snapshot)) return snapshot;
  const pending = `${snapshot}-${process.pid}.pending`;
  await rm(pending, { recursive: true, force: true });
  await mkdir(pending, { recursive: true });
  try {
    await command(API, [
      "x",
      "wrangler",
      "d1",
      "migrations",
      "apply",
      "stella-db",
      "--local",
      "--persist-to",
      pending,
    ]);
    await command(API, ["scripts/seed-d1.ts", "--persist-to", pending]);
    await rename(pending, snapshot);
  } catch (err) {
    await rm(pending, { recursive: true, force: true });
    throw err;
  }
  return snapshot;
}

async function waitReady(base: string, pathname: string, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (!child.pid || child.exitCode !== null || child.signalCode !== null)
      throw new Error("サーバーが起動前に終了しました");
    try {
      const response = await fetch(`${base}${pathname}`, { signal: AbortSignal.timeout(1000) });
      await response.arrayBuffer();
      if (response.ok) return;
    } catch {
      /* 起動待ち */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("サーバーが起動しませんでした");
}

async function waitUntilDown(base: string): Promise<void> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/api/healthz`, { signal: AbortSignal.timeout(1000) });
      await response.arrayBuffer();
    } catch (error) {
      if (error instanceof Error && error.name !== "TimeoutError" && error.name !== "AbortError")
        return;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("API が停止しませんでした。D1 の復元を中止します");
}

function server(cwd: string, args: string[], env = process.env): ChildProcess {
  const child = spawn("bun", ["x", ...args], {
    cwd,
    env,
    detached: process.platform !== "win32",
    stdio: "ignore",
  });
  child.on("error", () => {
    /* waitReady が起動の失敗を報告する */
  });
  return child;
}

async function stop(child: ChildProcess | undefined): Promise<void> {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  const kill = (signal: NodeJS.Signals) => {
    try {
      if (child.pid && process.platform !== "win32") process.kill(-child.pid, signal);
      else child.kill(signal);
    } catch {
      /* 終了済み */
    }
  };
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  kill("SIGTERM");
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    exited,
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, 5000);
    }),
  ]);
  clearTimeout(timer);
  kill("SIGKILL");
  await exited;
}

/** API の終了を待ってから D1 の写しを戻す。開発者の .wrangler/state には触れない。 */
export class TutorialEnvironment {
  private api?: ChildProcess;
  private web?: ChildProcess;
  private snapshot = "";
  private apiPort = 0;
  private state = path.join(WORK_DIR, `state-${process.pid}`);
  base = "";

  async boot(skipBuild: boolean): Promise<string> {
    await mkdir(WORK_DIR, { recursive: true });
    this.apiPort = await freePort();
    this.snapshot = await seedSnapshot();
    const buildInfo = path.join(WORK_DIR, "build-api-port.json");
    if (!skipBuild) {
      await command(WEB_ROOT, ["x", "vite", "build"], {
        ...process.env,
        VITE_SERVER_URL: `http://127.0.0.1:${this.apiPort}`,
      });
      await writeFile(buildInfo, JSON.stringify({ port: this.apiPort }));
    } else {
      // Vite の bundle に焼き込まれた、前の収録の API ポートを再利用する。
      try {
        const info = JSON.parse(await readFile(buildInfo, "utf8")) as { port: number };
        if (!Number.isInteger(info.port) || info.port < 1 || info.port > 65535) throw new Error();
        this.apiPort = info.port;
      } catch {
        throw new Error("--skip-build の前に一度ビルド付きで収録してください");
      }
    }
    let webPort = await freePort();
    while (webPort === this.apiPort) webPort = await freePort();
    this.base = `http://127.0.0.1:${webPort}`;
    this.web = server(WEB_ROOT, [
      "vite",
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      String(webPort),
      "--strictPort",
    ]);
    await waitReady(this.base, "/", this.web);
    return this.base;
  }

  async reset(secret: string, seedSql: readonly string[] = []): Promise<void> {
    if (this.api) {
      await stop(this.api);
      await waitUntilDown(`http://127.0.0.1:${this.apiPort}`);
      this.api = undefined;
    }
    // 再利用するポートが他の API に取られていれば、収録せずに止める。
    await freePort(this.apiPort);
    await rm(this.state, { recursive: true, force: true });
    await cp(this.snapshot, this.state, { recursive: true });
    for (const sql of seedSql) await command(API, seedSqlArgs(this.state, sql));
    // 空の env-file で .dev.vars の自動読み込みを避け、鍵をメモリ上で渡す。
    const envFile = path.join(WORK_DIR, "empty.env");
    await writeFile(envFile, "");
    const env: NodeJS.ProcessEnv = {
      CLOUDFLARE_INCLUDE_PROCESS_ENV: "true",
      AUTH_JWT_SECRET: secret,
    };
    for (const key of ["PATH", "HOME", "TMPDIR", "TEMP", "SystemRoot", "BUN_INSTALL_CACHE_DIR"]) {
      if (process.env[key]) env[key] = process.env[key];
    }
    this.api = server(
      API,
      [
        "wrangler",
        "dev",
        "--env-file",
        envFile,
        "--local",
        "--persist-to",
        this.state,
        "--port",
        String(this.apiPort),
        "--var",
        `ALLOWED_ORIGINS:${this.base}`,
      ],
      env,
    );
    await waitReady(`http://127.0.0.1:${this.apiPort}`, "/api/healthz", this.api);
  }

  async close(): Promise<void> {
    await stop(this.api);
    await stop(this.web);
    await rm(this.state, { recursive: true, force: true });
  }
}
