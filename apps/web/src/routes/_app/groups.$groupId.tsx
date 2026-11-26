import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { GroupPeerProgress } from "@stella/shared/groups/types";
import { AccessDeniedScreen } from "@/components/common/AccessDeniedScreen";
import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiClientError } from "@/lib/api-client";
import {
  peerHiddenBubble,
  peerNow,
  peerStageBubble,
  peerStageShortLabels,
  stripSharedTitlePrefix,
  type PeerNow,
} from "@/lib/group-peers";
import { getGroupPeers } from "@/lib/groups-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/groups/$groupId")({
  component: GroupProgressPage,
});

function GroupProgressPage() {
  const { groupId } = Route.useParams();
  const { backendEnabled, currentUserId, myGroups, profileRole } = useAppShell();
  const unavailable =
    (myGroups.status === "ready" && !myGroups.groups.some((group) => group.id === groupId)) ||
    (myGroups.status === "error" && myGroups.accessDenied);
  if (profileRole === "admin") return <AccessDeniedScreen allow={["learner"]} />;
  const showBackLink = !(myGroups.status === "ready" && myGroups.groups.length === 1);

  return (
    <RoleGuard allow={["learner"]}>
      <GroupProgress
        key={JSON.stringify([currentUserId, groupId])}
        groupId={groupId}
        enabled={
          backendEnabled && currentUserId !== null && profileRole === "student" && !unavailable
        }
        showBackLink={showBackLink}
      />
    </RoleGuard>
  );
}

type PeerResult = { data: GroupPeerProgress } | { error: string };

function GroupProgress({
  groupId,
  enabled,
  showBackLink,
}: {
  groupId: string;
  enabled: boolean;
  showBackLink: boolean;
}) {
  const [result, setResult] = useState<PeerResult | null>(null);
  useEffect(() => {
    if (!enabled) {
      setResult(null);
      return;
    }
    let request: AbortController | undefined;
    const load = () => {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      const { signal } = controller;
      void getGroupPeers(groupId, signal).then(
        (data) => {
          if (!signal.aborted) setResult({ data });
        },
        (error: unknown) => {
          if (signal.aborted) return;
          const status = error instanceof ApiClientError ? error.status : undefined;
          setResult({
            error:
              status === 401 || status === 403 || status === 404
                ? "このグループは表示できません"
                : "仲間の進捗を読み込めませんでした",
          });
        },
      );
    };
    load();
    window.addEventListener("focus", load);
    return () => {
      window.removeEventListener("focus", load);
      request?.abort();
    };
  }, [enabled, groupId]);

  const progress = enabled && result && "data" in result ? result.data : null;
  const error = enabled
    ? result && "error" in result && result.error
    : "このグループは表示できません";
  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-5">
      {showBackLink ? (
        <Link
          to="/groups"
          className="inline-flex min-h-11 items-center text-sm text-brand underline"
        >
          グループ一覧に戻る
        </Link>
      ) : null}
      <header>
        <h1 className="break-words text-2xl font-bold">{progress?.group.name ?? "グループ"}</h1>
      </header>
      {progress ? (
        <PeerBands progress={progress} />
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        <PeerBandsSkeleton />
      )}
    </div>
  );
}

function PeerBandsSkeleton() {
  const segments = ["1", "2", "3", "4", "5", "6", "7", "8"];

  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">仲間の進捗を読み込んでいます</span>
      <div className="space-y-4" aria-hidden="true">
        <div className="overflow-x-auto p-1">
          <div className="min-w-[239px] space-y-2 sm:min-w-[670px]">
            <div className="grid h-4 items-center border border-transparent px-3 sm:grid-cols-[200px_200px_minmax(0,1fr)] sm:gap-3">
              <Skeleton className="hidden h-3 w-12 sm:block" />
              <Skeleton className="hidden h-3 w-8 sm:block" />
              <div className="flex gap-[3px] sm:gap-1">
                {segments.map((key) => (
                  <div key={key} className="flex min-w-[24px] flex-1 justify-center">
                    <Skeleton className="h-2.5 w-4" />
                  </div>
                ))}
              </div>
            </div>
            {["first", "second", "third", "fourth"].map((key) => (
              <div key={key} className="rounded-xl border border-border bg-card">
                <div className="grid grid-cols-1 items-center gap-2 px-3 py-2 sm:grid-cols-[200px_200px_minmax(0,1fr)] sm:gap-3 sm:py-3">
                  <div className="flex h-6 min-w-0 items-center justify-between gap-2 sm:justify-start">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-12 sm:hidden" />
                  </div>
                  <div className="hidden sm:block">
                    <div className="flex h-5 items-center">
                      <Skeleton className="h-3.5 w-28" />
                    </div>
                  </div>
                  <div className="flex gap-[3px] sm:gap-1">
                    {segments.map((key) => (
                      <div
                        key={key}
                        className="flex min-h-[24px] min-w-[24px] flex-[1_1_0%] items-center"
                      >
                        <Skeleton className="h-3.5 w-full rounded-[4px] sm:h-5" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

interface DisplayStage {
  id: string;
  title: string;
  short: string;
  percent: number;
  cleared: boolean;
}

/** 「その先」の段の長さ。通常の段の何倍か。 */
const HIDDEN_SEGMENT_RATIO = 0.5;

/** 先に進んでいる人の「その先」の段。塗りつぶさず右へ薄くする。 */
const AHEAD_FADE: CSSProperties = {
  backgroundImage: "linear-gradient(to right, var(--brand), transparent)",
};

/**
 * 先に進んでいる人の「いま」にぼかして出す文字列。見えないステージの題名は API から来ないので、
 * 実際の題名ではなく固定の文字列を使う。
 */
const AHEAD_PLACEHOLDER = "00章 ステージの名前";

const HATCH: CSSProperties = {
  backgroundColor: "var(--bg-muted)",
  backgroundImage:
    "repeating-linear-gradient(-45deg, transparent, transparent 3px, var(--line-strong) 3px, var(--line-strong) 4px)",
};

function PeerBands({ progress }: { progress: GroupPeerProgress }) {
  const titles = progress.stages.map((stage) => stage.title);
  const displayTitles = stripSharedTitlePrefix(titles);
  const shorts = peerStageShortLabels(titles);
  const stages = progress.stages.map((stage, index) => ({
    id: stage.id,
    title: displayTitles[index] ?? stage.title,
    short: shorts[index] ?? String(index + 1),
  }));
  const occurrences = new Map<string, number>();
  const hasHiddenStages = progress.hasHiddenStages;
  const segmentCount = stages.length + Number(hasHiddenStages);
  const segmentsWidth = 24 * stages.length + (hasHiddenStages ? 16 : 0);
  return (
    <div className="space-y-4">
      <section aria-label="仲間の進捗" className="overflow-x-auto p-1 [container-type:inline-size]">
        <div
          className="min-w-[calc(var(--band-width)+26px)] space-y-2 [--band-gap:3px] sm:min-w-[calc(var(--band-width)+450px)] sm:[--band-gap:4px]"
          style={
            {
              "--band-width": `calc(${segmentsWidth}px + ${Math.max(0, segmentCount - 1)} * var(--band-gap))`,
            } as CSSProperties
          }
        >
          <div className="grid items-end border border-transparent px-3 text-xs text-ink-3 sm:grid-cols-[200px_200px_minmax(0,1fr)] sm:gap-3">
            <div className="hidden sm:block">メンバー</div>
            <div className="hidden sm:block">いま</div>
            <BandLabels stages={stages} hasHiddenStages={hasHiddenStages} />
          </div>
          <ul className="space-y-2">
            {progress.members.map((member) => {
              const occurrence = (occurrences.get(member.name) ?? 0) + 1;
              occurrences.set(member.name, occurrence);
              const byId = new Map(member.stages.map((stage) => [stage.id, stage]));
              const snapshots: DisplayStage[] = stages.map((stage) => {
                const row = byId.get(stage.id);
                return {
                  ...stage,
                  percent: row?.percent ?? 0,
                  cleared: row?.cleared ?? false,
                };
              });
              const now = peerNow(snapshots, member.ahead, hasHiddenStages);
              return (
                <li
                  key={JSON.stringify([member.name, occurrence])}
                  className={cn(
                    "rounded-xl border border-border",
                    member.isMe ? "bg-brand-soft" : "bg-card",
                  )}
                >
                  <div className="grid grid-cols-1 items-center gap-2 px-3 py-2 sm:grid-cols-[200px_200px_minmax(0,1fr)] sm:gap-3 sm:py-3">
                    <div className="flex min-w-0 items-center justify-between gap-2 max-sm:sticky max-sm:left-[17px] max-sm:max-w-[calc(100cqw-26px)] sm:justify-start">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">{member.name}</span>
                        {member.isMe ? <Badge variant="accent">あなた</Badge> : null}
                      </div>
                      <div className="max-w-[55%] shrink-0 text-xs sm:hidden">
                        <NowText now={now} />
                      </div>
                    </div>
                    <div className="hidden min-w-0 sm:block">
                      <NowLines now={now} />
                    </div>
                    <Band
                      stages={snapshots}
                      ahead={member.ahead}
                      hasHiddenStages={hasHiddenStages}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      <PeerLegend hasHiddenStages={hasHiddenStages} />
    </div>
  );
}

function NowLines({ now }: { now: PeerNow }) {
  return (
    <div className="min-w-0 text-[13px]">
      <NowText now={now} />
    </div>
  );
}

function NowText({ now }: { now: PeerNow }) {
  if (now.kind === "stage") return <p className="truncate text-ink">{now.title}</p>;
  if (now.kind === "ahead") {
    return (
      <p className="truncate">
        <span className="sr-only">先に進んでいます</span>
        <span aria-hidden="true" className="select-none text-ink blur-[5px]">
          {AHEAD_PLACEHOLDER}
        </span>
      </p>
    );
  }
  if (now.kind === "done") return <p className="truncate text-success">{now.label}</p>;
  return null;
}

function BandLabels({
  stages,
  hasHiddenStages,
}: {
  stages: { id: string; short: string }[];
  hasHiddenStages: boolean;
}) {
  if (stages.length === 0 && !hasHiddenStages) return null;
  return (
    <div className="flex min-w-0 gap-[var(--band-gap)]" aria-hidden="true">
      {stages.map((stage) => (
        <div
          key={stage.id}
          className="min-w-[24px] flex-[1_1_0%] truncate text-center text-[10px] text-ink-3 sm:text-[11px]"
        >
          {stage.short}
        </div>
      ))}
      {hasHiddenStages ? (
        <div
          className="min-w-[16px] truncate text-center text-[10px] text-ink-3 sm:text-[11px]"
          style={{ flex: `${HIDDEN_SEGMENT_RATIO} 1 0%` }}
        >
          ››
        </div>
      ) : null}
    </div>
  );
}

function Band({
  stages,
  ahead,
  hasHiddenStages,
}: {
  stages: DisplayStage[];
  ahead: boolean;
  hasHiddenStages: boolean;
}) {
  if (stages.length === 0 && !hasHiddenStages) return null;
  return (
    <div className="flex min-w-0 gap-[var(--band-gap)]">
      {stages.map((stage) => (
        <SegmentButton
          key={stage.id}
          label={peerStageBubble(stage)}
          kind={stage.cleared ? "cleared" : stage.percent > 0 ? "progress" : "idle"}
          percent={stage.percent}
        />
      ))}
      {hasHiddenStages ? (
        <SegmentButton label={peerHiddenBubble(ahead)} kind={ahead ? "ahead" : "hidden"} wide />
      ) : null}
    </div>
  );
}

function SegmentButton({
  label,
  kind,
  percent = 0,
  wide = false,
}: {
  label: string;
  kind: "cleared" | "progress" | "idle" | "hidden" | "ahead";
  percent?: number;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const touch = useRef(false);
  const button = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const openOnPointerEnter = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeOnPointerLeave = (event: PointerEvent) => {
    if (event.pointerType === "touch" || button.current?.matches(":focus-visible")) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <button
          ref={button}
          type="button"
          aria-label={label}
          aria-expanded={open}
          className={cn(
            "flex min-h-[24px] items-center justify-center rounded-[4px] focus-visible:outline-2 focus-visible:outline-brand",
            wide ? "min-w-[16px]" : "min-w-[24px] flex-[1_1_0%]",
          )}
          style={wide ? { flex: `${HIDDEN_SEGMENT_RATIO} 1 0%` } : undefined}
          onPointerDown={(event) => {
            touch.current = event.pointerType === "touch";
            if (touch.current) clearTimeout(closeTimer.current);
          }}
          onPointerEnter={openOnPointerEnter}
          onPointerLeave={closeOnPointerLeave}
          onFocus={() => {
            if (!touch.current) {
              clearTimeout(closeTimer.current);
              setOpen(true);
            }
          }}
          onBlur={() => {
            setOpen(false);
            touch.current = false;
          }}
          onClick={() => {
            if (touch.current) setOpen((value) => !value);
            touch.current = false;
          }}
        >
          <span
            aria-hidden="true"
            className={cn(
              "relative flex h-3.5 w-full items-center justify-center overflow-hidden rounded-[4px] sm:h-5",
              kind === "cleared" && "bg-success",
              kind === "progress" && "bg-brand-soft",
              kind === "idle" && "border border-border bg-card",
            )}
            style={kind === "hidden" ? HATCH : kind === "ahead" ? AHEAD_FADE : undefined}
          >
            {kind === "progress" ? (
              <span
                className="absolute inset-y-0 left-0 bg-brand"
                style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
              />
            ) : null}
          </span>
        </button>
      </PopoverAnchor>
      <PopoverContent
        side="top"
        sideOffset={0}
        className="w-auto max-w-48 px-2 py-1 text-center text-xs shadow-md"
        onPointerEnter={openOnPointerEnter}
        onPointerLeave={closeOnPointerLeave}
        onInteractOutside={(event) => {
          if (event.target instanceof Node && button.current?.contains(event.target)) {
            event.preventDefault();
          }
        }}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {label}
      </PopoverContent>
    </Popover>
  );
}

function PeerLegend({ hasHiddenStages }: { hasHiddenStages: boolean }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-2">
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-[4px] bg-success" aria-hidden="true" />
        修了
      </li>
      <li className="flex items-center gap-1.5">
        <span
          className="relative h-3 w-5 overflow-hidden rounded-[4px] bg-brand-soft"
          aria-hidden="true"
        >
          <span className="absolute inset-y-0 left-0 w-1/2 bg-brand" />
        </span>
        受講中
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-[4px] border border-border bg-card" aria-hidden="true" />
        未着手
      </li>
      {hasHiddenStages ? (
        <>
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-5 rounded-[4px]" style={HATCH} aria-hidden="true" />
            その先 (まだ開いていないステージ)
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-5 rounded-[4px]" style={AHEAD_FADE} aria-hidden="true" />
            先に進んでいます
          </li>
        </>
      ) : null}
    </ul>
  );
}
