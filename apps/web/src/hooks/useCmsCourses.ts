/**
 * 管理 UI 向けに courses / sections / lessons をまとめて取得する Hook。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { CourseRow, CourseWithChildren } from "@falcon/shared/cms/types";
import { getCourseWithChildren, listCourses } from "@/lib/cms-api";

interface UseCmsCoursesResult {
  courses: CourseRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCmsCourses(tenantId: string | null): UseCmsCoursesResult {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!tenantId) {
      setCourses([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listCourses(tenantId);
      if (reqId !== requestIdRef.current) return;
      setCourses(rows);
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

  return { courses, loading, error, refetch };
}

interface UseCmsCourseResult {
  data: CourseWithChildren | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCmsCourse(courseId: string | null): UseCmsCourseResult {
  const [data, setData] = useState<CourseWithChildren | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!courseId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getCourseWithChildren(courseId);
      if (reqId !== requestIdRef.current) return;
      setData(result);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
