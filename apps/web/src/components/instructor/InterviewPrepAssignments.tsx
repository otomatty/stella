import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SkeletonRows } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
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
  type InterviewPrepAssignmentRow,
} from "@/lib/interview-prep-api";
import { Chip } from "@/components/ui/chip";

export function InterviewPrepAssignmentsPage({
  backendEnabled,
}: {
  backendEnabled: boolean;
}) {
  const [rows, setRows] = useState<InterviewPrepAssignmentRow[]>([]);
  const [loading, setLoading] = useState(backendEnabled);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!backendEnabled) return;
    let cancelled = false;
    listInterviewPrepAssignments()
      .then((r) => {
        if (!cancelled) setRows(r);
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
      await saveInterviewPrepAssignment(row.profile_id, next);
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
                  <TableCell colSpan={2} className="text-center text-sm text-ink-3 p-8">
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
