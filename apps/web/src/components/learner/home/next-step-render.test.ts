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
  nodeOf: (id: string) => nodes.get(id),
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
