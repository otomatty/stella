import { OpenInVscodeButton } from './OpenInVscodeButton';

export function CodeLessonHandoff({
  courseId,
  lessonId,
  assignmentTitle,
}: {
  courseId: string;
  lessonId: string;
  assignmentTitle?: string;
}) {
  return (
    <div className="px-10 py-6 pb-12 max-w-[880px] mx-auto w-full">
      <p className="hidden max-md:block text-[13.5px] text-ink-2">
        この演習はパソコンの VS Code で進めてください
      </p>

      {assignmentTitle ? (
        <h1 className="max-md:hidden text-[22px] tracking-tight font-semibold">
          {assignmentTitle}
        </h1>
      ) : null}

      <div className="mt-4">
        <OpenInVscodeButton courseId={courseId} lessonId={lessonId} />
      </div>

      <p className="max-md:hidden text-[13px] text-ink-3 mt-4">
        拡張 FALCON INFORMAL を入れた VS Code で演習を進めます。まだ入れていない場合は、サイドバーの「VS Code」から{' '}
        <a href="/connect-vscode" className="text-brand underline underline-offset-2">
          接続ページ
        </a>
        を開いて拡張を接続してください。
      </p>
    </div>
  );
}
