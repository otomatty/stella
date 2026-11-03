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
    title: "開発環境とWebの入口",
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
    const html = renderLearningSidebar(
      {
        kind: "catalog",
        catalog: [{ id: "s", title: "s", sections: [{ id: "u", title: "u", lessons: [waiting] }] }],
        selection: {},
      },
      assets,
    );
    expect(html).toContain('data-action="review"');
    expect(html).toContain("Web で状況を見る");
    expect(html).not.toContain("課題に取り組む");
  });

  it("単元の進み具合、現在地、Web で進める教材を示す", () => {
    const html = renderLearningSidebar(
      { kind: "catalog", catalog, selection: { stageId: "stage-1", lessonId: "quiz" } },
      assets,
    );
    expect(html).toContain("1 / 3 完了");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("いま開いている教材");
    expect(html).toContain("Web で受講");
    expect(html).toContain("次にやること");
  });

  it("教材由来の HTML と属性をエスケープし、スクリプトを nonce で制限する", () => {
    const hostile = lesson('x" data-action="connect', { title: '<img src=x onerror="alert(1)">' });
    const html = renderLearningSidebar(
      {
        kind: "catalog",
        catalog: [{ id: "s", title: "s", sections: [{ id: "u", title: "u", lessons: [hostile] }] }],
        selection: {},
      },
      assets,
    );
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
    expect(html).toContain('data-lesson="x&quot; data-action=&quot;connect"');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("script-src 'nonce-test-nonce'");
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
