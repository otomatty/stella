import { OverviewTutorialButton } from "@/components/tutorials/TutorialCard";
/**
 * ホームのガイドの「次にやること」と「そのあと」(手順の並びは `@/lib/home-guide`)。
 *
 * 先頭の 1 つだけを大きなカードにして、押すべきボタンを 1 つに絞る (`NextStepCard`)。
 * 強調 (accent) は、このカードの主ボタンにしか使わない。残りの手順は小さな行で続ける
 * (`LaterSteps`)。
 *
 * 星を選ぶ手順 (`choose`) は特定の星を名指ししない。カードは「ツリーから選ぶ」案内だけで
 * 主ボタンを持たず、始められるステージを Basic と Extra に分けて同列に並べる (始めるのは
 * ツリーの星のカードから)。行の名前とコンパスは後ろの盤面をその星へ寄せる — ガイドが
 * 「何を」、ツリーが「どこか」を受け持つ。
 */

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { GuideStep, HomeGuide } from "@/lib/home-guide";
import type { StageWrapup } from "@/lib/stage-wrapup";
import { Book, Check, Clock, Compass, Play, RotateCcw, Sparkles } from "@/lib/icons";
import type { SkillMapStageNode } from "@/lib/skill-map-api";
import type { TodayPlanItemKind } from "@/lib/today-plan";
import { cn } from "@/lib/utils";

/** 進行中のステージ (レッスンの続き・仕上げの文面に使う)。 */
export interface GuideActiveStage {
  id: string;
  title: string;
  progress: number;
  lessonsCount: number;
  /** レッスンを終えたあとに残っている課題 (無い・未取得なら null)。 */
  wrapup?: StageWrapup | null;
}

export interface GuideHandlers {
  onStartStage: (stageId: string) => void;
  onStartReview: () => void;
  onResumeLesson: () => void;
  onOpenMiss: () => void;
  /** 進行中のステージの詳細 (レッスン一覧) を開く。 */
  onOpenActiveStage: () => void;
  /** 仕上げで残っている課題に取り組む (パソコンは VS Code で開く)。 */
  onOpenPendingTask: () => void;
  /** 横のツリーをその星へ寄せる。 */
  onShowInTree: (stageId: string) => void;
}

interface StepContext extends GuideHandlers {
  activeStage: GuideActiveStage | null;
  onStartGuidedStage: (stageId: string) => void;
  startingGuidedStage: boolean;
  guidedStartError: { stageId: string; message: string } | null;
  /** 一覧の星の名前・カテゴリの引き当て。 */
  nodeOf: (stageId: string) => SkillMapStageNode | undefined;
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

function guidedStartCopy(step: Extract<GuideStep, { kind: "start-guided" }>, ctx: StepContext) {
  const { stage_id: stageId, title } = step.stage;
  return {
    title: `『${title}』を始めましょう`,
    action: ctx.startingGuidedStage ? "開始しています…" : "始める",
    onClick: () => ctx.onStartGuidedStage(stageId),
    error: ctx.guidedStartError?.stageId === stageId ? ctx.guidedStartError.message : null,
  };
}

const GuidedStartError = ({ message }: { message: string | null }) =>
  message ? (
    <p role="alert" className="basis-full text-xs text-danger">
      {message}
    </p>
  ) : null;

/**
 * 仕上げの文面。レッスンを持たない星 (準備中) と、レッスンを終えた星を言い分ける。
 * 課題が残っていれば名指しし、受講者の番なら主ボタンを「課題を開く」にする
 * (レッスンの 100% はクリアではない — 課題のレビューの合格も要る)。
 */
function wrapupCopy(stage: GuideActiveStage | null): {
  title: string;
  reason: string;
  openTask: boolean;
} {
  const title = stage?.title ?? "進行中のステージ";
  if (stage && stage.lessonsCount === 0) {
    return {
      title: `${title} は教材の準備中です`,
      reason: "公開されるまで、ほかのスキルを進められます。",
      openTask: false,
    };
  }
  if (stage?.wrapup) {
    return {
      title: `${title} の仕上げ`,
      reason: `教材はすべて終わりました。${stage.wrapup.detail}`,
      openTask: stage.wrapup.learnerTurn,
    };
  }
  return {
    title: `${title} の仕上げ`,
    reason: "教材はすべて終わりました。課題の提出とレビューの結果を確かめましょう。",
    openTask: false,
  };
}

interface NextStepCardProps extends StepContext {
  guide: HomeGuide;
  /** マップを読み終えるまでは骨組みだけを出す (空の案内が一瞬出る瞬きを避ける)。 */
  loading: boolean;
}

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
              ステージ一覧で鍵の付いたステージの「腕試し」に合格すると、先のスキルを開けます。
            </p>
          </>
        )}
      </HeroFrame>
    );
  }

  return <HeroStep step={step} ctx={ctx} />;
};

const HeroStep = ({ step, ctx }: { step: GuideStep; ctx: StepContext }) => {
  if (step.kind === "setup-vscode") return <SetupVscode />;
  if (step.kind === "start-guided") {
    const copy = guidedStartCopy(step, ctx);
    return (
      <HeroFrame eyebrow="次にやること">
        <h2 className="flex items-start gap-2 text-[17px] font-semibold leading-snug tracking-tight">
          <Play size={16} className="mt-1 shrink-0 text-brand" />
          <span className="min-w-0">{copy.title}</span>
        </h2>
        <Button
          size="full"
          variant="accent"
          className="mt-4"
          disabled={ctx.startingGuidedStage}
          onClick={copy.onClick}
        >
          <Play size={14} />
          {copy.action}
        </Button>
        <GuidedStartError message={copy.error} />
      </HeroFrame>
    );
  }
  if (step.kind === "first-stage") {
    const title = ctx.nodeOf(step.stageId)?.title ?? "最初のステージ";
    return (
      <HeroFrame eyebrow="はじめの一歩">
        <h2 className="flex items-start gap-2 text-[17px] font-semibold leading-snug tracking-tight">
          <Compass size={16} className="mt-1 shrink-0 text-brand" />
          <span className="min-w-0">『{title}』から始めましょう</span>
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
          最初のステージでは、STELLA での学び方と、VS Code で課題を出すまでを順に進めます。
        </p>
        <p className="mt-3 text-[12px] leading-relaxed text-ink-3">
          ひとつ終えると、ステージ一覧で先のステージが少しずつ見えてきます。
        </p>
        <Button
          size="full"
          variant="accent"
          className="mt-4"
          data-testid="guide-start-stage"
          onClick={() => ctx.onStartStage(step.stageId)}
        >
          <Play size={14} />
          最初のステージを始める
        </Button>
        <OverviewTutorialButton />
        <Button
          size="sm"
          variant="ghost"
          className="mt-1.5 self-center"
          onClick={() => ctx.onShowInTree(step.stageId)}
        >
          <Compass size={12} />
          ステージ一覧で見る
        </Button>
      </HeroFrame>
    );
  }

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
            title="ステージ一覧で見る"
          >
            <Compass size={11} className="shrink-0" />
            <span className="truncate">{lesson.title}</span>
          </button>
        ) : null}
        <h2 className="flex items-start gap-2 text-[17px] font-semibold leading-snug tracking-tight">
          <Icon size={16} className="mt-1 shrink-0 text-brand" />
          <span className="min-w-0">{item.title}</span>
        </h2>
        {lesson ? (
          <div className="mt-3 flex items-center gap-2">
            <Progress value={lesson.progress} tone="brand" className="flex-1" />
            <span className="text-[11px] tabular-nums text-ink-3">{lesson.progress}%</span>
          </div>
        ) : null}
        <Button
          data-testid={`guide-${item.kind}`}
          size="full"
          variant="accent"
          className="mt-4"
          onClick={planAction(item.kind, ctx)}
        >
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
            教材の一覧
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
        {copy.openTask ? (
          <>
            <Button size="full" variant="accent" className="mt-4" onClick={ctx.onOpenPendingTask}>
              <Play size={14} />
              課題に取り組む
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="mt-1.5 self-center"
              onClick={ctx.onOpenActiveStage}
            >
              <Book size={12} />
              教材の一覧
            </Button>
          </>
        ) : (
          <Button size="full" variant="accent" className="mt-4" onClick={ctx.onOpenActiveStage}>
            <Book size={14} />
            教材の一覧を開く
          </Button>
        )}
      </HeroFrame>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <HeroFrame eyebrow={step.welcome ? "はじめの一歩" : "次にやること"}>
        <h2 className="flex items-start gap-2 text-[17px] font-semibold leading-snug tracking-tight">
          <Compass size={16} className="mt-1 shrink-0 text-brand" />
          <span className="min-w-0">
            {step.welcome
              ? "ステージ一覧から最初のステージを選びましょう"
              : "ステージ一覧から次のステージを選びましょう"}
          </span>
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
          ステージにマウスを載せる (スマホ・タブレットではタップする)
          と、内容と始めるボタンが出ます。
        </p>
        {step.welcome ? (
          <>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-3">
              ひとつ終えると、ステージ一覧で先のステージが少しずつ見えてきます。
            </p>
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
              すでに知っている内容なら、ステージ一覧のステージから「腕試し」を受け、合格すると先のスキルから始められます。
            </p>
          </>
        ) : null}
      </HeroFrame>
      <StartableStages stageIds={step.stageIds} ctx={ctx} />
    </div>
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
    data-testid="guide-primary"
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

/** 始められるステージの一覧。Basic と Extra に分けて同列に並べ、行からは始めない。 */
const StartableStages = ({ stageIds, ctx }: { stageIds: string[]; ctx: StepContext }) => {
  const basic = stageIds.filter((id) => ctx.nodeOf(id)?.audience !== "granted");
  const extra = stageIds.filter((id) => ctx.nodeOf(id)?.audience === "granted");
  return (
    <GuideSection title="始められるステージ" meta={`${stageIds.length} 件`}>
      <div className="flex flex-col gap-3">
        <StageGroup label="Basic" stageIds={basic} ctx={ctx} />
        <StageGroup
          label="Extra"
          note="管理者があなたに追加したステージです。"
          stageIds={extra}
          ctx={ctx}
        />
      </div>
    </GuideSection>
  );
};

const StageGroup = ({
  label,
  note,
  stageIds,
  ctx,
}: {
  label: string;
  note?: string;
  stageIds: string[];
  ctx: StepContext;
}) => {
  if (stageIds.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold text-ink-3">{label}</p>
      {note ? <p className="mt-0.5 text-[11px] leading-relaxed text-ink-3">{note}</p> : null}
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {stageIds.map((id) => (
          <StartableStageRow key={id} id={id} ctx={ctx} />
        ))}
      </ul>
    </div>
  );
};

/** 1 行。ステージ名とコンパスはツリーへ寄るだけで、ここでは始めない。 */
const StartableStageRow = ({ id, ctx }: { id: string; ctx: StepContext }) => {
  const node = ctx.nodeOf(id);
  const title = node?.title ?? "このスキル";
  return (
    <li className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => ctx.onShowInTree(id)}
          className="text-left text-[13px] font-semibold leading-snug hover:underline"
        >
          {title}
        </button>
        {node?.category ? <div className="text-[11px] text-ink-3">{node.category}</div> : null}
      </div>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={`${title} をステージ一覧で見る`}
        title="ステージ一覧で見る"
        onClick={() => ctx.onShowInTree(id)}
      >
        <Compass size={13} />
      </Button>
    </li>
  );
};

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

const SetupVscode = () => (
  <div className="rounded-lg border border-border p-3 text-sm">
    <p className="font-semibold">VS Code の準備がまだです</p>
    <p className="my-2 text-xs text-ink-3">
      課題は VS Code で取り組みます。ログイン前にも読める案内で、VS Code と STELLA
      拡張を準備してください。
    </p>
    <a href="/start" className="text-brand underline">
      準備の案内を開く
    </a>
  </div>
);

const LaterStep = ({ step, ctx }: { step: GuideStep; ctx: StepContext }) => {
  if (step.kind === "setup-vscode") return <SetupVscode />;
  if (step.kind === "choose") {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border-strong text-ink-3">
          <Compass size={12} />
        </span>
        <span className="min-w-0 flex-1 text-[12.5px] font-medium leading-snug">
          次に始めるステージをステージ一覧から選ぶ
        </span>
      </div>
    );
  }
  if (step.kind === "first-stage") return <HeroStep step={step} ctx={ctx} />;
  const guided = step.kind === "start-guided" ? guidedStartCopy(step, ctx) : null;
  const row = guided
    ? { ...guided, icon: Play, meta: "" }
    : step.kind === "plan"
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
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-border px-3 py-2",
        guided?.error && "flex-wrap",
      )}
    >
      <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border-strong text-ink-3">
        <Icon size={12} />
      </span>
      <span className="min-w-0 flex-1 text-[12.5px] font-medium leading-snug">{row.title}</span>
      {row.meta ? (
        <span className="shrink-0 text-[11px] tabular-nums text-ink-3">{row.meta}</span>
      ) : null}
      <Button
        data-testid={step.kind === "plan" ? `guide-${step.item.kind}` : undefined}
        size="sm"
        variant="default"
        className="shrink-0"
        disabled={step.kind === "start-guided" && ctx.startingGuidedStage}
        onClick={row.onClick}
      >
        {row.action}
      </Button>
      <GuidedStartError message={guided?.error ?? null} />
    </div>
  );
};

/** ガイドの小見出し付きの区画 (そのあと / 発見教材)。 */
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
