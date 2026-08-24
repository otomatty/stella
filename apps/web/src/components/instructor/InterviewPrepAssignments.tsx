import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SkeletonRows } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { ASSIGNABLE_CATEGORIES } from "@falcon/shared/interview/types";
import {
  listInterviewPrepAssignments,
  saveInterviewPrepAssignment,
  sortInterviewPrepAssignmentRows,
  type InterviewPrepAssignmentRow,
} from "@/lib/interview-prep-api";
import { Chip } from "@/components/ui/chip";

export function InterviewPrepAssignmentsPage({
  backendEnabled,
  canEditSchedule,
}: {
  backendEnabled: boolean;
  canEditSchedule: boolean;
}) {
  const [rows, setRows] = useState<InterviewPrepAssignmentRow[]>([]);
  const [loading, setLoading] = useState(backendEnabled);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftDates, setDraftDates] = useState<Record<string, string>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!backendEnabled) return;
    let cancelled = false;
    listInterviewPrepAssignments()
      .then((r) => {
        if (!cancelled) {
          setRows(r);
          setDraftDates(
            Object.fromEntries(r.map((row) => [row.profile_id, row.interviewDate ?? ""])),
          );
          setDraftNotes(Object.fromEntries(r.map((row) => [row.profile_id, row.note ?? ""])));
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backendEnabled]);

  const toggle = async (row: InterviewPrepAssignmentRow, category: string) => {
    const next = row.categories.includes(category)
      ? row.categories.filter((c) => c !== category)
      : [...row.categories, category];
    // 楽観更新 → 失敗時はこの行だけロールバック（他行の並行編集を巻き込まない）
    setRows((rs) =>
      rs.map((r) => (r.profile_id === row.profile_id ? { ...r, categories: next } : r)),
    );
    setSavingId(row.profile_id);
    try {
      await saveInterviewPrepAssignment(row.profile_id, { categories: next });
      toast(`${row.display_name} の面談対策を更新しました`);
    } catch (e) {
      setRows((rs) =>
        rs.map((r) => (r.profile_id === row.profile_id ? { ...r, categories: row.categories } : r)),
      );
      toast.error(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSavingId(null);
    }
  };

  const saveSchedule = async (row: InterviewPrepAssignmentRow) => {
    const interviewDate = draftDates[row.profile_id]?.trim() || null;
    const note = draftNotes[row.profile_id]?.trim() || null;
    setSavingId(row.profile_id);
    try {
      await saveInterviewPrepAssignment(row.profile_id, {
        categories: row.categories,
        interviewDate,
        note,
      });
      setRows((rs) =>
        sortInterviewPrepAssignmentRows(
          rs.map((r) => (r.profile_id === row.profile_id ? { ...r, interviewDate, note } : r)),
        ),
      );
      toast(`${row.display_name} の面談予定を更新しました`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="面談対策の割当"
        sub="受講者ごとに対策する案件種別を設定します。フレームワークまで指定すると、その言語の共通問題も併せて表示されます"
      />
      {!backendEnabled ? (
        <Card className="p-12 text-center text-sm text-ink-3">
          デモモードでは割当を編集できません。
        </Card>
      ) : loading ? (
        <Card className="p-6">
          <SkeletonRows rows={5} />
        </Card>
      ) : error ? (
        <Card className="p-12 text-center text-sm text-destructive">
          受講者一覧の取得に失敗しました: {error}
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table className="max-lg:min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead className="w-40 sm:w-56">受講者</TableHead>
                <TableHead className="w-36">面談予定</TableHead>
                <TableHead className="w-48">メモ</TableHead>
                <TableHead>割当</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.profile_id}>
                  <TableCell>
                    <div className="text-[13px] font-medium">{row.display_name}</div>
                    <div className="text-[11.5px] text-ink-4">{row.email ?? ""}</div>
                  </TableCell>
                  <TableCell>
                    {canEditSchedule ? (
                      <Input
                        type="date"
                        value={draftDates[row.profile_id] ?? ""}
                        disabled={savingId === row.profile_id}
                        onChange={(e) =>
                          setDraftDates((d) => ({ ...d, [row.profile_id]: e.target.value }))
                        }
                        className="h-8 text-[12px]"
                      />
                    ) : (
                      <span className="text-[12px] text-ink-3">{row.interviewDate ?? "—"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canEditSchedule ? (
                      <div className="flex flex-col gap-1.5">
                        <Input
                          value={draftNotes[row.profile_id] ?? ""}
                          disabled={savingId === row.profile_id}
                          onChange={(e) =>
                            setDraftNotes((d) => ({ ...d, [row.profile_id]: e.target.value }))
                          }
                          placeholder="案件メモ"
                          className="h-8 text-[12px]"
                        />
                        <Button
                          variant="default"
                          size="sm"
                          disabled={savingId === row.profile_id}
                          onClick={() => void saveSchedule(row)}
                        >
                          予定を保存
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[12px] text-ink-3">{row.note ?? "—"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {ASSIGNABLE_CATEGORIES.map((c) => (
                        <Chip
                          key={c}
                          active={row.categories.includes(c)}
                          disabled={savingId === row.profile_id}
                          onClick={() => void toggle(row, c)}
                          ariaLabel={`${row.display_name} に ${c} を割当`}
                        >
                          {c}
                        </Chip>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-ink-3 p-8">
                    受講者がいません。
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
