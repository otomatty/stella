/**
 * `/admin/enrollments` — 受講状況 (Phase 3b で「受講登録」から改称)。
 *
 * ## 割り当てる画面ではなくなった
 *
 * 管理者がステージを割り当てる運用は Phase 3b で廃止した。開始位置は視界とロック
 * (前提・飛び級) が決め、受講者がホームのプレースメントや道・スキルツリーから
 * **自分で開始する** (`POST /api/stages/:id/start`)。したがってこの画面の主目的は
 * 「誰がどのステージをいつ始めて、どこまで進んだか」を追うこと。
 *
 * ただし **始まったあとの運用操作は残す** — 期限の設定 / 変更、完了の手直し、
 * 誤って始めた登録の解除。行のメニューからだけ触れる (画面の主役は一覧のまま)。
 * 「割り当てる」導線は復活させない — 自己開始のモデルが崩れるため。
 *
 * データ取得は 2 本に分ける。受講者一覧のバッジは件数サマリ (`/api/enrollments/summary`)、
 * 右ペインの受講状況は選択中の受講者ぶんだけを取る。テナント全件を取ると
 * 受講者数 × ステージ数に比例して応答が膨らむため。
 *
 * バックエンド未設定時 (dev fixtures フロー): 操作不可の案内のみ表示する。
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Download } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import type { StageRow } from "@stella/shared/cms/types";
import { useCmsStages } from "@/hooks/useCmsStages";
import { useProfiles } from "@/hooks/useProfiles";
import { useEnrollmentSummaries, useUsersEnrollments } from "@/hooks/useEnrollments";
import type { AdminProfileRow } from "@/lib/admin-users-api";
import {
  deleteEnrollment,
  listEnrollmentPresetNames,
  listEnrollmentsForUsers,
  updateEnrollment,
  type UpdateEnrollmentPatch,
} from "@/lib/enrollments-api";
import { downloadCsv, toCsv } from "@/lib/csv";
import { ROLE_LABEL } from "./users-admin/shared";
import { LearnerPanel } from "./enrollments-admin/LearnerPanel";
import { StatusPanel } from "./enrollments-admin/StatusPanel";
import {
  ENROLLMENT_STATUS_LABEL,
  type StatusFilter,
  type LearnerFilter,
  indexEnrollments,
} from "./enrollments-admin/shared";

/**
 * CSV に出せる行数の上限 (受講者 × 教材)。
 *
 * 全受講者を対象にすると行数がテナント規模 × 教材数で増える。 ブラウザ側で行配列と
 * CSV 文字列を二重に持つため、 上限を超える指定は出力せず対象を絞ってもらう。
 */
const MAX_CSV_ROWS = 20_000;

interface Props {
  tenantId: string;
  backendEnabled: boolean;
}

export function AdminEnrollmentsPage({ tenantId, backendEnabled }: Props) {
  if (!backendEnabled) {
    return <EnrollmentsDemoNotice />;
  }
  return <EnrollmentsLive tenantId={tenantId} />;
}

function EnrollmentsLive({ tenantId }: { tenantId: string }) {
  const { stages, loading: stagesLoading } = useCmsStages(tenantId);
  const { profiles, loading: profilesLoading, error: profilesError } = useProfiles(tenantId);
  const { summaries, error: summariesError } = useEnrollmentSummaries(tenantId);

  const [learnerFilter, setLearnerFilter] = useState<LearnerFilter>("student");
  const [learnerQuery, setLearnerQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusQuery, setStatusQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [exporting, setExporting] = useState(false);
  /** 行メニューの操作中 (enrollment id)。 同じ行の二重操作を止める。 */
  const [busyEnrollmentId, setBusyEnrollmentId] = useState<string | null>(null);

  /**
   * 割当プリセットの id → 名前 (出自バッジ用)。
   *
   * 適用は退役したが、移行前の登録は `preset_id` を持ったまま残る。 引けなかったときは
   * 空のままにして **バッジを出さない** — 名前が読めないことを 「削除済み」 と断言すると、
   * 生きている定義まで消えたように見える。 staff しか開かない画面なので、追加の
   * 1 リクエストは払ってよい。
   */
  const [presetNameById, setPresetNameById] = useState<Map<string, string>>(EMPTY_PRESET_NAMES);
  useEffect(() => {
    let alive = true;
    listEnrollmentPresetNames()
      .then((map) => {
        if (alive) setPresetNameById(map);
      })
      .catch(() => {
        // バッジが出ないだけ。 受講状況そのものは読めているので画面は止めない。
      });
    return () => {
      alive = false;
    };
  }, []);

  const selectedIdList = useMemo(() => [...selectedIds], [selectedIds]);
  const {
    enrollments,
    loading: enrollmentsLoading,
    error: enrollmentsError,
    refetch: refetchEnrollments,
  } = useUsersEnrollments(selectedIdList);

  // 受講者 (student) が主対象。 無効化ユーザーは除外する。
  const students = useMemo(
    () => profiles.filter((p) => p.role === "student" && !p.disabled),
    [profiles],
  );
  // スタッフ (講師 / 管理者) も自分で受講を始められるので、 状況を見る対象に残す。
  const staff = useMemo(
    () => profiles.filter((p) => p.role !== "student" && !p.disabled),
    [profiles],
  );

  const profileById = useMemo(() => {
    const map = new Map<string, AdminProfileRow>();
    for (const p of [...students, ...staff]) map.set(p.id, p);
    return map;
  }, [students, staff]);

  const enrollmentIndex = useMemo(() => indexEnrollments(enrollments), [enrollments]);

  // 選択解除済み / 無効化されたユーザーが残らないよう profile 側と突き合わせる。
  const selectedProfiles = useMemo(
    () =>
      [...selectedIds]
        .map((id) => profileById.get(id))
        .filter((p): p is AdminProfileRow => p !== undefined),
    [selectedIds, profileById],
  );

  /**
   * 行メニューの運用操作 (期限 / 状態 / 解除)。
   *
   * 成否をトーストで返し、成功したら選択中の受講者ぶんを取り直す。 画面が持つ
   * enrollment は選択に紐づくので、行を書き換えたら同じ範囲を読み直せば足りる。
   */
  const runRowAction = async (
    enrollmentId: string,
    label: string,
    run: () => Promise<void>,
  ): Promise<void> => {
    setBusyEnrollmentId(enrollmentId);
    try {
      await run();
      await refetchEnrollments();
      toast.success(`${label}しました`);
    } catch (err) {
      toast.error(`${label}できませんでした: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setBusyEnrollmentId(null);
    }
  };

  const onUpdateEnrollment = (id: string, patch: UpdateEnrollmentPatch, label: string) =>
    runRowAction(id, label, () => updateEnrollment(id, patch));

  const onDeleteEnrollment = (id: string) =>
    runRowAction(id, "受講登録を解除", () => deleteEnrollment(id));

  const selectOnly = (userId: string) => setSelectedIds(new Set([userId]));

  const toggleSelected = (userId: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

  const setVisibleSelected = (userIds: string[], selected: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of userIds) {
        if (selected) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  // CSV の出力対象。 選択があればその受講生、 なければ受講者全員。
  const exportTargets = selectedProfiles.length > 0 ? selectedProfiles : students;

  /**
   * 受講者 × 教材の受講状況を CSV にする (選択中がいればその受講生ぶんだけ)。
   *
   * 画面が持っているのは選択中の受講者ぶんだけなので、 出力対象の enrollment はここで
   * 取り直す (サーバ側の上限に合わせて分割リクエストになる)。
   */
  const onExport = async () => {
    const targets = exportTargets;
    if (targets.length === 0 || stages.length === 0) return;
    // 受講者 × 教材の全組を 1 度にメモリへ載せるので、 行数に上限を設ける。
    // 超える場合は黙って切り詰めず、 対象を絞ってもらう。
    const rowCount = targets.length * stages.length;
    if (rowCount > MAX_CSV_ROWS) {
      toast.error(
        `出力対象が多すぎます (${rowCount.toLocaleString()} 行)。` +
          ` 受講生を選ぶか教材を整理して、 ${MAX_CSV_ROWS.toLocaleString()} 行以内にしてください`,
      );
      return;
    }
    setExporting(true);
    let index: typeof enrollmentIndex;
    try {
      index = indexEnrollments(await listEnrollmentsForUsers(targets.map((p) => p.id)));
    } catch (err) {
      toast.error(`出力に失敗しました: ${err instanceof Error ? err.message : "unknown"}`);
      return;
    } finally {
      setExporting(false);
    }
    const headers = [
      "受講者",
      "メール",
      "ロール",
      "教材",
      "開始",
      "受講状態",
      "期限",
      "必須",
      "開始日",
    ];
    const rows = targets.flatMap((p) =>
      stages.map((stage: StageRow) => {
        const e = index.get(p.id)?.get(stage.id);
        return [
          p.display_name,
          p.email ?? "",
          ROLE_LABEL[p.role],
          stage.title,
          e ? "開始済み" : "未開始",
          e ? (ENROLLMENT_STATUS_LABEL[e.status] ?? e.status) : "—",
          e?.due_at ? e.due_at.slice(0, 10) : "",
          e ? (e.required ? "必須" : "任意") : "",
          e?.enrolled_at ? e.enrolled_at.slice(0, 10) : "",
        ];
      }),
    );
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`enrollments-${stamp}.csv`, toCsv(headers, rows));
    toast.success("受講状況を出力しました");
  };

  const error = profilesError ?? summariesError;

  return (
    <>
      <PageHeader
        title="受講状況"
        sub="受講者が自分で始めたステージと進み具合を確認します"
        actions={
          <Button
            disabled={stages.length === 0 || exportTargets.length === 0 || exporting}
            onClick={() => void onExport()}
          >
            <Download size={14} />
            CSV出力
          </Button>
        }
      />

      {error ? (
        <div className="mb-4 rounded-md border border-destructive bg-danger-soft px-3 py-2 text-[12.5px] text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <LearnerPanel
          students={students}
          staff={staff}
          filter={learnerFilter}
          onChangeFilter={setLearnerFilter}
          query={learnerQuery}
          onChangeQuery={setLearnerQuery}
          selectedIds={selectedIds}
          onSelectOnly={selectOnly}
          onToggle={toggleSelected}
          onSetVisibleSelected={setVisibleSelected}
          summaries={summaries}
          stageCount={stages.length}
          loading={profilesLoading}
        />

        <StatusPanel
          stages={stages}
          stagesLoading={stagesLoading}
          selectedProfiles={selectedProfiles}
          enrollmentIndex={enrollmentIndex}
          enrollmentsLoading={enrollmentsLoading}
          enrollmentsError={enrollmentsError}
          onRetryEnrollments={() => void refetchEnrollments()}
          query={statusQuery}
          onChangeQuery={setStatusQuery}
          filter={statusFilter}
          onChangeFilter={setStatusFilter}
          onClearSelection={() => setSelectedIds(new Set())}
          onDeselect={toggleSelected}
          presetNameById={presetNameById}
          busyEnrollmentId={busyEnrollmentId}
          onUpdateEnrollment={onUpdateEnrollment}
          onDeleteEnrollment={onDeleteEnrollment}
        />
      </div>
    </>
  );
}

/** プリセット名を引けていない間の空 Map。 参照を 1 か所に固定して再生成を防ぐ。 */
const EMPTY_PRESET_NAMES = new Map<string, string>();

function EnrollmentsDemoNotice() {
  return (
    <>
      <PageHeader title="受講状況" sub="受講者が自分で始めたステージと進み具合を確認します" />
      <div className="rounded-md border border-border bg-sunken px-3 py-2 text-[12.5px] text-ink-3">
        バックエンド未接続のため受講状況は表示できません。
        <code className="mx-1">VITE_SERVER_URL</code>
        を設定してください。
      </div>
    </>
  );
}
