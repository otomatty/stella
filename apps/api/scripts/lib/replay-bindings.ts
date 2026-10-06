/**
 * リプレイ (`scripts/ai-review-replay.ts`) が D1 と R2 を読むためのバインディング。
 *
 * wrangler の `getPlatformProxy` で、本番の Worker と同じ D1 / R2 のバインディングを手元に作る
 * (`--remote` はリモートのバインディング。認証は `wrangler login` か `CLOUDFLARE_API_TOKEN`)。
 * 本番の `loadMaterial` などをそのまま通すため、バインディングの形は本物のまま、書き込みだけを
 * 止める: D1 は読み取りの文 (select / with … select) 以外を流さず、R2 は `get`・`head` しか持たない。
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Db, getDb } from "../../src/db/client.js";
import type { Env } from "../../src/env.js";
import { parseD1Config } from "./d1-remote.js";

const DATABASE_NAME = "stella-db";
const SUBMISSIONS_BINDING = "SUBMISSIONS_BUCKET";

/** 書き込み・設定の変更になりうる語。識別子 ("...") と文字列 ('...') は見ない。 */
const WRITE_WORDS =
  /\b(insert|update|delete|replace|upsert|create|drop|alter|pragma|attach|detach|vacuum|reindex|analyze|begin|commit|rollback|savepoint|release)\b/i;

/** 1 つの読み取りの文 (select か with … select) だけか。 */
export function isReadOnlySql(sql: string): boolean {
  const bare = sql
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/"(?:[^"]|"")*"/g, '""')
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .trim()
    .replace(/;\s*$/, "");
  return /^(select|with)\b/i.test(bare) && !WRITE_WORDS.test(bare) && !bare.includes(";");
}

class ReadOnlyViolation extends Error {
  constructor(what: string) {
    super(`リプレイは D1 と R2 を読むだけです。書き込みは流しません: ${what}`);
    this.name = "ReadOnlyViolation";
  }
}

/** 読み取りの文しか準備できない D1 (drizzle の D1 ドライバーが使う操作だけを通す)。 */
export function readOnlyD1(binding: D1Database): D1Database {
  return {
    prepare(sql: string) {
      if (!isReadOnlySql(sql)) throw new ReadOnlyViolation(sql.slice(0, 120));
      return binding.prepare(sql);
    },
    // 文はこの prepare で作ったもの (読み取りだけ) しか来ない。
    batch: (statements: D1PreparedStatement[]) => binding.batch(statements),
    exec: async () => {
      throw new ReadOnlyViolation("exec");
    },
    dump: async () => {
      throw new ReadOnlyViolation("dump");
    },
    withSession: () => {
      throw new ReadOnlyViolation("withSession");
    },
  } as unknown as D1Database;
}

/** `get` と `head` だけを持つ R2。 */
export function readOnlyBucket(bucket: R2Bucket): R2Bucket {
  return {
    get: (key: string) => bucket.get(key),
    head: (key: string) => bucket.head(key),
  } as unknown as R2Bucket;
}

/** wrangler.toml から、バインディング名で R2 のバケット名を読む。 */
export function parseR2BucketName(toml: string, binding: string): string {
  for (const block of toml.split(/^\[\[r2_buckets\]\]\s*$/m).slice(1)) {
    const body = block.split(/^\[/m)[0] ?? "";
    if (body.match(/^\s*binding\s*=\s*"(.+?)"/m)?.[1] !== binding) continue;
    const name = body.match(/^\s*bucket_name\s*=\s*"(.+?)"/m)?.[1];
    if (name) return name;
  }
  throw new Error(`wrangler.toml に r2_buckets "${binding}" の bucket_name がありません`);
}

/** `getPlatformProxy` に渡す設定。DB と提出のバケットだけを持つ。 */
export function replayWranglerConfig(input: {
  remote: boolean;
  accountId: string;
  databaseId: string;
  bucketName: string;
}) {
  return {
    name: "stella-ai-review-replay",
    compatibility_date: "2024-12-01",
    account_id: input.accountId,
    d1_databases: [
      {
        binding: "DB",
        database_name: DATABASE_NAME,
        database_id: input.databaseId,
        remote: input.remote,
      },
    ],
    r2_buckets: [
      { binding: SUBMISSIONS_BINDING, bucket_name: input.bucketName, remote: input.remote },
    ],
  };
}

/**
 * `wrangler d1 list --json` の出力から、名前の一致する DB の ID を 1 つ選ぶ。
 * wrangler.toml の database_id は手元用の仮の値なので、リモートは名前で引く (deploy と同じ)。
 */
export function pickDatabaseId(stdout: string, name: string): string {
  // wrangler が JSON の前に案内 (「▲ [WARNING] …」) を出すことがあるので、`[` で始まる行から読む。
  const start = stdout.search(/^\[/m);
  const list = JSON.parse(start >= 0 ? stdout.slice(start) : stdout) as {
    name?: string;
    uuid?: string;
  }[];
  const matches = list.filter((db) => db?.name === name);
  const id = matches[0]?.uuid;
  if (matches.length !== 1 || typeof id !== "string")
    throw new Error(`リモートの D1 に ${name} が 1 つだけ見つかりません (${matches.length} 件)`);
  return id;
}

export interface ReplayBindings {
  env: Env;
  db: Db;
  dispose: () => Promise<void>;
}

/** リモート (`remote`) か手元 (`wrangler dev` と同じ保存先) の D1 / R2 を読み取りだけで開く。 */
export async function openReplayBindings(opts: {
  remote: boolean;
  apiDir: string;
}): Promise<ReplayBindings> {
  const toml = readFileSync(join(opts.apiDir, "wrangler.toml"), "utf8");
  const { accountId, databaseId: localDatabaseId } = parseD1Config(toml, DATABASE_NAME);
  const databaseId = opts.remote
    ? pickDatabaseId(
        execFileSync("bunx", ["wrangler", "d1", "list", "--json"], {
          cwd: opts.apiDir,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        }),
        DATABASE_NAME,
      )
    : localDatabaseId;
  const dir = mkdtempSync(join(tmpdir(), "stella-replay-"));
  const configPath = join(dir, "wrangler.json");
  writeFileSync(
    configPath,
    JSON.stringify(
      replayWranglerConfig({
        remote: opts.remote,
        accountId,
        databaseId,
        bucketName: parseR2BucketName(toml, SUBMISSIONS_BINDING),
      }),
    ),
  );
  try {
    const { getPlatformProxy } = await import("wrangler");
    const proxy = await getPlatformProxy<{ DB: D1Database; SUBMISSIONS_BUCKET: R2Bucket }>({
      configPath,
      envFiles: [],
      remoteBindings: opts.remote,
      // 手元は `wrangler dev` と同じ保存先を読む。リモートは何も保存しない。
      persist: opts.remote ? false : { path: join(opts.apiDir, ".wrangler/state/v3") },
    });
    const env = {
      DB: readOnlyD1(proxy.env.DB),
      SUBMISSIONS_BUCKET: readOnlyBucket(proxy.env.SUBMISSIONS_BUCKET),
    } as unknown as Env;
    return {
      env,
      db: getDb(env),
      dispose: async () => {
        await proxy.dispose();
        rmSync(dir, { recursive: true, force: true });
      },
    };
  } catch (e) {
    rmSync(dir, { recursive: true, force: true });
    throw e;
  }
}
