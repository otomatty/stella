/**
 * `/discovery` — 発見教材のレビュー画面 (Phase 4 / instructor + admin)。
 *
 * 流れは 1 本道:
 *
 *   つまずきの待ち行列 → 「下書きを生成」 → 下書きを直す → 承認 / 却下
 *
 * ## この画面が守ること
 *
 * - **承認するまで受講者には出ない。** 生成は必ず下書きで、公開のスイッチは
 *   エディタの「承認して公開」だけ (サーバも `approved` 以外を返さない)
 * - **読まずには公開できない。** 一覧に承認ボタンは置かない — 一覧から押せると
 *   AI が書いた設問を一度も表示しないまま公開できてしまう。承認は設問が目の前に
 *   出ているエディタからだけ。却下は中身を読まずとも成り立つ判断なので一覧に残す
 * - **出自を偽らない。** AI が書いた下書きと、既存の確認テストから複製した下書き
 *   (`heuristic`) はバッジで書き分ける。鍵が無い / 生成に失敗した環境では後者になる
 * - **誰がつまずいたかは出さない。** 待ち行列は「文脈」だけを持つ (サーバがそもそも
 *   利用者を記録していない)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardActions, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Loader2, Sparkles, X } from "@/lib/icons";
import {
  generateDiscoveryDraft,
  getDiscoveryOverview,
  patchDiscoveryMaterial,
  type DiscoveryMaterialRow,
  type DiscoveryRequestRow,
} from "@/lib/discovery-api";
import { cn } from "@/lib/utils";

import { DiscoveryMaterialEditor } from "./DiscoveryMaterialEditor";

const STATUS_META = {
  draft: { label: "下書き", variant: "warning" },
  approved: { label: "公開中", variant: "success" },
  rejected: { label: "却下", variant: "danger" },
} as const;

const ORIGIN_LABEL: Record<string, string> = {
  quiz_fail: "確認テストの不合格",
  submission_resubmit: "課題の再提出・不合格",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("ja-JP");
}

export function AdminDiscoveryPage() {
  const [requests, setRequests] = useState<DiscoveryRequestRow[]>([]);
  const [materials, setMaterials] = useState<DiscoveryMaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** 生成中のリクエスト id (二重押しを止める)。 */
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDiscoveryOverview();
      setRequests(data.requests);
      setMaterials(data.materials);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  /** まだ教材を作っていないつまずきを先に見せる (作った行は下に残す)。 */
  const pending = useMemo(() => requests.filter((r) => r.material_count === 0), [requests]);
  const editing = materials.find((m) => m.id === editingId) ?? null;

  const generate = async (request: DiscoveryRequestRow) => {
    setGeneratingId(request.id);
    try {
      const material = await generateDiscoveryDraft(request.id);
      await refetch();
      // 生成したらそのまま開く — 「作って終わり」にせず必ず中身を読ませる。
      setEditingId(material.id);
      toast.success(
        material.generator === "heuristic"
          ? "既存の確認テストから下書きを作りました。内容を確認してください"
          : "AI が下書きを作りました。内容を確認してください",
      );
    } catch (err) {
      toast.error(`生成に失敗しました: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setGeneratingId(null);
    }
  };

  /**
   * 一覧からできるのは **却下だけ**。
   *
   * 承認はエディタ (設問が表示された状態) からのみにしてある — 一覧から承認できると
   * 「AI が書いた設問を一度も見ずに公開する」ことが最短経路になってしまう。
   */
  const reject = async (material: DiscoveryMaterialRow) => {
    try {
      await patchDiscoveryMaterial(material.id, { review_status: "rejected" });
      await refetch();
      toast.success("却下しました");
    } catch (err) {
      toast.error(`更新に失敗しました: ${err instanceof Error ? err.message : "unknown"}`);
    }
  };

  return (
    <>
      <PageHeader
        title="発見教材"
        sub="受講者のつまずきから AI が作る補強演習。 講師が承認したものだけが「✦ 発見」として受講者に届く"
      />

      {error ? (
        <div className="mb-4 rounded-md border border-destructive bg-danger-soft px-3 py-2 text-[12.5px] text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>つまずきの待ち行列</CardTitle>
            <CardActions>
              <span className="text-[11.5px] text-ink-3">未生成 {pending.length} 件</span>
            </CardActions>
          </CardHeader>
          {loading && requests.length === 0 ? (
            <SkeletonRows rows={3} className="px-4 py-4" />
          ) : pending.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12.5px] text-ink-3">
              未生成のつまずきはありません。
              <div className="mt-1 text-ink-4">
                （同じ確認テストを 2 回落とす / 課題が再提出・不合格になると、ここに文脈が並びます）
              </div>
            </div>
          ) : (
            <div>
              {pending.map((row, i) => (
                <div
                  key={row.id}
                  className={cn(
                    "flex flex-wrap items-center gap-3 px-4 py-3",
                    i < pending.length - 1 ? "border-b border-border" : "",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium">{row.topic}</div>
                    <div className="mt-0.5 text-[11.5px] text-ink-3">
                      {row.stage_title ?? row.stage_id} · {ORIGIN_LABEL[row.origin] ?? row.origin} ·{" "}
                      {formatDate(row.created_at)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="accent"
                    disabled={generatingId !== null}
                    onClick={() => void generate(row)}
                  >
                    {generatingId === row.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Sparkles size={13} />
                    )}
                    下書きを生成
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>教材ライブラリ</CardTitle>
            <CardActions>
              <span className="text-[11.5px] text-ink-3">
                公開中 {materials.filter((m) => m.review_status === "approved").length} /{" "}
                {materials.length} 件
              </span>
            </CardActions>
          </CardHeader>
          {loading && materials.length === 0 ? (
            <SkeletonRows rows={3} className="px-4 py-4" />
          ) : materials.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12.5px] text-ink-3">
              まだ教材はありません。 上の待ち行列から下書きを生成してください。
            </div>
          ) : (
            <div>
              {materials.map((row, i) => {
                const meta = STATUS_META[row.review_status];
                return (
                  <div
                    key={row.id}
                    className={cn(
                      "flex flex-wrap items-center gap-3 px-4 py-3",
                      i < materials.length - 1 ? "border-b border-border" : "",
                    )}
                  >
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium">{row.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-3">
                        <span>{row.stage_title ?? row.stage_id}</span>
                        <span>· {row.questions.length} 問</span>
                        <span className="rounded-full border border-border px-1.5">
                          {row.generator === "heuristic"
                            ? "✦ 既存テストから複製"
                            : "✦ AI生成 (Claude)"}
                        </span>
                        {row.reviewed_at ? <span>· 確認 {formatDate(row.reviewed_at)}</span> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* 承認への入口はここだけ (押すと設問が開く)。一覧に承認ボタンは置かない。 */}
                      <Button
                        size="sm"
                        variant={row.review_status === "draft" ? "accent" : "ghost"}
                        onClick={() => setEditingId(row.id)}
                      >
                        {row.review_status === "draft" ? "中身を見て承認" : "中身を見る"}
                      </Button>
                      {row.review_status !== "rejected" ? (
                        <Button size="sm" variant="ghost" onClick={() => void reject(row)}>
                          <X size={13} />
                          却下
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {editing ? (
        <DiscoveryMaterialEditor
          material={editing}
          onClose={() => setEditingId(null)}
          onSaved={() => void refetch()}
        />
      ) : null}
    </>
  );
}
