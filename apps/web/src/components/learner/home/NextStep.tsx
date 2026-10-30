/**
 * ホームのガイドの「次にやること」と「そのあと」(手順の並びは `@/lib/home-guide`)。
 *
 * 先頭の 1 つだけを大きなカードにして、押すべきボタンを 1 つに絞る (`NextStepCard`)。
 * 前の版のホームは「今日のプラン」「スキルマップの続きから」「次にやるリストの始める」が
 * 同じ強さで並び、どれが本筋かを受講者が選ばなければならなかった。強調 (accent) は
 * このカードの主ボタンにしか使わない。残りの手順は小さな行で続ける (`LaterSteps`)。
 *
 * 星を勧める手順 (`choose`) は、名前の横の「ツリーで見る」で後ろの盤面をその星へ寄せる —
 * ガイドが「何を」、ツリーが「どこか」を受け持つ。
 *
 * ガイドは盤面に浮かぶカードで、畳むと「次にやること」だけの 1 行 (`NextStepBar`) になる。
 * 畳んでも主ボタンは残す — 盤面を広く見ている間も、次の一手は 1 押しで始められる。
 */

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { GuideStep, HomeGuide } from "@/lib/home-guide";
import {
  Book,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Play,
  RotateCcw,
  Sparkles,
} from "@/lib/icons";
import type { SkillMapStageNode } from "@/lib/skill-map-api";
import type { TodayPlanItemKind } from "@/lib/today-plan";
import { cn } from "@/lib/utils";

/** 進行中のステージ (レッスンの続き・仕上げの文面に使う)。 */
export interface GuideActiveStage {
  id: string;
  title: string;
  progress: number;
  lessonsCount: number;
}

export interface GuideHandlers {
  onStartReview: () => void;
  onResumeLesson: () => void;
  onOpenMiss: () => void;
  /** 進行中のステージの詳細 (レッスン一覧) を開く。 */
  onOpenActiveStage: () => void;
  /** 勧めた星を始める (乗り換えの確認は呼び出し側が出す)。 */
  onStartStage: (stageId: string) => void;
  /** 横のツリーをその星へ寄せる。 */
  onShowInTree: (stageId: string) => void;
}

interface StepContext extends GuideHandlers {
  activeStage: GuideActiveStage | null;
  /** 勧める星の名前・カテゴリ・到達説明の引き当て。 */
  nodeOf: (stageId: string) => SkillMapStageNode | undefined;
  /** 開始中の星 (二重押しを止める)。 */
  startingId: string | null;
}

const PLAN_ICON: Record<TodayPlanItemKind, typeof Play> = {
  review: Sparkles,
  lesson: Play,
  miss: RotateCcw,
};

const PLAN_ACTION: Record<TodayPlanItemKind, string> = {
  review: "復習を始める",
  lesson: "続きから",
  miss: "見直す",
};

function planAction(kind: TodayPlanItemKind, ctx: GuideHandlers): () => void {
  if (kind === "review") return ctx.onStartReview;
  if (kind === "lesson") return ctx.onResumeLesson;
  return ctx.onOpenMiss;
}

/** 仕上げの文面。レッスンを持たない星 (準備中) と、レッスンを終えた星を言い分ける。 */
function wrapupCopy(stage: GuideActiveStage | null): { title: string; reason: string } {
  const title = stage?.title ?? "進行中のステージ";
  if (stage && stage.lessonsCount === 0) {
    return {
      title: `${title} は教材の準備中です`,
      reason: "公開されるまで、ほかのスキルを進められます。",
    };
  }
  return {
    title: `${title} の仕上げ`,
    reason: "レッスンはすべて終わりました。課題の提出とレビューの結果を確かめましょう。",
  };
}

interface NextStepCardProps extends StepContext {
  guide: HomeGuide;
  /** マップを読み終えるまでは骨組みだけを出す (空の案内が一瞬出る瞬きを避ける)。 */
  loading: boolean;
}

/** 畳んだガイドの 1 行に載せる要約。主ボタンはカードのものと同じ行き先。 */
interface StepSummary {
  icon: typeof Play;
  eyebrow: string;
  title: string;
  action?: { label: string; onClick: () => void; disabled?: boolean };
}

function summarizeStep(
  step: GuideStep | undefined,
  idle: HomeGuide["idle"],
  ctx: StepContext,
): StepSummary {
  if (!step) {
    return idle === "done"
      ? { icon: Check, eyebrow: "次にやること", title: "今日のぶんは終わりました" }
      : { icon: Compass, eyebrow: "次にやること", title: "いま始められるスキルはありません" };
  }
  if (step.kind === "plan") {
    return {
      icon: PLAN_ICON[step.item.kind],
      eyebrow: `次にやること · 約 ${step.item.minutes} 分`,
      title: step.item.title,
      action: { label: PLAN_ACTION[step.item.kind], onClick: planAction(step.item.kind, ctx) },
    };
  }
  if (step.kind === "wrapup") {
    return {
      icon: Book,
      eyebrow: "次にやること",
      title: wrapupCopy(ctx.activeStage).title,
      action: { label: "レッスン一覧", onClick: ctx.onOpenActiveStage },
    };
  }
  const first = step.stageIds[0];
  const title = (first && ctx.nodeOf(first)?.title) ?? "おすすめのスキル";
  return {
    icon: Sparkles,
    eyebrow: step.welcome ? "はじめの一歩 · おすすめ" : "次にやること · おすすめ",
    title,
    ...(first
      ? {
          action: {
            label: ctx.startingId === first ? "開始中…" : "ここから始める",
            onClick: () => ctx.onStartStage(first),
            disabled: ctx.startingId !== null,
          },
        }
      : {}),
  };
}

interface NextStepBarProps extends NextStepCardProps {
  /** カードを開く。 */
  onExpand: () => void;
}

/**
 * 畳んだガイド — 「次にやること」の 1 行と主ボタン。名前の側を押すとカードが開く。
 */
export const NextStepBar = ({ guide, loading, onExpand, ...ctx }: NextStepBarProps) => {
  const step = guide.steps[0];
  const summary = summarizeStep(step, guide.idle, ctx);
  const Icon = summary.icon;
  return (
    <div className="flex items-center gap-2 p-2 pl-3">
      <button
        type="button"
        onClick={onExpand}
        aria-expanded={false}
        aria-label={`次にやることを開く: ${summary.title}`}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1 text-left"
      >
        {/* スマホ幅ではアイコンを省き、名前に幅を回す。 */}
        <span className="hidden size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand sm:grid">
          <Icon size={14} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[10.5px] font-semibold tracking-wide text-brand-ink">
            {summary.eyebrow}
          </span>
          {loading && !step ? (
            <Skeleton className="mt-1 h-3.5 w-32" />
          ) : (
            <span className="block truncate text-[13px] font-semibold leading-snug">
              {summary.title}
            </span>
          )}
        </span>
      </button>
      {summary.action && !(loading && !step) ? (
        <Button
          size="sm"
          variant="accent"
          className="shrink-0"
          disabled={summary.action.disabled}
          onClick={summary.action.onClick}
        >
          {summary.action.label}
        </Button>
      ) : null}
      <Button
        size="icon-sm"
        variant="ghost"
        className="shrink-0"
        aria-label="次にやることを開く"
        onClick={onExpand}
      >
        {/* 下に浮くとき (スマホ・タブレット) は上へ、左上に浮くとき (PC) は下へ開く。 */}
        <ChevronUp size={14} className="lg:hidden" />
        <ChevronDown size={14} className="hidden lg:block" />
      </Button>
    </div>
  );
};

/** いちばん大きく出す「次にやること」。押すべきボタンはここの 1 つだけ。 */
export const NextStepCard = ({ guide, loading, ...ctx }: NextStepCardProps) => {
  const step = guide.steps[0];

  if (loading && !step) {
    return (
      <HeroFrame eyebrow="次にやること">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-3.5 w-full" />
        <Skeleton className="mt-4 h-10 w-full rounded-full" />
      </HeroFrame>
    );
  }

  if (!step) {
    return (
      <HeroFrame eyebrow="次にやること">
        {guide.idle === "done" ? (
          <p className="flex items-center gap-2 text-[14px] font-semibold">
            <Check size={16} className="text-success" />
            今日のぶんは終わりました。また明日。
          </p>
        ) : (
          <>
            <p className="text-[14px] font-semibold">いま始められるスキルはありません</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
              ツリーの鍵の付いた星から「腕試し」に合格すると、先のスキルを開けます。
            </p>
          </>
        )}
      </HeroFrame>
    );
  }

  return <HeroStep step={step} ctx={ctx} />;
};

const HeroStep = ({ step, ctx }: { step: GuideStep; ctx: StepContext }) => {
  if (step.kind === "plan") {
    const { item } = step;
    const Icon = PLAN_ICON[item.kind];
    const lesson = item.kind === "lesson" ? ctx.activeStage : null;
    return (
      <HeroFrame
        eyebrow="次にやること"
        meta={
          <span className="flex items-center gap-1">
            <Clock size={11} />約 {item.minutes} 分
          </span>
        }
      >
        {lesson ? (
          <button
            type="button"
            onClick={() => ctx.onShowInTree(lesson.id)}
            className="mb-1 inline-flex max-w-full items-center gap-1 text-[11.5px] font-medium text-brand-ink hover:underline"
            title="ツリーで見る"
          >
            <Compass size={11} className="shrink-0" />
            <span className="truncate">{lesson.title}</span>
          </button>
        ) : null}
        <h2 className="flex items-start gap-2 text-[17px] font-semibold leading-snug tracking-tight">
          <Icon size={16} className="mt-1 shrink-0 text-brand" />
          <span className="min-w-0">{item.title}</span>
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{item.reason}</p>
        {lesson ? (
          <div className="mt-3 flex items-center gap-2">
            <Progress value={lesson.progress} tone="brand" className="flex-1" />
            <span className="text-[11px] tabular-nums text-ink-3">{lesson.progress}%</span>
          </div>
        ) : null}
        <Button size="full" variant="accent" className="mt-4" onClick={planAction(item.kind, ctx)}>
          <Icon size={14} />
          {PLAN_ACTION[item.kind]}
        </Button>
        {lesson ? (
          <Button
            size="sm"
            variant="ghost"
            className="mt-1.5 self-center"
            onClick={ctx.onOpenActiveStage}
          >
            <Book size={12} />
            レッスン一覧
          </Button>
        ) : null}
      </HeroFrame>
    );
  }

  if (step.kind === "wrapup") {
    const copy = wrapupCopy(ctx.activeStage);
    return (
      <HeroFrame eyebrow="次にやること">
        <h2 className="text-[17px] font-semibold leading-snug tracking-tight">{copy.title}</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{copy.reason}</p>
        <Button size="full" variant="accent" className="mt-4" onClick={ctx.onOpenActiveStage}>
          <Book size={14} />
          レッスン一覧を開く
        </Button>
      </HeroFrame>
    );
  }

  return (
    <HeroFrame eyebrow={step.welcome ? "はじめの一歩" : "次にやること"}>
      <h2 className="text-[17px] font-semibold leading-snug tracking-tight">
        {step.welcome ? "スキルツリーへようこそ" : "次のスキルを選びましょう"}
      </h2>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
        {step.welcome
          ? "ひとつ終えると、ツリーが少しずつ見えてきます。まずはどこから始めるか選びましょう。"
          : "ツリーで「おすすめ」の輪が付いた星が、いま始められるスキルです。"}
      </p>
      <SuggestionList stageIds={step.stageIds} ctx={ctx} emphasize className="mt-3" />
      {step.welcome ? (
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
          すでに知っている内容は、ツリーの星から「腕試し」に合格すると先のスキルから始められます。
        </p>
      ) : null}
    </HeroFrame>
  );
};

/** ヒーローの器。ブランド色の縁で、ガイドの中でここだけが目立つ。 */
const HeroFrame = ({
  eyebrow,
  meta,
  children,
}: {
  eyebrow: string;
  meta?: ReactNode;
  children: ReactNode;
}) => (
  <section
    aria-label={eyebrow}
    className="flex flex-col rounded-xl border border-brand/40 bg-gradient-to-br from-card to-brand-soft p-4 shadow-sm"
  >
    <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold text-brand-ink">
      <span className="tracking-wide">{eyebrow}</span>
      {meta ? <span className="font-normal text-ink-3">{meta}</span> : null}
    </div>
    {children}
  </section>
);

/** 勧める星の並び。名前を押すとツリーがその星へ寄る。 */
const SuggestionList = ({
  stageIds,
  ctx,
  emphasize = false,
  className,
}: {
  stageIds: string[];
  ctx: StepContext;
  /** ヒーローの中では先頭の「始める」だけを強調する。 */
  emphasize?: boolean;
  className?: string;
}) => (
  <ul className={cn("flex flex-col gap-2", className)}>
    {stageIds.map((id, i) => {
      const node = ctx.nodeOf(id);
      const title = node?.title ?? "このスキル";
      return (
        <li key={id} className="rounded-lg border border-border bg-card px-3 py-2.5">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => ctx.onShowInTree(id)}
                className="text-left text-[13px] font-semibold leading-snug hover:underline"
              >
                {title}
              </button>
              {node?.category ? (
                <div className="text-[11px] text-ink-3">{node.category}</div>
              ) : null}
            </div>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`${title} をツリーで見る`}
              title="ツリーで見る"
              onClick={() => ctx.onShowInTree(id)}
            >
              <Compass size={13} />
            </Button>
          </div>
          {node?.can_do ? (
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">
              身につくと <strong className="text-foreground">{node.can_do}</strong>。
            </p>
          ) : null}
          <Button
            size="sm"
            variant={emphasize && i === 0 ? "accent" : "default"}
            className="mt-2 w-full"
            disabled={ctx.startingId !== null}
            onClick={() => ctx.onStartStage(id)}
          >
            <Play size={12} />
            {ctx.startingId === id ? "開始中…" : "ここから始める"}
          </Button>
        </li>
      );
    })}
  </ul>
);

interface LaterStepsProps extends StepContext {
  steps: GuideStep[];
}

/** 「次にやること」のあとに続く手順。強調はせず、行で並べる。 */
export const LaterSteps = ({ steps, ...ctx }: LaterStepsProps) => {
  if (steps.length === 0) return null;
  return (
    <GuideSection title="そのあと">
      <ul className="flex flex-col gap-2">
        {steps.map((step) => (
          <li key={stepKey(step)}>
            <LaterStep step={step} ctx={ctx} />
          </li>
        ))}
      </ul>
    </GuideSection>
  );
};

function stepKey(step: GuideStep): string {
  return step.kind === "plan" ? `plan:${step.item.kind}` : step.kind;
}

const LaterStep = ({ step, ctx }: { step: GuideStep; ctx: StepContext }) => {
  if (step.kind === "choose") {
    return (
      <div>
        <div className="mb-1.5 text-[12px] font-medium text-ink-2">次に始めるスキル</div>
        <SuggestionList stageIds={step.stageIds} ctx={ctx} />
      </div>
    );
  }
  const row =
    step.kind === "plan"
      ? {
          icon: PLAN_ICON[step.item.kind],
          title: step.item.title,
          meta: `${step.item.minutes} 分`,
          action: PLAN_ACTION[step.item.kind],
          onClick: planAction(step.item.kind, ctx),
        }
      : {
          icon: Book,
          title: wrapupCopy(ctx.activeStage).title,
          meta: "",
          action: "開く",
          onClick: ctx.onOpenActiveStage,
        };
  const Icon = row.icon;
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2">
      <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border-strong text-ink-3">
        <Icon size={12} />
      </span>
      <span className="min-w-0 flex-1 text-[12.5px] font-medium leading-snug">{row.title}</span>
      {row.meta ? (
        <span className="shrink-0 text-[11px] tabular-nums text-ink-3">{row.meta}</span>
      ) : null}
      <Button size="sm" variant="default" className="shrink-0" onClick={row.onClick}>
        {row.action}
      </Button>
    </div>
  );
};

/** ガイドの小見出し付きの区画 (そのあと / 次にやるリスト / 発見教材)。 */
export const GuideSection = ({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
}) => (
  <section aria-label={title}>
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-[12px] font-semibold text-ink-2">{title}</h3>
      {meta ? <span className="text-[11px] text-ink-3">{meta}</span> : null}
    </div>
    {children}
  </section>
);
