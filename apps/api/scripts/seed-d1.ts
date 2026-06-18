/**
 * fixtures を D1 (SQLite) へ seed する。
 *
 *   bun run --filter=@falcon/api db:seed          # local
 *   bun run --filter=@falcon/api db:seed:remote  # remote (本番 D1)
 */

import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const remote = process.argv.includes("--remote");
const apiDir = join(import.meta.dirname, "..");
const rootDir = join(apiDir, "..", "..");

const sql = execSync("bun run packages/shared/scripts/export-seed-sql.ts", {
  cwd: rootDir,
  encoding: "utf8",
  env: { ...process.env, DIALECT: "sqlite" },
});

const dir = mkdtempSync(join(tmpdir(), "falcon-seed-"));
const file = join(dir, "seed.sql");
writeFileSync(file, sql, "utf8");

const target = remote ? "remote" : "local";
console.log(`→ D1 (${target}) に seed を適用 (${file})`);
execSync(
  `bunx wrangler d1 execute falcon-db --${target} --file=${JSON.stringify(file)}`,
  { cwd: apiDir, stdio: "inherit" },
);
console.log("✓ seed 完了");
