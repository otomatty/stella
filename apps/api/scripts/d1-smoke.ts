/**
 * D1 疎通確認 (wrangler CLI 経由)。
 *
 *   bun run --filter=@falcon/api smoke
 */

import { execSync } from "node:child_process";
import { join } from "node:path";

import { APP_TABLES, TABLE_COUNT } from "../src/db/schema.js";

const apiDir = join(import.meta.dirname, "..");

function d1Json<T>(command: string): T {
  const out = execSync(
    `bunx wrangler d1 execute falcon-db --local --json --command ${JSON.stringify(command)}`,
    { cwd: apiDir, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  );
  const parsed = JSON.parse(out) as Array<{ results: T[] }>;
  return parsed[0]?.results ?? ([] as T);
}

async function main(): Promise<void> {
  d1Json("select 1 as ok");
  console.log("✓ D1 接続成功");

  const tables = d1Json<{ name: string }>(
    "select name from sqlite_master where type='table' order by name",
  );
  const names = new Set(tables.map((t) => t.name));
  let existing = 0;
  for (const t of APP_TABLES) {
    if (names.has(t)) existing += 1;
  }
  console.log(`  テーブル: ${existing}/${TABLE_COUNT} 存在`);

  if (existing === TABLE_COUNT) {
    const tenants = d1Json<{ c: number }>("select count(*) as c from tenants");
    const profiles = d1Json<{ c: number }>("select count(*) as c from profiles");
    console.log("\n✓ 全テーブル適用済み");
    console.log(`  tenants  : ${tenants[0]?.c ?? 0} 件`);
    console.log(`  profiles : ${profiles[0]?.c ?? 0} 件`);
  } else if (existing === 0) {
    console.log("\n→ マイグレーション未適用。 `bun run db:migrate` を実行してください。");
  } else {
    console.log("\n⚠ 一部テーブルのみ存在。 マイグレーションを再適用してください。");
  }

  console.log("\n✓ 疎通確認 OK");
}

main().catch((err) => {
  console.error("✗ 疎通確認に失敗:");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
