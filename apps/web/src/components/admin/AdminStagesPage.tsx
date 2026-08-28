/**
 * `/admin/stages` — ステージ一覧 + 編集画面 (内部 state でルーティング)。
 *
 * AdminGeneric の stages 分岐の置き換え。 fixtures ではなく DB の stages テーブルを読む。
 */

import { useState } from "react";
import { toast } from "sonner";

import { Plus, MoreHorizontal, Edit } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StageThumb } from "@/components/common/StageThumb";
import type { StageColor, StageRow } from "@falcon/shared/cms/types";
import { deleteStage, setStageStatus, upsertStage } from "@/lib/cms-api";
import { useCmsStages } from "@/hooks/useCmsStages";
import { StageEditor } from "./StageEditor";

interface Props {
  tenantId: string;
  /**
   * 開いた直後に編集画面を出すステージ ID (Issue #77 — Topbar の検索からの遷移)。
   * 呼び出し側は値を変えるときに `key` も変えてマウントし直す。
   */
  initialStageId?: string | null;
}

export function AdminStagesPage({ tenantId, initialStageId = null }: Props) {
  const { stages, loading, error, refetch } = useCmsStages(tenantId);
  const [editingId, setEditingId] = useState<string | null>(initialStageId);

  if (editingId) {
    return (
      <StageEditor
        stageId={editingId}
        tenantId={tenantId}
        onBack={() => setEditingId(null)}
        onMetadataChanged={refetch}
      />
    );
  }

  const onCreate = async () => {
    const baseSlug = `stage-${Date.now().toString(36)}`;
    try {
      const row = await upsertStage({
        tenant_id: tenantId,
        slug: baseSlug,
        title: "新しいステージ",
        status: "draft",
        color: "indigo",
      });
      await refetch();
      setEditingId(row.id);
    } catch (err) {
      toast.error(`ステージ作成失敗: ${err instanceof Error ? err.message : "unknown"}`);
    }
  };

  const onTogglePublish = async (stage: StageRow) => {
    try {
      await setStageStatus(stage.id, stage.status === "published" ? "draft" : "published");
      await refetch();
    } catch (err) {
      toast.error(`状態切替失敗: ${err instanceof Error ? err.message : "unknown"}`);
    }
  };

  const onDelete = async (stage: StageRow) => {
    if (
      !confirm(`ステージ "${stage.title}" を削除します。 セクション / レッスンも一緒に消えます。`)
    )
      return;
    try {
      await deleteStage(stage.id);
      await refetch();
    } catch (err) {
      toast.error(`削除失敗: ${err instanceof Error ? err.message : "unknown"}`);
    }
  };

  return (
    <>
      <PageHeader
        title="ステージ管理"
        sub="公開状態 / セクション・レッスン / 教材アップロード"
        actions={
          <Button variant="accent" onClick={() => void onCreate()}>
            <Plus size={14} />
            新規ステージ
          </Button>
        }
      />

      {error ? (
        <div className="mb-4 rounded-md border border-destructive bg-danger-soft px-3 py-2 text-[12.5px] text-destructive">
          {error}
        </div>
      ) : null}

      {loading && stages.length === 0 ? (
        <SkeletonRows rows={4} className="py-4" />
      ) : stages.length === 0 ? (
        <div className="text-sm text-ink-3 py-10 text-center border border-dashed border-border rounded-md">
          まだステージがありません。 「新規ステージ」 ボタンから作成してください。
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
        >
          {stages.map((c) => (
            <StageCard
              key={c.id}
              stage={c}
              onEdit={() => setEditingId(c.id)}
              onTogglePublish={() => void onTogglePublish(c)}
              onDelete={() => void onDelete(c)}
            />
          ))}
        </div>
      )}
    </>
  );
}

interface StageCardProps {
  stage: StageRow;
  onEdit: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
}

function StageCard({ stage, onEdit, onTogglePublish, onDelete }: StageCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const color: StageColor = stage.color ?? "indigo";
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
      <div className="relative">
        <StageThumb color={color} thumbnailPath={stage.thumbnail_path} />
        <div className="absolute top-2.5 left-2.5">
          {stage.status === "published" ? (
            <Badge variant="success">公開中</Badge>
          ) : stage.status === "draft" ? (
            <Badge>下書き</Badge>
          ) : (
            <Badge variant="danger">アーカイブ</Badge>
          )}
        </div>
        <div className="absolute top-2.5 right-2.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="bg-card"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreHorizontal size={13} />
          </Button>
          {menuOpen ? (
            <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-md shadow-lg z-10 text-[12.5px]">
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-sunken"
                onClick={() => {
                  setMenuOpen(false);
                  onTogglePublish();
                }}
              >
                {stage.status === "published" ? "下書きに戻す" : "公開する"}
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-sunken text-destructive"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
              >
                削除
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="text-[15px] font-semibold leading-snug tracking-tight">{stage.title}</div>
        <div className="text-[11.5px] text-ink-3 flex gap-3 items-center">
          {stage.category ? <span>{stage.category}</span> : null}
          {stage.duration_hours ? <span>{stage.duration_hours}h</span> : null}
        </div>
        <div className="mt-auto flex items-center justify-between text-xs">
          <span className="text-[11.5px] text-ink-3">
            最終更新 {new Date(stage.updated_at).toLocaleDateString("ja-JP")}
          </span>
          <Button size="sm" onClick={onEdit}>
            <Edit size={12} />
            編集
          </Button>
        </div>
      </div>
    </div>
  );
}
