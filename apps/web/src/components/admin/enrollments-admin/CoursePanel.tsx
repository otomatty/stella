/**
 * 受講登録画面の右ペイン ―「② 割り当てる教材を選ぶ」。
 *
 * 左ペインで選んだ受講生に対して教材を割り当てる。 1 名選択なら期限 / 必須をその場で編集でき、
 * 複数名選択なら「何名に割当済みか」を見ながら一括で割当 / 解除する。
 */

import { useMemo } from "react";

import { Book, CalendarClock, Check, UserPlus, Users, X } from "@/lib/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { SkeletonRows } from "@/components/ui/skeleton";
import { CourseThumb } from "@/components/common/CourseThumb";
import type { CourseColor } from "@/data/types";
import type { AdminProfileRow } from "@/lib/admin-users-api";
import { todayDateKey } from "@/lib/date-keys";
import type { CourseRow, EnrollmentRow } from "@falcon/shared/cms/types";
import { toneFromId } from "../users-admin/shared";
import {
  ENROLLMENT_STATUS_LABEL,
  type CourseFilter,
  type EnrollmentIndex,
  isOverdue,
  toDateInput,
} from "./shared";

/** 一括操作中を表す busyKey。 個別行の busyKey は courseId。 */
export const BULK_BUSY_KEY = "__bulk__";

interface Props {
  courses: CourseRow[];
  coursesLoading: boolean;
  selectedProfiles: AdminProfileRow[];
  /** 選択に含まれるスタッフ (講師 / 管理者) の人数。 0 より大きければ注意書きを出す。 */
  staffSelectedCount: number;
  enrollmentIndex: EnrollmentIndex;
  /** 選択中の受講者ぶんの enrollment を取得中か。 */
  enrollmentsLoading: boolean;
  /** 取得に失敗した場合のメッセージ。 割当状況が不明な間は割当操作を止める。 */
  enrollmentsError: string | null;
  /** 取得失敗時の再試行。 */
  onRetryEnrollments: () => void;
  query: string;
  onChangeQuery: (query: string) => void;
  filter: CourseFilter;
  onChangeFilter: (filter: CourseFilter) => void;
  /** 新規割当に使う既定値 (期限 / 必須)。 */
  defaultDue: string;
  onChangeDefaultDue: (value: string) => void;
  defaultRequired: boolean;
  onChangeDefaultRequired: (value: boolean) => void;
  busyKey: string | null;
  /** 選択中の受講生のうち未割当の人へ割り当てる。 */
  onAssign: (courseId: string) => void;
  /** 選択中の受講生から割当を解除する。 */
  onUnassign: (courseId: string) => void;
  /** 表示中の教材をまとめて割り当てる。 */
  onAssignVisible: (courseIds: string[]) => void;
  /** 1 名選択時のみ: 期限を更新する。 */
  onChangeDue: (enrollment: EnrollmentRow, value: string) => void;
  /** 1 名選択時のみ: 必須 / 任意を切り替える。 */
  onToggleRequired: (enrollment: EnrollmentRow) => void;
  onClearSelection: () => void;
  onDeselect: (userId: string) => void;
}

export function CoursePanel(props: Props) {
  const {
    courses,
    coursesLoading,
    selectedProfiles,
    staffSelectedCount,
    enrollmentIndex,
    enrollmentsLoading,
    enrollmentsError,
    onRetryEnrollments,
    query,
    onChangeQuery,
    filter,
    onChangeFilter,
    defaultDue,
    onChangeDefaultDue,
    defaultRequired,
    onChangeDefaultRequired,
    busyKey,
    onAssign,
    onUnassign,
    onAssignVisible,
    onChangeDue,
    onToggleRequired,
    onClearSelection,
    onDeselect,
  } = props;

  const single = selectedProfiles.length === 1 ? selectedProfiles[0] : null;
  const today = todayDateKey();

  /** 教材ごとに「選択中の受講生のうち何名が割当済みか」を数える。 */
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses
      .map((course) => {
        const enrollmentsForCourse = selectedProfiles.map(
          (p) => enrollmentIndex.get(p.id)?.get(course.id) ?? null,
        );
        const assigned = enrollmentsForCourse.filter((e) => e !== null).length;
        return { course, assigned, single: single ? (enrollmentsForCourse[0] ?? null) : null };
      })
      .filter(({ course, assigned }) => {
        if (filter === "assigned" && assigned === 0) return false;
        if (filter === "unassigned" && assigned === selectedProfiles.length) return false;
        if (!q) return true;
        return (
          course.title.toLowerCase().includes(q) ||
          (course.category ?? "").toLowerCase().includes(q)
        );
      });
  }, [courses, selectedProfiles, enrollmentIndex, filter, query, single]);

  if (selectedProfiles.length === 0) {
    return (
      <Card className="grid min-h-[320px] place-items-center px-6 py-16 text-center">
        <div>
          <div className="mx-auto grid size-11 place-items-center rounded-full bg-brand-soft text-brand">
            <Users size={18} />
          </div>
          <h2 className="mt-3 text-[15px] font-semibold tracking-tight">
            まず受講生を選んでください
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-ink-3">
            左の一覧から受講生を選ぶと、 その受講生に割り当てる教材をここで決められます。
            チェックボックスで複数名を選べば、 まとめて同じ教材を割り当てられます。
          </p>
        </div>
      </Card>
    );
  }

  const visibleCourseIds = rows.map((r) => r.course.id);
  const assignableIds = rows
    .filter((r) => r.assigned < selectedProfiles.length)
    .map((r) => r.course.id);
  // 取得中 / 取得失敗の間は割当状況が空なので、 全教材が未割当に見える。 そのまま割当を許すと
  // 既存の割当まで upsert され、 期限 / 必須が既定値に戻ってしまう。
  const enrollmentsReady = !enrollmentsLoading && enrollmentsError === null;
  const bulkBusy = busyKey !== null || !enrollmentsReady;

  return (
    <Card>
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Book size={14} className="text-brand" />
          <h2 className="text-[13px] font-semibold tracking-tight">② 割り当てる教材を選ぶ</h2>
          <span className="ml-auto text-[11.5px] text-ink-3">
            教材 {courses.length} 件中 {rows.length} 件表示
          </span>
        </div>

        {single ? (
          <div className="mt-3 flex items-center gap-2.5">
            <Avatar size="sm">
              <AvatarFallback tone={toneFromId(single.id)}>
                {(single.initials ?? single.display_name.slice(0, 1)).slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold">{single.display_name}</div>
              <div className="truncate text-[11.5px] text-ink-3">{single.email ?? "—"}</div>
            </div>
            <Badge variant="accent" className="ml-1">
              割当 {enrollmentIndex.get(single.id)?.size ?? 0} 件
            </Badge>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={onClearSelection}>
              選択解除
            </Button>
          </div>
        ) : (
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] text-ink-2">
                <strong className="text-foreground">{selectedProfiles.length}</strong> 名にまとめて
                割り当てます
              </span>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={onClearSelection}>
                選択解除
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedProfiles.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-sunken py-0.5 pl-2 pr-1 text-[11.5px]"
                >
                  {p.display_name}
                  <button
                    type="button"
                    onClick={() => onDeselect(p.id)}
                    aria-label={`${p.display_name} を選択から外す`}
                    className="grid size-4 place-items-center rounded-full text-ink-3 hover:bg-card hover:text-foreground"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {staffSelectedCount > 0 ? (
          <p className="mt-2.5 rounded-sm border border-border bg-warning-soft px-2.5 py-1.5 text-[11.5px] text-warning">
            選択に講師 / 管理者が {staffSelectedCount} 名含まれています。 割り当てると受講者画面と
            受講状況レポートに受講者として現れます (自己確認用の登録です)。
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-sunken px-4 py-2.5">
        <Input
          value={query}
          onChange={(e) => onChangeQuery(e.target.value)}
          placeholder="教材名 / カテゴリで検索"
          aria-label="教材を検索"
          className="h-8 w-full text-[12.5px] sm:w-56"
        />
        <div className="flex items-center gap-1.5">
          <Chip active={filter === "all"} onClick={() => onChangeFilter("all")}>
            すべて
          </Chip>
          <Chip active={filter === "unassigned"} onClick={() => onChangeFilter("unassigned")}>
            未割当
          </Chip>
          <Chip active={filter === "assigned"} onClick={() => onChangeFilter("assigned")}>
            割当済み
          </Chip>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label htmlFor="enr-default-due" className="text-[11.5px] text-ink-3">
            割当時の期限
          </label>
          <input
            id="enr-default-due"
            type="date"
            value={defaultDue}
            onChange={(e) => onChangeDefaultDue(e.target.value)}
            className="h-8 rounded-sm border border-input bg-card px-2 text-[12.5px]"
          />
          <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-ink-2">
            <input
              type="checkbox"
              checked={defaultRequired}
              onChange={(e) => onChangeDefaultRequired(e.target.checked)}
            />
            必須にする
          </label>
          <Button
            variant="accent"
            size="sm"
            disabled={bulkBusy || assignableIds.length === 0}
            onClick={() => onAssignVisible(visibleCourseIds)}
          >
            <UserPlus size={13} />
            表示中をすべて割当
          </Button>
        </div>
      </div>

      {enrollmentsError !== null ? (
        <div className="px-4 py-12 text-center">
          <p className="text-[12.5px] text-destructive">
            割当状況を取得できませんでした: {enrollmentsError}
          </p>
          <p className="mt-1 text-[11.5px] text-ink-3">
            現在の割当が分からないため、 割当 / 解除は行えません。
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={onRetryEnrollments}>
            再試行
          </Button>
        </div>
      ) : enrollmentsLoading || (coursesLoading && courses.length === 0) ? (
        <SkeletonRows rows={4} className="p-4" />
      ) : courses.length === 0 ? (
        <p className="px-4 py-12 text-center text-[12.5px] text-ink-3">
          教材がまだありません。 「コース管理」 から作成してください。
        </p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-12 text-center text-[12.5px] text-ink-3">
          条件に一致する教材がありません。
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map(({ course, assigned, single: enrollment }) => (
            <CourseAssignRow
              key={course.id}
              course={course}
              enrollment={enrollment}
              assigned={assigned}
              total={selectedProfiles.length}
              singleMode={single !== null}
              busy={busyKey === course.id || busyKey === BULK_BUSY_KEY}
              disabled={busyKey !== null}
              today={today}
              onAssign={() => onAssign(course.id)}
              onUnassign={() => onUnassign(course.id)}
              onChangeDue={onChangeDue}
              onToggleRequired={onToggleRequired}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

interface RowProps {
  course: CourseRow;
  /** 1 名選択時のその受講生の enrollment (未割当なら null)。 */
  enrollment: EnrollmentRow | null;
  assigned: number;
  total: number;
  singleMode: boolean;
  busy: boolean;
  disabled: boolean;
  /** 期限超過の判定に使う今日の日付 (YYYY-MM-DD)。 */
  today: string;
  onAssign: () => void;
  onUnassign: () => void;
  onChangeDue: (enrollment: EnrollmentRow, value: string) => void;
  onToggleRequired: (enrollment: EnrollmentRow) => void;
}

function CourseAssignRow({
  course,
  enrollment,
  assigned,
  total,
  singleMode,
  busy,
  disabled,
  today,
  onAssign,
  onUnassign,
  onChangeDue,
  onToggleRequired,
}: RowProps) {
  const color: CourseColor = course.color ?? "indigo";
  const allAssigned = assigned === total;
  const overdue = enrollment ? isOverdue(enrollment, today) : false;

  return (
    <li
      className={
        assigned > 0
          ? "flex flex-wrap items-center gap-3 bg-brand-soft/25 px-4 py-3"
          : "flex flex-wrap items-center gap-3 px-4 py-3"
      }
    >
      <div className="w-14 shrink-0 overflow-hidden rounded-sm border border-border">
        <CourseThumb color={color} className="border-b-0" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-[13.5px] font-medium">{course.title}</span>
          {course.status !== "published" ? (
            <Badge variant="warning">{course.status === "draft" ? "下書き" : "アーカイブ"}</Badge>
          ) : null}
        </div>
        <div className="mt-0.5 truncate text-[11.5px] text-ink-3">
          {[course.category, course.duration_hours ? `${course.duration_hours} 時間` : null]
            .filter(Boolean)
            .join(" · ") || "—"}
        </div>
      </div>

      {singleMode ? (
        <div className="flex flex-wrap items-center gap-2.5">
          {enrollment ? (
            <>
              <Badge variant={overdue ? "warning" : "success"}>
                <Check size={11} />
                {ENROLLMENT_STATUS_LABEL[enrollment.status] ?? enrollment.status}
              </Badge>
              <div className="flex items-center gap-1.5 text-ink-3">
                <CalendarClock size={13} />
                <input
                  type="date"
                  value={toDateInput(enrollment.due_at)}
                  disabled={disabled}
                  aria-label={`${course.title} の期限`}
                  onChange={(e) => onChangeDue(enrollment, e.target.value)}
                  className="h-8 rounded-sm border border-input bg-card px-2 text-[12.5px]"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-1.5 text-[12px]">
                <input
                  type="checkbox"
                  checked={enrollment.required}
                  disabled={disabled}
                  onChange={() => onToggleRequired(enrollment)}
                />
                {enrollment.required ? "必須" : "任意"}
              </label>
            </>
          ) : (
            <Badge>未割当</Badge>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Badge variant={allAssigned ? "success" : assigned > 0 ? "warning" : "default"}>
            {assigned}/{total} 名割当済み
          </Badge>
        </div>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        {assigned > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            disabled={busy || disabled}
            onClick={onUnassign}
          >
            <X size={13} />
            解除
          </Button>
        ) : null}
        {allAssigned ? null : (
          <Button variant="accent" size="sm" disabled={busy || disabled} onClick={onAssign}>
            <UserPlus size={13} />
            {singleMode ? "割当" : `未割当の${total - assigned}名に割当`}
          </Button>
        )}
      </div>
    </li>
  );
}
