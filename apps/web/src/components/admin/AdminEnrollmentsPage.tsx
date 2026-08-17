/**
 * `/admin/enrollments` — 受講登録 (Issue #20)。
 *
 * 管理者がコースを選び、 同テナントの受講者に対し割当 / 解除 / 期限・必須の設定を行う。
 * 割当は RLS 配下で enrollments テーブルへ直接 write する (service-role API は不要)。
 *
 * バックエンド未設定時 (dev fixtures フロー): 操作不可の案内のみ表示する。
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CalendarClock, Download, UserPlus, X } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import type { AvatarTone } from "@/data/types";
import type { EnrollmentRow, EnrollmentStatus } from "@falcon/shared/cms/types";
import { useCmsCourses } from "@/hooks/useCmsCourses";
import { useProfiles } from "@/hooks/useProfiles";
import { useCourseEnrollments } from "@/hooks/useEnrollments";
import { RoleBadge } from "./users-admin/shared";
import { assignEnrollment, removeEnrollment, updateEnrollment } from "@/lib/enrollments-api";
import { downloadCsv, toCsv } from "@/lib/csv";

const AVATAR_TONES: AvatarTone[] = ["c1", "c2", "c3", "c4", "c5", "c6"];

/** enrollment ステータスを日本語の表示語にする。 */
const ENROLLMENT_STATUS_LABEL: Record<EnrollmentStatus, string> = {
  active: "受講中",
  completed: "完了",
  expired: "期限切れ",
};

function toneFromId(id: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % AVATAR_TONES.length;
  return AVATAR_TONES[h] ?? "c1";
}

/** timestamptz → <input type="date"> 用 (YYYY-MM-DD)。 */
function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

/** <input type="date"> の値 → timestamptz (UTC 0 時)。 空なら null。 */
function fromDateInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

interface Props {
  tenantId: string;
  currentUserId: string | null;
  backendEnabled: boolean;
}

export function AdminEnrollmentsPage({ tenantId, currentUserId, backendEnabled }: Props) {
  if (!backendEnabled) {
    return <EnrollmentsDemoNotice />;
  }
  return <EnrollmentsLive tenantId={tenantId} currentUserId={currentUserId} />;
}

function EnrollmentsLive({
  tenantId,
  currentUserId,
}: {
  tenantId: string;
  currentUserId: string | null;
}) {
  const { courses, loading: coursesLoading } = useCmsCourses(tenantId);
  const { profiles } = useProfiles(tenantId);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const courseId = selectedCourseId ?? courses[0]?.id ?? null;
  const selectedCourse = courses.find((c) => c.id === courseId) ?? null;
  const { enrollments, refetch } = useCourseEnrollments(courseId);

  // 受講者 (student) は一括割当 / CSV の対象。 無効化ユーザーは除外する。
  const learners = useMemo(
    () => profiles.filter((p) => p.role === "student" && !p.disabled),
    [profiles],
  );
  // staff も個別割当だけは許す。 受講者シェルは enrollment ベースなので、 講師 / 管理者が
  // 受講者画面を自分で確認するには受講登録が要る。 一括割当 / CSV には含めない。
  const staffMembers = useMemo(
    () => profiles.filter((p) => p.role !== "student" && !p.disabled),
    [profiles],
  );
  const assignable = useMemo(() => [...learners, ...staffMembers], [learners, staffMembers]);

  const enrollmentByUser = useMemo(() => {
    const map = new Map<string, EnrollmentRow>();
    for (const e of enrollments) map.set(e.user_id, e);
    return map;
  }, [enrollments]);

  const withBusy = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
      await refetch();
    } catch (err) {
      toast.error(`処理に失敗しました: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setBusyId(null);
    }
  };

  const onAssign = (userId: string) =>
    withBusy(userId, async () => {
      if (!courseId) return;
      await assignEnrollment({
        tenantId,
        userId,
        courseId,
        assignedBy: currentUserId,
        required: true,
      });
    });

  const onRemove = (enrollment: EnrollmentRow) =>
    withBusy(enrollment.user_id, () => removeEnrollment(enrollment.id));

  const onChangeDue = (enrollment: EnrollmentRow, value: string) =>
    withBusy(enrollment.user_id, () =>
      updateEnrollment(enrollment.id, { due_at: fromDateInput(value) }),
    );

  const onToggleRequired = (enrollment: EnrollmentRow) =>
    withBusy(enrollment.user_id, () =>
      updateEnrollment(enrollment.id, { required: !enrollment.required }),
    );

  const onAssignAll = () => {
    if (!courseId) return;
    const targets = learners.filter((l) => !enrollmentByUser.has(l.id));
    if (targets.length === 0) {
      toast("未割当の受講者はいません");
      return;
    }
    void withBusy("__all__", async () => {
      // 受講者数に比例して直列リクエストにならないよう並列で投げる。
      await Promise.all(
        targets.map((l) =>
          assignEnrollment({
            tenantId,
            userId: l.id,
            courseId,
            assignedBy: currentUserId,
            required: true,
          }),
        ),
      );
      toast.success(`${targets.length} 名に割り当てました`);
    });
  };

  const assignedCount = enrollmentByUser.size;

  const onExport = () => {
    if (learners.length === 0) return;
    const headers = ["受講者", "割当", "受講状態", "期限", "必須", "登録日"];
    const rows = learners.map((p) => {
      const e = enrollmentByUser.get(p.id);
      return [
        p.display_name,
        e ? "割当済み" : "未割当",
        e ? (ENROLLMENT_STATUS_LABEL[e.status] ?? e.status) : "—",
        e?.due_at ? e.due_at.slice(0, 10) : "",
        e ? (e.required ? "必須" : "任意") : "",
        e?.enrolled_at ? e.enrolled_at.slice(0, 10) : "",
      ];
    });
    const stamp = new Date().toISOString().slice(0, 10);
    const safeTitle = (selectedCourse?.title ?? "course")
      .replace(/[^\p{L}\p{N}_-]+/gu, "_")
      .slice(0, 40);
    downloadCsv(`enrollments-${safeTitle}-${stamp}.csv`, toCsv(headers, rows));
    toast.success("受講状況を出力しました");
  };

  return (
    <>
      <PageHeader
        title="受講登録"
        sub="受講者へのコース割当 · 期限 / 必須の設定"
        actions={
          <>
            <Button disabled={!courseId || learners.length === 0} onClick={onExport}>
              <Download size={14} />
              CSV出力
            </Button>
            <Button
              variant="accent"
              disabled={!courseId || learners.length === 0 || busyId !== null}
              onClick={onAssignAll}
            >
              <UserPlus size={14} />
              全受講者に割当
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
          <label htmlFor="enr-course" className="text-[12.5px] text-ink-3">
            コース
          </label>
          <select
            id="enr-course"
            value={courseId ?? ""}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            disabled={coursesLoading || courses.length === 0}
            className="h-9 w-full sm:w-auto sm:min-w-[260px] rounded-sm border border-input bg-card px-3 text-sm"
          >
            {courses.length === 0 ? (
              <option value="">コースがありません</option>
            ) : (
              courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                  {c.status !== "published" ? "（非公開）" : ""}
                </option>
              ))
            )}
          </select>
          {selectedCourse && selectedCourse.status !== "published" ? (
            <span className="text-[11.5px] text-warning">
              ※ 非公開コースのため、 割り当てても受講者には表示されません
            </span>
          ) : null}
          <span className="ml-auto text-[12.5px] text-ink-3">
            割当済み <strong className="text-foreground">{assignedCount}</strong> / 受講者{" "}
            {learners.length} 名
          </span>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {courses.length === 0 ? (
          <div className="py-10 text-center text-sm text-ink-3">まずコースを作成してください。</div>
        ) : assignable.length === 0 ? (
          <div className="py-10 text-center text-sm text-ink-3">
            割当可能な受講者がいません。 「ユーザー管理」 から招待してください。
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>受講者</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>期限</TableHead>
                <TableHead>必須</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignable.map((p) => {
                const enrollment = enrollmentByUser.get(p.id);
                const busy = busyId === p.id || busyId === "__all__";
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar size="sm">
                          <AvatarFallback tone={toneFromId(p.id)}>
                            {(p.initials ?? p.display_name.slice(0, 1)).slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{p.display_name}</span>
                        {p.role !== "student" ? <RoleBadge role={p.role} /> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {enrollment ? (
                        <Badge variant="success">割当済み</Badge>
                      ) : (
                        <Badge>未割当</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {enrollment ? (
                        <div className="flex items-center gap-1.5 text-ink-3">
                          <CalendarClock size={13} />
                          <input
                            type="date"
                            value={toDateInput(enrollment.due_at)}
                            disabled={busy}
                            onChange={(e) => void onChangeDue(enrollment, e.target.value)}
                            className="h-8 rounded-sm border border-input bg-card px-2 text-[12.5px]"
                          />
                        </div>
                      ) : (
                        <span className="text-ink-4 text-[12.5px]">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {enrollment ? (
                        <label className="flex items-center gap-1.5 text-[12.5px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enrollment.required}
                            disabled={busy}
                            onChange={() => void onToggleRequired(enrollment)}
                          />
                          {enrollment.required ? "必須" : "任意"}
                        </label>
                      ) : (
                        <span className="text-ink-4 text-[12.5px]">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {enrollment ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => void onRemove(enrollment)}
                            className="text-destructive"
                          >
                            <X size={13} />
                            解除
                          </Button>
                        ) : (
                          <Button
                            variant="accent"
                            size="sm"
                            disabled={busy}
                            onClick={() => void onAssign(p.id)}
                          >
                            <UserPlus size={13} />
                            割当
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}

function EnrollmentsDemoNotice() {
  return (
    <>
      <PageHeader title="受講登録" sub="受講者へのコース割当 · 期限 / 必須の設定" />
      <div className="rounded-md border border-border bg-sunken px-3 py-2 text-[12.5px] text-ink-3">
        バックエンド (Neon) 未接続のため受講登録は利用できません。 受講者へのコース割当を行うには
        <code className="mx-1">VITE_SERVER_URL</code>
        を設定してください。
      </div>
    </>
  );
}
