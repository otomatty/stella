/**
 * 講師・管理者のステージ管理。受講者のホームと同じスキルツリーの盤面に、
 * 公開状態と Extra の割当を載せる。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { SkillTree, type SkillTreeHandle } from "@/components/learner/tree/SkillTree";
import { routeAccentOf } from "@/components/learner/tree/route-accents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SkeletonRows } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ChevronDown, ChevronUp } from "@/lib/icons";
import {
  getStaffSkillMap,
  getStaffSkillMapIcons,
  type StaffSkillMapStageNode,
} from "@/lib/skill-map-api";
import { cn } from "@/lib/utils";

import { StaffEnrollButton } from "./StaffEnrollButton";
import { StageGrantEditor } from "./StageGrantEditor";
import {
  entryStageId,
  filterStagesByQuery,
  formatStageManagementCounts,
  offBoardNote,
  planStaffStages,
  staffMapContents,
  staffStarTag,
  type StaffIslandEntry,
  stageAudienceLabel,
  stageManagementCounts,
  stageManagementTitle,
  stageStatusLabel,
} from "./stage-management";

/** PC で開いたカードが覆う幅 (左 16px + 幅 360px + 右 16px)。ホームのガイドと同じ。 */
const CARD_INSET_PX = 392;
const EMPTY_QUEUE: string[] = [];

function noop() {
  return undefined;
}

interface StageManagementPageProps {
  role: "admin" | "instructor";
  backendEnabled: boolean;
  currentUserId: string | null;
  highlightStage: { id: string; seq: number } | null;
  onOpenAsLearner: (stageId: string) => void;
}

export function StageManagementPage({
  role,
  backendEnabled,
  currentUserId,
  highlightStage,
  onOpenAsLearner,
}: StageManagementPageProps) {
  const title = stageManagementTitle(role);
  const treeRef = useRef<SkillTreeHandle | null>(null);
  const focusedHighlight = useRef<number | null>(null);
  const pendingScrollId = useRef<string | null>(null);

  const [stages, setStages] = useState<StaffSkillMapStageNode[] | null>(null);
  const [loading, setLoading] = useState(backendEnabled);
  const [error, setError] = useState<string | null>(null);
  const [grantStageId, setGrantStageId] = useState<string | null>(null);
  const [selectedIslandKey, setSelectedIslandKey] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [expandedPref, setExpandedPref] = useState<boolean | null>(null);
  const expanded = expandedPref ?? isDesktop;

  const load = useCallback(async () => {
    if (!backendEnabled) return;
    setError(null);
    try {
      const data = await getStaffSkillMap();
      setStages(data.stages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [backendEnabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const plan = useMemo(() => planStaffStages(stages ?? []), [stages]);
  const contents = useMemo(() => staffMapContents(plan.board, stages ?? []), [plan, stages]);
  const selectedIsland = contents.islands.find((island) => island.key === selectedIslandKey);
  const entryId = useMemo(() => entryStageId(plan.board), [plan.board]);
  // 検索から開いたときはその星を優先。PC は全体、それ以外は入口へ寄せる。
  const initialFocusStageId =
    highlightStage && plan.board.some((stage) => stage.id === highlightStage.id)
      ? highlightStage.id
      : isDesktop
        ? null
        : entryId;
  const counts = useMemo(() => stageManagementCounts(stages ?? []), [stages]);
  const matches = useMemo(() => filterStagesByQuery(stages ?? [], query), [stages, query]);
  const byId = useMemo(() => new Map((stages ?? []).map((stage) => [stage.id, stage])), [stages]);

  const scrollOffBoard = useCallback(
    (id: string) => {
      setSelectedIslandKey(null);
      setQuery("");
      const row = document.getElementById(`staff-stage-${id}`);
      if (expanded && row) {
        row.scrollIntoView({ block: "nearest" });
        return;
      }
      pendingScrollId.current = id;
      setExpandedPref(true);
    },
    [expanded],
  );

  useEffect(() => {
    if (!highlightStage || stages === null) return;
    if (focusedHighlight.current === highlightStage.seq) return;
    const onBoard = plan.board.some((stage) => stage.id === highlightStage.id);
    if (onBoard) {
      const placed = treeRef.current?.focusStage(highlightStage.id) ?? false;
      if (!placed) return;
    } else {
      scrollOffBoard(highlightStage.id);
    }
    focusedHighlight.current = highlightStage.seq;
  }, [highlightStage, stages, plan, scrollOffBoard]);

  useEffect(() => {
    const id = pendingScrollId.current;
    if (!id || !expanded || selectedIslandKey !== null || query.trim() !== "") return;
    const row = document.getElementById(`staff-stage-${id}`);
    if (!row) return;
    pendingScrollId.current = null;
    row.scrollIntoView({ block: "nearest" });
  }, [expanded, selectedIslandKey, query]);

  const selectIsland = (key: string) => {
    setSelectedIslandKey(key);
    setSelectedRegion(null);
    setExpandedPref(true);
    treeRef.current?.focusRegion(key);
  };

  const focusRegion = (key: string) => {
    const focused = treeRef.current?.focusRegion(key);
    setSelectedRegion(focused ? key : null);
  };

  const selectStage = (id: string) => {
    setSelectedIslandKey(null);
    setQuery("");
    if (plan.board.some((stage) => stage.id === id)) {
      treeRef.current?.focusStage(id);
      return;
    }
    scrollOffBoard(id);
  };

  const showSkeleton = backendEnabled && loading && stages === null;
  const showError = backendEnabled && error !== null && stages === null;
  const grantStage = grantStageId === null ? undefined : byId.get(grantStageId);

  return (
    <div className="relative h-[calc(100dvh-var(--shell-header-height))] overflow-hidden">
      <div className="absolute inset-0">
        {!backendEnabled ? (
          <div className="tree-board h-full w-full" />
        ) : showSkeleton ? (
          <div className="tree-board flex h-full w-full items-center justify-center px-6">
            <SkeletonRows rows={4} className="w-full max-w-sm" />
          </div>
        ) : showError ? (
          <BoardMessage>
            <span className="text-destructive">{error}</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => void load()}>
              再読み込み
            </Button>
          </BoardMessage>
        ) : plan.board.length === 0 ? (
          <BoardMessage>
            {stages !== null && stages.length === 0
              ? "まだステージがありません。"
              : "盤面に載せられるステージがありません。"}
          </BoardMessage>
        ) : (
          <SkillTree
            nodes={plan.board}
            currentUserId={currentUserId}
            activeStageId={null}
            queuedStageIds={EMPTY_QUEUE}
            initialFocusStageId={initialFocusStageId}
            initialFit={isDesktop && initialFocusStageId === null}
            showIslandChips={false}
            islandCaption={(key) => {
              const island = contents.islands.find((entry) => entry.key === key);
              return island ? `表示: ${island.visibility}` : null;
            }}
            selectedIslandKey={selectedIslandKey}
            onSelectIsland={selectIsland}
            onResumeStage={noop}
            onStartStage={noop}
            onQueueStage={noop}
            onSkillCheck={noop}
            onOpenStage={noop}
            celebrate={false}
            loadIcons={getStaffSkillMapIcons}
            starTag={staffStarTag}
            renderDetail={(node, close) => {
              const stage = byId.get(node.id);
              if (!stage) return null;
              return (
                <StarDetailCard
                  stage={stage}
                  onOpenAsLearner={onOpenAsLearner}
                  onAssign={() => {
                    close();
                    setGrantStageId(stage.id);
                  }}
                />
              );
            }}
            handleRef={treeRef}
            insetLeft={isDesktop && expanded ? CARD_INSET_PX : 0}
            className="h-full w-full rounded-none border-0"
          />
        )}
      </div>

      <aside
        aria-label={title}
        className={cn(
          "absolute z-20 flex flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-xl backdrop-blur-md",
          "bottom-3 left-3 right-[5.5rem]",
          "sm:right-auto sm:w-[380px]",
          "lg:bottom-auto lg:left-4 lg:top-4 lg:w-[360px]",
          expanded ? "max-h-[70%] lg:max-h-[calc(100%-2rem)]" : "",
        )}
      >
        {expanded ? (
          <>
            <header className="flex shrink-0 flex-col gap-2 px-4 pt-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
                  {backendEnabled && stages ? (
                    <p className="mt-0.5 text-[12px] text-ink-3">
                      {formatStageManagementCounts(counts)}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="-mr-1.5 -mt-1 shrink-0"
                  aria-label="ステージの案内を畳む"
                  aria-expanded
                  onClick={() => setExpandedPref(false)}
                >
                  <ChevronDown size={14} className="lg:hidden" />
                  <ChevronUp size={14} className="hidden lg:block" />
                </Button>
              </div>
            </header>

            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
              {!backendEnabled ? (
                <p className="text-[12.5px] text-ink-3">デモモードではステージ管理を使えません</p>
              ) : showSkeleton ? (
                <SkeletonRows rows={3} />
              ) : showError ? (
                <p className="text-[12.5px] text-destructive">{error}</p>
              ) : selectedIsland ? (
                <StaffIslandDetail
                  island={selectedIsland}
                  onBack={() => setSelectedIslandKey(null)}
                  onSelectIsland={selectIsland}
                  onAssign={setGrantStageId}
                />
              ) : (
                <>
                  {error ? <p className="text-[12px] text-destructive">{error}</p> : null}
                  <div>
                    <label htmlFor="staff-stage-search" className="text-[12px] text-ink-3">
                      ステージを探す
                    </label>
                    <Input
                      id="staff-stage-search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="ステージ名・slug"
                      autoComplete="off"
                      className="mt-1 h-9"
                    />
                    {query.trim() !== "" ? (
                      matches.length === 0 ? (
                        <p className="mt-1 text-[12px] text-ink-4">該当するステージがありません</p>
                      ) : (
                        <ul className="mt-1 max-h-48 overflow-y-auto rounded-md border border-border">
                          {matches.map((stage) => (
                            <li key={stage.id}>
                              <button
                                type="button"
                                className="w-full px-2.5 py-1.5 text-left hover:bg-sunken"
                                onClick={() => selectStage(stage.id)}
                              >
                                <span className="block text-[12.5px] font-medium leading-snug">
                                  {stage.title ?? stage.slug}
                                </span>
                                <span className="block text-[11px] text-ink-4">{stage.slug}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )
                    ) : null}
                  </div>

                  {query.trim() === "" ? (
                    <nav aria-label="地図の目次">
                      <h2 className="text-[12px] font-semibold">地図の目次</h2>
                      <p className="text-[11px] text-ink-4">押すとその場所へ寄ります</p>
                      <h3 className="mb-1 mt-3 text-[11px] text-ink-3">本土 · Basic</h3>
                      <ContentsRow
                        label="開発スキル（本土）"
                        count={contents.mainland.count}
                        selected={selectedRegion === contents.mainland.title}
                        onClick={() => focusRegion(contents.mainland.title)}
                      />
                      {contents.mainland.routes.map((route) => (
                        <ContentsRow
                          key={route.key}
                          label={route.key}
                          count={route.count}
                          routeKey={route.key}
                          indent
                          selected={selectedRegion === route.key}
                          onClick={() => focusRegion(route.key)}
                        />
                      ))}
                      <h3 className="mb-1 mt-3 text-[11px] text-ink-3">島 · Extra</h3>
                      {contents.islands.map((island) => (
                        <ContentsRow
                          key={island.key}
                          label={island.key}
                          routeKey={island.key}
                          count={island.count}
                          caption={`表示: ${island.visibility}`}
                          selected={selectedIslandKey === island.key}
                          onClick={() => selectIsland(island.key)}
                        />
                      ))}
                    </nav>
                  ) : null}

                  {query.trim() === "" && plan.offBoard.length > 0 ? (
                    <section aria-label="盤面に載らないステージ">
                      <h2 className="text-[12px] font-semibold text-ink-2">
                        盤面に載らないステージ
                        <span className="ml-1 font-normal text-ink-4">{plan.offBoard.length}</span>
                      </h2>
                      <ul className="mt-2 flex flex-col gap-2">
                        {plan.offBoard.map((stage) => (
                          <li
                            key={stage.id}
                            id={`staff-stage-${stage.id}`}
                            className="rounded-lg border border-border px-3 py-2"
                          >
                            <div className="text-[13px] font-medium leading-snug">
                              {stage.title ?? stage.slug}
                            </div>
                            <div className="text-[11px] text-ink-4">{stage.slug}</div>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {stage.status !== "published" ? (
                                <Badge variant={statusBadgeVariant(stage.status)}>
                                  {stageStatusLabel(stage.status)}
                                </Badge>
                              ) : null}
                              <Badge variant={stage.audience === "granted" ? "accent" : "default"}>
                                {stageAudienceLabel(stage.audience)}
                              </Badge>
                            </div>
                            <p className="mt-1 text-[11px] text-ink-3">{offBoardNote(stage)}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <Button asChild variant="primary" size="sm">
                                <Link to="/stages/$stageId" params={{ stageId: stage.id }}>
                                  ステージ詳細を開く
                                </Link>
                              </Button>
                              {stage.audience === "granted" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setGrantStageId(stage.id)}
                                >
                                  受講者を割り当てる
                                </Button>
                              ) : null}
                              {stage.status === "published" ? (
                                <StaffEnrollButton
                                  stageId={stage.id}
                                  onOpenAsLearner={onOpenAsLearner}
                                />
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2">
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              aria-expanded={false}
              onClick={() => setExpandedPref(true)}
            >
              <span className="block truncate text-[13px] font-semibold">{title}</span>
              {backendEnabled && stages ? (
                <span className="block truncate text-[11px] text-ink-3">
                  {formatStageManagementCounts(counts)}
                </span>
              ) : null}
            </button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="shrink-0"
              aria-label="ステージの案内を開く"
              onClick={() => setExpandedPref(true)}
            >
              <ChevronUp size={14} className="lg:hidden" />
              <ChevronDown size={14} className="hidden lg:block" />
            </Button>
          </div>
        )}
      </aside>

      <StageGrantEditor
        stageId={grantStageId}
        stageTitle={grantStage?.title ?? grantStage?.slug ?? ""}
        open={grantStageId !== null}
        onClose={() => setGrantStageId(null)}
        onSaved={() => void load()}
        stageTitleOf={(id) => byId.get(id)?.title}
      />
    </div>
  );
}

function StarDetailCard({
  stage,
  onAssign,
  onOpenAsLearner,
}: {
  stage: StaffSkillMapStageNode;
  onOpenAsLearner: (stageId: string) => void;
  onAssign: () => void;
}) {
  const category = stage.category?.trim() ?? "";
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-ink-3">
        {stage.slug}
        {category !== "" ? ` · ${category}` : ""}
      </p>
      <div className="flex flex-wrap gap-1">
        {stage.status !== "published" ? (
          <Badge variant={statusBadgeVariant(stage.status)}>{stageStatusLabel(stage.status)}</Badge>
        ) : null}
        <Badge variant={stage.audience === "granted" ? "accent" : "default"}>
          {stageAudienceLabel(stage.audience)}
        </Badge>
      </div>
      <p className="text-[12px] text-ink-2">
        受講登録 {stage.enrolled_count}
        {stage.audience === "granted" ? ` · 割り当て ${stage.granted_count}` : ""}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Button asChild variant="primary" size="sm">
          <Link to="/stages/$stageId" params={{ stageId: stage.id }}>
            ステージ詳細を開く
          </Link>
        </Button>
        {stage.audience === "granted" ? (
          <Button type="button" size="sm" variant="outline" onClick={onAssign}>
            受講者を割り当てる
          </Button>
        ) : null}
        {stage.status === "published" ? (
          <StaffEnrollButton stageId={stage.id} onOpenAsLearner={onOpenAsLearner} />
        ) : null}
      </div>
    </div>
  );
}

function statusBadgeVariant(
  status: StaffSkillMapStageNode["status"],
): "success" | "default" | "danger" {
  if (status === "published") return "success";
  if (status === "archived") return "danger";
  return "default";
}

function BoardMessage({ children }: { children: ReactNode }) {
  return (
    <div className="tree-board flex h-full w-full flex-wrap items-center justify-center gap-3 px-4 text-center text-[12.5px]">
      {children}
    </div>
  );
}

function RouteDot({ routeKey }: { routeKey: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ backgroundColor: `rgb(${routeAccentOf(routeKey) ?? "203 213 225"})` }}
    />
  );
}

function ContentsRow({
  label,
  count,
  routeKey,
  caption,
  indent,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  routeKey?: string;
  caption?: string;
  indent?: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-[30px] w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[12px] hover:bg-sunken",
        indent && "pl-5",
        selected && "bg-sunken",
      )}
    >
      {routeKey ? <RouteDot routeKey={routeKey} /> : null}
      <span className="min-w-0 flex-1">
        <span className="block">{label}</span>
        {caption ? <span className="block text-[10px] text-ink-4">{caption}</span> : null}
      </span>
      <span className="text-[11px] text-ink-4">{count}</span>
    </button>
  );
}

function StaffIslandDetail({
  island,
  onBack,
  onSelectIsland,
  onAssign,
}: {
  island: StaffIslandEntry;
  onBack: () => void;
  onSelectIsland: (key: string) => void;
  onAssign: (id: string) => void;
}) {
  return (
    <>
      <Button type="button" size="sm" variant="ghost" className="self-start" onClick={onBack}>
        地図の目次へ戻る
      </Button>
      <div className="flex flex-wrap items-center gap-2">
        <RouteDot routeKey={island.key} />
        <h2 className="text-[15px] font-semibold">{island.key}</h2>
        {island.allExtra ? <Badge variant="accent">島 · Extra</Badge> : null}
      </div>
      <dl className="space-y-3 text-[12px]">
        <div>
          <dt className="text-ink-4">表示条件</dt>
          <dd>
            {island.visibility}
            {island.allExtra ? <span className="ml-1 text-ink-3">＋ 割り当て</span> : null}
          </dd>
        </div>
        <div>
          <dt className="text-ink-4">最初の前提</dt>
          <dd>
            {island.prerequisite ? (
              <>
                {island.prerequisite.title}
                <span className="ml-1 text-ink-3">（{island.prerequisite.routeKey}）</span>
              </>
            ) : (
              "なし"
            )}
          </dd>
        </div>
        {island.next.length > 0 ? (
          <div>
            <dt className="text-ink-4">この島の先</dt>
            <dd>
              {island.next.map((next) => (
                <button
                  type="button"
                  key={next.key}
                  aria-pressed={false}
                  onClick={() => onSelectIsland(next.key)}
                  className="flex min-h-[30px] w-full items-center gap-2 rounded-md py-1 text-left hover:bg-sunken"
                >
                  <RouteDot routeKey={next.key} />
                  <span>
                    {next.key}
                    <span className="block text-[11px] text-ink-4">表示: {next.visibility}</span>
                  </span>
                </button>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>
      <section aria-label="島のステージ">
        <h3 className="text-[12px] font-semibold">
          ステージ <span className="font-normal text-ink-4">{island.count}</span>
        </h3>
        <ol className="mt-2 flex flex-col gap-2">
          {island.stages.map((stage, index) => (
            <li key={stage.id} className="rounded-lg border border-border px-3 py-2">
              <div className="flex items-start gap-2 text-[13px] font-medium">
                <span className="text-ink-4">{index + 1}.</span>
                <span>{stage.title ?? stage.slug}</span>
              </div>
              <p className="break-all text-[11px] text-ink-4">{stage.slug}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {stage.status !== "published" ? (
                  <Badge variant={statusBadgeVariant(stage.status)}>
                    {stageStatusLabel(stage.status)}
                  </Badge>
                ) : null}
                <Badge variant={stage.audience === "granted" ? "accent" : "default"}>
                  {stageAudienceLabel(stage.audience)}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {stage.audience === "granted" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onAssign(stage.id)}
                  >
                    受講者を割り当てる
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
