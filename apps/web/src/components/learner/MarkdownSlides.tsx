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

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Options as RehypeHighlightOptions } from 'rehype-highlight';
import bash from 'highlight.js/lib/languages/bash';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import typescript from 'highlight.js/lib/languages/typescript';
// build_pptx.py の CODE_COLORS は GitHub Light をそのまま使っているので、
// 同じテーマを当てれば pptx とコードの配色が一致する。
import 'highlight.js/styles/github.css';
import './slides-skin.css';
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

/** alt の `w:950` を px 幅として読む。 無ければ build_pptx.py と同じ既定値 950。 */
function altWidth(alt: string | undefined): number {
  const m = alt ? /w:(\d+)/.exec(alt) : null;
  return m ? Number(m[1]) : 950;
}

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

/** slides.md で実際に使われている言語だけ登録する (common バンドル全部は要らない)。 */
const highlightOptions = {
  aliases: { typescript: ['ts'], javascript: ['js'], bash: ['sh'] },
  languages: { typescript, javascript, bash, json },
} satisfies RehypeHighlightOptions;

/** レッスン本文 markdown の共通描画。 text レッスンとスライド 1 枚の両方で使う。 */
export function LessonMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {children}
    </ReactMarkdown>
  );
}

// --- ここから下は build_pptx.py と対になる寸法。 変える前に向こうを確認すること。
const CANVAS_W = 1280; // SLIDE_W
const BODY_AVAIL_H = 615; // SLIDE_H - 60 - 45 (build_content の avail)
const SCALE_MAX = 1.45;
const SCALE_MIN = 0.8;

/**
 * manifest が本文に残した `<!-- _class: lead -->`。 見た目の型を読んだら本文から外す。
 *
 * react-markdown は rehype-raw なしだと生 HTML を「無視」ではなく「エスケープ」する
 * (`&lt;!-- _class: lead --&gt;` というテキストノードになる) ので、 渡す前に必ず落とす。
 */
const CLASS_DIRECTIVE = /<!--\s*_class:\s*(\w+)\s*-->/;

/**
 * スライド 1 枚。 pptx と同じ 1280x720 のキャンバスに描き、 親幅に合わせて縮小する。
 *
 * 本文の拡大率 (`--s`) は build_content() と同じく 1.45 から 0.05 刻みで下げて
 * 収まる値を探す。 あちらは文字数からの推定だが、 ここは実測なのでより正確。
 */
function SlideCanvas({
  source,
  header,
  pageNo,
}: {
  source: string;
  header: string;
  pageNo: number;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // 画像と Web フォントは後から載るので、 その都度倍率を測り直す。
  const [reflowTick, setReflowTick] = useState(0);

  const cls = CLASS_DIRECTIVE.exec(source)?.[1] ?? null;
  const isLead = cls === 'lead';
  const body = useMemo(() => source.replace(CLASS_DIRECTIVE, '').trimStart(), [source]);

  const components = useMemo<Components>(
    () => ({
      ...markdownComponents,
      img: ({ src, alt, title }) => (
        <img
          src={typeof src === 'string' ? resolveImageSrc(src) : undefined}
          alt={alt && !MARP_SIZE_ALT.test(alt.trim()) ? alt : ''}
          title={title}
          // pptx と同じく alt の `w:` を px 幅として使い、 本文倍率に連動させる。
          style={{ width: `calc(${altWidth(alt)}px * var(--s))` }}
          onLoad={() => setReflowTick((t) => t + 1)}
        />
      ),
    }),
    [],
  );

  // キャンバス全体を親幅に合わせる。
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const slide = slideRef.current;
    if (!stage || !slide) return;
    const apply = () =>
      slide.style.setProperty('--fit', String(stage.clientWidth / CANVAS_W));
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // Web フォントは index.html で `display=swap` 指定なので、 初回描画時は
  // フォールバック字形で測ってしまうことがある。 差し替わると幅も行数も変わり、
  // .sf-slide は overflow:hidden なので黙って切れる。 読み込み完了後に測り直す。
  // (既に読み込み済みなら ready は即座に解決するので、 測り直しが 1 回増えるだけ)
  useEffect(() => {
    let alive = true;
    void document.fonts?.ready.then(() => {
      if (alive) setReflowTick((t) => t + 1);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 本文の拡大率。 lead は固定サイズなので測らない。
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || isLead) return;
    // コードは折り返さないので、 高さだけでなく横のはみ出しも見る。
    // `pre code` も見るのは、 ハイライトのテーマが code 側をスクロール枠にすると
    // はみ出しが pre に伝わらなくなるため (slides-skin.css で戻してはいる)。
    const overflows = () =>
      el.scrollHeight > BODY_AVAIL_H ||
      Array.from(el.querySelectorAll('pre, pre code')).some(
        (node) => node.scrollWidth > node.clientWidth,
      );
    let scale = SCALE_MAX;
    el.style.setProperty('--s', String(scale));
    while (scale > SCALE_MIN && overflows()) {
      scale = Math.round((scale - 0.05) * 100) / 100;
      el.style.setProperty('--s', String(scale));
    }
  }, [body, isLead, reflowTick]);

  return (
    <div ref={stageRef} className="sf-stage">
      <div
        ref={slideRef}
        className={
          'sf-slide' + (isLead ? ' is-lead' : cls === 'summary' ? ' is-summary' : '')
        }
      >
        {header ? <div className="sf-header">{header}</div> : null}
        <div ref={bodyRef} className="sf-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[[rehypeHighlight, highlightOptions]]}
            components={components}
          >
            {body}
          </ReactMarkdown>
        </div>
        <div className="sf-pageno">{pageNo}</div>
      </div>
    </div>
  );
}

interface Props {
  lessonId: string;
  markdown: string;
  /** スライド左上に出す見出し (pptx の front-matter `header` に相当)。 */
  header?: string;
  onComplete?: () => void;
}

export function MarkdownSlides({ lessonId, markdown, header = '', onComplete }: Props) {
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
        className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
        onKeyDown={onKeyDown}
      >
        <SlideCanvas
          key={page}
          source={slides[page - 1] ?? ''}
          header={header}
          pageNo={page}
        />
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
