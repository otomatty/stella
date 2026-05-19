/**
 * SQL ターミナル用の in-memory Database セッション (#109)。
 *
 * - 採点用 DB とは **別の Database インスタンス** を持つ (採点 DB は採点ごとに使い捨て)。
 *   ターミナルから `DROP TABLE` 等をしても採点 DB は影響を受けない。
 * - `(assignmentId, seedHash)` をキーにしてセッションをメモ化する。
 *   課題切替 や seed 変更で再生成、 学習者の対話状態 (CREATE TABLE 等) はそのまま残る。
 * - localStorage への永続化は当面行わない (#100 follow-up)。
 */

interface SqlTerminalSession {
  exec(sql: string): TerminalExecResult[];
  dispose(): void;
}

export interface TerminalExecResult {
  columns: string[];
  rows: unknown[][];
  /** SQL ステートメントを実行できなかった場合のエラー文言。 */
  error?: string;
}

type SqlJsLoader = () => Promise<{
  Database: new () => SqlJsDatabaseRuntime;
}>;

interface SqlJsDatabaseRuntime {
  exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>;
  close(): void;
}

interface CachedEntry {
  key: string;
  session: SqlTerminalSession;
}

let cached: CachedEntry | null = null;

function makeKey(assignmentId: string, seed: string): string {
  // 単純な hash で十分 (assignment 数 x 数 KB の seed)。 SubtleCrypto は不要。
  return `${assignmentId}:${simpleHash(seed)}`;
}

function simpleHash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/**
 * 課題ごとのターミナルセッションを取得する (キャッシュ命中で再利用)。
 * `seed` は `Assignment.sqlSeed`。 seed が変わった場合は古いセッションを dispose して作り直す。
 */
export async function getTerminalSession(
  assignmentId: string,
  seed: string,
  loadSqlJs: SqlJsLoader,
): Promise<SqlTerminalSession> {
  const key = makeKey(assignmentId, seed);
  if (cached && cached.key === key) {
    return cached.session;
  }
  if (cached) {
    cached.session.dispose();
    cached = null;
  }
  const SQL = await loadSqlJs();
  const db = new SQL.Database();
  if (seed.trim().length > 0) {
    db.exec(seed);
  }
  const session: SqlTerminalSession = {
    exec(sql: string): TerminalExecResult[] {
      try {
        const out = db.exec(sql);
        return out.map((r) => ({ columns: r.columns, rows: r.values }));
      } catch (e) {
        return [
          {
            columns: [],
            rows: [],
            error: e instanceof Error ? e.message : String(e),
          },
        ];
      }
    },
    dispose() {
      try {
        db.close();
      } catch {
        // ignore
      }
    },
  };
  cached = { key, session };
  return session;
}

/** ページ離脱時等に明示的に破棄する。 */
export function disposeTerminalSession(): void {
  if (cached) {
    cached.session.dispose();
    cached = null;
  }
}
