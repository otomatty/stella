import { type ComponentProps, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { HomeGuide } from "@/lib/home-guide";
import type { SkillMapStageNode } from "@/lib/skill-map-api";

import { LaterSteps, NextStepCard } from "./NextStep";

const node = (partial: SkillMapStageNode): SkillMapStageNode => partial;

const dev = node({
  id: "dev",
  state: "cleared",
  visibility: "full",
  title: "開発環境とWebの入口",
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

it("次のレッスンは題名と続きのボタンを出し、プランの説明は出さない", () => {
  const reason = "開発環境とWebの入口の続きです。残り 3 レッスン。";
  const guide: HomeGuide = {
    steps: [
      { kind: "plan", item: { kind: "lesson", title: "ターミナルの使い方", minutes: 15, reason } },
    ],
    idle: "empty",
  };
  const markup = renderToStaticMarkup(
    createElement(NextStepCard, { ...handlers, guide, loading: false }),
  );
  expect(markup).toContain("ターミナルの使い方");
  expect(markup).toContain("続きから");
  expect(markup).not.toContain(reason);
});

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
    expect(markup).toContain("『開発環境とWebの入口』から始めましょう");
    expect(markup).toContain("最初のステージを始める");
    expect(markup).toContain("ステージ一覧で見る");
  });
});

describe("案内されたステージの開始", () => {
  const stage = {
    stage_id: "devlab-ts-ch00",
    title: "00章",
    status: "available" as const,
    source_name: "開発ラボG",
    message: "事前課題の案内文",
    due_at: "2026-11-21T14:59:59.000Z",
    prerequisite_titles: [],
    progress: { unit: "problems" as const, passed: 0, total: 12 },
  };
  const guide: HomeGuide = { steps: [{ kind: "start-guided", stage }], idle: "empty" };

  function renderSteps(
    state: Partial<
      Pick<ComponentProps<typeof NextStepCard>, "startingGuidedStage" | "guidedStartError">
    > = {},
  ) {
    return [
      renderToStaticMarkup(
        createElement(NextStepCard, { ...handlers, ...state, guide, loading: false }),
      ),
      renderToStaticMarkup(
        createElement(LaterSteps, { ...handlers, ...state, steps: guide.steps }),
      ),
    ];
  }

  it("主のカードと「そのあと」の行には見出しと開始ボタンを出し、案内の内容は出さない", () => {
    const [card, later] = renderSteps();
    expect(card).toContain("次にやること");
    expect(later).toContain("そのあと");
    for (const markup of [card, later]) {
      expect(markup).toContain("『00章』を始めましょう");
      expect(markup).toContain("始める</button>");
      expect(markup).not.toContain(stage.source_name);
      expect(markup).not.toContain(stage.message);
      expect(markup).not.toContain(stage.due_at);
      expect(markup).not.toContain("11/21");
      expect(markup).not.toContain("期限");
    }
  });

  it("どちらの表示でも開始中はボタンを無効にし、失敗は文字で伝える", () => {
    for (const markup of renderSteps({ startingGuidedStage: true })) {
      expect(markup).toContain('disabled=""');
      expect(markup).toContain("開始しています…");
    }

    const guidedStartError = {
      stageId: stage.stage_id,
      message: "ステージを始められませんでした",
    };
    for (const markup of renderSteps({ guidedStartError })) {
      expect(markup).toContain('role="alert"');
      expect(markup).toContain(guidedStartError.message);
    }
  });
});

describe("NextStep choose card", () => {
  it("星を名指しせず、ステージ一覧から選ぶ案内と同列の一覧を出す", () => {
    const markup = card(["html", "js"]);
    const listStart = markup.indexOf("始められるステージ");
    expect(markup.slice(0, listStart)).toContain("ステージ一覧から次のステージを選びましょう");
    expect(markup.slice(0, listStart)).toContain(
      "ステージにマウスを載せる (スマホ・タブレットではタップする) と、内容と始めるボタンが出ます。",
    );
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
    expect(markup).toContain("ステージ一覧から最初のステージを選びましょう");
    expect(markup).toContain("ひとつ終えると、ステージ一覧で先のステージが少しずつ見えてきます。");
  });

  it("そのあとに回った choose は 1 行の案内で、星もボタンも持たない", () => {
    const steps = [{ kind: "choose" as const, welcome: false, stageIds: ["html", "js"] }];
    const markup = renderToStaticMarkup(createElement(LaterSteps, { ...handlers, steps }));
    expect(markup).toContain("次に始めるステージをステージ一覧から選ぶ");
    expect(markup).not.toContain("HTML/CSSとデザイン基礎");
    expect(markup).not.toContain("ステージ一覧で見る");
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
      "課題「計算」は取り組み中です。残り 15 問です。全部の問題を提出すると、このステージが完了します。";
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
