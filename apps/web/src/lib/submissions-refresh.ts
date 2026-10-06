/**
 * staff の提出一覧 (提出物ストア) を取り直す判断 (#34)。
 *
 * このストアが人の件数・AI の状態・判定案を決めるので、初回だけ読んで終わりにすると、ほかの
 * 講師の確定や AI の非同期の結果が画面を開き直しても反映されない。
 * - レビュー画面・ダッシュボードを開いたとき、タブが見えるようになったときに取り直す
 *   (取り直した直後は続けて取りに行かない)。
 * - AI が確認中の提出があるあいだは、タブが見えているときだけ控えめな間隔で取り直す。
 * - 取り直しの間に講師が保存した行は、手元の行を残す (古い応答で確定を巻き戻さない)。
 */

import type { Submission } from "@stella/shared/review/types";
import { isAiChecking } from "./review-queue";

/** AI が確認中の提出があるあいだの取り直しの間隔。 */
export const SUBMISSIONS_POLL_MS = 45_000;
/** 取り直した直後に、画面の開き直しで続けて取りに行かない間隔。 */
export const SUBMISSIONS_MIN_REFETCH_MS = 5_000;

/** 間隔を置いて取り直すか。AI が確認中の提出があり、タブが見えているときだけ。 */
export function shouldPollSubmissions(
  rows: Pick<Submission, "status" | "verdict" | "aiReviewStatus">[],
  visible: boolean,
): boolean {
  return visible && rows.some(isAiChecking);
}

/** 直前に取り直したばかりか。 */
export function isFetchFresh(
  lastFetchedAt: number | undefined,
  now: number,
  minAgeMs = SUBMISSIONS_MIN_REFETCH_MS,
): boolean {
  return lastFetchedAt !== undefined && now - lastFetchedAt < minAgeMs;
}

/**
 * 取り直した一覧で置き換える。`keepLocal` が true の行 (取り直しの間に講師が保存した・保存中の行)
 * は手元の行を残し、取り直した一覧に無ければ末尾に残す。
 */
export function mergeFetchedRows(
  current: Submission[],
  fetched: Submission[],
  keepLocal: (id: string) => boolean,
): Submission[] {
  const byId = new Map(current.map((s) => [s.id, s]));
  const fetchedIds = new Set(fetched.map((s) => s.id));
  return [
    ...fetched.map((s) => (keepLocal(s.id) ? (byId.get(s.id) ?? s) : s)),
    ...current.filter((s) => !fetchedIds.has(s.id) && keepLocal(s.id)),
  ];
}
