/**
 * `/enrollments` — 受講登録 (Issue #20)。
 *
 * 操作の順序は「① 受講生を選ぶ → ② 割り当てる教材を選ぶ」。 左ペインで受講生を 1 名 (行クリック)
 * または複数名 (チェックボックス) 選び、 右ペインでその受講生に教材を割り当て / 解除する。
 * 1 名選択時は期限 / 必須をその場で編集でき、 複数名選択時は「何名に割当済みか」を見ながら
 * まとめて操作する。
 *
 * データ取得は 2 本に分ける。 受講者一覧のバッジは件数サマリ (`/api/enrollments/summary`)、
 * 右ペインの割当状況は選択中の受講者ぶんの enrollment だけを取る。 テナント全件を取ると
 * 受講者数 × コース数に比例して応答が膨らむため。
 *
 * バックエンド未設定時 (dev fixtures フロー): 操作不可の案内のみ表示する。
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Download } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import type { CourseRow, EnrollmentRow } from "@falcon/shared/cms/types";
import { useCmsCourses } from "@/hooks/useCmsCourses";
import { useProfiles } from "@/hooks/useProfiles";
import { useEnrollmentSummaries, useUsersEnrollments } from "@/hooks/useEnrollments";
import type { AdminProfileRow } from "@/lib/admin-users-api";
import {
  type BulkEnrollmentResult,
  bulkAssignEnrollments,
  bulkRemoveEnrollments,
  listEnrollmentsForUsers,
  mapWithConcurrency,
  updateEnrollment,
} from "@/lib/enrollments-api";
import { downloadCsv, toCsv } from "@/lib/csv";
import { ROLE_LABEL } from "./users-admin/shared";
import { LearnerPanel } from "./enrollments-admin/LearnerPanel";
import { BULK_BUSY_KEY, CoursePanel } from "./enrollments-admin/CoursePanel";
import {
  ENROLLMENT_STATUS_LABEL,
  type CourseFilter,
  type LearnerFilter,
  fromDateInput,
  indexEnrollments,
} from "./enrollments-admin/shared";

/**
 * CSV に出せる行数の上限 (受講者 × 教材)。
 *
 * 全受講者を対象にすると行数がテナント規模 × 教材数で増える。 ブラウザ側で行配列と
 * CSV 文字列を二重に持つため、 上限を超える指定は出力せず対象を絞ってもらう。
 */
const MAX_CSV_ROWS = 20_000;

interface Props {
  tenantId: string;
  backendEnabled: boolean;
}

export function AdminEnrollmentsPage({ tenantId, backendEnabled }: Props) {
  if (!backendEnabled) {
    return <EnrollmentsDemoNotice />;
  }
  return <EnrollmentsLive tenantId={tenantId} />;
}

function EnrollmentsLive({ tenantId }: { tenantId: string }) {
  const { courses, loading: coursesLoading } = useCmsCourses(tenantId);
  const { profiles, loading: profilesLoading, error: profilesError } = useProfiles(tenantId);
  const {
    summaries,
    error: summariesError,
    refetch: refetchSummaries,
  } = useEnrollmentSummaries(tenantId);

  const [learnerFilter, setLearnerFilter] = useState<LearnerFilter>("student");
  const [learnerQuery, setLearnerQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [courseQuery, setCourseQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<CourseFilter>("all");
  const [defaultDue, setDefaultDue] = useState("");
  const [defaultRequired, setDefaultRequired] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const selectedIdList = useMemo(() => [...selectedIds], [selectedIds]);
  const {
    enrollments,
    loading: enrollmentsLoading,
    error: enrollmentsError,
    refetch: refetchEnrollments,
  } = useUsersEnrollments(selectedIdList);

  // 受講者 (student) が割当の主対象。 無効化ユーザーは除外する。
  const students = useMemo(
    () => profiles.filter((p) => p.role === "student" && !p.disabled),
    [profiles],
  );
  // スタッフ (講師 / 管理者) も割当対象に残す。 受講者シェルは enrollment ベースなので、
  // 講師 / 管理者が受講者画面を自分で確認するには受講登録が要る。
  const staff = useMemo(
    () => profiles.filter((p) => p.role !== "student" && !p.disabled),
    [profiles],
  );

  const profileById = useMemo(() => {
    const map = new Map<string, AdminProfileRow>();
    for (const p of [...students, ...staff]) map.set(p.id, p);
    return map;
  }, [students, staff]);

  const enrollmentIndex = useMemo(() => indexEnrollments(enrollments), [enrollments]);

  // 割当状況が確定していない間 (取得中 / 取得失敗) は、 未割当と区別が付かない。
  // この状態で割当を通すと既存の登録まで upsert され、 期限 / 必須が既定値に戻る。
  const enrollmentsReady = !enrollmentsLoading && enrollmentsError === null;

  // 選択解除済み / 無効化されたユーザーが残らないよう profile 側と突き合わせる。
  const selectedProfiles = useMemo(
    () =>
      [...selectedIds]
        .map((id) => profileById.get(id))
        .filter((p): p is AdminProfileRow => p !== undefined),
    [selectedIds, profileById],
  );

  const withBusy = async (key: string, fn: () => Promise<void>) => {
    setBusyKey(key);
    try {
      await fn();
      // 右ペインの割当状況と、 左ペインの件数バッジの両方を取り直す。
      await Promise.all([refetchEnrollments(), refetchSummaries()]);
    } catch (err) {
      toast.error(`処理に失敗しました: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setBusyKey(null);
    }
  };

  const selectOnly = (userId: string) => setSelectedIds(new Set([userId]));

  const toggleSelected = (userId: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

  const setVisibleSelected = (userIds: string[], selected: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of userIds) {
        if (selected) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  /** 一括 API の結果を 1 本のトーストにする (部分失敗も落とさず伝える)。 */
  const reportBulk = (result: BulkEnrollmentResult, done: string) => {
    if (result.errors.length > 0) {
      const failed = `${result.errors.length} 件のリクエストが失敗しました: ${result.errors[0]}`;
      toast.error(`${done.replace("{n}", String(result.applied))} — ${failed}`);
      return;
    }
    toast.success(done.replace("{n}", String(result.applied)));
  };

  /** 選択中の受講生のうち、 そのコースが未割当の人へまとめて割り当てる。 */
  const assignCourse = (courseId: string) => {
    if (!enrollmentsReady) return;
    const targets = selectedProfiles.filter((p) => !enrollmentIndex.get(p.id)?.has(courseId));
    if (targets.length === 0) return;
    void withBusy(courseId, async () => {
      const result = await bulkAssignEnrollments({
        userIds: targets.map((p) => p.id),
        courseIds: [courseId],
        dueAt: fromDateInput(defaultDue),
        required: defaultRequired,
      });
      reportBulk(result, `${courseTitle(courses, courseId)} を {n} 名に割り当てました`);
    });
  };

  /** 選択中の受講生からそのコースの割当を外す。 */
  const unassignCourse = (courseId: string) => {
    const targets = selectedProfiles.filter((p) => enrollmentIndex.get(p.id)?.has(courseId));
    if (targets.length === 0) return;
    void withBusy(courseId, async () => {
      const result = await bulkRemoveEnrollments({
        userIds: targets.map((p) => p.id),
        courseIds: [courseId],
      });
      reportBulk(result, `${courseTitle(courses, courseId)} の割当を {n} 件解除しました`);
    });
  };

  /** 表示中の教材を、 選択中の受講生の未割当ぶんだけまとめて割り当てる。 */
  const assignVisibleCourses = (courseIds: string[]) => {
    if (!enrollmentsReady) return;
    // 既に割当済みの組は upsert で期限 / 必須が既定値に戻ってしまうため送らない。
    // 受講者ごとに未割当のコースが違うので、 同じ未割当集合の受講者をまとめて 1 リクエストにする。
    const byMissing = new Map<string, { courseIds: string[]; userIds: string[] }>();
    let pairs = 0;
    for (const p of selectedProfiles) {
      const missing = courseIds.filter((id) => !enrollmentIndex.get(p.id)?.has(id));
      if (missing.length === 0) continue;
      pairs += missing.length;
      const key = missing.join(",");
      const group = byMissing.get(key) ?? { courseIds: missing, userIds: [] };
      group.userIds.push(p.id);
      byMissing.set(key, group);
    }
    if (pairs === 0) {
      toast("未割当の組み合わせはありません");
      return;
    }
    void withBusy(BULK_BUSY_KEY, async () => {
      // 未割当集合が受講生ごとに違うとグループ数が受講生数まで増えるため、
      // 同時に走るリクエストを絞る (各グループ内のチャンクは元から直列)。
      const results = await mapWithConcurrency([...byMissing.values()], (group) =>
        bulkAssignEnrollments({
          userIds: group.userIds,
          courseIds: group.courseIds,
          dueAt: fromDateInput(defaultDue),
          required: defaultRequired,
        }),
      );
      reportBulk(
        {
          applied: results.reduce((n, r) => n + r.applied, 0),
          errors: results.flatMap((r) => r.errors),
        },
        "{n} 件の割当を追加しました",
      );
    });
  };

  const changeDue = (enrollment: EnrollmentRow, value: string) =>
    void withBusy(enrollment.course_id, () =>
      updateEnrollment(enrollment.id, { due_at: fromDateInput(value) }),
    );

  const toggleRequired = (enrollment: EnrollmentRow) =>
    void withBusy(enrollment.course_id, () =>
      updateEnrollment(enrollment.id, { required: !enrollment.required }),
    );

  /**
   * 受講者 × 教材の割当マトリクスを CSV にする (選択中がいればその受講生ぶんだけ)。
   *
   * 画面が持っているのは選択中の受講者ぶんだけなので、 出力対象の enrollment はここで
   * 取り直す (サーバ側の上限に合わせて分割リクエストになる)。
   */
  const onExport = async () => {
    const targets = exportTargets;
    if (targets.length === 0 || courses.length === 0) return;
    // 受講者 × 教材の全組を 1 度にメモリへ載せるので、 行数に上限を設ける。
    // 超える場合は黙って切り詰めず、 対象を絞ってもらう。
    const rowCount = targets.length * courses.length;
    if (rowCount > MAX_CSV_ROWS) {
      toast.error(
        `出力対象が多すぎます (${rowCount.toLocaleString()} 行)。` +
          ` 受講生を選ぶか教材を整理して、 ${MAX_CSV_ROWS.toLocaleString()} 行以内にしてください`,
      );
      return;
    }
    setExporting(true);
    let index: typeof enrollmentIndex;
    try {
      index = indexEnrollments(await listEnrollmentsForUsers(targets.map((p) => p.id)));
    } catch (err) {
      toast.error(`出力に失敗しました: ${err instanceof Error ? err.message : "unknown"}`);
      return;
    } finally {
      setExporting(false);
    }
    const headers = [
      "受講者",
      "メール",
      "ロール",
      "教材",
      "割当",
      "受講状態",
      "期限",
      "必須",
      "登録日",
    ];
    const rows = targets.flatMap((p) =>
      courses.map((course) => {
        const e = index.get(p.id)?.get(course.id);
        return [
          p.display_name,
          p.email ?? "",
          ROLE_LABEL[p.role],
          course.title,
          e ? "割当済み" : "未割当",
          e ? (ENROLLMENT_STATUS_LABEL[e.status] ?? e.status) : "—",
          e?.due_at ? e.due_at.slice(0, 10) : "",
          e ? (e.required ? "必須" : "任意") : "",
          e?.enrolled_at ? e.enrolled_at.slice(0, 10) : "",
        ];
      }),
    );
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`enrollments-${stamp}.csv`, toCsv(headers, rows));
    toast.success("受講状況を出力しました");
  };

  const error = profilesError ?? summariesError;

  // スタッフ (講師 / 管理者) は自己確認用の割当。 まとめて選んだときに気付けるよう数える。
  const staffSelectedCount = selectedProfiles.filter((p) => p.role !== "student").length;

  // CSV の出力対象。 選択があればその受講生、 なければ受講者全員。
  // ボタンの活性条件と出力処理で同じ判断を使う (スタッフだけ選んだ場合も出力できる)。
  const exportTargets = selectedProfiles.length > 0 ? selectedProfiles : students;

  return (
    <>
      <PageHeader
        title="受講登録"
        sub="受講生を選んでから、 割り当てる教材を決めます"
        actions={
          <Button
            disabled={courses.length === 0 || exportTargets.length === 0 || exporting}
            onClick={() => void onExport()}
          >
            <Download size={14} />
            CSV出力
          </Button>
        }
      />

      {error ? (
        <div className="mb-4 rounded-md border border-destructive bg-danger-soft px-3 py-2 text-[12.5px] text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <LearnerPanel
          students={students}
          staff={staff}
          filter={learnerFilter}
          onChangeFilter={setLearnerFilter}
          query={learnerQuery}
          onChangeQuery={setLearnerQuery}
          selectedIds={selectedIds}
          onSelectOnly={selectOnly}
          onToggle={toggleSelected}
          onSetVisibleSelected={setVisibleSelected}
          summaries={summaries}
          courseCount={courses.length}
          loading={profilesLoading}
        />

        <CoursePanel
          courses={courses}
          coursesLoading={coursesLoading}
          selectedProfiles={selectedProfiles}
          staffSelectedCount={staffSelectedCount}
          enrollmentIndex={enrollmentIndex}
          enrollmentsLoading={enrollmentsLoading}
          enrollmentsError={enrollmentsError}
          onRetryEnrollments={() => void refetchEnrollments()}
          query={courseQuery}
          onChangeQuery={setCourseQuery}
          filter={courseFilter}
          onChangeFilter={setCourseFilter}
          defaultDue={defaultDue}
          onChangeDefaultDue={setDefaultDue}
          defaultRequired={defaultRequired}
          onChangeDefaultRequired={setDefaultRequired}
          busyKey={busyKey}
          onAssign={assignCourse}
          onUnassign={unassignCourse}
          onAssignVisible={assignVisibleCourses}
          onChangeDue={changeDue}
          onToggleRequired={toggleRequired}
          onClearSelection={() => setSelectedIds(new Set())}
          onDeselect={toggleSelected}
        />
      </div>
    </>
  );
}

/** トーストに出す教材名 (見つからなければ既定文言)。 */
function courseTitle(courses: CourseRow[], courseId: string): string {
  return courses.find((c) => c.id === courseId)?.title ?? "教材";
}

function EnrollmentsDemoNotice() {
  return (
    <>
      <PageHeader title="受講登録" sub="受講生を選んでから、 割り当てる教材を決めます" />
      <div className="rounded-md border border-border bg-sunken px-3 py-2 text-[12.5px] text-ink-3">
        バックエンド (Neon) 未接続のため受講登録は利用できません。 受講者へのコース割当を行うには
        <code className="mx-1">VITE_SERVER_URL</code>
        を設定してください。
      </div>
    </>
  );
}
