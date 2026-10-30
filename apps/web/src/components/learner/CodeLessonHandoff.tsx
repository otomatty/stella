import { DISPLAY_NAME } from "@stella/shared/brand/display";
import { useIsHandheld } from "@/hooks/useIsHandheld";
import { OpenInVscodeButton } from "./OpenInVscodeButton";

export function CodeLessonHandoff({
  stageId,
  lessonId,
  assignmentTitle,
}: {
  stageId: string;
  lessonId: string;
  assignmentTitle?: string;
}) {
  // パソコンで進める案内は画面幅ではなく端末で出し分ける (`lib/device.ts`)。
  const handheld = useIsHandheld();
  return (
    <div className="px-4 sm:px-10 py-6 max-w-[880px] mx-auto w-full">
      {handheld ? (
        <p className="text-[13.5px] text-ink-2">
          この演習はパソコンの VS Code で進めます。パソコンでこのページを開き、「VS Code
          で開く」を押してください。
        </p>
      ) : null}

      {assignmentTitle ? (
        <h1 className="max-md:hidden text-[22px] tracking-tight font-semibold">
          {assignmentTitle}
        </h1>
      ) : null}

      <div className="mt-4">
        <OpenInVscodeButton stageId={stageId} lessonId={lessonId} />
      </div>

      {handheld ? null : (
        <p className="text-[13px] text-ink-3 mt-4">
          拡張 {DISPLAY_NAME} を入れた VS Code で演習を進めます。ボタンを押すと VS Code
          が起動し、未接続なら接続も同時に済ませてこのレッスンを開きます。拡張をまだ入れていない場合は先にインストールしてください。
        </p>
      )}
    </div>
  );
}
