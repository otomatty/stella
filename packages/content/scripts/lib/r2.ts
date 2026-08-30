/**
 * 教材アップロード用の R2 クライアント。
 *
 * remote は Cloudflare API (`/accounts/:id/r2/buckets/:bucket/objects/:key`) を
 * 直接叩く。`wrangler r2 object put` は 1 ファイルにつき 1 プロセスで、起動だけで
 * 数秒かかるため、126 件で 2 分半を CLI の起動に使っていた (Issue #266)。
 * HTTP なら同じ権限 (Workers R2 Storage: Edit) のまま呼び出しだけが残る。
 *
 * local (`--local`) は wrangler のまま。バケットの実体は `wrangler dev` が使う
 * miniflare の永続ディレクトリ (apps/api/.wrangler/state) で、HTTP からは触れない。
 * wrangler は apps/api をカレントディレクトリにして起動する — 別ディレクトリから
 * 叩くと dev サーバから見えない場所に書き込んでしまう。
 */

import { execFile } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { parseAccountId, readWranglerToml } from "./wrangler-config.js";

const execFileAsync = promisify(execFile);

const API_BASE = "https://api.cloudflare.com/client/v4";
const here = dirname(fileURLToPath(import.meta.url));
const contentRoot = join(here, "..", "..");
const apiDir = join(contentRoot, "..", "..", "apps", "api");

/** キーの `/` は階層の区切りとして残し、それ以外だけエスケープする。 */
function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

function accountId(): string {
  const fromEnv = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (fromEnv) return fromEnv;
  const id = parseAccountId(readWranglerToml());
  if (!id) throw new Error("CLOUDFLARE_ACCOUNT_ID も wrangler.toml の account_id もありません");
  return id;
}

function apiToken(): string {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    throw new Error(
      "CLOUDFLARE_API_TOKEN が未設定です (R2 には Workers R2 Storage: Edit 権限が要る)",
    );
  }
  return token;
}

export interface R2Client {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  putFile(key: string, file: string, contentType: string): Promise<void>;
  /** 見つからなければ null。それ以外の失敗は投げる。 */
  get(key: string): Promise<Uint8Array | null>;
  remove(key: string): Promise<void>;
}

export function createR2Client(bucket: string, remote: boolean): R2Client {
  return remote ? httpClient(bucket) : wranglerClient(bucket);
}

function httpClient(bucket: string): R2Client {
  const url = (key: string) =>
    `${API_BASE}/accounts/${accountId()}/r2/buckets/${bucket}/objects/${encodeKey(key)}`;
  const auth = () => ({ Authorization: `Bearer ${apiToken()}` });

  async function fail(res: Response, what: string): Promise<never> {
    throw new Error(`${what} → HTTP ${res.status} ${(await res.text()).slice(0, 500)}`);
  }

  return {
    async put(key, body, contentType) {
      const res = await fetch(url(key), {
        method: "PUT",
        headers: { ...auth(), "Content-Type": contentType },
        body: body as BodyInit,
      });
      if (!res.ok) await fail(res, `PUT ${key}`);
    },
    async putFile(key, file, contentType) {
      await this.put(key, readFileSync(file), contentType);
    },
    async get(key) {
      const res = await fetch(url(key), { headers: auth() });
      if (res.status === 404) return null;
      if (!res.ok) await fail(res, `GET ${key}`);
      return new Uint8Array(await res.arrayBuffer());
    },
    async remove(key) {
      const res = await fetch(url(key), { method: "DELETE", headers: auth() });
      if (!res.ok && res.status !== 404) await fail(res, `DELETE ${key}`);
    },
  };
}

function wranglerClient(bucket: string): R2Client {
  const run = (args: string[]) =>
    execFileAsync("bunx", ["wrangler", "r2", "object", ...args, "--local"], {
      cwd: apiDir,
      maxBuffer: 64 * 1024 * 1024,
    });
  return {
    async put(key, body, contentType) {
      const tmp = join(tmpdir(), `r2-put-${process.pid}-${Date.now()}.bin`);
      writeFileSync(tmp, body);
      try {
        await this.putFile(key, tmp, contentType);
      } finally {
        rmSync(tmp, { force: true });
      }
    },
    async putFile(key, file, contentType) {
      await run(["put", `${bucket}/${key}`, "--file", file, "--content-type", contentType]);
    },
    async get(key) {
      const tmp = join(tmpdir(), `r2-get-${process.pid}-${Date.now()}.bin`);
      rmSync(tmp, { force: true });
      try {
        await run(["get", `${bucket}/${key}`, "--file", tmp]);
        return new Uint8Array(readFileSync(tmp));
      } catch {
        // wrangler は「無い」も他の失敗も同じ非ゼロ終了。台帳の読み出しは
        // 「無ければ全件」に倒す使い方なので、ここでは区別せず null を返す。
        return null;
      } finally {
        rmSync(tmp, { force: true });
      }
    },
    async remove(key) {
      await run(["delete", `${bucket}/${key}`]);
    },
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_ATTEMPTS = 3;

/**
 * 同時実行数を絞って put する。1 件でも失敗したら全体を失敗にする。
 *
 * リトライは必須。`--local` のバケット実体は miniflare の SQLite で、並列に書くと
 * 数件が "put: Unspecified error (0)" で落ちる。remote 側でも一時的なエラーは起きうる。
 * put は冪等なので、同じキーを投げ直して困ることはない。
 */
export async function putAll(
  client: R2Client,
  entries: Array<{ key: string; file: string; contentType: string }>,
  concurrency: number,
): Promise<void> {
  const failures: string[] = [];
  let next = 0;
  let done = 0;

  async function worker() {
    for (;;) {
      const entry = entries[next++];
      if (!entry) return;
      for (let attempt = 1; ; attempt++) {
        try {
          await client.putFile(entry.key, entry.file, entry.contentType);
          break;
        } catch (e) {
          if (attempt >= MAX_ATTEMPTS) {
            failures.push(
              `  ${entry.key} (${attempt} 回試行)\n    ${e instanceof Error ? e.message : String(e)}`,
            );
            break;
          }
          await sleep(attempt * 1000);
        }
      }
      done++;
      if (done % 25 === 0 || done === entries.length) {
        console.log(`  ${done}/${entries.length} …`);
      }
    }
  }

  // 0 や NaN を渡されると worker が 1 本も立たず、「1 件も put していないのに成功」に
  // なる。呼び出し側はそれを put 済みとして台帳に書くので、次のデプロイからは
  // R2 に無いオブジェクトを飛ばす。最低 1 本は必ず立てる。
  const workers = Math.max(1, Math.min(Math.floor(concurrency) || 1, entries.length));
  await Promise.all(Array.from({ length: workers }, worker));

  if (failures.length > 0) {
    console.error(
      `\nR2 へのアップロードが ${failures.length} 件失敗しました:\n${failures.join("\n")}`,
    );
    process.exit(1);
  }
}
