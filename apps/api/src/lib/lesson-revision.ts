/**
 * 教材本文のリビジョン記録 (docs/superpowers/specs/2026-08-26-material-pdf-auto-conversion-design.md)。
 *
 * seed は SQL 側で同等の規則を実装している (packages/shared/scripts/export-seed-sql.ts の
 * emitLessonRevision)。こちらは CMS 編集用。
 *
 * **単一の guarded insert** で行う — 検証と挿入を 1 文にまとめるのは、deploy の seed が
 * CMS のレッスン単位ロックを取らずに lessons と lesson_revisions を書くため
 * (PR #256 レビュー)。SQLite (D1) は 1 文を原子的に実行するので、この形なら
 * どちらの書き手とどう交錯しても「リビジョンを積めるのは、その時点の
 * lessons.markdown を書いた側だけ」になり、本文と最新リビジョンが食い違わない。
 * seed 側の insert も同じく lessons.markdown の一致を検証する。
 *
 * 文の中身:
 * - `l.markdown IS ?` … lessons 行がまだこの呼び出しの本文を保持しているか (null 安全)。
 *   他の書き手が先に上書きしていたら挿入せず、その書き手側の記録に任せる。
 * - 直前リビジョンの markdown `IS NOT l.markdown` … 本文が変わったときだけ積む
 *   (migration 0031 の番兵行が最新でも本文比較なので正しく働く)。履歴なし +
 *   本文 null (video / code 等) は NULL IS NOT NULL = false で自然に対象外になり、
 *   履歴のあるレッスンで本文が null になる保存は「本文が消えた」リビジョンとして残る。
 * - 連番は同じ文の中で max(revision)+1 を取る。文が原子的なので取り合いは起きない。
 */

import { sql } from "drizzle-orm";

import type { Db } from "../db/client.js";

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 本文が直前リビジョンから変わっていれば 1 行積む。変わっていなければ何もしない。 */
export async function recordLessonRevision(
  db: Db,
  input: {
    lessonId: string;
    markdown: string | null;
    source: "seed" | "cms";
    createdBy: string | null;
  },
): Promise<void> {
  const sourceHash = await sha256Hex(input.markdown ?? "");
  await db.run(sql`
    insert into lesson_revisions (lesson_id, revision, source_hash, markdown, source, created_by, created_at)
    select l.id,
           coalesce((select max(r.revision) from lesson_revisions r where r.lesson_id = l.id), 0) + 1,
           ${sourceHash},
           l.markdown,
           ${input.source},
           ${input.createdBy},
           ${Date.now()}
    from lessons l
    where l.id = ${input.lessonId}
      and l.markdown is ${input.markdown}
      and (
        select r2.markdown from lesson_revisions r2
        where r2.lesson_id = l.id
        order by r2.revision desc limit 1
      ) is not l.markdown
  `);
}
