import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { VideoViewer } from "./VideoViewer";

/** 字幕・ポスターは動画と同じキーの拡張子違い。切り替えの既定は動画。 */
export function SlideLessonMedia({
  lessonId,
  videoPath,
  children,
}: {
  lessonId: string;
  videoPath?: string | null;
  children?: ReactNode;
}) {
  const [mode, setMode] = useState("video");
  if (!videoPath) return children;
  return (
    <>
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
      {mode === "video" ? (
        <VideoViewer
          lessonId={lessonId}
          videoPath={videoPath}
          captionsPath={videoPath.replace(/\.mp4$/, ".vtt")}
          posterPath={videoPath.replace(/\.mp4$/, ".jpg")}
          recordProgress={false}
        />
      ) : (
        children
      )}
    </>
  );
}
