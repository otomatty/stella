/**
 * HTML5 動画プレイヤーラッパ。
 *
 * - R2 上の mp4 を直接 src に渡し、動画の下に操作バーを表示
 * - 再生速度プリセット (0.75〜2.0x) を独自 UI で
 * - キーボードショートカット (Space / ←→ / J L / M / F)
 * - 動画レッスンは前回視聴位置 (`watchedSec`) から自動再開し、`timeupdate` を 250ms デバウンスして保存
 * - 動画レッスンは 90% 視聴で完了。受講者のスライド動画は 90% 視聴または再生終了で `onComplete()`
 * - 再生終了で「次のレッスンへ」オーバーレイ (既定は 5 秒で自動遷移 / 取り消し可)
 * - 読み込み失敗時のリトライ + ダウンロード fallback
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipForward,
  Captions,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Download,
  RefreshCw,
  AlertCircle,
  Check,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { isBackendConfigured } from "@/lib/backend";
import { getMaterialUrl } from "@/lib/storage";
import { useLessonProgress, useProgressReady } from "@/hooks/useLessonProgress";
import { flushNow } from "@/lib/lesson-progress";
import { useAutoplayNext } from "@/lib/autoplay-pref";
import { cn } from "@/lib/utils";
import { formatSeekValue, formatVideoTime, timeAtPointer } from "@/lib/video-player";

interface Props {
  lessonId: string;
  videoPath: string;
  totalSec?: number;
  captionsPath?: string;
  posterPath?: string;
  /** false なら再生位置を保存・復元せず、完了は onComplete が渡されたときだけ通知する。 */
  recordProgress?: boolean;
  onComplete?: () => void;
  /** 再生終了後に案内する次のレッスン名。 次が無いステージ末尾では null。 */
  nextLessonTitle?: string | null;
  /** 次の教材の種類と所要時間 (例: 知識問題 · 5分)。 */
  nextLessonMeta?: string | null;
  /** 次のレッスンへ進む。 未指定 (次が無い) ならオーバーレイを出さない。 */
  onAdvanceNext?: (() => void) | undefined;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
const SAVE_DEBOUNCE_MS = 250;
const COMPLETION_THRESHOLD = 0.9;
/** 再生終了から自動で次へ進むまでの秒数。 */
const AUTO_ADVANCE_SEC = 5;
const CONTROL_BUTTON =
  "inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-1 rounded hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white";

type FullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

function SeekBar({
  currentTime,
  duration,
  onSeek,
}: {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}) {
  const position = Math.min(currentTime, duration);
  const percent = duration > 0 ? (position / duration) * 100 : 0;

  const seekAtPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    onSeek(timeAtPointer(event.clientX, event.currentTarget.getBoundingClientRect(), duration));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    let time: number;
    switch (event.key) {
      case "ArrowLeft":
        time = position - 5;
        break;
      case "ArrowRight":
        time = position + 5;
        break;
      case "Home":
        time = 0;
        break;
      case "End":
        time = duration;
        break;
      default:
        return;
    }
    event.preventDefault();
    if (duration > 0) onSeek(Math.max(0, Math.min(duration, time)));
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="再生位置"
      aria-valuemin={0}
      aria-valuemax={Math.floor(duration)}
      aria-valuenow={Math.floor(position)}
      aria-valuetext={formatSeekValue(position, duration)}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary || duration <= 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        seekAtPointer(event);
      }}
      onPointerMove={(event) => {
        if (
          event.isPrimary &&
          duration > 0 &&
          event.currentTarget.hasPointerCapture(event.pointerId)
        ) {
          seekAtPointer(event);
        }
      }}
      className="flex h-6 w-full touch-none cursor-pointer select-none items-center rounded focus-visible:outline-2 focus-visible:outline-white"
    >
      <div className="pointer-events-none relative h-1 w-full rounded-full bg-white/35">
        <div className="h-full rounded-full bg-white" style={{ width: `${percent}%` }} />
        <div
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
          style={{ left: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function reachesVideoCompletion(currentTime: number, duration: number): boolean {
  return (
    Number.isFinite(duration) && duration > 0 && currentTime >= duration * COMPLETION_THRESHOLD
  );
}

export function VideoViewer({
  lessonId,
  videoPath,
  totalSec,
  captionsPath,
  posterPath,
  recordProgress = true,
  onComplete,
  nextLessonTitle = null,
  nextLessonMeta = null,
  onAdvanceNext,
}: Props) {
  const { entry, recordWatchTime, markComplete } = useLessonProgress(lessonId);
  const isCompleted = entry?.completed === true;
  // サーバ進捗の取り込みが決着するまで再開位置は確定しない。
  const ready = useProgressReady();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [captionsShowing, setCaptionsShowing] = useState(Boolean(captionsPath));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [completedDuringPlayback, setCompletedDuringPlayback] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [duration, setDuration] = useState<number>(totalSec ?? 0);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [autoAdvance, setAutoAdvance] = useAutoplayNext();
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  /** 自動遷移までの残り秒。 null なら自動遷移しない (ボタンのみ)。 */
  const [countdown, setCountdown] = useState<number | null>(null);
  const canAdvance = Boolean(onAdvanceNext);
  const seekDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const nextTitle = nextLessonTitle ?? "次の教材";

  const videoRef = useRef<FullscreenVideo | null>(null);
  // unmount 時は React が ref を外したあとも最後の再生位置を読めるようにする。
  const lastVideoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const attachVideo = useCallback((video: FullscreenVideo | null) => {
    if (!video) return;
    videoRef.current = video;
    lastVideoRef.current = video;

    const syncFullscreen = () => {
      const container = containerRef.current;
      setIsFullscreen(
        (container !== null && document.fullscreenElement === container) ||
          video.webkitDisplayingFullscreen === true,
      );
    };
    const syncCaptions = () => {
      setCaptionsShowing(video.textTracks[0]?.mode === "showing");
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    video.addEventListener("webkitbeginfullscreen", syncFullscreen);
    video.addEventListener("webkitendfullscreen", syncFullscreen);
    video.textTracks.addEventListener("change", syncCaptions);
    syncFullscreen();
    syncCaptions();
    return () => {
      videoRef.current = null;
      document.removeEventListener("fullscreenchange", syncFullscreen);
      video.removeEventListener("webkitbeginfullscreen", syncFullscreen);
      video.removeEventListener("webkitendfullscreen", syncFullscreen);
      video.textTracks.removeEventListener("change", syncCaptions);
    };
  }, []);
  const completedRef = useRef(isCompleted);
  const lastSaveRef = useRef<number>(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumedRef = useRef(false);

  const url = useMemo<string | null>(() => {
    if (!isBackendConfigured()) return null;
    try {
      return getMaterialUrl(videoPath);
    } catch {
      return null;
    }
  }, [videoPath]);

  // 前回視聴位置から再開する。 メタデータ読み込みとサーバ進捗の取り込みは
  // どちらが先に終わるか決まっていないので、 両方揃った時点で 1 度だけ実行する。
  const resumePlayback = useCallback(() => {
    const v = videoRef.current;
    if (!recordProgress || !v || resumedRef.current || !ready) return;
    if (!Number.isFinite(v.duration) || v.duration <= 0) return;
    resumedRef.current = true;
    const dur = v.duration;
    const resumeFrom = entry?.watchedSec ?? 0;
    const tooNearEnd = resumeFrom >= dur - 5;
    if (entry?.completed) {
      v.currentTime = 0;
    } else if (resumeFrom > 0 && !tooNearEnd) {
      try {
        v.currentTime = resumeFrom;
      } catch {
        // ignore (range request 失敗など)
      }
    }
  }, [entry, ready, recordProgress]);

  const onLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (Number.isFinite(v.duration) && v.duration > 0) setDuration(v.duration);
    v.playbackRate = speed;
    const track = v.textTracks[0];
    if (captionsPath && track?.mode === "disabled") track.mode = "showing";
    resumePlayback();
    setCurrentTime(v.currentTime);
  }, [captionsPath, resumePlayback, speed]);

  // メタデータが先に読み終わっていた場合は、 進捗が決着した時点で再開位置を当てる。
  useEffect(() => {
    resumePlayback();
  }, [resumePlayback]);

  const flushSave = useCallback(
    (sec: number, mediaDuration = videoRef.current?.duration) => {
      if (!recordProgress) return;
      const dur = mediaDuration || duration || totalSec || 0;
      recordWatchTime(sec, dur);
      if (!completedRef.current && dur > 0 && sec / dur >= COMPLETION_THRESHOLD) {
        completedRef.current = true;
        setCompletedDuringPlayback(true);
        markComplete();
        onComplete?.();
      }
    },
    [recordProgress, recordWatchTime, duration, totalSec, markComplete, onComplete],
  );

  const completeSlideVideo = useCallback(() => {
    if (recordProgress || isCompleted || completedRef.current || (!onComplete && !canAdvance)) {
      return;
    }
    completedRef.current = true;
    setCompletedDuringPlayback(true);
    if (onComplete) {
      onComplete();
      flushNow();
    }
  }, [recordProgress, onComplete, isCompleted, canAdvance]);

  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const sec = v.currentTime;
    setCurrentTime(sec);
    if (!recordProgress) {
      if (reachesVideoCompletion(sec, v.duration)) completeSlideVideo();
      return;
    }
    lastSaveRef.current = sec;
    if (saveTimerRef.current) return;
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      flushSave(lastSaveRef.current);
    }, SAVE_DEBOUNCE_MS);
  }, [recordProgress, completeSlideVideo, flushSave]);

  const onPauseOrEnded = useCallback(() => {
    setIsPlaying(false);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const v = videoRef.current;
    if (v) flushSave(v.currentTime);
    if (recordProgress) flushNow();
  }, [flushSave, recordProgress]);

  // 最後まで見終わったら次のレッスンへの導線を出す。 自動遷移が有効なら
  // カウントダウンも始める (見直しのために再生を再開したら取り消す)。
  const handleEnded = useCallback(() => {
    onPauseOrEnded();
    completeSlideVideo();
    if (!canAdvance) return;
    setShowNextOverlay(true);
    setCountdown(autoAdvance ? AUTO_ADVANCE_SEC : null);
  }, [onPauseOrEnded, completeSlideVideo, canAdvance, autoAdvance]);

  const onPlay = useCallback(() => {
    setIsPlaying(true);
    // 見直しを始めたら勝手に次へ飛ばさない。
    setShowNextOverlay(false);
    setCountdown(null);
  }, []);

  // unmount でフラッシュ。 flushSave の identity 変化で unmount 相当の保存を走らせない
  // biome-ignore lint/correctness/useExhaustiveDependencies: unmount 時だけフラッシュする
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const v = lastVideoRef.current;
      if (v) {
        try {
          flushSave(v.currentTime, v.duration);
        } catch {
          // ignore
        }
      }
      if (recordProgress) flushNow();
    };
    // 1 回登録すれば良い
  }, []);

  // 自動遷移のカウントダウン。 コールバックは ref 経由で読み、 親の再レンダで
  // identity が変わっても 1 秒の刻みをやり直さない。
  const advanceRef = useRef(onAdvanceNext);
  useEffect(() => {
    advanceRef.current = onAdvanceNext;
  }, [onAdvanceNext]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      setShowNextOverlay(false);
      advanceRef.current?.();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((sec) => (sec === null ? null : sec - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {
        // autoplay 拒否は無視する
      });
    } else v.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  }, []);

  const toggleCaptions = () => {
    const track = videoRef.current?.textTracks[0];
    if (!track) return;
    track.mode = track.mode === "showing" ? "hidden" : "showing";
    setCaptionsShowing(track.mode === "showing");
  };

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || Number.POSITIVE_INFINITY, time));
    setCurrentTime(video.currentTime);
  }, []);

  const seek = useCallback(
    (deltaSec: number) => {
      const video = videoRef.current;
      if (video) seekTo(video.currentTime + deltaSec);
    },
    [seekTo],
  );

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    try {
      if (document.fullscreenElement === container) {
        void document.exitFullscreen().catch(() => {
          // 全画面の解除が拒否されても操作は続行する。
        });
      } else if (video.webkitDisplayingFullscreen) {
        video.webkitExitFullscreen?.();
      } else if (container.requestFullscreen && document.fullscreenEnabled !== false) {
        void container.requestFullscreen().catch(() => {
          // 全画面の要求が拒否されても操作は続行する。
        });
      } else {
        video.webkitEnterFullscreen?.();
      }
    } catch {
      // メタデータの読み込み前など、全画面が拒否されても操作は続行する。
    }
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          'input, textarea, select, button, a, [contenteditable="true"], [role="slider"]',
        )
      ) {
        return;
      }
      switch (e.key) {
        case " ":
        case "Spacebar":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seek(-5);
          break;
        case "ArrowRight":
          e.preventDefault();
          seek(5);
          break;
        case "j":
        case "J":
          e.preventDefault();
          seek(-10);
          break;
        case "l":
        case "L":
          e.preventDefault();
          seek(10);
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    },
    [togglePlay, seek, toggleMute, toggleFullscreen],
  );

  const retry = useCallback(() => {
    setHasError(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setShowNextOverlay(false);
    setCountdown(null);
    resumedRef.current = false;
    setReloadKey((k) => k + 1);
  }, []);

  const advanceNext = () => {
    setCountdown(null);
    setShowNextOverlay(false);
    onAdvanceNext?.();
  };

  const advanceLabel = countdown === null ? "次へ進む" : `次へ進む (${countdown})`;
  const togglePlaybackFromVideo = () => {
    containerRef.current?.focus({ preventScroll: true });
    togglePlay();
  };

  const replay = () => {
    setCountdown(null);
    setShowNextOverlay(false);
    containerRef.current?.focus({ preventScroll: true });
    seekTo(0);
    videoRef.current?.play().catch(() => {
      // 再生が拒否された場合は、再生ボタンから再試行できる。
    });
  };

  if (!url) {
    return (
      <div className="bg-black/90 aspect-[16/9] max-h-[62vh] grid place-items-center text-white/80 text-sm">
        <div className="bg-card text-foreground rounded-md p-5 max-w-md mx-4 flex gap-3 items-start">
          <AlertCircle size={18} className="text-warning shrink-0 mt-0.5" />
          <div>
            <div className="text-[13.5px] font-semibold">教材が設定されていません</div>
            <div className="text-[12.5px] text-ink-3 mt-1">
              VITE_SERVER_URL / VITE_MATERIALS_BASE_URL を apps/web/.env.local に設定してください。
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="application"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: キーボード操作のためコンテナがフォーカスを持つ
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={cn(
        "relative bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
        isFullscreen && "flex h-full flex-col",
      )}
      aria-label="動画ビューア"
    >
      {hasError ? (
        <div className="aspect-[16/9] max-h-[62vh] grid place-items-center">
          <div className="bg-card text-foreground rounded-md p-5 max-w-md mx-4 flex gap-3 items-start">
            <AlertCircle size={18} className="text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-[13.5px] font-semibold">動画を読み込めませんでした</div>
              <div className="text-[12.5px] text-ink-3 mt-1">
                通信状況を確認して再読み込みしてください。
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  type="button"
                  aria-label="再読み込み"
                  size="sm"
                  variant="primary"
                  onClick={retry}
                  className="min-h-10 min-w-10"
                >
                  <RefreshCw size={12} /> 再読み込み
                </Button>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[12.5px] rounded border border-border hover:bg-sunken"
                >
                  <Download size={12} /> ダウンロード
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={cn("relative", isFullscreen && "flex min-h-0 flex-1")}>
            <video
              key={reloadKey}
              ref={attachVideo}
              src={url}
              crossOrigin={captionsPath ? "anonymous" : undefined}
              poster={posterPath ? getMaterialUrl(posterPath) : undefined}
              playsInline
              muted={isMuted}
              preload="metadata"
              className={cn(
                "cursor-pointer bg-black object-contain",
                isFullscreen ? "h-full w-full max-h-none" : "w-full max-h-[62vh]",
              )}
              onClick={togglePlaybackFromVideo}
              onLoadedMetadata={onLoadedMetadata}
              onTimeUpdate={onTimeUpdate}
              onVolumeChange={(event) => setIsMuted(event.currentTarget.muted)}
              onPlay={onPlay}
              onPause={onPauseOrEnded}
              onEnded={handleEnded}
              onError={() => setHasError(true)}
            >
              <track
                kind="captions"
                src={captionsPath ? getMaterialUrl(captionsPath) : undefined}
                srcLang="ja"
                label="日本語"
                default={Boolean(captionsPath)}
              />
            </video>
            {showNextOverlay && canAdvance ? (
              <div className="absolute inset-0 overflow-y-auto overscroll-contain bg-black/75 text-center">
                <div className="flex min-h-full flex-col items-center justify-center gap-1 px-2 py-1 sm:gap-3 sm:px-3 sm:py-2">
                  <div className="flex items-center justify-center gap-1.5 text-sm leading-4 font-semibold text-white sm:leading-5">
                    <Check size={16} className="text-success" aria-hidden="true" />
                    この動画を見終わりました
                  </div>
                  <div className="w-full max-w-sm rounded-xl bg-white p-2 text-zinc-900 shadow-lg sm:p-5">
                    <div className="text-xs font-semibold text-zinc-600">次にやること</div>
                    {nextLessonMeta ? (
                      <div className="mt-0.5 wrap-anywhere text-xs text-zinc-600 sm:mt-1.5">
                        {nextLessonMeta}
                      </div>
                    ) : null}
                    <div className="mt-0.5 wrap-anywhere text-base leading-5 font-bold sm:mt-1.5 sm:text-lg sm:leading-7">
                      {nextTitle}
                    </div>
                    <div className="mt-1.5 flex justify-center gap-2 sm:mt-2.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        aria-label="もう一度見る"
                        className="h-9 border-zinc-300 px-3 text-xs text-zinc-900 hover:border-zinc-400 hover:bg-zinc-100 sm:h-10 sm:px-4.5 sm:text-sm"
                        onClick={replay}
                      >
                        もう一度見る
                      </Button>
                      <Button
                        type="button"
                        variant="accent"
                        size="lg"
                        aria-label={advanceLabel}
                        className="h-9 px-3 text-xs sm:h-10 sm:px-4.5 sm:text-sm"
                        onClick={advanceNext}
                      >
                        {advanceLabel}
                      </Button>
                    </div>
                    <label className="mt-1.5 flex items-center justify-center gap-1.5 text-xs sm:mt-2.5">
                      <input
                        type="checkbox"
                        checked={autoAdvance}
                        onChange={(event) => {
                          const enabled = event.target.checked;
                          setAutoAdvance(enabled);
                          setCountdown(enabled ? AUTO_ADVANCE_SEC : null);
                        }}
                        className="shrink-0 accent-brand"
                      />
                      再生終了後に自動で次へ進む
                    </label>
                  </div>
                </div>
              </div>
            ) : !isPlaying ? (
              <button
                type="button"
                aria-label="再生"
                className="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/70 text-white hover:bg-black/90 focus-visible:outline-2 focus-visible:outline-white"
                onClick={togglePlaybackFromVideo}
              >
                <Play size={30} fill="currentColor" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <div className="shrink-0 bg-zinc-950 px-2 pb-1 text-white">
            <SeekBar currentTime={currentTime} duration={seekDuration} onSeek={seekTo} />
            <div className="flex flex-wrap items-center text-xs">
              <button
                type="button"
                aria-label={isPlaying ? "一時停止" : "再生"}
                onClick={togglePlay}
                className={CONTROL_BUTTON}
              >
                {isPlaying ? (
                  <Pause size={18} aria-hidden="true" />
                ) : (
                  <Play size={18} aria-hidden="true" />
                )}
              </button>
              {canAdvance && (isCompleted || completedDuringPlayback) ? (
                <button
                  type="button"
                  aria-label={`次の教材へ: ${nextTitle}`}
                  onClick={advanceNext}
                  className={cn(CONTROL_BUTTON, "px-1")}
                >
                  <SkipForward size={16} aria-hidden="true" /> 次へ
                </button>
              ) : null}
              <button
                type="button"
                aria-label={isMuted ? "ミュート解除" : "ミュート"}
                onClick={toggleMute}
                className={CONTROL_BUTTON}
              >
                {isMuted ? (
                  <VolumeX size={18} aria-hidden="true" />
                ) : (
                  <Volume2 size={18} aria-hidden="true" />
                )}
              </button>
              <span className="min-w-8 flex-1 wrap-anywhere tabular-nums">
                {formatVideoTime(currentTime)} / {formatVideoTime(seekDuration)}
              </span>
              <div className="ml-auto flex items-center">
                <select
                  aria-label="再生速度"
                  value={String(speed)}
                  onChange={(event) => {
                    const nextSpeed = Number(event.target.value);
                    setSpeed(nextSpeed);
                    if (videoRef.current) videoRef.current.playbackRate = nextSpeed;
                  }}
                  className={cn(CONTROL_BUTTON, "bg-zinc-950 [color-scheme:dark]")}
                >
                  {SPEEDS.map((s) => (
                    <option key={s} value={s}>
                      {s.toFixed(2)}x
                    </option>
                  ))}
                </select>
                {captionsPath ? (
                  <button
                    type="button"
                    aria-label={captionsShowing ? "字幕を隠す" : "字幕を表示"}
                    aria-pressed={captionsShowing}
                    onClick={toggleCaptions}
                    className={CONTROL_BUTTON}
                  >
                    <Captions size={18} aria-hidden="true" />
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label={isFullscreen ? "全画面を終了" : "全画面"}
                  onClick={toggleFullscreen}
                  className={CONTROL_BUTTON}
                >
                  {isFullscreen ? (
                    <Minimize2 size={18} aria-hidden="true" />
                  ) : (
                    <Maximize2 size={18} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default VideoViewer;
