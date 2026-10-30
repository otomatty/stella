/**
 * ホームのガイド最上段の HUD — レベルリング / XP / 連続学習 / 修了数 / 集中ボーナス。
 *
 * 「今の自分」を 1 行で見せるだけの帯。主役は下の「次にやること」なので、数字は
 * 小さく横に並べるだけにする (前の版は大きなカードで、今日の一手より先に目に入っていた)。
 * 数字はすべてサーバの実データで、取れないときは「—」を出して黙って 0 を見せない
 * (0 は「やっていない」の意味に読めてしまう)。
 *
 * 集中ボーナスは **表示専用の係数**。XP の保存値には掛けないので、ここでも
 * 「合計 XP × 倍率」のような数字は作らず、倍率そのものと次の段までの日数を出す。
 */

import type { ReactNode } from "react";

import { Flame, Star } from "@/lib/icons";
import { RadialProgress } from "@/components/ui/radial-progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { FocusBonusPayload, SkillProfileMine } from "@/lib/skill-map-api";
import { cn } from "@/lib/utils";

interface HomeHudProps {
  profile: SkillProfileMine | null;
  focusBonus: FocusBonusPayload | null;
  /** 修了した星の数と、配信対象の総数 (分母は視界で落とす前の数)。 */
  cleared: { count: number; total: number } | null;
  loading: boolean;
  className?: string;
}

export const HomeHud = ({ profile, focusBonus, cleared, loading, className }: HomeHudProps) => {
  const level = profile?.level;
  // レベル内の進捗率。次のレベルまでの必要 XP が 0 (最大レベル) なら満タン表示。
  const span = level ? level.xp_into_level + level.xp_to_next_level : 0;
  const pct = level && span > 0 ? Math.round((level.xp_into_level / span) * 100) : 0;
  const streak = profile?.streak.current ?? null;
  const bonus = focusBonus && focusBonus.multiplier > 1 ? focusBonus : null;

  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      <div className="flex items-center gap-2">
        <RadialProgress
          value={pct}
          size={40}
          thickness={4}
          label={
            level
              ? `レベル ${level.level} · 次のレベルまで ${level.xp_to_next_level} XP`
              : "レベル読み込み中"
          }
        >
          <div className="leading-none">
            <div className="text-[8px] text-ink-3">Lv</div>
            <div className="text-[12px] font-semibold tabular-nums">{level?.level ?? "—"}</div>
          </div>
        </RadialProgress>
        <div className="leading-tight">
          {loading && !profile ? (
            <Skeleton className="h-4 w-16" />
          ) : (
            <div className="text-[13px] font-semibold tabular-nums">
              {profile ? profile.xp.total.toLocaleString() : "—"}
              <span className="ml-0.5 text-[10.5px] font-normal text-ink-3">XP</span>
            </div>
          )}
          <div className="text-[10.5px] text-ink-3">
            {level ? `次まで ${level.xp_to_next_level} XP` : "　"}
          </div>
        </div>
      </div>

      <Stat icon={<Flame size={13} />} tone="text-warning" label="連続学習">
        {streak == null ? "—" : `${streak} 日`}
      </Stat>

      <Stat icon={<Star size={13} />} tone="text-brand" label="修了">
        {cleared ? `${cleared.count} / ${cleared.total}` : "—"}
      </Stat>

      {bonus ? (
        <Tooltip>
          {/*
            トリガーは button。div のままだとフォーカスが当たらず、ボーナスの
            中身 (何日続いているか) がキーボード操作では読めない。
          */}
          <TooltipTrigger asChild>
            <button
              type="button"
              className="rounded-full border border-brand/40 bg-brand-soft px-2 py-0.5 text-[11px] font-semibold tabular-nums text-brand-ink"
            >
              集中 ×{bonus.multiplier}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[260px]">
            いま進めているステージだけを {bonus.streak_days} 日続けています。
            {bonus.next_tier_days
              ? ` あと ${bonus.next_tier_days - bonus.streak_days} 日で ×${bonus.next_multiplier} になります。`
              : ""}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
};

function Stat({
  icon,
  tone,
  label,
  children,
}: {
  icon: ReactNode;
  tone: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5" title={label}>
      <span className={cn("grid size-6 place-items-center rounded-full bg-sunken", tone)}>
        {icon}
      </span>
      <div className="leading-tight">
        <div className="text-[10.5px] text-ink-3">{label}</div>
        <div className="text-[12.5px] font-semibold tabular-nums">{children}</div>
      </div>
    </div>
  );
}
