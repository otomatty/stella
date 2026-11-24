import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Lesson, Section } from "@/data/types";
import type { LessonNeighbors } from "@/lib/lesson-navigation";
import { LessonNavFooter } from "./LessonNav";

const lessons: Lesson[] = [
  { id: "prev", title: "前のまとめ", type: "text", duration: "", status: "done" },
  { id: "current", title: "問1 税込価格を返す", type: "text", duration: "", status: "todo" },
  { id: "next", title: "問2 割り勘", type: "text", duration: "5分", status: "todo" },
];
const section: Section = { id: "section", title: "関数", lessons };
const neighbors: LessonNeighbors = {
  prev: { lesson: lessons[0], section, position: 56 },
  current: { lesson: lessons[1], section, position: 57 },
  next: { lesson: lessons[2], section, position: 58 },
  total: 209,
  nextStartsNewSection: false,
  currentSectionComplete: false,
  stageComplete: false,
};

const render = (lessonNeighbors: LessonNeighbors, justCompleted = false) =>
  renderToStaticMarkup(
    createElement(LessonNavFooter, {
      neighbors: lessonNeighbors,
      justCompleted,
      onSelectLesson: () => {
        // 描画の確認では教材への移動ボタンをクリックしない。
      },
      onBackToStage: () => {
        // 描画の確認ではステージ詳細へのボタンをクリックしない。
      },
      onDismissCompletion: () => {
        // 描画の確認では閉じるボタンをクリックしない。
      },
      problemLessonIds: new Set(["current", "next"]),
    }),
  );

describe("本文末尾の教材ナビ", () => {
  it("通常は次の教材の枠と、前の教材へのボタンと現在地を出す", () => {
    const markup = render(neighbors);
    expect(markup).toContain('aria-label="教材の移動"');
    expect(markup).toContain("次の教材");
    expect(markup).toContain(">問題<");
    expect(markup).toContain("· 5分");
    expect(markup).not.toContain("sf-gradient-bg");
    expect(markup).toContain('aria-label="前の教材: 前のまとめ"');
    expect(markup.replace(/<[^>]+>/g, "")).toContain("57 / 209 教材");
  });

  it("問題を提出した直後は次へ進む主ボタンを一つ出す", () => {
    const markup = render(neighbors, true);
    expect(markup).toContain("提出しました。次はこちら");
    expect(markup.match(/aria-label="次へ進む:/g)).toHaveLength(1);
    expect(markup).toContain('aria-label="次へ進む: 問2 割り勘"');
    expect(markup.match(/sf-gradient-bg/g)).toHaveLength(1);
  });

  it("通常時に次が無ければ最後の教材からステージ詳細へ案内する", () => {
    const markup = render({ ...neighbors, next: null });
    expect(markup).toContain("最後の教材です");
    expect(markup).toContain("ステージ詳細へ");
    expect(markup).not.toContain("sf-gradient-bg");
  });
});
