/**
 * 割当プリセットの作成 / 編集ダイアログ。
 *
 * 上段が 「含まれる教材」 (並び順 / 必須 / 期限オフセットを編集)、 下段が 「追加できる教材」。
 * 期限は絶対日付ではなく基準日からの日数で持つため、 入力も日数で行う
 * (適用時に基準日を選ぶと実際の日付になる)。
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ChevronDown, ChevronUp, Plus, Search, X } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createEnrollmentPreset,
  updateEnrollmentPreset,
  type PresetPayload,
} from "@/lib/enrollment-presets-api";
import type { CourseRow } from "@falcon/shared/cms/types";
import {
  PRESET_DESCRIPTION_MAX,
  PRESET_DUE_OFFSET_MAX,
  PRESET_DUE_OFFSET_MIN,
  PRESET_MAX_ITEMS,
  PRESET_NAME_MAX,
  type EnrollmentPresetWithItems,
} from "@falcon/shared/enrollment/preset";

/** 編集中の 1 項目。 期限は空文字を 「期限なし」 として扱うため文字列で持つ。 */
interface DraftItem {
  courseId: string;
  required: boolean;
  dueOffsetDays: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null なら新規作成。 */
  preset: EnrollmentPresetWithItems | null;
  courses: CourseRow[];
  onSaved: () => Promise<void>;
}

export function PresetEditorDialog({ open, onOpenChange, preset, courses, onSaved }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  // 開くたびに対象プリセットの内容を読み込み直す (前回の編集内容を持ち越さない)。
  useEffect(() => {
    if (!open) return;
    setName(preset?.name ?? "");
    setDescription(preset?.description ?? "");
    setItems(
      (preset?.items ?? []).map((item) => ({
        courseId: item.course_id,
        required: item.required,
        dueOffsetDays: item.due_offset_days === null ? "" : String(item.due_offset_days),
      })),
    );
    setQuery("");
  }, [open, preset]);

  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const selectedIds = useMemo(() => new Set(items.map((i) => i.courseId)), [items]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter(
      (c) =>
        !selectedIds.has(c.id) &&
        (!q || c.title.toLowerCase().includes(q) || (c.category ?? "").toLowerCase().includes(q)),
    );
  }, [courses, selectedIds, query]);

  const addItem = (courseId: string) => {
    if (items.length >= PRESET_MAX_ITEMS) {
      toast.error(`教材は ${PRESET_MAX_ITEMS} 件までです`);
      return;
    }
    setItems((prev) => [...prev, { courseId, required: true, dueOffsetDays: "" }]);
  };

  const removeItem = (courseId: string) =>
    setItems((prev) => prev.filter((i) => i.courseId !== courseId));

  const patchItem = (courseId: string, patch: Partial<DraftItem>) =>
    setItems((prev) => prev.map((i) => (i.courseId === courseId ? { ...i, ...patch } : i)));

  /** 並び替え。 学習してほしい順序をそのまま保存する。 */
  const move = (index: number, delta: number) =>
    setItems((prev) => {
      const next = [...prev];
      const target = index + delta;
      const a = next[index];
      const b = next[target];
      if (!a || !b) return prev;
      next[index] = b;
      next[target] = a;
      return next;
    });

  const submit = async () => {
    if (name.trim().length === 0) {
      toast.error("プリセット名を入力してください");
      return;
    }
    if (items.length === 0) {
      toast.error("教材を 1 件以上選んでください");
      return;
    }
    const payloadItems: PresetPayload["items"] = [];
    for (const item of items) {
      const raw = item.dueOffsetDays.trim();
      let dueOffsetDays: number | null = null;
      if (raw !== "") {
        const parsed = Number(raw);
        if (!Number.isInteger(parsed)) {
          toast.error(
            `「${courseById.get(item.courseId)?.title ?? item.courseId}」の期限は整数で入力してください`,
          );
          return;
        }
        if (parsed < PRESET_DUE_OFFSET_MIN || parsed > PRESET_DUE_OFFSET_MAX) {
          toast.error(
            `期限は ${PRESET_DUE_OFFSET_MIN} 〜 ${PRESET_DUE_OFFSET_MAX} 日の範囲で入力してください`,
          );
          return;
        }
        dueOffsetDays = parsed;
      }
      payloadItems.push({
        course_id: item.courseId,
        required: item.required,
        due_offset_days: dueOffsetDays,
      });
    }

    setSaving(true);
    try {
      const payload: PresetPayload = {
        name: name.trim(),
        description: description.trim() || null,
        items: payloadItems,
      };
      const res = preset
        ? await updateEnrollmentPreset(preset.id, payload)
        : await createEnrollmentPreset(payload);
      toast.success(preset ? "プリセットを更新しました" : "プリセットを作成しました");
      if (res.unpublished_course_ids.length > 0) {
        toast.warning(
          `未公開の教材が ${res.unpublished_course_ids.length} 件含まれています。 公開するまで受講者には表示されません。`,
        );
      }
      onOpenChange(false);
      await onSaved();
    } catch (err) {
      toast.error(`保存に失敗しました: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(calc(100vw-2rem),720px)]">
        <DialogHeader>
          <DialogTitle>{preset ? "プリセットを編集" : "プリセットを作成"}</DialogTitle>
          <DialogDescription>
            期限は 「基準日からの日数」 で決めます。 適用時に入社日や研修開始日を基準日として
            選ぶと、 実際の日付に展開されます。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[62vh] overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="sm:w-64">
              <Label htmlFor="preset-name">プリセット名</Label>
              <Input
                id="preset-name"
                value={name}
                maxLength={PRESET_NAME_MAX}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 新入社員研修パック"
              />
            </div>
            <div className="min-w-0 flex-1">
              <Label htmlFor="preset-desc">説明 (任意)</Label>
              <Input
                id="preset-desc"
                value={description}
                maxLength={PRESET_DESCRIPTION_MAX}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例: 4 月入社の全員に割り当てる基礎セット"
              />
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center gap-2">
              <h3 className="text-[12.5px] font-semibold">含まれる教材</h3>
              <span className="text-[11.5px] text-ink-3">
                {items.length} / {PRESET_MAX_ITEMS} 件
              </span>
            </div>
            {items.length === 0 ? (
              <p className="mt-1.5 rounded-md border border-dashed border-border px-3 py-6 text-center text-[12.5px] text-ink-3">
                下の一覧から教材を追加してください。
              </p>
            ) : (
              <ul className="mt-1.5 divide-y divide-border rounded-md border border-border">
                {items.map((item, index) => (
                  <li key={item.courseId} className="flex flex-wrap items-center gap-2 px-3 py-2">
                    <span className="flex shrink-0 flex-col">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        aria-label="上へ移動"
                        className="text-ink-4 disabled:opacity-30 hover:text-foreground"
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={index === items.length - 1}
                        onClick={() => move(index, 1)}
                        aria-label="下へ移動"
                        className="text-ink-4 disabled:opacity-30 hover:text-foreground"
                      >
                        <ChevronDown size={13} />
                      </button>
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px]">
                      {courseById.get(item.courseId)?.title ?? "(削除された教材)"}
                    </span>
                    <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-ink-2">
                      <input
                        type="checkbox"
                        checked={item.required}
                        onChange={(e) => patchItem(item.courseId, { required: e.target.checked })}
                      />
                      必須
                    </label>
                    <label className="flex items-center gap-1.5 text-[12px] text-ink-2">
                      期限
                      <input
                        type="number"
                        value={item.dueOffsetDays}
                        min={PRESET_DUE_OFFSET_MIN}
                        max={PRESET_DUE_OFFSET_MAX}
                        onChange={(e) =>
                          patchItem(item.courseId, { dueOffsetDays: e.target.value })
                        }
                        placeholder="—"
                        aria-label={`${courseById.get(item.courseId)?.title ?? ""} の期限 (基準日からの日数)`}
                        className="h-7 w-20 rounded-sm border border-input bg-card px-2 text-[12.5px]"
                      />
                      日後
                    </label>
                    <button
                      type="button"
                      onClick={() => removeItem(item.courseId)}
                      aria-label="この教材を外す"
                      className="grid size-6 place-items-center rounded-full text-ink-3 hover:bg-sunken hover:text-foreground"
                    >
                      <X size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1.5 text-[11px] text-ink-3">
              期限を空欄にすると 「期限なし」 になります。
            </p>
          </div>

          <div className="mt-5">
            <div className="flex items-center gap-2">
              <h3 className="text-[12.5px] font-semibold">追加できる教材</h3>
              <div className="relative ml-auto">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-4"
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="教材名で検索"
                  aria-label="教材を検索"
                  className="h-8 w-48 pl-7 text-[12.5px]"
                />
              </div>
            </div>
            {candidates.length === 0 ? (
              <p className="mt-1.5 px-3 py-4 text-center text-[12.5px] text-ink-3">
                追加できる教材がありません。
              </p>
            ) : (
              <ul className="mt-1.5 max-h-52 divide-y divide-border overflow-y-auto rounded-md border border-border">
                {candidates.map((course) => (
                  <li key={course.id} className="flex items-center gap-2 px-3 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-[12.5px]">
                      {course.title}
                      {course.status !== "published" ? (
                        <span className="ml-1.5 text-[11px] text-warning">未公開</span>
                      ) : null}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => addItem(course.id)}>
                      <Plus size={12} />
                      追加
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            キャンセル
          </Button>
          <Button variant="accent" onClick={() => void submit()} disabled={saving}>
            {preset ? "保存" : "作成"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
