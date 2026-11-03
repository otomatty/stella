import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { LibraryBookDetail, LibraryReadingStatus } from "@stella/shared/library/types";
import { formatBytes } from "@stella/shared/library/book-package";
import { deleteBook, getBook, updateShelf } from "@/lib/library-api";
import { Book, Check, ChevronLeft, Headphones, Star, Upload, Video } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusScreen } from "@/components/common/StatusScreen";
import { BookCover } from "./BookCover";
import { ImportDialog } from "./ImportDialog";

const READING: Record<LibraryReadingStatus, string> = {
  unread: "未読",
  reading: "読書中",
  finished: "読了",
  archived: "保管",
};

function message(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function LibraryBookPage({ bookId }: { bookId: string }) {
  const [detail, setDetail] = useState<LibraryBookDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [version, setVersion] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    void version;
    setError(null);
    getBook(bookId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setDetail(result);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof Error && "status" in err && err.status === 404) setNotFound(true);
        else setError(message(err, "本を取得できませんでした"));
      });
    return () => controller.abort();
  }, [bookId, version]);

  if (notFound)
    return (
      <StatusScreen
        code="404"
        icon={Book}
        title="本が見つかりません"
        description="削除されたか、別の人の本です。"
        actions={
          <Button asChild>
            <Link to="/library">本棚へ戻る</Link>
          </Button>
        }
      />
    );

  async function change(body: Parameters<typeof updateShelf>[1]) {
    setBusy(true);
    setError(null);
    try {
      const { entry } = await updateShelf(bookId, body);
      setDetail((current) => (current ? { ...current, entry } : current));
    } catch (err) {
      setError(message(err, "保存できませんでした"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteBook(bookId);
      await navigate({ to: "/library" });
    } catch (err) {
      setError(message(err, "削除できませんでした"));
      setBusy(false);
    }
  }

  const entry = detail?.entry;
  const book = entry?.book;
  const resume =
    detail?.chapters.find((chapter) => chapter.id === entry?.lastChapterId) ?? detail?.chapters[0];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
      <Link
        to="/library"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        本棚
      </Link>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {!detail || !entry || !book ? (
        !error ? (
          <div role="status" aria-label="本を読み込み中" className="flex gap-5">
            <Skeleton className="aspect-[2/3] w-32" />
            <Skeleton className="h-24 flex-1" />
          </div>
        ) : null
      ) : (
        <>
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="w-36 shrink-0 self-center sm:self-start">
              <BookCover title={book.title} coverUrl={book.coverUrl} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div>
                <h1 className="text-xl font-semibold [overflow-wrap:anywhere]">{book.title}</h1>
                {book.authors.length ? (
                  <p className="mt-1 text-sm text-muted-foreground">{book.authors.join("、")}</p>
                ) : null}
              </div>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{book.chapterCount} 章</span>
                {book.hasAudio ? (
                  <span className="inline-flex items-center gap-1">
                    <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
                    音声
                  </span>
                ) : null}
                {book.hasVideo ? (
                  <span className="inline-flex items-center gap-1">
                    <Video className="h-3.5 w-3.5" aria-hidden="true" />
                    動画
                  </span>
                ) : null}
                <span>{formatBytes(book.totalBytes)}</span>
                <span>
                  {entry.progress.completedChapters} / {entry.progress.totalChapters} 章済み
                </span>
              </p>
              {book.description ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{book.description}</p>
              ) : null}
              {book.revision === 0 ? (
                <p className="rounded-md border border-border-2 bg-sunken p-3 text-sm">
                  取り込みが途中で止まっています。同じ zip
                  をもう一度開くと、送り終えたファイルを飛ばして続きから送ります。
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {resume && book.revision > 0 ? (
                  <Button variant="primary" asChild>
                    <Link
                      to="/library/$bookId/$chapterId"
                      params={{ bookId: book.id, chapterId: resume.id }}
                    >
                      <Book className="h-4 w-4" aria-hidden="true" />
                      {entry.lastChapterId ? "続きから" : "読みはじめる"}
                    </Link>
                  </Button>
                ) : null}
                <Button
                  disabled={busy}
                  aria-pressed={entry.favorite}
                  onClick={() => void change({ favorite: !entry.favorite })}
                >
                  <Star
                    className={entry.favorite ? "h-4 w-4 fill-current text-amber-500" : "h-4 w-4"}
                    aria-hidden="true"
                  />
                  {entry.favorite ? "お気に入り解除" : "お気に入り"}
                </Button>
                <Button disabled={busy} onClick={() => input.current?.click()}>
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  {book.revision === 0 ? "zip を開き直す" : "更新版を読み込む"}
                </Button>
                <input
                  ref={input}
                  type="file"
                  accept=".zip,application/zip"
                  className="hidden"
                  aria-label="本の zip を選ぶ"
                  onChange={(event) => {
                    const chosen = event.target.files?.[0];
                    if (chosen) setFile(chosen);
                    event.target.value = "";
                  }}
                />
                <Button variant="ghost" disabled={busy} onClick={() => setConfirmDelete(true)}>
                  削除
                </Button>
              </div>
              <PersonalFields
                key={`${entry.readingStatus}:${entry.tags.join("\n")}`}
                status={entry.readingStatus}
                tags={entry.tags}
                busy={busy}
                onSave={(body) => void change(body)}
              />
            </div>
          </div>

          {detail.chapters.length ? (
            <section aria-labelledby="chapters-heading" className="flex flex-col gap-2">
              <h2 id="chapters-heading" className="text-base font-semibold">
                章
              </h2>
              <ol className="divide-y divide-border rounded-xl border border-border bg-card">
                {detail.chapters.map((chapter) => (
                  <li key={chapter.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground">
                      {chapter.position}
                    </span>
                    <Link
                      to="/library/$bookId/$chapterId"
                      params={{ bookId: book.id, chapterId: chapter.id }}
                      className="min-w-0 flex-1 text-sm font-medium hover:underline [overflow-wrap:anywhere]"
                    >
                      {chapter.title}
                    </Link>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {chapter.audioPath ? (
                        <Headphones className="h-4 w-4" aria-label="音声あり" />
                      ) : null}
                      {chapter.videoPath ? (
                        <Video className="h-4 w-4" aria-label="動画あり" />
                      ) : null}
                      {chapter.state.completed ? (
                        <span className="inline-flex items-center gap-1 text-xs text-success">
                          <Check className="h-4 w-4" aria-hidden="true" />
                          済み
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </>
      )}

      <ImportDialog
        file={file}
        expectedPackageId={book?.packageId}
        onClose={() => setFile(null)}
        onImported={() => setVersion((v) => v + 1)}
      />

      <Dialog open={confirmDelete} onOpenChange={(open) => !busy && setConfirmDelete(open)}>
        <DialogContent className="w-[min(calc(100vw-2rem),460px)]">
          <DialogHeader>
            <DialogTitle>この本を削除しますか？</DialogTitle>
            <DialogDescription>
              「{book?.title}」の本文・音声・動画と、読書の記録を削除します。元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 px-6 pb-6">
            <Button disabled={busy} onClick={() => setConfirmDelete(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => void remove()}>
              削除する
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PersonalFields({
  status,
  tags,
  busy,
  onSave,
}: {
  status: LibraryReadingStatus;
  tags: string[];
  busy: boolean;
  onSave: (body: { readingStatus?: LibraryReadingStatus; tags?: string[] }) => void;
}) {
  const [text, setText] = useState(tags.join(", "));
  const [error, setError] = useState<string | null>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = [
      ...new Set(
        text
          .split(/[,、]/)
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ];
    if (next.length > 20 || next.some((tag) => tag.length > 40)) {
      setError("タグは40文字以内、20個までです");
      return;
    }
    setError(null);
    onSave({ tags: next });
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="library-status">読書状態</Label>
        <select
          id="library-status"
          className="h-8 rounded-md border border-border-2 bg-background px-2 text-sm"
          value={status}
          disabled={busy}
          onChange={(event) =>
            onSave({ readingStatus: event.target.value as LibraryReadingStatus })
          }
        >
          {Object.entries(READING).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <Label htmlFor="library-tags">タグ（カンマ区切り）</Label>
        <Input
          id="library-tags"
          value={text}
          disabled={busy}
          onChange={(event) => setText(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={busy || text === tags.join(", ")}>
        タグを保存
      </Button>
      {error ? (
        <p role="alert" className="w-full text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
