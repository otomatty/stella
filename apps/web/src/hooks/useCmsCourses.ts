/**
 * 管理 UI 向けに courses / sections / lessons をまとめて取得する Hook。
 */

import { useCallback, useEffect, useState } from "react";
import type {
  CourseRow,
  CourseWithChildren,
} from "@falcon/shared/cms/types";
import {
  getCourseWithChildren,
  listCourses,
} from "@/lib/cms-api";

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

  const refetch = useCallback(async () => {
    if (!tenantId) {
      setCourses([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listCourses(tenantId);
      setCourses(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      setLoading(false);
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

  const refetch = useCallback(async () => {
    if (!courseId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getCourseWithChildren(courseId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
