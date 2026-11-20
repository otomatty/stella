import { type KeyboardEvent, type ReactNode, useId, useRef, useState } from "react";
import {
  COMMENT_BODY_MAX,
  type CommentAuthor,
  type CommentMention,
  type CommentThread,
} from "@stella/shared/lessons/comments";
import { UserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  applyMention,
  type MentionRange,
  moveMentionRanges,
  parseMentionQuery,
  splitMentions,
  trackMentionRanges,
} from "@/lib/lesson-comments";
import { relativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import { formatVideoTime } from "@/lib/video-player";

export const COMMENT_ACTION = "min-h-8 min-w-8";
export const COMMENT_PRIMARY = "min-h-11 min-w-11 sm:min-h-8 sm:min-w-8";

function AuthorAvatar({ author }: { author: CommentAuthor }) {
  return (
    <UserAvatar
      src={author.avatar_url}
      size="sm"
      title={author.name}
      fallback={Array.from(author.name).slice(0, 2).join("")}
    />
  );
}

function AuthorLine({ author, createdAt }: { author: CommentAuthor; createdAt: number }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span className="font-semibold [overflow-wrap:anywhere]">{author.name}</span>
      {author.role === "admin" ? <Badge variant="info">管理者</Badge> : null}
      {author.is_self ? <span className="text-ink-3">(あなた)</span> : null}
      <span className="text-ink-3">{relativeTime(createdAt)}</span>
    </div>
  );
}

export function LessonCommentThread({
  thread,
  current,
  highlighted,
  open,
  busy,
  onSeek,
  onOpen,
  onReply,
  onDelete,
  onResolve,
  composer,
}: {
  thread: CommentThread;
  current: boolean;
  highlighted: boolean;
  open: boolean;
  busy: boolean;
  onSeek: (sec: number) => void;
  onOpen: (open: boolean) => void;
  onReply: () => void;
  onDelete: (replyId?: string) => void;
  onResolve: () => void;
  composer?: ReactNode;
}) {
  const position = thread.position_sec;
  const time = position === null ? null : formatVideoTime(position);
  const collapsed = thread.resolved && !open;
  const visibleReplyCount = thread.replies.length;
  // 投稿直後は、受け取った総数より先に返信一覧が増えることがある。
  const replyCount = Math.max(thread.reply_count ?? 0, visibleReplyCount);
  const hiddenReplyCount = replyCount - visibleReplyCount;
  const repliesId = useId();

  return (
    <article
      id={`lesson-comment-${thread.id}`}
      className={cn(
        "flex min-w-0 scroll-mt-[calc(var(--shell-header-height)+1rem)] items-start gap-2 rounded-lg border border-border bg-card p-2 sm:gap-3 sm:p-3",
        current && "bg-brand-soft",
        highlighted && "ring-2 ring-brand",
      )}
    >
      {thread.state === "orphaned" ? (
        <Badge className="mt-1.5">更新前</Badge>
      ) : position === null ? (
        <Badge className="mt-1.5">全体</Badge>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={`${COMMENT_PRIMARY} shrink-0 tabular-nums`}
          aria-label={`${time} へ移動`}
          onClick={() => onSeek(position)}
        >
          {time}
        </Button>
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <AuthorAvatar author={thread.author} />
          <AuthorLine author={thread.author} createdAt={thread.created_at} />
        </div>
        {current || thread.resolved || thread.state === "outdated" ? (
          <div className="flex flex-wrap gap-1">
            {current ? <Badge variant="accent">いまの場面</Badge> : null}
            {thread.state === "outdated" ? (
              <Badge variant="warning">更新前の動画へのコメント</Badge>
            ) : null}
            {thread.resolved ? <Badge variant="success">解決済み</Badge> : null}
          </div>
        ) : null}
        <p
          className={cn(
            "text-sm",
            collapsed ? "truncate" : "whitespace-pre-wrap [overflow-wrap:anywhere]",
          )}
        >
          {thread.body}
        </p>
        <div className="flex flex-wrap items-center gap-x-1">
          {collapsed ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={COMMENT_PRIMARY}
              onClick={() => onOpen(true)}
            >
              開く
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={COMMENT_PRIMARY}
            onClick={onReply}
          >
            返信する
          </Button>
          {replyCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={COMMENT_ACTION}
              aria-expanded={open}
              aria-controls={repliesId}
              onClick={() => onOpen(!open)}
            >
              返信 {replyCount} 件を{open ? "閉じる" : "見る"}
            </Button>
          ) : thread.resolved && open ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={COMMENT_ACTION}
              onClick={() => onOpen(false)}
            >
              閉じる
            </Button>
          ) : null}
          {thread.can_resolve ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={COMMENT_ACTION}
              disabled={busy}
              onClick={onResolve}
            >
              {thread.resolved ? "解決済みを外す" : "解決済みにする"}
            </Button>
          ) : null}
          {thread.can_delete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`${COMMENT_ACTION} text-danger`}
              disabled={busy}
              onClick={() => onDelete()}
            >
              削除する
            </Button>
          ) : null}
        </div>
        {replyCount > 0 ? (
          <ul id={repliesId} hidden={!open} className="space-y-3 border-t border-border pt-3">
            {open && hiddenReplyCount > 0 ? (
              <li className="text-xs text-ink-3">
                古い返信 {hiddenReplyCount} 件は表示していません
              </li>
            ) : null}
            {open
              ? thread.replies.map((reply) => (
                  <li key={reply.id} className="flex items-start gap-2">
                    <AuthorAvatar author={reply.author} />
                    <div className="min-w-0 flex-1">
                      <AuthorLine author={reply.author} createdAt={reply.created_at} />
                      <p className="mt-1 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">
                        <ReplyText body={reply.body} mentions={reply.mentions} />
                      </p>
                      {reply.can_delete ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={`${COMMENT_ACTION} text-danger`}
                          disabled={busy}
                          onClick={() => onDelete(reply.id)}
                        >
                          削除する
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))
              : null}
          </ul>
        ) : null}
        {open ? composer : null}
      </div>
    </article>
  );
}

function ReplyText({ body, mentions }: { body: string; mentions: CommentMention[] }) {
  let offset = 0;
  return splitMentions(body, mentions).map((part) => {
    const start = offset;
    offset += part.text.length;
    return part.mention ? (
      <span key={start} className="rounded bg-brand-soft font-bold text-brand-ink">
        {part.text}
      </span>
    ) : (
      <span key={start}>{part.text}</span>
    );
  });
}

export interface ReplyDraft {
  body: string;
  mentions: MentionRange[];
}

export function ReplyComposer({
  thread,
  draft,
  onChange,
  onFocusChange,
  onCancel,
  onSubmit,
  busy,
}: {
  thread: CommentThread;
  draft: ReplyDraft;
  onChange: (draft: ReplyDraft) => void;
  onFocusChange: (focused: boolean) => void;
  onCancel: () => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  const [caret, setCaret] = useState(0);
  const [selected, setSelected] = useState(0);
  const [suggest, setSuggest] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const listboxId = useId();
  const query = suggest ? parseMentionQuery(draft.body, caret) : null;
  const options = query
    ? (thread.mention_candidates ?? []).filter(({ name }) =>
        name.toLocaleLowerCase().includes(query.query.toLocaleLowerCase()),
      )
    : [];
  const selectedIndex = Math.min(selected, options.length - 1);
  const optionId = (index: number) => `${listboxId}-${index}`;
  const disabled = busy || !draft.body.trim();

  const choose = (person: CommentMention) => {
    setSuggest(false);
    if (!query) return false;
    const mention = applyMention(draft.body, { start: query.start, end: caret }, person.name);
    if (mention.text.length > COMMENT_BODY_MAX) return false;
    onChange({
      body: mention.text,
      mentions: [
        ...moveMentionRanges(
          draft.mentions,
          mention.text,
          query.start,
          caret,
          mention.caret - query.start,
        ),
        { ...person, start: query.start, length: mention.caret - query.start - 1 },
      ],
    });
    setCaret(mention.caret);
    requestAnimationFrame(() => field.current?.setSelectionRange(mention.caret, mention.caret));
    return true;
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (selectedIndex >= 0) {
      switch (event.key) {
        case "ArrowDown":
        case "ArrowUp": {
          event.preventDefault();
          const next =
            (selectedIndex + (event.key === "ArrowDown" ? 1 : -1) + options.length) %
            options.length;
          setSelected(next);
          document.getElementById(optionId(next))?.scrollIntoView({ block: "nearest" });
          return;
        }
        case "Enter":
        case "Tab":
          if (choose(options[selectedIndex]) || event.key === "Enter") event.preventDefault();
          return;
        case "Escape":
          event.preventDefault();
          setSuggest(false);
          return;
      }
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (!disabled) onSubmit();
    }
  };

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled) onSubmit();
      }}
    >
      <Textarea
        ref={field}
        aria-label="このスレッドに返信"
        aria-autocomplete="list"
        aria-controls={options.length ? listboxId : undefined}
        aria-activedescendant={selectedIndex >= 0 ? optionId(selectedIndex) : undefined}
        placeholder="このスレッドに返信"
        rows={3}
        maxLength={COMMENT_BODY_MAX}
        readOnly={busy}
        value={draft.body}
        onChange={(event) => {
          const { value, selectionStart } = event.currentTarget;
          onChange({
            body: value,
            mentions: trackMentionRanges(draft.body, value, draft.mentions, selectionStart),
          });
          setCaret(selectionStart);
          setSelected(0);
          setSuggest(true);
        }}
        onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
        onFocus={() => onFocusChange(true)}
        onBlur={() => {
          setSuggest(false);
          onFocusChange(false);
        }}
        onKeyDown={onKeyDown}
      />
      {options.length ? (
        <div className="rounded-md border border-border bg-card">
          <p id={`${listboxId}-label`} className="px-3 py-2 text-xs text-ink-3">
            このスレッドの参加者
          </p>
          <div
            id={listboxId}
            role="listbox"
            aria-labelledby={`${listboxId}-label`}
            className="max-h-48 overflow-y-auto p-1"
          >
            {options.map((person, index) => (
              <Button
                key={person.id}
                id={optionId(index)}
                type="button"
                role="option"
                variant="ghost"
                tabIndex={-1}
                aria-selected={index === selectedIndex}
                className={cn(
                  "min-h-11 h-auto w-full justify-start whitespace-normal text-left [overflow-wrap:anywhere]",
                  index === selectedIndex && "bg-brand-soft",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(person)}
              >
                {person.name}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          className={COMMENT_PRIMARY}
          disabled={busy}
          onClick={onCancel}
        >
          やめる
        </Button>
        <Button type="submit" variant="accent" className={COMMENT_PRIMARY} disabled={disabled}>
          返信する
        </Button>
      </div>
    </form>
  );
}
