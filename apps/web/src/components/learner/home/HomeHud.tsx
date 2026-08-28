/**
 * ホーム最上段の HUD — レベルリング / XP / 連続学習 / 集中ボーナス (Phase 2)。
 *
 * 「今の自分」を 1 行で見せるだけの帯。数字はすべてサーバの実データで、
 * 取れないときは「—」を出して黙って 0 を見せない (0 は「やっていない」の意味に
 * 読めてしまう)。
 *
 * 集中ボーナスは **表示専用の係数**。XP の保存値には掛けないので、ここでも
 * 「合計 XP × 倍率」のような数字は作らず、倍率そのものと次の段までの日数を出す。
 */

import { Flame } from "@/lib/icons";
import { RadialProgress } from "@/components/ui/radial-progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { FocusBonusPayload, SkillProfileMine } from "@/lib/skill-map-api";
import { cn } from "@/lib/utils";

interface HomeHudProps {
  profile: SkillProfileMine | null;
  focusBonus: FocusBonusPayload | null;
  /** 連続学習日数 (日別学習ログ由来)。プロフィールが取れないときの控え。 */
  streakDays: number | null;
  loading: boolean;
  className?: string;
}

export const HomeHud = ({ profile, focusBonus, streakDays, loading, className }: HomeHudProps) => {
  const level = profile?.level;
  // レベル内の進捗率。次のレベルまでの必要 XP が 0 (最大レベル) なら満タン表示。
  const span = level ? level.xp_into_level + level.xp_to_next_level : 0;
  const pct = level && span > 0 ? Math.round((level.xp_into_level / span) * 100) : 0;
  const streak = profile?.streak.current ?? streakDays;
  const bonus = focusBonus && focusBonus.multiplier > 1 ? focusBonus : null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-6 gap-y-4 rounded-lg border border-border bg-card px-5 py-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <RadialProgress
          value={pct}
          size={64}
          thickness={6}
          label={
            level
              ? `レベル ${level.level} · 次のレベルまで ${level.xp_to_next_level} XP`
              : "レベル読み込み中"
          }
        >
          <div className="leading-none">
            <div className="text-[10px] text-ink-3">Lv</div>
            <div className="text-[17px] font-semibold tabular-nums">{level?.level ?? "—"}</div>
          </div>
        </RadialProgress>
        <div>
          <div className="text-[11.5px] text-ink-3">累計 XP</div>
          {loading && !profile ? (
            <Skeleton className="h-5 w-20 mt-1" />
          ) : (
            <div className="text-[17px] font-semibold tabular-nums">
              {profile ? profile.xp.total.toLocaleString() : "—"}
            </div>
          )}
          <div className="text-[11.5px] text-ink-3">
            {level ? `次のレベルまで ${level.xp_to_next_level} XP` : "　"}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="grid place-items-center w-9 h-9 rounded-md bg-warning-soft text-warning">
          <Flame size={16} />
        </span>
        <div>
          <div className="text-[11.5px] text-ink-3">連続学習</div>
          <div className="text-[17px] font-semibold tabular-nums">
            {streak == null ? "—" : `${streak} 日`}
          </div>
        </div>
      </div>

      {bonus ? (
        <Tooltip>
          {/*
            トリガーは button。div のままだとフォーカスが当たらず、ボーナスの
            中身 (何日続いているか) がキーボード操作では読めない。
          */}
          <TooltipTrigger asChild>
            <button
              type="button"
              className="flex flex-col justify-center rounded-md border border-brand/40 bg-brand-soft px-3 py-1.5 text-left"
            >
              <div className="text-[11.5px] text-ink-2">集中ボーナス</div>
              <div className="text-[15px] font-semibold tabular-nums">×{bonus.multiplier}</div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[260px]">
            いま進めているステージだけを {bonus.streak_days} 日続けています。
            {bonus.next_tier_days
              ? ` あと ${bonus.next_tier_days - bonus.streak_days} 日で ×${bonus.next_multiplier} になります。`
              : ""}
          </TooltipContent>
        </Tooltip>
      ) : focusBonus?.next_tier_days ? (
        <div className="text-[11.5px] text-ink-3 leading-snug">
          集中ボーナス
          <br />
          あと {Math.max(focusBonus.next_tier_days - focusBonus.streak_days, 1)} 日で ×
          {focusBonus.next_multiplier}
        </div>
      ) : null}
    </div>
  );
};
