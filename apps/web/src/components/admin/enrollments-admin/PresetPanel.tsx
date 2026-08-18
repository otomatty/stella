/**
 * 受講登録画面の 「割当プリセット」 タブ ― プリセットの一覧と管理。
 *
 * ここで定義したプリセットを、 「受講生に割り当てる」 タブの 「プリセットを適用」 から使う。
 * 削除は退役 (論理削除)。 適用済みの受講登録や監査ログが指す先を失わせないため。
 */

import { useState } from "react";
import { toast } from "sonner";

import { CalendarClock, ClipboardList, Edit, Plus, Trash } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { deleteEnrollmentPreset } from "@/lib/enrollment-presets-api";
import type { CourseRow } from "@falcon/shared/cms/types";
import { type EnrollmentPresetWithItems, dueOffsetLabel } from "@falcon/shared/enrollment/preset";
import { PresetEditorDialog } from "./PresetEditorDialog";

interface Props {
  presets: EnrollmentPresetWithItems[];
  loading: boolean;
  error: string | null;
  courses: CourseRow[];
  /** プリセットの定義を編集できるか (admin 以上)。 */
  canEdit: boolean;
  onChanged: () => Promise<void>;
}

export function PresetPanel({ presets, loading, error, courses, canEdit, onChanged }: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<EnrollmentPresetWithItems | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const courseTitle = (id: string) => courses.find((c) => c.id === id)?.title ?? "(削除された教材)";

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (preset: EnrollmentPresetWithItems) => {
    setEditing(preset);
    setEditorOpen(true);
  };

  const remove = async (preset: EnrollmentPresetWithItems) => {
    if (
      !confirm(
        `プリセット「${preset.name}」を削除します。 既にこのプリセットで登録済みの受講登録はそのまま残ります。`,
      )
    ) {
      return;
    }
    setBusyId(preset.id);
    try {
      await deleteEnrollmentPreset(preset.id);
      toast.success(`「${preset.name}」を削除しました`);
      await onChanged();
    } catch (err) {
      toast.error(`削除に失敗しました: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Card>
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <ClipboardList size={14} className="text-brand" />
          <h2 className="text-[13px] font-semibold tracking-tight">割当プリセット</h2>
          <span className="text-[11.5px] text-ink-3">{presets.length} 件</span>
          {canEdit ? (
            <Button variant="accent" size="sm" className="ml-auto" onClick={openCreate}>
              <Plus size={13} />
              プリセットを作成
            </Button>
          ) : null}
        </div>

        <div className="border-b border-border bg-sunken px-4 py-2 text-[11.5px] text-ink-3">
          よく使う教材の組み合わせに名前を付けておくと、 受講生を選んで 1 回の操作で
          割り当てられます。 期限は 「基準日からの日数」 で持つため、 いつ適用しても
          その時の基準日から数え直されます。
        </div>

        {error !== null ? (
          <p className="px-4 py-12 text-center text-[12.5px] text-destructive">{error}</p>
        ) : loading && presets.length === 0 ? (
          <SkeletonRows rows={3} className="p-4" />
        ) : presets.length === 0 ? (
          <p className="px-4 py-12 text-center text-[12.5px] text-ink-3">
            プリセットがまだありません。
            {canEdit ? " 「プリセットを作成」 から追加してください。" : ""}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {presets.map((preset) => (
              <li key={preset.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-semibold">{preset.name}</span>
                  <Badge>教材 {preset.items.length} 件</Badge>
                  {canEdit ? (
                    <span className="ml-auto flex items-center gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => openEdit(preset)}>
                        <Edit size={12} />
                        編集
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyId === preset.id}
                        onClick={() => void remove(preset)}
                      >
                        <Trash size={12} />
                        削除
                      </Button>
                    </span>
                  ) : null}
                </div>
                {preset.description ? (
                  <p className="mt-0.5 text-[12px] text-ink-3">{preset.description}</p>
                ) : null}
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {preset.items.map((item) => (
                    <li
                      key={item.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-sunken px-2.5 py-0.5 text-[11.5px]"
                    >
                      <span className="max-w-[16rem] truncate">{courseTitle(item.course_id)}</span>
                      <span className={item.required ? "text-brand" : "text-ink-4"}>
                        {item.required ? "必須" : "任意"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-ink-3">
                        <CalendarClock size={11} />
                        {item.due_offset_days === null
                          ? "期限なし"
                          : dueOffsetLabel(item.due_offset_days)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {canEdit ? (
        <PresetEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          preset={editing}
          courses={courses}
          onSaved={onChanged}
        />
      ) : null}
    </>
  );
}
