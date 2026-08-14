/**
 * 受講者 UI 用のコース一覧ソース。
 *
 * - バックエンド設定済み: DB から読む。失敗時は空配列 + error（fixtures に戻さない）。
 * - バックエンド未設定: 既存 fixtures（デモ専用）。
 *
 * 受講者 UI (`CourseList` / `CourseDetail` / `LessonPlayer`) は `Course[]` 型を
 * そのまま受け取り続けるため、 マッパー (`mapCourseToUi`) で正規化する。
 */

import { useEffect, useState } from "react";
import {
  mapCourseToUi,
  type CourseRow,
  type CourseWithChildren,
  type UiCourse,
} from "@falcon/shared/cms/types";
import type { Course, Tenant } from "@/data/types";
import { isBackendConfigured } from "@/lib/backend";
import { getCourseWithChildren, listCourses } from "@/lib/cms-api";
import { listEnrollmentsForUser } from "@/lib/enrollments-api";
import { isReadableEnrollmentStatus } from "@falcon/shared/enrollment/access";

/** デモ経路にカタログ stub は置かない。教材は D1 seed（packages/content）だけ。 */
function fixturesFor(_tenantId: Tenant["id"]): Course[] {
  return [];
}

type DataSource = "db" | "fixtures" | "error";

interface UseCoursesResult {
  courses: Course[];
  loading: boolean;
  error: string | null;
  source: DataSource;
}

/** staff 向け CMS 一覧から、受講者プレビュー用に公開中だけ残す。 */
export function publishedCatalogRows(rows: CourseRow[], publishedOnly: boolean): CourseRow[] {
  return publishedOnly ? rows.filter((row) => row.status === "published") : rows;
}

/**
 * publishedOnly に切り替えた直後、未フィルタのキャッシュを出さない。
 * 取得済みフラグが published になるまで空配列を返す。
 */
export function coursesReadyForPublishedOnly<T>(
  courses: T[],
  publishedOnly: boolean,
  fetchedPublishedOnly: boolean | null,
): T[] {
  if (publishedOnly && fetchedPublishedOnly !== true) return [];
  return courses;
}

export function useCoursesForTenant(
  tenantId: Tenant["id"],
  enabled = true,
  options?: { publishedOnly?: boolean },
): UseCoursesResult {
  const backend = isBackendConfigured();
  const [courses, setCourses] = useState<Course[]>(() =>
    backend ? [] : fixturesFor(tenantId),
  );
  const [loading, setLoading] = useState(backend && enabled);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSource>(backend ? "db" : "fixtures");
  const publishedOnly = options?.publishedOnly === true;
  const [fetchedPublishedOnly, setFetchedPublishedOnly] = useState<boolean | null>(null);

  useEffect(() => {
    // role 等で未使用の場合はフェッチしない (二重フェッチ抑止)。
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (!isBackendConfigured()) {
      setCourses(fixturesFor(tenantId));
      setSource("fixtures");
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const courseRows = publishedCatalogRows(await listCourses(tenantId), publishedOnly);
        if (cancelled) return;
        // クエリ成功 = DB を真実として採用する。 空 (= 未 seed / RLS で全部 draft 等) でも
        // fixtures に fallback しない (#10 — Codex P2: RLS で隠した draft が漏れるのを防ぐ)。
        if (courseRows.length === 0) {
          setCourses([]);
          setFetchedPublishedOnly(publishedOnly);
          setSource("db");
          setError(null);
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
        setFetchedPublishedOnly(publishedOnly);
        setSource("db");
        setError(null);
      } catch (err) {
        console.error("[useCoursesForTenant] DB fetch failed", err);
        if (!cancelled) {
          setCourses([]);
          setFetchedPublishedOnly(publishedOnly);
          setSource("error");
          setError(err instanceof Error ? err.message : "fetch failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tenantId, enabled, publishedOnly]);

  const visibleCourses = coursesReadyForPublishedOnly(
    courses,
    publishedOnly,
    fetchedPublishedOnly,
  );
  return {
    courses: visibleCourses,
    loading: loading || (publishedOnly && fetchedPublishedOnly !== true),
    error,
    source,
  };
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
 *   失敗時は空配列 + error（fixtures に戻さない）。
 *   draft コースの enrollment は courses RLS で詳細取得が null になり、 受講者には現れない。
 */
export function useEnrolledCoursesForTenant(
  tenantId: Tenant["id"],
  userId: string | null,
  enabled = true,
): UseCoursesResult {
  const backend = isBackendConfigured();
  const [courses, setCourses] = useState<Course[]>(() =>
    backend ? [] : fixturesFor(tenantId),
  );
  const [loading, setLoading] = useState(backend && enabled);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSource>(backend ? "db" : "fixtures");

  useEffect(() => {
    // role 等で未使用の場合はフェッチしない (二重フェッチ抑止)。
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (!isBackendConfigured()) {
      setCourses(fixturesFor(tenantId));
      setSource("fixtures");
      setError(null);
      setLoading(false);
      return;
    }
    if (!userId) {
      setCourses([]);
      setSource("db");
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const allEnrollments = await listEnrollmentsForUser(userId);
        if (cancelled) return;
        // 期限切れ (expired) の登録は一覧に出さない。 API 側は教材・資料・検索を
        // 一律で拒否するため、 ここに残すと「一覧には出るが開くと 404」になる。
        const enrollments = allEnrollments.filter((e) =>
          isReadableEnrollmentStatus(e.status),
        );
        if (enrollments.length === 0) {
          setCourses([]);
          setSource("db");
          setError(null);
          return;
        }
        // 1 コースの取得失敗 (削除済み / 一時的なエラー等) で全体を error に
        // しないよう、 個別に catch して null に倒す。
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
        setError(null);
      } catch (err) {
        console.error("[useEnrolledCoursesForTenant] DB fetch failed", err);
        if (!cancelled) {
          setCourses([]);
          setSource("error");
          setError(err instanceof Error ? err.message : "fetch failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tenantId, userId, enabled]);

  return { courses, loading, error, source };
}
