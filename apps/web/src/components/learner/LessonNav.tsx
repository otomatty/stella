/**
 * レッスン画面の移動導線。
 *
 * - `LessonNavFooter`: レッスンの種類を問わず本文の末尾に常設する前後ナビ。
 *   完了していなくても移動できる (順序の強制は locked が担う)。
 * - `LessonCompleteCallout`: **完了した瞬間だけ** 出す「次のレッスンへ」の CTA。
 *   開いた時点で既に完了済みのレッスンには出さない (読み返しのたびに祝われないように)。
 *   セクションの区切り / ステージの最後では文面と行き先を切り替える。
 */

import { Check, ChevronLeft, ChevronRight, GraduationCap, Sparkles, X } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import type { LessonNavNode, LessonNeighbors } from "@/lib/lesson-navigation";
import { cn } from "@/lib/utils";
import { LessonTypeIcon, lessonTypeLabel } from "./StageDetail";

interface NavProps {
  neighbors: LessonNeighbors;
  onSelectLesson: (lessonId: string) => void;
  onBackToStage: () => void;
}

/** 前後どちらかのレッスンへ飛ぶカード。 */
const NavCard = ({
  node,
  direction,
  onSelect,
}: {
  node: LessonNavNode;
  direction: "prev" | "next";
  onSelect: (lessonId: string) => void;
}) => {
  const isNext = direction === "next";
  return (
    <button
      type="button"
      onClick={() => onSelect(node.lesson.id)}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg border bg-card px-3.5 py-2.5 text-left transition-colors",
        "hover:bg-sunken hover:border-border-strong",
        isNext ? "border-border-2" : "border-border",
      )}
    >
      {isNext ? null : <ChevronLeft size={15} className="shrink-0 text-ink-3" />}
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] text-ink-3">
          {isNext ? "次のレッスン" : "前のレッスン"}
        </span>
        <span className="block truncate text-[13px] font-semibold">{node.lesson.title}</span>
        <span className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-3">
          <LessonTypeIcon type={node.lesson.type} size={10} />
          <span>{lessonTypeLabel[node.lesson.type]}</span>
          {node.lesson.duration ? <span>· {node.lesson.duration}</span> : null}
        </span>
      </span>
      {isNext ? <ChevronRight size={15} className="shrink-0 text-ink-3" /> : null}
    </button>
  );
};

/** 前後に移動先が無いときの枠 (ボタンを消すとレイアウトが片寄るので枠は残す)。 */
const NavEdge = ({ label, action }: { label: string; action?: React.ReactNode }) => (
  <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-border px-3.5 py-2.5 text-[12px] text-ink-3">
    <span className="min-w-0 flex-1">{label}</span>
    {action}
  </div>
);

/** 本文末尾に常設する前後ナビ。 */
export const LessonNavFooter = ({ neighbors, onSelectLesson, onBackToStage }: NavProps) => {
  const { current, prev, next, total } = neighbors;
  return (
    <nav aria-label="レッスンの移動" className="mt-8 border-t border-border pt-5">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {prev ? (
          <NavCard node={prev} direction="prev" onSelect={onSelectLesson} />
        ) : (
          <NavEdge label="最初のレッスンです" />
        )}
        {next ? (
          <NavCard node={next} direction="next" onSelect={onSelectLesson} />
        ) : (
          <NavEdge
            label="最後のレッスンです"
            action={
              <Button size="sm" variant="outline" onClick={onBackToStage}>
                ステージ詳細へ
              </Button>
            }
          />
        )}
      </div>
      {current ? (
        <p className="mt-3 text-center text-[11.5px] text-ink-3">
          <span className="font-display font-bold text-ink-2">{current.position}</span> / {total}{" "}
          レッスン
        </p>
      ) : null}
    </nav>
  );
};

/** 完了直後の CTA。 セクションの区切り / ステージの最後で文面と行き先を変える。 */
export const LessonCompleteCallout = ({
  neighbors,
  onSelectLesson,
  onBackToStage,
  onDismiss,
}: NavProps & { onDismiss: () => void }) => {
  const { current, next, nextStartsNewSection, currentSectionComplete, stageComplete } = neighbors;

  // 節目として祝うのは実際に全部終わったときだけ。 「先に解禁レッスンが無い」 =
  // ステージ完了 ではない (前後ナビは未完了でも移動できるので、 途中を飛ばして
  // 末尾だけ終えることがある)。 セクションの区切りも同様に実完了で判定する。
  const milestone = stageComplete
    ? "stage"
    : nextStartsNewSection && currentSectionComplete
      ? "section"
      : null;

  const Icon = milestone === "stage" ? GraduationCap : milestone === "section" ? Sparkles : Check;
  const title =
    milestone === "stage"
      ? "ステージのレッスンをすべて完了しました"
      : milestone === "section" && current
        ? `セクション「${current.section.title}」を完了しました`
        : "レッスンを完了しました";
  const description = next
    ? nextStartsNewSection
      ? `次はセクション「${next.section.title}」の「${next.lesson.title}」です。`
      : `次は「${next.lesson.title}」です。`
    : stageComplete
      ? "お疲れさまでした。 修了の状況はステージ詳細から確認できます。"
      : "これがステージの最後のレッスンです。 未完了のレッスンが残っています。";

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
          {next ? (
            <Button variant="accent" onClick={() => onSelectLesson(next.lesson.id)}>
              次のレッスンへ
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
