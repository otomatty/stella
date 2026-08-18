/**
 * 招待ダイアログ (単体 / CSV 一括) 共通の 「招待と同時にプリセットを割り当てる」 入力。
 *
 * 実運用は 「入社 → 招待 → 受講登録」 が連続するので、 招待の場で教材まで決められると
 * 操作が 1 回で済む。 招待自体は成功させたいので、 割当は招待が通ったユーザーにだけ
 * 後追いで行う (呼び出し側が `applyPresetToInvited` を使う)。
 */

import { ClipboardList } from "@/lib/icons";
import { Label } from "@/components/ui/label";
import { applyEnrollmentPresetInChunks } from "@/lib/enrollment-presets-api";
import { type EnrollmentPresetWithItems, isDateKey } from "@falcon/shared/enrollment/preset";

/** ダイアログ側が持つ状態。 `presetId` が空なら割当しない。 */
export interface InvitePresetState {
  presetId: string;
  baseDate: string;
}

interface Props {
  presets: EnrollmentPresetWithItems[];
  value: InvitePresetState;
  onChange: (value: InvitePresetState) => void;
  disabled?: boolean;
  /** input の id 衝突を避ける接頭辞 (単体招待 / CSV で別ダイアログのため)。 */
  idPrefix: string;
}

export function InvitePresetFields({ presets, value, onChange, disabled, idPrefix }: Props) {
  // プリセットが 1 件も無いテナントでは、 選べない選択肢を見せない。
  if (presets.length === 0) return null;

  const selected = presets.find((p) => p.id === value.presetId) ?? null;
  // `<input type="date">` は空にできる。 プリセットを選んだのに基準日が無いと期限を決められない。
  const baseDateValid = isDateKey(value.baseDate);

  return (
    <div className="rounded-md border border-border bg-sunken px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[12.5px] font-medium">
        <ClipboardList size={13} className="text-brand" />
        招待と同時に教材を割り当てる (任意)
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <Label htmlFor={`${idPrefix}-preset`}>割当プリセット</Label>
          <select
            id={`${idPrefix}-preset`}
            value={value.presetId}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, presetId: e.target.value })}
            className="h-9 w-full rounded-sm border border-input bg-card px-2 text-[12.5px]"
          >
            <option value="">割り当てない</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (教材 {p.items.length} 件)
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-base-date`}>期限の基準日</Label>
          <input
            id={`${idPrefix}-base-date`}
            type="date"
            value={value.baseDate}
            disabled={disabled || selected === null}
            onChange={(e) => onChange({ ...value, baseDate: e.target.value })}
            className="h-9 rounded-sm border border-input bg-card px-2 text-[12.5px] disabled:opacity-50"
          />
        </div>
      </div>
      {selected && !baseDateValid ? (
        <p className="mt-1.5 text-[11px] text-destructive">
          期限の基準日に実在する日付を入力してください。 未入力のままだと教材は割り当てられません。
        </p>
      ) : null}
      {selected ? (
        <p className="mt-1.5 text-[11px] text-ink-3">
          招待に成功した人へ「{selected.name}」の教材 {selected.items.length} 件を割り当てます。
          既に同じ教材を持っている場合はそのまま (期限は上書きしません)。
        </p>
      ) : null}
    </div>
  );
}

/**
 * 招待に成功したユーザーへプリセットを適用する。 結果はトースト用の文言で返す。
 *
 * 既存登録は `skip` 固定。 招待経路は 「新しく入った人に足す」 のが目的で、
 * 期限の上書きが要る場面は受講登録画面から明示的に行う。
 * 割当が失敗しても招待は成功したままにする (招待は巻き戻さない)。
 */
export async function applyPresetToInvited(
  preset: EnrollmentPresetWithItems,
  baseDate: string,
  userIds: string[],
): Promise<{ message: string; ok: boolean }> {
  if (userIds.length === 0) return { message: "", ok: true };
  if (!isDateKey(baseDate)) {
    // 招待自体は成功しているので、 ここで投げずに 「割り当てなかった」 ことを伝える。
    return { ok: false, message: "期限の基準日が不正なため、 教材の割当は行いませんでした" };
  }
  const result = await applyEnrollmentPresetInChunks({
    presetId: preset.id,
    userIds,
    baseDate,
    conflict: "skip",
    itemCount: preset.items.length,
    expectedUpdatedAt: preset.updated_at,
  });
  if (result.errors.length > 0) {
    return {
      ok: false,
      message: `「${preset.name}」の割当が一部失敗しました (成功 ${result.assigned} 件): ${result.errors[0]}`,
    };
  }
  return { ok: true, message: `「${preset.name}」から ${result.assigned} 件を割り当てました` };
}
