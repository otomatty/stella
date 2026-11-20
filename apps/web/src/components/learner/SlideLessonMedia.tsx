import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { type VideoCommentControls, VideoViewer } from "./VideoViewer";

/** 字幕・ポスターは動画と同じキーの拡張子違い。 */
export function SlideLessonMedia({
  lessonId,
  videoPath,
  onComplete,
  showSlidesToggle = false,
  nextLessonTitle,
  nextLessonMeta,
  onAdvanceNext,
  children,
  ...videoControls
}: VideoCommentControls & {
  lessonId: string;
  videoPath?: string | null;
  onComplete?: () => void;
  showSlidesToggle?: boolean;
  nextLessonTitle?: string | null;
  nextLessonMeta?: string | null;
  onAdvanceNext?: () => void;
  children?: ReactNode;
}) {
  const [mode, setMode] = useState("video");
  if (!videoPath) return children;
  return (
    <>
      {showSlidesToggle ? (
        <fieldset aria-label="教材の表示" className="mb-3 flex gap-2">
          {(
            [
              ["video", "動画"],
              ["slides", "スライド"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              variant={mode === value ? "accent" : "outline"}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {label}
            </Button>
          ))}
        </fieldset>
      ) : null}
      {!showSlidesToggle || mode === "video" ? (
        <VideoViewer
          {...videoControls}
          lessonId={lessonId}
          videoPath={videoPath}
          captionsPath={videoPath.replace(/\.mp4$/, ".vtt")}
          posterPath={videoPath.replace(/\.mp4$/, ".jpg")}
          recordProgress={false}
          onComplete={onComplete}
          nextLessonTitle={nextLessonTitle}
          nextLessonMeta={nextLessonMeta}
          onAdvanceNext={onAdvanceNext}
        />
      ) : (
        children
      )}
    </>
  );
}
