/**
 * つまずき検知 — 発見教材のリクエストを積む条件 (Phase 4)。
 *
 * 「どこで詰まったか」を判定する規則をここ 1 か所に置く。小テストの採点
 * (`routes/quiz.ts`) と添削の確定 (`routes/submissions.ts`) の両方から呼ぶので、
 * 条件が場所ごとにぶれないようにする。
 *
 * ## 呼び出しは best-effort
 *
 * ここが失敗しても本処理 (採点・添削) を止めてはいけない。関数自体は例外を投げる
 * (握り潰すと D1 障害に気づけない) ので、**呼び出し側が try/catch で受けてログに
 * 落とす** — `routes/quiz.ts` の SRS カード反映と同じ流儀。
 *
 * ## 短文 (topic) は **サーバが持つ値だけ** で組む
 *
 * `discovery_requests.topic` は講師の待ち行列に並び、そのまま生成プロンプトの
 * `<discovery_context>` へ入る。受講者が送った文字列 (提出ボディの `assignmentTitle`
 * は VS Code 拡張が自由に詰められる) をここに通すと、**受講者が講師の画面と AI の
 * 入力に任意の文を書ける**ことになる。だから題名は必ず D1 の正本 (lessons /
 * assignments) から引き直し、引けなければ汎用の文言に落とす。
 *
 * レッスン id / 課題 id も外から来る値なので、引き当ては **テナントで絞る**
 * (`resolveLessonStage` / `resolveAssignmentTitle`)。他テナントの id を送るだけで
 * 行が作られる経路を残さない。
 *
 * ## なぜ「2 回目」なのか
 *
 * 1 回落としただけでは、教材を作るほどの詰まりとは言えない (読み違い・操作ミスも
 * 混ざる)。同じ小テストを 2 回落として初めて「理解が足りていない文脈」と見なす。
 * 3 回目以降で行が増えないのは、リクエストの一意索引 (tenant × stage × topic) が
 * `do nothing` で受け止めるため — 数える必要も、誰が落としたかを持つ必要も無い。
 */

import type { Db } from "../db/client.js";
import {
  countFailedQuizAttempts,
  resolveAssignmentTitle,
  resolveLessonStage,
  upsertDiscoveryRequest,
} from "./discovery-data.js";

/** つまずきと見なす「同じ小テストの不合格」回数。 */
export const DISCOVERY_QUIZ_FAIL_THRESHOLD = 2;

/**
 * 小テストの不合格を受けてリクエストを積む。
 *
 * 積むのは **同じ小テストの不合格が 2 回目以降** になったときだけ。合格した受験や
 * 1 回目の不合格では何もしない。
 */
export async function noteQuizStumble(
  db: Db,
  input: { tenantId: string; userId: string; quizId: string; lessonId: string },
): Promise<void> {
  const failures = await countFailedQuizAttempts(db, input.userId, input.quizId);
  if (failures < DISCOVERY_QUIZ_FAIL_THRESHOLD) return;

  // レッスン名は D1 の正本 (`lessons.title`)。小テストの題名は受講者から来ない。
  const stage = await resolveLessonStage(db, input.tenantId, input.lessonId);
  if (!stage) return;
  await upsertDiscoveryRequest(db, {
    tenantId: input.tenantId,
    stageId: stage.stageId,
    topic: `確認テスト「${stage.lessonTitle}」`,
    origin: "quiz_fail",
  });
}

/**
 * 添削が再提出 / 不合格になったことを受けてリクエストを積む。
 *
 * **レッスンに紐づかない提出は見送る** (`lesson_id` が null の行がある)。ステージを
 * 決められないと公開条件も決められないので、無理に題名から推測しない。
 *
 * 題名は `assignments.title` (正本) → 引けなければレッスン名を添えた汎用文言の順。
 * 提出行の `assignment_title` は使わない (受講者が送った文字列そのもの)。
 */
export async function noteSubmissionStumble(
  db: Db,
  input: { tenantId: string; lessonId: string | null; assignmentId: string | null },
): Promise<void> {
  if (!input.lessonId) return;
  const stage = await resolveLessonStage(db, input.tenantId, input.lessonId);
  if (!stage) return;
  const assignmentTitle = input.assignmentId
    ? await resolveAssignmentTitle(db, input.tenantId, input.assignmentId)
    : null;
  await upsertDiscoveryRequest(db, {
    tenantId: input.tenantId,
    stageId: stage.stageId,
    topic: assignmentTitle
      ? `課題「${assignmentTitle}」`
      : `課題のつまずき（${stage.lessonTitle}）`,
    origin: "submission_resubmit",
  });
}
