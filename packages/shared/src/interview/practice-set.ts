/**
 * 面談対策 — 「今日の練習セット」の出題選定 (Issue #235)。
 *
 * デイリー復習 (SRS) と同じ SM-2 をそのまま使い、 面談対策側は「どの 10 問を今日出すか」
 * だけをここで決める (I/O は持たない)。 対象は割当カテゴリの A 必修のみ — 逆質問は
 * 「聞く質問」なので出題しない (準備率 `prepRate` の分母とも揃える)。
 *
 * 優先順位 (issue の受け入れ条件そのまま):
 *   1. again … 「もう一度」を付けた質問 (期日を迎えているもの)
 *   2. fresh … 未着手・未練習 (自己評価をまだ 1 度もしていない)
 *   3. due   … `練習OK` のうち SM-2 の期日を過ぎたもの
 *   4. ahead … まだ期日前 (= 得意な質問)。 上の 3 つで 10 問に満たないときだけ前倒しで補充する
 *
 * 4 を「補充」に留めるのが肝で、 これがないと得意な問題が毎日出て苦手が放置される
 * (再設計提案 §課題 2)。
 */

import type { StoredProgressStatus } from "./progress.js";

/** 1 セットの問題数。 */
export const PRACTICE_SET_SIZE = 10;

/** 自己評価の 2 択 (SM-2 の入力は正解 / 誤答の 2 値なのでこれに対応する)。 */
export type PracticeSelfRating = "again" | "good";

export type PracticeBucket = "again" | "fresh" | "due" | "ahead";

/** 優先度の高い順。 セットはこの順に詰める。 */
export const PRACTICE_BUCKET_ORDER: readonly PracticeBucket[] = [
  "again",
  "fresh",
  "due",
  "ahead",
] as const;

/** 出題候補 1 問 (質問メタ + interview_progress の SM-2 列)。 */
export interface PracticeCandidate {
  no: number;
  freq: "A" | "B" | "C";
  is_reverse: boolean;
  /** interview_progress.status。 行なし (未着手) は null。 */
  status?: StoredProgressStatus | null;
  /** 自己評価した回数。 SM-2 列が入る前の行 (Issue #232) の練習有無を見るのに使う。 */
  practicedCount?: number;
  /** SM-2 の次回出題日 (`YYYY-MM-DD`)。 未練習は null。 */
  srsDueDate?: string | null;
  /** 最後の自己評価。 未練習は null。 */
  lastResult?: PracticeSelfRating | null;
}

/** 出題対象か (割当済みカテゴリの A 必修・逆質問を除く)。 */
export function isPracticeTarget(c: Pick<PracticeCandidate, "freq" | "is_reverse">): boolean {
  return c.freq === "A" && !c.is_reverse;
}

/**
 * 候補の分類。 対象外は null。
 * 期日 (`srsDueDate`) が未来のものは、 「もう一度」を付けた質問でも ahead に落とす —
 * 同じ日に何セットも回したとき、 さっき答えたばかりの質問がまた並ぶのを防ぐ。
 */
export function practiceBucket(c: PracticeCandidate, today: string): PracticeBucket | null {
  if (!isPracticeTarget(c)) return null;
  const last = c.lastResult ?? null;
  if (last === null) {
    /**
     * SM-2 列より前からある行 (Issue #232) は `last_result` も期日も持たない。
     * これを一律で未練習にすると、 すでに 練習OK にした質問が「未着手」と同じ扱いで
     * 並び、 一度も触っていない質問より先に出てしまう。 保存済みのステータスと
     * 練習回数から、 その質問に何をしたかを復元する。
     */
    if (c.status === "confident") return "due";
    if ((c.practicedCount ?? 0) > 0) return "again";
    return "fresh";
  }
  const due = c.srsDueDate ?? null;
  if (due !== null && due > today) return "ahead";
  return last === "again" ? "again" : "due";
}

/** バケット内の並び: 期日の古い順 (未設定が先) → 質問番号順。 出題を決定的にする。 */
function compareCandidates(a: PracticeCandidate, b: PracticeCandidate): number {
  const da = a.srsDueDate ?? "";
  const db = b.srsDueDate ?? "";
  if (da !== db) return da < db ? -1 : 1;
  return a.no - b.no;
}

/**
 * 今日のセットに出す質問番号を優先度順に返す (最大 `size` 問)。
 * `today` はアプリ基準 TZ の `YYYY-MM-DD` (`toStudyDate`)。
 */
export function selectPracticeSet(
  candidates: readonly PracticeCandidate[],
  today: string,
  size: number = PRACTICE_SET_SIZE,
): number[] {
  const byBucket = new Map<PracticeBucket, PracticeCandidate[]>();
  for (const c of candidates) {
    const bucket = practiceBucket(c, today);
    if (!bucket) continue;
    const list = byBucket.get(bucket);
    if (list) list.push(c);
    else byBucket.set(bucket, [c]);
  }
  const picked: number[] = [];
  for (const bucket of PRACTICE_BUCKET_ORDER) {
    const list = byBucket.get(bucket);
    if (!list) continue;
    for (const c of list.slice().sort(compareCandidates)) {
      if (picked.length >= size) return picked;
      picked.push(c.no);
    }
  }
  return picked;
}

/** セットの進み具合 (中断・再開の表示と終了判定に使う)。 */
export interface PracticeSetProgress {
  total: number;
  completed: number;
  remaining: number;
  /** 次に答える質問番号。 全問終えていたら null。 */
  nextNo: number | null;
  finished: boolean;
}

export function practiceSetProgress(
  questionNos: readonly number[],
  completedNos: readonly number[],
): PracticeSetProgress {
  const done = new Set(completedNos);
  const remainingNos = questionNos.filter((no) => !done.has(no));
  return {
    total: questionNos.length,
    completed: questionNos.length - remainingNos.length,
    remaining: remainingNos.length,
    nextNo: remainingNos[0] ?? null,
    finished: remainingNos.length === 0 && questionNos.length > 0,
  };
}

/**
 * 再開時に出題する残り (完了済みを除き、 セットの順番は保つ)。 `availableNos` を渡すと
 * その中にある質問だけに絞る (割当変更などで手元に無い質問を出さない)。
 *
 * 完了済みを出題順に残すと、 パスした質問から再開したときに答え終えた質問がもう一度出て、
 * そこで自己評価をやり直すと SM-2 が 1 問で二重に進んでしまう。
 */
export function remainingPracticeQuestions(
  questionNos: readonly number[],
  completedNos: readonly number[],
  availableNos?: readonly number[],
): number[] {
  const done = new Set(completedNos);
  const available = availableNos ? new Set(availableNos) : null;
  return questionNos.filter((no) => !done.has(no) && (available === null || available.has(no)));
}

/**
 * 次に出題する位置。 まだ自己評価していない質問を「現在位置の後ろ → 先頭へ回って」の
 * 順に探し、 残りが無ければ null (= セット終了)。 `currentIndex` はいま離れる質問なので
 * 対象から外す (パスした直後にその質問へ戻り続けるのを防ぐ)。
 *
 * 単に次の番号へ進めると、 パスした質問が末尾到達でセットごと閉じられて置き去りになる。
 */
export function nextUnratedIndex(
  order: readonly number[],
  currentIndex: number,
  ratedNos: readonly number[],
): number | null {
  const rated = new Set(ratedNos);
  const ahead = order.findIndex((no, i) => i > currentIndex && !rated.has(no));
  if (ahead >= 0) return ahead;
  const wrapped = order.findIndex((no, i) => i !== currentIndex && !rated.has(no));
  return wrapped >= 0 ? wrapped : null;
}

/** セット終了サマリ (できた n/10 と準備率の伸び)。 */
export interface PracticeSetSummary {
  total: number;
  /** 「できた」を付けた数。 */
  confident: number;
  /** 「もう一度」を付けた数。 */
  again: number;
  /** 答えずに終えた数 (中断して終了した場合)。 */
  skipped: number;
  /** セット開始時の準備率 (%)。 */
  startedPercent: number;
  /** 終了時点の準備率 (%)。 */
  currentPercent: number;
  /** 伸び (currentPercent - startedPercent)。 */
  gainedPercent: number;
}

export function summarizePracticeSet(input: {
  questionNos: readonly number[];
  completedNos: readonly number[];
  confidentNos: readonly number[];
  startedPercent: number;
  currentPercent: number;
}): PracticeSetSummary {
  const total = input.questionNos.length;
  const inSet = new Set(input.questionNos);
  const completed = input.completedNos.filter((no) => inSet.has(no));
  const confident = new Set(input.confidentNos.filter((no) => inSet.has(no)));
  return {
    total,
    confident: confident.size,
    again: completed.filter((no) => !confident.has(no)).length,
    skipped: total - new Set(completed).size,
    startedPercent: input.startedPercent,
    currentPercent: input.currentPercent,
    gainedPercent: input.currentPercent - input.startedPercent,
  };
}
