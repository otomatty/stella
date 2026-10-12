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
  // The confirmation covers the PDF set it was given for; adding or deleting a PDF clears it.
  const [acknowledgedFor, setAcknowledgedFor] = useState<string | null>(null);

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
          // A later successful poll clears an earlier poll's network error.
          await load().then(
            () => setError(null),
            (err) => setError(message(err)),
          );
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
          <div role="alert" className="flex flex-wrap items-center gap-3">
            <p>{error}</p>
            <Button
              onClick={() => {
                setError(null);
                load().catch((err) => setError(message(err)));
              }}
            >
              再読み込み
            </Button>
          </div>
        ) : (
          <div role="status" aria-label="書籍を読み込み中">
            <Skeleton className="h-32 w-full" />
          </div>
        )}
      </div>
    );

  const { book, jobs, pdfs, chapters } = state;
  // A failed book is editable: changing its PDFs reopens it for a fresh run.
  const editable =
    book.status === "draft" || book.status === "uploading" || book.status === "failed";
  const canUpload = Boolean(capabilities?.upload) && editable;
  const canProcess =
    canUpload &&
    book.status === "uploading" &&
    pdfs.length > 0 &&
    pdfs.every((pdf) => pdf.uploadStatus === "completed");
  // After a failed book is reopened, its old job belongs to an earlier run.
  const pdfSet = pdfs.map((pdf) => pdf.id).join(",");
  const acknowledged = acknowledgedFor === pdfSet;
  const consent = (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        className="mt-1"
        checked={acknowledged}
        disabled={busy}
        onChange={(event) => setAcknowledgedFor(event.target.checked ? pdfSet : null)}
      />
      <span>
        本文の準備では、PDFを外部の読み取りサービス（Google の Gemini
        API）へ送って文字を読み取ります。送ってよいPDFであることを確認しました。
      </span>
    </label>
  );
  const job =
    book.status === "processing" || book.status === "ready" || book.status === "failed"
      ? jobs[0]
      : undefined;
  const known = {
    pdfs: pdfs.length,
    bytes: pdfs.reduce((sum, pdf) => sum + pdf.sizeBytes, 0),
    pages: pdfs.reduce((sum, pdf) => sum + (pdf.pageCount ?? 0), 0),
  };

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (!files.length || !capabilities) return;
    void run(() => uploadBookPdfs(book.id, files, capabilities.limits, known, setUpload));
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
              選んだ順に1冊の本としてつなぎます。1つ50MB・100ページを超えるPDFは自動で分けて送り、分けた部分はどれか1つを削除するとまとめて消えます。
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
                      {pdf.sourceFileName ? (
                        <span className="text-muted-foreground">（元: {pdf.sourceFileName}）</span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground">
                      {fileSize(pdf.sizeBytes)}
                      {pdf.pageCount ? ` · ${pdf.pageCount}ページ` : ""}
                      {pdf.uploadStatus === "completed" ? "" : " · 送信できていません"}
                    </span>
                    {/* Deleting needs only storage, so it stays available while processing is off. */}
                    {editable ? (
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
            {canProcess ? consent : null}
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
                  disabled={busy || !canProcess || !acknowledged}
                  onClick={() =>
                    void run(async () => {
                      await apiFetch(`/api/library/books/${book.id}/process`, {
                        method: "POST",
                        body: { acknowledgedExternalProcessing: true },
                      });
                      // Each accepted run used its confirmation; a retry asks again.
                      setAcknowledgedFor(null);
                    })
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
                  <span className="text-muted-foreground">
                    PDFを追加・削除すると、組み直した本としてもう一度準備できます。
                  </span>
                  {consent}
                  <div>
                    <Button
                      disabled={busy || !capabilities?.processingAvailable || !acknowledged}
                      onClick={() =>
                        void run(async () => {
                          await apiFetch(`/api/library/books/${book.id}/jobs/${job.id}/retry`, {
                            method: "POST",
                            body: { acknowledgedExternalProcessing: true },
                          });
                          setAcknowledgedFor(null);
                        })
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
