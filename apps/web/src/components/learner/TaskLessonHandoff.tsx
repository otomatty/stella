import { useIsHandheld } from "@/hooks/useIsHandheld";
import { type ProblemLesson, problemLockReason } from "@/lib/problem-lesson";
import { cn } from "@/lib/utils";
import { OpenInVscodeButton } from "./OpenInVscodeButton";

/**
 * format 2 の課題文レッスンから、課題を VS Code の学習フォルダーへ配る。
 * レッスンと課題の対応は seed が `tasks.lesson_id` に入れ、課題一覧 API が返す。
 * ボタンは接続コード付きの task URI を開くので、拡張が未接続でも 1 クリックで
 * 接続 → 課題の準備 → 課題文の表示まで進む。課題文でないレッスンでは何も出さない。
 */
export function TaskLessonHandoff({
  taskId,
  problemId,
}: {
  taskId: string | null;
  problemId?: string;
}) {
  const handheld = useIsHandheld();
  if (!taskId) return null;
  return (
    <div
      data-testid="lesson-task-handoff"
      className="mb-5 rounded-lg border border-border p-4 flex flex-wrap items-center gap-3"
    >
      <p className="flex-1 min-w-48 text-[13px] text-ink-2">
        {handheld
          ? "この課題はパソコンの VS Code で進めます。パソコンでこのページを開き、「VS Code で開く」を押してください。"
          : "この課題はパソコンの VS Code で進めます。ボタンを押すと VS Code が起動し、学習フォルダーに課題を準備して課題文を開きます。拡張機能が入っていなければ、VS Code がインストールを尋ねます。準備先に自分のファイルがあるときは上書きしません。"}
      </p>
      <OpenInVscodeButton taskId={taskId} problemId={problemId} />
    </div>
  );
}

/** 問題本文の下に、いま取れる操作と課題の提出状況をまとめる。 */
export function ProblemLessonHandoff({ taskId, problem, problems }: ProblemLesson) {
  const lockReason = problemLockReason(problem);
  const submitted = problem.state === "submitted";
  const index = problems?.findIndex(({ id }) => id === problem.id) ?? -1;
  const submittedCount = problems?.filter(({ state }) => state === "submitted").length ?? 0;
  const remaining = (problems?.length ?? 0) - submittedCount;
  return (
    <div
      data-testid="lesson-problem-handoff"
      className="mt-8 rounded-lg border border-border bg-card p-4"
    >
      {lockReason ? (
        <div className="text-[13px] text-ink-2">{lockReason}</div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-48 flex-1">
              <div className="text-[13px] font-semibold">
                {submitted ? "提出しました" : "VS Code で解いて提出します"}
              </div>
              <div className="mt-1 text-[12px] text-ink-2">
                {submitted
                  ? "手元のテストが通った答えを記録しています"
                  : "確認が通ると、拡張機能の「提出する」から送れます"}
              </div>
            </div>
            <OpenInVscodeButton
              taskId={taskId}
              problemId={problem.id}
              variant={submitted ? "outline" : "accent"}
              label={submitted ? "VS Code で見直す" : undefined}
            />
          </div>
          {problems && index >= 0 ? (
            <div className="mt-4">
              <div className="flex gap-1" aria-hidden="true">
                {problems.map((step) => (
                  <span
                    key={step.id}
                    className={cn(
                      "h-[5px] flex-1 rounded-full",
                      step.state === "submitted"
                        ? "bg-success"
                        : step.id === problem.id
                          ? "bg-brand"
                          : "bg-muted",
                    )}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between gap-2 text-[12px] text-ink-2">
                <span>
                  この課題の問題 {index + 1} / {problems.length}
                </span>
                <span className="text-right">
                  {submitted
                    ? remaining === 0
                      ? "全問を提出しました"
                      : `あと ${remaining} 問で課題を提出し終えます`
                    : `${submittedCount} 問提出済み`}
                </span>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
