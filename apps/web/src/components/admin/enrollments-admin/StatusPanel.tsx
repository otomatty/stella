/**
 * 受講状況画面の右ペイン ―「選んだ受講生が、どの星をいつ始めて、どこまで進んだか」。
 *
 * Phase 3b で割当を廃止したので、**教材を渡す操作はここに無い**。受講者が自分で始めた
 * 学習を追うのが主目的で、行に出すのは「開始日 / 状態 / 期限 (あれば)」。教材の全件を
 * 並べるのではなく **登録のある星だけ** を並べる — 未受講は「まだ始めていない」であって
 * 割り当て漏れではなくなったため、全教材 × 全受講者のマトリクスを見せる意味が無い。
 *
 * ただし **始まったあとの後始末は staff の仕事として残る** — 期限の設定 / 変更、完了の
 * 手直し、誤って始めた登録の解除。 いずれも行の 「…」 メニューからだけ触れる: 一覧の
 * 主役は状況の把握で、操作は例外処理なので、常時ボタンを並べて視線を奪わない。
 * 「割り当てる」 導線は復活させない (自己開始のモデルが崩れる)。
 */

import { useMemo, useState } from "react";

import {
  Book,
  CalendarClock,
  CheckCircle,
  MoreHorizontal,
  RotateCcw,
  Trash,
  Users,
  X,
} from "@/lib/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SkeletonRows } from "@/components/ui/skeleton";
import { StageThumb } from "@/components/common/StageThumb";
import type { StageColor } from "@/data/types";
import type { AdminProfileRow } from "@/lib/admin-users-api";
import type { UpdateEnrollmentPatch } from "@/lib/enrollments-api";
import { todayDateKey } from "@/lib/date-keys";
import type { StageRow, EnrollmentRow } from "@falcon/shared/cms/types";
import { toneFromId } from "../users-admin/shared";
import {
  ENROLLMENT_STATUS_LABEL,
  type StatusFilter,
  type EnrollmentIndex,
  fromDateInput,
  isOverdue,
  toDateInput,
} from "./shared";

interface Props {
  stages: StageRow[];
  stagesLoading: boolean;
  selectedProfiles: AdminProfileRow[];
  enrollmentIndex: EnrollmentIndex;
  /** 選択中の受講者ぶんの enrollment を取得中か。 */
  enrollmentsLoading: boolean;
  /** 取得に失敗した場合のメッセージ。 */
  enrollmentsError: string | null;
  /** 取得失敗時の再試行。 */
  onRetryEnrollments: () => void;
  query: string;
  onChangeQuery: (query: string) => void;
  filter: StatusFilter;
  onChangeFilter: (filter: StatusFilter) => void;
  onClearSelection: () => void;
  onDeselect: (userId: string) => void;
  /**
   * プリセット id → 名前。 移行前の登録に残っている出自バッジ用。
   *
   * 引けなかったときは **空のまま渡ってくる**。 名前の無い出自は行に出さない
   * (「読めない」 を 「消えた」 と言い換えると嘘になる)。
   */
  presetNameById: Map<string, string>;
  /** 行メニューの操作中 (enrollment id)。 同じ行の二重操作を止める。 */
  busyEnrollmentId: string | null;
  /** 期限 / 状態の修正。 `label` はトーストの文言 (「期限を変更」 など)。 */
  onUpdateEnrollment: (id: string, patch: UpdateEnrollmentPatch, label: string) => Promise<void>;
  /** 受講登録の解除 (行ごと削除)。 */
  onDeleteEnrollment: (id: string) => Promise<void>;
}

/** 一覧に並べる 1 行 (受講者 × ステージ)。 */
interface StatusRow {
  key: string;
  profile: AdminProfileRow;
  stage: StageRow | undefined;
  enrollment: EnrollmentRow;
}

export function StatusPanel(props: Props) {
  const {
    stages,
    stagesLoading,
    selectedProfiles,
    enrollmentIndex,
    enrollmentsLoading,
    enrollmentsError,
    onRetryEnrollments,
    query,
    onChangeQuery,
    filter,
    onChangeFilter,
    onClearSelection,
    onDeselect,
    presetNameById,
    busyEnrollmentId,
    onUpdateEnrollment,
    onDeleteEnrollment,
  } = props;

  /**
   * 行メニューから開くダイアログ。 **パネルに 1 つだけ持つ** — 行ごとに持たせると
   * 選択中の受講者ぶん (数十行) のダイアログが常時マウントされ、 メニューを閉じた
   * 拍子にフォーカスの戻り先が消える事故も起きる。
   */
  const [dueTarget, setDueTarget] = useState<StatusRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StatusRow | null>(null);

  const today = todayDateKey();
  const stageById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all: StatusRow[] = [];
    for (const profile of selectedProfiles) {
      for (const enrollment of enrollmentIndex.get(profile.id)?.values() ?? []) {
        all.push({
          key: `${profile.id}::${enrollment.stage_id}`,
          profile,
          stage: stageById.get(enrollment.stage_id),
          enrollment,
        });
      }
    }
    return all
      .filter((row) => {
        if (filter === "active" && row.enrollment.status !== "active") return false;
        if (filter === "completed" && row.enrollment.status !== "completed") return false;
        if (filter === "overdue" && !isOverdue(row.enrollment, today)) return false;
        if (!q) return true;
        const stage = row.stage;
        return (
          (stage?.title ?? "").toLowerCase().includes(q) ||
          (stage?.category ?? "").toLowerCase().includes(q) ||
          row.profile.display_name.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          // 新しく始めたものを上に (受講状況は「いま誰が動いているか」を見る場)。
          (b.enrollment.enrolled_at ?? "").localeCompare(a.enrollment.enrolled_at ?? "") ||
          (a.stage?.title ?? "").localeCompare(b.stage?.title ?? "", "ja"),
      );
  }, [selectedProfiles, enrollmentIndex, stageById, filter, query, today]);

  if (selectedProfiles.length === 0) {
    return (
      <Card className="grid min-h-[320px] place-items-center px-6 py-16 text-center">
        <div>
          <div className="mx-auto grid size-11 place-items-center rounded-full bg-brand-soft text-brand">
            <Users size={18} />
          </div>
          <h2 className="mt-3 text-[15px] font-semibold tracking-tight">受講生を選んでください</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-ink-3">
            左のリストで受講生を選ぶと、 その人が始めたステージと進み具合をここで確認できます。
            教材の割り当ては行いません — 受講者が自分で開始します。
          </p>
        </div>
      </Card>
    );
  }

  const single = selectedProfiles.length === 1 ? selectedProfiles[0] : null;

  return (
    <Card>
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Book size={14} className="text-brand" />
          <h2 className="text-[13px] font-semibold tracking-tight">受講状況</h2>
          <span className="ml-auto text-[11.5px] text-ink-3">{rows.length} 件</span>
        </div>

        {single ? (
          <div className="mt-3 flex items-center gap-2.5">
            <Avatar size="sm">
              <AvatarFallback tone={toneFromId(single.id)}>
                {(single.initials ?? single.display_name.slice(0, 1)).slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold">{single.display_name}</div>
              <div className="truncate text-[11.5px] text-ink-3">{single.email ?? "—"}</div>
            </div>
            <Badge variant="accent" className="ml-1">
              開始 {enrollmentIndex.get(single.id)?.size ?? 0} 件
            </Badge>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={onClearSelection}>
              選択解除
            </Button>
          </div>
        ) : (
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] text-ink-2">
                <strong className="text-foreground">{selectedProfiles.length}</strong> 名の受講状況
              </span>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={onClearSelection}>
                選択解除
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedProfiles.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-sunken py-0.5 pl-2 pr-1 text-[11.5px]"
                >
                  {p.display_name}
                  <button
                    type="button"
                    onClick={() => onDeselect(p.id)}
                    aria-label={`${p.display_name} を選択から外す`}
                    className="grid size-4 place-items-center rounded-full text-ink-3 hover:bg-card hover:text-foreground"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-sunken px-4 py-2.5">
        <Input
          value={query}
          onChange={(e) => onChangeQuery(e.target.value)}
          placeholder="教材名 / 受講者で検索"
          aria-label="受講状況を検索"
          className="h-8 w-full text-[12.5px] sm:w-56"
        />
        <div className="flex items-center gap-1.5">
          <Chip active={filter === "all"} onClick={() => onChangeFilter("all")}>
            すべて
          </Chip>
          <Chip active={filter === "active"} onClick={() => onChangeFilter("active")}>
            受講中
          </Chip>
          <Chip active={filter === "completed"} onClick={() => onChangeFilter("completed")}>
            完了
          </Chip>
          <Chip active={filter === "overdue"} onClick={() => onChangeFilter("overdue")}>
            期限超過
          </Chip>
        </div>
      </div>

      {enrollmentsError !== null ? (
        <div className="px-4 py-12 text-center">
          <p className="text-[12.5px] text-destructive">
            受講状況を取得できませんでした: {enrollmentsError}
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={onRetryEnrollments}>
            再試行
          </Button>
        </div>
      ) : enrollmentsLoading || (stagesLoading && stages.length === 0) ? (
        <SkeletonRows rows={4} className="p-4" />
      ) : rows.length === 0 ? (
        <p className="px-4 py-12 text-center text-[12.5px] text-ink-3">
          {query.trim() || filter !== "all"
            ? "条件に一致する受講状況がありません。"
            : "まだ始めたステージがありません。 受講者はホームの案内から自分で開始します。"}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <StatusRowItem
              key={row.key}
              row={row}
              showLearner={single === null}
              today={today}
              presetNameById={presetNameById}
              busy={busyEnrollmentId === row.enrollment.id}
              menuDisabled={busyEnrollmentId !== null}
              onUpdateEnrollment={onUpdateEnrollment}
              onEditDue={() => setDueTarget(row)}
              onRequestDelete={() => setDeleteTarget(row)}
            />
          ))}
        </ul>
      )}

      <DueDateDialog
        row={dueTarget}
        onClose={() => setDueTarget(null)}
        onUpdateEnrollment={onUpdateEnrollment}
      />
      <DeleteEnrollmentDialog
        row={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleteEnrollment={onDeleteEnrollment}
      />
    </Card>
  );
}

/**
 * 期限の設定 / 変更。
 *
 * 自己開始では期限が付かないので、ここで付くのは **staff が運用の都合で足した締切**
 * (研修期間、面談前までに、など)。 日付だけを受け取り `shared.ts` の変換で UTC 0 時に
 * 揃える — 受講者ホームの 「期限超過」 判定も日付として比べるため、時刻を持たせると
 * 画面ごとに 1 日ずれる。
 */
function DueDateDialog({
  row,
  onClose,
  onUpdateEnrollment,
}: {
  row: StatusRow | null;
  onClose: () => void;
  onUpdateEnrollment: Props["onUpdateEnrollment"];
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  // 開くたびに現在の期限を初期値にする (行が変われば別の値)。
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  if (row && openedFor !== row.enrollment.id) {
    setOpenedFor(row.enrollment.id);
    setValue(toDateInput(row.enrollment.due_at));
  }

  const save = (nextValue: string, label: string) => {
    if (!row) return;
    setSaving(true);
    void onUpdateEnrollment(row.enrollment.id, { due_at: fromDateInput(nextValue) }, label)
      .catch(() => undefined) // 失敗はトーストで出る (呼び出し側)。ここでは閉じるだけ。
      .finally(() => {
        setSaving(false);
        onClose();
      });
  };

  return (
    <Dialog open={row !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="w-[min(calc(100vw-2rem),420px)]">
        <DialogHeader>
          <DialogTitle>期限を設定</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-1">
          <p className="text-[12.5px] leading-relaxed text-ink-3">
            {row?.profile.display_name} さんの 「{row?.stage?.title ?? "(削除された教材)"}」 に
            締切を設定します。 受講者のホームでは期限当日を過ぎてから 「期限超過」 になります。
          </p>
          <div className="mt-3">
            <Label htmlFor="enrollment-due-at">期限</Label>
            <Input
              id="enrollment-due-at"
              type="date"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>
        <DialogFooter>
          {row?.enrollment.due_at ? (
            <Button
              variant="ghost"
              className="mr-auto text-destructive"
              disabled={saving}
              onClick={() => save("", "期限を解除")}
            >
              期限を外す
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            キャンセル
          </Button>
          <Button disabled={saving || value === ""} onClick={() => save(value, "期限を変更")}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 登録の解除 (確認)。
 *
 * 消えるのは **登録の行だけ** で、レッスン進捗も提出も残る。 取り違えると
 * 「学習記録を消した」 と誤解されるので、その旨をダイアログ本文に書いておく。
 */
function DeleteEnrollmentDialog({
  row,
  onClose,
  onDeleteEnrollment,
}: {
  row: StatusRow | null;
  onClose: () => void;
  onDeleteEnrollment: Props["onDeleteEnrollment"];
}) {
  const [deleting, setDeleting] = useState(false);

  const confirm = () => {
    if (!row) return;
    setDeleting(true);
    void onDeleteEnrollment(row.enrollment.id)
      .catch(() => undefined) // 失敗はトーストで出る (呼び出し側)。
      .finally(() => {
        setDeleting(false);
        onClose();
      });
  };

  return (
    <Dialog open={row !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="w-[min(calc(100vw-2rem),420px)]">
        <DialogHeader>
          <DialogTitle>受講登録を解除しますか</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-1">
          <p className="text-[12.5px] leading-relaxed text-ink-3">
            {row?.profile.display_name} さんの 「{row?.stage?.title ?? "(削除された教材)"}」 の
            受講登録を解除します。 一覧から消え、 受講者のホームからも外れます。
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
            レッスンの進捗や提出は消えません。 受講者が同じステージを始め直せば、 続きから見えます。
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={deleting}>
            キャンセル
          </Button>
          <Button variant="destructive" disabled={deleting} onClick={confirm}>
            {deleting ? "解除中…" : "解除する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RowProps {
  row: StatusRow;
  /** 複数名を選んでいるときは行に受講者名も出す。 */
  showLearner: boolean;
  today: string;
  presetNameById: Map<string, string>;
  /** この行が操作中か (メニューのラベルを 「処理中」 に落とす)。 */
  busy: boolean;
  /** 他の行を操作中はメニュー自体を止める (別の行へ操作が飛ぶのを避ける)。 */
  menuDisabled: boolean;
  onUpdateEnrollment: Props["onUpdateEnrollment"];
  onEditDue: () => void;
  onRequestDelete: () => void;
}

function StatusRowItem({
  row,
  showLearner,
  today,
  presetNameById,
  busy,
  menuDisabled,
  onUpdateEnrollment,
  onEditDue,
  onRequestDelete,
}: RowProps) {
  const { stage, enrollment, profile } = row;
  const color: StageColor = stage?.color ?? "indigo";
  const overdue = isOverdue(enrollment, today);
  // 名前を引けたときだけ出す。 引けない出自を 「(削除済み)」 と断言しない
  // (プリセット一覧の取得に失敗しただけかもしれず、 生きている定義まで消えたと見える)。
  const presetName = enrollment.preset_id
    ? (presetNameById.get(enrollment.preset_id) ?? null)
    : null;
  const completed = enrollment.status === "completed";

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="w-14 shrink-0 overflow-hidden rounded-sm border border-border">
        <StageThumb color={color} thumbnailPath={stage?.thumbnail_path} className="border-b-0" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-[13.5px] font-medium">
            {stage?.title ?? "(削除された教材)"}
          </span>
          {stage && stage.status !== "published" ? (
            <Badge variant="warning">{stage.status === "draft" ? "下書き" : "アーカイブ"}</Badge>
          ) : null}
        </div>
        <div className="mt-0.5 truncate text-[11.5px] text-ink-3">
          {[
            showLearner ? profile.display_name : null,
            stage?.category,
            enrollment.enrolled_at ? `${enrollment.enrolled_at.slice(0, 10)} 開始` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "—"}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Badge
          variant={overdue ? "warning" : enrollment.status === "completed" ? "success" : "info"}
        >
          {ENROLLMENT_STATUS_LABEL[enrollment.status] ?? enrollment.status}
        </Badge>
        {/* 期限は移行前の割当ぶんだけ残る (自己開始では付かない)。 */}
        {enrollment.due_at ? (
          <span className="inline-flex items-center gap-1 text-[11.5px] text-ink-3">
            <CalendarClock size={12} />
            期限 {toDateInput(enrollment.due_at)}
          </span>
        ) : null}
        {enrollment.required ? <Badge>必須</Badge> : null}
        {presetName ? (
          <Badge
            variant="accent"
            title={`この受講登録は割当プリセット「${presetName}」から作成されました (Phase 3b で割当は廃止)。`}
          >
            {presetName}
          </Badge>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={menuDisabled}
              aria-label={`${profile.display_name} の「${stage?.title ?? "削除された教材"}」の操作`}
            >
              <MoreHorizontal size={15} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem icon={CalendarClock} onClick={onEditDue}>
              {enrollment.due_at ? "期限を変更" : "期限を設定"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {completed ? (
              <DropdownMenuItem
                icon={RotateCcw}
                onClick={() =>
                  void onUpdateEnrollment(
                    enrollment.id,
                    // 完了印を消すときは修了日時も一緒に落とす。 片方だけ残すと
                    // 「受講中なのに修了日がある」 行になり、集計の突き合わせが狂う。
                    { status: "active", completed_at: null },
                    "進行中へ変更",
                  )
                }
              >
                進行中に戻す
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                icon={CheckCircle}
                onClick={() =>
                  void onUpdateEnrollment(
                    enrollment.id,
                    { status: "completed", completed_at: new Date().toISOString() },
                    "完了に修正",
                  )
                }
              >
                完了に修正
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={Trash} tone="danger" onClick={onRequestDelete}>
              受講登録を解除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {busy ? <span className="text-[11.5px] text-ink-3">処理中…</span> : null}
      </div>
    </li>
  );
}
