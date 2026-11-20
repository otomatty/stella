import { useEffect, useRef, useState } from "react";
import {
  COMMENT_BODY_MAX,
  type CommentFilter,
  type CommentThread,
} from "@stella/shared/lessons/comments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/avatar";
import type { VideoPlaybackState } from "./VideoViewer";
import type { useLessonComments } from "@/hooks/useLessonComments";
import { defaultCommentPosition, isCurrentThread, mentionedIds } from "@/lib/lesson-comments";
import { formatVideoTime } from "@/lib/video-player";
import {
  COMMENT_ACTION,
  COMMENT_PRIMARY,
  LessonCommentThread,
  ReplyComposer,
  type ReplyDraft,
} from "./LessonCommentThread";

type Comments = ReturnType<typeof useLessonComments>;
type Viewer = { id: string; name: string; initials: string; avatarUrl?: string | null };

const EMPTY_REPLY: ReplyDraft = { body: "", mentions: [] };
const FILTERS = [
  ["all", "すべて"],
  ["scene", "いまの場面"],
  ["mine", "自分のコメント"],
] as const;

export function LessonComments({
  comments,
  playback,
  getPlaybackState,
  onSeek,
  onPause,
  onComposingChange,
  focusThreadId,
  viewer,
  visible = true,
}: {
  comments: Comments;
  playback: VideoPlaybackState;
  getPlaybackState: () => VideoPlaybackState | null;
  onSeek: (sec: number) => void;
  onPause: () => void;
  onComposingChange: (composing: boolean) => void;
  focusThreadId?: string;
  viewer: Viewer;
  visible?: boolean;
}) {
  const [body, setBody] = useState("");
  const [position, setPosition] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [rootFocused, setRootFocused] = useState(false);
  const [replyFocused, setReplyFocused] = useState(false);
  const [replyId, setReplyId] = useState<string>();
  const [drafts, setDrafts] = useState<Record<string, ReplyDraft>>({});
  const [openThreads, setOpenThreads] = useState<Record<string, boolean>>({});
  const [highlighted, setHighlighted] = useState<Comments["focus"]>();
  const [deletion, setDeletion] = useState<{ thread: CommentThread; replyId?: string }>();
  const rootField = useRef<HTMLTextAreaElement>(null);
  const handledFocus = useRef<Comments["focus"]>(undefined);
  const focus = comments.focus;
  const orphanedThreads = comments.orphanedOpen ? comments.orphaned.threads : undefined;
  const canFocus =
    focus &&
    (comments.threads.some(({ id }) => id === focus.id) ||
      orphanedThreads?.some(({ id }) => id === focus.id));

  useEffect(() => {
    if (!visible || !focus || !canFocus || focus === handledFocus.current) return;
    const row = document.getElementById(`lesson-comment-${focus.id}`);
    if (!row) return;
    handledFocus.current = focus;
    setOpenThreads((previous) => ({ ...previous, [focus.id]: true }));
    setHighlighted(focus);
    row.scrollIntoView({ block: "nearest" });
  }, [canFocus, focus, visible]);

  useEffect(() => {
    if (!highlighted) return;
    const timer = setTimeout(() => setHighlighted(undefined), 3500);
    return () => clearTimeout(timer);
  }, [highlighted]);

  useEffect(() => {
    if (!visible) {
      setRootFocused(false);
      setReplyFocused(false);
    }
  }, [visible]);

  const composing =
    (visible && (rootFocused || replyFocused)) ||
    body.length > 0 ||
    Object.values(drafts).some((draft) => draft.body.length > 0);
  useEffect(() => {
    onComposingChange(composing);
  }, [composing, onComposingChange]);
  useEffect(() => () => onComposingChange(false), [onComposingChange]);

  const clearRoot = () => {
    rootField.current?.blur();
    setRootFocused(false);
    setBody("");
    setExpanded(false);
    setPosition(null);
  };
  const canPost = Boolean(body.trim()) && !comments.busy;
  const post = async () => {
    if (canPost && (await comments.post(body, position))) clearRoot();
  };
  const clearReply = (id: string) => {
    setDrafts((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
    setReplyId((previous) => (previous === id ? undefined : previous));
    if (replyId === id) setReplyFocused(false);
  };

  const threadRow = (thread: CommentThread) => {
    const { id } = thread;
    const draft = drafts[id] ?? EMPTY_REPLY;
    const setOpen = (open: boolean) => {
      setOpenThreads((previous) => ({ ...previous, [id]: open }));
      if (!open && replyId === id) setReplyFocused(false);
    };
    const open = openThreads[id] ?? id === (focus?.id ?? focusThreadId);
    return (
      <LessonCommentThread
        key={id}
        thread={thread}
        current={
          playback.hasPlayed && isCurrentThread(thread, comments.scenes, playback.currentTime)
        }
        highlighted={highlighted?.id === id}
        open={open}
        busy={comments.busy}
        onSeek={onSeek}
        onOpen={setOpen}
        onReply={() => {
          setOpen(true);
          setReplyId(id);
        }}
        onDelete={(replyId) => setDeletion({ thread, replyId })}
        onResolve={() => void comments.resolve(thread)}
        composer={
          replyId === id ? (
            <ReplyComposer
              thread={thread}
              draft={draft}
              busy={comments.busy}
              onChange={(next) => setDrafts((previous) => ({ ...previous, [id]: next }))}
              onFocusChange={(focused) => {
                setReplyFocused(focused);
                if (focused && !playback.paused) onPause();
              }}
              onCancel={() => clearReply(id)}
              onSubmit={async () => {
                if (await comments.reply(thread, draft.body, mentionedIds(draft.mentions))) {
                  setOpen(true);
                  clearReply(id);
                }
              }}
            />
          ) : undefined
        }
      />
    );
  };

  if (!comments.enabled) return null;
  return (
    <div className="min-w-0 space-y-4">
      <form
        className="flex min-w-0 items-start gap-2 sm:gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void post();
        }}
      >
        <UserAvatar src={viewer.avatarUrl} fallback={viewer.initials} title={viewer.name} />
        <div className="min-w-0 flex-1 space-y-2">
          {expanded ? (
            <div className="flex flex-wrap items-center justify-between gap-x-2 text-xs text-ink-3">
              {position === null ? (
                <span>動画全体にコメントします</span>
              ) : (
                <span className="inline-flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={COMMENT_ACTION}
                    onClick={() => onSeek(position)}
                  >
                    {formatVideoTime(position)}
                  </Button>
                  の場面にコメントします
                </span>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={COMMENT_ACTION}
                onClick={() =>
                  setPosition(
                    position === null ? (getPlaybackState() ?? playback).currentTime : null,
                  )
                }
              >
                {position === null ? "いまの場面に付ける" : "場面を付けずに書く"}
              </Button>
            </div>
          ) : null}
          <Textarea
            ref={rootField}
            aria-label="コメント"
            placeholder="コメントを書く"
            rows={expanded ? 3 : 1}
            maxLength={COMMENT_BODY_MAX}
            readOnly={comments.busy}
            value={body}
            className="min-h-11 resize-none border-border focus:border-border focus:ring-0 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-border"
            onChange={(event) => setBody(event.currentTarget.value)}
            onFocus={() => {
              setRootFocused(true);
              onPause();
              if (!expanded) {
                const state = getPlaybackState() ?? playback;
                setExpanded(true);
                setPosition(state.ended ? null : defaultCommentPosition(state));
              }
            }}
            onBlur={() => setRootFocused(false)}
            onKeyDown={(event) => {
              if (
                !event.nativeEvent.isComposing &&
                event.key === "Enter" &&
                (event.ctrlKey || event.metaKey)
              ) {
                event.preventDefault();
                void post();
              }
            }}
          />
          {expanded ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {body.length > COMMENT_BODY_MAX * 0.9 ? (
                <span className="mr-auto text-xs text-ink-3">
                  残り {COMMENT_BODY_MAX - body.length} 文字
                </span>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                className={COMMENT_PRIMARY}
                disabled={comments.busy}
                onClick={clearRoot}
              >
                やめる
              </Button>
              <Button
                type="submit"
                variant="accent"
                className={COMMENT_PRIMARY}
                disabled={!canPost}
              >
                コメントする
              </Button>
            </div>
          ) : null}
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          {comments.total === undefined ? "コメント" : `${comments.total} 件のコメント`}
        </p>
        <fieldset aria-label="コメントの並び順" className="flex min-w-0 flex-wrap gap-1">
          {(
            [
              ["time", "動画の時間順"],
              ["new", "新しい順"],
            ] as const
          ).map(([sort, label]) => (
            <Button
              key={sort}
              type="button"
              size="sm"
              variant={comments.sort === sort ? "default" : "ghost"}
              className={COMMENT_ACTION}
              aria-pressed={comments.sort === sort}
              onClick={() => comments.setSort(sort)}
            >
              {label}
            </Button>
          ))}
        </fieldset>
      </div>
      <fieldset aria-label="コメントの絞り込み" className="flex min-w-0 flex-wrap gap-1">
        {FILTERS.filter(([filter]) => filter !== "scene" || comments.scenes.length).map(
          ([filter, label]: readonly [CommentFilter, string]) => (
            <Button
              key={filter}
              type="button"
              size="sm"
              variant={comments.filter === filter ? "default" : "ghost"}
              className={COMMENT_PRIMARY}
              aria-pressed={comments.filter === filter}
              onClick={() => {
                setReplyFocused(false);
                comments.setFilter(filter);
              }}
            >
              {label}
            </Button>
          ),
        )}
      </fieldset>

      <div className="space-y-2" aria-busy={comments.loading}>
        {comments.threads.map(threadRow)}
        {comments.loading ? <SkeletonRows rows={2} /> : null}
        {comments.error ? <LoadError error={comments.error} reload={comments.reload} /> : null}
        {!comments.loading && !comments.error && !comments.threads.length ? (
          <p className="py-2 text-sm text-ink-3">
            {comments.filter === "all"
              ? "まだコメントはありません。動画を止めて、気になった場面に質問や気づきを書けます。"
              : "この絞り込みに当てはまるコメントはありません。"}
          </p>
        ) : null}
        {comments.hasMore && !comments.error ? (
          <Button
            type="button"
            variant="outline"
            className={COMMENT_PRIMARY}
            disabled={comments.loading}
            onClick={() => void comments.loadMore()}
          >
            コメントをさらに表示する
          </Button>
        ) : null}
      </div>

      {comments.orphanedCount > 0 || comments.orphanedOpen ? (
        <div className="space-y-2 border-t border-border pt-2">
          <Button
            type="button"
            variant="ghost"
            className={COMMENT_PRIMARY}
            aria-expanded={comments.orphanedOpen}
            onClick={() => {
              setReplyFocused(false);
              comments.setOrphanedOpen(!comments.orphanedOpen);
            }}
          >
            {`更新前の動画へのコメント${comments.orphanedCount > 0 ? ` ${comments.orphanedCount} 件` : ""}`}
          </Button>
          {comments.orphanedOpen ? (
            <div className="space-y-2" aria-busy={comments.orphaned.loading}>
              <p className="text-sm text-ink-3">動画の更新で、場面が無くなったコメントです。</p>
              {orphanedThreads?.map(threadRow)}
              {comments.orphaned.loading ? <SkeletonRows rows={2} /> : null}
              {comments.orphaned.error ? (
                <LoadError error={comments.orphaned.error} reload={comments.orphaned.reload} />
              ) : null}
              {comments.orphaned.hasMore && !comments.orphaned.error ? (
                <Button
                  type="button"
                  variant="outline"
                  className={COMMENT_PRIMARY}
                  disabled={comments.orphaned.loading}
                  onClick={() => void comments.orphaned.loadMore()}
                >
                  コメントをさらに表示する
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <Dialog
        open={Boolean(deletion)}
        onOpenChange={(open) => {
          if (!open && !comments.busy) setDeletion(undefined);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader className="pr-10">
            <DialogTitle>
              {deletion?.replyId ? "返信を削除しますか？" : "コメントを削除しますか？"}
            </DialogTitle>
            <DialogDescription>
              {deletion?.replyId
                ? "削除した返信は元に戻せません。"
                : "このコメントとすべての返信が削除されます。元に戻せません。"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              className={COMMENT_PRIMARY}
              disabled={comments.busy}
              onClick={() => setDeletion(undefined)}
            >
              やめる
            </Button>
            <Button
              type="button"
              variant="destructive"
              className={COMMENT_PRIMARY}
              disabled={comments.busy}
              onClick={async () => {
                if (!deletion || !(await comments.remove(deletion.thread, deletion.replyId)))
                  return;
                if (!deletion.replyId) clearReply(deletion.thread.id);
                setDeletion(undefined);
              }}
            >
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoadError({ error, reload }: { error: string; reload: () => Promise<void> }) {
  return (
    <div className="space-y-2">
      <p role="alert" className="text-sm text-danger [overflow-wrap:anywhere]">
        {error}
      </p>
      <Button type="button" className={COMMENT_PRIMARY} onClick={() => void reload()}>
        再読み込み
      </Button>
    </div>
  );
}
