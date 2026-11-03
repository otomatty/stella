import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight, { type Options as RehypeHighlightOptions } from "rehype-highlight";
import bash from "highlight.js/lib/languages/bash";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import typescript from "highlight.js/lib/languages/typescript";
import type { LibraryBookDetail, LibraryChapter } from "@stella/shared/library/types";
import { resolveMarkdownImage } from "@stella/shared/library/book-package";
import {
  bookContentPath,
  getBook,
  getChapterText,
  saveChapterState,
  updateShelf,
} from "@/lib/library-api";
import { useLibraryMediaUrl } from "@/lib/library-media";
import { formatClock, resumePosition } from "@/lib/library-shelf";
import {
  Book,
  Check,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Video,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusScreen } from "@/components/common/StatusScreen";

const highlightOptions = {
  aliases: { typescript: ["ts"], javascript: ["js"], bash: ["sh"] },
  languages: { typescript, javascript, bash, json },
} satisfies RehypeHighlightOptions;

const SAVE_EVERY_MS = 15_000;
/** 止めたまま位置を動かしてから保存するまでの待ち (つまみを動かしている間は送らない)。 */
const SEEK_SAVE_DELAY_MS = 1_000;
const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

type Saver = (body: { audioSec?: number; videoSec?: number; completed?: boolean }) => void;

interface ColumnBox {
  left: number;
  width: number;
}

/**
 * 本文の列の画面上の位置と幅。固定した朗読のバーをこれに合わせる (サイドバーの開閉・
 * 画面幅の変化で列が動くので、列と親の大きさを見張る)。
 */
function useColumnBox() {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<ColumnBox | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const rect = element.getBoundingClientRect();
      setBox((current) =>
        current && current.left === rect.left && current.width === rect.width
          ? current
          : { left: rect.left, width: rect.width },
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    if (element.parentElement) observer.observe(element.parentElement);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  return { ref, box };
}

/** 位置の保存。端末の時刻を付け、古い送信でサーバーの位置を巻き戻さない。失敗は次の保存に任せる。 */
function useChapterSaver(bookId: string, chapterId: string): Saver {
  return useCallback(
    (body) => {
      void saveChapterState(bookId, chapterId, { ...body, clientUpdatedAt: Date.now() }).catch(
        () => undefined,
      );
    },
    [bookId, chapterId],
  );
}

export function LibraryChapterPage({ bookId, chapterId }: { bookId: string; chapterId: string }) {
  const [detail, setDetail] = useState<LibraryBookDetail | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    getBook(bookId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setDetail(result);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setFailed(error instanceof Error ? error.message : "本を取得できませんでした");
      });
    return () => controller.abort();
  }, [bookId]);
  // 開いた章を「続きから」の行き先にする。
  useEffect(() => {
    void updateShelf(bookId, { lastChapterId: chapterId, clientUpdatedAt: Date.now() }).catch(
      () => undefined,
    );
  }, [bookId, chapterId]);

  const index = detail?.chapters.findIndex((chapter) => chapter.id === chapterId) ?? -1;
  const chapter = index >= 0 ? detail?.chapters[index] : undefined;
  if (failed || (detail && !chapter))
    return (
      <StatusScreen
        code="404"
        icon={Book}
        title="章が見つかりません"
        description={failed ?? "本が更新されて、この章が無くなった可能性があります。"}
        actions={
          <Button asChild>
            <Link to="/library/$bookId" params={{ bookId }}>
              本へ戻る
            </Link>
          </Button>
        }
      />
    );
  if (!detail || !chapter)
    return (
      <div role="status" aria-label="章を読み込み中" className="mx-auto w-full max-w-3xl p-6">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  return (
    <ChapterView
      key={`${bookId}:${chapter.id}:${detail.entry.book.revision}`}
      detail={detail}
      chapter={chapter}
      previous={detail.chapters[index - 1]}
      next={detail.chapters[index + 1]}
    />
  );
}

function ChapterView({
  detail,
  chapter,
  previous,
  next,
}: {
  detail: LibraryBookDetail;
  chapter: LibraryChapter;
  previous?: LibraryChapter;
  next?: LibraryChapter;
}) {
  const book = detail.entry.book;
  const save = useChapterSaver(book.id, chapter.id);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [completed, setCompleted] = useState(chapter.state.completed);
  const column = useColumnBox();
  const markCompleted = () => {
    setCompleted(true);
    save({ completed: true });
  };

  return (
    <div
      ref={column.ref}
      className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 pb-32 md:p-6 md:pb-32"
    >
      <nav className="flex items-center justify-between gap-3 text-sm" aria-label="章の移動">
        <Link
          to="/library/$bookId"
          params={{ bookId: book.id }}
          className="inline-flex min-w-0 items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{book.title}</span>
        </Link>
        <span className="shrink-0 text-xs text-muted-foreground">
          {chapter.position} / {detail.chapters.length}
        </span>
      </nav>
      <h1 className="text-xl font-semibold [overflow-wrap:anywhere]">{chapter.title}</h1>

      {chapter.videoPath ? (
        <VideoPanel
          ref={videoRef}
          path={bookContentPath(book.id, chapter.videoPath)}
          savedSec={chapter.state.videoSec}
          onPlay={() => audioRef.current?.pause()}
          onSave={(videoSec) => save({ videoSec })}
        />
      ) : null}

      <ChapterText bookId={book.id} textPath={chapter.textPath} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        {previous ? (
          <Button asChild>
            <Link
              to="/library/$bookId/$chapterId"
              params={{ bookId: book.id, chapterId: previous.id }}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              前の章
            </Link>
          </Button>
        ) : (
          <span />
        )}
        <Button
          variant={completed ? "default" : "primary"}
          disabled={completed}
          onClick={markCompleted}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {completed ? "この章は済み" : "この章を読み終えた"}
        </Button>
        {next ? (
          <Button asChild>
            <Link to="/library/$bookId/$chapterId" params={{ bookId: book.id, chapterId: next.id }}>
              次の章
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <span />
        )}
      </div>

      {chapter.audioPath ? (
        <AudioBar
          ref={audioRef}
          path={bookContentPath(book.id, chapter.audioPath)}
          savedSec={chapter.state.audioSec}
          title={chapter.title}
          bookTitle={book.title}
          authors={book.authors}
          coverUrl={book.coverUrl}
          box={column.box}
          onPlay={() => videoRef.current?.pause()}
          onSave={(audioSec) => save({ audioSec })}
          onEnded={markCompleted}
        />
      ) : null}
    </div>
  );
}

function ChapterText({ bookId, textPath }: { bookId: string; textPath: string }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    getChapterText(bookId, textPath, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setText(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [bookId, textPath]);
  if (error)
    return (
      <p role="alert" className="text-sm text-destructive">
        本文を読み込めませんでした。
      </p>
    );
  if (text === null) return <Skeleton className="h-64 w-full" />;
  const components: Components = {
    img: ({ src, alt }) => <BookImage bookId={bookId} textPath={textPath} src={src} alt={alt} />,
  };
  return (
    <article className="prose-lms max-w-none text-[15px] leading-8">
      {/* 生の HTML は描かない (react-markdown は rehype-raw なしでエスケープする)。 */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, highlightOptions]]}
        components={components}
      >
        {text}
      </ReactMarkdown>
    </article>
  );
}

/** 本文の画像。本の中の `images/` の画像だけを読み、外部の URL は説明の文字だけを出す。 */
function BookImage({
  bookId,
  textPath,
  src,
  alt,
}: {
  bookId: string;
  textPath: string;
  src: unknown;
  alt?: string;
}) {
  const path = typeof src === "string" ? resolveMarkdownImage(textPath, src) : null;
  const media = useLibraryMediaUrl(path ? bookContentPath(bookId, path) : null);
  if (!path || media.failed)
    return <span className="text-sm text-muted-foreground">[図: {alt || "画像"}]</span>;
  if (!media.url)
    return <span className="inline-block h-32 w-full animate-pulse rounded bg-sunken" />;
  return (
    <img src={media.url} alt={alt ?? ""} loading="lazy" className="h-auto max-w-full rounded" />
  );
}

/**
 * 定期・一時停止・止めたままの位置の移動・離脱のたびに位置を保存する。
 * `savedSec` はサーバーにある位置 (開いた直後の続きからの移動では送らない)。
 */
function usePositionSaving(
  element: () => HTMLMediaElement | null,
  savedSec: number,
  onSave: (seconds: number) => void,
) {
  const last = useRef(0);
  // 親が描き直すたびに onSave は新しい関数になる。購読を張り直すと後始末の保存が連発するので、
  // 最新の関数は ref で持ち、購読は要素ごとに 1 回だけにする。
  const save = useRef(onSave);
  save.current = onSave;
  const sent = useRef(savedSec);
  useEffect(() => {
    const media = element();
    if (!media) return;
    let seekTimer: ReturnType<typeof setTimeout> | undefined;
    const saveNow = () => {
      clearTimeout(seekTimer);
      seekTimer = undefined;
      if (media.currentTime > 0) {
        save.current(media.currentTime);
        sent.current = media.currentTime;
      }
      last.current = Date.now();
    };
    const onTime = () => {
      if (!media.paused && Date.now() - last.current >= SAVE_EVERY_MS) saveNow();
    };
    // 止めたまま位置を動かしたとき (再生中は定期の保存が拾う)。つまみを動かす間は送らず、止まってから 1 回。
    const onSeeked = () => {
      if (!media.paused || Math.abs(media.currentTime - sent.current) < 1) return;
      clearTimeout(seekTimer);
      seekTimer = setTimeout(saveNow, SEEK_SAVE_DELAY_MS);
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") saveNow();
    };
    media.addEventListener("timeupdate", onTime);
    media.addEventListener("pause", saveNow);
    media.addEventListener("seeked", onSeeked);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      media.removeEventListener("timeupdate", onTime);
      media.removeEventListener("pause", saveNow);
      media.removeEventListener("seeked", onSeeked);
      document.removeEventListener("visibilitychange", onHidden);
      if (!media.paused || seekTimer !== undefined) saveNow();
    };
  }, [element]);
}

function VideoPanel({
  ref,
  path,
  savedSec,
  onPlay,
  onSave,
}: {
  ref: React.RefObject<HTMLVideoElement | null>;
  path: string;
  savedSec: number;
  onPlay: () => void;
  onSave: (seconds: number) => void;
}) {
  const media = useLibraryMediaUrl(path);
  const element = useCallback(() => ref.current, [ref]);
  usePositionSaving(element, savedSec, onSave);
  return (
    <section aria-label="解説動画" className="flex flex-col gap-2">
      <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold">
        <Video className="h-4 w-4" aria-hidden="true" />
        解説動画
      </h2>
      {media.failed ? (
        <p role="alert" className="text-sm text-destructive">
          動画を読み込めませんでした。
        </p>
      ) : (
        // 字幕は動画に焼き込む形式なので、別の字幕トラックは持たない。
        // biome-ignore lint/a11y/useMediaCaption: 字幕は動画の中に焼き込まれている
        <video
          ref={ref}
          src={media.url ?? undefined}
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full rounded-lg bg-black"
          onPlay={onPlay}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            video.currentTime = resumePosition(savedSec, video.duration);
          }}
          onEnded={(event) => onSave(event.currentTarget.duration)}
        />
      )}
    </section>
  );
}

function AudioBar({
  ref,
  path,
  savedSec,
  title,
  bookTitle,
  authors,
  coverUrl,
  box,
  onPlay,
  onSave,
  onEnded,
}: {
  ref: React.RefObject<HTMLAudioElement | null>;
  box: ColumnBox | null;
  path: string;
  savedSec: number;
  title: string;
  bookTitle: string;
  authors: string[];
  coverUrl: string | null;
  onPlay: () => void;
  onSave: (seconds: number) => void;
  onEnded: () => void;
}) {
  const media = useLibraryMediaUrl(path);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const element = useCallback(() => ref.current, [ref]);
  usePositionSaving(element, savedSec, onSave);

  const audio = () => ref.current;
  const seek = (seconds: number) => {
    const target = audio();
    if (!target) return;
    target.currentTime = Math.min(Math.max(0, seconds), target.duration || seconds);
  };
  const toggle = () => {
    const target = audio();
    if (!target) return;
    if (target.paused) void target.play().catch(() => undefined);
    else target.pause();
  };

  useEffect(() => {
    if (!playing || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: authors.join("、"),
      album: bookTitle,
      ...(coverUrl ? { artwork: [{ src: coverUrl, type: "image/jpeg" }] } : {}),
    });
  }, [playing, title, bookTitle, authors, coverUrl]);

  return (
    // 画面の下に固定し、本文の列と同じ位置・幅に置く (サイドバーに重ならない)。右下の AI ボタンを避ける。
    <div
      className="fixed bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85"
      style={box ? { left: box.left, width: box.width } : { left: 0, right: 0 }}
    >
      <div className="flex w-full flex-col gap-1.5 py-2.5 pl-4 pr-20 sm:pr-4 md:px-6">
        {/* 朗読はこの画面の本文そのものなので、本文が字幕の代わりになる。 */}
        {/* biome-ignore lint/a11y/useMediaCaption: 本文 (同じ画面) が朗読の書き起こし */}
        <audio
          ref={ref}
          src={media.url ?? undefined}
          preload="metadata"
          onPlay={() => {
            setPlaying(true);
            onPlay();
          }}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => {
            const target = event.currentTarget;
            setDuration(target.duration);
            target.currentTime = resumePosition(savedSec, target.duration);
            target.playbackRate = speed;
          }}
          onEnded={() => {
            setPlaying(false);
            onEnded();
          }}
        />
        <div className="flex items-center gap-2">
          <Headphones className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {media.failed ? "音声を読み込めませんでした" : `朗読 · ${title}`}
          </span>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            速度
            <select
              className="h-7 rounded-md border border-border-2 bg-background px-1 text-xs text-foreground"
              value={speed}
              onChange={(event) => {
                const value = Number(event.target.value);
                setSpeed(value);
                const target = audio();
                if (target) target.playbackRate = value;
              }}
            >
              {SPEEDS.map((value) => (
                <option key={value} value={value}>
                  {value}x
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="15秒戻る"
            disabled={!media.url}
            onClick={() => seek(time - 15)}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="primary"
            aria-label={playing ? "一時停止" : "再生"}
            disabled={!media.url}
            onClick={toggle}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="30秒進む"
            disabled={!media.url}
            onClick={() => seek(time + 30)}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <span className="w-12 text-right text-[11px] tabular-nums text-muted-foreground">
            {formatClock(time)}
          </span>
          <input
            type="range"
            aria-label="再生位置"
            min={0}
            max={Number.isFinite(duration) && duration > 0 ? duration : 0}
            step={1}
            value={Math.min(time, duration || 0)}
            disabled={!media.url || !duration}
            onChange={(event) => seek(Number(event.target.value))}
            className="min-w-0 flex-1 accent-[var(--brand)]"
          />
          <span className="w-12 text-[11px] tabular-nums text-muted-foreground">
            {formatClock(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
