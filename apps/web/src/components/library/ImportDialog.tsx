import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { LibraryBook } from "@stella/shared/library/types";
import { formatBytes } from "@stella/shared/library/book-package";
import {
  BookPackageError,
  openBookPackage,
  type OpenedBookPackage,
} from "@/lib/book-package/read-package";
import { importBookPackage, type ImportProgress } from "@/lib/library-api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Headphones, Video } from "@/lib/icons";
import { BookCover } from "./BookCover";

type Step =
  | { kind: "reading" }
  | { kind: "error"; message: string; details: string[] }
  | { kind: "confirm"; opened: OpenedBookPackage }
  | { kind: "sending"; opened: OpenedBookPackage; progress: ImportProgress }
  | { kind: "done"; opened: OpenedBookPackage; book: LibraryBook; progress: ImportProgress };

function errorStep(error: unknown): Step {
  if (error instanceof BookPackageError)
    return { kind: "error", message: error.message, details: error.details };
  if (error instanceof DOMException && error.name === "AbortError")
    return {
      kind: "error",
      message: "取り込みを止めました。同じ zip をもう一度開くと、続きから送ります",
      details: [],
    };
  return {
    kind: "error",
    message: error instanceof Error ? error.message : "取り込めませんでした",
    details: [],
  };
}

/**
 * zip を開いて中身を確かめ、本棚に取り込むダイアログ。`expectedPackageId` を渡すと、その本の
 * 更新版だけを受け付ける (本の画面の「更新版を読み込む」)。
 */
export function ImportDialog({
  file,
  expectedPackageId,
  onClose,
  onImported,
}: {
  file: File | null;
  expectedPackageId?: string;
  onClose: () => void;
  onImported: (book: LibraryBook) => void;
}) {
  const [step, setStep] = useState<Step>({ kind: "reading" });
  const opened = useRef<OpenedBookPackage | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    setStep({ kind: "reading" });
    void openBookPackage(file)
      .then((result) => {
        if (cancelled) {
          void result.close();
          URL.revokeObjectURL(result.thumbnail.url);
          return;
        }
        if (expectedPackageId && result.manifest.id !== expectedPackageId) {
          void result.close();
          URL.revokeObjectURL(result.thumbnail.url);
          setStep({
            kind: "error",
            message:
              "この zip は別の本です。この本の更新版 (book.json の id が同じもの) を選んでください",
            details: [],
          });
          return;
        }
        opened.current = result;
        setStep({ kind: "confirm", opened: result });
      })
      .catch((error: unknown) => {
        if (!cancelled) setStep(errorStep(error));
      });
    return () => {
      cancelled = true;
      abort.current?.abort();
      const current = opened.current;
      opened.current = null;
      if (current) {
        void current.close();
        URL.revokeObjectURL(current.thumbnail.url);
      }
    };
  }, [file, expectedPackageId]);

  const sending = step.kind === "sending";
  useEffect(() => {
    if (!sending) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [sending]);

  async function start(target: OpenedBookPackage) {
    const controller = new AbortController();
    abort.current = controller;
    const initial: ImportProgress = {
      phase: "preparing",
      sentBytes: 0,
      totalBytes: 0,
      reusedFiles: 0,
      update: false,
    };
    setStep({ kind: "sending", opened: target, progress: initial });
    let last = initial;
    try {
      const book = await importBookPackage(
        target,
        (progress) => {
          last = progress;
          setStep({ kind: "sending", opened: target, progress });
        },
        controller.signal,
      );
      setStep({ kind: "done", opened: target, book, progress: last });
      onImported(book);
    } catch (error) {
      setStep(errorStep(controller.signal.aborted ? new DOMException("", "AbortError") : error));
    } finally {
      abort.current = null;
    }
  }

  const close = () => {
    if (sending) return;
    onClose();
  };

  return (
    <Dialog open={file !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="w-[min(calc(100vw-2rem),560px)]">
        <DialogHeader>
          <DialogTitle>{expectedPackageId ? "更新版を読み込む" : "本を追加"}</DialogTitle>
          <DialogDescription>{file?.name}</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 pb-6">
          {step.kind === "reading" ? (
            <p role="status" className="text-sm text-muted-foreground">
              zip の中身を確かめています…
            </p>
          ) : null}
          {step.kind === "error" ? (
            <div role="alert" className="flex flex-col gap-2">
              <p className="text-sm font-medium text-destructive">{step.message}</p>
              {step.details.length ? (
                <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {step.details.slice(0, 20).map((detail) => (
                    <li key={detail} className="[overflow-wrap:anywhere]">
                      {detail}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex justify-end">
                <Button onClick={onClose}>閉じる</Button>
              </div>
            </div>
          ) : null}
          {step.kind === "confirm" || step.kind === "sending" || step.kind === "done" ? (
            <PackageSummary opened={step.opened} />
          ) : null}
          {step.kind === "confirm" ? (
            <div className="flex justify-end gap-2">
              <Button onClick={onClose}>キャンセル</Button>
              <Button variant="primary" onClick={() => void start(step.opened)}>
                {expectedPackageId ? "更新する" : "本棚に追加"}
              </Button>
            </div>
          ) : null}
          {step.kind === "sending" ? (
            <SendingProgress progress={step.progress} onStop={() => abort.current?.abort()} />
          ) : null}
          {step.kind === "done" ? (
            <div className="flex flex-col gap-3">
              <p role="status" className="text-sm">
                {step.progress.update ? "本を新しい版に更新しました。" : "本棚に追加しました。"}
                {step.progress.reusedFiles > 0
                  ? ` 変わっていない ${step.progress.reusedFiles} 個のファイルは送らずに使いました。`
                  : ""}
              </p>
              <div className="flex justify-end gap-2">
                <Button onClick={onClose}>閉じる</Button>
                <Button variant="primary" asChild>
                  <Link to="/library/$bookId" params={{ bookId: step.book.id }} onClick={onClose}>
                    本を開く
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PackageSummary({ opened }: { opened: OpenedBookPackage }) {
  const { manifest, plan } = opened;
  const audio = manifest.chapters.filter((chapter) => chapter.audio).length;
  const video = manifest.chapters.filter((chapter) => chapter.video).length;
  return (
    <div className="flex gap-4">
      <div className="w-24 shrink-0">
        <BookCover title={manifest.title} previewUrl={opened.thumbnail.url} />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 text-sm">
        <p className="font-semibold [overflow-wrap:anywhere]">{manifest.title}</p>
        {manifest.authors.length ? (
          <p className="text-muted-foreground">{manifest.authors.join("、")}</p>
        ) : null}
        <p className="text-muted-foreground">
          {manifest.chapters.length} 章 · {formatBytes(plan.totalBytes)}
        </p>
        <p className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
            音声 {audio} 章
          </span>
          <span className="inline-flex items-center gap-1">
            <Video className="h-3.5 w-3.5" aria-hidden="true" />
            動画 {video} 章
          </span>
        </p>
        {plan.ignored.length ? (
          <details className="text-xs text-muted-foreground">
            <summary>取り込まないファイル {plan.ignored.length} 個</summary>
            <ul className="mt-1 list-disc pl-5">
              {plan.ignored.slice(0, 20).map((path) => (
                <li key={path} className="[overflow-wrap:anywhere]">
                  {path}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </div>
  );
}

function SendingProgress({ progress, onStop }: { progress: ImportProgress; onStop: () => void }) {
  const ratio = progress.totalBytes ? progress.sentBytes / progress.totalBytes : 0;
  const label =
    progress.phase === "preparing"
      ? "準備しています…"
      : progress.phase === "finishing"
        ? "仕上げています…"
        : `送信中 ${formatBytes(progress.sentBytes)} / ${formatBytes(progress.totalBytes)}`;
  return (
    <div className="flex flex-col gap-2">
      <Progress value={Math.round(ratio * 100)} aria-label="送信の進み具合" />
      <p role="status" className="text-xs text-muted-foreground">
        {label}
        {progress.update ? " · 更新版" : ""}
        {progress.reusedFiles ? ` · ${progress.reusedFiles} 個は送信済み` : ""}
      </p>
      <p className="text-xs text-muted-foreground">
        送り終えるまで、このページを閉じないでください。
      </p>
      <div className="flex justify-end">
        <Button onClick={onStop}>止める</Button>
      </div>
    </div>
  );
}
