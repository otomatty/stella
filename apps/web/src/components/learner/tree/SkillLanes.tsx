import { useMemo, type CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { Lock, Play, Sparkles, Star } from "@/lib/icons";
import type { SkillMapStageNode } from "@/lib/skill-map-api";
import { cn } from "@/lib/utils";

import { buildLanes } from "./lanes";
import { nextUnlockIds } from "./next-unlock";
import { routeAccentOf, routeSolidOf } from "./route-accents";
import { routeStyleOf, type ActiveStarInfo } from "./SkillTree";
import { describeStar, type StarDetail } from "./star-detail";

interface SkillLanesProps {
  nodes: readonly SkillMapStageNode[];
  activeStageId: string | null;
  queuedStageIds: readonly string[];
  revealDev: boolean;
  activeInfo: ActiveStarInfo | null;
  islandCaption?: (key: string) => string | null;
  insetLeft: number;
  onResumeStage: (stageId: string) => void;
  onStartStage: (stageId: string) => void;
  onQueueStage: (stageId: string) => void;
  onSkillCheck: (stageId: string) => void;
  onOpenStage: (stageId: string) => void;
  onShowInTree: (stageId: string) => void;
  className?: string;
}

export function SkillLanes({
  nodes,
  activeStageId,
  queuedStageIds,
  revealDev,
  activeInfo,
  islandCaption,
  insetLeft,
  onShowInTree,
  className,
  ...actions
}: SkillLanesProps) {
  const mobile = useIsMobileViewport();
  const lanes = useMemo(() => buildLanes(nodes, revealDev), [nodes, revealDev]);
  const nextIds = useMemo(() => nextUnlockIds(nodes, activeStageId), [nodes, activeStageId]);
  const activeTitle = nodes.find((node) => node.id === activeStageId)?.title;

  return (
    <div
      className={cn(
        "tree-board h-full overflow-y-auto overscroll-contain px-3 pb-28 pt-[72px] lg:pb-8 lg:pl-[max(16px,var(--lane-inset))] lg:pr-6",
        className,
      )}
      style={{ "--lane-inset": `${insetLeft}px` } as CSSProperties}
    >
      {lanes.length === 0 ? (
        <p className="py-12 text-center text-[13px] text-ink-2">
          まだスキルがありません。教材が公開されると、ここに現れます。
        </p>
      ) : null}
      <div className="space-y-8">
        {lanes.map((lane) => {
          const accent = routeAccentOf(lane.key);
          const nebula = accent ?? "203 213 225";
          const theme = lane.stars[0]?.theme;
          const caption = islandCaption?.(lane.key);
          return (
            <section key={lane.key} aria-label={lane.key} className="relative isolate">
              {lane.kind === "nebula" ? (
                <div
                  aria-hidden="true"
                  className="tree-nebula absolute -inset-y-8 inset-x-0 -z-10 opacity-50"
                  style={{ "--nebula": nebula } as CSSProperties}
                />
              ) : null}
              <header className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  aria-hidden="true"
                  className={cn("h-2.5 w-2.5 shrink-0 rounded-full", !accent ? "bg-brand" : "")}
                  style={{
                    background:
                      lane.kind === "nebula"
                        ? `radial-gradient(circle, rgb(${nebula}) 0%, rgb(${nebula} / 0.2) 70%)`
                        : accent
                          ? `rgb(${accent})`
                          : undefined,
                  }}
                />
                <h2 className="text-sm font-bold">{lane.key}</h2>
                <span className="text-[11.5px] text-ink-3">
                  {lane.kind === "nebula"
                    ? `星雲${caption ? ` · ${caption}` : ""}`
                    : theme !== lane.key
                      ? theme
                      : null}
                </span>
                {lane.hasMore ? (
                  <span className="ml-auto text-[11px] text-ink-3">
                    この先は、進むと見えてきます
                  </span>
                ) : null}
              </header>
              <div
                className={cn(
                  "flex gap-3",
                  mobile ? "snap-x snap-mandatory overflow-x-auto pb-3" : "flex-wrap",
                )}
              >
                {lane.stars.map((node) => {
                  const active = node.id === activeStageId;
                  const info = active ? activeInfo : null;
                  const detail = describeStar({
                    node,
                    isActive: active,
                    queued: queuedStageIds.includes(node.id),
                    revealDev,
                  });
                  const full = node.visibility === "full";
                  const cleared = node.state === "cleared";
                  const Glyph = cleared
                    ? Star
                    : active
                      ? Play
                      : node.state === "locked"
                        ? Lock
                        : Sparkles;
                  return (
                    <article
                      key={node.id}
                      className={cn(
                        "flex w-44 shrink-0 snap-start flex-col gap-2 rounded-xl border-2 bg-card/90 p-3 shadow-sm",
                        active ? "border-brand dark:border-[#a78bfa]" : "border-border",
                      )}
                      style={routeStyleOf(accent, routeSolidOf(lane.key))}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "tree-star relative grid h-7 w-7 shrink-0 place-items-center rounded-full border",
                            !full
                              ? "tree-star-fog"
                              : cleared
                                ? "tree-star-cleared"
                                : active
                                  ? "tree-star-active"
                                  : node.state === "unlocked"
                                    ? "tree-star-open"
                                    : "tree-star-locked",
                          )}
                        >
                          <Glyph size={13} />
                        </span>
                        <span className="text-[11px] font-medium text-ink-2">
                          {active ? "いまここ" : detail.stateText}
                        </span>
                      </div>
                      <h3 className="text-[13.5px] font-bold leading-snug">
                        {detail.obscured ? (
                          <>
                            <span
                              aria-hidden="true"
                              className="line-clamp-2 select-none blur-[1.5px]"
                            >
                              {detail.label}
                            </span>
                            <span className="sr-only">
                              {full ? "名前の伏せられたスキル" : "まだ見えないスキル"}
                            </span>
                          </>
                        ) : (
                          <span className="line-clamp-2">{detail.label}</span>
                        )}
                      </h3>
                      {nextIds.has(node.id) ? (
                        <span className="tree-next-unlock-pill self-start rounded-full px-2 py-0.5 text-[10px] font-bold">
                          次に解放
                        </span>
                      ) : null}
                      {detail.body.kind === "can-do" ? (
                        <p className="line-clamp-3 text-xs leading-relaxed text-ink-3">
                          {detail.body.text}
                        </p>
                      ) : detail.body.kind === "lock" ? (
                        <div className="text-xs leading-relaxed text-ink-3">
                          {detail.body.reasons.length > 0 ? (
                            <>
                              <p className="font-bold text-ink-2">
                                解放まであと {detail.body.reasons.length} つ
                              </p>
                              <ul className="mt-0.5 space-y-1">
                                {detail.body.reasons.map((reason, index, reasons) => (
                                  <li
                                    key={JSON.stringify([
                                      reason,
                                      reasons.slice(0, index).filter((r) => r === reason).length,
                                    ])}
                                  >
                                    {reason}
                                    {reason === activeTitle && activeInfo
                                      ? `（いま ${Math.max(0, Math.min(100, activeInfo.progress))}%）`
                                      : ""}
                                  </li>
                                ))}
                              </ul>
                            </>
                          ) : (
                            detail.body.text
                          )}
                        </div>
                      ) : detail.body.kind === "fog" ? (
                        <p className="text-xs text-ink-3">
                          まだ先のスキルです。手前のスキルを進めるとはっきり見えてきます。
                        </p>
                      ) : null}
                      {info ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <Progress value={info.progress} tone="brand" className="flex-1" />
                            <span className="text-[10.5px] tabular-nums text-ink-3">
                              {info.progress}%
                            </span>
                          </div>
                          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-2">
                            {info.detail}
                          </p>
                        </div>
                      ) : null}
                      {full ? (
                        <LaneActions
                          {...actions}
                          detail={detail}
                          stageId={node.id}
                          openTask={info?.openTask}
                          onShowInTree={onShowInTree}
                        />
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

interface LaneActionsProps
  extends Pick<
    SkillLanesProps,
    | "onResumeStage"
    | "onStartStage"
    | "onQueueStage"
    | "onSkillCheck"
    | "onOpenStage"
    | "onShowInTree"
  > {
  detail: StarDetail;
  stageId: string;
  openTask?: () => void;
}

/** カードでは主な一手だけをボタンにし、残りの操作は文字リンクにまとめる。 */
function LaneActions({
  detail,
  stageId,
  openTask,
  onResumeStage,
  onStartStage,
  onQueueStage,
  onSkillCheck,
  onOpenStage,
  onShowInTree,
}: LaneActionsProps) {
  const { resume, start, skillCheck, openStage, queue } = detail.actions;
  const primary = resume
    ? {
        label: openTask ? "課題に取り組む" : "続きから",
        run: openTask ?? (() => onResumeStage(stageId)),
        Icon: Play,
      }
    : start
      ? {
          label: "ここから始める",
          run: () => onStartStage(stageId),
          Icon: Play,
          testId: "lane-start-stage",
        }
      : skillCheck === "challenge"
        ? {
            label: "腕試しに挑戦（飛び級）",
            run: () => onSkillCheck(stageId),
            Icon: Sparkles,
          }
        : null;

  return (
    <div className="mt-auto pt-1">
      {primary ? (
        <Button
          size="sm"
          variant="accent"
          className="h-auto min-h-7 w-full whitespace-normal py-1"
          data-testid={primary.testId}
          onClick={primary.run}
        >
          <primary.Icon size={12} />
          {primary.label}
        </Button>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-ink-2 [&>button]:min-h-8 [&>button]:rounded-sm [&>button]:hover:text-brand [&>button]:hover:underline [&>button]:focus-visible:outline-none [&>button]:focus-visible:ring-2 [&>button]:focus-visible:ring-brand">
        {openStage ? (
          <button type="button" onClick={() => onOpenStage(stageId)}>
            レッスン一覧
          </button>
        ) : null}
        {skillCheck === "try" ? (
          <button type="button" onClick={() => onSkillCheck(stageId)}>
            腕試し
          </button>
        ) : null}
        {queue ? (
          <button type="button" onClick={() => onQueueStage(stageId)}>
            キューに追加
          </button>
        ) : null}
        <button
          type="button"
          aria-label={`${detail.obscured ? "名前の伏せられたスキル" : detail.label}をツリーで見る`}
          onClick={() => onShowInTree(stageId)}
        >
          ツリーで見る
        </button>
      </div>
    </div>
  );
}
