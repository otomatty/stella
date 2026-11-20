import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  COMMENT_PAGE_SIZE,
  type CommentFilter,
  type CommentThread,
  type LessonCommentsResponse,
  sceneAt,
} from "@stella/shared/lessons/comments";
import { toast } from "sonner";
import type {
  VideoCommentControls,
  VideoPlaybackState,
  VideoViewerHandle,
} from "@/components/learner/VideoViewer";
import {
  deleteLessonComment,
  listLessonComments,
  postLessonComment,
  resolveLessonComment,
} from "@/lib/lesson-comments-api";

type Query = Parameters<typeof listLessonComments>[0];
type ListData = LessonCommentsResponse & { offset: number };
type ListUpdate = (data: ListData) => ListData;
type Sort = "time" | "new";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "コメントの処理に失敗しました";
}

function useCommentPages(query: Query, enabled: boolean, include?: string) {
  const [page, setPage] = useState<{ query: Query; data: ListData }>();
  const [request, setRequest] = useState<{ query: Query; error?: string }>();
  const [lastResponse, setLastResponse] = useState<{
    lessonId: string;
    data: LessonCommentsResponse;
    allTotal?: number;
  }>();
  const pending = useRef<AbortController | null>(null);
  const lastFetch = useRef(0);
  const current = page?.query === query ? page.data : undefined;

  const load = useCallback(
    async (offset = 0, pages = 1, metadataOnly = false) => {
      if (!enabled) return;
      pending.current?.abort();
      const controller = new AbortController();
      pending.current = controller;
      setRequest({ query });
      try {
        const results = await Promise.all(
          Array.from({ length: pages }, (_, index) =>
            listLessonComments(
              {
                ...query,
                // include は先頭ページだけに付け、追加表示の offset には数えない。
                include: !metadataOnly && offset === 0 && index === 0 ? include : undefined,
                offset: offset + index * COMMENT_PAGE_SIZE,
              },
              controller.signal,
            ),
          ),
        );
        if (controller.signal.aborted) return;
        const data = results[0];
        setPage((previous) => {
          if (metadataOnly && previous?.query === query) {
            return { query, data: { ...previous.data, total: data.total } };
          }
          const threads = offset && previous?.query === query ? previous.data.threads : [];
          const merged = new Map(threads.map((thread) => [thread.id, thread]));
          for (const result of results) {
            for (const thread of result.threads) merged.set(thread.id, thread);
          }
          return {
            query,
            data: {
              ...data,
              threads: [...merged.values()],
              offset: offset + pages * COMMENT_PAGE_SIZE,
            },
          };
        });
        setLastResponse((previous) => ({
          lessonId: query.lessonId,
          data,
          allTotal:
            query.scope !== "orphaned" && query.filter === "all"
              ? data.total
              : previous?.lessonId === query.lessonId
                ? previous.allTotal
                : undefined,
        }));
        setRequest(undefined);
        lastFetch.current = Date.now();
      } catch (error) {
        if (!controller.signal.aborted) setRequest({ query, error: errorMessage(error) });
      }
    },
    [enabled, query, include],
  );

  useEffect(() => {
    void load();
    return () => pending.current?.abort();
  }, [load]);

  const offset = current?.offset ?? 0;
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFetch.current >= 60_000) {
        void load(0, Math.max(1, Math.ceil(offset / COMMENT_PAGE_SIZE)));
      }
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [enabled, load, offset]);

  const update = (patch: ListUpdate, countChange = 0) => {
    setPage((previous) =>
      previous?.query === query ? { query, data: patch(previous.data) } : previous,
    );
    setLastResponse((previous) =>
      previous?.lessonId === query.lessonId
        ? {
            ...previous,
            data: patch({ ...previous.data, offset: 0 }),
            allTotal: previous.allTotal === undefined ? undefined : previous.allTotal + countChange,
          }
        : previous,
    );
  };

  const error = request?.query === query ? request.error : undefined;
  return {
    data: current,
    metadata: lastResponse?.lessonId === query.lessonId ? lastResponse : undefined,
    loading: enabled && ((!current && !error) || (request?.query === query && !error)),
    error,
    load,
    refresh: () => load(0, 1, true),
    update,
    hasMore: current !== undefined && offset < current.total,
    loadMore: () => load(offset),
  };
}

export function useLessonComments(
  lessonId: string,
  {
    enabled,
    focusThreadId,
    currentTime = 0,
  }: {
    enabled: boolean;
    focusThreadId?: string;
    currentTime?: number;
  },
) {
  const [sort, setSort] = useState<Sort>("time");
  const [selection, setSelection] = useState<{ lessonId: string; filter: CommentFilter }>();
  const [focus, setFocus] = useState<{ lessonId: string; id: string }>();
  const [orphanedLessonId, setOrphanedLessonId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const mutation = useRef(false);
  const activeLesson = useRef<string | null>(null);
  useEffect(() => {
    activeLesson.current = enabled ? lessonId : null;
    return () => {
      activeLesson.current = null;
    };
  }, [enabled, lessonId]);

  const target = focus?.lessonId === lessonId ? focus : undefined;
  const filter = selection?.lessonId === lessonId ? selection.filter : "all";
  const setFilter = (filter: CommentFilter) => setSelection({ lessonId, filter });
  const revealThread = (id: string) => {
    setFilter("all");
    setFocus({ lessonId, id });
  };
  useEffect(() => {
    if (focusThreadId) {
      setSelection({ lessonId, filter: "all" });
      setFocus({ lessonId, id: focusThreadId });
    }
  }, [lessonId, focusThreadId]);

  const include = target?.id ?? focusThreadId;
  // 場面の取得後も、再生時刻そのものは一覧の取得条件にしない。
  const [video, setVideo] = useState<{
    lessonId: string;
    scenes: LessonCommentsResponse["video"]["scenes"];
  }>();
  const scenes = video?.lessonId === lessonId ? video.scenes : undefined;
  const sceneId =
    filter === "scene"
      ? sceneAt(
          scenes?.map((scene) => ({
            id: scene.id,
            startSec: scene.start_sec,
            durationSec: scene.duration_sec,
          })) ?? null,
          currentTime,
        )?.id
      : undefined;
  const outsideScene = filter === "scene" && !sceneId;
  const apiFilter = outsideScene ? "all" : filter;
  const query = useMemo(
    () => ({
      lessonId,
      sort,
      filter: apiFilter,
      sceneId,
    }),
    [lessonId, sort, apiFilter, sceneId],
  );
  const active = useCommentPages(query, enabled, include);
  const activeScenes = active.metadata?.data.video.scenes;
  useEffect(() => {
    if (activeScenes) setVideo({ lessonId, scenes: activeScenes });
  }, [lessonId, activeScenes]);

  const orphanedOpen = orphanedLessonId === lessonId;
  const orphanedQuery = useMemo(() => ({ lessonId, scope: "orphaned" as const }), [lessonId]);
  const orphaned = useCommentPages(orphanedQuery, enabled && orphanedOpen, focusThreadId);

  const latest = useRef({ active, orphaned });
  useEffect(() => {
    latest.current = { active, orphaned };
  });

  const mutate = async <T>(action: () => Promise<T>, apply: (value: T) => void) => {
    if (!enabled || mutation.current) return false;
    mutation.current = true;
    setBusy(true);
    try {
      const value = await action();
      if (activeLesson.current !== lessonId) return false;
      apply(value);
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  };

  const patchThread =
    (id: string, transform: (thread: CommentThread) => CommentThread) => (data: ListData) => ({
      ...data,
      threads: data.threads.map((thread) => (thread.id === id ? transform(thread) : thread)),
    });

  return {
    enabled,
    sort,
    setSort,
    filter,
    setFilter,
    focus: target,
    revealThread,
    scenes: scenes ?? [],
    markers: active.metadata?.data.markers ?? [],
    total: outsideScene ? 0 : active.data?.total,
    allTotal: active.metadata?.allTotal,
    orphanedCount: active.metadata?.data.orphaned_count ?? 0,
    threads: outsideScene ? [] : (active.data?.threads ?? []),
    loading: active.loading,
    error: active.error,
    reload: () => active.load(),
    hasMore: !outsideScene && active.hasMore,
    loadMore: active.loadMore,
    orphanedOpen,
    setOrphanedOpen: (open: boolean) => setOrphanedLessonId(open ? lessonId : undefined),
    orphaned: {
      threads: orphaned.data?.threads ?? [],
      hasMore: orphaned.hasMore,
      loading: orphaned.loading,
      error: orphaned.error,
      reload: () => orphaned.load(),
      loadMore: orphaned.loadMore,
    },
    busy,
    post: (body: string, positionSec: number | null) =>
      mutate(
        () => postLessonComment({ lessonId, body, positionSec }),
        (entry) => {
          if (!("replies" in entry)) return;
          const { active } = latest.current;
          active.update(
            (data) => ({
              ...data,
              threads: [entry, ...data.threads],
              total: data.total + 1,
            }),
            1,
          );
          // 「すべて」への切り替えと include の変更で 1 回だけ取り直す。
          revealThread(entry.id);
        },
      ),
    reply: (thread: CommentThread, body: string, mentionUserIds: string[]) =>
      mutate(
        () => postLessonComment({ lessonId, parentId: thread.id, body, mentionUserIds }),
        (entry) => {
          if (!("mentions" in entry)) return;
          const { active, orphaned } = latest.current;
          (thread.state === "orphaned" ? orphaned : active).update(
            patchThread(thread.id, (root) => ({
              ...root,
              replies: [...root.replies.filter((reply) => reply.id !== entry.id), entry],
            })),
          );
          void active.refresh();
        },
      ),
    remove: (thread: CommentThread, replyId?: string) =>
      mutate(
        () => deleteLessonComment(replyId ?? thread.id),
        () => {
          const { active, orphaned } = latest.current;
          const oldVideo = thread.state === "orphaned";
          const list = oldVideo ? orphaned : active;
          if (replyId) {
            list.update(
              patchThread(thread.id, (root) => ({
                ...root,
                replies: root.replies.filter((reply) => reply.id !== replyId),
              })),
            );
          } else {
            list.update(
              (data) => ({
                ...data,
                threads: data.threads.filter((root) => root.id !== thread.id),
                total: data.total - 1,
                // 削除で offsets が前に詰まる。余分に取得した include は重複排除する。
                offset: Math.max(0, data.offset - 1),
              }),
              -1,
            );
            if (oldVideo) {
              active.update((data) => ({ ...data, orphaned_count: data.orphaned_count - 1 }));
            }
          }
          void active.refresh();
        },
      ),
    resolve: (thread: CommentThread) =>
      mutate(
        () => resolveLessonComment(thread.id, !thread.resolved),
        ({ resolved }) => {
          const { active, orphaned } = latest.current;
          (thread.state === "orphaned" ? orphaned : active).update(
            patchThread(thread.id, (root) => ({ ...root, resolved })),
          );
          void active.refresh();
        },
      ),
  };
}

const INITIAL_PLAYBACK: VideoPlaybackState = {
  currentTime: 0,
  duration: 0,
  paused: true,
  hasPlayed: false,
  ended: false,
};

export function useVideoLessonComments(lessonId: string, enabled: boolean, focusThreadId?: string) {
  const player = useRef<VideoViewerHandle | null>(null);
  const playerContainer = useRef<HTMLDivElement>(null);
  const pendingSeek = useRef<{ lessonId: string; sec: number } | null>(null);
  const [reported, setReported] = useState<{ lessonId: string; playback: VideoPlaybackState }>();
  const [composing, setComposing] = useState<{ lessonId: string; active: boolean }>();
  const playback = reported?.lessonId === lessonId ? reported.playback : INITIAL_PLAYBACK;
  const comments = useLessonComments(lessonId, {
    enabled,
    focusThreadId,
    currentTime: playback.currentTime,
  });
  const onPlaybackChange = useCallback(
    (playback: VideoPlaybackState) => {
      const pending = pendingSeek.current;
      if (playback.duration > 0 && pending?.lessonId === lessonId && player.current) {
        pendingSeek.current = null;
        player.current.seekTo(pending.sec);
      }
      setReported({ lessonId, playback });
    },
    [lessonId],
  );
  return {
    comments,
    playback,
    playerContainer,
    controls: {
      ref: player,
      markers: comments.markers,
      onMarkerSelect: comments.revealThread,
      onPlaybackChange: enabled ? onPlaybackChange : undefined,
      autoAdvanceBlocked: composing?.lessonId === lessonId && composing.active,
    } satisfies VideoCommentControls,
    onSeek: (sec: number) => {
      if (player.current) {
        player.current.seekTo(sec);
        playerContainer.current?.scrollIntoView({ block: "nearest" });
      } else {
        pendingSeek.current = { lessonId, sec };
      }
    },
    onPause: () => player.current?.pause(),
    onComposingChange: useCallback(
      (active: boolean) => setComposing({ lessonId, active }),
      [lessonId],
    ),
  };
}
