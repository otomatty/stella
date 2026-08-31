/**
 * 「ここから始める」を押したあと、どのレッスンを開くか。
 *
 * 星を始める操作 (受講登録 → フォーカス) はスキルツリーの上で完結するが、その次に
 * 受講者がやりたいのは **教材を開くこと** なので、開始がそのまま最初のレッスンまで
 * つながるようにする (Issue: 開始したのに自分でステージ一覧を辿り直していた)。
 *
 * 判定はここに閉じてある。呼び出し側 (`SkillTreePage`) は受講一覧を取り直したあとの
 * `Stage[]` を渡すだけで、遷移するかどうかはこの関数の戻り値だけで決まる。
 */

import type { Stage } from "@/data/types";
import { type LessonProgressMap, resumeLessonId } from "@/lib/lesson-progress";

export interface StartDestination {
  stage: Stage;
  lessonId: string;
}

/**
 * 開始したステージの「開くべきレッスン」を返す。開けないなら null (= ツリーに留まる)。
 *
 * null になるのは次の 3 つで、どれも遷移しないのが正しい:
 * - 一覧にまだ載っていない (取り直しが失敗した / 詳細が引けない draft だった)
 * - レッスンを持たない「準備中」の講座
 * - 全レッスンが locked (前提レッスン待ち) — ロック行のガードを迂回させない
 *
 * 開始直後は進捗が空なので普通は先頭レッスンになるが、開始は冪等なので **一度始めた
 * 星をもう一度押した** 場合もある。そのときは先頭へ引き戻さず「続きから」と同じ位置を
 * 返す (`resumeLessonId` が唯一の判定元 — ステージ詳細の再開ボタンと食い違わせない)。
 */
export function startDestination(
  stages: Stage[],
  stageId: string,
  progress: LessonProgressMap,
): StartDestination | null {
  const stage = stages.find((s) => s.id === stageId);
  if (!stage) return null;
  const lessonId = resumeLessonId(stage, progress);
  return lessonId ? { stage, lessonId } : null;
}
