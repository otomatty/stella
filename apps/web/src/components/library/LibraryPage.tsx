import { useEffect, useLayoutEffect, useRef, useState, type DragEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  LIBRARY_SHELF_FILTERS,
  type LibraryCapabilities,
  type LibraryShelfEntry,
  type LibraryShelfFilter,
  type LibraryShelfResponse,
} from "@stella/shared/library/types";
import { isApiConfigured } from "@/lib/api-client";
import { getLibraryCapabilities, getShelf } from "@/lib/library-api";
import { shelfColumns, shelfProgress, shelfRows } from "@/lib/library-shelf";
import { Book, Headphones, Star, Upload, Video } from "@/lib/icons";
import { useAppShell } from "@/components/shell/app-shell-context";
import { StatusScreen } from "@/components/common/StatusScreen";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { BookCover } from "./BookCover";
import { ImportDialog } from "./ImportDialog";

const FILTER_LABEL: Record<LibraryShelfFilter, string> = {
  all: "すべて",
  reading: "読書中",
  unread: "未読",
  finished: "読了",
  favorite: "お気に入り",
};

function message(error: unknown): string {
  return error instanceof Error ? error.message : "本棚を取得できませんでした";
}

export function LibraryPage() {
  const { currentUserId, tenantId, backendEnabled } = useAppShell();
  if (!backendEnabled || !isApiConfigured())
    return (
      <StatusScreen
        code=""
        icon={Book}
        title="本棚の接続が未設定です"
        description="STELLAに接続してログインすると、自分の本棚を利用できます。"
      />
    );
  if (!currentUserId) return null;
  return <Shelf key={`${tenantId}:${currentUserId}`} />;
}

/** 幅を測って、棚 1 段に並べる冊数を決める。 */
function useShelfColumns() {
  const ref = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(5);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setColumns(shelfColumns(element.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, columns };
}

function Shelf() {
  const [capabilities, setCapabilities] = useState<LibraryCapabilities | null>(null);
  const [filter, setFilter] = useState<LibraryShelfFilter>("all");
  const [shelf, setShelf] = useState<LibraryShelfResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const { ref, columns } = useShelfColumns();

  useEffect(() => {
    const controller = new AbortController();
    void version; // 取り込み・再読み込みのあとに取り直す。
    setError(null);
    void (async () => {
      try {
        const caps = await getLibraryCapabilities(controller.signal);
        if (controller.signal.aborted) return;
        setCapabilities(caps);
        if (!caps.enabled) return;
        const response = await getShelf(filter, controller.signal);
        if (!controller.signal.aborted) setShelf(response);
      } catch (err) {
        if (!controller.signal.aborted) setError(message(err));
      }
    })();
    return () => controller.abort();
  }, [version, filter]);

  if (capabilities && !capabilities.enabled)
    return (
      <StatusScreen
        code=""
        icon={Book}
        title="本棚は現在利用できません"
        description="利用できるようになるまでお待ちください。"
      />
    );

  const pick = (files: FileList | null) => {
    const chosen = files?.[0];
    if (chosen) setFile(chosen);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files);
  };
  const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes("Files");

  return (
    <section
      aria-label="本棚"
      className="relative mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6"
      onDragEnter={(event) => {
        if (hasFiles(event)) setDragging(true);
      }}
      onDragOver={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">本棚</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            本の zip を開くと、表紙・本文・音声・動画がまとめて並びます。
          </p>
        </div>
        <Button
          variant="primary"
          disabled={!capabilities?.enabled}
          onClick={() => input.current?.click()}
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          本を追加
        </Button>
        <input
          ref={input}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          aria-label="本の zip を選ぶ"
          onChange={(event) => {
            pick(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as LibraryShelfFilter)}>
        <TabsList aria-label="絞り込み">
          {LIBRARY_SHELF_FILTERS.map((value) => (
            <TabsTrigger key={value} value={value}>
              {FILTER_LABEL[value]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <p>{error}</p>
          <Button onClick={() => setVersion((v) => v + 1)}>再読み込み</Button>
        </div>
      ) : null}

      <div ref={ref} className="w-full">
        {!shelf && !error ? (
          <div role="status" aria-label="本棚を読み込み中" className="flex gap-5">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="aspect-[2/3] w-24" />
            ))}
          </div>
        ) : null}
        {shelf && shelf.entries.length === 0 ? (
          <EmptyShelf filtered={filter !== "all"} onPick={() => input.current?.click()} />
        ) : null}
        {shelf && shelf.entries.length > 0 ? (
          <div className="flex flex-col gap-9 rounded-2xl border border-border bg-card px-3 pb-5 pt-6 shadow-sm sm:px-6">
            {shelfRows(shelf.entries, columns).map((row) => (
              <div key={row[0]?.book.id}>
                <ul
                  className="grid items-end gap-x-5 px-1"
                  style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                >
                  {row.map((entry) => (
                    <ShelfBook key={entry.book.id} entry={entry} />
                  ))}
                </ul>
                {/* 棚板 */}
                <div
                  aria-hidden="true"
                  className="-mx-1.5 h-3 rounded-[4px] border-t border-border-strong bg-gradient-to-b from-border-2 to-border-strong shadow-[0_12px_14px_-10px_rgba(0,0,0,0.45)] sm:-mx-3"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {dragging ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand bg-background/85 text-sm font-semibold"
        >
          ここに本の zip をドロップ
        </div>
      ) : null}

      <ImportDialog
        file={file}
        onClose={() => setFile(null)}
        onImported={() => setVersion((v) => v + 1)}
      />
    </section>
  );
}

function ShelfBook({ entry }: { entry: LibraryShelfEntry }) {
  const { book } = entry;
  const importing = book.revision === 0;
  const progress = shelfProgress(entry);
  return (
    <li className="min-w-0">
      <Link
        to="/library/$bookId"
        params={{ bookId: book.id }}
        className="group flex flex-col gap-1.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div
          className={cn(
            "relative transition-transform duration-150 group-hover:-translate-y-1",
            importing && "opacity-55",
          )}
        >
          <BookCover title={book.title} coverUrl={book.coverUrl} />
          {entry.favorite ? (
            <span className="absolute right-1 top-1 rounded-full bg-black/55 p-1 text-amber-300">
              <Star className="h-3 w-3 fill-current" aria-label="お気に入り" />
            </span>
          ) : null}
          {book.hasAudio || book.hasVideo ? (
            <span className="absolute bottom-1.5 left-2 flex gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-white">
              {book.hasAudio ? <Headphones className="h-3 w-3" aria-label="音声あり" /> : null}
              {book.hasVideo ? <Video className="h-3 w-3" aria-label="動画あり" /> : null}
            </span>
          ) : null}
          {entry.readingStatus === "reading" && progress > 0 ? (
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-black/30">
              <span className="block h-full bg-brand" style={{ width: `${progress * 100}%` }} />
            </span>
          ) : null}
        </div>
        <span className="line-clamp-2 text-xs font-medium leading-snug [overflow-wrap:anywhere]">
          {book.title}
        </span>
        <span className="line-clamp-1 text-[11px] text-muted-foreground">
          {importing ? "取り込みが途中です" : book.authors.join("、") || " "}
        </span>
      </Link>
    </li>
  );
}

function EmptyShelf({ filtered, onPick }: { filtered: boolean; onPick: () => void }) {
  if (filtered)
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">該当する本はありません。</p>
    );
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border-2 px-6 py-14 text-center hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      <span className="text-sm font-semibold">本棚に本を追加しましょう</span>
      <span className="max-w-md text-xs text-muted-foreground">
        本の zip をここにドロップするか、ここを押して選んでください。zip は本文
        (Markdown)・朗読の音声・解説の動画をまとめた本棚の形式 (book.json 入り) で作ります。
      </span>
    </button>
  );
}
