/**
 * staff (instructor/admin) 向けに、 あるコースの enrollment 一覧を取得する Hook (Issue #20)。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { EnrollmentRow } from "@falcon/shared/cms/types";
import { listEnrollmentsForCourse } from "@/lib/enrollments-api";

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
