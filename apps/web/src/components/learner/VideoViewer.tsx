/**
 * HTML5 動画プレイヤーラッパ。
 *
 * - Supabase Storage の mp4 を直接 src に渡し、 ネイティブ controls を活用
 * - 再生速度プリセット (0.75〜2.0x) を独自 UI で
 * - キーボードショートカット (Space / ←→ / J L / M / F)
 * - 前回視聴位置からの自動再開 (`watchedSec`)
 * - `timeupdate` を 250ms デバウンスして localStorage に保存
 * - 90% 視聴で `onComplete()`
 * - 読み込み失敗時のリトライ + ダウンロード fallback
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { getMaterialUrl, isSupabaseConfigured } from '@/lib/supabase';
import { useLessonProgress } from '@/hooks/useLessonProgress';
import { flushNow } from '@/lib/lesson-progress';
import { cn } from '@/lib/utils';

interface Props {
  lessonId: string;
  videoPath: string;
  totalSec?: number;
  onComplete?: () => void;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
const SAVE_DEBOUNCE_MS = 250;
const COMPLETION_THRESHOLD = 0.9;

export function VideoViewer({ lessonId, videoPath, totalSec, onComplete }: Props) {
  const { entry, recordWatchTime, markComplete } = useLessonProgress(lessonId);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [duration, setDuration] = useState<number>(totalSec ?? 0);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef<boolean>(entry?.completed === true);
  const lastSaveRef = useRef<number>(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumedRef = useRef(false);

  const url = useMemo<string | null>(() => {
    if (!isSupabaseConfigured()) return null;
    try {
      return getMaterialUrl(videoPath);
    } catch {
      return null;
    }
  }, [videoPath]);

  const onLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (Number.isFinite(v.duration) && v.duration > 0) setDuration(v.duration);
    // 前回視聴位置から再開
    if (!resumedRef.current) {
      resumedRef.current = true;
      const dur = v.duration;
      const resumeFrom = entry?.watchedSec ?? 0;
      const tooNearEnd = Number.isFinite(dur) && resumeFrom >= dur - 5;
      if (entry?.completed) {
        v.currentTime = 0;
      } else if (resumeFrom > 0 && !tooNearEnd) {
        try {
          v.currentTime = resumeFrom;
        } catch {
          // ignore (range request 失敗など)
        }
      }
    }
  }, [entry]);

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

  const onPlay = useCallback(() => setIsPlaying(true), []);

  // unmount でフラッシュ
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // speed 反映
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = speed;
  }, [speed]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
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
      Math.min(v.duration || Infinity, v.currentTime + deltaSec),
    );
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement === containerRef.current) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        target.closest('input, textarea, select, button, a, [contenteditable="true"]')
      ) {
        return;
      }
      switch (e.key) {
        case ' ':
        case 'Spacebar':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(5);
          break;
        case 'j':
        case 'J':
          e.preventDefault();
          seek(-10);
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          seek(10);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
        case 'F':
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
              Supabase の環境変数が未設定です。 apps/web/.env.local を確認してください。
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
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
          onEnded={onPauseOrEnded}
          onError={() => setHasError(true)}
        >
          <track kind="captions" />
        </video>
      )}

      <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[11.5px]">
        <div className="flex items-center gap-1 bg-black/55 backdrop-blur-sm rounded px-2 py-1 text-white">
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
          aria-label={isMuted ? 'ミュート解除' : 'ミュート'}
          onClick={toggleMute}
          className="bg-black/55 hover:bg-black/70 backdrop-blur-sm rounded p-1.5 text-white"
        >
          {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
        <button
          type="button"
          aria-label="フルスクリーン"
          onClick={toggleFullscreen}
          className="bg-black/55 hover:bg-black/70 backdrop-blur-sm rounded p-1.5 text-white"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      <div className="px-3 py-2 bg-card border-t border-border flex items-center gap-2 text-[11.5px] text-ink-3">
        <span className="inline-flex items-center gap-1">
          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          視聴 {Math.round(watched)} / {Math.round(dur) || '?'} 秒 ({pct}%)
        </span>
        <div className="flex-1 h-1 bg-muted rounded-sm overflow-hidden max-w-[260px]">
          <div
            className={cn('h-full', isCompleted ? 'bg-success' : 'bg-brand')}
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
