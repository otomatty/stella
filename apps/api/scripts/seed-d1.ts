/**
 * fixtures を D1 (SQLite) へ seed する。
 *
 *   bun run --filter=@falcon/api db:seed                   # local
 *   bun run --filter=@falcon/api db:seed:remote            # remote (検証 fixture 含む)
 *   bun run --filter=@falcon/api db:seed:remote:content    # remote (教材のみ)
 */

import { execSync } from "node:child_process";
import { closeSync, mkdtempSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const remote = process.argv.includes("--remote");
const contentOnly = process.argv.includes("--content-only");
const apiDir = join(import.meta.dirname, "..");
const rootDir = join(apiDir, "..", "..");

/** wrangler local の db.batch() は ~128KB 超で SQLITE_TOOBIG。D1 の 100KB/query にも合わせる。 */
const MAX_CHUNK_BYTES = 100_000;

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inString = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]!;
    current += ch;
    if (inString) {
      if (ch === "'" && sql[i + 1] === "'") {
        current += sql[++i];
        continue;
      }
      if (ch === "'") inString = false;
      continue;
    }
    if (ch === "'") {
      inString = true;
      continue;
    }
    if (ch === ";") {
      const trimmed = current.trim();
      if (trimmed.length > 0) statements.push(trimmed);
      current = "";
    }
  }
  const tail = current.trim();
  if (tail.length > 0) statements.push(tail);
  return statements;
}

function chunkStatements(statements: string[], maxBytes: number): string[] {
  const chunks: string[] = [];
  let buf: string[] = [];
  let size = 0;
  for (const stmt of statements) {
    const stmtSize = Buffer.byteLength(stmt) + 1;
    if (stmtSize > maxBytes) {
      throw new Error(`SQL statement exceeds chunk limit (${stmtSize} bytes)`);
    }
    if (buf.length > 0 && size + stmtSize > maxBytes) {
      chunks.push(`${buf.join("\n")}\n`);
      buf = [];
      size = 0;
    }
    buf.push(stmt);
    size += stmtSize;
  }
  if (buf.length > 0) chunks.push(`${buf.join("\n")}\n`);
  return chunks;
}

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
console.log(`→ D1 (${target}) に seed を適用 (${chunks.length} chunk, ${file})`);
for (let i = 0; i < chunks.length; i++) {
  const chunkFile = join(dir, `seed-${i}.sql`);
  writeFileSync(chunkFile, chunks[i]!, "utf8");
  execSync(
    `bunx wrangler d1 execute falcon-db --${target} --file=${JSON.stringify(chunkFile)}`,
    { cwd: apiDir, stdio: "inherit" },
  );
}
console.log("✓ seed 完了");
