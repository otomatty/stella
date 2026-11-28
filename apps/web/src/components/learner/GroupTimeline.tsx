import { GROUP_REACTION_EMOJIS } from "@stella/shared/groups/reactions";
import type { GroupTimeline as Timeline, GroupTimelineEvent } from "@stella/shared/groups/types";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ApiClientError } from "@/lib/api-client";
import { groupTimelineByDate, timelineDateHeading, timelineEventText } from "@/lib/group-timeline";
import {
  addGroupReaction,
  getGroupTimeline,
  removeGroupReaction,
  revokeGroupReflection,
} from "@/lib/groups-api";
import { cn } from "@/lib/utils";

type Reactions = GroupTimelineEvent["reactions"];

export function GroupTimeline({
  groupId,
  showHeading = true,
}: {
  groupId: string;
  showHeading?: boolean;
}) {
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const request = useRef<AbortController | null>(null);

  const loadTimeline = useCallback(
    async (cursor?: string) => {
      if (request.current) return;
      const controller = new AbortController();
      request.current = controller;
      setLoading(true);
      setError(null);
      try {
        const page = await getGroupTimeline(groupId, cursor, controller.signal);
        if (controller.signal.aborted) return;
        setTimeline((previous) => {
          if (!cursor || !previous) return page;
          const loaded = new Set(previous.events.map((event) => event.key));
          return {
            ...page,
            events: [...previous.events, ...page.events.filter((event) => !loaded.has(event.key))],
          };
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        const status = err instanceof ApiClientError ? err.status : undefined;
        if (status === 401 || status === 403 || status === 404) {
          setTimeline(null);
          setError("このグループは表示できません");
        } else {
          setError("タイムラインを読み込めませんでした");
        }
      } finally {
        if (!controller.signal.aborted) {
          request.current = null;
          setLoading(false);
        }
      }
    },
    [groupId],
  );

  useEffect(() => {
    void loadTimeline();
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [loadTimeline]);

  function replaceReactions(key: string, reactions: Reactions) {
    setTimeline(
      (previous) =>
        previous && {
          ...previous,
          events: previous.events.map((event) =>
            event.key === key ? { ...event, reactions } : event,
          ),
        },
    );
  }

  function clearReflection(key: string) {
    setTimeline(
      (previous) =>
        previous && {
          ...previous,
          events: previous.events.map((event) =>
            event.key === key ? { ...event, reflection: null } : event,
          ),
        },
    );
  }

  const now = Date.now();
  const DateHeading = showHeading ? "h3" : "h2";
  return (
    <section aria-label={showHeading ? "タイムライン" : undefined} className="min-w-0 space-y-4">
      {showHeading && <h2 className="text-lg font-semibold">タイムライン</h2>}
      {timeline?.events.length === 0 && <p className="text-sm text-ink-3">まだ節目はありません</p>}
      <TooltipProvider>
        {groupTimelineByDate(timeline?.events ?? []).map(([date, events]) => (
          <div key={date} className="space-y-2">
            <DateHeading className="text-sm font-semibold text-ink-3">
              <time dateTime={date}>{timelineDateHeading(date, now)}</time>
            </DateHeading>
            <ul className="space-y-2">
              {events.map((event) => (
                <TimelineRow
                  key={event.key}
                  groupId={groupId}
                  event={event}
                  onReactions={replaceReactions}
                  onReflectionRevoked={clearReflection}
                />
              ))}
            </ul>
          </div>
        ))}
      </TooltipProvider>
      {loading && <SkeletonRows rows={timeline ? 1 : 3} />}
      {error && <p role="alert">{error}</p>}
      {timeline?.nextCursor && (
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={loading}
          onClick={() => {
            if (timeline.nextCursor) void loadTimeline(timeline.nextCursor);
          }}
        >
          もっと見る
        </Button>
      )}
    </section>
  );
}

const chipClass =
  "inline-flex min-h-8 min-w-8 items-center justify-center gap-1 rounded-full border border-border bg-sunken px-2 text-sm focus-visible:outline-2 focus-visible:outline-brand aria-disabled:opacity-70";

function TimelineRow({
  groupId,
  event,
  onReactions,
  onReflectionRevoked,
}: {
  groupId: string;
  event: GroupTimelineEvent;
  onReactions: (key: string, reactions: Reactions) => void;
  onReflectionRevoked: (key: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const pending = useRef(false);
  const isMe = event.member.isMe;

  async function toggleReaction(emoji: string) {
    if (isMe || pending.current) return;
    pending.current = true;
    setSending(true);
    setPickerOpen(false);
    const mine = event.reactions.some((reaction) => reaction.emoji === emoji && reaction.mine);
    try {
      const send = mine ? removeGroupReaction : addGroupReaction;
      const { reactions } = await send(groupId, event.key, emoji);
      onReactions(event.key, reactions);
    } catch (error) {
      const status = error instanceof ApiClientError ? error.status : undefined;
      if (status === 409) toast.error("1 つの節目に押せるスタンプは 10 種類までです");
      else if (status === 404) toast.error("この節目は表示できなくなりました");
      else toast.error("スタンプを更新できませんでした");
    } finally {
      pending.current = false;
      setSending(false);
    }
  }

  return (
    <li className="rounded-xl border border-border bg-card px-3 py-3">
      <p className="text-sm [overflow-wrap:anywhere]">{timelineEventText(event)}</p>
      {event.kind === "task_pass" && event.reflection && (
        <TimelineReflection
          text={event.reflection}
          onRevoke={
            isMe
              ? async () => {
                  await revokeGroupReflection(groupId, event.key);
                  onReflectionRevoked(event.key);
                }
              : undefined
          }
        />
      )}
      {(!isMe || event.reactions.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {event.reactions.map((reaction) => (
            <ReactionChip
              key={reaction.emoji}
              reaction={reaction}
              readOnly={isMe}
              sending={sending}
              onToggle={() => void toggleReaction(reaction.emoji)}
            />
          ))}
          {!isMe && (
            <Popover
              open={pickerOpen}
              onOpenChange={(open) => setPickerOpen(open && !pending.current)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="スタンプを押す"
                  aria-disabled={sending}
                  className={cn(chipClass, "hover:border-brand")}
                >
                  ＋
                </button>
              </PopoverTrigger>
              <PopoverContent
                aria-label="スタンプを選ぶ"
                align="start"
                className="grid w-60 max-w-[calc(100vw-1rem)] grid-cols-5 gap-1 p-2"
              >
                {GROUP_REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-pressed={event.reactions.some(
                      (reaction) => reaction.emoji === emoji && reaction.mine,
                    )}
                    className="min-h-9 rounded-md text-lg hover:bg-sunken focus-visible:outline-2 focus-visible:outline-brand aria-pressed:bg-brand-soft"
                    onClick={() => void toggleReaction(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}
    </li>
  );
}

function TimelineReflection({ text, onRevoke }: { text: string; onRevoke?: () => Promise<void> }) {
  const id = useId();
  const quote = useRef<HTMLQuoteElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [long, setLong] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    const element = quote.current;
    if (!element || !text) return;
    const measure = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
      setLong(element.scrollHeight > Math.ceil(lineHeight * 6));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text]);

  async function revoke() {
    if (!onRevoke || revoking) return;
    setRevoking(true);
    try {
      await onRevoke();
      setConfirmOpen(false);
    } catch {
      toast.error("振り返りの共有を取り消せませんでした");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="mt-2">
      <blockquote
        id={id}
        ref={quote}
        className={cn(
          "border-l-2 border-border pl-3 text-sm leading-6 text-ink-2 whitespace-pre-wrap [overflow-wrap:anywhere]",
          !expanded && "line-clamp-6",
        )}
      >
        {text}
      </blockquote>
      {(long || expanded || onRevoke) && (
        <div className="flex flex-wrap gap-x-2">
          {(long || expanded) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-controls={id}
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "閉じる" : "続きを読む"}
            </Button>
          )}
          {onRevoke && (
            <Dialog
              open={confirmOpen}
              onOpenChange={(open) => {
                if (!revoking) setConfirmOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Button type="button" variant="ghost" size="sm">
                  共有をやめる
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md overflow-y-auto">
                <DialogHeader className="pr-12">
                  <DialogTitle>この振り返りをグループに共有するのをやめますか？</DialogTitle>
                  <DialogDescription>すべてのグループで表示されなくなります</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type="button"
                    className="min-h-11"
                    variant="outline"
                    disabled={revoking}
                    onClick={() => setConfirmOpen(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="button"
                    className="min-h-11"
                    variant="destructive"
                    disabled={revoking}
                    onClick={() => void revoke()}
                  >
                    共有をやめる
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </div>
  );
}

function ReactionChip({
  reaction,
  readOnly,
  sending,
  onToggle,
}: {
  reaction: Reactions[number];
  readOnly: boolean;
  sending: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const touch = useRef(false);
  const longPressed = useRef(false);
  useEffect(() => () => clearTimeout(pressTimer.current), []);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={reaction.mine}
          aria-disabled={readOnly || sending}
          className={cn(
            chipClass,
            readOnly ? "aria-disabled:opacity-100" : "hover:border-brand",
            reaction.mine && "border-brand bg-brand-soft",
          )}
          onPointerDown={(event) => {
            clearTimeout(pressTimer.current);
            longPressed.current = false;
            touch.current = event.pointerType === "touch";
            if (!touch.current) return;
            pressTimer.current = setTimeout(() => {
              longPressed.current = true;
              setOpen(true);
            }, 500);
          }}
          onPointerUp={() => clearTimeout(pressTimer.current)}
          onPointerCancel={() => clearTimeout(pressTimer.current)}
          onPointerLeave={() => clearTimeout(pressTimer.current)}
          onContextMenu={(event) => {
            if (!touch.current) return;
            event.preventDefault();
            longPressed.current = true;
            setOpen(true);
          }}
          onClickCapture={(event) => {
            if (event.detail === 0 || !longPressed.current) return;
            event.stopPropagation();
            longPressed.current = false;
          }}
          onClick={() => {
            if (!readOnly && !sending) onToggle();
          }}
        >
          {reaction.emoji} {reaction.count}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[min(16rem,calc(100vw-1rem))] [overflow-wrap:anywhere]">
        {reaction.names.join("、")}
      </TooltipContent>
    </Tooltip>
  );
}
