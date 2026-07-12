/**
 * 受講者 UI 用のコース一覧ソース。
 *
 * - バックエンドが設定されていて DB に行があれば DB から読む
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
import { isBackendConfigured } from "@/lib/backend";
import { getCourseWithChildren, listCourses } from "@/lib/cms-api";
import { listEnrollmentsForUser } from "@/lib/enrollments-api";

function fixturesFor(tenantId: Tenant["id"]): Course[] {
  return tenantId === "coach" ? COACH_COURSES : SES_COURSES;
}

interface UseCoursesResult {
  courses: Course[];
  loading: boolean;
  source: "db" | "fixtures";
}

export function useCoursesForTenant(
  tenantId: Tenant["id"],
  enabled = true,
): UseCoursesResult {
  const [courses, setCourses] = useState<Course[]>(() => fixturesFor(tenantId));
  const [loading, setLoading] = useState(isBackendConfigured());
  const [source, setSource] = useState<"db" | "fixtures">("fixtures");

  useEffect(() => {
    // role 等で未使用の場合はフェッチしない (二重フェッチ抑止)。
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (!isBackendConfigured()) {
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
  }, [tenantId, enabled]);

  return { courses, loading, source };
}

/**
 * 受講者ダッシュボード / コース一覧用の「自分に割り当てられたコース」ソース (Issue #20)。
 *
 * `useCoursesForTenant` (テナントの published コース一覧 = 公開コースを「探す」) とは分離し、
 * enrollment ベースで自分が受講登録されたコースのみを返す。 各コースには enrollment 由来の
 * 期限 (`dueAt`) / 必須 (`required`) / 完了 (`completed`) を実データで載せる。
 *
 * - バックエンド未設定: 従来どおり fixtures をそのまま返す (デモ用)。
 * - バックエンド設定済み: enrollment → コース詳細を引いてマージする。 enrollment が無ければ空。
 *   draft コースの enrollment は courses RLS で詳細取得が null になり、 受講者には現れない。
 */
export function useEnrolledCoursesForTenant(
  tenantId: Tenant["id"],
  userId: string | null,
  enabled = true,
): UseCoursesResult {
  const [courses, setCourses] = useState<Course[]>(() => fixturesFor(tenantId));
  const [loading, setLoading] = useState(isBackendConfigured());
  const [source, setSource] = useState<"db" | "fixtures">("fixtures");

  useEffect(() => {
    // role 等で未使用の場合はフェッチしない (二重フェッチ抑止)。
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (!isBackendConfigured()) {
      setCourses(fixturesFor(tenantId));
      setSource("fixtures");
      setLoading(false);
      return;
    }
    if (!userId) {
      setCourses([]);
      setSource("db");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const enrollments = await listEnrollmentsForUser(userId);
        if (cancelled) return;
        if (enrollments.length === 0) {
          setCourses([]);
          setSource("db");
          return;
        }
        // 1 コースの取得失敗 (削除済み / 一時的なエラー等) で全体を fixtures に
        // フォールバックさせないよう、 個別に catch して null に倒す。
        const details = await Promise.all(
          enrollments.map((e) =>
            getCourseWithChildren(e.course_id).catch((err) => {
              console.error(
                `[useEnrolledCoursesForTenant] course ${e.course_id} fetch failed`,
                err,
              );
              return null;
            }),
          ),
        );
        if (cancelled) return;
        const detailById = new Map(
          details
            .filter((d): d is CourseWithChildren => d !== null)
            .map((d) => [d.course.id, d]),
        );

        const merged: Course[] = [];
        for (const e of enrollments) {
          const detail = detailById.get(e.course_id);
          // 詳細が引けない (= draft / RLS で不可視) コースは受講者一覧に出さない。
          if (!detail) continue;
          const ui: UiCourse = mapCourseToUi(detail);
          const completed = e.status === "completed";
          // UiCourse は Course と shape 互換 (cms/types.ts のコメント参照)。
          merged.push({
            ...ui,
            dueAt: e.due_at,
            required: e.required,
            completed,
          } as unknown as Course);
        }
        setCourses(merged);
        setSource("db");
      } catch (err) {
        console.error(
          "[useEnrolledCoursesForTenant] DB fetch failed, fallback to fixtures",
          err,
        );
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
  }, [tenantId, userId, enabled]);

  return { courses, loading, source };
}
