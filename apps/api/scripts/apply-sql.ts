/**
 * .sql ファイルを Neon に適用する小さなユーティリティ。
 *
 *   DATABASE_URL=postgres://... bun run scripts/apply-sql.ts <path-to.sql>
 *
 * HTTP ドライバ (neon-http) は 1 呼び出し 1 文しか実行できないため、
 * 複数文 (begin; ... commit;) を含む seed / 移行 SQL の適用には
 * WebSocket の Pool (simple query protocol) を使う。
 */

import { readFileSync } from "node:fs";

import { neonConfig, Pool } from "@neondatabase/serverless";

// Node / Bun ランタイムでは WebSocket コンストラクタを明示する必要がある。
// Bun / 近年の Node はグローバル WebSocket を持つ。
if (!neonConfig.webSocketConstructor && typeof WebSocket !== "undefined") {
  neonConfig.webSocketConstructor = WebSocket as unknown as typeof neonConfig.webSocketConstructor;
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL が未設定です。 Neon の接続文字列を渡してください。");
    process.exit(1);
  }
  const file = process.argv[2];
  if (!file) {
    console.error("✗ 適用する .sql ファイルのパスを指定してください。");
    console.error("  例: DATABASE_URL=... bun run scripts/apply-sql.ts drizzle/seed.sql");
    process.exit(1);
  }

  const sql = readFileSync(file, "utf8");
  const pool = new Pool({ connectionString: url });
  try {
    await pool.query(sql);
    console.log(`✓ 適用完了: ${file}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("✗ 適用に失敗しました:");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
