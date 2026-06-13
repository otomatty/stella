/**
 * Neon 疎通確認スクリプト。
 *
 *   DATABASE_URL=postgres://... bun run scripts/neon-smoke.ts
 *
 * 行うこと (すべて読み取り専用・非破壊):
 *   1. 接続して version / current_database / current_user を取得
 *   2. public スキーマのテーブル一覧を取得し、 Drizzle スキーマの想定 19 テーブルと突合
 *   3. テーブルが揃っていれば tenants / profiles の件数を読む
 *
 * 既存データは一切変更しない。 マイグレーション適用は別途
 *   bun run --filter=@falcon/api db:migrate
 * で行う。
 */

import { neon } from "@neondatabase/serverless";

const EXPECTED_TABLES = [
  "tenants",
  "profiles",
  "courses",
  "sections",
  "lessons",
  "assignments",
  "lesson_progress",
  "enrollments",
  "questions",
  "question_replies",
  "quizzes",
  "quiz_questions",
  "quiz_options",
  "quiz_attempts",
  "submissions",
  "certificates",
  "announcements",
  "notifications",
  "audit_logs",
];

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL が未設定です。 Neon の接続文字列を渡してください。");
    process.exit(1);
  }

  const sql = neon(url);

  // 1. 接続確認
  const info = (await sql`select version() as version, current_database() as db, current_user as usr`) as Array<{
    version: string;
    db: string;
    usr: string;
  }>;
  console.log("✓ 接続成功");
  console.log(`  database : ${info[0]?.db}`);
  console.log(`  user     : ${info[0]?.usr}`);
  console.log(`  version  : ${info[0]?.version?.split(" ").slice(0, 2).join(" ")}`);

  // 2. テーブル突合
  const tableRows = (await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `) as Array<{ table_name: string }>;
  const present = new Set(tableRows.map((r) => r.table_name));

  const missing = EXPECTED_TABLES.filter((t) => !present.has(t));
  const found = EXPECTED_TABLES.filter((t) => present.has(t));
  console.log(`\nテーブル: ${found.length}/${EXPECTED_TABLES.length} 存在`);
  if (missing.length > 0) {
    console.log(`  未適用: ${missing.join(", ")}`);
    console.log(
      "\n→ マイグレーション未適用のようです。 次を実行してください:\n" +
        "   DATABASE_URL=... bun run --filter=@falcon/api db:migrate",
    );
    return;
  }

  // 3. 代表テーブルの件数 (読み取りのみ)
  const tcount = (await sql`select count(*)::int as n from tenants`) as Array<{ n: number }>;
  const pcount = (await sql`select count(*)::int as n from profiles`) as Array<{ n: number }>;
  console.log(`\n✓ 全テーブル適用済み`);
  console.log(`  tenants  : ${tcount[0]?.n} 件`);
  console.log(`  profiles : ${pcount[0]?.n} 件`);
  console.log("\n✓ 疎通確認 OK");
}

main().catch((err) => {
  console.error("✗ 疎通確認に失敗しました:");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
