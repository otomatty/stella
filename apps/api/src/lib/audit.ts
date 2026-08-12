/**
 * 監査ログ記録の共通ヘルパ (Issue #64 — 監査カバレッジ拡充)。
 *
 * 元は `routes/admin.ts` のローカル関数だったものを、 ログイン / コース公開・削除 /
 * 受講登録 / 修了証発行からも呼べるよう切り出した。
 *
 * **best-effort である** — insert 失敗は `console.error` に留め、 主操作は成功させる。
 * 主操作と監査記録の原子性 (片方だけ成功する状態の解消) は #39 の課題であり、
 * D1 がインタラクティブトランザクションを持たない現構成では別途設計が要る。
 * ここでの方針は「記録箇所を網羅する」ことに絞る。
 */

import type { Context } from "hono";

import type { AuditAction } from "@falcon/shared/admin/audit-actions";

import { auditLogs } from "../db/schema.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";

/**
 * 監査ログの実行者。 `Caller` はこの形を満たすためそのまま渡せる。
 * ログイン時のようにまだ `Caller` が組み立てられていない場合は profiles 行から作る。
 */
export interface AuditActor {
  id: string;
  tenantId: string;
  role: string;
  name: string;
}

export interface AuditEntry {
  action: AuditAction;
  targetType: string;
  targetId?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}

/** リクエスト元 IP を Cloudflare のヘッダから取り出す。 */
export function clientIp(c: Context<{ Bindings: Env }>): string | null {
  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

/** 監査ログを 1 件記録する (best-effort)。 */
export async function recordAudit(
  db: Db,
  actor: AuditActor,
  entry: AuditEntry,
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      tenantId: actor.tenantId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      ip: entry.ip ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (e) {
    console.error("[audit] 監査ログの記録に失敗", entry.action, e);
  }
}
