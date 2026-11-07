import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FIRST_STEP_KEYS, type FirstSteps } from "@stella/shared/study/first-steps";
import { FirstStepsCard } from "./FirstStepsCard";

const data = (count: number): FirstSteps => ({
  stage_id: "root",
  stage_started: true,
  items: FIRST_STEP_KEYS.map((key, index) => ({
    key,
    done: index < count,
    at: index < count ? "2026-11-07T01:00:00Z" : null,
  })),
});
const render = (value: FirstSteps | null, compact = false) =>
  renderToStaticMarkup(createElement(FirstStepsCard, { data: value, compact }));
describe("STELLA の使い方", () => {
  it("5項目と緑のチェック、次の1項目への説明を出す", () => {
    const html = render(data(1));
    expect(html.match(/<li /g)).toHaveLength(5);
    expect(html.match(/次はここ/g)).toHaveLength(1);
    expect(html).toContain("text-success");
    expect(html).toContain("U01 の手順で VS Code");
    expect(html).toContain("最初の課題を提出する");
  });
  it("全て済んだら1行に畳む", () => {
    const html = render(data(5));
    expect(html).toContain("STELLA の使い方はひととおり済みました");
    expect(html).not.toContain("<li");
  });
  it("取得できなければ表示しない", () => expect(render(null)).toBe(""));
  it("講師用は未達の位置を小さく示す", () => {
    const html = render(data(2), true);
    expect(html.match(/<li /g)).toHaveLength(5);
    expect(html).toContain("次はここ");
    expect(html).not.toContain("U02 の最初の課題を VS Code で開き");
  });
});
