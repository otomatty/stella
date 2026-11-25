/**
 * 動画以外は本文末尾の次の教材を 1 枚で案内し、完了直後は同じ位置で完了を伝える。
 * 動画ではプレーヤーが次を案内するので、最後の教材を完了したときだけ独立した案内を出す。
 */

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Code,
  GraduationCap,
  Lock,
  Sparkles,
  X,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import type { LessonNavNode, LessonNeighbors } from "@/lib/lesson-navigation";
import { cn } from "@/lib/utils";
import { LessonTypeIcon, lessonTypeLabel } from "./StageDetail";

interface NavProps {
  neighbors: LessonNeighbors;
  onSelectLesson: (lessonId: string) => void;
  onBackToStage: () => void;
}

interface FooterProps extends NavProps {
  justCompleted: boolean;
  onDismissCompletion: () => void;
  problemLessonIds: ReadonlySet<string>;
}

function completionMessage(neighbors: LessonNeighbors, fallbackTitle: string) {
  const { current, nextStartsNewSection, currentSectionComplete, stageComplete } = neighbors;
  // 未完了の教材を飛ばして移動できるため、節目の表示は実際の完了状況で決める。
  const milestone = stageComplete
    ? "stage"
    : nextStartsNewSection && currentSectionComplete
      ? "section"
      : null;
  const Icon = milestone === "stage" ? GraduationCap : milestone === "section" ? Sparkles : Check;
  const title =
    milestone === "stage"
      ? "ステージの教材をすべて完了しました"
      : milestone === "section" && current
        ? `セクション「${current.section.title}」を完了しました`
        : fallbackTitle;
  return { milestone, Icon, title };
}

const lastLessonDescription = (stageComplete: boolean) =>
  stageComplete
    ? "お疲れさまでした。完了状況はステージ詳細で確認できます。"
    : "これがステージの最後の教材です。未完了の教材が残っています。";

/** 通常時も完了直後も、次に開く教材の種類と所要時間を同じ表記で案内する。 */
const NextLessonInfo = ({ node, isProblem }: { node: LessonNavNode; isProblem: boolean }) => (
  <>
    <span className="block truncate text-[13px] font-semibold">{node.lesson.title}</span>
    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-3">
      {isProblem ? (
        <Code size={10} aria-hidden="true" />
      ) : (
        <LessonTypeIcon type={node.lesson.type} size={10} />
      )}
      <span>{isProblem ? "問題" : lessonTypeLabel[node.lesson.type]}</span>
      {node.lesson.duration ? <span>· {node.lesson.duration}</span> : null}
    </span>
  </>
);

/** 完了直後は次の教材の枠で完了を伝え、主ボタンをひとつにまとめる。 */
const CompletedLessonNext = ({
  neighbors,
  onSelectLesson,
  onBackToStage,
  onDismissCompletion,
  problemLessonIds,
}: Omit<FooterProps, "justCompleted">) => {
  const {
    current,
    next,
    nextStartsNewSection,
    stageComplete,
    nextLocked,
    nextBlockedBy,
    nextLockReason,
  } = neighbors;
  const isProblem = current !== null && problemLessonIds.has(current.lesson.id);
  const { milestone, Icon, title } = completionMessage(
    neighbors,
    isProblem ? "提出しました。次はこちら" : "完了しました。次はこちら",
  );

  return (
    <output
      aria-live="polite"
      className={cn(
        "relative grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-lg border px-4 py-3.5 pr-12",
        "sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center",
        milestone ? "border-sf-magenta bg-sf-magenta-soft" : "border-success bg-success-soft",
      )}
    >
      <Icon
        size={18}
        aria-hidden="true"
        className={cn("mt-0.5 shrink-0 self-start", milestone ? "text-brand" : "text-success")}
      />
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold">{title}</span>
        {next ? (
          <span className="mt-2 block">
            {nextStartsNewSection ? (
              <span className="block text-[11px] text-ink-3">
                次はセクション「{next.section.title}」
              </span>
            ) : null}
            <NextLessonInfo node={next} isProblem={problemLessonIds.has(next.lesson.id)} />
            {nextLocked && nextLockReason ? (
              <span className="mt-1 block text-[12px] text-ink-2">{nextLockReason}</span>
            ) : null}
          </span>
        ) : (
          <span className="mt-1 block text-[12.5px] text-ink-2">
            {lastLessonDescription(stageComplete)}
          </span>
        )}
      </span>
      {next && !nextLocked ? (
        <Button
          type="button"
          variant="accent"
          className="col-start-2 justify-self-start sm:col-start-3"
          aria-label={`次へ進む: ${next.lesson.title}`}
          onClick={() => onSelectLesson(next.lesson.id)}
        >
          次へ進む
          <ChevronRight size={13} aria-hidden="true" />
        </Button>
      ) : nextBlockedBy ? (
        <Button
          type="button"
          variant="accent"
          className="col-start-2 justify-self-start sm:col-start-3"
          onClick={() => onSelectLesson(nextBlockedBy.lesson.id)}
        >
          「{nextBlockedBy.lesson.title}」へ
          <ChevronRight size={13} aria-hidden="true" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="accent"
          className="col-start-2 justify-self-start sm:col-start-3"
          onClick={onBackToStage}
        >
          ステージ詳細へ
          <ChevronRight size={13} aria-hidden="true" />
        </Button>
      )}
      <Button
        type="button"
        className="absolute top-2 right-2"
        variant="ghost"
        size="icon-sm"
        aria-label="閉じる"
        onClick={onDismissCompletion}
      >
        <X size={14} aria-hidden="true" />
      </Button>
    </output>
  );
};

/** 本文末尾では次への案内を広く取り、その下に前の教材と現在地を添える。 */
export const LessonNavFooter = ({
  neighbors,
  onSelectLesson,
  onBackToStage,
  justCompleted,
  onDismissCompletion,
  problemLessonIds,
}: FooterProps) => {
  const { current, prev, next, total } = neighbors;
  return (
    <nav aria-label="教材の移動" className="mt-8 border-t border-border pt-5">
      {justCompleted ? (
        <CompletedLessonNext
          neighbors={neighbors}
          onSelectLesson={onSelectLesson}
          onBackToStage={onBackToStage}
          onDismissCompletion={onDismissCompletion}
          problemLessonIds={problemLessonIds}
        />
      ) : next && neighbors.nextLocked ? (
        <div className="flex w-full items-center gap-2.5 rounded-lg border border-border-2 bg-card px-3.5 py-2.5">
          <Lock size={15} className="shrink-0 text-ink-3" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] text-ink-3">次の教材</span>
            <NextLessonInfo node={next} isProblem={problemLessonIds.has(next.lesson.id)} />
            {neighbors.nextLockReason ? (
              <span className="mt-1 block text-[12px] text-ink-2">{neighbors.nextLockReason}</span>
            ) : null}
          </span>
          {neighbors.nextBlockedBy ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onSelectLesson(neighbors.nextBlockedBy?.lesson.id ?? "")}
            >
              「{neighbors.nextBlockedBy.lesson.title}」へ
            </Button>
          ) : null}
        </div>
      ) : next ? (
        <button
          type="button"
          onClick={() => onSelectLesson(next.lesson.id)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg border border-border-2 bg-card px-3.5 py-2.5 text-left transition-colors",
            "hover:bg-sunken hover:border-border-strong",
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] text-ink-3">次の教材</span>
            <NextLessonInfo node={next} isProblem={problemLessonIds.has(next.lesson.id)} />
          </span>
          <ChevronRight size={15} className="shrink-0 text-ink-3" aria-hidden="true" />
        </button>
      ) : (
        <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-border px-3.5 py-2.5 text-[12px] text-ink-3">
          <span className="min-w-0 flex-1">最後の教材です</span>
          <Button type="button" size="sm" variant="outline" onClick={onBackToStage}>
            ステージ詳細へ
          </Button>
        </div>
      )}
      <div className="mt-3 flex items-center gap-2.5">
        {prev ? (
          <button
            type="button"
            aria-label={`前の教材: ${prev.lesson.title}`}
            onClick={() => onSelectLesson(prev.lesson.id)}
            className="flex min-w-0 items-center gap-1 text-left text-[12px] text-ink-3 hover:text-ink"
          >
            <ChevronLeft size={13} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{prev.lesson.title}</span>
          </button>
        ) : null}
        {current ? (
          <p className="ml-auto shrink-0 text-[11.5px] text-ink-3">
            <span className="font-display font-bold text-ink-2">{current.position}</span> / {total}{" "}
            教材
          </p>
        ) : null}
      </div>
    </nav>
  );
};

/** 動画の完了直後に出す案内。次の動画内導線が無いときにステージ詳細への移動を案内する。 */
export const LessonCompleteCallout = ({
  neighbors,
  onSelectLesson,
  onBackToStage,
  onDismiss,
}: NavProps & { onDismiss: () => void }) => {
  const { next, nextStartsNewSection, stageComplete, nextLocked, nextBlockedBy, nextLockReason } =
    neighbors;

  const { milestone, Icon, title } = completionMessage(neighbors, "教材を完了しました");
  const description = next
    ? nextLocked
      ? nextLockReason
        ? `次は「${next.lesson.title}」です。${nextLockReason}。`
        : `次は「${next.lesson.title}」です。`
      : nextStartsNewSection
        ? `次はセクション「${next.section.title}」の「${next.lesson.title}」です。`
        : `次は「${next.lesson.title}」です。`
    : lastLessonDescription(stageComplete);

  return (
    // <output> は暗黙で role="status"。 完了は非同期に確定するので読み上げも通す。
    <output
      aria-live="polite"
      className={cn(
        "mt-8 flex items-start gap-3 rounded-lg border px-4 py-3.5",
        milestone ? "border-sf-magenta bg-sf-magenta-soft" : "border-success bg-success-soft",
      )}
    >
      <Icon
        size={18}
        className={cn("mt-0.5 shrink-0", milestone ? "text-brand" : "text-success")}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold">{title}</div>
        <div className="mt-1 text-[12.5px] text-ink-2">{description}</div>
        <div className="mt-3">
          {next && !nextLocked ? (
            <Button variant="accent" onClick={() => onSelectLesson(next.lesson.id)}>
              次の教材へ
              <ChevronRight size={13} />
            </Button>
          ) : nextBlockedBy ? (
            <Button variant="accent" onClick={() => onSelectLesson(nextBlockedBy.lesson.id)}>
              「{nextBlockedBy.lesson.title}」へ
              <ChevronRight size={13} />
            </Button>
          ) : (
            <Button variant="accent" onClick={onBackToStage}>
              ステージ詳細へ
              <ChevronRight size={13} />
            </Button>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon-sm" aria-label="閉じる" onClick={onDismiss}>
        <X size={14} />
      </Button>
    </output>
  );
};
