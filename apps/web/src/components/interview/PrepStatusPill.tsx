/**
 * 質問ごとの 4 状態ステータスピル (未着手 / 型を読んだ / 回答作成済み / 練習OK)。
 *
 * 受講者の準備チェックリストと、 講師・営業のモニタリング詳細ドロワー (Issue #236) で
 * 同じ見た目を使う — 受講者と講師が同じ言葉で状況を話せるようにするため、
 * 色とラベルの正本はここ 1 か所に置く。
 */

import { PREP_STATUS_LABELS, type QuestionPrepStatus } from "@falcon/shared/interview/progress";
import { cn } from "@/lib/utils";

export const PREP_STATUS_PILL_CLASSES: Record<QuestionPrepStatus, string> = {
  none: "bg-muted text-ink-3",
  read: "bg-info/10 text-info",
  drafted: "bg-warning/15 text-warning",
  confident: "bg-success/10 text-success",
};

export function PrepStatusPill({ status }: { status: QuestionPrepStatus }) {
  return (
    <span
      className={cn(
        "text-[10.5px] px-2 py-[2px] rounded-full font-semibold shrink-0",
        PREP_STATUS_PILL_CLASSES[status],
      )}
    >
      {PREP_STATUS_LABELS[status]}
    </span>
  );
}
