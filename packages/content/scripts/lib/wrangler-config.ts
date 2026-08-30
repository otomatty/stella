/**
 * `apps/api/wrangler.toml` から接続先を読む (教材まわりのスクリプト用)。
 *
 * wrangler.toml が接続先の正本 — Worker のバインディングと同じアカウント / 同じ D1 を
 * 指している保証が要る。TOML パーサを足すほどの構造ではないので、必要な 2 つだけを
 * 正規表現で見る。適用側の同等の読み取りは `apps/api/scripts/lib/d1-remote.ts` の
 * `parseD1Config` にある (ワークスペースを跨いで import しないぶんの重複)。
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const apiDir = join(here, "..", "..", "..", "..", "apps", "api");

export function readWranglerToml(): string {
  return readFileSync(join(apiDir, "wrangler.toml"), "utf8");
}

/** トップレベル (最初のセクション見出しより前) の `account_id`。 */
export function parseAccountId(toml: string): string | undefined {
  return (toml.split(/^\[/m)[0] ?? "").match(/^\s*account_id\s*=\s*"(.+?)"/m)?.[1];
}

/** `database_name` が一致する `[[d1_databases]]` ブロックの `database_id`。 */
export function parseD1DatabaseId(toml: string, databaseName: string): string | undefined {
  for (const block of toml.split(/^\[\[d1_databases\]\]\s*$/m).slice(1)) {
    // 次のセクション見出しまでが 1 ブロック。
    const body = block.split(/^\[/m)[0] ?? "";
    if (body.match(/^\s*database_name\s*=\s*"(.+?)"/m)?.[1] !== databaseName) continue;
    return body.match(/^\s*database_id\s*=\s*"(.+?)"/m)?.[1];
  }
  return undefined;
}
