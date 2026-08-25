/**
 * 素朴な排他ロック (Issue #237)。
 *
 * R2 にも D1 にも比較交換 (compare-and-swap) が無いので、 「読んでから書く」形では
 * 読み直しと書き込みの間に必ず隙間が残る。 面談対策の質問編集では、 本文 (D1) と
 * 読み上げ音声 (R2) を食い違わせないために、 その 2 つをこのロックの中でまとめて
 * 行い、 同じ質問への同時操作を直列化する。
 *
 * 実装は `insert ... on conflict do nothing` が「無ければ入れる」を不可分に行える
 * ことだけに頼っている。 期限切れは誰でも取り直せるので、 ロックを持ったまま
 * Worker が落ちても詰まらない。
 */

import { and, eq, lt } from "drizzle-orm";

import type { Db } from "../db/client.js";
import { resourceLocks } from "../db/schema.js";

/**
 * ロックの既定保持時間。
 *
 * **守る処理の所要時間より長いこと** が直列化の前提 —— 短いと保持中に期限が切れて
 * 別のリクエストが同じロックを取れてしまう。 外部呼び出しを含む処理は所要時間に
 * 上限を設けたうえで、 呼び出し側が `ttlMs` でそれを上回る値を渡すこと。
 */
const DEFAULT_TTL_MS = 30_000;

/**
 * 取得を諦めるまでの既定待ち時間。 短めにしてあるのは、 取れなかった場合でも
 * 呼び出し側は編集そのものは保存できるため —— 長く待たせるより、 保存を通して
 * 「音声は作り直しが要る」と伝えるほうが操作が止まらない。
 */
const DEFAULT_WAIT_MS = 1_000;

/** 取得を試す間隔。 */
const RETRY_INTERVAL_MS = 120;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function tryAcquire(db: Db, id: string, ttlMs: number, now: number): Promise<string | null> {
  // 期限切れのロックは誰でも取り直してよい。
  await db
    .delete(resourceLocks)
    .where(and(eq(resourceLocks.id, id), lt(resourceLocks.expiresAt, new Date(now))));
  const holder = crypto.randomUUID();
  const inserted = await db
    .insert(resourceLocks)
    .values({ id, holder, expiresAt: new Date(now + ttlMs) })
    .onConflictDoNothing()
    .returning({ id: resourceLocks.id });
  return inserted.length > 0 ? holder : null;
}

async function release(db: Db, id: string, holder: string): Promise<void> {
  // holder を条件に入れて、 期限切れで他人が取り直したロックを解放しないようにする。
  await db
    .delete(resourceLocks)
    .where(and(eq(resourceLocks.id, id), eq(resourceLocks.holder, holder)));
}

/**
 * ロックを取れたら `fn` を実行する。 待っても取れなければ `{ ran: false }` を返す
 * —— 呼び出し側は「この操作は後回し」と伝えるなり、 ロックの要らない部分だけ
 * 進めるなりを選ぶ。 待ち続けて操作を固めないのが要点。
 */
export async function withResourceLock<T>(
  db: Db,
  id: string,
  fn: () => Promise<T>,
  opts: { ttlMs?: number; waitMs?: number; now?: () => number } = {},
): Promise<{ ran: true; value: T } | { ran: false }> {
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  const waitMs = opts.waitMs ?? DEFAULT_WAIT_MS;
  const now = opts.now ?? Date.now;

  const deadline = now() + waitMs;
  let holder: string | null = null;
  for (;;) {
    holder = await tryAcquire(db, id, ttlMs, now());
    if (holder !== null) break;
    if (now() >= deadline) return { ran: false };
    await sleep(RETRY_INTERVAL_MS);
  }

  try {
    return { ran: true, value: await fn() };
  } finally {
    try {
      await release(db, id, holder);
    } catch (e) {
      // 解放に失敗しても期限で開くので、 呼び出し側の結果は壊さない。
      console.error(`[resource-lock] failed to release ${id}`, e);
    }
  }
}

/** 面談対策の質問 1 件 (本文 + 読み上げ音声) のロック ID。 */
export function interviewQuestionLockId(tenantId: string, no: number): string {
  return `interview-question:${tenantId}:${no}`;
}
