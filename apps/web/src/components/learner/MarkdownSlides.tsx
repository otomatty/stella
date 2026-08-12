/**
 * `type: "slides"` のレッスン。教材の slides.md 本文を `---` 区切りで 1 枚ずつ表示する。
 *
 * PDF は作らない方針のため react-pdf は使わない。テキストが選択でき、 画面幅に追従し、
 * 図解 SVG がそのまま拡大縮小できるので、 LMS で読む用途では PDF より扱いやすい。
 * 既存の `SlidesViewer` (react-pdf) は動画レッスンの PDF 教材が残る間そのまま残す。
 *
 * 分割は `packages/content` の `splitSlides` と同じ `\n---\n` 区切りだが、 あちらは
 * `node:fs` に依存するパッケージなのでブラウザバンドルには引き込めない。 本文は
 * manifest 側で講師ノート除去済み・ `\n\n---\n\n` 連結済みなので、 ここは割るだけで足りる。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, ChevronLeft, ChevronRight } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getMaterialUrl } from '@/lib/storage';
import { useLessonProgress } from '@/hooks/useLessonProgress';

/**
 * 教材 markdown の画像 src は R2 のオブジェクトキー (URL ではない) なので公開 URL へ解決する。
 * ストレージ未設定なら `getMaterialUrl` が throw するが、 画像 1 枚のために本文全体を
 * 落とすほどではないので元の値のまま (壊れた画像として) 描画する。
 */
function resolveImageSrc(src: string): string {
  // 先頭 `/` は除外しない。 `getMaterialUrl` が先頭スラッシュを落として解決してくれる。
  if (/^(?:https?:|data:|blob:)/.test(src)) return src;
  try {
    return getMaterialUrl(src);
  } catch {
    return src;
  }
}

/**
 * slides.md の画像は Marp 時代の名残で alt に `w:950` (幅指定ディレクティブ) が入っている。
 * 説明文ではないのでスクリーンリーダーに読ませず、 装飾画像として扱う。
 */
const MARP_SIZE_ALT = /^(?:[wh]:\d+%?\s*)+$/;

const markdownComponents: Components = {
  img: ({ src, alt, title }) => (
    <img
      src={typeof src === 'string' ? resolveImageSrc(src) : undefined}
      alt={alt && !MARP_SIZE_ALT.test(alt.trim()) ? alt : ''}
      title={title}
      loading="lazy"
      className="max-w-full h-auto"
    />
  ),
};

/** レッスン本文 markdown の共通描画。 text レッスンとスライド 1 枚の両方で使う。 */
export function LessonMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {children}
    </ReactMarkdown>
  );
}

interface Props {
  lessonId: string;
  markdown: string;
  onComplete?: () => void;
}

export function MarkdownSlides({ lessonId, markdown, onComplete }: Props) {
  const slides = useMemo(
    () =>
      markdown
        .split(/\n---\n/)
        .map((s) => s.trim())
        .filter(Boolean),
    [markdown],
  );
  const total = slides.length;

  const { entry, recordPage, markComplete } = useLessonProgress(lessonId);
  const [page, setPage] = useState(() =>
    Math.min(Math.max(entry?.lastPage ?? 1, 1), Math.max(total, 1)),
  );
  const notifiedRef = useRef(entry?.completed === true);

  // 閲覧ページを記録する。 90% での auto complete は `recordPage` (ストア側) が判定するので、
  // SlidesViewer と同じ挙動になるようここでしきい値を二重に持たない。
  useEffect(() => {
    if (total > 0) recordPage(page, total);
  }, [page, total, recordPage]);

  // 完了になったら 1 回だけ親へ通知する。
  useEffect(() => {
    if (entry?.completed && !notifiedRef.current) {
      notifiedRef.current = true;
      onComplete?.();
    }
  }, [entry?.completed, onComplete]);

  const go = useCallback(
    (next: number) => {
      setPage((p) => (total > 0 ? Math.min(Math.max(next, 1), total) : p));
    },
    [total],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, button, a, [contenteditable="true"]')) return;
      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          setPage((p) => Math.max(1, p - 1));
          break;
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault();
          setPage((p) => Math.min(total, p + 1));
          break;
        case 'Home':
          e.preventDefault();
          setPage(1);
          break;
        case 'End':
          e.preventDefault();
          setPage(total);
          break;
      }
    },
    [total],
  );

  if (total === 0) {
    return (
      <div className="prose-lms">
        <p className="text-ink-3">このレッスンにはスライドが登録されていません。</p>
      </div>
    );
  }

  const isCompleted = entry?.completed === true;
  const viewedCount = entry?.viewedPages?.length ?? 0;
  const progressPct = Math.round((viewedCount / total) * 100);

  return (
    <div>
      <div
        tabIndex={0}
        aria-label={`スライド ${page} / ${total}`}
        className={
          'prose-lms bg-card border border-border rounded-md px-6 py-5 min-h-[52vh] overflow-x-auto ' +
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60'
        }
        onKeyDown={onKeyDown}
      >
        <LessonMarkdown>{slides[page - 1] ?? ''}</LessonMarkdown>
      </div>

      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <Button variant="outline" onClick={() => go(page - 1)} disabled={page <= 1}>
          <ChevronLeft size={14} aria-hidden="true" />
          前へ
        </Button>
        <span
          className="text-[12.5px] text-ink-3 tabular-nums min-w-[56px] text-center"
          aria-live="polite"
        >
          {page} / {total}
        </span>
        <Button variant="outline" onClick={() => go(page + 1)} disabled={page >= total}>
          次へ
          <ChevronRight size={14} aria-hidden="true" />
        </Button>
        <div className="flex-1 min-w-[100px]">
          <Progress value={progressPct} tone="brand" />
        </div>
        {isCompleted ? (
          <span className="inline-flex items-center gap-1 text-success text-[12px]">
            <Check size={13} aria-hidden="true" />
            完了済み
          </span>
        ) : (
          <Button variant="accent" onClick={markComplete}>
            <Check size={13} aria-hidden="true" />
            完了にする
          </Button>
        )}
      </div>
      <div className="text-[11.5px] text-ink-3 mt-2">
        閲覧 {viewedCount} / {total} ページ ({progressPct}%)
      </div>
    </div>
  );
}

export default MarkdownSlides;
