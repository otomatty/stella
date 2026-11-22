import { useEffect, useId, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { courseStagesOf, courseStageStatus } from "@/lib/course-panel";
import { X } from "@/lib/icons";
import type { SkillMapStageNode, StageContentPayload } from "@/lib/skill-map-api";
import { cn } from "@/lib/utils";

interface CoursePanelProps {
  courseKey: string | null;
  nodes: readonly SkillMapStageNode[];
  activeStageId: string | null;
  isDesktop: boolean;
  onClose: () => void;
  onResumeStage: (id: string) => void;
  onStartStage: (id: string) => void;
  onOpenStage: (id: string) => void;
}

function CourseStageCounts({ content }: { content: StageContentPayload }) {
  const stats = [
    { label: "課題", value: content.tasks, color: "text-brand-ink" },
    { label: "問題", value: content.problems, color: "text-brand-ink" },
    { label: "動画", value: content.videos, color: "text-ink-2" },
    { label: "知識問題", value: content.knowledge_questions, color: "text-ink-2" },
  ];

  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs tabular-nums">
      {stats.map(({ label, value, color }) => (
        <span key={label} className={cn("whitespace-nowrap", value === 0 ? "text-ink-4" : color)}>
          {label} {value.toLocaleString("ja-JP")}
        </span>
      ))}
    </div>
  );
}

export function CoursePanel({
  courseKey,
  nodes,
  activeStageId,
  isDesktop,
  onClose,
  onResumeStage,
  onStartStage,
  onOpenStage,
}: CoursePanelProps) {
  const titleId = useId();
  const drawerAnchor = useRef<HTMLElement | null>(null);
  const isOpen = courseKey !== null;

  useEffect(() => {
    if (!isDesktop || !isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isDesktop, isOpen, onClose]);

  if (courseKey === null) return null;

  const { open, lockedAhead, hasMoreAhead } = courseStagesOf(nodes, courseKey);
  const actions = {
    cleared: { status: "クリア", badge: "success", label: "レッスン一覧", run: onOpenStage },
    "in-progress": { status: "受講中", badge: "info", label: "続きから", run: onResumeStage },
    startable: { status: "始められる", badge: "accent", label: "始める", run: onStartStage },
  } as const;

  const title = (
    <>
      {courseKey}
      <span className="ml-2 whitespace-nowrap text-xs font-medium text-ink-3">コース</span>
    </>
  );
  const body = (
    <div
      key={courseKey}
      className="min-h-0 space-y-3 overflow-y-auto overscroll-contain px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <h3 className="text-xs font-semibold text-ink-2">いま進めるステージ</h3>
      {open.length ? (
        <ol className="divide-y divide-border">
          {open.map((node) => {
            const action = actions[courseStageStatus(node, activeStageId)];
            const hours = node.content?.planned_hours;
            return (
              <li key={node.id} className="space-y-2 py-3 first:pt-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h4 className="text-sm font-semibold">{node.title ?? "ステージ"}</h4>
                  <Badge variant={action.badge}>{action.status}</Badge>
                  {hours != null ? (
                    <span className="whitespace-nowrap text-xs text-ink-2 tabular-nums">
                      {hours.toLocaleString("ja-JP")}h
                    </span>
                  ) : null}
                </div>
                {node.content ? <CourseStageCounts content={node.content} /> : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label={node.title ? `${node.title}の${action.label}` : action.label}
                  onClick={() => action.run(node.id)}
                >
                  {action.label}
                </Button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-ink-3">このコースで、いま進められるステージはありません。</p>
      )}
      {lockedAhead.length ? (
        <div className="space-y-1 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-ink-3">
          <p>まだ解放されていないステージ</p>
          <div
            aria-hidden="true"
            className="pointer-events-none flex select-none flex-wrap gap-x-3"
          >
            {lockedAhead.map((node) =>
              node.title ? (
                <span key={node.id} className="blur-sm">
                  {node.title}
                </span>
              ) : null,
            )}
          </div>
        </div>
      ) : null}
      {hasMoreAhead ? (
        <p className="text-xs text-ink-3">前のステージをクリアすると、次のステージが現れます。</p>
      ) : null}
    </div>
  );

  if (isDesktop) {
    return (
      <section
        aria-labelledby={titleId}
        className="pointer-events-auto absolute top-28 right-4 z-20 flex max-h-[calc(100cqh-8rem)] w-[340px] flex-col rounded-2xl border border-border bg-card/95 shadow-xl backdrop-blur-md"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 id={titleId} className="text-sm font-semibold">
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="コースを閉じる"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </Button>
        </div>
        {body}
      </section>
    );
  }

  return (
    <Drawer open onOpenChange={(next) => !next && onClose()}>
      <DrawerContent
        className="max-h-[80dvh]"
        onOpenAutoFocus={() => {
          drawerAnchor.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(event) => {
          const anchor = drawerAnchor.current;
          if (anchor?.isConnected) {
            event.preventDefault();
            anchor.focus();
          }
        }}
      >
        <DrawerHeader className="flex-row items-center justify-between gap-2">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription className="sr-only">いま進めるステージ</DrawerDescription>
          <DrawerClose asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="コースを閉じる">
              <X size={16} aria-hidden="true" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        {body}
      </DrawerContent>
    </Drawer>
  );
}
