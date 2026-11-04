import { createElement } from "react";
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
  nodeOf: (id: string) => nodes.get(id),
  startingId: null as string | null,
  onStartReview: noop,
  onResumeLesson: noop,
  onOpenMiss: noop,
  onOpenActiveStage: noop,
  onOpenPendingTask: noop,
  onStartStage: noop,
  onShowInTree: noop,
};

function card(stageIds: string[], startingId: string | null = null): string {
  const guide: HomeGuide = {
    steps: [{ kind: "choose", welcome: false, stageIds }],
    idle: "empty",
  };
  return renderToStaticMarkup(
    createElement(NextStepCard, { ...handlers, guide, loading: false, startingId }),
  );
}

describe("NextStep choose card", () => {
  it("dev-env の次は HTML/CSS を 1 枚にし、JavaScript は畳んだ Basic 候補に置く", () => {
    const markup = card(["html", "js"]);
    expect(markup).toContain("HTML/CSSとデザイン基礎");
    expect(markup).toContain("次にやること");
    expect(markup).toContain("Basic");
    expect(markup).toContain("「開発環境とWebの入口」の次の講座です");
    expect(markup).toContain("身につくと");
    expect(markup).toContain("フロントエンド");
    expect(markup.match(/ここから始める/g)).toEqual(["ここから始める"]);
    expect(markup).toContain("ツリーで見る");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("ほかにも始められる講座");
    expect(markup).toContain("JavaScriptの値と制御");
    expect(markup).not.toContain("JavaScriptの値と制御 をツリーで見る");
    expect(markup).not.toContain("星を押すと、ツリーの吹き出しから始められます。");
  });

  it("割り当てた AWS は大きなカードに出さず、畳んだ候補の名前に残す", () => {
    const markup = card(["html", "js", "aws"]);
    const heroEnd = markup.indexOf("ほかにも始められる講座");
    expect(markup.slice(0, heroEnd)).toContain("HTML/CSSとデザイン基礎");
    expect(markup.slice(0, heroEnd)).not.toContain("AWS Cloud Practitioner 入門");
    expect(markup.slice(heroEnd)).toContain("JavaScriptの値と制御・AWS Cloud Practitioner 入門");
    expect(markup.match(/ここから始める/g)).toEqual(["ここから始める"]);
  });

  it("そのあとに回った choose は先頭の 1 行で、始めるボタンを持たない", () => {
    const guideSteps = [{ kind: "choose" as const, welcome: false, stageIds: ["html", "js"] }];
    const markup = renderToStaticMarkup(
      createElement(LaterSteps, { ...handlers, steps: guideSteps }),
    );
    expect(markup).toContain("HTML/CSSとデザイン基礎");
    expect(markup).toContain("ツリーで見る");
    expect(markup).not.toContain("ここから始める");
    expect(markup).not.toContain("JavaScriptの値と制御");
  });
});
