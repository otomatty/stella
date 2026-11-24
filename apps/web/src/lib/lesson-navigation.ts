/**
 * レッスン画面の前後移動の解決。
 *
 * 受講画面のレッスン移動は目次からのクリックしか無かったため、 完了しても次へ
 * 進む導線が無かった。 ここではステージを「セクションを跨いだ 1 本の並び」として
 * 扱い、 現在地の隣のレッスンを返す。
 *
 * - 前後は並びの 1 つ隣。 ロック中でも返す (飛ばさない)。 ロック中のときは
 *   `nextBlockedBy` / `prevBlockedBy` が止めているレッスンを指す。
 * - セクションを跨ぐかどうかは `nextStartsNewSection` で呼び出し側へ伝える
 *   (区切りで「セクション完了」の表示に切り替えるため)。
 */

import type { Stage, Lesson, Section } from "@/data/types";
import { resolveLessonStatus, type LessonProgressMap } from "@/lib/lesson-progress";

import { problemLockReason, type ProblemLesson } from "./problem-lesson";

export interface LessonNavNode {
  lesson: Lesson;
  section: Section;
  /** ステージ内の通し番号 (1-indexed / locked も数える) */
  position: number;
}

export interface LessonNeighbors {
  /** 表示中のレッスン。 ステージに含まれていなければ null。 */
  current: LessonNavNode | null;
  /** 1 つ前のレッスン。 ロック中でも返す。 無ければ null。 */
  prev: LessonNavNode | null;
  /** 1 つ次のレッスン。 ロック中でも返す。 無ければ null (= 並びの最後)。 */
  next: LessonNavNode | null;
  /** prev がロック中か。 prev が無ければ false。 */
  prevLocked: boolean;
  /** prev がロック中のとき、止めているレッスン。 */
  prevBlockedBy: LessonNavNode | null;
  /** prev がロック中のときの理由。 */
  prevLockReason: string | null;
  /** next がロック中か。 next が無ければ false。 */
  nextLocked: boolean;
  /** next がロック中のとき、止めているレッスン。 */
  nextBlockedBy: LessonNavNode | null;
  /** next がロック中のときの理由。 */
  nextLockReason: string | null;
  /** next が現在と別セクションか。 current / next が無ければ false。 */
  nextStartsNewSection: boolean;
  /**
   * 現在のセクションのレッスンが**すべて**完了しているか。
   *
   * 「次が別セクション」 と 「セクションを完了した」 は別物。 前後ナビは未完了でも
   * 移動できるので、 途中を飛ばしてセクション末尾だけ終えることがある。 祝う文面は
   * こちらで判定する (locked は done になり得ないので、 残っていれば未完了扱い)。
   */
  currentSectionComplete: boolean;
  /** ステージのレッスンが**すべて**完了しているか。 同上の理由で next の有無とは別に見る。 */
  stageComplete: boolean;
  /** ステージのレッスン総数 (locked を含む)。 「3 / 12」 の分母。 */
  total: number;
}

const EMPTY_NEIGHBORS: LessonNeighbors = {
  current: null,
  prev: null,
  next: null,
  prevLocked: false,
  prevBlockedBy: null,
  prevLockReason: null,
  nextLocked: false,
  nextBlockedBy: null,
  nextLockReason: null,
  nextStartsNewSection: false,
  currentSectionComplete: false,
  stageComplete: false,
  total: 0,
};

/** ステージのレッスンをセクション順・レッスン順に 1 本へ並べる。 */
export function flattenLessonNodes(stage: Stage | undefined): LessonNavNode[] {
  const nodes: LessonNavNode[] = [];
  for (const section of stage?.sections ?? []) {
    for (const lesson of section.lessons) {
      nodes.push({ lesson, section, position: nodes.length + 1 });
    }
  }
  return nodes;
}

interface NeighborLock {
  locked: boolean;
  blockedBy: LessonNavNode | null;
  reason: string | null;
}

function neighborLock(
  node: LessonNavNode | null,
  nodes: readonly LessonNavNode[],
  map: LessonProgressMap,
  problemLessons: ReadonlyMap<string, ProblemLesson> | undefined,
): NeighborLock {
  if (!node || resolveLessonStatus(node.lesson, map, problemLessons) !== "locked") {
    return { locked: false, blockedBy: null, reason: null };
  }
  const problem = problemLessons?.get(node.lesson.id)?.problem;
  const blockerId = problem?.blocking?.id ?? problem?.afterLessonId;
  const blockedBy =
    problem && blockerId
      ? (nodes.find((candidate) => candidate.lesson.id === blockerId) ?? null)
      : null;
  return {
    locked: true,
    blockedBy,
    reason: problemLockReason(problem) ?? null,
  };
}

/** 表示中のレッスンから見た前後の移動先を解決する。 */
export function resolveLessonNeighbors(
  stage: Stage | undefined,
  activeLessonId: string,
  map: LessonProgressMap,
  problemLessons?: ReadonlyMap<string, ProblemLesson>,
): LessonNeighbors {
  const nodes = flattenLessonNodes(stage);
  if (nodes.length === 0) return EMPTY_NEIGHBORS;
  const index = nodes.findIndex((n) => n.lesson.id === activeLessonId);
  const current = index >= 0 ? (nodes[index] ?? null) : null;
  if (!current) return { ...EMPTY_NEIGHBORS, total: nodes.length };

  const prev = index > 0 ? (nodes[index - 1] ?? null) : null;
  const next = index + 1 < nodes.length ? (nodes[index + 1] ?? null) : null;
  const prevLock = neighborLock(prev, nodes, map, problemLessons);
  const nextLock = neighborLock(next, nodes, map, problemLessons);
  const isDone = (node: LessonNavNode) =>
    resolveLessonStatus(node.lesson, map, problemLessons) === "done";
  return {
    current,
    prev,
    next,
    prevLocked: prevLock.locked,
    prevBlockedBy: prevLock.blockedBy,
    prevLockReason: prevLock.reason,
    nextLocked: nextLock.locked,
    nextBlockedBy: nextLock.blockedBy,
    nextLockReason: nextLock.reason,
    nextStartsNewSection: next !== null && next.section.id !== current.section.id,
    currentSectionComplete: nodes.filter((n) => n.section.id === current.section.id).every(isDone),
    stageComplete: nodes.every(isDone),
    total: nodes.length,
  };
}
