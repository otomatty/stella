import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { HomeGuide } from "@/lib/home-guide";
import type { SkillMapStageNode } from "@/lib/skill-map-api";

import { LaterSteps, NextStepBar, NextStepCard } from "./NextStep";

const node = (partial: SkillMapStageNode): SkillMapStageNode => partial;

const dev = node({
  id: "dev",
  state: "cleared",
  visibility: "full",
  title: "STELLAの使い方",
  category: "基礎",
});
const html = node({
  id: "html",
  state: "unlocked",
  visibility: "full",
  title: "HTML/CSSとデザイン基礎",
  category: "フロントエンド",
  can_do: "HTMLとCSSで、読みやすく画面幅に対応したページを作れる",
  parent_id: "dev",
});
const js = node({
  id: "js",
  state: "unlocked",
  visibility: "full",
  title: "JavaScriptの値と制御",
  category: "フロントエンド",
  parent_id: "dev",
});
const aws = node({
  id: "aws",
  state: "unlocked",
  visibility: "full",
  title: "AWS Cloud Practitioner 入門",
  category: "AWS資格",
  audience: "granted",
  parent_id: "dev",
});

const nodes = new Map([dev, html, js, aws].map((stage) => [stage.id, stage]));

function noop(): void {
  /* 描画の確認では押さない */
}

const handlers = {
  activeStage: null,
  onStartGuidedStage: noop,
  startingGuidedStage: false,
  guidedStartError: null,
  nodeOf: (id: string) => nodes.get(id),
  onStartStage: noop,
  onStartReview: noop,
  onResumeLesson: noop,
  onOpenMiss: noop,
  onOpenActiveStage: noop,
  onOpenPendingTask: noop,
  onShowInTree: noop,
};

function guideOf(stageIds: string[], welcome = false): HomeGuide {
  return { steps: [{ kind: "choose", welcome, stageIds }], idle: "empty" };
}

function card(stageIds: string[], welcome = false): string {
  return renderToStaticMarkup(
    createElement(NextStepCard, { ...handlers, guide: guideOf(stageIds, welcome), loading: false }),
  );
}

describe("NextStep first-stage", () => {
  const guide: HomeGuide = {
    steps: [{ kind: "first-stage", stageId: "dev" }],
    idle: "empty",
  };

  it("カードに最初のステージ名と始める主ボタンを出す", () => {
    const markup = renderToStaticMarkup(
      createElement(NextStepCard, { ...handlers, guide, loading: false }),
    );
    expect(markup).toContain("はじめの一歩");
    expect(markup).toContain("『STELLAの使い方』から始めましょう");
    expect(markup).toContain("最初のステージを始める");
    expect(markup).toContain("ツリーで見る");
  });

  it("畳んだバーにも最初のステージ名と始める主ボタンを残す", () => {
    const markup = renderToStaticMarkup(
      createElement(NextStepBar, { ...handlers, guide, loading: false, onExpand: noop }),
    );
    expect(markup).toContain("はじめの一歩");
    expect(markup).toContain("『STELLAの使い方』から始めましょう");
    expect(markup).toContain("最初のステージを始める");
  });
});

describe("案内されたステージの開始", () => {
  const guide: HomeGuide = {
    steps: [
      {
        kind: "start-guided",
        stage: {
          stage_id: "devlab-ts-ch00",
          title: "00章",
          status: "available",
          source_name: "開発ラボG",
          message: "案内の文は枠に表示する",
          due_at: new Date(Date.now() + 2 * 86_400_000).toISOString(),
          prerequisite_titles: [],
          progress: { unit: "problems", passed: 0, total: 12 },
        },
      },
    ],
    idle: "empty",
  };

  it("カードには名前・案内元・期限間近の表示と開始ボタンを出す", () => {
    const markup = renderToStaticMarkup(
      createElement(NextStepCard, { ...handlers, guide, loading: false }),
    );
    expect(markup).toContain("『00章』を始めましょう");
    expect(markup).toContain("開発ラボG からの案内");
    expect(markup).toContain("期限間近：");
    expect(markup).toContain("font-bold text-danger");
    expect(markup).toContain("始める</button>");
    expect(markup).not.toContain("案内の文は枠に表示する");
  });

  it("畳んだ帯と「そのあと」にも名前と開始ボタンを出す", () => {
    const bar = renderToStaticMarkup(
      createElement(NextStepBar, { ...handlers, guide, loading: false, onExpand: noop }),
    );
    const later = renderToStaticMarkup(
      createElement(LaterSteps, { ...handlers, steps: guide.steps }),
    );
    for (const markup of [bar, later]) {
      expect(markup).toContain("『00章』を始めましょう");
      expect(markup).toContain("始める</button>");
    }
  });

  it("開始中はボタンを無効にし、開始に失敗したら文字で伝える", () => {
    const busy = renderToStaticMarkup(
      createElement(NextStepCard, {
        ...handlers,
        guide,
        loading: false,
        startingGuidedStage: true,
      }),
    );
    expect(busy).toContain('disabled=""');
    expect(busy).toContain("開始しています…");

    const guidedStartError = {
      stageId: "devlab-ts-ch00",
      message: "ステージを始められませんでした",
    };
    const cardProps = { ...handlers, guide, loading: false, guidedStartError };
    for (const markup of [
      renderToStaticMarkup(createElement(NextStepCard, cardProps)),
      renderToStaticMarkup(createElement(NextStepBar, { ...cardProps, onExpand: noop })),
      renderToStaticMarkup(
        createElement(LaterSteps, { ...handlers, steps: guide.steps, guidedStartError }),
      ),
    ]) {
      expect(markup).toContain('role="alert"');
      expect(markup).toContain(guidedStartError.message);
    }
  });

  it("進行中の00章の続きには進捗とレッスン一覧を出す", () => {
    const markup = renderToStaticMarkup(
      createElement(NextStepCard, {
        ...handlers,
        activeStage: { id: "devlab-ts-ch00", title: "00章", progress: 42, lessonsCount: 3 },
        guide: {
          steps: [
            {
              kind: "plan",
              item: {
                kind: "lesson",
                title: "事前課題の進め方",
                reason: "00章の続きです",
                minutes: 15,
              },
            },
          ],
          idle: "empty",
        },
        loading: false,
      }),
    );
    expect(markup).toContain("続きから");
    expect(markup).toContain("42%");
    expect(markup).toContain("レッスン一覧");
  });
});

describe("NextStep choose card", () => {
  it("星を名指しせず、ツリーから選ぶ案内と同列の一覧を出す", () => {
    const markup = card(["html", "js"]);
    const listStart = markup.indexOf("始められるステージ");
    expect(markup.slice(0, listStart)).toContain("ツリーから次のステージを選びましょう");
    expect(markup.slice(0, listStart)).not.toContain("HTML/CSSとデザイン基礎");
    expect(markup.slice(listStart)).toContain("HTML/CSSとデザイン基礎");
    expect(markup.slice(listStart)).toContain("JavaScriptの値と制御");
    expect(markup).not.toContain("ここから始める");
    expect(markup).not.toContain("身につくと");
    expect(markup).not.toContain("次のステージです");
  });

  it("一覧は Basic と Extra に分ける", () => {
    const markup = card(["html", "js", "aws"]);
    expect(markup).toContain("3 件");
    expect(markup.indexOf("Basic")).toBeLessThan(markup.indexOf("JavaScriptの値と制御"));
    expect(markup.indexOf("Extra")).toBeLessThan(markup.indexOf("AWS Cloud Practitioner 入門"));
    expect(markup.indexOf("JavaScriptの値と制御")).toBeLessThan(markup.indexOf("Extra"));
  });

  it("何も始めていない人には最初の案内を出す", () => {
    const markup = card(["dev"], true);
    expect(markup).toContain("はじめの一歩");
    expect(markup).toContain("ツリーから最初のステージを選びましょう");
    expect(markup).toContain("腕試し");
  });

  it("畳んだバーは星を名指しせず、主ボタンを持たない", () => {
    const markup = renderToStaticMarkup(
      createElement(NextStepBar, {
        ...handlers,
        guide: guideOf(["html", "js"]),
        loading: false,
        onExpand: noop,
      }),
    );
    expect(markup).toContain("ツリーから次のステージを選ぶ");
    expect(markup).not.toContain("HTML/CSSとデザイン基礎");
    expect(markup).not.toContain("ここから始める");
  });

  it("そのあとに回った choose は 1 行の案内で、星もボタンも持たない", () => {
    const steps = [{ kind: "choose" as const, welcome: false, stageIds: ["html", "js"] }];
    const markup = renderToStaticMarkup(createElement(LaterSteps, { ...handlers, steps }));
    expect(markup).toContain("次に始めるステージをツリーから選ぶ");
    expect(markup).not.toContain("HTML/CSSとデザイン基礎");
    expect(markup).not.toContain("ツリーで見る");
    expect(markup).not.toContain("<button");
  });
});

describe("VS Code の準備", () => {
  const guide: HomeGuide = { steps: [{ kind: "wrapup" }, { kind: "setup-vscode" }], idle: "empty" };
  it("そのあとに準備の文と公開案内へのリンクを出す", () => {
    const markup = renderToStaticMarkup(
      createElement(LaterSteps, { ...handlers, steps: guide.steps.slice(1) }),
    );
    expect(markup).toContain("VS Code の準備がまだです");
    expect(markup).toContain("課題は VS Code で取り組みます。");
    expect(markup).toContain('href="/start"');
    expect(markup).toContain("準備の案内を開く");
  });

  it("仕上げの案内は残りの問題数を出し、受講者の番なら課題に取り組む", () => {
    const guide: HomeGuide = { steps: [{ kind: "wrapup" }], idle: "empty" };
    const detail =
      "課題「計算」は取り組み中です。残り 15 問です。レビューで合格すると、この星がクリアになります。";
    const markup = renderToStaticMarkup(
      createElement(NextStepCard, {
        ...handlers,
        guide,
        loading: false,
        activeStage: {
          id: "cs",
          title: "C# の基礎",
          progress: 100,
          lessonsCount: 3,
          wrapup: {
            task: { id: "t", title: "計算", status: "local-passed", lessonId: "l" },
            remaining: 1,
            learnerTurn: true,
            detail,
          },
        },
      }),
    );
    expect(markup).toContain("残り 15 問");
    expect(markup).toContain("課題に取り組む");
    expect(markup).not.toContain("AI が確認中");
  });
});
