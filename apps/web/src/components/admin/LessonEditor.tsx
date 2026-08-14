/**
 * レッスン編集ダイアログ。 type 別にフォームを切り替える。
 *
 * - video / slides: MaterialUploader で動画 / PDF をアップロード
 * - text: markdown を textarea で編集
 * - assignment / code: 同テナントの assignment 一覧から紐付け先を選択
 * - quiz: クイズ設問の編集は将来対応 (タイトルのみ編集可能)
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  AssignmentRow,
  LessonRow,
  LessonType,
} from "@falcon/shared/cms/types";
import { listAssignments, type UpsertLessonInput } from "@/lib/cms-api";
import { LessonMaterialsPanel } from "./LessonMaterialsPanel";
import { MaterialUploader } from "./MaterialUploader";
import { QuizEditor } from "./QuizEditor";

interface Props {
  tenantId: string;
  courseId: string;
  sectionId: string;
  lesson: LessonRow | null;
  onClose: () => void;
  onSubmit: (
    partial: Omit<UpsertLessonInput, "section_id" | "id" | "order"> & {
      order?: number;
    },
  ) => Promise<void>;
}

const TYPES: { value: LessonType; label: string }[] = [
  { value: "video", label: "動画" },
  { value: "slides", label: "スライド (PDF)" },
  { value: "text", label: "テキスト" },
  { value: "quiz", label: "確認テスト" },
  { value: "code", label: "コード演習" },
  { value: "assignment", label: "課題提出" },
];

export function LessonEditor({
  tenantId,
  courseId,
  sectionId: _sectionId,
  lesson,
  onClose,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState(lesson?.title ?? "新しいレッスン");
  const [type, setType] = useState<LessonType>(lesson?.type ?? "text");
  const [duration, setDuration] = useState(lesson?.duration_label ?? "");
  const [videoPath, setVideoPath] = useState<string | null>(lesson?.video_path ?? null);
  const [pdfPath, setPdfPath] = useState<string | null>(lesson?.pdf_path ?? null);
  const [markdown, setMarkdown] = useState(lesson?.markdown ?? "");
  const [assignmentId, setAssignmentId] = useState<string | null>(
    lesson?.assignment_id ?? null,
  );
  const [totalPages, setTotalPages] = useState<string>(
    lesson?.total_pages != null ? String(lesson.total_pages) : "",
  );
  const [totalSec, setTotalSec] = useState<string>(
    lesson?.total_sec != null ? String(lesson.total_sec) : "",
  );
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [quizEditorOpen, setQuizEditorOpen] = useState(false);

  useEffect(() => {
    if (type !== "assignment" && type !== "code") return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await listAssignments(tenantId);
        if (!cancelled) setAssignments(rows);
      } catch {
        // toast はメインのカタログ画面で出すので、 ここでは silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, type]);

  const submit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim() || "(無題)",
        type,
        duration_label: duration || null,
        video_path: type === "video" ? videoPath : null,
        pdf_path: type === "slides" ? pdfPath : null,
        markdown: type === "text" ? markdown : null,
        assignment_id:
          type === "assignment" || type === "code" ? assignmentId : null,
        total_pages: type === "slides" && totalPages ? Number(totalPages) : null,
        total_sec: type === "video" && totalSec ? Number(totalSec) : null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (quizEditorOpen && lesson?.id) {
    return (
      <QuizEditor
        lessonId={lesson.id}
        onClose={() => setQuizEditorOpen(false)}
      />
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{lesson ? "レッスン編集" : "新規レッスン"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="col-span-1 sm:col-span-2">
              <Label htmlFor="lesson-title">タイトル</Label>
              <Input
                id="lesson-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lesson-duration">表示用 duration</Label>
              <Input
                id="lesson-duration"
                placeholder="12分 / 09:20"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="lesson-type">種別</Label>
            <select
              id="lesson-type"
              value={type}
              onChange={(e) => setType(e.target.value as LessonType)}
              className="h-8 w-full rounded-sm border border-border-2 bg-card px-2 text-[13px]"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {type === "video" ? (
            <>
              <MaterialUploader
                kind="video"
                tenantId={tenantId}
                courseId={courseId}
                currentPath={videoPath}
                onChange={setVideoPath}
              />
              <div>
                <Label htmlFor="lesson-totalsec">想定再生秒数 (任意)</Label>
                <Input
                  id="lesson-totalsec"
                  type="number"
                  value={totalSec}
                  onChange={(e) => setTotalSec(e.target.value)}
                />
              </div>
            </>
          ) : null}

          {type === "slides" ? (
            <>
              <MaterialUploader
                kind="pdf"
                tenantId={tenantId}
                courseId={courseId}
                currentPath={pdfPath}
                onChange={setPdfPath}
              />
              <div>
                <Label htmlFor="lesson-totalpages">想定ページ数 (任意)</Label>
                <Input
                  id="lesson-totalpages"
                  type="number"
                  value={totalPages}
                  onChange={(e) => setTotalPages(e.target.value)}
                />
              </div>
            </>
          ) : null}

          {type === "text" ? (
            <div>
              <Label htmlFor="lesson-md">本文 (Markdown)</Label>
              <Textarea
                id="lesson-md"
                rows={10}
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                className="font-mono text-[12.5px]"
              />
            </div>
          ) : null}

          {type === "quiz" ? (
            lesson?.id ? (
              <div className="rounded-md border border-border-2 bg-sunken p-3 text-[12.5px] text-ink-3 flex items-center gap-3">
                <span className="flex-1">
                  設問・選択肢・配点はこのレッスンに紐付けて編集します。
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuizEditorOpen(true)}
                >
                  設問を編集
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border bg-sunken p-3 text-[12.5px] text-ink-3">
                先にこのレッスンを保存すると、 設問・選択肢・配点を編集できます。
              </div>
            )
          ) : null}

          {type === "code" || type === "assignment" ? (
            <div>
              <Label htmlFor="lesson-aid">紐付ける課題</Label>
              <select
                id="lesson-aid"
                value={assignmentId ?? ""}
                onChange={(e) => setAssignmentId(e.target.value || null)}
                className="h-8 w-full rounded-sm border border-border-2 bg-card px-2 text-[13px]"
              >
                <option value="">(未指定)</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id} — {a.title}
                  </option>
                ))}
              </select>
              <div className="text-[11.5px] text-ink-3 mt-1">
                課題が一覧にない場合は「課題管理」 で先に作成してください。
              </div>
            </div>
          ) : null}

          <LessonMaterialsPanel lessonId={lesson?.id ?? null} />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            type="button"
            variant="accent"
            disabled={submitting}
            onClick={() => void submit()}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
