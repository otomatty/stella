/**
 * `/admin/assignments` — テナント所属の課題一覧 + 編集起動。
 */

import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Plus, Edit, Trash } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AssignmentRow } from "@falcon/shared/cms/types";
import { deleteAssignment, listAssignments } from "@/lib/cms-api";

// CodeMirror + 採点ランナーを含む重いダイアログのため、 編集を開くまでロードしない。
const AssignmentEditor = lazy(() =>
  import("./AssignmentEditor").then((m) => ({ default: m.AssignmentEditor })),
);

interface Props {
  tenantId: string;
}

export function AdminAssignmentsPage({ tenantId }: Props) {
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | "__new__" | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAssignments(tenantId);
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const onDelete = async (id: string) => {
    if (!confirm(`課題 "${id}" を削除します。`)) return;
    try {
      await deleteAssignment(id);
      await refetch();
    } catch (err) {
      toast.error(`削除失敗: ${err instanceof Error ? err.message : "unknown"}`);
    }
  };

  return (
    <>
      <PageHeader
        title="課題管理"
        sub="JavaScript / SQL の課題を作成し、 starter / tests / 静的解析を設定する"
        actions={
          <Button variant="accent" onClick={() => setEditingId("__new__")}>
            <Plus size={14} />
            新規課題
          </Button>
        }
      />

      {error ? (
        <div className="mb-4 rounded-md border border-destructive bg-danger-soft px-3 py-2 text-[12.5px] text-destructive">
          {error}
        </div>
      ) : null}

      {loading && rows.length === 0 ? (
        <div className="text-sm text-ink-3 py-10 text-center">読み込み中…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-ink-3 py-10 text-center border border-dashed border-border rounded-md">
          まだ課題がありません。 「新規課題」 ボタンから作成してください。
        </div>
      ) : (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>タイトル</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Chapter</TableHead>
                <TableHead>言語</TableHead>
                <TableHead>採点種別</TableHead>
                <TableHead>更新</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-[11.5px]">{r.id}</TableCell>
                  <TableCell>{r.title}</TableCell>
                  <TableCell>
                    <Badge>{r.stage}</Badge>
                  </TableCell>
                  <TableCell className="text-[11.5px] text-ink-3">{r.chapter_id}</TableCell>
                  <TableCell>{r.language}</TableCell>
                  <TableCell className="text-[11.5px]">{r.test_kind}</TableCell>
                  <TableCell className="text-[11.5px] text-ink-3">
                    {new Date(r.updated_at).toLocaleDateString("ja-JP")}
                  </TableCell>
                  <TableCell className="flex gap-1 justify-end">
                    <Button size="icon-sm" variant="ghost" onClick={() => setEditingId(r.id)}>
                      <Edit size={13} />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => void onDelete(r.id)}>
                      <Trash size={13} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editingId ? (
        <Suspense
          fallback={
            <div
              role="status"
              aria-busy="true"
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/80"
            >
              <div className="text-sm text-ink-3">読み込み中…</div>
            </div>
          }
        >
          <AssignmentEditor
            tenantId={tenantId}
            assignmentId={editingId === "__new__" ? null : editingId}
            onClose={() => setEditingId(null)}
            onSaved={async () => {
              await refetch();
              setEditingId(null);
            }}
          />
        </Suspense>
      ) : null}
    </>
  );
}
