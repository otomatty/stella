import { IntegrationGroupFilter } from "@/components/integrations/IntegrationGroupFilter";
import { gradebookCsv, gradebookTaskLabel } from "@/lib/gradebook";
/**
 * 講師/管理者向け成績台帳 (gradebook) (Issue #26)。
 *
 * ステージを選ぶと、 受講登録された受講者ごとの達成状況 (進捗 + 小テスト + 課題) を
 * 一覧表示する。 基準達成かつ未発行の受講者は、 この画面から修了証を承認発行できる。
 *
 * データは get_course_gradebook RPC (staff のみ / security definer) から取得する。
 * バックエンド未設定時は実データが無いため、 その旨を案内する。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Award, CheckCircle, Download, Loader2 } from "@/lib/icons";
import { NativeSelect } from "@/components/ui/native-select";
import { SkeletonRows } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { Stage } from "@/data/types";
import type { StageGradebook, GradebookEntry } from "@stella/shared/cms/types";
import { isBackendConfigured } from "@/lib/backend";
import { fetchStageGradebook, issueCertificate } from "@/lib/certificates-api";
import { downloadCsv } from "@/lib/csv";

interface GradebookProps {
  stages: Stage[];
}

export const Gradebook = ({ stages }: GradebookProps) => {
  const [stageId, setStageId] = useState<string>(() => stages[0]?.id ?? "");
  const [groupId, setGroupId] = useState("");
  const [data, setData] = useState<StageGradebook | null>(null);
  const [loading, setLoading] = useState(false);
  const [issuingUser, setIssuingUser] = useState<string | null>(null);

  const backendEnabled = isBackendConfigured();
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (!backendEnabled || !stageId) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const next = await fetchStageGradebook(stageId, groupId);
      if (requestId === requestIdRef.current) setData(next);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error("[Gradebook] load failed", err);
      toast.error("成績台帳の取得に失敗しました");
      setData(null);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [backendEnabled, stageId, groupId]);

  useEffect(() => {
    void load();
  }, [load]);

  // stages は バックエンド設定時に非同期で到着する (初期は fixtures / 空)。
  // 選択中の stageId が未設定 / 現在の一覧に無い場合は先頭ステージへ補正し、
  // ロード前の fixture id のまま台帳取得が空振りし続けるのを防ぐ。
  useEffect(() => {
    const firstId = stages[0]?.id ?? "";
    if (!firstId) return;
    if (!stageId || !stages.some((c) => c.id === stageId)) {
      setStageId(firstId);
    }
  }, [stages, stageId]);

  const onExport = () => {
    if (!data || data.rows.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const safeTitle = data.stage_title.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 40);
    downloadCsv(`gradebook-${safeTitle}-${stamp}.csv`, gradebookCsv(data));
    toast.success("成績台帳を出力しました");
  };

  const onIssue = async (userId: string) => {
    if (!stageId) return;
    setIssuingUser(userId);
    try {
      const result = await issueCertificate(stageId, userId);
      toast.success(result.already_existed ? "既に発行済みです" : "修了証を発行しました");
      await load();
    } catch (err) {
      toast.error(`発行に失敗しました: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setIssuingUser(null);
    }
  };

  return (
    <>
      <PageHeader
        title="成績台帳"
        sub="受講者ごとの達成状況を確認し、 修了証を発行できます"
        actions={
          <>
            <IntegrationGroupFilter value={groupId} onChange={setGroupId} />
            <NativeSelect
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              size="sm"
              className="w-full sm:w-auto sm:max-w-[320px]"
            >
              {stages.length === 0 ? <option value="">ステージなし</option> : null}
              {stages.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </NativeSelect>
            <Button type="button" onClick={onExport} disabled={!data || data.rows.length === 0}>
              <Download size={14} />
              CSV出力
            </Button>
          </>
        }
      />

      {!backendEnabled ? (
        <div className="text-[13px] text-ink-3 bg-card border border-border rounded-md px-4 py-6 text-center">
          成績台帳はバックエンド (Neon) 接続時に実データで動作します
          (現在はデモ表示のため利用できません)。
        </div>
      ) : loading ? (
        <SkeletonRows rows={5} className="py-6" />
      ) : !data ? (
        <div className="text-[13px] text-ink-3">ステージを選択してください。</div>
      ) : data.rows.length === 0 ? (
        <div className="text-[13px] text-ink-3 bg-card border border-border rounded-md px-4 py-6 text-center">
          このステージに受講登録された受講者はいません。
        </div>
      ) : (
        <GradebookTable
          rows={data.rows}
          issuingUser={issuingUser}
          onIssue={(uid) => void onIssue(uid)}
        />
      )}
    </>
  );
};

function GradebookTable({
  rows,
  issuingUser,
  onIssue,
}: {
  rows: GradebookEntry[];
  issuingUser: string | null;
  onIssue: (userId: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>受講者</TableHead>
            <TableHead>レッスン</TableHead>
            <TableHead>小テスト</TableHead>
            <TableHead>課題</TableHead>
            <TableHead>状態</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const c = row.completion;
            const hasCert = Boolean(c?.has_certificate);
            const met = Boolean(c?.met);
            return (
              <TableRow key={row.user_id}>
                <TableCell>
                  <div className="font-medium text-foreground">{row.display_name}</div>
                  {row.email ? <div className="text-[11px] text-ink-4">{row.email}</div> : null}
                </TableCell>
                <TableCell className="font-mono text-ink-2">
                  {c ? `${c.completed_lessons}/${c.total_lessons}` : "—"}
                </TableCell>
                <TableCell className="font-mono text-ink-2">
                  {c ? `${c.passed_quizzes}/${c.total_quizzes}` : "—"}
                </TableCell>
                <TableCell className="font-mono text-ink-2">{gradebookTaskLabel(row)}</TableCell>
                <TableCell>
                  {hasCert ? (
                    <Badge variant="success">発行済み</Badge>
                  ) : met ? (
                    <span className="inline-flex items-center gap-1 text-brand">
                      <CheckCircle size={13} />
                      達成
                    </span>
                  ) : (
                    <span className="text-ink-4">未達成</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!hasCert && met ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="accent"
                      disabled={issuingUser === row.user_id}
                      onClick={() => onIssue(row.user_id)}
                    >
                      {issuingUser === row.user_id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Award size={13} />
                      )}
                      発行
                    </Button>
                  ) : hasCert && c?.cert_code ? (
                    <span className="font-mono text-[11px] text-ink-4">{c.cert_code}</span>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
