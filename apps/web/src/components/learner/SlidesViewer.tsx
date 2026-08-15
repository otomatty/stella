/**
 * PDF スライドビューア (react-pdf ベース)。
 *
 * - R2 公開バケットから PDF を取得
 * - ページ送り (ボタン / キーボード)、 ズーム、 フルスクリーン、 サムネペイン
 * - 閲覧ページを `useLessonProgress` に記録、 90% で auto complete
 * - 環境未設定 / 取得失敗時は fallback UI を表示
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Document, Page } from 'react-pdf';
// pdfjs (約 1MB+) を main バンドルに含めないよう、 worker 設定と CSS は
// lazy ロードされる本コンポーネント側で import する (main.tsx に置かない)。
import '@/lib/pdfjs-worker';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  RefreshCw,
  AlertCircle,
  Check,
  FileText,
} from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { isBackendConfigured } from "@/lib/backend";
import { getMaterialUrl } from "@/lib/storage";
import { useLessonProgress, useProgressReady } from '@/hooks/useLessonProgress';
import { cn } from '@/lib/utils';

interface Props {
  lessonId: string;
  pdfPath: string;
  totalPages?: number;
  onComplete?: () => void;
}

const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3] as const;
const ZOOM_LABELS: Record<string, string> = {
  '0.5': '50%',
  '0.75': '75%',
  '1': '100%',
  '1.25': '125%',
  '1.5': '150%',
  '2': '200%',
  '2.5': '250%',
  '3': '300%',
};
const ZOOM_MAX = ZOOM_PRESETS[ZOOM_PRESETS.length - 1];
const ZOOM_MIN = ZOOM_PRESETS[0];

const COMPLETION_THRESHOLD = 0.9;

const PDFJS_OPTIONS = {
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/pdfjs/standard_fonts/',
};

export function SlidesViewer({ lessonId, pdfPath, totalPages, onComplete }: Props) {
  const { entry, recordPage, markComplete } = useLessonProgress(lessonId);
  // サーバ進捗が決着するまで復元位置は確定しない (未決着なら 1 ページ目のまま待つ)。
  const ready = useProgressReady();

  const [page, setPage] = useState<number>(1);
  // 復元が済むまでは記録しない (未決着のローカル進捗でサーバの last_page を潰さない)。
  const [restored, setRestored] = useState(false);
  const [numPages, setNumPages] = useState<number | undefined>(totalPages);
  const [scale, setScale] = useState<number>(1);
  const [showThumbs, setShowThumbs] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef<boolean>(entry?.completed === true);

  const url = useMemo<string | null>(() => {
    if (!isBackendConfigured()) return null;
    try {
      return getMaterialUrl(pdfPath);
    } catch {
      return null;
    }
  }, [pdfPath]);

  // file プロップが毎レンダ新オブジェクトになると無限ループになるため memoize
  const documentFile = useMemo(
    () => (url ? { url } : null),
    // reloadKey を依存に含めることでリトライ時に新しいオブジェクトを作る
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, reloadKey],
  );

  const handleLoadSuccess = useCallback(
    ({ numPages: n }: { numPages: number }) => {
      setNumPages(n);
      setLoadError(null);
      // 初期ページが既に numPages を超えていれば最後のページに丸める
      setPage((p) => Math.min(Math.max(1, p), n));
    },
    [],
  );

  const handleLoadError = useCallback((err: Error) => {
    setLoadError(err);
  }, []);

  // サーバ進捗が決着してから「続き」のページへ飛ぶ (MarkdownSlides と同じ理由)。
  useEffect(() => {
    if (!ready || restored || !numPages) return;
    setPage(Math.min(Math.max(entry?.lastPage ?? 1, 1), numPages));
    setRestored(true);
  }, [ready, restored, numPages, entry?.lastPage]);

  // ページが変わったら記録 (復元が済むまでは書かない)
  useEffect(() => {
    if (!restored || !numPages) return;
    recordPage(page, numPages);
  }, [restored, page, numPages, recordPage]);

  // 90% で markComplete を呼んでストアに反映し、 onComplete 通知 (どちらも 1 回だけ)
  useEffect(() => {
    if (!numPages || numPages <= 0) return;
    if (completedRef.current) return;
    if (entry?.completed) {
      completedRef.current = true;
      return;
    }
    const viewed = entry?.viewedPages?.length ?? 0;
    if (viewed / numPages >= COMPLETION_THRESHOLD) {
      completedRef.current = true;
      markComplete();
      onComplete?.();
    }
  }, [entry, numPages, markComplete, onComplete]);

  // フルスクリーン状態の追従
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const total = numPages ?? totalPages ?? 0;

  const goPrev = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);
  const goNext = useCallback(() => {
    setPage((p) => (total > 0 ? Math.min(total, p + 1) : p));
  }, [total]);
  const goFirst = useCallback(() => setPage(1), []);
  const goLast = useCallback(() => total > 0 && setPage(total), [total]);

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
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          goPrev();
          break;
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault();
          goNext();
          break;
        case 'Home':
          e.preventDefault();
          goFirst();
          break;
        case 'End':
          e.preventDefault();
          goLast();
          break;
      }
    },
    [goPrev, goNext, goFirst, goLast],
  );

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement === containerRef.current) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  }, []);

  const retry = useCallback(() => {
    setLoadError(null);
    setReloadKey((k) => k + 1);
  }, []);

  const handleMarkComplete = useCallback(() => {
    markComplete();
    completedRef.current = true;
    onComplete?.();
  }, [markComplete, onComplete]);

  const viewedCount = entry?.viewedPages?.length ?? 0;
  const progressPct = total > 0 ? Math.round((viewedCount / total) * 100) : 0;
  const isCompleted = entry?.completed === true;

  if (!url) {
    return (
      <FallbackCard
        title="教材が設定されていません"
        body="VITE_SERVER_URL / VITE_MATERIALS_BASE_URL を apps/web/.env.local に設定してください。"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={cn(
        'relative bg-sunken border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60',
        isFullscreen ? 'h-screen w-screen' : 'rounded-md',
      )}
      aria-label="PDF スライドビューア"
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card text-[12.5px]">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowThumbs((s) => !s)}
          aria-label="サムネペインを開閉"
        >
          <FileText size={13} />
          {showThumbs ? '一覧を閉じる' : '一覧'}
        </Button>
        <span className="text-ink-3">|</span>
        <Button size="sm" variant="ghost" onClick={goPrev} aria-label="前のページ" disabled={page <= 1}>
          <ChevronLeft size={14} />
        </Button>
        <div
          className="text-ink-2 tabular-nums px-1.5 min-w-[64px] text-center"
          aria-live="polite"
        >
          {page} / {total || '?'}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={goNext}
          aria-label="次のページ"
          disabled={total === 0 || page >= total}
        >
          <ChevronRight size={14} />
        </Button>
        <span className="text-ink-3">|</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setScale((s) => Math.max(ZOOM_MIN, +(s - 0.25).toFixed(2)))}
          aria-label="縮小"
        >
          <ZoomOut size={13} />
        </Button>
        <select
          aria-label="ズーム"
          value={String(scale)}
          onChange={(e) => setScale(Number(e.target.value))}
          className="bg-card border border-border rounded px-1.5 py-0.5 text-[12px]"
        >
          {ZOOM_PRESETS.map((z) => (
            <option key={z} value={z}>
              {ZOOM_LABELS[String(z)]}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setScale((s) => Math.min(ZOOM_MAX, +(s + 0.25).toFixed(2)))}
          aria-label="拡大"
        >
          <ZoomIn size={13} />
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={toggleFullscreen} aria-label="フルスクリーン">
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </Button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="PDF をダウンロード"
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[12px] hover:bg-sunken text-ink-2"
        >
          <Download size={13} /> ダウンロード
        </a>
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

      <div className="px-3 py-2 border-b border-border bg-card flex items-center gap-2 text-[11.5px] text-ink-3">
        <span>
          閲覧 {viewedCount} / {total || '?'} ページ{' '}
          <span className="font-display font-bold text-ink-2">({progressPct}%)</span>
        </span>
        <div className="flex-1 max-w-[280px]">
          <Progress value={progressPct} tone="brand" />
        </div>
      </div>

      <div className="flex" style={{ height: isFullscreen ? 'calc(100vh - 92px)' : 'min(70vh, 720px)' }}>
        {showThumbs ? (
          <div className="w-[160px] shrink-0 border-r border-border bg-card overflow-y-auto py-2">
            {loadError || !documentFile ? null : (
              <Document
                file={documentFile}
                options={PDFJS_OPTIONS}
                loading={<ThumbLoading />}
              >
                {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'block w-full mb-2 px-2 py-1 rounded border text-left',
                      p === page ? 'border-brand bg-brand-soft' : 'border-transparent hover:border-border',
                    )}
                  >
                    <Page pageNumber={p} width={130} renderAnnotationLayer={false} renderTextLayer={false} />
                    <div className="text-[11px] text-ink-3 text-center mt-0.5">{p}</div>
                  </button>
                ))}
              </Document>
            )}
          </div>
        ) : null}

        <div className="flex-1 min-w-0 overflow-auto grid place-items-start justify-center p-4 bg-[oklch(96%_0.005_260)]">
          {loadError ? (
            <div className="w-full max-w-md mx-auto mt-8">
              <FallbackCard
                title="PDF を読み込めませんでした"
                body={loadError.message || '通信状況を確認して再読み込みしてください。'}
                action={
                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={retry}>
                      <RefreshCw size={12} />
                      再読み込み
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
                }
              />
            </div>
          ) : (
            <Document
              key={reloadKey}
              file={documentFile}
              options={PDFJS_OPTIONS}
              loading={<PageLoading />}
              onLoadSuccess={handleLoadSuccess}
              onLoadError={handleLoadError}
            >
              <Page pageNumber={page} scale={scale} loading={<PageLoading />} />
            </Document>
          )}
        </div>
      </div>
    </div>
  );
}

function PageLoading() {
  return (
    <div role="status" aria-label="読み込み中" className="p-4">
      <Skeleton className="aspect-[16/9] w-[min(60vw,880px)]" />
    </div>
  );
}

function ThumbLoading() {
  return (
    <div role="status" aria-label="サムネイルを生成中" className="px-2 py-1 space-y-2">
      <Skeleton className="aspect-[16/9] w-full" />
      <Skeleton className="aspect-[16/9] w-full" />
    </div>
  );
}

function FallbackCard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-5 flex gap-3 items-start">
      <AlertCircle size={18} className="text-warning shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="text-[13.5px] font-semibold">{title}</div>
        <div className="text-[12.5px] text-ink-3 mt-1">{body}</div>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}

export default SlidesViewer;
