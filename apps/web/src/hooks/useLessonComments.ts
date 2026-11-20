import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { shouldOpenOrphanedComments } from "@/lib/lesson-comments";
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
type Focus = { lessonId: string; id: string; fromNotification?: true };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "コメントの処理に失敗しました";
}

function useCommentPages(query: Query, enabled: boolean, include?: string) {
  const [page, setPage] = useState<{ query: Query; data: ListData; loadedInclude?: string }>();
  const [request, setRequest] = useState<{ query: Query; error?: string }>();
  const [lastResponse, setLastResponse] = useState<{
    lessonId: string;
    data: LessonCommentsResponse;
    allTotal?: number;
  }>();
  const pendingPage = useRef<{ controller: AbortController; offset: number; pages: number } | null>(
    null,
  );
  const pendingMetadata = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);
  const metadataSequence = useRef(0);
  const lastFetch = useRef(0);
  const current = page?.query === query ? page.data : undefined;

  const load = useCallback(
    async (offset = 0, pages = 1, metadataOnly = false) => {
      if (!enabled) return;
      const controller = new AbortController();
      const endOffset = offset + pages * COMMENT_PAGE_SIZE;
      const sequence = ++requestSequence.current;
      if (metadataOnly) {
        pendingMetadata.current?.abort();
        pendingMetadata.current = controller;
      } else {
        pendingPage.current?.controller.abort();
        pendingPage.current = { controller, offset, pages };
        setRequest({ query });
      }
      const isLatest = () =>
        controller === (metadataOnly ? pendingMetadata.current : pendingPage.current?.controller);
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
        if (!isLatest()) return;
        const data = results[0];
        // ページと件数の応答順が前後しても、新しい取得の件数を優先する。
        const useMetadata = sequence > metadataSequence.current;
        if (useMetadata) metadataSequence.current = sequence;
        setPage((previous) => {
          if (metadataOnly) {
            return useMetadata && previous?.query === query
              ? { ...previous, data: { ...previous.data, total: data.total } }
              : previous;
          }
          const threads = offset && previous?.query === query ? previous.data.threads : [];
          const merged = new Map(threads.map((thread) => [thread.id, thread]));
          for (const result of results) {
            for (const thread of result.threads) merged.set(thread.id, thread);
          }
          return {
            query,
            loadedInclude:
              offset === 0
                ? include
                : previous?.query === query
                  ? previous.loadedInclude
                  : undefined,
            data: {
              ...data,
              total: !useMetadata && previous?.query === query ? previous.data.total : data.total,
              threads: [...merged.values()],
              offset: endOffset,
            },
          };
        });
        if (useMetadata) {
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
        }
        if (!metadataOnly) setRequest(undefined);
        lastFetch.current = Date.now();
      } catch (error) {
        if (isLatest() && !metadataOnly) setRequest({ query, error: errorMessage(error) });
      } finally {
        if (isLatest()) {
          if (metadataOnly) pendingMetadata.current = null;
          else pendingPage.current = null;
        }
      }
    },
    [enabled, query, include],
  );

  useLayoutEffect(() => {
    void load();
    return () => {
      pendingPage.current?.controller.abort();
      pendingMetadata.current?.abort();
      pendingPage.current = null;
      pendingMetadata.current = null;
    };
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

  const update = (patch: ListUpdate, countChange = 0, retryPage = true) => {
    const interrupted = pendingPage.current;
    interrupted?.controller.abort();
    pendingMetadata.current?.abort();
    pendingPage.current = null;
    pendingMetadata.current = null;
    setPage((previous) =>
      previous?.query === query ? { ...previous, data: patch(previous.data) } : previous,
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
    if (interrupted) {
      if (!retryPage) setRequest(undefined);
      else if (countChange < 0) {
        // スレッドの削除で offset がずれるので、同じ範囲を先頭から取り直す。
        void load(0, Math.ceil(interrupted.offset / COMMENT_PAGE_SIZE) + interrupted.pages);
      } else {
        void load(interrupted.offset, interrupted.pages);
      }
    }
  };

  const error = request?.query === query ? request.error : undefined;
  return {
    data: current,
    loadedInclude: page?.query === query ? page.loadedInclude : undefined,
    metadata: lastResponse?.lessonId === query.lessonId ? lastResponse : undefined,
    loading: enabled && ((!current && !error) || (request?.query === query && !error)),
    error,
    load,
    refresh: () => {
      if (current && page?.loadedInclude === include) return load(0, 1, true);
      if (!pendingPage.current) return load();
    },
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
    videoPath,
    currentTime = 0,
  }: {
    enabled: boolean;
    focusThreadId?: string;
    videoPath?: string | null;
    currentTime?: number;
  },
) {
  const [sort, setSort] = useState<Sort>("time");
  const [selection, setSelection] = useState<{ lessonId: string; filter: CommentFilter }>();
  const [focus, setFocus] = useState<Focus>();
  const [orphanedLessonId, setOrphanedLessonId] = useState<string>();
  const checkedNotification = useRef<Focus>(undefined);
  const [busyLessons, setBusyLessons] = useState<ReadonlySet<string>>(() => new Set());
  const mutations = useRef(new Set<string>());
  const activeLesson = useRef<string | null>(null);
  useLayoutEffect(() => {
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
      setFocus({ lessonId, id: focusThreadId, fromNotification: true });
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
  useEffect(() => {
    if (
      !enabled ||
      !target?.fromNotification ||
      target.id !== focusThreadId ||
      checkedNotification.current === target ||
      filter !== "all" ||
      active.loadedInclude !== target.id
    )
      return;
    checkedNotification.current = target;
    if (shouldOpenOrphanedComments(active.data, target.id)) setOrphanedLessonId(lessonId);
  }, [active.data, active.loadedInclude, enabled, filter, focusThreadId, lessonId, target]);

  const orphanedQuery = useMemo(() => ({ lessonId, scope: "orphaned" as const }), [lessonId]);
  const orphaned = useCommentPages(orphanedQuery, enabled && orphanedOpen, focusThreadId);

  const latest = useRef({ active, orphaned });
  useLayoutEffect(() => {
    latest.current = { active, orphaned };
  });

  const mutate = async <T>(action: () => Promise<T>, apply: (value: T) => void) => {
    if (!enabled || mutations.current.has(lessonId)) return false;
    mutations.current.add(lessonId);
    setBusyLessons(new Set(mutations.current));
    try {
      const value = await action();
      if (activeLesson.current !== lessonId) return false;
      apply(value);
      return true;
    } catch (error) {
      if (activeLesson.current === lessonId) toast.error(errorMessage(error));
      return false;
    } finally {
      mutations.current.delete(lessonId);
      setBusyLessons(new Set(mutations.current));
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
    busy: busyLessons.has(lessonId),
    post: (body: string, positionSec: number | null) =>
      mutate(
        () => postLessonComment({ lessonId, body, positionSec, videoPath: videoPath ?? undefined }),
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
            false,
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

export function useVideoLessonComments(
  lessonId: string,
  enabled: boolean,
  videoPath: string | null | undefined,
  focusThreadId?: string,
) {
  const player = useRef<VideoViewerHandle | null>(null);
  const playerContainer = useRef<HTMLDivElement>(null);
  const [reported, setReported] = useState<{ lessonId: string; playback: VideoPlaybackState }>();
  const [composing, setComposing] = useState<{ lessonId: string; active: boolean }>();
  const playback = reported?.lessonId === lessonId ? reported.playback : INITIAL_PLAYBACK;
  const comments = useLessonComments(lessonId, {
    enabled,
    focusThreadId,
    videoPath,
    currentTime: playback.currentTime,
  });
  const onPlaybackChange = useCallback(
    (playback: VideoPlaybackState) => setReported({ lessonId, playback }),
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
      }
    },
    getPlaybackState: () => player.current?.getPlaybackState() ?? null,
    onPause: () => player.current?.pause(),
    onComposingChange: useCallback(
      (active: boolean) => setComposing({ lessonId, active }),
      [lessonId],
    ),
  };
}
