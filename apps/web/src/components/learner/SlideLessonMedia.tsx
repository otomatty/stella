import { useCallback, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { type VideoCommentControls, VideoViewer, type VideoViewerHandle } from "./VideoViewer";

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
  ref,
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
  const player = useRef<VideoViewerHandle | null>(null);
  const pendingSeek = useRef<{ lessonId: string; sec: number } | null>(null);
  const attachPlayer = useCallback(
    (handle: VideoViewerHandle | null) => {
      player.current = handle;
      const pending = pendingSeek.current;
      if (handle && pending) {
        pendingSeek.current = null;
        if (pending.lessonId === lessonId) handle.seekTo(pending.sec);
      }
    },
    [lessonId],
  );
  useImperativeHandle(
    ref,
    () => ({
      seekTo(sec) {
        if (player.current) player.current.seekTo(sec);
        else if (videoPath && Number.isFinite(sec)) {
          pendingSeek.current = { lessonId, sec };
          setMode("video");
        }
      },
      getPlaybackState: () => player.current?.getPlaybackState() ?? null,
      pause: () => player.current?.pause(),
      play: () => player.current?.play(),
    }),
    [lessonId, videoPath],
  );
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
          key={lessonId}
          ref={attachPlayer}
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
