import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SkeletonRows } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppShell } from "@/components/shell/app-shell-context";
import { monitoringSkillSheetEntryVisible } from "@/lib/skill-sheet-ui";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { ASSIGNABLE_CATEGORIES } from "@falcon/shared/interview/types";
import {
  applyAssignmentSave,
  listInterviewPrepAssignments,
  mergeAssignmentAggregates,
  restoreAssignmentRow,
  saveInterviewPrepAssignment,
  type InterviewPrepAssignmentRow,
} from "@/lib/interview-prep-api";
import { Chip } from "@/components/ui/chip";
import { InterviewAudioAdmin } from "@/components/admin/InterviewAudioAdmin";
import { InterviewQuestionEditor } from "@/components/admin/InterviewQuestionEditor";
import { InterviewPrepMonitoring } from "@/components/instructor/InterviewPrepMonitoring";
import { PrepTargetRoleBadge } from "@/components/interview/PrepTargetRoleBadge";

export function InterviewPrepAssignmentsPage({
  backendEnabled,
  canEditSchedule,
  canManageAudio = false,
  canEditQuestions = false,
}: {
  backendEnabled: boolean;
  /** sales/admin のみ true — 面談予定日・メモの編集可否 (Issue #205)。 */
  canEditSchedule: boolean;
  /** admin のみ true — 質問読み上げ音声の生成・再生成タブを出す。 */
  canManageAudio?: boolean;
  /** sales/admin のみ true — 想定質問そのものの編集タブを出す (Issue #237)。 */
  canEditQuestions?: boolean;
}) {
  const [rows, setRows] = useState<InterviewPrepAssignmentRow[]>([]);
  const [loading, setLoading] = useState(backendEnabled);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  // モニタリングを既定タブにする (Issue #236) — 講師・営業の起点は「準備できているか」。
  const [tab, setTab] = useState<"monitoring" | "assign" | "questions" | "audio">("monitoring");
  const [draftDates, setDraftDates] = useState<Record<string, string>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  const shell = useAppShell();
  // スキルシートの入口はモニタリングの詳細ドロワーに 1 つだけ置く (Issue #236)。
  const showSkillSheetEntry = monitoringSkillSheetEntryVisible({
    profileRole: shell.profileRole,
    shellRole: shell.role,
  });

  /**
   * 再取得の世代番号。 チップを続けて押すと保存も再取得も並ぶので、 遅れて届いた
   * 古い応答で新しい集計を上書きしないよう、 最後に投げたものだけを採用する。
   */
  const reloadSeq = useRef(0);

  /**
   * 一覧を引き直して集計 (準備率・内訳・最終練習日) を更新する。 割当を変えると
   * 準備率の分母が変わるため、 保存のたびにサーバの再集計を取り込む必要がある。
   *
   * 取り込むのは集計値だけ。 まるごと差し替えると、 この再取得が飛んでいる最中に
   * 別の行で保存した面談日・メモ・割当が、 保存前のスナップショットで巻き戻る。
   */
  const refreshRows = useCallback(async () => {
    const seq = ++reloadSeq.current;
    const r = await listInterviewPrepAssignments();
    if (seq === reloadSeq.current) setRows((rs) => mergeAssignmentAggregates(rs, r));
  }, []);

  useEffect(() => {
    if (!backendEnabled) return;
    const seq = ++reloadSeq.current;
    let cancelled = false;
    listInterviewPrepAssignments()
      .then((r) => {
        if (cancelled || seq !== reloadSeq.current) return;
        setRows(r);
        setDraftDates(
          Object.fromEntries(r.map((row) => [row.profile_id, row.interviewDate ?? ""])),
        );
        setDraftNotes(Object.fromEntries(r.map((row) => [row.profile_id, row.note ?? ""])));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backendEnabled]);

  const toggle = async (row: InterviewPrepAssignmentRow, category: string) => {
    const next = row.categories.includes(category)
      ? row.categories.filter((c) => c !== category)
      : [...row.categories, category];
    // 楽観更新 → 失敗時はこの行だけロールバック（他行の並行編集を巻き込まない）。
    // 集計値は割当が変わると当てにならないので、 保存成功後に引き直す。
    setRows((rs) => applyAssignmentSave(rs, row.profile_id, { categories: next }));
    setSavingId(row.profile_id);
    try {
      await saveInterviewPrepAssignment(row.profile_id, { categories: next });
    } catch (e) {
      // サーバは何も変えていないので、 集計値も含めて保存前の行をそのまま戻す
      // (集計値を落としたままだとこの経路には再取得が続かず「集計中…」で固まる)。
      setRows((rs) => restoreAssignmentRow(rs, row));
      toast.error(e instanceof Error ? e.message : "保存に失敗しました");
      setSavingId(null);
      return;
    }
    toast(`${row.display_name} の面談対策を更新しました`);
    // ここから先の失敗は「保存できなかった」ではない。 サーバは新しい割当を持っているので、
    // 再取得がこけてもロールバックしてはいけない (画面だけ旧割当に戻ると実態とずれる)。
    // 集計値は落としたままにして、 分からないことを分からないまま示す。
    try {
      await refreshRows();
    } catch {
      toast.error(
        "割当は保存しました。準備率の再集計を取得できませんでした（再読み込みしてください）",
      );
    } finally {
      setSavingId(null);
    }
  };

  const saveSchedule = async (row: InterviewPrepAssignmentRow) => {
    const interviewDate = draftDates[row.profile_id]?.trim() || null;
    const note = draftNotes[row.profile_id]?.trim() || null;
    setSavingId(row.profile_id);
    try {
      await saveInterviewPrepAssignment(row.profile_id, {
        categories: row.categories,
        interviewDate,
        note,
      });
      // 面談日・メモは準備率の分母に効かないので、 集計値はそのまま残せる。
      setRows((rs) => applyAssignmentSave(rs, row.profile_id, { interviewDate, note }));
      toast(`${row.display_name} の面談予定を更新しました`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSavingId(null);
    }
  };

  const tabs = (
    <div className="flex items-center gap-1.5 mb-3">
      <Chip active={tab === "monitoring"} onClick={() => setTab("monitoring")}>
        モニタリング
      </Chip>
      <Chip active={tab === "assign"} onClick={() => setTab("assign")}>
        割当
      </Chip>
      {canEditQuestions ? (
        <Chip active={tab === "questions"} onClick={() => setTab("questions")}>
          質問編集
        </Chip>
      ) : null}
      {canManageAudio ? (
        <Chip active={tab === "audio"} onClick={() => setTab("audio")}>
          質問音声
        </Chip>
      ) : null}
    </div>
  );

  if (canEditQuestions && tab === "questions") {
    return (
      <>
        <PageHeader
          title="面談対策の質問編集"
          sub="想定質問の文面を直します。質問文と深掘りを直すと読み上げ音声もその場で作り直されます"
        />
        {tabs}
        {backendEnabled ? (
          <InterviewQuestionEditor canManageAudio={canManageAudio} />
        ) : (
          <Card className="p-12 text-center text-sm text-ink-3">
            デモモードでは質問を編集できません。
          </Card>
        )}
      </>
    );
  }

  if (canManageAudio && tab === "audio") {
    return (
      <>
        <PageHeader
          title="面談対策"
          sub="質問の読み上げ音声を生成・再生成します。生成した音声は受講者の練習画面で再生されます"
        />
        {tabs}
        {backendEnabled ? (
          <InterviewAudioAdmin />
        ) : (
          <Card className="p-12 text-center text-sm text-ink-3">
            デモモードでは音声を生成できません。
          </Card>
        )}
      </>
    );
  }

  if (tab === "monitoring") {
    return (
      <>
        <PageHeader
          title="面談対策のモニタリング"
          sub="面談日が近い順に受講者の準備状況を並べます。行を開くと質問ごとのステータスと個別回答の型を確認できます"
        />
        {tabs}
        <InterviewPrepMonitoring
          rows={rows}
          loading={loading}
          error={error}
          backendEnabled={backendEnabled}
          showSkillSheet={showSkillSheetEntry}
          profileRole={shell.profileRole}
          shellRole={shell.role}
          currentUserId={shell.currentUserId}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="面談対策の割当"
        sub="対象者ごとに対策する案件種別を設定します。フレームワークまで指定すると、その言語の共通問題も併せて表示されます"
      />
      {tabs}
      {/* 管理者は一覧に自分の行を持つ。 割り当てたあと受講者画面へ切り替えれば練習できる。 */}
      <p className="mb-3 text-[12px] text-ink-3">
        受講者に加えて管理者も対象にできます。 自分で練習するときは、
        割り当てたあと左下のメニューから「受講者画面を表示」に切り替えてください。
      </p>
      {!backendEnabled ? (
        <Card className="p-12 text-center text-sm text-ink-3">
          デモモードでは割当を編集できません。
        </Card>
      ) : loading ? (
        <Card className="p-6">
          <SkeletonRows rows={5} />
        </Card>
      ) : error ? (
        <Card className="p-12 text-center text-sm text-destructive">
          対象者一覧の取得に失敗しました: {error}
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table className="max-lg:min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead className="w-40 sm:w-56">対象者</TableHead>
                <TableHead className="w-36">面談予定</TableHead>
                <TableHead className="w-48">メモ</TableHead>
                <TableHead>割当</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.profile_id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium">{row.display_name}</span>
                      <PrepTargetRoleBadge role={row.role} />
                    </div>
                    <div className="text-[11.5px] text-ink-4">{row.email ?? ""}</div>
                  </TableCell>
                  <TableCell>
                    {canEditSchedule ? (
                      <Input
                        type="date"
                        value={draftDates[row.profile_id] ?? ""}
                        disabled={savingId === row.profile_id}
                        onChange={(e) =>
                          setDraftDates((d) => ({ ...d, [row.profile_id]: e.target.value }))
                        }
                        className="h-8 text-[12px]"
                      />
                    ) : (
                      <span className="text-[12px] text-ink-3">{row.interviewDate ?? "—"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canEditSchedule ? (
                      <div className="flex flex-col gap-1.5">
                        <Input
                          value={draftNotes[row.profile_id] ?? ""}
                          disabled={savingId === row.profile_id}
                          onChange={(e) =>
                            setDraftNotes((d) => ({ ...d, [row.profile_id]: e.target.value }))
                          }
                          placeholder="案件メモ"
                          className="h-8 text-[12px]"
                        />
                        <Button
                          variant="default"
                          size="sm"
                          disabled={savingId === row.profile_id}
                          onClick={() => void saveSchedule(row)}
                        >
                          予定を保存
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[12px] text-ink-3">{row.note ?? "—"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {ASSIGNABLE_CATEGORIES.map((c) => (
                        <Chip
                          key={c}
                          active={row.categories.includes(c)}
                          disabled={savingId === row.profile_id}
                          onClick={() => void toggle(row, c)}
                          ariaLabel={`${row.display_name} に ${c} を割当`}
                        >
                          {c}
                        </Chip>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-ink-3 p-8">
                    受講者がいません。
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
