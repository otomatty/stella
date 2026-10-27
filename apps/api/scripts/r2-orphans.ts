/**
 * R2 教材ストレージの孤児オブジェクト棚卸し / 掃除 (Issue #64)。
 *
 *   bun run r2:orphans            # 棚卸しのみ (既定・削除しない)
 *   bun run r2:orphans -- --delete  # 一覧に出た孤児を削除する
 *
 * 実体は API の保守エンドポイント (`/api/admin/r2/orphans`) の薄いラッパ。
 * R2 バインディングは Worker 側にしか無いため、 走査も削除も API に任せる。
 *
 * 認証:
 *   - 既定 (ローカル): `apps/api/.dev.vars` の `AUTH_JWT_SECRET` で
 *     `R2_ADMIN_ID` (既定 `seed-admin`) の JWT を発行する。
 *   - 本番など: `ADMIN_TOKEN` に admin の JWT を渡す。 `API_BASE_URL` で向き先を変える。
 *
 * 走査も削除も呼び出し元テナント配下 (`tenant/<tenantId>/`) に閉じる。
 * 参照判定には配布資料だけでなくレッスンの動画 / スライドのパスも含まれる。
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { SignJWT } from "jose";

const apiDir = join(import.meta.dirname, "..");
const BASE = (process.env.API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");
const ADMIN_ID = process.env.R2_ADMIN_ID ?? "seed-admin";
const doDelete = process.argv.includes("--delete");

/** API 側の 1 リクエストあたり削除上限に合わせる。 */
const DELETE_BATCH = 1000;

interface Orphan {
  key: string;
  size: number;
  uploaded: string;
}

/** `.dev.vars` から 1 つ読む (env 優先 / CRLF 保存に耐える)。 */
function readDevVar(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  try {
    const text = readFileSync(join(apiDir, ".dev.vars"), "utf8");
    for (const raw of text.split("\n")) {
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
    // .dev.vars が無い場合は env のみで判断する。
  }
  return undefined;
}

async function resolveToken(): Promise<string> {
  if (process.env.ADMIN_TOKEN) return process.env.ADMIN_TOKEN;
  const secret = readDevVar("AUTH_JWT_SECRET");
  if (!secret) {
    throw new Error(
      "ADMIN_TOKEN も AUTH_JWT_SECRET も見つかりません (apps/api/.dev.vars を確認してください)",
    );
  }
  return new SignJWT({ email: `${ADMIN_ID}@example.local` })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(ADMIN_ID)
    .setIssuer("stella-api")
    .setAudience("stella-web")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(secret));
}

async function call(method: string, path: string, token: string, body?: unknown): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** 削除は 1 リクエスト 1000 件までなので分割して投げる。 */
async function deleteOrphans(
  token: string,
  paths: string[],
): Promise<{ deleted: number; skipped: number }> {
  let deleted = 0;
  let skipped = 0;
  for (let i = 0; i < paths.length; i += DELETE_BATCH) {
    const result = await call("POST", "/api/admin/r2/orphans/cleanup", token, {
      paths: paths.slice(i, i + DELETE_BATCH),
    });
    deleted += result.deleted;
    skipped += result.skipped.length;
  }
  return { deleted, skipped };
}

async function main(): Promise<void> {
  const token = await resolveToken();

  // API は 1 リクエストあたりの走査件数に上限があるため、 カーソルを辿って
  // テナント配下を最後まで走査する (上限で止めると後ろの孤児に到達できない)。
  const orphans: Orphan[] = [];
  let scanned = 0;
  let pages = 0;
  let cursor: string | null = null;
  let first: any = null;
  do {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const page: any = await call("GET", `/api/admin/r2/orphans${qs}`, token);
    first ??= page;
    orphans.push(...(page.orphans as Orphan[]));
    scanned += page.scanned;
    pages += 1;
    cursor = page.next_cursor;
  } while (cursor);

  const orphanBytes = orphans.reduce((a, o) => a + o.size, 0);
  console.log(`対象プレフィクス : ${first.prefix}`);
  console.log(`走査オブジェクト : ${scanned}${pages > 1 ? ` (${pages} ページ)` : ""}`);
  console.log(`参照中のパス     : ${first.referenced_count}`);
  console.log(`孤児             : ${orphans.length} 件 / ${formatBytes(orphanBytes)}`);

  // 実体なし判定は 1 リクエストで走査し切れたときだけ API が返す
  // (分割走査の途中では「そのページに出なかっただけ」の参照と区別できないため)。
  if (!first.missing_checked) {
    console.log(
      "\n(オブジェクト数が多く走査を分割したため、 DB 行に対する実体なし判定はスキップしました)",
    );
  } else if (first.missing.length > 0) {
    console.log(`\n⚠ DB に行があるのに R2 に実体が無いパス: ${first.missing.length} 件`);
    for (const p of first.missing.slice(0, 20)) console.log(`    ${p}`);
    if (first.missing.length > 20) console.log(`    … 他 ${first.missing.length - 20} 件`);
    console.log("  (ダウンロードが 404 になります。 教材の再アップロードが必要です)");
  }

  if (orphans.length === 0) {
    console.log("\n✓ 孤児オブジェクトはありません");
    return;
  }

  console.log();
  for (const o of orphans) {
    console.log(`  ${formatBytes(o.size).padStart(9)}  ${o.uploaded.slice(0, 10)}  ${o.key}`);
  }

  if (!doDelete) {
    console.log("\n削除するには --delete を付けて再実行してください (既定は棚卸しのみ)。");
    return;
  }

  const result = await deleteOrphans(
    token,
    orphans.map((o) => o.key),
  );
  console.log(`\n✓ ${result.deleted} 件を削除しました`);
  if (result.skipped > 0) {
    console.log(`  (棚卸し後に参照が復活した ${result.skipped} 件はスキップ)`);
  }
}

main().catch((err) => {
  console.error("✗ R2 棚卸しに失敗:");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
