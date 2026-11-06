/**
 * Extra ステージ 1 件の割り当て。
 * 検索・絞り込み・50 人ずつ。保存は差分だけを送る。
 * スマホ幅ではボトムシート、それ以外はダイアログ。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { SkeletonRows } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { getSession } from "@/lib/auth-client";
import { Check, Circle, Dot, Search, X } from "@/lib/icons";
import {
  listStageGrantLearners,
  updateStageGrants,
  type StageGrantLearnerCounts,
  type StageGrantLearnerDetail,
  type StageGrantLearnerPage,
} from "@/lib/stage-grants-api";
import { cn } from "@/lib/utils";

import {
  composeRosterRows,
  formatRosterChangeSummary,
  formatStageGrantSavedMessage,
  prerequisiteStatusLabel,
  rosterChangeCount,
  rosterChangedLearnerCount,
  rosterDiff,
  setRosterAssigned,
  setRosterExempted,
  toggleVisibleAssignments,
  visibleAssignmentState,
  type RosterLocalFilter,
  type RosterMark,
  type StageRosterPending,
  type StageRosterRow,
  type StageRosterView,
} from "./stage-roster";

const PAGE_SIZE = 50;
const CLOSE_CONFIRM = "保存していない変更があります。閉じますか？";
const HEAD_CELL = "sticky top-0 z-10 bg-sunken";

interface StageGrantEditorProps {
  stageId: string | null;
  stageTitle: string;
  open: boolean;
  onClose: () => void;
  /** 保存できたあと。盤面の割り当て数を取り直す。 */
  onSaved: () => void;
  /** 祖先ステージの表示名。分からなければトーストは「前の Extra ステージ」と書く。 */
  stageTitleOf?: (stageId: string) => string | undefined;
}

type PcStatus = RosterLocalFilter["status"];
type PcPrereq = RosterLocalFilter["prereq"];
type MobileTab = "assign" | "exempt";
type AssignStatus = "all" | "assigned" | "unassigned";

export function StageGrantEditor({
  stageId,
  stageTitle,
  open,
  onClose,
  onSaved,
  stageTitleOf,
}: StageGrantEditorProps) {
  const isMobile = useIsMobileViewport();
  const [session, setSession] = useState({ open, stageId });
  const [queryText, setQueryText] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState<PcStatus>("all");
  const [instructor, setInstructor] = useState("all");
  const [prereq, setPrereq] = useState<PcPrereq>("all");
  const [changesOnly, setChangesOnly] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("assign");
  const [mine, setMine] = useState(false);
  const [assignStatus, setAssignStatus] = useState<AssignStatus>("all");
  const [prereqDone, setPrereqDone] = useState(false);
  const [exemptedOnly, setExemptedOnly] = useState(false);
  const [notDone, setNotDone] = useState(false);
  const [learners, setLearners] = useState<StageGrantLearnerDetail[]>([]);
  const [page, setPage] = useState<StageGrantLearnerPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [pending, setPending] = useState<StageRosterPending>(new Map());
  const [saving, setSaving] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const [sheetNonce, setSheetNonce] = useState(0);

  const closingRef = useRef(false);
  const savingRef = useRef(false);
  const saveIdRef = useRef(0);
  const moreRef = useRef<AbortController | null>(null);
  const epochRef = useRef(epoch);
  const reloadTickRef = useRef(reloadTick);
  epochRef.current = epoch;
  reloadTickRef.current = reloadTick;

  if (open !== session.open || stageId !== session.stageId) {
    setSession({ open, stageId });
    if (open && stageId !== null) {
      closingRef.current = false;
      savingRef.current = false;
      saveIdRef.current += 1;
      setQueryText("");
      setDebouncedQ("");
      setStatus("all");
      setInstructor("all");
      setPrereq("all");
      setChangesOnly(false);
      setMobileTab("assign");
      setMine(false);
      setAssignStatus("all");
      setPrereqDone(false);
      setExemptedOnly(false);
      setNotDone(false);
      setPending(new Map());
      setLearners([]);
      setPage(null);
      setLoading(true);
      setLoadingMore(false);
      setError(null);
      setLoadMoreError(null);
      setSaving(false);
      setReloadTick(0);
      setEpoch((n) => n + 1);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(queryText), 300);
    return () => clearTimeout(timer);
  }, [queryText]);

  const activeFilter = useMemo<RosterLocalFilter>(() => {
    if (isMobile && mobileTab === "exempt") {
      return {
        q: debouncedQ,
        status: exemptedOnly ? "exempted" : "assigned",
        instructor: "all",
        prereq: notDone ? "not_done" : "all",
      };
    }
    if (isMobile) {
      return {
        q: debouncedQ,
        status: assignStatus,
        instructor: mine ? "mine" : "all",
        prereq: prereqDone ? "done" : "all",
      };
    }
    return { q: debouncedQ, status, instructor, prereq };
  }, [
    assignStatus,
    debouncedQ,
    exemptedOnly,
    instructor,
    isMobile,
    mine,
    mobileTab,
    notDone,
    prereq,
    prereqDone,
    status,
  ]);

  useEffect(() => {
    moreRef.current?.abort();
    if (!open || stageId === null || changesOnly) {
      setLoading(false);
      return;
    }
    // 開き直し (epoch) と保存・再読み込み (reloadTick) でも、絞り込みが同じなら取り直す。
    const requestId = `${epoch}:${reloadTick}`;
    const ac = new AbortController();
    const current = () =>
      ac.signal.aborted || `${epochRef.current}:${reloadTickRef.current}` !== requestId;
    setLoading(true);
    setLoadingMore(false);
    setError(null);
    setLoadMoreError(null);
    setLearners([]);
    void listStageGrantLearners(
      stageId,
      { ...activeFilter, offset: 0, limit: PAGE_SIZE },
      ac.signal,
    )
      .then((data) => {
        if (current()) return;
        setPage(data);
        setLearners(data.learners);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (current()) return;
        setLearners([]);
        setError(err instanceof Error ? err.message : "取得に失敗しました");
        setLoading(false);
      });
    return () => ac.abort();
  }, [activeFilter, changesOnly, epoch, open, reloadTick, stageId]);

  const callerId = getSession()?.user.id ?? null;
  const assignedScope = isMobile && mobileTab === "exempt";
  const views = useMemo(
    () =>
      composeRosterRows({
        loaded: learners,
        pending,
        changesOnly,
        assignedScope,
        filter: activeFilter,
        callerId,
      }),
    [activeFilter, assignedScope, callerId, changesOnly, learners, pending],
  );
  const baselines = useMemo(() => views.map((view) => view.baseline), [views]);
  const assignment = useMemo(
    () => visibleAssignmentState(baselines, pending),
    [baselines, pending],
  );
  const diff = useMemo(() => rosterDiff(pending), [pending]);
  const changeCount = rosterChangeCount(diff);
  const changedLearnerCount = rosterChangedLearnerCount(diff);
  const summary = formatRosterChangeSummary(diff);
  const stageLabel = page ? `${page.stage.title} · ${page.stage.slug}` : stageTitle;
  const counts: StageGrantLearnerCounts | null = page?.counts ?? null;
  const prerequisiteTitles = page?.stage.prerequisites.map((item) => item.title) ?? [];
  const showSkeleton = loading && !changesOnly;
  const showError = error !== null && !changesOnly && !loading;

  const requestClose = () => {
    if (closingRef.current) return;
    if (changeCount > 0 && !confirm(CLOSE_CONFIRM)) {
      if (isMobile) setSheetNonce((n) => n + 1);
      return;
    }
    closingRef.current = true;
    onClose();
  };

  const loadMore = () => {
    if (
      stageId === null ||
      changesOnly ||
      page === null ||
      page.next_offset === null ||
      loading ||
      loadingMore
    ) {
      return;
    }
    const ac = new AbortController();
    moreRef.current?.abort();
    moreRef.current = ac;
    const offset = page.next_offset;
    const requestId = `${epochRef.current}:${reloadTickRef.current}`;
    const current = () =>
      ac.signal.aborted || `${epochRef.current}:${reloadTickRef.current}` !== requestId;
    setLoadingMore(true);
    setLoadMoreError(null);
    void listStageGrantLearners(stageId, { ...activeFilter, offset, limit: PAGE_SIZE }, ac.signal)
      .then((data) => {
        if (current()) return;
        setLearners((rows) => [...rows, ...data.learners]);
        setPage(data);
        setLoadingMore(false);
      })
      .catch((err: unknown) => {
        if (current()) return;
        setLoadMoreError(err instanceof Error ? err.message : "取得に失敗しました");
        setLoadingMore(false);
      });
  };

  const save = () => {
    if (stageId === null || savingRef.current || changeCount === 0) return;
    const id = ++saveIdRef.current;
    const epochAtSave = epochRef.current;
    const savedStageId = stageId;
    const titleAtSave = page?.stage.title ?? stageTitle;
    const payload = {
      ...(diff.add.length > 0 ? { add: diff.add } : {}),
      ...(diff.remove.length > 0 ? { remove: diff.remove } : {}),
      ...(diff.exempt.length > 0 ? { exempt: diff.exempt } : {}),
      ...(diff.unexempt.length > 0 ? { unexempt: diff.unexempt } : {}),
    };
    savingRef.current = true;
    setSaving(true);
    void updateStageGrants(savedStageId, payload)
      .then((saved) => {
        toast.success(
          formatStageGrantSavedMessage(titleAtSave, saved.ancestor_grants, stageTitleOf),
        );
        onSaved();
        if (epochRef.current !== epochAtSave) return;
        setPending(new Map());
        setReloadTick((n) => n + 1);
      })
      .catch((err: unknown) => {
        if (saveIdRef.current !== id) return;
        toast.error(err instanceof Error ? err.message : "保存に失敗しました");
      })
      .finally(() => {
        if (saveIdRef.current !== id) return;
        savingRef.current = false;
        setSaving(false);
      });
  };

  const onAssigned = (baseline: StageRosterRow, assigned: boolean) => {
    if (saving) return;
    setPending((current) => setRosterAssigned(current, baseline, assigned));
  };
  const onExempted = (baseline: StageRosterRow, exempted: boolean) => {
    if (saving) return;
    setPending((current) => setRosterExempted(current, baseline, exempted));
  };
  const onToggleVisible = () => {
    if (saving) return;
    setPending((current) => toggleVisibleAssignments(current, baselines));
  };

  const listFooter = (
    <ListFooter
      show={!showSkeleton && !showError && !changesOnly && page !== null}
      total={page?.total ?? 0}
      loadedCount={learners.length}
      nextOffset={page?.next_offset ?? null}
      loadingMore={loadingMore}
      loadMoreError={loadMoreError}
      onLoadMore={loadMore}
    />
  );

  const shellProps = {
    stageLabel,
    counts,
    views,
    showSkeleton,
    showError,
    error,
    changesOnly,
    summary,
    changeCount,
    saving,
    queryText,
    onQueryText: setQueryText,
    onRetry: () => setReloadTick((n) => n + 1),
    onAssigned,
    onExempted,
    onSave: save,
    onClose: requestClose,
    listFooter,
  };

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose();
        }}
      >
        <DrawerContent key={sheetNonce} className="h-[92dvh] max-h-[92dvh]">
          <MobileRoster
            {...shellProps}
            tab={mobileTab}
            onTab={setMobileTab}
            mine={mine}
            onMine={() => setMine((value) => !value)}
            assignStatus={assignStatus}
            onAssignStatus={(next) => setAssignStatus((value) => (value === next ? "all" : next))}
            prereqDone={prereqDone}
            onPrereqDone={() => setPrereqDone((value) => !value)}
            exemptedOnly={exemptedOnly}
            onExemptedOnly={() => setExemptedOnly((value) => !value)}
            notDone={notDone}
            onNotDone={() => setNotDone((value) => !value)}
            changesOnly={changesOnly}
            onChangesOnly={() => setChangesOnly((value) => !value)}
            showPrereq={prerequisiteTitles.length > 0}
            assignmentDisabled={assignment.disabled || saving}
            allAssigned={assignment.checked}
            onToggleVisible={onToggleVisible}
          />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
    >
      <DialogContent className="flex h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] w-[min(calc(100vw-2rem),960px)] flex-col gap-0">
        <PcRoster
          {...shellProps}
          changedLearnerCount={changedLearnerCount}
          prerequisiteTitles={prerequisiteTitles}
          instructors={page?.instructors ?? []}
          status={status}
          onStatus={setStatus}
          instructor={instructor}
          onInstructor={setInstructor}
          prereq={prereq}
          onPrereq={setPrereq}
          changesOnly={changesOnly}
          onChangesOnly={(value) => setChangesOnly(value)}
          assignment={assignment}
          onToggleVisible={onToggleVisible}
          onClear={() => setPending(new Map())}
        />
      </DialogContent>
    </Dialog>
  );
}

function SearchField({
  value,
  onChange,
  tall,
}: {
  value: string;
  onChange: (value: string) => void;
  tall?: boolean;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="名前・メールアドレスで探す"
        aria-label="名前・メールアドレスで探す"
        autoComplete="off"
        className={cn("pl-9", tall && "h-11")}
      />
    </div>
  );
}

function PrerequisiteMark({ status }: { status: StageRosterRow["prerequisite_status"] }) {
  const label = prerequisiteStatusLabel(status);
  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <Check size={14} aria-hidden="true" />
        {label}
      </span>
    );
  }
  if (status === "doing") {
    return (
      <span className="inline-flex items-center gap-1 text-warning">
        <Dot size={18} aria-hidden="true" className="-mx-0.5" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-ink-4">
      <Circle size={12} aria-hidden="true" />
      {label}
    </span>
  );
}

function ChangeMarks({ marks }: { marks: readonly RosterMark[] }) {
  return (
    <>
      {marks.map((mark) => (
        <Badge key={mark} variant={markVariant(mark)}>
          {mark}
        </Badge>
      ))}
    </>
  );
}

function markVariant(mark: RosterMark): "success" | "danger" | "accent" | "warning" {
  if (mark === "追加") return "success";
  if (mark === "外す") return "danger";
  if (mark === "免除") return "accent";
  return "warning";
}

function ExemptionField({
  view,
  saving,
  tall,
  onExempted,
}: {
  view: StageRosterView;
  saving: boolean;
  tall?: boolean;
  onExempted: (baseline: StageRosterRow, exempted: boolean) => void;
}) {
  const control = view.exemption;
  if (control.kind === "text") {
    return <span className="text-[12px] text-ink-3">{control.label}</span>;
  }
  const name = view.baseline.display_name;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={control.checked}
      aria-label={`${name}の前提を免除`}
      disabled={!control.enabled || saving}
      onClick={() => onExempted(view.baseline, !control.checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-40",
        tall ? "h-11 w-14" : "h-7 w-12",
        control.checked && control.enabled ? "border-primary bg-primary" : "border-border bg-muted",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-5 rounded-full bg-card shadow transition-transform",
          control.checked ? (tall ? "translate-x-7" : "translate-x-5") : "translate-x-1",
        )}
      />
    </button>
  );
}

function ListRegion({
  showSkeleton,
  showError,
  error,
  changesOnly,
  views,
  onRetry,
  children,
  footer,
}: {
  showSkeleton: boolean;
  showError: boolean;
  error: string | null;
  changesOnly: boolean;
  views: readonly StageRosterView[];
  onRetry: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  if (showSkeleton)
    return (
      <div className="p-4">
        <SkeletonRows rows={6} />
      </div>
    );
  if (showError) {
    return (
      <div className="flex flex-col items-start gap-3 p-4" role="alert">
        <p className="text-[13px] text-destructive">一覧の取得に失敗しました: {error}</p>
        <Button type="button" variant="outline" onClick={onRetry}>
          再読み込み
        </Button>
      </div>
    );
  }
  return (
    <>
      {views.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-ink-3">
          {changesOnly ? "変更した受講者はいません" : "該当する受講者がいません"}
        </p>
      ) : (
        children
      )}
      {footer}
    </>
  );
}

function ListFooter({
  show,
  total,
  loadedCount,
  nextOffset,
  loadingMore,
  loadMoreError,
  onLoadMore,
}: {
  show: boolean;
  total: number;
  loadedCount: number;
  nextOffset: number | null;
  loadingMore: boolean;
  loadMoreError: string | null;
  onLoadMore: () => void;
}) {
  if (!show) return null;
  return (
    <div className="flex flex-col items-start gap-2 px-4 py-3">
      <p className="text-[12px] text-ink-3">
        {total} 人中 {loadedCount} 人を表示しています
      </p>
      {nextOffset !== null ? (
        <Button type="button" variant="outline" disabled={loadingMore} onClick={onLoadMore}>
          {loadingMore ? "読み込み中…" : "さらに 50 人を表示"}
        </Button>
      ) : null}
      {loadMoreError ? (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p className="text-[12px] text-destructive">続きの取得に失敗しました: {loadMoreError}</p>
          <Button type="button" variant="outline" onClick={onLoadMore}>
            再読み込み
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function SaveButton({
  changeCount,
  saving,
  onSave,
  full,
}: {
  changeCount: number;
  saving: boolean;
  onSave: () => void;
  full?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="primary"
      className={full ? "h-12 w-full" : undefined}
      disabled={changeCount === 0 || saving}
      onClick={onSave}
    >
      {saving ? "保存中…" : `保存（${changeCount} 件）`}
    </Button>
  );
}

function learnerSubtitle(view: StageRosterView): string {
  const instructor = view.baseline.instructor?.display_name ?? "未設定";
  return `担当 ${instructor} · 前提 ${prerequisiteStatusLabel(view.baseline.prerequisite_status)}`;
}

function PcRoster({
  stageLabel,
  counts,
  prerequisiteTitles,
  instructors,
  views,
  showSkeleton,
  showError,
  error,
  changesOnly,
  summary,
  changeCount,
  changedLearnerCount,
  saving,
  queryText,
  status,
  instructor,
  prereq,
  assignment,
  onQueryText,
  onStatus,
  onInstructor,
  onPrereq,
  onChangesOnly,
  onRetry,
  onAssigned,
  onExempted,
  onToggleVisible,
  onClear,
  onSave,
  onClose,
  listFooter,
}: {
  stageLabel: string;
  counts: StageGrantLearnerCounts | null;
  prerequisiteTitles: string[];
  instructors: { id: string; display_name: string }[];
  views: StageRosterView[];
  showSkeleton: boolean;
  showError: boolean;
  error: string | null;
  changesOnly: boolean;
  summary: string;
  changeCount: number;
  changedLearnerCount: number;
  saving: boolean;
  queryText: string;
  status: PcStatus;
  instructor: string;
  prereq: PcPrereq;
  assignment: { checked: boolean; disabled: boolean; visibleCount: number };
  onQueryText: (value: string) => void;
  onStatus: (status: PcStatus) => void;
  onInstructor: (instructor: string) => void;
  onPrereq: (prereq: PcPrereq) => void;
  onChangesOnly: (value: boolean) => void;
  onRetry: () => void;
  onAssigned: (baseline: StageRosterRow, assigned: boolean) => void;
  onExempted: (baseline: StageRosterRow, exempted: boolean) => void;
  onToggleVisible: () => void;
  onClear: () => void;
  onSave: () => void;
  onClose: () => void;
  listFooter: React.ReactNode;
}) {
  const tabs: { id: PcStatus; label: string; count: number }[] = [
    { id: "all", label: "すべて", count: counts?.learners ?? 0 },
    { id: "assigned", label: "割り当て済み", count: counts?.assigned ?? 0 },
    { id: "unassigned", label: "未割り当て", count: counts?.unassigned ?? 0 },
    { id: "exempted", label: "前提を免除", count: counts?.exempted ?? 0 },
  ];
  return (
    <>
      <DialogHeader className="shrink-0 space-y-1 pr-10">
        <div className="flex items-center gap-2">
          <DialogTitle>受講者を割り当てる</DialogTitle>
          <Badge variant="accent">Extra</Badge>
        </div>
        <DialogDescription>{stageLabel}</DialogDescription>
        {counts ? (
          <p className="text-[12px] text-ink-3">
            割り当て済み {counts.assigned} 人 · 前提を免除した {counts.exempted} 人 · 有効な受講者{" "}
            {counts.learners} 人
          </p>
        ) : null}
      </DialogHeader>
      <div className="flex shrink-0 flex-col gap-2 border-b px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchField value={queryText} onChange={onQueryText} />
          <label
            className="flex items-center gap-1.5 text-[12px] text-ink-3"
            htmlFor="stage-grant-instructor"
          >
            担当講師
            <select
              id="stage-grant-instructor"
              value={instructor}
              onChange={(event) => onInstructor(event.target.value)}
              className="h-9 rounded-sm border border-input bg-card px-2 text-[13px] text-foreground"
            >
              <option value="all">すべて</option>
              <option value="mine">自分の担当</option>
              {instructors.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.display_name}
                </option>
              ))}
              <option value="none">未設定</option>
            </select>
          </label>
          {prerequisiteTitles.length > 0 ? (
            <label
              className="flex items-center gap-1.5 text-[12px] text-ink-3"
              htmlFor="stage-grant-prereq"
            >
              前提（{prerequisiteTitles.join("・")}）
              <select
                id="stage-grant-prereq"
                value={prereq}
                onChange={(event) => onPrereq(event.target.value as PcPrereq)}
                className="h-9 rounded-sm border border-input bg-card px-2 text-[13px] text-foreground"
              >
                <option value="all">すべて</option>
                <option value="done">修了</option>
                <option value="doing">受講中</option>
                <option value="none">未着手</option>
              </select>
            </label>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="tablist" aria-label="割り当て状態" className="flex flex-wrap gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={status === tab.id}
                onClick={() => onStatus(tab.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px]",
                  status === tab.id
                    ? "bg-primary font-bold text-primary-foreground"
                    : "border border-border bg-card text-ink-2",
                )}
              >
                {tab.label}（{tab.count}）
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[13px] text-ink-2">
            <input
              type="checkbox"
              checked={changesOnly}
              onChange={(event) => onChangesOnly(event.target.checked)}
            />
            変更だけを表示（{changedLearnerCount} 人）
          </label>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <ListRegion
          showSkeleton={showSkeleton}
          showError={showError}
          error={error}
          changesOnly={changesOnly}
          views={views}
          onRetry={onRetry}
          footer={listFooter}
        >
          <Table containerClassName="overflow-visible">
            <TableHeader>
              <TableRow>
                <TableHead className={cn(HEAD_CELL, "w-12")}>
                  <input
                    type="checkbox"
                    checked={assignment.checked}
                    disabled={assignment.disabled || saving}
                    aria-label={`表示中の ${assignment.visibleCount} 人をすべて割り当てる`}
                    onChange={onToggleVisible}
                  />
                </TableHead>
                <TableHead className={HEAD_CELL}>受講者</TableHead>
                <TableHead className={HEAD_CELL}>担当講師</TableHead>
                <TableHead className={HEAD_CELL}>前提</TableHead>
                <TableHead className={HEAD_CELL}>前提の免除</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {views.map((view) => {
                const inputId = `stage-grant-learner-${view.id}`;
                return (
                  <TableRow
                    key={view.id}
                    className={view.marks.length > 0 ? "[&>td]:bg-brand-soft/40" : undefined}
                  >
                    <TableCell>
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={view.assigned}
                        disabled={!view.canAssign || saving}
                        onChange={() => onAssigned(view.baseline, !view.assigned)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <label htmlFor={inputId} className="font-medium">
                          {view.baseline.display_name}
                        </label>
                        {view.baseline.selectable ? null : <Badge>無効</Badge>}
                        <ChangeMarks marks={view.marks} />
                      </div>
                      {view.baseline.email ? (
                        <p className="text-[12px] text-ink-3">{view.baseline.email}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>{view.baseline.instructor?.display_name ?? "未設定"}</TableCell>
                    <TableCell>
                      <PrerequisiteMark status={view.baseline.prerequisite_status} />
                    </TableCell>
                    <TableCell>
                      <ExemptionField view={view} saving={saving} onExempted={onExempted} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ListRegion>
      </div>
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3 border-t px-6 py-4">
        <div className="min-w-0">
          <p className="text-[13px] text-ink-2">{summary}</p>
          <p className="mt-1 text-[11px] text-ink-4">
            前のステージが Extra
            のときは、それも一緒に割り当てます。外した受講者は前提の免除も外れます。
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={changeCount === 0 || saving}
            onClick={onClear}
          >
            変更を取り消す
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            閉じる
          </Button>
          <SaveButton changeCount={changeCount} saving={saving} onSave={onSave} />
        </div>
      </div>
    </>
  );
}

function FilterChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "h-11 shrink-0 rounded-full border px-3 text-[13px]",
        pressed
          ? "border-transparent bg-primary font-bold text-primary-foreground"
          : "border-border bg-card text-ink-2",
      )}
    >
      {children}
    </button>
  );
}

function MobileRoster({
  stageLabel,
  counts,
  views,
  showSkeleton,
  showError,
  error,
  changesOnly,
  summary,
  changeCount,
  saving,
  queryText,
  tab,
  mine,
  assignStatus,
  prereqDone,
  exemptedOnly,
  notDone,
  showPrereq,
  assignmentDisabled,
  allAssigned,
  onQueryText,
  onTab,
  onMine,
  onAssignStatus,
  onPrereqDone,
  onExemptedOnly,
  onNotDone,
  onChangesOnly,
  onRetry,
  onAssigned,
  onExempted,
  onToggleVisible,
  onSave,
  onClose,
  listFooter,
}: {
  stageLabel: string;
  counts: StageGrantLearnerCounts | null;
  views: StageRosterView[];
  showSkeleton: boolean;
  showError: boolean;
  error: string | null;
  changesOnly: boolean;
  summary: string;
  changeCount: number;
  saving: boolean;
  queryText: string;
  tab: MobileTab;
  mine: boolean;
  assignStatus: AssignStatus;
  prereqDone: boolean;
  exemptedOnly: boolean;
  notDone: boolean;
  showPrereq: boolean;
  assignmentDisabled: boolean;
  allAssigned: boolean;
  onQueryText: (value: string) => void;
  onTab: (tab: MobileTab) => void;
  onMine: () => void;
  onAssignStatus: (status: "assigned" | "unassigned") => void;
  onPrereqDone: () => void;
  onExemptedOnly: () => void;
  onNotDone: () => void;
  onChangesOnly: () => void;
  onRetry: () => void;
  onAssigned: (baseline: StageRosterRow, assigned: boolean) => void;
  onExempted: (baseline: StageRosterRow, exempted: boolean) => void;
  onToggleVisible: () => void;
  onSave: () => void;
  onClose: () => void;
  listFooter: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-start justify-between gap-2 px-4 pb-2">
        <div className="min-w-0">
          <DrawerTitle>受講者を割り当てる</DrawerTitle>
          <DrawerDescription className="mt-1 truncate">{stageLabel}</DrawerDescription>
        </div>
        <button
          type="button"
          className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-sunken"
          aria-label="閉じる"
          onClick={onClose}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div role="tablist" aria-label="割り当て" className="flex shrink-0 border-b px-2">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "assign"}
          className={cn(
            "h-11 flex-1 text-[13px]",
            tab === "assign" ? "border-b-2 border-primary font-bold" : "text-ink-3",
          )}
          onClick={() => onTab("assign")}
        >
          割り当て（{counts?.assigned ?? 0}）
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "exempt"}
          className={cn(
            "h-11 flex-1 text-[13px]",
            tab === "exempt" ? "border-b-2 border-primary font-bold" : "text-ink-3",
          )}
          onClick={() => onTab("exempt")}
        >
          前提を免除（{counts?.exempted ?? 0}）
        </button>
      </div>
      <div className="flex shrink-0 flex-col gap-2 px-4 py-2">
        <SearchField value={queryText} onChange={onQueryText} tall />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tab === "assign" ? (
            <>
              <FilterChip pressed={mine} onClick={onMine}>
                自分の担当
              </FilterChip>
              <FilterChip
                pressed={assignStatus === "unassigned"}
                onClick={() => onAssignStatus("unassigned")}
              >
                未割り当て
              </FilterChip>
              <FilterChip
                pressed={assignStatus === "assigned"}
                onClick={() => onAssignStatus("assigned")}
              >
                割り当て済み
              </FilterChip>
              {showPrereq ? (
                <FilterChip pressed={prereqDone} onClick={onPrereqDone}>
                  前提を修了
                </FilterChip>
              ) : null}
            </>
          ) : (
            <>
              <FilterChip pressed={exemptedOnly} onClick={onExemptedOnly}>
                前提を免除した
              </FilterChip>
              {showPrereq ? (
                <FilterChip pressed={notDone} onClick={onNotDone}>
                  前提が未修了
                </FilterChip>
              ) : null}
            </>
          )}
          <FilterChip pressed={changesOnly} onClick={onChangesOnly}>
            変更だけ
          </FilterChip>
        </div>
      </div>
      {tab === "assign" && !showSkeleton && !showError ? (
        <label className="flex h-11 shrink-0 items-center gap-2 border-b px-4 text-[13px]">
          <input
            type="checkbox"
            checked={allAssigned}
            disabled={assignmentDisabled}
            onChange={onToggleVisible}
          />
          表示中をすべて選ぶ
        </label>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ListRegion
          showSkeleton={showSkeleton}
          showError={showError}
          error={error}
          changesOnly={changesOnly}
          views={views}
          onRetry={onRetry}
          footer={listFooter}
        >
          <ul>
            {views.map((view) => (
              <li
                key={view.id}
                className={cn(
                  "border-b border-border",
                  view.marks.length > 0 && "bg-brand-soft/40",
                )}
              >
                {tab === "assign" ? (
                  <label className="flex min-h-[60px] items-center gap-3 px-4 py-2">
                    <input
                      type="checkbox"
                      className="size-5 shrink-0"
                      checked={view.assigned}
                      disabled={!view.canAssign || saving}
                      onChange={() => onAssigned(view.baseline, !view.assigned)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1">
                        <span className="font-medium">{view.baseline.display_name}</span>
                        {view.baseline.selectable ? null : <Badge>無効</Badge>}
                        <ChangeMarks marks={view.marks} />
                      </span>
                      <span className="block truncate text-[12px] text-ink-3">
                        {learnerSubtitle(view)}
                      </span>
                    </span>
                  </label>
                ) : (
                  <div className="flex min-h-[60px] items-center gap-3 px-4 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="font-medium">{view.baseline.display_name}</span>
                        <ChangeMarks marks={view.marks} />
                      </div>
                      <p className="truncate text-[12px] text-ink-3">{learnerSubtitle(view)}</p>
                    </div>
                    <ExemptionField view={view} saving={saving} tall onExempted={onExempted} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </ListRegion>
      </div>
      <div className="shrink-0 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <p className="mb-2 text-[12px] text-ink-3">{summary}</p>
        <SaveButton changeCount={changeCount} saving={saving} onSave={onSave} full />
      </div>
    </div>
  );
}
