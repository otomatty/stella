import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play } from "@/lib/icons";
import { formatDuration, type Tutorial, tutorialById, useTutorials } from "@/lib/tutorials";

export function TutorialPlayer({ tutorial }: { tutorial: Tutorial }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [rate, setRate] = useState(1);
  const current = [...tutorial.chapters].reverse().find((c) => c.t <= time);
  return (
    <div className="my-3 space-y-3 rounded-xl border border-border bg-card p-3">
      <video
        ref={ref}
        src={tutorial.video}
        poster={tutorial.poster}
        controls
        playsInline
        preload="metadata"
        aria-label={tutorial.title}
        className="aspect-video w-full rounded-lg bg-black"
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
      >
        {/* 字幕は動画に焼き込み済みのため、二重表示を避けてトラックは利用者が必要に応じてオンにする。 */}
        <track kind="captions" srcLang="ja" label="日本語" src={tutorial.captions} />
      </video>
      {tutorial.narration === false && (
        <p className="text-xs text-ink-3">音声なし (字幕で説明します)</p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-2">
        <span>再生速度</span>
        {[0.75, 1, 1.25, 1.5].map((value) => (
          <Button
            key={value}
            size="sm"
            variant="ghost"
            aria-pressed={rate === value}
            onClick={() => {
              setRate(value);
              if (ref.current) ref.current.playbackRate = value;
            }}
          >
            {value}×
          </Button>
        ))}
      </div>
      {tutorial.chapters.length > 0 && (
        <ol aria-label="ステップ" className="space-y-1">
          {tutorial.chapters.map((chapter, index) => (
            <li key={`${chapter.t}-${chapter.title}`}>
              <Button
                size="sm"
                variant="ghost"
                className="w-full justify-start"
                aria-current={current === chapter ? "step" : undefined}
                onClick={() => {
                  if (!ref.current) return;
                  ref.current.currentTime = chapter.t;
                  void ref.current.play().catch(() => {
                    // 再生が拒否された場合は標準の再生ボタンから再開できる。
                  });
                }}
              >
                <Play size={12} />
                {index + 1}. {chapter.title}
                <span className="ml-auto text-ink-3">{formatDuration(chapter.t)}</span>
              </Button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function TutorialEmbed({ id }: { id: string }) {
  const list = useTutorials();
  const tutorial = tutorialById(id, list);
  return tutorial ? (
    <TutorialPlayer key={tutorial.id} tutorial={tutorial} />
  ) : (
    <p className="my-3 text-sm text-ink-3">動画は準備中です</p>
  );
}
