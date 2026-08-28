/**
 * 「今日のプラン」— 今日やることを 20〜30 分ぶんに束ねたチェックリスト (Phase 2)。
 *
 * 中身の決め方は純関数 `@/lib/today-plan` が持つ。ここは描画と導線だけ。
 * **項目ごとに理由 1 行と分数** を必ず出す (「なぜ今日それか」が無いと、ただの TODO に
 * なって読み飛ばされる)。
 */

import { Play, Sparkles, RotateCcw, Clock, Check } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardActions } from "@/components/ui/card";
import type { TodayPlan as TodayPlanData, TodayPlanItemKind } from "@/lib/today-plan";
import { cn } from "@/lib/utils";

interface TodayPlanProps {
  plan: TodayPlanData;
  /** その日の復習を解き終えているか (プランが空のときの言い分けに使う)。 */
  reviewDone: boolean;
  onStartReview: () => void;
  onStartLesson: () => void;
  onOpenMiss: () => void;
  className?: string;
}

const ICONS: Record<TodayPlanItemKind, typeof Play> = {
  review: Sparkles,
  lesson: Play,
  miss: RotateCcw,
};

const ACTION_LABEL: Record<TodayPlanItemKind, string> = {
  review: "復習を始める",
  lesson: "続きから",
  miss: "見直す",
};

export const TodayPlan = ({
  plan,
  reviewDone,
  onStartReview,
  onStartLesson,
  onOpenMiss,
  className,
}: TodayPlanProps) => {
  const action: Record<TodayPlanItemKind, () => void> = {
    review: onStartReview,
    lesson: onStartLesson,
    miss: onOpenMiss,
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>今日のプラン</CardTitle>
        <CardActions>
          {plan.items.length > 0 ? (
            <span className="text-[11.5px] text-ink-3 flex items-center gap-1">
              <Clock size={12} />約 {plan.totalMinutes} 分
            </span>
          ) : null}
        </CardActions>
      </CardHeader>
      <div>
        {plan.items.length === 0 ? (
          <div className="px-4 py-4 text-[12.5px] text-ink-3 flex items-center gap-2">
            {reviewDone ? (
              <>
                <Check size={14} className="text-success" />
                今日のぶんは終わりました。また明日。
              </>
            ) : (
              "今日のプランはまだ組めません。ステージを 1 つ始めると、ここに手順が並びます。"
            )}
          </div>
        ) : null}
        {plan.items.map((item, i) => {
          const Icon = ICONS[item.kind];
          return (
            <div
              key={item.kind}
              className={cn(
                "flex items-start gap-3 px-4 py-3",
                i < plan.items.length - 1 ? "border-b border-border" : "",
              )}
            >
              <span className="mt-0.5 grid place-items-center w-6 h-6 rounded-full border border-border-strong text-ink-3 shrink-0">
                <Icon size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium leading-snug">{item.title}</div>
                <div className="text-[11.5px] text-ink-3 mt-0.5">{item.reason}</div>
              </div>
              <span className="text-[11.5px] text-ink-3 tabular-nums shrink-0 mt-1">
                {item.minutes} 分
              </span>
              <Button
                size="sm"
                variant={i === 0 ? "accent" : "default"}
                onClick={action[item.kind]}
                className="shrink-0"
              >
                {ACTION_LABEL[item.kind]}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
