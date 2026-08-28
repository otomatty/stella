/**
 * HTML5 動画プレイヤーラッパ。
 *
 * - R2 上の mp4 を直接 src に渡し、 ネイティブ controls を活用
 * - 再生速度プリセット (0.75〜2.0x) を独自 UI で
 * - キーボードショートカット (Space / ←→ / J L / M / F)
 * - 前回視聴位置からの自動再開 (`watchedSec`)
 * - `timeupdate` を 250ms デバウンスして localStorage に保存
 * - 90% 視聴で `onComplete()`
 * - 再生終了で「次のレッスンへ」オーバーレイ (既定は 5 秒で自動遷移 / 取り消し可)
 * - 読み込み失敗時のリトライ + ダウンロード fallback
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
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

interface Props {
  lessonId: string;
  videoPath: string;
  totalSec?: number;
  onComplete?: () => void;
  /** 再生終了後に案内する次のレッスン名。 次が無いステージ末尾では null。 */
  nextLessonTitle?: string | null;
  /** 次のレッスンへ進む。 未指定 (次が無い) ならオーバーレイを出さない。 */
  onAdvanceNext?: (() => void) | undefined;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
const SAVE_DEBOUNCE_MS = 250;
const COMPLETION_THRESHOLD = 0.9;
/** 再生終了から自動で次へ進むまでの秒数。 */
const AUTO_ADVANCE_SEC = 5;

export function VideoViewer({
  lessonId,
  videoPath,
  totalSec,
  onComplete,
  nextLessonTitle = null,
  onAdvanceNext,
}: Props) {
  const { entry, recordWatchTime, markComplete } = useLessonProgress(lessonId);
  // サーバ進捗の取り込みが決着するまで再開位置は確定しない。
  const ready = useProgressReady();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [duration, setDuration] = useState<number>(totalSec ?? 0);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [autoAdvance, setAutoAdvance] = useAutoplayNext();
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  /** 自動遷移までの残り秒。 null なら自動遷移しない (ボタンのみ)。 */
  const [countdown, setCountdown] = useState<number | null>(null);
  const canAdvance = Boolean(onAdvanceNext);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef<boolean>(entry?.completed === true);
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
    if (!v || resumedRef.current || !ready) return;
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
  }, [entry, ready]);

  const onLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (Number.isFinite(v.duration) && v.duration > 0) setDuration(v.duration);
    resumePlayback();
  }, [resumePlayback]);

  // メタデータが先に読み終わっていた場合は、 進捗が決着した時点で再開位置を当てる。
  useEffect(() => {
    resumePlayback();
  }, [resumePlayback]);

  const flushSave = useCallback(
    (sec: number) => {
      const dur = videoRef.current?.duration || duration || totalSec || 0;
      recordWatchTime(sec, dur);
      if (!completedRef.current && dur > 0 && sec / dur >= COMPLETION_THRESHOLD) {
        completedRef.current = true;
        markComplete();
        onComplete?.();
      }
    },
    [recordWatchTime, duration, totalSec, markComplete, onComplete],
  );

  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const sec = v.currentTime;
    lastSaveRef.current = sec;
    if (saveTimerRef.current) return;
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      flushSave(lastSaveRef.current);
    }, SAVE_DEBOUNCE_MS);
  }, [flushSave]);

  const onPauseOrEnded = useCallback(() => {
    setIsPlaying(false);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const v = videoRef.current;
    if (v) flushSave(v.currentTime);
    flushNow();
  }, [flushSave]);

  // 最後まで見終わったら次のレッスンへの導線を出す。 自動遷移が有効なら
  // カウントダウンも始める (見直しのために再生を再開したら取り消す)。
  const handleEnded = useCallback(() => {
    onPauseOrEnded();
    if (!canAdvance) return;
    setShowNextOverlay(true);
    setCountdown(autoAdvance ? AUTO_ADVANCE_SEC : null);
  }, [onPauseOrEnded, canAdvance, autoAdvance]);

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
      const v = videoRef.current;
      if (v) {
        // unmount 時点の currentTime を保存。 v は detach 済み参照なので注意
        try {
          flushSave(v.currentTime);
        } catch {
          // ignore
        }
      }
      flushNow();
    };
    // 1 回登録すれば良い
  }, []);

  // speed 反映
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = speed;
  }, [speed]);

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

  const seek = useCallback((deltaSec: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(
      0,
      Math.min(v.duration || Number.POSITIVE_INFINITY, v.currentTime + deltaSec),
    );
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement === containerRef.current) {
      document.exitFullscreen().catch(() => {
        // フルスクリーン解除が拒否されても操作は続行する
      });
    } else {
      containerRef.current.requestFullscreen().catch(() => {
        // フルスクリーン要求が拒否されても操作は続行する
      });
    }
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, button, a, [contenteditable="true"]')) {
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
    resumedRef.current = false;
    setReloadKey((k) => k + 1);
  }, []);

  const handleMarkComplete = useCallback(() => {
    markComplete();
    completedRef.current = true;
    onComplete?.();
  }, [markComplete, onComplete]);

  const isCompleted = entry?.completed === true;
  const watched = entry?.watchedSec ?? 0;
  const dur = duration || totalSec || 0;
  const pct = dur > 0 ? Math.min(100, Math.round((watched / dur) * 100)) : 0;

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
      className="relative bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
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
                <Button size="sm" variant="primary" onClick={retry}>
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
        <video
          key={reloadKey}
          ref={videoRef}
          src={url}
          controls
          preload="metadata"
          className="w-full max-h-[62vh] bg-black"
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onPlay={onPlay}
          onPause={onPauseOrEnded}
          onEnded={handleEnded}
          onError={() => setHasError(true)}
        >
          <track kind="captions" />
        </video>
      )}

      {showNextOverlay && canAdvance ? (
        // ブラウザ既定のコントロールバーはこの上に描かれるので、 下に余白を空けて
        // ボタンが操作バーと重ならないようにする。
        <div className="absolute inset-0 grid place-items-center bg-black/70 px-4 pb-14 text-center">
          <div className="max-w-sm">
            <div className="text-[11.5px] uppercase tracking-[0.14em] text-white/70">
              次のレッスン
            </div>
            <div className="mt-1.5 text-[15px] font-bold text-white">
              {nextLessonTitle ?? "次のレッスン"}
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                variant="accent"
                onClick={() => {
                  setCountdown(null);
                  setShowNextOverlay(false);
                  onAdvanceNext?.();
                }}
              >
                <Play size={13} />
                {countdown === null ? "次のレッスンへ" : `次のレッスンへ (${countdown})`}
              </Button>
              <Button
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10"
                onClick={() => {
                  setCountdown(null);
                  setShowNextOverlay(false);
                }}
              >
                {countdown === null ? "閉じる" : "キャンセル"}
              </Button>
            </div>
            <label className="mt-4 inline-flex items-center gap-1.5 text-[11.5px] text-white/80">
              <input
                type="checkbox"
                checked={autoAdvance}
                onChange={(e) => {
                  const next = e.target.checked;
                  setAutoAdvance(next);
                  // その場で挙動を合わせる (オフにしたらカウントダウンを止める)。
                  setCountdown(next ? AUTO_ADVANCE_SEC : null);
                }}
                className="accent-brand"
              />
              再生終了後に自動で次へ進む
            </label>
          </div>
        </div>
      ) : null}

      <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[11.5px]">
        <div className="flex items-center gap-1 bg-black/55 backdrop-blur-sm rounded-full px-2.5 py-1 text-white font-display font-bold">
          <label htmlFor={`speed-${lessonId}`} className="sr-only">
            再生速度
          </label>
          <select
            id={`speed-${lessonId}`}
            aria-label="再生速度"
            value={String(speed)}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="bg-transparent text-white text-[11.5px] focus:outline-none"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s} className="text-foreground">
                {s.toFixed(2)}x
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          aria-label={isMuted ? "ミュート解除" : "ミュート"}
          onClick={toggleMute}
          className="bg-black/55 hover:bg-black/70 backdrop-blur-sm rounded-full p-1.5 text-white"
        >
          {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
        <button
          type="button"
          aria-label="フルスクリーン"
          onClick={toggleFullscreen}
          className="bg-black/55 hover:bg-black/70 backdrop-blur-sm rounded-full p-1.5 text-white"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      <div className="px-3 py-2 bg-card border-t border-border flex items-center gap-2.5 text-[11.5px] text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          視聴 {Math.round(watched)} / {Math.round(dur) || "?"} 秒{" "}
          <span className="font-display font-bold text-ink-2">({pct}%)</span>
        </span>
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden max-w-[260px]">
          <div
            className={cn("h-full", isCompleted ? "bg-success" : "sf-gradient-bg")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex-1" />
        {!isCompleted ? (
          <Button size="sm" variant="accent" onClick={handleMarkComplete}>
            <Check size={13} /> 完了にする
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1 text-success text-[12px] px-2">
            <Check size={13} /> 完了済み
          </span>
        )}
      </div>
    </div>
  );
}

export default VideoViewer;
