import { useIsHandheld } from "@/hooks/useIsHandheld";
import { Check } from "@/lib/icons";
import { type ProblemLesson, problemLockReason } from "@/lib/problem-lesson";
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

export function ProblemLessonHandoff({ taskId, problem }: ProblemLesson) {
  const lockReason = problemLockReason(problem);
  return (
    <div
      data-testid="lesson-problem-handoff"
      className="flex flex-wrap items-center gap-3 pt-6 border-t border-border mt-8"
    >
      {lockReason ? (
        <p className="text-[13px] text-ink-2">{lockReason}</p>
      ) : (
        <>
          {problem.state === "submitted" ? (
            <span className="inline-flex items-center gap-1 text-success text-[12px]">
              <Check size={13} aria-hidden="true" />
              提出済み
            </span>
          ) : null}
          <OpenInVscodeButton taskId={taskId} problemId={problem.id} />
        </>
      )}
    </div>
  );
}
