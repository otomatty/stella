import { Link } from "@tanstack/react-router";
import type { TaskProblemItem, TaskSummary } from "@stella/shared/tasks/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Lesson } from "@/data/types";
import { Check, ChevronRight, Circle, Clock, Lock, Video } from "@/lib/icons";
import {
  isTaskPassed,
  type ProblemTask,
  problemCellState,
  splitProblems,
  submittedProblemCount,
  taskNextAction,
  taskOverviewStatusLabel,
} from "@/lib/task-overview";
import { cn } from "@/lib/utils";
import { LessonMarkdown } from "./MarkdownSlides";
import { OpenInVscodeButton } from "./OpenInVscodeButton";
import { TaskReferences } from "./TaskReferences";

const lessonRoute = "/stages/$stageId/lessons/$lessonId";
const heading = "text-[22px] font-black leading-tight";

const cellStyles = {
  submitted: { label: "提出済み", className: "border-success bg-success-soft text-success" },
  current: { label: "いまの問題", className: "border-brand bg-brand-soft text-brand-ink" },
  remaining: { label: "まだ", className: "border-border bg-muted" },
  locked: { label: "未解放", className: "border-dashed border-ink-3 bg-sunken" },
};

function TaskProblemProgress({
  problems,
  currentId,
}: {
  problems: readonly TaskProblemItem[];
  currentId?: string;
}) {
  const { drills, applied } = splitProblems(problems);
  const submitted = submittedProblemCount(problems);
  return (
    <section aria-label="進み具合" className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
        <span>
          提出{" "}
          <strong className="tabular-nums">
            {submitted} / {problems.length}
          </strong>{" "}
          問
        </span>
      </div>
      <ul
        aria-label={`${problems.length} 問中 ${submitted} 問を提出済み`}
        className="flex gap-1 overflow-x-auto pb-1"
      >
        {[...drills, ...applied].map((problem, index) => {
          const state = problemCellState(problem, currentId);
          const { label, className } = cellStyles[state];
          const accessibleLabel = `${problem.label} ${problem.title}、${label}`;
          return (
            <li
              key={problem.id}
              aria-label={accessibleLabel}
              title={accessibleLabel}
              className={cn(
                "flex h-3.5 min-w-2 flex-1 items-center justify-center rounded-sm border",
                className,
                drills.length > 0 && index === drills.length && "ml-2",
              )}
            >
              {state === "submitted" ? <Check size={10} aria-hidden="true" /> : null}
              {state === "current" ? (
                <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ProblemRow({ problem, stageId }: { problem: TaskProblemItem; stageId: string }) {
  const submitted = problem.state === "submitted";
  const open = problem.state === "open";
  const Icon = submitted ? Check : open ? Circle : Lock;
  const status = {
    submitted: problem.manual ? "引き継ぎ" : "提出済み",
    open: "解ける",
    "locked-video": problem.afterTitle ? `「${problem.afterTitle}」のあと` : "動画のあと",
    "locked-previous": "前の問題のあと",
  }[problem.state];
  const classes = "flex min-h-11 items-start gap-2.5 px-3.5 py-2.5 text-sm sm:px-4";
  const content = (
    <>
      <Icon
        size={15}
        aria-hidden="true"
        className={cn(
          "mt-0.5 shrink-0 text-ink-3",
          submitted && "text-success",
          open && "text-brand-ink",
        )}
      />
      <span className="w-8 shrink-0 text-xs leading-5 text-ink-2">{problem.label}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-x-4 gap-y-0.5 sm:flex-row">
        <span className="min-w-0 flex-1 wrap-anywhere">{problem.title}</span>
        <span
          className={cn(
            "text-xs leading-5 sm:max-w-[45%] sm:text-right",
            submitted ? "text-success" : "text-ink-2",
          )}
        >
          {status}
        </span>
      </span>
    </>
  );
  return (
    <li>
      {problem.stepLessonId && (submitted || open) ? (
        <Link
          to={lessonRoute}
          params={{ stageId, lessonId: problem.stepLessonId }}
          className={cn(
            classes,
            "hover:bg-sunken focus-visible:outline-ring focus-visible:-outline-offset-2",
          )}
        >
          {content}
          <ChevronRight size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-3" />
        </Link>
      ) : (
        <div className={classes}>{content}</div>
      )}
    </li>
  );
}

export function TaskProblemsOverview({
  lesson,
  stageId,
  task,
  stageTasks,
}: {
  lesson: Lesson;
  stageId: string;
  task: ProblemTask;
  stageTasks: readonly TaskSummary[];
}) {
  const problems = task.problem_items;
  const { drills, applied } = splitProblems(problems);
  const action = taskNextAction(task, stageTasks);

  return (
    <div className="space-y-6">
      <header>
        <h1 className={heading}>{lesson.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink-2">
          <span>
            {problems.length} 問
            {applied.length ? `（ドリル ${drills.length} ・ 応用 ${applied.length}）` : ""}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={13} aria-hidden="true" /> 約 {task.estimatedMinutes} 分
          </span>
          <Badge variant={isTaskPassed(task) ? "success" : "default"}>
            {taskOverviewStatusLabel(task)}
          </Badge>
        </div>
      </header>

      <section aria-label="いまやること">
        <Card className="space-y-2.5 p-4 sm:p-5">
          <h2 className="text-xs font-bold text-ink-2">いまやること</h2>
          {action.kind === "problem" ? (
            <>
              <p className="text-base font-bold">
                {action.problem.label} {action.problem.title}
              </p>
              <OpenInVscodeButton taskId={task.id} problemId={action.problem.id} />
            </>
          ) : action.kind === "video" ? (
            <>
              <p className="flex items-start gap-2 text-base font-bold">
                <Video size={19} aria-hidden="true" className="mt-0.5 shrink-0 text-brand-ink" />
                動画「{action.title}」を見る
              </p>
              <p className="text-sm text-ink-2">
                見終えると、{action.problem.label}「{action.problem.title}」が解けるようになります。
              </p>
              <Button asChild variant="accent" className="min-h-11 sm:min-h-9">
                <Link to={lessonRoute} params={{ stageId, lessonId: action.lessonId }}>
                  動画を見る <ChevronRight size={14} aria-hidden="true" />
                </Link>
              </Button>
            </>
          ) : action.kind === "completed" ? (
            <>
              <p className="text-base font-bold">この課題の問題をすべて提出しました</p>
              <Button asChild variant="accent" className="min-h-11 sm:min-h-9">
                {action.nextLessonId ? (
                  <Link to={lessonRoute} params={{ stageId, lessonId: action.nextLessonId }}>
                    次の課題を開く
                  </Link>
                ) : (
                  <Link to="/stages/$stageId" params={{ stageId }}>
                    ステージに戻る
                  </Link>
                )}
              </Button>
            </>
          ) : (
            <p className="text-sm text-ink-2">
              {action.kind === "previous"
                ? "前の問題を提出すると、次の問題を解けるようになります。"
                : "問題を準備中です。"}
            </p>
          )}
        </Card>
      </section>

      <TaskProblemProgress
        problems={problems}
        currentId={action.kind === "problem" ? action.problem.id : undefined}
      />

      <section aria-label="問題の一覧">
        <Card>
          <h2 className="border-b border-border px-3.5 py-3 text-sm font-bold sm:px-4">
            問題の一覧
          </h2>
          <ul className="divide-y divide-border">
            {problems.map((problem) => (
              <ProblemRow key={problem.id} problem={problem} stageId={stageId} />
            ))}
          </ul>
        </Card>
      </section>

      <TaskReferences refs={task.refs} />
      {lesson.markdown?.trim() ? (
        <div data-testid="lesson-doc" className="prose-lms">
          <LessonMarkdown>{lesson.markdown}</LessonMarkdown>
        </div>
      ) : null}
    </div>
  );
}
