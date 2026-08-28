/**
 * 講師/管理者向け成績台帳 (gradebook) (Issue #26)。
 *
 * ステージを選ぶと、 受講登録された受講者ごとの達成状況 (進捗 + 小テスト + 課題) を
 * 一覧表示する。 基準達成かつ未発行の受講者は、 この画面から修了証を承認発行できる。
 *
 * データは get_course_gradebook RPC (staff のみ / security definer) から取得する。
 * バックエンド未設定時は実データが無いため、 その旨を案内する。
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Award, CheckCircle, Download, Loader2 } from "@/lib/icons";
import { SkeletonRows } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Stage } from "@/data/types";
import type { StageGradebook, EnrollmentStatus, GradebookEntry } from "@falcon/shared/cms/types";
import { isBackendConfigured } from "@/lib/backend";
import { fetchStageGradebook, issueCertificate } from "@/lib/certificates-api";
import { downloadCsv, toCsv } from "@/lib/csv";

/** enrollment ステータスを日本語の表示語にする。 */
const ENROLLMENT_STATUS_LABEL: Record<EnrollmentStatus, string> = {
  active: "受講中",
  completed: "完了",
  expired: "期限切れ",
};

interface GradebookProps {
  stages: Stage[];
}

export const Gradebook = ({ stages }: GradebookProps) => {
  const [stageId, setStageId] = useState<string>(() => stages[0]?.id ?? "");
  const [data, setData] = useState<StageGradebook | null>(null);
  const [loading, setLoading] = useState(false);
  const [issuingUser, setIssuingUser] = useState<string | null>(null);

  const backendEnabled = isBackendConfigured();

  const load = useCallback(async () => {
    if (!backendEnabled || !stageId) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      setData(await fetchStageGradebook(stageId));
    } catch (err) {
      console.error("[Gradebook] load failed", err);
      toast.error("成績台帳の取得に失敗しました");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [backendEnabled, stageId]);

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
    const headers = [
      "受講者",
      "メール",
      "受講状態",
      "期限",
      "登録日",
      "レッスン完了",
      "レッスン総数",
      "小テスト合格",
      "小テスト総数",
      "課題合格",
      "課題総数",
      "達成",
      "修了証",
      "認定番号",
    ];
    const rows = data.rows.map((r) => {
      const c = r.completion;
      return [
        r.display_name,
        r.email ?? "",
        ENROLLMENT_STATUS_LABEL[r.enrollment_status] ?? r.enrollment_status,
        r.due_at ? r.due_at.slice(0, 10) : "",
        r.enrolled_at ? r.enrolled_at.slice(0, 10) : "",
        c?.completed_lessons ?? "",
        c?.total_lessons ?? "",
        c?.passed_quizzes ?? "",
        c?.total_quizzes ?? "",
        c?.passed_assignments ?? "",
        c?.total_assignments ?? "",
        c?.met ? "達成" : "未達成",
        c?.has_certificate ? "発行済み" : "",
        c?.cert_code ?? "",
      ];
    });
    const stamp = new Date().toISOString().slice(0, 10);
    const safeTitle = data.stage_title.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 40);
    downloadCsv(`gradebook-${safeTitle}-${stamp}.csv`, toCsv(headers, rows));
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
            <select
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              className="h-8 rounded-sm border border-border-2 bg-card px-3 text-[13px]"
            >
              {stages.length === 0 ? <option value="">ステージなし</option> : null}
              {stages.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <Button onClick={onExport} disabled={!data || data.rows.length === 0}>
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
    <div className="bg-card border border-border rounded-md overflow-hidden">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="text-left text-ink-4 border-b border-border">
            <th className="font-semibold px-4 py-2.5">受講者</th>
            <th className="font-semibold px-3 py-2.5">レッスン</th>
            <th className="font-semibold px-3 py-2.5">小テスト</th>
            <th className="font-semibold px-3 py-2.5">課題</th>
            <th className="font-semibold px-3 py-2.5">状態</th>
            <th className="font-semibold px-4 py-2.5 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const c = row.completion;
            const hasCert = Boolean(c?.has_certificate);
            const met = Boolean(c?.met);
            return (
              <tr key={row.user_id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-foreground">{row.display_name}</div>
                  {row.email ? <div className="text-[11px] text-ink-4">{row.email}</div> : null}
                </td>
                <td className="px-3 py-2.5 font-mono text-ink-2">
                  {c ? `${c.completed_lessons}/${c.total_lessons}` : "—"}
                </td>
                <td className="px-3 py-2.5 font-mono text-ink-2">
                  {c ? `${c.passed_quizzes}/${c.total_quizzes}` : "—"}
                </td>
                <td className="px-3 py-2.5 font-mono text-ink-2">
                  {c ? `${c.passed_assignments}/${c.total_assignments}` : "—"}
                </td>
                <td className="px-3 py-2.5">
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
                </td>
                <td className="px-4 py-2.5 text-right">
                  {!hasCert && met ? (
                    <Button
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
