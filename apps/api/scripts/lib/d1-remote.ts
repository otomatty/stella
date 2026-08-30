/**
 * remote D1 への SQL 適用 (Cloudflare D1 HTTP API)。
 *
 * seed は 15,000 文以上・数 MB の SQL を D1 の 100KB/query に収まるチャンクへ
 * 割って直列に流す。チャンクごとに `bunx wrangler d1 execute` を起こしていた頃は
 * D1 上の実行時間が合計 4 秒なのに壁時計が 8 分半で、その差はすべて CLI の
 * 起動と通信だった (Issue #266)。同じプロセスから `/query` を直列に叩けば
 * SQL・チャンク境界・適用順を一切変えずにその分だけ消える。
 *
 * チャンクを並列に投げてはいけない。seed の SQL は FK 順と upsert 順に依存する。
 */

const API_BASE = "https://api.cloudflare.com/client/v4";

/** wrangler local の db.batch() は ~128KB 超で SQLITE_TOOBIG。D1 の 100KB/query にも合わせる。 */
export const MAX_CHUNK_BYTES = 100_000;

/** ネットワーク断・429・5xx だけ再送する回数 (適用済みか不明なので SQL エラーは再送しない)。 */
const MAX_ATTEMPTS = 3;

export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inString = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === undefined) break;
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

export function chunkStatements(statements: string[], maxBytes: number): string[] {
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

/**
 * wrangler.toml から D1 の接続先を読む。
 *
 * 正本は wrangler.toml のまま (Worker のバインディングと同じ DB を指す保証が要る)。
 * TOML パーサを足すほどの構造ではないので、`[[d1_databases]]` ブロックと
 * トップレベルの `account_id` だけを見る。
 */
export function parseD1Config(
  toml: string,
  databaseName: string,
): { accountId: string; databaseId: string } {
  const blocks = toml.split(/^\[\[d1_databases\]\]\s*$/m).slice(1);
  let databaseId: string | undefined;
  for (const block of blocks) {
    // 次のセクション見出しまでが 1 ブロック。
    const body = block.split(/^\[/m)[0] ?? "";
    if (body.match(/^\s*database_name\s*=\s*"(.+?)"/m)?.[1] !== databaseName) continue;
    databaseId = body.match(/^\s*database_id\s*=\s*"(.+?)"/m)?.[1];
    break;
  }
  if (!databaseId) {
    throw new Error(`wrangler.toml に d1_databases "${databaseName}" の database_id がありません`);
  }
  // account_id は最初のセクション見出しより前 (トップレベル) のものだけ拾う。
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    (toml.split(/^\[/m)[0] ?? "").match(/^\s*account_id\s*=\s*"(.+?)"/m)?.[1];
  if (!accountId) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID も wrangler.toml の account_id もありません");
  }
  return { accountId, databaseId };
}

export interface D1QueryResult {
  ok: boolean;
  /** 再送してよい失敗 (ネットワーク断・429・5xx) か。SQL エラーは false。 */
  retryable: boolean;
  error?: string;
}

/** 1 チャンクを `/query` に投げる。fetch は差し替え可能 (テスト用)。 */
export async function queryOnce(
  opts: { accountId: string; databaseId: string; apiToken: string; fetchImpl?: typeof fetch },
  sql: string,
): Promise<D1QueryResult> {
  const url = `${API_BASE}/accounts/${opts.accountId}/d1/database/${opts.databaseId}/query`;
  const doFetch = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await doFetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql }),
    });
  } catch (e) {
    return { ok: false, retryable: true, error: e instanceof Error ? e.message : String(e) };
  }
  const text = await res.text();
  if (!res.ok) {
    return {
      ok: false,
      retryable: res.status === 429 || res.status >= 500,
      error: `HTTP ${res.status} ${text.slice(0, 2000)}`,
    };
  }
  let body: {
    success?: boolean;
    errors?: Array<{ code?: number; message?: string }>;
    result?: Array<{ success?: boolean; error?: string } | null>;
  };
  try {
    body = JSON.parse(text);
  } catch {
    return { ok: false, retryable: false, error: `JSON ではない応答: ${text.slice(0, 2000)}` };
  }
  if (body.success !== true) {
    const errors = (body.errors ?? []).map((e) => `${e.code ?? ""} ${e.message ?? ""}`.trim());
    return {
      ok: false,
      retryable: false,
      error: errors.length > 0 ? errors.join(" / ") : text.slice(0, 2000),
    };
  }
  // 1 チャンクは複数文なので、応答の封筒が成功でも result の要素側だけ失敗している
  // ことがありうる。そこを見ないと「落ちた seed を通ったことにする」ことになり、
  // デプロイは指紋を記録して次から教材を飛ばす (= 欠けたまま気づけない)。
  const failed = (body.result ?? []).filter(
    (r) => r?.success === false || typeof r?.error === "string",
  );
  if (failed.length > 0) {
    return {
      ok: false,
      retryable: false,
      error: failed.map((r) => r?.error ?? "query failed").join(" / "),
    };
  }
  return { ok: true, retryable: false };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * チャンクを 1 プロセスから直列に適用する。
 *
 * 途中で落ちたら何チャンク目かと先頭の文を出して例外にする (「成功したことに
 * しない」)。seed は upsert + prune で冪等なので、復旧はジョブごとの再実行でよい。
 */
export async function executeChunks(
  opts: {
    accountId: string;
    databaseId: string;
    apiToken: string;
    fetchImpl?: typeof fetch;
    onProgress?: (done: number, total: number) => void;
    /** 再送の待ち時間 (テストで 0 にする)。 */
    retryDelayMs?: number;
  },
  chunks: string[],
): Promise<void> {
  for (let i = 0; i < chunks.length; i++) {
    const sql = chunks[i];
    if (sql === undefined) continue;
    let last: D1QueryResult | undefined;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      last = await queryOnce(opts, sql);
      if (last.ok || !last.retryable) break;
      if (attempt < MAX_ATTEMPTS) await sleep((opts.retryDelayMs ?? 1000) * attempt);
    }
    if (!last?.ok) {
      const head = (sql.split("\n")[0] ?? "").slice(0, 200);
      throw new Error(
        `D1 への適用が ${i + 1}/${chunks.length} チャンク目で失敗しました: ${last?.error}\n  先頭の文: ${head}`,
      );
    }
    opts.onProgress?.(i + 1, chunks.length);
  }
}
