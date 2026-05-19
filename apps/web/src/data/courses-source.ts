/**
 * 受講者 UI 用のコース一覧ソース。
 *
 * - Supabase が設定されていて DB に行があれば DB から読む
 * - それ以外 (未設定 / クエリ失敗 / 空) は既存 fixtures にフォールバックする
 *
 * 受講者 UI (`CourseList` / `CourseDetail` / `LessonPlayer`) は `Course[]` 型を
 * そのまま受け取り続けるため、 マッパー (`mapCourseToUi`) で正規化する。
 */

import { useEffect, useState } from "react";
import {
  mapCourseToUi,
  type CourseWithChildren,
  type UiCourse,
} from "@falcon/shared/cms/types";
import type { Course, Tenant } from "@/data/types";
import { COACH_COURSES, SES_COURSES } from "@/data/fixtures";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getCourseWithChildren, listCourses } from "@/lib/cms-api";

function fixturesFor(tenantId: Tenant["id"]): Course[] {
  return tenantId === "coach" ? COACH_COURSES : SES_COURSES;
}

interface UseCoursesResult {
  courses: Course[];
  loading: boolean;
  source: "db" | "fixtures";
}

export function useCoursesForTenant(tenantId: Tenant["id"]): UseCoursesResult {
  const [courses, setCourses] = useState<Course[]>(() => fixturesFor(tenantId));
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [source, setSource] = useState<"db" | "fixtures">("fixtures");

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setCourses(fixturesFor(tenantId));
      setSource("fixtures");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const courseRows = await listCourses(tenantId);
        if (cancelled) return;
        // クエリ成功 = DB を真実として採用する。 空 (= 未 seed / RLS で全部 draft 等) でも
        // fixtures に fallback しない (#10 — Codex P2: RLS で隠した draft が漏れるのを防ぐ)。
        if (courseRows.length === 0) {
          setCourses([]);
          setSource("db");
          return;
        }
        const details = await Promise.all(
          courseRows.map((row) => getCourseWithChildren(row.id)),
        );
        if (cancelled) return;
        const withChildren: CourseWithChildren[] = details.filter(
          (d): d is CourseWithChildren => d !== null,
        );
        const ui: UiCourse[] = withChildren.map(mapCourseToUi);
        // UiCourse は Course と shape 互換 (cms/types.ts のコメント参照)。
        setCourses(ui as unknown as Course[]);
        setSource("db");
      } catch (err) {
        console.error("[useCoursesForTenant] DB fetch failed, fallback to fixtures", err);
        if (!cancelled) {
          setCourses(fixturesFor(tenantId));
          setSource("fixtures");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return { courses, loading, source };
}
