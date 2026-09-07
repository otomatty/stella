/**
 * fixtures を D1 (SQLite) へ seed する。
 *
 *   bun run --filter=@stella/api db:seed                   # local
 *   bun run --filter=@stella/api db:seed:remote            # remote (検証 fixture 含む)
 *   bun run --filter=@stella/api db:seed:remote:content    # remote (教材のみ)
 *
 * remote は D1 HTTP API (`lib/d1-remote.ts`) に直列で流す。local だけ wrangler の
 * miniflare 実体に書く必要があるので `wrangler d1 execute --local` のまま。
 * SQL の中身・チャンク境界・適用順は両方で同じ (分割は lib 側の 1 か所)。
 */

import { execSync } from "node:child_process";
import { closeSync, mkdtempSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  MAX_CHUNK_BYTES,
  chunkStatements,
  executeChunks,
  parseD1Config,
  splitSqlStatements,
} from "./lib/d1-remote.js";

const remote = process.argv.includes("--remote");
const contentOnly = process.argv.includes("--content-only");
/** 逃げ道: D1 HTTP API 側で問題が出たときに旧経路 (wrangler CLI) へ戻す。 */
const viaWrangler = !remote || process.argv.includes("--wrangler");
const apiDir = join(import.meta.dirname, "..");
const rootDir = join(apiDir, "..", "..");
const DATABASE_NAME = "falcon-db";

const dir = mkdtempSync(join(tmpdir(), "falcon-seed-"));
const file = join(dir, "seed.sql");
const fd = openSync(file, "w");
try {
  // 教材 markdown を含む SQL は 1MB を超える。stdout をファイルへ直接書き、
  // execSync の maxBuffer (ENOBUFS) を避ける。
  execSync("bun run packages/shared/scripts/export-seed-sql.ts", {
    cwd: rootDir,
    stdio: ["ignore", fd, "inherit"],
    env: {
      ...process.env,
      DIALECT: "sqlite",
      ...(contentOnly ? { CONTENT_ONLY: "1" } : {}),
    },
  });
} finally {
  closeSync(fd);
}

const statements = splitSqlStatements(readFileSync(file, "utf8"));
const chunks = chunkStatements(statements, MAX_CHUNK_BYTES);
const target = remote ? "remote" : "local";
console.log(
  `→ D1 (${target}) に seed を適用 (${statements.length} 文 / ${chunks.length} chunk` +
    `${viaWrangler ? ", wrangler" : ", HTTP API"})`,
);
const startedAt = Date.now();

if (viaWrangler) {
  for (let i = 0; i < chunks.length; i++) {
    const chunkFile = join(dir, `seed-${i}.sql`);
    const chunk = chunks[i];
    if (chunk === undefined) continue;
    writeFileSync(chunkFile, chunk, "utf8");
    execSync(
      `bunx wrangler d1 execute ${DATABASE_NAME} --${target} --file=${JSON.stringify(chunkFile)}`,
      {
        cwd: apiDir,
        stdio: "inherit",
      },
    );
  }
} else {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!apiToken) {
    throw new Error("CLOUDFLARE_API_TOKEN が未設定です (remote seed には D1: Edit 権限が要る)");
  }
  const { accountId, databaseId } = parseD1Config(
    readFileSync(join(apiDir, "wrangler.toml"), "utf8"),
    DATABASE_NAME,
  );
  await executeChunks(
    {
      accountId,
      databaseId,
      apiToken,
      onProgress: (done, total) => {
        // 全チャンク分を出すとログが 200 行になる。粒度は進捗が見える程度で十分。
        if (done % 25 === 0 || done === total) console.log(`  ${done}/${total} chunk …`);
      },
    },
    chunks,
  );
}

console.log(`✓ seed 完了 (${((Date.now() - startedAt) / 1000).toFixed(1)}s)`);
