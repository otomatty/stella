/**
 * 割当プリセットの適用ダイアログ。
 *
 * 「プリセットを選ぶ → 期限の基準日を決める → 既存登録の扱いを決める → 件数を確認して適用」。
 * 確認欄はサーバの dry-run 結果をそのまま出す。 プレビューと本適用が同じ計画ロジックを
 * 通るので、 「98 件と出たのに 120 件入った」 が起きない。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AlertTriangle, CalendarClock, ClipboardList, Loader2 } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { todayDateKey } from "@/lib/date-keys";
import {
  type ChunkedApplyResult,
  applyEnrollmentPresetInChunks,
} from "@/lib/enrollment-presets-api";
import type { AdminProfileRow } from "@/lib/admin-users-api";
import type { CourseRow } from "@falcon/shared/cms/types";
import {
  type EnrollmentPresetWithItems,
  type PresetConflictPolicy,
  dueDateFromOffset,
  dueOffsetLabel,
  isDateKey,
} from "@falcon/shared/enrollment/preset";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presets: EnrollmentPresetWithItems[];
  presetsLoading: boolean;
  courses: CourseRow[];
  /** 適用先。 受講登録画面で選択中の受講生。 */
  selectedProfiles: AdminProfileRow[];
  /** 適用が成功したら一覧を取り直す。 */
  onApplied: () => Promise<void>;
}

export function PresetApplyDialog({
  open,
  onOpenChange,
  presets,
  presetsLoading,
  courses,
  selectedProfiles,
  onApplied,
}: Props) {
  const [presetId, setPresetId] = useState("");
  const [baseDate, setBaseDate] = useState(todayDateKey);
  const [conflict, setConflict] = useState<PresetConflictPolicy>("skip");
  const [preview, setPreview] = useState<ChunkedApplyResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  // 見積もりの世代番号。 条件を素早く変えると前の dry-run が後から返ることがあり、
  // 古い結果で画面を上書きすると 「プリセット A の件数を見ながら B を適用」 になる。
  const previewIdRef = useRef(0);

  const preset = presets.find((p) => p.id === presetId) ?? null;
  const courseTitle = (id: string) => courses.find((c) => c.id === id)?.title ?? "(削除された教材)";
  // 選択中の受講生は配列の同一性が毎回変わるため、 見積もりの再実行判定は中身 (文字列) で行う。
  const userKey = selectedProfiles.map((p) => p.id).join(",");
  // 1 リクエストに載せられる受講生数は教材数で決まる。 件数だけ依存に入れる。
  const presetItemCount = preset?.items.length ?? 0;
  // 分割送信の全チャンクを同じ版に留める (途中や見積もり後に編集されたら 409 で止まる)。
  const presetUpdatedAt = preset?.updated_at ?? "";

  // 開くたびに既定値へ戻す。 前回の選択が残っていると、 別の受講生に前回の
  // プリセットをそのまま当ててしまう。
  useEffect(() => {
    if (!open) return;
    setPresetId(presets.length === 1 ? (presets[0]?.id ?? "") : "");
    setBaseDate(todayDateKey());
    setConflict("skip");
    setPreview(null);
    setPreviewError(null);
  }, [open, presets]);

  const runPreview = useCallback(async () => {
    // 世代を進めてから走らせる。 これで飛行中の古いリクエストの結果は捨てられる。
    const reqId = ++previewIdRef.current;
    const userIds = userKey ? userKey.split(",") : [];
    // 基準日が空 / 実在しない日付のまま送っても 400 になるだけなので、 手前で止める。
    if (!presetId || userIds.length === 0 || !isDateKey(baseDate)) {
      setPreview(null);
      setPreviewError(null);
      setPreviewing(false);
      return;
    }
    setPreviewing(true);
    setPreviewError(null);
    try {
      // 受講生はいくらでも選べるため、 サーバの上限 (50 名 / 500 組) に合わせて分割する。
      // 分割しないと大きなテナントでは見積もりも適用も 400 になり操作できない。
      const result = await applyEnrollmentPresetInChunks({
        presetId,
        userIds,
        baseDate,
        conflict,
        itemCount: presetItemCount,
        expectedUpdatedAt: presetUpdatedAt,
        dryRun: true,
      });
      if (reqId !== previewIdRef.current) return;
      if (result.errors.length > 0) {
        setPreview(null);
        setPreviewError(result.errors[0] ?? "見積もりに失敗しました");
        return;
      }
      setPreview(result);
    } catch (err) {
      if (reqId !== previewIdRef.current) return;
      setPreview(null);
      setPreviewError(err instanceof Error ? err.message : "見積もりに失敗しました");
    } finally {
      // 古い応答の finally で 「読み込み中」 を解除すると、 新しい見積もりの完了前に
      // 適用ボタンが押せてしまう。 最新の世代だけが解除する。
      if (reqId === previewIdRef.current) setPreviewing(false);
    }
  }, [presetId, baseDate, conflict, userKey, presetItemCount, presetUpdatedAt]);

  // 条件が変わるたびに見積もり直す。 押してから初めて件数が出るより、
  // 条件をいじりながら影響が見える方が事故が減る。
  useEffect(() => {
    if (!open) return;
    void runPreview();
  }, [open, runPreview]);

  const submit = async () => {
    if (!preset || !isDateKey(baseDate)) return;
    setApplying(true);
    try {
      const result = await applyEnrollmentPresetInChunks({
        presetId,
        userIds: selectedProfiles.map((p) => p.id),
        baseDate,
        conflict,
        itemCount: preset.items.length,
        expectedUpdatedAt: preset.updated_at,
      });
      const parts = [`新規 ${result.assigned} 件`];
      if (result.overwritten > 0) parts.push(`上書き ${result.overwritten} 件`);
      if (result.skipped > 0) parts.push(`スキップ ${result.skipped} 件`);
      const done = `「${preset.name}」を適用しました (${parts.join(" / ")})`;
      // 分割送信なので一部だけ失敗しうる。 落とさず、 通った分と失敗内容の両方を伝える。
      if (result.errors.length > 0) {
        toast.error(`${done} — ${result.errors.length} 件のリクエストが失敗: ${result.errors[0]}`);
      } else {
        toast.success(done);
      }
      onOpenChange(false);
      await onApplied();
    } catch (err) {
      toast.error(`適用に失敗しました: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setApplying(false);
    }
  };

  const nothingToDo = preview !== null && preview.assigned + preview.overwritten === 0;
  // `<input type="date">` は空にできる。 未入力のまま期限を計算すると描画中に例外になるため、
  // 妥当性をここで一度だけ判定し、 表示と適用ボタンの両方で使う。
  const baseDateValid = isDateKey(baseDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(calc(100vw-2rem),620px)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList size={16} />
            プリセットを適用
          </DialogTitle>
          <DialogDescription>
            選択中の {selectedProfiles.length} 名に、 プリセットの教材をまとめて割り当てます。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {presetsLoading ? (
            <p className="py-6 text-center text-[12.5px] text-ink-3">プリセットを読み込み中…</p>
          ) : presets.length === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-ink-3">
              プリセットがまだありません。 「割当プリセット」 タブから作成してください。
            </p>
          ) : (
            <>
              <fieldset>
                <legend className="mb-1.5 text-[12.5px] font-medium">プリセット</legend>
                <div className="flex flex-col gap-1.5">
                  {presets.map((p) => (
                    <label
                      key={p.id}
                      className={
                        p.id === presetId
                          ? "flex cursor-pointer items-start gap-2 rounded-md border border-brand bg-brand-soft/50 px-3 py-2"
                          : "flex cursor-pointer items-start gap-2 rounded-md border border-border px-3 py-2 hover:bg-sunken"
                      }
                    >
                      <input
                        type="radio"
                        name="preset"
                        className="mt-1"
                        checked={p.id === presetId}
                        onChange={() => setPresetId(p.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium">{p.name}</span>
                        <span className="block text-[11.5px] text-ink-3">
                          教材 {p.items.length} 件{p.description ? ` — ${p.description}` : ""}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="mt-4 flex flex-wrap items-end gap-4">
                <div>
                  <Label htmlFor="preset-base-date">期限の基準日</Label>
                  <input
                    id="preset-base-date"
                    type="date"
                    value={baseDate}
                    onChange={(e) => setBaseDate(e.target.value)}
                    className="h-8 rounded-sm border border-input bg-card px-2 text-[12.5px]"
                  />
                  <p className="mt-1 text-[11px] text-ink-3">
                    入社日や研修開始日を指定すると、 そこからの日数で期限が決まります。
                  </p>
                </div>
                <label className="flex cursor-pointer items-center gap-1.5 pb-1 text-[12.5px] text-ink-2">
                  <input
                    type="checkbox"
                    checked={conflict === "overwrite"}
                    onChange={(e) => setConflict(e.target.checked ? "overwrite" : "skip")}
                  />
                  既存の受講登録も期限 / 必須を上書きする
                </label>
              </div>

              {preset ? (
                <div className="mt-4 rounded-md border border-border">
                  <div className="border-b border-border bg-sunken px-3 py-1.5 text-[11.5px] text-ink-3">
                    割り当てる教材と期限{" "}
                    {baseDateValid ? `(基準日 ${baseDate})` : "(基準日を入力してください)"}
                  </div>
                  <ul className="divide-y divide-border">
                    {preset.items.map((item) => {
                      const due = baseDateValid
                        ? dueDateFromOffset(baseDate, item.due_offset_days)
                        : null;
                      return (
                        <li
                          key={item.id}
                          className="flex items-center gap-2 px-3 py-1.5 text-[12.5px]"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {courseTitle(item.course_id)}
                          </span>
                          <Badge variant={item.required ? "accent" : "default"}>
                            {item.required ? "必須" : "任意"}
                          </Badge>
                          <span className="inline-flex w-[9.5rem] shrink-0 items-center justify-end gap-1 text-ink-3">
                            <CalendarClock size={12} />
                            {due
                              ? due.slice(0, 10)
                              : baseDateValid
                                ? dueOffsetLabel(null)
                                : dueOffsetLabel(item.due_offset_days)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              {preview && preview.unpublished_course_ids.length > 0 ? (
                <p className="mt-3 flex items-start gap-1.5 rounded-sm border border-border bg-warning-soft px-2.5 py-1.5 text-[11.5px] text-warning">
                  <AlertTriangle size={13} className="mt-px shrink-0" />
                  未公開の教材が {preview.unpublished_course_ids.length} 件含まれています。
                  割り当てても公開するまで受講者には表示されません。
                </p>
              ) : null}

              <div className="mt-4 rounded-md border border-border bg-sunken px-3 py-2.5">
                {previewError ? (
                  <p className="text-[12.5px] text-destructive">{previewError}</p>
                ) : !baseDateValid ? (
                  <p className="text-[12.5px] text-destructive">
                    期限の基準日に実在する日付を入力してください。
                  </p>
                ) : !presetId ? (
                  <p className="text-[12.5px] text-ink-3">プリセットを選んでください。</p>
                ) : previewing ? (
                  <p className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
                    <Loader2 size={13} className="animate-spin" />
                    影響範囲を確認しています…
                  </p>
                ) : preview ? (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
                    <span>
                      新規に割当 <strong className="text-foreground">{preview.assigned}</strong> 件
                    </span>
                    <span>
                      既存を上書き{" "}
                      <strong className="text-foreground">{preview.overwritten}</strong> 件
                    </span>
                    <span>
                      既存のまま <strong className="text-foreground">{preview.skipped}</strong> 件
                    </span>
                  </div>
                ) : null}
                {nothingToDo ? (
                  <p className="mt-1 text-[11.5px] text-ink-3">
                    追加も変更もありません。 全員が既にこのプリセットの教材を持っています。
                  </p>
                ) : null}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={applying}>
            キャンセル
          </Button>
          <Button
            variant="accent"
            disabled={
              !preset || !baseDateValid || applying || previewing || preview === null || nothingToDo
            }
            onClick={() => void submit()}
          >
            {applying ? <Loader2 size={13} className="animate-spin" /> : null}
            {preview ? `${preview.assigned + preview.overwritten} 件を適用` : "適用"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
