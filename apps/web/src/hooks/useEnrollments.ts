/**
 * staff (instructor/admin) 向けの enrollment 取得 Hook (Issue #20)。
 *
 * - `useCourseEnrollments` … コース単位 (成績台帳などコースを軸にする画面向け)
 * - `useUsersEnrollments` … 選択中の受講者ぶん (受講登録画面は受講生を軸に選ぶ)
 * - `useEnrollmentSummaries` … 受講者ごとの件数だけ (受講登録画面の一覧バッジ)
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { EnrollmentRow, EnrollmentSummaryRow } from "@falcon/shared/cms/types";
import {
  listEnrollmentSummaries,
  listEnrollmentsForCourse,
  listEnrollmentsForUsers,
} from "@/lib/enrollments-api";

interface UseCourseEnrollmentsResult {
  enrollments: EnrollmentRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCourseEnrollments(courseId: string | null): UseCourseEnrollmentsResult {
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!courseId) {
      setEnrollments([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listEnrollmentsForCourse(courseId);
      if (reqId !== requestIdRef.current) return;
      setEnrollments(rows);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [courseId]);

  // コース切替時は前コースの行を即クリアする。 ロード完了まで古い enrollments を
  // 残すと、 切替直後のクリックで別コースの enrollment を削除/更新し得る。
  // courseId にのみ依存させ、 操作後の手動 refetch (同一 courseId) ではクリアせず
  // テーブルのちらつきを防ぐ。
  // biome-ignore lint/correctness/useExhaustiveDependencies: courseId 切替時だけ一覧を空にする
  useEffect(() => {
    setEnrollments([]);
  }, [courseId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { enrollments, loading, error, refetch };
}

/**
 * 選択中の受講者たちの enrollment。 受講登録画面は受講生を選んでから教材を割り当てるため、
 * 選択が変わるたびにその人数ぶんだけ取り直す (テナント全件は取らない)。
 */
export function useUsersEnrollments(userIds: string[]): UseCourseEnrollmentsResult {
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  // 配列の同一性ではなく中身で再取得を判断する (呼び出し側の useMemo を不要にする)。
  const key = [...userIds].sort().join(",");
  // 操作 (割当など) の完了後に呼ばれる refetch は、 その操作を始めた時点のクロージャを
  // 掴んでいる。 選択が変わったあとに古い key で取り直すと、 新しい選択の結果を古い
  // 受講者の行で上書きしてしまうため、 常に最新の key を ref 経由で読む。
  const keyRef = useRef(key);
  keyRef.current = key;

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    const ids = keyRef.current ? keyRef.current.split(",") : [];
    if (ids.length === 0) {
      setEnrollments([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listEnrollmentsForUsers(ids);
      if (reqId !== requestIdRef.current) return;
      setEnrollments(rows);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, []);

  // 選択が変わったら前の受講者の行を即クリアしてから取り直す。 ロード完了まで残すと、
  // 切替直後のクリックで別の受講者の enrollment を消し得る。
  // biome-ignore lint/correctness/useExhaustiveDependencies: refetch は最新 key を ref で読む
  useEffect(() => {
    setEnrollments([]);
    void refetch();
  }, [key]);

  return { enrollments, loading, error, refetch };
}

interface UseEnrollmentSummariesResult {
  /** 受講者 id → 割当件数 / 期限超過件数。 */
  summaries: Map<string, EnrollmentSummaryRow>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** 受講者ごとの割当件数サマリ。 受講登録画面の受講者一覧バッジに使う。 */
export function useEnrollmentSummaries(tenantId: string | null): UseEnrollmentSummariesResult {
  const [summaries, setSummaries] = useState<Map<string, EnrollmentSummaryRow>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!tenantId) {
      setSummaries(new Map());
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listEnrollmentSummaries();
      if (reqId !== requestIdRef.current) return;
      setSummaries(new Map(rows.map((row) => [row.user_id, row])));
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { summaries, loading, error, refetch };
}
