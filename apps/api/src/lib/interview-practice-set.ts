/**
 * 面談対策 — 「今日の練習セット」の DB 操作 (Issue #235)。
 *
 * 出題の選定そのものは `@falcon/shared/interview/practice-set` (純ロジック) に置き、
 * ここは interview_progress の SM-2 更新と interview_practice_sets の
 * 作成 / 再開 / 記録 / 終了だけを持つ。 SM-2 はデイリー復習と同じ `sm2Next` を通す
 * (自己評価 2 択 → 正解 / 誤答の 2 値がそのまま入力になる)。
 */

import { and, desc, eq } from "drizzle-orm";
import { sm2Next, type SrsCardState } from "@falcon/shared/srs/sm2";
import { addStudyDays, toStudyDate } from "@falcon/shared/study/activity";
import type { PracticeCandidate, PracticeSelfRating } from "@falcon/shared/interview/practice-set";
import {
  PRACTICE_SET_SIZE,
  isPracticeTarget,
  selectPracticeSet,
} from "@falcon/shared/interview/practice-set";

import { interviewPracticeSets, interviewProgress } from "../db/schema.js";
import type { Db } from "../db/client.js";

/** interview_progress 1 行ぶん (SM-2 列を含む)。 */
export interface InterviewProgressState {
  status: "read" | "confident";
  practicedCount: number;
  srsEase: number;
  srsIntervalDays: number;
  srsReps: number;
  srsDueDate: string | null;
  lastResult: PracticeSelfRating | null;
}

/** 受講者の質問ごとの学習ステータスを質問番号キーで返す。 行なし = 未着手。 */
export async function loadInterviewProgress(
  db: Db,
  tenantId: string,
  profileId: string,
): Promise<Map<number, InterviewProgressState>> {
  const rows = await db
    .select({
      questionNo: interviewProgress.questionNo,
      status: interviewProgress.status,
      practicedCount: interviewProgress.practicedCount,
      srsEase: interviewProgress.srsEase,
      srsIntervalDays: interviewProgress.srsIntervalDays,
      srsReps: interviewProgress.srsReps,
      srsDueDate: interviewProgress.srsDueDate,
      lastResult: interviewProgress.lastResult,
    })
    .from(interviewProgress)
    .where(
      and(eq(interviewProgress.tenantId, tenantId), eq(interviewProgress.profileId, profileId)),
    );
  return new Map(
    rows.map((r) => [
      r.questionNo,
      {
        status: r.status,
        practicedCount: r.practicedCount ?? 0,
        srsEase: r.srsEase ?? 2.5,
        srsIntervalDays: r.srsIntervalDays ?? 0,
        srsReps: r.srsReps ?? 0,
        srsDueDate: r.srsDueDate ?? null,
        lastResult: r.lastResult ?? null,
      },
    ]),
  );
}

/** SM-2 を 1 回進めた結果 (次回出題日まで解決したもの)。 */
export interface NextInterviewSrs extends SrsCardState {
  dueDate: string;
  lastResult: PracticeSelfRating;
}

/**
 * 自己評価 1 回ぶん SM-2 を進める。 「できた」= 正解 / 「もう一度」= 誤答。
 * 誤答は interval 1 日固定なので、 「もう一度」を付けた質問は翌日のセットで
 * again バケット (最優先) に入る。
 *
 * 行があれば必ず現在値を渡す。 「もう一度」は reps を 0 に戻すので、 reps で
 * 新規カードかを判定すると ease の減点が毎回捨てられ、 苦手な質問ほど間隔が
 * 伸びてしまう。 この機能より前からある行 (SM-2 列が既定値の 2.5 / 0 / 0) は
 * `sm2Next` に渡しても null と同じ結果になるので、 区別する必要はない。
 */
export function nextInterviewSrs(
  prev: InterviewProgressState | undefined,
  rating: PracticeSelfRating,
  at: Date,
): NextInterviewSrs {
  const next = sm2Next(
    prev ? { ease: prev.srsEase, intervalDays: prev.srsIntervalDays, reps: prev.srsReps } : null,
    rating === "good",
  );
  return { ...next, dueDate: addStudyDays(toStudyDate(at), next.intervalDays), lastResult: rating };
}

/** interview_practice_sets の 1 行 (API がそのまま返す形に近い)。 */
export interface PracticeSetRow {
  id: string;
  date: string;
  questionNos: number[];
  completedNos: number[];
  confidentNos: number[];
  startedPercent: number;
  status: "active" | "done";
  /** 楽観ロックの版数 (API には出さない)。 */
  version: number;
}

const SET_SELECT = {
  id: interviewPracticeSets.id,
  date: interviewPracticeSets.date,
  questionNos: interviewPracticeSets.questionNos,
  completedNos: interviewPracticeSets.completedNos,
  confidentNos: interviewPracticeSets.confidentNos,
  startedPercent: interviewPracticeSets.startedPercent,
  status: interviewPracticeSets.status,
  version: interviewPracticeSets.version,
} as const;

function normalizeSetRow(row: {
  id: string;
  date: string;
  questionNos: number[] | null;
  completedNos: number[] | null;
  confidentNos: number[] | null;
  startedPercent: number | null;
  status: "active" | "done";
  version: number | null;
}): PracticeSetRow {
  return {
    id: row.id,
    date: row.date,
    questionNos: row.questionNos ?? [],
    completedNos: row.completedNos ?? [],
    confidentNos: row.confidentNos ?? [],
    startedPercent: row.startedPercent ?? 0,
    status: row.status,
    version: row.version ?? 0,
  };
}

/** 進行中のセット (受講者ごとに最大 1 つ)。 無ければ null。 */
export async function loadActivePracticeSet(
  db: Db,
  tenantId: string,
  profileId: string,
): Promise<PracticeSetRow | null> {
  const rows = await db
    .select(SET_SELECT)
    .from(interviewPracticeSets)
    .where(
      and(
        eq(interviewPracticeSets.tenantId, tenantId),
        eq(interviewPracticeSets.profileId, profileId),
        eq(interviewPracticeSets.status, "active"),
      ),
    )
    .orderBy(desc(interviewPracticeSets.createdAt))
    .limit(1);
  return rows[0] ? normalizeSetRow(rows[0]) : null;
}

/**
 * 進行中のセットがあればそれを返し (= 再開)、 無ければ今日のセットを作る。
 * 出題対象が 0 問なら作らずに null を返す (割当前・A 必修が無い受講者)。
 *
 * 進行中でも、 残りの質問がすべて見えなくなっていたら畳んで作り直す。 セット作成後に
 * 割当カテゴリが変わるとその質問は可視範囲から外れ、 出すものが無いのに「進行中」の行が
 * 残り続けて (進行中は 1 つだけなので) 以後どのセットも始められなくなる。
 * 全問に自己評価が付いている場合はそのまま返す — 終了サマリを出すのは呼び出し側。
 */
export async function startOrResumePracticeSet(args: {
  db: Db;
  tenantId: string;
  profileId: string;
  candidates: readonly PracticeCandidate[];
  startedPercent: number;
  at: Date;
  size?: number;
}): Promise<{ set: PracticeSetRow; resumed: boolean } | null> {
  const existing = await loadActivePracticeSet(args.db, args.tenantId, args.profileId);
  if (existing) {
    /**
     * 出題を続けてよい質問。 可視かどうかだけでなく出題対象 (A 必修・逆質問を除く) かも見る —
     * 教材の更新で A から B/C になったり逆質問になったりした質問は、 新規セットには入らないのに
     * 進行中セットには残り続け、 答えても準備率が動かない (同じ条件で分母から外れているため)。
     */
    const eligible = new Set(args.candidates.filter(isPracticeTarget).map((c) => c.no));
    const questionNos = existing.questionNos.filter((no) => eligible.has(no));
    if (questionNos.length === 0) {
      // 出せる質問がひとつも残っていない。 畳んで作り直す (下へ抜ける)。
      await finishPracticeSet({
        db: args.db,
        tenantId: args.tenantId,
        profileId: args.profileId,
        setId: existing.id,
      });
    } else if (questionNos.length !== existing.questionNos.length) {
      /**
       * 一部だけ割当から外れた場合。 外れた番号を残すと、 出題できる質問を全部answer
       * し終えてもセットは「未消化あり」のままで、 自動終了できず未回答として確定して
       * しまう。 セットの中身を見える質問だけに刈り込んで、 数え方を合わせる。
       */
      const keep = new Set(questionNos);
      const completedNos = existing.completedNos.filter((no) => keep.has(no));
      const confidentNos = existing.confidentNos.filter((no) => keep.has(no));
      const version = existing.version + 1;
      /**
       * 消化記録と同じく版数を条件にする。 無条件に書くと、 読んでから書くまでの間に
       * 別タブが記録した回答を、 こちらが持っている古い配列で上書きしてしまう。
       * 競合したら刈り込みは諦めて現在の行を返す (次の再開でまた刈り込まれる)。
       */
      const pruned = await args.db
        .update(interviewPracticeSets)
        .set({ questionNos, completedNos, confidentNos, version, updatedAt: new Date() })
        .where(
          and(
            eq(interviewPracticeSets.id, existing.id),
            eq(interviewPracticeSets.version, existing.version),
          ),
        )
        .returning(SET_SELECT);
      const row = pruned[0];
      if (!row) {
        const current = await loadPracticeSetById(
          args.db,
          args.tenantId,
          args.profileId,
          existing.id,
        );
        return current ? { set: current, resumed: true } : { set: existing, resumed: true };
      }
      return { set: normalizeSetRow(row), resumed: true };
    } else {
      return { set: existing, resumed: true };
    }
  }

  const today = toStudyDate(args.at);
  const questionNos = selectPracticeSet(args.candidates, today, args.size ?? PRACTICE_SET_SIZE);
  if (questionNos.length === 0) return null;

  const id = crypto.randomUUID();
  try {
    await args.db.insert(interviewPracticeSets).values({
      id,
      tenantId: args.tenantId,
      profileId: args.profileId,
      date: today,
      questionNos,
      completedNos: [],
      confidentNos: [],
      startedPercent: args.startedPercent,
      status: "active",
    });
  } catch (e) {
    // 進行中セットの部分ユニーク制約。 同時に 2 回叩かれた場合は先着を再開扱いにする。
    const concurrent = await loadActivePracticeSet(args.db, args.tenantId, args.profileId);
    if (!concurrent) throw e;
    return { set: concurrent, resumed: true };
  }
  return {
    set: {
      id,
      date: today,
      questionNos,
      completedNos: [],
      confidentNos: [],
      startedPercent: args.startedPercent,
      status: "active",
      version: 0,
    },
    resumed: false,
  };
}

/** セットを id で引く (本人のものだけ)。 */
export async function loadPracticeSetById(
  db: Db,
  tenantId: string,
  profileId: string,
  id: string,
): Promise<PracticeSetRow | null> {
  const rows = await db
    .select(SET_SELECT)
    .from(interviewPracticeSets)
    .where(
      and(
        eq(interviewPracticeSets.id, id),
        eq(interviewPracticeSets.tenantId, tenantId),
        eq(interviewPracticeSets.profileId, profileId),
      ),
    )
    .limit(1);
  return rows[0] ? normalizeSetRow(rows[0]) : null;
}

function withNo(list: readonly number[], no: number): number[] {
  return list.includes(no) ? [...list] : [...list, no];
}

function withoutNo(list: readonly number[], no: number): number[] {
  return list.filter((v) => v !== no);
}

/** 消化記録が競合したときに読み直す回数。 */
const ANSWER_WRITE_ATTEMPTS = 5;

/**
 * セットに自己評価 1 件を記録する。 セット外の質問 (サブ導線の「全問からランダム」) は
 * 何もしない。 同じ質問をやり直したときは最後の評価が残る。
 *
 * 消化は JSON 配列の読み → 追記 → 書き戻しなので、 自己評価が同時に 2 件走ると
 * 後着が先着の 1 問を消し、 答えたはずの質問がサマリで「未回答」になり再開でも出てくる。
 * 更新は読んだときの版数と一致する行だけに当て、 外れたら読み直してやり直す。
 */
export async function recordPracticeSetAnswer(args: {
  db: Db;
  tenantId: string;
  profileId: string;
  setId: string;
  questionNo: number;
  confident: boolean;
}): Promise<PracticeSetRow | null> {
  for (let attempt = 0; attempt < ANSWER_WRITE_ATTEMPTS; attempt++) {
    const set = await loadPracticeSetById(args.db, args.tenantId, args.profileId, args.setId);
    if (set?.status !== "active") return null;
    if (!set.questionNos.includes(args.questionNo)) return set;

    const completedNos = withNo(set.completedNos, args.questionNo);
    const confidentNos = args.confident
      ? withNo(set.confidentNos, args.questionNo)
      : withoutNo(set.confidentNos, args.questionNo);
    const version = set.version + 1;
    const updated = await args.db
      .update(interviewPracticeSets)
      .set({ completedNos, confidentNos, version, updatedAt: new Date() })
      .where(
        and(eq(interviewPracticeSets.id, set.id), eq(interviewPracticeSets.version, set.version)),
      )
      .returning({ id: interviewPracticeSets.id });
    if (updated.length > 0) return { ...set, completedNos, confidentNos, version };
    // 競合。 先着が書いた内容を読み直して、 その上に自分の 1 問を積む。
  }
  /**
   * 競合が続いて書けなかった。 現在の行を返すと、 呼び出し側は「記録できた」と解釈して
   * この 1 問を含まないセットをそのまま返してしまう。 記録できなかったことを示す
   * (自己評価そのものは interview_progress に入っているので、 次の取得で追いつく)。
   */
  return null;
}

/**
 * セットを終了する (全問終えた / 途中で切り上げた のどちらも同じ)。
 * 版数を進めて、 同時に走っている消化記録が書き戻しではなく読み直しへ回るようにする
 * (読み直せば status が done なので何も書かずに終わる)。
 */
export async function finishPracticeSet(args: {
  db: Db;
  tenantId: string;
  profileId: string;
  setId: string;
}): Promise<PracticeSetRow | null> {
  const set = await loadPracticeSetById(args.db, args.tenantId, args.profileId, args.setId);
  if (!set) return null;
  if (set.status === "done") return set;
  /**
   * 戻り値は更新後の行そのもの。 読み込んだ時点の配列を返すと、 その後に確定した
   * 消化 (最後の 1 問など) を取りこぼしたサマリになる。
   */
  const updated = await args.db
    .update(interviewPracticeSets)
    .set({ status: "done", version: set.version + 1, updatedAt: new Date() })
    .where(eq(interviewPracticeSets.id, set.id))
    .returning(SET_SELECT);
  const row = updated[0];
  return row ? normalizeSetRow(row) : { ...set, status: "done", version: set.version + 1 };
}
