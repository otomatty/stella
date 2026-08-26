/**
 * レッスン配布資料の管理パネル (LessonEditor 内 / Issue #72)。
 *
 * - アップロード: `POST /api/materials/upload` に lessonId を付けて R2 保存 + 行登録
 *   (ボタン選択 / ドラッグ&ドロップの両対応 — MaterialUploader と同様)
 * - 一覧 / 削除: `GET /api/materials?lessonId=...` / `DELETE /api/materials/:id`
 * - レッスン保存前 (id 未確定) は QuizEditor と同様に案内のみ表示する
 *
 * 自動生成資料 (source=auto — CI が教材から作る PDF。2026-08-26 spec) は削除できない
 * かわりに「版履歴」を開ける。旧版は R2 に全部残っており、staff は任意の版を
 * ダウンロードできる (受講者は常に最新版のみ)。
 */

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { LessonMaterialRow, LessonMaterialVersionRow } from "@falcon/shared/cms/types";
import { Upload, FileText, Loader2, Trash, History, Download, ChevronDown } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  deleteLessonMaterial,
  downloadLessonMaterialVersion,
  listLessonMaterialVersions,
  uploadLessonMaterial,
} from "@/lib/cms-api";
import { useLessonMaterials } from "@/hooks/useLessonMaterials";

const MAX_BYTES = 200 * 1024 * 1024; // 200MB (MaterialUploader と同じ上限)

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const formatDate = (value: string): string => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("ja-JP");
};

/**
 * 自動生成資料の版履歴 (staff のみ)。開いたときに遅延取得する。
 * 最新版は通常のダウンロード導線 (受講者と同じ) があるので、一覧では旧版の取得が主役。
 */
function MaterialVersionHistory({ material }: { material: LessonMaterialRow }) {
  const [versions, setVersions] = useState<LessonMaterialVersionRow[] | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    listLessonMaterialVersions(material.id)
      .then((rows) => {
        if (alive) setVersions(rows);
      })
      .catch((err) => {
        toast.error(`版履歴の取得に失敗: ${err instanceof Error ? err.message : "失敗"}`);
        if (alive) setVersions([]);
      });
    return () => {
      alive = false;
    };
  }, [material.id]);

  const handleDownload = async (version: number) => {
    setDownloading(version);
    try {
      await downloadLessonMaterialVersion(material, version);
    } catch (err) {
      toast.error(`ダウンロードに失敗: ${err instanceof Error ? err.message : "失敗"}`);
    } finally {
      setDownloading(null);
    }
  };

  if (versions === null) {
    return <SkeletonRows rows={2} className="py-2" />;
  }
  if (versions.length === 0) {
    return (
      <div className="px-2 py-1.5 text-[11.5px] text-ink-3">
        版履歴はまだありません (次のデプロイで記録されます)。
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      {versions.map((v, i) => (
        <div key={v.version} className="flex items-center gap-2 px-2 py-1 text-[11.5px] text-ink-2">
          <span className="font-medium tabular-nums">v{v.version}</span>
          {i === 0 ? <span className="rounded bg-brand-soft px-1 text-[10.5px]">最新</span> : null}
          <span className="text-ink-3">{formatDate(v.created_at)}</span>
          <span className="text-ink-3">{formatBytes(v.size_bytes)}</span>
          {v.lesson_revision !== null ? (
            <span className="text-ink-3">本文 rev.{v.lesson_revision}</span>
          ) : null}
          <div className="flex-1" />
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            title={`v${v.version} をダウンロード`}
            disabled={downloading === v.version}
            onClick={() => void handleDownload(v.version)}
          >
            {downloading === v.version ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Download size={12} />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}

export function LessonMaterialsPanel({ lessonId }: { lessonId: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [historyOpenId, setHistoryOpenId] = useState<string | null>(null);
  const { materials, loading, error, refetch } = useLessonMaterials(lessonId);

  if (!lessonId) {
    return (
      <div>
        <Label>配布資料</Label>
        <div className="rounded-md border border-dashed border-border bg-sunken p-3 text-[12.5px] text-ink-3">
          先にこのレッスンを保存すると、 配布資料を追加できます。
        </div>
      </div>
    );
  }

  const handleFile = async (file: File) => {
    if (uploading) {
      toast.message("アップロード中です。 完了までお待ちください");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(
        `ファイルサイズが大きすぎます (${Math.round(file.size / 1024 / 1024)}MB > 200MB)`,
      );
      return;
    }
    setUploading(true);
    try {
      await uploadLessonMaterial(file, lessonId);
      await refetch();
      toast.success("配布資料を追加しました");
    } catch (err) {
      const message = err instanceof Error ? err.message : "失敗";
      toast.error(`アップロードに失敗: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (!window.confirm(`「${fileName}」を削除しますか? この操作は取り消せません。`)) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteLessonMaterial(id);
      await refetch();
      toast.success("配布資料を削除しました");
    } catch (err) {
      const message = err instanceof Error ? err.message : "失敗";
      toast.error(`削除に失敗: ${message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center">
        <Label>配布資料</Label>
        <div className="flex-1" />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          ファイルを追加
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <div
        className={
          "rounded-md border-2 border-dashed p-1.5 mt-1.5 transition-colors " +
          (dragOver ? "border-brand bg-brand-soft" : "border-transparent")
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
        {loading ? (
          <SkeletonRows rows={2} className="py-3" />
        ) : error ? (
          <div className="rounded-md border border-danger/40 bg-sunken p-3 text-[12.5px] text-danger">
            配布資料の取得に失敗しました: {error}
          </div>
        ) : materials.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-sunken p-3 text-[12.5px] text-ink-3">
            配布資料はまだありません。 ファイルをここにドラッグ&ドロップするか、
            「ファイルを追加」から選択すると、 受講者の「資料」タブに表示されます。
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {materials.map((m) => (
              <div key={m.id} className="rounded-md border border-border-2 bg-card">
                <div className="flex items-center gap-2.5 px-2.5 py-2">
                  <FileText size={14} className="text-ink-3 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className="text-[12.5px] font-medium truncate">{m.file_name}</div>
                      {m.source === "auto" ? (
                        <span className="shrink-0 rounded bg-sunken px-1 text-[10.5px] text-ink-3">
                          自動生成
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-ink-3">{formatBytes(m.size_bytes)}</div>
                  </div>
                  {m.source === "auto" ? (
                    // 自動生成資料は削除できない (教材の変更で更新される)。かわりに版履歴。
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      title="版履歴"
                      onClick={() => setHistoryOpenId(historyOpenId === m.id ? null : m.id)}
                    >
                      {historyOpenId === m.id ? <ChevronDown size={13} /> : <History size={13} />}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      title="削除"
                      disabled={deletingId === m.id}
                      onClick={() => void handleDelete(m.id, m.file_name)}
                    >
                      {deletingId === m.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash size={13} />
                      )}
                    </Button>
                  )}
                </div>
                {m.source === "auto" && historyOpenId === m.id ? (
                  <div className="border-t border-border-2 bg-sunken/50 px-1 py-1">
                    <MaterialVersionHistory material={m} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
