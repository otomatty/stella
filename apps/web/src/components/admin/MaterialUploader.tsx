/**
 * R2 へ単一ファイルをアップロードする UI。
 *
 * - 動画 (mp4) / PDF を受け付ける (`kind` で切り替え)
 * - アップロード後のパスを親に通知して、 LessonEditor の `video_path` / `pdf_path` にセットする
 * - 進捗バーは未対応のため、 不確定スピナーで表現
 */

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, FileText, Video, Loader2, X } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { buildMaterialPath, uploadMaterial } from "@/lib/cms-api";
import { getMaterialUrl } from "@/lib/storage";

type Kind = "video" | "pdf";

interface Props {
  kind: Kind;
  tenantId: string;
  courseId: string;
  /** 現在保存されているパス。 未保存の場合は null。 */
  currentPath: string | null;
  onChange: (path: string | null) => void;
}

const MAX_BYTES = 200 * 1024 * 1024; // 200MB

export function MaterialUploader({
  kind,
  tenantId,
  courseId,
  currentPath,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const accept = kind === "video" ? "video/*" : "application/pdf";
  const Icon = kind === "video" ? Video : FileText;
  const label = kind === "video" ? "動画ファイル" : "PDF ファイル";

  const handleFile = async (file: File) => {
    if (uploading) {
      toast.message("アップロード中です。 完了までお待ちください");
      return;
    }
    if (kind === "video" && !file.type.startsWith("video/")) {
      toast.error("動画ファイルを選択してください");
      return;
    }
    if (kind === "pdf" && file.type !== "application/pdf") {
      toast.error("PDF ファイルを選択してください");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(`ファイルサイズが大きすぎます (${Math.round(file.size / 1024 / 1024)}MB > 200MB)`);
      return;
    }
    setUploading(true);
    try {
      const path = buildMaterialPath({ tenantId, courseId, fileName: file.name });
      const result = await uploadMaterial(file, path);
      onChange(result.path);
      toast.success("アップロードしました");
    } catch (err) {
      const message = err instanceof Error ? err.message : "失敗";
      toast.error(`アップロードに失敗: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const previewUrl = (() => {
    if (!currentPath) return null;
    try {
      return getMaterialUrl(currentPath);
    } catch {
      return null;
    }
  })();

  return (
    <div
      className={
        "rounded-md border-2 border-dashed p-4 transition-colors " +
        (dragOver ? "border-brand bg-brand-soft" : "border-border bg-sunken")
      }
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void handleFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <div className="flex items-center gap-3">
        <div className="grid place-items-center w-10 h-10 rounded-md bg-card text-ink-3 shrink-0">
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium">{label}</div>
          {currentPath ? (
            <div className="text-[11.5px] text-ink-3 font-mono truncate">{currentPath}</div>
          ) : (
            <div className="text-[11.5px] text-ink-3">
              ドラッグ&ドロップ または「ファイルを選択」ボタンから
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11.5px] text-brand underline underline-offset-2"
            >
              プレビュー
            </a>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={13} />
            {currentPath ? "差し替え" : "ファイルを選択"}
          </Button>
          {currentPath ? (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              title="パスをクリア"
              onClick={() => onChange(null)}
            >
              <X size={13} />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
