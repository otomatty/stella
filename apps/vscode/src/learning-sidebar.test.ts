import { TASK_STATUS_LABELS, type TaskStatus } from "@stella/shared/tasks/catalog";
import { describe, expect, it } from "vitest";
import type { CatalogLesson, CatalogStage } from "./catalog.js";
import {
  learningItemComplete,
  nextLearningItem,
  renderLearningSidebar,
  resolveLearningLocation,
} from "./learning-sidebar.js";

const lesson = (id: string, extra: Partial<CatalogLesson> = {}): CatalogLesson => ({
  id,
  stageId: "stage-1",
  title: id,
  type: "text",
  completed: false,
  ...extra,
});
const catalog: CatalogStage[] = [
  {
    id: "done-stage",
    title: "完了したステージ",
    sections: [{ id: "done", title: "完了", lessons: [lesson("done", { completed: true })] }],
  },
  {
    id: "stage-1",
    title: "STELLAの使い方",
    sections: [
      {
        id: "unit-1",
        title: "最初のページを表示する",
        lessons: [
          lesson("doc", { title: "保存したファイルを表示する", completed: true }),
          lesson("quiz", { title: "確認クイズ", type: "quiz" }),
          lesson("task", {
            title: "最初のページを作る",
            completed: true,
            task: { id: "course/unit/task", status: "not-started" },
          }),
        ],
      },
      { id: "unit-2", title: "ページを整える", lessons: [lesson("next")] },
    ],
  },
];
const assets = {
  nonce: "test-nonce",
  cspSource: "https://local.test",
  styleUri: "https://local.test/style.css",
  scriptUri: "https://local.test/script.js",
};

function renderUnit(lessons: CatalogLesson[]): string {
  return renderLearningSidebar(
    {
      kind: "catalog",
      catalog: [{ id: "s", title: "s", sections: [{ id: "u", title: "u", lessons }] }],
      selection: {},
    },
    assets,
  );
}

describe("学習サイドバー", () => {
  it("最初の未完了のステージへ寄せ、明示的に選んだ単元は保つ", () => {
    expect(resolveLearningLocation(catalog, {}).stage?.id).toBe("stage-1");
    expect(
      resolveLearningLocation(catalog, { stageId: "stage-1", sectionId: "unit-2" }).section?.id,
    ).toBe("unit-2");
    expect(
      resolveLearningLocation(catalog, { stageId: "removed", sectionId: "removed" }).section?.id,
    ).toBe("unit-1");
  });

  it("Web から来た課題と次のレッスンを、それぞれの単元に表示する", () => {
    expect(resolveLearningLocation(catalog, { taskId: "course/unit/task" }).lesson?.id).toBe(
      "task",
    );
    expect(
      resolveLearningLocation(catalog, {
        stageId: "stage-1",
        lessonId: "next",
        sectionId: "unit-1",
      }).section?.id,
    ).toBe("unit-2");
  });

  it("課題文の既読では完了にせず、レビューの合格で数える", () => {
    for (const status of [
      "not-started",
      "local-passed",
      "submitted",
      "instructor-pending",
      "resubmit",
    ] as const) {
      expect(
        learningItemComplete(lesson("task", { completed: true, task: { id: "t", status } })),
      ).toBe(false);
    }
    for (const status of ["passed", "ai-passed"] as const) {
      expect(learningItemComplete(lesson("task", { task: { id: "t", status } }))).toBe(true);
    }
  });

  it("レビュー待ちの課題をやり直させず、次の教材を案内する", () => {
    const waiting = lesson("waiting", { task: { id: "t", status: "submitted" } });
    expect(nextLearningItem({ id: "u", title: "u", lessons: [waiting, lesson("next")] })?.id).toBe(
      "next",
    );
    const html = renderUnit([waiting]);
    expect(html).toContain('data-action="review"');
    expect(html).toContain("Web で状況を見る");
    expect(html).not.toContain("課題に取り組む");
    expect(html).toContain(
      '<ol class="segments" role="img" aria-label="1 件中 0 件完了"><li class="wait"></li></ol>',
    );
  });

  it("単元の進み具合、現在地、Web で進める教材を示す", () => {
    const html = renderLearningSidebar(
      { kind: "catalog", catalog, selection: { stageId: "stage-1", lessonId: "quiz" } },
      assets,
    );
    expect(html).toContain("1 / 3 完了");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('<li class="lesson current">');
    expect(html.match(/<span class="sr-only">いま開いている教材<\/span>/g)).toHaveLength(1);
    expect(html).toContain('<span class="sr-only">完了</span>');
    expect(html).toContain('<span class="sr-only">未完了</span>');
    expect(html).toContain('<span class="sr-only">Web で受講</span>');
    expect(html).toContain(
      '<svg class="web-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"',
    );
    expect(html).not.toContain("Web で受講 ↗");
    expect(html).not.toContain('class="current-label"');
    expect(html).not.toMatch(/<span>(?:完了|未完了|Web で受講|いま開いている教材)<\/span>/);
    expect(html).toContain("次にやること");
  });

  it.each([
    ["slides", "スライド", "<rect"],
    ["text", "まとめ", '<path d="M3.5'],
    ["code", "演習", '<path d="M6 4.5'],
    ["quiz", "確認クイズ", "<circle"],
    ["video", "動画", '<path d="m6.5'],
    ["assignment", "課題", '<path d="M6 4.5'],
  ] as const)("%s の種類をアイコンと文字で示す", (type, label, shape) => {
    const html = renderUnit([lesson("item", { type })]);
    const svg = html.match(/<svg class="kind-icon"[^>]*>.*?<\/svg>/)?.[0];
    expect(svg).toContain('viewBox="0 0 16 16" aria-hidden="true" focusable="false"');
    expect(svg).toContain('stroke="currentColor" fill="none"');
    expect(svg).toContain(shape);
    expect(html).toContain(`</svg>${label}</span>`);
  });

  it.each([
    ["not-started", "neutral"],
    ["local-passed", "info"],
    ["submitted", "wait"],
    ["instructor-pending", "wait"],
    ["resubmit", "fail"],
    ["ai-passed", "pass"],
    ["passed", "pass"],
  ] satisfies [TaskStatus, string][])("%s を %s の札で示す", (status, tone) => {
    const html = renderUnit([lesson("task", { task: { id: "t", status } })]);
    const pill = `<span class="pill pill-${tone}">${TASK_STATUS_LABELS[status]}</span>`;
    expect(html).toContain(`</svg>課題</span>${pill}`);
    expect(html).not.toContain('class="sr-only">未完了</span>');
    expect(html).not.toContain('class="sr-only">完了</span>');
    if (status === "ai-passed" || status === "passed") {
      expect(html.split(pill)).toHaveLength(2);
    } else {
      expect(html).toContain(`<h2 id="next-title">task</h2>${pill}`);
    }
  });

  it("教材の順に完了・レビュー待ち・次の教材・未完了の区切りを描く", () => {
    const html = renderUnit([
      lesson("done", { completed: true }),
      lesson("submitted", { completed: true, task: { id: "s", status: "submitted" } }),
      lesson("next"),
      lesson("pending", { task: { id: "p", status: "instructor-pending" } }),
      lesson("later"),
      lesson("passed", { task: { id: "d", status: "ai-passed" } }),
    ]);
    expect(html).toContain(
      '<ol class="segments" role="img" aria-label="6 件中 2 件完了"><li class="done"></li><li class="wait"></li><li class="here"></li><li class="wait"></li><li></li><li class="done"></li></ol>',
    );
    expect(html).not.toContain("<progress");
  });

  it("40 件までは区切りを描き、41 件から progress を使う", () => {
    const lessons = Array.from({ length: 41 }, (_, index) =>
      lesson(`item-${index}`, { completed: index < 6 }),
    );
    const segmented = renderUnit(lessons.slice(0, 40));
    expect(segmented).not.toContain("<progress");
    const segments = segmented.match(/<ol class="segments"[^>]*>(.*?)<\/ol>/)?.[1];
    expect(segments?.match(/<li[ >]/g)).toHaveLength(40);
    const long = renderUnit(lessons);
    expect(long).not.toContain('class="segments"');
    expect(long).toContain('<progress max="41" value="6" aria-label="この単元の完了数">');
  });

  it("教材由来の HTML と属性をエスケープし、スクリプトを nonce で制限する", () => {
    const hostileTitle = '<b title="x">&</b>';
    const hostileId = 'x" data-action="connect';
    const hostile = lesson(hostileId, { title: hostileTitle });
    const html = renderLearningSidebar(
      {
        kind: "catalog",
        catalog: [
          {
            id: hostileId,
            title: hostileTitle,
            sections: [{ id: hostileId, title: hostileTitle, lessons: [hostile] }],
          },
        ],
        selection: {},
      },
      assets,
    );
    expect(html).not.toContain("<b ");
    expect(html.match(/&lt;b title=&quot;x&quot;&gt;&amp;&lt;\/b&gt;/g)).toHaveLength(4);
    expect(html.match(/value="x&quot; data-action=&quot;connect"/g)).toHaveLength(2);
    expect(html).toContain('data-lesson="x&quot; data-action=&quot;connect"');
    expect(html).not.toContain('data-action="connect"');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("script-src 'nonce-test-nonce'");
  });

  it("どの表示でもインラインスタイルを出さない", () => {
    for (const html of [
      renderLearningSidebar({ kind: "loading" }, assets),
      renderLearningSidebar({ kind: "disconnected" }, assets),
      renderLearningSidebar({ kind: "error", message: "失敗" }, assets),
      renderLearningSidebar({ kind: "catalog", catalog, selection: {} }, assets),
      renderLearningSidebar({ kind: "catalog", catalog: [], selection: {} }, assets),
    ]) {
      expect(html).not.toMatch(/\bstyle\s*=|<style\b/i);
    }
  });

  it("未接続・取得失敗・教材なしでも次の操作を示す", () => {
    expect(renderLearningSidebar({ kind: "disconnected" }, assets)).toContain(
      'data-action="connect"',
    );
    expect(renderLearningSidebar({ kind: "error", message: "<失敗>" }, assets)).toContain(
      "&lt;失敗&gt;",
    );
    expect(
      renderLearningSidebar({ kind: "catalog", catalog: [], selection: {} }, assets),
    ).toContain("学習を始めましょう");
    expect(resolveLearningLocation([], {})).toEqual({
      stage: undefined,
      section: undefined,
      lesson: undefined,
    });
  });
});
