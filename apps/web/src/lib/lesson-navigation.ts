/**
 * レッスン画面の前後移動の解決。
 *
 * 受講画面のレッスン移動は目次からのクリックしか無かったため、 完了しても次へ
 * 進む導線が無かった。 ここではコースを「セクションを跨いだ 1 本の並び」として
 * 扱い、 現在地の前後にある移動先を返す。
 *
 * - `locked` はスキップして更に手前 / 先を探す。 順序の強制は locked が担っている
 *   ので、 ナビはその解禁済みの隣へ寄せる。 status は fixture の初期値ではなく
 *   進捗ストアで解決したもの (`resolveLessonStatus`) を見る。
 * - セクションを跨ぐかどうかは `nextStartsNewSection` で呼び出し側へ伝える
 *   (区切りで「セクション完了」の表示に切り替えるため)。
 */

import type { Course, Lesson, Section } from "@/data/types";
import { resolveLessonStatus, type LessonProgressMap } from "@/lib/lesson-progress";

export interface LessonNavNode {
  lesson: Lesson;
  section: Section;
  /** コース内の通し番号 (1-indexed / locked も数える) */
  position: number;
}

export interface LessonNeighbors {
  /** 表示中のレッスン。 コースに含まれていなければ null。 */
  current: LessonNavNode | null;
  /** 手前の解禁済みレッスン。 無ければ null。 */
  prev: LessonNavNode | null;
  /** 次の解禁済みレッスン。 無ければ null (= 実質コースの最後)。 */
  next: LessonNavNode | null;
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
  /** コースのレッスンが**すべて**完了しているか。 同上の理由で next の有無とは別に見る。 */
  courseComplete: boolean;
  /** コースのレッスン総数 (locked を含む)。 「3 / 12」 の分母。 */
  total: number;
}

const EMPTY_NEIGHBORS: LessonNeighbors = {
  current: null,
  prev: null,
  next: null,
  nextStartsNewSection: false,
  currentSectionComplete: false,
  courseComplete: false,
  total: 0,
};

/** コースのレッスンをセクション順・レッスン順に 1 本へ並べる。 */
export function flattenLessonNodes(course: Course | undefined): LessonNavNode[] {
  const nodes: LessonNavNode[] = [];
  for (const section of course?.sections ?? []) {
    for (const lesson of section.lessons) {
      nodes.push({ lesson, section, position: nodes.length + 1 });
    }
  }
  return nodes;
}

/** `from` から `step` 方向へ進み、 最初に条件を満たすノードを返す。 */
function findInDirection(
  nodes: LessonNavNode[],
  from: number,
  step: 1 | -1,
  accept: (node: LessonNavNode) => boolean,
): LessonNavNode | null {
  for (let i = from + step; i >= 0 && i < nodes.length; i += step) {
    const node = nodes[i];
    if (node && accept(node)) return node;
  }
  return null;
}

/** 表示中のレッスンから見た前後の移動先を解決する。 */
export function resolveLessonNeighbors(
  course: Course | undefined,
  activeLessonId: string,
  map: LessonProgressMap,
): LessonNeighbors {
  const nodes = flattenLessonNodes(course);
  if (nodes.length === 0) return EMPTY_NEIGHBORS;
  const index = nodes.findIndex((n) => n.lesson.id === activeLessonId);
  const current = index >= 0 ? (nodes[index] ?? null) : null;
  if (!current) return { ...EMPTY_NEIGHBORS, total: nodes.length };

  const unlocked = (node: LessonNavNode) => resolveLessonStatus(node.lesson, map) !== "locked";
  const prev = findInDirection(nodes, index, -1, unlocked);
  const next = findInDirection(nodes, index, 1, unlocked);
  const isDone = (node: LessonNavNode) => resolveLessonStatus(node.lesson, map) === "done";
  return {
    current,
    prev,
    next,
    nextStartsNewSection: next !== null && next.section.id !== current.section.id,
    currentSectionComplete: nodes.filter((n) => n.section.id === current.section.id).every(isDone),
    courseComplete: nodes.every(isDone),
    total: nodes.length,
  };
}
