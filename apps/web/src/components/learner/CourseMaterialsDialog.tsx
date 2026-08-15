/**
 * コース教材ダイアログ (Issue #77)。
 *
 * コース詳細の「教材をダウンロード」はハンドラの無いスタブだったため、
 * `GET /api/materials?courseId=...` でコース内の配布資料をまとめて引き、
 * レッスンごとにグルーピングして個別ダウンロードできるようにした。
 * (実体は R2 上の別ファイルで、 一括 zip 化の仕組みが無いため 1 件ずつ落とす。)
 */

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { CourseMaterialRow } from '@falcon/shared/cms/types';
import { Download, FileText, Folder, Loader2 } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { SkeletonRows } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { downloadLessonMaterial, listCourseMaterials } from '@/lib/cms-api';
import { isBackendConfigured } from '@/lib/backend';

interface CourseMaterialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseTitle: string;
}

/** ファイルサイズ表記 (1024 基数)。 */
function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface MaterialGroup {
  lessonId: string;
  lessonTitle: string;
  sectionTitle: string;
  materials: CourseMaterialRow[];
}

/** サーバの並び (セクション → レッスン → 登録順) を保ったままレッスン単位に束ねる。 */
function groupByLesson(rows: CourseMaterialRow[]): MaterialGroup[] {
  const groups: MaterialGroup[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.lessonId === row.lesson_id) {
      last.materials.push(row);
      continue;
    }
    groups.push({
      lessonId: row.lesson_id,
      lessonTitle: row.lesson_title,
      sectionTitle: row.section_title,
      materials: [row],
    });
  }
  return groups;
}

export const CourseMaterialsDialog = ({
  open,
  onOpenChange,
  courseId,
  courseTitle,
}: CourseMaterialsDialogProps) => {
  const [materials, setMaterials] = useState<CourseMaterialRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const backendEnabled = isBackendConfigured();

  // 開いたときだけ取得する (閉じている間はフェッチしない)。
  useEffect(() => {
    if (!open || !backendEnabled) return;
    const reqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    void listCourseMaterials(courseId)
      .then((rows) => {
        if (reqId !== requestIdRef.current) return;
        setMaterials(rows);
      })
      .catch((err: unknown) => {
        if (reqId !== requestIdRef.current) return;
        console.error('[CourseMaterialsDialog] fetch failed', err);
        setMaterials([]);
        setError(err instanceof Error ? err.message : '教材の取得に失敗しました');
      })
      .finally(() => {
        if (reqId === requestIdRef.current) setLoading(false);
      });
  }, [open, courseId, backendEnabled]);

  const handleDownload = async (material: CourseMaterialRow) => {
    setDownloadingId(material.id);
    try {
      await downloadLessonMaterial(material);
    } catch (err) {
      console.error('[CourseMaterialsDialog] download failed', err);
      toast.error(err instanceof Error ? err.message : 'ダウンロードに失敗しました');
    } finally {
      setDownloadingId(null);
    }
  };

  const groups = groupByLesson(materials);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(calc(100vw-2rem),640px)]">
        <DialogHeader>
          <DialogTitle>教材をダウンロード</DialogTitle>
          <DialogDescription>{courseTitle} の配布資料</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-6 pb-6">
          {!backendEnabled ? (
            <div className="py-12 text-center text-[12.5px] text-ink-3">
              教材のダウンロードはバックエンド接続時のみ利用できます。
            </div>
          ) : loading ? (
            <SkeletonRows rows={3} className="py-4" />
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-ink-3">
              <Folder size={28} className="text-ink-4" />
              <div className="font-medium text-destructive">教材の取得に失敗しました</div>
              <div className="text-[12.5px]">{error}</div>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-ink-3">
              <Folder size={28} className="text-ink-4" />
              <div className="font-medium text-ink-2">配布資料はありません</div>
              <div className="text-[12.5px]">
                このコースのレッスンに資料が追加されると、 ここからダウンロードできます。
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 pt-4">
              {groups.map((group) => (
                <div key={group.lessonId}>
                  <div className="text-[11.5px] text-ink-3 mb-1.5">
                    {group.sectionTitle}
                  </div>
                  <div className="text-[13px] font-medium mb-2">{group.lessonTitle}</div>
                  <div className="flex flex-col gap-2">
                    {group.materials.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 rounded-md border border-border bg-card px-3.5 py-2.5"
                      >
                        <div className="grid place-items-center w-9 h-9 rounded-md bg-sunken text-ink-3 shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium truncate">
                            {m.file_name}
                          </div>
                          <div className="text-[11.5px] text-ink-3">
                            {formatBytes(m.size_bytes)}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={downloadingId === m.id}
                          onClick={() => void handleDownload(m)}
                        >
                          {downloadingId === m.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Download size={13} />
                          )}
                          ダウンロード
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
