import { useEffect, useState, type FormEvent } from "react";
import type {
  LibraryCapabilities,
  LibraryShelfEntry,
  LibraryShelfResponse,
  LibraryReadingStatus,
  LibraryBookKind,
} from "@stella/shared/library/types";
import { apiFetch, isApiConfigured } from "@/lib/api-client";
import { Book } from "@/lib/icons";
import { useAppShell } from "@/components/shell/app-shell-context";
import { StatusScreen } from "@/components/common/StatusScreen";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardActions,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
const READING: Record<LibraryReadingStatus, string> = {
  unread: "未読",
  reading: "読書中",
  finished: "読了",
  archived: "保管",
};
const PROCESSING: Record<LibraryShelfEntry["book"]["status"], string> = {
  draft: "書籍情報のみ",
  uploading: "PDF送信中",
  processing: "本文を準備中",
  ready: "本文準備済み",
  failed: "処理失敗",
  deleting: "削除中",
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
  return <LibraryShelf key={`${tenantId}:${currentUserId}`} />;
}
function LibraryShelf() {
  const [capabilities, setCapabilities] = useState<LibraryCapabilities | null>(null);
  const [shelf, setShelf] = useState<LibraryShelfResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [offset, setOffset] = useState(0);
  const [editor, setEditor] = useState<LibraryShelfEntry | "new" | null>(null);
  const [deleting, setDeleting] = useState<LibraryShelfEntry | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void version; // Explicit refresh after a mutation or a retry.
    setError(null);
    setShelf(null);
    void (async () => {
      try {
        const caps = await apiFetch<LibraryCapabilities>("/api/library/capabilities", {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setCapabilities(caps);
        if (caps.enabled) {
          const response = await apiFetch<LibraryShelfResponse>(
            `/api/library/mine?limit=30&offset=${offset}`,
            { signal: controller.signal },
          );
          if (!controller.signal.aborted) setShelf(response);
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(message(err));
      }
    })();
    return () => controller.abort();
  }, [version, offset]);
  const refresh = () => setVersion((value) => value + 1);
  async function toggleFavorite(entry: LibraryShelfEntry) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/library/shelf/${entry.book.id}`, {
        method: "PUT",
        body: { favorite: !entry.favorite },
      });
      refresh();
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  async function deleteBook() {
    if (!deleting) return;
    setBusy(true);
    setDeleteError(null);
    try {
      await apiFetch(`/api/library/books/${deleting.book.id}`, { method: "DELETE" });
      setDeleting(null);
      setOffset(0);
      refresh();
    } catch (error) {
      setDeleteError(message(error));
    } finally {
      setBusy(false);
    }
  }
  if (capabilities && !capabilities.enabled)
    return (
      <StatusScreen
        code=""
        icon={Book}
        title="本棚は現在利用できません"
        description="利用できるようになるまでお待ちください。"
      />
    );
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">個人の本棚</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            自分の本と、読書状態・お気に入り・タグを管理します。
          </p>
        </div>
        <Button
          variant="primary"
          disabled={!capabilities?.metadata || busy}
          onClick={() => setEditor("new")}
        >
          書籍情報を登録
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        PDFの登録と読み上げは準備中です。今はタイトルや著者を登録して、本棚を整理できます。
      </p>
      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3">
          <p>{error}</p>
          <Button onClick={refresh}>再読み込み</Button>
        </div>
      ) : null}
      {!shelf && !error ? (
        <div role="status" aria-label="本棚を読み込み中">
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}
      {shelf?.total === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>本棚に本を追加しましょう</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              「書籍情報を登録」から、読みたい本のタイトルを追加できます。
            </p>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {shelf?.entries.map((entry) => (
          <Card key={entry.book.id}>
            <CardHeader>
              <div className="min-w-0 flex-1">
                <CardTitle className="break-words">{entry.book.title}</CardTitle>
                <CardDescription>{entry.book.author || "著者未登録"}</CardDescription>
              </div>
              <Badge>{READING[entry.readingStatus]}</Badge>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <p className="text-xs text-muted-foreground">
                  {PROCESSING[entry.book.status]} · 自分のみ
                </p>
                <div className="flex flex-wrap gap-1">
                  {entry.tags.map((tag) => (
                    <Badge key={tag} variant="default">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <CardActions className="ml-0 flex-wrap">
                  <Button
                    disabled={busy}
                    aria-pressed={entry.favorite}
                    onClick={() => void toggleFavorite(entry)}
                  >
                    {entry.favorite ? "お気に入り解除" : "お気に入り"}
                  </Button>
                  <Button disabled={busy} onClick={() => setEditor(entry)}>
                    編集
                  </Button>
                  <Button disabled={busy} variant="ghost" onClick={() => setDeleting(entry)}>
                    削除
                  </Button>
                </CardActions>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {shelf && shelf.total > shelf.limit ? (
        <div className="flex items-center justify-center gap-3">
          <Button
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - shelf.limit))}
          >
            前へ
          </Button>
          <span className="text-sm">
            {offset + 1}〜{Math.min(offset + shelf.limit, shelf.total)} / {shelf.total}冊
          </span>
          <Button
            disabled={offset + shelf.limit >= shelf.total}
            onClick={() => setOffset(offset + shelf.limit)}
          >
            次へ
          </Button>
        </div>
      ) : null}
      <Dialog
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editor === "new" ? "書籍情報を登録" : "書籍情報を編集"}</DialogTitle>
            <DialogDescription>この本と読書の記録は、自分だけが閲覧できます。</DialogDescription>
          </DialogHeader>
          {editor ? (
            <BookForm
              key={editor === "new" ? "new" : editor.book.id}
              entry={editor === "new" ? null : editor}
              onSaved={() => {
                setEditor(null);
                setOffset(0);
                refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setDeleting(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>この本を削除しますか？</DialogTitle>
            <DialogDescription>
              「{deleting?.book.title}」と、この本に紐付く自分の記録を削除します。
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <p role="alert" className="text-sm text-destructive">
              {deleteError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              disabled={busy}
              onClick={() => {
                setDeleting(null);
                setDeleteError(null);
              }}
            >
              キャンセル
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => void deleteBook()}>
              削除する
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function BookForm({ entry, onSaved }: { entry: LibraryShelfEntry | null; onSaved: () => void }) {
  const [title, setTitle] = useState(entry?.book.title ?? "");
  const [author, setAuthor] = useState(entry?.book.author ?? "");
  const [kind, setKind] = useState<LibraryBookKind>(entry?.book.kind ?? "commercial");
  const [readingStatus, setReadingStatus] = useState<LibraryReadingStatus>(
    entry?.readingStatus ?? "unread",
  );
  const [tags, setTags] = useState(entry?.tags.join(", ") ?? "");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTags = [
      ...new Set(
        tags
          .split(/[,、]/)
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ];
    // Same limits as parseShelfUpdate; checked before the book PATCH so a bad tag cannot half-save.
    if (nextTags.length > 20 || nextTags.some((tag) => tag.length > 40)) {
      setError("タグは40文字以内、20個までです");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (!entry) {
        await apiFetch("/api/library/books", {
          method: "POST",
          body: { title, author: author || null, kind },
        });
      } else {
        // Send only edited fields so a stale tab does not overwrite another tab's save.
        const book: Record<string, unknown> = {};
        if (title !== entry.book.title) book.title = title;
        if ((author || null) !== entry.book.author) book.author = author || null;
        if (kind !== entry.book.kind) book.kind = kind;
        const shelf: Record<string, unknown> = {};
        if (readingStatus !== entry.readingStatus) shelf.readingStatus = readingStatus;
        if (nextTags.join("\n") !== entry.tags.join("\n")) shelf.tags = nextTags;
        if (Object.keys(book).length)
          await apiFetch(`/api/library/books/${entry.book.id}`, { method: "PATCH", body: book });
        if (Object.keys(shelf).length)
          await apiFetch(`/api/library/shelf/${entry.book.id}`, { method: "PUT", body: shelf });
      }
      onSaved();
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="library-title">タイトル</Label>
        <Input
          id="library-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          maxLength={200}
          disabled={busy}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="library-author">著者（任意）</Label>
        <Input
          id="library-author"
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          maxLength={200}
          disabled={busy}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="library-kind">種別</Label>
        <select
          id="library-kind"
          className="rounded-md border border-border bg-background p-2 text-sm"
          value={kind}
          onChange={(event) => setKind(event.target.value as LibraryBookKind)}
          disabled={busy}
        >
          <option value="commercial">市販書籍</option>
          <option value="in_house">自社の資料</option>
        </select>
      </div>
      {entry ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="library-status">読書状態</Label>
            <select
              id="library-status"
              className="rounded-md border border-border bg-background p-2 text-sm"
              value={readingStatus}
              onChange={(event) => setReadingStatus(event.target.value as LibraryReadingStatus)}
              disabled={busy}
            >
              {Object.entries(READING).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="library-tags">タグ（カンマ区切り）</Label>
            <Input
              id="library-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              disabled={busy}
            />
          </div>
        </>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={busy || !title.trim()}>
          {busy ? "保存中…" : "保存"}
        </Button>
      </div>
    </form>
  );
}
