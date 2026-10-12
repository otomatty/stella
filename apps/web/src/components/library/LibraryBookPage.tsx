import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { Link } from "@tanstack/react-router";
import type {
  LibraryBook,
  LibraryCapabilities,
  LibraryChapterSummary,
  LibraryJob,
  LibraryPdf,
} from "@stella/shared/library/types";
import { apiFetch } from "@/lib/api-client";
import { uploadBookPdfs, type UploadProgress } from "@/lib/library-upload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PROCESSING } from "./LibraryPage";

interface BookState {
  book: LibraryBook;
  jobs: LibraryJob[];
  pdfs: LibraryPdf[];
  chapters: LibraryChapterSummary[];
}
// Poll only while work is in flight; a hidden tab polls less often.
const POLL_MS = 3000,
  HIDDEN_POLL_MS = 15000;

function message(error: unknown): string {
  return error instanceof Error ? error.message : "書籍を取得できませんでした";
}
const fileSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))}KB`
    : `${(bytes / 1024 / 1024).toFixed(1)}MB`;

export function LibraryBookPage({ bookId }: { bookId: string }) {
  const [state, setState] = useState<BookState | null>(null);
  const [capabilities, setCapabilities] = useState<LibraryCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [upload, setUpload] = useState<UploadProgress | null>(null);

  const load = useCallback(async () => {
    const base = `/api/library/books/${bookId}`;
    const [caps, { book, jobs }, { pdfs }] = await Promise.all([
      apiFetch<LibraryCapabilities>("/api/library/capabilities"),
      apiFetch<{ book: LibraryBook; jobs: LibraryJob[] }>(`${base}/jobs`),
      apiFetch<{ pdfs: LibraryPdf[] }>(`${base}/pdfs`),
    ]);
    const chapters =
      book.status === "ready"
        ? (await apiFetch<{ chapters: LibraryChapterSummary[] }>(`${base}/chapters`)).chapters
        : [];
    setCapabilities(caps);
    setState({ book, jobs, pdfs, chapters });
  }, [bookId]);

  useEffect(() => {
    load().catch((err) => setError(message(err)));
  }, [load]);

  const processing = state?.book.status === "processing";
  useEffect(() => {
    if (!processing) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const tick = () => {
      timer = setTimeout(
        async () => {
          await load().catch((err) => setError(message(err)));
          if (!stopped) tick();
        },
        document.visibilityState === "hidden" ? HIDDEN_POLL_MS : POLL_MS,
      );
    };
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [processing, load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
      setUpload(null);
      await load().catch((err) => setError(message(err)));
    }
  }

  if (!state)
    return (
      <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <div role="status" aria-label="書籍を読み込み中">
            <Skeleton className="h-32 w-full" />
          </div>
        )}
      </div>
    );

  const { book, jobs, pdfs, chapters } = state;
  const editable = book.status === "draft" || book.status === "uploading";
  const canUpload = Boolean(capabilities?.upload) && editable;
  const canProcess =
    canUpload &&
    book.status === "uploading" &&
    pdfs.length > 0 &&
    pdfs.every((pdf) => pdf.uploadStatus === "completed");
  const job = jobs[0];

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (!files.length || !capabilities) return;
    void run(() => uploadBookPdfs(book.id, files, capabilities.limits, setUpload));
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <Link to="/library" className="text-sm text-muted-foreground hover:underline">
          ← 本棚に戻る
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="break-words text-xl font-semibold">{book.title}</h1>
          <Badge>{PROCESSING[book.status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{book.author || "著者未登録"}</p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>PDF</CardTitle>
            <CardDescription>
              選んだ順に1冊の本としてつなぎます。1つ50MB・100ページを超えるPDFは自動で分けて送ります。
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {pdfs.length ? (
              <ol className="flex flex-col gap-2 text-sm">
                {pdfs.map((pdf) => (
                  <li key={pdf.id} className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 break-all">
                      {pdf.position}. {pdf.fileName}
                    </span>
                    <span className="text-muted-foreground">
                      {fileSize(pdf.sizeBytes)}
                      {pdf.pageCount ? ` · ${pdf.pageCount}ページ` : ""}
                      {pdf.uploadStatus === "completed" ? "" : " · 送信できていません"}
                    </span>
                    {canUpload ? (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            apiFetch(`/api/library/books/${book.id}/pdfs/${pdf.id}`, {
                              method: "DELETE",
                            }),
                          )
                        }
                      >
                        削除
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">まだPDFがありません。</p>
            )}
            {upload ? (
              <div role="status" className="flex flex-col gap-1 text-sm">
                <span>{upload.label}</span>
                <Progress value={upload.percent} aria-label="PDFの送信" />
              </div>
            ) : null}
            {canUpload ? (
              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    className="sr-only"
                    disabled={busy}
                    onChange={choose}
                  />
                  <span className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm">
                    PDFを追加
                  </span>
                </label>
                <Button
                  variant="primary"
                  disabled={busy || !canProcess}
                  onClick={() =>
                    void run(() =>
                      apiFetch(`/api/library/books/${book.id}/process`, { method: "POST" }),
                    )
                  }
                >
                  本文の準備を始める
                </Button>
              </div>
            ) : editable ? (
              <p className="text-sm text-muted-foreground">PDFの登録は準備中です。</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {job ? (
        <Card>
          <CardHeader>
            <CardTitle>本文の準備</CardTitle>
          </CardHeader>
          <CardContent>
            <div role="status" className="flex flex-col gap-2 text-sm">
              {job.status === "queued" || job.status === "running" ? (
                <>
                  <span>
                    {job.progressTotal
                      ? `OCR ${job.progressCurrent}/${job.progressTotal}ページ`
                      : "開始を待っています"}
                    。ページを閉じても処理は続きます。
                  </span>
                  <Progress
                    value={job.progressTotal ? (job.progressCurrent / job.progressTotal) * 100 : 0}
                    aria-label="本文の準備"
                  />
                </>
              ) : job.status === "failed" ? (
                <>
                  <span className="text-destructive">
                    {job.errorMessage ?? "処理に失敗しました。"}
                  </span>
                  <div>
                    <Button
                      disabled={busy || !capabilities?.processingAvailable}
                      onClick={() =>
                        void run(() =>
                          apiFetch(`/api/library/books/${book.id}/jobs/${job.id}/retry`, {
                            method: "POST",
                          }),
                        )
                      }
                    >
                      再実行
                    </Button>
                  </div>
                </>
              ) : (
                <span>本文の準備が終わりました。</span>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {chapters.length ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>章</CardTitle>
              <CardDescription>本文を読む画面は準備中です。</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-1 text-sm">
              {chapters.map((chapter) => (
                <li key={chapter.id} className="flex gap-2">
                  <span className="min-w-0 flex-1 break-words">
                    {chapter.position}. {chapter.title}
                  </span>
                  <span className="text-muted-foreground">
                    p.{chapter.startPage}–{chapter.endPage}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
