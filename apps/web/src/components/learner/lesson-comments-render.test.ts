import type { CommentThread } from "@stella/shared/lessons/comments";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LessonComments } from "./LessonComments";

type Props = ComponentProps<typeof LessonComments>;
type Comments = Props["comments"];

const author = { id: "admin", name: "山田", role: "admin", is_self: false } as const;
const thread: CommentThread = {
  id: "thread",
  author,
  body: "質問です\n<script>本文</script>",
  created_at: Date.UTC(2026, 10, 20),
  position_sec: 125,
  scene_id: "scene",
  state: "current",
  resolved: false,
  can_delete: false,
  can_resolve: false,
  mention_candidates: [{ id: author.id, name: author.name }],
  replies: [
    {
      id: "reply",
      author: { id: "student", name: "佐藤", role: "student", is_self: true },
      body: "@山田 ありがとうございます",
      mentions: [author],
      created_at: Date.UTC(2026, 10, 20),
      can_delete: true,
    },
  ],
};

function render(
  comments: Partial<Comments> = {},
  focusThreadId?: string,
  playback: Partial<Props["playback"]> = {},
) {
  return renderToStaticMarkup(
    createElement(LessonComments, {
      comments: {
        enabled: true,
        sort: "time",
        setSort: vi.fn(),
        filter: "all",
        setFilter: vi.fn(),
        focus: undefined,
        revealThread: vi.fn(),
        scenes: [],
        markers: [],
        total: comments.threads?.length ?? 0,
        allTotal: 0,
        orphanedCount: 0,
        threads: [],
        loading: false,
        error: undefined,
        reload: vi.fn(),
        hasMore: false,
        loadMore: vi.fn(),
        orphanedOpen: false,
        setOrphanedOpen: vi.fn(),
        orphaned: {
          threads: [],
          hasMore: false,
          loading: false,
          error: undefined,
          reload: vi.fn(),
          loadMore: vi.fn(),
        },
        busy: false,
        post: vi.fn(),
        reply: vi.fn(),
        remove: vi.fn(),
        resolve: vi.fn(),
        ...comments,
      },
      playback: {
        currentTime: 130,
        duration: 200,
        paused: true,
        hasPlayed: true,
        ended: false,
        ...playback,
      },
      onSeek: vi.fn(),
      getPlaybackState: () => null,
      onPause: vi.fn(),
      onComposingChange: vi.fn(),
      focusThreadId,
      viewer: { id: "student", name: "佐藤", initials: "佐" },
    }),
  );
}

describe("動画レッスンのコメント欄", () => {
  it("空の案内と1行の入力欄を表示する", () => {
    const html = render();
    expect(html).toContain("0 件のコメント");
    expect(html).toContain(
      "まだコメントはありません。動画を止めて、気になった場面に質問や気づきを書けます。",
    );
    expect(html).toMatch(/<textarea[^>]+aria-label="コメント"[^>]+rows="1"/);
    expect(html).not.toContain("いまの場面");
  });

  it("場面・更新前・解決済み・管理者の札を出し、解決済みの返信を畳む", () => {
    const html = render({
      threads: [{ ...thread, state: "outdated", resolved: true }],
      scenes: [{ id: "scene", start_sec: 100, duration_sec: 60 }],
    });
    expect(html).toMatch(/<article[^>]+bg-brand-soft/);
    expect(html).toContain('aria-label="2:05 へ移動"');
    for (const label of ["いまの場面", "更新前の動画へのコメント", "解決済み", "管理者"]) {
      expect(html).toContain(`>${label}</span>`);
    }
    expect(html).toMatch(/<p[^>]+truncate/);
    expect(html).toContain(">開く</button>");
    expect(html).not.toContain("ありがとうございます");
  });

  it("再生前は最初の場面に札や背景色を付けず、場面の絞り込みを表示する", () => {
    const html = render(
      {
        threads: [{ ...thread, position_sec: 0 }],
        scenes: [{ id: "scene", start_sec: 0, duration_sec: 30 }],
      },
      undefined,
      { currentTime: 0, hasPlayed: false },
    );
    expect(html).toContain('aria-label="0:00 へ移動"');
    expect(html).toContain(">いまの場面</button>");
    expect(html).not.toContain(">いまの場面</span>");
    expect(html).not.toMatch(/<article[^>]+bg-brand-soft/);
  });

  it("位置のないコメントは「全体」と表示する", () => {
    const html = render({ threads: [{ ...thread, position_sec: null, state: "untimed" }] });
    expect(html).toContain(">全体</span>");
    expect(html).not.toContain("へ移動");
  });

  it("通知先の返信を開き、メンションを色付きにして本文をテキストで表示する", () => {
    const html = render({ threads: [thread] }, thread.id);
    expect(html).toMatch(/<button[^>]+aria-expanded="true"[^>]*>返信 1 件を閉じる/);
    expect(html).toMatch(/<span[^>]+bg-brand-soft font-bold text-brand-ink[^>]*>@山田<\/span>/);
    expect(html).toContain("(あなた)");
    expect(html).toContain("質問です\n&lt;script&gt;本文&lt;/script&gt;");
  });

  it("削除と解決の操作を権限に応じて出す", () => {
    const readonlyThread = {
      ...thread,
      replies: thread.replies.map((reply) => ({ ...reply, can_delete: false })),
    };
    const readable = render({ threads: [readonlyThread] }, thread.id);
    expect(readable).toContain("ありがとうございます");
    expect(readable).not.toContain(">削除する</button>");
    expect(readable).not.toContain(">解決済みにする</button>");

    const editable = { ...thread, can_delete: true, can_resolve: true };
    expect(render({ threads: [editable] })).toContain(">解決済みにする</button>");
    const resolved = render({ threads: [{ ...editable, resolved: true }] }, thread.id);
    expect(resolved).toContain(">解決済みを外す</button>");
    expect(resolved.match(/>削除する<\/button>/g)).toHaveLength(2);
  });

  it("更新前の件数を折りたたみ、開くと時刻ボタンのないスレッドを出す", () => {
    const comments: Partial<Comments> = {
      orphanedCount: 1,
      orphaned: {
        threads: [{ ...thread, state: "orphaned", position_sec: null }],
        hasMore: false,
        loading: false,
        error: undefined,
        reload: vi.fn(),
        loadMore: vi.fn(),
      },
    };
    const collapsed = render(comments);
    expect(collapsed).toMatch(
      /<button[^>]+aria-expanded="false"[^>]*>更新前の動画へのコメント 1 件/,
    );
    expect(collapsed).not.toContain(`id="lesson-comment-${thread.id}"`);
    const html = render({ ...comments, orphanedOpen: true });
    expect(html).toMatch(/<button[^>]+aria-expanded="true"[^>]*>更新前の動画へのコメント 1 件/);
    expect(html).toContain(`id="lesson-comment-${thread.id}"`);
    expect(html).toContain("動画の更新で、場面が無くなったコメントです。");
    expect(html).toContain(">更新前</span>");
    expect(html).not.toContain("へ移動");
  });

  it("通知で指定した更新前のスレッドの返信を開く", () => {
    const html = render({
      focus: { lessonId: "lesson", id: thread.id, fromNotification: true },
      orphanedCount: 1,
      orphanedOpen: true,
      orphaned: {
        threads: [{ ...thread, state: "orphaned", position_sec: null }],
        hasMore: false,
        loading: false,
        error: undefined,
        reload: vi.fn(),
        loadMore: vi.fn(),
      },
    });
    expect(html).toMatch(/<button[^>]+aria-expanded="true"[^>]*>返信 1 件を閉じる/);
    expect(html).toContain("ありがとうございます");
  });
});
